import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { receiptFitIssues } from "./u43-receipt-fit-contract.mjs";

const read = (path: string) => readFileSync(path, "utf8");
assert.deepEqual(receiptFitIssues(
  read("src/components/updown/updown-bet-receipt-modal.tsx"),
  read("src/components/markets/operation-result-modal.tsx"),
  read("src/app/globals.css"),
), []);
console.log("U43 phone receipt fit guard: disclosures, actions and compact-only whitespace passed");
