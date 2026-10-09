const { once, edit } = require("./lib.cjs");
edit("scripts/journey-shell.test.mts", (s) => once(s,
  " *      of the Suspense boundary it always had — save the journey's header and tabs, which since R4-J (2026-10-09, E36)\n"
  + " *      stand in none, so the page's first HTML draws them (12.shell.bare); AppShell imports none of the parts' own\n",
  " *      of the Suspense boundary it always had — save the journey's header and tabs, which since R4-J (2026-10-09, E36)\n"
  + " *      stand in none, so the page's first HTML draws them (12.shell.bare), and the journey flag, bare beside them since\n"
  + " *      round 5's follow-up (R5-H, G-3) so it mounts in the commit that first paints them (12.shell.flag); AppShell\n"
  + " *      imports none of the parts' own\n", "js header"));
edit("scripts/visual-pass-r5d.test.mts", (s) => once(s,
  '    "src/lib/journey/journey-on.ts": "the shell\'s mark, layout-scoped: no soft navigation re-runs the root layout; a refresh that flips the server\'s answer is the staleness its note accepts (named to the integrator)",\n',
  "    // ⚠️ Re-classified in round 5's follow-up (R5-H, G-3): the refresh that flips the server's answer is answered before its paint.\n"
  + '    "src/lib/journey/journey-on.ts": "the shell\'s mark and flag, layout-scoped: no soft navigation re-runs the root layout, and a refresh that swaps the shell raises the flag in the layout phase of the commit that draws the journey shell and announces its lowering once the commit that removes it is done — before either paint (R5-H, G-3; test:visual-pass-r5h §3)",\n', "r5d readers"));
