/** Account recovery contracts and actual controller callbacks. No database, browser, or money writes. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {PENDING_BET_KEY, PENDING_BET_TTL_MS, readMarker, writeMarker, stakeFromUrl} from "../src/lib/journey/pending-bet.ts";
import {ownedSheetIntents, legacySheetIntents, sheetOwnerKey, saveOwnedSheet, quarantineLegacySheet, saveSheetSelection, unresolvedLegacySheet,
  resolveLegacySheet, SHEET_LEGACY_KEY, SHEET_RECOVERY_MAX_BYTES, type TabStorage} from "../src/lib/journey/sheet-owned-storage.ts";
import {afterKeyRead, requestFor, reopenInDoubt, sheetFrame, nextKey, quoteAt, withBet, type Quote} from "../src/lib/journey/sheet-state.ts";
import {answerOf} from "../src/lib/journey/sheet-refusal.ts";
import {attributionFrom} from "../src/lib/journey/pending-bet.ts";
import {parseSheetSeed} from "../src/lib/journey/sheet-seed.ts";
import {decomment} from "./lib/decomment.mts";
import {execFileSync} from "node:child_process";
import {sameS8PublishedWords,s8PublishedWords} from "./lib/s8-published-words.mts";

const NOW = Date.UTC(2026,9,14,12), OWNER="usr_owner_A", OTHER="usr_owner_B";
const quote: Quote={marketId:"mkt_ownercheck",side:"YES",stake:500};
const key=(n:number)=>`01234567-89ab-4cde-8fab-${String(n).padStart(12,"0")}`;
const entry=(n:number, q=quote)=>({quote:q,key:key(n),at:NOW-PENDING_BET_TTL_MS*3});
const memory=()=>{const bytes=new Map<string,string>(); const storage:TabStorage={getItem:k=>bytes.get(k)??null,setItem:(k,v)=>{bytes.set(k,v);},removeItem:k=>{bytes.delete(k);}}; return{bytes,storage};};
let passed=0;
const check=(name:string,fn:()=>unknown)=>{fn();passed++;console.log(`PASS ${name}`);};
const checkAsync=async(name:string,fn:()=>Promise<unknown>)=>{await fn();passed++;console.log(`PASS ${name}`);};
const a=sheetOwnerKey(OWNER)!, b=sheetOwnerKey(OTHER)!;
check("A → B → A retains each original key on the same question beyond the selection TTL",()=>{
  const {bytes,storage}=memory();assert(saveOwnedSheet(storage,OWNER,[entry(1)]));const original=bytes.get(a);
  assert(saveOwnedSheet(storage,OTHER,[entry(2)]));assert.equal(bytes.get(a),original);
  assert.deepEqual(ownedSheetIntents(bytes.get(a)!,OWNER),[entry(1)]);assert.deepEqual(ownedSheetIntents(bytes.get(b)!,OTHER),[entry(2)]);
  assert(saveOwnedSheet(storage,OTHER,[]));assert.equal(bytes.get(a),original);assert.throws(()=>ownedSheetIntents(bytes.get(a)!,OTHER));
});
check("ambiguous duplicate identities, corrupt stores and invalid owners fail closed without overwriting",()=>{
  const {bytes,storage}=memory();assert(saveOwnedSheet(storage,OWNER,[entry(1)]));const original=bytes.get(a);
  assert(!saveOwnedSheet(storage,OWNER,[entry(1),entry(2)]));assert.equal(bytes.get(a),original);
  bytes.set(a,"broken");assert(!saveOwnedSheet(storage,OWNER,[]));assert.equal(bytes.get(a),"broken");assert.equal(sheetOwnerKey("../usr"),null);
});
check("quota and exact readback faults refuse writes and never evict another owner",()=>{
  const {bytes,storage}=memory();assert(saveOwnedSheet(storage,OWNER,[entry(1)]));const original=bytes.get(a);
  const fault:TabStorage={...storage,setItem:()=>{throw new Error("quota");}};assert(!saveOwnedSheet(fault,OTHER,[entry(2)]));assert.equal(bytes.get(a),original);
  const unread:TabStorage={...storage,getItem:k=>k===b?null:storage.getItem(k)};assert(!saveOwnedSheet(unread,OTHER,[entry(2)]));assert.equal(bytes.get(a),original);
  const huge=Array.from({length:2000},(_,i)=>entry(i,{...quote,marketId:`mkt_large${i}`}));assert(!saveOwnedSheet(storage,OTHER,huge));assert.equal(bytes.get(a),original);
});
check("legacy keys are quarantined before shared selection replacement, without a 24-hour expiry",()=>{
  const {bytes,storage}=memory(),old=writeMarker({kind:"market",id:quote.marketId,side:quote.side,stake:quote.stake},entry(1).at,{},key(1));
  bytes.set(PENDING_BET_KEY,old);assert.equal(readMarker(old,NOW),null);assert(quarantineLegacySheet(storage));
  const selection=writeMarker({kind:"market",id:"mkt_fresh",side:"NO",stake:700},NOW,{ref:"keepref",utm:{utm_source:"keep"}},undefined,OTHER);
  assert(saveSheetSelection(storage,selection));assert.equal(bytes.get(PENDING_BET_KEY),selection);
  assert.deepEqual(unresolvedLegacySheet(storage),[entry(1)]);assert(JSON.parse(bytes.get(SHEET_LEGACY_KEY)!).records.includes(old));
});
check("null, foreign owner, and changed original tuples never adopt a legacy key; exact owned positive proof does",()=>{
  const {bytes,storage}=memory(),old=writeMarker({kind:"market",id:quote.marketId,side:quote.side,stake:quote.stake},entry(1).at,{},key(1));bytes.set(PENDING_BET_KEY,old);assert(quarantineLegacySheet(storage));
  const proof={ownerId:OWNER,positionId:"pos_original",quote};
  assert(!resolveLegacySheet(storage,OTHER,key(1),proof));assert(!resolveLegacySheet(storage,OWNER,key(1),{...proof,quote:{...quote,stake:501}}));
  assert(!resolveLegacySheet(storage,OWNER,key(1),null as never));assert.equal(unresolvedLegacySheet(storage).length,1);
  assert(resolveLegacySheet(storage,OWNER,key(1),proof));assert.equal(unresolvedLegacySheet(storage).length,0);
  const archive=JSON.parse(bytes.get(SHEET_LEGACY_KEY)!);assert(archive.records.includes(old));assert.deepEqual(archive.resolved[key(1)],proof);
});
check("unreadable legacy or quarantine/readback failure preserves the shared authoritative envelope",()=>{
  const {bytes,storage}=memory();bytes.set(PENDING_BET_KEY,'{"k":"broken"}');assert(!saveSheetSelection(storage,null));assert.equal(bytes.get(PENDING_BET_KEY),'{"k":"broken"}');
  const old=writeMarker({kind:"market",id:quote.marketId,side:quote.side,stake:500},NOW,{},key(1));bytes.set(PENDING_BET_KEY,old);
  const fault:TabStorage={...storage,setItem:()=>{throw new Error("quota");}};assert(!saveSheetSelection(fault,null));assert.equal(bytes.get(PENDING_BET_KEY),old);
  const unread:TabStorage={...storage,getItem:k=>k===SHEET_LEGACY_KEY?null:storage.getItem(k)};assert(!saveSheetSelection(unread,null));assert.equal(bytes.get(PENDING_BET_KEY),old);
});
check("identical legacy repeats retain the earliest age; conflicting same-key tuples within or across envelopes fail closed",()=>{
  const old=writeMarker({kind:"market",id:quote.marketId,side:quote.side,stake:500},NOW-100,{},key(1));
  const repeated=JSON.stringify({...JSON.parse(old),pending:[{...JSON.parse(old),at:NOW-1000}]});assert.equal(legacySheetIntents(repeated)[0].at,NOW-1000);
  const conflict=JSON.stringify({...JSON.parse(old),pending:[{...JSON.parse(old),bet:`${quote.marketId}.YES.600`}]});assert.throws(()=>legacySheetIntents(conflict));
  const {bytes,storage}=memory();bytes.set(PENDING_BET_KEY,conflict);assert(!quarantineLegacySheet(storage));assert.equal(bytes.get(PENDING_BET_KEY),conflict);
  bytes.set(PENDING_BET_KEY,old);assert(quarantineLegacySheet(storage));const authoritative=bytes.get(SHEET_LEGACY_KEY);
  bytes.set(PENDING_BET_KEY,writeMarker({kind:"market",id:"mkt_other",side:"YES",stake:500},NOW,{},key(1)));assert(!quarantineLegacySheet(storage));assert.equal(bytes.get(SHEET_LEGACY_KEY),authoritative);
});
check("only a keyless matching-owner or guest selection supplies a URL stake; selection expiry stays 24 hours",()=>{
  const bet={kind:"market" as const,id:quote.marketId,side:quote.side,stake:quote.stake};
  const raw=writeMarker(bet,NOW,{ref:"keepref"},undefined,OWNER);assert.equal(stakeFromUrl(bet,raw,NOW,OWNER),500);assert.equal(stakeFromUrl(bet,raw,NOW,OTHER),null);
  assert.equal(stakeFromUrl(bet,writeMarker(bet,NOW,{},key(1)),NOW,OWNER),null);
  assert.equal(stakeFromUrl(bet,writeMarker(bet,NOW),NOW,OTHER),500);assert.equal(readMarker(raw,NOW+PENDING_BET_TTL_MS),null);
  assert.equal(readMarker(raw,NOW+PENDING_BET_TTL_MS-1)?.ref,"KEEPREF");assert.equal(requestFor(quote,key(1),OWNER)?.get("expectedOwnerId"),OWNER);
});

const HOST=decomment(readFileSync(new URL("../src/components/journey/bet-sheet/bet-sheet-host.tsx",import.meta.url),"utf8"));
function arrow(source:string,name:string){const file=ts.createSourceFile("host.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let node:ts.ArrowFunction|undefined;
  const visit=(n:ts.Node)=>{if(ts.isVariableDeclaration(n)&&n.name.getText(file)===name&&n.initializer){if(ts.isCallExpression(n.initializer)&&ts.isArrowFunction(n.initializer.arguments[0]))node=n.initializer.arguments[0];else if(ts.isArrowFunction(n.initializer))node=n.initializer;}ts.forEachChild(n,visit);};visit(file);if(!node)throw new Error(`Missing ${name}`);return node.getText(file);}
function bind(source:string,name:string,deps:Record<string,unknown>){const js=ts.transpileModule(`const fn=${arrow(source,name)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return new Function(...Object.keys(deps),`${js}\nreturn fn;`)(...Object.values(deps));}
function plant(source:string,name:string,from:string,to:string){const old=arrow(source,name);assert.equal(old.split(from).length,2,`unique ${name} plant`);return source.replace(old,old.replace(from,to));}
async function privateRead(source:string,body:unknown,{status=200,stale=false}:{status?:number;stale?:boolean}={}){
  const ownerEpoch={current:0},ownerInvalid={current:false};let changed=0,release!:(v:unknown)=>void;
  const fetch=()=>new Promise(r=>{release=r;});
  const read=bind(source,"readTruth",{ownerEpoch,ownerInvalid,mounted:{current:true},current:{current:null},viewerId:OWNER,router:{push:()=>{}},parseSheetSeed,
    invalidateOwner:()=>{changed++;ownerInvalid.current=true;ownerEpoch.current++;},fetch});
  const promise=read(quote,{key:key(1)});if(stale)ownerEpoch.current++;
  release({status,ok:status===200,json:async()=>body});const result=await promise;return{result,changed};
}
const receiptBody={public:null,me:{viewerId:OWNER,keyPosition:{positionId:"pos_original",quote}}};
const privateVerdicts=async(source:string)=>({
  own:(await privateRead(source,receiptBody)).result.reread.state==="read",
  missing:await (async()=>{const v=await privateRead(source,{...receiptBody,me:{keyPosition:null}});return v.result.reread.state==="failed"&&v.changed===0;})(),
  foreign:(await privateRead(source,{...receiptBody,me:{viewerId:OTHER,keyPosition:null}})).changed===1,
  bare404:(await privateRead(source,null,{status:404})).result.reread.state==="failed",
  stale:(await privateRead(source,receiptBody,{stale:true})).result.reread.state==="failed",
});
const real=await privateVerdicts(HOST);check("actual private reader requires authenticated identity and ignores stale epochs, including bare 404",()=>assert.deepEqual(real,{own:true,missing:true,foreign:true,bare404:true,stale:true}));
await checkAsync("actual known 401 ends the A epoch; its previously pending positive private response is ignored",async()=>{
  const ownerEpoch={current:0},ownerInvalid={current:false},mounted={current:true},ready={current:true};let reloads=0;
  const {bytes,storage}=memory();assert(saveOwnedSheet(storage,OWNER,[entry(1)]));const authoritative=bytes.get(a);
  const pending={current:new Map([[`${quote.marketId}.${quote.side}`,entry(1)]])},current={current:{}},releases:Array<(v:unknown)=>void>=[];
  const invalidateOwner=bind(HOST,"invalidateOwner",{ownerInvalid,recoveryReady:ready,ownerEpoch,generation:{current:0},pending,closedReceipts:{current:new Map()},requests:{current:new Set()},readingKeys:{current:new Set()},readSequences:{current:new Map()},lastView:{current:{}},show:(v:unknown)=>{current.current=v as {};},window:{location:{reload:()=>{reloads++;}}}});
  const read=bind(HOST,"readTruth",{ownerEpoch,ownerInvalid,mounted,current,viewerId:OWNER,router:{push:()=>{}},parseSheetSeed,invalidateOwner,fetch:()=>new Promise(r=>releases.push(r))});
  const late=read(quote,{key:key(1)}),auth=read(quote,{key:key(1)});releases[1]({status:401,ok:false});assert.equal((await auth).reread.state,"failed");
  releases[0]({status:200,ok:true,json:async()=>receiptBody});assert.equal((await late).reread.state,"failed");assert.equal(ownerEpoch.current,1);assert(ownerInvalid.current);assert(!ready.current);assert.equal(pending.current.size,0);assert.equal(reloads,1);assert.equal(bytes.get(a),authoritative);
});
for(const [name,from,to,field] of [
  ["foreign","if (body.me.viewerId !== viewerId) { invalidateOwner(); return failed; }","", "foreign"],
  ["missing",'if (typeof body?.me?.viewerId !== "string") return failed;',"", "missing"],
  ["404",'if (response.status === 404) return failed;','if (response.status === 404) return { ...failed, reread: { state: "read", market: { found: false }, viewer: null } };',"bare404"],
] as const){const verdict=await privateVerdicts(plant(HOST,"readTruth",from,to));check(`plant ${name} fails its actual private-reader verdict`,()=>assert.equal(verdict[field],false));}
const stalePlant=HOST.replaceAll('epoch !== ownerEpoch.current || ',"");assert.notEqual(stalePlant,HOST);await checkAsync("plant stale epoch adoption fails the same reader verdict",async()=>assert.equal((await privateVerdicts(stalePlant)).stale,false));

async function keyRead(source:string,state:"failed"|"read",epoch=0,owner=OWNER,stake=500){
  const record={intent:reopenInDoubt(quote,key(1),NOW-700_000),at:NOW-700_000,owner,epoch:0,lastRead:0},pending={current:new Map([[`${quote.marketId}.${quote.side}`,record]])};let receipts=0,saves=0;
  const read=bind(source,"readKey",{mounted:{current:true},viewerId:OWNER,ownerEpoch:{current:epoch},pending,readingKeys:{current:new Set()},current:{current:null},selected:{current:null},
    Date:{now:()=>NOW},
    identity:(q:Quote)=>`${q.marketId}.${q.side}`,activeIdentity:()=>"",readTruth:async()=>({reread:{state},keyPosition:stake===0?null:{positionId:"pos_original",quote:{...quote,stake}}}),
    receipt:()=>{receipts++;},afterKeyRead,save:()=>{saves++;return true;},recoveryReady:{current:true},show:()=>{},revise:()=>{},refreshed:()=>{}});
  await read(record);return{remaining:pending.current.size,receipts,saves};
}
await checkAsync("actual key reader retires only an owned successful null and exact original positive tuple",async()=>{
  assert.deepEqual(await keyRead(HOST,"read",0,OWNER,0),{remaining:0,receipts:0,saves:1});
  assert.deepEqual(await keyRead(HOST,"failed",0,OWNER,0),{remaining:1,receipts:0,saves:0});
  assert.deepEqual(await keyRead(HOST,"read",0,OTHER,0),{remaining:1,receipts:0,saves:0});
  assert.deepEqual(await keyRead(HOST,"read",1,OWNER,0),{remaining:1,receipts:0,saves:0});
  assert.equal((await keyRead(HOST,"read",0,OWNER,501)).receipts,0);assert.equal((await keyRead(HOST,"read")).receipts,1);
});
async function faultRetirement(source:string,positive:boolean){
  const {bytes,storage}=memory();assert(saveOwnedSheet(storage,OWNER,[entry(1)]));const original=bytes.get(a);
  const pending={current:new Map([[`${quote.marketId}.${quote.side}`,{intent:reopenInDoubt(quote,key(1),NOW-700_000),at:entry(1).at,owner:OWNER,epoch:0,lastRead:0}]])};
  const selected={current:null},recoveryReady={current:true},mounted={current:true},ownerEpoch={current:0},ownerInvalid={current:false};let receipts=0;
  const window={sessionStorage:{...storage,setItem:(k:string,v:string)=>{if(k===a)throw new Error("quota after resolution");storage.setItem(k,v);}}};
  const save=bind(source,"save",{mounted,recoveryReady,ownerInvalid,pending,selected,viewerId:OWNER,window,quarantineLegacySheet,saveOwnedSheet,saveSheetSelection});
  const receipt=bind(source,"receipt",{mounted,recoveryReady,ownerInvalid,ownerEpoch,viewerId:OWNER,pending,selected,current:{current:null},identity:(q:Quote)=>`${q.marketId}.${q.side}`,
    save,revise:()=>{},show:()=>{},stripAddress:()=>{},closedReceipts:{current:new Map()},window,refreshed:()=>{},activeIdentity:()=>""});
  const record=[...pending.current.values()][0];
  if(positive)receipt(record,"pos_original",true);else{
    const read=bind(source,"readKey",{mounted,viewerId:OWNER,ownerEpoch,pending,recoveryReady,readingKeys:{current:new Set()},current:{current:null},selected,Date:{now:()=>NOW},
      identity:(q:Quote)=>`${q.marketId}.${q.side}`,activeIdentity:()=>"",readTruth:async()=>({reread:{state:"read"},keyPosition:null}),receipt:()=>{receipts++;},afterKeyRead,save,show:()=>{},revise:()=>{},refreshed:()=>{}});await read(record);
  }
  return pending.current.size===1&&!recoveryReady.current&&bytes.get(a)===original&&receipts===0;
}
await checkAsync("actual owned positive/null retirement on a storage fault keeps the original durable key and runtime lock",async()=>{assert(await faultRetirement(HOST,true));assert(await faultRetirement(HOST,false));});
const PRESENCE=decomment(readFileSync(new URL("../src/components/layout/session-presence.tsx",import.meta.url),"utf8"));
async function presence(source:string,viewerId:string,responseOwner:string,current=true){let reloads=0,assigns=0,writes=0;const check=bind(source,"check",{current,viewerId,KEY:"50pick:session-escape-at",lastCheck:{current:0},Date:{now:()=>NOW},
  fetch:async()=>({ok:true,json:async()=>({active:true,viewerId:responseOwner})}),window:{sessionStorage:{getItem:()=>String(NOW),setItem:()=>{writes++;}},location:{reload:()=>{reloads++;},assign:()=>{assigns++;},pathname:"/",search:"",hash:""}}});await check();return{reloads,assigns,writes};}
await checkAsync("actual presence A → B → A refreshes both active owners despite a recent escape stamp; never clears a valid cookie",async()=>{
  assert.deepEqual(await presence(PRESENCE,OWNER,OTHER),{reloads:1,assigns:0,writes:0});assert.deepEqual(await presence(PRESENCE,OTHER,OWNER),{reloads:1,assigns:0,writes:0});
  assert.deepEqual(await presence(PRESENCE,OWNER,OTHER,false),{reloads:0,assigns:0,writes:0});
});
const throttlePlant=plant(PRESENCE,"check","if (ownerChanged) { window.location.reload(); return; }","");
await checkAsync("plant withholding active-owner refresh fails the same rapid account-change verdict",async()=>assert.equal((await presence(throttlePlant,OWNER,OTHER)).reloads,0));
const seed={v:1 as const,id:quote.marketId,yesPool:10000,noPool:12000,rates:{feeModel:"loser-share" as const,platformFeeRate:.03,operatorFeeRate:.1},feePct:13,min:500,max:100000,closesAt:null,serverNow:NOW,bettable:true};
await checkAsync("actual commit → known401 → late A success cannot consume the saved A key or render a receipt",async()=>{
  const {bytes,storage}=memory(),mounted={current:true},ownerEpoch={current:0},ownerInvalid={current:false},recoveryReady={current:true},selected={current:null},pending={current:new Map()},requests={current:new Set()};
  const current={current:{seed,side:"YES",stakeText:"500",viewer:{state:"failed"},offset:0,serial:1,pathname:"/live",pushed:false,dropSide:false,settled:null}},window={sessionStorage:storage,history:{state:{},replaceState:()=>{}},location:{pathname:"/live",search:"",hash:"",reload:()=>{reloads++;}}};
  let reloads=0,receipts=0,dispatches=0,release!:(v:unknown)=>void,work!:Promise<void>;
  const show=(v:unknown)=>{current.current=v as typeof current.current;};const identity=(q:Quote)=>`${q.marketId}.${q.side}`,activeIdentity=(v:typeof current.current)=>`${v.seed.id}.${v.side}`;
  const save=bind(HOST,"save",{mounted,pending,selected,recoveryReady,ownerInvalid,viewerId:OWNER,window,quarantineLegacySheet,saveOwnedSheet,saveSheetSelection});
  const invalidateOwner=bind(HOST,"invalidateOwner",{ownerInvalid,recoveryReady,ownerEpoch,generation:{current:0},pending,closedReceipts:{current:new Map()},requests,readingKeys:{current:new Set()},readSequences:{current:new Map()},lastView:{current:{}},show,window});
  const commit=bind(HOST,"commit",{mounted,current,pending,requests,selected,activeIdentity,identity,sheetFrame,quoteAt,nextKey:(p:never,q:Quote)=>nextKey(p,q,()=>key(1)),requestFor,viewerId:OWNER,ownerEpoch,ownerInvalid,recoveryBlocked:()=>false,
    readMarker,writeMarker,attributionFrom,save,show,window,withBet,Date:{now:()=>NOW},revise:()=>{},startTransition:(fn:()=>Promise<void>)=>{work=fn();},answerOf,buyPositionAction:()=>{dispatches++;return new Promise(r=>{release=r;});},invalidateOwner,
    refusalOutcome:()=>{throw new Error("late answer applied");},receipt:()=>{receipts++;},readKey:()=>{}});
  commit("cta");assert.equal(dispatches,1);const saved=bytes.get(a);assert.equal(ownedSheetIntents(saved!,OWNER)[0].key,key(1));
  const read=bind(HOST,"readTruth",{ownerEpoch,ownerInvalid,mounted,current,viewerId:OWNER,router:{push:()=>{}},parseSheetSeed,invalidateOwner,fetch:async()=>({status:401,ok:false})});await read(quote);
  release({ok:true,data:{positionId:"pos_late_A"}});await work;assert.equal(receipts,0);assert.equal(reloads,1);assert.equal(bytes.get(a),saved);assert.equal(current.current,null);assert.equal(ownerEpoch.current,1);
});
check("quarantined or unavailable recovery is locked with no commit quote or estimate",()=>{
  const frame=sheetFrame({seed,side:"YES",stakeText:"500",viewer:{state:"failed"},nowMs:NOW,offsetMs:0,recoveryBlocked:true});assert(frame.stakeLocked);assert.equal(frame.cta?.enabled,false);assert.equal(frame.quote,null);assert.equal(frame.estimate,null);
});
const ACTION=decomment(readFileSync(new URL("../src/app/markets/actions.ts",import.meta.url),"utf8"));
async function dispatch(source:string,sessionOwner:string|null,hint:string|undefined,classic=false){
  const file=ts.createSourceFile("actions.ts",source,ts.ScriptTarget.Latest,true);const fn=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==="buyPositionAction");
  assert(fn);let calls=0,calledOwner:string|undefined;
  const js=ts.transpileModule(fn.getText(file).replace(/^export /,""),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const action=new Function("currentSession","redirect","signInPathForAction","isHouseIntentKey","buyPosition","countBetFunnel","revalidatePath",`${js}\nreturn buyPositionAction;`)(
    async()=>sessionOwner?{userId:sessionOwner}:null,()=>{throw new Error("SIGN_IN");},async()=>"/auth/login",()=>false,
    async(owner:string)=>{calls++;calledOwner=owner;return{ok:true,data:{replayed:false}};},()=>{},()=>{});
  const form=requestFor(quote,key(1),hint)!;if(classic)form.delete("funnelOrigin");
  try{return{answer:await action(form),calls,calledOwner};}catch(error){return{answer:String(error),calls,calledOwner};}
}
await checkAsync("actual money action refuses missing/stale sheet owner before buy; matching hint never replaces session authority",async()=>{
  const missing=await dispatch(ACTION,OWNER,undefined),foreign=await dispatch(ACTION,OTHER,OWNER),own=await dispatch(ACTION,OWNER,OWNER),unauth=await dispatch(ACTION,null,OWNER),classic=await dispatch(ACTION,OTHER,undefined,true);
  assert.equal(missing.calls,0);assert.equal(missing.answer.code,"SESSION_CHANGED");assert.equal(foreign.calls,0);assert.equal(foreign.answer.code,"SESSION_CHANGED");
  assert.equal(own.calls,1);assert.equal(own.calledOwner,OWNER);assert.equal(unauth.calls,0);assert.match(unauth.answer,/SIGN_IN/);assert.equal(classic.calledOwner,OTHER);
});
const actionPlant=ACTION.replace('if ((formData.get("funnelOrigin") === "sheet" || expectedOwner !== null) && expectedOwner !== session.userId)',"if (false)");assert.notEqual(actionPlant,ACTION);
await checkAsync("plant removing the expected-owner money guard fails the same zero-dispatch verdict",async()=>assert.equal((await dispatch(actionPlant,OTHER,OWNER)).calls,1));
const privacyRel="src/app/legal/privacy/page.tsx",privacy=readFileSync(new URL(`../${privacyRel}`,import.meta.url),"utf8");
const golden=execFileSync("git",["show",`origin/main:${privacyRel}`],{encoding:"utf8"});
check("exact three new privacy paragraphs/version are pinned while unrelated published legal words remain unchanged",()=>{assert.equal(s8PublishedWords(privacyRel,privacy).count,3);assert(sameS8PublishedWords(privacyRel,privacy,golden));});
for(const phrase of ["kp-sheet-intents:v2:","kp-sheet-intents:legacy:v1","no 24-hour expiry","account identifier","confirmed receipt details, until closing the tab",
  "haziishi baada ya saa 24","kitambulisho cha akaunti","hadi ukifunga kichupo","没有 24 小时的过期限制","账户标识符","直到关闭标签页","Version 2026-10-14","No advertising cookies."]){
  const changed=privacy.replace(phrase,`[changed ${phrase}]`);check(`published-word plant: ${phrase}`,()=>{assert.notEqual(changed,privacy);assert(!sameS8PublishedWords(privacyRel,changed,golden));});
}
assert.equal(SHEET_RECOVERY_MAX_BYTES,64000);console.log(`ALL PASS — ${passed} assertions, actual callback/action plants included`);
