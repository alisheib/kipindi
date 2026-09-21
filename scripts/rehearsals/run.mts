/**
 * THE REHEARSAL RUNNER — the runnable home the S4 rehearsals never had.
 *
 *   npm run rehearse:list                  # print the register and every status. Runs nothing.
 *   npm run rehearse:audit-burst           # boot a scratch Postgres and run drill 4
 *   npm run rehearse:rollback              # …and drill 2, which is PARTIAL: its slices run, it exits 3
 *   npm run rehearse:all                   # run every BUILT drill; report every drill that is still owed
 *
 * ⛔ EXIT CODES ARE THE VERDICT, and 0 is the hardest one to earn.
 *   0 — every drill asked for ran and passed, and none of them is `not-built` or `partial`.
 *   1 — a drill ran and FAILED. ⛔ Including a `partial` drill that exited 0: a half-drill reporting a pass is a
 *       bug in that drill, and this runner refuses to launder it into a green row.
 *   2 — the runner was used wrongly (an unknown id, no id).
 *   3 — NOT MEASURED: a drill could not run here (no Postgres), or a drill in scope is still `not-built`, or a
 *       `partial` drill ran its slices and reported (as it must) that the rest of it was never taken.
 *
 * ⛔ `--all` DOES NOT GO GREEN WHILE A DRILL IS OWED. That is the whole point of giving the rehearsals a home: the
 * REL-0 row that names them must be able to fail. Two of the five are owed today (`rollback`, `two-admin-on`), so
 * `--all` exits 3 and prints both, by name, with what each waits on. When they are built it will exit 0 on its own,
 * and nobody has to remember to re-check a struck clause in a document.
 *
 * ⛔ IT PRINTS THE POPULATION. Every run ends with the whole register — five rows, each with its status — not just
 * the rows that happened to run. A sweep over zero passes, and a sweep whose population is invisible always looks
 * like a sweep over everything.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { REHEARSALS, byId, owed, type Rehearsal } from "./registry.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const wantList = argv.includes("--list");
const wantAll = argv.includes("--all");
const ids = argv.filter((a) => !a.startsWith("--"));

const PAD = Math.max(...REHEARSALS.map((r) => r.id.length));
const STATUS_MARK: Record<Rehearsal["status"], string> = {
  built: "BUILT",
  covered: "COVERED",
  moot: "MOOT",
  "not-built": "NOT BUILT",
  partial: "PARTIAL",
};

function printRegister(verdicts: Map<string, string>): void {
  console.log("\n── THE S4 REHEARSAL REGISTER (plans/house-bots/04-amendments.md §S4) ──────────────────────");
  for (const r of REHEARSALS) {
    const v = verdicts.get(r.id);
    console.log(`  ${String(r.drill)}. ${r.id.padEnd(PAD)}  ${STATUS_MARK[r.status].padEnd(9)}  ${v ?? ""}`);
    console.log(`     ${r.title}`);
    if (r.script) console.log(`     script: ${r.script}   needs: ${r.needs}`);
    if (r.where) console.log(`     where:  ${r.where}`);
    if (r.why) console.log(`     why:    ${r.why}`);
  }
  const counts = REHEARSALS.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
  console.log(
    `\n  POPULATION: ${REHEARSALS.length} drills — ` +
      Object.entries(counts).map(([k, n]) => `${n} ${STATUS_MARK[k as Rehearsal["status"]].toLowerCase()}`).join(", "),
  );
}

if (wantList) {
  printRegister(new Map());
  console.log("\n  Nothing was run (`--list`).\n");
  process.exit(0);
}

const selected: Rehearsal[] = wantAll ? [...REHEARSALS] : ids.map((id) => {
  const r = byId(id);
  if (!r) {
    console.error(`!! no rehearsal with id "${id}". Known ids: ${REHEARSALS.map((x) => x.id).join(", ")}`);
    process.exit(2);
  }
  return r;
});

if (selected.length === 0) {
  console.error("usage: rehearse <id> | --all | --list");
  console.error(`  ids: ${REHEARSALS.map((r) => r.id).join(", ")}`);
  process.exit(2);
}

const verdicts = new Map<string, string>();
let failed = 0;
let notMeasured = 0;

for (const r of selected) {
  if (r.status === "built" || r.status === "partial") {
    console.log(`\n══ rehearsal ${r.drill} · ${r.id} ══ ${r.script}`);
    const child = spawnSync("npx", ["tsx", r.script!], {
      cwd: ROOT, env: process.env, encoding: "utf8", stdio: "inherit",
      shell: process.platform === "win32", timeout: 30 * 60_000,
    });
    const code = child.status ?? 1;
    // ⛔ A `partial` drill that exits 0 is a BUG IN THAT DRILL, not a pass: its own contract is to exit 3 while
    // any of its steps is still un-taken. Reporting it as a failure here is what stops a half-drill quietly
    // becoming a green row after someone "fixes" its exit code.
    if (code === 0 && r.status === "partial") { verdicts.set(r.id, "FAIL (a partial drill must never exit 0)"); failed++; }
    else if (code === 0) verdicts.set(r.id, "PASS");
    else if (code === 3) { verdicts.set(r.id, "NOT MEASURED"); notMeasured++; }
    else { verdicts.set(r.id, `FAIL (exit ${code})`); failed++; }
  } else if (r.status === "not-built") {
    verdicts.set(r.id, "OWED — nothing drives it");
    notMeasured++;
  } else if (r.status === "covered") {
    verdicts.set(r.id, "not run here — see `where`");
  } else {
    verdicts.set(r.id, "not run — the condition no longer exists");
  }
}

printRegister(verdicts);

// ⛔ `partial` counts here too. A drill whose script ran and went green is STILL OWED while any of its steps
// could not be taken — that is the whole difference between this register and a checklist phrase.
const stillOwed = selected.filter((r) => r.status === "not-built" || r.status === "partial");
if (stillOwed.length > 0) {
  console.log(`\n⛔ ${stillOwed.length} of the ${owed().length} owed drill(s) are in scope, and nothing here discharged them:`);
  for (const r of stillOwed) console.log(`   · drill ${r.drill} ${r.id} [${r.status}] — ${r.why ?? "no reason recorded"}`);
}

if (failed > 0) {
  console.log(`\nFAILURES — ${failed} rehearsal(s) failed.\n`);
  process.exit(1);
}
if (notMeasured > 0) {
  console.log(`\nNOT MEASURED — ${notMeasured} rehearsal(s) could not be measured here. This is NOT a pass.\n`);
  process.exit(3);
}
console.log("\nALL PASS — every rehearsal in scope ran and passed.\n");
process.exit(0);
