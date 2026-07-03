// Wraps the Gemini API (generateContent, structured JSON output) to act as
// the app's actual "generative brain" — this is what AI Mode was missing
// before: everything else in this codebase (scenarioEngine.js, the regex
// parseCommand() in routes/assistant.js, preferenceTracker's getPatternHint)
// is deliberately simple rule-based logic. This service is the one place
// that calls a real LLM to reason over free-form conversation + context and
// decide mood/artists/destination, instead of matching fixed patterns.
//
// Docs: https://ai.google.dev/gemini-api/docs/text-generation
//       https://ai.google.dev/gemini-api/docs/structured-output
//
// Falls back to nothing on its own — callers (routes/brain.js) are
// responsible for catching failures and using the rule-based path instead,
// same "live falls back to mock/rules" philosophy as mapsService/youtubeService.

import fetch from "node-fetch";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.5-flash";
const REQUEST_TIMEOUT_MS = 8000; // fail fast into the rule-based fallback rather than hanging a serverless invocation

export function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

// The decision schema every chat turn must be returned as. `moodTags` is
// constrained to an enum built from the app's actual catalog tags (passed
// in per-call) so the model can't invent a mood that matches nothing in
// getMockCatalogByTags().
function buildDecisionSchema(allowedMoodTags) {
  return {
    type: "object",
    properties: {
      replyText: {
        type: "string",
        description:
          "A short, natural, conversational reply to the user (1-3 sentences) as the AI DJ brain of the app. Reference their message directly, be warm and a little proactive — you can suggest something they didn't explicitly ask for if it fits.",
      },
      moodTags: {
        type: "array",
        description:
          "1-4 mood/vibe tags picked from the allowed vocabulary that best match the user's message and context. Always include at least one even for small talk (infer a sensible default).",
        items: { type: "string", enum: allowedMoodTags },
        minItems: 1,
        maxItems: 4,
      },
      bpmMin: { type: "integer", description: "Lower bound of a sensible target BPM range for this mood.", minimum: 40, maximum: 200 },
      bpmMax: { type: "integer", description: "Upper bound of a sensible target BPM range for this mood.", minimum: 40, maximum: 200 },
      destination: {
        type: ["string", "null"],
        description: "A destination the user mentioned they're heading to, verbatim, or null if none was mentioned this turn.",
      },
      artists: {
        type: "array",
        description: "Specific artist names the user asked for or clearly implied, if any. Empty array if none.",
        items: { type: "string" },
      },
      reasoning: {
        type: "string",
        description: "One short sentence explaining WHY this mood/queue fits right now (time, weather, what was said, past pattern) — shown to the user as the mix rationale.",
      },
    },
    required: ["replyText", "moodTags", "bpmMin", "bpmMax", "destination", "artists", "reasoning"],
  };
}

/**
 * @param {{
 *   message: string,
 *   history: Array<{role: "user"|"assistant", text: string}>,
 *   systemContext: string,     // time/weather/pattern-history context, prose
 *   allowedMoodTags: string[], // vocabulary the model must pick moodTags from
 * }} params
 */
export async function chatDecision({ message, history = [], systemContext, allowedMoodTags }) {
  if (!isConfigured()) throw new Error("GEMINI_API_KEY not configured");

  const systemInstruction = {
    parts: [
      {
        text: [
          "You are the AI brain inside a YouTube-Music-style app's 'AI Mode' tab.",
          "You decide what music mood fits right now and hold a natural conversation about it — you are not a rigid command parser.",
          "You must always respond by filling out the JSON schema you've been given. Do not invent mood tags outside the allowed list.",
          systemContext,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  };

  const contents = [
    ...history.slice(-8).map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const body = {
    system_instruction: systemInstruction,
    contents,
    generationConfig: {
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema: buildDecisionSchema(allowedMoodTags),
        },
      },
      temperature: 0.9,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/models/${getModel()}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini API HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini API returned no content (possibly blocked by safety filters)");

    let decision;
    try {
      decision = JSON.parse(text);
    } catch {
      throw new Error("Gemini API returned non-JSON despite structured output schema");
    }

    // Basic shape guard — never trust an LLM's output blindly, even schema-constrained.
    if (!decision.replyText || !Array.isArray(decision.moodTags) || decision.moodTags.length === 0) {
      throw new Error("Gemini API response missing required fields");
    }

    const cleanTags = decision.moodTags.filter((t) => allowedMoodTags.includes(t)).slice(0, 4);
    if (cleanTags.length === 0) throw new Error("Gemini API returned no valid mood tags");

    return {
      replyText: String(decision.replyText),
      moodTags: cleanTags,
      bpmMin: Number.isFinite(decision.bpmMin) ? decision.bpmMin : 90,
      bpmMax: Number.isFinite(decision.bpmMax) ? decision.bpmMax : 120,
      destination: decision.destination || null,
      artists: Array.isArray(decision.artists) ? decision.artists.filter(Boolean) : [],
      reasoning: String(decision.reasoning || ""),
      source: "gemini",
    };
  } finally {
    clearTimeout(timeout);
  }
}
