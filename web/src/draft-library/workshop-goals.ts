import {
  tryLocalStorageRemoveItem,
  tryLocalStorageSetItem,
} from "@/shared/platform/browser-storage";

const STORAGE_KEY = "easy-poems:goals:v1";

/** Optional numeric targets; unset / empty fields = no constraint. */
export interface WorkshopGoals {
  minLines?: number;
  maxLines?: number;
  minWords?: number;
  maxWords?: number;
  /** Stanzas = blocks separated by blank lines (matches Totals). */
  minStanzas?: number;
  maxStanzas?: number;
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
      minStanzas: readOptionalPositiveInt(o.minStanzas),
      maxStanzas: readOptionalPositiveInt(o.maxStanzas),
      maxSyllablesPerLine: readOptionalPositiveInt(o.maxSyllablesPerLine),
    };
  } catch {
    return {};
  }
}

export function saveWorkshopGoals(goals: WorkshopGoals): boolean {
  const payload: Record<string, number> = {};
  if (goals.minLines != null) payload.minLines = goals.minLines;
  if (goals.maxLines != null) payload.maxLines = goals.maxLines;
  if (goals.minWords != null) payload.minWords = goals.minWords;
  if (goals.maxWords != null) payload.maxWords = goals.maxWords;
  if (goals.minStanzas != null) payload.minStanzas = goals.minStanzas;
  if (goals.maxStanzas != null) payload.maxStanzas = goals.maxStanzas;
  if (goals.maxSyllablesPerLine != null) {
    payload.maxSyllablesPerLine = goals.maxSyllablesPerLine;
  }
  if (Object.keys(payload).length === 0) {
    return tryLocalStorageRemoveItem(STORAGE_KEY);
  }
  return tryLocalStorageSetItem(STORAGE_KEY, JSON.stringify(payload));
}
