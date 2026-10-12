import { createRequire } from "node:module";
const require = createRequire("/home/user/kipindi-l3/package.json");
const { chromium } = require("playwright");
const kit = await import("/home/user/kipindi-l3/scripts/live/journey-pass.mjs");
const BASE = "http://localhost:3081"; const HOST = "localhost";
const b = await chromium.launch();
try {
  const s = await kit.demoSession(b, BASE);
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addCookies([{ name: s.name, value: s.value, domain: HOST, path: "/" }, { name: kit.LOCALE_COOKIE, value: "en", domain: HOST, path: "/" }]);
  const p = await ctx.newPage();
  for (const u of (process.argv[2] ? process.argv.slice(2) : ["/updown"])) {
    await p.goto(BASE + u, { waitUntil: "load", timeout: 240_000 }); await p.waitForTimeout(3000);
    const info = await p.evaluate(() => ({
      buttons: [...document.querySelectorAll("#main-content button")].slice(0, 30).map((n) => `${n.className.slice(0, 40)} | ${n.getAttribute("aria-label") ?? n.innerText.replace(/\s+/g, " ").slice(0, 40)} | dis=${n.disabled}`),
      links: [...document.querySelectorAll("#main-content a[href^='/updown/']")].slice(0, 5).map((a) => a.getAttribute("href")),
    }));
    console.log(u, JSON.stringify(info, null, 1).slice(0, 3000));
  }
} finally { await b.close(); }
