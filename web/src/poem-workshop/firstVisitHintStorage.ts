export const FIRST_VISIT_HINT_STORAGE_KEY = "easy-poems:first-hint-dismissed";

export function readFirstVisitHintDismissed(): boolean {
  try {
    return localStorage.getItem(FIRST_VISIT_HINT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
