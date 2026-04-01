import cors from "cors";
import express from "express";
import type OpenAI from "openai";
import {
  analyzePoem,
  parseAnalyzePoemBody,
} from "../poem-analysis/application/analyze-poem.js";
import { createOpenAiJsonCompletion } from "../poem-analysis/adapters/openai/openai-json-completion.js";
import { mapOpenAiAnalyzeError } from "../poem-analysis/adapters/openai/map-openai-analyze-error.js";
import { createRequestLogger, newRequestId } from "../infrastructure/logging/request-logger.js";
import { readOpenAiApiKey } from "../infrastructure/openai-api-key.js";
import { createAnalyzeEndpointRateLimiter } from "../infrastructure/rate-limit/analyze-endpoint-rate-limit.js";

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

export function createApp({
  openai,
  model,
  getApiKey = () => readOpenAiApiKey(),
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
      createAnalyzeEndpointRateLimiter({
        windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000,
        max: rateMax,
      })
    );
  }

  const completeJson = createOpenAiJsonCompletion(openai, model);
  const lineCap = maxPoemLines();

  app.get("/health", (req, res) => {
    const t0 = performance.now();
    res.json({ ok: true, model });
    const durationMs = Math.round(performance.now() - t0);
    req.log.info("health", { path: "/health", status: 200, durationMs });
  });

  app.post("/api/analyze", async (req, res) => {
    const t0 = performance.now();
    const parsed = parseAnalyzePoemBody(req.body, lineCap);
    if (!parsed.ok) {
      req.log.warn("analyze.bad_request", { reason: "validation", message: parsed.message });
      res.status(400).json({ error: parsed.message });
      return;
    }

    const result = await analyzePoem(
      { model, getApiKey, completeJson },
      parsed.input
    );

    if (!result.ok) {
      const f = result.failure;
      switch (f.type) {
        case "missing_api_key":
          req.log.error("analyze.misconfigured", { reason: "missing_api_key" });
          res.status(500).json({
            error: "Server misconfiguration: OPENAI_API_KEY missing",
          });
          return;
        case "upstream_empty":
          req.log.error("analyze.upstream", { reason: "empty_model_content" });
          res.status(502).json({ error: "Empty response from model" });
          return;
        case "upstream_bad_json":
          req.log.error("analyze.parse", { reason: "model_non_json" });
          res.status(502).json({ error: "Model returned non-JSON" });
          return;
        case "invalid_scores_shape":
          req.log.error("analyze.normalize", { reason: "invalid_scores_shape" });
          res.status(502).json({
            error: "Model JSON did not match expected scores shape",
          });
          return;
        case "timeout": {
          const durationMs = Math.round(performance.now() - t0);
          req.log.error("analyze.timeout", { durationMs });
          res.status(504).json({
            error: "Analysis timed out; try again with a shorter poem.",
          });
          return;
        }
        case "openai_error": {
          const durationMs = Math.round(performance.now() - t0);
          const mapped = mapOpenAiAnalyzeError({
            httpStatus: f.httpStatus,
            code: f.code,
            message: f.message,
          });
          req.log.error("analyze.openai_error", {
            upstreamStatus: f.httpStatus ?? null,
            durationMs,
            message: f.message,
            mappedKind: mapped.kind,
            clientStatus: mapped.clientStatus,
          });
          const errBody: { error: string; code?: string } = {
            error: mapped.publicMessage,
          };
          if ("code" in mapped && mapped.code) errBody.code = mapped.code;
          res.status(mapped.clientStatus).json(errBody);
          return;
        }
        default: {
          const _exhaustive: never = f;
          return _exhaustive;
        }
      }
      return;
    }

    const durationMs = Math.round(performance.now() - t0);
    req.log.info("analyze.done", {
      lineCount: parsed.input.lines.length,
      issueCount: result.data.issues.length,
      status: 200,
      durationMs,
    });
    res.json(result.data);
  });

  return app;
}
