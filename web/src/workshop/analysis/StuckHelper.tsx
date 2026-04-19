import { useState, useCallback } from "react";
import "./StuckHelper.css";

type SuggestType = "continue" | "words" | "rhyme" | "spark" | "line";

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
  { id: "continue", icon: "→",  label: "Continue",     desc: "What comes next"        },
  { id: "words",    icon: "✦",  label: "Better words", desc: "Vivid alternatives"      },
  { id: "rhyme",    icon: "♪",  label: "Rhymes",       desc: "For your last line"      },
  { id: "spark",    icon: "⚡", label: "New angle",    desc: "Break out of a rut"      },
  { id: "line",     icon: "✏",  label: "Fix a line",   desc: "Rewrite a specific line" },
];

async function fetchSuggestions(
  title: string,
  lines: string[],
  type: SuggestType,
  context: string,
  targetLine?: string,
): Promise<SuggestResult> {
  const res = await fetch("/api/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, lines, type, context, targetLine }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SuggestResult>;
}

function SuggestionCard({
  text,
  onInsert,
}: {
  text: string;
  onInsert?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, [text]);

  return (
    <div className="sh-suggestion">
      <p className="sh-suggestion-text">{text}</p>
      <div className="sh-suggestion-actions">
        <button
          type="button"
          className={`sh-action-btn${copied ? " is-copied" : ""}`}
          onClick={handleCopy}
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
          title={copied ? "Copied!" : "Copy"}
        >
          {copied ? "✓" : "⎘"}
        </button>
        {onInsert && (
          <button
            type="button"
            className="sh-action-btn sh-insert-btn"
            onClick={() => onInsert(text)}
            aria-label="Insert into poem"
            title="Append to poem"
          >
            ↓
          </button>
        )}
      </div>
    </div>
  );
}

export interface StuckHelperProps {
  title: string;
  lines: string[];
  /** Called when user clicks Insert on a suggestion — appends text to poem. */
  onInsert?: (text: string) => void;
}

export function StuckHelper({ title, lines, onInsert }: StuckHelperProps) {
  const [activeType, setActiveType] = useState<SuggestType | null>(null);
  const [context, setContext] = useState("");
  const [targetLine, setTargetLine] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (type: SuggestType) => {
    setActiveType(type);
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await fetchSuggestions(
        title,
        lines,
        type,
        context,
        type === "line" ? targetLine : undefined,
      );
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [title, lines, context, targetLine]);

  const hasPoem = lines.some(l => l.trim().length > 0);

  const resultLabel = () => {
    if (!activeType) return "";
    if (activeType === "words") return "Word suggestions";
    if (activeType === "rhyme") return result?.rhymes_with ? `Rhymes for "${result.rhymes_with}"` : "Rhyme suggestions";
    if (activeType === "spark") return "Creative directions";
    if (activeType === "line") return "Line rewrites";
    return "Continue with\u2026";
  };

  return (
    <div className="sh-root">
      {/* Mode cards */}
      <div className="sh-modes">
        {TYPE_CONFIG.map(({ id, icon, label, desc }) => {
          const isActive = activeType === id && !loading && result !== null;
          const isLoading = loading && activeType === id;
          return (
            <button
              key={id}
              type="button"
              className={`sh-mode-card${isActive ? " is-active" : ""}${isLoading ? " is-loading" : ""}`}
              onClick={() => handleGenerate(id)}
              disabled={loading}
              title={desc}
            >
              <span className="sh-mode-icon" aria-hidden>
                {isLoading ? "" : icon}
              </span>
              {isLoading && <span className="sh-spinner" aria-hidden />}
              <span className="sh-mode-label">{label}</span>
              <span className="sh-mode-desc">{desc}</span>
            </button>
          );
        })}
      </div>

      {/* "Fix a line" target input — shown when that mode is selected */}
      {(activeType === "line" || result?.suggestions.length === 0) && (
        <div className="sh-line-input-wrap">
          <label className="sh-line-input-label" htmlFor="sh-target-line">
            Line to fix
          </label>
          <input
            id="sh-target-line"
            type="text"
            className="sh-context-input"
            value={targetLine}
            onChange={e => setTargetLine(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void handleGenerate("line"); }}
            placeholder="Paste the line you want to rewrite…"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}

      {/* Context / optional note */}
      <input
        type="text"
        className="sh-context-input"
        placeholder={
          activeType === "line"
            ? "Optional note — e.g. \u201cwant it to feel more vivid\u201d"
            : hasPoem
              ? "Optional note\u2009\u2014\u2009e.g. \u201cwants to feel hopeful\u201d"
              : "Paste a line or describe your poem idea\u2026"
        }
        value={context}
        onChange={e => setContext(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && activeType) void handleGenerate(activeType); }}
        maxLength={200}
        aria-label="Optional context note"
      />

      {/* Error */}
      {error && (
        <div className="sh-error" role="alert">{error}</div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="sh-results">
          <div className="sh-results-header">
            <span className="sh-results-label">{resultLabel()}</span>
            <button
              type="button"
              className="sh-regenerate-btn"
              onClick={() => activeType && void handleGenerate(activeType)}
              title="Generate again"
            >
              ↺ Again
            </button>
          </div>
          <div className="sh-suggestions">
            {result.suggestions.map((s, i) => (
              <SuggestionCard key={i} text={s} onInsert={onInsert} />
            ))}
          </div>
        </div>
      )}

      {/* Idle state */}
      {!result && !loading && !error && (
        <div className="sh-idle">
          <span className="sh-idle-icon" aria-hidden>💡</span>
          <p className="sh-idle-hint">
            {hasPoem
              ? "Pick a mode to get suggestions based on your poem."
              : "Write a few lines first, then come back for suggestions."}
          </p>
        </div>
      )}
    </div>
  );
}
