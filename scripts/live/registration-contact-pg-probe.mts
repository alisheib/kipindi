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
const EXPECTED = json({
  o: { created: 2, linked: 1, already_linked: 1, kept_erased: 1, kept_other_account: 1, skipped: 3, failed: 0 },
  s: { not_a_player: 0, bootstrap_admin: 0, closed: 2, erased: 0, not_tz_mobile: 1 },
});

/* ── 1 · the dry run ── */
const seeded = json(await book());
const dry = await backfillRegistrationContacts({ chunk: 2, contact: registrationDryRunDeps() });
ok("1 · the DRY RUN writes nothing on Postgres and predicts the real run: 13 accounts, 9 walked, the same outcomes",
  json(await book()) === seeded && dry.accounts === 13 && dry.walked === 9 && outcomesOf(dry) === EXPECTED,
  `${outcomesOf(dry)} · walked ${dry.walked}`);

/* ── 2 · the real run ── */
const first = await backfillRegistrationContacts({ chunk: 2 });
ok("2 · the first run's counts are the world's: 2 created, 1 linked, 1 already linked, the tombstone and the other account's row kept, 3 skipped (2 closed, 1 064), 1 cache repaired",
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
ok("3 · ⭐ on Postgres: the created rows carry the LINK (the foreign key took it), source REGISTRATION and the account id as sourceRef, the name and email from the account, and the ledger's word (GIVEN / UNKNOWN)",
  !!w1 && w1.userId === "prc_w1" && w1.source === "REGISTRATION" && w1.sourceRef === "prc_w1" && w1.displayName === "Neema Kileo"
    && w1.email === "neema@example.tz" && w1.consentState === "GIVEN" && iso(w1.createdAt) === SIGNED && w1.operator === null && w1.ndc === "75"
    && !!w2 && w2.userId === "prc_w2" && w2.consentState === "UNKNOWN" && w2.displayName === null && w2.email === null,
  `${json(w1)} · ${json(w2)}`);
ok("3b · ⭐ OD56 ON POSTGRES · the officer's row is LINKED with every typed field and its own updatedAt kept to the millisecond (timestamptz(3)), its source OPERATOR",
  !!w3 && w3.userId === "prc_w3" && w3.source === "OPERATOR" && w3.displayName === "Mama Asha (typed)" && w3.email === "typed@example.tz"
    && w3.notes === "Met at the stand." && json(w3.tags) === json(["vip"]) && iso(w3.updatedAt) === "2026-09-15T10:00:00.123Z" && w3.updatedBy === "probe_officer",
  json(w3));
ok("3c · ⛔ the erased tombstone and the row linked to another account are byte-identical to how they were seeded",
  same(w5, rowOf(seededRows, "255751200005")) && same(w6, rowOf(seededRows, "255751200006")),
  `${json(w5)} · ${json(w6)}`);
ok("3d · ⛔ no row for staff, an agent, a closed or erased account, a 064 or a foreign number — the book holds exactly 6 rows",
  after1.length === 6 && ["255751200007", "255751200008", "255641200009", "255751200010", "255751200011", "254712200012"].every((m) => rowOf(after1, m) === null),
  `${after1.length} rows`);

/* ── 4 · the second run ── */
const settled = json(after1);
const second = await backfillRegistrationContacts({ chunk: 2 });
ok("4 · ⭐ IDEMPOTENT ON POSTGRES · the second run creates and links nothing, repairs no cache, and every row (updatedAt included) is byte-identical",
  second.outcomes.created === 0 && second.outcomes.linked === 0 && second.outcomes.already_linked === 4 && second.cache.updated === 0
    && second.outcomes.failed === 0 && json(await book()) === settled,
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

console.log(`${NL}registration-contact-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
