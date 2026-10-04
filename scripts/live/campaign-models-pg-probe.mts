/**
 * U35b · the campaign tables ON A REAL POSTGRES — the Prisma twin, which no suite on this laptop executes.
 *
 * ⭐ WHY THIS EXISTS. `test:campaign-models` §2 runs every rule on the MEMORY twin, and `test:dal-parity` §26 holds the
 * Prisma twin's SHAPE. Neither sends one statement to Postgres — and whether `createMany({ skipDuplicates })` really
 * dedupes on the unique index, whether the conditional `updateMany` really lets ONE of two racing writers through,
 * whether the links really RESTRICT and SET NULL, whether `audienceFilter` comes back byte for byte: those are facts
 * about the database. This writes to a scratch Postgres (embedded 18.3, `db-scratch`) through the REAL `db`, and checks
 * each fact against numbers written here by hand — an oracle independent of either twin.
 *
 * ⭐ §9 · U43-0 (S10 2026-10-04 — ENGINE-SPEC §4.2, decision E4): the UNCONFIRMED recipient status on the same cluster.
 * Every migration on disk applied from EMPTY (the runner resets and migrates); Postgres' own enum order equal to the
 * code's, UNCONFIRMED last; a write of the value in a LATER transaction accepted — an UPDATE and an INSERT — and read back
 * by the generated client, the count and the list's tally; the drift diff naming exactly the one ADD VALUE and nothing
 * else (the list-basis probe's method); and 55P04 itself, on a throwaway type, as the control that makes "later" mean
 * something. ⛔ No backslash in §9: line breaks are String.fromCharCode (the tools that write this file decode escapes).
 *
 * Run (through the heavy-node lock; it needs a migrated EMPTY database, runs the Prisma CLI three times and creates and
 * drops a shadow database and a throwaway type — loopback only):
 *   npm run db:probe-campaign-models   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this probe)
 */
import type {
  StoredSmsCampaign, StoredSmsCampaignRecipient, SmsCampaignRecipientSeed, SmsCampaignRecipientCount, SmsCampaignRecipientCountsById,
  SmsCampaignTransitionPatch, StoredUser,
} from "../../src/lib/server/store.ts";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pgLib from "pg";

process.exitCode = 1;
if (!process.env.DATABASE_URL) {
  console.error("campaign-models-pg-probe: needs DATABASE_URL (a scratch Postgres) — refusing to run on the memory twin, which proves nothing here.");
  process.exit(2);
}
{
  // ⛔ A LOOPBACK CLUSTER ONLY (house-bot-migrations' rule): this probe WRITES campaigns, recipients, a contact and an
  // account, and deletes the last two by raw SQL — and §9 creates and drops a shadow database and a throwaway enum type —
  // so a URL whose host is not 127.0.0.1, localhost or ::1 (production's, a hosted scratch) is refused before the store
  // is even loaded.
  let host = "";
  try { host = new URL(process.env.DATABASE_URL).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("campaign-models-pg-probe: refusing — it writes and deletes rows, and runs only against a loopback scratch cluster (db-scratch).");
    process.exit(2);
  }
}

const { db } = await import("../../src/lib/server/store.ts");
const { prisma } = await import("../../src/lib/server/prisma.ts");
const { SMS_CAMPAIGN_RECIPIENT_STATUSES } = await import("../../src/lib/server/marketing/campaign-model.ts");
const { parseTzNumber } = await import("../../src/lib/tz-msisdn.ts");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const pg = prisma();
if (!pg) throw new Error("campaign-models-pg-probe: no Prisma client");
/** A count straight from SQL — the database's own answer, not a twin's. */
const countRows = async (sql: string, ...params: unknown[]): Promise<number> =>
  Number((await pg.$queryRawUnsafe<Array<{ n: number }>>(sql, ...params))[0]?.n ?? -1);
async function throws(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}

const T0 = Date.parse("2026-10-02T09:00:00.000Z");
const at = (s: number) => new Date(T0 + s * 1000).toISOString();
const keyOf = (i: number) => `255710${String(i).padStart(6, "0")}`;
const FILTER = '{"consent":["GIVEN"]}';
const OFFICER = "probe_officer";
const draft = (id: string, o: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign => ({
  id, name: `Probe ${id}`, status: "DRAFT", bodySw: "50pick: Habari, soka leo.", bodyEn: null, codingSw: "GSM7", segmentsSw: 1,
  codingEn: null, segmentsEn: null, nameFallbackSw: null, nameFallbackEn: null, sourcePhrase: null, draftRevision: 0,
  confirmTier: null, audienceFilter: FILTER, audienceCount: null, audienceWatermark: null, estimateSegments: null,
  estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null, createdBy: OFFICER,
  confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null, createdAt: at(0), updatedAt: at(0), ...o,
});
const seed = (id: string, campaignId: string, msisdn: string, o: Partial<SmsCampaignRecipientSeed> = {}): SmsCampaignRecipientSeed =>
  ({ id, campaignId, msisdn, contactId: null, userId: null, optOutToken: null, createdAt: at(1), ...o });
const CONFIRM: SmsCampaignTransitionPatch = {
  audienceCount: 1200, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: 1200, estimateTzs: 7200,
  budgetTzs: 8000, confirmedBy: OFFICER, confirmedAt: at(3),
};
const total = (counts: ReadonlyArray<{ count: number }>) => counts.reduce((n, c) => n + c.count, 0);
async function toRunning(id: string): Promise<void> {
  await db.smsCampaign.transition(id, { from: ["DRAFT"], to: "CONFIRMED", patch: CONFIRM, draftRevision: 0, at: at(2) });
  await db.smsCampaign.transition(id, { from: ["CONFIRMED"], to: "PREPARING", patch: { startedAt: at(3) }, draftRevision: null, at: at(3) });
  await db.smsCampaign.transition(id, { from: ["PREPARING"], to: "RUNNING", patch: { enqueueCursor: "done", enqueuedAt: at(4) }, draftRevision: null, at: at(4) });
}

// ── 0 · the twin IS Prisma ──────────────────────────────────────────────────────────────────────────────────
{
  await db.smsCampaign.create(draft("probe_c0"));
  ok("0 · CONTROL · the db is the Prisma twin: a campaign written through it is a row in Postgres",
    (await countRows(`select count(*)::int as n from "SmsCampaign" where id = $1`, "probe_c0")) === 1);
}

// ── 1 · the dedupe, on the real unique index ────────────────────────────────────────────────────────────────
{
  await db.smsCampaign.create(draft("probe_dedupe"));
  const people = Array.from({ length: 1000 }, (_, i) => keyOf(i));
  const first = await db.smsCampaignRecipient.createMany(people.map((m, i) => seed(`probe_d1_${i}`, "probe_dedupe", m)));
  const again = [...people.map((m, i) => seed(`probe_d2_${i}`, "probe_dedupe", m)), ...Array.from({ length: 200 }, (_, i) => seed(`probe_d3_${i}`, "probe_dedupe", keyOf(1000 + i)))]
    .sort((a, b) => (a.msisdn.slice(-3) < b.msisdn.slice(-3) ? -1 : a.msisdn.slice(-3) > b.msisdn.slice(-3) ? 1 : 0));
  let inserted = 0, duplicates = 0;
  for (let i = 0; i < again.length; i += 1000) {
    const r = await db.smsCampaignRecipient.createMany(again.slice(i, i + 1000));
    inserted += r.inserted; duplicates += r.duplicates;
  }
  const rows = await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where "campaignId" = $1`, "probe_dedupe");
  const counts = await db.smsCampaignRecipient.countByStatus("probe_dedupe");
  ok("1 · ⭐ 1,000 seeds, then the same 1,000 people (ids re-minted) among 200 new ones, are 1,200 rows in Postgres — skipDuplicates on the unique index",
    first.inserted === 1000 && inserted === 200 && duplicates === 1000 && rows === 1200 && counts[0]?.status === "PENDING" && counts[0]?.count === 1200,
    `first ${first.inserted} · again ${inserted}+${duplicates}dup · rows ${rows} · PENDING ${counts[0]?.count}`);
}

// ── 2 · the key is per campaign ─────────────────────────────────────────────────────────────────────────────
{
  await db.smsCampaign.create(draft("probe_key_b"));
  const r = await db.smsCampaignRecipient.createMany([seed("probe_kb_0", "probe_key_b", keyOf(0))]);
  ok("2 · one number on two campaigns is two rows",
    r.inserted === 1 && (await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where msisdn = $1`, keyOf(0))) === 2);
}

// ── 3 · a batch is refused whole ────────────────────────────────────────────────────────────────────────────
{
  await db.smsCampaign.create(draft("probe_whole"));
  const before = await countRows(`select count(*)::int as n from "SmsCampaignRecipient"`);
  const ok3 = [0, 1, 2].map((i) => seed(`probe_w_${i}`, "probe_whole", keyOf(5000 + i)));
  const plus = await throws(() => db.smsCampaignRecipient.createMany([...ok3, seed("probe_w_plus", "probe_whole", `+${keyOf(5003)}`)]));
  const orphan = await throws(() => db.smsCampaignRecipient.createMany([...ok3, seed("probe_w_orphan", "probe_missing", keyOf(5004))]));
  const noContact = await throws(() => db.smsCampaignRecipient.createMany([...ok3, seed("probe_w_contact", "probe_whole", keyOf(5005), { contactId: "probe_no_such_contact" })]));
  const after = await countRows(`select count(*)::int as n from "SmsCampaignRecipient"`);
  ok("3 · ⛔ a +255 spelling, a missing campaign (P2003) or a missing contact (P2003) refuses the WHOLE batch — the three valid seeds beside it are not written either",
    plus && orphan && noContact && after === before, `refused ${plus}/${orphan}/${noContact} · rows ${before} → ${after}`);
  // The memory twin's parity claim, on the real engine: a seed whose key is already held is skipped at ON CONFLICT, and
  // Postgres checks no link for a row it does not insert — so a dangling contact on a duplicate refuses nothing.
  await db.smsCampaignRecipient.createMany([seed("probe_w_held", "probe_whole", keyOf(5100))]);
  const heldAgain = await db.smsCampaignRecipient.createMany([seed("probe_w_held_again", "probe_whole", keyOf(5100), { contactId: "probe_no_such_contact" })]);
  ok("3b · a seed already on the campaign is skipped before its link is checked — one duplicate, no P2003 (the memory twin's rule)",
    heldAgain.inserted === 0 && heldAgain.duplicates === 1, JSON.stringify(heldAgain));
}

// ── 4 · a confirmed scope cannot be widened, and the columns round-trip ─────────────────────────────────────
{
  const id = "probe_frozen";
  await db.smsCampaign.create(draft(id));
  const saved = await db.smsCampaign.update(id, { bodySw: "50pick: Ofa mpya leo.", codingSw: "GSM7", segmentsSw: 1 }, { draftRevision: 0 }, at(2));
  const confirmed = await db.smsCampaign.transition(id, { from: ["DRAFT"], to: "CONFIRMED", patch: CONFIRM, draftRevision: 1, at: at(3) });
  const widened = await db.smsCampaign.update(id, { audienceFilter: "{}" }, { draftRevision: 1 }, at(4));
  const frozenKey = await throws(() => db.smsCampaign.transition(id, { from: ["CONFIRMED"], to: null, patch: { audienceCount: 999999 }, draftRevision: 1, at: at(5) }));
  const row = await db.smsCampaign.find(id);
  ok("4 · ⭐ on Postgres: the draft save lands on its revision (its text stored), the confirmation freezes, the wider audience is refused (count 0 → null), a frozen key is refused outside DRAFT",
    saved?.draftRevision === 1 && saved?.bodySw === "50pick: Ofa mpya leo." && confirmed?.status === "CONFIRMED" && widened === null && frozenKey
      && row?.status === "CONFIRMED" && row?.bodySw === "50pick: Ofa mpya leo.",
    `rev ${saved?.draftRevision} · ${confirmed?.status} · widening ${widened === null ? "refused" : "WRITTEN"} · ${row?.status}`);
  ok("4b · the stored audience is BYTE-IDENTICAL (TEXT, not JSONB), the money columns come back as numbers, the instants as written",
    row?.audienceFilter === FILTER && row?.estimateTzs === 7200 && row?.budgetTzs === 8000 && row?.confirmedAt === at(3) && row?.confirmTier === "TYPED",
    `${row?.audienceFilter} · ${row?.estimateTzs}/${row?.budgetTzs} · ${row?.confirmedAt} · ${row?.confirmTier}`);
}

// ── 5 · two racing transitions, truly concurrent on two connections, ten times ──────────────────────────────
{
  let exactlyOne = 0;
  const detail: string[] = [];
  for (let n = 0; n < 10; n++) {
    const id = `probe_race_${n}`;
    await db.smsCampaign.create(draft(id));
    await toRunning(id);
    const raced = await Promise.all([
      db.smsCampaign.transition(id, { from: ["RUNNING"], to: "PAUSED", patch: { stopReason: "officer_pause", pausedAt: at(5) }, draftRevision: null, at: at(5) }),
      db.smsCampaign.transition(id, { from: ["RUNNING"], to: "CANCELLED", patch: { stopReason: "officer_stop", finishedAt: at(5) }, draftRevision: null, at: at(5) }),
    ]);
    const winners = raced.filter((r) => r !== null);
    const row = await db.smsCampaign.find(id);
    if (winners.length === 1 && row?.status === winners[0]?.status && row?.stopReason === winners[0]?.stopReason) exactlyOne++;
    else detail.push(`${id}: ${winners.length} winners, final ${row?.status}`);
  }
  ok("5 · ⭐ two concurrent transitions from RUNNING leave exactly ONE winner on Postgres — 10 races out of 10", exactlyOne === 10, detail.join(" · ") || "10/10");
}

// ── 6 · the draft save's compare-and-set, concurrent ────────────────────────────────────────────────────────
{
  const id = "probe_revision";
  await db.smsCampaign.create(draft(id));
  const saves = await Promise.all([
    db.smsCampaign.update(id, { bodySw: "50pick: toleo A.", codingSw: "GSM7", segmentsSw: 1 }, { draftRevision: 0 }, at(2)),
    db.smsCampaign.update(id, { bodySw: "50pick: toleo B.", codingSw: "GSM7", segmentsSw: 1 }, { draftRevision: 0 }, at(2)),
  ]);
  const row = await db.smsCampaign.find(id);
  const winner = saves.find((r) => r !== null);
  ok("6 · two concurrent saves on one revision: exactly one lands, its text is the one stored, and the revision moves on by one",
    saves.filter((r) => r !== null).length === 1 && row?.draftRevision === 1 && row?.bodySw === winner?.bodySw,
    `${saves.filter((r) => r !== null).length} landed · rev ${row?.draftRevision} · stored "${row?.bodySw}"`);
}

// ── 7 · the links: RESTRICT for the campaign, SET NULL for the contact and the account ──────────────────────
{
  const restricted = await throws(() => pg.$executeRawUnsafe(`delete from "SmsCampaign" where id = $1`, "probe_dedupe"));
  const stillThere = await countRows(`select count(*)::int as n from "SmsCampaign" where id = $1`, "probe_dedupe");
  ok("7 · ⛔ RESTRICT: a campaign holding recipients cannot be deleted — the record that we messaged somebody outlives it",
    restricted && stillThere === 1);

  const p = parseTzNumber("0754999101");
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error("the probe contact's number does not parse");
  await db.marketingContact.create({
    id: "probe_contact_1", msisdn: p.msisdn, rawInput: "0754999101", displayName: null, email: null, ndc: p.ndc, operator: null,
    source: "OPERATOR", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null,
    importId: null, createdAt: at(0), createdBy: null, updatedAt: at(0), updatedBy: null,
  });
  const user: StoredUser = {
    id: "probe_user_1", phoneE164: "+255754999102", email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01",
    region: null, acceptedTermsVersion: "v3", acceptedTermsAt: at(0), marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, createdAt: at(0), updatedAt: at(0), lastLoginAt: null, closedAt: null,
  } as StoredUser;
  await db.user.create(user);
  await db.smsCampaign.create(draft("probe_links"));
  await db.smsCampaignRecipient.createMany([
    seed("probe_l_contact", "probe_links", p.msisdn, { contactId: "probe_contact_1" }),
    seed("probe_l_user", "probe_links", "255754999102", { userId: "probe_user_1" }),
  ]);
  await pg.$executeRawUnsafe(`delete from "MarketingContact" where id = $1`, "probe_contact_1");
  await pg.$executeRawUnsafe(`delete from "User" where id = $1`, "probe_user_1");
  const rc = await db.smsCampaignRecipient.find("probe_l_contact");
  const ru = await db.smsCampaignRecipient.find("probe_l_user");
  ok("7b · ⛔ SET NULL: deleting the contact and the account breaks both links and KEEPS both recipient rows",
    rc !== null && rc.contactId === null && rc.msisdn === p.msisdn && ru !== null && ru.userId === null,
    `contact row ${rc ? `kept, link ${rc.contactId}` : "GONE"} · account row ${ru ? `kept, link ${ru.userId}` : "GONE"}`);
}

// ── 8 · smsReference is nullable-unique; the counts are one groupBy, zero-filled ────────────────────────────
{
  await pg.$executeRawUnsafe(`update "SmsCampaignRecipient" set "smsReference" = $1, status = 'SENT' where id = $2`, "probe_ref_000000000001", "probe_d1_0");
  const second = await throws(() => pg.$executeRawUnsafe(`update "SmsCampaignRecipient" set "smsReference" = $1 where id = $2`, "probe_ref_000000000001", "probe_d1_1"));
  await pg.$executeRawUnsafe(`update "SmsCampaignRecipient" set status = 'HELD' where id = $1`, "probe_d1_2");
  const counts = await db.smsCampaignRecipient.countByStatus("probe_dedupe");
  const shape = counts.map((c) => c.status).join(",") === SMS_CAMPAIGN_RECIPIENT_STATUSES.join(",");
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c.count]));
  ok("8 · smsReference refuses a second row on one reference while 1,199 NULLs sit side by side",
    second && (await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where "smsReference" is null and "campaignId" = $1`, "probe_dedupe")) === 1199);
  ok("8b · countByStatus is every status in the schema's order, zeros included, from ONE groupBy over Postgres' enum",
    shape && byStatus.PENDING === 1198 && byStatus.HELD === 1 && byStatus.SENT === 1 && byStatus.DELIVERED === 0 && total(counts) === 1200,
    counts.map((c) => `${c.status} ${c.count}`).join(", "));
}

// ── 9 · U43-0 · UNCONFIRMED: every migration from EMPTY, the value in Postgres' order, a write of it in a LATER
//        transaction, the drift diff naming the one statement, and 55P04 itself ──────────────────────────────────
{
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const MIGRATIONS = join(ROOT, "prisma", "migrations");
  const SCHEMA = join(ROOT, "prisma", "schema.prisma");
  const NL = String.fromCharCode(10);
  const CR = String.fromCharCode(13);
  const URL_RAW = process.env.DATABASE_URL ?? "";
  const json = (v: unknown) => JSON.stringify(v);
  const firstLine = (e: unknown) => String((e as Error)?.message ?? e).split(NL)[0].slice(0, 200);

  // 9 · every migration on disk is applied — the runner reset the cluster and ran `prisma migrate deploy` on it
  const folders = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const MIGRATION = folders.find((f) => f.endsWith("_sms_recipient_unconfirmed")) ?? "";
  const TABLES_MIGRATION = folders.find((f) => f.endsWith("_sms_campaign_models")) ?? "";
  const applied = await pg.$queryRawUnsafe<Array<{ name: string; finished: boolean; rolled: boolean }>>(
    `select migration_name as name, finished_at is not null as finished, rolled_back_at is not null as rolled from "_prisma_migrations"`);
  const appliedOk = applied.filter((m) => m.finished && !m.rolled).map((m) => m.name).sort();
  ok("9 · U43-0 · CONTROL · every migration on disk is applied — finished, none rolled back, none extra — UNCONFIRMED's own among them and after the campaign tables' (the runner applied them all to an EMPTY cluster)",
    MIGRATION !== "" && TABLES_MIGRATION !== "" && TABLES_MIGRATION < MIGRATION && json(appliedOk) === json(folders) && applied.length === folders.length,
    `${appliedOk.length} applied of ${folders.length} on disk · ${MIGRATION || "no _sms_recipient_unconfirmed folder"}`);

  // 9a · the value is there, in Postgres' OWN order — which must be the schema's and the code's
  const labels = (await pg.$queryRawUnsafe<Array<{ label: string }>>(
    `select e.enumlabel as label from pg_enum e join pg_type t on t.oid = e.enumtypid join pg_namespace n on n.oid = t.typnamespace
      where t.typname = $1 and n.nspname = current_schema() order by e.enumsortorder`, "SmsCampaignRecipientStatus")).map((r) => r.label);
  ok("9a · ⭐ AFTER EVERY MIGRATION FROM EMPTY, Postgres' SmsCampaignRecipientStatus holds SEVEN values in its own sort order — UNCONFIRMED last, where ADD VALUE appends it — equal, in order, to SMS_CAMPAIGN_RECIPIENT_STATUSES (the schema's order, test:campaign-models 1.8c)",
    labels.length === 7 && labels[6] === "UNCONFIRMED" && json(labels) === json([...SMS_CAMPAIGN_RECIPIENT_STATUSES]),
    `[${labels.join(", ")}]`);

  // 9b · a write of the value in a LATER transaction — an UPDATE and an INSERT, each its own transaction, run long after
  //      the migration's committed — then every read of it: the generated client, the count, the list's tally
  await db.smsCampaign.create(draft("probe_unconfirmed"));
  await db.smsCampaignRecipient.createMany([0, 1, 2].map((i) => seed(`probe_u_${i}`, "probe_unconfirmed", keyOf(9500 + i))));
  let updated = -1, inserted = -1, writeError = "";
  try {
    updated = await pg.$executeRawUnsafe(`update "SmsCampaignRecipient" set status = 'UNCONFIRMED' where id = $1`, "probe_u_0");
    inserted = await pg.$executeRawUnsafe(
      `insert into "SmsCampaignRecipient" ("id", "campaignId", "msisdn", "status") values ($1, $2, $3, 'UNCONFIRMED'::"SmsCampaignRecipientStatus")`,
      "probe_u_raw", "probe_unconfirmed", keyOf(9503));
  } catch (e) {
    writeError = firstLine(e);
  }
  ok("9b · ⭐ A WRITE OF UNCONFIRMED IN A LATER TRANSACTION IS ACCEPTED — an UPDATE of a seeded row and an INSERT naming the value, each its own transaction after the migration's had committed",
    writeError === "" && updated === 1 && inserted === 1, writeError || `updated ${updated} · inserted ${inserted}`);
  let readBack: StoredSmsCampaignRecipient | null = null, readRaw: StoredSmsCampaignRecipient | null = null;
  let unconfirmedCounts: SmsCampaignRecipientCount[] = [], listed: SmsCampaignRecipientCountsById = {}, readError = "";
  try {
    readBack = await db.smsCampaignRecipient.find("probe_u_0");
    readRaw = await db.smsCampaignRecipient.find("probe_u_raw");
    unconfirmedCounts = await db.smsCampaignRecipient.countByStatus("probe_unconfirmed");
    listed = await db.smsCampaignRecipient.countsByCampaign(["probe_unconfirmed"]);
  } catch (e) {
    readError = firstLine(e);
  }
  const by = Object.fromEntries(unconfirmedCounts.map((c) => [c.status, c.count]));
  ok("9c · …and every read knows it: the generated client hands both rows back as UNCONFIRMED (a stale client, `prisma generate` not run, refuses here), countByStatus counts 2 in the seventh place beside 2 PENDING, and the list's per-campaign tally answers the same — nothing refused",
    readError === "" && readBack?.status === "UNCONFIRMED" && readRaw?.status === "UNCONFIRMED" && unconfirmedCounts[6]?.status === "UNCONFIRMED"
      && by.UNCONFIRMED === 2 && by.PENDING === 2 && total(unconfirmedCounts) === 4
      && listed.probe_unconfirmed?.UNCONFIRMED === 2 && listed.probe_unconfirmed?.PENDING === 2,
    readError || `${readBack?.status}/${readRaw?.status} · ${unconfirmedCounts.map((c) => `${c.status} ${c.count}`).join(", ")} · list ${json(listed.probe_unconfirmed ?? null)}`);

  // 9d–9g · the drift diff names ONLY the new value (decision 4 — list-basis-pg-probe's method, read there first)
  const require_ = createRequire(import.meta.url);
  // ⭐ The CLI through node itself, as list-basis-pg-probe and db-backup.mts do: `npx.cmd` fails with EINVAL on Windows since Node 20.
  const PRISMA_CLI = require_.resolve("prisma/build/index.js", { paths: [ROOT] });
  const migrateDiff = (args: string[]): { status: number; out: string; err: string } => {
    const r = spawnSync(process.execPath, [PRISMA_CLI, "migrate", "diff", ...args, "--script"], {
      cwd: ROOT, env: process.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60_000,
    });
    return { status: r.status ?? 1, out: r.stdout ?? "", err: r.stderr ?? "" };
  };
  /** A script's statements — comment lines and the CLI's own notices out, each statement's whitespace collapsed. */
  const statements = (sql: string): string[] => sql.split(CR).join("").split(NL)
    .filter((l) => !l.trim().startsWith("--") && !l.startsWith("Environment variables loaded") && !l.startsWith("Prisma schema loaded"))
    .join(NL).split(";").map((s) => s.split(NL).map((l) => l.trim()).filter(Boolean).join(" ")).filter((s) => s.length > 0);
  const admin = async (sql: string): Promise<void> => {
    const client = new pgLib.Client({ connectionString: URL_RAW });
    await client.connect();
    try { await client.query(sql); } finally { await client.end().catch(() => {}); }
  };
  const SHADOW_DB = "campaign_models_probe_shadow";
  const shadow = new URL(URL_RAW);
  shadow.pathname = `/${SHADOW_DB}`;
  const tmp = mkdtempSync(join(tmpdir(), "kp-campaign-models-probe-"));
  try {
    await admin(`DROP DATABASE IF EXISTS "${SHADOW_DB}" WITH (FORCE)`);
    await admin(`CREATE DATABASE "${SHADOW_DB}"`);
    const without = join(tmp, "migrations");
    mkdirSync(without);
    for (const e of readdirSync(MIGRATIONS, { withFileTypes: true })) {
      if (e.name !== MIGRATION) cpSync(join(MIGRATIONS, e.name), join(without, e.name), { recursive: true });
    }
    const liveDiff = migrateDiff(["--from-url", URL_RAW, "--to-schema-datamodel", SCHEMA]);
    const fullDiff = migrateDiff(["--from-migrations", MIGRATIONS, "--to-schema-datamodel", SCHEMA, "--shadow-database-url", shadow.toString()]);
    const beforeDiff = migrateDiff(["--from-migrations", without, "--to-schema-datamodel", SCHEMA, "--shadow-database-url", shadow.toString()]);
    const ran = MIGRATION !== "" && liveDiff.status === 0 && fullDiff.status === 0 && beforeDiff.status === 0;
    const tail = (s: string) => s.trim().split(NL).slice(-3).join(" | ");
    ok("9d · CONTROL · the Prisma CLI ran all three diffs — the migrated database, every migration, and every migration but UNCONFIRMED's — each to schema.prisma",
      ran, ran ? `${statements(beforeDiff.out).length} / ${statements(fullDiff.out).length} statements`
        : `exits ${liveDiff.status}/${fullDiff.status}/${beforeDiff.status} · ${tail(liveDiff.err)} · ${tail(fullDiff.err)} · ${tail(beforeDiff.err)}`);
    const full = statements(fullDiff.out);
    const before = statements(beforeDiff.out);
    const added = before.filter((s) => !full.includes(s));
    const lost = full.filter((s) => !before.includes(s));
    const mig = MIGRATION === "" ? [] : statements(readFileSync(join(MIGRATIONS, MIGRATION, "migration.sql"), "utf8"));
    ok("9e · ⭐ THE DRIFT DIFF NAMES ONLY THE NEW VALUE — from every migration but UNCONFIRMED's to schema.prisma, exactly ONE statement goes beyond the full set's, an ALTER TYPE adding UNCONFIRMED to SmsCampaignRecipientStatus; none goes missing; and the full set names UNCONFIRMED nowhere",
      ran && added.length === 1 && lost.length === 0 && added[0].startsWith(`ALTER TYPE "SmsCampaignRecipientStatus" ADD VALUE`)
        && added[0].includes("'UNCONFIRMED'") && !fullDiff.out.includes("UNCONFIRMED"),
      `added ${added.length}: ${added.map((s) => s.slice(0, 90)).join(" | ")} · lost ${lost.length}`);
    ok("9f · …and that statement IS the hand-written file's one statement, IF NOT EXISTS aside (Prisma renders the bare ADD VALUE) — the file adds the value and nothing more",
      ran && mig.length === 1 && added.length === 1 && mig[0].split(" IF NOT EXISTS").join("") === added[0],
      `prisma: ${added.join(" ;; ")} · file: ${mig.join(" ;; ")}`);
    ok("9g · the MIGRATED database differs from schema.prisma in nothing that names UNCONFIRMED — the migration built exactly the value the enum declares",
      liveDiff.status === 0 && !liveDiff.out.includes("UNCONFIRMED"), `${statements(liveDiff.out).length} statements of known drift, none of them ours`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    await admin(`DROP DATABASE IF EXISTS "${SHADOW_DB}" WITH (FORCE)`).catch(() => {});
  }

  // 9h · CONTROL · 55P04 itself, on a throwaway type — the reason the value ships alone, one deploy before any writer.
  //      (Last on purpose: the diffs above must never see the throwaway type.)
  const SCRATCH_TYPE = "probe_u430_scratch";
  let sameTx = "not run", nextTx = "not run";
  const client = new pgLib.Client({ connectionString: URL_RAW });
  await client.connect();
  try {
    await client.query(`DROP TYPE IF EXISTS "${SCRATCH_TYPE}"`);
    await client.query(`CREATE TYPE "${SCRATCH_TYPE}" AS ENUM ('A')`);
    await client.query("BEGIN");
    try {
      await client.query(`ALTER TYPE "${SCRATCH_TYPE}" ADD VALUE 'B'`);
      await client.query(`SELECT 'B'::"${SCRATCH_TYPE}" AS v`);
      sameTx = "accepted";
    } catch (e) {
      sameTx = String((e as { code?: unknown } | null)?.code ?? "no code");
    } finally {
      await client.query("ROLLBACK").catch(() => {});
    }
    await client.query(`ALTER TYPE "${SCRATCH_TYPE}" ADD VALUE IF NOT EXISTS 'B'`);
    const r = await client.query(`SELECT 'B'::"${SCRATCH_TYPE}" AS v`);
    nextTx = r.rows[0]?.v === "B" ? "accepted" : `answered ${json(r.rows[0] ?? null)}`;
  } catch (e) {
    nextTx = `threw ${String((e as { code?: unknown } | null)?.code ?? firstLine(e))}`;
  } finally {
    await client.query(`DROP TYPE IF EXISTS "${SCRATCH_TYPE}"`).catch(() => {});
    await client.end().catch(() => {});
  }
  ok("9h · CONTROL · 55P04 IS REAL ON THIS POSTGRES — a value added and used inside ONE transaction is refused (unsafe use of new value) while the same use in the next transaction is accepted: why the ADD VALUE ships alone, a deploy before its first writer",
    sameTx === "55P04" && nextTx === "accepted", `same transaction: ${sameTx} · next transaction: ${nextTx}`);

  await pg.$disconnect().catch(() => {});
}

console.log(`\ncampaign-models-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
