import { describe, expect, it } from "vitest";
import {
  iambicFitPercentForPattern,
  meterHintsForBody,
  stressPatternForWord,
} from "./meter-hints";

describe("meter-hints", () => {
  it("marks single-syllable function words weak", () => {
    expect(stressPatternForWord("the")).toBe("x");
  });

  it("marks single-syllable content words stressed", () => {
    expect(stressPatternForWord("cat")).toBe("/");
  });

  it("uses first-syllable stress for polysyllables", () => {
    const p = stressPatternForWord("beautiful");
    expect(p.length).toBeGreaterThan(1);
    expect(p[0]).toBe("/");
  });

  it("computes iambic fit for alternating pattern", () => {
    expect(iambicFitPercentForPattern("x/x/")).toBe(100);
    expect(iambicFitPercentForPattern("/x/x")).toBe(0);
  });

  it("builds per-line hints for body", () => {
    const rows = meterHintsForBody("The cat\n\nruns");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.stressPattern).toContain("x");
    expect(rows[0]!.stressPattern).toContain("/");
  });
});
