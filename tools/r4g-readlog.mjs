import { readFileSync } from 'node:fs';
const S = process.argv[2];
const log = JSON.parse(readFileSync(S + '/edges/tiles/qa-journey-edges.json', 'utf8'));
const es = (log.entries || log).filter((e) => (e.scenario === 's9' || (e.file || '').includes('s9-offline')));
for (const e of es) {
  console.log(JSON.stringify({ k: e.kind, file: e.file, route: e.route, loc: e.locale, w: e.width, url: e.url, lang: e.lang, title: e.title, h1: e.h1, header: e.header, nextError: e.nextError, pageErrors: e.pageErrors, consoleErrors: e.consoleErrors, probe: e.probe, flags: e.flags, reason: e.reason, lastResponse: e.lastResponse }));
}
