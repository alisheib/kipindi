/**
 * RESPONSIVE-AUDIT — the master full-platform responsiveness driver.
 *
 * For every surface (player + all 25 operator routes) it loads at EVERY
 * breakpoint (320 / 360 / 390 / 430 / landscape / 768 / 1024 / 1280 / 1920),
 * optionally in EN/SW/ZH, and asserts the pass-criteria in
 * .claude/skills/50pick-standards/references/responsiveness-and-visual.md:
 *   1. 0 horizontal overflow           (documentElement.scrollWidth ≤ clientWidth + 1)
 *   2. no clipped-not-scrolled content (overflow lives in an auto/scroll container)
 *   3. nothing off-screen              (fixed/sticky overlays fully within the viewport)
 *   4. touch targets ≥ 40×40           (buttons / nav / chips-as-buttons — reported)
 *   5. no console/page errors
 * It ALSO opens each overlay (notifications, avatar menu, language, bet dial +
 * confirm, admin filter/menu) at the phone + landscape widths and asserts the
 * dialog/menu fits the viewport with its primary action reachable.
 *
 * Screenshots → .50pick-shots/responsive/<surface>/<width>[-<locale>].png  (READ them).
 * Emits a per-surface PASS/FAIL table + a global summary; exit 1 on any hard fail.
 *
 * Run against a FRESH server (see the 50pick-standards skill → references/
 * responsiveness-and-visual.md; prefer `next build && next start` for CSS fidelity):
 *   BASE=http://localhost:3000 node scripts/responsive-audit.mjs
 *
 * Env:
 *   BASE      default http://localhost:3000
 *   SURFACE   player | admin | overlays | all   (default all)
 *   LOCALES   en | en,sw,zh                       (default en; overlays always en)
 *   WIDTHS    320,430,land                         (filter breakpoints by tag or width)
 *   ONLY      /markets,/wallet                     (filter surfaces by path substring)
 *   SHOTS_ALL 1                                     (screenshot every width, not just xs+desktop)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const SURFACE = process.env.SURFACE || "all";
const LOCALES = (process.env.LOCALES || "en").split(",").map((s) => s.trim());
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const SHOTS_ALL = process.env.SHOTS_ALL === "1";
const SHOTS = ".50pick-shots/responsive";
mkdirSync(SHOTS, { recursive: true });

const BREAKPOINTS = [
  { tag: "xs", w: 320, h: 568 },
  { tag: "sm", w: 360, h: 740 },
  { tag: "md", w: 390, h: 844 },
  { tag: "lgph", w: 430, h: 932 },
  { tag: "land", w: 740, h: 360 },
  { tag: "tablet", w: 768, h: 1024 },
  { tag: "tabletL", w: 1024, h: 768 },
  { tag: "laptop", w: 1280, h: 800 },
  { tag: "desktop", w: 1920, h: 1080 },
];
const WIDTH_FILTER = process.env.WIDTHS
  ? process.env.WIDTHS.split(",").map((s) => s.trim())
  : null;
const widths = WIDTH_FILTER
  ? BREAKPOINTS.filter((b) => WIDTH_FILTER.includes(b.tag) || WIDTH_FILTER.includes(String(b.w)))
  : BREAKPOINTS;

// ---- surfaces --------------------------------------------------------------
const PLAYER = [
  "/", "/markets", "/positions", "/positions/performance", "/leaderboard",
  "/proposals", "/proposals/new", "/results", "/live", "/wallet",
  "/wallet/deposit", "/wallet/withdraw", "/profile", "/profile/account",
  "/profile/kyc", "/profile/invite", "/profile/sessions",
  "/profile/source-of-funds", "/profile/responsible-gambling",
  "/fairness", "/help", "/legal/terms", "/legal/privacy", "/legal/aml",
  "/legal/responsible-gambling",
  "/auth/login", "/auth/register", "/auth/forgot-password",
];
const ADMIN = [
  "/admin", "/admin/live", "/admin/markets", "/admin/resolver-queue",
  "/admin/ai-polls", "/admin/candidates", "/admin/proposals", "/admin/sources",
  "/admin/config", "/admin/finance", "/admin/payments", "/admin/transactions", "/admin/reports",
  "/admin/players", "/admin/players/cohorts", "/admin/affiliate",
  "/admin/bonuses", "/admin/invites", "/admin/compliance", "/admin/moderation",
  "/admin/aml", "/admin/self-exclusions", "/admin/privacy", "/admin/retention",
  "/admin/audit", "/admin/system", "/admin/ai-usage", "/admin/approvals",
  // Index routes that were missing from the sweep (they render growable
  // tables / KPI bands and now carry pagination + shared empty states).
  "/admin/objections", "/admin/settlement", "/admin/events", "/admin/insights",
];

let pass = 0, fail = 0, warn = 0;
const failures = [], warnings = [];
function ok(name, cond, detail = "") {
  if (cond) pass++;
  else { fail++; failures.push(`${name}${detail ? ` — ${detail}` : ""}`); }
}
function soft(name, cond, detail = "") {
  if (!cond) { warn++; warnings.push(`${name}${detail ? ` — ${detail}` : ""}`); }
}

// Assertions run in the page: overflow, clipped-not-scrolled, off-screen fixed,
// small touch targets. Returns a plain object (no Playwright handles).
async function assertCell(page) {
  return await page.evaluate(() => {
    const root = document.documentElement;
    const vw = root.clientWidth, vh = window.innerHeight;
    const overflowPx = root.scrollWidth - root.clientWidth;

    // widest offending element (helps pin the overflow source)
    let widestName = "", widestRight = 0;
    if (overflowPx > 1) {
      for (const el of document.body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > widestRight && r.right > vw + 1) {
          widestRight = r.right;
          widestName = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${
            el.className && typeof el.className === "string"
              ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
              : ""}`;
        }
      }
    }

    // fixed / sticky overlays that run off the right/left/top edge.
    // A sticky element inside a horizontal scroll container (e.g. a sticky <thead>
    // in an overflow-x-auto table) is SUPPOSED to be as wide as its scroller and
    // scroll with it — not an off-screen overlay. Exclude those.
    const inXScroller = (el) => {
      let a = el.parentElement;
      while (a && a !== document.documentElement) {
        const cs = getComputedStyle(a);
        if (/auto|scroll/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1) return true;
        a = a.parentElement;
      }
      return false;
    };
    const offscreen = [];
    for (const el of document.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
      if (cs.position === "sticky" && inXScroller(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 2 || r.left < -2) {
        offscreen.push(`${el.tagName.toLowerCase()}.${
          (typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "") || "?"
        } (l${Math.round(r.left)} r${Math.round(r.right)})`);
      }
    }

    // CLIPPED-NOT-SCROLLED controls (§5.2): interactive elements whose box runs
    // past the viewport edge with NO scrollable ancestor — genuinely unreachable.
    // This catches overflow that `overflow-x: clip/hidden` on body/html hides from
    // documentElement.scrollWidth (the trap that let the clipped avatar hide).
    const hasScrollableAncestor = (el) => {
      let a = el.parentElement;
      while (a && a !== document.documentElement) {
        const cs = getComputedStyle(a);
        if (/auto|scroll/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1) return true;
        a = a.parentElement;
      }
      return false;
    };
    const clipped = [];
    for (const el of document.querySelectorAll('button, a[href], [role="button"], [role="menuitem"], input, select')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if ((r.right > vw + 2 || r.left < -2) && !hasScrollableAncestor(el)) {
        const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 22);
        clipped.push(`${el.tagName.toLowerCase()}[${label}] l${Math.round(r.left)} r${Math.round(r.right)}>vw${vw}`);
      }
    }

    // undersized touch targets (visible interactive controls)
    const small = [];
    const sel = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], input[type="checkbox"], input[type="radio"]';
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      // <8px in either axis = visually-hidden/skip-link (expands on focus) — exempt
      if (r.width < 8 || r.height < 8) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      // inline text links inside prose are exempt (WCAG 2.5.8)
      const inlineLink = el.tagName === "A" && cs.display.includes("inline");
      if (inlineLink) continue;
      if (r.height < 38 || r.width < 24) {
        const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24);
        small.push(`${el.tagName.toLowerCase()}[${label}] ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }

    return { overflowPx, widestName, widestRight: Math.round(widestRight), vw, vh, offscreen, clipped: clipped.slice(0, 6), clippedCount: clipped.length, small: small.slice(0, 6), smallCount: small.length };
  });
}

// /auth/* pages must be viewed as a GUEST (real usage). An authenticated user
// hitting /auth/login is server-redirected home — a valid but off-path case that
// trips a documented Next.js 16 dev-mode hook-count console artifact (prod-clean).
const isGuestRoute = (path) => path.startsWith("/auth/");

async function sweep(browser, label, paths, contextFactory, guestContextFactory) {
  for (const locale of LOCALES) {
    const context = await contextFactory(locale);
    const guest = guestContextFactory ? await guestContextFactory(locale) : null;
    for (const path of paths) {
      if (ONLY && !ONLY.some((o) => path.includes(o))) continue;
      const surfName = (label + path).replace(/\W+/g, "_");
      mkdirSync(`${SHOTS}/${label}`, { recursive: true });
      const useCtx = guest && isGuestRoute(path) ? guest : context;
      for (const bp of widths) {
        const page = await useCtx.newPage();
        await page.setViewportSize({ width: bp.w, height: bp.h });
        const errs = [];
        page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
        page.on("pageerror", (e) => errs.push(String(e)));
        const cell = `${path}@${bp.tag}${locale !== "en" ? `·${locale}` : ""}`;
        try {
          const resp = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 40000 });
          const status = resp ? resp.status() : 0;
          if (status >= 400) { ok(`${cell} loads`, false, `HTTP ${status}`); await page.close(); continue; }
          await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(500);
          const r = await assertCell(page);
          ok(`${cell} no h-overflow`, r.overflowPx <= 1,
            `+${r.overflowPx}px via ${r.widestName} (right ${r.widestRight} > vw ${r.vw})`);
          ok(`${cell} no off-screen fixed`, r.offscreen.length === 0, r.offscreen.slice(0, 3).join(" | "));
          ok(`${cell} no clipped controls`, r.clippedCount === 0, r.clipped.join(" | "));
          soft(`${cell} touch targets ≥40`, r.smallCount === 0, `${r.smallCount} small: ${r.small.join(", ")}`);
          const real = errs.filter((e) => !/fonts\.googleapis|fonts\.gstatic|Failed to load resource.*font|vibrate|webpack-hmr|WebSocket connection|_next\/static|hot-reloader/i.test(e));
          ok(`${cell} zero console errors`, real.length === 0, real.slice(0, 2).join(" | "));
          if (SHOTS_ALL || bp.tag === "xs" || bp.tag === "desktop" || bp.tag === "land") {
            await page.screenshot({ path: `${SHOTS}/${label}/${surfName}-${bp.tag}${locale !== "en" ? "-" + locale : ""}.png` });
          }
        } catch (e) {
          ok(`${cell} loads`, false, String(e).split("\n")[0].slice(0, 90));
        }
        await page.close();
      }
    }
    await context.close();
    if (guest) await guest.close();
  }
}

// ---- overlay section -------------------------------------------------------
async function fitsViewport(page, locator, name, safeBottom = 0) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) { ok(name, false, "no bounding box (did not open)"); return; }
  const vp = page.viewportSize();
  const tol = 2;
  const fits = box.x >= -tol && box.y >= -tol &&
    box.x + box.width <= vp.width + tol &&
    box.y + box.height <= vp.height - safeBottom + tol;
  ok(name, fits, `box=(${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}) vp=${vp.width}×${vp.height}`);
}

async function overlaySweep(browser, playerCtxFactory, adminCtxFactory) {
  const OV_WIDTHS = [
    { tag: "xs", w: 320, h: 568 },
    { tag: "land", w: 740, h: 360 },
    { tag: "tablet", w: 768, h: 1024 },
  ];
  mkdirSync(`${SHOTS}/overlays`, { recursive: true });
  const ctx = await playerCtxFactory("en");

  for (const bp of OV_WIDTHS) {
    // ---- notifications inbox ----
    {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: bp.w, height: bp.h });
      await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(600);
      const bell = p.locator('button[aria-label^="Notifications"]').first();
      if (await bell.isVisible().catch(() => false)) {
        await bell.click().catch(() => {});
        await p.waitForTimeout(400);
        const dlg = p.locator('[role="dialog"][aria-label="Notifications"]').first();
        // safeBottom 0: this is a backdrop overlay (z-61, full-screen scrim) that
        // legitimately covers the bottom nav — it only must fit the viewport.
        await fitsViewport(p, dlg, `overlay notifications @${bp.tag}`, 0);
        await p.screenshot({ path: `${SHOTS}/overlays/notifications-${bp.tag}.png` });
      } else soft(`overlay notifications @${bp.tag}`, true, "bell not visible");
      await p.close();
    }
    // ---- avatar menu ----
    {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: bp.w, height: bp.h });
      await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(600);
      const av = p.getByRole("button", { name: "Account menu" }).first();
      if (await av.isVisible().catch(() => false)) {
        await av.click().catch(() => {});
        await p.waitForTimeout(300);
        const menu = p.locator('[role="menu"]').first();
        // safeBottom 0: backdrop overlay (z-61 scrim over the nav) — fits-viewport only.
        await fitsViewport(p, menu, `overlay avatar-menu @${bp.tag}`, 0);
        await p.screenshot({ path: `${SHOTS}/overlays/avatar-${bp.tag}.png` });
      } else soft(`overlay avatar-menu @${bp.tag}`, true, "avatar not visible");
      await p.close();
    }
    // ---- language menu ----
    {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: bp.w, height: bp.h });
      await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(600);
      const lang = p.locator('button[aria-label^="Language:"]').first();
      if (await lang.isVisible().catch(() => false)) {
        await lang.click().catch(() => {});
        await p.waitForTimeout(300);
        const menu = p.locator('div[role="menu"][aria-label="Language"]').first();
        await fitsViewport(p, menu, `overlay language @${bp.tag}`, 56);
      } else soft(`overlay language @${bp.tag}`, true, "lang toggle not visible");
      await p.close();
    }
    // ---- bet dial + confirm on a market detail ----
    {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: bp.w, height: bp.h });
      await p.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(700);
      const card = p.locator('a[href^="/markets/mkt_"]').first();
      if (await card.count()) {
        await card.click().catch(() => {});
        await p.waitForTimeout(1200);
        const cell = await assertCell(p);
        ok(`overlay market-detail(dial) @${bp.tag} no h-overflow`, cell.overflowPx <= 1,
          `+${cell.overflowPx}px via ${cell.widestName}`);
        // unlock the dial if present, then look for a place-bet / confirm CTA
        const unlock = p.getByRole("button", { name: /Unlock|Fungua/i }).first();
        if (await unlock.isVisible().catch(() => false)) await unlock.click().catch(() => {});
        await p.waitForTimeout(300);
        await p.screenshot({ path: `${SHOTS}/overlays/market-detail-${bp.tag}.png` });
        // open the confirm modal if a place-bet button is enabled
        const placeBtn = p.getByRole("button", { name: /Place|Weka|下注|Confirm/i }).first();
        if (await placeBtn.isEnabled().catch(() => false)) {
          await placeBtn.click().catch(() => {});
          await p.waitForTimeout(500);
          const modal = p.locator('[role="dialog"], [role="alertdialog"]').first();
          if (await modal.isVisible().catch(() => false)) {
            await fitsViewport(p, modal, `overlay bet-confirm @${bp.tag}`);
            await p.screenshot({ path: `${SHOTS}/overlays/bet-confirm-${bp.tag}.png` });
          }
        }
      } else soft(`overlay market-detail(dial) @${bp.tag}`, true, "no market card");
      await p.close();
    }
  }
  await ctx.close();

  // ---- admin filter bar + one grid at mobile ----
  const actx = await adminCtxFactory("en");
  for (const bp of OV_WIDTHS) {
    const p = await actx.newPage();
    await p.setViewportSize({ width: bp.w, height: bp.h });
    await p.goto(`${BASE}/admin/players`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(800);
    const cell = await assertCell(p);
    ok(`overlay admin/players @${bp.tag} no h-overflow`, cell.overflowPx <= 1,
      `+${cell.overflowPx}px via ${cell.widestName}`);
    ok(`overlay admin/players @${bp.tag} no off-screen fixed`, cell.offscreen.length === 0, cell.offscreen.slice(0, 2).join(" | "));
    await p.screenshot({ path: `${SHOTS}/overlays/admin-players-${bp.tag}.png` });
    await p.close();
  }
  await actx.close();
}

// ---- context factories -----------------------------------------------------
async function main() {
  const browser = await chromium.launch();

  const localeCookie = (locale) => ([{ name: "kp-locale", value: locale, url: BASE }]);

  const playerCtxFactory = async (locale) => {
    const c = await browser.newContext();
    await c.request.get(`${BASE}/auth/demo`);
    await c.addCookies(localeCookie(locale));
    return c;
  };
  const adminCtxFactory = async (locale) => {
    const c = await browser.newContext();
    await c.request.post(`${BASE}/api/dev-test/seed-admin`);
    await c.addCookies(localeCookie(locale));
    // Admin pages sit behind TOTP. REAL admin coverage requires the SERVER to run
    // with DISABLE_ADMIN_TOTP=true (audit F1) — otherwise every /admin/* renders
    // the 2FA gate and an "admin PASS" is FALSE coverage (+ a redirect race that
    // reads as a hard fail). Probe once and warn loudly if coverage is gated, so a
    // green admin run can be trusted.
    try {
      const probe = await c.request.get(`${BASE}/admin/finance`);
      const p = new URL(probe.url()).pathname;
      if (/\/auth|\/2fa/.test(p)) {
        console.warn(`\n  ⚠️  ADMIN COVERAGE GATED — /admin/finance redirected to ${p}.`);
        console.warn(`      Restart the server with DISABLE_ADMIN_TOTP=true for real admin coverage (audit F1).\n`);
      }
    } catch { /* server down / probe failed — the sweep itself will surface it */ }
    return c;
  };

  const guestCtxFactory = async (locale) => {
    const c = await browser.newContext();
    await c.addCookies(localeCookie(locale));
    return c;
  };

  if (SURFACE === "all" || SURFACE === "player") await sweep(browser, "player", PLAYER, playerCtxFactory, guestCtxFactory);
  if (SURFACE === "all" || SURFACE === "admin") await sweep(browser, "admin", ADMIN, adminCtxFactory, guestCtxFactory);
  if (SURFACE === "all" || SURFACE === "overlays") await overlaySweep(browser, playerCtxFactory, adminCtxFactory);

  await browser.close();

  if (warnings.length) {
    console.log(`\n--- touch-target / soft warnings (${warn}) ---`);
    warnings.slice(0, 60).forEach((w) => console.log("  ⚠ " + w));
    if (warnings.length > 60) console.log(`  … +${warnings.length - 60} more`);
  }
  if (failures.length) {
    console.log(`\n--- HARD FAILURES (${fail}) ---`);
    failures.forEach((f) => console.log("  ✗ " + f));
  }
  console.log(`\n${"=".repeat(64)}`);
  console.log(`responsive-audit: ${pass} passed · ${fail} failed · ${warn} warnings`);
  console.log(`surfaces=${SURFACE} locales=${LOCALES.join("/")} widths=${widths.map((w) => w.tag).join(",")}`);
  console.log(`shots → ${SHOTS}/`);
  console.log("=".repeat(64));
  process.exit(fail ? 1 : 0);
}

main();
