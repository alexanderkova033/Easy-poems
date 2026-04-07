# Easy-poems

A browser workshop for drafting poems with **local writing tools** (syllable estimates, approximate stress / meter hints, line stats, rhyme hints, spelling against a local word list), **multiple drafts** in the browser, **per-poem revision snapshots**, **goals**, **export** (.txt / Markdown / Word), **backup import/export** (JSON), and a short **publication checklist**. Optional **ChatGPT** is linked for feedback you run yourself in another tab—there is **no built-in server-side AI** in this repo.

## Live site

[easy-poems.vercel.app](https://easy-poems.vercel.app)

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

Open the URL Vite prints (default `http://localhost:5173`). Drafts **autosave to `localStorage`**. Use the **Writing tools** sidebar for stats, meter, rhyme, spelling (`web/public/wordlist-en.txt` plus your personal dictionary in this browser), goals, checklist, and export. **Export backup** downloads all drafts and snapshots; **Import backup** merges poems from a file.

**`localStorage` keys used by the app:**

| Key | Contents |
|-----|----------|
| `easy-poems:library:v1` | Poem library (all drafts) |
| `easy-poems:revisions:v2` | Per-poem revision snapshots |
| `easy-poems:libraryMeta:v1` | Draft labels, pins, tags, archive state |
| `easy-poems:appearance:v1` | Font, theme, and background preferences |
| `easy-poems:goals:v1` | Writing goals |
| `easy-poems:spell:personal:v1` | Personal spell-check dictionary |
| `easy-poems:spell:ignore-session:v1` | Session-only spell-check ignores (sessionStorage) |
| `easy-poems:first-hint-dismissed` | Whether the first-visit hint has been dismissed |
| `easy-poems:lastExportAt` | Timestamp of last export (for the export reminder) |

**Tests:** `cd web && npm test`

**Stress lexicon (maintainers):** `public/cmu-stress.txt` maps the local word list to CMU stress marks. Regenerate after changing `public/wordlist-en.txt` with `cd web && npm run generate:cmu-stress` (devDependency `cmu-pronouncing-dictionary`; see package licenses).

**Build (maintainers / CI):** `cd web && npm run build` — output in `web/dist`.

## Optional API process

The `server/` package exposes **`GET /health`** only (no poem endpoints, no API keys). Optional for monitoring or future extension:

```bash
cd server
npm install
npm run dev
```

- Health: `GET http://localhost:8787/health`
- Tests: `cd server && npm test`
