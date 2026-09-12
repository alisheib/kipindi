/**
 * revoked-deadend — a displaced session must still be able to SEE a page.
 *
 * 🔴 WHAT THIS CATCHES, AND WHY IT ASSERTS PIXELS RATHER THAN A URL.
 * On 2026-09-12 a player whose session had been displaced (a newer login elsewhere, a sign-out on
 * another device, a suspension, or an `ActiveSession` row that went missing) could open any 50pick
 * link and land on a COMPLETELY EMPTY navy page. The address bar read
 * `/auth/login?revoked=1&next=/markets/mkt_…` — exactly right — and the login page's RSC payload
 * came back 200. It simply had nowhere to mount, because `AppShell` sits in the ROOT layout and its
 * revoked branch returns a redirect shim *instead of* `{children}`, and the App Router does not
 * re-execute a shared root layout on the client-side soft navigation that shim performed.
 *
 * ⛔ SO A GUARD THAT CHECKS THE URL IS WORTHLESS HERE. The URL was correct for the entire life of
 * the bug. This guard requires the page to have actually RENDERED: visible text, and the password
 * field a person needs in order to get back in.
 *
 * ⭐ It also asserts the part the URL check would never have reached: that a PUBLIC page is still
 * readable while displaced. The original defect locked players out of `/markets` and even
 * `/legal/rules` — every route on the platform, not just the private ones.
 *
 * Local only: it drives /auth/demo, which is 404 in production.
 *   BASE=http://localhost:3009 node scripts/revoked-deadend.test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label} ${extra}`.trim()); console.log(`  ✗ ${label} ${extra}`); }
};

// Warm up — a cold route compiles on first hit and would race the assertions below.
for (let i = 0; i < 30; i++) {
  if (await fetch(BASE + "/api/health").then((r) => r.ok).catch(() => false)) break;
  await wait(1500);
}
for (const r of ["/", "/markets", "/wallet", "/auth/login", "/legal/rules"]) await fetch(BASE + r).catch(() => {});
await wait(500);

const browser = await chromium.launch(
  process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
);

console.log("\n[revoked-deadend] a displaced session must still see a page");

// ── Context A signs in, then context B displaces it by signing in to the SAME account.
const A = await browser.newContext();
const a = await A.newPage();
const errs = [];
a.on("pageerror", (e) => errs.push("pageerror: " + e.message));

await a.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
await wait(1200);
await a.goto(BASE + "/wallet", { waitUntil: "domcontentloaded" });
await wait(1500);
const liveLen = await a.evaluate(() => document.body.innerText.trim().length);
ok("baseline · /wallet renders while the session is the active one", liveLen > 100, `(text=${liveLen})`);

const B = await browser.newContext();
const b = await B.newPage();
await b.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
await wait(1200);
await b.close();

// ── The regression itself: open a deep link on the displaced device.
// A PROTECTED route, a PUBLIC list, and a PUBLIC legal page — the original bug broke all three.
for (const target of ["/wallet", "/positions", "/markets", "/legal/rules"]) {
  errs.length = 0;
  await a.goto(BASE + target, { waitUntil: "domcontentloaded" });
  // Generous: the shim navigates, then the destination has to render.
  await wait(4000);

  const r = await a.evaluate(() => ({
    path: location.pathname,
    textLen: document.body.innerText.trim().length,
    hasPassword: !!document.querySelector('input[type="password"]'),
  }));

  // THE assertion. Not the URL — the page.
  ok(`${target} · displaced device sees rendered content, not a blank body`,
    r.textLen > 100, `(text=${r.textLen} path=${r.path})`);

  // Wherever it lands, the player must have a way back in: either they are on an auth
  // surface with a password field, or they are reading a public page as a guest.
  const recoverable = r.hasPassword || (r.textLen > 100 && !r.path.startsWith("/auth"));
  ok(`${target} · the player has a way forward (sign-in field or a readable public page)`,
    recoverable, `(password=${r.hasPassword} path=${r.path})`);

  ok(`${target} · no page errors`, errs.length === 0, errs.join(" | "));
}

await browser.close();

console.log(`\n[revoked-deadend] ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log("  · " + f);
  process.exit(1);
}
