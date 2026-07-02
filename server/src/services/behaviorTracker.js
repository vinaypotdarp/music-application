// Implements Section 3.4 (Micro-Behavioral Smart Trimming) from the spec.
// Persists to a small JSON file so learned trims survive server restarts
// without needing a real database for this prototype.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// See preferenceTracker.js for why /tmp is used on Vercel specifically.
const STORE_PATH = process.env.VERCEL
  ? path.join("/tmp", "behavior-store.json")
  : path.join(__dirname, "..", "..", "data", "behavior-store.json");

const INTRO_SKIP_THRESHOLD_SEC = 20; // "first 20 seconds" from the spec
const CONSECUTIVE_PLAYS_TO_FLAG = 3;

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

function keyFor(userId, trackId) {
  return `${userId}::${trackId}`;
}

/**
 * Call every time a user manually skips forward early in a track.
 * @param {string} userId
 * @param {string} trackId
 * @param {number} skippedToSeconds - where playback landed after the skip
 */
export function recordSkip(userId, trackId, skippedToSeconds) {
  const store = loadStore();
  const key = keyFor(userId, trackId);
  const entry = store[key] ?? { history: [], confirmedOffsetSec: null, provisionalOffsetSec: null };

  const isIntroSkip = skippedToSeconds > 0 && skippedToSeconds <= INTRO_SKIP_THRESHOLD_SEC + 5;
  if (isIntroSkip) {
    entry.history.push(skippedToSeconds);
    entry.history = entry.history.slice(-10); // bounded history
  } else {
    // A skip outside the intro window doesn't build the pattern.
    entry.history = [];
  }

  const recent = entry.history.slice(-CONSECUTIVE_PLAYS_TO_FLAG);
  const consistentEnough =
    recent.length >= CONSECUTIVE_PLAYS_TO_FLAG &&
    Math.max(...recent) - Math.min(...recent) <= 5; // roughly the same point each time

  if (consistentEnough) {
    const avgOffset = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
    if (entry.provisionalOffsetSec === null) {
      // First time hitting the threshold: stays provisional for one more play (spec 3.4 step 2).
      entry.provisionalOffsetSec = avgOffset;
    } else {
      entry.confirmedOffsetSec = avgOffset;
    }
  }

  store[key] = entry;
  saveStore(store);
  return entry;
}

/**
 * Call when a user manually seeks back to the start — clears any learned trim (spec 3.4 step 5).
 */
export function clearTrim(userId, trackId) {
  const store = loadStore();
  const key = keyFor(userId, trackId);
  if (store[key]) {
    store[key] = { history: [], confirmedOffsetSec: null, provisionalOffsetSec: null };
    saveStore(store);
  }
}

/**
 * Returns the offset (in seconds) playback should auto-start at for this user+track,
 * or 0 if no confirmed trim exists yet.
 */
export function getAutoStartOffset(userId, trackId) {
  const store = loadStore();
  const entry = store[keyFor(userId, trackId)];
  return entry?.confirmedOffsetSec ?? 0;
}

export function getDebugEntry(userId, trackId) {
  const store = loadStore();
  return store[keyFor(userId, trackId)] ?? null;
}
