import "./AiAnalysis.css";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzePoem,
  comparePoem,
  type AnalysisDimensions,
  type AnalysisIssue,
  type ComparisonChanges,
  type PoemAnalysis,
  type PoemComparison,
} from "@/workshop/analysis/ai-analyze";
import { tryLocalStorageSetItem } from "@/shared/platform/browser-storage";
import { STORAGE_KEY_AI_MODEL } from "@/shared/storage-keys";

const LS_KEY_MODEL = STORAGE_KEY_AI_MODEL;
const DEFAULT_MODEL = "gpt-4o-mini";

function loadStoredModel(): string {
  try { return localStorage.getItem(LS_KEY_MODEL) ?? DEFAULT_MODEL; }
  catch { return DEFAULT_MODEL; }
}

// ---- utils ---- //
function scoreColor(score: number): string {
  if (score >= 80) return "var(--ai-score-high, #5fba7d)";
  if (score >= 55) return "var(--ai-score-mid, #e6a817)";
  return "var(--ai-score-low, #d95f5f)";
}

function scoreLabel(score: number): string {
  if (score >= 88) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Solid";
  if (score >= 45) return "Developing";
  return "Needs work";
}

function deltaLabel(d: number): string {
  if (d > 0) return `+${d}`;
  if (d < 0) return `${d}`;
  return "—";
}

function deltaClass(d: number): string {
  if (d > 0) return "ai-delta ai-delta-up";
  if (d < 0) return "ai-delta ai-delta-down";
  return "ai-delta ai-delta-flat";
}

// ---- dimension descriptions ---- //
const DIM_META: Record<keyof AnalysisDimensions, { label: string; desc: string }> = {
  imagery:     { label: "Imagery",     desc: "Vividness and specificity of sensory language" },
  musicality:  { label: "Musicality",  desc: "Rhythm, sound patterns, and how it reads aloud" },
  originality: { label: "Originality", desc: "Freshness of language, images, and perspective" },
  clarity:     { label: "Clarity",     desc: "Coherence and ease of following the poem's meaning" },
};

// ---- issue category derivation ---- //
const CATEGORY_RULES: { label: string; color: string; keywords: RegExp }[] = [
  { label: "Imagery",    color: "var(--ai-cat-imagery,  #7fa8c9)", keywords: /imag|visual|senso|concrete|abstract|metaphor|simile|picture|vivid/i },
  { label: "Rhythm",     color: "var(--ai-cat-rhythm,   #8fc48f)", keywords: /rhythm|meter|beat|syllable|stress|iamb|anapest|trochee|spondee|cadence|pace|flow/i },
  { label: "Sound",      color: "var(--ai-cat-sound,    #b0a0d8)", keywords: /rhyme|sound|alliter|assonance|consonance|musical|echo|repeat|repetit/i },
  { label: "Word choice", color: "var(--ai-cat-word,    #d4a96a)", keywords: /word|diction|vocab|cliché|cliche|trite|vague|overwrit|purple prose|adjective|adverb/i },
  { label: "Structure",  color: "var(--ai-cat-struct,   #9fc4b4)", keywords: /structur|stanza|line break|enjamb|syntax|sentence|paragraph|openin|ending|volta|turn/i },
  { label: "Clarity",    color: "var(--ai-cat-clarity,  #c4a0a0)", keywords: /clear|clarity|confus|obscure|ambig|vague|awkward|hard to follow|understand/i },
];

function deriveCategory(issue: AnalysisIssue): { label: string; color: string } | null {
  const text = `${issue.rationale} ${issue.improvements.join(" ")}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(text)) return { label: rule.label, color: rule.color };
  }
  return null;
}

// ---- sub-components ---- //
function ScoreRing({ score }: { score: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <svg className="ai-score-ring" viewBox="0 0 76 76" aria-hidden>
      <circle cx="38" cy="38" r={r} fill="none"
        stroke="color-mix(in srgb, currentColor 10%, transparent)" strokeWidth="6" />
      <circle cx="38" cy="38" r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circ} ${circ}`}
        transform="rotate(-90 38 38)"
        style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
}

function DimensionBar({
  label, desc, value, delta,
}: { label: string; desc: string; value: number; delta?: number }) {
  return (
    <div className="ai-dim-row" title={desc}>
      <span className="ai-dim-label">{label}</span>
      <div className="ai-dim-track">
        <div className="ai-dim-fill" style={{ width: `${value}%`, background: scoreColor(value) }} />
      </div>
      <span className="ai-dim-val" style={{ color: scoreColor(value) }}>{value}</span>
      {delta !== undefined ? (
        <span className={deltaClass(delta)} title={`Changed by ${deltaLabel(delta)}`}>
          {deltaLabel(delta)}
        </span>
      ) : null}
    </div>
  );
}

function IssueCard({
  issue, index, onJump, onHighlight, onClearHighlight,
}: {
  issue: AnalysisIssue;
  index: number;
  onJump?: (line: number) => void;
  onHighlight?: (start: number, end: number) => void;
  onClearHighlight?: () => void;
}) {
  const rangeLabel = issue.line_start === issue.line_end
    ? `Line ${issue.line_start}`
    : `Lines ${issue.line_start}–${issue.line_end}`;
  const cat = deriveCategory(issue);

  return (
    <details
      className="ai-issue"
      onMouseEnter={() => onHighlight?.(issue.line_start, issue.line_end)}
      onMouseLeave={() => onClearHighlight?.()}
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) {
          onHighlight?.(issue.line_start, issue.line_end);
        } else {
          onClearHighlight?.();
        }
      }}
    >
      <summary className="ai-issue-head">
        <span className="ai-issue-num">{index + 1}</span>
        <span className="ai-issue-head-inner">
          {onJump ? (
            <button type="button" className="ai-issue-line linkish"
              onClick={(e) => { e.preventDefault(); onJump(issue.line_start); }}
              title={`Jump to line ${issue.line_start}`}>
              {rangeLabel}
            </button>
          ) : <span className="ai-issue-line">{rangeLabel}</span>}
          {cat && (
            <span className="ai-issue-cat" style={{ borderColor: cat.color, color: cat.color }}>
              {cat.label}
            </span>
          )}
          {issue.excerpt
            ? <span className="ai-issue-excerpt">&ldquo;{issue.excerpt}&rdquo;</span>
            : null}
        </span>
        <span className="ai-issue-chevron" aria-hidden>›</span>
      </summary>
      <div className="ai-issue-body">
        <p className="ai-issue-rationale">{issue.rationale}</p>
        {issue.improvements.length > 0 && (
          <ul className="ai-issue-improvements">
            {issue.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
          </ul>
        )}
      </div>
    </details>
  );
}

function ComparisonPanel({ cmp }: { cmp: ComparisonChanges }) {
  return (
    <div className="ai-comparison">
      {cmp.summary && <p className="ai-compare-summary">{cmp.summary}</p>}
      {cmp.improvements.length > 0 && (
        <div className="ai-compare-group ai-compare-improved">
          <span className="ai-compare-group-label">Improved</span>
          <ul>{cmp.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {cmp.regressions.length > 0 && (
        <div className="ai-compare-group ai-compare-regressed">
          <span className="ai-compare-group-label">Watch out</span>
          <ul>{cmp.regressions.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {cmp.unchanged.length > 0 && (
        <div className="ai-compare-group ai-compare-unchanged">
          <span className="ai-compare-group-label">Still strong</span>
          <ul>{cmp.unchanged.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function AnalysisResults({
  result, previous, onJump, onHighlight, onClearHighlight,
}: {
  result: PoemAnalysis | PoemComparison;
  previous?: PoemAnalysis | null;
  onJump?: (line: number) => void;
  onHighlight?: (start: number, end: number) => void;
  onClearHighlight?: () => void;
}) {
  const isCompare = "comparison" in result;
  const deltas = previous
    ? {
        overall: result.overall_score - previous.overall_score,
        imagery: result.dimensions.imagery - previous.dimensions.imagery,
        musicality: result.dimensions.musicality - previous.dimensions.musicality,
        originality: result.dimensions.originality - previous.dimensions.originality,
        clarity: result.dimensions.clarity - previous.dimensions.clarity,
      }
    : null;

  return (
    <div className="ai-results">
      {/* Score + dimensions */}
      <div className="ai-results-top">
        <div className="ai-overall">
          <div className="ai-score-wrap">
            <ScoreRing score={result.overall_score} />
            <span className="ai-score-number" style={{ color: scoreColor(result.overall_score) }}>
              {result.overall_score}
              <span className="ai-score-outof">/100</span>
            </span>
          </div>
          <div className="ai-overall-label">
            <span className="ai-overall-verdict" style={{ color: scoreColor(result.overall_score) }}>
              {scoreLabel(result.overall_score)}
            </span>
            {deltas && (
              <span className={deltaClass(deltas.overall) + " ai-overall-delta"}>
                {deltaLabel(deltas.overall)} from last
              </span>
            )}
            <span className="ai-overall-prose muted small">
              {buildProseSummary(result.dimensions)}
            </span>
          </div>
        </div>

        <div className="ai-dimensions">
          {(Object.keys(DIM_META) as (keyof AnalysisDimensions)[]).map((k) => (
            <DimensionBar
              key={k}
              label={DIM_META[k].label}
              desc={DIM_META[k].desc}
              value={result.dimensions[k]}
              delta={deltas ? deltas[k] : undefined}
            />
          ))}
        </div>
      </div>

      {/* Comparison panel */}
      {isCompare && <ComparisonPanel cmp={(result as PoemComparison).comparison} />}

      {/* Issues / feedback */}
      {result.issues.length > 0 ? (
        <div className="ai-issues-section">
          <h4 className="ai-issues-heading">
            Line-level feedback
            <span className="ai-issues-count">{result.issues.length}</span>
          </h4>
          <p className="ai-issues-intro muted small">
            Hover an issue to highlight the lines in the editor. Click to expand the suggestion.
          </p>
          <div className="ai-issues-list">
            {result.issues.map((iss, i) => (
              <IssueCard
                key={iss.id}
                issue={iss}
                index={i}
                onJump={onJump}
                onHighlight={onHighlight}
                onClearHighlight={onClearHighlight}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="ai-no-issues-wrap">
          <span className="ai-no-issues-check" aria-hidden>✓</span>
          <p className="ai-no-issues muted small">No specific line-level issues — the poem reads well.</p>
        </div>
      )}

      <p className="ai-meta muted small">
        {result.meta.model} ·{" "}
        {new Date(result.meta.analyzedAt).toLocaleString(undefined, {
          dateStyle: "medium", timeStyle: "short",
        })}
      </p>
    </div>
  );
}

// ---- prose summary from dimensions ---- //
function buildProseSummary(dims: AnalysisDimensions): string {
  const entries = Object.entries(dims) as [keyof AnalysisDimensions, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0]!;
  const bottom = entries[entries.length - 1]!;
  const label = DIM_META[top[0]].label.toLowerCase();
  const weakLabel = DIM_META[bottom[0]].label.toLowerCase();
  if (top[1] >= 75 && bottom[1] < 55) {
    return `Strongest in ${label}; most room to grow in ${weakLabel}.`;
  }
  if (top[1] >= 75) {
    return `${DIM_META[top[0]].label} is a clear strength here.`;
  }
  if (bottom[1] < 45) {
    return `Focus next revision on ${weakLabel}.`;
  }
  return `Balanced across all four dimensions.`;
}

// ---- main component ---- //
export interface AiAnalysisProps {
  title: string;
  lines: string[];
  onJumpToLine?: (line: number) => void;
  onHighlightLines?: (start: number, end: number) => void;
  onClearHighlight?: () => void;
}

export function AiAnalysis({ title, lines, onJumpToLine, onHighlightLines, onClearHighlight }: AiAnalysisProps) {
  const [model, setModel] = useState(loadStoredModel);
  const [mode, setMode] = useState<"fresh" | "compare">("fresh");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<PoemAnalysis | PoemComparison | null>(null);
  const [savedResult, setSavedResult] = useState<PoemAnalysis | null>(null);
  const [savedLines, setSavedLines] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isUnconfigured, setIsUnconfigured] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const saveModel = useCallback((val: string) => {
    setModel(val);
    tryLocalStorageSetItem(LS_KEY_MODEL, val);
  }, []);

  const canCompare = savedResult !== null && savedLines.length > 0;
  const hasPoem = lines.some((l) => l.trim().length > 0);
  const wordCount = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const effectiveMode = mode === "compare" && canCompare ? "compare" : "fresh";

  const handleAnalyze = useCallback(async () => {
    if (!hasPoem) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("loading");
    setErrorMsg("");
    setIsUnconfigured(false);

    try {
      if (mode === "compare" && canCompare) {
        const res = await comparePoem(
          { title, lines, previousLines: savedLines,
            previousScores: { overall_score: savedResult!.overall_score, dimensions: savedResult!.dimensions } },
          model, ctrl.signal,
        );
        setResult(res);
        setSavedResult(res);
        setSavedLines(lines);
      } else {
        const res = await analyzePoem({ title, lines }, model, ctrl.signal);
        setResult(res);
        setSavedResult(res);
        setSavedLines(lines);
      }
      setStatus("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = (err as Error).message ?? "Unknown error";
      if (msg.toLowerCase().includes("not configured") || msg.toLowerCase().includes("api key")) {
        setIsUnconfigured(true);
        setStatus("idle");
      } else {
        setErrorMsg(msg);
        setStatus("error");
      }
    }
  }, [canCompare, hasPoem, lines, mode, model, savedLines, savedResult, title]);

  return (
    <section className="ai-analysis-section" aria-label="AI poem analysis" data-tour-id="ai-analysis">
      {/* Collapsible header */}
      <button
        type="button"
        className="ai-analysis-toggle"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <span className="ai-analysis-toggle-left">
          <span className="ai-analysis-toggle-icon" aria-hidden>✦</span>
          <span className="ai-analysis-toggle-title">AI Analysis</span>
        </span>
        <span className="ai-analysis-toggle-chevron" aria-hidden>
          {isOpen ? "▴" : "▾"}
        </span>
      </button>

      {isOpen && (
        <div className="ai-analysis-body">
          {/* Controls row */}
          <div className="ai-controls-row">
            <div className="ai-controls-left">
              {/* Mode toggle */}
              <div className="ai-mode-toggle" role="group" aria-label="Analysis mode">
                <button type="button"
                  className={`ai-mode-btn ${effectiveMode === "fresh" ? "is-active" : ""}`}
                  onClick={() => setMode("fresh")}>
                  Fresh
                </button>
                <button type="button"
                  className={`ai-mode-btn ${effectiveMode === "compare" ? "is-active" : ""}`}
                  onClick={() => setMode("compare")}
                  disabled={!canCompare}
                  title={canCompare
                    ? "Compare to your previous analysis"
                    : "Run a Fresh analysis first to unlock comparison"}>
                  Compare
                </button>
              </div>

              <label className="ai-model-label">
                <select className="ai-model-select" value={model}
                  onChange={(e) => saveModel(e.target.value)}>
                  <option value="gpt-4o-mini">Fast</option>
                  <option value="gpt-4o">Thinking</option>
                </select>
              </label>
            </div>

            <button type="button"
              className="small-btn small-btn-primary ai-analyze-btn"
              onClick={() => void handleAnalyze()}
              disabled={!hasPoem || status === "loading"}
              title={!hasPoem ? "Write some lines first" : undefined}>
              {status === "loading"
                ? "Analyzing…"
                : effectiveMode === "compare"
                  ? "Compare versions"
                  : "Analyze poem"}
            </button>
          </div>

          {/* Word count hint */}
          {hasPoem && status !== "loading" && (
            <p className="ai-word-hint muted small">
              {wordCount} word{wordCount !== 1 ? "s" : ""} ·{" "}
              {effectiveMode === "compare" && canCompare
                ? "will compare to your saved baseline"
                : "fresh analysis against four dimensions"}
            </p>
          )}

          {/* Compare mode hint */}
          {effectiveMode === "compare" && canCompare && (
            <p className="ai-compare-hint muted small">
              Baseline saved from previous run — the model will score the current
              version and show what changed.
            </p>
          )}

          {/* States */}
          {isUnconfigured && (
            <div className="ai-unconfigured" role="status">
              <p className="ai-unconfigured-title">Server not configured</p>
              <p className="ai-unconfigured-text">
                AI analysis requires the companion server running with an OpenAI API
                key. See the <code>server/</code> directory in the repository —
                set <code>OPENAI_API_KEY</code> and start the proxy, then reload.
              </p>
            </div>
          )}

          {!isUnconfigured && status === "idle" && !result && (
            <div className="ai-idle-hint">
              <p className="muted small">
                Scores your poem on <strong>Imagery</strong>,{" "}
                <strong>Musicality</strong>, <strong>Originality</strong>, and{" "}
                <strong>Clarity</strong> — then gives line-level feedback with
                specific suggestions. After the first run, <strong>Compare</strong>{" "}
                shows exactly what improved between drafts.
              </p>
            </div>
          )}

          {status === "loading" && (
            <div className="ai-loading" role="status" aria-live="polite">
              <span className="ai-loading-dot" aria-hidden />
              <span className="ai-loading-dot" aria-hidden />
              <span className="ai-loading-dot" aria-hidden />
              <span className="ai-loading-label">
                {effectiveMode === "compare"
                  ? "Comparing versions…"
                  : "Reading the poem…"}
              </span>
            </div>
          )}

          {status === "error" && (
            <div className="ai-error" role="alert">
              <p className="ai-error-text">{errorMsg}</p>
              <button type="button" className="small-btn"
                onClick={() => { setStatus("idle"); setErrorMsg(""); }}>
                Dismiss
              </button>
            </div>
          )}

          {status === "done" && result && (
            <>
              <AnalysisResults
                result={result}
                previous={effectiveMode === "compare" ? savedResult : null}
                onJump={onJumpToLine}
                onHighlight={onHighlightLines}
                onClearHighlight={onClearHighlight}
              />
              <button type="button"
                className="small-btn ai-rerun-btn"
                onClick={() => void handleAnalyze()}>
                Analyze again
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
