// POST /api/brain/chat — the actual "generative brain" entry point.
//
// This is the one endpoint in the app where an LLM (Gemini, see
// ../services/geminiService.js) reasons freely over the conversation and
// decides mood/artists/destination, instead of the rest of the codebase's
// rule-based matching (scenarioEngine.js's if/else chain, the regex
// parseCommand() in assistant.js). If Gemini isn't configured or the call
// fails for any reason (quota, network, bad output), this route silently
// falls back to that same rule-based logic so the chat never breaks —
// matching the "live falls back to mock" philosophy already used by
// mapsService/youtubeService. The response always says which path answered
// (`source: "gemini" | "rule-based"`) so the UI can show it transparently,
// same as the existing Maps/YouTube live-vs-mock badges.

import { Router } from "express";
import { MOCK_CATALOG, VIBE_DEFINITIONS, MOCK_WEATHER } from "../data/mockData.js";
import { getMockCatalogByTags, searchTracks } from "../services/youtubeService.js";
import { buildTimeCappedQueue } from "../services/queueBuilder.js";
import { getPatternHint, recordPick, getHistory } from "../services/preferenceTracker.js";
import { timeOfDayFromHour, classifyScenario } from "../services/scenarioEngine.js";
import { geocodeAddress, getRoute } from "../services/mapsService.js";
import { parseCommand, interleave } from "./assistant.js";
import * as geminiService from "../services/geminiService.js";

const router = Router();

// Vocabulary the model is allowed to choose moodTags from — every tag that
// actually exists somewhere in the mock catalog or a vibe definition, so a
// Gemini pick always matches real tracks in getMockCatalogByTags().
const ALLOWED_MOOD_TAGS = Array.from(
  new Set([
    ...MOCK_CATALOG.flatMap((t) => t.tags),
    ...Object.values(VIBE_DEFINITIONS).flatMap((v) => v.moodTags),
  ])
).sort();

const WEATHER_LABELS = {
  sunny: "Sunny",
  rain: "Rainy",
  cloudy: "Cloudy",
  clear_night: "Clear night",
};

function summarizeHistory(history) {
  if (!history || history.length === 0) return "";
  const counts = {};
  for (const entry of history.slice(-30)) {
    const key = `${entry.weather} -> ${entry.vibe}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  const lines = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => `${key} (${count}x)`);
  return `This user's past picks (weather -> vibe): ${lines.join(", ")}.`;
}

function buildSystemContext({ hour, timeOfDay, weatherLabel, history }) {
  const parts = [
    `Right now it's ${formatHour(hour)} (${timeOfDay.replace("_", " ")}).`,
    weatherLabel ? `Weather: ${weatherLabel}.` : "Weather is unknown unless the user mentions it.",
    `Allowed mood tags you may choose from: ${ALLOWED_MOOD_TAGS.join(", ")}.`,
  ];
  const historyLine = summarizeHistory(history);
  if (historyLine) parts.push(historyLine);
  return parts.join(" ");
}

function formatHour(hour) {
  if (hour === undefined || hour === null) return "";
  const h = ((hour + 11) % 12) + 1;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${h}:00 ${ampm}`;
}

// Rule-based decision path — same shape as geminiService.chatDecision()'s
// return value, so the rest of the route doesn't need to know which one ran.
function ruleBasedDecision({ message, timeOfDay, isRaining, debugReason }) {
  const parsed = parseCommand(message);
  const scenario = classifyScenario({
    timeOfDay,
    weather: { isRaining: Boolean(isRaining) },
    destinationHint: parsed.destination,
    routeType: null,
    hasDestination: Boolean(parsed.destination),
    isTouristCity: false,
  });

  const artistList = parsed.artists.length ? parsed.artists.join(" and ") : null;
  const replyText = [
    parsed.destination ? `Got it — heading to ${parsed.destination}.` : "Got it.",
    artistList ? `Queuing up ${artistList}.` : `Building a ${scenario.label.toLowerCase()} for you.`,
    "(Running in rule-based mode right now — connect a Gemini key for the full conversational brain.)",
    // TEMPORARY diagnostic — remove once the Gemini path is confirmed working.
    // Surfaces the actual failure reason instead of guessing blind.
    debugReason ? `[debug: ${debugReason}]` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    replyText,
    moodTags: scenario.moodTags,
    bpmMin: scenario.bpmRange[0],
    bpmMax: scenario.bpmRange[1],
    destination: parsed.destination,
    artists: parsed.artists,
    reasoning: scenario.rationale,
    source: "rule-based",
  };
}

/**
 * POST /api/brain/chat
 * body: { userId?, message, history?: [{role, text}], hourOverride?, weather? }
 */
router.post("/chat", async (req, res) => {
  try {
    const body = req.body ?? {};
    const userId = body.userId || "demo-user";
    const message = (body.message ?? "").trim();
    if (!message) return res.status(400).json({ error: "message is required" });

    const history = Array.isArray(body.history) ? body.history : [];
    const hour = body.hourOverride ?? new Date().getHours();
    const timeOfDay = timeOfDayFromHour(hour);
    const weatherCondition = MOCK_WEATHER[body.weather] ? body.weather : null;
    const weatherLabel = weatherCondition ? WEATHER_LABELS[weatherCondition] : null;
    const isRaining = weatherCondition ? Boolean(MOCK_WEATHER[weatherCondition].isRaining) : false;

    const pastHistory = getHistory(userId);

    let decision;
    try {
      if (!geminiService.isConfigured()) throw new Error("GEMINI_API_KEY not set");
      decision = await geminiService.chatDecision({
        message,
        history,
        systemContext: buildSystemContext({ hour, timeOfDay, weatherLabel, history: pastHistory }),
        allowedMoodTags: ALLOWED_MOOD_TAGS,
      });
    } catch (err) {
      console.warn("[/api/brain/chat] Gemini path unavailable, using rule-based fallback:", err.message);
      decision = ruleBasedDecision({ message, timeOfDay, isRaining, debugReason: err.message });
    }

    // Resolve a real ETA if a destination was mentioned/decided (same as assistant.js).
    let route = null;
    if (decision.destination) {
      const destCoords = await geocodeAddress(decision.destination);
      route = await getRoute({
        destinationAddress: decision.destination,
        destination: destCoords,
        mockEtaMinutes: 20,
      });
    }

    // Build the candidate pool: requested artists take priority (interleaved
    // round-robin, same as assistant.js), otherwise fall back to mood tags.
    let candidates;
    if (decision.artists.length > 0) {
      const perArtistTracks = await Promise.all(
        decision.artists.map((artist) => searchTracks({ query: artist, maxResults: 8 }))
      );
      candidates = interleave(perArtistTracks);
    } else {
      candidates = getMockCatalogByTags(decision.moodTags, 20);
    }

    const queueResult = buildTimeCappedQueue(candidates, route?.etaSeconds ?? null);

    // Best-effort personalization logging — never let this break the response.
    let patternHint = null;
    try {
      if (weatherCondition) {
        patternHint = getPatternHint(userId, weatherCondition, decision.moodTags[0]);
      }
      recordPick(userId, weatherCondition || "unknown", decision.moodTags[0] || "chat", hour);
    } catch (err) {
      console.warn("[/api/brain/chat] preference logging failed (non-fatal):", err.message);
    }

    res.json({
      replyText: decision.replyText,
      scenario: {
        id: `brain_${decision.source}`,
        label: decision.source === "gemini" ? "AI Brain Mix" : "AI Brain Mix (rule-based)",
        rationale: decision.reasoning || "Matched to your message.",
        moodTags: decision.moodTags,
        bpmRange: [decision.bpmMin, decision.bpmMax],
      },
      queue: queueResult,
      context: {
        hour,
        timeOfDay,
        weather: weatherCondition
          ? { source: "manual", condition: weatherCondition, description: weatherLabel }
          : null,
        route,
      },
      patternHint,
      source: decision.source,
    });
  } catch (err) {
    console.error("[/api/brain/chat] error:", err);
    res.status(500).json({ error: "Failed to process chat message", detail: err.message });
  }
});

export default router;
