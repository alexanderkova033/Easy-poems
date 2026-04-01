import { tryLocalStorageSetItem } from "../../functionality/infrastructure/browser-storage";

const STORAGE_KEY = "easy-poems:appearance:v1";

export const POEM_FONT_OPTIONS = [
  { id: "literata", label: "Literata" },
  { id: "spectral", label: "Spectral" },
  { id: "lora", label: "Lora" },
  { id: "crimson-pro", label: "Crimson Pro" },
  { id: "source-serif", label: "Source Serif 4" },
  { id: "eb-garamond", label: "EB Garamond" },
] as const;

export const UI_FONT_OPTIONS = [
  { id: "dm-sans", label: "DM Sans" },
  { id: "source-sans", label: "Source Sans 3" },
  { id: "system", label: "System UI" },
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
] as const;

export type PoemFontId = (typeof POEM_FONT_OPTIONS)[number]["id"];
export type UiFontId = (typeof UI_FONT_OPTIONS)[number]["id"];
export type BackgroundId = (typeof BACKGROUND_OPTIONS)[number]["id"];

export interface AppearanceSettings {
  poemFont: PoemFontId;
  uiFont: UiFontId;
  background: BackgroundId;
}

const DEFAULTS: AppearanceSettings = {
  poemFont: "literata",
  uiFont: "dm-sans",
  background: "default",
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
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAppearance(s: AppearanceSettings): boolean {
  return tryLocalStorageSetItem(STORAGE_KEY, JSON.stringify(s));
}

export function applyAppearance(s: AppearanceSettings): void {
  const el = document.documentElement;
  el.dataset.poemFont = s.poemFont;
  el.dataset.uiFont = s.uiFont;
  if (s.background === "default") delete el.dataset.workshopBg;
  else el.dataset.workshopBg = s.background;
}
