/**
 * Up & Down PRICE FEED — a real market-data quote, not a model reading a web page.
 *
 * ⛔ WHY THIS MODULE EXISTS (Ali's decision, 2026-07-30). The AI oracle
 * (`updown-oracle.ts`) is honest, careful, and CANNOT DO THIS JOB. Proven three ways by
 * `scripts/ops-updown-verify-source.mts`, running the real prompt through the real gates:
 *
 *   web_search over 7 gold pages   a price with NO timestamp, or one 9-12 HOURS old
 *   web_fetch  over the same 7     "a stale cached version" · "a static text rendering"
 *                                  (a client-side widget) · one 7.3 DAYS old
 *   web_fetch  over CSV endpoints  the domain blocks the fetch service outright
 *
 * `maxStalenessSeconds` is 90. The oracle's own header already half-admits the
 * contradiction — "An LLM web-search CANNOT report the price at an exact second" — while
 * the config demands exactly that. So every 5- and 15-minute round MUST refuse, on ANY
 * page. Production proved it: 1,398 rounds opened, zero readings confirmed, real player
 * money stranded.
 *
 * A quote endpoint fixes the one thing that was broken: it publishes a price WITH ITS OWN
 * TIMESTAMP, seconds old, as machine-readable data.
 *
 * ── WHAT DELIBERATELY DOES NOT CHANGE ────────────────────────────────────────
 * Everything that made the oracle trustworthy is kept, because none of it was the problem:
 *
 *   · the observation ledger is still write-once per `@@unique([assetId, boundaryAt])`,
 *     so round N's close is still byte-identical to round N+1's open;
 *   · the source's OWN timestamp is still what staleness is judged against — never ours;
 *   · a reading further from the boundary than `maxStalenessSeconds` is still REFUSED,
 *     not rounded into a verdict;
 *   · a boundary that will not confirm still VOIDs its rounds and refunds every stake;
 *   · the endpoint's host must still be an enabled TrustedSource — ONE allowlist, not two;
 *   · `rawHash` still lets an auditor prove the stored price is the one that came back —
 *     and now hashes the provider's actual response, which is better evidence than a
 *     prose excerpt ever was.
 *
 * A feed replaces HOW the number is obtained. It does not relax a single guarantee.
 */
import { createHash } from "node:crypto";
import { normalizeDomain } from "./source-registry";

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/** Why a quote was refused. Each maps to a distinct operator-visible cause. */
export type FeedRefusal =
  | "not-configured"
  | "mock-in-production"
  | "http-error"
  | "unparseable-price"
  | "no-timestamp"
  | "wrong-source"
  | "error";

export type FeedQuote =
  | {
      ok: true;
      price: number;
      /** THE PROVIDER'S OWN quoted time — not our boundary. */
      quotedAt: string;
      /** The exact endpoint the number came from, for the proof panel. */
      sourceUrl: string;
      /** The raw response, truncated. This IS the evidence. */
      evidence: string;
      /** Hash of the raw response, so an auditor can prove what was returned. */
      rawHash: string;
      provider: string;
    }
  | { ok: false; reason: FeedRefusal; detail: string };

/** What a feed needs to know to quote one asset. Deliberately NOT `StoredAsset` — a feed
 *  has no business reading `enabled`, `sortOrder` or who created the row. */
export type FeedRequest = {
  /** The provider's symbol for this asset, e.g. "XAU/USD". */
  symbol: string;
  /** Quote precision, so a price is never stored to more digits than the source publishes. */
  decimals: number;
  /** The approved endpoint. Its host must be an enabled TrustedSource — one allowlist. */
  endpoint: string;
};

export interface PriceFeed {
  /** Stable id, persisted in config. Never renamed. */
  readonly id: FeedProviderId;
  readonly label: string;
  quote(req: FeedRequest): Promise<FeedQuote>;
}

export type FeedProviderId = "mock" | "twelvedata";

/** Stable hash of the provider's raw response (audit evidence, not security). */
function hashRaw(raw: string): string {
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

/** The endpoint's host must match the domain the operator approved for this asset. */
function hostMatches(endpoint: string, approvedDomain: string): boolean {
  let host: string;
  try {
    host = normalizeDomain(new URL(endpoint).hostname);
  } catch {
    return false;
  }
  const approved = normalizeDomain(approvedDomain);
  return host === approved || host.endsWith(`.${approved}`);
}

// ---------------------------------------------------------------------------
// Mock — dev and tests ONLY
// ---------------------------------------------------------------------------

/**
 * A deterministic fake quote, for tests and local dev.
 *
 * ⛔ IT REFUSES IN PRODUCTION, BY CONSTRUCTION. This platform's A-5 rule is "real data or
 * nothing", and it has already been broken once in exactly this shape: `seedHistory()`
 * generated a synthetic random walk and `/markets/[id]` rendered it to real-money bettors
 * as real price history. A fabricated price is far worse — it would SETTLE money.
 *
 * The refusal is not a config flag an operator can flip. There is no override.
 */
export class MockPriceFeed implements PriceFeed {
  readonly id = "mock" as const;
  readonly label = "Simulated (dev only)";

  async quote(req: FeedRequest): Promise<FeedQuote> {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        reason: "mock-in-production",
        detail:
          "The simulated feed invents a price and must never settle real money. Configure a real market-data provider.",
      };
    }
    // A stable pseudo-price per symbol so a test run is reproducible, with the CURRENT
    // time as the quoted time — the one thing a real feed gives us and web pages did not.
    let h = 0;
    for (let i = 0; i < req.symbol.length; i++) h = (h * 31 + req.symbol.charCodeAt(i)) >>> 0;
    const base = 1000 + (h % 4000);
    const raw = JSON.stringify({ symbol: req.symbol, price: base, simulated: true });
    return {
      ok: true,
      price: Number(base.toFixed(req.decimals)),
      quotedAt: new Date().toISOString(),
      sourceUrl: req.endpoint,
      evidence: `SIMULATED QUOTE (dev only) — ${raw}`,
      rawHash: hashRaw(raw),
      provider: this.id,
    };
  }
}

// ---------------------------------------------------------------------------
// Twelve Data — the real provider
// ---------------------------------------------------------------------------

/**
 * Twelve Data `/quote`, chosen because its free tier (800 requests/day) comfortably covers
 * this product's actual shape: ONE call per asset per boundary — 2 assets x 288 five-minute
 * boundaries = 576 calls/day, and that number does not grow with the number of durations,
 * because the observation ledger shares one reading across every chain crossing the instant.
 *
 * `/quote` is used rather than `/price` for one reason that is the whole point of this
 * module: `/price` returns a bare number with no time, and a price we cannot date is a
 * price we cannot honestly settle on.
 */
export class TwelveDataFeed implements PriceFeed {
  readonly id = "twelvedata" as const;
  readonly label = "Twelve Data";

  constructor(private readonly apiKey: string) {}

  async quote(req: FeedRequest): Promise<FeedQuote> {
    const url = new URL(req.endpoint);
    url.searchParams.set("symbol", req.symbol);
    url.searchParams.set("apikey", this.apiKey);

    let res: Response;
    let body: string;
    try {
      res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
      body = await res.text();
    } catch (err) {
      return { ok: false, reason: "error", detail: (err as Error).message?.slice(0, 200) ?? "fetch failed" };
    }

    if (!res.ok) {
      // The body is kept: a provider that explains the failure in its own words is the
      // only useful part, and discarding it is exactly the mistake the Selcom adapter made.
      return { ok: false, reason: "http-error", detail: `HTTP ${res.status} — ${body.slice(0, 200)}` };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return { ok: false, reason: "unparseable-price", detail: `response was not JSON — ${body.slice(0, 200)}` };
    }

    // The provider signals its own errors in-band with HTTP 200.
    if (typeof parsed.code === "number" && parsed.code >= 400) {
      return { ok: false, reason: "http-error", detail: `provider error ${parsed.code} — ${String(parsed.message ?? "").slice(0, 200)}` };
    }

    const price = Number(parsed.close ?? parsed.price);
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, reason: "unparseable-price", detail: `close="${String(parsed.close)}" is not a positive finite number` };
    }

    // `timestamp` is UNIX seconds of the provider's own quote. Without it we refuse —
    // the whole reason this module exists is that we can finally date a price.
    const ts = Number(parsed.timestamp);
    if (!Number.isFinite(ts) || ts <= 0) {
      return { ok: false, reason: "no-timestamp", detail: "provider returned no usable timestamp for this quote" };
    }

    return {
      ok: true,
      price: Number(price.toFixed(req.decimals)),
      quotedAt: new Date(ts * 1000).toISOString(),
      sourceUrl: `${url.origin}${url.pathname}?symbol=${encodeURIComponent(req.symbol)}`, // key NEVER stored
      evidence: body.slice(0, 500),
      rawHash: hashRaw(body),
      provider: this.id,
    };
  }
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * The live feed: the operator's persisted choice, else the env default, else the mock.
 *
 * Mirrors `getPaymentProvider()` exactly (`payment-control.ts:98`) — persisted choice
 * outranks env — so the platform has ONE way of selecting a provider, not two.
 */
export function feedFromId(id: FeedProviderId): PriceFeed {
  if (id === "twelvedata") {
    const key = process.env.TWELVEDATA_API_KEY ?? "";
    // A real provider with no key is NOT silently downgraded to the mock: that would
    // substitute invented prices for real ones on a money path, which is the single
    // worst thing this file could do. It refuses instead.
    if (!key) return new UnconfiguredFeed("twelvedata", "TWELVEDATA_API_KEY is not set");
    return new TwelveDataFeed(key);
  }
  return new MockPriceFeed();
}

/** A provider that is selected but cannot run. Refuses every quote, loudly and by name. */
export class UnconfiguredFeed implements PriceFeed {
  readonly id: FeedProviderId;
  readonly label: string;
  constructor(id: FeedProviderId, private readonly why: string) {
    this.id = id;
    this.label = `${id} (not configured)`;
  }
  async quote(): Promise<FeedQuote> {
    return { ok: false, reason: "not-configured", detail: this.why };
  }
}

/** Operator-visible refusal text. Deliberately plain — these strings reach the ops readout. */
export function describeFeedRefusal(reason: FeedRefusal, detail: string): string {
  switch (reason) {
    case "not-configured": return `Feed not configured — ${detail}`;
    case "mock-in-production": return `Simulated feed refused — ${detail}`;
    case "http-error": return `Provider error — ${detail}`;
    case "unparseable-price": return `No usable price — ${detail}`;
    case "no-timestamp": return `Quote had no timestamp — ${detail}`;
    case "wrong-source": return `Wrong source — ${detail}`;
    case "error": return `Feed error — ${detail}`;
  }
}

/**
 * Quote one asset, with the endpoint's host checked against the domain the operator
 * approved. The check is here rather than in each provider so a new provider cannot
 * forget it.
 */
export async function quoteAsset(
  feed: PriceFeed,
  req: FeedRequest & { approvedDomain: string },
): Promise<FeedQuote> {
  if (!hostMatches(req.endpoint, req.approvedDomain)) {
    return {
      ok: false,
      reason: "wrong-source",
      detail: `endpoint "${req.endpoint}" is not on the approved domain "${req.approvedDomain}"`,
    };
  }
  return feed.quote(req);
}
