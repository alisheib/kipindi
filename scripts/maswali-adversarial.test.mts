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
 * The floor is per store (the commission account, the trial balance and the ledger groups' sums are read on Postgres
 * alone, and the raw reclassification is a KNOWN-RED there): 109 on memory, 112 on Postgres, with 7 and 8 KNOWN-RED
 * booked beside them (2026-10-18). It only ever rises — a KNOWN-RED struck becomes one more.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-adversarial",
  casesFile: "scripts/lib/maswali-adversarial-child.mts",
  minPass: { memory: 109, postgres: 112 },
  dbPrefix: "mlw_adv",
  timeoutMs: 45 * 60_000,
});
