# easywriting-poem

**For poets who want real analysis tools — private, local, no account.**

A poem writing workshop that runs entirely in your browser. Write a draft on the left; meter, rhyme, syllables, and spelling analysis update live on the right. Nothing is uploaded, nothing is tracked, nothing requires a sign-up.

**Live site:** [easywritingpoem.org](https://www.easywritingpoem.org/)

---

## Who it is for

- **Hobbyist and serious poets** who want structured feedback without sending their drafts to a cloud service
- **Writers who value privacy** — every keystroke stays in your browser's local storage until you choose to export
- **People tired of paying for or signing up to writing tools** — the workshop is free to use with no account
- **Students and educators** working with poetry who need syllable counts, meter patterns, and rhyme schemes on demand

---

## What it does

| Tool | What it shows |
|------|---------------|
| **Overview** | Word count, line count, syllables, stanzas, read-aloud time |
| **Lines** | Per-line syllable counts, meter pattern, iambic fit percentage |
| **Meter** | Stress pattern from a CMU pronouncing dictionary + heuristic fallback |
| **Rhyme** | End-rhyme scheme labels (A, B, C…) shown beside the editor as you write |
| **Repeats** | Repeated and near-repeated words flagged with line numbers |
| **Spell** | Poetry-aware spelling with a personal dictionary and ignore list |
| **Goals** | Word count targets and custom writing goals |
| **Ready** | Publication checklist — title set, no open spelling flags, etc. |
| **Snapshots** | Save named revision points and compare any two side-by-side |
| **AI Analysis** | Optional: scores imagery, musicality, originality, and clarity via OpenAI (requires the companion server) |

---

## Why choose it

**Everything is local.** Drafts, snapshots, goals, and your personal spelling dictionary are stored in `localStorage` in your browser. No server sees them during normal editing. If you close the tab and return a week later, your work is still there.

**The tools are built for poetry specifically.** Syllable counts use a CMU pronouncing dictionary. The spell checker understands that made-up words and neologisms are normal. The rhyme panel groups end sounds rather than checking for perfect rhyme. These are not generic writing tools bolted onto an editor.

**Nothing demands your attention.** Analysis runs silently in the background. You are never interrupted by suggestions while writing — the panel is there when you want it and invisible when you don't.

**One URL, works offline.** After the first load the app runs without a network connection. No installs, no app store, no updates to manage.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 18 + TypeScript |
| Build | Vite |
| Editor | CodeMirror 6 (`@uiw/react-codemirror`) |
| Stress dictionary | CMU Pronouncing Dictionary (bundled subset) |
| Spell checking | Custom engine + word-list |
| Export | `docx` library for Word files |
| Storage | Browser `localStorage` only |
| Server (optional) | Node/Express proxy for AI analysis via OpenAI |

---

## Project layout

```
easywriting-poem/
├── web/                    # Frontend (Vite + React)
│   ├── src/
│   │   ├── app/            # Root component, global CSS, entry point
│   │   ├── poem-workshop/  # Main workshop UI (editor, tools, modals)
│   │   ├── poem-editor/    # CodeMirror extensions
│   │   ├── writing-tools/  # Pure analysis functions (meter, rhyme, syllables…)
│   │   ├── spellcheck/     # Spell engine + personal dictionary
│   │   └── draft-library/  # Local storage, snapshots, export
│   └── public/
├── server/                 # Optional Express proxy for AI analysis
└── docs/                   # Product requirements and priority docs
```

---

## Privacy

All poem data lives in `localStorage` in the browser that created it. No analytics, no telemetry, no external requests are made by the app itself. Exporting a file or using AI analysis sends data only where you explicitly direct it.

---

## License

See [LICENSE](LICENSE) if present, or contact the maintainers.
