/**
 * test:campaign-models — U35's guard (marketing campaigns' data model). COMMIT A (U35a, S10 2026-10-01): the
 * MARKETING purpose, alone in its own migration, in the schema and the store's union — and nobody writing it yet.
 * COMMIT B (U35b, S10 2026-10-02): the campaign tables — §1 the migration and the schema read as TEXT, §2 the rules
 * EXECUTED on the memory twin (the plan's Accept among them), §3 the MARKETING writer pin.
 *
 * ⭐ WHY A SUITE OF ITS OWN: `red:dal-parity` can never plant a defect in schema.prisma or a migration (it reads them
 * from ROOT, not KP_SRC), so a shape that lives in SQL needs an in-process suite that is HANDED the text and can be
 * handed a planted one. The plan's old RED for the unique key ("drop the index → U43's control fails") cannot run
 * before U43 exists, so its executable home is §2.1 here: the dedupe fixture fails when the key leaves the schema or
 * the migration, and when the twin stops honouring it.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION — `--prove-red` plants each defect in memory (a text, or one twin member swapped)
 * and requires the MATCHING assertion to fail. This file changes nothing on disk.
 * ⛔ §2 RUNS ON THE MEMORY TWIN ONLY. `DATABASE_URL` is removed BEFORE the store is imported (the store picks its
 * twin at import), and 2.0 asserts the writes land in the memory maps — so a run on a machine with a database
 * configured can never put a campaign into it.
 *
 * Run:  npm run test:campaign-models
 * Red:  npm run red:campaign-models
 */
process.exitCode = 1;

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import type {
  StoredSmsCampaign, StoredSmsCampaignRecipient, SmsCampaignRecipientSeed, SmsCampaignRecipientStatus,
  SmsCampaignDraftPatch, SmsCampaignDraftGuard, SmsCampaignTransition, SmsCampaignTransitionPatch,
} from "../src/lib/server/store.ts";

// ⛔ BEFORE THE STORE IS IMPORTED — see the header.
delete process.env.DATABASE_URL;
const { db } = await import("../src/lib/server/store.ts");
const CM = await import("../src/lib/server/marketing/campaign-model.ts");
const { isGatewayMsisdn } = await import("../src/lib/phone-normalize.ts");
const { MEMBERS_KEY_HEX_CHARS } = await import("../src/lib/marketing/campaign-confirm.ts");
const { contactAudienceWrites, WHOLE_BOOK } = await import("../src/lib/server/marketing/audience.ts");

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
 * ⛔ THE FILES ALLOWED TO SEND WITH `purpose: "MARKETING"`. U37b's test send declared itself here in the change that
 * built it (behind the closed `marketing.sms.live` switch, DECISIONS X14); U43's slice declares itself next — a send under
 * the new purpose from anywhere else is a campaign path nobody reviewed.
 */
export const MARKETING_WRITERS: readonly string[] = [
  "src/lib/server/marketing/campaign-test-send.ts",
];

/* ═══ THE WORLD — the texts §1 reads and the twin §2 drives, each swappable by a red case ═══════════════════════ */

type CampaignNs = typeof db.smsCampaign;
type RecipientNs = typeof db.smsCampaignRecipient;
type Twin = { campaign: CampaignNs; recipient: RecipientNs };
/** The rule set itself (`campaign-model.ts`), executed directly by §2.9–§2.11 — swappable, so a red case can delete one
 *  refusal from it. (Both twins call these very functions first: `test:dal-parity` §26.shape.) */
type Rules = {
  assertTransitionShape: typeof CM.assertTransitionShape;
  assertDraftPatch: typeof CM.assertDraftPatch;
  assertNewCampaign: typeof CM.assertNewCampaign;
};
type World = {
  migrations: Migration[];
  schema: string;
  store: string;
  smsCompose: string;
  src: Array<{ path: string; text: string }>;
  twin: Twin;
  rules: Rules;
};
const REAL: World = {
  migrations: readMigrations(),
  schema: lf(readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8")),
  store: decomment(lf(readFileSync(join(ROOT, "src", "lib", "server", "store.ts"), "utf8"))),
  smsCompose: decomment(lf(readFileSync(join(ROOT, "src", "lib", "sms-compose.ts"), "utf8"))),
  src: srcTexts(),
  twin: { campaign: db.smsCampaign, recipient: db.smsCampaignRecipient },
  rules: { assertTransitionShape: CM.assertTransitionShape, assertDraftPatch: CM.assertDraftPatch, assertNewCampaign: CM.assertNewCampaign },
};

/** The memory twin's three campaign maps. §2 clears them before every run, so each run starts from nothing. */
type MemMaps = {
  smsCampaigns: Map<string, StoredSmsCampaign>;
  smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient>;
  recipientsByCampaignMsisdn: Map<string, string>;
};
function mem(): MemMaps {
  const s = (globalThis as unknown as { __50PICK_STORE?: MemMaps }).__50PICK_STORE;
  if (!s || !s.smsCampaigns || !s.smsCampaignRecipients || !s.recipientsByCampaignMsisdn) {
    throw new Error("the memory store has no campaign maps — §2 runs on the memory twin only");
  }
  return s;
}

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
/** One assertion whose evidence `fn` computes — a throw is a FAIL of that assertion, never a crashed run. */
async function check(label: string, fn: () => Promise<[boolean, string?]> | [boolean, string?]): Promise<void> {
  try {
    const [c, x] = await fn();
    ok(label, c, x ?? "");
  } catch (err) {
    ok(label, false, `threw: ${(err as Error)?.message ?? String(err)}`);
  }
}

const L = {
  s11: "1.1 ⛔ exactly ONE migration adds MARKETING to SmsPurpose, and that file holds NO other statement (55P04)",
  s12: "1.2 the ADD VALUE migration sorts BEFORE the campaign tables' migration — the tables ship one migration later",
  s13: "1.3 exactly ONE migration creates the two tables and the three new types (SmsCampaignStatus, SmsCampaignRecipientStatus, SmsEncoding), and no other migration creates any of them",
  s14: "1.4 every OTHER index the two models declare is in the migration under Prisma's own name, and the migration holds none the schema lacks (the one key is 2.1's)",
  s15: "1.5 the schema's two models and the migration's two tables declare the SAME columns — name, type, nullability and default, one by one",
  s16: "1.6 ⛔ no CASCADE link: the campaign link is RESTRICT and contactId / userId are SET NULL — in the migration AND the schema, under Prisma's constraint names",
  s17: "1.7 ⛔ expand-only: the tables migration only CREATEs types, tables and indexes and ADDs the recipient's foreign keys — no DROP, RENAME, ALTER TYPE, CONCURRENTLY or MARKETING",
  s18: "1.8 the schema's enum SmsPurpose and the store's SmsPurpose union are the same set, and both carry MARKETING",
  s18b: "1.8b SmsCampaignStatus is ONE set in the schema, the migration and the store, in the schema's order in campaign-model.ts — and holds no approval status (OQ1)",
  s18c: "1.8c SmsCampaignRecipientStatus is ONE set in the schema, the migration and the store, in the schema's order in campaign-model.ts — HELD included (X12)",
  s18d: "1.8d SmsEncoding is ONE set in the schema, the migration and sms-compose.ts, and the store types both codings with sms-compose's union",
  s19: "1.9 every timestamp in both models is TIMESTAMPTZ(3) — @db.Timestamptz(3) in the schema, never a naive TIMESTAMP(3) in the migration",
  s110: "1.10 ⛔ no stored counter (OD26): SmsCampaign's only numeric columns are the saved segments, the revision, the confirmed population and the frozen estimate and budget",
  s111: "1.11 ⛔ a recipient holds LINKS, never copies: no name, e-mail or account-phone column on SmsCampaignRecipient, and both back-relations are declared",
  s20: "2.0 CONTROL · §2 runs on the MEMORY twin: DATABASE_URL is absent and a campaign written lands in the memory map",
  s21: "2.1 ⭐ the dedupe fixture: 1,000 seeds, then the same 1,000 people (ids re-minted) shuffled among 200 new ones, give 1,200 rows, all PENDING — on the key the database enforces (the schema's @@unique([campaignId, msisdn]) and the migration's unique index)",
  s22: "2.2 the key is PER CAMPAIGN: one number on two campaigns is two rows",
  s23: "2.3 ⛔ a batch is refused WHOLE — a +255 or 07 spelling, 1,001 seeds, a missing campaign or contact, a repeated id, a seed that settles a row — and nothing is written; a seed already on the campaign is skipped before its links are checked, as Postgres does",
  s24: "2.4 ⭐ a confirmed scope cannot be widened: a draft save lands on its revision (the text stored), the confirmation freezes, then a wider audience is refused, a frozen key is refused outside DRAFT and nothing returns to DRAFT — the stored filter byte-identical",
  s25: "2.5 ⭐ two racing transitions from RUNNING (to PAUSED and to CANCELLED) leave exactly ONE winner, the row holds the winner's status and reason, and a third writer from RUNNING is refused",
  s26: "2.6 ⭐ draftRevision is the ONE optimistic mechanism: two saves on one revision — exactly one lands and its text is the one stored; a stale revision is refused; a save without one throws",
  s27: "2.7 countByStatus returns every recipient status, zeros included, in the schema's order — for a campaign with rows and for one with none",
  s28: "2.8 a recipient is born PENDING with nothing settled, and a campaign is born a blank DRAFT — born CONFIRMED, born with a count, an ids audience, a non-canonical filter, an extra or a missing key are each refused, nothing written",
  s29: "2.9 ⭐ the lifecycle rules refuse every move a campaign does not make — to inside from (two winners), out of or onto a terminal row, back to DRAFT, a DRAFT skipping its confirmation, a phone number as a cursor — and pass the moves it does",
  s210: "2.10 ⭐ the confirmation is ONE move: its fields only with DRAFT → CONFIRMED, on a revision, and all of them — who, when, a population of at least one, the tier and its watermark, the frozen estimates — every gap refused",
  s211: "2.11 the draft-save and birth rules refuse a body without its saved verdict, a half-removed English variant, an emptied column and a value its column cannot take — and the watermark width is U40's MEMBERS_KEY_HEX_CHARS",
  s212: "2.12 a contact removed from the book leaves its campaign recipient row in place with the link set to null — Postgres' SET NULL, mirrored by the memory twin",
  s31: "3.1 ⛔ no src file sends with purpose MARKETING unless it is a declared MARKETING_WRITER (U37b's test send; U43's slice next)",
};

/* ═══ THE TEXT READERS (§1) ═══════════════════════════════════════════════════════════════════════════════════ */

const NEW_TYPES = ["SmsCampaignStatus", "SmsCampaignRecipientStatus", "SmsEncoding"] as const;
const TABLES = ["SmsCampaign", "SmsCampaignRecipient"] as const;
/** THE ONE KEY — §2.1 owns it; §1.4 compares every other index. */
const ONE_KEY = "SmsCampaignRecipient_campaignId_msisdn_key";

/** The migration that creates the campaign table (null when none does). */
const tablesMigration = (w: World): Migration | null =>
  w.migrations.find((m) => /CREATE TABLE "SmsCampaign" \(/.test(sqlStatements(m.sql))) ?? null;
/** The schema's `model X {…}`, up to its closing brace at the start of a line. */
function schemaModel(schema: string, name: string): string {
  const at = schema.indexOf(`model ${name} {`);
  if (at < 0) return "";
  const end = schema.indexOf("\n}", at);
  return end < 0 ? "" : schema.slice(at, end + 2);
}
/** Prisma comments (`//` and `///`) out of one line. */
const uncomment = (line: string) => line.replace(/\/\/.*$/, "");
/** The values of `enum X { … }` in declared order. */
function schemaEnum(schema: string, name: string): string[] {
  const m = new RegExp(`\\benum ${name} \\{([^}]*)\\}`).exec(schema);
  if (!m) return [];
  return m[1].split("\n").map((l) => uncomment(l).trim()).filter((l) => /^[A-Z][A-Z0-9_]*$/.test(l));
}
/** The values of `CREATE TYPE "X" AS ENUM (…)` in declared order. */
function migrationEnum(sql: string, name: string): string[] {
  const m = new RegExp(`CREATE TYPE "${name}" AS ENUM \\(([^)]*)\\)`).exec(sqlStatements(sql));
  return m ? Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]) : [];
}
/** The members of `export type X = "A" | "B";` in a TypeScript source, in written order. */
function tsUnion(src: string, name: string): string[] {
  const m = new RegExp(`export type ${name} =\\s*([^;]+);`).exec(src);
  return m ? Array.from(m[1].matchAll(/"([A-Z][A-Z0-9_]*)"/g)).map((x) => x[1]) : [];
}
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const sameSet = (a: readonly string[], b: readonly string[]) => same([...a].sort(), [...b].sort());

type Col = { type: string; notNull: boolean; def: string | null };
const colText = (c: Col | undefined) => (c ? `${c.type}${c.notNull ? " NOT NULL" : ""}${c.def !== null ? ` DEFAULT ${c.def}` : ""}` : "absent");
const SCALAR_SQL: Record<string, string> = {
  String: "TEXT", Int: "INTEGER", BigInt: "BIGINT", Float: "DOUBLE PRECISION", Boolean: "BOOLEAN", Json: "JSONB",
};
/** A model's SCALAR columns as Postgres types — what the migration must create. Relation fields are skipped. */
function schemaColumns(model: string, enums: ReadonlySet<string>): Map<string, Col> {
  const out = new Map<string, Col>();
  for (const raw of model.split("\n").slice(1)) {
    const line = uncomment(raw).trim();
    if (!line || line.startsWith("@@") || line === "}") continue;
    const m = /^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)(\[\])?(\?)?(.*)$/.exec(line);
    if (!m) continue;
    const [, name, type, list, opt, attrs] = m;
    if (list) continue;
    let sql: string | null = null;
    if (type in SCALAR_SQL) sql = SCALAR_SQL[type];
    else if (type === "DateTime") sql = /@db\.Timestamptz\(3\)/.test(attrs) ? "TIMESTAMPTZ(3)" : "TIMESTAMP(3)";
    else if (type === "Decimal") {
      const d = /@db\.Decimal\((\d+),\s*(\d+)\)/.exec(attrs);
      sql = d ? `DECIMAL(${d[1]},${d[2]})` : "DECIMAL(65,30)";
    } else if (enums.has(type)) sql = `"${type}"`;
    if (sql === null) continue;
    const dm = /@default\(([^()]*(?:\(\))?)\)/.exec(attrs);
    let def: string | null = null;
    if (dm) {
      const v = dm[1].trim();
      if (v === "now()") def = "CURRENT_TIMESTAMP";
      else if (v === "cuid()" || v === "uuid()") def = null;
      else if (/^-?\d+$/.test(v)) def = v;
      else if (/^[A-Z][A-Z0-9_]*$/.test(v)) def = `'${v}'`;
      else def = v;
    }
    out.set(name, { type: sql, notNull: !opt, def });
  }
  return out;
}
/** A CREATE TABLE's columns, as the migration declares them. */
function migrationColumns(sql: string, table: string): Map<string, Col> {
  const out = new Map<string, Col>();
  const s = sqlStatements(sql);
  const at = s.indexOf(`CREATE TABLE "${table}" (`);
  if (at < 0) return out;
  const end = s.indexOf("\n);", at);
  for (const raw of s.slice(at, end < 0 ? undefined : end).split("\n").slice(1)) {
    const m = /^\s*"(\w+)"\s+("\w+"|[A-Z]+(?: PRECISION)?(?:\(\d+(?:,\d+)?\))?)(\s+NOT NULL)?(?:\s+DEFAULT\s+(.+?))?,?\s*$/.exec(raw);
    if (m) out.set(m[1], { type: m[2], notNull: !!m[3], def: m[4] ?? null });
  }
  return out;
}
const schemaEnumNames = (schema: string) => new Set(Array.from(schema.matchAll(/^enum (\w+) \{/gm), (m) => m[1]));

type Idx = { unique: boolean; name: string; cols: string[] };
const idxText = (i: Idx) => `${i.unique ? "UNIQUE " : ""}${i.name}(${i.cols.join(",")})`;
/** The indexes a model declares, NAMED as Prisma names them (`<Table>_<cols>_idx` / `_key`). */
function schemaIndexes(model: string, table: string): Idx[] {
  const out: Idx[] = [];
  for (const raw of model.split("\n")) {
    const line = uncomment(raw).trim();
    const block = /^@@(unique|index)\(\[([^\]]+)\]/.exec(line);
    if (block) {
      const cols = block[2].split(",").map((c) => c.trim());
      out.push({ unique: block[1] === "unique", cols, name: `${table}_${cols.join("_")}_${block[1] === "unique" ? "key" : "idx"}` });
      continue;
    }
    const field = /^([A-Za-z_]\w*)\s+\S+.*\s@unique\b/.exec(line);
    if (field) out.push({ unique: true, cols: [field[1]], name: `${table}_${field[1]}_key` });
  }
  return out;
}
function migrationIndexes(sql: string, table: string): Idx[] {
  const out: Idx[] = [];
  for (const m of sqlStatements(sql).matchAll(/CREATE (UNIQUE )?INDEX "(\w+)" ON "(\w+)"\(([^)]*)\)/g)) {
    if (m[3] === table) out.push({ unique: !!m[1], name: m[2], cols: m[4].split(",").map((c) => c.trim().replace(/"/g, "")) });
  }
  return out;
}
type Fk = { name: string; col: string; ref: string; onDelete: string };
function migrationFks(sql: string, table: string): Fk[] {
  const out: Fk[] = [];
  const re = /ALTER TABLE "(\w+)" ADD CONSTRAINT "(\w+)" FOREIGN KEY \("(\w+)"\) REFERENCES "(\w+)"\("id"\) ON DELETE (SET NULL|RESTRICT|CASCADE|NO ACTION|SET DEFAULT)/g;
  for (const m of sqlStatements(sql).matchAll(re)) if (m[1] === table) out.push({ name: m[2], col: m[3], ref: m[4], onDelete: m[5] });
  return out;
}
/** `field Model? @relation(fields: [col], references: [id], onDelete: X)` → { col, ref, onDelete }. */
function schemaRelations(model: string): Array<{ col: string; ref: string; onDelete: string | null }> {
  const out: Array<{ col: string; ref: string; onDelete: string | null }> = [];
  for (const raw of model.split("\n")) {
    const m = /^\s*\w+\s+(\w+)\??\s+@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[id\](?:,\s*onDelete:\s*(\w+))?/.exec(uncomment(raw));
    if (m) out.push({ col: m[2], ref: m[1], onDelete: m[3] ?? null });
  }
  return out;
}
/** The one key, as the schema and the migration declare it (§2.1 reads both). */
function declaredOneKey(w: World): { schema: boolean; migration: boolean } {
  const model = schemaModel(w.schema, "SmsCampaignRecipient").split("\n").map(uncomment).join("\n");
  const t = tablesMigration(w);
  return {
    schema: /^\s*@@unique\(\[campaignId,\s*msisdn\]\)/m.test(model),
    migration: !!t && /CREATE UNIQUE INDEX "SmsCampaignRecipient_campaignId_msisdn_key" ON "SmsCampaignRecipient"\("campaignId", "msisdn"\);/.test(sqlStatements(t.sql)),
  };
}

/* ═══ THE FIXTURES (§2) ═══════════════════════════════════════════════════════════════════════════════════════ */

const T0 = Date.parse("2026-10-02T09:00:00.000Z");
const at = (s: number) => new Date(T0 + s * 1000).toISOString();
/** A bare key: 255, then 7, then eight digits — `isGatewayMsisdn`'s one shape. */
const keyOf = (i: number) => `255710${String(i).padStart(6, "0")}`;
const OFFICER = "usr_u35b_officer";
/** U24's canonical key for "consent given" (`contactAudienceKey`), and the whole book's. */
const FILTER_GIVEN = '{"consent":["GIVEN"]}';
const FILTER_WHOLE_BOOK = "{}";

/** A blank draft, written out by hand — independent of the rule set under test. */
function draft(id: string, o: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign {
  return {
    id, name: `Campaign ${id}`, status: "DRAFT", bodySw: "50pick: Habari, soka leo.", bodyEn: null,
    codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: null, nameFallbackSw: null, nameFallbackEn: null,
    sourcePhrase: null, draftRevision: 0, confirmTier: null, audienceFilter: FILTER_GIVEN, audienceCount: null,
    audienceWatermark: null, estimateSegments: null, estimateTzs: null, budgetTzs: null, enqueueCursor: null,
    enqueuedAt: null, stopReason: null, createdBy: OFFICER, confirmedBy: null, confirmedAt: null, startedAt: null,
    pausedAt: null, finishedAt: null, createdAt: at(0), updatedAt: at(0), ...o,
  };
}
const seed = (id: string, campaignId: string, msisdn: string): SmsCampaignRecipientSeed =>
  ({ id, campaignId, msisdn, contactId: null, userId: null, optOutToken: null, createdAt: at(1) });
/** What a confirmation freezes (U40's columns, X13/X15) — a typed tier, 1,200 people, one segment each. */
const CONFIRM: SmsCampaignTransitionPatch = {
  audienceCount: 1200, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: 1200, estimateTzs: 7200,
  budgetTzs: 8000, confirmedBy: OFFICER, confirmedAt: at(3),
};
/** A deterministic shuffle (an LCG), so a red case and the baseline see the same order. */
function shuffled<T>(xs: readonly T[], s0: number): T[] {
  const out = [...xs];
  let s = s0 >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function chunks<T>(xs: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}
async function throws(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}
const total = (counts: ReadonlyArray<{ count: number }>) => counts.reduce((n, c) => n + c.count, 0);

/* ═══ THE ASSERTIONS ══════════════════════════════════════════════════════════════════════════════════════════ */

async function run(w: World, tag: string): Promise<void> {
  const p = (s: string) => `${tag}${s}`;
  ok(p("0 · CONTROL · the migrations, the schema and the store were read"),
    w.migrations.length > 50 && w.schema.includes("enum SmsPurpose") && w.store.includes("export type SmsPurpose"), `${w.migrations.length} migrations`);

  // ── §1.1 · the ADD VALUE stands alone ──────────────────────────────────────────────────────
  const adds = w.migrations.filter((m) => /ALTER TYPE\s+"SmsPurpose"\s+ADD VALUE\s+(IF NOT EXISTS\s+)?'MARKETING'/.test(m.sql));
  const alone = adds.length === 1 && sqlStatements(adds[0].sql).trim().split(";").map((x) => x.trim()).filter(Boolean).length === 1;
  ok(p(L.s11), alone, adds.map((m) => m.folder).join(", ") || "none");

  const tables = tablesMigration(w);
  const tsql = tables ? tables.sql : "";
  const enums = schemaEnumNames(w.schema);

  // ── §1.2 · the order ───────────────────────────────────────────────────────────────────────
  await check(p(L.s12), () => [adds.length === 1 && tables !== null && adds[0].folder < tables.folder,
    `${adds[0]?.folder ?? "no ADD VALUE"} < ${tables?.folder ?? "no tables migration"}`]);

  // ── §1.3 · created once ────────────────────────────────────────────────────────────────────
  await check(p(L.s13), () => {
    const creators = (re: RegExp) => w.migrations.filter((m) => re.test(sqlStatements(m.sql))).map((m) => m.folder);
    const objects = [
      ...TABLES.map((t) => creators(new RegExp(`CREATE TABLE "${t}" \\(`))),
      ...NEW_TYPES.map((t) => creators(new RegExp(`CREATE TYPE "${t}" AS ENUM`))),
    ];
    const once = tables !== null && objects.every((f) => f.length === 1 && f[0] === tables.folder);
    return [once, objects.map((f, i) => `${[...TABLES, ...NEW_TYPES][i]}: ${f.join(",") || "none"}`).join(" · ")];
  });

  // ── §1.4 · every other index, under Prisma's names ─────────────────────────────────────────
  await check(p(L.s14), () => {
    const diffs: string[] = [];
    for (const t of TABLES) {
      const want = schemaIndexes(schemaModel(w.schema, t), t).filter((i) => i.name !== ONE_KEY).map(idxText);
      const got = migrationIndexes(tsql, t).filter((i) => i.name !== ONE_KEY).map(idxText);
      for (const x of want) if (!got.includes(x)) diffs.push(`${t}: schema has ${x}, the migration does not`);
      for (const x of got) if (!want.includes(x)) diffs.push(`${t}: the migration has ${x}, the schema does not`);
      if (want.length === 0) diffs.push(`${t}: no index parsed from the schema`);
    }
    return [diffs.length === 0, diffs.join(" · ") || "indexes agree"];
  });

  // ── §1.5 · the columns, one by one ─────────────────────────────────────────────────────────
  await check(p(L.s15), () => {
    const diffs: string[] = [];
    for (const t of TABLES) {
      const want = schemaColumns(schemaModel(w.schema, t), enums);
      const got = migrationColumns(tsql, t);
      if (want.size < 20 || got.size < 20) diffs.push(`${t}: parsed ${want.size} schema / ${got.size} migration columns`);
      for (const k of new Set([...want.keys(), ...got.keys()])) {
        const a = colText(want.get(k)), b = colText(got.get(k));
        if (a !== b) diffs.push(`${t}.${k}: schema ${a} · migration ${b}`);
      }
    }
    return [diffs.length === 0, diffs.slice(0, 4).join(" · ") || "every column agrees"];
  });

  // ── §1.6 · no CASCADE link ─────────────────────────────────────────────────────────────────
  await check(p(L.s16), () => {
    const want = ["campaignId>SmsCampaign:RESTRICT", "contactId>MarketingContact:SET NULL", "userId>User:SET NULL"];
    const fks = migrationFks(tsql, "SmsCampaignRecipient");
    const got = fks.map((f) => `${f.col}>${f.ref}:${f.onDelete}`);
    const named = fks.every((f) => f.name === `SmsCampaignRecipient_${f.col}_fkey`);
    const rel = schemaRelations(schemaModel(w.schema, "SmsCampaignRecipient")).map((r) => `${r.col}>${r.ref}:${r.onDelete}`);
    const relWant = ["campaignId>SmsCampaign:Restrict", "contactId>MarketingContact:SetNull", "userId>User:SetNull"];
    const noCascadeSql = !/ON DELETE CASCADE/.test(sqlStatements(tsql));
    const noCascadeSchema = TABLES.every((t) => !/onDelete:\s*Cascade/.test(schemaModel(w.schema, t).split("\n").map(uncomment).join("\n")));
    return [sameSet(got, want) && named && sameSet(rel, relWant) && noCascadeSql && noCascadeSchema,
      `migration [${got.join(", ")}] · schema [${rel.join(", ")}] · names ${named} · cascade-free ${noCascadeSql}/${noCascadeSchema}`];
  });

  // ── §1.7 · expand-only ─────────────────────────────────────────────────────────────────────
  await check(p(L.s17), () => {
    const sql = sqlStatements(tsql);
    const stmts = sql.split(";").map((x) => x.trim()).filter(Boolean);
    const SHAPE = /^(CREATE TYPE "\w+" AS ENUM|CREATE TABLE "(SmsCampaign|SmsCampaignRecipient)" \(|CREATE (UNIQUE )?INDEX "\w+" ON "(SmsCampaign|SmsCampaignRecipient)"\(|ALTER TABLE "SmsCampaignRecipient" ADD CONSTRAINT "\w+" FOREIGN KEY)/;
    const odd = stmts.filter((s) => !SHAPE.test(s));
    // ⚠️ `DELETE FROM`, not the bare word: every foreign key here legitimately says `ON DELETE …`.
    const banned = /\b(DROP|RENAME|CONCURRENTLY|TRUNCATE)\b|DELETE\s+FROM|ALTER\s+TYPE|'MARKETING'/i.exec(sql);
    return [tables !== null && stmts.length >= 10 && odd.length === 0 && banned === null,
      `${stmts.length} statements · odd: ${odd.map((s) => s.slice(0, 50)).join(" | ") || "none"} · banned: ${banned?.[0] ?? "none"}`];
  });

  // ── §1.8 · the enums, three ways (four for the encoding) ───────────────────────────────────
  const enumBody = (w.schema.match(/enum SmsPurpose \{([\s\S]*?)\}/) ?? ["", ""])[1];
  const enumValues = enumBody.split("\n").map((l) => l.trim()).filter((l) => /^[A-Z_]+$/.test(l)).sort();
  const unionText = (w.store.match(/export type SmsPurpose = ([^;]+);/) ?? ["", ""])[1];
  const unionValues = Array.from(unionText.matchAll(/"([A-Z_]+)"/g)).map((m) => m[1]).sort();
  ok(p(L.s18), enumValues.includes("MARKETING") && enumValues.join(",") === unionValues.join(","),
    `schema [${enumValues}] · store [${unionValues}]`);

  await check(p(L.s18b), () => {
    const s = schemaEnum(w.schema, "SmsCampaignStatus"), m = migrationEnum(tsql, "SmsCampaignStatus");
    const t = tsUnion(w.store, "SmsCampaignStatus"), c = [...CM.SMS_CAMPAIGN_STATUSES];
    return [s.length === 7 && same(s, m) && sameSet(s, t) && same(s, c) && !s.some((v) => /APPROV/.test(v)),
      `schema [${s}] · migration [${m}] · store [${t}] · campaign-model [${c}]`];
  });
  await check(p(L.s18c), () => {
    const s = schemaEnum(w.schema, "SmsCampaignRecipientStatus"), m = migrationEnum(tsql, "SmsCampaignRecipientStatus");
    const t = tsUnion(w.store, "SmsCampaignRecipientStatus"), c = [...CM.SMS_CAMPAIGN_RECIPIENT_STATUSES];
    return [s.length === 6 && s.includes("HELD") && same(s, m) && sameSet(s, t) && same(s, c),
      `schema [${s}] · migration [${m}] · store [${t}] · campaign-model [${c}]`];
  });
  await check(p(L.s18d), () => {
    const s = schemaEnum(w.schema, "SmsEncoding"), m = migrationEnum(tsql, "SmsEncoding"), c = tsUnion(w.smsCompose, "SmsEncoding");
    const typed = /\bcodingSw: SmsEncoding;/.test(w.store) && /\bcodingEn: SmsEncoding \| null;/.test(w.store)
      && /import type \{ SmsEncoding \} from "@\/lib\/sms-compose";/.test(w.store);
    return [s.length === 2 && same(s, m) && sameSet(s, c) && typed, `schema [${s}] · migration [${m}] · sms-compose [${c}] · store typed ${typed}`];
  });

  // ── §1.9 · Timestamptz(3), everywhere ──────────────────────────────────────────────────────
  await check(p(L.s19), () => {
    const bad: string[] = [];
    let seen = 0;
    for (const t of TABLES) {
      for (const [k, c] of schemaColumns(schemaModel(w.schema, t), enums)) {
        if (!c.type.startsWith("TIMESTAMP")) continue;
        seen++;
        if (c.type !== "TIMESTAMPTZ(3)") bad.push(`schema ${t}.${k}`);
      }
      for (const [k, c] of migrationColumns(tsql, t)) if (/^TIMESTAMP(\(|$)/.test(c.type)) bad.push(`migration ${t}.${k}`);
    }
    return [seen >= 12 && bad.length === 0, bad.join(", ") || `${seen} timestamps, every one Timestamptz(3)`];
  });

  // ── §1.10 · no stored counter ──────────────────────────────────────────────────────────────
  await check(p(L.s110), () => {
    const ALLOWED = ["segmentsSw", "segmentsEn", "draftRevision", "audienceCount", "estimateSegments", "estimateTzs", "budgetTzs"];
    const NUMERIC = (type: string) => /^(INTEGER|BIGINT|DOUBLE PRECISION|REAL|SMALLINT|DECIMAL)/.test(type);
    const COUNTER = (k: string) => /^(sent|delivered|failed|skipped|held|pending|accepted|handedOver|total|recipients?|count)/i.test(k) || (/Count$/.test(k) && k !== "audienceCount");
    const fromSchema = [...schemaColumns(schemaModel(w.schema, "SmsCampaign"), enums)].filter(([, c]) => NUMERIC(c.type)).map(([k]) => k);
    const fromSql = [...migrationColumns(tsql, "SmsCampaign")].filter(([, c]) => NUMERIC(c.type)).map(([k]) => k);
    const allNames = [...schemaColumns(schemaModel(w.schema, "SmsCampaign"), enums).keys(), ...migrationColumns(tsql, "SmsCampaign").keys()];
    const extra = [...fromSchema, ...fromSql].filter((k) => !ALLOWED.includes(k));
    const named = allNames.filter(COUNTER);
    return [fromSchema.length >= 5 && extra.length === 0 && named.length === 0,
      `numeric [${[...new Set([...fromSchema, ...fromSql])]}] · not allowed [${extra}] · counter-named [${named}]`];
  });

  // ── §1.11 · links, never copies ────────────────────────────────────────────────────────────
  await check(p(L.s111), () => {
    const cols = [...schemaColumns(schemaModel(w.schema, "SmsCampaignRecipient"), enums).keys()];
    const copies = cols.filter((k) => /^(displayName|name|email|phoneE164|phone|firstName|lastName|fullName)$/i.test(k));
    const back = (model: string) => /^\s*\w+\s+SmsCampaignRecipient\[\]/m.test(schemaModel(w.schema, model).split("\n").map(uncomment).join("\n"));
    return [cols.includes("msisdn") && cols.includes("contactId") && cols.includes("userId") && copies.length === 0 && back("User") && back("MarketingContact"),
      `copied columns [${copies}] · back-relations User ${back("User")} / MarketingContact ${back("MarketingContact")}`];
  });

  // ── §2 · the rules, EXECUTED on the memory twin ────────────────────────────────────────────
  const maps = mem();
  maps.smsCampaigns.clear();
  maps.smsCampaignRecipients.clear();
  maps.recipientsByCampaignMsisdn.clear();
  const C = w.twin.campaign, R = w.twin.recipient;

  await check(p(L.s20), async () => {
    const created = await C.create(draft("cmp_control"));
    return [process.env.DATABASE_URL === undefined && created.id === "cmp_control" && mem().smsCampaigns.has("cmp_control"),
      `${mem().smsCampaigns.size} campaign(s) in the memory map`];
  });

  await check(p(L.s21), async () => {
    const key = declaredOneKey(w);
    await C.create(draft("cmp_dedupe"));
    const people = Array.from({ length: 1000 }, (_, i) => keyOf(i));
    const first = await R.createMany(people.map((m, i) => seed(`rcp_d1_${i}`, "cmp_dedupe", m)));
    // The same 1,000 people with RE-MINTED ids, as a restarted enqueue mints them, shuffled among 200 new ones.
    const again = shuffled([
      ...people.map((m, i) => seed(`rcp_d2_${i}`, "cmp_dedupe", m)),
      ...Array.from({ length: 200 }, (_, i) => seed(`rcp_d3_${i}`, "cmp_dedupe", keyOf(1000 + i))),
    ], 35);
    let inserted = 0, duplicates = 0;
    for (const part of chunks(again, CM.SMS_CAMPAIGN_SEED_CHUNK_MAX)) {
      const r = await R.createMany(part);
      inserted += r.inserted;
      duplicates += r.duplicates;
    }
    const counts = await R.countByStatus("cmp_dedupe");
    const pending = counts.find((c) => c.status === "PENDING")?.count ?? -1;
    const rows = Array.from(mem().smsCampaignRecipients.values()).filter((r) => r.campaignId === "cmp_dedupe").length;
    return [first.inserted === 1000 && first.duplicates === 0 && inserted === 200 && duplicates === 1000
        && pending === 1200 && total(counts) === 1200 && rows === 1200 && key.schema && key.migration,
      `first ${first.inserted}+${first.duplicates}dup · again ${inserted}+${duplicates}dup · PENDING ${pending} · rows ${rows} · key in schema ${key.schema} · in migration ${key.migration}`];
  });

  await check(p(L.s22), async () => {
    await C.create(draft("cmp_key_b"));
    await C.create(draft("cmp_key_c"));
    const b = await R.createMany([seed("rcp_kb_0", "cmp_key_b", keyOf(4000))]);
    const c = await R.createMany([seed("rcp_kc_0", "cmp_key_c", keyOf(4000))]);
    const nb = total(await R.countByStatus("cmp_key_b")), nc = total(await R.countByStatus("cmp_key_c"));
    return [b.inserted === 1 && c.inserted === 1 && c.duplicates === 0 && nb === 1 && nc === 1,
      `campaign b +${b.inserted} · campaign c +${c.inserted} (${c.duplicates} dup) · rows ${nb}/${nc}`];
  });

  await check(p(L.s23), async () => {
    await C.create(draft("cmp_whole"));
    // A person already on the campaign, re-seeded with a link to a contact that does not exist: Postgres skips the row
    // at ON CONFLICT and never checks its link, so the batch is NOT refused — it is one duplicate.
    await R.createMany([seed("rcp_w_held", "cmp_whole", keyOf(5100))]);
    const heldAgain = await R.createMany([{ ...seed("rcp_w_held_again", "cmp_whole", keyOf(5100)), contactId: "mc_missing" }]);
    const heldSkipped = heldAgain.inserted === 0 && heldAgain.duplicates === 1;
    const size = () => mem().smsCampaignRecipients.size;
    const before = size();
    const ok3 = [0, 1, 2].map((i) => seed(`rcp_w_${i}`, "cmp_whole", keyOf(5000 + i)));
    const refusals = {
      plus: await throws(() => R.createMany([...ok3, seed("rcp_w_plus", "cmp_whole", `+${keyOf(5003)}`)])),
      local: await throws(() => R.createMany([...ok3, seed("rcp_w_local", "cmp_whole", `0${keyOf(5004).slice(3)}`)])),
      tooMany: await throws(() => R.createMany(Array.from({ length: CM.SMS_CAMPAIGN_SEED_CHUNK_MAX + 1 }, (_, i) => seed(`rcp_w_many_${i}`, "cmp_whole", keyOf(6000 + i))))),
      noCampaign: await throws(() => R.createMany([...ok3, seed("rcp_w_orphan", "cmp_missing", keyOf(5005))])),
      noContact: await throws(() => R.createMany([...ok3, { ...seed("rcp_w_contact", "cmp_whole", keyOf(5006)), contactId: "mc_missing" }])),
      sameId: await throws(() => R.createMany([seed("rcp_w_dup", "cmp_whole", keyOf(5007)), seed("rcp_w_dup", "cmp_whole", keyOf(5008))])),
      settles: await throws(() => R.createMany([{ ...seed("rcp_w_settled", "cmp_whole", keyOf(5009)), status: "SENT" } as unknown as SmsCampaignRecipientSeed])),
    };
    const after = size();
    const allRefused = Object.values(refusals).every(Boolean);
    return [allRefused && after === before && heldSkipped,
      `${Object.entries(refusals).filter(([, v]) => !v).map(([k]) => k).join(", ") || "every batch refused"} · rows ${before} → ${after} · a held key with a dangling link ${heldSkipped ? "skipped" : `answered ${JSON.stringify(heldAgain)}`}`];
  });

  await check(p(L.s24), async () => {
    const id = "cmp_frozen";
    await C.create(draft(id, { audienceFilter: FILTER_GIVEN }));
    const NEW_BODY = "50pick: Ofa mpya leo.";
    const saved = await C.update(id, { bodySw: NEW_BODY, codingSw: "GSM7", segmentsSw: 1 }, { draftRevision: 0 }, at(2));
    const confirmed = await C.transition(id, { from: ["DRAFT"], to: "CONFIRMED", patch: CONFIRM, draftRevision: 1, at: at(3) });
    const widened = await C.update(id, { audienceFilter: FILTER_WHOLE_BOOK }, { draftRevision: 1 }, at(4));
    const frozenKeyAfter = await throws(() => C.transition(id, { from: ["CONFIRMED"], to: null, patch: { audienceCount: 999999 }, draftRevision: 1, at: at(5) }));
    const backToDraft = await throws(() => C.transition(id, { from: ["CONFIRMED"], to: "DRAFT", patch: {}, draftRevision: null, at: at(5) }));
    const statusByPatch = await throws(() => C.update(id, { status: "DRAFT" } as unknown as SmsCampaignDraftPatch, { draftRevision: 1 }, at(5)));
    const row = await C.find(id);
    return [saved?.draftRevision === 1 && saved?.bodySw === NEW_BODY && confirmed?.status === "CONFIRMED" && widened === null && frozenKeyAfter && backToDraft && statusByPatch
        && row?.status === "CONFIRMED" && row.bodySw === NEW_BODY && row.audienceFilter === FILTER_GIVEN && row.audienceCount === 1200
        && row.confirmedBy === OFFICER && row.draftRevision === 1,
      `save rev ${saved?.draftRevision} (${saved?.bodySw === NEW_BODY ? "text stored" : "TEXT LOST"}) · ${confirmed?.status} · widening ${widened === null ? "refused" : "WRITTEN"} · frozen key after DRAFT ${frozenKeyAfter ? "refused" : "WRITTEN"} · back to DRAFT ${backToDraft ? "refused" : "ALLOWED"} · stored ${row?.audienceFilter} (${row?.status}, ${row?.audienceCount})`];
  });

  await check(p(L.s25), async () => {
    const id = "cmp_race";
    await C.create(draft(id));
    await C.transition(id, { from: ["DRAFT"], to: "CONFIRMED", patch: CONFIRM, draftRevision: 0, at: at(2) });
    await C.transition(id, { from: ["CONFIRMED"], to: "PREPARING", patch: { startedAt: at(3) }, draftRevision: null, at: at(3) });
    await C.transition(id, { from: ["PREPARING"], to: "RUNNING", patch: { enqueueCursor: "done", enqueuedAt: at(4) }, draftRevision: null, at: at(4) });
    const raced = await Promise.all([
      C.transition(id, { from: ["RUNNING"], to: "PAUSED", patch: { stopReason: "officer_pause", pausedAt: at(5) }, draftRevision: null, at: at(5) }),
      C.transition(id, { from: ["RUNNING"], to: "CANCELLED", patch: { stopReason: "officer_stop", finishedAt: at(5) }, draftRevision: null, at: at(5) }),
    ]);
    const winners = raced.filter((r) => r !== null);
    const row = await C.find(id);
    const third = await C.transition(id, { from: ["RUNNING"], to: "DONE", patch: { finishedAt: at(6) }, draftRevision: null, at: at(6) });
    const after = await C.find(id);
    return [winners.length === 1 && row?.status === winners[0]?.status && row?.stopReason === winners[0]?.stopReason
        && third === null && after?.status === row?.status,
      `${winners.length} winner(s) · final ${row?.status} (${row?.stopReason}) · a third writer from RUNNING ${third === null ? "refused" : "WON"}`];
  });

  await check(p(L.s26), async () => {
    const id = "cmp_revision";
    await C.create(draft(id));
    const A = "50pick: toleo A.", B = "50pick: toleo B.";
    const saves = await Promise.all([
      C.update(id, { bodySw: A, codingSw: "GSM7", segmentsSw: 1 }, { draftRevision: 0 }, at(2)),
      C.update(id, { bodySw: B, codingSw: "GSM7", segmentsSw: 1 }, { draftRevision: 0 }, at(2)),
    ]);
    const winners = saves.filter((r) => r !== null);
    const row = await C.find(id);
    const stale = await C.update(id, { name: "A late save" }, { draftRevision: 0 }, at(3));
    const noRevision = await throws(() => C.update(id, { name: "No revision" }, {} as unknown as SmsCampaignDraftGuard, at(3)));
    const after = await C.find(id);
    const stored = row?.bodySw ?? "";
    return [winners.length === 1 && row?.draftRevision === 1 && (stored === A || stored === B) && stored === winners[0]?.bodySw
        && stale === null && noRevision && after?.name === draft(id).name && after?.draftRevision === 1,
      `${winners.length} save(s) landed · revision ${row?.draftRevision} · stored "${stored}" · stale ${stale === null ? "refused" : "WRITTEN"} · no revision ${noRevision ? "refused" : "ACCEPTED"}`];
  });

  await check(p(L.s27), async () => {
    await C.create(draft("cmp_counts"));
    await R.createMany([0, 1, 2].map((i) => seed(`rcp_c_${i}`, "cmp_counts", keyOf(7000 + i))));
    const some = await R.countByStatus("cmp_counts");
    const none = await R.countByStatus("cmp_nobody");
    const order = schemaEnum(w.schema, "SmsCampaignRecipientStatus");
    return [order.length === 6 && same(some.map((c) => c.status), order) && same(none.map((c) => c.status), order)
        && some[0]?.status === "PENDING" && some[0]?.count === 3 && some.slice(1).every((c) => c.count === 0) && none.every((c) => c.count === 0),
      `[${some.map((c) => `${c.status} ${c.count}`).join(", ")}] · empty campaign [${none.map((c) => c.count).join(",")}]`];
  });

  await check(p(L.s28), async () => {
    await C.create(draft("cmp_born"));
    await R.createMany([seed("rcp_born_0", "cmp_born", keyOf(8000))]);
    const r = await R.find("rcp_born_0");
    const born = r !== null && r.status === "PENDING" && r.attempts === 0 && r.smsReference === null && r.claimToken === null
      && r.claimedAt === null && r.costTzs === null && r.gateTrail === null && r.locale === null && r.sentAt === null && r.updatedAt === r.createdAt;
    const { sourcePhrase: _absent, ...missingKey } = draft("cmp_born_m");
    const refused = {
      confirmed: await throws(() => C.create(draft("cmp_born_c", { status: "CONFIRMED" }))),
      counted: await throws(() => C.create(draft("cmp_born_n", { audienceCount: 10 }))),
      ids: await throws(() => C.create(draft("cmp_born_i", { audienceFilter: '{"ids":["mc_1"]}' }))),
      loose: await throws(() => C.create(draft("cmp_born_l", { audienceFilter: '{ "consent": ["GIVEN"] }' }))),
      extraKey: await throws(() => C.create({ ...draft("cmp_born_x"), sentCount: 0 } as unknown as StoredSmsCampaign)),
      missingKey: await throws(() => C.create(missingKey as unknown as StoredSmsCampaign)),
    };
    const written = ["cmp_born_c", "cmp_born_n", "cmp_born_i", "cmp_born_l", "cmp_born_x", "cmp_born_m"].filter((x) => mem().smsCampaigns.has(x));
    return [born && Object.values(refused).every(Boolean) && written.length === 0,
      `born ${born ? "PENDING and unsettled" : JSON.stringify(r)} · accepted: ${Object.entries(refused).filter(([, v]) => !v).map(([k]) => k).join(", ") || "none"} · written [${written}]`];
  });

  // ── §2.9–§2.11 · the rule set itself, every refusal executed (both twins call it first: dal-parity §26.shape) ──
  const refusesT = (t: SmsCampaignTransition): boolean => { try { w.rules.assertTransitionShape(t); return false; } catch { return true; } };
  const refusesD = (patch: SmsCampaignDraftPatch, guard: SmsCampaignDraftGuard = { draftRevision: 0 }, stamp = at(9)): boolean => {
    try { w.rules.assertDraftPatch(patch, guard, stamp); return false; } catch { return true; }
  };
  const refusesN = (row: StoredSmsCampaign): boolean => { try { w.rules.assertNewCampaign(row); return false; } catch { return true; } };
  /** Every input that must be refused IS, and every input that must pass DOES — a rule that refuses everything is no rule. */
  const verdicts = (refused: Array<[string, boolean]>, passed: Array<[string, boolean]>): [boolean, string] => {
    const letThrough = refused.filter(([, r]) => !r).map(([n]) => n);
    const blocked = passed.filter(([, r]) => r).map(([n]) => n);
    return [letThrough.length === 0 && blocked.length === 0, `let through: [${letThrough.join("; ")}] · wrongly refused: [${blocked.join("; ")}]`];
  };
  const T = (o: Partial<SmsCampaignTransition>): SmsCampaignTransition =>
    ({ from: ["RUNNING"], to: "PAUSED", patch: { pausedAt: at(9) }, draftRevision: null, at: at(9), ...o });
  const CT = (patch: SmsCampaignTransitionPatch, o: Partial<SmsCampaignTransition> = {}): SmsCampaignTransition =>
    ({ from: ["DRAFT"], to: "CONFIRMED", patch, draftRevision: 0, at: at(9), ...o });
  const HEX = "0123456789abcdef0123456789abcdef";
  const { estimateTzs: _money, ...withoutMoney } = CONFIRM;

  await check(p(L.s29), () => verdicts([
    ["to inside from — two racers would both win", refusesT(T({ from: ["RUNNING", "PAUSED"], to: "PAUSED" }))],
    ["out of a terminal status", refusesT(T({ from: ["DONE"], to: "RUNNING", patch: {} }))],
    ["a write onto a terminal row", refusesT(T({ from: ["CANCELLED"], to: null, patch: { stopReason: "late" } }))],
    ["back to DRAFT", refusesT(T({ from: ["CONFIRMED"], to: "DRAFT", patch: {} }))],
    ["a DRAFT skipping its confirmation", refusesT(T({ from: ["DRAFT"], to: "RUNNING", patch: {} }))],
    ["a move outside the lifecycle", refusesT(T({ from: ["CONFIRMED"], to: "DONE", patch: {} }))],
    ["no from", refusesT(T({ from: [] }))],
    ["an unknown status", refusesT(T({ from: ["SENDING" as never] }))],
    ["a status named twice", refusesT(T({ from: ["RUNNING", "RUNNING"] }))],
    ["a draft key in a transition", refusesT(T({ patch: { bodySw: "x" } as unknown as SmsCampaignTransitionPatch }))],
    ["the status in a patch", refusesT(T({ patch: { status: "DONE" } as unknown as SmsCampaignTransitionPatch }))],
    ["nothing moved and nothing written", refusesT(T({ to: null, patch: {} }))],
    ["at in another spelling", refusesT(T({ at: "2026-10-02 09:00" }))],
    ["a phone number as the cursor", refusesT(T({ from: ["PREPARING"], to: null, patch: { enqueueCursor: "b:255712345678" } }))],
    ["an instant in another spelling", refusesT(T({ patch: { pausedAt: "2026-10-02" } }))],
  ], [
    ["Pause from RUNNING or PREPARING", refusesT(T({ from: ["RUNNING", "PREPARING"], to: "PAUSED", patch: { stopReason: "officer_pause", pausedAt: at(9) } }))],
    ["Stop from every live status", refusesT(T({ from: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], to: "CANCELLED", patch: { finishedAt: at(9) } }))],
    ["Resume an interrupted enqueue", refusesT(T({ from: ["PAUSED"], to: "PREPARING", patch: {} }))],
    ["a book cursor written while PREPARING", refusesT(T({ from: ["PREPARING"], to: null, patch: { enqueueCursor: "b:mc_seed_000123" } }))],
    ["the walk finished", refusesT(T({ from: ["PREPARING"], to: "RUNNING", patch: { enqueueCursor: "done", enqueuedAt: at(9) } }))],
    ["a draft cancelled", refusesT(T({ from: ["DRAFT"], to: "CANCELLED", patch: { stopReason: "officer_cancel", finishedAt: at(9) } }))],
  ]));

  await check(p(L.s210), () => verdicts([
    ["a confirmation field without the move to CONFIRMED", refusesT({ from: ["DRAFT"], to: null, patch: { audienceCount: 5 }, draftRevision: 0, at: at(9) })],
    ["a frozen key after DRAFT", refusesT({ from: ["CONFIRMED"], to: null, patch: { audienceCount: 5 }, draftRevision: 0, at: at(9) })],
    ["a confirmation of anything but a DRAFT", refusesT(CT(CONFIRM, { from: ["PAUSED"] }))],
    ["a confirmation without the officer's revision", refusesT(CT(CONFIRM, { draftRevision: null }))],
    ["no one confirmed it", refusesT(CT({ ...CONFIRM, confirmedBy: null }))],
    ["no time it was confirmed", refusesT(CT({ ...CONFIRM, confirmedAt: null }))],
    ["a confirmation of nobody", refusesT(CT({ ...CONFIRM, audienceCount: 0 }))],
    ["a population that is not a whole number", refusesT(CT({ ...CONFIRM, audienceCount: 2.5 }))],
    ["a population beyond Postgres INTEGER", refusesT(CT({ ...CONFIRM, audienceCount: 2147483648 }))],
    ["no tier", refusesT(CT({ ...CONFIRM, confirmTier: null }))],
    ["a tier in another spelling", refusesT(CT({ ...CONFIRM, confirmTier: "typed" as never }))],
    ["a typed tier carrying a watermark", refusesT(CT({ ...CONFIRM, audienceWatermark: HEX }))],
    ["an enumerate tier without its keyed watermark", refusesT(CT({ ...CONFIRM, confirmTier: "ENUMERATE", audienceWatermark: null, audienceCount: 3 }))],
    ["a watermark that is not U40's keyed hex", refusesT(CT({ ...CONFIRM, confirmTier: "ENUMERATE", audienceWatermark: "not-a-key", audienceCount: 3 }))],
    ["no frozen segment estimate", refusesT(CT({ ...CONFIRM, estimateSegments: null }))],
    ["the money estimate left out", refusesT(CT(withoutMoney))],
    ["money with a third decimal", refusesT(CT({ ...CONFIRM, estimateTzs: 7200.555 }))],
  ], [
    ["a typed confirmation", refusesT(CT(CONFIRM))],
    ["an enumerate confirmation with its keyed watermark", refusesT(CT({ ...CONFIRM, confirmTier: "ENUMERATE", audienceWatermark: HEX, audienceCount: 3 }))],
    ["a confirmation whose price is not yet measured", refusesT(CT({ ...CONFIRM, estimateTzs: null }))],
  ]));

  await check(p(L.s211), () => {
    const [good, detail] = verdicts([
      ["a Swahili body without its saved verdict", refusesD({ bodySw: "50pick: mpya." })],
      ["an English body without its coding", refusesD({ bodyEn: "50pick: new.", segmentsEn: 1 })],
      ["English half removed", refusesD({ bodyEn: null, codingEn: "GSM7", segmentsEn: 1 })],
      ["the name emptied", refusesD({ name: null } as unknown as SmsCampaignDraftPatch)],
      ["a coding that is neither GSM7 nor UCS2", refusesD({ bodySw: "x", codingSw: "GSM-7" as never, segmentsSw: 1 })],
      ["zero segments", refusesD({ bodySw: "x", codingSw: "GSM7", segmentsSw: 0 })],
      ["a segment count beyond Postgres INTEGER", refusesD({ bodySw: "x", codingSw: "GSM7", segmentsSw: 2147483648 })],
      ["an empty Swahili body", refusesD({ bodySw: "", codingSw: "GSM7", segmentsSw: 1 })],
      ["a confirmation field in a draft save", refusesD({ audienceCount: 5 } as unknown as SmsCampaignDraftPatch)],
      ["an engine field in a draft save", refusesD({ stopReason: "x" } as unknown as SmsCampaignDraftPatch)],
      ["an ids audience", refusesD({ audienceFilter: '{"ids":["mc_1"]}' })],
      ["a revision that is not a whole number", refusesD({ name: "n" }, { draftRevision: 1.5 })],
      ["a stamp that is not an instant", refusesD({ name: "n" }, { draftRevision: 0 }, "yesterday")],
      ["an English body at birth without its coding", refusesN(draft("cmp_rule_en", { bodyEn: "50pick: new." }))],
      ["a birth stamp in another spelling", refusesN(draft("cmp_rule_at", { createdAt: "2026-10-02T09:00:00Z" }))],
    ], [
      ["a full Swahili save", refusesD({ bodySw: "50pick: mpya.", codingSw: "UCS2", segmentsSw: 2 }, { draftRevision: 3 })],
      ["English added whole", refusesD({ bodyEn: "50pick: new.", codingEn: "GSM7", segmentsEn: 1 })],
      ["English removed whole", refusesD({ bodyEn: null, codingEn: null, segmentsEn: null })],
      ["a name alone", refusesD({ name: "Renamed" })],
      ["a blank draft at birth", refusesN(draft("cmp_rule_ok"))],
      ["a draft born with English whole", refusesN(draft("cmp_rule_en2", { bodyEn: "50pick: new.", codingEn: "GSM7", segmentsEn: 1 }))],
    ]);
    const width = CM.SMS_CAMPAIGN_WATERMARK_HEX_CHARS === MEMBERS_KEY_HEX_CHARS;
    return [good && width, `${detail} · watermark width ${CM.SMS_CAMPAIGN_WATERMARK_HEX_CHARS} vs U40's ${MEMBERS_KEY_HEX_CHARS}`];
  });

  await check(p(L.s212), async () => {
    const contactId = "mc_u35b_link";
    // The PRODUCTION removal — U23's bulk remove, its where built by U24's ONE translation (`toAudienceWhere`) — for
    // exactly this one contact, so the where follows every axis a later unit adds to the audience.
    const removeOne = () => contactAudienceWrites({ ...WHOLE_BOOK, ids: [contactId] }).remove();
    await removeOne(); // a leftover from an earlier run, if any
    await db.marketingContact.create({
      id: contactId, msisdn: keyOf(9000), rawInput: "0710009000", displayName: null, email: null, ndc: "71", operator: null,
      source: "OPERATOR", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null,
      importId: null, createdAt: at(0), createdBy: null, updatedAt: at(0), updatedBy: null,
    });
    await C.create(draft("cmp_link"));
    await R.createMany([{ ...seed("rcp_link_0", "cmp_link", keyOf(9000)), contactId }]);
    const linked = (await R.find("rcp_link_0"))?.contactId ?? null;
    const removed = await removeOne();
    const after = await R.find("rcp_link_0");
    return [linked === contactId && removed.changed === 1 && after !== null && after.contactId === null && after.msisdn === keyOf(9000),
      `linked ${linked} · removed ${removed.changed} · the recipient ${after === null ? "ROW GONE" : `kept, link ${after.contactId}`}`];
  });

  // ── §3.1 · the MARKETING writer population ─────────────────────────────────────────────────
  const writers = w.src.filter((f) => /purpose\s*:\s*["']MARKETING["']/.test(f.text)).map((f) => f.path);
  const undeclared = writers.filter((f) => !MARKETING_WRITERS.includes(f));
  ok(p(L.s31), undeclared.length === 0, undeclared.join(", ") || `${w.src.length} files scanned`);
}

if (!PROVE_RED) {
  await run(REAL, "");
  console.log(`\ncampaign-models: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await run(REAL, "base:");
  if (fail) problems.push(`BASELINE red: ${failed.join(" | ")}`);

  /* ── THE PLANTS — each a defect as somebody would write it, in memory ── */
  const addFile = REAL.migrations.find((m) => /ALTER TYPE\s+"SmsPurpose"\s+ADD VALUE/.test(m.sql));
  const tablesFolder = tablesMigration(REAL)?.folder ?? "";
  /** One exact text plant: the `from` must sit in the text EXACTLY once, or the case reports its plant missing. */
  const plant = (text: string, from: string, to: string): string => {
    const n = text.split(from).length - 1;
    if (n !== 1) throw new Error(`the plant's anchor matches ${n} times: ${from.slice(0, 60)}`);
    return text.replace(from, () => to);
  };
  /** One exact text plant INSIDE one model's block (`schemaModel`), so a later model that spells a column the same way
   *  (U29's ContactImport has a pausedAt too) can never make an anchor match twice. */
  const withModel = (model: string, from: string, to: string): World => {
    const block = schemaModel(REAL.schema, model);
    if (block === "") throw new Error(`the schema has no model ${model}`);
    return { ...REAL, schema: REAL.schema.replace(block, () => plant(block, from, to)) };
  };
  /** ⚠️ The plant edits the LF-normalised text, so a CRLF checkout of the migration cannot make an anchor vanish. */
  const withTablesSql = (edit: (sql: string) => string): World => ({
    ...REAL, migrations: REAL.migrations.map((m) => (m.folder === tablesFolder ? { ...m, sql: edit(lf(m.sql)) } : m)),
  });
  const withCampaign = (o: Partial<CampaignNs>): World => ({ ...REAL, twin: { ...REAL.twin, campaign: { ...REAL.twin.campaign, ...o } } });
  const withRecipient = (o: Partial<RecipientNs>): World => ({ ...REAL, twin: { ...REAL.twin, recipient: { ...REAL.twin.recipient, ...o } } });
  const withRules = (o: Partial<Rules>): World => ({ ...REAL, rules: { ...REAL.rules, ...o } });
  /** A rule with ONE refusal deleted: an input matching `skip` passes unchecked; everything else meets the real rule. */
  const lets = <A extends unknown[]>(real: (...a: A) => void, skip: (...a: A) => boolean) => (...a: A): void => { if (!skip(...a)) real(...a); };
  /** The keys a patch sets — written without the rule set, as the plants do. */
  const definedOnly = (o: object): Record<string, unknown> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  /** A recipient row born from a seed, written by hand for the plants. */
  const bornRow = (s: SmsCampaignRecipientSeed): StoredSmsCampaignRecipient => ({
    ...s, status: "PENDING", smsReference: null, locale: null, failureClass: null, error: null, skipReason: null,
    skipDetail: null, claimToken: null, claimedAt: null, attempts: 0, segments: null, bodyLen: null, costTzs: null,
    gateTrail: null, updatedAt: s.createdAt, sentAt: null, deliveredAt: null, failedAt: null,
  });
  const writeCampaign = (row: StoredSmsCampaign): StoredSmsCampaign => { mem().smsCampaigns.set(row.id, row); return { ...row }; };

  const CASES: Array<{ name: string; expect: string; build: () => World }> = [
    /* ── U35a's three, unchanged ── */
    {
      name: "R3 · the ADD VALUE file also creates a table — Postgres refuses the new value in that transaction (55P04)",
      expect: L.s11,
      build: () => ({ ...REAL, migrations: REAL.migrations.map((m) => (m === addFile ? { ...m, sql: `${m.sql}\nCREATE TABLE "SmsCampaign" ("id" TEXT NOT NULL);\n` } : m)) }),
    },
    {
      name: "the store's union forgets MARKETING — the schema and the code disagree on the lanes",
      expect: L.s18,
      build: () => ({ ...REAL, store: REAL.store.replace(/export type SmsPurpose = ([^;]+);/, 'export type SmsPurpose = "OTP" | "INVITE" | "OPS";') }),
    },
    {
      name: "R14 · an undeclared file sends with purpose MARKETING",
      expect: L.s31,
      build: () => ({ ...REAL, src: [...REAL.src, { path: "src/lib/server/marketing/rogue.ts", text: 'await sendBatch([{ to, body, purpose: "MARKETING" }]);' }] }),
    },
    /* ── U35b · the plan's RED line ── */
    {
      name: "⭐ a CASCADE link — deleting a contact would erase the record that we messaged them (the migration's contactId FK)",
      expect: L.s16,
      build: () => withTablesSql((sql) => plant(sql, `REFERENCES "MarketingContact"("id") ON DELETE SET NULL`, `REFERENCES "MarketingContact"("id") ON DELETE CASCADE`)),
    },
    {
      name: "a CASCADE link in the schema — the campaign relation onDelete: Cascade",
      expect: L.s16,
      build: () => withModel("SmsCampaignRecipient", "@relation(fields: [campaignId], references: [id], onDelete: Restrict)", "@relation(fields: [campaignId], references: [id], onDelete: Cascade)"),
    },
    {
      name: "⭐ a stored counter — SmsCampaign gains sentCount Int @default(0) (OD26)",
      expect: L.s110,
      build: () => withModel("SmsCampaign", "  stopReason        String?\n", "  stopReason        String?\n  sentCount         Int                    @default(0)\n"),
    },
    {
      name: "⭐ a frozen audience widened after DRAFT — the draft save writes whatever the status and the revision",
      expect: L.s24,
      build: () => withCampaign({
        update: async (id, patch, _guard, stamp) => {
          const row = mem().smsCampaigns.get(id);
          return row ? writeCampaign({ ...row, ...definedOnly(patch), draftRevision: row.draftRevision + 1, updatedAt: stamp } as StoredSmsCampaign) : null;
        },
      }),
    },
    {
      name: "a frozen key written by a transition outside DRAFT — the rule set skipped, the from-check kept",
      expect: L.s24,
      build: () => withCampaign({
        transition: async (id, t) => {
          const row = mem().smsCampaigns.get(id);
          if (!row || !t.from.includes(row.status)) return null;
          return writeCampaign({ ...row, ...definedOnly(t.patch), status: t.to ?? row.status, updatedAt: t.at } as StoredSmsCampaign);
        },
      }),
    },
    {
      name: "⭐ an unconditional transition — the status is set by id, `from` never checked",
      expect: L.s25,
      build: () => withCampaign({
        transition: async (id, t) => {
          CM.assertTransitionShape(t);
          const row = mem().smsCampaigns.get(id);
          return row ? writeCampaign({ ...row, ...definedOnly(t.patch), status: t.to ?? row.status, updatedAt: t.at } as StoredSmsCampaign) : null;
        },
      }),
    },
    {
      name: "⭐ the recipient unique index removed from the SCHEMA — the Prisma twin's skipDuplicates would dedupe on nothing",
      expect: L.s21,
      build: () => withModel("SmsCampaignRecipient", "  @@unique([campaignId, msisdn])\n", ""),
    },
    {
      name: "the recipient unique index removed from the MIGRATION",
      expect: L.s21,
      build: () => withTablesSql((sql) => plant(sql, `CREATE UNIQUE INDEX "SmsCampaignRecipient_campaignId_msisdn_key" ON "SmsCampaignRecipient"("campaignId", "msisdn");`, "")),
    },
    {
      name: "a memory createMany with no dedupe — a restarted enqueue puts 1,000 people on the campaign twice",
      expect: L.s21,
      build: () => withRecipient({
        createMany: async (seeds) => {
          CM.assertSeeds(seeds);
          for (const s of seeds) mem().smsCampaignRecipients.set(s.id, bornRow(s));
          return { inserted: seeds.length, duplicates: 0 };
        },
      }),
    },
    {
      name: "a key of msisdn only — a global unique: a person on one campaign can never be on a second",
      expect: L.s22,
      build: () => withRecipient({
        createMany: async (seeds) => {
          CM.assertSeeds(seeds);
          const m = mem();
          const held = new Set(Array.from(m.smsCampaignRecipients.values(), (r) => r.msisdn));
          let inserted = 0;
          for (const s of seeds) {
            if (held.has(s.msisdn) || m.smsCampaignRecipients.has(s.id)) continue;
            m.smsCampaignRecipients.set(s.id, bornRow(s));
            held.add(s.msisdn);
            inserted++;
          }
          return { inserted, duplicates: seeds.length - inserted };
        },
      }),
    },
    {
      name: "a partial batch — the +255 and 07 spellings dropped quietly and the rest written",
      expect: L.s23,
      build: () => withRecipient({
        createMany: async (seeds) => REAL.twin.recipient.createMany(seeds.filter((s) => isGatewayMsisdn(s.msisdn))),
      }),
    },
    {
      name: "a draft save without the revision compare — last write wins between two officers",
      expect: L.s26,
      build: () => withCampaign({
        update: async (id, patch, guard, stamp) => {
          CM.assertDraftPatch(patch, guard, stamp);
          const row = mem().smsCampaigns.get(id);
          if (!row || row.status !== "DRAFT") return null;
          return writeCampaign({ ...row, ...definedOnly(patch), draftRevision: row.draftRevision + 1, updatedAt: stamp } as StoredSmsCampaign);
        },
      }),
    },
    {
      name: "counts not zero-filled — only the statuses that have rows come back",
      expect: L.s27,
      build: () => withRecipient({
        countByStatus: async (campaignId) => {
          const raw = new Map<string, number>();
          for (const r of mem().smsCampaignRecipients.values()) if (r.campaignId === campaignId) raw.set(r.status, (raw.get(r.status) ?? 0) + 1);
          return Array.from(raw, ([status, count]) => ({ status: status as SmsCampaignRecipientStatus, count }));
        },
      }),
    },
    {
      name: "a campaign born CONFIRMED (or carrying a count, an ids audience or a loose filter) is accepted",
      expect: L.s28,
      build: () => withCampaign({ create: async (row) => writeCampaign({ ...row }) }),
    },
    /* ── U35b · the rest of §1, each assertion seen red ── */
    {
      name: "enum drift — the store's recipient-status union gains UNCONFIRMED that neither the schema nor the migration has",
      expect: L.s18c,
      build: () => ({ ...REAL, store: plant(REAL.store, `"FAILED" | "SKIPPED";`, `"FAILED" | "SKIPPED" | "UNCONFIRMED";`) }),
    },
    {
      name: "a naive timestamp — SmsCampaign.pausedAt loses @db.Timestamptz(3) (the consent-tie lesson)",
      expect: L.s19,
      build: () => withModel("SmsCampaign", "  pausedAt          DateTime?              @db.Timestamptz(3)\n", "  pausedAt          DateTime?\n"),
    },
    {
      name: "schema and migration drift — the migration forgets the stopReason column",
      expect: L.s15,
      build: () => withTablesSql((sql) => plant(sql, `    "stopReason" TEXT,\n`, "")),
    },
    {
      name: "an index the schema declares is missing from the migration — (campaignId, status)",
      expect: L.s14,
      build: () => withTablesSql((sql) => plant(sql, `CREATE INDEX "SmsCampaignRecipient_campaignId_status_idx" ON "SmsCampaignRecipient"("campaignId", "status");`, "")),
    },
    {
      name: "the tables migration also drops an index — no longer expand-only",
      expect: L.s17,
      build: () => withTablesSql((sql) => `${sql}\nDROP INDEX "SmsCampaign_createdAt_idx";\n`),
    },
    {
      name: "a copied person column — the recipient model gains displayName (D16: a link, never a copy)",
      expect: L.s111,
      build: () => withModel("SmsCampaignRecipient", "  skipDetail   String?\n", "  skipDetail   String?\n  displayName  String?\n"),
    },
    /* ── U35b · the rule set, one refusal deleted at a time ── */
    {
      name: "the rule set lets `to` inside `from` — two racing writers would both win",
      expect: L.s29,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.to !== null && t.from.includes(t.to)) }),
    },
    {
      name: "the rule set lets a finished campaign be written to or moved out of",
      expect: L.s29,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.from.some((s) => s === "DONE" || s === "CANCELLED")) }),
    },
    {
      name: "the rule set lets a DRAFT skip its confirmation and start running",
      expect: L.s29,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.from.includes("DRAFT") && t.to === "RUNNING") }),
    },
    {
      name: "the rule set takes a phone number as the enqueue cursor (X8)",
      expect: L.s29,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => typeof t.patch.enqueueCursor === "string" && /^[bp]:\d+$/.test(t.patch.enqueueCursor)) }),
    },
    {
      name: "the rule set lets a confirmation field be written without the move to CONFIRMED",
      expect: L.s210,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.to === null && t.patch.audienceCount !== undefined) }),
    },
    {
      name: "the rule set confirms a campaign without its frozen estimate (X15)",
      expect: L.s210,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.to === "CONFIRMED" && (t.patch.estimateSegments === null || t.patch.estimateTzs === undefined)) }),
    },
    {
      name: "the rule set lets a typed confirmation carry a watermark (X13)",
      expect: L.s210,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.patch.confirmTier === "TYPED" && t.patch.audienceWatermark !== null && t.patch.audienceWatermark !== undefined) }),
    },
    {
      name: "the rule set saves a body without its coding and segments — the estimate would price a message nobody sends",
      expect: L.s211,
      build: () => withRules({ assertDraftPatch: lets(CM.assertDraftPatch, (patch) => patch.bodySw !== undefined && patch.codingSw === undefined) }),
    },
    {
      name: "the rule set takes a half-removed English variant",
      expect: L.s211,
      build: () => withRules({ assertDraftPatch: lets(CM.assertDraftPatch, (patch) => patch.bodyEn === null && patch.codingEn !== null && patch.codingEn !== undefined) }),
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    let world: World;
    try {
      world = c.build();
    } catch (err) {
      problems.push(`case ${i + 1}: the plant did not apply — ${(err as Error).message}`);
      continue;
    }
    await run(world, tag);
    if (fail === 0) problems.push(`case ${i + 1} stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) { console.log("\nPROBLEMS:"); for (const x of problems) console.log(`  ✗ ${x}`); process.exitCode = 1; }
  else { console.log("RED PROOF COMPLETE"); process.exitCode = 0; }
}
