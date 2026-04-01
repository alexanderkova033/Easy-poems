/**
 * Maps OpenAI / transport errors to stable API responses (FR-42 safe messaging).
 */
export type MappedAnalyzeError =
  | {
      kind: "content_policy";
      clientStatus: 422;
      publicMessage: string;
      code: "content_policy";
    }
  | {
      kind: "rate_limit";
      clientStatus: 429;
      publicMessage: string;
      code: "rate_limit";
    }
  | {
      kind: "upstream";
      clientStatus: 502;
      publicMessage: string;
      code?: string;
    };

const CONTENT_POLICY_HINT =
  "The model declined to analyze this text (content safety policy). " +
  "Try editing the passage, shortening it, or trying again later.";

const RATE_LIMIT_HINT =
  "The analysis service is busy or rate-limited. Wait a moment and try again.";

function looksLikeContentPolicy(
  status: number | undefined,
  code: string | undefined,
  message: string,
): boolean {
  const m = message.toLowerCase();
  const c = (code ?? "").toLowerCase();
  if (
    c.includes("content_policy") ||
    c === "content_filter" ||
    m.includes("content_policy") ||
    m.includes("content policy") ||
    m.includes("safety system") ||
    (m.includes("violat") && m.includes("policy"))
  ) {
    return true;
  }
  if (status === 400 && (m.includes("rejected") || m.includes("moderation")))
    return true;
  return false;
}

function looksLikeRateLimit(
  status: number | undefined,
  code: string | undefined,
  message: string,
): boolean {
  if (status === 429) return true;
  const c = (code ?? "").toLowerCase();
  const m = message.toLowerCase();
  return c === "rate_limit_exceeded" || m.includes("rate limit");
}

export function mapOpenAiAnalyzeError(input: {
  httpStatus?: number;
  code?: string;
  message: string;
}): MappedAnalyzeError {
  const { httpStatus, code, message } = input;
  const trimmed = message.trim() || "OpenAI request failed";

  if (looksLikeContentPolicy(httpStatus, code, trimmed)) {
    return {
      kind: "content_policy",
      clientStatus: 422,
      publicMessage: CONTENT_POLICY_HINT,
      code: "content_policy",
    };
  }
  if (looksLikeRateLimit(httpStatus, code, trimmed)) {
    return {
      kind: "rate_limit",
      clientStatus: 429,
      publicMessage: RATE_LIMIT_HINT,
      code: "rate_limit",
    };
  }

  if (httpStatus === 401) {
    return {
      kind: "upstream",
      clientStatus: 502,
      publicMessage: "Invalid or missing OpenAI API key on the server.",
    };
  }

  return {
    kind: "upstream",
    clientStatus: 502,
    publicMessage: trimmed.slice(0, 280),
  };
}
