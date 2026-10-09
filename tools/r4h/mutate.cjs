// Mutation proof for scripts/visual-pass-r4h.test.mts: plant each defect ON DISK, run the suite, require it to fail on the
// named check, restore the file's exact bytes and prove it (sha256). Lives in the scratchpad: the repo's suite writes nothing.
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const ROOT = 'F:/kipindi-r4h/';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const M = [
  ['E27 the 30ms re-select put back', 'src/components/profile/name-editor.tsx', '    setEditing(true);\n  };', '    setEditing(true);\n    setTimeout(() => inputRef.current?.select(), 30);\n  };', '1.1'],
  ['E25 the name without an anywhere-break', 'src/components/profile/name-editor.tsx', ' text-balance [overflow-wrap:anywhere]">', ' text-balance">', '2.1'],
  ['E25 the button uncapped', 'src/components/profile/name-editor.tsx', 'inline-flex min-h-[40px] max-w-full items-center', 'inline-flex min-h-[40px] items-center', '2.1'],
  ['E24 the hero back on overflow-hidden alone', 'src/app/profile/page.tsx', 'relative overflow-hidden overflow-clip rounded-xl', 'relative overflow-hidden rounded-xl', '2.2'],
  ['E26 the hub name without keepNameEnd', 'src/app/account/page.tsx', '{keepNameEnd(viewer.name)}', '{viewer.name}', '2.4'],
  ['E26 the hub name unbalanced', 'src/app/globals.css', 'overflow-wrap: anywhere; text-wrap: balance; }', 'overflow-wrap: anywhere; }', '2.4'],
  ['E26 keepNameEnd gluing nothing', 'src/components/ui/keep-words.tsx', 'const NAME_END = /\\S\\s*\\S\\s*$/u;', 'const NAME_END = /\\S\\s*$/u;', '2.3'],
  ['E28 the meta back to a sentence with its own dots', 'src/components/home/landing-hero.tsx',
    '<DotSeq text={[closes, settles, pool, depth].filter(Boolean).join(" · ")} className="kp-qrow__meta" renderPart={metaPart} />',
    '<span className="kp-qrow__meta"><span className="kp-qrow__close">{closes}</span>{" · "}<span className="kp-qrow__pool" data-market-part="pool">{pool}</span>{" · "}<span className="kp-qrow__depth" data-market-part="predictors">{depth}</span></span>', '3.1'],
  ['E29 keepFigures without the unit words before a number', 'src/components/ui/keep-words.tsx', 'const UNIT_BEFORE = `dakika|', 'const UNIT_BEFORE = `dakikaX|', '4.1'],
  ['E29 keepFigures without ranges', 'src/components/ui/keep-words.tsx', '(?:[-–/]\\\\d+(?:[.,:]\\\\d+)*)*%?)', '%?)', '4.1'],
  ['E29 the market page h1 bare', 'src/app/markets/[id]/page.tsx', '{keepFigures(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh))}</h1>', '{pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}</h1>', '4.5'],
  ['E29 the board row title bare', 'src/components/home/landing-hero.tsx', '<span className="kp-qrow__q">{keepFigures(title)}</span>', '<span className="kp-qrow__q">{title}</span>', '4.5'],
  ['E29 /live tokens running across Chinese again', 'src/app/live/pulse-grid.tsx', 'text.split(/([^\\s\\p{Script=Han}]*(?:\\p{L}-[\\p{L}\\p{N}]|\\p{N}-\\p{L})[^\\s\\p{Script=Han}]*)/u)', 'text.split(/(\\S*[\\p{L}\\p{N}]-[\\p{L}\\p{N}]\\S*)/u)', '4.6'],
  ['E31 the Needle row in the padded wrapper again', 'src/components/layout/avatar-menu.tsx', '<div className="border-t border-border py-1">\n                <NeedleControlsDrawer variant="menu-item" />', '<div className="border-t border-border px-2 py-2">\n                <NeedleControlsDrawer variant="menu-item" />', '6.3'],
  ['E31 the Needle row on 12px padding', 'src/components/layout/needle-drawer.tsx', 'className="w-full flex items-center gap-[10px] px-3 py-2', 'className="w-full flex items-center gap-[10px] px-2 py-2', '6.3'],
  ['E31 the chevron without its overhang', 'src/components/layout/needle-drawer.tsx', 'className={overhang ? "-mr-1 text-text-subtle" : "text-text-subtle"}', 'className={overhang ? "text-text-subtle" : "text-text-subtle"}', '6.4'],
  ['E31 the journey label without keepLastWords', 'src/components/layout/avatar-menu.tsx', '{journey ? <span>{keepLastWords(primary)}</span> : primary}', '{primary}', '6.2'],
  ['E33 /positions back to "Nafasi" in the journey', 'src/components/layout/avatar-menu.tsx', ': journey && r.href === "/positions"', ': false && r.href === "/positions"', '6.5'],
  ['E32 the journey header back on the stars', 'src/components/layout/app-shell.tsx', '<LazyJourneyTopBar user={journeyUser}', '<LazyJourneyTopBar user={topUser}', '7.1'],
  ['E32 /profile/account back on a hand mask', 'src/app/profile/account/page.tsx', 'value={user?.phoneE164 ? maskPhone(user.phoneE164) : "—"}', 'value={user?.phoneE164 ? `${user.phoneE164.slice(0, 4)}*****${user.phoneE164.slice(-2)}` : "—"}', '7.3'],
  ['E4 the home link back on "Nafasi zangu" in the journey', 'src/components/home/landing-hero.tsx', '{journey ? t.journey.tabTickets : t.home.myPositions}', '{t.home.myPositions}', '8.1'],
  ['E34 the toaster without its hook', 'src/components/ui/toast.tsx', '      data-toaster=""\n', '', '9.1'],
  ['E34 the journey rule dropped', 'src/app/globals.css', ':root:has(#kp-journey-shell) [data-toaster] { top: 56px; }', '', '9.2'],
  ['E5 the home title back to the English default', 'src/app/page.tsx', '    title: { absolute: `50pick — ${t.auth.railTagline}` },\n', '', '10.1'],
  ['E2 the journey doors back on btn-lg padding', 'src/app/globals.css', ':root:has(#kp-journey-shell) .kp-wsheet__act { padding-inline: var(--sp-3); }', '', '11.1'],
  ['E2 the glyph allowed to shrink', 'src/app/globals.css', ':root:has(#kp-journey-shell) .kp-wsheet__act > svg { flex-shrink: 0; }', '', '11.1'],
  ['E3 the deposit caption as text', 'src/components/layout/wallet-sheet.tsx', '{journey ? keepLastWords(t.wallet.mobileMoney) : t.wallet.mobileMoney}', '{t.wallet.mobileMoney}', '11.2'],
  ['E13 the watermark lit on hover again', 'src/app/globals.css', '.mcardp-watermark svg { width: 140px; height: 140px; }', '.mcardp-watermark svg { width: 140px; height: 140px; }\n@media (hover: hover) {\n  .mcardp:hover .mcardp-watermark { opacity: 0.22; color: var(--brand-400); }\n}', '12.1'],
  ['G20 the return receipt back on break-all', 'src/app/wallet/deposit/return/page.tsx', '<span className="block font-mono text-text text-balance">{keepIdRuns(outcome.txn.id)}</span>', '<span className="font-mono text-text break-all">{outcome.txn.id}</span>', '13.3'],
  ['G20 a short tail left alone', 'src/components/ui/keep-words.tsx', '  if (Array.from(tail).length < 4) { runs.pop(); runs[runs.length - 1] += tail; }\n', '', '13.1'],
  ['R4-C /live without its band', 'src/app/live/pulse-grid.tsx', '<div className={QUERY_SEARCH_BAND_CLASS}>\n        <Suspense>', '<div>\n        <Suspense>', '14.1'],
  ['R4-C /updown/history back on mt-4', 'src/app/updown/history/page.tsx', '<div className={`${QUERY_SEARCH_BAND_CLASS} mt-5 pb-5`}>', '<div className="mt-4">', '14.1'],
  ['R4-C /profile/account back on py-1', 'src/app/profile/account/page.tsx', '<div className={QUERY_SEARCH_BAND_CLASS}>\n              <Suspense>', '<div className="py-1">\n              <Suspense>', '14.1'],
];

const only = process.argv[2] ? new Set(process.argv.slice(2)) : null;
let caught = 0, missed = 0, restored = 0;
const rows = [];
for (const [name, file, from, to, expect] of M) {
  if (only && !only.has(expect)) continue;
  const p = ROOT + file;
  const orig = fs.readFileSync(p);
  const h0 = sha(orig);
  const s = orig.toString('utf8');
  const crlf = s.includes('\r\n');
  const lf = s.replace(/\r\n/g, '\n');
  const n = lf.split(from).length - 1;
  if (n !== 1) { rows.push(`ANCHOR ${name}: ${n} matches`); missed++; continue; }
  let mutated = lf.replace(from, () => to);
  if (crlf) mutated = mutated.replace(/\n/g, '\r\n');
  let out = '', code = 0;
  try {
    fs.writeFileSync(p, mutated);
    const r = spawnSync('npx', ['tsx', 'scripts/visual-pass-r4h.test.mts'], { cwd: ROOT, encoding: 'utf8', shell: true });
    out = (r.stdout || '') + (r.stderr || '');
    code = r.status;
  } finally {
    fs.writeFileSync(p, orig);
  }
  const back = sha(fs.readFileSync(p)) === h0;
  if (back) restored++;
  const hit = code !== 0 && new RegExp(`FAIL ${expect.replace(/\./g, '\\.')}( |′|″)`).test(out);
  if (hit) caught++; else missed++;
  const failed = [...out.matchAll(/FAIL (\S+)/g)].map((m) => m[1]);
  rows.push(`${hit ? 'CAUGHT' : 'MISSED'} ${expect.padEnd(5)} ${name} — exit ${code}, failed [${failed.join(' ')}], restored ${back ? 'byte-identical' : 'DIFFERENT'}`);
}
console.log(rows.join('\n'));
console.log(`\nmutations: ${caught} caught, ${missed} missed · restored byte-identical: ${restored}`);
process.exit(missed ? 1 : 0);
