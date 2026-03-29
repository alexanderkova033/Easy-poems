import cors from "cors";
import express from "express";
import { normalizeResponse } from "./lib/analyze.js";
import { createRequestLogger, newRequestId } from "./lib/logger.js";
import { ANALYZE_SYSTEM_PROMPT, buildPoemPrompt } from "./lib/prompts.js";

const MAX_BODY = "256kb";

/**
 * @typedef {object} CreateAppOptions
 * @property {import("openai").default} openai
 * @property {string} model
 * @property {() => string | undefined} [getApiKey] defaults to `process.env.OPENAI_API_KEY`
 */

/**
 * @param {CreateAppOptions} options
 */
export function createApp({ openai, model, getApiKey = () => process.env.OPENAI_API_KEY }) {
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

  app.get("/health", (req, res) => {
    const t0 = performance.now();
    res.json({ ok: true, model });
    const durationMs = Math.round(performance.now() - t0);
    req.log.info("health", { path: "/health", status: 200, durationMs });
  });

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

    const { title, lines } = req.body ?? {};
    if (!Array.isArray(lines) || lines.length === 0) {
      req.log.warn("analyze.bad_request", { reason: "lines" });
      res.status(400).json({ error: "Body must include non-empty lines: string[]" });
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

    const userContent = buildPoemPrompt(
      typeof title === "string" ? title : "",
      lines
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

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        req.log.error("analyze.parse", { reason: "model_non_json" });
        res.status(502).json({ error: "Model returned non-JSON" });
        return;
      }

      const normalized = normalizeResponse(parsed, lines.length, model);
      if (!normalized) {
        req.log.error("analyze.normalize", { reason: "invalid_scores_shape" });
        res.status(502).json({
          error: "Model JSON did not match expected scores shape",
        });
        return;
      }

      const durationMs = Math.round(performance.now() - t0);
      req.log.info("analyze.done", {
        lineCount: lines.length,
        issueCount: normalized.issues.length,
        status: 200,
        durationMs,
      });
      res.json(normalized);
    } catch (err) {
      const status = err?.status ?? err?.response?.status;
      const message =
        status === 401
          ? "Invalid OpenAI API key"
          : err?.message ?? "OpenAI request failed";
      const durationMs = Math.round(performance.now() - t0);
      req.log.error("analyze.openai_error", {
        upstreamStatus: status ?? null,
        durationMs,
        message: String(message).slice(0, 200),
      });
      res.status(502).json({ error: String(message).slice(0, 200) });
    }
  });

  return app;
}
