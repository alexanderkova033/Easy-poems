/**
 * Shared helpers for Vercel serverless functions that call the OpenAI API.
 */

import type { VercelResponse } from "@vercel/node";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAICallResult {
  ok: true;
  content: string;
  model: string;
}

/**
 * Calls the OpenAI chat completions endpoint and extracts the first message
 * content. Returns a typed result or sends an error response and returns null.
 */
export async function callOpenAI(
  apiKey: string,
  opts: {
    model: string;
    messages: OpenAIMessage[];
    max_tokens: number;
    temperature: number;
  },
  res: VercelResponse,
): Promise<OpenAICallResult | null> {
  let upstream: Response;
  try {
    upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        response_format: { type: "json_object" },
        messages: opts.messages,
        max_tokens: opts.max_tokens,
        temperature: opts.temperature,
      }),
    });
  } catch (err) {
    res.status(502).json({ error: `Could not reach OpenAI: ${(err as Error).message}` });
    return null;
  }

  if (!upstream.ok) {
    let msg = `OpenAI returned HTTP ${upstream.status}`;
    try {
      const errBody = (await upstream.json()) as { error?: { message?: string } };
      if (errBody?.error?.message) msg = errBody.error.message;
    } catch {
      /* ignore */
    }
    const status = upstream.status === 429 ? 429 : 502;
    res.status(status).json({ error: msg });
    return null;
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) {
    res.status(502).json({ error: "Empty response from OpenAI." });
    return null;
  }

  return { ok: true, content, model: data.model ?? opts.model };
}

/**
 * Parses JSON from an OpenAI response string, injects server-side meta,
 * and sends the result. Returns false if parsing fails.
 */
export function sendParsedResponse(
  res: VercelResponse,
  rawContent: string,
  resolvedModel: string,
): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    res.status(502).json({ error: "OpenAI returned invalid JSON." });
    return false;
  }

  (parsed as Record<string, unknown>).meta = {
    model: resolvedModel,
    analyzedAt: new Date().toISOString(),
  };

  res.status(200).json(parsed);
  return true;
}
