import { readFileSync, writeFileSync } from "node:fs";
const raw = readFileSync("50pick-Identity-Sprint.html","utf8");
const man = [...raw.matchAll(/<script type="__bundler\/(\w+)">([\s\S]*?)<\/script>/g)].find(b=>b[1]==="manifest");
const j = JSON.parse(man[2].trim());
let n=0;
for (const [k,v] of Object.entries(j)){
  const mime = v?.mime ?? "?";
  let content = typeof v==="string"? v : (v?.data ?? v?.content ?? "");
  // decode base64 text resources (js/jsx) to inspect
  let txt = "";
  if (typeof content==="string"){
    if (/javascript|jsx|text|babel/i.test(mime) || (!/font|image|woff|png|jpg/i.test(mime))) {
      try { txt = Buffer.from(content, "base64").toString("utf8"); } catch { txt = content; }
      if (!/[A-Za-z]{4}\s/.test(txt.slice(0,200))) txt = content; // not text → keep raw
    }
  }
  const isCode = /className|createElement|function |const \w+ =|useState|return \(/.test(txt);
  console.log(`${k.slice(0,14)}  mime=${mime}  ${ (content.length/1024|0)}KB  ${isCode?"<<< CODE":""}`);
  if (isCode){ n++; writeFileSync(`scripts/_code-${n}.jsx`, txt, "utf8"); }
}
console.log("code files written:", n);
