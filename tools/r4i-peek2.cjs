const j = require(process.argv[2]);
const want = process.argv.slice(3);
for (const e of j.entries) {
  if (!e.file) continue;
  const seq = e.file.slice(0,3);
  if (!want.includes(seq)) continue;
  const c = {...e};
  console.log(JSON.stringify(c, null, 0).slice(0, 3000));
  console.log('---');
}
