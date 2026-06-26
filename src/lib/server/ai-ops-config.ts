/**
 * AI operations config — admin-tunable model and sentinel sweep interval.
 *
 * Persisted to SystemConfig (production) via config-store; falls back to
 * env vars → code defaults without a DB (local dev / tests).
 *
 * Changes take effect on the NEXT sentinel sweep or AI call — no redeploy.
 */
import { loadConfig, saveConfig } from "./config-store";
import { hasDatabase } from "./prisma";

// ---------------------------------------------------------------------------
// Types + defaults
// ---------------------------------------------------------------------------

export type AiOpsConfig = {
  /** Primary Claude model for poll generation + sentinel deep checks. */
  model: string;
  /** Sentinel sweep interval in milliseconds. */
  sentinelIntervalMs: number;
};

const DEFAULT_MODEL = process.env.AI_MODEL || "claude-sonnet-4-6";
const DEFAULT_INTERVAL_MS = parseInt(
  process.env.SENTINEL_INTERVAL_MS || String(4 * 60 * 60_000),
  10,
);

/** Models the admin can choose. Only production-grade IDs that actually work
 *  with the Anthropic API — no experimental/preview/deprecated. */
export const AVAILABLE_MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", cost: "$1 / $5 per MTok", tier: "Fast & cheap" },
  { id: "claude-sonnet-4-6",         label: "Sonnet 4.6", cost: "$3 / $15 per MTok", tier: "Balanced (default)" },
  { id: "claude-opus-4-6",           label: "Opus 4.6",   cost: "$5 / $25 per MTok", tier: "Most capable" },
] as const;

export const INTERVAL_OPTIONS = [
  { ms: 15 * 60_000,      label: "Every 15 minutes" },
  { ms: 30 * 60_000,      label: "Every 30 minutes" },
  { ms: 60 * 60_000,      label: "Every 1 hour" },
  { ms: 2 * 60 * 60_000,  label: "Every 2 hours" },
  { ms: 4 * 60 * 60_000,  label: "Every 4 hours" },
  { ms: 6 * 60 * 60_000,  label: "Every 6 hours" },
  { ms: 12 * 60 * 60_000, label: "Every 12 hours" },
] as const;

// ---------------------------------------------------------------------------
// Storage (same pattern as ai-usage.ts CreditConfig)
// ---------------------------------------------------------------------------

const CONFIG_KEY = "ai_ops_config";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AI_OPS: AiOpsConfig | undefined;
}

async function load(): Promise<AiOpsConfig | null> {
  if (!hasDatabase()) return globalThis.__50PICK_AI_OPS ?? null;
  return await loadConfig<AiOpsConfig>(CONFIG_KEY);
}

async function save(c: AiOpsConfig): Promise<void> {
  if (!hasDatabase()) { globalThis.__50PICK_AI_OPS = c; return; }
  await saveConfig(CONFIG_KEY, c);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getAiOpsConfig(): Promise<AiOpsConfig> {
  const c = await load();
  if (c && typeof c.model === "string" && typeof c.sentinelIntervalMs === "number") {
    return {
      model: AVAILABLE_MODELS.some((m) => m.id === c.model) ? c.model : DEFAULT_MODEL,
      sentinelIntervalMs: INTERVAL_OPTIONS.some((o) => o.ms === c.sentinelIntervalMs)
        ? c.sentinelIntervalMs
        : DEFAULT_INTERVAL_MS,
    };
  }
  const fresh: AiOpsConfig = { model: DEFAULT_MODEL, sentinelIntervalMs: DEFAULT_INTERVAL_MS };
  await save(fresh);
  return fresh;
}

export async function setAiModel(model: string): Promise<void> {
  if (!AVAILABLE_MODELS.some((m) => m.id === model)) {
    throw new Error(`Invalid model: ${model}`);
  }
  const cur = await getAiOpsConfig();
  await save({ ...cur, model });
}

export async function setSentinelInterval(intervalMs: number): Promise<void> {
  if (!INTERVAL_OPTIONS.some((o) => o.ms === intervalMs)) {
    throw new Error(`Invalid interval: ${intervalMs}`);
  }
  const cur = await getAiOpsConfig();
  await save({ ...cur, sentinelIntervalMs: intervalMs });
}
