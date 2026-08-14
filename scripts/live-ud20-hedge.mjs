#!/usr/bin/env node
/**
 * UD-20, ON THE REAL BOARD — a hedged holder sees BOTH outcomes on a locked round.
 *
 *   SHOT_DIR=./shots/ud20 node scripts/live-ud20-hedge.mjs "asset=BTC&d=5"
 *
 * ⭐ WHY A LIVE DRIVE AND NOT JUST THE SUITE. `test:updown-hedge-quote` proves the payload and
 * reads the components; it cannot prove a player SEES the two rows, at the width they hold the
 * phone at, on the round the product actually served them. This is the other half.
 *
 * What it does, with real QA-fleet money on production:
 *   ① `fleet:09` backs UP, then backs DOWN on the SAME open round — two waves, because two
 *      concurrent sign-ins to one account is the attempt-limiting that reads as a wrong password;
 *   ② polls the ROUND PAGE until the round LOCKS (⛔ not the board — `getBoard` filters
 *      `state === "open" || "confirming"`, so a locked round is deliberately not on it);
 *   ③ reads both rows at 360 / 768 / 1024 / 1440 and measures whether either is clipped.
 *
 * ⛔ THE ASSERTION IS THE TWO FIGURES, NOT THE WORDS. It requires two DIFFERENT money amounts
 * on the page — one per outcome — because the defect this closes was a single number, and a
 * single number rendered twice would satisfy any "the copy is present" check.
 */
import { BASE, SHOT, browser, login, bodyText, shot, recorder, measureClipping, describeClipping } from "./live/harness.mjs";

const QUERY = process.argv[2] ?? "asset=BTC&d=5";
const WHO = process.env.WHO ?? "fleet:09";
const UP_CHIP = process.env.UP_CHIP ?? "5K";
const DOWN_CHIP = process.env.DOWN_CHIP ?? "2K";
const WIDTHS = [360, 768, 1024, 1440];
// ROUND=udr_x skips the betting phase and views an existing hedged round — the board card does
// not link to /updown/udr_…, so the id comes from the database, not from a scraped href.
const PRESET_ROUND = process.env.ROUND ?? null;
const rec = recorder(`LIVE UD-20 · a hedged holder on a locked round · ${QUERY}`);

/** Place one side on whatever round is open now. Returns the round id it landed on. */
async function place(side, chip) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, WHO);
    await page.goto(`${BASE}/updown?${QUERY}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForFunction(() => /up & down|juu na chini/i.test(document.body.innerText), null, { timeout: 45_000 });

    // ⚠️ There is not always an open round — poll across a boundary rather than waiting a
    // fixed time, which measures when the run started and not whether the product works.
    const chipBtn = page.locator("button").filter({ hasText: new RegExp(`^${chip}$`) }).first();
    const deadline = Date.now() + 330_000;
    let seen = false;
    while (Date.now() < deadline) {
      if (await chipBtn.isVisible().catch(() => false)) { seen = true; break; }
      await page.waitForTimeout(6_000);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(5_000);
    }
    if (!seen) throw new Error("no OPEN round took bets within 5½ minutes");
    await chipBtn.click();
    await page.waitForTimeout(700);

    const sideBtn = page.locator("button").filter({ hasText: /est\./ })
      .filter({ hasText: side === "UP" ? /Up/ : /Down/ }).first();
    await sideBtn.click({ timeout: 20_000 });
    await page.waitForTimeout(4_000);
    const txt = await bodyText(page);
    const ok = /placed|imewekwa|已下注|you're in|in this round/i.test(txt);
    // The round the bet landed on — the page links each card to its own round.
    const href = await page.locator('a[href*="/updown/udr_"]').first().getAttribute("href").catch(() => null);
    const roundId = href ? (/udr_[a-z0-9]+/i.exec(href)?.[0] ?? null) : null;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${WHO} ${side} ${chip}${roundId ? ` → ${roundId}` : ""}`);
    return { ok, roundId };
  } finally { await b.close(); }
}

// ── ① and ② · the hedge, in two waves ────────────────────────────────────────
const up = PRESET_ROUND ? { ok: true, roundId: PRESET_ROUND } : await place("UP", UP_CHIP);
rec.check(`${WHO} backs UP ${UP_CHIP}`, up.ok);
const down = PRESET_ROUND ? { ok: true, roundId: PRESET_ROUND } : await place("DOWN", DOWN_CHIP);
rec.check(`${WHO} backs DOWN ${DOWN_CHIP} on the same board — §2.4 permits the hedge`, down.ok);

const roundId = down.roundId ?? up.roundId;
rec.check("the round id was captured from the board", !!roundId, String(roundId));

// ── ③ · the round page, once it locks, at four widths ────────────────────────
if (roundId) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, WHO);
    const url = `${BASE}/updown/${roundId}`;

    // ⚠️ POLL EVERY 4 SECONDS, BECAUSE THE LOCKED WINDOW IS ONE MINUTE WIDE. Measured on
    // production: selection closes at opensAt + durationMinutes and the round closes one
    // minute later — the advertised length IS the betting time and the result phase is ADDED,
    // so "locked" lasts exactly that result phase whatever the duration. A 15s poll can miss
    // a quarter of it, and a fixed sleep would measure when the run started.
    const deadline = Date.now() + 8 * 60_000;
    let locked = false;
    while (Date.now() < deadline && !locked) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForSelector("main", { timeout: 45_000 });
      await page.waitForTimeout(1_200);
      const t = await bodyText(page);
      // The locked presentation names itself; the two-outcome rows are what we are here for.
      locked = /if it closes up|ikiwa itafunga juu|若收于上涨/i.test(t);
      if (!locked) await page.waitForTimeout(4_000);
    }
    rec.check("⭐ the round locked and the two-outcome quote appeared", locked);

    if (locked) {
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: w < 500 ? 900 : 1000 });
        await page.waitForTimeout(700);
        await shot(page, `ud20-hedged-${w}`);
        const t = await bodyText(page);
        const hasUp = /if it closes up/i.test(t);
        const hasDown = /if it closes down/i.test(t);
        // ⛔ TWO DIFFERENT FIGURES. A single number rendered twice would pass "the copy is
        // present", and a single number is precisely the defect this closes.
        const figures = await page.evaluate(() => {
          const out = [];
          for (const el of document.querySelectorAll("main *")) {
            if (el.children.length) continue;
            const m = /^(?:you get\s*)?TZS\s*([\d,]+)/i.exec((el.textContent || "").trim());
            if (m) out.push(m[1]);
          }
          return out;
        });
        const distinct = [...new Set(figures)];
        rec.check(`${w}px · both outcome rows are shown`, hasUp && hasDown, `up=${hasUp} down=${hasDown}`);
        rec.check(`${w}px · ⭐ and they carry TWO DIFFERENT amounts`, distinct.length >= 2,
                  `figures: ${distinct.slice(0, 6).join(" · ")}`);
        const clipped = await measureClipping(page);
        rec.check(`${w}px · nothing clipped`, clipped.length === 0, describeClipping(clipped));
      }
      console.log(`\n  shots in ${SHOT}`);
    }
  } finally { await ctx.close(); await b.close(); }
}
rec.done();
