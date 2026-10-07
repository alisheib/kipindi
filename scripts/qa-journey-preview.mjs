/**
 * LOCAL-ONLY end-to-end drive of the new journey's switch and preview (the Vodacom plan S1, `docs/VODACOM-PLAN.md`).
 * Done-when: "Staff see a 'preview' marker … and nobody else sees anything." This drive proves both halves in a real
 * browser, through the real doors, and reads every state from the PAGE, the COOKIE JAR and `/api/health`:
 *   §1 a guest sees nothing — no marker, no pass cookie, no trace in the HTML (the journey shell's test ids included);
 *   §2 a SUPPORT officer (not the Owner) turns their preview on from /admin/journey → lands on / wearing the marker,
 *      drawn the journey header at 1280 and its four tabs at 390 with no classic bar or coin (WP6b step 7), keeps it
 *      on a document load of /markets, exits with the marker's own button, and it is gone;
 *   §3 a signed-in player sees nothing;
 *   §4 the Owner stops the rollout → the officer's pass is ignored → Resume → it counts again;
 *   §5 the Owner issues a preview link → a stranger opens it and previews → the Owner revokes it → gone again;
 *   §6 no page error anywhere.
 * Viewport tiles (never full-page) land in KP_SHOTS for reading one by one.
 *
 *   KP_BASE=http://localhost:3041 KP_SHOTS=<dir> npm run qa:journey-preview
 *
 * ⛔ It really stops and resumes the rollout and issues a link — so it refuses anything but `http://localhost:PORT`
 * on an IN-MEMORY dev server (`DISABLE_ADMIN_TOTP=true`, sessions from POST /api/dev-test/seed-admin).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.KP_BASE ?? "http://localhost:3000";
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local dev only, addressed as http://localhost:PORT. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
{
  const res = await fetch(`${BASE}/api/health`).catch(() => null);
  const body = res ? await res.json().catch(() => null) : null;
  if (!body || body.database?.configured !== false) {
    console.error(`REFUSED — the server at ${BASE} reports a configured database (database.configured=${JSON.stringify(body?.database?.configured)}). This drive runs only against an in-memory dev server.`);
    process.exit(2);
  }
}
const SHOTS = process.env.KP_SHOTS ?? ".qa-journey-preview";
mkdirSync(SHOTS, { recursive: true });

const results = [];
const ok = (name, pass, detail = "") => { results.push(!!pass); console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const errors = [];
const MARKER = '[data-testid="journey-preview-marker"]';
const EXIT = '[data-testid="journey-preview-exit"]';
const journeyHealth = async () => (await (await fetch(`${BASE}/api/health`)).json())?.simpleJourney ?? null;
const passCookie = async (ctx) => (await ctx.cookies(BASE)).find((c) => c.name === "kp_preview") ?? null;

const b = await chromium.launch({ headless: true });
const PHONE = { width: 390, height: 844 };
const DESK = { width: 1280, height: 900 };
async function context(viewport = DESK) {
  const ctx = await b.newContext({ viewport });
  return ctx;
}
async function watch(page, who) {
  page.on("pageerror", (e) => errors.push(`${who}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource: the server responded with a status of 404/.test(m.text())) errors.push(`${who} console: ${m.text().slice(0, 200)}`); });
  return page;
}
const settle = async (page) => { await page.waitForLoadState("domcontentloaded"); await page.locator("main").first().waitFor({ timeout: 120_000 }); await page.waitForTimeout(900); };
const tile = async (page, name) => { await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const markerCount = (page) => page.locator(MARKER).count();
/**
 * ⭐ WP6b STEP 7 (done in S6 WP12): the trace a viewer WITHOUT a pass must never carry is the preview's (its marker, its
 * cookie) AND the journey shell's own test ids — the header's and the tabs' — as an HTML attribute, escaped or not, or as
 * a JSON prop in the RSC payload (`\"data-testid\":\"journey-tabs\"`). Test ids, never bare words: a chunk's file name
 * may hold "journey-tabs" and is not the shell. Two readings, kept apart so each can be proven on its own: the preview's
 * trace, and the shell's ids — 2.5c proves EACH shell id fires on the pass holder's own page (a single pattern with the
 * preview in it would pass there on the marker alone, and prove nothing about the ids).
 */
const PREVIEW_TRACE = /journey-preview|kp_preview/;
const shellId = (id) => new RegExp(`data-testid[\\\\":='\\s]{1,8}${id}\\b`);
const SHELL_IDS = { "journey-top-bar": shellId("journey-top-bar"), "journey-tabs": shellId("journey-tabs") };
/** Which of the shell's ids a page's HTML carries (attribute or JSON prop). */
const shellIdsIn = (html) => Object.fromEntries(Object.entries(SHELL_IDS).map(([id, re]) => [id, re.test(html)]));
/** A viewer without a pass: neither the preview's trace nor any shell id. */
const traceFree = (html) => !PREVIEW_TRACE.test(html) && !Object.values(shellIdsIn(html)).some(Boolean);
/** The chrome a page draws: the journey's header and rail (its four slots), and the classic bar and coin. */
const chrome = (page) => page.evaluate(() => {
  const shown = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
  };
  const n = (sel) => document.querySelectorAll(sel).length;
  const rail = document.querySelector("nav[data-testid='journey-tabs']");
  return {
    journeyHeader: n("header[data-testid='journey-top-bar']"),
    railShown: shown(rail),
    tabs: rail ? rail.querySelectorAll("li > .kp-rail__item").length : 0,
    classicHeader: n("header.app-topbar") - n("header.app-topbar[data-testid='journey-top-bar']"),
    classicCoin: n("[data-testid='deposit-rail']"),
  };
});

console.log(`qa:journey-preview — ${BASE}\n`);
const h0 = await journeyHealth();
ok("0.health the rollout is STAFF_PREVIEW under the shipped ceiling, with no record", h0?.ceiling === "STAFF_PREVIEW" && h0?.state === "STAFF_PREVIEW", JSON.stringify(h0));

// ── §1 · a guest ──────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · a guest sees nothing");
const guest = await context(PHONE);
const gp = await watch(await guest.newPage(), "guest");
await gp.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }); await settle(gp);
ok("1.1 no marker on / for a guest", (await markerCount(gp)) === 0);
ok("1.2 no pass cookie in a guest's jar", (await passCookie(guest)) === null);
ok("1.3 the guest's HTML carries no trace of the preview or the journey shell (the marker, the pass, the header's and tabs' test ids)", traceFree(await gp.content()));
await tile(gp, "1-guest-home-390");

// ── §2 · a SUPPORT officer previews ──────────────────────────────────────────────────────────────────────
console.log("\n§2 · a SUPPORT officer turns the preview on, sees the marker, exits");
const support = await context(DESK);
const seeded = await support.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { role: "SUPPORT", phone: "+255700000071", name: "Sam Support" } });
ok("2.0 a SUPPORT officer is seeded and signed in", seeded.ok(), String(seeded.status()));
const sp = await watch(await support.newPage(), "support");
await sp.goto(`${BASE}/admin/journey`, { waitUntil: "domcontentloaded" }); await settle(sp);
ok("2.1 /admin/journey opens for SUPPORT (every staff role may view it)", (await sp.getByRole("heading", { name: /New journey/ }).count()) > 0);
ok("2.2 SUPPORT sees no Owner control (no Stop, no Create link)", (await sp.getByRole("button", { name: /Stop — nobody sees it|Create a preview link/ }).count()) === 0);
await tile(sp, "2-admin-journey-support-1280");
const yourPreview = sp.locator('[data-journey-pass]');
ok("2.3 the page says this browser holds no pass", (await yourPreview.getAttribute("data-journey-pass")) === "none");
await yourPreview.scrollIntoViewIfNeeded(); await tile(sp, "2-your-preview-card-1280");
await Promise.all([sp.waitForURL(`${BASE}/`, { timeout: 60_000 }), sp.getByRole("button", { name: "Turn my preview on" }).click()]);
await settle(sp);
ok("2.4 the officer lands on / wearing the marker", (await markerCount(sp)) === 1);
const c = await passCookie(support);
ok("2.5 the pass cookie is HttpOnly, SameSite=Lax, path /, and ends within 24 h",
  !!c && c.httpOnly && c.sameSite === "Lax" && c.path === "/" && c.expires > Date.now() / 1000 && c.expires - Date.now() / 1000 <= 24 * 3600 + 5, JSON.stringify(c && { httpOnly: c.httpOnly, sameSite: c.sameSite, path: c.path, inH: ((c.expires - Date.now() / 1000) / 3600).toFixed(2) }));
const desk = await chrome(sp);
ok("2.5b at 1280 the pass holder is drawn the journey header, and no classic bar or coin",
  desk.journeyHeader === 1 && desk.classicHeader === 0 && desk.classicCoin === 0, JSON.stringify(desk));
{
  const ids = shellIdsIn(await sp.content());
  ok("2.5c control · the pass holder's HTML carries EACH of the journey shell's test ids — so 1.3 and 3.3 can fail on them", Object.values(ids).every(Boolean), JSON.stringify(ids));
}
await tile(sp, "2-home-with-marker-1280");
await sp.setViewportSize(PHONE); await sp.waitForTimeout(500);
const phone = await chrome(sp);
ok("2.5d at 390 the pass holder is drawn the journey header and its rail of four tabs, and no classic bar or coin",
  phone.journeyHeader === 1 && phone.railShown && phone.tabs === 4 && phone.classicHeader === 0 && phone.classicCoin === 0, JSON.stringify(phone));
await tile(sp, "2-home-with-marker-390");
await sp.setViewportSize(DESK);
await sp.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" }); await settle(sp);
ok("2.6 a document load of /markets still wears the marker", (await markerCount(sp)) === 1);
await Promise.all([sp.waitForURL(`${BASE}/`, { timeout: 60_000 }), sp.locator(EXIT).click()]);
await settle(sp);
ok("2.7 'Exit preview' lands on / and the marker is gone", (await markerCount(sp)) === 0);
ok("2.8 …and the pass is out of the jar", (await passCookie(support)) === null);
await tile(sp, "2-home-after-exit-1280");
// On again, for §4.
await sp.goto(`${BASE}/admin/journey`, { waitUntil: "domcontentloaded" }); await settle(sp);
await Promise.all([sp.waitForURL(`${BASE}/`, { timeout: 60_000 }), sp.getByRole("button", { name: "Turn my preview on" }).click()]);
await settle(sp);
ok("2.9 turned on again (for §4)", (await markerCount(sp)) === 1);

// ── §3 · a player ─────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · a signed-in player sees nothing");
const player = await context(PHONE);
const pp = await watch(await player.newPage(), "player");
await pp.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" }); await settle(pp);
await pp.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }); await settle(pp);
const signedIn = (await player.cookies(BASE)).some((x) => x.name === "kp_session");
ok("3.1 the demo player is signed in", signedIn);
ok("3.2 no marker on / for a player", (await markerCount(pp)) === 0);
ok("3.3 the player's HTML carries no trace of the preview or the journey shell (the marker, the pass, the header's and tabs' test ids)", traceFree(await pp.content()));
await tile(pp, "3-player-home-390");

// ── §4 · the Owner stops and resumes ─────────────────────────────────────────────────────────────────────
console.log("\n§4 · the Owner stops the rollout, then resumes it");
const owner = await context(DESK);
const os = await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001" } });
ok("4.0 the Owner is seeded and signed in", os.ok(), String(os.status()));
const op = await watch(await owner.newPage(), "owner");
const openJourney = async () => { await op.goto(`${BASE}/admin/journey`, { waitUntil: "domcontentloaded" }); await settle(op); };
async function ceremony(trigger, confirmName, reason) {
  await op.getByRole("button", { name: trigger }).first().click();
  const dlg = op.locator('[role="alertdialog"], [role="dialog"]').last();
  await dlg.waitFor({ timeout: 15_000 });
  await dlg.locator("textarea").fill(reason);
  await tile(op, `4-dialog-${confirmName.replace(/\W+/g, "-").toLowerCase()}`);
  await dlg.getByRole("button", { name: confirmName }).click();
  await dlg.waitFor({ state: "hidden", timeout: 30_000 });
  await op.waitForTimeout(1200);
}
await openJourney();
ok("4.1 the Owner sees Stop", (await op.getByRole("button", { name: "Stop — nobody sees it" }).count()) === 1);
await tile(op, "4-admin-journey-owner-1280");
await ceremony("Stop — nobody sees it", "Stop it now", "Local drive: proving the instant kill end to end.");
ok("4.2 health says WITHDRAWN after Stop", (await journeyHealth())?.state === "WITHDRAWN");
await openJourney();
ok("4.3 the Rollout card says Off", (await op.locator('[data-journey-state]').getAttribute("data-journey-state")) === "WITHDRAWN");
await tile(op, "4-admin-journey-stopped-1280");
await sp.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }); await settle(sp);
ok("4.4 the officer's pass is ignored while stopped — no marker", (await markerCount(sp)) === 0 && (await passCookie(support)) !== null);
await ceremony("Resume", "Resume", "Local drive: resuming after the kill check.");
ok("4.5 health says STAFF_PREVIEW after Resume", (await journeyHealth())?.state === "STAFF_PREVIEW");
await sp.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }); await settle(sp);
ok("4.6 the same pass counts again — the marker is back", (await markerCount(sp)) === 1);

// ── §5 · a preview link ──────────────────────────────────────────────────────────────────────────────────
console.log("\n§5 · the Owner issues a preview link; a stranger opens it; the Owner revokes it");
await openJourney();
await op.getByRole("button", { name: "Create a preview link" }).click();
const cd = op.locator('[role="dialog"]').last();
await cd.waitFor({ timeout: 15_000 });
await cd.locator("input").first().fill("Agency — drive");
await cd.locator("textarea").fill("Local drive: the agency's preview link.");
await cd.getByRole("button", { name: "Create the link" }).click();
await cd.waitFor({ state: "hidden", timeout: 30_000 });
await op.waitForTimeout(1500);
const url = (await op.locator("code").filter({ hasText: "/preview?t=" }).first().innerText().catch(() => "")).trim();
ok("5.1 the new link's address is shown to the Owner", /\/preview\?t=[\w.-]+$/.test(url), url.slice(0, 60));
await tile(op, "5-link-created-1280");
const stranger = await context(PHONE);
const xp = await watch(await stranger.newPage(), "stranger");
const local = url.replace(/^https?:\/\/[^/]+/, BASE);
await xp.goto(local, { waitUntil: "domcontentloaded" }); await settle(xp);
ok("5.2 a stranger opening the link lands on / wearing the marker", new URL(xp.url()).pathname === "/" && (await markerCount(xp)) === 1, xp.url());
await tile(xp, "5-stranger-with-marker-390");
await openJourney();
await op.getByRole("button", { name: "Revoke" }).first().click();
const rd = op.locator('[role="alertdialog"]').last();
await rd.waitFor({ timeout: 15_000 });
await rd.locator("textarea").fill("Local drive: revoking the agency link.");
await rd.getByRole("button", { name: "Revoke the link" }).click();
await rd.waitFor({ state: "hidden", timeout: 30_000 });
await op.waitForTimeout(1200);
await xp.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }); await settle(xp);
ok("5.3 after the revoke the stranger's pass counts for nothing — no marker", (await markerCount(xp)) === 0);
await openJourney();
ok("5.4 the link is listed as Revoked", (await op.locator('[data-journey-link="revoked"]').count()) >= 1);
await tile(op, "5-link-revoked-1280");
const again = await stranger.newPage();
await again.goto(local, { waitUntil: "domcontentloaded" }); await settle(again);
ok("5.5 the revoked link opens nothing", (await markerCount(again)) === 0);

// ── §6 · errors ───────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§6 · no page error anywhere");
ok("6.1 no page errors or console errors in any context", errors.length === 0, errors.slice(0, 5).join(" | "));

await b.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed — tiles in ${SHOTS}`);
process.exit(failed ? 1 : 0);
