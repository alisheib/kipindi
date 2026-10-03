/**
 * test:contacts-page — U20's guard: the contact book's list at /admin/contacts. U24: the address's filters.
 * U21: the filter rail.
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script: the REAL loader (`contacts-loader.ts`,
 * the one the page calls) over the memory twin — the four spellings of one number, a part of a number, a
 * name, the page clamp, the whole-book KPIs, both sorts and their tiebreak, and (U24) a filter in the address,
 * an unreadable filter refused, D19's player filter refused to a masked viewer. Then the source, for what only
 * the source can show: every number through `<Sensitive field="contactPhone">` (U19), the "Reachable" column
 * never naming a player's protected standing, every link built by the ONE href builder.
 * ⭐ U21 · THE RAIL, driven through the REAL rail builder (`contacts-rail.ts`, the one the page calls) over the
 * loader's own options: the model with nothing applied, the operator options against the ONE numbering table (and
 * every operator pill FOLLOWED through the loader), every pill's href (the search and the sort kept, never `page`),
 * an applied value always drawn (a tag past the top twenty, an unknown list, Telxer, two values, a refused value),
 * the error path drawing the rail from the address, a tag count shown only where it is true, the ROLE-SHAPED rail
 * (A1.1 — a masked viewer is drawn no Consent or Source axis and its `?source=`/`?consent=` read no row), and, from
 * the source, the rail surviving no-match, the Operator column reading the one table, the rail file's shape and its
 * filter-language declaration, and the one vocabulary (C13).
 * 🔴 OD54 · THE STOP IS A READER'S, DRIVEN where it can run: `roleRefusal` refuses `suppressed` to a masked viewer and
 * allows it to a reader, the REAL loader refuses a masked `?suppressed=` by role with no row read (13b), the masked rail
 * is Operator · List · Tag (13), the masked band's second fact is the whole book's contacts added in the last 7 days at
 * the loader's one clock (5b) — and, from the source, no per-row stop signal reaches a masked viewer (9h).
 *
 * ⛔ A PART OF A NUMBER NEVER SEARCHES THE NUMBER. GROWTH sees every number masked; a substring search on
 * `msisdn` would let that role rebuild a number digit by digit. §2 holds it here; the twins' exact match
 * (U20's §8/§8b) moved to `test:dal-parity` §21.msisdn with U24, where both translations now live.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY (a loader, a source string, an
 * href builder, a rail builder) and requires the MATCHING assertion to fail. This file makes no file-writing call.
 * §13 counts the book's page reads by wrapping the memory twin's method for one call and putting it back in a
 * `finally` — a store method swapped in memory, never a file.
 * (U20's red case 1 — the search box's normalisation dropped — moved to `red:contacts-audience` R6 with U24,
 * because the normalisation moved into the resolver.)
 *
 * Run:  npm run test:contacts-page
 * Red:  npm run red:contacts-page
 */
process.exitCode = 1;

import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import type { StoredMarketingContact, ContactBookSummary, ContactTagCount, StoredContactList } from "../src/lib/server/store.ts";
import {
  contactsSearch, toAudienceWhere, WHOLE_BOOK, ndcsForOperators, contactAudience, roleRefusal, ROLE_REFUSAL_REASON,
} from "../src/lib/server/marketing/audience.ts";
import type { ContactAudienceFilter } from "../src/lib/server/marketing/audience.ts";
import { contactSelectionRow } from "../src/lib/server/marketing/contact-bulk.ts";
import { operatorBrand, contactsHref, contactsLinkSp, contactsClearFiltersHref } from "../src/app/admin/contacts/contacts-query.ts";
import { loadContacts, contactEditView } from "../src/app/admin/contacts/contacts-loader.ts";
import type { ContactsParams, ContactsView } from "../src/app/admin/contacts/contacts-loader.ts";
import { contactRail, TAG_RAIL_CAP } from "../src/app/admin/contacts/contacts-rail.ts";
import type { ContactRail, RailGroup, RailOption } from "../src/app/admin/contacts/contacts-rail.ts";
import {
  CONSENT_LABEL, SOURCE_LABEL, RAIL_KEYS, RAIL_ANY, RAIL_UNKNOWN_LIST, RAIL_LABEL_MAX, railOperatorTitle,
  CONTACTS_KPI_RECENT, CONTACTS_RECENT_DAYS,
} from "../src/app/admin/contacts/contacts-copy.ts";
import { PER_PAGE } from "../src/components/admin/admin-pagination.tsx";
import { parseTzNumber, TZ_MOBILE_NDCS, TZ_OPERATORS } from "../src/lib/tz-msisdn.ts";
import { DAY_MS } from "../src/lib/query/windows.ts";

const PROVE_RED = process.argv.includes("--prove-red");

const read = (rel: string) => decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8")).replace(/\r\n/g, "\n");
/** ⚠️ RAW, for the filter-language gate: its own regex literals carry bare quotes and backticks, which the comment
 *  stripper (it tracks strings, not regexes) could misread. §16 reads one array out of it, line-anchored instead. */
const rawRead = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

type Sources = { page: string; loader: string; rail: string; model: string; copy: string; gate: string };
const REAL_SOURCES: Sources = {
  page: read("src/app/admin/contacts/page.tsx"),
  loader: read("src/app/admin/contacts/contacts-loader.ts"),
  // ⭐ U21 · the rail's drawing, its model, the one vocabulary, and the gate that must declare the drawing.
  rail: read("src/app/admin/contacts/contact-filters.tsx"),
  model: read("src/app/admin/contacts/contacts-rail.ts"),
  copy: read("src/app/admin/contacts/contacts-copy.ts"),
  gate: rawRead("scripts/filter-language.test.mts"),
};

type Impl = {
  search: typeof contactsSearch;
  /** The page's loader. `reads` is D19's read cell — a script has no session, so it is injected; `now` (OD54) is the
   *  load's one clock, injected so the masked band's seven days are a fixed window. */
  load: (sp: ContactsParams, reads?: boolean, now?: number) => Promise<ContactsView>;
  href: typeof contactsHref;
  /** U21 · the page's rail builder. */
  rail: typeof contactRail;
  /** D19 / A1.1 / OD54 · the ONE role rule every door asks (`audience.ts`). */
  role: typeof roleRefusal;
  sources: Sources;
};
const realLoad = (sp: ContactsParams, reads = false, now?: number) =>
  loadContacts(sp, { reads: async () => reads, ...(now === undefined ? {} : { now: () => now }) });
const REAL: Impl = { search: contactsSearch, load: realLoad, href: contactsHref, rail: contactRail, role: roleRefusal, sources: REAL_SOURCES };

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

/* ── FIXTURES — four contacts, through the store method the importers will call ──────────────── */
function row(
  id: string, local: string, displayName: string | null, consentState: StoredMarketingContact["consentState"], day: number,
  suppressed = false, source: StoredMarketingContact["source"] = "IMPORT", tags: string[] = [],
): StoredMarketingContact {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`fixture ${local} does not parse`);
  const at = `2026-09-0${day}T10:00:00.000Z`;
  return {
    id, msisdn: p.msisdn, rawInput: local, displayName, email: null, ndc: p.ndc, operator: null,
    source, sourceRef: null, userId: null, consentState, suppressedAt: suppressed ? at : null,
    tags, notes: null, importId: null, createdAt: at, createdBy: null, updatedAt: at, updatedBy: null,
  };
}
const A = row("mc_t_a", "0712345678", "Asha Mwakalinga", "GIVEN", 1, false, "IMPORT", ["vip"]);
// ⭐ U21 · B sits on 072 — Vodacom by TCRA v1.16, a prefix that CHANGED HOLDER since the 2020 edition. A hand-typed
// 2020 map (Vodacom 74/75/76/79) cannot reach it, so §12b's Vodacom pill must list exactly B.
const B = row("mc_t_b", "0722000111", "Baraka Juma", "UNKNOWN", 2, true, "OPERATOR", ["vip", "dar"]);
const C = row("mc_t_c", "0621000222", null, "WITHDRAWN", 3, false, "AGENT", []);
const D = row("mc_t_d", "0713000333", "Asha Mwakalinga", "UNKNOWN", 4, false, "IMPORT", ["dar"]);
for (const r of [A, B, C, D]) await db.marketingContact.create(r);
// ⭐ U21 · ONE list, through the DAL the bulk bar will call — D and B are its members.
const L: StoredContactList = {
  id: "cl_t_dar", name: "Dar weekend", description: null,
  createdAt: "2026-09-05T10:00:00.000Z", createdBy: null, updatedAt: "2026-09-05T10:00:00.000Z", updatedBy: null,
};
await db.contactList.create(L);
for (const m of [D, B]) await db.contactListMember.add({ listId: L.id, contactId: m.id, addedAt: "2026-09-05T10:00:00.000Z", addedBy: null });

const WHOLE_BOOK_COUNTS: ContactBookSummary = { total: 4, given: 1, unknown: 2, withdrawn: 1, suppressed: 1 };

/** The rows a view lists, or `REFUSED:<param>` — so a refusal can never read as "no rows". */
const ids = (v: ContactsView) => (v.kind === "ok" ? v.result.rows.map((r) => r.id).join(",") : `REFUSED:${v.param}`);
const total = (v: ContactsView) => (v.kind === "ok" ? v.result.total : -1);

/* ── U21 · THE RAIL'S HELPERS ───────────────────────────────────────────────────────────────── */
const groupOf = (r: ContactRail, param: string): RailGroup | undefined => r.groups.find((g) => g.param === param);
const onOf = (g: RailGroup | undefined): RailOption[] => (g ? g.options.filter((o) => o.on) : []);
const keysOf = (g: RailGroup | undefined) => (g ? g.options.map((o) => o.key).join(",") : "(no group)");
const labelsOf = (g: RailGroup | undefined) => (g ? g.options.map((o) => o.label).join(",") : "(no group)");
const pills = (r: ContactRail) => r.groups.flatMap((g) => g.options.map((o) => ({ ...o, param: g.param })));
const exactlyOneOn = (r: ContactRail) => r.groups.every((g) => g.options.filter((o) => o.on).length === 1);
/** An href back to the params the page would receive. */
const spOf = (href: string): ContactsParams => Object.fromEntries(new URL(href, "http://x").searchParams.entries());
/** An href's query, for asking what it carries. */
const paramsOfHref = (href: string) => new URL(href, "http://x").searchParams;
/** The rail the page builds for this address: the loader's own options, and its count when rows were read. */
async function railFor(impl: Impl, sp: ContactsParams, reads: boolean): Promise<{ view: ContactsView; rail: ContactRail }> {
  const view = await impl.load(sp, reads);
  const rail = impl.rail({
    sp, reads,
    lists: view.lists ?? null,
    tags: view.tags ?? null,
    counted: view.kind === "ok" ? { match: view.result.total, book: view.summary.total } : null,
    // The page passes `clearable: failed`; a read that arrived is not failed.
    clearable: false,
  });
  return { view, rail };
}
/** How many times the book's page() is read while `fn` runs. ⛔ The memory twin's method is wrapped for this one
 *  call and put back in a `finally` — in memory, never on disk. */
async function readsDuring<T>(fn: () => Promise<T>): Promise<{ value: T; pageCalls: number }> {
  const book = db.marketingContact as unknown as { page: (q: unknown) => unknown };
  const real = book.page;
  let pageCalls = 0;
  book.page = (q: unknown) => { pageCalls++; return real(q); };
  try {
    return { value: await fn(), pageCalls };
  } finally {
    book.page = real;
  }
}
/** The ADMIN_SURFACES array of the filter-language gate, as text (raw — see `rawRead`). */
const adminSurfaces = (gate: string) => {
  const at = gate.indexOf("const ADMIN_SURFACES = [");
  const end = at < 0 ? -1 : gate.indexOf("];", at);
  return end < 0 ? "" : gate.slice(at, end);
};
/** Declared as an ELEMENT of that array — a line that opens with the quoted path, never a mention in a comment. */
const declaresRail = (gate: string) => /^\s*"src\/app\/admin\/contacts\/contact-filters\.tsx",/m.test(adminSurfaces(gate));

/** U21's labels, ONCE — the assertions and the red cases both read them, so a case can never expect a label the suite
 *  no longer prints. */
const U21 = {
  rail: "12 · ⭐ the rail with nothing applied (a reader): the six axes in the plan's order under their keys, each opening with Any — the ONE pill in force — in the column's own words (UNKNOWN reads \"Not recorded\", C13), with the count line",
  operators: "12b · ⭐ the operator options come from the ONE table — every licensee holding a sendable prefix, no Telxer, labelled by brand, its prefixes the resolver's own — and every operator pill FOLLOWED through the loader lists only its own rows (Vodacom: exactly the 072 row)",
  hrefs: "12c · ⛔ every pill's href is the ONE builder's: it keeps the search, the sort and every other filter, never page — and a pill changes only its own axis",
  applied: "12d · ⛔ an applied value is ALWAYS a visible, selected pill — a tag no row carries, a tag past the drawn twenty, an unknown list, a no-network operator, two values at once — with exactly one pill in force on every axis",
  unreadable: "12e · ⛔ an unreadable value is REFUSED by the loader and still DRAWN by the rail, as typed — Any is the way out, and the other axes keep what they apply (C2)",
  error: "12f · ⛔ a FAILED read still draws the rail from the address alone (§5.15): the operator, the tag and the list stay selected and clearable, the search is kept, no count is invented — and the rail offers the ONE Clear filters (the page has none then; never a second beside the page's own)",
  counts: "12g · ⭐ a tag pill's count is the whole book's, shown ONLY where it is exactly what the pill lists — under another filter or a search it is omitted (EXECUTED: each count equals the rows its pill opens)",
  extension: "12h · U24's extension has NO axis: an applied import or window is ONE selected pill (toggle) whose href removes exactly that key and keeps the rest — for a masked viewer too — and Clear filters removes them; an axis with nothing to offer and nothing applied is not drawn",
  fit: "12i · ⛔ a pill never wraps or shrinks, so a label past RAIL_LABEL_MAX — a 60-character list name, five operators at once — is clipped, and its WHOLE text rides in the pill's title",
  role: "13 · 🔴 A1.1 · THE RAIL IS ROLE-SHAPED: a masked viewer is drawn no Consent, Source, Suppressed (OD54) or Player pill at all — its rail is Operator · List · Tag, even with all four typed — and its ?source=REGISTRATION and ?consent=GIVEN are refused by role with NO row read; a reader gets the rows and all six axes",
  noMatch: "14 · ⛔ THE RAIL SURVIVES NO-MATCH: page.tsx draws <ContactFilters> exactly once, gated on !emptyBook ALONE (a whole-book fact) and built for every state — and a filter matching nothing still yields the whole rail, its value in force, its links keeping the search and the sort",
  column: "15 · ⛔ the Operator COLUMN reads the one numbering table — operatorBrand(c.ndc) — and never the stored operator string, which could say \"Tigo\" under the Yas pill",
  file: "16 · the rail file is a dumb server renderer — ONE data-filter-rail=\"contacts\", ONE FilterPill at the dense rank (replace, scroll={false}, the group's semantics), a FilterGroupKey per axis, no \"use client\", no route, no label typed — and filter-language declares it in ADMIN_SURFACES",
  vocab: "17 · ⭐ ONE vocabulary (C13): the Consent and Source labels live in contacts-copy.ts alone — page.tsx keeps no map of its own, the column and the rail read the same ones, UNKNOWN reads \"Not recorded\"",
  options: "18 · the loader hands the rail its options in BOTH answers — every list, and the book's tags most-carried first through the resolver's own tag reader — whole-book, like the KPIs",
} as const;

/** 🔴 OD54's labels, ONCE — "D19 covers SUPPRESSION too" (S10): until the importer goes live a stop is a player's own
 *  opt-out or an officer's, so for a masked viewer it answers "is this a player?" exactly as consent does. */
const OD54 = {
  recent: "5b · ⭐ OD54 · a masked viewer's second KPI fact is the contacts ADDED IN THE LAST 7 DAYS — counted over the WHOLE book through the ONE resolver at the load's one clock (the bound inclusive: B, added exactly seven days before, counts; A, a day earlier, does not), the same under a filter and in the refused state — and a reader's view does not ask it",
  chip: "9h · 🔴 OD54 · no per-row stop signal reaches a masked viewer: page.tsx reads no suppressedAt cache and says no \"Suppressed since\", it writes \"Suppressed\" exactly twice — the gate's REACH map (the reader's Reachable cell) and the reader's KPI band — and neither the selection row nor the edit view carries a stop",
  axis: "13b · 🔴 OD54 · roleRefusal refuses suppressed — yes and no alike — to a masked viewer with the ROLE_REFUSAL_REASON and allows it to a reader; the loader refuses a masked ?suppressed=yes and ?op=HONORA&suppressed=no by role with NO row read, a reader gets the stopped row and the rest, and a masked viewer's \"Showing contacts:\" line names no stop",
} as const;

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;

  ok(p("0 · CONTROL · the four fixtures are in the book"), (await db.marketingContact.count()) === 4);

  // ── 1 · A WHOLE NUMBER, IN ANY SPELLING, IS ONE PERSON ─────────────────────────────────────────
  const spellings = ["0712 345 678", "712345678", "+255712345678", "255712345678"];
  const found: string[] = [];
  for (const q of spellings) found.push(ids(await impl.load({ q })));
  ok(p("1 · ⭐ the four spellings of one number each find EXACTLY that contact (EXECUTED)"),
    found.every((f) => f === A.id), found.join(" | "));
  ok(p("1b · CONTROL · a different WHOLE number finds nothing"), ids(await impl.load({ q: "0712 999 999" })) === "");
  // ⭐ vb3 · the trunk zero written after the country code is the same person — never a name search that finds nobody.
  const trunk = ids(await impl.load({ q: "+255 0712 345 678" }));
  ok(p("1c · ⭐ vb3 · '+255 0712 345 678' — the trunk zero written after the country code — finds EXACTLY that contact, never a name search that finds nobody (EXECUTED)"),
    trunk === A.id, trunk);

  // ── 2 · ⛔ A PART OF A NUMBER IS NEVER A NUMBER SEARCH ─────────────────────────────────────────
  const part = impl.search("0712345");
  ok(p("2 · ⛔ a PART of a number is not searched as a number — it can only ever be a name query"),
    part.msisdn === null && total(await impl.load({ q: "0712345" })) === 0, JSON.stringify(part.msisdn));

  // ── 3 · A NAME ───────────────────────────────────────────────────────────────────────────────
  ok(p("3 · a name finds by name, case-insensitively, through the shared grammar"),
    ids(await impl.load({ q: "baraka" })) === B.id && total(await impl.load({ q: "ASHA" })) === 2);

  // ── 4 · PAGE 4 OF A 3-ROW RESULT IS PAGE 1 ─────────────────────────────────────────────────────
  const clamped = await impl.load({ page: "4", sort: "operator", dir: "asc" });
  ok(p("4 · ⭐ page 4 of a short result renders its rows (page 1), never \"no matches\""),
    clamped.kind === "ok" && clamped.page === 1 && clamped.result.rows.length === 4,
    clamped.kind === "ok" ? `page ${clamped.page}, ${clamped.result.rows.length} rows` : clamped.kind);
  const nan = await impl.load({ page: "abc" });
  ok(p("4b · a page that is not a number is page 1"), nan.kind === "ok" && nan.page === 1);

  // ── 5 · THE KPIs ARE THE WHOLE BOOK ────────────────────────────────────────────────────────────
  const filtered = await impl.load({ q: "baraka" });
  ok(p("5 · ⭐ the KPIs are the WHOLE book — a search does not move them"),
    JSON.stringify(filtered.summary) === JSON.stringify(WHOLE_BOOK_COUNTS), JSON.stringify(filtered.summary));

  // ── 5b · 🔴 OD54 · THE MASKED BAND'S SECOND FACT — the book's contacts added in the last 7 days ──────────────
  // A fixed clock: B (2 Sep, 10:00Z) was added EXACTLY seven days before it — the bound is inclusive — and A a day
  // earlier, so a window that drifts by a day either way, or a figure that is not this one, changes the count.
  const AT = Date.parse("2026-09-09T10:00:00.000Z");
  const recentMasked = await impl.load({}, false, AT);
  const recentFiltered = await impl.load({ op: "VODACOM" }, false, AT);
  const recentRefused = await impl.load({ consent: "GIVEN" }, false, AT);
  const recentReader = await impl.load({}, true, AT);
  ok(p(OD54.recent),
    recentMasked.addedRecently === 3 && recentFiltered.addedRecently === 3
      && recentRefused.kind === "refused" && recentRefused.addedRecently === 3 && recentReader.addedRecently === null
      && CONTACTS_RECENT_DAYS === 7 && CONTACTS_KPI_RECENT === "Added in the last 7 days"
      && impl.sources.loader.includes("contactAudience({ ...WHOLE_BOOK, addedFrom: new Date(now - CONTACTS_RECENT_DAYS * DAY_MS).toISOString() }).count()"),
    `masked ${recentMasked.addedRecently} · filtered ${recentFiltered.addedRecently} · refused ${recentRefused.kind}/${recentRefused.addedRecently} · reader ${recentReader.addedRecently}`);

  // ── 6 · ORDER ────────────────────────────────────────────────────────────────────────────────
  const opAsc = await impl.load({ sort: "operator", dir: "asc" });
  ok(p("6 · \"Operator\" sorts by the PREFIX, and a tie on the prefix breaks on id"),
    opAsc.kind === "ok" && opAsc.result.rows.map((r) => r.ndc).join(",") === [C, A, D, B].map((r) => r.ndc).join(",")
      && ids(opAsc) === [C, A, D, B].map((r) => r.id).join(","),
    ids(opAsc));
  const nameAsc = ids(await impl.load({ sort: "name", dir: "asc" }));
  const nameDesc = ids(await impl.load({ sort: "name", dir: "desc" }));
  ok(p("6b · a contact with NO name sorts LAST in both directions, and equal names break on id"),
    nameAsc === [A, D, B, C].map((r) => r.id).join(",") && nameDesc === [B, D, A, C].map((r) => r.id).join(","),
    `${nameAsc} / ${nameDesc}`);
  ok(p("6c · the default is newest first"), ids(await impl.load({})) === [D, C, B, A].map((r) => r.id).join(","));

  // ── 7 · THE PAGE, READ ───────────────────────────────────────────────────────────────────────
  const page = impl.sources.page;
  ok(p("7 · ⛔ every number renders through <Sensitive field=\"contactPhone\" … copyable /> and nowhere else (U19)"),
    page.includes('<Sensitive field="contactPhone" subjectId={c.id} value={c.msisdn} copyable />')
      // With the wired tag taken out, no JSX `{c.msisdn}` may remain — `${c.msisdn}` (the gate's template) aside.
      && !/(^|[^$])\{c\.msisdn\}/.test(page.split('<Sensitive field="contactPhone" subjectId={c.id} value={c.msisdn} copyable />').join(""))
      // The only OTHER read is the gate's own question — "+" + c.msisdn handed to mayReceiveMarketingSms, never rendered.
      && (page.match(/c\.msisdn/g) ?? []).length === 2 && page.includes('mayReceiveMarketingSms("+" + c.msisdn)'));
  ok(p("7b · the Operator header says it sorts by the prefix"),
    page.includes('<SortTh field="operator" label="Operator (by prefix)"'));
  ok(p("7c · a failed read is AdminLoadError and \"unavailable\" tiles — never a zero — on all six: the reader's four and the masked viewer's two (OD53)"),
    page.includes('<AdminLoadError what="the contact book" />') && (page.match(/unavailable=\{failed\}/g) ?? []).length === 6);
  ok(p("7d · the search box is the shared SearchBox, in url mode"), page.includes('<SearchBox mode="url"'));

  // ── 8 · (moved) THE TWINS MATCH A NUMBER EXACTLY ───────────────────────────────────────────────
  // ⭐ U24 moved U20's §8/§8b to `test:dal-parity` §21 (21.msisdn, 21.name, 21.order): the number's exact match
  // now lives in the two TRANSLATORS of the audience where (`toPrismaContactWhere`, `contactMatchesAudience`), and
  // §21 reads both, with `red:dal-parity` anchors planting a substring match in each. Asserting it here as well
  // would be a second copy of one claim.

  // ── 9 · "REACHABLE" NEVER NAMES A PROTECTED STANDING ───────────────────────────────────────────
  const reach = page.slice(page.indexOf("const REACH"), page.indexOf("};", page.indexOf("const REACH")));
  const protectedKeys = ["rg_self_excluded", "rg_cooling_off", "rg_harm_marker", "rg_under25_history", "age_minor", "account_status"];
  ok(p("9 · ⛔ a self-exclusion, a break, a harm marker, an age or an account status reads only \"Not reachable\""),
    protectedKeys.every((k) => reach.includes(`${k}: "Not reachable",`)), reach.slice(0, 80));

  // ── 9b · 🔴 D19 · NO ROW-BY-ROW PLAYER SIGNAL FOR A ROLE THAT MAY NOT READ A NUMBER ───────────────
  const readsSeen = (await impl.load({})).viewerReads;
  ok(p("9b · ⛔ D19 · the loader hands the page the viewer's read cell — a masked viewer gets viewerReads false"),
    readsSeen === false && (await impl.load({}, true)).viewerReads === true, String(readsSeen));
  ok(p("9c · ⛔ D19 · Reachable, Source and the Player chip render ONLY when the viewer reads — and the gate is not even asked otherwise"),
    page.includes('{reads && <th className="text-left">Reachable</th>}') && page.includes('{reads && <th className="text-left">Source</th>}')
      && page.includes("{reads && c.userId && <Chip") && page.includes("const reach = reads ? await Promise.all(rows.map(reachOf)) : [];")
      && page.includes("{reads && <td><Chip") && page.includes("{reads && <td className=\"whitespace-nowrap\">{SOURCE_LABEL[c.source]}</td>}"));
  const maskedConsent = await impl.load({ consent: "GIVEN" });
  const readerConsent = await impl.load({ consent: "GIVEN" }, true);
  ok(p("9f · ⛔ A1.1 · a masked viewer is REFUSED ?consent= by role; a reader gets the rows"),
    maskedConsent.kind === "refused" && (maskedConsent as { refusal?: string; param?: string }).refusal === "role"
      && (maskedConsent as { param?: string }).param === "consent" && readerConsent.kind === "ok",
    `${maskedConsent.kind} / ${readerConsent.kind}`);
  ok(p("9e · ⛔ A1.1 · the per-row Consent column renders ONLY for a reader — until U33 a consent is a player's"),
    page.includes('{reads && <th className="text-left">Consent</th>}') && page.includes("{reads && <td><Chip size=\"sm\" variant={consent.variant}>")
      && page.includes("const cols = reads ? 9 : 6;"));
  ok(p("9d · ⛔ D19 · the read cell is asked in the .ts loader — identity.contact through mayReveal, failing closed"),
    impl.sources.loader.includes('mayReveal(role, "identity.contact")') && impl.sources.loader.includes("if (!session) return false;"));
  // 🔴 OD54 · a stop said per row is the same oracle: the page reads no stop cache, and the ONE row-level "Suppressed" is
  // the gate's answer in the reader's Reachable cell. What reaches the browser per row — the selection's projection and
  // the dialog's view — carries none (EXECUTED on B, the suppressed fixture).
  const reachCell = "{reads && <td><Chip size=\"sm\" variant={r.ok ? \"success\" : \"neutral\"}>";
  const bandAt = page.indexOf("{reads ? (");
  const readerBand = bandAt < 0 ? "" : page.slice(bandAt, page.indexOf(") : (", bandAt));
  const stopWords = (page.match(/Suppressed/g) ?? []).length;
  const stoppedView = contactEditView(B, false);
  const stoppedRow = contactSelectionRow(B);
  ok(p(OD54.chip),
    !page.includes("suppressedAt") && !/Suppressed since/i.test(page) && stopWords === 2
      && page.includes('suppressed: "Suppressed",') && readerBand.includes('label="Suppressed"') && page.includes(reachCell)
      && !("suppressedAt" in stoppedView) && stoppedView.reader === null && !JSON.stringify(stoppedView).includes("Suppressed")
      && Object.keys(stoppedRow).sort().join(",") === "id,masked,name",
    `${stopWords} "Suppressed" in page.tsx · reads the stop cache: ${page.includes("suppressedAt")} · edit view [${Object.keys(stoppedView).sort()}] · selection [${Object.keys(stoppedRow).sort()}]`);

  // ── 10 · THE OPERATOR LABEL COMES FROM THE ONE TABLE ───────────────────────────────────────────
  ok(p("10 · the operator brand comes from the numbering table, and an unknown prefix has none"),
    typeof operatorBrand(A.ndc) === "string" && operatorBrand("00") === null, String(operatorBrand(A.ndc)));

  // ── 11 · U24 · THE ADDRESS'S FILTERS, THROUGH THE ONE RESOLVER ─────────────────────────────────
  const vod = await impl.load({ op: "VODACOM" });
  ok(p("11 · ⭐ a filter in the address narrows the list (op=VODACOM is the 072 row alone), says so in words, and the KPIs stay the WHOLE book"),
    ids(vod) === B.id && vod.kind === "ok" && vod.narrowed && vod.described.includes("Operator: Vodacom")
      && JSON.stringify(vod.summary) === JSON.stringify(WHOLE_BOOK_COUNTS),
    `${ids(vod)} ${vod.kind === "ok" ? vod.described.join(" · ") : ""}`);
  const nokia = await impl.load({ op: "NOKIA" });
  const badDate = await impl.load({ from: "2026-13-40" });
  ok(p("11b · ⛔ an unreadable filter is REFUSED, naming its parameter — no rows, never the whole book — and the KPIs still stand"),
    nokia.kind === "refused" && nokia.refusal === "unreadable" && nokia.param === "op"
      && badDate.kind === "refused" && badDate.param === "from"
      && JSON.stringify(nokia.summary) === JSON.stringify(WHOLE_BOOK_COUNTS),
    `${ids(nokia)} ${ids(badDate)}`);
  const masked = await impl.load({ player: "yes" }, false);
  const maskedSource = await impl.load({ source: "IMPORT" }, false);
  const reader = await impl.load({ player: "no" }, true);
  ok(p("11c · 🔴 D19 · a viewer who may not read a number is REFUSED the player filter and the source filter (each answers \"is this a player?\"); a reading viewer is not"),
    masked.kind === "refused" && masked.refusal === "role" && masked.param === "player"
      && maskedSource.kind === "refused" && maskedSource.param === "source"
      && reader.kind === "ok" && total(reader) === 4,
    `${ids(masked)} ${ids(maskedSource)} ${ids(reader)}`);
  const clampedFiltered = await impl.load({ op: "HONORA", page: "9" });
  ok(p("11d · ⭐ the clamp holds under a filter — page 9 of the two Honora rows renders them on page 1"),
    clampedFiltered.kind === "ok" && clampedFiltered.page === 1 && total(clampedFiltered) === 2 && clampedFiltered.result.rows.length === 2,
    ids(clampedFiltered));

  ok(p("11e · the page renders the refused state FIRST — the parameter and the reason, a Clear filters action, no rows"),
    page.includes("{refused ? (") && page.includes("body={refusedCopy.body(refused.param, refused.reason)}")
      // FIRST: the refused branch comes before the empty-book branch, or a bad filter on an empty book reads "empty".
      && page.indexOf("{refused ? (") >= 0 && page.indexOf("{refused ? (") < page.indexOf("emptyBook ? (")
      && page.includes('action={<a href={clearFiltersHref} className="btn btn-ghost btn-sm">Clear filters</a>}'));
  ok(p("11f · the \"Showing contacts:\" line renders describeAudience's phrases, only while something but the search narrows the list"),
    page.includes("{narrowed && listed && (") && page.includes('{listed.described.join(" · ")}') && page.includes("{CONTACTS_FILTERED_LEAD}"));

  // ⭐ THE ONE HREF BUILDER (decision C9), read in the page and DRIVEN here.
  const sp = { q: "asha", op: ["VODACOM", "AIRTEL"], page: "3", edit: "mc_1", sort: "name", utm_source: "x" };
  const carried = impl.href(sp);
  const paged = impl.href(sp, { page: "2" });
  const cleared = contactsClearFiltersHref(sp);
  const flat = contactsLinkSp(sp);
  ok(p("11g · ⛔ every link is built by contactsHref — it carries the filters and the sort, never page unless asked, NEVER edit; SortTh gets the same flat params"),
    !page.includes("buildBaseHref") && !page.includes("sp={sp}") && (page.match(/sp=\{linkSp\}/g) ?? []).length === 3
      && page.includes("const baseHref = contactsHref(sp);") && page.includes("const linkSp = contactsLinkSp(sp);")
      && carried.includes("q=asha") && carried.includes("op=VODACOM%2CAIRTEL") && carried.includes("sort=name")
      && !carried.includes("page=") && !carried.includes("edit") && !carried.includes("utm_source")
      && paged.includes("page=2") && !paged.includes("edit")
      && cleared.includes("q=asha") && cleared.includes("sort=name") && !cleared.includes("op=")
      && flat.edit === undefined && flat.page === undefined && flat.op === "VODACOM,AIRTEL",
    `${carried} | ${paged} | ${cleared}`);

  /* ══ 12–18 · U21 · THE FILTER RAIL ══════════════════════════════════════════════════════════════════════════ */

  // ── 12 · THE MODEL, NOTHING APPLIED ──────────────────────────────────────────────────────────
  const none = await railFor(impl, {}, true);
  const honora = await railFor(impl, { op: "HONORA" }, true);
  const noneParams = none.rail.groups.map((g) => g.param).join(",");
  ok(p(U21.rail),
    noneParams === "consent,suppressed,op,source,list,tag"
      && none.rail.groups.map((g) => g.label).join(",") === [RAIL_KEYS.consent, RAIL_KEYS.suppressed, RAIL_KEYS.op, RAIL_KEYS.source, RAIL_KEYS.list, RAIL_KEYS.tag].join(",")
      && none.rail.groups.every((g) => g.semantics === "tab" && g.options[0]?.key === "" && g.options[0]?.label === RAIL_ANY && g.options[0]?.on === true)
      && exactlyOneOn(none.rail)
      && labelsOf(groupOf(none.rail, "consent")) === "Any,Given,Not recorded,Withdrawn"
      && labelsOf(groupOf(none.rail, "suppressed")) === "Any,Suppressed,Not suppressed"
      && labelsOf(groupOf(none.rail, "source")) === "Any,Import,Signed up,Added by staff,Agent"
      && labelsOf(groupOf(none.rail, "list")) === "Any,Dar weekend" && keysOf(groupOf(none.rail, "list")) === `,${L.id}`
      && keysOf(groupOf(none.rail, "tag")) === ",dar,vip"
      && none.rail.countLine === "4 contacts" && honora.rail.countLine === "2 of 4 contacts",
    `${noneParams} · ${labelsOf(groupOf(none.rail, "consent"))} · ${none.rail.countLine} / ${honora.rail.countLine}`);

  // ── 12b · THE OPERATORS, FROM THE ONE TABLE — and FOLLOWED ───────────────────────────────────
  const offered = (groupOf(none.rail, "op")?.options ?? []).filter((o) => o.key !== "");
  const sendable = Array.from(new Set(TZ_MOBILE_NDCS.filter((r) => r.sendable).map((r) => r.operator)))
    .map((id) => ({ id, brand: TZ_OPERATORS[id].brand }))
    .sort((x, y) => (x.brand < y.brand ? -1 : x.brand > y.brand ? 1 : 0));
  const fromTable = offered.length === sendable.length
    && offered.every((o, i) => o.key === sendable[i].id && o.label === sendable[i].brand && o.title === railOperatorTitle(ndcsForOperators([sendable[i].id])));
  let brandsHold = offered.length > 0;
  const reached: string[] = [];
  for (const o of offered) {
    const v = await impl.load(spOf(o.href), true);
    if (v.kind !== "ok") { brandsHold = false; continue; }
    for (const r of v.result.rows) { reached.push(r.id); if (operatorBrand(r.ndc) !== o.label) brandsHold = false; }
  }
  const vodPill = offered.find((o) => o.key === "VODACOM");
  const vodRows = vodPill ? ids(await impl.load(spOf(vodPill.href), true)) : "(no Vodacom pill)";
  ok(p(U21.operators),
    fromTable && offered.map((o) => o.label).join(",") === "Airtel,Halotel,TTCL,Vodacom,Yas" && !offered.some((o) => o.key === "TELXER")
      && (vodPill?.title ?? "").includes("072") && brandsHold
      && reached.slice().sort().join(",") === [A, B, C, D].map((r) => r.id).sort().join(",") && vodRows === B.id,
    `${offered.map((o) => `${o.key}=${o.label}`).join(" ")} · Vodacom → ${vodRows} · ${vodPill?.title ?? ""}`);

  // ── 12c · EVERY PILL'S HREF ──────────────────────────────────────────────────────────────────
  const hsp: ContactsParams = { q: "asha", sort: "name", dir: "asc", page: "3", op: "HONORA", tag: "rare" };
  const hrail = (await railFor(impl, hsp, true)).rail;
  const hrefs = pills(hrail).map((o) => o.href);
  const vodHref = groupOf(hrail, "op")?.options.find((o) => o.key === "VODACOM")?.href ?? "";
  const opAnyHref = groupOf(hrail, "op")?.options.find((o) => o.key === "")?.href ?? "op=";
  const tagAnyHref = groupOf(hrail, "tag")?.options.find((o) => o.key === "")?.href ?? "tag=";
  ok(p(U21.hrefs),
    hrefs.length > 10
      && hrefs.every((h) => h.startsWith("/admin/contacts?") && h.includes("q=asha") && h.includes("sort=name") && h.includes("dir=asc") && !h.includes("page="))
      && vodHref.includes("op=VODACOM") && vodHref.includes("tag=rare") && !vodHref.includes("HONORA")
      && !opAnyHref.includes("op=") && opAnyHref.includes("tag=rare")
      && !tagAnyHref.includes("tag=") && tagAnyHref.includes("op=HONORA")
      && (await impl.load(spOf(vodHref || "/admin/contacts?op=NOKIA"), true)).kind === "ok",
    `${vodHref} | ${opAnyHref} | ${tagAnyHref}`);

  // ── 12d · AN APPLIED VALUE IS ALWAYS DRAWN ───────────────────────────────────────────────────
  const rare = (await railFor(impl, { tag: "rare" }, true)).rail;
  const unknownList = (await railFor(impl, { list: "nope" }, true)).rail;
  const telxer = (await railFor(impl, { op: "TELXER" }, true)).rail;
  const two = (await railFor(impl, { op: "VODACOM,AIRTEL" }, true)).rail;
  const many: ContactTagCount[] = Array.from({ length: 25 }, (_, i) => ({ tag: `t${String(i).padStart(2, "0")}`, count: 40 - i }));
  const capped = impl.rail({ sp: { tag: "t22" }, reads: true, lists: [], tags: many, counted: null, clearable: false });
  const cappedTag = groupOf(capped, "tag");
  ok(p(U21.applied),
    onOf(groupOf(rare, "tag")).length === 1 && onOf(groupOf(rare, "tag"))[0]?.key === "rare" && onOf(groupOf(rare, "tag"))[0]?.label === "rare"
      && onOf(groupOf(unknownList, "list"))[0]?.key === "nope" && onOf(groupOf(unknownList, "list"))[0]?.label === RAIL_UNKNOWN_LIST
      && onOf(groupOf(telxer, "op"))[0]?.key === "TELXER" && onOf(groupOf(telxer, "op"))[0]?.label === "Telxer"
      && onOf(groupOf(two, "op"))[0]?.key === "AIRTEL,VODACOM" && onOf(groupOf(two, "op"))[0]?.label === "Airtel or Vodacom"
      && (cappedTag?.options.length ?? 0) === 1 + TAG_RAIL_CAP + 1 && onOf(cappedTag)[0]?.key === "t22" && capped.notes.length === 1
      && [rare, unknownList, telxer, two, capped].every(exactlyOneOn),
    `${keysOf(groupOf(rare, "tag"))} · ${labelsOf(groupOf(unknownList, "list"))} · ${labelsOf(groupOf(telxer, "op"))} · ${labelsOf(groupOf(two, "op"))} · ${cappedTag?.options.length ?? 0} tag pills`);

  // ── 12e · AN UNREADABLE VALUE: REFUSED, AND DRAWN ────────────────────────────────────────────
  const nokiaSp: ContactsParams = { op: "NOKIA", tag: "vip" };
  const nokiaView = await impl.load(nokiaSp, true);
  const nokiaRail = impl.rail({ sp: nokiaSp, reads: true, lists: nokiaView.lists ?? null, tags: nokiaView.tags ?? null, counted: null, clearable: false });
  const nokiaOn = onOf(groupOf(nokiaRail, "op"));
  ok(p(U21.unreadable),
    nokiaView.kind === "refused" && nokiaView.param === "op"
      && nokiaOn.length === 1 && nokiaOn[0].key === "NOKIA" && nokiaOn[0].label.includes("NOKIA")
      && groupOf(nokiaRail, "op")?.options[0]?.on === false && !(groupOf(nokiaRail, "op")?.options[0]?.href ?? "op=").includes("op=")
      && onOf(groupOf(nokiaRail, "tag"))[0]?.key === "vip" && exactlyOneOn(nokiaRail),
    `${nokiaView.kind} · ${labelsOf(groupOf(nokiaRail, "op"))}`);

  // ── 12f · THE ERROR PATH: THE RAIL FROM THE ADDRESS ──────────────────────────────────────────
  const errRail = impl.rail({ sp: { q: "asha", op: "VODACOM", tag: "vip", list: L.id }, reads: true, lists: null, tags: null, counted: null, clearable: true });
  const errBare = impl.rail({ sp: { q: "asha" }, reads: true, lists: null, tags: null, counted: null, clearable: true });
  ok(p(U21.error),
    onOf(groupOf(errRail, "op"))[0]?.key === "VODACOM"
      && keysOf(groupOf(errRail, "tag")) === ",vip" && onOf(groupOf(errRail, "tag"))[0]?.key === "vip"
      && keysOf(groupOf(errRail, "list")) === `,${L.id}` && onOf(groupOf(errRail, "list"))[0]?.on === true
      && onOf(groupOf(errRail, "list"))[0]?.label !== RAIL_UNKNOWN_LIST
      && pills(errRail).every((o) => o.href.includes("q=asha")) && errRail.countLine === null && pills(errRail).every((o) => o.count === undefined)
      // The ONE Clear filters on a failed read — every filter gone, the search kept; none with nothing applied, and
      // none on a page that draws its own (`hrail`: three filters applied, the read arrived).
      && errRail.clear?.label === "Clear filters" && errRail.clear?.href === contactsClearFiltersHref({ q: "asha", op: "VODACOM", tag: "vip", list: L.id })
      && errRail.clear?.href === "/admin/contacts?q=asha"
      && errBare.clear === null && hrail.clear === null && none.rail.clear === null
      && page.includes("clearable: failed,"),
    `${errRail.groups.map((g) => `${g.param}[${keysOf(g)}]`).join(" ")} · clear ${JSON.stringify(errRail.clear)} · beside the page's own: ${JSON.stringify(hrail.clear)}`);

  // ── 12g · A COUNT ONLY WHERE IT IS TRUE ──────────────────────────────────────────────────────
  const plainTags = (groupOf(none.rail, "tag")?.options ?? []).filter((o) => o.key !== "");
  let countsTrue = plainTags.length === 2;
  for (const o of plainTags) {
    const v = await impl.load(spOf(o.href), true);
    if (o.count === undefined || v.kind !== "ok" || v.result.total !== o.count) countsTrue = false;
  }
  const searched = (await railFor(impl, { q: "asha" }, true)).rail;
  ok(p(U21.counts),
    countsTrue && plainTags.map((o) => `${o.key}:${o.count}`).join(",") === "dar:2,vip:2"
      && [honora.rail, searched].every((r) => pills(r).every((o) => o.count === undefined)),
    `${plainTags.map((o) => `${o.key}:${o.count}`).join(",")} · under op=HONORA: ${pills(honora.rail).filter((o) => o.count !== undefined).length} counted`);

  // ── 12h · U24'S EXTENSION: NO AXIS, ONE PILL — and no axis with nothing to offer ─────────────
  const extSp: ContactsParams = { q: "asha", import: "imp_1", sort: "name" };
  const impRail = impl.rail({ sp: extSp, reads: true, lists: [], tags: [], counted: null, clearable: false });
  const rangeRail = impl.rail({ sp: { range: "7d", op: "HONORA" }, reads: false, lists: [], tags: [], counted: null, clearable: false });
  const fromToRail = impl.rail({ sp: { from: "2026-09-01", to: "2026-09-08" }, reads: true, lists: [], tags: [], counted: null, clearable: false });
  const impG = groupOf(impRail, "import");
  const rngG = groupOf(rangeRail, "range");
  const ftG = groupOf(fromToRail, "from");
  const impHref = paramsOfHref(impG?.options[0]?.href ?? "/admin/contacts?import=x");
  const rngHref = paramsOfHref(rngG?.options[0]?.href ?? "/admin/contacts?range=x");
  const allCleared = paramsOfHref(contactsClearFiltersHref({ q: "asha", import: "imp_1", range: "7d", from: "2026-09-01", to: "2026-09-08", player: "yes", sort: "name" }));
  ok(p(U21.extension),
    impG?.semantics === "toggle" && impG.options.length === 1 && impG.options[0].on && impG.options[0].key === "imp_1" && impG.options[0].label === "imp_1"
      && !impHref.has("import") && impHref.get("q") === "asha" && impHref.get("sort") === "name"
      && rngG?.semantics === "toggle" && rngG.options.length === 1 && rngG.options[0].on && rngG.options[0].key === "7d"
      && rngG.options[0].label.includes("→") && !rngG.options[0].label.startsWith("Added")
      && !rngHref.has("range") && !rngHref.has("from") && !rngHref.has("to") && rngHref.get("op") === "HONORA"
      && ftG?.options[0]?.key === "2026-09-01" && ftG?.options[0]?.label === "1 Sep 2026 → 8 Sep 2026" && ftG?.options[0]?.href === "/admin/contacts"
      && ["import", "range", "from", "to", "player"].every((k) => !allCleared.has(k)) && allCleared.get("q") === "asha" && allCleared.get("sort") === "name"
      && !groupOf(impRail, "list") && !groupOf(impRail, "tag") && !groupOf(rangeRail, "list") && !groupOf(rangeRail, "tag"),
    `import [${labelsOf(impG)}] → ${impG?.options[0]?.href} · range [${labelsOf(rngG)}] → ${rngG?.options[0]?.href} · from/to [${labelsOf(ftG)}] · groups [${impRail.groups.map((g) => g.param)}]`);

  // ── 12i · A LABEL THAT WOULD RUN OFF A PHONE IS CLIPPED, AND KEPT WHOLE IN ITS TITLE ───────────
  const longName = "Customers who joined in September 2026 from Dar es Salaam";
  const longList: StoredContactList = { ...L, id: "cl_t_long", name: longName };
  const fiveOps = "Airtel or Yas or TTCL or Halotel or Vodacom";
  const longRail = impl.rail({ sp: { op: "AIRTEL,HONORA,TTCL,VIETTEL,VODACOM", list: "cl_t_long" }, reads: true, lists: [L, longList], tags: [], counted: null, clearable: false });
  const longPills = pills(longRail);
  const longOn = onOf(groupOf(longRail, "list"))[0];
  const opsOn = onOf(groupOf(longRail, "op"))[0];
  ok(p(U21.fit),
    longPills.length > 10 && longPills.every((o) => o.label.length <= RAIL_LABEL_MAX)
      && longOn?.key === "cl_t_long" && longOn.title === longName && longOn.label.endsWith("…") && longName.startsWith(longOn.label.slice(0, -1))
      && opsOn?.key === "AIRTEL,HONORA,TTCL,VIETTEL,VODACOM" && opsOn.title === fiveOps && opsOn.label.endsWith("…")
      // A short label is left alone, and an operator keeps its prefix title.
      && groupOf(longRail, "op")?.options.find((o) => o.key === "VODACOM")?.title === railOperatorTitle(ndcsForOperators(["VODACOM"])),
    `${longOn?.label} | ${opsOn?.label} · longest ${Math.max(...longPills.map((o) => o.label.length))}`);

  // ── 13 · 🔴 A1.1 · THE ROLE-SHAPED RAIL (and OD54: no Suppressed axis for a masked viewer) ─────────────
  const D19_KEYS = ["consent", "source", "player", "suppressed"];
  const leaks = (r: ContactRail) => r.groups.filter((g) => D19_KEYS.includes(g.param)).map((g) => g.param);
  const maskedRail = (await railFor(impl, {}, false)).rail;
  const maskedTyped = impl.rail({ sp: { consent: "GIVEN", source: "REGISTRATION", player: "yes", suppressed: "yes", op: "VODACOM" }, reads: false, lists: none.view.lists ?? null, tags: none.view.tags ?? null, counted: null, clearable: false });
  const readerTyped = impl.rail({ sp: { consent: "GIVEN", source: "IMPORT", player: "yes" }, reads: true, lists: none.view.lists ?? null, tags: none.view.tags ?? null, counted: null, clearable: false });
  const srcRead = await readsDuring(() => impl.load({ source: "REGISTRATION" }, false));
  const conRead = await readsDuring(() => impl.load({ consent: "GIVEN" }, false));
  const readerSrc = await impl.load({ source: "IMPORT" }, true);
  const maskedSrc = srcRead.value;
  const maskedCon = conRead.value;
  ok(p(U21.role),
    maskedRail.groups.map((g) => g.param).join(",") === "op,list,tag" && leaks(maskedRail).length === 0 && leaks(maskedTyped).length === 0
      && readerTyped.groups.filter((g) => g.semantics === "tab").map((g) => g.param).join(",") === "consent,suppressed,op,source,list,tag"
      && readerTyped.groups.some((g) => g.param === "player" && g.semantics === "toggle" && g.options.length === 1 && g.options[0].on)
      && maskedSrc.kind === "refused" && maskedSrc.refusal === "role" && maskedSrc.param === "source" && srcRead.pageCalls === 0
      && maskedCon.kind === "refused" && maskedCon.refusal === "role" && maskedCon.param === "consent" && conRead.pageCalls === 0
      && ids(readerSrc) === [D, A].map((r) => r.id).join(","),
    `masked [${maskedRail.groups.map((g) => g.param)}] typed-leaks [${leaks(maskedTyped)}] · source ${ids(maskedSrc)} (${srcRead.pageCalls} page reads) · consent ${ids(maskedCon)} (${conRead.pageCalls}) · reader ${ids(readerSrc)}`);

  // ── 13b · 🔴 OD54 · THE STOP IS A READER'S AXIS — the ONE role rule, then the REAL loader ───────────────────
  const F = (patch: Partial<ContactAudienceFilter>): ContactAudienceFilter => ({ ...WHOLE_BOOK, ...patch });
  const ruleYes = impl.role(F({ suppressed: true }), false);
  const ruleNo = impl.role(F({ suppressed: false }), false);
  const ruleReader = impl.role(F({ suppressed: true }), true);
  // CONTROL: the axes that carry no player signal stay open to a masked viewer.
  const ruleOpen = impl.role(F({ operators: ["VODACOM"], tags: ["vip"], lists: [L.id] }), false);
  const supYes = await readsDuring(() => impl.load({ suppressed: "yes" }, false));
  const supNo = await readsDuring(() => impl.load({ op: "HONORA", suppressed: "no" }, false));
  const readerYes = await impl.load({ suppressed: "yes" }, true);
  const readerNo = await impl.load({ suppressed: "no" }, true);
  const maskedOpen = await impl.load({ op: "HONORA", tag: "vip" }, false);
  const byRole = (v: ContactsView) => v.kind === "refused" && v.refusal === "role" && v.param === "suppressed" && v.reason === ROLE_REFUSAL_REASON;
  ok(p(OD54.axis),
    ruleYes?.param === "suppressed" && ruleYes.reason === ROLE_REFUSAL_REASON && ruleNo?.param === "suppressed" && ruleReader === null && ruleOpen === null
      && byRole(supYes.value) && supYes.pageCalls === 0 && byRole(supNo.value) && supNo.pageCalls === 0
      && ids(readerYes) === B.id && ids(readerNo) === [D, C, A].map((r) => r.id).join(",")
      && maskedOpen.kind === "ok" && ids(maskedOpen) === A.id && maskedOpen.described.length === 2
      && !maskedOpen.described.some((d) => /suppress|stop/i.test(d)),
    `rule ${JSON.stringify(ruleYes)} / ${JSON.stringify(ruleNo)} / reader ${JSON.stringify(ruleReader)} / open ${JSON.stringify(ruleOpen)} · masked ${ids(supYes.value)} (${supYes.pageCalls} page reads), ${ids(supNo.value)} (${supNo.pageCalls}) · reader ${ids(readerYes)} | ${ids(readerNo)} · masked open "${maskedOpen.kind === "ok" ? maskedOpen.described.join(" · ") : maskedOpen.kind}"`);

  // ── 14 · ⛔ THE RAIL SURVIVES NO-MATCH ────────────────────────────────────────────────────────
  const railAt = page.indexOf("<ContactFilters");
  const beforeRail = railAt < 0 ? "" : page.slice(Math.max(0, railAt - 300), railAt);
  const ttcl = await railFor(impl, { op: "TTCL", q: "asha", sort: "name", dir: "asc" }, true);
  ok(p(U21.noMatch),
    (page.match(/<ContactFilters\b/g) ?? []).length === 1
      && page.includes("{!emptyBook && <ContactFilters rail={rail} />}")
      && !/rows\.length|result/.test(beforeRail)
      && page.includes("const rail = contactRail({")
      && page.includes("const emptyBook = !failed && summary!.total === 0;")
      && (page.match(/\{!emptyBook && \(/g) ?? []).length === 1 && !page.includes("{!failed && !emptyBook && (")
      && ttcl.view.kind === "ok" && ttcl.view.result.total === 0
      && ttcl.rail.groups.length === 6 && onOf(groupOf(ttcl.rail, "op"))[0]?.key === "TTCL"
      && pills(ttcl.rail).every((o) => o.href.includes("q=asha") && o.href.includes("sort=name")),
    `${(page.match(/<ContactFilters\b/g) ?? []).length} rail(s) · no-match rail [${ttcl.rail.groups.map((g) => g.param)}]`);

  // ── 15 · ⛔ THE OPERATOR COLUMN ───────────────────────────────────────────────────────────────
  ok(p(U21.column),
    page.includes('<td className="whitespace-nowrap">{operatorBrand(c.ndc) ?? "—"}</td>') && !page.includes("c.operator"));

  // ── 16 · THE RAIL FILE ────────────────────────────────────────────────────────────────────────
  const railSrc = impl.sources.rail;
  const pillTags = railSrc.match(/<FilterPill\b[\s\S]*?\/>/g) ?? [];
  ok(p(U21.file),
    (railSrc.match(/data-filter-rail="contacts"/g) ?? []).length === 1
      && pillTags.length === 1 && pillTags[0].includes('rank="dense"') && /\sreplace\s/.test(pillTags[0]) && pillTags[0].includes("scroll={false}")
      && pillTags[0].includes("semantics={g.semantics}") && pillTags[0].includes("testId={`${g.param}:${o.key}`}")
      && railSrc.includes("<FilterGroupKey>{g.label}</FilterGroupKey>")
      && !railSrc.includes('"use client"') && !railSrc.includes("/admin/contacts")
      && !/"(Any|Given|Not recorded|Withdrawn|Suppressed|Import|Signed up|Vodacom|Unknown list)"/.test(railSrc)
      && declaresRail(impl.sources.gate),
    `${pillTags.length} FilterPill tag(s) · declared: ${declaresRail(impl.sources.gate)}`);

  // ── 17 · ⭐ ONE VOCABULARY ────────────────────────────────────────────────────────────────────
  ok(p(U21.vocab),
    !/const (CONSENT|SOURCE)\b/.test(page) && page.includes("CONSENT_LABEL[c.consentState]") && page.includes("SOURCE_LABEL[c.source]")
      && impl.sources.model.includes("CONSENT_LABEL[c].label") && impl.sources.model.includes("SOURCE_LABEL[s]")
      && !impl.sources.model.includes('"Not recorded"') && !impl.sources.model.includes('"Signed up"')
      && /export const CONSENT_LABEL\b/.test(impl.sources.copy) && /export const SOURCE_LABEL\b/.test(impl.sources.copy)
      && CONSENT_LABEL.UNKNOWN.label === "Not recorded" && SOURCE_LABEL.REGISTRATION === "Signed up");

  // ── 18 · THE LOADER HANDS THE RAIL ITS OPTIONS ───────────────────────────────────────────────
  const okView = await impl.load({}, true);
  const refusedView = await impl.load({ op: "NOKIA" }, true);
  const optionsOf = (v: ContactsView) => `${(v.lists ?? []).map((l) => l.id).join(",")} | ${(v.tags ?? []).map((t) => `${t.tag}:${t.count}`).join(",")}`;
  ok(p(U21.options),
    [okView, refusedView].every((v) => optionsOf(v) === `${L.id} | dar:2,vip:2`)
      && impl.sources.loader.includes("contactTagCounts(RAIL_TAG_READ)") && impl.sources.loader.includes("db.contactList.listAll()"),
    `${optionsOf(okView)} // refused: ${optionsOf(refusedView)}`);
}

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`\ncontacts-page: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline: ${pass} passed, ${fail} failed\n`);

  /** A loader as somebody would write it without the clamp, or without the whole-book KPIs — straight at the
   *  store's page, the way U20's loader was before the resolver. */
  const naiveLoad = (opts: { clamp: boolean; wholeBook: boolean }) => async (sp: ContactsParams): Promise<ContactsView> => {
    const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : null;
    const where = toAudienceWhere({ ...WHOLE_BOOK, q });
    const sort = sp.sort === "name" || sp.sort === "operator" ? sp.sort : "added";
    const dir = sp.dir === "asc" ? "asc" : "desc";
    const requested = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
    const at = (pg: number) => db.marketingContact.page({ where, sort, dir, offset: (pg - 1) * PER_PAGE, limit: PER_PAGE });
    let result = await at(requested);
    let page = requested;
    if (opts.clamp && result.rows.length === 0 && requested > 1) { page = 1; result = await at(1); }
    const summary = opts.wholeBook ? await db.marketingContact.summaryWhere(toAudienceWhere(WHOLE_BOOK)) : {
      total: result.total, given: result.rows.filter((r) => r.consentState === "GIVEN").length,
      unknown: result.rows.filter((r) => r.consentState === "UNKNOWN").length,
      withdrawn: result.rows.filter((r) => r.consentState === "WITHDRAWN").length,
      suppressed: result.rows.filter((r) => r.suppressedAt !== null).length,
    };
    return { kind: "ok", summary, result, page, sort, dir, viewerReads: false, filter: { ...WHOLE_BOOK, q }, described: [], narrowed: false };
  };

  /* ── U21's plants: each one a rail, a loader or a source string as somebody would write it wrongly ── */
  /** Every pill of a rail, rewritten. */
  const mapPills = (r: ContactRail, f: (o: RailOption, g: RailGroup) => RailOption): ContactRail =>
    ({ ...r, groups: r.groups.map((g) => ({ ...g, options: g.options.map((o) => f(o, g)) })) });
  /** ⛔ The 2020-edition operator map, typed by hand — Vodacom without 072 (it changed holder), Tigo for Yas,
   *  Halotel by its brand, Zantel long absorbed. Kept HERE, in the test: the src tree may not hold one. */
  const HAND_TYPED_2020 = [
    { id: "AIRTEL", brand: "Airtel", ndcs: ["68", "69", "78"] },
    { id: "HALOTEL", brand: "Halotel", ndcs: ["62"] },
    { id: "TIGO", brand: "Tigo", ndcs: ["65", "67", "71"] },
    { id: "TTCL", brand: "TTCL", ndcs: ["73"] },
    { id: "VODACOM", brand: "Vodacom", ndcs: ["74", "75", "76", "79"] },
    { id: "ZANTEL", brand: "Zantel", ndcs: ["77"] },
  ];

  const CASES: Array<{ name: string; expect: string; impl: Impl }> = [
    {
      name: "the requested page is used as asked — page 4 of a short result says \"no matches\"",
      expect: "4 · ⭐ page 4 of a short result renders its rows (page 1), never \"no matches\"",
      impl: { ...REAL, load: naiveLoad({ clamp: false, wholeBook: true }) },
    },
    {
      name: "the KPIs are counted from the filtered page — a search makes the book look smaller",
      expect: "5 · ⭐ the KPIs are the WHOLE book — a search does not move them",
      impl: { ...REAL, load: naiveLoad({ clamp: true, wholeBook: false }) },
    },
    {
      name: "the page renders the raw number",
      expect: "7 · ⛔ every number renders through <Sensitive field=\"contactPhone\" … copyable /> and nowhere else (U19)",
      impl: { ...REAL, sources: { ...REAL_SOURCES, page: REAL_SOURCES.page.replace('<Sensitive field="contactPhone" subjectId={c.id} value={c.msisdn} copyable />', "{c.msisdn}") } },
    },
    {
      name: "🔴 D19 · the Player chip renders for every viewer — a masked role learns which numbers are players",
      expect: "9c · ⛔ D19 · Reachable, Source and the Player chip render ONLY when the viewer reads — and the gate is not even asked otherwise",
      impl: { ...REAL, sources: { ...REAL_SOURCES, page: REAL_SOURCES.page.replace("{reads && c.userId && <Chip", "{c.userId && <Chip") } },
    },
    {
      name: "🔴 D19 · the loader stops asking the matrix and lets everyone read",
      expect: "9d · ⛔ D19 · the read cell is asked in the .ts loader — identity.contact through mayReveal, failing closed",
      impl: { ...REAL, sources: { ...REAL_SOURCES, loader: REAL_SOURCES.loader.replace('mayReveal(role, "identity.contact")', "true") } },
    },
    {
      name: "the Reachable column names a self-exclusion to GROWTH",
      expect: "9 · ⛔ a self-exclusion, a break, a harm marker, an age or an account status reads only \"Not reachable\"",
      impl: { ...REAL, sources: { ...REAL_SOURCES, page: REAL_SOURCES.page.replace('rg_self_excluded: "Not reachable",', 'rg_self_excluded: "Self-excluded",') } },
    },
    {
      name: "U24 · a filter that cannot be read falls back to the whole book (the silent widening)",
      expect: "11b · ⛔ an unreadable filter is REFUSED, naming its parameter — no rows, never the whole book — and the KPIs still stand",
      impl: {
        ...REAL,
        load: async (sp, reads = false, now) => {
          const v = await realLoad(sp, reads, now);
          return v.kind === "refused" && v.refusal === "unreadable" ? realLoad({}, reads, now) : v;
        },
      },
    },
    {
      name: "🔴 D19 · the loader lets a masked viewer filter by player — a membership oracle typed into the address",
      expect: "11c · 🔴 D19 · a viewer who may not read a number is REFUSED the player filter and the source filter (each answers \"is this a player?\"); a reading viewer is not",
      impl: {
        ...REAL,
        load: async (sp, reads = false, now) => {
          const v = await realLoad(sp, reads, now);
          if (v.kind !== "refused" || v.refusal !== "role") return v;
          return { ...(await realLoad(sp, true, now)), viewerReads: false };
        },
      },
    },
    {
      name: "U24 · the pager goes back to U20's builder, which carries only q/sort/dir — page 2 drops every filter",
      expect: "11g · ⛔ every link is built by contactsHref — it carries the filters and the sort, never page unless asked, NEVER edit; SortTh gets the same flat params",
      impl: { ...REAL, sources: { ...REAL_SOURCES, page: REAL_SOURCES.page.replace("const baseHref = contactsHref(sp);", 'const baseHref = buildBaseHref("/admin/contacts", { q: sp.q, sort: sp.sort, dir: sp.dir });') } },
    },
    {
      name: "U22's dialog key rides along — an href builder that copies every param, `edit` included",
      expect: "11g · ⛔ every link is built by contactsHref — it carries the filters and the sort, never page unless asked, NEVER edit; SortTh gets the same flat params",
      impl: {
        ...REAL,
        href: (sp, patch) => {
          const base = contactsHref(sp, patch);
          const edit = Array.isArray(sp.edit) ? sp.edit[0] : sp.edit;
          return edit ? `${base}${base.includes("?") ? "&" : "?"}edit=${encodeURIComponent(edit)}` : base;
        },
      },
    },

    /* ── U21 · the plan's RED line, each in memory ─────────────────────────────────────────────── */
    {
      name: "🔴 A1.1 · the loader lets a masked viewer filter by source or consent — rows for a number they typed",
      expect: U21.role,
      impl: {
        ...REAL,
        load: async (sp, reads = false, now) => {
          const v = await realLoad(sp, reads, now);
          if (v.kind !== "refused" || v.refusal !== "role") return v;
          return { ...(await realLoad(sp, true, now)), viewerReads: false };
        },
      },
    },
    {
      name: "🔴 A1.1 · the rail draws the Consent and Source axes for a masked viewer",
      expect: U21.role,
      impl: { ...REAL, rail: (input) => contactRail({ ...input, reads: true }) },
    },
    {
      name: "a hand-typed 2020-edition operator map — Vodacom 74/75/76/79 without 072, Tigo for Yas",
      expect: U21.operators,
      impl: {
        ...REAL,
        rail: (input) => {
          const r = contactRail(input);
          return {
            ...r,
            groups: r.groups.map((g) => (g.param !== "op" ? g : {
              ...g,
              options: [g.options[0], ...HAND_TYPED_2020.map((o) => ({ key: o.id, label: o.brand, title: railOperatorTitle(o.ndcs), href: contactsHref(input.sp, { op: o.id }), on: false }))],
            })),
          };
        },
      },
    },
    {
      name: "the pills keep ?page — a filter change lands on a page that may not exist",
      expect: U21.hrefs,
      impl: { ...REAL, rail: (input) => mapPills(contactRail(input), (o) => ({ ...o, href: `${o.href}${o.href.includes("?") ? "&" : "?"}page=3` })) },
    },
    {
      name: "the pills drop the search and the other axes — each pill written as its own param alone",
      expect: U21.hrefs,
      impl: {
        ...REAL,
        rail: (input) => mapPills(contactRail(input), (o, g) => ({
          ...o, href: o.key === "" ? "/admin/contacts" : `/admin/contacts?${new URLSearchParams({ [g.param]: o.key })}`,
        })),
      },
    },
    {
      name: "only the top-N tags are drawn — an applied tag outside them vanishes, and cannot be seen or cleared",
      expect: U21.applied,
      impl: {
        ...REAL,
        rail: (input) => {
          const r = contactRail(input);
          const top = new Set((input.tags ?? []).slice(0, TAG_RAIL_CAP).map((t) => t.tag));
          return { ...r, groups: r.groups.map((g) => (g.param !== "tag" ? g : { ...g, options: g.options.filter((o) => o.key === "" || top.has(o.key)) })) };
        },
      },
    },
    {
      name: "the rail is gated on rows — a filter that matches nothing takes the rail with it",
      expect: U21.noMatch,
      impl: { ...REAL, sources: { ...REAL_SOURCES, page: REAL_SOURCES.page.replace("{!emptyBook && <ContactFilters", "{rows.length > 0 && !emptyBook && <ContactFilters") } },
    },
    {
      name: "the Operator column reads the stored c.operator — \"Tigo\" under the Yas pill",
      expect: U21.column,
      impl: { ...REAL, sources: { ...REAL_SOURCES, page: REAL_SOURCES.page.replace('{operatorBrand(c.ndc) ?? "—"}', '{c.operator ?? operatorBrand(c.ndc) ?? "—"}') } },
    },
    {
      name: "an unreadable value is drawn as Any — the rail says \"whole book\" while the table refuses",
      expect: U21.unreadable,
      impl: {
        ...REAL,
        rail: (input) => {
          const r = contactRail(input);
          return {
            ...r,
            groups: r.groups.map((g) => {
              const typed = g.options.filter((o) => o.on && o.label.startsWith("“"));
              if (typed.length === 0) return g;
              return { ...g, options: g.options.filter((o) => !typed.includes(o)).map((o) => (o.key === "" ? { ...o, on: true } : o)) };
            }),
          };
        },
      },
    },
    {
      name: "a failed read hides the list and tag filters — the officer cannot see or clear what is applied",
      expect: U21.error,
      impl: {
        ...REAL,
        rail: (input) => {
          const r = contactRail(input);
          return input.lists === null || input.tags === null ? { ...r, groups: r.groups.filter((g) => g.param !== "list" && g.param !== "tag") } : r;
        },
      },
    },
    {
      name: "the tag counts are kept under another filter — a number the click will not show",
      expect: U21.counts,
      impl: {
        ...REAL,
        rail: (input) => {
          const counts = new Map((input.tags ?? []).map((t) => [t.tag, t.count]));
          return mapPills(contactRail(input), (o, g) => (g.param === "tag" && o.key !== "" ? { ...o, count: counts.get(o.key) } : o));
        },
      },
    },
    {
      name: "the rail loses its data-filter-rail hook — invisible to filter-language and to every live probe",
      expect: U21.file,
      impl: { ...REAL, sources: { ...REAL_SOURCES, rail: REAL_SOURCES.rail.replace('data-filter-rail="contacts"', 'data-rail="contacts"') } },
    },
    {
      name: "the vocabulary typed twice — page.tsx keeps a CONSENT map of its own beside the copy module's",
      expect: U21.vocab,
      impl: { ...REAL, sources: { ...REAL_SOURCES, page: REAL_SOURCES.page.replace("const REACH:", 'const CONSENT = { UNKNOWN: "No consent recorded" };\nconst REACH:') } },
    },
    {
      name: "the refused view arrives without the rail's options — a refused page draws a rail with no lists or tags",
      expect: U21.options,
      impl: {
        ...REAL,
        load: async (sp, reads = false, now) => {
          const v = await realLoad(sp, reads, now);
          return v.kind === "refused" ? { ...v, lists: [], tags: [] } : v;
        },
      },
    },
    {
      name: "the rail drops its Any pills — an address with nothing applied has no pill in force, and no axis can be cleared",
      expect: U21.rail,
      impl: { ...REAL, rail: (input) => { const r = contactRail(input); return { ...r, groups: r.groups.map((g) => ({ ...g, options: g.options.filter((o) => o.key !== "") })) }; } },
    },

    /* ── U21 follow-up (the adversarial review) ─────────────────────────────────────────────────── */
    {
      name: "a failed read offers no Clear filters — N filters cost N presses of Any",
      expect: U21.error,
      impl: { ...REAL, rail: (input) => ({ ...contactRail(input), clear: null }) },
    },
    {
      name: "the rail draws its own Clear filters beside the page's — one control said twice",
      expect: U21.error,
      impl: {
        ...REAL,
        rail: (input) => {
          const r = contactRail(input);
          const applied = Object.keys(contactsLinkSp(input.sp)).some((k) => k !== "q" && k !== "sort" && k !== "dir");
          return { ...r, clear: applied ? { label: "Clear filters", href: contactsClearFiltersHref(input.sp) } : null };
        },
      },
    },
    {
      name: "the window pill keeps range in its href — pressing it changes nothing",
      expect: U21.extension,
      impl: {
        ...REAL,
        rail: (input) => mapPills(contactRail(input), (o, g) => (g.semantics === "toggle" && (g.param === "range" || g.param === "from" || g.param === "to") ? { ...o, href: contactsHref(input.sp) } : o)),
      },
    },
    {
      name: "a lone-Any List axis drawn with nothing to offer and nothing applied — a control with no job",
      expect: U21.extension,
      impl: {
        ...REAL,
        rail: (input) => {
          const r = contactRail(input);
          if (r.groups.some((g) => g.param === "list")) return r;
          const lone: RailGroup = { param: "list", label: RAIL_KEYS.list, semantics: "tab", options: [{ key: "", label: RAIL_ANY, href: contactsHref(input.sp, { list: null }), on: true }] };
          return { ...r, groups: [...r.groups, lone] };
        },
      },
    },
    {
      name: "a long label drawn whole — a 60-character list name runs off a 360px screen",
      expect: U21.fit,
      impl: { ...REAL, rail: (input) => mapPills(contactRail(input), (o) => (o.label.endsWith("…") && o.title !== undefined ? { ...o, label: o.title } : o)) },
    },

    /* ── 🔴 OD54 · D19 covers SUPPRESSION too — each defect on its own assertion ──────────────────────── */
    {
      name: "🔴 OD54 · the role rule forgets the stop — a masked viewer's ?suppressed= reads rows, and a typed number's stop answers \"is this a player?\"",
      expect: OD54.axis,
      impl: {
        ...REAL,
        role: (f, reads) => roleRefusal({ ...f, suppressed: null }, reads),
        // The loader as it reads under that rule: a refusal on `suppressed` becomes the reader's list.
        load: async (sp, reads = false, now) => {
          const v = await realLoad(sp, reads, now);
          if (v.kind !== "refused" || v.refusal !== "role" || v.param !== "suppressed") return v;
          return { ...(await realLoad(sp, true, now)), viewerReads: false };
        },
      },
    },
    {
      name: "🔴 OD54 · the rail draws the Suppressed axis for a masked viewer — a pill for a filter that role may not ask",
      expect: U21.role,
      impl: {
        ...REAL,
        rail: (input) => {
          const r = contactRail(input);
          if (input.reads || r.groups.some((g) => g.param === "suppressed")) return r;
          const stops = contactRail({ ...input, reads: true }).groups.find((g) => g.param === "suppressed");
          return stops ? { ...r, groups: [stops, ...r.groups] } : r;
        },
      },
    },
    {
      name: "🔴 OD54 · a stop chip rendered for every viewer — a row tells GROWTH that the number it typed is under a stop",
      expect: OD54.chip,
      impl: {
        ...REAL,
        sources: {
          ...REAL_SOURCES,
          page: REAL_SOURCES.page.replace("{reads && c.userId && <Chip", '{c.suppressedAt && <Chip size="sm" variant="warning" className="ml-2">Suppressed</Chip>}{reads && c.userId && <Chip'),
        },
      },
    },
    {
      name: "🔴 OD54 · the masked band's second fact is the book's stops again — Suppressed under another name",
      expect: OD54.recent,
      impl: {
        ...REAL,
        load: async (sp, reads = false, now) => {
          const v = await realLoad(sp, reads, now);
          return v.addedRecently === null ? v : { ...v, addedRecently: v.summary.suppressed };
        },
      },
    },
    {
      name: "OD54 · the window drifts from the vocabulary's rolling 7d — eight days counted, so A, a day before the bound, slips in",
      expect: OD54.recent,
      impl: {
        ...REAL,
        load: async (sp, reads = false, now) => {
          const v = await realLoad(sp, reads, now);
          if (v.addedRecently === null) return v;
          const from = new Date((now ?? Date.now()) - 8 * DAY_MS).toISOString();
          return { ...v, addedRecently: await contactAudience({ ...WHOLE_BOOK, addedFrom: from }).count() };
        },
      },
    },
    {
      name: "🔴 pre-vb3 · '+255 0712…' read as a 13-digit typo — the search box ran it as a NAME query, which finds nobody",
      expect: "1c · ⭐ vb3 · '+255 0712 345 678' — the trunk zero written after the country code — finds EXACTLY that contact, never a name search that finds nobody (EXECUTED)",
      impl: {
        ...REAL,
        // The pre-vb3 parser refused the spelling as too long, so the loader got a name query; "zzzz" is one that, like
        // the digits it stands for, no contact's name holds.
        load: (sp, reads = false, now) =>
          realLoad(/^(?:00)?2550[0-9]{9}$/.test(String(sp.q ?? "").replace(/[^0-9]/g, "")) ? { ...sp, q: "zzzz" } : sp, reads, now),
      },
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
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
