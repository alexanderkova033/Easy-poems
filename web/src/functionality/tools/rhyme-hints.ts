import { lastWordInLine, normalizeWordToken } from "./tokenize";

export interface RhymeCluster {
  /** Shared tail text (rough visual rhyme hint). */
  ending: string;
  lineNumbers: number[];
}

const VOWEL_RE = /[aeiouy]/i;

/**
 * Last vowel through end of word (e.g. dream → …eam, flight → …ight).
 * Light orthographic hint for slant / eye rhyme — not phonetic.
 */
function vowelTailFromNormalized(normalized: string): string | null {
  if (normalized.length < 2) return null;
  let lastVowel = -1;
  for (let i = normalized.length - 1; i >= 0; i--) {
    if (VOWEL_RE.test(normalized[i]!)) {
      lastVowel = i;
      break;
    }
  }
  if (lastVowel >= 0) {
    const tail = normalized.slice(lastVowel);
    return tail.length >= 2 ? tail : normalized.slice(-2);
  }
  return normalized.slice(-2);
}

/**
 * Groups lines whose last word shares the same “vowel tail” (see
 * {@link vowelTailFromNormalized}). Complements {@link roughRhymeClusters}.
 */
export function lightVowelTailClusters(lines: string[]): RhymeCluster[] {
  const byTail = new Map<string, number[]>();

  for (let i = 0; i < lines.length; i++) {
    const lw = lastWordInLine(lines[i]!);
    if (!lw) continue;
    const n = normalizeWordToken(lw);
    const tail = vowelTailFromNormalized(n);
    if (!tail) continue;
    const prev = byTail.get(tail) ?? [];
    prev.push(i + 1);
    byTail.set(tail, prev);
  }

  const out: RhymeCluster[] = [];
  for (const [ending, lineNumbers] of byTail) {
    if (lineNumbers.length >= 2) {
      out.push({
        ending,
        lineNumbers: [...new Set(lineNumbers)].sort((a, b) => a - b),
      });
    }
  }
  out.sort((a, b) => b.lineNumbers.length - a.lineNumbers.length);
  return out;
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
