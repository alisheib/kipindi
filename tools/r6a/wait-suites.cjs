// R6-A · wait (at most ~9 minutes) until the suite run has logged `target` more suites or finished; print progress and reds.
const fs = require("node:fs");
const path = require("node:path");
const S = path.dirname(__filename);
const TSV = path.join(S, "suites-all.tsv"), LOG = path.join(S, "suites-all.log");
const rows = () => fs.readFileSync(TSV, "utf8").split("\n").filter((l) => l && !l.startsWith("#"));
const done = () => /^done$|runner exit/m.test(fs.readFileSync(LOG, "utf8"));
const start = rows().length;
const want = start + Number(process.argv[2] ?? 40);
const t0 = Date.now();
const tick = () => {
  const n = rows().length;
  if (n >= want || done() || Date.now() - t0 > 540_000) {
    const reds = rows().filter((l) => l.split("\t")[1] !== "0");
    console.log(`logged ${n} (was ${start})${done() ? " · RUN FINISHED" : ""} · ${Math.round((Date.now() - t0) / 1000)}s waited`);
    console.log(reds.length ? reds.map((l) => l.split("\t").slice(0, 3).join("\t")).join("\n") : "no reds");
    return;
  }
  setTimeout(tick, 5_000);
};
tick();
