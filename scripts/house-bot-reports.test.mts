/**
 * HOUSE-BOT REPORTS — Commit 5's suite: reporting, data rights, resolver exposure and the staff edge (C5-SPEC §4.1).
 *
 *   npm run test:house-bot-reports
 *
 * ⛔ OWNER RULING D19 OUTRANKS EVERYTHING HERE. What this suite proves about reports and data rights is proven for the
 * people allowed to read them (the owner's admin console, the regulator's private paper), and ABSENT for everyone else:
 * a player, the holder of a house bot included, is never told and never shipped anything about house bots.
 *
 * Static source pins (§0) run in the memory child; every behavioural section runs on BOTH stores. No Postgres is a
 * failure (exit 3, NOT MEASURED), never a skip (C5-SPEC ruling 176). The sections land with the build steps that make
 * them true: §0 opens in step 1–2 (rulings 169, 170, 172, 175), with §3's officer own-export case and §11's /api/health
 * slice (170, 171) on both stores; §1–§2 opened in step 3 (rulings 177–183), written red before the readers existed
 * (memory 58 passed · 40 failed, Postgres 14 passed · 44 failed), then made green by the readers.
 *
 * minPass is per store and MEASURED, and may only rise — with ONE exception, taken by owner ruling D20 (2026-09-17) and
 * its replan's ruling 265: checkpoint C5-5b un-built the reports, readers, R9 payloads, R2 display, KYC line and staff-edge
 * artefacts this suite proved, so its floors FELL to what the un-built suite actually passes. They were measured by RUNNING
 * it, never by arithmetic (ruling 275): **memory 77, Postgres 8** at C5-5b's build, and **memory 85, Postgres 16** once its
 * fixer restored §4's behavioural cases for the gate D20 keeps (both counts measured by running the suite).
 *
 * What the floors counted before, for the record: step 3 memory 141 / Postgres 81, its verification 152 / 92; step 4
 * 213 / 143, its review fixes 226 / 148; step 5 258 / 160, its renders 263 / 160, ruling 259's gate 273 / 164, ruling 260's
 * audit gate 280 / 168 and its review 283 / 170. C5-5b removed, by name: §1 (rulings 177–182, the readers and the book),
 * §2 (ruling 183, the fee withheld and its ledger cross-check), §1.177 (every other new store member, 185's window and the
 * platform members of 210, 224 and 233), §3's R9 cases (rulings 187–190), §4's void-notice and KYC cases (rulings 195, 197),
 * §4.S5's R2 parts and surfaces (rulings 192–194, 196, and 259's DISPLAY cases 4.259.1 and 4.259.4), and the §0 pins of
 * rulings 179, 180, 183, 186 (1)(3)(4), 191's R9 population, 192, 194, 197 and 259's display wiring.
 *
 * ⭐ CHECKPOINT C5-6 (R8, C5-SPEC rulings 214–216) RAISED THEM AGAIN, to counts MEASURED by running the
 * suite on both stores: **memory 110, Postgres 31**. What it added: §0's ruling-215 source pins (the report
 * population reads no audit ring, with the whole-word control that `getAuditPageDurable` is not a hit; and
 * `RG_AUDIT_ACTIONS` is exactly the `rg.*` actions written under `src/`, in BOTH directions, with the
 * ternary, read-only-comparison and freeze-`ref` controls), §0's ruling-214 pin that all four maker-checker
 * actions read their pack only through `readPackForTransition` and before any append, and §8 — the pack
 * read surviving sixty newer packs' rows, a truncated history refusing every transition with NOTHING
 * written, the RG copy, and on Postgres the RING EMPTIED IN PLACE with the ring reader as the live
 * discriminator. Its finish added the failed-read half the swap itself created (the card catches its
 * own read and renders the platform read-failed state; a transition that cannot read at all REFUSES),
 * and the floors rose again to the measured **memory 113, Postgres 33**.
 *
 * ⭐ RAISED AGAIN 2026-09-20 by C5-7's REVIEW FIX PASS, to what the suite PRINTED on both stores after it:
 * **memory 200, Postgres 61** — measured by running it, never by arithmetic. What the review added: §11.247's
 * serialiser (three readers answer with a `Map`, which `JSON.stringify` renders as `{}`, so the checkpoint's own
 * declared mutation `247-seeds-raw` could not redden 11.247.2 — proved by applying it), the planner lease and its
 * positive control on the unfiltered `leadershipSnapshot()`, the per-type bus breakdown with the resolve that makes
 * the fourth type real, the target/press/label needles, the two raw-reader controls and the `/markets/[id]`
 * whole-row-prop pin; 0.232's extracted bypass scan with controls for `.createMany(`/`.upsert(` and all three raw-SQL
 * spellings, the anchors cross-check `0.232.2b`, the `positionId` create-only pin `0.232.4` and the `scripts/`
 * population `0.232.5`; 0.L52's key-argument sweep `0.L52.3b` and the authority-doc pin `0.L52.4`; 0.235's
 * aliased-import caller control; the ruling-250 REL-0 coverage roll-call `0.250`; and §11b's `0.354a`, the one
 * BEHAVIOURAL case of the set — the engine card's audience failing closed on the viewer lookup, on both stores.
 *
 * ⭐ RAISED 2026-09-18 (replan ruling 515), to what `npm run test:house-bot-reports` PRINTED at `d2f20795`:
 * **memory 117, Postgres 33**, and RAISED AGAIN to **memory 118** the same day when ruling 518 added `0.505.c2` — the count that run printed, not an arithmetic guess. Postgres is unchanged because both cases added since — ruling 512's 0.512 export
 * completeness check with its control, and ruling 505's 0.505 roll-call population check with its control — are §0
 * source pins and run in the MEMORY child only, which is exactly why this floor is a pair and not a number.
 *
 * ⛔ WHAT C5-5b REMOVED AND ITS FIXER PUT BACK: §4's BEHAVIOURAL cases for the gate D20 KEEPS (the replan's §2 row for
 * rulings 259–260). They went out with the display section that held them, leaving `houseConsoleAudience` and
 * `houseAuditForConsole` — the only thing standing between a signed-in player and every house audit row a console page
 * renders — with no case anywhere that could fail. §4 is restored, on both stores, as 4.259.2, 4.259.3 and 4.260.1–4.260.6.
 *
 * What STAYS, and is the whole suite now: §0's rulings 169, 170, 172 and 175 pins; rulings 191 and 270's I10 pins (no
 * decision control, refusal branch or page condition reads a house read or a requester) with every planted control; ruling
 * 187's list as the UN-BUILD's own guard (no audit payload carries a house stake); ruling 198's player-surface pins; ruling
 * 260's SOURCE pins 0.260.1 and its controls; §4's behavioural cases for the audience and the audit gate on both stores;
 * §3's officer own-export case and §11's `/api/health` slice on both stores; and the store case.
 * (Ruling 186 (2)'s status-tone pin is NOT here — it is `test:house-bot-designation` 4.2b/4.2c.)
 * A section that stops running fails the floor even while every case that ran passed.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-reports", casesFile: "scripts/lib/house-bot-reports-cases.mts", minPass: { memory: 248, postgres: 80 }, dbPrefix: "hb_reports" });
// ⭐ **MEASURED ON THE FULLY INTEGRATED TREE: 247/80 → 248 memory / 80 postgres, RAISED TO WHAT THE RUN PRINTED
// AND TO NOTHING ELSE** (OMEGA-COMPILE01, 2026-09-21, after all five branches were merged into `ops-lane`).
// `npm run test:house-bot-reports` printed ALL PASS with `0.pg · exit 0 · 80 passed (at least 80) · 0 failed`, and
// the memory child run directly — `DATABASE_URL="" USE_PRISMA_DAL=false HB_MONEY_STORE=memory npx tsx
// scripts/lib/house-bot-reports-cases.mts` — printed `@@SUMMARY {"pass":248,"fail":0,"store":"memory"}`.
// ⛔ 247 + 1 = 248 is the SAME number the forbidden arithmetic would have produced, and that is a coincidence of
// this merge, NOT the authority for it. The run decided it; the sum is noted only so the next session does not
// mistake the agreement for a licence to compute the next floor.
// ⚠️ POSTGRES DID NOT MOVE, AND THAT IS A MEASUREMENT: the trunk's one new case (`0.198.3b`) is a §0 SOURCE pin
// and §0 runs in the memory child only — the fourth consecutive merge for which that is the reason.
// ⛔ MERGED A FOURTH TIME 2026-09-21 (ops ← house-bots, the INTEGRATION merge on OMEGA-COMPILE01), and it is
// the same collision this header already describes, a fourth time. This lane stood at a MEASURED 247/80; the
// trunk raised its own base to 219/64 for `0.198.3b`. Neither pair describes the merged file: 247 predates the
// trunk's `0.198.3b`, and 219 predates the alerts cases, row 77's, and the 260 repair.
// ⛔ THE DELTAS WERE NOT ADDED. The merge carried the HIGHER of both on BOTH stores (247/80, so neither lane's
// guard is weakened) and the pair above is then whatever `npm run test:house-bot-reports` PRINTED on the merged
// tree — never 247 + 1. If the line above still reads 247/80 with no printed-run sentence after this one, the
// measurement did not happen and the floor is an understatement, not a lie.
// ⭐ THE TWO LANES FOUND THE SAME ROOT DEFECT INDEPENDENTLY, which is why both records below are kept: the
// trunk's `0.198.3b` note (`house[ -]?stakes?` is blind to an underscore, so `HOUSE_STAKE_ONLY` walked through a
// guard whose population already held that file) and the alerts lane's DEFERRED-TESTS row 79 (the bounded id
// families open with a word boundary, and `_` is a word character, so `pos_house_...` never matches) are the SAME
// class of blindness in two different families. Neither lane knew of the other.
// ⭐ 245 → 247 ON MEMORY, 2026-09-21 (ops lane, closing the merge's own defect), IN THE SAME COMMIT AS THE TWO
// ASSERTIONS THAT RAISED IT: `0.260.2` and `0.260.c4` hold the two audit exports that actually read `db.auditLog`
// — `readUnverifiableBaseline` and `censusUnverifiable` — to the claim their new NON-READER classification makes.
// ⛔ THE NUMBER IS WHAT A RUN PRINTED, NOT 245 + 2. The memory child was run directly
// (`DATABASE_URL="" USE_PRISMA_DAL=false HB_MONEY_STORE=memory npx tsx scripts/lib/house-bot-reports-cases.mts`)
// and printed `@@SUMMARY {"pass":247,"fail":0,"store":"memory"}`; the full `npm run test:house-bot-reports` then
// printed the same 247 through `0.mem`. That the arithmetic agrees is a coincidence of this change and not the
// authority for it — this file has recorded twice before that a computed floor is a guess with a witness.
// ⚠️ POSTGRES IS UNCHANGED AT 80, AND THAT IS A MEASUREMENT TOO: both new cases are §0 SOURCE pins and §0 runs in
// the memory child only, so nudging the Postgres half "to be safe" would have been an arithmetic guess on the
// half nothing was added to. ⛔ Never lowered.
// ⛔ MERGED A THIRD TIME 2026-09-21 (ops ← house-bots `fd2b6ed5`, the release-verdict merge), and the
// collision is the same one twice over: lane 1 raised its own base 217 → 218 for `0.175` (its new
// `test:house-bot-surfaces` joined `VOCABULARY_CONSUMERS`), while this lane's merged tree already stood at
// a MEASURED 244/80. Neither pair describes the merged file: 244 predates lane 1's extra `0.175` case and
// 218 predates the alerts cases and row 77's.
// ⛔ THE DELTAS WERE NOT ADDED. The merge carried the HIGHER of both on BOTH stores (244/80, so neither
// lane's guard is weakened), and the number above is then whatever `npm run test:house-bot-reports`
// PRINTED on the merged tree — never 244 + 1. If the line above still reads 244/80 with no printed-run
// sentence after this one, the measurement did not happen and the floor is an understatement, not a lie.
// ⭐ **MEASURED ON THE MERGED TREE: 244/80 → 245 memory / 80 postgres, RAISED TO WHAT THE RUN PRINTED AND TO
// NOTHING ELSE** (ops lane, 2026-09-21, the final merge). `npm run test:house-bot-reports` printed
// `0.mem · exit 0 · 245 passed (at least 244) · 0 failed` and `0.pg · exit 0 · 80 passed (at least 80) · 0 failed`,
// ALL PASS, and the pair above was then set to exactly those two numbers.
// ⛔ THE FIRST RUN OF THIS SUITE ON THE MERGED TREE WAS RED, AND THAT IS WHY THE PLACEHOLDER ABOVE EXISTED:
// `0.mem` printed `exit 1 · 243 passed (at least 244) · 2 failed` — `0.260.1` and its control `0.260.c3` both
// reporting `src/lib/server/audit.ts: exports auditPending, which is neither an audit row reader nor a declared
// non-reader`, an export `origin/rel-lane` `09398014` added for the shutdown drain. Classified in
// `AUDIT_NON_READERS` (see the docblock there), and only THEN did a green run exist to read a floor off.
// ⚠️ Postgres did NOT move again, and that is a measurement too: lane 1's extra case and the 260 repair are both
// §0 source pins and §0 runs in the MEMORY child only — the same reason the previous two merges left 80 alone.
// ⛔ MERGED AGAIN 2026-09-21 (ops ← house-bots), AND IT IS THE SAME COLLISION THIS HEADER ALREADY
// DESCRIBES, a second time. Lane 1 raised the floor 203/64 → 217/64 for the C5-8 reports cases it wrote;
// ops-lane had raised the same base to 230/80 for the alerts cases plus row 77's. The merged
// `house-bot-reports-cases.mts` carries BOTH sets, so NEITHER pair describes this tree, and 230/80 is
// merely the higher of two understatements.
// ⛔ THE DELTAS WERE NOT ADDED: 230 + 14 is an arithmetic guess and this file forbids one by name. The
// merge carried 230/80 — the higher on BOTH stores, so neither lane's guard is weakened — and then the
// number below was set to what `npm run test:house-bot-reports` PRINTED on the merged tree. If the line
// below still reads 230/80 with no printed-run sentence after this one, the measurement did not happen.
// ⭐ **AND IT WAS MEASURED — 230/80 → 244/80, RAISED TO WHAT THE RUN PRINTED AND TO NOTHING ELSE** (ops
// lane, 2026-09-21, the release verdict pass over the merged tree). `npm run test:house-bot-reports` ran
// under `~/heavy-node-lock.sh` and printed `0.mem · exit 0 · 244 passed · 0 failed` and `0.pg · exit 0 ·
// 80 passed · 0 failed`, ALL PASS. ⛔ Run TWICE, and the second run printed the same two numbers.
// ⚠️ The POSTGRES half did NOT move, and that is a measurement too, not an oversight: lane 1's fourteen
// new C5-8 reports cases run on the MEMORY child only, so 80 is still exactly what the Postgres child
// prints. A floor nudged up on both stores "to be safe" would have been an arithmetic guess on the half
// nothing had added to. ⛔ And note what the guess would have produced here: 230 + 14 = 244 on memory,
// the same number — a coincidence of this merge, NOT a licence to compute the next one. The run decided it.
// ⛔ It is never lowered. A section that stops running fails this floor even while every case that ran passed.
// ⭐ 218 → 219, C5-8 (2026-09-21), IN THE SAME COMMIT AS THE ASSERTION THAT RAISED IT: `0.198.3b`, which holds
// the market page's one lawful string to `test:house-bot-surfaces` 4.words.4 instead of re-proving ruling 146 here.
// The memory child PRINTED 219 on that run. Postgres is unchanged: §0 runs in the memory child only.
// ⚠️ WHY AN ASSERTION HAD TO BE ADDED AT ALL — `0.198.3` had been GREEN OVER A FILE THAT IS NOT CLEAN. It reads the
// market page and reported zero house words for weeks, because the shared words family was written `house[ -]?stakes?`
// and an underscore is not in that class; `"HOUSE_STAKE_ONLY"` walked straight through the one guard whose population
// already held that file. `§2J · THE JOIN` closed the class, this assertion went red on the string it had always been
// blind to, and it now names it rather than asserting an absence that was never true.
// ⭐ 217 → 218, C5-8 (2026-09-21), IN THE SAME COMMIT AS THE ASSERTION THAT RAISED IT: `test:house-bot-surfaces`
// joined `VOCABULARY_CONSUMERS`, so `0.175` emits one more case. The memory child PRINTED 218 on that run; Postgres
// is unchanged because the case is a §0 source pin and §0 runs in the memory child only.
// (Lane 1's own record, kept verbatim through the merge above — its 218/64 call line is gone because a file
//  may carry only ONE floor, and the surviving call carries the higher pair on both stores.)
// ⭐ 200 → 203 and 61 → 64, C5-8 phase 3 (2026-09-20), IN THE SAME COMMIT AS THE ASSERTIONS THAT RAISED IT:
// §1j row 77's three `11.247.c1e` lines (the OG route's read list, the `resolveWinShareToken` projection, and the
// plant that makes the second one a measurement) run on BOTH children. A minimum that rises with the assertions is
// a tightening; a minimum re-measured DOWNWARD to absorb a red is the move this programme refuses by name.
// ⛔ MERGED 2026-09-21 (ops ← alerts). The two lanes raised this floor from the SAME base of 200/61 for
// DIFFERENT assertions — ops to 203/64 for the row-77 lines described just above, alerts to 227/77 for its
// own reports cases — and the merged `house-bot-reports-cases.mts` carries BOTH sets. So neither side's pair
// describes this tree, and the alerts pair is merely the higher of two understatements, not the answer.
// ⛔ THE MERGE DID NOT ADD THE DELTAS TOGETHER: 227 + 3 / 77 + 3 is an arithmetic guess, and this file's own
// header allows a floor to rise only to a number a run PRINTED. The merge therefore carried the alerts pair
// (227/77) — the HIGHER of the two on BOTH stores, weakening neither lane's guard — and said plainly that it
// was not this tree's measurement.
// ⭐ **AND NOW IT IS MEASURED — 227/77 → 230/80, RAISED TO WHAT THE RUN PRINTED AND TO NOTHING ELSE**
// (ops lane, 2026-09-21, the proof pass over the merged tree). `npm run test:house-bot-reports` was run under
// `~/heavy-node-lock.sh` on the merged branch and printed `0.mem · exit 0 · 230 passed · 0 failed` and
// `0.pg · exit 0 · 80 passed · 0 failed`, ALL PASS. ⛔ It was run TWICE, and the second run printed the same
// two numbers — a floor taken from one reading of a suite that boots two stores and a scratch database is a
// guess with a witness. ⚠️ Note what the arithmetic would have produced: 230/80, the guess this file forbade,
// happens to be the same pair. That is a coincidence of this merge and NOT a licence to compute the next one:
// the deltas were separate only because the two lanes' assertions were, and the run is what decided it.
// ⛔ It is never lowered. A section that stops running fails this floor even while every case that ran passed.
