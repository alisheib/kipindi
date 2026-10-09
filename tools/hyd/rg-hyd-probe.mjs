// The responsible-gambling page hydrates with no mismatch, and the SERVER's HTML already states the reality-check box's
// bounds (the Field's "Min 5 · Max 120" line, named by the box's aria-describedby).
// Run from a worktree (cwd) against BASE, as the demo player, in en and sw at 390 and 1280: four fresh loads.
//   node rg-hyd-probe.mjs                 the fix: no hydration error on any load, the bounds in the server's HTML
//   node rg-hyd-probe.mjs --expect-red    the CONTROL, on a tree without the fix: the probe must SEE the error
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const TREE = process.cwd();
const BASE = process.env.BASE ?? "http://localhost:3074";
const EXPECT_RED = process.argv.includes("--expect-red");
const require = createRequire(join(TREE, "package.json"));
const { chromium } = require("playwright");
const { demoSession, LOCALE_COOKIE } = await import(pathToFileURL(join(TREE, "scripts/live/journey-pass.mjs")).href);

const PATH = "/profile/responsible-gambling";
const BOX = 'input[name="realityCheckIntervalMin"]';
const browser = await chromium.launch();
const session = await demoSession(browser, BASE);
const rows = [];
for (const locale of ["en", "sw"]) {
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addCookies([session, { name: LOCALE_COOKIE, value: locale, url: BASE }]);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e?.message ?? e).split("\n")[0].slice(0, 160)));
    page.on("console", (m) => {
      if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(`console: ${m.text().split("\n")[0].slice(0, 160)}`);
    });
    const res = await page.goto(BASE + PATH, { waitUntil: "load", timeout: 240_000 });
    // Hydrated: React has attached its fiber to the reality-check box.
    await page.waitForFunction((sel) => {
      const el = document.querySelector(sel);
      return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber"));
    }, BOX, { timeout: 120_000 });
    await page.waitForTimeout(2000);
    // The server's HTML for this same viewer, read directly.
    const html = await (await ctx.request.get(BASE + PATH)).text();
    const tag = new RegExp(`<input[^>]*name="realityCheckIntervalMin"[^>]*>`).exec(html)?.[0] ?? "";
    const describedBy = /aria-describedby="([^"]*)"/.exec(tag)?.[1] ?? "";
    const hintId = describedBy.split(" ").find((id) => id.endsWith("-hint")) ?? null;
    const serverHint = hintId === null ? "" : (new RegExp(`<p id="${hintId}"[^>]*>([\\s\\S]*?)</p>`).exec(html)?.[1] ?? "")
      .replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "").trim();
    const liveHint = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const id = (el?.getAttribute("aria-describedby") ?? "").split(" ").find((i) => i.endsWith("-hint"));
      return id ? (document.getElementById(id)?.textContent ?? "").trim() : "";
    }, BOX);
    rows.push({
      locale, width, status: res?.status() ?? null, errors,
      boxInServerHtml: tag !== "", serverHint, liveHint,
      serverStatesBounds: /\b5\b/.test(serverHint) && /\b120\b/.test(serverHint),
    });
    await ctx.close();
  }
}
await browser.close();

for (const r of rows) {
  console.log(`${r.locale}@${r.width} · HTTP ${r.status} · hydration errors ${r.errors.length} · box in server HTML ${r.boxInServerHtml}`
    + ` · server hint ${JSON.stringify(r.serverHint)} · browser hint ${JSON.stringify(r.liveHint)}`);
  for (const e of r.errors) console.log(`    ${e}`);
}
const clean = rows.every((r) => r.status === 200 && r.boxInServerHtml && r.errors.length === 0 && r.serverStatesBounds && /\b120\b/.test(r.liveHint));
const seen = rows.some((r) => r.errors.some((e) => /hydrat/i.test(e))) && rows.some((r) => r.boxInServerHtml && !r.serverStatesBounds);
if (EXPECT_RED) {
  console.log(seen
    ? `CONTROL HOLDS — without the fix the probe sees the hydration error and a server HTML with no bounds (${rows.filter((r) => r.errors.length).length}/4 loads)`
    : "CONTROL FAILED — without the fix the probe saw no hydration error: it proves nothing");
  process.exit(seen ? 0 : 1);
}
console.log(clean
  ? "PASS — 4/4 loads: no hydration error, and the server's HTML states the bounds the browser shows"
  : "FAIL — see the rows above");
process.exit(clean ? 0 : 1);
