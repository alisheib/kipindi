/**
 * ops · Can the configured PRICE FEED actually quote this symbol, right now, fresh enough
 *       to settle a round?
 *
 * ── WHY THIS EXISTS (2026-08-01) ─────────────────────────────────────────────
 * `observationMethod` now defaults to **`feed`**, so the feed is the money path. But the
 * only two ops tools that existed — `ops:updown-probe-source` and
 * `ops:updown-verify-source` — both drive the **AI oracle** (`observePrice`). They spend
 * Anthropic tokens, they read web pages, and they cannot answer the one question an
 * operator actually has before flipping `feedProvider` to a real provider:
 *
 *     "is TWELVEDATA_API_KEY set, does it work, and is the quote FRESH ENOUGH?"
 *
 * Asking the AI probe that question gets a confident answer about a completely different
 * subsystem. Hence this tool. It drives `quoteAsset` + `judgeFeedStaleness` — the exact
 * two functions `readPrice` calls on the money path — so what it reports is what the
 * engine would do, not an approximation of it.
 *
 * ── THE PART THAT IS EASY TO GET WRONG, AND IS USUALLY WHAT FAILS ────────────
 * A quote endpoint always returns *something*. On a closed market it returns the last
 * session's close, with an honest timestamp hours or days old — and `maxStalenessSeconds`
 * is 90. So a source can be perfectly readable and still settle nothing, all weekend,
 * every weekend. That is not a bug and it is not a key problem; it is the asset's trading
 * calendar. This tool reports the SKEW in seconds and names that distinction explicitly,
 * because "the feed is broken" and "the market is shut" look identical in a round history
 * full of VOIDs. (Campaign finding E-25.)
 *
 * ── SAFETY ───────────────────────────────────────────────────────────────────
 * Writes NOTHING. `DATABASE_URL` is deleted before any import, so no observation, round,
 * asset or usage row can be touched. It costs ONE provider credit per symbol (the live
 * plan is 800/day) and ZERO Anthropic tokens.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 * Run THROUGH railway so the production key is injected and never written down:
 *
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-probe-feed.mts --symbol XAU/USD
 *   railway run -s 50pick -- npm run ops:updown-probe-feed -- --symbol BTC/USD
 *   railway run -s 50pick -- npm run ops:updown-probe-feed -- --symbols XAU/USD,SPX,BTC/USD
 *
 * Options: --provider twelvedata|mock · --endpoint <url> · --domain <approved domain>
 *          --decimals N · --boundary <ISO> (default: now — the most favourable case)
 *
 * Exit code 0 only if EVERY probed symbol returned a quote that would CONFIRM.
 */

// ⛔ BEFORE ANY IMPORT — same rule as `ops-updown-probe-source.mts`. `railway run` injects
// the INTERNAL DATABASE_URL, which does not resolve from a laptop; leaving it set would
// make any DAL call hang. Removing it is also what guarantees this probe cannot write to
// the live money database.
delete process.env.DATABASE_URL;
delete process.env.DATABASE_PUBLIC_URL;
process.env.SESSION_SECRET ??= "probe-only-session-secret-32chars-aa";
process.env.OTP_PEPPER ??= "probe-only-otp-pepper-16";

import {
  feedFromId, quoteAsset, describeFeedRefusal, judgeFeedStaleness,
  type FeedProviderId,
} from "../src/lib/server/updown-feed.ts";
import { DEFAULT_UPDOWN_CONFIG } from "../src/lib/server/updown-config.ts";

const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : d;
};

const provider = (arg("provider", "twelvedata") ?? "twelvedata") as FeedProviderId;
const endpoint = arg("endpoint", "https://api.twelvedata.com/quote")!;
const domain = arg("domain", "twelvedata.com")!;
const decimals = Number(arg("decimals", "2"));
const boundary = arg("boundary") ?? new Date().toISOString();
const symbols = (arg("symbols") ?? arg("symbol") ?? "XAU/USD").split(",").map((s) => s.trim()).filter(Boolean);
const limit = DEFAULT_UPDOWN_CONFIG.maxStalenessSeconds;

// Presence only, and only as a yes/no — the value never reaches stdout, a log or a
// transcript. §1 of the campaign doc: no secret VALUE is ever written down.
const keyPresent = Boolean(process.env.TWELVEDATA_API_KEY);

console.log("── FEED PROBE ────────────────────────────────────────");
console.log(`  provider        ${provider}`);
console.log(`  endpoint        ${endpoint}   (approved domain: ${domain})`);
console.log(`  boundary        ${boundary}`);
console.log(`  staleness limit ${limit}s      (updown.config.maxStalenessSeconds)`);
console.log(`  TWELVEDATA_API_KEY present: ${keyPresent ? "YES" : "NO"}`);
if (provider === "twelvedata" && !keyPresent) {
  console.log("  ⚠️  run this THROUGH `railway run -s 50pick --` or the key is not injected.");
}
console.log("  (no DB writes · no Anthropic tokens · 1 provider credit per symbol)\n");

const feed = feedFromId(provider);
console.log(`  selected feed: ${feed.id} — ${feed.label}\n`);

let confirmed = 0;
for (const symbol of symbols) {
  const started = Date.now();
  const q = await quoteAsset(feed, { symbol, decimals, endpoint, approvedDomain: domain });
  const took = ((Date.now() - started) / 1000).toFixed(1);

  if (!q.ok) {
    console.log(`❌ ${symbol} — REFUSED in ${took}s`);
    console.log(`   reason   ${q.reason}`);
    console.log(`   operator "${describeFeedRefusal(q.reason, q.detail)}"`);
    // The reasons mean very different things and conflating them sends an operator to
    // fix the wrong system.
    if (q.reason === "not-configured") {
      console.log(`   → An OPERATOR problem, not a source problem. The provider is selected but`);
      console.log(`     cannot run. Round boundaries will stay PENDING (reason "no-api-key" is`);
      console.log(`     inside the ops-state carve-out), NOT burn the attempt budget.`);
    } else if (q.reason === "mock-in-production") {
      console.log(`   → Working as designed: the simulated feed must never settle real money.`);
      console.log(`     Flip feedProvider to a real provider in the Up & Down console.`);
    } else if (q.reason === "wrong-source") {
      console.log(`   → The endpoint's host is not the approved domain. Both the ASSET's`);
      console.log(`     sourceDomain and an enabled TrustedSource must name "${domain}".`);
    } else if (q.reason === "http-error") {
      console.log(`   → The provider answered and refused. Its own words are above — a bad key,`);
      console.log(`     an unknown symbol and an exhausted quota all land here and read differently.`);
    }
    process.exitCode = 1;
    continue;
  }

  const judged = judgeFeedStaleness(q.quotedAt, boundary, limit);
  const skew = judged.skewSeconds;

  if (judged.ok) {
    confirmed++;
    console.log(`✅ ${symbol} — WOULD CONFIRM (${took}s)`);
  } else {
    console.log(`⏳ ${symbol} — READABLE but STALE (${took}s)`);
    process.exitCode = 1;
  }
  console.log(`   price     ${q.price}`);
  console.log(`   quotedAt  ${q.quotedAt}   (the PROVIDER's own time)`);
  console.log(`   skew      ${skew === null ? "unparseable" : `${skew}s`} from the boundary (limit ${limit}s)`);
  console.log(`   rawHash   ${q.rawHash}`);
  if (!judged.ok && skew !== null) {
    const hours = (skew / 3600).toFixed(1);
    console.log(`\n   → The feed WORKS and the key is fine — this quote is simply ${hours}h old.`);
    console.log(`     That is almost always the asset's TRADING CALENDAR (a shut market quotes its`);
    console.log(`     last close, honestly timestamped), not a fault. An asset whose market is`);
    console.log(`     closed CANNOT settle a ${limit}s-window round, and every round it opens will`);
    console.log(`     void and refund. Use a 24/7 asset, or run the chain in market hours.`);
  }
  console.log("");
}

console.log("──────────────────────────────────────────────────────");
console.log(`  ${confirmed}/${symbols.length} symbol(s) would confirm a reading at this boundary.`);
if (confirmed === symbols.length) console.log("  → The feed can settle rounds for these assets right now.");
