/** U43 B5: recoverable errors are explicit without borrowing betting red. */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

let failed = 0;
const check = (id: string, yes: boolean) => {
  console.log(`${yes ? "PASS" : "FAIL"} ${id}`);
  if (!yes) failed++;
};
const read = (path: string) => decomment(readFileSync(path, "utf8"));
const route = read("src/components/ui/route-error.tsx");
const errors = ["src/app/updown/error.tsx", "src/app/updown/[roundId]/error.tsx", "src/app/markets/error.tsx"].map(read);
const cardStake = read("src/components/updown/updown-stake-controls.tsx");
const roundStake = read("src/components/updown/round-stake-panel.tsx");
const chart = read("src/components/charts/terminal-chart.tsx");

check("1.1 shared RouteError has a neutral player branch while default danger remains available",
  route.includes('tone = "danger"') && route.includes('tone?: "danger" | "neutral"')
  && route.includes('tone === "neutral" ? "border-border-strong bg-bg-overlay text-text-subtle" : "border-danger-border bg-danger-500/10 text-danger-fg"')
  && route.includes('tone === "neutral" ? "text-text-subtle" : "text-danger-fg"')
  && route.includes('tone === "neutral" ? "0 0 0 7px var(--bg-overlay)" : "0 0 0 7px var(--danger-wash)"'));
check("1.2 Up & Down board, round and market error routes ask for neutral treatment",
  errors.every((src) => src.includes('<RouteError') && src.includes('tone="neutral"')));

const neutralStake = (src: string) => src.includes('aria-invalid={customInvalid}')
  && src.includes('attention={customInvalid}')
  && !src.includes('error={customInvalid}')
  && src.includes('customInvalid ? "text-text" : "text-text-subtle"');
check("2.1 board invalid stake keeps aria-invalid, neutral field edge and plain range ink", neutralStake(cardStake));
check("2.2 round invalid stake keeps the same neutral treatment", neutralStake(roundStake));
check("3.1 chart delayed-source receipt uses neutral emphasis, not a side or failure red",
  chart.includes('guardedFeed.liveStale ? "var(--text-subtle)" : "var(--text-faint)"'));
const authority = readFileSync("docs/DESIGN_AUTHORITY.md", "utf8");
check("4.1 design law records the U43 neutral error and aria-invalid rule",
  authority.includes("An invalid custom stake keeps `aria-invalid`, a strong")
  && authority.includes("The chart's delayed-source receipt is neutral"));

console.log(`U43 error palette: ${failed ? `${failed} failed` : "all checks passed"}`);
process.exit(failed ? 1 : 0);
