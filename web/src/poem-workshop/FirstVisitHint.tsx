import "./FirstVisitHint.css";
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
    <div className="welcome-banner" role="banner">
      <div className="welcome-banner-inner">
        {/* Headline */}
        <div className="welcome-headline">
          <span className="welcome-leaf" aria-hidden>❧</span>
          <div>
            <h2 className="welcome-title">A quiet space to write poetry</h2>
            <p className="welcome-sub">
              Write in the editor on the left. Your draft is saved automatically —
              no account needed, nothing leaves your browser.
            </p>
          </div>
        </div>

        {/* Three-step journey */}
        <div className="welcome-steps">
          <div className="welcome-step">
            <span className="welcome-step-num">1</span>
            <div className="welcome-step-body">
              <strong>Write your poem</strong>
              <span>Type in the big text area. Title and form note are optional.</span>
            </div>
          </div>
          <div className="welcome-step">
            <span className="welcome-step-num">2</span>
            <div className="welcome-step-body">
              <strong>Use the tools panel</strong>
              <span>Live word count, rhyme scheme, syllable count, and more — on the right.</span>
            </div>
          </div>
          <div className="welcome-step">
            <span className="welcome-step-num">3</span>
            <div className="welcome-step-body">
              <strong>Save or export</strong>
              <span>Snapshots let you save drafts of the same poem. Export as .txt, .docx, or copy it.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="welcome-banner-actions">
        {onOpenGuide && (
          <button
            type="button"
            className="small-btn small-btn-primary welcome-guide-btn"
            onClick={() => { onOpenGuide(); dismiss(); }}
          >
            Full guide →
          </button>
        )}
        <button
          type="button"
          className="small-btn welcome-dismiss-btn"
          onClick={dismiss}
        >
          Got it, start writing
        </button>
      </div>
    </div>
  );
}
