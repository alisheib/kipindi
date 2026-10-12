// Reproduces parity v3's first Sell cell (sell|en|360|/markets/:held) step by step, with a timestamp and a 90 s guard on
// each step, to find where the tip's run stalled ("browserContext.newPage" never answered). Read-only on a local server.
import { createRequire } from "node:module";
const require = createRequire("/home/user/kipindi-srv/package.json");
const { chromium } = require("playwright");

const BASE = process.env.BASE ?? "http://localhost:3076";
const HOST = new URL(BASE).hostname;
const t0 = Date.now();
const log = (s) => console.log(`${String(((Date.now() - t0) / 1000).toFixed(1)).padStart(7)}s  ${s}`);
const step = async (name, fn, ms = 90_000) => {
  log(`→ ${name}`);
  let timer;
  const r = await Promise.race([fn(), new Promise((_, no) => { timer = setTimeout(() => no(new Error(`STALLED ${ms / 1000}s`)), ms); })]).finally(() => clearTimeout(timer));
  log(`✓ ${name}`);
  return r;
};

const b = await chromium.launch();
try {
  const jar = await step("sign in the demo player", async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await p.locator("main").first().waitFor({ timeout: 120_000 });
    await p.waitForTimeout(900);
    const j = (await ctx.cookies(BASE)).filter((c) => c.name === "kp_session");
    await ctx.close();
    return j;
  });
  const api = await b.newContext();
  await api.addCookies(jar);
  const real = await step("seed-real-markets", async () => (await api.request.post(`${BASE}/api/dev-test/seed-real-markets`, { data: {} })).json());
  const any = real.live?.[0]?.id;
  await step("warm /positions and a question", async () => {
    const ctx = await b.newContext({ viewport: { width: 360, height: 800 } });
    await ctx.addCookies([...jar, { name: "kp-locale", value: "en", domain: HOST, path: "/" }]);
    const p = await ctx.newPage();
    for (const r of ["/positions", ...(any ? [`/markets/${any}`] : [])]) {
      await p.goto(BASE + r, { waitUntil: "load", timeout: 180_000 }).catch(() => {});
      await p.locator("main").first().waitFor({ timeout: 120_000 }).catch(() => {});
    }
    await ctx.close();
  }, 400_000);
  const port = await step("seed-player-portfolio {markets: 5}", async () => (await api.request.post(`${BASE}/api/dev-test/seed-player-portfolio`, { data: { markets: 5 } })).json());
  const held = port.marketIds?.[0];
  log(`held ${held} · byStatus ${JSON.stringify(port.byStatus)}`);
  for (let round = 1; round <= 2; round++) {
    const ctx = await step(`[${round}] newContext 360`, () => b.newContext({ viewport: { width: 360, height: 800 } }));
    await ctx.addCookies([...jar, { name: "kp-locale", value: "en", domain: HOST, path: "/" }]);
    const fp = await step(`[${round}] first-paint page: newPage`, () => ctx.newPage());
    await fp.route("**/*", (r) => { if (r.request().resourceType() === "script") return; r.continue().catch(() => {}); });
    await step(`[${round}] first paint: goto /markets/held (scripts held)`, () => fp.goto(`${BASE}/markets/${held}`, { waitUntil: "domcontentloaded", timeout: 30_000 }));
    await step(`[${round}] first paint: the Sell button in the markup`, () => fp.waitForFunction(() => !!document.querySelector("#main-content .ticket-target > button"), null, { timeout: 20_000 }));
    await step(`[${round}] first paint: fonts ready`, () => fp.evaluate(() => document.fonts.ready.then(() => true)));
    await step(`[${round}] first paint: page.close`, () => fp.close());
    const pg = await step(`[${round}] hydrated page: newPage  (the stalled call)`, () => ctx.newPage());
    await step(`[${round}] hydrated page: goto load`, () => pg.goto(`${BASE}/markets/${held}`, { waitUntil: "load", timeout: 180_000 }), 200_000);
    await step(`[${round}] hydrated page: main`, () => pg.locator("main").first().waitFor({ timeout: 120_000 }));
    await step(`[${round}] context close`, () => ctx.close());
  }
  log("DONE — no stall");
} catch (e) {
  log(`ERROR ${String(e?.message ?? e).split("\n")[0]}`);
  process.exitCode = 1;
} finally {
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 15_000))]);
  process.exit(process.exitCode ?? 0);
}
