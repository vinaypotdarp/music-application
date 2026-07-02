import React from "react";

export default function ContextStrip({ context }) {
  if (!context) {
    return <div className="context-strip context-strip--empty">Waiting for context…</div>;
  }

  const { route, weather, hour } = context;
  const timeLabel = formatHour(hour);
  const weatherLabel = weather?.description ?? weather?.condition ?? "—";

  const parts = [];
  if (route?.etaMinutes) {
    parts.push(`${route.etaMinutes} min ETA`);
  } else {
    parts.push(timeLabel);
  }
  parts.push(weatherLabel);
  if (route?.trafficLevel && route.trafficLevel !== "unknown") {
    parts.push(`${capitalize(route.trafficLevel)} traffic`);
  }

  return (
    <div className="context-strip">
      <span className="context-strip__dot" />
      {parts.join(" · ")}
      <span className={`source-badge source-badge--${route?.source ?? "mock"}`}>
        {route?.source === "live" ? "live Maps data" : "simulated data"}
      </span>
    </div>
  );
}

function formatHour(hour) {
  if (hour === undefined || hour === null) return "";
  const h = ((hour + 11) % 12) + 1;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${h}:00 ${ampm}`;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
