// R5-H · G-3's sibling: the strip's edge mark (`data-edges`, read by the first paint's fade) set in the layout phase.
const { once, edit } = require("./lib.cjs");
edit("src/components/ui/strip-autoscroll.tsx", (s) => {
  s = once(s, 'import { useEffect, useRef } from "react";\n', 'import { useEffect, useLayoutEffect, useRef } from "react";\n', "import");
  s = once(s, "  const framed = useRef(new WeakMap<HTMLElement, string>());\n\n  useEffect(() => {\n",
    "  const framed = useRef(new WeakMap<HTMLElement, string>());\n\n"
    + "  /* ⭐ THE EDGES ARE MARKED BEFORE THE FIRST PAINT (round 5's follow-up, R5-H · G-3 — the journey flag's phases, for every\n"
    + "     DOM mark a first paint reads). `data-edges` decides the strip's fade, and the effect below runs after a\n"
    + "     transition's paint: after every move, a strip that fits drew its first frame with its end faded (the CSS's\n"
    + "     default, `.kp-strip-fade` with no mark), and one at its end with the wrong side faded. So the mark is read here,\n"
    + "     in the layout phase, against the strip's real width; the effect below still frames the pressed chip (a scroll\n"
    + "     position, on the same phase as `Tabs`' framing) and reads the mark again after it scrolls. */\n"
    + "  useLayoutEffect(() => {\n"
    + "    for (const rail of Array.from(document.querySelectorAll<HTMLElement>(\"[data-strip-autoscroll]\"))) markEdges(rail);\n"
    + "  });\n\n"
    + "  useEffect(() => {\n", "layout");
  return s;
});
