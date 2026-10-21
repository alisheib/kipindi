/**
 * qa:millionea-break-nav — ON A BREAK, A MILLIONEA PAGE LIGHTS ONE CLASSIC DESTINATION, NEVER NONE (MASWALI-BUILD
 * S5-FIX-PLATFORM D13, 2026-10-21; `test:millionea-shell` §2 holds the source and renders the two navs).
 *
 *   FEATURE_MILLIONEA=ACTIVE on a running DEV server (in-memory store; the journey at its shipped STAFF_PREVIEW, so a
 *   player is served the classic shell), then:
 *   BASE=http://localhost:3501 node scripts/qa-millionea-break-nav.mjs [outDir]
 *
 * The demo player (`/auth/demo`, dev only) is CONTROL first: /millionea lights Millionea's own link. Then the player takes a
 * one-hour break through the real form (/profile/responsible-gambling → Start a break → confirm; the session ends and the
 * login page says so) and signs in again (a break stops betting, not access). On a break the classic bar draws no
 * Millionea link (no offer) and lights exactly the destination the journey's table names — Markets on /millionea and its
 * how-to page, Positions on its tickets — at 1280; at 360 the classic rail lights exactly its Markets slot, and exactly
 * More (whose Positions row it is) on the tickets page. Shots go to outDir (default .qa-artifacts/millionea-break-nav/).
 * ⚠️ It starts a real break on the dev store's demo account (one hour): run it on a fresh in-memory server.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.argv[2] ?? join(process.cwd(), ".qa-artifacts", "millionea-break-nav"));
mkdirSync(OUT, { recursive: true });
let pass = 0;
const fails = [];
const rows = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label} ${extra}`); }
  else { fails.push(`${label} ${extra}`); console.log(`  ✗ ${label} ${extra}`); }
};
// A signed-in page holds its event stream open, so it never goes network-idle: settle on load, the fonts and a beat.
const settle = async (page) => {
  await page.waitForLoadState("load", { timeout: 60_000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(400);
};
/** What the classic chrome lights: the bar's current links (`aria-current` in the header's nav), the rail's lit slots. */
const litNow = (page) => page.evaluate(() => {
  const barNav = document.querySelector("header.app-topbar nav");
  const bar = barNav ? [...barNav.querySelectorAll("a[aria-current]")].map((a) => a.getAttribute("href")) : null;
  const rail = document.querySelector("nav.kp-rail:not(.kp-rail--journey)");
  const railLit = rail ? [...rail.querySelectorAll('[data-on="1"]')].map((e) => e.getAttribute("href") ?? "More") : null;
  const milLink = barNav ? !!barNav.querySelector('a[href="/millionea"]') : null;
  return { bar, railLit, milLink, journey: !!document.querySelector("[data-testid='journey-top-bar']") };
});

const browser = await chromium.launch();
try {
  const desk = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await desk.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
  const page = await desk.newPage();
  await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(page);
  await page.goto(`${BASE}/millionea`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(page);
  const before = await litNow(page);
  ok("CONTROL · before the break, the classic bar draws Millionea's link and lights it on /millionea",
    before.journey === false && before.milLink === true && JSON.stringify(before.bar) === JSON.stringify(["/millionea"]), JSON.stringify(before));
  // The break, through the real form.
  await page.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(page);
  const form = page.locator("form").filter({ has: page.locator('[name="period"]') }).first();
  const trigger = form.locator("button[type=button]").last();
  const label = ((await trigger.textContent()) ?? "").trim();
  await trigger.click();
  const dialog = page.locator('[role="alertdialog"], [role="dialog"]').last();
  await dialog.waitFor({ timeout: 15_000 });
  await dialog.locator("button", { hasText: label }).last().click();
  await page.waitForURL(/\/auth\/login/, { timeout: 60_000 });
  ok("PREMISE · the break was taken through the form (the session ends, the login page says so)", /cooled=1/.test(page.url()), page.url());
  await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(page);
  for (const [path, want] of [["/millionea", "/markets"], ["/millionea/how", "/markets"], ["/millionea/tickets", "/positions"]]) {
    const r = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await settle(page);
    const now = await litNow(page);
    rows.push({ w: 1280, path, status: r?.status(), ...now });
    ok(`1280 ${path} · on a break the classic bar lights exactly ${want}, and draws no Millionea link`,
      r?.status() === 200 && now.journey === false && now.milLink === false && JSON.stringify(now.bar) === JSON.stringify([want]), JSON.stringify(now));
    await page.screenshot({ path: join(OUT, `bar${path.replace(/\//g, "_")}-1280.png`), clip: { x: 0, y: 0, width: 1280, height: 120 } });
  }
  const state = await desk.storageState();
  await desk.close();
  const phone = await browser.newContext({ viewport: { width: 360, height: 780 }, storageState: state });
  const p2 = await phone.newPage();
  for (const [path, want] of [["/millionea", "/markets"], ["/millionea/tickets", "More"]]) {
    const r = await p2.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await settle(p2);
    const now = await litNow(p2);
    rows.push({ w: 360, path, status: r?.status(), ...now });
    ok(`360 ${path} · on a break the classic rail lights exactly ${want}`, r?.status() === 200 && JSON.stringify(now.railLit) === JSON.stringify([want]), JSON.stringify(now));
    const box = await p2.locator("nav.kp-rail").first().boundingBox().catch(() => null);
    if (box) await p2.screenshot({ path: join(OUT, `rail${path.replace(/\//g, "_")}-360.png`), clip: { x: 0, y: Math.max(0, box.y - 4), width: 360, height: box.height + 8 } });
  }
  await phone.close();
} finally {
  await browser.close();
}
writeFileSync(join(OUT, "results.json"), JSON.stringify(rows, null, 1));
console.log(`\nqa:millionea-break-nav: ${pass} passed, ${fails.length} failed (shots in ${OUT})`);
process.exitCode = fails.length ? 1 : 0;
