// Implements Section 3.2 (Smart Time-Capping & Queue Calculation) and
// Section 3.3 (The "Clean Cut" Ending) from the product spec.

const CLEAN_CUT_BUFFER_SECONDS = 20; // reserved tolerance, spec 3.2 step 2
const CLEAN_CUT_WINDOW_SECONDS = 20; // "last 15-20s" boundary search window, spec 3.3 step 2

/**
 * Greedy bounded-fill queue builder with a Clean-Cut final track.
 *
 * @param {Array<{id,title,artist,durationSec}>} candidates - ranked pool
 * @param {number|null} etaSeconds - null means "no hard cap" (e.g. Night Drive)
 * @param {{ noRepeatArtistWindow?: number }} opts
 */
export function buildTimeCappedQueue(candidates, etaSeconds, opts = {}) {
  const noRepeatWindow = opts.noRepeatArtistWindow ?? 3;

  if (!etaSeconds) {
    // No fixed destination: use mood-continuity ordering only, no hard cap.
    // Spec 2, scenario 4: "queue instead uses mood-continuity rules".
    return {
      queue: candidates.slice(0, 8),
      totalDurationSec: candidates.slice(0, 8).reduce((a, t) => a + t.durationSec, 0),
      capped: false,
      cleanCut: null,
    };
  }

  const budget = Math.max(0, etaSeconds - CLEAN_CUT_BUFFER_SECONDS);
  let queue = [];
  let elapsed = 0;

  // Greedy fill, preferring artist variety — but a strict "no repeat in a
  // 3-track window" rule is mathematically impossible to satisfy once the
  // request only has 1-2 distinct artists (e.g. "play Atif Aslam and Sonu
  // Nigam"), which would otherwise silently under-fill the queue. So we
  // relax the window step by step (3 -> 2 -> 1/off) and keep whichever
  // pass filled the most time, rather than ever returning a starved queue.
  let best = { queue: [], elapsed: 0 };
  for (let window = noRepeatWindow; window >= 1; window--) {
    const attempt = greedyFill(candidates, budget, window);
    if (attempt.elapsed > best.elapsed) best = attempt;
    if (budget - attempt.elapsed < 30) break; // already filled close enough
  }
  queue = best.queue;
  elapsed = best.elapsed;

  const remaining = etaSeconds - elapsed;

  // Pick / trim the Clean-Cut final track from whatever's left in candidates
  // (not already queued) that best fits the remaining time.
  const alreadyQueued = new Set(queue.map((t) => t.id));
  const finalCandidates = candidates.filter((t) => !alreadyQueued.has(t.id));

  const cleanCut = selectCleanCutTrack(finalCandidates, remaining);
  if (cleanCut) {
    queue.push(cleanCut.track);
    elapsed += cleanCut.playSeconds;
  }

  return {
    queue,
    totalDurationSec: elapsed,
    capped: true,
    etaSeconds,
    cleanCut: cleanCut
      ? {
          trackId: cleanCut.track.id,
          fullDurationSec: cleanCut.track.durationSec,
          playSeconds: cleanCut.playSeconds,
          trimmed: cleanCut.trimmed,
          boundaryType: cleanCut.boundaryType,
        }
      : null,
  };
}

// Single greedy pass at a given no-repeat-artist window size.
function greedyFill(candidates, budget, window) {
  const queue = [];
  let elapsed = 0;
  const recentArtists = [];
  for (const track of candidates) {
    if (elapsed + track.durationSec > budget) continue; // would overshoot the budget
    if (window > 1 && recentArtists.slice(-window + 1).includes(track.artist)) continue;
    queue.push(track);
    recentArtists.push(track.artist);
    elapsed += track.durationSec;
    if (budget - elapsed < 30) break; // close enough, stop this pass
  }
  return { queue, elapsed };
}

/**
 * Chooses the best "last track" and how it should end.
 * Real production logic would use licensed chorus/verse timestamps or an
 * ML structure model; this uses a documented heuristic (see spec 3.3 note)
 * that treats the final CLEAN_CUT_WINDOW_SECONDS of a track as its "outro"
 * and prefers a track whose *outro start* lines up with the remaining time.
 */
function selectCleanCutTrack(candidates, remainingSeconds) {
  if (remainingSeconds <= 5 || candidates.length === 0) return null;

  // Prefer a track that fits entirely within remaining time (natural ending, no trim),
  // picking whichever fitting track leaves the smallest gap to the ETA.
  const exactFit = candidates
    .filter((t) => t.durationSec <= remainingSeconds)
    .sort((a, b) => (remainingSeconds - a.durationSec) - (remainingSeconds - b.durationSec))[0];

  if (exactFit && remainingSeconds - exactFit.durationSec <= CLEAN_CUT_WINDOW_SECONDS) {
    return { track: exactFit, playSeconds: exactFit.durationSec, trimmed: false, boundaryType: "natural-end" };
  }
  if (exactFit) {
    return { track: exactFit, playSeconds: exactFit.durationSec, trimmed: false, boundaryType: "natural-end-early" };
  }

  // No track fits fully: trim a longer track to a faded outro boundary near
  // the remaining time budget. Candidates arrive pre-sorted by mood
  // relevance (see scenarioEngine/getMockCatalogByTags), so we take the
  // first (most relevant) one rather than the globally shortest track —
  // ending a calm commute mix on a snippet of an unrelated high-energy
  // track would be a worse experience than a slightly longer trim of a
  // track that actually matches the scenario's mood.
  const closest = candidates[0];
  if (!closest) return null;

  const playSeconds = Math.max(10, Math.min(closest.durationSec, remainingSeconds));
  return { track: closest, playSeconds, trimmed: true, boundaryType: "faded-outro" };
}

/**
 * Re-sync hook: call when Maps pushes an updated ETA mid-session.
 * Recomputes the queue for whatever time remains, preserving already
 * fully-played tracks (caller passes only the still-relevant candidates).
 */
export function resyncQueue(remainingCandidates, newRemainingEtaSeconds, opts) {
  return buildTimeCappedQueue(remainingCandidates, newRemainingEtaSeconds, opts);
}
