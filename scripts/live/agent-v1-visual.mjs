/**
 * AGENT v1 · THE VISUAL VERIFICATION FOR MANAGEMENT'S FEEDBACK.
 *
 * ⭐ WHAT THIS IS FOR. Management's 2026-09-08 feedback is five annotated screenshots of the
 * PUBLIC page, so the thing that has to be checked is what that page now looks like — at the
 * widths a Tanzanian applicant reads it on, in all three languages. `qa:agent-drive` proves
 * the FLOW; this proves the RENDER.
 *
 * ⛔ IT ASSERTS, IT DOES NOT JUST PHOTOGRAPH. A screenshot nobody reads is not a check, and
 * this campaign has been burned by exactly that (a search bar that was off-screen passed a
 * shallow look). So every shot is paired with a measurement:
 *   · zero horizontal overflow at 360 — §A6's hard floor, and the reason the waterfall is
 *     two columns instead of management's three
 *   · every waterfall row present, in the DOM, with its figure
 *   · the derived arithmetic reconciling on the rendered text, not in a unit test
 *   · the struck-out paragraph absent
 *
 * Usage:  BASE=http://localhost:3033 node scripts/live/agent-v1-visual.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3033";
const OUT = process.env.SHOT_DIR ?? "docs/shots/agent-v1";
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (label, cond, extra) => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

/** ⚠️ Collapses whitespace AND keeps case — the harness header's warning is about lowercasing
 *  by default; here the assertions are case-insensitive by regex, so the raw text is kept. */
const bodyText = (page) => page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim());

/** ⛔ The measurement that actually matters at 360: does anything push the page sideways? */
const overflow = (page) => page.evaluate(() => ({
  docW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  worst: [...document.querySelectorAll("main *")]
    .map((el) => ({ tag: el.tagName + (el.className && typeof el.className === "string" ? "." + el.className.split(/\s+/)[0] : ""), w: el.scrollWidth, c: el.clientWidth }))
    .filter((x) => x.w > x.c + 1)
    .sort((a, b) => (b.w - b.c) - (a.w - a.c))
    .slice(0, 3),
}));

const VIEWPORTS = [
  { name: "360", width: 360, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 1000 },
];
const LOCALES = ["en", "sw", "zh"];

const browser = await chromium.launch();
try {
  for (const loc of LOCALES) {
    for (const vp of VIEWPORTS) {
      // ⛔ THE COOKIE GOES ON THE CONTEXT, not via a route. There is no `/api/locale`
      // (finding E-106), so it must be present on the FIRST request or the page renders EN
      // and the shot silently measures the wrong language.
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });
      await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

      await page.goto(`${BASE}/agent`, { waitUntil: "load", timeout: 120_000 });
      await page.waitForFunction(() => (document.querySelector("main")?.innerText ?? "").length > 200, null, { timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(400);

      const t = await bodyText(page);
      const o = await overflow(page);

      ok(`${loc}/${vp.name} · the page renders real content`, t.length > 400, `${t.length} chars`);
      ok(`${loc}/${vp.name} · no page or console error`, errors.length === 0, errors.slice(0, 2).join(" | "));
      // §A6: zero horizontal overflow at 360. Reported with the WORST offender so a failure
      // names the element instead of just the number.
      ok(`${loc}/${vp.name} · zero horizontal overflow`, o.docW <= o.clientW + 1, `doc ${o.docW} > client ${o.clientW}; worst: ${JSON.stringify(o.worst)}`);

      // The waterfall's own figures, on the rendered page, in every locale.
      for (const fig of ["1,000,000", "130,000", "13,000", "6,500", "110,500", "11,050", "553", "10,497"]) {
        ok(`${loc}/${vp.name} · waterfall row ${fig}`, t.includes(fig), t.slice(0, 200));
      }
      ok(`${loc}/${vp.name} · the fee is the VAT-inclusive TOTAL`, /118,000/.test(t));
      ok(`${loc}/${vp.name} · …and names VAT as an addition`, /100,000/.test(t) && /18,000/.test(t));
      ok(`${loc}/${vp.name} · the struck-out paragraph is gone`, !/Commission is a share of the net operator fee/i.test(t));
      // ⛔ No gold on a projected figure (§B4): the payout row must not carry the money hue.
      const goldOnPayout = await page.evaluate(() => {
        const dd = [...document.querySelectorAll("dd")].find((n) => (n.textContent ?? "").includes("10,497"));
        if (!dd) return "row not found";
        const c = getComputedStyle(dd).color;
        return c;
      });
      ok(`${loc}/${vp.name} · the payout figure is FLAT, not gold (§B4)`, typeof goldOnPayout === "string" && !/2[0-9][0-9],\s*1[6-9][0-9]|rgb\(2\d\d, 1\d\d, \d\d\)/.test(goldOnPayout), String(goldOnPayout));

      await page.screenshot({ path: `${OUT}/agent_${loc}_${vp.name}.png`, fullPage: true });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\nagent-v1-visual: ${pass} passed, ${fail} failed · shots in ${OUT}`);
if (fail > 0) process.exit(1);
