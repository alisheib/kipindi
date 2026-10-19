/** U43 B5 guard: test the displayed values and the receipt's actual formatter calls. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { usd } from "../src/lib/usd-price";
import { fmtEATClock } from "../src/lib/updown-source-label";
import { receiptFormatIssues } from "./u43-receipt-format-contract.mjs";

assert.equal(usd(2126.26, 2), "$2,126.26");
assert.equal(usd(3093.48, 2), "$3,093.48");
assert.equal(fmtEATClock(Date.parse("2026-10-19T16:32:00Z")), "19:32");
assert.equal(fmtEATClock(Date.parse("2026-10-19T21:05:00Z")), "00:05");
assert.equal(fmtEATClock(Number.NaN), null);
assert.deepEqual(receiptFormatIssues(readFileSync("src/components/updown/updown-bet-receipt-modal.tsx", "utf8")), []);
console.log("U43 receipt format guard: grouped USD, 24-hour EAT and both deadlines passed");
