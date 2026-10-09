// E45 probe (R4-K): which PLATFORM font draws each zh element — CDP CSS.getPlatformFontsForNode, the browser's own answer.
// Run from a worktree with node_modules (playwright) and a running server:
//   node <this file> http://localhost:<port> [cookieHeaderForAPlayer]
// Prints, per element: computed font-family / weight / size, and the platform fonts used with their glyph counts.
// A "SimSun" line on a 600-weight element and "Microsoft YaHei" on its 700 neighbour settles the mechanism.
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://localhost:3000";
const PLAYER_COOKIE = process.argv[3] ?? "";
const CASES = [
  { path: "/does-not-exist", sel: "nav[aria-label] a p", note: "not-found card label · font-display 600 13px" },
  { path: "/does-not-exist", sel: "h1", note: "not-found h1 · font-display 700 28px" },
  { path: "/positions", sel: "[data-empty-state] p", note: "tickets empty title · font-display 600 15.5px (E45)", player: true },
  { path: "/positions", sel: "[data-empty-state] a.btn", note: "tickets empty button · .btn 600 14px (E45)", player: true },
  { path: "/positions", sel: "[data-testid=journey-deposit] span:last-child", note: "deposit pill · .btn 600 14px", player: true },
  { path: "/positions", sel: "h1", note: "PageHeader h1 · font-display 700 28px", player: true },
];

const browser = await chromium.launch();
try {
  for (const c of CASES) {
    if (c.player && !PLAYER_COOKIE) { console.log(`SKIP ${c.path} ${c.sel} (no player cookie)`); continue; }
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 });
    const cookies = [{ name: "kp-locale", value: "zh", url: BASE }];
    if (c.player) for (const kv of PLAYER_COOKIE.split(/;\s*/)) { const i = kv.indexOf("="); if (i > 0) cookies.push({ name: kv.slice(0, i), value: kv.slice(i + 1), url: BASE }); }
    await ctx.addCookies(cookies);
    const page = await ctx.newPage();
    await page.goto(BASE + c.path, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$(c.sel);
    if (!el) { console.log(`MISS ${c.path} ${c.sel}`); await ctx.close(); continue; }
    const cs = await el.evaluate((n) => { const s = getComputedStyle(n); return { family: s.fontFamily, weight: s.fontWeight, size: s.fontSize, text: n.textContent?.trim().slice(0, 24) }; });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: c.sel });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    console.log(`${c.note}\n  "${cs.text}"  weight ${cs.weight}  size ${cs.size}\n  family: ${cs.family}\n  platform: ${fonts.map((f) => `${f.familyName}${f.postScriptName ? ` (${f.postScriptName})` : ""} ×${f.glyphCount}${f.isCustomFont ? " [web]" : ""}`).join(" | ")}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
