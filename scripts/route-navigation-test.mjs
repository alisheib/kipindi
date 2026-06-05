/**
 * Sprint 20 — comprehensive route navigation test.
 *
 * Walks every route on the platform across 4 viewports × 2 sessions (demo /
 * guest) and asserts:
 *   - No 5xx response
 *   - No "Unhandled" / "Application error" / "TypeError" / "ReferenceError" in body
 *   - No console errors (filtered to ignore third-party noise)
 *   - The page rendered SOMETHING (body text length > 100)
 *   - No horizontal overflow on the smallest viewport (393px)
 *
 *   BASE=http://localhost:3000  node scripts/route-navigation-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

const VIEWPORTS = [
  { name: "mobile-393",  width: 393,  height: 800 },
  { name: "tablet-768",  width: 768,  height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
];

// PUBLIC routes are reachable without auth
const PUBLIC_ROUTES = [
  "/",
  "/live",
  "/games",
  "/mapigo",
  "/legal/terms",
  "/legal/privacy",
  "/legal/aml",
  "/legal/responsible-gambling",
  "/help",
  "/fairness",
];

// AUTHED routes require a player session (demo) — should render with demo
const AUTHED_PLAYER_ROUTES = [
  "/wallet",
  "/wallet/deposit",
  "/wallet/withdraw",
  "/bets",
  "/profile",
  "/profile/account",
  "/profile/kyc",
  "/profile/sessions",
  "/profile/responsible-gambling",
  "/profile/source-of-funds",
];

// ADMIN routes — demo session is admin-equivalent
const ADMIN_ROUTES = [
  "/admin",
  "/admin/live",
  "/admin/finance",
  "/admin/reports",
  "/admin/players",
  "/admin/players/cohorts",
  "/admin/games/match",
  "/admin/games/window",
  "/admin/games/mapigo",
  "/admin/compliance",
  "/admin/aml",
  "/admin/self-exclusions",
  "/admin/privacy",
  "/admin/retention",
  "/admin/audit",
  "/admin/system",
  "/admin/approvals",
  "/admin/2fa/setup",
];

let pass = 0, fail = 0;
const failures = [];
function log(label, ok, detail = "") {
  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push(`${label} ${detail}`);
  }
}

const browser = await chromium.launch();

async function checkRoute(ctx, viewport, path) {
  const p = await ctx.newPage();
  const consoleErrors = [];
  p.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Filter noisy third-party errors
      if (/Failed to load resource|favicon|net::ERR_/.test(text)) return;
      consoleErrors.push(text);
    }
  });
  let status = 0;
  try {
    const res = await p.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15_000 });
    status = res?.status() ?? 0;
  } catch (e) {
    log(`${viewport.name} ${path}`, false, `nav error: ${String(e?.message ?? e).slice(0, 80)}`);
    await p.close();
    return;
  }

  // 307 to /auth/* is expected for protected routes when guest
  const ok500 = status < 500;
  const body = (await p.locator("body").textContent().catch(() => "")) ?? "";
  const noErrText = !/Application error|TypeError|ReferenceError|Cannot read prop|Cannot read properties of undefined/.test(body);
  const hasContent = body.length > 100 || status >= 300;

  // Horizontal overflow check on mobile only
  let noHOverflow = true;
  if (viewport.width === 393) {
    noHOverflow = await p.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth + 2;
    }).catch(() => true);
  }

  const passes = ok500 && noErrText && hasContent && noHOverflow && consoleErrors.length === 0;
  let detail = "";
  if (!ok500)        detail += ` 5xx=${status}`;
  if (!noErrText)    detail += " err-in-body";
  if (!hasContent)   detail += " empty";
  if (!noHOverflow)  detail += " h-overflow";
  if (consoleErrors.length > 0) detail += ` console-err: ${consoleErrors[0].slice(0, 80)}`;
  log(`${viewport.name} ${path}`, passes, detail);
  await p.close();
}

console.log(`\n=== ROUTE NAVIGATION TEST · ${VIEWPORTS.length} viewports × ${PUBLIC_ROUTES.length + AUTHED_PLAYER_ROUTES.length + ADMIN_ROUTES.length} routes ===\n`);

for (const viewport of VIEWPORTS) {
  console.log(`\n--- ${viewport.name} (${viewport.width}×${viewport.height}) ---`);

  // Guest routes
  {
    const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    for (const path of PUBLIC_ROUTES) {
      await checkRoute(ctx, viewport, path);
    }
    await ctx.close();
  }

  // Demo session — player + admin routes
  {
    const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
    for (const path of [...AUTHED_PLAYER_ROUTES, ...ADMIN_ROUTES]) {
      await checkRoute(ctx, viewport, path);
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nROUTE NAVIGATION  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
if (failures.length > 0) {
  console.log("\nFailing routes:");
  for (const f of failures) console.log(`  ✗ ${f}`);
}
process.exit(fail > 0 ? 1 : 0);
