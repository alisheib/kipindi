/**
 * Sprint 24 — capture dark-mode screenshots of the marquee 50pick pages.
 *
 *   • Landing
 *   • Markets list
 *   • Market detail (with kit ConvictionDial + new BetConfirmModal)
 *   • Profile (kit-faithful)
 *   • Admin dashboard
 *   • Admin config (whole-pool + thresholds)
 *
 * Two viewports per page: web 1440×900 + mobile 393×852.
 * Outputs to .50pick-shots/<page>.web.png / <page>.mobile.png
 *
 *   BASE=http://localhost:3000  node scripts/sprint24-shots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT  = ".50pick-shots";
await mkdir(OUT, { recursive: true });

const VIEWPORTS = {
  web: { width: 1440, height: 900 },
};

// Each entry takes one or more "framed" 1440×900 shots — never full-page so
// the manager always sees one screen at a time. `scrollTo` is the page-Y
// the viewport should be parked at before the shot. Pages with long content
// get multiple shots (e.g. admin-config: top + rates + per-market override).
const PAGES = [
  { slug: "landing",                       url: "/",              scrollTo: 0 },
  { slug: "landing-grid",                  url: "/",              scrollTo: 720 },
  { slug: "markets",                       url: "/markets",       scrollTo: 0,    auth: true },
  { slug: "market-detail",                 url: null,             scrollTo: 0,    auth: true, dynamic: "first-market" },
  { slug: "market-detail-chart",           url: null,             scrollTo: 580,  auth: true, dynamic: "first-market" },
  { slug: "profile",                       url: "/profile",       scrollTo: 0,    auth: true },
  { slug: "profile-settings",              url: "/profile",       scrollTo: 320,  auth: true },
  { slug: "admin-overview",                url: "/admin",         scrollTo: 0,    admin: true },
  { slug: "admin-overview-flow",           url: "/admin",         scrollTo: 520,  admin: true },
  { slug: "admin-config-rates",            url: "/admin/config",  scrollTo: 0,    admin: true },
  { slug: "admin-config-overrides",        url: "/admin/config",  scrollTo: 720,  admin: true },
  { slug: "admin-finance",                 url: "/admin/finance", scrollTo: 0,    admin: true },
];

const browser = await chromium.launch();

async function ensureAuth(ctx) {
  // /auth/demo creates a session with demoMode=true, which bypasses the
  // admin role gate inside /admin/layout.tsx — exactly what we need to
  // screenshot the admin pages without provisioning real ADMIN credentials.
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  await p.close();
}

async function shoot(slug, url, label, viewport) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport.width >= 1280 ? 1.5 : 2,
    colorScheme: "dark",
  });
  // Always set the kp-theme cookie to "dark" up-front so the boot script
  // does not flash light during transition.
  await ctx.addCookies([{ name: "kp-theme", value: "dark", url: BASE }]);

  const meta = PAGES.find((p) => p.slug === slug);
  if (meta?.auth || meta?.admin) await ensureAuth(ctx);

  const p = await ctx.newPage();

  let target = url;
  if (meta?.dynamic === "first-market") {
    const probe = await ctx.newPage();
    await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
    await probe.close();
    if (!href) {
      console.log(`✗ ${slug}.${label}  →  no market`);
      await p.close(); await ctx.close();
      return false;
    }
    target = href;
  }

  await p.goto(`${BASE}${target}`, { waitUntil: "networkidle" });
  if (meta?.scrollTo) {
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), meta.scrollTo);
  }
  await p.waitForTimeout(900);

  const file = `${OUT}/${slug}.${label}.png`;
  // Viewport-sized shot — never full-page. One screen per file so the
  // manager can flip through them like slides without scrolling each.
  await p.screenshot({ path: file, fullPage: false });
  console.log(`✓ ${file}`);

  await p.close();
  await ctx.close();
  return true;
}

for (const { slug } of PAGES) {
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    try {
      await shoot(slug, PAGES.find((p) => p.slug === slug).url, label, viewport);
    } catch (e) {
      console.log(`✗ ${slug}.${label}  →  ${(e?.message ?? e).toString().slice(0, 120)}`);
    }
  }
}

await browser.close();
console.log("\nDone.  Screenshots in", OUT);
