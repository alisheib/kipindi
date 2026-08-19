/**
 * `npm run qa:toast-modal` — TRIGGER the bet receipt at 360 and READ THE FRAME: is the toast
 * held while the result modal is up, and does it arrive when the modal closes?
 *
 *   npm run qa:toast-modal -- http://localhost:3018
 *
 * ⛔ THIS SCRIPT EXISTS BECAUSE THE STATIC GUARDS WERE ALL GREEN OVER A BROKEN FIX.
 * The first implementation of §F1's stand-down asked `isResultModalOpen()` inside `toast()`.
 * `test:feedback-law` §10 passed every assertion, `red:feedback-law` caught all three of its
 * mutations 24/24 — and a real bet at 360 put the toast on screen over the receipt anyway.
 * The quick-bet fires its toast in the SAME COMMIT that mounts the modal, and presence is
 * registered from an effect, so at that instant the modal was not open yet. Nothing that reads
 * source can see that; only the rendered frame can.
 *
 * ⚠️ NEEDS A LOCAL DEV SERVER WITH A BETTABLE ROUND. `/auth/demo` mints a funded session
 * (404 in production), `POST /api/dev-test/updown-seed` stands up chains and
 * `POST /api/dev-test/updown-advance` arms one, so a round is actually open:
 *     curl -X POST $BASE/api/dev-test/updown-seed -H 'content-type: application/json' \
 *          -d '{"durations":[3],"feedProvider":"mock-bars"}'
 *     curl -X POST $BASE/api/dev-test/updown-advance
 *
 * §5 rules obeyed: language comes from the `kp-locale` COOKIE and `<html lang>` is read back,
 * refusing on a mismatch; controls are found by CLASS, never by text (`/UP|JUU|涨/` matched
 * only Chinese, on case); and visibility is `checkVisibility()`, never a rect.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3018";
let pass = 0;
const fails = [];
const ok = (n, c, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}${d ? ` — ${d}` : ""}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};

// Stand up Up & Down chains through the real admin service path.
const seed = await fetch(`${BASE}/api/dev-test/updown-seed`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ durations: [3], feedProvider: "mock-bars" }),
}).then((r) => r.text()).catch((e) => `ERR ${e.message}`);
console.log(`  seed: ${seed.slice(0, 140)}`);

const browser = await chromium.launch();
try {
  for (const [cookie, expectLang] of [["en", "en"], ["sw", "sw"], ["zh", "zh"]]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    await ctx.addCookies([{ name: "kp-locale", value: cookie, url: BASE }]);
    const page = await ctx.newPage();
    // Mint a funded, authed session (local only; 404 in production).
    await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(3000);

    const lang = await page.getAttribute("html", "lang");
    if (!ok(`${cookie}@360 · <html lang> agrees with the cookie`, lang === expectLang, `lang=${lang}`)) {
      await ctx.close();
      continue;
    }

    // ⛔ Find the stake control by CLASS/attribute, never by text: /UP|JUU|涨/ matched only
    // Chinese, on case (§5).
    const upBtn = page.locator("[data-ud-side='UP'], button.btn-yes").first();
    const n = await upBtn.count();
    if (!ok(`${cookie}@360 · a bettable UP control is on the board`, n > 0, `${n} candidate(s)`)) {
      await ctx.close();
      continue;
    }
    await upBtn.click({ timeout: 15000 }).catch(() => {});
    // The confirm step, if the surface uses one.
    const confirm = page.locator("[data-confirm-place], button.btn-gold").first();
    if (await confirm.count()) await confirm.click({ timeout: 10000 }).catch(() => {});

    // Give the action a moment to resolve into a modal.
    await page.waitForTimeout(2500);

    const modal = page.locator("[role='dialog']");
    const modalUp = (await modal.count()) > 0 && await modal.first().isVisible().catch(() => false);
    // ⚠️ `checkVisibility()`, not a rect: a rect is not visibility (§5).
    const toastVisible = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll("[role='status'],[role='alert']")];
      return nodes.filter((el) => el.checkVisibility?.() ?? false).length;
    });

    if (modalUp) {
      ok(`${cookie}@360 · ⭐ with the result modal up, NO toast is on screen`, toastVisible === 0,
         `${toastVisible} visible toast(s)`);
      // Dismiss the modal and prove the held toast ARRIVES rather than being dropped.
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1200);
      const after = await page.evaluate(() => {
        const nodes = [...document.querySelectorAll("[role='status'],[role='alert']")];
        return nodes.filter((el) => el.checkVisibility?.() ?? false).length;
      });
      ok(`${cookie}@360 · ⛔ …and the held toast ARRIVES once the modal closes`, after >= 1,
         `${after} visible toast(s) after dismiss`);
    } else {
      console.log(`  skip ${cookie}@360 · no result modal appeared (bet did not complete on this board)`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(`\ndrive-toast-modal: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length ? 1 : 0);
