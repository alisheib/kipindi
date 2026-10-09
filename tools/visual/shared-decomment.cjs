// The two new suites read source through the shared scanner (test:decomment's ratchet). cwd = F:/kipindi-vis.
const fs = require("fs");
const ed = (p, f) => {
  let s = fs.readFileSync(p, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  s = f(s);
  fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
};
const cut = (s, startMarker, endMarker) => {
  const a = s.indexOf(startMarker);
  const b = s.indexOf(endMarker, a);
  if (a < 0 || b < 0) throw new Error(`markers: ${startMarker.slice(0, 40)}`);
  return [a, b + endMarker.length];
};

ed("scripts/needle-host.test.mts", (s) => {
  const [a, b] = cut(s, "const code = (s: string) => s.replace(", `.replace(/(^|[^:"'\`\\w/])\\/\\/[^\\n]*/g, "$1");\n`);
  s = s.slice(0, a) +
    "// Source is read through the shared scanner (scripts/lib/decomment.mts): every newline survives, so nothing that\n" +
    "// reads a line moves, and test:decomment's private-stripper ratchet stays where it was.\n" +
    "const code = decomment;\n" + s.slice(b);
  s = s.replace(`import { join } from "node:path";\n`, `import { join } from "node:path";\nimport { decomment } from "./lib/decomment.mts";\n`);
  if (!s.includes(`import { decomment } from "./lib/decomment.mts";`)) throw new Error("needle-host import");
  return s;
});

ed("scripts/visual-pass-r3c.test.mts", (s) => {
  const [a, b] = cut(s, "const code = (s: string) => s.replace(", `.replace(/^\\s*\\/\\/.*$/gm, "");\n`);
  s = s.slice(0, a) +
    "// Source and the stylesheet are read through the shared scanners (scripts/lib/decomment.mts) — test:decomment's\n" +
    "// private-stripper ratchet; decommentCss for CSS, whose strings and urls a JS scanner must not judge.\n" +
    "const code = decomment;\n" + s.slice(b);
  s = s.replace(`const css = code(read("src/app/globals.css"));`, `const css = decommentCss(read("src/app/globals.css"));`);
  s = s.replace(`import { readFileSync } from "node:fs";\n`, `import { readFileSync } from "node:fs";\nimport { decomment, decommentCss } from "./lib/decomment.mts";\n`);
  if (!s.includes("const css = decommentCss(") || !s.includes(`import { decomment, decommentCss }`)) throw new Error("r3c edits");
  return s;
});
console.log("ok");
