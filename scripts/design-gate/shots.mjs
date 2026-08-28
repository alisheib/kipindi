/** Clean 1440 full-page shots (no hover pass, fresh page each) — overwrites <slug>-1440.png.  SURFACE=admin|player PERSONA=… */
import { chromium } from "playwright";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loginOnce, BASE } from "../live/harness.mjs";
const SURFACE = process.env.SURFACE || "admin";
const PERSONA = process.env.PERSONA || (SURFACE === "admin" ? "admin" : "alpha");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "..", ".qa-design-gate", `out-${SURFACE}`);
const routes = readdirSync(OUT).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => JSON.parse(readFileSync(path.join(OUT, f), "utf8"))).filter((r) => r.route).map((r) => ({ route: r.route, slug: r.slug }));
const browser = await chromium.launch();
const state = await loginOnce(browser, PERSONA);
const ctx = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
for (const { route, slug } of routes) {
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + route, { waitUntil: "load", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `${slug}-1440.png`), fullPage: true });
    console.log("shot", route);
  } catch (e) { console.log("FAIL", route, e.message.slice(0, 80)); }
  await page.close();
}
await browser.close();
console.log("done", routes.length);
