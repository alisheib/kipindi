/**
 * AI operations config — the admin-tunable Claude model for poll generation and
 * the per-market sentinel resolution check.
 *
 * Persisted to SystemConfig (production) via config-store; falls back to env vars →
 * code defaults without a DB (local dev / tests). Changes take effect on the NEXT
 * AI call — no redeploy.
 *
 * HISTORY: this also carried `sentinelIntervalMs` — the cadence of the global
 * sentinel SWEEP. That sweep is gone (markets are now checked exactly at their own
 * resolve time by the per-market scheduler), so the interval concept, its
 * INTERVAL_OPTIONS and setSentinelInterval, went with it. Only the model remains.
 */
import { loadConfig, saveConfig } from "./config-store";
import { hasDatabase } from "./prisma";

// ---------------------------------------------------------------------------
// Types + defaults
// ---------------------------------------------------------------------------

export type AiOpsConfig = {
  /** Primary Claude model for poll generation + sentinel resolution checks. */
  model: string;
};

const DEFAULT_MODEL = process.env.AI_MODEL || "claude-sonnet-4-6";

/** Models the admin can choose. Only production-grade IDs that actually work
 *  with the Anthropic API — no experimental/preview/deprecated. */
export const AVAILABLE_MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", cost: "$1 / $5 per MTok", tier: "Fast & cheap" },
  { id: "claude-sonnet-4-6",         label: "Sonnet 4.6", cost: "$3 / $15 per MTok", tier: "Balanced (default)" },
  { id: "claude-opus-4-6",           label: "Opus 4.6",   cost: "$5 / $25 per MTok", tier: "Most capable" },
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
  if (c && typeof c.model === "string") {
    return { model: AVAILABLE_MODELS.some((m) => m.id === c.model) ? c.model : DEFAULT_MODEL };
  }
  const fresh: AiOpsConfig = { model: DEFAULT_MODEL };
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
