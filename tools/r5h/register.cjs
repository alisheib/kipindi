const { rd, wr, once, edit } = require("./lib.cjs");
wr("scripts/visual-pass-r5h.test.mts", rd("scripts/visual-pass-r5h.test.mts"));
console.log("suite → CRLF");
if (!rd("package.json").includes('"test:visual-pass-r5h"')) edit("package.json", (s) => once(s,
  '    "test:visual-pass-r5d": "tsx scripts/visual-pass-r5d.test.mts",\n',
  '    "test:visual-pass-r5d": "tsx scripts/visual-pass-r5d.test.mts",\n    "test:visual-pass-r5h": "tsx scripts/visual-pass-r5h.test.mts",\n', "pkg"));
