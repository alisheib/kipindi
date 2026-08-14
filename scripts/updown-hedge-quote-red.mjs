/**
 * RED HARNESS for `npm run test:updown-hedge-quote` — UD-20.
 *
 *   node scripts/updown-hedge-quote-red.mjs      (npm run red:updown-hedge-quote)
 *
 * ⭐ MUTATION 1 IS THE ORIGINAL DEFECT, VERBATIM: `myUpStake + myDownStake` priced as if all
 * of it sat on the UP side. On this suite's own fixture that prints **15,536** to a player
 * whose UP leg is actually worth 11,487 — a confident overstatement of 4,049 shillings on a
 * money surface (A-5).
 *
 * ⚠️ MUTATIONS 2 AND 3 ARE THE TWO WAYS OF UNDOING THE DECISION, in opposite directions:
 * suppressing the pair again (the state Ali was asked about), and letting the ONE-number field
 * answer for a hedge again (the defect that suppression fixed). A suite that pinned only one
 * direction would be green on the other.
 *
 * ⛔ Positive control first: the unmutated suite must be green, or every red below is noise.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const BOARD = new URL("../src/lib/server/updown-board.ts", import.meta.url);
const PANEL = new URL("../src/components/updown/round-action-panel.tsx", import.meta.url);
const originals = new Map([
  [BOARD, readFileSync(BOARD, "utf8")],
  [PANEL, readFileSync(PANEL, "utf8")],
]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try { execSync("npx tsx scripts/updown-hedge-quote.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
  catch { return true; }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red. Fix that first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const MUTATIONS = [
  {
    name: "pair-priced-from-the-sum",
    why: "🔴 THE ORIGINAL DEFECT — the whole two-sided position priced as if it all sat on UP. On this fixture that quotes 15,536 to a player whose UP leg is worth 11,487",
    file: BOARD,
    from: `        ? (myUpStake > 0 ? await projectedPayout(m, "YES", myUpStake) : 0)`,
    to: `        ? (myUpStake > 0 ? await projectedPayout(m, "YES", myStake) : 0)`,
  },
  {
    name: "pair-suppressed-for-a-hedge",
    why: "⚠️ the decision undone — the pair is gated the way the ONE-number field is, so a hedged holder sees nothing at all again. That is the exact state UD-20 was re-opened about",
    file: BOARD,
    from: `    myPayoutIfUp:
      state === "locked" && myStake > 0`,
    to: `    myPayoutIfUp:
      state === "locked" && myStake > 0 && (myUpStake === 0 || myDownStake === 0)`,
  },
  {
    name: "one-number-learns-to-answer-for-a-hedge",
    why: "⛔ THE OPPOSITE UNDOING — `myExactPayout` loses its one-sided gate, so the single-number half-truth is back beside the honest pair. Suppressing that field for a hedge is not optional",
    file: BOARD,
    from: `      state === "locked" && myStake > 0 && (myUpStake === 0 || myDownStake === 0)
        ? await projectedPayout(m, myUpStake > 0 ? "YES" : "NO", myStake)`,
    to: `      state === "locked" && myStake > 0
        ? await projectedPayout(m, myUpStake > 0 ? "YES" : "NO", myStake)`,
  },
  {
    name: "losing-side-nulled-instead-of-zero",
    why: "⚠️ the empty side returns null rather than 0, so the surface — which renders the pair only when BOTH are present — silently stops quoting a one-sided holder at all",
    file: BOARD,
    from: `        ? (myDownStake > 0 ? await projectedPayout(m, "NO", myDownStake) : 0)`,
    to: `        ? (myDownStake > 0 ? await projectedPayout(m, "NO", myDownStake) : null)`,
  },
  {
    name: "quoted-while-the-pool-can-still-move",
    why: "⛔ the locked gate goes, so an OPEN round quotes an EXACT figure that the next bet will change — an estimate dressed as certainty on a money surface",
    file: BOARD,
    from: `    myPayoutIfUp:
      state === "locked" && myStake > 0`,
    to: `    myPayoutIfUp:
      myStake > 0`,
  },
  {
    name: "quoted-to-a-player-with-no-stake",
    why: "⚠️ the stake gate goes, so a signed-in bystander is quoted a payout on somebody else's round — the same class of leak as showing them a stranger's position",
    file: BOARD,
    from: `    myPayoutIfDown:
      state === "locked" && myStake > 0`,
    to: `    myPayoutIfDown:
      state === "locked"`,
  },
  {
    name: "the-panel-stops-rendering-the-pair",
    why: "⚠️ the DATA is right and the SCREEN drops it — the surface renders only the UP row, so a hedged holder is told half of their position. §4 reads the component, because a payload nobody paints is not a fix",
    file: PANEL,
    from: `        {payoutIfUp != null && payoutIfDown != null && (`,
    to: `        {false && payoutIfUp != null && payoutIfDown != null && (`,
  },
];

let caught = 0;
const missed = [];
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");
  const from = toFileEol(m.from, src);
  const to = toFileEol(m.to, src);
  if (!src.includes(from)) { missed.push(`${m.name} — HARNESS ERROR: anchor not found`); console.log(`  ✗ ${m.name} — anchor not found`); continue; }
  writeFileSync(m.file, src.replace(from, to));
  if (readFileSync(m.file, "utf8") === src) { missed.push(`${m.name} — HARNESS ERROR: no write`); continue; }
  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else { missed.push(m.name); console.log(`  ✗ MISS ${m.name} — the guard did NOT catch this`); }
}
restore();

console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (missed.length) { for (const x of missed) console.log(`  · ${x}`); process.exit(1); }
