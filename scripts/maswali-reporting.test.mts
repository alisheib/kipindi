/**
 * test:maswali-reporting — MASWALI-BUILD S6's ACCEPTANCE, ON BOTH STORES: a simulated month holding the §5 six-week
 * trajectory files with Report 1 balanced by its reconciling lines, Report 2 the booked fee, and the monthly pack equal to
 * the jackpot and guarantee accounts to the shilling; the per-game split, the finance window, the house book and the
 * S16 measures read the same weeks (`docs/MASWALI-PLAN.md` §7b S6 items 4–6, "Acceptance"; MB-04, MB-46, MB-65, MB-66).
 *
 *   npm run test:maswali-reporting     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/maswali-reporting-child.mts`). The Postgres half adds what only a ledger can
 * answer: each week's booked fee against its own settlement group (R3) and the house book's readers (R6).
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 * The floor is per store: 28 on memory, 33 on Postgres (2026-10-18). It only ever rises.
 * ⭐ RAISED 2026-10-18 (round 2): R4.8 and R5.7–R5.10 add six lines on each store — 34 on memory, 39 on Postgres.
 * ⭐ RAISED 2026-10-18 (round 3): R5.11–R5.13b and R7.2b add eight — 42 on memory, 47 on Postgres.
 * ⭐ RAISED 2026-10-18 (round 5): R5.14, R5.14b, R5.15, R5.15b and R5.16 add five — 47 on memory, 52 on Postgres.
 * ⭐ RAISED 2026-10-18 (round 6): R5.17, R5.17b, R5.18, R5.19, R5.20 and R5.20b add six — 53 on memory, 58 on Postgres.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-reporting",
  casesFile: "scripts/lib/maswali-reporting-child.mts",
  minPass: { memory: 53, postgres: 58 },
  dbPrefix: "mlw_report",
  timeoutMs: 30 * 60_000,
});
