import { readFileSync } from "node:fs";
import { staleConfirmingIssues } from "./u43-stale-confirming-contract.mjs";

const original = readFileSync("src/lib/server/updown-board.ts", "utf8");
if (staleConfirmingIssues(original).length) throw new Error("Baseline board selection guard failed");
const plants = [
  ["skip over latest settled result", "mapped.find((r) => Date.parse(r.opensAt) < Date.parse(current.opensAt)) ?? null", "mapped.find((r) => r.state === \"confirming\" && Date.parse(r.opensAt) < Date.parse(current.opensAt)) ?? null"],
  ["show two confirming rounds", "current?.state !== \"confirming\" && immediatePrevious?.state === \"confirming\"", "immediatePrevious?.state === \"confirming\""],
];
for (const [name, from, to] of plants) {
  if (!original.includes(from)) throw new Error(`Missing mutation anchor: ${name}`);
  if (!staleConfirmingIssues(original.replace(from, to)).length) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 stale confirming red proof: ${plants.length} reversions caught`);
