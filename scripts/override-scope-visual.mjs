#!/usr/bin/env node
/**
 * override-scope-visual.mjs — F3's per-market override panel, in a real browser.
 *
 * ⛔ THE STRUCTURAL GUARD (`npm run test:override-scope`) PROVES THE FOUR INPUTS ARE
 * GONE FROM THE SOURCE. It cannot prove the panel still READS as a coherent control
 * afterwards — that removing four of six fields left a sensible two-field form with
 * an explanation, rather than a stub with a dangling heading. That is what this is for.
 *
 * ⛔ LOCALHOST ONLY. It signs in as an admin; doing that on production revokes the
 * live owner session (single-active-session, session.ts).
 *
 * Setup: see scripts/criterion-wizard-visual.mjs — same seeded admin, same server.
 * Usage:
 *   node scripts/override-scope-visual.mjs --base http://127.0.0.1:3001 --shots .qa-f3
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:3001").replace(/\/$/, "");
const PHONE = arg("--phone", "+255700000000");
const PASSWORD = arg("--password", "QaAdmin2026!");
const SHOTS = arg("--shots", ".qa-f3");

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE)) {
  console.error(`REFUSED — localhost only, got ${BASE}.`);
  process.exit(1);
}
mkdirSync(SHOTS, { recursive: true });

const DEAD = ["commissionRate", "feeCeilingRate", "cashOutFeeRate", "thinProfitRatio"];
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const browser = await chromium.launch();

for (const width of [360, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: 1400 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // Same login rule as harness.mjs: staff at /auth/admin, 9-digit local part,
  // networkidle so PhoneInput's hidden mirror is populated by React.
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 60000 });
  const field = (await page.locator("#phone").count()) ? "#phone" : "#identifier";
  await page.fill(field, PHONE.replace(/^\+255/, ""));
  await page.fill('input[type="password"]', PASSWORD);
  await page.getByRole("button", { name: /sign in|log ?in|ingia|(?<!退出)登录/i }).first().click();
  const signedIn = await page.waitForFunction(() => {
    const t = document.body.innerText.toLowerCase();
    if (/invalid|incorrect|too many attempts|locked/.test(t)) return "bad";
    if (/admin sign in|i'm a player, not staff/.test(t)) return false;
    return /back to app|muhtasari|staff · confidential/.test(t);
  }, undefined, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => false);
  if (signedIn !== true) { ok(`${width}: signed in`, false); await ctx.close(); continue; }

  await page.goto(`${BASE}/admin/config`, { waitUntil: "domcontentloaded", timeout: 60000 });
  // ⛔ SCOPED TO THE OVERRIDE FORM. `/admin/config` also carries the GLOBAL config
  // form, which legitimately DOES have every rate input — a page-wide check for
  // `name="commissionRate"` would fail over correct markup, and a page-wide check
  // for its absence could never pass. This is the "scope every selector" rule at
  // its sharpest: the same field name means opposite things in two forms on one page.
  const form = page.locator("form").filter({ has: page.locator('input[name="marketId"]') });
  await form.waitFor({ state: "visible", timeout: 30000 });
  ok(`${width}: the per-market override form was located exactly once`, await form.count() === 1,
     `${await form.count()} match(es)`);

  for (const k of DEAD) {
    ok(`${width}: no ${k} input in the OVERRIDE form`, await form.locator(`input[name="${k}"]`).count() === 0);
  }
  // ⚠️ And the same field DOES still exist on the page — in the global form, where it
  // works. Asserting that makes the check above meaningful rather than vacuous:
  // it proves the locator can see rate inputs when they are legitimately present.
  ok(`${width}: CONTROL — commissionRate still exists on the page, in the GLOBAL form`,
     await page.locator('input[name="commissionRate"]').count() >= 1);

  for (const k of ["minStake", "maxStake"]) {
    ok(`${width}: ${k} survives in the override form`, await form.locator(`input[name="${k}"]`).count() === 1);
  }

  const text = await form.innerText();
  ok(`${width}: the panel EXPLAINS why rates are absent`, /stake bounds only/i.test(text), text.slice(0, 60));
  ok(`${width}: …and says rates are frozen at creation`, /frozen onto a poll when it is created/i.test(text));
  // The old comment's claim must not survive as UI copy anywhere in this form.
  ok(`${width}: the "that is the point" framing is gone`, !/that is the point/i.test(text));

  const over = await form.evaluate((el) => {
    let worst = 0;
    for (const n of [el, ...el.querySelectorAll("*")]) worst = Math.max(worst, n.scrollWidth - n.clientWidth);
    return worst;
  });
  ok(`${width}: nothing overflows inside the panel`, over <= 1, `${over}px`);

  await form.screenshot({ path: `${SHOTS}/override-form-${width}.png` });
  await ctx.close();
}

await browser.close();
console.log(`\noverride-scope-visual: ${pass} passed, ${fail} failed · shots in ${SHOTS}/`);
if (fail > 0) process.exit(1);
