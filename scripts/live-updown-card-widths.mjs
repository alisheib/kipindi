/**
 * A4 · LOOK AT THE UP & DOWN CARD, AT FOUR WIDTHS, WITH REAL MONEY ON BOTH SIDES.
 *
 *   SHOT_DIR=./shots/RUN node scripts/live-updown-card-widths.mjs [assetQuery]
 *
 * A2 made the fee smaller on Up & Down (capped-commission → loser-share). The card's
 * `Up × N est.` multiplier is POOL-DERIVED — `payoutFor` adds the prospective stake to the
 * chosen side and runs the real settlement maths — so a smaller fee must make it read
 * HIGHER. That is the claim A4 asks to be confirmed by looking, at 360 / 768 / 1024 / 1440.
 *
 * ⛔ A CARD WITH EMPTY POOLS PROVES NOTHING. On an untouched round both pools are zero, the
 * prospective bet is one-sided, the refund path gives the stake back and the button reads
 * `× 1.00` under BOTH fee models. Every one of the 28 settled loser-share rounds on
 * production at 13:37 was empty, and six players who bet simultaneously all photographed
 * `× 1.00` because the pools were still zero when they clicked. Run this only while a round
 * has money on both sides, and it PRINTS THE POOLS it saw so the reading can be checked.
 *
 * ⭐ AND IT COMPUTES THE COUNTERFACTUAL. The same pools priced under the retired
 * capped-commission profile, from the same `payoutFor`, so "reads higher" is a measured
 * difference rather than an impression.
 *
 * Read-only — it never clicks a money control.
 */
import { BASE, SHOT, browser, loginOnce, shot } from "./live/harness.mjs";
import { payoutFor } from "../src/lib/payout.ts";

const QUERY = process.argv[2] ?? "asset=BTC&d=5";
const WIDTHS = [360, 768, 1024, 1440];
const PROBE_STAKE = 1_000;

const LOSER_SHARE = { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, feeCeilingRate: 1 / 3 };
const RETIRED = { feeModel: "capped-commission", commissionRate: 0.13, feeCeilingRate: 1 / 3 };

const { b } = await browser();
try {
  const state = await loginOnce(b, "fleet:07");
  for (const width of WIDTHS) {
    const ctx = await b.newContext({ storageState: state, viewport: { width, height: width <= 400 ? 900 : 1000 } });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/updown?${QUERY}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForFunction(() => /up & down|juu na chini/i.test(document.body.innerText), null, { timeout: 45_000 });
      await page.waitForTimeout(8_000);

      const read = await page.evaluate(() => {
        const t = (el) => (el.innerText || "").replace(/\s+/g, " ").trim();
        const sides = [...document.querySelectorAll("button")].map(t).filter((s) => /est\./.test(s));
        // The pool bar renders "Up NN%" / "NN% Down" and a volume line "VOL TZS N".
        const body = t(document.body);
        return {
          sides,
          vol: (body.match(/VOL\s+TZS\s+[\d.,KM]+/i) ?? [])[0] ?? null,
          split: (body.match(/Up\s+\d+%[\s\S]{0,40}?\d+%\s+Down/i) ?? [])[0]?.replace(/\s+/g, " ") ?? null,
        };
      });
      console.log(`\n${width}px  sides=${JSON.stringify(read.sides)}  ${read.vol ?? "vol ?"}  ${read.split ?? ""}`);
      await shot(page, `a4-updown-card-${width}`);
    } finally {
      await ctx.close();
    }
  }
} finally {
  await b.close();
}

// ── The counterfactual, computed from the real pools ────────────────────────
const YES = Number(process.env.A4_YES ?? 0), NO = Number(process.env.A4_NO ?? 0);
if (YES > 0 && NO > 0) {
  console.log(`\nWith the round's REAL pools (YES ${YES.toLocaleString()} / NO ${NO.toLocaleString()}), a fresh TZS ${PROBE_STAKE.toLocaleString()} bet:`);
  // ⚠️ THE CARD FLOORS TO TWO DECIMALS, IT DOES NOT ROUND — measured 2026-08-14: it read
  // `× 2.25` and `× 1.49` against ratios of 2.2567 and 1.4971. That is the right direction
  // for a quoted multiplier (never promise more than you will pay), and a probe that
  // rounded reported a 0.01 disagreement with a card that was exactly correct. Floor here
  // too, or this instrument manufactures a defect every time it runs.
  const q = (r) => (Math.floor(r * 100) / 100).toFixed(2);
  for (const [side, label] of [["YES", "Up"], ["NO", "Down"]]) {
    const now = payoutFor({ yesPool: YES, noPool: NO, side, stake: PROBE_STAKE }, LOSER_SHARE);
    const then = payoutFor({ yesPool: YES, noPool: NO, side, stake: PROBE_STAKE }, RETIRED);
    console.log(`  ${label.padEnd(4)} loser-share × ${q(now.ratio)}   capped-commission (retired) × ${q(then.ratio)}   → ${now.ratio > then.ratio ? "HIGHER ✓" : "NOT higher ✗"}`);
  }
} else {
  console.log("\n⚠️ A4_YES / A4_NO not set — the counterfactual was NOT computed. Pass the round's real pools.");
}
console.log(`\nshots in ${SHOT}`);
