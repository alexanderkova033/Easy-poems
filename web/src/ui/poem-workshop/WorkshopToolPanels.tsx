import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { SpellMode } from "../../functionality/draft/local-draft-storage";
import type { SpellHit } from "../../functionality/spellcheck/scan";
import type { WorkshopGoals } from "../../functionality/draft/workshop-goals";
import type { GoalEvaluation } from "../../functionality/tools/goal-metrics";
import type { DocumentStats } from "../../functionality/tools/line-stats";
import type { ChecklistItem } from "../../functionality/tools/publication-checklist";
import type { RhymeCluster } from "../../functionality/tools/rhyme-hints";
import type { RepeatedWord } from "../../functionality/tools/repeated-words";
import type { RevisionSnapshot } from "../../functionality/draft/revision-snapshots";
import type { LineDiffRow } from "../../functionality/draft/diff-lines";
import type { LineMeterHint } from "../../functionality/tools/meter-hints";
import { addToPersonalDictionary, ignoreWordForSession } from "../../functionality/spellcheck/personal-dictionary";
import { LiveSectionTitle } from "./ToolTabBar";
import {
  RevisionCompareSection,
  type CompareSnapshotOption,
} from "./RevisionCompareSection";
import type { ToolTab } from "./workshop-helpers";

const LINES_TABLE_MAX = 400;
const METER_TABLE_MAX = 400;

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
  } = props;

  const [spellStep, setSpellStep] = useState(0);
  const [hideEmptyLines, setHideEmptyLines] = useState(false);

  useEffect(() => {
    setSpellStep(0);
  }, [spellHits]);

  const displayedLineRows = useMemo(() => {
    if (!hideEmptyLines) return docStats.lines;
    return docStats.lines.filter((r) => r.text.trim().length > 0);
  }, [docStats.lines, hideEmptyLines]);

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
            <li>
              <span className="chip-label">Stanzas</span>
              <span className="chip-val">{docStats.stanzaCount}</span>
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
          <p className="tools-table-note">
            Syllable counts match <strong>Totals</strong> (same estimate).
            Click a row to open that line in the draft.
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
                    <td className="line-table-metric">{row.lineNumber}</td>
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
          className="tool-block tool-block-live"
          id="tool-panel-meter"
          role="tabpanel"
          aria-labelledby="tool-tab-meter"
        >
          <LiveSectionTitle>Stress &amp; meter (approx.)</LiveSectionTitle>
          <p className="muted small">
            <strong>/</strong> = guessed stressed syllable, <strong>x</strong> =
            unstressed. Function words are often marked weak; polysyllables skew
            toward stress on the first beat. This is not pronunciation data—only a
            sketch to compare lines.
          </p>
          <p className="muted small">
            “Iambic-ish” is how well the pattern matches weak-strong alternation
            from the first syllable—useful as a loose cue, not a verdict.
          </p>
          <div className="table-wrap table-wrap-draft">
            <table
              className="line-table line-table-draft line-table-meter"
              title="Per-line stress pattern; click a row to jump in the editor."
            >
              <caption className="sr-only">
                Line number, syllable count, stress marks, iambic fit, jump to line.
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
                    <abbr title="Loose match to alternating weak-strong">Iambic-ish</abbr>
                  </th>
                </tr>
              </thead>
              <tbody>
                {meterHints.slice(0, METER_TABLE_MAX).map((row) => (
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
          <p className="muted small">
            End-of-word letter groups only; not pronunciation or stress. Tap a line
            number to jump in the editor.
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
                  <JumpLineList lineNumbers={c.lineNumbers} goToLine={goToLine} />
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
            <p className="muted small">None detected in this draft.</p>
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
                Local list + your additions—many “unknowns” are on purpose.
              </p>
              {spellHits.length === 0 ? (
                <p className="muted small">Nothing flagged.</p>
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

      {toolTab === "feedback" ? (
        <div
          className="tool-block tool-block-feedback"
          id="tool-panel-feedback"
          role="tabpanel"
          aria-labelledby="tool-tab-feedback"
        >
          <h3 className="tool-heading-static">Outside feedback (ChatGPT)</h3>
          <p className="muted small feedback-lead">
            Nothing leaves this tab until you copy from the draft. Open ChatGPT in
            another tab and paste when you want a second reader.
          </p>
          <ul className="feedback-tips muted small">
            <li>Copy from the editor or use Export for a clean file.</li>
            <li>Do not paste secrets you would not send to a third party.</li>
          </ul>
          <a
            className="secondary-link feedback-open-link"
            href="https://chat.openai.com/"
            target="_blank"
            rel="noreferrer"
          >
            Open ChatGPT in new tab
          </a>
        </div>
      ) : null}
    </div>
  );
}
