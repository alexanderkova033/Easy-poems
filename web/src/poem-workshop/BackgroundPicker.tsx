import type { CSSProperties } from "react";
import {
  BACKGROUND_OPTIONS,
  type AppearanceSettings,
  type BackgroundId,
} from "./appearance";

const SWATCH_STYLE: Record<BackgroundId, CSSProperties> = {
  default: {
    background:
      "radial-gradient(circle at 32% 24%, rgba(95, 175, 145, 0.28), transparent 56%), radial-gradient(circle at 76% 72%, rgba(55, 115, 95, 0.16), transparent 52%), linear-gradient(148deg, #e6f0e9 0%, #d2e3d8 46%, #bcd0c6 100%)",
  },
  paper: {
    background:
      "radial-gradient(ellipse 120% 100% at 14% 28%, rgba(180, 132, 82, 0.18), transparent 72%), radial-gradient(ellipse 100% 90% at 88% 22%, rgba(105, 138, 102, 0.14), transparent 70%), repeating-linear-gradient(0deg, transparent, transparent 26px, rgba(65, 55, 42, 0.14) 26px, rgba(65, 55, 42, 0.14) 27px), linear-gradient(180deg, #faf7f1 0%, #efe8df 100%)",
  },
  night: {
    background:
      // Make the “Night garden” vibe readable at 2.6rem: star specks + moon glow + green haze.
      "radial-gradient(ellipse 90% 55% at 50% -18%, rgba(200, 224, 255, 0.16), transparent 62%), radial-gradient(ellipse 120% 70% at 50% 120%, rgba(95, 185, 145, 0.28), transparent 55%), radial-gradient(circle at 14% 24%, rgba(52, 135, 108, 0.26), transparent 48%), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cg fill='%23ffffff'%3E%3Ccircle cx='10' cy='14' r='0.8' fill-opacity='0.45'/%3E%3Ccircle cx='34' cy='8' r='0.6' fill-opacity='0.35'/%3E%3Ccircle cx='58' cy='18' r='0.7' fill-opacity='0.38'/%3E%3Ccircle cx='70' cy='44' r='0.55' fill-opacity='0.32'/%3E%3Ccircle cx='18' cy='54' r='0.6' fill-opacity='0.34'/%3E%3Ccircle cx='44' cy='60' r='0.75' fill-opacity='0.4'/%3E%3Ccircle cx='62' cy='68' r='0.65' fill-opacity='0.36'/%3E%3Ccircle cx='8' cy='74' r='0.5' fill-opacity='0.3'/%3E%3C/g%3E%3C/svg%3E\") 0 0 / 80px 80px, linear-gradient(182deg, #0b1311 0%, #040806 100%)",
  },
  forest: {
    background:
      "radial-gradient(ellipse 115% 52% at 50% 108%, rgba(93, 212, 152, 0.22), transparent 58%), radial-gradient(circle at 14% 24%, rgba(45, 175, 112, 0.22), transparent 48%), radial-gradient(circle at 88% 12%, rgba(110, 240, 175, 0.12), transparent 52%), linear-gradient(168deg, #0c1813 0%, #05100a 100%)",
  },
  dawn: {
    background:
      "radial-gradient(ellipse 95% 72% at 18% -8%, rgba(255, 200, 220, 0.42), transparent 58%), radial-gradient(ellipse 75% 48% at 92% 28%, rgba(255, 175, 200, 0.22), transparent 56%), linear-gradient(186deg, #f9f5f7 0%, #f3eaed 100%)",
  },
  slate: {
    background:
      "radial-gradient(ellipse 100% 80% at 50% 100%, rgba(58, 128, 205, 0.22), transparent 55%), linear-gradient(135deg, rgba(120, 175, 220, 0.16) 25%, transparent 25%) 0 0 / 11px 11px, linear-gradient(45deg, rgba(92, 138, 195, 0.12) 25%, transparent 25%) 0 0 / 11px 11px, linear-gradient(162deg, #101622 0%, #080b10 100%)",
  },
  stone: {
    background:
      "radial-gradient(circle at 88% 8%, rgba(210, 205, 192, 0.12), transparent 45%), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath fill='none' stroke='%23b5ae9622' stroke-width='0.7' d='M14 0L28 14L14 28L0 14z'/%3E%3Ccircle cx='14' cy='14' r='2' fill='%23b5ae9618'/%3E%3C/svg%3E\") 0 0 / 28px 28px, linear-gradient(158deg, #262623 0%, #1c1c1a 100%)",
  },
  crimson: {
    background:
      "radial-gradient(circle at 28% 26%, rgba(216, 104, 120, 0.26), transparent 56%), radial-gradient(circle at 72% 72%, rgba(195, 48, 68, 0.2), transparent 54%), radial-gradient(ellipse 90% 40% at 50% 100%, rgba(13, 5, 7, 0.65), transparent 50%), linear-gradient(156deg, #190b0d 0%, #0d0507 100%)",
  },
  ocean: {
    background:
      "radial-gradient(circle at 22% 22%, rgba(82, 192, 224, 0.22), transparent 56%), radial-gradient(circle at 78% 68%, rgba(34, 135, 198, 0.18), transparent 56%), radial-gradient(ellipse 100% 50% at 50% 100%, rgba(1, 11, 18, 0.75), transparent 48%), linear-gradient(155deg, #06141e 0%, #010b12 100%)",
  },
  aurora: {
    background:
      "radial-gradient(circle at 50% 8%, rgba(168, 120, 240, 0.32), transparent 55%), radial-gradient(circle at 18% 28%, rgba(48, 185, 145, 0.2), transparent 58%), radial-gradient(circle at 82% 40%, rgba(200, 175, 255, 0.16), transparent 58%), linear-gradient(158deg, #0b1024 0%, #030711 100%)",
  },
  parchment: {
    background:
      "radial-gradient(circle at 24% 32%, rgba(150, 105, 55, 0.2), transparent 58%), radial-gradient(circle at 76% 68%, rgba(210, 170, 95, 0.18), transparent 60%), repeating-linear-gradient(0deg, rgba(85, 58, 28, 0.05), rgba(85, 58, 28, 0.05) 1px, transparent 1px, transparent 9px), linear-gradient(180deg, #f2e8d4 0%, #e4d4b4 100%)",
  },
};

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
                style={SWATCH_STYLE[o.id]}
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
