/**
 * THE DATED BAR READER — the reader that makes a late close harmless.
 *
 *   npx tsx scripts/updown-bars.test.mts     (npm run test:updown-bars)
 *
 * ⛔ WHAT THIS PROTECTS. `/quote` can only answer "the price NOW", so a missed instant voids a
 * round forever — that is E-69 (a round resolved 529s late with `closePrice NULL` while the
 * source never failed), E-63 and E-68. `TwelveDataBarFeed` asks for a NAMED minute instead.
 *
 * Every assertion below is a way that reader could quietly settle the wrong money:
 *   · the wrong bar (nearest instead of exact)             → the price from another minute
 *   · a missing bar substituted                            → a holiday settled as a market
 *   · a bad print accepted                                 → the wrong side paid, reproducibly
 *   · the API key in stored evidence                       → a metered credential in the audit
 *   · evidence hashed over the batch                       → a receipt nobody can re-derive
 *   · `timezone` left to default                           → E-71: gold ten hours out
 *
 * Driven against a STUBBED provider, so every one of those is reachable on demand.
 */
import { TwelveDataBarFeed, quoteAsset } from "../src/lib/server/updown-feed";

let pass = 0; const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => { if (c) pass++; else fails.push(`${n}${d ? ` — ${d}` : ""}`); };

const KEY = "SECRET-KEY-DO-NOT-LEAK";
const ENDPOINT = "https://api.twelvedata.com/time_series";
const REQ = { symbol: "BTC/USD", decimals: 2, endpoint: ENDPOINT, approvedDomain: "api.twelvedata.com" };

/** Bars are returned NEWEST-FIRST by the provider (`order` defaults to `desc`). */
const bar = (datetime: string, open: number, close: number, high?: number, low?: number) => ({
  datetime, open: String(open), close: String(close),
  high: String(high ?? Math.max(open, close)), low: String(low ?? Math.min(open, close)),
});

let seenUrls: string[] = [];
function stub(payload: unknown, status = 200) {
  seenUrls = [];
  globalThis.fetch = (async (u: URL | string) => {
    seenUrls.push(String(u));
    return { ok: status < 400, status, text: async () => JSON.stringify(payload) } as Response;
  }) as typeof fetch;
}

const feed = new TwelveDataBarFeed(KEY);
const AT = "2026-08-04T07:34:00.000Z";
const HEALTHY = {
  status: "ok",
  values: [
    bar("2026-08-04 07:35:00", 63700, 63710),
    bar("2026-08-04 07:34:00", 63715.51, 63684.8, 63720, 63680),
    bar("2026-08-04 07:33:00", 63763.33, 63715.52),
    bar("2026-08-04 07:32:00", 63750, 63763.33),
  ],
};

// ── §1 · the exact bar, and NOTHING else ───────────────────────────────────
stub(HEALTHY);
const good = await quoteAsset(feed, { ...REQ, at: AT });
ok("§1 a healthy bar is accepted", good.ok, good.ok ? "" : `refused: ${good.reason} ${good.detail}`);
ok("§1 ⛔ the price is the OPEN of the bar labelled T, not its close and not a neighbour's",
  good.ok && good.price === 63715.51,
  good.ok ? `got ${good.price}` : "refused",
);
ok("§1 quotedAt is the bar's own instant — so it EQUALS the boundary",
  good.ok && Date.parse(good.quotedAt) === Date.parse(AT),
  good.ok ? `got ${good.quotedAt}` : "refused",
);

// §1b · ⛔ E-71 — the timezone parameter must be sent, explicitly.
ok("§1b ⛔ timezone=UTC is sent on every call",
  seenUrls.some((u) => /[?&]timezone=UTC\b/.test(u)),
  `urls: ${seenUrls.join(" | ")} — without it XAU/USD comes back 600 minutes out (E-71)`);
ok("§1b the interval asked for is 1min", seenUrls.some((u) => /[?&]interval=1min\b/.test(u)));

// ── §2 · a MISSING bar is a hard refusal, never a substitution ─────────────
stub({ status: "ok", values: [bar("2026-08-04 07:33:00", 1, 2), bar("2026-08-04 07:32:00", 1, 2)] });
const missing = await quoteAsset(feed, { ...REQ, at: AT });
ok("§2 ⛔ no bar for the exact minute is REFUSED",
  !missing.ok && missing.reason === "no-bar",
  missing.ok ? `accepted ${missing.price} — a neighbouring minute was substituted` : `reason ${missing.reason}`);
ok("§2 the refusal names the minute it wanted",
  !missing.ok && /07:34/.test(missing.detail), !missing.ok ? missing.detail : "");
stub({ status: "ok", values: [] });
const none = await quoteAsset(feed, { ...REQ, at: AT });
ok("§2 an empty series is `no-bar`, not a crash", !none.ok && none.reason === "no-bar");

// ── §3 · THE BAD-PRINT GUARD — new, and required by the tick-floor margin ──
// The margin band used to absorb provider noise. At the tick floor it absorbs nothing, so a
// single bad print flips the outcome — and a reproducible settlement makes that WORSE.
stub({
  status: "ok",
  values: [
    bar("2026-08-04 07:34:00", 6371.55, 63684.8), // decimal shift — 10x out
    bar("2026-08-04 07:33:00", 63763.33, 63715.52),
  ],
});
const spike = await quoteAsset(feed, { ...REQ, at: AT });
ok("§3 ⛔ a gross jump from the previous minute is REFUSED, not settled",
  !spike.ok && spike.reason === "implausible-bar",
  spike.ok ? `accepted ${spike.price} — one bad print would pay the wrong side` : `reason ${spike.reason}`);
ok("§3 the refusal quantifies the jump", !spike.ok && /%/.test(spike.detail), !spike.ok ? spike.detail : "");

// A bar whose open sits outside its own high/low is a fault, not a price.
stub({ status: "ok", values: [bar("2026-08-04 07:34:00", 63715.51, 63700, 63705, 63690)] });
const contradictory = await quoteAsset(feed, { ...REQ, at: AT });
ok("§3 ⛔ a bar that contradicts its own range is refused",
  !contradictory.ok && contradictory.reason === "implausible-bar",
  contradictory.ok ? "accepted" : `reason ${contradictory.reason}`);

// ⚠️ …and it must NOT fire on a real market. A 0.65% move was the worst measured 3-minute
// move on BTC; the bound is 2%. A guard that refuses real volatility voids rounds for no
// integrity gain, which is E-25's exact shape.
stub({
  status: "ok",
  values: [
    bar("2026-08-04 07:34:00", 64150, 64100), // +0.6% from 63763.33
    bar("2026-08-04 07:33:00", 63700, 63763.33),
  ],
});
const realMove = await quoteAsset(feed, { ...REQ, at: AT });
ok("§3 ⚠️ a REAL 0.6% minute move is still accepted", realMove.ok,
  realMove.ok ? "" : `refused ${realMove.reason}: ${realMove.detail} — the bound is refusing real markets`);

// ── §4 · the evidence must be re-derivable, and must not leak the key ──────
stub(HEALTHY);
const ev = await quoteAsset(feed, { ...REQ, at: AT });
if (!ev.ok) { ok("§4 evidence case produced a quote", false, ev.detail); } else {
  ok("§4 ⛔ the API key never reaches sourceUrl", !ev.sourceUrl.includes(KEY), ev.sourceUrl);
  ok("§4 ⛔ the API key never reaches evidence", !ev.evidence.includes(KEY));
  ok("§4 evidence is the MATCHED bar, not the batch body",
    ev.evidence.includes("07:34:00") && !ev.evidence.includes("07:32:00"),
    `a hash over the whole response is not reproducible — it changes with the request window`);
  ok("§4 the hash is stable for the same bar", ev.rawHash.length > 0);
  ok("§4 the provider is named as the dated reader", ev.provider === "twelvedata-bars", ev.provider);
}

// §4b · the SAME bar fetched with a different surrounding window must hash identically —
// otherwise the same boundary yields two different receipts depending on which call served it.
stub({ status: "ok", values: [HEALTHY.values[1]!, HEALTHY.values[2]!] });
const narrow = await quoteAsset(feed, { ...REQ, at: AT });
ok("§4b a cache-hit and a targeted fetch produce the SAME receipt",
  ev.ok && narrow.ok && ev.rawHash === narrow.rawHash,
  ev.ok && narrow.ok ? `${ev.rawHash} vs ${narrow.rawHash}` : "one refused");

// ── §5 · provider faults are refusals, never prices ────────────────────────
stub({ code: 429, message: "You have run out of API credits", status: "error" });
const rateLimited = await quoteAsset(feed, { ...REQ, at: AT });
ok("§5 an in-band provider error is refused", !rateLimited.ok && rateLimited.reason === "http-error");
stub(HEALTHY, 500);
const http500 = await quoteAsset(feed, { ...REQ, at: AT });
ok("§5 an HTTP failure is refused", !http500.ok && http500.reason === "http-error");

// §5b · the off-domain gate still applies — one allowlist, not two.
stub(HEALTHY);
const offDomain = await quoteAsset(feed, { ...REQ, endpoint: "https://evil.example.com/time_series", at: AT });
ok("§5b ⛔ an off-allowlist endpoint is refused before any fetch",
  !offDomain.ok && offDomain.reason === "wrong-source");

// §5c · a reader asked for no instant cannot invent one.
stub(HEALTHY);
const undated = await quoteAsset(feed, { ...REQ });
ok("§5c ⛔ the dated reader refuses when given no instant", !undated.ok,
  undated.ok ? "it quoted something without being told which minute" : "");

console.log(`\nUP & DOWN BARS — ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1); }
