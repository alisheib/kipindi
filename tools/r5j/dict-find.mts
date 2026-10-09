const { dict } = await import("file:///F:/kipindi-r5j/src/lib/i18n-dict.ts");
const re = new RegExp(process.argv[2]);
const walk = (o: any, p: string[], out: string[]) => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === "object") walk(v, [...p, k], out); else if (typeof v === "string" && re.test(v)) out.push([...p, k].join(".")); } return out; };
const at = (o: any, p: string) => p.split(".").reduce((v, k) => (v == null ? v : v[k]), o);
for (const p of walk(dict.en, [], [])) console.log(p.padEnd(40), ["sw", "en", "zh"].map((l) => JSON.stringify(at(dict[l], p))).join("  |  "));
