const { once, edit } = require("./lib.cjs");
edit("src/components/layout/app-shell.tsx", (s) => once(s,
  "// adds none): keep every part the one child of its own — save the journey's header and tabs, which stand in none, so\n"
  + "// that the page's first HTML draws them (R4-J, 2026-10-09; the note at their mount). A part whose code never arrives is\n",
  "// adds none): keep every part the one child of its own — save the journey's header and tabs, which stand in none, so\n"
  + "// that the page's first HTML draws them (R4-J, 2026-10-09; the note at their mount), and the journey flag, which stands\n"
  + "// bare beside them so that it mounts in the commit that first paints them (R5-H, G-3; the note at its mount). A part\n"
  + "// whose code never arrives is\n", "as.head"));
