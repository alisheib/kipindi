/**
 * Mutate the real form-action to drop the signed play clock, prove the two-store
 * drive catches it in memory, then restore the exact bytes and prove green.
 * This is deliberately serial and must run only in an isolated checkout.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = "src/lib/server/maswali-player-acts.ts";
const file = resolve(root, target);
const source = readFileSync(file, "utf8");
const needle = "playStartedAt: opts.playStartedAt, stateNow: deps.stateNow";
if (source.split(needle).length !== 2) throw new Error(`RED refused: expected one action play-clock forwarding line in ${target}`);
const dirty = spawnSync("git", ["diff", "--quiet", "--", target], { cwd: root });
if (dirty.status !== 0) throw new Error(`RED refused: ${target} already has local edits`);
const run = () => spawnSync("npx", ["tsx", "scripts/lib/maswali-money-action-child.mts"], {
  cwd: root, shell: process.platform === "win32", encoding: "utf8", timeout: 5 * 60_000,
  maxBuffer: 32 * 1024 * 1024,
  env: { ...process.env, NODE_ENV: "test", HB_MONEY_STORE: "memory", DATABASE_URL: "", USE_PRISMA_DAL: "false" },
});

let red;
try {
  writeFileSync(file, source.replace(needle, "playStartedAt: undefined, stateNow: deps.stateNow"));
  red = run();
} finally {
  writeFileSync(file, source);
}
const redOut = `${red?.stdout ?? ""}\n${red?.stderr ?? ""}`;
const caught = red?.status !== 0 && /FAIL \[memory\] the signed play clock enforces the session limit on the action/.test(redOut);
if (!caught) {
  process.stdout.write(redOut);
  throw new Error("RED FAILED: dropping the signed play clock did not fail its action assertion");
}
console.log("PASS RED: dropping the action's signed play clock fails the session-limit assertion");
const green = run();
const greenOut = `${green.stdout ?? ""}\n${green.stderr ?? ""}`;
const restored = readFileSync(file, "utf8") === source;
if (green.status !== 0 || !/@@SUMMARY \{"pass":\d+,"fail":0,"store":"memory"\}/.test(greenOut) || !restored) {
  process.stdout.write(greenOut);
  throw new Error("RED FAILED: original action did not return to green with exact source bytes");
}
console.log("PASS GREEN: restored action passes the real FormData money drive; source bytes restored");
