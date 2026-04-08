# Easy Poems — Poetry Workshop

**Easy Poems** is a browser-based poetry workshop for drafting, revising, and reading poems with helpful (optional) tools. It **autosaves locally in your browser**, so you can write without an account.

- **Live site**: [easywritingpoem.org](https://www.easywritingpoem.org/)
- **Storage**: local-only by default (export/backup when you want)

### What the app is

- **A clean poem editor**: title + optional form note + poem body (one line per line break).
- **A “workshop” side panel**: syllables, meter hints, rhyme / repeats signals, spelling flags, line stats, checklists, goals, and revision comparisons.
- **Fast navigation**: **⌘/Ctrl + K** opens Commands (search any action by name), plus a Shortcuts sheet and a quick guide.
- **Reading view**: a distraction-free “paper” view for proofreading.
- **Export + backup**: export common formats and download/import a JSON backup to move drafts between devices.

### AI analysis (optional)

The workshop includes an optional **AI Analysis** panel that can call OpenAI models when configured. If you don’t use AI analysis, the core workshop still works as a local-first writing tool.

### Repository layout

| Path | Role |
|------|------|
| `web/` | Vite + React SPA (the workshop UI). |
| `server/` | Small Node service (currently minimal / optional). |
| `docs/` | Product / architecture notes. |

### Run locally

```bash
cd web
npm install
npm run dev
```

### Production build

```bash
cd web
npm run build
```

### Notes on local data

Drafts, settings, and tools state are stored in this browser’s storage unless you export. See `web/src/shared/storage-keys.ts` for the exact keys used.
