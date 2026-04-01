import {
  trySessionStorageSetItem,
  tryLocalStorageSetItem,
} from "../infrastructure/browser-storage";

const KEY_DICT = "easy-poems:spell:personal:v1";
const KEY_IGNORE = "easy-poems:spell:ignore-session:v1";

function readJsonSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return new Set();
    return new Set(v.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeJsonSet(key: string, s: Set<string>): boolean {
  return tryLocalStorageSetItem(key, JSON.stringify([...s]));
}

export function loadPersonalDictionary(): Set<string> {
  return readJsonSet(KEY_DICT);
}

export function addToPersonalDictionary(word: string): boolean {
  const w = word.toLowerCase().trim();
  if (!w) return true;
  const s = loadPersonalDictionary();
  s.add(w);
  return writeJsonSet(KEY_DICT, s);
}

export function loadSessionIgnores(): Set<string> {
  try {
    const raw = sessionStorage.getItem(KEY_IGNORE);
    if (!raw) return new Set();
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return new Set();
    return new Set(v.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function ignoreWordForSession(word: string): boolean {
  const w = word.toLowerCase().trim();
  if (!w) return true;
  const s = loadSessionIgnores();
  s.add(w);
  return trySessionStorageSetItem(KEY_IGNORE, JSON.stringify([...s]));
}
