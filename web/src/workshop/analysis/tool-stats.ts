/**
 * Tool stats — a compact snapshot of what the workshop's OWN tools (Lines,
 * Meter, Echoes, Repeats, Spell) measured on the current draft.
 *
 * Sent to /api/analyze and /api/compare as supporting evidence only: the model
 * reads the poem and forms its opinion first, then uses these numbers to
 * confirm or complicate that read — and to point the poet at the one tool worth
 * opening next.
 *
 * Built LAZILY (only when an analysis is actually requested) so the sound pass
 * never runs on the typing path.
 */

import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { LineMeterHint } from "@/workshop/meter/meter-hints";
import type { RepetitionAnalysis } from "@/workshop/analysis/repeated-words";
import type { InternalRhymeMark } from "@/workshop/rhyme/internal-rhymes";
import type { SpellHit } from "@/spellcheck/scan";
import { buildLineSounds, findEchoes, summarisePauses } from "@/workshop/sound/sound-map-analysis";
import { computeVocabStats } from "@/workshop/analysis/vocab-richness";

export interface ToolStats {
  /** Lines tool. */
  shape?: {
    lines: number;
    stanzas: number;
    words: number;
    avgSyllablesPerLine: number;
    /** [shortest, longest] syllable count across non-empty lines. */
    syllableSpread: [number, number];
  };
  /** Meter tool. */
  meter?: {
    measuredLines: number;
    /** Median iambic-fit % across measured lines. */
    medianIambicFit: number;
    /** Lines sitting at 75%+ iambic fit. */
    regularLines: number;
  };
  /** Echoes tool (sound map) + internal rhyme marks. */
  sound?: {
    /** Strongest repeated initial sounds: {sound, words}. */
    alliteration: Array<{ sound: string; words: number }>;
    /** Strongest clustered vowels: {sound, words}. */
    assonance: Array<{ sound: string; words: number }>;
    endStopped: number;
    enjambed: number;
    caesuras: number;
    internalRhymeLines: number;
  };
  /** Repeats tool — phrase/edge repetition (single words already travel in repeatedWords). */
  repetition?: {
    phrases: Array<{ phrase: string; count: number }>;
    anaphora: Array<{ prefix: string; lines: number }>;
    epistrophe: Array<{ suffix: string; lines: number }>;
  };
  /** Vocabulary richness. */
  vocab?: {
    /** Unique/total word ratio (0-1). */
    uniqueRatio: number;
    /** Share of non-stopword content words (0-1). */
    lexicalDensity: number;
    avgWordLength: number;
  };
  /** Spell tool. */
  spelling?: { flagged: number; words: string[] };
}

export interface ToolStatsInput {
  lines: string[];
  docStats: DocumentStats;
  meterHints: LineMeterHint[];
  repetition: RepetitionAnalysis;
  internalRhymes: InternalRhymeMark[];
  spellHits: SpellHit[];
  stressLexicon: ReadonlyMap<string, string> | null;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build the tool snapshot. Every section is omitted when the tool has nothing
 * to say, so a short free-verse draft sends only a couple of lines of context.
 */
export function buildToolStats(input: ToolStatsInput): ToolStats | undefined {
  const { lines, docStats, meterHints, repetition, internalRhymes, spellHits, stressLexicon } = input;
  const stats: ToolStats = {};

  const nonEmpty = docStats.lines.filter((l) => l.text.trim().length > 0);
  if (nonEmpty.length > 0) {
    const syllables = nonEmpty.map((l) => l.syllables);
    stats.shape = {
      lines: docStats.nonEmptyLines,
      stanzas: docStats.stanzaCount,
      words: docStats.totalWords,
      avgSyllablesPerLine: round2(syllables.reduce((s, n) => s + n, 0) / syllables.length),
      syllableSpread: [Math.min(...syllables), Math.max(...syllables)],
    };
  }

  const fits = meterHints
    .map((h) => h.iambicFitPercent)
    .filter((v): v is number => v !== null);
  if (fits.length > 0) {
    stats.meter = {
      measuredLines: fits.length,
      medianIambicFit: median(fits),
      regularLines: fits.filter((v) => v >= 75).length,
    };
  }

  // Echoes: recomputed here rather than read off the model, because the sound
  // pass only runs when the Echoes panel is open.
  const lineSounds = buildLineSounds(lines, stressLexicon);
  const echoes = findEchoes(lineSounds);
  const pauses = summarisePauses(lineSounds);
  const allit = echoes
    .filter((e) => e.className === "alliteration")
    .slice(0, 3)
    .map((e) => ({ sound: e.key, words: e.members.length }));
  const asson = echoes
    .filter((e) => e.className === "assonance")
    .slice(0, 3)
    .map((e) => ({ sound: e.key, words: e.members.length }));
  if (allit.length > 0 || asson.length > 0 || pauses.total > 0) {
    stats.sound = {
      alliteration: allit,
      assonance: asson,
      endStopped: pauses.endStopped,
      enjambed: pauses.enjambed,
      caesuras: pauses.caesuras,
      internalRhymeLines: internalRhymes.length,
    };
  }

  const phrases = repetition.phrases.slice(0, 3).map((p) => ({ phrase: p.display, count: p.count }));
  const anaphora = repetition.anaphora.slice(0, 2).map((a) => ({ prefix: a.display, lines: a.lines.length }));
  const epistrophe = repetition.epistrophe.slice(0, 2).map((e) => ({ suffix: e.display, lines: e.lines.length }));
  if (phrases.length > 0 || anaphora.length > 0 || epistrophe.length > 0) {
    stats.repetition = { phrases, anaphora, epistrophe };
  }

  const vocab = computeVocabStats(lines);
  if (vocab) {
    stats.vocab = {
      uniqueRatio: vocab.ttr,
      lexicalDensity: vocab.lexicalDensity,
      avgWordLength: vocab.avgWordLength,
    };
  }

  if (spellHits.length > 0) {
    stats.spelling = {
      flagged: spellHits.length,
      words: [...new Set(spellHits.map((h) => h.word))].slice(0, 5),
    };
  }

  return Object.keys(stats).length > 0 ? stats : undefined;
}
