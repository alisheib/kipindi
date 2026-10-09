// R5-L · the ghosts mirror four inverted keys of their pages (w-14, gap-2.5, mt-2.5 ×2) as same-pixel literals, as every
// skeleton's are (spacing-scale's 2026-09-10 rule: placeholder boxes take the literal); the ceiling falls by the nine the
// two in-page skeletons took with them.
const { once, edit } = require("./lib.cjs");
edit("src/app/leaderboard/loading.tsx", (s) => once(s, '<th className="text-left p-3 w-14">', '<th className="text-left p-3 w-[56px]">', "th w-14"));
edit("src/app/live/loading.tsx", (s) => once(s, '<div className="mt-2.5 flex h-[18px] items-center justify-between">', '<div className="mt-[10px] flex h-[18px] items-center justify-between">', "live mt-2.5"));
edit("src/app/results/loading.tsx", (s) => {
  s = once(s, '        <div className="flex items-center gap-2.5">\n', '        <div className="flex items-center gap-[10px]">\n', "results gap-2.5");
  s = once(s, '      <div className="mt-2.5 flex items-center justify-center">\n', '      <div className="mt-[10px] flex items-center justify-center">\n', "results mt-2.5");
  return s;
});
edit("scripts/spacing-scale.test.mts", (s) => once(s,
  "const CEILING = 453;   // -1, 2026-10-09 (round 5, R5-C's gold audit)",
  "const CEILING = 444;   // -9, 2026-10-09 (round 5's follow-up, R5-L): the two in-page Suspense skeletons left with their drawings — /markets' `GridSkeleton` (`w-16 w-20 w-24 w-32`) and /results' `ResultsSkeleton` (`w-16 w-20 w-32 h-3.5`, and its header's `gap-2.5`… the page's own `gap-2.5` stays) — each page's fallback is its loading file's ghost now; the rebuilt ghosts mirror their pages' four inverted keys (`w-14`, `gap-2.5`, `mt-2.5` twice) as same-pixel literals, as every skeleton's are. Measured 444 across the tree. // -1, 2026-10-09 (round 5, R5-C's gold audit)",
  "ceiling"));
