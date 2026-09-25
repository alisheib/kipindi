/**
 * red:support-contact — proves `test:support-contact` catches each way the statutory helpline stops
 * being one number, each on its OWN named assertion.
 *
 * ⭐ WHY IT EXISTS. That suite is fifteen sections, discovers its own population, and carries
 * controls that prove its detectors work — and until 2026-09-25 nothing had ever proven any of it
 * could FAIL. It had no `red:` key. Marketing plan U5 (D6) is the unit that noticed: the helpline
 * duplication it was written to remove had already been removed by the support-and-care campaign,
 * and what was actually missing was the control.
 *
 * ⛔ TWO OF THE FOUR MUTATIONS ARE CONTROLS ON THE SUITE'S OWN CONTROLS. §15.1 passes perfectly over
 * a file that has stopped printing the helpline at all, so one mutation deletes a copy rather than
 * drifting it and requires §15.2 to be the thing that fires.
 *
 * Mechanics in `red-in-place.mjs`; mutations are DATA in `scripts/anchors/support-contact.anchors.mjs`.
 *
 * Run: npm run red:support-contact
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInPlaceRed } from "./red-in-place.mjs";
import { MUTATIONS } from "./anchors/support-contact.anchors.mjs";

process.exit(
  runInPlaceRed({
    root: join(dirname(fileURLToPath(import.meta.url)), ".."),
    gate: "scripts/support-contact.test.mts",
    mutations: MUTATIONS,
    label: "red:support-contact",
  }),
);
