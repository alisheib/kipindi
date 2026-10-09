// Build dry2.mts from db-scratch.mts's OWN killOwnOrphans: the PowerShell kill (`$q.Kill(); `) is removed so the run
// only prints what it would take, the POSIX kill is replaced by a print, and the catch rethrows so a PowerShell parse
// error is SEEN instead of read as "nothing to sweep".
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync(process.argv[2], "utf8").replace(/\r\n/g, "\n");
const start = src.indexOf("function killOwnOrphans(");
const end = src.indexOf("\n}\n", start) + 3;
let fn = src.slice(start, end);
const n0 = fn.length;
fn = fn.replace("try { $q.Kill(); [int]$x.ProcessId } catch {}", "[int]$x.ProcessId");
if (fn.length === n0) throw new Error("the PowerShell kill was not found");
fn = fn.replace(/try \{ process\.kill\(Number\(pid\), "SIGKILL"\); \} catch \{ \/\* already gone \*\/ \}/, `console.log("  would kill", pid);`);
fn = fn.replace("return 0; // best effort", "throw new Error('the sweep FAILED: ' + String(arguments[0])); // dry run: show it");
fn = fn.replace("} catch {\n    throw", "} catch (err) {\n    console.error(String((err as any)?.stderr ?? err)); throw");
writeFileSync(process.argv[3],
  `import { execFileSync } from "node:child_process";\nimport { resolve } from "node:path";\n` +
  `const DATA_DIR = resolve(process.cwd(), ".pgscratch");\n${fn}\n` +
  `const dead = JSON.parse(process.argv[2] ?? "[]");\n` +
  `console.log(\`cwd \${process.cwd()} · dead parents \${JSON.stringify(dead)} → \${killOwnOrphans(dead)} would be taken\`);\n`);
console.log("dry2.mts written");
