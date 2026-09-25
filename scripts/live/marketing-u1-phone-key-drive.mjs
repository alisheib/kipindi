/**
 * LIVE PROOF FOR MARKETING U1 — the IDD prefix, driven through the deployed bundle.
 *
 * ⭐ WHY THIS PAGE AND THIS GESTURE. `phone-input.tsx:131` is literally
 * `const stripDigits = normalizeTzLocalDigits`, so the registration field's paste handler IS the
 * function U1 fixed. Pasting there exercises the real deployed code in a real browser — not a
 * re-implementation, and not a bundle grep.
 *
 * ⛔ IT HAS TO BE A PASTE, NOT TYPING, AND THE REASON IS `maxLength={11}`. The visible input holds
 * the FORMATTED value ("712 345 678", eleven characters), and every keystroke is re-normalised, so
 * `00255712345678` can never be typed in — each `0` normalises away as it is entered. `handlePaste`
 * (`phone-input.tsx:65`) calls `preventDefault()` and sets the value itself, which is the only path
 * by which a fourteen-character international string reaches the normaliser at all. A drive that
 * typed the digits would report a green field and prove nothing.
 *
 * ⭐ THE DISCRIMINATION, both directions asserted:
 *      before U1   hidden mirror = "255712345"   — nine digits, a DIFFERENT subscriber, tzPhone refuses it
 *      after  U1   hidden mirror = "712345678"   — the number that was actually pasted
 *   The run asserts the new value IS present AND the old value is NOT. A check that only asserted
 *   the new one would also pass on a page that rendered nothing at all.
 *
 * ⛔ IT REFUSES TO REPORT ANYTHING UNLESS `data-dpl-id` MATCHES THE COMMIT IT WAS TOLD TO PROVE.
 * On this platform that attribute is the git SHA, so "did I measure the new build" is exact rather
 * than a guess about cache. Railway serves the previous build for a minute or two after a push.
 *
 * ⚠️ `HeadlessChrome` stays in the user agent: `/api/pv` excludes it, and a drive that hides itself
 * is counted as real visitors.
 *
 * ⛔ READ-ONLY. It fills a field on a public page and never submits — submitting would issue a real
 * login code to a real handset at real cost.
 *
 * Run:  node scripts/live/marketing-u1-phone-key-drive.mjs <expected-sha>
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.LIVE_BASE ?? "https://www.50pick.tz";
const WANT_SHA = (process.argv[2] ?? "").trim();
const SHOTS = ".qa-shots/marketing-setup/U1";

/** The vector, and both answers it can give. */
const PASTED = "00255712345678";
const AFTER_U1 = "712345678";
const BEFORE_U1 = "255712345";

let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

process.exitCode = 1; // failure is the default; cleared only at the very end

mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
});
const page = await ctx.newPage();

console.log(`\nMARKETING U1 — live proof against ${BASE}\n`);

await page.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });

/* ── the build under the measurement ─────────────────────────────────────── */
// ⚠️ `<html data-dpl-id>` IS NOT ON EVERY ROUTE — measured 2026-09-25: it is present on `/` and
// absent on `/auth/register`, so a drive that read only that attribute would abort on a perfectly
// good build and call it "wrong build". Every `_next/static` asset carries `?dpl=<sha>` on every
// route, which is the reliable reading; the attribute stays as a fallback.
const dpl = await page.evaluate(() => {
  const el = [...document.querySelectorAll("script[src], link[href]")]
    .map((n) => n.getAttribute("src") || n.getAttribute("href") || "")
    .find((u) => u.includes("dpl="));
  const fromAsset = el ? (el.match(/[?&]dpl=([0-9a-f]+)/) || [])[1] : "";
  return fromAsset || document.documentElement.getAttribute("data-dpl-id") || "";
});
console.log(`  build: dpl = ${dpl || "(absent)"}`);
if (WANT_SHA) {
  ok(`the page served is the commit under test (${WANT_SHA})`, dpl.startsWith(WANT_SHA), `served ${dpl}`);
  if (!dpl.startsWith(WANT_SHA)) {
    console.log("\n  ⛔ STOPPING. Measuring the wrong build proves nothing either way.\n");
    await browser.close();
    process.exit(1);
  }
}

/* ── the field exists at all (a missing field must not read as a pass) ────── */
const visible = page.locator("#phone");
ok("the registration page renders the phone field", (await visible.count()) === 1, `found ${await visible.count()}`);
const mirror = page.locator('input[type="hidden"][name="phone"]');
ok("…and its hidden value carrier", (await mirror.count()) === 1, `found ${await mirror.count()}`);

/* ── control: a plain nine-digit number still works ──────────────────────── */
await visible.click();
await visible.pressSequentially("712345678", { delay: 15 });
{
  const shown = await visible.inputValue();
  const carried = await mirror.inputValue();
  ok("control · a normal number still formats and carries", shown === "712 345 678" && carried === "712345678",
     `shown "${shown}" carried "${carried}"`);
}

/* ── the vector, pasted as a real clipboard event ────────────────────────── */
await visible.fill("");
await page.evaluate((text) => {
  const el = document.querySelector("#phone");
  el.focus();
  const dt = new DataTransfer();
  dt.setData("text", text);
  el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
}, PASTED);
await page.waitForTimeout(250);

const shown = await visible.inputValue();
const carried = await mirror.inputValue();
console.log(`\n  pasted "${PASTED}"  ->  field shows "${shown}", form carries "${carried}"\n`);

ok(`the form carries the number that was pasted ("${AFTER_U1}")`, carried === AFTER_U1, `carried "${carried}"`);
ok(`⭐ …and NOT the pre-U1 answer ("${BEFORE_U1}", a different subscriber)`, carried !== BEFORE_U1, `carried "${carried}"`);
ok('the field displays it grouped ("712 345 678")', shown === "712 345 678", `shown "${shown}"`);
ok("⭐ the visible value satisfies the field's own pattern, so the browser will not refuse it",
   await page.evaluate(() => document.querySelector("#phone").checkValidity()));

await page.screenshot({ path: `${SHOTS}/1280-idd-pasted.png` });

/* ── the same gesture at phone width ─────────────────────────────────────── */
await page.setViewportSize({ width: 360, height: 780 });
await page.waitForTimeout(150);
const shown360 = await visible.inputValue();
const carried360 = await mirror.inputValue();
ok("360px · the same value, unchanged by width", shown360 === "712 345 678" && carried360 === AFTER_U1,
   `shown "${shown360}" carried "${carried360}"`);
await page.screenshot({ path: `${SHOTS}/360-idd-pasted.png` });

await browser.close();

console.log(`\nU1 LIVE — ${fail === 0 ? `${pass} proofs held` : `${fail} of ${pass + fail} FAILED`}`);
console.log(`shots: ${SHOTS}/1280-idd-pasted.png · ${SHOTS}/360-idd-pasted.png\n`);
process.exitCode = fail === 0 ? 0 : 1;
