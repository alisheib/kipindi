/**
 * test:maswali-notify — A WEEK'S NOTICES, ON BOTH STORES (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 2, MB-68, MB-11,
 * MB-44, MB-93, OD-25).
 *
 *   npm run test:maswali-notify     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/maswali-notify-child.mts`): every registered notice sent exactly once — each
 * second run made outside notify()'s 90-second duplicate window — in three languages, to holders only, after the money
 * commits and never launched inside a lock (the witness is read at launch); winners first, the SMS on its own key, the
 * reconcile finishing what a stopped run left; corrections, a moved close and the muted-void catch-up; the poll's notices
 * never reach a ticket, and a poll bet's own notice is unchanged (the control); the credit hold; the float before the
 * result; the desk list, its alert and the desk's recorded call; each owed void refund on the integrity view until it
 * lands; accounts that cannot sign in; the final sunset week.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * The floor is per store and only ever rises. Every case runs on both stores but 9.0a, 9.0a2, 9.0b, 9.0c, 9.0d and 11d.6
 * (another process's lease, and a lease read that fails, which only Postgres has). ⭐ Round 17 · pinned to the suite's FIRST
 * GREEN RUN's printed counts — memory 129, Postgres 134 (2026-10-19, round 17's first two commits). Until round 17
 * the child never compiled after round 7 (two names reused in §8), so every floor before it was a count read from the
 * source. ⭐ Round 17 (M5, L1) · re-pinned to the printed counts of the run with 8.11g2, §11d, 13.8 and 13.9 — memory 138,
 * Postgres 144 (2026-10-21). ⭐ S6-INT 20 · re-pinned to the printed counts with M-1's 6.11d and S16's 5.5b (S6-INT 17) —
 * memory 140, Postgres 146 (2026-10-22). ⭐ S6-NOTICES 7 · re-pinned to the printed counts with §10b (an objection's two
 * notices, the receipt's title) — memory 151, Postgres 157 (2026-10-23). ⭐ S6-NOTICES 11 · re-pinned to the printed counts
 * with the lead's two (10b.8b–8h, an upheld change told to every holder; 10b.10b, the free cancel names EAT) — memory 159,
 * Postgres 165 (2026-10-23, 73ccf59eb).
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-notify",
  casesFile: "scripts/lib/maswali-notify-child.mts",
  minPass: { memory: 159, postgres: 165 },
  dbPrefix: "mlw_notify",
  timeoutMs: 30 * 60_000,
});
