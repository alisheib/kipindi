/**
 * test:maswali-objections — THE MILLIONEA OBJECTION DOOR, ON BOTH STORES (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16,
 * MB-23, OD-05; FAILURE-INVENTORY §9 OB.0).
 *
 *   npm run test:maswali-objections     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ ONE CASE FILE, TWO STORES (`scripts/lib/maswali-objections-child.mts`, each store in its own child): the filing, the
 * ruling and its re-grade and window restart, the week void, the races in one process, the Yes/No doors' fences, and the
 * store's own one-per-key and rule-while-OPEN — every one on memory AND on a fresh PostgreSQL, because the memory twin
 * proving a rule the database breaks is the failure this repository has paid for.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 * The floor is per store, measured from the first printed run; it only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-objections",
  casesFile: "scripts/lib/maswali-objections-child.mts",
  minPass: { memory: 1, postgres: 1 },
  dbPrefix: "mlw_objections",
});
