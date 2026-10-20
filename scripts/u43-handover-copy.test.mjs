/** U43 B5 guard for the duplicate settled-detail next-round message. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handoverCopyIssues } from "./u43-handover-copy-contract.mjs";

const sources = {
  handover: readFileSync("src/components/updown/updown-handover.tsx", "utf8"),
  page: readFileSync("src/app/updown/[roundId]/page.tsx", "utf8"),
};
assert.deepEqual(handoverCopyIssues(sources), []);
console.log("U43 handover copy guard: one visible phase and a ready-only successor link passed");
