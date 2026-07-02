// Vercel serverless entry point. vercel.json rewrites every /api/* request
// here explicitly (rather than relying on the [...slug] filesystem
// catch-all convention, which turned out not to match multi-segment paths
// like /api/vibe/options reliably on this deployment). Express does its own
// internal routing based on req.url, so no route duplication is needed here.
import app from "../server/src/index.js";

export default app;
