/**
 * Live retest of the admin Markets curation screen — search + filters + refresh +
 * responsive + clean console. Seeds an admin session + markets, drives the real page.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });
await ctx.request.post(`${BASE}/api/dev-test/stress-money`, { data: {} });

const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));

await page.goto(`${BASE}/admin/markets`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=curation queue", { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(700);
ok("landed on markets (not TOTP/login)", page.url().includes("/admin/markets"), page.url());

// Baseline row count
const rowCount = async () => page.locator("table.admin-tbl tbody tr").count();
const baseRows = await rowCount();
ok("at least one market row rendered", baseRows >= 1, `rows=${baseRows}`);

// Grab a real search token from the first market title.
const firstTitle = (await page.locator("table.admin-tbl tbody tr td a.font-display").first().textContent().catch(() => "")) || "";
const token = firstTitle.trim().split(/\s+/).find((w) => w.length >= 4) || "";
ok("found a search token from first market", token.length >= 4, `title="${firstTitle}"`);

// ── Search: real token → URL updates, still shows a row ──
const searchBox = page.getByPlaceholder("Search title (EN / SW) or mkt_… id");
ok("search box present", (await searchBox.count()) > 0);
await searchBox.fill(token);
await searchBox.press("Enter");
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(500);
ok("search: URL carries ?q=", page.url().toLowerCase().includes("q="), page.url());
ok("search: matching rows shown", (await rowCount()) >= 1, `rows=${await rowCount()}`);

// ── Search: nonsense token → empty-state row ──
await searchBox.fill("zzznopematchxyz");
await searchBox.press("Enter");
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(500);
ok("search: no-match shows empty state", (await page.locator("text=No markets match the current filter.").count()) > 0);

// ── Clear returns to full list ──
await page.getByRole("link", { name: "Clear" }).click().catch(() => {});
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(500);
ok("clear: back to full list", (await rowCount()) >= 1 && !page.url().includes("q="), page.url());

// ── Status filter → LIVE only ──
// Select is a custom combobox: click trigger, pick option.
await page.getByRole("combobox").first().click();
await page.getByRole("option", { name: "LIVE", exact: true }).click().catch(() => {});
await page.getByRole("button", { name: "Search" }).click();
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(500);
ok("status filter: URL carries status=LIVE", page.url().includes("status=LIVE"), page.url());

// ── Refresh button present + clickable ──
ok("refresh button present", (await page.getByRole("button", { name: "Refresh" }).count()) > 0);
await page.getByRole("button", { name: "Refresh" }).click().catch(() => {});
await page.waitForTimeout(500);
ok("no console/page errors after refresh", errs.length === 0, errs.slice(0, 3).join(" | "));

// ── Responsiveness ──
for (const w of [320, 360, 393, 768, 1024, 1280, 1440]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(200);
  const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`no horizontal overflow @${w}w`, of <= 1, `overflow=${of}px`);
}

await page.setViewportSize({ width: 1280, height: 1200 });
await page.waitForTimeout(200);
await page.screenshot({ path: ".50pick-shots/markets-1280.png", fullPage: true });
await page.setViewportSize({ width: 360, height: 1200 });
await page.waitForTimeout(200);
await page.screenshot({ path: ".50pick-shots/markets-360.png", fullPage: true });

await browser.close();
console.log(`\nmarkets-retest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
