import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5k/package.json");
const { dict } = req("F:/kipindi-r5k/src/lib/i18n-dict.ts");
const keys = process.argv.slice(2);
for (const k of keys) {
  const [s, n] = k.split(".");
  for (const l of ["sw", "en", "zh"]) console.log(`${k} ${l}: ${JSON.stringify(dict[l][s]?.[n])}`);
}
