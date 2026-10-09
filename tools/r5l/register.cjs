// R5-L · install the suite (CRLF) and register it beside the other visual-pass suites.
const { once, edit, rd } = require("./lib.cjs");
require("child_process").execSync(`node "${__dirname}/install.cjs" scripts/visual-pass-r5l.test.mts`, { stdio: "inherit" });
if (!rd("package.json").includes('"test:visual-pass-r5l"')) edit("package.json", (s) => once(s,
  '    "test:visual-pass-r5h": "tsx scripts/visual-pass-r5h.test.mts",\n',
  '    "test:visual-pass-r5h": "tsx scripts/visual-pass-r5h.test.mts",\n    "test:visual-pass-r5l": "tsx scripts/visual-pass-r5l.test.mts",\n', "pkg"));
