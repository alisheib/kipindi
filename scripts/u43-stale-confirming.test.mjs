import { readFileSync } from "node:fs";
import { staleConfirmingIssues } from "./u43-stale-confirming-contract.mjs";

const issues = staleConfirmingIssues(readFileSync("src/lib/server/updown-board.ts", "utf8"));
if (issues.length) throw new Error(issues.join("; "));
console.log("U43 board selection: latest settled result remains ahead of stale confirming rounds");
