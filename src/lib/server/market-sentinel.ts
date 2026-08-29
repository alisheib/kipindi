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
// ONE host rule on the platform — the same function the price feed and the Up & Down
// settlement check use. Two copies is two answers to one question.
import { hostMatchesDomain } from "./updown-feed";
import { assertAiBudget, describeAiBudgetBlock, recordAiUsage } from "./ai-usage";
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

  // ── THE SPEND GATE ────────────────────────────────────────────────────────
  // The operator's AI credit limit, enforced BEFORE the call. The sentinel is the
  // platform's single biggest AI spender — $68.36 over 2,962 calls, all of it
  // uncapped, including 383 calls costing $15.38 in ONE HOUR (2026-06-26 13:00) and
  // a 1,427-call burst over 13 hours once the provider account had run dry.
  // `assertAiBudget` was wired into poll generation only; the sentinel and the
  // Up & Down oracle never consulted it.
  //
  // Failing here is safe by construction: `deepCheckMarket` NEVER writes to a market
  // and NEVER moves money — the caller decides. A blocked check leaves the market
  // exactly as it was, open for a human officer, which is the same outcome as any
  // other sentinel error. It is reported as an `error` action, not as "not settled",
  // so nothing reads a spend ceiling as a verdict about the world.
  const budget = await assertAiBudget("sentinel");
  if (!budget.ok) return fail(describeAiBudgetBlock(budget));

  const now = new Date().toISOString();
  const criterion = market.resolutionCriterion?.trim() || "Not specified";

  /**
   * ⭐ THE APPROVED SOURCE STOPS BEING A REQUEST AND BECOMES A FENCE.
   *
   * 🔴 MEASURED ON PRODUCTION 2026-08-28: 12 markets at confidence ≥ 90, and the AI had
   * cited the market's own approved source on NOT ONE of them. Every one was refused by
   * `decideAutoResolve` — correctly — so auto-resolve sealed nothing while the operator
   * had it switched on. The model was not disobeying: it was told *"resolve against this
   * if given"* in prose and then handed an UNRESTRICTED `web_search`. News sites outrank
   * governing-body sites for a finished fixture, so it read the Washington Post, cited it,
   * and stopped — having answered the question correctly and uselessly.
   *
   * ⛔ SO THE PROSE IS NOT THE MECHANISM ANY MORE. When the market names an approved
   * source, both server tools are pinned to that host with `allowed_domains`, enforced by
   * Anthropic's own tool service. This is the same containment the Up & Down oracle uses
   * (`updown-oracle.ts`), and the same lesson: a rule the model is ASKED to follow is a
   * rule that gets followed most of the time, which on a real-money settlement path is
   * indistinguishable from not having it.
   *
   * ⚠️ `web_fetch` ONLY OPENS URLS ALREADY IN THE CONVERSATION. The user prompt names the
   * approved source, which satisfies that for the source page itself, and the pinned
   * SEARCH supplies the deeper links (a fixture page, a result page) that the source's own
   * homepage would not. That is why both are armed and not just the fetch.
   *
   * ⚠️ AND FAILING TO FIND IT IS A LEGITIMATE ANSWER. If the approved source genuinely
   * does not settle the question, the model now says `determined=false` instead of
   * substituting a site that could never seal the market. That is the honest outcome and
   * the fail-closed one — the market goes to the officers, which is where it went anyway.
   */
  let approvedHost: string | null = null;
  if (market.sourceUrl) {
    try {
      approvedHost = new URL(market.sourceUrl).hostname;
    } catch {
      // A market whose stored sourceUrl will not parse has no fence to build. It falls to
      // the unpinned path below, exactly as a market with no approved source does, and the
      // caller's `sentinelSourceVerdict` still judges whatever gets cited.
      approvedHost = null;
    }
  }

  const searchTool = {
    type: ai.webSearchTool.type,
    name: ai.webSearchTool.name,
    max_uses: 5,
    ...(approvedHost ? { allowed_domains: [approvedHost] } : {}),
  } as unknown as Anthropic.Tool;

  const tools: Anthropic.Tool[] = [OUTCOME_TOOL as unknown as Anthropic.Tool, searchTool];
  if (approvedHost) {
    tools.push({
      type: ai.webFetchTool.type,
      name: ai.webFetchTool.name,
      max_uses: 4,
      allowed_domains: [approvedHost],
    } as unknown as Anthropic.Tool);
  }

  const systemPrompt = `You are the 50pick Market Sentinel — a real-time integrity monitor for a LICENSED, REAL-MONEY prediction-market platform in Tanzania. Real money is at stake. If a market stays open after its outcome is already settled, players can bet on a known result and the house loses money. If you close a market whose outcome is NOT yet settled, you block legitimate betting. Both are costly — be VIGILANT and PRECISE.

CURRENT DATE/TIME: ${now} (platform timezone: ${getPlatformTimezone()})

YOUR JOB
Decide whether this market's outcome is already IRREVERSIBLY SETTLED ("locked") by real-world events — i.e. nothing that can still happen could change the YES/NO result. The platform closes a market to new bets only when it is locked. A human officer still does the final payout; you never pay out.

${approvedHost
  ? `YOUR TOOLS ARE PINNED TO THIS MARKET'S APPROVED SOURCE: ${approvedHost}. Search and fetch reach that host and nothing else — this is enforced, not requested, so there is no other site to try. Read the approved source and report the URL you actually opened in sourceUrl.

Work it like this: SEARCH ${approvedHost} for the fixture/event page, then FETCH the most specific page you find so you are reading the live page rather than a crawl snippet. Report the URL you fetched.

If ${approvedHost} does not settle the question — the page does not exist, does not carry the result, or is not specific enough — say so in reasoning and report determined=false. That is the correct answer and a useful one. Do NOT report an outcome you could not read on the approved source.`
  : `YOU MUST USE WEB SEARCH — never answer from memory. The deciding event may have happened minutes ago. Search for the latest score/result/data. Search more than once, from different angles, if the first result is unclear or incomplete.

This market names no approved source, so cite the most authoritative page you actually read in sourceUrl — a governing body, an official competition site, or a primary operator of the event. The platform checks that citation against its trusted-source register, so a citation from a random aggregator cannot seal this market.`}

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
APPROVED SOURCE: ${market.sourceUrl || "none provided"}${approvedHost ? ` — your search and fetch tools reach ${approvedHost} ONLY` : ""}
MARKET OPENED: ${market.createdAt || "unknown"}
SCHEDULED RESOLUTION: ${market.resolutionAt}

${approvedHost
  ? `Search ${approvedHost} for this event, fetch the page that carries the result, work through the steps, then call report_outcome. Report determined=true ONLY if the YES/NO result is already irreversibly locked AND you read it on ${approvedHost}.`
  : "Search the web for the latest data, work through the steps, then call report_outcome. Report determined=true ONLY if the YES/NO result is already irreversibly locked."}`;

  const started = Date.now();
  try {
    const ask = (t: Anthropic.Tool[]) => anthropic.messages.create({
      model: SENTINEL_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: t,
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: userPrompt }],
    });

    /**
     * 🔴 A BLOCKED APPROVED SOURCE MUST NOT SILENCE THE SENTINEL — MEASURED 2026-08-29.
     *
     * Some sites block Anthropic's crawler, and `allowed_domains` pinned to one of them
     * does NOT degrade: the request is rejected at VALIDATION with
     * `400 invalid_request_error — "The following domains are not accessible to our user
     * agent: ['bbc.com']"`, in ~0.3s, before the model does anything. Probed across every
     * host this platform uses: **25 of 25 in use today are reachable**, but `bbc.com` and
     * `reuters.com` are BLOCKED — and both are exactly what an operator would add for a
     * news or finance market.
     *
     * ⛔ WITHOUT THIS RETRY THE PIN IS A REGRESSION for such a market: before it, the
     * unpinned search still produced a recommendation an officer could read; after it, the
     * call hard-errors, the officer sees *"no AI reading recorded"*, and every scheduled
     * check burns a failed request for ever.
     *
     * ⭐ THE FALLBACK IS SAFE BY CONSTRUCTION, AND THE REASON IS THE WHOLE DESIGN: the pin
     * was never what stops a bad citation from sealing a market — `decideAutoResolve` is.
     * It ANDs `sourceMatches`, so a citation gathered off-host CANNOT auto-resolve anything;
     * it can only reach a human, with the "not the approved source" chip beside it. The pin
     * makes the model READ the right site; the gate decides what may SEAL. Falling back
     * therefore trades none of the safety and recovers all of the usefulness.
     *
     * ⚠️ ONE retry, and only for this exact error. Any other failure propagates to the
     * catch below and is metered as an error, unchanged.
     */
    let response;
    try {
      response = await ask(tools);
    } catch (err) {
      const msg = String((err as Error)?.message ?? "");
      if (!approvedHost || !/not accessible to our user agent/i.test(msg)) throw err;
      console.warn(
        `[sentinel] approved source ${approvedHost} is not reachable by the AI's fetcher — ` +
        `retrying UNPINNED for market ${market.id}. The citation gate still refuses to auto-seal an off-host read.`,
      );
      response = await ask([
        OUTCOME_TOOL as unknown as Anthropic.Tool,
        { type: ai.webSearchTool.type, name: ai.webSearchTool.name, max_uses: 5 } as unknown as Anthropic.Tool,
      ]);
    }

    // Meter the spend (best-effort).
    const u = response.usage as { input_tokens?: number; output_tokens?: number; server_tool_use?: { web_search_requests?: number } } | undefined;
    await recordAiUsage({
      feature: "sentinel", model: SENTINEL_MODEL,
      inputTokens: u?.input_tokens ?? 0,
      outputTokens: u?.output_tokens ?? 0,
      webSearches: u?.server_tool_use?.web_search_requests ?? 0,
      ok: true, latencyMs: Date.now() - started,
      detail: `deep · ${market.titleEn.slice(0, 80)}`,
      subjectType: "market", subjectId: market.id,
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
      subjectType: "market", subjectId: market.id,
    });
    return fail((err as Error).message);
  }
}

/**
 * Is this assessment's citation the market's OWN approved source?
 *
 * DERIVED at read time — deliberately NOT a stored column. A derived value cannot go stale
 * against an edited market and needs no migration. One function, two consumers: the
 * `sourceMatches` argument to `decideAutoResolve` (a HARD condition there, because auto
 * mode has no officer in the path) and the chip beside the cited link in the resolver queue
 * (information there, never a suppression — in human mode the officer is about to open that
 * link themselves, and hiding the AI's read would delete what they want to see).
 *
 *   match               cited the market's approved host, or a subdomain of it
 *   different-domain    cited something else — verify before sealing
 *   none-cited          returned no URL at all
 *   no-approved-source  the market has no approved source to compare against
 */
export function sentinelSourceVerdict(
  sentinelSourceUrl: string | null | undefined,
  marketSourceUrl: string | null | undefined,
): "match" | "different-domain" | "none-cited" | "no-approved-source" {
  if (!marketSourceUrl) return "no-approved-source";
  if (!sentinelSourceUrl) return "none-cited";
  let approvedHost: string;
  try {
    approvedHost = new URL(marketSourceUrl).hostname;
  } catch {
    return "no-approved-source";
  }
  return hostMatchesDomain(sentinelSourceUrl, approvedHost) ? "match" : "different-domain";
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
