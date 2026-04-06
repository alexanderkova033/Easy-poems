import { useCallback, useState } from "react";
import { FIRST_VISIT_HINT_STORAGE_KEY, readFirstVisitHintDismissed } from "./firstVisitHintStorage";

export function FirstVisitHint({
  onDismissed,
}: {
  onDismissed?: () => void;
}) {
  const [visible, setVisible] = useState(() => !readFirstVisitHintDismissed());

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
      <p className="first-visit-hint-text">
        Your draft saves in this browser on this device. Use Export or copy when you
        want the text somewhere else. Press{" "}
        <kbd className="kbd-hint">⌘</kbd>/<kbd className="kbd-hint">Ctrl</kbd>+
        <kbd className="kbd-hint">K</kbd> anytime for the command palette (library,
        export, focus mode, and tools)—or open <strong>Library</strong> from the bar
        on small screens.
      </p>
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
