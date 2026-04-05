import { tryLocalStorageSetItem } from "@/shared/platform/browser-storage";

const STORAGE_KEY = "easy-poems:appearance:v1";

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
    blurb: "Ruled margins, ink flecks, linen grain.",
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
    blurb: "Sun pillars, rose mist, soft bloom.",
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
] as const;

export type PoemFontId = (typeof POEM_FONT_OPTIONS)[number]["id"];
export type UiFontId = (typeof UI_FONT_OPTIONS)[number]["id"];
export type BackgroundId = (typeof BACKGROUND_OPTIONS)[number]["id"];
export type PoemSizeId = (typeof POEM_SIZE_OPTIONS)[number]["id"];
export type PoemWeightId = (typeof POEM_WEIGHT_OPTIONS)[number]["id"];
export type PoemDecorationId = (typeof POEM_DECORATION_OPTIONS)[number]["id"];

export interface AppearanceSettings {
  poemFont: PoemFontId;
  uiFont: UiFontId;
  background: BackgroundId;
  poemSize: PoemSizeId;
  poemWeight: PoemWeightId;
  poemDecoration: PoemDecorationId;
}

const DEFAULTS: AppearanceSettings = {
  poemFont: "literata",
  uiFont: "dm-sans",
  background: "default",
  poemSize: "md",
  poemWeight: "normal",
  poemDecoration: "none",
};

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
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAppearance(s: AppearanceSettings): boolean {
  return tryLocalStorageSetItem(STORAGE_KEY, JSON.stringify(s));
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

export function applyAppearance(s: AppearanceSettings): void {
  const el = document.documentElement;
  el.dataset.poemFont = s.poemFont;
  el.dataset.uiFont = s.uiFont;
  if (s.background === "default") delete el.dataset.workshopBg;
  else el.dataset.workshopBg = s.background;
  el.style.setProperty("--poem-font-size", POEM_SIZE_VAR[s.poemSize]);
  el.style.setProperty("--poem-font-weight", POEM_WEIGHT_VAR[s.poemWeight]);
  el.style.setProperty(
    "--poem-text-decoration",
    s.poemDecoration === "underline" ? "underline" : "none",
  );
}
