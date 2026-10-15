/**
 * Scoped, read-only classic screenshot pass for the final S14 preview SHA.
 * Run against a fresh localhost/in-memory dev server in STAFF_PREVIEW.
 * It seeds synthetic classic fixtures, opens Sell's confirmation, and never
 * presses the gold confirmation or any payment action.
 *
 * KP_BASE=http://localhost:3054 KP_CLASSIC_SHOTS=<absolute output dir>
 *   node scripts/s14-classic-spot-shots.mjs
 */
import { chromium, request } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.KP_BASE ?? "http://localhost:3054";
const OUT = resolve(process.env.KP_CLASSIC_SHOTS ?? ".qa-shots/s14-classic-spot");
const SHA = process.env.KP_SOURCE_SHA ?? null;
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("localhost:PORT required");
const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
if (health.database?.configured !== false || health.simpleJourney?.state !== "STAFF_PREVIEW") {
  throw new Error("Fresh in-memory STAFF_PREVIEW server required");
}
mkdirSync(OUT, { recursive: true });

const report = {
  kind: "s14-final-classic-spot-shots", sourceCommit: SHA, generatedAt: new Date().toISOString(),
  premise: "localhost/in-memory STAFF_PREVIEW; synthetic fixtures; no Sell confirmation or payment submitted",
  cells: [], failures: [],
};
const browser = await chromium.launch({ headless: true });
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const localeCookie = (locale) => ({ name: "kp-locale", value: locale, url: BASE });
const hydrated = (page) => page.waitForFunction(() => {
  const el = document.querySelector("header") ?? document.querySelector("main");
  return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
}, null, { timeout: 120_000 });

/** Parity open(): wait for load, main, hydration, and 3s of settling.
 * A late Next dev refresh may navigate to the SAME URL, so timeOrigin is read
 * across each beat. Two further beats are allowed; continuous churn is a fail.
 */
async function open(page, route) {
  const res = await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 180_000 });
  for (let beat = 0; beat < 3; beat++) {
    try {
      await page.locator("main").first().waitFor({ timeout: 120_000 });
      await hydrated(page);
      const origin = await page.evaluate(() => performance.timeOrigin);
      await page.waitForTimeout(3000);
      await page.waitForLoadState("load").catch(() => {});
      const now = await page.evaluate(() => performance.timeOrigin);
      if (now === origin) return { status: res?.status() ?? 0, beats: beat + 1, landed: page.url() };
    } catch {
      // A same-URL Next dev reload can destroy the context mid-read. One new
      // document gets the same main/hydration/settle beat; continuous churn fails.
    }
  }
  throw new Error(`Page kept navigating during settle: ${route}`);
}
async function capture(name, jar, locale, width, route, target = null, action = null) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const errors = [];
  try {
    await ctx.addCookies([...jar, localeCookie(locale)]);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
    const landed = await open(page, route);
    if (target) {
      const el = page.locator(target).first();
      await el.waitFor({ state: "visible", timeout: 30_000 });
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
    }
    if (action) await action(page);
    const image = `${name}.png`;
    const path = resolve(OUT, image);
    await page.screenshot({ path, fullPage: false, animations: "disabled", style: "nextjs-portal{display:none!important}" });
    const read = await page.evaluate((selector) => {
      const target = selector ? document.querySelector(selector) : document.querySelector("main");
      const r = target?.getBoundingClientRect();
      return {
        title: document.title, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        target: r ? { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) } : null,
        targetText: target?.textContent?.replace(/\s+/g, " ").trim().slice(0, 180) ?? null,
      };
    }, target);
    const cell = { name, role: jar.length ? "signed" : "guest", locale, width, route, image, sha256: sha(path), ...landed, ...read, pageErrors: errors };
    report.cells.push(cell);
    if (errors.length || read.overflowX > 1 || !read.target) report.failures.push({ name, errors, overflowX: read.overflowX, target: !!read.target });
    console.log(`${report.failures.at(-1)?.name === name ? "WARN" : "CAPTURE"} ${name} ${cell.landed} overflowX=${read.overflowX}`);
    return cell;
  } catch (e) {
    report.failures.push({ name, error: String(e) });
    console.log(`FAIL ${name} ${String(e)}`);
    return null;
  } finally {
    await ctx.close();
  }
}

async function post(ctx, path, data = {}) {
  const res = await ctx.request.post(`${BASE}/api/dev-test/${path}`, { data, timeout: 180_000 });
  const body = await res.json().catch(() => null);
  if (!res.ok() || !body?.ok) throw new Error(`${path}: ${res.status()} ${JSON.stringify(body).slice(0, 160)}`);
  return body;
}

try {
  // Sign in through the same demo door used by the classic parity harness.
  const player = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const sign = await player.newPage();
  await sign.goto(`${BASE}/auth/demo`, { waitUntil: "load", timeout: 180_000 });
  await sign.locator("main").first().waitFor({ timeout: 120_000 });
  await sign.waitForTimeout(900);
  const jar = (await player.cookies(BASE)).filter((c) => c.name === "kp_session");
  if (jar.length !== 1) throw new Error("demo player session missing");
  const real = await post(player, "seed-real-markets");
  if (!real.live?.[0]?.id) throw new Error("no real market to prewarm");
  // Compile the two holder routes BEFORE the five-minute free window starts.
  for (const route of ["/positions", `/markets/${real.live[0].id}`]) {
    const warm = await player.newPage();
    await open(warm, route);
    await warm.close();
  }
  const t0 = Date.now();
  const portfolio = await post(player, "seed-player-portfolio", { markets: 5 });
  const held = portfolio.marketIds?.[0];
  if (!held) throw new Error("open held market missing");

  // Highest priority: both language captures while the Sell button is live.
  for (const locale of ["en", "sw"]) {
    const target = "#main-content .ticket-target > button";
    await capture(`held-sell-${locale}-360`, jar, locale, 360, `/markets/${held}`, target);
    await capture(`held-sell-confirm-${locale}-360`, jar, locale, 360, `/markets/${held}`, target, async (page) => {
      await page.locator(target).first().click();
      await page.locator('[role="dialog"][aria-modal="true"] button.btn-gold').first().waitFor({ state: "visible", timeout: 10_000 });
      const callout = page.locator('[role="dialog"][aria-modal="true"] [role="note"]').first();
      await callout.waitFor({ state: "visible", timeout: 10_000 });
      const name = `classic-question-callout-${locale}-360`;
      const image = `${name}.png`;
      const path = resolve(OUT, image);
      await callout.screenshot({ path, animations: "disabled" });
      report.cells.push({ name, role: "signed", locale, width: 360, route: `/markets/${held}`,
        kind: "callout-crop-in-unconfirmed-Sell-dialog", image, sha256: sha(path),
        text: (await callout.textContent())?.replace(/\s+/g, " ").trim().slice(0, 180) ?? "" });
      // Do not click the gold button.
    });
  }
  report.heldWindowMs = Date.now() - t0;
  if (report.heldWindowMs >= 5 * 60_000) report.failures.push({ name: "held-window", error: `${report.heldWindowMs}ms exceeded 5 minutes` });

  // Classic home CTAs in both languages and representative phone/desktop widths.
  for (const locale of ["en", "sw"]) for (const width of [320, 360, 1280]) {
    await capture(`classic-home-cta-${locale}-${width}`, [], locale, width, "/", ".kp-hero__ctas");
  }

  const adminApi = await request.newContext({ baseURL: BASE });
  const seeded = await adminApi.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
  if (!seeded.ok()) throw new Error(`seed-admin: ${seeded.status()}`);
  const adminState = await adminApi.storageState();
  await adminApi.dispose();
  const adminJar = adminState.cookies.filter((c) => c.name === "kp_session");
  if (adminJar.length !== 1) throw new Error("admin session missing");
  for (const width of [320, 1280]) {
    await capture(`admin-tax-notice-en-${width}`, adminJar, "en", width, "/admin/tax", '[data-testid="tax-status"]');
  }
  await player.close();
} finally {
  await browser.close();
  writeFileSync(resolve(OUT, "manifest.json"), JSON.stringify(report, null, 2), "utf8");
}
if (report.failures.length) process.exitCode = 1;
