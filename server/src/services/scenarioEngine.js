// Classifies a normalized Context Vector into one of the 5 product-spec
// scenarios (see docs/YouTube_Music_AI_Mode_Spec.md, Section 2) and maps
// it to target mood tags + BPM range used for track selection.
//
// This is a deliberately simple, explainable rule-based classifier —
// the spec calls for a "rule-based + ML hybrid" in production; this is
// the rule-based half, structured so an ML confidence re-ranker could
// slot in later without changing the interface.

const TIME_WINDOWS = {
  morning: [5, 11],
  afternoon: [11, 17],
  evening: [17, 21],
  late_night: [21, 5], // wraps past midnight
};

export function timeOfDayFromHour(hour, override) {
  if (override) return override;
  if (hour >= TIME_WINDOWS.morning[0] && hour < TIME_WINDOWS.morning[1]) return "morning";
  if (hour >= TIME_WINDOWS.afternoon[0] && hour < TIME_WINDOWS.afternoon[1]) return "afternoon";
  if (hour >= TIME_WINDOWS.evening[0] && hour < TIME_WINDOWS.evening[1]) return "evening";
  return "late_night";
}

/**
 * @param {{
 *   timeOfDay: string,
 *   weather: { isRaining: boolean, condition: string },
 *   destinationHint: string|null,   // free-text destination, e.g. "Gold's Gym"
 *   routeType: string|null,         // explicit override from demo simulator
 *   hasDestination: boolean,
 *   isTouristCity: boolean,         // landmark-hopping heuristic result
 * }} ctx
 */
export function classifyScenario(ctx) {
  const dest = (ctx.destinationHint || "").toLowerCase();
  const isGym = /gym|fitness|workout|crossfit/.test(dest);
  const isHome = /home/.test(dest);

  // 1. Explicit routeType override (used by the demo simulator to force a scenario)
  if (ctx.routeType === "fitness_outbound" || (isGym && ctx.timeOfDay !== "morning")) {
    return buildResult("fitness_to_gym", "Fitness Loop — To Gym",
      "High-BPM motivational push to lift workout energy before you arrive.",
      ["gym", "high-octane", "motivational"], [140, 170]);
  }
  if (ctx.routeType === "fitness_return" || (isHome && /gym/.test(ctx.originHint || ""))) {
    return buildResult("fitness_from_gym", "Fitness Loop — Cool Down",
      "Downtempo, accomplishment-flavored tracks to bring your heart rate back down.",
      ["gym", "cool-down", "accomplishment"], [80, 100]);
  }

  if (ctx.isTouristCity || ctx.routeType === "tourist") {
    return buildResult("tourist_mode", "Tourist Mode",
      "High probability of a trip/vacation — shifting to travel and regional road-trip vibes.",
      ["travel", "regional", "roadtrip"], [95, 120]);
  }

  if (ctx.timeOfDay === "late_night" && (!ctx.hasDestination || ctx.routeType === "leisure_undetermined")) {
    if (ctx.weather?.isRaining) {
      return buildResult("night_drive_rain", "Rainy Night Drive",
        "Rain detected mid-leisure-drive — shifting from ambient to romantic/melancholic.",
        ["night", "melancholic", "drive", "rain"], [80, 105]);
    }
    return buildResult("night_drive", "Casual Night Drive",
      "No fixed destination at this hour — leisure driving detected. Ambient / lo-fi drive mix.",
      ["night", "ambient", "lo-fi", "drive"], [85, 105]);
  }

  if (ctx.weather?.isRaining && ctx.timeOfDay === "evening") {
    return buildResult("rainy_wind_down", "Rainy Wind-Down",
      "Post-work social trip in the rain — relaxed, cozy, atmospheric transition mix.",
      ["rain", "cozy", "wind-down", "romantic"], [70, 95]);
  }

  if (ctx.timeOfDay === "morning" && ctx.hasDestination) {
    return buildResult("morning_rush", "Morning Focus Mix",
      "Recurring-feel work commute — high energy but soothing, time-capped to your ETA.",
      ["morning", "focus", "upbeat", "motivational"], [110, 128]);
  }

  // Fallback: general adaptive mix
  return buildResult("adaptive_mix", "Adaptive Mix",
    "No strong scenario match — falling back to a balanced, taste-personalized mix.",
    ["morning", "night", "travel"], [90, 120]);
}

function buildResult(id, label, rationale, moodTags, bpmRange) {
  return { id, label, rationale, moodTags, bpmRange };
}
