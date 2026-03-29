import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../http/create-app.js";
import type OpenAI from "openai";

function mockOpenAI(contentJson: object): OpenAI {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: JSON.stringify(contentJson) } }],
        }),
      },
    },
  } as unknown as OpenAI;
}

describe("HTTP API", () => {
  const prevKey = process.env.OPENAI_API_KEY;
  const prevCors = process.env.CORS_ORIGIN;
  const prevRate = process.env.RATE_LIMIT_MAX;
  const prevLines = process.env.MAX_POEM_LINES;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.CORS_ORIGIN;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.MAX_POEM_LINES;
  });

  after(() => {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
    if (prevCors === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = prevCors;
    if (prevRate === undefined) delete process.env.RATE_LIMIT_MAX;
    else process.env.RATE_LIMIT_MAX = prevRate;
    if (prevLines === undefined) delete process.env.MAX_POEM_LINES;
    else process.env.MAX_POEM_LINES = prevLines;
  });

  it("GET /health returns model and propagates X-Request-Id", async () => {
    const openai = mockOpenAI({});
    const app = createApp({ openai, model: "gpt-4o-mini" });
    const customId = "client-req-1";
    const res = await request(app)
      .get("/health")
      .set("X-Request-Id", customId)
      .expect(200);
    assert.equal(res.headers["x-request-id"], customId);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.model, "gpt-4o-mini");
  });

  it("POST /api/analyze returns normalized JSON", async () => {
    const modelPayload = {
      overall_score: 80,
      dimensions: {
        imagery: 80,
        musicality: 80,
        originality: 80,
        clarity: 80,
      },
      issues: [],
    };
    const openai = mockOpenAI(modelPayload);
    const app = createApp({ openai, model: "gpt-4o-mini" });
    const res = await request(app)
      .post("/api/analyze")
      .send({ title: "Hi", lines: ["one line"] })
      .expect(200);
    assert.equal(res.body.overall_score, 80);
    assert.equal(res.body.issues.length, 0);
    assert.equal(res.body.meta.model, "gpt-4o-mini");
  });

  it("POST /api/analyze 400 when lines missing", async () => {
    const openai = mockOpenAI({});
    const app = createApp({ openai, model: "m" });
    const res = await request(app).post("/api/analyze").send({}).expect(400);
    assert.ok(res.body.error);
  });

  it("POST /api/analyze 400 when too many lines", async () => {
    process.env.MAX_POEM_LINES = "2";
    const openai = mockOpenAI({});
    const app = createApp({ openai, model: "m" });
    const res = await request(app)
      .post("/api/analyze")
      .send({ lines: ["a", "b", "c"] })
      .expect(400);
    assert.ok(String(res.body.error).includes("Too many lines"));
  });

  it("POST /api/analyze 500 when API key missing", async () => {
    const openai = mockOpenAI({});
    const app = createApp({
      openai,
      model: "m",
      getApiKey: () => undefined,
    });
    await request(app)
      .post("/api/analyze")
      .send({ lines: ["a"] })
      .expect(500);
  });

  it("POST /api/analyze 502 when model returns invalid scores", async () => {
    const openai = mockOpenAI({ overall_score: "nope" });
    const app = createApp({ openai, model: "m" });
    await request(app)
      .post("/api/analyze")
      .send({ lines: ["a"] })
      .expect(502);
  });

  it("POST /api/analyze 429 when rate limit exceeded", async () => {
    process.env.RATE_LIMIT_MAX = "1";
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    const modelPayload = {
      overall_score: 50,
      dimensions: {
        imagery: 50,
        musicality: 50,
        originality: 50,
        clarity: 50,
      },
      issues: [],
    };
    const openai = mockOpenAI(modelPayload);
    const app = createApp({ openai, model: "m" });
    await request(app)
      .post("/api/analyze")
      .send({ lines: ["a"] })
      .expect(200);
    const res = await request(app)
      .post("/api/analyze")
      .send({ lines: ["b"] })
      .expect(429);
    assert.ok(res.body.error);
  });
});
