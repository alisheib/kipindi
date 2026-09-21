/**
 * HOUSE-BOT OPS — the suite for Commit 7's four ops scripts, Commit 8's preflight, seed and drive,
 * and the DAL members they need.
 *
 *   npm run test:house-bot-ops
 *
 * ⛔ THE SUITE LANDS BEFORE THE SCRIPTS. Its §0 marker gate is armed while the correct answer is still
 * "exactly ONE file outside `src/` carries a `houseBotId` UPDATE, and it is a control that rolls back",
 * so the scripts that follow land INTO a gate rather than under one written to fit them. The four
 * scripts this lane owes — the direct-pg OFF (A9), the status reader and its drift legs (S3), the
 * NULL-filling remark (S3) and the sunset (F2) — are scheduled in PROGRESS.md and appear in C7-SPEC
 * zero times, which is how a builder closes Commit 7 without them while nothing turns red.
 *
 * ⛔ OWNER RULING D19 OUTRANKS EVERYTHING HERE, and D20 with it: an ops script prints to a TERMINAL and
 * may name the feature there; nothing it writes into a shared artefact may, and house bots are ordinary
 * players in every report.
 *
 * ⛔ THE MASTER SWITCH IS THE OWNER'S ALONE. No ops script may turn house bets ON. One may turn them
 * OFF — refusing to stop is never the safe default. `ops.pop.3` is that law made mechanical.
 *
 * Both children run the same case list: the memory store, then a fresh scratch Postgres database. No
 * Postgres is a FAILURE (exit 3, NOT MEASURED), never a skip. §0's source pins run in the memory child
 * only — a source file reads the same on both stores — which is why the floor is a PAIR and not a
 * number: a section that stops running fails the floor even while every case that ran passed.
 *
 * ⭐ THE FLOORS ARE MEASURED BY RUNNING IT, NEVER BY ARITHMETIC, and they may only rise.
 *   · memory 16, postgres 1 — step 1: §0's marker gate and master-switch law, plus the store case.
 *   · memory 28, postgres 13 — step 2: §1's two DAL members, markSunset and openExposureByMarket, on
 *     BOTH twins. The gap between the two floors is §0 exactly: 15 source pins that run in the memory
 *     child only, which is why this floor is a PAIR — a section that stops running fails the floor even
 *     while every case that ran passed.
 *   · memory 35, postgres 26 — step 3: §2, `ops:house-bots-off` (A9). Seven SOURCE pins in the memory
 *     child (the owner's law, the imported copy, the by-host connection, the absent advisory lock, the
 *     absent audit write, and the positive control that the file really is INSIDE the derived ops
 *     population); thirteen in the Postgres child, which RUNS the script five times — dry, applied,
 *     applied again, with no DATABASE_URL, and against a closed port.
 *   · memory 41, postgres 40 — step 4: §3, `ops:house-bots-status` and its three drift legs. Six more
 *     in the memory child (four SOURCE pins, plus the file RUN with no database at all and its --drift
 *     REFUSED there rather than reported clean); fourteen more in the Postgres child, where the five
 *     release figures are compared against numbers the suite measured itself on a populated database —
 *     a reader printing 0 everywhere would satisfy a "clean world" assertion while counting nothing.
 *   · memory 48, postgres 52 — step 5: §4, `ops:house-bots-remark`, the ONLY ops script that writes to
 *     a money table. Seven more in the memory child (the ONE statement pinned byte-for-byte and the
 *     five shapes it must refuse, plus the gate now admitting exactly two files and naming both);
 *     twelve more in the Postgres child, which DRIVES it: dry, refused while the switch is ON, refused
 *     over its ceiling, applied, applied again, and then drift leg (a) re-read — with two marked
 *     positions held by DIFFERENT bots, so "it wrote a bot id" cannot pass for "it wrote the RIGHT one".
 *   · memory 58, postgres 69 — steps 6 and 7: §5, the SUNSET. ⭐ THE TWO CHILDREN SPLIT THE TWO AUDIT
 *     OUTCOMES and each says which half it measured: the memory child FORCES the compliance row to fail
 *     (production without a distinct AUDIT_CHAIN_SECRET — the only way `audit()` can reject, since with a
 *     database it fails OPEN) and proves the desk still moved with `recorded: false`; the Postgres child
 *     runs the real script and counts ONE global event, ONE compliance row and ONE alert, with controls
 *     for an account already REMOVED, a target already ENDED, and a QUEUED press that the sunset must not
 *     touch and the planner's own sweep then moves — so "untouched" is a measured difference.
 *     ⛔ §5 RUNS LAST AND NOTHING MAY FOLLOW IT: it empties the roster and walks the control row to a
 *     state nothing can undo.
 *   · memory 66, postgres 80 — step 8 (COMMIT 8's first): §6, `ops:preflight-house-bot-migrations` (A23).
 *     Eight more in the memory child (six SOURCE pins — nothing typed that can be derived, the timezone
 *     list imported from the module that ENFORCES it, the connection rehearsable, the file read-only —
 *     plus two POSITIVE controls: it is inside the derived ops population, and it really does read);
 *     eleven more in the Postgres child, which gives §6 A DATABASE OF ITS OWN — the only way to measure
 *     a preflight BEFORE `migrate deploy` — and then breaks that database one fault at a time: GO first
 *     so every NO-GO is a measured difference, an INVALID index made valid again so its NO-GO is
 *     attributable, the zone walked to Africa/Dar_es_Salaam and back, and the row counts checked against
 *     a count the suite took itself on a database that has been staked in.
 *     ⛔ §6 IS PHYSICALLY BEFORE §5 THOUGH NUMBERED AFTER IT — nothing may follow the sunset.
 *   · memory 71, postgres 93 — step 9: §7, `ops:house-bots-status`'s COMMIT-8 duties — the four figures
 *     beyond R5's five (open house positions, live intents, exposure PER MARKET, the settlement-blocked
 *     condition) and the +10 minute recheck. Three more in the memory child (the live-intent statuses
 *     IMPORTED, the DAL's own LIVE_SQL asserted to name exactly those two, the leg proved to be a READ,
 *     plus the false positive that detector really produced); thirteen more in the Postgres child, which
 *     DELETES a holder wallet and PUTS IT BACK — the condition reported and then CLEARED on the same
 *     account — and proves the recheck's delta detector by placing a stake BETWEEN its two reads.
 *   · memory 76, postgres 104 — step 10: §8, `db:seed-house-bots-local`, the world a human opens.
 *     Five more in the memory child (the loopback refusal read as a TRIPLE — host, production AND an
 *     exit, because a test that warns and carries on reads in a diff exactly like one that refuses; the
 *     admin credential proved to be DERIVED from the seed that owns it rather than re-typed; the switch
 *     law; the positive control that it really does reach the three services; and the refusal DRIVEN
 *     with a non-loopback URL). Eleven more in the Postgres child, which gives the seed A DATABASE OF
 *     ITS OWN, runs it BEFORE `migrate deploy` (it must refuse, not half-write a world), then runs it,
 *     then READS THE FOUR ACCOUNTS BACK out of the database — never from what the seed believed it
 *     wrote — proves the AUTO_PAUSED one got there through a real password change (its consent
 *     fingerprint no longer matches its holder's), tries the printed admin credential against the
 *     stored hash with a one-character control beside it, and runs the seed a SECOND time to prove it
 *     refuses rather than quietly seeding a second roster.
 *   · memory 89, postgres 104 — step 12's gate: §9, `ops:release-migration-parity`, the rewrite of the
 *     release condition that went obsolete without ever going red. Thirteen more in the memory child
 *     and none in the Postgres one — it is pure git. ⭐ THE MUTATIONS ARE REAL GIT TREES: each case
 *     builds a synthetic commit with `commit-tree` over a TEMPORARY index, so the working tree, the
 *     real index and every other lane's files are untouched, and what lands on disk is a few loose
 *     objects nothing references. It drives the gate against a ref with one edited byte (CONTENT), the
 *     same bytes in CRLF (diagnosed as LINE ENDINGS ONLY — a stopper with a different fix), a ref that
 *     does NOT carry the house DDL (the condition's ORIGINAL reading, still biting), a ref carrying a
 *     migration this tree lacks (BEHIND), a ref differing OUTSIDE `prisma/migrations` (still GO — the
 *     gate is scoped to what decides whether the container boots), and an unresolvable ref (exit 3 NOT
 *     MEASURED, never GO). ⛔ The cases never name `origin/main`: this suite is discovered by
 *     `test:all`, and a remote-tracking ref is a property of the machine, not of the tree.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-ops", casesFile: "scripts/lib/house-bot-ops-cases.mts", minPass: { memory: 89, postgres: 104 }, dbPrefix: "hb_ops" });
