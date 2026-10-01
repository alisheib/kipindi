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
 *   · ADMIN — the role that may reveal gets the eye AND Copy on every row, and the eye shows `+255…`.
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
    ok(`${vp.name} · LOADING · the ghost is on screen and the real page is not yet`, !!ghostK && ghostK.h > 0 && realYet === null, JSON.stringify({ ghostK, realYet }));
    await shoot(page, `${vp.name}-loading`);
    await page.unroute("**src_app_admin_contacts_page_tsx**");
    await page.waitForSelector('[data-block="contacts-kpis"]', { timeout: 30000 });
    await wait(800);
    const realK = await boxOf(page, '[data-block="contacts-kpis"]');
    const realC = await boxOf(page, '[data-block="contacts-card"]');
    measured[vp.name] = { ghostK, realK, ghostTop: ghostC?.top, realTop: realC?.top };
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
  // A two-word chip broke onto two lines on the first drive ("NO / CONSENT") — every chip label stays one line.
  const chipHeights = await page.$$eval("[data-contact-row] span.whitespace-nowrap", (els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  ok(`${vp.name} · POPULATED · every Consent chip sits on ONE line`, chipHeights.length === 20 && Math.max(...chipHeights) <= 18, `${chipHeights.length} chips, max ${Math.max(...chipHeights)}px`);
  // 🔴 D19 · a role that may not read a number gets no row-by-row player signal.
  const headGrowth = await page.locator('[data-block="contacts-card"] thead').innerText();
  ok(`${vp.name} · D19 · GROWTH sees NO Reachable column, NO Source column and NO Player chip`,
    !/reachable/i.test(headGrowth) && !/source/i.test(headGrowth) && (await page.getByText("Player", { exact: true }).count()) === 0, headGrowth.replace(/[^A-Za-z( )·]+/g, " "));
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
  await shoot(page, "360x780-reduced");
  await ctx.close();
}

await browser.close();
console.log(`\nMEASURED ${JSON.stringify(measured)}`);
console.log(`\nu20-contacts-drive: ${pass} passed, ${fail} failed`);
console.log(`shots: ${SHOTS}`);
if (fail) process.exitCode = 1;
