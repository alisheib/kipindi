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
 * ⭐ §10 · U43a (S10 2026-10-04 — ENGINE-SPEC §4.10): the engine's recipient doors through the REAL Prisma twin. Five
 * claimers truly concurrent on the pool over 1,000 rows win exactly 1,000 rows, each once (the plan's RED, on the engine
 * that decides it); the won set read back by its token equals what Postgres holds under that token; patches handed in a
 * shuffled order land each on ITS row (settled by the row's id, never by place); a foreign claim, a reaped row's late
 * settle and a second settle are lost and change nothing; the release's `{ increment: 1 }` lands; UNCONFIRMED written
 * through the generated client in a later transaction and never moved back — not by a release, not by the requeue, not
 * by a claim; the requeue takes HELD alone; the evidence read answers the newest message per target; a settle whose
 * second statement breaks the unique reference rolls its first back; and the claim's plan at 150,000 rows is RECORDED
 * (EXPLAIN ANALYZE, printed) for U45's index decision. ⛔ No backslash in §10 either. (§9's disconnect moved to the end.)
 * ⭐ The review of 2026-10-07: 10a2 FORCES the race (five claims of the same rows queued behind one row lock, seen
 * waiting on five connections at once, released together — exactly one wins), 10b2 refuses a reused token (D16), 10d
 * and 10f read a release and a requeue that keep the claim's instant (D15), 10e clears an UNCONFIRMED row's token by SQL
 * so the claim's STATUS test stands alone, 10g gives the newer message the lower reference, and 10j also records the
 * reaper's read and the activity read at 150,000 rows.
 * ⭐ §11 · U46a (S14 2026-10-07 — ENGINE-SPEC §4.14): the receipt door through the REAL Prisma twin — a receipt moves its
 * row and no other, never back; another number or another message's reference is refused; Postgres's unique reference
 * refuses a second holder (P2002); and twenty receipts racing twenty settles on claimed rows, truly concurrent, end every
 * row DELIVERED with nothing thrown. ⛔ No backslash in §11 either.
 *
 * Run (through the heavy-node lock; it needs a migrated EMPTY database, runs the Prisma CLI three times and creates and
 * drops a shadow database and a throwaway type — loopback only):
 *   npm run db:probe-campaign-models   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this probe)
 */
import type {
  StoredSmsCampaign, StoredSmsCampaignRecipient, SmsCampaignRecipientSeed, SmsCampaignRecipientCount, SmsCampaignRecipientCountsById,
  SmsCampaignTransitionPatch, StoredUser, SmsCampaignRecipientSettle, SmsCampaignGateTrail, StoredSmsMessage, SmsRecipientReceipt,
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
}

// ── 10 · U43a · the engine's recipient doors through the REAL Prisma twin (ENGINE-SPEC §4.10): five concurrent
//        claimers, the won set read back by its token, settles by the row's id, lost settles, the release's increment,
//        UNCONFIRMED never back, the requeue, the evidence read, one transaction or nothing, the claim's plan at 150k ─────
{
  const CM43 = await import("../../src/lib/server/marketing/campaign-model.ts");
  const NL = String.fromCharCode(10);
  const json = (v: unknown) => JSON.stringify(v);
  // The first line that SAYS something: a Prisma error's message opens with an empty line ("" would read as no error).
  const firstLine = (e: unknown) =>
    (String((e as Error)?.message ?? e).split(NL).map((s) => s.trim()).find((s) => s !== "") ?? "(an error with no message)").slice(0, 200);
  const T43 = Date.parse("2026-10-04T12:00:00.000Z");
  const at43 = (s: number) => new Date(T43 + s * 1000).toISOString();
  const rid = (prefix: string, i: number) => `${prefix}_${String(i).padStart(5, "0")}`;
  const trail = (verdict: string): SmsCampaignGateTrail => [{ check: "probe", verdict, wording: null, source: "u43a" }];
  /** JSONB keeps its own key order, so a trail is compared field by field — never as a JSON string. */
  const sameTrail = (a: SmsCampaignGateTrail | null | undefined, b: SmsCampaignGateTrail): boolean =>
    Array.isArray(a) && a.length === b.length
      && a.every((g, i) => g.check === b[i].check && g.verdict === b[i].verdict && g.wording === b[i].wording && g.source === b[i].source);
  const skippedP = (id: string, claimToken: string): SmsCampaignRecipientSettle =>
    ({ id, claimToken, to: "SKIPPED", skipReason: "probe", skipDetail: "five claimers", gateTrail: trail("skipped") });
  const sentP = (id: string, claimToken: string, smsReference: string): SmsCampaignRecipientSettle => ({
    id, claimToken, to: "SENT", smsReference, sentAt: at43(5), optOutToken: "K7MXP2QR", locale: "SW", segments: 1, bodyLen: 72, gateTrail: trail("ok"),
  });
  /** A campaign of `n` fresh rows through the doors; their ids (fixed-width, so id order is seed order in any collation). */
  const campaign43 = async (id: string, n: number, keyFrom: number): Promise<string[]> => {
    await db.smsCampaign.create(draft(id));
    const ids = Array.from({ length: n }, (_, i) => rid(id, i));
    for (let i = 0; i < n; i += 1000) {
      await db.smsCampaignRecipient.createMany(ids.slice(i, i + 1000).map((x, j) => seed(x, id, keyOf(keyFrom + i + j))));
    }
    return ids;
  };
  type Row43 = { status: string; claimToken: string | null; smsReference: string | null; attempts: number; claimedAt: Date | null };
  /** One row as Postgres holds it — the database's own answer, not a twin's. */
  const sqlRow = async (id: string): Promise<Row43 | null> => (await pg.$queryRawUnsafe<Row43[]>(
    `select status::text as status, "claimToken", "smsReference", attempts, "claimedAt" from "SmsCampaignRecipient" where id = $1`, id))[0] ?? null;

  // 10 · the fixture
  const FIVE = "probe_u43a_five";
  const five = await campaign43(FIVE, 1000, 20000);
  const freeLeft = () => countRows(`select count(*)::int as n from "SmsCampaignRecipient" where "campaignId" = $1 and status = 'PENDING' and "claimToken" is null`, FIVE);
  ok("10 · U43a · CONTROL · 1,000 rows on one campaign in Postgres, every one PENDING and unclaimed",
    five.length === 1000 && (await freeLeft()) === 1000);

  // 10a · ⭐ five claimers, truly concurrent on the pool — the plan's RED, on the engine that decides it
  {
    const wins = new Map<string, number>();
    const wonWith = new Map<string, string>();
    const errors: string[] = [];
    let lost = 0, empty = 0, rounds = 0;
    const claimer = async (who: number): Promise<void> => {
      for (let round = 0; round < 400; round++) {
        rounds++;
        const token = `probe_tok_${who}_${String(round).padStart(4, "0")}`;
        let won: StoredSmsCampaignRecipient[] = [];
        try {
          won = await db.smsCampaignRecipient.claim(FIVE, CM43.SMS_RECIPIENT_CLAIM_MAX, token, at43(round));
        } catch (e) {
          errors.push(firstLine(e));
          continue;
        }
        if (won.length === 0) {
          empty++;
          if ((await freeLeft()) === 0) return;
          continue;
        }
        for (const r of won) {
          wins.set(r.id, (wins.get(r.id) ?? 0) + 1);
          wonWith.set(r.id, token);
        }
        try {
          const res = await db.smsCampaignRecipient.settle([...won].reverse().map((r) => skippedP(r.id, token)), at43(round));
          lost += res.lost.length;
        } catch (e) {
          errors.push(firstLine(e));
        }
      }
    };
    const started = Date.now();
    await Promise.all([1, 2, 3, 4, 5].map(claimer));
    const ms = Date.now() - started;
    const held = await pg.$queryRawUnsafe<Array<{ id: string; claimToken: string | null; status: string }>>(
      `select id, "claimToken", status::text as status from "SmsCampaignRecipient" where "campaignId" = $1`, FIVE);
    const twice = [...wins.values()].filter((n) => n !== 1).length;
    const underItsToken = held.every((r) => r.status === "SKIPPED" && r.claimToken !== null && wonWith.get(r.id) === r.claimToken);
    ok("10a · ⭐ FIVE CLAIMERS, TRULY CONCURRENT ON POSTGRES, over 1,000 rows: exactly 1,000 distinct rows won in total, none twice, every settle landed, every row SKIPPED under the very token that won it — and no claim or settle threw (a deadlock would)",
      wins.size === 1000 && twice === 0 && lost === 0 && errors.length === 0 && held.length === 1000 && underItsToken,
      `${wins.size} won · ${twice} twice · ${lost} lost · ${errors.length} error(s)${errors.length ? ` (${errors.slice(0, 2).join(" | ")})` : ""} · ${empty} empty claim(s) under contention · ${rounds} rounds in ${ms} ms`);
  }

  // 10a2 · ⭐ THE RACE, FORCED: 10a's claimers usually collide, but nothing there proves they did. Here a second connection
  //        holds a row lock on all 50 free rows; five claims of those same rows are launched, each reads them free and
  //        then WAITS on the lock in its conditional write — all five seen waiting at once, on five connections — and
  //        the lock is released: Postgres re-checks each waiting write after the first commits, so exactly ONE wins.
  {
    const RACE = "probe_u43a_race";
    await campaign43(RACE, 50, 21500);
    const blocker = new pgLib.Client({ connectionString: process.env.DATABASE_URL ?? "" });
    await blocker.connect();
    let waiting = 0;
    let answers: StoredSmsCampaignRecipient[][] = [];
    const raceErrors: string[] = [];
    try {
      await blocker.query("begin");
      await blocker.query(`select id from "SmsCampaignRecipient" where "campaignId" = $1 for update`, [RACE]);
      const claims = [1, 2, 3, 4, 5].map((who) => db.smsCampaignRecipient.claim(RACE, CM43.SMS_RECIPIENT_CLAIM_MAX, `probe_tok_race_${who}`, at43(60))
        .catch((e: unknown): StoredSmsCampaignRecipient[] => { raceErrors.push(firstLine(e)); return []; }));
      for (let i = 0; i < 100 && waiting < 5; i++) {
        await new Promise((done) => setTimeout(done, 100));
        waiting = await countRows(
          `select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query ilike '%update%SmsCampaignRecipient%'`);
      }
      await blocker.query("commit");
      answers = await Promise.all(claims);
    } finally {
      await blocker.end().catch(() => {});
    }
    const winners = answers.filter((a) => a.length > 0);
    const winner = winners[0]?.[0]?.claimToken ?? "";
    const held = await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where "campaignId" = $1 and "claimToken" = $2`, RACE, winner);
    ok("10a2 · ⭐ THE RACE, FORCED ON POSTGRES: five claims of the same 50 free rows, held behind one row lock, are seen WAITING AT ONCE (five connections) and released together — Postgres re-checks each conditional write after the first commit, so exactly ONE claimant wins all 50 rows, the other four answer [] and none errs",
      waiting === 5 && raceErrors.length === 0 && winners.length === 1 && winners[0].length === 50 && held === 50,
      `${waiting} claim(s) seen waiting on the lock · ${winners.length} winner(s) · won ${answers.map((a) => a.length).join("/")} · Postgres holds ${held} under the winner's token · ${raceErrors.length} error(s)${raceErrors.length ? ` (${raceErrors[0]})` : ""}`);
  }

  // 10b · the won set is exactly readable
  const READ = "probe_u43a_read";
  const readIds = await campaign43(READ, 7, 21000);
  const tokR = "probe_tok_read_0001";
  const tokR2 = "probe_tok_read_0002";
  const wonR = await db.smsCampaignRecipient.claim(READ, 5, tokR, at43(100));
  const heldBySql = (await pg.$queryRawUnsafe<Array<{ id: string }>>(`select id from "SmsCampaignRecipient" where "claimToken" = $1 order by id`, tokR)).map((r) => r.id);
  const byToken = await db.smsCampaignRecipient.claimedBy(READ, tokR);
  const restR = await db.smsCampaignRecipient.claim(READ, 5, tokR2, at43(101));
  ok("10b · the won set is EXACTLY READABLE: the claim answers the first 5 rows by id — what Postgres holds under that token, and what claimedBy reads — each PENDING with the token and the instant; the next claim takes the 2 left",
    json(wonR.map((r) => r.id)) === json(readIds.slice(0, 5)) && json(heldBySql) === json(readIds.slice(0, 5))
      && json(byToken.map((r) => r.id)) === json(readIds.slice(0, 5)) && wonR.every((r) => r.claimToken === tokR && r.claimedAt === at43(100) && r.status === "PENDING")
      && json(restR.map((r) => r.id)) === json(readIds.slice(5)),
    `won [${wonR.map((r) => r.id.slice(-2))}] · Postgres [${heldBySql.map((x) => x.slice(-2))}] · claimedBy ${byToken.length} · rest [${restR.map((r) => r.id.slice(-2))}]`);

  // 10b2 · ⛔ D16 · a token a row already holds is refused on Postgres too — before anything is written, even where rows are free
  {
    const FRESH = "probe_u43a_fresh";
    await campaign43(FRESH, 2, 21600);
    let refusal = "";
    try {
      await db.smsCampaignRecipient.claim(FRESH, 2, tokR, at43(103));
    } catch (e) {
      refusal = firstLine(e);
    }
    const stillFree = await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where "campaignId" = $1 and status = 'PENDING' and "claimToken" is null`, FRESH);
    ok("10b2 · ⛔ A REUSED TOKEN IS REFUSED ON POSTGRES (D16): a claim under the token 10b's rows still hold is refused before anything is written — another campaign's two free rows stay free",
      refusal !== "" && stillFree === 2, `${refusal || "the claim was ACCEPTED"} · free rows left ${stillFree}`);
  }

  // 10c · ⭐ settled by the row's id, never by its place
  const refOf = (id: string) => `sms_probe_${id.slice(-5)}`;
  const res10c = await db.smsCampaignRecipient.settle([3, 0, 4, 1, 2].map((i) => sentP(readIds[i], tokR, refOf(readIds[i]))), at43(102));
  const refs = await pg.$queryRawUnsafe<Array<{ id: string; smsReference: string | null; status: string; sentAt: Date | null; locale: string | null }>>(
    `select id, "smsReference", status::text as status, "sentAt", locale::text as locale from "SmsCampaignRecipient" where "campaignId" = $1 and "claimToken" = $2 order by id`, READ, tokR);
  const readBack = await db.smsCampaignRecipient.find(readIds[0]);
  ok("10c · ⭐ SETTLED BY THE ROW'S ID, NEVER BY PLACE: five SENT patches handed in the order 3, 0, 4, 1, 2 land each on ITS row — every reference on the row it was minted for, SENT, the instant and the variant as written — and the generated client reads the trail, the token, the segments and the length back",
    res10c.settled === 5 && res10c.lost.length === 0 && refs.length === 5
      && refs.every((r) => r.smsReference === refOf(r.id) && r.status === "SENT" && r.locale === "SW" && r.sentAt?.toISOString() === at43(5))
      && sameTrail(readBack?.gateTrail, trail("ok")) && readBack?.optOutToken === "K7MXP2QR" && readBack?.segments === 1 && readBack?.bodyLen === 72,
    `settled ${res10c.settled} · lost [${res10c.lost}] · ${refs.map((r) => `${r.id.slice(-2)}=${r.smsReference?.slice(-2)}`).join(" ")}`);

  // 10d · lost settles change nothing; the reaper's release and its increment
  {
    const beforeFive = json(await Promise.all([readIds[5], readIds[6]].map(sqlRow)));
    const foreign = await db.smsCampaignRecipient.settle([skippedP(readIds[5], "probe_tok_wrong_01"), skippedP(readIds[6], "probe_tok_wrong_01")], at43(103));
    const untouched = json(await Promise.all([readIds[5], readIds[6]].map(sqlRow))) === beforeFive;
    const second = await db.smsCampaignRecipient.settle([skippedP(readIds[0], tokR)], at43(104));
    // The reaper: a cutoff in the future makes both fresh claims stranded; one is released, attempts + 1.
    const stranded = await db.smsCampaignRecipient.findStranded(READ, at43(100_000), CM43.SMS_RECIPIENT_BATCH_MAX);
    const reaped = await db.smsCampaignRecipient.settle([{ id: readIds[5], claimToken: tokR2, to: "PENDING", attemptsDelta: 1 }], at43(105));
    const afterReap = await sqlRow(readIds[5]);
    const late = await db.smsCampaignRecipient.settle([skippedP(readIds[5], tokR2)], at43(106)); // the stalled slice comes back
    const afterLate = await sqlRow(readIds[5]);
    const again = await db.smsCampaignRecipient.claim(READ, 5, "probe_tok_read_0003", at43(107));
    ok("10d · a foreign claim, a second settle of a settled row and a stalled slice's late settle over its reaped row are each LOST and change nothing; the reaper's release lands — the claim's token cleared and its instant kept (D15), attempts moved on by exactly 1 ({ increment }) — and the row is claimable again",
      foreign.settled === 0 && foreign.lost.length === 2 && untouched && second.settled === 0 && second.lost.join(",") === readIds[0]
        && json(stranded.map((r) => r.id)) === json([readIds[5], readIds[6]]) && reaped.settled === 1
        && afterReap?.status === "PENDING" && afterReap.claimToken === null && afterReap.claimedAt?.toISOString() === at43(101) && afterReap.attempts === 1
        && late.settled === 0 && late.lost.join(",") === readIds[5] && json(afterLate) === json(afterReap) && json(again.map((r) => r.id)) === json([readIds[5]]),
      `foreign lost ${foreign.lost.length} · second lost [${second.lost.map((x) => x.slice(-2))}] · stranded [${stranded.map((r) => r.id.slice(-2))}] · after the release ${json(afterReap)} · late lost [${late.lost.map((x) => x.slice(-2))}] · claimed again [${again.map((r) => r.id.slice(-2))}]`);
  }

  // 10e · ⭐ UNCONFIRMED, written through the generated client, never goes back
  {
    const unc = await db.smsCampaignRecipient.settle([
      { id: readIds[6], claimToken: tokR2, to: "UNCONFIRMED", smsReference: "sms_probe_unconfirmed", optOutToken: null, locale: null, segments: null, bodyLen: null, gateTrail: trail("unconfirmed") },
    ], at43(108));
    const keep = json(await sqlRow(readIds[6]));
    const release = await db.smsCampaignRecipient.settle([{ id: readIds[6], claimToken: tokR2, to: "PENDING", attemptsDelta: 1 }], at43(109));
    const requeued = await db.smsCampaignRecipient.requeueHeld(READ, at43(110));
    const unmoved = json(await sqlRow(readIds[6])) === keep;
    // ⭐ DC-10 · the claim's STATUS test on its own. Every UNCONFIRMED row a door writes keeps its claim's token (D7), so a
    // claim that lost `status: "PENDING"` would still take nothing above — its token test alone refuses the row. A raw
    // repair or a receipt arm could clear the token, so it is cleared here by SQL, and the claim must still leave the row.
    await pg.$executeRawUnsafe(`update "SmsCampaignRecipient" set "claimToken" = null where id = $1`, readIds[6]);
    const bare = json(await sqlRow(readIds[6]));
    const claimed = await db.smsCampaignRecipient.claim(READ, 5, "probe_tok_read_0004", at43(111));
    const still = await sqlRow(readIds[6]);
    ok("10e · ⭐ UNCONFIRMED, WRITTEN THROUGH THE GENERATED CLIENT in a later transaction, NEVER GOES BACK: a release under its own claim is lost, the requeue moves nothing — and a new claim takes nothing even once the row's token is cleared by SQL (the claim's STATUS test, on its own): the row exactly as it was left",
      unc.settled === 1 && release.settled === 0 && requeued === 0 && unmoved && claimed.length === 0
        && still?.status === "UNCONFIRMED" && still.claimToken === null && json(still) === bare,
      `settled ${unc.settled} · release lost ${release.lost.length} · requeued ${requeued} · unmoved ${unmoved} · claimed ${claimed.length} · ${json(still)}`);
  }

  // 10f · the requeue takes HELD and only HELD
  {
    const Q = "probe_u43a_requeue";
    const q = await campaign43(Q, 4, 21100);
    const tokQ = "probe_tok_req_0001";
    await db.smsCampaignRecipient.claim(Q, 4, tokQ, at43(120));
    await db.smsCampaignRecipient.settle([
      { id: q[0], claimToken: tokQ, to: "HELD", failureClass: "gate_unanswered", attempts: 3 },
      { id: q[1], claimToken: tokQ, to: "HELD", failureClass: "gate_unanswered", attempts: 3 },
      skippedP(q[2], tokQ),
      { id: q[3], claimToken: tokQ, to: "UNCONFIRMED", smsReference: null, optOutToken: null, locale: null, segments: null, bodyLen: null, gateTrail: trail("unconfirmed") },
    ], at43(121));
    const keep = json(await Promise.all([q[2], q[3]].map(sqlRow)));
    const requeued = await db.smsCampaignRecipient.requeueHeld(Q, at43(122));
    const reset = await countRows(
      `select count(*)::int as n from "SmsCampaignRecipient" where "campaignId" = $1 and status = 'PENDING' and attempts = 0 and "claimToken" is null and "claimedAt" = $3 and "failureClass" is null and "updatedAt" = $2`,
      Q, new Date(at43(122)), new Date(at43(120)));
    ok("10f · requeueHeld moves the campaign's HELD rows and ONLY them — PENDING, attempts 0, the claim's token and the class cleared, the claim's instant kept (D15), the caller's stamp — and leaves the SKIPPED and the UNCONFIRMED row exactly as they were",
      requeued === 2 && reset === 2 && json(await Promise.all([q[2], q[3]].map(sqlRow))) === keep, `requeued ${requeued} · reset by SQL ${reset}`);
  }

  // 10g · the reaper's evidence: the newest message per target
  {
    const TT = "SmsCampaignRecipient";
    const msg = (reference: string, targetType: string, targetId: string, status: StoredSmsMessage["status"], s: number): StoredSmsMessage => ({
      reference, msisdn: keyOf(21200), purpose: "MARKETING", provider: "console", senderId: "50pick", bodyLen: 72, status,
      providerMsg: null, dlrStatus: null, dlrDesc: null, balanceTzs: null, attempts: 1, targetType, targetId, createdAt: at43(s),
      sentAt: status === "ACCEPTED" ? at43(s) : null, deliveredAt: null, failedAt: status === "FAILED" ? at43(s) : null,
    });
    // DC-2 · probe_ev_1's NEWEST message holds the LOWER reference: a pick by reference alone is seen, not only one by age
    await db.smsMessage.createMany([
      msg("sms_probe_ev_000000000a", TT, "probe_ev_1", "QUEUED", 210),
      msg("sms_probe_ev_000000000b", TT, "probe_ev_1", "FAILED", 200),
      msg("sms_probe_ev_000000000c", TT, "probe_ev_2", "ACCEPTED", 200),
      msg("sms_probe_ev_000000000d", TT, "probe_ev_2", "UNKNOWN", 200),
      msg("sms_probe_ev_000000000e", "InviteEntry", "probe_ev_1", "ACCEPTED", 220),
    ]);
    const evidence = await db.smsMessage.findByTargets(TT, ["probe_ev_2", "probe_ev_1", "probe_ev_none"]);
    const tooMany = await throws(() => db.smsMessage.findByTargets(TT, Array.from({ length: CM43.SMS_RECIPIENT_BATCH_MAX + 1 }, (_, i) => `probe_ev_${i}`)));
    const got = evidence.map((m) => `${m.targetId}:${m.reference.slice(-1)}:${m.status}`).join(",");
    ok("10g · the reaper's evidence on Postgres: the NEWEST message of the type asked for each target (a tie on the instant broken by the higher reference), none for a target without one, another type's newer message ignored, ordered by target id — and 201 ids refused",
      got === "probe_ev_1:a:QUEUED,probe_ev_2:d:UNKNOWN" && tooMany, `[${got}] · 201 ids ${tooMany ? "refused" : "ACCEPTED"}`);
  }

  // 10h · one transaction or nothing
  {
    const X = "probe_u43a_tx";
    const xs = await campaign43(X, 2, 21300);
    const tokX = "probe_tok_tx_00001";
    await db.smsCampaignRecipient.claim(X, 2, tokX, at43(300));
    const before = json(await Promise.all(xs.map(sqlRow)));
    let txError = "";
    let txCode: unknown = null;
    try {
      // xs[0] sorts first, so its statement RUNS first and lands — then xs[1]'s breaks the unique reference (10c's first
      // row holds it): the whole transaction must roll back, xs[0]'s write with it.
      await db.smsCampaignRecipient.settle([sentP(xs[0], tokX, "sms_probe_tx_fresh_0001"), sentP(xs[1], tokX, refOf(readIds[0]))], at43(301));
    } catch (e) {
      txError = firstLine(e);
      txCode = (e as { code?: unknown } | null)?.code;
    }
    ok("10h · ONE TRANSACTION OR NOTHING: a settle whose second statement breaks the unique reference is refused WHOLE with code P2002 (the code the memory twin's refusal carries too) — its first statement, which had run, rolled back with it",
      txError !== "" && txCode === "P2002" && json(await Promise.all(xs.map(sqlRow))) === before, `${txError || "the batch was ACCEPTED"} · code ${String(txCode)}`);
  }

  // 10i · lastActivity is Postgres' own max(claimedAt)
  {
    const newest = (await pg.$queryRawUnsafe<Array<{ m: Date | null }>>(`select max("claimedAt") as m from "SmsCampaignRecipient" where "campaignId" = $1`, FIVE))[0]?.m ?? null;
    const last = await db.smsCampaignRecipient.lastActivity(FIVE);
    await campaign43("probe_u43a_idle", 1, 21400);
    const idle = await db.smsCampaignRecipient.lastActivity("probe_u43a_idle");
    ok("10i · lastActivity is Postgres' own max(claimedAt) for the campaign — settled rows keep their claim — and null for a campaign nothing ever claimed",
      newest !== null && last === newest.toISOString() && idle === null, `${last} vs ${newest === null ? null : newest.toISOString()} · idle ${idle}`);
  }

  // 10j · RECORDED · the claim's plan at 150,000 rows — U45's index decision is taken on these numbers
  {
    const SCALE = "probe_u43a_scale";
    await db.smsCampaign.create(draft(SCALE));
    const inserted = await pg.$executeRawUnsafe(
      `insert into "SmsCampaignRecipient" ("id", "campaignId", "msisdn", "updatedAt") select 'probe_sc_' || lpad(g::text, 6, '0'), $1, '2557' || lpad(g::text, 8, '0'), now() from generate_series(1, 150000) g`,
      SCALE);
    await pg.$executeRawUnsafe(`analyze "SmsCampaignRecipient"`);
    // The campaign id is this probe's own constant, inlined: EXPLAIN is a utility statement, so it is not handed a bind
    // parameter (the claim itself, measured below, binds as Prisma does).
    const plan = await pg.$queryRawUnsafe<Array<{ "QUERY PLAN": string }>>(
      `explain (analyze, buffers) select "id" from "SmsCampaignRecipient" where "campaignId" = '${SCALE}' and "status" = 'PENDING' and "claimToken" is null order by "id" asc limit 50`);
    const t0 = Date.now();
    const first = await db.smsCampaignRecipient.claim(SCALE, CM43.SMS_RECIPIENT_CLAIM_MAX, "probe_tok_scale_01", at43(400));
    const claimMs = Date.now() - t0;
    // DC-9 · the reaper's read (every step) and the activity read (every poll), at the same scale: D7 keeps a token on every
    // settled and held row, so the claimToken index cannot narrow `claimToken is not null` — U45 decides on these plans too
    const cutoff = at43(100_000);
    const strandedPlan = await pg.$queryRawUnsafe<Array<{ "QUERY PLAN": string }>>(
      `explain (analyze, buffers) select * from "SmsCampaignRecipient" where "campaignId" = '${SCALE}' and "status" = 'PENDING' and "claimToken" is not null and "claimedAt" < '${cutoff}' order by "claimedAt" asc, "id" asc limit ${CM43.SMS_RECIPIENT_BATCH_MAX}`);
    const activityPlan = await pg.$queryRawUnsafe<Array<{ "QUERY PLAN": string }>>(
      `explain (analyze, buffers) select max("claimedAt") from "SmsCampaignRecipient" where "campaignId" = '${SCALE}'`);
    const t1 = Date.now();
    const stranded = await db.smsCampaignRecipient.findStranded(SCALE, cutoff, CM43.SMS_RECIPIENT_BATCH_MAX);
    const strandedMs = Date.now() - t1;
    const t2 = Date.now();
    const last = await db.smsCampaignRecipient.lastActivity(SCALE);
    const activityMs = Date.now() - t2;
    console.log("   10j · the claim's candidate read at 150,000 PENDING rows — recorded for U45's index decision:");
    for (const line of plan) console.log(`     ${line["QUERY PLAN"]}`);
    console.log(`   10j · the whole claim (the token check, the find, the conditional update, the read by token) took ${claimMs} ms`);
    console.log("   10j · the reaper's read (findStranded) at the same scale:");
    for (const line of strandedPlan) console.log(`     ${line["QUERY PLAN"]}`);
    console.log(`   10j · findStranded took ${strandedMs} ms`);
    console.log("   10j · the activity read (lastActivity) at the same scale:");
    for (const line of activityPlan) console.log(`     ${line["QUERY PLAN"]}`);
    console.log(`   10j · lastActivity took ${activityMs} ms`);
    const want = Array.from({ length: 50 }, (_, i) => `probe_sc_${String(i + 1).padStart(6, "0")}`);
    ok("10j · RECORDED · 150,000 PENDING rows on one campaign: the plans of the claim's candidate read, the reaper's read and the activity read are printed above for U45 (the indexes are U45's to decide); the claim still takes exactly the FIRST 50 by id, the reaper's read answers those 50 and the activity read their claim's instant",
      inserted === 150000 && plan.length > 0 && strandedPlan.length > 0 && activityPlan.length > 0 && json(first.map((r) => r.id)) === json(want)
        && json(stranded.map((r) => r.id)) === json(want) && last === at43(400),
      `${inserted} inserted · plans ${plan.length}/${strandedPlan.length}/${activityPlan.length} line(s) · the claim ${claimMs} ms, findStranded ${strandedMs} ms (${stranded.length} rows), lastActivity ${activityMs} ms (${last}) · first ${first[0]?.id ?? "none"} … ${first[first.length - 1]?.id ?? "none"}`);
  }
}

// ── 11 · U46a · the receipt door through the REAL Prisma twin (ENGINE-SPEC §4.14): a receipt moves its row and no other,
//        never back; it is refused on another number or another message's reference; Postgres's own unique reference
//        refuses a second holder (P2002) and changes nothing; and a receipt RACING the slice's settle on one claimed row —
//        twenty races, truly concurrent on the pool — ends every row DELIVERED, with no error ─────────────────────────────
{
  const CM46 = await import("../../src/lib/server/marketing/campaign-model.ts");
  const NL = String.fromCharCode(10);
  const json = (v: unknown) => JSON.stringify(v);
  const firstLine = (e: unknown) =>
    (String((e as Error)?.message ?? e).split(NL).map((s) => s.trim()).find((s) => s !== "") ?? "(an error with no message)").slice(0, 200);
  const T46 = Date.parse("2026-10-07T12:00:00.000Z");
  const at46 = (s: number) => new Date(T46 + s * 1000).toISOString();
  const trail46: SmsCampaignGateTrail = [{ check: "probe", verdict: "ok", wording: null, source: "u46a" }];
  const C46 = "probe_u46a";
  await db.smsCampaign.create(draft(C46));
  const ids = Array.from({ length: 40 }, (_, i) => `probe_u46a_${String(i).padStart(3, "0")}`);
  const key46 = (i: number) => keyOf(30000 + i);
  const ref46 = (i: number) => `probe_ref46_${String(i).padStart(3, "0")}`;
  await db.smsCampaignRecipient.createMany(ids.map((x, i) => seed(x, C46, key46(i))));
  const tok46 = "probe_tok_u46a";
  const won46 = await db.smsCampaignRecipient.claim(C46, 40, tok46, at46(1));
  const sent46 = (i: number): SmsCampaignRecipientSettle => ({
    id: ids[i], claimToken: tok46, to: "SENT", smsReference: ref46(i), sentAt: at46(2), optOutToken: "K7MXP2QR", locale: "SW",
    segments: 1, bodyLen: 72, gateTrail: trail46,
  });
  // rows 0–9 SENT with their own references; rows 10–29 stay claimed PENDING for the races; 30–39 stay claimed PENDING
  const settled46 = await db.smsCampaignRecipient.settle(Array.from({ length: 10 }, (_, i) => sent46(i)), at46(2));
  type Row46 = { status: string; smsReference: string | null; deliveredAt: Date | null; failedAt: Date | null; failureClass: string | null; error: string | null };
  const row46 = async (id: string): Promise<Row46 | null> => (await pg.$queryRawUnsafe<Row46[]>(
    `select status::text as status, "smsReference", "deliveredAt", "failedAt", "failureClass", error from "SmsCampaignRecipient" where id = $1`, id))[0] ?? null;
  const receipt = (i: number, o: Partial<SmsRecipientReceipt> = {}): SmsRecipientReceipt =>
    ({ reference: ref46(i), msisdn: key46(i), status: "DELIVERED", rawStatus: "DELIVRD", desc: null, at: at46(10), ...o });
  ok("11 · U46a · CONTROL · 40 rows claimed by one token, the first 10 settled SENT with their own references",
    won46.length === 40 && settled46.settled === 10 && settled46.lost.length === 0 && (await row46(ids[0]))?.status === "SENT" && (await row46(ids[0]))?.smsReference === ref46(0),
    `claimed ${won46.length} · settle ${json(settled46)}`);

  // 11a · a DELIVERED receipt moves its SENT row — and no other row
  {
    const before = await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where "campaignId" = $1 and status = 'DELIVERED'`, C46);
    const r = await db.smsCampaignRecipient.recordReceipt(ids[0], receipt(0));
    const after = await row46(ids[0]);
    const delivered = await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where "campaignId" = $1 and status = 'DELIVERED'`, C46);
    ok("11a · a DELIVERED receipt on its SENT row is applied: the row reads DELIVERED in SQL at the receipt's instant, and no other row moved",
      r.changed && r.reason === "applied" && after?.status === "DELIVERED" && after.deliveredAt?.toISOString() === at46(10)
        && before === 0 && delivered === 1, `${json(r)} · ${json(after)} · delivered ${before} → ${delivered}`);
  }
  // 11b · never back: a FAILED receipt after the delivery, and the same DELIVERED again, change nothing
  {
    const late = await db.smsCampaignRecipient.recordReceipt(ids[0], receipt(0, { status: "FAILED", rawStatus: "UNDELIV", desc: "late", at: at46(11) }));
    const again = await db.smsCampaignRecipient.recordReceipt(ids[0], receipt(0, { at: at46(12) }));
    const after = await row46(ids[0]);
    ok("11b · never back: a FAILED receipt after the delivery and the same DELIVERED again are `settled` — the row still DELIVERED at the FIRST instant, no failure written",
      !late.changed && late.reason === "settled" && !again.changed && again.reason === "settled" && after?.status === "DELIVERED"
        && after.deliveredAt?.toISOString() === at46(10) && after.failedAt === null && after.error === null, `${json(late)} · ${json(again)} · ${json(after)}`);
  }
  // 11c · a FAILED receipt writes its class and its words — then nothing moves it
  {
    const r = await db.smsCampaignRecipient.recordReceipt(ids[1], receipt(1, { status: "FAILED", rawStatus: "UNDELIV", desc: "absent subscriber", at: at46(13) }));
    const after = await row46(ids[1]);
    const late = await db.smsCampaignRecipient.recordReceipt(ids[1], receipt(1, { at: at46(14) }));
    ok("11c · a FAILED receipt writes FAILED, its class `receipt:UNDELIV` and its words, in SQL — and a DELIVERED after it is `settled`",
      r.changed && after?.status === "FAILED" && after.failureClass === `${CM46.SMS_RECEIPT_CLASS_PREFIX}UNDELIV` && after.error === "absent subscriber"
        && after.failedAt?.toISOString() === at46(13) && !late.changed && late.reason === "settled" && (await row46(ids[1]))?.status === "FAILED",
      `${json(r)} · ${json(after)} · ${json(late)}`);
  }
  // 11d · the identity: another number, or another message's reference, moves nothing; an unknown id is `not_found`
  {
    const wrongNumber = await db.smsCampaignRecipient.recordReceipt(ids[2], receipt(2, { msisdn: key46(3) }));
    const wrongRef = await db.smsCampaignRecipient.recordReceipt(ids[2], receipt(2, { reference: ref46(3) }));
    const nobody = await db.smsCampaignRecipient.recordReceipt("probe_u46a_no_such_row", receipt(2));
    const after = await row46(ids[2]);
    ok("11d · the WHERE holds on Postgres: another number and another message's reference are `mismatch`, an unknown id `not_found` — the row still SENT",
      wrongNumber.reason === "mismatch" && wrongRef.reason === "mismatch" && nobody.reason === "not_found" && !wrongNumber.changed && !wrongRef.changed
        && after?.status === "SENT" && after.deliveredAt === null, `${json(wrongNumber)} · ${json(wrongRef)} · ${json(nobody)} · ${json(after)}`);
  }
  // 11e · Postgres's unique reference: a receipt that would give a second row a reference another row holds is refused by
  // the database itself (P2002) and changes nothing
  {
    let code = "", message = "";
    try {
      await db.smsCampaignRecipient.recordReceipt(ids[30], receipt(30, { reference: ref46(4) }));
    } catch (e) {
      code = String((e as { code?: unknown }).code ?? "");
      message = firstLine(e);
    }
    const after = await row46(ids[30]);
    const holder = await row46(ids[4]);
    ok("11e · a receipt giving a claimed PENDING row a reference row 4 already holds: refused by Postgres (P2002), the row still PENDING with no reference, row 4 untouched",
      code === "P2002" && after?.status === "PENDING" && after.smsReference === null && holder?.status === "SENT" && holder.smsReference === ref46(4),
      `code ${code || "(none)"} · ${message} · ${json(after)} · ${json(holder)}`);
  }
  // 11f · ⭐ a receipt RACING the slice's settle on one claimed row — twenty races, both writes truly concurrent on the pool:
  // whichever lands first, every row ends DELIVERED, at most one write per row is lost, and nothing throws
  {
    const errors: string[] = [];
    const outcomes: string[] = [];
    await Promise.all(Array.from({ length: 20 }, (_, k) => 10 + k).map(async (i) => {
      const [s, r] = await Promise.allSettled([
        db.smsCampaignRecipient.settle([sent46(i)], at46(20)),
        db.smsCampaignRecipient.recordReceipt(ids[i], receipt(i, { at: at46(20) })),
      ]);
      if (s.status === "rejected") errors.push(`settle ${i}: ${firstLine(s.reason)}`);
      if (r.status === "rejected") errors.push(`receipt ${i}: ${firstLine(r.reason)}`);
      if (r.status === "fulfilled") outcomes.push(r.value.reason);
    }));
    const delivered = await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where id = any($1::text[]) and status = 'DELIVERED' and "smsReference" is not null`, ids.slice(10, 30));
    ok("11f · ⭐ twenty receipts racing twenty settles, each pair truly concurrent: every row ends DELIVERED with its reference, and nothing throws",
      errors.length === 0 && delivered === 20 && outcomes.every((o) => o === "applied"),
      `${delivered}/20 DELIVERED · receipts ${json(outcomes.reduce<Record<string, number>>((m, o) => ({ ...m, [o]: (m[o] ?? 0) + 1 }), {}))} · errors ${json(errors)}`);
  }
}

await pg.$disconnect().catch(() => {});

console.log(`\ncampaign-models-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
