/**
 * red:sms-dlr — proves `test:sms-dlr` catches each control the delivery-receipt receiver
 * depends on, each on its OWN named assertion.
 *
 * ⭐ WHY THIS ONE MATTERS MORE THAN MOST. This endpoint is internet-facing and mutates
 * state. Its defences are a shared secret, an unguessable reference, an msisdn cross-check
 * and a monotonic state machine — four controls that all fail SILENTLY. A missing one does
 * not throw, does not log, and does not change the 200 the vendor sees. The suite is the
 * only thing that can notice, so the suite has to be shown to work.
 *
 * ⛔ THREE MUTATIONS TARGET `store.ts`, NOT THE ROUTE, because the suite runs on the
 * in-memory DAL and that is the monotonic guard it actually exercises. Mutating only the
 * Prisma copy would prove nothing about the code under test.
 *
 * Mechanics in `red-in-place.mjs`; mutations are DATA in `scripts/anchors/sms-dlr.anchors.mjs`.
 *
 * Run: npm run red:sms-dlr
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInPlaceRed } from "./red-in-place.mjs";
import { MUTATIONS } from "./anchors/sms-dlr.anchors.mjs";

process.exit(
  runInPlaceRed({
    root: join(dirname(fileURLToPath(import.meta.url)), ".."),
    gate: "scripts/sms-dlr.test.mts",
    mutations: MUTATIONS,
    label: "red:sms-dlr",
  }),
);
