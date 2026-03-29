# AI integration — Easy-poems

This is the **implemented product decision**: poem analysis runs through a **small backend** that calls the **OpenAI API**. Keys never ship to the browser.

## Stack

| Piece | Choice |
|--------|--------|
| Provider | **OpenAI** |
| Default model | **`gpt-4o-mini`** (cost/latency for short texts) |
| Upgrade | **`gpt-4o`** via `OPENAI_MODEL` if critiques need more nuance |
| Transport | HTTPS **POST** from the website to your deploy of `server/` |
| Response shape | **JSON object** validated server-side (see schema below) |

## Machine-readable contract

- OpenAPI 3.1: [`server/openapi.yaml`](../server/openapi.yaml) (paths, schemas, `X-Request-Id`).
- Shared TypeScript shapes: [`server/types/analyze.ts`](../server/types/analyze.ts) (import from `web/` or other clients to stay aligned).

## Endpoint (MVP)

**`POST /api/analyze`**

### Request body

```json
{
  "title": "string (optional)",
  "lines": ["line 1 text", "line 2 text", "..."]
}
```

- **`lines`**: one array element per **visual line** of the poem (same numbering as FR-03 in requirements).
- Max payload ~256 KB (server enforces a limit).
- Max line count: **`MAX_POEM_LINES`** (default **500**, hard cap 10 000).

### Success response

`200` `application/json` — must match this shape (extra fields allowed but should stay backward-compatible).

```json
{
  "meta": {
    "model": "gpt-4o-mini",
    "analyzedAt": "2026-03-29T12:00:00.000Z"
  },
  "overall_score": 72,
  "dimensions": {
    "imagery": 70,
    "musicality": 75,
    "originality": 68,
    "clarity": 74
  },
  "issues": [
    {
      "id": "issue-1",
      "line_start": 3,
      "line_end": 3,
      "excerpt": "optional short quote",
      "rationale": "Why this is flagged (polite, direct).",
      "improvements": [
        "First concrete direction",
        "Optional second direction"
      ]
    }
  ]
}
```

**Scores:** integers **1–100** inclusive for `overall_score` and each dimension.

**Issues:**

- `line_start` / `line_end`: **1-based** indexes into `lines`.
- `improvements`: **1–3** short strings per issue.

### Errors

| Status | Meaning |
|--------|---------|
| `400` | Missing/invalid body, or too many lines |
| `429` | Rate limit exceeded (only when `RATE_LIMIT_MAX` is set); may include `Retry-After` |
| `500` | Missing API key (misconfiguration) |
| `502` | Upstream OpenAI error or invalid/unusable model JSON (message sanitized) |
| `504` | Analysis timed out (OpenAI or server request timeout) |

## Environment variables (`server/.env`)

See `server/.env.example`. Required:

- **`OPENAI_API_KEY`** — from [OpenAI API keys](https://platform.openai.com/api-keys)

Optional:

- **`OPENAI_MODEL`** — default `gpt-4o-mini`
- **`PORT`** — default `8787`
- **`CORS_ORIGIN`** — e.g. `http://localhost:5173` for local Vite; omit in dev for permissive `*` (tighten in production)
- **`OPENAI_TIMEOUT_MS`** — OpenAI client timeout (default `90000`)
- **`SERVER_REQUEST_TIMEOUT_MS`** — Node HTTP `requestTimeout` (default `120000`)
- **`MAX_POEM_LINES`** — reject requests over this many lines (default `500`, max `10000`)
- **`RATE_LIMIT_MAX`** — if set to a positive number, caps `POST /api/analyze` per client IP per window
- **`RATE_LIMIT_WINDOW_MS`** — window for the limiter (default `60000`)

## Privacy copy (for UI)

- Drafts stay in the **browser** until the user clicks **Analyze**.
- **Title + lines** are sent **to your server**, then **to OpenAI** for that request.
- Align your deployed policy with [OpenAI’s enterprise/API data terms](https://openai.com/policies) at launch.

## Frontend contract

`fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, lines }) })`  
Use the **same origin** as the site if the API is reverse-proxied, or set `CORS_ORIGIN` and call the absolute API base URL. The **`web/`** app uses the Vite dev proxy to `server/` on port `8787`.

---

*Version: 1.1 — TypeScript server, hardening envs, `web/` client*
