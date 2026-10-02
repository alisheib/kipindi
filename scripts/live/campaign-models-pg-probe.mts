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
 * Run (through the heavy-node lock; it needs a migrated EMPTY database):
 *   npx tsx scripts/db-scratch.mts --reset --run bash -c 'DATABASE_URL="$VERIFY_DATABASE_URL" npx prisma migrate deploy && DATABASE_URL="$VERIFY_DATABASE_URL" npx tsx scripts/live/campaign-models-pg-probe.mts'
 */
import type { StoredSmsCampaign, SmsCampaignRecipientSeed, SmsCampaignTransitionPatch, StoredUser } from "../../src/lib/server/store.ts";

process.exitCode = 1;
if (!process.env.DATABASE_URL) {
  console.error("campaign-models-pg-probe: needs DATABASE_URL (a scratch Postgres) — refusing to run on the memory twin, which proves nothing here.");
  process.exit(2);
}
{
  // ⛔ A LOOPBACK CLUSTER ONLY (house-bot-migrations' rule): this probe WRITES campaigns, recipients, a contact and an
  // account, and deletes the last two by raw SQL — so a URL whose host is not 127.0.0.1, localhost or ::1 (production's,
  // a hosted scratch) is refused before the store is even loaded.
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

console.log(`\ncampaign-models-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
