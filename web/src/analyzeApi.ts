import type { AnalyzeSuccessResponse } from "../../server/types/analyze";

export interface AnalyzeErrorBody {
  error: string;
}

export async function analyzePoem(body: {
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
    throw new Error(msg);
  }

  return data as AnalyzeSuccessResponse;
}
