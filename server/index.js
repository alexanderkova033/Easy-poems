import "dotenv/config";
import OpenAI from "openai";
import { createApp } from "./app.js";
import { createRequestLogger } from "./lib/logger.js";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const PORT = Number(process.env.PORT ?? 8787);

const log = createRequestLogger({ service: "easy-poems-api" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = createApp({ openai, model: MODEL });

app.listen(PORT, () => {
  log.info("listen", { port: PORT, model: MODEL });
});
