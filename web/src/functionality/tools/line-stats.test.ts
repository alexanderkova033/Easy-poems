import { describe, expect, it } from "vitest";
import { computeDocumentStats } from "./line-stats";

describe("computeDocumentStats", () => {
  it("counts stanzas separated by blank lines", () => {
    const s = computeDocumentStats("a\nb\n\nc\n\n\nd");
    expect(s.stanzaCount).toBe(3);
  });

  it("computes avg words per non-empty line and longest line", () => {
    const s = computeDocumentStats("one two\nthree four five\n");
    expect(s.avgWordsPerNonEmptyLine).toBe(2.5);
    expect(s.longestLineByWords).toEqual({ lineNumber: 2, words: 3 });
  });
});
