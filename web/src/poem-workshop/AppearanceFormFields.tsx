import {
  POEM_DECORATION_OPTIONS,
  POEM_FONT_OPTIONS,
  POEM_SIZE_OPTIONS,
  POEM_WEIGHT_OPTIONS,
  UI_FONT_OPTIONS,
  type AppearanceSettings,
  type PoemDecorationId,
  type PoemFontId,
  type PoemSizeId,
  type PoemWeightId,
  type UiFontId,
} from "./appearance";

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
        Text size
        <select
          value={appearance.poemSize}
          onChange={(e) =>
            onChange({ ...appearance, poemSize: e.target.value as PoemSizeId })
          }
        >
          {POEM_SIZE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="appearance-field">
        Font weight
        <select
          value={appearance.poemWeight}
          onChange={(e) =>
            onChange({ ...appearance, poemWeight: e.target.value as PoemWeightId })
          }
        >
          {POEM_WEIGHT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="appearance-field">
        Underline
        <select
          value={appearance.poemDecoration}
          onChange={(e) =>
            onChange({ ...appearance, poemDecoration: e.target.value as PoemDecorationId })
          }
        >
          {POEM_DECORATION_OPTIONS.map((o) => (
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
