const fs = require("fs");
const p = "prove-r4d.mjs";
let s = fs.readFileSync(p, "utf8");
const rep = (a, b) => { if (s.split(a).length !== 2) throw new Error("anchor: " + a); s = s.replace(a, b); };
rep('`<p className="ud-hero-detail mt-1.5 mb-0 text-body-sm text-text-muted">`', '`<p className="ud-cap-first mt-1.5 mb-0 text-body-sm text-text-muted">`');
rep('`.ud-hero-detail::first-letter { text-transform: uppercase; }`, `.ud-hero-detail::first-letter { color: inherit; }`', '`.ud-cap-first::first-letter { text-transform: uppercase; }`, `.ud-cap-first::first-letter { color: inherit; }`');
rep('`<dt className="text-text-faint first-letter:uppercase">{t.market.udQuoted}</dt>`, `<dt className="text-text-faint">{t.market.udQuoted}</dt>`, "3.12 ·"]',
    '`<dt className="ud-cap-first text-text-faint">{t.market.udQuoted}</dt>`, `<dt className="text-text-faint">{t.market.udQuoted}</dt>`, "3.12 ·"],\n  ["proof: the capital by the all-caps utility", "src/app/updown/[roundId]/page.tsx",\n    `<dt className="ud-cap-first text-text-faint">{t.market.udQuoted}</dt>`, `<dt className="text-text-faint first-letter:uppercase">{t.market.udQuoted}</dt>`, "3.13 ·"]');
rep('  ["css: the caption between its neighbours", CSS,', '  ["css: the caption\'s three parts allowed to touch", CSS, `  column-gap: var(--sp-1);\n  margin-top: 8px;`, `  margin-top: 8px;`, "5.2b ·"],\n  ["css: the caption between its neighbours", CSS,');
fs.writeFileSync(p, s);
