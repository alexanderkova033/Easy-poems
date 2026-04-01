const STORAGE_KEY = "easy-poems:revisions:v1";
const MAX_SNAPSHOTS = 50;

export interface RevisionSnapshot {
  id: string;
  createdAt: string;
  label?: string;
  title: string;
  body: string;
  form?: string;
}

export function loadRevisions(): RevisionSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    const out: RevisionSnapshot[] = [];
    for (const item of v) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      if (typeof o.id !== "string" || typeof o.createdAt !== "string") continue;
      if (typeof o.title !== "string" || typeof o.body !== "string") continue;
      out.push({
        id: o.id,
        createdAt: o.createdAt,
        ...(typeof o.label === "string" ? { label: o.label } : {}),
        title: o.title,
        body: o.body,
        ...(typeof o.form === "string" ? { form: o.form } : {}),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function saveRevisions(snapshots: RevisionSnapshot[]): void {
  const trimmed = snapshots.slice(0, MAX_SNAPSHOTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function addRevision(
  current: RevisionSnapshot[],
  draft: {
    title: string;
    body: string;
    form?: string;
    label?: string;
  },
): RevisionSnapshot[] {
  const snap: RevisionSnapshot = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    title: draft.title,
    body: draft.body,
    ...(draft.form ? { form: draft.form } : {}),
    ...(draft.label?.trim() ? { label: draft.label.trim() } : {}),
  };
  const next = [snap, ...current].slice(0, MAX_SNAPSHOTS);
  saveRevisions(next);
  return next;
}

export function removeRevision(
  current: RevisionSnapshot[],
  id: string,
): RevisionSnapshot[] {
  const next = current.filter((s) => s.id !== id);
  saveRevisions(next);
  return next;
}
