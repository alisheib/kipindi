import { readFileSync } from "node:fs";
import { staleConfirmingIssues } from "./u43-stale-confirming-contract.mjs";

const original = readFileSync("src/lib/server/updown-board.ts", "utf8");
if (staleConfirmingIssues(original).length) throw new Error("Baseline board selection guard failed");
// Each plant must be caught for ITS reason: the fourth field is the one issue it has to raise (2026-10-21, u43-hb).
const plants = [
  ["skip over latest settled result", "mapped.find((r) => Date.parse(r.opensAt) < Date.parse(current.opensAt)) ?? null", "mapped.find((r) => r.state === \"confirming\" && Date.parse(r.opensAt) < Date.parse(current.opensAt)) ?? null",
    "older confirming round displaced the latest settled result"],
  ["show two confirming rounds", "current?.state !== \"confirming\" && immediatePrevious?.state === \"confirming\"", "immediatePrevious?.state === \"confirming\"",
    "two older confirming rounds became live board cards"],
  ["bypass overlap selector", "latestNonOverlappingResult(mapped, current)", "mapped.find((r) => r.state === \"resolved\" || r.state === \"void\") ?? null",
    "a resolved window overlapping the open round appeared as its last result"],
  ["remove selector import", 'import { latestNonOverlappingResult } from "@/lib/updown-board-order";', "",
    "board no longer imports its non-overlapping result selector"],
  // 2026-10-21 · U43 Release B (3bcbec37e) hands the picks on through the viewer hydration; its pins get their own plants.
  ["hand the picks on in another order", "const selectedBare = [current, justClosed, lastDone].filter(Boolean) as BoardRound[];", "const selectedBare = [current, lastDone, justClosed].filter(Boolean) as BoardRound[];",
    "board no longer hands on its picks as current, just closed, last result"],
  ["successors read the picks without the hydration", "const selected = await withSuccessors(selectedWithMine, chain, raw);", "const selected = await withSuccessors(selectedBare, chain, raw);",
    "board hydration no longer hands the selected picks, in order, to its successors"],
  ["hydration reverses the picks", "const selectedWithMine = (await Promise.all(selectedBare.map(async (round) => {", "const selectedWithMine = (await Promise.all([...selectedBare].reverse().map(async (round) => {",
    "board hydration no longer hands the selected picks, in order, to its successors"],
];
for (const [name, from, to, expected] of plants) {
  if (original.split(from).length !== 2) throw new Error(`Missing or ambiguous mutation anchor: ${name}`);
  const issues = staleConfirmingIssues(original.replace(from, to));
  if (issues.length !== 1 || issues[0] !== expected) throw new Error(`RED MISSED: ${name} (${JSON.stringify(issues)})`);
}
const overlapBlind = (rounds) => rounds.find((r) => r.state === "resolved" || r.state === "void") ?? null;
if (!staleConfirmingIssues(original, overlapBlind).some((issue) => issue.includes("overlapping"))) {
  throw new Error("RED MISSED: helper returning an overlapping result");
}
console.log(`U43 stale confirming red proof: ${plants.length + 1} reversions caught`);
