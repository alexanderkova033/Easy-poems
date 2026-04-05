import { normalizeWordToken, wordsInLine } from "./tokenize";

const STOP = new Set(
  [
    "the",
    "and",
    "a",
    "an",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "as",
    "at",
    "by",
    "from",
    "or",
    "but",
    "so",
    "if",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "it",
    "its",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "our",
    "their",
    "not",
    "no",
    "yes",
    "all",
    "can",
    "will",
    "would",
    "could",
    "should",
    "than",
    "then",
    "there",
    "here",
    "when",
    "where",
    "what",
    "who",
    "which",
  ].map((s) => s.toLowerCase()),
);

export interface RepeatedWord {
  word: string;
  count: number;
  lines: number[];
}

export function findRepeatedWords(lines: string[], minLen = 4): RepeatedWord[] {
  const map = new Map<string, { count: number; lines: Set<number> }>();

  for (let i = 0; i < lines.length; i++) {
    for (const raw of wordsInLine(lines[i]!)) {
      const w = normalizeWordToken(raw);
      if (w.length < minLen) continue;
      if (STOP.has(w)) continue;
      const cur = map.get(w) ?? { count: 0, lines: new Set<number>() };
      cur.count += 1;
      cur.lines.add(i + 1);
      map.set(w, cur);
    }
  }

  const out: RepeatedWord[] = [];
  for (const [word, { count, lines: ls }] of map) {
    if (count >= 2) {
      out.push({
        word,
        count,
        lines: [...ls].sort((a, b) => a - b),
      });
    }
  }
  out.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  return out.slice(0, 40);
}
