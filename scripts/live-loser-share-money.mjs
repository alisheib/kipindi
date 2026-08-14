/**
 * A4 / DEFINITION-OF-DONE · A REAL TWO-SIDED BET ON PRODUCTION, UNDER loser-share.
 *
 *   SHOT_DIR=./shots/RUN node scripts/live-loser-share-money.mjs [assetQuery] [durationMin]
 *   SHOT_DIR=./shots/RUN node scripts/live-loser-share-money.mjs "asset=BTC&d=5" 5
 *
 * ⚠️ REAL MONEY from QA-fleet wallets, on production. The precedent is
 * `live-bulk-play.mjs` ("authorised by Ali").
 *
 * ⭐ WHY THIS EXISTS. `scripts/live/ops/loser-share-settled.cjs` reported, on 2026-08-14
 * 13:29, that **all 18 settled loser-share rounds were EMPTY** — nobody had bet since the
 * cutover. Every money assertion about the new model was therefore passing over zero
 * shillings. A2 is verified in the database; it has never been verified in a wallet.
 *
 * ⛔ SIX PLAYERS, NOT TWO, AND BOTH SIDES. Two personas cannot exercise the fee
 * ALLOCATION: `allocateFeeShares` distributes the fee across winners by largest remainder,
 * and with one winner there is no remainder to get wrong. The stakes below are deliberately
 * unequal and deliberately not a clean division.
 *
 *   UP    fleet:01 5K · fleet:03 2K · fleet:05 1K   =  8,000
 *   DOWN  fleet:02 10K · fleet:04 1K · fleet:06 2K  = 13,000
 *
 *   UP wins   → fee = 13% × 13,000 = 1,690, split 5:2:1 → 1056.25 / 422.5 / 211.25,
 *               which does NOT divide evenly and forces the largest-remainder path.
 *   DOWN wins → fee = 13% ×  8,000 = 1,040, split 10:1:2 → 800 / 80 / 160, exact.
 *   VOID      → nothing is charged and every stake comes back — the A4 question that
 *               production could not answer either.
 *
 * ⚠️ THE DOM CONTRACT IS RE-PROBED, NEVER REMEMBERED. Measured 2026-08-14 by
 * `scripts/live/probe-updown-card.mjs`: the stake chips are `1K 2K 5K 10K Custom` — they
 * MOVED when A1 raised the floor from 500 to 1,000, and the contract recorded in
 * `live-bulk-play.mjs` (`500 1K 2.5K 5K`) is now stale. The side buttons render
 * `Up × N est.` / `Down × N est.` with an aria-label `Up — Bitcoin · TZS 1,000`.
 * ⛔ Match on rendered TEXT (`filter({hasText})`), never on the accessible name, and never
 * on the `×` (U+00D7) — it does not survive every shell/encoding path.
 *
 * The DOM is NOT the proof. `scripts/live/ops/loser-share-settled.cjs` reads the row.
 */
import { BASE, SHOT, browser, login, bodyText, shot } from "./live/harness.mjs";

const QUERY = process.argv[2] ?? "asset=BTC&d=5";

/**
 * The three A4 shapes. `two-sided` is the headline; the other two exist because production
 * had NO settled loser-share round of either kind and a suite is not production.
 *
 * ⛔ `void` MUST run on Gold or Solana. Those chains void ~100% of rounds (campaign finding
 * E-58) — betting on Bitcoin to observe a VOID is waiting for a coin to land on its edge.
 * Conversely `two-sided` must NOT run there, or it proves only that refunds work.
 */
const PLANS = {
  "two-sided": [
    { idx: "01", side: "UP",   chip: "5K"  },
    { idx: "03", side: "UP",   chip: "2K"  },
    { idx: "05", side: "UP",   chip: "1K"  },
    { idx: "02", side: "DOWN", chip: "10K" },
    { idx: "04", side: "DOWN", chip: "1K"  },
    { idx: "06", side: "DOWN", chip: "2K"  },
  ],
  // Nobody on the other side: the winning pool IS the whole pool, so there are no losers
  // to take a slice of. Two players, so "refunded in full" is more than one row.
  "one-sided": [
    { idx: "07", side: "UP", chip: "2K" },
    { idx: "08", side: "UP", chip: "1K" },
  ],
  // Both sides, on a chain whose price band the price will not clear.
  //
  // ⛔ SIX PLAYERS AND SEVEN POSITIONS, NOT TWO — Ali's standing instruction, given twice, and
  // the two-player version could not see any of the three things a refund can get wrong:
  //   · MORE THAN ONE POSITION PER SIDE. With one row per side there is no distribution to
  //     get wrong, which is the same blindness the two-sided plan's comment already records.
  //   · A HEDGED PLAYER — `fleet:09` holds BOTH sides. Unlimited positions on either side is
  //     ordinary since B, so a void must return BOTH of that player's stakes, not net them.
  //   · UNEQUAL, NON-DIVIDING STAKES. UP 8,000 vs DOWN 14,000, so a refund computed from a
  //     pool share rather than from the position itself lands on the wrong number visibly.
  // A VOID must charge nothing and return every one of the seven in full.
  //
  // ⚠️ `wave: 1` runs AFTER the others. The rest go concurrently (see the note by
  // `Promise.all`), but the hedge is the SAME account as an earlier row, and two concurrent
  // sign-ins to one account is precisely the attempt-limiting that reads as a wrong password.
  "void": [
    { idx: "09", side: "UP",   chip: "2K"  },
    { idx: "11", side: "UP",   chip: "5K"  },
    { idx: "13", side: "UP",   chip: "1K"  },
    { idx: "10", side: "DOWN", chip: "1K"  },
    { idx: "12", side: "DOWN", chip: "2K"  },
    { idx: "14", side: "DOWN", chip: "10K" },
    { idx: "09", side: "DOWN", chip: "1K", wave: 1 },
  ],
};
const PLAN_NAME = process.env.A4_PLAN ?? "two-sided";
const PLAN = PLANS[PLAN_NAME];
if (!PLAN) throw new Error(`unknown A4_PLAN "${PLAN_NAME}" — have ${Object.keys(PLANS).join(", ")}`);

/** One fleet player places one side on whatever round is open right now. */
async function play({ idx, side, chip }) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  let step = "login";
  try {
    await login(page, `fleet:${idx}`);
    step = "navigate";
    // ⚠️ NOT `networkidle` — /updown holds an open event stream, so it never fires.
    await page.goto(`${BASE}/updown?${QUERY}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForFunction(() => /up & down|juu na chini/i.test(document.body.innerText), null, { timeout: 45_000 });

    step = "primer";
    // ⛔ NAME THE EXACT CONTROL. A blanket "click anything that dismisses" once closed the
    // very confirmation the run then went looking for.
    const primer = page.locator('[role="dialog"][aria-label*="primer" i]');
    if (await primer.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      if (await primer.isVisible().catch(() => false)) throw new Error("primer would not dismiss");
    }

    step = `stake chip ${chip}`;
    // 🔴 THERE IS NOT ALWAYS AN OPEN ROUND, AND THAT IS NOT A SELECTOR BUG. Measured
    // 2026-08-14 16:34: all six players timed out on the chip in 45s, and the screenshot
    // showed a perfectly healthy board whose two BTC 5-min cards both read **CLOSED** —
    // one in its result phase ("RESULT IN 00:29", reading the closing price), one settled.
    // The stake chips do not exist while no round is taking bets, so a fixed wait measures
    // WHEN THE RUN STARTED, not whether the product works. Poll across a boundary instead,
    // and reload rather than trusting the event stream to hydrate a brand-new card.
    const chipBtn = page.locator("button").filter({ hasText: new RegExp(`^${chip}$`) }).first();
    const deadline = Date.now() + 300_000;                 // ≥ one full 5-minute boundary
    let seen = false;
    while (Date.now() < deadline) {
      if (await chipBtn.isVisible().catch(() => false)) { seen = true; break; }
      await page.waitForTimeout(5_000);
      if (await chipBtn.isVisible().catch(() => false)) { seen = true; break; }
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(6_000);
    }
    if (!seen) throw new Error("no OPEN round took bets within 5 minutes — the board showed only CLOSED/settled cards");
    await chipBtn.click();
    await page.waitForTimeout(700);

    step = "side button";
    // Both side buttons carry `est.`; only one carries `Up`/`Down`.
    const sideBtn = page.locator("button")
      .filter({ hasText: /est\./ })
      .filter({ hasText: side === "UP" ? /Up/ : /Down/ })
      .first();
    // ⭐ Capture what the button SAYS before the click — this is the pool-derived
    // multiplier A4 asks about, and after settlement the round is gone.
    const label = (await sideBtn.innerText()).replace(/\s+/g, " ").trim();
    await sideBtn.click({ timeout: 20_000 });
    await page.waitForTimeout(4_000);

    const txt = await bodyText(page);
    const ok = /placed|imewekwa|已下注|you're in|in this round/i.test(txt);
    console.log(`  ${ok ? "ok  " : "FAIL"} fleet:${idx} ${side.padEnd(4)} ${chip.padEnd(3)} — button read "${label}"`);
    if (!ok) await shot(page, `money-FAILED-${idx}`);
    return { idx, side, chip, ok, label };
  } catch (e) {
    console.log(`  FAIL fleet:${idx} ${side} ${chip} — at [${step}] — ${e.message.split("\n")[0]}`);
    await shot(page, `money-FAILED-${idx}`).catch(() => {});
    return { idx, side, chip, ok: false, label: null };
  } finally {
    await b.close();
  }
}

console.log(`\nA4 · plan "${PLAN_NAME}" on a REAL loser-share round · ${BASE}/updown?${QUERY}\n`);
console.log(`  UP    ${PLAN.filter((p) => p.side === "UP").map((p) => `fleet:${p.idx} ${p.chip}`).join(" · ") || "—"}`);
console.log(`  DOWN  ${PLAN.filter((p) => p.side === "DOWN").map((p) => `fleet:${p.idx} ${p.chip}`).join(" · ") || "—"}\n`);

// ⛔ CONCURRENTLY, ON PURPOSE. Six sequential sign-ins take ~4 minutes and a 5-minute round
// would close underneath the last of them — the bets would land on two different rounds and
// neither would be the two-sided round this exists to produce. Different accounts, so the
// per-account attempt limiting `loginOnce` exists for does not apply.
//
// ⚠️ EXCEPT WHERE THE SAME ACCOUNT APPEARS TWICE. A hedged player is two positions on one
// login, and firing both at once IS the attempt-limiting case — which fails looking exactly
// like a wrong password. Those rows carry `wave: 1` and go after the rest.
const wave0 = PLAN.filter((p) => !p.wave);
const wave1 = PLAN.filter((p) => p.wave);
const placed = await Promise.all(wave0.map(play));
if (wave1.length) {
  console.log(`\n  … wave 2: ${wave1.length} hedge position(s), after the first wave\n`);
  placed.push(...(await Promise.all(wave1.map(play))));
}

const good = placed.filter((p) => p.ok).length;
console.log(`\n${good}/${placed.length} bets placed`);
for (const p of placed) if (p.label) console.log(`   fleet:${p.idx} ${p.side} saw "${p.label}"`);
console.log(`\n⛔ THE DOM IS NOT THE PROOF. Wait for the round to settle, then:`);
console.log(`   KP_REPO=F:/kipindi-main node scripts/live/ops/loser-share-settled.cjs`);
process.exit(good === placed.length ? 0 : 1);
