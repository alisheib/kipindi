// words.mts — prints dictionary words the slip lane's drives press or read (scratch helper, read only).
import { dict } from "file:///C:/50pick-ssd/kipindi-mln-dslp/src/lib/i18n-dict.ts";
const keys = process.argv.slice(2);
for (const l of ["sw", "en", "zh"] as const) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const [ns, key] = k.split(".");
    out[k] = (dict[l] as unknown as Record<string, Record<string, unknown>>)[ns]?.[key];
  }
  console.log(l, JSON.stringify(out));
}
