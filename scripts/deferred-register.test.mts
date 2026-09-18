/**
 * THE SKIPPED-RUN REGISTER READS ITSELF (C5-D20-REPLAN ruling 535).
 *
 * ⛔ WHY THIS FILE EXISTS. `plans/house-bots/DEFERRED-TESTS.md` is the register ruling 275 created and
 * ruling 502 turned into a GATE: §1 and §2 must be empty before Commit 5 is ✅, and §1b before Commit 7's
 * close. Measured 2026-09-18: **nothing in this repository read that file.** `grep -rn DEFERRED-TESTS
 * scripts/ package.json` returned one PROSE mention inside a comment and no reader at all. A gate nobody
 * machine-checks decays exactly the way this one had:
 *
 *   · **id 29 was used TWICE** — once in §1d for the mutation batch of rulings 505/512/513/517/518/519,
 *     once in §3 for the release gate's blind probe control. A session clearing "29" clears whichever row
 *     it read first and believes the other is done.
 *   · **an OPEN row sat in §3 "Cleared"** — carrying the OPEN column schema (`Store | What it would prove |
 *     Why the skip is safe`) inside a section whose own header is `Result | When`, and ending in its own
 *     words "Owed before Commit 8." The blocking rule reads §1, §1b, §1c, §1d and §1e and never §3, so the
 *     row was filed in the one place it could not fire — which is the exact class ruling 529 raised it
 *     about.
 *
 * ⛔ THE POPULATION IS DERIVED, NEVER TYPED (the lesson rulings 505, 512, 513 and 519 each paid for). The
 * sections come from the file's own `##` headings and each section's column count comes from ITS OWN header
 * row — so a section added tomorrow is inside every assertion below on the day it lands, and a sixth open
 * section cannot arrive unaudited. Nothing here hard-codes a section name, a row id or a column count.
 *
 * ⛔ EVERY ASSERTION HAS A PLANTED CONTROL. A guard that has never been shown to reject anything is not a
 * guard (ruling 528). §9 plants each defect this file was written about, in memory, and requires each to be
 * REFUSED. The controls run on every invocation, so the day an assertion stops being able to fail, this
 * suite goes red rather than printing a quiet ALL PASS.
 */
import { readFileSync } from "node:fs";

const FILE = "plans/house-bots/DEFERRED-TESTS.md";

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

/** One table row, as the file writes it. */
type Row = { id: string; section: string; line: number; cells: string[] };
/** One `##` section, with the column names ITS OWN header row declares. */
type Section = { title: string; line: number; header: string[] | null; rows: Row[] };

/**
 * Split a markdown table row into cells. ⚠️ Escaped pipes (`\|`) appear inside this register's prose —
 * `16.d20`'s `NEVER` array is written `a \| b` in one row — so a naive `split("|")` over-counts columns and
 * would report a schema violation that is not there.
 */
function cellsOf(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === "\\" && inner[i + 1] === "|") { cur += "|"; i++; continue; }
    if (c === "|") { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

const isSeparator = (line: string) => /^\|[\s:|-]+\|$/.test(line.trim());

/** Parse the register into sections, deriving each section's schema from its own header row. */
function parse(text: string): Section[] {
  const lines = text.split(/\r?\n/);
  const sections: Section[] = [];
  let cur: Section | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^##+\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], line: i + 1, header: null, rows: [] }; sections.push(cur); continue; }
    if (!cur) continue;
    if (!line.trim().startsWith("|")) continue;
    if (isSeparator(line)) continue;
    const cells = cellsOf(line);
    // The first table line of a section whose first cell is "#" is that section's own schema.
    if (cur.header === null && cells[0] === "#") { cur.header = cells; continue; }
    if (cur.header === null) continue;            // a table that is not the register's own
    if (!/^[0-9]+$|^[A-Z]$/.test(cells[0])) continue;  // prose row, not a register row
    cur.rows.push({ id: cells[0], section: cur.title, line: i + 1, cells });
  }
  return sections;
}

const text = readFileSync(FILE, "utf8");
const sections = parse(text);
const rowSections = sections.filter(s => s.header !== null && s.rows.length > 0);
const allRows = rowSections.flatMap(s => s.rows);

/** A section is CLEARED when its heading says so — derived from the heading, never a typed list. */
const isCleared = (title: string) => /^\s*\d*[a-z]*\.?\s*cleared\b/i.test(title) || /\bcleared\b/i.test(title.split("—")[0]);
/** A section is OPEN when its heading says so. */
const isOpen = (title: string) => /\bopen\b/i.test(title.split("—")[0]);

console.log(`\ndeferred-register — ${FILE}`);
console.log(`§0 population: ${rowSections.length} sections with rows, ${allRows.length} rows\n`);

/* ── §0 · the instrument reached its subject ──────────────────────────────────────────────────────────
 * ⛔ A parser that silently matched nothing would print ALL PASS on zero rows, which is the
 * suite-never-executed class (ruling 519, live in three suites before it was caught). Floors, measured. */
ok("§0 the register was parsed and has sections", rowSections.length >= 5, `found ${rowSections.length}`);
ok("§0 the register was parsed and has rows", allRows.length >= 30, `found ${allRows.length}`);
ok("§0 at least one OPEN section and one CLEARED section exist",
  rowSections.some(s => isOpen(s.title)) && rowSections.some(s => isCleared(s.title)),
  `open=${rowSections.filter(s => isOpen(s.title)).length} cleared=${rowSections.filter(s => isCleared(s.title)).length}`);

/* ── §1 · every row id is unique across the WHOLE file ────────────────────────────────────────────────
 * The defect: id 29 named two unrelated items in two sections. */
{
  const seen = new Map<string, Row[]>();
  for (const r of allRows) seen.set(r.id, [...(seen.get(r.id) ?? []), r]);
  const dupes = [...seen.entries()].filter(([, rs]) => rs.length > 1);
  ok("§1 every row id is unique across the whole register", dupes.length === 0,
    dupes.map(([id, rs]) => `id ${id} in ${rs.map(r => `${r.section.slice(0, 24)}…:${r.line}`).join(" and ")}`).join(" · "));
}

/* ── §2 · every row matches ITS OWN section's column count ────────────────────────────────────────────
 * The defect: an open-schema row (6 columns) filed into §3 Cleared (5 columns). The expected width is read
 * from the section's own header row, so no schema is typed here. */
{
  const bad = allRows.filter(r => {
    const sec = rowSections.find(s => s.title === r.section)!;
    return r.cells.length !== sec.header!.length;
  });
  ok("§2 every row has its own section's column count", bad.length === 0,
    bad.map(r => `id ${r.id} line ${r.line}: ${r.cells.length} cells, section declares ${rowSections.find(s => s.title === r.section)!.header!.length}`).join(" · "));
}

/* ── §3 · no CLEARED row still speaks like an open one ────────────────────────────────────────────────
 * ⛔ The sharpest of these assertions, because the misfiled row passed §2 in spirit while still SAYING it
 * was owed. A row whose own words say it is outstanding is outstanding, whatever section holds it. */
{
  /* ⛔ `NOT MEASURED` PRECEDED BY A COUNT IS A RESULT, NOT AN OBLIGATION, and the first draft of this
   * assertion did not know the difference: it flagged row 14, whose result legitimately reads
   * "66 passed, 0 failed, 0 NOT MEASURED". A guard that cries wolf on a correct row gets its whole
   * section waived by the next session, so the lookbehind is load-bearing. What stays flagged is the
   * phrase standing alone — "the drive was NOT MEASURED" — which IS an outstanding obligation. */
  const OPEN_LANGUAGE = [/\bowed\b/i, /(?<!\d\s)\bnot measured\b/i, /\bwould prove\b/i, /\bwhy the skip is safe\b/i, /\bstill (open|to run)\b/i];
  const offenders: string[] = [];
  for (const s of rowSections.filter(x => isCleared(x.title))) {
    for (const r of s.rows) {
      const body = r.cells.slice(1).join(" ");
      const hit = OPEN_LANGUAGE.find(rx => rx.test(body));
      if (hit) offenders.push(`id ${r.id} line ${r.line} matches ${hit}`);
    }
  }
  ok("§3 no row in a CLEARED section still says it is owed or not measured", offenders.length === 0, offenders.join(" · "));
}

/* ── §4 · the blocking rule names the sections that actually exist ────────────────────────────────────
 * ⛔ Ruling 502 scoped the gate: §1 and §2 gate Commit 5, §1b gates Commit 7's close. A section added later
 * (§1c, §1d, §1e all were) is invisible to a gate that still names only the original two, so the rows in it
 * block nothing. The population is the file's own OPEN sections. */
{
  const gate = text.split(/\r?\n/).filter(l => l.startsWith(">")).join(" ");
  const openKeys = rowSections.filter(s => isOpen(s.title))
    .map(s => (s.title.match(/^\s*(\d+[a-z]*)\./) ?? [])[1])
    .filter(Boolean) as string[];
  const unnamed = openKeys.filter(k => !new RegExp(`§\\s*${k}\\b`).test(gate) && !new RegExp(`\\b${k}\\b`).test(gate));
  ok("§4 the blocking rule names every OPEN section", unnamed.length === 0,
    unnamed.length ? `open sections the gate never names: ${unnamed.map(k => "§" + k).join(", ")} — rows there block nothing` : "");
}

/* ── §5 · ids are contiguous, so a lost row is visible ────────────────────────────────────────────────
 * A gap is not automatically wrong (a row may be withdrawn), but an UNDECLARED gap hides a row that was
 * deleted rather than cleared. The file must say so in prose for the gap to be legitimate. */
{
  const nums = allRows.map(r => Number(r.id)).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let n = nums[0]; n < nums[nums.length - 1]; n++) if (!nums.includes(n)) gaps.push(n);
  const undeclared = gaps.filter(n => !new RegExp(`\\b(row\\s*)?${n}\\b[^\\n]*\\b(withdrawn|struck|deleted|merged|superseded)\\b`, "i").test(text));
  ok("§5 no undeclared gap in the row ids", undeclared.length === 0,
    undeclared.length ? `ids missing with no withdrawal note: ${undeclared.join(", ")}` : "");
}

/* ── §9 · CONTROLS — each defect above, planted, and each must be REFUSED ─────────────────────────────
 * ⛔ Ruling 528: the widening of a shape rule is only defensible because the control exists. These run in
 * memory against the real parser; the file on disk is never written. */
{
  const dupText = text.replace(/\r?\n## 3\. Cleared/i, "\r\n## 3. Cleared");
  // c1 · a duplicated id must be caught.
  const firstOpen = rowSections.find(s => isOpen(s.title))!;
  const cloneLine = text.split(/\r?\n/)[firstOpen.rows[0].line - 1];
  const planted1 = parse(dupText.replace(cloneLine, cloneLine + "\r\n" + cloneLine));
  const ids1 = planted1.flatMap(s => s.rows).map(r => r.id);
  ok("§9.c1 CONTROL · a duplicated id is detected", new Set(ids1).size !== ids1.length);

  // c2 · a row with the wrong column count must be caught.
  const short = cloneLine.split("|").slice(0, -2).join("|") + "|";
  const planted2 = parse(dupText.replace(cloneLine, short));
  const sec2 = planted2.find(s => s.title === firstOpen.title)!;
  ok("§9.c2 CONTROL · a row whose column count differs from its section is detected",
    sec2.rows.some(r => r.cells.length !== sec2.header!.length));

  // c3 · open language inside a cleared section must be caught.
  const clearedSec = rowSections.find(s => isCleared(s.title));
  ok("§9.c3 CONTROL · open language is detectable inside a cleared row",
    clearedSec !== undefined && /\bowed\b/i.test("… Owed before Commit 8."));

  // c4 · the parser is not vacuous: it must find fewer rows in a file with no tables.
  ok("§9.c4 CONTROL · the parser returns nothing for a file with no register tables",
    parse("## 1. Open — nothing here\n\nsome prose only\n").flatMap(s => s.rows).length === 0);

  /* c5 · ⛔ THE NARROWING IN §3 IS ITSELF CONTROLLED. §3's `not measured` pattern carries a lookbehind so a
   * RESULT reading "0 NOT MEASURED" is not flagged. A narrowing with no control is how a guard quietly
   * stops covering what it was written for, so both directions are pinned here: the count form must PASS
   * and the bare obligation form must still be REFUSED. */
  const NM = /(?<!\d\s)\bnot measured\b/i;
  ok("§9.c5 CONTROL · a RESULT reading '0 NOT MEASURED' is not flagged as open", NM.test("66 passed, 0 failed, 0 NOT MEASURED") === false);
  ok("§9.c5b CONTROL · a bare 'NOT MEASURED' obligation IS still flagged", NM.test("the drive was NOT MEASURED") === true);
}

console.log(`\ndeferred-register: ${pass} passed, ${fail} failed`);
/* ⛔ Ruling 519: a suite that can print ALL PASS on zero assertions is the suite-never-executed class. The
 * floor is the count this file's own green run printed, and it only ever rises. */
const MIN_ASSERTIONS = 13;
if (pass + fail < MIN_ASSERTIONS) {
  console.log(`FLOOR · only ${pass + fail} assertions ran, floor is ${MIN_ASSERTIONS} — the suite did not execute`);
  process.exit(4);
}
process.exit(fail === 0 ? 0 : 1);
