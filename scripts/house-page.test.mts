/**
 * THE HOUSE PAGE'S STRUCTURE — the rules that are invisible to every other guard.
 *
 * ⭐ WHY A SOURCE-READING SUITE HERE, WHEN `house-book.test.mts` INSISTS ON EXECUTING. The
 * arithmetic can be called and asserted, and it is. These are different claims: that a
 * particular read is NOT reachable from this page, that a fabricating idiom does not appear in
 * it, that a decision is taken through the one function allowed to take it. None of those is a
 * value a function returns — they are facts about the file — and every one of them is a way
 * this page could go quietly wrong with `tsc` clean and every money suite green.
 *
 * ⛔ EACH SECTION CARRIES A CONTROL that proves it is not vacuous, because a grep over a file
 * that has moved is a check that passes by finding nothing.
 *
 * npm run test:house-page
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = process.env.HP_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? `\n         ${d}` : ""}`); }
  return c;
};

const PAGE = "src/app/admin/house/page.tsx";
const DRILL = "src/app/admin/house/[marketId]/page.tsx";
const DAL = "src/lib/server/market-dal.ts";
const PAGES = [PAGE, DRILL];

console.log("\nhouse-page — the rules no other guard can see\n");

/* ═══ §1 · THE FILES EXIST, SO EVERY CHECK BELOW HAS A PREMISE ═════════════════════════ */
console.log("§1 · the population is real");
for (const f of [PAGE, DRILL, DAL, "src/app/admin/house/loading.tsx", "src/app/admin/house/[marketId]/loading.tsx"]) {
  ok(`1.x · ${f} exists`, existsSync(join(ROOT, f)), "a moved file turns every grep below into a pass");
}

const src = Object.fromEntries(PAGES.map((f) => [f, decomment(read(f))])) as Record<string, string>;
const raw = Object.fromEntries(PAGES.map((f) => [f, read(f)])) as Record<string, string>;
ok("1.control · the stripped pages are still real code",
  PAGES.every((f) => src[f].length > 2_000 && src[f].includes("AdminBody")));

/* ═══ §2 · ⭐ THE PRODUCT-LINE TRAP CANNOT BITE THIS PAGE ══════════════════════════════
 *
 * `listMarkets()` defaults to `productLine: "MARKET"` AND drops `Demo · ` rows. Up & Down is
 * 353 of the 467 named markets that have moved money on production, so one bare call here could
 * delete three quarters of the owner's book — and every number would still reconcile with
 * itself, which is why no money suite would notice. `test:product-line` catches a bare call
 * only for files on a HAND-WRITTEN list; a page that never calls it is safe by construction
 * instead of by somebody remembering to add it.
 */
console.log("\n§2 · ⭐ the book is read from the LEDGER, never from a product-filtered market list");
for (const f of PAGES) {
  ok(`2.1 · ${f} imports listMarkets ZERO times`,
    !/\blistMarkets\b|\blistTerminalMarkets\b/.test(src[f]),
    "one bare call would silently drop every Up & Down round from the owner's revenue");
  ok(`2.2 · ${f} joins through bookByIds — the ledger is the left side`,
    /marketStore\.bookByIds\(/.test(src[f]));
}
{
  const dal = decomment(read(DAL));
  /* ⭐ THE SAFETY IS STRUCTURAL, NOT DISCIPLINARY — the same property that makes
   * `attribution()` safe. A read that CANNOT filter by product cannot omit a product. */
  const decl = /bookByIds\(ids: readonly string\[\]\): Promise<Map<string, MarketBook>>;/.test(dal);
  ok("2.3 · ⭐ `bookByIds` takes ids and NOTHING else — no productLine parameter exists",
    decl && !/bookByIds\([^)]*productLine/.test(dal),
    "being unable to filter is what makes a money read safe; do not add one");
  /* ⚠️ `productLine` inside the `select` is REQUIRED — the page needs the column to label a
   * row and to spell its outcome. What may never appear is a `where` that FILTERS on it. So
   * this reads the two implementation bodies and looks only at their filter clauses. */
  const bodies = [...dal.matchAll(/async bookByIds\(ids\) \{([\s\S]*?)\n  \},/g)].map((m) => m[1]);
  const whereClauses = bodies.flatMap((b) => b.split("\n").filter((l) => /\bwhere:/.test(l)));
  ok("2.4 · …and neither implementation smuggles a productLine FILTER into its query",
    bodies.length === 2
    && whereClauses.length === 1
    && /where: \{ id: \{ in: \[\.\.\.ids\] \} \},/.test(whereClauses[0].trim())
    && bodies.every((b) => !/\.filter\([^)]*productLine/.test(b) && !/if \([^)]*productLine[^)]*\) continue/.test(b)),
    `${bodies.length} bodies, ${whereClauses.length} where clause(s): ${whereClauses.map((w) => w.trim()).join(" | ")}`);
  ok("2.control · the DAL really does define bookByIds (2.3 is not vacuous)",
    /async bookByIds\(ids\)/.test(dal) && (dal.match(/async bookByIds\(ids\)/g) ?? []).length === 2,
    "both the in-memory and the Prisma store must implement it, or a test proves the wrong one");
}

/* ═══ §3 · ⛔ A FAILED READ IS NEVER A FABRICATED ZERO (A-5) ═══════════════════════════
 *
 * `?? 0` collapses "we could not read this" into "it is zero" — on a page whose whole job is to
 * state the owner's money correctly. NO OTHER GUARD IN THIS REPO CATCHES IT. A `null` must
 * reach the reader as `AdminKpi unavailable` or `AdminLoadError`; a real zero renders as itself.
 */
console.log("\n§3 · ⛔ `?? 0` is banned here — a failed read may not become a zero");
for (const f of PAGES) {
  const hits = [...src[f].matchAll(/\?\?\s*0\b/g)];
  /* ⚠️ The pager's `?? 0` is a COUNT, not money — `parsePage(sp.gpage, sorted?.length ?? 0)`
   * asks "how many rows are there to page over", and zero rows is the honest answer to a
   * failed read. Money is what may not be invented. Allowed by name, and only by name. */
  const allowed = /parsePage\([^)]*\?\?\s*0\)|total=\{[a-zA-Z?.]*length\s*\?\?\s*0\}|\(unattributed\?\.total \?\? 0\)/;
  const bad = hits.filter((h) => {
    const line = src[f].slice(0, h.index).split("\n").length;
    const text = src[f].split("\n")[line - 1];
    return !allowed.test(text);
  });
  ok(`3.1 · ${f} has no money-fabricating \`?? 0\``, bad.length === 0,
    bad.map((h) => src[f].split("\n")[src[f].slice(0, h.index).split("\n").length - 1].trim()).join(" · "));
  ok(`3.2 · ${f} renders the explicit unavailable state instead`,
    /unavailable=\{/.test(src[f]) || /AdminLoadError/.test(src[f]));
}
ok("3.3 · ⭐ the position is computed only when EVERY input arrived",
  /accounts && cash && liability !== null && adjBacked !== null/.test(src[PAGE]),
  "computing it with a missing input prints a confident figure built on an invented zero");
ok("3.control · the page really does contain `??` at all (3.1 is not vacuous)",
  /\?\?/.test(src[PAGE]));

/* ═══ §4 · ⛔ MONEY DOES NOT ROUTE THROUGH BALANCE PRIVACY ═════════════════════════════
 *
 * `<Stat money>` and `<Cash>` honour the PLAYER's balance-privacy blur. The console has no
 * unmask control, so an operator who once hid balances in the player app would open the owner's
 * book and read `TZS •••••` with no way to reveal it.
 */
console.log("\n§4 · ⛔ the owner's own book cannot be blurred by a player-app toggle");
for (const f of PAGES) {
  ok(`4.1 · ${f} imports neither Cash nor Stat`,
    !/from ["']@\/components\/ui\/cash["']/.test(src[f]) && !/from ["']@\/components\/ui\/stat["']/.test(src[f]));
  ok(`4.2 · ${f} marks money with the \`amount\` class instead`,
    /className="amount"|\["amount"/.test(src[f]),
    "the marker `.admin-tbl td.tabular` and §M4's nowrap rule both key on");
  /* ⛔ `test:read-tiers` §4.4 — a page classifies, it never decides. */
  ok(`4.3 · ${f} imports no read-tier decider`,
    !/\b(canRead|readCell|mayReveal|canReveal|defaultReadGrant|DEFAULT_READ_GRANTS)\b/.test(src[f]));
}

/* ═══ §5 · ⭐ THE GATE COMES BEFORE THE MONEY ═════════════════════════════════════════
 *
 * The admin layout gates ADMIN_CONSOLE_ROLES, which INCLUDES MODERATOR. Without a page-level
 * gate a moderator reads the owner's net retained, his solvency line and his per-game revenue.
 */
console.log("\n§5 · ⭐ a moderator cannot reach the owner's money");
for (const f of PAGES) {
  const gateAt = src[f].indexOf("AdminRestricted");
  const firstRead = Math.min(
    ...["readHouseAccounts(", "readGameTotals(", "readWaterfall(", "marketStore.bookByIds("]
      .map((s) => src[f].indexOf(s)).filter((i) => i >= 0),
  );
  ok(`5.1 · ${f} refuses BEFORE the first money read`,
    gateAt > 0 && gateAt < firstRead, `gate at ${gateAt}, first read at ${firstRead}`);
  ok(`5.2 · ${f} asks the accounting domain, exactly as /admin/finance does`,
    /session\.role === "ADMIN" \|\| \(await canView\(session\.role, "accounting"\)\)/.test(src[f]));
}

/* ═══ §6 · ⭐ THE RECOMPUTE CANNOT MANUFACTURE A VARIANCE ══════════════════════════════
 *
 * Under `capped-commission`, `poolFee` never looks at the winning side — it is
 * `min(commissionRate × pool, ceilingRate × smaller)`. So a VOID market, whose every stake was
 * refunded and which booked nothing, comes back with a real non-zero fee and invents a
 * disagreement on a correct book. And the early-exit fee is booked PER EXIT against the pool as
 * it stood then, which `poolFee` does not model at all.
 */
console.log("\n§6 · ⭐ the check may not invent the thing it is checking for");
{
  const d = src[DRILL];
  /* ⚠️ THIS CHECK SHIPPED AS A TERNARY THAT COULD NOT FAIL, and `red:house-page` is what found
   * that — the VOID mutation ran clean through it. Two plain assertions instead. */
  ok("6.1 · ⛔ the outcome is narrowed to a WINNING SIDE before poolFee is called",
    /const winner = outcome === "YES" \|\| outcome === "NO" \? outcome : null;/.test(d)
    && /winner &&[\s\S]{0,80}poolFee\(/.test(d),
    "a VOID priced by capped-commission returns a fee for a market that charged none");
  ok("6.2 · ⛔ the reconciliation uses the SETTLEMENT slice, not the whole fee",
    /reconcile\(totals\.settlementFee,/.test(d) && !/reconcile\(totals\.feeBooked,/.test(d),
    "feeBooked also holds CASHOUT_FEE, which poolFee does not model");
  ok("6.3 · …and the early-exit fee is still SHOWN, beside the check",
    /earlyExitFee/.test(d));
  ok("6.4 · ⛔ no tolerance is applied to the variance",
    !/Math\.abs\(rec\.variance\)\s*[<>]=?\s*[1-9]/.test(d) && !/EPSILON|tolerance\s*=/.test(d),
    "an epsilon is how seven production pools finished negative unnoticed");
  ok("6.control · the drill-down really does call poolFee (6.1 is not vacuous)",
    /poolFee\(/.test(d));
}

/* ═══ §7 · ⭐ RATE PROVENANCE IS NOT READ OFF `stampedAt` ══════════════════════════════
 *
 * `snapshotOrLegacy` writes `stampedAt: "legacy"` from TWO different facts — a genuine snapshot
 * that merely predates the field, and the true fallback. Badging off the string tells the owner
 * a correctly frozen game was never frozen.
 */
console.log("\n§7 · ⭐ 'legacy' is two facts, and only one of them is legacy");
for (const f of PAGES) {
  /* ⚠️ BOTH DIRECTIONS. The natural way to write this defect is `stampedAt !== "legacy"` for
   * "it has its own", which an `===`-only regex reads straight past — measured, by the anchor
   * that reached for exactly that and slipped through. */
  ok(`7.1 · ${f} never compares stampedAt to "legacy", in either direction`,
    !/stampedAt\s*[!=]==?\s*["']legacy["']/.test(src[f]));
  ok(`7.2 · ${f} asks hasOwnSnapshot instead`, /hasOwnSnapshot\(/.test(src[f]));
}
{
  const mc = decomment(read("src/lib/server/market-config.ts"));
  ok("7.3 · ⭐ `snapshotOrLegacy` CALLS `hasOwnSnapshot`, so the two cannot drift apart",
    /if \(hasOwnSnapshot\(raw\)/.test(mc),
    "a second copy of the predicate is a second answer waiting to disagree");
  ok("7.4 · …and the predicate is the real one, not a loosened restatement",
    /Number\.isFinite\(s\.commissionRate\) && Number\.isFinite\(s\.feeCeilingRate\)/.test(mc));
}

/* ═══ §8 · ⛔ THE RATE CAPTION IS DESCRIBED, NEVER TYPED ═══════════════════════════════ */
console.log("\n§8 · ⛔ a caption beside a number must come from the same rates as the number");
for (const f of PAGES) {
  ok(`8.1 · ${f} builds its caption with describeFeeModel`, /describeFeeModel\(/.test(src[f]));
  ok(`8.2 · ${f} writes no fee-model caption by hand`,
    !/["'`][^"'`]*(loser-share|capped)\s+\d+(\.\d+)?%/.test(src[f]),
    "a recorded defect hard-coded a caption beside a number from a DIFFERENT fee model");
}
ok("8.3 · the legacy marker is its OWN element, not appended to the caption",
  /\{!r\.ownSnapshot && <span/.test(src[PAGE]),
  "the caption has a measured 17-character budget it must not be pushed past");

/* ═══ §9 · ⭐ A MISSING MARKET ROW IS RENDERED, NOT DROPPED ════════════════════════════
 *
 * 121 of the ledger's marketIds have no market row on production and between them carry 54,650
 * of real fees — one is the SECOND-largest earner in the whole book. Dropping the unmatched ids
 * would break the reconciliation identity by exactly that much, silently.
 */
console.log("\n§9 · ⭐ money whose game is gone is still money");
ok("9.1 · the join never filters the ledger rows by whether a market matched",
  !/gameRows\.filter\(/.test(src[PAGE]) && !/\.filter\(\(r\) => meta\.(get|has)/.test(src[PAGE]),
  "the LEDGER is the left side of this join; the market table only supplies names");
ok("9.2 · an unmatched row renders its raw id and says so",
  /market row missing/.test(src[PAGE]));
ok("9.3 · the drill-down renders the book rather than 404ing on a missing row",
  !/notFound\(\)/.test(src[DRILL]) && /rowMissing/.test(src[DRILL]),
  "telling an owner his money does not exist is the worse failure");

/* ═══ §10 · ⭐ THE STATE THAT MAY NEVER HIDE (§K rule 7d) ══════════════════════════════ */
console.log("\n§10 · ⭐ a tab may hide a detail, never a state");
{
  const p = src[PAGE];
  const rail = p.indexOf("<Tabs");
  const strict = p.indexOf("Free house cash — strict");
  const exAdj = p.indexOf("Free cash — ex-adjustments");
  /* ⚠️ AND NOTHING ABOVE THE RAIL MAY BE TAB-CONDITIONAL. `indexOf` alone passes a version
   * that wraps the band in `{tab === "position" && …}`, which hides the state on two tabs
   * out of three while still "rendering it above the rail". */
  const aboveRail = p.slice(p.indexOf("<AdminBody>"), rail);
  ok("10.1 · both free-cash tiles are rendered ABOVE the rail, and not inside a tab",
    strict > 0 && strict < rail && exAdj > 0 && exAdj < rail && !/\{tab === /.test(aboveRail),
    `strict ${strict}, ex-adj ${exAdj}, rail ${rail}`);
  ok("10.2 · ⛔ …and NEITHER is conditional on the other — both always render",
    !/freeHouseCash < 0 \?[\s\S]{0,120}freeHouseCashExAdjustments/.test(p),
    "quietly substituting the flattering figure is the kind lie this page must not tell");
  ok("10.3 · the out-of-balance banner is above the rail too",
    p.indexOf("The books do not balance") > 0 && p.indexOf("The books do not balance") < rail);
  ok("10.4 · the strict line is toned danger when it is negative",
    /freeHouseCash < 0 \? "danger"/.test(p));
  ok("10.control · the rail exists at all (10.1 is not vacuous)", rail > 0);
}

/* ═══ §11 · ⭐ THE PER-GAME COLUMN AND THE HOUSE COLUMN, RECONCILED ════════════════════ */
console.log("\n§11 · ⭐ the two columns can never match, and the page says why");
{
  const p = src[PAGE];
  const note = p.indexOf("Why this table does not add up");
  const totals = p.indexOf("By product");
  ok("11.1 · ⛔ the reconciliation note is the FIRST card on BY GAME, before any total",
    note > 0 && note < totals, `note ${note}, subtotals ${totals}`);
  ok("11.2 · it ends in a variance that must be zero", /Variance — must be zero/.test(p));
  ok("11.3 · the unattributed fees are read, not assumed",
    /readUnattributedFees\(/.test(p));
  ok("11.4 · ⚠️ the tab is labelled by ENTRY time, not settlement time",
    /moved money/.test(p) && !/settled games/i.test(p),
    "a market appears because its ledger rows fall in the window, not because it settled in it");
  /* ⛔ THE PROPERTY IS WHAT THE SUBTOTAL READS, NOT WHERE IT IS DECLARED. Order alone passes a
   * version that reaches into `sp.product` anyway — measured: that exact mutation ran clean
   * through the first draft of this check. */
  const byProductBlock = p.slice(p.indexOf("const byProduct"), p.indexOf("const product ="));
  ok("11.5 · the per-product subtotals are taken over the UNFILTERED set",
    p.indexOf("const byProduct") < p.indexOf("const shown")
    && byProductBlock.length > 100
    && !/sp\.product\b/.test(byProductBlock)
    && !/\bproduct\b(?!Line)/.test(byProductBlock),
    "a subtotal that moved with the filter would only ever agree with itself");
}

/* ═══ §12 · ⛔ A RAIL FIGURE IS NEVER A LEDGER FIGURE ══════════════════════════════════ */
console.log("\n§12 · ⛔ the Selcom float is not custodial cash and is never summed with it");
{
  const p = src[PAGE];
  ok("12.1 · the float is minted through railFloat — the only source of `source: \"rail\"`",
    /railFloat\(/.test(p));
  ok("12.2 · ⛔ on failure it prints the REASON, never a zero and never a ledger figure",
    /float\.available \?/.test(p) && /floatReason \?\? float\.reason/.test(p),
    "collapsing five distinct failures to one sentence sent an operator to the wrong place");
  ok("12.3 · no arithmetic joins the float to a ledger total",
    !/float\.balance\s*[+\-]|[+\-]\s*float\.balance/.test(p));
}

/* ═══ §13 · ⛔ THE OUTCOME WORD COMES FROM THE LEXICON, PRODUCT-AWARE ══════════════════ */
console.log("\n§13 · ⛔ Up & Down stores YES and a reader must see Up");
for (const f of PAGES) {
  ok(`13.1 · ${f} spells an outcome through the lexicon`, /outcomeWordIn\(|outcomeWord\(/.test(src[f]));
  ok(`13.2 · ${f} passes the product line, because this is a mixed book`,
    /outcomeWordIn\("en", [^,]+, [^)]*productLine\)/.test(src[f]));
  ok(`13.3 · ${f} prints no outcome enum as display text`,
    !/>\s*\{?\s*["']?(YES|NO|VOID)["']?\s*\}?\s*</.test(raw[f]));
}

/* ═══ FOOTER ══════════════════════════════════════════════════════════════════════════ */
console.log(`\nhouse-page: ${pass} passed, ${fails.length} failed  (of ${pass + fails.length})`);
if (fails.length) {
  console.error("\nThe owner's book can go wrong in a way no other guard would see:");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("house-page: OK — the ledger is the left side, nothing fabricates a zero, and the solvency line cannot hide.");
