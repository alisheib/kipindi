const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r4j.test.mts", (s) => once(s,
  "ghost.includes('import { TicketsGhost } from \"@/components/journey/tickets/tickets-ghost\";')",
  "ghost.includes('import { TicketsGhost, TicketsHeadGhost } from \"@/components/journey/tickets/tickets-ghost\";')", "3.4 import"));
