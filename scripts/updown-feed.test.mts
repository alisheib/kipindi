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

import {
  MockPriceFeed, TwelveDataFeed, UnconfiguredFeed,
  feedFromId, quoteAsset, describeFeedRefusal,
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

const line = "─".repeat(66);
console.log(`\n${line}\n  UPDOWN FEED: ${pass} passed, ${fail} failed\n${line}`);
if (fail === 0) {
  console.log("  OK — a simulated price cannot settle production, a missing key refuses rather");
  console.log("       than inventing, the API key never reaches a stored observation, and an");
  console.log("       undated or off-domain quote is refused.");
}
process.exit(fail === 0 ? 0 : 1);
