// DIAGNOSTIC ONLY (scratchpad) — a faithful copy of §2 of scripts/house-bot-holder-lifecycle.test.mts that lists WHICH
// scripts are in the "writes an account fact" population, WHY each is (the matching line), and whether it is declared.
// Usage (from the worktree root):  npx tsx <this file> [rootDir]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.argv[2] || "F:/kipindi-rot2";
const { decomment } = await import(pathToFileURL(join(ROOT, "scripts/lib/decomment.mts")).href);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git" || entry === ".pgscratch") continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts|mjs)$/.test(entry)) out.push(p);
  }
  return out;
}
const SCRIPTS = walk(join(ROOT, "scripts")).map((p) => relative(ROOT, p).replace(/\\/g, "/"));

const WRITTEN_FIELDS = ["passwordHash", "role", "status", "phoneE164", "twoFactorEnabled", "email", "closedAt"] as const;
const USER_WRITE = /db\.user\.update\(/;
const OTHER_WRITERS: Array<{ re: RegExp; what: string }> = [
  { re: /db\.responsible\.upsert\(/, what: "a responsible-gambling row" },
  { re: /queue\.push\(r\);/, what: "a data-rights request" },
  { re: /db\.wallet\.update\([^)]*freezeReasons/, what: "a wallet hold" },
];
const HOOK = /onHolderAccountChanged\(/;
function writersIn(file: string, code: string) {
  const lines = code.split(/\r?\n/);
  const out: Array<{ line: number; text: string; why: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stmt = lines.slice(i, Math.min(lines.length, i + 8)).join("\n");
    let why = "";
    if (USER_WRITE.test(line)) {
      const field = WRITTEN_FIELDS.find((f) => new RegExp(`\\b${f}\\b`).test(stmt.split(/\)\s*;/)[0] ?? stmt));
      if (field) why = `db.user.update with ${field}`;
    }
    if (!why) {
      const other = OTHER_WRITERS.find((w) => w.re.test(line));
      if (other) why = other.what;
    }
    if (!why) continue;
    out.push({ line: i + 1, text: line.trim().slice(0, 110), why });
  }
  return out;
}
void HOOK;

const SQL_FIELD = /"passwordHash"|'passwordHash'|passwordHash\s*=/;
const COVERED = /house-bot: covered by L2 sweep/;
const rows: Array<{ file: string; declared: boolean; viaSuiteName: boolean; viaComment: boolean; evidence: string[] }> = [];
for (const f of SCRIPTS) {
  const raw = readFileSync(join(ROOT, f), "utf8");
  const code = decomment(raw);
  const evidence: string[] = [];
  if (SQL_FIELD.test(code)) {
    const cl = code.split(/\r?\n/);
    cl.forEach((l, i) => { if (SQL_FIELD.test(l)) evidence.push(`SQL_FIELD @${i + 1}: ${l.trim().slice(0, 110)}`); });
  }
  for (const w of writersIn(f, code)) evidence.push(`${w.why} @${w.line}: ${w.text}`);
  if (!evidence.length) continue;
  const viaSuiteName = /\.test\.mts$|-cases\.mts$|\.test\.mjs$/.test(f);
  const viaComment = COVERED.test(raw);
  rows.push({ file: f, declared: viaComment || viaSuiteName, viaSuiteName, viaComment, evidence });
}
console.log(`population: ${rows.length}  (ceiling 25)  undeclared: ${rows.filter((r) => !r.declared).length}`);
for (const r of rows) {
  console.log(`\n${r.declared ? "  " : "!!"} ${r.file}   [${r.viaComment ? "comment" : ""}${r.viaSuiteName ? "suite-name" : ""}${!r.declared ? "UNDECLARED" : ""}]`);
  for (const e of r.evidence.slice(0, 4)) console.log(`       ${e}`);
  if (r.evidence.length > 4) console.log(`       … +${r.evidence.length - 4} more`);
}
