// R5-L · §D's note: the paragraph reflowed to the file's measure (a line broke after "§D").
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => once(s,
  " * so the element each one promises lands on the page's pixel: §D\n"
  + " * hops to each route (a client move, so the loading file paints), records where the ghost drew a shared element —\n"
  + " * the first grid card, the table's first row, the last glass panel, the page's h1 — and where the page puts it, and\n"
  + " * fails anything more than BOX_TOL apart. §D2 does the same for the two in-page Suspense skeletons on a DOCUMENT load\n"
  + " * (/results and /markets: their fallbacks are their loading files' drawings). Signed in through the dev door\n"
  + " * (`/auth/demo`) where the route needs a player; the page a route is reached from is one that links to it.\n",
  " * so the element each one promises lands on the page's pixel: §D hops to each route (a client move, so the loading file\n"
  + " * paints), records where the ghost drew a shared element — the first grid card, the table's first row, the last glass\n"
  + " * panel, the page's h1 — and where the page puts it, and fails anything more than BOX_TOL apart. §D2 does the same for\n"
  + " * the two in-page Suspense skeletons on a DOCUMENT load (/results and /markets: their fallbacks are their loading files'\n"
  + " * drawings). Signed in through the dev door (`/auth/demo`) where the route needs a player; the page a route is reached\n"
  + " * from is one that links to it.\n",
  "drive wrap"));
