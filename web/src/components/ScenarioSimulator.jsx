import React, { useState } from "react";

const WEATHER_KEY_BY_LABEL = {
  sunny: "sunny",
  rain: "rain",
  clear_night: "clear_night",
  cloudy: "cloudy",
};

export default function ScenarioSimulator({ scenarios, onRun, onLiveMode, loading }) {
  const [liveDestination, setLiveDestination] = useState("");

  return (
    <div className="simulator">
      <div className="simulator__title">Scenario Simulator</div>
      <p className="simulator__hint">
        A real build triggers automatically from car-connect + GPS. For this prototype, pick a
        scenario from the product spec to simulate the context signals, or switch to Live mode to
        use your real location + a typed destination against the real Maps/Weather APIs (once keys
        are configured).
      </p>

      <div className="simulator__grid">
        {scenarios.map((s) => (
          <button
            key={s.key}
            className="simulator__btn"
            disabled={loading}
            onClick={() =>
              onRun({
                originAddress: s.origin,
                destinationAddress: s.destination,
                mockEtaMinutes: s.etaMinutes,
                mockTrafficLevel: s.trafficLevel,
                mockWeatherKey: WEATHER_KEY_BY_LABEL[s.weather] ?? "sunny",
                timeOfDayOverride: s.timeOfDayOverride,
                routeType: s.routeType,
                isTouristCity: s.routeType === "tourist",
                hourOverride: hourForTimeOfDay(s.timeOfDayOverride),
              })
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="simulator__live">
        <input
          type="text"
          placeholder="Live mode: type a destination (e.g. Cyber Hub)"
          value={liveDestination}
          onChange={(e) => setLiveDestination(e.target.value)}
        />
        <button
          disabled={loading || !liveDestination.trim()}
          onClick={() => onLiveMode(liveDestination.trim())}
        >
          Use my location →
        </button>
      </div>
    </div>
  );
}

function hourForTimeOfDay(tod) {
  switch (tod) {
    case "morning":
      return 8;
    case "afternoon":
      return 14;
    case "evening":
      return 18;
    case "late_night":
      return 23;
    default:
      return new Date().getHours();
  }
}
