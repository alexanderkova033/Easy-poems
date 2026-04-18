/**
 * Vercel serverless function — POST /api/analyze
 *
 * Receives { title, lines } from the browser, forwards to OpenAI, and returns
 * the analysis JSON.  The OPENAI_API_KEY env-var lives only on the server;
 * the browser never sees it.
 *
 * Runtime: Node.js (Vercel default for TypeScript in /api)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit } from "./_rate-limit";
import { callOpenAI, sendParsedResponse } from "./_openai";

const SYSTEM_PROMPT = `You are a skilled, encouraging poetry editor. Analyze the poem and return valid JSON with this exact shape:
{
  "meta": { "model": "<model-id>", "analyzedAt": "<ISO-8601>" },
  "overall_score": <integer 1-100>,
  "summary": "<2-3 sentences: an honest, specific overall impression of the poem as a whole — what it achieves, what mood or effect it creates, and the single most important direction for improvement>",
  "dimensions": {
    "imagery": <integer 1-100>,
    "musicality": <integer 1-100>,
    "originality": <integer 1-100>,
    "clarity": <integer 1-100>
  },
  "issues": [
    {
      "id": "issue-1",
      "severity": "<high|medium|low>",
      "line_start": <1-based integer>,
      "line_end": <1-based integer>,
      "excerpt": "<short quote, optional>",
      "problem_words": ["<specific weak word or phrase>"],
      "rationale": "<polite, specific reason — mention the exact words or phrases that are weak when relevant>",
      "improvements": ["<direction 1>", "<optional direction 2>"]
    }
  ]
}
Rules:
- Scores are integers 1-100.
- summary: always present, 2-3 sentences, honest and specific — not generic praise.
- Limit issues to the 3-6 most actionable ones; fewer is fine for strong poems.
- severity: "high" = significantly hurts the poem, "medium" = noticeable flaw, "low" = minor polish.
- problem_words: 0-3 specific words or short phrases from the line that are weak (clichés, vague words, rhythm breakers). Omit the field if no specific words stand out.
- improvements: 1-3 strings per issue.
- line_start / line_end are 1-based indexes into the numbered lines you receive.
- Return ONLY the JSON object, no markdown fences.`;

function buildPrompt(title: string, lines: string[]): string {
  const titlePart = title.trim() ? `Title: ${title.trim()}\n\n` : "";
  const numbered = lines.map((l, i) => `${i + 1}: ${l}`).join("\n");
  return `${titlePart}${numbered}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkRateLimit(req.headers["x-forwarded-for"])) {
    return res.status(429).json({ error: "Too many requests — please wait a moment before analyzing again." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is not configured with an OpenAI API key." });
  }

  const body = req.body as { title?: unknown; lines?: unknown; model?: unknown };

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return res.status(400).json({ error: "Missing or empty `lines` array in request body." });
  }

  const title = typeof body.title === "string" ? body.title : "";
  const lines = (body.lines as unknown[]).map((l) => String(l ?? ""));
  const model = typeof body.model === "string" ? body.model : "gpt-4o-mini";

  const MAX_LINES = 500;
  if (lines.length > MAX_LINES) {
    return res.status(400).json({ error: `Too many lines (max ${MAX_LINES}).` });
  }

  const result = await callOpenAI(
    apiKey,
    {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(title, lines) },
      ],
      max_tokens: 2000,
      temperature: 0.4,
    },
    res,
  );
  if (!result) return;

  sendParsedResponse(res, result.content, result.model);
}
