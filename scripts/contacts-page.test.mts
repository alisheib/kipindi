/**
 * test:contacts-page — U20's guard: the contact book's list at /admin/contacts. U24: the address's filters.
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script: the REAL loader (`contacts-loader.ts`,
 * the one the page calls) over the memory twin — the four spellings of one number, a part of a number, a
 * name, the page clamp, the whole-book KPIs, both sorts and their tiebreak, and (U24) a filter in the address,
 * an unreadable filter refused, D19's player filter refused to a masked viewer. Then the source, for what only
 * the source can show: every number through `<Sensitive field="contactPhone">` (U19), the "Reachable" column
 * never naming a player's protected standing, every link built by the ONE href builder.
 *
 * ⛔ A PART OF A NUMBER NEVER SEARCHES THE NUMBER. GROWTH sees every number masked; a substring search on
 * `msisdn` would let that role rebuild a number digit by digit. §2 holds it here; the twins' exact match
 * (U20's §8/§8b) moved to `test:dal-parity` §21.msisdn with U24, where both translations now live.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY (a loader, a source string, an
 * href builder) and requires the MATCHING assertion to fail. This file makes no file-writing call.
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
import type { StoredMarketingContact, ContactBookSummary } from "../src/lib/server/store.ts";
import { contactsSearch, toAudienceWhere, WHOLE_BOOK } from "../src/lib/server/marketing/audience.ts";
import { operatorBrand, contactsHref, contactsLinkSp, contactsClearFiltersHref } from "../src/app/admin/contacts/contacts-query.ts";
import { loadContacts } from "../src/app/admin/contacts/contacts-loader.ts";
import type { ContactsParams, ContactsView } from "../src/app/admin/contacts/contacts-loader.ts";
import { PER_PAGE } from "../src/components/admin/admin-pagination.tsx";
import { parseTzNumber } from "../src/lib/tz-msisdn.ts";

const PROVE_RED = process.argv.includes("--prove-red");

const read = (rel: string) => decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8")).replace(/\r\n/g, "\n");

type Sources = { page: string; loader: string };
const REAL_SOURCES: Sources = {
  page: read("src/app/admin/contacts/page.tsx"),
  loader: read("src/app/admin/contacts/contacts-loader.ts"),
};

type Impl = {
  search: typeof contactsSearch;
  /** The page's loader. `reads` is D19's read cell — a script has no session, so it is injected. */
  load: (sp: ContactsParams, reads?: boolean) => Promise<ContactsView>;
  href: typeof contactsHref;
  sources: Sources;
};
const realLoad = (sp: ContactsParams, reads = false) => loadContacts(sp, { reads: async () => reads });
const REAL: Impl = { search: contactsSearch, load: realLoad, href: contactsHref, sources: REAL_SOURCES };

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

/* ── FIXTURES — four contacts, through the store method the importers will call ──────────────── */
function row(id: string, local: string, displayName: string | null, consentState: StoredMarketingContact["consentState"], day: number, suppressed = false): StoredMarketingContact {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`fixture ${local} does not parse`);
  const at = `2026-09-0${day}T10:00:00.000Z`;
  return {
    id, msisdn: p.msisdn, rawInput: local, displayName, email: null, ndc: p.ndc, operator: null,
    source: "IMPORT", sourceRef: null, userId: null, consentState, suppressedAt: suppressed ? at : null,
    tags: [], notes: null, importId: null, createdAt: at, createdBy: null, updatedAt: at, updatedBy: null,
  };
}
const A = row("mc_t_a", "0712345678", "Asha Mwakalinga", "GIVEN", 1);
const B = row("mc_t_b", "0754000111", "Baraka Juma", "UNKNOWN", 2, true);
const C = row("mc_t_c", "0621000222", null, "WITHDRAWN", 3);
const D = row("mc_t_d", "0713000333", "Asha Mwakalinga", "UNKNOWN", 4);
for (const r of [A, B, C, D]) await db.marketingContact.create(r);

const WHOLE_BOOK_COUNTS: ContactBookSummary = { total: 4, given: 1, unknown: 2, withdrawn: 1, suppressed: 1 };

/** The rows a view lists, or `REFUSED:<param>` — so a refusal can never read as "no rows". */
const ids = (v: ContactsView) => (v.kind === "ok" ? v.result.rows.map((r) => r.id).join(",") : `REFUSED:${v.param}`);
const total = (v: ContactsView) => (v.kind === "ok" ? v.result.total : -1);

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
  ok(p("7c · a failed read is AdminLoadError and \"unavailable\" tiles — never a zero"),
    page.includes('<AdminLoadError what="the contact book" />') && (page.match(/unavailable=\{failed\}/g) ?? []).length === 4);
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
      && page.includes("{reads && <td><Chip") && page.includes("{reads && <td className=\"whitespace-nowrap\">{SOURCE[c.source]}</td>}"));
  const maskedConsent = await impl.load({ consent: "GIVEN" });
  const readerConsent = await impl.load({ consent: "GIVEN" }, true);
  ok(p("9f · ⛔ A1.1 · a masked viewer is REFUSED ?consent= by role; a reader gets the rows"),
    maskedConsent.kind === "refused" && (maskedConsent as { refusal?: string; param?: string }).refusal === "role"
      && (maskedConsent as { param?: string }).param === "consent" && readerConsent.kind === "ok",
    `${maskedConsent.kind} / ${readerConsent.kind}`);
  ok(p("9e · ⛔ A1.1 · the per-row Consent column renders ONLY for a reader — until U33 a consent is a player's"),
    page.includes('{reads && <th className="text-left">Consent</th>}') && page.includes("{reads && <td><Chip size=\"sm\" variant={consent.variant}>")
      && page.includes("const cols = reads ? 8 : 5;"));
  ok(p("9d · ⛔ D19 · the read cell is asked in the .ts loader — identity.contact through mayReveal, failing closed"),
    impl.sources.loader.includes('mayReveal(role, "identity.contact")') && impl.sources.loader.includes("if (!session) return false;"));

  // ── 10 · THE OPERATOR LABEL COMES FROM THE ONE TABLE ───────────────────────────────────────────
  ok(p("10 · the operator brand comes from the numbering table, and an unknown prefix has none"),
    typeof operatorBrand(A.ndc) === "string" && operatorBrand("00") === null, String(operatorBrand(A.ndc)));

  // ── 11 · U24 · THE ADDRESS'S FILTERS, THROUGH THE ONE RESOLVER ─────────────────────────────────
  const vod = await impl.load({ op: "VODACOM" });
  ok(p("11 · ⭐ a filter in the address narrows the list (op=VODACOM is the 075 row alone), says so in words, and the KPIs stay the WHOLE book"),
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
        load: async (sp, reads = false) => {
          const v = await realLoad(sp, reads);
          return v.kind === "refused" && v.refusal === "unreadable" ? realLoad({}, reads) : v;
        },
      },
    },
    {
      name: "🔴 D19 · the loader lets a masked viewer filter by player — a membership oracle typed into the address",
      expect: "11c · 🔴 D19 · a viewer who may not read a number is REFUSED the player filter and the source filter (each answers \"is this a player?\"); a reading viewer is not",
      impl: {
        ...REAL,
        load: async (sp, reads = false) => {
          const v = await realLoad(sp, reads);
          if (v.kind !== "refused" || v.refusal !== "role") return v;
          return { ...(await realLoad(sp, true)), viewerReads: false };
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
