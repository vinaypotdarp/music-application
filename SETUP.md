# API Key Setup Guide

You need two separate keys. Both are created in the same place (Google Cloud
Console) but under different projects/APIs. Budget about 15 minutes total.
This has to be done by you directly — it involves your Google account and
(for the Maps key) a billing/payment method, so it isn't something that can
be done on your behalf.

---

## 1. Google Maps Platform key (Routes, Geocoding, Weather)

**Covers:** ETA + traffic (Routes API), destination lookup (Geocoding API),
real-time conditions (Weather API). One key works across all three.

1. Go to **console.cloud.google.com** and sign in.
2. Click **New Project** (top right) → name it e.g. "ai-mode-prototype" → **Create**.
3. Open the left menu (☰) → **Billing** → link or create a billing account
   and add a payment method. This is required to use Maps Platform APIs at
   all, even the free tier — Google won't charge you unless you exceed the
   free monthly quota.
4. Left menu → **APIs & Services → Library**. Search for and click **Enable**
   on each of:
   - **Routes API**
   - **Geocoding API**
   - **Weather API**
5. Left menu → **APIs & Services → Credentials** → **Create Credentials →
   API key**. Copy the key.
6. Click the key to edit it → under **API restrictions**, choose "Restrict
   key" and select the three APIs above (don't leave it unrestricted).
7. Paste it into `server/.env` as `GOOGLE_MAPS_API_KEY=...`

**Free tier / cost:** Weather API gives 10,000 calls/month free, then
$0.15 per 1,000 calls. Routes and Geocoding APIs have their own separate
free monthly credits under the same Maps Platform billing account. For this
prototype's usage (a handful of manual test calls), you will not be
charged.

---

## 2. YouTube Data API v3 key (song search/metadata)

**Covers:** searching real YouTube tracks by mood/artist and pulling their
duration for the queue builder. No billing required for this one.

1. In the same or a new Cloud Console project, go to **APIs & Services →
   Library**, search **"YouTube Data API v3"**, click **Enable**.
2. **APIs & Services → Credentials → Create Credentials → API key**. Copy it.
3. Click the key → **API restrictions** → restrict it to "YouTube Data API v3" only.
4. Paste it into `server/.env` as `YOUTUBE_API_KEY=...`

**Quota:** 10,000 units/day, free, resets midnight Pacific Time. A single
search call costs 100 units, so roughly 100 searches/day before you hit the
ceiling — plenty for demoing, not enough for production traffic without
requesting a quota increase from Google.

---

## 3. Verify it worked

```bash
cd server
npm install
npm run dev
```

Visit `http://localhost:8787/api/health` — you should see
`"mapsKeyConfigured": true` and `"youtubeKeyConfigured": true`. In the web
app, the status badges next to the AI Tab will switch from amber ("mock") to
green ("live").

If a key is misconfigured or a call fails for any reason, the backend
automatically falls back to mock data rather than crashing — check the
server terminal log for a `[serviceName] live call failed, falling back to
mock: ...` line to see what went wrong.
