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
 *   · U22 — ADD AND EDIT ONE CONTACT (`contact-form.tsx`), every state the unit names:
 *       BLANK — on the EMPTY book (whose row names "Add contact") and on the populated one: focus in the number field,
 *         never the ✕; Consent "Not recorded" with the form's sentence; Save disabled;
 *       TYPING — "71" gives the Yas chip and "2 of 9 digits"; "60" the Airtel chip, flagged disputed;
 *       REFUSED — "64" at two digits with the Telxer sentence; "71234" then Tab with the too-short sentence; a PASTED
 *         +254 712 345 678 with the foreign sentence, never "Mbeya";
 *       CHECKING — the duplicate lookup's RESPONSE held (fetched, held, fulfilled — never the request): the checking line
 *         and Save still disabled; SAVING — the add's response held: Save busy, the dialog aria-busy, Escape refused;
 *       SAVED — "Contact added", the dialog gone, the new row first, "In the book" up by exactly one;
 *       DUPLICATE (the Accept) — a number saved typed, then PASTED as +255…: ONE row, the duplicate sentence and its
 *         link, no "save anyway" anywhere; the link opens `?edit=<id>`;
 *       EDIT — GROWTH sees the number masked with no eye and no Copy, and NO consent chip (A1.1); ADMIN sees the eye,
 *         Copy, and the mirrored consent; STALE — two tabs, the second save refused with Reload;
 *       MISSING — `?edit=mc_nope` AND `?edit=` of the ERASED fixture read the same refusal (A1.7), and Close drops `edit`;
 *       ERASED — adding the erased number is refused with one sentence and no link (C3);
 *       A1.1 — GROWTH adding a seeded PLAYER's number (ledger GIVEN) is told no consent value at all, while ADMIN adding a
 *         number whose ledger says WITHDRAWN reads "Withdrawn" (the mirror);
 *       ERROR — the add fulfilled with HTTP 500: the danger line, the typing kept, Save available again;
 *       the head's ghost reserves the button's box (measured), 0px overflow, and at 360 the dialog's Save is reachable.
 *   · U23 — THE SELECTION AND THE BULK BAR (`contacts-bulk-bar.tsx`), read by its own stamps (`data-block="contacts-bulk-bar"`,
 *     `data-bulk-*`, `data-edit-contact`), never by a class string — and every column selector above moved one place right
 *     for the select column (`COL`). LAST, because it tags contacts, creates lists and adds a row:
 *       NONE — the bar's sentence; all six actions ON SCREEN, disabled, each saying "Tick at least one contact"; the consent
 *         note; every row's box named by its name, a nameless row by its MASKED number (never a number); the header box;
 *       EDIT LINK — every row's "edit" link is ?edit=<that row's id> with the filter and the sort kept, no page, no number;
 *         pressed once, it opens that contact's dialog;
 *       TICKED ACROSS PAGES — two rows, the header box indeterminate; the pager (a client navigation) keeps them:
 *         "3 selected · 2 not on this page";
 *       CONFIRM · ENUMERATE — 22 ticked rows: the server names twenty, every number masked, then "and 2 more", no typed word;
 *       SELECT ALL N MATCHING — the whole page ticked offers it; pressed, "All N matching selected"; a search change clears it,
 *         and the bar says so;
 *       CONFIRM · TYPED — "Type N to confirm" with N the SERVER's count, Confirm disabled until exactly N; Suppress's
 *         permanence and Remove's kept records in words (both cancelled); a typed Tag run end to end, its result counted;
 *       REFUSED BY THE SERVER — a contact added between the preview and the confirmation: the recount refuses with both
 *         counts, and nothing is written;
 *       ERROR — the run answered with HTTP 500: the error card says contacts MAY have changed and claims no count, the
 *         selection is kept, and "Review it again" asks the server for a fresh preview;
 *       PARAMETERS — "a,b" refused in U28's words beside the box, Escape refused once typed; a new list by name; the same
 *         name in other capitals refused;
 *       ACTING → DONE — the run's RESPONSE held: "Tagging 2 contacts…"; released: "2 tagged · 0 already had it", the
 *         selection cleared; GROWTH's withdrawal told the TOTAL only (A1.1), a reader's the split;
 *       D19 — GROWTH's refused ?player= offers nothing to select; a READER's confirmation names the rows masked too;
 *       VIEW-ONLY — the AUDITOR role given Growth view without act: the banner, a box still ticks, every action disabled WITH
 *         the act gate's sentence, every "edit" link still there;
 *       LOADING — the bar's ghost is on screen under the rail's, its height RECORDED against the real bar;
 *       reduced motion at 360 — the confirmation and the overlay open, and Cancel closes the confirmation at once.
 * The rows come from `/api/dev-test/marketing-contacts-seed` (`?count=45`, `?u22=1` for the form's fixtures, and for U23
 * `?u23grant=view-only|reset` and `?u23moved=1`), through the ONE create builder the form uses. Every capture asserts what
 * it photographed first.
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
/** U23 · THE SELECT COLUMN IS FIRST, so every data column moved one place right: Name 2, Number 3, Operator 4, and for a
 *  reader Consent 5 and Reachable 6. Named once, so no selector counts columns by hand. */
const COL = { number: 3, operator: 4, consent: 5, reach: 6 };

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

/* ── U22 · THE FORM, read by its own stamps (`data-contact-form`, `data-number-verdict`, `data-number-lookup`,
   `data-operator-chip`, `data-open-existing`, `data-block="contact-consent"`) — never by a class string ─────────── */
const DIALOG = '[role="dialog"][aria-modal="true"]';
const ADD_FORM = '[data-contact-form="add"]';
const EDIT_FORM = '[data-contact-form="edit"]';
// ⚠️ Matched by its autocomplete, never by its type: the Input atom renders every numeric field as a text box (it filters the characters
// itself, keeping inputmode="numeric"), so the visible box is matched by the autocomplete PhoneInput sets.
const NUMBER = `${ADD_FORM} input[autocomplete="tel-national"]`;
const SAVE = '[data-contact-form] button[type="submit"]';
// ⛔ Count first, as U21's review measured above: a bare innerText()/getAttribute() on an ABSENT element waits
// Playwright's whole default timeout (30 s) before a catch answers — and several U22 reads ask exactly when a line,
// a chip or the dialog itself may be gone.
const textOfLoc = async (loc) => ((await loc.count()) > 0 ? ((await loc.first().innerText()) || "").replace(/\s+/g, " ").trim() : "");
const textOf = (page, selector) => textOfLoc(page.locator(selector));
const attrOf = async (page, selector, name) => {
  const loc = page.locator(selector);
  return (await loc.count()) > 0 ? loc.first().getAttribute(name) : null;
};
const dialogHeading = (page) => textOf(page, `${DIALOG} h2`);
const dialogText = (page) => textOf(page, DIALOG);
const verdictLine = async (page) => ({
  stage: await attrOf(page, "[data-number-verdict]", "data-number-verdict"),
  lookup: await attrOf(page, "[data-number-verdict]", "data-number-lookup"),
  text: await textOf(page, "[data-number-verdict]"),
});
const saveDisabled = (page) => page.locator(SAVE).first().isDisabled();
const inTheBook = async (page) => Number((/In the book\s*([\d,]+)/i.exec(await mainText(page))?.[1] ?? "-1").replace(/,/g, ""));

async function openAddDialog(page) {
  await page.locator('[data-block="contacts-add"]').first().click();
  await page.waitForSelector(`${DIALOG} ${ADD_FORM}`, { timeout: 15000 });
  await wait(400);
}
/** ⛔ BY ITS TEXT, NEVER BY ITS ROLE NAME (U23, 2026-10-02): every Modal's scrim is a button NAMED "Cancel" too
 *  (`modal.tsx`, the `aria-label` on the scrim) and it comes FIRST in the dialog's DOM, so a role query's `.first()`
 *  pressed the scrim — which a typed form ignores (`closeOnScrim` off) and which the panel can cover. The scrim has no
 *  text, so a text match can only reach the real Cancel. */
const textButton = (page, scope, label) => page.locator(scope).locator("button", { hasText: new RegExp(`^${label}$`) }).first();
async function closeDialog(page) {
  await textButton(page, DIALOG, "Cancel").click().catch(() => {});
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 10000 }).catch(() => {});
  await wait(300);
}
async function typeNumber(page, text) {
  const input = page.locator(NUMBER).first();
  await input.fill("");
  await input.pressSequentially(text, { delay: 30 });
  await wait(250);
}
/** A real paste event on the number field, its clipboard holding `text` — what PhoneInput's `onPasteRaw` hears. */
async function pasteNumber(page, text) {
  const input = page.locator(NUMBER).first();
  await input.fill("");
  await input.focus();
  await input.evaluate((el, t) => {
    const dt = new DataTransfer();
    dt.setData("text", t);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, text);
  await wait(300);
}
/**
 * Hold the NEXT server action's RESPONSE on this page — fetched, held, then fulfilled. ⛔ Never the request: a paused
 * and continued request aborts Next's RSC body. `mode: "fail"` answers that one action with HTTP 500 instead.
 */
async function holdNextAction(page, mode = "hold") {
  let open;
  const gate = new Promise((r) => { open = r; });
  let caught = false;
  const handler = async (route) => {
    const req = route.request();
    if (caught || req.method() !== "POST" || !req.headers()["next-action"]) { await route.continue().catch(() => {}); return; }
    caught = true;
    if (mode === "fail") { await route.fulfill({ status: 500, contentType: "text/plain", body: "planted failure (u22 drive)" }).catch(() => {}); return; }
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response }).catch(() => {});
  };
  await page.route("**/admin/contacts**", handler);
  return {
    caught: () => caught,
    release: async () => { open(); await wait(400); await page.unroute("**/admin/contacts**", handler).catch(() => {}); },
  };
}
/** ⛔ Every U22 capture asserts what it photographs first: the dialog's own heading, and the line it claims. */
async function formShot(page, vp, name, wantHeading, wantText) {
  const heading = await dialogHeading(page);
  const text = await dialogText(page);
  ok(`${vp} · ${name} · the capture shows the "${wantHeading}" dialog${wantText ? ` saying "${wantText}"` : ""}`,
    heading === wantHeading && (!wantText || text.includes(wantText)), `heading="${heading}" text="${text.slice(0, 200)}"`);
  ok(`${vp} · ${name} · no horizontal page overflow with the dialog open`, (await overflowOf(page)) === 0, `${await overflowOf(page)}px`);
  await page.screenshot({ path: join(SHOTS, `${vp}-${name}.png`) });
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
  // U22 · the empty row tells the truth: one contact can be added by hand, and it names the button that does it.
  ok(`${vp.name} · U22 EMPTY · the empty row names "Add contact" and offers no import`,
    /Use Add contact/.test(text) && /importing a file is not live yet/.test(text) && (await page.locator('[data-block="contacts-add"]').count()) === 1, text.slice(0, 200));
  await shoot(page, `${vp.name}-empty`);
  // ── U22 · BLANK, on the EMPTY book: focus in the number (never the ✕), Consent stated, Save disabled ──
  await openAddDialog(page);
  const focusInNumber = await page.evaluate(() => {
    const a = document.activeElement;
    return !!a && a.matches('input[autocomplete="tel-national"]') && !!a.closest('[role="dialog"]');
  });
  const consentBlock = await textOf(page, '[data-block="contact-consent"]');
  ok(`${vp.name} · U22 BLANK (empty book) · the dialog opens with focus in the number field, Consent "Not recorded" with the form's sentence, Save disabled`,
    focusInNumber && /Not recorded/i.test(consentBlock) && /never records consent/.test(consentBlock) && (await saveDisabled(page)),
    `focus ${focusInNumber} · consent "${consentBlock}"`);
  await formShot(page, vp.name, "u22-blank-empty-book", "Add a contact", "A Tanzanian mobile number in any spelling");
  await closeDialog(page);
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
    // U22 · the head's ghost holds the "Add contact" button's box.
    const ghostA = await boxOf(page, '[data-skeleton="contacts-add"]');
    // U23 · the bulk bar's ghost, under the rail's.
    const ghostB = await boxOf(page, '[data-skeleton="contacts-bulk-bar"]');
    ok(`${vp.name} · LOADING · the ghost is on screen and the real page is not yet`, !!ghostK && ghostK.h > 0 && realYet === null, JSON.stringify({ ghostK, realYet }));
    ok(`${vp.name} · U22 LOADING · the head's ghost reserves a box for "Add contact"`, !!ghostA && ghostA.h > 0 && ghostA.w > 0, JSON.stringify(ghostA));
    ok(`${vp.name} · U21 LOADING · the rail's ghost is on screen, inside the card ghost`, !!ghostR && ghostR.h > 0 && !!ghostC && ghostR.top > ghostC.top, JSON.stringify({ ghostR, ghostCTop: ghostC?.top }));
    ok(`${vp.name} · U23 LOADING · the bulk bar's ghost is on screen, under the rail's ghost`, !!ghostB && ghostB.h > 0 && !!ghostR && ghostB.top > ghostR.top, JSON.stringify({ ghostB, ghostRTop: ghostR?.top }));
    await shoot(page, `${vp.name}-loading`);
    await page.unroute("**src_app_admin_contacts_page_tsx**");
    await page.waitForSelector('[data-block="contacts-kpis"]', { timeout: 30000 });
    await wait(800);
    const realK = await boxOf(page, '[data-block="contacts-kpis"]');
    const realC = await boxOf(page, '[data-block="contacts-card"]');
    const realR = await boxOf(page, RAIL);
    const realA = await boxOf(page, '[data-block="contacts-add"]');
    const realB = await boxOf(page, '[data-block="contacts-bulk-bar"]');
    // ⚠️ RECORDED, NOT ASSERTED EQUAL: the real rail is role- and data-shaped (loading.tsx says why); the delta is
    // printed in MEASURED so a reader sees how far the swap moves the table, at both widths.
    measured[vp.name] = {
      ghostK, realK, ghostTop: ghostC?.top, realTop: realC?.top, railGhostH: ghostR?.h, railRealH: realR?.h,
      railDelta: ghostR && realR ? Math.round((realR.h - ghostR.h) * 100) / 100 : null,
      addGhost: ghostA, addReal: realA, addWidthDelta: ghostA && realA ? Math.round((realA.w - ghostA.w) * 100) / 100 : null,
      // U23 · RECORDED, NOT ASSERTED EQUAL: the bar's buttons wrap by label width and its note wraps at 360 (loading.tsx).
      barGhostH: ghostB?.h, barRealH: realB?.h, barDelta: ghostB && realB ? Math.round((realB.h - ghostB.h) * 100) / 100 : null,
    };
    // ⭐ U22 · the button's HEIGHT is the kit's 40px rung on both sides of the swap; its width is font-shaped, so it is
    // RECORDED (MEASURED.addWidthDelta) — the header itself is held by the card-top assertion below.
    ok(`${vp.name} · U22 LOADING · the head's ghost is the real "Add contact" button's height within 1px`,
      !!ghostA && !!realA && Math.abs(ghostA.h - realA.h) <= 1, `${ghostA?.h} vs ${realA?.h}`);
    ok(`${vp.name} · LOADING · the KPI band's height equals the real band's within 1px`,
      !!ghostK && !!realK && Math.abs(ghostK.h - realK.h) <= 1, `${ghostK?.h} vs ${realK?.h}`);
    ok(`${vp.name} · LOADING · the card's top edge does not move when the page swaps in (within 1px)`,
      !!ghostC && !!realC && Math.abs(ghostC.top - realC.top) <= 1, `${ghostC?.top} vs ${realC?.top}`);
  }

  // ── POPULATED ────────────────────────────────────────────────────────────────────────────────
  await openContacts(page);
  const rows = page.locator("[data-contact-row]");
  ok(`${vp.name} · POPULATED · a page of 20`, (await rows.count()) === 20, String(await rows.count()));
  const numbers = await page.locator(`[data-contact-row] td:nth-child(${COL.number})`).allInnerTexts();
  ok(`${vp.name} · POPULATED · every number is masked +255••••NN for GROWTH`, numbers.length === 20 && numbers.every((t) => MASK.test(t.trim())), numbers.slice(0, 3).join(" | "));
  ok(`${vp.name} · POPULATED · GROWTH has NO eye and NO copy control`, (await page.locator("button.sensitive-reveal").count()) === 0);
  // 🔴 D19 / A1.1 (U23 review F1): with one-row writes, a whole-book consent count answers per row — a masked role gets none.
  const kpisMasked = await page.locator('[data-block="contacts-kpis"]').innerText();
  ok(`${vp.name} · POPULATED · F1 · GROWTH's KPI band is the book's size and its stops only — no Consent given, no No consent, no withdrawn count`,
    /In the book/i.test(kpisMasked) && /Suppressed/i.test(kpisMasked) && !/consent/i.test(kpisMasked) && !/withdrawn/i.test(kpisMasked)
      && (await page.locator('[data-block="contacts-kpis"][data-kpis-masked]').count()) === 1,
    kpisMasked.replace(/\s+/g, " "));
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
  const fOps = await page.locator(`[data-contact-row] td:nth-child(${COL.operator})`).allInnerTexts();
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
  const vOps = await page.locator(`[data-contact-row] td:nth-child(${COL.operator})`).allInnerTexts();
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
  const kpisReader = await adm.page.locator('[data-block="contacts-kpis"]').innerText();
  ok(`${vp.name} · ADMIN · F1 · the reader's KPI band keeps all four tiles — In the book, Consent given, No consent, Suppressed`,
    /In the book/i.test(kpisReader) && /Consent given/i.test(kpisReader) && /No consent/i.test(kpisReader) && /Suppressed/i.test(kpisReader)
      && (await adm.page.locator('[data-kpis-masked]').count()) === 0,
    kpisReader.replace(/\s+/g, " "));
  const headAdmin = await adm.page.locator('[data-block="contacts-card"] thead').innerText();
  ok(`${vp.name} · ADMIN · the role that may read a number sees Reachable and Source`, /reachable/i.test(headAdmin) && /source/i.test(headAdmin));
  const reach = await adm.page.locator(`[data-contact-row] td:nth-child(${COL.reach})`).allInnerTexts();
  ok(`${vp.name} · ADMIN · Reachable names the gate's real reasons (age, suppressed, no consent)`,
    reach.some((t) => /age not confirmed/i.test(t)) && reach.some((t) => /suppressed/i.test(t)) && reach.some((t) => /no consent/i.test(t)),
    [...new Set(reach.map((t) => t.trim()))].join(" | "));
  const adminChips = await adm.page.$$eval("[data-contact-row] span.whitespace-nowrap", (els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  ok(`${vp.name} · ADMIN · Consent and Reachable chips each sit on ONE line`, adminChips.length === 40 && Math.max(...adminChips) <= 18, `${adminChips.length} chips, max ${Math.max(...adminChips)}px`);
  await shoot(adm.page, `${vp.name}-admin-rows`, '[data-block="contacts-card"]');
  // A reader's columns: (select) · Name · Number · Operator · Consent · Reachable · Source · Lists·Tags · Added.
  await openContacts(adm.page, "?op=VODACOM&consent=GIVEN");
  const aOps = await adm.page.locator(`[data-contact-row] td:nth-child(${COL.operator})`).allInnerTexts();
  const aConsent = await adm.page.locator(`[data-contact-row] td:nth-child(${COL.consent})`).allInnerTexts();
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
  const aGiven = await adm.page.locator(`[data-contact-row] td:nth-child(${COL.consent})`).allInnerTexts();
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

// ── U22 · ADD AND EDIT ONE CONTACT — after every count-sensitive U20/U21 assertion, because it ADDS rows ──────────
let u22 = { erasedId: null, erasedNumber: "", players: [], withdrawn: [] };
{
  const { ctx, page } = await staffCtx("GROWTH", "+255700002006", { width: 1280, height: 800 });
  u22 = await seed(page, "u22=1");
  ok("seed · U22's fixtures: an erased row, and per run a player's number (GIVEN) and a WITHDRAWN one, none in the book",
    typeof u22.erasedId === "string" && u22.players.length >= 2 && u22.withdrawn.length >= 2, JSON.stringify(u22));
  await ctx.close();
}
for (const [vi, vp] of VIEWPORTS.entries()) {
  console.log(`\n[u22] ${vp.name}`);
  const viewport = { width: vp.width, height: vp.height };
  /** Numbers only this run types: 076 7<run> 0000N — the 45-row seed never uses 076, the fixtures use 076 6…. */
  const fresh = (k) => `0767${vi}${String(k).padStart(5, "0")}`;
  const { ctx, page } = await staffCtx("GROWTH", "+255700002007", viewport);
  await openContacts(page);

  // ── BLANK, on the populated book ──
  const bookBefore = await inTheBook(page);
  await openAddDialog(page);
  const focused = await page.evaluate(() => {
    const a = document.activeElement;
    return !!a && a.matches('input[autocomplete="tel-national"]') && !!a.closest('[role="dialog"]');
  });
  ok(`${vp.name} · U22 BLANK · focus in the number field (not the ✕), Save disabled, Consent "Not recorded" stated`,
    focused && (await saveDisabled(page)) && /Not recorded/i.test(await dialogText(page)) && /never records consent/.test(await dialogText(page)));
  await formShot(page, vp.name, "u22-blank", "Add a contact", "This form never records consent");

  // ── TYPING · two digits: the chip from the ONE table, "2 of 9 digits" ──
  await typeNumber(page, "71");
  const yas = await verdictLine(page);
  const yasChip = await textOf(page, "[data-operator-chip]");
  ok(`${vp.name} · U22 TYPING · "71" shows the Yas chip and "2 of 9 digits", Save still disabled`,
    yas.stage === "typing" && /^yas$/i.test(yasChip) && yas.text.includes("2 of 9 digits") && (await saveDisabled(page)), `${yasChip} · ${yas.text}`);
  await formShot(page, vp.name, "u22-typing-71", "Add a contact", "2 of 9 digits");
  await typeNumber(page, "60");
  const airtelTitle = (await attrOf(page, "[data-operator-chip]", "title")) || "";
  ok(`${vp.name} · U22 TYPING · "60" shows the Airtel chip, flagged disputed in its title`,
    /^airtel$/i.test(await textOf(page, "[data-operator-chip]")) && /060|reserved/i.test(airtelTitle), airtelTitle.slice(0, 80));

  // ── REFUSED · 064 at two digits; too-short once settled; a Kenyan paste judged before truncation ──
  await typeNumber(page, "64");
  const tel = await verdictLine(page);
  ok(`${vp.name} · U22 REFUSED · "64" is refused at TWO digits with the Telxer sentence, Save disabled`,
    tel.stage === "refused" && tel.text.includes("Telxer") && (await saveDisabled(page)), tel.text.slice(0, 120));
  await formShot(page, vp.name, "u22-refused-064", "Add a contact", "Telxer");
  await typeNumber(page, "71234");
  const typing5 = await verdictLine(page);
  await page.keyboard.press("Tab");
  await wait(300);
  const short = await verdictLine(page);
  ok(`${vp.name} · U22 REFUSED · "71234" reads "5 of 9 digits" while typing and the too-short sentence once the field is left`,
    typing5.stage === "typing" && typing5.text.includes("5 of 9 digits") && short.stage === "refused" && /this one has 5/.test(short.text), `${typing5.text} → ${short.text}`);
  await formShot(page, vp.name, "u22-refused-short", "Add a contact", "this one has 5");
  await pasteNumber(page, "+254712345678");
  const kenya = await verdictLine(page);
  ok(`${vp.name} · U22 REFUSED · a pasted +254 712 345 678 is refused as international — never called a Mbeya landline`,
    kenya.stage === "refused" && kenya.text.includes("+254") && !/Mbeya/.test(kenya.text) && (await saveDisabled(page)), kenya.text.slice(0, 140));
  await formShot(page, vp.name, "u22-refused-paste", "Add a contact", "+254");

  // ── CHECKING · the lookup's response held; SAVING · the add's response held; SAVED ──
  const lookupHold = await holdNextAction(page);
  await typeNumber(page, fresh(1));
  await page.waitForSelector('[data-number-lookup="checking"]', { timeout: 15000 }).catch(() => {});
  const checking = await verdictLine(page);
  ok(`${vp.name} · U22 CHECKING · with the lookup held, the line says "Checking the book…" and Save stays disabled`,
    checking.lookup === "checking" && /Checking the book/.test(checking.text) && (await saveDisabled(page)), checking.text);
  await formShot(page, vp.name, "u22-checking", "Add a contact", "Checking the book");
  await lookupHold.release();
  await page.waitForSelector('[data-number-lookup="free"]', { timeout: 15000 }).catch(() => {});
  ok(`${vp.name} · U22 CHECKED · a fresh number is free: the operator's sentence, and Save enabled`,
    (await verdictLine(page)).lookup === "free" && !(await saveDisabled(page)), (await verdictLine(page)).text);
  await page.locator(`${DIALOG} [data-field="displayName"] input`).first().fill(`U22 Drive ${vp.name}`);
  await page.locator(`${DIALOG} [data-field="tags"] input`).first().fill("drive");
  const saveHold = await holdNextAction(page);
  await page.locator(SAVE).first().click();
  await wait(500);
  const busy = await attrOf(page, DIALOG, "aria-busy");
  const saveBusy = await attrOf(page, SAVE, "aria-busy");
  await page.keyboard.press("Escape");
  await wait(300);
  ok(`${vp.name} · U22 SAVING · with the add held, Save is busy, the dialog aria-busy, and Escape does not close it`,
    busy === "true" && saveBusy === "true" && (await page.locator(DIALOG).count()) === 1, `dialog busy=${busy} save busy=${saveBusy}`);
  await formShot(page, vp.name, "u22-saving", "Add a contact");
  await saveHold.release();
  await page.getByText("Contact added", { exact: true }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 15000 }).catch(() => {});
  for (let i = 0; i < 30 && (await inTheBook(page)) !== bookBefore + 1; i++) await wait(300);
  const firstRow = await textOf(page, "[data-contact-row]");
  ok(`${vp.name} · U22 SAVED · "Contact added", the dialog gone, the new row FIRST, "In the book" up by exactly one`,
    (await page.getByText("Contact added", { exact: true }).count()) >= 1 && (await page.locator(DIALOG).count()) === 0
      && firstRow.includes(`U22 Drive ${vp.name}`) && (await inTheBook(page)) === bookBefore + 1,
    `${bookBefore} → ${await inTheBook(page)} · first row "${firstRow.slice(0, 80)}"`);
  // 🔴 A1.1 · GROWTH's toast carries no consent word — the reply had none to give.
  ok(`${vp.name} · U22 SAVED · A1.1 · GROWTH is told no consent value after the save`, (await page.getByText(/^Consent: /).count()) === 0);
  await shoot(page, `${vp.name}-u22-saved`);

  // ── DUPLICATE (the Accept): typed once and saved, then PASTED as +255… — one row, the sentence, the link ──
  await openAddDialog(page);
  await typeNumber(page, fresh(2));
  await page.waitForSelector('[data-number-lookup="free"]', { timeout: 15000 }).catch(() => {});
  await page.locator(SAVE).first().click();
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 15000 }).catch(() => {});
  await wait(800);
  await openAddDialog(page);
  await pasteNumber(page, `+255${fresh(2).slice(1)}`);
  await page.waitForSelector('[data-number-lookup="duplicate"]', { timeout: 15000 }).catch(() => {});
  const dup = await verdictLine(page);
  const dupText = await dialogText(page);
  ok(`${vp.name} · U22 DUPLICATE · the same number pasted as +255… reads "This number is already in the book." with the link, Save disabled, no "save anyway" anywhere`,
    dup.lookup === "duplicate" && dup.text.includes("This number is already in the book.") && (await page.locator(`${DIALOG} a[data-open-existing]`).count()) === 1
      && (await saveDisabled(page)) && !/anyway/i.test(dupText), dup.text);
  await formShot(page, vp.name, "u22-duplicate", "Add a contact", "Open the existing contact");

  // ── EDIT · the link opens ?edit=<id>: GROWTH sees the number masked, no eye, no Copy, and NO consent chip ──
  await page.locator(`${DIALOG} a[data-open-existing]`).first().click();
  await page.waitForURL((u) => u.searchParams.has("edit"), { timeout: 30000 });
  await page.waitForSelector(`${DIALOG} ${EDIT_FORM}`, { timeout: 30000 });
  await wait(800);
  const editId = new URL(page.url()).searchParams.get("edit") ?? "";
  const shownNumber = await textOf(page, `${DIALOG} [data-contact-number]`);
  const growthConsent = await textOf(page, `${DIALOG} [data-block="contact-consent"]`);
  ok(`${vp.name} · U22 EDIT · the link opened ?edit=<a cuid> over the list, ONE dialog, the number +255••••NN with no eye and no Copy`,
    /^mc_[a-z]{16}$/.test(editId) && (await page.locator(DIALOG).count()) === 1 && MASK.test(shownNumber)
      && (await page.locator(`${DIALOG} button.sensitive-reveal`).count()) === 0, `${editId} · "${shownNumber}"`);
  ok(`${vp.name} · U22 EDIT · A1.1 · GROWTH's edit dialog states the form's sentence and NO consent value`,
    /never records consent/.test(growthConsent) && !/given|withdrawn|not recorded/i.test(growthConsent.replace(/never records consent|no consent recorded/gi, "")), growthConsent);
  await formShot(page, vp.name, "u22-edit-growth", "Edit contact", "The number can't be changed");

  // ── STALE · two tabs on one contact: the second save is refused, with Reload ──
  const tabB = await ctx.newPage();
  await tabB.goto(`${BASE}/admin/contacts?edit=${encodeURIComponent(editId)}`, { waitUntil: "domcontentloaded" });
  await tabB.waitForSelector(`${DIALOG} ${EDIT_FORM}`, { timeout: 30000 });
  await page.locator(`${DIALOG} [data-field="displayName"] input`).first().fill("Tab A");
  await page.locator(SAVE).first().click();
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 15000 }).catch(() => {});
  await tabB.locator(`${DIALOG} [data-field="displayName"] input`).first().fill("Tab B");
  await tabB.locator(SAVE).first().click();
  await tabB.waitForSelector(`${DIALOG} [role="alert"]`, { timeout: 15000 }).catch(() => {});
  const staleText = await dialogText(tabB);
  ok(`${vp.name} · U22 STALE · the second tab's save is refused — nothing overwritten — and offers Reload`,
    /Someone changed this contact/.test(staleText) && (await tabB.getByRole("button", { name: "Reload", exact: true }).count()) === 1, staleText.slice(0, 160));
  await tabB.setViewportSize(viewport);
  await formShot(tabB, vp.name, "u22-stale", "Edit contact", "Someone changed this contact");
  await tabB.close();

  // ── MISSING · an unknown id, and the ERASED fixture, read the same refusal (A1.7); Close drops `edit` ──
  for (const [label, id] of [["missing", "mc_nope"], ["erased-missing", u22.erasedId ?? "mc_seed_erased"]]) {
    await page.goto(`${BASE}/admin/contacts?op=VODACOM&edit=${encodeURIComponent(id)}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-contact-dialog="missing"]', { timeout: 30000 }).catch(() => {});
    await wait(500);
    const missText = await dialogText(page);
    ok(`${vp.name} · U22 ${label.toUpperCase()} · ?edit=${label === "missing" ? "mc_nope" : "<the erased row>"} shows "This contact isn't in the book." — the same words for an erased row`,
      (await page.locator('[data-contact-dialog="missing"]').count()) === 1 && missText.includes("This contact isn't in the book.") && (await page.locator(EDIT_FORM).count()) === 0,
      missText.slice(0, 120));
    await formShot(page, vp.name, `u22-${label}`, "Edit contact", "This contact isn't in the book.");
  }
  await page.locator(DIALOG).getByRole("button", { name: "Close", exact: true }).first().click();
  await page.waitForURL((u) => !u.searchParams.has("edit"), { timeout: 30000 }).catch(() => {});
  ok(`${vp.name} · U22 MISSING · Close returns to the list's own address — the filter kept, edit dropped`,
    !new URL(page.url()).searchParams.has("edit") && new URL(page.url()).searchParams.get("op") === "VODACOM", page.url());

  // ── ERASED · adding the erased number: one sentence, nothing to open (C3) ──
  await openContacts(page);
  await openAddDialog(page);
  await typeNumber(page, u22.erasedNumber || "0766000001");
  await page.waitForSelector('[data-number-lookup="refused"]', { timeout: 15000 }).catch(() => {});
  const erasedLine = await verdictLine(page);
  ok(`${vp.name} · U22 ERASED · the erased number reads "This number can't be added to the book." with NO link, Save disabled`,
    erasedLine.text.includes("This number can't be added to the book.") && (await page.locator(`${DIALOG} a[data-open-existing]`).count()) === 0 && (await saveDisabled(page)),
    erasedLine.text);
  await formShot(page, vp.name, "u22-erased-refused", "Add a contact", "can't be added to the book");
  await closeDialog(page);

  // ── 🔴 A1.1 · GROWTH adds a seeded PLAYER's number (consent GIVEN at sign-up): no consent value anywhere ──
  await openAddDialog(page);
  await typeNumber(page, u22.players[vi] ?? "0766100000");
  await page.waitForSelector('[data-number-lookup="free"]', { timeout: 15000 }).catch(() => {});
  await page.locator(SAVE).first().click();
  await page.getByText("Contact added", { exact: true }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 15000 }).catch(() => {});
  await wait(800);
  ok(`${vp.name} · U22 A1.1 · GROWTH adding a seeded player's number is told no consent value — no "Consent: Given", no consent column`,
    (await page.getByText(/Consent: /).count()) === 0 && !/consent/i.test(await page.locator('[data-block="contacts-card"] thead').innerText()),
    (await page.locator('[data-block="contacts-card"] thead').innerText()).replace(/\s+/g, " "));
  await shoot(page, `${vp.name}-u22-masked-player`);

  // ── ERROR · the add answered with HTTP 500: the danger line, the typing kept, Save available again ──
  await openAddDialog(page);
  await typeNumber(page, fresh(3));
  await page.waitForSelector('[data-number-lookup="free"]', { timeout: 15000 }).catch(() => {});
  await page.locator(`${DIALOG} [data-field="displayName"] input`).first().fill("Kept after the error");
  const failing = await holdNextAction(page, "fail");
  await page.locator(SAVE).first().click();
  await page.waitForSelector(`${DIALOG} [role="alert"]`, { timeout: 15000 }).catch(() => {});
  const errText = await dialogText(page);
  ok(`${vp.name} · U22 ERROR · a 500 is said in the dialog, the typing is kept, and Save is available again`,
    /Server error/.test(errText) && (await page.locator(`${DIALOG} [data-field="displayName"] input`).first().inputValue()) === "Kept after the error" && !(await saveDisabled(page)),
    errText.slice(0, 160));
  await failing.release();
  // ⭐ At 360 the whole dialog is reachable: Save scrolls into the viewport.
  await page.locator(SAVE).first().scrollIntoViewIfNeeded();
  const saveBox = await page.locator(SAVE).first().boundingBox();
  ok(`${vp.name} · U22 REACH · the dialog's Save can be scrolled fully into view`, !!saveBox && saveBox.y >= 0 && saveBox.y + saveBox.height <= vp.height, JSON.stringify(saveBox));
  await formShot(page, vp.name, "u22-error", "Add a contact", "Server error");
  await closeDialog(page);
  await ctx.close();

  // ── ADMIN · a number whose ledger says WITHDRAWN reads "Withdrawn" (the mirror); the edit shows eye, Copy, consent ──
  const adm = await staffCtx("ADMIN", "+255700002008", viewport);
  await openContacts(adm.page);
  await openAddDialog(adm.page);
  await typeNumber(adm.page, u22.withdrawn[vi] ?? "0766200000");
  await adm.page.waitForSelector('[data-number-lookup="free"]', { timeout: 15000 }).catch(() => {});
  await adm.page.locator(SAVE).first().click();
  await adm.page.getByText(/Consent: Withdrawn/).first().waitFor({ timeout: 15000 }).catch(() => {});
  await adm.page.waitForSelector(DIALOG, { state: "detached", timeout: 15000 }).catch(() => {});
  await wait(1000);
  const adminFirstConsent = await textOfLoc(adm.page.locator("[data-contact-row]").first().locator(`td:nth-child(${COL.consent})`));
  ok(`${vp.name} · U22 ADMIN · a reader adding a number whose ledger says WITHDRAWN is told "Consent: Withdrawn", and the new first row reads Withdrawn`,
    (await adm.page.getByText(/Consent: Withdrawn/).count()) >= 1 && /^withdrawn$/i.test(adminFirstConsent), adminFirstConsent);
  await shoot(adm.page, `${vp.name}-u22-admin-withdrawn`);
  await adm.page.goto(`${BASE}/admin/contacts?edit=${encodeURIComponent(editId)}`, { waitUntil: "domcontentloaded" });
  await adm.page.waitForSelector(`${DIALOG} ${EDIT_FORM}`, { timeout: 30000 });
  await wait(800);
  const adminConsent = await textOf(adm.page, `${DIALOG} [data-block="contact-consent"]`);
  ok(`${vp.name} · U22 ADMIN EDIT · the reader gets the eye AND Copy on the number, and the row's consent and source`,
    (await adm.page.locator(`${DIALOG} button[aria-label="Reveal Contact number"]`).count()) === 1
      && (await adm.page.locator(`${DIALOG} button[aria-label="Copy Contact number"]`).count()) === 1
      && /not recorded/i.test(adminConsent) && /Source: Added by staff/i.test(adminConsent), adminConsent);
  await formShot(adm.page, vp.name, "u22-edit-admin", "Edit contact", "Source: Added by staff");
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
  // U22 · the dialog opens on the Modal's own motion, and with motion off it leaves with NO exit beat (modal.tsx).
  await openAddDialog(page);
  ok("reduced-motion · U22 · the Add a contact dialog opens", (await dialogHeading(page)) === "Add a contact");
  await formShot(page, "360x780", "u22-reduced-open", "Add a contact");
  await page.keyboard.press("Escape");
  await wait(60);
  ok("reduced-motion · U22 · an untouched dialog closes on Escape at once — no exit beat held", (await page.locator('[role="dialog"]').count()) === 0);
  await ctx.close();
}

/* ══ U23 · THE SELECTION AND THE BULK BAR — LAST, because it TAGS contacts, creates LISTS, adds a row and records a
   withdrawal ══════════════════════════════════════════════════════════════════════════════════════════════════════
   ⛔ After the reduced-motion block on purpose: a list created here draws a List axis on GROWTH's rail, which that block
   asserts is exactly Suppressed · Operator · Tag. ⛔ Every count is READ from the page — the U22 section grew the book.
   ⛔ No Suppress and no Remove is ever CONFIRMED here: both are opened, read and cancelled. Read by the bar's own stamps
   (`data-block="contacts-bulk-bar"`, `data-bulk-*`, `data-edit-contact`), never by a class string. */
const BAR = '[data-block="contacts-bulk-bar"]';
// ⚠️ ConfirmModal and the overlay's error card are role="alertdialog"; the U22 `DIALOG` handle matches role="dialog" only.
const ALERT = '[role="alertdialog"]';
const BAR_NONE = "Tick contacts to tag, list, withdraw, suppress or remove them.";
const BULK_ORDER = "tag,untag,addToList,withdraw,suppress,remove";
const SEARCH = 'input[type="search"][aria-label="Search contacts by name or full number"]';
/** A bare `255…` key, or a local 06/07 spelling, anywhere in a string — what no selection surface may carry (D19). */
const NO_NUMBER = (s) => !/255\d{9}|(^|\D)0[67]\d{8}(\D|$)/.test(s);
const barCount = async (page) => Number((await attrOf(page, BAR, "data-bulk-count")) ?? "-1");
const barMode = (page) => attrOf(page, BAR, "data-bulk-mode");
const barLine = (page) => textOf(page, `${BAR} [data-bulk-line]`);
const barNote = (page) => textOf(page, `${BAR} [data-bulk-note]`);
const actionStates = (page) => page.$$eval(`${BAR} [data-bulk-action]`, (els) => els.map((e) => ({
  action: e.getAttribute("data-bulk-action") || "", disabled: e.hasAttribute("disabled"), title: e.getAttribute("title") || "",
})));
const rowBoxes = (page) => page.$$eval('[data-contact-row] td:first-child input[type="checkbox"]',
  (els) => els.map((e) => ({ label: e.getAttribute("aria-label") || "", checked: e.checked })));
// ⛔ Counted first, as above: a bare evaluate() on an ABSENT box waits Playwright's whole default timeout.
const headBox = async (page) => {
  const loc = page.locator('[data-block="contacts-card"] thead th').first().locator('input[type="checkbox"]');
  return (await loc.count()) > 0 ? loc.first().evaluate((el) => ({ checked: el.checked, indeterminate: el.indeterminate })) : null;
};
/** Tick the way a person does — a MOUSE click on the box's label: the real input is sr-only (`checkbox.tsx`), and a label
 *  that swallowed its own click once left the kit's box mouse-broken and keyboard-fine. */
async function tickRow(page, i) {
  await page.locator("[data-contact-row]").nth(i).locator("td").first().locator("label").first().click();
  await wait(200);
}
async function tickPage(page) {
  await page.locator('[data-block="contacts-card"] thead th').first().locator("label").first().click();
  await wait(250);
}
/** The first number on the rail's count line ("54 contacts", "49 of 54 contacts"): what the address's filter matches. */
const railMatch = async (page) => Number(((await railCount(page)).match(/^([\d,]+)/)?.[1] ?? "-1").replace(/,/g, ""));
async function pressBulk(page, action) {
  await page.locator(`${BAR} [data-bulk-action="${action}"]`).first().click();
  await wait(300);
}
async function waitForParam(page, action) {
  await page.waitForSelector(`${DIALOG} [data-bulk-param="${action}"]`, { timeout: 15000 }).catch(() => {});
  await wait(300);
}
const tagBox = (page) => page.locator(`${DIALOG} [data-field="tag"] input`).first();
const newListBox = (page) => page.locator(`${DIALOG} [data-field="newListName"] input`).first();
async function continueParam(page) {
  await page.locator(`${DIALOG} [data-bulk-param] button[type="submit"]`).first().click();
  await wait(300);
}
/** The confirmation is built from the SERVER's preview, so it is waited for, never assumed. */
async function waitForConfirm(page) {
  await page.waitForSelector(`${ALERT} [data-bulk-confirm]`, { timeout: 20000 }).catch(() => {});
  await wait(400);
}
const confirmTier = (page) => attrOf(page, `${ALERT} [data-bulk-confirm]`, "data-bulk-confirm");
const confirmTitle = (page) => textOf(page, `${ALERT} h2`);
const confirmText = (page) => textOf(page, ALERT);
const consequence = (page) => textOf(page, `${ALERT} [data-bulk-consequence]`);
const typedBox = (page) => page.locator(`${ALERT} input`).first();
const confirmButton = (page, label) => page.locator(ALERT).getByRole("button", { name: label, exact: true }).first();
const sampleMasks = (page) => page.locator(`${ALERT} [data-bulk-sample] [data-masked]`).allInnerTexts();
async function cancelConfirm(page) {
  await textButton(page, ALERT, "Cancel").click().catch(() => {});
  await page.waitForSelector(ALERT, { state: "detached", timeout: 10000 }).catch(() => {});
  await wait(300);
}
/** A deferred toast's description, read once its title is up (anchored patterns only, so no wrapper can match). */
async function toastLine(page, title, line) {
  await page.getByText(title, { exact: true }).first().waitFor({ timeout: 20000 }).catch(() => {});
  return textOfLoc(page.getByText(line));
}
const overlayNamed = (page, label) => page.getByRole("dialog", { name: label, exact: true });
/** ⛔ Every U23 capture asserts what it photographs first: the bar's own sentence, or the confirmation's own title. */
async function barShot(page, vp, name, wantLine) {
  const line = await barLine(page);
  ok(`${vp} · ${name} · the capture shows the bulk bar saying "${wantLine}"`, line === wantLine, `line="${line}"`);
  ok(`${vp} · ${name} · no horizontal page overflow with the bar drawn`, (await overflowOf(page)) === 0, `${await overflowOf(page)}px`);
  await shoot(page, `${vp}-${name}`, BAR);
}
async function confirmShot(page, vp, name, wantTitle, wantText) {
  const title = await confirmTitle(page);
  const text = await confirmText(page);
  ok(`${vp} · ${name} · the capture shows the confirmation "${wantTitle}"${wantText ? ` saying "${wantText}"` : ""}`,
    title === wantTitle && (!wantText || text.includes(wantText)), `title="${title}" text="${text.slice(0, 220)}"`);
  ok(`${vp} · ${name} · no horizontal page overflow with the confirmation open`, (await overflowOf(page)) === 0, `${await overflowOf(page)}px`);
  await page.screenshot({ path: join(SHOTS, `${vp}-${name}.png`) });
}

for (const [vi, vp] of VIEWPORTS.entries()) {
  console.log(`\n[u23] ${vp.name}`);
  const viewport = { width: vp.width, height: vp.height };
  const { ctx, page } = await staffCtx("GROWTH", "+255700002009", viewport);
  // ⭐ THE CONSOLE IS PINNED TO ENGLISH (2026-10-02): this officer last chose Swahili on the player site. Every kit word
  // U23 borrows through `useT()` — the typed confirmation's label, a dialog's Cancel — must still read English after
  // hydration, when an unpinned provider would have read this cookie and switched.
  await ctx.addCookies([{ name: "kp-locale", value: "sw", url: BASE }]);

  // ── NONE SELECTED — the sentence, the six actions on screen and disabled WITH their reason, the boxes named ──
  await openContacts(page);
  const langOf = await page.evaluate(() => ({
    cookie: document.cookie.includes("kp-locale=sw"),
    lang: document.querySelector("main#main-content")?.closest("[lang]")?.getAttribute("lang") ?? null,
  }));
  ok(`${vp.name} · U23 ENGLISH · with a Swahili player cookie in this browser, the console still declares lang="en" around its content`,
    langOf.cookie && langOf.lang === "en", JSON.stringify(langOf));
  const none = await actionStates(page);
  ok(`${vp.name} · U23 NONE · the bar says what ticking does and holds nothing; all six actions are ON SCREEN, disabled, each saying "Tick at least one contact"`,
    (await barLine(page)) === BAR_NONE && (await barCount(page)) === 0 && (await barMode(page)) === "rows"
      && none.map((a) => a.action).join(",") === BULK_ORDER && none.every((a) => a.disabled && a.title === "Tick at least one contact"),
    JSON.stringify(none.slice(0, 2)));
  ok(`${vp.name} · U23 NONE · no "Select all … matching" and no Clear before a tick, and the bar says why consent can't be recorded here`,
    (await page.locator(`${BAR} [data-bulk-matching]`).count()) === 0 && (await page.locator(`${BAR} [data-bulk-clear]`).count()) === 0
      && /^Consent can.t be recorded here: a lawful record needs a basis and an 18\+ attestation/.test(await textOf(page, `${BAR} [data-bulk-consent-note]`)));
  const names = (await page.locator("[data-contact-row] td:nth-child(2)").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
  const boxes = await rowBoxes(page);
  ok(`${vp.name} · U23 NONE · every row's box is named "Select <its name>" — a nameless row by its MASKED number, never a number — none ticked; the header box names the page`,
    boxes.length === 20 && names.length === 20
      && boxes.every((b, i) => !b.checked && NO_NUMBER(b.label) && (names[i] === "No name" ? /^Select \+255•{4}\d{2}$/.test(b.label) : b.label === `Select ${names[i]}`))
      && (await page.getByRole("checkbox", { name: "Select every contact on this page", exact: true }).count()) === 1
      && (await headBox(page))?.checked === false,
    boxes.slice(0, 4).map((b) => b.label).join(" | "));
  await barShot(page, vp.name, "u23-none", BAR_NONE);

  // ── THE EDIT LINK — every row opens ITS dialog by id, never by number; the filter and the sort carried, the page dropped ──
  await openContacts(page, "?tag=vip&sort=name&dir=asc");
  const edits = await page.locator("[data-contact-row] a[data-edit-contact]").evaluateAll((as) => as.map((a) => ({
    id: a.getAttribute("data-edit-contact") || "", href: a.getAttribute("href") || "", label: a.getAttribute("aria-label") || "",
  })));
  const vipRows = await page.locator("[data-contact-row]").count();
  ok(`${vp.name} · U23 EDIT LINK · every row's "edit" link is ?edit=<that row's id> with tag=vip and the name sort kept, no page, and no number in it`,
    vipRows > 0 && edits.length === vipRows && edits.every(({ id, href, label }) => {
      const q = paramsOf(href);
      return id.startsWith("mc_") && q.get("edit") === id && q.get("tag") === "vip" && q.get("sort") === "name" && q.get("dir") === "asc"
        && !q.has("page") && NO_NUMBER(decodeURIComponent(href)) && /^Edit ./.test(label) && NO_NUMBER(label);
    }),
    edits.slice(0, 2).map((e) => e.href).join(" | "));
  const editTarget = edits[0]?.id ?? "";
  await page.locator("[data-contact-row] a[data-edit-contact]").first().click();
  await page.waitForURL((u) => u.searchParams.get("edit") === editTarget, { timeout: 30000 }).catch(() => {});
  await page.waitForSelector(`${DIALOG} ${EDIT_FORM}`, { timeout: 30000 }).catch(() => {});
  await wait(600);
  const opened = new URL(page.url()).searchParams;
  ok(`${vp.name} · U23 EDIT LINK · pressed, it opens that contact's dialog over the list: the address edit=<the id> with the filter kept, the number masked`,
    editTarget !== "" && opened.get("edit") === editTarget && opened.get("tag") === "vip" && (await page.locator(`${DIALOG} ${EDIT_FORM}`).count()) === 1
      && MASK.test(await textOf(page, `${DIALOG} [data-contact-number]`)),
    page.url());
  await formShot(page, vp.name, "u23-edit-link", "Edit contact", "The number can't be changed");
  await closeDialog(page);
  await page.waitForURL((u) => !u.searchParams.has("edit"), { timeout: 15000 }).catch(() => {});

  // ── TICKED ACROSS PAGES — the pager is a client navigation, and the selection outlives it ──
  await openContacts(page);
  await tickRow(page, 0);
  await tickRow(page, 1);
  const some = await headBox(page);
  const live = await actionStates(page);
  ok(`${vp.name} · U23 TICKED · two rows: "2 selected", the header box INDETERMINATE (some, not all), every action enabled and saying what it does`,
    (await barLine(page)) === "2 selected" && (await barCount(page)) === 2 && some?.indeterminate === true && some?.checked === false
      && live.length === 6 && live.every((a) => !a.disabled && a.title !== "" && a.title !== "Tick at least one contact"),
    JSON.stringify({ line: await barLine(page), some, live: live.slice(0, 2) }));
  await page.locator('a[href*="page=2"]').first().click();
  await waitForParams(page, { page: "2" });
  await tickRow(page, 0);
  ok(`${vp.name} · U23 TICKED · on page 2 the two from page 1 are still held: "3 selected · 2 not on this page"`,
    (await barLine(page)) === "3 selected · 2 not on this page" && (await barCount(page)) === 3, await barLine(page));
  await barShot(page, vp.name, "u23-ticked-pages", "3 selected · 2 not on this page");

  // ── CONFIRM · ENUMERATE — up to fifty ticked rows are NAMED by the server: twenty, masked, then "and N more" ──
  await tickPage(page);
  const held = await barCount(page);
  await pressBulk(page, "remove");
  await waitForConfirm(page);
  const named = await sampleMasks(page);
  const tail = await textOf(page, `${ALERT} [data-bulk-tail]`);
  ok(`${vp.name} · U23 CONFIRM ENUMERATE · ${held} ticked rows: the SERVER names twenty, every number +255••••NN, then "and ${held - 20} more" — and asks for no typed word`,
    held > 20 && held <= 50 && (await confirmTier(page)) === "enumerate" && named.length === 20 && named.every((t) => MASK.test(t.trim()))
      && tail === `and ${held - 20} more` && (await page.locator(`${ALERT} input`).count()) === 0,
    `${held} held · ${named.length} named · "${tail}" · ${named.slice(0, 2).join(" | ")}`);
  ok(`${vp.name} · U23 CONFIRM ENUMERATE · Remove says what is KEPT — the consent and stop records, and rows an erasure emptied`,
    (await consequence(page)) === "The contacts leave the book and its lists. Their consent and stop records are kept, and rows emptied by an erasure are kept.",
    await consequence(page));
  await confirmShot(page, vp.name, "u23-confirm-enumerate", `Remove ${held} contacts from the book?`, `and ${held - 20} more`);
  await cancelConfirm(page); // ⛔ never confirmed
  ok(`${vp.name} · U23 CONFIRM ENUMERATE · Cancel changes nothing: the ${held} are still held`, (await barCount(page)) === held, String(await barCount(page)));
  await page.locator(`${BAR} [data-bulk-clear]`).first().click();
  await wait(250);
  ok(`${vp.name} · U23 CLEAR · Clear empties the selection`, (await barCount(page)) === 0 && (await barLine(page)) === BAR_NONE, await barLine(page));

  // ── SELECT ALL N MATCHING — the FILTER is what is held (U24's audience JSON); its count is the page's own ──
  await openContacts(page, "?suppressed=no");
  const matchTotal = await railMatch(page);
  await tickPage(page);
  const offer = await textOf(page, `${BAR} [data-bulk-matching]`);
  ok(`${vp.name} · U23 ALL MATCHING · the whole page ticked offers "Select all ${matchTotal} matching" — the filter holds more than one page`,
    matchTotal > 20 && (await barLine(page)) === "20 selected" && (await headBox(page))?.checked === true && offer === `Select all ${matchTotal} matching`,
    `${await barLine(page)} · "${offer}"`);
  await page.locator(`${BAR} [data-bulk-matching]`).first().click();
  await wait(300);
  ok(`${vp.name} · U23 ALL MATCHING · pressed: "All ${matchTotal} matching selected", the bar in matching mode, every box on the page ticked`,
    (await barLine(page)) === `All ${matchTotal} matching selected` && (await barMode(page)) === "matching" && (await barCount(page)) === matchTotal
      && (await rowBoxes(page)).every((b) => b.checked),
    await barLine(page));
  await barShot(page, vp.name, "u23-all-matching", `All ${matchTotal} matching selected`);

  // ── CONFIRM · TYPED — a filter is never enumerated: the officer types the SERVER's count, and Confirm waits for exactly it ──
  await pressBulk(page, "suppress");
  await waitForConfirm(page);
  const typeLabel = await attrOf(page, `${ALERT} input`, "aria-label");
  const goSuppress = confirmButton(page, `Suppress ${matchTotal}`);
  const offEmpty = await goSuppress.isDisabled();
  await typedBox(page).fill(String(matchTotal - 1));
  await wait(150);
  const offWrong = await goSuppress.isDisabled();
  await typedBox(page).fill(String(matchTotal));
  await wait(150);
  const onRight = !(await goSuppress.isDisabled());
  ok(`${vp.name} · U23 CONFIRM TYPED · "Type ${matchTotal} to confirm" — the server's count — Confirm disabled empty, disabled at ${matchTotal - 1}, enabled at ${matchTotal}; the audience in words, no rows named`,
    (await confirmTier(page)) === "typed" && typeLabel === `Type ${matchTotal} to confirm` && offEmpty && offWrong && onRight
      && (await page.locator(`${ALERT} [data-bulk-sample]`).count()) === 0 && (await confirmText(page)).includes("Not suppressed"),
    JSON.stringify({ typeLabel, offEmpty, offWrong, onRight }));
  ok(`${vp.name} · U23 CONFIRM TYPED · Suppress says its PERMANENCE in words: no one can lift it, not even the person, nor a later owner of the number`,
    (await consequence(page)) === "Permanent — no one can lift this, not even the person; a later owner of this number will not receive marketing either.",
    await consequence(page));
  await confirmShot(page, vp.name, "u23-confirm-typed-suppress", `Suppress ${matchTotal} contacts?`, "Permanent");
  await cancelConfirm(page); // ⛔ never confirmed — a drive does not suppress the book
  await pressBulk(page, "remove");
  await waitForConfirm(page);
  ok(`${vp.name} · U23 CONFIRM TYPED · Remove on a filter asks for the count too, and says the consent and stop records are kept`,
    (await confirmTier(page)) === "typed" && (await attrOf(page, `${ALERT} input`, "aria-label")) === `Type ${matchTotal} to confirm`
      && /Their consent and stop records are kept/.test(await consequence(page)),
    await consequence(page));
  await confirmShot(page, vp.name, "u23-confirm-typed-remove", `Remove ${matchTotal} contacts from the book?`, "consent and stop records are kept");
  await cancelConfirm(page); // ⛔ never confirmed

  // ── A TYPED RUN, END TO END — Tag every matching contact: the parameter, the server's count typed, the counted result ──
  const allTag = `u23all${vi}`;
  await pressBulk(page, "tag");
  await waitForParam(page, "tag");
  await tagBox(page).fill(allTag);
  await continueParam(page);
  await waitForConfirm(page);
  const allTitle = await confirmTitle(page);
  await typedBox(page).fill(String(matchTotal));
  await confirmButton(page, `Tag ${matchTotal}`).click();
  const allLine = await toastLine(page, "Tagged", /^\d+ tagged · \d+ already had it$/);
  ok(`${vp.name} · U23 TYPED RUN · "Tag ${matchTotal} contacts with “${allTag}”?", typed and confirmed: the toast counts "${matchTotal} tagged · 0 already had it" and the selection is cleared`,
    allTitle === `Tag ${matchTotal} contacts with “${allTag}”?` && allLine === `${matchTotal} tagged · 0 already had it`
      && (await barCount(page)) === 0 && (await barMode(page)) === "rows",
    `${allTitle} · "${allLine}"`);

  // ── A FILTER CHANGE CLEARS "ALL MATCHING" — the stored filter no longer describes the rows on screen — and SAYS so ──
  await tickPage(page);
  await page.locator(`${BAR} [data-bulk-matching]`).first().click();
  await wait(300);
  const wasMatching = await barMode(page);
  await page.locator(SEARCH).first().fill("Asha");
  await page.locator(SEARCH).first().press("Enter");
  await waitForParams(page, { q: "Asha", suppressed: "no" });
  ok(`${vp.name} · U23 FILTER CHANGED · a search typed under "all matching" clears it, and the bar says so in words`,
    wasMatching === "matching" && (await barMode(page)) === "rows" && (await barCount(page)) === 0
      && (await barNote(page)) === "The filter changed, so the selection of every matching contact was cleared.",
    `${wasMatching} → ${await barMode(page)} · "${await barNote(page)}"`);
  await barShot(page, vp.name, "u23-filter-changed", BAR_NONE);

  // ── REFUSED BY THE SERVER — THE AUDIENCE MOVED: a contact joins between the preview and the confirmation, and the RECOUNT
  // refuses with both counts, writing nothing. ⚠️ Tag, not Suppress: the refusal is one code path for every action (recount
  // → compare → refuse, before any write), and a defect here must not cost the drive a suppressed book. ──
  const movedTag = `u23moved${vi}`;
  await openContacts(page);
  const bookTotal = await railMatch(page);
  await tickPage(page);
  await page.locator(`${BAR} [data-bulk-matching]`).first().click();
  await wait(300);
  await pressBulk(page, "tag");
  await waitForParam(page, "tag");
  await tagBox(page).fill(movedTag);
  await continueParam(page);
  await waitForConfirm(page);
  const word = (await attrOf(page, `${ALERT} input`, "placeholder")) ?? "";
  const moved = await seed(page, "u23moved=1");
  await typedBox(page).fill(word);
  await confirmButton(page, `Tag ${bookTotal}`).click();
  const movedLine = await toastLine(page, "Nothing was changed", /^The selection changed: it now holds .+ review it again\.$/);
  ok(`${vp.name} · U23 REFUSED (SERVER) · a contact added after the preview: the run is REFUSED with both counts — ${bookTotal + 1} now, ${bookTotal} confirmed`,
    bookTotal > 0 && word === String(bookTotal) && moved.moved > 0
      && movedLine === `The selection changed: it now holds ${bookTotal + 1} contacts — you confirmed ${bookTotal}. Nothing was changed; review it again.`,
    `typed ${word} · ${JSON.stringify(moved)} · "${movedLine}"`);
  ok(`${vp.name} · U23 REFUSED (SERVER) · a refusal keeps the selection — there is nothing to redo but the review`, (await barMode(page)) === "matching", String(await barMode(page)));
  await shoot(page, `${vp.name}-u23-refused-moved`);
  await openContacts(page);
  ok(`${vp.name} · U23 REFUSED (SERVER) · nothing was written: no contact carries "${movedTag}", and the book holds the one new contact`,
    (await chipCount(page, `tag:${movedTag}`)) === null && (await railMatch(page)) === bookTotal + 1, await railCount(page));

  // ── ERROR — the run answered with HTTP 500: the card says contacts MAY have changed and claims no count; the selection is
  // kept; "Review it again" asks the server for a fresh preview ──
  await openContacts(page);
  await tickRow(page, 0);
  await pressBulk(page, "tag");
  await waitForParam(page, "tag");
  await tagBox(page).fill(`u23err${vi}`);
  await continueParam(page);
  await waitForConfirm(page);
  const failing = await holdNextAction(page, "fail");
  await confirmButton(page, "Tag 1").click();
  const errCard = page.getByRole("alertdialog", { name: "The bulk action didn't finish", exact: true });
  await errCard.first().waitFor({ timeout: 20000 }).catch(() => {});
  const errText = await textOfLoc(errCard);
  ok(`${vp.name} · U23 ERROR · a 500 on the run: "The bulk action didn't finish", contacts MAY have changed, no count claimed, "Review it again" offered`,
    failing.caught() && errText.includes("Some contacts may already have changed — refresh and read the list before pressing again.")
      && !/\d+ tagged/.test(errText) && (await errCard.getByRole("button", { name: "Review it again", exact: true }).count()) === 1,
    errText.slice(0, 220));
  ok(`${vp.name} · U23 ERROR · a failed run keeps the selection`, (await barCount(page)) === 1, String(await barCount(page)));
  ok(`${vp.name} · U23 ERROR · no horizontal page overflow with the error card up`, (await overflowOf(page)) === 0, `${await overflowOf(page)}px`);
  await page.screenshot({ path: join(SHOTS, `${vp.name}-u23-error.png`) });
  await failing.release();
  await errCard.getByRole("button", { name: "Review it again", exact: true }).first().click().catch(() => {});
  await waitForConfirm(page);
  ok(`${vp.name} · U23 ERROR → REVIEW IT AGAIN · the server's fresh preview opens the confirmation again, for the same one contact`,
    (await confirmTitle(page)) === `Tag 1 contact with “u23err${vi}”?`, await confirmTitle(page));
  await cancelConfirm(page);

  // ── PARAMETERS · ACTING · DONE — "a,b" refused beside the box; the run's RESPONSE held under the overlay; released, the
  // toast carries the SERVER's count and the selection is cleared ──
  await openContacts(page);
  await tickRow(page, 0);
  await tickRow(page, 1);
  await pressBulk(page, "tag");
  await waitForParam(page, "tag");
  const focusInTag = await page.evaluate(() => !!document.activeElement?.closest('[data-field="tag"]'));
  await tagBox(page).fill("a,b");
  await continueParam(page);
  const tagErr = await textOf(page, `${DIALOG} [data-field="tag"]`);
  await page.keyboard.press("Escape");
  await wait(300);
  ok(`${vp.name} · U23 PARAMETERS · focus opens in the tag box; "a,b" is refused in U28's words beside it; with something typed, Escape does not close the dialog`,
    focusInTag && tagErr.includes("Type one tag at a time — a comma, ; or | separates tags.") && (await page.locator(`${DIALOG} [data-bulk-param="tag"]`).count()) === 1,
    `focus ${focusInTag} · ${tagErr}`);
  await formShot(page, vp.name, "u23-param-refused", "Tag the selected contacts", "Type one tag at a time");
  const runTag = `u23tag${vi}`;
  await tagBox(page).fill(runTag.toUpperCase());
  await continueParam(page);
  await waitForConfirm(page);
  const twoNamed = await sampleMasks(page);
  ok(`${vp.name} · U23 CONFIRM ENUMERATE · two ticked rows: "Tag 2 contacts with “${runTag}”?" (typed in capitals, stored lower case), both named and masked, no typed word`,
    (await confirmTitle(page)) === `Tag 2 contacts with “${runTag}”?` && (await confirmTier(page)) === "enumerate"
      && twoNamed.length === 2 && twoNamed.every((t) => MASK.test(t.trim())) && (await page.locator(`${ALERT} input`).count()) === 0,
    `${await confirmTitle(page)} · ${twoNamed.join(" | ")}`);
  const runHold = await holdNextAction(page);
  await confirmButton(page, "Tag 2").click();
  await overlayNamed(page, "Tagging 2 contacts…").first().waitFor({ timeout: 15000 }).catch(() => {});
  ok(`${vp.name} · U23 ACTING · with the run's response held, the overlay says "Tagging 2 contacts…" — what is attempted, no invented progress`,
    runHold.caught() && (await overlayNamed(page, "Tagging 2 contacts…").count()) === 1, `caught ${runHold.caught()}`);
  ok(`${vp.name} · U23 ACTING · no horizontal page overflow with the overlay up`, (await overflowOf(page)) === 0, `${await overflowOf(page)}px`);
  await page.screenshot({ path: join(SHOTS, `${vp.name}-u23-acting.png`) });
  await runHold.release();
  const doneLine = await toastLine(page, "Tagged", /^\d+ tagged · \d+ already had it$/);
  ok(`${vp.name} · U23 DONE · released: the toast carries the SERVER's count, "2 tagged · 0 already had it", the overlay gone, the selection cleared`,
    doneLine === "2 tagged · 0 already had it" && (await barCount(page)) === 0 && (await barLine(page)) === BAR_NONE
      && (await overlayNamed(page, "Tagging 2 contacts…").count()) === 0,
    `"${doneLine}" · ${await barLine(page)}`);
  await shoot(page, `${vp.name}-u23-done`);

  // ── PARAMETERS · ADD TO LIST — a new list, named; then the same name in other capitals is REFUSED: one list to a person ──
  const listName = `U23 List ${vi}`;
  await tickRow(page, 0);
  await pressBulk(page, "addToList");
  await waitForParam(page, "addToList");
  if ((await page.locator(`${DIALOG} [data-field="newListName"]`).count()) === 0) {
    await page.locator(`${DIALOG} [data-field="list"] [role="combobox"]`).first().click();
    await page.getByRole("option", { name: "Name a new list…", exact: true }).first().click();
    await wait(300);
  }
  await newListBox(page).fill(listName);
  await continueParam(page);
  await waitForConfirm(page);
  const listTitle = await confirmTitle(page);
  await confirmButton(page, "Add 1").click();
  const listLine = await toastLine(page, `Added to “${listName}”`, /^\d+ added · \d+ already on it$/);
  ok(`${vp.name} · U23 ADD TO LIST · "Add 1 contact to a new list, “${listName}”?" confirmed: the toast names the list and counts "1 added · 0 already on it"`,
    listTitle === `Add 1 contact to a new list, “${listName}”?` && listLine === "1 added · 0 already on it", `${listTitle} · "${listLine}"`);
  await wait(800);
  await tickRow(page, 1);
  await pressBulk(page, "addToList");
  await waitForParam(page, "addToList");
  await page.locator(`${DIALOG} [data-field="list"] [role="combobox"]`).first().click();
  await wait(300);
  const listOptions = (await page.getByRole("option").allInnerTexts()).map((t) => t.trim());
  await page.getByRole("option", { name: "Name a new list…", exact: true }).first().click();
  await wait(300);
  await newListBox(page).fill(listName.toLowerCase());
  await continueParam(page);
  await page.waitForFunction(() => /already exists/.test(document.querySelector('[data-field="newListName"]')?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
  const dupErr = await textOf(page, `${DIALOG} [data-field="newListName"]`);
  ok(`${vp.name} · U23 ADD TO LIST · the picker offers the list just made; "${listName.toLowerCase()}" (only capitals differ) is REFUSED beside the box, and no confirmation opens`,
    listOptions.includes(listName) && listOptions.includes("Name a new list…")
      && dupErr.includes(`A list called “${listName}” already exists — two names that differ only in capitals are one list. Choose it instead.`)
      && (await page.locator(ALERT).count()) === 0,
    `options [${listOptions.join(", ")}] · ${dupErr}`);
  await formShot(page, vp.name, "u23-list-duplicate", "Add the selected contacts to a list", "already exists");
  await textButton(page, DIALOG, "Cancel").click().catch(() => {});
  await page.waitForSelector(`${DIALOG} [data-bulk-param]`, { state: "detached", timeout: 10000 }).catch(() => {});
  await page.locator(`${BAR} [data-bulk-clear]`).first().click().catch(() => {});
  await wait(250);

  // ── 🔴 A1.1 · GROWTH RECORDS A WITHDRAWAL — and is told the TOTAL only: whether a number was already withdrawn is a player
  // signal this role may not read ──
  await openContacts(page);
  const firstId = await attrOf(page, "[data-contact-row] a[data-edit-contact]", "data-edit-contact");
  await tickRow(page, 0);
  await pressBulk(page, "withdraw");
  await waitForConfirm(page);
  ok(`${vp.name} · U23 WITHDRAW · the confirmation says the withdrawal goes on the record in the officer's name, and records no consent`,
    (await confirmTitle(page)) === "Record a withdrawal for 1 contact?" && /in your name/.test(await consequence(page)) && /Nothing here records a consent\./.test(await consequence(page)),
    `${await confirmTitle(page)} · ${await consequence(page)}`);
  await confirmButton(page, "Record 1").click();
  const growthWithdrew = await toastLine(page, "Withdrawal recorded", /^A withdrawal is on record for \d+ contacts?$/);
  ok(`${vp.name} · U23 WITHDRAW · A1.1 · GROWTH's result is the TOTAL only — "A withdrawal is on record for 1 contact" — never the split`,
    growthWithdrew === "A withdrawal is on record for 1 contact" && (await page.getByText(/already withdrawn/).count()) === 0, `"${growthWithdrew}"`);

  // ── 🔴 D19 · A REFUSED FILTER IS NEVER AN AUDIENCE — GROWTH's ?player= draws the bar with nothing to tick, no "Select all" ──
  await openContacts(page, "?player=yes");
  ok(`${vp.name} · U23 D19 · on GROWTH's refused ?player= the bar stands with no rows, no header box and NO "Select all … matching"`,
    (await page.locator(BAR).count()) === 1 && (await page.locator("[data-contact-row]").count()) === 0
      && (await page.locator(`${BAR} [data-bulk-matching]`).count()) === 0 && (await headBox(page)) === null && (await barCount(page)) === 0);

  // ── REFUSED BY THE ACT GATE — a role that may VIEW Growth but not act (AUDITOR, given exactly that for this state): the
  // banner, a box that still ticks, every action ON SCREEN and disabled WITH the gate's sentence — never hidden ──
  await seed(page, "u23grant=view-only");
  const aud = await staffCtx("AUDITOR", "+255700002011", viewport);
  await openContacts(aud.page);
  const banner = (await aud.page.locator('[role="status"]', { hasText: "so the controls on this page are disabled" }).count()) === 1;
  await tickRow(aud.page, 0);
  const gated = await actionStates(aud.page);
  ok(`${vp.name} · U23 VIEW-ONLY · the read-only banner is up, a box still ticks ("1 selected"), and all six actions are ON SCREEN, disabled, each with the act gate's sentence`,
    banner && (await barLine(aud.page)) === "1 selected" && gated.map((a) => a.action).join(",") === BULK_ORDER
      && gated.every((a) => a.disabled && /^Read-only: the .+ role can view .+ but not change it\.$/.test(a.title)),
    JSON.stringify({ banner, gated: gated.slice(0, 2) }));
  const audRows = await aud.page.locator("[data-contact-row]").count();
  ok(`${vp.name} · U23 VIEW-ONLY · the "edit" link is not act-gated: every row still has it (the dialog's Save is gated, U22)`,
    audRows > 0 && (await aud.page.locator("[data-contact-row] a[data-edit-contact]").count()) === audRows, String(audRows));
  await barShot(aud.page, vp.name, "u23-view-only", "1 selected");
  await aud.ctx.close();
  await seed(page, "u23grant=reset");

  // ── 🔴 D19 · A READER'S CONFIRMATION IS MASKED TOO — selection rows are { id, name, masked } for every role ──
  const adm = await staffCtx("ADMIN", "+255700002012", viewport);
  await openContacts(adm.page, "?sort=name&dir=asc");
  for (const i of [0, 1, 2]) await tickRow(adm.page, i);
  await pressBulk(adm.page, "suppress");
  await waitForConfirm(adm.page);
  const admNamed = await sampleMasks(adm.page);
  ok(`${vp.name} · U23 ADMIN · even for the role that may reveal a number, the confirmation names the rows MASKED (+255••••NN) — the selection never carries a number`,
    admNamed.length === 3 && admNamed.every((t) => MASK.test(t.trim())) && NO_NUMBER(await confirmText(adm.page))
      && (await rowBoxes(adm.page)).every((b) => NO_NUMBER(b.label)),
    admNamed.join(" | "));
  await confirmShot(adm.page, vp.name, "u23-admin-masked", "Suppress 3 contacts?", "Permanent");
  await cancelConfirm(adm.page); // ⛔ never confirmed
  // A reader's withdrawal result carries the split that GROWTH's did not — on the same newest row, already withdrawn.
  await openContacts(adm.page);
  const admFirstId = await attrOf(adm.page, "[data-contact-row] a[data-edit-contact]", "data-edit-contact");
  await tickRow(adm.page, 0);
  await pressBulk(adm.page, "withdraw");
  await waitForConfirm(adm.page);
  await confirmButton(adm.page, "Record 1").click();
  const adminWithdrew = await toastLine(adm.page, "Withdrawal recorded", /^\d+ withdrawals? recorded · \d+ already withdrawn$/);
  ok(`${vp.name} · U23 ADMIN WITHDRAW · a reader is told the split${admFirstId === firstId ? ` — and the row GROWTH just withdrew reads "0 withdrawals recorded · 1 already withdrawn"` : ""}`,
    admFirstId === firstId ? adminWithdrew === "0 withdrawals recorded · 1 already withdrawn" : /^\d+ withdrawals? recorded · \d+ already withdrawn$/.test(adminWithdrew),
    `"${adminWithdrew}" · ${admFirstId} vs ${firstId}`);
  await adm.ctx.close();
  await ctx.close();
}

// ── U23 · reduced motion, at the narrow width — the confirmation and the overlay ──
{
  console.log(`\n[u23] prefers-reduced-motion: reduce (360x780)`);
  const { ctx, page } = await staffCtx("GROWTH", "+255700002010", { width: 360, height: 780 }, "reduce");
  ok("reduced-motion · U23 · the context really is reduced-motion", await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches));
  await openContacts(page);
  await tickRow(page, 0);
  await pressBulk(page, "remove");
  await waitForConfirm(page);
  await confirmShot(page, "360x780", "u23-reduced-confirm", "Remove 1 contact from the book?", "consent and stop records are kept");
  await textButton(page, ALERT, "Cancel").click().catch(() => {});
  await wait(60);
  ok("reduced-motion · U23 · Cancel closes the confirmation at once — no exit beat held", (await page.locator(ALERT).count()) === 0);
  await pressBulk(page, "tag");
  await waitForParam(page, "tag");
  await tagBox(page).fill("u23rm");
  await continueParam(page);
  await waitForConfirm(page);
  const rmHold = await holdNextAction(page);
  await confirmButton(page, "Tag 1").click();
  await overlayNamed(page, "Tagging 1 contact…").first().waitFor({ timeout: 15000 }).catch(() => {});
  ok(`reduced-motion · U23 · the overlay names the run, "Tagging 1 contact…"`, rmHold.caught() && (await overlayNamed(page, "Tagging 1 contact…").count()) === 1);
  await page.screenshot({ path: join(SHOTS, "360x780-u23-reduced-acting.png") });
  await rmHold.release();
  const rmLine = await toastLine(page, "Tagged", /^\d+ tagged · \d+ already had it$/);
  ok("reduced-motion · U23 · released, the toast carries the server's count", rmLine === "1 tagged · 0 already had it", `"${rmLine}"`);
  await ctx.close();
}

await browser.close();
console.log(`\nMEASURED ${JSON.stringify(measured)}`);
console.log(`\nu20-contacts-drive: ${pass} passed, ${fail} failed`);
console.log(`shots: ${SHOTS}`);
if (fail) process.exitCode = 1;
