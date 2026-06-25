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
   *  Override via AI_MODEL env var without a redeploy. */
  model: process.env.AI_MODEL || "claude-sonnet-4-20250514",


  /** Web search tool definition — version-stamped by Anthropic. Update
   *  here when they release a new version. */
  webSearchTool: {
    type: "web_search_20250305" as const,
    name: "web_search" as const,
  },

  /** Token pricing in USD — used for cost tracking in the admin dashboard.
   *  Update when Anthropic changes rates. */
  pricing: {
    inputPerToken:  3 / 1_000_000,   // $3 / MTok (Sonnet 4)
    outputPerToken: 15 / 1_000_000,  // $15 / MTok (Sonnet 4)
    perWebSearch:   0.01,            // $10 / 1,000 searches
  },
} as const;
