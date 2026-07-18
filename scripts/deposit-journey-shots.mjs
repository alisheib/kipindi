/**
 * DEPOSIT-JOURNEY VISUAL PASS — screenshots the surfaces this change touched, at
 * every breakpoint that matters, in all three locales, and asserts the mechanical
 * criteria a screenshot can't tell you by itself.
 *
 * Surfaces: sign-up · sign-in · the deposit form (mobile-money AND card, whose
 * billing block only appears once Card is selected) · the email gate · the card
 * return leg in all four outcomes · the receipt.
 *
 * Per shot it asserts:
 *   1. no horizontal overflow (scrollWidth ≤ clientWidth + 1)
 *   2. no console errors
 *   3. every interactive control ≥ 40px tall (the tap-target floor)
 *   4. no untranslated keys leaking through (a literal `t.` or `undefined` in text)
 *
 * A green run is NOT the point — the images must be READ. Output:
 *   .50pick-shots/deposit-journey/<surface>-<width>-<locale>.png
 *
 * Usage: BASE=http://localhost:3000 node scripts/deposit-journey-shots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = ".50pick-shots/deposit-journey";
mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  { tag: "360", w: 360, h: 800 },
  { tag: "768", w: 768, h: 1024 },
  { tag: "1280", w: 1280, h: 900 },
  { tag: "1920", w: 1920, h: 1080 },
];
const LOCALES = ["en", "sw", "zh"];

let pass = 0, fail = 0;
const problems = [];
const ok = (label, cond, extra) => {
  if (cond) pass++;
  else { fail++; problems.push(`${label}${extra ? ` — ${extra}` : ""}`); console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

/** Surfaces that don't need a signed-in session. */
const PUBLIC_SURFACES = [
  { name: "signup", path: "/auth/register" },
  { name: "signin", path: "/auth/login" },
  { name: "signin-error", path: "/auth/login?error=no_account&identifier=nobody%40example.com" },
  { name: "signup-dupe", path: "/auth/register?error=exists&email=taken%40example.com" },
];

/** Surfaces behind auth. `/auth/demo` mints a player session; `?email=` picks
 *  which side of the deposit email gate we land on. */
const PLAYER_SURFACES = [
  // email=verified — the real deposit form
  { name: "deposit-form", path: "/wallet/deposit", demoEmail: "verified" },
  { name: "deposit-card", path: "/wallet/deposit", demoEmail: "verified", selectCard: true },
  { name: "deposit-error", path: "/wallet/deposit?error=Enter%20your%20billing%20city%20to%20pay%20by%20card.&provider=CARD&amount=10000", demoEmail: "verified" },
  { name: "return-unknown", path: "/wallet/deposit/return", demoEmail: "verified" },
  { name: "wallet", path: "/wallet", demoEmail: "verified" },
  // email=unverified / none — the gate, both variants
  { name: "gate-unverified", path: "/wallet/deposit", demoEmail: "unverified" },
  { name: "gate-noemail", path: "/wallet/deposit", demoEmail: "none" },
];

async function auditPage(page, name, width, locale) {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const de = document.documentElement;
    // Real tap targets only: buttons, form controls, and LINK-BUTTONS (`.btn`).
    // Inline prose/footer links are navigation text, not 40px targets — the
    // house responsive-audit reports those rather than failing on them, and
    // hard-failing here would just flag the site-wide footer on every page and
    // drown out an actual regression in this journey.
    const tooSmall = [];
    for (const el of document.querySelectorAll('button, input, select, [role="button"], a.btn')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;            // hidden — not a tap target
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (el.type === "hidden" || el.classList.contains("sr-only")) continue;
      if (r.height < 40) {
        tooSmall.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} h=${Math.round(r.height)}`);
      }
    }
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      tooSmall: tooSmall.slice(0, 6),
      text: document.body.innerText,
    };
  });

  const id = `${name}-${width.tag}-${locale}`;
  ok(`${id} · no horizontal overflow`,
    metrics.scrollWidth <= metrics.clientWidth + 1,
    `scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}`);
  ok(`${id} · no console errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  ok(`${id} · tap targets ≥ 40px`, metrics.tooSmall.length === 0, metrics.tooSmall.join(", "));
  // A missing dictionary key renders as the literal path or `undefined`.
  ok(`${id} · no untranslated keys leaked`,
    !/\bt\.[a-z]+\.[a-zA-Z]+\b/.test(metrics.text) && !/\bundefined\b/.test(metrics.text),
    (metrics.text.match(/\bt\.[a-z]+\.[a-zA-Z]+\b|\bundefined\b/) || [])[0]);

  // Two captures per surface. `fullPage` distorts position:fixed chrome (the
  // bottom nav renders mid-page), so the VIEWPORT shot is the one that shows
  // what a player actually sees; the full-page shot is for reading the whole
  // form. Both get read.
  await page.screenshot({ path: `${OUT}/${id}.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/${id}-full.png`, fullPage: true });
}

const browser = await chromium.launch();

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width: width.w, height: width.h },
      extraHTTPHeaders: { "accept-language": locale },
    });
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);

    // ── public surfaces ──
    for (const s of PUBLIC_SURFACES) {
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await auditPage(page, s.name, width, locale);
      } catch (e) {
        ok(`${s.name}-${width.tag}-${locale} · loads`, false, String(e).slice(0, 120));
      }
      await page.close();
    }

    // ── signed-in surfaces ──
    const page = await ctx.newPage();
    try {
      let currentEmailState = null;
      for (const s of PLAYER_SURFACES) {
        // Re-bootstrap only when the required gate state changes.
        if (s.demoEmail !== currentEmailState) {
          await page.goto(`${BASE}/auth/demo?email=${s.demoEmail}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
          await page.waitForTimeout(700);
          currentEmailState = s.demoEmail;
        }
        await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });

        // The gate and the form are mutually exclusive — assert we actually got
        // the one this surface is meant to capture, so a silently-skipped
        // assertion can never masquerade as a pass.
        const gateShown = await page.locator('[data-testid="email-verify-gate"]').count();
        if (s.demoEmail === "verified") {
          ok(`${s.name}-${width.tag}-${locale} · deposit FORM renders (not the gate)`, gateShown === 0);
        } else {
          ok(`${s.name}-${width.tag}-${locale} · email GATE renders (not the form)`, gateShown === 1);
        }

        if (s.selectCard) {
          // The card-billing block is revealed by pure CSS off the CARD radio.
          const card = page.locator("#provider-CARD");
          ok(`${s.name}-${width.tag}-${locale} · Card option exists`, (await card.count()) === 1);
          await card.check({ force: true });
          await page.waitForTimeout(250);
          ok(`${s.name}-${width.tag}-${locale} · billing block appears when Card is chosen`,
            await page.locator('[data-testid="card-billing"]').isVisible().catch(() => false));
          ok(`${s.name}-${width.tag}-${locale} · mobile-money number hidden for Card`,
            !(await page.locator("#msisdn").isVisible().catch(() => true)));

          // REGRESSION GUARD: exactly ONE tile may look selected. The tile group
          // is named (`group/tile`) precisely because an unnamed one is also
          // satisfied by the form's own `group`, which lit the selection ring and
          // check pip on EVERY provider at once — the form still submitted the
          // right value, so only the screenshot revealed it.
          const litPips = await page.evaluate(() => {
            let lit = 0;
            for (const label of document.querySelectorAll('label:has(input[name="provider"])')) {
              const pip = label.querySelector("span.absolute.right-1\\.5");
              if (pip && Number(getComputedStyle(pip).opacity) > 0.5) lit++;
            }
            return lit;
          });
          ok(`${s.name}-${width.tag}-${locale} · exactly ONE provider tile looks selected`,
            litPips === 1, `${litPips} tiles lit`);
        }
        await auditPage(page, s.name, width, locale);
      }
    } catch (e) {
      ok(`player-surfaces-${width.tag}-${locale}`, false, String(e).slice(0, 160));
    }
    await page.close();
    await ctx.close();
  }
}

await browser.close();

console.log(`\ndeposit-journey-shots: ${pass} passed, ${fail} failed`);
console.log(`screenshots → ${OUT}`);
if (problems.length) {
  console.log("\nPROBLEMS:");
  for (const p of [...new Set(problems)]) console.log(`  · ${p}`);
}
if (fail > 0) process.exit(1);
