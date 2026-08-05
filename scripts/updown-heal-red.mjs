/**
 * RED harness for `npm run test:updown-heal` — the E-86 fixes specifically.
 *
 *   node scripts/updown-heal-red.mjs
 *
 * ⛔ EVERY MUTATION HERE IS A REVERT, NOT A HYPOTHETICAL. Each one restores code that was
 * running on production this morning and that voided two real rounds while burning 345 of 377
 * provider credits in 55 seconds. A guard against a defect that has already happened is only
 * worth anything if reinstating the defect turns it red.
 *
 * Rules obeyed: anchors re-expressed in the target file's line endings; the result is read from
 * the suite's OWN summary line; MISS unless the run exits non-zero AND names a failure.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SERVICE = new URL("../src/lib/server/updown-service.ts", import.meta.url);
const CONFIG = new URL("../src/lib/server/updown-config.ts", import.meta.url);
const FEED = new URL("../src/lib/server/updown-feed.ts", import.meta.url);

const MUTATIONS = [
  {
    // ⛔ THE HOLE ITSELF. Without the touch, `lastAttemptAt` stays null for a carved-out
    // refusal, the backoff gate is skipped, and the metered provider is re-read every tick.
    name: "uncharged-read-not-recorded — the ladder is skipped and the provider is re-dialled",
    file: SERVICE,
    from: `      await observationStore.touchAttempt(obs.id, detail);`,
    to: `      // reverted: the read is not recorded`,
  },
  {
    // ⚠️ The subtler half: recorded, but the rung read literally. `retryDelaySeconds(cfg, 0)`
    // is 0 by design, so this reopens the same hole from the second read onward.
    name: "zero-rung-restored — a recorded-but-uncharged read still waits 0s",
    file: SERVICE,
    from: `    const readyAt = Date.parse(obs.lastAttemptAt) + retryDelaySeconds(cfg, Math.max(1, obs.attempts)) * 1000;`,
    to: `    const readyAt = Date.parse(obs.lastAttemptAt) + retryDelaySeconds(cfg, obs.attempts) * 1000;`,
  },
  {
    // The money decision: a rate limit charged to the budget voids the round over our own
    // request rate. This is exactly what BTC 3m #188 and BTC 5m #6 did.
    name: "rate-limit-charged — a 429 spends one of the boundary's lives again",
    file: CONFIG,
    from: `  if (reason === "rate-limited") return false;`,
    to: `  if (reason === "rate-limited") return true;`,
  },
  {
    name: "rate-limit-unrecognised — a 429 is folded back into the generic provider error",
    file: FEED,
    from: `  return httpStatus === 429 || providerCode === 429;`,
    to: `  return false;`,
  },
  {
    // ⛔ The carve-out must not become a blanket amnesty: if nothing costs an attempt, a
    // genuinely dead source never terminates and the round waits for the deadline every time.
    name: "budget-disarmed — no refusal costs an attempt at all",
    file: CONFIG,
    from: `  if (reason === "bar-not-published") {`,
    to: `  if (true) return false;
  if (reason === "bar-not-published") {`,
  },
];

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  const from = toFileEol(m.from, original);
  const to = toFileEol(m.to, original);
  if (!original.includes(from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(m.file, original.replace(from, to));
  try {
    if (readFileSync(m.file, "utf8") === original) throw new Error("mutation did not land on disk");
    let exitCode = 0, out = "";
    try {
      out = execSync("npx tsx scripts/updown-heal.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    // The suite's OWN summary line — never the bare words "N failed".
    const failed = Number(/(?:ALL PASS|FAILURES) — \d+ passed, (\d+) failed/.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/FAIL (.+)/.exec(out)?.[1] ?? "").slice(0, 86)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(m.file, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
