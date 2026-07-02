import React, { useEffect, useRef, useState } from "react";
import { postBehaviorSkip, getBehaviorOffset } from "../api.js";

const USER_ID = "demo-user";

export default function NowPlaying({ queueResult }) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [skipCount, setSkipCount] = useState({});
  const [autoTrimmed, setAutoTrimmed] = useState({});
  const tickRef = useRef(null);

  const queue = queueResult?.queue ?? [];
  const track = queue[index];
  const isCleanCutTrack = queueResult?.cleanCut && track?.id === queueResult.cleanCut.trackId;
  const playSeconds = isCleanCutTrack ? queueResult.cleanCut.playSeconds : track?.durationSec ?? 0;

  // Reset to the top of a new queue whenever it changes.
  useEffect(() => {
    setIndex(0);
    setElapsed(0);
    setIsPlaying(false);
  }, [queueResult]);

  // Apply any learned micro-trim offset when a track starts.
  useEffect(() => {
    if (!track) return;
    let cancelled = false;
    getBehaviorOffset(USER_ID, track.id)
      .then(({ offsetSec }) => {
        if (!cancelled && offsetSec > 0) {
          setElapsed(offsetSec);
          setAutoTrimmed((prev) => ({ ...prev, [track.id]: offsetSec }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  useEffect(() => {
    clearInterval(tickRef.current);
    if (!isPlaying || !track) return;
    tickRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= playSeconds) {
          clearInterval(tickRef.current);
          goNext();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, track?.id, playSeconds]);

  function goNext() {
    setElapsed(0);
    setIsPlaying(false);
    setIndex((i) => Math.min(i + 1, queue.length - 1));
  }

  function simulateIntroSkip() {
    if (!track) return;
    const skippedTo = 18; // matches the "first 20 seconds" pattern from the spec
    setElapsed(skippedTo);
    postBehaviorSkip({ userId: USER_ID, trackId: track.id, skippedToSeconds: skippedTo })
      .then(() => {
        setSkipCount((prev) => {
          const count = (prev[track.id] ?? 0) + 1;
          if (count >= 3) {
            setAutoTrimmed((at) => ({ ...at, [track.id]: skippedTo }));
          }
          return { ...prev, [track.id]: count };
        });
      })
      .catch(() => {});
  }

  if (!track) {
    return <div className="now-playing now-playing--empty">No queue yet — run a scenario above.</div>;
  }

  const pct = Math.min(100, Math.round((elapsed / Math.max(1, playSeconds)) * 100));
  const isNearEnd = isCleanCutTrack && playSeconds - elapsed <= 20 && isPlaying;

  return (
    <div className="now-playing">
      <div className="now-playing__header">
        <div>
          <div className="now-playing__title">{track.title}</div>
          <div className="now-playing__artist">{track.artist}</div>
        </div>
        <div className="now-playing__index">
          {index + 1} / {queue.length}
        </div>
      </div>

      {track.source === "youtube" ? (
        <iframe
          className="now-playing__iframe"
          src={`https://www.youtube.com/embed/${track.id}?autoplay=${isPlaying ? 1 : 0}`}
          title={track.title}
          allow="autoplay; encrypted-media"
        />
      ) : (
        <div className="now-playing__simulated">
          <div className="now-playing__simulated-badge">Simulated playback — no real audio (mock catalog)</div>
        </div>
      )}

      <div className="now-playing__progress-row">
        <span>{formatTime(elapsed)}</span>
        <div className="now-playing__progress-bar">
          <div className="now-playing__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span>{formatTime(playSeconds)}</span>
      </div>

      {isNearEnd && (
        <div className="now-playing__cleancut-badge">
          Clean-Cut Ending engaging — fading out at the nearest natural boundary as you arrive
        </div>
      )}
      {isCleanCutTrack && queueResult.cleanCut.trimmed && (
        <div className="now-playing__cleancut-badge now-playing__cleancut-badge--trim">
          This track is trimmed from {formatTime(track.durationSec)} to end exactly on arrival
        </div>
      )}

      <div className="now-playing__controls">
        <button onClick={() => setIsPlaying((p) => !p)}>{isPlaying ? "Pause" : "Play"}</button>
        <button onClick={goNext} disabled={index >= queue.length - 1}>
          Skip →
        </button>
        <button onClick={simulateIntroSkip} className="now-playing__ghost-btn">
          Simulate intro-skip
        </button>
      </div>

      {autoTrimmed[track.id] !== undefined && (
        <div className="now-playing__learned-badge">
          Micro-trim learned for this track — auto-starts at {formatTime(autoTrimmed[track.id])}
        </div>
      )}
      {skipCount[track.id] > 0 && skipCount[track.id] < 3 && (
        <div className="now-playing__hint">
          Intro-skip pattern: {skipCount[track.id]}/3 — one more consistent skip auto-learns this trim
        </div>
      )}

      <div className="now-playing__queue-list">
        {queue.map((t, i) => (
          <div
            key={t.id}
            className={`queue-row ${i === index ? "queue-row--active" : ""}`}
            onClick={() => {
              setIndex(i);
              setElapsed(0);
              setIsPlaying(false);
            }}
          >
            <span>{t.title}</span>
            <span className="queue-row__meta">
              {t.artist} · {formatTime(t.durationSec)}
              {queueResult.cleanCut?.trackId === t.id ? " · clean-cut" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(sec) {
  const s = Math.max(0, Math.round(sec ?? 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
