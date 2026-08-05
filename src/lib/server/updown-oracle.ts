/**
 * Up & Down price oracle — the AI price observation.
 *
 * Given an ASSET and a GRID BOUNDARY, read the price from the asset's declared source
 * and return an observation. It DECIDES nothing and MOVES no money — the caller writes
 * it to the ledger under the boundary's unique key, and the ledger is write-once.
 *
 * ── THE HONEST LIMITATION, STATED UP FRONT ───────────────────────────────────
 * An LLM web-search CANNOT report the price at an exact second. It reports a recent
 * price, with the timestamp the source itself published. That is a real constraint of
 * the resolution engine the owner chose (docs/COMPLIANCE-DECISIONS.md, 2026-07-24),
 * and this module is built to be honest about it rather than paper over it:
 *
 *   · the observation stores `sourceQuotedAt` — THE SOURCE'S OWN TIME, never our
 *     boundary — and every surface shows that;
 *   · a reading whose quoted time sits further from the boundary than
 *     `maxStalenessSeconds` is REFUSED, not rounded into a verdict;
 *   · a boundary that will not confirm VOIDS its rounds and refunds every stake in
 *     full. We never settle on a guessed price.
 *
 * ── WHY THIS IS AFFORDABLE ───────────────────────────────────────────────────
 * One call per ASSET per BOUNDARY, not per round. The reading at 14:30 is the close of
 * the 14:25 round AND the open of the 14:30 round, and is shared by any 15/30-minute
 * round crossing that instant — so 2 assets x 288 boundaries = 576 calls/day no matter
 * how many durations run. The sharing (and the determinism it buys) is enforced by
 * `@@unique([assetId, boundaryAt])` in the DAL, not by convention here.
 *
 * Safety:
 *   · returns an assessment only; the caller does the write under the unique key;
 *   · uses web search — never answers from memory;
 *   · every call is metered through recordAiUsage;
 *   · honours the operator's AI pause switch (the AI-toolkit dropdown, the ONE home
 *     for every AI switch — this module does not add a second one).
 */
import Anthropic from "@anthropic-ai/sdk";
import { ai } from "./ai-config";
import { assertAiBudget, recordAiUsage } from "./ai-usage";
import { getAiOpsConfig } from "./ai-ops-config";
import { getUpDownConfig } from "./updown-config";
import { normalizeDomain } from "./source-registry";
import type { StoredAsset } from "./updown-dal";

// --- Client (singleton — no resource leak across calls) ----------------------

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_UPDOWN_ANTHROPIC: Anthropic | undefined;
}
function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return (globalThis.__50PICK_UPDOWN_ANTHROPIC ??= new Anthropic({ apiKey: key }));
}

/** The live model: env override → admin ai-ops config → code default. */
export async function getOracleModel(): Promise<string> {
  try {
    const ops = await getAiOpsConfig();
    return process.env.UPDOWN_ORACLE_MODEL || ops.model || ai.model;
  } catch {
    return process.env.UPDOWN_ORACLE_MODEL || ai.model;
  }
}

// --- Types -------------------------------------------------------------------

/** Why a reading was refused. Each maps to a distinct operator-visible cause. */
export type RefusalReason =
  | "no-api-key"
  | "ai-paused"
  | "budget-exhausted"
  | "no-tool-call"
  | "unparseable-price"
  | "wrong-source"
  | "stale"
  | "low-confidence"
  | "no-evidence"
  /**
   * A DATED feed was asked for a bar that the provider has not published YET.
   *
   * ⛔ WHY THIS IS ITS OWN REASON AND NOT `unparseable-price` (2026-08-04, phase 1d).
   * Measured on the live provider across all four production symbols: the bar labelled T
   * **first appears at +10s** and never earlier. The retry ladder's first attempt is taken
   * AT the boundary (`retryBackoffSeconds[0]` is 0), so under the bar reader attempt 1 is
   * GUARANTEED to find no bar — and `no-bar` deliberately burns the attempt budget, because
   * for a bar that will never exist retrying is pointless.
   *
   * Blend the two and every round starts one attempt down for a bar that was merely four
   * seconds away. Spend the budget and the boundary is declared FAILED, which VOIDS and
   * refunds a round whose price was published perfectly well ten seconds later. That is
   * E-69's own shape — a round voided while the source never failed — reintroduced by the
   * fix for it.
   *
   * So: within `barPublicationGraceSeconds` of the boundary this means *not yet* and costs
   * no attempt; after it, it means *never* and burns one like any other source failure.
   */
  | "bar-not-published"
  /**
   * ⭐ E-86 · The provider refused because WE asked too often, not because the price is
   * unknowable. Transient by definition: the identical request succeeds a minute later, so it
   * must not spend one of the boundary's lives. See `refusalCostsAnAttempt`.
   */
  | "rate-limited"
  | "error";

export type OracleReading =
  | {
      ok: true;
      price: number;
      sourceUrl: string;
      /** THE SOURCE'S OWN quoted time — not the boundary. */
      sourceQuotedAt: string;
      evidence: string;
      confidence: number;
      model: string;
      /** Hash of the model's raw structured output, so an auditor can prove the
       *  stored price is the one that was actually returned. */
      rawHash: string;
      /** How far the source's time sat from the boundary. Kept for the ops readout —
       *  a creeping average is the early warning that a source is degrading. */
      skewSeconds: number;
    }
  | { ok: false; reason: RefusalReason; detail: string };

const PRICE_TOOL = {
  name: "report_price",
  description:
    "Report the observed price of the asset at (or as close as possible to) the requested instant. " +
    "Call this exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      reasoning: {
        type: "string" as const,
        description:
          "Show your work: which page you read, what figure it showed, and what timestamp that " +
          "figure carried. If the page gives no timestamp, say so explicitly — do not invent one.",
      },
      found: {
        type: "boolean" as const,
        description:
          "true ONLY if you read an actual quoted price from the approved source. false if the " +
          "page was unreachable, showed no price, or you are unsure which figure is the price.",
      },
      price: {
        type: "number" as const,
        description: "The quoted price as a plain number, no currency symbol and no thousands separators.",
      },
      quotedAt: {
        type: "string" as const,
        description:
          "ISO-8601 UTC timestamp THE SOURCE ITSELF published for that price (e.g. " +
          "'2026-07-24T14:30:02Z'). This is the source's time, NOT the time you are answering. " +
          "If the source shows no timestamp, omit this field — do NOT guess and do NOT substitute " +
          "the current time.",
      },
      sourceUrl: {
        type: "string" as const,
        description: "The exact URL you read the price from. Must be on the approved domain.",
      },
      evidence: {
        type: "string" as const,
        description: "A short verbatim excerpt from the page showing the price and its timestamp.",
      },
      confidence: {
        type: "number" as const,
        description: "0-100. How certain you are that this is the correct quoted price at that time.",
      },
    },
    required: ["found", "reasoning"] as string[],
  },
};

/** Stable hash of the model's structured output (audit evidence, not security). */
function hashOutput(raw: unknown): string {
  const s = JSON.stringify(raw);
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + s.charCodeAt(i), 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

/**
 * Observe the price of `asset` at `boundaryAtIso`.
 *
 * Returns a REFUSAL rather than a guess whenever any gate fails. The caller retries a
 * refusal on the backoff ladder and, after the attempt budget, fails the boundary —
 * which voids and refunds its rounds. Refusing is always the safe direction: a wrong
 * price settles real money incorrectly and is not recoverable, whereas a void returns
 * every stake.
 */
export async function observePrice(asset: StoredAsset, boundaryAtIso: string): Promise<OracleReading> {
  const cfg = await getUpDownConfig();
  const model = await getOracleModel();
  const refuse = (reason: RefusalReason, detail: string): OracleReading => ({ ok: false, reason, detail });

  // The operator's AI pause switch lives in the AI-toolkit dropdown. If resolution AI
  // is paused, the oracle is paused with it — one switch, one meaning.
  try {
    const { isResolutionAiActive } = await import("./market-sentinel");
    if (!(await isResolutionAiActive())) return refuse("ai-paused", "Resolution AI is paused by the operator");
  } catch {
    /* if the check itself fails, fall through — the key check below still gates us */
  }

  const anthropic = getClient();
  if (!anthropic) return refuse("no-api-key", "ANTHROPIC_API_KEY is not set");

  // ── THE SPEND GATE ────────────────────────────────────────────────────────
  // The operator's AI credit limit, enforced BEFORE the call — not merely alerted
  // on afterwards. This was missing, and production paid for it: 656 oracle calls
  // burned $59.37 and produced ZERO confirmed readings, including 256 calls / $21.35
  // in a single day (2026-07-26) against a cycle limit of $20. `assertAiBudget` had
  // existed since the events-calendar work but was wired into poll generation ONLY,
  // so the platform's two biggest spenders — this oracle and the sentinel — ran
  // uncapped. Same defect class as E-4: a control that exists and is not on the wire.
  //
  // Refusing is the SAFE direction and the one this module already takes everywhere
  // else: a boundary that will not confirm VOIDS its rounds and refunds every stake
  // in full. An exhausted budget must never become a settled bet on a guessed price.
  const budget = await assertAiBudget("updown");
  if (!budget.ok) {
    return refuse(
      "budget-exhausted",
      `AI credit limit reached ($${budget.spentUsd.toFixed(2)} of $${budget.limitUsd.toFixed(2)} this cycle)`,
    );
  }

  const boundaryMs = Date.parse(boundaryAtIso);
  if (!Number.isFinite(boundaryMs)) return refuse("error", `Invalid boundary "${boundaryAtIso}"`);

  const system = `You are the 50pick price oracle for a LICENSED, REAL-MONEY prediction platform in Tanzania.

Your ONLY job is to read ONE number — the quoted price of an asset — from ONE approved web page, and report it together with the timestamp THAT PAGE published for it.

RULES, in order of importance:
1. USE WEB SEARCH. Never answer from memory. A price from memory is worthless and would settle real money wrongly.
2. READ ONLY THE APPROVED DOMAIN: ${asset.sourceDomain}. If you cannot reach it or cannot find a price on it, report found=false. Do NOT substitute a different site, however reputable.
3. REPORT THE SOURCE'S OWN TIMESTAMP in quotedAt. If the page does not show one, OMIT quotedAt entirely. Never put the current time there, and never estimate it. A wrong timestamp is worse than a missing one, because it makes a stale price look fresh.
4. NEVER INVENT OR ROUND A PRICE. Report the figure exactly as quoted, to ${asset.decimals} decimal places if the page gives them.
5. If you are unsure which figure on the page is the spot price, report found=false. Refusing costs a round; guessing costs a player their money.

You are not deciding anything. A human-designed system compares your reading to another reading and refunds every stake if either is missing.`;

  const user = `Read the current quoted price for this asset.

ASSET: ${asset.nameEn} (${asset.symbol})
APPROVED SOURCE PAGE: ${asset.priceSourceUrl}
APPROVED DOMAIN (nothing else is acceptable): ${asset.sourceDomain}
PRICE PRECISION: ${asset.decimals} decimal places
TARGET INSTANT (UTC): ${boundaryAtIso}

FETCH the approved page directly with web_fetch — do not rely on search results. A search
snippet is a copy of the page from hours ago, and a price that old cannot settle this round.
Fetch the live page, then call report_price exactly once. Report the page's OWN timestamp so
the platform can judge how close the reading actually is to the target instant.`;

  const started = Date.now();
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1536,
      system,
      tools: [
        PRICE_TOOL as unknown as Anthropic.Tool,
        // ⛔ web_FETCH, and it is the one that matters. `web_search` returns crawl-index
        // SNIPPETS: probing seven candidate gold pages through this exact prompt produced
        // either a price with NO timestamp, or a price whose source time was 10-12 HOURS
        // old. Against `maxStalenessSeconds` (90) that is unmeetable on ANY page — which
        // is why production confirmed zero readings in six days and stranded real money.
        // `web_fetch` reads the LIVE page, so the quote and its timestamp are current.
        // `allowed_domains` is enforced SERVER-SIDE: a real containment boundary, where
        // GATE 2 can only check what the model claims to have read after the fact.
        {
          type: ai.webFetchTool.type,
          name: ai.webFetchTool.name,
          max_uses: 4,
          allowed_domains: [asset.sourceDomain],
        } as unknown as Anthropic.Tool,
        { type: ai.webSearchTool.type, name: ai.webSearchTool.name, max_uses: 2 } as unknown as Anthropic.Tool,
      ],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: user }],
    });

    const u = response.usage as
      | { input_tokens?: number; output_tokens?: number; server_tool_use?: { web_search_requests?: number } }
      | undefined;
    await recordAiUsage({
      feature: "updown", // Up & Down is its OWN spend line — see the AiFeature note
      model,
      inputTokens: u?.input_tokens ?? 0,
      outputTokens: u?.output_tokens ?? 0,
      webSearches: u?.server_tool_use?.web_search_requests ?? 0,
      ok: true,
      latencyMs: Date.now() - started,
      detail: `updown-oracle · ${asset.key} @ ${boundaryAtIso}`,
    });

    const toolUse = response.content.find((b) => b.type === "tool_use" && b.name === "report_price");
    if (!toolUse || toolUse.type !== "tool_use") return refuse("no-tool-call", "Model did not call report_price");

    const raw = toolUse.input as Record<string, unknown>;
    if (!raw.found) {
      return refuse("unparseable-price", String(raw.reasoning ?? "Model reported no price found").slice(0, 300));
    }

    // ── GATE 1 · the price must parse to a finite positive number ────────────
    const price = Number(raw.price);
    if (!Number.isFinite(price) || price <= 0) {
      return refuse("unparseable-price", `price="${String(raw.price)}" is not a positive finite number`);
    }

    // ── GATE 2 · the URL must be on the asset's approved domain ──────────────
    // "Trust but verify": the prompt says read only this domain, and this refuses the
    // answer if it did not. A model citing a different site is exactly the failure the
    // trusted-source registry exists to prevent.
    const sourceUrl = String(raw.sourceUrl ?? asset.priceSourceUrl);
    let host: string;
    try {
      host = normalizeDomain(new URL(sourceUrl).hostname);
    } catch {
      return refuse("wrong-source", `sourceUrl "${sourceUrl}" is not a valid URL`);
    }
    const approved = normalizeDomain(asset.sourceDomain);
    if (host !== approved && !host.endsWith(`.${approved}`)) {
      return refuse("wrong-source", `read from "${host}", which is not the approved domain "${approved}"`);
    }

    // ── GATE 3 · the source must have published a timestamp ──────────────────
    // A reading with no source time cannot be judged for staleness, and a price we
    // cannot date is a price we cannot honestly settle on.
    const quotedRaw = raw.quotedAt ? String(raw.quotedAt) : "";
    const quotedMs = quotedRaw ? Date.parse(quotedRaw) : NaN;
    if (!Number.isFinite(quotedMs)) {
      return refuse("stale", "source published no usable timestamp for this price");
    }

    // ── GATE 4 · staleness, against the SOURCE'S time, not ours ──────────────
    const skewSeconds = Math.round(Math.abs(quotedMs - boundaryMs) / 1000);
    if (skewSeconds > cfg.maxStalenessSeconds) {
      return refuse("stale", `source time is ${skewSeconds}s from the boundary (limit ${cfg.maxStalenessSeconds}s)`);
    }

    // ── GATE 5 · confidence floor ────────────────────────────────────────────
    const confidence = Math.max(0, Math.min(100, Math.round(Number(raw.confidence) || 0)));
    if (confidence < cfg.confidenceThreshold) {
      return refuse("low-confidence", `confidence ${confidence} < ${cfg.confidenceThreshold}`);
    }

    // ── GATE 6 · real evidence, guarding a confident answer with no source ───
    const evidence = String(raw.evidence ?? "").trim();
    if (evidence.length < 10) {
      return refuse("no-evidence", "no verbatim excerpt returned — a confident answer with no source is not evidence");
    }

    return {
      ok: true,
      // Quantise to the asset's own precision so two readings of the same page can
      // never differ by a digit the source does not actually publish.
      price: Number(price.toFixed(asset.decimals)),
      sourceUrl,
      sourceQuotedAt: new Date(quotedMs).toISOString(),
      evidence: evidence.slice(0, 500),
      confidence,
      model,
      rawHash: hashOutput(raw),
      skewSeconds,
    };
  } catch (err) {
    await recordAiUsage({
      feature: "updown", // Up & Down's own spend line, on the failure path too
      model,
      ok: false,
      latencyMs: Date.now() - started,
      errorType: (err as Error).message?.slice(0, 200),
      detail: `updown-oracle · ${asset.key} @ ${boundaryAtIso}`,
    });
    return refuse("error", (err as Error).message?.slice(0, 300) ?? "unknown error");
  }
}

/**
 * A refusal an operator can read. Deliberately plain: these strings reach the ops
 * readout, and "wrong-source" needs to say which domain was actually read, not
 * "observation failed".
 */
export function describeRefusal(reason: RefusalReason, detail: string): string {
  switch (reason) {
    // ⚠️ These two DISCARDED `detail` and returned a fixed string naming the AI. Once a
    // price feed became a second read method, that fixed string actively lied: an
    // unconfigured market-data provider was reported to the operator as "AI key not
    // configured", pointing them at the wrong subsystem entirely. The detail is the only
    // part that says which variable to set, so it wins whenever there is one.
    case "no-api-key": return detail || "Price source key not configured";
    case "ai-paused": return detail || "Resolution AI is paused";
    // Names the CAUSE and the number, because an operator seeing rounds void needs to
    // know this is a spend ceiling they can raise — not a broken price source.
    case "budget-exhausted": return `AI credit limit reached — ${detail}`;
    case "no-tool-call": return "Model returned no structured reading";
    case "unparseable-price": return `No usable price — ${detail}`;
    case "wrong-source": return `Wrong source — ${detail}`;
    case "stale": return `Reading too far from the boundary — ${detail}`;
    case "low-confidence": return `Below the confidence floor — ${detail}`;
    case "no-evidence": return "No verbatim evidence returned";
    // Says NOT YET, not "broken" — an operator seeing this in the first seconds after a
    // boundary is looking at the provider's normal publication delay, and telling them the
    // price source failed would send them to investigate an outage that is not happening.
    case "bar-not-published": return `Price for that minute not published yet — ${detail}`;
    // ⭐ E-86. Says WE asked too often — not that the price source failed. An operator told
    // "source failed" goes looking for an outage at the provider; the actual remedy is on our
    // side (fewer reads, or a larger plan), and the rounds are not in danger while it lasts.
    case "rate-limited": return `Price source asked too often — ${detail}`;
    case "error": return `Oracle error — ${detail}`;
  }
}
