/**
 * test:contacts-audience — U24's guard: ONE audience resolver is the only path from a filter to the contact book.
 *
 * ⭐ WHAT IT HOLDS (`src/lib/server/marketing/audience.ts`):
 *   §1 STRUCTURE, over the REAL `src/` tree through a pure scanner fed a Map: outside the two twins only the
 *      resolver calls the book's set readers; no alias, no bracket access, no direct Prisma or raw SQL on the
 *      book's tables; the importers of `contactAudience` EQUAL the declared READERS; `ContactAudienceWhere`,
 *      `toAudienceWhere` and `contactsSearch` live in the resolver alone; no hand-typed prefix list; the page's
 *      href vocabulary equals the parser's.
 *   §2 BEHAVIOUR, DRIVEN on the memory twin over a 10-row fixture (one an erased tombstone): every predicate on its
 *      own, AND across them, an empty any-of is NOTHING, the tombstone is in no reader, an unknown value REFUSES,
 *      and two spellings of one filter are one key.
 *   §3 ⭐ ONE COUNT (the Accept): for twelve filters the list's total, count(), breakdown().total, the keyset walk
 *      and the union of the pages are one number. U34 (export) and U40 (recount) each add their reader to READERS.
 *   §4 the KEYSET walk survives a row written between two calls; §5 the audit and describe forms never print a number.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — a synthetic file in the scanner's Map,
 * a planted translation handed to `contactAudience`, a parser or key variant — and requires the MATCHING assertion
 * to fail. This file makes no file-modifying call (`test:red-anchors` 4.3 counts it in-process only while that holds).
 * The one store mutation it makes (§4's late row) goes through the store's own create, and is taken back out of the
 * memory map in a `finally`, so every run starts from the same ten rows.
 *
 * Run:  npm run test:contacts-audience
 * Red:  npm run red:contacts-audience
 */
process.exitCode = 1;

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import type { StoredMarketingContact } from "../src/lib/server/store.ts";
import {
  contactAudience, toAudienceWhere, AUDIENCE_DEPS, WHOLE_BOOK, MAX_AUDIENCE_IDS, CONTACT_AUDIENCE_URL_KEYS,
  parseContactAudienceParams, parseContactAudienceJson, contactAudienceKey, contactAudienceParams, urlExpressible,
  auditContactAudience, describeAudience, ndcsForOperators, contactTagCounts,
} from "../src/lib/server/marketing/audience.ts";
import type { ContactAudienceFilter, ContactAudience, AudienceParse } from "../src/lib/server/marketing/audience.ts";
import { CONTACTS_LINK_KEYS, contactsHref } from "../src/app/admin/contacts/contacts-query.ts";
import { loadContacts } from "../src/app/admin/contacts/contacts-loader.ts";
import { parseTzNumber, TZ_MOBILE_NDCS, TZ_OPERATORS } from "../src/lib/tz-msisdn.ts";
import type { TzOperatorId } from "../src/lib/tz-msisdn.ts";
import { ERASURE_EVIDENCE } from "../src/lib/server/marketing/erase.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

/* ═══ §1 · THE SCANNER — pure, over a Map of path → decommented source ═══════════════════════ */

function walkSrc(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkSrc(join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : []);
}
const REAL_FILES = new Map<string, string>();
for (const f of walkSrc(SRC)) {
  REAL_FILES.set(f.slice(SRC.length + 1).replace(/\\/g, "/"), decomment(readFileSync(f, "utf8")).replace(/\r\n/g, "\n"));
}

const STORE = "lib/server/store.ts";
const PRISMA_DAL = "lib/server/prisma-dal.ts";
const RESOLVER = "lib/server/marketing/audience.ts";
const LOADER = "app/admin/contacts/contacts-loader.ts";
const TWINS = new Set([STORE, PRISMA_DAL]);

/** ⭐ THE DECLARED READERS — every src file that reads the book through the resolver. U23 (bulk recount), U34
 *  (export walk), U38/U40 (counts, recount) and U42 (enqueue walk) each APPEND their file in their own commit. */
const READERS = [LOADER];

/** The book's SET readers — the members that return many rows or count them. Point lookups (`find`,
 *  `findByMsisdn`, `listByUserId`, `listMemberships`) are not a path from a filter. */
// ⭐ M4 · any `…Where` member (U23's tagWhere/untagWhere/removeWhere/addWhere, U34's, U42's) is a SET path the
// moment it exists — matched by shape, so a new one cannot slip past by not being listed here.
const SET_READERS = /\bdb\.marketingContact\.(page|walk|tagCounts|listAll|count|summary|\w+Where)\s*\(|\bdb\.contactListMember\.listMembers\s*\(/;
/** ⛔ The ONE exemption, with its reason. It may only SHRINK: a second entry is a second path, argued in review. */
const EXEMPT: Record<string, { allowed: RegExp; why: string }> = {
  "app/api/dev-test/marketing-contacts-seed/route.ts": {
    allowed: /\bdb\.marketingContact\.count\(\)/g,
    why: "the dev seed reports the book's size after seeding — 404 in production (test:cert-devroutes)",
  },
};
const NS = "(?:marketingContact|contactListMember|contactList)";
const ALIASES: RegExp[] = [
  new RegExp(`[=(,:?]\\s*db\\.${NS}\\b(?!\\s*[.\\w])`),          // `const book = db.marketingContact;`, `f(db.marketingContact)`
  new RegExp(`\\{[^{}]*\\b${NS}\\b[^{}]*\\}\\s*=\\s*db\\b`),      // `const { marketingContact } = db;`
  new RegExp(`\\bdb\\s*\\[\\s*["'\`]${NS}["'\`]\\s*\\]`),         // `db["marketingContact"]`
  new RegExp(`\\bdb\\.${NS}\\s*\\[`),                             // `db.marketingContact[name]`
];
/** A Prisma delegate on the book's tables, reached by anything but `db.` (pc(), prisma()!, a transaction's tx). */
const PRISMA_DIRECT = new RegExp(`(?<!\\bdb)\\.${NS}\\.\\w+\\s*\\(`);
const MEMORY_MAPS = /\.(marketingContacts|contactListMembers|contactsByMsisdn|contactLists)\b/;
const RAW_SQL = /\$(?:queryRaw|executeRaw)(?:Unsafe)?[\s\S]{0,600}?"(?:MarketingContact|ContactList|ContactListMember)"/;
const NDC_LITERAL = /\[\s*["'][67]\d["']\s*,\s*["'][67]\d["']/;

type Scan = {
  files: number;
  setReaders: string[];
  aliases: string[];
  direct: string[];
  readers: string[];
  whereNamers: string[];
  translators: string[];
  ndcLiterals: string[];
};
function scan(files: Map<string, string>): Scan {
  const out: Scan = { files: files.size, setReaders: [], aliases: [], direct: [], readers: [], whereNamers: [], translators: [], ndcLiterals: [] };
  for (const [path, src] of files) {
    const twin = TWINS.has(path);
    if (!twin) {
      const ex = EXEMPT[path];
      if (SET_READERS.test(ex ? src.replace(ex.allowed, "") : src)) out.setReaders.push(path);
      if (ALIASES.some((re) => re.test(src))) out.aliases.push(path);
    }
    if (path !== PRISMA_DAL && (PRISMA_DIRECT.test(src) || RAW_SQL.test(src))) out.direct.push(path);
    if (path !== STORE && MEMORY_MAPS.test(src)) out.direct.push(path);
    if (path !== RESOLVER && /\b(?:contactAudience|contactTagCounts)\b/.test(src)) out.readers.push(path);
    if (!twin && path !== RESOLVER && /\bContactAudienceWhere\b/.test(src)) out.whereNamers.push(path);
    if (path !== RESOLVER && /\b(?:toAudienceWhere|contactsSearch)\b/.test(src)) out.translators.push(path);
    if ((path === RESOLVER || path.startsWith("app/admin/contacts/")) && NDC_LITERAL.test(src)) out.ndcLiterals.push(path);
  }
  for (const k of ["setReaders", "aliases", "direct", "readers", "whereNamers", "translators", "ndcLiterals"] as const) out[k] = [...new Set(out[k])].sort();
  return out;
}
const withFile = (path: string, src: string) => new Map([...REAL_FILES, [path, src]]);
/** One file alone — what a CONTROL needs (scanning 16 MB of src/ per control, per red case, is wasted work). */
const only = (path: string, src: string) => new Map([[path, src]]);
/** The real tree is scanned ONCE; a red case that plants a file scans its own copy. */
let realScan: Scan | null = null;
const scanOf = (files: Map<string, string>): Scan => (files === REAL_FILES ? (realScan ??= scan(REAL_FILES)) : scan(files));

/* ═══ §2 · THE FIXTURE — ten rows, through the store method the importers will call ═══════════ */

function contact(id: string, local: string, o: Partial<StoredMarketingContact> & { createdAt: string }): StoredMarketingContact {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`fixture ${local} does not parse`);
  return {
    id, msisdn: p.msisdn, rawInput: local, displayName: null, email: null, ndc: p.ndc, operator: null,
    source: "IMPORT", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null,
    tags: [], notes: null, importId: null, createdBy: null, updatedAt: o.createdAt, updatedBy: null, ...o,
  };
}
const FIXTURE: StoredMarketingContact[] = [
  contact("a01", "0712345678", { displayName: "Asha Mwakalinga", consentState: "GIVEN", importId: "imp_1", tags: ["vip"], createdAt: "2026-09-01T07:00:00.000Z" }),
  contact("a02", "0754000111", { displayName: "Baraka Juma", suppressedAt: "2026-09-02T21:00:00.000Z", source: "OPERATOR", tags: ["dar"], createdAt: "2026-09-02T20:59:00.000Z" }),
  contact("a03", "0791000222", { displayName: "Neema Kileo", consentState: "GIVEN", source: "REGISTRATION", userId: "u_neema", createdAt: "2026-09-02T21:00:00.000Z" }),
  contact("a04", "0713000333", { displayName: "Asha Mwakalinga", importId: "imp_1", tags: ["vip", "dar"], createdAt: "2026-09-04T07:00:00.000Z" }),
  contact("a05", "0621000444", { consentState: "WITHDRAWN", source: "AGENT", createdAt: "2026-09-05T20:59:00.000Z" }),
  contact("a06", "0688000555", { displayName: "Juma Hassan", importId: "imp_2", tags: ["weekend"], createdAt: "2026-09-05T21:00:00.000Z" }),
  contact("a07", "0655000666", { displayName: "Rehema Said", consentState: "GIVEN", source: "OPERATOR", suppressedAt: "2026-09-07T08:00:00.000Z", createdAt: "2026-09-07T07:00:00.000Z" }),
  contact("a08", "0781000888", { displayName: "Zawadi Ally", consentState: "WITHDRAWN", source: "REGISTRATION", userId: "u_zawadi", createdAt: "2026-09-08T07:00:00.000Z" }),
  contact("a09", "0611000999", { displayName: "Faraja Mushi", createdAt: "2026-09-09T07:00:00.000Z" }),
  // ⛔ THE ERASED TOMBSTONE (`sourceRef = ERASURE_EVIDENCE`). It is planted to MATCH as many predicates as it can —
  // Honora 077, WITHDRAWN, inside the window, list 1, imp_1, even a "vip" tag erasure would have emptied — so every
  // test that finds it absent is a test of the exclusion, not of a predicate that happened to miss it.
  contact("a10", "0776000123", { consentState: "WITHDRAWN", sourceRef: ERASURE_EVIDENCE, importId: "imp_1", tags: ["vip"], createdAt: "2026-09-03T07:00:00.000Z" }),
];
for (const c of FIXTURE) await db.marketingContact.create(c);
for (const [id, name] of [["lst_1", "Fixture list one"], ["lst_2", "Fixture list two"]]) {
  await db.contactList.create({ id, name, description: null, createdAt: "2026-09-01T00:00:00.000Z", createdBy: null, updatedAt: "2026-09-01T00:00:00.000Z", updatedBy: null });
}
for (const [listId, contactId] of [["lst_1", "a01"], ["lst_1", "a05"], ["lst_1", "a10"], ["lst_2", "a03"], ["lst_2", "a05"]]) {
  await db.contactListMember.add({ listId, contactId, addedAt: "2026-09-10T00:00:00.000Z", addedBy: null });
}
const VISIBLE = ["a01", "a02", "a03", "a04", "a05", "a06", "a07", "a08", "a09"];
const WHOLE_BOOK_COUNTS = { total: 9, given: 3, unknown: 4, withdrawn: 2, suppressed: 2 };
/** A fixed clock for the relative-window cases. */
const NOW = Date.parse("2026-10-01T09:30:15.000Z");

/** The memory map, reached ONLY to take §4's late row back out (the store has no delete for a contact, by design). */
const memoryStore = (globalThis as { __50PICK_STORE?: { marketingContacts: Map<string, unknown>; contactsByMsisdn: Map<string, string> } }).__50PICK_STORE;

/* ═══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═══════════ */

type Reader = { name: string; total: (f: ContactAudienceFilter, a: ContactAudience) => Promise<number | null> };
type Impl = {
  files: Map<string, string>;
  linkKeys: readonly string[];
  audience: (f: ContactAudienceFilter) => ContactAudience;
  parse: typeof parseContactAudienceParams;
  parseJson: typeof parseContactAudienceJson;
  key: typeof contactAudienceKey;
  audit: typeof auditContactAudience;
  describe: typeof describeAudience;
  readers: Reader[];
};

const F = (patch: Partial<ContactAudienceFilter>): ContactAudienceFilter => ({ ...WHOLE_BOOK, ...patch });
/** A parse that must succeed. A refusal becomes a filter that matches nothing real, so the assertion using it fails
 *  on its own label instead of the run crashing. */
const must = (r: AudienceParse): ContactAudienceFilter => (r.ok ? r.filter : F({ q: `REFUSED ${r.param}` }));
const sorted = (xs: string[]) => [...xs].sort().join(",");

async function walkAll(a: ContactAudience, limit: number, afterFirst?: () => Promise<void>): Promise<string[]> {
  const seen: string[] = [];
  let after: string | null = null;
  for (let i = 0; i < 200; i++) {
    const w = await a.walk(after, limit);
    seen.push(...w.rows.map((r) => r.id));
    if (i === 0 && afterFirst) await afterFirst();
    if (w.nextAfterId === null) return seen;
    after = w.nextAfterId;
  }
  return [...seen, "NEVER-ENDED"];
}
async function pageUnion(a: ContactAudience, perPage: number): Promise<string[]> {
  const first = await a.page({ sort: "added", dir: "asc", page: "1", perPage });
  const ids = first.rows.map((r) => r.id);
  const pages = Math.max(1, Math.ceil(first.total / perPage));
  for (let p = 2; p <= pages; p++) ids.push(...(await a.page({ sort: "added", dir: "asc", page: String(p), perPage })).rows.map((r) => r.id));
  return ids;
}

const REAL_READERS: Reader[] = [
  {
    name: "the list (loadContacts)",
    total: async (f) => {
      const params = contactAudienceParams(f);
      if (params === null) return null; // a selection is not an address — the list cannot be asked
      const v = await loadContacts(params, { reads: async () => true });
      return v.kind === "ok" ? v.result.total : -1;
    },
  },
  { name: "count()", total: async (_f, a) => a.count() },
  { name: "breakdown().total", total: async (_f, a) => (await a.breakdown()).total },
  { name: "the keyset walk (limit 2)", total: async (_f, a) => (await walkAll(a, 2)).length },
  { name: "the page union (perPage 3)", total: async (_f, a) => (await pageUnion(a, 3)).length },
];

const REAL: Impl = {
  files: REAL_FILES,
  linkKeys: CONTACTS_LINK_KEYS,
  audience: (f) => contactAudience(f),
  parse: parseContactAudienceParams,
  parseJson: parseContactAudienceJson,
  key: contactAudienceKey,
  audit: auditContactAudience,
  describe: describeAudience,
  readers: REAL_READERS,
};

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const ids = async (f: ContactAudienceFilter) =>
    sorted((await impl.audience(f).page({ sort: "added", dir: "asc", page: "1", perPage: 1000 })).rows.map((r) => r.id));
  const viaUrl = async (sp: Record<string, string | string[]>) => {
    const r = impl.parse(sp, NOW);
    return r.ok ? ids(r.filter) : `REFUSED:${r.param}`;
  };

  /* ── §1 · STRUCTURE ───────────────────────────────────────────────────────────────────────── */
  const s = scanOf(impl.files);
  ok(p("1.0 · CONTROL · the scanner reads the whole real src/ tree and finds the resolver as a set-reader caller"),
    s.files > 500 && s.setReaders.includes(RESOLVER), `${s.files} files; callers=[${s.setReaders}]`);
  ok(p("1.1 · ⛔ outside the twins, ONLY audience.ts calls the book's set readers (one declared exemption: the dev seed's count())"),
    s.setReaders.join(",") === RESOLVER, `callers=[${s.setReaders}]`);
  ok(p("1.2 · ⛔ no alias, destructuring or bracket access to the book's namespaces outside the twins"),
    s.aliases.length === 0, `[${s.aliases}]`);
  ok(p("1.3 · ⛔ no direct table access: Prisma delegates and raw SQL only in prisma-dal.ts, the memory maps only in store.ts"),
    s.direct.length === 0, `[${s.direct}]`);
  ok(p("1.4 · the importers of contactAudience in src/ EQUAL the declared READERS"),
    s.readers.join(",") === [...READERS].sort().join(","), `readers=[${s.readers}] declared=[${READERS}]`);
  const resolverSrc = impl.files.get(RESOLVER) ?? "";
  ok(p("1.5 · ⛔ ContactAudienceWhere is named only in the twins and audience.ts; toAudienceWhere and contactsSearch are defined there and called nowhere else"),
    s.whereNamers.length === 0 && s.translators.length === 0
      && /export function toAudienceWhere\(/.test(resolverSrc) && /export function contactsSearch\(/.test(resolverSrc),
    `namers=[${s.whereNamers}] translators=[${s.translators}]`);
  const opsMismatch = (Object.keys(TZ_OPERATORS) as TzOperatorId[]).filter((op) =>
    ndcsForOperators([op]).join(",") !== TZ_MOBILE_NDCS.filter((r) => r.operator === op).map((r) => r.ndc).sort().join(","));
  ok(p("1.6 · ⛔ no hand-typed prefix list in the resolver or the contacts page, and ndcsForOperators equals the ONE table for every operator (EXECUTED)"),
    s.ndcLiterals.length === 0 && opsMismatch.length === 0 && ndcsForOperators(["VODACOM"]).includes("79"),
    `literals=[${s.ndcLiterals}] mismatched=[${opsMismatch}]`);
  const vocab = [...CONTACT_AUDIENCE_URL_KEYS, "sort", "dir"].sort().join(",");
  const linkFilter = F({ q: "asha", operators: ["AIRTEL", "VODACOM"], consent: ["GIVEN"], tags: ["vip"], lists: ["lst_1"], sources: ["IMPORT"], suppressed: false, player: true, importId: "imp_1", addedFrom: "2026-09-02T21:00:00.000Z", addedBefore: "2026-09-05T21:00:00.000Z" });
  const linkParams = contactAudienceParams(linkFilter) ?? {};
  const linked = new URL(`http://x${contactsHref(linkParams)}`).searchParams;
  const reread = impl.parse(Object.fromEntries(linked.entries()), NOW);
  ok(p("1.7 · the page's link keys EQUAL the parser's vocabulary (+ sort, dir), and a link built by contactsHref reads back to the same filter (EXECUTED)"),
    [...impl.linkKeys].sort().join(",") === vocab && reread.ok && contactAudienceKey(reread.filter) === contactAudienceKey(linkFilter),
    `links=[${[...impl.linkKeys].sort()}] parser=[${vocab}]`);

  // ── CONTROLS · each proves the assertion above it can reject ──
  ok(p("1.c1 · CONTROL · a synthetic file calling db.marketingContact.page( is flagged"),
    scan(only("app/x/route.ts", "await db.marketingContact.page({ where, sort, dir, offset: 0, limit: 5 });")).setReaders.includes("app/x/route.ts"));
  ok(p("1.c2 · CONTROL · an aliased namespace is flagged"),
    scan(only("app/x/route.ts", "const book = db.marketingContact;\nawait book.walk(q);")).aliases.includes("app/x/route.ts"));
  ok(p("1.c3 · CONTROL · a direct Prisma delegate is flagged"),
    scan(only("app/x/route.ts", "await pc().marketingContact.findMany({ where });")).direct.includes("app/x/route.ts"));
  ok(p("1.c4 · CONTROL · an undeclared contactAudience importer is flagged"),
    scan(only("app/x/route.ts", 'import { contactAudience } from "@/lib/server/marketing/audience";')).readers.includes("app/x/route.ts"));
  ok(p("1.c5 · CONTROL · the exemption is narrow — the dev seed's count() passes, but the dev seed calling page( IS flagged"),
    scan(only("app/api/dev-test/marketing-contacts-seed/route.ts", "await db.marketingContact.count();")).setReaders.length === 0
      && scan(only("app/api/dev-test/marketing-contacts-seed/route.ts", "await db.marketingContact.count();\nawait db.marketingContact.page(q);"))
        .setReaders.includes("app/api/dev-test/marketing-contacts-seed/route.ts"));

  /* ── §2 · BEHAVIOUR on the memory twin ─────────────────────────────────────────────────────── */
  ok(p("2.0 · CONTROL · the ten fixture rows are in the book (nine visible, one tombstone)"), (await db.marketingContact.count()) === 10);

  const spellings = ["0712 345 678", "712345678", "+255712345678", "255712345678"];
  const found: string[] = [];
  for (const q of spellings) found.push(await ids(F({ q })));
  const partWhere = toAudienceWhere(F({ q: "0712345" }));
  ok(p("2.1 · ⭐ the four spellings of one number each find EXACTLY that contact; a PART of a number is no number search and finds nothing"),
    found.every((f) => f === "a01") && partWhere.msisdn === null && (await impl.audience(F({ q: "0712345" })).count()) === 0,
    found.join(" | "));
  ok(p("2.2 · ⭐ op=VODACOM is exactly the 075 and the 079 rows — never Honora's 071; the 079 is what a hand-typed list misses"),
    (await viaUrl({ op: "VODACOM" })) === "a02,a03", await viaUrl({ op: "VODACOM" }));
  ok(p("2.3 · lists are any-of, through ContactListMember"),
    (await viaUrl({ list: "lst_1" })) === "a01,a05" && (await viaUrl({ list: "lst_1,lst_2" })) === "a01,a03,a05");
  ok(p("2.4 · tags are any-of, and a tag is read in its stored (lowercase) form"),
    (await viaUrl({ tag: "vip" })) === "a01,a04" && (await viaUrl({ tag: ["VIP", "weekend"] })) === "a01,a04,a06");
  ok(p("2.5 · consent is the recorded state (the cache), any-of"),
    (await viaUrl({ consent: "GIVEN" })) === "a01,a03,a07" && (await viaUrl({ consent: "withdrawn" })) === "a05,a08");
  ok(p("2.6 · suppressed yes / no"),
    (await viaUrl({ suppressed: "yes" })) === "a02,a07" && (await viaUrl({ suppressed: "no" })) === "a01,a03,a04,a05,a06,a08,a09");
  ok(p("2.7 · source is any-of"),
    (await viaUrl({ source: "REGISTRATION" })) === "a03,a08" && (await viaUrl({ source: "AGENT,OPERATOR" })) === "a02,a05,a07");
  ok(p("2.8 · player = linked to an account (userId), yes / no"),
    (await viaUrl({ player: "yes" })) === "a03,a08" && (await viaUrl({ player: "no" })) === "a01,a02,a04,a05,a06,a07,a09");
  ok(p("2.9 · import narrows to one import"), (await viaUrl({ import: "imp_1" })) === "a01,a04");
  ok(p("2.10 · ⭐ the added window: from INCLUSIVE, before EXCLUSIVE, and a date-only `to` covers that whole EAT day"),
    (await viaUrl({ from: "2026-09-03", to: "2026-09-05" })) === "a03,a04,a05"
      && (await viaUrl({ from: "2026-09-03T00:00", to: "2026-09-06T00:00" })) === "a03,a04,a05",
    await viaUrl({ from: "2026-09-03", to: "2026-09-05" }));
  ok(p("2.11 · AND across predicates: op=VODACOM & consent=GIVEN is the 079 GIVEN row alone"),
    (await viaUrl({ op: "VODACOM", consent: "GIVEN" })) === "a03");

  const empties: ContactAudienceFilter[] = [F({ ids: [] }), F({ consent: [] }), F({ operators: [] }), F({ lists: [] }), F({ tags: [] }), F({ sources: [] })];
  const emptyAnswers: string[] = [];
  for (const f of empties) {
    const a = impl.audience(f);
    const b = await a.breakdown();
    emptyAnswers.push(`${await a.count()}/${(await a.page({ sort: "added", dir: "desc", page: "1", perPage: 20 })).total}/${b.total + b.given + b.unknown + b.withdrawn + b.suppressed}/${(await a.walk(null, 50)).rows.length}`);
  }
  ok(p("2.12 · ⛔ AN EMPTY ARRAY IS NOTHING — count 0, an empty page, zero counts and an empty walk, for every any-of axis"),
    emptyAnswers.every((x) => x === "0/0/0/0"), emptyAnswers.join(" | "));

  const book = impl.audience(WHOLE_BOOK);
  const walked = await walkAll(book, 4);
  const tagCounts = await contactTagCounts();
  ok(p("2.13 · ⛔ the erased tombstone is in NO reader — the whole book, count, breakdown, the walk, a selection, and a whole-number search for its own key"),
    (await book.count()) === 9 && (await book.breakdown()).total === 9 && sorted(walked) === VISIBLE.join(",")
      && (await impl.audience(F({ q: "0776000123" })).count()) === 0 && (await ids(F({ ids: ["a01", "a10"] }))) === "a01"
      && (await viaUrl({ op: "HONORA" })) === "a01,a04,a07" && (await viaUrl({ tag: "vip" })) === "a01,a04",
    `count=${await book.count()} walked=${sorted(walked)}`);
  ok(p("2.13b · the tag counts are the visible book's: distinct tags, a contact once per tag, most-carried first — the tombstone's tag is not counted"),
    JSON.stringify(tagCounts) === JSON.stringify([{ tag: "dar", count: 2 }, { tag: "vip", count: 2 }, { tag: "weekend", count: 1 }]),
    JSON.stringify(tagCounts));

  const refusals: Array<[string, AudienceParse, string]> = [
    ["op=NOKIA", impl.parse({ op: "NOKIA" }, NOW), "op"],
    ["op=Yas (a brand, not an operator id)", impl.parse({ op: "Yas" }, NOW), "op"],
    ["consent=MAYBE", impl.parse({ consent: "MAYBE" }, NOW), "consent"],
    ["source=X", impl.parse({ source: "X" }, NOW), "source"],
    ["suppressed=perhaps", impl.parse({ suppressed: "perhaps" }, NOW), "suppressed"],
    ["player=maybe", impl.parse({ player: "maybe" }, NOW), "player"],
    ["tag=bad!", impl.parse({ tag: "bad!" }, NOW), "tag"],
    ["range=forever", impl.parse({ range: "forever" }, NOW), "range"],
    ["from=2026-13-40", impl.parse({ from: "2026-13-40" }, NOW), "from"],
    ["from after to", impl.parse({ from: "2026-09-10", to: "2026-09-01" }, NOW), "from"],
    ["ids in an address", impl.parse({ ids: "a01" }, NOW), "ids"],
    ["more than MAX_AUDIENCE_IDS ids in JSON", impl.parseJson({ ids: Array.from({ length: MAX_AUDIENCE_IDS + 1 }, (_, i) => `c${i}`) }), "ids"],
    ["an unknown key in JSON", impl.parseJson({ operators: ["VODACOM"], reachable: true }), "reachable"],
    ["an unknown operator in JSON", impl.parseJson({ operators: ["NOKIA"] }), "operators"],
  ];
  const leaked = refusals.filter(([, r, param]) => r.ok || r.param !== param).map(([name]) => name);
  const ignored = impl.parse({ sort: "name", dir: "asc", page: "2", utm_source: "x" }, NOW);
  ok(p("2.14 · ⛔ an unknown VALUE refuses, naming its key — never a silent drop; sort, dir, page and an unknown KEY are ignored in an address"),
    leaked.length === 0 && ignored.ok && contactAudienceKey(ignored.filter) === contactAudienceKey(WHOLE_BOOK),
    leaked.length ? `leaked: ${leaked.join(" | ")}` : "");

  const k1 = impl.key(must(impl.parse({ op: "vodacom,AIRTEL", consent: ["given", "GIVEN"], q: "0712 345 678", tag: "VIP" }, NOW)));
  const k2 = impl.key(must(impl.parse({ op: ["AIRTEL", "VODACOM"], consent: "GIVEN", q: "+255712345678", tag: "vip" }, NOW)));
  const back = impl.parseJson(JSON.parse(k1));
  const rel = impl.parse({ range: "7d" }, NOW);
  const relKey = rel.ok ? impl.key(rel.filter) : "";
  const relJson = relKey ? (JSON.parse(relKey) as Record<string, unknown>) : {};
  const roundTrips = ONE_COUNT.filter((c) => urlExpressible(c.f)).map((c) => {
    const params = contactAudienceParams(c.f);
    const again = params === null ? null : impl.parse(params, NOW);
    return again !== null && again.ok && contactAudienceKey(again.filter) === contactAudienceKey(c.f) ? null : c.name;
  }).filter((x) => x !== null);
  ok(p("2.15 · ⭐ one filter, one key: case, order and repeats collapse; the key reads back through the JSON parser; range=7d is stored as ABSOLUTE bounds; every URL-expressible filter round-trips through its address"),
    k1 === k2 && back.ok && impl.key(back.filter) === k1
      && !relKey.includes("range") && !relKey.includes("7d")
      && relJson.addedFrom === "2026-09-24T09:30:00.000Z" && relJson.addedBefore === "2026-10-01T09:31:00.000Z"
      && roundTrips.length === 0 && contactAudienceParams(F({ ids: ["a01"] })) === null && contactAudienceParams(F({ tags: [] })) === null,
    `${k1} | ${relKey} | not round-tripping: [${roundTrips}]`);

  /* ── §3 · ⭐ ONE COUNT ─────────────────────────────────────────────────────────────────────── */
  const bad: string[] = [];
  for (const c of ONE_COUNT) {
    const a = impl.audience(c.f);
    const totals: Array<[string, number | null]> = [];
    for (const r of impl.readers) totals.push([r.name, await r.total(c.f, a)]);
    const asked = totals.filter(([, t]) => t !== null) as Array<[string, number]>;
    const walkIds = await walkAll(a, 2);
    const unionIds = await pageUnion(a, 3);
    const same = asked.every(([, t]) => t === c.expect) && sorted(walkIds) === sorted(unionIds) && new Set(walkIds).size === walkIds.length;
    if (!same) bad.push(`${c.name}: ${asked.map(([n, t]) => `${n}=${t}`).join(", ")} (expect ${c.expect})`);
  }
  ok(p("3 · ⭐ ONE COUNT — for every filter the list, count(), breakdown(), the keyset walk and the page union are one number, and walk = union"),
    bad.length === 0, bad.join(" | "));
  const kpiView = await loadContacts({ op: "VODACOM" }, { reads: async () => true });
  const kpiBook = await impl.audience(WHOLE_BOOK).breakdown();
  ok(p("3.kpi · the list's KPI band IS contactAudience(WHOLE_BOOK).breakdown(), and it leaves the tombstone out"),
    JSON.stringify(kpiView.summary) === JSON.stringify(kpiBook) && JSON.stringify(kpiBook) === JSON.stringify(WHOLE_BOOK_COUNTS),
    `${JSON.stringify(kpiView.summary)} vs ${JSON.stringify(kpiBook)}`);
  const clamp = await loadContacts({ op: "VODACOM", page: "99" }, { reads: async () => true });
  ok(p("3.clamp · ?op=VODACOM&page=99 renders the clamped page's rows, never \"no matches\""),
    clamp.kind === "ok" && clamp.page === 1 && clamp.result.rows.length === 2, clamp.kind === "ok" ? `page ${clamp.page}` : clamp.kind);

  /* ── §4 · THE KEYSET WALK ─────────────────────────────────────────────────────────────────── */
  const late = contact("a015", "0712000015", { displayName: "Late Row", createdAt: "2026-09-01T12:00:00.000Z" });
  let visited: string[] = [];
  try {
    visited = await walkAll(impl.audience(WHOLE_BOOK), 2, async () => { await db.marketingContact.create(late); });
  } finally {
    memoryStore?.marketingContacts.delete(late.id);
    memoryStore?.contactsByMsisdn.delete(late.msisdn);
  }
  const originals = visited.filter((id) => id !== late.id);
  ok(p("4.1 · ⭐ a row written BEFORE the cursor between two calls: every original row is visited exactly once, no duplicate, and the walk ends"),
    sorted(originals) === VISIBLE.join(",") && originals.length === VISIBLE.length && !visited.includes("NEVER-ENDED"),
    visited.join(","));
  const one = await impl.audience(WHOLE_BOOK).walk(null, 0);
  const nan = await impl.audience(WHOLE_BOOK).walk(null, Number.NaN);
  ok(p("4.2 · the walk's limit is clamped — 0 or NaN reads one row, and says there is more"),
    one.rows.length === 1 && one.nextAfterId === one.rows[0]?.id && nan.rows.length === 1 && (await db.marketingContact.count()) === 10);

  /* ── §5 · THE AUDIT AND DESCRIBE FORMS NEVER PRINT A NUMBER ───────────────────────────────── */
  const byNumber = F({ q: "0712 345 678" });
  const numberForms = JSON.stringify(impl.audit(byNumber)) + JSON.stringify(impl.describe(byNumber));
  const byName = F({ q: "Asha" });
  const nameAudit = JSON.stringify(impl.audit(byName));
  const picked = impl.audit(F({ ids: ["a01", "a03"] }));
  ok(p("5.1 · ⛔ a whole-number filter is +255••••78 in the audit and the description — never the 255… key or the nine national digits; a name is its length only; a selection a count"),
    numberForms.includes("+255••••78") && !/\b255\d{9}\b/.test(numberForms) && !numberForms.includes("712345678")
      && !/asha/i.test(nameAudit) && nameAudit.includes("name search (4 characters)")
      && picked.selected === 2 && !JSON.stringify(picked).includes("a01"),
    `${numberForms} | ${nameAudit} | ${JSON.stringify(picked)}`);
  const words = impl.describe(F({ operators: ["VODACOM"], consent: ["GIVEN"] }));
  const windowWords = impl.describe(must(impl.parse({ from: "2026-09-03", to: "2026-09-05" }, NOW)));
  ok(p("5.2 · describeAudience says each predicate in words — brands from the table, the window as the EAT days it covers"),
    JSON.stringify(words) === JSON.stringify(["Operator: Vodacom", "Consent: given"])
      && JSON.stringify(windowWords) === JSON.stringify(["Added 3 Sep 2026 → 5 Sep 2026"])
      && JSON.stringify(impl.describe(F({ q: "asha" }))) === JSON.stringify(["Name contains “asha”"]),
    `${JSON.stringify(words)} ${JSON.stringify(windowWords)}`);
}

/** ⭐ THE ONE-COUNT TABLE — about a dozen filters, URL-expressible and not. */
const ONE_COUNT: Array<{ name: string; f: ContactAudienceFilter; expect: number }> = [
  { name: "whole book", f: WHOLE_BOOK, expect: 9 },
  { name: "name", f: F({ q: "asha" }), expect: 2 },
  { name: "number", f: F({ q: "255712345678" }), expect: 1 },
  { name: "op", f: F({ operators: ["VODACOM"] }), expect: 2 },
  { name: "op+consent", f: F({ operators: ["VODACOM"], consent: ["GIVEN"] }), expect: 1 },
  { name: "list", f: F({ lists: ["lst_1"] }), expect: 2 },
  { name: "tag", f: F({ tags: ["vip"] }), expect: 2 },
  { name: "player", f: F({ player: true }), expect: 2 },
  { name: "import", f: F({ importId: "imp_1" }), expect: 2 },
  { name: "window", f: F({ addedFrom: "2026-09-02T21:00:00.000Z", addedBefore: "2026-09-05T21:00:00.000Z" }), expect: 3 },
  { name: "ids-selection", f: F({ ids: ["a01", "a03", "a10"] }), expect: 2 },
  { name: "ids []", f: F({ ids: [] }), expect: 0 },
];

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`\ncontacts-audience: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline: ${pass} passed, ${fail} failed\n`);

  const LABEL = {
    l11: "1.1 · ⛔ outside the twins, ONLY audience.ts calls the book's set readers (one declared exemption: the dev seed's count())",
    l12: "1.2 · ⛔ no alias, destructuring or bracket access to the book's namespaces outside the twins",
    l13: "1.3 · ⛔ no direct table access: Prisma delegates and raw SQL only in prisma-dal.ts, the memory maps only in store.ts",
    l14: "1.4 · the importers of contactAudience in src/ EQUAL the declared READERS",
    l15: "1.5 · ⛔ ContactAudienceWhere is named only in the twins and audience.ts; toAudienceWhere and contactsSearch are defined there and called nowhere else",
    l17: "1.7 · the page's link keys EQUAL the parser's vocabulary (+ sort, dir), and a link built by contactsHref reads back to the same filter (EXECUTED)",
    l21: "2.1 · ⭐ the four spellings of one number each find EXACTLY that contact; a PART of a number is no number search and finds nothing",
    l22: "2.2 · ⭐ op=VODACOM is exactly the 075 and the 079 rows — never Honora's 071; the 079 is what a hand-typed list misses",
    l212: "2.12 · ⛔ AN EMPTY ARRAY IS NOTHING — count 0, an empty page, zero counts and an empty walk, for every any-of axis",
    l213: "2.13 · ⛔ the erased tombstone is in NO reader — the whole book, count, breakdown, the walk, a selection, and a whole-number search for its own key",
    l214: "2.14 · ⛔ an unknown VALUE refuses, naming its key — never a silent drop; sort, dir, page and an unknown KEY are ignored in an address",
    l215: "2.15 · ⭐ one filter, one key: case, order and repeats collapse; the key reads back through the JSON parser; range=7d is stored as ABSOLUTE bounds; every URL-expressible filter round-trips through its address",
    l3: "3 · ⭐ ONE COUNT — for every filter the list, count(), breakdown(), the keyset walk and the page union are one number, and walk = union",
    l3kpi: "3.kpi · the list's KPI band IS contactAudience(WHOLE_BOOK).breakdown(), and it leaves the tombstone out",
    l41: "4.1 · ⭐ a row written BEFORE the cursor between two calls: every original row is visited exactly once, no duplicate, and the walk ends",
    l51: "5.1 · ⛔ a whole-number filter is +255••••78 in the audit and the description — never the 255… key or the nine national digits; a name is its length only; a selection a count",
  };

  /** U20's loader, as it shipped before the resolver — straight at the store's page and summary. */
  const U20_LOADER = [
    'import { db } from "@/lib/server/store";',
    'import { contactsSearch, CONTACT_SORTS } from "./contacts-query";',
    "export async function loadContacts(sp, search = contactsSearch) {",
    "  const query = search(sp.q);",
    "  const summary = await db.marketingContact.summary();",
    "  const read = (page) => db.marketingContact.page({ ...query, sort, dir, offset: (page - 1) * PER_PAGE, limit: PER_PAGE });",
    "  return { summary, result: await read(1) };",
    "}",
  ].join("\n");
  const planted = (toWhere: typeof toAudienceWhere) => (f: ContactAudienceFilter) => contactAudience(f, toWhere);

  const CASES: Array<{ name: string; expect: string[]; impl: Impl }> = [
    {
      name: "R1 · a second query path: an export draft pages the book itself",
      expect: [LABEL.l11],
      impl: { ...REAL, files: withFile("app/admin/contacts/export-draft.ts", "export async function draft(where, sort, dir) {\n  return db.marketingContact.page({ where, sort, dir, offset: 0, limit: 50 });\n}") },
    },
    {
      name: "R2 · the aliased namespace",
      expect: [LABEL.l12],
      impl: { ...REAL, files: withFile("app/admin/contacts/export-draft.ts", "const book = db.marketingContact;\nexport const go = (q) => book.walk(q);") },
    },
    {
      name: "R3 · direct Prisma on the book's table",
      expect: [LABEL.l13],
      impl: { ...REAL, files: withFile("app/api/admin/contacts-count/route.ts", "export async function GET() {\n  return Response.json(await prisma()!.marketingContact.count({ where }));\n}") },
    },
    {
      name: "R4 · the loader bypasses the resolver (U20's original, straight at page()/summary())",
      expect: [LABEL.l11, LABEL.l14],
      impl: { ...REAL, files: withFile(LOADER, U20_LOADER) },
    },
    {
      name: "R5 · a second translator: a file building its own ContactAudienceWhere",
      expect: [LABEL.l15],
      impl: { ...REAL, files: withFile("app/admin/contacts/export-draft.ts", "import type { ContactAudienceWhere } from \"@/lib/server/store\";\nconst w: ContactAudienceWhere = { msisdn: null, name: null } as never;") },
    },
    {
      name: "R6 · the number normalisation dropped — the box's digits are used as typed (moved from contacts-page red 1)",
      expect: [LABEL.l21],
      impl: { ...REAL, audience: planted((f) => toAudienceWhere(f, { ...AUDIENCE_DEPS, search: (raw) => ({ msisdn: String(raw ?? "").replace(/\D/g, ""), name: null }) })) },
    },
    {
      name: "R7 · a hand-typed brand list — Vodacom without its 79",
      expect: [LABEL.l22],
      impl: { ...REAL, audience: planted((f) => toAudienceWhere(f, { ...AUDIENCE_DEPS, ndcsFor: () => ["72", "74", "75", "76"] })) },
    },
    {
      name: "R8 · an empty selection widens — [] read as no constraint",
      expect: [LABEL.l212],
      impl: { ...REAL, audience: planted((f) => { const w = toAudienceWhere(f); return { ...w, ids: w.ids !== null && w.ids.length === 0 ? null : w.ids }; }) },
    },
    {
      name: "R9 · the parser drops an unknown value instead of refusing",
      expect: [LABEL.l214],
      impl: { ...REAL, parse: (sp, now) => { const r = parseContactAudienceParams(sp, now); return !r.ok && r.param === "op" ? parseContactAudienceParams({ ...sp, op: undefined }, now) : r; } },
    },
    {
      name: "R10 · a relative window stored — the key keeps range: 7d",
      expect: [LABEL.l215],
      impl: { ...REAL, key: (f) => (f.addedFrom !== null && f.q === null && f.operators === null ? JSON.stringify({ range: "7d" }) : contactAudienceKey(f)) },
    },
    {
      name: "R11 · a count from another path — the whole book's total stands in for the filter's",
      expect: [LABEL.l3],
      impl: { ...REAL, readers: REAL_READERS.map((r) => (r.name === "count()" ? { ...r, total: async () => (await db.marketingContact.summaryWhere(toAudienceWhere(WHOLE_BOOK))).total } : r)) },
    },
    {
      name: "R12 · an offset walk — page offsets instead of a keyset",
      expect: [LABEL.l41],
      impl: {
        ...REAL,
        audience: (f) => {
          const a = contactAudience(f);
          return {
            ...a,
            walk: async (after, limit) => {
              const offset = after === null ? 0 : Number(after);
              const pg = await db.marketingContact.page({ where: toAudienceWhere(f), sort: "added", dir: "asc", offset, limit: Math.max(1, limit) });
              return { rows: pg.rows, nextAfterId: offset + Math.max(1, limit) < pg.total ? String(offset + Math.max(1, limit)) : null };
            },
          };
        },
      },
    },
    {
      name: "R13 · the audit leaks the number — the raw key written as the search",
      expect: [LABEL.l51],
      impl: { ...REAL, audit: (f) => ({ ...auditContactAudience(f), q: f.q === null ? "" : (AUDIENCE_DEPS.search(f.q).msisdn ?? f.q) }) },
    },
    {
      name: "R14 · erased rows counted — the exclusion dropped from the where",
      expect: [LABEL.l213, LABEL.l3kpi],
      impl: { ...REAL, audience: planted((f) => ({ ...toAudienceWhere(f), excludeSourceRef: null })) },
    },
    {
      name: "R16 · the page's href vocabulary drifts from the parser's — `player` no longer carried by links",
      expect: [LABEL.l17],
      impl: { ...REAL, linkKeys: CONTACTS_LINK_KEYS.filter((k) => k !== "player") },
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    const missing = c.expect.filter((e) => !failed.includes(`${tag}${e}`));
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (missing.length) problems.push(`case ${i + 1} (${c.name}): red, but not on "${missing.join(" & ")}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect.join(" & ")}\n`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
