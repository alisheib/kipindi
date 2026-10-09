import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const seq of process.argv.slice(3).map(Number)) {
  const x = j.entries.find((e) => e.seq === seq);
  const c = { ...x }; delete c.overflow; delete c.expect;
  console.log(JSON.stringify(c, null, 1).slice(0, 2500));
}
