/** The social-mark subset of the shared shell-palette plants, consumed by its RED harness. */
import { MUTATIONS as PALETTE_MUTATIONS } from "./u43-shell-palette.anchors.mjs";

export const MUTATIONS = PALETTE_MUTATIONS.filter((item) =>
  item.file === "src/components/ui/social-marks.tsx");
