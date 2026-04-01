import type { EditorView } from "@codemirror/view";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  buildMarkdownPoem,
  buildPlainTextTitleBody,
  copyTextToClipboard,
  downloadTextFile,
  exportFilename,
} from "../../poem-draft/export-poem";
import {
  loadDraft,
  migrateLegacyDraftIfNeeded,
  saveDraft,
  type DraftState,
  type SpellMode,
} from "../../poem-draft/local-draft-storage";
import {
  addRevision,
  loadRevisions,
  type RevisionSnapshot,
  removeRevision,
} from "../../poem-draft/revision-snapshots";
import {
  loadWorkshopGoals,
  saveWorkshopGoals,
  type WorkshopGoals,
} from "../../poem-draft/workshop-goals";
import {
  addToPersonalDictionary,
  ignoreWordForSession,
  loadPersonalDictionary,
  loadSessionIgnores,
} from "../../spellcheck/personal-dictionary";
import { loadEnglishWordlist } from "../../spellcheck/wordlist";
import { scanLinesForSpelling } from "../../spellcheck/scan";
import { evaluateGoals } from "../../writing-tools/goal-metrics";
import { focusLineInEditor, linesFromBody } from "../../writing-tools/line-model";
import { computeDocumentStats } from "../../writing-tools/line-stats";
import { findRepeatedWords } from "../../writing-tools/repeated-words";
import { buildPublicationChecklist } from "../../writing-tools/publication-checklist";
import {
  lightVowelTailClusters,
  roughRhymeClusters,
} from "../../writing-tools/rhyme-hints";
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

function formatSnapshotWhen(iso: string): string {
  return formatWhen(iso) ?? iso;
}

function parseGoalInput(raw: string): number | undefined {
  const v = raw.trim();
  if (v === "") return undefined;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

export function PoemWorkshop() {
  const [title, setTitle] = useState("");
  const [formNote, setFormNote] = useState("");
  const [body, setBody] = useState("");
  const [spellMode, setSpellMode] = useState<SpellMode>("permissive");
  const [savedFlash, setSavedFlash] = useState(false);
  const [wordlist, setWordlist] = useState<Set<string> | null>(null);
  const [wordlistErr, setWordlistErr] = useState<string | null>(null);
  const [spellBump, setSpellBump] = useState(0);
  const [revisions, setRevisions] = useState<RevisionSnapshot[]>(() =>
    loadRevisions(),
  );
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [compareLeftId, setCompareLeftId] = useState("");
  const [compareRightId, setCompareRightId] = useState("");
  const [goals, setGoals] = useState<WorkshopGoals>(() => loadWorkshopGoals());
  const [copyExportFlash, setCopyExportFlash] = useState(false);
  const copyExportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compareIdsSeeded = useRef(false);
  const editorViewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    migrateLegacyDraftIfNeeded();
    const d = loadDraft();
    if (d) {
      setTitle(d.title);
      setBody(d.body);
      setFormNote(d.form ?? "");
      setSpellMode(d.spellMode ?? "permissive");
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

  useEffect(() => {
    saveWorkshopGoals(goals);
  }, [goals]);

  useEffect(() => {
    if (compareIdsSeeded.current || revisions.length === 0) return;
    compareIdsSeeded.current = true;
    setCompareLeftId(revisions[0]!.id);
    setCompareRightId(revisions[1]?.id ?? revisions[0]!.id);
  }, [revisions]);

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
      });
    }, 500);
    return () => clearTimeout(t);
  }, [title, body, formNote, spellMode, persist]);

  const lines = useMemo(() => linesFromBody(body), [body]);
  const docStats = useMemo(() => computeDocumentStats(body), [body]);
  const rhymeClusters = useMemo(() => roughRhymeClusters(lines), [lines]);
  const vowelTailClusters = useMemo(
    () => lightVowelTailClusters(lines),
    [lines],
  );
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

  const goalEvaluation = useMemo(
    () => evaluateGoals(docStats, goals),
    [docStats, goals],
  );

  const publication = useMemo(
    () =>
      buildPublicationChecklist({
        title,
        docStats,
        spellingFlagCount: spellHits.length,
        wordlistReady: Boolean(wordlist),
        goalEvaluation,
      }),
    [title, docStats, spellHits.length, wordlist, goalEvaluation],
  );

  const compareLeft = useMemo(
    () => revisions.find((s) => s.id === compareLeftId),
    [revisions, compareLeftId],
  );
  const compareRight = useMemo(
    () => revisions.find((s) => s.id === compareRightId),
    [revisions, compareRightId],
  );

  const goToLine = useCallback((line1Based: number) => {
    const view = editorViewRef.current;
    if (!view) return;
    focusLineInEditor(view, line1Based);
  }, []);

  const refreshSpell = useCallback(() => {
    setSpellBump((n) => n + 1);
  }, []);

  const saveSnapshot = useCallback(() => {
    const next = addRevision(revisions, {
      title,
      body,
      form: formNote.trim() || undefined,
      label: snapshotLabel.trim() || undefined,
    });
    setRevisions(next);
    setSnapshotLabel("");
    setCompareLeftId((left) =>
      left && next.some((s) => s.id === left) ? left : (next[0]?.id ?? ""),
    );
    setCompareRightId((right) => {
      if (right && next.some((s) => s.id === right)) return right;
      return next[1]?.id ?? next[0]?.id ?? "";
    });
  }, [revisions, title, body, formNote, snapshotLabel]);

  const restoreRevision = useCallback(
    (snap: RevisionSnapshot) => {
      if (
        !window.confirm(
          "Replace the current draft with this snapshot? You can save a snapshot first if you need the current text.",
        )
      ) {
        return;
      }
      setTitle(snap.title);
      setBody(snap.body);
      setFormNote(snap.form ?? "");
    },
    [],
  );

  const deleteRevision = useCallback(
    (id: string) => {
      const next = removeRevision(revisions, id);
      setRevisions(next);
      if (next.length === 0) {
        setCompareLeftId("");
        setCompareRightId("");
        compareIdsSeeded.current = false;
        return;
      }
      let newLeft = compareLeftId;
      let newRight = compareRightId;
      if (!next.some((s) => s.id === newLeft)) newLeft = next[0]!.id;
      if (!next.some((s) => s.id === newRight)) {
        newRight = next.find((s) => s.id !== newLeft)?.id ?? next[0]!.id;
      }
      if (newLeft === newRight) {
        newRight = next.find((s) => s.id !== newLeft)?.id ?? newRight;
      }
      setCompareLeftId(newLeft);
      setCompareRightId(newRight);
    },
    [revisions, compareLeftId, compareRightId],
  );

  const onDownloadTxt = useCallback(() => {
    const text = buildPlainTextTitleBody(
      title,
      formNote.trim() || undefined,
      body,
    );
    downloadTextFile(exportFilename(title, "txt"), text);
  }, [title, formNote, body]);

  const onDownloadMd = useCallback(() => {
    const text = buildMarkdownPoem(
      title,
      formNote.trim() || undefined,
      body,
    );
    downloadTextFile(exportFilename(title, "md"), text);
  }, [title, formNote, body]);

  const onCopyMarkdown = useCallback(async () => {
    const text = buildMarkdownPoem(
      title,
      formNote.trim() || undefined,
      body,
    );
    await copyTextToClipboard(text);
    setCopyExportFlash(true);
    if (copyExportTimer.current) clearTimeout(copyExportTimer.current);
    copyExportTimer.current = setTimeout(() => setCopyExportFlash(false), 1200);
  }, [title, formNote, body]);

  const updateGoal =
    (key: keyof WorkshopGoals) => (e: ChangeEvent<HTMLInputElement>) => {
      const v = parseGoalInput(e.target.value);
      setGoals((g) => ({ ...g, [key]: v }));
    };

  return (
    <div className="poem-workshop">
      <header className="hero">
        <h1>Easy-poems</h1>
        <p className="tagline">
          Draft stays in this browser. Writing tools and spelling run locally in
          this tab—use export or ChatGPT when you want outside feedback.
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
          <div className="toolbar toolbar-saved">
            <span
              className={`save-hint ${savedFlash ? "visible" : ""}`}
              aria-live="polite"
            >
              Saved locally
            </span>
          </div>
          <div className="export-row" aria-label="Export poem">
            <span className="export-label">Export</span>
            <button type="button" className="small-btn" onClick={onDownloadTxt}>
              Download .txt
            </button>
            <button type="button" className="small-btn" onClick={onDownloadMd}>
              Download .md
            </button>
            <button type="button" className="small-btn" onClick={() => void onCopyMarkdown()}>
              Copy Markdown
            </button>
            <span
              className={`export-copied ${copyExportFlash ? "visible" : ""}`}
              aria-live="polite"
            >
              Copied
            </span>
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

          <div className="revision-section" aria-label="Revision history">
            <h3 className="revision-section-title">Revision snapshots</h3>
            <p className="muted small">
              Saved in this browser only ({revisions.length}/
              50). Use before big edits or experiments.
            </p>
            <div className="snapshot-save-row">
              <input
                type="text"
                className="snapshot-label-input"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="Optional label (e.g. “v2 opening”)"
                autoComplete="off"
                aria-label="Snapshot label"
              />
              <button type="button" className="small-btn" onClick={saveSnapshot}>
                Save snapshot
              </button>
            </div>
            {revisions.length === 0 ? (
              <p className="muted small">No snapshots yet.</p>
            ) : (
              <ul className="revision-list">
                {revisions.map((s) => (
                  <li key={s.id} className="revision-list-item">
                    <div className="revision-meta">
                      <span className="revision-when">
                        {formatSnapshotWhen(s.createdAt)}
                      </span>
                      {s.label ? (
                        <span className="revision-label">{s.label}</span>
                      ) : null}
                    </div>
                    <div className="revision-actions">
                      <button
                        type="button"
                        className="linkish"
                        onClick={() => restoreRevision(s)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="linkish danger-link"
                        onClick={() => {
                          if (window.confirm("Delete this snapshot?")) {
                            deleteRevision(s.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <h4 className="tool-subheading">Compare snapshots</h4>
            {revisions.length < 2 ? (
              <p className="muted small">
                Save at least two snapshots to compare bodies side by side.
              </p>
            ) : (
              <>
                <div className="compare-select-row">
                  <label className="compare-select">
                    <span className="sr-only">Left snapshot</span>
                    <span className="compare-select-label" aria-hidden>
                      A
                    </span>
                    <select
                      value={compareLeftId}
                      onChange={(e) => setCompareLeftId(e.target.value)}
                      aria-label="Left snapshot for compare"
                    >
                      {revisions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatSnapshotWhen(s.createdAt)}
                          {s.label ? ` — ${s.label}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="compare-select">
                    <span className="sr-only">Right snapshot</span>
                    <span className="compare-select-label" aria-hidden>
                      B
                    </span>
                    <select
                      value={compareRightId}
                      onChange={(e) => setCompareRightId(e.target.value)}
                      aria-label="Right snapshot for compare"
                    >
                      {revisions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatSnapshotWhen(s.createdAt)}
                          {s.label ? ` — ${s.label}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {compareLeftId === compareRightId ? (
                  <p className="muted small">
                    Choose two different snapshots to see a side-by-side diff
                    view.
                  </p>
                ) : (
                  <div className="compare-panels" aria-label="Snapshot bodies">
                    <pre className="compare-pre">{compareLeft?.body ?? ""}</pre>
                    <pre className="compare-pre">{compareRight?.body ?? ""}</pre>
                  </div>
                )}
              </>
            )}
          </div>

          <div
            className="external-ai-guide"
            aria-label="Get feedback with ChatGPT"
          >
            <h3 className="external-ai-guide-title">Free feedback with ChatGPT</h3>
            <p className="muted small external-ai-guide-lead">
              Your draft stays in this tab until you copy it. ChatGPT runs at
              OpenAI in another tab—you can paste your poem there for feedback.
            </p>
            <ol className="external-ai-guide-steps">
              <li>
                Click <strong>Open ChatGPT</strong> (new tab). Sign in if asked.
              </li>
              <li>
                Copy your title and poem from above, then paste into ChatGPT.
              </li>
              <li>
                Try a prompt like: &quot;You are a thoughtful poetry reader.
                Comment on imagery, sound, clarity, and form. Be constructive.&quot;
              </li>
            </ol>
            <p className="external-ai-guide-actions">
              <a
                className="secondary-link"
                href="https://chat.openai.com/"
                target="_blank"
                rel="noreferrer"
              >
                Open ChatGPT
              </a>
            </p>
          </div>
        </section>

        <aside className="tools-panel" aria-label="Writing tools">
          <h2 className="tools-heading">Writing tools</h2>
          <p className="tools-disclaimer">
            Syllables and rhyme hints are <strong>approximate</strong> (English
            heuristics, not a full pronunciation dictionary).
          </p>

          <div className="tool-block">
            <h3>Goals</h3>
            <p className="muted small">
              Optional targets. Leave blank to ignore. Warnings show below and in
              the checklist.
            </p>
            <div className="goal-grid">
              <label className="goal-field">
                Min lines
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={goals.minLines ?? ""}
                  onChange={updateGoal("minLines")}
                />
              </label>
              <label className="goal-field">
                Max lines
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={goals.maxLines ?? ""}
                  onChange={updateGoal("maxLines")}
                />
              </label>
              <label className="goal-field">
                Min words
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={goals.minWords ?? ""}
                  onChange={updateGoal("minWords")}
                />
              </label>
              <label className="goal-field">
                Max words
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={goals.maxWords ?? ""}
                  onChange={updateGoal("maxWords")}
                />
              </label>
              <label className="goal-field goal-field-span">
                Max syllables / line (est.)
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={goals.maxSyllablesPerLine ?? ""}
                  onChange={updateGoal("maxSyllablesPerLine")}
                  placeholder="Flags heavy lines"
                />
              </label>
            </div>
            {goalEvaluation.warnings.length > 0 ? (
              <ul className="goal-warnings">
                {goalEvaluation.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : Object.values(goals).some((v) => v != null) ? (
              <p className="muted small">Within your set targets.</p>
            ) : null}
          </div>

          <div className="tool-block">
            <h3>Publication checklist</h3>
            <p className="muted small">
              Local checks only — not legal or editorial approval.
            </p>
            <ul className="checklist" aria-label="Publication readiness">
              {publication.items.map((item) => (
                <li
                  key={item.text}
                  className={`checklist-item ${item.done ? "done" : "open"}`}
                >
                  <span className="checklist-mark" aria-hidden>
                    {item.done ? "✓" : "○"}
                  </span>
                  <span className="checklist-text">
                    {item.text}
                    {item.detail ? (
                      <span className="checklist-detail"> — {item.detail}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="checklist-tips">
              {publication.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>

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
            <h3>Rhyme &amp; sound hints</h3>
            <p className="muted small">
              Spelling-based only, not pronunciation. False positives are
              normal.
            </p>
            <h4 className="tool-subheading">Shared last letters</h4>
            {rhymeClusters.length === 0 ? (
              <p className="muted small">
                No lines share the same final letter pattern yet.
              </p>
            ) : (
              <ul className="hint-list">
                {rhymeClusters.slice(0, 10).map((c) => (
                  <li key={c.ending}>
                    <span className="mono">…{c.ending}</span> — lines{" "}
                    {c.lineNumbers.join(", ")}
                  </li>
                ))}
              </ul>
            )}
            <h4 className="tool-subheading">Shared “vowel tail”</h4>
            <p className="muted small">
              Same text from the <strong>last vowel</strong> onward (slant /
              eye-rhyme style hint).
            </p>
            {vowelTailClusters.length === 0 ? (
              <p className="muted small">No matching vowel tails yet.</p>
            ) : (
              <ul className="hint-list">
                {vowelTailClusters.slice(0, 10).map((c) => (
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

      <footer className="privacy">
        <h2 className="privacy-title">Privacy</h2>
        <p>
          Your draft, snapshots, goals, and spelling dictionary live only in this
          browser (local storage on your device). This workshop page does not
          send your poem text to Easy-poems servers. If you use{" "}
          <strong>Export</strong> or copy text elsewhere (for example into
          ChatGPT), that destination has its own privacy terms.
        </p>
      </footer>
    </div>
  );
}
