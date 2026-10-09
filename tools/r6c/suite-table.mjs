// Final exit code per suite: the last run that ran it wins (run3 -> run4 -> run5 -> run6...).
import fs from "node:fs";
const S = process.argv[2];
const runs = process.argv.slice(3);
const last = new Map();
const history = new Map();
for (const r of runs) {
  const p = `${S}/r6c/${r}/summary.txt`;
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^(OK|RED)\s+exit=(\S+)\s+(\S+)\s+\(([\d.]+)s\)\s+::\s*(.*)$/.exec(l);
    if (!m) continue;
    last.set(m[3], { code: m[2], run: r, tail: m[5] });
    history.set(m[3], [...(history.get(m[3]) ?? []), `${r}:${m[2]}`]);
  }
}
const zero = [...last].filter(([, v]) => v.code === "0").map(([k]) => k).sort();
const non = [...last].filter(([, v]) => v.code !== "0").sort();
console.log(`suites run: ${last.size} · final exit 0: ${zero.length} · final non-zero: ${non.length}`);
for (const [k, v] of non) console.log(`NONZERO ${k} exit=${v.code} (${v.run}) :: ${v.tail.slice(0, 160)}`);
const changed = [...history].filter(([, h]) => h.some((x) => !x.endsWith(":0"))).map(([k, h]) => `${k} [${h.join(" → ")}]`);
console.log(`went red then green after a fix: ${changed.filter((c) => /:0\]$/.test(c)).join(" · ")}`);
console.log(`EXIT 0 (${zero.length}): ${zero.join(" ")}`);
