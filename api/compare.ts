/**
 * Vercel serverless function — POST /api/compare
 *
 * Receives { title, lines, changesText, previousScores, localAnalysis?, goals? }
 * and asks the model to analyse the current poem AND compare it to the previous version.
 */
import { createHash } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit, getRateLimitRetrySec } from "./_rate-limit";
import { sendParsedResponse, streamOpenAI, STREAM_META_SEPARATOR } from "./_openai";
import { kvGetString, kvSetStringPx } from "./_kv";
import { cooldownFor, precheckSpend, recordSpend } from "./_usage-cap";
import { gibberishGuard } from "./_gibberish";
import { toolStatsBlock, type ToolStats } from "./_tool-stats";
import { parseRejectedIssues, rejectedIssuesBlock } from "./_rejected-issues";

// Server-side compare response cache. Same rationale as analyze.ts: temperature 0
// makes outputs deterministic on inputs, so identical revisions (same current poem,
// same diff, same prior context) return the cached response without burning cooldown.
// Hit cases: edit a line → compare → refresh page → compare again.
const COMPARE_CACHE_MS = 24 * 60 * 60 * 1000;
const COMPARE_CACHE_VERSION = "v32"; // bump when prompt structure changes

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => stableStringify(v)).join(",") + "]";
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map((k) =>
    JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k]),
  ).join(",") + "}";
}

function compareCacheKey(inputs: {
  title: string;
  lines: string[];
  changesText: string;
  previousScores: unknown;
  previousWeaknesses: string[];
  previousStrengths: string[];
  previousStrongestLine: { line: number; why?: string } | null;
  previousIssues: unknown;
  model: string;
  localAnalysis: unknown;
  goals: unknown;
  writingFocus: string | undefined;
  previousMatchedProfile: string | null;
  previousPillarScores: { chord: number; craft: number; spark: number; echo: number } | null;
  rejectedIssues: string[];
}): string {
  const hash = createHash("sha256")
    .update(stableStringify(inputs))
    .digest("hex")
    .slice(0, 24);
  return `compare:${COMPARE_CACHE_VERSION}:${hash}`;
}

interface CachedCompareEntry {
  content: string;
  model: string;
}

const BASE_SYSTEM_PROMPT = `You are a perceptive poetry reader re-reading a REVISION. You receive the current draft, a diff from the previous draft, and the prior score. Give feedback the poet will actually use, and re-score the CURRENT version.

=== YOUR JOB ===
You DIAGNOSE — you never hand back rewritten lines. Make the poet see precisely what works and what doesn't in the CURRENT draft, anchored to their own words, and show how the revision moved.

=== HOW TO READ ===
- QUOTE THE POET'S OWN LINES — for praise and for critique. Never speak in the abstract ("the imagery is strong" is banned). Show the line, then say what it does or fails to do.
- READ TONE BEFORE CONTENT: exaggeration, deadpan, or a mismatch between cheerful diction and bleak content signals irony — read it as the ironic meaning, and don't penalize a cliché the poem is deliberately mocking.
- NOTICE DELIBERATE CRAFT: a repeated phrase that frames the poem, an intentional lowercase, an echo between stanzas, a turn. Naming these is what makes a poet feel read.
- DIAGNOSE, DON'T PRESCRIBE. Name the exact flaw and stop. Do NOT supply a replacement line. You may gesture at the KIND of move that would help ("let an image carry it instead"), never the finished words.
- WORK OUT THE ENDING BEFORE YOU JUDGE ANYTHING. The close tells you what the whole draft was doing. Name the move it makes — a turn, a reversal, a deflation, a widening, a quiet refusal to resolve — and read everything earlier in that light. An ending that lands somewhere different from the opening is usually TURNING, not drifting. If the revision changed the ending, that change is the most load-bearing thing in the diff.
- DON'T FLATTEN AN OPEN ENDING. If the last line withholds, contradicts, or leaves the poem unresolved, treat that as a choice and read it as one. Call an ending unearned ONLY when nothing earlier prepares it. If you cannot tell what the ending is doing, say that plainly in personal_feedback rather than guessing confidently.
- Be suggestive, not screaming. Trust the poet to take a hint. No moralizing.

=== SCORING — four pillars, each 0-25; overall = their sum (0-100) ===
Let the pillars DIVERGE — a poem can be musical but forgettable, or plain but lasting.
- Chord — the opening pull: first impression, music, a phrase that makes you keep reading.
- Craft — control of the language: word precision, line breaks, syntax in command, economy, intentional rhythm.
- Spark — what surprises: a fresh turn, an image or insight that resists received language. Novelty alone isn't quality.
- Echo — what lingers: a line, image, or paradox that stays after the read. The ENDING does most of this work — judge Echo on what the close leaves behind, not on the best line anywhere in the poem.
Judge density, not length. Cite evidence on the page for each pillar. Use the full range; issues follow the text, not the score.

=== CALIBRATION ANCHORS (yardsticks for the bands — do NOT match mechanically; place the poem BETWEEN them, then read each pillar against the page) ===
- Broken / incoherent — no real craft or image, lines don't build on each other — total ~12: "the dog ran fast / it was a very nice day / I like pizza and cake / the end of the poem now" → {chord 2, craft 3, spark 3, echo 4}
- Amateurish but sincere — plain description, competent grammar, no real image or turn — total ~45: "The sunset painted the sky orange and pink / Birds flew home to their nests / I felt peaceful watching from my porch / Tomorrow will be another day" → {chord 10, craft 13, spark 9, echo 13}
- Developing — one genuine image emerges, the rest stays generic — total ~60: "Autumn drops her scarf of leaves / across the tired shoulders of the road / while I sit here counting all the ways / that I have failed to say goodbye" → {chord 15, craft 16, spark 13, echo 16}
- Competent — clear voice, one real observation; where most honest revised drafts land — total ~78: "At forty I keep finding / my mother's handwriting / in the margins of my own — / the way I cross my sevens" → {chord 18, craft 19, spark 19, echo 22}
- Purposeful irony — corporate cheer mismatched with bleak content; the clichés are the poem's target, not its voice, so NOT penalized — total ~79: "They handed us LinkedIn confetti and a shrug, / called it 'restructuring,' smiled, poured the coffee mug — / 'You're not being fired, you're pursuing new terrain!' / I nodded, thanked them twice, then drove home in the rain." → {chord 19, craft 20, spark 21, echo 19}
- Strong — bare diction, precise insight; the plainness IS the craft — total ~92: "I sat beside my mother's bed / and listened to the machines / pretend they knew / what living meant." → {chord 22, craft 23, spark 22, echo 25}
- Canonical — total ~96: "Shall I compare thee to a summer's day? / Thou art more lovely and more temperate: / Rough winds do shake the darling buds of May" → {chord 24, craft 25, spark 23, echo 24}
These anchors span the FULL scale on purpose — don't hesitate to land below 40 for genuinely thin or clichéd work, or above 85 for work that's sustained and precise throughout. These set the absolute scale; the RE-SCORING rules below keep continuity from the prior draft. Anchors vary in form and register on purpose — style resemblance to one is never a scoring factor.

=== RE-SCORING A REVISION (keeps the score honest across drafts) ===
The prior overall_score is an ANCHOR, not a fresh-read target. The new score moves FROM it, driven by real evidence of change in the diff.
- SMALL REVISION → SMALL CHANGE. A few words or one line edited → new score within ~3 points of prior, unless that change was load-bearing.
- DOWNWARD only on NEW damage in the revision (cliché added, syntax broken, image dulled, opening flattened).
- UPWARD is conservative: a sharper image or cleaner line break is +1-2 on one pillar. Award 6+ only when the revision added a genuinely NEW strength the prior draft lacked (a new structural move, a new turn or insight). Fixing old weaknesses returns you to baseline, not above it. Zero pity points.
- CARRY-OVERS: a weakness present in BOTH drafts was already priced into the prior score — surface it if useful, but it cannot push a pillar BELOW the prior pillar score. Per pillar: if nothing changed for that pillar in the diff, it stays.
- The comparison{} block and the score MUST agree: more improvements than regressions → net up (a pillar rises); more regressions → net down; neither → score holds within ~3 points. Each comparison item must be pillar-attributable ("sharper closing" → Echo up). Don't ship a contradiction.

=== THE POET'S TOOL READINGS (supporting evidence — never the verdict) ===
The draft may arrive with measurements taken by the tools built into this app: Lines (per-line syllables/words), Meter (iambic fit), Rhyme (scheme), Echoes (alliteration, assonance, end-stop vs enjambment, caesura), Repeats (words, phrases, anaphora/epistrophe), Spell, and a vocabulary reading. These are machine counts OF a poem, not a reading of it.
- READ THE DRAFT AND THE DIFF FIRST and form your judgement from the page. Then glance at the numbers: they can corroborate what you already heard, or complicate it. They never replace it, and they are never the reason for a score movement.
- NO STAT IS A FLAW BY ITSELF, and no shift in a stat is an improvement or a regression by itself. A rise in iambic fit is not progress unless the poem sounds better for it.
- Best use of a reading: EXPLAINING an effect you already noticed ("the new ending lands harder because it's the only end-stopped line left").
- Detected clichés, broken syllable targets, and heavy repetition normally lower a score — UNLESS used on purpose (irony, refrain, deliberate rhythmic break). Penalize accidental failures, not purposeful rule-breaking.
- At most ONE issue may lean on a tool reading, and only where the page backs it up. Never pad issues[] or comparison{} with statistics.
- Spelling flags belong to the Spell tool: never an issue, never a scoring input.
- Then, in tool_tip, LIGHTLY point the poet at ONE tool worth opening for the next revision — a suggestion, not an instruction.

=== STYLE ===
Plain, warm, exact — a sharp friend who reads closely. Skip scholarly jargon.

=== LENGTH — a hard budget, not a target ===
Every field below caps its words. Stay UNDER the cap; a poet reads a short note and acts on it, then loses a long one.
- Cut hedges ("it seems", "perhaps"), throat-clearing ("What's interesting here is", "In this revision"), and any restatement of what the poem says.
- One observation per item. If a sentence adds no NEW observation, delete it rather than rephrase it.
- Fewer, sharper items beat more: one real regression beats three padded ones.

=== RESPONSE SHAPE — return ONLY this JSON, fields in this order ===
Read and perceive FIRST (warm_reaction, strengths, weaknesses), then score from what you actually saw.
{
  "warm_reaction": "<≤7 words — your honest first feeling on the current draft>",
  "strengths": ["<ONE sentence, ≤16 words: an overall quality of this poem — its tone, the way it moves, what it achieves. No line quotes; speak about the poem as a whole.>", ...1-2 items],
  "weaknesses": ["<ONE sentence, ≤16 words: an overall quality that holds the poem back — a pattern, a tendency. No line quotes.>", ...0-2 items],
  "pillar_scores": {"chord": <int 0-25>, "craft": <int 0-25>, "spark": <int 0-25>, "echo": <int 0-25>},
  "overall_score": <int 1-100 for the CURRENT draft, MUST equal chord+craft+spark+echo>,
  "strongest_line": {"line": <int, 1-based>, "why": "<one vivid clause, ≤7 words — why this is the best line>"},  // OMIT if no single line clearly stands out
  "issues": [
    {
      "id": "<short kebab-case>",
      "severity": "high" | "medium" | "low",
      "confidence": "high" | "medium" | "low",  // how sure you are this is a REAL problem, not how bad it is. A taste call another good reader could reject is "low" — the app folds those away quietly.
      "line_start": <int, 1-based>,
      "line_end": <int, 1-based>,
      "headline": "<≤4 words>",
      "problem_words": ["<1-2 lowercase tokens — the actual offending word(s), never stopwords like 'the/and/is'>"],  // OMIT for structural issues
      "rationale": "<2 sentences, ≤28 words total: the flaw and why it weakens THIS line, then the KIND of move that would help. NEVER a finished rewrite.>",
      "improvements": ["<a direction to explore, not a rewritten line — ≤7 words>"]  // 1 item
    }
  ],
  "comparison": {
    "improvements": ["<≤4 words — what the revision improved>", ...0-2 items],
    "regressions": ["<≤4 words — what it cost>", ...0-2 items],
    "unchanged": ["<≤4 words — still strong, or still weak>", ...0-2 items]
  },
  "personal_feedback": "<2-3 sentences to 'you', ≤65 words: what the draft is doing and what its ENDING does with that, how the revision moved it, then the ONE direction to the next level. This is the summary the poet reads first — give it room. No rewrite, no preamble.>",
  "tool_tip": {"tool": "Lines"|"Meter"|"Rhyme"|"Echoes"|"Repeats"|"Spell"|"Plans"|"Snapshots", "tip": "<≤12 words: cite the reading, then the one thing to try next.>"}  // OMIT unless a reading genuinely points somewhere
}

DISCIPLINE:
- tool_tip is a footnote, not a finding: cite a reading you were actually given, name one thing to try with it, and stop. It must not restate an issue, a weakness, or a comparison item, and it must never carry the draft's main point. If no reading points anywhere useful, OMIT it.
EXAMPLE tool_tip (good): {"tool": "Repeats", "tip": "\\"and I\\" now opens 4 lines — break the pattern once?"}
- strengths & weaknesses are OVERALL observations about the poem as a whole — patterns, tendencies, how it moves. Do not quote individual lines or pin to specific moments; that belongs in issues[]. (This matches the fresh read exactly, on purpose: the two used to disagree, so a Refine turned the poem-level notes into a second list of line fixes and the panel looked like it had changed its mind about what those sections are for.)
- A strength is a real quality of the poem (its restraint, the consistency of its voice, the way tension builds), NOT a restatement of topic ("important message" → omit).
- issues: 0-3, and prefer the FEWEST that matter — two sharp issues beat three padded ones. Diagnosis only, no rewrite field ever. Prefer single-line. Strong drafts can have zero — never manufacture issues to justify a score.
- NO DOUBLE-COUNTING: anything praised in strengths[] cannot also appear in weaknesses[] or issues[].
- NO SELF-CONTRADICTION. Before returning, read strengths[] against weaknesses[] — and both against comparison{} — as a set. If any two items praise and fault the SAME quality ("the restraint gives it power" beside "it holds too much back"), you have not decided. Pick the reading you actually believe, drop the other. A poem may hold a tension; your feedback may not.
- STRONGEST LINE MUST BE CLEAN: strongest_line cannot fall inside ANY issue's line range. If your best line is also your flagged line, either it isn't the best line or it isn't an issue — resolve it, or OMIT strongest_line.
- CONFIDENCE IS HONESTY, NOT HEDGING: mark an issue "low" when a different good reader could reasonably disagree, "high" when the page leaves no room. Don't mark everything high to sound sure, and don't mark everything low to sound humble.
- REJECTED CALLS: if the poet's rejected list is present, treat those readings as SETTLED — they saw it and said no. Do not re-raise one under a new headline. Raise it again ONLY if the revision made it true in a way it wasn't before, and then say what changed.
- Title and writing focus are CONTEXT, not scoring inputs.

EXAMPLE rationale (good, 24 words): "'Gentle breeze' is the dictionary entry for breeze — received language where a sensation should be. A weather verb would carry real weight." (Flaw, why it weakens THIS line, the kind of move — never the finished line.)`;

interface LocalAnalysis {
  cliches?: Array<{ phrase: string; lineNumber: number }>;
  rhymeScheme?: string[];
  syllablesPerLine?: number[];
  repeatedWords?: Array<{ word: string; count: number }>;
  form?: string;
  toolStats?: ToolStats;
}

interface GoalsContext {
  minLines?: number;
  maxLines?: number;
  minWords?: number;
  maxWords?: number;
  minStanzas?: number;
  maxStanzas?: number;
  maxSyllablesPerLine?: number;
}

function numbered(lines: string[]): string {
  return lines.map((l, i) => `${i + 1}: ${l}`).join("\n");
}

function buildContextHints(lines: string[], local?: LocalAnalysis, goals?: GoalsContext, writingFocus?: string): string {
  const hints: string[] = [];

  if (local?.form && local.form !== "free") {
    const formRules: Record<string, string> = {
      haiku: "Strict: 5-7-5 syllables; one nature image; cutting word/turn between images; no metaphor stacking.",
      sonnet: "14 lines; expect a clear volta around line 8 or 9; consistent meter; coherent rhyme scheme.",
      villanelle: "19 lines; two refrains alternating; pattern A1 b A2 / a b A1 / a b A2 / a b A1 / a b A2 / a b A1 A2.",
    };
    const rule = formRules[local.form];
    hints.push(`Detected form: ${local.form}${rule ? ` — ${rule}` : ""}\nJudge against this form's conventions when relevant.`);
  }

  if (local?.syllablesPerLine && local.syllablesPerLine.length > 0) {
    const syllLines = local.syllablesPerLine
      .map((s, i) => lines[i]?.trim() ? `${i + 1}:${s}` : null)
      .filter((x): x is string => x !== null);
    if (syllLines.length > 0) hints.push(`Syllables per line: ${syllLines.join(" ")}`);
  }

  if (local?.rhymeScheme && local.rhymeScheme.some((s) => s)) {
    const scheme = local.rhymeScheme
      .map((s, i) => (s ? `${i + 1}:${s}` : null))
      .filter((x): x is string => x !== null)
      .join(" ");
    hints.push(`Rhyme scheme: ${scheme}`);
  }

  if (local?.cliches && local.cliches.length > 0) {
    hints.push(`Detected clichés: ${local.cliches.map((c) => `L${c.lineNumber}: "${c.phrase}"`).join("; ")}`);
  }

  if (local?.repeatedWords && local.repeatedWords.length > 0) {
    const top = local.repeatedWords.slice(0, 6);
    hints.push(`Repeated words: ${top.map((r) => `"${r.word}" ×${r.count}`).join(", ")}`);
  }

  if (goals) {
    const goalParts: string[] = [];
    if (goals.minLines) goalParts.push(`min ${goals.minLines} lines`);
    if (goals.maxLines) goalParts.push(`max ${goals.maxLines} lines`);
    if (goals.minWords) goalParts.push(`min ${goals.minWords} words`);
    if (goals.maxWords) goalParts.push(`max ${goals.maxWords} words`);
    if (goals.minStanzas) goalParts.push(`min ${goals.minStanzas} stanzas`);
    if (goals.maxStanzas) goalParts.push(`max ${goals.maxStanzas} stanzas`);
    if (goals.maxSyllablesPerLine) goalParts.push(`max ${goals.maxSyllablesPerLine} syllables/line`);
    if (goalParts.length > 0) hints.push(`Author's constraints: ${goalParts.join(", ")}`);
  }

  if (writingFocus && writingFocus.trim()) {
    hints.push(`Author's writing focus for this revision: ${writingFocus.trim()}`);
  }

  const hintBlock = hints.length > 0 ? `\n\n--- Local analysis context ---\n${hints.join("\n")}` : "";
  return `${hintBlock}${toolStatsBlock(local?.toolStats)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is not configured with an OpenAI API key." });
  }

  const body = req.body as {
    title?: unknown;
    lines?: unknown;
    changesText?: unknown;
    previousScores?: unknown;
    model?: unknown;
    localAnalysis?: unknown;
    goals?: unknown;
    writingFocus?: unknown;
    previousWeaknesses?: unknown;
    previousStrengths?: unknown;
    previousStrongestLine?: unknown;
    previousIssues?: unknown;
    previousMatchedProfile?: unknown;
    previousPillarScores?: unknown;
    rejectedIssues?: unknown;
  };

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return res.status(400).json({ error: "Missing or empty `lines` array." });
  }
  if (typeof body.changesText !== "string" || !body.changesText.trim()) {
    return res.status(400).json({ error: "Missing `changesText` describing the diff from the previous draft." });
  }

  const MAX_LINES = 500;
  if ((body.lines as unknown[]).length > MAX_LINES) {
    return res.status(400).json({ error: `Too many lines (max ${MAX_LINES}).` });
  }

  const title = typeof body.title === "string" ? body.title : "";
  const lines = (body.lines as unknown[]).map((l) => String(l ?? ""));
  const totalChars = lines.reduce((sum, l) => sum + l.length, 0) + title.length;
  if (totalChars > 20_000) {
    return res.status(400).json({ error: "Poem too long (max 20000 characters)." });
  }
  const changesText = (body.changesText as string).slice(0, 8_000);
  const model = typeof body.model === "string" ? body.model : "gpt-5-mini";
  const prevScores = body.previousScores ?? null;
  const local = (body.localAnalysis && typeof body.localAnalysis === "object" ? body.localAnalysis : undefined) as LocalAnalysis | undefined;
  const goals = (body.goals && typeof body.goals === "object" ? body.goals : undefined) as GoalsContext | undefined;
  const writingFocus = typeof body.writingFocus === "string" ? body.writingFocus.slice(0, 500) : undefined;
  const rejectedIssues = parseRejectedIssues(body.rejectedIssues);

  const previousWeaknesses = Array.isArray(body.previousWeaknesses)
    ? (body.previousWeaknesses as unknown[])
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .slice(0, 6)
        .map((s) => s.trim().slice(0, 120))
    : [];

  const previousStrengths = Array.isArray(body.previousStrengths)
    ? (body.previousStrengths as unknown[])
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .slice(0, 4)
        .map((s) => s.trim().slice(0, 120))
    : [];

  const prevStrongestRaw = body.previousStrongestLine as { line?: unknown; why?: unknown } | undefined;
  const previousStrongestLine = prevStrongestRaw && typeof prevStrongestRaw.line === "number"
    ? {
        line: Math.max(1, Math.round(prevStrongestRaw.line)),
        why: typeof prevStrongestRaw.why === "string" ? prevStrongestRaw.why.slice(0, 120) : undefined,
      }
    : null;

  const previousIssues = Array.isArray(body.previousIssues)
    ? (body.previousIssues as unknown[])
        .filter(
          (v): v is { line_start: number; line_end: number; headline?: string } =>
            !!v && typeof v === "object" &&
            typeof (v as { line_start: unknown }).line_start === "number",
        )
        .slice(0, 8)
        .map((iss) => ({
          line_start: Math.max(1, Math.round(iss.line_start)),
          line_end: Math.max(1, Math.round(iss.line_end)),
          headline: typeof iss.headline === "string" ? iss.headline.slice(0, 80) : "",
        }))
    : [];

  const previousMatchedProfile = typeof body.previousMatchedProfile === "string"
    && /^[A-G]$/.test(body.previousMatchedProfile.trim())
      ? body.previousMatchedProfile.trim()
      : null;

  const previousPillarScores = (() => {
    const v = body.previousPillarScores;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const pick = (k: string): number | null => {
      const n = typeof o[k] === "number" ? (o[k] as number) : parseInt(String(o[k]), 10);
      if (!Number.isFinite(n)) return null;
      return Math.max(0, Math.min(25, Math.round(n)));
    };
    const chord = pick("chord"); const craft = pick("craft");
    const spark = pick("spark"); const echo = pick("echo");
    if (chord === null || craft === null || spark === null || echo === null) return null;
    return { chord, craft, spark, echo };
  })();

  // Rate limit and cache lookup are independent KV reads — issued together to
  // take a round trip off the front of every refine. Same ordering guarantees
  // as analyze: both resolve before any spend, and the cache check stays BEFORE
  // precheckSpend so cache hits don't burn the per-IP cooldown. compare is
  // deterministic on its inputs.
  const cacheKey = compareCacheKey({
    title, lines, changesText, previousScores: prevScores, previousWeaknesses, previousStrengths, previousStrongestLine,
    previousIssues, model, localAnalysis: local, goals, writingFocus,
    previousMatchedProfile, previousPillarScores, rejectedIssues,
  });
  const [rateOk, cachedRaw] = await Promise.all([
    checkRateLimit(req.headers["x-forwarded-for"]),
    kvGetString(cacheKey),
  ]);

  if (!rateOk) {
    const retryAfterSec = await getRateLimitRetrySec(req.headers["x-forwarded-for"]);
    if (retryAfterSec > 0) res.setHeader("Retry-After", String(retryAfterSec));
    return res.status(429).json({
      error: "Too many requests — please wait a moment before analyzing again.",
      retryAfterSec,
    });
  }

  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as CachedCompareEntry;
      if (cached?.content && cached?.model) {
        sendParsedResponse(res, cached.content, cached.model);
        return;
      }
    } catch {
      // Corrupted entry — fall through and regenerate.
    }
  }

  const gib = await gibberishGuard({
    rawIp: req.headers["x-forwarded-for"],
    text: `${title}\n${lines.join("\n")}\n${changesText}`,
    apiKey,
  });
  if (!gib.ok) {
    if (gib.retryAfterSec) res.setHeader("Retry-After", String(gib.retryAfterSec));
    return res.status(gib.status).json(gib.body);
  }

  const spend = await precheckSpend({
    rawIp: req.headers["x-forwarded-for"],
    endpoint: "compare",
    cooldownMs: cooldownFor("compare", model),
  });
  if (!spend.ok) {
    if (spend.retryAfterSec) res.setHeader("Retry-After", String(spend.retryAfterSec));
    return res.status(spend.status).json(spend.body);
  }

  const titlePart = title.trim() ? `Title: ${title.trim()}\n\n` : "";

  // Prior anchors. The prior overall_score is the ANCHOR the new read moves
  // from; the prior matched_profile and pillar_scores prevent the two biggest
  // sources of score jumpiness (profile swaps and per-pillar re-rolls).
  let priorAnchor = "";
  const priorOverall = prevScores && typeof prevScores === "object"
    && typeof (prevScores as { overall_score?: unknown }).overall_score === "number"
      ? (prevScores as { overall_score: number }).overall_score
      : null;
  if (priorOverall !== null) {
    priorAnchor += `\nPrior overall_score: ${priorOverall}. New score moves FROM here, driven by NEW evidence in the diff (see RE-SCORING A REVISION — small revision → ≤3 pts; sharper move → 1-2 pts on one pillar; substantively new strength → up to 5-6 pts).`;
  }
  void previousMatchedProfile; // A-G profiles retired; kept in the cache key only for backward continuity.
  if (previousPillarScores) {
    const p = previousPillarScores;
    priorAnchor += `\nPrior pillar_scores: {chord: ${p.chord}, craft: ${p.craft}, spark: ${p.spark}, echo: ${p.echo}}. Per-pillar continuity: each new pillar score moves only by EVIDENCE of change for that pillar in the diff. If nothing changed for a pillar, it stays.`;
  }

  let prevFlagged = "";
  if (previousWeaknesses.length > 0 || previousIssues.length > 0
    || previousStrengths.length > 0 || previousStrongestLine) {
    const sections: string[] = ["Context from the prior reading (already priced into past pillar scores — surface in comparison{} but treat as CARRY-OVER per SCORE CONTINUITY rules, not as fresh evidence that drops pillar scores):"];
    // What the last read PRAISED travels with what it faulted. Without it the
    // re-read has no record of its own verdict, and reversing one silently is
    // the single thing that most undermines a poet's trust in the score: a line
    // called the best in the poem, then called senseless, with the line itself
    // untouched in between.
    if (previousStrengths.length > 0) {
      sections.push(`Past strengths: ${previousStrengths.map((s) => `"${s}"`).join("; ")}`);
    }
    if (previousStrongestLine) {
      sections.push(`Past strongest line: L${previousStrongestLine.line}${previousStrongestLine.why ? ` — "${previousStrongestLine.why}"` : ""}`);
    }
    if (previousWeaknesses.length > 0) {
      sections.push(`Past weaknesses: ${previousWeaknesses.map((w) => `"${w}"`).join("; ")}`);
    }
    if (previousIssues.length > 0) {
      sections.push("Past issues:");
      for (const iss of previousIssues) {
        const range = iss.line_start === iss.line_end ? `L${iss.line_start}` : `L${iss.line_start}–${iss.line_end}`;
        sections.push(`  - ${range}: ${iss.headline || "(no headline)"}`);
      }
    }
    sections.push("If addressed → list under comparison.improvements. If still present → optionally raise in issues[] for the writer's attention, but as a carry-over (does NOT lower pillar scores below where a blind rubric read would land them). If a past issue was a borderline taste call, omit it now — don't re-flag low-confidence misses across revisions.");
    sections.push("DO NOT REVERSE A PAST CALL ON UNCHANGED TEXT. If the diff did not touch what was praised, it stays praised — you may find it less remarkable than the rest of the revision, but you may not now call it confused, senseless, or a flaw. The same holds the other way: a line faulted last time and left untouched has not fixed itself. Reverse a verdict ONLY when the revision changed that line or its surroundings, and when you do, say what changed in comparison{}. Reversals with nothing behind them are what make a re-read look arbitrary.");
    prevFlagged = "\n" + sections.join("\n") + "\n";
  }
  const contextBlock = buildContextHints(lines, local, goals, writingFocus);

  // Order matters: poem FIRST so scoring happens against the rubric, then the
  // comparison context.
  const comparisonContext = prevFlagged || priorAnchor
    ? `\n\n=== Comparison context (pillar_scores follow the RE-SCORING RULES in the system prompt — anchored to the prior read, moved by new evidence in the diff) ===${priorAnchor}${prevFlagged}`
    : "";

  // The poet's own rejections sit last, right before the model answers — this
  // is their judgement, not a measurement, and it outranks the context above it.
  const rejectedBlock = rejectedIssuesBlock(
    rejectedIssues,
    "=== Already rejected by this poet (settled — see REJECTED CALLS) ===",
  );

  const userMessage = `${titlePart}=== CURRENT VERSION ===\n${numbered(lines)}${contextBlock}\n\n=== CHANGES from previous draft (line numbers refer to the CURRENT draft above) ===\n${changesText}${comparisonContext}${rejectedBlock}`;

  // Streaming path, same shape as analyze: bytes flow out as OpenAI emits them
  // rather than making the poet watch a spinner for the whole call. Refine is
  // the slower of the two endpoints, so it needs this more.
  // Body: <model JSON content>${STREAM_META_SEPARATOR}<meta JSON>
  let headersSent = false;
  const result = await streamOpenAI(
    apiKey,
    {
      model,
      messages: [
        { role: "system", content: BASE_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 5000,
      // Medium reasoning kept intentionally — scoring quality depends on it.
      // Keep the token ceiling generous: max_completion_tokens caps reasoning +
      // output combined, so a low ceiling truncates long poems mid-JSON.
      reasoningEffort: "medium",
      timeoutMs: 90_000,
    },
    res,
    (delta) => {
      if (!headersSent) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("X-Accel-Buffering", "no");
        res.status(200);
        headersSent = true;
      }
      res.write(delta);
    },
  );
  if (!result) {
    // Pre-stream errors already wrote a JSON error to res. Mid-stream failures
    // returned null after headers — close the connection so the client throws.
    if (headersSent) res.end();
    return;
  }

  await recordSpend(spend.ip, result.model, result.usage, "compare");
  // Store raw OpenAI content + resolved model so future identical inputs skip
  // the call. Best-effort; failure here must not break the response.
  void kvSetStringPx(
    cacheKey,
    JSON.stringify({ content: result.content, model: result.model } satisfies CachedCompareEntry),
    COMPARE_CACHE_MS,
  ).catch(() => {});

  res.write(STREAM_META_SEPARATOR + JSON.stringify({
    model: result.model,
    analyzedAt: new Date().toISOString(),
  }));
  res.end();
}
