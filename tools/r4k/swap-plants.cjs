const fs = require("node:fs");
const p = "F:/kipindi-r4k/scripts/visual-pass-r4k.test.mts";
let t = fs.readFileSync(p, "utf8");
const eol = t.includes("\r\n") ? "\r\n" : "\n";
const a = t.indexOf("  type Plant = { name: string; file: string; from: string; to: string; expect: string };");
const b = t.indexOf("  const sha = (b: Buffer)");
if (a < 0 || b < 0 || b < a) throw new Error("markers not found");
const repl = [
  "  // The mutations are DATA in scripts/anchors/visual-pass-r4k.anchors.mjs, so test:red-anchors audits every anchor",
  "  // (exactly once, in its file) without running this harness.",
  "  const PLANTS = MUTATIONS as Array<{ name: string; file: string; from: string; to: string; expect: string }>;",
  "",
].join(eol) + eol;
t = t.slice(0, a) + repl + t.slice(b);
const imp = `import twConfigModule from "../tailwind.config.ts";`;
if (!t.includes(imp)) throw new Error("import anchor not found");
t = t.replace(imp, `${imp}${eol}import { MUTATIONS } from "./anchors/visual-pass-r4k.anchors.mjs";`);
fs.writeFileSync(p, t);
console.log("swapped");
