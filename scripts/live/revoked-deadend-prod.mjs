/**
 * E-381 — verify the revoked-session dead end is gone, ON PRODUCTION.
 *
 * Drives the EXACT url Ali's players reported being stuck on:
 *   https://50pick.tz/markets/mkt_8ec80bc79eae484c65d0
 *
 * Recipe: sign the QA player in on "device A", sign the SAME account in again on "device B" so
 * the registry displaces A (single-active-session), then have A open the deep link — which is
 * precisely "I was logged in, I came back later, I opened a 50pick link".
 *
 * ⛔ IT ASSERTS THE RENDERED PAGE, NOT THE URL. The url was correct for this bug's whole life
 * (`path=/auth/login`), so a url check would report green against a blank screen.
 * ⚠️ Money-neutral: two sign-ins as one QA persona. No bet, no deposit, no withdrawal.
 * ⛔ Uses the harness `login()` — it already solves the PhoneInput hydration trap (the visible
 * field mirrors into a hidden input only on a React onChange), which a hand-rolled fill does not.
 *
 *   node scripts/live/revoked-deadend-prod.mjs
 */
import { chromium } from "playwright";
import { login, BASE } from "./harness.mjs";

const DEEP_LINK = process.env.DEEP_LINK || "/markets/mkt_8ec80bc79eae484c65d0";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label} ${extra}`.trim()); console.log(`  ✗ ${label} ${extra}`); }
};

const browser = await chromium.launch();
console.log(`\n[E-381 · PRODUCTION] ${BASE}${DEEP_LINK}`);

const A = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const a = await A.newPage();
const errs = [];
a.on("pageerror", (e) => errs.push("pageerror: " + e.message));

// ── Device A signs in and proves the deep link works while its session is the active one.
await login(a, "alpha");
console.log("  · device A signed in");
await a.goto(BASE + DEEP_LINK, { waitUntil: "domcontentloaded" });
await wait(3500);
const liveLen = await a.evaluate(() => document.body.innerText.trim().length);
ok("baseline · the deep link renders while A's session is the active one", liveLen > 100, `(text=${liveLen})`);

// ── Device B signs in to the SAME account, displacing A.
const B = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const b = await B.newPage();
await login(b, "alpha");
console.log("  · device B signed in — A is now displaced");
await b.close();

// ── THE TEST. A opens the deep link with a displaced session.
errs.length = 0;
await a.goto(BASE + DEEP_LINK, { waitUntil: "domcontentloaded" });
await wait(7000); // the document navigation, then the destination render

const r = await a.evaluate(() => ({
  href: location.pathname + location.search,
  textLen: document.body.innerText.trim().length,
  hasPassword: !!document.querySelector('input[type="password"]'),
  bg: getComputedStyle(document.body).backgroundColor,
  firstText: document.body.innerText.trim().slice(0, 180),
}));

console.log("\n  observed: " + JSON.stringify(r, null, 2).split("\n").join("\n  ") + "\n");

ok("🔴 THE FIX · a displaced device sees a RENDERED page, not a blank body",
  r.textLen > 100, `(text=${r.textLen} at ${r.href})`);
ok("🔴 THE FIX · it is the sign-in page, with a password field to get back in",
  r.hasPassword, `(href=${r.href})`);
ok("the original destination survives in next=",
  decodeURIComponent(r.href).includes(DEEP_LINK), `(href=${r.href})`);
ok("no page errors", errs.length === 0, errs.join(" | "));

// ── The public board must be reachable too — the bug locked that out as well.
await a.goto(BASE + "/markets", { waitUntil: "domcontentloaded" });
await wait(5000);
const pub = await a.evaluate(() => ({
  href: location.pathname,
  textLen: document.body.innerText.trim().length,
}));
ok("the PUBLIC board is reachable on a displaced device",
  pub.textLen > 100, `(text=${pub.textLen} at ${pub.href})`);

if (process.env.SHOT) await a.screenshot({ path: process.env.SHOT, fullPage: false });
await browser.close();

console.log(`\n[E-381 · PRODUCTION] ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log("  · " + f);
  process.exit(1);
}
