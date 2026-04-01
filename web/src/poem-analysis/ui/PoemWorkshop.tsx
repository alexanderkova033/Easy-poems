import type { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnalyzeSuccessResponse } from "@poem-analysis/domain/analysis-types";
import {
  loadDraft,
  migrateLegacyDraftIfNeeded,
  saveDraft,
  type DraftState,
  type SpellMode,
} from "../../poem-draft/local-draft-storage";
import {
  addToPersonalDictionary,
  ignoreWordForSession,
  loadPersonalDictionary,
  loadSessionIgnores,
} from "../../spellcheck/personal-dictionary";
import { loadEnglishWordlist } from "../../spellcheck/wordlist";
import { scanLinesForSpelling } from "../../spellcheck/scan";
import { focusLineInEditor, linesFromBody } from "../../writing-tools/line-model";
import { computeDocumentStats } from "../../writing-tools/line-stats";
import { findRepeatedWords } from "../../writing-tools/repeated-words";
import { roughRhymeClusters } from "../../writing-tools/rhyme-hints";
import {
  AnalyzeRequestError,
  analyzePoemViaHttp,
} from "../adapters/http-analyze-poem";
import { PoemBodyEditor } from "./PoemBodyEditor";
import "./PoemWorkshop.css";

function formatWhen(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PoemWorkshop() {
  const [title, setTitle] = useState("");
  const [formNote, setFormNote] = useState("");
  const [body, setBody] = useState("");
  const [spellMode, setSpellMode] = useState<SpellMode>("permissive");
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | undefined>();
  const [result, setResult] = useState<AnalyzeSuccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [wordlist, setWordlist] = useState<Set<string> | null>(null);
  const [wordlistErr, setWordlistErr] = useState<string | null>(null);
  const [spellBump, setSpellBump] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    migrateLegacyDraftIfNeeded();
    const d = loadDraft();
    if (d) {
      setTitle(d.title);
      setBody(d.body);
      setFormNote(d.form ?? "");
      setSpellMode(d.spellMode ?? "permissive");
      setLastAnalyzedAt(d.lastAnalyzedAt);
    }
  }, []);

  useEffect(() => {
    void loadEnglishWordlist()
      .then((w) => {
        setWordlist(w);
        setWordlistErr(null);
      })
      .catch((e) => {
        setWordlistErr(e instanceof Error ? e.message : "Could not load word list.");
      });
  }, []);

  const persist = useCallback((next: DraftState) => {
    saveDraft(next);
    setSavedFlash(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedFlash(false), 900);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      persist({
        title,
        body,
        form: formNote.trim() || undefined,
        spellMode,
        lastAnalyzedAt,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [title, body, formNote, spellMode, lastAnalyzedAt, persist]);

  const lines = useMemo(() => linesFromBody(body), [body]);
  const docStats = useMemo(() => computeDocumentStats(body), [body]);
  const rhymeClusters = useMemo(() => roughRhymeClusters(lines), [lines]);
  const repeated = useMemo(() => findRepeatedWords(lines), [lines]);
  const maxSyllables = useMemo(
    () => Math.max(1, ...docStats.lines.map((l) => l.syllables)),
    [docStats.lines],
  );

  const spellHits = useMemo(() => {
    if (!wordlist) return [];
    return scanLinesForSpelling(
      lines,
      wordlist,
      loadPersonalDictionary(),
      loadSessionIgnores(),
      spellMode,
    );
  }, [lines, wordlist, spellMode, spellBump]);

  const goToLine = useCallback((line1Based: number) => {
    const view = editorViewRef.current;
    if (!view) return;
    focusLineInEditor(view, line1Based);
  }, []);

  const refreshSpell = useCallback(() => {
    setSpellBump((n) => n + 1);
  }, []);

  const onAnalyze = async () => {
    setError(null);
    const ls = linesFromBody(body);
    const nonEmpty = ls.some((l) => l.trim().length > 0);
    if (!nonEmpty) {
      setError("Add at least one non-empty line before analyzing.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzePoemViaHttp({
        title: title.trim() || undefined,
        lines: ls,
      });
      setResult(data);
      const at = data.meta.analyzedAt;
      setLastAnalyzedAt(at);
      persist({
        title,
        body,
        form: formNote.trim() || undefined,
        spellMode,
        lastAnalyzedAt: at,
      });
    } catch (e) {
      if (e instanceof AnalyzeRequestError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : "Analysis failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const whenLabel = formatWhen(lastAnalyzedAt);

  return (
    <div className="poem-workshop">
      <header className="hero">
        <h1>Easy-poems</h1>
        <p className="tagline">
          Draft stays in your browser until you run analysis. Writing tools and
          spelling run locally in this tab.
        </p>
      </header>

      <div className="workshop-grid">
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
          <div className="row title-row">
            <label htmlFor="poem-form">Form / notes (optional)</label>
            <input
              id="poem-form"
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="e.g. sonnet, free verse"
              autoComplete="off"
            />
          </div>
          <div className="row body-row">
            <div className="body-label-row">
              <label id="poem-body-label" htmlFor="poem-body">
                Poem — one logical line per line break (line numbers match
                feedback)
              </label>
            </div>
            <PoemBodyEditor
              id="poem-body"
              aria-describedby="poem-body-hint"
              value={body}
              onChange={setBody}
              editorViewRef={editorViewRef}
              wordlist={wordlist}
              spellMode={spellMode}
              spellBump={spellBump}
            />
            <p id="poem-body-hint" className="field-hint">
              Unknown words show a wavy underline (local check). Blank lines
              count as lines. Use the line table to jump to a line.
            </p>
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
            <span
              className={`save-hint ${savedFlash ? "visible" : ""}`}
              aria-live="polite"
            >
              Saved locally
            </span>
            {whenLabel ? (
              <span className="last-run">
                Last analyzed:{" "}
                <time dateTime={lastAnalyzedAt}>{whenLabel}</time>
              </span>
            ) : (
              <span className="last-run muted">Not analyzed yet</span>
            )}
          </div>
          <div className="spell-mode-row" role="group" aria-label="Spelling mode">
            <span className="spell-mode-label">Spelling check</span>
            <label className="inline-radio">
              <input
                type="radio"
                name="spell-mode"
                checked={spellMode === "permissive"}
                onChange={() => setSpellMode("permissive")}
              />
              Permissive (fewer flags; good for dialect and names)
            </label>
            <label className="inline-radio">
              <input
                type="radio"
                name="spell-mode"
                checked={spellMode === "strict"}
                onChange={() => setSpellMode("strict")}
              />
              Strict
            </label>
          </div>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        <aside className="tools-panel" aria-label="Writing tools">
          <h2 className="tools-heading">Writing tools</h2>
          <p className="tools-disclaimer">
            Syllables and rhyme hints are <strong>approximate</strong> (English
            heuristics, not a full pronunciation dictionary).
          </p>

          <div className="tool-block">
            <h3>Totals</h3>
            <ul className="stat-chips">
              <li>
                <span className="chip-label">Lines</span>
                <span className="chip-val">{docStats.totalLines}</span>
              </li>
              <li>
                <span className="chip-label">Non-empty</span>
                <span className="chip-val">{docStats.nonEmptyLines}</span>
              </li>
              <li>
                <span className="chip-label">Words</span>
                <span className="chip-val">{docStats.totalWords}</span>
              </li>
              <li>
                <span className="chip-label">Characters</span>
                <span className="chip-val">{docStats.totalChars}</span>
              </li>
              <li>
                <span className="chip-label">Syllables (est.)</span>
                <span className="chip-val">{docStats.totalSyllables}</span>
              </li>
            </ul>
          </div>

          <div className="tool-block">
            <h3>Syllables per line (meter sketch)</h3>
            <p className="muted small">
              Bar length ∝ estimated syllables on that line (max {maxSyllables}{" "}
              in this draft).
            </p>
            <ul className="syllable-bars" aria-label="Syllable count by line">
              {docStats.lines.slice(0, 60).map((row) => (
                <li key={row.lineNumber}>
                  <span className="bar-label">L{row.lineNumber}</span>
                  <span
                    className="bar-track"
                    title={`Line ${row.lineNumber}: ~${row.syllables} syllables`}
                  >
                    <span
                      className="bar-fill"
                      style={{
                        width: `${Math.round((row.syllables / maxSyllables) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="bar-num">{row.syllables}</span>
                </li>
              ))}
            </ul>
            {docStats.lines.length > 60 ? (
              <p className="muted small">Showing first 60 lines.</p>
            ) : null}
          </div>

          <div className="tool-block">
            <h3>Line table</h3>
            <div className="table-wrap">
              <table className="line-table">
                <caption className="sr-only">
                  Per-line syllables, words, and characters
                </caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Syl.</th>
                    <th scope="col">Words</th>
                    <th scope="col">Chars</th>
                    <th scope="col">Jump</th>
                  </tr>
                </thead>
                <tbody>
                  {docStats.lines.slice(0, 80).map((row) => (
                    <tr key={row.lineNumber}>
                      <td>{row.lineNumber}</td>
                      <td>{row.syllables}</td>
                      <td>{row.words}</td>
                      <td>{row.chars}</td>
                      <td>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => goToLine(row.lineNumber)}
                        >
                          Line {row.lineNumber}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {docStats.lines.length > 80 ? (
              <p className="muted small">Showing first 80 lines.</p>
            ) : null}
          </div>

          <div className="tool-block">
            <h3>Rhyme hint (end letters)</h3>
            {rhymeClusters.length === 0 ? (
              <p className="muted small">
                No lines share a matching word ending yet (very rough signal).
              </p>
            ) : (
              <ul className="hint-list">
                {rhymeClusters.slice(0, 12).map((c) => (
                  <li key={c.ending}>
                    <span className="mono">…{c.ending}</span> — lines{" "}
                    {c.lineNumbers.join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="tool-block">
            <h3>Repeated words</h3>
            <p className="muted small">
              Common words filtered out. Longer tokens only.
            </p>
            {repeated.length === 0 ? (
              <p className="muted small">None detected in this draft.</p>
            ) : (
              <ul className="hint-list">
                {repeated.map((r) => (
                  <li key={r.word}>
                    <span className="mono">{r.word}</span> ×{r.count} — lines{" "}
                    {r.lines.join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="tool-block">
            <h3>Spelling</h3>
            {wordlistErr ? (
              <p className="error compact" role="alert">
                {wordlistErr}
              </p>
            ) : !wordlist ? (
              <p className="muted small">Loading dictionary…</p>
            ) : (
              <>
                <p className="muted small">
                  Uses a local word list + your personal dictionary. Unknown
                  words may be intentional (names, archaisms).
                </p>
                {spellHits.length === 0 ? (
                  <p className="muted small">No unknown tokens flagged.</p>
                ) : (
                  <ul className="spell-hits">
                    {spellHits.slice(0, 50).map((h) => (
                      <li key={`${h.lineNumber}-${h.normalized}`}>
                        <div className="spell-hit-head">
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => goToLine(h.lineNumber)}
                          >
                            Line {h.lineNumber}
                          </button>
                          <span className="mono">{h.word}</span>
                        </div>
                        {h.suggestions.length > 0 ? (
                          <p className="suggestions">
                            Try: {h.suggestions.join(", ")}
                          </p>
                        ) : null}
                        <div className="spell-actions">
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() => {
                              addToPersonalDictionary(h.normalized);
                              refreshSpell();
                            }}
                          >
                            Add to my dictionary
                          </button>
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() => {
                              ignoreWordForSession(h.normalized);
                              refreshSpell();
                            }}
                          >
                            Ignore this session
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {spellHits.length > 50 ? (
                  <p className="muted small">Showing first 50 hits.</p>
                ) : null}
              </>
            )}
          </div>
        </aside>
      </div>

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
                  <meter
                    min={1}
                    max={100}
                    low={35}
                    high={70}
                    optimum={85}
                    value={value}
                  >
                    {value}
                  </meter>
                  <span className="dim-num">{value}</span>
                </li>
              ))}
            </ul>
          </div>

          <h3>Issues</h3>
          {result.issues.length === 0 ? (
            <p className="muted">
              No issues returned — try editing and re-running.
            </p>
          ) : (
            <ul className="issues-details">
              {result.issues.map((issue) => (
                <li key={issue.id}>
                  <details>
                    <summary className="issue-summary">
                      <span className="issue-summary-text">
                        Lines {issue.line_start}
                        {issue.line_end !== issue.line_start
                          ? `–${issue.line_end}`
                          : ""}
                        {issue.excerpt ? (
                          <span className="excerpt-inline">
                            {" "}
                            — “{issue.excerpt}”
                          </span>
                        ) : null}
                      </span>
                    </summary>
                    <div className="issue-body">
                      <button
                        type="button"
                        className="small-btn issue-jump"
                        onClick={() => goToLine(issue.line_start)}
                      >
                        Go to line {issue.line_start}
                      </button>
                      <p className="rationale">{issue.rationale}</p>
                      <ul className="improvements">
                        {issue.improvements.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
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
          for that request. See{" "}
          <a
            href="https://openai.com/policies/api-data-usage-policies"
            target="_blank"
            rel="noreferrer"
          >
            OpenAI API data usage policies
          </a>{" "}
          and your deployment&apos;s terms. Do not use this tool to generate
          or refine content that harasses, sexualizes minors, or otherwise
          violates OpenAI&apos;s or your host&apos;s policies; the model may
          refuse analysis and the app will show a short explanation.
        </p>
      </footer>
    </div>
  );
}
