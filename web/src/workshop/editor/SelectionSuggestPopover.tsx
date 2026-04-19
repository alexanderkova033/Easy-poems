import { useState, useCallback, useEffect, useRef } from "react";
import "./SelectionSuggestPopover.css";

interface Suggestion {
  text: string;
  copied: boolean;
}

async function fetchLineSuggestions(
  title: string,
  lines: string[],
  targetLine: string,
): Promise<string[]> {
  const res = await fetch("/api/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, lines, type: "line", targetLine }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { suggestions?: string[] };
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}

export interface SelectionSuggestPopoverProps {
  anchorRect: DOMRect;
  selectedText: string;
  poemTitle: string;
  poemLines: string[];
  onApply: (text: string) => void;
  onClose: () => void;
}

export function SelectionSuggestPopover({
  anchorRect,
  selectedText,
  poemTitle,
  poemLines,
  onApply,
  onClose,
}: SelectionSuggestPopoverProps) {
  const [phase, setPhase] = useState<"idle" | "loading" | "results" | "error">("idle");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback(async () => {
    setPhase("loading");
    try {
      const results = await fetchLineSuggestions(poemTitle, poemLines, selectedText);
      setSuggestions(results.map((t) => ({ text: t, copied: false })));
      setPhase("results");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setPhase("error");
    }
  }, [poemTitle, poemLines, selectedText]);

  // Auto-fetch on mount
  useEffect(() => { void handleGenerate(); }, []); // eslint-disable-line

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleCopy = useCallback(async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setSuggestions((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, copied: true } : s)),
    );
    setTimeout(
      () => setSuggestions((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, copied: false } : s)),
      ),
      1500,
    );
  }, []);

  // Position: above the selection, centered
  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.max(8, anchorRect.top - 8),
    left: Math.min(
      window.innerWidth - 280,
      Math.max(8, anchorRect.left + anchorRect.width / 2 - 140),
    ),
    transform: "translateY(-100%)",
  };

  return (
    <div className="ssp-wrap" style={style} ref={popoverRef} role="dialog" aria-label="AI line suggestions">
      <div className="ssp-header">
        <span className="ssp-title">✦ Rewrite suggestions</span>
        <button type="button" className="ssp-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {phase === "loading" && (
        <div className="ssp-loading">
          <span className="ssp-dot" /><span className="ssp-dot" /><span className="ssp-dot" />
        </div>
      )}

      {phase === "error" && (
        <p className="ssp-error">{errorMsg}</p>
      )}

      {phase === "results" && (
        <ul className="ssp-list">
          {suggestions.map((s, i) => (
            <li key={i} className="ssp-item">
              <span className="ssp-text">{s.text}</span>
              <div className="ssp-actions">
                <button
                  type="button"
                  className={`ssp-btn${s.copied ? " is-copied" : ""}`}
                  title="Copy"
                  onClick={() => void handleCopy(s.text, i)}
                >
                  {s.copied ? "✓" : "⎘"}
                </button>
                <button
                  type="button"
                  className="ssp-btn ssp-apply"
                  title="Replace selection"
                  onClick={() => { onApply(s.text); onClose(); }}
                >
                  Apply
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="ssp-source">
        <span className="ssp-source-label">Selected:</span>
        <span className="ssp-source-text">{selectedText.slice(0, 60)}{selectedText.length > 60 ? "…" : ""}</span>
      </div>
    </div>
  );
}
