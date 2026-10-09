import { h, markup, textOf, a11yTextOf, show } from "./h.ts";
import { dict } from "F:/kipindi-vis/src/lib/i18n-dict.ts";
import { keepLastWords, keepSentences, keepYears, keepFigures } from "F:/kipindi-vis/src/components/ui/keep-words.tsx";
import { hangCjkMarks } from "F:/kipindi-vis/src/lib/cjk-marks.tsx";
import { emptyStateBody } from "F:/kipindi-vis/src/components/ui/empty-state-text.ts";
import { moneySentence } from "F:/kipindi-vis/src/lib/fill-nodes.tsx";

const brief = (html: string) => html.replace(/^<div>|<\/div>$/g, "")
  .replace(/<span class="whitespace-nowrap">/g, "[").replace(/<span class="inline-block max-w-full">/g, "{")
  .replace(/<span class="kp-cjk-mark( kp-cjk-mark--q)?">/g, "⟨").replace(/<span aria-hidden="true" class="kp-cjk-gap[^"]*"> <\/span>/g, "␣")
  .replace(/<span class="amount">/g, "$<").replace(/<\/span>/g, "]");
const L = ["en", "sw", "zh"] as const;
const D = dict as unknown as Record<string, Record<string, Record<string, unknown>>>;

console.log("== keepSentences(nav.cardSpacingHint)");
for (const l of L) console.log(l, brief(markup(keepSentences(D[l].nav.cardSpacingHint as string))));
console.log("== keepLastWords sites");
for (const l of L) for (const [g, k] of [["kycGate", "frozenBody"], ["wallet", "mobileMoney"], ["wallet", "mobileMoneyOnly"], ["common", "fairnessIntro"]] as const) {
  const v = D[l][g]?.[k];
  if (typeof v === "string") console.log(l, `${g}.${k}`, brief(markup(keepLastWords(v))));
}
console.log("== hangCjkMarks sites (zh)");
for (const [g, k] of [["common", "notFoundHint"], ["market", "whichWay"], ["market", "chooseSideHelp"]] as const) {
  const v = D.zh[g]?.[k];
  if (typeof v === "string") { const m = markup(hangCjkMarks(v)); console.log(`${g}.${k}`, show(v), "→", brief(m), "| copy text:", show(textOf(m))); }
  else console.log(`${g}.${k}`, "(not a string here:", typeof v, ")");
}
// Every zh string in the dict: marks followed by something the code treats specially / unlisted closers
const CLOSERS_LISTED = "”’」』）》】〉〕)]}";
const odd: string[] = [];
const walk = (o: unknown, p: string) => {
  if (typeof o === "string") {
    const cs = Array.from(o);
    cs.forEach((c, i) => {
      if ("。，、；：！？".includes(c)) {
        const n = cs[i + 1];
        if (n !== undefined && /[\p{Pe}\p{Pf}"'»›〗〙〛｝］｣]/u.test(n) && !CLOSERS_LISTED.includes(n)) odd.push(`${p}: mark+${show(n)} in ${show(o.slice(0, 60))}`);
        if (n !== undefined && /[\u2014\u2026\u2015]/.test(n)) odd.push(`${p}: mark+${show(n)} (dash/ellipsis) in ${show(o.slice(0, 60))}`);
      }
    });
  } else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, p ? `${p}.${k}` : k);
};
walk(D.zh, "zh");
console.log("== zh strings with a mark followed by an unlisted closer / dash / ellipsis:", odd.length);
for (const x of odd.slice(0, 30)) console.log("  ", x);

console.log("== emptyStateBody alters text?");
let altered = 0; const ex: string[] = [];
const walk2 = (o: unknown, p: string) => {
  if (typeof o === "string") { const b = emptyStateBody(o); if (b !== o) { altered++; if (ex.length < 8) ex.push(`${p}: ${show(o.slice(0, 70))} → ${show(b.slice(0, 80))}`); } }
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk2(v, p ? `${p}.${k}` : k);
};
for (const l of L) walk2(D[l], l);
console.log("dictionary strings emptyStateBody would change:", altered); for (const x of ex) console.log("  ", x);
void h; void a11yTextOf; void keepYears; void keepFigures; void moneySentence;
