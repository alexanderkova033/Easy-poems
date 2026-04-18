import { useState, useCallback } from "react";
import "./StuckHelper.css";

type SuggestType = "continue" | "words" | "rhyme" | "spark";

interface SuggestResult {
  suggestions: string[];
  rhymes_with?: string;
}

const TYPE_CONFIG: Record<SuggestType, { label: string; icon: string; hint: string }> = {
  continue: { label: "Continue", icon: "→", hint: "Suggest what comes next" },
  words:    { label: "Better words", icon: "✦", hint: "Evocative words that fit your poem" },
  rhyme:    { label: "Rhymes", icon: "♪", hint: "Words that rhyme with your last line" },
  spark:    { label: "New angle", icon: "⚡", hint: "Surprising creative directions" },
};

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
      className={`stuck-copy-btn${copied ? " is-copied" : ""}`}
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
  const [isOpen, setIsOpen] = useState(false);
  const [activeType, setActiveType] = useState<SuggestType>("continue");
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

  return (
    <section className="stuck-helper">
      <button
        type="button"
        className="stuck-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(o => !o)}
      >
        <span className="stuck-toggle-icon" aria-hidden>💡</span>
        <span className="stuck-toggle-label">Stuck? Get suggestions</span>
        <span className="stuck-toggle-chevron" aria-hidden>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="stuck-body">
          <div className="stuck-type-row">
            {(Object.entries(TYPE_CONFIG) as [SuggestType, typeof TYPE_CONFIG[SuggestType]][]).map(([type, cfg]) => (
              <button
                key={type}
                type="button"
                className={`stuck-type-btn${activeType === type && result ? " is-active" : ""}`}
                title={cfg.hint}
                onClick={() => handleGenerate(type)}
                disabled={loading}
              >
                <span className="stuck-type-icon" aria-hidden>{cfg.icon}</span>
                {cfg.label}
              </button>
            ))}
          </div>

          <div className="stuck-context-row">
            <input
              type="text"
              className="stuck-context-input"
              placeholder={'Optional note (e.g. \u201cabout loss, wants to end hopefully\u201d)'}
              value={context}
              onChange={e => setContext(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleGenerate(activeType); }}
              maxLength={200}
            />
          </div>

          {loading && (
            <div className="stuck-loading">
              <span className="stuck-spinner" aria-hidden />
              Thinking…
            </div>
          )}

          {error && (
            <div className="stuck-error" role="alert">{error}</div>
          )}

          {result && !loading && (
            <div className="stuck-results">
              {result.rhymes_with && (
                <p className="stuck-rhymes-label">
                  Rhymes with <strong>{result.rhymes_with}</strong>:
                </p>
              )}
              <ul className="stuck-suggestions">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="stuck-suggestion">
                    <span className="stuck-suggestion-text">{s}</span>
                    <CopyButton text={s} />
                  </li>
                ))}
              </ul>
              <p className="stuck-regenerate-hint">
                Click a button above to regenerate with a different style.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
