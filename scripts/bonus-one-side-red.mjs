/**
 * B · RED HARNESS — the two exploits, and the two ways of over-correcting them.
 *
 *   node scripts/bonus-one-side-red.mjs      (npm run red:bonus-one-side)
 *
 * ⭐ MUTATIONS 1 AND 2 ARE THE PRE-2026-08-14 SOURCE, VERBATIM. Together they are the state
 * the B commit had to close in ONE step:
 *
 *   1  turnover accrues on EVERY stake, so a 25,000/25,000 hedge on one market credits
 *      50,000 and clears a 10,000 grant's 5x requirement for 3,250 of fee.
 *   2  `cashOutPosition` never reversed anything, so bet -> cancel free -> repeat cleared the
 *      same requirement for NOTHING AT ALL.
 *
 * If mutation 1 ever stops going red, the guard has drifted back to testing that a bet is
 * accepted rather than that it buys no wagering progress. Mutation 2 is the half the work
 * order did not know about.
 *
 * ⚠️ MUTATIONS 4, 5 AND 6 ARE OVER-CORRECTIONS, not the defect. A rule that suppresses
 * turnover too WIDELY silently stops honest players clearing a bonus they earned, which is
 * a support problem nobody would ever report as a bug. They must go red too, or "no exploit"
 * and "no bonus ever clears" are indistinguishable.
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
const originals = new Map([[MARKET, readFileSync(MARKET, "utf8")]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try { execSync("npx tsx scripts/bonus-one-side.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
  catch { return true; }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const OPPOSITE = `    const opposite = mine.find((p) => p.status === "OPEN" && p.side !== opts.side);`;

const MUTATIONS = [
  {
    name: "wagering-credits-both-sides",
    why: "⭐ THE EXPLOIT, verbatim as it stood at 8c06517f — every stake accrues, so a 25,000/25,000 hedge on ONE market clears a 10,000 grant's 5x requirement for 3,250 of fee",
    from: "      const wr = opposite ? { fulfilled: [], creditedToRealTzs: 0 } : await recordWageringLocked(userId, opts.stake, lockTx);",
    to: "      const wr = await recordWageringLocked(userId, opts.stake, lockTx);",
  },
  {
    name: "cashout-keeps-the-turnover",
    why: "⭐ B1b, verbatim — a FREE cancellation returns the whole stake and keeps its wagering credit, so bet→cancel→repeat clears a bonus at zero cost",
    from: "      await reverseWageringLocked(userId, p.stake);",
    to: "      /* reversal removed */ void p;",
  },
  {
    name: "one-account-one-side-guard-restored",
    why: "the 2026-08-04 refusal comes back — the bet half of the rule silently reverts and only the wagering half ships",
    from: OPPOSITE,
    // ⚠️ The predicate is re-parenthesised on purpose. A `to` that CONTAINS the `from`
    // verbatim leaves the anchor on disk, and the harness's own "did the mutation land?"
    // check then reports a HARNESS ERROR — correctly. The mutation must replace the line,
    // not append to it.
    to: `    const opposite = mine.find((p) => (p.status === "OPEN" && p.side !== opts.side));\n`
      + `    if (opposite) return { ok: false as const, error: "one side per round.", code: "INVALID" as const };`,
  },
  {
    name: "wagering-suppressed-by-ANY-prior-position",
    why: "⚠️ THE OVER-CORRECTION — turnover stops the moment a player holds anything on the market, so an honest player topping up ONE side can never clear a bonus they earned",
    from: OPPOSITE,
    to: `    const opposite = mine.find((p) => p.status === "OPEN");`,
  },
  {
    name: "opposite-predicate-ignores-position-status",
    why: "⚠️ a CLOSED opposite leg keeps suppressing turnover forever, so cancelling the hedge (the documented escape hatch) never restores credit — the rule becomes a trap",
    from: OPPOSITE,
    to: `    const opposite = mine.find((p) => p.side !== opts.side);`,
  },
  {
    name: "opposite-predicate-inverted",
    why: "⚠️ the sides swap, so the FIRST side of a market accrues nothing and only the hedge does — the exact inverse of the rule, and green on any check that only counts 'some turnover was suppressed'",
    from: OPPOSITE,
    to: `    const opposite = mine.find((p) => p.status === "OPEN" && p.side === opts.side);`,
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(MARKET, "utf8");
  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) { problems.push(`${m.name} — HARNESS ERROR: anchor not found`); continue; }

  writeFileSync(MARKET, src.replace(anchor, anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to));
  if (readFileSync(MARKET, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`); continue;
  }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
