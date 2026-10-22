// Scratch (NOT repo code): total spacing-scale USE count over a tree's src/*.ts(x), via one `git cat-file --batch`.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const [repo, tree, prefixFile] = process.argv.slice(2);
const gitBuf = (args, input) => execFileSync("git", ["-C", repo, ...args], { input, maxBuffer: 1024 * 1024 * 1024, stdio: ["pipe", "pipe", "ignore"] });
const PREFIX = /const PREFIX = "([^"]+)";/.exec(readFileSync(prefixFile, "utf8"))[1];
const USE = new RegExp(`(?:^|[\\s"'\`:])(?:-)?${PREFIX}-(2\\.5|3\\.5|14|16|20|24|28|32)\\b`, "g");
const decomment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const entries = gitBuf(["ls-tree", "-r", tree, "--", "src"]).toString("utf8").split("\n").filter(Boolean)
  .map((l) => { const [meta, path] = l.split("\t"); return { oid: meta.split(" ")[2], path }; })
  .filter((e) => /\.tsx?$/.test(e.path));
const out = gitBuf(["cat-file", "--batch"], entries.map((e) => e.oid).join("\n") + "\n");
let pos = 0, total = 0, files = 0;
const per = [];
for (const e of entries) {
  const nl = out.indexOf(10, pos);
  const header = out.subarray(pos, nl).toString("utf8");
  const size = Number(header.split(" ")[2]);
  const body = out.subarray(nl + 1, nl + 1 + size).toString("utf8");
  pos = nl + 1 + size + 1;
  const n = [...decomment(body).matchAll(USE)].length;
  if (n) { total += n; files++; per.push([e.path, n]); }
}
console.log(`${tree}: ${total} in ${files} files`);
if (process.argv[5] === "--list") for (const [p, n] of per) console.log(`${n}\t${p}`);
