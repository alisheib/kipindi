/**
 * Market Sentinel Agent — two-tier AI-powered live market monitor.
 *
 * Continuously monitors LIVE markets for early resolution triggers.
 * Example: "Will Ronaldo score in this match?" — he scores at minute 30,
 * the sentinel detects it via web search and immediately closes the market
 * so no players can bet on an already-determined outcome.
 *
 * Architecture (two-tier for cost efficiency):
 *   1. TIER 1 — Haiku Quick Scan (every sweep, ~$0.002/market)
 *      No web search. Reads the market title + category + time remaining and
 *      scores how likely it is that the outcome MAY have been settled since
 *      the market opened. Pure reasoning, no external data.
 *
 *   2. TIER 2 — Sonnet Deep Check (only markets flagged by triage, ~$0.05/market)
 *      Full web search + structured tool call. 90% confidence threshold.
 *      If determined → CLOSE market (no new bets) + store AI recommendation
 *      on the market record so the resolver queue can show it.
 *
 *   3. Officer resolves (two-officer dance → payouts). AI never auto-resolves.
 *      The sentinel pre-fills outcome + evidence so the officer's job is
 *      "verify + confirm" instead of "research + decide".
 *
 * Safety:
 *   - Can only CLOSE, never RESOLVE (no payouts without human)
 *   - 90% confidence threshold prevents false closures
 *   - Full audit trail
 *   - Cooldown per market (configurable between checks)
 *   - Singleton Anthropic client (no resource leak)
 *   - Cooldown map cleaned up every sweep (no memory leak)
 */

import Anthropic from "@anthropic-ai/sdk";
import { marketStore } from "./market-dal";
import { audit } from "./audit";
import { ai } from "./ai-config";
import { recordAiUsage } from "./ai-usage";
import { getAiOpsConfig } from "./ai-ops-config";
import { withLock } from "./locks";
import { getPlatformTimezone } from "./platform-config";

// --- Configuration -----------------------------------------------------------

// Env-var defaults (overridden at runtime by admin-tunable config-store values)
const ENV_SENTINEL_MODEL = process.env.SENTINEL_MODEL || ai.model;
const TRIAGE_MODEL = process.env.SENTINEL_TRIAGE_MODEL || "claude-haiku-4-5-20251001";
const ENV_INTERVAL_MS = parseInt(process.env.SENTINEL_INTERVAL_MS || String(4 * 60 * 60_000), 10);
const SENTINEL_CONFIDENCE_THRESHOLD = 90;

/** Read the live-configured model + interval (config-store → env → defaults). */
async function getLiveConfig() {
  try {
    const ops = await getAiOpsConfig();
    return {
      model: process.env.SENTINEL_MODEL || ops.model || ENV_SENTINEL_MODEL,
      intervalMs: ops.sentinelIntervalMs || ENV_INTERVAL_MS,
    };
  } catch {
    return { model: ENV_SENTINEL_MODEL, intervalMs: ENV_INTERVAL_MS };
  }
}
// Per-market cooldown — don't re-check the same market within this window.
const SENTINEL_COOLDOWN_MS = parseInt(process.env.SENTINEL_COOLDOWN_MS || String(3.5 * 60 * 60_000), 10);
// How many markets to check concurrently per sweep.
const SENTINEL_CONCURRENCY = parseInt(process.env.SENTINEL_CONCURRENCY || "6", 10);
// Triage score threshold: markets scoring above this get a Sonnet deep check.
// 0-100 scale. 30 = fairly liberal — we'd rather spend a Sonnet call than miss
// a settled market on a real-money platform.
const TRIAGE_THRESHOLD = parseInt(process.env.SENTINEL_TRIAGE_THRESHOLD || "30", 10);

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

// --- Types -------------------------------------------------------------------

type MarketInput = {
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
  triageScore?: number;
  action: "closed" | "skipped" | "below_threshold" | "triage_skip" | "error";
  error?: string;
};

// --- Tier 1: Haiku Quick Scan ------------------------------------------------

const TRIAGE_TOOL = {
  name: "report_triage",
  description:
    "Report how likely it is that this market's outcome MAY ALREADY BE SETTLED " +
    "based on the category, title, time elapsed, and your general knowledge. " +
    "Call this exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      reasoning: {
        type: "string" as const,
        description:
          "Brief reasoning: what kind of event is this? Has enough time " +
          "passed that the outcome might already be known? Are there signals " +
          "in the title (e.g. a specific match date, a past event, a near-term " +
          "deadline) suggesting it may be resolved?",
      },
      score: {
        type: "number" as const,
        description:
          "0-100 likelihood that a web search would reveal this outcome " +
          "is ALREADY settled. 0 = definitely still open (far future event). " +
          "100 = almost certainly settled (past event, expired deadline). " +
          "Score high (70+) for: past dates, completed tournaments, expired " +
          "deadlines. Score medium (30-70) for: ongoing events where the " +
          "outcome might have been decided. Score low (0-30) for: future events, " +
          "long-running conditions with no deadline pressure.",
      },
    },
    required: ["reasoning", "score"],
  },
};

async function triageMarket(market: MarketInput): Promise<{ score: number; reasoning: string } | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const now = new Date();
  const elapsed = Date.now() - Date.parse(market.createdAt || now.toISOString());
  const remaining = Date.parse(market.resolutionAt) - Date.now();
  const elapsedHours = Math.round(elapsed / 3_600_000);
  const remainingHours = Math.round(remaining / 3_600_000);

  const started = Date.now();
  try {
    const response = await anthropic.messages.create({
      model: TRIAGE_MODEL,
      max_tokens: 400,
      system: `You are a quick-scan triage agent for a prediction market platform. Your ONLY job is to estimate how likely it is that a market's outcome has ALREADY been settled by real-world events, based on the title, category, and timing. You have NO web access — use only what you can infer from the title and dates. Current date/time: ${now.toISOString()} (platform timezone: ${getPlatformTimezone()})`,
      tools: [TRIAGE_TOOL as unknown as Anthropic.Tool],
      tool_choice: { type: "tool" as const, name: "report_triage" },
      messages: [{
        role: "user",
        content: `Quick-scan this market. How likely is it that the outcome is ALREADY settled?\n\nTITLE: ${market.titleEn}\nCATEGORY: ${market.category}\nOPENED: ${elapsedHours}h ago\nSCHEDULED RESOLUTION: ${remainingHours > 0 ? `in ${remainingHours}h` : `${Math.abs(remainingHours)}h overdue`}\nRESOLUTION CRITERION: ${(market.resolutionCriterion || "Not specified").slice(0, 200)}`,
      }],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = response.usage as any;
    await recordAiUsage({
      feature: "sentinel", model: TRIAGE_MODEL,
      inputTokens: u?.input_tokens ?? 0,
      outputTokens: u?.output_tokens ?? 0,
      ok: true, latencyMs: Date.now() - started,
      detail: `triage · ${market.titleEn.slice(0, 80)}`,
    });

    const toolUse = response.content.find(
      (b) => b.type === "tool_use" && b.name === "report_triage",
    );
    if (!toolUse || toolUse.type !== "tool_use") return null;

    const raw = toolUse.input as Record<string, unknown>;
    const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
    const reasoning = String(raw.reasoning || "");
    return { score, reasoning };
  } catch (err) {
    await recordAiUsage({
      feature: "sentinel", model: TRIAGE_MODEL, ok: false,
      latencyMs: Date.now() - started,
      errorType: (err as Error).message?.slice(0, 200),
      detail: `triage · ${market.titleEn.slice(0, 80)}`,
    });
    // On triage error, escalate to deep check (fail-open for safety)
    return { score: 100, reasoning: `Triage error — escalating: ${(err as Error).message}` };
  }
}

// --- Tier 2: Sonnet Deep Check -----------------------------------------------

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

async function deepCheckMarket(market: MarketInput, sentinelModel?: string): Promise<SentinelResult> {
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
    await recordAiUsage({
      feature: "sentinel", model: SENTINEL_MODEL, ok: false,
      latencyMs: Date.now() - started,
      errorType: (err as Error).message?.slice(0, 200),
      detail: `deep · ${market.titleEn.slice(0, 80)}`,
    });
    return fail((err as Error).message);
  }
}

// --- Sweep Logic (two-tier) --------------------------------------------------

/** Run one sentinel sweep across all live markets.
 *  Tier 1: Haiku triage (all markets, cheap). Tier 2: Sonnet deep (flagged only). */
export async function runSentinelSweep(): Promise<SentinelResult[]> {
  const results: SentinelResult[] = [];
  const now = Date.now();

  // Clean stale cooldown entries to prevent memory leak. Use the cooldown
  // window so entries survive long enough to actually enforce the cooldown.
  const cleanupThreshold = Math.max(SENTINEL_COOLDOWN_MS, 3_600_000);
  for (const [id, ts] of lastChecked.entries()) {
    if (now - ts > cleanupThreshold) lastChecked.delete(id);
  }

  let allMarkets;
  try {
    allMarkets = (await marketStore.values()).filter((m) => m.status === "LIVE");
  } catch (err) {
    console.error("[sentinel] Failed to read markets:", err);
    return results;
  }

  if (allMarkets.length === 0) return results;

  // Build the due list (cooldown + skip-near-close)
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

  // --- Tier 1: Haiku triage (all due markets, concurrent) ---
  const triageResults = await Promise.allSettled(
    due.map(async (m) => ({ market: m, triage: await triageMarket(m) })),
  );

  const flagged: { market: (typeof due)[number]; triageScore: number }[] = [];
  for (let i = 0; i < triageResults.length; i++) {
    const r = triageResults[i];
    if (r.status === "fulfilled" && r.value.triage) {
      const score = r.value.triage.score;
      if (score >= TRIAGE_THRESHOLD) {
        flagged.push({ market: r.value.market, triageScore: score });
      } else {
        results.push({
          marketId: r.value.market.id,
          title: r.value.market.titleEn,
          determined: false, outcome: "UNKNOWN", confidence: 0,
          evidence: "", triageScore: score,
          action: "triage_skip",
        });
      }
    } else if (r.status === "rejected") {
      // Triage failed — escalate to deep check (fail-open for safety)
      flagged.push({ market: due[i], triageScore: 100 });
    }
  }

  if (flagged.length === 0) return results;

  console.log(`[sentinel] Triage: ${due.length} scanned, ${flagged.length} flagged for deep check (threshold: ${TRIAGE_THRESHOLD})`);

  // --- Tier 2: Sonnet deep check (flagged markets only, bounded concurrency) ---
  const liveConfig = await getLiveConfig();
  const processOne = async (item: (typeof flagged)[number]): Promise<SentinelResult> => {
    const result = await deepCheckMarket(item.market, liveConfig.model);
    result.triageScore = item.triageScore;

    if (result.action === "error") return result;

    if (!result.determined || result.confidence < SENTINEL_CONFIDENCE_THRESHOLD) {
      result.action = result.determined ? "below_threshold" : "skipped";
      return result;
    }

    // HIGH CONFIDENCE: outcome locked — close market + store AI recommendation.
    // Lock the market to prevent a concurrent buyPosition from having its pool
    // increment overwritten by the sentinel's read-modify-write.
    try {
      await withLock(`market:${item.market.id}`, async () => {
        const fresh = await marketStore.get(item.market.id);
        if (!fresh || fresh.status !== "LIVE") {
          result.action = "skipped";
          return;
        }
        fresh.status = "CLOSED";
        fresh.updatedAt = new Date().toISOString();
        // Store AI recommendation for the resolver queue
        fresh.sentinelOutcome = result.outcome === "YES" || result.outcome === "NO" ? result.outcome : null;
        fresh.sentinelEvidence = result.evidence?.slice(0, 500) || null;
        fresh.sentinelReasoning = result.reasoning?.slice(0, 1000) || null;
        fresh.sentinelSourceUrl = result.sourceUrl || null;
        fresh.sentinelConfidence = result.confidence;
        fresh.sentinelClosedAt = new Date().toISOString();
        await marketStore.set(fresh);
        result.action = "closed";
      });

      if (result.action === "closed") {
        audit({
          category: "SYSTEM",
          action: "sentinel.market_closed",
          actorId: "sentinel_agent",
          targetType: "Market",
          targetId: item.market.id,
          payload: {
            outcome: result.outcome,
            confidence: result.confidence,
            evidence: result.evidence,
            reasoning: result.reasoning,
            sourceUrl: result.sourceUrl,
            triageScore: item.triageScore,
            model: liveConfig.model,
            triageModel: TRIAGE_MODEL,
          },
        });

        // Notify admins that this market is ready for resolution with AI recommendation
        try {
          const { notifyAdminMarketResolution } = await import("./notification-service");
          await notifyAdminMarketResolution("sentinel_agent", {
            title: item.market.titleEn,
            marketId: item.market.id,
          });
        } catch { /* notification is best-effort */ }
      }
    } catch (err) {
      result.action = "error";
      result.error = `Close failed: ${(err as Error).message}`;
    }

    return result;
  };

  // Process in bounded-concurrency batches
  for (let i = 0; i < flagged.length; i += SENTINEL_CONCURRENCY) {
    const batch = flagged.slice(i, i + SENTINEL_CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(processOne));
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      if (s.status === "fulfilled") {
        results.push(s.value);
      } else {
        results.push({
          marketId: batch[j].market.id, title: batch[j].market.titleEn,
          determined: false, outcome: "UNKNOWN", confidence: 0,
          evidence: "", triageScore: batch[j].triageScore,
          action: "error", error: String(s.reason),
        });
      }
    }
  }

  return results;
}

// --- Health alerting ---------------------------------------------------------

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
let sweepRunning = false;
let currentIntervalMs = ENV_INTERVAL_MS;

async function scheduleSweep(): Promise<void> {
  const cfg = await getLiveConfig();
  const newInterval = cfg.intervalMs;

  // Restart the interval if the admin changed it
  if (intervalId && newInterval !== currentIntervalMs) {
    clearInterval(intervalId);
    intervalId = null;
    console.log(`[sentinel] Interval changed: ${currentIntervalMs / 1000}s → ${newInterval / 1000}s`);
    currentIntervalMs = newInterval;
  }

  if (intervalId) return; // already running at the right interval

  currentIntervalMs = newInterval;
  intervalId = setInterval(async () => {
    if (sweepRunning) return;
    sweepRunning = true;
    try {
      const r = await runSentinelSweep();
      const closed = r.filter((x) => x.action === "closed");
      const errors = r.filter((x) => x.action === "error");
      const triaged = r.filter((x) => x.action === "triage_skip");
      if (closed.length > 0 || errors.length > 0) {
        console.log(`[sentinel] Sweep: ${closed.length} closed, ${errors.length} errors, ${triaged.length} triage-skipped, ${r.length - closed.length - errors.length - triaged.length} deep-skipped`);
      }
      await maybeAlertOnSweep(r);
      // Check if interval was changed by admin while we were sweeping
      await scheduleSweep();
    } catch (err) {
      console.error("[sentinel] Sweep error:", err);
    } finally {
      sweepRunning = false;
    }
  }, currentIntervalMs);
}

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

  getLiveConfig().then((cfg) => {
    console.log(`[sentinel] Starting two-tier (interval: ${cfg.intervalMs / 1000}s, triage: ${TRIAGE_MODEL}, deep: ${cfg.model}, threshold: ${SENTINEL_CONFIDENCE_THRESHOLD}%, triage cutoff: ${TRIAGE_THRESHOLD})`);
  }).catch(() => {});

  // First sweep after boot delay
  setTimeout(() => {
    runSentinelSweep()
      .then(async (r) => {
        const closed = r.filter((x) => x.action === "closed");
        const triaged = r.filter((x) => x.action === "triage_skip");
        if (closed.length > 0) console.log(`[sentinel] Boot sweep: ${closed.length} closed, ${triaged.length} triage-skipped`);
        await maybeAlertOnSweep(r);
        // Start the recurring interval
        await scheduleSweep();
      })
      .catch((err) => console.error("[sentinel] Boot sweep error:", err));
  }, 10_000);
}

/** Force the sentinel to re-read config and apply any interval change NOW,
 *  instead of waiting for the current interval to fire. Called by the admin
 *  action after saving a new interval. No-op if the sentinel isn't running. */
export async function applySentinelConfigChange(): Promise<void> {
  if (!intervalId) return;
  await scheduleSweep();
}

export function stopSentinel(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[sentinel] Stopped");
  }
}
