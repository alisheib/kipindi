/**
 * test:maswali-licence-gate — MILLIONEA'S LICENCE BASIS, ON BOTH STORES (MASWALI-BUILD LICBASIS; OD-01, MB-39 — the suite
 * MB-39 named, proving the refusal with a positive control).
 *
 *   npm run test:maswali-licence-gate     (boots the on-box Postgres through db-scratch)
 *   npm run red:maswali-licence-gate      (its plants: `scripts/red-maswali-licence-gate.mjs`)
 *
 * The rule (`src/lib/server/maswali-licence.ts`; COMPLIANCE-DECISIONS § "2026-10-23 · Maswali Millionea — the licence
 * basis is 50pick's GBT licence …"): a basis the Owner RECORDED always decides — an explicit None included; with nothing
 * ever recorded, the Owner's ruling of 2026-10-23 is the basis, on the platform's licence number; with neither, no week
 * opens. ONE CASE LIST, TWO STORES (`scripts/lib/maswali-licence-gate-child.mts`): Postgres is where "never recorded"
 * (no row) and "recorded None" (a row) are told apart by the store itself, and where a stored row reaches the rule only
 * through the config factory's `migrate`.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * The floor is per store (the "nothing recorded" marker row exists only on Postgres, and a blank licence number only in
 * memory). Measured from the first printed green run; it only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-licence-gate",
  casesFile: "scripts/lib/maswali-licence-gate-child.mts",
  minPass: { memory: 68, postgres: 65 }, // printed by the green run of MASWALI-BUILD LICBASIS 2 (66 / 63 at LICBASIS 1)
  dbPrefix: "mlw_licence",
});
