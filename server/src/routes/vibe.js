import { Router } from "express";
import { VIBE_DEFINITIONS, WEATHER_OPTIONS } from "../data/mockData.js";
import { getMockCatalogByTags } from "../services/youtubeService.js";
import { buildTimeCappedQueue } from "../services/queueBuilder.js";
import { getPatternHint, recordPick, getHistory } from "../services/preferenceTracker.js";
import { timeOfDayFromHour } from "../services/scenarioEngine.js";

const router = Router();

const WEATHER_LABELS = {
  sunny: "Sunny",
  rain: "Rainy",
  cloudy: "Cloudy",
  clear_night: "Clear night",
};

/**
 * POST /api/vibe
 * body: { userId, weather, vibe, hourOverride? }
 *
 * The zero-setup, zero-API-key entry flow: the user tells the app the
 * weather and their vibe directly instead of it being auto-detected from
 * Maps/Weather APIs. No destination, so no hard ETA cap — same
 * mood-continuity queueing used for the Night Drive scenario.
 */
router.post("/", (req, res) => {
  try {
    const body = req.body ?? {};
    const userId = body.userId || "demo-user";
    const weather = WEATHER_OPTIONS.includes(body.weather) ? body.weather : "sunny";
    const vibeKey = VIBE_DEFINITIONS[body.vibe] ? body.vibe : "focus";
    const vibeDef = VIBE_DEFINITIONS[vibeKey];
    const hour = body.hourOverride ?? new Date().getHours();

    // Rain nudges the candidate pool toward the catalog's "rain"-tagged
    // tracks too, on top of whatever the chosen vibe already asks for.
    const moodTags = weather === "rain" ? [...vibeDef.moodTags, "rain"] : vibeDef.moodTags;

    const scenario = {
      id: `vibe_${vibeKey}_${weather}`,
      label: `${vibeDef.label} Mix`,
      rationale: `Matched to "${vibeDef.label}" in ${WEATHER_LABELS[weather].toLowerCase()} weather.`,
      moodTags,
      bpmRange: vibeDef.bpmRange,
    };

    const candidates = getMockCatalogByTags(moodTags, 20);
    // No destination in this flow -> no ETA -> uncapped, mood-continuity queue.
    const queueResult = buildTimeCappedQueue(candidates, null);

    // Compute the pattern hint from history BEFORE recording this pick.
    const patternHint = getPatternHint(userId, weather, vibeKey);
    recordPick(userId, weather, vibeKey, hour);

    res.json({
      context: {
        timeOfDay: timeOfDayFromHour(hour),
        hour,
        weather: { source: "manual", condition: weather, description: WEATHER_LABELS[weather] },
      },
      scenario,
      queue: queueResult,
      patternHint,
      vibeOptions: Object.keys(VIBE_DEFINITIONS).map((key) => ({ key, label: VIBE_DEFINITIONS[key].label })),
      weatherOptions: WEATHER_OPTIONS.map((key) => ({ key, label: WEATHER_LABELS[key] })),
    });
  } catch (err) {
    console.error("[/api/vibe] error:", err);
    res.status(500).json({ error: "Failed to build vibe mix", detail: err.message });
  }
});

// GET /api/vibe/options - lets the frontend render chips without hardcoding them twice.
router.get("/options", (req, res) => {
  res.json({
    vibeOptions: Object.keys(VIBE_DEFINITIONS).map((key) => ({ key, label: VIBE_DEFINITIONS[key].label })),
    weatherOptions: WEATHER_OPTIONS.map((key) => ({ key, label: WEATHER_LABELS[key] })),
  });
});

// GET /api/vibe/history/:userId - raw history, mostly for debugging/inspection.
router.get("/history/:userId", (req, res) => {
  res.json({ history: getHistory(req.params.userId) });
});

export default router;
