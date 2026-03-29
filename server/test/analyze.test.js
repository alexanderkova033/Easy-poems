import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeResponse } from "../lib/analyze.js";

describe("normalizeResponse", () => {
  it("accepts a well-formed model payload", () => {
    const raw = {
      overall_score: 72,
      dimensions: {
        imagery: 70,
        musicality: 75,
        originality: 68,
        clarity: 74,
      },
      issues: [
        {
          id: "issue-1",
          line_start: 1,
          line_end: 1,
          rationale: "Opening feels generic.",
          improvements: ["Try a concrete image", "Cut one abstract noun"],
        },
      ],
    };
    const out = normalizeResponse(raw, 3, "gpt-4o-mini");
    assert.ok(out);
    assert.equal(out.overall_score, 72);
    assert.equal(out.dimensions.clarity, 74);
    assert.equal(out.issues.length, 1);
    assert.equal(out.issues[0].line_start, 1);
    assert.equal(out.issues[0].improvements.length, 2);
    assert.equal(out.meta.model, "gpt-4o-mini");
    assert.ok(typeof out.meta.analyzedAt === "string");
  });

  it("returns null when a dimension is missing", () => {
    const raw = {
      overall_score: 50,
      dimensions: { imagery: 50, musicality: 50, originality: 50 },
      issues: [],
    };
    assert.equal(normalizeResponse(raw, 1, "m"), null);
  });

  it("clamps scores and line ranges", () => {
    const raw = {
      overall_score: 999,
      dimensions: {
        imagery: -5,
        musicality: 50.6,
        originality: 50,
        clarity: 50,
      },
      issues: [
        {
          line_start: 0,
          line_end: 99,
          rationale: "x",
          improvements: ["a"],
        },
        {
          line_start: 2,
          line_end: 1,
          rationale: "y",
          improvements: ["b"],
        },
      ],
    };
    const out = normalizeResponse(raw, 2, "m");
    assert.ok(out);
    assert.equal(out.overall_score, 100);
    assert.equal(out.dimensions.imagery, 1);
    assert.equal(out.dimensions.musicality, 51);
    assert.equal(out.issues.length, 1);
    assert.equal(out.issues[0].line_start, 1);
    assert.equal(out.issues[0].line_end, 2);
  });

  it("drops issues without rationale or improvements", () => {
    const raw = {
      overall_score: 10,
      dimensions: {
        imagery: 10,
        musicality: 10,
        originality: 10,
        clarity: 10,
      },
      issues: [
        { line_start: 1, line_end: 1, rationale: "", improvements: ["a"] },
        {
          line_start: 1,
          line_end: 1,
          rationale: "ok",
          improvements: [],
        },
        {
          line_start: 1,
          line_end: 1,
          rationale: "ok",
          improvements: ["keep"],
        },
      ],
    };
    const out = normalizeResponse(raw, 1, "m");
    assert.ok(out);
    assert.equal(out.issues.length, 1);
    assert.equal(out.issues[0].improvements[0], "keep");
  });

  it("caps issues at 8", () => {
    const issues = Array.from({ length: 12 }, (_, i) => ({
      line_start: 1,
      line_end: 1,
      rationale: `r${i}`,
      improvements: ["a"],
    }));
    const raw = {
      overall_score: 50,
      dimensions: {
        imagery: 50,
        musicality: 50,
        originality: 50,
        clarity: 50,
      },
      issues,
    };
    const out = normalizeResponse(raw, 1, "m");
    assert.ok(out);
    assert.equal(out.issues.length, 8);
  });
});
