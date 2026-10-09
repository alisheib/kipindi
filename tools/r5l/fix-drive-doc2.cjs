// R5-L · the demo-door helper's note says the rule it now runs on.
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => once(s,
  "/** The dev door's session cookie (qa-classic-shell-parity's `signIn`): local and preview only — never production. */",
  "/** The dev door's session cookie (qa-classic-shell-parity's `signIn`): a local server only (R5-K's rule) — never a preview\n *  and never production. */",
  "demo doc"));
