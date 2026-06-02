import { readFileSync, writeFileSync } from "node:fs";
const raw = readFileSync("50pick-Identity-Sprint.html","utf8");
// Grab every bundler script block
const blocks = [...raw.matchAll(/<script type="__bundler\/(\w+)">([\s\S]*?)<\/script>/g)];
console.log("bundler blocks:", blocks.map(b=>b[1]+" ("+(b[2].length/1024|0)+"KB)").join(", "));
// ext_resources usually holds a JSON map uuid->{content,...}
const ext = blocks.find(b=>b[1]==="ext_resources");
const man = blocks.find(b=>b[1]==="manifest");
for (const [name,blk] of [["manifest",man],["ext_resources",ext]]){
  if(!blk) continue;
  try{
    const j = JSON.parse(blk[2].trim());
    const keys = Object.keys(j);
    console.log(`\n${name}: ${keys.length} entries`);
    // find entries whose content mentions avatar/frame/ring/sigil/crest
    let hits=0;
    for (const k of keys){
      const v = j[k];
      const content = typeof v === "string" ? v : (v?.content ?? JSON.stringify(v));
      if (typeof content==="string" && /avatar|frame|ring|sigil|crest|Tier/i.test(content) && content.length>500){
        hits++; writeFileSync(`scripts/_id-res-${hits}.txt`, content, "utf8");
        console.log(`  → ${name}[${k.slice(0,16)}] ${content.length}B  saved _id-res-${hits}.txt`);
        if(hits>=6) break;
      }
    }
    if(!hits) console.log("  (no avatar/frame/ring hits — entries may be fonts/binary)");
  }catch(e){ console.log(`${name}: not JSON (${e.message.slice(0,40)})`); }
}
