/**
 * Post-deploy visual verification against the LIVE site.
 * Screenshots public surfaces at 360 + 1280, asserts no horizontal overflow,
 * no console/page errors, and — the point of this run — reads the COMPUTED
 * transition durations off real elements to prove the motion fix landed.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "https://50pick.tz";
const OUT = process.env.OUT || "./shots";
mkdirSync(OUT, { recursive: true });

const ROUTES = ["/", "/markets", "/live", "/results", "/leaderboard", "/proposals", "/help", "/fairness", "/auth/login", "/auth/register"];
const WIDTHS = [{ tag: "360", w: 360, h: 740 }, { tag: "1280", w: 1280, h: 800 }];

const browser = await chromium.launch();
let fails = 0;
const rows = [];

for (const r of ROUTES) {
  for (const bp of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: bp.w, height: bp.h } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
    page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 120)));

    let status = "?";
    try {
      const resp = await page.goto(BASE + r, { waitUntil: "networkidle", timeout: 45000 });
      status = resp ? resp.status() : "?";
      await page.waitForTimeout(700);
    } catch (e) {
      errs.push("NAV " + String(e).slice(0, 100));
    }

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ).catch(() => -1);

    const slug = r === "/" ? "home" : r.replace(/\//g, "-").replace(/^-/, "");
    await page.screenshot({ path: `${OUT}/${slug}-${bp.tag}.png`, fullPage: false }).catch(() => {});

    const bad = status !== 200 || overflow > 1 || errs.length > 0;
    if (bad) fails++;
    rows.push(`${bad ? "FAIL" : "ok  "}  ${r.padEnd(18)} @${bp.tag.padEnd(5)} http=${status} overflow=${overflow}px errs=${errs.length}${errs.length ? " :: " + errs[0] : ""}`);
    await ctx.close();
  }
}

// ---- The motion proof: computed durations on real live elements ----
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto(BASE + "/auth/login", { waitUntil: "networkidle", timeout: 45000 });
const motion = await page.evaluate(() => {
  const probe = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return `${sel}: NOT FOUND`;
    const cs = getComputedStyle(el);
    return `${sel}: transition-duration=${cs.transitionDuration} property=${cs.transitionProperty.slice(0, 60)}`;
  };
  const root = getComputedStyle(document.documentElement);
  return {
    easeMicro: root.getPropertyValue("--ease-micro").trim(),
    durMicro: root.getPropertyValue("--dur-micro").trim(),
    durStage: root.getPropertyValue("--dur-stage").trim(),
    input: probe("input"),
  };
});
await ctx.close();
await browser.close();

console.log("\n=== LIVE VISUAL CHECK: " + BASE + " ===");
console.log(rows.join("\n"));
console.log("\n=== MOTION TOKENS (computed, live) ===");
console.log("  --ease-micro =", motion.easeMicro || "(empty)");
console.log("  --dur-micro  =", motion.durMicro || "(empty)");
console.log("  --dur-stage  =", motion.durStage || "(empty)");
console.log("  " + motion.input);
console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILED"} — ${rows.length} route/width cells, shots in ${OUT}`);
process.exit(fails === 0 ? 0 : 1);
