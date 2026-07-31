/**
 * ops · Can the Up & Down oracle actually READ a price from a given source?
 *
 * WHY THIS EXISTS. Production ran the oracle 656 times, spent $59.37, and produced
 * ZERO confirmed readings — every round it has ever opened VOIDed (campaign finding
 * E-16). The stored refusals all say the same thing: the approved page serves its price
 * from a JavaScript widget, so a web search reads boilerplate and no number. Before
 * anyone re-points an asset at a different source "to fix it", that source has to be
 * PROVEN readable — and proven readable *within the staleness window*, which is the
 * part that is easy to forget and is usually what actually fails.
 *
 * It drives the REAL `observePrice`, so what it reports is what the live engine would
 * do. It writes NOTHING: `DATABASE_URL` is deleted before any import, so the DAL falls
 * back to its in-memory store and no observation, round or usage row touches production.
 * `DEFAULT_UPDOWN_CONFIG` (maxStalenessSeconds 90, confidenceThreshold 85) is
 * byte-identical to live `SystemConfig.updown.config`, so the gates are the real ones.
 *
 * ⚠️ IT SPENDS REAL TOKENS — roughly $0.09–$0.35 per probe (web-search results make the
 * input huge). The live cycle cap is $20. Probe deliberately, not in a loop.
 *
 * Usage — run THROUGH railway so the production key is injected and never written down:
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-probe-source.mts \
 *     --url https://www.coingecko.com/en/coins/bitcoin --domain coingecko.com \
 *     --symbol BTC/USD --name Bitcoin --decimals 2
 *
 * Optional: --boundary <ISO>  (default: now, the most favourable case for staleness)
 */

// ⛔ BEFORE ANY IMPORT. `railway run` injects the INTERNAL DATABASE_URL, which does not
// resolve from a laptop; leaving it set would make every DAL call hang or throw instead
// of using the in-memory fallback. Removing it is also what guarantees this probe cannot
// write to the live money database.
delete process.env.DATABASE_URL;
delete process.env.DATABASE_PUBLIC_URL;
process.env.SESSION_SECRET ??= "probe-only-session-secret-32chars-aa";
process.env.OTP_PEPPER ??= "probe-only-otp-pepper-16";
// Match production's ai_ops_config model exactly, so the probe measures the model that
// is actually serving.
process.env.UPDOWN_ORACLE_MODEL ??= "claude-sonnet-4-6";

import { observePrice, describeRefusal } from "../src/lib/server/updown-oracle.ts";
import { DEFAULT_UPDOWN_CONFIG } from "../src/lib/server/updown-config.ts";
import type { StoredAsset } from "../src/lib/server/updown-dal.ts";

const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : d;
};

const url = arg("url");
const domain = arg("domain");
if (!url || !domain) {
  console.error("need --url and --domain (see the header for a full example)");
  process.exit(2);
}
const boundary = arg("boundary") ?? new Date().toISOString();
const decimals = Number(arg("decimals", "2"));

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("NO ANTHROPIC_API_KEY — run through `railway run -s 50pick --`");
  process.exit(2);
}

const asset: StoredAsset = {
  id: "uda_probe", key: arg("key", "PROBE")!, symbol: arg("symbol", "PROBE/USD")!,
  nameEn: arg("name", "Probe asset")!, nameSw: arg("name", "Probe asset")!, nameZh: null,
  iconKey: "gold", priceSourceUrl: url, sourceDomain: domain,
  category: arg("category", "macro")!, decimals,
  minMoveTicks: Number(arg("minMoveTicks", "15")),
  enabled: true, sortOrder: 0, createdBy: "ops-probe",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

console.log("── PROBE ─────────────────────────────────────────────");
console.log(`  source     ${url}`);
console.log(`  domain     ${domain}`);
console.log(`  boundary   ${boundary}`);
console.log(`  gates      staleness <= ${DEFAULT_UPDOWN_CONFIG.maxStalenessSeconds}s · confidence >= ${DEFAULT_UPDOWN_CONFIG.confidenceThreshold}`);
console.log(`  model      ${process.env.UPDOWN_ORACLE_MODEL}`);
console.log("  (real tokens · no DB writes)\n");

const started = Date.now();
const r = await observePrice(asset, boundary);
const took = ((Date.now() - started) / 1000).toFixed(1);

if (r.ok) {
  console.log(`✅ READABLE — a CONFIRMED reading in ${took}s`);
  console.log(`   price          ${r.price}`);
  console.log(`   sourceQuotedAt ${r.sourceQuotedAt}   (the SOURCE's own time)`);
  console.log(`   skew           ${r.skewSeconds}s from the boundary (limit ${DEFAULT_UPDOWN_CONFIG.maxStalenessSeconds}s)`);
  console.log(`   confidence     ${r.confidence}`);
  console.log(`   sourceUrl      ${r.sourceUrl}`);
  console.log(`   evidence       ${r.evidence.slice(0, 220)}`);
  console.log(`\n   → This source CAN settle a round. Re-pointing an asset at it is viable.`);
} else {
  console.log(`❌ REFUSED in ${took}s`);
  console.log(`   reason   ${r.reason}`);
  console.log(`   operator "${describeRefusal(r.reason, r.detail)}"`);
  console.log(`   detail   ${r.detail}`);
  // The two refusals mean very different things, and conflating them is how a source
  // gets blamed for a clock problem (or the reverse).
  if (r.reason === "stale") {
    console.log(`\n   → The page WAS read and a price WAS found; it is the SOURCE'S OWN TIMESTAMP that`);
    console.log(`     sits outside the ${DEFAULT_UPDOWN_CONFIG.maxStalenessSeconds}s window. Re-pointing to another readable page will NOT`);
    console.log(`     help unless that page publishes a fresher time. This is the time contract,`);
    console.log(`     not a readability problem.`);
  } else if (r.reason === "unparseable-price" || r.reason === "no-evidence") {
    console.log(`\n   → The page could not be READ (E-16's failure mode: a JS/widget-rendered price`);
    console.log(`     that a web search sees as boilerplate). This source is unusable as-is.`);
  }
  process.exitCode = 1;
}
