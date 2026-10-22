/**
 * qa:journey-rail-gaps — ON THE FIVE-TAB JOURNEY RAIL NO TWO LABELS STAND CLOSER THAN THEIR PIPS (MASWALI-BUILD
 * S5-FIX-PLATFORM D14, 2026-10-21; `test:visual-pass-r9c` §4c holds the stylesheet with §4's width model).
 *
 *   FEATURE_SIMPLEJOURNEY=ACTIVE (and FEATURE_MILLIONEA=ACTIVE for the five tabs) on a running server, then:
 *   BASE=http://localhost:3501 node scripts/qa-journey-rail-gaps.mjs [outDir]       (WIDTHS=320,333,… to choose widths)
 *
 * For sw, en and zh at each width (default 320, 336, 337, 360, 390, 412): a guest's journey home, the rail's labels'
 * INK as Chromium draws it with the real fonts (a Range over each label's text, the union of its lines), every neighbour
 * pair's gap, the tracking each label wears, and a shot of the rail (outDir, default .qa-artifacts/journey-rail-gaps/).
 * A five-tab cell fails under MIN (8px: the 56px pips' own gap in a fifth of 320). A four-tab cell is measured and
 * printed, never failed: that rail is what every reader is served while Millionea is withdrawn, which D14 does not touch
 * (its Swahili "Juu na Chini" | "Tiketi zangu" stand 4px apart at 333 — a reported platform item).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.argv[2] ?? join(process.cwd(), ".qa-artifacts", "journey-rail-gaps"));
const MIN = Number(process.env.MIN || 8);
const WIDTHS = (process.env.WIDTHS || "320,336,337,360,390,412").split(",").map(Number);
mkdirSync(OUT, { recursive: true });
const rows = [];
let bad = 0;
const browser = await chromium.launch();
try {
  for (const l of ["en", "sw", "zh"]) {
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 780 }, extraHTTPHeaders: { "accept-language": l } });
      await ctx.addCookies([{ name: "kp-locale", value: l, url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
      await page.evaluate(() => document.fonts?.ready).catch(() => {});
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const rail = document.querySelector("nav.kp-rail--journey");
        if (!rail) return null;
        const labels = [...rail.querySelectorAll(".kp-rail__label")];
        const ink = labels.map((el) => {
          const r = document.createRange();
          r.selectNodeContents(el);
          const rects = [...r.getClientRects()].filter((x) => x.width > 0);
          return {
            text: el.textContent?.trim(),
            left: Math.min(...rects.map((x) => x.left)),
            right: Math.max(...rects.map((x) => x.right)),
            lines: new Set(rects.map((x) => Math.round(x.top))).size,
            ls: getComputedStyle(el).letterSpacing,
          };
        });
        const gaps = ink.slice(1).map((b, i) => Math.round((b.left - ink[i].right) * 10) / 10);
        return { tabs: rail.getAttribute("data-tabs") ?? String(labels.length), ink, gaps };
      });
      const least = m ? Math.min(...m.gaps) : NaN;
      const problems = !m ? ["no journey rail"] : m.tabs === "5" && !(least >= MIN - 0.05) ? [`least gap ${least}px < ${MIN}`] : [];
      if (problems.length) bad++;
      const box = await page.locator("nav.kp-rail--journey").boundingBox().catch(() => null);
      if (box) await page.screenshot({ path: join(OUT, `rail-${l}-${w}.png`), clip: { x: 0, y: Math.max(0, box.y - 4), width: w, height: box.height + 8 } });
      rows.push({ l, w, tabs: m?.tabs, least, gaps: m?.gaps, ls: m?.ink.map((x) => x.ls), words: m?.ink.map((x) => `${x.text}${x.lines > 1 ? ` (${x.lines} lines)` : ""}`), problems });
      console.log(`${problems.length ? "FAIL" : "ok  "} ${l} ${w} tabs ${m?.tabs} least ${least} gaps ${JSON.stringify(m?.gaps)} tracking ${JSON.stringify([...new Set(m?.ink.map((x) => x.ls))])} ${problems.join("; ")}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
writeFileSync(join(OUT, "results.json"), JSON.stringify(rows, null, 1));
console.log(`\nqa:journey-rail-gaps: ${rows.length} cells, ${bad} five-tab cell(s) under ${MIN}px (shots in ${OUT})`);
process.exitCode = bad ? 1 : 0;
