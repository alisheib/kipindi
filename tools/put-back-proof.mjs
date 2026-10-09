// Manual red proof for test:timer-date's §L4 fence: put ONE English call back in a converted file, run the gate,
// restore the file byte for byte, and prove the restore (sha256 before == after) and that the gate is green again.
// Run from the worktree root: node <this file>
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const FILE = "src/app/watchlist/page.tsx";
const FROM = "formatEatDateTime(Date.parse(m.resolutionAt), Date.now(), t.common.monthsShort, locale)";
const TO = "formatDateTime(m.resolutionAt)";
const sha = (b) => createHash("sha256").update(b).digest("hex");

const gate = () => {
  try {
    const out = execFileSync("npx", ["tsx", "scripts/timer-date.test.mts"], { encoding: "utf8", stdio: "pipe", shell: true });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

const original = readFileSync(FILE); // a Buffer: restored exactly as read
const before = sha(original);
const text = original.toString("utf8");
if (text.split(FROM).length - 1 !== 1) { console.error("anchor not found exactly once"); process.exit(2); }
let red;
try {
  writeFileSync(FILE, text.replace(FROM, () => TO), "utf8");
  console.log(`planted: ${FILE}: ${FROM}  ->  ${TO}`);
  red = gate();
} finally {
  writeFileSync(FILE, original);
}
const after = sha(readFileSync(FILE));
console.log(`gate with the plant: exit=${red.code}`);
for (const l of red.out.split("\n").filter((l) => l.startsWith("FAIL") || l.startsWith("timer-date:"))) console.log("  " + l.trim());
console.log(`restored byte for byte: ${before === after} (sha256 ${before.slice(0, 16)}… before, ${after.slice(0, 16)}… after)`);
const green = gate();
console.log(`gate after restore: exit=${green.code} · ${green.out.trim().split("\n").pop()}`);
process.exit(red.code !== 0 && before === after && green.code === 0 ? 0 : 1);
