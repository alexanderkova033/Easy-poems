# Easy Poems

**Easy Poems** is a free, browser-based poetry workshop: write in your browser, keep drafts **locally** (nothing is sent to our servers), and use built-in tools for syllables, meter, rhyme hints, spelling, goals, and export. The production app is hosted on **Vercel**; this repo is the source you can run or fork yourself.

**Live site:** [easy-poems.vercel.app](https://easy-poems.vercel.app)

There is **no account** and **no cloud sync** in the default product path—only **your browser’s storage**, plus optional **export** and **JSON backup** so you can move work between devices.

---

## What you get in the app

- **Editor** with title, optional form note, and line-based poem body (CodeMirror).
- **Tools sidebar:** issues queue, totals, per-line table, **meter** (stress hints), **rhyme** (letter-pattern / sound-adjacent clusters), **repeats** (non-stopword repetitions), spelling (local word list + your dictionary), goals, publication checklist, revision snapshots.
- **Getting started:** **⌘/Ctrl + K** → “Getting started” opens a short map of the screen; there is also a link under the tool tabs. **Delayed hover tips:** pause over many buttons (~½s) to see what they do — toggle under **Fonts** or via Commands (“delayed hover”).
- **Keyboard shortcuts:** open the **Shortcuts** button in the header (next to Commands / Find), or **⌘/Ctrl + K** → “Keyboard shortcuts”. The tools panel also links to the same help.
- **Select a word** in the poem for a popup with definitions (when available) plus **synonyms / similar** and **antonyms / opposites** from combined dictionary and [Datamuse](https://www.datamuse.com/api/) lookups—needs a network connection for that feature only.
- **Looks:** poem & UI fonts, optional **page backdrop** themes (including brighter “paper” / “dawn” / “parchment” and richer “crimson” / “ocean” / “aurora”), and a toggle for per-line syllable counts (`ˈsyll` in the formatting row).
- **Export:** `.txt`, `.md`, `.docx`, print/PDF; **workshop backup** JSON (all drafts + snapshots); import merges poems in.

Optional **ChatGPT** is linked for feedback you run yourself in another tab—this repo’s static build does **not** call OpenAI or any poem-analysis API by default.

---

## Repository layout

| Path | Role |
|------|------|
| `web/` | Vite + React SPA (the workshop UI). **Deployed site** is built from here. |
| `server/` | Small Node service with **`GET /health`** only (optional ops / future use). |
| `docs/` | Requirements, priorities, architecture notes. |
| `design/` | Placeholder for design artifacts. |

---

## Run locally (developers)

```bash
cd web
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). Same behavior as production, with hot reload.

**Tests:** `cd web && npm test` (unit + a few DOM component tests).  
**End-to-end:** `cd web && npm run test:e2e` (starts dev server; requires a one-time `npx playwright install` for browsers).  
**Production build:** `cd web && npm run build` → output in `web/dist` (what Vercel builds).

**Stress lexicon (maintainers):** `web/public/cmu-stress.txt` aligns the local word list to CMU-style stress. After changing `wordlist-en.txt`, run `cd web && npm run generate:cmu-stress`.

---

## Data stayed on your device

Drafts, snapshots, goals, appearance, and your personal spell list are stored in the browser. Keys include:

| Key | Contents |
|-----|----------|
| `easy-poems:library:v1` | Poem library |
| `easy-poems:revisions:v2` | Per-poem snapshots |
| `easy-poems:libraryMeta:v1` | Labels, pins, tags, archive |
| `easy-poems:appearance:v1` | Fonts + backdrop choice |
| `easy-poems:showLineSyllables` | `1` / `0` for inline syllable counts |
| `easy-poems:goals:v1` | Writing goals |
| `easy-poems:spell:personal:v1` | Personal dictionary |
| `easy-poems:spell:ignore-session:v1` | Session spell ignores (sessionStorage) |
| `easy-poems:lastToolTab` | Last tools tab (sessionStorage) |
| `easy-poems:lastExportAt` | Export reminder timestamp |
| `easy-poems:uiHoverHints` | `1` / `0` — delayed hover explanations on controls |

---

## Optional `server/` process

```bash
cd server
npm install
npm run dev
```

- Health: `GET http://localhost:8787/health`
- Tests: `cd server && npm test`

---

## Documentation

- [Product requirements](docs/REQUIREMENTS.md)
- [Priorities / MVP](docs/PRIORITIES.md)
- [AI integration notes](docs/AI_INTEGRATION.md) (historical; no default in-app AI)
- [Design folder](design/README.md)

---

## Privacy (summary)

The hosted app does not use analytics or third-party trackers for poem text. Drafts stay on your machine until you export, copy, or use a feature that explicitly uses the network (e.g. word lookup while you have text selected). Use the **Privacy** section in the app footer for full copy.
