import "dotenv/config";
import OpenAI from "openai";
import { createApp } from "./app.js";
import { createRequestLogger } from "./lib/logger.js";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const PORT = Number(process.env.PORT ?? 8787);
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 90_000);
const SERVER_REQUEST_TIMEOUT_MS = Number(
  process.env.SERVER_REQUEST_TIMEOUT_MS ?? 120_000
);

const log = createRequestLogger({ service: "easy-poems-api" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout:
    Number.isFinite(OPENAI_TIMEOUT_MS) && OPENAI_TIMEOUT_MS > 0
      ? OPENAI_TIMEOUT_MS
      : 90_000,
});

const app = createApp({ openai, model: MODEL });

const server = app.listen(PORT, () => {
  log.info("listen", { port: PORT, model: MODEL });
});

const reqTimeout =
  Number.isFinite(SERVER_REQUEST_TIMEOUT_MS) && SERVER_REQUEST_TIMEOUT_MS > 0
    ? SERVER_REQUEST_TIMEOUT_MS
    : 120_000;
server.requestTimeout = reqTimeout;
server.headersTimeout = reqTimeout + 5_000;
