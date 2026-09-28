/**
 * test:migration-ownership — ONE LANE'S MIGRATION MAY NOT SILENTLY DROP ANOTHER LANE'S OBJECTS.
 *
 * 🔴 WHY IT EXISTS. `20260925120000_marketing_consent_suppression` (marketing U6) was generated with
 * `prisma migrate diff` against a database holding objects `schema.prisma` does not declare, and the
 * diff swept every one of them in: F-05's four retired tables, three columns and three enums,
 * AGENT-PROGRAMME's `AffiliateAgent.tier`, and the eight trigram search indexes of
 * `20260728030000_search_trgm_small_tables` — raw SQL the schema cannot express. Production applied
 * it on 2026-09-25. Nothing in the repo compared a migration's DROPs with who CREATED the object, so
 * a feature migration deleted two other programmes' work and every gate stayed green. The indexes are
 * restored by `20260926120000_restore_search_trgm_indexes`, and ⛔ the next `migrate diff` will emit
 * the same eight DROPs again — this is what stops them shipping.
 *
 * THE RULE. Every migration is read in folder order into a registry of which migration CREATED each
 * table, column, index, constraint, type and extension. A migration that DROPS (or renames away) an
 * object an EARLIER migration created must declare it in its own header:
 *
 *     -- @drops index:PredictionMarket_titleEn_trgm_idx · owner docs/SOME-LANE.md
 *
 * and the owner document must exist and name BOTH the object and this migration's folder — so the
 * drop is tied to the owning lane's written authority, not to whoever ran the diff. Objects created
 * and dropped in the same file are its own business. Attribute changes (DROP DEFAULT / NOT NULL) are
 * out of scope. Migrations that shipped before the rule are GRANDFATHERED, each pinned by content
 * (an applied migration is never edited), in a size-pinned list that may only shrink.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: `--prove-red` plants every defect IN MEMORY. This file makes no
 * file-writing call of any kind, so it stays outside `test:red-anchors` §4's undeclared count and it
 * can never leave a migration edited on disk.
 *
 * Run:  npm run test:migration-ownership        Red:  npm run red:migration-ownership
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

process.exitCode = 1;
const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIG_DIR = join(ROOT, "prisma", "migrations");

type Mig = { name: string; raw: string };
type World = {
  migs: Mig[];
  grandfather: Record<string, string>;
  grandfatherSize: number;
  docText: (path: string) => string | null;
};

const lf = (s: string) => s.replace(/\r\n/g, "\n");
const sha16 = (raw: string) => createHash("sha256").update(lf(raw)).digest("hex").slice(0, 16);

/* ══ GRANDFATHERED — shipped before the rule; each pinned by its LF-normalised content ═══════════════
 * Measured 2026-09-26 against the real tree. ⛔ May only SHRINK, and a pin is a LITERAL: a hash read back
 * from the file it pins could never catch that file being edited. The last row is U6 — the reason
 * this guard exists. */
const GRANDFATHER: Record<string, string> = {
  "20260610130000_drop_txn_bet_fk": "f2678aa3ec359b18",
  "20260614190000_audit_chain_persist": "8e7f6fa21beb1676",
  "20260615180000_drop_email_unique": "9428bd88e78afae8",
  "20260626220000_bonus_sourceref_unique": "242f5cf219521581",
  "20260702120000_rename_betid_to_positionid": "92ce1479fda9158b",
  "20260702130000_drop_legacy_sports_models": "1cf3c9bdbff88c1c",
  "20260702150000_drop_store_snapshot": "e7b18b88966a8629",
  "20260821090000_kyc_drop_nida_legacy": "1dc34ce78d0f8671",
  "20260913120000_kyc_at_withdrawal": "3f03069239a84c0c",
  "20260925120000_marketing_consent_suppression": "cd0bc6b44baceebb",
};
const GRANDFATHER_SIZE = 10;

/* ══ THE PARSER ═══════════════════════════════════════════════════════════════════════════════════════ */
/** Comments out — both `--` and block comments — so prose naming a DROP is never read as one. */
const stripSql = (sql: string) => lf(sql).replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
/** An identifier: quoted or bare, with an optional schema prefix (`"public".` or `public.`). */
const ID = String.raw`(?:"?public"?\.)?(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))`;
const idOf = (m: RegExpMatchArray | RegExpExecArray, i: number) => m[i] ?? m[i + 1];

type Obj = string; // "table:T" · "column:T.c" · "index:n" · "constraint:n" · "type:n" · "extension:n"
type Parsed = { creates: Array<{ key: Obj; on?: string }>; drops: Obj[] };

export function parseMigration(raw: string): Parsed {
  const sql = stripSql(raw);
  const creates: Parsed["creates"] = [];
  const drops: Obj[] = [];
  const stmts = sql.split(";");
  for (const s of stmts) {
    let m: RegExpExecArray | null;
    // ── CREATE TABLE "T" ( cols…, CONSTRAINT "k" … )
    const ct = new RegExp(String.raw`CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?${ID}\s*\(([\s\S]*)\)`, "i").exec(s);
    if (ct) {
      const t = idOf(ct, 1);
      creates.push({ key: `table:${t}` });
      for (const line of ct[3].split("\n")) {
        // ⚠️ The type may itself be QUOTED — an enum column reads `"locale" "Locale" NOT NULL`. The first
        // version required a bare type name and silently registered no enum-typed column at all (caught
        // by this file's own red case 8).
        const col = /^\s*"([^"]+)"\s+"?[A-Za-z]/.exec(line);
        if (col) creates.push({ key: `column:${t}.${col[1]}`, on: t });
        const k = /CONSTRAINT\s+"([^"]+)"/i.exec(line);
        if (k) creates.push({ key: `constraint:${k[1]}`, on: t });
      }
    }
    // ── CREATE [UNIQUE] INDEX [CONCURRENTLY] [IF NOT EXISTS] "n" ON "T"
    const ciRe = new RegExp(String.raw`CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?${ID}\s+ON\s+(?:ONLY\s+)?${ID}`, "gi");
    while ((m = ciRe.exec(s))) creates.push({ key: `index:${idOf(m, 1)}`, on: idOf(m, 3) });
    // ── CREATE TYPE / CREATE EXTENSION
    const tyRe = new RegExp(String.raw`CREATE\s+TYPE\s+${ID}`, "gi");
    while ((m = tyRe.exec(s))) creates.push({ key: `type:${idOf(m, 1)}` });
    const exRe = new RegExp(String.raw`CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?${ID}`, "gi");
    while ((m = exRe.exec(s))) creates.push({ key: `extension:${idOf(m, 1)}` });
    // ── ALTER TABLE "T" … (ADD/DROP COLUMN, ADD/DROP CONSTRAINT, RENAME …) — every clause
    const at = new RegExp(String.raw`ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?${ID}([\s\S]*)`, "i").exec(s);
    if (at) {
      const t = idOf(at, 1);
      const body = at[3];
      const addCol = new RegExp(String.raw`ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?${ID}`, "gi");
      while ((m = addCol.exec(body))) creates.push({ key: `column:${t}.${idOf(m, 1)}`, on: t });
      const addK = new RegExp(String.raw`ADD\s+CONSTRAINT\s+${ID}`, "gi");
      while ((m = addK.exec(body))) creates.push({ key: `constraint:${idOf(m, 1)}`, on: t });
      const dropCol = new RegExp(String.raw`DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?${ID}`, "gi");
      while ((m = dropCol.exec(body))) drops.push(`column:${t}.${idOf(m, 1)}`);
      const dropK = new RegExp(String.raw`DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?${ID}`, "gi");
      while ((m = dropK.exec(body))) drops.push(`constraint:${idOf(m, 1)}`);
      const renCol = new RegExp(String.raw`RENAME\s+COLUMN\s+${ID}\s+TO\s+${ID}`, "gi");
      while ((m = renCol.exec(body))) { drops.push(`column:${t}.${idOf(m, 1)}`); creates.push({ key: `column:${t}.${idOf(m, 3)}`, on: t }); }
      const renK = new RegExp(String.raw`RENAME\s+CONSTRAINT\s+${ID}\s+TO\s+${ID}`, "gi");
      while ((m = renK.exec(body))) { drops.push(`constraint:${idOf(m, 1)}`); creates.push({ key: `constraint:${idOf(m, 3)}`, on: t }); }
      const renT = new RegExp(String.raw`^\s*RENAME\s+TO\s+${ID}`, "i").exec(body);
      if (renT) { drops.push(`table:${t}`); creates.push({ key: `table:${idOf(renT, 1)}` }); }
    }
    // ── ALTER INDEX "a" RENAME TO "b"
    const ai = new RegExp(String.raw`ALTER\s+INDEX\s+(?:IF\s+EXISTS\s+)?${ID}\s+RENAME\s+TO\s+${ID}`, "i").exec(s);
    if (ai) { drops.push(`index:${idOf(ai, 1)}`); creates.push({ key: `index:${idOf(ai, 3)}` }); }
    // ── DROP TABLE / INDEX / TYPE / EXTENSION (a list, IF EXISTS, CASCADE)
    const dr = /DROP\s+(TABLE|INDEX|TYPE|EXTENSION)\s+(?:CONCURRENTLY\s+)?(?:IF\s+EXISTS\s+)?([^;]*)/gi;
    while ((m = dr.exec(s))) {
      const kind = m[1].toLowerCase();
      for (const part of m[2].replace(/\b(CASCADE|RESTRICT)\b/gi, "").split(",")) {
        const one = new RegExp(`^\\s*${ID}\\s*$`).exec(part);
        if (one) drops.push(`${kind}:${idOf(one, 1)}`);
      }
    }
  }
  return { creates, drops };
}

type Declared = { key: Obj; owner: string };
const declaredIn = (raw: string): Declared[] =>
  [...lf(raw).matchAll(/^--\s*@drops\s+(\S+)\s+·\s+owner\s+(\S+)\s*$/gm)].map((m) => ({ key: m[1], owner: m[2] }));
const bareName = (key: Obj) => key.slice(key.indexOf(":") + 1).split(".").pop() as string;

/* ══ THE CHECK — a list of failures, each tagged with the rule it breaks ══════════════════════════ */
export function check(w: World): string[] {
  const fails: string[] = [];
  const created = new Map<Obj, string>();       // object → the migration that created it
  const indexOn = new Map<Obj, string>();       // index/constraint/column → its table
  const violators = new Set<string>();
  for (const mig of w.migs) {
    const p = parseMigration(mig.raw);
    const foreign = [...new Set(p.drops.filter((d) => created.has(d) && created.get(d) !== mig.name))];
    const declared = declaredIn(mig.raw);
    const undeclared = foreign.filter((d) => !declared.some((x) => x.key === d));
    if (undeclared.length > 0) {
      violators.add(mig.name);
      const pin = w.grandfather[mig.name];
      if (pin === undefined) {
        fails.push(`[R1 undeclared] ${mig.name} drops ${undeclared.length} object(s) earlier migrations created, undeclared: ${undeclared.map((d) => `${d} (created by ${created.get(d)})`).join(", ")}`);
      } else if (pin !== sha16(mig.raw)) {
        fails.push(`[R4 grandfather-changed] ${mig.name} is grandfathered but its content changed (${sha16(mig.raw)} ≠ ${pin}) — an applied migration was edited`);
      }
    }
    for (const d of declared) {
      if (!foreign.includes(d.key)) { fails.push(`[R2 stale-declaration] ${mig.name} declares @drops ${d.key}, which it does not drop or which no earlier migration created`); continue; }
      const doc = w.docText(d.owner);
      if (doc === null) { fails.push(`[R3 owner-missing] ${mig.name} names owner ${d.owner}, which does not exist`); continue; }
      if (!doc.includes(bareName(d.key)) || !doc.includes(mig.name)) {
        fails.push(`[R3 owner-silent] ${mig.name}: ${d.owner} does not name both ${bareName(d.key)} and ${mig.name} — the owning lane has not authorised this drop in writing`);
      }
    }
    // Apply this migration to the registry: drops first (a DROP TABLE takes its columns, indexes and
    // constraints with it), then creates — so a drop-and-recreate in one file re-registers here.
    for (const d of p.drops) {
      created.delete(d);
      if (d.startsWith("table:")) {
        const t = d.slice(6);
        for (const [k, on] of indexOn) if (on === t) { created.delete(k); indexOn.delete(k); }
      }
    }
    for (const c of p.creates) {
      created.set(c.key, mig.name);
      if (c.on) indexOn.set(c.key, c.on);
    }
  }
  for (const g of Object.keys(w.grandfather)) {
    if (!w.migs.some((m) => m.name === g)) fails.push(`[R5 grandfather-orphan] ${g} is grandfathered but no such migration exists`);
    else if (!violators.has(g)) fails.push(`[R5 grandfather-stale] ${g} is grandfathered but no longer violates — shrink the list`);
  }
  if (Object.keys(w.grandfather).length !== w.grandfatherSize) {
    fails.push(`[R5 grandfather-size] the grandfather list holds ${Object.keys(w.grandfather).length}, pinned at ${w.grandfatherSize} — it may only shrink, and the pin moves with it`);
  }
  return fails;
}

/* ══ THE REAL WORLD ═══════════════════════════════════════════════════════════════════════════════ */
function loadMigs(): Mig[] {
  return readdirSync(MIG_DIR)
    .filter((d) => statSync(join(MIG_DIR, d)).isDirectory() && existsSync(join(MIG_DIR, d, "migration.sql")))
    .sort()
    .map((name) => ({ name, raw: readFileSync(join(MIG_DIR, name, "migration.sql"), "utf8") }));
}
const realDoc = (path: string) => (existsSync(join(ROOT, path)) ? lf(readFileSync(join(ROOT, path), "utf8")) : null);
const migs = loadMigs();
const REAL: World = { migs, grandfather: { ...GRANDFATHER }, grandfatherSize: GRANDFATHER_SIZE, docText: realDoc };

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) pass++; else { fail++; failed.push(label); }
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
};

/* ══ §0 · PARSER CONTROLS — on fixtures, so a parser that reads nothing cannot pass ══════════════ */
function parserControls(): void {
  const has = (p: Parsed, kind: "creates" | "drops", key: string) =>
    kind === "drops" ? p.drops.includes(key) : p.creates.some((c) => c.key === key);
  const a = parseMigration(`CREATE TABLE "T" (\n    "id" TEXT NOT NULL,\n    "x" INTEGER,\n    CONSTRAINT "T_pkey" PRIMARY KEY ("id")\n);\nCREATE UNIQUE INDEX IF NOT EXISTS "T_x_key" ON "T"("x");`);
  ok("0.1 · CREATE TABLE registers the table, its columns and its inline constraint",
    has(a, "creates", "table:T") && has(a, "creates", "column:T.id") && has(a, "creates", "column:T.x") && has(a, "creates", "constraint:T_pkey"));
  ok("0.2 · CREATE UNIQUE INDEX IF NOT EXISTS registers the index", has(a, "creates", "index:T_x_key"));
  // U6's own shape (`DROP COLUMN "a",\nDROP COLUMN "b"`), with neutral names: the retired field names
  // themselves would trip `test:dead-schema` §2, which hunts for any code that still names them.
  const b = parseMigration(`ALTER TABLE "Planted" DROP COLUMN "alpha",\nDROP COLUMN "beta";`);
  ok("0.3 · ⭐ a MULTI-CLAUSE ALTER yields every DROP COLUMN, not only the first (U6's own shape)",
    has(b, "drops", "column:Planted.alpha") && has(b, "drops", "column:Planted.beta"));
  const c = parseMigration(`DROP INDEX hbi_counter_anchor_uq;\nDROP TABLE IF EXISTS "public"."StoreSnapshot" CASCADE;`);
  ok("0.4 · ⭐ an UNQUOTED lowercase identifier and a \"public\". prefix are both read",
    has(c, "drops", "index:hbi_counter_anchor_uq") && has(c, "drops", "table:StoreSnapshot"));
  const d = parseMigration(`-- DROP INDEX "PredictionMarket_titleEn_trgm_idx";\n/* DROP TABLE "User"; */\nSELECT 1;`);
  ok("0.5 · ⛔ a DROP inside a COMMENT is prose, not a drop", d.drops.length === 0, JSON.stringify(d.drops));
  const e = parseMigration(`DROP TABLE "A", "B";\nALTER TABLE "T" RENAME COLUMN "betId" TO "positionId";`);
  ok("0.6 · a DROP list and a RENAME COLUMN are both read (a rename takes the old name away)",
    has(e, "drops", "table:A") && has(e, "drops", "table:B") && has(e, "drops", "column:T.betId") && has(e, "creates", "column:T.positionId"));
  const f = parseMigration(`CREATE TABLE "User" (\n    "locale" "Locale" NOT NULL DEFAULT 'SW',\n    "id" TEXT NOT NULL\n);`);
  ok("0.7 · ⚠️ an ENUM-typed column (`\"locale\" \"Locale\"`) is registered — the first parser silently skipped every one",
    has(f, "creates", "column:User.locale") && has(f, "creates", "column:User.id"));
}

/* ══ RUN ══════════════════════════════════════════════════════════════════════════════════════════ */
if (!PROVE_RED) {
  console.log("§0 · the parser, on fixtures\n");
  parserControls();
  console.log("\n§1 · the real migrations\n");
  ok(`1.0 · ⚠️ CONTROL — the migrations were enumerated (${migs.length})`, migs.length >= 80);
  const reg = parseMigration(migs.map((m) => m.raw).join("\n;\n"));
  ok(`1.1 · ⚠️ CONTROL — the registry is not empty (${reg.creates.length} creates, ${reg.drops.length} drops across all files)`,
    reg.creates.length > 300 && reg.drops.length > 20);
  const failures = check(REAL);
  for (const f of failures) console.log(`   ✗ ${f}`);
  ok("1.2 · ⭐ no migration drops an object an earlier migration created without declaring it and its owner", !failures.some((f) => f.startsWith("[R1")));
  ok("1.3 · every @drops declaration is live and its owner document authorises it in writing", !failures.some((f) => f.startsWith("[R2") || f.startsWith("[R3")));
  ok("1.4 · every grandfathered file is byte-for-byte the one that shipped, still violates, and the list is its pinned size",
    !failures.some((f) => f.startsWith("[R4") || f.startsWith("[R5")));
  const restore = migs.find((m) => m.name === "20260926120000_restore_search_trgm_indexes");
  ok("1.5 · ⭐ the trigram restore exists and re-creates all eight indexes (expand-only: it drops nothing)",
    !!restore && parseMigration(restore.raw).creates.filter((c) => c.key.endsWith("_trgm_idx")).length === 8 && parseMigration(restore.raw).drops.length === 0);
  console.log(`\nmigration-ownership: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  const base = check(REAL);
  if (base.length) problems.push(`BASELINE is already red: ${base.join(" | ")}`);
  console.log(`§0 baseline · the real tree: ${base.length === 0 ? "clean" : "RED"}\n`);
  const planted = (name: string, raw: string): Mig => ({ name, raw });
  const U6 = "20260925120000_marketing_consent_suppression";
  const withoutU6: Record<string, string> = { ...REAL.grandfather }; delete withoutU6[U6];
  const PLANT = "29991231000000_planted";
  const dropTrgm = `DROP INDEX "AiUsageEvent_detail_trgm_idx";`;
  const docWith = (text: string) => (p: string) => (p === "docs/PLANTED-OWNER.md" ? text : realDoc(p));
  const CASES: Array<{ name: string; world: World; expect: RegExp; mustName?: string }> = [
    { name: "⭐ U6 itself, with its grandfather row removed — the defect this guard exists for",
      world: { ...REAL, grandfather: withoutU6, grandfatherSize: REAL.grandfatherSize - 1 }, expect: /^\[R1 undeclared\] 20260925120000/, mustName: "trgm_idx" },
    { name: "a new migration dropping a trigram index with NO declaration",
      world: { ...REAL, migs: [...migs, planted(PLANT, dropTrgm)] }, expect: /^\[R1 undeclared\] 29991231000000_planted/ },
    { name: "a declaration whose owner document does not exist",
      world: { ...REAL, migs: [...migs, planted(PLANT, `-- @drops index:AiUsageEvent_detail_trgm_idx · owner docs/NO-SUCH-LANE.md\n${dropTrgm}`)] }, expect: /^\[R3 owner-missing\]/ },
    { name: "an owner document that exists but never names this migration",
      world: { ...REAL, docText: docWith("AiUsageEvent_detail_trgm_idx is ours."), migs: [...migs, planted(PLANT, `-- @drops index:AiUsageEvent_detail_trgm_idx · owner docs/PLANTED-OWNER.md\n${dropTrgm}`)] }, expect: /^\[R3 owner-silent\]/ },
    { name: "a stale declaration — @drops on an object the file does not drop",
      world: { ...REAL, migs: [...migs, planted(PLANT, `-- @drops index:AiUsageEvent_model_trgm_idx · owner docs/PLANTED-OWNER.md\nSELECT 1;`)] }, expect: /^\[R2 stale-declaration\]/ },
    { name: "a grandfathered file EDITED after it shipped",
      world: { ...REAL, migs: migs.map((m) => (m.name === U6 ? { ...m, raw: m.raw + "\n-- edited\n" } : m)) }, expect: /^\[R4 grandfather-changed\] 20260925120000/ },
    { name: "an UNQUOTED lowercase drop of an earlier object",
      world: { ...REAL, migs: [...migs, planted(PLANT, `DROP INDEX aiusageevent_detail_trgm_idx;\nDROP INDEX "AiUsageEvent_model_trgm_idx";`)] }, expect: /^\[R1 undeclared\] 29991231000000_planted.*AiUsageEvent_model_trgm_idx/ },
    { name: "the SECOND clause of a multi-clause DROP COLUMN",
      world: { ...REAL, migs: [...migs, planted(PLANT, `ALTER TABLE "User" DROP COLUMN IF EXISTS "nonexistent_col",\nDROP COLUMN "locale";`)] }, expect: /^\[R1 undeclared\] 29991231000000_planted.*column:User\.locale/ },
    { name: "the grandfather list grown by one without moving the pin",
      world: { ...REAL, grandfather: { ...REAL.grandfather, "20260101000000_nope": "0" } }, expect: /^\[R5 grandfather-(size|orphan)\]/ },
  ];
  // ⭐ CONTROL: a declared, owner-authorised drop is ACCEPTED — or the guard just refuses all drops.
  const okDoc = docWith(`The AiUsageEvent_detail_trgm_idx index is retired by ${PLANT}.`);
  const accepted = check({ ...REAL, docText: okDoc, migs: [...migs, planted(PLANT, `-- @drops index:AiUsageEvent_detail_trgm_idx · owner docs/PLANTED-OWNER.md\n${dropTrgm}`)] });
  if (accepted.length) problems.push(`CONTROL: a properly declared, owner-authorised drop was refused (${accepted.join(" | ")})`);
  else console.log("control  a declared, owner-authorised drop is accepted\n");
  let caught = 0;
  for (const [i, c] of CASES.entries()) {
    const f = check(c.world);
    const hit = f.some((x) => c.expect.test(x) && (!c.mustName || x.includes(c.mustName)));
    if (hit) caught++; else problems.push(`case ${i + 1} (${c.name}): not caught — got ${f.join(" | ") || "nothing"}`);
    console.log(`${hit ? "CAUGHT" : "MISSED"}  ${c.name}`);
  }
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) { console.log("\nPROBLEMS:"); for (const p of problems) console.log(`  ✗ ${p}`); process.exitCode = 1; }
  else { console.log("RED PROOF COMPLETE"); process.exitCode = 0; }
}
