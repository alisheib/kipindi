const { once, edit } = require("./lib.cjs");
edit("src/components/layout/app-shell.tsx", (s) => once(s,
  "// whose code never arrives is left out rather than taking the page down (`nothingIfLost`, there). ⛔ NEVER A REACT\n"
  + "// LAZY HERE: this is a SERVER\n"
  + "// component, and its own `React.lazy` bindings kept nothing out of the first load (production and a local build,\n"
  + "// 2026-10-03): every module they named rode in the scripts every page loads first, for every visitor.\n",
  "// whose code never arrives is left out rather than taking the page down (`nothingIfLost`, there). ⛔ NEVER A REACT\n"
  + "// LAZY HERE: this is a SERVER component, and its own `React.lazy` bindings kept nothing out of the first load\n"
  + "// (production and a local build, 2026-10-03): every module they named rode in the scripts every page loads first,\n"
  + "// for every visitor.\n", "as.reflow2"));
