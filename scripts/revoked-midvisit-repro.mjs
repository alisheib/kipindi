/**
 * E-381 §6 item 1 — THE HALF THAT IS STILL BROKEN. A repro, not a gate.
 *
 * ⛔ THIS IS EXPECTED TO FAIL. It is committed so the next session can see the remaining defect
 * in one command instead of re-deriving it, and so the claim "E-381 is fixed" can never be made
 * without someone having to look at this. It is deliberately NOT in `predeploy` — a red
 * assertion in the gate chain would block every deploy.
 *
 * WHAT IT SHOWS. The shipped fix (`app-shell.tsx` → `redirect()`) cures the DOCUMENT path, which
 * is the journey Ali's players reported: a deep link now renders the login page. It does NOT
 * cure the mid-visit path:
 *
 *   `RefreshPoller` (src/components/ui/refresh-poller.tsx) calls `router.refresh()` on an
 *   interval and is mounted with NO session gate on /markets (30s), a market page (15s), /live
 *   (15s), /positions (20s), /updown (20s), /leaderboard (30s) and /results (60s). The custom
 *   `50pick:refresh` event fires it too — dispatched right after placing a bet
 *   (conviction-dial), cashing out (sell-button) and an Up & Down tap (use-quick-bet).
 *
 *   `router.refresh()` marks the root segment `refetch`, which IS the branch that re-renders the
 *   root layout — so AppShell runs, the revoked branch fires, and `redirect()` degrades to a
 *   CLIENT navigation. A client navigation cannot escape a root-layout decision, because a
 *   shared root layout is pruned from the flight response and the tree it lands in has no
 *   `children` slot. The player goes blank.
 *
 * MEASURED 2026-09-12 (this script, local dev): displaced device, soft-navigated to /markets via
 * the real nav <Link>, then touched nothing → bounced at **t+28s** to
 * `/auth/login?revoked=1&next=%2Fmarkets` with `innerText.length === 0`, still 0 six seconds
 * later. So every claim of the form "this branch can only fire on a hard document load" is
 * false, including the ones in the first two fixes' own docstrings.
 *
 * ⚠️ A FIX WAS ATTEMPTED AND REVERTED. Returning a hard-navigating client escape for flight
 * requests (detected via the `rsc` / `next-router-state-tree` request headers) produced a RETRY
 * STORM: the identical `_rsc` request repeating ~18 times, HTTP 200 each, page still blank. The
 * cause was not understood, so it was not shipped — a loop on the auth path is worse than the
 * bug. ⭐ The real fix is to stop deciding this in the ROOT LAYOUT at all.
 *
 *   BASE=http://localhost:3009 node scripts/revoked-midvisit-repro.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < 30; i++) {
  if (await fetch(BASE + "/api/health").then((r) => r.ok).catch(() => false)) break;
  await wait(1500);
}

const browser = await chromium.launch(
  process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
);

const A = await browser.newContext();
const a = await A.newPage();
await a.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
await wait(1200);

const B = await browser.newContext();
const b = await B.newPage();
await b.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
await wait(1200);
await b.close();
console.log("device A displaced by a second sign-in\n");

// The DOCUMENT path — this is the part that IS fixed.
await a.goto(BASE + "/markets", { waitUntil: "domcontentloaded" });
await wait(4000);
const doc = await a.evaluate(() => ({ p: location.pathname, t: document.body.innerText.trim().length }));
console.log(`[FIXED]  hard load of /markets -> ${doc.p}, text=${doc.t} ${doc.t > 100 ? "(renders ✓)" : "(BLANK ✗)"}`);

// Soft-navigate with the app's OWN <Link> so the App Router intercepts it.
// ⚠️ An injected raw <a> is NOT intercepted and silently measures a hard navigation instead —
// that mistake produced a false "fixed" reading once already.
const link = a.locator('a[href="/markets"]').first();
if (!(await link.count())) { console.log("no /markets <Link> on the page — cannot drive the soft nav"); await browser.close(); process.exit(2); }
await link.click();
await wait(4000);
const soft = await a.evaluate(() => ({ p: location.pathname, t: document.body.innerText.trim().length }));
console.log(`         soft nav to /markets -> ${soft.p}, text=${soft.t}`);
if (soft.p !== "/markets") { console.log("could not land on /markets; the mid-visit path is UNTESTED in this run"); await browser.close(); process.exit(2); }

console.log("\n[BROKEN] sitting on /markets, touching nothing. RefreshPoller there is 30s.");
const start = Date.now();
let event = null;
for (let i = 0; i < 30; i++) {
  await wait(2000);
  const st = await a.evaluate(() => ({ p: location.pathname, s: location.search, t: document.body.innerText.trim().length }));
  const el = Math.round((Date.now() - start) / 1000);
  if (i % 4 === 0) console.log(`         t+${el}s  ${st.p}  text=${st.t}`);
  if (st.p !== "/markets" || st.t === 0) { event = { el, ...st }; break; }
}

if (!event) {
  console.log("\n✅ No mid-visit blank within the window. If this is repeatable, §6 item 1 may be FIXED — re-read the doc and update it.");
  await browser.close();
  process.exit(0);
}

await wait(6000);
const settled = await a.evaluate(() => ({
  p: location.pathname + location.search,
  t: document.body.innerText.trim().length,
  pw: !!document.querySelector('input[type="password"]'),
}));
console.log(`\n         MID-VISIT EVENT at t+${event.el}s -> ${event.p}${event.s}, text=${event.t}`);
console.log(`         SETTLED 6s later          -> ${settled.p}, text=${settled.t}, password=${settled.pw}`);
console.log(settled.t > 100
  ? "\n✅ It recovered after settling — the defect may be narrower than recorded. Re-measure and update §6 item 1."
  : "\n❌ STILL BLANK. §6 item 1 stands: the mid-visit path is not fixed.");
await browser.close();
process.exit(settled.t > 100 ? 0 : 1);
