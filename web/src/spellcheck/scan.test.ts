import { describe, expect, it } from "vitest";
import { scanLinesForSpelling } from "./scan";

describe("scanLinesForSpelling", () => {
  it("flags unknown words in strict mode", () => {
    const dict = new Set(["hello", "world"]);
    const hits = scanLinesForSpelling(
      ["Hello zzzunknown"],
      dict,
      new Set(),
      new Set(),
      "strict",
    );
    expect(hits.some((h) => h.normalized.includes("zzzunknown"))).toBe(true);
  });

  it("respects personal dictionary", () => {
    const dict = new Set(["hello"]);
    const hits = scanLinesForSpelling(
      ["Hello coinage"],
      dict,
      new Set(["coinage"]),
      new Set(),
      "strict",
    );
    expect(hits).toHaveLength(0);
  });
});
