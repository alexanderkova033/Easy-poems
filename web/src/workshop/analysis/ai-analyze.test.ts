import { describe, expect, it } from "vitest";
import { parseAnalysis } from "./ai-analyze";

const BASE = {
  overall_score: 70,
  pillar_scores: { chord: 18, craft: 18, spark: 17, echo: 17 },
  strongest_line: { line: 4, excerpt: "the light goes out", why: "it lands without explaining" },
};

describe("parseAnalysis — strongest line vs issues", () => {
  it("keeps the strongest line when no issue touches it", () => {
    const res = parseAnalysis({
      ...BASE,
      issues: [{ id: "a", severity: "medium", line_start: 1, line_end: 2, rationale: "x" }],
    });
    expect(res.strongest_line?.line).toBe(4);
  });

  it("drops the strongest line when an issue flags that exact line", () => {
    const res = parseAnalysis({
      ...BASE,
      issues: [{ id: "a", severity: "high", line_start: 4, line_end: 4, rationale: "x" }],
    });
    expect(res.strongest_line).toBeUndefined();
    expect(res.issues).toHaveLength(1);
  });

  it("drops it when the line sits inside a multi-line issue range", () => {
    const res = parseAnalysis({
      ...BASE,
      issues: [{ id: "a", severity: "low", line_start: 3, line_end: 6, rationale: "x" }],
    });
    expect(res.strongest_line).toBeUndefined();
  });

  it("handles a reversed issue range", () => {
    const res = parseAnalysis({
      ...BASE,
      issues: [{ id: "a", severity: "low", line_start: 6, line_end: 3, rationale: "x" }],
    });
    expect(res.strongest_line).toBeUndefined();
  });

  it("only checks issues that survived the cap", () => {
    // Four low-severity issues: the cap keeps three, and the one covering line 4
    // is the last in order, so it is dropped — the crown survives with it.
    const res = parseAnalysis({
      ...BASE,
      issues: [
        { id: "a", severity: "low", line_start: 1, line_end: 1, rationale: "x" },
        { id: "b", severity: "low", line_start: 2, line_end: 2, rationale: "x" },
        { id: "c", severity: "low", line_start: 3, line_end: 3, rationale: "x" },
        { id: "d", severity: "low", line_start: 4, line_end: 4, rationale: "x" },
      ],
    });
    expect(res.issues.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(res.strongest_line?.line).toBe(4);
  });
});
