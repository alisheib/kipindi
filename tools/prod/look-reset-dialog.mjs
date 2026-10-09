// PRODUCTION, READ-ONLY: open QA Mobile 01's "Reset password" dialog, describe its confirm button and whatever sits on
// top of it, then press Escape (and click Cancel if still open). Nothing is confirmed.
process.env.LIVE_BASE = "https://www.50pick.tz";
import { createRequire } from "node:module";
const ROOT = "F:/kipindi-c5docs";
const req = createRequire(ROOT + "/package.json");
const { chromium } = req("playwright");
const H = await import("file:///F:/kipindi-c5docs/scripts/live/harness.mjs");
const b = await chromium.launch({ headless: true });
try {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await H.login(page, "admin");
  await page.goto(`${H.BASE}/admin/players/usr_ffb3c5cdd44a35cfca12125a`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Reset password" }).click();
  const dlg = page.getByRole("alertdialog", { name: /Reset password/ });
  await dlg.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((x) => /Generate temporary password/.test(x.textContent || ""));
    if (!btn) return { found: false };
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    const desc = (el) => el ? `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).slice(0, 80)}` : null;
    return { found: true, disabled: btn.disabled, inForm: !!btn.form, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      viewport: [innerWidth, innerHeight], topAtCentre: desc(top), topIsButton: top === btn || btn.contains(top),
      pointerEvents: getComputedStyle(btn).pointerEvents, inert: !!btn.closest("[inert]"), opacity: getComputedStyle(btn).opacity };
  });
  console.log(JSON.stringify(info));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  if (await dlg.isVisible().catch(() => false)) {
    await dlg.getByRole("button", { name: /Cancel|Ghairi/ }).first().click().catch(() => {});
  }
  console.log(`dialog closed without confirming: ${!(await dlg.isVisible().catch(() => false))}`);
} catch (e) { console.log(`STOPPED: ${String(e.message).slice(0, 300)}`); }
finally { await b.close(); }
