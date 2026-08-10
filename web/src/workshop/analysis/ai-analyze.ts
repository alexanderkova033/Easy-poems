/**
 * Browser-side calls to the /api/* serverless endpoints.
 * The OpenAI key lives on the server — the browser never touches it.
 */

import { parseAiErrorAndNotify } from "../ai-cost/aiBudgetBus";
import type { ToolStats } from "./tool-stats";
import type { ToolTab } from "@/workshop/shell/workshop-helpers";

export interface AnalysisMeta {
  model: string;
  analyzedAt: string;
}

export type Confidence = "high" | "medium" | "low";

export interface AnalysisIssue {
  id: string;
  severity?: "high" | "medium" | "low";
  /** How sure the model is this is actually a problem (vs taste). */
  confidence?: Confidence;
  line_start: number;
  line_end: number;
  excerpt?: string;
  problem_words?: string[];
  /** One-line preview shown when the issue card is collapsed. */
  headline?: string;
  rationale: string;
  improvements: string[];
  /** Concrete rewritten version of the line(s), when provided by the model. */
  rewrite?: string;
}

export interface StrongestLine {
  line: number;
  excerpt: string;
  why: string;
}

/** A light nudge toward one of the workshop's own tools, based on what its
 *  numbers showed. Never the basis of the read — a footnote to it. */
export interface ToolTip {
  /** Tool tab to open. Only tools the model was told about land here. */
  tool: ToolTab;
  /** Display label for that tool, as shown on the tool tab bar. */
  label: string;
  tip: string;
}

export interface PillarScores {
  chord: number;
  craft: number;
  spark: number;
  echo: number;
}

export interface PoemAnalysis {
  meta: AnalysisMeta;
  overall_score: number;
  /** 4 × 25 pillar breakdown. Sum (with hard cap) = overall_score. */
  pillar_scores?: PillarScores;
  /** A-G letter from the rubric's calibration profiles. Sent back to compare
   *  on the next Refine so the model doesn't snap to a different anchor and
   *  introduce a 20-point jump just from a profile swap. */
  matched_profile?: string;
  warm_reaction?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  strongest_line?: StrongestLine;
  overall_direction?: string;
  /** 2-3 sentence holistic read of the poem as a whole. */
  overall_feedback?: string;
  /** 2-3 sentences addressed to the writer ("you"), warm/mentor tone. */
  personal_feedback?: string;
  clarifying_question?: string;
  /** "Now go open this tool" — one optional, low-stakes suggestion. */
  tool_tip?: ToolTip;
  issues: AnalysisIssue[];
}

export interface LocalAnalysisContext {
  cliches: Array<{ phrase: string; lineNumber: number }>;
  rhymeScheme: string[];
  syllablesPerLine: number[];
  repeatedWords: Array<{ word: string; count: number; lines: number[] }>;
  form: string;
  /** Readings from the workshop's own tools. Built lazily at analyse time. */
  toolStats?: ToolStats;
}

/** Tools the model may point at, keyed by the label it returns. Anything else
 *  is dropped — a tip that names a tool the app doesn't have is worse than no
 *  tip at all. Labels match the tool tab bar. */
const TIP_TOOLS: Record<string, { tool: ToolTab; label: string }> = {
  lines: { tool: "lines", label: "Lines" },
  meter: { tool: "meter", label: "Meter" },
  rhyme: { tool: "rhyme", label: "Rhyme" },
  echoes: { tool: "echoes", label: "Echoes" },
  repeats: { tool: "repeat", label: "Repeats" },
  spell: { tool: "spell", label: "Spell" },
  plans: { tool: "goals", label: "Plans" },
  snapshots: { tool: "snapshots", label: "Snapshots" },
};

function parseToolTip(v: unknown): ToolTip | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const rawTool = typeof o.tool === "string" ? o.tool.trim().toLowerCase() : "";
  const match = TIP_TOOLS[rawTool];
  if (!match) return undefined;
  const tip = typeof o.tip === "string" ? o.tip.trim() : "";
  if (!tip) return undefined;
  return { tool: match.tool, label: match.label, tip: tip.slice(0, 200) };
}

/** Heuristic poem-form detection based on line count and syllable counts. */
export function detectPoemForm(lines: string[], syllablesPerLine: number[]): string {
  const nonEmpty = lines.filter((l) => l.trim());
  if (nonEmpty.length === 3) {
    const nonEmptySyl = lines
      .map((l, i) => (l.trim() ? (syllablesPerLine[i] ?? 0) : null))
      .filter((s): s is number => s !== null);
    if (
      nonEmptySyl.length === 3 &&
      Math.abs(nonEmptySyl[0]! - 5) <= 1 &&
      Math.abs(nonEmptySyl[1]! - 7) <= 1 &&
      Math.abs(nonEmptySyl[2]! - 5) <= 1
    ) {
      return "haiku";
    }
  }
  if (nonEmpty.length === 14) return "sonnet";
  if (nonEmpty.length === 19) return "villanelle";
  return "free";
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n), 10);
  if (!Number.isFinite(v)) return 50;
  return Math.max(1, Math.min(100, Math.round(v)));
}

/** Server-side ceiling on poem length — the fallback when a caller parses a
 *  response without telling us how long the poem was. Mirrors MAX_LINES in
 *  api/analyze.ts. */
const MAX_POEM_LINES = 500;

/** Line anchors are 1-based indices INTO THE POEM, not 0-100 scores, and they
 *  need their own bounds — clampScore would silently re-pin line 137 to line
 *  100, and a garbled value to line 50, both of which highlight the wrong line.
 *  Anything outside the poem points nowhere, so it returns null and the caller
 *  drops the issue rather than showing it against innocent text. */
function parseLineAnchor(v: unknown, maxLine: number): number | null {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return null;
  const line = Math.round(n);
  if (line < 1 || line > maxLine) return null;
  return line;
}

function clampPillar(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n), 10);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(25, Math.round(v)));
}

function parsePillarScores(v: unknown): PillarScores | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const hasAny =
    o.chord !== undefined ||
    o.craft !== undefined ||
    o.spark !== undefined ||
    o.echo !== undefined;
  if (!hasAny) return undefined;
  return {
    chord: clampPillar(o.chord),
    craft: clampPillar(o.craft),
    spark: clampPillar(o.spark),
    echo: clampPillar(o.echo),
  };
}

/** If the model emitted pillar_scores, enforce overall = sum. No cap — each pillar
 *  is judged independently per the rubric. Client-side check so a sloppy model
 *  can't sneak past with an inflated or deflated overall_score. */
function reconcileOverallScore(pillars: PillarScores | undefined, modelOverall: number): number {
  if (!pillars) return modelOverall;
  const sum = pillars.chord + pillars.craft + pillars.spark + pillars.echo;
  return Math.max(1, Math.min(100, sum));
}

function parseSeverity(v: unknown): "high" | "medium" | "low" | undefined {
  if (v === "high" || v === "medium" || v === "low") return v;
  return undefined;
}

function parseConfidence(v: unknown): Confidence | undefined {
  if (v === "high" || v === "medium" || v === "low") return v;
  return undefined;
}

function parseStringArray(v: unknown, max: number): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = (v as unknown[])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, max);
  return out.length > 0 ? out : undefined;
}

function parseStrongestLine(v: unknown, maxLine: number): StrongestLine | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const line = parseLineAnchor(o.line, maxLine);
  if (line === null) return undefined;
  const excerpt = typeof o.excerpt === "string" ? o.excerpt.trim() : "";
  const why = typeof o.why === "string" ? o.why.trim() : "";
  if (!excerpt && !why) return undefined;
  return { line, excerpt, why };
}

/** Cap total issues at MAX_ISSUES and roughly balance high/medium/low buckets.
 * Round-robin pick from each severity bucket (high → medium → low) preserving
 * original order within each bucket. Issues with no severity fall into "low". */
const MAX_ISSUES = 3;
function balanceAndCapIssues<T extends { severity?: "high" | "medium" | "low" }>(issues: T[]): T[] {
  if (issues.length <= MAX_ISSUES) return issues;
  const high: T[] = [];
  const medium: T[] = [];
  const low: T[] = [];
  for (const iss of issues) {
    if (iss.severity === "high") high.push(iss);
    else if (iss.severity === "medium") medium.push(iss);
    else low.push(iss);
  }
  const out: T[] = [];
  const buckets = [high, medium, low];
  while (out.length < MAX_ISSUES) {
    let drew = false;
    for (const b of buckets) {
      if (out.length >= MAX_ISSUES) break;
      const next = b.shift();
      if (next) { out.push(next); drew = true; }
    }
    if (!drew) break;
  }
  return out;
}

/** The model occasionally crowns a line it also flagged, which reads as the
 *  panel contradicting itself. The issue is the actionable half, so it wins and
 *  the "strongest line" claim goes — better no crown than a contradictory one. */
function dropStrongestLineIfFlagged(
  strongest: StrongestLine | undefined,
  issues: AnalysisIssue[],
): StrongestLine | undefined {
  if (!strongest) return undefined;
  const flagged = issues.some((iss) => {
    const from = Math.min(iss.line_start, iss.line_end);
    const to = Math.max(iss.line_start, iss.line_end);
    return strongest.line >= from && strongest.line <= to;
  });
  return flagged ? undefined : strongest;
}

/** `lineCount` is the length of the poem that was analysed — it bounds every
 *  line anchor in the response. Exported for tests. */
export function parseAnalysis(obj: Record<string, unknown>, lineCount?: number): PoemAnalysis {
  const issuesRaw = Array.isArray(obj.issues) ? obj.issues : [];
  const meta = (obj.meta ?? {}) as Record<string, unknown>;
  const pillars = parsePillarScores(obj.pillar_scores);
  const maxLine = lineCount && lineCount > 0 ? lineCount : MAX_POEM_LINES;

  const issues = balanceAndCapIssues(issuesRaw
    .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
    .map((iss, idx): AnalysisIssue | null => {
      const start = parseLineAnchor(iss.line_start, maxLine);
      if (start === null) return null; // anchored outside the poem — unusable
      return {
        id: typeof iss.id === "string" ? iss.id : `issue-${idx + 1}`,
        severity: parseSeverity(iss.severity),
        confidence: parseConfidence(iss.confidence),
        line_start: start,
        // A range that runs off the end still starts somewhere real: keep the
        // issue, end it at the last line of the poem.
        line_end: parseLineAnchor(iss.line_end, maxLine) ?? start,
        excerpt: typeof iss.excerpt === "string" ? iss.excerpt : undefined,
        problem_words: Array.isArray(iss.problem_words)
          ? (iss.problem_words as unknown[])
              .filter((s): s is string => typeof s === "string")
              .slice(0, 3)
          : undefined,
        headline: typeof iss.headline === "string" && iss.headline.trim()
          ? iss.headline.trim() : undefined,
        rationale: typeof iss.rationale === "string" ? iss.rationale : "",
        improvements: Array.isArray(iss.improvements)
          ? (iss.improvements as unknown[])
              .filter((s): s is string => typeof s === "string")
              .slice(0, 1)
          : [],
        rewrite: typeof iss.rewrite === "string" && iss.rewrite.trim() ? iss.rewrite.trim() : undefined,
      };
    })
    .filter((x): x is AnalysisIssue => x !== null));

  return {
    meta: {
      model: typeof meta.model === "string" ? meta.model : "gpt-5-mini",
      analyzedAt:
        typeof meta.analyzedAt === "string" ? meta.analyzedAt : new Date().toISOString(),
    },
    overall_score: reconcileOverallScore(pillars, clampScore(obj.overall_score)),
    pillar_scores: pillars,
    matched_profile: typeof obj.matched_profile === "string" && /^[A-G]$/.test(obj.matched_profile.trim())
      ? obj.matched_profile.trim() : undefined,
    warm_reaction: typeof obj.warm_reaction === "string" && obj.warm_reaction.trim()
      ? obj.warm_reaction.trim() : undefined,
    summary: typeof obj.summary === "string" ? obj.summary : undefined,
    // Caps match the word budgets in the prompts: a model that ignores them
    // gets trimmed here rather than filling the panel.
    strengths: parseStringArray(obj.strengths, 2),
    weaknesses: parseStringArray(obj.weaknesses, 2),
    strongest_line: dropStrongestLineIfFlagged(parseStrongestLine(obj.strongest_line, maxLine), issues),
    overall_direction: typeof obj.overall_direction === "string" ? obj.overall_direction : undefined,
    overall_feedback: typeof obj.overall_feedback === "string" && obj.overall_feedback.trim()
      ? obj.overall_feedback.trim() : undefined,
    personal_feedback: typeof obj.personal_feedback === "string" && obj.personal_feedback.trim()
      ? obj.personal_feedback.trim() : undefined,
    clarifying_question: typeof obj.clarifying_question === "string" && obj.clarifying_question.trim()
      ? obj.clarifying_question.trim() : undefined,
    tool_tip: parseToolTip(obj.tool_tip),
    issues,
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

function parseComparison(obj: Record<string, unknown>, lineCount?: number): PoemComparison {
  const base = parseAnalysis(obj, lineCount);
  const c = (obj.comparison ?? {}) as Record<string, unknown>;
  const toStrArr = (v: unknown) =>
    Array.isArray(v)
      ? (v as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 2)
      : [];
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

/**
 * Build a compact line-level diff between two drafts. We send this instead of
 * the entire previous version so the model doesn't pay tokens for unchanged
 * lines. Uses a simple LCS to align lines, then coalesces removed+added pairs
 * into "changed" entries when they touch.
 */
export function buildChangesText(prev: string[], curr: string[]): string {
  const n = prev.length;
  const m = curr.length;
  // dp[i][j] = LCS of prev[i..] and curr[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (prev[i] === curr[j]) dp[i]![j]! = dp[i + 1]![j + 1]! + 1;
      else dp[i]![j]! = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  type RawOp = { type: "removed"; oldLine: number; oldText: string }
    | { type: "added"; newLine: number; newText: string };
  const ops: RawOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (prev[i] === curr[j]) { i++; j++; continue; }
    if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      ops.push({ type: "removed", oldLine: i + 1, oldText: prev[i]! });
      i++;
    } else {
      ops.push({ type: "added", newLine: j + 1, newText: curr[j]! });
      j++;
    }
  }
  while (i < n) { ops.push({ type: "removed", oldLine: i + 1, oldText: prev[i]! }); i++; }
  while (j < m) { ops.push({ type: "added", newLine: j + 1, newText: curr[j]! }); j++; }

  const lines: string[] = [];
  for (let k = 0; k < ops.length; k++) {
    const o = ops[k]!;
    const next = ops[k + 1];
    if (o.type === "removed" && next?.type === "added") {
      lines.push(`Line ${next.newLine} changed (was line ${o.oldLine}): "${o.oldText}" → "${next.newText}"`);
      k++;
    } else if (o.type === "removed") {
      lines.push(`Line ${o.oldLine} removed: "${o.oldText}"`);
    } else {
      lines.push(`Line ${o.newLine} added: "${o.newText}"`);
    }
  }
  return lines.length === 0 ? "(no line-level changes — same text)" : lines.join("\n");
}

export async function comparePoem(
  {
    title,
    lines,
    previousLines,
    previousScores,
    localAnalysis,
    goals,
    writingFocus,
    scoreHistory,
    previousWeaknesses,
    previousIssues,
    previousMatchedProfile,
    previousPillarScores,
    rejectedIssues,
    onProgress,
    onPreview,
  }: {
    title: string;
    lines: string[];
    previousLines: string[];
    previousScores: { overall_score: number };
    localAnalysis?: LocalAnalysisContext;
    goals?: Record<string, number>;
    writingFocus?: string;
    scoreHistory?: number[];
    previousWeaknesses?: string[];
    previousIssues?: Array<{ line_start: number; line_end: number; headline?: string }>;
    /** A-G letter the prior read landed on. Locked on this refine unless the
     *  revision changed the structural shape. */
    previousMatchedProfile?: string;
    /** Prior pillar breakdown so the model can keep continuity per pillar. */
    previousPillarScores?: PillarScores;
    /** Calls this poet has already thrown away on this poem. */
    rejectedIssues?: string[];
    /** Running character count as the re-read streams in. */
    onProgress?: (charsReceived: number) => void;
    /** The model's first impression of the revision, as soon as it lands. */
    onPreview?: (warmReaction: string) => void;
  },
  signal?: AbortSignal,
): Promise<PoemComparison> {
  const changesText = buildChangesText(previousLines, lines);
  const response = await fetch("/api/compare", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title, lines, changesText, previousScores, localAnalysis, goals, writingFocus, scoreHistory,
      previousWeaknesses, previousIssues, previousMatchedProfile, previousPillarScores, rejectedIssues,
    }),
  });

  if (!response.ok) {
    const { message, retryAfterSec } = await parseAiErrorAndNotify(response, "compare");
    const e = new Error(message) as Error & { retryAfterSec?: number };
    if (retryAfterSec !== undefined) e.retryAfterSec = retryAfterSec;
    throw e;
  }

  const contentType = response.headers.get("content-type") ?? "";
  // Cache hits come back as plain JSON; fresh reads stream.
  if (contentType.includes("application/json")) {
    const data = (await response.json()) as Record<string, unknown>;
    return parseComparison(data, lines.length);
  }

  const envelope = await readStreamedEnvelope(response, { onProgress, onPreview });
  return parseComparison(envelope, lines.length);
}

export type RecheckStatus = "resolved" | "partial" | "still" | "elsewhere";
export interface RecheckResult {
  status: RecheckStatus;
  note: string;
}

export async function recheckIssue(
  {
    oldLine,
    newLine,
    context,
    rationale,
    headline,
    lineRange,
  }: {
    oldLine: string;
    newLine: string;
    context?: string;
    rationale: string;
    headline?: string;
    lineRange?: string;
  },
  signal?: AbortSignal,
): Promise<RecheckResult> {
  const response = await fetch("/api/recheck", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldLine, newLine, context, rationale, headline, lineRange }),
  });
  if (!response.ok) {
    const { message, retryAfterSec } = await parseAiErrorAndNotify(response, "recheck");
    const e = new Error(message) as Error & { retryAfterSec?: number };
    if (retryAfterSec !== undefined) e.retryAfterSec = retryAfterSec;
    throw e;
  }
  const data = (await response.json()) as Record<string, unknown>;
  const rawStatus = typeof data.status === "string" ? data.status : "still";
  const status: RecheckStatus =
    rawStatus === "resolved" || rawStatus === "partial" || rawStatus === "still" || rawStatus === "elsewhere"
      ? (rawStatus as RecheckStatus)
      : "still";
  const note = typeof data.note === "string" ? data.note.trim() : "";
  return { status, note };
}

export type HarshnessLevel = "casual" | "editor" | "critic";

/** Matches STREAM_META_SEPARATOR in api/_openai.ts. Used to split a streamed
 *  analyze/compare body into <model JSON content> + <meta JSON>. */
const STREAM_META_SEPARATOR = "\n___META___\n";

/** `warm_reaction` is the FIRST field in both response shapes, so it lands a
 *  long way ahead of the rest. Pulling it straight out of the partial text —
 *  rather than waiting for valid JSON — lets the panel say something true
 *  seconds before the read finishes. The regex only matches once the closing
 *  quote has arrived, so it never shows half a word. */
const WARM_REACTION_RE = /"warm_reaction"\s*:\s*"((?:[^"\\]|\\.)*)"/;

function extractWarmReaction(body: string): string | null {
  const m = WARM_REACTION_RE.exec(body);
  if (!m) return null;
  try {
    const text = JSON.parse(`"${m[1]}"`) as string;
    return text.trim() || null;
  } catch {
    return null;
  }
}

export interface StreamHandlers {
  /** Running character count of model output — drives the progress bar. */
  onProgress?: (charsReceived: number) => void;
  /** Fires once, as soon as the model's first impression is complete. */
  onPreview?: (warmReaction: string) => void;
}

/**
 * Read a streamed analyse/compare response into the same envelope shape the
 * non-streaming (cache-hit) path returns, so both feed one parser.
 */
async function readStreamedEnvelope(
  response: Response,
  handlers?: StreamHandlers,
): Promise<Record<string, unknown>> {
  let body = "";
  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let previewSent = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      body += decoder.decode(value, { stream: true });
      handlers?.onProgress?.(body.length);
      if (!previewSent && handlers?.onPreview) {
        const reaction = extractWarmReaction(body);
        if (reaction) {
          previewSent = true;
          handlers.onPreview(reaction);
        }
      }
    }
  } else {
    body = await response.text();
  }

  const sepIdx = body.lastIndexOf(STREAM_META_SEPARATOR);
  const contentText = sepIdx >= 0 ? body.slice(0, sepIdx) : body;
  const metaText = sepIdx >= 0 ? body.slice(sepIdx + STREAM_META_SEPARATOR.length) : "";

  let modelJson: Record<string, unknown>;
  try {
    modelJson = JSON.parse(contentText) as Record<string, unknown>;
  } catch {
    // Model output got truncated mid-flight; surface as a normal error rather
    // than half-rendered results.
    throw new Error("AI response was cut off before it finished. Please try again.");
  }
  let meta: Record<string, unknown> = {};
  if (metaText) {
    try { meta = JSON.parse(metaText) as Record<string, unknown>; } catch { /* ignore */ }
  }

  const envelope: Record<string, unknown> = { ...modelJson };
  envelope.meta = {
    model: typeof meta.model === "string" ? meta.model : "gpt-5-mini",
    analyzedAt: typeof meta.analyzedAt === "string" ? meta.analyzedAt : new Date().toISOString(),
  };
  return envelope;
}

export async function analyzePoem(
  {
    title,
    lines,
    localAnalysis,
    goals,
    harshness,
    writingFocus,
    rejectedIssues,
    onProgress,
    onPreview,
  }: {
    title: string;
    lines: string[];
    localAnalysis?: LocalAnalysisContext;
    goals?: Record<string, number>;
    harshness?: HarshnessLevel;
    writingFocus?: string;
    /** Calls this poet has already thrown away on this poem — sent so the read
     *  doesn't re-litigate taste they've settled. */
    rejectedIssues?: string[];
    /** Optional: called with the running character count as content streams in.
     *  Lets the UI show real progress instead of an indeterminate spinner. */
    onProgress?: (charsReceived: number) => void;
    /** Optional: the model's first impression, as soon as it lands. */
    onPreview?: (warmReaction: string) => void;
  },
  signal?: AbortSignal,
): Promise<PoemAnalysis> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, lines, localAnalysis, goals, harshness, writingFocus, rejectedIssues }),
  });

  if (!response.ok) {
    const { message, retryAfterSec } = await parseAiErrorAndNotify(response, "analyze");
    const e = new Error(message) as Error & { retryAfterSec?: number };
    if (retryAfterSec !== undefined) e.retryAfterSec = retryAfterSec;
    throw e;
  }

  const contentType = response.headers.get("content-type") ?? "";
  // Cache hits and other non-streaming responses come back as JSON like before.
  if (contentType.includes("application/json")) {
    const data = (await response.json()) as Record<string, unknown>;
    return parseAnalysis(data, lines.length);
  }

  const envelope = await readStreamedEnvelope(response, { onProgress, onPreview });
  return parseAnalysis(envelope, lines.length);
}
