import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const arr = Array.isArray(j) ? j : (j.tiles || j.entries || Object.values(j).find(Array.isArray));
console.log(Object.keys(j).slice(0,20));
const e = arr.filter((x) => (x.file||'').includes('s5-slow3g'));
console.log(e.length);
console.log(JSON.stringify(e[0], null, 1).slice(0, 4000));
