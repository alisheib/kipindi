/** Actual owner/auth/storage recovery against an exclusively owned localhost memory fixture. Never production/SQL. */
import {chromium} from "playwright";
import {mkdirSync,writeFileSync} from "node:fs";
import {resolve,relative,isAbsolute} from "node:path";
import {randomUUID} from "node:crypto";
import {premise,mintStaffPass,SESSION_COOKIE,LOCALE_COOKIE} from "./live/journey-pass.mjs";
const BASE=process.env.KP_BASE??"http://localhost:3049",OUT=resolve(process.argv[2]??"F:/50pick-work/generated/qa-s10-owner-20261014");
const root=resolve(new URL("..",import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")),rel=relative(root,OUT);
if(!rel.startsWith("..")&&!isAbsolute(rel))throw new Error("Outside-repository output required");
const pre=await premise(BASE);if(pre.refuse||pre.health?.security?.adminTotp!=="DISABLED")throw new Error(pre.refuse??"Local TOTP-disabled memory fixture required");
mkdirSync(OUT,{recursive:true});const results=[],errors=[],reads=[],contexts=[];let browser;
const check=(name,cond,detail={})=>{results.push({name,pass:!!cond,detail});console.log(`${cond?"PASS":"FAIL"} ${name}`);if(!cond)throw new Error(name);};
const post=async(ctx,name,data={})=>{const r=await ctx.request.post(`${BASE}/api/dev-test/${name}`,{data,timeout:240000});const body=await r.json();if(!r.ok()||body.ok===false)throw new Error(`${name}: ${r.status()}`);return body;};
const cookie=c=>({name:c.name,value:c.value,domain:new URL(BASE).hostname,path:c.path??"/"});
const owned=(owner,market,key)=>JSON.stringify({v:2,owner,pending:[{quote:{marketId:market,side:"YES",stake:500},key,at:Date.now()-3*86400000}]});
const keys=new Map();const key=n=>{if(!keys.has(n))keys.set(n,randomUUID());return keys.get(n);};
const ROOT='[data-testid="journey-bet-sheet"]',CTA='[data-testid="journey-sheet-place"]';
async function context(session,pass){const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});contexts.push(c);await c.addCookies([cookie(session),cookie(pass),{name:LOCALE_COOKIE,value:"en",url:BASE}]);return c;}
async function pageIn(ctx,route="/"){
 const page=await ctx.newPage();page.on("pageerror",e=>errors.push(e.message));
 page.on("response",async r=>{if(r.url().includes("/sheet?")&&r.url().includes("me=1")){try{const b=await r.json();reads.push({status:r.status(),viewerId:b.me?.viewerId??null,keyPosition:b.me?.keyPosition??null});}catch{}}});
 await page.addInitScript(()=>{
  window.__ownerDoc=performance.timeOrigin;window.__ownerClock=0;window.__ownerWriteFault=sessionStorage.getItem("qa-owner-fault")==="1";
  const originalNow=Date.now;Date.now=()=>originalNow()+window.__ownerClock;
  const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__ownerWriteFault&&k.startsWith("kp-sheet-intents:v2:"))throw new DOMException("Owner recovery QA quota fault","QuotaExceededError");return set.call(this,k,v);};
  const add=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(type,listener,options){const result=add.call(this,type,listener,options);if(type==="click"&&typeof listener==="function"&&listener.toString().includes("a[data-bet-side]"))window.__ownerReady=true;return result;};
 });
 await page.goto(BASE+route,{waitUntil:"domcontentloaded",timeout:240000});await page.waitForFunction(()=>window.__ownerReady===true,null,{timeout:120000});return page;
}
const waitFrame=async(page,frame)=>{await page.waitForFunction(([root,frame])=>document.querySelector(root)?.getAttribute("data-frame")===frame,[ROOT,frame],{timeout:120000});};
const storage=async(page,k)=>page.evaluate(k=>sessionStorage.getItem(k),k);
const observe=async(ctx,market)=>{const r=await ctx.request.get(`${BASE}/api/dev-test/bet-sheet-observe?marketId=${market}`);if(!r.ok())throw new Error(`observe ${r.status()}`);return r.json();};
async function switchOwner(page,ctx,session,advance=0){const before=await page.evaluate(()=>window.__ownerDoc);await ctx.addCookies([cookie(session)]);await page.evaluate(advance=>{window.__ownerClock=advance;window.dispatchEvent(new Event("focus"));},advance);await page.waitForFunction(prior=>window.__ownerDoc!==prior,before,{timeout:120000});await page.waitForFunction(()=>window.__ownerReady===true,null,{timeout:120000});}
try{
 browser=await chromium.launch();const pass=await mintStaffPass(browser,BASE,{phone:"+255700000097",name:"Owner Recovery Support"});
 const admin=await browser.newContext();contexts.push(admin);await post(admin,"seed-admin",{role:"ADMIN",phone:"+255700000096",name:"Owner Recovery Admin"});await post(admin,"seed-markets");await post(admin,"reset-rate-limits");
 const fresh=async()=>{const c=await browser.newContext();contexts.push(c);const user=await post(c,"fresh-kyc-player",{state:"none"});await post(c,"seed-wallet",{phone:user.phone,amount:50000});return{user,session:(await c.cookies(BASE)).find(c=>c.name===SESSION_COOKIE),ctx:c};};
 const A=await fresh(),B=await fresh();if(!A.session||!B.session)throw new Error("Missing authentic fixture sessions");
 const ctx=await context(A.session,pass),page=await pageIn(ctx);
 await page.waitForSelector('a[data-bet-side="YES"]',{timeout:120000});
 const seed=await page.locator('a[data-bet-side="YES"]').first().evaluate(a=>JSON.parse(a.closest('[data-sheet]').getAttribute('data-sheet')));const market=seed.id;
 const a=`kp-sheet-intents:v2:${A.user.userId}`,b=`kp-sheet-intents:v2:${B.user.userId}`,araw=owned(A.user.userId,market,key(1)),braw=owned(B.user.userId,market,key(2));
 await page.evaluate(({a,b,araw,braw})=>{sessionStorage.setItem(a,araw);sessionStorage.setItem(b,braw);},{a,b,araw,braw});
 await page.goto(`${BASE}/?bet=${market}.YES.500`,{waitUntil:"domcontentloaded",timeout:120000});await waitFrame(page,"inDoubt");
 check("36h-old own pending key is restored, with no money on open/reload",await storage(page,a)===araw&&(await observe(A.ctx,market)).positionCount===0);
 // Move the client recovery clock beyond its null settle wait, then make the server answer as B.
 await switchOwner(page,ctx,B.session,700000);await waitFrame(page,"inDoubt");await page.waitForTimeout(500);
 const foreign={aKept:await storage(page,a)===araw,bKept:await storage(page,b)===braw,BNull:reads.some(r=>r.viewerId===B.user.userId&&r.keyPosition===null)};
 check("actual foreign authenticated null refreshes B chrome and cannot retire A after the settle wait",foreign.aKept&&foreign.bKept&&foreign.BNull,foreign);
 await switchOwner(page,ctx,A.session);await waitFrame(page,"inDoubt");
 check("actual A → B → A keeps both same-question original request keys and never places while observing",await storage(page,a)===araw&&await storage(page,b)===braw&&(await observe(A.ctx,market)).positionCount===0&&(await observe(B.ctx,market)).positionCount===0);
 await page.locator(CTA).click();await waitFrame(page,"receipt");const placed=await observe(A.ctx,market);
 check("one explicit owned retry places exactly the original A key, while B stays untouched",placed.positionCount===1&&placed.betPlacedCount===1&&placed.positions[0].key===key(1)&&(await observe(B.ctx,market)).positionCount===0&&JSON.parse(await storage(page,a)).pending.length===0&&await storage(page,b)===braw);
 await page.screenshot({path:resolve(OUT,"owned-receipt.png")});
 // A known receipt must not unlock a new request while its durable retirement fails.
 await page.evaluate(({a,araw,market})=>{sessionStorage.setItem(a,araw);sessionStorage.setItem("qa-owner-fault","1");history.replaceState(history.state,"",`/?bet=${market}.YES.500`);},{a,araw,market});
 await page.reload({waitUntil:"domcontentloaded",timeout:120000});await waitFrame(page,"inDoubt");await page.waitForFunction(sel=>document.querySelector(sel)?.disabled===true,CTA,{timeout:30000});
 const faultPositive={raw:await storage(page,a),disabled:await page.locator(CTA).isDisabled(),positions:(await observe(A.ctx,market)).positionCount};
 check("owned positive receipt plus storage fault keeps the key and disables another dispatch",faultPositive.raw===araw&&faultPositive.disabled&&faultPositive.positions===1,faultPositive);
 await page.screenshot({path:resolve(OUT,"receipt-storage-fault.png")});
 // A separate fresh page owns the scoped null + retirement fault experiment.
 const nullPage=await pageIn(ctx);const nraw=owned(A.user.userId,market,key(6));await nullPage.evaluate(({a,nraw})=>{sessionStorage.removeItem("qa-owner-fault");window.__ownerWriteFault=false;sessionStorage.setItem(a,nraw);},{a,nraw});await nullPage.goto(`${BASE}/?bet=${market}.YES.500`,{waitUntil:"domcontentloaded",timeout:120000});await waitFrame(nullPage,"inDoubt");
 await nullPage.evaluate(()=>{window.__ownerWriteFault=true;window.__ownerClock=700000;window.dispatchEvent(new Event("focus"));});await nullPage.waitForFunction(sel=>document.querySelector(sel)?.disabled===true,CTA,{timeout:30000});
 check("owned successful null after wait plus storage fault retains its original key and lock",await storage(nullPage,a)===nraw&&(await observe(A.ctx,market)).positionCount===1);
 await page.close();await nullPage.close();
 // Legacy owner is deliberately absent: B must hold it through age and null; A can prove the original exact tuple.
 const legacyCtx=await context(B.session,pass),legacyPage=await pageIn(legacyCtx),legacy=JSON.stringify({bet:`${market}.YES.500`,at:Date.now()-3*86400000,k:key(1)});
 await legacyPage.evaluate(raw=>sessionStorage.setItem("kp-pending-bet",raw),legacy);await legacyPage.goto(`${BASE}/?bet=${market}.YES.500`,{waitUntil:"domcontentloaded",timeout:120000});await waitFrame(legacyPage,"inDoubt");
 await legacyPage.evaluate(()=>{window.__ownerClock=700000;window.dispatchEvent(new Event("focus"));});await legacyPage.waitForTimeout(1000);
 let archive=JSON.parse(await storage(legacyPage,"kp-sheet-intents:legacy:v1"));
 check("expired legacy key is quarantined durably; foreign scoped null never adopts or retires it",archive.records.includes(legacy)&&!archive.resolved[key(1)]&&await legacyPage.locator(CTA).isDisabled()&&(await observe(B.ctx,market)).positionCount===0);
 await switchOwner(legacyPage,legacyCtx,A.session);await waitFrame(legacyPage,"receipt");archive=JSON.parse(await storage(legacyPage,"kp-sheet-intents:legacy:v1"));
 check("original A private positive receipt resolves only the exact legacy tuple and preserves historic bytes",archive.records.includes(legacy)&&archive.resolved[key(1)]?.ownerId===A.user.userId&&archive.resolved[key(1)].quote.stake===500&&(await observe(A.ctx,market)).positionCount===1);
 await legacyPage.screenshot({path:resolve(OUT,"legacy-owned-receipt.png")});
 check("actual owner drives have no uncaught page errors",errors.length===0,{errors});
}catch(error){results.push({name:"driver completion",pass:false,detail:{message:error.message}});console.error(error.stack);}
finally{writeFileSync(resolve(OUT,"evidence.json"),JSON.stringify({base:BASE,results,errors,reads},null,2));for(const c of contexts)await c.close().catch(()=>{});await browser?.close();}
console.log(`${results.filter(r=>r.pass).length}/${results.length} owner browser checks`);process.exitCode=results.every(r=>r.pass)?0:1;
