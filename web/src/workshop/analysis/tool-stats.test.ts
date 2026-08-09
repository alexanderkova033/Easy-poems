import { describe, expect, it } from "vitest";
import { buildToolStats, type ToolStatsInput } from "./tool-stats";
import { computeDocumentStats } from "./line-stats";
import { meterHintsForBody } from "@/workshop/meter/meter-hints";
import { analyzeRepetition } from "./repeated-words";

function inputFor(body: string, extra: Partial<ToolStatsInput> = {}): ToolStatsInput {
  const lines = body.split("\n");
  return {
    lines,
    docStats: computeDocumentStats(body),
    meterHints: meterHintsForBody(body, null, {}),
    repetition: analyzeRepetition(lines),
    internalRhymes: [],
    spellHits: [],
    stressLexicon: null,
    ...extra,
  };
}

const POEM = [
  "the silver river slips beneath the stone",
  "and something in the water starts to turn",
  "",
  "the silver river slips beneath the stone",
  "and something in the water starts to burn",
].join("\n");

describe("buildToolStats", () => {
  it("returns undefined for an empty draft", () => {
    expect(buildToolStats(inputFor(""))).toBeUndefined();
  });

  it("reports shape from the Lines tool, skipping blank lines", () => {
    const stats = buildToolStats(inputFor(POEM))!;
    expect(stats.shape?.lines).toBe(4);
    expect(stats.shape?.stanzas).toBe(2);
    const [min, max] = stats.shape!.syllableSpread;
    expect(min).toBeGreaterThan(0);
    expect(min).toBeLessThanOrEqual(max);
  });

  it("summarises meter as measured lines plus a median fit", () => {
    const stats = buildToolStats(inputFor(POEM))!;
    expect(stats.meter?.measuredLines).toBe(4);
    expect(stats.meter!.medianIambicFit).toBeGreaterThanOrEqual(0);
    expect(stats.meter!.medianIambicFit).toBeLessThanOrEqual(100);
    expect(stats.meter!.regularLines).toBeLessThanOrEqual(stats.meter!.measuredLines);
  });

  it("counts pauses and picks up the repeated phrase", () => {
    const stats = buildToolStats(inputFor(POEM))!;
    expect((stats.sound?.endStopped ?? 0) + (stats.sound?.enjambed ?? 0)).toBeGreaterThan(0);
    expect(stats.repetition?.phrases.some((p) => p.phrase.includes("silver river"))).toBe(true);
  });

  it("passes spelling through as counts and sample words only", () => {
    const stats = buildToolStats(inputFor(POEM, {
      spellHits: [
        { lineNumber: 1, word: "recieve", normalized: "recieve", suggestions: [], docFrom: 0, docTo: 7 },
        { lineNumber: 2, word: "recieve", normalized: "recieve", suggestions: [], docFrom: 9, docTo: 16 },
      ],
    }))!;
    expect(stats.spelling).toEqual({ flagged: 2, words: ["recieve"] });
  });

  it("keeps vocabulary ratios in range", () => {
    const stats = buildToolStats(inputFor(POEM))!;
    expect(stats.vocab!.uniqueRatio).toBeGreaterThan(0);
    expect(stats.vocab!.uniqueRatio).toBeLessThanOrEqual(1);
    expect(stats.vocab!.lexicalDensity).toBeLessThanOrEqual(1);
  });
});
