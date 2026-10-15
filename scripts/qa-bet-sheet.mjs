/** S8 WP11a: real local preview, the actual sheet/host/money action, evidence counted from the player's own rows.
 * KP_BASE=http://localhost:3043 npm run qa:bet-sheet -- [OUTSIDE_REPO_OUTPUT]
 * KP_ONLY=controls,v20,once,low,matrix,tap selects sections; ENGINE=webkit runs the keyboard/focus cells on WebKit.
 * KP_PRODUCTION=1 grades the 4x CPU tap budget only after the operator starts a local production build.
 * Refused outside an in-memory localhost preview. No production writes, database writes, credentials or source plants.
 * Exit 0 all selected cells proved; 1 defect; 2 invalid target/premise; 3 outstanding NOT MEASURED/NOT DRIVEN cells.
 * Every console/page error is retained in evidence.json; screenshots still require a human visual read.
 */
import { chromium, webkit } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { BET_SHEET_SELECTORS as S, NOT_DRIVEN_MATRIX, betSheetTracesIn, betSheetTracesControl, betSheetDomProbe, betSheetDomVerdict, onceOnlyVerdict } from "./live/bet-sheet-cells.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3043";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] ?? join(tmpdir(), `qa-bet-sheet-${Date.now()}`));
const rel = relative(ROOT, OUT);
if (!rel.startsWith("..") && !isAbsolute(rel)) { console.error("REFUSED: output must be outside the repository"); process.exit(2); }
const SECTIONS = ["controls", "v20", "keyboard", "once", "lock", "host", "lifecycle", "low", "matrix", "cooling", "doors", "tap"];
const ONLY = (process.env.KP_ONLY ?? "").split(",").filter(Boolean);
if (ONLY.some(s => !SECTIONS.includes(s))) { console.error(`REFUSED: KP_ONLY must name ${SECTIONS.join(",")}`); process.exit(2); }
const run = s => !ONLY.length || ONLY.includes(s);
const LOCALES = (process.env.KP_LOCALES ?? "sw,en,zh").split(",");
const WIDTHS = (process.env.KP_WIDTHS ?? "320,360,390,1280").split(",").map(Number);
if (LOCALES.some(locale => !["sw", "en", "zh"].includes(locale)) || WIDTHS.some(width => ![320, 360, 390, 1280].includes(width))) { console.error("REFUSED: invalid locale/width selection"); process.exit(2); }
const VIEWPORTS = WIDTHS.map(width => ({ width, height: width <= 360 ? 640 : width === 390 ? 844 : 900 }));
const RELOADS = Number(process.env.KP_RELOADS ?? "1");
if (!Number.isInteger(RELOADS) || RELOADS < 1 || RELOADS > 3) { console.error("REFUSED: KP_RELOADS must be1–3"); process.exit(2); }
const pre = await premise(BASE);
if (pre.refuse || pre.health?.security?.adminTotp !== "DISABLED") { console.error(`REFUSED: ${pre.refuse ?? "local preview needs DISABLE_ADMIN_TOTP=true"}`); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const results = [], consoleRows = [], observations = [];
let tiles = 0;
function result(label, state, detail = "") { results.push({ label, state, detail }); console.log(`${state} ${label}${detail ? ` — ${detail}` : ""}`); }
const ok = (label, test, detail = "") => result(label, test ? "PASS" : "FAIL", detail);
const nm = (label, why) => result(label, "NOT MEASURED", why);
const browser = await (process.env.ENGINE === "webkit" ? webkit : chromium).launch(process.env.QA_CHROMIUM_PATH && process.env.ENGINE !== "webkit" ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});
console.log(`qa:bet-sheet ${BASE}, ${process.env.ENGINE ?? "chromium"} ${browser.version()}, output ${OUT}`);
let PASS;
try { PASS = await mintStaffPass(browser, BASE, { phone: "+255700000088", name: "Sheet QA Support" }); }
catch (error) { console.error(`INVALID preview pass premise: ${String(error.message).split("Call log:")[0].trim()}`); await browser.close(); process.exit(2); }
const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const post = async (ctx, name, data = {}) => {
  const response = await ctx.request.post(`${BASE}/api/dev-test/${name}`, { data, timeout: 240_000 }).catch(error => { throw new Error(`${name} request failed: ${String(error.message).split("Call log:")[0].trim()}`); });
  const body = await response.json().catch(() => null);
  if (!response.ok() || body?.ok === false) throw new Error(`${name} failed (${response.status()})`);
  return body;
};
const asCookie = c => ({ name: c.name, value: c.value, domain: new URL(BASE).hostname, path: c.path || "/" });
await post(admin, "seed-admin", { role: "ADMIN", phone: "+255700000089", name: "Sheet QA Admin" });
const catalogue = await post(admin, "seed-markets");
await post(admin, "reset-rate-limits");
if (!catalogue?.ids?.length) { console.error("REFUSED: seeded board has no market"); await browser.close(); process.exit(2); }
let SESSION = await demoSession(browser, BASE);
const contexts = new Set();
async function context(locale = "en", viewport = { width: 390, height: 844 }, { preview = true, signedIn = true, controlledNetwork = false } = {}) {
  const ctx = await browser.newContext({ viewport, ...(controlledNetwork ? { serviceWorkers: "block" } : {}) }); contexts.add(ctx);
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...(preview ? [asCookie(PASS)] : []), ...(signedIn ? [asCookie(SESSION)] : [])]);
  return ctx;
}
async function pageIn(ctx, route = "/") {
  const page = await ctx.newPage();
  await readyProbe(page);
  await page.bringToFront();
  page.on("console", m => {
    if (["error", "warning"].includes(m.type())) consoleRows.push({ route, type: m.type(), text: m.text() });
    if (/hydrated but|hydration failed|server rendered HTML didn't match/i.test(m.text())) result(`${route}: hydration mismatch`, "FAIL", "Full console text, attribute and element retained in evidence.json");
  });
  page.on("pageerror", error => { consoleRows.push({ route, type: "pageerror", text: error.message }); result(`${route}: uncaught page error`, "FAIL", error.message.slice(0, 180)); });
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.waitForFunction(() => document.querySelector("main"), { timeout: 90_000 });
  await page.waitForTimeout(1200);
  return page;
}
/** Read the current authenticated owner's account partition; no QA probe may select a different account's keys. */
async function ownedRows(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/session/status", {cache: "no-store"});
    const status = await response.json();
    if (!response.ok || status.active !== true || typeof status.viewerId !== "string") throw new Error("Recovery evidence owner unreadable");
    window.__qaRecoveryKey = `kp-sheet-intents:v2:${status.viewerId}`;
    const raw = sessionStorage.getItem(window.__qaRecoveryKey);
    if (raw === null) return [];
    const record = JSON.parse(raw);
    if (record.v !== 2 || record.owner !== status.viewerId || !Array.isArray(record.pending)) throw new Error("Recovery evidence partition unreadable");
    return record.pending;
  });
}
async function readyProbe(page) {
  await page.addInitScript(tracing => {
    // This diagnostic also runs in child documents whose secure-context UUID API may be unavailable.
    // It never supplies a money intent or changes the application's crypto.
    window.__sheetDocument = globalThis.crypto?.randomUUID?.() ?? `qa-${performance.timeOrigin}-${Math.random()}`;
    if (tracing) {
      window.__sheetTrace = [];
      const identity = node => node instanceof Element ? { tag: node.tagName, id: node.id, testid: node.getAttribute("data-testid"), nearestSheet: node.closest('[data-testid="journey-bet-sheet"]')?.getAttribute("data-frame"), nearestDialog: node.closest('[role="dialog"]')?.getAttribute("aria-labelledby") } : null;
      const address = () => { const url = new URL(location.href), query = new URLSearchParams(); for (const key of ["bet", "side", "cat", "sort", "cursor"]) if (url.searchParams.has(key)) query.set(key, url.searchParams.get(key)); return url.pathname + (query.size ? `?${query}` : ""); };
      const record = (type, more = {}) => { if (window.__sheetTrace.length < 600) window.__sheetTrace.push({ type, ms: performance.now(), ready: document.readyState, document: window.__sheetDocument, address: address(), active: identity(document.activeElement), ...more }); };
      for (const type of ["focusin", "focusout"]) document.addEventListener(type, event => record(type, { target: identity(event.target), related: identity(event.relatedTarget) }), true);
      for (const type of ["DOMContentLoaded", "load", "pageshow", "popstate", "pagehide"]) window.addEventListener(type, () => record(type), true);
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function(...args) { record("focus-call", { target: identity(this), stack: new Error().stack?.split("\n").slice(1,7).join("\n") }); return focus.apply(this,args); };
      for (const method of ["pushState", "replaceState"]) {
        const original = history[method];
        history[method] = function(...args) { const result = original.apply(this,args); record(method); return result; };
      }
      let priorFrame;
      const frameRead = () => {
        const sheet = document.querySelector('[data-testid="journey-bet-sheet"]'), frame = sheet?.getAttribute("data-frame") ?? "closed", headingPresent = !!sheet?.querySelector("h2"), signature = frame + headingPresent;
        if (signature !== priorFrame) { priorFrame = signature; record("frame", { frame, headingPresent }); }
      };
      const observe = () => { new MutationObserver(frameRead).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["data-frame"]}); frameRead(); };
      if (document.body) observe(); else document.addEventListener("DOMContentLoaded",observe,{once:true});
      record("init");
    }
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
    const isHost = (target, type, listener) => (target === window || target === document) && type === "click" && typeof listener === "function" && listener.toString().includes("a[data-bet-side]");
    EventTarget.prototype.addEventListener = function(type, listener, options) { const result = add.call(this, type, listener, options); if (isHost(this, type, listener)) window.__sheetHostReady = true; return result; };
    EventTarget.prototype.removeEventListener = function(type, listener, options) { const result = remove.call(this, type, listener, options); if (isHost(this, type, listener)) window.__sheetHostReady = false; return result; };
  }, process.env.KP_TRACE === "1");
}
async function tile(page, label) {
  const receipt = await page.locator(`${S.root}[data-frame="receipt"]`).count() > 0;
  await page.evaluate(async selector => {
    await document.fonts.ready;
    const root=document.querySelector(selector),dialog=root?.closest('[role="dialog"]');
    const finite=(dialog?.getAnimations({subtree:true})??[]).filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity);
    await Promise.all(finite.map(animation=>animation.finished.catch(()=>{})));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  },S.root);
  if(receipt){
    await page.waitForFunction(selector=>{
      const root=document.querySelector(selector),panel=root?.closest('.kp-bsheet'),dialog=root?.closest('[role="dialog"]');
      if(root?.getAttribute('data-frame')!=='receipt'||!panel||dialog?.getAttribute('aria-hidden')==='true')return false;
      let opacity=1;for(let node=panel;node&&node!==document.body;node=node.parentElement)opacity*=Number(getComputedStyle(node).opacity);
      return opacity>=.999 && !(dialog?.getAnimations({subtree:true})??[]).some(animation=>animation.playState==='running'&&animation.effect?.getComputedTiming().iterations!==Infinity);
    },S.root);
  }
  const filename = `${String(++tiles).padStart(3, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").slice(0, 110)}.png`;
  await page.screenshot({ path: join(OUT, filename), fullPage: false });
  results.push({ label, state: "TILE", file: filename });
  if (process.env.KP_TRACE === "1") observations.push({ label, trace: await page.evaluate(() => window.__sheetTrace ?? []) });
}
async function probe(page, expected = {}) {
  const got = await page.evaluate(betSheetDomProbe, S);
  const errors = betSheetDomVerdict(got, expected);
  return { got, errors };
}
async function open(page, wantedId = null, side = "YES") {
  await page.waitForFunction(() => window.__sheetHostReady === true, null, { timeout: 90_000 });
  const picks = page.locator(`${S.pick}[data-bet-side="${side}"]`);
  await picks.first().waitFor({ state: "visible", timeout: 120_000 });
  const selector = await page.evaluate(([selector, id]) => {
    const list = [...document.querySelectorAll(selector)];
    return list.findIndex(a => { try { return !id || JSON.parse(a.closest("[data-sheet]").getAttribute("data-sheet")).id === id; } catch { return false; } });
  }, [`${S.pick}[data-bet-side="${side}"]`, wantedId]);
  if (selector < 0) throw new Error(`No visible pick for ${wantedId ?? "board"}`);
  const anchor = picks.nth(selector);
  const seed = await anchor.evaluate(a => JSON.parse(a.closest("[data-sheet]").getAttribute("data-sheet")));
  const beforePath = new URL(page.url()).pathname;
  await anchor.click();
  await page.locator(S.root).waitFor({ state: "visible", timeout: 90_000 });
  await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute("data-frame") !== "placing", S.root);
  if (!["blocked", "closed", "receipt"].includes(await page.locator(S.root).getAttribute("data-frame"))) await page.locator(S.stake).waitFor({ timeout: 60_000 });
  await page.waitForTimeout(350);
  ok("pick opens in place", new URL(page.url()).pathname === beforePath, new URL(page.url()).pathname === beforePath ? "" : `${beforePath}→${new URL(page.url()).pathname}`);
  return seed;
}
async function waitFrame(page, frame) {
  try { await page.waitForFunction(([selector, frame]) => document.querySelector(selector)?.getAttribute("data-frame") === frame, [S.root, frame], { timeout: 90_000 }); await page.waitForTimeout(200); }
  catch (error) { throw new Error(`Expected ${frame}; actual ${JSON.stringify((await probe(page)).got)}; ${error.message}`); }
}
/** A native push/replaceState event is not a new document. Wait for this probe's init script
 * to run again, then for the new document's rendered sheet and field, before reading recovery. */
async function waitSheetDocumentReload(page, previousDocument, timeout = 90_000) {
  if (typeof previousDocument !== "string" || !previousDocument) throw new Error("Reload probe needs the previous document identity");
  await page.waitForFunction(previous => typeof window.__sheetDocument === "string" && window.__sheetDocument !== previous,
    previousDocument, { timeout });
  await page.locator(S.root).waitFor({ state: "visible", timeout });
  await page.locator(S.stake).waitFor({ state: "visible", timeout });
}
async function observed(ctx, marketId) {
  const response = await ctx.request.get(`${BASE}/api/dev-test/bet-sheet-observe?marketId=${encodeURIComponent(marketId)}`);
  const body = await response.json().catch(() => null);
  if (!response.ok() || !body?.ok) throw new Error(`Observer premise failed (${response.status()})`);
  return body;
}
// Persistent RG changes use isolated local seeded PLAYER accounts so one hour's cooling-off cannot poison the demo
// player's later cells. The actual limits/cooling/freeze forms and services still make every decision.
async function freshPlayer(balance = 100000, {locale="en",viewport={width:390,height:844},controlledNetwork=false}={}) {
  const ctx = await context(locale, viewport, { signedIn: false, controlledNetwork });
  const phone = `+25571${String(parseInt(crypto.randomUUID().replaceAll("-", "").slice(0, 10), 16) % 10_000_000).padStart(7, "0")}`;
  const seeded = await post(ctx, "seed-admin", { role: "PLAYER", phone, name: "Local Sheet Matrix", balance });
  if (seeded.note) throw new Error("Synthetic account already existed: invalid fresh-player premise");
  return { ctx, userId: seeded.userId, phone, password: seeded.password };
}
async function sibling(ctx) {
  const other = await browser.newContext({ viewport: { width: 1280, height: 900 } }); contexts.add(other);
  await other.addCookies(await ctx.cookies(BASE)); return other;
}
async function limitsIn(other, values) {
  const page = await pageIn(other, "/profile/responsible-gambling");
  const form = page.locator('form:has(input[name="dailyLossLimit"])');
  for (const [name, value] of Object.entries(values)) await form.locator(`input[name="${name}"]`).fill(String(value));
  await form.locator('button[type="submit"]').click();
  await page.waitForURL(url => url.searchParams.get("saved") === "1");
  for (const [name, value] of Object.entries(values)) if (await page.locator(`input[name="${name}"]`).inputValue() !== String(value)) throw new Error(`Real limit ${name} did not persist`);
  await page.close();
}
async function closeContext(ctx) { await ctx.close(); contexts.delete(ctx); }
async function hydratedClick(locator) {
  for (let n = 0; n < 300; n++) {
    if (await locator.evaluate(el => {
      const props = node => node && Object.keys(node).filter(key => key.startsWith("__reactProps$")).map(key => node[key]);
      return props(el)?.some(p => typeof p.onClick === "function") || props(el.closest("form"))?.some(p => typeof p.onSubmit === "function" || typeof p.action === "function");
    })) return locator.click();
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error("Target client button did not hydrate; invalid interaction premise");
}
function actionWatch(page) {
  const requests = [];
  const listener = request => { if (request.method() === "POST" && request.headers()["next-action"] && request.postData()?.includes("idempotencyKey")) requests.push(request); };
  page.on("request", listener);
  return { requests, stop: () => page.off("request", listener) };
}
async function setMaintenance(enabled) {
  const page = await pageIn(admin, "/admin/system");
  try {
    const toggle = page.getByLabel("Maintenance mode", { exact: true });
    await toggle.waitFor({ timeout: 90_000 });
    const isOn = await toggle.getAttribute("aria-checked") === "true";
    if (isOn !== enabled) {
      await toggle.click();
      const card = toggle.locator("xpath=ancestor::section[1]");
      const button = page.getByRole("button", { name: enabled ? "Enable maintenance" : "Save", exact: true });
      await button.filter({ visible: true }).first().click();
      await page.waitForTimeout(700);
      await page.reload({ waitUntil: "domcontentloaded" });
    }
    if ((await toggle.getAttribute("aria-checked") === "true") !== enabled) throw new Error("Maintenance switch did not persist");
  } finally { await page.close(); }
}

async function coolingOffDrive(){
  const {ctx:player,phone,password}=await freshPlayer(),page=await pageIn(player),seed=await open(page),other=await sibling(player),before=await observed(player,seed.id);
  if(typeof password!=="string"||!password)throw new Error("Synthetic owner password absent; invalid actual-login premise");
  const rg=await pageIn(other,"/profile/responsible-gambling");
  await rg.locator("#break").getByRole("button",{name:"Start a break",exact:true}).click();
  await rg.getByRole("alertdialog").waitFor({state:"visible"});
  await rg.waitForFunction(()=>document.querySelector('[role="alertdialog"]')?.contains(document.activeElement));
  await rg.waitForTimeout(450); // The actual confirm portal's400ms arming beat.
  await rg.getByRole("alertdialog").getByRole("button",{name:"Start a break",exact:true}).click();
  try{await rg.waitForURL(url=>url.pathname==="/auth/login"&&url.searchParams.has("cooled"));}
  catch{await tile(rg,"cooling-confirm-navigation-failure");throw new Error(`Actual cooling confirm did not reach cooled sign-in: ${new URL(rg.url()).pathname+new URL(rg.url()).search}; visible dialog=${await rg.getByRole("alertdialog").count()}`);}
  await page.locator(S.place).click();
  await page.waitForURL(url=>url.pathname==="/auth/login",{timeout:90_000});
  await page.locator(S.root).waitFor({state:"hidden"});
  try{await page.locator("#identifier").waitFor({state:"visible"});}
  catch{
    await tile(page,"cooling-final-sign-in-render-failure");
    throw new Error(`Cooling redirect never rendered sign-in at ${new URL(page.url()).origin+new URL(page.url()).pathname}; document=${JSON.stringify(await page.evaluate(()=>({ready:document.readyState,secure:isSecureContext,title:document.title,forms:document.forms.length,bodyBytes:document.body?.innerHTML.length??0})))}`);
  }
  ok("real cooling-off in second context after open rejects mid-bet and reaches rendered sign-in",!await page.locator(S.root).count()&&!await page.locator('[role="dialog"][aria-modal="true"]').count());
  await tile(page,"matrix-cooling-off-rendered-sign-in");
  ok("cooling-off observer is not usable after session revocation",(await player.request.get(`${BASE}/api/dev-test/bet-sheet-observe?marketId=${seed.id}`)).status()===401);
  await page.waitForFunction(()=>{
    const input=document.getElementById("identifier");
    return input&&Object.keys(input).some(key=>key.startsWith("__reactProps$")&&typeof input[key].onChange==="function");
  });
  await page.locator("#identifier").fill(phone.slice(4));
  await page.waitForFunction(raw=>document.querySelector('input[type="hidden"][name="identifier"]')?.value===raw,phone.slice(4));
  await page.locator('input[name="password"]').fill(password);
  await hydratedClick(page.locator('form:has(input[name="password"]) button[type="submit"]'));
  try{await page.waitForURL(url=>url.pathname==="/",{timeout:90_000});}
  catch{await tile(page,"cooling-own-password-login-failure");throw new Error(`Synthetic owner login did not reach home: ${new URL(page.url()).pathname}; error=${new URL(page.url()).searchParams.get("error")??"none"}; identifier carrier digit count=${await page.locator('input[type="hidden"][name="identifier"]').inputValue().then(value=>value.length).catch(()=>-1)}`);}
  await page.getByTestId("journey-home-break").waitFor({state:"visible"});
  await page.getByTestId("journey-balance").getByText("TZS 100,000",{exact:true}).filter({visible:true}).waitFor();
  const after=await observed(player,seed.id);
  ok("cooling-off refused bet: real own password login preserves100000 wallet, break and own money rows",after.positionCount===before.positionCount&&after.betPlacedCount===before.betPlacedCount,"actual same-owner login, no seed reset; rendered break/balance and authenticated own positions/BET_PLACED recounted");
  await tile(page,"matrix-cooling-off-own-login-preserves-wallet-break");
  await closeContext(other);await closeContext(player);
}

try {
  ok("S8 served trace matcher controls", betSheetTracesControl().length === 0, betSheetTracesControl().join("; "));
  if (run("controls")) {
    for (const route of ["/", "/live", `/markets/${catalogue.ids[0].id}`]) {
      const ctx = await context("en", { width: 390, height: 844 }, { preview: false });
      const page = await pageIn(ctx, route);
      const traces = betSheetTracesIn(await page.content());
      ok(`classic ${route}: no S8 trace`, traces.length === 0, traces.join(","));
      if (route.startsWith("/markets/")) {
        await page.locator('[data-testid="side-picker"] .btn-yes').click();
        await page.locator('[data-testid="dial-lock-toggle"]').waitFor({ state: "visible", timeout: 30_000 });
        ok("classic question keeps its dial", await page.locator('[data-testid="journey-bet-buttons"]').count() === 0 && await page.locator('[data-testid="dial-lock-toggle"]').count() > 0);
      }
      await ctx.close(); contexts.delete(ctx);
    }
    const guest = await context("en", { width: 390, height: 844 }, { signedIn: false });
    const page = await pageIn(guest);
    const pick = page.locator('a.kp-jcard__pick').first();
    if (await pick.count()) {
      const href = await pick.getAttribute("href"); await pick.click();
      await page.locator(`${S.root}[data-guest]`).waitFor({ state: "visible", timeout: 30_000 });
      const address = new URL(page.url());
      ok("journey guest pick opens the public sheet in place", !!href && address.pathname === "/"
        && address.searchParams.has("bet") && await page.locator(`${S.root} [data-testid="journey-sheet-signup"]`).count() === 1
        && await page.locator(`${S.root} [data-testid="journey-sheet-place"]`).count() === 0);
    } else nm("journey guest pick", "no pick on seeded guest home");
    await guest.close(); contexts.delete(guest);
  }

  if (run("keyboard")) for(const locale of LOCALES) for(const viewport of VIEWPORTS.filter(viewport=>viewport.width<=360)){
    const {ctx}=await freshPlayer(100000,{locale,viewport}),page=await pageIn(ctx),seed=await open(page),watch=actionWatch(page);
    const label=`${locale} ${viewport.width}x${viewport.height}`;
    await page.locator(`${S.root} .kp-bsheet__balance`).getByText("TZS 100,000",{exact:true}).waitFor();
    await page.locator(S.stake).focus();
    await page.evaluate(()=>{
      Object.defineProperty(window.visualViewport,"height",{configurable:true,value:340});
      Object.defineProperty(window.visualViewport,"offsetTop",{configurable:true,value:0});
      window.visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.waitForTimeout(200);
    for(const stake of [seed.min,seed.max,Math.max(seed.min,seed.max-500),seed.min]){
      await page.locator(S.stake).fill(String(stake));await page.waitForTimeout(250);
      const p=await probe(page,{keyboard:true}),focused=await page.locator(S.stake).evaluate(input=>document.activeElement===input);
      ok(`${label}: focused typing${stake} keeps field painted, CloseX and CTA above keyboard`,focused&&!p.errors.length,p.errors.length?`${p.errors.join(";")} ${JSON.stringify({stake:p.got.stake,scroll:p.got.scroll,place:p.got.place,close:p.got.close})}`:"real input changes with unchanged visual viewport; focus remains on field");
      if(stake===seed.max)await tile(page,`keyboard-${label}-maximum-long-cta`);
    }
    const clipped=await page.addStyleTag({content:`${S.scroll}{max-height:20px!important;}`});
    ok(`${label}: RED clipped typed field fails same keyboard verdict`,(await probe(page,{keyboard:true})).errors.includes("stake is clipped by the sheet scroller"));
    await clipped.evaluate(style=>style.remove());
    const closePlant=await page.addStyleTag({content:`${S.close}{position:fixed!important;top:1000px!important;}`});
    ok(`${label}: RED offscreen CloseX fails same keyboard verdict`,(await probe(page,{keyboard:true})).errors.includes("CloseX lies behind the keyboard"));
    await closePlant.evaluate(style=>style.remove());
    ok(`${label}: keyboard editing sends zero money actions`,watch.requests.length===0);
    await page.evaluate(()=>{delete window.visualViewport.height;delete window.visualViewport.offsetTop;window.visualViewport.dispatchEvent(new Event("resize"));});
    watch.stop();await closeContext(ctx);
  }

  if (run("v20")) for (const locale of LOCALES) for (const viewport of VIEWPORTS) {
    const label = `${locale} ${viewport.width}x${viewport.height}`;
    const ctx = await context(locale, viewport), page = await pageIn(ctx);
    const seed = await open(page);
    const entry = await probe(page, { frame: "edit", focus: true });
    ok(`${label}: initial focus, no overflow`, !entry.errors.length, entry.errors.join(";"));
    for (const key of ["Tab", "Shift+Tab"]) {
      let trapped = true;
      for (let n = 0; n < 16; n++) { await page.keyboard.press(key); trapped &&= (await probe(page)).got.focusedInside; }
      ok(`${label}: ${key} remains in sheet`, trapped);
    }
    await page.evaluate(() => {
      const outside = document.createElement("button"); outside.id = "sheet-red-focus"; outside.textContent = "Red focus plant";
      document.body.append(outside);
      const stop = event => event.stopImmediatePropagation(); window.addEventListener("focusin", stop, true);
      window.__sheetFocusCleanup = () => { window.removeEventListener("focusin", stop, true); outside.remove(); };
      outside.focus();
    });
    const redFocus = await probe(page, { trap: true });
    ok(`${label}: RED page focus escape fails the same trap verdict`, redFocus.errors.includes("focus escaped the sheet"));
    await page.evaluate(() => { window.__sheetFocusCleanup(); delete window.__sheetFocusCleanup; });
    await page.locator(S.stake).focus();
    const watch = actionWatch(page);
    await page.keyboard.press("Enter"); await page.waitForTimeout(150);
    ok(`${label}: Enter in stake sends no action`, watch.requests.length === 0);
    const safeStyle = await page.evaluate(selector => {
      const root = document.querySelector(selector), panel = root.closest(".kp-bsheet");
      const initial = {
        padding: getComputedStyle(panel).paddingBottom, cap: getComputedStyle(root).maxHeight,
        inlinePadding: panel.style.getPropertyValue("padding-bottom"), paddingPriority: panel.style.getPropertyPriority("padding-bottom"),
        inlineCap: root.style.getPropertyValue("max-height"), capPriority: root.style.getPropertyPriority("max-height"),
      };
      // The dock law sets important padding, so an ordinary added stylesheet cannot substitute the inset. Apply
      // the computed inset geometry to both boxes as inline important values, leaving every actual rule intact.
      panel.style.setProperty("padding-bottom", `calc(${initial.padding} + 34px)`, "important");
      root.style.setProperty("max-height", `calc(${initial.cap} - 34px)`, "important");
      return initial;
    }, S.root);
    const safe = await probe(page, { safeInset: 34 });
    ok(`${label}: CTA above substituted 34px safe inset`, !safe.errors.length, safe.errors.length ? `${safe.errors.join(";")} ${JSON.stringify({ place: safe.got.place, viewport: safe.got.viewport, original: safeStyle })}` : "computed panel padding and shell height substitute the inset together");
    await tile(page, `${label}-edit-safe34`);
    const safePlant = await page.addStyleTag({ content: `${S.place} { position:relative !important; top:1000px !important; }` });
    const planted = await probe(page, { safeInset: 34 });
    ok(`${label}: RED safe-area plant fails the same verdict`, planted.errors.includes("CTA enters the bottom safe area"));
    await safePlant.evaluate(el => el.remove());
    // The keyboard cell measures the real viewport rules independently; do not leave the safe-area substitution
    // holding either box to a height from the preceding viewport.
    await page.evaluate(([selector, prior]) => {
      const root = document.querySelector(selector), panel = root.closest(".kp-bsheet");
      if (prior.inlinePadding) panel.style.setProperty("padding-bottom", prior.inlinePadding, prior.paddingPriority);
      else panel.style.removeProperty("padding-bottom");
      if (prior.inlineCap) root.style.setProperty("max-height", prior.inlineCap, prior.capPriority);
      else root.style.removeProperty("max-height");
    }, [S.root, safeStyle]);
    if (viewport.width <= 360) {
      await page.locator(S.stake).focus();
      await page.evaluate(() => {
        Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 340 });
        Object.defineProperty(window.visualViewport, "offsetTop", { configurable: true, value: 0 });
        window.visualViewport.dispatchEvent(new Event("resize"));
      });
      await page.waitForTimeout(200);
      const keyboard = await probe(page, { keyboard: true });
      const compact = await page.locator(".kp-bsheet__chips").count() === 0;
      ok(`${label}: shortened visual viewport340px keeps stake and CTA above keyboard, compact row`, !keyboard.errors.length && compact, keyboard.errors.length ? `${keyboard.errors.join(";")} ${JSON.stringify({ stake: keyboard.got.stake, scroll: keyboard.got.scroll, place: keyboard.got.place })}` : compact ? "visualViewport.height substitution and real resize listener; stake wholly inside scroller and painted" : "chips remain expanded");
      await tile(page, `${label}-keyboard340`);
      const clipPlant = await page.addStyleTag({ content: `${S.scroll} { max-height:20px !important; }` });
      const plantedClip = await probe(page, { keyboard: true });
      ok(`${label}: RED clipped stake fails the same keyboard verdict`, plantedClip.errors.includes("stake is clipped by the sheet scroller"));
      await clipPlant.evaluate(el => el.remove());
      await page.evaluate(() => { delete window.visualViewport.height; delete window.visualViewport.offsetTop; window.visualViewport.dispatchEvent(new Event("resize")); });
    }
    await page.keyboard.press("Escape"); await page.locator(S.root).waitFor({ state: "hidden" });
    ok(`${label}: Escape closes`, !(await page.locator(S.root).count()));
    await open(page, seed.id); await page.locator(S.close).click(); await page.locator(S.root).waitFor({ state: "hidden" });
    ok(`${label}: kit close closes`, !(await page.locator(S.root).count()));
    await open(page, seed.id); await page.locator('[role="dialog"] > button.m-scrim').click({ position: { x: 10, y: 10 } }); await page.locator(S.root).waitFor({ state: "hidden" });
    ok(`${label}: scrim closes`, !(await page.locator(S.root).count()));
    await open(page, seed.id); await page.goBack(); await page.locator(S.root).waitFor({ state: "hidden" });
    ok(`${label}: Back closes`, !(await page.locator(S.root).count()));
    await open(page, seed.id);
    for (let repeat = 1; repeat <= RELOADS; repeat++) {
      if (process.env.KP_TRACE === "1") observations.push({ label: `${label}-before-reload${repeat}`, trace: await page.evaluate(() => window.__sheetTrace ?? []) });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator(S.root).waitFor({ state: "visible", timeout: 90_000 });
      try { await page.waitForFunction(selector => document.querySelector(selector)?.querySelector("h2") === document.activeElement, S.root); }
      catch {
        await tile(page, `${label}-reload${repeat}-focus-failure`);
        const active = await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id, text: document.activeElement?.textContent?.slice(0,100) }));
        throw new Error(`${label}: reload${repeat} heading-focus failed; active=${JSON.stringify(active)}; probe=${JSON.stringify((await probe(page)).got)}; address=${new URL(page.url()).pathname+new URL(page.url()).search}`);
      }
      await page.waitForTimeout(450); // ARMING_MS=400: the kit deliberately refuses a fresh money key during this beat.
      ok(`${label}: ordinary reload${RELOADS > 1 ? repeat : ""} reopens at market minimum with heading focus`, (await probe(page)).got.stakeValue.replace(/,/g, "") === String(seed.min));
      if (process.env.KP_TRACE === "1") observations.push({ label: `${label}-after-reload${repeat}`, trace: await page.evaluate(() => window.__sheetTrace ?? []) });
    }
    await page.locator(S.place).focus();
    const before = await observed(ctx, seed.id);
    await page.keyboard.down("Enter"); await page.keyboard.down("Enter"); await page.keyboard.up("Enter");
    await waitFrame(page, "receipt");
    const after = await observed(ctx, seed.id);
    const errors = onceOnlyVerdict(before, after, watch.requests.length);
    ok(`${label}: focused/held Enter commits exactly once`, !errors.length, errors.join(";"));
    ok(`${label}: receipt strips bet/side address`, !new URL(page.url()).searchParams.has("bet") && !new URL(page.url()).searchParams.has("side"), new URL(page.url()).pathname + new URL(page.url()).search);
    await tile(page, `${label}-receipt`);
    watch.stop(); await ctx.close(); contexts.delete(ctx);
  }

  if (run("once")) {
    for (const mode of ["double", "abort-before", "drop-after", "landed-maintenance"]) {
      SESSION = await demoSession(browser, BASE, mode === "drop-after" ? { query: "?deposit=0", balance: 600 } : {});
      const ctx = await context(), page = await pageIn(ctx), seed = await open(page);
      const before = await observed(ctx, seed.id), watch = actionWatch(page);
      let first = true;
      const heldKeyReads = [];
      if (mode === "landed-maintenance") await page.route("**/api/markets/*/sheet?**", async route => {
        if (new URL(route.request().url()).searchParams.has("key")) heldKeyReads.push(route);
        else await route.continue();
      });
      if (mode !== "double") await page.route("**/*", async route => {
        const request = route.request();
        if (!first || request.method() !== "POST" || !request.headers()["next-action"] || !request.postData()?.includes("idempotencyKey")) return route.fallback();
        first = false;
        if (mode !== "abort-before") await route.fetch();
        await route.abort("failed");
      });
      const place = page.locator(S.place); await place.click();
      if (mode === "double") { await page.waitForTimeout(30); await place.dispatchEvent("click"); }
      if (mode === "abort-before" || mode === "landed-maintenance") {
        await waitFrame(page, "inDoubt");
        const got = (await probe(page)).got;
        ok(`${mode}: frozen stake, no false money claim`, got.stakeLocked && !/nothing has been charged|hakuna kilichokatwa|no money.*taken/i.test(got.text));
        if (mode === "landed-maintenance") await setMaintenance(true);
        await page.locator(S.place).click();
      }
      await waitFrame(page, "receipt");
      if (mode === "landed-maintenance") { await setMaintenance(false); for (const route of heldKeyReads) await route.continue().catch(() => {}); }
      const after = await observed(ctx, seed.id), count = mode === "double" || mode === "drop-after" ? 1 : 2;
      const errors = onceOnlyVerdict(before, after, watch.requests.length, 1, count);
      ok(`${mode}: one position, one BET_PLACED row, one key`, !errors.length && watch.requests.length === count, errors.join(";"));
      const fresh = after.positions.find(p => !before.positions.some(b => b.positionId === p.positionId));
      const href = await page.locator(S.ticket).getAttribute("href");
      ok(`${mode}: receipt names the stored ticket`, !!fresh?.positionId && !!href && href.includes(fresh.positionId));
      if (mode === "drop-after") ok("dropped answer at600 balance/500 stake: key receipt beats the newly short wallet", seed.min === 500 && (await probe(page)).got.frame === "receipt");
      await tile(page, `once-${mode}`);
      watch.stop(); await ctx.close(); contexts.delete(ctx);
    }
    {
      SESSION = await demoSession(browser, BASE);
      const ctx = await context(), page = await pageIn(ctx), seed = await open(page), before = await observed(ctx, seed.id), watch = actionWatch(page);
      await page.locator(S.place).click(); await waitFrame(page, "receipt");
      await page.locator(".kp-bsheet__continue").click(); await page.locator(S.root).waitFor({ state: "hidden" });
      await open(page, seed.id); await page.locator(S.place).click(); await waitFrame(page, "receipt");
      const after = await observed(ctx, seed.id), errors = onceOnlyVerdict(before, after, watch.requests.length, 2);
      ok("continue then second commitment: two positions, two BET_PLACED rows, two distinct keys", !errors.length, errors.join(";"));
      await tile(page, "once-continue-two-keys"); watch.stop(); await closeContext(ctx);
    }
    {
      SESSION = await demoSession(browser, BASE);
      const ctx = await context(), page = await pageIn(ctx), seed = await open(page), before = await observed(ctx, seed.id), watch = actionWatch(page);
      await page.evaluate(place => {
        // A duplicated page click listener arms an extra real request with the same body/key. It cannot make a new
        // money intent, but the request-count half of the exact same once-only verdict must reject it.
        window.addEventListener("click", event => { if (event.target.closest(place)) window.__sheetDuplicate = true; }, true);
        const native = window.fetch;
        window.fetch = function(input, init) {
          const headers = new Headers(init?.headers), body = init?.body;
          const keyed = body instanceof FormData ? [...body.keys()].some(k => k.includes("idempotencyKey")) : typeof body === "string" && body.includes("idempotencyKey");
          if (window.__sheetDuplicate && headers.has("next-action") && keyed) {
            window.__sheetDuplicate = false;
            const first = native.call(this, input, init); void native.call(this, input, init).catch(() => {}); return first;
          }
          return native.call(this, input, init);
        };
      }, S.place);
      await page.locator(S.place).click(); await waitFrame(page, "receipt"); await page.waitForTimeout(200);
      const after = await observed(ctx, seed.id), red = onceOnlyVerdict(before, after, watch.requests.length);
      ok("RED duplicated click listener fails the same exactly-once verdict", watch.requests.length === 2 && red.some(error => error.startsWith("2 action requests")), red.join(";"));
      await tile(page, "red-once-duplicate-request"); watch.stop(); await closeContext(ctx);
    }
    if (!run("lock")) nm("A24 held first server request while maintenance changes", "the real server-lock fixture drive is in the lock section, which this selected run did not include");
  }

  if (run("lock")) {
    const { ctx } = await freshPlayer(), page = await pageIn(ctx), seed = await open(page);
    const before = await observed(ctx,seed.id),watch = actionWatch(page),keyReads = [];
    // Warm the actual officer form before the bounded gate starts; switching maintenance remains a real officer action.
    const warm = await admin.newPage(); await warm.goto(BASE+"/admin/system",{waitUntil:"domcontentloaded"}); await warm.close();
    const hold = await post(ctx,"bet-sheet-hold",{operation:"hold",marketId:seed.id});
    if (!hold.held || hold.maxHoldMs !== 90_000) throw new Error("A24 actual market-mutex acknowledgement failed");
    let allowAbort; const abortGate = new Promise(resolve=>{allowAbort=resolve;});
    let first = true,firstServer = null;
    const keyedRead = route => {
      if (new URL(route.request().url()).searchParams.has("key")) { keyReads.push(route); return; }
      return route.continue();
    };
    await page.route("**/api/markets/*/sheet?**",keyedRead);
    await page.route("**/*",async route=>{
      const req=route.request();
      if (!first || req.method()!=="POST" || !req.headers()["next-action"] || !req.postData()?.includes("idempotencyKey")) return route.fallback();
      first=false;
      firstServer=route.fetch({timeout:120_000}).catch(()=>null);
      await abortGate; await route.abort("failed");
    });
    try {
      await page.locator(S.place).click();
      let inside = false,lastStatus = null;
      for(let n=0;n<30;n++) {
        const status=await post(ctx,"bet-sheet-hold",{operation:"status",holdId:hold.holdId}); lastStatus=status;
        if(status.held&&status.ownWalletBusy){inside=true;break;}
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      const ownKey = async () => (await ownedRows(page)).find(entry=>entry.quote.marketId===seed.id&&entry.quote.side==="YES")?.key;
      const waiting = await observed(ctx,seed.id),keyBefore=await ownKey();
      if(!inside||waiting.positionCount!==before.positionCount||waiting.betPlacedCount!==before.betPlacedCount||!keyBefore) throw new Error(`A24 first real action did not reach its wallet mutex with an uncommitted key behind the real market hold: ${JSON.stringify({inside,status:lastStatus,positionsDelta:waiting.positionCount-before.positionCount,ledgerDelta:waiting.betPlacedCount-before.betPlacedCount,keyPresent:!!keyBefore,requests:watch.requests.length,frame:(await probe(page)).got.frame})}`);
      ok("A24 first actual action inside own wallet mutex, real market mutex held, key uncommitted",inside&&watch.requests.length===1);
      allowAbort(); await waitFrame(page,"inDoubt");
      await setMaintenance(true);
      await page.locator(S.place).click();
      for(let n=0;n<60;n++) { if(watch.requests.length===2 && (await probe(page)).got.frame==="inDoubt" && !(await page.locator(S.place).isDisabled())) break; await new Promise(resolve=>setTimeout(resolve,100)); }
      const refused=(await probe(page)).got,stillWaiting=await observed(ctx,seed.id),keyAfter=await ownKey();
      ok("A24 maintenance retry keeps doubt and the identical key, says system error, zero money",watch.requests.length===2&&refused.frame==="inDoubt"&&keyAfter===keyBefore&&/something went wrong|check your wallet/i.test(refused.text)&&! /nothing has been charged|no money.*taken/i.test(refused.text)&&stillWaiting.positionCount===before.positionCount&&stillWaiting.betPlacedCount===before.betPlacedCount);
      await tile(page,"lock-first-uncommitted-maintenance-retry");
      await post(ctx,"bet-sheet-hold",{operation:"release",holdId:hold.holdId});
      await firstServer;
      const landed=await observed(ctx,seed.id);
      if(landed.positionCount!==before.positionCount+1||landed.betPlacedCount!==before.betPlacedCount+1) throw new Error("A24 released real first action did not commit exactly once before replay");
      const replayResponse=page.waitForResponse(response=>{const request=response.request();return request.method()==="POST"&&!!request.headers()["next-action"]&&request.postData()?.includes("idempotencyKey");});
      await page.locator(S.place).click();
      // Inspect the actual action envelope in memory; only the replay Boolean enters evidence, never raw RSC/session data.
      const replayed=/"replayed"\s*:\s*true/.test(await (await replayResponse).text());
      ok("A24 committed-key retry under maintenance is actual replayed:true",replayed);
      await page.unroute("**/api/markets/*/sheet?**",keyedRead);
      for(const route of keyReads) await route.continue().catch(()=>{});
      await waitFrame(page,"receipt");
      const after=await observed(ctx,seed.id),errors=onceOnlyVerdict(before,after,watch.requests.length,1,3);
      const fresh=after.positions.find(position=>!before.positions.some(old=>old.positionId===position.positionId));
      const href=await page.locator(S.ticket).getAttribute("href");
      ok("A24 release first actual action: three requests, one position, one BET_PLACED, same key and receipt",!errors.length&&fresh?.key===keyBefore&&!!href&&href.includes(fresh.positionId),errors.join(";"));
      await tile(page,"lock-first-released-receipt");
    } finally {
      allowAbort();
      await ctx.request.post(BASE+"/api/dev-test/bet-sheet-hold",{data:{operation:"release",holdId:hold.holdId}}).catch(()=>{});
      await setMaintenance(false);
      watch.stop(); await closeContext(ctx);
    }
  }

  if (run("low")) for (const [name, balance, stake] of [["zero-min500", 0, 500], ["two-options", 1200, 5000], ["below-deposit-min", 1200, 1500]]) {
    SESSION = await demoSession(browser, BASE, { query: "?deposit=0", balance });
    const ctx = await context(), page = await pageIn(ctx), seed = await open(page);
    await page.locator(S.stake).fill(String(stake)); await waitFrame(page, "low");
    const check = await probe(page, { frame: "low" });
    ok(`${name}: actual wallet ${balance}, neutral invalid cue and disabled full-stake CTA`, !check.errors.length, check.errors.join(";"));
    if (name === "zero-min500") ok("zero at owner minimum500 still offers deposit minimum1000", check.got.visibleDeposit && !check.got.visibleInstead);
    else ok(`${name}: both engine options present`, check.got.visibleDeposit && check.got.visibleInstead);
    await page.locator(S.deposit).hover(); await page.waitForTimeout(150);
    const hover = await probe(page,{depositMetal:true});
    ok(`${name}: hovered deposit row retains kit gold material`,!hover.errors.length,hover.errors.join(";") || "computed background-image retains both material gradients");
    const noMetal = await page.addStyleTag({content:`${S.deposit}{background-image:none!important}`});
    const redMetal = await probe(page,{depositMetal:true});
    ok(`${name}: RED removed gold material fails the same hover verdict`,redMetal.errors.includes("deposit loses its gold material"));
    await noMetal.evaluate(el=>el.remove());
    await tile(page, `low-${name}`);
    if (name === "two-options") {
      const before = await observed(ctx, seed.id), watch = actionWatch(page);
      await page.locator(S.instead).click(); await waitFrame(page, "receipt");
      const after = await observed(ctx, seed.id);
      ok("bet instead is one distinct explicit commitment", !onceOnlyVerdict(before, after, watch.requests.length).length);
      watch.stop();
    } else if (name === "below-deposit-min") {
      await page.locator(S.deposit).click(); await page.waitForURL(url => url.pathname === "/wallet/deposit");
      const url = new URL(page.url());
      ok("deposit closes sheet; amount/bet/from retained without reopening there", !await page.locator(S.root).count() && url.searchParams.get("amount") === "1000" && url.searchParams.get("from") === "low-balance" && url.searchParams.has("bet"));
    }
    await ctx.close(); contexts.delete(ctx);
  }

  if (run("lifecycle")) {
    {
      // Only this fault-injection context blocks SW interception, so the controlled429 reaches the actual Host fetch.
      // Core/IME/reload contexts keep the real application's service worker.
      const {ctx}=await freshPlayer(100000,{controlledNetwork:true}),page=await pageIn(ctx),seed=await open(page),before=await observed(ctx,seed.id),watch=actionWatch(page);
      ok("controlled fresh-read premise has no service-worker controller",await page.evaluate(()=>!navigator.serviceWorker?.controller));
      const balance=page.locator(`${S.root} .kp-bsheet__balance`);
      await balance.getByText("TZS 100,000",{exact:true}).waitFor();
      await page.bringToFront();
      await page.waitForFunction(()=>document.visibilityState==="visible");
      const heading=await page.locator(`${S.root} h2`).innerText();
      let failing=true,refusedReads=0;
      await page.route("**/api/markets/*/sheet?**",route=>{if(failing){refusedReads++;return route.fulfill({status:429,contentType:"application/json",body:'{"error":"controlled fresh private read refusal"}'});}return route.fallback();});
      await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
      try{await page.locator(`${S.root} .kp-bsheet__balance-unknown`).waitFor();}
      catch{
        const diagnostic=await page.evaluate(selector=>({visibility:document.visibilityState,hasFocus:document.hasFocus(),frame:document.querySelector(selector)?.getAttribute('data-frame'),balance:document.querySelector(`${selector} .kp-bsheet__balance`)?.textContent,trace:window.__sheetTrace??[]}),S.root);
        observations.push({label:"lifecycle-fresh-refusal-diagnostic",refusedReads,...diagnostic});
        await tile(page,"lifecycle-fresh-refusal-diagnostic");
        throw new Error(`Controlled429 did not reach unknown balance; matchedReads=${refusedReads}, visibility=${diagnostic.visibility}, hasFocus=${diagnostic.hasFocus}, frame=${diagnostic.frame}`);
      }
      ok("controlled fresh refusal reached the actual read on a visible page",refusedReads>0);
      const unknown=await balance.innerText(),p=(await probe(page)).got;
      ok("successful wallet read then fresh429: unknown dash, no fake0/old wallet/options, public heading preserved",unknown.includes("—")&&/unavailable/i.test(unknown)&&! /TZS\s*(?:0\b|100,000)/.test(unknown)&&!p.visibleDeposit&&!p.visibleInstead&&await page.locator(`${S.root} h2`).innerText()===heading,unknown);
      await tile(page,"lifecycle-failed-private-after-known");
      failing=false; await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
      await balance.getByText("TZS 100,000",{exact:true}).waitFor();
      const after=await observed(ctx,seed.id);
      ok("fresh private read recovers actual100000, zero actions/own money changes",watch.requests.length===0&&before.positionCount===after.positionCount&&before.betPlacedCount===after.betPlacedCount);
      watch.stop();await closeContext(ctx);
    }
    for(const motion of ["no-preference","reduce"]){
      const {ctx}=await freshPlayer(),page=await pageIn(ctx);
      await page.emulateMedia({reducedMotion:motion});
      const seed=await open(page),before=await observed(ctx,seed.id),watch=actionWatch(page);
      const otherId=await page.evaluate(([pick,id])=>[...document.querySelectorAll(pick)].map(a=>JSON.parse(a.closest("[data-sheet]").getAttribute("data-sheet")).id).find(value=>value!==id),[S.pick,seed.id]);
      if(!otherId)throw new Error("Close lifecycle needs a genuinely unrelated question");
      await ownedRows(page);
      await page.evaluate(selectors=>{
        const place=document.querySelector(selectors.place),props=Object.keys(place).find(key=>key.startsWith("__reactProps$"));
        window.__staleSheetPlace=place[props].onClick;
        window.__sheetCloseSamples=[];
        let started=null;
        const sample=()=>{
          if(started===null)return;
          const root=document.querySelector(selectors.root),wrap=root?.closest("[inert]"),url=new URL(location.href);
          window.__sheetCloseSamples.push({ms:performance.now()-started,present:!!root,inert:!!wrap,hidden:!!root?.closest('[aria-hidden="true"]'),focusInside:!!root?.contains(document.activeElement),bet:url.searchParams.has("bet"),keys:JSON.parse(sessionStorage.getItem(window.__qaRecoveryKey)??"null")?.pending?.length??0,live:root?.querySelectorAll('[aria-live="polite"]').length??0});
        };
        const observer=new MutationObserver(sample);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["inert","aria-hidden","aria-modal"]});
        window.addEventListener("click",function begin(event){if(!event.target.closest(selectors.close))return;window.removeEventListener("click",begin,true);started=performance.now();const frame=()=>{sample();if(performance.now()-started<600)requestAnimationFrame(frame);else observer.disconnect();};requestAnimationFrame(frame);},true);
      },S);
      await page.locator(S.close).click();
      await page.waitForFunction(()=>!new URL(location.href).searchParams.has("bet"));
      await page.evaluate(()=>window.__staleSheetPlace());
      await page.locator(S.root).waitFor({state:"hidden"});
      const samples=await page.evaluate(()=>window.__sheetCloseSamples),ghost=samples.find(sample=>sample.present&&sample.inert&&sample.hidden),gone=samples.find(sample=>!sample.present),addressClean=samples.find(sample=>!sample.bet);
      observations.push({label:`lifecycle-${motion}-close`,samples});
      ok(`${motion}: close releases address/key/focus; normal ghost inert/silent, reduced exit prompt`,!!gone&&!!addressClean&&addressClean.ms<100&&samples.every(sample=>!sample.inert||(!sample.focusInside&&sample.live===0&&sample.keys===0))&&(motion==="reduce"?gone.ms<100:!!ghost),JSON.stringify({ghost,addressClean,gone}));
      const reopened=await open(page,otherId);
      await page.evaluate(()=>window.__staleSheetPlace()); await page.waitForTimeout(300);
      const after=await observed(ctx,seed.id);
      ok(`${motion}: retained rendered callback cannot commit while closed or against unrelated reopen`,watch.requests.length===0&&before.positionCount===after.positionCount&&before.betPlacedCount===after.betPlacedCount&&reopened.id===otherId&&!await page.locator(S.place).isDisabled());
      await tile(page,`lifecycle-${motion}-unrelated-reopen`);watch.stop();await closeContext(ctx);
    }
  }

  if (run("host")) {
    SESSION = await demoSession(browser, BASE);
    // Two actual mounted questions coupled with the >16-identity pure storage proof, using the exact same module.
    const { build } = await import("esbuild");
    const bundle = await build({ stdin: { contents: 'export { ownedSheetIntents, saveOwnedSheet, sheetOwnerKey } from "./src/lib/journey/sheet-owned-storage.ts"', loader: "ts", resolveDir: ROOT }, bundle: true, write: false, platform: "node", format: "cjs", tsconfig: join(ROOT, "tsconfig.json") });
    const module = { exports: {} }; new Function("module", "exports", bundle.outputFiles[0].text)(module, module.exports);
    const intents = Array.from({ length: 17 }, (_, n) => ({ quote: { marketId: catalogue.ids[n % catalogue.ids.length].id, side: n % 2 ? "YES" : "NO", stake: 500 }, key: crypto.randomUUID(), at: Date.now() }));
    const bytes=new Map(),store={getItem:k=>bytes.get(k)??null,setItem:(k,v)=>bytes.set(k,v),removeItem:k=>bytes.delete(k)},owner="usr_qa_storage";
    if(!module.exports.saveOwnedSheet(store,owner,intents))throw new Error("17-key durable account storage refused");
    const reread=module.exports.ownedSheetIntents(bytes.get(module.exports.sheetOwnerKey(owner)),owner);
    ok("storage pure proof: all 17 unresolved identities survive serialization", reread.length === 17 && intents.every(intent => reread.some(kept => kept.key === intent.key)));
    {
      const ctx = await context(), page = await pageIn(ctx);
      await page.route("**/*", route => route.request().method() === "POST" && route.request().headers()["next-action"] && route.request().postData()?.includes("idempotencyKey") ? route.abort("failed") : route.fallback());
      const ids = await page.locator("[data-sheet]").evaluateAll(cards => [...new Set(cards.map(card => JSON.parse(card.getAttribute("data-sheet")).id))].slice(0, 2));
      if (ids.length !== 2) throw new Error("Two-question retained-key premise absent");
      for (const id of ids) { await open(page, id); await page.locator(S.place).click(); await waitFrame(page, "inDoubt"); await page.locator(S.close).click(); await page.locator(S.root).waitFor({ state: "hidden" }); }
      const keys = (await ownedRows(page)).map(p=>p.key);
      ok("mounted host preserves both unrelated doubtful keys", new Set(keys).size === 2);
      await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(1200); await open(page, ids[0]); await waitFrame(page, "inDoubt");
      const afterReload = (await ownedRows(page)).map(p=>p.key);
      ok("reload/reopen keeps both identities and first question frozen", keys.every(key => afterReload.includes(key)) && (await probe(page)).got.stakeLocked);
      await tile(page, "host-two-doubts-reload"); await ctx.close(); contexts.delete(ctx);
    }
    {
      const ctx = await context(), page = await pageIn(ctx), seed = await open(page), before = await observed(ctx, seed.id), watch = actionWatch(page);
      await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (this === sessionStorage && key === "kp-pending-bet") throw new DOMException("planted tab quota", "QuotaExceededError"); return original.call(this, key, value); }; });
      await page.locator(S.place).click(); await page.waitForTimeout(300);
      const after = await observed(ctx, seed.id), p = (await probe(page)).got;
      ok("storage blocked: zero actions/positions/ledger rows, unavailable stays in sheet", watch.requests.length === 0 && after.positionCount === before.positionCount && after.betPlacedCount === before.betPlacedCount && /unavailable|try again/i.test(p.text));
      await tile(page, "host-storage-quota"); watch.stop(); await ctx.close(); contexts.delete(ctx);
    }
    {
      const ctx = await context(), page = await pageIn(ctx), seed = await open(page), before = await observed(ctx, seed.id), watch = actionWatch(page);
      let first = true; const held = [];
      await page.route("**/api/markets/*/sheet?**", route => new URL(route.request().url()).searchParams.has("key") ? held.push(route) : route.fallback());
      await page.route("**/*", async route => {
        const req = route.request();
        if (first && req.method() === "POST" && req.headers()["next-action"] && req.postData()?.includes("idempotencyKey")) { first = false; await route.fetch(); await route.abort("failed"); }
        else await route.fallback();
      });
      await page.locator(S.place).click(); await waitFrame(page, "inDoubt");
      await page.locator(S.close).click(); await page.locator(S.root).waitFor({ state: "hidden" });
      await page.waitForTimeout(200);
      for (const route of held.splice(0)) await route.continue();
      await page.waitForTimeout(700);
      const after = await observed(ctx, seed.id);
      ok("lost answer found while closed: one bet; tab's pending marker clears", !onceOnlyVerdict(before, after, watch.requests.length).length && await page.evaluate(() => sessionStorage.getItem("kp-pending-bet") === null));
      await page.goForward(); await page.waitForTimeout(250);
      ok("a late receipt retires Forward's stale unplaced entry", !await page.locator(S.root).count() && !new URL(page.url()).searchParams.has("bet"));
      watch.stop(); await ctx.close(); contexts.delete(ctx);
    }
    {
      // A genuine balance refusal from the service; the first client read models an older larger balance.
      SESSION = await demoSession(browser, BASE, { query: "?deposit=0", balance: 1000 });
      const ctx = await context(), page = await ctx.newPage(); let readMode = "stale";
      await readyProbe(page);
      await page.route("**/api/markets/*/sheet?**", async route => {
        if (readMode === "failed") return route.fulfill({ status: 429, contentType: "application/json", body: '{"error":"planted refused re-read"}' });
        if (readMode === "fresh") return route.fallback();
        const response = await route.fetch(), body = await response.json();
        if (body.me?.facts?.wallet) { body.me.spendable = 50000; body.me.facts.wallet.balance = 50000; }
        await route.fulfill({ response, json: body });
      });
      await page.goto(BASE, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(1200);
      const seed = await open(page), before = await observed(ctx, seed.id);
      await page.locator(S.stake).fill("5000");
      page.on("request", request => { if (request.method() === "POST" && request.headers()["next-action"] && request.postData()?.includes("idempotencyKey")) readMode = "failed"; });
      await page.locator(S.place).click(); await waitFrame(page, "low");
      const failedRead = (await probe(page)).got;
      ok("balance refusal +429 re-read never invents options", !failedRead.visibleDeposit && !failedRead.visibleInstead);
      readMode = "fresh"; await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await page.waitForFunction(([root, deposit, instead]) => document.querySelector(root)?.querySelector(deposit) && document.querySelector(root)?.querySelector(instead), [S.root, S.deposit, S.instead]);
      const after = await observed(ctx, seed.id);
      ok("fresh focus read repairs the stale low frame into actual engine options", (await probe(page)).got.visibleDeposit && (await probe(page)).got.visibleInstead && before.positionCount === after.positionCount && before.betPlacedCount === after.betPlacedCount);
      await tile(page, "host-low-reread-recovers"); await ctx.close(); contexts.delete(ctx);
    }
    {
      SESSION = await demoSession(browser, BASE);
      const ctx = await context(), page = await pageIn(ctx), seed = await open(page), watch = actionWatch(page); const held = [];
      await page.route("**/*", route => {
        const req = route.request();
        if (req.method() === "POST" && req.headers()["next-action"] && req.postData()?.includes("idempotencyKey")) { held.push(route); return; }
        return route.fallback();
      });
      await page.locator(S.place).click(); await waitFrame(page, "placing");
      await page.keyboard.press("Escape");
      ok("placing: Escape and close cannot release the live request", await page.locator(S.root).count() === 1 && await page.locator(S.close).isDisabled());
      await page.clock.install(); await page.clock.fastForward(21_000);
      await waitFrame(page, "inDoubt");
      ok("20s watchdog shows doubt but blocks queued retry until promise settles", await page.locator(S.place).isDisabled() && watch.requests.length === 1);
      for (const route of held) await route.abort("failed");
      await page.waitForFunction(selector => !document.querySelector(selector)?.disabled, S.place);
      ok("retry becomes available after the original promise settles", !await page.locator(S.place).isDisabled());
      await tile(page, "host-watchdog-request-held"); watch.stop(); await ctx.close(); contexts.delete(ctx);
    }
    {
      const ctx = await context(), page = await pageIn(ctx), seed = await open(page), before = await observed(ctx, seed.id), watch = actionWatch(page), held = [];
      await page.route("**/*", route => { const req = route.request(); if (req.method() === "POST" && req.headers()["next-action"] && req.postData()?.includes("idempotencyKey")) { held.push(route); return; } return route.fallback(); });
      await page.locator(S.place).click(); await waitFrame(page, "placing"); await page.clock.install(); await page.clock.fastForward(21_000); await waitFrame(page, "inDoubt");
      await page.locator(S.close).click(); await page.locator(S.root).waitFor({ state: "hidden" }); await page.clock.fastForward(39_000);
      for (const route of held) await route.continue();
      await page.waitForFunction(() => sessionStorage.getItem("kp-pending-bet") === null);
      await open(page, seed.id); await waitFrame(page, "receipt");
      const after = await observed(ctx, seed.id), errors = onceOnlyVerdict(before, after, watch.requests.length);
      ok("A7 held60s→watchdog20s→close→lands→reopen receipts exactly one bet", !errors.length, errors.join(";"));
      await tile(page, "host-held60-closed-landed-receipt"); watch.stop(); await closeContext(ctx);
    }
    {
      const ctx = await context(), page = await pageIn(ctx); await open(page);
      let hold = false, caughtResolve;
      const caught = new Promise(resolve => { caughtResolve = resolve; });
      await page.route("**/api/markets/*/sheet?**", async route => {
        if (hold && new URL(route.request().url()).searchParams.has("key")) {
          const response = await route.fetch();
          caughtResolve({ route, response });
        } else await route.fallback();
      });
      await page.route("**/*", route => {
        const req = route.request();
        return req.method() === "POST" && req.headers()["next-action"] && req.postData()?.includes("idempotencyKey") ? route.abort("failed") : route.fallback();
      });
      await page.locator(S.place).click(); await waitFrame(page, "inDoubt"); await page.waitForTimeout(200);
      const keysBefore = (await ownedRows(page)).map(p=>p.key);
      await page.clock.install(); hold = true;
      await page.clock.fastForward(599_000);
      const held = await Promise.race([caught, new Promise((_, reject) => setTimeout(() => reject(new Error("9m59 key-read premise absent")), 10_000))]);
      await page.clock.fastForward(2000);
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
      await held.route.fulfill({ response: held.response });
      await page.clock.runFor(25);
      const after = {frame: await page.locator(S.root).getAttribute("data-frame"), keys: (await ownedRows(page)).map(p=>p.key)};
      ok("null key query sent9m59, answered10m01 keeps doubt: read time is request time", after.frame === "inDoubt" && keysBefore.every(key => after.keys.includes(key)));
      // The criterion is measured above. Release the diagnostic clock so tile's two paint frames can complete.
      await page.clock.resume();
      await tile(page, "host-slow-null-key-read"); await ctx.close(); contexts.delete(ctx);
    }
  }

  if (run("matrix")) {
    SESSION = await demoSession(browser, BASE);
    const ctx = await context(), page = await pageIn(ctx), seed = await open(page);
    const beforeMaintenance = await observed(ctx, seed.id);
    await setMaintenance(true); await page.locator(S.place).click({ force: true });
    await page.waitForTimeout(500);
    const maintenanceProbe = (await probe(page)).got, afterMaintenance = await observed(ctx, seed.id);
    ok("real maintenance refusal stays inline and does not place", maintenanceProbe.frame === "edit" && /maintenance|paused/i.test(maintenanceProbe.text)
      && afterMaintenance.positionCount === beforeMaintenance.positionCount && afterMaintenance.betPlacedCount === beforeMaintenance.betPlacedCount);
    await tile(page, "matrix-maintenance"); await setMaintenance(false);
    await ctx.close(); contexts.delete(ctx);
    SESSION = await demoSession(browser, BASE, { query: "?hold=officer" });
    const held = await context(), hp = await pageIn(held); await open(hp);
    await waitFrame(hp, "blocked"); ok("real officer wallet hold blocks before payment offer", !(await probe(hp)).got.visibleDeposit);
    await tile(hp, "matrix-held-wallet"); await held.close(); contexts.delete(held);
    for (const cap of [1000, 100]) {
      const { ctx: player } = await freshPlayer(), page = await pageIn(player), seed = await open(page), other = await sibling(player);
      await page.locator(S.stake).fill("5000");
      const before = await observed(player, seed.id);
      await limitsIn(other, { dailyLossLimit: cap });
      await page.locator(S.place).click(); await waitFrame(page, cap >= seed.min ? "lossRoom" : "blocked");
      const p = await probe(page, { frame: cap >= seed.min ? "lossRoom" : "blocked" }), after = await observed(player, seed.id);
      ok(`real loss limit lowered after open to${cap}: ${cap >= seed.min ? "loss room" : "block"}, no bet`, !p.errors.length && before.positionCount === after.positionCount && before.betPlacedCount === after.betPlacedCount, p.errors.join(";"));
      await tile(page, `matrix-loss-cap${cap}`); await closeContext(other); await closeContext(player);
    }
    {
      const { ctx: player, userId } = await freshPlayer(), page = await pageIn(player), seed = await open(page), before = await observed(player, seed.id);
      const officer = await pageIn(admin, `/admin/players/${userId}`);
      await officer.getByRole("button", { name: "Freeze wallet", exact: true }).click();
      const dialog = officer.getByRole("alertdialog");
      await dialog.locator('textarea[data-field="reason"]').fill("Local sheet matrix proof");
      await dialog.getByRole("button", { name: "Freeze wallet", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      await page.locator(S.place).click(); await waitFrame(page, "blocked");
      const after = await observed(player, seed.id);
      ok("real officer freeze after sheet opened: blocked, no payment offer or bet", !(await probe(page)).got.visibleDeposit && before.positionCount === after.positionCount && before.betPlacedCount === after.betPlacedCount);
      await tile(page, "matrix-officer-freeze-after-open"); await officer.close(); await closeContext(player);
    }
    {
      const { ctx: player } = await freshPlayer(0), page = await pageIn(player), seed = await open(page), other = await sibling(player);
      await limitsIn(other, { dailyDepositLimit: 500 });
      await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await waitFrame(page, "low");
      await page.waitForTimeout(300);
      ok("real deposit limit500 leaves no minimum1000 deposit offer", !(await probe(page)).got.visibleDeposit && await page.locator(S.place).isDisabled());
      await tile(page, "matrix-deposit-limit-below-min"); await closeContext(other); await closeContext(player);
    }
    {
      const { ctx: player } = await freshPlayer(0), page = await pageIn(player); await open(page);
      await page.locator(S.stake).fill("1000000"); await waitFrame(page, "low");
      ok("real unaccepted source-of-funds declaration blocks threshold-crossing deposit", !(await probe(page)).got.visibleDeposit && /source|funds|declaration/i.test((await probe(page)).got.text));
      await tile(page, "matrix-source-of-funds"); await closeContext(player);
    }
    {
      const officer = await pageIn(admin, "/admin/payments?tab=health");
      const live = officer.getByRole("button", { name: "Deposits LIVE", exact: true }), paused = officer.getByRole("button", { name: "Deposits PAUSED", exact: true });
      if (await live.count() !== 4 || await paused.count() !== 0) throw new Error(`All-rails cell needs four initially open mobile-money rails; live=${await live.count()} paused=${await paused.count()} names=${JSON.stringify(await officer.getByRole("button").allTextContents())}`);
      try {
        while (await live.count()) {
          const prior = await paused.count();
          await hydratedClick(live.first()); await officer.getByPlaceholder("PAUSE", { exact: true }).fill("PAUSE");
          await officer.getByRole("button", { name: "Pause", exact: true }).click(); await officer.getByPlaceholder("PAUSE", { exact: true }).waitFor({ state: "hidden" });
          await officer.waitForFunction(expected => [...document.querySelectorAll("button")].filter(button => button.textContent.replace(/\s/g, "") === "DepositsPAUSED").length === expected, prior + 1);
        }
        for (const balance of [0, 1200]) {
          const { ctx: player } = await freshPlayer(balance), page = await pageIn(player); await open(page); await page.locator(S.stake).fill("5000"); await waitFrame(page, "low");
          const p = (await probe(page)).got;
          ok(`real all rails paused at balance${balance}: no deposit, ${balance ? "bet-instead remains" : "no money option"}`, !p.visibleDeposit && p.visibleInstead === !!balance && /paused|unavailable/i.test(p.text));
          await tile(page, `matrix-rails-paused-${balance}`); await closeContext(player);
        }
      } finally {
        while (await paused.count()) { const prior = await live.count(); await hydratedClick(paused.first()); await officer.waitForFunction(expected => [...document.querySelectorAll("button")].filter(button => button.textContent.replace(/\s/g, "") === "DepositsLIVE").length === expected, prior + 1); }
        await officer.close();
      }
    }
    {
      const officer = await pageIn(admin, "/admin/payments?tab=rails"), asyncSwitch = officer.locator('[aria-label^="Demo async (test):"]');
      const mock = officer.getByRole("radio", { name: /Mock/ });
      if (!await mock.count() || await mock.getAttribute("aria-checked") !== "true") throw new Error("Pending deposit cell requires the real mock payment adapter already selected; no external provider may be called");
      const wasOn = await asyncSwitch.getAttribute("aria-label") === "Demo async (test): on";
      try {
        if (!wasOn) { await asyncSwitch.click(); await officer.locator('[aria-label="Demo async (test): on"]').waitFor(); }
        const { ctx: player } = await freshPlayer(0), deposit = await pageIn(player, "/wallet/deposit?amount=1000");
        await deposit.locator('label:has(input#provider-MPESA)').click();
        // The preview journey's Lipa button is its explicit final action. The legacy
        // deposit form still has a separate confirmation dialog.
        if (await deposit.locator('[data-testid="journey-deposit-form"]').count()) {
          await deposit.locator('#msisdn').fill('712345678');
          await deposit.locator('[data-testid="journey-deposit-form"] button[type="submit"]').click();
        } else {
          await deposit.getByRole("button", { name: "Confirm deposit", exact: true }).click();
          await deposit.getByRole("alertdialog").getByRole("button", { name: "Deposit", exact: true }).click();
        }
        await deposit.waitForURL(url => url.pathname !== "/wallet/deposit", { timeout: 90_000 });
        await deposit.goto(BASE, { waitUntil: "domcontentloaded" }); await deposit.waitForTimeout(1200); await open(deposit); await waitFrame(deposit, "pending");
        const p = await probe(deposit, { frame: "pending" });
        ok("real mock async PROCESSING deposit credits nothing: fresh pending frame, no second deposit", !p.errors.length && !p.got.visibleDeposit && !p.got.visibleInstead, p.errors.join(";"));
        await tile(deposit, "matrix-pending-fresh-real-rail"); await closeContext(player);
      } finally {
        if (!wasOn && await asyncSwitch.getAttribute("aria-label") === "Demo async (test): on") { await asyncSwitch.click(); await officer.locator('[aria-label="Demo async (test): off"]').waitFor(); }
        await officer.close();
      }
      result("pending deposit age10/30-minute bands", "NOT DRIVEN", "S8 A10 item4: test:bet-sheet §4 crosses10/30m on skewed phone; real rail fresh band measured separately");
    }
    {
      const { ctx: player } = await freshPlayer(), page = await pageIn(player), seed = await open(page), before = await observed(player, seed.id), watch = actionWatch(page);
      const held = []; await page.route("**/*", route => { const req = route.request(); if (req.method() === "POST" && req.headers()["next-action"] && req.postData()?.includes("idempotencyKey")) { held.push(route); return; } return route.fallback(); });
      await page.locator(S.place).click(); await waitFrame(page, "placing");
      await post(admin, "fast-forward-market", { marketId: seed.id, seconds: 3600, selectionSeconds: -1 });
      for (const route of held) await route.continue(); await waitFrame(page, "closed");
      const after = await observed(player, seed.id);
      ok("real selection closes while browser placing request is held: no bet", before.positionCount === after.positionCount && before.betPlacedCount === after.betPlacedCount && watch.requests.length === 1);
      await tile(page, "matrix-selection-close-while-placing");
      await page.locator(S.close).click(); await page.locator(S.root).waitFor({ state: "hidden" });
      await open(page, seed.id); await waitFrame(page, "closed");
      ok("real selection already closed before tap: closed without commitment control", !await page.locator(S.place).count());
      await tile(page, "matrix-selection-before-tap");
      await post(admin, "fast-forward-market", { marketId: seed.id, seconds: 7 * 86400, selectionSeconds: 6 * 86400 });
      watch.stop(); await closeContext(player);
    }
    {
      await post(admin, "reset-rate-limits");
      const { ctx: player } = await freshPlayer(), page = await pageIn(player), seed = await open(page), watch = actionWatch(page);
      await page.locator(S.place).click(); await waitFrame(page, "receipt");
      const request = watch.requests[0]; if (!request) throw new Error("Rate cell lacks first real action");
      const headers = await request.allHeaders(); delete headers["content-length"]; delete headers.host; delete headers.connection;
      await Promise.all(Array.from({ length: 35 }, () => player.request.post(request.url(), { headers, data: request.postData(), timeout: 90_000 })));
      const before = await observed(player, seed.id);
      await page.locator(".kp-bsheet__continue").click(); await page.locator(S.root).waitFor({ state: "hidden" }); await open(page, seed.id);
      await page.locator(S.place).click(); await page.waitForTimeout(300);
      const p = (await probe(page)).got, after = await observed(player, seed.id);
      ok("real bet.place capacity exhausted by same-key service replays: fresh commitment refused inline", p.frame === "edit" && /wait|again|too many|second/i.test(p.text) && after.positionCount === before.positionCount && after.betPlacedCount === before.betPlacedCount);
      await tile(page, "matrix-rate-capacity"); await post(admin, "reset-rate-limits"); watch.stop(); await closeContext(player);
    }
    await coolingOffDrive();
    for (const cell of NOT_DRIVEN_MATRIX) result(`matrix row ${cell.row}: ${cell.reason}`, "NOT DRIVEN", cell.proof);
  }

  if(run("cooling")&&!run("matrix"))await coolingOffDrive();

  if (run("doors")) {
    for (const path of ["/", "/live"]) {
      SESSION = await demoSession(browser, BASE);
      const ctx = await context(), page = await pageIn(ctx, path);
      const old = await page.locator("[data-sheet]").evaluateAll(cards => cards.map(card => JSON.parse(card.getAttribute("data-sheet")).id));
      const more = page.getByRole("link", { name: "Show more", exact: true });
      if (!await more.count()) throw new Error(`${path}: seeded pagination premise absent`);
      await more.click(); await page.waitForURL(url => url.searchParams.get("page") === "2");
      await page.waitForFunction(old => [...document.querySelectorAll("[data-sheet]")].some(card => !old.includes(JSON.parse(card.getAttribute("data-sheet")).id)), old);
      const freshId = await page.locator("[data-sheet]").evaluateAll((cards, old) => cards.map(card => JSON.parse(card.getAttribute("data-sheet")).id).find(id => !old.includes(id)), old);
      await open(page, freshId); ok(`${path}: newly appended Show more pick is intercepted in place`, new URL(page.url()).pathname === path);
      await tile(page, `doors-more-${path === "/" ? "home" : "live"}`); await closeContext(ctx);
    }
    {
      const { ctx } = await freshPlayer(1200), page = await pageIn(ctx);
      await page.locator('[data-testid="journey-balance"]').click();
      await page.getByRole("button", { name: "Hide balances", exact: true }).click(); await page.keyboard.press("Escape");
      await open(page); await page.locator(S.stake).fill("5000"); await waitFrame(page, "low");
      const p = (await probe(page)).got;
      const masked = await page.locator(`${S.root} [aria-label="balance hidden"]`).allTextContents();
      ok("actual CashEye masks personal figures throughout sheet, keeps commitment/shortfall amounts visible", masked.length >= 1 && masked.every(text => text.includes("•") && !/\d/.test(text)) && p.stakeValue === "5,000" && /3[,\s]800/.test(p.text) && /1[,\s]200/.test(p.text));
      await tile(page, "doors-personal-cash-hidden"); await closeContext(ctx);
    }
    {
      const { ctx, phone } = await freshPlayer(), page = await pageIn(ctx), seed = await open(page), before = await observed(ctx, seed.id);
      await page.locator(S.place).click(); await waitFrame(page, "receipt"); const a = await observed(ctx, seed.id), key = a.positions.find(p => !before.positions.some(old => old.positionId === p.positionId))?.key;
      if (!key) throw new Error("Foreign retained key premise absent");
      const owner = await sibling(ctx), other = await freshPlayer(); await ctx.addCookies(await other.ctx.cookies(BASE));
      await page.evaluate(([id, key]) => { const m = { bet: `${id}.YES.500`, at: Date.now(), k: key }; sessionStorage.setItem("kp-pending-bet", JSON.stringify({ ...m, pending: [m] })); }, [seed.id, key]);
      await page.goto(`${BASE}/?bet=${seed.id}.YES.500`, { waitUntil: "domcontentloaded" }); await waitFrame(page, "inDoubt");
      const b = await observed(ctx, seed.id); await page.evaluate(()=>window.dispatchEvent(new Event("focus"))); await page.waitForTimeout(500);
      const after = await observed(ctx, seed.id), ownerAfter = await observed(owner, seed.id);
      const quarantined=await page.evaluate(key=>{const archive=JSON.parse(sessionStorage.getItem("kp-sheet-intents:legacy:v1"));return archive.records.some(raw=>JSON.parse(raw).k===key)&&!archive.resolved[key];},key);
      ok("actual account switch with ownerless foreign key: quarantine keeps the original key, new dispatch disabled, no own/original money rows", b.positionCount === after.positionCount && b.betPlacedCount === after.betPlacedCount && a.positionCount === ownerAfter.positionCount && a.betPlacedCount === ownerAfter.betPlacedCount && quarantined && await page.locator(S.place).isDisabled());
      await tile(page, "doors-foreign-legacy-held"); await closeContext(owner); await closeContext(other.ctx); await closeContext(ctx);
    }
    {
      const { ctx } = await freshPlayer(), page = await pageIn(ctx), seed = await open(page), before = await observed(ctx, seed.id);
      await page.locator(S.stake).fill("5000");
      await page.evaluate(() => { window.NEXT_DEPLOYMENT_ID = "qa-skew-build"; });
      await page.addInitScript(() => { window.NEXT_DEPLOYMENT_ID = "qa-skew-build"; });
      await page.route("**/*", route => { const req = route.request(); return req.method() === "POST" && req.headers()["next-action"] && req.postData()?.includes("idempotencyKey") ? route.fulfill({ status: 404, headers: { "x-nextjs-action-not-found": "1" }, body: "Server action unavailable" }) : route.fallback(); });
      const beforeDocument = await page.evaluate(() => window.__sheetDocument);
      const nativeEvent = page.waitForEvent("framenavigated", { predicate: frame => frame === page.mainFrame() });
      await page.evaluate(() => history.replaceState(history.state, "", location.href));
      await nativeEvent;
      const nativeWasReload = await waitSheetDocumentReload(page, beforeDocument, 250).then(() => true,
        error => { if (error.name === "TimeoutError") return false; throw error; });
      ok("RED native history event cannot satisfy the same actual document reload wait", !nativeWasReload
        && beforeDocument === await page.evaluate(() => window.__sheetDocument));
      const reload = waitSheetDocumentReload(page, beforeDocument);
      await page.locator(S.place).click(); await reload;
      ok("actual Next not-found protocol reloads once with unkeyed tapped5000 marker", (await probe(page)).got.stakeValue === "5,000" && await page.evaluate(() => sessionStorage.getItem("kp:recovered:/") === "qa-skew-build" && !JSON.parse(sessionStorage.getItem("kp-pending-bet"))?.k));
      let navigations = 0; const count = frame => { if (frame === page.mainFrame()) navigations++; }; page.on("framenavigated", count);
      const sameDocument = await page.evaluate(() => window.__sheetDocument);
      await page.locator(S.place).click(); await page.waitForTimeout(500); await waitFrame(page, "edit"); page.off("framenavigated", count);
      const after = await observed(ctx, seed.id), text = (await probe(page)).got.text;
      ok("spent skew reload stays unavailable, zero bets, no check-wallet money claim", sameDocument === await page.evaluate(() => window.__sheetDocument) && /unavailable/i.test(text) && !/check.*wallet/i.test(text) && before.positionCount === after.positionCount && before.betPlacedCount === after.betPlacedCount, `document identity retained across${navigations} main history events, positionsΔ=${after.positionCount-before.positionCount}, ledgerΔ=${after.betPlacedCount-before.betPlacedCount}`);
      await tile(page, "doors-skew-reload-spent"); await closeContext(ctx);
    }
    {
      const { ctx } = await freshPlayer(), page = await pageIn(ctx), seed = await open(page), other = await sibling(ctx), before = await observed(ctx, seed.id);
      await limitsIn(other, { sessionTimeLimitMin: 15 });
      ok("real limits form accepts and persists typed15-minute floor", true, "limitsIn reopens the actual field after saved redirect and verifies15");
      await post(ctx, "bet-sheet-clock", { elapsedMin: 16 });
      await page.locator(S.place).click(); await page.waitForTimeout(350); await waitFrame(page, "edit");
      const after = await observed(ctx, seed.id), p = (await probe(page)).got;
      ok("real15-minute sitting advanced through actual gate: inline refusal, no bet", /session|15/.test(p.text) && before.positionCount === after.positionCount && before.betPlacedCount === after.betPlacedCount);
      await tile(page, "doors-session15-real-gate"); await closeContext(other); await closeContext(ctx);
    }
    {
      const officer = await pageIn(admin, "/admin/config"), form = officer.locator('form:has(input[name="maxStake"])').first(), field = form.locator('input[name="maxStake"]');
      const original = await field.inputValue();
      const saveMax = async value => { await field.fill(value); await hydratedClick(form.getByRole("button", { name: "Save · Hifadhi", exact: true })); await officer.waitForTimeout(400); };
      const { ctx } = await freshPlayer(), page = await pageIn(ctx), seed = await open(page), before = await observed(ctx, seed.id), held = [];
      await page.locator(S.stake).fill("5000");
      await page.route("**/*", route => { const req = route.request(); if (req.method() === "POST" && req.headers()["next-action"] && req.postData()?.includes("idempotencyKey")) { held.push(route); return; } return route.fallback(); });
      try {
        await page.locator(S.place).click(); await waitFrame(page, "placing"); await saveMax("1000");
        for (const route of held) await route.continue(); await waitFrame(page, "edit");
        const after = await observed(ctx, seed.id), p = (await probe(page)).got;
        ok("real officer moves max to1000 after5000 quote captured: updated bounds, zero money rows", /1[,\s]000/.test(p.text) && await page.locator(S.place).isDisabled() && before.positionCount === after.positionCount && before.betPlacedCount === after.betPlacedCount);
        await tile(page, "doors-bounds-after-open");
      } finally { await saveMax(original); await officer.close(); await closeContext(ctx); }
    }
    {
      const { ctx } = await freshPlayer(), page = await pageIn(ctx), seed = await open(page), before = await observed(ctx, seed.id);
      const storm = post(admin, "stress-bulk-bet", { marketId: seed.id, n: 2000, stake: seed.min, userPrefix: "s8qa" });
      await page.waitForTimeout(100); await page.locator(S.place).click(); await storm;
      let p, after;
      for (let attempt = 0; attempt < 90; attempt++) {
        p = (await probe(page)).got; after = await observed(ctx, seed.id);
        if (after.positionCount > before.positionCount || (p.frame === "edit" && /busy/i.test(p.text))) break;
        await page.waitForTimeout(1000);
      }
      if (p.frame === "edit" && /busy/i.test(p.text)) {
        ok("real admission BUSY observed under2000-call storm: inline retry, zero own money rows", before.positionCount === after.positionCount && before.betPlacedCount === after.betPlacedCount);
      } else {
        if(after.positionCount>before.positionCount){await waitFrame(page,"receipt");p=(await probe(page)).got;after=await observed(ctx,seed.id);}
        nm("admission BUSY under actual2000-call storm", `own positionsΔ=${after.positionCount-before.positionCount}, ledgerΔ=${after.betPlacedCount-before.betPlacedCount}, final frame=${p.frame ?? "closed"}; no BUSY refusal observed`);
      }
      await tile(page, "doors-admission-storm"); await closeContext(ctx);
    }
  }

  if (run("tap")) {
    if (process.env.ENGINE === "webkit") nm("tap 4x CPU", "CDP throttling requires Chromium");
    else for (const route of ["/", "/live"]) {
      SESSION = await demoSession(browser, BASE);
      const ctx = await context("en", { width: 360, height: 640 }), page = await pageIn(ctx, route);
      const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.evaluate(([pick, root]) => {
        window.__sheetTap = null;
        const ready = e => {
          if (!e.target.closest(pick)) return;
          const start = performance.now();
          const read = () => {
            const h = document.querySelector(root)?.querySelector("h2");
            if (h?.getBoundingClientRect().height) { window.__sheetTap = performance.now() - start; return; }
            if (performance.now() - start < 5000) requestAnimationFrame(read);
          };
          requestAnimationFrame(read);
        };
        window.addEventListener("pointerup", ready, true);
      }, [S.pick, S.root]);
      await open(page);
      const ms = await page.evaluate(() => window.__sheetTap);
      if (process.env.KP_PRODUCTION === "1") ok(`${route}: production tap frame <=150ms at4x`, typeof ms === "number" && ms <= 150, `${ms}ms`);
      else nm(`${route}: tap frame ${ms}ms at4x`, "dev reading recorded; A21 requires a separately built production server before this can pass");
      await tile(page, `tap-${route === "/" ? "home" : "live"}`); await cdp.detach(); await ctx.close(); contexts.delete(ctx);
    }
  }
} catch (error) {
  for (const page of await admin.pages()) if (new URL(page.url()).pathname === "/admin/payments") await tile(page, "invalid-payments-premise").catch(() => {});
  const diagnostic = String(error?.stack ?? error);
  result("drive stopped on invalid premise or runtime error", "FAIL", diagnostic.split("Call log:")[0].trim() + "\n" + diagnostic.split(/\r?\n/).filter(line => /^\s+at /.test(line) && /scripts[\\/]|qa-bet-sheet/.test(line)).join("\n"));
} finally {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  await admin.close().catch(() => {}); await browser.close();
  writeFileSync(join(OUT, "evidence.json"), JSON.stringify({ base: BASE, engine: process.env.ENGINE ?? "chromium", results, console: consoleRows, observations, tiles }, null, 2));
}
const failures = results.filter(r => r.state === "FAIL"), outstanding = results.filter(r => ["NOT MEASURED", "NOT DRIVEN"].includes(r.state));
console.log(`qa:bet-sheet: ${results.filter(r => r.state === "PASS").length} passed, ${failures.length} failed, ${outstanding.length} outstanding, ${tiles} tiles. Read every tile: ${OUT}`);
process.exitCode = failures.length ? 1 : outstanding.length ? 3 : 0;
