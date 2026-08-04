/**
 * LIVE — CAN AN ADMIN CREATE, AND CAN A PLAYER PLAY, FOLLOWING ONLY THE GUIDE?
 *
 *   node scripts/live-updown-operator-readiness.mjs
 *
 * ⛔ WHY THIS EXISTS. Everything about this handover was proved BEFORE the board was cleared,
 * before the asset bands changed, and before four admin-copy fixes deployed. "It worked earlier"
 * is not an answer to "can they start now" — the wipe deleted every observation, and a fresh
 * round has to read a price it cannot inherit from anything.
 *
 * It walks the guide's own §9 walkthrough, in order, as the roles the guide names:
 *   1 · trading officer presses Generate on the BTC 5m chain          (the admin half)
 *   2 · a player opens /updown with NO query parameters               (what a real player lands on)
 *   3 · two players take opposite sides from the board's live card    (the money half)
 *
 * ⛔ STEP 2 IS THE ONE WORTH HAVING. The board picks `activeAsset = assets[0]` and
 * `activeDuration = that asset's smallest chain`. An enabled asset with NO chains yields an empty
 * board — so if the first enabled asset is not the one the operator built a chain on, players see
 * "no games" while a round is live. Every earlier drive passed `?asset=BTC&d=5`, which hides
 * exactly that. A player has no query string.
 *
 * ⛔ REAL MONEY AND REAL PROVIDER CREDITS. Manual drive, never a gate.
 */
import { mkdirSync } from "node:fs";
import { BASE, login, bodyText, browser } from "./live/harness.mjs";

const MINUTES = Number(process.env.MINUTES ?? 5);
const OUT = ".qa-artifacts/readiness";
mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

async function snap(page, sel, name) {
  const el = page.locator(sel).first();
  if (await el.count().catch(() => 0)) await el.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {});
  else await page.screenshot({ path: `${OUT}/${name}.png` });
  log(`   📸 ${name}.png`);
}

// ── 1 · THE ADMIN HALF ──────────────────────────────────────────────────────
{
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, "trading");
    await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4500);
    const row = page.locator("tr").filter({ hasText: new RegExp(`BTC\\s*${MINUTES}m`, "i") }).first();
    ok("1.1 · the BTC chain the operator would use is on the console", await row.count() > 0);
    // ⭐ The band the guide tells them to expect. If this cell ever prints a bare 0.00% again,
    // the guide is wrong on the page it spends most words on.
    const rowText = (await row.innerText()).replace(/\s+/g, " ");
    ok("1.2 · its band reads as a DISTANCE, not a bare percentage",
       /±0\.02/.test(rowText), rowText.match(/±[\d.]+[^|]{0,12}/)?.[0] ?? rowText.slice(0, 70));

    await row.getByRole("button", { name: /generate round/i }).first().click();
    await page.waitForTimeout(17_000);
    const t = await bodyText(page);
    const refused = t.match(/could not read a price[^.]{0,110}/i);
    ok("1.3 · ⭐ Generate produced a round on a board with ZERO prior observations", !refused,
       refused?.[0] ?? "");
    await snap(page, "table:has-text('Generate')", "1-console");
  } catch (e) { ok(`1.x · admin half threw`, false, e.message.slice(0, 110)); }
  await b.close();
}

// ── 2 · WHAT A REAL PLAYER LANDS ON — no query string ───────────────────────
{
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, "alpha");
    await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    const t = await bodyText(page);
    // ⛔ Assert the CARD, not the page. The page always has chrome saying "up & down".
    const live = page.locator("article").filter({ hasText: /betting closes in/i });
    const n = await live.count();
    ok("2.1 · ⭐ a player with NO query string sees a live round", n > 0,
       n === 0 ? `board says: ${(t.match(/no (games|rounds)[^.]{0,60}/i) ?? ["(nothing about empty)"])[0]}` : `${n} live card(s)`);
    ok("2.2 · …and it is the asset+duration the operator actually built",
       n > 0 && /btc|bitcoin/i.test(await live.first().innerText()),
       n > 0 ? (await live.first().innerText()).replace(/\s+/g, " ").slice(0, 60) : "");
    await snap(page, "main", "2-player-default");
  } catch (e) { ok("2.x · player landing threw", false, e.message.slice(0, 110)); }
  await b.close();
}

// ── 3 · THE MONEY HALF — opposite sides, sequentially ───────────────────────
const volOf = (t) => Number((t.replace(/\s+/g, " ").match(/VOL\s*TZS\s*([\d,]+)/i)?.[1] ?? "0").replace(/,/g, ""));
for (const [who, side] of [["alpha", "UP"], ["echo", "DOWN"]]) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, who);
    await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4500);
    const live = page.locator("article").filter({ hasText: /betting closes in/i }).first();
    if (!(await live.count())) throw new Error("no live card on the default board");
    const before = volOf(await live.innerText());
    const btn = live.getByRole("button", { name: side === "UP" ? /^up\b/i : /^down\b/i }).first();
    if (!(await btn.count())) throw new Error(`no ${side} button`);
    await btn.click();
    // ⭐ The POOL must GROW. Comparing whole-card text is meaningless — the countdown ticks.
    const landed = await page.waitForFunction((prev) => {
      const el = [...document.querySelectorAll("article")].find((a) => /betting closes in/i.test(a.innerText));
      if (!el) return false;
      const m = el.innerText.replace(/\s+/g, " ").match(/VOL\s*TZS\s*([\d,]+)/i);
      return !!m && Number(m[1].replace(/,/g, "")) > prev;
    }, before, { timeout: 25_000 }).then(() => true).catch(() => false);
    ok(`3.${who} · ${side} staked — the POOL GREW`, landed, `TZS ${before} → ${volOf(await live.innerText())}`);
    await snap(page, "article:has-text('betting closes in')", `3-${who}-${side.toLowerCase()}`);
  } catch (e) { ok(`3.${who} · ${side}`, false, e.message.slice(0, 110)); }
  await b.close();
}

log(`\n${fail === 0 ? "✅" : "🔴"} readiness: ${pass} passed, ${fail} failed`);
log(`   Round is live. Wait ~${MINUTES + 2} min, then pair the money against the wallets.`);
process.exit(fail === 0 ? 0 : 1);
