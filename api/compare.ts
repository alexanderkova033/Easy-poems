/**
 * Vercel serverless function — POST /api/compare
 *
 * Receives { title, lines, previousLines, previousScores } and asks the model
 * to analyse the current poem AND compare it to the previous version.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit } from "./_rate-limit";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `You are an encouraging poetry editor reviewing a revised poem.
You will receive TWO versions — the previous draft and the current draft — plus the previous scores.
Return valid JSON with this exact shape:

{
  "meta": { "model": "<model-id>", "analyzedAt": "<ISO-8601>" },
  "overall_score": <integer 1-100 for the CURRENT version>,
  "dimensions": {
    "imagery": <integer 1-100>,
    "musicality": <integer 1-100>,
    "originality": <integer 1-100>,
    "clarity": <integer 1-100>
  },
  "issues": [
    {
      "id": "issue-1",
      "line_start": <1-based int>,
      "line_end": <1-based int>,
      "excerpt": "<short quote, optional>",
      "rationale": "<polite, specific>",
      "improvements": ["<direction>"]
    }
  ],
  "comparison": {
    "summary": "<2-3 sentence overview of what changed overall>",
    "improvements": ["<specific thing that got better>"],
    "regressions": ["<specific thing that got worse, if any>"],
    "unchanged": ["<what stayed strong>"]
  }
}

Rules:
- Scores are for the CURRENT version, integers 1-100.
- improvements/regressions/unchanged: 1-4 items each, or empty arrays.
- issues: 3-6 most actionable, or fewer for strong poems.
- Return ONLY the JSON object, no markdown fences.`;

function numbered(lines: string[]): string {
  return lines.map((l, i) => `${i + 1}: ${l}`).join("\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const body = req.body as {
    title?: unknown;
    lines?: unknown;
    previousLines?: unknown;
    previousScores?: unknown;
    model?: unknown;
  };

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return res.status(400).json({ error: "Missing or empty `lines` array." });
  }
  if (!Array.isArray(body.previousLines) || body.previousLines.length === 0) {
    return res.status(400).json({ error: "Missing or empty `previousLines` array." });
  }

  const title = typeof body.title === "string" ? body.title : "";
  const lines = (body.lines as unknown[]).map((l) => String(l ?? ""));
  const prevLines = (body.previousLines as unknown[]).map((l) => String(l ?? ""));
  const model = typeof body.model === "string" ? body.model : "gpt-4o-mini";
  const prevScores = body.previousScores ?? null;

  const titlePart = title.trim() ? `Title: ${title.trim()}\n\n` : "";
  const prevScoreText = prevScores
    ? `\nPrevious scores: ${JSON.stringify(prevScores)}\n`
    : "";

  const userMessage = `${titlePart}=== PREVIOUS VERSION ===\n${numbered(prevLines)}\n${prevScoreText}\n=== CURRENT VERSION ===\n${numbered(lines)}`;

  let upstream: Response;
  try {
    upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 2400,
        temperature: 0.4,
      }),
    });
  } catch (err) {
    return res.status(502).json({ error: `Could not reach OpenAI: ${(err as Error).message}` });
  }

  if (!upstream.ok) {
    let msg = `OpenAI returned HTTP ${upstream.status}`;
    try {
      const errBody = (await upstream.json()) as { error?: { message?: string } };
      if (errBody?.error?.message) msg = errBody.error.message;
    } catch { /* ignore */ }
    return res.status(upstream.status === 429 ? 429 : 502).json({ error: msg });
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) {
    return res.status(502).json({ error: "Empty response from OpenAI." });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return res.status(502).json({ error: "OpenAI returned invalid JSON." });
  }

  (parsed as Record<string, unknown>).meta = {
    model: data.model ?? model,
    analyzedAt: new Date().toISOString(),
  };

  return res.status(200).json(parsed);
}
