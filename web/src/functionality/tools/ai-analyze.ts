/**
 * Browser-side call to the /api/analyze serverless endpoint.
 * The OpenAI key lives on the server — the browser never touches it.
 */

export interface AnalysisMeta {
  model: string;
  analyzedAt: string;
}

export interface AnalysisDimensions {
  imagery: number;
  musicality: number;
  originality: number;
  clarity: number;
}

export interface AnalysisIssue {
  id: string;
  line_start: number;
  line_end: number;
  excerpt?: string;
  rationale: string;
  improvements: string[];
}

export interface PoemAnalysis {
  meta: AnalysisMeta;
  overall_score: number;
  dimensions: AnalysisDimensions;
  issues: AnalysisIssue[];
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n), 10);
  if (!Number.isFinite(v)) return 50;
  return Math.max(1, Math.min(100, Math.round(v)));
}

function parseAnalysis(obj: Record<string, unknown>): PoemAnalysis {
  const dims = (obj.dimensions ?? {}) as Record<string, unknown>;
  const issuesRaw = Array.isArray(obj.issues) ? obj.issues : [];
  const meta = (obj.meta ?? {}) as Record<string, unknown>;

  return {
    meta: {
      model: typeof meta.model === "string" ? meta.model : "gpt-4o-mini",
      analyzedAt:
        typeof meta.analyzedAt === "string" ? meta.analyzedAt : new Date().toISOString(),
    },
    overall_score: clampScore(obj.overall_score),
    dimensions: {
      imagery: clampScore(dims.imagery),
      musicality: clampScore(dims.musicality),
      originality: clampScore(dims.originality),
      clarity: clampScore(dims.clarity),
    },
    issues: issuesRaw
      .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
      .map((iss, idx) => ({
        id: typeof iss.id === "string" ? iss.id : `issue-${idx + 1}`,
        line_start: clampScore(iss.line_start),
        line_end: clampScore(iss.line_end),
        excerpt: typeof iss.excerpt === "string" ? iss.excerpt : undefined,
        rationale: typeof iss.rationale === "string" ? iss.rationale : "",
        improvements: Array.isArray(iss.improvements)
          ? (iss.improvements as unknown[])
              .filter((s): s is string => typeof s === "string")
              .slice(0, 3)
          : [],
      })),
  };
}

export interface ComparisonChanges {
  summary: string;
  improvements: string[];
  regressions: string[];
  unchanged: string[];
}

export interface PoemComparison extends PoemAnalysis {
  comparison: ComparisonChanges;
}

function parseComparison(obj: Record<string, unknown>): PoemComparison {
  const base = parseAnalysis(obj);
  const c = (obj.comparison ?? {}) as Record<string, unknown>;
  const toStrArr = (v: unknown) =>
    Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];
  return {
    ...base,
    comparison: {
      summary: typeof c.summary === "string" ? c.summary : "",
      improvements: toStrArr(c.improvements),
      regressions: toStrArr(c.regressions),
      unchanged: toStrArr(c.unchanged),
    },
  };
}

export async function comparePoem(
  {
    title,
    lines,
    previousLines,
    previousScores,
  }: {
    title: string;
    lines: string[];
    previousLines: string[];
    previousScores: { overall_score: number; dimensions: AnalysisDimensions };
  },
  model = "gpt-4o-mini",
  signal?: AbortSignal,
): Promise<PoemComparison> {
  const response = await fetch("/api/compare", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, lines, previousLines, previousScores, model }),
  });

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return parseComparison(data);
}

export async function analyzePoem(
  { title, lines }: { title: string; lines: string[] },
  model = "gpt-4o-mini",
  signal?: AbortSignal,
): Promise<PoemAnalysis> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, lines, model }),
  });

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return parseAnalysis(data);
}
