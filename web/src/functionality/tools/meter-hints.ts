import { countSyllablesInLine, countSyllablesInWord } from "./syllables";
import { wordsInLine } from "./tokenize";

const FUNCTION_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "to",
  "with",
  "without",
  "so",
  "than",
  "then",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "done",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "not",
  "no",
  "nor",
  "too",
  "very",
  "just",
  "only",
  "own",
  "same",
  "such",
  "there",
  "here",
  "when",
  "where",
  "while",
  "upon",
  "about",
  "above",
  "below",
  "again",
  "once",
  "also",
]);

export interface LineMeterHint {
  lineNumber: number;
  syllables: number;
  /** One mark per estimated syllable: '/' stressed, 'x' unstressed. */
  stressPattern: string;
  /** Share of positions matching a weak-strong (iambic) alternation starting weak. */
  iambicFitPercent: number | null;
}

function normalizeWordForLex(raw: string): string {
  return raw.replace(/^'+|'+$/g, "").toLowerCase();
}

/** Rough stress string for one token; empty if no letters. */
export function stressPatternForWord(raw: string): string {
  const w = normalizeWordForLex(raw);
  if (!w) return "";
  const n = countSyllablesInWord(raw);
  if (n <= 0) return "";
  if (n === 1) {
    return FUNCTION_WORDS.has(w) ? "x" : "/";
  }
  return "/" + "x".repeat(n - 1);
}

export function iambicFitPercentForPattern(pattern: string): number | null {
  if (!pattern) return null;
  let matched = 0;
  for (let i = 0; i < pattern.length; i++) {
    const expect = i % 2 === 0 ? "x" : "/";
    if (pattern[i] === expect) matched++;
  }
  return Math.round((100 * matched) / pattern.length);
}

export function meterHintsForBody(body: string): LineMeterHint[] {
  const rawLines = body.split("\n");
  const out: LineMeterHint[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const text = rawLines[i]!;
    const words = wordsInLine(text);
    let stressPattern = "";
    for (const w of words) {
      stressPattern += stressPatternForWord(w);
    }
    const syllables = countSyllablesInLine(text);
    const iambicFitPercent = iambicFitPercentForPattern(stressPattern);
    out.push({
      lineNumber: i + 1,
      syllables,
      stressPattern,
      iambicFitPercent,
    });
  }
  return out;
}
