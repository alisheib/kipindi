const { once, edit } = require("./lib.cjs");
edit("scripts/journey-tickets.test.mts", (s) => once(s,
  "/** The one line each loading file opens with since round 5's follow-up (R5-H, G-2): the shell's own answer, asked alone —\n"
  + " *  the drawings read their words in the browser. */\n"
  + "const ASK = \"const { journey } = await resolveSimpleJourney();\";\n",
  "/* The one line each loading file opens with since round 5's follow-up (R5-H, G-2) is the page's own `ASK` (§2): the shell's\n"
  + "   answer, asked alone — the drawings read their words in the browser. */\n", "dup ASK"));
