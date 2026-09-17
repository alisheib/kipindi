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
 * server-side void-notice and KYC cases (rulings 195, 197) on both stores: memory 213, Postgres 143.
 * A section that stops running fails the floor even while every case that ran passed.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-reports", casesFile: "scripts/lib/house-bot-reports-cases.mts", minPass: { memory: 213, postgres: 143 }, dbPrefix: "hb_reports" });
