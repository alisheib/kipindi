/**
 * PROVE the layout-shift budget this plan sets for itself — and prove it can still FAIL.
 *
 *   npm run qa:cls-budget -- https://www.50pick.tz
 *   RED_SHELL=1 npm run qa:cls-budget -- <base>    the pre-fix shell is served back
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
 * ⛔ THE RED CONTROL REWRITES THE SERVED STYLESHEET rather than injecting a tag. An injected
 * `<style>` at document-start was tried and did NOT take — the parser builds `<head>` after it
 * and the rule was lost, so the "RED" run scored the same as the green one and would have
 * certified nothing. Patching the CSS response is the only version that actually serves the
 * pre-fix shell.
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || process.env.BASE || "https://www.50pick.tz";
const RED = process.env.RED_SHELL === "1";
const ROUTES = ["/", "/markets", "/results"];
const BUDGET = 0.05;
const SINGLE = 0.02;

const failures = [];
const b = await chromium.launch();

for (const path of ROUTES) {
  const ctx = await localisedContext(b, { locale: "sw", width: 360, height: 780, baseUrl: BASE, reducedMotion: "reduce" });
  const p = await ctx.newPage();

  if (RED) {
    // serve the shell exactly as it was before D26: main content-sized, and the rhythm back on
    // a sibling selector that a streaming boundary marker can misplace.
    await p.route(/\/_next\/static\/.*\.css(\?.*)?$/, async (route) => {
      const res = await route.fetch();
      let css = await res.text();
      css = css.replace(/#main-content\{min-height:100svh\}/g, "#main-content{min-height:auto}");
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
  if (r.docH < 1200) failures.push(`${path} the document is only ${r.docH}px — too short to have exercised a load shift`);
  if (r.cls > BUDGET) failures.push(`${path} CLS ${r.cls} over the ${BUDGET} budget`);
  const worst = r.shifts[0];
  if (worst && worst.v > SINGLE) failures.push(`${path} one shift of ${worst.v} (over ${SINGLE}) — ${worst.el} ${worst.prev} -> ${worst.cur}`);
  console.log(`  ${path.padEnd(10)} CLS ${String(r.cls).padEnd(7)} worst ${worst ? worst.v + " " + worst.el : "none"}  (main min-height ${r.mainMinH}, doc ${r.docH}px)`);
  await ctx.close();
}
await b.close();

console.log(`\ncls budget — ${RED ? "RED (pre-fix shell served back)" : "GREEN"} — ${BASE}`);
if (failures.length) for (const f of failures) console.log("  FAIL " + f);
else console.log("  no failures");

if (RED) {
  if (!failures.length) {
    console.error("\n🔴 BROKEN HARNESS — the pre-fix shell was served and the budget still PASSED.\n   This check proves nothing; fix the check before trusting any green run of it.");
    process.exit(2);
  }
  console.log(`\nRED control behaved: ${failures.length} failure(s), as required.`);
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
