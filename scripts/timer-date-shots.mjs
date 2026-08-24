/**
 * THE DATE BESIDE EVERY TIMER, DRIVEN ON THE REAL PRODUCT — Jay (Gaming Board) item #6.
 *
 *   npm run qa:timer-date                        # against production
 *   BASE=http://localhost:3000 npm run qa:timer-date
 *
 * `test:timer-date` proves the RULE and the CALL SITES. Neither can tell you the date is
 * legible in Swahili at 360, or that it names the right deadline once React has rendered
 * it. This drives two real LIVE markets at five widths in three languages and LOOKS.
 *
 * ⭐ THE TWO MARKETS ARE CHOSEN SO THE PAGE CARRIES ITS OWN CONTROL.
 * `mkt_73407e3296dc0d950b2c` closes selection on 25 Dec 2026 and resolves on 1 Jan 2027
 * ON THE PLATFORM CLOCK — so ONE page must show a date with NO year above a date WITH one.
 * A check that only ever saw cross-year dates could be satisfied by a formatter that always
 * prints the year; this one cannot. The second market is same-year on both clocks, so the
 * absence of a year is asserted where a year would be wrong.
 *
 * 🔴 AND THE FIXTURE ITSELF IS THE LESSON. Both of the first market's instants are stored
 * as 2026 in UTC; the resolve one is 2026-12-31T21:00Z, which is 1 Jan 2027 in Dar. A
 * fixture read off the stored value expects NO year and fails against a correct page —
 * which is exactly what happened while this file was being written, and exactly the error
 * `formatDeadline` exists to prevent. Postgres's `naive AT TIME ZONE 'EAT'` INTERPRETS a
 * naive column as EAT wall time rather than converting it, so a census written that way
 * undercounts the boundary cases: it reported 3 cross-year markets where there are 7.
 *
 * ⭐ AND IT ASSERTS THE INSTANT, NOT THE PRESENCE. The rendered date is a `<time>` whose
 * `dateTime` is the very value the clock counts down to, so this reads that attribute and
 * compares it against the deadline the DATABASE holds. A date that is present, correctly
 * formatted, correctly zoned and about the OTHER deadline reads as completely right to a
 * human, and is the defect worth catching.
 *
 * ⛔ OVERFLOW IS NOT REACHABILITY. `scrollWidth - clientWidth` reads 0 on this app because
 * `body` has `overflow-x: clip` (E-190), so the document never learns it was too wide. The
 * reachability rule is IMPORTED from `clip.mjs` rather than re-derived — a hand-rolled one
 * reported 10 failures that were `LanguageMenu`'s closed `<details>` rows, an exemption
 * `clip.mjs` had already paid ~200 false failures per surface to learn.
 *
 * ⚠️ NEVER `domcontentloaded` AND NEVER `.catch(() => "")`. Against production the first
 * returns while the route's skeleton is still on screen, and the second turns a real
 * failure into a silent pass. This waits for the element it is about to read, and throws
 * when the premise is absent rather than reporting green over nothing.
 *
 * ⚠️ 360 IS NOT OPTIONAL AND NEITHER IS ZH.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { clippedControls } from "./live/clip.mjs";

const BASE = process.env.BASE || "https://50pick.tz";
const WIDTHS = (process.env.WIDTHS || "360,393,768,1024,1280").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "en,sw,zh").split(",");
const SHOTS = ".50pick-shots";
mkdirSync(SHOTS, { recursive: true });

/**
 * The two markets, with the deadlines the DATABASE holds at the time this was written.
 * ⚠️ These are real LIVE markets and their deadlines are facts, not fixtures. If one is
 * resolved or re-dated the run REFUSES rather than quietly checking nothing — see the
 * premise guard below.
 */
const CASES = [
  {
    id: "mkt_73407e3296dc0d950b2c",
    label: "the New Year boundary itself — selection 25 Dec 2026, resolution 1 Jan 2027 EAT",
    // DOM order: the selection clock renders before the resolve clock.
    // ⚠️ BOTH STORED INSTANTS ARE IN 2026 UTC. The resolve one is 2026-12-31T21:00Z, which
    // is 1 Jan 2027 00:00 on the platform clock — so the year appears because of the ZONE,
    // not because of the stored date. A fixture chosen off the UTC value would have
    // expected no year here and failed against a correct page.
    expect: [
      { iso: "2026-12-24T21:00:00.000Z", year: false },
      { iso: "2026-12-31T21:00:00.000Z", year: true },
    ],
  },
  {
    id: "mkt_bbfea27300582e4e50d2",
    label: "same-year — both clocks in Dec 2026 EAT, so neither may carry a year",
    expect: [
      { iso: "2026-12-03T21:00:00.000Z", year: false },
      { iso: "2026-12-06T21:00:00.000Z", year: false },
    ],
  },
];

let pass = 0;
const fails = [];
const ok = (n, c, e = "") => { if (c) pass++; else { fails.push(`${n}${e ? ` — ${e}` : ""}`); console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const host = new URL(BASE).hostname;
const browser = await chromium.launch();
console.log(`driving ${BASE} · ${WIDTHS.length} widths × ${LOCALES.length} locales × ${CASES.length} markets\n`);

for (const locale of LOCALES) {
  const ctx = await browser.newContext();
  // ⛔ The locale comes from the `kp-locale` COOKIE — there is no /api/locale route (E-106).
  // Set it on the CONTEXT so it is present on the very first request.
  await ctx.addCookies([{ name: "kp-locale", value: locale, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90_000);
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));

  for (const c of CASES) {
    for (const w of WIDTHS) {
      const cell = `[${locale} ${w} ${c.id.slice(0, 12)}]`;
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(`${BASE}/markets/${c.id}`, { waitUntil: "load" });

      // ⛔ REFUSE ON A MISMATCHED LANGUAGE. A sweep that silently shoots the wrong
      // language is worse than one that fails, because its output looks like evidence.
      const lang = await page.getAttribute("html", "lang");
      if (lang !== locale) { fails.push(`${cell} <html lang> is "${lang}", expected "${locale}" — refusing to capture`); console.log(`FAIL ${cell} lang=${lang}`); continue; }

      // Wait for the thing we are about to read. Not domcontentloaded, and no .catch("").
      const dates = page.locator('time[data-testid="timer-date"]');
      try {
        await dates.first().waitFor({ state: "visible", timeout: 45_000 });
      } catch {
        fails.push(`${cell} no timer date rendered at all — the premise is absent, refusing to pass`);
        console.log(`FAIL ${cell} no timer-date`);
        continue;
      }

      const n = await dates.count();
      ok(`${cell} both clocks name their instant`, n === c.expect.length, `found ${n}`);
      if (n !== c.expect.length) continue;

      for (const [i, want] of c.expect.entries()) {
        const el = dates.nth(i);
        const dt = await el.getAttribute("datetime");
        const text = (await el.innerText()).trim();

        // ⭐ THE INSTANT, not the presence: the date must be about the deadline the
        // database holds for THIS clock.
        ok(`${cell} date ${i} names the real deadline`,
           dt != null && Date.parse(dt) === Date.parse(want.iso), `dateTime=${dt} expected=${want.iso}`);

        // ⭐ THE YEAR RULE, seen on the rendered page rather than in a unit.
        const hasYear = /\b20\d\d\b/.test(text);
        ok(`${cell} date ${i} ${want.year ? "carries" : "omits"} the year`,
           hasYear === want.year, `rendered "${text}"`);

        // A timestamp may never be clipped (DESIGN_AUTHORITY §A5).
        const box = await el.boundingBox();
        ok(`${cell} date ${i} is on screen`, !!box && box.x >= 0 && box.x + box.width <= w + 0.5,
           box ? `x=${box.x.toFixed(0)} w=${box.width.toFixed(0)} vw=${w}` : "no box");
        const cut = await el.evaluate((e) => e.scrollWidth - e.clientWidth);
        ok(`${cell} date ${i} is not truncated`, cut <= 1, `${cut}px hidden`);
      }

      // The imported reachability rule, over the countdown panel's own scope.
      const clipped = await clippedControls(page, "main");
      ok(`${cell} nothing in main is unreachable`, clipped.length === 0,
         clipped.slice(0, 3).map((x) => `${x.tag}@${Math.round(x.left)}`).join(", "));

      await page.screenshot({ path: `${SHOTS}/timer-date-${locale}-${w}-${c.id.slice(4, 12)}.png`, fullPage: false });
    }
  }
  ok(`[${locale}] no console errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\ntimer-date shots: ${pass} passed, ${fails.length} failed`);
if (fails.length) { console.log("\nFAILURES:"); fails.forEach((f) => console.log("  ✗ " + f)); process.exit(1); }
console.log(`frames in ${SHOTS}/ — LOOK at them; a count is not a look.`);
