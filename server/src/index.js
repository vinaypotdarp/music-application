import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import contextRouter from "./routes/context.js";
import assistantRouter from "./routes/assistant.js";
import behaviorRouter from "./routes/behavior.js";
import vibeRouter from "./routes/vibe.js";
import { DEMO_SCENARIOS } from "./data/mockData.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    mapsKeyConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    youtubeKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY),
    forceMock: String(process.env.FORCE_MOCK).toLowerCase() === "true",
  });
});

app.get("/api/demo-scenarios", (req, res) => {
  res.json({ scenarios: DEMO_SCENARIOS });
});

app.use("/api/context", contextRouter);
app.use("/api/assistant", assistantRouter);
app.use("/api/behavior", behaviorRouter);
app.use("/api/vibe", vibeRouter);

const port = process.env.PORT || 8787;

// On Vercel this module is imported by api/[...slug].js as a serverless
// function handler — app.listen() must not run there (no persistent port).
// Locally (start-dev.bat / npm run dev) VERCEL is unset, so this runs as normal.
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`AI Mode server listening on http://localhost:${port}`);
    console.log(
      process.env.GOOGLE_MAPS_API_KEY
        ? "Google Maps/Weather: LIVE key detected"
        : "Google Maps/Weather: no key found — using mock data"
    );
    console.log(
      process.env.YOUTUBE_API_KEY
        ? "YouTube Data API: LIVE key detected"
        : "YouTube Data API: no key found — using mock catalog"
    );
  });
}

export default app;
