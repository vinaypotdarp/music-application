// Wraps Google Maps Platform Routes API (ETA + traffic) and Geocoding API
// (address -> lat/lng). Docs:
//   https://developers.google.com/maps/documentation/routes
//   https://developers.google.com/maps/documentation/geocoding
//
// Falls back to mock ETA/traffic when GOOGLE_MAPS_API_KEY is missing,
// FORCE_MOCK=true, or the live call fails.

import fetch from "node-fetch";

const ROUTES_ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

export async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const forceMock = String(process.env.FORCE_MOCK).toLowerCase() === "true";

  if (forceMock || !apiKey || !address) return null;

  try {
    const url = `${GEOCODE_ENDPOINT}?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch (err) {
    console.warn("[mapsService] geocode failed:", err.message);
    return null;
  }
}

/**
 * @param {{ originAddress?: string, destinationAddress?: string,
 *            origin?: {lat,lng}, destination?: {lat,lng},
 *            mockEtaMinutes?: number, mockTrafficLevel?: string }} params
 */
export async function getRoute(params) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const forceMock = String(process.env.FORCE_MOCK).toLowerCase() === "true";
  const noDestination = !params.destinationAddress && !params.destination;

  if (forceMock || !apiKey || noDestination) {
    return buildMock(params);
  }

  try {
    const origin = params.origin
      ? { location: { latLng: { latitude: params.origin.lat, longitude: params.origin.lng } } }
      : { address: params.originAddress };
    const destination = params.destination
      ? { location: { latLng: { latitude: params.destination.lat, longitude: params.destination.lng } } }
      : { address: params.destinationAddress };

    const res = await fetch(ROUTES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // FieldMask keeps the response small and billing-efficient.
        "X-Goog-FieldMask":
          "routes.duration,routes.staticDuration,routes.distanceMeters,routes.legs",
      },
      body: JSON.stringify({
        origin,
        destination,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    if (!res.ok) throw new Error(`Routes API HTTP ${res.status}`);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error("No route returned");

    const liveSeconds = parseDurationSeconds(route.duration);
    const staticSeconds = parseDurationSeconds(route.staticDuration);
    const trafficLevel = classifyTraffic(liveSeconds, staticSeconds);

    return {
      source: "live",
      etaMinutes: Math.round(liveSeconds / 60),
      etaSeconds: liveSeconds,
      trafficLevel,
      distanceMeters: route.distanceMeters ?? null,
      raw: route,
    };
  } catch (err) {
    console.warn("[mapsService] live route call failed, falling back to mock:", err.message);
    return buildMock(params);
  }
}

function parseDurationSeconds(durationStr) {
  // Routes API returns durations like "874s"
  if (!durationStr) return null;
  const match = /^(\d+)s$/.exec(durationStr);
  return match ? parseInt(match[1], 10) : null;
}

function classifyTraffic(liveSeconds, staticSeconds) {
  if (!liveSeconds || !staticSeconds) return "unknown";
  const ratio = liveSeconds / staticSeconds;
  if (ratio < 1.1) return "light";
  if (ratio < 1.4) return "moderate";
  return "heavy";
}

function buildMock({ mockEtaMinutes, mockTrafficLevel, destinationAddress }) {
  const etaMinutes = mockEtaMinutes ?? (destinationAddress ? 15 : null);
  return {
    source: "mock",
    etaMinutes,
    etaSeconds: etaMinutes ? etaMinutes * 60 : null,
    trafficLevel: mockTrafficLevel ?? "moderate",
    distanceMeters: etaMinutes ? etaMinutes * 500 : null, // rough placeholder
  };
}
