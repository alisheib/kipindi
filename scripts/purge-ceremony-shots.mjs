/**
 * DRIVE THE PURGE CEREMONY IN A REAL BROWSER, and photograph every step.
 *
 * ⛔ THE EMPTY-STATE SCREENSHOT PROVES NOTHING ABOUT THE CEREMONY. /admin/retention with no
 * archived chains shows one sentence; the cost panel, the danger callout, the typed gate and
 * the determinate progress bar — the four things Ali actually asked for — are all behind having
 * a chain to purge. So this seeds one, stops it, archives it, and walks the two-officer flow.
 *
 * ⚠️ Runs against `next dev` on the in-memory store, and the write-up says so. The money tables
 * have no in-memory twin, so this exercises the CEREMONY and the RENDERING — not the deletion
 * of markets, which needs a database and belongs to a live drive.
 *
 *   BASE=http://localhost:3001 node scripts/purge-ceremony-shots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3001";
const OUT = join(process.cwd(), "docs", "shots-scan-2026-08-28");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
const page = await ctx.newPage();

const shot = async (name) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, "purge-" + name + ".png"), fullPage: true });
  console.log("  📷 purge-" + name + ".png");
};

await page.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.request.get(BASE + "/api/dev-test/promote-admin", { timeout: 120000 }).catch(() => {});
const promoted = await page.request.post(BASE + "/api/dev-test/promote-admin", {
  data: { phone: "+255700000000" }, timeout: 120000,
});
if (!promoted.ok()) throw new Error("promote-admin: HTTP " + promoted.status());

console.log("seeding an Up & Down chain…");
const seeded = await page.request.post(BASE + "/api/dev-test/updown-seed", { data: {}, timeout: 120000 });
console.log("  seed → HTTP " + seeded.status());

await page.goto(BASE + "/admin/updown", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);
await shot("00-updown-before");

/**
 * STOP then ARCHIVE, through the REAL controls. The service refuses to archive a RUNNING chain
 * ("a running chain is still opening rounds"), so this is the operator's actual sequence — and
 * driving the buttons rather than calling the service behind them is what makes the resulting
 * screenshot evidence of the product rather than of a fixture.
 */
async function pressAll(label, confirmPattern) {
  for (let i = 0; i < 6; i++) {
    const btn = page.getByRole("button", { name: new RegExp("^" + label + "$") }).first();
    const n = await btn.count();
    console.log("    " + label + " pass " + (i + 1) + ": " + n + " trigger(s)");
    if (n === 0) break;
    await btn.click().catch((e) => console.log("      trigger click failed: " + e.message.slice(0, 60)));
    await page.waitForTimeout(1200);
    const confirm = page.getByRole("button", { name: confirmPattern }).first();
    const c = await confirm.count();
    console.log("      confirm button(s): " + c);
    if (c > 0) {
      await confirm.click().catch((e) => console.log("      confirm click failed: " + e.message.slice(0, 60)));
      await page.waitForTimeout(2500);
    } else {
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(400);
      break;
    }
  }
}

await pressAll("Stop", /Stop chain/i);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
/* ⚠️ EXACTLY "Archive chain", not an alternation including /Archive$/. The trigger button in
   the row is also called "Archive", so a loose pattern matched the TRIGGER first and re-opened
   the dialog instead of confirming it — the run then reported success having archived nothing. */
await pressAll("Archive", /^Archive chain$/);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await shot("00b-updown-archived");

await page.goto(BASE + "/admin/retention", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);
await shot("01-retention-card");

/* ⚠️ role="combobox", NOT a native <select>. The kit's Select is an APG select-only combobox —
   a native-element locator matched nothing and the run reported "no archived chain" while the
   picker was plainly on screen. A locator that cannot find the control reports the same thing
   as a control that is not there. */
await page.waitForTimeout(3000);
const hasSelect = await page.getByRole("combobox", { name: /Archived chain/i }).count();
console.log("  archived-chain combobox(es): " + hasSelect);
const costVisible = await page.getByText("What this deletes").count();
console.log("  cost panel present: " + (costVisible > 0));
if (hasSelect > 0) {
  console.log("  archived chain present — driving the ceremony");
  const reason = page.locator('input[placeholder*="chain retired"]');
  if ((await reason.count()) > 0) {
    await reason.fill("pilot chain retired after the 3m trial");
    await shot("02-stage1-filled");
    await page.getByRole("button", { name: /Record the reason/i }).click().catch(() => {});
    await page.waitForTimeout(3000);
    await shot("03-stage1-recorded");

    /* Stage 2 is refused for the SAME officer — which is the point of the ceremony, and worth
       photographing: the attestation rail is what officer A sees. */
    const confirmBtn = page.getByRole("button", { name: /Confirm as second officer/i });
    if ((await confirmBtn.count()) > 0) {
      await confirmBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
      await shot("04-confirm-modal");
    }
  }
} else {
  console.log("  ⚠️ no archived chain in the picker — the card is showing its empty state");
}

await browser.close();
console.log("\ndone → docs/shots-scan-2026-08-28/purge-*.png");
