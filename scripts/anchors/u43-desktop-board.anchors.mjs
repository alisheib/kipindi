/** The desktop subset of the shared board plants, consumed by its RED harness. */
import { MUTATIONS as BOARD_MUTATIONS } from "./u43-board.anchors.mjs";

export const MUTATIONS = BOARD_MUTATIONS.filter((item) =>
  item.expect === "saved closed desktop chart puts cards first without an empty chart column");
