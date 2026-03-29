import cors from "cors";
import express from "express";
import type OpenAI from "openai";
import { normalizeResponse } from "./lib/analyze.js";
import { createRequestLogger, newRequestId } from "./lib/logger.js";
import { ANALYZE_SYSTEM_PROMPT, buildPoemPrompt } from "./lib/prompts.js";
import { createAnalyzeRateLimiter } from "./lib/rateLimit.js";

const MAX_BODY = "256kb";

export interface CreateAppOptions {
  openai: OpenAI;
  model: string;
  getApiKey?: () => string | undefined;
}

function maxPoemLines(): number {
  const n = Number(process.env.MAX_POEM_LINES ?? 500);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 10_000) : 500;
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

export function createApp({
  openai,
  model,
  getApiKey = () => process.env.OPENAI_API_KEY,
}: CreateAppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: MAX_BODY }));
  app.use(
    cors(
      process.env.CORS_ORIGIN
        ? {
            origin: process.env.CORS_ORIGIN,
            methods: ["POST", "GET"],
          }
        : { origin: true }
    )
  );

  app.use((req, res, next) => {
    const requestId = newRequestId(req.get("x-request-id"));
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    req.log = createRequestLogger({ requestId });
    next();
  });

  const rateMax = Number(process.env.RATE_LIMIT_MAX ?? 0);
  if (Number.isFinite(rateMax) && rateMax > 0) {
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
    app.use(
      createAnalyzeRateLimiter({
        windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000,
        max: rateMax,
      })
    );
  }

  app.get("/health", (req, res) => {
    const t0 = performance.now();
    res.json({ ok: true, model });
    const durationMs = Math.round(performance.now() - t0);
    req.log.info("health", { path: "/health", status: 200, durationMs });
  });

  const lineCap = maxPoemLines();

  app.post("/api/analyze", async (req, res) => {
    const t0 = performance.now();
    const apiKey = getApiKey();
    if (!apiKey) {
      req.log.error("analyze.misconfigured", { reason: "missing_api_key" });
      res.status(500).json({
        error: "Server misconfiguration: OPENAI_API_KEY missing",
      });
      return;
    }

    const body = req.body as { title?: unknown; lines?: unknown } | undefined;
    const { title, lines } = body ?? {};
    if (!Array.isArray(lines) || lines.length === 0) {
      req.log.warn("analyze.bad_request", { reason: "lines" });
      res.status(400).json({ error: "Body must include non-empty lines: string[]" });
      return;
    }
    if (lines.length > lineCap) {
      req.log.warn("analyze.bad_request", { reason: "too_many_lines", lineCap });
      res.status(400).json({
        error: `Too many lines (max ${lineCap}). Split the poem or raise MAX_POEM_LINES.`,
      });
      return;
    }
    if (lines.some((l) => typeof l !== "string")) {
      req.log.warn("analyze.bad_request", { reason: "line_types" });
      res.status(400).json({ error: "Every line must be a string" });
      return;
    }
    if (title !== undefined && title !== null && typeof title !== "string") {
      req.log.warn("analyze.bad_request", { reason: "title_type" });
      res.status(400).json({ error: "title must be a string if provided" });
      return;
    }

    const lineStrings = lines as string[];
    const userContent = buildPoemPrompt(
      typeof title === "string" ? title : "",
      lineStrings
    );

    try {
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ANALYZE_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      });

      const text = completion.choices[0]?.message?.content;
      if (!text) {
        req.log.error("analyze.upstream", { reason: "empty_model_content" });
        res.status(502).json({ error: "Empty response from model" });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        req.log.error("analyze.parse", { reason: "model_non_json" });
        res.status(502).json({ error: "Model returned non-JSON" });
        return;
      }

      const normalized = normalizeResponse(
        parsed as Record<string, unknown>,
        lineStrings.length,
        model
      );
      if (!normalized) {
        req.log.error("analyze.normalize", { reason: "invalid_scores_shape" });
        res.status(502).json({
          error: "Model JSON did not match expected scores shape",
        });
        return;
      }

      const durationMs = Math.round(performance.now() - t0);
      req.log.info("analyze.done", {
        lineCount: lineStrings.length,
        issueCount: normalized.issues.length,
        status: 200,
        durationMs,
      });
      res.json(normalized);
    } catch (err: unknown) {
      if (isTimeoutError(err)) {
        const durationMs = Math.round(performance.now() - t0);
        req.log.error("analyze.timeout", { durationMs });
        res.status(504).json({ error: "Analysis timed out; try again with a shorter poem." });
        return;
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
      const durationMs = Math.round(performance.now() - t0);
      req.log.error("analyze.openai_error", {
        upstreamStatus: httpStatus ?? null,
        durationMs,
        message: String(message).slice(0, 200),
      });
      res.status(502).json({ error: String(message).slice(0, 200) });
    }
  });

  return app;
}
