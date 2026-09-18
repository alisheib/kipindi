/**
 * DRIVE A REAL BET AND CATCH WHAT THROWS — the instrument for Ali's 2026-09-18 report:
 * *"this page has encountered a problem"* AFTER a bet that SUCCEEDED, on ONE player's phone.
 *
 * His reproduction: signed in, `/updown`, **ROUNDS** (not chart) visible, 10-minute chain,
 * placed a bet, the bet's toast appeared, then the route error boundary replaced the page.
 *
 *   node scripts/live/updown-bet-crash-repro.mjs                  # localhost:3017
 *   LOCAL_BASE=… BOARD_PATH=/updown?d=10 node scripts/live/…      # elsewhere
 *
 * ⛔ JUDGED BY WHAT THE PAGE SAYS PLUS THE CAPTURED EXCEPTION — never by HTTP status. A
 *    client-side crash is served as **200**, carries no `error.digest`, and leaves NOTHING in
 *    the server logs; a browser is the only witness there is.
 * ⛔ IT GATES ON THE CARDS HAVING RENDERED (`cards`/`btn-yes`/`btn-no` > 0) and says so out
 *    loud when they have not. The predecessor probe in this campaign reported 28 cheerful
 *    passes having measured nothing at all.
 *
 * 🔴 WHAT IT MEASURED, 2026-09-18 — A CLEAN RUN, AND THAT IS THE FINDING, NOT A PASS.
 * Against `next dev` + the in-memory store, with `npm run fixture:player` populating the board:
 * signed in, Swahili shell, GATE `cards=1 btn-yes=1 btn-no=1`, tapped `Juu × 1.00`, bet placed,
 * **0 exceptions and no error boundary**. So the local fixture does NOT reproduce it.
 * ⚠️ Do not read that as "fixed". The local store offers only 5- and 15-minute chains and none
 * of production's data; Ali's case is the **10-minute** chain on production. This crash is
 * data-dependent, exactly like the chart tie before it — a green drive here clears nothing.
 * The deterministic guard (`npm run test:updown-clock-guard`) is the real gate.
 */
import { chromium } from "playwright";

const BASE = process.env.LOCAL_BASE ?? "http://localhost:3017";
const CRASH = ["that page hit a snag", "encountered a problem", "ukurasa huu umekumbana"];

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: "sw-TZ",            // his phone is Swahili
});

// His phone's remembered board choice: ROUNDS, not chart.
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("kp-updown-viz", "cubes");
    localStorage.setItem("kp-locale", "sw");
  } catch { /* ignore */ }
});

const page = await ctx.newPage();

const errs = [];
const logs = [];
page.on("pageerror", (e) => errs.push({ kind: "pageerror", msg: e.message, stack: e.stack }));
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") logs.push(`[${m.type()}] ${m.text()}`);
});
page.on("requestfailed", (r) => {
  const u = r.url();
  if (u.includes("/_next/static/")) logs.push(`[chunk-fail] ${u} — ${r.failure()?.errorText}`);
});

const say = (s) => console.log(s);

// ── sign in (dev-only demo session: 100,000 TZS, KYC approved) ───────────────
await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 180_000 });
await page.waitForTimeout(1500);
say(`signed in → ${page.url()}`);

// ── the board, 10-minute chain ───────────────────────────────────────────────
await page.goto(`${BASE}${process.env.BOARD_PATH ?? "/updown"}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
await page.waitForTimeout(4000);

const h1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
say(`board h1: ${JSON.stringify(h1.trim().slice(0, 80))}`);

// ⛔ GATE — the cards must actually have rendered, or nothing below measures anything.
const cards = await page.locator("article, [class*='card']").count();
const yesBtns = await page.locator(".btn-yes").count();
const noBtns = await page.locator(".btn-no").count();
say(`GATE cards=${cards} btn-yes=${yesBtns} btn-no=${noBtns}`);

// what durations does the local board offer?
const chips = await page.locator("text=/dakika|min/i").allTextContents().catch(() => []);
say(`duration chips: ${JSON.stringify([...new Set(chips.map((c) => c.trim()))].slice(0, 10))}`);

if (yesBtns === 0 && noBtns === 0) {
  say("\n⛔ NO BET BUTTON RENDERED — cannot place a bet; nothing was measured.");
  const body = (await page.locator("body").textContent().catch(() => "")) ?? "";
  say(`body excerpt: ${JSON.stringify(body.replace(/\s+/g, " ").trim().slice(0, 600))}`);
} else {
  // ── place the bet ──────────────────────────────────────────────────────────
  const before = errs.length;
  const target = yesBtns > 0 ? page.locator(".btn-yes").first() : page.locator(".btn-no").first();
  const label = (await target.textContent().catch(() => "")) ?? "";
  say(`\ntapping bet button: ${JSON.stringify(label.replace(/\s+/g, " ").trim().slice(0, 60))}`);
  await target.click({ timeout: 30_000 }).catch((e) => say(`click failed: ${e.message}`));

  // let the action round-trip, the toast fire, and the revalidate re-render land
  await page.waitForTimeout(9000);

  const afterH1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  const bodyTxt = ((await page.locator("body").textContent().catch(() => "")) ?? "").toLowerCase();
  const crashed = CRASH.some((c) => bodyTxt.includes(c));

  say(`\nafter-bet h1: ${JSON.stringify(afterH1.trim().slice(0, 100))}`);
  say(`ERROR BOUNDARY VISIBLE: ${crashed ? "YES — REPRODUCED" : "no"}`);
  say(`new exceptions during the bet: ${errs.length - before}`);
}

// ── the actual error, which is the whole point ───────────────────────────────
say(`\n=== captured exceptions (${errs.length}) ===`);
for (const e of errs) {
  say(`\n${e.kind}: ${e.msg}`);
  if (e.stack) say(String(e.stack).split("\n").slice(0, 12).join("\n"));
}
say(`\n=== console errors/warnings (${logs.length}) ===`);
for (const l of logs.slice(0, 30)) say(l);

await b.close();
