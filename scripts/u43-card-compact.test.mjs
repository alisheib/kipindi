/** U43 B1/B5 guard for the measured card compression and neutral status. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compactCardIssues } from "./u43-card-compact-contract.mjs";

const sources = {
  card: readFileSync("src/components/updown/updown-card.tsx", "utf8"),
  css: readFileSync("src/app/globals.css", "utf8"),
  line: readFileSync("src/components/charts/round-live-line.tsx", "utf8"),
  controls: readFileSync("src/components/updown/updown-stake-controls.tsx", "utf8"),
  dict: readFileSync("src/lib/i18n-dict.ts", "utf8"),
};
assert.deepEqual(compactCardIssues(sources), []);
console.log("U43 compact card guard: spacing, one source, refund, line and neutral status passed");
