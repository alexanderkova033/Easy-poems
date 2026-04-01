import type { AnalyzeSuccessResponse } from "@poem-analysis/domain/analysis-types";

export interface AnalyzeErrorBody {
  error: string;
  code?: string;
}

export class AnalyzeRequestError extends Error {
  readonly code?: string;
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number, code?: string) {
    super(message);
    this.name = "AnalyzeRequestError";
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

export async function analyzePoemViaHttp(body: {
  title?: string;
  lines: string[];
}): Promise<AnalyzeSuccessResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as AnalyzeSuccessResponse | AnalyzeErrorBody;

  if (!res.ok) {
    const msg =
      "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    const code =
      "code" in data && typeof data.code === "string" ? data.code : undefined;
    throw new AnalyzeRequestError(msg, res.status, code);
  }

  return data as AnalyzeSuccessResponse;
}
