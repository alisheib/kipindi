import { readFileSync, writeFileSync } from "node:fs";
const raw = readFileSync("50pick-Identity-Sprint.html","utf8");
const man = [...raw.matchAll(/<script type="__bundler\/(\w+)">([\s\S]*?)<\/script>/g)].find(b=>b[1]==="manifest");
const j = JSON.parse(man[2].trim());
let n=0;
for (const [k,v] of Object.entries(j)){
  const mime = v?.mime ?? "";
  const data = typeof v==="string"? v : (v?.data ?? v?.content ?? "");
  if (/jsx|javascript/i.test(mime) && data.length < 60000){
    n++; writeFileSync(`scripts/_c${n}.js`, data, "utf8");
    const head = data.replace(/\s+/g," ").slice(0,90);
    const idHit = /avatar|frame|ring|sigil|crest|tier|monogram|hash/i.test(data);
    console.log(`_c${n}.js (${mime}, ${(data.length/1024|0)}KB)${idHit?"  ★identity":""}  :: ${head}`);
  }
}
