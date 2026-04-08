import {
  POEM_FONT_OPTIONS,
  UI_FONT_OPTIONS,
  type AppearanceSettings,
  type BackdropMotionSetting,
  defaultAppearance,
  type PoemFontId,
  type UiFontId,
} from "./appearance";

export function AppearanceFormFields(props: {
  appearance: AppearanceSettings;
  onChange: (next: AppearanceSettings) => void;
}) {
  const { appearance, onChange } = props;

  const powerLabel =
    appearance.backdropPower === "off"
      ? "Low-power backdrops: Off"
      : appearance.backdropPower === "low"
        ? "Low-power backdrops: Low"
        : "Low-power backdrops: Very low";

  const cyclePower = () => {
    const next =
      appearance.backdropPower === "off"
        ? "low"
        : appearance.backdropPower === "low"
          ? "very-low"
          : "off";
    onChange({ ...appearance, backdropPower: next });
  };

  return (
    <div className="appearance-fields" aria-label="Font options">
      <label className="appearance-field">
        Poem font
        <select
          value={appearance.poemFont}
          onChange={(e) =>
            onChange({ ...appearance, poemFont: e.target.value as PoemFontId })
          }
        >
          {POEM_FONT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="appearance-field">
        UI font
        <select
          value={appearance.uiFont}
          onChange={(e) =>
            onChange({ ...appearance, uiFont: e.target.value as UiFontId })
          }
        >
          {UI_FONT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="appearance-field">
        Backdrop intensity
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={appearance.backdropIntensity}
          onChange={(e) =>
            onChange({
              ...appearance,
              backdropIntensity: Number.parseInt(e.target.value, 10),
            })
          }
        />
        <span className="muted small">{appearance.backdropIntensity}%</span>
      </label>

      <label className="appearance-field">
        Backdrop motion
        <select
          value={appearance.backdropMotion}
          onChange={(e) =>
            onChange({
              ...appearance,
              backdropMotion: e.target.value as BackdropMotionSetting,
            })
          }
        >
          <option value="system">System</option>
          <option value="on">On</option>
          <option value="off">Off</option>
        </select>
      </label>

      <div className="appearance-field">
        Backdrop power
        <button
          type="button"
          className={`small-btn ${appearance.backdropPower !== "off" ? "is-selected" : ""}`}
          onClick={cyclePower}
          aria-pressed={appearance.backdropPower !== "off"}
        >
          {powerLabel}
        </button>
        <span className="muted small">
          Click to cycle: Off → Low → Very low.
        </span>
      </div>

      <div className="appearance-actions">
        <button
          type="button"
          className="small-btn"
          onClick={() => onChange(defaultAppearance())}
        >
          Reset appearance
        </button>
      </div>
    </div>
  );
}
