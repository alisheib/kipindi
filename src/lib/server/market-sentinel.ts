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
import { ai } from "./ai-config";

// --- Configuration -----------------------------------------------------------

const SENTINEL_MODEL = process.env.SENTINEL_MODEL || ai.model;
const SENTINEL_INTERVAL_MS = parseInt(process.env.SENTINEL_INTERVAL_MS || "180000", 10);
const SENTINEL_CONFIDENCE_THRESHOLD = 90;
const SENTINEL_COOLDOWN_MS = 180_000;
// How many markets to check concurrently per sweep. Keeps the whole board
// scanned within seconds (not minutes) even with many live markets, so a
// just-settled outcome is caught fast. Tune via env if rate limits bite.
const SENTINEL_CONCURRENCY = parseInt(process.env.SENTINEL_CONCURRENCY || "6", 10);

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

// --- Types -------------------------------------------------------------------

export type SentinelResult = {
  marketId: string;
  title: string;
  determined: boolean;
  outcome: "YES" | "NO" | "UNKNOWN";
  confidence: number;
  evidence: string;
  reasoning?: string;
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
  sourceUrl?: string | null;
  createdAt?: string;
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

  const systemPrompt = `You are the 50pick Market Sentinel — a real-time integrity monitor for a LICENSED, REAL-MONEY prediction-market platform in Tanzania. Real money is at stake. If a market stays open after its outcome is already settled, players can bet on a known result and the house loses money. If you close a market whose outcome is NOT yet settled, you block legitimate betting. Both are costly — be VIGILANT and PRECISE.

CURRENT DATE/TIME: ${now}

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

  // Build the due list (cooldown + skip-near-close), marking lastChecked up front
  // so a concurrent sweep can't double-pick the same market.
  const due = allMarkets.filter((market) => {
    const lastCheck = lastChecked.get(market.id) ?? 0;
    if (now - lastCheck < SENTINEL_COOLDOWN_MS) return false;
    // Skip markets closing within 5 minutes — auto-close handles those
    const timeToClose = Date.parse(market.resolutionAt) - now;
    if (timeToClose < 5 * 60_000) return false;
    lastChecked.set(market.id, now);
    return true;
  });

  if (due.length === 0) return results;

  // Check one market end-to-end: AI judgment → (if locked & confident) close + audit.
  const processOne = async (market: (typeof due)[number]): Promise<SentinelResult> => {
    const result = await checkMarket(market);

    if (result.action === "error") return result;

    if (!result.determined || result.confidence < SENTINEL_CONFIDENCE_THRESHOLD) {
      result.action = result.determined ? "below_threshold" : "skipped";
      return result;
    }

    // HIGH CONFIDENCE: outcome locked — close market to block new bets
    try {
      const fresh = await marketStore.get(market.id);
      if (!fresh || fresh.status !== "LIVE") {
        result.action = "skipped";
        return result;
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
          reasoning: result.reasoning,
          sourceUrl: result.sourceUrl,
          model: SENTINEL_MODEL,
        },
      });

      result.action = "closed";
    } catch (err) {
      result.action = "error";
      result.error = `Close failed: ${(err as Error).message}`;
    }

    return result;
  };

  // Process in bounded-concurrency batches so the whole board is scanned fast
  // (a just-settled outcome shouldn't wait behind dozens of sequential calls).
  for (let i = 0; i < due.length; i += SENTINEL_CONCURRENCY) {
    const batch = due.slice(i, i + SENTINEL_CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(processOne));
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      if (s.status === "fulfilled") {
        results.push(s.value);
      } else {
        results.push({
          marketId: batch[j].id, title: batch[j].titleEn,
          determined: false, outcome: "UNKNOWN", confidence: 0,
          evidence: "", action: "error", error: String(s.reason),
        });
      }
    }
  }

  return results;
}

// --- Health alerting ---------------------------------------------------------
// If the sweep can't reach the AI (exhausted Anthropic balance, bad key, etc.)
// the sentinel silently stops protecting live markets. Detect that and alert
// admins, debounced so we notify once per window rather than every 3 minutes.

let lastHealthAlertAt = 0;
const HEALTH_ALERT_COOLDOWN_MS = 6 * 60 * 60_000; // 6h

function classifySweepFailure(results: SentinelResult[]): { reason: string; sample: string } | null {
  const errors = results.filter((r) => r.action === "error" && r.error);
  if (errors.length === 0) return null;
  const blob = errors.map((e) => e.error!).join(" | ").toLowerCase();
  let reason = "AI API errors";
  if (blob.includes("credit balance") || blob.includes("billing")) reason = "Anthropic credit exhausted";
  else if (blob.includes("authentication") || blob.includes("api key") || blob.includes("401")) reason = "invalid API key";
  else if (blob.includes("rate_limit") || blob.includes("429")) reason = "AI rate limited";
  else if (blob.includes("overloaded") || blob.includes("529")) reason = "AI overloaded";
  // Always actionable: billing/auth failures. Otherwise only alert if most checks failed.
  const billingOrAuth = reason === "Anthropic credit exhausted" || reason === "invalid API key";
  const mostlyFailed = errors.length >= Math.max(1, Math.ceil(results.length / 2));
  if (!billingOrAuth && !mostlyFailed) return null;
  return { reason, sample: errors[0].error!.slice(0, 300) };
}

async function maybeAlertOnSweep(results: SentinelResult[]): Promise<void> {
  const failure = classifySweepFailure(results);
  if (!failure) return;
  const now = Date.now();
  if (now - lastHealthAlertAt < HEALTH_ALERT_COOLDOWN_MS) return;
  lastHealthAlertAt = now;
  const errorCount = results.filter((r) => r.action === "error").length;
  console.error(`[sentinel] HEALTH ALERT: ${failure.reason} — ${errorCount} market(s) uncheckable. Notifying admins.`);
  try {
    const { notifyAdminsSentinelDown } = await import("./notification-service");
    await notifyAdminsSentinelDown({ reason: failure.reason, errorCount, sampleError: failure.sample });
  } catch (err) {
    console.error("[sentinel] Failed to send health alert:", err);
  }
  audit({
    category: "SYSTEM",
    action: "sentinel.health_alert",
    actorId: "sentinel_agent",
    targetType: "System",
    targetId: "market-sentinel",
    payload: { reason: failure.reason, errorCount },
  });
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
      .then(async (r) => {
        const closed = r.filter((x) => x.action === "closed");
        if (closed.length > 0) console.log(`[sentinel] Boot sweep: ${closed.length} closed`);
        await maybeAlertOnSweep(r);
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
      await maybeAlertOnSweep(r);
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
