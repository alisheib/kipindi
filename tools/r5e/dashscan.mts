// Every dictionary string: what the round-3 empty-state rules glue (NBSP / WJ positions), and the dash shapes present.
import { dict } from "file:///F:/kipindi-r5e/src/lib/i18n-dict.ts";
const tip = await import("./orig/empty-state-text.ts");
const kr = await import("./orig/keep-run.tsx");
const D = dict as unknown as Record<string, unknown>;
const all: Array<[string, string]> = [];
const walk = (o: unknown, p: string) => {
  if (typeof o === "string") all.push([p, o]);
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, p ? `${p}.${k}` : k);
};
walk(D, "");
const IDEO = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
let changed = 0;
const shapes: Record<string, string[]> = {};
const note = (k: string, s: string) => { (shapes[k] ??= []).length < 6 && shapes[k].push(s); };
for (const [p, s] of all) {
  const b = tip.emptyStateBody(s);
  if (b !== s) changed++;
  for (const m of s.matchAll(/(.)(\s*)([\u2014\u2013]+)(\s?)/gu)) {
    const before = m[1], sp = m[2], dash = m[3], after = m[4];
    const kind = `${IDEO.test(before) ? "CJK" : /\s/.test(before) ? "SPACE" : "LATIN"}${sp ? "+sp" : ""}${dash}${after ? "+sp" : "(nosp)"}`;
    note(kind, `${p}: ${JSON.stringify(s.slice(Math.max(0, (m.index ?? 0) - 12), (m.index ?? 0) + 14))}`);
  }
}
console.log("dictionary strings:", all.length, "· changed by emptyStateBody:", changed);
for (const [k, v] of Object.entries(shapes)) { console.log(`== ${k} (${v.length}${v.length === 6 ? "+" : ""})`); for (const x of v) console.log("   " + x); }
// keep-run's rules vs a CJK char before a spaced dash
const cjkSpaced = all.filter(([, s]) => /[\u3400-\u9fff]\s+[\u2014\u2013]/.test(s));
console.log("CJK + space + dash strings:", cjkSpaced.length, cjkSpaced.slice(0, 5).map(([p]) => p).join(", "));
void kr;
