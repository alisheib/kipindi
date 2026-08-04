// Does changing the ASSET actually change the DURATION options? And does the ASSET dropdown
// itself warn? Driven live, per asset, reading the real rendered options.
import { BASE, login, browser, clickByName } from "./live/harness.mjs";
const { b, ctx } = await browser();
const page = await ctx.newPage();
await login(page, "trading");
await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await clickByName(page, /\+ add chain/i);
await page.waitForTimeout(1000);

// 1 · What does the ASSET dropdown offer, and does it carry any readiness mark?
const assetTrigger = page.locator('button[role="combobox"]').first();
await assetTrigger.click();
await page.waitForTimeout(500);
const assetOpts = await page.locator('[role="option"]').allInnerTexts();
console.log("ASSET options:", assetOpts.map(a => a.split("\n")[0]).join(" | "));
console.log("  any ①②③ on the ASSET dropdown?", /[①②③]/.test(assetOpts.join("")) ? "yes" : "NO");
await page.locator('[role="listbox"]').screenshot({ path: ".qa-artifacts/drive/adm-assets.png" }).catch(()=>{});

// 2 · For each asset, what durations are offered / greyed?
for (const want of [/BTC/i, /XAU/i]) {
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.locator('button[role="combobox"]').first().click();
  await page.waitForTimeout(500);
  const opt = page.getByRole("option", { name: want }).first();
  if (!(await opt.count())) { console.log(`\n${want} not offered`); continue; }
  const picked = (await opt.innerText()).split("\n")[0];
  await opt.click();
  await page.waitForTimeout(900);

  const durTrigger = page.locator('button[role="combobox"]').filter({ hasText: /min/i }).first();
  await durTrigger.click();
  await page.waitForTimeout(600);
  const opts = await page.locator('[role="option"]').all();
  console.log(`\n${picked} →`);
  for (const o of opts) {
    const txt = (await o.innerText()).replace(/\s+/g, " ").trim();
    const dis = await o.getAttribute("aria-disabled");
    console.log(`   ${dis === "true" ? "GREYED" : "  ok  "}  ${txt.slice(0, 120)}`);
  }
  await page.locator('[role="listbox"]').screenshot({ path: `.qa-artifacts/drive/adm-dur-${picked.replace(/\W+/g,"-").slice(0,10)}.png` }).catch(()=>{});
}
await b.close();
