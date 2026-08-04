/**
 * RED harness for `npm run test:updown-grid`.
 *
 *   node scripts/updown-grid-red.mjs
 *
 * ⛔ THE FIRST MUTATION IS THE IMPORTANT ONE: it restores, character for character, the
 * expression that shipped and that gave every round a boundary with seconds on it. A guard
 * for this defect is only worth anything if it rejects the exact code that caused it.
 *
 * Rules obeyed (both learned the hard way in this campaign):
 *  1. An anchor that does not match is a BROKEN HARNESS, not a missed defect — CRLF has fooled
 *     three sessions this way. Asserted present before, and gone after.
 *  2. "The file changed" is not evidence. Non-zero exit AND a named failure, or it is a MISS.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SERVICE = new URL("../src/lib/server/updown-service.ts", import.meta.url);
const DURATIONS = new URL("../src/lib/updown-durations.ts", import.meta.url);

const MUTATIONS = [
  {
    // ⚠️ Anchor updated 2026-08-04: the local was renamed `openMs` → `nowMinute` when
    // generateRoundNow gained its walk-back over completed minutes. The DEFECT this restores is
    // unchanged — an expression that zeroes the milliseconds and keeps the SECONDS, so every
    // boundary carries `21:27:37` and is unnamable in 1-minute bar data.
    name: "restore-the-shipped-expression — seconds survive into the boundary (21:27:37)",
    file: SERVICE,
    from: `  const nowMinute = minuteFloor(Date.now());`,
    to: `  const nowMinute = Math.floor(Date.now() / 1000) * 1000;`,
  },
  {
    name: "round-UP-to-the-next-minute — a round opens on a price that does not exist yet",
    file: DURATIONS,
    from: `  return Math.floor(ms / MINUTE_MS) * MINUTE_MS;`,
    to: `  return Math.ceil(ms / MINUTE_MS) * MINUTE_MS;`,
  },
  {
    name: "align-to-seconds-not-minutes — isMinuteAligned accepts 21:27:37",
    file: DURATIONS,
    from: `  return Number.isFinite(ms) && ms % MINUTE_MS === 0;`,
    to: `  return Number.isFinite(ms) && ms % 1000 === 0;`,
  },
  {
    // ⚠️ Anchor updated 2026-08-04: the grid constant's doc comment became a block comment when
    // the epoch-lattice rule replaced the 5-minute rule. The defect is unchanged — ANY import in
    // this module makes it unreadable from a client component, which is how both admin consoles
    // came to hand-copy `[5, 15, 30]`.
    name: "an-import-creeps-into-the-shared-module — both consoles lose it again",
    file: DURATIONS,
    from: ` * The observation grid, in minutes.`,
    to: `import { randomUUID } from "node:crypto";\n * The observation grid, in minutes.`,
  },
];

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  if (!original.includes(m.from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(m.file, original.replace(m.from, m.to));
  try {
    // ⚠️ "the anchor is gone" is the WRONG post-check — a mutation that PREPENDS (the import
    // one below) legitimately leaves its anchor in place, and the harness aborted on a
    // perfectly applied edit. The property that actually matters is that the file CHANGED;
    // the CRLF trap this guards against is already caught by the `includes(m.from)` pre-check.
    if (readFileSync(m.file, "utf8") === original) throw new Error("mutation did not land on disk");
    let exitCode = 0, out = "";
    try {
      out = execSync("npx tsx scripts/updown-grid.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    const failed = Number(/(\d+) failed/.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/✗ (.+)/.exec(out)?.[1] ?? "").slice(0, 92)}`);
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
