/**
 * RED harness for `npm run test:updown-void-copy`.
 *
 *   node scripts/updown-void-copy-red.mjs
 *
 * ⛔ MUTATION 1 RESTORES E-65 EXACTLY: it moves the decided-but-refunded check BELOW the
 * `outcome !== "VOID"` early return, so a round that resolved DOWN and refunded this player
 * falls through and prints a void's copy — *"the price did not move enough"* — about a round
 * where the price moved and the round decided.
 *
 * Rules obeyed: anchors re-expressed in the target file's line endings; the result read from
 * the suite's OWN summary line; MISS unless the run exits non-zero AND names a failure.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const RULE = new URL("../src/lib/updown-refund-reason.ts", import.meta.url);
const CARD = new URL("../src/components/updown/updown-card.tsx", import.meta.url);
const PAGE = new URL("../src/app/updown/[roundId]/page.tsx", import.meta.url);
const DICT = new URL("../src/lib/i18n-dict.ts", import.meta.url);
const BOARD = new URL("../src/lib/server/updown-board.ts", import.meta.url);

const MUTATIONS = [
  {
    // E-65 ITSELF: the ordering that made the one-sided case unreachable.
    name: "unmatched-checked-after-the-void-return — E-65 restored, a decided round prints a void's copy",
    file: RULE,
    from: `  if ((outcome === "UP" || outcome === "DOWN") && refundedStake > 0) return "unmatched";

  if (outcome !== "VOID") return null;`,
    to: `  if (outcome !== "VOID") return null;

  if ((outcome === "UP" || outcome === "DOWN") && refundedStake > 0) return "unmatched";`,
  },
  {
    // The silent bucket — how E-1 hid for a month.
    name: "unknown-folded-into-no-move — a new void reason is silently mislabelled",
    file: RULE,
    from: `    default: return "unexplained";`,
    to: `    default: return "no-move";`,
  },
  {
    // A void rendered with a direction — E-56.
    name: "void-gets-a-direction — E-56, a refund rendered as an UP or a DOWN",
    file: RULE,
    from: `  return outcome === "UP" || outcome === "DOWN" ? outcome : null;`,
    to: `  return outcome === "VOID" ? "DOWN" : outcome === "UP" || outcome === "DOWN" ? outcome : null;`,
  },
  {
    // A losing player consoled with a refund message they did not receive.
    name: "loser-gets-a-refund-sentence — copy about money that did not come back",
    file: RULE,
    from: `  if ((outcome === "UP" || outcome === "DOWN") && refundedStake > 0) return "unmatched";`,
    to: `  if (outcome === "UP" || outcome === "DOWN") return "unmatched";`,
  },
  {
    // The shipped two-branch ternary, back on the card.
    name: "card-back-to-two-branches — the shipped E-65 ternary, restored",
    file: CARD,
    from: `        ) : refundReason ? (`,
    to: `        ) : state === "void" ? (`,
  },
  {
    name: "round-page-back-to-two-branches — the same defect on the detail page",
    file: PAGE,
    from: `            ) : refundReason ? (`,
    to: `            ) : round.state === "void" ? (`,
  },
  {
    // Two reasons sharing one sentence — the defect in its original shape, at the copy layer.
    name: "two-reasons-one-sentence — unmatched inherits the no-move copy",
    file: DICT,
    from: `      udRefundUnmatched: "Nobody backed the other side, so there was nothing to win and nothing to lose. Your stake is back in full.",`,
    to: `      udRefundUnmatched: "The price did not move far enough either way, so the round could not be called. Your stake is back in full.",`,
  },
  {
    // 🔴 THE LIVE DEFECT, restored: the result panel shadows the refund branch, so the one
    // player who WAS refunded never sees why. Found on production, not by this suite.
    name: "result-panel-shadows-the-reason — the refunded player never reaches the explanation",
    file: PAGE,
    from: `                {refundReason && (`,
    to: `                {false && (`,
  },
  {
    // The board stops reporting the refund, so the card can never reach the unmatched branch.
    name: "board-stops-reporting-the-refund — the decided-but-refunded case becomes invisible",
    file: BOARD,
    from: `      if (p.finalPayout != null && p.finalPayout === p.stake) e.refunded += p.stake;`,
    to: `      if (false) e.refunded += p.stake;`,
  },
];

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  const from = toFileEol(m.from, original);
  const to = toFileEol(m.to, original);
  if (!original.includes(from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(m.file, original.replace(from, to));
  try {
    if (readFileSync(m.file, "utf8") === original) throw new Error("mutation did not land on disk");
    let exitCode = 0, out = "";
    try {
      out = execSync("npx tsx scripts/updown-void-copy.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    const failed = Number(/updown-void-copy: \d+ passed, (\d+) failed/.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/FAIL (.+)/.exec(out)?.[1] ?? "").slice(0, 80)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(m.file, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
