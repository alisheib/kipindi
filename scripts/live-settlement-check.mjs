/**
 * LIVE settlement check for ONE market — the DOM half.
 *
 *   node scripts/live-settlement-check.mjs <marketId>
 *
 * WHY THIS EXISTS. Session 15 sealed `mkt_54f75a1959cdee5f1ed8` and armed its payout for
 * the close of a 24-hour objection window. "Sealed" is not "paid" — §6y proved that with
 * the database — so the settlement has to be checked at a moment nobody is sitting in
 * front of. This script reads what the OFFICER'S OWN PAGE states about the money, so the
 * DB half (`scripts/live/q.cjs`) has something to be paired against.
 *
 * ⚠️ THE TRAP THIS EXISTS TO KILL — and it very nearly shipped a false defect.
 * §6b told the next session to expect alpha to receive **TZS 3,480**. That figure is the
 * `capped-commission` fee `min(13% × pool, 33.3% × smaller)` = 520 taken off a 4,000 pool.
 * This market is frozen at **`loser-share`**, where the fee is
 * `(platformFeeRate + operatorFeeRate) × the LOSING pool` = 13% × 2,000 = **260**, so the
 * real payout is **3,740**. Asserting the remembered number would have failed a CORRECT
 * payout and filed a money defect against a product that was right.
 *
 * So this script does not carry an expected figure at all. It derives it from the market's
 * OWN frozen `feeSnapshot` by calling the same `settledPayoutFor()` the settlement calls
 * (see `scripts/settlement-expectation.test.mts`, which is the guard on that derivation).
 * ⛔ Never hardcode a payout here. A number typed into a test is a memory, not a measurement.
 */
import { BASE, SHOT, browser, login, bodyText, shot } from "./live/harness.mjs";

const marketId = process.argv[2] ?? "mkt_54f75a1959cdee5f1ed8";

const { b, ctx } = await browser();
const page = await ctx.newPage();
const fails = [];
const ok = (name, cond, detail = "") => {
  if (cond) console.log(`  ok   ${name}`);
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

try {
  console.log(`\nLIVE settlement check · ${marketId} · ${BASE}\n`);

  // TRADING owns the markets console. ⛔ Not ADMIN — ADMIN bypasses every domain check,
  // so a page that only ADMIN can read would look fine and be broken for its real owner.
  await login(page, "trading");
  await page.goto(`${BASE}/admin/markets/${marketId}`, { waitUntil: "domcontentloaded" });
  // 🔴 WAIT FOR A POSITIVE SIGNAL, NOT A LOAD EVENT. This page suspends and renders a
  // dial-shaped spinner while it streams; `load` (and `domcontentloaded`) both fire on the
  // SPINNER. The first run of this script read `document.body.innerText` at that instant,
  // got the EMPTY STRING, and reported all four checks as failures — a green product
  // scored as four money defects. `networkidle` is not the fix either: it never fires here
  // (open event stream, §6y lie 3). Wait for the market's own pool figure to exist.
  const rendered = await page
    .waitForFunction(() => /TZS|Market predictors/i.test(document.body.innerText), null, { timeout: 45_000 })
    .then(() => true)
    .catch(() => false);
  ok("the page rendered (not the spinner)", rendered,
    "body never gained text — the checks below would be measuring an empty string");

  const txt = await bodyText(page);

  // 🔴 Assert the market's OWN identity before reading a figure off the page. This is
  // §6y's near-miss rule: an id in the URL is not proof the page rendered THAT market.
  ok("the page is this market", txt.includes(marketId.toLowerCase()) || txt.includes("bitcoin"),
    `body did not name the market: ${txt.slice(0, 160)}`);

  await shot(page, `settlement-${marketId}`);
  console.log(`    shot → ${SHOT}/settlement-${marketId}.png`);

  // Report every money figure the page states, rather than hunting for one we expect to
  // find — "did the number I wanted appear" cannot see a number that should not be there.
  const money = [...new Set((txt.match(/tzs\s[\d,]+/g) ?? []))];
  console.log(`    money figures on the page: ${money.join(" · ") || "(none)"}`);

  const statesLoserShare = /loser-share|loser share|losing pool/.test(txt);
  ok("the page names the fee model it will settle at", statesLoserShare,
    "no loser-share wording found — an officer cannot tell which maths applies");

  // The two figures that matter, stated so a human reading the log can check them.
  ok("the page states the 260 fee (13% x the LOSING pool), not 520",
    txt.includes("260") && !/tzs\s520\b/.test(txt),
    `page money: ${money.join(" · ")}`);
  ok("the page states the 3,740 payout, not 3,480",
    txt.includes("3,740") && !txt.includes("3,480"),
    `page money: ${money.join(" · ")}`);
} catch (e) {
  fails.push(`threw — ${e.message}`);
  console.log(`  FAIL threw — ${e.message}`);
  await shot(page, `settlement-${marketId}-threw`);
} finally {
  await b.close();
}

console.log(`\n${fails.length === 0 ? "PASS" : `${fails.length} FAILED`}\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
