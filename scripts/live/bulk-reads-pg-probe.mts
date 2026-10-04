/**
 * §25 · THE ONE BULK KEYED READS ON A REAL POSTGRES — the Prisma twin, which no suite on this laptop executes (and U38a's
 * player walk beside them).
 *
 * ⭐ WHY THIS EXISTS. `test:dal-parity` §25 holds the Prisma twin's SHAPE and `test:campaign-audience` §4.0 proves the
 * MEMORY twin's bulk reads equal its single reads — neither sends one statement to Postgres. Whether `findActiveAmong`'s
 * `liftedAt: null` really leaves a lifted stop out, whether `latestAmong`'s `createdAt desc, id desc` really breaks a
 * same-millisecond tie the way `latestFor` does, whether `findByPhones`' `omit` really leaves the avatar behind, whether
 * `msisdnsPresent`'s NULL arm keeps a row with no mark, and whether the 2,000-key bound refuses the 2,001st — those are
 * facts about the database. This writes a small world to a scratch Postgres through the REAL `db` and checks every
 * read, element by element, against the single read it mirrors, and against answers written here by hand.
 *
 * Run (through the heavy-node lock; it needs a migrated EMPTY database):
 *   npm run db:probe-bulk-reads   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this probe)
 */
import type { StoredUser, StoredMarketingContact, MessagingKey } from "../../src/lib/server/store.ts";

process.exitCode = 1;
if (!process.env.DATABASE_URL) {
  console.error("bulk-reads-pg-probe: needs DATABASE_URL (a scratch Postgres) — refusing to run on the memory twin, which proves nothing here.");
  process.exit(2);
}
{
  // ⛔ A LOOPBACK CLUSTER ONLY: this probe writes accounts, contacts, stops and consents — production's URL is refused
  // before the store loads.
  let host = "";
  try { host = new URL(process.env.DATABASE_URL).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("bulk-reads-pg-probe: refusing — it writes rows, and runs only against a loopback scratch cluster (db-scratch).");
    process.exit(2);
  }
}

const { db } = await import("../../src/lib/server/store.ts");
const { prisma } = await import("../../src/lib/server/prisma.ts");

const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const json = (v: unknown) => JSON.stringify(v);
const pg = prisma();
if (!pg) throw new Error("bulk-reads-pg-probe: no Prisma client");
async function refuses(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}

const counts = await pg.$queryRawUnsafe<Array<{ users: number; contacts: number; stops: number; consents: number }>>(
  `select (select count(*)::int from "User") as users, (select count(*)::int from "MarketingContact") as contacts,
          (select count(*)::int from "Suppression") as stops, (select count(*)::int from "MessagingConsent") as consents`);
const before = counts[0] ?? { users: -1, contacts: -1, stops: -1, consents: -1 };
ok("0 · CONTROL · the scratch tables start EMPTY — every row below is this probe's own", json(before) === json({ users: 0, contacts: 0, stops: 0, consents: 0 }), json(before));
if (before.users !== 0 || before.contacts !== 0 || before.stops !== 0 || before.consents !== 0) process.exit(1);

/* ── the world, through the ONE door ── */
const AVATAR = "data:image/png;base64,iVBORw0KGgo=";
const user = (id: string, phoneE164: string, over: Partial<StoredUser>): StoredUser => ({
  id, phoneE164, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
  acceptedTermsVersion: "v1", acceptedTermsAt: "2026-08-01T08:00:00.000Z", marketingOptIn: true, twoFactorEnabled: false,
  avatarDataUrl: null, createdAt: "2026-08-01T08:00:00.000Z", updatedAt: "2026-08-01T08:00:00.000Z", lastLoginAt: null, closedAt: null,
  ...over,
} as StoredUser);
await db.user.create(user("probe25_u1", "+255751100001", { avatarDataUrl: AVATAR, createdAt: "2026-08-01T08:00:00.000Z" }));
await db.user.create(user("probe25_u2", "+255751100002", { createdAt: "2026-08-02T08:00:00.000Z" }));
await db.user.create(user("probe25_u3", "+255761100003", { avatarDataUrl: AVATAR, createdAt: "2026-08-03T08:00:00.000Z" }));
await db.user.create(user("probe25_s1", "+255751100090", { role: "GROWTH", createdAt: "2026-08-04T08:00:00.000Z" }));
await db.user.create(user("probe25_e1", "erased:probe25_e1", { createdAt: "2026-08-05T08:00:00.000Z" }));
await db.user.create(user("probe25_f1", "+254712100001", { createdAt: "2026-08-06T08:00:00.000Z" }));

const contact = (id: string, msisdn: string, ndc: string, sourceRef: string | null): StoredMarketingContact => ({
  id, msisdn, rawInput: msisdn, displayName: "Probe", email: "probe@example.tz", ndc, operator: null, source: "IMPORT", sourceRef,
  userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: "a note no presence read may carry", importId: null,
  createdAt: "2026-08-10T08:00:00.000Z", createdBy: null, updatedAt: "2026-08-10T08:00:00.000Z", updatedBy: null,
});
await db.marketingContact.create(contact("probe25_c1", "255751100001", "75", null));            // no mark — nearly the whole book
await db.marketingContact.create(contact("probe25_c2", "255791100002", "79", "probe_import"));  // a mark that is not erasure
await db.marketingContact.create(contact("probe25_c3", "255761100003", "76", "erasure"));       // an ERASED tombstone

const key = (identifier: string): MessagingKey => ({ channel: "SMS", identifier, category: "MARKETING" });
const stop = (id: string, identifier: string, reason: "WITHDRAWN" | "OPERATOR") => db.suppression.create({
  id, channel: "SMS", identifier, category: "MARKETING", reason, evidence: "probe", recordedBy: null,
  createdAt: "2026-07-01T00:00:00.000Z", liftedAt: null, liftedReason: null,
});
await stop("probe25_sA", "255751100002", "WITHDRAWN");                                          // in force
await stop("probe25_sB", "255761100003", "WITHDRAWN");                                          // lifted below
await db.suppression.lift(key("255761100003"), "probe: started again", "2026-07-02T00:00:00.000Z");
await stop("probe25_sC", "255791100002", "OPERATOR");                                           // in force, an officer's

const said = (id: string, identifier: string, status: "GIVEN" | "WITHDRAWN", createdAt: string) => db.messagingConsent.create({
  id, channel: "SMS", identifier, category: "MARKETING", status, source: "PROFILE", wording: "probe wording", locale: "SW",
  evidence: "probe", recordedBy: null, createdAt,
});
await said("probe25_x_1", "255751100001", "GIVEN", "2026-01-01T00:00:00.000Z");
await said("probe25_x_2", "255751100001", "WITHDRAWN", "2026-02-01T00:00:00.000Z");
// ⭐ THE TIE: a yes and a no in ONE millisecond — the higher id (the later write by the ledger's clock) must win. The no
// is written FIRST, so a read that fell back on heap or insertion order would not land on it by luck.
await said("probe25_y_b", "255751100002", "WITHDRAWN", "2026-03-01T00:00:00.000Z");
await said("probe25_y_a", "255751100002", "GIVEN", "2026-03-01T00:00:00.000Z");
await said("probe25_z_1", "255791100002", "GIVEN", "2026-04-01T00:00:00.000Z");

// ⛔ THE CONTROL THAT MAKES EVERY CHECK BELOW MEAN SOMETHING: the world is IN POSTGRES. `USE_PRISMA_DAL=false` in the
// environment hands `db` the memory twin — every check below would still pass, on the twin that proves nothing here.
const landed = (await pg.$queryRawUnsafe<Array<{ users: number; contacts: number; stops: number; consents: number }>>(
  `select (select count(*)::int from "User") as users, (select count(*)::int from "MarketingContact") as contacts,
          (select count(*)::int from "Suppression") as stops, (select count(*)::int from "MessagingConsent") as consents`))[0] ?? null;
ok("0b · CONTROL · the world was written THROUGH db INTO POSTGRES — 6 accounts, 3 contacts, 3 stops, 5 ledger rows read back by raw SQL (db is the Prisma twin)",
  json(landed) === json({ users: 6, contacts: 3, stops: 3, consents: 5 }), json(landed));
if (json(landed) !== json({ users: 6, contacts: 3, stops: 3, consents: 5 })) process.exit(1);

/* ── 1 · BULK EQUALS SINGLE, PER ELEMENT ── */
const KEYS = ["255751100001", "255751100002", "255761100003", "255791100002", "255759999998", "255759999999", "254712100001"];
const batch = { channel: "SMS" as const, category: "MARKETING" as const, identifiers: KEYS };
const stops = new Map((await db.suppression.findActiveAmong(batch)).map((s) => [s.identifier, s] as const));
const latest = new Map((await db.messagingConsent.latestAmong(batch)).map((c) => [c.identifier, c] as const));
const accounts = new Map((await db.user.findByPhones(KEYS.map((k) => `+${k}`))).map((u) => [u.phoneE164, u] as const));
const present = new Set(await db.marketingContact.msisdnsPresent({ msisdns: KEYS, excludeSourceRef: null }));
const presentLive = new Set(await db.marketingContact.msisdnsPresent({ msisdns: KEYS, excludeSourceRef: "erasure" }));
const off: string[] = [];
for (const k of KEYS) {
  const sStop = await db.suppression.find(key(k));
  if ((stops.get(k)?.id ?? null) !== (sStop?.id ?? null)) off.push(`stop ${k}`);
  const sLatest = await db.messagingConsent.latestFor(key(k));
  if ((latest.get(k)?.id ?? null) !== (sLatest?.id ?? null)) off.push(`latest ${k}`);
  const sUser = await db.user.findByPhone(`+${k}`);
  const bUser = accounts.get(`+${k}`) ?? null;
  if ((bUser?.id ?? null) !== (sUser?.id ?? null) || (bUser !== null && sUser !== null && json({ ...sUser, avatarDataUrl: null }) !== json(bUser))) off.push(`account ${k}`);
  const row = await db.marketingContact.findByMsisdn(k);
  if (present.has(k) !== (row !== null)) off.push(`present ${k}`);
  if (presentLive.has(k) !== (row !== null && row.sourceRef !== "erasure")) off.push(`present (mark excluded) ${k}`);
}
ok("1 · ⭐ every bulk read equals its single read for every key, present or absent — findActiveAmong = find, latestAmong = latestFor, findByPhones = findByPhone (the avatar aside), msisdnsPresent = findByMsisdn", off.length === 0, off.join(" | "));

/* ── 2 · liftedAt: null ── */
const lifted = await db.suppression.listFor("255761100003");
ok("2 · ⭐ findActiveAmong returns exactly the two stops in force, each with liftedAt null — and NOT the lifted one, which listFor still shows lifted (never deleted)",
  json([...stops.keys()].sort()) === json(["255751100002", "255791100002"]) && [...stops.values()].every((s) => s.liftedAt === null)
    && !stops.has("255761100003") && lifted.length === 1 && lifted[0].liftedAt !== null,
  `${json([...stops.keys()])} · lifted row ${json(lifted.map((s) => s.liftedAt))}`);

/* ── 3 · the ledger's identical order ── */
const tie = latest.get("255751100002");
const tieSingle = await db.messagingConsent.latestFor(key("255751100002"));
ok("3 · ⭐ latestAmong reads the ledger in latestFor's order — the same-millisecond tie goes to the higher id (the no), exactly as latestFor answers; an ordinary later no wins; a number with no row is absent",
  tie?.id === "probe25_y_b" && tieSingle?.id === "probe25_y_b" && tie?.status === "WITHDRAWN"
    && latest.get("255751100001")?.id === "probe25_x_2" && latest.get("255791100002")?.id === "probe25_z_1" && !latest.has("255759999999"),
  `tie → ${tie?.id} (latestFor ${tieSingle?.id}) · x → ${latest.get("255751100001")?.id}`);

/* ── 4 · the avatar omitted ── */
const u1 = await db.user.findById("probe25_u1");
ok("4 · ⭐ findByPhones omits the avatar — null on every row (the three +255 accounts and the foreign one asked for by its own number), for two accounts that HAVE one (findById shows it)",
  accounts.size === 4 && [...accounts.values()].every((u) => u.avatarDataUrl === null) && u1?.avatarDataUrl === AVATAR
    && (await db.user.findById("probe25_u3"))?.avatarDataUrl === AVATAR,
  `${accounts.size} accounts · findById avatar ${u1?.avatarDataUrl ? "present" : "missing"}`);

/* ── 5 · key-only and the NULL arm ── */
ok("5 · msisdnsPresent hands back KEYS only, and its exclusion is NULL-safe — a row with no mark and a row with another mark are present, the erased one present only when the mark is not excluded",
  json([...present].sort()) === json(["255751100001", "255761100003", "255791100002"])
    && json([...presentLive].sort()) === json(["255751100001", "255791100002"])
    && [...present].every((m) => typeof m === "string" && /^255[0-9]{9}$/.test(m)),
  `${json([...present])} · ${json([...presentLive])}`);

/* ── 6 · the 2,000-key bound, and the empty set ── */
const many = (n: number) => Array.from({ length: n }, (_, i) => `2557${String(20000000 + i)}`);
const ok2000 = [
  (await db.suppression.findActiveAmong({ ...batch, identifiers: [...many(1999), "255751100002"] })).length === 1,
  (await db.messagingConsent.latestAmong({ ...batch, identifiers: [...many(1999), "255751100001"] })).length === 1,
  (await db.user.findByPhones([...many(1999).map((m) => `+${m}`), "+255751100001"])).length === 1,
  (await db.marketingContact.msisdnsPresent({ msisdns: [...many(1999), "255751100001"], excludeSourceRef: null })).length === 1,
];
const over = many(2001);
const refused2001 = [
  await refuses(() => db.suppression.findActiveAmong({ ...batch, identifiers: over })),
  await refuses(() => db.messagingConsent.latestAmong({ ...batch, identifiers: over })),
  await refuses(() => db.user.findByPhones(over.map((m) => `+${m}`))),
  await refuses(() => db.marketingContact.msisdnsPresent({ msisdns: over, excludeSourceRef: null })),
];
const empty = [
  json(await db.suppression.findActiveAmong({ ...batch, identifiers: [] })), json(await db.messagingConsent.latestAmong({ ...batch, identifiers: [] })),
  json(await db.user.findByPhones([])), json(await db.marketingContact.msisdnsPresent({ msisdns: [], excludeSourceRef: null })),
];
ok("6 · ⭐ the bound — 2,000 distinct keys are answered (only the present one comes back), 2,001 are REFUSED by every read, and an empty set is []",
  ok2000.every(Boolean) && refused2001.every(Boolean) && empty.every((e) => e === "[]"),
  `2,000 ${ok2000.join(",")} · 2,001 refused ${refused2001.join(",")} · empty ${empty.join(",")}`);

/* ── 7 · U38a · the player walk on Postgres (§21's new member) ── */
const walk = (q: Partial<{ afterId: string | null; limit: number; ndcs: string[] | null; createdFrom: string | null; createdBefore: string | null }>) =>
  db.user.playerWalk({ afterId: null, limit: 10, ndcs: null, createdFrom: null, createdBefore: null, ...q });
const p1 = await walk({ limit: 2 });
const p2 = await walk({ limit: 2, afterId: p1.nextAfterId });
const ids = (w: { rows: Array<{ id: string }> }) => w.rows.map((r) => r.id).join(",");
const vodacom75 = await walk({ ndcs: ["75"] });
const none = await walk({ ndcs: [] });
const windowed = await walk({ createdFrom: "2026-08-02T00:00:00.000Z", createdBefore: "2026-08-03T00:00:00.000Z" });
ok("7 · U38a · playerWalk walks PLAYER accounts on +255 numbers only — never staff, an erased account or a foreign number — as a keyset (resumed with no row twice), narrowed by prefix (an empty list is nothing) and by createdAt, key-only",
  ids(p1) === "probe25_u1,probe25_u2" && p1.nextAfterId === "probe25_u2" && ids(p2) === "probe25_u3" && p2.nextAfterId === null
    && ids(vodacom75) === "probe25_u1,probe25_u2" && none.rows.length === 0 && ids(windowed) === "probe25_u2"
    && p1.rows.every((r) => json(Object.keys(r).sort()) === json(["id", "phoneE164"])),
  `${ids(p1)} → ${ids(p2)} · 75 ${ids(vodacom75)} · [] ${none.rows.length} · window ${ids(windowed)}`);

console.log(`${NL}bulk-reads-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
