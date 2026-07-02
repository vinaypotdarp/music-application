import { Router } from "express";
import { getRoute } from "../services/mapsService.js";
import { getCurrentConditions } from "../services/weatherService.js";
import { classifyScenario, timeOfDayFromHour } from "../services/scenarioEngine.js";
import { searchTracks, getMockCatalogByTags } from "../services/youtubeService.js";
import { buildTimeCappedQueue } from "../services/queueBuilder.js";

const router = Router();

/**
 * POST /api/context
 * body: {
 *   originAddress?, destinationAddress?,        // for real Maps calls
 *   lat, lng,                                     // device location, for weather
 *   mockEtaMinutes?, mockTrafficLevel?,            // demo simulator overrides
 *   mockWeatherKey?,                               // "sunny" | "rain" | "clear_night" | "cloudy"
 *   timeOfDayOverride?, routeType?, isTouristCity?,
 *   hourOverride?                                  // for demoing without waiting for real clock
 * }
 */
router.post("/", async (req, res) => {
  try {
    const body = req.body ?? {};
    const now = new Date();
    const hour = body.hourOverride ?? now.getHours();
    const timeOfDay = timeOfDayFromHour(hour, body.timeOfDayOverride);

    const [route, weather] = await Promise.all([
      getRoute({
        originAddress: body.originAddress,
        origin: body.origin, // { lat, lng } — used in Live mode from device geolocation
        destinationAddress: body.destinationAddress,
        mockEtaMinutes: body.mockEtaMinutes,
        mockTrafficLevel: body.mockTrafficLevel,
      }),
      getCurrentConditions({ lat: body.lat, lng: body.lng, mockKey: body.mockWeatherKey }),
    ]);

    const contextVector = {
      timeOfDay,
      weather,
      destinationHint: body.destinationAddress ?? null,
      originHint: body.originAddress ?? null,
      routeType: body.routeType ?? null,
      hasDestination: Boolean(body.destinationAddress),
      isTouristCity: Boolean(body.isTouristCity),
    };

    const scenario = classifyScenario(contextVector);

    // Curate candidates: try live YouTube search per mood tag, else mock catalog by tags.
    let candidates = getMockCatalogByTags(scenario.moodTags, 20);
    if (process.env.YOUTUBE_API_KEY && String(process.env.FORCE_MOCK).toLowerCase() !== "true") {
      const liveResults = await searchTracks({
        query: `${scenario.moodTags.join(" ")} music`,
        maxResults: 12,
      });
      if (liveResults.length > 0) candidates = liveResults;
    }

    const queueResult = buildTimeCappedQueue(candidates, route.etaSeconds);

    res.json({
      context: { timeOfDay, hour, route, weather },
      scenario,
      queue: queueResult,
    });
  } catch (err) {
    console.error("[/api/context] error:", err);
    res.status(500).json({ error: "Failed to build context", detail: err.message });
  }
});

export default router;
