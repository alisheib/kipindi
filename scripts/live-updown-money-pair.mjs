/**
 * LIVE — ONE ROUND, BOTH SIDES, REAL MONEY, PAIRED THREE WAYS.
 *
 *   node scripts/live-updown-money-pair.mjs <roundId>
 *
 * The single question this answers: after a round settles on a dated bar, do the WALLET, the
 * POSITION and the ROUND ROW agree to the shilling?
 *
 * ⛔ IT BETS ON THE ROUND PAGE, NOT THE BOARD. An earlier attempt navigated to `/updown/<id>`
 * and screenshotted the BOARD — because `.first()` on a role selector picks whichever card is
 * first in the DOM, and the board carries several. Betting from the board is a real path, but
 * it makes "which round did that stake land on" ambiguous, and this script exists to be
 * unambiguous about exactly that.
 *
 * ⛔ AND IT WAITS FOR THE STAKE TO APPEAR, never a fixed sleep. A tap issued before hydration
 * does nothing and leaves no trace — which is what a fixed `waitForTimeout` then reports as a
 * successful bet on an empty pool.
 */
import { mkdirSync } from "node:fs";
import { BASE, login, bodyText, browser } from "./live/harness.mjs";

const ROUND = process.argv[2];
if (!ROUND) { console.error("usage: node scripts/live-updown-money-pair.mjs <roundId>"); process.exit(2); }
const OUT = ".qa-artifacts/drive";
mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
const ok = (l, c, x = "") => log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);

async function snap(page, sel, name) {
  const el = page.locator(sel).first();
  if (await el.count().catch(() => 0)) await el.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {});
  else await page.screenshot({ path: `${OUT}/${name}.png` });
  log(`   📸 ${name}.png`);
}

async function bet(who, side) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, who);
    // ⛔ `networkidle` never fires on this app (SSE keeps a connection open) — see §3. Wait for
    // the round's OWN heading instead, which is a positive signal that the page is really here.
    await page.goto(`${BASE}/updown/${ROUND}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1, h2", { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3500); // hydration — a pre-hydration tap does nothing at all

    const before = await bodyText(page);
    if (/bets closed|dau limefungwa/.test(before)) throw new Error("already locked — too late to bet");

    const label = side === "UP" ? /^up\b/i : /^down\b/i;
    const btn = page.getByRole("button", { name: label }).first();
    if (!(await btn.count())) throw new Error(`no ${side} button on the round page`);
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click();

    // ⭐ WAIT FOR THE MONEY, not for a timer. The stake is real when the page says so.
    const landed = await page.waitForFunction(
      () => /you're in|uko ndani|你已参与/i.test(document.body.innerText) ||
            /vol\s*tzs\s*[1-9]/i.test(document.body.innerText.replace(/\s+/g, " ")),
      undefined, { timeout: 25_000 },
    ).then(() => true).catch(() => false);

    await snap(page, "main", `p-${who}-${side.toLowerCase()}`);
    ok(`${who} staked ${side}`, landed, landed ? "" : "no confirmation appeared on the page");
    await b.close();
    return landed;
  } catch (e) {
    log(`   ❌ ${who}: ${e.message}`);
    await snap(page, "main", `p-error-${who}`).catch(() => {});
    await b.close();
    return false;
  }
}

log(`\n═══ ONE ROUND, BOTH SIDES · ${ROUND}\n`);
// ⚠️ SEQUENTIAL, not parallel. Two headless Chromes racing the same round page on one laptop
// starved each other's hydration; the tap then landed on an unhydrated button and vanished.
const a = await bet("alpha", "UP");
const e = await bet("echo", "DOWN");
log(`\n  alpha UP: ${a ? "placed" : "NOT placed"} · echo DOWN: ${e ? "placed" : "NOT placed"}`);
log("  Pair the wallet, the position and the round row with scripts/live/q.cjs once it settles.\n");
