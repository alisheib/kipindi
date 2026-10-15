/**
 * red:journey-updown — proves `test:journey-updown` catches each defect Juu/Chini's journey arm (Vodacom S12, WP8–WP11)
 * was built to make impossible, each on its OWN named assertion: a tap that places a figure not on screen, a multiple back
 * on an Up & Down choice, a projection that is not the pool's, a seed that could price a multiple, the bonus left out of the
 * spendable figure, a deposit door without its bet, a "starts at" for a round already live, the paid line read from the
 * address, a classic line edited, a journey key on a classic card, the tab marker written before the privacy notice names
 * a round, and the Chinese How-to's false "equally".
 *
 * The mutation mechanics live in `red-in-place.mjs`; the mutations are DATA in `scripts/anchors/journey-updown.anchors.mjs`,
 * so `test:red-anchors` §3 audits every anchor without running any of this. It writes source: run it ALONE, then
 * `git diff --exit-code`.
 *
 * Run: npm run red:journey-updown
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInPlaceRed } from "./red-in-place.mjs";
import { MUTATIONS } from "./anchors/journey-updown.anchors.mjs";

process.exit(
  runInPlaceRed({
    root: join(dirname(fileURLToPath(import.meta.url)), ".."),
    gate: "scripts/journey-updown.test.mts",
    mutations: MUTATIONS,
    label: "red:journey-updown",
  }),
);
