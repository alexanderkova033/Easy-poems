import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { SpellMode } from "../../functionality/draft/local-draft-storage";
import type { SpellHit } from "../../functionality/spellcheck/scan";
import type { WorkshopGoals } from "../../functionality/draft/workshop-goals";
import type { GoalEvaluation } from "../../functionality/tools/goal-metrics";
import type { DocumentStats } from "../../functionality/tools/line-stats";
import { POETRY_READING_WPM } from "../../functionality/tools/line-stats";
import type { ChecklistItem } from "../../functionality/tools/publication-checklist";
import type { RhymeCluster } from "../../functionality/tools/rhyme-hints";
import type { RepeatedWord } from "../../functionality/tools/repeated-words";
import type { RevisionSnapshot } from "../../functionality/draft/revision-snapshots";
import type { LineDiffRow } from "../../functionality/draft/diff-lines";
import type {
  LineMeterHint,
  LineStressSource,
} from "../../functionality/tools/meter-hints";
import { addToPersonalDictionary, ignoreWordForSession } from "../../functionality/spellcheck/personal-dictionary";
import { LiveSectionTitle } from "./ToolTabBar";
import {
  RevisionCompareSection,
  type CompareSnapshotOption,
} from "./RevisionCompareSection";
import type { ToolTab } from "./workshop-helpers";

const LINES_TABLE_MAX = 400;
const METER_TABLE_MAX = 400;
const STANZA_TABLE_MAX = 32;

function meterStressSourceMark(s: LineStressSource): string {
  if (s === "lexicon") return "✓";
  if (s === "mixed") return "~";
  return "—";
}

function meterStressSourceHint(s: LineStressSource): string {
  if (s === "lexicon") return "Stress from CMU dictionary for this line";
  if (s === "mixed") return "Mixed dictionary + heuristic stress";
  return "Heuristic stress (word not in CMU list or invented)";
}

function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="tool-empty" role="status" aria-live="polite">
      <p className="tool-empty-title">{title}</p>
      <div className="tool-empty-body">{children}</div>
    </div>
  );
}

function checklistJumpLabel(item: ChecklistItem): string {
  if (item.focusTitleField) return "Focus title";
  switch (item.openToolTab) {
    case "lines":
      return "Lines";
    case "spell":
      return "Spelling";
    case "goals":
      return "Goals";
    default:
      return "Open";
  }
}

function JumpLineList({
  lineNumbers,
  goToLine,
}: {
  lineNumbers: number[];
  goToLine: (line1Based: number) => void;
}) {
  return (
    <>
      {lineNumbers.map((n, i) => (
        <span key={`${n}-${i}`}>
          {i > 0 ? ", " : null}
          <button
            type="button"
            className="linkish line-jump-inline"
            onClick={() => goToLine(n)}
          >
            {n}
          </button>
        </span>
      ))}
    </>
  );
}

export interface WorkshopToolPanelsProps {
  toolTab: ToolTab;
  docStats: DocumentStats;
  meterHints: LineMeterHint[];
  goals: WorkshopGoals;
  goalEvaluation: GoalEvaluation;
  publication: { items: ChecklistItem[]; tips: string[] };
  rhymeClusters: RhymeCluster[];
  vowelTailClusters: RhymeCluster[];
  assonanceClusters: RhymeCluster[];
  consonanceClusters: RhymeCluster[];
  repeated: RepeatedWord[];
  spellHits: SpellHit[];
  wordlist: Set<string> | null;
  wordlistErr: string | null;
  spellMode: SpellMode;
  onSpellModeChange: (mode: SpellMode) => void;
  goToLine: (line1Based: number) => void;
  refreshSpell: () => void;
  onSpellPersistenceError: (message: string) => void;
  updateGoal: (
    key: keyof WorkshopGoals,
  ) => (e: ChangeEvent<HTMLInputElement>) => void;
  revisions: RevisionSnapshot[];
  snapshotLabel: string;
  onSnapshotLabelChange: (v: string) => void;
  onSaveSnapshot: () => void;
  onRestoreRevision: (snap: RevisionSnapshot) => void;
  onDeleteRevision: (id: string) => void;
  compareLeftId: string;
  compareRightId: string;
  onCompareLeftChange: (id: string) => void;
  onCompareRightChange: (id: string) => void;
  compareViewMode: "side" | "diff";
  onCompareViewModeChange: (mode: "side" | "diff") => void;
  compareSnapshotOptions: CompareSnapshotOption[];
  compareLeftBody: string;
  compareRightBody: string;
  compareDiffRows: LineDiffRow[];
  onOpenToolTab: (tab: ToolTab) => void;
  focusPoemTitle: () => void;
  stressLexiconReady: boolean;
  stressLexiconErr: string | null;
}

export function WorkshopToolPanels(props: WorkshopToolPanelsProps) {
  const {
    toolTab,
    docStats,
    meterHints,
    goals,
    goalEvaluation,
    publication,
    rhymeClusters,
    vowelTailClusters,
    assonanceClusters,
    consonanceClusters,
    repeated,
    spellHits,
    wordlist,
    wordlistErr,
    spellMode,
    onSpellModeChange,
    goToLine,
    refreshSpell,
    onSpellPersistenceError,
    updateGoal,
    revisions,
    snapshotLabel,
    onSnapshotLabelChange,
    onSaveSnapshot,
    onRestoreRevision,
    onDeleteRevision,
    compareLeftId,
    compareRightId,
    onCompareLeftChange,
    onCompareRightChange,
    compareViewMode,
    onCompareViewModeChange,
    compareSnapshotOptions,
    compareLeftBody,
    compareRightBody,
    compareDiffRows,
    onOpenToolTab,
    focusPoemTitle,
    stressLexiconReady,
    stressLexiconErr,
  } = props;

  const [spellStep, setSpellStep] = useState(0);
  const [hideEmptyLines, setHideEmptyLines] = useState(false);
  const [meterHideBlank, setMeterHideBlank] = useState(true);
  const [meterOnlyLowFit, setMeterOnlyLowFit] = useState(false);
  const [meterLowFitThreshold, setMeterLowFitThreshold] = useState(60);
  const [goLineField, setGoLineField] = useState("");

  useEffect(() => {
    setSpellStep(0);
  }, [spellHits]);

  const displayedLineRows = useMemo(() => {
    if (!hideEmptyLines) return docStats.lines;
    return docStats.lines.filter((r) => r.text.trim().length > 0);
  }, [docStats.lines, hideEmptyLines]);

  const displayedMeterHints = useMemo(() => {
    const rows = meterHints.slice(0, METER_TABLE_MAX);
    return rows.filter((r) => {
      if (meterHideBlank && !r.stressPattern) return false;
      if (!meterOnlyLowFit) return true;
      if (r.iambicFitPercent == null) return false;
      return r.iambicFitPercent < meterLowFitThreshold;
    });
  }, [meterHideBlank, meterHints, meterLowFitThreshold, meterOnlyLowFit]);

  return (
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
            <li title="Every line break in the editor, including blanks">
              <span className="chip-label">All lines</span>
              <span className="chip-val">{docStats.totalLines}</span>
            </li>
            <li title="Lines that contain at least one non-space character">
              <span className="chip-label">With text</span>
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
            <li>
              <span className="chip-label">Stanzas</span>
              <span className="chip-val">{docStats.stanzaCount}</span>
            </li>
            <li>
              <span className="chip-label">Read-aloud (est.)</span>
              <span className="chip-val">
                {docStats.totalWords === 0
                  ? "—"
                  : `${docStats.estimatedReadingMinutes} min`}
              </span>
            </li>
            <li>
              <span className="chip-label">Avg words / line</span>
              <span className="chip-val">
                {docStats.nonEmptyLines > 0
                  ? docStats.avgWordsPerNonEmptyLine
                  : "—"}
              </span>
            </li>
            {docStats.longestLineByWords ? (
              <li className="stat-chip-jump-wrap">
                <span className="chip-label">Longest (words)</span>
                <button
                  type="button"
                  className="chip-jump-btn"
                  onClick={() =>
                    goToLine(docStats.longestLineByWords!.lineNumber)
                  }
                >
                  Line {docStats.longestLineByWords.lineNumber} (
                  {docStats.longestLineByWords.words})
                </button>
              </li>
            ) : null}
            {docStats.longestLineByChars &&
            docStats.longestLineByChars.lineNumber !==
              docStats.longestLineByWords?.lineNumber ? (
              <li className="stat-chip-jump-wrap">
                <span className="chip-label">Longest (chars)</span>
                <button
                  type="button"
                  className="chip-jump-btn"
                  onClick={() =>
                    goToLine(docStats.longestLineByChars!.lineNumber)
                  }
                >
                  Line {docStats.longestLineByChars.lineNumber} (
                  {docStats.longestLineByChars.chars})
                </button>
              </li>
            ) : null}
          </ul>
          <p className="muted small totals-reading-hint">
            Read-aloud time assumes ~{POETRY_READING_WPM} words/min (performance
            poetry varies).
          </p>
          {docStats.stanzaStats.length > 0 ? (
            <>
              <h4 className="tool-subheading">Stanza breakdown</h4>
              <p className="muted small">
                Stanzas are blocks of lines separated by a blank line.
              </p>
              <div className="table-wrap table-wrap-draft">
                <table className="line-table line-table-draft stanza-table">
                  <caption className="sr-only">
                    Per stanza: line range, lines with text, words, estimated
                    syllables
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Lines</th>
                      <th scope="col">Non-empty</th>
                      <th scope="col">Words</th>
                      <th scope="col">Syll. (est.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docStats.stanzaStats
                      .slice(0, STANZA_TABLE_MAX)
                      .map((st) => (
                        <tr key={st.stanzaIndex}>
                          <td className="line-table-metric">{st.stanzaIndex}</td>
                          <td className="line-table-metric">
                            <button
                              type="button"
                              className="linkish stanza-line-range-btn"
                              onClick={() => goToLine(st.startLine)}
                              title={`Jump to start of stanza ${st.stanzaIndex}`}
                            >
                              {st.startLine}–{st.endLine}
                            </button>
                          </td>
                          <td className="line-table-metric">
                            {st.nonEmptyLines}
                          </td>
                          <td className="line-table-metric">{st.words}</td>
                          <td className="line-table-metric">{st.syllables}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {docStats.stanzaStats.length > STANZA_TABLE_MAX ? (
                <p className="muted small">
                  Showing first {STANZA_TABLE_MAX} of{" "}
                  {docStats.stanzaStats.length} stanzas.
                </p>
              ) : null}
            </>
          ) : null}
          <p className="muted small totals-hint">
            Open <button type="button" className="linkish" onClick={() => onOpenToolTab("lines")}>Lines</button>{" "}
            for the full table, or{" "}
            <button type="button" className="linkish" onClick={() => onOpenToolTab("meter")}>
              Meter
            </button>{" "}
            for stress patterns.
          </p>
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
          <p className="muted small goals-crosslink">
            Live counts are in{" "}
            <button type="button" className="linkish" onClick={() => onOpenToolTab("totals")}>
              Totals
            </button>
            ; per-line numbers in{" "}
            <button type="button" className="linkish" onClick={() => onOpenToolTab("lines")}>
              Lines
            </button>
            .
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
            <label className="goal-field">
              Min stanzas
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={goals.minStanzas ?? ""}
                onChange={updateGoal("minStanzas")}
                title="Blank lines between stanzas; see Totals"
              />
            </label>
            <label className="goal-field">
              Max stanzas
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={goals.maxStanzas ?? ""}
                onChange={updateGoal("maxStanzas")}
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
                {!item.done &&
                (item.openToolTab || item.focusTitleField) ? (
                  <button
                    type="button"
                    className="small-btn checklist-jump-btn"
                    onClick={() =>
                      item.focusTitleField
                        ? focusPoemTitle()
                        : onOpenToolTab(item.openToolTab!)
                    }
                  >
                    {checklistJumpLabel(item)}
                  </button>
                ) : null}
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
          <form
            className="lines-go-form"
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(goLineField.trim(), 10);
              if (!Number.isFinite(n) || n < 1) return;
              goToLine(n);
            }}
          >
            <label className="lines-go-label">
              Go to line
              <input
                id="go-line-input"
                value={goLineField}
                onChange={(e) => setGoLineField(e.target.value)}
                inputMode="numeric"
                placeholder="#"
                aria-label="Go to line number"
              />
            </label>
            <button type="submit" className="small-btn">
              Go
            </button>
          </form>
          <p className="tools-table-note">
            Syllable counts match <strong>Totals</strong> (same estimate). Line
            numbers in the table are clickable—pick a row to jump in the draft.
          </p>
          <div className="lines-table-toolbar">
            <label className="lines-hide-empty-label">
              <input
                type="checkbox"
                checked={hideEmptyLines}
                onChange={(e) => setHideEmptyLines(e.target.checked)}
              />
              Hide blank lines
            </label>
          </div>
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
                {displayedLineRows.slice(0, LINES_TABLE_MAX).map((row) => (
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
                    <td className="line-table-metric line-table-line-num">
                      {row.lineNumber}
                    </td>
                    <td className="line-table-metric">{row.syllables}</td>
                    <td className="line-table-metric">{row.words}</td>
                    <td className="line-table-metric">{row.chars}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {displayedLineRows.length > LINES_TABLE_MAX ? (
            <p className="muted small">
              Showing first {LINES_TABLE_MAX} of {displayedLineRows.length}{" "}
              rows
              {hideEmptyLines ? " (blank lines hidden)" : ""}.
            </p>
          ) : null}
        </div>
      ) : null}

      {toolTab === "meter" ? (
        <div
          className="tool-block tool-block-live tool-block-meter"
          id="tool-panel-meter"
          role="tabpanel"
          aria-labelledby="tool-tab-meter"
        >
          <LiveSectionTitle>Stress &amp; meter (approx.)</LiveSectionTitle>
          <details className="tool-hint-details">
            <summary className="tool-hint-summary">How to read this</summary>
            <p className="muted small tool-hint-body">
              <strong>/</strong> = stressed syllable, <strong>x</strong> = unstressed.
              These are estimates &mdash; trust your ear over the numbers.{" "}
              <abbr title="CMU Pronouncing Dictionary: a large English pronunciation database. Words it knows get accurate stress. Words it does not know (names, invented words) fall back to heuristic guessing.">CMU dictionary</abbr>{" "}
              words are marked &#10003;; others are guesses (&#126; or &mdash;).
              &ldquo;Iambic-ish %&rdquo; measures fit to a{" "}
              <abbr title="Iambic meter: alternating unstressed and stressed syllables (x /). da-DUM da-DUM. A sonnet uses 5 pairs per line (iambic pentameter).">weak-strong alternating pattern</abbr>{" "}
              &mdash; a cue, not a verdict.
            </p>
          </details>
          {stressLexiconErr ? (
            <p className="error compact" role="alert">
              {stressLexiconErr} Meter falls back to heuristics.
            </p>
          ) : stressLexiconReady ? (
            <p className="muted small meter-lexicon-status" role="status">
              Dictionary stress ready (filtered CMU pronunciations for the local word
              list).
            </p>
          ) : (
            <p className="muted small meter-lexicon-status" aria-busy="true">
              Loading stress dictionary…
            </p>
          )}

          <div className="meter-controls" role="group" aria-label="Meter filters">
            <label className="meter-toggle">
              <input
                type="checkbox"
                checked={meterHideBlank}
                onChange={(e) => setMeterHideBlank(e.target.checked)}
              />{" "}
              Hide blanks
            </label>
            <label className="meter-toggle">
              <input
                type="checkbox"
                checked={meterOnlyLowFit}
                onChange={(e) => setMeterOnlyLowFit(e.target.checked)}
              />{" "}
              Show low fit
            </label>
            {meterOnlyLowFit ? (
              <label className="meter-threshold">
                Below{" "}
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={meterLowFitThreshold}
                  onChange={(e) =>
                    setMeterLowFitThreshold(
                      Number.isFinite(e.target.valueAsNumber)
                        ? e.target.valueAsNumber
                        : 60,
                    )
                  }
                />{" "}
                %
              </label>
            ) : null}
          </div>
          <div className="table-wrap table-wrap-draft">
            <table
              className="line-table line-table-draft line-table-meter"
              title="Per-line stress pattern; click a row to jump in the editor."
            >
              <caption className="sr-only">
                Line number, syllable count, stress marks, dictionary vs heuristic,
                iambic fit, jump to line.
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <abbr title="Line number">Line</abbr>
                  </th>
                  <th scope="col">
                    <abbr title="Estimated syllables">Syll.</abbr>
                  </th>
                  <th scope="col">Stress (est.)</th>
                  <th scope="col">
                    <abbr title="✓ CMU for whole line; ~ mixed; — heuristic">
                      Dict
                    </abbr>
                  </th>
                  <th scope="col">
                    <abbr title="Loose match to alternating weak-strong">Iambic-ish</abbr>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedMeterHints.map((row) => (
                  <tr
                    key={row.lineNumber}
                    className="line-table-data-row line-table-row-jump"
                    tabIndex={0}
                    aria-label={`Line ${row.lineNumber}: stress pattern. Open in editor.`}
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
                    <td className="line-table-stress mono">
                      {row.stressPattern || "—"}
                    </td>
                    <td
                      className="line-table-metric meter-dict-col"
                      title={meterStressSourceHint(row.stressSource)}
                    >
                      {meterStressSourceMark(row.stressSource)}
                    </td>
                    <td className="line-table-metric">
                      {row.iambicFitPercent != null ? `${row.iambicFitPercent}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meterHints.length > METER_TABLE_MAX ? (
            <p className="muted small">
              Showing first {METER_TABLE_MAX} of {meterHints.length} lines.
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
          <details className="tool-hint-details">
            <summary className="tool-hint-summary">How this works</summary>
            <p className="muted small tool-hint-body">
              These are <abbr title="Based on spelling patterns at the end of words, not phonetic pronunciation. 'love' and 'dove' would match; 'love' and 'above' might not, even though they rhyme in speech.">letter-pattern</abbr> detectors &mdash; a useful first pass, but your ear is the real judge. Tap a line number to jump to it.
            </p>
          </details>
          <h4 className="tool-subheading">Shared final letter pattern</h4>
          {rhymeClusters.length === 0 ? (
            <EmptyState title="No shared endings yet">
              <p className="muted small">
                Keep drafting—this fills in once multiple lines end the same way.
              </p>
            </EmptyState>
          ) : (
            <ul className="hint-list hint-list-draft">
              {rhymeClusters.slice(0, 10).map((c) => (
                <li key={c.ending}>
                  <span className="mono">…{c.ending}</span> — lines{" "}
                  <JumpLineList lineNumbers={c.lineNumbers} goToLine={goToLine} />
                </li>
              ))}
            </ul>
          )}
          <h4 className="tool-subheading">Same spelling from last vowel onward</h4>
          {vowelTailClusters.length === 0 ? (
            <EmptyState title="No matching vowel tails yet">
              <p className="muted small">
                This catches "looks-similar" endings even when pronunciation differs.
              </p>
            </EmptyState>
          ) : (
            <ul className="hint-list hint-list-draft">
              {vowelTailClusters.slice(0, 10).map((c) => (
                <li key={c.ending}>
                  <span className="mono">…{c.ending}</span> — lines{" "}
                  <JumpLineList lineNumbers={c.lineNumbers} goToLine={goToLine} />
                </li>
              ))}
            </ul>
          )}
          <h4 className="tool-subheading">
            <abbr title="Assonance: repetition of vowel sounds, e.g. 'fleet' and 'dream'. Detected by vowel letter patterns in each line's last word — spelling only, not sound.">Shared vowel letters</abbr> (last word)
          </h4>
          {assonanceClusters.length === 0 ? (
            <EmptyState title="No assonance clusters yet">
              <p className="muted small">
                Needs two lines whose final words share the same vowel-letter
                pattern.
              </p>
            </EmptyState>
          ) : (
            <ul className="hint-list hint-list-draft">
              {assonanceClusters.slice(0, 10).map((c) => (
                <li key={c.ending}>
                  <span className="mono">{c.ending}</span> — lines{" "}
                  <JumpLineList lineNumbers={c.lineNumbers} goToLine={goToLine} />
                </li>
              ))}
            </ul>
          )}
          <h4 className="tool-subheading">
            <abbr title="Consonance: repetition of consonant sounds at word endings, e.g. 'luck' and 'block'. Detected by the consonant letters after the last vowel in each line's final word — spelling only.">Shared ending consonants</abbr> (last word)
          </h4>
          {consonanceClusters.length === 0 ? (
            <EmptyState title="No consonance clusters yet">
              <p className="muted small">
                Appears when final words share a similar written consonant
                coda.
              </p>
            </EmptyState>
          ) : (
            <ul className="hint-list hint-list-draft">
              {consonanceClusters.slice(0, 10).map((c) => (
                <li key={c.ending}>
                  <span className="mono">…{c.ending}</span> — lines{" "}
                  <JumpLineList lineNumbers={c.lineNumbers} goToLine={goToLine} />
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
            Non‑stopwords, 4+ letters, appearing twice or more (top 40). Tap a line
            number to jump.
          </p>
          {repeated.length === 0 ? (
            <EmptyState title="No repeats detected">
              <p className="muted small">
                Nice—this list stays empty unless a non-stopword repeats.
              </p>
            </EmptyState>
          ) : (
            <ul className="hint-list hint-list-draft">
              {repeated.map((r) => (
                <li key={r.word}>
                  <span className="mono">{r.word}</span> ×{r.count} — lines{" "}
                  <JumpLineList lineNumbers={r.lines} goToLine={goToLine} />
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
          <div
            className="spell-strategy-toggle"
            role="group"
            aria-label="How strictly to flag unknown words"
          >
            <button
              type="button"
              className={`segment-btn spell-strategy-btn ${spellMode === "permissive" ? "active" : ""}`}
              aria-pressed={spellMode === "permissive"}
              onClick={() => onSpellModeChange("permissive")}
            >
              <span className="spell-strategy-title">Poetry-friendly</span>
              <span className="spell-strategy-sub">Fewer flags</span>
            </button>
            <button
              type="button"
              className={`segment-btn spell-strategy-btn ${spellMode === "strict" ? "active" : ""}`}
              aria-pressed={spellMode === "strict"}
              onClick={() => onSpellModeChange("strict")}
            >
              <span className="spell-strategy-title">Strict</span>
              <span className="spell-strategy-sub">More flags</span>
            </button>
          </div>
          {wordlistErr ? (
            <p className="error compact" role="alert">
              {wordlistErr}
            </p>
          ) : !wordlist ? (
            <div
              className="spell-loading-skeleton"
              aria-busy="true"
              aria-label="Loading dictionary"
            >
              <div className="spell-skeleton-line spell-skeleton-line-long" />
              <div className="spell-skeleton-line spell-skeleton-line-mid" />
              <div className="spell-skeleton-line spell-skeleton-line-short" />
            </div>
          ) : (
            <>
              <p className="muted small">
                Local list + your additions—many "unknowns" are on purpose.
              </p>
              {spellHits.length === 0 ? (
                <EmptyState title="No spelling flags">
                  <p className="muted small">
                    Looks clean under your current mode. Switch modes if you want a
                    stricter scan.
                  </p>
                </EmptyState>
              ) : (
                <>
                  <div className="spell-hit-nav" role="group" aria-label="Step through spelling flags">
                    <button
                      type="button"
                      className="small-btn"
                      onClick={() => {
                        const n = spellHits.length;
                        const i = (spellStep - 1 + n) % n;
                        setSpellStep(i);
                        goToLine(spellHits[i]!.lineNumber);
                      }}
                    >
                      ← Previous
                    </button>
                    <span className="spell-hit-nav-pos" aria-live="polite">
                      {spellStep + 1} / {spellHits.length}
                    </span>
                    <button
                      type="button"
                      className="small-btn"
                      onClick={() => {
                        const n = spellHits.length;
                        const i = (spellStep + 1) % n;
                        setSpellStep(i);
                        goToLine(spellHits[i]!.lineNumber);
                      }}
                    >
                      Next →
                    </button>
                  </div>
                <ul className="spell-hits spell-hits-draft">
                  {spellHits.slice(0, 50).map((h) => (
                    <li key={`${h.lineNumber}-${h.normalized}`}>
                      <div className="spell-hit-head">
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => {
                            const idx = spellHits.indexOf(h);
                            if (idx >= 0) setSpellStep(idx);
                            goToLine(h.lineNumber);
                          }}
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
                            if (!addToPersonalDictionary(h.normalized)) {
                              onSpellPersistenceError(
                                "Could not save that word to your dictionary (browser storage blocked or full).",
                              );
                              return;
                            }
                            refreshSpell();
                          }}
                        >
                          Add word
                        </button>
                        <button
                          type="button"
                          className="small-btn"
                          onClick={() => {
                            if (!ignoreWordForSession(h.normalized)) {
                              onSpellPersistenceError(
                                "Could not update session spelling skips.",
                              );
                              return;
                            }
                            refreshSpell();
                          }}
                        >
                          Skip (session)
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                </>
              )}
              {spellHits.length > 50 ? (
                <p className="muted small">First 50.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {toolTab === "snapshots" ? (
        <div
          className="tool-block tool-block-snapshots"
          id="tool-panel-snapshots"
          role="tabpanel"
          aria-labelledby="tool-tab-snapshots"
        >
          <RevisionCompareSection
            embedInTools
            revisions={revisions}
            snapshotLabel={snapshotLabel}
            onSnapshotLabelChange={onSnapshotLabelChange}
            onSaveSnapshot={onSaveSnapshot}
            onRestoreRevision={onRestoreRevision}
            onDeleteRevision={onDeleteRevision}
            compareLeftId={compareLeftId}
            compareRightId={compareRightId}
            onCompareLeftChange={onCompareLeftChange}
            onCompareRightChange={onCompareRightChange}
            compareViewMode={compareViewMode}
            onCompareViewModeChange={onCompareViewModeChange}
            compareSnapshotOptions={compareSnapshotOptions}
            compareLeftBody={compareLeftBody}
            compareRightBody={compareRightBody}
            compareDiffRows={compareDiffRows}
          />
        </div>
      ) : null}

      {toolTab === "shortcuts" ? (
        <div
          className="tool-block tool-block-shortcuts"
          id="tool-panel-shortcuts"
          role="tabpanel"
          aria-labelledby="tool-tab-shortcuts"
        >
          <h3 className="tool-heading-static">Shortcuts &amp; notes</h3>
          <p className="tools-shortcuts-lead">
            Keyboard commands work globally unless your cursor is in the poem or
            another text field.
          </p>
          <ul className="tools-shortcuts-list">
            <li>
              <kbd className="kbd-hint">Ctrl</kbd> + <kbd className="kbd-hint">Alt</kbd>{" "}
              + <kbd className="kbd-hint">[</kbd> / <kbd className="kbd-hint">]</kbd> —{" "}
              cycle tools in the current group (Overview, Sound, …).
            </li>
            <li>
              <kbd className="kbd-hint">⌘</kbd> / <kbd className="kbd-hint">Ctrl</kbd>{" "}
              + <kbd className="kbd-hint">K</kbd> — command palette.
            </li>
            <li>
              <kbd className="kbd-hint">⌘</kbd> / <kbd className="kbd-hint">Ctrl</kbd>{" "}
              + <kbd className="kbd-hint">F</kbd> — find in poem.
            </li>
            <li>
              <kbd className="kbd-hint">⌘</kbd> / <kbd className="kbd-hint">Ctrl</kbd>{" "}
              + <kbd className="kbd-hint">H</kbd> — replace in poem.
            </li>
          </ul>
          <p className="tools-shortcuts-note muted small">
            Syllable, meter, and rhyme hints are <strong>rough</strong> English
            heuristics—helpful signals, not a grade.
          </p>
        </div>
      ) : null}
    </div>
  );
}
