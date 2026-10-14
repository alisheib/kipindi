/** Actual browser DOM controls for PV-03's evaluator; about:blank only, no app HTTP/fixture/store/server requests. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import { emptyStateAlignment } from "./live/empty-state-alignment.mjs";

const artifactDir = process.env.QA_EMPTY_ALIGNMENT_ARTIFACTS || (process.platform === "win32"
  ? "F:/50pick-work/generated/qa-normal-empty-alignment-controls" : path.join(os.tmpdir(), "50pick-empty-alignment-controls"));
fs.mkdirSync(artifactDir, { recursive: true });
const knownChromium = "C:/Users/asheib/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe";
const executablePath = process.env.QA_CHROMIUM_PATH || (fs.existsSync(knownChromium) ? knownChromium : undefined);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
let requests = 0; page.on("request", () => requests++);
const style = `<style>*{box-sizing:border-box}body{margin:0;padding:20px;font:16px Arial;color:#eee;background:#181220}
h1,h2,p{margin:0 0 16px} [data-empty-state-scope],section,article,[data-measure]{position:relative}
.card{padding:32px;border:1px solid #555;width:1000px;margin-top:20px}.empty{border:1px dashed #777;padding:28px;text-align:center}
.boxed{max-width:360px;margin-inline:auto}.fill{width:100%}.narrow{width:360px}.later{position:absolute;top:0;left:550px}
.neighbour{position:absolute;top:0;left:550px;width:300px}.offset{margin-left:220px}</style>`;
const empty = (variant="fill", content="No rows yet") => `<div class="empty ${variant}" data-empty-state="${variant}">${content}</div>`;
const card = (body, classes="") => `<div class="card ${classes}" data-empty-state-scope>${body}</div>`;
const title = `<p data-section-heading>Local section</p>`;
const fixtures = [
  { name:"padded-filled-local", html:card(title+empty()), head:"Local section", aligned:true, association:"card" },
  { name:"wide-boxed-real-misalignment", html:card(title+empty("boxed")), head:"Local section", aligned:false, association:"card" },
  { name:"narrow-boxed-own-heading", html:card(title+empty("boxed"),"narrow"), head:"Local section", aligned:true, association:"card" },
  { name:"later-dom-heading-above", html:card(title+empty()+`<h2 class="later">Later DOM heading</h2>`), head:"Local section", aligned:true, association:"card" },
  { name:"neighbour-owned-heading", html:card(title+`<article class="neighbour"><h2>Neighbour heading</h2></article>`+empty()), head:"Local section", aligned:true, association:"card" },
  { name:"descendant-empty-heading", html:card(title+empty("fill",`<h2 class="later">Empty's own heading</h2>No rows yet`)), head:"Local section", aligned:true, association:"card" },
  { name:"containing-heading-cannot-justify-offset", html:card(title+`<div class="offset" data-section-heading>${empty()}</div>`), head:"Local section", aligned:false, association:"card" },
  { name:"semantic-section", html:`<section class="card">${title+empty()}</section>`, head:"Local section", aligned:true, association:"section" },
  { name:"page-container-fallback", html:`<div class="card" data-measure="reading">${title+empty()}</div>`, head:"Local section", aligned:true, association:"page-container" },
  { name:"main-fallback", html:empty(), head:"Page heading", aligned:true, association:"main-fallback" },
  { name:"no-heading-is-unassociated", html:card(empty()), noPageHeading:true, head:null, aligned:null, association:"unassociated" },
  { name:"sr-only-clipped-heading", html:card(title+`<h1 style="position:absolute;left:550px;top:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">Screen-reader heading</h1>`+empty()), head:"Local section", aligned:true, association:"card" },
  { name:"inset-fully-clipped-heading", html:card(title+`<h2 class="later" style="width:200px;height:30px;clip-path:inset(50%)">Clipped heading</h2>`+empty()), head:"Local section", aligned:true, association:"card" },
  { name:"visibility-hidden-heading", html:card(title+`<h2 class="later" style="visibility:hidden">Hidden heading</h2>`+empty()), head:"Local section", aligned:true, association:"card" },
  { name:"opacity-hidden-ancestor", html:card(title+`<div class="later" style="opacity:0"><h2>Transparent heading</h2></div>`+empty()), head:"Local section", aligned:true, association:"card" },
  { name:"tiny-visible-box-is-not-a-size-floor", html:card(`<h2 style="width:1px;height:1px;overflow:visible;white-space:nowrap">Tiny visible heading</h2>`+empty()), head:"Tiny visible heading", aligned:true, association:"card" },
  { name:"partially-clipped-heading-still-paints", html:card(`<h2 style="position:absolute;top:0;left:32px;width:200px;height:30px;clip:rect(0,180px,24px,0)">Partly painted heading</h2><div style="height:44px"></div>`+empty()), head:"Partly painted heading", aligned:true, association:"card" },
  { name:"child-visible-overrides-hidden-ancestor", html:card(`<div style="visibility:hidden"><h2 style="visibility:visible">Visible override heading</h2></div>`+empty()), head:"Visible override heading", aligned:true, association:"card" },
  { name:"below-fold-heading-reachable-by-document-scroll", css:"html{overflow-y:auto;height:640px}main{padding-top:700px}", html:card(title+empty()), head:"Local section", aligned:true, association:"card" },
];
function verdict(f, rows) {
  if (rows.length !== 1) return false;
  const e=rows[0], aligned=e.delta === null ? null : e.delta <= 24;
  return e.headText === f.head && aligned === f.aligned && e.association === f.association;
}
const evidence = { browser:browser.version(), viewport:{width:1280,height:640}, tolerance:24, requests:0, controls:[], mutants:[] };
let pass=0,fail=0;
const ok=(name,yes)=>{yes?pass++:fail++;console.log(`${yes?"PASS":"FAIL"} ${name}`);};
async function read(f, evaluator=emptyStateAlignment) {
  await page.setContent("<!doctype html>"+style+`<style>${f.css??""}</style><main>${f.noPageHeading?"":`<h1>Page heading</h1>`}${f.html}</main>`);
  return page.evaluate(evaluator);
}
try {
  for (const f of fixtures) {
    const rows=await read(f);ok(f.name,verdict(f,rows));evidence.controls.push({name:f.name,rows,passed:verdict(f,rows)});
    await page.screenshot({ path:path.join(artifactDir,`${f.name}.png`), fullPage:true });
  }
  const source=emptyStateAlignment.toString();
  const plants=[
    {name:"later DOM heading admitted",fixture:"later-dom-heading-above",before:"if (!(h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;",after:""},
    {name:"neighbour ownership ignored",fixture:"neighbour-owned-heading",before:"if (h.closest(SCOPE) !== scope) return false;",after:""},
    {name:"containing heading accepted",fixture:"containing-heading-cannot-justify-offset",before:"if (el.contains(h) || h.contains(el)) return false;",after:""},
    {name:"empty's own left used as reference",fixture:"wide-boxed-real-misalignment",before:"Math.round(Math.abs(r.left - hr.left))",after:"0"},
    {name:"sr-only zero painted clip accepted",fixture:"sr-only-clipped-heading",before:"if (!(paint.right > paint.left && paint.bottom > paint.top)) return false;",after:""},
    {name:"visibility hidden accepted",fixture:"visibility-hidden-heading",before:'if (style.visibility === "hidden" || style.visibility === "collapse") return false;',after:""},
    {name:"zero-opacity ancestor accepted",fixture:"opacity-hidden-ancestor",before:"if (Number(cs.opacity) === 0) return false;",after:""},
    {name:"inset clipping ignored",fixture:"inset-fully-clipped-heading",before:"if (inset) {",after:"if (false && inset) {"},
    {name:"document viewport mistaken for an unreachable clip",fixture:"below-fold-heading-reachable-by-document-scroll",before:"const viewportScroller = node === document.scrollingElement;",after:"const viewportScroller = false;"},
  ];
  for(const plant of plants) {
    if(source.split(plant.before).length!==2)throw new Error(`mutation anchor not unique: ${plant.name}`);
    const evaluator=new Function(`return (${source.replace(plant.before,plant.after)});`)();
    const f=fixtures.find(f=>f.name===plant.fixture);const rows=await read(f,evaluator);const caught=!verdict(f,rows);
    ok(`RED ${plant.name}`,caught);evidence.mutants.push({name:plant.name,rows,caught});
  }
  ok("no HTTP or asset requests",requests===0);evidence.requests=requests;
} finally {
  await browser.close();fs.writeFileSync(path.join(artifactDir,"evidence.json"),JSON.stringify({...evidence,pass,fail},null,2));
}
console.log(`empty-state-alignment: ${pass} passed, ${fail} failed · ${artifactDir}`);
process.exitCode=fail?1:0;
