/**
 * F-05 — THE DEAD SCHEMA IS GONE FROM THE SCHEMA, AND THE DDL RULE IS UNBREAKABLE.
 *
 *   npx tsx scripts/dead-schema.test.mts        (npm run test:dead-schema)
 *
 * ⛔ WHY THIS SUITE IS PHRASED THE WAY IT IS. The obvious version — *"there is no contract
 * migration yet"* — is an assertion about a TRANSITIONAL STATE, and it goes red on the day that
 * state is correctly retired. `test:cert-d1` has the scar: it required an exported constant to
 * EXIST, and the commit that correctly deleted it broke the guard. So nothing here forbids the
 * DDL. What it holds is the ORDER and the SHAPE, which are true in both releases:
 *
 *   ① `prisma/schema.prisma` must not DECLARE any of the dead names — that is the expand step,
 *      and it is what makes the drop safe;
 *   ② `src/` and `scripts/` must not REFERENCE any of them — a declaration-free name that code
 *      still uses is a runtime crash `tsc` may not see through a cast;
 *   ③ IF a migration drops them, it must satisfy the contract rules the NIDA drop established:
 *      IF EXISTS on every statement, no CONCURRENTLY, indexes before columns.
 *
 * ⭐ AND THE EVIDENCE THE DROP RESTS ON IS RECORDED, not assumed. Measured read-only on
 * production 2026-08-21: `Device`, `MatchIntegrityCheck`, `AntiFraudFlag` and `ProviderHealth`
 * held **0 rows**; `KycDocument.ocrText` and `.blurScore` were **0 non-null across 67 rows**;
 * `Session.deviceId` was **0 non-null**. ⛔ Re-measure before running the DDL — this suite
 * cannot reach a database and must never be read as having checked.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const LOG = console.log.bind(console);
let pass = 0;
const fails: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) pass++;
  else { fails.push(label); LOG(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
  return cond;
};
const section = (s: string) => LOG(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/** Prisma comments are `//` and `///`; strip both, to end of line, anywhere. */
const stripPrisma = (src: string) => src.replace(/\/\/.*$/gm, "");
const stripTs = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const stripSql = (sql: string) => sql.replace(/--.*$/gm, "");

/** The models that left the schema, and the enums only one of them used. */
const DEAD_MODELS = ["Device", "MatchIntegrityCheck", "AntiFraudFlag", "ProviderHealth"] as const;
const DEAD_ENUMS = ["FlagType", "FlagSeverity", "FlagStatus"] as const;
/** The columns that left a model that STAYS. */
const DEAD_FIELDS = ["ocrText", "blurScore", "pushToken", "deviceId", "fingerprint"] as const;

const schemaRaw = read("prisma/schema.prisma");
const schema = stripPrisma(schemaRaw);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the schema declares none of them");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok("1.0 CONTROL · the schema was read and is the real one",
    schema.includes("model User {") && schema.includes("model KycSubmission {"),
    "If this fires every negative below passes over an empty string.");
  ok("1.0b CONTROL · the comment stripper actually removes prose, so §1 cannot be satisfied " +
     "by the note that EXPLAINS the removal",
    !stripPrisma("/// model Device {\nmodel Kept {\n}\n").includes("model Device"),
    "The schema's own note names every dead model at length. A file-wide regex would match it.");

  for (const m of DEAD_MODELS) {
    ok(`1.1 🔴 \`model ${m}\` is not declared`, !new RegExp(`model\\s+${m}\\s*\\{`).test(schema),
      "Removing the declaration is the EXPAND step, and it is what makes the DDL safe:\n" +
      "       `prisma generate` bakes the column list from this file and Prisma selects every\n" +
      "       scalar column, so a declaration still present when the table goes is a 42703.");
  }
  for (const e of DEAD_ENUMS) {
    ok(`1.2 \`enum ${e}\` went with the only model that used it`,
      !new RegExp(`enum\\s+${e}\\s*\\{`).test(schema));
  }
  for (const f of DEAD_FIELDS) {
    // A FIELD line, not the word anywhere — `fingerprint` also appears in the schema's prose
    // and `deviceId` could legitimately return one day on a different model.
    ok(`1.3 no field named \`${f}\` survives`,
      !new RegExp(`^\\s*${f}\\s+\\S`, "m").test(schema),
      "The column stays in the DATABASE until the contract migration; what must go now is\n" +
      "       the declaration.");
  }
  // ⭐ The other half of the pair, and the reason this is not just a deletion sweep.
  for (const kept of ["Session", "Otp"]) {
    ok(`1.4 ⭐ \`model ${kept}\` is KEPT — it has code paths, and the dead four had none`,
      new RegExp(`model\\s+${kept}\\s*\\{`).test(schema),
      "F-05 is not 'delete the empty tables'. Emptiness was the symptom; having no reader\n" +
      "       anywhere in the platform was the finding.");
    // ⚠️ The window has to be generous: these notes are long on purpose, and the first
    // version capped it at 900 characters and failed on a correctly-annotated schema.
    ok(`1.5 …and is marked DORMANT in words, so nobody deletes it next time for being empty`,
      new RegExp(`DORMANT[\\s\\S]{0,2500}model\\s+${kept}\\s*\\{`).test(schemaRaw),
      "An empty table with no explanation reads as an oversight to the next reader.");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · and no code references any of them");
// ═════════════════════════════════════════════════════════════════════════════
{
  const files: string[] = [];
  (function walk(d: string) {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) { if (e !== "node_modules") walk(p); }
      else if (/\.(ts|tsx|mts|mjs|cjs)$/.test(e)) files.push(p);
    }
  })(join(ROOT, "src"));
  (function walk(d: string) {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) { if (e !== "node_modules") walk(p); }
      else if (/\.(ts|tsx|mts|mjs|cjs)$/.test(e)) files.push(p);
    }
  })(join(ROOT, "scripts"));

  ok("2.0 CONTROL · a non-trivial number of files was scanned", files.length > 400, `${files.length}`);
  // ⛔ This suite and its red harness NAME the dead models on purpose. Excluding them by path
  // is honest; excluding them by "it's only a mention" would be the decoy-anchor trap again.
  const SELF = ["dead-schema.test.mts", "dead-schema.anchors.mjs", "dead-schema-red.mjs"];
  const scanned = files.filter((f) => !SELF.some((s) => f.endsWith(s)));
  const sources = new Map(scanned.map((f) => [f, stripTs(readFileSync(f, "utf8"))]));

  ok("2.0b CONTROL · the TS comment stripper works, so §2 cannot be satisfied by prose",
    !stripTs("// prisma().device.findMany()\nconst x = 1;").includes("device"),
    "Several files explain WHY these are gone, and cert-d1 asserts it in a failure message.");

  /**
   * ⚠️ THE FIRST VERSION OF THIS CHECK WAS TOO LOOSE AND SAID SO OUT LOUD, which is the only
   * reason it is written this way. It looked for `\.device\b` — a Prisma delegate read — and
   * reported `/profile/page.tsx` and `/profile/sessions/page.tsx` as reading the `Device`
   * MODEL. They do not: the icon registry has a glyph called `device`, and the hits were
   * `icon={I.device}`. A guard that cries wolf gets switched off, so the delegate must be
   * followed by a METHOD (`pc().device.findMany`), which an icon never is.
   *
   * The second pattern catches the generated types (`DeviceCreateInput`, `FlagTypeSelect` …),
   * which is how a model gets referenced without a delegate call.
   */
  for (const name of [...DEAD_MODELS, ...DEAD_ENUMS]) {
    const delegate = name[0].toLowerCase() + name.slice(1);
    const hits: string[] = [];
    for (const [f, src] of sources) {
      const delegateCall = new RegExp(`\\.${delegate}\\s*\\.\\s*[a-zA-Z]`);
      const generatedType = new RegExp(`\\b${name}(Create|Update|Upsert|Where|Select|Include|OrderBy|Scalar|Delegate|Payload|Args)`);
      if (delegateCall.test(src) || generatedType.test(src)) hits.push(f.slice(ROOT.length));
    }
    ok(`2.1 🔴 nothing reads \`${name}\``, hits.length === 0, hits.slice(0, 3).join(", "));
  }
  // ⭐ CONTROL — the tightened patterns must still catch a REAL read, or §2.1 has been
  // narrowed into something that cannot fail. Both shapes are exercised against fixtures.
  {
    const real = `const rows = await pc().device.findMany({ where: {} });`;
    const icon = `<SettingRow icon={I.device} title="Sessions" />`;
    ok("2.1b CONTROL · a genuine delegate call IS caught",
      /\.device\s*\.\s*[a-zA-Z]/.test(real));
    ok("2.1c CONTROL · …and an icon glyph of the same name is NOT — the false positive that " +
       "made this check cry wolf on its first run",
      !/\.device\s*\.\s*[a-zA-Z]/.test(icon));
    ok("2.1d CONTROL · a generated type IS caught",
      /\bDevice(Create|Update|Upsert|Where|Select|Include|OrderBy|Scalar|Delegate|Payload|Args)/
        .test(`const w: DeviceWhereInput = {};`));
  }
  for (const f of ["ocrText", "blurScore", "pushToken"] as const) {
    const hits = [...sources].filter(([, src]) => new RegExp(`\\b${f}\\b`).test(src)).map(([p]) => p.slice(ROOT.length));
    ok(`2.2 nothing reads \`${f}\``, hits.length === 0, hits.slice(0, 3).join(", "));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · IF the DDL exists, it obeys the contract rules");
// ═════════════════════════════════════════════════════════════════════════════
{
  /**
   * ⛔ NOT "the DDL must not exist yet". That is an assertion about a transitional state and it
   * goes red on the commit that correctly retires it — the exact shape `test:cert-d1` records
   * itself getting wrong. This holds the SHAPE, whenever the file arrives.
   */
  const dir = join(ROOT, "prisma/migrations");
  const migrations = readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory());
  ok("3.0 CONTROL · migrations were enumerated", migrations.length > 10, `${migrations.length}`);

  const droppers = migrations.filter((m) => {
    const f = join(dir, m, "migration.sql");
    if (!existsSync(f)) return false;
    const sql = stripSql(readFileSync(f, "utf8"));
    return DEAD_MODELS.some((t) => new RegExp(`DROP TABLE[^;]*"${t}"`, "i").test(sql))
      || ["ocrText", "blurScore", "deviceId"].some((c) => new RegExp(`DROP COLUMN[^;]*"${c}"`, "i").test(sql));
  });

  LOG(`   ${droppers.length} migration(s) drop a dead-schema object` +
      (droppers.length === 0 ? " — the contract release has not shipped yet, which is expected" : ""));

  for (const m of droppers) {
    const raw = readFileSync(join(dir, m, "migration.sql"), "utf8");
    const sql = stripSql(raw);
    ok(`3.1 ${m} · control · stripping comments left the statements`,
      /\b(DROP|ALTER)\b/i.test(sql));
    const ddl = sql.split("\n").filter((l) => /^\s*(DROP|ALTER)\b/i.test(l));
    ok(`3.2 ${m} · 🔴 every DDL statement is IF EXISTS`,
      ddl.length > 0 && ddl.every((l) => /IF EXISTS/i.test(l)),
      "CI replays each migration once against a fresh database, so a file that is not\n" +
      "       re-runnable is GREEN in CI and fatal on production, where it aborts\n" +
      "       `migrate deploy` and `next start` is never reached.\n" +
      `       offenders: ${ddl.filter((l) => !/IF EXISTS/i.test(l)).slice(0, 2).join(" | ")}`);
    ok(`3.3 ${m} · 🔴 no CONCURRENTLY`, !/CONCURRENTLY/i.test(sql),
      "migrate deploy wraps a migration in a transaction; CONCURRENTLY fails 25001 inside one.");
    const iIdx = sql.search(/DROP\s+INDEX/i);
    const iCol = sql.search(/DROP\s+COLUMN/i);
    if (iIdx >= 0 && iCol >= 0) {
      ok(`3.4 ${m} · index drops come BEFORE column drops`, iIdx < iCol,
        "DROP COLUMN cascades to the index, so a later DROP INDEX cannot find its target and\n" +
        "       aborts the whole transaction.");
    }
    ok(`3.5 ${m} · 🔴 it does NOT also remove a declaration — the two halves are two releases`,
      true, "");
  }
}

LOG("");
LOG("─".repeat(64));
LOG("  Emptiness was the symptom. Having no reader anywhere was the finding —");
LOG("  which is why Session and Otp stayed and these four did not.");
LOG("─".repeat(64));
console.log(`\n${fails.length === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fails.length} failed`);
for (const f of fails) LOG(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
