/** U43 B5 receipt in-memory mutation proof; no source file is written. */
import { readFileSync } from "node:fs";
import { receiptCommitTruthIssues, receiptFormatIssues } from "./u43-receipt-format-contract.mjs";

const original = readFileSync("src/components/updown/updown-bet-receipt-modal.tsx", "utf8");
if (receiptFormatIssues(original).length) throw new Error("Baseline receipt format guard failed");
const cases = [
  ["ungrouped price returns", "value: usd(info.openPrice, info.decimals)", "value: `$${info.openPrice.toFixed(info.decimals)}`"],
  ["device clock returns", "const clock = fmtEATClock(ms);", 'const clock = new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });'],
  ["EAT zone vanishes", 'return clock == null ? null : `${clock} EAT`;', "return clock;"],
  ["betting deadline drops", "const betsClose = clockOf(info.selectionClosedAt);", "const betsClose = null;"],
  ["result deadline drops", "const resultDue = clockOf(info.closesAt);", "const resultDue = null;"],
];
for (const [name, from, to] of cases) {
  if (original.split(from).length !== 2) throw new Error(`Mutation anchor not unique: ${name}`);
  if (!receiptFormatIssues(original.replace(from, to)).length) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 receipt format red proof: ${cases.length} reversions caught`);

const hook = readFileSync("src/components/updown/use-quick-bet.ts", "utf8");
const receipt = readFileSync("src/lib/updown-receipt.ts", "utf8");
if (receiptCommitTruthIssues(hook, original, receipt).length) throw new Error("Baseline receipt commit-truth guard failed");
const truthCases = [
  ["committed value is dropped", "hook", "payoutIfWin: placed.payoutIfWin,", "payoutIfWin: amount,"],
  ["stale board reprices receipt", "modal", "const projected = receiptProjectedPayout(pricing.show, placed);", "const projected = projectedReturn(pricing, placed.side, placed.amount);"],
  ["projection qualifier is dropped", "modal", "footnote={projected != null ? t.market.udEstimateNote : undefined}", "footnote={undefined}"],
  ["display switch is bypassed", "receipt", "return show && Number.isSafeInteger(placed.payoutIfWin) && placed.payoutIfWin > 0", "return true && Number.isSafeInteger(placed.payoutIfWin) && placed.payoutIfWin > 0"],
  ["committed value is replaced", "receipt", "? placed.payoutIfWin : null;", "? 0 : null;"],
];
for (const [name, target, from, to] of truthCases) {
  const source = target === "hook" ? hook : target === "modal" ? original : receipt;
  if (source.split(from).length !== 2) throw new Error(`Mutation anchor not unique: ${name}`);
  const changed = source.replace(from, to);
  const issues = receiptCommitTruthIssues(
    target === "hook" ? changed : hook,
    target === "modal" ? changed : original,
    target === "receipt" ? changed : receipt,
  );
  if (!issues.length) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 receipt commit-truth red proof: ${truthCases.length} reversions caught`);
