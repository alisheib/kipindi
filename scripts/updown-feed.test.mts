/**
 * Up & Down PRICE FEED — the money-safety properties.
 *
 *   npx tsx scripts/updown-feed.test.mts     (npm run test:updown-feed)
 *
 * Pure functions + a stubbed `fetch`. No DB, no network, no API key.
 *
 * ⛔ WHAT THIS SUITE EXISTS TO PREVENT. A feed decides real money, so the dangerous
 * failures are not "the price is slightly wrong" — they are:
 *
 *   1. a SIMULATED price settling a real round (the A-5 no-fabrication rule; this
 *      platform has already shipped a synthetic random walk to real-money bettors once,
 *      via `seedHistory()`, and a fabricated price is strictly worse because it SETTLES);
 *   2. a real provider with no API key SILENTLY DEGRADING to the simulated one — the same
 *      defect wearing a config bug as a disguise;
 *   3. the API KEY leaking into a stored observation, which is rendered in the player's
 *      proof panel and kept in the audit trail forever;
 *   4. a quote with NO TIMESTAMP being accepted — the exact failure that made the AI
 *      oracle unusable, reintroduced through the thing built to replace it;
 *   5. an endpoint off the approved domain being quoted at all.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import {
  MockPriceFeed, TwelveDataFeed, UnconfiguredFeed,
  feedFromId, quoteAsset, describeFeedRefusal, judgeFeedStaleness,
  type FeedRequest,
} from "../src/lib/server/updown-feed.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const REQ: FeedRequest = { symbol: "XAU/USD", decimals: 2, endpoint: "https://api.twelvedata.com/quote" };
const KEY = "secret-key-must-never-be-stored";

/** Swap `fetch` for one canned response. Returns a restore function. */
function stubFetch(status: number, body: string): () => void {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  })) as unknown as typeof fetch;
  return () => { globalThis.fetch = real; };
}

// ── 1 · ⛔ A simulated price must never settle real money ────────────────────
console.log("\n── 1 · the simulated feed refuses in production ──");
{
  const feed = new MockPriceFeed();
  const before = process.env.NODE_ENV;

  process.env.NODE_ENV = "development";
  const dev = await feed.quote(REQ);
  ok("1.1 · it works in development, so tests and local dev have a price", dev.ok);
  ok("1.2 · …and says plainly that the number is simulated",
     dev.ok && dev.evidence.includes("SIMULATED"), dev.ok ? dev.evidence.slice(0, 40) : "");

  process.env.NODE_ENV = "production";
  const prod = await feed.quote(REQ);
  ok("1.3 · ⛔ it REFUSES in production — a fabricated price would settle real money",
     !prod.ok && prod.reason === "mock-in-production", prod.ok ? "IT RETURNED A PRICE" : prod.reason);
  ok("1.4 · …and there is no env flag that re-enables it",
     !(await feed.quote(REQ)).ok, "the refusal must not be an operator-flippable switch");

  process.env.NODE_ENV = before;
}

// ── 2 · ⛔ A missing key must NOT degrade to the simulated feed ──────────────
console.log("\n── 2 · a real provider with no key refuses, it does not fall back ──");
{
  const before = process.env.TWELVEDATA_API_KEY;
  delete process.env.TWELVEDATA_API_KEY;

  const feed = feedFromId("twelvedata");
  ok("2.1 · the selected provider is NOT swapped for the mock",
     !(feed instanceof MockPriceFeed), feed.constructor.name);
  ok("2.2 · it is the explicitly-unconfigured provider", feed instanceof UnconfiguredFeed);

  const q = await feed.quote(REQ);
  ok("2.3 · ⛔ it refuses rather than inventing a price",
     !q.ok && q.reason === "not-configured", q.ok ? "IT RETURNED A PRICE" : q.reason);
  ok("2.4 · …and names the missing variable, so an operator can fix it",
     !q.ok && q.detail.includes("TWELVEDATA_API_KEY"), q.ok ? "" : q.detail);

  process.env.TWELVEDATA_API_KEY = "k";
  ok("2.5 · with a key it selects the real provider", feedFromId("twelvedata") instanceof TwelveDataFeed);
  if (before === undefined) delete process.env.TWELVEDATA_API_KEY; else process.env.TWELVEDATA_API_KEY = before;
}

// ── 3 · ⛔ The API key must never reach a stored observation ─────────────────
console.log("\n── 3 · the key never lands in the proof panel or the audit trail ──");
{
  const restore = stubFetch(200, JSON.stringify({ symbol: "XAU/USD", close: "2431.07", timestamp: 1785500000 }));
  const q = await new TwelveDataFeed(KEY).quote(REQ);
  restore();

  ok("3.0 · the quote succeeded", q.ok, q.ok ? "" : `${q.reason} ${q.detail}`);
  ok("3.1 · ⛔ the key is NOT in sourceUrl — that string is rendered to players",
     q.ok && !q.sourceUrl.includes(KEY), q.ok ? q.sourceUrl : "");
  ok("3.2 · ⛔ the key is NOT in the evidence — that string is kept forever",
     q.ok && !q.evidence.includes(KEY));
  ok("3.3 · the sourceUrl still identifies the exact endpoint and symbol",
     q.ok && q.sourceUrl.includes("api.twelvedata.com/quote") && q.sourceUrl.includes("XAU"), q.ok ? q.sourceUrl : "");
}

// ── 4 · ⛔ A quote with no timestamp is refused ──────────────────────────────
console.log("\n── 4 · no timestamp, no settlement (the defect that broke the oracle) ──");
{
  const restore = stubFetch(200, JSON.stringify({ close: "2431.07" })); // price, no timestamp
  const q = await new TwelveDataFeed(KEY).quote(REQ);
  restore();
  ok("4.1 · ⛔ refused — a price we cannot date is a price we cannot settle on",
     !q.ok && q.reason === "no-timestamp", q.ok ? "IT ACCEPTED AN UNDATED PRICE" : q.reason);
}

// ── 5 · The provider's own time is what gets stored ──────────────────────────
console.log("\n── 5 · the stored time is the PROVIDER'S, never ours ──");
{
  const providerTs = 1785500000; // a fixed instant, deliberately not "now"
  const restore = stubFetch(200, JSON.stringify({ close: "2431.071999", timestamp: providerTs }));
  const q = await new TwelveDataFeed(KEY).quote(REQ);
  restore();

  ok("5.1 · quotedAt is the provider's timestamp, to the second",
     q.ok && q.quotedAt === new Date(providerTs * 1000).toISOString(), q.ok ? q.quotedAt : "");
  ok("5.2 · the price is quantised to the asset's own precision",
     q.ok && q.price === 2431.07, q.ok ? String(q.price) : "");
  ok("5.3 · rawHash is a stable 16-char digest of the response body",
     q.ok && q.rawHash.length === 16);
}

// ── 6 · Provider failures are reported, not swallowed ───────────────────────
console.log("\n── 6 · a failure keeps the provider's own words ──");
{
  const r1 = stubFetch(429, "rate limit exceeded for your plan");
  const http = await new TwelveDataFeed(KEY).quote(REQ);
  r1();
  ok("6.1 · an HTTP error is refused and keeps the body",
     !http.ok && http.reason === "http-error" && http.detail.includes("rate limit"),
     http.ok ? "" : http.detail);

  // The provider signals its own errors in-band with HTTP 200.
  const r2 = stubFetch(200, JSON.stringify({ code: 401, message: "Invalid API key" }));
  const inband = await new TwelveDataFeed(KEY).quote(REQ);
  r2();
  ok("6.2 · an in-band error at HTTP 200 is still refused",
     !inband.ok && inband.detail.includes("401"), inband.ok ? "IT ACCEPTED AN ERROR BODY" : inband.detail);

  const r3 = stubFetch(200, "<html>not json</html>");
  const junk = await new TwelveDataFeed(KEY).quote(REQ);
  r3();
  ok("6.3 · a non-JSON body is refused", !junk.ok && junk.reason === "unparseable-price");

  const r4 = stubFetch(200, JSON.stringify({ close: "0", timestamp: 1785500000 }));
  const zero = await new TwelveDataFeed(KEY).quote(REQ);
  r4();
  ok("6.4 · a zero or negative price is refused", !zero.ok && zero.reason === "unparseable-price");
}

// ── 7 · ⛔ The endpoint must be on the approved domain ───────────────────────
console.log("\n── 7 · one allowlist — the endpoint's host must be the approved domain ──");
{
  const restore = stubFetch(200, JSON.stringify({ close: "2431.07", timestamp: 1785500000 }));
  const feed = new TwelveDataFeed(KEY);

  const wrong = await quoteAsset(feed, { ...REQ, endpoint: "https://evil.example.com/quote", approvedDomain: "twelvedata.com" });
  ok("7.1 · ⛔ an endpoint off the approved domain is refused before any call",
     !wrong.ok && wrong.reason === "wrong-source", wrong.ok ? "IT QUOTED A FOREIGN HOST" : wrong.reason);

  const right = await quoteAsset(feed, { ...REQ, approvedDomain: "twelvedata.com" });
  ok("7.2 · a subdomain of the approved domain is accepted", right.ok, right.ok ? "" : right.detail);
  restore();
}

// ── 8 · Every refusal reason has operator-readable text ─────────────────────
console.log("\n── 8 · an operator can read every refusal ──");
{
  const reasons = ["not-configured", "mock-in-production", "http-error", "unparseable-price", "no-timestamp", "wrong-source", "error"] as const;
  const texts = reasons.map((r) => describeFeedRefusal(r, "detail here"));
  ok("8.1 · every reason produces distinct, non-empty text",
     texts.every((t) => t.length > 10) && new Set(texts).size === reasons.length);
  ok("8.2 · none of them says just 'failed'", !texts.some((t) => /^\s*failed/i.test(t)));
}

// ── 9 · ⛔ E-25 · the QUOTE's time, not the BAR's time ───────────────────────
/**
 * The regression that made the feed useless the day it shipped, and looked exactly like
 * a shut market. `/quote` returns `timestamp` (the OHLC bar — with no `interval` the
 * provider defaults to `1day`, so: the start of today) AND `last_quote_at` (when the price
 * was actually quoted). Reading the former against a 90s staleness limit refuses EVERY
 * boundary on EVERY asset FOREVER — E-16 again, inside the module written to fix E-16.
 *
 * The numbers below are the real ones measured on production 2026-08-01, so this suite
 * fails against the shape that actually shipped rather than an invented one.
 */
console.log("\n── 9 · E-25 · the QUOTE's own time, never the daily BAR's ──");
{
  const barTs = 1785542400;  // 2026-08-01T00:00:00Z — the 1day bar, 20.4h before the quote
  const quoteTs = 1785615960; // 2026-08-01T20:26:00Z — when the price was really quoted
  const body = JSON.stringify({
    symbol: "BTC/USD", datetime: "2026-08-01", timestamp: barTs, last_quote_at: quoteTs,
    close: "62601.98", is_market_open: true,
  });

  const restore = stubFetch(200, body);
  const q = await new TwelveDataFeed(KEY).quote(REQ);
  restore();

  ok("9.1 · ⛔ quotedAt is `last_quote_at`, NOT the daily bar's `timestamp`",
     q.ok && q.quotedAt === new Date(quoteTs * 1000).toISOString(),
     q.ok ? (q.quotedAt === new Date(barTs * 1000).toISOString()
       ? "IT READ THE BAR TIME — every round would void (E-25)" : q.quotedAt) : q.detail);

  // The property that actually matters, stated as the operator experiences it.
  const boundary = new Date(quoteTs * 1000).toISOString();
  ok("9.2 · ⛔ a real production response CONFIRMS at its own boundary",
     q.ok && judgeFeedStaleness(q.quotedAt, boundary, 90).ok,
     q.ok ? `skew ${judgeFeedStaleness(q.quotedAt, boundary, 90).skewSeconds}s` : "");

  // Pin the failure directly, so the guard states the bug and not just the fix.
  ok("9.3 · ⛔ the bar timestamp would have been 20.4h stale — unsatisfiable, always",
     !judgeFeedStaleness(new Date(barTs * 1000).toISOString(), boundary, 90).ok);

  // A provider that omits the quote time still gets dated — a bar time is a worse
  // answer than a quote time, but it is still the PROVIDER'S own time.
  const r2 = stubFetch(200, JSON.stringify({ close: "2431.07", timestamp: barTs }));
  const fallback = await new TwelveDataFeed(KEY).quote(REQ);
  r2();
  ok("9.4 · with no `last_quote_at`, it falls back to `timestamp` rather than refusing",
     fallback.ok && fallback.quotedAt === new Date(barTs * 1000).toISOString());
}

// ── 10 · ⛔ ONE staleness rule — the ops probe must certify what the engine applies ──
/**
 * `ops:updown-probe-feed` exists to answer "can this source settle a round?" before an
 * operator flips the provider on a live money platform. If it computes staleness itself,
 * it can green-light a source the engine then refuses on every boundary — or, worse,
 * refuse one the engine would accept, sending the operator to fix a system that is fine.
 * So there is exactly ONE implementation and both call it.
 */
console.log("\n── 10 · one staleness rule, read by both the money path and the ops probe ──");
{
  const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8")
    // Strip comments FIRST. `test:updown-heal` 10.4 was tripped by a comment that
    // correctly EXPLAINED the rule it was checking for, which teaches the next session to
    // delete the explanation. Never let prose fail a structural guard.
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  const service = src("../src/lib/server/updown-service.ts");
  const probe = src("./ops-updown-probe-feed.mts");

  ok("10.1 · the money path calls judgeFeedStaleness", service.includes("judgeFeedStaleness("));
  ok("10.2 · the ops probe calls the SAME function", probe.includes("judgeFeedStaleness("));
  ok("10.3 · ⛔ neither re-derives the skew itself",
     !/Math\.round\(Math\.abs\([^)]*Date\.parse/.test(service) && !/maxStalenessSeconds\s*\)?\s*\{/.test(probe));
  ok("10.4 · the probe drives the real quote path, not a hand-rolled fetch",
     probe.includes("quoteAsset(") && !/await fetch\(/.test(probe));
}

const line = "─".repeat(66);
console.log(`\n${line}\n  UPDOWN FEED: ${pass} passed, ${fail} failed\n${line}`);
if (fail === 0) {
  console.log("  OK — a simulated price cannot settle production, a missing key refuses rather");
  console.log("       than inventing, the API key never reaches a stored observation, and an");
  console.log("       undated or off-domain quote is refused.");
}
process.exit(fail === 0 ? 0 : 1);
