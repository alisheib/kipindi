/**
 * Mutation anchors for `red:refused-funds-race` — the three money defects in S1's first draft
 * (2026-09-13). A SIDECAR so `test:red-anchors` §3 re-resolves every anchor on every run without
 * executing the harness.
 *
 * Each mutation restores ONE defect exactly as it was drafted, and must be caught on its OWN assertion
 * in `scripts/refused-funds-race.test.mts`.
 */
const WALLET = "src/lib/server/wallet-service.ts";
const FUNDS = "src/lib/server/refused-funds.ts";

export const MUTATIONS = [
  {
    name: "forfeit-cas-removed",
    why: "The first draft's guard: a forfeit only asked `balance ≥ amount`, so two officers deciding one case "
       + "at once could both forfeit it and the player lost money owed back.",
    file: WALLET,
    from: "    if (wallet.balance !== opts.expectBalanceTzs) {",
    to: "    if (false) {",
    check: "1a a forfeit computed on a stale balance is refused",
  },
  {
    name: "payout-throw-escapes",
    why: "A throw from `withdraw()` after the forfeit committed escaped before the decision's audit row — "
       + "money forfeited with no record in the report.",
    file: FUNDS,
    from: "      } catch (err) {\n        payoutError = ",
    to: "      } catch (err) {\n        throw err;\n        payoutError = ",
    check: "2b a payout that throws still writes the decision row",
  },
  {
    name: "outer-lock-restored",
    why: "The first draft wrapped the decision in `withLock`, which joins nested locks onto one transaction "
       + "held open across the gateway call. Postgres-only, so the suite holds it by source.",
    file: FUNDS,
    from: 'import { randomId } from "./crypto";',
    to: 'import { randomId } from "./crypto";\nimport { withLock } from "./locks";\nvoid withLock;',
    check: "3b refused-funds.ts imports no lock",
  },
];
