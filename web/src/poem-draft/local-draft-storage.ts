const STORAGE_KEY = "easy-poems:draft:v1";

export interface DraftState {
  title: string;
  body: string;
  /** ISO timestamp of last successful analysis (from API meta.analyzedAt). */
  lastAnalyzedAt?: string;
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
    return {
      title: o.title,
      body: o.body,
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
      ...(state.lastAnalyzedAt
        ? { lastAnalyzedAt: state.lastAnalyzedAt }
        : {}),
    })
  );
}
