// Vercel serverless entry point. The [...slug] filename is Vercel's
// catch-all convention — this one function handles every request under
// /api/* (health, vibe, context, assistant, behavior, demo-scenarios) by
// simply handing them to the existing Express app, unmodified. Express
// does its own internal routing based on req.url, so no route duplication
// is needed here.
import app from "../server/src/index.js";

export default app;
