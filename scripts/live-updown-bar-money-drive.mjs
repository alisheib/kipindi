/**
 * LIVE — ONE ROUND, BOTH SIDES, REAL MONEY, ON THE **DATED BAR** READER.
 *
 *   node scripts/live-updown-bar-money-drive.mjs [durationMinutes]
 *
 * ⛔ WHY THIS EXISTS SEPARATELY FROM `live-updown-money-pair.mjs`. That drive proved the money
 * pairs — but it ran while the live server was still on the QUOTE reader (the switch was in the
 * database and not yet in the process, §6al ①). So the platform has never had a round settled
 * from a dated bar WITH REAL MONEY ON IT. Same money path, yes — and "same code path" is exactly
 * the reasoning this campaign has been wrong about before. Drive it.
 *
 * ⛔ IT BETS FROM THE BOARD'S **LIVE** CARD. Reaching `/updown/<id>` straight after generation
 * sometimes renders the board instead (same family as E-70), and a role-based `.first()` then
 * taps whichever card is first in the DOM — which may be a settled one. The live card is selected
 * by the text only a live card carries.
 *
 * ⛔ REAL MONEY AND REAL PROVIDER CREDITS. Manual drive tool, never a gate.
 */
import { mkdirSync } from "node:fs";
import { BASE, login, bodyText, browser, clickByName } from "./live/harness.mjs";

const MINUTES = Number(process.argv[2] ?? 5);
const OUT = ".qa-artifacts/drive";
mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
const ok = (l, c, x = "") => log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** ⛔ element screenshot, never fullPage. */
async function snap(page, sel, name) {
  const el = page.locator(sel).first();
  if (await el.count().catch(() => 0)) await el.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {});
  else await page.screenshot({ path: `${OUT}/${name}.png` });
  log(`   📸 ${name}.png`);
}

// ── 1 · GENERATE, through the console, as the trading officer ───────────────
if (!process.env.SKIP_GENERATE) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, "trading");
    await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const row = page.locator("tr").filter({ hasText: new RegExp(`BTC\\s*${MINUTES}m`, "i") }).first();
    if (!(await row.count())) throw new Error(`no BTC ${MINUTES}m chain row on the console`);
    await row.getByRole("button", { name: /generate round/i }).first().click();
    log(`   Generate round clicked (BTC ${MINUTES}m)`);
    await page.waitForTimeout(16_000);
    const t = await bodyText(page);
    const refused = t.match(/could not read a price[^.]{0,120}/i);
    ok("1 · the console did not refuse", !refused, refused?.[0] ?? "");
  } catch (e) {
    log(`   ❌ generate: ${e.message}`);
    await b.close();
    process.exit(1);
  }
  await b.close();
}

// ── 2 · BOTH SIDES, from the board's LIVE card, sequentially ───────────────
// ⚠️ Sequential, not parallel: two headless Chromes on one laptop starved each other's
// hydration, and a tap on an unhydrated button vanishes without a trace.
for (const [who, side] of [["alpha", "UP"], ["echo", "DOWN"]]) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, who);
    // ⛔ NAME THE ASSET AND THE DURATION. The board defaults to one duration tab (3 min), so a
    // 5-minute round simply is not rendered — which reads as "no live card" and looks like the
    // round failing to open. It had not: the tab was wrong.
    await page.goto(`${BASE}/updown?asset=BTC&d=${MINUTES}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    const live = page.locator("article").filter({ hasText: /betting closes in/i }).first();
    if (!(await live.count())) throw new Error("no LIVE card on the board");
    // ⛔ READ THE VOLUME FIGURE, NOT THE WHOLE CARD.
    //
    // 🔴 The first version compared the card's full `innerText` before and after the tap — and
    // the card contains a COUNTDOWN, which changes every second. So the comparison was always
    // true and the check reported PASS for a tap that never landed, on a pool of TZS 0. The
    // fourth time this session that a check completed without touching the thing it named.
    const volOf = (t) => Number((t.replace(/\s+/g, " ").match(/VOL\s*TZS\s*([\d,]+)/i)?.[1] ?? "0").replace(/,/g, ""));
    const before = volOf(await live.innerText());
    const btn = live.getByRole("button", { name: side === "UP" ? /^up\b/i : /^down\b/i }).first();
    if (!(await btn.count())) throw new Error(`no ${side} button on the live card`);
    await btn.click();
    // ⭐ Wait for the POOL to GROW — the money is the evidence, and only the money.
    const landed = await page.waitForFunction(
      (prev) => {
        const el = [...document.querySelectorAll("article")].find((a) => /betting closes in/i.test(a.innerText));
        if (!el) return false;
        const m = el.innerText.replace(/\s+/g, " ").match(/VOL\s*TZS\s*([\d,]+)/i);
        return !!m && Number(m[1].replace(/,/g, "")) > prev;
      },
      before, { timeout: 25_000 },
    ).then(() => true).catch(() => false);
    const after = volOf(await live.innerText());
    ok(`2.${who} · ${side} staked — the POOL GREW`, landed, `TZS ${before} → ${after}`);
    await snap(page, "article:has-text('betting closes in')", `bar-${who}-${side.toLowerCase()}`);
    await b.close();
  } catch (e) {
    log(`   ❌ ${who}: ${e.message}`);
    await snap(page, "main", `bar-error-${who}`).catch(() => {});
    await b.close();
  }
}

log(`\n  Round is live. Wait ~${MINUTES + 2} minutes, then pair the money:`);
log("    railway run -s 50pick -- node scripts/live/q.cjs <q-money.sql>\n");
