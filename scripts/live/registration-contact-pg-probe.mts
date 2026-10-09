/**
 * ⭐ EVERY CLIENT IS A CONTACT, ON A REAL POSTGRES — the Prisma twin of `registration-contact.ts`, which no suite on this
 * laptop executes (`test:registration-contact` drives the memory twin).
 *
 * ⭐ WHY THIS EXISTS. Four things the backfill leans on are facts about the DATABASE: that a create carrying the link
 * satisfies the `userId` foreign key; that the unique `msisdn` turns a lost race into Prisma's P2002 and the DAL's null,
 * so two calls for one client leave ONE row; that a link written with the row's own `updatedAt` really keeps it to the
 * millisecond on a `timestamptz(3)` column (OD56); and that a second backfill is a pure read. This seeds a world of
 * every case through the REAL `db`, runs the backfill dry, real and again, and checks the rows by raw SQL against
 * answers written here by hand.
 * ⭐ C8b · and since C8b: the erased tombstone REVIVED as its new client's row by the backfill, its list membership
 * deleted in the same transaction (B1); every created or revived row's "Added" the run's clock, never the sign-up (B8);
 * and §6, the audited door `ops:contacts-added-redate` (`src/lib/server/contacts/added-redate.ts`) on Postgres — rows in
 * the OLD writer's shape found through the REAL audit log's durable reader, re-dated in ONE transaction to their records'
 * instants, an officer's later stamp kept, its COMPLIANCE rows on the table, a second apply nothing to do, and a race
 * refused WHOLE (the transaction rolled back).
 *
 * Run (through the heavy-node lock; it needs a migrated EMPTY database — and the backfill script can then run on the
 * world this leaves behind, where its counts must read created 0 · linked 0):
 *   bash ~/heavy-node-lock.sh run regcontact npx tsx scripts/db-scratch.mts --reset --run bash -c 'export DATABASE_URL="$VERIFY_DATABASE_URL"; npx prisma migrate deploy && npx tsx scripts/live/registration-contact-pg-probe.mts && npx tsx scripts/live/backfill-registration-contacts.mts --dry-run && npx tsx scripts/live/backfill-registration-contacts.mts'
 * ⛔ Kept OFF predeploy and given no package key (a `test:` key would make `test:all` boot a cluster).
 */
import type { StoredUser, StoredMarketingContact } from "../../src/lib/server/store.ts";

process.exitCode = 1;
if (!process.env.DATABASE_URL) {
  console.error("registration-contact-pg-probe: needs DATABASE_URL (a scratch Postgres) — refusing to run on the memory twin, which proves nothing here.");
  process.exit(2);
}
{
  // ⛔ A LOOPBACK CLUSTER ONLY: this probe writes accounts, contacts and consents — any other host is refused before the
  // store loads.
  let host = "";
  try { host = new URL(process.env.DATABASE_URL).hostname; } catch { host = ""; }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("registration-contact-pg-probe: refusing — it writes rows, and runs only against a loopback scratch cluster (db-scratch).");
    process.exit(2);
  }
}

const { db } = await import("../../src/lib/server/store.ts");
const { prisma } = await import("../../src/lib/server/prisma.ts");
const { backfillRegistrationContacts, ensureRegistrationContact, registrationDryRunDeps } = await import("../../src/lib/server/marketing/registration-contact.ts");

const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const json = (v: unknown) => JSON.stringify(v);
const pg = prisma();
if (!pg) throw new Error("registration-contact-pg-probe: no Prisma client");

type Census = { users: number; contacts: number; consents: number };
const census = async (): Promise<Census | null> => (await pg.$queryRawUnsafe<Census[]>(
  `select (select count(*)::int from "User") as users, (select count(*)::int from "MarketingContact") as contacts,
          (select count(*)::int from "MessagingConsent") as consents`))[0] ?? null;
const before = await census();
ok("0 · CONTROL · the scratch tables start EMPTY — every row below is this probe's own", json(before) === json({ users: 0, contacts: 0, consents: 0 }), json(before));
if (json(before) !== json({ users: 0, contacts: 0, consents: 0 })) process.exit(1);

/* ── the world, through the ONE door ── */
const SIGNED = "2026-08-01T08:00:00.000Z";
const user = (id: string, phoneE164: string, over: Partial<StoredUser> = {}): StoredUser => ({
  id, phoneE164, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
  acceptedTermsVersion: "v1", acceptedTermsAt: SIGNED, marketingOptIn: false, twoFactorEnabled: false,
  avatarDataUrl: null, createdAt: SIGNED, updatedAt: SIGNED, lastLoginAt: null, closedAt: null,
  ...over,
} as StoredUser);
const contact = (id: string, msisdn: string, over: Partial<StoredMarketingContact>): StoredMarketingContact => ({
  id, msisdn, rawInput: msisdn, displayName: null, email: null, ndc: msisdn.slice(3, 5), operator: null, source: "OPERATOR",
  sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null, importId: null,
  createdAt: "2026-09-01T08:00:00.000Z", createdBy: "probe_officer", updatedAt: "2026-09-15T10:00:00.123Z", updatedBy: "probe_officer",
  ...over,
});
const said = (id: string, identifier: string, status: "GIVEN" | "WITHDRAWN", createdAt: string) => db.messagingConsent.create({
  id, channel: "SMS", identifier, category: "MARKETING", status, source: status === "GIVEN" ? "REGISTRATION" : "OPERATOR",
  wording: "probe wording", locale: "SW", evidence: "probe", recordedBy: null, createdAt,
});

await db.user.create(user("prc_w1", "+255751200001", { displayName: "Neema Kileo", email: "neema@example.tz", marketingOptIn: true }));
await db.user.create(user("prc_w2", "+255751200002"));
await db.user.create(user("prc_w3", "+255751200003", { displayName: "Account Name", email: "account@example.tz" }));
await db.user.create(user("prc_w4", "+255751200004"));
await db.user.create(user("prc_w5", "+255751200005", { email: "next.holder@example.tz" }));
await db.user.create(user("prc_w6", "+255751200006"));
await db.user.create(user("prc_w6x", "+255751200007", { status: "CLOSED", closedAt: "2026-09-20T08:00:00.000Z" }));
await db.user.create(user("prc_w7", "+255751200008", { status: "CLOSED", closedAt: "2026-09-21T08:00:00.000Z" }));
await db.user.create(user("prc_w8", "+255641200009"));
await db.user.create(user("prc_s1", "+255751200010", { role: "GROWTH" }));
await db.user.create(user("prc_a1", "+255751200011", { role: "AGENT" }));
await db.user.create(user("prc_e1", "erased:prc_e1", { status: "CLOSED", closedAt: "2026-09-22T08:00:00.000Z" }));
await db.user.create(user("prc_f1", "+254712200012"));

await said("prc_x_w1", "255751200001", "GIVEN", "2026-08-01T08:00:01.000Z");
await said("prc_x_w5a", "255751200005", "GIVEN", "2026-06-01T08:00:00.000Z");
await said("prc_x_w5b", "255751200005", "WITHDRAWN", "2026-07-01T08:00:00.000Z");
await db.marketingContact.create(contact("prc_c_w3", "255751200003", { displayName: "Mama Asha (typed)", email: "typed@example.tz", notes: "Met at the stand.", tags: ["vip"] }));
await db.marketingContact.create(contact("prc_c_w4", "255751200004", { source: "REGISTRATION", sourceRef: "prc_w4", userId: "prc_w4", createdBy: null, updatedBy: null }));
await db.marketingContact.create(contact("prc_c_w5", "255751200005", { source: "IMPORT", sourceRef: "erasure", consentState: "WITHDRAWN", createdBy: null, updatedBy: "probe_dpo" }));
await db.marketingContact.create(contact("prc_c_w6", "255751200006", { source: "REGISTRATION", sourceRef: "prc_w6x", userId: "prc_w6x", displayName: "Previous holder", createdBy: null, updatedBy: null }));
// ⭐ C8b (B1) · the tombstone still sits on a list (a tombstone made before C8b may), beside an officer's contact.
await db.contactList.create({ id: "prc_list", name: "Probe list", description: null, createdAt: "2026-08-01T08:00:00.000Z", createdBy: "probe_officer", updatedAt: "2026-08-01T08:00:00.000Z", updatedBy: "probe_officer" });
await db.contactListMember.add({ listId: "prc_list", contactId: "prc_c_w5", addedAt: "2026-08-05T08:00:00.000Z", addedBy: "probe_officer" });
await db.contactListMember.add({ listId: "prc_list", contactId: "prc_c_w3", addedAt: "2026-08-05T08:00:00.000Z", addedBy: "probe_officer" });

const landed = await census();
ok("0b · CONTROL · the world was written THROUGH db INTO POSTGRES — 13 accounts, 4 contacts, 3 ledger rows read back by raw SQL",
  json(landed) === json({ users: 13, contacts: 4, consents: 3 }), json(landed));
if (json(landed) !== json({ users: 13, contacts: 4, consents: 3 })) process.exit(1);

type BookRow = Record<string, unknown>;
const book = async (): Promise<BookRow[]> => pg.$queryRawUnsafe<BookRow[]>(
  `select id, msisdn, "rawInput", "displayName", email, ndc, operator, source::text as source, "sourceRef", "userId",
          "consentState"::text as "consentState", "suppressedAt", tags, notes, "importId", "createdAt", "createdBy",
          "updatedAt", "updatedBy" from "MarketingContact" order by id`);
const rowOf = (rows: BookRow[], msisdn: string) => rows.find((r) => r.msisdn === msisdn) ?? null;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));
const outcomesOf = (c: { outcomes: Record<string, number>; skipped: Record<string, number> }) => json({ o: c.outcomes, s: c.skipped });
// ⭐ C8b (B1) · w5's tombstone is REVIVED as prc_w5's own row (until C8b it was kept: `kept_erased`).
const EXPECTED = json({
  o: { created: 2, revived: 1, linked: 1, already_linked: 1, kept_other_account: 1, skipped: 3, failed: 0 },
  s: { not_a_player: 0, bootstrap_admin: 0, closed: 2, erased: 0, not_tz_mobile: 1 },
});
const memberships = async (contactId: string): Promise<number> => (await pg.$queryRawUnsafe<{ n: number }[]>(
  `select count(*)::int as n from "ContactListMember" where "contactId" = $1`, contactId))[0]?.n ?? -1;

/* ── 1 · the dry run ── */
const seeded = json(await book());
const dry = await backfillRegistrationContacts({ chunk: 2, contact: registrationDryRunDeps() });
ok("1 · the DRY RUN writes nothing on Postgres and predicts the real run: 13 accounts, 9 walked, the same outcomes",
  json(await book()) === seeded && dry.accounts === 13 && dry.walked === 9 && outcomesOf(dry) === EXPECTED,
  `${outcomesOf(dry)} · walked ${dry.walked}`);

/* ── 2 · the real run ── */
const runFrom = Date.now();
const first = await backfillRegistrationContacts({ chunk: 2 });
const runTo = Date.now();
ok("2 · the first run's counts are the world's: 2 created, the tombstone REVIVED, 1 linked, 1 already linked, the other account's row kept, 3 skipped (2 closed, 1 064), 1 cache repaired",
  first.accounts === 13 && first.walked === 9 && first.missing === 0 && outcomesOf(first) === EXPECTED
    && json(first.cache) === json({ none: 0, unchanged: 5, updated: 1, failed: 0 }),
  `${outcomesOf(first)} · cache ${json(first.cache)}`);

const after1 = await book();
const w1 = rowOf(after1, "255751200001");
const w2 = rowOf(after1, "255751200002");
const w3 = rowOf(after1, "255751200003");
const w5 = rowOf(after1, "255751200005");
const w6 = rowOf(after1, "255751200006");
const seededRows = JSON.parse(seeded) as BookRow[];
const same = (a: BookRow | null, b: BookRow | null) => json(a) === json(b);
/** ⭐ C8b (B8) · "Added" is the moment the run wrote the row — inside the run, never the account's sign-up. */
const duringRun = (v: unknown) => { const ms = Date.parse(iso(v)); return ms >= runFrom && ms <= runTo; };
ok("3 · ⭐ on Postgres: the created rows carry the LINK (the foreign key took it), source REGISTRATION and the account id as sourceRef, the name and email from the account, the ledger's word (GIVEN / UNKNOWN), and ⭐ C8b (B8) the run's own instant as Added — never the account's sign-up",
  !!w1 && w1.userId === "prc_w1" && w1.source === "REGISTRATION" && w1.sourceRef === "prc_w1" && w1.displayName === "Neema Kileo"
    && w1.email === "neema@example.tz" && w1.consentState === "GIVEN" && duringRun(w1.createdAt) && iso(w1.createdAt) !== SIGNED
    && iso(w1.updatedAt) === iso(w1.createdAt) && w1.operator === null && w1.ndc === "75"
    && !!w2 && w2.userId === "prc_w2" && w2.consentState === "UNKNOWN" && w2.displayName === null && w2.email === null && duringRun(w2.createdAt),
  `${json(w1)} · ${json(w2)}`);
ok("3b · ⭐ OD56 ON POSTGRES · the officer's row is LINKED with every typed field and its own updatedAt kept to the millisecond (timestamptz(3)), its source OPERATOR",
  !!w3 && w3.userId === "prc_w3" && w3.source === "OPERATOR" && w3.displayName === "Mama Asha (typed)" && w3.email === "typed@example.tz"
    && w3.notes === "Met at the stand." && json(w3.tags) === json(["vip"]) && iso(w3.updatedAt) === "2026-09-15T10:00:00.123Z" && w3.updatedBy === "probe_officer",
  json(w3));
const w5Lists = await memberships("prc_c_w5");
const w3Lists = await memberships("prc_c_w3");
ok("3c · ⭐ C8b (B1) ON POSTGRES · the erased tombstone is REVIVED as prc_w5's own row — the SAME id, linked, source REGISTRATION, the account's email, no name, notes, tags, import or officer, the run's instant as Added, the ledger's WITHDRAWN — and its list membership is GONE (the officer's contact keeps its own); ⛔ the row linked to another account is byte-identical to how it was seeded",
  !!w5 && w5.id === "prc_c_w5" && w5.userId === "prc_w5" && w5.source === "REGISTRATION" && w5.sourceRef === "prc_w5" && w5.email === "next.holder@example.tz"
    && w5.displayName === null && w5.notes === null && json(w5.tags) === json([]) && w5.importId === null && w5.createdBy === null
    && duringRun(w5.createdAt) && w5.consentState === "WITHDRAWN" && w5Lists === 0 && w3Lists === 1
    && same(w6, rowOf(seededRows, "255751200006")),
  `${json(w5)} · memberships ${w5Lists} (the officer's ${w3Lists}) · ${json(w6)}`);
ok("3d · ⛔ no row for staff, an agent, a closed or erased account, a 064 or a foreign number — the book holds exactly 6 rows",
  after1.length === 6 && ["255751200007", "255751200008", "255641200009", "255751200010", "255751200011", "254712200012"].every((m) => rowOf(after1, m) === null),
  `${after1.length} rows`);

/* ── 4 · the second run ── */
const settled = json(after1);
const second = await backfillRegistrationContacts({ chunk: 2 });
ok("4 · ⭐ IDEMPOTENT ON POSTGRES · the second run creates, revives and links nothing, repairs no cache, and every row (updatedAt included) is byte-identical",
  second.outcomes.created === 0 && second.outcomes.revived === 0 && second.outcomes.linked === 0 && second.outcomes.already_linked === 5
    && second.cache.updated === 0 && second.outcomes.failed === 0 && json(await book()) === settled,
  `${outcomesOf(second)} · cache ${json(second.cache)}`);

/* ── 5 · the race on the unique key ── */
await db.user.create(user("prc_r1", "+255751200013", { createdAt: "2026-10-03T06:00:00.000Z" }));
const racer = await db.user.findById("prc_r1");
if (!racer) throw new Error("registration-contact-pg-probe: the racing account did not land");
const raced = await Promise.all([ensureRegistrationContact(racer), ensureRegistrationContact(racer)]);
const racedRows = (await book()).filter((r) => r.msisdn === "255751200013");
ok("5 · ⭐ TWO CALLS FOR ONE CLIENT AT ONCE leave ONE row on Postgres — the unique key refuses the loser (P2002 → null) and it settles as already linked",
  racedRows.length === 1 && racedRows[0]?.userId === "prc_r1" && raced.map((r) => r.outcome).sort().join(",") === "already_linked,created",
  `${raced.map((r) => r.outcome).join(",")} · ${racedRows.length} row(s)`);

/* ── 6 · ⭐ C8b (B8) · THE "ADDED" DOOR ON POSTGRES — `ops:contacts-added-redate`'s module, the CLI's own deps ── */
const { ADDED_REDATE_ACTIONS, addedRedateDeps, addedRedateStatus, applyAddedRedate, planAddedRedate } = await import("../../src/lib/server/contacts/added-redate.ts");
const { audit, auditFlush, getAuditForTargetsDurable } = await import("../../src/lib/server/audit.ts");
/** JSON with every object's keys sorted — Postgres' jsonb hands its keys back in its own order. */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x !== null && typeof x === "object" && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x as Record<string, unknown>).sort().map((k) => [k, (x as Record<string, unknown>)[k]]))
  : x));
const OLD = {
  d1: user("prc_d1", "+255751200021", { createdAt: "2026-07-01T08:00:00.000Z" }),
  d2: user("prc_d2", "+255751200022", { createdAt: "2026-07-02T08:00:00.000Z" }),
  d3: user("prc_d3", "+255751200023", { createdAt: "2026-07-03T08:00:00.000Z" }),
  d4: user("prc_d4", "+255751200024", { createdAt: "2026-07-04T08:00:00.000Z" }),
  d5: user("prc_d5", "+255751200025", { createdAt: "2026-07-05T08:00:00.000Z" }),
  d6: user("prc_d6", "+255751200026", { createdAt: "2026-07-06T08:00:00.000Z" }),
};
for (const u of Object.values(OLD)) await db.user.create(u);
/** A row in the OLD writer's shape: REGISTRATION, the link as its provenance, no officer, "Added" (and the stamp) the
 *  account's sign-up — what the backfill of 2026-10-03 wrote. */
const oldRow = (id: string, u: StoredUser, over: Partial<StoredMarketingContact> = {}) => contact(id, u.phoneE164.slice(1), {
  source: "REGISTRATION", sourceRef: u.id, userId: u.id, rawInput: u.phoneE164, createdBy: null, updatedBy: null,
  createdAt: u.createdAt, updatedAt: u.createdAt, ...over,
});
/** An officer's edit stamped after every record this probe writes: it must stand. */
const LATER = "2030-01-01T00:00:00.123Z";
await db.marketingContact.create(oldRow("prc_c_d1", OLD.d1));
await db.marketingContact.create(oldRow("prc_c_d2", OLD.d2, { updatedAt: LATER, updatedBy: "probe_officer" }));
await db.marketingContact.create(oldRow("prc_c_d3", OLD.d3));
await db.marketingContact.create(oldRow("prc_c_d4", OLD.d4));
/** The writer's own record of a write, through the REAL audit chain into the AuditLog table (d3's says the sign-up wrote
 *  it; d4 has none; d5 and d6 come later, for the race). */
const record = (contactId: string, account: string, via: string) => audit({
  category: "SYSTEM", action: "contacts.contact.registered", actorId: null, targetType: "MarketingContact", targetId: contactId,
  payload: { number: "+255 masked", account, via, fields: [] },
});
const rd1 = await record("prc_c_d1", "prc_d1", "backfill");
const rd2 = await record("prc_c_d2", "prc_d2", "backfill");
await record("prc_c_d3", "prc_d3", "signup");
await auditFlush();
const doorDeps = addedRedateDeps((q) => getAuditForTargetsDurable(q));
type DoorRow = { action: string; category: string; targetType: string | null; targetId: string | null; payload: Record<string, unknown> | null };
const doorRowsSql = async (): Promise<DoorRow[]> => pg.$queryRawUnsafe<DoorRow[]>(
  `select action, category::text as category, "targetType", "targetId", payload from "AuditLog" where action like 'contacts.added_redate_%' order by seq`);
const BY = "Claude for Ali (B8) probe";
const WHY = "the scratch rehearsal";

const plan61 = await planAddedRedate(doorDeps);
const before61 = json(await book());
const status61 = await addedRedateStatus(doorDeps);
ok("6.1 · ⭐ C8b (B8) ON POSTGRES · the door's STATUS reads the book through the resolver and the records through the REAL audit log's durable reader: of the 10 linked sign-up rows, the 2 in the old writer's shape with the backfill's record are to re-date — the 2 the sign-up wrote (the race's, d3) left, the run's own 3 already right (their Added its clock), the 3 with no record left — and NOTHING is written or recorded",
  plan61.ok && json(plan61.plan.counts) === json({ examined: 10, toRedate: 2, atSignup: 2, alreadyRight: 3, withoutRecord: 3, withoutAccount: 0, otherShape: 0 })
    && status61.code === "status" && json(await book()) === before61 && (await doorRowsSql()).length === 0,
  `${plan61.ok ? json(plan61.plan.counts) : "UNREADABLE"} · ${status61.code}`);

const applied62 = await applyAddedRedate({ expect: "2", by: BY, reason: WHY }, doorDeps);
await auditFlush();
const after62 = await book();
const d1 = rowOf(after62, "255751200021");
const d2 = rowOf(after62, "255751200022");
const seeded62 = JSON.parse(before61) as BookRow[];
const untouched62 = after62.filter((r) => r.id !== "prc_c_d1" && r.id !== "prc_c_d2").every((r) => same(r, seeded62.find((s) => s.id === r.id) ?? null));
const rows62 = await doorRowsSql();
ok("6.2 · ⭐ APPLY ON POSTGRES · ONE transaction re-dates exactly the 2: each Added is its own record's instant to the millisecond (timestamptz(3)), the never-edited row's stamp moves with it, the officer's later stamp and officer stand; every other row byte-identical; COMPLIANCE applying then applied on MarketingContact#added-redate, the applying row listing both ids with their Added before and after",
  applied62.code === "done" && !!d1 && iso(d1.createdAt) === rd1.createdAt && iso(d1.updatedAt) === rd1.createdAt
    && !!d2 && iso(d2.createdAt) === rd2.createdAt && iso(d2.updatedAt) === LATER && d2.updatedBy === "probe_officer" && untouched62
    && rows62.map((r) => r.action).join(",") === `${ADDED_REDATE_ACTIONS.applying},${ADDED_REDATE_ACTIONS.applied}`
    && rows62.every((r) => r.category === "COMPLIANCE" && r.targetType === "MarketingContact" && r.targetId === "added-redate")
    && canon(rows62[0]?.payload?.rows) === canon([
      { id: "prc_c_d1", from: OLD.d1.createdAt, to: rd1.createdAt }, { id: "prc_c_d2", from: OLD.d2.createdAt, to: rd2.createdAt }]),
  `${applied62.code} · d1 ${d1 ? `${iso(d1.createdAt)}/${iso(d1.updatedAt)}` : "-"} · d2 ${d2 ? `${iso(d2.createdAt)}/${iso(d2.updatedAt)}` : "-"} · untouched ${untouched62} · records ${rows62.map((r) => r.action).join(",")}`);

const settled63 = json(after62);
const plan63 = await planAddedRedate(doorDeps);
const again63 = await applyAddedRedate({ expect: "0", by: BY, reason: WHY }, doorDeps);
await auditFlush();
ok("6.3 · ⭐ IDEMPOTENT ON POSTGRES · after the apply the door counts 0 to re-date (5 already right) and a second apply is NOTHING TO DO — no row and no record written",
  plan63.ok && plan63.plan.counts.toRedate === 0 && plan63.plan.counts.alreadyRight === 5 && again63.code === "nothing_to_do"
    && json(await book()) === settled63 && (await doorRowsSql()).length === 2,
  `${plan63.ok ? json(plan63.plan.counts) : "UNREADABLE"} · ${again63.code}`);

await db.marketingContact.create(oldRow("prc_c_d5", OLD.d5));
await db.marketingContact.create(oldRow("prc_c_d6", OLD.d6));
await record("prc_c_d5", "prc_d5", "backfill");
const rd6 = await record("prc_c_d6", "prc_d6", "backfill");
await auditFlush();
const raced64 = await applyAddedRedate({ expect: "2", by: BY, reason: WHY }, {
  ...doorDeps,
  write: async (rows) => {
    // ANOTHER run re-dates d6 first, through the store's own write …
    await db.marketingContact.redateAdded(rows.filter((r) => r.id === "prc_c_d6"));
    // … and only then this one's whole write — d5 first in its transaction, then d6, whose compare now fails.
    return doorDeps.write(rows);
  },
});
await auditFlush();
const after64 = await book();
const d5 = rowOf(after64, "255751200025");
const d6 = rowOf(after64, "255751200026");
const ending64 = (await doorRowsSql()).at(-1);
ok("6.4 · ⛔ ALL OR NOTHING ON POSTGRES · when another run re-dates d6 between the plan and the write, the ONE transaction is ROLLED BACK — d5, written before d6 inside it, keeps its old Added — and the attempt is recorded refused, naming d6",
  raced64.code === "changed" && !!d5 && iso(d5.createdAt) === OLD.d5.createdAt && iso(d5.updatedAt) === OLD.d5.createdAt
    && !!d6 && iso(d6.createdAt) === rd6.createdAt && ending64?.action === ADDED_REDATE_ACTIONS.refused && ending64.payload?.contact === "prc_c_d6",
  `${raced64.code} · d5 ${d5 ? iso(d5.createdAt) : "-"} · d6 ${d6 ? iso(d6.createdAt) : "-"} · ${ending64?.action ?? "no record"}`);

console.log(`${NL}registration-contact-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
