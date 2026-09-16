/**
 * red:sms-cost-guard — proves `test:sms-cost-guard` catches each defect in the SMS credit floor,
 * each on its OWN named assertion.
 *
 * ⭐ THE FIRST MUTATION IS NOT INVENTED. It restores the balance recording exactly as it shipped,
 * the latch found by re-reading the floor against live measurements: a refused reply's
 * `balance: 0.0` stored as the account balance, holding every campaign after the outage ended.
 *
 * Mechanics in `red-in-place.mjs`; mutations are DATA in `scripts/anchors/sms-cost-guard.anchors.mjs`.
 *
 * Run: npm run red:sms-cost-guard
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInPlaceRed } from "./red-in-place.mjs";
import { MUTATIONS } from "./anchors/sms-cost-guard.anchors.mjs";

process.exit(
  runInPlaceRed({
    root: join(dirname(fileURLToPath(import.meta.url)), ".."),
    gate: "scripts/sms-cost-guard.test.mts",
    mutations: MUTATIONS,
    label: "red:sms-cost-guard",
  }),
);
