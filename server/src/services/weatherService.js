// Wraps the Google Weather API (part of Google Maps Platform).
// Docs: https://developers.google.com/maps/documentation/weather
//
// Falls back to mock conditions when GOOGLE_MAPS_API_KEY is missing,
// FORCE_MOCK=true, or the live call fails — so the app always runs.

import fetch from "node-fetch";
import { MOCK_WEATHER } from "../data/mockData.js";

const WEATHER_ENDPOINT = "https://weather.googleapis.com/v1/currentConditions:lookup";

/**
 * @param {{ lat: number, lng: number, mockKey?: string }} params
 *   mockKey lets the demo UI force a specific mock condition
 *   ("sunny" | "rain" | "clear_night" | "cloudy") without real coordinates.
 */
export async function getCurrentConditions({ lat, lng, mockKey }) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const forceMock = String(process.env.FORCE_MOCK).toLowerCase() === "true";

  if (forceMock || !apiKey || mockKey) {
    return buildMock(mockKey);
  }

  try {
    const url = `${WEATHER_ENDPOINT}?key=${apiKey}&location.latitude=${lat}&location.longitude=${lng}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API HTTP ${res.status}`);
    const data = await res.json();

    // Response shape per Google Weather API: weatherCondition.type, temperature.degrees, etc.
    const conditionType = data?.weatherCondition?.type ?? "UNKNOWN";
    const isRaining = /RAIN|DRIZZLE|SHOWER|THUNDERSTORM/i.test(conditionType);

    return {
      source: "live",
      condition: conditionType,
      description: data?.weatherCondition?.description?.text ?? conditionType,
      tempC: data?.temperature?.degrees ?? null,
      isRaining,
      raw: data,
    };
  } catch (err) {
    console.warn("[weatherService] live call failed, falling back to mock:", err.message);
    return buildMock(mockKey);
  }
}

function buildMock(mockKey) {
  const key = mockKey && MOCK_WEATHER[mockKey] ? mockKey : "sunny";
  return { source: "mock", ...MOCK_WEATHER[key] };
}
