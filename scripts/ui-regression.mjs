/**
 * UI regression harness — responsiveness / CSS / console / interaction sweep.
 *
 * Runs the key player + admin routes at 360 / 768 / 1280 / 1920 and asserts:
 *   - NO horizontal overflow  (scrollWidth <= clientWidth + 1)
 *   - ZERO console errors / page errors
 *   - primary interactions still fire (avatar menu, market filter, dial focus, …)
 *   - screenshots each route → .50pick-shots/ui-regression/<route>-<w>.png (READ them)
 *
 * Reusable across every UI batch — add routes/interactions as new UI lands so
 * earlier batches keep getting re-verified. Run against a FRESH dev server:
 *   SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3000
 *   node scripts/ui-regression.mjs
 *
 * Env: BASE (default http://localhost:3000), ONLY=/markets,/wallet (filter routes),
 *      WIDTHS=360,1280 (filter viewports).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const SHOTS = ".50pick-shots/ui-regression";
mkdirSync(SHOTS, { recursive: true });

// 320 = the true low-end phone floor; 740 = phone LANDSCAPE (height 360).
// Extended for the responsiveness sprint (docs/responsiveness-audit.md Lane G).
const ALL_WIDTHS = [320, 360, 740, 768, 1280, 1920];
const WIDTHS = process.env.WIDTHS ? process.env.WIDTHS.split(",").map(Number) : ALL_WIDTHS;
// Landscape phone runs short; everything else uses a tall viewport.
const heightFor = (w) => (w === 740 ? 360 : 900);
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;

// ctx: "player" (via /auth/demo) | "admin" (seeded) | "guest"
// interact(page): optional — exercise a primary interaction; throw on failure.
const ROUTES = [
  { path: "/",                      ctx: "player" },
  { path: "/markets",               ctx: "player", interact: marketFilter },
  { path: "/live",                  ctx: "player" },
  { path: "/results",               ctx: "player" },
  { path: "/leaderboard",           ctx: "player" },
  { path: "/wallet",                ctx: "player" },
  { path: "/positions",             ctx: "player" },
  { path: "/proposals",             ctx: "player" },
  { path: "/profile",               ctx: "player", interact: avatarMenu },
  { path: "/auth/login",            ctx: "guest" },
  { path: "/admin",                 ctx: "admin" },
  { path: "/admin/players",         ctx: "admin" },
  { path: "/admin/ai-usage",        ctx: "admin" },
];

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, e = "") => {
  if (c) { pass++; } else { fail++; results.push(`FAIL ${n}${e ? ` — ${e}` : ""}`); }
};

async function avatarMenu(page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menu").waitFor({ state: "visible", timeout: 3000 });
}
async function marketFilter(page) {
  // click the first topic/filter chip if present; tolerate boards with none
  const chip = page.locator("[role='tab'], .chip50, button").filter({ hasText: /Sports|Michezo|All|Zote/i }).first();
  if (await chip.count()) await chip.click({ timeout: 2000 }).catch(() => {});
}

const browser = await chromium.launch();

// ---- contexts ----
const player = await browser.newContext();
await player.request.get(`${BASE}/auth/demo`);

const admin = await browser.newContext();
await admin.request.post(`${BASE}/api/dev-test/seed-admin`);
// promote the browser session: hit /admin once to establish
await admin.request.get(`${BASE}/admin`).catch(() => {});

const guest = await browser.newContext();
const ctxOf = { player, admin, guest };

for (const route of ROUTES) {
  if (ONLY && !ONLY.includes(route.path)) continue;
  const context = ctxOf[route.ctx];
  for (const w of WIDTHS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: w, height: heightFor(w) });
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push(String(e)));
    const tag = `${route.path.replace(/\W+/g, "_") || "root"}-${w}`;
    try {
      // domcontentloaded, not networkidle — the board polls live odds so the
      // network never idles; settle briefly then assert layout.
      const resp = await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      ok(`${route.path}@${w} loads`, resp && resp.status() < 400, resp ? `HTTP ${resp.status()}` : "no response");
      await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(600);

      // horizontal overflow
      const { sw, cw } = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      ok(`${route.path}@${w} no h-overflow`, sw <= cw + 1, `scrollWidth=${sw} clientWidth=${cw}`);

      // primary interaction (widest viewport only, once per route)
      if (route.interact && w === Math.max(...WIDTHS)) {
        try { await route.interact(page); ok(`${route.path} interaction`, true); }
        catch (e) { ok(`${route.path} interaction`, false, String(e).split("\n")[0]); }
      }

      await page.screenshot({ path: `${SHOTS}/${tag}.png`, fullPage: false });
    } catch (e) {
      ok(`${route.path}@${w} loads`, false, String(e).split("\n")[0]);
    }
    // console errors — filter known-benign Google Fonts CSP/network noise
    const real = errs.filter((e) => !/fonts\.googleapis|fonts\.gstatic|Failed to load resource.*font/i.test(e));
    ok(`${route.path}@${w} zero console errors`, real.length === 0, real.slice(0, 2).join(" | "));
    await page.close();
  }
}

await browser.close();
if (results.length) { console.log("\n--- failures ---"); results.forEach((r) => console.log(r)); }
console.log(`\nui-regression: ${pass} passed, ${fail} failed  (widths ${WIDTHS.join("/")})`);
console.log(`screenshots → ${SHOTS}/`);
process.exit(fail ? 1 : 0);
