import { readFileSync } from "node:fs";
import { alignedBoundaryIssues } from "./u43-aligned-boundary-contract.mjs";

const issues = alignedBoundaryIssues({
  route: readFileSync("src/app/api/dev-test/updown-handover/route.ts", "utf8"),
  helper: readFileSync("src/app/api/dev-test/updown-handover/aligned-boundary.ts", "utf8"),
});
if (issues.length) {
  for (const issue of issues) console.error(`FAIL ${issue}`);
  process.exit(1);
}
console.log("U43 aligned QA boundary: production gate, default path, service path and whole-minute samples pass");
