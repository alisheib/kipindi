const fs = require('fs');
const ROOT = 'F:/kipindi-r4h/';
function edit(file, pairs) {
  const p = ROOT + file;
  let s = fs.readFileSync(p, 'utf8');
  const crlf = s.includes('\r\n');
  s = s.replace(/\r\n/g, '\n');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${file}: expected 1 match, got ${n}: ${a.slice(0, 80)}`);
    s = s.replace(a, () => b);
  }
  if (crlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(p, s);
  console.log('edited', file);
}
module.exports = { edit };
if (require.main === module) {
  edit('src/components/markets/market-card.tsx', [
    ['import { keepUnits } from "@/components/ui/keep-units";', 'import { keepFigures } from "@/components/ui/keep-words";'],
    ['          {/* `keepUnits` (2026-10-08 · G1 [029 059 074 084 097 109]): "200毫米" never breaks between the\n              number and its unit; a Swahili or English title is returned untouched. */}\n          {featured ? <h2 className="mcardp-q">{keepUnits(title)}</h2> : <h3 className="mcardp-q">{keepUnits(title)}</h3>}',
     '          {/* `keepFigures` (2026-10-08 · G1 [029 059 074 084 097 109]; round 4, edges 197 253 255): "200毫米" never breaks\n              between the number and its unit, nor "2026-27" at its hyphen, nor "dakika 28:00" between the unit and the\n              number; a title with no such run is returned untouched. */}\n          {featured ? <h2 className="mcardp-q">{keepFigures(title)}</h2> : <h3 className="mcardp-q">{keepFigures(title)}</h3>}'],
  ]);
  edit('src/components/journey/tickets/ticket-card.tsx', [
    ['import { keepUnits } from "@/components/ui/keep-units";', 'import { keepFigures } from "@/components/ui/keep-words";'],
    ['      {/* `keepUnits` (2026-10-08 · G1): a Chinese "200毫米" never breaks between the number and its unit. */}',
     '      {/* `keepFigures` (2026-10-08 · G1; round 4, edges 197 255): "200毫米", "2026-27" and "dakika 28:00" never break inside. */}'],
    ['className="-my-2 block py-2 hover:underline">{keepUnits(title.text)}</Link>', 'className="-my-2 block py-2 hover:underline">{keepFigures(title.text)}</Link>'],
  ]);
  edit('src/app/live/featured-contest.tsx', [
    ['import { keepUnits } from "@/components/ui/keep-units";', 'import { keepFigures } from "@/components/ui/keep-words";'],
    ['                {keepUnits(mm.title)}', '                {keepFigures(mm.title)}'],
  ]);
}
