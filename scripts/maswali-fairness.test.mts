/**
 * test:maswali-fairness — MASWALI-BUILD S6 lane L, ON BOTH STORES: what /fairness publishes for Millionea (each public
 * week's commitments, by state) and one owner's inclusion proof (the leaf, the RFC 6962 path, the stamped root); and the
 * static half in the memory child — the help assistant's Millionea passage, the binding rules' version, text hash and
 * figures, the chooser, /help's block and the routes' gates (`docs/MASWALI-PLAN.md` §7b S6 items 1 and 10; MB-33, MB-69,
 * MB-70, MB-71).
 *
 *   npm run test:maswali-fairness     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/maswali-fairness-child.mts`). The Postgres half is what proves the proof is
 * rebuilt from the rows the close committed — and that a stored row which no longer matches the stamp is reported, on the
 * real table. ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * The floor is per store: §F, §P and §W run on both (31 each); the static half (§C, §L, §H — 43) runs in the memory
 * child only, so its floor is the sum. It only ever rises. ⚠️ W.1 is written to the merged tree: it needs S7's re-frozen
 * deadlines (`deadlinesUnderRules`, mln-s7-fix), which merge before this lane.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-fairness",
  casesFile: "scripts/lib/maswali-fairness-child.mts",
  minPass: { memory: 74, postgres: 31 },
  dbPrefix: "mlw_fairness",
});
