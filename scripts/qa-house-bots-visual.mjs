/**
 * qa:house-bots-visual — the desk's own visual gate (C7-SPEC rulings 318, 374, 404, 407, 419; §5's capture list).
 *
 *   KP_BASE=http://127.0.0.1:3021 npm run qa:house-bots-visual
 *   KP_BASE=… KP_ROUTES=/admin/desk KP_WIDTHS=360,1280 npm run qa:house-bots-visual   # KP_ROUTES OVERRIDES the
 *   derived population — with it unset the routes are every tab of `CONSOLE_TABS`, read from the section's own
 *   route module, so a tab added by a later step is inside this gate on the day its panel lands (ruling 539).
 *
 * ⛔ IT DRIVES A LOCAL `next start` AND NOTHING ELSE. `scripts/live/harness.mjs` defaults to production and holds
 * Ali's own console password; signing in with it would revoke his live session (50pick keeps ONE live session per
 * account) and would point a house-bot instrument at the live platform. So this script takes a local base URL, signs
 * in with `seed-admin-local.mts`'s LOCALHOST-ONLY credentials, and REFUSES any base that is not a loopback address.
 *
 * ⛔ IT IS NOT A SCREENSHOT SCRIPT. §5 names what is being LOOKED FOR, and each of those is asserted here, per width,
 * because a tile nobody reads is not a measurement:
 *   1. no money figure is clipped by a box that does NOT scroll, and none is broken across two line boxes (§A5:
 *      never clip money or a timestamp) — measured with a Range against the nearest overflow box, never with
 *      `scrollWidth > clientWidth`, which is `0 > 1` for an inline non-replaced span and therefore always false. A
 *      SCROLLABLE box defers rather than clips, which is the kit's own ruling beside `.admin-tbl td.tabular`;
 *   2. the SUBJECT column and the FIRST money answer are inside the visible strip of the scroll container without
 *      scrolling, at every width; the SECOND money answer joins them from 640 up. ⛔ NOT all three at 360: two
 *      usage PAIRS plus a readable subject column cannot fit 360px, which is 432(b)'s own arithmetic, and the kit's
 *      documented answer for a figure wider than its box is one ScrollX scroll. What is NOT acceptable is a figure
 *      SLICED by the card edge, which is check 1;
 *   3. no tile carries two amounts, and no KPI delta carries a currency-prefixed figure (ruling 404) — read off the
 *      tile's LAST titled span, because `AdminKpi` gives its LABEL a `title` too and renders it first;
 *   4. every interactive control reaches the `--tap-min` token READ FROM THE PAGE (40px here, not 44 — 44 is
 *      `--h-control-md`), with `[role="switch"]` exempt because DG-A-02 gives it a 40px reach out of flow;
 *   5. every empty-state message box is inside the viewport;
 *   6. ⛔ no house-vocabulary word anywhere in the rendered body — the shared vocabulary, never a new regex — AND, in
 *      the console's OWN subtree, none of ruling 453's four extra words either, in text or in an attribute. The
 *      sidebar legitimately renders "House" for /admin/house, so the 453 scan is scoped to the content region.
 *
 * ⛔ NO POSTGRES OR NO SERVER IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED) — a visual gate that skips silently is
 * the "not applicable" verdict this programme has paid for twice.
 *
 * Tiles are VIEWPORT tiles, never `fullPage`, written under `KP_SHOTS` (default `.qa-house-bots/`, gitignored by the
 * `.qa-` prefix rule). Evidence is regenerable and stays out of the tracked tree (W20).
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { houseHits, consoleNeutralRegExp, CONSOLE_EXTRA_SAMPLES, CONSOLE_BENIGN_SAMPLES } from "./lib/house-bot-vocabulary.mjs";

const BASE = process.env.KP_BASE ?? "http://127.0.0.1:3021";
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — qa:house-bots-visual drives a LOCAL next start only. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const WIDTHS = (process.env.KP_WIDTHS ?? "360,640,768,1024,1280,1920").split(",").map((n) => Number(n.trim())).filter(Boolean);
/**
 * ⛔ THE ROUTE POPULATION IS THE SECTION'S OWN TAB LIST, READ FROM DISK (replan ruling 539, hole 2).
 * It was the single typed string "/admin/desk", so the entire limits tab — its five usage rows, its whole
 * limits list, its `AdminLoadError` branches — went through NONE of §5.1, §5.3, §5.4 or §5.6, and the three
 * labels naming the feature's own mechanism were painted for a day on the one surface this gate exists to keep
 * neutral. The instrument that reads RENDERED text had never visited the page that was leaking.
 * ⛔ IT IS PARSED, NOT IMPORTED, because this file is `.mjs` and `console-routes.ts` is TypeScript — and it is
 * REFUSED rather than defaulted when the parse finds nothing: a derived population that silently falls back to a
 * typed one is the typed one, with a comment claiming otherwise.
 */
function consoleRoutesFromSource() {
  const src = readFileSync("src/lib/house-bot/console-routes.ts", "utf8");
  const route = /export const CONSOLE_ROUTE = "([^"]+)"/.exec(src)?.[1] ?? "";
  const tabsRaw = /export const CONSOLE_TABS = \[([^\]]*)\]/.exec(src)?.[1] ?? "";
  const dflt = /export const DEFAULT_TAB: ConsoleTab = "([^"]+)"/.exec(src)?.[1] ?? "";
  const tabs = [...tabsRaw.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (!route || !dflt || tabs.length === 0 || !tabs.includes(dflt)) return null;
  return tabs.map((t) => (t === dflt ? route : `${route}?tab=${t}`));
}
const DERIVED_ROUTES = consoleRoutesFromSource();
if (!process.env.KP_ROUTES && !DERIVED_ROUTES) {
  console.error("REFUSED — qa:house-bots-visual could not read CONSOLE_ROUTE/CONSOLE_TABS/DEFAULT_TAB out of src/lib/house-bot/console-routes.ts.");
  process.exit(2);
}
const ROUTES = process.env.KP_ROUTES
  ? process.env.KP_ROUTES.split(",").map((s) => s.trim()).filter(Boolean)
  : DERIVED_ROUTES;
console.log(`routes (${process.env.KP_ROUTES ? "KP_ROUTES" : "derived from CONSOLE_TABS"}): ${ROUTES.join(" ")}`);
const SHOTS = process.env.KP_SHOTS ?? ".qa-house-bots";
const PHONE = "+255700000000";
const PASSWORD = process.env.KP_ADMIN_PASSWORD ?? "QaAdmin2026!";

mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0, notMeasured = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const nm = (l, why) => { notMeasured++; console.log(`NOT MEASURED ${l} — ${why}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
try {
  const page = await ctx.newPage();
  /* 🔴 `networkidle`, and the VISIBLE `#phone` NODE. Measured on the first execution of this script: `PhoneInput`
     mirrors into a HIDDEN `input[name="phone"]` of the same name, so `input[type="tel"], input[name="phone"]`
     resolved to the hidden mirror and `fill` timed out after 30s — the gate could not sign in at all. Filling before
     hydration posts a blank identifier and reads as a wrong password, so the wait is `networkidle`. The sync check
     below is the control: it proves the visible field really reached the hidden one the form submits. */
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.fill("#phone", PHONE.replace("+255", ""));
  const synced = await page.locator('input[name="phone"]').inputValue().catch(() => "");
  if (synced !== PHONE.replace("+255", "")) {
    nm("sign-in", `PhoneInput did not sync into the submitted field (hidden value ${JSON.stringify(synced)})`);
    console.log(`\nqa:house-bots-visual: ${pass} passed, ${fail} failed, ${notMeasured} NOT MEASURED`);
    process.exit(3);
  }
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !/\/auth\//.test(u.toString()), { timeout: 60_000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  // ⛔ HTTP 200 PROVES NOTHING: a refused request lands on /auth/ and renders perfectly. Only the final URL tells it.
  if (/\/auth\//.test(page.url())) {
    nm("sign-in", `the local admin could not sign in at ${BASE} (seed with scripts/seed-admin-local.mts and set DISABLE_ADMIN_TOTP=true)`);
    console.log(`\nqa:house-bots-visual: ${pass} passed, ${fail} failed, ${notMeasured} NOT MEASURED`);
    process.exit(3);
  }
  await page.close();

  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      const p = await ctx.newPage();
      await p.setViewportSize({ width, height: 900 });
      /* 🔴 `load`, NOT `networkidle`, AND THE RAIL IS THE DATA WAIT. MEASURED 2026-09-18, the day C7 step 3 mounted
         the desk's live strip: the page opens a persistent SSE connection to `/api/events` (`useEventStream`, rulings
         316/386), and a page holding an EventSource open NEVER reaches `networkidle` — every navigation here timed
         out at 60s and this gate could not reach the surface it exists to measure at all. `networkidle` was never the
         property being asserted; what matters is that the DATA has landed before the tile, so the wait is the kit's
         own `[data-section-rail]`, which the console renders only after its gated reader returns. ⛔ The screenshot
         still comes after an explicit settle, so a late paint is not caught mid-frame. */
      const resp = await p.goto(BASE + route, { waitUntil: "load", timeout: 60_000 });
      if (!resp || /\/auth\//.test(p.url())) { nm(`${route} @${width}`, `landed on ${p.url()}`); await p.close(); continue; }
      /* ⛔ THE DATA WAIT DECIDES WHETHER THIS TILE IS MEASURED AT ALL, AND IT MAY NOT SWALLOW ITS OWN TIMEOUT
         (replan ruling 540(b)). It was `.catch(() => null)`, so a page whose gated reader never returned was
         screenshotted anyway and all twenty checks below ran against an empty shell — zero clipped figures, zero
         short controls, zero house words, and every one of them a PASS. A page that never painted its data is
         NOT MEASURED, which is a report, not a verdict.
         ⛔ AND IT IS `[data-section-rail]` ALONE. The three-way OR admitted `.admin-tbl` and
         `[data-field-measure]` — nodes the admin chrome paints on pages that never render the console's rail at
         all — so the wait could be satisfied by something that is not this section. `Tabs` marks a rail whose
         options own a URL with `data-section-rail`, and the console renders it only after its gated reader
         returns, on EVERY tab and in the schema-missing state alike. */
      try {
        await p.waitForSelector("[data-section-rail]", { timeout: 30_000 });
      } catch {
        nm(`${route} @${width}`, "the section rail never painted, so the page's data never landed — no check below would have measured anything");
        await p.close();
        continue;
      }
      /* ⛔ A CONDITION, NOT A SLEEP MARGIN (the standing trap: wait on the clock, never on a margin). Web fonts
         decide every text metric this gate measures, and a tile taken before they load measures the fallback
         face; two consecutive frames after that is the paint actually settling. `waitForTimeout(600)` asserted
         neither and would have been wrong on a slower machine in exactly the direction that reads as a pass. */
      await p.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
      // The dev overlay is never part of a tile.
      await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      const tag = `${route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root"}-${width}`;
      writeFileSync(join(SHOTS, `${tag}.png`), await p.screenshot({ fullPage: false }));

      const facts = await p.evaluate(() => {
        const vis = (el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && el.closest("[hidden]") === null;
        };
        const money = [...document.querySelectorAll(".amount, [class*='amount']")].filter(vis);
        /* ⛔ `scrollWidth > clientWidth` IS DEAD ON AN INLINE SPAN: both are 0 on an inline non-replaced box, so the
           old predicate was `0 > 1` for every `.amount` in a table cell — the exact cells 432(b) re-laid out were
           the ones this check could not see. A Range measures the span's own ink; the box that clips it is the
           nearest scroll container (the ScrollX region), or the viewport when there is none. */
        const clipBox = (el) => {
          for (let p = el.parentElement; p; p = p.parentElement) {
            const cs = getComputedStyle(p);
            if (/auto|scroll|hidden/.test(cs.overflowX)) {
              const r = p.getBoundingClientRect();
              /* ⛔ A SCROLLABLE BOX DOES NOT CLIP — it defers, and that is the kit's OWN ruling, written beside the
                 `.admin-tbl td.tabular` rule: "`qa:chaos` and `qa:fit` both exempt content inside a `ScrollX` as
                 one-scroll-away, and a value that WRAPS is not a value that is CLIPPED". §A5 is about a figure with
                 no way to read it. Whether the ANSWER column needs scrolling at all is §5.2's question, and it is
                 asked there — where 432(b)'s arithmetic says the second money pair cannot fit 360px beside a
                 readable subject column. */
              /* ⛔ AND `hidden` IS NOT REACHABLE. The box-selection regex above keeps `hidden` on purpose — an
                 `overflow-x: hidden` ancestor IS the box that clips — but the kit's rule that a box "defers rather
                 than clips" is true only of `auto` and `scroll`. Computing `reachable` from `scrollWidth >
                 clientWidth` ALONE exempted a figure genuinely sliced by a hidden-overflow edge, which is precisely
                 the defect class §5.1 exists to catch. */
              return { left: r.left, right: r.right, reachable: /auto|scroll/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1 };
            }
          }
          return { left: 0, right: window.innerWidth, reachable: false };
        };
        const clipped = money
          .filter((el) => /TZS|^[\d,]+$/.test((el.textContent ?? "").trim()))
          .map((el) => {
            const r = document.createRange();
            r.selectNodeContents(el);
            const ink = r.getBoundingClientRect();
            const box = clipBox(el);
            return { t: (el.textContent ?? "").trim(), l: Math.round(ink.left), r: Math.round(ink.right), bl: Math.round(box.left), br: Math.round(box.right), reachable: !!box.reachable, rects: el.getClientRects().length };
          })
          .filter((m) => m.rects > 1 || (!m.reachable && (m.r > m.br + 1 || m.l < m.bl - 1)))
          .map((m) => `${m.t} @${m.l}→${m.r} in ${m.bl}→${m.br}`);
        const tiles = [...document.querySelectorAll(".admin-kpi")].filter(vis).map((t) => ({
          text: (t.textContent ?? "").trim(),
          amounts: ((t.textContent ?? "").match(/TZS/g) ?? []).length,
          /* ⛔ THE LAST titled span, not the first: `AdminKpi` renders its LABEL with `title={label}` BEFORE the
             delta's own titled span, so `querySelector("span[title]")` read "Stake today" and the check that no
             delta carries a currency figure could never fail. */
          delta: ([...t.querySelectorAll("span[title]")].pop()?.textContent ?? "").trim(),
        }));
        /* ⛔ THE FLOOR IS THE TOKEN, READ FROM THE PAGE — NOT A TYPED 44, AND THAT WAS MEASURED. This check was
           written against 44 and had never been executed; on its first run it reported the ENTIRE admin sidebar
           (45 nav rows at 40px), "Back to app", the refresh button and the AI switch — because `--tap-min` on this
           codebase is **40px** (globals.css: "the 40px finger/primary/money floor (Law 9)"), and 44 is
           `--h-control-md`. A gate that measures the platform instead of its subject is the wrong-population
           defect, so the floor comes from the token and the population is named below.
           ⛔ `[role="switch"]` IS EXEMPT, with the kit's own reason: DG-A-02 gives the 26px Switch a 40px REACH
           through `.toggle-switch::after`, out of flow, so its bounding box is PAINT and not tap — `tap-target`'s
           own register says in as many words that "a bounding box cannot see that fix", and `qa:toggle-hit` is the
           instrument that can. ⛔ The skip link is 1px by design (it is visually hidden until focused). */
        const tap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tap-min")) || 44;
        const controls = [...document.querySelectorAll("button, a[href], [role='switch'], input, select")]
          .filter(vis)
          .filter((el) => !el.closest("thead") && el.getAttribute("role") !== "switch"
            && !el.closest("[role='switch']") && el.getAttribute("href") !== "#main-content");
        const shortControls = controls
          .filter((el) => el.getBoundingClientRect().height < tap - 0.5)
          .map((el) => `${el.tagName.toLowerCase()}:${Math.round(el.getBoundingClientRect().height)}px:${(el.textContent ?? "").trim().slice(0, 24)}`);
        /* ⛔ AGAINST THE SCROLL CONTAINER'S VISIBLE EDGE, NOT THE VIEWPORT'S. The first render's own defect was
           measured this way: the loss cell ended at x=358 on a 360 viewport — inside it — while the card that holds
           the table clips at x≈339, so the figure was sliced and a viewport test passed. */
        const firstCells = [...document.querySelectorAll("table.admin-tbl tbody tr")].slice(0, 1).flatMap((tr) => {
          const region = tr.closest("[role='region']") ?? tr.closest("div");
          const box = region ? region.getBoundingClientRect() : { left: 0, right: window.innerWidth };
          return [...tr.children].slice(0, 3).map((td) => {
            const r = td.getBoundingClientRect();
            return { text: (td.textContent ?? "").trim().slice(0, 24), left: Math.round(r.left), right: Math.round(r.right), boxLeft: Math.round(box.left), boxRight: Math.round(box.right) };
          });
        });
        const region = document.querySelector("table.admin-tbl")?.closest("[role='region']") ?? null;
        const scrollable = region ? region.scrollWidth > region.clientWidth + 1 : false;
        /* The console's own content region, for 453's stricter scan — the sidebar's "House" nav label is not ours. */
        const own = document.querySelector("main") ?? document.body;
        /* ⛔ EVERY `aria-*` ATTRIBUTE, DERIVED FROM THE NODE (ruling 453 names `aria-*`, not four of them). The
           list was hand-typed, and C7 step 3 shipped `aria-valuetext` on every usage bar carrying server copy —
           a sentence written by the gated reader, outside this scan on the day it landed. */
        const attrs = [...own.querySelectorAll("*")].flatMap((el) => [
          ...[...el.attributes].filter((a) => a.name.startsWith("aria-")).map((a) => a.value),
          ...["title", "placeholder", "alt"].map((a) => el.getAttribute(a)),
        ].filter(Boolean));
        const emptyBoxes = [...document.querySelectorAll("table.admin-tbl tbody td[colspan]")].filter(vis).map((td) => {
          const r = td.querySelector("div")?.getBoundingClientRect() ?? td.getBoundingClientRect();
          return { left: Math.round(r.left), right: Math.round(r.right) };
        });
        return { clipped, moneyCount: money.length, tiles, shortControls, controlCount: controls.length, tap, firstCells, emptyBoxes, scrollable, ownText: own.innerText, attrs, body: document.body.innerText, vw: window.innerWidth };
      });

      ok(`§5.1 ${route} @${width} · no money figure is clipped by a box that cannot scroll, and none is broken across two lines`, facts.clipped.length === 0, facts.clipped.join(" | "));
      // ⛔ A CONTROL FOR THE §A5 GATE, and it was the one new check in this file that had none while §5.3, §5.4 and
      // §5.6 each gained one in the same commit: an empty selector reports zero clipped figures and reads as
      // compliance — and this run moved `tabular` off the `<td>` onto the figure span, i.e. edited the very class
      // surface the selector depends on.
      ok(`§5.1 ${route} @${width} · CONTROL · the money scan reached at least one figure`, facts.moneyCount >= 1, `${facts.moneyCount} money spans`);
      ok(`§5.3 ${route} @${width} · no tile carries two amounts`, facts.tiles.every((t) => t.amounts <= 1), facts.tiles.filter((t) => t.amounts > 1).map((t) => t.text).join(" | "));
      ok(`§5.3 ${route} @${width} · no KPI delta carries a currency-prefixed figure`, facts.tiles.every((t) => !/TZS\s*[\d,]/.test(t.delta)), facts.tiles.map((t) => t.delta).filter((d) => /TZS\s*[\d,]/.test(d)).join(" | "));
      // ⛔ A CONTROL FOR THE CHECK ABOVE: an empty selector reads exactly like compliance.
      ok(`§5.3 ${route} @${width} · CONTROL · at least one tile's delta was actually READ`, facts.tiles.length === 0 || facts.tiles.some((t) => t.delta.length > 0), JSON.stringify(facts.tiles.map((t) => t.delta)));
      ok(`§5.4 ${route} @${width} · every interactive control reaches the --tap-min token (${facts.tap}px)`, facts.shortControls.length === 0, facts.shortControls.join(" | "));
      // ⛔ A CONTROL FOR THE FLOOR: a scan that reached nothing reports 0 short controls and reads as compliance.
      ok(`§5.4 ${route} @${width} · CONTROL · the control scan reached the page`, facts.controlCount >= 3 && facts.tap >= 40, `${facts.controlCount} controls, tap ${facts.tap}px`);
      ok(`§5.6 ${route} @${width} · no house-vocabulary word anywhere in the rendered body`, houseHits(facts.body).length === 0, houseHits(facts.body).slice(0, 6).join(","));
      {
        // ⛔ RULING 453, over the console's OWN region and its attributes — the words `bot`, `house` and
        // `counter-stake` on top of the shared list, composed in the vocabulary module and never here (ruling 175).
        const neutral = consoleNeutralRegExp("gi");
        const subject = `${facts.ownText}\n${facts.attrs.join("\n")}`;
        const hits453 = [...subject.matchAll(neutral)].map((m) => m[0]);
        ok(`§5.6 ${route} @${width} · ⛔ RULING 453 · neither the console's own text NOR any of its aria-label/title/placeholder/alt names the feature`,
          hits453.length === 0, hits453.slice(0, 6).join(","));
        /* ⛔ BOTH DIRECTIONS, AND A MEASURED FLOOR (ruling 539; finding M9). `> 0` is satisfied by one stray
           `alt`; this console paints an `aria-label` on the rail, on the switch and on every usage bar, plus each
           bar's `aria-valuetext`. And a lexicon widened to a bare stem is worth nothing until it has been shown
           to LET AN INNOCENT WORD THROUGH. */
        ok(`§5.6 ${route} @${width} · CONTROL · the 453 scan fires on every word it adds, does NOT fire on an innocent look-alike, and really collected this page's aria-* attributes`,
          CONSOLE_EXTRA_SAMPLES.every((s) => consoleNeutralRegExp().test(s))
            && CONSOLE_BENIGN_SAMPLES.every((s) => !consoleNeutralRegExp().test(s))
            && facts.attrs.length >= 6,
          `${facts.attrs.length} attributes · benign hits ${JSON.stringify(CONSOLE_BENIGN_SAMPLES.filter((s) => consoleNeutralRegExp().test(s)))}`);
      }
      if (facts.firstCells.length) {
        const [subject, first, second] = facts.firstCells;
        const inBox = (c) => c.left >= c.boxLeft - 1 && c.right <= c.boxRight + 1;
        ok(`§5.2 ${route} @${width} · the SUBJECT column and the FIRST money answer are inside the visible strip without scrolling`,
          inBox(subject) && inBox(first), JSON.stringify(facts.firstCells.slice(0, 2)));
        if (width >= 640) {
          ok(`§5.2 ${route} @${width} · …and from 640 up the SECOND money answer is in the strip too`, second == null || inBox(second), JSON.stringify(second));
        } else {
          // 432(b)'s arithmetic: two usage pairs plus a readable subject column do not fit 360, so the second answer
          // is one scroll away BY DESIGN — and the region must actually be scrollable for that to be an answer.
          ok(`§5.2 ${route} @${width} · …and the second money answer is reachable: the table's region really does scroll`,
            second == null || inBox(second) || facts.scrollable, JSON.stringify({ second, scrollable: facts.scrollable }));
        }
      } else {
        nm(`§5.2 ${route} @${width}`, "no roster row was rendered, so the money columns' position was not measured");
      }
      if (facts.emptyBoxes.length) {
        ok(`§5.5 ${route} @${width} · every empty-state message box is inside the viewport`,
          facts.emptyBoxes.every((b) => b.left >= -1 && b.right <= facts.vw + 1), JSON.stringify(facts.emptyBoxes));
      }
      await p.close();
    }
  }
} finally {
  await ctx.close();
  await browser.close();
}
console.log(`\nqa:house-bots-visual: ${pass} passed, ${fail} failed, ${notMeasured} NOT MEASURED — tiles in ${SHOTS}`);
process.exit(fail > 0 ? 1 : notMeasured > 0 ? 3 : 0);
