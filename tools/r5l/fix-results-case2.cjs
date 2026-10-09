// R5-L · /results' case note reflowed to the measure.
const { once, edit } = require("./lib.cjs");
edit("src/app/results/loading.tsx", (s) => once(s,
  " * notable, a carousel without arrows or dots (106px shorter), and one-digit counts, which take row 2 a line shorter at\n"
  + " * 1280 in Swahili and English and at 1024 in English (56px): its grid lands 106 to 162px higher than this ghost promises.\n",
  " * notable, a carousel without arrows or dots (106px shorter), and one-digit counts, which take row 2 a line shorter\n"
  + " * at 1280 in Swahili and English and at 1024 in English (56px): its grid lands 106 to 162px higher than this ghost\n"
  + " * promises.\n",
  "results reflow"));
