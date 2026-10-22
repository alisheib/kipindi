/**
 * test:maswali-adversarial — MASWALI-BUILD S7, ON BOTH STORES: the adversarial suite of the week's engine, its money and its
 * clock (`docs/MASWALI-PLAN.md` §7b S7; the cases are `scripts/lib/maswali-adversarial-child.mts`).
 *
 *   npm run test:maswali-adversarial     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ Every case asserts what the plan's rules require, never what the code happens to do. A rule the code still breaks,
 *    whose fix is not this suite's lane to make, stays in as a case labelled `KNOWN-RED <id>` and is booked apart: it prints
 *    KNOWN-RED and never counts as a pass or a failure — until it PASSES, which fails the suite, so the mark is struck and
 *    the case counted the day its defect is fixed (a strict expected failure).
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED): the clock skew, the rollbacks and the database's own
 *    refusals are Postgres's, so the second run is the one that measures them.
 *
 * The floor is per store (the commission account, the trial balance, the ledger groups' sums and the database's own
 * product-line fence are read on Postgres alone): 109 on memory, 112 on Postgres, with 7 and 8 KNOWN-RED booked beside
 * them (2026-10-18). It only ever rises — a KNOWN-RED struck becomes one more.
 * ⭐ S7-F (2026-10-18): CS.4, FL.4, IN.9 and HF.2 struck on both stores and PL.3 on Postgres (each fixed, each with a red
 * plant), their controls beside them, and §14 DL and §15 SU added: 134 on memory, 140 on Postgres, with 3 KNOWN-RED on
 * each (OB.0, RD.5, TK.2 — the objection door, the wallet lane and MB-35's alerting).
 * ⭐ S7-F2 (2026-10-18): §8b FR — a purchase whose week or market read fails is refused as busy, never thrown — §14b SN —
 * every refused stop names the Owner's next act — CS.7–CS.9 — a close the database's clock refused wakes the scheduler the
 * moment that clock arrives (L1) — HF.2e–HF.2f — the holiday review stays while an open week's close can move — and
 * FL.0b, FL.4b, FL.4d–FL.4f — the float alert judged on the float as it stands, an unreadable float its own alert — and
 * IN.1c, the control of IN.1b (now the Owner's staff role change, driven), on Postgres PL.3d and PL.5a, the re-line
 * fixture's own lines (a failed step named, never a crash; PL.4 now requires the re-line to have landed), and §14a GR —
 * an unreadable week's frozen rules leave OD-02's requirement unknown, and every reader fails closed — nine on each
 * store — §14c RF, the console's rules form and holiday list, eleven on each — and §9b TO, a seal that cannot read the
 * two-officer setting refuses, five on each: 180 on memory, 188 on Postgres.
 * ⭐ S7-F3 (2026-10-18): FL.4g — a covered float finding stays ended once the winners withdraw — and its control FL.4h,
 * on each store — and CS.10, a refused close's retry still wakes the timer once the rest of the tick ran past it — and
 * GR.1b with its control GR.6b, an unreadable week's sales and worst top-up null on /pools: 185 on memory, 193 on Postgres.
 * Merged into mln-sf (2026-10-18), where S7-F2's first green run had printed 184 and 192: the floor is S7-F3's, the
 * higher, until the merged tree's first green run prints its own counts — then it rises to them.
 * ⭐ S7-F4 (2026-10-18): SC.1 — with no week to offer, the stop control names the Owner's next act — and its control
 * SC.2, on each store: 187 on memory, 195 on Postgres. And FL.4i — the float finding judged against the week's shares
 * not yet withdrawn returns once other withdrawals drain the shared float — on each: 188 on memory, 196 on Postgres.
 * ⭐ S7-F5: SC runs before SU (§14d), and SU.7/SU.7b — the stop passes on in the console's words and the stop's — on each:
 * 190 on memory, 198 on Postgres.
 * ⭐ Rounds 4–6 merged into mln-sf (2026-10-19): the merged tree's green runs printed 194 on memory and 202 on Postgres
 * (at 3f6af84e1, and again at 76a8d4780 after S7-F7 2 made PL.4 record a throw as its own failure) — raised to them.
 * ⭐ S7-F8 9 (2026-10-21, S5-FIX-SRV's finding 2 in the re-freeze and the stop): DL.7, SU.5a and SU.6a on each store and
 * DL.6 on Postgres: 197 on memory, 206 on Postgres, what this commit's tree printed.
 * ⭐ S7-F9 (2026-10-22, MB-96): TK.2 struck on both stores — the winner-takeover watch raises its alert — with TK.3,
 * TK.3a–TK.3c, TK.4, TK.5 and TK.6 beside it on each: 205 on memory, 214 on Postgres, with 2 KNOWN-RED on each (OB.0, RD.5).
 * ⭐ S7-F9 9 (2026-10-22, MB-74): RD.5 struck on both stores — a deposit contradicted after its winner was paid holds the
 * share at once — with RD.5b, RD.5c, RD.5d, RD.6–RD.9 and RD.10 (a release in flight) beside it on each: 214 on memory,
 * 223 on Postgres, with 1 KNOWN-RED on each (OB.0).
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-adversarial",
  casesFile: "scripts/lib/maswali-adversarial-child.mts",
  minPass: { memory: 214, postgres: 223 },
  dbPrefix: "mlw_adv",
  timeoutMs: 45 * 60_000,
});
