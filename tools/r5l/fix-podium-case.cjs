// R5-L · the leaderboard's podium drawn as the measured board's (tiles 177, 178, 203): the leader WITHOUT a hot streak,
// its two neighbours on one each — the ghost had a streak in all three, so its podium stood 8px taller than the measured
// page's (243.5 against 235.5 at 1280) and the table's first row landed 8px higher than promised. The notes say which
// case is drawn, why, and what the other two cases do; the unbacked "production ranks 41" is gone; 368 at 390 is the
// measured board's figure (376 was a streaked leader's).
const { once, edit } = require("./lib.cjs");
edit("src/app/leaderboard/loading.tsx", (s) => {
  s = once(s,
    " * and the table with its 35px head. So the page's first row landed 313px below the ghost's at 1280 and 376px at 390 —\n",
    " * and the table with its 35px head. So the page's first row landed 313px below the ghost's at 1280 and 368px at 390 —\n",
    "first-row figures");
  s = once(s,
    " * ⚠️ THE BOARD DRAWN IS THE COMMON ONE: more players than a page holds (production ranks 41), so page one's twelve rows\n"
    + " * (`PLAYER_PER_PAGE`) under a podium of three; the cap sentence (a board of fifty) and the pager under the rows are not\n"
    + " * drawn — how many pages is the data's, and nothing lands below the rows but the footer. The podium's three hold one hot\n"
    + " * streak each (tile 178), a short handle on one line, and the leader's tier is silver; a longer handle wraps on a phone.\n",
    " * ⚠️ WHERE THE DATA DECIDES A HEIGHT, THE CASE DRAWN:\n"
    + " *   · the podium is the measured board's (tiles 177, 178 and 203, the one board this round read): the leader WITHOUT a\n"
    + " *     hot streak and the two beside it on one each, short handles on one line, a silver leader. A streak is the data's\n"
    + " *     (the player's latest settled prediction won), and the tallest column sets the band (`items-end`): a leader on a\n"
    + " *     streak makes the page's podium 8px taller than this one, a podium with no streak at all 18.5px shorter; a longer\n"
    + " *     handle wraps on a phone.\n"
    + " *   · the rows are a full page, twelve (`PLAYER_PER_PAGE`): they are the last band, so a shorter board (the measured one\n"
    + " *     ranks seven) moves nothing but the footer below them. The cap sentence (a board of fifty) and the pager are not\n"
    + " *     drawn — how many pages there are is the data's.\n",
    "board drawn");
  s = once(s,
    " *  no box) and #3 (48px crests), each its handle and 22px tier badge (stacked below 640), the rate, a hot streak and the\n"
    + " *  resolved count. The bottoms align (`items-end`), so the tallest column — the leader's — sets the band. */\n",
    " *  no box) and #3 (48px crests), each its handle and 22px tier badge (stacked below 640), the rate, a hot streak (the two\n"
    + " *  beside the leader: the measured board's — the file's note) and the resolved count. The bottoms align (`items-end`), so\n"
    + " *  the tallest column sets the band: here a neighbour's, 18.5px taller than the leader's without its streak line. */\n",
    "podium doc");
  s = once(s,
    "              {/* The streak's line: the column's 15px type on its 22.5px line box, the 21px chip inside it (1px border,\n"
    + "                  2px padding, its 10px words on their 15px line) — then the resolved count's own 15px line (10px × 1.5).\n"
    + "                  One line each, so the line's box is the ghost; the words would size nothing. */}\n"
    + "              <span className=\"mt-1 flex h-[22.5px] items-center\"><span className=\"h-[21px] w-[72px] rounded-pill bg-bg-overlay\" /></span>\n",
    "              {/* The streak's line, beside the leader only (the measured board): the column's 15px type on its 22.5px line\n"
    + "                  box, the 21px chip inside it (1px border, 2px padding, its 10px words on their 15px line) — then the\n"
    + "                  resolved count's own 15px line (10px × 1.5). One line each, so the line's box is the ghost; the words\n"
    + "                  would size nothing. */}\n"
    + "              {!first && <span className=\"mt-1 flex h-[22.5px] items-center\"><span className=\"h-[21px] w-[72px] rounded-pill bg-bg-overlay\" /></span>}\n",
    "streak line");
  return s;
});
edit("scripts/visual-pass-r5l.test.mts", (s) => once(s,
  "  ok(`5.4 · RUN: the lens draws ${pills} pills — the page's ${lens.length} (\\`LEADER_PRODUCTS\\`), their words set and not shown`, pills === lens.length && html.includes(esc(dict.sw.common.markets)));\n",
  "  ok(`5.4 · RUN: the lens draws ${pills} pills — the page's ${lens.length} (\\`LEADER_PRODUCTS\\`), their words set and not shown`, pills === lens.length && html.includes(esc(dict.sw.common.markets)));\n"
  + "  // The podium's case (the ghost's note): the measured board's — the two beside the leader on a hot streak, the leader not;\n"
  + "  // the columns stand #2, #1, #3. The page draws the streak's line only for a player on one.\n"
  + "  const podium = html.slice(html.indexOf(\"grid grid-cols-3 items-end\"), html.indexOf(\"admin-tbl\"));\n"
  + "  const streakIn = podium.split(\"flex min-w-0 flex-col items-center text-center\").slice(1).map((c) => c.includes(\"h-[21px] w-[72px]\"));\n"
  + "  ok(`5.5 · RUN: the podium drawn is the measured board's (tiles 177, 178, 203) — a hot streak's line beside the leader and none in its column (#2, #1, #3: ${streakIn.join(\", \")}), so the band is a neighbour's column, as the page's was (235.5px at 1280); the page draws the line only for a player on a streak`,\n"
  + "    streakIn.length === 3 && streakIn[0] && !streakIn[1] && streakIn[2] && pg.includes('{r.streak > 0 && <span className=\"mt-1\"><HotChip streak={r.streak} t={t} /></span>}'), j({ streakIn }));\n",
  "suite 5.5"));
