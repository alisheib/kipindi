// L3 measurement — "a session lost mid-bet". For each money control (the classic dial, the sell button, Up & Down's
// quick bet): sign in (demo), reach the control, END THE SESSION from a second sign-in (single active session), then
// commit. Records every toast and dialog seen for 8 s after the commit, the address, and page errors. Local server only.
import { createRequire } from "node:module";
const require = createRequire("/home/user/kipindi-l3/package.json");
const { chromium } = require("playwright");
const kit = await import("/home/user/kipindi-l3/scripts/live/journey-pass.mjs");

const BASE = process.env.BASE ?? "http://localhost:3081";
const HOST = new URL(BASE).hostname;
const ONLY = process.argv[2] ?? "all";
const asCookie = (c) => ({ name: c.name, value: c.value, domain: HOST, path: c.path || "/" });
const b = await chromium.launch();

async function watch(page, ms = 8000) {
  const seen = { toasts: new Set(), dialogs: new Set(), urls: new Set() };
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const snap = await page.evaluate(() => ({
      toasts: [...document.querySelectorAll("[data-toaster] [role=alert], [data-toaster] [role=status]")].map((n) => `${n.getAttribute("role")}: ${n.innerText.replace(/\s+/g, " ").trim()}`),
      dialogs: [...document.querySelectorAll("[role=dialog], [role=alertdialog]")].filter((n) => n.getBoundingClientRect().height > 0).map((n) => n.innerText.replace(/\s+/g, " ").trim().slice(0, 160)),
      url: location.pathname + location.search,
    })).catch(() => null);
    if (snap) { snap.toasts.forEach((t) => seen.toasts.add(t)); snap.dialogs.forEach((d) => seen.dialogs.add(d)); seen.urls.add(snap.url); }
    await page.waitForTimeout(250);
  }
  return { toasts: [...seen.toasts], dialogs: [...seen.dialogs], urls: [...seen.urls], final: page.url().replace(BASE, "") };
}

async function surface(name, prepare, commit) {
  const session = await kit.demoSession(b, BASE);
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addCookies([asCookie(session), { name: kit.LOCALE_COOKIE, value: "en", domain: HOST, path: "/" }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`); });
  try {
    await prepare(page, ctx);
    // ── the session ends elsewhere: a second sign-in of the same account (single active session) ──
    await kit.demoSession(b, BASE);
    await commit(page);
    const r = await watch(page);
    console.log(`\n■ ${name}`);
    console.log(`  toasts : ${r.toasts.length ? r.toasts.join("\n           ") : "(none)"}`);
    console.log(`  dialogs: ${r.dialogs.length ? r.dialogs.join("\n           ") : "(none)"}`);
    console.log(`  urls   : ${r.urls.join("  →  ")}`);
    console.log(`  errors : ${errors.length ? errors.join("\n           ") : "(none)"}`);
    return r;
  } finally {
    await ctx.close().catch(() => {});
  }
}

try {
  // seed with a live session
  const s0 = await kit.demoSession(b, BASE);
  const api = await b.newContext(); await api.addCookies([asCookie(s0)]);
  const real = await (await api.request.post(`${BASE}/api/dev-test/seed-real-markets`, { data: {}, timeout: 240_000 })).json();
  const live = real.live?.[0]?.id;
  console.log(`live market: ${live}`);

  if (ONLY === "all" || ONLY === "dial") {
    await surface("classic dial — /markets/:id?side=YES, stake 1000, Confirm after the session ended", async (page) => {
      await page.goto(`${BASE}/markets/${live}?side=YES`, { waitUntil: "load", timeout: 240_000 });
      await page.waitForTimeout(2500);
      const box = page.locator('input[inputmode="numeric"]').first();
      await box.click(); await box.fill("1000"); await box.press("Enter");
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: /Place YES/ }).first().click();
      await page.locator('[role="dialog"], [role="alertdialog"]').first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(800);
    }, async (page) => {
      await page.locator('[role="dialog"] button, [role="alertdialog"] button').filter({ hasText: /^(Confirm|Place)/ }).last().click();
    });
  }

  if (ONLY === "all" || ONLY === "sell") {
    await surface("sell button — a held ticket, Sell, Confirm after the session ended", async (page, ctx) => {
      const port = await (await ctx.request.post(`${BASE}/api/dev-test/seed-player-portfolio`, { data: { markets: 3 }, timeout: 240_000 })).json();
      const held = port.marketIds?.[0];
      console.log(`  held market: ${held}`);
      await page.goto(`${BASE}/markets/${held}`, { waitUntil: "load", timeout: 240_000 });
      await page.waitForTimeout(2500);
      await page.locator("#main-content .ticket-target > button").first().click();
      await page.locator('[role="dialog"], [role="alertdialog"]').first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(800);
    }, async (page) => {
      const btns = page.locator('[role="dialog"] button, [role="alertdialog"] button');
      const texts = await btns.allInnerTexts();
      console.log(`  confirm buttons: ${JSON.stringify(texts.map((t) => t.replace(/\s+/g, " ").trim()))}`);
      await btns.filter({ hasText: /^(Sell|Confirm)/ }).last().click();
    });
  }

  if (ONLY === "all" || ONLY === "quick") {
    await surface("quick bet — /updown board, UP tapped after the session ended", async (page, ctx) => {
      const seed = await ctx.request.post(`${BASE}/api/dev-test/updown-seed`, { data: { durations: [15], feedProvider: "mock-bars", assets: ["BTC"] }, timeout: 240_000 });
      const adv = await (await ctx.request.post(`${BASE}/api/dev-test/updown-advance`, { timeout: 240_000 })).json();
      const round = adv.rounds?.[0]?.rounds?.find((r) => Date.parse(r.closesAt) - Date.now() > 5 * 60_000)?.id;
      console.log(`  updown-seed: ${seed.status()} · round ${round}`);
      await page.goto(`${BASE}/updown/${round}`, { waitUntil: "load", timeout: 240_000 });
      await page.waitForTimeout(3000);
      await page.locator("button.btn-yes:not([disabled])").first().waitFor({ timeout: 60_000 });
    }, async (page) => {
      const btn = page.locator("button.btn-yes:not([disabled])").first();
      console.log(`  tapping: ${await btn.getAttribute("aria-label")}`);
      await btn.click();
    });
  }
} finally {
  await b.close();
}
