import type { SpellMode } from "../draft/local-draft-storage";
import { normalizeWordToken, wordSpansInLine } from "../writing/tokenize";
import { suggestCorrections } from "./suggest";

export interface SpellHit {
  lineNumber: number;
  word: string;
  normalized: string;
  suggestions: string[];
}

function shouldSkipPermissive(token: string, normalized: string): boolean {
  if (normalized.length <= 1) return true;
  if (/\d/.test(token)) return true;
  if (/[^a-zA-Z']/.test(token.replace(/'/g, ""))) return true;
  if (token === token.toUpperCase() && token.length >= 2 && /[A-Z]/.test(token))
    return true;
  return false;
}

function shouldSkipStrict(_token: string, normalized: string): boolean {
  if (normalized.length <= 1) return true;
  if (/^\d+$/.test(normalized)) return true;
  return false;
}

function inDictionary(dict: Set<string>, normalized: string): boolean {
  if (dict.has(normalized)) return true;
  const flat = normalized.replace(/'/g, "");
  if (flat !== normalized && dict.has(flat)) return true;
  return false;
}

function inWordSet(set: Set<string>, normalized: string): boolean {
  if (set.has(normalized)) return true;
  const flat = normalized.replace(/'/g, "");
  if (flat !== normalized && set.has(flat)) return true;
  return false;
}

function isMisspelled(
  raw: string,
  normalized: string,
  dict: Set<string>,
  personal: Set<string>,
  sessionIgnores: Set<string>,
  mode: SpellMode,
): boolean {
  if (!normalized) return false;
  if (mode === "permissive" && shouldSkipPermissive(raw, normalized))
    return false;
  if (mode === "strict" && shouldSkipStrict(raw, normalized)) return false;
  if (inWordSet(personal, normalized) || inWordSet(sessionIgnores, normalized))
    return false;
  if (inDictionary(dict, normalized)) return false;
  return true;
}

/** Character offsets in `fullText` for unknown tokens (for editor decorations). */
export function spellErrorRangesFromText(
  fullText: string,
  dict: Set<string>,
  personal: Set<string>,
  sessionIgnores: Set<string>,
  mode: SpellMode,
): { from: number; to: number }[] {
  const lines = fullText.split("\n");
  const ranges: { from: number; to: number }[] = [];
  let base = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const span of wordSpansInLine(line)) {
      const normalized = normalizeWordToken(span.raw);
      if (
        !isMisspelled(
          span.raw,
          normalized,
          dict,
          personal,
          sessionIgnores,
          mode,
        )
      )
        continue;
      ranges.push({ from: base + span.start, to: base + span.end });
    }
    base += line.length + 1;
  }
  return ranges;
}

export function scanLinesForSpelling(
  lines: string[],
  dict: Set<string>,
  personal: Set<string>,
  sessionIgnores: Set<string>,
  mode: SpellMode,
): SpellHit[] {
  const hits: SpellHit[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const span of wordSpansInLine(line)) {
      const normalized = normalizeWordToken(span.raw);
      if (
        !isMisspelled(
          span.raw,
          normalized,
          dict,
          personal,
          sessionIgnores,
          mode,
        )
      )
        continue;

      hits.push({
        lineNumber: i + 1,
        word: span.raw,
        normalized,
        suggestions: suggestCorrections(normalized, dict, 5),
      });
    }
  }
  return hits;
}
