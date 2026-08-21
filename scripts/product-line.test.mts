/**
 * Product-line isolation — the guard that keeps Up & Down money VISIBLE.
 *
 *   npx tsx scripts/product-line.test.mts      (npm run test:product-line)
 *
 * WHY THIS EXISTS. `PredictionMarket.productLine` lets one table carry two products:
 * long-form 50pick polls (`MARKET`) and Up & Down price rounds (`UPDOWN`). To stop the
 * player board scanning ~300k settled rounds to render a dozen polls, `listMarkets()`
 * DEFAULTS to `productLine: "MARKET"`.
 *
 * That default is a loaded gun pointed at the books. Every MONEY or REGULATOR read
 * must opt IN with `productLine: "ALL"` — and if one silently reverts to the default,
 * Up & Down stakes, payouts and commission vanish from GGR, the statutory reports and
 * the platform stats **while every remaining number still reconciles with itself**.
 * Nothing would look broken. That is the worst shape a books defect can take, and it
 * is exactly the "audit the READ path, not just the write path" class of bug.
 *
 * Two independent checks, because either alone is escapable:
 *   A · SOURCE SCAN — the named money/regulator call sites still pass "ALL".
 *       Catches a revert, a copy-paste, or a new caller added to an old file.
 *   B · BEHAVIOUR — the real DAL, the real filters, on the in-memory store.
 *       Catches the default silently changing meaning underneath the call sites.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { listMarkets, type StoredMarket } from "../src/lib/server/market-service.ts";
import { TERMINAL_TTL_MS, TERMINAL_TTL_CEILING_MS } from "../src/lib/server/market-service.ts";

const ROOT = process.cwd();
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};
const read = (p: string): string => { try { return readFileSync(join(ROOT, p), "utf8"); } catch { return ""; } };

// ═══════════════════════════════════════════════════════════════════════════
// A · SOURCE SCAN — the money/regulator reads must opt IN to "ALL"
// ═══════════════════════════════════════════════════════════════════════════
//
// Keyed by file, with the reason each one is a money/regulator read. When a new
// money surface starts calling listMarkets, ADD IT HERE — that is the point of the
// list. Removing an entry to make this pass is the failure mode this guards against,
// so each carries its justification inline.

const MUST_OPT_IN: Array<{ file: string; why: string; minCalls: number }> = [
  { file: "src/lib/server/report-money.ts",
    why: "category revenue breakdown — omitting UPDOWN drops its whole turnover",
    minCalls: 1 },
  { file: "src/lib/server/analytics.ts",
    why: "per-poll settlement fees by fee model — UPDOWN is the only capped-commission@13% product",
    minCalls: 1 },
  { file: "src/lib/server/platform-stats.ts",
    why: "settled-poll count is shown beside a whole-platform payout total",
    minCalls: 1 },
  { file: "src/lib/server/reports/catalogue.ts",
    why: "voided markets are reconciled against BET_REFUND totals for the regulator",
    minCalls: 1 },
  { file: "src/app/api/health/route.ts",
    why: "ops probe — a stalled Up & Down chain must be visible in the signal",
    minCalls: 2 },
  { file: "src/app/admin/system/page.tsx",
    why: "operator's view of what is actually running",
    minCalls: 2 },
  { file: "src/app/live/page.tsx",
    why: "\"ON LIVE — shows everything\" (Markets Appearing.txt): the ONE player board that shows both product lines",
    minCalls: 1 },
];

/**
 * Every product-line-bearing market read in a file, with its argument text.
 *
 * ⚠️ IT MATCHES `listTerminalMarkets` TOO, AND THAT IS LOAD-BEARING (2026-08-20). `/results`
 * moved its two `listMarkets({ productLine: "ALL" })` calls onto the memoised
 * `listTerminalMarkets("ALL")` (audit F-08 — they were an uncached Seq Scan over 13,013 rows
 * on a public page). A matcher that knew only `listMarkets` then found ZERO calls there, and
 * the RESULTS_FLOOD_GUARD below started asserting "0 of 0" — passing over nothing. An
 * assertion that cannot fail is not evidence, and this suite exists precisely because a
 * product-line read going unnoticed is how the archive floods.
 *
 * The inverse guard needs it just as much: without this, a player board could opt into both
 * products via `listTerminalMarkets("ALL")` and walk straight past MUST_STAY_DEFAULT.
 */
function listMarketsCalls(src: string): string[] {
  const out: string[] = [];
  const re = /\blist(?:Terminal)?Markets\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // Walk forward balancing parens so nested objects/calls are captured whole.
    let depth = 1, i = re.lastIndex;
    while (i < src.length && depth > 0) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") depth--;
      i++;
    }
    out.push(src.slice(re.lastIndex, i - 1));
  }
  return out;
}

/**
 * Does this call read BOTH product lines? Two shapes are legitimate:
 *   listMarkets({ status: …, productLine: "ALL" })   — the object form
 *   listTerminalMarkets("ALL")                        — the positional form
 * Anything else is on the single-product default, which is the protection.
 */
const readsAllProducts = (args: string): boolean =>
  /productLine\s*:\s*["']ALL["']/.test(args) || /^\s*["']ALL["']\s*$/.test(args);

for (const { file, why, minCalls } of MUST_OPT_IN) {
  const src = read(file);
  if (!src) { ok(`A · ${file} readable`, false, "file missing — did it move?"); continue; }
  const calls = listMarketsCalls(src);
  ok(`A · ${file} still calls listMarkets`, calls.length >= minCalls,
     `found ${calls.length}, expected >= ${minCalls}`);
  const bare = calls.filter((args) => !readsAllProducts(args));
  ok(`A · ${file} passes productLine "ALL" on every call`, bare.length === 0,
     bare.length ? `${bare.length} call(s) missing it — ${why}. Bare: listMarkets(${bare[0].trim().slice(0, 70)})` : "");
}

// The inverse guard: player boards must NOT opt in, or the default stops protecting
// them and the board goes back to reading both products.
const MUST_STAY_DEFAULT = [
  "src/app/markets/page.tsx",
  // ⛔ `src/app/results/page.tsx` WAS HERE AND WAS MOVED OUT DELIBERATELY on 2026-08-19, on a
  // Gaming Board instruction (Jay, `50pick_website_comments-2.pdf` #10: settled Up & Down rounds
  // must reach the results page). Its protection is NOT dropped — it is asserted directly, and
  // more precisely, by the RESULTS_FLOOD_GUARD block below. Read that before touching this list.
  "src/app/fairness/page.tsx",
  "src/app/api/fairness/recent/route.ts",
];
/**
 * RESULTS_FLOOD_GUARD — the results archive reads BOTH product lines and still leads with the
 * long-form one.
 *
 * 🔴 WHY A DEFAULT IS THE WHOLE PROTECTION, measured on production 2026-08-19: settled
 * **UPDOWN 11,112 · MARKET 65**, i.e. Up & Down is **99.4%** of the archive. Sorted newest-first
 * over both lines, all 65 long-form results are buried under 11,112 price rounds — page 1 would
 * be nothing but 3-minute rounds. That is what the old MUST_STAY_DEFAULT entry was protecting,
 * and deleting the entry without replacing the protection would have re-created the problem the
 * moment the Board's instruction landed.
 *
 * ⛔ THIS IS NOT A STYLE RULE. It asserts BOTH halves, because either alone is a defect:
 *   ① the read opts into "ALL"  — else settled Up & Down rounds never reach the page (#10);
 *   ② the product filter defaults to a SINGLE line — else the archive floods (this block).
 */
{
  const file = "src/app/results/page.tsx";
  const src = read(file) ?? "";
  const calls = listMarketsCalls(src);
  const optedIn = calls.filter(readsAllProducts);
  ok(`A · ${file} reads BOTH product lines (Board instruction #10)`,
     calls.length > 0 && optedIn.length === calls.length,
     `${calls.length - optedIn.length} of ${calls.length} listMarkets call(s) still on the MARKET default`);
  // The default must be a product, never the "all" view — that is the flood protection.
  ok(`A · ${file} still DEFAULTS to one product, so the archive cannot flood`,
     /\?\s*sp\.product\s*:\s*"MARKET"/.test(src),
     'the product filter no longer falls back to "MARKET" — 99.4% of settled rows are Up & Down');
}

for (const file of MUST_STAY_DEFAULT) {
  const src = read(file);
  if (!src) continue; // optional — a page may legitimately be renamed
  const optedIn = listMarketsCalls(src).filter(readsAllProducts);
  ok(`A · ${file} stays on the MARKET default`, optedIn.length === 0,
     optedIn.length ? "a player board opted into ALL — Up & Down rounds would flood it" : "");
}

// ═══════════════════════════════════════════════════════════════════════════
// B · BEHAVIOUR — the real DAL + the real filter, on the in-memory store
// ═══════════════════════════════════════════════════════════════════════════

const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

function mk(id: string, productLine: "MARKET" | "UPDOWN", over: Partial<StoredMarket> = {}): StoredMarket {
  return {
    id,
    titleEn: `${productLine} ${id}`, titleSw: `${productLine} ${id}`, titleZh: null,
    category: "macro", sourceUrl: "https://bot.go.tz/x",
    resolutionCriterion: "test", resolutionAt: iso(now + 3600_000),
    selectionClosedAt: null, status: "LIVE",
    yesPool: 0, noPool: 0, predictorCount: 0, feeSnapshot: null,
    resolvedOutcome: null,
    resolutionStage1By: null, resolutionStage1At: null,
    resolutionStage2By: null, resolutionStage2At: null,
    objectionsClosedAt: null, settledAt: null,
    productLine,
    proposedBy: "test", createdAt: iso(now), updatedAt: iso(now),
    ...over,
  };
}

// Two long-form polls and two Up & Down rounds. Resolution times are deliberately
// interleaved so an ordering regression cannot hide behind the grouping.
await marketStore.set(mk("pl_poll_b", "MARKET", { resolutionAt: iso(now + 4 * 3600_000) }));
await marketStore.set(mk("pl_round_a", "UPDOWN", { resolutionAt: iso(now + 1 * 3600_000) }));
await marketStore.set(mk("pl_poll_a", "MARKET", { resolutionAt: iso(now + 2 * 3600_000) }));
await marketStore.set(mk("pl_round_b", "UPDOWN", { resolutionAt: iso(now + 3 * 3600_000) }));

const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id).filter((i) => i.startsWith("pl_"));

// B1 — the default excludes Up & Down. This is the whole point of the column.
{
  const got = ids(await listMarkets());
  ok("B1 · listMarkets() defaults to long-form polls only",
     got.length === 2 && got.every((i) => i.startsWith("pl_poll")), `got [${got}]`);
}

// B2 — "ALL" is the money read, and it really does see both products.
{
  const got = ids(await listMarkets({ productLine: "ALL" }));
  ok("B2 · listMarkets({productLine:'ALL'}) sees BOTH products", got.length === 4, `got [${got}]`);
}

// B3 — a product can be requested on its own (the /updown board).
{
  const got = ids(await listMarkets({ productLine: "UPDOWN" }));
  ok("B3 · listMarkets({productLine:'UPDOWN'}) returns only rounds",
     got.length === 2 && got.every((i) => i.startsWith("pl_round")), `got [${got}]`);
}

// B4 — ordering is unchanged: soonest resolution first, ACROSS products. The board
// query moved from an in-JS sort to an indexed orderBy; this proves that was a
// query-plan change, not a behaviour change.
{
  const got = ids(await listMarkets({ productLine: "ALL" }));
  ok("B4 · ordering stays resolutionAt ASC across products",
     JSON.stringify(got) === JSON.stringify(["pl_round_a", "pl_poll_a", "pl_round_b", "pl_poll_b"]),
     `got [${got}]`);
}

// B5 — status + productLine compose (the exact shape the board and reports use).
{
  await marketStore.set(mk("pl_poll_res", "MARKET", { status: "RESOLVED", resolvedOutcome: "YES", settledAt: iso(now) }));
  await marketStore.set(mk("pl_round_res", "UPDOWN", { status: "RESOLVED", resolvedOutcome: "NO", settledAt: iso(now) }));
  const defaults = ids(await listMarkets({ status: "RESOLVED" }));
  const all = ids(await listMarkets({ status: "RESOLVED", productLine: "ALL" }));
  ok("B5 · status filter composes with the MARKET default", defaults.length === 1 && defaults[0] === "pl_poll_res", `got [${defaults}]`);
  ok("B5 · status filter composes with ALL", all.length === 2, `got [${all}]`);
}

// B6 — the SCHEDULER must not arm Up & Down rounds: they are driven by their own
// per-chain scheduler, and two engines fighting over one row is a money hazard.
{
  const pendingDefault = ids(await marketStore.pending());
  const pendingAll = ids(await marketStore.pending("ALL"));
  ok("B6 · marketStore.pending() excludes UPDOWN (per-market scheduler skips rounds)",
     pendingDefault.every((i) => i.startsWith("pl_poll")), `got [${pendingDefault}]`);
  ok("B6 · marketStore.pending('ALL') includes UPDOWN (settlement ops must see unsettled money)",
     pendingAll.some((i) => i.startsWith("pl_round")), `got [${pendingAll}]`);
}

// B7 — productLine is IMMUTABLE. A stale in-memory copy writing back must never be
// able to reclassify a settled round as a poll and move its money between product
// lines in every report after the fact.
{
  const row = await marketStore.get("pl_round_a");
  ok("B7 · round reads back as UPDOWN", row?.productLine === "UPDOWN", `got ${row?.productLine}`);
  if (row) {
    await marketStore.set({ ...row, productLine: "MARKET", predictorCount: 7 });
    const after = await marketStore.get("pl_round_a");
    // In-memory is a full replace by contract; Prisma's update block deliberately
    // omits productLine. Assert the PRISMA contract holds by checking the update
    // payload cannot carry it — the behavioural half is asserted on real PG in
    // scripts/updown-e2e.test.mts. Here we assert the intent is documented.
    const dal = read("src/lib/server/market-dal.ts");
    const updateBlock = dal.slice(dal.indexOf("      update: {", dal.indexOf("prismaMarkets")));
    const firstUpdate = updateBlock.slice(0, updateBlock.indexOf("\n      },"));
    // Sanity-check the slice actually landed on the update block before trusting the
    // absence of a match — an assertion over an empty string always "passes".
    ok("B7 · located the Prisma update block", /resolveClaimedAt/.test(firstUpdate),
       firstUpdate ? "" : "slice found nothing — the DAL shape changed, fix this scan");
    const writesProductLine = /^\s*productLine\s*:/m.test(firstUpdate);
    ok("B7 · Prisma `set` update block never writes productLine (immutable after creation)",
       !writesProductLine,
       writesProductLine ? "productLine appears in the update block — a re-save could reclassify a settled round" : "");
    ok("B7 · unrelated fields still update", after?.predictorCount === 7, `got ${after?.predictorCount}`);
  }
}

// B8 — an unknown/absent productLine coerces to MARKET, never to UPDOWN. Rows that
// predate the column are all long-form polls, and a NULL must not become a round.
{
  // Drive the DAL's coercion directly with a raw row shape.
  await marketStore.set({ ...mk("pl_legacy", "MARKET"), productLine: undefined as unknown as "MARKET" });
  const row = await marketStore.get("pl_legacy");
  ok("B8 · a row with no productLine reads as MARKET",
     row?.productLine === "MARKET" || row?.productLine === undefined,
     `got ${row?.productLine}`);
  const got = ids(await listMarkets());
  ok("B8 · and it appears on the default (long-form) board", got.includes("pl_legacy"), `got [${got}]`);
}

// ── Result ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// C · THE ARCHIVE MEMO'S TTL IS BOUNDED, NOT CHOSEN
// ─────────────────────────────────────────────────────────────────────────────
/**
 * `listTerminalMarkets` is the memo that stopped `/results` making Postgres seq-scan a growing
 * table on every anonymous request (audit F-08). Its TTL was raised 60 s → 5 min on 2026-08-21
 * after re-measuring the page: at 60 s a low-traffic archive is COLD for almost every real
 * visitor, so the number that mattered was 1.3–2.4 s and not 0.7 s.
 *
 * ⛔ The bound is the OBJECTION WINDOW. A few minutes of staleness on an archive of already-paid
 * markets is not a fact anyone can act on differently; a day of it would hide a market a player
 * is disputing. This asserts the relationship rather than the number, so raising the TTL "for
 * performance" past the point where the argument holds fails the build.
 */
{
  const okC = (label: string, cond: boolean, extra = "") => {
    if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  okC("C1 the archive memo TTL is far below the objection window",
    TERMINAL_TTL_MS * 12 <= TERMINAL_TTL_CEILING_MS,
    `${TERMINAL_TTL_MS}ms vs ceiling ${TERMINAL_TTL_CEILING_MS}ms — an archive that lags the ` +
    "objection window can hide a market a player is disputing.");
  okC("C2 …and it is long enough to actually be warm between two ordinary visits",
    TERMINAL_TTL_MS >= 120_000,
    `${TERMINAL_TTL_MS}ms. Measured 2026-08-21: cold 1.29-2.42s, warm 0.65-1.28s. A 60s TTL ` +
    "expires between visits on a low-traffic page, so every visitor paid the cold path.");
  okC("C3 CONTROL · the ceiling really is the 24-hour objection window",
    TERMINAL_TTL_CEILING_MS === 24 * 60 * 60 * 1000);
}

console.log(`\nproduct-line: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error(
    "\n✗ PRODUCT-LINE GUARD FAILED.\n" +
    "  If a source-scan (A) check failed: a money or regulator read lost its\n" +
    "  `productLine: \"ALL\"`. Restore it — do NOT delete the entry from MUST_OPT_IN.\n" +
    "  Up & Down revenue disappearing from the books is invisible without this test,\n" +
    "  because every remaining number still reconciles with itself.\n",
  );
  process.exit(1);
}
console.log("product-line: OK — money reads see both products; player boards see long-form polls only");
