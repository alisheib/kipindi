/** S12 F25b: the source and its quoted time break without a line-opening dot. */
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DotSeq } from "../src/components/ui/dot-seq.tsx";

const source = readFileSync("src/components/updown/updown-card.tsx", "utf8");
const footer = source.slice(source.indexOf('<div className="ud-foot'), source.indexOf("</article>"));
const sound = (text: string) =>
  text.includes('import { DotSeq } from "@/components/ui/dot-seq";') &&
  /<DotSeq\s+text=\{quoteLabel \? `\$\{sourceLabel\} · \$\{quoteLabel\}` : sourceLabel\}/.test(text) &&
  /renderPart=\{\(part\) => part === quoteLabel/.test(text) &&
  /\? <span className="whitespace-nowrap">\{t\.market\.udQuoted\}/.test(text) &&
  /<span className="font-mono tabular-nums">\{quoted\}<\/span>/.test(text) &&
  !/<span className="whitespace-nowrap">\{"· "\}/.test(text);
let pass = 0, fail = 0;
const ok = (name: string, yes: boolean) => {
  console.log(`${yes ? "PASS" : "FAIL"} ${name}`);
  yes ? pass++ : fail++;
};
ok("0 · the source footer was located", footer.length > 200);
ok("1 · the source and full second-precision stamp use the kit sequence; the time stays mono", sound(source));
const rendered = renderToStaticMarkup(h(DotSeq, { text: "Soko la metali · imenukuliwa 16:03:00 EAT" }));
ok("2 · the kit puts the dot inside the second item, where a wrap clips it", rendered.includes('class="kp-seq__item"> <span class="kp-seq__dot"') && rendered.includes("16:03:00 EAT"));
ok("3 · PLANT: a leading-dot span in the footer is rejected", !sound(source.replace("<DotSeq", '<span className="whitespace-nowrap">{"· "}</span><DotSeq')));
ok("4 · PLANT: dropping the separator loses the break and is rejected", !sound(source.replace("${sourceLabel} · ${quoteLabel}", "${sourceLabel} ${quoteLabel}")));
ok("5 · PLANT: splitting the source time within itself is rejected", !sound(source.replace('<span className="whitespace-nowrap">{t.market.udQuoted}', '<span>{t.market.udQuoted}')));
console.log(`updown-source-line: ${pass} passed, ${fail} failed`);
if (pass < 6 || fail) process.exit(1);
