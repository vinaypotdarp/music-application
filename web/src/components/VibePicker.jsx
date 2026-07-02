import React, { useEffect, useState } from "react";
import { getVibeOptions, postVibe } from "../api.js";

const WEATHER_EMOJI = {
  sunny: "☀️",
  rain: "🌧️",
  cloudy: "☁️",
  clear_night: "🌙",
};

export default function VibePicker({ userId, onResult, compact, onCancel }) {
  const [weatherOptions, setWeatherOptions] = useState([]);
  const [vibeOptions, setVibeOptions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [vibe, setVibe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getVibeOptions()
      .then((d) => {
        setWeatherOptions(d.weatherOptions);
        setVibeOptions(d.vibeOptions);
      })
      .catch(() => setError("Could not reach the backend. Is `npm run dev` running in /server?"));
  }, []);

  async function submit() {
    if (!weather || !vibe) return;
    setLoading(true);
    setError(null);
    try {
      const result = await postVibe({ userId, weather, vibe });
      onResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`vibe-picker ${compact ? "vibe-picker--compact" : ""}`}>
      {!compact && (
        <>
          <div className="vibe-picker__title">What's the weather? What's your vibe?</div>
          <p className="vibe-picker__hint">
            For now you tell the app directly — no location or weather API needed. Every pick you
            make is quietly logged per-user so a real personalization layer can learn your patterns
            later.
          </p>
        </>
      )}

      <div className="vibe-picker__section">
        <div className="vibe-picker__label">Weather</div>
        <div className="vibe-picker__chips">
          {weatherOptions.map((w) => (
            <button
              key={w.key}
              className={`chip-btn ${weather === w.key ? "chip-btn--active" : ""}`}
              onClick={() => setWeather(w.key)}
            >
              {WEATHER_EMOJI[w.key] ?? ""} {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="vibe-picker__section">
        <div className="vibe-picker__label">Vibe</div>
        <div className="vibe-picker__chips">
          {vibeOptions.map((v) => (
            <button
              key={v.key}
              className={`chip-btn ${vibe === v.key ? "chip-btn--active" : ""}`}
              onClick={() => setVibe(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="vibe-picker__actions">
        <button className="vibe-picker__submit" disabled={!weather || !vibe || loading} onClick={submit}>
          {loading ? "Building your mix…" : "Get my mix"}
        </button>
        {compact && onCancel && (
          <button className="vibe-picker__ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
