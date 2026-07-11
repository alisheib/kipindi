/**
 * Phase C — visual-confirmation matrix runner (trilingual mobile-first sweep).
 *
 * The existing ui-regression.mjs sweeps WIDTHS in ONE locale + the default
 * populated state. Phase C adds the two dimensions that actually break layout:
 * LOCALE (en/sw/zh — Swahili/Chinese length stress) and, per route, the widths.
 * This runner captures every (route × locale × width) cell, flags h-overflow +
 * console errors, and writes a shot per cell to .50pick-shots/phase-c/ so each
 * can be HUMAN-READ (the clipped-not-scrolled class only shows in the image).
 *
 * Fresh server required (see SESSION_STATUS gotchas). Run:
 *   BASE=http://localhost:3000 node scripts/visual-matrix.mjs
 * Env: ONLY=/markets,/wallet (filter routes) · WIDTHS=360 · LOCALES=sw,zh
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SHOTS = ".50pick-shots/phase-c";
mkdirSync(SHOTS, { recursive: true });

const ALL_WIDTHS = [360, 768, 1280, 1920];
const WIDTHS = process.env.WIDTHS ? process.env.WIDTHS.split(",").map(Number) : [360, 1280];
const ALL_LOCALES = ["en", "sw", "zh"];
const LOCALES = process.env.LOCALES ? process.env.LOCALES.split(",") : ALL_LOCALES;
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const FULLPAGE = process.env.FULLPAGE === "1"; // capture below-the-fold (full scroll height)

// The core player-facing surfaces where SW/ZH length stress is most likely to
// truncate, wrap ugly, or clip. Admin is EN+SW per the plan (set SURFACE=admin).
const PLAYER_ROUTES = [
  { path: "/",            ctx: "player" },
  { path: "/markets",     ctx: "player" },
  { path: "/live",        ctx: "player" },
  { path: "/results",     ctx: "player" },
  { path: "/leaderboard", ctx: "player" },
  { path: "/wallet",      ctx: "player" },
  { path: "/positions",   ctx: "player" },
  { path: "/proposals",   ctx: "player" },
  { path: "/profile",     ctx: "player" },
];
const ADMIN_ROUTES = [
  { path: "/admin",                ctx: "admin" },
  { path: "/admin/live",           ctx: "admin" },
  { path: "/admin/finance",        ctx: "admin" },
  { path: "/admin/reports",        ctx: "admin" },
  { path: "/admin/payments",       ctx: "admin" },
  { path: "/admin/resolver-queue", ctx: "admin" },
  { path: "/admin/players",        ctx: "admin" },
  { path: "/admin/proposals",      ctx: "admin" },
  { path: "/admin/config",         ctx: "admin" },
  { path: "/admin/audit",          ctx: "admin" },
  { path: "/admin/ai-usage",       ctx: "admin" },
];
const SURFACE = process.env.SURFACE ?? "player";
const ROUTES = SURFACE === "admin" ? ADMIN_ROUTES : PLAYER_ROUTES;
// Admin is EN + SW per the plan (no ZH); player is trilingual.
const EFFECTIVE_LOCALES = SURFACE === "admin" ? LOCALES.filter((l) => l !== "zh") : LOCALES;

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; results.push(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();

// One context per locale. Player surface = authed demo player; admin surface =
// seeded admin (TOTP disabled in dev). Each carries the kp-locale cookie.
const ctxByLocale = {};
const url = new URL(BASE);
let adminSeq = 0;
for (const loc of EFFECTIVE_LOCALES) {
  const ctx = await browser.newContext();
  if (SURFACE === "admin") {
    // Distinct admin phone per context — seed-admin's createSession enforces a
    // single active session per user, so a shared phone would let each locale's
    // seed invalidate the previous context's session (→ redirect to sign-in).
    const phone = `+2557120000${String(10 + adminSeq++).padStart(2, "0")}`;
    await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone } });
    await ctx.request.get(`${BASE}/admin`).catch(() => {});
  } else {
    await ctx.request.get(`${BASE}/auth/demo`);
  }
  await ctx.addCookies([{ name: "kp-locale", value: loc, domain: url.hostname, path: "/" }]);
  ctxByLocale[loc] = ctx;
}

for (const route of ROUTES) {
  if (ONLY && !ONLY.includes(route.path)) continue;
  for (const loc of EFFECTIVE_LOCALES) {
    const context = ctxByLocale[loc];
    for (const w of WIDTHS) {
      const page = await context.newPage();
      await page.setViewportSize({ width: w, height: 900 });
      const errs = [];
      page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
      page.on("pageerror", (e) => errs.push(String(e)));
      const slug = route.path.replace(/\W+/g, "_") || "root";
      const tag = `${slug}-${loc}-${w}`;
      try {
        const resp = await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 40000 });
        ok(`${route.path} ${loc}@${w} loads`, resp && resp.status() < 400, resp ? `HTTP ${resp.status()}` : "no response");
        await page.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(700);
        const { sw, cw } = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
        }));
        ok(`${route.path} ${loc}@${w} no h-overflow`, sw <= cw + 1, `scrollWidth=${sw} clientWidth=${cw}`);
        // Ignore the known benign navigator.vibrate console noise from seeded stores.
        const realErrs = errs.filter((e) => !/vibrate/i.test(e));
        ok(`${route.path} ${loc}@${w} no console errors`, realErrs.length === 0, realErrs[0]?.slice(0, 120));
        await page.screenshot({ path: `${SHOTS}/${tag}${FULLPAGE ? "-full" : ""}.png`, fullPage: FULLPAGE });
      } catch (e) {
        ok(`${route.path} ${loc}@${w} render`, false, String(e).split("\n")[0]);
      }
      await page.close();
    }
  }
}

await browser.close();
for (const r of results) console.log(r);
console.log(`\nvisual-matrix: ${pass} passed, ${fail} failed  (${SURFACE} · locales ${EFFECTIVE_LOCALES.join("/")} · widths ${WIDTHS.join("/")})`);
console.log(`screenshots → ${SHOTS}/`);
if (fail > 0) process.exit(1);
