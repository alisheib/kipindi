// R5-L · the ghosts' notes carry the measured numbers (S/r5l/measure-routes.cts, calibrated on tiles 170 178 196).
const { once, edit } = require("./lib.cjs");

edit("src/app/agent/loading.tsx", (s) => once(s,
  " * `text-body-sm`'s own 18px), and every panel was one 20px title bar over two 16px lines (88px) against panels of 294px\n"
  + " * (how it works, tile 196), the seven documents, the fee, the five terms and an eight-row table. Each band below is the\n",
  " * `text-body-sm`'s own 18px), and every panel was one 20px title bar over two 16px lines on 16px gaps in 20px of\n"
  + " * padding (126px) against the page's 294px how-it-works (tile 196), 352px of documents, a 193px fee panel, 198px of\n"
  + " * terms and the 647px eight-row waterfall (its ghost 326) at 1280 in Swahili — the terms link 879px below the ghost's\n"
  + " * at 1280 and 1,888px at 390 (S/r5l/measure-routes.cts, calibrated on tile 196's header, tiles and first panel). Each\n"
  + " * band below is the\n",
  "agent note"));

edit("src/app/results/loading.tsx", (s) => once(s,
  " *     and three groups — the game, the window, the topic with its glyphs — along a row that wraps on their words: three\n"
  + " *     lines at 1024 in Swahili and English (four with the topic's own wrap) and three at 1280 (two in Chinese), measured\n"
  + " *     from the served fonts (S/r5l/measure-bars.cts; tile 170 shows two at 1280 with one-digit counts). The grid landed\n"
  + " *     56 to 168px below the ghost's promise. Each group is now the page's own wrapper, divider, key and pills.\n",
  " *     and three groups — the game, the window, the topic with its glyphs — along a row that wraps on their words: four\n"
  + " *     lines at 1024 in Swahili and English (the topic group wraps inside itself there) and three at 1280 — three and two\n"
  + " *     in Chinese — measured from the served fonts with two-digit counts (S/r5l/measure-routes.cts; tile 170 shows two at\n"
  + " *     1280 with the QA board's one-digit counts). The grid landed 56 to 168px below the ghost's promise. Each group is now\n"
  + " *     the page's own wrapper, divider, key and pills.\n",
  "results row2 note"));
edit("src/app/results/loading.tsx", (s) => once(s,
  " *     arrows and their 12px, the card's 234 — tile 170 — and the dots' 10 + 40), so the grid landed 118px HIGHER than\n"
  + " *     promised. The ghost card is the card's own stack (`p-5 lg:p-6`, the chip row with the page's words, the title,\n"
  + " *     the 28px bar with its 24.5px label row, the stats line), and the title's line count is the one judgement left:\n"
  + " *     three lines on a phone, two from 640, one from 768 (22px from 1024) — the tallest of three notable titles, the\n"
  + " *     80th percentile of the board's titles at each width (S/r5l/measure-routes.cts).\n",
  " *     arrows and their 12px, the card's 234 — tile 170 — and the dots' 10 + 40), so the grid landed 118px HIGHER than\n"
  + " *     promised (68px at 390). The ghost card is the card's own stack (`p-5 lg:p-6`, the chip row with the page's words,\n"
  + " *     the title, the 28px bar with its 24.5px label row, the stats line), and the title's line count is the one\n"
  + " *     judgement left: three lines on a phone (four in Swahili at 320), two from 640, one from 768 (at 22px from 1024) —\n"
  + " *     the tallest of three notable titles: the 80th percentile of the board's titles at each width, from the served\n"
  + " *     fonts (S/r5l/measure-routes.cts).\n",
  "results carousel note"));

edit("src/app/results/page.tsx", (s) => once(s,
  "            24px header row against the page's 38, the phone's Filters pill beside the sort at every width (a second line at\n"
  + "            320, and none of the three groups from 1024) and no carousel — page one's first card landed 395 to 547px below it — and eight\n"
  + "            cards with the open card's YES/NO buttons where the page draws nine closed ones. */}\n",
  "            24px header row against the page's 38, the phone's Filters pill beside the sort at every width (a second line at\n"
  + "            320, and none of the three groups from 1024), no carousel — page one's first card landed 395 to 547px below its\n"
  + "            promise — and eight cards with the open card's YES/NO buttons where the page draws nine closed ones. */}\n",
  "results page note"));

edit("src/app/live/loading.tsx", (s) => once(s,
  " *     where the page's takes one from 375 (Swahili and English) and 345 (Chinese) — at 390, the most common phone, the\n",
  " *     where the page's takes one from 375–376 (Swahili and English) and 345 (Chinese) — at 390, the most common phone, the\n",
  "live note"));
