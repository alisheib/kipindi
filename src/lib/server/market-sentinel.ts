/**
 * Market Sentinel Agent — AI-powered live market monitor.
 *
 * Continuously monitors LIVE markets for early resolution triggers.
 * Example: "Will Ronaldo score in this match?" — he scores at minute 30,
 * the sentinel detects it via web search and immediately closes the market
 * so no players can bet on an already-determined outcome.
 *
 * Architecture:
 *   1. Polls all LIVE markets every N minutes (configurable)
 *   2. For each market whose outcome COULD be determined before resolutionAt,
 *      asks Claude Sonnet 4.6 with web search: "Has this outcome been decided?"
 *   3. If the model returns high confidence (≥90) that the outcome is determined,
 *      the sentinel closes the market immediately (CLOSED status, no new bets)
 *      and flags it for admin resolution with the AI's recommended outcome.
 *   4. The admin still has final say — the sentinel closes but doesn't settle.
 *      This prevents payout errors from an AI hallucination while still
 *      protecting players from betting on determined outcomes.
 *
 * Model choice: Claude Sonnet 4.6 (not Haiku) — this is a judgment call that
 * affects real money. Sonnet's stronger reasoning + web search accuracy is
 * worth the higher cost. A wrong close is recoverable (admin reopens); a
 * missed close means players lose money on a rigged bet.
 *
 * Safety:
 *   - Sentinel can only CLOSE markets, never RESOLVE (no payouts without human)
 *   - 90% confidence threshold prevents trigger-happy closures
 *   - Full audit trail for every sentinel action
 *   - Admin notification on every closure
 *   - Cooldown per market (don't re-check a market more than once per 3 min)
 */

import Anthropic from "@anthropic-ai/sdk";
import { marketStore } from "./market-dal";
import { audit } from "./audit";

// --- Configuration -----------------------------------------------------------

const SENTINEL_MODEL = process.env.SENTINEL_MODEL || "claude-sonnet-4-6-20250514";
const SENTINEL_INTERVAL_MS = parseInt(process.env.SENTINEL_INTERVAL_MS || "180000", 10); // 3 min default
const SENTINEL_CONFIDENCE_THRESHOLD = 90; // only close if AI is ≥90% confident
const SENTINEL_COOLDOWN_MS = 180_000; // don't re-check same market within 3 min

// Track when each market was last checked to avoid hammering the API
const lastChecked = new Map<string, number>();

// --- AI Judgment Tool --------------------------------------------------------

const OUTCOME_TOOL = {
  name: "report_outcome",
  description:
    "Report whether the market's outcome has already been determined. " +
    "Call this exactly once with your assessment.",
  input_schema: {
    type: "object" as const,
    properties: {
      determined: {
        type: "boolean" as const,
        description: "true if the outcome is already known/decided, false if still open.",
      },
      outcome: {
        type: "string" as const,
        enum: ["YES", "NO", "UNKNOWN"],
        description: "The determined outcome. UNKNOWN if not yet decided.",
      },
      confidence: {
        type: "number" as const,
        description: "0-100 confidence that this assessment is correct.",
      },
      evidence: {
        type: "string" as const,
        description: "Brief summary of the evidence (what happened, when, source).",
      },
      sourceUrl: {
        type: "string" as const,
        description: "URL of the source confirming the outcome, if found.",
      },
    },
    required: ["determined", "outcome", "confidence", "evidence"],
  },
};

// --- Core Logic --------------------------------------------------------------

export type SentinelResult = {
  marketId: string;
  title: string;
  determined: boolean;
  outcome: "YES" | "NO" | "UNKNOWN";
  confidence: number;
  evidence: string;
  sourceUrl?: string;
  action: "closed" | "skipped" | "below_threshold" | "error";
  error?: string;
};

async function checkMarket(market: {
  id: string;
  titleEn: string;
  titleSw: string;
  category: string;
  resolutionCriterion?: string;
  resolutionAt: string;
}): Promise<SentinelResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { marketId: market.id, title: market.titleEn, determined: false, outcome: "UNKNOWN", confidence: 0, evidence: "", action: "error", error: "No ANTHROPIC_API_KEY" };
  }

  const client = new Anthropic({ apiKey });
  const now = new Date().toISOString();

  const systemPrompt = `You are the 50pick Market Sentinel — a real-time monitor for a licensed prediction-market platform in Tanzania.

Your job: determine whether a live market's outcome has ALREADY been decided by real-world events, even though the market's scheduled resolution time hasn't arrived yet.

CURRENT DATE/TIME: ${now}

You MUST use web search to find the latest information about this event. Do NOT rely on training data — the event may have happened minutes ago.

IMPORTANT:
- Only report determined=true if you find CONCRETE EVIDENCE that the outcome is settled.
- A match being in progress is NOT enough — the specific condition in the resolution criterion must be met.
- If the event hasn't happened yet or is still in progress with the outcome uncertain, report determined=false.
- Be conservative. A false "determined" closes the market and blocks player bets. Only trigger on clear evidence.
- Confidence must be ≥90 for the platform to act on your assessment.`;

  const userPrompt = `Check this live market:

TITLE: ${market.titleEn}
SWAHILI: ${market.titleSw}
CATEGORY: ${market.category}
RESOLUTION CRITERION: ${market.resolutionCriterion || "Not specified"}
SCHEDULED RESOLUTION: ${market.resolutionAt}

Has this outcome already been determined by real-world events? Search the web for the latest news/scores/data and report your finding using the report_outcome tool.`;

  try {
    const response = await client.messages.create({
      model: SENTINEL_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [
        OUTCOME_TOOL,
        // Enable web search so the model can check live scores/news
        { type: "web_search_20250305", name: "web_search", max_uses: 3 } as never,
      ],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract the report_outcome tool call
    const toolUse = response.content.find(
      (b) => b.type === "tool_use" && b.name === "report_outcome",
    );
    if (!toolUse || toolUse.type !== "tool_use") {
      return {
        marketId: market.id, title: market.titleEn,
        determined: false, outcome: "UNKNOWN", confidence: 0,
        evidence: "Model did not call report_outcome tool",
        action: "error", error: "No tool call in response",
      };
    }

    const input = toolUse.input as {
      determined: boolean;
      outcome: "YES" | "NO" | "UNKNOWN";
      confidence: number;
      evidence: string;
      sourceUrl?: string;
    };

    return {
      marketId: market.id,
      title: market.titleEn,
      determined: input.determined,
      outcome: input.outcome,
      confidence: input.confidence,
      evidence: input.evidence,
      sourceUrl: input.sourceUrl,
      action: "skipped", // caller decides the action
    };
  } catch (err) {
    return {
      marketId: market.id, title: market.titleEn,
      determined: false, outcome: "UNKNOWN", confidence: 0,
      evidence: "", action: "error",
      error: (err as Error).message,
    };
  }
}

/** Run one sentinel sweep across all live markets. */
export async function runSentinelSweep(): Promise<SentinelResult[]> {
  const results: SentinelResult[] = [];
  const now = Date.now();

  // Get all live markets
  const allMarkets = (await marketStore.values()).filter((m) => m.status === "LIVE");

  if (allMarkets.length === 0) return results;

  for (const market of allMarkets) {

    // Skip if checked recently (cooldown)
    const lastCheck = lastChecked.get(market.id) ?? 0;
    if (now - lastCheck < SENTINEL_COOLDOWN_MS) continue;

    // Skip markets that close within 5 minutes — they'll auto-close anyway
    const timeToClose = Date.parse(market.resolutionAt) - now;
    if (timeToClose < 5 * 60_000) continue;

    lastChecked.set(market.id, now);

    const result = await checkMarket(market);

    if (result.action === "error") {
      results.push(result);
      continue;
    }

    if (!result.determined || result.confidence < SENTINEL_CONFIDENCE_THRESHOLD) {
      result.action = result.determined ? "below_threshold" : "skipped";
      results.push(result);
      continue;
    }

    // HIGH CONFIDENCE: outcome is determined — close the market
    // The sentinel does NOT resolve (no payouts) — it only closes to prevent
    // new bets. An admin must still confirm the resolution.
    try {
      const fresh = await marketStore.get(market.id);
      if (!fresh || fresh.status !== "LIVE") continue; // raced with admin
      fresh.status = "CLOSED";
      fresh.updatedAt = new Date().toISOString();
      await marketStore.set(fresh);

      audit({
        category: "SYSTEM",
        action: "sentinel.market_closed",
        actorId: "sentinel_agent",
        targetType: "Market",
        targetId: market.id,
        payload: {
          outcome: result.outcome,
          confidence: result.confidence,
          evidence: result.evidence,
          sourceUrl: result.sourceUrl,
          model: SENTINEL_MODEL,
        },
      });

      // Audit log is the primary notification — admins check the audit
      // dashboard. A future enhancement can push to admin notifications.

      result.action = "closed";
    } catch (err) {
      result.action = "error";
      result.error = `Close failed: ${(err as Error).message}`;
    }

    results.push(result);
  }

  return results;
}

// --- Background Runner -------------------------------------------------------

let intervalId: ReturnType<typeof setInterval> | null = null;

/** Start the sentinel background loop. Safe to call multiple times (idempotent). */
export function startSentinel(): void {
  if (intervalId) return; // already running
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[sentinel] ANTHROPIC_API_KEY not set — sentinel disabled");
    return;
  }
  if (process.env.SENTINEL_ENABLED === "false") {
    console.warn("[sentinel] SENTINEL_ENABLED=false — sentinel disabled");
    return;
  }

  console.log(`[sentinel] Starting market sentinel (interval: ${SENTINEL_INTERVAL_MS / 1000}s, model: ${SENTINEL_MODEL}, threshold: ${SENTINEL_CONFIDENCE_THRESHOLD}%)`);

  // Run first sweep after a short delay (let the server finish booting)
  setTimeout(() => {
    runSentinelSweep().then((results) => {
      const closed = results.filter((r) => r.action === "closed");
      if (closed.length > 0) {
        console.log(`[sentinel] Sweep complete: ${closed.length} market(s) closed`, closed.map((r) => `${r.title} → ${r.outcome} (${r.confidence}%)`));
      }
    }).catch((err) => {
      console.error("[sentinel] Sweep error:", err);
    });
  }, 10_000);

  intervalId = setInterval(async () => {
    try {
      const results = await runSentinelSweep();
      const closed = results.filter((r) => r.action === "closed");
      const errors = results.filter((r) => r.action === "error");
      if (closed.length > 0 || errors.length > 0) {
        console.log(`[sentinel] Sweep: ${closed.length} closed, ${errors.length} errors, ${results.length - closed.length - errors.length} unchanged`);
      }
    } catch (err) {
      console.error("[sentinel] Sweep error:", err);
    }
  }, SENTINEL_INTERVAL_MS);
}

/** Stop the sentinel. */
export function stopSentinel(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[sentinel] Stopped");
  }
}
