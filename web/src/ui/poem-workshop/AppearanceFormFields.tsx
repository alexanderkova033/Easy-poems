import {
  POEM_FONT_OPTIONS,
  UI_FONT_OPTIONS,
  type AppearanceSettings,
  type PoemFontId,
  type UiFontId,
} from "../preferences/appearance";

export function AppearanceFormFields(props: {
  appearance: AppearanceSettings;
  onChange: (next: AppearanceSettings) => void;
}) {
  const { appearance, onChange } = props;
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
    </div>
  );
}
