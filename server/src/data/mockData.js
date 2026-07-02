// Mock catalog + mock context data so the whole app runs end-to-end
// with zero API keys. Real services fall back to this automatically
// when a key is missing or FORCE_MOCK=true.

// Duration is in seconds. bpm/energy/valence/acousticness are 0-1 scaled
// (bpm is raw, others 0-1) loosely modeled on Spotify-style audio features.
export const MOCK_CATALOG = [
  // -- High energy / focus (Morning Rush) --
  { id: "yt_mock_01", title: "Skyline Drive", artist: "Neon Circuit", durationSec: 198, bpm: 122, energy: 0.75, valence: 0.7, acousticness: 0.1, tags: ["morning", "focus", "upbeat"] },
  { id: "yt_mock_02", title: "First Light", artist: "Aurora Kade", durationSec: 210, bpm: 118, energy: 0.68, valence: 0.72, acousticness: 0.15, tags: ["morning", "focus", "motivational"] },
  { id: "yt_mock_03", title: "Green Signal", artist: "Motive", durationSec: 175, bpm: 126, energy: 0.8, valence: 0.65, acousticness: 0.08, tags: ["morning", "commute", "upbeat"] },
  { id: "yt_mock_04", title: "Clockwork Mornings", artist: "Delta Fields", durationSec: 188, bpm: 112, energy: 0.6, valence: 0.7, acousticness: 0.2, tags: ["morning", "soothing", "focus"] },

  // -- Rainy wind-down (cozy / atmospheric / romantic) --
  { id: "yt_mock_05", title: "Windowpane", artist: "Soft Static", durationSec: 240, bpm: 84, energy: 0.3, valence: 0.45, acousticness: 0.7, tags: ["rain", "cozy", "wind-down"] },
  { id: "yt_mock_06", title: "Petrichor", artist: "Halide", durationSec: 225, bpm: 78, energy: 0.25, valence: 0.5, acousticness: 0.8, tags: ["rain", "atmospheric", "wind-down"] },
  { id: "yt_mock_07", title: "Slow City Lights", artist: "June Marlowe", durationSec: 250, bpm: 90, energy: 0.35, valence: 0.55, acousticness: 0.6, tags: ["rain", "romantic", "cozy"] },
  { id: "yt_mock_08", title: "Umbrella Season", artist: "Soft Static", durationSec: 205, bpm: 82, energy: 0.28, valence: 0.4, acousticness: 0.75, tags: ["rain", "melancholic", "wind-down"] },

  // -- Fitness: high octane --
  { id: "yt_mock_09", title: "Redline", artist: "Voltage District", durationSec: 195, bpm: 158, energy: 0.95, valence: 0.6, acousticness: 0.02, tags: ["gym", "high-octane", "motivational"] },
  { id: "yt_mock_10", title: "Iron Pulse", artist: "Kilowatt", durationSec: 202, bpm: 165, energy: 0.98, valence: 0.55, acousticness: 0.01, tags: ["gym", "high-octane", "aggressive"] },
  { id: "yt_mock_11", title: "Overdrive", artist: "Voltage District", durationSec: 180, bpm: 150, energy: 0.92, valence: 0.65, acousticness: 0.03, tags: ["gym", "high-octane", "motivational"] },

  // -- Fitness: cool down / accomplishment --
  { id: "yt_mock_12", title: "Cool Down Room", artist: "Delta Fields", durationSec: 220, bpm: 92, energy: 0.4, valence: 0.75, acousticness: 0.4, tags: ["gym", "cool-down", "accomplishment"] },
  { id: "yt_mock_13", title: "Well Earned", artist: "June Marlowe", durationSec: 215, bpm: 88, energy: 0.35, valence: 0.8, acousticness: 0.45, tags: ["gym", "cool-down", "accomplishment"] },

  // -- Night drive: ambient / lo-fi --
  { id: "yt_mock_14", title: "Midnight Loop", artist: "Halide", durationSec: 260, bpm: 95, energy: 0.4, valence: 0.5, acousticness: 0.3, tags: ["night", "ambient", "drive"] },
  { id: "yt_mock_15", title: "Empty Highway", artist: "Aurora Kade", durationSec: 245, bpm: 100, energy: 0.45, valence: 0.5, acousticness: 0.25, tags: ["night", "lo-fi", "drive"] },
  { id: "yt_mock_16", title: "Streetlight Static", artist: "Soft Static", durationSec: 230, bpm: 90, energy: 0.35, valence: 0.4, acousticness: 0.4, tags: ["night", "melancholic", "drive", "rain"] },

  // -- Tourist / travel --
  { id: "yt_mock_17", title: "Pink City Roads", artist: "Marigold Ensemble", durationSec: 215, bpm: 108, energy: 0.6, valence: 0.75, acousticness: 0.55, tags: ["travel", "regional", "roadtrip"] },
  { id: "yt_mock_18", title: "Bazaar Wind", artist: "Marigold Ensemble", durationSec: 195, bpm: 100, energy: 0.55, valence: 0.7, acousticness: 0.6, tags: ["travel", "regional", "roadtrip"] },
  { id: "yt_mock_19", title: "Fort Road", artist: "Kite & Compass", durationSec: 205, bpm: 112, energy: 0.65, valence: 0.72, acousticness: 0.35, tags: ["travel", "roadtrip"] },

  // -- Requested-artist style mock tracks used by the voice assistant demo --
  { id: "yt_mock_20", title: "Woh Lamhe (style)", artist: "Atif Aslam", durationSec: 258, bpm: 92, energy: 0.5, valence: 0.6, acousticness: 0.5, tags: ["bollywood", "romantic"] },
  { id: "yt_mock_21", title: "Tera Hone Laga Hoon (style)", artist: "Atif Aslam", durationSec: 302, bpm: 84, energy: 0.4, valence: 0.65, acousticness: 0.6, tags: ["bollywood", "romantic"] },
  { id: "yt_mock_22", title: "Kal Ho Naa Ho (style)", artist: "Sonu Nigam", durationSec: 330, bpm: 76, energy: 0.35, valence: 0.55, acousticness: 0.65, tags: ["bollywood", "emotional"] },
  { id: "yt_mock_23", title: "Sandese Aate Hain (style)", artist: "Sonu Nigam", durationSec: 345, bpm: 70, energy: 0.3, valence: 0.5, acousticness: 0.7, tags: ["bollywood", "emotional"] },
  { id: "yt_mock_24", title: "Abhi Mujh Mein Kahin (style)", artist: "Sonu Nigam", durationSec: 288, bpm: 80, energy: 0.45, valence: 0.6, acousticness: 0.55, tags: ["bollywood", "motivational"] },
  { id: "yt_mock_25", title: "Jeene Laga Hoon (style)", artist: "Atif Aslam", durationSec: 265, bpm: 96, energy: 0.55, valence: 0.68, acousticness: 0.45, tags: ["bollywood", "romantic"] },
  { id: "yt_mock_26", title: "Pehli Nazar Mein (style)", artist: "Atif Aslam", durationSec: 280, bpm: 88, energy: 0.5, valence: 0.7, acousticness: 0.4, tags: ["bollywood", "romantic"] },
  { id: "yt_mock_27", title: "Doorie (style)", artist: "Atif Aslam", durationSec: 260, bpm: 78, energy: 0.35, valence: 0.45, acousticness: 0.65, tags: ["bollywood", "emotional"] },
  { id: "yt_mock_28", title: "Suraj Hua Maddham (style)", artist: "Sonu Nigam", durationSec: 320, bpm: 82, energy: 0.5, valence: 0.65, acousticness: 0.5, tags: ["bollywood", "romantic"] },
  { id: "yt_mock_29", title: "Main Yahaan Hoon (style)", artist: "Sonu Nigam", durationSec: 290, bpm: 90, energy: 0.55, valence: 0.7, acousticness: 0.45, tags: ["bollywood", "motivational"] },
];

export const MOCK_WEATHER = {
  sunny: { condition: "CLEAR", description: "Sunny", tempC: 32, isRaining: false },
  rain: { condition: "RAIN", description: "Light rain", tempC: 26, isRaining: true },
  clear_night: { condition: "CLEAR", description: "Clear", tempC: 29, isRaining: false },
  cloudy: { condition: "CLOUDY", description: "Cloudy", tempC: 30, isRaining: false },
};

// Canned demo contexts matching the 5 scenarios from the product spec,
// used by the frontend's "Scenario Simulator" panel.
// Vibe picker: the simple "what's the weather + what's your vibe" entry
// flow. Deliberately needs zero external APIs (no Maps, no Weather key) —
// the user manually tells the app both signals instead of them being
// auto-detected. Each vibe maps to the same mood-tag vocabulary used by
// getMockCatalogByTags, so it reuses the existing catalog/queue-builder
// logic untouched.
export const VIBE_DEFINITIONS = {
  focus: { label: "Focus", moodTags: ["morning", "focus", "upbeat", "motivational"], bpmRange: [105, 128] },
  energetic: { label: "Energetic", moodTags: ["gym", "high-octane", "motivational", "aggressive"], bpmRange: [135, 170] },
  chill: { label: "Chill", moodTags: ["cozy", "wind-down", "cool-down", "accomplishment"], bpmRange: [70, 100] },
  romantic: { label: "Romantic", moodTags: ["romantic", "emotional"], bpmRange: [75, 95] },
  ambient: { label: "Ambient / Night", moodTags: ["night", "ambient", "lo-fi", "drive"], bpmRange: [85, 105] },
  explore: { label: "Explore", moodTags: ["travel", "regional", "roadtrip"], bpmRange: [95, 120] },
};

export const WEATHER_OPTIONS = ["sunny", "rain", "cloudy", "clear_night"];

export const DEMO_SCENARIOS = [
  {
    key: "morning_rush",
    label: "Morning Rush",
    origin: "Sector 38, Gurgaon",
    destination: "CyberCity, Gurgaon",
    etaMinutes: 14,
    trafficLevel: "moderate",
    weather: "sunny",
    timeOfDayOverride: "morning",
    routeType: "commute",
  },
  {
    key: "rainy_wind_down",
    label: "Rainy Wind-Down",
    origin: "CyberCity, Gurgaon",
    destination: "Friend's House, DLF Phase 2",
    etaMinutes: 22,
    trafficLevel: "moderate",
    weather: "rain",
    timeOfDayOverride: "evening",
    routeType: "social",
  },
  {
    key: "fitness_to_gym",
    label: "Fitness Loop — To Gym",
    origin: "Home",
    destination: "Gold's Gym, Sector 29",
    etaMinutes: 10,
    trafficLevel: "light",
    weather: "clear_night",
    timeOfDayOverride: "evening",
    routeType: "fitness_outbound",
  },
  {
    key: "fitness_from_gym",
    label: "Fitness Loop — From Gym",
    origin: "Gold's Gym, Sector 29",
    destination: "Home",
    etaMinutes: 10,
    trafficLevel: "light",
    weather: "clear_night",
    timeOfDayOverride: "evening",
    routeType: "fitness_return",
  },
  {
    key: "night_drive",
    label: "Casual Night Drive",
    origin: "Current location",
    destination: null,
    etaMinutes: null,
    trafficLevel: "light",
    weather: "clear_night",
    timeOfDayOverride: "late_night",
    routeType: "leisure_undetermined",
  },
  {
    key: "night_drive_rain",
    label: "Casual Night Drive (Rain shift)",
    origin: "Current location",
    destination: null,
    etaMinutes: null,
    trafficLevel: "light",
    weather: "rain",
    timeOfDayOverride: "late_night",
    routeType: "leisure_undetermined",
  },
  {
    key: "tourist_mode",
    label: "Tourist Mode — Jaipur",
    origin: "Hawa Mahal, Jaipur",
    destination: "Amber Fort, Jaipur",
    etaMinutes: 18,
    trafficLevel: "light",
    weather: "sunny",
    timeOfDayOverride: "afternoon",
    routeType: "tourist",
  },
];
