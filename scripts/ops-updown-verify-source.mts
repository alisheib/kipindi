/**
 * OPS — can the oracle ACTUALLY read a price from this page?
 *
 *   railway run npx tsx scripts/ops-updown-verify-source.mts --asset gold
 *   railway run npx tsx scripts/ops-updown-verify-source.mts --asset spx
 *   railway run npx tsx scripts/ops-updown-verify-source.mts --url https://example.com/gold --symbol XAU/USD --name Gold
 *
 * ── WHY THIS EXISTS (2026-07-30) ─────────────────────────────────────────────
 * Up & Down ran for six days and never confirmed a single price. Both configured pages
 * — goldprice.org/live-gold-price.html and a Kitco stocks page — render their quote in a
 * CLIENT-SIDE WIDGET. A browser shows a number; web search sees only the surrounding
 * prose. The model was refusing correctly and saying so plainly ("no actual quoted
 * numeric spot price and no timestamp were captured"), round after round.
 *
 * ⚠️ THE LESSON THIS TOOL ENCODES: a page that reads fine in YOUR browser can be
 * invisible to the thing that actually has to read it. So a source is never approved by
 * looking at it. It is approved by putting it through `observePrice` — the REAL prompt,
 * the REAL gates — and seeing a number and the page's OWN timestamp come back.
 *
 * It calls the live model, so it COSTS money (roughly $0.01-0.05 per candidate) and every
 * call is metered through `recordAiUsage` like any other. That is the point: the same call
 * the round would make, not a cheaper approximation of it.
 *
 * It writes NOTHING to the Up & Down tables — no asset, no chain, no observation. Adding
 * an approved domain stays a deliberate, audited act at /admin/sources.
 */
import { observePrice, describeRefusal } from "../src/lib/server/updown-oracle.ts";
import { isSourceTrusted, normalizeDomain, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import type { StoredAsset } from "../src/lib/server/updown-dal.ts";
import type { MarketCategory } from "../src/lib/server/market-service.ts";

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}

/**
 * Candidates chosen for one reason only: the quote is likely to be in CRAWLABLE TEXT
 * rather than painted by a script. Whether that is actually true is what the run decides
 * — several of these are expected to fail, and a failure here is a useful result.
 */
const CANDIDATES: Record<string, { symbol: string; name: string; decimals: number; urls: string[] }> = {
  gold: {
    symbol: "XAU/USD", name: "Gold", decimals: 2,
    urls: [
      "https://www.kitco.com/price/precious-metals",
      "https://tradingeconomics.com/commodity/gold",
      "https://stooq.com/q/?s=xauusd",
      "https://www.investing.com/currencies/xau-usd",
      "https://finance.yahoo.com/quote/GC=F/",
      "https://www.apmex.com/spotprices/gold-price",
      "https://goldprice.org/live-gold-price.html",
    ],
  },
  /**
   * PLAIN-TEXT / CSV quote endpoints, not HTML pages.
   *
   * The HTML round failed for one reason repeated seven ways: a rendered finance page is
   * either painted by client-side JavaScript (nothing to read) or served from a cache
   * hours-to-days old. A CSV or plain-text quote endpoint has neither problem — it is
   * server-generated, carries its own date+time columns, and is small enough that
   * `web_fetch` returns the whole thing verbatim. This is the last idea that keeps the
   * "AI reads an approved link" design intact; if it fails too, the read method itself is
   * wrong for a 90-second window and that is a decision for the operator.
   */
  "gold-text": {
    symbol: "XAU/USD", name: "Gold", decimals: 2,
    urls: [
      "https://stooq.com/q/l/?s=xauusd&f=sd2t2ohlcv&h&e=csv",
      "https://stooq.com/q/l/?s=xauusd&f=sd2t2c&h&e=csv",
    ],
  },
  "spx-text": {
    symbol: "SPX", name: "S&P 500", decimals: 2,
    urls: [
      "https://stooq.com/q/l/?s=%5Espx&f=sd2t2ohlcv&h&e=csv",
    ],
  },
  spx: {
    symbol: "SPX", name: "S&P 500", decimals: 2,
    urls: [
      "https://tradingeconomics.com/united-states/stock-market",
      "https://stooq.com/q/?s=^spx",
      "https://finance.yahoo.com/quote/%5EGSPC/",
      "https://www.cnbc.com/quotes/.SPX",
      "https://www.marketwatch.com/investing/index/spx",
      "https://www.kitco.com/markets/stocks/FOREXCOM-SPXUSD",
    ],
  },
};

const which = (arg("asset") ?? "").toLowerCase();
const oneUrl = arg("url");
const category = (arg("category") ?? "macro") as MarketCategory;

if (!oneUrl && !CANDIDATES[which]) {
  console.error(`✗ Pass --asset <${Object.keys(CANDIDATES).join("|")}> or --url <page> --symbol <SYM> --name <Name>.`);
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("✗ ANTHROPIC_API_KEY is not set. Run through `railway run` so the oracle can actually call the model.");
  process.exit(1);
}

const spec = oneUrl
  ? {
      symbol: arg("symbol") ?? "?", name: arg("name") ?? "?",
      decimals: Number(arg("decimals") ?? 2), urls: [oneUrl],
    }
  : CANDIDATES[which];

console.log(`asset:    ${spec.name} (${spec.symbol}), ${spec.decimals} dp`);
console.log(`category: ${category}`);
console.log(`candidates: ${spec.urls.length}`);
console.log("⚠️  each candidate is ONE live model call with web search — metered like any other\n");

/** A synthetic asset. NOT persisted — `observePrice` only reads these fields. */
function syntheticAsset(url: string): StoredAsset {
  const now = new Date().toISOString();
  return {
    id: "verify_probe", key: "PROBE", symbol: spec.symbol,
    nameEn: spec.name, nameSw: spec.name, nameZh: null, iconKey: "gold",
    priceSourceUrl: url, sourceDomain: normalizeDomain(new URL(url).hostname),
    category, decimals: spec.decimals, minMoveTicks: 1,
    enabled: false, sortOrder: 0, createdBy: "ops_verify",
    createdAt: now, updatedAt: now,
  };
}

await seedDefaultSources();

type Row = {
  url: string; host: string; readable: boolean; trusted: boolean;
  price: number | null; quotedAt: string | null; skew: number | null; note: string;
};
const rows: Row[] = [];

// The boundary is NOW: a fresh read should sit well inside the staleness window, so a
// large skew here is itself a finding about the page (it publishes a stale figure).
const boundaryIso = new Date().toISOString();

for (const url of spec.urls) {
  const asset = syntheticAsset(url);
  const trust = await isSourceTrusted(url, category);
  process.stdout.write(`  reading ${asset.sourceDomain} … `);

  const reading = await observePrice(asset, boundaryIso);
  if (reading.ok) {
    console.log(`OK  ${reading.price} @ ${reading.sourceQuotedAt} (skew ${reading.skewSeconds}s, confidence ${reading.confidence})`);
    rows.push({
      url, host: asset.sourceDomain, readable: true, trusted: trust.ok,
      price: reading.price, quotedAt: reading.sourceQuotedAt, skew: reading.skewSeconds,
      note: reading.evidence.slice(0, 90),
    });
  } else {
    console.log(`REFUSED (${reading.reason})`);
    rows.push({
      url, host: asset.sourceDomain, readable: false, trusted: trust.ok,
      price: null, quotedAt: null, skew: null,
      note: describeRefusal(reading.reason, reading.detail).slice(0, 120),
    });
  }
}

const line = "─".repeat(78);
console.log(`\n${line}`);
console.log("  RESULT — a source is only usable when READABLE and TRUSTED");
console.log(line);
for (const r of rows) {
  const flag = r.readable ? (r.trusted ? "✓ USABLE  " : "◐ readable") : "✗ unusable";
  console.log(`  ${flag}  ${r.host}`);
  console.log(`             ${r.url}`);
  if (r.readable) {
    console.log(`             price ${r.price} · source time ${r.quotedAt} · skew ${r.skew}s`);
    if (!r.trusted) console.log(`             ⚠️  NOT on the trusted registry for "${category}" — add it at /admin/sources first`);
  } else {
    console.log(`             ${r.note}`);
  }
}

const usable = rows.filter((r) => r.readable && r.trusted);
const readableOnly = rows.filter((r) => r.readable && !r.trusted);
console.log(`\n${line}`);
console.log(`  readable ${rows.filter((r) => r.readable).length}/${rows.length} · of those, already trusted ${usable.length}`);
console.log(line);

if (usable.length === 0 && readableOnly.length === 0) {
  console.log("\n⛔ NOT ONE candidate could be read. Do not start a chain on any of them —");
  console.log("   every round would open, refuse its price, and void with a full refund.");
} else if (readableOnly.length > 0) {
  console.log("\nNEXT STEP — these pages genuinely return a number and their own timestamp,");
  console.log(`but their domain is not yet approved for "${category}". Add at /admin/sources:`);
  for (const r of readableOnly) console.log(`    · ${r.host}`);
}

// Two readable sources for the same asset should agree; a wide gap means at least one is
// quoting something other than spot, and picking blind would settle money on the wrong number.
const priced = rows.filter((r) => r.readable && r.price != null);
if (priced.length >= 2) {
  const lo = Math.min(...priced.map((r) => r.price!));
  const hi = Math.max(...priced.map((r) => r.price!));
  const spreadPct = lo > 0 ? ((hi - lo) / lo) * 100 : 0;
  console.log(`\n  cross-check: ${priced.length} readable sources quote ${lo}-${hi} (spread ${spreadPct.toFixed(3)}%)`);
  if (spreadPct > 1) {
    console.log("  ⚠️  they disagree by more than 1% — at least one is not quoting the same thing.");
    console.log("      Do not approve a source on a single read; identify which figure each page shows.");
  }
}
