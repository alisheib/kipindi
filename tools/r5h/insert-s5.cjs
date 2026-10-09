const fs = require("fs");
const { once, edit } = require("./lib.cjs");
let block = fs.readFileSync(__dirname + "/suite-s5.txt", "utf8").replace(/\r\n/g, "\n");
const bad = "      && rdGhost.indexOf('<div className=\"h-56 rounded-xl') > 0 && rdGhost.indexOf('<div className=\"h-56 rounded-xl') < rdGhost.indexOf('<div className=\"h-40 rounded-xl')\n"
  + "      && rdPage.indexOf(\"{/* Pool — AFTER the stake panel\") === -1 ? false : true,\n";
if (!block.includes(bad)) throw new Error("5.9 text");
block = block.replace(bad,
  "      && rdPage.indexOf(\"<RoundActionPanel\") > 0 && rdPage.indexOf(\"<RoundActionPanel\") < rdPage.indexOf(\"<section aria-label={t.market.udPool}\")\n"
  + "      && rdGhost.indexOf('<div className=\"h-56 rounded-xl') > 0 && rdGhost.indexOf('<div className=\"h-56 rounded-xl') < rdGhost.indexOf('<div className=\"h-40 rounded-xl'),\n");
edit("scripts/visual-pass-r5h.test.mts", (s) => once(s, "\nconsole.log(`\\nvisual-pass-r5h: ${pass} passed, ${fails.length} failed\\n`);\n",
  block + "\nconsole.log(`\\nvisual-pass-r5h: ${pass} passed, ${fails.length} failed\\n`);\n", "insert"));
