/**
 * test:visual-pass-r8d-stores — R8-D (2026-10-10, the owner's ruling (4) completed), ON BOTH STORES: during a break no service
 * takes an offer to earn or recruit, the agent registration fee is refused BEFORE ANY MONEY MOVES, and nothing the services
 * send solicits. `docs/DESIGN_AUTHORITY.md` §C rule 8.
 *
 *   npm run test:visual-pass-r8d-stores     (boots the on-box Postgres through db-scratch — the integrator's lock turn)
 *
 * ⭐ ONE CASE LIST, TWO STORES. `scripts/lib/visual-pass-r8d-cases.mts` runs in two child processes through the runner the
 * two-store suites use: the memory store, then a fresh scratch database with every migration applied. A case that passes in
 * memory and fails on Postgres is a FAIL — the in-memory lock is one process's mutex, while on Postgres the fee runs under its
 * advisory lock and real transaction, and only there is a ledger group written (or not). ⛔ NO POSTGRES IS A FAILURE, NOT A
 * SKIP (exit 3, NOT MEASURED). The same cases run in memory inside `test:visual-pass-r8d`, which needs no cluster.
 *
 * ⛔ THE FLOOR IS PER STORE: 25 assertions on every store (M ×9, P ×6, L ×6, N ×3, and the child's store check). The first
 * printed run must equal it; if it does not, the floor is re-measured from that print, never guessed again.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:visual-pass-r8d-stores",
  casesFile: "scripts/lib/visual-pass-r8d-child.mts",
  minPass: { memory: 25, postgres: 25 },
  dbPrefix: "r8d_break",
});
