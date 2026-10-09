// R5-L · /results' ghost says which archive it draws, and what a smaller one (today's QA board, tile 170) does instead.
const { once, edit } = require("./lib.cjs");
edit("src/app/results/loading.tsx", (s) => once(s,
  " * ⚠️ The board drawn is the common one: an archive with rows (the bar and search shown), three notable results on page\n"
  + " * one (an archive of eight or more), and `PLAYER_PER_PAGE` less those three in the grid.\n",
  " * ⚠️ The board drawn is the common one, an archive of eight results or more: rows (the bar and search shown), three\n"
  + " * notable results on page one (the carousel with its arrows and dots), two-digit counts, and `PLAYER_PER_PAGE` less\n"
  + " * those three in the grid. A smaller archive is another case — today's QA board (tile 170: six results) shows one\n"
  + " * notable, a carousel without arrows or dots (106px shorter), and one-digit counts, which take row 2 a line shorter at\n"
  + " * 1280 in Swahili and English and at 1024 in English (56px): its grid lands 106 to 162px higher than this ghost promises.\n",
  "results case"));
