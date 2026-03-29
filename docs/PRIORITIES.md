# Demand & delivery priorities (MVP → later)

This document turns [REQUIREMENTS.md](./REQUIREMENTS.md) into **what to build first**. Stakeholder choices: **website**, **English only**, **1–100 scores**, **polite/direct non-configurable tone**, **local poem storage**, **no export**, **edit → re-analyze loop**, **maximize writing tools**.

## Core user flow (P0)

1. Write or paste poem in the browser → **local autosave**.
2. Use **inline tools** (syllables, counts, spelling) while writing.
3. **Run analysis** → see issues, rationales, improvements, **1–100** overall + dimensions.
4. **Edit** → **Run analysis again** on the new text (show **last analyzed at** or simple version label).

## MoSCoW

### Must (first shippable slice)

- Poem editor with line structure, title, **local persistence**.
- **Analyze** and **re-analyze** actions; results bound to “current text” with clear **last run** indication.
- **1–100** overall + dimensional scores; issues with line/span refs; polite, direct copy.
- Syllable counter per line + **word/character counts**.
- Suggestive English spelling with ignore / personal dictionary (local).
- Privacy copy: local drafts; on analyze, text goes to **`server/`** then **OpenAI** (document in UI).
- Deploy **`server/`** (or equivalent) so **API keys never ship to the browser**—see [AI_INTEGRATION.md](./AI_INTEGRATION.md).

### Should (next)

- Jump from feedback item to editor line; expand/collapse issues.
- **Rhyme / sound hints** (heuristic).
- **Stress / meter hints** with honest “approximate” labeling.
- Debounced auto-analysis toggle (optional).
- Spelling profile: permissive vs strict.

### Could

- Streaming partial AI results.
- Regenerate one issue’s suggestions.
- Extra local tools (repeated words, line-length visualization, reading-time if useful).

### Won’t (for now)

- Accounts, cloud sync, **export**.
- Real-time multi-user editing.
- Custom model training on user poems.
- Non-English UI and poem tooling.

## Rough phases

| Phase | Focus |
|-------|--------|
| **P0** | Editor + local save + analyze/re-analyze + 1–100 UI + syllables + counts + spell + AI integration (one provider, structured output) |
| **P1** | Feedback navigation + rhyme/sound + stress/meter + polish latency |
| **P2** | Streaming, optional auto-run, extra heuristics |

## Model tuning (engineering task)

With **OpenAI** fixed, compare **`gpt-4o-mini`** vs **`gpt-4o`** on the same poem using **`POST /api/analyze`**. Record latency, cost per poem, and subjective critique quality; pick default per environment.

## Success metrics (pick 2–3)

- Time from open to first useful critique.
- Users who **re-run analysis** after edits (loop engagement).
- Clarity: “I understood why it scored this way” (survey or lightweight prompt).

---

*Version: 0.3 — OpenAI integration via `server/`*
