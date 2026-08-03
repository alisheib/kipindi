/**
 * E-49 · RED HARNESS — reintroduce the real defect and prove the guard catches it.
 *
 *   node scripts/payout-view-red.mjs
 *
 * A guard that has never failed is a guess. Each mutation below is the ACTUAL code that
 * shipped the defect, applied to the real tree; `npm run test:payout-view` must fail on
 * every one, and the tree is restored afterwards either way.
 *
 * ⚠️ CRLF. Three sessions running have been fooled by a mutation that silently did not
 * apply — the anchor was written with LF against a CRLF tree, `replace` matched nothing,
 * the suite passed, and the harness reported "defect not caught" as if the guard were
 * weak. So every mutation here is VERIFIED APPLIED (anchor gone from the written file)
 * before its result is believed, and a mutation that did not apply is a HARNESS ERROR,
 * never a green.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const PAGE = new URL("../src/app/admin/markets/[id]/page.tsx", import.meta.url);
const LIB = new URL("../src/lib/payout.ts", import.meta.url);

const originals = new Map([[PAGE, readFileSync(PAGE, "utf8")], [LIB, readFileSync(LIB, "utf8")]]);
const restore = () => { for (const [f, src] of originals) writeFileSync(f, src); };

const MUTATIONS = [
  {
    name: "cell-shows-counterfactual",
    why: "the cell prices every OPEN row at payoutIfWin, so the loser reads the winner's figure",
    file: PAGE,
    from: "const payout = payoutViewFor(p, outcome);",
    to: 'const payout = p.status === "OPEN" ? { kind: "projected", amount: p.potentialPayout } : { kind: "final", amount: p.finalPayout ?? 0 };',
  },
  {
    name: "sort-uses-old-expression",
    why: "the sort accessor drifts back to its own copy of the expression",
    file: PAGE,
    from: "payout:  (p) => payoutViewFor(p, outcome).amount ?? 0,",
    to: "payout:  (p) => p.finalPayout ?? p.potentialPayout,",
  },
  {
    name: "helper-ignores-the-outcome",
    why: "payoutViewFor stops distinguishing the losing side once the market resolves",
    file: LIB,
    from: `  if (outcome === undefined) return { kind: "projected", amount: position.potentialPayout };
  // A void pays every side the same thing: the stake, whole. Neither a projection
  // (nothing is being predicted any more) nor nothing (the money is coming back).
  if (outcome === "VOID") return { kind: "refund", amount: position.stake };
  return position.side === outcome
    ? { kind: "projected", amount: position.potentialPayout }
    : { kind: "none", amount: 0 };`,
    to: `  return { kind: "projected", amount: position.potentialPayout };`,
  },
  {
    // ⭐ E-56, THE CODE THAT ACTUALLY SHIPPED. This is not a hypothetical mutation: it is
    // verbatim the line the E-49 fix went live with, and it put a payout figure on twelve
    // real positions across two markets that had just been voided.
    name: "call-site-drops-VOID",
    why: "the page treats only YES/NO as an outcome, so a VOIDED market reads as still trading",
    file: PAGE,
    from: `  const outcome = m.resolvedOutcome === "YES" || m.resolvedOutcome === "NO" || m.resolvedOutcome === "VOID"
    ? m.resolvedOutcome
    : undefined;`,
    to: `  const outcome = m.resolvedOutcome === "YES" || m.resolvedOutcome === "NO" ? m.resolvedOutcome : undefined;`,
  },
  {
    name: "helper-treats-a-void-as-a-projection",
    why: "payoutViewFor stops refunding the stake on a void and quotes the win figure again",
    file: LIB,
    from: `  if (outcome === "VOID") return { kind: "refund", amount: position.stake };`,
    to: `  if (outcome === "VOID") return { kind: "projected", amount: position.potentialPayout };`,
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");

  // Anchors are authored with LF; the tree may be CRLF. Match both, always.
  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;

  if (anchor === null) {
    problems.push(`${m.name} — HARNESS ERROR: anchor not found, mutation never applied`);
    continue;
  }

  const replacement = anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to;
  const mutated = src.replace(anchor, replacement);
  writeFileSync(m.file, mutated);

  // ⭐ Believe nothing until the anchor is actually gone from what is on disk.
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`);
    continue;
  }

  let failed = false;
  try {
    execSync("npx tsx scripts/payout-view.test.mts", {
      cwd: new URL("..", import.meta.url), stdio: "pipe",
    });
  } catch { failed = true; }

  if (failed) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) {
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
