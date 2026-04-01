import type { EditorView } from "@codemirror/view";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { diffPoemLines } from "../../../domain/draft/diff-lines";
import {
  buildMarkdownPoem,
  buildPlainTextTitleBody,
  copyTextToClipboard,
  downloadDocxFile,
  downloadTextFile,
  exportFilename,
} from "../../../domain/draft/export-poem";
import {
  loadDraft,
  migrateLegacyDraftIfNeeded,
  saveDraft,
  type DraftState,
  type SpellMode,
} from "../../../domain/draft/local-draft-storage";
import {
  addRevision,
  loadRevisions,
  type RevisionSnapshot,
  removeRevision,
} from "../../../domain/draft/revision-snapshots";
import {
  loadWorkshopGoals,
  saveWorkshopGoals,
  type WorkshopGoals,
} from "../../../domain/draft/workshop-goals";
import {
  addToPersonalDictionary,
  ignoreWordForSession,
  loadPersonalDictionary,
  loadSessionIgnores,
} from "../../../domain/spellcheck/personal-dictionary";
import { loadEnglishWordlist } from "../../../domain/spellcheck/wordlist";
import { scanLinesForSpelling } from "../../../domain/spellcheck/scan";
import { evaluateGoals } from "../../../domain/writing/goal-metrics";
import { linesFromBody } from "../../../domain/writing/lines-from-body";
import { computeDocumentStats } from "../../../domain/writing/line-stats";
import { findRepeatedWords } from "../../../domain/writing/repeated-words";
import { buildPublicationChecklist } from "../../../domain/writing/publication-checklist";
import {
  lightVowelTailClusters,
  roughRhymeClusters,
} from "../../../domain/writing/rhyme-hints";
import { focusLineInEditor } from "../../../infrastructure/editor/focus-line-in-editor";
import { PoemBodyEditor } from "./PoemBodyEditor";
import "./PoemWorkshop.css";

const COMPARE_CURRENT_ID = "__current__";

function compareBodyForId(
  id: string,
  currentBody: string,
  revisions: RevisionSnapshot[],
): string {
  if (id === COMPARE_CURRENT_ID) return currentBody;
  return revisions.find((s) => s.id === id)?.body ?? "";
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

type ToolTab =
  | "totals"
  | "goals"
  | "checklist"
  | "lines"
  | "rhyme"
  | "repeat"
  | "spell";

function IconTabTotals() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        d="M5 5.5h5.5M5 12h14M5 18.5h9M16.5 8v6.5m-3.25-3.25h6.5"
      />
    </svg>
  );
}

function IconTabGoals() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.65" />
      <circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function IconTabChecklist() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
        d="M8 6.5h11M8 12h11M8 17.5h11M5.25 6.5l.9 1 1.35-2M5.25 12l.9 1 1.35-2M5.25 17.5l.9 1 1.35-2"
      />
    </svg>
  );
}

function IconTabLines() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
        d="M5 6.5h3v3H5zm6 0h9m-9 5.5h9m-9 5.5h9M5 15v3h3v-3z"
      />
    </svg>
  );
}

function IconTabRhyme() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        d="M8.3 10.2a3.6 3.6 0 104.8 4.4M15.7 13.8a3.6 3.6 0 10-4.8-4.4"
      />
    </svg>
  );
}

function IconTabRepeat() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 5.5h3v3M8 18.5H5v-3m0-5.5a7.5 7.5 0 0112.85-5.3M19 12a7.5 7.5 0 01-12.85 5.3"
      />
    </svg>
  );
}

function IconTabSpell() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 18.5V6.5l5.5 3.2L16 6.5v12M11 9.2V19"
      />
    </svg>
  );
}

const LINES_TABLE_MAX = 400;

const TOOL_TABS: {
  id: ToolTab;
  label: string;
  Icon: () => JSX.Element;
}[] = [
  { id: "totals", label: "Totals", Icon: IconTabTotals },
  { id: "spell", label: "Spell", Icon: IconTabSpell },
  { id: "lines", label: "Lines", Icon: IconTabLines },
  { id: "rhyme", label: "Sound", Icon: IconTabRhyme },
  { id: "repeat", label: "Repeats", Icon: IconTabRepeat },
  { id: "goals", label: "Goals", Icon: IconTabGoals },
  { id: "checklist", label: "Ready", Icon: IconTabChecklist },
];

function LiveSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="tool-heading-live">
      <span className="live-dot" aria-hidden />
      <span className="tool-heading-live-text">{children}</span>
      <span className="live-badge">From draft</span>
    </h3>
  );
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
  const [compareLeftId, setCompareLeftId] = useState(COMPARE_CURRENT_ID);
  const [compareRightId, setCompareRightId] = useState(COMPARE_CURRENT_ID);
  const [compareViewMode, setCompareViewMode] = useState<"side" | "diff">(
    "side",
  );
  const [goals, setGoals] = useState<WorkshopGoals>(() => loadWorkshopGoals());
  const [copyExportFlash, setCopyExportFlash] = useState(false);
  const [docxExportErr, setDocxExportErr] = useState<string | null>(null);
  const copyExportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [toolTab, setToolTab] = useState<ToolTab>("totals");

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
    setCompareLeftId((left) => {
      if (left === COMPARE_CURRENT_ID) return left;
      return revisions.some((s) => s.id === left) ? left : COMPARE_CURRENT_ID;
    });
    setCompareRightId((right) => {
      if (right === COMPARE_CURRENT_ID) return right;
      if (revisions.some((s) => s.id === right)) return right;
      return revisions[0]?.id ?? COMPARE_CURRENT_ID;
    });
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

  const compareLeftBody = useMemo(
    () => compareBodyForId(compareLeftId, body, revisions),
    [compareLeftId, body, revisions],
  );
  const compareRightBody = useMemo(
    () => compareBodyForId(compareRightId, body, revisions),
    [compareRightId, body, revisions],
  );

  const compareDiffRows = useMemo(() => {
    if (compareLeftId === compareRightId) return [];
    return diffPoemLines(compareLeftBody, compareRightBody);
  }, [
    compareLeftBody,
    compareRightBody,
    compareLeftId,
    compareRightId,
  ]);

  const compareSnapshotOptions = useMemo(() => {
    const opts: { id: string; label: string }[] = [
      { id: COMPARE_CURRENT_ID, label: "Current draft" },
      ...revisions.map((s) => ({
        id: s.id,
        label: `${formatSnapshotWhen(s.createdAt)}${s.label ? ` — ${s.label}` : ""}`,
      })),
    ];
    return opts;
  }, [revisions]);

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
      left === COMPARE_CURRENT_ID || (left && next.some((s) => s.id === left))
        ? left
        : COMPARE_CURRENT_ID,
    );
    setCompareRightId((right) => {
      if (right === COMPARE_CURRENT_ID) return right;
      if (right && next.some((s) => s.id === right)) return right;
      return next[0]?.id ?? COMPARE_CURRENT_ID;
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
        setCompareLeftId(COMPARE_CURRENT_ID);
        setCompareRightId(COMPARE_CURRENT_ID);
        return;
      }
      let newLeft = compareLeftId;
      let newRight = compareRightId;
      if (newLeft !== COMPARE_CURRENT_ID && !next.some((s) => s.id === newLeft)) {
        newLeft = COMPARE_CURRENT_ID;
      }
      if (newRight !== COMPARE_CURRENT_ID && !next.some((s) => s.id === newRight)) {
        newRight = next[0]!.id;
      }
      if (newLeft === COMPARE_CURRENT_ID && newRight === COMPARE_CURRENT_ID) {
        newRight = next[0]!.id;
      } else if (newLeft === newRight) {
        newRight =
          next.find((s) => s.id !== newLeft)?.id ?? COMPARE_CURRENT_ID;
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

  const onDownloadDocx = useCallback(async () => {
    setDocxExportErr(null);
    try {
      await downloadDocxFile(
        exportFilename(title, "docx"),
        title,
        formNote.trim() || undefined,
        body,
      );
    } catch (e) {
      setDocxExportErr(
        e instanceof Error ? e.message : "Could not build the Word file.",
      );
    }
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
          Local draft in this tab—export or paste out when you want feedback elsewhere.
        </p>
      </header>

      <nav className="feature-nav" aria-label="Jump to sections">
        <a className="feature-nav-link" href="#poem-draft">
          Draft
        </a>
        <a className="feature-nav-link" href="#writing-tools">
          Tools
        </a>
        <a className="feature-nav-link" href="#export-area">
          Export
        </a>
        <a className="feature-nav-link" href="#revision-compare">
          Compare
        </a>
      </nav>

      <div className="workshop-grid">
        <section
          className="editor-panel"
          aria-label="Poem editor"
          id="poem-draft"
        >
          <div className="row title-row">
            <label htmlFor="poem-title">Title</label>
            <input
              id="poem-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="row title-row">
            <label htmlFor="poem-form">Form (optional)</label>
            <input
              id="poem-form"
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="e.g. sonnet, free verse"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="row body-row">
            <div className="body-label-row">
              <label id="poem-body-label" htmlFor="poem-body">
                Poem <span className="label-hint">(one line per line break)</span>
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
              Browser underlines off—only the workshop wavy mark for unknown words.
            </p>
          </div>
          <div className="toolbar toolbar-saved">
            <span
              className={`save-hint ${savedFlash ? "visible" : ""}`}
              aria-live="polite"
            >
              Saved
            </span>
          </div>
          <div className="export-row" id="export-area" aria-label="Export poem">
            <span className="export-label">Export</span>
            <button type="button" className="small-btn" onClick={onDownloadTxt}>
              Download .txt
            </button>
            <button type="button" className="small-btn" onClick={onDownloadMd}>
              Download .md
            </button>
            <button
              type="button"
              className="small-btn small-btn-primary"
              onClick={() => void onDownloadDocx()}
            >
              Download Word (.docx)
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
            {docxExportErr ? (
              <p className="export-error compact" role="alert">
                {docxExportErr}
              </p>
            ) : null}
          </div>
          <div className="spell-mode-row" role="group" aria-label="Spelling mode">
            <span className="spell-mode-label">Spelling</span>
            <label
              className="inline-radio"
              title="Fewer flags—names, dialect, coinages"
            >
              <input
                type="radio"
                name="spell-mode"
                checked={spellMode === "permissive"}
                onChange={() => setSpellMode("permissive")}
              />
              Permissive
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

          <div
            className="revision-section"
            aria-label="Revision history"
            id="revision-compare"
          >
            <h3 className="revision-section-title">Snapshots</h3>
            <p className="muted small">
              This device only · {revisions.length}/50
            </p>
            <div className="snapshot-save-row">
              <input
                type="text"
                className="snapshot-label-input"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="Label (optional)"
                autoComplete="off"
                aria-label="Snapshot label"
                spellCheck={false}
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
            <h4 className="tool-subheading">Compare</h4>
            {revisions.length === 0 ? (
              <p className="muted small">
                Save a snapshot to diff against the draft (or another snapshot).
              </p>
            ) : (
              <>
                <div className="compare-select-row">
                  <label className="compare-select">
                    <span className="sr-only">Left version</span>
                    <span className="compare-select-label" aria-hidden>
                      A
                    </span>
                    <select
                      value={compareLeftId}
                      onChange={(e) => setCompareLeftId(e.target.value)}
                      aria-label="Left version for compare"
                    >
                      {compareSnapshotOptions.map((o) => (
                        <option key={`L-${o.id}`} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="compare-select">
                    <span className="sr-only">Right version</span>
                    <span className="compare-select-label" aria-hidden>
                      B
                    </span>
                    <select
                      value={compareRightId}
                      onChange={(e) => setCompareRightId(e.target.value)}
                      aria-label="Right version for compare"
                    >
                      {compareSnapshotOptions.map((o) => (
                        <option key={`R-${o.id}`} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div
                  className="compare-mode-toggle"
                  role="group"
                  aria-label="Compare view mode"
                >
                  <button
                    type="button"
                    className={`segment-btn ${compareViewMode === "side" ? "active" : ""}`}
                    onClick={() => setCompareViewMode("side")}
                  >
                    Side by side
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${compareViewMode === "diff" ? "active" : ""}`}
                    onClick={() => setCompareViewMode("diff")}
                  >
                    Changes
                  </button>
                </div>
                {compareLeftId === compareRightId ? (
                  <p className="muted small">Pick two different versions.</p>
                ) : compareViewMode === "side" ? (
                  <div className="compare-panels" aria-label="Compared poem text">
                    <div className="compare-panel">
                      <div className="compare-panel-head">A</div>
                      <pre className="compare-pre">{compareLeftBody}</pre>
                    </div>
                    <div className="compare-panel">
                      <div className="compare-panel-head">B</div>
                      <pre className="compare-pre">{compareRightBody}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="compare-diff-wrap" aria-label="Line diff">
                    <table className="compare-diff-table">
                      <thead>
                        <tr>
                          <th scope="col">Change</th>
                          <th scope="col">A</th>
                          <th scope="col">B</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compareDiffRows.map((row, idx) => {
                          if (row.kind === "same") {
                            return (
                              <tr key={`s-${idx}`} className="diff-same">
                                <td colSpan={3} className="diff-cell">
                                  {row.text || " "}
                                </td>
                              </tr>
                            );
                          }
                          if (row.kind === "change") {
                            return (
                              <tr key={`c-${idx}`} className="diff-change">
                                <td className="diff-tag">~</td>
                                <td className="diff-cell diff-removed">
                                  {row.left || " "}
                                </td>
                                <td className="diff-cell diff-added">
                                  {row.right || " "}
                                </td>
                              </tr>
                            );
                          }
                          if (row.kind === "left") {
                            return (
                              <tr key={`l-${idx}`} className="diff-remove-row">
                                <td className="diff-tag">−</td>
                                <td
                                  className="diff-cell diff-removed"
                                  colSpan={2}
                                >
                                  {row.text || " "}
                                </td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={`r-${idx}`} className="diff-add-row">
                              <td className="diff-tag">+</td>
                              <td className="diff-cell diff-added" colSpan={2}>
                                {row.text || " "}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <details className="external-ai-fold">
            <summary className="external-ai-summary">
              Outside feedback (ChatGPT)
            </summary>
            <p className="muted small external-ai-fold-lead">
              Nothing leaves this tab until you copy it. Open ChatGPT in a new tab
              and paste when you want another reader.
            </p>
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
          </details>
        </section>

        <aside
          className="tools-panel"
          aria-label="Tools"
          id="writing-tools"
        >
          <h2 className="tools-heading">Tools</h2>
          <nav className="tool-tabs" role="tablist" aria-label="Tool sections">
            {TOOL_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tool-tab-${id}`}
                aria-selected={toolTab === id}
                aria-controls={`tool-panel-${id}`}
                tabIndex={toolTab === id ? 0 : -1}
                className={`tool-tab ${toolTab === id ? "active" : ""}`}
                onClick={() => setToolTab(id)}
              >
                <Icon />
                <span className="tool-tab-label">{label}</span>
              </button>
            ))}
          </nav>
          <p className="tools-disclaimer tools-disclaimer-tabs">
            Syllables &amp; rhyme hints are <strong>rough</strong>—English
            heuristics only.
          </p>

          <div className="tool-tab-panel" key={toolTab}>
            {toolTab === "totals" ? (
              <div
                className="tool-block tool-block-live"
                id="tool-panel-totals"
                role="tabpanel"
                aria-labelledby="tool-tab-totals"
              >
                <LiveSectionTitle>Totals</LiveSectionTitle>
                <ul
                  className="stat-chips stat-chips-draft"
                  role="status"
                  aria-live="polite"
                  aria-relevant="text"
                  title="These numbers track your poem as you type."
                >
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
            ) : null}

            {toolTab === "goals" ? (
              <div
                className="tool-block"
                id="tool-panel-goals"
                role="tabpanel"
                aria-labelledby="tool-tab-goals"
              >
                <h3 className="tool-heading-you">
                  <span className="you-marker" aria-hidden />
                  <span className="tool-heading-you-text">Goals</span>
                  <span className="you-badge">Your targets</span>
                </h3>
                <p className="muted small">Blank fields are ignored.</p>
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
                      placeholder="Heavy lines"
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
                  <p className="muted small">On target.</p>
                ) : null}
              </div>
            ) : null}

            {toolTab === "checklist" ? (
              <div
                className="tool-block tool-block-live"
                id="tool-panel-checklist"
                role="tabpanel"
                aria-labelledby="tool-tab-checklist"
              >
                <LiveSectionTitle>Publication checklist</LiveSectionTitle>
                <p className="muted small">
                  Draft-only reminders from counts and goals—not legal review.
                </p>
                <ul
                  className="checklist checklist-draft"
                  aria-label="Publication readiness from your draft"
                  title="Items update from your current draft."
                >
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
                          <span className="checklist-detail">
                            {" "}
                            — {item.detail}
                          </span>
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
            ) : null}

            {toolTab === "lines" ? (
              <div
                className="tool-block tool-block-live"
                id="tool-panel-lines"
                role="tabpanel"
                aria-labelledby="tool-tab-lines"
              >
                <LiveSectionTitle>Line table</LiveSectionTitle>
                <p className="tools-table-note">
                  Syllable counts match <strong>Totals</strong> (same estimate).
                  Click a row to open that line in the draft.
                </p>
                <div className="table-wrap table-wrap-draft">
                  <table
                    className="line-table line-table-draft"
                    title="Per-line stats; click a row to jump in the editor."
                  >
                    <caption className="sr-only">
                      Per line: line number, estimated syllables, word count,
                      and character count. Activate a row to move the cursor
                      there.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">
                          <abbr title="Line number">Line</abbr>
                        </th>
                        <th scope="col">
                          <abbr title="Estimated syllables (heuristic)">Syll.</abbr>
                        </th>
                        <th scope="col">Words</th>
                        <th scope="col">Chars</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docStats.lines.slice(0, LINES_TABLE_MAX).map((row) => (
                        <tr
                          key={row.lineNumber}
                          className="line-table-data-row line-table-row-jump"
                          tabIndex={0}
                          aria-label={`Line ${row.lineNumber}: ${row.syllables} syllables, ${row.words} words. Open in editor.`}
                          onClick={() => goToLine(row.lineNumber)}
                          onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              goToLine(row.lineNumber);
                            }
                          }}
                        >
                          <td className="line-table-metric">{row.lineNumber}</td>
                          <td className="line-table-metric">{row.syllables}</td>
                          <td className="line-table-metric">{row.words}</td>
                          <td className="line-table-metric">{row.chars}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {docStats.lines.length > LINES_TABLE_MAX ? (
                  <p className="muted small">
                    Showing first {LINES_TABLE_MAX} of {docStats.lines.length}{" "}
                    lines.
                  </p>
                ) : null}
              </div>
            ) : null}

            {toolTab === "rhyme" ? (
              <div
                className="tool-block tool-block-live"
                id="tool-panel-rhyme"
                role="tabpanel"
                aria-labelledby="tool-tab-rhyme"
              >
                <LiveSectionTitle>Rhyme &amp; sound hints</LiveSectionTitle>
                <p className="muted small">
                  End-of-word letter groups only; not pronunciation or stress.
                </p>
                <h4 className="tool-subheading">Shared final letter pattern</h4>
                {rhymeClusters.length === 0 ? (
                  <p className="muted small">
                    No lines share the same final letter pattern yet.
                  </p>
                ) : (
                  <ul className="hint-list hint-list-draft">
                    {rhymeClusters.slice(0, 10).map((c) => (
                      <li key={c.ending}>
                        <span className="mono">…{c.ending}</span> — lines{" "}
                        {c.lineNumbers.join(", ")}
                      </li>
                    ))}
                  </ul>
                )}
                <h4 className="tool-subheading">
                  Same spelling from last vowel onward
                </h4>
                <p className="muted small">
                  From last <strong>vowel</strong> to line end—slant / eye-rhyme
                  hint.
                </p>
                {vowelTailClusters.length === 0 ? (
                  <p className="muted small">No matching vowel tails yet.</p>
                ) : (
                  <ul className="hint-list hint-list-draft">
                    {vowelTailClusters.slice(0, 10).map((c) => (
                      <li key={c.ending}>
                        <span className="mono">…{c.ending}</span> — lines{" "}
                        {c.lineNumbers.join(", ")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {toolTab === "repeat" ? (
              <div
                className="tool-block tool-block-live"
                id="tool-panel-repeat"
                role="tabpanel"
                aria-labelledby="tool-tab-repeat"
              >
                <LiveSectionTitle>Repeated words</LiveSectionTitle>
                <p className="muted small">
                  Non‑stopwords, 4+ letters, appearing twice or more (top 40).
                </p>
                {repeated.length === 0 ? (
                  <p className="muted small">None detected in this draft.</p>
                ) : (
                  <ul className="hint-list hint-list-draft">
                    {repeated.map((r) => (
                      <li key={r.word}>
                        <span className="mono">{r.word}</span> ×{r.count} — lines{" "}
                        {r.lines.join(", ")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {toolTab === "spell" ? (
              <div
                className="tool-block tool-block-live"
                id="tool-panel-spell"
                role="tabpanel"
                aria-labelledby="tool-tab-spell"
              >
                <LiveSectionTitle>Spelling</LiveSectionTitle>
                {wordlistErr ? (
                  <p className="error compact" role="alert">
                    {wordlistErr}
                  </p>
                ) : !wordlist ? (
                  <p className="muted small">Loading dictionary…</p>
                ) : (
                  <>
                    <p className="muted small">
                      Local list + your additions—many “unknowns” are on purpose.
                    </p>
                    {spellHits.length === 0 ? (
                      <p className="muted small">Nothing flagged.</p>
                    ) : (
                      <ul className="spell-hits spell-hits-draft">
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
                                Add word
                              </button>
                              <button
                                type="button"
                                className="small-btn"
                                onClick={() => {
                                  ignoreWordForSession(h.normalized);
                                  refreshSpell();
                                }}
                              >
                                Skip (session)
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {spellHits.length > 50 ? (
                      <p className="muted small">First 50.</p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <footer className="privacy">
        <h2 className="privacy-title">Privacy</h2>
        <p>
          Draft, snapshots, goals, and your word list stay in this browser.
          Export or paste goes wherever you send it—check that site&apos;s terms.
        </p>
      </footer>
    </div>
  );
}
