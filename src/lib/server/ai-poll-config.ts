/**
 * AI poll generation — operator-controllable configuration.
 *
 * Every knob the operator needs to control poll volume, accuracy strictness,
 * and cost lives here. Defaults come from env vars (so Railway can set them
 * without a deploy), and the admin UI can override them live at runtime.
 *
 * Persisted on globalThis so it survives Next.js HMR + module re-evaluation
 * within a single server process (same pattern as the rate-limit buckets and
 * the AI-poll store). It is intentionally NOT snapshotted to Postgres — these
 * are operator preferences, cheap to re-set, and env vars give a safe default
 * on every cold start.
 */

import { audit } from "./audit";

export type AIPollConfig = {
  /** Ground every generation in live web search (real events + real source
   *  URLs). Off = the model answers from its training cutoff only. */
  webSearchEnabled: boolean;
  /** Target number of NEW polls to publish per day. Purely a guide for the
   *  operator + the "batch to target" button — generation is never automatic.
   *  Range 0..1_000_000 — set it to whatever cadence you want. */
  dailyTarget: number;
  /** A generated poll must resolve at least this many hours in the future.
   *  Kills "resolves in 1 hour" polls that are useless to bet on. */
  minLeadTimeHours: number;
  /** A generated poll must resolve within this many days. Long-dated polls
   *  tie up liquidity and are hard to keep accurate. */
  maxLeadTimeDays: number;
  /** Minimum model self-confidence (0..100) for a poll to reach review.
   *  Higher = stricter / fewer but cleaner polls. */
  minConfidence: number;
  /** Hard ceiling on how many polls a single batch request may generate.
   *  Protects against an accidental 100k-in-one-click token burn / timeout.
   *  Daily target can be larger; you just run multiple batches. */
  maxBatchPerRun: number;
};

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function defaults(): AIPollConfig {
  return {
    // User decision (June 2026): web search ON, toggleable. Env can flip it.
    webSearchEnabled: process.env.AI_POLL_WEB_SEARCH
      ? process.env.AI_POLL_WEB_SEARCH !== "false"
      : true,
    dailyTarget: envInt("AI_POLL_DAILY_TARGET", 3, 0, 1_000_000),
    minLeadTimeHours: envInt("AI_POLL_MIN_LEAD_HOURS", 24, 1, 24 * 365),
    maxLeadTimeDays: envInt("AI_POLL_MAX_LEAD_DAYS", 180, 1, 365 * 3),
    minConfidence: envInt("AI_POLL_MIN_CONFIDENCE", 60, 0, 100),
    maxBatchPerRun: envInt("AI_POLL_MAX_BATCH", 25, 1, 200),
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AIPOLL_CONFIG: AIPollConfig | undefined;
}

function store(): AIPollConfig {
  return (globalThis.__50PICK_AIPOLL_CONFIG ??= defaults());
}

export function getAIPollConfig(): AIPollConfig {
  return { ...store() };
}

/** Patch one or more config fields. Values are clamped to safe ranges so the
 *  admin UI (or a malformed form post) can never push an out-of-bounds knob. */
export function updateAIPollConfig(
  patch: Partial<AIPollConfig>,
  actorId: string,
): AIPollConfig {
  const cur = store();
  if (patch.webSearchEnabled !== undefined) cur.webSearchEnabled = !!patch.webSearchEnabled;
  if (patch.dailyTarget !== undefined)
    cur.dailyTarget = clampInt(patch.dailyTarget, 0, 1_000_000, cur.dailyTarget);
  if (patch.minLeadTimeHours !== undefined)
    cur.minLeadTimeHours = clampInt(patch.minLeadTimeHours, 1, 24 * 365, cur.minLeadTimeHours);
  if (patch.maxLeadTimeDays !== undefined)
    cur.maxLeadTimeDays = clampInt(patch.maxLeadTimeDays, 1, 365 * 3, cur.maxLeadTimeDays);
  if (patch.minConfidence !== undefined)
    cur.minConfidence = clampInt(patch.minConfidence, 0, 100, cur.minConfidence);
  if (patch.maxBatchPerRun !== undefined)
    cur.maxBatchPerRun = clampInt(patch.maxBatchPerRun, 1, 200, cur.maxBatchPerRun);

  audit({
    category: "ADMIN",
    action: "aipoll.config_updated",
    actorId,
    targetType: "AIPollConfig",
    targetId: "singleton",
    payload: { ...cur },
  });
  return { ...cur };
}

function clampInt(v: number, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
