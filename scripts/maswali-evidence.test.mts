/**
 * test:maswali-evidence — MASWALI-BUILD S6, ON BOTH STORES: the per-week evidence pack (MB-92) and the support desk's
 * per-ticket lookup (MB-64), driven through the product's own doors (`scripts/lib/maswali-evidence-child.mts`). The
 * Postgres half reads the ledger lines and the durable audit record the memory store does not keep.
 *
 *   npm run test:maswali-evidence     (boots the on-box Postgres through db-scratch; ⛔ no Postgres is a failure)
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-evidence",
  casesFile: "scripts/lib/maswali-evidence-child.mts",
  // Per store: the Postgres run asserts the ledger lines the memory store does not keep (§1.10, §2.4). 2026-10-18 · the
  // desk's lookup (§3, MB-64) adds eleven on each store: 21 → 32 and 23 → 34. Round 2 · §4's share notes (R2-1) add five
  // (32 → 37, 34 → 39), §5's lookup budget and record and the download's door (R2-4, R2-5) nine (37 → 46, 39 → 48),
  // and §1's tamper control and capture statement with §6's forfeit, pause and objection (R2-8a, R2-10, R2-11, R2-14a) six
  // (46 → 52, 48 → 54). Round 3 · the console's projection and the CSV beside it (4.6, 4.7) two (52 → 54, 54 → 56), and
  // the pause in force at the open, in the rule and through the pack's own read (6.3b, 6.5, 6.6) three (54 → 57, 56 → 59).
  // Round 4 · a crowded place's holders read whole into the pack (7.1, 7.2) two (57 → 59, 59 → 61). Round 5 · the door's
  // answers and the CSV on its own (5.10-5.12), the pack's bounded reads and its one order (7.3, 7.4) five (59 → 64, 61 → 66).
  // Round 6 · the statements counted (7.3b, one per store) and a failed read stated (7.5) two (64 → 66, 66 → 68).
  // Round 7 · a settled week's held share counted undecided until decided (6.1b) one (66 → 67, 68 → 69).
  // S6-DOCS 4 · the float check's unread finding in the pack (1.7b): 67 → 68, 69 → 70, the counts the run on a8b43c946
  // printed (run 39825278061).
  minPass: { memory: 68, postgres: 70 },
  dbPrefix: "mlw_evidence",
});
