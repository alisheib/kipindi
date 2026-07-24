/**
 * Up & Down PLAYER surfaces — visual verification.
 *
 * Seeds a real asset + chain through the admin UI, starts it, drives the chain to open
 * a real round, then captures /updown and /updown/[roundId] at
 * 360 / 768 / 1280 / 1920 in EN, SW and ZH.
 *
 *   BASE=http://localhost:3000 node scripts/updown-player-shots.mjs
 *
 * ⚠️ READ the PNGs in docs/shots-updown/. Every real defect on the admin page was found
 * by looking at the image, not by the assertions — the automated pass was green while
 * the empty states were clipped.
 *
 * Needs a DEV server with DISABLE_ADMIN_TOTP=true.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "shots-updown");
const WIDTHS = [360, 768, 1280, 1920];
const LOCALES = ["en", "sw", "zh"];
mkdirSync(OUT, { recursive: true });

let failures = 0;
const fail = (m) => { failures++; console.log(`  ✗ ${m}`); };
const pass = (m) => console.log(`  ✓ ${m}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const shoot = async (n) => { await page.screenshot({ path: join(OUT, `${n}.png`), fullPage: true }); console.log(`  → ${n}.png`); };

// ── Seed: admin session, asset, chain, running ───────────────────────────────
console.log("=== seeding ===");
await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001", name: "Ali Admin" } });

// Seed through the dev endpoint, which calls the SAME service functions the admin UI
// calls (including the trusted-source gate). The admin UI flow itself is covered by
// scripts/updown-admin-e2e-shots.mjs — driving forms here would just add flake to a
// harness whose job is to produce pixels.
const seed = await page.request.post(`${BASE}/api/dev-test/updown-seed`, { data: { durations: [5, 15] } });
const seedJson = await seed.json().catch(() => null);
if (seed.status() !== 200 || !seedJson?.ok) {
  fail(`seed failed (${seed.status()}) — ${JSON.stringify(seedJson)?.slice(0, 200)}`);
} else {
  const running = (seedJson.chains ?? []).filter((c) => c.state === "RUNNING").length;
  running > 0 ? pass(`seeded ${seedJson.assets.length} asset(s), ${running} running chain(s)`)
              : fail(`seeded but NO chain is running — ${JSON.stringify(seedJson.notes)}`);
}

// Drive the chain once so a real round exists. Dev-only helper; 404 in production.
const adv = await page.request.post(`${BASE}/api/dev-test/updown-advance`, { data: {} }).catch(() => null);
console.log(`  advance → ${adv ? adv.status() : "n/a"}`);
await page.waitForTimeout(1200);

// ── The board, every width × every locale ────────────────────────────────────
for (const locale of LOCALES) {
  console.log(`\n=== /updown · ${locale} ===`);
  await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 768 ? 820 : 1000 });
    await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(800);

    const heading = await page.locator("h1").first().isVisible().catch(() => false);
    heading ? pass(`${width}px rendered`) : fail(`${width}px did NOT render a heading`);

    const o = await overflow();
    o <= 1 ? pass(`${width}px no overflow`) : fail(`${width}px OVERFLOW ${o}px`);

    // ⚠️ THE HONESTY CHECK: an unknown price must be an em-dash, never a bare 0.
    const zeroPrice = await page.locator("text=/\\$0\\.00(?!\\d)/").count();
    zeroPrice === 0 ? pass(`${width}px no fabricated $0.00 price`) : fail(`${width}px shows $0.00 for an unknown price`);

    await shoot(`updown-board-${locale}-${width}`);
  }
}

// ── A round detail page, if one exists ───────────────────────────────────────
await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
await page.setViewportSize({ width: 1280, height: 1000 });
await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
const card = page.locator('article[role="link"]').first();
if (await card.count()) {
  console.log("\n=== /updown/[roundId] ===");
  await card.click();
  await page.waitForTimeout(1500);
  const onDetail = page.url().includes("/updown/");
  onDetail ? pass("navigated to the round detail") : fail(`did not navigate (url=${page.url()})`);
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: width < 768 ? 820 : 1000 });
    await page.waitForTimeout(400);
    const o = await overflow();
    o <= 1 ? pass(`detail ${width}px no overflow`) : fail(`detail ${width}px OVERFLOW ${o}px`);
    await shoot(`updown-round-detail-${width}`);
  }
} else {
  console.log("\n(no open round to open a detail page for — board empty state captured instead)");
}

consoleErrors.length
  ? fail(`${consoleErrors.length} console error(s): ${consoleErrors[0].slice(0, 160)}`)
  : pass("no console errors across the whole run");

await browser.close();
console.log(`\n${failures === 0 ? "✓ updown-player-shots: OK" : `✗ ${failures} failure(s)`}`);
console.log(`  PNGs in ${OUT} — READ THEM.`);
process.exit(failures === 0 ? 0 : 1);
