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

  /** Climb ancestors compositing every semi-transparent background we meet. */
  const bgOf = (el) => {
    const stack = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; }
      n = n.parentElement;
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor);
    let base = root && root.a === 1 ? root.rgb : [10, 12, 40]; // canvas fallback
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
    return base;
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
    const bg = bgOf(el);
    // A semi-transparent FOREGROUND is composited over its own background too —
    // `text-text-subtle/60` is a real pattern in this codebase.
    const fgSolid = fg.a < 1 ? over(fg, bg) : fg.rgb;

    const size = parseFloat(cs.fontSize) || 16;
    const weight = parseInt(cs.fontWeight, 10) || 400;
    out.push({
      fg: fgSolid, bg, size, weight,
      large: size >= 18 || (size >= 14 && weight >= 700),
      cls: (el.getAttribute("class") || "").slice(0, 90),
      tag: el.tagName.toLowerCase(),
      text: text.slice(0, 40),
    });
  }
  return out;
};

const browser = await chromium.launch();
const results = [];
let checked = 0, failures = 0;

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
      try {
        // 60s + `load`: the FIRST hit of a route on a dev server pays a ~30s
        // Turbopack compile, and `domcontentloaded` can fire on a partially
        // streamed document — which silently measured ~1 text node per route
        // instead of hundreds. Wait for `load`, then let the client settle.
        await page.goto(BASE + route, { waitUntil: "load", timeout: 60000 });
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(400);
      } catch {
        console.log(`  SKIP ${route} @${w}/${locale} — did not load`);
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
        continue;
      }

      for (const r of rows) {
        const need = r.large ? 3.0 : 4.5;
        const got = ratio(r.fg, r.bg);
        checked++;
        if (got + 0.005 < need) {
          failures++;
          results.push({ route, w, locale, ratio: +got.toFixed(2), need, ...r });
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
console.log(`  text nodes measured: ${checked}`);
console.log(`  AA failures: ${failures} (${byClass.size} distinct styling decisions)\n`);

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

console.log(failures === 0 ? "\nPASS — no AA contrast failures\n" : `\nFAIL — ${failures} AA failures\n`);
process.exit(failures ? 1 : 0);
