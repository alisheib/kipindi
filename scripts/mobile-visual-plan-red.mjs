/**
 * RED CONTROL for `test:mobile-visual-plan` — proves the tracker guard can FAIL, rule by rule.
 *
 *   node scripts/mobile-visual-plan-red.mjs        (npm run red:mobile-visual-plan)
 *
 * The guard passes on a board whose rows are all ⬜, because none of its ✅ rules are exercised —
 * a green that proves nothing. This harness copies the plan into a temp tree, plants ONE breakage
 * at a time, runs the guard against the copy, and requires the matching rule to fire. It also runs
 * the untouched copy and requires a clean pass, so the harness itself cannot be the thing failing.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const planPath = join(repo, "docs", "MOBILE-VISUAL-PLAN.md");
const boardPath = join(repo, "docs", "NEXT-PLAN.md");
const plan = readFileSync(planPath, "utf8");
const board = readFileSync(boardPath, "utf8");

const realSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim().slice(0, 8);

/**
 * The unit row the plants work on: an UNFINISHED (⬜) one, preferably the first the NEXT line names — so every plant still
 * applies once units start turning ✅. (It used to be simply the first row; the moment U1 shipped, "mark it ✅" planted
 * nothing and the harness failed on its own premise, not on the guard — found on 2026-09-22 when U1 turned ✅.)
 */
const unitRows = plan.split(/\r?\n/).filter((l) => /^\|\s*U\d+\b/.test(l) && /\|\s*⬜\s*\|/.test(l));
const nextIds = (plan.match(/^\s*▶ NEXT:.*$/m)?.[0].match(/\bU\d+\b/g)) ?? [];
const unitRow = unitRows.find((l) => nextIds.includes((l.match(/^\|\s*(U\d+)/) || [])[1])) ?? unitRows[0];
if (!unitRow) { console.error("RED HARNESS BROKEN: no unit row found in the plan"); process.exit(2); }
const unitId = (unitRow.match(/^\|\s*(U\d+)/) || [])[1];
const cols = unitRow.split("|").length - 2;
const row = (status, commit, measured, guard, live) =>
  `| ${unitId} RED | — | ${status} | S1 | ${commit} | ${measured} | ${guard} | ${live} |${" |".repeat(Math.max(0, cols - 8))}`;

// a REGISTER row (§8): starts with a D-id, carries its owning unit as the last cell, and has the
// register's 4 columns — the §1 board also has D-rows ending in a unit id, and planting there proves nothing.
const defectRow = plan.split(/\r?\n/).find((l) =>
  /^\|\s*D\d+\b/.test(l) && /\|\s*U\d+\s*\|\s*$/.test(l) && l.split("|").length - 2 >= 4);

const plants = [
  { name: "✅ with no commit", expect: /names a commit that exists/,
    plan: (p) => p.replace(unitRow, `${unitRow}\n${row("✅", "", "347px → 300px", "yes", "2026-09-16")}`) },
  { name: "✅ with a commit that does not exist", expect: /names a commit that exists/,
    plan: (p) => p.replace(unitRow, `${unitRow}\n${row("✅", "deadbee", "347px → 300px", "yes", "2026-09-16")}`) },
  { name: "✅ with no measured before → after", expect: /records a measured before/,
    plan: (p) => p.replace(unitRow, `${unitRow}\n${row("✅", realSha, "", "yes", "2026-09-16")}`) },
  { name: "✅ without a RED-proven guard", expect: /guard was RED-proven/,
    plan: (p) => p.replace(unitRow, `${unitRow}\n${row("✅", realSha, "347px → 300px", "no", "2026-09-16")}`) },
  { name: "✅ with no live-verification date", expect: /live-verification date/,
    plan: (p) => p.replace(unitRow, `${unitRow}\n${row("✅", realSha, "347px → 300px", "yes", "")}`) },
  { name: "⬜ that claims a commit anyway", expect: /claims nothing/,
    plan: (p) => p.replace(unitRow, `${unitRow}\n${row("⬜", realSha, "347px → 300px", "yes", "2026-09-16")}`) },
  { name: "🔵 already carrying a live date", expect: /has no live date yet/,
    plan: (p) => p.replace(unitRow, `${unitRow}\n${row("🔵", realSha, "347px → 300px", "yes", "2026-09-16")}`) },
  { name: "a unit section with no board row", expect: /has a row on the board/,
    plan: (p) => p.replace("## §10 —", "**U999 · [General] Planted unit with no board row**\n- nothing\n\n## §10 —") },
  { name: "a defect owned by a unit that does not exist", expect: /names an owning unit that exists/,
    plan: (p) => {
      if (!defectRow) return p;
      const broken = defectRow.replace(/U\d+(?![\s\S]*U\d+)/, "U404"); // the LAST unit id in the row is the owner cell
      return broken === defectRow ? p : p.replace(defectRow, broken);
    } },
  { name: "a defect marked ✅ while its unit is not", expect: /only after its unit/,
    plan: (p) => {
      const owner = unitId;
      const anyDefectBoardRow = p.split(/\r?\n/).find((l) => /^\|\s*D\d+/.test(l) && /⬜|🟡|🔵|✅/.test(l) && !/`/.test(l));
      const planted = `| D999 RED | ✅ | ${owner} |`;
      return anyDefectBoardRow ? p.replace(anyDefectBoardRow, `${anyDefectBoardRow}\n${planted}`) : p;
    } },
  { name: "NEXT pointing at a finished unit", expect: /which is not finished/,
    plan: (p) => p.replace(unitRow, unitRow.replace(/\|\s*⬜\s*\|/, "| ✅ |").replace(/\|\s{2,}\|\s{2,}\|\s{2,}\|\s{2,}\|/, `| ${realSha} | 1 → 2 | yes | 2026-09-16 |`)) },
  { name: "board counts that disagree with NEXT-PLAN", expect: /unit total agrees|units done agree/,
    board: (b) => b.replace(/(\d+)\s*\/\s*(\d+)\s*units/i, "3/99 units") },
  { name: "a defect owned by two different units (§1 vs §8)", expect: /has one owner in §1 and §8/,
    plan: (p) => {
      if (!defectRow) return p;
      const id = (defectRow.match(/^\|\s*(D\d+)/) || [])[1];
      const boardRow = p.split(/\r?\n/).find((l) => new RegExp(`^\\|\\s*${id}\\s*\\|`).test(l) && l !== defectRow);
      return boardRow ? p.replace(boardRow, boardRow.replace(/U\d+/, "U999")) : p;
    } },
  { name: "a defect its owning unit never mentions", expect: /is named inside its owning unit/,
    plan: (p) => {
      if (!defectRow) return p;
      const id = (defectRow.match(/^\|\s*(D\d+)/) || [])[1];
      const owner = (defectRow.match(/U\d+(?![\s\S]*U\d+)/) || [])[0];
      const head = p.split(/\r?\n/).find((l) => new RegExp(`^\\*\\*${owner}\\s·`).test(l));
      if (!head) return p;
      const start = p.indexOf(head);
      const next = p.indexOf("\n**U", start + 5);
      const body = p.slice(start, next < 0 ? undefined : next);
      const stripped = body.split(new RegExp(`\\b${id}\\b`, "g")).join("Dxx");
      return stripped === body ? p : p.slice(0, start) + stripped + p.slice(next < 0 ? p.length : next);
    } },
  { name: "a registered defect with no row on the board", expect: /has a row on the §1 board/,
    plan: (p) => {
      if (!defectRow) return p;
      const id = (defectRow.match(/^\|\s*(D\d+)/) || [])[1];
      const boardRow = p.split(/\r?\n/).find((l) => new RegExp(`^\\|\\s*${id}\\s*\\|`).test(l) && l !== defectRow);
      return boardRow ? p.replace(`${boardRow}\n`, "") : p;
    } },
  { name: "a defect 🔵 shipped with no commit", expect: /names the commit that shipped it/,
    plan: (p) => {
      const boardRow = p.split(/\r?\n/).find((l) => /^\|\s*D\d+\s*\|\s*⬜\s*\|\s*U\d+\s*\|\s*$/.test(l));
      return boardRow ? p.replace(boardRow, boardRow.replace("⬜", "🔵 shipped")) : p;
    } },
  { name: "a defect ⬜ that claims a commit anyway", expect: /claims no commit/,
    plan: (p) => {
      const boardRow = p.split(/\r?\n/).find((l) => /^\|\s*D\d+\s*\|\s*⬜\s*\|\s*U\d+\s*\|\s*$/.test(l));
      return boardRow ? p.replace(boardRow, boardRow.replace("⬜", `⬜ ${realSha}`)) : p;
    } },
  { name: "a table row that renders outside its table", expect: /no table row sits outside a table/,
    plan: (p) => p.replace("## §10 —", "| orphan | row | with no header |\n| second | line | of the fragment |\n\n## §10 —") },
  { name: "a closure claim that is not earned", expect: /every unit is ✅|every defect is ✅|lenses carry measured scores|real-device unit is ✅/,
    plan: (p) => p.replace(/STATUS: [^\n]*/, "STATUS: 🏁 CLOSED — everything done") },
];

const dir = mkdtempSync(join(tmpdir(), "mvp-red-"));
mkdirSync(join(dir, "docs"), { recursive: true });
mkdirSync(join(dir, "scripts"), { recursive: true });
cpSync(join(repo, "scripts", "mobile-visual-plan.test.mts"), join(dir, "scripts", "mobile-visual-plan.test.mts"));
// the guard runs `git cat-file` in its own repo root; give the copy a .git by pointing at the real one.
// ⚠️ The COMMON git dir, not `<repo>/.git`: in a `git worktree` checkout that path is itself a pointer file, git does not
// follow a gitdir that points at another gitfile, and every commit then "did not exist" — so the untouched control run
// failed and the harness called itself invalid from any worktree (found 2026-09-22 in C:\kipindi-mobile-u1).
const gitCommon = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: repo, encoding: "utf8" }).trim();
writeFileSync(join(dir, ".git"), `gitdir: ${gitCommon.split("\\").join("/")}\n`);

const runGuard = (planText, boardText) => {
  writeFileSync(join(dir, "docs", "MOBILE-VISUAL-PLAN.md"), planText);
  writeFileSync(join(dir, "docs", "NEXT-PLAN.md"), boardText);
  const r = spawnSync("npx", ["tsx", join(dir, "scripts", "mobile-visual-plan.test.mts")], { cwd: dir, encoding: "utf8", shell: process.platform === "win32" });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
};

const control = runGuard(plan, board);
if (control.code !== 0) {
  console.log(control.out.split("\n").slice(-25).join("\n"));
  console.log("\nRED HARNESS INVALID: the guard already fails on the UNCHANGED plan, so no planted break proves anything.");
  process.exit(1);
}
console.log("control: guard passes on the unchanged plan ✅\n");

let caught = 0;
for (const p of plants) {
  const planted = runGuard(p.plan ? p.plan(plan) : plan, p.board ? p.board(board) : board);
  const changed = (p.plan ? p.plan(plan) !== plan : true) && (p.board ? p.board(board) !== board : true);
  if (!changed) { console.log(`PLANT DID NOT APPLY  ${p.name}`); continue; }
  const failed = planted.code === 1;
  const matched = p.expect.test(planted.out);
  const crashed = /SyntaxError|Cannot find module|TypeError/.test(planted.out);
  const good = failed && matched && !crashed;
  if (good) caught++;
  console.log(`${good ? "CAUGHT " : "MISSED "} ${p.name}${good ? "" : ` (exit ${planted.code}${crashed ? ", crashed" : ""}${matched ? "" : ", rule did not fire"})`}`);
}

console.log(`\nRED — ${caught}/${plants.length} planted breakages caught`);
process.exit(caught === plants.length ? 0 : 1);
