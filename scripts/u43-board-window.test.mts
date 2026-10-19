/** U43: an open round and a result card may never claim overlapping minutes. */
import { readFileSync } from "node:fs";
import { latestNonOverlappingResult } from "../src/lib/updown-board-order";
import { decomment } from "./lib/decomment.mts";

let failed = 0;
const check = (name: string, yes: boolean) => {
  console.log(`${yes ? "PASS" : "FAIL"} ${name}`);
  if (!yes) failed++;
};
type Window = { state: string; opensAt: string; closesAt: string; id: string };
const row = (id: string, state: string, opensAt: string, closesAt: string): Window =>
  ({ id, state, opensAt, closesAt });
const current = row("current", "open", "2026-10-19T16:45:00.000Z", "2026-10-19T17:00:00.000Z");
const adjacent = row("adjacent", "resolved", "2026-10-19T16:30:00.000Z", current.opensAt);
const overlapping = row("overlap", "resolved", "2026-10-19T16:40:00.000Z", "2026-10-19T16:55:00.000Z");
const duplicate = row("duplicate", "resolved", current.opensAt, current.closesAt);
const older = row("older", "void", "2026-10-19T16:15:00.000Z", "2026-10-19T16:30:00.000Z");

check("1.1 exact predecessor remains visible", latestNonOverlappingResult([adjacent], current)?.id === adjacent.id);
check("1.2 a real older result remains visible across a gap", latestNonOverlappingResult([older], current)?.id === older.id);
check("1.3 same-window result stays off the current board", latestNonOverlappingResult([duplicate], current) === null);
check("1.4 partial overlap stays off the current board", latestNonOverlappingResult([overlapping], current) === null);
check("1.5 an overlapping newest result does not masquerade as an older last result",
  latestNonOverlappingResult([overlapping, older], current) === null);
check("1.6 a result without a current round remains visible", latestNonOverlappingResult([adjacent], null)?.id === adjacent.id);
check("1.7 a malformed close never qualifies beside a current round",
  latestNonOverlappingResult([row("bad", "resolved", older.opensAt, "bad")], current) === null);

const board = decomment(readFileSync("src/lib/server/updown-board.ts", "utf8"));
check("2.1 production board uses the non-overlap selector",
  board.includes('import { latestNonOverlappingResult } from "@/lib/updown-board-order";')
  && board.includes("const lastDone = latestNonOverlappingResult(mapped, current);"));

const driver = decomment(readFileSync("scripts/live/updown-visual-states.mjs", "utf8"));
const seed = driver.slice(driver.indexOf('console.log("=== seed")'), driver.indexOf("async function photograph("));
check("3.1 local state fixture does not open an overlapping initial round",
  seed.length > 0 && !seed.includes('post("/api/dev-test/updown-advance"'));
check("3.2 local state fixture arms and settles one predecessor",
  (seed.match(/phase: "arm"/g) ?? []).length === 1
  && (seed.match(/phase: "settle"/g) ?? []).length === 1
  && !seed.includes("PREROLL"));
check("3.3 local state fixture verifies exact adjacent handover",
  seed.includes("testHandover.opened.opensAt !== testHandover.closed.closesAt")
  && seed.includes("testHandover?.opened?.id"));

console.log(`U43 board window: ${failed ? `${failed} failed` : "all checks passed"}`);
process.exit(failed ? 1 : 0);
