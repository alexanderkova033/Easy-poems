/**
 * Cost maths for the API spend caps. The implementation lives in
 * api/_usage-cap.ts (outside the web tsconfig), so the pricing table and
 * formula are mirrored here — if you change one, change both. The point of the
 * test is the arithmetic and the rounding floor, which is where the old
 * whole-cent accounting went wrong.
 */
import { describe, expect, it } from "vitest";

const TENTHS_PER_CENT = 10;
const TENTHS_PER_DOLLAR = 100 * TENTHS_PER_CENT;

const PRICING = {
  "gpt-5-nano": { inCentsPerMTok: 5, cachedInCentsPerMTok: 0.5, outCentsPerMTok: 40 },
  "gpt-5-mini": { inCentsPerMTok: 25, cachedInCentsPerMTok: 2.5, outCentsPerMTok: 200 },
} as const;

function estimateCostTenths(
  model: keyof typeof PRICING,
  usage: { promptTokens: number; completionTokens: number; cachedPromptTokens?: number },
): number {
  const p = PRICING[model];
  const cached = Math.min(Math.max(usage.cachedPromptTokens ?? 0, 0), usage.promptTokens);
  const fresh = usage.promptTokens - cached;
  const cents =
    (fresh * p.inCentsPerMTok) / 1_000_000 +
    (cached * p.cachedInCentsPerMTok) / 1_000_000 +
    (usage.completionTokens * p.outCentsPerMTok) / 1_000_000;
  return Math.max(1, Math.ceil(cents * TENTHS_PER_CENT));
}

const usd = (tenths: number) => tenths / TENTHS_PER_DOLLAR;

describe("estimateCostTenths", () => {
  it("prices a typical analyse at well under a cent", () => {
    // 3.5k in (nothing cached), 350 visible out + 900 reasoning → 0.3375c,
    // rounded up to the next tenth of a cent.
    const tenths = estimateCostTenths("gpt-5-mini", {
      promptTokens: 3_500,
      completionTokens: 1_250,
    });
    expect(tenths).toBe(4);
    // The old floor billed this as a whole cent — ~3x the real cost.
    expect(usd(tenths)).toBeLessThan(0.01);
  });

  it("prices the same call lower once the rubric is cache-warm", () => {
    const cold = estimateCostTenths("gpt-5-mini", {
      promptTokens: 3_500,
      completionTokens: 1_250,
    });
    const warm = estimateCostTenths("gpt-5-mini", {
      promptTokens: 3_500,
      completionTokens: 1_250,
      cachedPromptTokens: 3_000,
    });
    expect(warm).toBeLessThan(cold);
    expect(usd(warm)).toBeCloseTo(0.003, 4);
  });

  it("nets cached prompt tokens off at a tenth of the fresh rate", () => {
    // Large prompts so the 0.1c rounding floor doesn't swallow the difference.
    const fresh = estimateCostTenths("gpt-5-mini", { promptTokens: 1_000_000, completionTokens: 0 });
    const cached = estimateCostTenths("gpt-5-mini", {
      promptTokens: 1_000_000,
      completionTokens: 0,
      cachedPromptTokens: 1_000_000,
    });
    expect(fresh / cached).toBeCloseTo(10, 5);
  });

  it("never counts more cached tokens than were sent", () => {
    const overclaimed = estimateCostTenths("gpt-5-mini", {
      promptTokens: 100,
      completionTokens: 100,
      cachedPromptTokens: 999_999,
    });
    const allCached = estimateCostTenths("gpt-5-mini", {
      promptTokens: 100,
      completionTokens: 100,
      cachedPromptTokens: 100,
    });
    expect(overclaimed).toBe(allCached);
  });

  it("charges a floor of 0.1c rather than a whole cent", () => {
    const tiny = estimateCostTenths("gpt-5-nano", { promptTokens: 10, completionTokens: 5 });
    expect(tiny).toBe(1);
    expect(usd(tiny)).toBeCloseTo(0.001, 4);
  });

  it("bills output 8x input — reasoning tokens are the expensive half", () => {
    const inputHeavy = estimateCostTenths("gpt-5-mini", { promptTokens: 1_000_000, completionTokens: 0 });
    const outputHeavy = estimateCostTenths("gpt-5-mini", { promptTokens: 0, completionTokens: 1_000_000 });
    expect(outputHeavy / inputHeavy).toBeCloseTo(8, 5);
  });

  it("lets a $5 monthly cap buy well over a thousand analyses", () => {
    const perCall = estimateCostTenths("gpt-5-mini", {
      promptTokens: 3_500,
      completionTokens: 1_250,
      cachedPromptTokens: 3_000,
    });
    expect(Math.floor((5 * TENTHS_PER_DOLLAR) / perCall)).toBeGreaterThan(1_000);
  });
});
