/** U43 B5 in-memory mutation proof; no source file is written. */
import { readFileSync } from "node:fs";
import { handoverCopyIssues } from "./u43-handover-copy-contract.mjs";

const original = {
  handover: readFileSync("src/components/updown/updown-handover.tsx", "utf8"),
  page: readFileSync("src/app/updown/[roundId]/page.tsx", "utf8"),
};
if (handoverCopyIssues(original).length) throw new Error("Baseline handover copy guard failed");
const cases = [
  ["visible duplicate returns", "handover", '<span role="status" aria-live="polite" className="sr-only">{sentence}</span>', '<span role="status" aria-live="polite" className="sr-only">{sentence}</span><span>{sentence}</span>'],
  ["screen-reader status silenced", "handover", 'aria-live="polite" className="sr-only"', 'aria-live="off" className="sr-only"'],
  ["link offered before successor ready", "handover", "{hand.ready && successorRoundId && (", "{successorRoundId && ("],
  ["pod loses next-round phase", "page", "live: t.market.udNextMatchLive,", "live: t.market.udRoundSettled,"],
];
for (const [name, file, from, to] of cases) {
  if (original[file].split(from).length !== 2) throw new Error(`Mutation anchor not unique: ${name}`);
  if (!handoverCopyIssues({ ...original, [file]: original[file].replace(from, to) }).length) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 handover copy red proof: ${cases.length} reversions caught`);
