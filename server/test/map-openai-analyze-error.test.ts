import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapOpenAiAnalyzeError } from "../poem-analysis/adapters/openai/map-openai-analyze-error.js";

describe("mapOpenAiAnalyzeError", () => {
  it("maps content policy signals to 422", () => {
    const m = mapOpenAiAnalyzeError({
      httpStatus: 400,
      code: "content_policy_violation",
      message: "Rejected",
    });
    assert.equal(m.kind, "content_policy");
    assert.equal(m.clientStatus, 422);
    assert.equal(m.code, "content_policy");
    assert.ok(m.publicMessage.length > 20);
  });

  it("maps 429 to rate limit", () => {
    const m = mapOpenAiAnalyzeError({
      httpStatus: 429,
      message: "Rate limit exceeded",
    });
    assert.equal(m.kind, "rate_limit");
    assert.equal(m.clientStatus, 429);
    assert.equal(m.code, "rate_limit");
  });

  it("passes through generic upstream as 502", () => {
    const m = mapOpenAiAnalyzeError({
      httpStatus: 500,
      message: "Internal server error",
    });
    assert.equal(m.kind, "upstream");
    assert.equal(m.clientStatus, 502);
  });
});
