import { tryLocalStorageSetItem } from "@/shared/platform/browser-storage";
import { STORAGE_KEY_APPEARANCE } from "@/shared/storage-keys";

const STORAGE_KEY = STORAGE_KEY_APPEARANCE;

export const POEM_FONT_OPTIONS = [
  { id: "literata", label: "Literata" },
  { id: "spectral", label: "Spectral" },
  { id: "lora", label: "Lora" },
  { id: "crimson-pro", label: "Crimson Pro" },
  { id: "source-serif", label: "Source Serif 4" },
  { id: "eb-garamond", label: "EB Garamond" },
  { id: "playfair", label: "Playfair Display" },
  { id: "cormorant", label: "Cormorant Garamond" },
  { id: "merriweather", label: "Merriweather" },
  { id: "alegreya", label: "Alegreya" },
  { id: "dm-serif", label: "DM Serif Display" },
  { id: "libre-baskerville", label: "Libre Baskerville" },
] as const;

export const UI_FONT_OPTIONS = [
  { id: "dm-sans", label: "DM Sans" },
  { id: "source-sans", label: "Source Sans 3" },
  { id: "inter", label: "Inter" },
  { id: "nunito", label: "Nunito" },
  { id: "system", label: "System UI" },
] as const;

export const POEM_SIZE_OPTIONS = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra Large" },
] as const;

export const POEM_WEIGHT_OPTIONS = [
  { id: "normal", label: "Regular" },
  { id: "medium", label: "Medium" },
  { id: "bold", label: "Bold" },
] as const;

export const POEM_DECORATION_OPTIONS = [
  { id: "none", label: "None" },
  { id: "underline", label: "Underline" },
] as const;

export const BACKGROUND_OPTIONS = [
  {
    id: "default",
    label: "Studio",
    blurb: "Soft sage mesh and quiet grid.",
    glyph: "◇",
  },
  {
    id: "paper",
    label: "Warm paper",
    blurb: "Notebook rules, ink washes, layered cream warmth.",
    glyph: "✎",
  },
  {
    id: "night",
    label: "Night garden",
    blurb: "Stars, moonward glow, deep borders.",
    glyph: "☽",
  },
  {
    id: "forest",
    label: "Deep forest",
    blurb: "Fronds, pine needles, mossy depth.",
    glyph: "❧",
  },
  {
    id: "dawn",
    label: "Dawn blush",
    blurb: "Rose sunbeams, haze bands, pearlescent highlights.",
    glyph: "✦",
  },
  {
    id: "slate",
    label: "Cool slate",
    blurb: "Hex mesh, cool haze, studio blue.",
    glyph: "⬡",
  },
  {
    id: "stone",
    label: "Stone",
    blurb: "Quiet grey, diamond lattice, minimal.",
    glyph: "◆",
  },
  {
    id: "crimson",
    label: "Crimson dusk",
    blurb: "Slow ember drift, horizon glow, ash ribbons and sparks.",
    glyph: "♦",
  },
  {
    id: "ocean",
    label: "Open ocean",
    blurb: "Depth haze, caustic diamonds, kelp veils, rising bubbles.",
    glyph: "≋",
  },
  {
    id: "aurora",
    label: "Aurora",
    blurb: "Twin light-curtains, violet-mint wash, moving starfield.",
    glyph: "✧",
  },
  {
    id: "parchment",
    label: "Old parchment",
    blurb: "Laid fibers, foxing blooms, candlelit fold-shadows.",
    glyph: "📜",
  },
  {
    id: "dusk",
    label: "Amber dusk",
    blurb: "Sun below the horizon, amber ember wash, long shadows.",
    glyph: "☀",
  },
  {
    id: "winter",
    label: "Winter",
    blurb: "Pale ice, crystalline lattice, cold silver light.",
    glyph: "❄",
  },
] as const;

export type PoemFontId = (typeof POEM_FONT_OPTIONS)[number]["id"];
export type UiFontId = (typeof UI_FONT_OPTIONS)[number]["id"];
export type BackgroundId = (typeof BACKGROUND_OPTIONS)[number]["id"];
export type PoemSizeId = (typeof POEM_SIZE_OPTIONS)[number]["id"];
export type PoemWeightId = (typeof POEM_WEIGHT_OPTIONS)[number]["id"];
export type PoemDecorationId = (typeof POEM_DECORATION_OPTIONS)[number]["id"];
export type BackdropMotionSetting = "system" | "on" | "off";
export type BackdropPowerSetting = "off" | "low" | "very-low";

export interface AppearanceSettings {
  poemFont: PoemFontId;
  uiFont: UiFontId;
  background: BackgroundId;
  poemSize: PoemSizeId;
  poemWeight: PoemWeightId;
  poemDecoration: PoemDecorationId;
  /** Overrides animation preference. */
  backdropMotion: BackdropMotionSetting;
  /** Reduce paint complexity (fewer layers / less blend). */
  backdropPower: BackdropPowerSetting;
}

const DEFAULTS: AppearanceSettings = {
  poemFont: "literata",
  uiFont: "dm-sans",
  background: "default",
  poemSize: "md",
  poemWeight: "normal",
  poemDecoration: "none",
  backdropMotion: "system",
  backdropPower: "off",
};

export function defaultAppearance(): AppearanceSettings {
  return { ...DEFAULTS };
}

function isPoemFontId(x: string): x is PoemFontId {
  return POEM_FONT_OPTIONS.some((o) => o.id === x);
}

function isUiFontId(x: string): x is UiFontId {
  return UI_FONT_OPTIONS.some((o) => o.id === x);
}

function isBackgroundId(x: string): x is BackgroundId {
  return BACKGROUND_OPTIONS.some((o) => o.id === x);
}

function isPoemSizeId(x: string): x is PoemSizeId {
  return POEM_SIZE_OPTIONS.some((o) => o.id === x);
}

function isPoemWeightId(x: string): x is PoemWeightId {
  return POEM_WEIGHT_OPTIONS.some((o) => o.id === x);
}

function isPoemDecorationId(x: string): x is PoemDecorationId {
  return POEM_DECORATION_OPTIONS.some((o) => o.id === x);
}

function isBackdropMotionSetting(x: string): x is BackdropMotionSetting {
  return x === "system" || x === "on" || x === "off";
}

function isBackdropPowerSetting(x: string): x is BackdropPowerSetting {
  return x === "off" || x === "low" || x === "very-low";
}

const APPEARANCE_SCHEMA_VERSION = 3;

export function loadAppearance(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return { ...DEFAULTS };
    const o = v as Record<string, unknown>;
    return {
      poemFont:
        typeof o.poemFont === "string" && isPoemFontId(o.poemFont)
          ? o.poemFont
          : DEFAULTS.poemFont,
      uiFont:
        typeof o.uiFont === "string" && isUiFontId(o.uiFont)
          ? o.uiFont
          : DEFAULTS.uiFont,
      background:
        typeof o.background === "string" && isBackgroundId(o.background)
          ? o.background
          : DEFAULTS.background,
      poemSize:
        typeof o.poemSize === "string" && isPoemSizeId(o.poemSize)
          ? o.poemSize
          : DEFAULTS.poemSize,
      poemWeight:
        typeof o.poemWeight === "string" && isPoemWeightId(o.poemWeight)
          ? o.poemWeight
          : DEFAULTS.poemWeight,
      poemDecoration:
        typeof o.poemDecoration === "string" && isPoemDecorationId(o.poemDecoration)
          ? o.poemDecoration
          : DEFAULTS.poemDecoration,
      backdropMotion:
        typeof o.backdropMotion === "string" && isBackdropMotionSetting(o.backdropMotion)
          ? o.backdropMotion
          : DEFAULTS.backdropMotion,
      backdropPower:
        typeof o.backdropPower === "string" && isBackdropPowerSetting(o.backdropPower)
          ? o.backdropPower
          : typeof o.lowPowerBackdrops === "boolean"
            ? (o.lowPowerBackdrops ? "low" : "off")
            : DEFAULTS.backdropPower,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAppearance(s: AppearanceSettings): boolean {
  return tryLocalStorageSetItem(
    STORAGE_KEY,
    JSON.stringify({ schemaVersion: APPEARANCE_SCHEMA_VERSION, ...s }),
  );
}

const POEM_SIZE_VAR: Record<PoemSizeId, string> = {
  sm: "0.88rem",
  md: "1rem",
  lg: "1.15rem",
  xl: "1.3rem",
};

const POEM_WEIGHT_VAR: Record<PoemWeightId, string> = {
  normal: "400",
  medium: "500",
  bold: "700",
};

let _lastBg: string | undefined;

export function applyAppearance(s: AppearanceSettings): void {
  const el = document.documentElement;
  el.dataset.poemFont = s.poemFont;
  el.dataset.uiFont = s.uiFont;

  // Cross-fade backdrop when the background theme changes.
  const nextBg = s.background === "default" ? "" : s.background;
  if (_lastBg !== undefined && _lastBg !== nextBg) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      el.classList.add("theme-switching");
      requestAnimationFrame(() => {
        if (s.background === "default") delete el.dataset.workshopBg;
        else el.dataset.workshopBg = s.background;
        requestAnimationFrame(() => el.classList.remove("theme-switching"));
      });
    } else {
      if (s.background === "default") delete el.dataset.workshopBg;
      else el.dataset.workshopBg = s.background;
    }
  } else {
    if (s.background === "default") delete el.dataset.workshopBg;
    else el.dataset.workshopBg = s.background;
  }
  _lastBg = nextBg;
  if (s.backdropMotion === "system") delete el.dataset.backdropMotion;
  else el.dataset.backdropMotion = s.backdropMotion;
  if (s.backdropPower === "off") {
    el.removeAttribute("data-backdrop-low-power");
    delete el.dataset.backdropPower;
  } else {
    el.setAttribute("data-backdrop-low-power", "");
    el.dataset.backdropPower = s.backdropPower;
  }
  el.style.setProperty("--poem-font-size", POEM_SIZE_VAR[s.poemSize]);
  el.style.setProperty("--poem-font-weight", POEM_WEIGHT_VAR[s.poemWeight]);
  el.style.setProperty(
    "--poem-text-decoration",
    s.poemDecoration === "underline" ? "underline" : "none",
  );
}
