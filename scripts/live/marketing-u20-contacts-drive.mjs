/**
 * U20 · /admin/contacts — the list, driven and MEASURED, every state the unit names.
 *
 * WHAT THIS PROVES, at 1280x800 and 360x780 (+ reduced motion), with HeadlessChrome in the UA:
 *   · EMPTY BOOK — before any contact exists: the empty row, zero tiles, no search box;
 *   · LOADING — the ghost's KPI band equals the real band's box, and the card's top edge does not move
 *     (`loading.tsx` explains why the rows below cannot be equal by construction);
 *   · POPULATED — a page of 20, every number masked `+255••••NN` for GROWTH with NO eye and NO copy;
 *   · SEARCH — a whole number in two spellings finds exactly one row; a PART of a number is no-match
 *     (with the clear action), never a number search;
 *   · PAGE CLAMP — page 4 of a 5-row result renders the 5 rows;
 *   · ERROR — a failed read is "Couldn't load the contact book", never a zero;
 *   · ADMIN — the role that may reveal gets the eye AND Copy on every row, and the eye shows `+255…`;
 *   · U24 — a filter in the address (`?op=VODACOM&consent=GIVEN`): only matching rows, the "Showing contacts: …"
 *     line, the whole-book tiles, sort and pager links that carry the filter; a filter matching nothing; the clamp
 *     under a filter; an unreadable filter (`?op=NOKIA`, `?from=2026-13-40`) REFUSED with the parameter named;
 *     and D19's player filter refused to GROWTH.
 *   · U21 — THE FILTER RAIL (`[data-filter-rail="contacts"]`), read by its own stamps (`data-rail-group`,
 *     `data-chip`, `aria-current`), never by class strings:
 *       NONE APPLIED — GROWTH's rail is Suppressed · Operator · Tag (A1.1: no Consent, no Source), every axis on
 *         Any, every pill 32px (the dense rank, recorded against --tap-min), the count line "45 contacts", and a
 *         tag pill's count FOLLOWED (pressing "vip" lists exactly its count);
 *       APPLIED, ONE AXIS — the Vodacom pill PRESSED (the app's own Link): the address says op=VODACOM, the pill
 *         is in force, every Operator cell reads Vodacom, the count line says "N of 45", the tiles stay 45;
 *       COMBINED, PAGED, RE-SORTED — page 2 of a filtered, name-sorted list, then a pill, then a sort header:
 *         every step keeps the filters and the sort and drops the page; and the plan's own Accept address
 *         (`?op=VODACOM&tag=vip&sort=name&dir=asc&page=2`) whose every link carries both filters and the sort;
 *       NO-MATCH — `?op=TTCL` with a search: no rows, the rail STILL drawn with TTCL in force, and Clear filters
 *         keeps the search and the sort;
 *       THE MASKED RAIL — GROWTH's `?source=REGISTRATION` is the role refusal, the rail still drawn, with no Source
 *         axis; a reader (ADMIN) gets all six axes (`?list=nope` draws the List axis, "Unknown list" in force);
 *       ERROR — a failed read with `?op=VODACOM&tag=vip`: the rail drawn from the address, both values in force,
 *         the search box still there;
 *       LOADING — the rail's ghost is on screen, and its height against the real rail is RECORDED at both widths
 *         (role- and data-shaped, so not equal by construction — `loading.tsx` says why).
 * The rows come from `/api/dev-test/marketing-contacts-seed`, through the store method the importers will
 * call (nothing writes a contact yet — U22/U25+). Every capture asserts what it photographed first.
 *
 * Run: BASE=http://localhost:3010 node scripts/live/marketing-u20-contacts-drive.mjs
 * Boot (in-memory, zero prod risk; remove .next first — a stale .next 404s every /api/dev-test route):
 *   SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3010
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = join(".qa-shots", "marketing-setup", "u20");
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const MASK = /^\+255•{4}\d{2}$/;

const browser = await chromium.launch();

async function staffCtx(role, phone, viewport, reducedMotion = "no-preference") {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role, phone, name: `QA ${role}` } });
  if (!r.ok()) throw new Error(`seed-admin ${role} failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}

const seed = async (page, query) => {
  const r = await page.request.post(`${BASE}/api/dev-test/marketing-contacts-seed?${query}`);
  if (!r.ok()) throw new Error(`seed ${query} failed: ${r.status()}`);
  return r.json();
};

const boxOf = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round((r.top + window.scrollY) * 100) / 100, h: Math.round(r.height * 100) / 100, w: Math.round(r.width * 100) / 100 };
}, selector);

const mainText = (page) => page.evaluate(() => document.querySelector("main#main-content")?.innerText ?? "");
const overflowOf = (page) => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));

async function openContacts(page, query = "") {
  await page.goto(`${BASE}/admin/contacts${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-block="contacts-card"]', { timeout: 30000 });
  await wait(700);
}

/** Viewport tiles only (never full-page): the top, then the table scrolled into view. */
async function shoot(page, name, scrollTo = null) {
  if (scrollTo) await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), scrollTo);
  else await page.evaluate(() => window.scrollTo(0, 0));
  await wait(250);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

/* ── U21 · THE RAIL, read by its own stamps — never by a class string ──────────────────────────────────────────── */
const RAIL = '[data-filter-rail="contacts"]';
const railGroups = (page) => page.$$eval(`${RAIL} [data-rail-group]`, (els) => els.map((e) => e.getAttribute("data-rail-group") || ""));
const railChips = (page, prefix = "") => page.$$eval(`${RAIL} a[data-chip]`, (els, pre) => els.map((e) => e.getAttribute("data-chip") || "").filter((c) => c.startsWith(pre)), prefix);
const currentChips = (page) => page.$$eval(`${RAIL} a[data-chip][aria-current="page"]`, (els) => els.map((e) => e.getAttribute("data-chip") || ""));
const pressedChips = (page) => page.$$eval(`${RAIL} a[data-chip][aria-pressed="true"]`, (els) => els.map((e) => e.getAttribute("data-chip") || ""));
const pillHeights = (page) => page.$$eval(`${RAIL} a[data-chip]`, (els) => els.map((e) => Math.round(e.getBoundingClientRect().height * 100) / 100));
const railLinks = (page) => page.$$eval(`${RAIL} a[data-chip]`, (els) => els.map((e) => ({ chip: e.getAttribute("data-chip") || "", href: e.getAttribute("href") || "" })));
const sortLinks = (page) => page.locator('[data-block="contacts-card"] thead a[href*="sort="]').evaluateAll((as) => as.map((a) => a.getAttribute("href") || ""));
// ⛔ An ABSENT element is asked with count() first: a bare innerText()/getAttribute() WAITS Playwright's whole default
// timeout for it (30 s — measured by review on the error state, where there is no count line), then the catch says "".
const chipCount = async (page, chip) => {
  const loc = page.locator(`${RAIL} a[data-chip="${chip}"]`);
  return (await loc.count()) > 0 ? loc.first().getAttribute("data-count") : null;
};
const railCount = async (page) => {
  const loc = page.locator(`${RAIL} [data-rail-count]`);
  return (await loc.count()) > 0 ? ((await loc.first().innerText()) || "").trim() : "";
};
const tapMin = (page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--tap-min").trim());
const paramsOf = (href) => new URL(href, "http://x").searchParams;

/** Wait until the address carries exactly what `want` says (null = absent). A pill or a sort header is a CLIENT
 *  navigation (no load event) and Clear filters a plain <a> (a full one); `waitForURL` follows both, then the card. */
async function waitForParams(page, want) {
  await page.waitForURL((u) => Object.entries(want).every(([k, v]) => (v === null ? !u.searchParams.has(k) : u.searchParams.get(k) === v)), { timeout: 30000 });
  await page.waitForSelector('[data-block="contacts-card"]', { timeout: 30000 });
  await wait(900);
}
/** Press a rail pill — the app's own <Link>, never an injected anchor (an injected <a> is a HARD navigation). */
async function pressPill(page, chip, want) {
  await page.locator(`${RAIL} a[data-chip="${chip}"]`).first().click();
  await waitForParams(page, want);
}
/** ⛔ Every U21 capture asserts what it photographs first: the page's own heading, and exactly the rail it claims. */
async function railShot(page, vp, name, wantGroups, scrollTo = null) {
  const h1 = ((await page.locator("main#main-content h1").first().innerText().catch(() => "")) || "").trim();
  const groups = await railGroups(page);
  ok(`${vp} · ${name} · the capture shows the Contacts heading and exactly the rail it claims [${wantGroups.join(", ") || "no rail"}]`,
    h1 === "Contacts" && groups.join(",") === wantGroups.join(","), `h1="${h1}" groups=[${groups.join(", ")}]`);
  await shoot(page, `${vp}-${name}`, scrollTo);
}

const VIEWPORTS = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "360x780", width: 360, height: 780 },
];

// ── EMPTY BOOK — first, while the book has nothing in it ──────────────────────────────────────
for (const vp of VIEWPORTS) {
  console.log(`\n[u20] empty book · ${vp.name}`);
  const { ctx, page } = await staffCtx("GROWTH", "+255700002001", { width: vp.width, height: vp.height });
  const ua = await page.evaluate(() => navigator.userAgent);
  ok(`${vp.name} · UA carries HeadlessChrome`, /HeadlessChrome/.test(ua));
  await openContacts(page);
  const text = await mainText(page);
  ok(`${vp.name} · EMPTY · the empty row says the book is empty`, /No contacts yet/.test(text), text.slice(0, 120));
  ok(`${vp.name} · EMPTY · no search box on an empty book`, (await page.locator('[data-block="contacts-card"] input').count()) === 0);
  ok(`${vp.name} · EMPTY · the tiles read zero, not a dash`, /In the book\s*0/i.test(text), text.slice(0, 160));
  ok(`${vp.name} · EMPTY · no horizontal page overflow`, (await overflowOf(page)) === 0);
  // U21 · an empty book has nothing to filter: no rail, exactly as there is no search box.
  ok(`${vp.name} · U21 EMPTY · no filter rail on an empty book`, (await page.locator(RAIL).count()) === 0);
  await shoot(page, `${vp.name}-empty`);
  await ctx.close();
}

// ── SEED 45 ────────────────────────────────────────────────────────────────────────────────────
{
  const { ctx, page } = await staffCtx("GROWTH", "+255700002002", { width: 1280, height: 800 });
  const s = await seed(page, "count=45");
  ok("seed · 45 contacts are in the book", s.total === 45, JSON.stringify(s));
  await ctx.close();
}

const measured = {};
for (const vp of VIEWPORTS) {
  console.log(`\n[u20] ${vp.name}`);
  const viewport = { width: vp.width, height: vp.height };
  const { ctx, page } = await staffCtx("GROWTH", "+255700002003", viewport);

  // ── LOADING — hold the page chunk, client-navigate in, measure the ghost, then the real page ──
  // ⚠️ The held handler may wake after `unroute` released the request — Playwright then reports "already
  // handled". That is the instrument racing itself (measured: it crashed the first run mid-way), not a product
  // signal, so the late continue is allowed to find the route gone.
  await page.route("**src_app_admin_contacts_page_tsx**", async (route) => { await wait(5000); await route.continue().catch(() => {}); });
  await page.goto(BASE + "/admin/bonuses", { waitUntil: "domcontentloaded" });
  await wait(2500);
  const anchor = await page.waitForSelector('a[href="/admin/contacts"]', { state: "attached", timeout: 15000 }).catch(() => null);
  ok(`${vp.name} · the Contacts nav anchor is in the DOM`, !!anchor);
  if (anchor) {
    await page.evaluate(() => document.querySelector('a[href="/admin/contacts"]').click());
    await page.waitForSelector('[data-skeleton="contacts-kpis"]', { timeout: 15000 }).catch(() => {});
    const ghostK = await boxOf(page, '[data-skeleton="contacts-kpis"]');
    const ghostC = await boxOf(page, '[data-skeleton="contacts-card"]');
    const realYet = await boxOf(page, '[data-block="contacts-kpis"]');
    // U21 · the rail's ghost, under the search strip's.
    const ghostR = await boxOf(page, '[data-skeleton="contacts-rail"]');
    ok(`${vp.name} · LOADING · the ghost is on screen and the real page is not yet`, !!ghostK && ghostK.h > 0 && realYet === null, JSON.stringify({ ghostK, realYet }));
    ok(`${vp.name} · U21 LOADING · the rail's ghost is on screen, inside the card ghost`, !!ghostR && ghostR.h > 0 && !!ghostC && ghostR.top > ghostC.top, JSON.stringify({ ghostR, ghostCTop: ghostC?.top }));
    await shoot(page, `${vp.name}-loading`);
    await page.unroute("**src_app_admin_contacts_page_tsx**");
    await page.waitForSelector('[data-block="contacts-kpis"]', { timeout: 30000 });
    await wait(800);
    const realK = await boxOf(page, '[data-block="contacts-kpis"]');
    const realC = await boxOf(page, '[data-block="contacts-card"]');
    const realR = await boxOf(page, RAIL);
    // ⚠️ RECORDED, NOT ASSERTED EQUAL: the real rail is role- and data-shaped (loading.tsx says why); the delta is
    // printed in MEASURED so a reader sees how far the swap moves the table, at both widths.
    measured[vp.name] = { ghostK, realK, ghostTop: ghostC?.top, realTop: realC?.top, railGhostH: ghostR?.h, railRealH: realR?.h, railDelta: ghostR && realR ? Math.round((realR.h - ghostR.h) * 100) / 100 : null };
    ok(`${vp.name} · LOADING · the KPI band's height equals the real band's within 1px`,
      !!ghostK && !!realK && Math.abs(ghostK.h - realK.h) <= 1, `${ghostK?.h} vs ${realK?.h}`);
    ok(`${vp.name} · LOADING · the card's top edge does not move when the page swaps in (within 1px)`,
      !!ghostC && !!realC && Math.abs(ghostC.top - realC.top) <= 1, `${ghostC?.top} vs ${realC?.top}`);
  }

  // ── POPULATED ────────────────────────────────────────────────────────────────────────────────
  await openContacts(page);
  const rows = page.locator("[data-contact-row]");
  ok(`${vp.name} · POPULATED · a page of 20`, (await rows.count()) === 20, String(await rows.count()));
  const numbers = await page.locator("[data-contact-row] td:nth-child(2)").allInnerTexts();
  ok(`${vp.name} · POPULATED · every number is masked +255••••NN for GROWTH`, numbers.length === 20 && numbers.every((t) => MASK.test(t.trim())), numbers.slice(0, 3).join(" | "));
  ok(`${vp.name} · POPULATED · GROWTH has NO eye and NO copy control`, (await page.locator("button.sensitive-reveal").count()) === 0);
  // 🔴 D19 · a role that may not read a number gets no row-by-row player signal.
  const headGrowth = await page.locator('[data-block="contacts-card"] thead').innerText();
  ok(`${vp.name} · D19 · GROWTH sees NO Consent, Reachable or Source column and NO Player chip (D19 + A1.1)`,
    !/reachable/i.test(headGrowth) && !/source/i.test(headGrowth) && !/consent/i.test(headGrowth) && (await page.getByText("Player", { exact: true }).count()) === 0, headGrowth.replace(/[^A-Za-z( )·]+/g, " "));
  ok(`${vp.name} · POPULATED · the pager is there (45 contacts, 3 pages)`, (await page.locator('a[href*="page=2"]').count()) > 0);
  const text = await mainText(page);
  ok(`${vp.name} · POPULATED · the whole-book tiles: 45 in the book`, /In the book\s*45/i.test(text), text.slice(0, 160));
  ok(`${vp.name} · POPULATED · the Operator header says it sorts by the prefix`, /Operator \(by prefix\)/i.test(text));
  ok(`${vp.name} · POPULATED · no horizontal page overflow (the table scrolls inside its card)`, (await overflowOf(page)) === 0, `${await overflowOf(page)}px`);
  await shoot(page, `${vp.name}-populated`);
  await shoot(page, `${vp.name}-populated-rows`, '[data-block="contacts-card"]');

  // ── SEARCH ───────────────────────────────────────────────────────────────────────────────────
  for (const q of ["0711 000 000", "+255711000000"]) {
    await openContacts(page, `?q=${encodeURIComponent(q)}`);
    ok(`${vp.name} · SEARCH · "${q}" finds exactly one contact`, (await rows.count()) === 1, String(await rows.count()));
  }
  ok(`${vp.name} · SEARCH · the tiles still read the whole book`, /In the book\s*45/i.test(await mainText(page)));
  await shoot(page, `${vp.name}-search-one`);
  await openContacts(page, `?q=${encodeURIComponent("0711000")}`);
  const nm = await mainText(page);
  ok(`${vp.name} · NO MATCH · a PART of a number is not searched — the no-match row says so`, (await rows.count()) === 0 && /No contacts match/.test(nm) && /part of a number is not searched/.test(nm), nm.slice(0, 200));
  ok(`${vp.name} · NO MATCH · it offers to clear the search`, (await page.getByRole("link", { name: "Clear search" }).count()) === 1);
  await shoot(page, `${vp.name}-no-match`, '[data-block="contacts-card"]');

  // ── PAGE CLAMP ───────────────────────────────────────────────────────────────────────────────
  await openContacts(page, "?q=Asha&page=4");
  ok(`${vp.name} · CLAMP · page 4 of a 5-row result renders the 5 rows`, (await rows.count()) === 5, String(await rows.count()));

  // ── U24 · FILTERS IN THE ADDRESS, THROUGH THE ONE RESOLVER ─────────────────────────────────────
  // GROWTH reads no number, so its columns are Name · Number · Operator · Lists·Tags · Added (D19 + A1.1: no Consent,
  // Reachable or Source) — and it filters only by the axes a masked role may use; consent is asserted REFUSED below.
  await openContacts(page, "?op=VODACOM&suppressed=no");
  const fOps = await page.locator("[data-contact-row] td:nth-child(3)").allInnerTexts();
  ok(`${vp.name} · U24 FILTERED · only Vodacom rows, none suppressed`,
    fOps.length > 0 && fOps.every((t) => /^Vodacom$/i.test(t.trim())),
    `${fOps.length} rows: ${[...new Set(fOps.map((t) => t.trim()))].join("/")}`);
  const lead = ((await page.locator('[data-block="contacts-filtered"]').innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
  ok(`${vp.name} · U24 FILTERED · the line says, in words, what the list is narrowed to — with Clear filters`,
    /Showing contacts:\s*Operator: Vodacom · Not suppressed\s*Clear filters/i.test(lead), lead);
  ok(`${vp.name} · U24 FILTERED · the KPI band is still the WHOLE book`, /In the book\s*45/i.test(await mainText(page)));
  const sortHrefs = await page.locator('[data-block="contacts-card"] thead a[href*="sort="]').evaluateAll((as) => as.map((a) => a.getAttribute("href") || ""));
  ok(`${vp.name} · U24 FILTERED · every sort link carries the filters (one href builder)`,
    sortHrefs.length === 3 && sortHrefs.every((h) => h.includes("op=VODACOM") && h.includes("suppressed=no") && !h.includes("page=")), sortHrefs.join(" | "));
  ok(`${vp.name} · U24 FILTERED · no horizontal page overflow`, (await overflowOf(page)) === 0, `${await overflowOf(page)}px`);
  await shoot(page, `${vp.name}-u24-filtered`);

  await openContacts(page, "?suppressed=no");
  const pagerHrefs = await page.locator('a[href*="page=2"]').evaluateAll((as) => as.map((a) => a.getAttribute("href") || ""));
  ok(`${vp.name} · U24 PAGER · the pager's links carry the filter (41 unsuppressed rows, 3 pages)`,
    pagerHrefs.length > 0 && pagerHrefs.every((h) => h.includes("suppressed=no")), pagerHrefs.join(" | "));

  await openContacts(page, "?op=TTCL");
  const ttcl = await mainText(page);
  ok(`${vp.name} · U24 NO MATCH · a filter that matches nothing says so, offers Clear filters, and the KPIs stand`,
    (await rows.count()) === 0 && /No contacts match/.test(ttcl) && (await page.getByRole("link", { name: "Clear filters" }).count()) >= 1 && /In the book\s*45/i.test(ttcl),
    ttcl.slice(0, 200));
  await shoot(page, `${vp.name}-u24-no-match`, '[data-block="contacts-card"]');

  await openContacts(page, "?op=VODACOM&page=99");
  ok(`${vp.name} · U24 CLAMP · page 99 under a filter renders the clamped page's rows, never "no matches"`, (await rows.count()) > 0, String(await rows.count()));

  for (const [query, param] of [["?op=NOKIA", "op"], ["?from=2026-13-40", "from"]]) {
    await openContacts(page, query);
    const ref = await mainText(page);
    ok(`${vp.name} · U24 UNREADABLE ${query} · "This filter can't be read", naming “${param}”, no rows, Clear filters, KPIs still the whole book`,
      (await rows.count()) === 0 && /This filter can.t be read/.test(ref) && ref.includes(`“${param}”`)
        && (await page.getByRole("link", { name: "Clear filters" }).count()) === 1 && /In the book\s*45/i.test(ref),
      ref.slice(0, 240));
    await shoot(page, `${vp.name}-u24-unreadable-${param}`, '[data-block="contacts-card"]');
  }
  // U21 · the refused value is still DRAWN — as typed, in force on its own axis — and that axis's Any clears it.
  await openContacts(page, "?op=NOKIA");
  const nokiaAny = (await railLinks(page)).find((l) => l.chip === "op:");
  ok(`${vp.name} · U21 UNREADABLE · the rail draws the typed value in force on the Operator axis, and Any clears it`,
    (await currentChips(page)).join(",") === "suppressed:,op:NOKIA,tag:" && !!nokiaAny && !paramsOf(nokiaAny.href).has("op"),
    `[${await currentChips(page)}] Any → ${nokiaAny?.href}`);

  // 🔴 D19 · the player filter is a membership oracle for a role that may not read a number.
  await openContacts(page, "?player=yes");
  const d19 = await mainText(page);
  const d19Box = d19.slice(Math.max(0, d19.indexOf("This filter")), d19.indexOf("This filter") + 240);
  ok(`${vp.name} · U24 D19 · GROWTH is refused the player filter — no rows, the reason in words`,
    (await rows.count()) === 0 && /This filter isn.t available/.test(d19) && /isn.t available to your role: it would show which numbers belong to players/.test(d19), d19Box);
  await shoot(page, `${vp.name}-u24-d19-refused`, '[data-block="contacts-card"]');
  // U21 · and the masked rail draws no Player pill for it (A1.1: no player signal of any kind for this viewer).
  ok(`${vp.name} · U21 D19 · the masked rail draws no Player pill for the refused ?player=, and no Consent or Source axis`,
    (await railChips(page, "player:")).length === 0 && (await railGroups(page)).join(",") === "suppressed,op,tag",
    `[${await railGroups(page)}]`);
  // A1.1 · until U33 a recorded consent can only come from a player, so a typed consent axis is refused the same way.
  await openContacts(page, "?op=VODACOM&consent=GIVEN");
  const a11 = await mainText(page);
  ok(`${vp.name} · U24 A1.1 · GROWTH is refused a typed consent filter too — no rows, the same reason`,
    (await rows.count()) === 0 && /This filter isn.t available/.test(a11) && /isn.t available to your role/.test(a11) && /In the book\s*45/i.test(a11),
    a11.slice(Math.max(0, a11.indexOf("This filter")), a11.indexOf("This filter") + 200));

  // ── U21 · THE FILTER RAIL, as GROWTH sees it (a masked viewer) ─────────────────────────────────────
  // A1.1 · GROWTH's rail is Suppressed · Operator · Tag: no Consent and no Source (and no List — the seed writes none).
  const MASKED_RAIL = ["suppressed", "op", "tag"];
  await openContacts(page);
  const noneCurrent = await currentChips(page);
  const heights = await pillHeights(page);
  const tm = await tapMin(page);
  ok(`${vp.name} · U21 NONE APPLIED · GROWTH's rail is Suppressed · Operator · Tag — no Consent, no Source (A1.1) — every axis on Any`,
    (await railGroups(page)).join(",") === MASKED_RAIL.join(",") && noneCurrent.join(",") === "suppressed:,op:,tag:"
      && (await railChips(page, "consent:")).length === 0 && (await railChips(page, "source:")).length === 0 && (await railChips(page, "player:")).length === 0,
    `groups [${await railGroups(page)}] current [${noneCurrent}]`);
  ok(`${vp.name} · U21 NONE APPLIED · every pill is the dense 32px (recorded against --tap-min ${tm})`,
    heights.length > 8 && heights.every((h) => Math.abs(h - 32) <= 0.6), `${heights.length} pills: ${[...new Set(heights)].join("/")}px`);
  measured[vp.name] = { ...(measured[vp.name] ?? {}), pillH: [...new Set(heights)], tapMin: tm };
  ok(`${vp.name} · U21 NONE APPLIED · the count line reads "45 contacts", and the tag pills carry the book's counts (vip 15, dar 15)`,
    (await railCount(page)) === "45 contacts" && (await chipCount(page, "tag:vip")) === "15" && (await chipCount(page, "tag:dar")) === "15",
    `${await railCount(page)} · vip=${await chipCount(page, "tag:vip")} dar=${await chipCount(page, "tag:dar")}`);
  ok(`${vp.name} · U21 NONE APPLIED · no horizontal page overflow with the rail drawn`, (await overflowOf(page)) === 0, `${await overflowOf(page)}px`);
  await railShot(page, vp.name, "u21-rail-none", MASKED_RAIL);
  // ⭐ A count is shown only where it is what the pill lists: press "vip" and the list is exactly that many.
  const vipCount = await chipCount(page, "tag:vip");
  await pressPill(page, "tag:vip", { tag: "vip" });
  ok(`${vp.name} · U21 COUNT TRUTH · pressing the "vip" pill (count ${vipCount}) lists exactly that many`,
    !!vipCount && (await railCount(page)) === `${vipCount} of 45 contacts` && (await currentChips(page)).includes("tag:vip"), await railCount(page));

  // ── U21 · APPLIED, ONE AXIS — the Vodacom pill pressed from a bare address ──
  await openContacts(page);
  await pressPill(page, "op:VODACOM", { op: "VODACOM", page: null });
  const vOps = await page.locator("[data-contact-row] td:nth-child(3)").allInnerTexts();
  const vLine = await railCount(page);
  ok(`${vp.name} · U21 APPLIED · the address says op=VODACOM, the Vodacom pill is in force, every Operator cell reads Vodacom`,
    (await currentChips(page)).join(",") === "suppressed:,op:VODACOM,tag:" && vOps.length > 0 && vOps.every((t) => t.trim() === "Vodacom"),
    `${vOps.length} rows: ${[...new Set(vOps.map((t) => t.trim()))].join("/")} · current [${await currentChips(page)}]`);
  ok(`${vp.name} · U21 APPLIED · the count line says how many of the book, and the KPI tiles stay the WHOLE book`,
    vLine === `${vOps.length} of 45 contacts` && /In the book\s*45/i.test(await mainText(page)), vLine);
  await railShot(page, vp.name, "u21-applied-op", MASKED_RAIL);

  // ── U21 · COMBINED, PAGED, RE-SORTED — every step keeps the filters and the sort, and drops the page ──
  await openContacts(page, "?suppressed=no&sort=name&dir=asc");
  await page.locator('a[href*="page=2"]').first().click();
  await waitForParams(page, { suppressed: "no", sort: "name", dir: "asc", page: "2" });
  const p2Rows = await rows.count();
  ok(`${vp.name} · U21 PAGED · page 2 of a filtered, name-sorted list keeps the filter and the sort`,
    p2Rows > 0 && (await currentChips(page)).includes("suppressed:no"), `${p2Rows} rows on page 2 · ${page.url()}`);
  await pressPill(page, "op:AIRTEL", { op: "AIRTEL", suppressed: "no", sort: "name", dir: "asc", page: null });
  ok(`${vp.name} · U21 PAGED → PILL · a pill pressed on page 2 keeps the other filter and the sort, and lands on page 1`,
    (await currentChips(page)).join(",") === "suppressed:no,op:AIRTEL,tag:" && (await rows.count()) > 0, `[${await currentChips(page)}] ${page.url()}`);
  await page.locator('[data-block="contacts-card"] thead a[href*="sort=added"]').first().click();
  await waitForParams(page, { op: "AIRTEL", suppressed: "no", sort: "added", page: null });
  ok(`${vp.name} · U21 RE-SORTED · a sort header keeps both filters, and the page stays dropped`,
    (await currentChips(page)).join(",") === "suppressed:no,op:AIRTEL,tag:", page.url());
  await railShot(page, vp.name, "u21-combined", MASKED_RAIL);
  // ⭐ The plan's own Accept: page 2 of ?op=VODACOM&tag=vip sorted by name still carries both filters and the sort
  // (the seed holds four such rows, so page 2 clamps to page 1 — and every link must STILL carry everything).
  await openContacts(page, "?op=VODACOM&tag=vip&sort=name&dir=asc&page=2");
  const acceptLinks = await railLinks(page);
  const acceptSorts = await sortLinks(page);
  const keepsBoth = (href, axis) => { const s = paramsOf(href); return (axis === "op" || s.get("op") === "VODACOM") && (axis === "tag" || s.get("tag") === "vip") && !s.has("page"); };
  ok(`${vp.name} · U21 ACCEPT · on ?op=VODACOM&tag=vip&sort=name&dir=asc&page=2 every pill keeps the other filter and the sort, every sort link keeps both filters, nothing carries page`,
    (await rows.count()) === 4 && acceptLinks.length > 8
      && acceptLinks.every(({ chip, href }) => keepsBoth(href, chip.split(":")[0]) && paramsOf(href).get("sort") === "name" && paramsOf(href).get("dir") === "asc")
      && acceptSorts.length === 3 && acceptSorts.every((h) => keepsBoth(h, ""))
      && (await currentChips(page)).join(",") === "suppressed:,op:VODACOM,tag:vip",
    `${await rows.count()} rows · ${acceptLinks.length} pills · ${acceptSorts.join(" | ")}`);

  // ── U21 · NO-MATCH WITH THE RAIL STILL DRAWN — and Clear filters keeps the search and the sort ──
  await openContacts(page, "?op=TTCL&q=Asha&sort=name&dir=asc");
  const nmText = await mainText(page);
  ok(`${vp.name} · U21 NO MATCH · no rows, yet the whole rail is still drawn with TTCL in force`,
    (await rows.count()) === 0 && /No contacts match/.test(nmText) && (await currentChips(page)).join(",") === "suppressed:,op:TTCL,tag:",
    `[${await currentChips(page)}] ${nmText.slice(0, 120)}`);
  await railShot(page, vp.name, "u21-no-match", MASKED_RAIL);
  await page.getByRole("link", { name: "Clear filters" }).first().click();
  await waitForParams(page, { op: null, q: "Asha", sort: "name", dir: "asc" });
  ok(`${vp.name} · U21 NO MATCH → CLEAR FILTERS · the filter goes, the search and the sort stay, and the rows come back`,
    (await rows.count()) === 5 && (await currentChips(page)).join(",") === "suppressed:,op:,tag:", `${await rows.count()} rows · ${page.url()}`);

  // ── U21 · THE MASKED RAIL — GROWTH's typed ?source= is the role refusal; the rail stays, with no Source axis ──
  await openContacts(page, "?source=REGISTRATION");
  const srcText = await mainText(page);
  ok(`${vp.name} · U21 MASKED · ?source=REGISTRATION is the role refusal with no rows, and the rail is still drawn — with no Source or Consent pill`,
    (await rows.count()) === 0 && /isn.t available to your role/.test(srcText)
      && (await railChips(page, "source:")).length === 0 && (await railChips(page, "consent:")).length === 0,
    `[${await railGroups(page)}] ${srcText.slice(Math.max(0, srcText.indexOf("This filter")), srcText.indexOf("This filter") + 120)}`);
  await railShot(page, vp.name, "u21-masked-refused", MASKED_RAIL, '[data-block="contacts-card"]');

  // ── ERROR ────────────────────────────────────────────────────────────────────────────────────
  await seed(page, "fault=1");
  await openContacts(page);
  const et = await mainText(page);
  ok(`${vp.name} · ERROR · a failed read says so — never a zero`, /Couldn.t load the contact book/i.test(et) && !/In the book\s*0/i.test(et), et.slice(0, 200));
  // The first drive's error box sat inside the scrolling table and its sentence was cut at 360.
  const errBox = await page.evaluate(() => {
    const p = Array.from(document.querySelectorAll("main#main-content p")).find((e) => /load the contact book/i.test(e.textContent || ""));
    const box = p?.closest("div.rounded-md");
    if (!box) return null;
    const r = box.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth };
  });
  ok(`${vp.name} · ERROR · the whole error box is on screen — not clipped by the table`, !!errBox && errBox.left >= 0 && errBox.right <= errBox.vw, JSON.stringify(errBox));
  await shoot(page, `${vp.name}-error`);
  // ── U21 · ERROR WITH A FILTER APPLIED — the rail drawn from the ADDRESS (§5.15), the search box still there ──
  await openContacts(page, "?op=VODACOM&tag=vip");
  const erText = await mainText(page);
  ok(`${vp.name} · U21 ERROR · a failed read still draws the rail from the address — Vodacom and "vip" in force and clearable — and keeps the search box`,
    /Couldn.t load the contact book/i.test(erText) && (await currentChips(page)).join(",") === "suppressed:,op:VODACOM,tag:vip"
      && (await railChips(page, "tag:")).join(",") === "tag:,tag:vip" && (await page.locator('[data-block="contacts-card"] input').count()) === 1
      && (await railCount(page)) === "",
    `[${await currentChips(page)}] tags [${await railChips(page, "tag:")}]`);
  await railShot(page, vp.name, "u21-error-rail", MASKED_RAIL);
  // The page draws no Clear filters of its own on a failed read (no "Showing contacts:" line, no table) — the rail
  // draws the ONE, and pressing it removes both filters while the page stays in its error state.
  const railClear = page.locator(RAIL).getByRole("link", { name: "Clear filters" });
  ok(`${vp.name} · U21 ERROR · the rail offers the ONE Clear filters on a failed read`,
    (await railClear.count()) === 1 && (await page.getByRole("link", { name: "Clear filters" }).count()) === 1,
    `${await railClear.count()} in the rail · ${await page.getByRole("link", { name: "Clear filters" }).count()} on the page`);
  await railClear.first().click();
  await waitForParams(page, { op: null, tag: null });
  ok(`${vp.name} · U21 ERROR → CLEAR FILTERS · both filters go and the rail stays, still saying the read failed`,
    (await railGroups(page)).join(",") === "suppressed,op" && (await currentChips(page)).join(",") === "suppressed:,op:"
      && /Couldn.t load the contact book/i.test(await mainText(page)),
    `[${await railGroups(page)}] ${page.url()}`);
  await seed(page, "fault=0");
  await ctx.close();

  // ── ADMIN — the role that may reveal ───────────────────────────────────────────────────────────
  const adm = await staffCtx("ADMIN", "+255700002004", viewport);
  await openContacts(adm.page);
  const eyes = await adm.page.locator('button[aria-label="Reveal Contact number"]').count();
  const copies = await adm.page.locator('button[aria-label="Copy Contact number"]').count();
  ok(`${vp.name} · ADMIN · every row has the eye AND Copy`, eyes === 20 && copies === 20, `${eyes} eyes, ${copies} copies`);
  const headAdmin = await adm.page.locator('[data-block="contacts-card"] thead').innerText();
  ok(`${vp.name} · ADMIN · the role that may read a number sees Reachable and Source`, /reachable/i.test(headAdmin) && /source/i.test(headAdmin));
  const reach = await adm.page.locator("[data-contact-row] td:nth-child(5)").allInnerTexts();
  ok(`${vp.name} · ADMIN · Reachable names the gate's real reasons (age, suppressed, no consent)`,
    reach.some((t) => /age not confirmed/i.test(t)) && reach.some((t) => /suppressed/i.test(t)) && reach.some((t) => /no consent/i.test(t)),
    [...new Set(reach.map((t) => t.trim()))].join(" | "));
  const adminChips = await adm.page.$$eval("[data-contact-row] span.whitespace-nowrap", (els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  ok(`${vp.name} · ADMIN · Consent and Reachable chips each sit on ONE line`, adminChips.length === 40 && Math.max(...adminChips) <= 18, `${adminChips.length} chips, max ${Math.max(...adminChips)}px`);
  await shoot(adm.page, `${vp.name}-admin-rows`, '[data-block="contacts-card"]');
  // A reader's columns: Name · Number · Operator · Consent · Reachable · Source · Lists·Tags · Added.
  await openContacts(adm.page, "?op=VODACOM&consent=GIVEN");
  const aOps = await adm.page.locator("[data-contact-row] td:nth-child(3)").allInnerTexts();
  const aConsent = await adm.page.locator("[data-contact-row] td:nth-child(4)").allInnerTexts();
  ok(`${vp.name} · ADMIN · U24 FILTERED · the reader filters by consent: only Vodacom rows with consent given`,
    aOps.length > 0 && aOps.every((t) => /^Vodacom$/i.test(t.trim())) && aConsent.length === aOps.length && aConsent.every((t) => /^given$/i.test(t.trim())),
    `${aOps.length} rows: ${[...new Set(aOps.map((t) => t.trim()))].join("/")} · ${[...new Set(aConsent.map((t) => t.trim()))].join("/")}`);
  const aLead = ((await adm.page.locator('[data-block="contacts-filtered"]').innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
  ok(`${vp.name} · ADMIN · U24 FILTERED · the line says Operator: Vodacom · Consent: given, with Clear filters`,
    /Showing contacts:\s*Operator: Vodacom · Consent: given\s*Clear filters/i.test(aLead), aLead);
  await shoot(adm.page, `${vp.name}-admin-u24-filtered`, '[data-block="contacts-card"]');
  // ── U21 · THE READER'S RAIL — all six axes (an applied list draws the List axis, "Unknown list" in force) ──
  const READER_RAIL = ["consent", "suppressed", "op", "source", "list", "tag"];
  await openContacts(adm.page, "?list=nope");
  const listPill = adm.page.locator(`${RAIL} a[data-chip="list:nope"]`);
  ok(`${vp.name} · ADMIN · U21 READER RAIL · a reader gets all six axes, and the unknown list is a selected "Unknown list" pill`,
    (await railGroups(adm.page)).join(",") === READER_RAIL.join(",") && (await listPill.getAttribute("aria-current").catch(() => null)) === "page"
      && ((await listPill.innerText().catch(() => "")) || "").trim() === "Unknown list" && (await adm.page.locator("[data-contact-row]").count()) === 0,
    `[${await railGroups(adm.page)}]`);
  await railShot(adm.page, vp.name, "u21-reader-rail", READER_RAIL);
  // A reader's COMBINED + PAGED + RE-SORTED: page 2 of source=IMPORT, not suppressed, by name — then the Consent pill.
  await openContacts(adm.page, "?source=IMPORT&suppressed=no&sort=name&dir=asc");
  await adm.page.locator('a[href*="page=2"]').first().click();
  await waitForParams(adm.page, { source: "IMPORT", suppressed: "no", sort: "name", dir: "asc", page: "2" });
  const ap2 = await adm.page.locator("[data-contact-row]").count();
  await pressPill(adm.page, "consent:GIVEN", { consent: "GIVEN", source: "IMPORT", suppressed: "no", sort: "name", dir: "asc", page: null });
  const aGiven = await adm.page.locator("[data-contact-row] td:nth-child(4)").allInnerTexts();
  ok(`${vp.name} · ADMIN · U21 COMBINED · page 2 of a two-filter, name-sorted list, then the Consent pill: every filter and the sort kept, the page dropped, every row Given`,
    ap2 > 0 && aGiven.length > 0 && aGiven.every((t) => /^given$/i.test(t.trim()))
      && (await currentChips(adm.page)).join(",") === "consent:GIVEN,suppressed:no,op:,source:IMPORT,tag:",
    `${ap2} rows on page 2 · ${aGiven.length} Given · [${await currentChips(adm.page)}]`);
  await railShot(adm.page, vp.name, "u21-reader-combined", ["consent", "suppressed", "op", "source", "tag"]);
  await openContacts(adm.page);
  await adm.page.locator('button[aria-label="Reveal Contact number"]').first().click();
  await adm.page.waitForSelector('button[aria-label="Hide Contact number"]', { timeout: 15000 }).catch(() => {});
  const shown = (await adm.page.locator('button[aria-label="Hide Contact number"]').first().innerText().catch(() => "")).trim();
  ok(`${vp.name} · ADMIN · the eye reveals the +255 spelling, after the audited round trip`, /^\+255[67][0-9]{8}$/.test(shown), shown);
  await shoot(adm.page, `${vp.name}-admin-reveal`, '[data-block="contacts-card"]');
  await adm.ctx.close();
}

// ── reduced motion, at the narrow width ──────────────────────────────────────────────────────
{
  console.log(`\n[u20] prefers-reduced-motion: reduce (360x780)`);
  const { ctx, page } = await staffCtx("GROWTH", "+255700002005", { width: 360, height: 780 }, "reduce");
  ok("reduced-motion · the context really is reduced-motion", await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches));
  await openContacts(page);
  ok("reduced-motion · the populated page renders its 20 rows", (await page.locator("[data-contact-row]").count()) === 20);
  ok("reduced-motion · U21 · the rail is drawn, GROWTH's three axes on Any", (await railGroups(page)).join(",") === "suppressed,op,tag"
    && (await currentChips(page)).join(",") === "suppressed:,op:,tag:", `[${await railGroups(page)}]`);
  await shoot(page, "360x780-reduced");
  await ctx.close();
}

await browser.close();
console.log(`\nMEASURED ${JSON.stringify(measured)}`);
console.log(`\nu20-contacts-drive: ${pass} passed, ${fail} failed`);
console.log(`shots: ${SHOTS}`);
if (fail) process.exitCode = 1;
