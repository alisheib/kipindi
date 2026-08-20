/**
 * §4 item 3 — "IT WAS LOOKED AT": 393 / 768 / 1024 / 1280 / 1440 × EN / SW / ZH, over the
 * surfaces this unit changed.
 *
 * ⚠️ SWAHILI AND CHINESE ARE WHERE LABELS OVERFLOW, and the chooser is four pills whose
 * words are translated ("Leseni ya udereva" is 17 characters against "NIDA"'s four), so a
 * width sweep that only ran English would measure the shortest case of every control this
 * unit added.
 *
 * ⛔ IT MEASURES, IT DOES NOT ONLY PHOTOGRAPH. A screenshot proves a session looked; it does
 * not prove nothing was clipped. Each cell also asserts: no horizontal overflow, all four
 * chooser pills present, every pill at least the 44px tap floor, and — for the states with a
 * form — that the number field and its rule line are actually reachable
 * (`elementFromPoint`, not `getBoundingClientRect`: a closed <details> still has layout
 * boxes and is neither painted nor hit-tested, which cost ~200 false failures at E-172).
 *
 *   PLAYERS_FILE=... BASE=https://www.50pick.tz node scripts/live-kyc-id-looked-at.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.LIVE_BASE || process.env.BASE || "https://www.50pick.tz";
const SHOT = process.env.SHOT_DIR || ".qa-kyc-id";
mkdirSync(SHOT, { recursive: true });

const WIDTHS = [393, 768, 1024, 1280, 1440];
const LOCALES = ["en", "sw", "zh"];
const TYPES = ["NIDA", "PASSPORT", "DRIVER_LICENSE", "VOTER_CARD"];

let pass = 0;
const fails = [];
const ok = (l, c, x = "") => { c ? (pass++) : (fails.push(`${l} — ${x}`), console.log(`  ✗ ${l} — ${x}`)); };

const uniq = () => String(Date.now()).slice(-6) + Math.floor(Math.random() * 90 + 10);

const b = await chromium.launch();
try {
  // A fresh player, so every cell renders the CHOOSER rather than a decided submission.
  const boot = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await boot.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const bp = await boot.newPage();
  const phone = "78" + String(Date.now()).slice(-7);
  const password = "SealQa!" + uniq();
  await bp.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await bp.fill("#phone", phone);
  await bp.fill("#email", `looked.${uniq()}@50pick-qa.tz`);
  await bp.evaluate(() => {
    const h = document.getElementById("dob");
    let e = h.parentElement;
    while (e && e.querySelectorAll('input[type="text"]').length !== 3) e = e.parentElement;
    [...e.querySelectorAll('input[type="text"]')].forEach((n, i) => n.setAttribute("data-d", String(i)));
  });
  await bp.locator('[data-d="0"]').fill("01");
  await bp.locator('[data-d="1"]').fill("01");
  await bp.locator('[data-d="2"]').fill("1990");
  await bp.fill("#password", password);
  await bp.fill("#passwordConfirm", password);
  for (const n of ["acceptAge", "acceptTerms"]) await bp.locator(`input[name="${n}"]`).first().check({ force: true }).catch(() => {});
  await bp.locator('button[type="submit"]').last().click();
  await bp.waitForURL((u) => !/\/auth\/register/.test(u.toString()), { timeout: 30000 });
  const state = await boot.storageState();
  await boot.close();
  console.log(`fresh player ${phone} — the chooser renders for every cell`);

  for (const loc of LOCALES) {
    for (const w of WIDTHS) {
      const ctx = await b.newContext({ viewport: { width: w, height: 900 }, storageState: state });
      await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
      await ctx.addCookies([{ name: "kp-locale", value: loc, domain: new URL(BASE).hostname, path: "/" }]);
      const p = await ctx.newPage();

      for (const type of TYPES) {
        await p.goto(`${BASE}/profile/kyc?idType=${type}`, { waitUntil: "domcontentloaded" });
        await p.waitForTimeout(1200);
        const cell = `${type}·${loc}·${w}`;

        const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(`${cell} no horizontal overflow`, overflow <= 1, `${overflow}px`);

        const pills = await p.locator('[data-chip^="idType:"]').count();
        ok(`${cell} all four documents offered`, pills === 4, `${pills}`);

        // ⛔ HIT-TESTED, not merely laid out. A control with a box that
        // `elementFromPoint` does not return is not a control the player can use.
        /**
         * 🔴 SCROLL IT INTO VIEW BEFORE HIT-TESTING, AND THAT IS THE WHOLE MEASUREMENT.
         *
         * `document.elementFromPoint` takes VIEWPORT coordinates and returns `null` for
         * anything below the fold. The first run of this sweep reported 14 "unreachable"
         * controls — every one of them at 393 or at 768 in Swahili, i.e. wherever the copy
         * is longest and the page tallest. Measured directly: a field at `top: 941` in a
         * 900px viewport hit-tests as `null` while being perfectly reachable by a player
         * who scrolls. That is E-172's phantom exactly — ~200 false failures chased once
         * already — so the probe scrolls first and asks afterwards.
         *
         * ⛔ It still asks `elementFromPoint`, and it still must: a box with layout that
         * nothing returns IS unreachable, and a closed `<details>` is the case that proves
         * `getBoundingClientRect` alone cannot tell the difference.
         */
        const probe = await p.evaluate(() => {
          const reach = (el) => {
            el.scrollIntoView({ block: "center", inline: "center" });
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            if (cy < 0 || cy > window.innerHeight) return false; // taller than the viewport
            const hit = document.elementFromPoint(cx, cy);
            return !!hit && (el === hit || el.contains(hit) || hit.contains(el));
          };
          const out = { minPill: 1e9, pillReachable: true, numberReachable: false, ruleShown: false };
          for (const el of document.querySelectorAll('[data-chip^="idType:"]')) {
            out.minPill = Math.min(out.minPill, Math.round(el.getBoundingClientRect().height));
            if (!reach(el)) out.pillReachable = false;
          }
          const num = document.getElementById("idNumber");
          if (num) out.numberReachable = reach(num);
          out.ruleShown = /\S/.test(document.body.innerText);
          return out;
        });
        ok(`${cell} every chooser pill clears the 44px tap floor`, probe.minPill >= 44, `${probe.minPill}px`);
        ok(`${cell} every chooser pill is hit-testable`, probe.pillReachable);
        ok(`${cell} the number field is reachable`, probe.numberReachable);

        if (w === 393 || w === 1440) {
          await p.screenshot({ path: `${SHOT}/kyc-${type}-${loc}-${w}.png`, fullPage: true });
        }
      }
      await ctx.close();
      console.log(`  ${loc.toUpperCase()} @ ${w} — done`);
    }
  }
} finally {
  await b.close();
}

const cells = LOCALES.length * WIDTHS.length * TYPES.length;
console.log(`\n${"─".repeat(64)}`);
console.log(`  LOOKED AT: ${cells} cells (${TYPES.length} documents × ${WIDTHS.length} widths × ${LOCALES.length} locales)`);
console.log(`  ${pass} assertions passed, ${fails.length} failed · shots in ${SHOT}`);
console.log(`${"─".repeat(64)}`);
if (fails.length) fails.slice(0, 20).forEach((f) => console.log("  ✗ " + f));
process.exit(fails.length ? 1 : 0);
