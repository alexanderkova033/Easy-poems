import "./FirstVisitHint.css";
import { useCallback, useState } from "react";
import { FIRST_VISIT_HINT_STORAGE_KEY, readFirstVisitHintDismissed } from "./firstVisitHintStorage";

export function FirstVisitHint({
  onOpenGuide,
}: {
  onDismissed?: () => void;
  onOpenGuide?: () => void;
}) {
  const [visible, setVisible] = useState(() => !readFirstVisitHintDismissed());

  const dismiss = useCallback(() => {
    try { localStorage.setItem(FIRST_VISIT_HINT_STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="welcome-banner welcome-banner-minimal" role="banner">
      <div className="welcome-minimal-body">
        <span className="welcome-leaf" aria-hidden>❧</span>
        <div className="welcome-minimal-text">
          <strong>Welcome.</strong>{" "}
          Type your poem in the editor — rhyme, rhythm, and syllable counts appear automatically on the right.
          {" "}
          {onOpenGuide && (
            <button type="button" className="linkish welcome-guide-inline" onClick={() => { onOpenGuide(); dismiss(); }}>
              Show me a quick tour →
            </button>
          )}
        </div>
        <button
          type="button"
          className="welcome-minimal-dismiss"
          onClick={dismiss}
          aria-label="Dismiss welcome"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
