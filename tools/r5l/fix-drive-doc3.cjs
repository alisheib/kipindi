// R5-L · reflow the demo-door note to the measure.
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => once(s,
  "/** The dev door's session cookie (qa-classic-shell-parity's `signIn`): a local server only (R5-K's rule) — never a preview\n *  and never production. */",
  "/** The dev door's session cookie (qa-classic-shell-parity's `signIn`): a local server only (R5-K's rule), never a\n *  preview and never production. */",
  "demo doc reflow"));
