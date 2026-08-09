/**
 * Readings from the app's own writing tools (Lines, Meter, Echoes, Repeats,
 * Spell, vocabulary), shipped alongside the poem to /api/analyze and
 * /api/compare.
 *
 * Mirrors ToolStats in web/src/workshop/analysis/tool-stats.ts — every field is
 * optional, since a tool with nothing to report sends nothing. These are
 * supporting evidence for the model's read, never the basis of it; the prompts
 * carry that rule.
 */

export interface ToolStats {
  shape?: {
    lines?: number; stanzas?: number; words?: number;
    avgSyllablesPerLine?: number; syllableSpread?: [number, number];
  };
  meter?: { measuredLines?: number; medianIambicFit?: number; regularLines?: number };
  sound?: {
    alliteration?: Array<{ sound: string; words: number }>;
    assonance?: Array<{ sound: string; words: number }>;
    endStopped?: number; enjambed?: number; caesuras?: number; internalRhymeLines?: number;
  };
  repetition?: {
    phrases?: Array<{ phrase: string; count: number }>;
    anaphora?: Array<{ prefix: string; lines: number }>;
    epistrophe?: Array<{ suffix: string; lines: number }>;
  };
  vocab?: { uniqueRatio?: number; lexicalDensity?: number; avgWordLength?: number };
  spelling?: { flagged?: number; words?: string[] };
}

/** One compact line per tool that has something to report. */
export function formatToolStats(t: ToolStats): string[] {
  const out: string[] = [];

  const shape = t.shape;
  if (shape) {
    const parts: string[] = [];
    if (shape.lines) parts.push(`${shape.lines} lines`);
    if (shape.stanzas) parts.push(`${shape.stanzas} stanzas`);
    if (shape.words) parts.push(`${shape.words} words`);
    if (shape.avgSyllablesPerLine) {
      const spread = shape.syllableSpread
        ? ` (range ${shape.syllableSpread[0]}–${shape.syllableSpread[1]})`
        : "";
      parts.push(`avg ${shape.avgSyllablesPerLine} syllables/line${spread}`);
    }
    if (parts.length > 0) out.push(`Lines tool: ${parts.join(", ")}`);
  }

  const meter = t.meter;
  if (meter?.measuredLines) {
    out.push(
      `Meter tool: ${meter.measuredLines} lines measured, median iambic fit ${meter.medianIambicFit ?? 0}%, ${meter.regularLines ?? 0} at 75%+`,
    );
  }

  const sound = t.sound;
  if (sound) {
    const parts: string[] = [];
    if (sound.alliteration?.length) {
      parts.push(`alliteration ${sound.alliteration.map((a) => `${a.sound}×${a.words}`).join(", ")}`);
    }
    if (sound.assonance?.length) {
      parts.push(`assonance ${sound.assonance.map((a) => `"${a.sound}"×${a.words}`).join(", ")}`);
    }
    if (sound.endStopped !== undefined || sound.enjambed !== undefined) {
      parts.push(`${sound.endStopped ?? 0} end-stopped / ${sound.enjambed ?? 0} enjambed`);
    }
    if (sound.caesuras) parts.push(`${sound.caesuras} caesuras`);
    if (sound.internalRhymeLines) parts.push(`internal rhyme on ${sound.internalRhymeLines} lines`);
    if (parts.length > 0) out.push(`Echoes tool: ${parts.join("; ")}`);
  }

  const rep = t.repetition;
  if (rep) {
    const parts: string[] = [];
    if (rep.phrases?.length) {
      parts.push(`phrases ${rep.phrases.map((p) => `"${p.phrase}"×${p.count}`).join(", ")}`);
    }
    if (rep.anaphora?.length) {
      parts.push(`anaphora ${rep.anaphora.map((a) => `"${a.prefix}" opens ${a.lines} lines`).join(", ")}`);
    }
    if (rep.epistrophe?.length) {
      parts.push(`epistrophe ${rep.epistrophe.map((e) => `"${e.suffix}" closes ${e.lines} lines`).join(", ")}`);
    }
    if (parts.length > 0) out.push(`Repeats tool: ${parts.join("; ")}`);
  }

  const v = t.vocab;
  if (v?.uniqueRatio !== undefined) {
    out.push(
      `Vocabulary: ${v.uniqueRatio} unique-word ratio, ${v.lexicalDensity ?? "?"} lexical density, avg word ${v.avgWordLength ?? "?"} chars`,
    );
  }

  if (t.spelling?.flagged) {
    const words = t.spelling.words?.length ? ` (${t.spelling.words.join(", ")})` : "";
    out.push(`Spell tool: ${t.spelling.flagged} flagged${words} — the poet fixes these there; not a scoring input`);
  }

  return out;
}

/** The block appended to the user message, or "" when no tool had anything. */
export function toolStatsBlock(stats: ToolStats | undefined): string {
  const lines = stats ? formatToolStats(stats) : [];
  if (lines.length === 0) return "";
  return `\n\n--- Tool readings (what the app's own tools measured — supporting evidence only; see THE POET'S TOOL READINGS) ---\n${lines.join("\n")}`;
}
