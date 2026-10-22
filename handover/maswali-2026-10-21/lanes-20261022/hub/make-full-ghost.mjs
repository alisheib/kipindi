// The final drawing module: the full draft's drawing (the frame) + the tree's pick (its wordless restructure).
import { readFileSync, writeFileSync } from "node:fs";
const [draft, tree, out] = process.argv.slice(2);
const MARK = "/** A page with a parameter below `base`";
const d = readFileSync(draft, "utf8").replace(/\r\n/g, "\n");
const t = readFileSync(tree, "utf8").replace(/\r\n/g, "\n");
const a = d.indexOf(MARK), b = t.indexOf(MARK);
if (a < 0 || b < 0) throw new Error("marker missing");
const s = d.slice(0, a) + t.slice(b);
if (!s.includes("const how = <MillioneaHowGhost />;") || !s.includes('data-ghost-page="hub"') || !s.includes("hubAside(true, true)")) throw new Error("assembly incomplete");
writeFileSync(out, s);
console.log(`wrote ${out}`);
