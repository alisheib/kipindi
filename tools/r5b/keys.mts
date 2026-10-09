import { dict } from "file:///F:/kipindi-r5b/src/lib/i18n-dict.ts";
const keys = process.argv.slice(2);
for (const k of keys) {
  const [sec, name] = k.split(".");
  const row = (["sw", "en", "zh"] as const).map((l) => `${l}=${JSON.stringify((dict as any)[l]?.[sec]?.[name])}`).join("  ");
  console.log(`${k}: ${row}`);
}
