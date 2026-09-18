/**
 * THE URL ALI GAVE, DRIVEN — `https://50pick.tz/updown?asset=BTC&d=5`
 *
 * Reported 2026-09-18 as "the crashing url". `?d=5` is the DURATION FILTER, which no probe in
 * this campaign had ever set: `updown-404-drive.mjs` walked `/updown` and `/updown?asset=BTC`
 * only, so the filtered board is fresh ground.
 *
 *   node scripts/live/updown-url-crash-probe.mjs
 *   URL="https://50pick.tz/updown?asset=BTC&d=5" node scripts/live/updown-url-crash-probe.mjs
 *
 * ⛔ Judged by the CAPTURED EXCEPTION and the boundary's own heading — never HTTP status: this
 *    crash is served as 200 and leaves nothing in the server logs.
 * ⛔ Runs BOTH board views. `board-viz.tsx` mounts the chart only while it is selected, so a
 *    cubes-only probe cannot see a chart fault and a chart-only probe cannot see a card fault.
 * ⛔ Gates on the board having RENDERED, and says so loudly when it has not.
 */
import { chromium } from "playwright";
import { loginOnce } from "./harness.mjs";

const URL_UNDER_TEST = process.env.URL ?? "https://50pick.tz/updown?asset=BTC&d=5";
/**
 * ⭐ SIGNED IN, BECAUSE SIGNED OUT CANNOT SEE THIS AT ALL. Measured 2026-09-18 against this
 * exact URL: signed out the board renders with **betBtns=0** — quick-bet is armed only for a
 * signed-in player — so the whole post-bet surface is unreachable and the run measures nothing.
 * That is also why §2's 17/17 signed-out sweep was clean while the bug was real.
 * ⛔ ONE sign-in, reused across every cell (`loginOnce`): signing in per cell trips the
 * server's attempt limiting and reports product failures that are not.
 */
const WHO = process.env.AS ?? "alpha";
const CRASH = ["that page hit a snag", "encountered a problem", "ukurasa huu umekumbana"];
const VIEWS = ["cubes", "chart"];
// Swahili is the product default and the locale his handset is in; English too, in case a
// dictionary lookup is what throws.
const LOCALES = ["sw", "en"];

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
let crashes = 0, measured = 0;

console.log(`\nDriving ${URL_UNDER_TEST}`);
let state = null;
if (WHO !== "none") {
  try {
    state = await loginOnce(b, WHO);
    console.log(`signed in as ${WHO}`);
  } catch (e) {
    // ⛔ A failed sign-in and a broken login path look identical from out here, and a retry
    // loop locks the account for 30 minutes. Say so and carry on signed out, which at least
    // measures the chart path honestly.
    console.log(`⚠️ sign-in as ${WHO} FAILED (${e.message.split("\n")[0]}) — continuing signed OUT; the bet surface will not render`);
  }
}
console.log("");

for (const view of VIEWS) {
  for (const loc of LOCALES) {
    const ctx = await b.newContext({
      ...(state ? { storageState: state } : {}),
      viewport: { width: 390, height: 844 },
      isMobile: true, hasTouch: true, locale: loc === "sw" ? "sw-TZ" : "en-GB",
    });
    await ctx.addInitScript(([v, l]) => {
      try {
        localStorage.setItem("kp-updown-viz", v);
        localStorage.setItem("kp-locale", l);
      } catch { /* ignore */ }
    }, [view, loc]);

    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push({ msg: e.message, stack: e.stack }));
    page.on("console", (m) => { if (m.type() === "error") errs.push({ msg: `[console] ${m.text()}` }); });

    let status = 0;
    page.on("response", (r) => { if (r.url().split("?")[0] === URL_UNDER_TEST.split("?")[0]) status = r.status(); });

    try {
      await page.goto(URL_UNDER_TEST, { waitUntil: "domcontentloaded", timeout: 90_000 });
    } catch (e) {
      console.log(`  ${view}/${loc}: navigation failed — ${e.message.split("\n")[0]}`);
      await ctx.close();
      continue;
    }
    // Let hydration, the feed and the chart's async library chunk all land.
    await page.waitForTimeout(9000);

    const h1 = ((await page.locator("h1").first().textContent().catch(() => "")) ?? "").trim();
    const body = ((await page.locator("body").textContent().catch(() => "")) ?? "").toLowerCase();
    const cards = await page.locator(".btn-yes, .btn-no").count();
    const canvases = await page.locator("canvas").count();
    const crashed = CRASH.some((c) => body.includes(c));

    // ⛔ THE GATE. In cubes view `canvases` is legitimately 0; what must be non-empty is the
    // board itself. A run that rendered neither cards nor a crash measured nothing.
    const rendered = cards > 0 || crashed;
    if (rendered) measured++;
    if (crashed) crashes++;

    console.log(
      `  ${view}/${loc}: status=${status} h1=${JSON.stringify(h1.slice(0, 44))} ` +
      `betBtns=${cards} canvas=${canvases} exceptions=${errs.length} ` +
      `${crashed ? "🔴 CRASHED" : rendered ? "ok" : "⚠️ NOTHING RENDERED — measured nothing"}`,
    );
    for (const e of errs.slice(0, 4)) {
      console.log(`      ${e.msg}`);
      if (e.stack) console.log(String(e.stack).split("\n").slice(1, 5).map((l) => `        ${l.trim()}`).join("\n"));
    }
    await ctx.close();
  }
}

console.log(`\n${crashes} crash(es) · ${measured}/${VIEWS.length * LOCALES.length} runs actually measured something`);
if (measured === 0) console.log("⛔ NOTHING WAS MEASURED — treat this as a skipped run, not a pass.");
await b.close();
