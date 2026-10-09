// R5-L · the bar kit's note carries the model's final numbers.
const { once, edit } = require("./lib.cjs");
edit("src/components/ui/query-bar-ghost.tsx", (s) => once(s,
  " * by the pills' labels — measured from the served fonts (S/r5l/measure-bars.cts), /results' row is three lines at 1024\n"
  + " * and two or three at 1280, /markets' two in Swahili and English, where their ghosts drew ONE line of typed boxes: the\n"
  + " * grid landed 56 to 112px below the ghost's promise. So every part here is the page's own box (`filterPillClass`'s\n",
  " * by the pills' labels — measured from the served fonts with two-digit counts (S/r5l/measure-routes.cts), /results' row\n"
  + " * is four lines at 1024 and three at 1280 in Swahili and English (three and two in Chinese), /markets' two (one in\n"
  + " * Chinese at 1280), where their ghosts drew ONE line of typed boxes: the grid landed 56 to 168px below the ghost's\n"
  + " * promise. So every part here is the page's own box (`filterPillClass`'s\n",
  "kit note"));
