/**
 * Resolver-queue visual verification — the per-market scheduled-resolution UI.
 *
 * Captures the resolver queue at the full responsiveness matrix (360 / 768 / 1280 /
 * 1920) plus the auto-resolve ConfirmModal, and FAILS on horizontal overflow or a
 * console error. A green run is not the point — READ the PNGs.
 *
 *   BASE=http://localhost:3000 node scripts/resolver-queue-shots.mjs
 *
 * Requires a running server started with DISABLE_ADMIN_TOTP=true (the admin actions
 * are 2FA-gated) — see the kipindi-admin-testing notes.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "shots-resolver");
const WIDTHS = [360, 768, 1280, 1920];

mkdirSync(OUT, { recursive: true });

let failures = 0;
const fail = (m) => { failures++; console.log(`  ✗ ${m}`); };
const pass = (m) => console.log(`  ✓ ${m}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// ── Boot an ADMIN session ────────────────────────────────────────────────────
// The real admin sign-in is phone-OTP + TOTP, which a headless shot run cannot
// complete. Use the dev-only bootstrap (a demo session, promoted to ADMIN) — this
// is why the run needs a DEV server; the /api/dev-test/* routes 404 in production.
{
  const boot = await ctx.newPage();
  // seed-admin both provisions an ADMIN user AND mints the session cookie with
  // role: ADMIN. /auth/demo cannot be used here — it hardcodes role: "PLAYER" on the
  // session, so the money surfaces (settlement) render their "Restricted" card even
  // after the DB row is promoted.
  const r = await boot.request.post(`${BASE}/api/dev-test/seed-admin`, {
    data: { phone: "+255700000001", name: "Ali Admin" },
  });
  if (r.status() === 404) {
    console.log("!! dev-test routes are 404 — start the server with `next dev` (NODE_ENV=development).");
  }
  console.log(`seed-admin → ${r.status()}`);
  const who = await (await boot.request.get(`${BASE}/api/dev-test/whoami`)).json().catch(() => null);
  console.log(`session role → ${who?.session?.role ?? "unknown"}`);
  await boot.close();
}

async function shoot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  console.log(`  → ${name}.png`);
}

for (const width of WIDTHS) {
  console.log(`\n=== ${width}px ===`);
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height: width < 768 ? 780 : 900 });

  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.goto(`${BASE}/admin/resolver-queue`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(600);

  // Landed on the right page (an admin redirect would silently capture the homepage).
  // Match the VISIBLE heading: a bare text= match also hits the breadcrumb, which is
  // hidden at mobile widths and made this report a false negative at 360/768.
  const onPage = await page.locator('h1:has-text("Resolver queue")').first().isVisible().catch(() => false);
  onPage ? pass("resolver queue rendered") : fail("did NOT render the resolver queue (auth redirect?)");

  // The new mode toggle must be present and operable.
  const toggle = page.locator('[role="switch"][aria-label^="Auto-resolve at resolve date"]');
  (await toggle.count()) > 0 ? pass("auto-resolve toggle present") : fail("auto-resolve toggle MISSING");

  // The AI pause/resume switch (or its "no key" disabled state) must be present.
  const aiToggle = page.locator('[role="switch"][aria-label^="AI resolution check"]');
  const aiNoKey = page.locator('text=AI checks · no key');
  ((await aiToggle.count()) > 0 || (await aiNoKey.count()) > 0)
    ? pass("AI pause switch present")
    : fail("AI pause switch MISSING");

  // Tap-target floor (kit rule: >= 40px on interactive controls) — check the
  // per-market re-check button where it exists.
  const recheck = page.locator('button:has-text("Re-check this market now")').first();
  if (await recheck.count()) {
    const box = await recheck.boundingBox();
    box && box.height >= 40 ? pass(`re-check tap target ${Math.round(box.height)}px`) : fail(`re-check tap target too small (${box ? Math.round(box.height) : "?"}px)`);
  }

  // Horizontal overflow — 0 tolerance.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  overflow <= 1 ? pass("no horizontal overflow") : fail(`HORIZONTAL OVERFLOW ${overflow}px`);

  await shoot(page, `resolver-queue-${width}`);

  // The compliance ConfirmModal (the popup sweep the standards require at 360 + 1280).
  if (width === 360 || width === 1280) {
    if (await toggle.count()) {
      await toggle.first().click();
      await page.waitForTimeout(500);
      const dlg = page.locator('[role="alertdialog"]');
      (await dlg.count()) > 0 ? pass("confirm modal opened") : fail("confirm modal did NOT open");
      const mOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      mOverflow <= 1 ? pass("modal: no horizontal overflow") : fail(`modal HORIZONTAL OVERFLOW ${mOverflow}px`);
      await shoot(page, `resolver-confirm-${width}`);
      await page.keyboard.press("Escape"); // must NOT leave auto enabled
      await page.waitForTimeout(300);
    }
  }

  if (consoleErrors.length) fail(`console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
  else pass("no console errors");

  await page.close();
}

// The settlement + system readouts changed shape too — capture them at 1280.
// NOTE the landmark assertion: without it an auth redirect silently measures the
// LOGIN page and reports a cheerful "no overflow" for a screen we never saw.
for (const [name, url, landmark] of [
  ["settlement", "/admin/settlement", "Payout queue"],
  ["system", "/admin/system", "Settlement"],
]) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(500);
  console.log(`\n=== ${url} ===`);
  const onPage = await page.locator(`text=${landmark}`).first().isVisible().catch(() => false);
  onPage ? pass(`rendered (found "${landmark}")`) : fail(`NOT the ${url} page (redirected to ${page.url()})`);
  // "Timers armed" is the new scheduler-health tile that replaced the auto-settle dial.
  const timers = await page.locator("text=Timers armed").first().isVisible().catch(() => false);
  timers ? pass("scheduler health tile present") : fail("scheduler 'Timers armed' tile MISSING");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  overflow <= 1 ? pass("no horizontal overflow") : fail(`HORIZONTAL OVERFLOW ${overflow}px`);
  errs.length ? fail(`page errors: ${errs[0]}`) : pass("no page errors");
  await shoot(page, `${name}-1280`);
  await page.close();
}

await ctx.close();
await browser.close();

console.log(`\n${failures === 0 ? "VISUAL CHECKS PASS" : `${failures} VISUAL CHECK(S) FAILED`} — shots in ${OUT}`);
process.exit(failures ? 1 : 0);
