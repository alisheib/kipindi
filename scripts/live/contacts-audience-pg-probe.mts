/**
 * U24 · the resolver ON A REAL POSTGRES — the half no suite on this laptop executes.
 *
 * ⭐ WHY THIS EXISTS. Every marketing suite runs on the MEMORY twin. U24's Prisma twin translates a
 * `ContactAudienceWhere` into a Prisma where (a NULL-safe erased-row exclusion, list membership through the relation,
 * `hasSome` on a text[] column, a time window) and counts tags with raw SQL over `unnest`. A wrong translation is
 * invisible to every green suite and visible only on production. So this seeds a small book on a scratch Postgres
 * (embedded 18.3, `db-scratch`), runs filters through the ONE resolver, and checks each against an expected set
 * written HERE BY HAND — an oracle independent of either twin.
 *
 * Run (through the heavy-node lock; it needs a migrated empty database):
 *   npx tsx scripts/db-scratch.mts --reset --run bash -c 'DATABASE_URL="$VERIFY_DATABASE_URL" npx prisma migrate deploy && DATABASE_URL="$VERIFY_DATABASE_URL" npx tsx scripts/live/contacts-audience-pg-probe.mts'
 */
process.exitCode = 1;
if (!process.env.DATABASE_URL) {
  console.error("contacts-audience-pg-probe: needs DATABASE_URL (a scratch Postgres) — refusing to run on the memory twin, which proves nothing here.");
  process.exit(2);
}

const { db } = await import("../../src/lib/server/store.ts");
const { contactAudience, contactTagCounts, parseContactAudienceParams, WHOLE_BOOK } = await import("../../src/lib/server/marketing/audience.ts");
const { parseTzNumber } = await import("../../src/lib/tz-msisdn.ts");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const T0 = Date.parse("2026-09-10T09:00:00.000Z");
const at = (h: number) => new Date(T0 + h * 3_600_000).toISOString();

// One player account, so `player=yes` has a real FK to point at.
const USER = "probe_user_1";
await db.user.create({
  id: USER, phoneE164: "+255754999001", email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null,
  failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: "Probe",
  dob: "1990-01-01", region: null, acceptedTermsVersion: "v3", acceptedTermsAt: at(0), marketingOptIn: false,
  twoFactorEnabled: false, avatarDataUrl: null, createdAt: at(0), updatedAt: at(0), lastLoginAt: null, closedAt: null,
} as never);

type Seed = { id: string; local: string; name: string | null; consent: "GIVEN" | "UNKNOWN" | "WITHDRAWN"; suppressed: boolean; source: "IMPORT" | "REGISTRATION" | "OPERATOR" | "AGENT"; tags: string[]; userId: string | null; importId: string | null; sourceRef: string | null; h: number };
const SEEDS: Seed[] = [
  { id: "p01", local: "0712000101", name: "Asha One", consent: "GIVEN", suppressed: false, source: "IMPORT", tags: ["vip", "dar"], userId: null, importId: "imp_a", sourceRef: null, h: 1 },
  { id: "p02", local: "0754000102", name: "Baraka Two", consent: "UNKNOWN", suppressed: true, source: "OPERATOR", tags: ["dar"], userId: null, importId: null, sourceRef: null, h: 2 },
  { id: "p03", local: "0682000103", name: null, consent: "WITHDRAWN", suppressed: false, source: "AGENT", tags: [], userId: null, importId: null, sourceRef: "agt_9", h: 3 },
  { id: "p04", local: "0754000104", name: "Asha Four", consent: "GIVEN", suppressed: false, source: "REGISTRATION", tags: ["vip"], userId: USER, importId: null, sourceRef: null, h: 4 },
  { id: "p05", local: "0622000105", name: "Neema Five", consent: "UNKNOWN", suppressed: false, source: "IMPORT", tags: ["arusha"], userId: null, importId: "imp_a", sourceRef: "imp_a", h: 5 },
  // 🔴 THE TOMBSTONE: an erased row that matches almost every predicate — it must be in NO audience.
  { id: "p06", local: "0712000106", name: null, consent: "GIVEN", suppressed: false, source: "IMPORT", tags: [], userId: null, importId: null, sourceRef: "erasure", h: 6 },
];

for (const s of SEEDS) {
  const p = parseTzNumber(s.local);
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`seed ${s.local} does not parse`);
  const created = await db.marketingContact.create({
    id: `probe_${s.id}`, msisdn: p.msisdn, rawInput: s.local, displayName: s.name, email: null, ndc: p.ndc, operator: null,
    source: s.source, sourceRef: s.sourceRef, userId: s.userId, consentState: s.consent, suppressedAt: s.suppressed ? at(s.h) : null,
    tags: s.tags, notes: null, importId: s.importId, createdAt: at(s.h), createdBy: null, updatedAt: at(s.h), updatedBy: null,
  });
  if (!created) throw new Error(`seed ${s.id} was refused`);
}
await db.contactList.create({ id: "probe_list_1", name: "Probe list", description: null, createdAt: at(0), createdBy: null, updatedAt: at(0), updatedBy: null });
for (const c of ["probe_p01", "probe_p05", "probe_p06"]) await db.contactListMember.add({ listId: "probe_list_1", contactId: c, addedAt: at(7), addedBy: null });

ok("0 · CONTROL · the seed landed on Postgres (6 rows, the tombstone among them)", (await db.marketingContact.count()) >= 6);

const ids = async (sp: Record<string, string>): Promise<string> => {
  const parsed = parseContactAudienceParams(sp);
  if (!parsed.ok) return `REFUSED:${parsed.param}`;
  const a = contactAudience(parsed.filter);
  const page = await a.page({ sort: "added", dir: "asc", page: "1", perPage: 50 });
  const count = await a.count();
  const got = page.rows.map((r) => r.id.replace("probe_", "")).sort().join(",");
  return count === page.rows.length ? got : `COUNT ${count} ≠ PAGE ${page.rows.length}: ${got}`;
};
const CASES: Array<[string, Record<string, string>, string]> = [
  ["the whole book excludes the erased tombstone", {}, "p01,p02,p03,p04,p05"],
  ["consent GIVEN (the tombstone is GIVEN too — excluded)", { consent: "GIVEN" }, "p01,p04"],
  ["consent UNKNOWN,WITHDRAWN", { consent: "UNKNOWN,WITHDRAWN" }, "p02,p03,p05"],
  ["suppressed yes", { suppressed: "yes" }, "p02"],
  ["suppressed no", { suppressed: "no" }, "p01,p03,p04,p05"],
  ["operator VODACOM (prefix 75 via the one table)", { op: "VODACOM" }, "p02,p04"],
  ["list membership through the relation (the tombstone is a member — excluded)", { list: "probe_list_1" }, "p01,p05"],
  ["tag hasSome vip", { tag: "vip" }, "p01,p04"],
  ["source IMPORT (the tombstone is IMPORT — excluded)", { source: "IMPORT" }, "p01,p05"],
  ["player yes (linked to an account)", { player: "yes" }, "p04"],
  ["player no", { player: "no" }, "p01,p02,p03,p05"],
  ["import imp_a", { import: "imp_a" }, "p01,p05"],
  ["a whole number finds its row", { q: "0754 000 102" }, "p02"],
  ["⛔ a whole number of an ERASED row finds nothing", { q: "0712000106" }, ""],
  ["a name search", { q: "asha" }, "p01,p04"],
  ["AND across axes: consent GIVEN + tag dar", { consent: "GIVEN", tag: "dar" }, "p01"],
  ["⛔ NULL-safe exclusion: rows whose sourceRef is NULL are KEPT", { source: "OPERATOR,REGISTRATION" }, "p02,p04"],
];
for (const [name, sp, want] of CASES) {
  const got = await ids(sp);
  ok(`1 · ${name}`, got === want, `want [${want}] got [${got}]`);
}

const summary = await contactAudience(WHOLE_BOOK).breakdown();
ok("2 · the KPI breakdown counts the book without the tombstone (5: 2 given, 2 unknown, 1 withdrawn, 1 suppressed)",
  summary.total === 5 && summary.given === 2 && summary.unknown === 2 && summary.withdrawn === 1 && summary.suppressed === 1, JSON.stringify(summary));

const tags = await contactTagCounts(50);
const tagMap = Object.fromEntries(tags.map((t) => [t.tag, t.count]));
ok("3 · tagCounts (raw SQL over unnest) counts each tag once per live row, the tombstone excluded",
  tagMap.vip === 2 && tagMap.dar === 2 && tagMap.arusha === 1 && Object.keys(tagMap).length === 3, JSON.stringify(tags));

const whole = parseContactAudienceParams({});
if (whole.ok) {
  const a = contactAudience(whole.filter);
  const w1 = await a.walk(null, 2);
  const w2 = await a.walk(w1.nextAfterId, 2);
  const w3 = await a.walk(w2.nextAfterId, 2);
  const walked = [...w1.rows, ...w2.rows, ...w3.rows].map((r) => r.id.replace("probe_", ""));
  ok("4 · the keyset walk visits every live row once, by id, and ends", walked.join(",") === "p01,p02,p03,p04,p05" && w3.nextAfterId === null,
    `${walked.join(",")} · next=${w3.nextAfterId}`);
}

console.log(`\ncontacts-audience-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
