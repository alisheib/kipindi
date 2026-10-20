/** Physical classifier reversal plus in-memory UI reversals for the settled hedge guard. */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { hedgedResultIssues } from "./u43-hedged-result-contract.mjs";
import { MUTATIONS } from "./anchors/u43-hedged-result.anchors.mjs";

const BOARD = "src/lib/server/updown-board.ts";
const DETAIL = "src/app/updown/[roundId]/page.tsx";
const CARD = "src/components/updown/updown-card.tsx";
const board = readFileSync(BOARD, "utf8");
const detail = readFileSync(DETAIL, "utf8");
const card = readFileSync(CARD, "utf8");
const digest = (text) => createHash("sha256").update(text).digest("hex");
const replaceOnce = (source, from, to, name) => {
  if (source.split(from).length !== 2) throw new Error(`RED ANCHOR STALE: ${name}`);
  return source.replace(from, to);
};
if (hedgedResultIssues({ detail, card }).length) throw new Error("Baseline mixed-result UI guard failed");

const plants = MUTATIONS.slice(0, -1);
for (const { name, file, from, to } of plants) {
  if (file !== DETAIL && file !== CARD) throw new Error(`Unrecognised UI mutation target: ${file}`);
  const next = replaceOnce(file === DETAIL ? detail : card, from, to, name);
  const issues = hedgedResultIssues({ detail: file === DETAIL ? next : detail, card: file === CARD ? next : card });
  if (issues.length === 0) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 hedged-result UI red: ${plants.length} in-memory reversals caught`);

function runTest() {
  const run = spawnSync("npx", ["tsx", "scripts/u43-hedged-result.test.mts"], {
    cwd: process.cwd(), shell: process.platform === "win32", encoding: "utf8", timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return { code: run.status ?? 1, output: `${run.stdout ?? ""}\n${run.stderr ?? ""}` };
}
const baseline = runTest();
if (baseline.code !== 0 || !baseline.output.includes("U43 hedged result: MIXED net loss, WIN, LOSS and all-VOID passed"))
  throw new Error(`Baseline hedged-result test is not green: ${baseline.output.slice(-1000)}`);

const physical = MUTATIONS.at(-1);
if (physical?.file !== BOARD) throw new Error("Physical hedge classifier anchor is missing");
const mutant = replaceOnce(board, physical.from, physical.to, physical.name);
let red;
try {
  writeFileSync(BOARD, mutant, "utf8");
  red = runTest();
} finally {
  writeFileSync(BOARD, board, "utf8");
}
if (digest(readFileSync(BOARD, "utf8")) !== digest(board)) throw new Error("RED RESTORE FAILED: updown-board.ts differs");
if (red.code === 0 || !red.output.includes("a WIN leg must not turn a net losing hedge into a WIN headline"))
  throw new Error(`RED MISSED: classifier reversal did not fail the money-truth assertion: ${red.output.slice(-1000)}`);
console.log("U43 hedged-result red: old any-WIN classifier failed the real settlement fixture; source restored byte-for-byte");
