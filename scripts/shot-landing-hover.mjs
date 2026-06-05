import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.cwd(), ".50pick-shots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
await p.waitForTimeout(900);

// Find the constellation container — locate it by its unique
// "Plate I · MMXXVI" cartouche, then walk up to the wrapping rounded
// container that holds the dials.
const cartouche = p.getByText("Plate I").first();
const cartoucheBox = await cartouche.boundingBox();
if (!cartoucheBox) {
  console.log("× no cartouche found");
} else {
  // The HeroConstellation wrapper is the container of cartouche
  // (climb to the relative-positioned rounded panel).
  const wrapper = cartouche.locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
  const wb = await wrapper.boundingBox();
  console.log(`→ constellation wrapper at`, wb);

  if (wb) {
    // HC_MARKETS positions (x, y as fraction)
    const MARKETS = [
      { id: "afcon", x: 0.20, y: 0.34 },
      { id: "rains", x: 0.42, y: 0.66 },
      { id: "bot",   x: 0.34, y: 0.20 },
      { id: "usd",   x: 0.60, y: 0.26 },
      { id: "simba", x: 0.74, y: 0.58 },
    ];
    // Shot 1 — no hover, full landing
    await p.mouse.move(0, 0);
    await p.waitForTimeout(400);
    await p.screenshot({ path: resolve(OUT, "landing-hero-no-hover.png"), fullPage: false });
    console.log("✓ saved landing-hero-no-hover.png");

    // Shot 2 — hover AFCON (top-left, biggest dial)
    const afcon = MARKETS[0];
    await p.mouse.move(wb.x + wb.width * afcon.x, wb.y + wb.height * afcon.y);
    await p.waitForTimeout(550);
    await p.screenshot({ path: resolve(OUT, "landing-hero-dial-hover.png"), fullPage: false });
    console.log("✓ saved landing-hero-dial-hover.png (AFCON)");

    // Shot 3 — hover SIMBA (right side, right-tethered tooltip)
    await p.mouse.move(0, 0);
    await p.waitForTimeout(400);
    const simba = MARKETS[4];
    await p.mouse.move(wb.x + wb.width * simba.x, wb.y + wb.height * simba.y);
    await p.waitForTimeout(550);
    await p.screenshot({ path: resolve(OUT, "landing-hero-dial-hover-right.png"), fullPage: false });
    console.log("✓ saved landing-hero-dial-hover-right.png (Simba)");
  }
}

await p.close();
await ctx.close();
await browser.close();
