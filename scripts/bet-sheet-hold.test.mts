/** Executes the fixture's guard/scope controls and verifies its acknowledgement against the REAL memory mutex. */
import { readFileSync } from "node:fs";
import { transform } from "esbuild";
import { randomUUID } from "node:crypto";
import { withLock, drainLock } from "../src/lib/server/locks";
if (process.env.DATABASE_URL) throw new Error("This fixture proof requires the memory mutex");
const source = readFileSync(new URL("../src/app/api/dev-test/bet-sheet-hold/route.ts", import.meta.url), "utf8");
let passed = 0, failed = 0;
const check = (label: string, test: boolean) => { if (test) passed++; else { failed++; console.error(`FAIL ${label}`); } };
type Options = { env?: Record<string,string>; database?: boolean; guest?: boolean; real?: boolean; missing?: boolean; uid?: string; global?: object };
async function boot(code = source, options: Options = {}) {
  const calls: unknown[] = [], timers: { ms: number; fire: () => void }[] = [], global = options.global ?? {};
  const uid = options.uid ?? `own-${randomUUID()}`, market = `mkt_${randomUUID().replaceAll("-", "")}`;
  const module = { exports: {} as { POST?: (req: Request) => Promise<Response> } };
  const imports: Record<string,unknown> = {
    "node:crypto": { randomUUID },
    "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init) } },
    "@/lib/server/auth-service": { currentSession: async () => { calls.push("auth"); return options.guest ? null : { userId: uid }; } },
    "@/lib/server/prisma": { hasDatabase: () => options.database ?? false },
    "@/lib/server/store": { db: { user: { findById: async (id: string) => { calls.push(["user",id]); return { role:"PLAYER",displayName:options.real ? "Real player" : "Local Sheet Matrix",phoneE164:"+255711234567" }; } } } },
    "@/lib/server/market-service": { getMarket: async (id: string) => { calls.push(["market",id]); return options.missing ? null : { status:"LIVE" }; } },
    "@/lib/server/locks": {
      withLock: (key: string, fn: (tx: null) => Promise<void>) => { calls.push(["lock",key]); return withLock(key,()=>fn(null)); },
      drainLock: (key: string, opts: { timeout: string }) => { calls.push(["drain",key]); return drainLock(key,opts); },
    },
  };
  const built = await transform(code,{loader:"ts",format:"cjs"});
  new Function("require","process","module","exports","globalThis","setTimeout",built.code)(
    (id: string)=>imports[id],{env:{NODE_ENV:"development",...options.env}},module,module.exports,global,
    (fn: ()=>void,ms: number)=>{ timers.push({ms,fire:fn}); return setTimeout(fn,ms); });
  const invoke = async (body: unknown) => {
    const response = await module.exports.POST!(new Request("http://localhost:3043/api/dev-test/bet-sheet-hold",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}));
    return { response, body:await response.json() };
  };
  return { calls,timers,global,uid,market,invoke };
}
for(const options of [{env:{NODE_ENV:"production"}},{env:{DATABASE_URL:"blocked"}},{database:true}]){
  const r=await boot(source,options), got=await r.invoke({operation:"hold",marketId:r.market});
  check("production/database refuse before auth, reads or real mutex",[404,409].includes(got.response.status)&&r.calls.length===0);
}
const guest=await boot(source,{guest:true}); check("guest stops at auth",(await guest.invoke({operation:"hold",marketId:guest.market})).response.status===401&&JSON.stringify(guest.calls)==='["auth"]');
for(const body of [{operation:"hold",marketId:"mkt_own",userId:"foreign"},{operation:"hold",marketId:"mkt_own",maxHoldMs:999999},{operation:"status",holdId:"wrong"},{operation:"other"},{operation:"hold",marketId:""},{}]){
  const r=await boot(),got=await r.invoke(body); check("foreign/unbounded/malformed scope stops before reads or mutex",got.response.status===400&&JSON.stringify(r.calls)==='["auth"]');
}
const real=await boot(source,{real:true}); check("real account stops before public read or lock",(await real.invoke({operation:"hold",marketId:real.market})).response.status===403&&real.calls.length===2);
const absent=await boot(source,{missing:true}); check("missing question has no lock",(await absent.invoke({operation:"hold",marketId:absent.market})).response.status===404&&!absent.calls.some(c=>Array.isArray(c)&&c[0]==="lock"));
const own=await boot(),held=await own.invoke({operation:"hold",marketId:own.market});
try{
  check("held acknowledgement is the actual market mutex",held.body.held===true&&held.body.maxHoldMs===90000&&await drainLock(`market:${own.market}`,{timeout:"20ms"})==="busy");
  check("response uncached and carries no user/phone/market projection",held.response.headers.get("Cache-Control")==="no-store"&&!/userId|phone|marketId/.test(JSON.stringify(held.body)));
  check("own wallet starts drained",(await own.invoke({operation:"status",holdId:held.body.holdId})).body.ownWalletBusy===false);
  let releaseWallet!:()=>void, acquiredWallet!:()=>void;
  const ready=new Promise<void>(r=>{acquiredWallet=r;}),until=new Promise<void>(r=>{releaseWallet=r;});
  const work=withLock(`wallet:${own.uid}`,async()=>{acquiredWallet();await until;}); await ready;
  try{check("own-wallet busy status comes from the actual wallet mutex",(await own.invoke({operation:"status",holdId:held.body.holdId})).body.ownWalletBusy===true);}
  finally{releaseWallet();await work;}
  const foreign=await boot(source,{global:own.global});
  const got=await foreign.invoke({operation:"status",holdId:held.body.holdId});
  check("another authenticated synthetic player cannot inspect or release a hold",got.response.status===404&&!foreign.calls.some(c=>Array.isArray(c)&&c[0]==="drain")&&(await foreign.invoke({operation:"release",holdId:held.body.holdId})).response.status===404);
  check("one fixed fixture slot refuses another hold",(await own.invoke({operation:"hold",marketId:own.market})).response.status===409);
}finally{await own.invoke({operation:"release",holdId:held.body.holdId});}
check("explicit release drains the actual market mutex",await drainLock(`market:${own.market}`,{timeout:"20ms"})==="drained");
const expiring=await boot(),expireHeld=await expiring.invoke({operation:"hold",marketId:expiring.market});
expiring.timers.find(t=>t.ms===90000)!.fire();
check("fixed90-second expiry releases the actual mutex without caller input",await drainLock(`market:${expiring.market}`,{timeout:"50ms"})==="drained"&&(await expiring.invoke({operation:"status",holdId:expireHeld.body.holdId})).response.status===404);
for(const [anchor,options] of [['process.env.NODE_ENV === "production"',{env:{NODE_ENV:"production"}}],["process.env.DATABASE_URL || hasDatabase()",{env:{DATABASE_URL:"blocked"}}]] as const){
  check("single guard anchor",source.split(anchor).length===2); const r=await boot(source.replace(anchor,"false"),options),got=await r.invoke({operation:"hold",marketId:r.market});
  try{check("RED removing a guard acquires a forbidden actual lock",r.calls.some(c=>Array.isArray(c)&&c[0]==="lock")&&await drainLock(`market:${r.market}`,{timeout:"20ms"})==="busy");}
  finally{if(got.body.holdId)await r.invoke({operation:"release",holdId:got.body.holdId});}
}
const badExpiry=await boot(source.replace("setTimeout(release, HOLD_MS)","setTimeout(() => {}, HOLD_MS)")),bad=await badExpiry.invoke({operation:"hold",marketId:badExpiry.market});
try{badExpiry.timers.find(t=>t.ms===90000)!.fire();check("RED removing expiry fails the same real drained-mutex verdict",await drainLock(`market:${badExpiry.market}`,{timeout:"20ms"})!=="drained");}
finally{await badExpiry.invoke({operation:"release",holdId:bad.body.holdId});}
console.log(`bet-sheet-hold: ${passed} passed, ${failed} failed`); if(failed)process.exitCode=1;
