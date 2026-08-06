/**
 * WCAG contrast audit — RENDERED. The companion to `scripts/contrast-audit.mts`.
 *
 *   contrast-audit.mts  (npm run test:contrast)  — token-level, browser-free.
 *     Proves a hand-listed set of token PAIRS with OKLCH->luminance math. Fast,
 *     deterministic, runs in CI. It can only judge pairs someone thought to list.
 *   contrast-rendered.mjs (this file)            — DOM-level, needs a server.
 *     Walks every real text node on every route and measures it against its real
 *     composited background. Catches the pairs nobody listed: an opacity modifier
 *     (`text-text-faint/60`), a nested translucent panel, a token used on a
 *     surface it was never designed for.
 *
 * Use both. The token audit is the gate; this is the sweep.
 *
 * Why this exists: repairing the Tailwind token bridge (2026-07-28) took
 * `--text-subtle` (L70%) and `--text-faint` (L60%) from "compiles to nothing, so
 * the element inherits its parent's ink" to "actually renders". That is a real
 * darkening of ~1,300 elements, and the design system's own law 9 names
 * "--text-faint 9px body copy" as a failure mode. Eyeballing a screenshot cannot
 * settle 4.5:1; measuring can.
 *
 * It walks every rendered text node, resolves the ACTUAL composited background
 * (climbing ancestors past `transparent`, and compositing any alpha it finds over
 * what is behind it), and computes the WCAG 2.1 contrast ratio.
 *
 *   AA normal text  >= 4.5:1     (< 18px, or < 14px bold)
 *   AA large text   >= 3.0:1     (>= 18px, or >= 14px bold)
 *
 * Usage:
 *   node scripts/contrast-audit.mjs                       # default routes
 *   BASE=http://localhost:3010 node scripts/contrast-audit.mjs
 *   ONLY=/markets,/admin/finance node scripts/contrast-audit.mjs
 *   WIDTHS=360,1280 LOCALES=en,sw node scripts/contrast-audit.mjs
 *   JSON=out.json node scripts/contrast-audit.mjs         # machine-readable diff
 *
 * Exit 1 on any AA failure. Compare a BEFORE run against an AFTER run to prove a
 * token change did not regress contrast anywhere.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3010";
const WIDTHS = (process.env.WIDTHS || "360,1280,1920").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "en").split(",");
const JSON_OUT = process.env.JSON || "";

const PLAYER = [
  "/", "/markets", "/live", "/results", "/leaderboard", "/help", "/fairness",
  "/proposals", "/updown", "/auth/login", "/auth/register", "/legal/terms",
];
const ADMIN = [
  "/admin", "/admin/finance", "/admin/players", "/admin/transactions",
  "/admin/markets", "/admin/config", "/admin/aml", "/admin/reports",
  "/admin/resolver-queue", "/admin/system",
];
const ROUTES = process.env.ONLY ? process.env.ONLY.split(",") : [...PLAYER, ...ADMIN];

/** sRGB -> relative luminance (WCAG 2.1 §relative luminance). */
function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(fg, bg) {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Runs in the page. Returns one record per visible text node with resolved
 * foreground + composited background as rgb triples.
 *
 * getComputedStyle always returns rgb()/rgba() for a colour, even when the
 * authored value was oklch() — the browser has already done the conversion, so
 * this measures what a user's eye actually receives, not what the token says.
 */
const COLLECT = () => {
  /**
   * Resolve ANY CSS colour string to sRGB by painting it into a 1x1 canvas and
   * reading the pixel back.
   *
   * Do NOT parse the computed string. This whole design system is authored in
   * OKLCH, and current Chrome returns `oklch(70% 0.08 268)` verbatim from
   * getComputedStyle rather than converting to rgb() — so a regex for `rgba?(...)`
   * matches nothing and every single node is silently skipped. (That is exactly
   * what happened: "0 text nodes measured", reported as a PASS.) The canvas makes
   * the browser do the conversion, which is also the number the eye receives.
   */
  const cvs = document.createElement("canvas");
  cvs.width = cvs.height = 1;
  const c2d = cvs.getContext("2d", { willReadFrequently: true });
  const parse = (s) => {
    if (!s) return null;
    const str = String(s).trim();
    if (!str || str === "none" || str === "transparent") return { rgb: [0, 0, 0], a: 0 };
    c2d.clearRect(0, 0, 1, 1);
    c2d.fillStyle = "#000";
    const before = c2d.fillStyle;
    c2d.fillStyle = str;
    // An unparseable value leaves fillStyle untouched — reject rather than
    // silently measuring black.
    if (c2d.fillStyle === before && !/^#0{3,8}$|black|rgba?\(0, ?0, ?0/.test(str)) return null;
    c2d.fillRect(0, 0, 1, 1);
    const d = c2d.getImageData(0, 0, 1, 1).data;
    return { rgb: [d[0], d[1], d[2]], a: d[3] / 255 };
  };
  const over = (fg, bg) => fg.rgb.map((c, i) => Math.round(c * fg.a + bg[i] * (1 - fg.a)));

  /**
   * 🔴 E-118 — A GRADIENT IS PAINT, AND `background-color` CANNOT SEE IT.
   *
   * An element painted with `background-image: linear-gradient(…)` reports
   * `background-color: rgba(0, 0, 0, 0)`. The ancestor climb below therefore
   * used to walk straight past it and score the text against whatever sits
   * BEHIND the element. Measured on production: `.chip-resolved` — a gold pill
   * with dark ink, plainly legible — came back at **1.08:1**, `rgb(46,27,0)` on
   * the page canvas `rgb(7,4,90)`, eleven times. ⛔ The direction of that lie is
   * not fixed: it manufactured a failure here, and on light text over a light
   * gradient it would have HIDDEN one by compositing against a dark ancestor.
   *
   * So a gradient contributes its COLOUR STOPS as candidate backgrounds and the
   * caller scores the worst of them — the same rule the token gate applies to
   * `.chip-resolved`, where scoring the light stop instead of the dark one
   * flatters it by ~2 points. A background we cannot decompose at all (a photo,
   * `url()`, `image-set()`) returns "unmeasurable" and is REPORTED as such.
   * ⛔ It is never silently replaced by an ancestor: a node scored against a
   * background it does not have is worse than a node marked unscoreable, because
   * it comes with a number attached.
   */
  const UNMEASURABLE = "unmeasurable";
  const gradientStops = (bgImage) => {
    if (!bgImage || bgImage === "none") return null;
    if (!/gradient\(/.test(bgImage)) return UNMEASURABLE; // url(), image-set(), cross-fade()
    // Chrome serialises stops as lab()/oklch()/color()/rgb() — never as the
    // authored oklch() text, and never as a bare keyword after resolution.
    const re = /(?:lab|lch|oklab|oklch|color|rgba?|hsla?)\([^()]*\)|#[0-9a-f]{3,8}\b/gi;
    const stops = (String(bgImage).match(re) || []).map(parse).filter((s) => s && s.a > 0);
    return stops.length ? stops : UNMEASURABLE;
  };

  /**
   * Climb ancestors compositing every semi-transparent background we meet, and
   * return EVERY candidate background — more than one when a gradient is in the
   * stack. `{ bases: [], unmeasurable: true }` means "do not score this node".
   */
  const bgOf = (el) => {
    const layers = []; // nearest-first; {c} for a colour, {stops} for a gradient
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const stops = gradientStops(cs.backgroundImage);
      if (stops === UNMEASURABLE) return { bases: [], unmeasurable: true };
      if (stops) {
        layers.push({ stops });
        // A gradient with any translucent stop still lets what is behind it
        // through, so the climb continues; an all-opaque one ends it.
        if (stops.every((s) => s.a === 1)) break;
      }
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push({ c }); if (c.a === 1) break; }
      n = n.parentElement;
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor);
    let bases = [root && root.a === 1 ? root.rgb : [10, 12, 40]]; // canvas fallback
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i];
      const next = [];
      for (const b of bases) {
        if (L.c) next.push(over(L.c, b));
        else {
          for (const s of L.stops) next.push(over(s, b));
          // A translucent stop means the base itself is still visible somewhere
          // along the ramp, so it stays a candidate.
          if (L.stops.some((s) => s.a < 1)) next.push(b);
        }
      }
      // Cap: a cross-product of stacked gradients is not worth exploding, and
      // the worst stop of the nearest gradient dominates the verdict anyway.
      bases = next.slice(0, 12);
    }
    return { bases, unmeasurable: false };
  };

  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue?.trim();
    if (!text || text.length < 2) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Gradient text (`background-clip:text` + a transparent fill) reports its
    // `color` as the canvas colour, which measures as 1:1 against itself — a false
    // positive. The visible ink is the background gradient, which WCAG's two-colour
    // model cannot express; those surfaces are judged by eye, not here.
    if (cs.webkitTextFillColor && parse(cs.webkitTextFillColor)?.a === 0) continue;
    if (/text/.test(cs.webkitBackgroundClip || cs.backgroundClip || "")) continue;

    const fg = parse(cs.color);
    if (!fg) continue;
    const size = parseFloat(cs.fontSize) || 16;
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const meta = {
      size, weight,
      large: size >= 18 || (size >= 14 && weight >= 700),
      cls: (el.getAttribute("class") || "").slice(0, 90),
      tag: el.tagName.toLowerCase(),
      text: text.slice(0, 40),
    };
    const { bases, unmeasurable } = bgOf(el);
    if (unmeasurable || !bases.length) { out.push({ ...meta, unmeasurable: true }); continue; }
    // A semi-transparent FOREGROUND is composited over its own background too —
    // `text-text-subtle/60` is a real pattern in this codebase.
    out.push({
      ...meta,
      candidates: bases.map((bg) => ({ fg: fg.a < 1 ? over(fg, bg) : fg.rgb, bg })),
    });
  }
  return out;
};

const browser = await chromium.launch();
const results = [];
let checked = 0, failures = 0, unmeasurable = 0;
const unmeasurableCls = new Set();
// 🔴 E-118 — COVERAGE IS PART OF THE VERDICT. A cell that never loaded used to
// print one SKIP line and then vanish from the arithmetic, so a run in which
// EVERY route failed still reported `PASS — no AA contrast failures`. It is
// reproducible: from Git Bash, MSYS rewrites `ONLY=/results` into
// `C:/Program Files/Git/results`, all four routes SKIP, and the sweep reports
// success over ZERO measurements. A check that would still pass if every
// surface it names had been deleted is not a check.
const cells = { attempted: 0, measured: 0, skipped: [] };

for (const locale of LOCALES) {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    // Same auth pattern as scripts/responsive-audit.mjs — /auth/demo mints a funded
    // player session, seed-admin promotes to ADMIN. Both are dev-only (404 in prod).
    // Admin pages ALSO need the server booted with DISABLE_ADMIN_TOTP=true, or every
    // /admin/* renders the 2FA gate and the numbers below would be false coverage.
    await ctx.request.get(`${BASE}/auth/demo`).catch(() => {});
    await ctx.request.post(`${BASE}/api/dev-test/seed-admin`).catch(() => {});
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();

    for (const route of ROUTES) {
      cells.attempted++;
      try {
        // 60s + `load`: the FIRST hit of a route on a dev server pays a ~30s
        // Turbopack compile, and `domcontentloaded` can fire on a partially
        // streamed document — which silently measured ~1 text node per route
        // instead of hundreds. Wait for `load`, then let the client settle.
        await page.goto(BASE + route, { waitUntil: "load", timeout: 60000 });
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(400);
      } catch (e) {
        // ⚠️ SAY WHY. "did not load" with no cause sent one session hunting a
        // network problem that was a mangled argument (MSYS turning
        // `ONLY=/results` into `C:/Program Files/Git/results`). A skip reason is
        // the difference between a coverage gap you can fix and one you re-run.
        const why = String(e?.message ?? e).split("\n")[0].slice(0, 120);
        console.log(`  SKIP ${route} @${w}/${locale} — did not load: ${why}`);
        cells.skipped.push(`${route} @${w}/${locale} — ${why}`);
        continue;
      }
      // Sanity floor: a real page has more than a handful of text nodes. If this
      // trips, the audit is measuring a skeleton and its "PASS" would be a lie.
      const nodeCount = await page
        .evaluate(() => document.body.innerText.trim().length)
        .catch(() => -1);
      if (nodeCount >= 0 && nodeCount < 200) {
        console.log(`  THIN ${route} @${w}/${locale} — only ${nodeCount} chars of text`);
      }
      let rows = [];
      try { rows = await page.evaluate(COLLECT); } catch {
        console.log(`  SKIP ${route} @${w}/${locale} — context destroyed mid-measure`);
        cells.skipped.push(`${route} @${w}/${locale} (context destroyed)`);
        continue;
      }
      cells.measured++;

      for (const r of rows) {
        if (r.unmeasurable) { unmeasurable++; unmeasurableCls.add(`${r.tag}.${r.cls}`); continue; }
        const need = r.large ? 3.0 : 4.5;
        // ⛔ THE WORST CANDIDATE WINS. A gradient offers several backgrounds and
        // the honest bar is the one that reads worst — scoring the flattering
        // stop is how a legible-looking screenshot survives an illegible ramp.
        let got = Infinity, worst = r.candidates[0];
        for (const c of r.candidates) {
          const v = ratio(c.fg, c.bg);
          if (v < got) { got = v; worst = c; }
        }
        checked++;
        if (got + 0.005 < need) {
          failures++;
          results.push({ route, w, locale, ratio: +got.toFixed(2), need, ...r, ...worst });
        }
      }
    }
    await ctx.close();
  }
}
await browser.close();

// Group by the class string — one styling decision, not one DOM node.
const byClass = new Map();
for (const r of results) {
  const key = `${r.cls}||${r.size}px`;
  const rec = byClass.get(key) ?? { ...r, count: 0, worst: 99, routes: new Set() };
  rec.count++;
  rec.worst = Math.min(rec.worst, r.ratio);
  rec.routes.add(r.route);
  byClass.set(key, rec);
}

console.log(`\nWCAG contrast audit — ${BASE}`);
console.log(`  routes ${ROUTES.length} x widths ${WIDTHS.join("/")} x locales ${LOCALES.join("/")}`);
console.log(`  cells measured: ${cells.measured}/${cells.attempted}`);
console.log(`  text nodes measured: ${checked}`);
console.log(`  AA failures: ${failures} (${byClass.size} distinct styling decisions)`);
if (unmeasurable) {
  // Reported, never hidden: these are nodes over a background this model cannot
  // decompose (a photo, `url()`). They are NOT scored and NOT counted as passes.
  console.log(`  unmeasurable backgrounds: ${unmeasurable} node(s), ${unmeasurableCls.size} distinct — judged by eye, not here`);
  for (const c of [...unmeasurableCls].slice(0, 8)) console.log(`      · ${c}`);
}
console.log("");

for (const rec of [...byClass.values()].sort((a, b) => a.worst - b.worst).slice(0, 40)) {
  const rgb = (c) => `rgb(${c.join(",")})`;
  console.log(
    `  ${String(rec.worst).padStart(5)}:1  need ${rec.need}  ${String(rec.size) + "px"}  x${String(rec.count).padStart(4)}  ` +
    `${rgb(rec.fg)} on ${rgb(rec.bg)}`);
  console.log(`         ${rec.tag}.${rec.cls}`);
  console.log(`         "${rec.text}"  [${[...rec.routes].slice(0, 3).join(" ")}]`);
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify(
    [...byClass.values()].map((r) => ({ ...r, routes: [...r.routes] })), null, 2));
  console.log(`\n  wrote ${JSON_OUT}`);
}

// ⛔ E-118 — "NO FAILURES" IS NOT A PASS UNLESS SOMETHING WAS MEASURED.
// Three ways this run is not evidence, and each is named rather than folded
// into the failure count, so the output says WHICH kind of not-green it is.
const blockers = [];
if (checked === 0) blockers.push("measured ZERO text nodes — this run is not evidence of anything");
if (cells.skipped.length) blockers.push(`${cells.skipped.length} of ${cells.attempted} cells never loaded`);

if (blockers.length) {
  console.log("\n⛔ INCONCLUSIVE — the sweep did not cover what it claims to cover:");
  for (const b of blockers) console.log(`   · ${b}`);
  for (const s of cells.skipped.slice(0, 12)) console.log(`     - ${s}`);
  console.log("");
  process.exit(2); // distinct from 1: a coverage failure is not an AA failure
}

console.log(failures === 0 ? "\nPASS — no AA contrast failures\n" : `\nFAIL — ${failures} AA failures\n`);
process.exit(failures ? 1 : 0);
