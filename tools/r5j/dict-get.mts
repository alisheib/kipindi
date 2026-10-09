const { dict } = await import("file:///F:/kipindi-r5j/src/lib/i18n-dict.ts");
const at = (o: any, p: string) => p.split(".").reduce((v, k) => (v == null ? v : v[k]), o);
for (const p of process.argv.slice(2)) console.log(p.padEnd(34), ["sw", "en", "zh"].map((l) => JSON.stringify(at(dict[l], p))).join("  |  "));
