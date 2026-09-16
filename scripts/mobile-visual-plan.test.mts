/**
 * THE MOBILE VISUAL PLAN'S TRACKER CANNOT LIE — the guard on `docs/MOBILE-VISUAL-PLAN.md`.
 *
 *   npx tsx scripts/mobile-visual-plan.test.mts        (npm run test:mobile-visual-plan)
 *
 * Ali, 2026-09-16: *"perfect tracking so when progress ends we know it really ended, tested."*
 * A programme that spans many sessions is trusted through its board: the next session reads §1,
 * believes it, and works from it. So every claim the board makes must be mechanically checkable:
 *
 * §1 · STATUS DISCIPLINE — a row may only claim what it can show.
 *      ✅ verified   → a commit SHA that EXISTS in this repo, a measured `before → after`, the
 *                      guard column `yes`, and a live-verification date (YYYY-MM-DD).
 *      🔵 shipped    → a commit SHA that exists; live column still empty (not yet re-measured).
 *      🟡 / ⏸        → free, but ⏸ must state a reason in Notes.
 *      ⬜ not started→ no commit, no measurement, no live date (an empty row cannot claim work).
 * §2 · EVERY UNIT IS ON THE BOARD AND HAS A SECTION, and every §9 unit heading has a board row.
 * §3 · EVERY DEFECT ROW names an owning unit that exists, and a defect may only be ✅ when its
 *      owning unit is ✅ (a defect cannot be fixed by a unit that has not shipped). A defect is
 *      registered once, tracked on the board, owned by the SAME unit in both places, and named
 *      inside that unit's §9 text — so the fix exists where the session doing the work will read it.
 * §4 · §0 "NEXT" MAY NOT POINT AT FINISHED WORK — the units it names must not be ✅.
 * §5 · THE BOARD COUNTS AGREE with `docs/NEXT-PLAN.md`'s programme row (units ✅ / defects ✅),
 *      because two doors that disagree send two sessions to different work.
 * §6 · CLOSURE IS EARNED, NOT DECLARED — the programme may only read 🏁 CLOSED when every unit
 *      and every defect is ✅, the seven-lens re-score row carries seven measured values, and the
 *      real-device row (U30) is ✅.
 * §7 · EVERY TABLE RENDERS — a row outside a table parses fine here and reads as broken to the
 *      human the board is written for.
 *
 * ⛔ WHAT IT DELIBERATELY DOES NOT DO. It cannot see whether a measurement is TRUE — only whether
 * it is present and internally consistent. `test:tracker-hygiene`'s own lesson applies: a guard
 * that fires on correct work teaches sessions to skip it, so nothing here demands a convention the
 * document does not already use. The live re-measure itself is proven by the driver in §11, not here.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PLAN = new URL("../docs/MOBILE-VISUAL-PLAN.md", import.meta.url);
const BOARD = new URL("../docs/NEXT-PLAN.md", import.meta.url);
const doc = readFileSync(PLAN, "utf8");
const board = readFileSync(BOARD, "utf8");

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

/** The lines of a section, from its heading to the next heading of the same or higher level. */
function section(startsWith: string): string[] {
  const lines = doc.split(/\r?\n/);
  const i = lines.findIndex((l) => l.startsWith(startsWith));
  if (i < 0) return [];
  const j = lines.findIndex((l, k) => k > i && /^## /.test(l));
  return lines.slice(i, j < 0 ? undefined : j);
}
const cells = (row: string) => row.split("|").slice(1, -1).map((c) => c.trim());
const isTableRow = (l: string) => /^\|/.test(l) && !/^\|\s*:?-{3,}/.test(l);

const SHA = /\b[0-9a-f]{7,40}\b/;
const DATE = /\b20\d{2}-\d{2}-\d{2}\b/;
const commitExists = (sha: string) => {
  try { execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: new URL("..", import.meta.url), stdio: "ignore" }); return true; }
  catch { return false; }
};

// ── §1 · unit rows ────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · STATUS DISCIPLINE");
const boardLines = section("## §1 —");
const unitRows = boardLines.filter((l) => isTableRow(l) && /^\|\s*U\d+\b/.test(l));
ok("§1 the units board has rows", unitRows.length > 0, "no row starting with a U-id");

const unitIds = new Set<string>();
for (const row of unitRows) {
  const c = cells(row);
  const id = (c[0].match(/^U\d+/) || ["?"])[0];
  unitIds.add(id);
  const status = c[2] ?? "";
  const commit = c[4] ?? "";
  const measured = c[5] ?? "";
  const guard = (c[6] ?? "").toLowerCase();
  const live = c[7] ?? "";
  const notes = c.slice(8).join(" ");
  const sha = (commit.match(SHA) || [""])[0];

  if (status.includes("✅")) {
    ok(`§1 ${id} ✅ names a commit that exists`, !!sha && commitExists(sha), `commit cell: "${commit}"`);
    ok(`§1 ${id} ✅ records a measured before → after`, /→/.test(measured) && measured.replace(/[→\s—-]/g, "").length > 0, `measured cell: "${measured}"`);
    ok(`§1 ${id} ✅ says its guard was RED-proven`, /^(yes|y|✅)/.test(guard), `guard cell: "${guard}"`);
    ok(`§1 ${id} ✅ carries a live-verification date`, DATE.test(live), `live cell: "${live}"`);
  } else if (status.includes("🔵")) {
    ok(`§1 ${id} 🔵 names a commit that exists`, !!sha && commitExists(sha), `commit cell: "${commit}"`);
    ok(`§1 ${id} 🔵 has no live date yet`, !DATE.test(live), `live cell: "${live}" — mark it ✅ instead`);
  } else if (status.includes("⏸")) {
    ok(`§1 ${id} ⏸ states a reason`, (notes + live).trim().length > 3, "blocked rows must say why");
  } else if (status.includes("⬜")) {
    ok(`§1 ${id} ⬜ claims nothing`, !SHA.test(commit) && !/→/.test(measured) && !DATE.test(live),
      `commit "${commit}" measured "${measured}" live "${live}"`);
  } else {
    ok(`§1 ${id} uses a legend status`, false, `status cell: "${status}"`);
  }
}

// ── §2 · units on the board match unit sections ───────────────────────────────────────────────
console.log("\n§2 · BOARD ↔ UNITS");
const unitsSection = section("## §9 —").join("\n");
const headingIds = new Set((unitsSection.match(/^\*\*U\d+\s·/gm) || []).map((h) => (h.match(/U\d+/) || [""])[0]));
for (const id of unitIds) ok(`§2 ${id} has a unit section in §9`, headingIds.has(id));
for (const id of headingIds) ok(`§2 ${id} has a row on the board`, unitIds.has(id));

// ── §3 · defects ──────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · DEFECTS");
const regRows = section("## §8 —").filter((l) => isTableRow(l) && /^\|\s*D\d+\b/.test(l));
ok("§3 the defect register has rows", regRows.length > 0);
const defectOwner = new Map<string, string>();
for (const row of regRows) {
  const c = cells(row);
  const id = (c[0].match(/^D\d+/) || ["?"])[0];
  const owner = (c[c.length - 1].match(/U\d+/) || [""])[0];
  defectOwner.set(id, owner);
  ok(`§3 ${id} names an owning unit that exists`, !!owner && unitIds.has(owner), `owner cell: "${c[c.length - 1]}"`);
}
const defectRows = boardLines.filter((l) => isTableRow(l) && /^\|\s*D\d+\b/.test(l));
const unitStatus = new Map<string, string>();
for (const row of unitRows) { const c = cells(row); unitStatus.set((c[0].match(/^U\d+/) || ["?"])[0], c[2] ?? ""); }
for (const row of defectRows) {
  const c = cells(row);
  const id = (c[0].match(/^D\d+/) || ["?"])[0];
  const status = c[1] ?? "";
  if (status.includes("✅")) {
    const owner = defectOwner.get(id) || "";
    ok(`§3 ${id} ✅ only after its unit ${owner || "?"} is ✅`, !!owner && (unitStatus.get(owner) || "").includes("✅"),
      `unit status: "${unitStatus.get(owner) || "unknown"}"`);
  }
}

// The §1 board and the §8 register each name an owner for every defect, and §9 is where the fix is
// actually written. Three documents, one fact: if they drift, a session reads one of them and works
// the wrong unit — or reads a unit that never mentions the defect and ships without fixing it.
// (Found by hand on 2026-09-16: D30/D35/D40 pointed at three different units across the three
// places, and D28/D33/D34 were owned by units whose text never mentioned them. Nothing caught it.)
const unitBody = new Map<string, string[]>();
{
  let cur = "";
  for (const l of section("## §9 —")) {
    const h = l.match(/^\*\*(U\d+)\s·/);
    if (h) { cur = h[1]; unitBody.set(cur, [l]); continue; }
    if (cur) unitBody.get(cur)!.push(l);
  }
}
const boardOwner = new Map<string, string>();
for (const row of defectRows) {
  const c = cells(row);
  const id = (c[0].match(/^D\d+/) || ["?"])[0];
  boardOwner.set(id, (c[c.length - 1].match(/U\d+/) || [""])[0]);
}
const regIds = regRows.map((r) => (cells(r)[0].match(/^D\d+/) || ["?"])[0]);
ok("§3 every defect is registered exactly once in §8", new Set(regIds).size === regIds.length,
  `duplicates: ${regIds.filter((id, i) => regIds.indexOf(id) !== i).join(", ")}`);
for (const id of new Set(regIds)) {
  ok(`§3 ${id} has a row on the §1 board`, boardOwner.has(id), "registered but not tracked");
  const reg = defectOwner.get(id) || "";
  const brd = boardOwner.get(id) || "";
  if (boardOwner.has(id)) ok(`§3 ${id} has one owner in §1 and §8`, reg === brd, `board says ${brd || "?"}, register says ${reg || "?"}`);
  const body = (unitBody.get(reg) || []).join("\n");
  ok(`§3 ${id} is named inside its owning unit ${reg || "?"}`, new RegExp(`\\b${id}\\b`).test(body),
    `${reg || "?"} never mentions ${id} — its fix is not written anywhere`);
}
for (const id of boardOwner.keys()) ok(`§3 ${id} on the board is in the §8 register`, regIds.includes(id), "tracked but never described");

// ── §4 · NEXT does not point at finished work ────────────────────────────────────────────────
console.log("\n§4 · RESUME AT");
const resume = section("## §0 —").join("\n");
const nextLine = (resume.match(/^\s*▶ NEXT:.*$/m) || [""])[0];
ok("§4 §0 has a ▶ NEXT line", nextLine.trim().length > 0);
for (const id of new Set((nextLine.match(/U\d+/g) || []))) {
  ok(`§4 NEXT names ${id}, which is not finished`, !(unitStatus.get(id) || "").includes("✅"), `status: "${unitStatus.get(id)}"`);
}

// ── §5 · the two doors agree ─────────────────────────────────────────────────────────────────
console.log("\n§5 · BOARD COUNTS AGREE WITH NEXT-PLAN");
const unitsDone = [...unitStatus.values()].filter((s) => s.includes("✅")).length;
const defectsDone = defectRows.filter((r) => (cells(r)[1] ?? "").includes("✅")).length;
const rowMatch = board.match(/MOBILE-VISUAL[\s\S]{0,400}?(\d+)\s*\/\s*(\d+)\s*units[^\d]{0,20}(\d+)\s*\/\s*(\d+)\s*defects/i);
ok("§5 NEXT-PLAN carries the programme counts", !!rowMatch, "no 'X/N units … Y/M defects' row found");
if (rowMatch) {
  const [, uDone, uTotal, dDone, dTotal] = rowMatch.map(Number);
  ok("§5 units done agree", uDone === unitsDone, `NEXT-PLAN ${uDone} vs plan ${unitsDone}`);
  ok("§5 unit total agrees", uTotal === unitRows.length, `NEXT-PLAN ${uTotal} vs plan ${unitRows.length}`);
  ok("§5 defects done agree", dDone === defectsDone, `NEXT-PLAN ${dDone} vs plan ${defectsDone}`);
  ok("§5 defect total agrees", dTotal === regRows.length, `NEXT-PLAN ${dTotal} vs plan ${regRows.length}`);
}

// ── §6 · closure is earned ───────────────────────────────────────────────────────────────────
console.log("\n§6 · CLOSURE");
const claimsClosed = /🏁\s*CLOSED/.test(doc.split(/\r?\n/).slice(0, 40).join("\n"));
if (claimsClosed) {
  ok("§6 every unit is ✅", unitsDone === unitRows.length, `${unitsDone}/${unitRows.length}`);
  ok("§6 every defect is ✅", defectsDone === regRows.length, `${defectsDone}/${regRows.length}`);
  const lensRow = boardLines.find((l) => isTableRow(l) && /Measured at Seal/i.test(l)) || "";
  const lensValues = cells(lensRow).slice(1).filter((v) => /\d/.test(v));
  ok("§6 the seven lenses carry measured scores", lensValues.length === 7, `found ${lensValues.length}: "${lensRow}"`);
  ok("§6 the real-device unit is ✅", [...unitStatus.entries()].some(([id, s]) => id === "U30" && s.includes("✅")));
} else {
  ok("§6 the programme does not claim closure yet", true);
}

// ── §7 · every table renders ─────────────────────────────────────────────────────────────────
// This guard reads the board line by line, so a table with no header separator still parses here
// while rendering to a human as a wall of pipes — the board would look broken to the one audience
// it exists for. A markdown table is a run of `|` lines whose SECOND line is the `|---|` separator;
// anything else (an orphan row, a headerless fragment appended below a list) is plain text.
console.log("\n§7 · TABLES RENDER");
{
  const lines = doc.split(/\r?\n/);
  const isLine = (l: string | undefined) => /^\s*\|/.test(l || "");
  const isSep = (l: string | undefined) => /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(l || "");
  let fenced = false;
  const orphans: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fenced = !fenced; continue; }
    if (fenced || !isLine(lines[i]) || isLine(lines[i - 1])) continue; // only the first line of a block
    let end = i;
    while (isLine(lines[end + 1])) end++;
    if (end === i || !isSep(lines[i + 1])) orphans.push(`line ${i + 1}: ${lines[i].trim().slice(0, 60)}`);
    i = end;
  }
  ok("§7 no table row sits outside a table", orphans.length === 0, orphans.join(" · "));
}

console.log(`\nMOBILE VISUAL PLAN TRACKER — ${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
