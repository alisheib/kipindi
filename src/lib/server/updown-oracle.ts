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
import { recordAiUsage } from "./ai-usage";
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
  | "no-tool-call"
  | "unparseable-price"
  | "wrong-source"
  | "stale"
  | "low-confidence"
  | "no-evidence"
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

Search the approved page now, then call report_price exactly once. The reading should be as close to the target instant as the page allows — report the page's own timestamp so the platform can judge how close it actually is.`;

  const started = Date.now();
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1536,
      system,
      tools: [
        PRICE_TOOL as unknown as Anthropic.Tool,
        { type: ai.webSearchTool.type, name: ai.webSearchTool.name, max_uses: 4 } as unknown as Anthropic.Tool,
      ],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: user }],
    });

    const u = response.usage as
      | { input_tokens?: number; output_tokens?: number; server_tool_use?: { web_search_requests?: number } }
      | undefined;
    await recordAiUsage({
      feature: "sentinel", // metered under the resolution-AI budget; one AI spend line
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
      feature: "sentinel",
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
    case "no-api-key": return "AI key not configured";
    case "ai-paused": return "Resolution AI is paused";
    case "no-tool-call": return "Model returned no structured reading";
    case "unparseable-price": return `No usable price — ${detail}`;
    case "wrong-source": return `Wrong source — ${detail}`;
    case "stale": return `Reading too far from the boundary — ${detail}`;
    case "low-confidence": return `Below the confidence floor — ${detail}`;
    case "no-evidence": return "No verbatim evidence returned";
    case "error": return `Oracle error — ${detail}`;
  }
}
