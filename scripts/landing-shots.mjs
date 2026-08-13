// Visual + geometry sweep for the LANDING page (batches 2–3 of the round-2 design inheritance).
// Run: LOCALES=en,sw,zh npm run qa:landing-shots -- <outDir> [baseUrl]
// Shots are EVIDENCE and gitignored — write them under .qa-design-*/ (DESIGN_AUTHORITY §0b).
//
// WHY THIS EXISTS SEPARATELY FROM `qa:discovery-shots`. That driver carries the landing as one
// row with `rail:false`, which means it captures a fullPage frame and measures *nothing* on it —
// bar=-1, controls=0. A 360px fullPage shot of this page is ~6,000px tall, and a reviewer cannot
// read one. So this driver:
//
//   1. clips per BAND (`[data-band]`), so each frame is a thing a human can actually look at;
//   2. measures tap targets and clipping INSIDE each band against that band's own scrollWidth
//      (a child clipped by an intermediate row never reaches the document edge);
//   3. refuses to report a pass when it measured nothing — the /results failure shape. If
//      `BANDS=` names a band and the page does not carry it, that is a FAILURE, not a skip.
//
// ⛔ It never asserts a band is absent as a product defect unless it was TOLD to require it:
// an instrument naming a band that was renamed blames the product for the instrument's staleness.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const OUT = process.argv[2] || "./shots";
const BASE = process.argv[3] || "http://localhost:3009";
const LOCALES = (process.env.LOCALES || "en").split(",");
/** Bands that MUST exist. Empty = baseline mode (capture what is there, require nothing). */
const REQUIRED = (process.env.BANDS || "").split(",").map((s) => s.trim()).filter(Boolean);
/**
 * `AUTH=demo` mints a local player session before shooting.
 *
 * ⭐ WHY THIS IS HERE. The hero renders DIFFERENT CTAs to a signed-in player ("Browse markets" +
 * "My positions") than to a visitor ("Create account" + "Browse all N markets"), and the authed
 * branch had never been rendered even once — the whole batch was verified anonymous. A branch no
 * instrument can reach is a branch that ships unlooked-at. `/auth/demo` is dev-only (404 in
 * production), so this flag is silently useless against prod rather than dangerous: the assertion
 * below catches that instead of quietly shooting the anonymous page and labelling it authed.
 */
const AUTH = process.env.AUTH === "demo";
/**
 * ⛔ AN AUTHED PAGE NEVER REACHES `networkidle` ON THIS PLATFORM — measured 2026-08-13. With a
 * session, `app-shell` mounts `LazyEventStream` (a server-sent-events connection) and
 * `LazyNotifyPoller`, so there is ALWAYS an open request and every `goto` times out at 90s. The
 * anonymous sweep is unaffected, which is exactly why this went unnoticed until the authed hero was
 * shot for the first time. `load` is the correct signal here; the explicit settle wait below covers
 * the rest.
 */
const WAIT_UNTIL = AUTH ? "load" : "networkidle";

const WIDTHS = [
  { name: "360", w: 360, h: 780 },
  { name: "768", w: 768, h: 1024 },
  { name: "1280", w: 1280, h: 900 },
  { name: "1920", w: 1920, h: 1080 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const failures = [];
const rows = [];
let frames = 0;

for (const loc of LOCALES) {
  for (const vp of WIDTHS) {
    const ctx = await localisedContext(browser, { locale: loc, width: vp.w, height: vp.h, baseUrl: BASE });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
    });
    page.on("pageerror", (e) => consoleErrors.push("PAGEERROR " + String(e).slice(0, 200)));

    const tag = `${vp.name}-${loc}${AUTH ? "-authed" : ""}`;
    try {
      if (AUTH) {
        // Redirects to "/" carrying the session cookie.
        await page.goto(BASE + "/auth/demo", { waitUntil: WAIT_UNTIL, timeout: 90000 });
        // ⛔ REFUSE TO CONTINUE IF THE SESSION DID NOT TAKE. Otherwise this shoots the anonymous
        // hero and files it as authed evidence — the failure shape that made eight "trilingual"
        // frames English.
        const cookies = await ctx.cookies();
        if (!cookies.some((c) => c.name.includes("session") || c.name.startsWith("kp_"))) {
          throw new Error(`AUTH=demo set no session cookie (got: ${cookies.map((c) => c.name).join(",") || "none"}) — /auth/demo is 404 in production`);
        }
      }
      // Trap: first cold compile of a page under Turbopack is ~30s.
      const resp = await page.goto(BASE + "/", { waitUntil: WAIT_UNTIL, timeout: 90000 });
      const status = resp ? resp.status() : 0;
      // ⛔ Prove the page is in the language asked for BEFORE measuring or capturing anything.
      await assertLang(page, loc);
      await page.waitForTimeout(700);

      if (status !== 200) failures.push(`/ ${tag} -> HTTP ${status}`);

      // ── page-level geometry ────────────────────────────────────────────────────────────────
      const page_m = await page.evaluate(() => {
        const de = document.documentElement;
        return {
          overflowX: de.scrollWidth - de.clientWidth,
          height: de.scrollHeight,
          bands: [...document.querySelectorAll("[data-band]")].map((el) => el.getAttribute("data-band")),
        };
      });
      if (page_m.overflowX > 0) failures.push(`/ ${tag} -> overflowX ${page_m.overflowX}px`);

      // The above-the-fold frame is the one that decides whether a visitor stays.
      await page.screenshot({ path: `${OUT}/fold-${tag}.png`, fullPage: false });
      frames++;

      // FULL=1 adds the whole-page frame. It is the only way to see SECTION RHYTHM — whether the
      // bands read as a composed page or as a stack of unrelated boxes — which per-band clips
      // cannot show by construction. Off by default: at 360 this page is ~6,000px tall and a
      // reviewer cannot read one frame that size, which is why the sweep leads with fold + bands.
      if (process.env.FULL === "1") {
        await page.screenshot({ path: `${OUT}/full-${tag}.png`, fullPage: true });
        frames++;
      }

      for (const want of REQUIRED) {
        if (!page_m.bands.includes(want)) failures.push(`/ ${tag} -> required band "${want}" is ABSENT`);
      }

      // ── per-band clip + measurement ────────────────────────────────────────────────────────
      const bandNames = [...new Set(page_m.bands)];
      for (const b of bandNames) {
        const el = page.locator(`[data-band="${b}"]`).first();
        if (!(await el.count())) continue;
        try {
          await el.scrollIntoViewIfNeeded({ timeout: 5000 });
          await page.waitForTimeout(250);
          await el.screenshot({ path: `${OUT}/band-${b}-${tag}.png` });
          frames++;
        } catch (e) {
          failures.push(`/ ${tag} band=${b} -> could not clip: ${String(e.message).slice(0, 90)}`);
        }

        const m = await page.evaluate((band) => {
          const root = document.querySelector(`[data-band="${band}"]`);
          if (!root) return null;
          /** Enough to FIND the node again — a bare number sends you guessing. */
          const describe = (el) =>
            `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}` +
            `${(el.innerText || "").trim() ? ` "${(el.innerText || "").trim().slice(0, 30)}"` : ""}`;

          const interactive = [...root.querySelectorAll("a,button,select,input,[role=option],[role=button],[role=listbox]")];
          const boxes = interactive
            .map((el) => ({ el, b: el.getBoundingClientRect() }))
            .filter((x) => x.b.width > 0 && x.b.height > 0)
            .sort((p, q) => p.b.height - q.b.height);

          // ── the frozen card's own controls are measured but not FAILED on ──────────────
          // `MarketCard` is frozen by the kit's own contract, and ACCEPTANCE.md §11 rules that its
          // sub-44 targets are "NOT worked around, NOT redesigned here — recorded only" (the
          // token file schedules `--h-control-md: 38 → 44`). Its `.mcardp-details` row is
          // deliberately a constant one-line height so the card never changes height between
          // boards (globals.css:3194), and `MARKET_CARD_H` depends on that — so raising it is a
          // platform-wide geometry change, not a landing fix.
          // ⛔ EXEMPT, NEVER SILENT: the number is still reported on every run, so it cannot rot
          // into "the landing has no small targets". Nothing OUTSIDE this list is forgiven.
          const FROZEN_CARD = ".mcardp-details, .mcardp-info, .mcardp-actions .btn";
          const mine = boxes.filter((x) => !x.el.closest(".mcardp") || !x.el.matches(FROZEN_CARD));
          const frozen = boxes.filter((x) => x.el.matches(FROZEN_CARD));
          const minH = mine.length ? Math.round(mine[0].b.height) : -1;

          // ⛔ ONLY TEXT-BEARING NODES COUNT AS CLIPPED — corrected after this check flagged the
          // hero at all twelve width×locale combinations. What it was catching is the brand mark:
          // a 1100px decorative backdrop that DELIBERATELY bleeds off both edges, contained by
          // `overflow: hidden` on the section, exactly as the kit specifies. The defect class this
          // is for is "a sentence or a control is severed" (test:admin-clip's subject), so the
          // test is now whether an element holding its OWN text overflows — decoration and
          // wrappers cannot trip it, and a cut label still can.
          const hasOwnText = (el) =>
            [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
          const clippedEls = [...root.querySelectorAll("*")].filter((el) => {
            const s = getComputedStyle(el);
            if (s.overflowX === "auto" || s.overflowX === "scroll") return false;
            if (s.textOverflow === "ellipsis") return false; // the tail IS the "…"
            if (!hasOwnText(el)) return false;
            return el.scrollWidth - el.clientWidth > 1;
          });

          const r = root.getBoundingClientRect();
          return {
            h: Math.round(r.height),
            w: Math.round(r.width),
            interactive: interactive.length,
            minTap: minH,
            minTapWhat: mine.length ? describe(mine[0].el) : "(none)",
            frozenMinTap: frozen.length ? Math.round(frozen[0].b.height) : -1,
            frozenMinWhat: frozen.length ? describe(frozen[0].el) : "(none)",
            clipped: clippedEls.length,
            clippedWhat: clippedEls.slice(0, 3).map(describe),
          };
        }, b);
        if (!m) continue;

        const line =
          `${status} band=${b.padEnd(12)} ${vp.name.padEnd(5)} ${loc}  ${m.w}x${m.h}` +
          `  interactive=${m.interactive}  minTap=${m.minTap}px  clipped=${m.clipped}` +
          // Reported on every line, exempt or not — see FROZEN_CARD above.
          (m.frozenMinTap > 0 ? `  [frozen-card minTap=${m.frozenMinTap}px ${m.frozenMinWhat}]` : "");
        console.log("  " + line);
        rows.push(line);

        if (m.clipped > 0) {
          failures.push(`/ ${tag} band=${b} -> ${m.clipped} clipped node(s): ${m.clippedWhat.join(" | ")}`);
        }
        if (vp.w <= 480 && m.minTap > 0 && m.minTap < 44) {
          failures.push(`/ ${tag} band=${b} -> smallest control ${m.minTap}px (< 44px): ${m.minTapWhat}`);
        }
      }

      const head =
        `${status} PAGE  ${vp.name.padEnd(5)} ${loc}  overflowX=${page_m.overflowX}px  h=${page_m.height}px` +
        `  bands=${bandNames.length ? bandNames.join("|") : "(none)"}` +
        `${consoleErrors.length ? "  CONSOLE_ERRORS=" + consoleErrors.length : ""}`;
      console.log(head);
      rows.push(head);

      if (consoleErrors.length) {
        failures.push(`/ ${tag} -> ${consoleErrors.length} console error(s): ${consoleErrors[0]}`);
      }
      // ⛔ A MEASUREMENT OF NOTHING IS NOT A PASS. In baseline mode there is nothing to require,
      // so the floor is that the page rendered something taller than a viewport.
      if (!REQUIRED.length && page_m.height < vp.h) {
        failures.push(`/ ${tag} -> page is ${page_m.height}px tall; nothing was measured`);
      }
    } catch (e) {
      failures.push(`/ ${tag} -> ${String(e.message).slice(0, 160)}`);
      console.log(`FAIL / ${tag}: ${String(e.message).slice(0, 160)}`);
    }
    await ctx.close();
  }
}

await browser.close();
writeFileSync(`${OUT}/MEASUREMENTS.txt`, rows.join("\n") + "\n", "utf8");
console.log(`\n${frames} frames -> ${OUT}`);
if (failures.length) {
  console.log("FAILURES:");
  failures.forEach((f) => console.log("  " + f));
  process.exit(1);
}
console.log("no failures");
