/**
 * "THIS PAGE HAS ENCOUNTERED A PROBLEM — only on ONE phone; other phones work."
 *
 * Reported by Ali 2026-09-18 for the Up & Down markets. The board's chart remembers its
 * RANGE and STYLE **per device** in localStorage (`kp-updown-range` / `kp-updown-style`,
 * `updown-chart-lab.tsx`), and `terminal-chart.tsx` feeds those choices to
 * `setData()` after collapsing millisecond timestamps to whole seconds
 * (`at = Math.round(ms/1000)`). lightweight-charts requires STRICTLY ascending times and
 * throws `Assertion failed: data must be asc ordered by time` on a tie — which escapes the
 * effect, trips the route error boundary, and paints "That page hit a snag" for that viewer
 * and nobody else. A stored value is sticky, so the phone that holds it breaks on every visit.
 *
 * This walks the whole 7 × 2 matrix of stored values against a live board and reports which
 * combinations crash. Run it with a dev server up (see updown-404-local.mjs's header).
 *
 *   LOCAL_BASE=http://localhost:3017 node scripts/live/updown-chart-crash-matrix.mjs
 *   LOCAL_BASE=https://50pick.tz    node scripts/live/updown-chart-crash-matrix.mjs   # read-only
 *
 * ⛔ Judges by what the page SAYS (the error boundary's own heading) plus the captured
 * exception — never by HTTP status: a client-side crash is served as a 200.
 */
import { chromium } from "playwright";

const BASE = process.env.LOCAL_BASE ?? "http://localhost:3017";
const RANGES = ["15M", "30M", "1H", "6H", "12H", "24H", "7D"];
const STYLES = ["candles", "line"];
const PATHS = (process.env.ONLY_PATH ? [process.env.ONLY_PATH] : ["/updown", "/updown?asset=BTC"]);
const CRASH = ["that page hit a snag", "encountered a problem", "ukurasa huu"];

const b = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}),
});

let pass = 0; const fails = [];
function rec(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

console.log(`\nUp & Down chart crash matrix — ${BASE}\n`);

for (const path of PATHS) {
  for (const range of RANGES) {
    for (const style of STYLES) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
      // The phone's remembered choices, in place BEFORE the first render.
      // ⛔ `kp-updown-viz=chart` IS THE LOAD-BEARING ONE. `board-viz.tsx` mounts the chart
      // body ONLY while selected, so without it the terminal never mounts and the whole
      // matrix reports 28 cheerful passes having measured nothing (it did, once).
      await ctx.addInitScript(([r, s]) => {
        try {
          localStorage.setItem("kp-updown-viz", "chart");
          localStorage.setItem("kp-updown-range", r);
          localStorage.setItem("kp-updown-style", s);
        } catch { /* ignore */ }
      }, [range, style]);
      const p = await ctx.newPage();
      const errs = [];
      p.on("pageerror", (e) => errs.push(String(e.message || e).slice(0, 200)));
      p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
      try {
        await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        // The chart is lazy: it fetches its feed, then draws. Wait for the draw.
        await p.waitForTimeout(9_000);
        const seen = await p.evaluate(() => ({
          h1: (document.querySelector("h1")?.innerText || "").replace(/\s+/g, " ").trim(),
          body: (document.body.innerText || "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 400),
          canvases: document.querySelectorAll("canvas").length,
        }));
        const crashed = CRASH.find((c) => seen.h1.toLowerCase().includes(c) || seen.body.includes(c)) ?? null;
        const asc = errs.find((e) => /asc ordered by time|assertion failed/i.test(e)) ?? null;
        rec(
          `${path} · stored ${range}/${style} does not crash the page`,
          !crashed && !asc,
          crashed || asc
            ? `⛔ h1="${seen.h1}"${asc ? ` · ${asc}` : ""}`
            : `h1="${seen.h1}" canvases=${seen.canvases}${errs.length ? ` (other console noise: ${errs.length})` : ""}`,
        );
        // ⛔ THE POPULATION GATE. A pane that never drew cannot clear the chart of anything;
        // a silent "not applicable" reads exactly like a pass and is worse than a failure.
        if (!crashed) {
          rec(`${path} · stored ${range}/${style} ACTUALLY DREW the chart`, seen.canvases > 0,
            seen.canvases > 0 ? `${seen.canvases} canvases` : "no canvas — the verdict above measured nothing");
        }
      } catch (e) {
        rec(`${path} · stored ${range}/${style} does not crash the page`, false, `drive error: ${String(e.message).slice(0, 120)}`);
      } finally { await ctx.close(); }
    }
  }
}

await b.close();
console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length ? 1 : 0);
