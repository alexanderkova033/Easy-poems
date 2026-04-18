import "./FirstVisitHint.css";
import { useCallback, useEffect, useState } from "react";
import { FIRST_VISIT_HINT_STORAGE_KEY, readFirstVisitHintDismissed } from "./firstVisitHintStorage";

const STEPS = [
  {
    icon: "✏️",
    title: "Type your poem here",
    desc: "The big text area on the left. Title is optional.",
  },
  {
    icon: "📊",
    title: "Watch the tools panel",
    desc: "Rhyme scheme, syllables, repeats — all update live as you type.",
  },
  {
    icon: "✦",
    title: 'Press \u201cAnalyze poem\u201d',
    desc: "Scroll to the bottom of the tools panel and get AI feedback on each line.",
  },
  {
    icon: "↓",
    title: "Export when ready",
    desc: "Download as .docx or .txt, or use Reading Mode for a clean view.",
  },
];

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
    try { localStorage.setItem(FIRST_VISIT_HINT_STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
    onDismissed?.();
  }, [onDismissed]);

  if (!visible) return null;

  return (
    <div className="welcome-banner" role="banner">
      <div className="welcome-headline">
        <span className="welcome-leaf" aria-hidden>❧</span>
        <div>
          <h2 className="welcome-title">Welcome to Easy Poems</h2>
          <p className="welcome-sub">Four steps to your first poem:</p>
        </div>
      </div>

      {/* Comic strip */}
      <div className="welcome-comic-strip">
        {STEPS.map((step, i) => (
          <div key={i} className="welcome-comic-cell">
            <div className="welcome-comic-icon" aria-hidden>{step.icon}</div>
            <div className="welcome-comic-num" aria-hidden>{i + 1}</div>
            <strong className="welcome-comic-title">{step.title}</strong>
            <span className="welcome-comic-desc">{step.desc}</span>
          </div>
        ))}
      </div>

      <p className="welcome-cmdk-hint">
        <kbd className="welcome-kbd">Ctrl</kbd>/<kbd className="welcome-kbd">⌘</kbd>
        <kbd className="welcome-kbd">K</kbd>
        {" "}opens the command palette — search all features from there.
      </p>

      <div className="welcome-banner-actions">
        {onOpenGuide && (
          <button
            type="button"
            className="small-btn small-btn-primary welcome-guide-btn"
            onClick={() => { onOpenGuide(); dismiss(); }}
          >
            Full interactive guide →
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
