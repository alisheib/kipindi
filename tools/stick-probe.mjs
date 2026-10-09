// stick-probe — WHY a filter bar "did not stick" in qa:bar-geometry (scrollTo 1200 at 1280×900): the bar's own box, its
// parent's box and the document's height after the scroll, so a bar pushed off by the END OF ITS PARENT on a thin page
// is told from a bar that never sticks. Classic shell (no pass), as qa:bar-geometry measures, the demo player, sw/en/zh.
//   LIVE_BASE=http://localhost:3074 node stick-probe.mjs <label>
import { pathToFileURL } from "node:url";
const label = process.argv[2] ?? "tree";
const R = "F:/kipindi-a8i2-ctl/scripts/live/";
const { browser, BASE } = await import(pathToFileURL(R + "harness.mjs").href);
const { b } = await browser();
const ROUTES = ["/results", "/notifications", "/markets"];
console.log(`stick-probe · ${label} · ${BASE}`);
for (const locale of ["sw", "en", "zh"]) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.request.get(`${BASE}/auth/demo`);
  await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
  const page = await ctx.newPage();
  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: "load" }).catch(() => {});
    await page.waitForTimeout(800);
    const before = await page.evaluate(() => {
      const bar = document.querySelector("[data-filter-rail]");
      return bar ? { top: Math.round(bar.getBoundingClientRect().top) } : null;
    });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(450);
    const m = await page.evaluate(() => {
      const bar = document.querySelector("[data-filter-rail]");
      if (!bar) return null;
      const rb = bar.getBoundingClientRect();
      const par = bar.parentElement;
      const rp = par.getBoundingClientRect();
      const main = document.querySelector("main");
      const rm = main ? main.getBoundingClientRect() : null;
      const cs = getComputedStyle(bar);
      return {
        scrollY: Math.round(window.scrollY), docH: document.documentElement.scrollHeight, vh: innerHeight,
        bar: { top: Math.round(rb.top), h: Math.round(rb.height), position: cs.position, stickyTop: cs.top },
        parent: { tag: par.tagName.toLowerCase(), cls: String(par.className).slice(0, 60), top: Math.round(rp.top), bottom: Math.round(rp.bottom) },
        main: rm ? { bottom: Math.round(rm.bottom) } : null,
        roomInParentBelowBar: Math.round(rp.bottom - rb.bottom),
      };
    });
    console.log(`  ${locale} ${r.padEnd(14)} natural top ${before?.top ?? "—"} · ${m ? `scrollY ${m.scrollY}/${m.docH - m.vh} · bar top ${m.bar.top} (h ${m.bar.h}, ${m.bar.position} ${m.bar.stickyTop}) · parent <${m.parent.tag} ${m.parent.cls}> ${m.parent.top}→${m.parent.bottom} · main bottom ${m.main?.bottom} · room below bar in parent ${m.roomInParentBelowBar}` : "no [data-filter-rail]"}`);
  }
  await ctx.close();
}
await b.close();
process.exit(0);
