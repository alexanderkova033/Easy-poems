import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyzeSuccessResponse } from "../../server/types/analyze";
import { analyzePoem } from "./analyzeApi";
import { loadDraft, saveDraft, type DraftState } from "./draftStorage";
import "./App.css";

function linesFromBody(body: string): string[] {
  const raw = body.split("\n");
  if (raw.length === 0) return [""];
  return raw;
}

function formatWhen(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function App() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | undefined>();
  const [result, setResult] = useState<AnalyzeSuccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setTitle(d.title);
      setBody(d.body);
      setLastAnalyzedAt(d.lastAnalyzedAt);
    }
  }, []);

  const persist = useCallback((next: DraftState) => {
    saveDraft(next);
    setSavedFlash(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedFlash(false), 900);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      persist({ title, body, lastAnalyzedAt });
    }, 500);
    return () => clearTimeout(t);
  }, [title, body, lastAnalyzedAt, persist]);

  const onAnalyze = async () => {
    setError(null);
    const lines = linesFromBody(body);
    const nonEmpty = lines.some((l) => l.trim().length > 0);
    if (!nonEmpty) {
      setError("Add at least one non-empty line before analyzing.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzePoem({
        title: title.trim() || undefined,
        lines,
      });
      setResult(data);
      const at = data.meta.analyzedAt;
      setLastAnalyzedAt(at);
      persist({ title, body, lastAnalyzedAt: at });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const whenLabel = formatWhen(lastAnalyzedAt);

  return (
    <div className="app">
      <header className="hero">
        <h1>Easy-poems</h1>
        <p className="tagline">
          Draft stays in your browser until you run analysis.
        </p>
      </header>

      <section className="editor-panel" aria-label="Poem editor">
        <div className="row title-row">
          <label htmlFor="poem-title">Title</label>
          <input
            id="poem-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional"
            autoComplete="off"
          />
        </div>
        <div className="row body-row">
          <label htmlFor="poem-body">Poem (one line per visual line)</label>
          <textarea
            id="poem-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            spellCheck
            placeholder="Each newline is a new line number for feedback."
          />
        </div>
        <div className="toolbar">
          <button
            type="button"
            className="primary"
            onClick={() => void onAnalyze()}
            disabled={loading}
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          <span className={`save-hint ${savedFlash ? "visible" : ""}`} aria-live="polite">
            Saved locally
          </span>
          {whenLabel ? (
            <span className="last-run">
              Last analyzed: <time dateTime={lastAnalyzedAt}>{whenLabel}</time>
            </span>
          ) : (
            <span className="last-run muted">Not analyzed yet</span>
          )}
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {result ? (
        <section className="results" aria-label="Analysis results">
          <h2>Results</h2>
          <p className="model-meta">
            Model: <code>{result.meta.model}</code>
          </p>
          <div className="score-block">
            <div className="overall">
              <span className="label">Overall</span>
              <span className="score">{result.overall_score}</span>
              <span className="suffix">/ 100</span>
            </div>
            <ul className="dimensions">
              {(
                [
                  ["Imagery", result.dimensions.imagery],
                  ["Musicality", result.dimensions.musicality],
                  ["Originality", result.dimensions.originality],
                  ["Clarity", result.dimensions.clarity],
                ] as const
              ).map(([label, value]) => (
                <li key={label}>
                  <span>{label}</span>
                  <meter min={1} max={100} low={35} high={70} optimum={85} value={value}>
                    {value}
                  </meter>
                  <span className="dim-num">{value}</span>
                </li>
              ))}
            </ul>
          </div>

          <h3>Issues</h3>
          {result.issues.length === 0 ? (
            <p className="muted">No issues returned — try editing and re-running.</p>
          ) : (
            <ol className="issues">
              {result.issues.map((issue) => (
                <li key={issue.id}>
                  <div className="issue-head">
                    Lines {issue.line_start}
                    {issue.line_end !== issue.line_start
                      ? `–${issue.line_end}`
                      : ""}
                    {issue.excerpt ? (
                      <span className="excerpt">“{issue.excerpt}”</span>
                    ) : null}
                  </div>
                  <p className="rationale">{issue.rationale}</p>
                  <ul className="improvements">
                    {issue.improvements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      <footer className="privacy">
        <h2 className="privacy-title">Privacy</h2>
        <p>
          Your draft is stored only in this browser until you click{" "}
          <strong>Analyze</strong>. Then the title and lines are sent to this
          app&apos;s server and onward to{" "}
          <a
            href="https://openai.com/policies"
            target="_blank"
            rel="noreferrer"
          >
            OpenAI
          </a>{" "}
          for that request. See your deployment&apos;s terms and OpenAI&apos;s
          API data policies.
        </p>
      </footer>
    </div>
  );
}
