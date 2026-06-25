/**
 * Centralized AI configuration — single source of truth for all AI models,
 * pricing, and capabilities used across the platform.
 *
 * When Anthropic releases a new model:
 *   1. Update DEFAULT_MODEL below (or set AI_MODEL env var on Railway)
 *   2. Update PRICING if rates change
 *   3. Everything else adapts automatically
 *
 * No model IDs should be hardcoded anywhere else in the codebase.
 * Import from here: `import { ai } from "@/lib/server/ai-config";`
 */

export const ai = {
  /** The primary model used for poll generation and sentinel monitoring.
   *  Override via AI_MODEL env var without a redeploy.
   *  2026-06-26 (Ali): set to Haiku for both poll generation and the sentinel
   *  to cut cost (Haiku $1/$5 vs Sonnet $3/$15 per MTok). Bump back to
   *  "claude-sonnet-4-6" (or set AI_MODEL on Railway) for sharper reasoning on
   *  tricky cumulative/threshold polls. */
  model: process.env.AI_MODEL || "claude-haiku-4-5",


  /** Web search tool definition — version-stamped by Anthropic. Update
   *  here when they release a new version. */
  webSearchTool: {
    type: "web_search_20250305" as const,
    name: "web_search" as const,
  },

  /** Token pricing in USD — used for cost tracking in the admin dashboard.
   *  Keep in sync with `model` above. */
  pricing: {
    inputPerToken:  1 / 1_000_000,   // $1 / MTok (Haiku 4.5)
    outputPerToken: 5 / 1_000_000,   // $5 / MTok (Haiku 4.5)
    perWebSearch:   0.01,            // $10 / 1,000 searches
  },
} as const;
