/**
 * qa:card-spacing — U2's drive: the "Card spacing" switch, used the way a player uses it (docs/MOBILE-VISUAL-PLAN.md §9 U2).
 *
 *   LIVE_BASE=http://localhost:3041 npm run qa:card-spacing                 # local next dev (guest + /auth/demo player)
 *   LIVE_BASE=https://www.50pick.tz npm run qa:card-spacing                 # production, signed out
 *   LIVE_BASE=https://www.50pick.tz WHO=mobile01 npm run qa:card-spacing    # production, the QA player
 *
 * Per language (SW first — the default, plan §5), on a 360×780 touch phone:
 *   A  no cookie → the SERVED <html> carries no data-density (Compact is the absence), the rail's More menu opens with the
 *      row FIRST, a 44px role="menuitemcheckbox", aria-checked="true", the value word in that language, the hint linked by
 *      aria-describedby, the toggle picture aria-hidden and unfocusable;
 *   B  a TAP flips it: aria-checked="false", the Comfortable word, <html data-density="comfortable">, cookie kp-density=comfortable
 *      (one year, path /), and the menu stays open;
 *   C  a reload SERVES the attribute in the markup (no flash: it is there before any script) and the menu still reads Comfortable;
 *   D  the keyboard: focus the row, Space flips it back to Compact — attribute removed, cookie compact;
 *   E  the served markup after that reload carries no attribute again.
 *   F  the refresh race: a board refresh held in flight while the player switches back cannot restore the old choice;
 *   G  a 360×400 screen: the menu scrolls inside itself and the switch is fully reachable.
 * Then the fences: at 768 the rail menu has no row (phones only), and the ≥ 1024 top-bar menu never has one.
 * Screens of the open menu (both states) go to .qa-shots/mobile-visual/U2/<phase>/ for a human to read.
 *
 * ⛔ The user agent carries "HeadlessChrome" (plan §0: QA is never traffic). It writes ONE cookie per context, in its own
 * browser — never a server setting — and leaves every context it made at the default it found.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, recorder, loginOnce } from "./harness.mjs";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const WHO = (process.env.WHO ?? "guest").trim() || "guest";
const PHASE = process.env.PHASE || "after";
const OUT = join(REPO, ".qa-shots", "mobile-visual", "U2", PHASE, WHO);
mkdirSync(OUT, { recursive: true });
const UA = "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Mobile Safari/537.36";
const WORDS = {
  sw: { label: "Nafasi ya kadi", compact: "Ndogo", comfortable: "Kubwa" },
  en: { label: "Card spacing", compact: "Compact", comfortable: "Comfortable" },
  zh: { label: "卡片间距", compact: "紧凑", comfortable: "宽松" },
};
const host = new URL(BASE).hostname;
const R = recorder(`qa:card-spacing — ${BASE} · who=${WHO}`);
const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

let state = null;
if (WHO === "demo") {
  const c = await b.newContext();
  await c.request.get(`${BASE}/auth/demo`);
  state = await c.storageState();
  state.cookies = state.cookies.filter((k) => k.name !== "kp-locale");
  await c.close();
} else if (WHO !== "guest") {
  state = await loginOnce(b, WHO);
}
R.check(`session: ${WHO}`, WHO === "guest" || !!state?.cookies.some((c) => c.name === "kp_session"));

async function phone(locale, width = 360, height = 780) {
  const ctx = await b.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, isMobile: width < 1024, hasTouch: width < 1024, userAgent: UA,
    ...(state ? { storageState: state } : {}),
  });
  await ctx.addCookies([{ name: "kp-locale", value: locale, domain: host, path: "/" }]);
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("50pick-primer-seen", "1");
      localStorage.setItem("50pick-analytics-consent", JSON.stringify({ v: 1, choice: "denied", at: Date.now() }));
    } catch {}
  });
  return ctx;
}
const served = async (resp) => (await resp.text().catch(() => "")).match(/<html[^>]*>/)?.[0] ?? "";
const railMore = (page) => page.locator("nav.kp-rail button[aria-haspopup='menu']");
const row = (page) => page.locator("nav.kp-rail [role='menu'] [role='menuitemcheckbox']");
const densityCookie = async (ctx) => (await ctx.cookies()).find((c) => c.name === "kp-density");
async function openMenu(page) {
  await railMore(page).tap();
  await row(page).waitFor({ state: "visible", timeout: 10000 });
}
async function settle(page) {
  await page.waitForSelector("nav.kp-rail", { timeout: 20000 });
  await page.waitForTimeout(1500);
}

for (const locale of ["sw", "en", "zh"]) {
  const W = WORDS[locale];
  const ctx = await phone(locale);
  const page = await ctx.newPage();
  const tag = `${locale}`;

  // A · the default
  let resp = await page.goto(`${BASE}/markets`, { waitUntil: "load", timeout: 60000 });
  await settle(page);
  R.check(`A.${tag} premises: <html lang=${locale}> and HeadlessChrome in the page`,
    (await page.evaluate(() => document.documentElement.lang)) === locale && /HeadlessChrome/.test(await page.evaluate(() => navigator.userAgent)));
  R.check(`A.${tag} no cookie → the served <html> carries no data-density`, !/data-density=/.test(await served(resp)), await served(resp));
  await openMenu(page);
  const first = await page.evaluate(() => {
    const m = document.querySelector("nav.kp-rail [role='menu']");
    const firstItem = m?.querySelector("[role^='menuitem']");
    return firstItem?.getAttribute("role");
  });
  R.check(`A.${tag} the switch is the menu's FIRST item`, first === "menuitemcheckbox", String(first));
  const a = await row(page).evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hint = document.getElementById(el.getAttribute("aria-describedby") || "");
    const pic = el.querySelector("[aria-hidden]");
    return {
      h: Math.round(r.height), w: Math.round(r.width), checked: el.getAttribute("aria-checked"), name: el.getAttribute("aria-label"),
      text: el.innerText.replace(/\s+/g, " "), hint: hint?.innerText ?? null, inView: r.top >= 0 && r.bottom <= innerHeight,
      picFocusable: !!pic?.matches("button, [tabindex]") || !!pic?.querySelector("button, [tabindex], input"), picRole: pic?.getAttribute("role") ?? null,
    };
  });
  R.check(`A.${tag} the row is ≥ 44px tall and on screen (${a.w}×${a.h})`, a.h >= 44 && a.inView);
  R.check(`A.${tag} aria-checked="true" and the value reads "${W.compact}"`, a.checked === "true" && a.text.includes(W.compact), `${a.checked} · ${a.text}`);
  R.check(`A.${tag} the accessible name carries the visible label "${W.label}"`, !!a.name?.includes(W.label), String(a.name));
  R.check(`A.${tag} the hint is linked by aria-describedby`, !!a.hint && a.hint.length > 10, String(a.hint));
  R.check(`A.${tag} the toggle is a picture only (aria-hidden, no role, nothing focusable)`, !a.picFocusable && !a.picRole);
  await page.screenshot({ path: join(OUT, `menu-${tag}-compact.png`) });

  // B · a tap flips it
  await row(page).tap();
  await page.waitForTimeout(300);
  const b1 = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute("data-density"),
    checked: document.querySelector("nav.kp-rail [role='menuitemcheckbox']")?.getAttribute("aria-checked"),
    text: document.querySelector("nav.kp-rail [role='menuitemcheckbox']")?.innerText.replace(/\s+/g, " "),
  }));
  const c1 = await densityCookie(ctx);
  R.check(`B.${tag} a tap → aria-checked="false", "${W.comfortable}", <html data-density="comfortable">`,
    b1.checked === "false" && !!b1.text?.includes(W.comfortable) && b1.attr === "comfortable", JSON.stringify(b1));
  R.check(`B.${tag} …and cookie kp-density=comfortable, path /, about a year`,
    c1?.value === "comfortable" && c1.path === "/" && c1.expires - Date.now() / 1000 > 360 * 86400, JSON.stringify(c1 ?? null));
  R.check(`B.${tag} the menu stays open after the tap`, await row(page).isVisible());
  await page.screenshot({ path: join(OUT, `menu-${tag}-comfortable.png`) });

  // C · a reload serves it — no flash
  resp = await page.reload({ waitUntil: "load" });
  const html = await served(resp);
  R.check(`C.${tag} after a reload the SERVED <html> already says data-density="comfortable" (no flash, no script)`,
    /data-density="comfortable"/.test(html), html.slice(0, 160));
  await settle(page);
  await openMenu(page);
  R.check(`C.${tag} …and the menu still reads Comfortable`, (await row(page).getAttribute("aria-checked")) === "false");

  // D · the keyboard flips it back
  await row(page).focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  const d1 = await page.evaluate(() => document.documentElement.getAttribute("data-density"));
  const c2 = await densityCookie(ctx);
  R.check(`D.${tag} Space on the focused row → Compact: attribute removed, cookie DELETED (no cookie is Compact)`,
    d1 === null && !c2 && (await row(page).getAttribute("aria-checked")) === "true", `${d1} · ${JSON.stringify(c2 ?? null)}`);

  // E · and the server agrees again
  resp = await page.reload({ waitUntil: "load" });
  R.check(`E.${tag} the served <html> carries no data-density again`, !/data-density=/.test(await served(resp)));
  await ctx.close();
}

// F · THE REFRESH RACE (review of U2, 2026-09-22). A board refresh that LEAVES while the choice is Comfortable and
// LANDS after the player switched back to Compact used to write the old choice onto <html>. Reproduced exactly: the
// page's own refresh (RefreshPoller on "50pick:refresh") is held for 3s at the network, the player taps during the
// hold, then it lands. The count of held requests is asserted too — without one, this check would prove nothing.
{
  const ctx = await phone("sw");
  const page = await ctx.newPage();
  await page.goto(`${BASE}/markets`, { waitUntil: "load", timeout: 60000 });
  await settle(page);
  await openMenu(page);
  await row(page).tap();                                            // → Comfortable (cookie + attribute)
  await page.waitForTimeout(300);
  let held = 0;
  await page.route("**/*", async (route) => {
    const h = route.request().headers();
    if (h["rsc"] === "1" || /[?&]_rsc=/.test(route.request().url())) { held++; await new Promise((r) => setTimeout(r, 3000)); }
    await route.continue();
  });
  await page.evaluate(() => window.dispatchEvent(new Event("50pick:refresh")));
  await page.waitForTimeout(500);                                   // the refresh is in flight, carrying "comfortable"
  await row(page).tap();                                            // → Compact while it is held
  await page.waitForTimeout(5000);                                  // it lands
  const f = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute("data-density"),
    checked: document.querySelector("nav.kp-rail [role='menuitemcheckbox']")?.getAttribute("aria-checked") ?? null,
  }));
  const fc = await densityCookie(ctx);
  R.check(`F · a refresh held in flight actually happened (${held} held)`, held > 0);
  R.check("F · …and when it lands after the switch back, the page stays Compact: no attribute, no cookie, row checked",
    held > 0 && f.attr === null && !fc && (f.checked === null || f.checked === "true"), `${JSON.stringify(f)} · cookie ${JSON.stringify(fc ?? null)}`);
  await page.unroute("**/*");
  await ctx.close();
}

// G · A SHORT SCREEN (review of U2): the taller menu scrolls inside itself, so the switch is still fully reachable.
{
  const ctx = await phone("sw", 360, 400);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/markets`, { waitUntil: "load", timeout: 60000 });
  await settle(page);
  await openMenu(page);
  await row(page).scrollIntoViewIfNeeded();
  const g = await row(page).evaluate((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight }; });
  R.check(`G · 360×400: the switch is fully on screen (${g.top}–${g.bottom} of ${g.vh})`, g.top >= 0 && g.bottom <= g.vh);
  await page.screenshot({ path: join(OUT, "menu-sw-360x400.png") });
  await ctx.close();
}

// The fences: phones only, rail only.
{
  const ctx = await phone("sw", 768, 1024);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/markets`, { waitUntil: "load", timeout: 60000 });
  await settle(page);
  await railMore(page).tap();
  await page.waitForSelector("nav.kp-rail [role='menu']", { timeout: 10000 });
  const shown = await page.evaluate(() => {
    const r = document.querySelector("nav.kp-rail [role='menuitemcheckbox']");
    return r ? getComputedStyle(r).display !== "none" : false;
  });
  R.check("768 · the rail's More menu shows NO card-spacing row (phones only, sm:hidden)", !shown);
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1100, height: 800 }, userAgent: UA.replace("Mobile ", ""), ...(state ? { storageState: state } : {}) });
  await ctx.addCookies([{ name: "kp-locale", value: "sw", domain: host, path: "/" }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/markets`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1500);
  const trig = page.locator("header button.kp-navlink[aria-haspopup='menu']").first();
  if (await trig.count()) {
    await trig.click();
    await page.waitForTimeout(300);
    R.check("1100 · the top-bar More menu never carries the row", (await page.locator("header [role='menuitemcheckbox']").count()) === 0);
  } else R.note("1100 · no top-bar More menu at this width — nothing to check");
  await ctx.close();
}

await b.close();
R.note(`screens: ${OUT}`);
process.exit(R.done() === 0 ? 0 : 1);
