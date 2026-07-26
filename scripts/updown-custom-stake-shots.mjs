/**
 * Visual proof for the Up & Down quick-bet upgrade: the "＋ Custom" chip, the inline
 * custom-amount field, and the round-detail bet box — at mobile + desktop, asserting
 * no horizontal overflow and no console errors.
 *
 *   BASE=http://localhost:3000 node scripts/updown-custom-stake-shots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "shots-updown");
const WIDTHS = [360, 1280];
mkdirSync(OUT, { recursive: true });

let failures = 0;
const fail = (m) => { failures++; console.log(`  ✗ ${m}`); };
const pass = (m) => console.log(`  ✓ ${m}`);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

console.log("=== seeding ===");
await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001", name: "Ali Admin" } });
const seed = await page.request.post(`${BASE}/api/dev-test/updown-seed`, { data: { durations: [5, 15] } });
const seedJson = await seed.json().catch(() => null);
seedJson?.ok ? pass("seeded updown chains") : fail(`seed failed: ${JSON.stringify(seedJson)?.slice(0, 160)}`);
const adv = await page.request.post(`${BASE}/api/dev-test/updown-advance`, { data: {} }).catch(() => null);
const advJson = adv ? await adv.json().catch(() => null) : null;

for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: width < 768 ? 900 : 1000 });

  // Idle board — the Custom chip is present next to the presets.
  await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(600);
  const customChip = page.locator('button[aria-label="Custom"]').first();
  const hasChip = await customChip.count();
  hasChip ? pass(`${width}px · Custom chip present`) : fail(`${width}px · no Custom chip`);
  let o = await overflow();
  o <= 1 ? pass(`${width}px · idle no overflow`) : fail(`${width}px · idle OVERFLOW ${o}px`);
  await page.screenshot({ path: join(OUT, `custom-idle-${width}.png`), fullPage: false });

  // Open custom mode — the inline numeric field appears; type a value.
  if (hasChip) {
    await customChip.click();
    await page.waitForTimeout(250);
    const input = page.locator('input[aria-label="Custom stake amount"]').first();
    (await input.count()) ? pass(`${width}px · custom field opens`) : fail(`${width}px · custom field missing`);
    await input.fill("1250").catch(() => {});
    await page.waitForTimeout(150);
    o = await overflow();
    o <= 1 ? pass(`${width}px · custom-open no overflow`) : fail(`${width}px · custom-open OVERFLOW ${o}px`);
    await page.screenshot({ path: join(OUT, `custom-open-${width}.png`), fullPage: false });

    // Invalid value (below min) — the field shows the range hint, buttons disable.
    await input.fill("5").catch(() => {});
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(OUT, `custom-invalid-${width}.png`), fullPage: false });
  }
}

// Round detail — the inline bet box with the same controls.
const firstRoundId = advJson?.rounds?.flatMap((c) => c.rounds ?? [])?.[0]?.id ?? null;
if (firstRoundId) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 768 ? 1100 : 1100 });
    await page.goto(`${BASE}/updown/${firstRoundId}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(500);
    const o = await overflow();
    o <= 1 ? pass(`detail ${width}px no overflow`) : fail(`detail ${width}px OVERFLOW ${o}px`);
    await page.screenshot({ path: join(OUT, `custom-detail-${width}.png`), fullPage: true });
  }
} else {
  console.log("  (no open round for a detail shot)");
}

errs.length ? fail(`console errors: ${errs.slice(0, 2).join(" | ").slice(0, 200)}`) : pass("no console errors");

await browser.close();
console.log(failures ? `\n✗ ${failures} issue(s) — READ the shots` : "\n✓ custom-stake shots OK — READ the PNGs in docs/shots-updown");
process.exit(failures ? 1 : 0);
