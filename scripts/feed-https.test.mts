/**
 * E-51 · THE PROVIDER API KEY MUST NEVER TRAVEL IN CLEARTEXT — the guard.
 *
 *   npx tsx scripts/feed-https.test.mts        (npm run test:feed-https)
 *
 * WHY. `TwelveDataFeed.quote` sets the credential as a QUERY PARAMETER:
 *
 *     url.searchParams.set("apikey", this.apiKey)
 *
 * over `http://` that whole URL crosses the network in the clear. The key is paid and metered
 * and **settlement depends on it** — a drained quota means rounds cannot read a price, which
 * voids them and refunds real players. A redirect to https does not save it: the plaintext
 * request has already been sent.
 *
 * ⚠️ AND IT WAS NOT HYPOTHETICAL. Measured on production 2026-08-03: **two enabled assets were
 * configured with `http://api.twelvedata.com/quote` (SOL and XAU), and SOL's 5-minute chain was
 * RUNNING on one of them.** Nothing had ever refused it, because `validateAsset` did
 * `normalizeDomain(new URL(url).hostname)` — which discards the scheme before the allowlist
 * check, so the http URL passed every gate the platform had.
 *
 * ── THE TWO HALVES ARE DELIBERATELY DIFFERENT, AND THAT IS THE POINT ────────────────────────
 * §1 · `quoteAsset` UPGRADES http → https. It must NOT refuse. Refusing was the first instinct
 *      and it was wrong: SOL's chain was live, so a read-time refusal would have voided and
 *      refunded real rounds because of an operator's typo — inverting the exact rule the
 *      `no-api-key` carve-out exists to enforce (a misconfigured feed is an operator problem,
 *      never a reason to move a player's money).
 * §2 · `validateAsset` REFUSES http. At the form it costs nobody a round, so this is where the
 *      configuration is actually stopped from recurring.
 *
 * A guard that asserted "http is refused" everywhere would have passed the dangerous version.
 */
import { quoteAsset, MockPriceFeed, hostMatchesDomain } from "../src/lib/server/updown-feed";

let pass = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; return; }
  fails.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

// A feed that records the endpoint it was actually handed, so §1 can assert on the REQUEST
// rather than on a return value the upgrade might not surface.
class SpyFeed extends MockPriceFeed {
  seen: string[] = [];
  override async quote(req: Parameters<MockPriceFeed["quote"]>[0]) {
    this.seen.push(req.endpoint);
    return super.quote(req);
  }
}

const REQ = { symbol: "BTC/USD", decimals: 2, approvedDomain: "api.twelvedata.com" };

// ── §1 · quoteAsset upgrades, and does not refuse ────────────────────────────────
{
  const spy = new SpyFeed();
  const r = await quoteAsset(spy, { ...REQ, endpoint: "http://api.twelvedata.com/quote" });
  ok("§1 an http endpoint is still READ (a live chain must not start voiding)", r.ok,
    r.ok ? "" : `refused: ${r.reason} ${r.detail}`);
  ok("§1 ⛔ and the request that went out was HTTPS",
    spy.seen.length === 1 && spy.seen[0].startsWith("https://"), `fetched ${spy.seen[0]}`);
  ok("§1 …with the host and path preserved",
    spy.seen[0] === "https://api.twelvedata.com/quote", `got ${spy.seen[0]}`);
}
{
  // An https endpoint must pass through BYTE-IDENTICAL. `new URL().toString()` normalises —
  // it would append a trailing "/" to a bare origin — and a rewritten URL that no longer
  // equals the asset's configured link would make every round's captured source look moved.
  const spy = new SpyFeed();
  const endpoint = "https://api.twelvedata.com/quote";
  const r = await quoteAsset(spy, { ...REQ, endpoint });
  ok("§1 an https endpoint reads", r.ok);
  ok("§1 …and is passed through unchanged", spy.seen[0] === endpoint, `got ${spy.seen[0]}`);
}
{
  // localhost keeps http, so a dev stub still works.
  const spy = new SpyFeed();
  await quoteAsset(spy, { ...REQ, endpoint: "http://localhost:9999/quote", approvedDomain: "localhost" });
  ok("§1 localhost is exempt", spy.seen[0] === "http://localhost:9999/quote", `got ${spy.seen[0]}`);
}
{
  // The upgrade must not smuggle a host past the approved-domain check — that check runs first.
  const spy = new SpyFeed();
  const r = await quoteAsset(spy, { ...REQ, endpoint: "http://evil.example/quote" });
  ok("§1 ⛔ a foreign host is still refused, upgrade or not", !r.ok && r.reason === "wrong-source",
    r.ok ? "IT READ A FOREIGN HOST" : "");
  ok("§1 …and never reached the feed", spy.seen.length === 0, `feed saw ${spy.seen.join(",")}`);
}
{
  const spy = new SpyFeed();
  const r = await quoteAsset(spy, { ...REQ, endpoint: "not a url" });
  ok("§1 a malformed endpoint is refused, not thrown", !r.ok);
  ok("§1 …without calling the feed", spy.seen.length === 0);
}

// ── §2 · the FORM refuses http outright ──────────────────────────────────────────
{
  // Driven through the real service so the refusal is the one an operator would actually hit.
  const { createAsset, __resetUpDownConfig } = await import("../src/lib/server/updown-config");
  const { __resetUpDownMemoryStores } = await import("../src/lib/server/updown-dal");
  const { seedDefaultSources, addSource } = await import("../src/lib/server/source-registry");
  const { QUOTE_DOMAIN, QUOTE_ENDPOINT } = await import("../src/lib/server/updown-symbols");
  __resetUpDownMemoryStores();
  __resetUpDownConfig();
  await seedDefaultSources();
  await addSource({ domain: QUOTE_DOMAIN, label: "Twelve Data", category: "crypto", rationale: "feed", addedBy: "system" });

  const base = {
    symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
    category: "crypto" as const, decimals: 2, minMoveTicks: 2,
  };
  const bad = await createAsset({ ...base, key: "HTTPBAD", priceSourceUrl: "http://api.twelvedata.com/quote" }, "usr_officer");
  ok("§2 ⛔ an http price source is REFUSED at creation", !bad.ok, bad.ok ? "IT WAS ACCEPTED" : "");
  ok("§2 …and the refusal explains the key is in the query string",
    !bad.ok && /cleartext|query parameter/i.test(bad.error), bad.ok ? "" : bad.error);
  ok("§2 …and offers the https form of the same link",
    !bad.ok && /https:\/\/api\.twelvedata\.com\/quote/.test(bad.error), bad.ok ? "" : bad.error);

  const good = await createAsset({ ...base, key: "HTTPSOK", priceSourceUrl: QUOTE_ENDPOINT }, "usr_officer");
  ok("§2 …while the https form is accepted", good.ok, good.ok ? "" : good.error);
}

// ── §3 · the invariant the whole finding rests on ────────────────────────────────
{
  // If the key ever stops being a query parameter this guard's rationale changes, so assert the
  // thing that makes cleartext dangerous rather than trusting the comment above it.
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/lib/server/updown-feed.ts", import.meta.url), "utf8");
  ok("§3 the api key is still sent as a query parameter (why http matters)",
    /searchParams\.set\("apikey"/.test(src),
    "the key is no longer a query param — re-read E-51 before relaxing anything here");
  ok("§3 hostMatchesDomain is still scheme-agnostic (so it cannot be the gate)",
    hostMatchesDomain("http://api.twelvedata.com/quote", "api.twelvedata.com"),
    "if this now rejects http, §1's ordering assertion needs revisiting");
}

console.log(`\nE-51 · feed https — ${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
