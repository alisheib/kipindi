// H4: the empty state's body, old (no-break spaces and word joiners INSERTED) vs new (nowrap spans, nothing inserted),
// compared by their UAX #14 break opportunities (the `linebreak` package) over every dictionary string, with its
// placeholders filled the way the pages fill them. A break inside a nowrap span is no break (CSS Text 3 §5.1); a break
// at a span's edge is the parent's. Run from F:/kipindi-r5e.
import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5e/package.json");
const LineBreaker = req("linebreak");
const tip = await import("./orig/empty-state-text.ts");
const now = await import("file:///F:/kipindi-r5e/src/components/ui/empty-state-text.ts");
const { dict } = await import("file:///F:/kipindi-r5e/src/lib/i18n-dict.ts");

const breaks = (s: string): Set<number> => { const b = new Set<number>(); const br = new LineBreaker(s); let x; while ((x = br.nextBreak())) if (x.position < s.length) b.add(x.position); return b; };
/** Old: break positions of the transformed string, mapped back to the source (each U+2060 was inserted, U+00A0 replaced). */
function oldBreaks(src: string): Set<number> {
  const o: string = tip.emptyStateBody(src);
  const map: number[] = []; // o index -> src index
  let j = 0;
  for (let i = 0; i < o.length; i++) { map.push(j); if (o[i] === "\u2060" && src[j] !== "\u2060") continue; j++; }
  map.push(src.length);
  const out = new Set<number>();
  for (const p of breaks(o)) out.add(map[p]);
  return out;
}
function newBreaks(src: string, keep: readonly string[] = []): Set<number> {
  const spans = now.emptyStateRanges(src, keep) as Array<[number, number]>;
  return new Set([...breaks(src)].filter((p) => !spans.some(([a, b]) => a < p && p < b)));
}
const D = dict as Record<string, Record<string, Record<string, unknown>>>;
const YESNO: Record<string, [string, string]> = { sw: ["NDIO", "HAPANA"], en: ["YES", "NO"], zh: ["是", "否"] };
const corpus: Array<[string, string]> = [];
for (const loc of ["sw", "en", "zh"]) {
  const walk = (o: unknown, p: string) => {
    if (typeof o === "string") {
      const filled = o.replace(/\{yes\}/g, YESNO[loc][0]).replace(/\{no\}/g, YESNO[loc][1]).replace(/\{date\}/g, loc === "zh" ? "10月10日 05:05" : loc === "sw" ? "10 Okt, 05:05" : "10 Oct, 05:05");
      corpus.push([`${loc}.${p}`, filled]);
    } else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, p ? `${p}.${k}` : k);
  };
  walk(D[loc], "");
}
let differ = 0, oldOnly = 0, newOnly = 0;
const show = (s: string, p: number) => JSON.stringify(s.slice(Math.max(0, p - 14), p) + "‸" + s.slice(p, p + 14));
for (const [k, s] of corpus) {
  const a = oldBreaks(s), b = newBreaks(s);
  const lostInNew = [...a].filter((p) => !b.has(p)); // new holds what old let break
  const gainedInNew = [...b].filter((p) => !a.has(p)); // new lets break what old held
  if (lostInNew.length || gainedInNew.length) {
    differ++;
    if (lostInNew.length) oldOnly++;
    if (gainedInNew.length) newOnly++;
    if (differ <= 40) console.log(`${k}\n   new HOLDS where old broke: ${lostInNew.map((p) => show(s, p)).join(" ")}\n   new BREAKS where old held: ${gainedInNew.map((p) => show(s, p)).join(" ")}`);
  }
}
console.log(`\n${corpus.length} strings · differ ${differ} (new holds more: ${oldOnly} · new breaks more: ${newOnly})`);
// The caller's date run (breakSentence) — old: the date's spaces became no-break spaces; new: one kept run.
const be = await import("file:///F:/kipindi-r5e/src/lib/break-end.ts");
let dateDiff = 0;
for (const loc of ["sw", "en", "zh"] as const) for (const key of ["breakActive", "exclusionActive"]) {
  const tpl = (D[loc].rg as Record<string, string>)[key];
  for (const iso of ["2026-10-10T02:05:00Z", "2026-12-31T20:59:00Z", "2027-01-15T09:00:00Z"]) {
    const sent = be.breakSentence(tpl, iso, Date.parse("2026-10-09T09:00:00Z"), (D[loc].common as { monthsShort: string[] }).monthsShort, loc);
    const oldStr = sent.text.split(sent.keep[0]).join(sent.keep[0].replace(/ /g, "\u00a0"));
    const a = new Set([...breaks(tip.emptyStateBody(oldStr))].map((p) => p)); // NBSP replaces 1:1; WJ may shift — recompute via oldBreaks on the NBSP form
    const a2 = oldBreaks(oldStr), b = newBreaks(sent.text, sent.keep);
    const diff = [...a2].filter((p) => !b.has(p)).length + [...b].filter((p) => !a2.has(p)).length;
    if (diff) { dateDiff++; console.log(`date ${loc}.${key} ${iso}: ${JSON.stringify(sent.text)} old ${[...a2]} new ${[...b]}`); }
    void a;
  }
}
console.log(`break sentences with a date: differ ${dateDiff}`);
