// Dump dictionary values for given dotted keys in en/sw/zh. Usage: tsx dict.mts key1 key2 ...
import { dict } from "file:///F:/kipindi-rev/src/lib/i18n-dict.ts";
const keys = process.argv.slice(2);
function get(o: any, k: string) { for (const p of k.split(".")) o = o?.[p]; return o; }
for (const k of keys) {
  const vals = (["sw", "en", "zh"] as const).map((l) => `${l}=${JSON.stringify(get((dict as any)[l], k))}`);
  console.log(k.padEnd(36), vals.join("  "));
}
