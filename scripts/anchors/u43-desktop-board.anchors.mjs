/** The three desktop layout plants consumed by red:u43-desktop-board. */
import { MUTATIONS as BOARD } from "./u43-board.anchors.mjs";

export const MUTATIONS = BOARD.filter(
  (item) => item.expect === "saved closed desktop chart puts cards first without an empty chart column",
);
