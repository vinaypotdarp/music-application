const BASE = "/api";

async function jsonFetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${url} -> ${res.status}: ${body}`);
  }
  return res.json();
}

export function getHealth() {
  return jsonFetch(`${BASE}/health`);
}

export function getDemoScenarios() {
  return jsonFetch(`${BASE}/demo-scenarios`);
}

export function postContext(payload) {
  return jsonFetch(`${BASE}/context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function postAssistantCommand(payload) {
  return jsonFetch(`${BASE}/assistant/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function postBehaviorSkip(payload) {
  return jsonFetch(`${BASE}/behavior/skip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getBehaviorOffset(userId, trackId) {
  return jsonFetch(`${BASE}/behavior/offset/${encodeURIComponent(userId)}/${encodeURIComponent(trackId)}`);
}

export function getVibeOptions() {
  return jsonFetch(`${BASE}/vibe/options`);
}

export function postVibe(payload) {
  return jsonFetch(`${BASE}/vibe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function postBrainChat(payload) {
  return jsonFetch(`${BASE}/brain/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
