const STORAGE_KEY = "easy-poems:goals:v1";

/** Optional numeric targets; unset / empty fields = no constraint. */
export interface WorkshopGoals {
  minLines?: number;
  maxLines?: number;
  minWords?: number;
  maxWords?: number;
  /** Flag lines whose estimated syllables exceed this. */
  maxSyllablesPerLine?: number;
}

function readOptionalPositiveInt(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.floor(n);
}

export function loadWorkshopGoals(): WorkshopGoals {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return {};
    const o = v as Record<string, unknown>;
    return {
      minLines: readOptionalPositiveInt(o.minLines),
      maxLines: readOptionalPositiveInt(o.maxLines),
      minWords: readOptionalPositiveInt(o.minWords),
      maxWords: readOptionalPositiveInt(o.maxWords),
      maxSyllablesPerLine: readOptionalPositiveInt(o.maxSyllablesPerLine),
    };
  } catch {
    return {};
  }
}

export function saveWorkshopGoals(goals: WorkshopGoals): void {
  const payload: Record<string, number> = {};
  if (goals.minLines != null) payload.minLines = goals.minLines;
  if (goals.maxLines != null) payload.maxLines = goals.maxLines;
  if (goals.minWords != null) payload.minWords = goals.minWords;
  if (goals.maxWords != null) payload.maxWords = goals.maxWords;
  if (goals.maxSyllablesPerLine != null) {
    payload.maxSyllablesPerLine = goals.maxSyllablesPerLine;
  }
  if (Object.keys(payload).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
