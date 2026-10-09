// A fake red harness that hands the tree back changed: it appends one line to README.md and exits 0.
import { appendFileSync } from "node:fs";
appendFileSync("README.md", "\n<!-- red-all residue test -->\n");
console.log("1/1 caught");
