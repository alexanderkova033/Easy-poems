# Easy-poems

The project helps users write and analyse poems with **interactive AI feedback**, **writing aids** (spelling, syllables, and related tools), and clear **ratings with explanations**.

## Project docs

- [Product requirements](docs/REQUIREMENTS.md) — vision, functional/non-functional requirements, open questions.
- [Priorities / MVP backlog](docs/PRIORITIES.md) — MoSCoW and phased delivery.
- [AI integration](docs/AI_INTEGRATION.md) — OpenAI proxy, `POST /api/analyze`, JSON contract.
- [Design folder](design/README.md) — where to put flows, wireframes, and mockups.

## Web app + API (local dev)

Terminal 1 — API (TypeScript; runs with `tsx` in dev, or `npm run build` + `npm start`):

```bash
cd server
copy .env.example .env
# Edit .env: set OPENAI_API_KEY

npm install
npm run dev
```

Terminal 2 — browser UI (Vite proxies `/api` and `/health` to `http://127.0.0.1:8787`):

```bash
cd web
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). The editor **autosaves to `localStorage`**; **Analyze** calls `POST /api/analyze`. Use the **Writing tools** sidebar for syllable/word/character stats, a per-line table (with **jump to line**), rough rhyme and repetition hints, and **spelling** (local word list from `web/public/wordlist-en.txt`, plus your personal dictionary in this browser).

- API tests: `cd server && npm test` (normalization + HTTP with mocked OpenAI).
- API production build: `cd server && npm run build && npm start` (runs `dist/index.js`).

- Health: `GET http://localhost:8787/health`
- Analyze: `POST http://localhost:8787/api/analyze` with JSON body `{ "title": "...", "lines": ["..."] }`

## Production notes

- Put the static **`web/dist`** assets and the **Node server** behind one origin (reverse proxy) so the browser can use same-origin `/api/analyze`, or set **`CORS_ORIGIN`** to your site and point the web client at the API base URL.
- Set **`RATE_LIMIT_MAX`** / **`RATE_LIMIT_WINDOW_MS`** if the API is exposed to the open internet.
