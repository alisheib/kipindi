/**
 * E-49 · A RESOLVED MARKET MUST NOT QUOTE THE LOSER THE WINNER'S PAYOUT — the guard.
 *
 *   npx tsx scripts/payout-view.test.mts     (npm run test:payout-view)
 *
 * WHAT WENT WRONG. The predictors grid priced every row as
 *
 *     const payoutVal = p.status === "OPEN" ? p.potentialPayout : (p.finalPayout ?? null);
 *
 * and `potentialPayout` is `payoutIfWin`. Between sealing and settlement EVERY position is
 * still `OPEN`, so on `mkt_54f75a1959cdee5f1ed8` — RESOLVED → YES — echo's LOSING `NO`
 * position rendered `PAYOUT TZS 3,740 · OPEN`: the exact figure the actual winner's row
 * showed, under a column headed "Payout", for money it will never receive.
 *
 * ⚠️ WHY IT IS NOT COSMETIC. The markets runbook tells an officer to "sort your attention by
 * TZS … held" — i.e. to scan this very column — and that window (resolved, not yet settled)
 * is exactly when it is scanned. E-38 was filed for precisely this failure mode: a money
 * figure that reads plausibly and means something else.
 *
 * ⛔ THE SORT ACCESSOR HAD THE SAME SHAPE, WRITTEN SEPARATELY. That is why the fix is one
 * exported function consumed by both, and why §4 asserts the CALL SITE rather than merely
 * the symbol's existence — a correct helper nothing calls fixes nothing.
 *
 * §1–§3 drive the REAL `payoutViewFor` (imported, never reimplemented here: a guard that
 * restates the logic it is checking passes whether or not the product does it).
 */
import { readFileSync } from "node:fs";
import { payoutViewFor, settledPayoutFor } from "../src/lib/payout";

let pass = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; return; }
  fails.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const PAGE = readFileSync(new URL("../src/app/admin/markets/[id]/page.tsx", import.meta.url), "utf8");

// The two real rows on mkt_54f75a1959cdee5f1ed8: 2,000 YES (alpha) v 2,000 NO (echo).
const ALPHA = { status: "OPEN", side: "YES" as const, potentialPayout: 3_740, finalPayout: null };
const ECHO  = { status: "OPEN", side: "NO"  as const, potentialPayout: 3_740, finalPayout: null };

// ── §1 · while the market is still trading, both sides are honest projections ───
{
  const a = payoutViewFor(ALPHA, undefined);
  const e = payoutViewFor(ECHO, undefined);
  ok("§1 an open YES projects its payoutIfWin", a.kind === "projected" && a.amount === 3_740, `got ${a.kind}/${a.amount}`);
  ok("§1 an open NO projects its payoutIfWin", e.kind === "projected" && e.amount === 3_740, `got ${e.kind}/${e.amount}`);
  ok("§1 …and with no outcome the two agree — that is what makes it fair", a.amount === e.amount);
}

// ── §2 · ⭐ THE DEFECT · once resolved, the losing side is worth nothing ────────
{
  const winner = payoutViewFor(ALPHA, "YES");
  const loser  = payoutViewFor(ECHO, "YES");

  ok("§2 the LOSING side is priced at 0, not its counterfactual", loser.amount === 0, `got ${loser.amount}`);
  ok("§2 …and is labelled as receiving nothing", loser.kind === "none", `got ${loser.kind}`);
  ok("§2 the WINNING side still shows its figure", winner.amount === 3_740, `got ${winner.amount}`);
  ok("§2 …but as a PROJECTION, because settlement has not run", winner.kind === "projected", `got ${winner.kind}`);

  // The property the defect violated, stated directly: the two rows must differ.
  ok("§2 ⭐ winner and loser no longer read the SAME number", winner.amount !== loser.amount,
     `both ${winner.amount}`);

  // Symmetry — the bug is not specific to YES winning.
  const noWins = payoutViewFor(ALPHA, "NO");
  ok("§2 symmetric: a losing YES is 0 when NO wins", noWins.kind === "none" && noWins.amount === 0);
}

// ── §3 · settled positions carry the real figure, and absence is not a guess ────
{
  const won  = payoutViewFor({ status: "WIN",  side: "YES", potentialPayout: 3_740, finalPayout: 3_740 }, "YES");
  const lost = payoutViewFor({ status: "LOSS", side: "NO",  potentialPayout: 3_740, finalPayout: 0 }, "YES");
  const gap  = payoutViewFor({ status: "WIN",  side: "YES", potentialPayout: 3_740, finalPayout: null }, "YES");

  ok("§3 a settled win is final, not projected", won.kind === "final" && won.amount === 3_740, `got ${won.kind}`);
  ok("§3 a settled loss is final 0", lost.kind === "final" && lost.amount === 0, `got ${lost.kind}/${lost.amount}`);
  ok("§3 a settled row with no figure shows nothing rather than inventing one",
     gap.kind === "unknown" && gap.amount === null, `got ${gap.kind}/${gap.amount}`);

  // A VOID/refunded market has no resolvedSide, so nothing is ever priced at 0 by outcome.
  const voided = payoutViewFor({ status: "VOID", side: "NO", potentialPayout: 3_740, finalPayout: 2_000 }, undefined);
  ok("§3 a voided position reports its refund, untouched by this rule", voided.kind === "final" && voided.amount === 2_000);
}

// ── §4 · ⛔ THE CALL SITE — both consumers derive from the one definition ───────
{
  ok("§4 the page imports the shared helper", /import \{[^}]*payoutViewFor[^}]*\} from "@\/lib\/payout"/.test(PAGE));

  // The sort accessor must price rows the way the cell renders them.
  ok("§4 the SORT accessor goes through it",
     /payout:\s*\(p\)\s*=>\s*payoutViewFor\(p, resolvedSide\)/.test(PAGE));

  // The cell must too.
  ok("§4 the CELL goes through it",
     /const payout = payoutViewFor\(p, resolvedSide\)/.test(PAGE));

  // ⭐ The counterfactual expression itself must be GONE from both. This is the assertion
  // that fails on a revert, and it names the exact shape rather than a word near it.
  ok("§4 ⭐ the raw status==='OPEN' ? potentialPayout expression is gone",
     !/status === "OPEN"\s*\r?\n?\s*\?\s*p\.potentialPayout/.test(PAGE));
  ok("§4 ⭐ the old sort expression finalPayout ?? potentialPayout is gone",
     !/p\.finalPayout \?\? p\.potentialPayout/.test(PAGE));

  // resolvedSide must be computed BEFORE the sort, or the accessor reads a TDZ binding.
  const iResolved = PAGE.indexOf("const resolvedSide =");
  const iSort = PAGE.indexOf("const sorted = applySort");
  ok("§4 resolvedSide is declared before the sort uses it", iResolved > 0 && iResolved < iSort,
     `resolvedSide@${iResolved} sort@${iSort}`);
  ok("§4 …and is declared exactly once", PAGE.split("const resolvedSide =").length - 1 === 1,
     `found ${PAGE.split("const resolvedSide =").length - 1}`);

  // The winner's pre-settlement figure must be marked, or it reads as money already paid.
  ok("§4 the projected figure is labelled on a resolved market", /projected/.test(PAGE));
}

// ── §5 · the figure is the one settlement will actually pay ────────────────────
{
  // Ties the guard to real money: 3,740 is not a literal, it is what loser-share computes.
  const rates = { feeModel: "loser-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10 };
  const res = settledPayoutFor({ yesPool: 2_000, noPool: 2_000, side: "YES", stake: 2_000 }, rates);
  ok("§5 loser-share on 2,000 v 2,000 pays the winner TZS 3,740", res.payout === 3_740, `got ${res.payout}`);

  const view = payoutViewFor({ ...ALPHA, potentialPayout: res.payout }, "YES");
  ok("§5 …and that is exactly what the winning row projects", view.amount === res.payout);
  ok("§5 …while the loser's row projects nothing", payoutViewFor({ ...ECHO, potentialPayout: res.payout }, "YES").amount === 0);
}

const label = "E-49 · payout view";
if (fails.length) {
  console.error(`\n${label} — ${pass} passed, ${fails.length} FAILED\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${label} — ${pass} passed, 0 failed`);
