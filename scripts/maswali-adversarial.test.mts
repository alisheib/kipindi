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
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-adversarial",
  casesFile: "scripts/lib/maswali-adversarial-child.mts",
  minPass: { memory: 180, postgres: 188 },
  dbPrefix: "mlw_adv",
  timeoutMs: 45 * 60_000,
});
