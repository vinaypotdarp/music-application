# AI Mode in n8n — no Google billing required

This is a parallel implementation of the context + voice-assistant logic as
n8n workflows, built specifically to route around the Google Cloud Platform
billing wall (Google Maps Platform requires a linked payment method before
it'll issue Routes/Weather API responses, even on the free tier — that's
what you were stuck on).

Instead, these workflows use APIs that need **no credit card and no Google
Cloud Console at all**:

| Piece | Service | Key needed? | Notes |
|---|---|---|---|
| Weather | [Open-Meteo](https://open-meteo.com) | No | Free, no signup, real live data |
| Routing / ETA | [OSRM demo server](https://project-osrm.org) | No | Free, no signup. Gives real drive-time estimates but **no live traffic** (see caveat below) |
| Geocoding (assistant only) | [Nominatim](https://nominatim.org) (OpenStreetMap) | No | Free, no signup, rate-limited to ~1 req/sec |
| Songs | Embedded mock catalog inside the workflow | — | Same idea as the Node backend's mock catalog — swap in YouTube Data API v3 later if you want (that one's free too, no billing, just a 5-minute key — see `../SETUP.md` section 2 only) |

**Honest caveat:** OSRM's public demo gives a realistic drive-time estimate
but not real-time traffic conditions (Google's Routes API does; this doesn't).
For a prototype/demo this is a fine trade-off to make the whole thing work
without a credit card. The `trafficLevel` field is labeled `"estimated"` in
the response so it's never presented as more precise than it is.

## What's in this folder

- `ai-mode-context.json` — implements the same thing as `POST /api/context`
  in the Node backend: takes origin/destination/time/scenario hints, calls
  Open-Meteo + OSRM, classifies the scenario, builds a time-capped queue.
- `ai-mode-assistant.json` — implements `POST /api/assistant/command`: parses
  a spoken-style command ("I'm going to X... play songs by A and B"),
  geocodes the destination via Nominatim, gets a real ETA from OSRM (falling
  back to the spoken ETA if geocoding/routing doesn't resolve), builds the
  artist-based time-capped queue.

Both were hand-built as importable n8n workflow JSON. I can't execute n8n
myself to test them end-to-end, so if a node shows a red error after import,
it's most likely a small expression/field-name mismatch for your n8n
version — the visual editor makes those easy to spot and fix (each node's
purpose is documented below so you know what it's *supposed* to do).

## Importing

1. Open your n8n instance (see "About your account" below if you're not
   sure whether it's Cloud or self-hosted).
2. Create a **New Workflow**.
3. Top-right menu (**⋯**) → **Import from File** → select
   `ai-mode-context.json`. Repeat with a second new workflow for
   `ai-mode-assistant.json`.
4. Open each workflow and click **Save**.
5. Click the **Webhook** node (first node) → you'll see a **Test URL** and,
   once you toggle the workflow **Active**, a **Production URL**. Copy
   whichever one you're using.

## About your account

Since you said you just made an account and aren't sure if it's Cloud — log
into **n8n.io**, and check the URL after logging in:
- If it's something like `https://yourname.app.n8n.cloud/...` → you're on
  **n8n Cloud**, nothing to install, just import the workflows above.
- If you were following a self-hosting guide (Docker/npm) and haven't
  finished it → you don't have a running instance yet; n8n Cloud is the
  faster path to "something I can test today" since it needs zero local setup.

## Testing it

**Context workflow** — example matching the Morning Rush scenario from the
product spec (Sector 38 → Cyber City, Gurgaon):

```bash
curl -X POST "<YOUR_WEBHOOK_URL>/ai-mode-context" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": { "lat": 28.4501, "lng": 77.0402 },
    "destination": { "lat": 28.4950, "lng": 77.0890 },
    "destinationLabel": "Cyber City",
    "originLabel": "Sector 38",
    "timeOfDayOverride": "morning",
    "routeType": "commute"
  }'
```

Try the other 4 scenarios by changing coordinates/labels/`routeType`
(`fitness_outbound`, `fitness_return`, `leisure_undetermined`, `tourist`) and
`timeOfDayOverride` (`morning`, `evening`, `late_night`) — see
`../docs/YouTube_Music_AI_Mode_Spec.md` Section 2 for what each scenario
expects. Omit `destination` entirely to test the no-ETA Night Drive path.

**Assistant workflow** — the exact example from the brief:

```bash
curl -X POST "<YOUR_WEBHOOK_URL>/ai-mode-assistant" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I'\''m going to Raj'\''s place, Maps shows a 45-minute drive. Play songs by Atif Aslam and Sonu Nigam.",
    "lat": 28.4595,
    "lng": 77.0266
  }'
```

(Since "Raj's place" isn't a real geocodable address, this will fall back to
the spoken 45-minute ETA — that's expected and matches the same fallback
behavior the Node backend uses.)

## If you want this wired into the web app frontend

Right now the React app (`../web`) talks to the Node backend (`../server`)
by default — that one already works with zero setup via its built-in mock
data, so it's the fastest way to see the whole AI Tab UI today. Pointing the
frontend at these n8n webhooks instead is a small, doable follow-up (mainly
renaming a couple of URLs in `web/src/api.js`) — say the word and I'll wire
it up once you've confirmed the workflows run cleanly in your n8n editor.
