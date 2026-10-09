import { edit } from "./edit-lib.mjs";
edit("scripts/ui-consistency-baseline.json", [
  [`  "_total": 136,
`, `  "_total": 134,
`],
  [`    "numeric-size-utility::src/app/positions/performance/loading.tsx": 2,
`, ``],
]);
edit("scripts/type-scale.test.mts", [
  ["const RATCHET_SUBFLOOR = 745; // -2, 2026-10-09 (R5-I,",
   "const RATCHET_SUBFLOOR = 744; // -1, 2026-10-09 (round 5's follow-up, R5-K): /profile's faces moved into one module (`profile-faces.ts`) that the page, its name editor and its loading ghost read — measured over this tip's files against the change, 742 → 741; only R5-K's own one is locked in. // -2, 2026-10-09 (R5-I,"],
  ["const RATCHET_ARBITRARY_SIZE = 899; // -2, 2026-10-09 (R5-I):",
   "const RATCHET_ARBITRARY_SIZE = 897; // -2, 2026-10-09 (round 5's follow-up, R5-K): the name editor's two copies of the name's face (`text-[24px] md:text-[28px]`, the box and the field) are one constant (`PROFILE_NAME_FACE`) that /profile's ghost reads too, net of the one size the performance ghost's heading mirrors from its page — 861 → 859 over the changed files; only R5-K's own two are locked in. ⚠️ R5-K's §6 count went UP by two (232 → 234, under its ratchet): the /positions and /positions/performance ghosts set three of their pages' tracked micro lines in the pages' own classes (they wrap, so the words must be set in the face that wraps them) and the name face's two tracking copies became one. // -2, 2026-10-09 (R5-I):"],
]);
