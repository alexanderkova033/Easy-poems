import { lastWordInLine, normalizeWordToken } from "./tokenize";

export interface RhymeCluster {
  /** Last 3+ letters shared (rough visual rhyme hint). */
  ending: string;
  lineNumbers: number[];
}

/**
 * Very rough “end-rhyme” hint: groups lines whose last word shares the same
 * trailing letters (≥2). Not phonetic — labeled as approximate in UI.
 */
export function roughRhymeClusters(lines: string[]): RhymeCluster[] {
  const byEnd = new Map<string, number[]>();

  for (let i = 0; i < lines.length; i++) {
    const lw = lastWordInLine(lines[i]!);
    if (!lw) continue;
    const n = normalizeWordToken(lw);
    if (n.length < 2) continue;
    const ending = n.slice(-Math.min(4, n.length));
    const prev = byEnd.get(ending) ?? [];
    prev.push(i + 1);
    byEnd.set(ending, prev);
  }

  const out: RhymeCluster[] = [];
  for (const [ending, lineNumbers] of byEnd) {
    if (lineNumbers.length >= 2) {
      out.push({ ending, lineNumbers: [...new Set(lineNumbers)].sort((a, b) => a - b) });
    }
  }
  out.sort((a, b) => b.lineNumbers.length - a.lineNumbers.length);
  return out;
}
