# AI Mode — YouTube Music Concept Prototype

A working prototype of the "AI Mode" product spec: a context-aware AI Tab that
blends Google Maps (destination/traffic), Google Weather, and device time into
scenario-based playlist curation, plus a conversational voice assistant with
time-capped, "clean cut" queueing, and per-track micro-behavioral trimming.

The full product spec (architecture, scenario matrix, assistant logic, UX
flow) is in [`docs/YouTube_Music_AI_Mode_Spec.md`](docs/YouTube_Music_AI_Mode_Spec.md).

## Important: what's real vs. simulated

YouTube Music has no public API for third-party playback control, so this
prototype is a **standalone web app** that implements the same logic, not a
patch to the real YouTube Music app. Two data sources plug into real Google
APIs when you add keys; everything works with **zero keys** using built-in
mock data so you can try it immediately:

| Piece | Without API keys | With API keys |
|---|---|---|
| Destination / ETA / traffic | Simulated per scenario | Real Google Maps Routes API |
| Weather | Simulated per scenario | Real Google Weather API |
| Song search & metadata | Small built-in mock catalog | Real YouTube Data API v3 search |
| Actual audio playback | Simulated progress bar (no audio file) | Real YouTube video embed |
| AI Brain chat (mood/artist/destination understanding) | Regex + if/else rules (`scenarioEngine.js`, `parseCommand()`) | Real Gemini model call (`geminiService.js`), same UI either way — see `docs/` note below |

Even with all keys configured, "queue trimming"/seek control only works for
the simulated tracks in this prototype, because the YouTube IFrame player
doesn't expose the kind of fine-grained structural (chorus/verse) data the
spec's Clean-Cut algorithm assumes — see `docs/YouTube_Music_AI_Mode_Spec.md`
Section 1.4 for the full explanation.

## Default flow: chat with the AI Brain

The app opens straight into a chat (`web/src/components/AIChat.jsx` →
`POST /api/brain/chat`, handled by `server/src/routes/brain.js`). You type or
speak naturally — "rainy evening, feeling nostalgic", "heading to Raj's
place, play Atif Aslam", "surprise me" — and a real Gemini model
(`server/src/services/geminiService.js`) decides the mood, BPM range,
artists, and destination from the conversation, then the existing
queue-building pipeline (mood tags → catalog/YouTube search → time-capped
queue) runs exactly as before.

If `GEMINI_API_KEY` isn't set, or the Gemini call fails for any reason
(quota, network, bad output), `brain.js` **silently falls back** to the
original rule-based logic — the same regex `parseCommand()` and if/else
`scenarioEngine.js` this project started with — so the chat never breaks.
Every reply says which path answered (visible as a small "rule-based
fallback" tag in the chat), same transparency principle as the existing
live-vs-mock badges for Maps/YouTube.

Every pick is logged per user (`server/src/services/preferenceTracker.js`,
persisted to `server/data/vibe-log.json`) and fed back into the system
prompt as history context, so the model can reference your patterns
("you've leaned Chill on rainy evenings before") directly in conversation.

The original weather+vibe picker, Maps/Weather-driven Scenario Simulator,
Live mode, and the old regex-only voice assistant still exist — they're now
tucked under "Advanced: manual picker & legacy tools" below the chat, for
testing or if you want the deterministic zero-model path.

## Project structure

```
music application/
├── docs/
│   └── YouTube_Music_AI_Mode_Spec.md   ← full product spec
├── server/                              ← Node/Express backend
│   └── src/
│       ├── services/                    ← mapsService, weatherService, youtubeService,
│       │                                   scenarioEngine, queueBuilder, behaviorTracker
│       └── routes/                      ← /api/context, /api/assistant, /api/behavior
├── web/                                  ← React (Vite) frontend — the AI Tab UI
├── SETUP.md                              ← step-by-step API key setup guide
└── README.md
```

## Running it (you'll need Node.js 18+ installed)

**1. Backend**
```bash
cd server
npm install
cp .env.example .env      # then optionally fill in API keys — see SETUP.md
npm run dev
```
Runs on http://localhost:8787. Visit `http://localhost:8787/api/health` to
confirm it's up and see which keys (if any) it detected.

**2. Frontend** (in a second terminal)
```bash
cd web
npm install
npm run dev
```
Runs on http://localhost:5173 and proxies `/api` calls to the backend.

**3. Open the app** at http://localhost:5173 and try the **Scenario
Simulator** buttons — they reproduce the exact 5 scenarios from the product
spec (Morning Rush, Rainy Wind-Down, Fitness Loop x2, Night Drive x2, Tourist
Mode). Try the **voice assistant** text box with the example command from the
spec: *"I'm going to Raj's place, Maps shows a 45-minute drive. Play songs by
Atif Aslam and Sonu Nigam."*

## Adding real API keys

See [`SETUP.md`](SETUP.md) for the full walkthrough. Short version: get a
Google Maps Platform API key (Routes + Geocoding + Weather APIs) and a
YouTube Data API v3 key from Google Cloud Console, put them in
`server/.env`, restart the backend, and the health badges in the UI will
flip from "mock" to "live".

**Stuck on the Google Cloud billing step?** Google Maps Platform requires a
linked payment method even for free-tier usage, which is a common blocker.
[`n8n/README.md`](n8n/README.md) has a parallel implementation of the same
context + assistant logic as importable n8n workflows, using Open-Meteo and
OSRM/Nominatim instead — all free, real, and require no credit card or
Google Cloud Console at all.

## What's next (not built yet)

- Mobile app shell (React Native) — the backend API is already
  platform-agnostic, so it can serve a mobile client without changes.
- Real recurring-route detection (currently the demo uses explicit scenario
  triggers rather than inferring "this is your usual commute" from history).
- Licensed audio-structure metadata for a true chorus/verse-aware Clean-Cut
  trim (current trim logic uses a documented heuristic — see
  `queueBuilder.js`).
