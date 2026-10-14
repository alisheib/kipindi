/** Actual local memory pages, project fonts and PV-03's same rendered alignment verdict. No money action. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, dirname, relative, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { premise } from "./live/journey-pass.mjs";
import { emptyStateAlignment } from "./live/empty-state-alignment.mjs";

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),".."),BASE=process.env.BASE??"http://localhost:3047";
const OUT=resolve(process.argv[2]??join(tmpdir(),`qa-normal-empty-state-${Date.now()}`));
const rel=relative(ROOT,OUT);
if(!rel.startsWith("..")&&!isAbsolute(rel))throw Error("Evidence must be outside the repository");
const pre=await premise(BASE);
if(pre.refuse||pre.health?.security?.adminTotp!=="DISABLED")throw Error(`Invalid local memory target: ${pre.refuse??"TOTP gate enabled"}`);
const browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{});
mkdirSync(OUT,{recursive:true});
const results=[],cells=[],consoleErrors=[];
const sourceProof={head:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),evaluator:createHash('sha256').update(emptyStateAlignment.toString()).digest('hex'),files:Object.fromEntries(['scripts/qa-normal-empty-state.mjs','scripts/live/empty-state-alignment.mjs','src/components/admin/admin-shell.tsx','src/components/admin/admin-table-empty.tsx','src/app/profile/invite/page.tsx','src/app/admin/reports/page.tsx','src/app/admin/settlement/page.tsx','src/app/admin/objections/page.tsx','src/app/admin/markets/page.tsx','src/app/admin/sources/page.tsx','src/app/admin/ai-usage/page.tsx'].map(file=>[file,createHash('sha256').update(readFileSync(join(ROOT,file))).digest('hex')]))};
const record=(label,pass,detail="")=>{results.push({label,pass,detail});console.log(`${pass?"PASS":"FAIL"} ${label}${detail?` — ${detail}`:""}`);};
const routes=[
  {role:"player",path:"/profile/invite",min:1},
  {role:"admin",path:"/admin/reports",min:1},
  {role:"admin",path:"/admin/reports?tab=library",min:1},
  {role:"admin",path:"/admin/settlement",min:1},
  {role:"admin",path:"/admin/objections",min:1},
  {role:"admin",path:"/admin/markets?q=QA_EMPTY_ALIGNMENT_NO_MATCH",min:1},
  {role:"admin",path:"/admin/sources",min:1},
  {role:"admin",path:"/admin/ai-usage",min:2},
  {role:"admin",path:"/admin/ai-usage?tab=usage",min:2},
];
const paths=(process.env.QA_EMPTY_ONLY??"").split(",").filter(Boolean);
const selected=paths.length?routes.filter(r=>paths.some(p=>r.path===p)):routes;
if(!selected.length)throw Error("No selected section routes");
const locales=(process.env.QA_EMPTY_LOCALES??"en,sw").split(",");
const widths=(process.env.QA_EMPTY_WIDTHS??"320,1280").split(",").map(Number);
if(locales.some(l=>!["en","sw"].includes(l))||widths.some(w=>![320,1280].includes(w)))throw Error("Invalid locale/width selection");
const contexts={player:await browser.newContext(),admin:await browser.newContext()};
await contexts.player.request.get(`${BASE}/auth/demo`);
const seeded=await contexts.admin.request.post(`${BASE}/api/dev-test/seed-admin`,{data:{role:"ADMIN",phone:"+255700000078",name:"NormalEmptyStateFixture"}});
if(!seeded.ok())throw Error("Own admin fixture refused");
function verdict(cell,min){
  const errors=[];
  if(cell.lang!==cell.locale||cell.fonts!=="loaded"||cell.woff<3)errors.push("Actual locale/project-font premise failed");
  if(cell.main!==1||cell.overflow>1)errors.push("Page landmark or horizontal measure failed");
  if(cell.empty.length<min)errors.push(`Named section premise missing: ${cell.empty.length}/${min}`);
  for(const state of cell.empty){if(state.association!=="card"||state.delta===null||state.delta>24)errors.push(`Local heading relationship: ${JSON.stringify(state)}`);}
  for(const table of cell.tables){if(table.headerVisible||table.overflow>1)errors.push(`Empty table still has a column header/floor: ${JSON.stringify(table)}`);}
  if(cell.path==="/profile/invite"&&(!cell.qr||cell.qr.overlap||!cell.qr.codeFits||(cell.width===320&&!cell.qr.stacked)))errors.push("Invitation QR covers its heading/code or phone column did not wrap");
  if(cell.path==="/admin/settlement"&&!/irreversible:\s+once/.test(cell.footnote?.text??""))errors.push("Settlement warning lost its word boundary");
  if(cell.path==="/admin/ai-usage?tab=usage"&&(!cell.usageFootnote||cell.usageFootnote.includes('\\u00d7')||!cell.usageFootnote.includes('token counts × Anthropic pricing')))errors.push("AI pricing footnote does not render its real multiplication sign");
  if(cell.path==="/admin/sources"&&(!cell.sourceStatus||cell.sourceStatus.fragments!==1||!cell.sourceStatus.text.includes('No enabled source')))errors.push("Source status must be one bounded multiline pill");
  return errors;
}
async function read(page,route,locale,width){
  const empty=(await page.evaluate(emptyStateAlignment)).filter(s=>s.association==="card");
  const geometry=await page.evaluate(()=>({lang:document.documentElement.lang,fonts:document.fonts.status,woff:performance.getEntriesByType("resource").filter(r=>/\.woff2?(?:\?|$)/.test(r.name)).length,main:document.querySelectorAll("main#main-content").length,overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),tables:[...document.querySelectorAll("table.admin-tbl:has(tr[data-table-empty])")].map(table=>({headerVisible:[...table.querySelectorAll("thead")].some(head=>head.getBoundingClientRect().height>0&&getComputedStyle(head).display!=="none"),overflow:Math.max(0,table.getBoundingClientRect().width-table.parentElement.getBoundingClientRect().width)}))}));
  if(route.path==="/profile/invite")geometry.qr=await page.evaluate(()=>{
    const img=document.querySelector('section img[width="104"]'),qr=img?.parentElement,words=qr?.previousElementSibling,box=qr?.closest('section');
    if(!qr||!words||!box)return null;
    const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},q=rect(qr),w=rect(words),b=rect(box);
    const overlap=Math.min(q.right,w.right)>Math.max(q.x,w.x)+1&&Math.min(q.bottom,w.bottom)>Math.max(q.y,w.y)+1;
    const code=words.querySelector('span'),range=document.createRange();range.selectNodeContents(code);const glyph=range.getBoundingClientRect(),c=rect(code.parentElement);
    return{qr:q,words:w,card:b,overlap,code:code.textContent,codeFits:glyph.x>=c.x-1&&glyph.right<=c.right+1&&c.right<=b.right-1,stacked:q.y>=w.bottom-1};
  });
  if(route.path==="/admin/settlement")geometry.footnote=await page.evaluate(()=>{
    const strong=[...document.querySelectorAll('strong')].find(el=>el.textContent==='Settling is irreversible:');
    return strong?{text:strong.parentElement.textContent,followingText:strong.nextSibling?.textContent??null}:null;
  });
  if(route.path==="/admin/ai-usage?tab=usage")geometry.usageFootnote=await page.evaluate(()=>[...document.querySelectorAll('p')].find(el=>el.textContent.includes('Cost estimated from token counts'))?.textContent??null);
  if(route.path==="/admin/sources")geometry.sourceStatus=await page.evaluate(()=>{
    const status=[...document.querySelectorAll('span')].find(el=>el.textContent.trim()==='No enabled source · not generatable');
    return status?{text:status.textContent,fragments:status.getClientRects().length,display:getComputedStyle(status).display}:null;
  });
  return {...geometry,empty,path:route.path,locale,width};
}
try{
  for(const route of selected)for(const locale of locales)for(const width of widths){
    const ctx=contexts[route.role];await ctx.addCookies([{name:"kp-locale",value:locale,url:BASE}]);
    const page=await ctx.newPage();await page.setViewportSize({width,height:900});
    page.on("pageerror",error=>consoleErrors.push({path:route.path,error:error.message}));
    page.on("console",message=>{if(message.type()==="error")consoleErrors.push({path:route.path,error:message.text()});});
    const response=await page.goto(BASE+route.path,{waitUntil:"domcontentloaded",timeout:180_000});
    if(!response?.ok()||new URL(page.url()).pathname!==new URL(BASE+route.path).pathname)throw Error(`Real section route failed: ${route.path} (${response?.status()})`);
    await page.locator('[data-empty-state="fill"]').first().waitFor({timeout:30_000});
    await page.waitForFunction(()=>{
      const roots=[...document.querySelectorAll('[data-empty-state],textarea')];
      return roots.length>0&&roots.every(el=>Object.keys(el).some(key=>key.startsWith('__reactProps$')));
    },undefined,{timeout:90_000});
    // Reading layout may request a face that was unused at DOMContentLoaded; settle the real client and that font set.
    await page.evaluate(()=>{for(const el of document.querySelectorAll('[data-empty-state]'))el.getBoundingClientRect();});
    await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    await page.waitForFunction(()=>document.fonts.status==="loaded",undefined,{timeout:90_000});
    const cell=await read(page,route,locale,width),errors=verdict(cell,route.min);
    cells.push(cell);const name=`${route.path.replace(/[^a-z0-9]+/gi,"-")}-${locale}-${width}`;
    record(`${route.path} ${locale}${width}: real local sections align and empty tables release their floors`,!errors.length,errors.join(";"));
    await page.screenshot({path:join(OUT,`${name}.png`),fullPage:true});
    const filled=page.locator('[data-empty-state="fill"]');
    for(let i=0;i<await filled.count();i++){
      const section=filled.nth(i).locator('xpath=ancestor::*[@data-empty-state-scope][1]');
      await section.screenshot({path:join(OUT,`${name}-section${i+1}.png`)});
    }
    if(route.path==="/profile/invite"){
      const invite=page.locator('section:has(img[width="104"])');
      await invite.screenshot({path:join(OUT,`${name}-invitation.png`)});
      if(width===320){
        await invite.locator('div.relative').evaluate(el=>{window.__inviteWrapBefore=el.style.flexWrap;el.style.flexWrap="nowrap";});
        record(`${route.path} ${locale}${width}: removing wrap reproduces the same QR/code defect`,verdict(await read(page,route,locale,width),route.min).some(issue=>issue.startsWith("Invitation QR")));
        await invite.screenshot({path:join(OUT,`${name}-red-qr-overlap.png`)});
        await invite.locator('div.relative').evaluate(el=>{el.style.flexWrap=window.__inviteWrapBefore;delete window.__inviteWrapBefore;});
      }
    }
    if(route.path==="/admin/sources"&&width===320){
      const status=page.getByText('No enabled source · not generatable',{exact:true});
      await status.evaluate(el=>{window.__sourceDisplayBefore=el.style.display;el.style.display='inline';});
      record(`${route.path} ${locale}${width}: restoring raw inline status fails the same single-pill verdict`,verdict(await read(page,route,locale,width),route.min).some(issue=>issue.startsWith('Source status')));
      await page.screenshot({path:join(OUT,`${name}-red-status-fragments.png`),fullPage:true});
      await status.evaluate(el=>{el.style.display=window.__sourceDisplayBefore;delete window.__sourceDisplayBefore;});
    }
    if(width===1280){
      const target=page.locator('[data-empty-state="fill"]').first();
      await target.evaluate(el=>{window.__emptyStyleBefore=el.getAttribute("style");el.style.width="100%";el.style.maxWidth="360px";el.style.marginInline="auto";});
      const red=await read(page,route,locale,width),issues=verdict(red,route.min);
      record(`${route.path} ${locale}${width}: restoring centered360 fails the identical verdict`,issues.some(issue=>issue.startsWith("Local heading relationship:")));
      await page.screenshot({path:join(OUT,`${name}-red-centered.png`),fullPage:true});
      await target.evaluate(el=>{if(window.__emptyStyleBefore===null)el.removeAttribute("style");else el.setAttribute("style",window.__emptyStyleBefore);delete window.__emptyStyleBefore;});
      record(`${route.path} ${locale}${width}: restored kit fill recovers the same verdict`,!verdict(await read(page,route,locale,width),route.min).length);
    }
    await page.close();
  }
  record("No actual console/page errors",consoleErrors.length===0);
}catch(error){record("Actual section drive stopped",false,String(error.message));}
finally{await browser.close();writeFileSync(join(OUT,"evidence.json"),JSON.stringify({base:BASE,sourceProof,results,cells,consoleErrors},null,2));}
console.log(`qa:normal-empty-state ${results.filter(r=>r.pass).length} passed, ${results.filter(r=>!r.pass).length} failed; read every actual tile: ${OUT}`);
process.exitCode=results.some(r=>!r.pass)?1:0;
