import type { PoemAnalysis } from "@/workshop/analysis/ai-analyze";

export const LS_LAST_ANALYSIS_PREFIX = "easy-poems:ai-last:";
export const LS_LAST_ANALYZED_LINES_PREFIX = "easy-poems:ai-last-lines:";
export const LS_RESOLVED_PREFIX = "easy-poems:ai-resolved:";
export const LS_IGNORED_PREFIX = "easy-poems:ai-ignored:";
/** Subset of ignored ids that the user manually dismissed (vs. Apply, which
 *  also marks an issue ignored). Tracked separately so we can show a "Dismissed"
 *  list with a Restore action without offering to restore already-applied
 *  rewrites whose lines have changed. */
export const LS_DISMISSED_PREFIX = "easy-poems:ai-dismissed:";
/** Issues the poet has thrown away, kept as TEXT and deliberately NOT cleared
 *  when a new analysis runs (the id-keyed stores above are). This is the poem's
 *  memory of taste calls its author already rejected — it rides along with the
 *  next analyse request so the model stops re-litigating them. */
export const LS_REJECTED_PREFIX = "easy-poems:ai-rejected:";

/** How many rejections we remember per poem. Old ones fall off the end — a call
 *  the poet rejected twenty drafts ago says little about the poem in front of them. */
const MAX_REJECTED = 10;

export function loadRejectedIssues(poemId?: string): string[] {
  if (!poemId) return [];
  try {
    const raw = localStorage.getItem(LS_REJECTED_PREFIX + poemId);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .slice(0, MAX_REJECTED);
  } catch { return []; }
}

/** Record a rejected issue, most recent first. Same text twice is one entry —
 *  the model re-raising a call under a fresh id shouldn't inflate the list. */
export function recordRejectedIssue(poemId: string | undefined, text: string) {
  if (!poemId) return;
  const entry = text.trim().slice(0, 90);
  if (!entry) return;
  try {
    const next = [entry, ...loadRejectedIssues(poemId).filter((x) => x !== entry)]
      .slice(0, MAX_REJECTED);
    localStorage.setItem(LS_REJECTED_PREFIX + poemId, JSON.stringify(next));
  } catch { /* storage full */ }
}

export function loadLastAnalysis(poemId?: string): PoemAnalysis | null {
  if (!poemId) return null;
  try {
    const raw = localStorage.getItem(LS_LAST_ANALYSIS_PREFIX + poemId);
    if (!raw) return null;
    return JSON.parse(raw) as PoemAnalysis;
  } catch { return null; }
}

export function saveLastAnalysis(poemId: string | undefined, analysis: PoemAnalysis) {
  if (!poemId) return;
  try { localStorage.setItem(LS_LAST_ANALYSIS_PREFIX + poemId, JSON.stringify(analysis)); }
  catch { /* storage full */ }
}

export function loadLastAnalyzedLines(poemId?: string): string[] {
  if (!poemId) return [];
  try {
    const raw = localStorage.getItem(LS_LAST_ANALYZED_LINES_PREFIX + poemId);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x));
  } catch { return []; }
}

export function saveLastAnalyzedLines(poemId: string | undefined, lines: string[]) {
  if (!poemId) return;
  try { localStorage.setItem(LS_LAST_ANALYZED_LINES_PREFIX + poemId, JSON.stringify(lines)); }
  catch { /* storage full */ }
}

export function loadIdSet(prefix: string, poemId?: string): Set<string> {
  if (!poemId) return new Set();
  try {
    const raw = localStorage.getItem(prefix + poemId);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => String(x)));
  } catch { return new Set(); }
}

export function saveIdSet(prefix: string, poemId: string | undefined, set: Set<string>) {
  if (!poemId) return;
  try {
    if (set.size === 0) localStorage.removeItem(prefix + poemId);
    else localStorage.setItem(prefix + poemId, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export function loadIgnoredIssueIds(poemId?: string): Set<string> {
  return loadIdSet(LS_IGNORED_PREFIX, poemId);
}

export function loadDismissedIssueIds(poemId?: string): Set<string> {
  return loadIdSet(LS_DISMISSED_PREFIX, poemId);
}
