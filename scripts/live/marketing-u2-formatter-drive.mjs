/**
 * LIVE PROOF FOR MARKETING U2 — the display formatter, driven from its new home.
 *
 * ⚠️ BE HONEST ABOUT WHAT THIS CAN AND CANNOT PROVE. U2 ships a LIBRARY. `parseTzNumber` has no
 * screen yet — its consumers are the contacts importer and the campaign audience, units away. So
 * there is no live surface on which "the NDC table is right" could be discriminated, and this drive
 * does not pretend otherwise. What it proves is the half that CAN fail in production:
 *
 *   ⭐ ① THE MODULE IS IN THE CLIENT BUNDLE AND RUNNING. `formatTzPhone` moved out of
 *   `phone-input.tsx` into `tz-msisdn.ts`, which the component now imports. If that move had dragged
 *   anything server-side across the boundary, `next build` would have failed and the deploy would
 *   never have advanced — so reaching this page on the new `dpl` is itself the first proof. If the
 *   client chunk were broken some other way, the field would render but STOP FORMATTING as you type,
 *   because the formatter now lives in a different chunk than the component. Typing and watching the
 *   grouping appear is what separates "the page loaded" from "the moved code is executing".
 *
 *   ⭐ ② THE MOVE CHANGED NOTHING A PLAYER SEES. Every grouping state is asserted, including the two
 *   boundaries the second, drifted copy in `wallet/withdraw/page.tsx` also got right — because the
 *   point of this drive is that nothing regressed, not that something new appeared.
 *
 * ⛔ IT REFUSES TO REPORT UNLESS `?dpl=` MATCHES THE COMMIT UNDER TEST — on this platform that is the
 * git SHA, so "did I measure the new build" is exact. Railway serves the previous build for a minute
 * or two after a push, and `<html data-dpl-id>` is absent on some routes, so the asset query string
 * is the reading that works everywhere.
 *
 * ⚠️ `HeadlessChrome` stays in the UA: `/api/pv` excludes it, and a drive that hides itself is
 * counted as real visitors.  ⛔ READ-ONLY — it types into a public field and never submits.
 *
 * Run:  node scripts/live/marketing-u2-formatter-drive.mjs <expected-sha>
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.LIVE_BASE ?? "https://www.50pick.tz";
const WANT_SHA = (process.argv[2] ?? "").trim();
const SHOTS = ".qa-shots/marketing-setup/U2";

let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

process.exitCode = 1; // failure is the default
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
});
const page = await ctx.newPage();

console.log(`\nMARKETING U2 — live proof against ${BASE}\n`);
await page.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });

const dpl = await page.evaluate(() => {
  const u = [...document.querySelectorAll("script[src], link[href]")]
    .map((n) => n.getAttribute("src") || n.getAttribute("href") || "")
    .find((s) => s.includes("dpl="));
  return (u && (u.match(/[?&]dpl=([0-9a-f]+)/) || [])[1]) || document.documentElement.getAttribute("data-dpl-id") || "";
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
ok("⭐ the deploy exists at all — so `next build` accepted tz-msisdn in the client graph", !!dpl);

const field = page.locator("#phone");
const mirror = page.locator('input[type="hidden"][name="phone"]');
ok("the registration page renders the phone field", (await field.count()) === 1);

/* ── every grouping state, typed one digit at a time ─────────────────────── */
// ⭐ TYPED, NOT SET. The formatter now lives in a different module from the component; only a real
// keystroke round trip proves that chunk loaded and is executing.
const STATES = [
  ["7", "7"], ["71", "71"], ["712", "712"], ["7123", "712 3"],
  ["71234", "712 34"], ["712345", "712 345"], ["7123456", "712 345 6"],
  ["71234567", "712 345 67"], ["712345678", "712 345 678"],
];
await field.click();
let typed = "";
for (const [digits, expected] of STATES) {
  await field.pressSequentially(digits.slice(typed.length), { delay: 20 });
  typed = digits;
  const shown = await field.inputValue();
  ok(`typing "${digits}" shows "${expected}"`, shown === expected, `shows "${shown}"`);
}
ok("⛔ no trailing space at a group boundary — the caret must not sit after a space nobody typed",
  !(await (async () => { await field.fill(""); await field.pressSequentially("712", { delay: 20 }); return field.inputValue(); })()).endsWith(" "));

await field.fill("");
await field.pressSequentially("712345678", { delay: 20 });
ok("the form still carries the raw nine digits, not the formatted string",
  (await mirror.inputValue()) === "712345678", `carried "${await mirror.inputValue()}"`);
ok("⭐ …and the visible value satisfies the field's own pattern, which is written against the FORMATTED string",
  await page.evaluate(() => document.querySelector("#phone").checkValidity()));

await page.screenshot({ path: `${SHOTS}/1280-grouping.png` });

await page.setViewportSize({ width: 360, height: 780 });
await page.waitForTimeout(150);
ok("360px · the grouping is unchanged by width", (await field.inputValue()) === "712 345 678");
await page.screenshot({ path: `${SHOTS}/360-grouping.png` });

await browser.close();
console.log(`\nU2 LIVE — ${fail === 0 ? `${pass} proofs held` : `${fail} of ${pass + fail} FAILED`}`);
console.log(`shots: ${SHOTS}/1280-grouping.png · ${SHOTS}/360-grouping.png\n`);
process.exitCode = fail === 0 ? 0 : 1;
