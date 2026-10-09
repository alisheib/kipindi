// r4e 10.2: the privacy page's version date is read from the page, not pinned (main moved it 2026-10-07 → 2026-10-09
// with Privacy v2026-10-09, S14). The check's point is unchanged: keepYears keeps "Act 2022" whole and leaves the
// version date and every word exactly as written.
const fs = require("fs");
const p = "F:/kipindi-vis/scripts/visual-pass-r4e.test.mts";
let s = fs.readFileSync(p, "utf8");
const a = `  const out = html(h(DotSeq, { text: meta("sw"), mono: true, renderPart: keepYears }));\r\n`;
const b = `    out.includes(\`Protection <span class="whitespace-nowrap">Act 2022</span> na kanuni\`) && out.includes("Toleo 2026-10-07</span>") && out.replace(/<[^>]+>/g, "") === meta("sw"), out);\r\n`;
if (s.split(a).length !== 2 || s.split(b).length !== 2) throw new Error("anchors");
s = s.replace(a, a +
  `  // The version date is read from the page, not pinned here: it moves with every policy version (2026-10-07 →\r\n` +
  `  // 2026-10-09, Privacy v2026-10-09 on main). What 10.2 holds is that keepYears leaves it whole and unchanged.\r\n` +
  `  const version = /Toleo (\\d{4}-\\d{2}-\\d{2})/.exec(meta("sw"))?.[1] ?? "";\r\n`);
s = s.replace(b,
  `    out.includes(\`Protection <span class="whitespace-nowrap">Act 2022</span> na kanuni\`) && version !== "" && out.includes(\`Toleo \${version}</span>\`) && out.replace(/<[^>]+>/g, "") === meta("sw"), out);\r\n`);
fs.writeFileSync(p, s);
console.log("ok");
