const { once, edit } = require("./lib.cjs");
edit("src/components/layout/app-shell.tsx", (s) => once(s,
  "// bare beside them so that it mounts in the commit that first paints them (R5-H, G-3; the note at its mount). A part\n"
  + "// whose code never arrives is\n"
  + "// left out rather than taking the page down (`nothingIfLost`, there). ⛔ NEVER A REACT LAZY HERE: this is a SERVER\n",
  "// bare beside them so that it mounts in the commit that first paints them (R5-H, G-3; the note at its mount). A part\n"
  + "// whose code never arrives is left out rather than taking the page down (`nothingIfLost`, there). ⛔ NEVER A REACT\n"
  + "// LAZY HERE: this is a SERVER\n", "as.reflow"));
