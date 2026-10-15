/**
 * S11 WP10 — How to Play as a local staff-preview player sees it.
 *
 * KP_BASE=http://localhost:3042 npm run qa:howto -- [outDir]
 * KP_ONLY=auto,automation,exits,deep,break,consent,card,classic,tiles npm run qa:howto
 *
 * The 72 numbered screenshots are evidence to READ after this drive: 48 sheet
 * (four routes × four widths × three languages), 12 open FAQ and 12 chat.
 * Never aim this at production. The premise requires localhost, in-memory data,
 * a preview-capable rollout and disabled admin TOTP. Tiles go outside the repo.
 */
import { chromium, firefox, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3042";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] ?? join(tmpdir(), `qa-howto-${Date.now()}`));
const SECTIONS = ["auto", "automation", "exits", "deep", "break", "consent", "card", "classic", "tiles"];
const ONLY = (process.env.KP_ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
if (ONLY.some((s) => !SECTIONS.includes(s))) {
  console.error(`REFUSED — KP_ONLY names an unknown section; choose ${SECTIONS.join(", ")}`);
  process.exit(2);
}
const run = (s) => ONLY.length === 0 || ONLY.includes(s);
const rel = relative(ROOT, OUT);
if (!rel.startsWith("..") && !isAbsolute(rel)) { console.error(`REFUSED — screenshots must be outside ${ROOT}`); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const pre = await premise(BASE);
if (pre.refuse) { console.error(`REFUSED — ${pre.refuse}`); process.exit(2); }
if (pre.health?.security?.adminTotp !== "DISABLED") { console.error("REFUSED — local DISABLE_ADMIN_TOTP=true is required"); process.exit(2); }

const engines = { chromium, firefox, webkit };
const browsers = { chromium: await chromium.launch() };
const host = new URL(BASE).hostname;
const cookie = (c) => ({ name: c.name, value: c.value, domain: host, path: c.path || "/" });
const PASS = await mintStaffPass(browsers.chromium, BASE);
const SESSION = await demoSession(browsers.chromium, BASE);
let QUESTION = null;
if (run("auto") || run("deep")) {
  const seed = await browsers.chromium.newContext();
  try {
    const phone = `+25571${String(parseInt(randomUUID().replaceAll("-", "").slice(0, 10), 16) % 10_000_000).padStart(7, "0")}`;
    const admin = await seed.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { role: "ADMIN", phone, name: "Local How-to Seeder" }, timeout: 180_000 });
    if (!admin.ok()) throw new Error(`seed-admin answered ${admin.status()}`);
    const made = await seed.request.post(`${BASE}/api/dev-test/seed-markets`, { data: {}, timeout: 180_000 });
    const body = await made.json().catch(() => null);
    if (!made.ok() || !body?.ids?.length) throw new Error(`seed-markets gave no question (${made.status()})`);
    QUESTION = body.ids[0].id;
  } finally { await seed.close(); }
}
const SHEET = '[data-testid="journey-howto-sheet"]';
const seenKey = "50pick-howto-seen";
let passed = 0, failed = 0, blocked = 0, tileNo = 0;
function ok(name, yes, detail = "") {
  console.log(`  ${yes ? "PASS" : "FAIL"} ${name}${!yes && detail ? ` — ${detail}` : ""}`);
  yes ? passed++ : failed++;
}
function block(name, error) { blocked++; console.log(`  BLOCKED ${name} — ${String(error?.message ?? error).split("\n")[0]}`); }
const path = (page) => new URL(page.url()).pathname + new URL(page.url()).search;
const slug = (s) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
async function shot(page, name) {
  tileNo++;
  const file = join(OUT, `${String(tileNo).padStart(3, "0")}-${slug(name)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`    tile ${String(tileNo).padStart(3, "0")} ${name}`);
}
async function browserFor(engine) {
  if (!browsers[engine]) browsers[engine] = await engines[engine].launch();
  return browsers[engine];
}
async function context({ engine = "chromium", w = 390, h = 844, locale = "sw", pass = true, signed = true, force = false, seen = false, consent = false, primerSeen = true } = {}) {
  const b = await browserFor(engine);
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const cookies = [{ name: LOCALE_COOKIE, value: locale, domain: host, path: "/" }];
  if (pass) cookies.push(cookie(PASS));
  if (signed) cookies.push(cookie(SESSION));
  await ctx.addCookies(cookies);
  await ctx.addInitScript(({ force, seen, consent, seenKey, primerSeen }) => {
    try {
      if (primerSeen) window.localStorage.setItem("50pick-primer-seen", "1");
      if (force) window.localStorage.setItem("kp-primer-force", "1");
      if (seen) window.localStorage.setItem(seenKey, "1");
      if (consent) window.localStorage.setItem("kp-consent-force", "1");
    } catch { /* the test below reports a refused storage write */ }
  }, { force, seen, consent, seenKey, primerSeen });
  return ctx;
}
async function pageAt(ctx, url) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.addStyleTag({ content: "nextjs-portal { pointer-events:none !important; }" }).catch(() => {});
  return page;
}
async function opens(page, timeout = 20_000) {
  return page.locator(SHEET).first().waitFor({ state: "visible", timeout }).then(() => true).catch(() => false);
}
async function staysShut(page) {
  await page.waitForTimeout(1700); // the host decides at 700 ms; React hydration can start later
  return !(await page.locator(SHEET).first().isVisible().catch(() => false));
}
async function seen(page) { return page.evaluate((k) => localStorage.getItem(k), seenKey).catch(() => null); }
async function closeBy(page, way) {
  const dialog = page.locator(`[role="dialog"]:has(${SHEET})`).first();
  if (way === "x") await dialog.locator('button[aria-label]:not(.m-scrim)').first().click();
  if (way === "scrim") await dialog.locator("button.m-scrim").click({ position: { x: 4, y: 4 } });
  if (way === "escape") await page.keyboard.press("Escape");
  if (way === "cta") await page.locator(`${SHEET} button.kp-wsheet__act`).click();
  if (way === "limits") await page.locator(`${SHEET} a.kp-wsheet__link`).click();
  if (way === "back") await page.goBack({ waitUntil: "domcontentloaded" });
  await page.locator(SHEET).first().waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
}

console.log(`qa:howto — ${BASE}; screenshots ${OUT}`);
try {
  if (run("auto")) {
    console.log("\nA · forced first landing, and every excluded route or moment");
    for (const route of ["/", "/live", "/results", "/watchlist"]) {
      const ctx = await context({ force: true });
      try { const p = await pageAt(ctx, route); ok(`${route} opens in a fresh browser`, await opens(p)); }
      catch (e) { block(`auto ${route}`, e); }
      finally { await ctx.close(); }
    }
    for (const route of [`/markets/${QUESTION}`, "/updown", "/wallet", "/wallet/deposit", "/profile/responsible-gambling", "/legal/responsible-gambling", "/account", "/help", "/auth/login", "/s", `/?bet=${QUESTION}.YES`, "/?side=YES"]) {
      const ctx = await context({ force: true, signed: route !== "/auth/login" });
      try { const p = await pageAt(ctx, route); ok(`${route} stays shut`, await staysShut(p)); }
      catch (e) { block(`excluded ${route}`, e); }
      finally { await ctx.close(); }
    }
    const ctx = await context({ force: true, seen: true });
    try { const p = await pageAt(ctx, "/"); ok("seen key suppresses auto-open", await staysShut(p)); }
    catch (e) { block("seen key", e); }
    finally { await ctx.close(); }
    const wallet = await context({ force: true });
    try {
      const p = await pageAt(wallet, "/");
      await p.getByTestId("journey-balance").first().click({ timeout: 15_000 });
      ok("wallet sheet occupies the slot before the 700 ms decision", await p.getByTestId("wallet-sheet").isVisible() && await staysShut(p));
    } catch (e) { block("wallet overlap", e); }
    finally { await wallet.close(); }
  }

  if (run("automation")) {
    console.log("\nB · automation block in Chromium, Firefox and WebKit; forced positive control");
    for (const engine of Object.keys(engines)) {
      for (const force of [false, true]) {
        const ctx = await context({ engine, force });
        try {
          const p = await pageAt(ctx, "/");
          ok(`${engine} ${force ? "forced opens" : "unforced stays shut"}`, force ? await opens(p) : await staysShut(p));
          ok(`${engine} reports webdriver`, await p.evaluate(() => navigator.webdriver === true));
        } catch (e) { block(`automation ${engine} forced=${force}`, e); }
        finally { await ctx.close(); }
      }
    }
  }

  if (run("exits")) {
    console.log("\nC · every exit remembers that the sheet was seen");
    for (const way of ["x", "scrim", "escape", "cta", "limits", "back"]) {
      const ctx = await context({ force: true, seen: way === "back" });
      try {
        const p = await pageAt(ctx, way === "back" ? "/live" : "/");
        if (way === "back") {
          await p.evaluate((key) => localStorage.removeItem(key), seenKey);
          await p.locator('[data-testid="journey-tabs"] a[href="/"]').click();
          await p.waitForURL(`${BASE}/`);
        }
        if (!(await opens(p))) { ok(`${way} has an open sheet to leave`, false); continue; }
        await closeBy(p, way);
        ok(`${way} writes ${seenKey}=1`, await seen(p) === "1");
        if (way === "limits") ok("limits link reaches signed-in limits", new URL(p.url()).pathname === "/profile/responsible-gambling");
        await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
        // Force is removed: an explicit test opt-in must not obscure the seen-key check.
        await p.evaluate(() => localStorage.removeItem("kp-primer-force"));
        await p.reload({ waitUntil: "domcontentloaded" });
        ok(`${way} reload does not reopen`, await staysShut(p));
      } catch (e) { block(`exit ${way}`, e); }
      finally { await ctx.close(); }
    }
    const ctx = await context({ force: true, signed: false });
    try { const p = await pageAt(ctx, "/"); await opens(p); await closeBy(p, "limits"); ok("guest limits link reaches public RG", new URL(p.url()).pathname === "/legal/responsible-gambling"); }
    catch (e) { block("guest limits", e); }
    finally { await ctx.close(); }
  }

  if (run("deep")) {
    console.log("\nD · deep link, query cleanup, and bet-link precedence");
    for (const [url, expected] of [["/?howto=1", "/"], ["/?howto=1&cat=sports", "/?cat=sports"]]) {
      const ctx = await context({ seen: true });
      try { const p = await pageAt(ctx, url); ok(`${url} opens despite seen key and automation`, await opens(p)); ok(`${url} cleans only howto`, path(p) === expected, path(p)); await closeBy(p, "x"); await p.reload({ waitUntil: "domcontentloaded" }); ok(`${url} stays shut after reload`, await staysShut(p)); }
      catch (e) { block(`deep ${url}`, e); }
      finally { await ctx.close(); }
    }
    const ctx = await context({ seen: true });
    try { const p = await pageAt(ctx, `/?howto=1&bet=${QUESTION}.YES`); ok("deep link plus bet intent declines How-to", await staysShut(p)); ok("the bet link opens its own sheet", await p.getByTestId("journey-bet-sheet").first().isVisible()); }
    catch (e) { block("deep bet", e); }
    finally { await ctx.close(); }
  }

  if (run("break")) {
    console.log("\nD′ · a real local cooling-off break refuses both auto-open and deep link");
    const ctx = await context({ locale: "en", signed: false, force: true });
    try {
      const phone = `+25571${String(parseInt(randomUUID().replaceAll("-", "").slice(0, 10), 16) % 10_000_000).padStart(7, "0")}`;
      const response = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { role: "PLAYER", phone, name: "Local How-to Break", balance: 100000 }, timeout: 180_000 });
      const seeded = await response.json();
      if (!response.ok() || seeded.note || !seeded.password) throw new Error(`fresh player seed failed: ${response.status()}`);
      const p = await pageAt(ctx, "/profile/responsible-gambling");
      await p.locator("#break").getByRole("button", { name: "Start a break", exact: true }).click();
      const confirm = p.getByRole("alertdialog");
      await confirm.waitFor({ state: "visible" });
      await p.waitForTimeout(450);
      await confirm.getByRole("button", { name: "Start a break", exact: true }).click();
      await p.waitForURL((url) => url.pathname === "/auth/login" && url.searchParams.has("cooled"), { timeout: 90_000 });
      await p.locator("#identifier").waitFor({ state: "visible" });
      await p.locator("#identifier").fill(phone.slice(4));
      await p.waitForFunction((raw) => document.querySelector('input[type="hidden"][name="identifier"]')?.value === raw, phone.slice(4));
      await p.locator('input[name="password"]').fill(seeded.password);
      await p.locator('form:has(input[name="password"]) button[type="submit"]').click();
      await p.waitForURL((url) => url.pathname === "/", { timeout: 90_000 });
      await p.getByTestId("journey-home-break").waitFor({ state: "visible" });
      ok("real cooling-off suppresses forced auto-open", await staysShut(p));
      await p.goto(`${BASE}/?howto=1`, { waitUntil: "domcontentloaded" });
      ok("real cooling-off suppresses the deep link", await staysShut(p));
    } catch (e) { block("real cooling-off", e); }
    finally { await ctx.close(); }
  }

  if (run("consent")) {
    console.log("\nE · consent invitation yields to the sheet then appears");
    const ctx = await context({ force: true, consent: true });
    try { const p = await pageAt(ctx, "/"); ok("How-to opens with consent forced", await opens(p)); await p.waitForTimeout(1400); ok("consent absent while How-to is open", !(await p.getByTestId("consent-prompt").isVisible().catch(() => false))); await closeBy(p, "x"); ok("consent appears after How-to closes", await p.getByTestId("consent-prompt").waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false)); }
    catch (e) { block("consent", e); }
    finally { await ctx.close(); }
  }

  if (run("card")) {
    console.log("\nF · the home card's own sheet uses the same seen key");
    const ctx = await context({ seen: true });
    try { const p = await pageAt(ctx, "/"); const card = p.getByTestId("journey-howto-card"); for (let i = 0; i < 10 && !(await opens(p, 700)); i++) { await card.click().catch(() => {}); await p.waitForTimeout(350); } ok("card opens the sheet", await opens(p)); await closeBy(p, "cta"); ok("card exit writes seen key", await seen(p) === "1"); }
    catch (e) { block("card", e); }
    finally { await ctx.close(); }
  }

  if (run("classic")) {
    console.log("\nG · classic shell still owns its primer");
    const ctx = await context({ pass: false, force: true, signed: false, primerSeen: false });
    try { const p = await pageAt(ctx, "/?primer=1"); ok("classic shell has no How-to sheet", await staysShut(p)); ok("classic primer opens on explicit ?primer=1", await p.locator('h2[data-stem]').first().waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false)); }
    catch (e) { block("classic", e); }
    finally { await ctx.close(); }
  }

  if (run("tiles")) {
    console.log("\nH · 72 player tiles: sheet 48, FAQ 12, chat 12");
    const widths = [[320, 640], [360, 640], [390, 844], [1280, 900]];
    let sheets = 0, faqs = 0, chats = 0;
    for (const locale of ["sw", "en", "zh"]) {
      for (const route of ["/", "/live", "/results", "/watchlist"]) for (const [w, h] of widths) {
        const ctx = await context({ locale, w, h, force: true });
        try { const p = await pageAt(ctx, route); if (await opens(p)) { await shot(p, `sheet ${locale} ${route} ${w}x${h}`); sheets++; const exits = await p.locator(SHEET).evaluate((root) => { const h = innerHeight; const yes = (e) => { const b = e?.getBoundingClientRect(); return !!b && b.top >= 0 && b.bottom <= h && b.height > 0; }; const dialog = root.closest('[role="dialog"]'); return [yes(dialog?.querySelector('button[aria-label]:not(.m-scrim)')), yes(root.querySelector('button.kp-wsheet__act')), yes(root.querySelector('a.kp-wsheet__link'))]; }); ok(`tile ${locale} ${route} ${w} exits fit`, exits.every(Boolean), JSON.stringify(exits)); } else ok(`tile ${locale} ${route} ${w} sheet opens`, false); }
        catch (e) { block(`sheet tile ${locale} ${route} ${w}`, e); }
        finally { await ctx.close(); }
      }
      for (const [w, h] of widths) {
        const ctx = await context({ locale, w, h });
        try { const p = await pageAt(ctx, "/help"); await p.locator("details").nth(1).locator("summary").click(); ok(`FAQ ${locale} ${w} opens`, await p.locator("details").nth(1).evaluate((e) => e.open)); await shot(p, `faq ${locale} ${w}x${h}`); faqs++; }
        catch (e) { block(`FAQ tile ${locale} ${w}`, e); }
        finally { await ctx.close(); }
      }
      for (const [w, h] of [[360, 640], [1280, 900]]) for (const state of ["empty", "reply"]) {
        const ctx = await context({ locale, w, h, signed: false });
        try {
          const p = await pageAt(ctx, "/");
          await p.locator("button.cm-bubble").filter({ visible: true }).first().click();
          await p.locator(".cm-empty").first().waitFor({ state: "visible", timeout: 15_000 });
          if (state === "reply") {
            const chip = p.locator(".cm-empty-starter").nth(1);
            await chip.click();
            await p.locator('.cm-row-ai:not([aria-live="polite"])').first().waitFor({ state: "visible", timeout: 20_000 });
          }
          await shot(p, `chat ${state} ${locale} ${w}x${h}`); chats++;
        } catch (e) { block(`chat tile ${state} ${locale} ${w}`, e); }
        finally { await ctx.close(); }
      }
    }
    ok("48 sheet tiles written", sheets === 48, String(sheets));
    ok("12 FAQ tiles written", faqs === 12, String(faqs));
    ok("12 chat tiles written", chats === 12, String(chats));
  }
} finally {
  for (const b of Object.values(browsers)) await b.close().catch(() => {});
}
console.log(`\nqa:howto — ${passed} passed, ${failed} failed, ${blocked} blocked; ${tileNo} tile(s) in ${OUT}`);
process.exitCode = failed ? 1 : blocked ? 3 : 0;
