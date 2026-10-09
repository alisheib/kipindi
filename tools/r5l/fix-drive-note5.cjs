// R5-L · §D's header: the data-case note reflowed to the measure.
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => once(s,
  " * ⚠️ And an element below a band the DATA sets (a bar's row 2, /results' carousel) is held only when the page is the case\n"
  + " * its ghost drew; else its delta is printed, not held — `D_ROUTES`' note. Today's QA board is not /results' case (six\n"
  + " * results: one notable, no arrows, one-digit counts), so there §D holds /results' row 2 and prints the grid's delta.\n",
  " * ⚠️ And an element below a band the DATA sets (a bar's row 2, /results' carousel) is held only when the page is the\n"
  + " * case its ghost drew; else its delta is printed, not held — `D_ROUTES`' note. Today's QA board is not /results' case\n"
  + " * (six results: one notable, no arrows, one-digit counts), so there §D holds /results' row 2 and prints the grid's\n"
  + " * delta.\n",
  "header reflow"));
