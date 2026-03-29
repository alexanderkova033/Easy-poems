/**
 * @param {unknown} n
 * @param {number} min
 * @param {number} max
 * @returns {number | null}
 */
export function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.min(max, Math.max(min, Math.round(x)));
}

/**
 * Normalizes raw model JSON into the public API shape (or null if invalid).
 * Shapes: see `types/analyze.d.ts` and `openapi.yaml`.
 * @param {Record<string, unknown>} raw
 * @param {number} lineCount
 * @param {string} model
 */
export function normalizeResponse(raw, lineCount, model) {
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
