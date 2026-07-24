/**
 * Market Sentinel — the per-market AI resolution check.
 *
 * Given ONE market, the sentinel web-searches the latest real-world data and
 * reports whether the YES/NO outcome is already IRREVERSIBLY SETTLED, with a
 * confidence score, an evidence excerpt and a source URL. It DECIDES nothing and
 * MOVES no money — it returns an assessment.
 *
 * Who calls it, and what they do with the answer:
 *   • The per-market RESOLVE TRIGGER (resolveDueMarket in market-service.ts) fires
 *     exactly at a market's resolutionAt(+offset). It runs this check, then either
 *     alerts officers with the recommendation (human mode) or — when the operator
 *     has enabled "auto" and the confidence clears the threshold — seals + settles.
 *   • The resolver queue's "Re-check this market now" button (one market at a time).
 *
 * HISTORY: this module used to run a global, self-rescheduling 4-hour SWEEP over
 * every LIVE market (Haiku triage → Sonnet deep check → auto-close), with a
 * persisted "sentinel.schedule" countdown, a pause/resume switch and an admin
 * interval dial. That whole loop was replaced by the per-market scheduler
 * (market-scheduler.ts): each market is checked exactly at its own resolve time
 * instead of being polled on a fixed cadence. The triage tier existed only to make
 * a poll-everything sweep affordable; a targeted per-market check has nothing to
 * triage, so it is gone too. Only the deep check — the part that was ever the point
 * — remains.
 *
 * Safety:
 *   - Returns an assessment only; the caller does the write under the market lock.
 *   - Uses web search — never answers from memory.
 *   - Every call is metered through recordAiUsage.
 *   - Singleton Anthropic client (no resource leak).
 */

import Anthropic from "@anthropic-ai/sdk";
import { marketStore } from "./market-dal";
import { ai } from "./ai-config";
import { recordAiUsage } from "./ai-usage";
import { getAiOpsConfig } from "./ai-ops-config";
import { getPlatformTimezone } from "./platform-config";
import { loadConfig, saveConfig } from "./config-store";
import { audit } from "./audit";
import type { StoredMarket } from "./market-service";

// --- Configuration -----------------------------------------------------------

// Env-var default (overridden at runtime by the admin-tunable ai-ops model).
const ENV_SENTINEL_MODEL = process.env.SENTINEL_MODEL || ai.model;
/** The confidence at/above which an assessment is treated as authoritative. The
 *  resolve trigger keys AUTO-resolve off RateConfig.resolveConfidenceThreshold
 *  (admin-tunable); this constant is the historical default and the floor the
 *  legacy tests assert. */
export const SENTINEL_CONFIDENCE_THRESHOLD = 90;

/** The live deep-check model: env override → admin ai-ops config → code default. */
export async function getSentinelModel(): Promise<string> {
  try {
    const ops = await getAiOpsConfig();
    return process.env.SENTINEL_MODEL || ops.model || ENV_SENTINEL_MODEL;
  } catch {
    return ENV_SENTINEL_MODEL;
  }
}

// Singleton Anthropic client — reused across all checks.
let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

/** True when the sentinel CAN run at all (API key present + not env-disabled). This
 *  is the deployment-level gate; the operator PAUSE below layers on top of it. */
export function sentinelEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.SENTINEL_ENABLED !== "false";
}

// ── Operator PAUSE for the AI resolution check ───────────────────────────────
//
// The old global sweep had a pause/resume the operator used as a budget/kill switch.
// The sweep is gone (markets are AI-checked at their own resolve time now), but the
// PAUSE is still wanted: a persisted, admin-tunable switch that stops the automatic
// resolve-date AI call platform-wide, without changing anything else.
//
//   ACTIVE  → at a market's resolve date the AI check runs (the normal flow).
//   PAUSED  → no automatic AI call; the resolve trigger still fires on time and goes
//             straight to the human ceremony (officers resolve, no AI recommendation).
//             Money flow is identical. A deliberate per-market "Re-check this market
//             now" is NOT gated by this — it is an explicit, single, operator-chosen call.
//
// Persisted via config-store so it survives deploys (the same durability the old
// pause had). globalThis-cached, hydrated once — the house pattern.
const PAUSE_KEY = "sentinel.paused";
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_SENTINEL_PAUSED: boolean | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_SENTINEL_PAUSED_HYDRATED: boolean | undefined;
}

async function ensurePauseHydrated(): Promise<void> {
  if (globalThis.__50PICK_SENTINEL_PAUSED_HYDRATED) return;
  globalThis.__50PICK_SENTINEL_PAUSED_HYDRATED = true;
  const stored = await loadConfig<{ paused: boolean }>(PAUSE_KEY);
  if (stored && typeof stored.paused === "boolean") globalThis.__50PICK_SENTINEL_PAUSED = stored.paused;
}

/** Has an officer paused the automatic AI resolution check? (Persisted.) */
export async function isResolutionAiPaused(): Promise<boolean> {
  await ensurePauseHydrated();
  return globalThis.__50PICK_SENTINEL_PAUSED === true;
}

/** The automatic resolve-date AI check runs only when the deployment allows it AND
 *  an officer has not paused it. This is what the resolve trigger consults. */
export async function isResolutionAiActive(): Promise<boolean> {
  if (!sentinelEnabled()) return false;
  return !(await isResolutionAiPaused());
}

/** Pause or resume the automatic AI resolution check. Persisted + audited. */
export async function setResolutionAiPaused(paused: boolean, officerId: string): Promise<void> {
  await ensurePauseHydrated();
  globalThis.__50PICK_SENTINEL_PAUSED = paused;
  await saveConfig(PAUSE_KEY, { paused });
  audit({
    category: "ADMIN",
    action: paused ? "sentinel.resolution_paused" : "sentinel.resolution_resumed",
    actorId: officerId,
    targetType: "System",
    targetId: "market-sentinel",
    payload: { paused, note: paused
      ? "Automatic resolve-date AI check PAUSED — markets fall to the human ceremony until resumed. Manual per-market re-check still available."
      : "Automatic resolve-date AI check RESUMED." },
  });
}

/** Status for the admin toggle: whether the deployment supports AI, whether an
 *  officer paused it, and the resulting active state. */
export async function getResolutionAiStatus(): Promise<{ hasKey: boolean; enabled: boolean; paused: boolean; active: boolean }> {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const enabled = sentinelEnabled();
  const paused = await isResolutionAiPaused();
  return { hasKey, enabled, paused, active: enabled && !paused };
}

// --- Types -------------------------------------------------------------------

export type MarketInput = {
  id: string;
  titleEn: string;
  titleSw: string;
  category: string;
  resolutionCriterion?: string;
  resolutionAt: string;
  sourceUrl?: string | null;
  createdAt?: string;
};

export type SentinelResult = {
  marketId: string;
  title: string;
  determined: boolean;
  outcome: "YES" | "NO" | "UNKNOWN";
  confidence: number;
  evidence: string;
  reasoning?: string;
  sourceUrl?: string;
  action: "assessed" | "error";
  error?: string;
};

/** Map a stored market to the sentinel's input shape. */
export function marketInputFromStored(m: StoredMarket): MarketInput {
  return {
    id: m.id,
    titleEn: m.titleEn,
    titleSw: m.titleSw,
    category: m.category,
    resolutionCriterion: m.resolutionCriterion,
    resolutionAt: m.resolutionAt,
    sourceUrl: m.sourceUrl,
    createdAt: m.createdAt,
  };
}

// --- The deep check (web search + structured tool call) ----------------------

const OUTCOME_TOOL = {
  name: "report_outcome",
  description:
    "Report whether the market's outcome is already IRREVERSIBLY SETTLED (locked). " +
    "Call this exactly once with your assessment.",
  input_schema: {
    type: "object" as const,
    properties: {
      reasoning: {
        type: "string" as const,
        description:
          "Show your work BEFORE deciding: (1) the exact threshold/condition and comparison " +
          "operator you parsed (e.g. 'more than 3' = strictly >3, needs 4+); (2) the measurement " +
          "window and whether the quantity is cumulative; (3) the CURRENT real value found via web " +
          "search, including anything accumulated before the market opened; (4) whether the result " +
          "is locked and why (can it still change?).",
      },
      determined: {
        type: "boolean" as const,
        description:
          "true ONLY if the YES/NO result is already irreversibly LOCKED — nothing that can still " +
          "happen could change it. false if the outcome could still change, or you cannot verify.",
      },
      outcome: {
        type: "string" as const,
        enum: ["YES", "NO", "UNKNOWN"],
        description: "The locked outcome. UNKNOWN if not yet locked.",
      },
      confidence: {
        type: "number" as const,
        description: "0-100 confidence that this assessment is correct.",
      },
      evidence: {
        type: "string" as const,
        description: "Brief summary of the evidence (what happened, the current value, when, source).",
      },
      sourceUrl: {
        type: "string" as const,
        description: "URL of the source confirming the current value/outcome, if found.",
      },
    },
    required: ["reasoning", "determined", "outcome", "confidence", "evidence"],
  },
};

/**
 * Run the AI deep check on ONE market. Returns a structured assessment; NEVER
 * writes to the market or moves money — the caller decides what to do with it.
 */
export async function deepCheckMarket(market: MarketInput, sentinelModel?: string): Promise<SentinelResult> {
  const SENTINEL_MODEL = sentinelModel || ENV_SENTINEL_MODEL;
  const fail = (error: string): SentinelResult => ({
    marketId: market.id, title: market.titleEn,
    determined: false, outcome: "UNKNOWN", confidence: 0,
    evidence: "", action: "error", error,
  });

  const anthropic = getClient();
  if (!anthropic) return fail("No ANTHROPIC_API_KEY");

  const now = new Date().toISOString();
  const criterion = market.resolutionCriterion?.trim() || "Not specified";

  const systemPrompt = `You are the 50pick Market Sentinel — a real-time integrity monitor for a LICENSED, REAL-MONEY prediction-market platform in Tanzania. Real money is at stake. If a market stays open after its outcome is already settled, players can bet on a known result and the house loses money. If you close a market whose outcome is NOT yet settled, you block legitimate betting. Both are costly — be VIGILANT and PRECISE.

CURRENT DATE/TIME: ${now} (platform timezone: ${getPlatformTimezone()})

YOUR JOB
Decide whether this market's outcome is already IRREVERSIBLY SETTLED ("locked") by real-world events — i.e. nothing that can still happen could change the YES/NO result. The platform closes a market to new bets only when it is locked. A human officer still does the final payout; you never pay out.

YOU MUST USE WEB SEARCH — never answer from memory. The deciding event may have happened minutes ago. Search for the latest score/result/data; prefer the official source if one is given. Search more than once, from different angles, if the first result is unclear or incomplete.

HOW TO JUDGE — follow these steps exactly:
1. Parse the EXACT condition and its comparison operator, literally. A difference of one unit decides the winner:
   - "more than N" / "over N" = STRICTLY greater than N → needs N+1 or more (so "more than 3" needs 4).
   - "at least N" / "N or more" / "N+" = greater than or equal to N → N is enough.
   - "under N" / "less than N" / "fewer than N" = STRICTLY less than N.
   - "exactly N" = equal to N only.
2. Identify the measurement WINDOW (this match? this tournament? this season? a date range?) and whether the quantity is CUMULATIVE (a running total that only ever goes UP — goals, points, wins across a tournament) or a single event.
3. Establish the CURRENT real value from the web. For a cumulative condition this is the running total across the WHOLE window to date — you MUST include anything accumulated BEFORE this market opened, not only what happened since.
4. Decide if the result is LOCKED:
   - YES is locked when the condition is ALREADY satisfied and CANNOT be undone. Cumulative totals only rise, so once the total crosses the YES threshold it is permanent regardless of matches still to come (e.g. "more than 3 goals" and the player now has 4 total → locked YES, even mid-tournament).
   - NO is locked when the condition can NO LONGER be reached — the window has ended, OR the participant can no longer add to the count (eliminated, match/tournament over, withdrawn) AND the current value cannot reach the threshold (e.g. "more than 3 goals" and the tournament ended with the player on 2, or the player was eliminated on 2 → locked NO).
   - If the participant could STILL change the result (matches/time remain and the threshold is still reachable), it is NOT locked → determined=false. "Close", "on track", or "likely" is NOT settled.
5. Be conservative. If you cannot verify the current value from a reliable source with high confidence, report determined=false. Report determined=true with confidence ≥90 ONLY with concrete evidence the result is locked.`;

  const userPrompt = `Assess this live market.

TITLE (EN): ${market.titleEn}
TITLE (SW): ${market.titleSw || market.titleEn}
CATEGORY: ${market.category}
RESOLUTION CRITERION: ${criterion}
OFFICIAL SOURCE (resolve against this if given): ${market.sourceUrl || "none provided"}
MARKET OPENED: ${market.createdAt || "unknown"}
SCHEDULED RESOLUTION: ${market.resolutionAt}

Search the web for the latest data, work through the steps, then call report_outcome. Report determined=true ONLY if the YES/NO result is already irreversibly locked.`;

  const started = Date.now();
  try {
    const response = await anthropic.messages.create({
      model: SENTINEL_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: [
        OUTCOME_TOOL as unknown as Anthropic.Tool,
        { type: ai.webSearchTool.type, name: ai.webSearchTool.name, max_uses: 5 } as unknown as Anthropic.Tool,
      ],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: userPrompt }],
    });

    // Meter the spend (best-effort).
    const u = response.usage as { input_tokens?: number; output_tokens?: number; server_tool_use?: { web_search_requests?: number } } | undefined;
    await recordAiUsage({
      feature: "sentinel", model: SENTINEL_MODEL,
      inputTokens: u?.input_tokens ?? 0,
      outputTokens: u?.output_tokens ?? 0,
      webSearches: u?.server_tool_use?.web_search_requests ?? 0,
      ok: true, latencyMs: Date.now() - started,
      detail: `deep · ${market.titleEn.slice(0, 80)}`,
    });

    // Extract the report_outcome tool call from the response.
    const toolUse = response.content.find(
      (b) => b.type === "tool_use" && b.name === "report_outcome",
    );
    if (!toolUse || toolUse.type !== "tool_use") {
      return fail("Model did not call report_outcome tool");
    }

    // Validate input types — the model should return structured data but we can't
    // trust it blindly on a real-money system.
    const raw = toolUse.input as Record<string, unknown>;
    const determined = !!raw.determined;
    const rawOutcome = String(raw.outcome ?? "");
    if (!["YES", "NO", "UNKNOWN"].includes(rawOutcome)) {
      console.warn(`[sentinel] Model returned non-standard outcome: "${rawOutcome}" for market ${market.id} — defaulting to UNKNOWN`);
    }
    const outcome = (["YES", "NO", "UNKNOWN"].includes(rawOutcome) ? rawOutcome : "UNKNOWN") as "YES" | "NO" | "UNKNOWN";
    const confidence = Math.max(0, Math.min(100, Math.round(Number(raw.confidence) || 0)));
    const evidence = String(raw.evidence || "");
    const reasoning = raw.reasoning ? String(raw.reasoning) : undefined;
    const sourceUrl = raw.sourceUrl ? String(raw.sourceUrl) : undefined;

    return {
      marketId: market.id,
      title: market.titleEn,
      determined,
      outcome,
      confidence,
      evidence,
      reasoning,
      sourceUrl,
      action: "assessed",
    };
  } catch (err) {
    await recordAiUsage({
      feature: "sentinel", model: SENTINEL_MODEL, ok: false,
      latencyMs: Date.now() - started,
      errorType: (err as Error).message?.slice(0, 200),
      detail: `deep · ${market.titleEn.slice(0, 80)}`,
    });
    return fail((err as Error).message);
  }
}

/**
 * Convenience wrapper: read a market by id and run the deep check on it. Returns
 * null if the market no longer exists. Used by the resolver-queue "Re-check this
 * market now" action and any one-off manual re-check.
 */
export async function sentinelCheckOne(marketId: string, opts?: { model?: string }): Promise<SentinelResult | null> {
  const m = await marketStore.get(marketId);
  if (!m) return null;
  const model = opts?.model ?? (await getSentinelModel());
  return deepCheckMarket(marketInputFromStored(m), model);
}
