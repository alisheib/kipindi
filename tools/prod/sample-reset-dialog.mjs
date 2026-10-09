// PRODUCTION, READ-ONLY: does anything keep moving under the admin "Reset password" dialog? Opens QA Mobile 01's dialog,
// samples the confirm button's box every animation frame for 3 s, lists the running animations, then cancels.
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
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Reset password" }).click();
  const dlg = page.getByRole("alertdialog", { name: /Reset password/ });
  await dlg.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => new Promise((done) => {
    const btn = [...document.querySelectorAll("button")].find((x) => /Generate temporary password/.test(x.textContent || ""));
    const boxes = []; const t0 = performance.now();
    const tick = () => {
      const q = btn.getBoundingClientRect();
      boxes.push(`${q.left.toFixed(2)},${q.top.toFixed(2)},${q.width.toFixed(2)},${q.height.toFixed(2)}`);
      if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
      else {
        const anims = document.getAnimations().map((a) => {
          const el = a.effect && a.effect.target;
          const tag = el ? `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}` : "?";
          return `${a.animationName || a.transitionProperty || a.constructor.name} on ${tag} (${a.playState}, iterations ${a.effect?.getTiming?.().iterations})`;
        });
        done({ frames: boxes.length, distinct: [...new Set(boxes)].length, first: boxes[0], last: boxes[boxes.length - 1], anims: anims.slice(0, 12) });
      }
    };
    requestAnimationFrame(tick);
  }));
  console.log(JSON.stringify(r, null, 1));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  if (await dlg.isVisible().catch(() => false)) await dlg.getByRole("button", { name: /Cancel/ }).first().click().catch(() => {});
  console.log(`dialog closed without confirming: ${!(await dlg.isVisible().catch(() => false))}`);
} catch (e) { console.log(`STOPPED: ${String(e.message).slice(0, 300)}`); }
finally { await b.close(); }
