import type { QuickDocumentStats } from "@/writing-tools/line-stats";
import type { GoalEvaluation } from "@/writing-tools/goal-metrics";
import type { MeterCoverageSummary } from "@/writing-tools/meter-hints";
import type { ToolTab } from "./workshop-helpers";

export interface ToolsOverviewStripProps {
  /** Open checklist rows + goal warnings + spelling flags (Issues tab). */
  issuesQueueCount: number;
  quickDocStats: QuickDocumentStats;
  spellHitCount: number;
  wordlistReady: boolean;
  /** Count of rhyme / ending-pattern clusters (Sound tab). */
  rhymeClusterCount: number;
  goalEvaluation: GoalEvaluation;
  repeatCount: number;
  checklistOpenCount: number;
  meterCoverage: MeterCoverageSummary;
  stressLexiconReady: boolean;
  heavyToolsStale: boolean;
  activeTab: ToolTab;
  onOpenTab: (tab: ToolTab) => void;
}

export function ToolsOverviewStrip(props: ToolsOverviewStripProps) {
  const {
    issuesQueueCount,
    quickDocStats: docStats,
    spellHitCount,
    wordlistReady,
    rhymeClusterCount,
    goalEvaluation,
    repeatCount,
    checklistOpenCount,
    meterCoverage,
    stressLexiconReady,
    heavyToolsStale,
    activeTab,
    onOpenTab,
  } = props;

  const goalIssue = goalEvaluation.warnings.length > 0;
  const spellIssue = wordlistReady && spellHitCount > 0;
  const checklistIssue = checklistOpenCount > 0;
  const nonEmptyMeter = meterCoverage.nonEmptyLines;
  const heuristicFrac =
    nonEmptyMeter > 0 ? meterCoverage.heuristicLines / nonEmptyMeter : 0;
  const meterIssue =
    stressLexiconReady &&
    nonEmptyMeter > 0 &&
    heuristicFrac >= 0.35;

  const linesTitle =
    docStats.totalLines !== docStats.nonEmptyLines
      ? `${docStats.nonEmptyLines} lines with text · ${docStats.totalLines} total in editor (includes blanks)`
      : `${docStats.nonEmptyLines} lines with text`;

  const issuesIssue = issuesQueueCount > 0;

  return (
    <div className="tools-overview-wrap">
    <div
      className="tools-overview-strip tools-overview-strip-minimal"
      role="toolbar"
      aria-label="Quick open: jump to a tool by stat"
    >
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "issues" ? "is-current" : ""} ${issuesIssue ? "has-attn" : ""}`}
        onClick={() => onOpenTab("issues")}
        title={
          issuesIssue
            ? `${issuesQueueCount} item(s) in revision queue (checklist, goals, spelling)`
            : "Revision queue clear"
        }
      >
        <span className="tools-overview-pill-k">
          {issuesIssue ? issuesQueueCount : "✓"}
        </span>
        <span className="tools-overview-pill-l">issues</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "totals" ? "is-current" : ""}`}
        onClick={() => onOpenTab("totals")}
        title="Open Totals"
      >
        <span className="tools-overview-pill-k">{docStats.totalWords}</span>
        <span className="tools-overview-pill-l">words</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "lines" ? "is-current" : ""}`}
        onClick={() => onOpenTab("lines")}
        title={linesTitle}
      >
        <span className="tools-overview-pill-k">{docStats.nonEmptyLines}</span>
        <span className="tools-overview-pill-l">lines</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "spell" ? "is-current" : ""} ${spellIssue ? "has-attn" : ""}`}
        onClick={() => onOpenTab("spell")}
        title={
          !wordlistReady
            ? "Dictionary loading"
            : spellHitCount > 0
              ? `${spellHitCount} spelling flags`
              : "No spelling flags"
        }
      >
        <span className="tools-overview-pill-k">
          {!wordlistReady ? "…" : spellHitCount}
        </span>
        <span className="tools-overview-pill-l">spell</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "meter" ? "is-current" : ""} ${meterIssue ? "has-attn is-muted-attn" : ""}`}
        onClick={() => onOpenTab("meter")}
        title={
          heavyToolsStale
            ? "Meter updating…"
            : meterIssue
              ? "Many lines use heuristic stress — see Meter for detail"
              : "Stress / meter hints"
        }
      >
        <span className="tools-overview-pill-k">
          {heavyToolsStale
            ? "…"
            : docStats.nonEmptyLines === 0
              ? "—"
              : `${Math.round(100 - heuristicFrac * 100)}%`}
        </span>
        <span className="tools-overview-pill-l">meter</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "rhyme" ? "is-current" : ""} ${repeatCount > 0 ? "has-attn is-muted-attn" : ""}`}
        onClick={() => onOpenTab("rhyme")}
        title={
          rhymeClusterCount > 0 || repeatCount > 0
            ? `${rhymeClusterCount} ending-pattern cluster(s); ${repeatCount} repeated word(s) on the Rhyme & repeats tab`
            : "Rhyme, sound-pattern hints, and repeated-word list"
        }
      >
        <span className="tools-overview-pill-k tools-overview-pill-k-dual">
          <span className="tools-overview-pill-k-main">{rhymeClusterCount}</span>
          {repeatCount > 0 ? (
            <span className="tools-overview-pill-k-sub" aria-hidden>
              ·{repeatCount}
            </span>
          ) : null}
        </span>
        <span className="tools-overview-pill-l">rhyme</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "goals" ? "is-current" : ""} ${goalIssue ? "has-attn" : ""}`}
        onClick={() => onOpenTab("goals")}
        title={
          goalIssue
            ? `${goalEvaluation.warnings.length} goal warning(s)`
            : "Goals on target"
        }
      >
        <span className="tools-overview-pill-k">
          {goalIssue ? goalEvaluation.warnings.length : "OK"}
        </span>
        <span className="tools-overview-pill-l">goals</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "checklist" ? "is-current" : ""} ${checklistIssue ? "has-attn" : ""}`}
        onClick={() => onOpenTab("checklist")}
        title={
          checklistIssue
            ? `${checklistOpenCount} checklist item(s) still open`
            : "Publication checklist"
        }
      >
        <span className="tools-overview-pill-k">
          {checklistIssue ? checklistOpenCount : "✓"}
        </span>
        <span className="tools-overview-pill-l">ready</span>
      </button>
    </div>
</div>
  );
}
