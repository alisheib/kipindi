// R5-L · §D's header names the data-case rule (`D_ROUTES`' note has it in full).
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => once(s,
  " * ⚠️ A route whose element never shows in a ghost frame, or never arrives, proved nothing and is reported as such.\n"
  + " */\n"
  + "import { chromium } from \"playwright\";\n",
  " * ⚠️ A route whose element never shows in a ghost frame, or never arrives, proved nothing and is reported as such.\n"
  + " * ⚠️ And an element below a band the DATA sets (a bar's row 2, /results' carousel) is held only when the page is the case\n"
  + " * its ghost drew; else its delta is printed, not held — `D_ROUTES`' note. Today's QA board is not /results' case (six\n"
  + " * results: one notable, no arrows, one-digit counts), so there §D holds /results' row 2 and prints the grid's delta.\n"
  + " */\n"
  + "import { chromium } from \"playwright\";\n",
  "header note"));
