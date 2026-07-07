/**
 * Live test — admin↔player switcher.
 * 1. Admin session sees "Staff console" in the player avatar menu → /admin.
 * 2. Admin console shows "Back to app" → /markets.
 * 3. A plain player session NEVER sees "Staff console".
 *
 * NOTE: run against a FRESH store. /auth/demo reuses phone +255700000000, which
 * is also the phone admin-grids-smoke seeds as ADMIN — so running that smoke
 * first in the same in-memory store promotes the demo user to admin and the
 * player-visibility assertion (correctly) fails. Restart the dev server first.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const SHOTS = ".50pick-shots";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();

// ---- Admin context ----
// Warm the routes first so a cold Next dev compile can't race hydration
// (the account-menu onClick isn't wired until the page hydrates).
await browser.newContext().then(async (c) => {
  await c.request.get(`${BASE}/markets`);
  await c.request.get(`${BASE}/admin`).catch(() => {});
  await c.close();
});

// Open the avatar menu and wait until it's actually hydrated + open (the menu
// dialog appears). Retries so a slow first paint doesn't produce a false fail.
async function openAvatarMenu(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole("button", { name: "Account menu" }).click().catch(() => {});
    try {
      await page.getByRole("menu").waitFor({ state: "visible", timeout: 3000 });
      return;
    } catch { await page.waitForTimeout(600); }
  }
}

const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await admin.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000042" } });
const ap = await admin.newPage();

await ap.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
await openAvatarMenu(ap);
const staffLink = ap.getByRole("menuitem", { name: /Staff console/i });
ok("admin: Staff console visible in avatar menu", (await staffLink.count()) >= 1, `count=${await staffLink.count()}`);
await ap.screenshot({ path: `${SHOTS}/switcher-1-admin-menu.png` });

await staffLink.first().click();
await ap.waitForURL(/\/admin/, { timeout: 8000 }).catch(() => {});
ok("admin: Staff console navigates to /admin", ap.url().includes("/admin"), ap.url());
await ap.waitForTimeout(500);
const backLink = ap.getByRole("link", { name: "Back to app" });
ok("admin: Back to app visible in admin top bar", (await backLink.count()) >= 1, `count=${await backLink.count()}`);
await ap.screenshot({ path: `${SHOTS}/switcher-2-admin-console.png` });

await backLink.first().click();
await ap.waitForURL(/\/markets/, { timeout: 8000 }).catch(() => {});
ok("admin: Back to app navigates to /markets", ap.url().includes("/markets"), ap.url());

// ---- Player context (no admin role) ----
const player = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await player.request.get(`${BASE}/auth/demo`);
const pp = await player.newPage();
await pp.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
await openAvatarMenu(pp);
const playerStaff = pp.getByRole("menuitem", { name: /Staff console/i });
ok("player: Staff console NOT visible", (await playerStaff.count()) === 0, `count=${await playerStaff.count()}`);
await pp.screenshot({ path: `${SHOTS}/switcher-3-player-menu.png` });

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
