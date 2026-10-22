/**
 * test:maswali-integrity — MASWALI-BUILD S4 part 3, ON BOTH STORES: compliance's cluster report at close and its pick-shift
 * alerts (`scripts/lib/maswali-integrity-child.mts`). The Postgres half runs the report's real aggregates.
 *
 *   npm run test:maswali-integrity     (boots the on-box Postgres through db-scratch; ⛔ no Postgres is a failure)
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-integrity",
  casesFile: "scripts/lib/maswali-integrity-child.mts",
  // 10 → 17 (2026-10-18, MASWALI-BUILD S6, MB-35): §4, the cluster report's coverage, winners and every group.
  // 17 → 27 (2026-10-18, S6 review round 2): §4's window and winner-first cases (R2-2, R2-14), §5's window and signals (R2-3, R2-9).
  // 27 → 33 (2026-10-18, S6 review round 3): §5's both-sided window, stable ids and one line per set of holders (5.8-5.10);
  // §6's ring (6.1-6.3). 33 → 39 (round 4): §7's one order, the crowded line's row and its pages, and the read's form (7.0-7.5).
  // 39 → 44 (round 5): the crowded line's id as the suite computes it (7.6); §8's order, the lead's ruling (8.0-8.3).
  // 44 → 45 (round 6): §8's week inside the records window of the run's Monday, held to it by name (8.0a); 45 → 47:
  // the integrity page's order over two weeks, a week still to pay first (8.4, 8.5). 47 → 49 (round 7): a settled week
  // holding a share sorts with the pending weeks, and once every share is released it follows them (8.6, 8.7). 49 → 50
  // (round 8): three tiers — a held week leads a decided week's lines (8.6, rewritten), a pending ring leads both (8.6b).
  // 50 → 51 (2026-10-22, S6-INT): S5's case 1.6 joins the data lane's cases at the integration's merge — printed 51 on
  // memory and on Postgres (both green).
  minPass: 51,
  dbPrefix: "mlw_integrity",
});
