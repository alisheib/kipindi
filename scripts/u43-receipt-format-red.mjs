/** U43 B5 in-memory mutation proof; no source file is written. */
import { readFileSync } from "node:fs";
import { receiptFormatIssues } from "./u43-receipt-format-contract.mjs";

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
