/**
 * Live retest for the proposals category/date consistency work:
 *  - admin edit panel exposes Tech + Mixed/All category chips
 *  - admin edit panel orders the date fields Selection-closes → Resolution
 *  - player /proposals/new form also exposes Tech + Mixed/All
 * Complements proposals-retest.mjs (languages/overflow) and test:proposals (logic).
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errs = [];
// Ignore benign Chrome pre-interaction policy noise (haptics blocked before a tap).
const benign = (t) => /navigator\.vibrate/i.test(t);
page.on("console", (m) => { if (m.type() === "error" && !benign(m.text())) errs.push(m.text()); });
page.on("pageerror", (e) => { if (!benign(String(e))) errs.push(String(e)); });

// ── Admin edit panel ──
await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });
await ctx.request.post(`${BASE}/api/dev-test/proposals-seed`, { data: {} }).catch(() => {});
await page.setViewportSize({ width: 1280, height: 1200 });
await page.goto(`${BASE}/admin/proposals`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
ok("admin: landed on proposals", page.url().includes("/admin/proposals"), page.url());

// Open the Edit panel on the selected (first) proposal.
await page.getByRole("button", { name: "Edit", exact: true }).first().click().catch(() => {});
await page.waitForTimeout(500);
ok("admin: edit panel opened", (await page.locator("text=Edit proposal · full control").count()) > 0);

// Category chips include the new Tech + Mixed / All.
ok("admin: Tech category chip present", (await page.getByRole("button", { name: "Tech", exact: true }).count()) > 0);
ok("admin: Mixed / All category chip present", (await page.getByRole("button", { name: "Mixed / All" }).count()) > 0);

// Date field order: Selection closes comes before Resolution date in reading
// order — left of it on a wide row, or above it when the narrow review column
// stacks them. Either way selection must precede resolution.
const selBox = await page.getByText("Selection closes", { exact: true }).first().boundingBox().catch(() => null);
const resBox = await page.getByText("Resolution date", { exact: true }).first().boundingBox().catch(() => null);
ok("admin: both date field labels present", !!selBox && !!resBox);
if (selBox && resBox) {
  const sameRow = Math.abs(selBox.y - resBox.y) < 24;
  const selectionFirst = sameRow ? selBox.x < resBox.x : selBox.y < resBox.y;
  ok("admin: Selection closes precedes Resolution date", selectionFirst,
    `sel=(${Math.round(selBox.x)},${Math.round(selBox.y)}) res=(${Math.round(resBox.x)},${Math.round(resBox.y)}) sameRow=${sameRow}`);
}

// Selecting Mixed should not throw.
await page.getByRole("button", { name: "Mixed / All" }).first().click().catch(() => {});
await page.waitForTimeout(300);
ok("admin: no console errors after selecting Mixed", errs.length === 0, errs.slice(0, 3).join(" | "));

await page.screenshot({ path: ".50pick-shots/proposals-edit-mixed.png" });

// ── Player create form ──
errs.length = 0;
await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
await page.goto(`${BASE}/proposals/new`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
ok("player: Tech chip present", (await page.getByRole("button", { name: /(^|\b)Tech(\b|$)/ }).count()) > 0
  || (await page.locator("text=Tech").count()) > 0);
ok("player: Mixed / All chip present", (await page.locator("text=Mixed / All").count()) > 0);
ok("player: no console errors", errs.length === 0, errs.slice(0, 3).join(" | "));

// Responsive check on both.
for (const [path, w] of [["/admin/proposals", 360], ["/proposals/new", 360], ["/admin/proposals", 1440]]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`${path} @${w}w no overflow`, of <= 1, `overflow=${of}px`);
}

await browser.close();
console.log(`\nproposals-mixed-retest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
