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
 * minPass is per store and MEASURED, and may only rise: C5 step 3 measured memory 141 (§0's pins and controls, §1, §2,
 * §1.177, §3, §11, the store case) and Postgres 81 (§1, §2 with the ledger cross-check, §1.177, §3, §11, the store case);
 * its verification added 11 cases on both stores (the NO side and the pure fold, the book's ranges and per-product open
 * exposure, the fee's product, window and null branches, and the window bounds of four readers): memory 152, Postgres 92.
 * C5 step 4 added §0's TGT-38 and KYC-reader pins (memory only), §3's R9 cases (rulings 170, 178, 187–190) and §4's
 * server-side void-notice and KYC cases (rulings 195, 197) on both stores: memory 213, Postgres 143. Its review fixes added the
 * page-condition, KYC-object and R9-site pins with their controls (memory) and, on both stores, the stage-2 and in-lock
 * refusals, the two-admin twin, the lock facts of the void's read and the decisions' result keys: memory 226, Postgres 148.
 * C5 step 5 added §0's ruling 198 player-surface pins, the R2 importer and slot pins and the R2 vocabulary words (memory only),
 * and §4.S5's R2 parts, surface renders, held title, bulk count, KYC line and objector notices (rulings 192–197; the pure
 * cases in the memory child): memory 258, Postgres 160; its render pass added the page-wiring and slot-rendering pins and
 * the two-group renderer case (memory): memory 263, Postgres 160. Its review added the console gate (ruling 259) — the pages'
 * one gated read in its own catch, the row tag and KYC wiring, the slot chain, the player population read from disk, the
 * player pages' printed words and the product-built vocabulary pin (memory), and §4.259 on both stores: memory 273, Postgres 164.
 * Its close added ruling 260's pin over every console file's audit reads and house imports with its controls (memory) and
 * §4.260's audit-row gate on both stores: memory 280, Postgres 168.
 * A section that stops running fails the floor even while every case that ran passed.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-reports", casesFile: "scripts/lib/house-bot-reports-cases.mts", minPass: { memory: 280, postgres: 168 }, dbPrefix: "hb_reports" });
