import { lastWordInLine, normalizeWordToken } from "./tokenize";

/**
 * Assigns end-rhyme scheme labels (A, B, C…) to each line.
 * Lines with no last word or blank lines get an empty string.
 * Two lines "rhyme" if their last word shares the same 3-letter suffix
 * (same heuristic as roughRhymeClusters).
 */
export function detectRhymeScheme(lines: string[]): string[] {
  const labels: string[] = new Array(lines.length).fill("");
  const endingToLabel = new Map<string, string>();
  let nextCode = 0;

  const letterFor = (n: number): string => {
    // A–Z then AA, AB… (sufficient for any real poem)
    const base = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (n < 26) return base[n]!;
    return base[Math.floor(n / 26) - 1]! + base[n % 26]!;
  };

  for (let i = 0; i < lines.length; i++) {
    const lw = lastWordInLine(lines[i]!);
    if (!lw) continue;
    const norm = normalizeWordToken(lw);
    if (norm.length < 2) continue;
    const ending = norm.slice(-Math.min(3, norm.length));
    if (!endingToLabel.has(ending)) {
      endingToLabel.set(ending, letterFor(nextCode++));
    }
    labels[i] = endingToLabel.get(ending)!;
  }

  return labels;
}
