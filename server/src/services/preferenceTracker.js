// Logs every weather+vibe pick per user. This is the "data for recognizing
// patterns" groundwork: it doesn't do real ML, just persists enough history
// that a personalization layer (or a real model) can be built on top later.
// getPatternHint() is the current, honestly-simple version of that: a
// rule-based "you usually pick X in this weather" lookup.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On Vercel the deployed source is read-only and non-persistent across
// invocations — only /tmp is writable, and even that doesn't survive cold
// starts. Locally this still writes to server/data as before, unaffected.
const STORE_PATH = process.env.VERCEL
  ? path.join("/tmp", "vibe-log.json")
  : path.join(__dirname, "..", "..", "data", "vibe-log.json");

function loadStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

/**
 * Looks at this user's past picks for the same weather (not counting the
 * pick they're making right now) and returns a short human-readable hint,
 * or null if there isn't enough history yet.
 */
export function getPatternHint(userId, weather, vibeJustPicked) {
  const store = loadStore();
  const history = store[userId] ?? [];
  const sameWeather = history.filter((entry) => entry.weather === weather);

  if (sameWeather.length < 2) return null; // not enough history to say anything meaningful

  const counts = {};
  for (const entry of sameWeather) {
    counts[entry.vibe] = (counts[entry.vibe] ?? 0) + 1;
  }
  const [topVibe, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  if (topCount < 2) return null;

  const weatherLabel = weather.replace("_", " ");
  if (topVibe === vibeJustPicked) {
    return `You usually pick "${topVibe}" on ${weatherLabel} days too — this fits your pattern.`;
  }
  return `Heads up: on ${weatherLabel} days you've picked "${topVibe}" ${topCount}/${sameWeather.length} times before, more often than "${vibeJustPicked}".`;
}

/**
 * Records a pick. Call this AFTER computing the pattern hint for the
 * current request, so the hint reflects prior history, not this pick.
 */
export function recordPick(userId, weather, vibe, hour) {
  const store = loadStore();
  const history = store[userId] ?? [];
  history.push({ weather, vibe, hour, timestamp: new Date().toISOString() });
  store[userId] = history.slice(-200); // bounded history per user
  saveStore(store);
}

export function getHistory(userId) {
  const store = loadStore();
  return store[userId] ?? [];
}
