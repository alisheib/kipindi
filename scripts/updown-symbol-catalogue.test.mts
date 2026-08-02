/**
 * GUARD — an Up & Down asset cannot be created in a shape that cannot work.
 *
 * 🔴 THIS SHIPPED. On production, 2026-08-02, in one afternoon:
 *   · `ETH` (not `ETH/USD`) pointed at coingecko.com — the feed cannot quote it — and it
 *     voided 27 of 27 rounds;
 *   · `BNB` filed as category `macro`, so `sessionKindFor` applied the FX/metals week to a
 *     24/7 coin and the console showed it "closed · opens 22:00 UTC".
 * Neither was rejected. The Add-asset form took the symbol as free text, the category as
 * an unrelated dropdown, and the source URL as free text — three fields that must agree,
 * with nothing making them agree. Findings E-45 / E-46.
 *
 * ⛔ The form's dropdowns are a courtesy. THIS tests the control: `validateSymbolCategory`,
 * which `createAsset` calls on every write, so a stale tab or a scripted POST is refused
 * the same way a mis-click is.
 */
import {
  SYMBOL_CATALOGUE, findSymbol, symbolGroups, validateSymbolCategory,
  tradingHoursNote, QUOTE_DOMAIN, QUOTE_ENDPOINT,
} from "../src/lib/server/updown-symbols.ts";
import { sessionKindFor } from "../src/lib/server/market-calendar.ts";

let pass = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

console.log("\nUp & Down symbol catalogue\n");

// ── The catalogue itself is coherent ────────────────────────────────────────
check("the catalogue is not empty", SYMBOL_CATALOGUE.length > 0, `${SYMBOL_CATALOGUE.length}`);

const dupes = SYMBOL_CATALOGUE.map((s) => s.symbol)
  .filter((s, i, a) => a.indexOf(s) !== i);
check("no duplicate symbols", dupes.length === 0, dupes.join(", "));

for (const s of SYMBOL_CATALOGUE) {
  check(`${s.symbol}: has all three names`,
    !!s.nameEn && !!s.nameSw && !!s.nameZh, JSON.stringify([s.nameEn, s.nameSw, s.nameZh]));
  check(`${s.symbol}: decimals are sane`, s.decimals >= 0 && s.decimals <= 8, String(s.decimals));
  check(`${s.symbol}: minMoveTicks >= 1`, s.minMoveTicks >= 1, String(s.minMoveTicks));
}

// ── THE RULE THAT BNB BROKE: category must match the instrument's calendar ──
// A symbol in the Crypto group must be `crypto`, so `sessionKindFor` gives it 24/7.
// Anything else must NOT be `crypto`, or a shut market would be treated as always open.
for (const s of SYMBOL_CATALOGUE) {
  const expectAlways = s.group === "Crypto";
  const kind = sessionKindFor(s.category);
  check(`${s.symbol} (${s.group}): category "${s.category}" yields the right calendar`,
    expectAlways ? kind === "always" : kind === "fx-metals",
    `sessionKindFor("${s.category}") = ${kind}`);
}

// ── THE RULE THAT ETH BROKE: the symbol must be the provider's form ─────────
// Every catalogued symbol is either a PAIR (`BASE/QUOTE`) or an explicitly unsupported
// index ticker. A bare `ETH` must never appear.
for (const s of SYMBOL_CATALOGUE) {
  check(`${s.symbol}: is a provider pair or an explicitly unsupported ticker`,
    s.symbol.includes("/") || !!s.unsupported, s.symbol);
}

// ── validateSymbolCategory — the actual gate ────────────────────────────────
check("accepts a correct pair (BTC/USD + crypto)",
  validateSymbolCategory("BTC/USD", "crypto") === null);
check("accepts a correct pair (XAU/USD + macro)",
  validateSymbolCategory("XAU/USD", "macro") === null);

// The two production mistakes, by name.
const bnb = validateSymbolCategory("BNB/USD", "macro");
check("REFUSES BNB/USD as macro (the real BNB mistake)", bnb !== null);
check("…and the refusal explains the trading calendar",
  !!bnb && /calendar|24\/7|weekend/i.test(bnb), bnb ?? "");

const eth = validateSymbolCategory("ETH", "crypto");
check("REFUSES a bare `ETH` (the real ETH mistake)", eth !== null);
check("…and the refusal says it is not quotable",
  !!eth && /not a symbol|cannot quote|feed/i.test(eth), eth ?? "");

check("REFUSES an uncatalogued symbol", validateSymbolCategory("DOGE/USD", "crypto") !== null);
check("REFUSES a symbol marked unsupported (SPX)", validateSymbolCategory("SPX", "macro") !== null);
check("…and the SPX refusal names the plan limit",
  /404|plan|Grow/i.test(validateSymbolCategory("SPX", "macro") ?? ""), "");

// Case and whitespace must not be a way around the gate.
check("is case-insensitive on the symbol", validateSymbolCategory("btc/usd", "crypto") === null);
check("trims surrounding whitespace", validateSymbolCategory("  BTC/USD  ", "crypto") === null);

// ── Lookup + grouping, which the form depends on ────────────────────────────
check("findSymbol resolves a known pair", findSymbol("SOL/USD")?.category === "crypto");
check("findSymbol returns undefined for junk", findSymbol("NOT/AREAL") === undefined);
const groups = symbolGroups();
check("every catalogue entry appears in exactly one group",
  groups.reduce((n, g) => n + g.symbols.length, 0) === SYMBOL_CATALOGUE.length);
check("no group is empty", groups.every((g) => g.symbols.length > 0),
  groups.filter((g) => !g.symbols.length).map((g) => g.group).join(", "));

// ── The hours sentence an operator reads ────────────────────────────────────
const cryptoHours = tradingHoursNote({ symbol: "BTC/USD", category: "crypto" });
const metalHours = tradingHoursNote({ symbol: "XAU/USD", category: "macro" });
check("crypto hours say 24/7", /24\/7/.test(cryptoHours), cryptoHours);
check("metals hours name BOTH the open and the close",
  /22:00/.test(metalHours) && /21:00/.test(metalHours), metalHours);
check("metals hours warn that nothing will be seen while shut",
  /no results|refuses/i.test(metalHours), metalHours);

// ── The endpoint the form auto-fills must be on the trusted host ────────────
check("the quote endpoint is on the trusted domain",
  QUOTE_ENDPOINT.includes(QUOTE_DOMAIN), `${QUOTE_ENDPOINT} vs ${QUOTE_DOMAIN}`);
check("the quote endpoint is https", QUOTE_ENDPOINT.startsWith("https://"), QUOTE_ENDPOINT);

console.log(`\n${pass} passed, ${failures.length} failed\n`);
if (failures.length) { for (const f of failures) console.log(`  · ${f}`); process.exit(1); }
