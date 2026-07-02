import { Router } from "express";
import { recordSkip, clearTrim, getAutoStartOffset, getDebugEntry } from "../services/behaviorTracker.js";

const router = Router();

// POST /api/behavior/skip { userId, trackId, skippedToSeconds }
router.post("/skip", (req, res) => {
  const { userId, trackId, skippedToSeconds } = req.body ?? {};
  if (!userId || !trackId || skippedToSeconds === undefined) {
    return res.status(400).json({ error: "userId, trackId, skippedToSeconds are required" });
  }
  const entry = recordSkip(userId, trackId, Number(skippedToSeconds));
  res.json({ entry });
});

// POST /api/behavior/reset { userId, trackId }
router.post("/reset", (req, res) => {
  const { userId, trackId } = req.body ?? {};
  clearTrim(userId, trackId);
  res.json({ ok: true });
});

// GET /api/behavior/offset/:userId/:trackId
router.get("/offset/:userId/:trackId", (req, res) => {
  const { userId, trackId } = req.params;
  const offsetSec = getAutoStartOffset(userId, trackId);
  res.json({ offsetSec });
});

// GET /api/behavior/debug/:userId/:trackId
router.get("/debug/:userId/:trackId", (req, res) => {
  const { userId, trackId } = req.params;
  res.json({ entry: getDebugEntry(userId, trackId) });
});

export default router;
