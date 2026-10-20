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
const SVC = new URL("../src/lib/server/market-service.ts", import.meta.url);

const MUTATIONS = [
  {
    name: "void chip claims a refund before money settles",
    file: DICT,
    from: `      udVoided: "Void",`,
    to: `      udVoided: "Void · refunded",`,
  },
  {
    name: "void body erases prior cash-out and claims all stakes paid",
    file: DICT,
    from: `      udVoidedBody: "The price did not move enough to call. Remaining held stakes are returned in full when settlement completes. Earlier cash-outs keep their paid amount.",`,
    to: `      udVoidedBody: "The price did not move enough to call. Every stake is returned in full.",`,
  },
  {
    name: "source-failed refund denies an already-paid cash-out",
    file: DICT,
    from: `      udRefundSourceFailed: "We could not confirm a closing price for this round. Your remaining stake was returned in full.",`,
    to: `      udRefundSourceFailed: "We could not confirm a closing price for this round, so nobody was paid. Your remaining stake was returned in full.",`,
  },
  {
    name: "source-failed guest note denies an already-paid cash-out",
    file: DICT,
    from: `      udVoidNoteSourceFailed: "Hatukuweza kuthibitisha bei ya kufunga ya raundi hii.",`,
    to: `      udVoidNoteSourceFailed: "Hatukuweza kuthibitisha bei ya kufunga ya raundi hii, hivyo hakuna aliyelipwa.",`,
  },
  {
    name: "source-failed refund claims the whole original stake after a cash-out",
    file: DICT,
    from: `      udRefundSourceFailed: "We could not confirm a closing price for this round. Your remaining stake was returned in full.",`,
    to: `      udRefundSourceFailed: "We could not confirm a closing price for this round. Your stake is back in full.",`,
  },
  {
    name: "unmatched copy denies an earlier opposing cash-out",
    file: DICT,
    from: `      udRefundUnmatchedReason: "No stake remained on the other side, so there was nothing to win or lose.",`,
    to: `      udRefundUnmatchedReason: "Nobody backed the other side, so there was nothing to win or lose.",`,
  },
  {
    // 🔴 E-94, REVERTED: every void reason back to one wallet row. Driven on production — a
    // no-move refund and an operator void were byte-identical in the only record a player keeps.
    name: "wallet-row-loses-the-reason — a no-move refund and an operator void read the same",
    file: SVC,
    from: '            description: `${refundDescription ?? "Refund"} · "${m.titleEn.slice(0, 60)}"${refundDescription ? "" : " voided"}`,',
    to: '            description: `Refund · "${m.titleEn.slice(0, 60)}" voided`,',
  },
  {
    // ⛔ E-87, REVERTED. This is the code that ran on production this morning: a round that
    // resolved UP, with the player on UP, labelled "Void · refunded" one card from a proof
    // reading "OUTCOME ▲ Up".
    name: "decided-round-labelled-void — the chip falls through to the round's void label again",
    file: new URL("../src/app/updown/[roundId]/page.tsx", import.meta.url),
    from: `    : refundReason === "unmatched" ? t.market.udRefundTitle`,
    to: `    : result === null && false ? t.market.udRefundTitle`,
  },

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
    from: `        ) : settled && refundReason ? (`,
    to: `        ) : state === "void" ? (`,
  },
  {
    name: "round-page-back-to-two-branches — the same defect on the detail page",
    file: PAGE,
    from: `            ) : round.settled && refundReason ? (`,
    to: `            ) : round.state === "void" ? (`,
  },
  {
    // Two reasons sharing one sentence — the defect in its original shape, at the copy layer.
    name: "two-reasons-one-sentence — unmatched inherits the no-move copy",
    file: DICT,
    from: `      udRefundUnmatched: "No stake remained on the other side, so there was nothing to win or lose. Your remaining stake was returned in full.",`,
    to: `      udRefundUnmatched: "The price did not move far enough either way, so the round could not be called. Your remaining stake was returned in full.",`,
  },
  {
    // 🔴 THE LIVE DEFECT, restored: the result panel shadows the refund branch, so the one
    // player who WAS refunded never sees why. Found on production, not by this suite.
    name: "result-panel-shadows-the-reason — the refunded player never reaches the explanation",
    file: PAGE,
    from: `                {round.settled && refundReason && (`,
    to: `                {false && (`,
  },
  {
    // The board stops reporting the refund, so the card can never reach the unmatched branch.
    name: "board-stops-reporting-the-refund — the decided-but-refunded case becomes invisible",
    file: BOARD,
    from: `      if (isRefundedPosition(p.status, p.stake, p.finalPayout)) e.refunded += p.stake;`,
    to: `      if (false) e.refunded += p.stake;`,
  },
  {
    name: "equal winning payout is mistaken for a refund",
    file: RULE,
    from: `return status === "VOID" && Number.isFinite(stake) && stake > 0 && payout === stake;`,
    to: `return Number.isFinite(stake) && stake > 0 && payout === stake;`,
  },
  {
    name: "the board forgets position status and labels a winning payout a refund",
    file: BOARD,
    from: `isRefundedPosition(p.status, p.stake, p.finalPayout)`,
    to: `p.finalPayout === p.stake`,
  },
  {
    name: "the detail page infers a refund from equal aggregate money again",
    file: PAGE,
    from: `isRefundedPosition(item.status, item.stake, item.payout)`,
    to: `item.payout === item.stake`,
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
