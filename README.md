# Easy-poems

A browser workshop for drafting poems with **local writing tools** (syllable estimates, approximate stress / meter hints, line stats, rhyme hints, spelling against a local word list), **multiple drafts** in the browser, **per-poem revision snapshots**, **goals**, **export** (.txt / Markdown / Word), **backup import/export** (JSON), and a short **publication checklist**. Optional **ChatGPT** is linked for feedback you run yourself in another tab—there is **no built-in server-side AI** in this repo.

## Project docs

- [Product requirements](docs/REQUIREMENTS.md) — vision, functional/non-functional requirements, open questions.
- [Priorities / MVP backlog](docs/PRIORITIES.md) — MoSCoW and phased delivery.
- [AI integration](docs/AI_INTEGRATION.md) — historical notes on the former OpenAI `POST /api/analyze` flow (removed from the codebase).
- [Design folder](design/README.md) — where to put flows, wireframes, and mockups.

## Web app (local dev)

```bash
cd web
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). Drafts **autosave to `localStorage`** (poem library under `easy-poems:library:v1`; snapshots per poem under `easy-poems:revisions:v2`). Use the **Writing tools** sidebar for stats, meter, rhyme, spelling (`web/public/wordlist-en.txt` plus your personal dictionary in this browser), goals, checklist, and export. **Export backup** downloads all drafts and snapshots; **Import backup** merges poems from a file.

**Tests:** `cd web && npm test`

**Production build:** `cd web && npm run build` — static output in `web/dist` (serve from any static host).

## Optional API process

The `server/` package exposes **`GET /health`** only (no poem endpoints, no API keys). Optional for monitoring or future extension:

```bash
cd server
npm install
npm run dev
```

- Health: `GET http://localhost:8787/health`
- Tests: `cd server && npm test`

## Production notes

- Deploy **`web/dist`** as static files. No backend is required for the workshop UI.
- If you run the small Node server, set **`CORS_ORIGIN`** to your site origin when calling `/health` cross-origin.
