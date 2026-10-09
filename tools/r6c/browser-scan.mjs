import fs from "node:fs";
const S = process.argv[2];
const pkg = JSON.parse(fs.readFileSync("F:/kipindi-r6c/package.json", "utf8"));
const list = fs.readFileSync(S + "/r6c/list-all.txt", "utf8").split(/\r?\n/).filter(Boolean);
const done = new Set(fs.readFileSync(S + "/r6c/run3/summary.txt", "utf8").split(/\r?\n/).map((l) => (l.match(/\s(test:[\w:-]+|red:[\w:-]+)\s/) || [])[1]).filter(Boolean));
for (const name of list) {
  const cmd = pkg.scripts[name] || "";
  const files = [...cmd.matchAll(/([\w./-]+\.(?:mjs|mts|ts|js|cjs))/g)].map((m) => m[1]);
  let hit = [];
  for (const f of files) {
    const p = "F:/kipindi-r6c/" + f;
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, "utf8");
    if (/playwright|chromium\.launch|localhost:\d|webkit\.launch|firefox\.launch/.test(src)) hit.push(f);
  }
  if (hit.length) console.log((done.has(name) ? "DONE " : "TODO ") + name + " :: " + hit.join(", "));
}
