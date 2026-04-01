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
    };
  }

  const lines: LineStatRow[] = [];
  let totalSyllables = 0;
  let totalWords = 0;
  let nonEmpty = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const text = rawLines[i]!;
    const ws = wordsInLine(text);
    const wn = ws.length;
    const syllables = countSyllablesInLine(text);
    if (text.trim().length > 0) nonEmpty++;
    totalSyllables += syllables;
    totalWords += wn;
    lines.push({
      lineNumber: i + 1,
      text,
      syllables,
      words: wn,
      chars: text.length,
    });
  }

  return {
    lines,
    totalLines: rawLines.length,
    nonEmptyLines: nonEmpty,
    totalSyllables,
    totalWords,
    totalChars: body.length,
  };
}
