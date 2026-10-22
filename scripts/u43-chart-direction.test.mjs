import { readFileSync } from "node:fs";
import { chartDirectionIssues } from "./u43-chart-direction-contract.mjs";

const source = readFileSync(process.env.U43_CHART_SOURCE || "src/components/charts/terminal-chart.tsx", "utf8");
const micro = readFileSync(process.env.U43_MICRO_SOURCE || "src/components/charts/round-live-line.tsx", "utf8");
const issues = chartDirectionIssues(source, micro);
for (const issue of issues) console.error(`FAIL ${issue}`);
console.log(`U43 chart direction: ${issues.length ? "FAIL" : "PASS"} (${issues.length} issues)`);
process.exitCode = issues.length ? 1 : 0;
