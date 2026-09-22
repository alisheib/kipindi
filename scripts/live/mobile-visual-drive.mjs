/**
 * U1 · THE MOBILE VISUAL PLAN'S BASELINE INSTRUMENT — docs/MOBILE-VISUAL-PLAN.md §9 U1, §11.
 *
 * Measures the geometry every later unit of the plan is judged by, per cell of the §11 test matrix
 * (viewport × language × card spacing × signed out/in), and writes it as JSON — plus viewport tiles for
 * the cells a human reads — so a unit proves its "after", and the Comfortable / ≥ 640 zero diff, against
 * THIS file instead of against a screenshot and a memory.
 *
 *   LIVE_BASE=https://www.50pick.tz npm run qa:mobile-visual                     # production, signed out
 *   LIVE_BASE=https://www.50pick.tz WHO=mobile01 npm run qa:mobile-visual        # production, the QA player
 *   LIVE_BASE=http://localhost:3041 WHO=demo npm run qa:mobile-visual            # local next dev, /auth/demo
 *   … COMPARE=.qa-shots/mobile-visual/U1/before/out/index.json npm run qa:mobile-visual   # diff against a baseline
 *
 * Env (all optional):
 *   CELLS      primary | phone | full (default) | a list "360x780,320x640"
 *   LOCALES    sw,en,zh (default — ⛔ SWAHILI FIRST: it is the default language, plan §5)
 *   DENSITIES  compact,comfortable — which kp-density cookies to send. Default: compact everywhere, plus a
 *              comfortable pass at 360×780 (before U2 the cookie is inert, so that pair is the noise floor).
 *   ROUTES     home,markets,detail,updown,live,results,leaderboard,help,login,register,forgot
 *   UNIT / PHASE / TAG   output folder .qa-shots/mobile-visual/<UNIT>/<PHASE>/<TAG>/ (defaults U1 / before / WHO)
 *   SHOTS      readers (default: the cells the plan's sign-off sheets use) | all | none
 *   MARKET     a market id for the detail page (default: the first LIVE card the board links to)
 *   MOTION     full (default) | reduced — pins the device tier the site derives from cores/memory
 *   COMPARE    a baseline index.json; STRUCTURAL metrics (card heights, pinned chrome, pills, bubble, share
 *              reach, field widths, footer rows, tap reach) must match within TOL px or the run exits 1
 *   TOL        compare tolerance in px (default 1)
 *   RED=1      ⛔ the instrument's RED control: injects `.mcardp{padding:40px}` into every page. Run it with
 *              COMPARE; it must exit 1 naming the card heights, or the comparison cannot see a card change.
 *
 * ⛔ THE USER AGENT MUST CARRY "HeadlessChrome" (plan §0 trap, §5). /api/pv and the visit beacon drop only
 * automation agents; on 2026-09-15 a plain Android UA was counted as 25-60 real visits. The device is spoofed,
 * the marker never is — this refuses to start without it and re-reads navigator.userAgent inside every page.
 *
 * ⛔ WHAT A BOUNDING BOX CANNOT SEE. Card "Details" and share reach through ::after, so every tap figure here is
 * a HIT EXTENT measured with elementFromPoint (which hit-tests pseudo-elements as their owner), never a rect.
 *
 * ⛔ PINNED CHROME IS MEASURED SCROLLED, AND FLOATING OVERLAYS ARE COUNTED SEPARATELY WITH WHAT THEY COVER.
 * Every capture before 2026-09-16 counted bars wider than 60% of the screen only, so the 237px on /markets
 * could not see the chat bubble that sits on the cards (plan §3b, D3). Here a floating overlay is reported with
 * its rectangle AND the controls under it, at rest and while scrolled.
 *
 * Read-only: it navigates, scrolls and screenshots. It never submits a form, bets or changes a setting.
 * Frames and JSON go to .qa-shots/ (gitignored, DESIGN_AUTHORITY §0b); only numbers are written into docs.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, recorder, loginOnce, measureClipping } from "./harness.mjs";
import { clippedControls } from "./clip.mjs";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const env = (k, d) => (process.env[k] ?? "").trim() || d;
const list = (k, d) => env(k, d).split(",").map((s) => s.trim()).filter(Boolean);

/**
 * The numbers a COMPARE diffs. ⭐ They are also what gets COMMITTED as a unit's baseline
 * (`scripts/live/baselines/mobile-visual-*.json`, via COMPACT_FROM): the frames and the full JSON stay in the gitignored
 * .qa-shots/, but a "before" that only exists on one laptop cannot be compared against from another — and production's
 * "before" can never be re-captured once the unit ships.
 */
function structural(r) {
  const g = r.geometry ?? {};
  return {
    "cards.livePriced.med": g.cards?.livePriced?.med, "cards.livePriced.max": g.cards?.livePriced?.max,
    "cards.closed.med": g.cards?.closed?.med, "updownCards.max": g.updownCards ? Math.max(...g.updownCards) : undefined,
    "gridGap": g.gridGap, "authPills.h": g.authPills?.[0]?.h, "bubble.w": g.bubble?.w,
    "closingRows.med": g.closingRows?.med, "countdown.tiles": g.countdown?.tiles, "authFieldW": g.authFieldW,
    "footerLinks.min": g.footerLinks?.min, "hero.ctaH": g.hero?.ctaH?.[0], "hero.ledePx": g.hero?.ledePx,
    "pinnedPx.scrolled": r.scrolled?.pinnedPx, "share.w": r.share?.w, "share.h": r.share?.h,
  };
}
const compactRows = (rows) => rows.filter((r) => r.geometry)
  .map((r) => ({ cell: r.cell, locale: r.locale, density: r.density, who: r.who, route: r.route, s: structural(r) }));

// COMPACT_FROM=<index.json> [COMPACT_OUT=<file>] — write the committed baseline from a finished run, then stop.
if (process.env.COMPACT_FROM) {
  const full = JSON.parse(readFileSync(process.env.COMPACT_FROM, "utf8"));
  const out = process.env.COMPACT_OUT || join(dirname(process.env.COMPACT_FROM), "structural.json");
  writeFileSync(out, JSON.stringify({ meta: full.meta, summary: full.summary, rows: compactRows(full.rows) }, null, 1) + "\n");
  console.log(`compact baseline: ${compactRows(full.rows).length} pages → ${out}`);
  process.exit(0);
}

/* ── The §11 test matrix ─────────────────────────────────────────────────────────────────────── */
const UA_PHONE =
  "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Mobile Safari/537.36";
const UA_DESK =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36";
const PRESETS = {
  "320x640": { w: 320, h: 640, dpr: 2, phone: true },       // small Android: SW overflows first here
  "360x640": { w: 360, h: 640, dpr: 2, phone: true },       // budget Android, short screen
  "360x780": { w: 360, h: 780, dpr: 2, phone: true },       // THE primary cell: every §11 "before" is quoted here
  "412x915": { w: 412, h: 915, dpr: 2.625, phone: true },   // mid Android
  "780x360": { w: 780, h: 360, dpr: 2, phone: true },       // landscape: misses every "< 640px" phone rule
  "768x1024": { w: 768, h: 1024, dpr: 2, phone: true },     // tablet: first width of the ≥ 640 zero-diff control
  "1280x800": { w: 1280, h: 800, dpr: 1, phone: false },    // desktop control, mouse
};
for (const p of Object.values(PRESETS)) p.ua = p.phone ? UA_PHONE : UA_DESK;
if (!Object.values(PRESETS).every((p) => /HeadlessChrome/.test(p.ua))) {
  console.error("REFUSING TO RUN: a user agent has no HeadlessChrome marker, so /api/pv would count this drive as real visitors.");
  process.exit(2);
}
const CELL_SETS = { primary: ["360x780"], phone: ["320x640", "360x780", "412x915"], full: Object.keys(PRESETS) };
const CELLS = CELL_SETS[env("CELLS", "full")] ?? list("CELLS", "");
for (const c of CELLS) if (!PRESETS[c]) { console.error(`unknown cell "${c}" — have ${Object.keys(PRESETS).join(", ")}`); process.exit(2); }
const LOCALES = list("LOCALES", "sw,en,zh");
const WHO = env("WHO", "guest");
const SIGNED_IN = WHO !== "guest";
const DENSITY_ENV = process.env.DENSITIES ? list("DENSITIES", "") : null;
const densitiesFor = (cell) => DENSITY_ENV ?? (cell === "360x780" ? ["compact", "comfortable"] : ["compact"]);
const AUTH_ROUTES = ["login", "register", "forgot"];
const ROUTES = list("ROUTES", "home,markets,detail,updown,live,results,leaderboard,help,login,register,forgot")
  .filter((r) => !(SIGNED_IN && AUTH_ROUTES.includes(r)));   // a signed-in player is redirected off the auth pages
const PATHS = {
  home: "/", markets: "/markets", updown: "/updown", live: "/live", results: "/results", leaderboard: "/leaderboard",
  help: "/help", login: "/auth/login", register: "/auth/register", forgot: "/auth/forgot-password",
};
const UNIT = env("UNIT", "U1"), PHASE = env("PHASE", "before"), TAG = env("TAG", WHO);
const OUT = join(REPO, ".qa-shots", "mobile-visual", UNIT, PHASE, TAG);
const SHOTS = env("SHOTS", "readers");
// The frames the plan's sign-off sheets and §11 step 4 read: 360 SW/EN/ZH, 412 EN, 320 SW, landscape SW, desktop EN.
const READER_CELLS = { "360x780": ["sw", "en", "zh"], "412x915": ["en"], "320x640": ["sw"], "780x360": ["sw"], "1280x800": ["en"] };
const wantsShots = (cell, loc, density) =>
  SHOTS === "all" || (SHOTS === "readers" && (READER_CELLS[cell] ?? []).includes(loc) && density === densitiesFor(cell)[0]);
const MOTION = env("MOTION", "full");
const RED = process.env.RED === "1";
const COMPARE = env("COMPARE", "");
const TOL = Number(env("TOL", "1"));

/* The stylesheets every page gets after it settles. KILL stops entrance motion and the bubble pulse, so every
 * figure is the element AT REST; RED is the instrument's own RED control. */
const KILL = "*{transition:none!important;animation:none!important;caret-color:transparent!important} nextjs-portal{display:none!important}";
const RED_CSS = ".mcardp{padding:40px!important}";

/* ── In-page measurements (real functions, never strings — E-191) ────────────────────────────── */

/** Identity of the page: the premises every number below depends on. */
function pageIdentity() {
  const de = document.documentElement;
  return {
    path: location.pathname, lang: de.lang, density: de.getAttribute("data-density"), motion: de.getAttribute("data-motion"),
    uaMarker: /HeadlessChrome/.test(navigator.userAgent), vw: innerWidth, vh: innerHeight,
    docH: de.scrollHeight, screens: +(de.scrollHeight / innerHeight).toFixed(2),
    signedIn: !!document.querySelector('[data-testid="wallet-balance-capsule"]'),
    h1: (document.querySelector("main h1, h1")?.textContent || "").trim().slice(0, 60),
    appError: /application error|this page couldn.t load|something went wrong/i.test(document.body.innerText.slice(0, 4000)),
    dpl: de.getAttribute("data-dpl-id"),
  };
}

/** Static geometry: things whose size does not depend on the scroll position. */
function staticGeometry(route) {
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05 && !el.closest("[aria-hidden='true']");
  };
  const H = (el) => Math.round(el.getBoundingClientRect().height);
  const W = (el) => Math.round(el.getBoundingClientRect().width);
  const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
  const out = { route };

  // Market cards (keyed on data-row-id, so the Up & Down card — same .mcardp shell — is not mixed in).
  const cards = [...document.querySelectorAll(".mcardp[data-row-id]")].filter(vis).map((c) => {
    const unpriced = !!c.querySelector(".mcardp-pct--empty, .mcardp-nobets");
    const closed = !!c.querySelector(".mcardp-actions--single");
    const live = c.tagName === "ARTICLE";
    return { h: H(c), state: closed ? "closed" : live ? (unpriced ? "live-unpriced" : "live-priced") : "other", spark: !!c.querySelector(".mcardp-spark") };
  });
  if (cards.length) {
    const by = (st) => cards.filter((c) => c.state === st).map((c) => c.h);
    out.cards = {
      n: cards.length, all: cards.map((c) => c.h),
      livePriced: { n: by("live-priced").length, min: Math.min(...by("live-priced")), med: med(by("live-priced")), max: Math.max(...by("live-priced")) },
      liveUnpriced: { n: by("live-unpriced").length, med: med(by("live-unpriced")) },
      closed: { n: by("closed").length, med: med(by("closed")) },
      withSpark: med(cards.filter((c) => c.spark).map((c) => c.h)), withoutSpark: med(cards.filter((c) => !c.spark).map((c) => c.h)),
    };
    for (const k of ["livePriced"]) if (!out.cards[k].n) out.cards[k] = { n: 0 };
    const first = document.querySelector(".mcardp[data-row-id]");
    out.firstCardY = Math.round(first.getBoundingClientRect().top + scrollY);
    const grid = first.closest(".market-grid");
    if (grid) out.gridGap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  }
  const ud = [...document.querySelectorAll(".mcardp:not([data-row-id])")].filter(vis).map(H);
  if (ud.length) out.updownCards = ud;

  // Header auth pills (E-276: both visible at every width, same height).
  const pills = [...document.querySelectorAll("header.app-topbar a.kp-auth-cta")].filter(vis);
  if (pills.length) out.authPills = pills.map((p) => ({ h: H(p), w: W(p), right: Math.round(p.getBoundingClientRect().right) }));

  // The chat bubble (D3 / U7): the button and its fixed wrapper.
  const bubble = document.querySelector(".cm-bubble");
  if (bubble && vis(bubble)) {
    const r = bubble.getBoundingClientRect();
    out.bubble = { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(innerWidth - r.right), bottom: Math.round(innerHeight - r.bottom) };
  } else out.bubble = null;

  // Home: hero, closing-soonest rows, topic tiles.
  const hero = document.querySelector("section.kp-hero");
  if (hero && vis(hero)) {
    out.hero = { h: H(hero) };
    const proof = document.querySelector(".kp-proof"); if (proof && vis(proof)) out.hero.proofH = H(proof);
    const lede = document.querySelector(".kp-hero__lede"); if (lede) out.hero.ledePx = parseFloat(getComputedStyle(lede).fontSize);
    const ctas = [...document.querySelectorAll(".kp-hero__ctas .btn")].filter(vis); if (ctas.length) out.hero.ctaH = ctas.map(H);
  }
  const qrows = [...document.querySelectorAll(".kp-qboard > a.kp-qrow")].filter(vis).map(H);
  if (qrows.length) out.closingRows = { n: qrows.length, med: med(qrows), max: Math.max(...qrows) };

  // Market detail: the countdown panel (U8) — its box and how many tiles it shows.
  const timer = document.querySelector('time[data-testid="timer-date"]');
  if (timer) {
    const panel = timer.closest(".glass-panel");
    if (panel && vis(panel)) out.countdown = { h: H(panel), tiles: panel.querySelectorAll("div.min-w-\\[56px\\]").length };
  }

  // /live: the featured carousel and the hero box around it.
  const car = document.querySelector('[aria-roledescription="carousel"]');
  if (car && vis(car)) out.liveFeatured = { h: H(car) };

  // /help: the contact rows (scoped to main — the footer also carries tel:/mailto: links).
  const tel = document.querySelector('main a[href^="tel:"]');
  const sec = tel?.closest("section");
  if (sec) out.helpRows = [...sec.querySelectorAll(":scope > div, :scope > * > div.glass-panel")].filter(vis).map(H).filter((h) => h > 30);

  // Auth pages: the field box width (the first field in the panel).
  const field = document.querySelector("main section.glass-panel .field-measure, main .glass-panel .field-measure");
  if (field && vis(field)) out.authFieldW = W(field);

  // Footer link rows (FooterLink declares no height; social rows are 44).
  const flinks = [...document.querySelectorAll("footer li > a:not([target=_blank])")].filter(vis).map(H);
  if (flinks.length) out.footerLinks = { n: flinks.length, min: Math.min(...flinks), med: med(flinks) };

  // Board chrome glyph sizes (plan §11: "9 in board chrome alone").
  // Icons are aria-hidden by design, so this census uses the box test only, not vis()'s aria-hidden exclusion.
  const shown = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const chrome = [...document.querySelectorAll("header.app-topbar svg, .kp-discovery-bar svg, nav.kp-rail svg")].filter(shown);
  if (chrome.length) out.chromeGlyphs = [...new Set(chrome.map((s) => `${W(s)}x${H(s)}`))].sort();

  return out;
}

/** Pinned chrome and floating overlays at the CURRENT scroll position, with what each overlay covers. */
function pinnedAndFloating() {
  const vw = innerWidth, vh = innerHeight;
  const vis = (el) => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05;
  };
  const label = (el) => (el.getAttribute("aria-label") || el.querySelector("[aria-label]")?.getAttribute("aria-label")
    || el.id || (el.className?.baseVal ?? el.className ?? "").toString() || el.tagName).toString().replace(/\s+/g, " ").slice(0, 48);
  const pos = (el) => getComputedStyle(el).position;
  const pinnedEls = [], floating = [];
  for (const el of document.querySelectorAll("body *")) {
    const p = pos(el);
    if (p !== "fixed" && p !== "sticky") continue;
    if (!vis(el)) continue;
    // Count the OUTER box once: skip anything inside another fixed/sticky element.
    let a = el.parentElement, nested = false;
    while (a && a !== document.body) { const q = pos(a); if (q === "fixed" || q === "sticky") { nested = true; break; } a = a.parentElement; }
    if (nested) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= vh) continue;                                   // not on screen right now
    if (r.width > vw * 0.6 && r.height > 20) {
      // A sticky bar only costs space once it is STUCK (its top sits on its declared offset).
      const s = getComputedStyle(el);
      const stuck = p === "fixed" || Math.abs(r.top - (parseFloat(s.top) || 0)) <= 1;
      if (stuck) pinnedEls.push({ el, top: Math.round(r.top), h: Math.round(Math.min(r.bottom, vh) - Math.max(r.top, 0)), pos: p, label: label(el) });
    } else if (p === "fixed" && r.width >= 24 && r.height >= 24) {
      floating.push({ el, left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), label: label(el) });
    }
  }
  // What a floating overlay sits on: the interactive element under a 5×5 sample of its box.
  const INTERACTIVE = "a[href],button,[role=button],[role=tab],[role=link],[role=menuitem],input,select,summary,textarea";
  for (const f of floating) {
    const covered = new Set();
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const x = f.left + ((i + 0.5) * f.w) / 5, y = f.top + ((j + 0.5) * f.h) / 5;
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      const under = document.elementsFromPoint(x, y).find((e) => !f.el.contains(e) && !pinnedEls.some((p) => p.el.contains(e)));
      const ctl = under?.closest(INTERACTIVE);
      if (ctl) covered.add(((ctl.getAttribute("aria-label") || ctl.textContent || ctl.tagName).trim().replace(/\s+/g, " ").slice(0, 40)));
    }
    f.covers = [...covered];
  }
  return {
    scrollY: Math.round(scrollY),
    pinned: pinnedEls.map(({ el, ...p }) => p), pinnedPx: pinnedEls.reduce((a, p) => a + p.h, 0),
    floating: floating.map(({ el, ...f }) => f),
  };
}

/**
 * Tap reach of every control fully inside the unobstructed band of the viewport, by HIT EXTENT: a horizontal and a
 * vertical scan through the control's centre with elementFromPoint, taking the contiguous run that hits the control.
 * `skip` carries indexes already measured in an earlier tile.
 */
function tapReach(args) {
  const { bandTop, bandBottom, done } = args;
  const vw = innerWidth;
  const SEL = "a[href],button,[role=button],[role=tab],[role=switch],[role=checkbox],[role=menuitem],[role=menuitemcheckbox],input:not([type=hidden]),select,summary,textarea";
  const all = [...document.querySelectorAll(SEL)];
  const results = [];
  const hits = (el, x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
  // A control's OWN reach is measured with the floating overlays (the chat bubble) lifted out of the way: what an
  // overlay covers is reported separately (pinnedAndFloating().covers), and counting it here too would file the
  // bubble's D3 as a dozen short controls. Restored before returning.
  const lifted = [];
  for (const el of document.querySelectorAll("body *")) {
    const s = getComputedStyle(el);
    if (s.position !== "fixed" || s.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.width <= vw * 0.6) { lifted.push([el, el.style.visibility]); el.style.visibility = "hidden"; }
  }
  all.forEach((el, idx) => {
    if (done.includes(idx)) return;
    if (el.closest("[aria-hidden='true'], details:not([open]) > :not(summary), #needle-root, nextjs-portal")) return;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || +s.opacity < 0.05) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;                                  // sr-only
    if (r.top < bandTop || r.bottom > bandBottom || r.left < 0 || r.right > vw) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!hits(el, cx, cy)) return;                                             // covered by something else here
    const run = (fixed, from, to, horiz) => {
      let lo = null, hi = null;
      const c = horiz ? cx : cy;
      for (let v = Math.round(c); v >= from; v--) { if (hits(el, horiz ? v : fixed, horiz ? fixed : v)) lo = v; else break; }
      for (let v = Math.round(c); v <= to; v++) { if (hits(el, horiz ? v : fixed, horiz ? fixed : v)) hi = v; else break; }
      return lo === null || hi === null ? 0 : hi - lo + 1;
    };
    const w = run(cy, Math.max(0, r.left - 24), Math.min(vw - 1, r.right + 24), true);
    const h = run(cx, Math.max(bandTop, r.top - 24), Math.min(bandBottom - 1, r.bottom + 24), false);
    const inline = s.display === "inline" && !!el.closest("p, li") && el.tagName === "A";
    const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 36);
    results.push({ idx, w, h, inline, name, tag: el.tagName.toLowerCase() });
  });
  for (const [el, v] of lifted) el.style.visibility = v;
  return results;
}

/** The share control's reach on the first market card on screen (D28): the exact figure the plan quotes. */
function shareReach() {
  const card = [...document.querySelectorAll(".mcardp[data-row-id]")].find((c) => {
    const r = c.getBoundingClientRect(); return r.top > innerHeight * 0.2 && r.bottom < innerHeight * 0.9;
  });
  const btn = card?.querySelector(".mcardp-share");
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hits = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === btn || btn.contains(t)); };
  const run = (horiz) => {
    let lo = null, hi = null;
    for (let d = 0; d <= 60; d++) { const v = (horiz ? cx : cy) - d; if (hits(horiz ? v : cx, horiz ? cy : v)) lo = v; else if (d > 0) break; }
    for (let d = 0; d <= 60; d++) { const v = (horiz ? cx : cy) + d; if (hits(horiz ? v : cx, horiz ? cy : v)) hi = v; else if (d > 0) break; }
    return lo === null || hi === null ? 0 : Math.round(hi - lo + 1);
  };
  return { glyph: `${Math.round(r.width)}x${Math.round(r.height)}`, w: run(true), h: run(false) };
}

/* ── Driving ─────────────────────────────────────────────────────────────────────────────────── */
const R = recorder(`qa:mobile-visual — ${BASE} · who=${WHO} · cells=${CELLS.join(",")} · locales=${LOCALES.join(",")}${RED ? " · ⛔ RED CONTROL" : ""}`);
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const host = new URL(BASE).hostname;

let state = null;
if (WHO === "demo") {
  // Local only: /auth/demo is a 404 in production (src/app/auth/demo/route.ts). One session, reused.
  const ctx = await b.newContext();
  const res = await ctx.request.get(`${BASE}/auth/demo`);
  state = await ctx.storageState();
  state.cookies = state.cookies.filter((c) => c.name !== "kp-locale");
  await ctx.close();
  if (!R.check("demo session issued", res.ok() && state.cookies.some((c) => c.name === "kp_session"), `status ${res.status()}`)) process.exit(1);
} else if (SIGNED_IN) {
  state = await loginOnce(b, WHO);            // ONE sign-in for the whole matrix (a second login revokes the first)
  R.check(`signed in once as ${WHO}`, state.cookies.some((c) => c.name === "kp_session"));
}

async function cellContext(cell, locale, density) {
  const p = PRESETS[cell];
  const ctx = await b.newContext({
    viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, isMobile: p.phone, hasTouch: p.phone, userAgent: p.ua,
    ...(state ? { storageState: state } : {}),
  });
  const cookies = [{ name: "kp-locale", value: locale, domain: host, path: "/" }];
  if (density === "comfortable") cookies.push({ name: "kp-density", value: "comfortable", domain: host, path: "/" });
  await ctx.addCookies(cookies);
  const cores = MOTION === "reduced" ? 4 : 8;
  await ctx.addInitScript(({ cores }) => {
    // Pin the device tier the site derives from the host (theme-provider.tsx), or the laptop decides it.
    try { Object.defineProperty(navigator, "hardwareConcurrency", { get: () => cores }); } catch {}
    try { Object.defineProperty(navigator, "deviceMemory", { get: () => cores }); } catch {}
    try {
      localStorage.setItem("50pick-primer-seen", "1");                     // the primer is photographed on purpose only
      localStorage.setItem("50pick-analytics-consent", JSON.stringify({ v: 1, choice: "denied", at: Date.now() }));
    } catch {}
  }, { cores });
  return ctx;
}

/** A live market for the detail page, picked once so every cell measures the SAME market. */
async function pickMarket() {
  if (process.env.MARKET) return process.env.MARKET;
  const ctx = await cellContext("360x780", LOCALES[0], "compact");
  const p = await ctx.newPage();
  await p.goto(`${BASE}/markets`, { waitUntil: "load", timeout: 60000 }).catch(() => {});
  await p.waitForSelector(".mcardp[data-row-id]", { timeout: 20000 }).catch(() => {});
  const id = await p.evaluate(() => {
    const live = [...document.querySelectorAll("article.mcardp[data-row-id]")].find((c) => !c.querySelector(".mcardp-pct--empty, .mcardp-nobets"))
      ?? document.querySelector("article.mcardp[data-row-id]");
    const a = live?.querySelector('a[href^="/markets/mkt_"]') ?? document.querySelector('a[href^="/markets/mkt_"]');
    return a ? a.getAttribute("href").split(/[/?#]/)[2] : null;
  });
  await ctx.close();
  return id;
}

const market = ROUTES.includes("detail") ? await pickMarket() : null;
if (ROUTES.includes("detail")) R.check("a live market to measure the detail page on", !!market, "no market linked from /markets");
PATHS.detail = market ? `/markets/${market}` : null;

const rows = [];
let servedDpl = null;
for (const cell of CELLS) {
  const p = PRESETS[cell];
  const cellRoutes = ROUTES.filter((r) => PATHS[r] && (!AUTH_ROUTES.includes(r) || ["320x640", "360x780"].includes(cell)));
  for (const locale of LOCALES) {
    for (const density of densitiesFor(cell)) {
      const ctx = await cellContext(cell, locale, density);
      const shoot = wantsShots(cell, locale, density);
      const shotDir = join(OUT, "tiles", `${cell}-${locale}-${density}`);
      if (shoot) mkdirSync(shotDir, { recursive: true });
      for (const route of cellRoutes) {
        const page = await ctx.newPage();
        const row = { cell, locale, density, who: WHO, route, path: PATHS[route] };
        const name = `${cell} ${locale} ${density} ${route}`;
        try {
          const resp = await page.goto(BASE + PATHS[route], { waitUntil: "load", timeout: 60000 });
          row.status = resp?.status() ?? null;
          await page.waitForSelector("main", { timeout: 15000 }).catch(() => {});
          if (["markets", "results", "home"].includes(route)) await page.waitForSelector(".mcardp[data-row-id]", { timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(2500);                               // `networkidle` never fires on www (live stream)
          await page.addStyleTag({ content: KILL + (RED ? RED_CSS : "") });
          await page.waitForTimeout(700);
          const id = await page.evaluate(pageIdentity);
          Object.assign(row, { identity: id });
          // The deployed commit is stamped on <html data-dpl-id> in the SERVED markup (plan §0 trap) and is gone
          // after hydration, so it is read from the response, never the live DOM.
          if (!servedDpl) servedDpl = (await resp?.text().catch(() => ""))?.match(/data-dpl-id="([0-9a-f]{7,40})"/)?.[1] ?? null;
          // Premises: refuse to report a number measured on the wrong page (skill §5b).
          const okLang = id.lang === locale, okUa = id.uaMarker;
          const okSession = SIGNED_IN ? id.signedIn : !id.signedIn;
          const okPath = id.path === PATHS[route].split("?")[0];
          const premise = okLang && okUa && okSession && okPath && !id.appError && (row.status ?? 200) < 400;
          R.check(`${name}: premises (lang ${id.lang}, UA marker, ${SIGNED_IN ? "signed in" : "signed out"}, on ${id.path}, status ${row.status})`, premise,
            [!okLang && `lang ${id.lang}≠${locale}`, !okUa && "no HeadlessChrome in navigator.userAgent", !okSession && `signedIn=${id.signedIn}`,
              !okPath && `landed on ${id.path}`, id.appError && "error page"].filter(Boolean).join(", "));
          if (!premise) { row.refused = true; rows.push(row); await page.close(); continue; }

          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(200);
          row.geometry = await page.evaluate(staticGeometry, route);
          row.atRest = await page.evaluate(pinnedAndFloating);
          // Scrolled: far enough that a sticky bar is stuck, never past the end.
          const y = Math.max(0, Math.min(id.docH - id.vh, Math.round(id.vh * 1.2)));
          await page.evaluate((y) => window.scrollTo(0, y), y);
          await page.waitForTimeout(350);
          row.scrolled = await page.evaluate(pinnedAndFloating);
          if (route === "markets" && row.geometry.cards?.livePriced?.med) {
            const card = row.geometry.cards.livePriced.med + (row.geometry.gridGap ?? 0);
            row.cardsVisible = +((id.vh - row.scrolled.pinnedPx) / card).toFixed(2);
          }
          // Tap reach, tile by tile through the unobstructed band (between the stuck top bars and the rail).
          const topBars = row.scrolled.pinned.filter((q) => q.top < id.vh / 2).reduce((a, q) => Math.max(a, q.top + q.h), 0);
          const bottomBars = row.scrolled.pinned.filter((q) => q.top >= id.vh / 2).reduce((a, q) => Math.max(a, q.h), 0);
          const step = Math.max(120, id.vh - 96);
          const nTiles = Math.min(Math.ceil(id.docH / step), 6);
          const reach = [];
          const tiles = [];
          for (let i = 0; i < nTiles; i++) {
            await page.evaluate((y) => window.scrollTo(0, y), i * step);
            await page.waitForTimeout(250);
            const band = i === 0 ? { bandTop: 0, bandBottom: id.vh - bottomBars } : { bandTop: topBars, bandBottom: id.vh - bottomBars };
            reach.push(...(await page.evaluate(tapReach, { ...band, done: reach.map((q) => q.idx) })));
            if (shoot) {
              const f = `${route}__t${String(i).padStart(2, "0")}.png`;
              await page.screenshot({ path: join(shotDir, f) });
              tiles.push(f);
            }
          }
          if (shoot && nTiles > 1) {                                       // the last screen, so the footer is in the set
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await page.waitForTimeout(300);
            const f = `${route}__tlast.png`;
            await page.screenshot({ path: join(shotDir, f) });
            tiles.push(f);
          }
          const under = reach.filter((q) => !q.inline && (q.w < 40 || q.h < 40));
          row.tap = { measured: reach.length, under40: under.length, inlineLinks: reach.filter((q) => q.inline).length,
            sample: under.slice(0, 15).map((q) => `${q.tag}"${q.name}" ${q.w}x${q.h}`) };
          if (["markets", "results", "home"].includes(route)) {
            const target = await page.evaluate(() => {
              const c = [...document.querySelectorAll(".mcardp[data-row-id]")].find((c) => c.querySelector(".mcardp-share"));
              return c ? Math.round(c.getBoundingClientRect().top + scrollY) : null;
            });
            if (target !== null) {
              await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - innerHeight * 0.3)), target);
              await page.waitForTimeout(250);
              row.share = await page.evaluate(shareReach);
            }
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          row.clipped = await measureClipping(page, "body", 200);
          row.offscreenControls = await clippedControls(page, "body");
          row.tiles = tiles;
        } catch (e) {
          row.error = String(e.message).split("\n")[0];
          R.check(`${name}: measured`, false, row.error);
        }
        rows.push(row);
        await page.close();
      }
      await ctx.close();
      console.log(`    · ${cell} ${locale} ${density}: ${cellRoutes.length} routes`);
    }
  }
}
await b.close();

/* ── The §11 "before" table, derived from the rows ───────────────────────────────────────────── */
const pick = (cell, locale, route, density = "compact") =>
  rows.find((r) => r.cell === cell && r.locale === locale && r.route === route && r.density === density && !r.refused && !r.error);
function summaryFor(cell, locale) {
  const m = pick(cell, locale, "markets"), h = pick(cell, locale, "home"), d = pick(cell, locale, "detail"),
    u = pick(cell, locale, "updown"), l = pick(cell, locale, "live"), hp = pick(cell, locale, "help"), lg = pick(cell, locale, "login");
  const fields = AUTH_ROUTES.map((r) => pick(cell, locale, r)).filter(Boolean).map((r) => `${r.route} ${r.geometry.authFieldW ?? "—"}`);
  return {
    cell, locale,
    cardLivePriced: m?.geometry.cards?.livePriced, cardsAll: m?.geometry.cards && { min: Math.min(...m.geometry.cards.all), max: Math.max(...m.geometry.cards.all) },
    cardsVisible: m?.cardsVisible ?? null, pinnedMarkets: m?.scrolled.pinnedPx ?? null,
    pinnedBars: m?.scrolled.pinned.map((q) => `${q.label} ${q.h}`),
    homeScreens: h?.identity.screens ?? null, heroH: h?.geometry.hero?.h ?? null, heroCtaH: h?.geometry.hero?.ctaH ?? null,
    closingRow: h?.geometry.closingRows?.med ?? null,
    authPills: (lg ?? h)?.geometry.authPills ?? null,
    bubble: m?.geometry.bubble ?? null, bubbleCovers: [...new Set(rows.filter((r) => r.cell === cell && r.locale === locale && r.scrolled)
      .flatMap((r) => [...r.atRest.floating, ...r.scrolled.floating]).flatMap((f) => f.covers))].slice(0, 12),
    countdown: d?.geometry.countdown ?? null, updownCards: u?.geometry.updownCards ?? null,
    liveFeatured: l?.geometry.liveFeatured?.h ?? null, helpRows: hp?.geometry.helpRows ?? null, authFieldW: fields,
    footerLinks: (h ?? m)?.geometry.footerLinks ?? null, share: m?.share ?? null,
    under40: Object.fromEntries(rows.filter((r) => r.cell === cell && r.locale === locale && r.tap && r.density === "compact").map((r) => [r.route, r.tap.under40])),
    clipped: Object.fromEntries(rows.filter((r) => r.cell === cell && r.locale === locale && r.clipped && r.density === "compact")
      .filter((r) => r.clipped.length).map((r) => [r.route, r.clipped.map((c) => `"${c.text}" +${c.over}`).slice(0, 4)])),
    chromeGlyphs: m?.geometry.chromeGlyphs ?? null,
  };
}
const summary = [];
for (const cell of CELLS) for (const locale of LOCALES) if (rows.some((r) => r.cell === cell && r.locale === locale)) summary.push(summaryFor(cell, locale));

// Noise floor: the same cell with the two density cookies. Before U2 the cookie is inert, so these MUST agree.
const pairs = rows.filter((r) => r.density === "comfortable" && r.geometry)
  .map((c) => [pick(c.cell, c.locale, c.route, "compact"), c]).filter(([a]) => a);

/* ── Structural comparison (COMPARE / RED) ───────────────────────────────────────────────────── */
const diffs = [];
/** `now` and `was` are structural() maps. */
function compareTo(now, was, label) {
  for (const k of Object.keys(now)) {
    if (now[k] === undefined || was[k] === undefined || now[k] === null || was[k] === null) continue;
    if (Math.abs(now[k] - was[k]) > TOL) diffs.push(`${label} ${k}: ${was[k]} → ${now[k]}`);
  }
}
for (const [a, c] of pairs) compareTo(structural(c), structural(a), `noise-floor ${c.cell} ${c.locale} ${c.route} compact→comfortable`);
const noiseDiffs = diffs.length;
if (pairs.length) R.check(`the two density cookies agree on ${pairs.length} paired pages (before U2 the cookie is inert — the instrument's noise floor)`,
  noiseDiffs === 0, diffs.slice(0, 6).join(" · "));

if (COMPARE) {
  const basePath = existsSync(COMPARE) && COMPARE.endsWith(".json") ? COMPARE : join(COMPARE, "index.json");
  const base = JSON.parse(readFileSync(basePath, "utf8"));
  // Either a full run (rows carry geometry) or a committed compact baseline (rows carry `s`).
  const baseRows = base.rows.map((x) => (x.s ? x : x.geometry ? { ...x, s: structural(x) } : null)).filter(Boolean);
  let matched = 0;
  const before = diffs.length;
  for (const r of rows.filter((r) => r.geometry)) {
    // A baseline recorded before U2 has no comfortable cells: the cookie was inert, so compact stands for both.
    const same = (x) => x.cell === r.cell && x.locale === r.locale && x.route === r.route && x.who === r.who;
    const bRow = baseRows.find((x) => same(x) && x.density === r.density) ?? baseRows.find(same);
    if (!bRow) continue;
    matched++;
    compareTo(structural(r), bRow.s, `${r.cell} ${r.locale} ${r.density} ${r.route}`);
  }
  R.check(`compared ${matched} pages against ${basePath}`, matched > 0);
  R.check(`structural geometry matches the baseline within ${TOL}px`, diffs.length === before, diffs.slice(before, before + 12).join(" · "));
}

const index = { meta: { base: BASE, who: WHO, unit: UNIT, phase: PHASE, red: RED, motion: MOTION, cells: CELLS, locales: LOCALES,
  routes: ROUTES, market, servedDpl, at: new Date().toISOString() }, summary, rows };
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 1));
writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 1));
writeFileSync(join(OUT, "structural.json"), JSON.stringify({ meta: index.meta, summary, rows: compactRows(rows) }, null, 1) + "\n");

console.log(`\n  served commit (data-dpl-id): ${servedDpl ?? "—"} · market ${market ?? "—"} · ${rows.length} pages · out ${OUT}`);
for (const s of summary) {
  console.log(`\n  ── ${s.cell} ${s.locale} ──`);
  console.log(`    card live-priced ${JSON.stringify(s.cardLivePriced)} · all ${JSON.stringify(s.cardsAll)} · cards visible ${s.cardsVisible}`);
  console.log(`    pinned /markets ${s.pinnedMarkets}px [${(s.pinnedBars ?? []).join(" + ")}] · home ${s.homeScreens} screens · hero ${s.heroH} (CTA ${s.heroCtaH}) · closing row ${s.closingRow}`);
  console.log(`    auth pills ${JSON.stringify(s.authPills)} · bubble ${JSON.stringify(s.bubble)} covers ${JSON.stringify(s.bubbleCovers)}`);
  console.log(`    countdown ${JSON.stringify(s.countdown)} · updown ${JSON.stringify(s.updownCards)} · live featured ${s.liveFeatured} · help rows ${JSON.stringify(s.helpRows)}`);
  console.log(`    auth fields ${s.authFieldW.join(", ")} · footer links ${JSON.stringify(s.footerLinks)} · share reach ${JSON.stringify(s.share)}`);
  console.log(`    under 40px ${JSON.stringify(s.under40)} · glyphs ${JSON.stringify(s.chromeGlyphs)}`);
  if (Object.keys(s.clipped).length) console.log(`    clipped ${JSON.stringify(s.clipped)}`);
}
process.exit(R.done() === 0 ? 0 : 1);
