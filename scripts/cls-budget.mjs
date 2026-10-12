/**
 * PROVE the layout-shift budget this plan sets for itself — and prove it can still FAIL.
 *
 *   npm run qa:cls-budget -- https://www.50pick.tz
 *   RED_SHELL=1 npm run qa:cls-budget -- <base>    the pre-fix shell is served back
 *   npm run qa:cls-budget -- http://localhost:<port> --journey             the new journey, through a staff pass
 *   RED_SHELL=1 npm run qa:cls-budget -- http://localhost:<port> --journey the same control, in journey mode
 *
 * §9 U25's accept line: **CLS ≤ 0.05 per route, and no single shift > 0.02**, un-input only.
 *
 * ── WHY THIS HAS TO LOAD THE PAGE SLOWLY ─────────────────────────────────────────────────
 * A layout shift is a thing that happens BETWEEN frames while content arrives. On a fast
 * connection the whole page lands in one frame and every route scores a perfect zero — which
 * is exactly what a settled-page check would have reported all year while production shipped
 * 0.1594. The network and CPU are throttled to a slow-4G Android on purpose: the budget is
 * about what a real player on a real connection sees, not about what a developer sees.
 *
 * ⛔ AND IT MEASURES THE SOURCES, NOT JUST THE TOTAL. A total says "something moved"; the
 * source rect says WHAT moved and from where, which is the only form of this number anyone can
 * act on. D26 was `{0, 656, 360, 124} -> {0,0,0,0}` — the 18+ licence footer sitting inside a
 * 780px viewport at first paint and then being thrown off it, byte-identical on three routes,
 * which is what identified it as the SHELL and not any page.
 *
 * 🔴 TWO THINGS THIS DRIVER CANNOT SEE, AND BOTH WERE LIVE ON 2026-09-24. Neither is a bug
 * in the code below; both are consequences of what it chose to measure, and `qa:ghost-landing`
 * exists to cover them. Do not read a green run here as "nothing moves".
 *
 *   1. IT OPENS EVERY ROUTE WITH `reducedMotion: "reduce"` — right for a stable screenshot, and
 *      it turns OFF `/live`'s featured carousel, whose `useEffect` returns early under reduced
 *      motion. That carousel auto-advanced every 6s and the hero was exactly as tall as whichever
 *      question was up, so the grid below it moved by 95px on a timer: **0.0796 un-input CLS over
 *      45s of sitting still**. This driver switched the defect off and then reported it could not
 *      find one.
 *   2. IT NAVIGATES, SO IT NEVER SEES A SKELETON. `loading.tsx` renders only on a CLIENT-SIDE
 *      hop; a hard `goto` streams the real page. And `layout-shift` counts only nodes present
 *      BEFORE and AFTER a frame — a ghost is REMOVED and different nodes appear — so a skeleton
 *      can promise the board half a screen from where it lands and score a clean 0.0000. It did:
 *      `/live` was out by 538px, `/markets` by 239px, both at CLS 0.0000.
 *
 * ── --journey (the Vodacom plan S7, S7-PLAN WP11 step 2) ────────────────────────────────────
 * The same budget for the NEW JOURNEY, which only a request holding a preview pass is shown: LOCAL ONLY, behind
 * `live/journey-pass.mjs`'s `premise` (an in-memory `http://localhost:PORT` server whose rollout a pass can see, run with
 * DISABLE_ADMIN_TOTP=true so the preview door mints a pass). The pass is minted the way an officer mints one, and every
 * cell carries it: a guest on `/`, `/live` and `/results`, and the demo player on those and `/watchlist`, in Swahili at
 * 360×780. The board is seeded first through the product's own dev doors (the catalogue, the demo player's portfolio —
 * real bets, sales, settlements and a void, so `/results` has settled cards — and their stars), so every page is long
 * enough to exercise a load shift. ⛔ A cell is counted only on a JOURNEY page: the journey header must be there once the
 * page has loaded, or the cell FAILS as not measured (a page the pass did not reach would read as a calm classic page).
 * The red control is the same RED_SHELL, which must fail here too.
 *
 * ⛔ THE RED CONTROL REWRITES THE SERVED STYLESHEET rather than injecting a tag. An injected
 * `<style>` at document-start was tried and did NOT take — the parser builds `<head>` after it
 * and the rule was lost, so the "RED" run scored the same as the green one and would have
 * certified nothing. Patching the CSS response is the only version that actually serves the
 * pre-fix shell.
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";
import { premise, mintStaffPass, demoSession } from "./live/journey-pass.mjs";

// NO PRODUCTION DEFAULT (live-target-safe.test.mjs §1b). This used to fall back to the live site, so a run with no
// target measured production without anyone choosing it. Loopback is the default now; production is reached by
// NAMING it, as the examples at the top do.
const JOURNEY = process.argv.includes("--journey");
const ARGS = process.argv.slice(2).filter((a) => a !== "--journey");
const BASE = ARGS[0] || process.env.BASE || "http://localhost:3001";
const RED = process.env.RED_SHELL === "1";
/**
 * The three routes whose shift was measured and fixed. ⚠️ A second argument replaces them —
 *   npm run qa:cls-budget -- <base> "/live,/watchlist"
 * — because a budget that can only ever be asked about three pages is not a budget for the
 * product. On Git Bash prefix the command with `MSYS_NO_PATHCONV=1`, or a leading `/` is
 * rewritten into a Windows path before node ever sees it.
 */
const ROUTES = (ARGS[1] || (JOURNEY ? "/,/live,/results,/watchlist" : "/,/markets,/results")).split(",").map((r) => r.trim()).filter(Boolean);
const BUDGET = 0.05;
const SINGLE = 0.02;

const failures = [];
/** The failures that are a shift over a budget: in RED mode only these prove the control. */
let shiftFailures = 0;
const b = await chromium.launch();

/**
 * --journey's readers: a guest and the demo player, each holding the staff pass. Classic mode has one reader, with no
 * cookie of its own. ⛔ The signed-in reader's /watchlist is edge-protected, so a guest never reads it.
 */
const READERS = [];
if (JOURNEY) {
  const pre = await premise(BASE);
  if (pre.refuse) {
    console.error(`REFUSED — ${pre.refuse}`);
    await b.close();
    process.exit(2);
  }
  const pass = await mintStaffPass(b, BASE);
  const session = await demoSession(b, BASE);
  // The board, the demo player's settled tickets and their stars, through the product's own dev doors.
  const seedCtx = await b.newContext();
  await seedCtx.addCookies([session]);
  for (const [route, data] of [["seed-markets", {}], ["seed-player-portfolio", { markets: 12 }], ["seed-watchlist", {}]]) {
    const r = await seedCtx.request.post(`${BASE}/api/dev-test/${route}`, { data, timeout: 240_000 });
    const body = await r.json().catch(() => null);
    if (!r.ok() || body?.ok === false) {
      console.error(`REFUSED — /api/dev-test/${route} answered ${r.status()} ${JSON.stringify(body)?.slice(0, 160)}: the board was not seeded, so no cell would exercise a load shift`);
      await b.close();
      process.exit(2);
    }
  }
  await seedCtx.close();
  READERS.push({ who: "guest", cookies: [pass], routes: ROUTES.filter((r) => r !== "/watchlist") });
  READERS.push({ who: "player", cookies: [pass, session], routes: ROUTES });
} else {
  READERS.push({ who: "", cookies: [], routes: ROUTES });
}

for (const reader of READERS) for (const path of reader.routes) {
  const ctx = await localisedContext(b, { locale: "sw", width: 360, height: 780, baseUrl: BASE, reducedMotion: "reduce" });
  if (reader.cookies.length) await ctx.addCookies(reader.cookies);
  const p = await ctx.newPage();
  const cell = reader.who ? `${reader.who} ${path}` : path;

  if (RED) {
    // serve the shell exactly as it was before D26: main content-sized, and the rhythm back on
    // a sibling selector that a streaming boundary marker can misplace.
    await p.route(/\/_next\/static\/.*\.css(\?.*)?$/, async (route) => {
      const res = await route.fetch();
      let css = await res.text();
      // Minified (a production build) or not (a local dev server, --journey's), the same rule: whitespace is allowed.
      css = css.replace(/#main-content\s*\{\s*min-height:\s*100svh;?\s*\}/g, "#main-content{min-height:auto}");
      css += "\n.flex.flex-col.gap-5{display:block;gap:0}\n.flex.flex-col.gap-5>:not([hidden])~:not([hidden]){margin-top:24px}\n";
      await route.fulfill({ response: res, body: css, headers: { ...res.headers(), "content-length": String(Buffer.byteLength(css)) } });
    });
  }

  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await p.addInitScript(() => {
    window.__cls = 0;
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls += e.value;
        for (const s of e.sources || []) {
          const n = s.node;
          window.__shifts.push({
            v: Number(e.value.toFixed(6)),
            el: n ? (n.tagName || "") + "." + (typeof n.className === "string" ? n.className.split(" ").slice(0, 3).join(".") : "") : "(no node)",
            prev: s.previousRect ? `{${Math.round(s.previousRect.x)},${Math.round(s.previousRect.y)},${Math.round(s.previousRect.width)},${Math.round(s.previousRect.height)}}` : "?",
            cur: s.currentRect ? `{${Math.round(s.currentRect.x)},${Math.round(s.currentRect.y)},${Math.round(s.currentRect.width)},${Math.round(s.currentRect.height)}}` : "?",
          });
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await p.goto(BASE + path, { waitUntil: "load", timeout: 180000 });
  await p.waitForTimeout(6000);
  await assertLang(p, "sw");
  if (JOURNEY && !(await p.locator('header[data-testid="journey-top-bar"]').count())) {
    failures.push(`${cell} is not a journey page (no journey header once loaded): NOT MEASURED`);
    console.log(`  ${cell.padEnd(18)} NOT MEASURED — no journey header`);
    await ctx.close();
    continue;
  }

  const r = await p.evaluate(() => {
    const main = document.querySelector("main");
    return {
      cls: Number((window.__cls || 0).toFixed(4)),
      shifts: (window.__shifts || []).sort((a, z) => z.v - a.v),
      mainMinH: main ? getComputedStyle(main).minHeight : "?",
      docH: document.documentElement.scrollHeight,
    };
  });

  // ⛔ a route that never grew did not exercise the thing being measured
  if (r.docH < 1200) failures.push(`${cell} the document is only ${r.docH}px — too short to have exercised a load shift`);
  if (r.cls > BUDGET) { failures.push(`${cell} CLS ${r.cls} over the ${BUDGET} budget`); shiftFailures++; }
  const worst = r.shifts[0];
  if (worst && worst.v > SINGLE) { failures.push(`${cell} one shift of ${worst.v} (over ${SINGLE}) — ${worst.el} ${worst.prev} -> ${worst.cur}`); shiftFailures++; }
  console.log(`  ${cell.padEnd(18)} CLS ${String(r.cls).padEnd(7)} worst ${worst ? worst.v + " " + worst.el : "none"}  (main min-height ${r.mainMinH}, doc ${r.docH}px)`);
  await ctx.close();
}
await b.close();

console.log(`\ncls budget — ${JOURNEY ? "the new journey, through a staff pass — " : ""}${RED ? "RED (pre-fix shell served back)" : "GREEN"} — ${BASE}`);
if (failures.length) for (const f of failures) console.log("  FAIL " + f);
else console.log("  no failures");

if (RED) {
  // ⛔ ONLY A SHIFT FAILURE IS THE CONTROL WORKING (review of WP11, note 6). A cell NOT MEASURED (the pass did not hold) or
  // a document too short is a failure of the run, not proof that the budget can catch the pre-fix shell.
  if (!shiftFailures) {
    console.error(`\n🔴 BROKEN HARNESS — the pre-fix shell was served and no cell went over a budget${failures.length ? ` (${failures.length} other failure(s), none a shift)` : ""}.\n   This check proves nothing; fix the check before trusting any green run of it.`);
    process.exit(2);
  }
  console.log(`\nRED control behaved: ${shiftFailures} shift failure(s) of ${failures.length}, as required.`);
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
