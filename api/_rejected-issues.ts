/**
 * Calls the poet has already thrown away on a given poem, sent up with the next
 * analyse/compare request so the model stops re-litigating settled taste.
 *
 * This is the poet's judgement, not a measurement — it is deliberately kept out
 * of the local-analysis/tool-readings blocks and placed last, closest to the
 * answer. The prompts carry the rule (see REJECTED CALLS).
 */

/** How many rejections travel with a request, and how long each may be.
 *  Mirrors MAX_REJECTED in web/src/workshop/analysis/ai-analysis-storage.ts. */
const MAX_REJECTED = 10;
const MAX_REJECTED_CHARS = 90;

export function parseRejectedIssues(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return (v as unknown[])
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .slice(0, MAX_REJECTED)
    .map((s) => s.trim().slice(0, MAX_REJECTED_CHARS));
}

/** The prompt block, or "" when this poet hasn't rejected anything yet. */
export function rejectedIssuesBlock(rejected: string[], heading: string): string {
  if (rejected.length === 0) return "";
  return `\n\n${heading}\n${rejected.map((r) => `- ${r}`).join("\n")}`;
}
