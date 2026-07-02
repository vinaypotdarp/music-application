import React, { useEffect, useState } from "react";
import { getDemoScenarios, getHealth, postContext } from "../api.js";
import ContextStrip from "./ContextStrip.jsx";
import ScenarioCard from "./ScenarioCard.jsx";
import ScenarioSimulator from "./ScenarioSimulator.jsx";
import NowPlaying from "./NowPlaying.jsx";
import VoiceAssistant from "./VoiceAssistant.jsx";
import VibePicker from "./VibePicker.jsx";

const USER_ID = "demo-user";

export default function AITab() {
  const [scenarios, setScenarios] = useState([]);
  const [health, setHealth] = useState(null);
  const [result, setResult] = useState(null); // { context, scenario, queue, patternHint? }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDemoScenarios()
      .then((d) => setScenarios(d.scenarios))
      .catch(() => setError("Could not reach the backend. Is `npm run dev` running in /server?"));
    getHealth()
      .then(setHealth)
      .catch(() => {});
  }, []);

  async function runScenario(payload) {
    setLoading(true);
    setError(null);
    try {
      const data = await postContext(payload);
      setResult({ ...data, patternHint: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function runLiveMode(destinationAddress) {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        runScenario({
          origin: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          destinationAddress,
        });
      },
      (err) => {
        setError(`Location permission denied: ${err.message}`);
        setLoading(false);
      }
    );
  }

  function applyAssistantQueue(queue) {
    setResult((prev) => ({
      context: prev?.context ?? null,
      scenario: prev?.scenario ?? { label: "Voice Request", rationale: "Built from your spoken command.", moodTags: [] },
      queue,
      patternHint: null,
    }));
  }

  // Primary flow: nothing picked yet -> full-size weather+vibe picker only.
  if (!result) {
    return (
      <div className="ai-tab">
        {error && <div className="error-banner">{error}</div>}
        <VibePicker userId={USER_ID} onResult={setResult} />
      </div>
    );
  }

  return (
    <div className="ai-tab">
      <div className="ai-tab__status">
        {health && (
          <>
            <span className={`badge ${health.mapsKeyConfigured ? "badge--live" : "badge--mock"}`}>
              Maps/Weather: {health.mapsKeyConfigured ? "live" : "mock"}
            </span>
            <span className={`badge ${health.youtubeKeyConfigured ? "badge--live" : "badge--mock"}`}>
              YouTube: {health.youtubeKeyConfigured ? "live" : "mock"}
            </span>
          </>
        )}
        <button className="ai-tab__new-vibe" onClick={() => setResult(null)}>
          🔄 Pick a different vibe
        </button>
      </div>

      <ContextStrip context={result?.context} />

      {result?.patternHint && <div className="pattern-hint">🧠 {result.patternHint}</div>}

      <ScenarioCard scenario={result?.scenario} />

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading-banner">Fetching context and building your queue…</div>}

      <NowPlaying queueResult={result?.queue} />

      <VoiceAssistant onQueueReady={applyAssistantQueue} />

      <details className="advanced-section">
        <summary>Advanced: Scenario Simulator (uses Maps/Weather APIs)</summary>
        <ScenarioSimulator scenarios={scenarios} onRun={runScenario} onLiveMode={runLiveMode} loading={loading} />
      </details>
    </div>
  );
}
