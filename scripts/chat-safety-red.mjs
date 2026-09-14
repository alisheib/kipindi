/**
 * RED harness for `npm run test:chat-safety` (SUPPORT & CARE Unit 6).
 *
 *   node scripts/chat-safety-red.mjs
 *
 * ⛔ IT DOES NOT WRITE TO src/. Every mutation goes to a COPY of the corpus in the
 * OS temp dir and the gate is aimed at it with `CHAT_SAFETY_ROOT`; the gate prints
 * the root it read on every run, and the tree is asserted unchanged at the end.
 *
 * "It exited non-zero" is not evidence — each run must name the CHECK that failed,
 * or a typo in this file would score as a caught defect.
 *
 * ⚠️ §2 IS NOT MUTATED HERE AND CANNOT BE. It imports the product directly, so it
 * always reads the real tree whatever `CHAT_SAFETY_ROOT` says. §2's red proof is
 * the recorded pre-fix run instead: against HEAD 140fcc6a it failed 2.2 on all five
 * Chinese phrases, on two Swahili ones, on 2.3 (a Swahili sentence detected as
 * English), and on 2.6 for all three locales of the platform's own FAQ question.
 * ⭐ That is a stronger proof than a mutation would have been — it is the guard
 * going red against the real, unfixed product rather than against a planted defect.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, globSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FILES = [
  ...globSync("src/**/*.tsx", { cwd }),
  ...globSync("src/**/*.ts", { cwd }),
].map((f) => f.replace(/\\/g, "/"));
const ORIGINAL = new Map(FILES.map((f) => [f, readFileSync(join(cwd, f), "utf8")]));

// ⛔ THE MUTATIONS LIVE IN A SIDECAR (2026-09-14), so `test:red-anchors` §3 re-resolves every one without running this.
import { MUTATIONS } from "./anchors/chat-safety.anchors.mjs";

const lf = (s) => s.replace(/\r\n/g, "\n");
let caught = 0;
const missed = [];

for (const [i, m] of MUTATIONS.entries()) {
  const base = lf(ORIGINAL.get(m.file) ?? "");
  if (!base.includes(lf(m.from))) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND in ${m.file} — the harness is broken, not the gate.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  const root = mkdtempSync(join(tmpdir(), `chat-safety-red-${i}-`));
  for (const f of FILES) {
    mkdirSync(join(root, dirname(f)), { recursive: true });
    cpSync(join(cwd, f), join(root, f));
  }
  const mutated = base.replace(lf(m.from), lf(m.to));
  if (mutated === base) {
    console.log(`  ✗ ${m.name}\n      ⛔ MUTATION IS A NO-OP — the harness is broken, not the gate.`);
    missed.push(`${m.name} (no-op)`);
    continue;
  }
  writeFileSync(join(root, m.file), mutated);

  let exitCode = 0, out = "";
  try {
    out = execSync("npx tsx scripts/chat-safety.test.mts", {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CHAT_SAFETY_ROOT: root },
    });
  } catch (e) {
    exitCode = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  const failedCheck = new RegExp(`^\\s*FAIL ${m.check.replace(".", "\\.")} `, "m").test(out);
  const readTheCopy = out.includes(root);
  const ok = exitCode !== 0 && readTheCopy && failedCheck;

  if (ok) {
    caught++;
    const line = out.split("\n").find((l) => l.trim().startsWith(`FAIL ${m.check}`)) ?? "";
    console.log(`  ✓ RED  ${m.name}\n         → ${line.trim().slice(0, 130)}`);
  } else {
    missed.push(m.name);
    const why = !readTheCopy
      ? "the gate did NOT read the mutated copy — CHAT_SAFETY_ROOT was ignored"
      : exitCode === 0
        ? "the gate PASSED over a corpus that breaks it"
        : `exit ${exitCode}, but check ${m.check} was not the one that failed`;
    console.log(`  ✗ MISS ${m.name}\n         → ${why}`);
  }
}

for (const [f, text] of ORIGINAL) {
  if (readFileSync(join(cwd, f), "utf8") !== text) {
    console.log(`\n⛔ ${f} CHANGED. This harness must never write to the working tree.`);
    process.exit(1);
  }
}

console.log(`\nRED HARNESS (chat-safety) — ${caught}/${MUTATIONS.length} caught · src/ untouched`);
if (missed.length) {
  for (const m of missed) console.log(`  · ${m}`);
  process.exit(1);
}
