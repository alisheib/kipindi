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

// ── 5 · U24 commit 2 · THE CACHE MIRROR ON POSTGRES — after every check above, so their expected sets stand ──────
// ⭐ WHY HERE. `mirrorContactCache` writes only on a difference, comparing the row's `suppressedAt` (Timestamptz(3))
// with the stop's `createdAt` (a plain TIMESTAMP(3)) as ISO strings. If the two columns round-tripped an instant
// differently, the comparison would never hold on Postgres: every writer would UPDATE the row on every call, and
// the memory twin — where both are just strings — could never show it.
{
  const { mirrorContactCache } = await import("../../src/lib/server/marketing/contact-cache.ts");
  const { mintOptOutToken, stopMarketing } = await import("../../src/lib/server/marketing/optout-service.ts");
  const seedRow = async (id: string, local: string) => {
    const p = parseTzNumber(local);
    if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`seed ${local} does not parse`);
    await db.marketingContact.create({
      id, msisdn: p.msisdn, rawInput: local, displayName: null, email: null, ndc: p.ndc, operator: null, source: "IMPORT",
      sourceRef: null, userId: null, consentState: "GIVEN", suppressedAt: null, tags: [], notes: null, importId: null,
      createdAt: at(8), createdBy: null, updatedAt: at(8), updatedBy: null,
    });
    return p.msisdn;
  };
  // A stale row: the cache says GIVEN and unsuppressed; the truth is a WITHDRAWN word and an officer's stop.
  const m7 = await seedRow("probe_p07", "0755000107");
  await db.messagingConsent.create({
    id: "probe_l7", channel: "SMS", identifier: m7, category: "MARKETING", status: "WITHDRAWN", source: "IMPORT",
    wording: "probe", locale: "EN", evidence: "probe", recordedBy: null, createdAt: at(9),
  });
  const STOP_AT = "2026-09-21T10:00:00.123Z";
  await db.suppression.create({
    id: "probe_s7", channel: "SMS", identifier: m7, category: "MARKETING", reason: "OPERATOR", evidence: "probe",
    recordedBy: null, createdAt: STOP_AT, liftedAt: null, liftedReason: null,
  });
  const first = await mirrorContactCache(m7);
  const row7 = await db.marketingContact.find("probe_p07");
  const second = await mirrorContactCache(m7);
  ok("5.1 · the mirror puts a stale row back from the truth on Postgres — WITHDRAWN, suppressed at the stop's own millisecond",
    first === "updated" && row7?.consentState === "WITHDRAWN" && row7?.suppressedAt === STOP_AT, `${first} · ${row7?.consentState} / ${row7?.suppressedAt}`);
  ok("5.2 · ⛔ and a second call is a READ — the stop's time round-trips the two column types, so nothing is rewritten", second === "unchanged", second);

  // The writer itself, end to end on Postgres: a stop through a minted link.
  const m8 = await seedRow("probe_p08", "0755000108");
  const token = await mintOptOutToken(m8);
  const stopped = token ? await stopMarketing(token, "SW") : null;
  const row8 = await db.marketingContact.find("probe_p08");
  const stop8 = await db.suppression.find({ channel: "SMS", identifier: m8, category: "MARKETING" });
  const again8 = await mirrorContactCache(m8);
  ok("5.3 · a STOP through a minted link on Postgres leaves its book row WITHDRAWN and suppressed at the stop's time, and the next mirror is a read",
    stopped?.ok === true && row8?.consentState === "WITHDRAWN" && !!stop8 && row8?.suppressedAt === stop8.createdAt && again8 === "unchanged",
    `${JSON.stringify(stopped)} · ${row8?.consentState} / ${row8?.suppressedAt} vs ${stop8?.createdAt} · ${again8}`);
}

// ── 6 · U23 · THE BULK WRITES ON POSTGRES — after §5, so every expected set above stands ──────────────────────────
// ⭐ WHY HERE. U23's Prisma twin writes with raw SQL the memory twin cannot show wrong: `array_append`/`array_remove`
// with a `::text` tag, the caller's instant cast `::timestamptz`, the tag cap as `cardinality(...) < $n::int`; a
// `createMany` with `skipDuplicates` and its one-row-at-a-time retry on a foreign-key failure (P2003); and a
// `deleteMany` that leans on the list-member cascade. Every count below is written HERE BY HAND.
// The live book after §5 (p06 is the erased tombstone, in no audience):
//   p01 [vip,dar] GIVEN · p02 [dar] UNKNOWN · p03 [] WITHDRAWN · p04 [vip] GIVEN (the player) · p05 [arusha] UNKNOWN
//   p07 [] and p08 [] WITHDRAWN (§5) · p06 [] the tombstone
{
  const { contactAudienceWrites } = await import("../../src/lib/server/marketing/audience.ts");
  const { prisma } = await import("../../src/lib/server/prisma.ts");
  const raw = prisma();
  if (!raw) throw new Error("§6 needs the Prisma client");
  type Filter = typeof WHOLE_BOOK;
  type Count = { matched: number; changed: number; unchanged: number; full: number };
  const ticks = (...ids: string[]): Filter => ({ ...WHOLE_BOOK, ids: ids.map((i) => `probe_${i}`) });
  const filt = (f: Partial<Filter>): Filter => ({ ...WHOLE_BOOK, ...f });
  const row = (id: string) => db.marketingContact.find(`probe_${id}`);
  const tagsOf = async (id: string) => { const r = await row(id); return r ? r.tags.join(",") : "GONE"; };
  const n = (c: Count) => `${c.matched}/${c.changed}/${c.unchanged}/${c.full}`;
  const S1 = { at: "2026-10-02T06:00:00.321Z", by: "probe_officer_1" };
  const S2 = { at: "2026-10-02T06:05:00.987Z", by: "probe_officer_2" };
  const members = async (listId: string) => (await db.contactListMember.listMembers(listId))
    .map((m) => `${m.contactId.replace("probe_", "")}@${m.addedAt === S1.at ? "S1" : m.addedAt === S2.at ? "S2" : m.addedAt}:${m.addedBy}`)
    .sort().join(" ");

  // 6.1 · TAG a ticked selection: the ticked tombstone stays untouched; a row already carrying the tag is not rewritten.
  const t1 = await contactAudienceWrites(ticks("p01", "p04", "p05", "p06")).tag("vip", 20, S1);
  const p05 = await row("p05");
  const p01 = await row("p01");
  ok("6.1 · TAG on Postgres: 3 matched (the ticked tombstone is not), 1 written, 2 already carrying it (matched/changed/unchanged/full)",
    n(t1) === "3/1/2/0", n(t1));
  ok("6.1b · the written row carries the tag once, stamped at the CALLER'S millisecond (the ::timestamptz cast), by the caller",
    p05?.tags.join(",") === "arusha,vip" && p05?.updatedAt === S1.at && p05?.updatedBy === S1.by, `${p05?.tags} · ${p05?.updatedAt} · ${p05?.updatedBy}`);
  ok("6.1c · ⛔ a row that already carried the tag is NOT rewritten (its updatedAt is still its seed's), and the tombstone holds no tag",
    p01?.updatedAt === at(1) && (await tagsOf("p06")) === "", `${p01?.updatedAt} · p06 [${await tagsOf("p06")}]`);

  // 6.2 · THE CAP (decision C11), re-checked inside the statement: at a cap of 2, p01 [vip,dar] is full and p02 [dar] is not.
  const t2 = await contactAudienceWrites(filt({ tags: ["dar"] })).tag("north", 2, S1);
  ok("6.2 · ⛔ the cap is checked IN the statement (cardinality < $n::int): p02 gains the tag, p01 at the cap is counted FULL and left as it was",
    n(t2) === "2/1/0/1" && (await tagsOf("p01")) === "vip,dar" && (await tagsOf("p02")) === "dar,north",
    `${n(t2)} · p01 [${await tagsOf("p01")}] p02 [${await tagsOf("p02")}]`);
  const t3 = await contactAudienceWrites(filt({ tags: ["dar"] })).tag("north", 2, S1);
  ok("6.3 · the same tag again writes nothing: p02 already carries it (unchanged), p01 is still full — never a tag twice",
    n(t3) === "2/0/1/1" && (await tagsOf("p02")) === "dar,north", `${n(t3)} · p02 [${await tagsOf("p02")}]`);

  // 6.4 · UNTAG (array_remove): the filter's live carriers lose it; a second, ticked untag finds nothing to remove.
  const u1 = await contactAudienceWrites(filt({ tags: ["vip"] })).untag("vip", S2);
  const p04 = await row("p04");
  ok("6.4 · UNTAG on Postgres: the 3 live carriers lose the tag, each stamped at the caller's instant",
    n(u1) === "3/3/0/0" && (await tagsOf("p01")) === "dar" && p04?.tags.length === 0 && p04?.updatedAt === S2.at && (await tagsOf("p05")) === "arusha",
    `${n(u1)} · p01 [${await tagsOf("p01")}] p04 [${p04?.tags}] ${p04?.updatedAt} p05 [${await tagsOf("p05")}]`);
  const u2 = await contactAudienceWrites(ticks("p01", "p03")).untag("vip", S2);
  ok("6.4b · an untag of rows not carrying the tag counts them UNCHANGED and writes nothing", n(u2) === "2/0/2/0", n(u2));

  // 6.5 · ADD TO A LIST (createMany + skipDuplicates): a member keeps its ORIGINAL addedAt.
  await db.contactList.create({ id: "probe_list_2", name: "Probe list 2", description: null, createdAt: at(10), createdBy: null, updatedAt: at(10), updatedBy: null });
  const a1 = await contactAudienceWrites(ticks("p01", "p02", "p06")).addToList("probe_list_2", S1);
  const a2 = await contactAudienceWrites(filt({ consent: ["GIVEN"] })).addToList("probe_list_2", S2);
  const m2 = await members("probe_list_2");
  ok("6.5 · ADD on Postgres: 2 of 3 ticked added (the tombstone is not); then the GIVEN filter (p01, p04) adds only p04",
    n(a1) === "2/2/0/0" && n(a2) === "2/1/1/0", `${n(a1)} then ${n(a2)}`);
  ok("6.5b · ⛔ skipDuplicates keeps p01's ORIGINAL addedAt and adder; p04 carries the second stamp",
    m2 === `p01@S1:${S1.by} p02@S1:${S1.by} p04@S2:${S2.by}`, m2);
  let refused = "";
  try { await contactAudienceWrites(ticks("p01")).addToList("probe_no_such_list", S1); } catch (e) { refused = String((e as Error).message); }
  ok("6.5c · a list that does not exist is REFUSED before anything is written", /no such contact list/.test(refused), refused || "(no refusal)");

  // 6.6 · 🔴 THE P2003 RETRY: a trigger deletes p05 as its membership is inserted — a REAL foreign-key failure, the one a
  // contact removed between the read and the insert raises. The failed statement rolls its own delete back, so p05
  // survives; the chunk must be retried one row at a time, p01 and p04 added, p05 counted in neither column.
  await db.contactList.create({ id: "probe_list_3", name: "Probe list 3", description: null, createdAt: at(10), createdBy: null, updatedAt: at(10), updatedBy: null });
  await raw.$executeRawUnsafe(`create or replace function probe_vanish() returns trigger language plpgsql as $fn$
    begin
      if new."contactId" = 'probe_p05' then delete from "MarketingContact" where "id" = new."contactId"; end if;
      return new;
    end $fn$`);
  await raw.$executeRawUnsafe(`create trigger probe_vanish before insert on "ContactListMember" for each row execute function probe_vanish()`);
  let a3: Count | null = null;
  let a3err = "";
  try { a3 = await contactAudienceWrites(ticks("p01", "p04", "p05")).addToList("probe_list_3", S1); } catch (e) { a3err = String((e as Error).message).slice(0, 300); }
  await raw.$executeRawUnsafe(`drop trigger probe_vanish on "ContactListMember"`);
  await raw.$executeRawUnsafe(`drop function probe_vanish()`);
  const m3 = await members("probe_list_3");
  ok("6.6 · 🔴 a foreign-key failure (P2003) mid-chunk is retried row by row: p01 and p04 added, the vanished row counted in neither column",
    a3 !== null && n(a3) === "3/2/0/0" && m3 === `p01@S1:${S1.by} p04@S1:${S1.by}` && (await row("p05")) !== null,
    a3 ? `${n(a3)} · [${m3}]` : `threw: ${a3err}`);

  // 6.7 · REMOVE (deleteMany): the memberships cascade, the evidence keyed by NUMBER stays, the number is free again.
  const k2 = parseTzNumber("0754000102");
  const k7 = parseTzNumber("0755000107");
  if (!k2.msisdn || !k2.ndc || !k7.msisdn) throw new Error("§6.7 keys do not parse");
  const r1 = await contactAudienceWrites(ticks("p02", "p07", "p06")).remove();
  const m2after = await members("probe_list_2");
  const stop7 = await db.suppression.find({ channel: "SMS", identifier: k7.msisdn, category: "MARKETING" });
  const word7 = await db.messagingConsent.latestFor({ channel: "SMS", identifier: k7.msisdn, category: "MARKETING" });
  ok("6.7 · REMOVE on Postgres: the 2 live ticked rows go (the tombstone stays), and p02's membership cascades with it",
    n(r1) === "2/2/0/0" && (await row("p02")) === null && (await row("p07")) === null && (await row("p06")) !== null
      && m2after === `p01@S1:${S1.by} p04@S2:${S2.by}`, `${n(r1)} · list 2 [${m2after}]`);
  ok("6.7b · ⛔ removing a book row deletes NO evidence: p07's stop and its withdrawn word still stand, keyed by its number",
    !!stop7 && word7?.status === "WITHDRAWN", `${stop7?.id} · ${word7?.status}`);
  const again2 = await db.marketingContact.create({
    id: "probe_p02b", msisdn: k2.msisdn, rawInput: "0754000102", displayName: null, email: null, ndc: k2.ndc, operator: null,
    source: "OPERATOR", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null,
    importId: null, createdAt: at(11), createdBy: null, updatedAt: at(11), updatedBy: null,
  });
  ok("6.7c · the removed row's number is FREE again: the unique key accepts a new book row for it", again2 !== null, String(again2?.id));
}

console.log(`\ncontacts-audience-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
