// R5-L · two follow-ups after the one-helper battery:
//  · r5b 9.4 read the money books' count ghost in money-bar-ghost.tsx; the count ghost is the bar kit's `CountGhost` now
//    (one for every bar ghost — R5-K's, moved beside the one pill), so the pin reads its markup there and requires the
//    money books' ghost to draw it.
//  · the helper's notes name the merge kit as it is: the patch S/r5l/r5l-on-6f5b24c0.patch (built by S/r5l/merge/build.cjs).
const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r5b.test.mts", (s) => once(s,
  "  ok(\"9.4 · the ghost's count is as tall as the count's line (17.25), so row 2 lands where the page puts it\",\n"
  + "    /<p className=\"shrink-0 font-mono text-\\[11\\.5px\\] tabular-nums text-transparent\"><span className=\"rounded bg-bg-overlay\">\\{count\\}<\\/span><\\/p>/.test(users[2][1])\n",
  "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-K, R5-L): the count ghost is the bar kit's `CountGhost` (`query-bar-ghost.tsx`, one\n"
  + "  // for every bar ghost — the money books' and /positions'), which the money books' ghost draws.\n"
  + "  ok(\"9.4 · the ghost's count is as tall as the count's line (17.25), so row 2 lands where the page puts it\",\n"
  + "    /<p className=\"shrink-0 font-mono text-\\[11\\.5px\\] tabular-nums text-transparent\"><span className=\"rounded bg-bg-overlay\">\\{count\\}<\\/span><\\/p>/.test(read(\"src/components/ui/query-bar-ghost.tsx\"))\n"
  + "      && users[2][1].includes(\"<CountGhost count={count} />\")\n",
  "r5b 9.4"));
edit("src/components/ui/ghost-kit.tsx", (s) => once(s,
  " * ⭐ ON THE MERGE (S/r5l/merge/one-helper.cjs): `ButtonGhost` and its `glyphRoom` move to the end of `ghost-text.tsx`,\n"
  + " * every `@/components/ui/ghost-kit` import reads `@/components/ui/ghost-text`, and this file is deleted.\n",
  " * ⭐ ON THE MERGE (S/r5l/r5l-on-6f5b24c0.patch, built by S/r5l/merge/build.cjs): `ButtonGhost` and its `glyphRoom` move\n"
  + " * to the end of `ghost-text.tsx`, every `@/components/ui/ghost-kit` import reads `@/components/ui/ghost-text`, and this\n"
  + " * file is deleted.\n",
  "kit doc"));
edit("scripts/visual-pass-r5l.test.mts", (s) => once(s,
  "/** The ghost helper — ONE file: R5-K's `ghost-text.tsx` on the merge (S/r5l/merge/one-helper.cjs re-points this line). */\n",
  "/** The ghost helper — ONE file: R5-K's `ghost-text.tsx` on the merge (the merge patch re-points this line). */\n",
  "suite doc"));
