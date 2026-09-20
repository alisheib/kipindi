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

await runTwoStores({ suite: "test:house-bot-reports", casesFile: "scripts/lib/house-bot-reports-cases.mts", minPass: { memory: 200, postgres: 61 }, dbPrefix: "hb_reports" });
