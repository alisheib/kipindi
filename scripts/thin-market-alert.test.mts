/**
 * F1 · THE LOPSIDED-MARKET ALERT — executed against the real close path.
 *
 *   npx tsx scripts/thin-market-alert.test.mts     (npm run test:thin-alert)
 *
 * 🔴 THE DEFECT. `market.selection_closed.thin_poll` fired on
 * `closeFee.capped || closeFee.smaller === 0`, and **`capped` is a capped-commission
 * concept** — `poolFee`'s loser-share arm returns `capped: false` ALWAYS, because that model
 * has no ceiling. So the alert has been half-dead since 2026-07-23 for polls, and since A2
 * (2026-08-14) it was **completely silent for Up & Down** except on a fully one-sided market.
 * It never errored. It simply stopped firing, and nothing anywhere said so.
 *
 * ⛔ AND THE PAYLOAD WAS WORSE THAN THE TRIGGER. `closeFee` is computed with NO winning side
 * (correct for a pre-outcome read) — but under loser-share that means `fee: 0`, so the alert
 * reported `feeCharged: 0` on every poll, and `worstWinnerRatio` was `netPool/larger` with no
 * fee deducted: a number that OVERSTATES what a winner on the big side will actually get.
 *
 *   §1  a genuinely lopsided LOSER-SHARE market FIRES — the case that was silent
 *   §2  ★ and the payload is model-correct: the fee is stated PER OUTCOME, and the worst
 *       winner ratio comes from `settledPayoutFor`, the function that actually settles
 *   §3  a one-sided market still fires, and a BALANCED one still does not
 *   §4  a legacy capped-commission market still fires exactly as it always did — the
 *       replacement widened the trigger, it did not move it
 *   §5  ⚠️ the three triggers are DISTINCT: each fires on a market the others miss
 *
 * ⛔ EVERY CASE DRIVES `notifySelectionClosedForMarket` ON A REAL MARKET WITH REAL POSITIONS and
 * reads the AUDIT CHAIN. A unit test of the predicate would have been green against the
 * shipped code too — the predicate was fine, it was being asked the wrong question.
 *
 * RED harness: `node scripts/thin-market-alert-red.mjs`.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, notifySelectionClosedForMarket } from "../src/lib/server/market-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { auditFlush, getAuditPage } from "../src/lib/server/audit.ts";
import { THIN_SMALLER_SIDE_SHARE, THIN_PROFIT_RATIO } from "../src/lib/payout.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const now = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance: number): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25578${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

/** The two profiles, written out rather than imported, so a change to a shipped default
 *  cannot quietly redefine what this file tests. */
const LOSER_SHARE = {
  feeModel: "loser-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10,
  commissionRate: 0.13, feeCeilingRate: 1 / 3, cashOutFeeRate: 0,
  freeExitGraceMinutes: 5, paidExitWindowMinutes: 0,
  traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05,
  thinProfitRatio: THIN_PROFIT_RATIO, estimatedWinningsRate: 0.5, showEstimatedWinnings: true,
  v: 2 as const, stampedAt: now(),
};
const CAPPED = { ...LOSER_SHARE, feeModel: "capped-commission" as const };

let marketSeq = 0;
/**
 * Build a market with a frozen snapshot, put real stakes on it through `buyPosition`, and
 * drive the REAL selection-close path. Returns the alert row, or null when none fired.
 *
 * ⛔ `selectionClosedAt` is set in the PAST so the close path runs, exactly as it does in
 * production when the per-market timer fires.
 */
async function closeWith(opts: {
  snapshot: typeof LOSER_SHARE | typeof CAPPED;
  bets: Array<{ side: "YES" | "NO"; stake: number }>;
}): Promise<{ payload: Record<string, unknown> } | null> {
  const m = await createMarket({
    titleEn: `Thin-alert fixture ${++marketSeq}`, titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  await marketStore.stamp(m.id, { feeSnapshot: opts.snapshot as never });
  for (const [i, b] of opts.bets.entries()) {
    const uid = `thin_${marketSeq}_${i}`;
    await fundedUser(uid, b.stake + 10_000);
    const r = await buyPosition(uid, { marketId: m.id, side: b.side, stake: b.stake });
    if (!r.ok) throw new Error(`fixture bet failed: ${r.error}`);
  }
  // Selections close NOW — the state the per-market timer fires in.
  await marketStore.stamp(m.id, { selectionClosedAt: new Date(Date.now() - 1_000).toISOString() });
  await notifySelectionClosedForMarket(m.id);
  await auditFlush();
  const row = getAuditPage({ limit: 400 })
    .filter((e) => e.action === "market.selection_closed.thin_poll")
    .find((e) => (e.payload as { titleEn?: string })?.titleEn === `Thin-alert fixture ${marketSeq}`);
  return row ? { payload: row.payload as Record<string, unknown> } : null;
}

// ── §1 · the case that was silent ────────────────────────────────────────────
console.log("\n§1 · a lopsided LOSER-SHARE market fires");
{
  // YES 200,000 / NO 10,000 — the smaller side is 4.8% of the pool. Under
  // capped-commission this would have capped and fired; under loser-share `capped` is
  // false, `smaller` is not 0, and the shipped trigger said nothing at all.
  const alert = await closeWith({ snapshot: LOSER_SHARE, bets: [{ side: "YES", stake: 200_000 }, { side: "NO", stake: 10_000 }] });
  ok("1.1 · ★ it FIRES — this exact market was silent before 2026-08-14", alert !== null,
     alert ? String(alert.payload.reason).slice(0, 70) : "NO ALERT");
  if (alert) {
    ok("1.2 · and it says which model it is reasoning about", alert.payload.feeModel === "loser-share", String(alert.payload.feeModel));
    ok("1.3 · the smaller side really is below the lopsided threshold",
       Number(alert.payload.smallerPctOfPool) < THIN_SMALLER_SIDE_SHARE * 100,
       `${alert.payload.smallerPctOfPool}% vs ${THIN_SMALLER_SIDE_SHARE * 100}%`);
  }
}

// ── §2 · the payload is model-correct ────────────────────────────────────────
console.log("\n§2 · the numbers in the alert are the numbers the money path uses");
{
  const alert = await closeWith({ snapshot: LOSER_SHARE, bets: [{ side: "YES", stake: 200_000 }, { side: "NO", stake: 10_000 }] });
  if (!alert) { ok("2.x · alert present", false, "NO ALERT"); }
  else {
    // Computed INDEPENDENTLY here, from the pools, at the rates the snapshot froze.
    const rate = 0.13;
    ok("2.1 · ★ the fee is stated PER OUTCOME — a single figure cannot exist under loser-share",
       "feeIfYesWins" in alert.payload && "feeIfNoWins" in alert.payload,
       JSON.stringify({ y: alert.payload.feeIfYesWins, n: alert.payload.feeIfNoWins }));
    ok("2.2 · ★ if YES wins we take 13% of the LOSING 10,000",
       alert.payload.feeIfYesWins === Math.round(rate * 10_000), String(alert.payload.feeIfYesWins));
    ok("2.3 · ★ if NO wins we take 13% of the LOSING 200,000 — twenty times as much",
       alert.payload.feeIfNoWins === Math.round(rate * 200_000), String(alert.payload.feeIfNoWins));
    // ⛔ THE SHIPPED PAYLOAD REPORTED `feeCharged: 0` HERE. That is the number an officer
    // would have read off a lopsided poll, and it was neither of these.
    ok("2.4 · ⛔ neither figure is the 0 the old payload reported",
       Number(alert.payload.feeIfYesWins) > 0 && Number(alert.payload.feeIfNoWins) > 0, "");

    // The worst winner ratio: the YES side (200,000) shares a losing pool of 10,000 less
    // the fee, so a YES holder is paid barely above stake. netPool = 210,000 − 1,300 =
    // 208,700; a YES winner's ratio is 208,700/200,000 = 1.0435 — under the 1.05 thin floor.
    const expected = (210_000 - Math.round(rate * 10_000)) / 200_000;
    ok("2.5 · ★ the worst winner ratio is the real one, from settledPayoutFor",
       Math.abs(Number(alert.payload.worstWinnerRatio) - expected) < 0.002,
       `${alert.payload.worstWinnerRatio} vs ${expected.toFixed(4)}`);
    // ⛔ The OLD payload computed netPool/larger with NO fee deducted — 210,000/200,000 =
    // 1.05, which is ABOVE the thin floor. It would have told an officer the upside was fine.
    ok("2.6 · ⛔ and it is BELOW the thin floor, where the old no-fee derivation read above it",
       Number(alert.payload.worstWinnerRatio) < THIN_PROFIT_RATIO && 210_000 / 200_000 >= THIN_PROFIT_RATIO,
       `real ${alert.payload.worstWinnerRatio} · old derivation ${(210_000 / 200_000).toFixed(4)} · floor ${THIN_PROFIT_RATIO}`);
  }
}

// ── §3 · one-sided fires, balanced does not ──────────────────────────────────
console.log("\n§3 · the ends of the range");
{
  const oneSided = await closeWith({ snapshot: LOSER_SHARE, bets: [{ side: "YES", stake: 50_000 }] });
  ok("3.1 · a ONE-SIDED market fires", oneSided !== null, oneSided ? String(oneSided.payload.reason).slice(0, 40) : "NO ALERT");
  ok("3.2 · …and says so as the reason", oneSided !== null && String(oneSided.payload.reason).startsWith("ONE-SIDED"),
     oneSided ? String(oneSided.payload.reason).slice(0, 40) : "");

  // ⭐ THE CONTROL THAT MATTERS. A trigger that fires on everything is not an alert. A
  // 50/50 book pays its winners ~1.87× and is exactly what a healthy market looks like.
  const balanced = await closeWith({ snapshot: LOSER_SHARE, bets: [{ side: "YES", stake: 100_000 }, { side: "NO", stake: 100_000 }] });
  ok("3.3 · ★ a BALANCED market does NOT fire — this alert still means something",
     balanced === null, balanced ? `FIRED: ${JSON.stringify(balanced.payload.triggers)}` : "");
}

// ── §4 · the legacy model is unchanged ───────────────────────────────────────
console.log("\n§4 · a capped-commission market still fires exactly as before");
{
  const legacy = await closeWith({ snapshot: CAPPED, bets: [{ side: "YES", stake: 200_000 }, { side: "NO", stake: 10_000 }] });
  ok("4.1 · a lopsided LEGACY market still fires", legacy !== null, legacy ? String(legacy.payload.feeModel) : "NO ALERT");
  ok("4.2 · …and is labelled as the legacy model, not silently re-priced",
     legacy !== null && legacy.payload.feeModel === "capped-commission", legacy ? String(legacy.payload.feeModel) : "");
  // Under capped-commission the fee is outcome-NEUTRAL, and the payload proves it as data
  // rather than as a claim: both figures are identical.
  ok("4.3 · ★ under capped-commission the two per-outcome fees are IDENTICAL — outcome-neutrality, stated as data",
     legacy !== null && legacy.payload.feeIfYesWins === legacy.payload.feeIfNoWins,
     legacy ? `${legacy.payload.feeIfYesWins} vs ${legacy.payload.feeIfNoWins}` : "");
}

// ── §5 · what the three triggers actually cover ──────────────────────────────
console.log("\n§5 · how the triggers relate — derived, not assumed");
//
// ⚠️ THIS SECTION FIRST ASSERTED "each trigger catches a market the others miss" AND IT
// PASSED WHILE PROVING NOTHING. Both fixtures fired BOTH triggers, and the assertion was
// loose enough (`a && b || a`) to be green anyway. Worked out properly, the relationship is
// arithmetic and it is not what the first draft assumed:
//
//   Under loser-share, a winner on the BIG side is paid
//        ratio_big = (pool − r·small) / big = 1 + (1 − r)·k,      k = small/big
//   so `thinUpside`     ⇔  k < 0.05 / (1 − r)
//   and `lopsidedBook`  ⇔  k / (1 + k) < 0.15  ⇔  k < 0.1765
//
//   At the shipped r = 13%, thinUpside needs k < 0.0575 — which is INSIDE lopsidedBook's
//   k < 0.1765. So **at today's rate `thinUpside` is a strict subset of `lopsidedBook`**:
//   it cannot fire alone. The two separate only when 0.05/(1 − r) > 0.1765, i.e. r > ~71.7%.
//
// ⛔ THAT DOES NOT MAKE `thinUpside` DEAD CODE, and it must not be deleted as redundant.
// `thinProfitRatio` is per-market frozen config and the loser-share rate is operator-tunable
// up to 100%; the moment either moves, the subset relation stops holding. What IS true is
// that `lopsidedBook` is the trigger doing the work today — which is exactly what the old
// `capped`-based trigger could not express under loser-share at all.
{
  // A · LOPSIDED BOOK ALONE. YES 200,000 / NO 20,000 — k = 0.10, so ratio_big = 1.087, well
  // clear of the 1.05 floor. Nobody is thin; the book is still 9.1% on one side. A
  // ratio-only trigger misses this market entirely, and so did the shipped `capped` one.
  const lopsidedOnly = await closeWith({ snapshot: LOSER_SHARE, bets: [{ side: "YES", stake: 200_000 }, { side: "NO", stake: 20_000 }] });
  ok("5.1 · ★ a lopsided book fires when NO winner is thin — a ratio-only trigger misses it",
     lopsidedOnly !== null, lopsidedOnly ? JSON.stringify(lopsidedOnly.payload.triggers) : "NO ALERT");
  if (lopsidedOnly) {
    const t = lopsidedOnly.payload.triggers as Record<string, boolean>;
    ok("5.2 · ★ …and it fires on lopsidedBook ALONE, with thinUpside FALSE",
       t.lopsidedBook === true && t.thinUpside === false && t.oneSided === false,
       `${JSON.stringify(t)} worstRatio=${lopsidedOnly.payload.worstWinnerRatio}`);
  }

  // B · THE SUBSET RELATION, DRIVEN. k = 0.05 (YES 200,000 / NO 10,000) is thin AND
  // lopsided. There is no k at r = 13% that is thin and NOT lopsided, and §1's fixture is
  // that same market — so this asserts the relation rather than pretending to break it.
  const thin = await closeWith({ snapshot: LOSER_SHARE, bets: [{ side: "YES", stake: 200_000 }, { side: "NO", stake: 10_000 }] });
  if (!thin) ok("5.3 · a thin market fires", false, "NO ALERT");
  else {
    const t = thin.payload.triggers as Record<string, boolean>;
    ok("5.3 · ★ at the shipped 13% rate a THIN market is always ALSO lopsided — the subset relation, driven",
       t.thinUpside === true && t.lopsidedBook === true, JSON.stringify(t));
  }

  // C · WHERE THEY SEPARATE. At an 80% loser-share rate the crossover moves: thinUpside
  // needs k < 0.25 while lopsidedBook still needs k < 0.1765, so k = 0.20 (YES 200,000 /
  // NO 40,000 — a 16.7% side, comfortably above the lopsided threshold) is THIN and NOT
  // lopsided. ⭐ This is why `thinUpside` stays: it is the only trigger that reacts to the
  // RATE, and the rate is an operator lever.
  const steep = { ...LOSER_SHARE, platformFeeRate: 0.20, operatorFeeRate: 0.60 };
  const thinOnly = await closeWith({ snapshot: steep, bets: [{ side: "YES", stake: 200_000 }, { side: "NO", stake: 40_000 }] });
  ok("5.4 · ★ at a steeper rate a HEALTHY-LOOKING book (16.7% on one side) fires on thinUpside ALONE",
     thinOnly !== null && (thinOnly.payload.triggers as Record<string, boolean>).thinUpside === true
     && (thinOnly.payload.triggers as Record<string, boolean>).lopsidedBook === false,
     thinOnly ? `${JSON.stringify(thinOnly.payload.triggers)} worstRatio=${thinOnly.payload.worstWinnerRatio} smaller=${thinOnly.payload.smallerPctOfPool}%`
              : "NO ALERT");
}

console.log(`\nthin-market-alert: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
