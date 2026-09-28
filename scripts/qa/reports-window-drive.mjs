/**
 * Drive /admin/reports as an officer and LOOK at what the page now says about each window.
 *   BASE=http://localhost:3010 node .drive-reports.mjs <shotDir>
 */
import { chromium, request } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const OUT = resolve(process.argv[2] ?? "./shots");
mkdirSync(OUT, { recursive: true });

const api = await request.newContext({ baseURL: BASE });
const seed = await api.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
if (!seed.ok()) { console.error("seed-admin failed", seed.status()); process.exit(1); }
const state = await api.storageState();
await api.dispose();

const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 1200 } });
const page = await ctx.newPage();
let bad = 0;
const ok = (l, c, x = "") => { if (!c) bad++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

// ── 1 · the head button names the month it produces ──
/* ⛔ NOT `networkidle`. This app holds a 15s payment poll, a 60s lifecycle ticker and SSE
   heartbeats, so the network NEVER goes idle and the wait burns its whole timeout instead of
   returning. It appeared to work once only because a warm `.next` answered before the pollers
   started — on a cold dev server it threw TimeoutError before a single assertion ran. Wait for the
   thing the assertion is actually about. */
await page.goto(`${BASE}/admin/reports?range=today`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "Reports" }).first().waitFor({ timeout: 120_000 });
const head = await page.locator("body").innerText();
ok("head names the pack's month, beside the rail", /Monthly pack · \w+ \d{4}/.test(head),
  head.match(/Monthly pack · \w+ \d{4}/)?.[0] ?? "(not found)");
const tip = await page.locator('[aria-label="Download Excel report"]').first().getAttribute("title");
ok("…and the Excel tooltip says it does NOT follow the rail", /does NOT follow/i.test(tip ?? ""), tip ?? "");
await page.screenshot({ path: resolve(OUT, "01-head-today.png"), clip: { x: 0, y: 0, width: 1440, height: 420 } });

// ── 2 · the window survives the tab link ──
/* The tab is a client-side Link: networkidle resolves BEFORE the RSC navigation rewrites the
   URL, so a read taken there sees the old address and convicts a working link. Wait for the URL. */
await page.locator('a[href*="tab=library"]').first().click();
await page.waitForURL(/tab=library/, { timeout: 60_000 });
await page.getByText("Maktaba ya ripoti", { exact: false }).first().waitFor({ timeout: 60_000 });
ok("clicking 'Report library' KEEPS range=today AND tab=library",
  page.url().includes("range=today") && page.url().includes("tab=library"), page.url());

// ── 3 · every card states its coverage ──
const lib = await page.locator("body").innerText();
const covers = [...lib.matchAll(/Covers (.+)/g)].map((m) => m[1].trim());
/* ⚠️ NINE CARDS, PLUS ONE when the month is in progress: the Monthly report card carries a SECOND
   Covers line for the running month. Hardcoding 9 convicted a correct page the day that row
   shipped — the count has to be derived from the same condition the page renders on. */
const monthInProgress = /MONTH IN PROGRESS/.test(lib);
const expectedCovers = 9 + (monthInProgress ? 1 : 0);
ok(`every card prints a 'Covers …' line (9 templates${monthInProgress ? " + the month in progress" : ""})`,
  covers.length === expectedCovers, `${covers.length} found, expected ${expectedCovers}`);
ok("no two coverage KINDS collapse to one phrase", new Set(covers).size >= 5, [...new Set(covers)].join(" | "));
console.log(covers.map((c, i) => `      ${i + 1}. ${c}`).join("\n"));
ok("the cadence chip now reads as a FILING cadence, not a window", /Filed (Daily|Monthly|Weekly|Quarterly|On demand)/i.test(lib));
await page.screenshot({ path: resolve(OUT, "02-library-cards.png"), fullPage: true });

// ── 3b · the month in progress: offered, and gated by a dialog that states what is missing ──
/* 🔴 A month-to-date total under a bare "September 2026" heading reads exactly like September's
   statutory return. The option is legitimate; receiving it SILENTLY is not. */
if (monthInProgress) {
  const row = page.getByText("MONTH IN PROGRESS").first()
    .locator("xpath=ancestor::div[contains(@class,'border-dashed')]");
  const rowText = (await row.innerText()).replace(/\s+/g, " ");
  ok("the month-in-progress row states the month and the days still to run",
    /so far/.test(rowText) && /still to run/.test(rowText), rowText);

  await row.getByRole("button", { name: /Download Excel report/i }).click();
  const dlg = page.locator('[role="alertdialog"]').first();
  await dlg.waitFor({ timeout: 30_000 });
  const dlgText = (await dlg.innerText()).replace(/\s+/g, " ");
  ok("clicking it opens a confirmation FIRST, naming the days remaining",
    /has not finished/i.test(dlgText) && /still to run/i.test(dlgText), dlgText.slice(0, 120));
  ok("…and the dialog says it cannot be signed or submitted",
    /cannot be signed or submitted/i.test(dlgText) && /PARTIAL/.test(dlgText));
  ok("…and it names the FORMAT that was pressed, so the confirm runs what was clicked",
    /Excel/.test(dlgText));

  /* ⭐ CANCEL MUST CANCEL. A gate that generates anyway is worse than no gate. */
  await dlg.getByRole("button", { name: /^Cancel$/ }).click();
  await dlg.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  ok("Cancel closes the dialog and generates nothing",
    !(await page.getByText(/Generating .* report/i).isVisible().catch(() => false)));
}

// ── 4 · an unreadable custom bound is SAID, not swallowed ──
await page.goto(`${BASE}/admin/reports?range=custom&from=2026-09-20T13:00:00.000Z`, { waitUntil: "domcontentloaded" });
await page.getByText(/could not be read as a date/i).first().waitFor({ timeout: 60_000 }).catch(() => { /* asserted below */ });
const warned = await page.locator("body").innerText();
ok("a pasted ISO instant in ?from is reported as unreadable", /could not be read as a date/i.test(warned));
ok("…and it says the substituted window reaches the report too", /windowed report/i.test(warned));
await page.screenshot({ path: resolve(OUT, "03-unreadable.png"), clip: { x: 0, y: 0, width: 1440, height: 560 } });

await browser.close();
console.log(`\n${bad === 0 ? "DRIVE CLEAN" : `${bad} FAILED`}`);
process.exit(bad === 0 ? 0 : 1);
