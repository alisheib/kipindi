/**
 * U16a · erasure's unlink and the access export's read ON A REAL POSTGRES — the Prisma twin, which no suite on this
 * laptop executes.
 *
 * ⭐ WHY THIS EXISTS. `test:campaign-privacy` runs both members on the MEMORY twin, and `test:dal-parity` §26.u16a holds
 * the Prisma twin's SHAPE. Neither sends one statement to Postgres — and whether the bound really sits in the WHERE at the
 * millisecond on Timestamptz(3), whether the OR really admits a row created before the bound but SENT after it (D12) and
 * nothing else that is older, whether a tie really breaks on the id the memory twin's way, whether the read really hands
 * back the NEWEST rows and ONE past the cap (D10), whether `updateMany` really writes only the link and the caller's
 * instant (not an `@updatedAt` of Prisma's own), and whether Prisma really reads `userId: undefined` as NO CONDITION — the
 * trap the rule set exists to refuse — are facts about the database and its client. This writes to a scratch PostgreSQL
 * (embedded 18.3, `db-scratch`) through the REAL `db`, and checks each fact against answers written here by hand.
 *
 *   0  CONTROL · the db is the Prisma twin;
 *   1  listByMsisdn · a row AT the bound counted and one a millisecond before it not; a row created before the bound but
 *      sent after it counted, one sent before it and one never sent not; newest first, a tie broken on the id descending,
 *      another number's row never;
 *   2  the cap · 5,005 rows at one number give exactly SMS_RECIPIENTS_BY_NUMBER_MAX + 1 (5,001) — the newest — so the
 *      export can tell it cut;
 *   3  unlinkUser · ONE statement: the account's rows lose the link and keep every other column byte for byte (read back
 *      by SQL), `updatedAt` is the caller's instant, another account's rows and an unlinked row are untouched, no row is
 *      deleted, and a second call unlinks 0;
 *   4  the trap is real — a count WHERE `userId: undefined` counts every row — and the DAL refuses a missing or empty id
 *      before Postgres is asked, changing nothing;
 *   5  listByMsisdn refuses a `+255` spelling, a missing number and a bound in another spelling.
 *
 * ⛔ A LOOPBACK CLUSTER ONLY: it writes rows. ⛔ No backslash anywhere in this file (the tools that write it decode escapes).
 *
 * Run (through the heavy-node lock; it needs a migrated EMPTY database):
 *   npm run db:probe-campaign-privacy   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this probe)
 */
import type { StoredSmsCampaign, SmsCampaignRecipientSeed, StoredUser } from "../../src/lib/server/store.ts";

process.exitCode = 1;
if (!process.env.DATABASE_URL) {
  console.error("campaign-privacy-pg-probe: needs DATABASE_URL (a scratch Postgres) — refusing to run on the memory twin, which proves nothing here.");
  process.exit(2);
}
{
  // ⛔ A LOOPBACK CLUSTER ONLY (house-bot-migrations' rule): this probe WRITES campaigns, recipients and accounts, so a
  // URL whose host is not 127.0.0.1, localhost or ::1 (production's, a hosted scratch) is refused before the store loads.
  let host = "";
  try { host = new URL(process.env.DATABASE_URL).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("campaign-privacy-pg-probe: refusing — it writes rows, and runs only against a loopback scratch cluster (db-scratch).");
    process.exit(2);
  }
}

const { db } = await import("../../src/lib/server/store.ts");
const { prisma } = await import("../../src/lib/server/prisma.ts");
const { SMS_RECIPIENTS_BY_NUMBER_MAX } = await import("../../src/lib/server/marketing/campaign-model.ts");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const pg = prisma();
if (!pg) throw new Error("campaign-privacy-pg-probe: no Prisma client");
/** A count straight from SQL — the database's own answer, not a twin's. */
const countRows = async (sql: string, ...params: unknown[]): Promise<number> =>
  Number((await pg.$queryRawUnsafe<Array<{ n: number }>>(sql, ...params))[0]?.n ?? -1);
/** One row as Postgres holds it, minus the two columns erasure may write — so "kept" is a fact about the table. */
const rowKept = async (id: string): Promise<string> =>
  JSON.stringify((await pg.$queryRawUnsafe<Array<{ j: unknown }>>(
    `select to_jsonb(r) - 'userId' - 'updatedAt' as j from "SmsCampaignRecipient" r where id = $1`, id))[0]?.j ?? null);
/** A row's `updatedAt` as the timestamptz Postgres holds, to the millisecond (Timestamptz(3)) — "absent" when there is no
 *  such row — so "the stamp is untouched" is compared exactly, never to the second. */
const stampOf = async (id: string): Promise<string> => {
  const rows = await pg.$queryRawUnsafe<Array<{ u: Date }>>(`select "updatedAt" as u from "SmsCampaignRecipient" where id = $1`, id);
  return rows[0] ? new Date(rows[0].u).toISOString() : "absent";
};
async function throws(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}

const T0 = Date.parse("2026-10-04T09:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const OFFICER = "probe_officer";
const draft = (id: string): StoredSmsCampaign => ({
  id, name: `Probe ${id}`, status: "DRAFT", bodySw: "50pick: Habari, soka leo.", bodyEn: null, codingSw: "GSM7", segmentsSw: 1,
  codingEn: null, segmentsEn: null, nameFallbackSw: null, nameFallbackEn: null, sourcePhrase: null, draftRevision: 0,
  confirmTier: null, audienceFilter: '{"consent":["GIVEN"]}', audienceCount: null, audienceWatermark: null, estimateSegments: null,
  estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null, createdBy: OFFICER,
  confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null, createdAt: iso(T0), updatedAt: iso(T0),
});
const seed = (id: string, campaignId: string, msisdn: string, createdAt: string, userId: string | null = null): SmsCampaignRecipientSeed =>
  ({ id, campaignId, msisdn, contactId: null, userId, optOutToken: null, createdAt });
const user = (id: string, phoneE164: string): StoredUser => ({
  id, phoneE164, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null, acceptedTermsVersion: "v3",
  acceptedTermsAt: iso(T0), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, createdAt: iso(T0),
  updatedAt: iso(T0), lastLoginAt: null, closedAt: null,
} as StoredUser);
/** One campaign per row: a number is on a campaign once (the unique key), and these rows all share one number. */
async function rowOn(campaignId: string, s: SmsCampaignRecipientSeed): Promise<void> {
  await db.smsCampaign.create(draft(campaignId));
  const r = await db.smsCampaignRecipient.createMany([s]);
  if (r.inserted !== 1) throw new Error(`probe fixture: ${s.id} was not inserted`);
}

// ── 0 · the twin IS Prisma ──────────────────────────────────────────────────────────────────────────────────────
{
  await db.smsCampaign.create(draft("probe_pv_c0"));
  ok("0 · CONTROL · the db is the Prisma twin: a campaign written through it is a row in Postgres",
    (await countRows(`select count(*)::int as n from "SmsCampaign" where id = $1`, "probe_pv_c0")) === 1);
}

// ── 1 · the bound in the WHERE, the order, the tie ──────────────────────────────────────────────────────────────
{
  const N = "255710990001", OTHER = "255710990002";
  const SINCE = iso(T0 - 10 * 86_400_000);
  const ms = Date.parse(SINCE);
  await rowOn("probe_pv_c_before", seed("probe_pv_before", "probe_pv_c_before", N, iso(ms - 1)));
  await rowOn("probe_pv_c_at", seed("probe_pv_at", "probe_pv_c_at", N, SINCE));
  await rowOn("probe_pv_c_mid", seed("probe_pv_mid", "probe_pv_c_mid", N, iso(ms + 60_000)));
  await rowOn("probe_pv_c_tie_a", seed("probe_pv_tie_a", "probe_pv_c_tie_a", N, iso(ms + 120_000)));
  await rowOn("probe_pv_c_tie_b", seed("probe_pv_tie_b", "probe_pv_c_tie_b", N, iso(ms + 120_000)));
  await rowOn("probe_pv_c_other", seed("probe_pv_other", "probe_pv_c_other", OTHER, iso(ms + 180_000)));
  // D12 · three rows put on a campaign BEFORE the bound: one sent after it (the number had passed — it counts), one sent
  // before it and one never sent (neither counts). `sentAt` is set by SQL, as U43a's settle will set it.
  await rowOn("probe_pv_c_sent_after", seed("probe_pv_sent_after", "probe_pv_c_sent_after", N, iso(ms - 3_600_000)));
  await rowOn("probe_pv_c_sent_before", seed("probe_pv_sent_before", "probe_pv_c_sent_before", N, iso(ms - 7_200_000)));
  await rowOn("probe_pv_c_never_sent", seed("probe_pv_never_sent", "probe_pv_c_never_sent", N, iso(ms - 5_400_000)));
  await pg.$executeRawUnsafe(`update "SmsCampaignRecipient" set status = 'SENT', "sentAt" = $2::timestamptz where id = $1`, "probe_pv_sent_after", iso(ms + 30_000));
  await pg.$executeRawUnsafe(`update "SmsCampaignRecipient" set status = 'SENT', "sentAt" = $2::timestamptz where id = $1`, "probe_pv_sent_before", iso(ms - 1));
  const got = (await db.smsCampaignRecipient.listByMsisdn(N, SINCE)).map((r) => r.id);
  const want = ["probe_pv_tie_b", "probe_pv_tie_a", "probe_pv_mid", "probe_pv_at", "probe_pv_sent_after"];
  ok("1 · ⭐ on Postgres the read holds the bound IN its WHERE — the row AT the bound counted, the one a millisecond before not; a row created before the bound but SENT after it counted, one sent a millisecond before it and one never sent not (D12) — newest first by createdAt, the tie broken on the id descending, another number's row never",
    got.join(",") === want.join(","), `got [${got.join(", ")}]`);
}

// ── 2 · the read hands back the NEWEST rows and ONE past the cap (D10) ─────────────────────────────────────────────
{
  const N = "255710990003";
  const BASE = iso(T0 - 5 * 86_400_000);
  await pg.$executeRawUnsafe(
    `insert into "SmsCampaign" (id, name, status, "bodySw", "codingSw", "segmentsSw", "audienceFilter", "createdBy", "createdAt", "updatedAt")
     select 'probe_cap_c' || g, 'Probe cap ' || g, 'DONE', '50pick: cap.', 'GSM7', 1, '{}', 'probe_officer', now(), now()
     from generate_series(0, 5004) g`);
  await pg.$executeRawUnsafe(
    `insert into "SmsCampaignRecipient" (id, "campaignId", msisdn, "createdAt", "updatedAt")
     select 'probe_cap_r' || lpad(g::text, 4, '0'), 'probe_cap_c' || g, $1, $2::timestamptz + make_interval(mins => g), now()
     from generate_series(0, 5004) g`, N, BASE);
  const got = await db.smsCampaignRecipient.listByMsisdn(N, BASE);
  ok("2 · the cap: 5,005 rows at one number give exactly SMS_RECIPIENTS_BY_NUMBER_MAX + 1 (5,001) — the NEWEST, the four oldest left out — so the export can tell it cut",
    SMS_RECIPIENTS_BY_NUMBER_MAX === 5000 && got.length === 5001 && got[0]?.id === "probe_cap_r5004" && got[5000]?.id === "probe_cap_r0004",
    `${got.length} rows · first ${got[0]?.id} · last ${got[got.length - 1]?.id}`);
}

// ── 3 · the unlink: one statement, the link and the instant only ────────────────────────────────────────────────
{
  await db.user.create(user("probe_pv_ua", "+255710990011"));
  await db.user.create(user("probe_pv_ub", "+255710990012"));
  const N = "255710990011", OLD = "255710990013";
  const created = iso(T0 - 86_400_000);
  await rowOn("probe_pv_c_u1", seed("probe_pv_u1", "probe_pv_c_u1", N, created, "probe_pv_ua"));
  await rowOn("probe_pv_c_u2", seed("probe_pv_u2", "probe_pv_c_u2", N, created, "probe_pv_ua"));
  await rowOn("probe_pv_c_u3", seed("probe_pv_u3", "probe_pv_c_u3", OLD, created, "probe_pv_ua"));
  await rowOn("probe_pv_c_b1", seed("probe_pv_b1", "probe_pv_c_b1", N, iso(T0 - 400 * 86_400_000), "probe_pv_ub"));
  await rowOn("probe_pv_c_n1", seed("probe_pv_n1", "probe_pv_c_n1", N, created, null));
  // Settled by SQL, as U43a's settle will — so "every other column kept" covers a status, a reference and a trail.
  await pg.$executeRawUnsafe(
    `update "SmsCampaignRecipient" set status = 'DELIVERED', "smsReference" = 'probe_pv_ref_1', "sentAt" = $2::timestamptz,
       "deliveredAt" = $2::timestamptz, "gateTrail" = '[{"check":"gate","verdict":"ok","wording":null,"source":null}]'::jsonb
     where id = $1`, "probe_pv_u2", created);
  const ids = ["probe_pv_u1", "probe_pv_u2", "probe_pv_u3"];
  const keptBefore = await Promise.all(ids.map(rowKept));
  const otherBefore = await rowKept("probe_pv_b1");
  const noneBefore = await rowKept("probe_pv_n1");
  const otherStamp = await stampOf("probe_pv_b1");
  const noneStamp = await stampOf("probe_pv_n1");
  const total = await countRows(`select count(*)::int as n from "SmsCampaignRecipient"`);
  const AT = iso(T0 + 3_600_000);
  const unlinked = await db.smsCampaignRecipient.unlinkUser("probe_pv_ua", AT);
  const keptAfter = await Promise.all(ids.map(rowKept));
  const links = await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where "userId" = $1`, "probe_pv_ua");
  const stamps = await pg.$queryRawUnsafe<Array<{ u: Date }>>(`select "updatedAt" as u from "SmsCampaignRecipient" where id = any($1::text[])`, ids);
  const again = await db.smsCampaignRecipient.unlinkUser("probe_pv_ua", AT);
  ok("3 · ⭐ unlinkUser on Postgres: the account's 3 rows (one at its old number) lose the link — 3 counted — and keep EVERY other column byte for byte, the status, the reference and the trail included; no row deleted",
    unlinked === 3 && links === 0 && keptAfter.every((k, i) => k === keptBefore[i] && k !== "null")
      && (await countRows(`select count(*)::int as n from "SmsCampaignRecipient"`)) === total,
    `unlinked ${unlinked} · links left ${links} · kept ${keptAfter.every((k, i) => k === keptBefore[i])}`);
  ok("3b · `updatedAt` is the caller's instant on every unlinked row — explicit (C25), never an @updatedAt of Prisma's own",
    stamps.length === 3 && stamps.every((s) => new Date(s.u).toISOString() === AT), stamps.map((s) => new Date(s.u).toISOString()).join(", "));
  const otherStampAfter = await stampOf("probe_pv_b1");
  const noneStampAfter = await stampOf("probe_pv_n1");
  ok("3c · another account's row at the same number and an unlinked row are untouched — link, columns and stamp (each `updatedAt` equal to the millisecond) — and a second call unlinks 0",
    (await rowKept("probe_pv_b1")) === otherBefore && (await rowKept("probe_pv_n1")) === noneBefore
      && (await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where id = $1 and "userId" = $2`, "probe_pv_b1", "probe_pv_ub")) === 1
      && otherStamp !== "absent" && otherStampAfter === otherStamp && noneStamp !== "absent" && noneStampAfter === noneStamp
      && again === 0,
    `second call ${again} · stamps ${otherStamp} → ${otherStampAfter}, ${noneStamp} → ${noneStampAfter}`);
}

// ── 4 · the NO-CONDITION trap is real on Postgres, and the DAL refuses it first ─────────────────────────────────
{
  const all = await countRows(`select count(*)::int as n from "SmsCampaignRecipient"`);
  const viaTrap = await pg.smsCampaignRecipient.count({ where: { userId: undefined } });
  const linkedBefore = await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where "userId" is not null`);
  const refusedMissing = await throws(() => db.smsCampaignRecipient.unlinkUser(undefined as unknown as string, iso(T0)));
  const refusedEmpty = await throws(() => db.smsCampaignRecipient.unlinkUser("", iso(T0)));
  const linkedAfter = await countRows(`select count(*)::int as n from "SmsCampaignRecipient" where "userId" is not null`);
  ok("4 · CONTROL · the trap is REAL on Postgres: a count WHERE userId is undefined counts EVERY row — so an updateMany with it would unlink them all",
    all > SMS_RECIPIENTS_BY_NUMBER_MAX && viaTrap === all, `${viaTrap} of ${all}`);
  ok("4b · ⛔ …and the DAL refuses a missing and an empty account id BEFORE Postgres is asked — nothing unlinked",
    refusedMissing && refusedEmpty && linkedAfter === linkedBefore && linkedBefore > 0, `refused ${refusedMissing}/${refusedEmpty} · linked ${linkedBefore} → ${linkedAfter}`);
}

// ── 5 · the read refuses a spelling no row holds, a missing number and a bound in another spelling ──────────────
{
  const refusedPlus = await throws(() => db.smsCampaignRecipient.listByMsisdn("+255710990001", iso(T0 - 30 * 86_400_000)));
  const refusedMissing = await throws(() => db.smsCampaignRecipient.listByMsisdn(undefined as unknown as string, iso(T0 - 30 * 86_400_000)));
  const refusedBound = await throws(() => db.smsCampaignRecipient.listByMsisdn("255710990001", "2026-09-24T12:00:00+03:00"));
  ok("5 · ⛔ listByMsisdn refuses a +255 spelling, a missing number (NO CONDITION: every number's rows) and a bound in another spelling — before Postgres is asked",
    refusedPlus && refusedMissing && refusedBound, `refused ${refusedPlus}/${refusedMissing}/${refusedBound}`);
}

console.log(`${String.fromCharCode(10)}campaign-privacy-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
