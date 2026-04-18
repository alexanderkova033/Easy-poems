import { useState, useCallback } from "react";
import "./StuckHelper.css";

type SuggestType = "continue" | "words" | "rhyme" | "spark";

interface SuggestResult {
  suggestions: string[];
  rhymes_with?: string;
}

const TYPE_CONFIG: {
  id: SuggestType;
  icon: string;
  label: string;
  desc: string;
}[] = [
  { id: "continue", icon: "→", label: "Continue",     desc: "What comes next" },
  { id: "words",    icon: "✦", label: "Better words", desc: "Vivid alternatives" },
  { id: "rhyme",    icon: "♪", label: "Rhymes",       desc: "For your last line" },
  { id: "spark",    icon: "⚡", label: "New angle",    desc: "Break out of a rut" },
];

async function fetchSuggestions(
  title: string,
  lines: string[],
  type: SuggestType,
  context: string,
): Promise<SuggestResult> {
  const res = await fetch("/api/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, lines, type, context }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SuggestResult>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, [text]);
  return (
    <button
      type="button"
      className={`sh-copy-btn${copied ? " is-copied" : ""}`}
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

export interface StuckHelperProps {
  title: string;
  lines: string[];
}

export function StuckHelper({ title, lines }: StuckHelperProps) {
  const [activeType, setActiveType] = useState<SuggestType | null>(null);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (type: SuggestType) => {
    setActiveType(type);
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await fetchSuggestions(title, lines, type, context);
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [title, lines, context]);

  const hasPoem = lines.some(l => l.trim().length > 0);

  return (
    <div className="sh-root">
      {/* Intro */}
      <div className="sh-intro">
        <p className="sh-intro-text">
          Pick a mode below to get unstuck. Add an optional note to give the AI more context.
        </p>
        <input
          type="text"
          className="sh-context-input"
          placeholder={hasPoem
            ? "Optional note\u2009\u2014\u2009e.g. \u201cwants to feel hopeful\u201d"
            : "Paste a line or describe your poem idea\u2026"}
          value={context}
          onChange={e => setContext(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && activeType) handleGenerate(activeType); }}
          maxLength={200}
        />
      </div>

      {/* Mode cards */}
      <div className="sh-modes">
        {TYPE_CONFIG.map(({ id, icon, label, desc }) => {
          const isActive = activeType === id && !loading && result !== null;
          return (
            <button
              key={id}
              type="button"
              className={`sh-mode-card${isActive ? " is-active" : ""}${loading && activeType === id ? " is-loading" : ""}`}
              onClick={() => handleGenerate(id)}
              disabled={loading}
            >
              <span className="sh-mode-icon" aria-hidden>{loading && activeType === id ? "" : icon}</span>
              {loading && activeType === id && <span className="sh-spinner" aria-hidden />}
              <span className="sh-mode-label">{label}</span>
              <span className="sh-mode-desc">{desc}</span>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="sh-error" role="alert">{error}</div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="sh-results">
          <div className="sh-results-header">
            <span className="sh-results-label">
              {activeType === "words" ? "Word suggestions" :
               activeType === "rhyme" ? `Rhymes${result.rhymes_with ? ` for \u201c${result.rhymes_with}\u201d` : ""}` :
               activeType === "spark" ? "Creative directions" :
               "Continue with\u2026"}
            </span>
            <button
              type="button"
              className="sh-regenerate-btn"
              onClick={() => activeType && handleGenerate(activeType)}
              title="Generate again"
            >
              ↺ Again
            </button>
          </div>
          <ul className="sh-suggestions">
            {result.suggestions.map((s, i) => (
              <li key={i} className="sh-suggestion">
                <span className="sh-suggestion-text">{s}</span>
                <CopyButton text={s} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Idle state */}
      {!result && !loading && !error && (
        <div className="sh-idle">
          <span className="sh-idle-icon" aria-hidden>💡</span>
          <p className="sh-idle-hint">
            {hasPoem
              ? "Choose a mode above to get suggestions based on your poem."
              : "Start writing a few lines, then come back for suggestions."}
          </p>
        </div>
      )}
    </div>
  );
}
