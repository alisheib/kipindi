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
 *   2. For each market, asks Claude Sonnet 4.6 with web search:
 *      "Has this outcome been decided?"
 *   3. If ≥90% confidence → CLOSE market (no new bets)
 *   4. Admin still resolves manually (two-officer dance → payouts)
 *
 * Safety:
 *   - Can only CLOSE, never RESOLVE (no payouts without human)
 *   - 90% confidence threshold prevents false closures
 *   - Full audit trail
 *   - Cooldown per market (3 min between checks)
 *   - Singleton Anthropic client (no resource leak)
 *   - Cooldown map cleaned up every sweep (no memory leak)
 */

import Anthropic from "@anthropic-ai/sdk";
import { marketStore } from "./market-dal";
import { audit } from "./audit";

// --- Configuration -----------------------------------------------------------

const SENTINEL_MODEL = process.env.SENTINEL_MODEL || "claude-sonnet-4-6-20250514";
const SENTINEL_INTERVAL_MS = parseInt(process.env.SENTINEL_INTERVAL_MS || "180000", 10);
const SENTINEL_CONFIDENCE_THRESHOLD = 90;
const SENTINEL_COOLDOWN_MS = 180_000;

// Singleton Anthropic client — reused across all checks
let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

// Per-market cooldown tracker
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

// --- Types -------------------------------------------------------------------

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

// --- Core Logic --------------------------------------------------------------

async function checkMarket(market: {
  id: string;
  titleEn: string;
  titleSw: string;
  category: string;
  resolutionCriterion?: string;
  resolutionAt: string;
}): Promise<SentinelResult> {
  const fail = (error: string): SentinelResult => ({
    marketId: market.id, title: market.titleEn,
    determined: false, outcome: "UNKNOWN", confidence: 0,
    evidence: "", action: "error", error,
  });

  const anthropic = getClient();
  if (!anthropic) return fail("No ANTHROPIC_API_KEY");

  const now = new Date().toISOString();
  const criterion = market.resolutionCriterion?.trim() || "Not specified";

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
SWAHILI: ${market.titleSw || market.titleEn}
CATEGORY: ${market.category}
RESOLUTION CRITERION: ${criterion}
SCHEDULED RESOLUTION: ${market.resolutionAt}

Has this outcome already been determined by real-world events? Search the web for the latest news/scores/data and report your finding using the report_outcome tool.`;

  try {
    const response = await anthropic.messages.create({
      model: SENTINEL_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [
        OUTCOME_TOOL as unknown as Anthropic.Tool,
        { type: "web_search_20250305", name: "web_search", max_uses: 3 } as unknown as Anthropic.Tool,
      ],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract the report_outcome tool call from the response
    const toolUse = response.content.find(
      (b) => b.type === "tool_use" && b.name === "report_outcome",
    );
    if (!toolUse || toolUse.type !== "tool_use") {
      return fail("Model did not call report_outcome tool");
    }

    // Validate input types — the model should return structured data but
    // we can't trust it blindly on a real-money system
    const raw = toolUse.input as Record<string, unknown>;
    const determined = !!raw.determined;
    const outcome = (["YES", "NO", "UNKNOWN"].includes(String(raw.outcome)) ? String(raw.outcome) : "UNKNOWN") as "YES" | "NO" | "UNKNOWN";
    const confidence = Math.max(0, Math.min(100, Math.round(Number(raw.confidence) || 0)));
    const evidence = String(raw.evidence || "");
    const sourceUrl = raw.sourceUrl ? String(raw.sourceUrl) : undefined;

    return {
      marketId: market.id,
      title: market.titleEn,
      determined,
      outcome,
      confidence,
      evidence,
      sourceUrl,
      action: "skipped", // caller decides the action
    };
  } catch (err) {
    return fail((err as Error).message);
  }
}

/** Run one sentinel sweep across all live markets. */
export async function runSentinelSweep(): Promise<SentinelResult[]> {
  const results: SentinelResult[] = [];
  const now = Date.now();

  // Clean stale cooldown entries (older than 1 hour) to prevent memory leak
  for (const [id, ts] of lastChecked.entries()) {
    if (now - ts > 3_600_000) lastChecked.delete(id);
  }

  let allMarkets;
  try {
    allMarkets = (await marketStore.values()).filter((m) => m.status === "LIVE");
  } catch (err) {
    console.error("[sentinel] Failed to read markets:", err);
    return results;
  }

  if (allMarkets.length === 0) return results;

  for (const market of allMarkets) {
    // Skip if checked recently (cooldown)
    const lastCheck = lastChecked.get(market.id) ?? 0;
    if (now - lastCheck < SENTINEL_COOLDOWN_MS) continue;

    // Skip markets closing within 5 minutes — auto-close handles those
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

    // HIGH CONFIDENCE: outcome determined — close market to block new bets
    try {
      const fresh = await marketStore.get(market.id);
      if (!fresh || fresh.status !== "LIVE") {
        result.action = "skipped";
        results.push(result);
        continue;
      }
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
let sweepRunning = false; // prevent concurrent sweeps

export function startSentinel(): void {
  if (intervalId) return;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[sentinel] ANTHROPIC_API_KEY not set — sentinel disabled");
    return;
  }
  if (process.env.SENTINEL_ENABLED === "false") {
    console.warn("[sentinel] SENTINEL_ENABLED=false — sentinel disabled");
    return;
  }

  console.log(`[sentinel] Starting (interval: ${SENTINEL_INTERVAL_MS / 1000}s, model: ${SENTINEL_MODEL}, threshold: ${SENTINEL_CONFIDENCE_THRESHOLD}%)`);

  // First sweep after boot delay
  setTimeout(() => {
    runSentinelSweep()
      .then((r) => {
        const closed = r.filter((x) => x.action === "closed");
        if (closed.length > 0) console.log(`[sentinel] Boot sweep: ${closed.length} closed`);
      })
      .catch((err) => console.error("[sentinel] Boot sweep error:", err));
  }, 10_000);

  intervalId = setInterval(async () => {
    if (sweepRunning) return; // skip if previous sweep still running
    sweepRunning = true;
    try {
      const r = await runSentinelSweep();
      const closed = r.filter((x) => x.action === "closed");
      const errors = r.filter((x) => x.action === "error");
      if (closed.length > 0 || errors.length > 0) {
        console.log(`[sentinel] Sweep: ${closed.length} closed, ${errors.length} errors, ${r.length - closed.length - errors.length} skipped`);
      }
    } catch (err) {
      console.error("[sentinel] Sweep error:", err);
    } finally {
      sweepRunning = false;
    }
  }, SENTINEL_INTERVAL_MS);
}

export function stopSentinel(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[sentinel] Stopped");
  }
}
