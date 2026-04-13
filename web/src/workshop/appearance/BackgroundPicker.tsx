import { useState, useCallback } from "react";
import "./BackgroundPicker.css";
import {
  BACKGROUND_OPTIONS,
  type AppearanceSettings,
  type BackgroundId,
  type CustomBackgroundTheme,
} from "./appearance";
import { generateBackground } from "./generate-background";

// Filter the "custom" entry out of the regular preset grid.
const PRESET_OPTIONS = BACKGROUND_OPTIONS.filter((o) => o.id !== "custom");

export function BackgroundPicker(props: {
  background: BackgroundId;
  onChange: (next: AppearanceSettings) => void;
  appearance: AppearanceSettings;
}) {
  const { background, onChange, appearance } = props;

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomBackgroundTheme | null>(null);

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setGenerating(true);
    setGenerateError(null);
    setDraft(null);
    try {
      const result = await generateBackground(trimmed);
      setDraft(result);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Generation failed — please try again.");
    } finally {
      setGenerating(false);
    }
  }, [prompt]);

  const handleUseDraft = useCallback(() => {
    if (!draft) return;
    onChange({ ...appearance, background: "custom", customBackground: draft });
    setDraft(null);
    setPrompt("");
  }, [draft, appearance, onChange]);

  const handleDiscardDraft = useCallback(() => {
    setDraft(null);
  }, []);

  const handleRemoveCustom = useCallback(() => {
    onChange({ ...appearance, background: "default", customBackground: null });
  }, [appearance, onChange]);

  const isCustomActive = background === "custom" && appearance.customBackground != null;

  return (
    <div className="bg-picker" role="radiogroup" aria-label="Page backdrop">
      <div className="bg-picker-grid">
        {PRESET_OPTIONS.map((o) => {
          const selected = o.id === background;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`bg-picker-card ${selected ? "is-selected" : ""}`}
              onClick={() => onChange({ ...appearance, background: o.id })}
            >
              <span
                className={`bg-picker-swatch bg-picker-swatch--${o.id}`}
                aria-hidden
              />
              <span className="bg-picker-glyph" aria-hidden>
                {o.glyph}
              </span>
              <span className="bg-picker-text">
                <span className="bg-picker-label">{o.label}</span>
                <span className="bg-picker-blurb">{o.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom backdrop creator */}
      <div className="bg-creator">
        <p className="bg-creator-heading">Create your own</p>

        {isCustomActive && (
          <div className="bg-creator-active-card">
            <span
              className="bg-creator-active-dot"
              style={{ background: appearance.customBackground!.accent }}
            />
            <span className="bg-creator-active-label">
              {appearance.customBackground!.label}
            </span>
            <span className="bg-creator-active-hint">active</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleRemoveCustom}
            >
              Remove
            </button>
          </div>
        )}

        <textarea
          className="bg-creator-textarea"
          placeholder="Describe your backdrop — a mood, a scene, or paste your poem — and the AI will generate a matching colour palette."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleGenerate();
            }
          }}
          rows={3}
        />

        <div className="bg-creator-actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!prompt.trim() || generating}
            onClick={() => void handleGenerate()}
          >
            {generating ? "Generating…" : "Generate backdrop"}
          </button>
          {generateError && (
            <p className="bg-creator-error">{generateError}</p>
          )}
        </div>

        {draft && (
          <div className="bg-creator-preview">
            <div className="bg-creator-preview-swatches">
              {([draft.bg, draft.surface, draft.accent, draft.text] as const).map(
                (color, i) => (
                  <span
                    key={i}
                    className="bg-creator-preview-dot"
                    style={{ background: color }}
                    title={color}
                  />
                ),
              )}
            </div>
            <span className="bg-creator-preview-label">{draft.label}</span>
            <div className="bg-creator-preview-actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleUseDraft}
              >
                Use this
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleDiscardDraft}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
