import { useCallback, useEffect, useState } from "react";
import { FIRST_VISIT_HINT_STORAGE_KEY, readFirstVisitHintDismissed } from "./firstVisitHintStorage";

export function FirstVisitHint({
  onDismissed,
  onOpenGuide,
}: {
  onDismissed?: () => void;
  onOpenGuide?: () => void;
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
      <div className="first-visit-hint-body">
        <p className="first-visit-hint-lead">
          <strong>Saves automatically</strong> here in your browser. Lots of buttons are
          optional — open the <strong>quick guide</strong> for a simple map of the screen.
        </p>
      </div>
      <div className="first-visit-hint-actions">
        {onOpenGuide ? (
          <button
            type="button"
            className="small-btn small-btn-primary first-visit-hint-guide"
            onClick={() => {
              onOpenGuide();
            }}
          >
            Open guide
          </button>
        ) : null}
        <button
          type="button"
          className="small-btn first-visit-hint-dismiss"
          onClick={dismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
