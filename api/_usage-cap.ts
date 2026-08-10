/**
 * Spend caps for Vercel serverless functions.
 *
 * Three layers:
 *   1. Per-IP, per-calendar-month cap (default $2.00).
 *   2. Global, per-UTC-day cap (default $5.00) — kill switch for the whole app.
 *   3. Per-IP, per-endpoint cooldown (5 s default, 60 s for heavy analysis).
 *
 * State lives in Vercel KV when configured, falling back to a process-local
 * Map in local dev. With KV enabled the counters are durable across cold
 * starts and shared across all concurrent warm containers.
 */

import { kvGetNumber, kvIncrBy, kvIsRemote, kvSetPxIfAbsent } from "./_kv";

/**
 * SPEND IS TRACKED IN TENTHS OF A CENT.
 *
 * Whole cents were too coarse to bill honestly. A single analyse costs roughly
 * $0.003, and the old `Math.max(1, ceil(cents))` floor charged every one of them
 * a full cent — so the caps below bit at about a third of the money they name.
 * At tenths, the smallest possible charge (0.1c) is under a typical call, and a
 * cap that says $5.00 means $5.00 of real spend.
 */
const TENTHS_PER_CENT = 10;
const TENTHS_PER_DOLLAR = 100 * TENTHS_PER_CENT;

/** $5.00 per IP per calendar month. */
const PER_IP_MONTHLY_CAP_TENTHS = 5 * TENTHS_PER_DOLLAR;
/** $5.00 across all users per UTC day — the kill switch on the whole app. */
const GLOBAL_DAILY_CAP_TENTHS = 5 * TENTHS_PER_DOLLAR;

const DEFAULT_COOLDOWN_MS = 5_000;
// Cooldown is a soft anti-spam backstop. Cache hits skip this gate entirely
// because the cache lookup in analyze.ts runs before precheckSpend.
const ANALYZE_COOLDOWN_BY_MODEL_MS: Record<string, number> = {
  "gpt-5-nano": 60_000,
  "gpt-5-mini": 120_000,
};
const ANALYZE_COOLDOWN_FALLBACK_MS = 120_000;

interface ModelPrice {
  inCentsPerMTok: number;
  /** Prompt tokens served from OpenAI's automatic cache — a tenth of the fresh
   *  input rate. The static rubric hits this on nearly every analyse. */
  cachedInCentsPerMTok: number;
  outCentsPerMTok: number;
}
const MODEL_PRICING: Record<string, ModelPrice> = {
  "gpt-5-nano": { inCentsPerMTok: 5, cachedInCentsPerMTok: 0.5, outCentsPerMTok: 40 },
  "gpt-5-mini": { inCentsPerMTok: 25, cachedInCentsPerMTok: 2.5, outCentsPerMTok: 200 },
};
const FALLBACK_PRICE: ModelPrice = MODEL_PRICING["gpt-5-mini"]!;

function priceFor(model: string): ModelPrice {
  if (MODEL_PRICING[model]) return MODEL_PRICING[model]!;
  for (const key of Object.keys(MODEL_PRICING)) {
    if (model.startsWith(key)) return MODEL_PRICING[key]!;
  }
  return FALLBACK_PRICE;
}

/** What a call actually consumed. `cachedPromptTokens` is a SUBSET of
 *  `promptTokens` (OpenAI reports it that way), so it is netted off rather than
 *  added. `reasoningTokens` is already inside `completionTokens` — carried here
 *  only so it can be logged. */
export interface SpendUsage {
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens?: number;
  reasoningTokens?: number;
}

/** Cost in tenths of a cent, rounded up, minimum 1 (0.1c). */
export function estimateCostTenths(model: string, usage: SpendUsage): number {
  const p = priceFor(model);
  const cached = Math.min(Math.max(usage.cachedPromptTokens ?? 0, 0), usage.promptTokens);
  const fresh = usage.promptTokens - cached;
  const cents =
    (fresh * p.inCentsPerMTok) / 1_000_000 +
    (cached * p.cachedInCentsPerMTok) / 1_000_000 +
    (usage.completionTokens * p.outCentsPerMTok) / 1_000_000;
  return Math.max(1, Math.ceil(cents * TENTHS_PER_CENT));
}

export function tenthsToUsd(tenths: number): string {
  return `$${(tenths / TENTHS_PER_DOLLAR).toFixed(4)}`;
}

function normalizeIp(rawIp: string | string[] | undefined): string {
  if (!rawIp) return "";
  return Array.isArray(rawIp) ? rawIp[0]! : rawIp.split(",")[0]!.trim();
}

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dayKey(d = new Date()): string {
  return `${monthKey(d)}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// The `t` segment marks counters denominated in TENTHS of a cent. It is a
// deliberate key break from the old whole-cent buckets: reusing those keys would
// read a $2.00 balance as $0.20 and hand every current user a 10x refund.
function globalDayKvKey(day: string): string {
  return `spend:t:global:${day}`;
}

function ipMonthKvKey(ip: string, month: string): string {
  return `spend:t:ip:${ip}:${month}`;
}

function cooldownKvKey(ip: string, endpoint: string): string {
  return `cooldown:${ip}:${endpoint}`;
}

export interface PrecheckResult {
  ok: boolean;
  ip: string;
  status: number;
  retryAfterSec: number;
  body: { error: string; retryAfterSec?: number; reason: string } | null;
}

export interface PrecheckOpts {
  rawIp: string | string[] | undefined;
  endpoint: string;
  cooldownMs?: number;
  /** Optional sub-key appended to the cooldown bucket. Use it to scope the
   *  cooldown to a specific input (e.g. a poem hash) so the same IP analyzing
   *  *different* inputs doesn't share a single lockout window. When omitted
   *  the cooldown is per-IP per-endpoint (legacy behavior). */
  cooldownScope?: string;
}

function block(
  status: number,
  reason: string,
  error: string,
  retryAfterSec: number,
): PrecheckResult {
  return {
    ok: false,
    ip: "",
    status,
    retryAfterSec,
    body:
      retryAfterSec > 0
        ? { error, retryAfterSec, reason }
        : { error, reason },
  };
}

export async function precheckSpend(
  opts: PrecheckOpts,
): Promise<PrecheckResult> {
  if (process.env.OPENAI_DISABLED === "true") {
    return block(503, "kill-switch", "AI features are temporarily disabled.", 0);
  }

  try {
    // Global daily kill switch runs unconditionally, before the per-IP checks
    // below — it's the last line of defense against a runaway bill from any
    // source, so it must never be skippable by an absent/unparseable IP.
    const day = dayKey();
    const globalTenths = await kvGetNumber(globalDayKvKey(day));
    if (globalTenths >= GLOBAL_DAILY_CAP_TENTHS) {
      return block(
        503,
        "global-daily-cap",
        "Daily AI budget reached for this service. Try again tomorrow.",
        secondsUntilNextUtcMidnight(),
      );
    }

    const ip = normalizeIp(opts.rawIp);
    if (!ip) {
      // Can't apply per-IP caps/cooldown without an identifiable caller. In
      // local dev (no KV configured) x-forwarded-for is often absent — allow
      // through. In production this should never happen; if it ever does,
      // fail closed rather than grant an anonymous caller unlimited spend.
      return kvIsRemote()
        ? block(403, "no-ip", "Unable to identify request origin.", 0)
        : { ok: true, ip: "", status: 200, retryAfterSec: 0, body: null };
    }

    const month = monthKey();
    const ipTenths = await kvGetNumber(ipMonthKvKey(ip, month));
    if (ipTenths >= PER_IP_MONTHLY_CAP_TENTHS) {
      return block(
        402,
        "user-monthly-cap",
        "Monthly AI usage limit reached. Resets next month.",
        secondsUntilNextUtcMonth(),
      );
    }

    const cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    const cooldownEndpoint = opts.cooldownScope
      ? `${opts.endpoint}:${opts.cooldownScope}`
      : opts.endpoint;
    const installed = await kvSetPxIfAbsent(
      cooldownKvKey(ip, cooldownEndpoint),
      Date.now() + cooldownMs,
      cooldownMs,
    );
    if (!installed) {
      return block(
        429,
        "cooldown",
        `Please wait a moment before retrying this action.`,
        Math.ceil(cooldownMs / 1000),
      );
    }

    return { ok: true, ip, status: 200, retryAfterSec: 0, body: null };
  } catch {
    // KV outage: fail closed. A blip in the spend-cap store is not a reason
    // to let cost-incurring requests through unmetered.
    return block(503, "kv-error", "Temporarily unavailable. Please try again shortly.", 0);
  }
}

export function cooldownFor(endpoint: string, model?: string): number {
  if (endpoint === "analyze" || endpoint === "compare") {
    if (!model) return ANALYZE_COOLDOWN_FALLBACK_MS;
    if (ANALYZE_COOLDOWN_BY_MODEL_MS[model] != null) {
      return ANALYZE_COOLDOWN_BY_MODEL_MS[model]!;
    }
    for (const key of Object.keys(ANALYZE_COOLDOWN_BY_MODEL_MS)) {
      if (model.startsWith(key)) return ANALYZE_COOLDOWN_BY_MODEL_MS[key]!;
    }
    return ANALYZE_COOLDOWN_FALLBACK_MS;
  }
  return DEFAULT_COOLDOWN_MS;
}

/**
 * Records spend against the global/per-IP counters. By the time this runs the
 * OpenAI call has already succeeded and been paid for, so a bookkeeping
 * failure here (e.g. a KV blip) must never take down the response — every
 * call site awaits this without using the return value, so we swallow errors
 * internally rather than let them propagate and crash an already-earned reply.
 */
export async function recordSpend(
  ip: string,
  model: string,
  usage: SpendUsage,
  endpoint = "?",
): Promise<{ ipTenths: number; globalTenths: number; costTenths: number }> {
  const costTenths = estimateCostTenths(model, usage);

  // One line per paid call: where the money went, and how much of the prompt
  // the cache absorbed. Without this the two biggest levers — reasoning tokens
  // and cache hit rate — are invisible.
  const cached = usage.cachedPromptTokens ?? 0;
  const cacheHitPct = usage.promptTokens > 0
    ? Math.round((cached / usage.promptTokens) * 100)
    : 0;
  console.log(
    `[spend] ${endpoint} ${model} ${tenthsToUsd(costTenths)} — in ${usage.promptTokens} (${cacheHitPct}% cached), out ${usage.completionTokens} (reasoning ${usage.reasoningTokens ?? 0})`,
  );

  try {
    const day = dayKey();
    const newGlobal = await kvIncrBy(
      globalDayKvKey(day),
      costTenths,
      secondsUntilNextUtcMidnight() * 1000,
    );

    let newIp = 0;
    if (ip) {
      const month = monthKey();
      newIp = await kvIncrBy(
        ipMonthKvKey(ip, month),
        costTenths,
        secondsUntilNextUtcMonth() * 1000,
      );
    }
    return { ipTenths: newIp, globalTenths: newGlobal, costTenths };
  } catch {
    return { ipTenths: 0, globalTenths: 0, costTenths };
  }
}

export function getCaps() {
  return {
    perIpMonthlyCapUsd: PER_IP_MONTHLY_CAP_TENTHS / TENTHS_PER_DOLLAR,
    globalDailyCapUsd: GLOBAL_DAILY_CAP_TENTHS / TENTHS_PER_DOLLAR,
  };
}

function secondsUntilNextUtcMidnight(): number {
  const now = new Date();
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.ceil((next - now.getTime()) / 1000);
}

function secondsUntilNextUtcMonth(): number {
  const now = new Date();
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1,
    0,
    0,
    0,
    0,
  );
  return Math.ceil((next - now.getTime()) / 1000);
}
