import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzePoem,
  comparePoem,
  type AnalysisDimensions,
  type AnalysisIssue,
  type ComparisonChanges,
  type PoemAnalysis,
  type PoemComparison,
} from "@/writing-tools/ai-analyze";
import { tryLocalStorageSetItem } from "@/shared/platform/browser-storage";
import { STORAGE_KEY_AI_MODEL } from "@/shared/storage-keys";

const LS_KEY_MODEL = STORAGE_KEY_AI_MODEL;
const DEFAULT_MODEL = "gpt-4o-mini";

function loadStoredModel(): string {
  try { return localStorage.getItem(LS_KEY_MODEL) ?? DEFAULT_MODEL; }
  catch { return DEFAULT_MODEL; }
}

// ---- shared utils ---- //
function scoreColor(score: number): string {
  if (score >= 80) return "var(--ai-score-high, #5fba7d)";
  if (score >= 55) return "var(--ai-score-mid, #e6a817)";
  return "var(--ai-score-low, #d95f5f)";
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

// ---- sub-components ---- //
function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <svg className="ai-score-ring" viewBox="0 0 72 72" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none"
        stroke="color-mix(in srgb, currentColor 12%, transparent)" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circ} ${circ}`}
        transform="rotate(-90 36 36)" />
    </svg>
  );
}

const DIM_LABELS: Record<keyof AnalysisDimensions, string> = {
  imagery: "Imagery", musicality: "Musicality",
  originality: "Originality", clarity: "Clarity",
};

function DimensionBar({
  label, value, delta,
}: { label: string; value: number; delta?: number }) {
  return (
    <div className="ai-dim-row">
      <span className="ai-dim-label">{label}</span>
      <div className="ai-dim-track" title={`${value}/100`}>
        <div className="ai-dim-fill" style={{ width: `${value}%`, background: scoreColor(value) }} />
      </div>
      <span className="ai-dim-val">{value}</span>
      {delta !== undefined ? (
        <span className={deltaClass(delta)} title={`Changed by ${deltaLabel(delta)}`}>
          {deltaLabel(delta)}
        </span>
      ) : null}
    </div>
  );
}

function IssueCard({ issue, onJump }: { issue: AnalysisIssue; onJump?: (line: number) => void }) {
  const rangeLabel = issue.line_start === issue.line_end
    ? `Line ${issue.line_start}` : `Lines ${issue.line_start}–${issue.line_end}`;
  return (
    <details className="ai-issue">
      <summary className="ai-issue-head">
        <span className="ai-issue-head-inner">
          {onJump ? (
            <button type="button" className="ai-issue-line linkish"
              onClick={(e) => { e.preventDefault(); onJump(issue.line_start); }}
              title={`Jump to line ${issue.line_start}`}>
              {rangeLabel}
            </button>
          ) : <span className="ai-issue-line">{rangeLabel}</span>}
          {issue.excerpt ? <span className="ai-issue-excerpt">&ldquo;{issue.excerpt}&rdquo;</span> : null}
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
  result,
  previous,
  onJump,
}: {
  result: PoemAnalysis | PoemComparison;
  previous?: PoemAnalysis | null;
  onJump?: (line: number) => void;
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
      <div className="ai-results-top">
        <div className="ai-overall">
          <div className="ai-score-wrap">
            <ScoreRing score={result.overall_score} />
            <span className="ai-score-number" style={{ color: scoreColor(result.overall_score) }}>
              {result.overall_score}
            </span>
          </div>
          <div className="ai-overall-label">
            <span className="ai-overall-title">Overall</span>
            <span className="ai-overall-sub">out of 100</span>
            {deltas && (
              <span className={deltaClass(deltas.overall) + " ai-overall-delta"}>
                {deltaLabel(deltas.overall)} from last
              </span>
            )}
          </div>
        </div>

        <div className="ai-dimensions">
          {(Object.keys(DIM_LABELS) as (keyof AnalysisDimensions)[]).map((k) => (
            <DimensionBar
              key={k}
              label={DIM_LABELS[k]}
              value={result.dimensions[k]}
              delta={deltas ? deltas[k] : undefined}
            />
          ))}
        </div>
      </div>

      {isCompare && <ComparisonPanel cmp={(result as PoemComparison).comparison} />}

      {result.issues.length > 0 ? (
        <div className="ai-issues-section">
          <h4 className="ai-issues-heading">
            Feedback <span className="ai-issues-count">{result.issues.length}</span>
          </h4>
          <div className="ai-issues-list">
            {result.issues.map((iss) => (
              <IssueCard key={iss.id} issue={iss} onJump={onJump} />
            ))}
          </div>
        </div>
      ) : (
        <p className="ai-no-issues muted small">No specific issues — looking strong.</p>
      )}

      <p className="ai-meta muted small">
        Model: {result.meta.model} ·{" "}
        {new Date(result.meta.analyzedAt).toLocaleString(undefined, {
          dateStyle: "medium", timeStyle: "short",
        })}
      </p>
    </div>
  );
}

// ---- main component ---- //
export interface AiAnalysisProps {
  title: string;
  lines: string[];
  onJumpToLine?: (line: number) => void;
}

export function AiAnalysis({ title, lines, onJumpToLine }: AiAnalysisProps) {
  const [model, setModel] = useState(loadStoredModel);
  const [mode, setMode] = useState<"fresh" | "compare">("fresh");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<PoemAnalysis | PoemComparison | null>(null);
  const [savedResult, setSavedResult] = useState<PoemAnalysis | null>(null);
  const [savedLines, setSavedLines] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isUnconfigured, setIsUnconfigured] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const saveModel = useCallback((val: string) => {
    setModel(val);
    tryLocalStorageSetItem(LS_KEY_MODEL, val);
  }, []);

  const canCompare = savedResult !== null && savedLines.length > 0;
  const hasPoem = lines.some((l) => l.trim().length > 0);

  const handleAnalyze = useCallback(async () => {
    if (!hasPoem) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("loading");
    setErrorMsg("");

    try {
      if (mode === "compare" && canCompare) {
        const res = await comparePoem(
          {
            title,
            lines,
            previousLines: savedLines,
            previousScores: {
              overall_score: savedResult!.overall_score,
              dimensions: savedResult!.dimensions,
            },
          },
          model,
          ctrl.signal,
        );
        setResult(res);
        // Update the saved baseline to the new version
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

  const effectiveMode = mode === "compare" && canCompare ? "compare" : "fresh";

  return (
    <section className="ai-analysis-section" aria-label="AI poem analysis">
      <div className="ai-analysis-header">
        <div className="ai-analysis-title-cluster">
          <h2 className="ai-analysis-title">AI Analysis</h2>
          <span className="ai-analysis-badge">OpenAI</span>
        </div>

        <div className="ai-analysis-header-actions">
          {/* Mode toggle */}
          <div className="ai-mode-toggle" role="group" aria-label="Analysis mode">
            <button
              type="button"
              className={`ai-mode-btn ${effectiveMode === "fresh" ? "is-active" : ""}`}
              onClick={() => setMode("fresh")}
              title="Analyze from scratch"
            >
              Fresh
            </button>
            <button
              type="button"
              className={`ai-mode-btn ${effectiveMode === "compare" ? "is-active" : ""}`}
              onClick={() => setMode("compare")}
              disabled={!canCompare}
              title={
                canCompare
                  ? "Compare current version to previous analysis"
                  : "Run a Fresh analysis first to enable comparison"
              }
            >
              Compare
            </button>
          </div>

          <label className="ai-model-label">
            <span className="ai-model-label-text">Model</span>
            <select className="ai-model-select" value={model}
              onChange={(e) => saveModel(e.target.value)}>
              <option value="gpt-4o-mini">gpt-4o-mini (fast)</option>
              <option value="gpt-4o">gpt-4o (nuanced)</option>
            </select>
          </label>

          <button
            type="button"
            className="small-btn small-btn-primary ai-analyze-btn"
            onClick={() => void handleAnalyze()}
            disabled={!hasPoem || status === "loading"}
            title={!hasPoem ? "Write some lines first" : undefined}
          >
            {status === "loading"
              ? "Analyzing…"
              : effectiveMode === "compare"
                ? "Compare versions"
                : "Analyze poem"}
          </button>
        </div>
      </div>

      {effectiveMode === "compare" && canCompare && (
        <p className="ai-compare-hint muted small">
          Comparing to your previous submission — the model will score the current
          version and highlight what changed.
        </p>
      )}

      {isUnconfigured && (
        <div className="ai-unconfigured" role="status">
          <p className="ai-unconfigured-text">
            AI analysis is not available — the server is not configured with an OpenAI API key.
          </p>
        </div>
      )}

      {!isUnconfigured && status === "idle" && !result && (
        <p className="ai-idle-hint muted small">
          Click &ldquo;Analyze poem&rdquo; to get scores and line-level feedback from AI.
          After the first run, &ldquo;Compare&rdquo; shows what improved between drafts.
        </p>
      )}

      {status === "loading" && (
        <div className="ai-loading" role="status" aria-live="polite">
          <span className="ai-loading-dot" aria-hidden />
          <span className="ai-loading-dot" aria-hidden />
          <span className="ai-loading-dot" aria-hidden />
          <span className="sr-only">Analyzing poem…</span>
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
        <AnalysisResults
          result={result}
          previous={effectiveMode === "compare" ? savedResult : null}
          onJump={onJumpToLine}
        />
      )}
    </section>
  );
}
