/**
 * G-3 · THE PLAYER SURFACES, LOOKED AT, AT EVERY WIDTH.
 *
 *   SHOT_DIR=./shots/RUN node scripts/live-player-sweep.mjs [fleetIndex]
 *
 * Ali asked directly: *"are you visually satisfied with progress bars, consistency, loading
 * states, empty states…?"* The honest answer was no — because nobody had looked. This looks.
 *
 * ⛔ IT SHOOTS THE VIEWPORT, NOT THE PAGE. A `fullPage` screenshot renders the FIXED header
 * mid-document and stretches every sticky element, so it manufactures layout bugs that do
 * not exist and hides the ones that do. Four widths, because the kit has already shipped a
 * real defect that only existed at one of them (the top bar overflows at 1024–1279).
 *
 * ⚠️ The first-run primer mounts over EVERY page for a new account, and every fleet player
 * is new. It is dismissed ONCE after sign-in, scoped to its own dialog, and the dismissal is
 * VERIFIED — otherwise every shot below is a photograph of a tutorial.
 */
import { BASE, SHOT, browser, login, bodyText } from "./live/harness.mjs";

const idx = process.argv[2] ?? "11";

const WIDTHS = [
  { name: "phone",   width: 390,  height: 844  },
  { name: "tabletP", width: 768,  height: 1024 },
  { name: "tabletL", width: 1024, height: 768  },   // the band where the top bar has overflowed
  { name: "desktop", width: 1440, height: 900  },
];

const SURFACES = [
  { path: "/",          name: "home",     wait: "markets|soko" },
  { path: "/markets",   name: "board",    wait: "markets|soko|no markets" },
  { path: "/updown",    name: "updown",   wait: "up & down|juu na chini" },
  { path: "/positions", name: "positions",wait: "position|nafasi|nothing|no " },
  { path: "/wallet",    name: "wallet",   wait: "wallet|pochi" },
  { path: "/results",   name: "results",  wait: "result|matokeo" },
];

const notes = [];

for (const w of WIDTHS) {
  const { b, ctx } = await browser({ viewport: { width: w.width, height: w.height } });
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${idx}`);

    // Dismiss the primer once, scoped, and VERIFY it — a swallowed failure means every
    // shot after this is a picture of the tutorial.
    const primer = page.locator('[role="dialog"][aria-label*="primer" i]');
    if (await primer.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      if (await primer.isVisible().catch(() => false)) {
        await primer.getByRole("button", { name: /close|cancel|skip|got it/i }).last().click({ force: true }).catch(() => {});
        await page.waitForTimeout(600);
      }
      if (await primer.isVisible().catch(() => false)) {
        notes.push(`${w.name}: PRIMER STILL UP — shots below are unreliable`);
      }
    }

    for (const s of SURFACES) {
      await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction((re) => new RegExp(re, "i").test(document.body.innerText),
                                s.wait, { timeout: 30_000 }).catch(() => {
        notes.push(`${w.name}/${s.name}: never rendered its own content (${s.wait})`);
      });
      await page.waitForTimeout(1500);

      // ⛔ VIEWPORT, not fullPage. See the header.
      await page.screenshot({ path: `${SHOT}/G3-${s.name}-${w.name}.png` });

      // Horizontal overflow is the one layout fault a screenshot can hide — the shot is
      // clipped to the viewport, so a body wider than the window looks fine in the image.
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 2) notes.push(`${w.name}/${s.name}: 🔴 horizontal overflow ${overflow}px`);

      const txt = await bodyText(page);
      if (/undefined|nan|\[object object\]|null/.test(txt)) {
        notes.push(`${w.name}/${s.name}: 🔴 raw placeholder in rendered copy`);
      }
      console.log(`  ${w.name.padEnd(8)} ${s.name.padEnd(10)} overflow=${overflow}px  ${txt.length} chars`);
    }
  } catch (e) {
    notes.push(`${w.name}: FAILED — ${e.message}`);
  } finally {
    await b.close();
  }
}

console.log(`\n${notes.length} thing(s) to look at:`);
for (const n of notes) console.log(`  · ${n}`);
console.log(`\nshots in ${SHOT} — ⛔ now READ them. A green sweep is not a readable screen.`);
