import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const PUBLIC_ROUTES = [
  { slug: "01-home",          path: "/" },
  { slug: "02-live",          path: "/live" },
  { slug: "03-match-m1",      path: "/match/m1" },
  { slug: "04-match-m2",      path: "/match/m2" },
  { slug: "05-bets",          path: "/bets" },
  { slug: "06-wallet",        path: "/wallet" },
  { slug: "07-profile",       path: "/profile" },
  { slug: "08-leaderboard",   path: "/leaderboard" },
  { slug: "09-games",         path: "/games" },
  { slug: "10-mapigo",        path: "/mapigo" },
  { slug: "11-auth-login",    path: "/auth/login" },
  { slug: "12-auth-register", path: "/auth/register" },
  { slug: "13-auth-otp",      path: "/auth/otp?purpose=login&phone=%2B255712345678" },
];

const AUTHED_ROUTES = [
  { slug: "20-demo-home",     path: "/" },
  { slug: "21-demo-wallet",   path: "/wallet" },
  { slug: "22-demo-deposit",  path: "/wallet/deposit" },
  { slug: "23-demo-withdraw", path: "/wallet/withdraw" },
  { slug: "24-demo-profile",  path: "/profile" },
  { slug: "25-demo-mapigo",   path: "/mapigo" },
  { slug: "26-demo-bets",     path: "/bets" },
];

const VIEWPORTS = process.argv.includes("--all")
  ? [
      { name: "desktop", w: 1440, h: 1024, deviceScale: 1 },
      { name: "tablet",  w: 820,  h: 1180, deviceScale: 1 },
      { name: "mobile",  w: 390,  h: 844,  deviceScale: 2 },
    ]
  : [
      { name: "desktop", w: 1440, h: 1024, deviceScale: 1 },
    ];

const MODE = process.argv[2] || "dark";
const RUN_AUTHED = process.argv.includes("--authed");
const OUT_DIR = path.resolve(`docs/shots-${MODE}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

async function shoot(routes, vp, ctx, label) {
  for (const r of routes) {
    const page = await ctx.newPage();
    const url = `http://localhost:3000${r.path}`;
    process.stdout.write(`→ ${label.padEnd(8)} ${vp.name.padEnd(8)} ${r.path.padEnd(20)} `);
    const t0 = Date.now();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await page.waitForTimeout(700);
      const fileName = vp.name === "desktop" ? `${r.slug}.png` : `${vp.name}-${r.slug}.png`;
      const file = path.join(OUT_DIR, fileName);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${Date.now() - t0}ms  ${Math.round(fs.statSync(file).size / 1024)}KB`);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
    await page.close();
  }
}

for (const vp of VIEWPORTS) {
  // Public pass
  const pubCtx = await browser.newContext({
    colorScheme: MODE,
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: vp.deviceScale,
    isMobile: vp.name === "mobile",
    hasTouch: vp.name === "mobile",
  });
  await pubCtx.addInitScript((mode) => { try { localStorage.setItem("kp-theme", mode); } catch {} }, MODE);
  await shoot(PUBLIC_ROUTES, vp, pubCtx, "public");
  await pubCtx.close();

  if (RUN_AUTHED) {
    const authCtx = await browser.newContext({
      colorScheme: MODE,
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: vp.deviceScale,
      isMobile: vp.name === "mobile",
      hasTouch: vp.name === "mobile",
    });
    await authCtx.addInitScript((mode) => { try { localStorage.setItem("kp-theme", mode); } catch {} }, MODE);
    const setupPage = await authCtx.newPage();
    await setupPage.goto("http://localhost:3000/auth/demo", { waitUntil: "networkidle" });
    await setupPage.close();
    await shoot(AUTHED_ROUTES, vp, authCtx, "demo");
    await authCtx.close();
  }
}

await browser.close();
console.log(`\n${MODE} screenshots → ${OUT_DIR}`);
