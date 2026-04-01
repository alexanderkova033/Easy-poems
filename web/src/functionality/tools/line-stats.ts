import { countSyllablesInLine } from "./syllables";
import { wordsInLine } from "./tokenize";

export interface LineStatRow {
  lineNumber: number;
  text: string;
  syllables: number;
  words: number;
  chars: number;
}

export interface DocumentStats {
  lines: LineStatRow[];
  totalLines: number;
  nonEmptyLines: number;
  totalSyllables: number;
  totalWords: number;
  totalChars: number;
  /** Non-empty line groups separated by one or more blank lines. */
  stanzaCount: number;
  /** Mean words per non-empty line (1 decimal); 0 if no non-empty lines. */
  avgWordsPerNonEmptyLine: number;
  /** Line with the most words (ties: earliest line). */
  longestLineByWords: { lineNumber: number; words: number } | null;
  /** Line with the most characters (ties: earliest line). */
  longestLineByChars: { lineNumber: number; chars: number } | null;
}

export function computeDocumentStats(body: string): DocumentStats {
  const rawLines = body.split("\n");
  if (rawLines.length === 0) {
    return {
      lines: [],
      totalLines: 0,
      nonEmptyLines: 0,
      totalSyllables: 0,
      totalWords: 0,
      totalChars: 0,
      stanzaCount: 0,
      avgWordsPerNonEmptyLine: 0,
      longestLineByWords: null,
      longestLineByChars: null,
    };
  }

  const lines: LineStatRow[] = [];
  let totalSyllables = 0;
  let totalWords = 0;
  let nonEmpty = 0;
  let longestWords: { lineNumber: number; words: number } | null = null;
  let longestChars: { lineNumber: number; chars: number } | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const text = rawLines[i]!;
    const ws = wordsInLine(text);
    const wn = ws.length;
    const syllables = countSyllablesInLine(text);
    const ch = text.length;
    const isNonEmpty = text.trim().length > 0;
    if (isNonEmpty) nonEmpty++;
    totalSyllables += syllables;
    totalWords += wn;
    if (isNonEmpty) {
      if (!longestWords || wn > longestWords.words) {
        longestWords = { lineNumber: i + 1, words: wn };
      }
      if (!longestChars || ch > longestChars.chars) {
        longestChars = { lineNumber: i + 1, chars: ch };
      }
    }
    lines.push({
      lineNumber: i + 1,
      text,
      syllables,
      words: wn,
      chars: ch,
    });
  }

  let stanzaCount = 0;
  let prevBlank = true;
  for (const text of rawLines) {
    const blank = text.trim().length === 0;
    if (!blank && prevBlank) stanzaCount++;
    prevBlank = blank;
  }

  const avgWordsPerNonEmptyLine =
    nonEmpty > 0 ? Math.round((10 * totalWords) / nonEmpty) / 10 : 0;

  return {
    lines,
    totalLines: rawLines.length,
    nonEmptyLines: nonEmpty,
    totalSyllables,
    totalWords,
    totalChars: body.length,
    stanzaCount,
    avgWordsPerNonEmptyLine,
    longestLineByWords: longestWords,
    longestLineByChars: longestChars,
  };
}
