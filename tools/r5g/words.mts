// Prints the dictionary value of each key path given on the command line, in sw / en / zh.
import { dict } from "file:///F:/kipindi-r5g/src/lib/i18n-dict.ts";
const at = (o: unknown, p: string): unknown => p.split(".").reduce<unknown>((v, k) => (v != null && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), o);
for (const p of process.argv.slice(2)) {
  console.log(p.padEnd(34), (["sw", "en", "zh"] as const).map((l) => JSON.stringify(at(dict[l], p) ?? null)).join("  |  "));
}
