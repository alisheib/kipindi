/**
 * test:campaign-models — U35's guard (marketing campaigns' data model). COMMIT A (U35a, S10 2026-10-01): the
 * MARKETING purpose, alone in its own migration, in the schema and the store's union — and nobody writing it yet.
 * U35b adds the campaign tables' sections (§1.2–§1.11, §2) to this same file.
 *
 * ⭐ WHY A SUITE OF ITS OWN: `red:dal-parity` can never plant a defect in schema.prisma or a migration (it reads them
 * from ROOT, not KP_SRC), so a shape that lives in SQL needs an in-process suite that is HANDED the text and can be
 * handed a planted one.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION — `--prove-red` plants each defect in memory and requires the MATCHING assertion to
 * fail. This file writes nothing.
 *
 * Run:  npm run test:campaign-models
 * Red:  npm run red:campaign-models
 */
process.exitCode = 1;

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PROVE_RED = process.argv.includes("--prove-red");
const lf = (s: string) => s.replace(/\r\n/g, "\n");
/** SQL with its `--` comments and blank lines removed — what Postgres actually runs. */
const sqlStatements = (sql: string) => lf(sql).split("\n").filter((l) => !/^\s*--/.test(l) && l.trim() !== "").join("\n");

type Migration = { folder: string; sql: string };
function readMigrations(): Migration[] {
  const dir = join(ROOT, "prisma", "migrations");
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "migration.sql")))
    .map((e) => ({ folder: e.name, sql: readFileSync(join(dir, e.name, "migration.sql"), "utf8") }))
    .sort((a, b) => a.folder.localeCompare(b.folder));
}

/** Every src/ file's text, for the writer population (§3). */
function srcTexts(): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push({ path: p.slice(ROOT.length).replace(/\\/g, "/").replace(/^\//, ""), text: decomment(readFileSync(p, "utf8")) });
    }
  };
  walk(join(ROOT, "src"));
  return out;
}

/**
 * ⛔ THE FILES ALLOWED TO SEND WITH `purpose: "MARKETING"`. EMPTY until U37's test send (behind the closed
 * `marketing.sms.live` switch, DECISIONS X14) and U43's slice declare themselves here — a send under the new purpose
 * from anywhere else is a campaign path nobody reviewed.
 */
export const MARKETING_WRITERS: readonly string[] = [];

type World = { migrations: Migration[]; schema: string; store: string; src: Array<{ path: string; text: string }> };
const REAL: World = {
  migrations: readMigrations(),
  schema: lf(readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8")),
  store: decomment(lf(readFileSync(join(ROOT, "src", "lib", "server", "store.ts"), "utf8"))),
  src: srcTexts(),
};

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

const L = {
  s11: "1.1 ⛔ exactly ONE migration adds MARKETING to SmsPurpose, and that file holds NO other statement (55P04)",
  s18: "1.8 the schema's enum SmsPurpose and the store's SmsPurpose union are the same set, and both carry MARKETING",
  s31: "3.1 ⛔ no src file sends with purpose MARKETING unless it is a declared MARKETING_WRITER (none until U37/U43)",
};

function run(w: World, tag: string): void {
  const p = (s: string) => `${tag}${s}`;
  ok(p("0 · CONTROL · the migrations, the schema and the store were read"),
    w.migrations.length > 50 && w.schema.includes("enum SmsPurpose") && w.store.includes("export type SmsPurpose"), `${w.migrations.length} migrations`);

  // ── §1.1 · the ADD VALUE stands alone ──────────────────────────────────────────────────────
  const adds = w.migrations.filter((m) => /ALTER TYPE\s+"SmsPurpose"\s+ADD VALUE\s+(IF NOT EXISTS\s+)?'MARKETING'/.test(m.sql));
  const alone = adds.length === 1 && sqlStatements(adds[0].sql).trim().split(";").map((x) => x.trim()).filter(Boolean).length === 1;
  ok(p(L.s11), alone, adds.map((m) => m.folder).join(", ") || "none");

  // ── §1.8 · schema enum = store union, both with MARKETING ──────────────────────────────────
  const enumBody = (w.schema.match(/enum SmsPurpose \{([\s\S]*?)\}/) ?? ["", ""])[1];
  const enumValues = enumBody.split("\n").map((l) => l.trim()).filter((l) => /^[A-Z_]+$/.test(l)).sort();
  const unionText = (w.store.match(/export type SmsPurpose = ([^;]+);/) ?? ["", ""])[1];
  const unionValues = Array.from(unionText.matchAll(/"([A-Z_]+)"/g)).map((m) => m[1]).sort();
  ok(p(L.s18), enumValues.includes("MARKETING") && enumValues.join(",") === unionValues.join(","),
    `schema [${enumValues}] · store [${unionValues}]`);

  // ── §3.1 · the MARKETING writer population ─────────────────────────────────────────────────
  const writers = w.src.filter((f) => /purpose\s*:\s*["']MARKETING["']/.test(f.text)).map((f) => f.path);
  const undeclared = writers.filter((f) => !MARKETING_WRITERS.includes(f));
  ok(p(L.s31), undeclared.length === 0, undeclared.join(", ") || `${w.src.length} files scanned`);
}

if (!PROVE_RED) {
  run(REAL, "");
  console.log(`\ncampaign-models: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  run(REAL, "base:");
  if (fail) problems.push(`BASELINE red: ${failed.join(" | ")}`);
  const addFile = REAL.migrations.find((m) => /'MARKETING'/.test(m.sql) && /SmsPurpose/.test(m.sql));
  const CASES: Array<{ name: string; expect: string; world: World }> = [
    {
      name: "R3 · the ADD VALUE file also creates a table — Postgres refuses the new value in that transaction (55P04)",
      expect: L.s11,
      world: { ...REAL, migrations: REAL.migrations.map((m) => (m === addFile ? { ...m, sql: `${m.sql}\nCREATE TABLE "SmsCampaign" ("id" TEXT NOT NULL);\n` } : m)) },
    },
    {
      name: "the store's union forgets MARKETING — the schema and the code disagree on the lanes",
      expect: L.s18,
      world: { ...REAL, store: REAL.store.replace(/export type SmsPurpose = ([^;]+);/, 'export type SmsPurpose = "OTP" | "INVITE" | "OPS";') },
    },
    {
      name: "R14 · an undeclared file sends with purpose MARKETING",
      expect: L.s31,
      world: { ...REAL, src: [...REAL.src, { path: "src/lib/server/marketing/rogue.ts", text: 'await sendBatch([{ to, body, purpose: "MARKETING" }]);' }] },
    },
  ];
  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    run(c.world, tag);
    if (fail === 0) problems.push(`case ${i + 1} stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) { console.log("\nPROBLEMS:"); for (const x of problems) console.log(`  ✗ ${x}`); process.exitCode = 1; }
  else { console.log("RED PROOF COMPLETE"); process.exitCode = 0; }
}
