import { useCallback, useState } from "react";

const STORAGE_KEY = "easy-poems:first-hint-dismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function FirstVisitHint() {
  const [visible, setVisible] = useState(() => !readDismissed());

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="first-visit-hint" role="status">
      <p className="first-visit-hint-text">
        Your draft saves in this browser on this device. Use Export or copy when you
        want the text somewhere else.
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
