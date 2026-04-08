import type { ChangeEvent } from "react";
import type {
  AppearanceSettings,
  BackdropMotionSetting,
  BackdropPowerSetting,
} from "./appearance";

function powerLabel(power: BackdropPowerSetting): string {
  return power === "off"
    ? "Backdrop power: Off"
    : power === "low"
      ? "Backdrop power: Low"
      : "Backdrop power: Very low";
}

function cyclePower(power: BackdropPowerSetting): BackdropPowerSetting {
  return power === "off" ? "low" : power === "low" ? "very-low" : "off";
}

export function BackdropFormFields(props: {
  appearance: AppearanceSettings;
  onChange: (next: AppearanceSettings) => void;
}) {
  const { appearance, onChange } = props;

  const onIntensity = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...appearance,
      backdropIntensity: Number.parseInt(e.target.value, 10),
    });
  };

  const onMotion = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...appearance,
      backdropMotion: e.target.value as BackdropMotionSetting,
    });
  };

  return (
    <div className="appearance-fields" aria-label="Backdrop options">
      <label className="appearance-field">
        Backdrop intensity
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={appearance.backdropIntensity}
          onChange={onIntensity}
        />
        <span className="muted small">{appearance.backdropIntensity}%</span>
      </label>

      <label className="appearance-field">
        Backdrop motion
        <select value={appearance.backdropMotion} onChange={onMotion}>
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
          onClick={() =>
            onChange({
              ...appearance,
              backdropPower: cyclePower(appearance.backdropPower),
            })
          }
          aria-pressed={appearance.backdropPower !== "off"}
        >
          {powerLabel(appearance.backdropPower)}
        </button>
        <span className="muted small">Click to cycle: Off → Low → Very low.</span>
      </div>
    </div>
  );
}

