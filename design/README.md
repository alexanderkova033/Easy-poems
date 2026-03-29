# Design folder

Place **UX and visual design** artifacts for Easy-poems here so engineering and stakeholders share one location.

## Suggested contents

| Artifact | Purpose |
|----------|---------|
| `flows/` | User flows (e.g. “first analysis,” “edit → re-analyze,” “ignore spelling”). PNG/PDF or links. |
| `wireframes/` | Low-fi editor + analysis panel layouts. |
| `mockups/` | Hi-fi screens (Figma exports or linked frames). |
| `components/` | Design tokens, typography, color—if not only in Figma. |
| `research/` | Notes from poet interviews or competitive review. |

## Product context (for designers)

- **Website**, **English only**, poems **saved locally** (no export/sync in MVP).
- **Scores**: **1–100** overall + dimensions; AI tone **polite and direct** (not configurable).
- **Hero flow**: read feedback → edit → **analyze again**; UI should make **re-run** obvious and show **when** the last result applies.

## Design questions to resolve (tie to `docs/REQUIREMENTS.md`)

- **Layout**: Single column (editor full-width, analysis drawer) vs split pane?
- **Analysis UX**: Side panel vs modal vs inline markers in the poem?
- **Tool density**: Syllables, counts, rhyme/meter—**toolbar vs collapsible panel** vs per-line gutter?
- **Mobile**: If the site is usable on small screens, how much analysis + tools fit without clutter?
- **Re-analyze**: Button placement, loading state, and **last analyzed** indicator so users trust the new score matches the draft.

## External tools

If you use **Figma** (or similar), add a line here with the **share link** and naming convention for frames (e.g. `MVP / Editor-default`).

---

*This README is the index; add real files as design progresses.*
