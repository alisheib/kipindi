import { edit } from "./edit-lib.mjs";
edit("scripts/spacing-scale.test.mts", [
  ["const CEILING = 453;   // -1, 2026-10-09 (round 5, R5-C's gold audit)",
   "const CEILING = 431;   // -22, 2026-10-09 (round 5's follow-up, R5-K): the seven K loading ghosts were rebuilt from their pages' own classes, and where a page writes an inverted key the ghost takes its same-pixel literal (`py-[14px]` for `py-3.5`, `gap-[10px]` for `gap-2.5`) — their hand-placed bars (`w-28`, `w-14`, `h-2.5`, `h-3.5`, `p-3.5`, `py-3.5`) went with them — and the standing strip's two `pl-3.5` cells read one constant (`PNL_STRIP.cell`) that its ghost shares; measured with this file's own regex over the changed files, 29 → 7, 453 → 431 across 161 files. // -1, 2026-10-09 (round 5, R5-C's gold audit)"],
]);
