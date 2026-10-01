/**
 * test:contacts-page — U20's guard: the contact book's list at /admin/contacts.
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script: the REAL loader (`contacts-loader.ts`,
 * the one the page calls) over the memory twin — the four spellings of one number, a part of a number, a
 * name, the page clamp, the whole-book KPIs, both sorts and their tiebreak. Then the source, for what only
 * the source can show: every number through `<Sensitive field="contactPhone">` (U19), the Prisma twin
 * matching a number EXACTLY, the "Reachable" column never naming a player's protected standing.
 *
 * ⛔ A PART OF A NUMBER NEVER SEARCHES THE NUMBER. GROWTH sees every number masked; a substring search on
 * `msisdn` would let that role rebuild a number digit by digit. §2 and §8 hold it from both ends.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY (a search, a loader, a source
 * string) and requires the MATCHING assertion to fail. This file makes no file-writing call.
 *
 * Run:  npm run test:contacts-page
 * Red:  npm run red:contacts-page
 */
process.exitCode = 1;

import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import type { StoredMarketingContact, ContactBookSummary } from "../src/lib/server/store.ts";
import { contactsSearch, operatorBrand } from "../src/app/admin/contacts/contacts-query.ts";
import { loadContacts } from "../src/app/admin/contacts/contacts-loader.ts";
import type { ContactsParams, ContactsView } from "../src/app/admin/contacts/contacts-loader.ts";
import { PER_PAGE } from "../src/components/admin/admin-pagination.tsx";
import { parseTzNumber } from "../src/lib/tz-msisdn.ts";

const PROVE_RED = process.argv.includes("--prove-red");

const read = (rel: string) => decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8")).replace(/\r\n/g, "\n");
/** The body of `<name>: (` / `<name>: async (` inside a `marketingContact: {` namespace, brace-matched. */
function memberBody(src: string, member: string): string {
  const ns = src.indexOf("\n  marketingContact: {");
  const at = src.indexOf(`\n    ${member}: `, ns);
  if (ns < 0 || at < 0) return "";
  const open = src.indexOf("{", src.indexOf("=>", at));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(at, i + 1); }
  }
  return "";
}

type Sources = { page: string; prismaPage: string; memoryPage: string; loader: string };
const REAL_SOURCES: Sources = {
  page: read("src/app/admin/contacts/page.tsx"),
  loader: read("src/app/admin/contacts/contacts-loader.ts"),
  prismaPage: memberBody(read("src/lib/server/prisma-dal.ts"), "page"),
  memoryPage: memberBody(read("src/lib/server/store.ts"), "page"),
};

type Impl = {
  search: typeof contactsSearch;
  load: (sp: ContactsParams) => Promise<ContactsView>;
  sources: Sources;
};
// ⚠️ A script has no session, so the D19 viewer check is injected (`reads`); the page gets the real one.
const REAL: Impl = { search: contactsSearch, load: (sp) => loadContacts(sp, contactsSearch, async () => false), sources: REAL_SOURCES };

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

const WHOLE_BOOK: ContactBookSummary = { total: 4, given: 1, unknown: 2, withdrawn: 1, suppressed: 1 };

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const ids = (v: ContactsView) => v.result.rows.map((r) => r.id).join(",");

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
    part.msisdn === null && (await impl.load({ q: "0712345" })).result.total === 0, JSON.stringify(part.msisdn));

  // ── 3 · A NAME ───────────────────────────────────────────────────────────────────────────────
  ok(p("3 · a name finds by name, case-insensitively, through the shared grammar"),
    ids(await impl.load({ q: "baraka" })) === B.id && (await impl.load({ q: "ASHA" })).result.total === 2);

  // ── 4 · PAGE 4 OF A 3-ROW RESULT IS PAGE 1 ─────────────────────────────────────────────────────
  const clamped = await impl.load({ page: "4", sort: "operator", dir: "asc" });
  ok(p("4 · ⭐ page 4 of a short result renders its rows (page 1), never \"no matches\""),
    clamped.page === 1 && clamped.result.rows.length === 4, `page ${clamped.page}, ${clamped.result.rows.length} rows`);
  ok(p("4b · a page that is not a number is page 1"), (await impl.load({ page: "abc" })).page === 1);

  // ── 5 · THE KPIs ARE THE WHOLE BOOK ────────────────────────────────────────────────────────────
  const filtered = await impl.load({ q: "baraka" });
  ok(p("5 · ⭐ the KPIs are the WHOLE book — a search does not move them"),
    JSON.stringify(filtered.summary) === JSON.stringify(WHOLE_BOOK), JSON.stringify(filtered.summary));

  // ── 6 · ORDER ────────────────────────────────────────────────────────────────────────────────
  const opAsc = await impl.load({ sort: "operator", dir: "asc" });
  ok(p("6 · \"Operator\" sorts by the PREFIX, and a tie on the prefix breaks on id"),
    opAsc.result.rows.map((r) => r.ndc).join(",") === [C, A, D, B].map((r) => r.ndc).join(",") && ids(opAsc) === [C, A, D, B].map((r) => r.id).join(","),
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

  // ── 8 · THE TWINS MATCH A NUMBER EXACTLY ───────────────────────────────────────────────────────
  const pri = impl.sources.prismaPage, mem = impl.sources.memoryPage;
  ok(p("8 · ⛔ the Prisma twin matches the number EXACTLY, takes names through queryToWhere, and orders nameless last with an id tiebreak"),
    pri.includes("{ msisdn: q.msisdn }") && pri.includes("queryToWhere(q.name, CONTACT_SEARCH)")
      && pri.includes('nulls: "last"') && pri.includes("{ id: q.dir }") && !/msisdn:\s*\{/.test(pri),
    `${pri.length} chars`);
  ok(p("8b · ⛔ …and so does the memory twin — equality on the key, the shared matcher for names"),
    mem.includes("c.msisdn === q.msisdn") && mem.includes("matchesQuery(nameQuery") && !/msisdn\.(includes|startsWith|indexOf)\(/.test(mem),
    `${mem.length} chars`);

  // ── 9 · "REACHABLE" NEVER NAMES A PROTECTED STANDING ───────────────────────────────────────────
  const reach = page.slice(page.indexOf("const REACH"), page.indexOf("};", page.indexOf("const REACH")));
  const protectedKeys = ["rg_self_excluded", "rg_cooling_off", "rg_harm_marker", "rg_under25_history", "age_minor", "account_status"];
  ok(p("9 · ⛔ a self-exclusion, a break, a harm marker, an age or an account status reads only \"Not reachable\""),
    protectedKeys.every((k) => reach.includes(`${k}: "Not reachable",`)), reach.slice(0, 80));

  // ── 9b · 🔴 D19 · NO ROW-BY-ROW PLAYER SIGNAL FOR A ROLE THAT MAY NOT READ A NUMBER ───────────────
  const readsSeen = (await impl.load({})).viewerReads;
  ok(p("9b · ⛔ D19 · the loader hands the page the viewer's read cell — a masked viewer gets viewerReads false"),
    readsSeen === false && (await loadContacts({}, contactsSearch, async () => true)).viewerReads === true, String(readsSeen));
  ok(p("9c · ⛔ D19 · Reachable, Source and the Player chip render ONLY when the viewer reads — and the gate is not even asked otherwise"),
    page.includes('{reads && <th className="text-left">Reachable</th>}') && page.includes('{reads && <th className="text-left">Source</th>}')
      && page.includes("{reads && c.userId && <Chip") && page.includes("const reach = reads ? await Promise.all(rows.map(reachOf)) : [];")
      && page.includes("{reads && <td><Chip") && page.includes("{reads && <td className=\"whitespace-nowrap\">{SOURCE[c.source]}</td>}"));
  ok(p("9d · ⛔ D19 · the read cell is asked in the .ts loader — identity.contact through mayReveal, failing closed"),
    impl.sources.loader.includes('mayReveal(role, "identity.contact")') && impl.sources.loader.includes("if (!session) return false;"));

  // ── 10 · THE OPERATOR LABEL COMES FROM THE ONE TABLE ───────────────────────────────────────────
  ok(p("10 · the operator brand comes from the numbering table, and an unknown prefix has none"),
    typeof operatorBrand(A.ndc) === "string" && operatorBrand("00") === null, String(operatorBrand(A.ndc)));
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

  /** A loader as somebody would write it without the clamp, or without the whole-book KPIs. */
  const naiveLoad = (opts: { clamp: boolean; wholeBook: boolean }) => async (sp: ContactsParams): Promise<ContactsView> => {
    const query = contactsSearch(sp.q);
    const sort = sp.sort === "name" || sp.sort === "operator" ? sp.sort : "added";
    const dir = sp.dir === "asc" ? "asc" : "desc";
    const requested = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
    const at = (pg: number) => db.marketingContact.page({ ...query, sort, dir, offset: (pg - 1) * PER_PAGE, limit: PER_PAGE });
    let result = await at(requested);
    let page = requested;
    if (opts.clamp && result.rows.length === 0 && requested > 1) { page = 1; result = await at(1); }
    const summary = opts.wholeBook ? await db.marketingContact.summary() : {
      total: result.total, given: result.rows.filter((r) => r.consentState === "GIVEN").length,
      unknown: result.rows.filter((r) => r.consentState === "UNKNOWN").length,
      withdrawn: result.rows.filter((r) => r.consentState === "WITHDRAWN").length,
      suppressed: result.rows.filter((r) => r.suppressedAt !== null).length,
    };
    return { summary, result, page, sort, dir, viewerReads: false };
  };

  const CASES: Array<{ name: string; expect: string; impl: Impl }> = [
    {
      name: "the search box keeps the digits as typed — no parseTzNumber, so 0712… and 712… find nothing",
      expect: "1 · ⭐ the four spellings of one number each find EXACTLY that contact (EXECUTED)",
      impl: {
        ...REAL,
        load: (sp) => loadContacts(sp, (raw) => {
          const t = (raw ?? "").trim();
          return t ? { msisdn: t.replace(/[^0-9]/g, ""), name: null } : { msisdn: null, name: null };
        }, async () => false),
      },
    },
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
      name: "the Prisma twin searches INSIDE the number — a masked role can rebuild it digit by digit",
      expect: "8 · ⛔ the Prisma twin matches the number EXACTLY, takes names through queryToWhere, and orders nameless last with an id tiebreak",
      impl: { ...REAL, sources: { ...REAL_SOURCES, prismaPage: REAL_SOURCES.prismaPage.replace("{ msisdn: q.msisdn }", "{ msisdn: { contains: q.msisdn } }") } },
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
