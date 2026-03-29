# Easy-poems — Product requirements

## 1. Vision

Make writing, revising, and understanding poetry faster and clearer through **interactive AI feedback**, **lightweight writing aids** (spelling, meter, structure), and **transparent “why this rating / suggestion”** explanations—not a black box.

## 2. Goals

| Goal | Success signal |
|------|----------------|
| Fast critique | User gets structured feedback in seconds after requesting analysis. |
| Actionable improvement | Feedback names concrete issues (e.g. weak line, cliché risk) and 1–3 improvement paths. |
| Trust | Every major AI judgment is paired with a short rationale the user can disagree with. |
| Writing flow | Corrections and counters update without breaking creative momentum; **re-analysis** after edits is one clear action. |

## 3. Stakeholder decisions (locked)

| Topic | Decision |
|--------|-----------|
| **Platform** | **Website** (browser-first). |
| **Language** | **English only** for poem tools, spellcheck, and UI at launch. |
| **Rating scale** | **1–100** overall, plus **dimensional sub-scores** on the same scale (or clearly defined sub-ranges) so the total score is explainable. |
| **AI tone** | **Not user-configurable.** Single voice: **polite and direct** (respectful, workshop-clear, no fluff). |
| **Poem storage** | **Local only** in the browser (e.g. IndexedDB / local storage). **No export feature required** for MVP. |
| **Core loop** | User **reads feedback → edits in the editor → runs analysis again** on the new text. |
| **Writing tools** | **Maximize useful built-in tools** (syllables, counts, and as many reliable English poetry aids as practical—rhyme/sound/meter where feasible). |
| **AI stack** | **OpenAI API** through a **server-side proxy** (`server/`). Default model **`gpt-4o-mini`**; optional **`gpt-4o`**. Contract: [AI_INTEGRATION.md](./AI_INTEGRATION.md). |

## 4. Assumptions

- **One poem** (or one active document) in early versions unless you later add a library of saved drafts.
- Text is sent to a **remote LLM API** for analysis unless you adopt a **local model** (see §9); poem **drafts** stay on device except for those API requests.
- Internationalization of UI/other languages is **out of scope** until after English MVP.

## 5. AI integration (chosen)

The suggestion is **integrated** as the default architecture:

- **Provider:** OpenAI.
- **Models:** **`gpt-4o-mini`** by default; set **`OPENAI_MODEL=gpt-4o`** if critiques need more depth.
- **Proxy:** A small **Node** server in `server/` exposes **`POST /api/analyze`**; the **API key stays on the server**.
- **Payload / JSON shape:** Defined in [AI_INTEGRATION.md](./AI_INTEGRATION.md) (1–100 scores, issues with line ranges, improvements).

**Alternatives later:** Anthropic, Gemini, or a local LLM remain valid if requirements change; swap the call inside the proxy and keep the same response contract for the frontend.

## 6. User stories (summary)

- As a poet, I want **spell/grammar suggestions** that respect poetic license (e.g. dialect, invented words) so I am not forced into “correct” prose.
- As a poet, I want **syllable counts** and **other sound/structure hints** per line so I can tune form.
- As a poet, I want **AI to highlight what it dislikes** (lines, phrases, or patterns) and **suggest directions**, not only a single score.
- As a poet, I want an **overall 1–100 rating** with **dimensions** (e.g. imagery, sound, originality, clarity) so I know what the score means.
- As a poet, I want to **edit after feedback** and **run analysis again** on the latest version without losing my draft locally.

## 7. Functional requirements

### 7.1 Poem editor & document model

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Editor with **title** and **line-based** poem body; optional metadata (e.g. form) as needed. | Must |
| FR-02 | **Autosave** to **local** persistence; recovery if the tab closes. | Must |
| FR-03 | **Line-based addressing** so AI and tools refer to “line N” consistently. | Must |

### 7.2 Spelling and language assistance

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10 | **Suggestive spelling** (underlines + suggestions); user can **ignore / add to personal dictionary** (local). | Must |
| FR-11 | **Poetic exceptions**: do not auto-correct without confirmation; optional “permissive” vs “strict” spell profile. | Should |
| FR-12 | **English** dictionaries and heuristics for launch. | Must |

### 7.3 Structural & quantitative tools

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-20 | **Syllable counter** per line (and stanza/total where useful). | Must |
| FR-21 | **Word count** and **character count** (including per line if helpful). | Must |
| FR-22 | **Rhyme / assonance / consonance hints** (heuristic / dictionary-backed where possible). | Should |
| FR-23 | **Stress / meter hints** for English (e.g. pattern visualization per line)—accuracy bounded by NLP limits; label uncertainty in UI. | Should |
| FR-24 | Additional **high-value, low-ambiguity** tools as identified in implementation (e.g. line length stats, repeated word highlights). | Could |

### 7.4 Interactive AI analysis

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-30 | User explicitly **runs analysis** (button); optional **debounced auto-run** after idle (toggle later). | Must |
| FR-31 | Output includes **issues**: what the model flags, tied to **lines or spans**. | Must |
| FR-32 | Per issue: **short rationale** + **1–3 improvement directions**; voice **polite and direct**. | Must |
| FR-33 | **Overall score 1–100** plus **dimensional scores 1–100** (e.g. imagery, musicality, originality, clarity)—definitions stable in prompt/UI. | Must |
| FR-34 | After edits, user can **re-run analysis** on current text; show **which version** or **timestamp** of last run to avoid confusion. | Must |
| FR-35 | **Expand/collapse** issues; **click feedback → jump to line** in editor. | Should |
| FR-36 | **Regenerate** alternative phrasing for one issue (optional). | Could |

### 7.5 Privacy, safety, and content

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-40 | Clear copy: **drafts stay local**; on **Analyze**, text goes to **your backend** then **OpenAI**. Cite **OpenAI** and link to their API/data terms in the UI or About page. | Must |
| FR-41 | Align with **OpenAI** on **data retention**; prefer settings/tiers that minimize retention if available. | Must |
| FR-42 | **Content policy** for harmful requests (refusal, safe messaging)—define before public launch. | Should |

## 8. Non-functional requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Analysis latency (typical short poem) | Under ~10–30 s P95, or streaming partial results |
| NFR-02 | Editor responsiveness | Typing stays smooth; heavy work off main thread or debounced |
| NFR-03 | Accessibility | Keyboard nav, readable contrast, screen reader for core panels |
| NFR-04 | Future i18n | English-only UI now; avoid hard-coding strings in a way that blocks later translation |

## 9. Out of scope (initial release)

- User accounts and **cloud sync** of poems.
- **Export** of poems (not required for MVP).
- Full collaborative real-time co-editing.
- Paid marketplace for poems.
- Training custom models on user corpora.
- Non-English poem tooling and UI.

## 10. Open decisions (remaining)

- **Production hosting** for `server/` (and CORS allowlist for the website origin).
- **Budget / rate limits** per IP or per deploy (optional guardrails).
- **`gpt-4o-mini` vs `gpt-4o`** per environment—validate with real poems.

---

*Version: 0.3 — OpenAI + proxy integrated (see [AI_INTEGRATION.md](./AI_INTEGRATION.md))*
