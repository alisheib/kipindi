// Reproduce the hydration attribute mismatch seen once on journey /results (en, 360, signed in, pass) — full React text.
import { createRequire } from "node:module";
const require = createRequire("/home/user/kipindi-l3/package.json");
const { chromium } = require("playwright");
const kit = await import("/home/user/kipindi-l3/scripts/live/journey-pass.mjs");
const BASE = process.env.BASE ?? "http://localhost:3081";
const host = new URL(BASE).hostname;
const b = await chromium.launch();
const asCookie = (c) => ({ name: c.name, value: c.value, domain: host, path: c.path || "/" });
try {
  const pass = await kit.mintStaffPass(b, BASE);
  const session = await kit.demoSession(b, BASE);
  const seed = await b.newContext(); await seed.addCookies([asCookie(session)]);
  for (const r of ["seed-markets", "seed-player-portfolio", "seed-watchlist"]) {
    const res = await seed.request.post(`${BASE}/api/dev-test/${r}`, { data: r === "seed-player-portfolio" ? { markets: 12 } : {}, timeout: 240_000 });
    console.log(r, res.status());
  }
  await seed.close();
  for (const locale of ["en", "sw", "zh"]) for (let round = 1; round <= 3; round++) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 780 } });
    await ctx.addCookies([asCookie(pass), asCookie(session), { name: kit.LOCALE_COOKIE, value: locale, domain: host, path: "/" }]);
    const page = await ctx.newPage();
    const msgs = [];
    page.on("console", (m) => { if (m.type() === "error") msgs.push(m.text()); });
    await page.goto(`${BASE}/results`, { waitUntil: "load", timeout: 240_000 });
    await page.waitForTimeout(3000);
    const hyd = msgs.filter((m) => /hydrat|didn't match/i.test(m));
    console.log(`/results ${locale} round ${round}: ${hyd.length} hydration message(s)`);
    for (const m of hyd) console.log("   " + m.slice(0, 4000).replace(/\n/g, "\n   "));
    await ctx.close();
  }
} finally { await b.close(); }
