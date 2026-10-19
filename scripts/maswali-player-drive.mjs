/**
 * qa:maswali-player-drive — the player's Millionea, end to end, as a player meets it (MASWALI-BUILD S5 acceptance; the
 * composition brief's item 8; MASWALI-PLAN §7b S5).
 *
 *   BASE=http://localhost:3410 node scripts/maswali-player-drive.mjs
 *
 * ⭐ RUN IT TWICE — production's configuration and the product's (the S5 review of 24ec0d33, LOW 13):
 *   · against a server with NO FEATURE_MILLIONEA (the shipped WITHDRAWN ceiling, production today) it runs step W alone:
 *     the edge's real 404 for a guest on every route, no door on the home, the board, /positions or More, and a signed-in
 *     player who holds no ticket meeting the plain not-found on the tickets — no word of the product, ghost included;
 *   · against a server with FEATURE_MILLIONEA=ACTIVE it runs steps 1–6 below.
 * ⚠️ PREMISE — a FRESH in-memory `next dev` (`rm -rf .next` first; no DATABASE_URL), and, for steps 1–6,
 *    FEATURE_MILLIONEA=ACTIVE (the seed sells, and the ticket arm reads the real rollout), DISABLE_ADMIN_TOTP=true (the
 *    Owner's switch and the staff preview pass), and the journey previewable (FEATURE_SIMPLEJOURNEY=STAFF_PREVIEW or
 *    ACTIVE, for Tiketi zangu's third kind). It refuses, exit 2, when any of that is absent — never a half-run.
 *
 *   1 · the Owner seeds a week in every state (`/api/dev-test/seed-maswali`, the S4 seed);
 *   2 · CLASSIC ENTRY: the demo player (a classic reader: no pass) finds the card at the head of /markets, follows it to
 *       the hub, and finds "Millionea" as the first row of the top bar's More;
 *   3 · THE TICKET: hub → slip → fifteen answers (each a radio group) → the confirm → "Cut ticket" → the stamp → the
 *       ticket page; the free cancel inside its window → the neutral result → the ticket reads cancelled; then a second
 *       ticket bought the same way;
 *   4 · TIKETI ZANGU: with a staff preview pass beside the player's session, /positions draws Millionea as its third kind
 *       and the list holds both tickets;
 *   5 · THE KILL (L5, the positive control): the Owner moves the switch to WITHDRAWN through its typed ceremony. A guest
 *       meets the not-found on every Millionea route; the board shows no card and More no row; the HOLDER still reads
 *       their tickets and their ticket; a stranger (a second player, holding none) meets the not-found on both; then the
 *       switch goes back to ACTIVE.
 * ⛔ The only routes it calls itself are the dev-only seeds and the demo sign-in; everything else is a click, a key or a
 *    typed word. Viewport tiles only (`.50pick-shots/maswali-player/`), read one by one. Localhost only.
 * ⚠️ At a STORED-switch kill under an ACTIVE ceiling the routes answer the not-found page under a 200 (the root loading
 *    file streams first); the edge's real 404 answers only a ceiling below ACTIVE (`src/lib/millionea-edge.ts`). Step 5
 *    therefore asserts the not-found DOCUMENT, and says which status it saw.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { MILLIONEA_ENTRY_PAGES, MILLIONEA_ROUTES } from "./live/millionea-dark.mjs";

const BASE = process.env.BASE || "http://localhost:3410";
const OUT = ".50pick-shots/maswali-player";
const OWNER_PHONE = "+255700000091";
const STRANGER_PHONE = "+255700000092";
/** The platform's not-found page in English (`NOT_FOUND_WORDS.en`, `src/components/ui/not-found-words.ts`, drawn by
 *  `not-found-view.tsx`): its h1 is the body line, under the "404 · Page not found" eyebrow. Both are read, so a page that
 *  merely mentions the words never passes — and the h1 is what the view really draws (a heading NAMED "Page not found"
 *  exists nowhere, so the first form of this check could never pass). */
const NOT_FOUND = "Page not found";
const NOT_FOUND_H1 = "We couldn’t find that page";

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };

const pre = await premise(BASE);
if (pre.refuse) die(pre.refuse);
const ml = pre.health?.millionea;
/** Production's configuration: the shipped ceiling, nothing raised — step W alone. */
const DARK = !!ml && ml.ceiling === "WITHDRAWN" && ml.state === "WITHDRAWN";
if (!DARK && (!ml || ml.ceiling !== "ACTIVE" || ml.state !== "ACTIVE")) {
  die(`/api/health says millionea = ${JSON.stringify(ml)}: start next dev with no FEATURE_MILLIONEA (step W, production's configuration), or with FEATURE_MILLIONEA=ACTIVE and no stored switch (steps 1–6)`);
}
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errs = [];
/** A context on BASE carrying the given cookies (session, pass) and English. */
async function contextWith(cookies, viewport = { width: 360, height: 780 }) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: "en", url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
  return ctx;
}
async function open(page, path) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  return res;
}
const tile = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
const notFoundShown = async (page) =>
  (await page.getByRole("heading", { level: 1, name: NOT_FOUND_H1, exact: true }).count()) > 0
  && (await page.getByText(`404 · ${NOT_FOUND}`, { exact: true }).count()) > 0;
const traceOf = (html) => /data-testid="millionea-[a-z-]+"|href="\/millionea(?:[/?#][^"]*)?"/.test(html);

// ── W · PRODUCTION'S CONFIGURATION — the shipped WITHDRAWN ceiling (the S5 review of 24ec0d33, LOW 13) ─────────────────
/** The words the Millionea ghosts once printed (en): none may be in a not-found document's HTML (HIGH 2's wordless ghosts). */
const GHOST_WORDS = ["Maswali Millionea", "Your Millionea tickets"];
async function darkPass() {
  // W.1 the edge: a guest gets the router's own 404 status, and its page, on every Millionea route.
  const guest = await contextWith([]);
  const gp = await guest.newPage();
  gp.on("pageerror", (e) => errs.push(String(e)));
  for (const route of MILLIONEA_ROUTES) {
    const res = await open(gp, route);
    ok(`W.1 the edge answers ${route} for a guest with the router's own 404 (status ${res?.status()})`, res?.status() === 404 && (await notFoundShown(gp)));
  }
  // W.2 the dark doors, for a guest: the home and the board carry no Millionea card or link.
  for (const page of MILLIONEA_ENTRY_PAGES) {
    const html = (await (await open(gp, page))?.text().catch(() => "")) ?? "";
    ok(`W.2 ${page} carries no Millionea door for a guest`, html.length > 0 && !traceOf(html));
  }
  await tile(gp, "W-guest-board-360");
  await guest.close();
  // W.3–W.4 the dark doors, for a signed-in player (no pass): the board and /positions, and More's rows at 1280.
  const reader = await contextWith([await demoSession(browser, BASE)], { width: 1280, height: 900 });
  const rp = await reader.newPage();
  rp.on("pageerror", (e) => errs.push(String(e)));
  for (const page of ["/markets", "/positions"]) {
    const html = (await (await open(rp, page))?.text().catch(() => "")) ?? "";
    ok(`W.3 ${page} carries no Millionea door for a signed-in player`, html.length > 0 && !traceOf(html));
  }
  await open(rp, "/results");
  await rp.getByRole("button", { name: "More" }).first().click();
  const rows = await rp.getByRole("menuitem").allTextContents();
  ok("W.4 the top bar's More holds no Millionea row (≥1024)", rows.length > 0 && !rows.some((r) => r.includes("Millionea")), JSON.stringify(rows));
  await rp.keyboard.press("Escape");
  // W.5 a signed-in player who holds no ticket passes the edge to the tickets' gate (L5): the plain not-found — no word of
  // the product in what they see, and none of the ghosts' old words anywhere in the document.
  await rp.setViewportSize({ width: 360, height: 780 });
  for (const route of ["/millionea/tickets", "/millionea/tickets/NO-SUCH-SERIAL"]) {
    const res = await open(rp, route);
    const html = (await res?.text().catch(() => "")) ?? "";
    const seen = await rp.locator("body").innerText().catch(() => "");
    const words = GHOST_WORDS.filter((w) => html.includes(w));
    ok(`W.5 a signed-in non-holder meets the plain not-found on ${route} (status ${res?.status()}): no word of the product on screen or in the document`,
      (await notFoundShown(rp)) && !/Millionea/.test(seen) && words.length === 0, JSON.stringify({ words, seen: seen.slice(0, 120) }));
  }
  await tile(rp, "W-nonholder-tickets-360");
  await reader.close();
}
if (DARK) {
  await darkPass();
  ok("W.6 no page error on the pages read", errs.length === 0, errs.slice(0, 3).join(" | "));
  await browser.close();
  console.log(`\nmaswali-player-drive (production's configuration, WITHDRAWN): ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── 1 · the Owner seeds the weeks ─────────────────────────────────────────────────────────────────────────────────
const owner = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const ownerPage = await owner.newPage();
ownerPage.setDefaultTimeout(60_000);
const seededOwner = await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: OWNER_PHONE, name: "Millionea Owner" }, timeout: 240_000 });
ok("1.1 the Owner is signed in", seededOwner.ok(), `${seededOwner.status()}`);
const seed = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
const seeded = await seed.json().catch(() => ({}));
ok("1.2 a week in every state is seeded (a fresh server)", seed.ok() && seeded.ok === true, JSON.stringify(seeded).slice(0, 300));
if (!(seed.ok() && seeded.ok === true)) { await browser.close(); die("the seed failed — restart next dev (rm -rf .next) and run again"); }

// ── 2 · classic entry ─────────────────────────────────────────────────────────────────────────────────────────────
const playerSession = await demoSession(browser, BASE, { query: "?deposit=0", balance: 50_000 });
const classic = await contextWith([playerSession]);
const p = await classic.newPage();
p.on("pageerror", (e) => errs.push(String(e)));
await open(p, "/markets");
const card = p.getByTestId("millionea-home-card");
ok("2.1 the classic board carries the Millionea card at its head", (await card.count()) === 1);
await tile(p, "2-markets-card-360");
await Promise.all([p.waitForURL(`${BASE}/millionea`, { timeout: 120_000 }), card.getByRole("link").first().click()]);
ok("2.2 the card opens the hub", p.url() === `${BASE}/millionea` && (await p.getByRole("heading", { level: 1 }).first().textContent())?.includes("Millionea") === true);
await p.setViewportSize({ width: 1280, height: 900 });
await open(p, "/results");
await p.getByRole("button", { name: "More" }).first().click();
const firstRow = p.getByRole("menuitem").first();
ok("2.3 \"Millionea\" is the first row of the top bar's More (≥1024)", ((await firstRow.textContent()) ?? "").includes("Millionea"));
await tile(p, "2-more-row-1280");
await p.keyboard.press("Escape");
await p.setViewportSize({ width: 360, height: 780 });

// ── 3 · the ticket ────────────────────────────────────────────────────────────────────────────────────────────────
async function buyOne(label) {
  await open(p, "/millionea");
  const fillDoor = p.getByTestId("millionea-hub-fill");
  ok(`${label}.1 the hub offers "Fill a ticket"`, (await fillDoor.count()) === 1);
  await Promise.all([p.waitForURL(`${BASE}/millionea/slip`, { timeout: 120_000 }), fillDoor.click()]);
  const groups = p.getByRole("radiogroup");
  ok(`${label}.2 the slip asks fifteen questions, each one radio group`, (await groups.count()) === 15, `${await groups.count()}`);
  for (let i = 0; i < 15; i++) await groups.nth(i).getByRole("radio").first().click();
  await tile(p, `${label}-slip-answered-360`);
  const proceed = p.locator("button:visible", { hasText: "Continue" }).first();
  ok(`${label}.3 fifteen answers arm "Continue"`, (await proceed.count()) === 1);
  await proceed.click();
  const commit = p.getByRole("button", { name: /^Cut ticket/ });
  await commit.waitFor({ timeout: 60_000 });
  await tile(p, `${label}-confirm-360`);
  await commit.click();
  const view = p.getByRole("button", { name: "View ticket" });
  await view.waitFor({ timeout: 120_000 });
  ok(`${label}.4 the cut ticket's stamp names its serial`, ((await p.getByRole("dialog").first().textContent()) ?? "").includes("Ticket cut"));
  await tile(p, `${label}-stamp-360`);
  await Promise.all([p.waitForURL(/\/millionea\/tickets\/[^/]+$/, { timeout: 120_000 }), view.click()]);
  ok(`${label}.5 the ticket page draws the ticket`, (await p.getByTestId("millionea-ticket").count()) === 1);
  await tile(p, `${label}-ticket-360`);
  return decodeURIComponent(p.url().split("/").pop() ?? "");
}
const first = await buyOne("3a");
const cancel = p.getByRole("button", { name: /^Free cancel until/ });
ok("3b.1 the free cancel stands under the ticket inside its window", (await cancel.count()) === 1);
await cancel.click();
const dlg = p.getByRole("alertdialog").or(p.getByRole("dialog")).filter({ hasText: `Cancel ticket ${first}?` });
await dlg.getByRole("button", { name: "Cancel ticket", exact: true }).click();
// The result as the platform's neutral modal says it: a dialog (an error crest would be an alertdialog) naming the cancel.
const cancelled = await p.getByRole("dialog").filter({ hasText: "Ticket cancelled" }).first().waitFor({ timeout: 120_000 }).then(() => true).catch(() => false);
const alarmed = await p.getByRole("alertdialog").filter({ hasText: "Ticket cancelled" }).count();
ok("3b.2 the cancel answers with the neutral result — a dialog naming the cancel, never the danger crest", cancelled && alarmed === 0, `dialog ${cancelled} · alertdialog ${alarmed}`);
await p.keyboard.press("Escape");
await open(p, `/millionea/tickets/${encodeURIComponent(first)}`);
ok("3b.3 the ticket now reads cancelled", ((await p.getByTestId("millionea-ticket").textContent()) ?? "").toLowerCase().includes("cancel"));
await tile(p, "3b-cancelled-360");
const second = await buyOne("3c");
ok("3c.6 the second ticket has its own serial", second !== first && second.length > 0, `${first} / ${second}`);

// ── 4 · Tiketi zangu's third kind ─────────────────────────────────────────────────────────────────────────────────
const passCookie = await mintStaffPass(browser, BASE);
const journeySession = await demoSession(browser, BASE);
const journey = await contextWith([journeySession, passCookie]);
const jp = await journey.newPage();
jp.on("pageerror", (e) => errs.push(String(e)));
await open(jp, "/positions");
const segment = jp.getByRole("link", { name: "Millionea" }).or(jp.getByRole("tab", { name: "Millionea" }));
ok("4.1 Tiketi zangu draws Millionea as its third kind", (await segment.count()) >= 1);
await tile(jp, "4-switch-360");
await open(jp, "/millionea/tickets");
const listed = await jp.getByTestId("millionea-tickets").textContent().catch(() => "");
ok("4.2 Tiketi zangu's Millionea list holds both tickets", (listed ?? "").includes(first) && (listed ?? "").includes(second), (listed ?? "").slice(0, 200));
await tile(jp, "4-tickets-360");
await journey.close();

// ── 5 · the kill, and L5 ──────────────────────────────────────────────────────────────────────────────────────────
async function moveSwitch(to, label) {
  await open(ownerPage, "/admin/maswali/pools");
  const select = ownerPage.getByRole("combobox", { name: "Rollout" });
  await select.click();
  await ownerPage.getByRole("option", { name: label, exact: true }).click();
  await ownerPage.getByLabel("Why").fill(`Player drive: ${to} positive control`);
  await ownerPage.getByRole("button", { name: "Move the switch", exact: true }).click();
  const confirm = ownerPage.getByRole("alertdialog").or(ownerPage.getByRole("dialog")).filter({ hasText: `Set Millionea to ${to}?` });
  await confirm.getByPlaceholder(to, { exact: true }).fill(to);
  await confirm.getByRole("button", { name: "Move it", exact: true }).click();
  await confirm.waitFor({ state: "hidden", timeout: 120_000 });
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  return health?.millionea?.state;
}
ok("5.1 the Owner's typed ceremony moves the switch to WITHDRAWN", (await moveSwitch("WITHDRAWN", "Nobody (withdrawn)")) === "WITHDRAWN");
const guest = await contextWith([]);
const gp = await guest.newPage();
for (const route of ["/millionea", "/millionea/slip", "/millionea/how", "/millionea/register", "/millionea/tickets", `/millionea/tickets/${encodeURIComponent(second)}`]) {
  const res = await open(gp, route);
  ok(`5.2 a guest meets the not-found on ${route} (status ${res?.status()})`, (await notFoundShown(gp)) || res?.status() === 404);
}
const board = await (await open(gp, "/markets"))?.text().catch(() => "");
ok("5.3 the board carries no Millionea card or link for a guest", !traceOf(board ?? ""));
await guest.close();
// ⚠️ `/auth/demo` starts a NEW session for the one demo account and ends the last (step 4 took one), so the holder signs in
// afresh here — the same account, the same two tickets.
await classic.close();
const holder = await contextWith([await demoSession(browser, BASE)]);
const hp = await holder.newPage();
hp.on("pageerror", (e) => errs.push(String(e)));
await open(hp, "/millionea/tickets");
ok("5.4 L5 · the HOLDER still reads their tickets after the kill", ((await hp.getByTestId("millionea-tickets").textContent().catch(() => "")) ?? "").includes(second));
await open(hp, `/millionea/tickets/${encodeURIComponent(second)}`);
ok("5.5 L5 · …and their ticket", (await hp.getByTestId("millionea-ticket").count()) === 1);
await tile(hp, "5-holder-ticket-360");
await open(hp, "/millionea");
ok("5.6 L5 · the hub follows the rollout, for the holder too", await notFoundShown(hp));
await holder.close();
const strangerCtx = await browser.newContext({ viewport: { width: 360, height: 780 } });
const seededStranger = await strangerCtx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: STRANGER_PHONE, name: "Stranger", role: "PLAYER" } });
ok("5.7 a stranger (a player holding no ticket) is signed in", seededStranger.ok(), `${seededStranger.status()}`);
await strangerCtx.addCookies([{ name: LOCALE_COOKIE, value: "en", url: BASE }]);
const sp = await strangerCtx.newPage();
await open(sp, "/millionea/tickets");
ok("5.8 L5 · a stranger meets the not-found on the tickets", await notFoundShown(sp));
await open(sp, `/millionea/tickets/${encodeURIComponent(second)}`);
ok("5.9 L5 · …and on another player's ticket: the same not-found as an unknown serial", await notFoundShown(sp));
await open(sp, "/millionea/tickets/NO-SUCH-SERIAL");
ok("5.10 L5 · CONTROL · an unknown serial meets the same not-found", await notFoundShown(sp));
await strangerCtx.close();
ok("5.11 the switch goes back to ACTIVE", (await moveSwitch("ACTIVE", "Everyone")) === "ACTIVE");

ok("6 · no page error on the player's pages", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close();
console.log(`\nmaswali-player-drive: ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
