// Print the EN/SW/ZH values of the named dictionary keys (first match per language block).
const s = require("fs").readFileSync("F:/kipindi-r5i/src/lib/i18n-dict.ts", "utf8");
for (const k of process.argv.slice(2)) {
  const re = new RegExp("\\b" + k + ":\\s*\"((?:[^\"\\\\]|\\\\.)*)\"", "g");
  const m = [...s.matchAll(re)].map((x) => x[1]);
  console.log(k.padEnd(22), JSON.stringify(m));
}
