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
import { loadConfig, saveConfig } from "./config-store";

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
    // On triage error, escalate to deep check — but at the THRESHOLD, not 100.
    // Blasting score 100 on every API glitch would trigger expensive Sonnet + web
    // calls on EVERY market in the sweep. The threshold is enough to trigger the
    // deep check for safety without suggesting high certainty.
    return { score: TRIAGE_THRESHOLD, reasoning: `Triage error — escalating at threshold: ${(err as Error).message}` };
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
export async function runSentinelSweep(opts?: { force?: boolean }): Promise<SentinelResult[]> {
  const results: SentinelResult[] = [];
  // Hard budget choke point: EVERY Anthropic call (triage + deep) flows through
  // this function, so a paused check here guarantees zero paid AI spend while
  // paused — before a single market is read or a model is touched. The only
  // caller that runs a sweep on purpose (runSentinelNow) clears `paused` first,
  // so this never blocks a legitimate manual run.
  if (paused) return results;
  const now = Date.now();
  const force = opts?.force === true;

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

  // Build the due list. A manual "Run now" (force) bypasses the per-market
  // cooldown so the operator can re-check immediately; scheduled sweeps still
  // respect it. The <5-min-to-close skip stays in both modes (those resolve via
  // auto-close imminently).
  // Minimum market age before the sentinel will check it (prevents hallucinated
  // closures on brand-new markets where no real-world event has had time to occur).
  const MIN_AGE_MS = 30 * 60_000; // 30 minutes

  const due = allMarkets.filter((market) => {
    if (!force) {
      const lastCheck = lastChecked.get(market.id) ?? 0;
      if (now - lastCheck < SENTINEL_COOLDOWN_MS) return false;
    }
    // Skip markets closing within 5 minutes — auto-close handles those
    const timeToClose = Date.parse(market.resolutionAt) - now;
    if (timeToClose < 5 * 60_000) return false;
    // Skip very new markets — give them time to exist before checking.
    // A market published 5 minutes ago cannot have a real-world outcome yet.
    const age = now - Date.parse(market.createdAt);
    if (age < MIN_AGE_MS) return false;
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
    // Hard guard: the outcome must be a concrete YES or NO — never close a
    // market on UNKNOWN. The model SAID determined=true but if it also says
    // outcome=UNKNOWN that's contradictory and we must not act on it.
    if (result.outcome !== "YES" && result.outcome !== "NO") {
      result.action = "skipped";
      result.error = "determined=true but outcome=UNKNOWN — contradictory, skipping";
      return result;
    }
    // Hard guard: evidence must be non-empty. A "determined" result with no
    // evidence string is likely a hallucination or a model that skipped the
    // web search step. Officers need evidence to verify the AI's call.
    if (!result.evidence || result.evidence.trim().length < 10) {
      console.warn(`[sentinel] Model claimed determined=true for market ${result.marketId} but provided no evidence — possible hallucination`);
      result.action = "error";
      result.error = "determined=true but evidence too short — possible hallucination, skipping";
      return result;
    }

    // HIGH CONFIDENCE: outcome locked — close market + store AI recommendation.
    // The lock still serialises the status re-check, but the WRITE is now a narrow
    // stamp: this is the LIVE→CLOSED transition, so bets may be committing
    // concurrently, and the full-row write this used to do rewrote yesPool/noPool
    // from a snapshot read moments earlier — silently erasing those stakes.
    try {
      await withLock(`market:${item.market.id}`, async () => {
        const fresh = await marketStore.get(item.market.id);
        if (!fresh || fresh.status !== "LIVE") {
          result.action = "skipped";
          return;
        }
        const nowIso = new Date().toISOString();
        await marketStore.stamp(item.market.id, {
          status: "CLOSED",
          updatedAt: nowIso,
          // AI recommendation for the resolver queue
          sentinelOutcome: result.outcome === "YES" || result.outcome === "NO" ? result.outcome : null,
          sentinelEvidence: result.evidence?.slice(0, 500) || null,
          sentinelReasoning: result.reasoning?.slice(0, 1000) || null,
          sentinelSourceUrl: result.sourceUrl || null,
          sentinelConfidence: result.confidence,
          sentinelClosedAt: nowIso,
        });
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
    // Budget guard: if the operator paused mid-sweep, stop launching new deep
    // (Sonnet + web-search) checks. In-flight requests already dispatched in the
    // previous batch will finish, but no further paid calls start.
    if (paused) {
      console.warn(`[sentinel] paused mid-sweep — stopping before ${flagged.length - i} remaining deep check(s)`);
      break;
    }
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

// --- Background Runner (durable, self-rescheduling) --------------------------
//
// The schedule is PERSISTED (SystemConfig key "sentinel.schedule") so the
// countdown to the next sweep survives Railway deploys: a restart resumes the
// SAME nextSweepAt instead of resetting the clock. Without this, frequent pushes
// (each restarting the process) reset a fresh in-memory timer and the sweep
// could be starved indefinitely. We use a self-rescheduling setTimeout (not
// setInterval) so each tick re-reads the live interval and re-persists the next
// fire time — giving the admin UI a precise, deploy-proof countdown.

const SCHEDULE_KEY = "sentinel.schedule";
// On boot, if the persisted nextSweepAt was missed while we were down, run after
// this short grace (not instantly) so a deploy storm doesn't hammer the API.
const BOOT_GRACE_MS = 90_000;

type SentinelSchedule = { nextSweepAt: number | null; lastSweepAt: number | null; intervalMs: number; paused?: boolean; pausedRemainingMs?: number | null };
type SweepSummary = { closed: number; errors: number; total: number; at: number };

let timer: ReturnType<typeof setTimeout> | null = null;
let sweepRunning = false;
let currentIntervalMs = ENV_INTERVAL_MS;
let nextSweepAt: number | null = null;
let lastSweepAt: number | null = null;
let lastSummary: SweepSummary | null = null;
// Operator pause switch. When true the scheduler is disarmed and NO sweep —
// and therefore NO Anthropic API call — may start. Persisted (below) so a
// deploy/restart can never silently resume paid AI spend. This is the key
// budget-safety invariant: paused ⇒ zero model calls until explicitly resumed.
let paused = false;
// How many ms were LEFT on the countdown at the moment of pause. Resume re-arms
// with exactly this (not a fresh interval), so the timer continues from where it
// stopped. Stored as a DURATION (not a wall-clock target) and persisted, so it is
// preserved verbatim across restarts and however long the pause lasts — resume a
// year later and it still has the same time remaining.
let pausedRemainingMs: number | null = null;

function sentinelEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.SENTINEL_ENABLED !== "false";
}

async function persistSchedule(): Promise<void> {
  // Always persist — including when paused (nextSweepAt is null) — so the paused
  // flag AND the remembered remaining survive restarts. (Previously this
  // early-returned on a null target.)
  await saveConfig(SCHEDULE_KEY, { nextSweepAt, lastSweepAt, intervalMs: currentIntervalMs, paused, pausedRemainingMs } satisfies SentinelSchedule);
}

/** Arm the one-shot timer to fire `delayMs` from now and record/persist the
 *  target. Pass an explicit `targetAt` to resume an existing target across a
 *  restart (so the countdown does not reset on deploy). */
function arm(delayMs: number, targetAt?: number): void {
  if (timer) { clearTimeout(timer); timer = null; }
  // Paused ⇒ never schedule a sweep. Leave nextSweepAt null and persist so the
  // paused state (not a stale target) is what survives a restart.
  if (paused) { nextSweepAt = null; void persistSchedule(); return; }
  nextSweepAt = targetAt ?? (Date.now() + Math.max(0, delayMs));
  const wait = Math.max(0, nextSweepAt - Date.now());
  void persistSchedule();
  timer = setTimeout(fireSweep, wait);
}

async function fireSweep(): Promise<void> {
  // Budget guard (defense-in-depth): if paused between arming and firing, do
  // nothing and do NOT re-arm — no Anthropic call may start while paused.
  if (paused) { nextSweepAt = null; void persistSchedule(); return; }
  if (sweepRunning) { arm(15_000); return; } // a manual run is in flight — retry shortly
  sweepRunning = true;
  try {
    const r = await runSentinelSweep();
    recordSweepSummary(r);
    await maybeAlertOnSweep(r);
  } catch (err) {
    console.error("[sentinel] Sweep error:", err);
  } finally {
    sweepRunning = false;
    lastSweepAt = Date.now();
    // Re-read the live interval each cycle so an admin change takes effect.
    currentIntervalMs = (await getLiveConfig()).intervalMs;
    arm(currentIntervalMs);
  }
}

function recordSweepSummary(r: SentinelResult[]): void {
  const closed = r.filter((x) => x.action === "closed").length;
  const errors = r.filter((x) => x.action === "error").length;
  lastSummary = { closed, errors, total: r.length, at: Date.now() };
  if (closed > 0 || errors > 0) {
    const triaged = r.filter((x) => x.action === "triage_skip").length;
    console.log(`[sentinel] Sweep: ${closed} closed, ${errors} errors, ${triaged} triage-skipped, ${r.length - closed - errors - triaged} deep-skipped`);
  }
}

export type BootDecision = { kind: "resume" | "grace" | "first"; targetAt: number | null; delayMs: number };

/**
 * Pure decision for what to do on boot, given the persisted schedule. Extracted
 * so the deploy-proof behaviour is unit-testable without real timers:
 *  - resume: a future target survives the restart → keep the SAME nextSweepAt
 *  - grace:  the target was missed while we were down → run after a short grace
 *  - first:  nothing persisted (first ever boot) → one full interval out
 * All times are epoch-ms (UTC), so this is timezone-independent by construction.
 */
export function computeBootSchedule(
  persisted: { nextSweepAt: number | null } | null,
  now: number,
  intervalMs: number,
  graceMs: number,
): BootDecision {
  if (persisted?.nextSweepAt != null && persisted.nextSweepAt > now) {
    return { kind: "resume", targetAt: persisted.nextSweepAt, delayMs: persisted.nextSweepAt - now };
  }
  if (persisted?.nextSweepAt != null) {
    return { kind: "grace", targetAt: null, delayMs: graceMs };
  }
  return { kind: "first", targetAt: null, delayMs: intervalMs };
}

export function startSentinel(): void {
  if (timer) return;
  if (!process.env.ANTHROPIC_API_KEY) { console.warn("[sentinel] ANTHROPIC_API_KEY not set — sentinel disabled"); return; }
  if (process.env.SENTINEL_ENABLED === "false") { console.warn("[sentinel] SENTINEL_ENABLED=false — sentinel disabled"); return; }

  (async () => {
    const cfg = await getLiveConfig();
    currentIntervalMs = cfg.intervalMs;
    const persisted = await loadConfig<SentinelSchedule>(SCHEDULE_KEY);
    if (persisted?.lastSweepAt != null) lastSweepAt = persisted.lastSweepAt;
    // Honour a persisted pause across restarts — a deploy must never silently
    // resume paid AI spend the operator had paused.
    if (persisted?.paused) {
      paused = true;
      // Restore the remembered remaining so a resume — even now, after this
      // restart — continues from exactly where the countdown was paused.
      pausedRemainingMs = persisted.pausedRemainingMs ?? null;
      nextSweepAt = null;
      console.log(`[sentinel] paused (persisted) — scheduler disarmed, no sweeps until resumed${pausedRemainingMs != null ? ` (${Math.round(pausedRemainingMs / 1000)}s remembered)` : ""}`);
      return;
    }
    const decision = computeBootSchedule(persisted, Date.now(), currentIntervalMs, BOOT_GRACE_MS);
    arm(decision.delayMs, decision.targetAt ?? undefined);
    console.log(`[sentinel] ${decision.kind} — next sweep in ${Math.round(decision.delayMs / 1000)}s (deploy-proof, interval ${currentIntervalMs / 1000}s, triage ${TRIAGE_MODEL}, deep ${cfg.model})`);
  })().catch((err) => console.error("[sentinel] Start error:", err));
}

/** Live status for the admin countdown widget. Falls back to persisted values if
 *  the in-memory schedule hasn't hydrated yet (status read right after boot). */
export async function getSentinelStatus(): Promise<{
  enabled: boolean;
  running: boolean;
  sweeping: boolean;
  intervalMs: number;
  nextSweepAt: number | null;
  lastSweepAt: number | null;
  lastSummary: SweepSummary | null;
  /** Operator pause switch — true ⇒ scheduler disarmed, no AI calls until resumed. */
  paused: boolean;
  /** When paused, how long was left on the countdown (ms) — what Resume restores. */
  pausedRemainingMs: number | null;
  /** Server clock at the moment of this read (epoch-ms). The client diffs this
   *  against its own clock to render an accurate countdown even if the admin's
   *  device clock is wrong/changed — the timer is driven by server time, UTC. */
  serverNow: number;
  /** Platform timezone (e.g. Africa/Dar_es_Salaam) for formatting wall-clock times. */
  timezone: string;
}> {
  let next = nextSweepAt;
  let last = lastSweepAt;
  let interval = currentIntervalMs;
  let isPaused = paused;
  let remembered = pausedRemainingMs;
  if (next == null) {
    const persisted = await loadConfig<SentinelSchedule>(SCHEDULE_KEY);
    if (persisted) {
      next = persisted.nextSweepAt; last = persisted.lastSweepAt; interval = persisted.intervalMs || interval;
      // Trust a persisted pause if the in-memory flag hasn't hydrated yet (status
      // read right after boot, before startSentinel runs).
      if (persisted.paused) { isPaused = true; remembered = persisted.pausedRemainingMs ?? remembered; }
    }
  }
  return {
    enabled: sentinelEnabled(), running: !!timer, sweeping: sweepRunning,
    intervalMs: interval, nextSweepAt: isPaused ? null : next, lastSweepAt: last, lastSummary,
    paused: isPaused, pausedRemainingMs: isPaused ? remembered : null,
    serverNow: Date.now(), timezone: getPlatformTimezone(),
  };
}

/** Pause the sentinel: disarm the scheduler so NO sweep — and no Anthropic call —
 *  can start until resumed. Persisted so it survives restarts. Idempotent. */
export async function pauseSentinel(officerId: string): Promise<{ paused: true; remainingMs: number | null }> {
  // Memorize how long was left so Resume continues from exactly here. A second
  // pause (when already paused, nextSweepAt null) keeps the originally-captured
  // value rather than overwriting it.
  if (nextSweepAt != null) pausedRemainingMs = Math.max(0, nextSweepAt - Date.now());
  paused = true;
  if (timer) { clearTimeout(timer); timer = null; }
  nextSweepAt = null;
  await persistSchedule();
  audit({ category: "ADMIN", action: "sentinel.paused", actorId: officerId, targetType: "System", targetId: "market-sentinel", payload: { remainingMs: pausedRemainingMs } });
  return { paused: true, remainingMs: pausedRemainingMs };
}

/** Resume the sentinel after a pause: clear the flag and re-arm with the EXACT
 *  time that was left when paused (continues from where it stopped — preserved
 *  across restarts and any pause duration). Falls back to a full interval only
 *  if nothing was memorized. No-op (stays paused) if the sentinel is disabled. */
export async function resumeSentinel(officerId: string): Promise<{ paused: boolean; nextSweepAt: number | null }> {
  if (!sentinelEnabled()) { return { paused, nextSweepAt }; }
  paused = false;
  currentIntervalMs = (await getLiveConfig()).intervalMs;
  const resumeDelayMs = pausedRemainingMs != null ? pausedRemainingMs : currentIntervalMs;
  pausedRemainingMs = null;
  arm(resumeDelayMs);
  audit({ category: "ADMIN", action: "sentinel.resumed", actorId: officerId, targetType: "System", targetId: "market-sentinel", payload: { nextSweepAt, intervalMs: currentIntervalMs, resumedWithRemainingMs: resumeDelayMs } });
  return { paused: false, nextSweepAt };
}

/** Reset the countdown: schedule the next sweep one full interval from now.
 *  No-op (returns current state) when the sentinel is disabled, so the timer is
 *  never armed without an API key / when SENTINEL_ENABLED=false. */
export async function resetSentinelTimer(officerId = "admin"): Promise<{ nextSweepAt: number | null; intervalMs: number }> {
  if (!sentinelEnabled()) return { nextSweepAt, intervalMs: currentIntervalMs };
  paused = false; // resetting the timer also clears a pause
  pausedRemainingMs = null; // Reset is a deliberate fresh start (full interval)
  currentIntervalMs = (await getLiveConfig()).intervalMs;
  arm(currentIntervalMs);
  audit({ category: "ADMIN", action: "sentinel.timer_reset", actorId: officerId, targetType: "System", targetId: "market-sentinel", payload: { nextSweepAt, intervalMs: currentIntervalMs } });
  return { nextSweepAt, intervalMs: currentIntervalMs };
}

/** Run a sweep NOW (the "finish timer & execute" button), then re-arm the
 *  countdown one interval out. Idempotent against the scheduled tick via the
 *  sweepRunning guard. Returns the sweep summary. */
export async function runSentinelNow(officerId = "admin"): Promise<{ ok: boolean; summary?: SweepSummary; reason?: string }> {
  if (!sentinelEnabled()) return { ok: false, reason: "Sentinel is disabled (no API key or SENTINEL_ENABLED=false)." };
  if (sweepRunning) return { ok: false, reason: "A sweep is already running — try again in a moment." };
  // An explicit manual run is a deliberate operator action — it clears any pause
  // (and its memorized remaining) and resumes normal scheduling afterwards.
  paused = false;
  pausedRemainingMs = null;
  if (timer) { clearTimeout(timer); timer = null; }
  sweepRunning = true;
  try {
    // force: bypass the per-market cooldown so a manual run always re-checks.
    const r = await runSentinelSweep({ force: true });
    recordSweepSummary(r);
    await maybeAlertOnSweep(r);
    audit({ category: "ADMIN", action: "sentinel.manual_run", actorId: officerId, targetType: "System", targetId: "market-sentinel", payload: lastSummary ? { ...lastSummary } : undefined });
    return { ok: true, summary: lastSummary ?? undefined };
  } catch (err) {
    return { ok: false, reason: String((err as Error)?.message ?? err) };
  } finally {
    sweepRunning = false;
    lastSweepAt = Date.now();
    currentIntervalMs = (await getLiveConfig()).intervalMs;
    arm(currentIntervalMs);
  }
}

/** Re-arm with the current interval — called after an admin changes the interval
 *  so the new cadence takes effect immediately (resets the countdown). */
export async function applySentinelConfigChange(): Promise<void> {
  if (!timer) return;
  currentIntervalMs = (await getLiveConfig()).intervalMs;
  arm(currentIntervalMs);
}

export function stopSentinel(): void {
  if (timer) { clearTimeout(timer); timer = null; console.log("[sentinel] Stopped"); }
}
