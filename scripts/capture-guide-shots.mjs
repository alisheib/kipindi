/**
 * Capture the screenshots used by docs/updown-operator-guide.html.
 *
 * These are REAL pictures of the running console, not mock-ups — an operator manual whose
 * pictures do not match the screen is worse than one with no pictures, because staff stop
 * trusting it the first time a button is not where it was drawn.
 *
 * Needs a dev server (NOT `next start` — the admin seed route 404s outside development,
 * because NODE_ENV is inlined at build time):
 *
 *   DATABASE_URL=… USE_PRISMA_DAL=true NODE_ENV=development DISABLE_ADMIN_TOTP=true \
 *     npx next dev -p 3100
 *   BASE=http://localhost:3100 node scripts/capture-guide-shots.mjs
 *
 * Then re-render the PDF:  node scripts/generate-pdfs.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const OUT = resolve(root, "docs/guide-img");
const BASE = process.env.BASE || "http://localhost:3100";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2, // retina, so the PDF stays crisp when scaled down
});
await ctx.request.post(`${BASE}/api/dev-test/seed-admin`);

const page = await ctx.newPage();

/** Shoot one element by selector; falls back to a viewport crop if it is not found. */
async function shot(name, url, selector, { fullPage = false, clip } = {}) {
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  // A new admin page cold-compiles in dev; give Turbopack room before the first paint.
  await page.waitForTimeout(2500);
  const path = resolve(OUT, `${name}.png`);
  if (selector) {
    const el = page.locator(selector).first();
    if (await el.isVisible().catch(() => false)) {
      await el.screenshot({ path });
      console.log(`  ✓ ${name}.png  (element ${selector})`);
      return;
    }
    console.warn(`  ! ${name}: selector ${selector} not visible — falling back`);
  }
  await page.screenshot({ path, fullPage, ...(clip ? { clip } : {}) });
  console.log(`  ✓ ${name}.png  ${clip ? "(clip)" : fullPage ? "(full page)" : "(viewport)"}`);
}

console.log("Capturing operator-guide screenshots…");

// The nav, so staff can find the section at all.
//
// ⚠️ TWO THINGS WENT WRONG HERE, both found by LOOKING at the rendered guide rather than by the
// capture failing. (1) A 1000px viewport cut the sidebar just above "UP & DOWN" — so the one
// picture whose entire job is to show where Up & Down lives did not contain it. (2) Capturing
// the WHOLE menu then gave a 432×3400 image that rendered 89% of a page tall next to a short
// paragraph, which is unreadable and wastes a page.
//
// What staff actually need is "polls are here, Up & Down is there" — so crop from the MARKETS
// heading to the end of the Up & Down group. Anchored on the real elements, not fixed pixels,
// so it survives a nav change.
await page.setViewportSize({ width: 1440, height: 1700 });
await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
{
  const box = await page.evaluate(() => {
    const all = [...document.querySelectorAll("aside *, nav *")];
    const from = all.find((e) => /^MARKETS/i.test((e.textContent ?? "").trim()) && e.children.length === 0);
    const to = all.find((e) => (e.textContent ?? "").trim() === "Rounds");
    if (!from || !to) return null;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    return { x: 0, y: Math.max(0, a.top - 14), width: 216, height: b.bottom - a.top + 28 };
  });
  const path = resolve(OUT, "nav.png");
  if (box) {
    await page.screenshot({ path, clip: box });
    console.log(`  ✓ nav.png  (cropped MARKETS → Rounds, ${Math.round(box.height)}px)`);
  } else {
    await page.screenshot({ path, clip: { x: 0, y: 0, width: 216, height: 1000 } });
    console.warn("  ! nav.png: anchors not found — fell back to a fixed crop, CHECK IT");
  }
}
await page.setViewportSize({ width: 1440, height: 1000 });

// The three screens.
await shot("proposals", "/admin/updown/proposals", null, { clip: { x: 216, y: 0, width: 1224, height: 900 } });
await shot("rounds", "/admin/updown/rounds", null, { clip: { x: 216, y: 0, width: 1224, height: 820 } });
await shot("overview", "/admin/updown", null, { clip: { x: 216, y: 0, width: 1224, height: 900 } });

await browser.close();
console.log(`\nDone → docs/guide-img/  •  now run: node scripts/generate-pdfs.mjs`);
