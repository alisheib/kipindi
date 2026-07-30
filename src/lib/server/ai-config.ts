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
  /** The primary model used for poll generation and sentinel deep checks.
   *  Override via AI_MODEL env var without a redeploy.
   *  Sonnet 4.6 — sharper reasoning on tricky cumulative/threshold polls.
   *  NOTE: This is the static default. Use getConfiguredModel() for the
   *  live admin-tunable value (reads from config-store). */
  model: process.env.AI_MODEL || "claude-sonnet-4-6",

  /** The triage model used for sentinel quick scans (no web search).
   *  Haiku 4.5 — cheap enough to run every 4h across all live markets.
   *  Override via SENTINEL_TRIAGE_MODEL env var. */
  triageModel: process.env.SENTINEL_TRIAGE_MODEL || "claude-haiku-4-5-20251001",

  /** Web search tool definition — version-stamped by Anthropic. Update
   *  here when they release a new version. */
  webSearchTool: {
    type: "web_search_20250305" as const,
    name: "web_search" as const,
  },

  /**
   * Web FETCH tool — retrieves a named URL directly, rather than searching for it.
   *
   * ⛔ WHY THIS EXISTS, AND WHY THE ORACLE NEEDS IT (2026-07-30). Up & Down ran for six
   * days and never confirmed a single price. The refusals were not the model failing —
   * they were `web_search` doing what it does: returning CRAWL-INDEX SNIPPETS. Probing
   * seven candidate gold pages through the real oracle prompt showed the pattern:
   * kitco/investing returned a price with NO timestamp; tradingeconomics and Yahoo
   * returned a price WITH a timestamp that was 37,575s and 44,736s old — 10 and 12 hours.
   * A 90-second staleness window can never be met from a search index, on ANY page.
   *
   * `web_fetch` reads the live page instead, so the quote and its timestamp are current.
   * `allowed_domains` is enforced SERVER-SIDE, which makes it a real containment boundary
   * rather than the after-the-fact check GATE 2 performs on what the model claims it read.
   *
   * ⚠️ It only fetches URLs ALREADY PRESENT in the conversation — the oracle names the
   * approved page in its user prompt, which satisfies that.
   */
  webFetchTool: {
    type: "web_fetch_20260209" as const,
    name: "web_fetch" as const,
  },

  /** Token pricing in USD — used for cost tracking in the admin dashboard.
   *  Keep in sync with `model` above. */
  pricing: {
    inputPerToken:  3 / 1_000_000,   // $3 / MTok (Sonnet 4.6)
    outputPerToken: 15 / 1_000_000,  // $15 / MTok (Sonnet 4.6)
    perWebSearch:   0.01,            // $10 / 1,000 searches
  },
} as const;

/** Return the live admin-configured model (config-store → env → default).
 *  Async because it reads from the DB on first call; cached in-process. */
export async function getConfiguredModel(): Promise<string> {
  try {
    const { getAiOpsConfig } = await import("./ai-ops-config");
    const ops = await getAiOpsConfig();
    return ops.model;
  } catch {
    return ai.model;
  }
}
