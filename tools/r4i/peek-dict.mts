const { dict } = await import("file:///F:/kipindi-r4i/src/lib/i18n-dict.ts");
const keys = process.argv.slice(2);
for (const l of ["sw", "en", "zh"] as const) {
  const t = (dict as Record<string, unknown>)[l];
  for (const k of keys) {
    let v: unknown = t;
    for (const p of k.split(".")) v = (v as Record<string, unknown>)?.[p];
    console.log(`${l} ${k}: ${JSON.stringify(v)}`);
  }
}
