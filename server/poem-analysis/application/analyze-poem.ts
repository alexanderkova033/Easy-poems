import { ANALYZE_SYSTEM_PROMPT } from "./analysis-prompts.js";
import type { AnalyzeSuccessResponse } from "../domain/analysis-types.js";
import { buildPoemPrompt } from "../domain/poem-text.js";
import { normalizeResponse } from "../domain/normalize-analysis-response.js";

export type AnalyzePoemInput = {
  title?: string;
  lines: string[];
};

export type AnalyzePoemFailure =
  | { type: "missing_api_key" }
  | { type: "upstream_empty" }
  | { type: "upstream_bad_json" }
  | { type: "invalid_scores_shape" }
  | { type: "timeout" }
  | { type: "openai_error"; message: string; httpStatus?: number };

export type AnalyzePoemResult =
  | { ok: true; data: AnalyzeSuccessResponse }
  | { ok: false; failure: AnalyzePoemFailure };

export interface AnalyzePoemDeps {
  model: string;
  getApiKey: () => string | undefined;
  completeJson: (input: {
    system: string;
    user: string;
  }) => Promise<string | null>;
}

function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: string; message?: string };
  if (e.name === "AbortError") return true;
  if (e.code === "ETIMEDOUT") return true;
  if (
    typeof e.message === "string" &&
    e.message.toLowerCase().includes("timeout")
  )
    return true;
  return false;
}

export function parseAnalyzePoemBody(
  body: unknown,
  lineCap: number
): { ok: true; input: AnalyzePoemInput } | { ok: false; message: string } {
  const b = body as { title?: unknown; lines?: unknown } | undefined;
  const { title, lines } = b ?? {};
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, message: "Body must include non-empty lines: string[]" };
  }
  if (lines.length > lineCap) {
    return {
      ok: false,
      message: `Too many lines (max ${lineCap}). Split the poem or raise MAX_POEM_LINES.`,
    };
  }
  if (lines.some((l) => typeof l !== "string")) {
    return { ok: false, message: "Every line must be a string" };
  }
  if (title !== undefined && title !== null && typeof title !== "string") {
    return { ok: false, message: "title must be a string if provided" };
  }
  const lineStrings = lines as string[];
  const input: AnalyzePoemInput = {
    lines: lineStrings,
    ...(typeof title === "string" ? { title } : {}),
  };
  return { ok: true, input };
}

export async function analyzePoem(
  deps: AnalyzePoemDeps,
  input: AnalyzePoemInput
): Promise<AnalyzePoemResult> {
  const apiKey = deps.getApiKey();
  if (!apiKey) {
    return { ok: false, failure: { type: "missing_api_key" } };
  }

  const userContent = buildPoemPrompt(input.title ?? "", input.lines);

  try {
    const text = await deps.completeJson({
      system: ANALYZE_SYSTEM_PROMPT,
      user: userContent,
    });
    if (!text) {
      return { ok: false, failure: { type: "upstream_empty" } };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return { ok: false, failure: { type: "upstream_bad_json" } };
    }

    const normalized = normalizeResponse(
      parsed as Record<string, unknown>,
      input.lines.length,
      deps.model
    );
    if (!normalized) {
      return { ok: false, failure: { type: "invalid_scores_shape" } };
    }

    return { ok: true, data: normalized };
  } catch (err: unknown) {
    if (isTimeoutError(err)) {
      return { ok: false, failure: { type: "timeout" } };
    }
    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status?: number }).status
        : undefined;
    const upstream =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
    const httpStatus = status ?? upstream;
    const message =
      httpStatus === 401
        ? "Invalid OpenAI API key"
        : err instanceof Error
          ? err.message
          : "OpenAI request failed";
    return {
      ok: false,
      failure: {
        type: "openai_error",
        message: String(message).slice(0, 200),
        httpStatus,
      },
    };
  }
}
