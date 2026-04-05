import type { DocumentStats } from "@/writing-tools/line-stats";
import type { GoalEvaluation } from "@/writing-tools/goal-metrics";
import type { ToolTab } from "./workshop-helpers";

export interface ToolsOverviewStripProps {
  docStats: DocumentStats;
  spellHitCount: number;
  wordlistReady: boolean;
  goalEvaluation: GoalEvaluation;
  repeatCount: number;
  activeTab: ToolTab;
  onOpenTab: (tab: ToolTab) => void;
}

export function ToolsOverviewStrip(props: ToolsOverviewStripProps) {
  const {
    docStats,
    spellHitCount,
    wordlistReady,
    goalEvaluation,
    repeatCount,
    activeTab,
    onOpenTab,
  } = props;

  const goalIssue = goalEvaluation.warnings.length > 0;
  const spellIssue = wordlistReady && spellHitCount > 0;

  const linesTitle =
    docStats.totalLines !== docStats.nonEmptyLines
      ? `${docStats.nonEmptyLines} lines with text · ${docStats.totalLines} total in editor (includes blanks)`
      : `${docStats.nonEmptyLines} lines with text`;

  return (
    <div
      className="tools-overview-strip tools-overview-strip-minimal"
      role="toolbar"
      aria-label="Quick open: jump to a tool by stat"
    >
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
        className={`tools-overview-pill ${activeTab === "repeat" ? "is-current" : ""} ${repeatCount > 0 ? "has-attn is-muted-attn" : ""}`}
        onClick={() => onOpenTab("repeat")}
        title={repeatCount > 0 ? `${repeatCount} repeated words (top list)` : "No repeats flagged"}
      >
        <span className="tools-overview-pill-k">{repeatCount}</span>
        <span className="tools-overview-pill-l">repeats</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "goals" ? "is-current" : ""} ${goalIssue ? "has-attn" : ""}`}
        onClick={() => onOpenTab("goals")}
        title={goalIssue ? "Goals: see warnings" : "Goals on target"}
      >
        <span className="tools-overview-pill-k">{goalIssue ? "!" : "OK"}</span>
        <span className="tools-overview-pill-l">goals</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "checklist" ? "is-current" : ""}`}
        onClick={() => onOpenTab("checklist")}
      >
        <span className="tools-overview-pill-k">✓</span>
        <span className="tools-overview-pill-l">ready</span>
      </button>
    </div>
  );
}
