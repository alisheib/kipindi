/**
 * U33a-L · THE LIST BASIS ON A REAL POSTGRES — and the SAME scenario on the memory twin, answer for answer.
 *
 * ⭐ WHY THIS EXISTS. `test:dal-parity` §27 holds both twins' SHAPE, and nothing on this laptop sends one statement to
 * Postgres. Whether a revoked newest recording really ends a list's coverage, whether `<=` really holds at the millisecond
 * on `Timestamptz(3)` — across two spellings of one instant — whether the same-instant tie really breaks on the id, whether
 * RESTRICT really refuses deleting a list that carries a basis, whether `standingAmong` really answers 2,000 numbers one for
 * one: those are facts about the database. Whether the MEMORY twin gives the same answers — the same rows, the same
 * refusals, the same codes — is a fact about the twins. So the scenario below runs twice — here, through the REAL `db` on a
 * scratch PostgreSQL 18.3, and in a child process with USE_PRISMA_DAL=false — and every answer must be identical between
 * the two AND equal to the answers written here by hand, an oracle independent of either twin.
 *
 *   0  every migration on disk is applied (finished, none rolled back) — the runner applied them to an EMPTY cluster —
 *      and the five tables this probe writes start empty;
 *   1  the drift diff names ONLY the new objects: from every migration but `…_contact_list_basis` to schema.prisma, the
 *      statements beyond the full set's are exactly the table, its two indexes and its foreign key — equal, whitespace
 *      aside, to the hand-written migration — and the migrated database differs from the schema in nothing that names
 *      ContactListBasis;
 *   2  the scenario on Postgres, through `db`, against the hand-written answers — the rule set's refusals (2j) and a
 *      list's ONE standing being its newest recording (2k) among them, and (C8b · B5, 2l) `coverageSplit`: the same
 *      lists' figures split by the account link, its unlinked half `coveredCount`'s pair at every step;
 *   3  the same-millisecond boundary on Timestamptz(3), read back by SQL;
 *   4  RESTRICT refuses deleting a list that carries a basis — and a list without one deletes, its member cascading;
 *   5  the memory twin's transcript of the same scenario equals Postgres', answer for answer.
 *
 * ⛔ A LOOPBACK CLUSTER ONLY: it writes and deletes rows and creates a database (the drift diff's shadow). ⛔ No backslash
 * anywhere in this file: line breaks and the NUL are built with String.fromCharCode (the tools that write it decode escapes).
 *
 * Run (through the heavy-node lock; it needs a migrated EMPTY database, runs the Prisma CLI three times and one child):
 *   npm run db:probe-list-basis   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this probe)
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type {
  ContactListBasisSeed, StoredContactList, StoredContactListMember, StoredMarketingContact, StoredUser,
} from "../../src/lib/server/store.ts";
import { ERASURE_EVIDENCE } from "../../src/lib/marketing/erasure-mark.ts";

process.exitCode = 1;
const PHASE = process.env.LIST_BASIS_PROBE_PHASE ?? "";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SELF = "scripts/live/list-basis-pg-probe.mts";
const MIGRATIONS = join(ROOT, "prisma", "migrations");
const SCHEMA = join(ROOT, "prisma", "schema.prisma");
const SHADOW_DB = "list_basis_probe_shadow";
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const NUL = String.fromCharCode(0);
const URL_RAW = process.env.DATABASE_URL ?? "";
if (!URL_RAW) {
  console.error("list-basis-pg-probe: needs DATABASE_URL (a scratch Postgres) — the memory twin alone proves nothing about Postgres.");
  process.exit(2);
}
{
  let host = "";
  try { host = new URL(URL_RAW).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("list-basis-pg-probe: refusing — it writes and deletes rows and creates a database, and runs only against a loopback scratch cluster (db-scratch).");
    process.exit(2);
  }
}

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const json = (v: unknown) => JSON.stringify(v);
/** JSON with every object's keys sorted — two twins that build one answer in a different key order still compare equal. */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x !== null && typeof x === "object" && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x as Record<string, unknown>).sort().map((k) => [k, (x as Record<string, unknown>)[k]]))
  : x));
const eq = (a: unknown, b: unknown): boolean => canon(a) === canon(b);
const sameSet = (a: readonly string[], b: readonly string[]): boolean => {
  const x = [...a].sort(), y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

/* ═══ THE WORLD — every instant, id and expected answer written HERE, by hand ═════════════════════════════════════ */

const T0 = "2026-10-01T08:00:00.000Z";          // every early member joined here, before any recording
const T1 = "2026-10-04T12:00:00.000Z";          // list one recorded
const T1_EAT = "2026-10-04T15:00:00.000+03:00"; // ⭐ the SAME instant as T1, spelled in EAT — a string compare would miss it
const T1_PLUS = "2026-10-04T12:00:00.001Z";     // one millisecond after list one's recording
const T2 = "2026-10-04T13:00:00.000Z";          // list two recorded — newer than list one
const T2_LATER = "2026-10-04T13:01:00.000Z";    // a member joins list two after its recording
const T3 = "2026-10-04T14:00:00.000Z";          // list four recorded — the newest, revoked later
const T4 = "2026-10-04T11:00:00.000Z";          // list five recorded TWICE in this one instant (the id breaks the tie)
const T5 = "2026-10-04T16:00:00.000Z";          // list four's recording revoked
const T6 = "2026-10-04T17:00:00.000Z";          // a second revocation attempt
const T7 = "2026-10-05T09:00:00.000Z";          // list one recorded AGAIN
const T8 = "2026-10-05T10:00:00.000Z";          // list one's NEWEST recording revoked (M1)

const L = { one: "probe_lb_l1", two: "probe_lb_l2", three: "probe_lb_l3", four: "probe_lb_l4", five: "probe_lb_l5" };
/** `lb_` and twenty lower-case letters, as the service mints them and as both creates require. */
const B = {
  one: `lb_${"a".repeat(20)}`, oneAgain: `lb_${"b".repeat(20)}`, two: `lb_${"c".repeat(20)}`,
  four: `lb_${"d".repeat(20)}`, fiveA: `lb_${"e".repeat(20)}`, fiveB: `lb_${"f".repeat(20)}`,
};
const REFUSED = `lb_${"g".repeat(20)}`;
const UNKNOWN = `lb_${"z".repeat(20)}`;
const N = {
  c1: "255712000001", c2: "255712000002", c3: "255712000003", c4: "255712000004", c5: "255712000005", c6: "255712000006",
  c7: "255712000007", c8: "255712000008", c9: "255712000009", c10: "255712000010", c11: "255712000011", c12: "255712000012",
  absent: "255712999999",
};
/** The account c12's book row is linked to — the player branch governs that number (S3), so no list basis counts it. */
const U1 = "probe_lb_u1";
/** Every number the scenario asks about, in key order — the order a bulk answer comes back in. */
const KEYS = Object.values(N).sort();
const WORDING = "50pick reaches the numbers on this list under its Gaming Board licence; they have not agreed to it, and every message carries a stop link.";
const ADULT = "Every number on this list belongs to a person aged 18 or older.";
const NOTE = "probe: a file of numbers the officer bought from a partner";
const OFFICER = "probe_officer";

const user = (id: string, phoneE164: string): StoredUser => ({
  id, phoneE164, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
  acceptedTermsVersion: "v1", acceptedTermsAt: T0, marketingOptIn: false, twoFactorEnabled: false,
  avatarDataUrl: null, createdAt: T0, updatedAt: T0, lastLoginAt: null, closedAt: null,
} as StoredUser);
const list = (id: string): StoredContactList => ({
  id, name: `Probe ${id}`, description: null, createdAt: T0, createdBy: null, updatedAt: T0, updatedBy: null,
});
const contact = (key: string, msisdn: string, sourceRef: string | null, userId: string | null): StoredMarketingContact => ({
  id: `probe_lb_${key}`, msisdn, rawInput: msisdn, displayName: "Probe", email: null, ndc: "71", operator: null, source: "IMPORT",
  sourceRef, userId, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null, importId: null,
  createdAt: T0, createdBy: null, updatedAt: T0, updatedBy: null,
});
const seed = (id: string, listId: string, recordedAt: string): ContactListBasisSeed => ({
  id, listId, basisKey: "LICENCE_OUTREACH", wording: WORDING, wordingVersion: 3, adultWording: ADULT, adultVersion: 2,
  proofNote: NOTE, recordedBy: OFFICER, recordedAt,
});
/** [list, contact key, addedAt] — fourteen memberships. ⭐ c4 is the erased tombstone ON a recorded list; c8 carries a
 *  mark that is not erasure; c2 joined at list one's very instant, in EAT; c3 a millisecond after it; c10 joined list two
 *  after its recording but list one before; c11 is on a list nobody recorded; c12 is linked to an account; c7 is on no
 *  list at all. */
const MEMBERS: Array<[string, string, string]> = [
  [L.one, "c1", T0], [L.one, "c2", T1_EAT], [L.one, "c3", T1_PLUS], [L.one, "c4", T0], [L.one, "c5", T0], [L.one, "c6", T0],
  [L.one, "c8", T0], [L.one, "c10", T0], [L.one, "c12", T0], [L.two, "c5", T0], [L.two, "c10", T2_LATER], [L.three, "c11", T0],
  [L.four, "c6", T0], [L.five, "c9", T0],
];

type Cover = { basisId: string; listId: string; recordedAt: string };
const cover = (basisId: string, listId: string, recordedAt: string): Cover => ({ basisId, listId, recordedAt });
const live = (c: Cover | null) => ({ row: "live", cover: c });
const NONE = { row: "none", cover: null };
const ERASED = { row: "erased", cover: null };
const C1 = cover(B.one, L.one, T1);
const C2 = cover(B.two, L.two, T2);
const C4 = cover(B.four, L.four, T3);
const C5B = cover(B.fiveB, L.five, T4);
const C1B = cover(B.oneAgain, L.one, T7);
const EXPECT_INITIAL: Record<string, unknown> = {
  [N.c1]: live(C1), [N.c2]: live(C1), [N.c3]: live(null), [N.c4]: ERASED, [N.c5]: live(C2), [N.c6]: live(C4), [N.c7]: live(null),
  [N.c8]: live(C1), [N.c9]: live(C5B), [N.c10]: live(C1), [N.c11]: live(null), [N.c12]: live(C1), [N.absent]: NONE,
};
const EXPECT_AGAIN: Record<string, unknown> = {
  [N.c1]: live(C1B), [N.c2]: live(C1B), [N.c3]: live(C1B), [N.c4]: ERASED, [N.c5]: live(C1B), [N.c6]: live(C1B), [N.c7]: live(null),
  [N.c8]: live(C1B), [N.c9]: live(C5B), [N.c10]: live(C1B), [N.c11]: live(null), [N.c12]: live(C1B), [N.absent]: NONE,
};
/** ⭐ M1: list one's newest recording revoked — its OLDER recording does not come back, so every member it alone covered
 *  is uncovered; only c5, whom list two still covers, keeps a cover. */
const EXPECT_REVOKED_NEWEST: Record<string, unknown> = {
  [N.c1]: live(null), [N.c2]: live(null), [N.c3]: live(null), [N.c4]: ERASED, [N.c5]: live(C2), [N.c6]: live(null), [N.c7]: live(null),
  [N.c8]: live(null), [N.c9]: live(C5B), [N.c10]: live(null), [N.c11]: live(null), [N.c12]: live(null), [N.absent]: NONE,
};
const entries = (m: Record<string, unknown>) => KEYS.map((k) => ({ msisdn: k, standing: m[k] }));
const ROW = (id: string, listId: string, recordedAt: string, revoked: { at: string; by: string; reason: string } | null = null) => ({
  id, listId, basisKey: "LICENCE_OUTREACH", wording: WORDING, wordingVersion: 3, adultWording: ADULT, adultVersion: 2, proofNote: NOTE,
  recordedBy: OFFICER, recordedAt, revokedAt: revoked?.at ?? null, revokedBy: revoked?.by ?? null, revokedReason: revoked?.reason ?? null,
});
const REVOKED_FOUR = { at: T5, by: OFFICER, reason: "probe: the wrong file" };
const REVOKED_ONE_AGAIN = { at: T8, by: OFFICER, reason: "probe: the newest recording withdrawn" };
/** Every refusal the rule set must make, in both twins, and the label each is recorded under. */
const REFUSAL_LABELS = [
  "refuse.idShort", "refuse.idUpper", "refuse.idDigit", "refuse.blankWording", "refuse.blankAdult", "refuse.blankNote",
  "refuse.blankOfficer", "refuse.versionZero", "refuse.versionFraction", "refuse.versionHuge", "refuse.instantUnparsable",
  "refuse.instantOtherSpelling", "refuse.nulNote", "refuse.revokeNul", "refuse.revokeBlankOfficer", "refuse.revokeBlankReason",
  "refuse.revokeInstant", "refuse.readNul", "refuse.amongNul", "refuse.listNul", "refuse.countNul", "refuse.splitNul",
] as const;

/* ═══ THE SCENARIO — the same calls, in the same order, on whichever twin `db` is ══════════════════════════════════ */

type Db = typeof import("../../src/lib/server/store.ts").db;
/** What a call did: the value it returned, or that it threw and the CODE it threw with ("none" for a plain Error). */
async function refusal(fn: () => Promise<unknown>): Promise<unknown> {
  try { return { returned: await fn() }; } catch (e) {
    const code = (e as { code?: unknown } | null)?.code;
    return { threw: typeof code === "string" ? code : "none" };
  }
}
async function singles(db: Db): Promise<Array<{ msisdn: string; standing: unknown }>> {
  const out: Array<{ msisdn: string; standing: unknown }> = [];
  for (const k of KEYS) out.push({ msisdn: k, standing: await db.contactListBasis.standingFor(k) });
  return out;
}
async function coverage(db: Db): Promise<Record<string, unknown>> {
  return {
    one: await db.contactListBasis.coveredCount(L.one), two: await db.contactListBasis.coveredCount(L.two),
    three: await db.contactListBasis.coveredCount(L.three), four: await db.contactListBasis.coveredCount(L.four),
    five: await db.contactListBasis.coveredCount(L.five),
  };
}
/** C8b (B5) · the same five lists through `coverageSplit` — the figures each viewer is SHOWN. */
async function splits(db: Db): Promise<Record<string, unknown>> {
  return {
    one: await db.contactListBasis.coverageSplit(L.one), two: await db.contactListBasis.coverageSplit(L.two),
    three: await db.contactListBasis.coverageSplit(L.three), four: await db.contactListBasis.coverageSplit(L.four),
    five: await db.contactListBasis.coverageSplit(L.five),
  };
}
async function scenario(db: Db): Promise<Record<string, unknown>> {
  const t: Record<string, unknown> = {};
  await db.user.create(user(U1, `+${N.c12}`));
  for (const id of Object.values(L)) await db.contactList.create(list(id));
  for (const [key, msisdn] of Object.entries(N)) {
    if (key === "absent") continue;
    const sourceRef = key === "c4" ? ERASURE_EVIDENCE : key === "c8" ? "probe_import" : null;
    await db.marketingContact.create(contact(key, msisdn, sourceRef, key === "c12" ? U1 : null));
  }
  for (const [listId, key, addedAt] of MEMBERS) {
    const member: StoredContactListMember = { listId, contactId: `probe_lb_${key}`, addedAt, addedBy: null };
    await db.contactListMember.add(member);
  }
  t["create.one"] = await db.contactListBasis.create(seed(B.one, L.one, T1));
  t["create.two"] = await db.contactListBasis.create(seed(B.two, L.two, T2));
  t["create.four"] = await db.contactListBasis.create(seed(B.four, L.four, T3));
  // ⭐ fiveA FIRST: insertion order then disagrees with the id order, so a tie broken by insertion would name fiveA.
  t["create.fiveA"] = await db.contactListBasis.create(seed(B.fiveA, L.five, T4));
  t["create.fiveB"] = await db.contactListBasis.create(seed(B.fiveB, L.five, T4));
  t["create.taken"] = await db.contactListBasis.create({ ...seed(B.one, L.two, T5), wording: "a second recording under a held id" });
  t["create.noList"] = await refusal(() => db.contactListBasis.create(seed(UNKNOWN, "probe_lb_no_such_list", T5)));
  t["list.noList"] = await db.contactListBasis.listForList("probe_lb_no_such_list");
  t["list.one.afterTaken"] = await db.contactListBasis.listForList(L.one);
  // ── the rule set (m1 · NIT2 · NIT3): each refused before anything is read or written, in both twins alike ──
  const bad = (o: Partial<ContactListBasisSeed>) => db.contactListBasis.create({ ...seed(REFUSED, L.one, T5), ...o });
  const calls: Record<(typeof REFUSAL_LABELS)[number], () => Promise<unknown>> = {
    "refuse.idShort": () => bad({ id: "lb_short" }),
    "refuse.idUpper": () => bad({ id: `lb_${"A".repeat(20)}` }),
    "refuse.idDigit": () => bad({ id: `lb_${"a".repeat(19)}1` }),
    "refuse.blankWording": () => bad({ wording: "   " }),
    "refuse.blankAdult": () => bad({ adultWording: "" }),
    "refuse.blankNote": () => bad({ proofNote: " " }),
    "refuse.blankOfficer": () => bad({ recordedBy: "" }),
    "refuse.versionZero": () => bad({ wordingVersion: 0 }),
    "refuse.versionFraction": () => bad({ adultVersion: 1.5 }),
    "refuse.versionHuge": () => bad({ wordingVersion: 2147483648 }),
    "refuse.instantUnparsable": () => bad({ recordedAt: "not an instant" }),
    "refuse.instantOtherSpelling": () => bad({ recordedAt: T1_EAT }),
    "refuse.nulNote": () => bad({ proofNote: `probe${NUL}note` }),
    "refuse.revokeNul": () => db.contactListBasis.revoke({ id: B.two, by: OFFICER, reason: `probe${NUL}`, at: T5 }),
    "refuse.revokeBlankOfficer": () => db.contactListBasis.revoke({ id: B.two, by: " ", reason: "probe: no officer", at: T5 }),
    "refuse.revokeBlankReason": () => db.contactListBasis.revoke({ id: B.two, by: OFFICER, reason: "", at: T5 }),
    "refuse.revokeInstant": () => db.contactListBasis.revoke({ id: B.two, by: OFFICER, reason: "probe: a bad instant", at: "yesterday" }),
    "refuse.readNul": () => db.contactListBasis.standingFor(`2557${NUL}12000001`),
    "refuse.amongNul": () => db.contactListBasis.standingAmong([N.c1, `2557${NUL}12000001`]),
    "refuse.listNul": () => db.contactListBasis.listForList(`probe${NUL}`),
    "refuse.countNul": () => db.contactListBasis.coveredCount(`probe${NUL}`),
    "refuse.splitNul": () => db.contactListBasis.coverageSplit(`probe${NUL}`),
  };
  for (const label of REFUSAL_LABELS) t[label] = await refusal(calls[label]);
  t["list.one.afterRefusals"] = await db.contactListBasis.listForList(L.one);
  t["list.two.afterRefusals"] = await db.contactListBasis.listForList(L.two);
  // ── the standings, the counts and the orders ──
  t["among.initial"] = await db.contactListBasis.standingAmong(KEYS);
  t["for.initial"] = await singles(db);
  t["covered.initial"] = await coverage(db);
  t["split.initial"] = await splits(db);
  t["list.five"] = await db.contactListBasis.listForList(L.five);
  t["revoke.first"] = await db.contactListBasis.revoke({ id: B.four, by: OFFICER, reason: "probe: the wrong file", at: T5 });
  t["revoke.second"] = await db.contactListBasis.revoke({ id: B.four, by: "probe_admin", reason: "probe: again", at: T6 });
  t["revoke.unknown"] = await db.contactListBasis.revoke({ id: UNKNOWN, by: OFFICER, reason: "probe: nobody", at: T6 });
  t["for.c6.afterRevoke"] = await db.contactListBasis.standingFor(N.c6);
  t["covered.four.afterRevoke"] = await db.contactListBasis.coveredCount(L.four);
  t["split.four.afterRevoke"] = await db.contactListBasis.coverageSplit(L.four);
  t["list.four"] = await db.contactListBasis.listForList(L.four);
  t["create.oneAgain"] = await db.contactListBasis.create(seed(B.oneAgain, L.one, T7));
  t["among.recordedAgain"] = await db.contactListBasis.standingAmong(KEYS);
  t["for.recordedAgain"] = await singles(db);
  t["covered.one.recordedAgain"] = await db.contactListBasis.coveredCount(L.one);
  t["split.one.recordedAgain"] = await db.contactListBasis.coverageSplit(L.one);
  t["list.one"] = await db.contactListBasis.listForList(L.one);
  t["among.dupes"] = await db.contactListBasis.standingAmong([...KEYS, N.c1, N.c4, N.absent, N.c1]);
  const big = [...KEYS, ...Array.from({ length: 2000 - KEYS.length }, (_, i) => `2557${String(13000000 + i)}`)];
  const many = await db.contactListBasis.standingAmong(big);
  t["among.2000"] = {
    length: many.length,
    none: many.filter((e) => e.standing.row === "none").length,
    distinct: new Set(many.map((e) => e.msisdn)).size,
    sorted: many.every((e, i) => i === 0 || many[i - 1].msisdn < e.msisdn),
    world: many.filter((e) => KEYS.includes(e.msisdn)),
  };
  t["among.2001"] = await refusal(() => db.contactListBasis.standingAmong([...big, "255713999999"]));
  t["among.empty"] = await db.contactListBasis.standingAmong([]);
  // ── ⭐ M1: revoke list one's NEWEST recording — its older one must not come back ──
  t["revoke.newest"] = await db.contactListBasis.revoke({ id: B.oneAgain, by: OFFICER, reason: "probe: the newest recording withdrawn", at: T8 });
  t["among.revokedNewest"] = await db.contactListBasis.standingAmong(KEYS);
  t["for.revokedNewest"] = await singles(db);
  t["covered.one.revokedNewest"] = await db.contactListBasis.coveredCount(L.one);
  t["split.one.revokedNewest"] = await db.contactListBasis.coverageSplit(L.one);
  t["list.one.revokedNewest"] = await db.contactListBasis.listForList(L.one);
  return t;
}

/* ═══ THE MEMORY PHASE — a child process, USE_PRISMA_DAL=false, the same scenario, its transcript printed ═══════════ */

if (PHASE === "memory") {
  if (process.env.USE_PRISMA_DAL !== "false") {
    console.error("list-basis-pg-probe: the memory phase must run with USE_PRISMA_DAL=false — the parent sets it.");
    process.exit(2);
  }
  const { db } = await import("../../src/lib/server/store.ts");
  const transcript = await scenario(db);
  const s = (globalThis as unknown as { __50PICK_STORE?: { contactListBases?: Map<string, unknown> } }).__50PICK_STORE;
  console.log(`TWIN memory ${s?.contactListBases?.size ?? -1}`);
  console.log(`TRANSCRIPT ${JSON.stringify(transcript)}`);
  process.exitCode = 0;
} else {
  await parent();
}

/* ═══ THE PARENT — Postgres ═══════════════════════════════════════════════════════════════════════════════════════ */

async function parent(): Promise<void> {
  const { db } = await import("../../src/lib/server/store.ts");
  const { prisma } = await import("../../src/lib/server/prisma.ts");
  const pgc = prisma();
  if (!pgc) throw new Error("list-basis-pg-probe: no Prisma client");
  const countOf = async (sql: string, ...params: unknown[]): Promise<number> =>
    Number((await pgc.$queryRawUnsafe<Array<{ n: number }>>(sql, ...params))[0]?.n ?? -1);
  const tables = async () => (await pgc.$queryRawUnsafe<Array<{ users: number; lists: number; contacts: number; members: number; bases: number }>>(
    `select (select count(*)::int from "User") as users, (select count(*)::int from "ContactList") as lists,
            (select count(*)::int from "MarketingContact") as contacts, (select count(*)::int from "ContactListMember") as members,
            (select count(*)::int from "ContactListBasis") as bases`))[0] ?? null;

  // ── 0 · every migration applied, the tables empty ──
  const folders = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const MIGRATION = folders.find((f) => f.endsWith("_contact_list_basis")) ?? "";
  const applied = await pgc.$queryRawUnsafe<Array<{ name: string; finished: boolean; rolled: boolean }>>(
    `select migration_name as name, finished_at is not null as finished, rolled_back_at is not null as rolled from "_prisma_migrations"`);
  const appliedOk = applied.filter((m) => m.finished && !m.rolled).map((m) => m.name).sort();
  ok("0 · every migration on disk is applied — finished, none rolled back, none extra — the list basis's own among them (the runner applied them all to an EMPTY cluster)",
    MIGRATION !== "" && json(appliedOk) === json(folders) && applied.length === folders.length,
    `${appliedOk.length} applied of ${folders.length} on disk · ${MIGRATION || "no _contact_list_basis folder"}`);
  const EMPTY_TABLES = { users: 0, lists: 0, contacts: 0, members: 0, bases: 0 };
  const empty = await tables();
  ok("0b · CONTROL · the five tables this probe writes start EMPTY — every row below is its own", json(empty) === json(EMPTY_TABLES), json(empty));
  if (MIGRATION === "" || json(empty) !== json(EMPTY_TABLES)) process.exit(1);

  // ── 1 · the drift diff names ONLY the new objects ──
  const require_ = createRequire(import.meta.url);
  // ⭐ The CLI through node itself, as db-backup.mts does: `npx.cmd` fails with EINVAL on Windows since Node 20.
  const PRISMA_CLI = require_.resolve("prisma/build/index.js", { paths: [ROOT] });
  const migrateDiff = (args: string[]): { status: number; out: string; err: string } => {
    const r = spawnSync(process.execPath, [PRISMA_CLI, "migrate", "diff", ...args, "--script"], {
      cwd: ROOT, env: process.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60_000,
    });
    return { status: r.status ?? 1, out: r.stdout ?? "", err: r.stderr ?? "" };
  };
  /** A script's statements — comment lines and the CLI's own notices out, each statement's whitespace collapsed (the
   *  rule dal-parity §27.schema applies to the migration file). */
  const statements = (sql: string): string[] => sql.split(CR).join("").split(NL)
    .filter((l) => !l.trim().startsWith("--") && !l.startsWith("Environment variables loaded") && !l.startsWith("Prisma schema loaded"))
    .join(NL).split(";").map((s) => s.split(NL).map((l) => l.trim()).filter(Boolean).join(" ")).filter((s) => s.length > 0);
  const admin = async (sql: string): Promise<void> => {
    const client = new pg.Client({ connectionString: URL_RAW });
    await client.connect();
    try { await client.query(sql); } finally { await client.end().catch(() => {}); }
  };
  const shadow = new URL(URL_RAW);
  shadow.pathname = `/${SHADOW_DB}`;
  const tmp = mkdtempSync(join(tmpdir(), "kp-list-basis-probe-"));
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
    const ran = liveDiff.status === 0 && fullDiff.status === 0 && beforeDiff.status === 0;
    const tail = (s: string) => s.trim().split(NL).slice(-3).join(" | ");
    ok("1 · CONTROL · the Prisma CLI ran all three diffs — the migrated database, every migration, and every migration but the list basis's — each to schema.prisma",
      ran, ran ? `${statements(beforeDiff.out).length} / ${statements(fullDiff.out).length} statements` : `exits ${liveDiff.status}/${fullDiff.status}/${beforeDiff.status} · ${tail(liveDiff.err)} · ${tail(fullDiff.err)} · ${tail(beforeDiff.err)}`);
    const full = statements(fullDiff.out);
    const before = statements(beforeDiff.out);
    const added = before.filter((s) => !full.includes(s));
    const lost = full.filter((s) => !before.includes(s));
    const mig = statements(readFileSync(join(MIGRATIONS, MIGRATION, "migration.sql"), "utf8"));
    ok("1a · ⭐ THE DRIFT DIFF NAMES ONLY THE NEW OBJECTS — from every migration but the list basis's to schema.prisma, the statements beyond the full set's are exactly four, each naming ContactListBasis (the table, its two indexes, its foreign key), none goes missing, and the full set names it nowhere",
      ran && added.length === 4 && lost.length === 0 && added.every((s) => s.includes(`"ContactListBasis"`)) && !fullDiff.out.includes("ContactListBasis"),
      `added ${added.length}: ${added.map((s) => s.slice(0, 70)).join(" | ")} · lost ${lost.length}`);
    ok("1b · …and those four ARE the hand-written migration's statements, whitespace aside — the file is what Prisma itself renders for these objects, and nothing more",
      ran && sameSet(added, mig), sameSet(added, mig) ? `${mig.length} statements` : `prisma: ${added.join(" ;; ")} ≠ file: ${mig.join(" ;; ")}`);
    ok("1c · the MIGRATED database differs from schema.prisma in nothing that names ContactListBasis — the migration built exactly what the model declares",
      liveDiff.status === 0 && !liveDiff.out.includes("ContactListBasis"), `${statements(liveDiff.out).length} statements of known drift, none of them ours`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    await admin(`DROP DATABASE IF EXISTS "${SHADOW_DB}" WITH (FORCE)`).catch(() => {});
  }

  // ── 2 · the scenario, on Postgres, against the answers written by hand ──
  const t = await scenario(db);
  const landed = await tables();
  const LANDED = { users: 1, lists: 5, contacts: 12, members: 14, bases: 6 };
  ok("2 · CONTROL · the scenario was written THROUGH db INTO POSTGRES — 1 account, 5 lists, 12 contacts, 14 memberships, 6 bases read back by raw SQL (db is the Prisma twin, and every refused call wrote nothing)",
    json(landed) === json(LANDED), json(landed));
  ok("2a · create hands back the row as written — every column, the instant as stored, born unrevoked — a held id is null and leaves the first recording's words untouched, and a list that does not exist THROWS with P2003's code and writes nothing",
    eq(t["create.one"], ROW(B.one, L.one, T1)) && t["create.taken"] === null && eq(t["list.one.afterTaken"], [ROW(B.one, L.one, T1)])
      && eq(t["create.noList"], { threw: "P2003" }) && eq(t["list.noList"], []),
    `${json(t["create.taken"])} · ${json(t["create.noList"])}`);
  ok("2b · ⭐ THE FOUR ANSWERS AND THE REF — none for a number the book does not hold; erased, with NO cover, for the tombstone on a recorded list; live with no cover for the member added a millisecond after the recording, for a contact on no list and for one on a list nobody recorded; the member added AT the instant (spelled in EAT) covered; a mark that is not erasure live and covered; the newer list's recording the ref for a member of two; a list joined after its recording covering nothing while another list covers; the same-instant tie broken on the id; a row linked to an account still reported as the book holds it",
    eq(t["among.initial"], entries(EXPECT_INITIAL)), canon(t["among.initial"]).slice(0, 400));
  ok("2c · ⭐ standingFor equals standingAmong ELEMENT BY ELEMENT — before any revocation, after the second recording, and after the newest is revoked",
    eq(t["for.initial"], t["among.initial"]) && eq(t["for.recordedAgain"], t["among.recordedAgain"]) && eq(t["for.revokedNewest"], t["among.revokedNewest"]));
  ok("2d · coveredCount is { live, covered } — the list's members whose book row is live and linked to NO account (the tombstone and the account's number counted nowhere), and those of them its newest recording covers: list one 7 live, 6 covered (one added after it); list two 2 live, 1 covered (one joined after); a list nobody recorded 1 and 0; lists four and five 1 and 1",
    eq(t["covered.initial"], { one: { live: 7, covered: 6 }, two: { live: 2, covered: 1 }, three: { live: 1, covered: 0 }, four: { live: 1, covered: 1 }, five: { live: 1, covered: 1 } }),
    json(t["covered.initial"]));
  ok("2e · listForList is NEWEST FIRST — the same-instant pair in id order descending, and after the second recording the newer first",
    eq((t["list.five"] as Array<{ id: string }>).map((r) => r.id), [B.fiveB, B.fiveA]) && eq(t["list.one"], [ROW(B.oneAgain, L.one, T7), ROW(B.one, L.one, T1)]),
    json((t["list.five"] as Array<{ id: string }>).map((r) => r.id)));
  ok("2f · ⭐ REVOKE IS SET ONCE — the first revoke stamps the instant, the officer and the reason; a second, by another officer, hands back the FIRST unmoved; an unknown id is null; listForList keeps the revoked basis",
    eq(t["revoke.first"], ROW(B.four, L.four, T3, REVOKED_FOUR)) && eq(t["revoke.second"], ROW(B.four, L.four, T3, REVOKED_FOUR))
      && t["revoke.unknown"] === null && eq(t["list.four"], [ROW(B.four, L.four, T3, REVOKED_FOUR)]),
    `${json(t["revoke.second"]).slice(0, 200)}`);
  ok("2g · ⭐ a list whose newest recording is revoked covers nobody — the member it was the ref for falls back to ANOTHER list's in-force recording, and its own list now counts 1 live, 0 covered",
    eq(t["for.c6.afterRevoke"], live(C1)) && eq(t["covered.four.afterRevoke"], { live: 1, covered: 0 }), `${json(t["for.c6.afterRevoke"])} · ${json(t["covered.four.afterRevoke"])}`);
  ok("2h · ⭐ RECORDING AGAIN covers everyone on the list at that instant — the member added after the first recording is covered now, every live member's ref moves to the newest recording, the tombstone stays erased, and the list counts 7 live, 7 covered",
    eq(t["create.oneAgain"], ROW(B.oneAgain, L.one, T7)) && eq(t["among.recordedAgain"], entries(EXPECT_AGAIN)) && eq(t["covered.one.recordedAgain"], { live: 7, covered: 7 }),
    canon(t["among.recordedAgain"]).slice(0, 300));
  ok("2i · ⭐ THE BOUND — duplicates folded (17 keys asked, 13 answered); 2,000 distinct keys answered one entry each, in key order, the 1,988 the book does not hold as none and the world as the single reads say; 2,001 REFUSED, never cut off; an empty set is []",
    eq(t["among.dupes"], t["among.recordedAgain"]) && eq(t["among.2000"], { length: 2000, none: 1988, distinct: 2000, sorted: true, world: t["among.recordedAgain"] })
      && eq(t["among.2001"], { threw: "none" }) && eq(t["among.empty"], []),
    `${json({ ...(t["among.2000"] as Record<string, unknown>), world: "…" })} · 2,001 ${json(t["among.2001"])}`);
  const unrefused = REFUSAL_LABELS.filter((k) => !eq(t[k], { threw: "none" }));
  ok("2j · ⭐ THE RULES REFUSE ALIKE IN BOTH TWINS (m1 · NIT2 · NIT3) — an id that is not lb_ and twenty lower-case letters, a blank wording, 18+ confirmation, proof note or officer, a version of 0, 1.5 or 2,147,483,648, an instant Postgres cannot parse or another spelling of one, a NUL in a note, a reason, a number or a list id, and a revoke with a blank officer or reason — each refused before anything is read or written, and the two lists they named are untouched",
    unrefused.length === 0 && eq(t["list.one.afterRefusals"], [ROW(B.one, L.one, T1)]) && eq(t["list.two.afterRefusals"], [ROW(B.two, L.two, T2)]),
    unrefused.length === 0 ? `${REFUSAL_LABELS.length} refusals` : `not refused: ${unrefused.map((k) => `${k}=${json(t[k])}`).join(", ")}`);
  ok("2k · ⭐ A LIST'S ONE STANDING IS ITS NEWEST RECORDING (M1) — revoking the newest of list one's two recordings leaves every member it alone covered uncovered (the OLDER recording does NOT come back), only the member another list covers keeps a cover, and the list counts 7 live, 0 covered while listForList still shows both recordings",
    eq(t["revoke.newest"], ROW(B.oneAgain, L.one, T7, REVOKED_ONE_AGAIN)) && eq(t["among.revokedNewest"], entries(EXPECT_REVOKED_NEWEST))
      && eq(t["covered.one.revokedNewest"], { live: 7, covered: 0 })
      && eq(t["list.one.revokedNewest"], [ROW(B.oneAgain, L.one, T7, REVOKED_ONE_AGAIN), ROW(B.one, L.one, T1)]),
    `${canon(t["among.revokedNewest"]).slice(0, 300)} · ${json(t["covered.one.revokedNewest"])}`);

  // ── 2l · C8b (B5) · coverageSplit — the same lists split by the account link ──
  const pairOf = (live: number, covered: number) => ({ live, covered });
  const splitOf = (u: [number, number], l: [number, number]) => ({ unlinked: pairOf(...u), linked: pairOf(...l) });
  const covered0 = t["covered.initial"] as Record<string, unknown>;
  const split0 = t["split.initial"] as Record<string, { unlinked: unknown; linked: unknown }>;
  ok("2l · ⭐ C8b (B5) · coverageSplit is coveredCount's pair EXACTLY as its unlinked half, at every step, and the same two counts over the live members linked to an account as its linked half — the tombstone in neither: list one 7/6 and the account's number 1/1; lists two to five nothing linked; the revoked list four 1/0; list one recorded again 7/7 and 1/1; its newest recording revoked 7/0 and 1/0 (the older one does not come back)",
    eq(t["split.initial"], {
      one: splitOf([7, 6], [1, 1]), two: splitOf([2, 1], [0, 0]), three: splitOf([1, 0], [0, 0]), four: splitOf([1, 1], [0, 0]), five: splitOf([1, 1], [0, 0]),
    }) && Object.keys(covered0).every((k) => eq(split0[k]?.unlinked, covered0[k]))
      && eq(t["split.four.afterRevoke"], splitOf([1, 0], [0, 0])) && eq((t["split.four.afterRevoke"] as { unlinked: unknown }).unlinked, t["covered.four.afterRevoke"])
      && eq(t["split.one.recordedAgain"], splitOf([7, 7], [1, 1])) && eq((t["split.one.recordedAgain"] as { unlinked: unknown }).unlinked, t["covered.one.recordedAgain"])
      && eq(t["split.one.revokedNewest"], splitOf([7, 0], [1, 0])) && eq((t["split.one.revokedNewest"] as { unlinked: unknown }).unlinked, t["covered.one.revokedNewest"]),
    `${json(t["split.initial"])} · four ${json(t["split.four.afterRevoke"])} · one again ${json(t["split.one.recordedAgain"])} · one revoked ${json(t["split.one.revokedNewest"])}`);

  // ── 3 · the same-millisecond boundary, on Timestamptz(3), read back by SQL ──
  const pair = async (contactId: string, basisId: string) => (await pgc.$queryRawUnsafe<Array<{ same: boolean; ms: number }>>(
    `select (m."addedAt" = b."recordedAt") as same,
            round((extract(epoch from m."addedAt") - extract(epoch from b."recordedAt")) * 1000)::int as ms
       from "ContactListMember" m join "ContactListBasis" b on b."listId" = m."listId"
      where m."contactId" = $1 and b.id = $2`, contactId, basisId))[0] ?? null;
  const atInstant = await pair("probe_lb_c2", B.one);
  const msLater = await pair("probe_lb_c3", B.one);
  const initial = entries(EXPECT_INITIAL);
  ok("3 · ⭐ THE BOUNDARY ON Timestamptz(3) — the member written at the recording's instant in EAT is stored as the SAME instant and the next one exactly 1 ms later, and the standing read covered the first and not the second",
    atInstant?.same === true && atInstant?.ms === 0 && msLater?.same === false && msLater?.ms === 1
      && eq((t["among.initial"] as unknown[])[KEYS.indexOf(N.c2)], initial[KEYS.indexOf(N.c2)])
      && eq((t["among.initial"] as unknown[])[KEYS.indexOf(N.c3)], initial[KEYS.indexOf(N.c3)]),
    `at the instant ${json(atInstant)} · a millisecond later ${json(msLater)}`);

  // ── 4 · RESTRICT ──
  let refusalText = "";
  let restricted = false;
  try { await pgc.$executeRawUnsafe(`delete from "ContactList" where id = $1`, L.one); } catch (e) { restricted = true; refusalText = String((e as Error)?.message ?? e); }
  const listStays = await countOf(`select count(*)::int as n from "ContactList" where id = $1`, L.one);
  const membersStay = await countOf(`select count(*)::int as n from "ContactListMember" where "listId" = $1`, L.one);
  const basesStay = await countOf(`select count(*)::int as n from "ContactListBasis" where "listId" = $1`, L.one);
  let freed = true;
  try { await pgc.$executeRawUnsafe(`delete from "ContactList" where id = $1`, L.three); } catch { freed = false; }
  const threeGone = await countOf(`select count(*)::int as n from "ContactList" where id = $1`, L.three);
  const threeMembers = await countOf(`select count(*)::int as n from "ContactListMember" where "listId" = $1`, L.three);
  ok("4 · ⛔ RESTRICT — deleting a list that carries a basis is refused by the foreign key (23503) and the list, its 9 members and its 2 bases stay; a list with NO basis deletes, its member cascading — so the refusal is the basis's, not the statement's",
    restricted && /23503|foreign key/i.test(refusalText) && listStays === 1 && membersStay === 9 && basesStay === 2 && freed && threeGone === 0 && threeMembers === 0,
    `refused ${restricted} (${refusalText.split(NL)[0].slice(0, 140)}) · stays ${listStays}/${membersStay}/${basesStay} · the bare list ${freed ? "deleted" : "REFUSED"}, ${threeMembers} members left`);

  // ── 5 · the memory twin, the same scenario, answer for answer ──
  const child = spawnSync("npx", ["tsx", SELF], {
    cwd: ROOT, encoding: "utf8", shell: process.platform === "win32", timeout: 10 * 60_000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, USE_PRISMA_DAL: "false", LIST_BASIS_PROBE_PHASE: "memory" },
  });
  const lines = (child.stdout ?? "").split(CR).join("").split(NL);
  const twinLine = lines.find((l) => l.startsWith("TWIN "));
  const transcriptLine = lines.find((l) => l.startsWith("TRANSCRIPT "));
  let mem: Record<string, unknown> | null = null;
  try { mem = transcriptLine ? (JSON.parse(transcriptLine.slice("TRANSCRIPT ".length)) as Record<string, unknown>) : null; } catch { mem = null; }
  ok("5 · CONTROL · the memory phase ran on the MEMORY twin — a child with USE_PRISMA_DAL=false, its own store holding the scenario's 6 bases — and printed its transcript",
    child.status === 0 && twinLine === "TWIN memory 6" && mem !== null,
    `exit ${child.status} · ${twinLine ?? "no TWIN line"} · ${(child.stderr ?? "").trim().split(NL).slice(-2).join(" | ")}`);
  const labels = [...new Set([...Object.keys(t), ...Object.keys(mem ?? {})])].sort();
  const differ = mem === null ? labels : labels.filter((k) => canon(t[k]) !== canon((mem as Record<string, unknown>)[k]));
  ok("5a · ⭐ BOTH TWINS AGREE — every answer of the scenario (creates, refusals and their codes, standings, counts, revocations, orders, the bound, the newest recording revoked) is identical on the memory twin and on Postgres",
    mem !== null && labels.length === Object.keys(t).length && differ.length === 0,
    differ.length === 0 ? `${labels.length} answers` : `differ: ${differ.join(", ")}`);

  await pgc.$disconnect().catch(() => {});
  console.log(`${NL}list-basis-pg-probe: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
}
