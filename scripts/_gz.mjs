import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const raw = readFileSync("50pick-Identity-Sprint.html","utf8");
const man = [...raw.matchAll(/<script type="__bundler\/(\w+)">([\s\S]*?)<\/script>/g)].find(b=>b[1]==="manifest");
const j = JSON.parse(man[2].trim());
let n=0;
for (const [k,v] of Object.entries(j)){
  const mime = v?.mime ?? "";
  const data = typeof v==="string"? v : (v?.data ?? v?.content ?? "");
  if (!/jsx|javascript/i.test(mime) || data.length>=60000) continue;
  let txt="";
  try { txt = gunzipSync(Buffer.from(data,"base64")).toString("utf8"); } catch(e){ txt="[gunzip failed] "+e.message; }
  n++;
  const idHit = /avatar|sigil|crest|frameFor|ringFor|monogram|generat/i.test(txt);
  writeFileSync(`scripts/_s${n}.jsx`, txt, "utf8");
  console.log(`_s${n}.jsx (${mime}) ${txt.length}B ${idHit?"★IDENTITY":""} :: ${txt.replace(/\s+/g," ").slice(0,80)}`);
}
