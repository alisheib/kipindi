/**
 * E-332 LIVE DRIVE — pick a wallet date filter that returns nothing, and prove the player
 * can still get out.
 *
 *   node scripts/live/wallet-empty-escape-drive.mjs
 *
 * ⛔ WHAT IT ASSERTS IS "CAN THEY LEAVE", NOT "DOES IT LOOK RIGHT". The bug was never a
 * rendering fault — the page rendered a perfectly tidy empty state. It was that the empty
 * state was the ONLY thing left: the filter bar and every exit chip were gone with it. So the
 * assertion is that a CONTROL EXISTS AND WORKS, and it is checked by pressing it.
 *
 * ⭐ POSITIVE CONTROL FIRST. It loads an unfiltered wallet and requires rows to be there. If
 * the account has no history at all, "no filter bar on an empty window" would be CORRECT
 * behaviour and the drive would pass while proving nothing.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.qa.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);

const BASE = "https://50pick.tz";
const PHONE = env.ADMIN_LOGIN_PHONE;
const PASS = env.ADMIN_LOGIN_PASSWORD;

let pass = 0, fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

try {
  // ── sign in ──────────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator('#identifier').first().fill(PHONE);
  await page.locator('#password').first().fill(PASS);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/auth/login"), { timeout: 45_000 }),
    page.click('button[type="submit"]'),
  ]);
  ok("signed in", !page.url().includes("/auth/login"), page.url());

  // ── §0 POSITIVE CONTROL — the account must HAVE history, or nothing below means anything ──
  await page.goto(`${BASE}/wallet`, { waitUntil: "networkidle", timeout: 45_000 });
  const unfilteredRows = await page.locator('[data-row-id]').count();
  const barUnfiltered = await page.locator('[data-chip^="when:"]').count();
  ok("§0 CONTROL — the wallet has history to filter", unfilteredRows > 0, `rows=${unfilteredRows}`);
  ok("§0 CONTROL — the filter bar is present unfiltered", barUnfiltered > 0, `when-chips=${barUnfiltered}`);

  // ── §1 — a window with no data. `yesterday` is the one Ali hit. ──────────────────────
  await page.goto(`${BASE}/wallet?when=yesterday`, { waitUntil: "networkidle", timeout: 45_000 });
  const body = (await page.locator("body").innerText()).toLowerCase();

  const rowsNow = await page.locator('[data-row-id]').count();
  console.log(`   (rows in the yesterday window: ${rowsNow})`);

  if (rowsNow > 0) {
    console.log("   ⚠️ 'yesterday' HAS rows on this account — the empty case was not reached.");
    console.log("   Re-run when it is empty, or point it at a window with no data.");
  }

  // ⛔ THE FIRST SYMPTOM: the copy. "Make your first deposit" to an account with history.
  ok(
    "§1 does NOT claim the account has never had activity",
    !body.includes("make your first deposit"),
    "the no-rows copy is on a funded, filtered page",
  );

  // ⛔ THE SECOND AND THIRD: is there any control left to press?
  const whenChips = await page.locator('[data-chip^="when:"]').count();
  ok("§2 the filter bar SURVIVED the empty result", whenChips > 0, `when-chips=${whenChips}`);

  // ── §3 — press the way out and prove it lands somewhere with rows. ──────────────────
  const allChip = page.locator('[data-chip="when:all"]:visible').first();
  if (await allChip.count()) {
    const href = await allChip.getAttribute("href");
    console.log(`   (pressing the way out: href=${href})`);
    await Promise.all([
      page.waitForURL((u) => !u.search.includes("when=yesterday"), { timeout: 45_000 }).catch(() => {}),
      allChip.click(),
    ]);
    await page.waitForLoadState("networkidle", { timeout: 45_000 });
    console.log(`   (landed on: ${page.url()})`);
    const after = await page.locator('[data-row-id]').count();
    ok("§3 the escape control WORKS — pressing it restores rows", after > 0, `rows after=${after} url=${page.url()}`);
  } else {
    ok("§3 the escape control WORKS — pressing it restores rows", false, "no when:all chip to press");
  }

  await page.screenshot({ path: "scripts/live/.shots/e332-wallet-empty.png", fullPage: false }).catch(() => {});
} catch (err) {
  fail++;
  console.log(`FAIL drive threw — ${err.message}`);
} finally {
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
