/** U43 B5 guard: receipt formats and the money action's committed projection. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { usd } from "../src/lib/usd-price";
import { fmtEATClock } from "../src/lib/updown-source-label";
import { projectedReturn, type UpDownPricing } from "../src/lib/updown-pricing";
import { receiptProjectedPayout } from "../src/lib/updown-receipt";
import { receiptCommitTruthIssues, receiptFormatIssues } from "./u43-receipt-format-contract.mjs";

assert.equal(usd(2126.26, 2), "$2,126.26");
assert.equal(usd(3093.48, 2), "$3,093.48");
assert.equal(fmtEATClock(Date.parse("2026-10-19T16:32:00Z")), "19:32");
assert.equal(fmtEATClock(Date.parse("2026-10-19T21:05:00Z")), "00:05");
assert.equal(fmtEATClock(Number.NaN), null);
assert.deepEqual(receiptFormatIssues(readFileSync("src/components/updown/updown-bet-receipt-modal.tsx", "utf8")), []);
assert.deepEqual(receiptCommitTruthIssues(
  readFileSync("src/components/updown/use-quick-bet.ts", "utf8"),
  readFileSync("src/components/updown/updown-bet-receipt-modal.tsx", "utf8"),
  readFileSync("src/lib/updown-receipt.ts", "utf8"),
), []);

// A board snapshot can become stale between render and commitment. This fixture represents
// two distinct values and proves the receipt selects the money action's saved answer.
const staleBoard: UpDownPricing = {
  upPool: 36_000, downPool: 2_000, show: true,
  rates: { feeModel: "loser-share", commissionRate: 0.1, feeCeilingRate: 1 / 3, platformFeeRate: 0.03, operatorFeeRate: 0.1 },
};
const boardProjection = projectedReturn(staleBoard, "DOWN", 2_000);
const committedProjection = 7_500;
assert.notEqual(boardProjection, committedProjection, "fixture must represent a changed pool");
assert.equal(receiptProjectedPayout(staleBoard.show, { payoutIfWin: committedProjection }), committedProjection);
assert.equal(receiptProjectedPayout(false, { payoutIfWin: committedProjection }), null);
for (const bad of [0, -1, 7.5, Number.POSITIVE_INFINITY, Number.NaN]) {
  assert.equal(receiptProjectedPayout(true, { payoutIfWin: bad }), null);
}
console.log("U43 receipt guard: format and committed projection truth passed");
