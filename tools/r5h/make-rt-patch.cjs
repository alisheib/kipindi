// R5-H · the route entrance's phases, as a PROPOSED patch for the integrator (not applied to the worktree): G-3's sibling.
const fs = require("fs");
const cp = require("child_process");
const S = __dirname + "/rt";
const p = `${S}/b/src/components/ui/route-transition.tsx`;
let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const once = (from, to, label) => { if (s.split(from).length !== 2) throw new Error(label); s = s.replace(from, () => to); };
once('import { useRef, useEffect, useState } from "react";\n', 'import { useRef, useEffect, useLayoutEffect, useState } from "react";\n', "import");
once("  useEffect(() => {\n    if (pathname !== key) {\n",
  "  // ⭐ BEFORE THE NEW ROUTE'S FIRST PAINT (proposed in round 5's follow-up, R5-H · G-3's sibling sweep): a passive effect\n"
  + "  // runs after a transition's paint, so the new route was painted once at full opacity (the wrapper's entrance long\n"
  + "  // finished) before the key changed and the `[key]` effect below made it transparent to fade it in — a blink on every\n"
  + "  // journey tab tap and every move in a browser without View Transitions. In the layout phase the key changes, and the\n"
  + "  // entrance restarts, before that paint; a View Transition starts from the same DOM as before.\n"
  + "  useLayoutEffect(() => {\n    if (pathname !== key) {\n", "pathname effect");
once("  useEffect(() => {\n    // Scroll to top on PUSHED route changes only,",
  "  // ⭐ NOT AT MOUNT (proposed, R5-H): the server's HTML played the entrance at its first paint; replaying it at hydration\n"
  + "  // made the page the reader was already reading go transparent and fade in again, and scrolled it to the top.\n"
  + "  const mountedRef = useRef(false);\n"
  + "  useLayoutEffect(() => {\n"
  + "    if (!mountedRef.current) { mountedRef.current = true; return; }\n"
  + "    // Scroll to top on PUSHED route changes only,", "key effect");
fs.writeFileSync(p, s);
let diff = "";
try { cp.execSync(`git diff --no-index -- a/src/components/ui/route-transition.tsx b/src/components/ui/route-transition.tsx`, { cwd: S, encoding: "utf8" }); }
catch (e) { diff = e.stdout; }
const head = `# R5-H · PROPOSED, NOT APPLIED — the route entrance's phases (G-3's sibling sweep; test:visual-pass-r5h 3.5 names it).
#
# WHAT: src/components/ui/route-transition.tsx re-raises the route entrance (\`.route-enter\`, m-settle-in: opacity 0 → 1
# over --t-move) in PASSIVE effects: after a route change the new route (or its loading ghost) is painted at full opacity,
# then the [pathname] effect sets the key, then the [key] effect removes and re-adds the class — the page goes transparent
# and fades in: a blink, on every journey tab tap (the journey never takes the View Transition path) and on every move in a
# browser without View Transitions. The [key] effect also runs at MOUNT: at hydration it replays the entrance over the page
# the server's HTML already showed (and scrolls it to the top), seconds after the first paint on a slow network.
# WHY NOT APPLIED HERE: it changes every navigation in both shells (classic Chromium's View Transition starts one frame
# earlier; Safari/Firefox lose the blink too) and can only be proved by a browser's frames. A lock turn must:
#   1. on the edge drive's Slow 3G profile, tap each journey tab and sample the wrapper's computed opacity on every
#      requestAnimationFrame from the tap: today ≥ 1 frame at 1 after the new route paints, then ~0, then rising; with the
#      patch the first frame of the new route is already the entrance's start;
#   2. open any page cold and sample the same through hydration: today it returns to ~0 at hydration; with the patch never;
#   3. run test:visual-pass-r4j §2, test:journey-shell, qa:classic-shell-parity and qa:nav-pending.
`;
fs.writeFileSync(`${__dirname}/route-transition.r5h.patch`, head + diff);
console.log(diff);
