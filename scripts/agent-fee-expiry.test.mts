/**
 * test:agent-fee-expiry — K32 (2026-10-11, found by R8-D), ON BOTH STORES: an agent registration fee COLLECTED into an
 * application that then EXPIRES is owed back (REFUND_DUE, dated as a rejection dates it, on the officers' one refunds-owed
 * worklist) and paid only by the officer's `recordFeeRefund` — to the wallet for a wallet fee, recorded as wired back for an
 * EXTERNAL one — and the expiry decides inside the locks the fee's writers take, on the row read there.
 * `docs/AGENT-PROGRAMME.md` §4 ("On expiry") · `docs/MONEY-GATE-REMEDIATION.md` §8.1.
 *
 *   npm run test:agent-fee-expiry     (boots the on-box Postgres through db-scratch — run it alone, in a lock turn)
 *
 * ⭐ ONE CASE LIST, TWO STORES. `scripts/lib/agent-fee-expiry-cases.mts` runs in two child processes through the runner the
 * two-store suites use: the memory store, then a fresh scratch database with every migration applied. A case that passes in
 * memory and fails on Postgres is a FAIL — the in-memory lock is one process's mutex, while on Postgres the payment, the
 * officer and the expiry each hold an advisory lock in a real transaction, and only there is a ledger group written.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * ⛔ THE FLOOR IS PER STORE: the assertions the case list makes by construction — 34 on every store (0.store · S ×1 ·
 * E.1 ×9 · E.5 ×2 · E.6 ×2 · E.1b ×1 · E.2 ×3 · E.3 ×4 · E.4 ×11), two more on Postgres alone (the refund ledger groups,
 * E.1l and E.2l). The first printed run must equal it; if it does not, the floor is re-measured from that print, never
 * guessed again, and it only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:agent-fee-expiry",
  casesFile: "scripts/lib/agent-fee-expiry-cases.mts",
  minPass: { memory: 34, postgres: 36 },
  dbPrefix: "k32_fee_expiry",
});
