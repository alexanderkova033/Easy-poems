const STORAGE_KEY = "easy-poems:draft:v2";

export type SpellMode = "strict" | "permissive";

export interface DraftState {
  title: string;
  body: string;
  /** Optional form or note (e.g. sonnet, free verse). */
  form?: string;
  spellMode?: SpellMode;
  /** ISO timestamp of last successful analysis (from API meta.analyzedAt). */
  lastAnalyzedAt?: string;
}

function readSpellMode(v: unknown): SpellMode | undefined {
  if (v === "strict" || v === "permissive") return v;
  return undefined;
}

export function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (typeof o.title !== "string" || typeof o.body !== "string") return null;
    const last =
      o.lastAnalyzedAt === undefined || o.lastAnalyzedAt === null
        ? undefined
        : String(o.lastAnalyzedAt);
    const form =
      o.form === undefined || o.form === null
        ? undefined
        : String(o.form);
    const sm = readSpellMode(o.spellMode);
    return {
      title: o.title,
      body: o.body,
      ...(form ? { form } : {}),
      ...(sm ? { spellMode: sm } : {}),
      lastAnalyzedAt: last || undefined,
    };
  } catch {
    return null;
  }
}

export function saveDraft(state: DraftState): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      title: state.title,
      body: state.body,
      ...(state.form ? { form: state.form } : {}),
      ...(state.spellMode ? { spellMode: state.spellMode } : {}),
      ...(state.lastAnalyzedAt
        ? { lastAnalyzedAt: state.lastAnalyzedAt }
        : {}),
    })
  );
}

/** Migrate v1 draft key if present and v2 empty. */
export function migrateLegacyDraftIfNeeded(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const legacy = localStorage.getItem("easy-poems:draft:v1");
    if (!legacy) return;
    const v = JSON.parse(legacy) as unknown;
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o.title !== "string" || typeof o.body !== "string") return;
    saveDraft({
      title: o.title,
      body: o.body,
      lastAnalyzedAt:
        o.lastAnalyzedAt === undefined || o.lastAnalyzedAt === null
          ? undefined
          : String(o.lastAnalyzedAt),
    });
  } catch {
    /* ignore */
  }
}
