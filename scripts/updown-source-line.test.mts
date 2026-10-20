/** S12 F25b; U43 2026-10-19: one compact source + EAT minute, exact ISO preserved. */
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DotSeq } from "../src/components/ui/dot-seq.tsx";

const source = readFileSync("src/components/updown/updown-card.tsx", "utf8");
const footerOf = (text: string) => text.slice(text.indexOf('<div className="ud-foot'), text.indexOf("</article>"));
const footer = footerOf(source);
const sound = (text: string) =>
  footerOf(text).length > 200 &&
  text.includes('import { DotSeq } from "@/components/ui/dot-seq";') &&
  text.includes('text={quoted ? `${sourceLabel} · ${quoted}` : sourceLabel}') &&
  text.includes('renderPart={(part) => part === quoted') &&
  text.includes('<time className="whitespace-nowrap font-mono tabular-nums" dateTime={displayedQuotedAt ?? undefined}>{quoted}</time>') &&
  text.includes('const clock = displayedQuotedAt ? fmtEATClock(Date.parse(displayedQuotedAt)) : null;') &&
  !footerOf(text).includes("t.market.udQuoted") &&
  !footerOf(text).includes('<span className="whitespace-nowrap">{"· "}');
let pass = 0, fail = 0;
const ok = (name: string, yes: boolean) => {
  console.log(`${yes ? "PASS" : "FAIL"} ${name}`);
  yes ? pass++ : fail++;
};
ok("0 · the source footer was located", footer.length > 200);
ok("1 · source and minute stamp use one kit sequence; exact ISO remains in time", sound(source));
const rendered = renderToStaticMarkup(h(DotSeq, { text: "Soko la madini · 16:03 EAT" }));
ok("2 · the kit puts the dot inside the second item, where a wrap clips it", rendered.includes('class="kp-seq__item"> <span class="kp-seq__dot"') && rendered.includes("16:03 EAT"));
ok("3 · PLANT: a leading-dot span in the footer is rejected", !sound(source.replace("<DotSeq", '<span className="whitespace-nowrap">{"· "}</span><DotSeq')));
ok("4 · PLANT: dropping the separator loses the break and is rejected", !sound(source.replace("${sourceLabel} · ${quoted}", "${sourceLabel} ${quoted}")));
ok("5 · PLANT: dropping the exact time is rejected", !sound(source.replace('dateTime={displayedQuotedAt ?? undefined}', 'dateTime={undefined}')));
ok("6 · PLANT: splitting the EAT time is rejected", !sound(source.replace('className="whitespace-nowrap font-mono tabular-nums"', 'className="font-mono tabular-nums"')));
console.log(`updown-source-line: ${pass} passed, ${fail} failed`);
if (pass < 7 || fail) process.exit(1);
