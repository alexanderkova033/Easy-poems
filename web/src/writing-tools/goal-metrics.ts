import type { DocumentStats } from "./line-stats";
import type { WorkshopGoals } from "../poem-draft/workshop-goals";

export interface GoalEvaluation {
  /** Human-readable warnings for the draft vs targets. */
  warnings: string[];
  /** Line numbers (1-based) over syllable cap, if set. */
  syllableOverLines: number[];
}

export function evaluateGoals(
  stats: DocumentStats,
  goals: WorkshopGoals,
): GoalEvaluation {
  const warnings: string[] = [];
  const syllableOverLines: number[] = [];

  const lines = stats.totalLines;
  const words = stats.totalWords;

  if (goals.minLines != null && lines < goals.minLines) {
    warnings.push(
      `Line count ${lines} is below your minimum (${goals.minLines}).`,
    );
  }
  if (goals.maxLines != null && lines > goals.maxLines) {
    warnings.push(
      `Line count ${lines} is above your maximum (${goals.maxLines}).`,
    );
  }
  if (goals.minWords != null && words < goals.minWords) {
    warnings.push(
      `Word count ${words} is below your minimum (${goals.minWords}).`,
    );
  }
  if (goals.maxWords != null && words > goals.maxWords) {
    warnings.push(
      `Word count ${words} is above your maximum (${goals.maxWords}).`,
    );
  }

  if (goals.maxSyllablesPerLine != null) {
    const cap = goals.maxSyllablesPerLine;
    for (const row of stats.lines) {
      if (row.text.trim().length === 0) continue;
      if (row.syllables > cap) syllableOverLines.push(row.lineNumber);
    }
    if (syllableOverLines.length > 0) {
      const preview = syllableOverLines.slice(0, 6).join(", ");
      const more =
        syllableOverLines.length > 6
          ? ` (+${syllableOverLines.length - 6} more)`
          : "";
      warnings.push(
        `Estimated syllables exceed ${cap} on line(s): ${preview}${more}.`,
      );
    }
  }

  return { warnings, syllableOverLines };
}
