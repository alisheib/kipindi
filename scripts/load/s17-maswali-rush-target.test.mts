/** Pure S17 target guard: the disposable load budget, its fixture mix and its stated provenance stay in sync. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { arrivalFloor, DEFAULT_RUSH, RUSH_SLIP_SIZES, rushShape, rushTargetLabel, type RushShapeInput } from "./s17-maswali-rush-target.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const plan = readFileSync(join(ROOT, "docs/MASWALI-PLAN.md"), "utf8");
const harness = readFileSync(join(ROOT, "scripts/load/s17-maswali-rush.mts"), "utf8");
const worker = readFileSync(join(ROOT, "scripts/load/s17-maswali-rush-worker.mts"), "utf8");
const sizeMix = [...RUSH_SLIP_SIZES];
let pass = 0;
function ok(label: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL ${label}`);
  pass++;
  console.log(`PASS ${label}`);
}

function targetProblems(input: RushShapeInput, sizes: readonly number[]): string[] {
  const shape = rushShape(input);
  const meanTickets = sizes.reduce((sum, n) => sum + n, 0) / sizes.length;
  const problems: string[] = [];
  if (input.testReferencePerMin !== 30) problems.push("reference");
  if (input.multiplier !== 10 || shape.rate !== 300) problems.push("base rate");
  if (input.minutes !== 10 || input.lastMinuteFactor !== 3 || shape.lastMinuteRate !== 900) problems.push("burst");
  if (input.afterCloseSec !== 60 || shape.plannedBefore !== 3_600 || shape.plannedAfter !== 300) problems.push("scheduled purchases");
  if (meanTickets !== 26 / 9 || shape.plannedBefore * meanTickets !== 10_400) problems.push("ticket mix");
  if (arrivalFloor(shape.plannedBefore) !== 3_240 || arrivalFloor(shape.lastMinuteRate) !== 720) problems.push("arrival floor");
  return problems;
}

ok("the default plans 300 purchases/min, 900 in the final minute and about 10,400 pre-close tickets", targetProblems(DEFAULT_RUSH, sizeMix).length === 0);
ok("the harness and worker use the configured load shape and ticket-size distribution",
  harness.includes('from "./s17-maswali-rush-target.mts"') && harness.includes("rushShape(target)")
  && harness.includes("arrivalFloor(PLANNED_BEFORE)") && harness.includes("arrivalFloor(UPDOWN_PER_MIN * MINUTES)")
  && worker.includes("RUSH_SLIP_SIZES[Math.floor(Math.random() * RUSH_SLIP_SIZES.length)]"));
ok("the run labels its rate as a synthetic test reference, not a measured production peak",
  rushTargetLabel(DEFAULT_RUSH).includes("30/min synthetic test reference × 10; not a measured production peak")
  && harness.includes("rushTargetLabel(target)"));
const decision = plan.match(/\*\*S7 rush test target:\*\*[^\n]*/)?.[0] ?? "";
ok("the owning plan gives the synthetic target, reason and provenance",
  decision.includes("30 Millionea purchases/minute") && decision.includes("300/minute") && decision.includes("900/minute")
  && decision.includes("10,400") && decision.includes("tickets") && decision.includes("not a measured production peak"));

if (process.argv.includes("--prove-red")) {
  ok("RED: a higher invented reference is rejected", targetProblems({ ...DEFAULT_RUSH, testReferencePerMin: 31 }, sizeMix).includes("reference"));
  ok("RED: removing the final-minute burst is rejected", targetProblems({ ...DEFAULT_RUSH, lastMinuteFactor: 1 }, sizeMix).includes("burst"));
  ok("RED: changing the worker's ticket mix is rejected", targetProblems(DEFAULT_RUSH, [1, 1, 2]).includes("ticket mix"));
  ok("RED: missing arrivals fail the claimed load", 3_239 < arrivalFloor(rushShape(DEFAULT_RUSH).plannedBefore));
}
console.log(`s17-maswali-rush-target: ${pass} passed, 0 failed`);
