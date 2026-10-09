// R5-L · §D's note names the rebuilt ghosts it cannot hop to, and why (the lock turn tiles them).
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => once(s,
  " * files' drawings). Signed in through the dev door (`/auth/demo`) where the route needs a player; the page a route is\n"
  + " * reached from is one that links to it.\n",
  " * files' drawings). Signed in through the dev door (`/auth/demo`) where the route needs a player; the page a route is\n"
  + " * reached from is one that links to it. ⚠️ Not hopped: /agent/apply, /agent/status, /agent/invite/<token> and\n"
  + " * /proposals/new — each is linked only in a state the dev door does not make (an application begun, one submitted, a\n"
  + " * live invitation, proposals open), so a lock turn tiles them from a player in that state.\n",
  "drive note 3"));
