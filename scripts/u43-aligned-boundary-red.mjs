import { readFileSync } from "node:fs";
import { alignedBoundaryIssues } from "./u43-aligned-boundary-contract.mjs";

const original = {
  route: readFileSync("src/app/api/dev-test/updown-handover/route.ts", "utf8"),
  helper: readFileSync("src/app/api/dev-test/updown-handover/aligned-boundary.ts", "utf8"),
};
if (alignedBoundaryIssues(original).length) throw new Error("Baseline aligned-boundary guard failed");
const plants = [
  ["deadline can be less than a minute", "helper", "QA_ALIGNED_MIN_LEAD_MS = 60_000", "QA_ALIGNED_MIN_LEAD_MS = 0"],
  ["round closes on a previous minute", "helper", "Math.ceil((nowMs + QA_ALIGNED_MIN_LEAD_MS)", "Math.floor((nowMs + QA_ALIGNED_MIN_LEAD_MS)"],
  ["round loses its actual span", "helper", "new Date(closeMs - spanMs)", "new Date(closeMs - 60_000)"],
  ["zero span accepted", "helper", "spanMs <= 0", "spanMs < 0"],
  ["production door opened", "route", 'if (process.env.NODE_ENV === "production")', "if (false)"],
  ["aligned request no longer explicit", "route", "body?.alignedBoundary === true", "body?.alignedBoundary !== false"],
  ["default lead ignored", "route", "leadSeconds * 1_000", "0"],
  ["chain does not receive boundary", "route", "nextBoundaryAt: openAt", "nextBoundaryAt: new Date().toISOString()"],
  ["production service skipped", "route", "await advanceChain(c.id, { now: Date.now() });", "{ opened: true };"],
];
for (const [name, file, from, to] of plants) {
  if (!original[file].includes(from)) throw new Error(`Mutation anchor missing: ${name}`);
  const candidate = { ...original, [file]: original[file].replace(from, to) };
  if (!alignedBoundaryIssues(candidate).length) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 aligned QA boundary red proof: ${plants.length} reversions caught in memory`);
