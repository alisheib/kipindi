// check-qcell.mjs <label> <outDir> — run from a tree by mln-server-run.sh (BASE set): the demo player, English, 1280×900,
// an OPEN market's question page; waits for the chart, then reads main>div0>div0's computed margins and box, whether the
// chart drew (.tv-lightweight-charts with a canvas), and screenshots the page. Read-only against a local dev server.
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const [label, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const BASE = process.env.BASE;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
const p = await ctx.newPage();
await p.goto(BASE + "/auth/demo", { waitUntil: "load", timeout: 120000 });
await p.goto(BASE + "/markets", { waitUntil: "load", timeout: 120000 });
// The parity harness's own door: real seeded markets, the first an open question.
const seeded = await (await ctx.request.post(`${BASE}/api/dev-test/seed-real-markets`, { data: {} })).json().catch(() => ({}));
const id = (Array.isArray(seeded?.marketIds) ? seeded.marketIds[0] : null) ?? seeded?.live?.[0]?.id ?? null;
const href = id ? `/markets/${id}` : "";
console.log(label, "BASE", BASE, "seeded", Array.isArray(seeded?.marketIds) ? seeded.marketIds.length : "none", "→", href);
if (!href) { console.log(label, "NO MARKET", JSON.stringify(seeded).slice(0, 200)); await b.close(); process.exit(2); }
await p.goto(BASE + href, { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(6000);
const r = await p.evaluate(() => {
  const el = document.querySelector("main > div:nth-child(1) > div:nth-child(1)");
  const cs = el ? getComputedStyle(el) : null;
  const box = el ? el.getBoundingClientRect() : null;
  const chart = document.querySelector(".tv-lightweight-charts");
  return { href: location.pathname, cls: el?.className?.slice(0, 120), marginL: cs?.marginLeft, marginR: cs?.marginRight, maxW: cs?.maxWidth,
    box: box && { x: box.x, w: box.width }, chart: !!chart, chartCanvas: !!chart?.querySelector("canvas"), lang: document.documentElement.lang };
});
console.log(label, JSON.stringify(r));
await p.screenshot({ path: `${out}/${label}.png`, fullPage: false });
writeFileSync(`${out}/${label}.json`, JSON.stringify(r, null, 1));
await b.close();
