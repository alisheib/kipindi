// R5-G · the suite holds G-5 in its §4, not §5: fix the three source comments that cite it; reflow one long comment line.
import { readFileSync, writeFileSync } from "node:fs";
const edit = (p, pairs) => {
  let s = readFileSync(p, "utf8");
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log(`NOT FOUND in ${p}: ${a.slice(0, 60)}`); process.exitCode = 1; continue; }
    s = s.replace(a, b);
  }
  writeFileSync(p, s);
  console.log(`edited ${p}`);
};
const R = "F:/kipindi-r5g/src/";
edit(R + "app/global-error.tsx", [["(`test:visual-pass-r5g` §5 holds the two equal)", "(`test:visual-pass-r5g` §4 holds the two equal)"]]);
edit(R + "lib/regulator-name.ts", [["copy, and `test:visual-pass-r5g` §5 holds that copy to this one.", "copy, and `test:visual-pass-r5g` §4 holds that copy to this one."]]);
edit(R + "lib/offline-document.ts", [
  [" * \"ya Kubahatisha Tanzania.\" (in Inter's widths). Each language's name is now a `.kp-gbt-name` span (`regulator-name.ts`, the pattern\r\n * `keepRegulator` reads), the line is a size container, and the name is `nowrap` only from these widths — globals.css's\r\n * own for `.kp-gbt` (the name and its full stop in Inter 13px, plus 3px; `test:visual-pass-r5g` §5 holds the two equal).",
   " * \"ya Kubahatisha Tanzania.\" (in Inter's widths). Each language's name is now a `.kp-gbt-name` span (`regulator-name.ts`,\r\n * the pattern `keepRegulator` reads), the line is a size container, and the name is `nowrap` only from these widths —\r\n * globals.css's own for `.kp-gbt` (the name and its full stop in Inter 13px, plus 3px; `test:visual-pass-r5g` §4 holds\r\n * the two equal)."],
]);
