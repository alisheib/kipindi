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
  /**
   * The provider published NO bar for the exact instant asked about.
   *
   * ⛔ A HARD REFUSAL, NEVER A SUBSTITUTION. Not the nearest bar, not the previous close,
   * never interpolated. A round whose boundary minute has no price VOIDs and refunds — that
   * is an honest ending. Quietly settling it on a neighbouring minute is not.
   *
   * ⚠️ It also replaces a protection the rebuild removes. A frozen holiday quote used to be
   * caught by `maxStalenessSeconds` (the price stopped advancing, so the reading was refused).
   * A dated bar has no staleness to fail: the bar for a holiday minute either exists or does
   * not. This reason is what catches the "does not".
   */
  | "no-bar"
  /**
   * A bar exists, but its price disagrees with the minutes either side of it by more than a
   * market could plausibly move — i.e. a bad print.
   *
   * ⛔ WHY THIS EXISTS AND WHY IT IS NEW (2026-08-04). The margin band was doing a job nobody
   * had named: it ABSORBED provider noise. At ±0.02% a $2 bad tick on BTC changed nothing,
   * because the round still resolved on the real move. Ali's decision to run the margin at the
   * TICK FLOOR removes that cushion entirely — a $2 error is now two hundred times the winning
   * margin, so a single bad print flips the outcome and pays the wrong side.
   *
   * ⚠️ And a reproducible settlement makes a wrong one WORSE, not better: the proof panel will
   * confidently show the bad number, and it will still be there when anyone re-checks.
   * Refusing costs one refund. Paying the wrong player costs trust and cannot be undone.
   */
  | "implausible-bar"
  /**
   * ⭐ E-86 · THE PROVIDER SAID "ASK ME AGAIN IN A MOMENT", AND WE TREATED IT AS A VERDICT.
   *
   * A 429 is the one refusal that is transient BY DEFINITION — the same request, unchanged,
   * succeeds a minute later. It was folded into `http-error` and therefore into the generic
   * `error`, which burns a life from the boundary's attempt budget; four of them inside ninety
   * seconds declared the boundary FAILED and refunded every stake, **at +90s against a 390s
   * deadline**. Measured on production 2026-08-05: BTC 3m #188 and BTC 5m #6 both voided
   * `source-failed` on the shared 09:07 boundary, `failReason` *"HTTP 429 — You have run out of
   * API credits for the current minute"*.
   *
   * ⛔ It is exactly the mistake `no-bar` is carved out to avoid, one union member away.
   */
  | "rate-limited"
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
  /**
   * The INSTANT this reading is for, ISO, minute-aligned.
   *
   * Optional and ignored by the quote-based feeds, which can only ever answer "the price
   * now" — that inability is the whole reason E-69 exists. A dated feed uses it to ask for
   * one specific bar, which is what makes a late close harmless.
   */
  at?: string;
};

export interface PriceFeed {
  /** Stable id, persisted in config. Never renamed. */
  readonly id: FeedProviderId;
  readonly label: string;
  quote(req: FeedRequest): Promise<FeedQuote>;
}

// ⛔ ONE LIST, in a module with no imports so the console can read it too. The reading-method
// form used to hand-copy this union, which meant a provider added here was accepted by the
// server action and offered by no screen — the same defect that made both admin consoles carry
// their own `[5, 15, 30]`. See `src/lib/updown-providers.ts`.
export type { FeedProviderId } from "@/lib/updown-providers";
export { FEED_PROVIDERS, findProvider, isFeedProviderId } from "@/lib/updown-providers";
import type { FeedProviderId } from "@/lib/updown-providers";

/** Stable hash of the provider's raw response (audit evidence, not security). */
function hashRaw(raw: string): string {
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

/**
 * THE host rule. ONE copy, exported — the feed's endpoint check, the oracle's GATE 2 and
 * the round's settlement check all call this. Two copies is two answers to one question,
 * and the question decides whether real money settles.
 */
export function hostMatchesDomain(endpoint: string, approvedDomain: string): boolean {
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

/**
 * A deterministic fake DATED quote — the mock's counterpart for the bar path.
 *
 * ⛔ WHY IT EXISTS. `MockPriceFeed` answers with the CURRENT instant, which is what makes it
 * useful: against a future or past boundary it is refused as `stale`, and that genuine source
 * refusal is what lets `test:updown-heal` climb a real retry ladder locally, for free. The
 * late-close path needs the exact opposite — a feed that answers about a NAMED INSTANT — and
 * changing the mock to provide it would silently pull the ladder out from under that suite.
 *
 * So this is a second provider rather than a flag. It quotes `req.at` back as the quoted time,
 * which is precisely what a dated feed does: the bar's own label IS the boundary, so the
 * staleness gate becomes a free correctness assertion rather than a hurdle.
 *
 * Refuses in production for the same reason and by the same construction as `MockPriceFeed` —
 * a fabricated price is far worse than a missing one, because it would SETTLE money.
 */
export class MockBarFeed implements PriceFeed {
  readonly id = "mock-bars" as const;
  readonly label = "Simulated · dated (dev only)";

  async quote(req: FeedRequest): Promise<FeedQuote> {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        reason: "mock-in-production",
        detail:
          "The simulated feed invents a price and must never settle real money. Configure a real market-data provider.",
      };
    }
    if (!req.at) {
      return { ok: false, reason: "error", detail: "the dated feed needs the instant it is quoting for" };
    }
    const atMs = Date.parse(req.at);
    if (!Number.isFinite(atMs)) {
      return { ok: false, reason: "error", detail: `not a readable instant: "${req.at}"` };
    }
    // Stable per (symbol, instant) — the property that matters. Asking twice about the same
    // boundary must give the same number, or the "a late close settles identically" guarantee
    // is not being tested at all, it is merely being asserted.
    let h = 0;
    for (const ch of `${req.symbol}@${atMs}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const price = 1000 + (h % 400_000) / 100;
    const raw = JSON.stringify({ symbol: req.symbol, at: new Date(atMs).toISOString(), open: price, simulated: true });
    return {
      ok: true,
      price: Number(price.toFixed(req.decimals)),
      // ⭐ The instant asked about IS the quoted time — the defining property of a dated feed.
      quotedAt: new Date(atMs).toISOString(),
      sourceUrl: req.endpoint,
      evidence: `SIMULATED DATED BAR (dev only) — ${raw}`,
      rawHash: hashRaw(raw),
      provider: this.id,
    };
  }
}

// ---------------------------------------------------------------------------
// Twelve Data — the real provider
// ---------------------------------------------------------------------------

/**
 * Twelve Data `/quote`. Its shape suits this product: ONE call per asset per boundary — 2 assets
 * x 288 five-minute boundaries = 576 calls/day, and that number does not grow with the number of
 * durations, because the observation ledger shares one reading across every chain crossing the
 * instant.
 *
 * ⚠️ CORRECTED 2026-08-04. This said "chosen because its FREE TIER (800 requests/day) comfortably
 * covers" it. Read from `/api_usage` on the live key: the plan is **`grow`**, limit **377 credits
 * per MINUTE** — a different unit and roughly two orders of magnitude more headroom. The 576/day
 * arithmetic stands; the constraint it was justified against does not exist. ⛔ Do not reason
 * about credit budgets from this comment — call `/api_usage` and read the plan.
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
      return {
        ok: false,
        reason: isRateLimit(res.status, null) ? "rate-limited" : "http-error",
        detail: `HTTP ${res.status} — ${body.slice(0, 200)}`,
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return { ok: false, reason: "unparseable-price", detail: `response was not JSON — ${body.slice(0, 200)}` };
    }

    // The provider signals its own errors in-band with HTTP 200.
    if (typeof parsed.code === "number" && parsed.code >= 400) {
      return {
        ok: false,
        reason: isRateLimit(null, parsed.code) ? "rate-limited" : "http-error",
        detail: `provider error ${parsed.code} — ${String(parsed.message ?? "").slice(0, 200)}`,
      };
    }

    const price = Number(parsed.close ?? parsed.price);
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, reason: "unparseable-price", detail: `close="${String(parsed.close)}" is not a positive finite number` };
    }

    // ⛔ `last_quote_at`, NOT `timestamp`. Read the campaign finding E-25 before "simplifying"
    // this back — it cost the platform a second, identical outage.
    //
    // `/quote` returns TWO times and they are not interchangeable:
    //
    //   timestamp      the OHLC BAR this quote belongs to. With no `interval` parameter the
    //                  provider defaults to `1day`, so it is the START OF TODAY — measured on
    //                  production 2026-08-01: it advanced 0s across 76s and sat 20.4h (BTC)
    //                  and 23.4h (XAU) from the boundary.
    //   last_quote_at  when the price itself was last quoted — measured at 29-45s behind
    //                  wall-clock, advancing 60s per minute, with `close` genuinely moving.
    //
    // `maxStalenessSeconds` is 90. So reading `timestamp` makes the staleness gate
    // STRUCTURALLY UNSATISFIABLE: every boundary refuses, every round voids and refunds,
    // on every asset, at every hour — which is E-16 exactly, reproduced inside the module
    // written to fix E-16. It is invisible in the round history, because a wall of
    // `source-failed` VOIDs looks like a shut market rather than a wrong field.
    //
    // The fallback to `timestamp` is kept for a provider response that omits `last_quote_at`:
    // a bar time is a worse answer than a quote time, but it is still the PROVIDER'S own
    // time, which is the contract. Neither present is still a refusal — a price we cannot
    // date is a price we cannot honestly settle on.
    //
    // ⚠️ Deliberately NOT gated on `is_market_open`. A shut market stops advancing
    // `last_quote_at`, so the staleness rule already refuses it, honestly and for the right
    // reason — and a second gate would be a second answer to one question. If a provider
    // ever re-stamps a FROZEN price with a fresh time, the `minMoveTicks` no-move rule voids
    // and refunds the round; that failure is safe, and it is why that rule exists.
    const ts = Number(parsed.last_quote_at ?? parsed.timestamp);
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
// Twelve Data — DATED BARS. The reader that makes a late close harmless.
// ---------------------------------------------------------------------------

/**
 * `time_series?interval=1min` — the price at a NAMED INSTANT, not "the price now".
 *
 * ── WHY THIS EXISTS (E-69, and E-63/E-68 which are the same defect) ──────────
 * `/quote` can only answer *"what is the price NOW"*. Miss the instant and the number is gone
 * forever, so the round voids. Measured on production: a round opened at a validated 63,672.01,
 * resolved **529 seconds late** with `closePrice NULL`, and voided — while the log repeated
 * *"not the leader — chores skipped"*. **The source never failed. Nobody performed the close.**
 *
 * A dated bar returns the same number whether asked at the boundary or six hours later.
 * Measured against this account 2026-08-04 (`ops-updown-probe-bars.mts`): the bar labelled T
 * exists **5 seconds** after T and its `open` did not change across seven polls out to +180s.
 *
 * ── THE RULE, NAMED RATHER THAN INFERRED ────────────────────────────────────
 *   **price at instant T = the `open` of the 1-minute bar labelled T.**
 *
 * ⛔ It has to be stated, not derived from whichever number is handy, because the two candidate
 * answers are NOT the same. The bar labelled T−1 closes at the instant the bar labelled T opens,
 * so those should agree — measured, they differ by **$0.01 on BTC** (negligible) but by
 * **$0.29–$0.87 on XAU/USD**, which is the size of a whole five-minute gold move.
 *
 * ── WHAT DELIBERATELY DOES NOT CHANGE ───────────────────────────────────────
 * `acquireObservation`'s contract, the write-once `@@unique([assetId, boundaryAt])` ledger, the
 * trusted-source allowlist and `computeTargets` are all untouched. This class replaces HOW a
 * number is obtained and relaxes nothing.
 */
export class TwelveDataBarFeed implements PriceFeed {
  readonly id = "twelvedata-bars" as const;
  readonly label = "Twelve Data (1-minute bars)";

  /**
   * How far a bar's open may sit from the previous minute's close before we refuse it.
   *
   * ⛔ 2% IS DELIBERATELY GENEROUS AND THAT IS THE POINT. This catches GROSS errors — a decimal
   * shift, a zero, a cached quote for the wrong instrument — which is what provider faults
   * actually look like. It must never fire on real volatility: BTC's *median* one-minute move
   * is ~0.014% and its worst measured 3-minute move was 0.651%, so 2% is over 100× the median
   * and still 3× the worst observed. A tighter bound would start refusing real markets, and a
   * feed that refuses real moves voids rounds for no integrity gain (E-25's exact shape).
   */
  private static readonly MAX_JUMP_PCT = 2;

  constructor(private readonly apiKey: string) {}

  async quote(req: FeedRequest): Promise<FeedQuote> {
    if (!req.at) {
      return { ok: false, reason: "error", detail: "the dated feed needs the instant it is quoting for" };
    }
    const atMs = Date.parse(req.at);
    if (!Number.isFinite(atMs)) {
      return { ok: false, reason: "error", detail: `not a readable instant: "${req.at}"` };
    }
    // The provider labels a 1-minute bar "YYYY-MM-DD HH:MM:SS" in the requested zone.
    const label = new Date(atMs).toISOString().slice(0, 16).replace("T", " ");

    // ⛔ THE FEED OWNS ITS API PATH; THE ASSET OWNS THE TRUSTED HOST.
    //
    // 🔴 FOUND ON PRODUCTION, 2026-08-04, minutes after the reader was switched. Every asset
    // stores `https://api.twelvedata.com/quote` — correct for the quote reader, and meaningless
    // to this one, which needs `/time_series`. So the moment the reading method was switched,
    // EVERY asset stopped pricing: `/quote?interval=1min` returns no `values` array, the read
    // refused as `no-bar`, and `generateRoundNow` (correctly) declined to open a round it could
    // not price. Up & Down produced nothing at all until this line existed.
    //
    // ⚠️ The coupling was the defect, not the URL. A GLOBAL reading method and a PER-ASSET
    // endpoint that must agree, with nothing enforcing the agreement, means one config edit can
    // silently disable every asset. Forcing the path here dissolves it: the operator's approved
    // DOMAIN is still what `hostMatchesDomain` gates — and the domain is the security boundary —
    // while the path is provider-API detail this class knows better than a stored row does.
    //
    // ⭐ It also means the reader can be switched back and forth freely, which is the whole
    // point of keeping the quote feed as the rollback lever.
    const url = new URL(req.endpoint);
    url.pathname = "/time_series";
    url.searchParams.set("symbol", req.symbol);
    url.searchParams.set("interval", "1min");
    // A small window: the bar itself plus the neighbours the plausibility check needs.
    url.searchParams.set("outputsize", "8");
    // ⛔ E-71 · `timezone` DEFAULTS TO `Exchange`, NOT UTC, and the difference is silent.
    // Measured on a paired call at one instant: XAU/USD returns `07:29:00` with this parameter
    // and `17:29:00` without — exactly 600 minutes apart. BTC/ETH/SOL are identical either way,
    // so the defect is invisible on crypto and only bites metals and FX. Without this line the
    // gold rounds would settle on a bar ten hours from the one the player was shown.
    url.searchParams.set("timezone", "UTC");
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
      return {
        ok: false,
        reason: isRateLimit(res.status, null) ? "rate-limited" : "http-error",
        detail: `HTTP ${res.status} — ${body.slice(0, 200)}`,
      };
    }

    let parsed: { status?: string; message?: string; code?: number; values?: Array<Record<string, string>> };
    try {
      parsed = JSON.parse(body);
    } catch {
      return { ok: false, reason: "unparseable-price", detail: `response was not JSON — ${body.slice(0, 200)}` };
    }
    // The provider signals its own errors in-band with HTTP 200.
    if ((typeof parsed.code === "number" && parsed.code >= 400) || parsed.status === "error") {
      return {
        ok: false,
        reason: isRateLimit(null, parsed.code) ? "rate-limited" : "http-error",
        detail: `provider error ${parsed.code ?? ""} — ${String(parsed.message ?? "").slice(0, 200)}`,
      };
    }
    if (!Array.isArray(parsed.values) || parsed.values.length === 0) {
      return { ok: false, reason: "no-bar", detail: `the provider returned no bars for ${req.symbol}` };
    }

    // ⛔ Provider order is NEWEST-FIRST (`order` defaults to `desc`). Getting this backwards
    // silently inverts every open and close, which would not change a void rate — |move| is
    // symmetric — but WOULD invert every UP/DOWN verdict. Sorted, never assumed.
    const bars = parsed.values
      .map((v) => ({
        datetime: String(v.datetime ?? ""),
        open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close),
      }))
      .filter((b) => b.datetime && Number.isFinite(b.open) && Number.isFinite(b.close))
      .sort((a, b) => Date.parse(`${a.datetime.replace(" ", "T")}Z`) - Date.parse(`${b.datetime.replace(" ", "T")}Z`));

    const idx = bars.findIndex((b) => b.datetime.startsWith(label));
    // ⛔ EXACT MATCH ONLY. Never the nearest bar, never the previous close, never interpolated.
    if (idx < 0) {
      return {
        ok: false,
        reason: "no-bar",
        detail:
          `the provider published no ${req.symbol} bar for ${label} UTC` +
          (bars.length ? ` (it returned ${bars[0]!.datetime} … ${bars[bars.length - 1]!.datetime})` : ""),
      };
    }
    const bar = bars[idx]!;

    // ── The bad-print guard ──────────────────────────────────────────────────
    if (!(bar.open > 0)) {
      return { ok: false, reason: "unparseable-price", detail: `open="${bar.open}" is not a positive number` };
    }
    // Internal consistency: an open outside its own bar's range is not a price, it is a fault.
    if (Number.isFinite(bar.high) && Number.isFinite(bar.low) && (bar.high < bar.low || bar.open > bar.high || bar.open < bar.low)) {
      return {
        ok: false, reason: "implausible-bar",
        detail: `the bar contradicts itself — open ${bar.open} outside low ${bar.low} … high ${bar.high}`,
      };
    }
    // Continuity: a gross jump from the previous minute is a bad print, not a market.
    const prev = idx > 0 ? bars[idx - 1] : null;
    if (prev && prev.close > 0) {
      const jumpPct = Math.abs((bar.open - prev.close) / prev.close) * 100;
      if (jumpPct > TwelveDataBarFeed.MAX_JUMP_PCT) {
        return {
          ok: false, reason: "implausible-bar",
          detail:
            `${bar.open} is ${jumpPct.toFixed(2)}% from the previous minute's close (${prev.close}), ` +
            `beyond the ${TwelveDataBarFeed.MAX_JUMP_PCT}% sanity bound — refusing rather than settling on a suspect print`,
        };
      }
    }

    // ── The evidence ─────────────────────────────────────────────────────────
    // ⛔ HASH THE MATCHED BAR, NOT THE RESPONSE BODY. A hash over eight bars is a hash of
    // whatever else happened to be in that response — it changes with the request window, so it
    // is NOT reproducible, which makes it worse evidence than the quote path it replaces. A
    // canonical single-bar record is re-derivable by anyone with the same symbol and instant.
    const canonical = JSON.stringify({
      symbol: req.symbol, interval: "1min", timezone: "UTC",
      datetime: bar.datetime, open: bar.open, high: bar.high, low: bar.low, close: bar.close,
    });

    return {
      ok: true,
      price: Number(bar.open.toFixed(req.decimals)),
      // ⭐ The bar's own label IS the boundary, so `judgeFeedStaleness` becomes a free
      // correctness assertion: a skew of anything but zero means the reader returned a bar it
      // was not asked for. Keeping that gate costs nothing and catches the silent-wrong-bar class.
      quotedAt: new Date(Date.parse(`${bar.datetime.replace(" ", "T")}Z`)).toISOString(),
      sourceUrl: `${url.origin}${url.pathname}?symbol=${encodeURIComponent(req.symbol)}&interval=1min`, // key NEVER stored
      evidence: canonical,
      rawHash: hashRaw(canonical),
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
  if (id === "twelvedata-bars") {
    const key = process.env.TWELVEDATA_API_KEY ?? "";
    // Same refusal, same reason: a real provider with no key must never fall back to invented
    // prices on a money path.
    if (!key) return new UnconfiguredFeed("twelvedata-bars", "TWELVEDATA_API_KEY is not set");
    return new TwelveDataBarFeed(key);
  }
  if (id === "mock-bars") return new MockBarFeed();
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
/**
 * Is this provider failure a RATE LIMIT — the one refusal that is transient by definition?
 *
 * ⛔ ONE RULE, FOUR CALL SITES. Twelve Data reports the same condition two ways (an HTTP 429,
 * and an in-band `code: 429` under HTTP 200) and there are two readers, so this was four
 * chances to classify the same thing differently — and a rate limit misclassified as a verdict
 * is E-86: it burns the boundary's attempt budget and refunds a round whose price was fine.
 */
export function isRateLimit(httpStatus: number | null, providerCode: unknown): boolean {
  return httpStatus === 429 || providerCode === 429;
}

export function describeFeedRefusal(reason: FeedRefusal, detail: string): string {
  switch (reason) {
    case "not-configured": return `Feed not configured — ${detail}`;
    case "mock-in-production": return `Simulated feed refused — ${detail}`;
    case "http-error": return `Provider error — ${detail}`;
    case "rate-limited": return `Provider rate limit — ${detail}`;
    case "unparseable-price": return `No usable price — ${detail}`;
    case "no-timestamp": return `Quote had no timestamp — ${detail}`;
    case "wrong-source": return `Wrong source — ${detail}`;
    case "no-bar": return `No price published for that minute — ${detail}`;
    case "implausible-bar": return `Price refused as a suspect print — ${detail}`;
    case "error": return `Feed error — ${detail}`;
  }
}

/**
 * THE staleness rule for the feed path. ONE copy, exported.
 *
 * ⛔ WHY THIS IS A FUNCTION AND NOT FOUR LINES INLINE. This is the gate the whole module
 * exists for: the AI oracle was replaced precisely because it could not date a price, so
 * "how far from the boundary is this quote, and is that too far" is the question that
 * decides whether real money settles. `readPrice` asks it on the money path and
 * `ops:updown-probe-feed` asks it on the ops path — and an ops tool that answers a
 * *slightly different* question than the engine is worse than no ops tool at all, because
 * it certifies a source the engine will then refuse (or, far worse, the reverse).
 *
 * Same reasoning as `hostMatchesDomain` above: two copies is two answers to one question.
 */
export function judgeFeedStaleness(
  quotedAt: string,
  boundaryAtIso: string,
  maxStalenessSeconds: number,
):
  | { ok: true; quotedAtIso: string; skewSeconds: number }
  | { ok: false; reason: "stale"; detail: string; skewSeconds: number | null } {
  const quotedMs = Date.parse(quotedAt);
  if (!Number.isFinite(quotedMs)) {
    return { ok: false, reason: "stale", detail: `provider timestamp "${quotedAt}" is unparseable`, skewSeconds: null };
  }
  const skewSeconds = Math.round(Math.abs(quotedMs - Date.parse(boundaryAtIso)) / 1000);
  if (skewSeconds > maxStalenessSeconds) {
    return {
      ok: false,
      reason: "stale",
      detail: `quote is ${skewSeconds}s from the boundary (limit ${maxStalenessSeconds}s)`,
      skewSeconds,
    };
  }
  return { ok: true, quotedAtIso: new Date(quotedMs).toISOString(), skewSeconds };
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
  if (!hostMatchesDomain(req.endpoint, req.approvedDomain)) {
    return {
      ok: false,
      reason: "wrong-source",
      detail: `endpoint "${req.endpoint}" is not on the approved domain "${req.approvedDomain}"`,
    };
  }
  // ⛔ E-51 · NEVER SEND THE API KEY IN CLEARTEXT — AND NEVER VOID A ROUND OVER IT.
  //
  // `TwelveDataFeed.quote` does `url.searchParams.set("apikey", …)`, so the credential is IN
  // THE URL. Over `http://` that URL crosses the network in the clear, where any on-path
  // observer can lift a paid, metered key the money path depends on to settle rounds. Draining
  // its quota is a denial of service on settlement, and every round that then fails to read
  // voids and refunds. A redirect to https is no help: the plaintext request has already gone.
  //
  // Nothing upstream caught this. `validateAsset` only does `new URL(...)`, which accepts any
  // scheme, and `normalizeDomain(hostname)` STRIPS the scheme before the allowlist check — so
  // `http://api.twelvedata.com/quote` passed every gate. **Two production assets were
  // configured exactly that way, and SOL's 5-minute chain was RUNNING on one of them.**
  //
  // ⚠️ WHICH IS WHY THIS UPGRADES RATHER THAN REFUSES. Refusing was the first instinct and it
  // was wrong: it would have made every SOL round fail to read, void, and refund real players
  // for an operator's typo. That inverts the rule the `no-api-key` carve-out exists to enforce
  // — a misconfigured feed is an operator problem, never a reason to move a player's money.
  // Upgrading protects the credential immediately with no money impact, and the fetched URL is
  // recorded as the https one, which is what was actually requested. Refusing `http` belongs at
  // the FORM (`validateAsset`), where it costs nobody a round.
  //
  // `localhost` keeps http so a dev harness can point at a stub.
  let upgraded = req.endpoint;
  try {
    const u = new URL(req.endpoint);
    const localDev = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol === "http:" && !localDev) {
      u.protocol = "https:";
      upgraded = u.toString();
    }
  } catch {
    return { ok: false, reason: "wrong-source", detail: `endpoint "${req.endpoint}" is not a valid URL` };
  }
  return feed.quote(upgraded === req.endpoint ? req : { ...req, endpoint: upgraded });
}
