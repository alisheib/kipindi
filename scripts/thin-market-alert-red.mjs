/**
 * F1 · RED HARNESS — the alert that stopped firing, and the alert that fires on everything.
 *
 *   node scripts/thin-market-alert-red.mjs      (npm run red:thin-alert)
 *
 * ⭐ MUTATION 1 IS THE SHIPPED SOURCE, VERBATIM, AS IT STOOD AT 75042aae — the trigger
 * `closeFee.capped || closeFee.smaller === 0`. `capped` is a capped-commission concept and
 * `poolFee`'s loser-share arm returns `false` for it ALWAYS, so on the lopsided loser-share
 * market in §1 the alert simply does not fire. That is the three-week silence, reproduced.
 *
 * ⭐ MUTATION 2 IS THE SHIPPED PAYLOAD. `worstWinnerRatio` derived as `netPool/larger` from
 * a `closeFee` computed with NO winning side — so under loser-share the fee is 0 and the
 * ratio OVERSTATES what a big-side winner receives. On §2's fixture it reads exactly 1.0500
 * against a real 1.0435: the wrong side of the thin floor. A number that reads plausible and
 * is wrong is worse than a missing alert, and only §2.6 can tell them apart.
 *
 * ⚠️ MUTATIONS 4 AND 5 ARE THE OPPOSITE FAILURE. An alert that fires on a healthy market is
 * not a stricter alert, it is a broken one: an officer who is paged about every close stops
 * reading the page. §3.3 is the control that catches them, and it is the reason a balanced
 * market is asserted NOT to fire.
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies,
 * and the harness reports "defect not caught" as guard weakness. Every mutation matches
 * both line endings AND re-reads the file to confirm the anchor is gone from disk.
 *
 * ⚠️ POSITIVE CONTROL FIRST. A refusal check needs one in the same run, or fixing the
 * defect turns the check red and nobody can tell the two apart.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const MARKET = new URL("../src/lib/server/market-service.ts", import.meta.url);
const PAY = new URL("../src/lib/payout.ts", import.meta.url);
const originals = new Map([[MARKET, readFileSync(MARKET, "utf8")], [PAY, readFileSync(PAY, "utf8")]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try { execSync("npx tsx scripts/thin-market-alert.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
  catch { return true; }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const TRIGGER = "  if (oneSided || thinUpside || lopsidedBook) {";

const MUTATIONS = [
  {
    name: "trigger-back-to-capped",
    why: "⭐ THE SHIPPED TRIGGER, verbatim — `capped` is false under loser-share ALWAYS, so a lopsided market says nothing at all. The three-week silence, reproduced",
    file: MARKET,
    from: TRIGGER,
    to: "  if (closeFee.capped || closeFee.smaller === 0) {",
  },
  {
    name: "ratio-derived-without-a-fee",
    why: "⭐ THE SHIPPED PAYLOAD — worstWinnerRatio as netPool/larger off a no-outcome closeFee. On §2's fixture it reads 1.0500 against a real 1.0435: the wrong side of the thin floor, and it reads entirely plausible",
    file: MARKET,
    from: "  const worstWinnerRatio = ratios.length ? Math.min(...ratios) : 0;",
    to: "  const worstWinnerRatio = closeFee.larger > 0 ? closeFee.netPool / closeFee.larger : 0;",
  },
  {
    name: "fee-reported-as-one-number",
    why: "the payload goes back to a single `feeCharged` off the no-outcome closeFee — which is 0 under loser-share, on every poll",
    file: MARKET,
    from: "        feeIfYesWins: Math.round(feeIfYes.fee),\n        feeIfNoWins: Math.round(feeIfNo.fee),",
    to: "        feeCharged: Math.round(closeFee.fee),",
  },
  {
    name: "fires-on-every-market",
    why: "⚠️ THE OPPOSITE FAILURE — the trigger is always true. An officer paged about every close stops reading the page, and a suite that only checked 'the lopsided one fires' is green on this",
    file: MARKET,
    from: TRIGGER,
    to: "  if (true) {",
  },
  {
    name: "lopsided-threshold-at-half-the-pool",
    why: "⚠️ the threshold moves to 50%, so every market that is not exactly balanced is 'lopsided' — the same alert-fatigue failure, arrived at by a plausible-looking tuning",
    file: PAY,
    from: "export const THIN_SMALLER_SIDE_SHARE = 0.15;",
    to: "export const THIN_SMALLER_SIDE_SHARE = 0.50;",
  },
  {
    name: "ratio-over-sides-not-positions",
    why: "⚠️ the worst ratio is taken over the two SIDES rather than over real POSITIONS, so a side nobody actually holds drags the alert — a market with no winner to be thin reports a thin winner",
    file: MARKET,
    from: "  const ratios = open.map((p) => (p.stake > 0 ? (payoutByPosition.get(p.id) ?? 0) / p.stake : Infinity));",
    to: "  const ratios = [closeFee.netPool / Math.max(1, closeFee.larger), closeFee.netPool / Math.max(1, closeFee.smaller)];",
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");
  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) { problems.push(`${m.name} — HARNESS ERROR: anchor not found`); continue; }

  writeFileSync(m.file, src.replace(anchor, anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to));
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`); continue;
  }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
