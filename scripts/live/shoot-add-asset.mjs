/**
 * Re-shoot the runbook figure for Step 2 — the GUIDED Add-asset form.
 *
 * ⚠️ Element-scoped, from LIVE production, as the role that owns the surface (ADMIN — the
 * form is `accounting` on a `trading` route, so no one else can see it). The runbook's
 * figures are all captured this way: cropping a full-page composite by hard-coded x/y is
 * how the wrong round once got into the PDF unnoticed (session 12).
 *
 *   SHOT_DIR unused — it writes straight into docs/runbooks/updown-assets/.
 */
import { BASE, browser, login } from "./harness.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
  "docs", "runbooks", "updown-assets");

const { b, ctx } = await browser();
const page = await ctx.newPage();
try {
  await login(page, "admin");
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3_500);
  await page.getByRole("button", { name: /\+ add asset/i }).first().click();
  await page.waitForTimeout(1_500);

  // Pick Metals → XAU/USD, because the metals case is the one that carries BOTH warnings:
  // the locked category AND the trading window an operator most needs to read.
  await page.getByRole("combobox", { name: /asset class/i }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("option", { name: /metals/i }).first().click();
  await page.waitForTimeout(1_500);

  // The form's own <form> element, not a page crop.
  const form = page.locator("form").filter({ hasText: "Add tradable asset" }).first();
  await form.screenshot({ path: join(OUT, "03-add-asset-guided.png") });
  console.log("wrote", join(OUT, "03-add-asset-guided.png"));
} finally { await b.close(); }
