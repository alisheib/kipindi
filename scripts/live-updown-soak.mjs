/**
 * THE SOAK — start a RUNNING chain on production and watch it for a full hour.
 *
 *   SHOT_DIR=./shots node scripts/live-updown-soak.mjs start
 *   node scripts/live-updown-soak.mjs stop
 *
 * ⛔ WHY AN HOUR AND NOT ELEVEN MINUTES. E-83 — a RUNNING chain opened 175 consecutive rounds
 * with `openPrice: null` and voided every one, over eleven hours, while the price data was
 * available the whole time. The fix was verified with **11 minutes** of live soak, which is
 * fewer rounds than the failure took to become obvious. An hour of a 3-minute chain is ~15
 * rounds; the defect it is watching for produced a void EVERY round, so an hour that stays
 * clean is a real answer and eleven minutes was not.
 *
 * ⚠️ The chain is started through the CONSOLE, not the database — starting is an audited act
 * and a DB flip would prove the engine works while skipping the control that arms it.
 */
import { browser, login, recorder, BASE, SHOT, clickByName, bodyText } from "./live/harness.mjs";

const MODE = process.argv[2] ?? "start";
const CHAIN_LABEL = process.env.SOAK_CHAIN ?? "BTC 3m";

const rec = recorder(`LIVE · soak — ${MODE} ${CHAIN_LABEL}`);
const { b, ctx } = await browser({ viewport: { width: 1600, height: 1100 } });
const page = await ctx.newPage();

try {
  await login(page, "admin");
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "networkidle" });

  // The chain's own row, found by its label — never by index. A row order that changes would
  // otherwise start a different chain than the one named, on production, with real money.
  const row = page.locator("tr").filter({ hasText: CHAIN_LABEL }).first();
  await row.waitFor({ state: "visible", timeout: 20_000 });
  const before = (await row.innerText()).replace(/\s+/g, " ").trim();
  rec.note(`row before: ${before}`);

  if (MODE === "start") {
    rec.check("the chain is STOPPED before we start it", /STOPPED/i.test(before), before);
    await row.getByRole("button", { name: /^start$/i }).click();
    // ⚠️ Start/Stop are confirmed in a dialog — skipping it looks exactly like a dead button.
    await page.waitForSelector('[role="dialog"]', { timeout: 10_000 }).catch(() => {});
    await clickByName(page, /start chain|^start$/i).catch(() => {});
  } else {
    await row.getByRole("button", { name: /^stop$/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10_000 }).catch(() => {});
    await clickByName(page, /stop chain/i).catch(() => {});
  }

  // A positive signal, from the page the server re-rendered — never from the click succeeding.
  const want = MODE === "start" ? /RUNNING/i : /STOPPED/i;
  const settled = await page.waitForFunction(
    ([label, src]) => {
      const tr = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes(label));
      return !!tr && new RegExp(src, "i").test(tr.innerText);
    },
    [CHAIN_LABEL, want.source],
    { timeout: 30_000 },
  ).then(() => true).catch(() => false);

  const after = (await row.innerText()).replace(/\s+/g, " ").trim();
  rec.check(`the chain reads ${MODE === "start" ? "RUNNING" : "STOPPED"} on the server's own render`, settled, after);
  rec.note(`row after: ${after}`);
  await page.screenshot({ path: `${SHOT}/soak-${MODE}.png` }).catch(() => {});

  const t = await bodyText(page);
  rec.check("no error surfaced", !/application error|something went wrong/.test(t));
} catch (e) {
  rec.check("driver completed", false, e.message);
  await page.screenshot({ path: `${SHOT}/soak-crash.png`, fullPage: true }).catch(() => {});
} finally {
  await b.close();
}

process.exit(rec.done() === 0 ? 0 : 1);
