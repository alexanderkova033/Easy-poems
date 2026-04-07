import { useCallback, useEffect, useState } from "react";
import { FIRST_VISIT_HINT_STORAGE_KEY, readFirstVisitHintDismissed } from "./firstVisitHintStorage";

export function FirstVisitHint({
  onDismissed,
}: {
  onDismissed?: () => void;
}) {
  const [visible, setVisible] = useState(() => !readFirstVisitHintDismissed());

  // Hide the hint if it gets dismissed in another tab.
  useEffect(() => {
    if (!visible) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === FIRST_VISIT_HINT_STORAGE_KEY && e.newValue === "1") {
        setVisible(false);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [visible]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(FIRST_VISIT_HINT_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
    onDismissed?.();
  }, [onDismissed]);

  if (!visible) return null;

  return (
    <div className="first-visit-hint" role="status">
      <ul className="first-visit-hint-list">
        <li>
          <strong>Saves automatically</strong> in this browser — nothing leaves your device until you export or copy.
        </li>
        <li>
          <strong>Library</strong> button (next to Draft) manages all your drafts — create, switch, or archive.
        </li>
        <li>
          Press <kbd className="kbd-hint">⌘</kbd>/<kbd className="kbd-hint">Ctrl</kbd>+
          <kbd className="kbd-hint">K</kbd> for the command palette (export, focus mode, and more).
        </li>
        <li>
          Press <kbd className="kbd-hint">Esc</kbd> to close any open panel.
        </li>
      </ul>
      <button
        type="button"
        className="small-btn first-visit-hint-dismiss"
        onClick={dismiss}
      >
        Got it
      </button>
    </div>
  );
}
