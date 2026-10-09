// Build dry.mts from db-scratch.mts's OWN killOwnOrphans (no copy to drift): the kill is replaced by a print, so
// running it lists what the sweep would select from the processes alive now, and kills nothing.
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync(process.argv[2], "utf8").replace(/\r\n/g, "\n");
const start = src.indexOf("function killOwnOrphans(");
const end = src.indexOf("\n}\n", start) + 3;
if (start < 0 || end < 3) throw new Error("killOwnOrphans not found");
let fn = src.slice(start, end);
const kills = fn.match(/try \{ process\.kill\(Number\(pid\), "SIGKILL"\); \} catch \{ \/\* already gone \*\/ \}/g) ?? [];
if (kills.length !== 2) throw new Error(`expected 2 kill sites, found ${kills.length}`);
fn = fn.replaceAll(kills[0], `console.log("  would kill", pid);`);
writeFileSync(process.argv[3],
  `import { execFileSync } from "node:child_process";\nimport { resolve } from "node:path";\n` +
  `const DATA_DIR = resolve(process.cwd(), ".pgscratch");\n${fn}\n` +
  `const dead = JSON.parse(process.argv[2] ?? "[]");\n` +
  `console.log(\`cwd \${process.cwd()} · dead parents \${JSON.stringify(dead)} → \${killOwnOrphans(dead)} selected\`);\n`);
console.log(`dry.mts written (${fn.split("\n").length} lines of the function)`);
