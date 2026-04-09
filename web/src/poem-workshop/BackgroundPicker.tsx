import {
  BACKGROUND_OPTIONS,
  type AppearanceSettings,
  type BackgroundId,
} from "./appearance";

export function BackgroundPicker(props: {
  background: BackgroundId;
  onChange: (next: AppearanceSettings) => void;
  appearance: AppearanceSettings;
}) {
  const { background, onChange, appearance } = props;
  return (
    <div className="bg-picker" role="radiogroup" aria-label="Page backdrop">
      <div className="bg-picker-grid">
        {BACKGROUND_OPTIONS.map((o) => {
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
    </div>
  );
}
