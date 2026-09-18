/**
 * HOUSE-BOT DESIGNATION — eligibility, the holder's password, designate, re-verify, Start, the consent void,
 * password history, erasure and the owner notices, on Postgres AND memory (PLAN §6, 02 §2.6/§3.2/§3.3,
 * 04 A3, A4, A5, A22, C4, C8, C9, C13, R6, N2 §4 step 10).
 *
 *   npm run test:house-bot-designation
 *
 * ⛔ WHAT THIS GUARDS. An owner holds a stranger's password for a moment: it must never become a session,
 * never lock the holder out, never be spent on an account that cannot be designated, and never outlive a
 * change the holder makes while the owner types. Consent is a fingerprint AND the absence of a void — a
 * self-exclusion with the same password still needs a fresh confirmation, and every targeted poll ends with
 * the consent. Erasure refuses while the account is a house bot and, once it runs, leaves no label behind.
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * ⛔ THE FLOOR IS PER STORE AND MEASURED (replan ruling 515, 2026-09-18). It was the scalar `120` while the run
 * prints memory 169 and Postgres 161, so it would not have noticed 49 memory cases and 41 Postgres cases vanishing.
 * Raised to the counts `npm run test:house-bot-designation` PRINTED at `d2f20795`, never to an arithmetic guess, and a
 * SCALAR becomes a PAIR because one number is bounded by the SMALLER child.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-designation", casesFile: "scripts/lib/house-bot-designation-cases.mts", minPass: { memory: 169, postgres: 161 }, dbPrefix: "hb_desig" });
