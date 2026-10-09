// Print the sw / en / zh values of dictionary keys: npx tsx dict-get.mts market.predictors common.pool ...
// A bare namespace ("market.") prints every key of it whose value matches the optional /regex/ after it.
const { dict } = await import("file:///F:/kipindi-r5a/src/lib/i18n-dict.ts");
const at = (t: any, p: string) => p.split(".").reduce((v, k) => (v == null ? v : v[k]), t);
const args = process.argv.slice(2);
for (const p of args) {
  if (p.endsWith(".") || p.includes("/")) {
    const [ns, re] = p.split("/");
    const nsName = ns.replace(/\.$/, "");
    const rx = re ? new RegExp(re, "iu") : null;
    const obj = (dict as any).sw[nsName] ?? {};
    for (const k of Object.keys(obj)) {
      const vals = ["sw", "en", "zh"].map((l) => at((dict as any)[l], `${nsName}.${k}`));
      if (rx && !vals.some((v) => typeof v === "string" && rx.test(v))) continue;
      console.log(`${nsName}.${k}`.padEnd(40), vals.map((v) => JSON.stringify(v)).join(" | "));
    }
    continue;
  }
  const vals = ["sw", "en", "zh"].map((l) => at((dict as any)[l], p));
  console.log(p.padEnd(40), vals.map((v) => JSON.stringify(v)).join(" | "));
}
