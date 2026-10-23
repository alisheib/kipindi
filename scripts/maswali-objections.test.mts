/**
 * test:maswali-objections — THE MILLIONEA OBJECTION DOOR, ON BOTH STORES (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16,
 * MB-23, OD-05; FAILURE-INVENTORY §9 OB.0).
 *
 *   npm run test:maswali-objections     (boots the on-box Postgres through db-scratch)
 *   npm run red:maswali-objections      (plants the door's defects into the real source, memory child; commit first)
 *
 * ⭐ ONE CASE FILE, TWO STORES (`scripts/lib/maswali-objections-child.mts`, each store in its own child): the filing, the
 * ruling and its re-grade and window restart, the week void, the races in one process, the Yes/No doors' fences, and the
 * store's own one-per-key and rule-while-OPEN — every one on memory AND on a fresh PostgreSQL, because the memory twin
 * proving a rule the database breaks is the failure this repository has paid for.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 * The floor is per store, measured from the first printed run (48 on memory, 48 on PostgreSQL); it only ever rises.
 * ⭐ S7-MERGE 3 (2026-10-22, the lead's P6 ruling): 9.1, the window's one name ("objection window") — 49 on each, what the
 * merged tree printed. ⭐ S6-NOTICES 14 (2026-10-23, the lead's ruling): §2c, who corrects a ruled result (2.18–2.22) — 54
 * on each, what b26c620a5 printed.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-objections",
  casesFile: "scripts/lib/maswali-objections-child.mts",
  minPass: { memory: 54, postgres: 54 },
  dbPrefix: "mlw_objections",
});
