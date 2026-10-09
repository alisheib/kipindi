const { once, edit } = require("./lib.cjs");
edit("src/components/ui/strip-autoscroll.tsx", (s) => once(s,
  "     transition's paint: after every move, a strip that fits drew its first frame with its end faded (the CSS's\n"
  + "     default, `.kp-strip-fade` with no mark), and one at its end with the wrong side faded. So the mark is read here,\n"
  + "     in the layout phase, against the strip's real width; the effect below still frames the pressed chip (a scroll\n",
  "     transition's paint: after every move, a strip whose chips all fit drew its first frame with its end faded (the\n"
  + "     CSS's default for `.kp-strip-fade` with no mark, below lg), the last chip dimmed for a frame. So the mark is read\n"
  + "     here, in the layout phase, against the strip's real width; the effect below still frames the pressed chip (a scroll\n", "note"));
