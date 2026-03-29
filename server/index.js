import "dotenv/config";
import cors from "cors";
import express from "express";
import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const PORT = Number(process.env.PORT ?? 8787);
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const MAX_BODY = "256kb";

const app = express();
app.use(express.json({ limit: MAX_BODY }));
app.use(
  cors(
    CORS_ORIGIN
      ? { origin: CORS_ORIGIN, methods: ["POST", "GET"] }
      : { origin: true }
  )
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildPoemPrompt(title, lines) {
  const numbered = lines
    .map((line, i) => `${i + 1}: ${line}`)
    .join("\n");
  const head = title?.trim() ? `Title: ${title.trim()}\n\n` : "";
  return `${head}Poem lines (1-based line numbers):\n${numbered}`;
}

const SYSTEM = `You are a poetry editor. Be polite and direct: respectful, workshop-clear, no filler.

Analyze the poem you receive. Respond with ONLY a single JSON object (no markdown, no code fences) using this exact structure:
{
  "overall_score": <integer 1-100>,
  "dimensions": {
    "imagery": <integer 1-100>,
    "musicality": <integer 1-100>,
    "originality": <integer 1-100>,
    "clarity": <integer 1-100>
  },
  "issues": [
    {
      "id": "<short stable id like issue-1>",
      "line_start": <1-based line number>,
      "line_end": <1-based line number, same as line_start if one line>,
      "excerpt": "<optional short quote>",
      "rationale": "<why this is a problem>",
      "improvements": ["<1-3 concrete directions, not necessarily full rewrites>"]
    }
  ]
}

Rules:
- line_start and line_end must refer to valid line numbers from the prompt.
- Include between 0 and 8 issues; prioritize the most important.
- Each issue must have 1-3 items in "improvements".
- Scores must be integers from 1 to 100.
- If the input is empty or not a poem, still return valid JSON with overall_score and dimensions set conservatively and issues explaining the limitation.`;

function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.min(max, Math.max(min, Math.round(x)));
}

function normalizeResponse(raw, lineCount, model) {
  const overall_score = clampInt(raw?.overall_score, 1, 100);
  const d = raw?.dimensions ?? {};
  const dimensions = {
    imagery: clampInt(d.imagery, 1, 100),
    musicality: clampInt(d.musicality, 1, 100),
    originality: clampInt(d.originality, 1, 100),
    clarity: clampInt(d.clarity, 1, 100),
  };

  if (
    overall_score === null ||
    Object.values(dimensions).some((v) => v === null)
  ) {
    return null;
  }

  const issuesIn = Array.isArray(raw?.issues) ? raw.issues : [];
  const issues = [];

  for (let i = 0; i < issuesIn.length; i++) {
    const it = issuesIn[i];
    const ls = clampInt(it?.line_start, 1, lineCount);
    const le = clampInt(it?.line_end ?? it?.line_start, 1, lineCount);
    if (ls === null || le === null) continue;
    const line_start = Math.min(ls, le);
    const line_end = Math.max(ls, le);
    const rationale = String(it?.rationale ?? "").trim();
    if (!rationale) continue;
    const improvements = (Array.isArray(it?.improvements) ? it.improvements : [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 3);
    if (improvements.length === 0) continue;
    issues.push({
      id: String(it?.id ?? `issue-${i + 1}`).slice(0, 64),
      line_start,
      line_end,
      excerpt:
        it?.excerpt !== undefined && it?.excerpt !== null
          ? String(it.excerpt).slice(0, 280)
          : undefined,
      rationale: rationale.slice(0, 2000),
      improvements,
    });
  }

  return {
    meta: { model, analyzedAt: new Date().toISOString() },
    overall_score,
    dimensions,
    issues: issues.slice(0, 8),
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.post("/api/analyze", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "Server misconfiguration: OPENAI_API_KEY missing" });
    return;
  }

  const { title, lines } = req.body ?? {};
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: "Body must include non-empty lines: string[]" });
    return;
  }
  if (lines.some((l) => typeof l !== "string")) {
    res.status(400).json({ error: "Every line must be a string" });
    return;
  }
  if (title !== undefined && title !== null && typeof title !== "string") {
    res.status(400).json({ error: "title must be a string if provided" });
    return;
  }

  const userContent = buildPoemPrompt(typeof title === "string" ? title : "", lines);

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      res.status(502).json({ error: "Empty response from model" });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      res.status(502).json({ error: "Model returned non-JSON" });
      return;
    }

    const normalized = normalizeResponse(parsed, lines.length, MODEL);
    if (!normalized) {
      res.status(502).json({ error: "Model JSON did not match expected scores shape" });
      return;
    }

    res.json(normalized);
  } catch (err) {
    const status = err?.status ?? err?.response?.status;
    const message =
      status === 401
        ? "Invalid OpenAI API key"
        : err?.message ?? "OpenAI request failed";
    res.status(502).json({ error: String(message).slice(0, 200) });
  }
});

app.listen(PORT, () => {
  console.log(`easy-poems API listening on http://localhost:${PORT}`);
});
