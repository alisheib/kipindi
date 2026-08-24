/**
 * THE ANCHORS `red:payout-alloc` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason every anchors file here gives: `test:red-anchors` must answer
 * *"does every anchor still resolve, exactly once?"* WITHOUT executing a harness that rewrites
 * real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE (E-200, measured on production 2026-08-24) ──────
 * `winnersForAllocation` decides WHICH positions the two largest-remainder allocators are
 * fed. Both document one precondition — `Σ(stake over winners) == winningPool` — and the
 * settlement broke it by filtering on `side` alone, counting a CASHED_OUT position whose
 * stake had already left the pool. `mkt_c97209dbe6e1fa584472` closed at +15 TZS.
 *
 * ⛔ THE FAILURE IS SILENT, WHICH IS THE WHOLE POINT. An oversized winner set makes
 * `allocated` overshoot, so `remainder = floor(netPool) - allocated` goes NEGATIVE and
 * `for (…; remainder > 0; …)` never runs — the top-up is skipped ENTIRELY, on the payouts
 * and on the fee alike. Nothing throws. The overall ledger still sums to zero, so
 * `test:trial-balance` and `test:money-invariants` stay green over it.
 *
 * ⭐ THE THIRD MUTATION IS THE ONE TO REMEMBER. The first two strand money in escrow
 * (players underpaid). `win-dropped-resume-breaks` fails the OTHER way: a resumed
 * settlement stops seeing rows it already paid, the remaining winners take a larger share,
 * and the pool goes NEGATIVE — money paid out that nobody staked. A guard that only caught
 * the first direction would certify a change that loses money.
 *
 * ⚠️ SINGLE-LINE ANCHORS, DELIBERATELY. This tree is CRLF and these declarations are LF, so
 * a multi-line anchor cannot match and the replace becomes a silent no-op — which reads as
 * "the guard failed to catch the defect" rather than "the harness never ran". The first run
 * of this harness hit exactly that and REFUSED. `payout.ts` carries a note keeping the
 * statement on one line.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string }} RedMutation */

const PAY = "src/lib/payout.ts";
const ANCHOR = `  return positions.filter((p) => p.side === outcome && ALLOCATABLE_WINNER_STATUSES.includes(p.status));`;

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "side-only-filter",
    why: "⭐ THE ACTUAL 2026-08-24 DEFECT: the winner set is chosen by side alone, so a CASHED_OUT row whose stake already left the pool is counted as a winner — 13 winners paid 185,498 instead of 185,505 and the pool closes at +15",
    file: PAY,
    suite: "payout-alloc",
    from: ANCHOR,
    to: `  return positions.filter((p) => p.side === outcome);`,
  },
  {
    name: "cashed-out-readmitted",
    why: "the allowlist is widened by exactly one status — the narrowest possible version of the same defect, and the one a careless 'a cash-out is still a position' edit would reintroduce",
    file: PAY,
    suite: "payout-alloc",
    from: ANCHOR,
    to: `  return positions.filter((p) => p.side === outcome && (ALLOCATABLE_WINNER_STATUSES.includes(p.status) || p.status === "CASHED_OUT"));`,
  },
  {
    name: "win-dropped-resume-breaks",
    why: "WIN is dropped, so a RESUMED settlement no longer sees rows it already paid — the remaining winners take a larger share and the pool goes NEGATIVE. The failure direction that actually loses money",
    file: PAY,
    suite: "payout-alloc",
    from: ANCHOR,
    to: `  return positions.filter((p) => p.side === outcome && p.status === "OPEN");`,
  },
];
