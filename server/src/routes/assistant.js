import { Router } from "express";
import { getRoute, geocodeAddress } from "../services/mapsService.js";
import { searchTracks } from "../services/youtubeService.js";
import { buildTimeCappedQueue } from "../services/queueBuilder.js";

const router = Router();

// Very small rule-based NLU for the demo. A production system would use a
// proper intent/entity model (see spec 3.1), but this covers the exact
// pattern from the brief: "I'm going to X, Maps shows a N-minute drive,
// play songs by A and B."
export function parseCommand(transcript) {
  const text = transcript.trim();

  const destMatch = /going to ([^,.]+)/i.exec(text);
  const destination = destMatch ? destMatch[1].trim() : null;

  const etaMatch = /(\d+)[- ]?minute/i.exec(text);
  const spokenEtaMinutes = etaMatch ? parseInt(etaMatch[1], 10) : null;

  const playMatch = /play (?:songs? by |some )?(.+)$/i.exec(text);
  let artists = [];
  if (playMatch) {
    artists = playMatch[1]
      .replace(/\band\b/gi, ",")
      .split(",")
      .map((a) => a.trim().replace(/[.!?]+$/, "")) // strip trailing sentence punctuation
      .filter(Boolean);
  }

  return { destination, spokenEtaMinutes, artists };
}

// Round-robin merge of per-artist track lists, e.g. [[a1,a2,a3],[b1,b2]]
// -> [a1,b1,a2,b2,a3]. Keeps the queue builder's no-repeat-artist window
// from starving out an artist whose tracks would otherwise be bunched.
export function interleave(lists) {
  const merged = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (list[i]) merged.push(list[i]);
    }
  }
  return merged;
}

/**
 * POST /api/assistant/command
 * body: { transcript: string, lat?, lng? }
 */
router.post("/command", async (req, res) => {
  try {
    const { transcript, lat, lng } = req.body ?? {};
    if (!transcript) return res.status(400).json({ error: "transcript is required" });

    const parsed = parseCommand(transcript);

    // Resolve authoritative ETA from Maps rather than trusting the spoken number (spec 3.2 step 1).
    const destCoords = parsed.destination ? await geocodeAddress(parsed.destination) : null;
    const route = await getRoute({
      destinationAddress: parsed.destination,
      destination: destCoords,
      mockEtaMinutes: parsed.spokenEtaMinutes ?? 20,
    });

    // Build a candidate pool from the requested artists, interleaved
    // round-robin across artists so the no-repeat-artist window in the
    // queue builder doesn't accidentally starve the queue when one
    // artist's results would otherwise all sit consecutively.
    const perArtistTracks = await Promise.all(
      (parsed.artists.length ? parsed.artists : ["popular"]).map((artist) =>
        searchTracks({ query: artist, maxResults: 8 })
      )
    );
    const candidatePool = interleave(perArtistTracks);

    const queueResult = buildTimeCappedQueue(candidatePool, route.etaSeconds);

    const minutes = Math.round((route.etaSeconds ?? 0) / 60);
    const artistList = parsed.artists.length ? parsed.artists.join(" and ") : "your top picks";
    const confirmation = parsed.destination
      ? `Got it — playing ${artistList}, wrapping up right as you arrive in about ${minutes} minutes.`
      : `Got it — playing ${artistList}.`;

    res.json({
      parsed,
      route,
      queue: queueResult,
      confirmationText: confirmation,
    });
  } catch (err) {
    console.error("[/api/assistant/command] error:", err);
    res.status(500).json({ error: "Failed to process command", detail: err.message });
  }
});

export default router;
