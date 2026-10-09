// R5-L · §D's note: one line was 121 characters; reflowed to the 120-column measure.
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => once(s,
  " * the two in-page Suspense skeletons on a DOCUMENT load (/results and /markets: their fallbacks are their loading files'\n"
  + " * drawings). Signed in through the dev door (`/auth/demo`) where the route needs a player; the page a route is reached\n"
  + " * from is one that links to it.\n",
  " * the two in-page Suspense skeletons on a DOCUMENT load (/results and /markets: their fallbacks are their loading\n"
  + " * files' drawings). Signed in through the dev door (`/auth/demo`) where the route needs a player; the page a route is\n"
  + " * reached from is one that links to it.\n",
  "drive wrap 2"));
