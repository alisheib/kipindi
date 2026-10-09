import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const e = j.entries.filter((x) => (x.file||x.route||'').includes('s5-slow3g') || x.scenario === 's5-slow3g');
for (const x of e) {
  const p = x.probe || {};
  console.log([x.seq, x.kind, x.route, x.locale, x.width, 'hyd=' + x.hydrated, 'title=' + JSON.stringify(x.title), 'h1=' + JSON.stringify(x.h1), 'url=' + x.url].join(' | '));
  console.log('   probe.kind=' + p.kind + ' times=' + JSON.stringify(p.timingsMs) + ' at=' + JSON.stringify(p.at) + (p.before ? ' before=' + JSON.stringify(p.before) : ''));
  if (x.header) console.log('   header=' + JSON.stringify({j:x.header.journey, cap:x.header.capsule && x.header.capsule.label, gold:x.header.goldPill, rail:x.header.railShown, desk:x.header.desktopLinksShown, lit:x.header.lit}));
  if (x.reason) console.log('   reason=' + x.reason);
}
