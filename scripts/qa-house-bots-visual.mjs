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
  /* ⭐ C7 STEP 6 · THE WIZARD JOINS THE DERIVED POPULATION, and it is replan ruling 539's lesson applied before
     the fact rather than after it: the instrument that reads RENDERED text must visit every page of the section,
     not only the tabs of one of them. Only the BARE route is derivable — its `?u=` states need an account id this
     script cannot know — so the find step is permanent here and the account-bound steps are driven with
     `KP_ROUTES` by the checkpoint that has a fixture. ⛔ REFUSED rather than defaulted if the constant moves. */
  const wizard = /export const CONSOLE_NEW_ROUTE = `\$\{CONSOLE_ROUTE\}\/new`/.test(src) ? `${route}/new` : null;
  if (!wizard) return null;
  return [...tabs.map((t) => (t === dflt ? route : `${route}?tab=${t}`)), wizard];
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
/**
 * ⛔ RULING 474's TWO OPERATOR-DATA VALUES, READ FROM THE READER'S OWN LIST — never typed here.
 * `bot.label` and `control.switchedReason` are DATA an operator typed, not this console's copy: 453 may not
 * silently rewrite them, and 474 exempts them BY NAME. This gate had no such exemption, so a roster whose
 * accounts are labelled "Bot 1–3" made §5.6 red at all six widths on a value the ruling says must never fail it.
 * ⛔ IT IS REFUSED rather than defaulted when the list cannot be read, and the two names are required to be
 * EXACTLY the two: a third exemption cannot arrive here without being ruled.
 */
function operatorExemptNames() {
  const src = readFileSync("src/lib/server/house-console-read.ts", "utf8");
  const block = /export const OPERATOR_DATA_EXEMPT = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(src)?.[1] ?? "";
  return [...block.matchAll(/value:\s*"([^"]+)"/g)].map((m) => m[1]);
}
const OPERATOR_EXEMPT = operatorExemptNames();
if (JSON.stringify(OPERATOR_EXEMPT) !== JSON.stringify(["label", "switchedReason"])) {
  console.error(`REFUSED — OPERATOR_DATA_EXEMPT in src/lib/server/house-console-read.ts is ${JSON.stringify(OPERATOR_EXEMPT)}; this gate implements exactly ["label","switchedReason"] (ruling 474) and will not guess at a third.`);
  process.exit(2);
}
/** The ON sentence's operator-typed tail — the same rule `test:house-bot-console` §3 applies to `stateSentence`. */
const stripReasonTail = (text) => text.replace(/ ·\u00a0reason: [^\n]*/g, "");
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
      /* ⭐ C7 STEP 6 · THE WIZARD HAS NO RAIL, AND THAT IS ITS DESIGN, NOT A MISSING PAINT. `/admin/desk/new` is a
         LINEAR four-step flow: ruling 312's law is that a rail option with no panel is a dead control, and a wizard's
         steps are not tabs — so it renders a step line and a `role="progressbar"`, which its gated reader is the
         same precondition for. The landmark is therefore chosen PER ROUTE rather than widened for every route: the
         three-way OR ruling 540(b) struck admitted nodes the admin chrome paints on pages that are not this section
         at all, and this does not — each route names exactly one landmark that only its own render produces. */
      /* ⭐ AND THE ACCOUNT PAGE NAMES ITS OWN LANDMARK, WHICH IS WHAT FINALLY LETS A **REMOVED** ACCOUNT THROUGH
         THIS GATE (register row 69, carried unmeasured by three passes). Ruling 435(a) REMOVES the rail from a
         removed account on purpose — a rail whose Overview tab paints 600px of nothing is 312's dead control — so
         `[data-section-rail]` could never paint there and every one of the twenty checks reported NOT MEASURED at
         all six widths. The read-only state of an account that HELD MONEY was the one state in this section no
         instrument had ever looked at.
         ⛔ THE LANDMARK IS STILL ONE NODE ONLY ITS OWN RENDER PRODUCES, which is replan ruling 540(b)'s whole
         point: the account head's `h1[data-operator-text="label"]` is painted after the page's gated reader
         returns (a failed read is `notFound()`, never this h1), and it is an `h1` — the landing page marks the
         same operator value on a `div`, so this selector cannot be satisfied by the roster. The three-way OR 540(b)
         struck admitted nodes the admin CHROME paints; this admits nothing outside this page. */
      const path = route.split("?")[0];
      const READY = path.endsWith("/new") ? '[role="progressbar"]'
        : /^\/admin\/desk\/[^/]+$/.test(path) ? 'h1[data-operator-text="label"]'
        : "[data-section-rail]";
      try {
        await p.waitForSelector(READY, { timeout: 30_000 });
      } catch {
        nm(`${route} @${width}`, `the route's own landmark ${READY} never painted, so the page's data never landed — no check below would have measured anything`);
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
           instrument that can. ⛔ The skip link is 1px by design (it is visually hidden until focused).
           ⭐ `.sensitive-reveal` IS EXEMPT FOR THE IDENTICAL, DOCUMENTED REASON, and it is added at C7 step 6 because
           the designation wizard is the first console surface to render a masked field (ruling 359's phone, through
           the platform's own SERVER `Sensitive`). `globals.css` measured that control at **86 × 15px** on
           production and states why a 44px BOX is the wrong fix — it sits mid-sentence in the player header and
           inside dense table cells, so a box would stretch the line and re-space every roster row — and gives it a
           `::after` REACH of 15 + 13 + 13 = 41px, which clears `--tap-min` (40). A bounding box cannot see that
           fix either. ⛔ THE EXEMPTION IS CONDITIONED ON THE REACH STILL EXISTING, asserted below, so deleting the
           rule turns this red rather than leaving a 15px control silently exempt. */
        const tap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tap-min")) || 44;
        /* ⛔ AN OPTION IS A CONTROL (C7 step 6 review, conformance-412 / visual-13). Ruling 412 fixes each
           `li role="option"` at 44px, and the selector saw `button, a, input, select` only — so the picker's
           options were outside the floor entirely, and the ruling's own rung was measured nowhere. Widened, never
           narrowed: nothing that was measured before has left this list. */
        const controls = [...document.querySelectorAll("button, a[href], [role='switch'], [role='option'], input, select")]
          .filter(vis)
          .filter((el) => !el.closest("thead") && el.getAttribute("role") !== "switch"
            && !el.closest("[role='switch']") && el.getAttribute("href") !== "#main-content"
            && !el.classList.contains("sensitive-reveal"));
        /* The exempted controls, COUNTED, so the exemption can be shown to have been exercised rather than assumed. */
        const revealCount = [...document.querySelectorAll(".sensitive-reveal")].filter(vis).length;
        const revealReach = (() => {
          const el = document.querySelector(".sensitive-reveal");
          if (!el) return null;
          const after = getComputedStyle(el, "::after");
          const box = el.getBoundingClientRect();
          return { top: after.top, bottom: after.bottom, content: after.content, height: Math.round(box.height) };
        })();
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
        const tableCount = document.querySelectorAll("table.admin-tbl").length;
        /* ⛔ AN EMPTY-STATE ROW IS ONE `td[colspan]`, NOT A SUBJECT COLUMN AND TWO MONEY ANSWERS — AND IT CRASHED
           THIS GATE. MEASURED 2026-09-20 on `/admin/desk/<id>?tab=targets`, whose table renders "No targets yet"
           as a single spanning cell: §5.2 destructured `[subject, first, second]` off a ONE-element list, so
           `inBox(first)` dereferenced `undefined`. At 360 the throw was hidden because `inBox(subject)` was
           already false and `&&` short-circuited; at 640 it was true, the second call ran, and the whole run
           DIED THERE — eleven of the twelve account routes were never visited, and the run reported exit 1 as
           though it had measured them. A gate that stops at its own crash reports the routes it reached as the
           population, which is the wrong-population defect wearing a stack trace.
           ⛔ So the SHAPE is a fact, and §5.2 asks its money-column question only of a row that HAS money
           columns. The empty row's own geometry is §5.5's question and is asked there. */
        /* ⛔ RULING 435(a)'s STATE, READ OFF THE PAGE. A REMOVED account paints NO rail — deliberately — and with
           it go the rail's `aria-label`, the switch's, every usage bar's and every bar's `aria-valuetext`. The
           attribute FLOOR below is a per-population number, and "this account page has a rail" is the population
           split, taken from the render rather than from a route the script would have to recognise by id. */
        const railCount = document.querySelectorAll("[data-section-rail]").length;
        const firstRow = document.querySelector("table.admin-tbl tbody tr");
        const firstRowEmpty = !!firstRow && firstRow.children.length === 1 && firstRow.children[0].hasAttribute("colspan");
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
        /* ⛔ RULING 474 · THE OPERATOR'S OWN TEXT, COLLECTED SEPARATELY so the 453 scan can exempt exactly those
           nodes and nothing else. The hook is written at the render site, so the exemption is VISIBLE in the DOM
           rather than inferred from position. */
        const operatorNodes = [...own.querySelectorAll("[data-operator-text]")];
        const operatorText = operatorNodes.map((el) => (el.textContent ?? "").trim()).filter(Boolean);
        /* ⛔ THE ADDRESS BAR IS A SURFACE, AND THIS GATE HAD NEVER READ IT (ops-lane visual pass, 2026-09-20).
           §5.6 reads the rendered body and the aria-label/title/placeholder/alt attributes; it stopped at the
           window. An officer's URL is on screen on every one of these pages, it is what a screenshot carries, and
           it is what a `Referer` hands the next request — so a vocabulary word that reached a path segment or a
           query key would have passed 1,398 checks. Collected here and asserted at §5.6 below. */
        const url = `${location.pathname}${location.search}`;
        return { url, clipped, moneyCount: money.length, tiles, shortControls, controlCount: controls.length, tap, firstCells, firstRowEmpty, railCount, tableCount, emptyBoxes, scrollable, ownText: own.innerText, attrs, operatorText, revealCount, revealReach, body: document.body.innerText, vw: window.innerWidth };
      });

      ok(`§5.1 ${route} @${width} · no money figure is clipped by a box that cannot scroll, and none is broken across two lines`, facts.clipped.length === 0, facts.clipped.join(" | "));
      // ⛔ A CONTROL FOR THE §A5 GATE, and it was the one new check in this file that had none while §5.3, §5.4 and
      // §5.6 each gained one in the same commit: an empty selector reports zero clipped figures and reads as
      // compliance — and this run moved `tabular` off the `<td>` onto the figure span, i.e. edited the very class
      // surface the selector depends on.
      /* ⭐ C7 STEP 6 · THE WIZARD IS THE ONE CONSOLE SURFACE THAT PAINTS NO MONEY AT ALL, BY RULING, so on it the
         control is INVERTED rather than exempted — which makes it a stronger assertion, not a quieter one.
         Owner-delegated ruling 459 withdrew 368's "one plain balance" exception: the check card shows a funded
         STATE because the figure is a real person's wallet position, the one number on these screens belonging to
         somebody other than 50pick and the one most likely to sit in a screenshot. So `/admin/desk/new` must carry
         ZERO money spans AND no currency prefix anywhere in its own subtree, and a single amount appearing there
         turns this red. ⛔ Every OTHER route keeps the original control unchanged: a surface that should carry
         money and carries none is still a failure, because an empty selector reads exactly like compliance. */
      const MONEYLESS = route.split("?")[0].endsWith("/new");
      ok(MONEYLESS
        ? `§5.1 ${route} @${width} · CONTROL · ⛔ 459 · this surface paints NO money at all — no amount span and no currency prefix in its own subtree`
        /* ⛔ THE CONTROL ASKS THE RENDERED TEXT, NOT THE ROUTE LIST — AND THAT IS A STRENGTHENING, MEASURED
           2026-09-20. It was the bare `moneyCount >= 1`, which asks "did the scan reach a figure" and therefore
           says the same thing about two opposite surfaces: `?tab=targets`, whose table has no money COLUMN by
           design, and `?tab=rules`, which paints SEVEN currency caps as plain text outside `.amount`. Both read
           "0 money spans"; only the second is a defect, and the bare form could not tell them apart, so a real
           finding arrived dressed as a population complaint the next pass would have exempted.
           ⭐ What §5.1 needs to be true is that every currency figure a surface paints is INSIDE the atom its
           scan reads — `.amount` is what carries `white-space: nowrap` and the money meaning, and a figure outside
           it is both a visual inconsistency and invisible to the clipping check above. So: a surface whose own
           text carries a currency prefix must have at least one figure in the atom, and a surface that paints no
           currency at all asserts that instead. Strictly stronger where money exists, correct-population where it
           does not. ⛔ `/new`'s inverted form (ruling 459) is untouched. */
        : `§5.1 ${route} @${width} · CONTROL · every currency figure this surface paints is inside the money atom the scan reads — or it paints none and says so`,
        MONEYLESS ? facts.moneyCount === 0 && !/TZS/.test(facts.ownText) : (/TZS/.test(facts.ownText) ? facts.moneyCount >= 1 : facts.moneyCount === 0),
        `${facts.moneyCount} money spans; currency prefix in the surface's own text: ${/TZS/.test(facts.ownText)}`);
      ok(`§5.3 ${route} @${width} · no tile carries two amounts`, facts.tiles.every((t) => t.amounts <= 1), facts.tiles.filter((t) => t.amounts > 1).map((t) => t.text).join(" | "));
      ok(`§5.3 ${route} @${width} · no KPI delta carries a currency-prefixed figure`, facts.tiles.every((t) => !/TZS\s*[\d,]/.test(t.delta)), facts.tiles.map((t) => t.delta).filter((d) => /TZS\s*[\d,]/.test(d)).join(" | "));
      // ⛔ A CONTROL FOR THE CHECK ABOVE: an empty selector reads exactly like compliance.
      ok(`§5.3 ${route} @${width} · CONTROL · at least one tile's delta was actually READ`, facts.tiles.length === 0 || facts.tiles.some((t) => t.delta.length > 0), JSON.stringify(facts.tiles.map((t) => t.delta)));
      ok(`§5.4 ${route} @${width} · every interactive control reaches the --tap-min token (${facts.tap}px)`, facts.shortControls.length === 0, facts.shortControls.join(" | "));
      // ⛔ A CONTROL FOR THE FLOOR: a scan that reached nothing reports 0 short controls and reads as compliance.
      ok(`§5.4 ${route} @${width} · CONTROL · the control scan reached the page`, facts.controlCount >= 3 && facts.tap >= 40, `${facts.controlCount} controls, tap ${facts.tap}px`);
      /* ⛔ AN EXEMPTION IS NOT A PROMISE. Where a masked field really rendered, the reveal control's own `::after`
         REACH is read off the page — so the exemption above holds only while the rule that justifies it exists.
         Deleting `.sensitive-reveal::after` from `globals.css` turns this red instead of leaving a 15px control
         quietly exempt, which is the shape every exemption list rots into. */
      if (facts.revealCount > 0) {
        const reach = facts.revealReach ?? {};
        const px = (v) => Math.abs(parseFloat(v) || 0);
        ok(`§5.4 ${route} @${width} · CONTROL · the exempted reveal control really carries its documented REACH — ${facts.revealCount} on this page, box ${reach.height}px, reach ${reach.height + px(reach.top) + px(reach.bottom)}px against the ${facts.tap}px token`,
          reach.content === '""' && reach.height + px(reach.top) + px(reach.bottom) >= facts.tap,
          JSON.stringify(reach));
      }
      /* ⛔ 474's OPERATOR EXEMPTION APPLIES TO THE SHARED SCAN TOO (C7 step 7 review, d19-hunt-03). It was wired
         into the 453 scan below and not into this one, so an account whose OWNER-CHOSEN label happened to carry a
         shared word would have failed the whole-body scan on a value ruling 474 says must never fail it — the same
         defect §5.6's own hook was added to end, one assertion higher up. Exactly the marked nodes are removed,
         and nothing else; the control below still proves the scan reaches the page. */
      const bodySubject = facts.operatorText.reduce((acc, t) => acc.split(t).join(" "), facts.body);
      ok(`§5.6 ${route} @${width} · no house-vocabulary word anywhere in the rendered body (the operator's own marked text exempted, 474)`,
        houseHits(bodySubject).length === 0, houseHits(bodySubject).slice(0, 6).join(","));
      {
        // ⛔ RULING 453, over the console's OWN region and its attributes — the words `bot`, `house` and
        // `counter-stake` on top of the shared list, composed in the vocabulary module and never here (ruling 175).
        const neutral = consoleNeutralRegExp("gi");
        /* ⛔ 474's TWO EXEMPTIONS, REMOVED BY NAME AND NOTHING ELSE: the marked nodes' own text, and the ON
           sentence's `· reason:` tail. Everything else on the page stays in the subject. */
        const exempted = facts.operatorText.reduce((acc, t) => acc.split(t).join(" "), `${facts.ownText}\n${facts.attrs.join("\n")}`);
        const subject = stripReasonTail(exempted);
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
            /* ⛔ THE FLOOR IS PER-POPULATION, AND THE TABBED PAGES' 6 IS NOT LOWERED. It was measured on a page that
               paints an `aria-label` on the rail, on the switch and on every usage bar plus each bar's
               `aria-valuetext`; a wizard STEP paints a rail-free form and collected 4 on the day this was written.
               A floor that demanded 6 there would be the wrong-population defect, and a floor of 0 is the vacuity
               trap. Both numbers are what a run PRINTED, and neither may fall. */
            /* ⭐ RAISED TO WHAT A RUN PRINTED, OVER THE WHOLE POPULATION (C7 step 6's fix pass,
               test-strength-visual-aria-floor). The wizard floor was 3 against a printed 4 — slack a floor may not
               carry — and the first correction set it to 9, which was the wrong POPULATION: 9 is the find step,
               measured without the consent and review steps in the list. All NINE wizard states at 1280 print
               9 · 11 · 11 · 13 · 13 · 13 · 6 · 5 · 5, so the floor is FIVE — the lowest a run printed, which is what
               a floor is. It only ever rises. */
            /* ⛔ AND NOW THERE ARE THREE POPULATIONS, BECAUSE A THIRD ONE WAS MEASURED (2026-09-20, the ops lane's
               render of `/admin/desk/<id>`). The floor was "the landing page's 6, or the wizard's 5", and the
               ACCOUNT page is neither: its own run printed 40 on the overview of a started account, 40 on an
               auto-paused one, **5** on the overview of an account that has never run, 5 on every `?tab=rules`
               and 7 on every `?tab=targets` — at all six widths, every time. A 6 held against that population
               turned 24 assertions red on a page with nothing wrong with it, which is the wrong-population
               defect: a true measurement of the wrong subject. The ACCOUNT floor is therefore FIVE — the lowest
               a run printed — and the LANDING floor stays 6, unlowered, because that is what ITS run printed.
               ⛔ AND A **REMOVED** ACCOUNT IS A FOURTH POPULATION, SPLIT BY THE RENDER AND NOT BY A ROUTE. Ruling
               435(a) takes the rail off a removed account on purpose, and with it go the rail's `aria-label`, the
               switch's, every usage bar's and every `aria-valuetext`: its run printed **2**, at all six widths, on
               all three of its URLs. That page reached this gate for the first time on 2026-09-20 (row 69), so a
               floor of 5 would have turned its very first measurement red for rendering exactly what 358 says it
               must. The split is `railCount === 0`, read off the page, so it can never be satisfied by a
               rail-bearing account page whose attributes went missing.
               ⛔ It only ever rises, and no number here is chosen: each is what a run printed. */
            && facts.attrs.length >= (route.split("?")[0] === "/admin/desk" ? 6 : facts.railCount === 0 && !MONEYLESS ? 2 : 5),
          `${facts.attrs.length} attributes · benign hits ${JSON.stringify(CONSOLE_BENIGN_SAMPLES.filter((s) => consoleNeutralRegExp().test(s)))}`);
        /* ⛔ AND THE EXEMPTION IS EXACTLY THE TWO VALUES 474 NAMES. An exemption nobody measures is a guard whose
           population is a lie: a house word planted into the page's NON-exempt text must still fire, and the
           removal must take only the marked nodes. */
        {
          const planted = `${subject} the house bots desk`;
          const untouched = `${facts.ownText}\n${facts.attrs.join("\n")}`;
          ok(`§5.6 ${route} @${width} · CONTROL · 474 · the operator-data exemption is exactly ${JSON.stringify(OPERATOR_EXEMPT)}, removes only the marked nodes, and a house word in the page's OWN text still fires`,
            /* the plant fires — the exemption did not switch the scan off */
            [...planted.matchAll(consoleNeutralRegExp("gi"))].length > 0
              /* each marked node's text is gone … */
              && facts.operatorText.every((t) => !subject.includes(t))
              /* … and something was actually removed when there was anything to remove, so an exemption that
                 matched nothing cannot read as one that worked */
              && (facts.operatorText.length === 0 || subject.length < untouched.length),
            `${facts.operatorText.length} operator node(s): ${JSON.stringify(facts.operatorText.slice(0, 4))}`);
        }
        /* ⛔ RULING 453 REACHES THE ADDRESS BAR TOO, AND UNTIL NOW THIS GATE STOPPED AT THE WINDOW (ops-lane visual
           pass, 2026-09-20). Every assertion above reads the DOM: the rendered body, the console's own region, its
           aria-label/title/placeholder/alt. None read `location`. But the URL is ON SCREEN on every one of these
           pages, it is the half of the shot a screenshot carries even when the page is clean, and it is what a
           `Referer` header hands the next request — so a vocabulary word that reached a path segment, a tab key or
           a query name would have passed all 1,398 checks of this file and been read by a person first.
           ⛔ WHAT THIS DOES NOT CLAIM. The record-id prefix `hb_` IS in the path of every account route here, and
           ruling 175's own control classifies a raw `hb_` prefix as BENIGN — `house-bot-disclosure.test.mts` 2.v.b
           names it alongside `HOUSE_FEE` and `/admin/house`. So this check is not a finding about today's URLs; it
           is the population those URLs were never in. It passes today by measurement, not by assumption. */
        {
          const urlHits = [...facts.url.matchAll(consoleNeutralRegExp("gi"))].map((m) => m[0]);
          ok(`§5.6 ${route} @${width} · ⛔ RULING 453 · the ADDRESS BAR names no feature either — the path and query an officer can read, screenshot and send as a Referer`,
            urlHits.length === 0, `${facts.url} · ${urlHits.slice(0, 6).join(",")}`);
          /* ⛔ BOTH DIRECTIONS, on the subject that was actually collected. A URL check is worth nothing until it
             has been shown to FIRE on a bad URL, to LET the real one through, and to have read a real location
             rather than an empty string a failed evaluate would also produce. */
          ok(`§5.6 ${route} @${width} · CONTROL · the URL scan fires on a planted route, lets this one through, and really read a location`,
            [...`${facts.url}/house-bots/bot-1`.matchAll(consoleNeutralRegExp("gi"))].length > 0
              && facts.url.startsWith("/admin/desk")
              && facts.url.length >= "/admin/desk".length,
            JSON.stringify(facts.url));
        }
      }
      if (facts.firstRowEmpty) {
        /* ⛔ THE EMPTY-STATE ROW IS A POSITIVE FACT, ASSERTED — NOT A SKIP AND NOT A CRASH (see `firstRowEmpty`).
           §5.2 asks where a money CELL sits inside a scroll strip; a table whose only row is one spanning cell has
           no money cell to ask about, and the cell it DOES have is measured by §5.5 below — which is the check
           written for exactly this box. What is asserted here is that the row really is the single spanning cell
           this branch believes it is, so "empty row" can never stand in for "the money columns were not read". */
        ok(`§5.2 ${route} @${width} · the table's only row is the empty state's one spanning cell, so it has no money CELL to push out of the strip — §5.5 measures that box`,
          facts.firstCells.length === 1, JSON.stringify(facts.firstCells));
      } else if (facts.firstCells.length) {
        const [subject, first, second] = facts.firstCells;
        const inBox = (c) => c.left >= c.boxLeft - 1 && c.right <= c.boxRight + 1;
        /* ⛔ `first != null` IS PART OF THE ASSERTION, NOT A CONVENIENCE. A data row with no second cell is a
           DEFECT — it means the money answer this check exists to place is not rendered at all — and it must read
           as a FAIL, never as the `TypeError` that killed the 2026-09-20 run at its second route. */
        ok(`§5.2 ${route} @${width} · the SUBJECT column and the FIRST money answer are inside the visible strip without scrolling`,
          inBox(subject) && first != null && inBox(first), JSON.stringify(facts.firstCells.slice(0, 2)));
        if (width >= 640) {
          ok(`§5.2 ${route} @${width} · …and from 640 up the SECOND money answer is in the strip too`, second == null || inBox(second), JSON.stringify(second));
        } else {
          // 432(b)'s arithmetic: two usage pairs plus a readable subject column do not fit 360, so the second answer
          // is one scroll away BY DESIGN — and the region must actually be scrollable for that to be an answer.
          ok(`§5.2 ${route} @${width} · …and the second money answer is reachable: the table's region really does scroll`,
            second == null || inBox(second) || facts.scrollable, JSON.stringify({ second, scrollable: facts.scrollable }));
        }
      } else if (facts.tableCount === 0) {
        /* ⛔ A SURFACE THAT RENDERS NO TABLE IS A POSITIVE FACT, NOT A SKIP. §5.2 asks where a money CELL sits in a
           scroll container; a surface with no `.admin-tbl` has no such cell, and printing NOT MEASURED for it would
           make this gate exit 3 for ever the moment its route population grew past the roster — which is how a gate
           stops being read. What IS asserted instead is the fact itself, WITH the figures §5.1 measured on that same
           surface, so "no table" cannot stand in for "nothing rendered". */
        /* ⛔ THE SAME CURRENCY-AWARE FORM AS §5.1's CONTROL, for the same measured reason: `?tab=rules` renders no
           `.admin-tbl` AND paints its caps outside the atom, so the bare `moneyCount >= 1` fired here too and said
           "no table" was the problem. The two assertions must agree or one of them teaches the wrong lesson. */
        ok(`§5.2 ${route} @${width} · this surface renders no `+"`.admin-tbl`"+`, so it has no money CELL to push out of a scroll strip — and §5.1 ${MONEYLESS ? "proved it paints no money at all" : "measured its figures where they are"}`,
          MONEYLESS ? facts.moneyCount === 0 : (/TZS/.test(facts.ownText) ? facts.moneyCount >= 1 : facts.moneyCount === 0),
          `${facts.moneyCount} money spans, ${facts.tableCount} tables, currency prefix in text: ${/TZS/.test(facts.ownText)}`);
      } else {
        nm(`§5.2 ${route} @${width}`, `a money table rendered with NO row (${facts.tableCount} table(s)), so the money columns' position was not measured`);
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
