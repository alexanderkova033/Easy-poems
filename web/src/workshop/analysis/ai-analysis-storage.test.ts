import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadRejectedIssues, recordRejectedIssue } from "./ai-analysis-storage";

const POEM = "poem-1";

describe("rejected issue memory", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (k in store ? store[k]! : null),
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      get length() { return Object.keys(store).length; },
      key: (i: number) => Object.keys(store)[i] ?? null,
    } as Storage);
  });

  it("starts empty and keeps most recent first", () => {
    expect(loadRejectedIssues(POEM)).toEqual([]);
    recordRejectedIssue(POEM, "L2: weak opening");
    recordRejectedIssue(POEM, "L7: cliché");
    expect(loadRejectedIssues(POEM)).toEqual(["L7: cliché", "L2: weak opening"]);
  });

  it("counts the same call once, no matter how often it is re-raised", () => {
    recordRejectedIssue(POEM, "L2: weak opening");
    recordRejectedIssue(POEM, "L7: cliché");
    recordRejectedIssue(POEM, "L2: weak opening");
    expect(loadRejectedIssues(POEM)).toEqual(["L2: weak opening", "L7: cliché"]);
  });

  it("caps the list at 10, dropping the oldest", () => {
    for (let i = 1; i <= 13; i++) recordRejectedIssue(POEM, `L${i}: call ${i}`);
    const out = loadRejectedIssues(POEM);
    expect(out).toHaveLength(10);
    expect(out[0]).toBe("L13: call 13");
    expect(out).not.toContain("L1: call 1");
  });

  it("ignores blank text and a missing poem id", () => {
    recordRejectedIssue(POEM, "   ");
    recordRejectedIssue(undefined, "L1: nowhere to put this");
    expect(loadRejectedIssues(POEM)).toEqual([]);
    expect(loadRejectedIssues(undefined)).toEqual([]);
  });

  it("keeps rejections per poem", () => {
    recordRejectedIssue(POEM, "L2: weak opening");
    recordRejectedIssue("poem-2", "L4: flat ending");
    expect(loadRejectedIssues(POEM)).toEqual(["L2: weak opening"]);
    expect(loadRejectedIssues("poem-2")).toEqual(["L4: flat ending"]);
  });
});
