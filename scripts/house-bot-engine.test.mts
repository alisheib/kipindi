/**
 * HOUSE-BOT ENGINE — the engine's decisions, timing, outcome table and platform hooks, on a real Postgres AND on
 * the in-memory store (PLAN §12, 04 A7–A24, N1 §4, N2 §4).
 *
 *   npm run test:house-bot-engine
 *
 * ⛔ WHAT THIS GUARDS. The engine decides when a house stake is placed, on which side and how much, and what every
 * refusal does to the intent. A decision that reads a result check, a hook that joins a committed transaction or
 * a planner lease that is never written are all invisible to a green unit suite on one store; this suite runs one
 * case list on both.
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * ⛔ THE FLOOR IS PER STORE AND MEASURED (replan ruling 515, 2026-09-18). It was the scalar `90` while the run
 * prints memory 702 and Postgres 681 — it would not have noticed SIX HUNDRED cases vanishing in either child, which
 * is the widest gap of any house floor. Raised to the counts `npm run test:house-bot-engine` PRINTED at `d2f20795`,
 * never to an arithmetic guess, and a SCALAR becomes a PAIR because one number is bounded by the SMALLER child.
 * ⭐ RAISED AGAIN at C7 step 4b, with A24's poller-failure limb and X1's duty names in it — the ten cases behind
 * replan rulings 514 and 507, each seen RED on BOTH stores against the unfixed tree before the fix went in — to
 * what `npm run test:house-bot-engine` PRINTED on that run: **memory 715, Postgres 694**.
 * ⭐ RAISED AGAIN with §20, the one staleness predicate the console renders (rulings 352, 353, 354) — 353's own
 * four cases, the idle-engine false alarm PLAN.md:450's OR would have printed, A24's poller failure and X1's
 * key-scoped duty names — to what the run PRINTED: **memory 732, Postgres 711**. Seen RED first against the
 * absent predicate: 16 failed in each child.
 * ⭐ RAISED AGAIN with the C5 alerts build — the two SILENT STOPS (01 register:1210, :1218), whose bells were wired
 * one commit earlier and asserted in none: 11.15b–f drive a real boot through a real `deps.timeZone`, 16.515a–g a
 * real `pollerPass` over a real gate. **memory 744, Postgres 723** — what the run PRINTED, and exactly +12 in EACH
 * child, which is the twelve new labels reaching BOTH stores rather than only the memory one.
 * ⭐ RAISED AGAIN with §20's CLAIMS_BLOCKED cases (register:1218, 2026-09-21) — the verdict that used to answer
 * `null` while every stake was being refused, plus the two CONTROLS that make it mean something: 20.19 removes
 * the marker and demands `null` back, and 20.21 proves a real thrown claim message is not read as the marker.
 * **memory 756, Postgres 735** — what the run PRINTED, and exactly +5 in EACH child, which is the five new
 * labels reaching BOTH stores rather than only the memory one.
 * ⭐ RAISED AGAIN with §7b — the rule leaves no `test:` suite pinned (register B6, 2026-09-23). Until that block
 * existed the only instrument that moved most of the engine's 29 numeric leaves was `qa:house-bot-fleet`, a
 * whole-engine drive on a real database: a leaf could be dropped from `decide.ts` and every `test:` suite stayed
 * green. Twenty-four pure cases, each a PAIR (the value that refuses and the value one step away that allows) —
 * both no-react units, the pool band's two inclusive edges, closing-soon with its Up & Down control, the trigger
 * band's four edges, the delay and jitter DRAWS read off a recording RNG, FIXED and PCT amounts, the round-to
 * floor, min-time-to-cutoff, the schedule in EAT with a UTC discriminator, and the opener's two delay units and
 * its stake draw. **memory 780, Postgres 759** — what the run PRINTED, and exactly +24 in EACH child, which is
 * the twenty-four new labels reaching BOTH stores rather than only the memory one.
 * ⛔ A floor only ever rises, and only to a count a run printed.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

/* ⭐ RAISED 780 → 789 MEMORY / 759 → 768 POSTGRES, 2026-09-23 — nine cases, +9 in EACH child:
 * · §7c (4) · the OPENER's deadline arithmetic, its 10 s floor, the per-product stale window and the decision's
 *   field shape. These are register E's M9: the fleet's lane E asserted them END TO END and its own header
 *   admitted they had no discriminating mutation, and they could not get one there — `red:*` runs declared
 *   `suite:` values and there is no fleet suite. `planOpener` is pure, so the claims moved to where they bite.
 * · 11.16a–e (5) · C8 minor M4: a `DB_TIMEZONE` boot refusal now records its CAUSE on the instance's own row,
 *   the beats carry it, the verdict names it ABOVE `STALE`, an ENV_DISABLED refusal records nothing (the
 *   CONTROL), and a boot that lands clears it.
 * What a run PRINTED: `0.mem · exit 0 · 789 passed` and `0.pg · exit 0 · 768 passed`, ALL PASS on both stores. */
await runTwoStores({ suite: "test:house-bot-engine", casesFile: "scripts/lib/house-bot-engine-cases.mts", minPass: { memory: 789, postgres: 768 }, dbPrefix: "hb_engine" });
