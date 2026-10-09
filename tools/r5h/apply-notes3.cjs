const { once, edit } = require("./lib.cjs");
edit("scripts/journey-shell.test.mts", (s) => once(s,
  " *      imports none of the parts' own\n *      modules and no React `lazy`, and\n",
  " *      imports none of the parts' own modules and no React `lazy`, and\n", "js reflow"));
