const j = require(process.argv[2]);
const arr = Array.isArray(j) ? j : (j.entries || j.tiles || Object.values(j));
console.log(typeof j, Array.isArray(j), Object.keys(j).slice(0,10));
const e = (Array.isArray(arr) ? arr : []).slice(0,2);
console.log(JSON.stringify(e, null, 1).slice(0, 4000));
