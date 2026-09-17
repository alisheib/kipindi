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
 * them true: §0 opens in step 1–2 (rulings 169, 170, 175); §1–§2 open step 3, written red before the readers exist.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-reports", casesFile: "scripts/lib/house-bot-reports-cases.mts", minPass: 1, dbPrefix: "hb_reports" });
