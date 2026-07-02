// Wraps the YouTube Data API v3 for search + duration lookup.
// NOTE: this gives search + metadata only — there is no official YouTube
// Music playback/queue-control API, so actual audio playback in the web
// prototype uses the YouTube IFrame Player embedded on the frontend.
// Docs: https://developers.google.com/youtube/v3
//
// Falls back to the local mock catalog when YOUTUBE_API_KEY is missing,
// FORCE_MOCK=true, or the live call fails.

import fetch from "node-fetch";
import { MOCK_CATALOG } from "../data/mockData.js";

const SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";

/**
 * @param {{ query: string, maxResults?: number }} params
 * @returns {Promise<Array<{id, title, artist, durationSec, source}>>}
 */
export async function searchTracks({ query, maxResults = 8 }) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const forceMock = String(process.env.FORCE_MOCK).toLowerCase() === "true";

  if (forceMock || !apiKey) {
    return mockSearch(query, maxResults);
  }

  try {
    const searchUrl = `${SEARCH_ENDPOINT}?part=snippet&type=video&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(
      query
    )}&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`YouTube search HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const ids = (searchData.items ?? []).map((i) => i.id.videoId).filter(Boolean);
    if (ids.length === 0) return mockSearch(query, maxResults);

    const videosUrl = `${VIDEOS_ENDPOINT}?part=contentDetails,snippet&id=${ids.join(
      ","
    )}&key=${apiKey}`;
    const videosRes = await fetch(videosUrl);
    if (!videosRes.ok) throw new Error(`YouTube videos HTTP ${videosRes.status}`);
    const videosData = await videosRes.json();

    return (videosData.items ?? []).map((v) => ({
      id: v.id,
      title: v.snippet.title,
      artist: v.snippet.channelTitle,
      durationSec: parseIso8601Duration(v.contentDetails.duration),
      source: "youtube",
    }));
  } catch (err) {
    console.warn("[youtubeService] live search failed, falling back to mock:", err.message);
    return mockSearch(query, maxResults);
  }
}

function mockSearch(query, maxResults) {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = MOCK_CATALOG.map((track) => {
    const haystack = `${track.title} ${track.artist} ${track.tags.join(" ")}`.toLowerCase();
    const score = terms.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
    return { track, score };
  }).filter((s) => s.score > 0);

  const results = (scored.length > 0 ? scored : MOCK_CATALOG.map((track) => ({ track, score: 0 })))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => ({ ...s.track, source: "mock" }));

  return results;
}

// Parses ISO 8601 durations like "PT3M45S" into seconds.
function parseIso8601Duration(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!match) return 0;
  const [, h, m, s] = match;
  return (parseInt(h || 0, 10) * 3600) + (parseInt(m || 0, 10) * 60) + parseInt(s || 0, 10);
}

export function getMockCatalogByTags(tags, maxResults = 12) {
  const wanted = new Set(tags);
  const scored = MOCK_CATALOG.map((track) => {
    const overlap = track.tags.filter((t) => wanted.has(t)).length;
    return { track, overlap };
  });

  const matched = scored.filter((s) => s.overlap > 0).sort((a, b) => b.overlap - a.overlap);
  const unmatched = scored.filter((s) => s.overlap === 0);

  // Pad with the rest of the catalog (lowest priority) so small mood
  // buckets still have enough candidates to fill a longer ETA window and
  // have a track left over for the Clean-Cut final slot.
  const ordered = [...matched, ...unmatched].slice(0, maxResults);

  return ordered.map((s) => ({ ...s.track, source: "mock" }));
}
