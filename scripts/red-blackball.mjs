/**
 * red:blackball — proves `test:blackball` catches each defect the Blackball transport was
 * written to avoid, each on its OWN named assertion.
 *
 * ⭐ WHY THIS HARNESS EXISTS. `test:blackball` prints 46 green lines against a stubbed
 * gateway, and green against a stub is the cheapest lie in the building: a suite that had
 * quietly stopped exercising the adapter would print exactly the same 46 lines. The only
 * question worth asking is the standing one — *would it still pass if the thing it checks
 * for were absent?* — and the only honest way to answer it is to make the thing absent.
 *
 * ⛔ ITS FIRST RUN FOUND THREE VACUOUS ASSERTIONS IN THE SUITE ITSELF, not in the product:
 * an `ok(label, true)` whose comment claimed "reaching here is the assertion" and which
 * therefore could never print FAIL; a batch-ceiling test sized from the very constant it
 * was checking, so both sides moved together; and a hang test that hung Node before its own
 * assertion ran. All three are fixed, and each is recorded at the site.
 *
 * The mutation mechanics live in `red-in-place.mjs`; the mutations themselves are DATA in
 * `scripts/anchors/blackball.anchors.mjs`, so `test:red-anchors` §3 can audit that every
 * anchor still resolves exactly once without running any of this.
 *
 * Run: npm run red:blackball
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInPlaceRed } from "./red-in-place.mjs";
import { MUTATIONS } from "./anchors/blackball.anchors.mjs";

process.exit(
  runInPlaceRed({
    root: join(dirname(fileURLToPath(import.meta.url)), ".."),
    gate: "scripts/blackball-adapter.test.mts",
    mutations: MUTATIONS,
    label: "red:blackball",
  }),
);
