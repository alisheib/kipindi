/** S8 A21: production-build rendering evidence, never a money or database proof.
 * The root operator starts qa:bet-sheet-prod-serve on 127.0.0.1:3044 first. This driver only GETs pages and opens/closes
 * dialogs; the app's normal notification reader may POST a Server Action. It never seeds via HTTP, submits a bet,
 * builds, starts a server, or alters a database. Synthetic read pools
 * are explicitly the local rendering fixture. Credentials are read from ignored fixture.json and never printed.
 * npm run qa:bet-sheet-production -- [OUTPUT_DIR] | --self-test
 * Exit 0 selected production gates passed; 1 defect/control failure; 2 invalid premise; 3 an unmeasured gate.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { BET_SHEET_SELECTORS as S, betSheetTracesIn, betSheetTracesControl } from "./live/bet-sheet-cells.mjs";
import { MARKERS, checkMarkerTable, loadBuild, readAll, readRoute, judgeRow } from "./qa-first-load.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.KP_BASE ?? "http://127.0.0.1:3044";
const NEXT = join(ROOT, ".next");
const STARTED_AT = new Date().toISOString();
const BUDGET_MS = 150;
const CPU_RATE = 4;
const sha256 = value => createHash("sha256").update(value).digest("hex");
const gitHead = () => execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const refuse = reason => { console.error(`REFUSED: ${reason}`); process.exit(2); };

function premiseErrors(base, meta, local) {
  const errors = [];
  let url;
  try { url = new URL(base); } catch { return ["invalid URL"]; }
  if (url.origin !== "http://127.0.0.1:3044" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) errors.push("exclusive local target is http://127.0.0.1:3044");
  if (meta?.mode !== "production" || meta?.localOnly !== true || meta?.databaseConfigured !== false || meta?.memoryFixtureBuildException !== true) errors.push("HTTP metadata does not declare the explicit local-memory production rendering exception");
  if (!/^[a-f0-9]{40}$/.test(meta?.buildSha ?? "") || meta?.buildSha !== meta?.sourceHead || meta?.sourceHead !== local?.head) errors.push("HTTP production source SHA is not the local HEAD");
  if (meta?.sourceDirty !== false || local?.sourceDirty !== false) errors.push("served source was dirty when its fixture booted or since");
  if (!meta?.buildId || meta.buildId !== local?.buildId || meta.buildSha !== local?.deploymentId) errors.push("HTTP build ID/SHA does not match the local production build");
  return errors;
}
function tapErrors(probe, { title, route }) {
  const errors = [];
  if (!probe || !Number.isFinite(probe.ms)) return ["heading was not observed in a painted-frame probe"];
  if (probe.ms < 0 || probe.ms > BUDGET_MS) errors.push(`heading frame exceeded ${BUDGET_MS}ms`);
  if (!probe.visible || probe.heading !== title) errors.push("first frame did not contain the selected card heading");
  if (probe.path !== route) errors.push("pick navigated instead of opening in place");
  return errors;
}
/** Classify the real built action, never a request's route: the bell's read uses the same POST route as a bet. */
function readOnlyAction(manifest, id) {
  const action = manifest?.node?.[id];
  if (!action || typeof action !== "object" || Array.isArray(action)) return false;
  const workers = action.workers;
  if (!workers || typeof workers !== "object" || Array.isArray(workers)) return false;
  const entries = Object.values(workers);
  if (entries.length === 0) return false;
  const identity = entry => entry?.exportedName === "fetchMyNotifications"
    && entry?.filename === "src/app/_actions/notifications.ts";
  const hasIdentity = entry => Object.hasOwn(entry, "filename") || Object.hasOwn(entry, "exportedName");
  // Next 16.4 records the source identity on the action, with moduleId/async-only worker rows.
  // An incomplete or conflicting action identity must never fall back to a plausible worker name.
  if (hasIdentity(action)) {
    if (!identity(action)) return false;
    return entries.every(worker => {
      if (!worker || typeof worker !== "object" || Array.isArray(worker)) return false;
      const moduleId = worker.moduleId;
      const validModule = typeof moduleId === "string" ? moduleId.trim().length > 0
        : typeof moduleId === "number" && Number.isSafeInteger(moduleId) && moduleId >= 0;
      return Object.hasOwn(worker, "moduleId") && Object.hasOwn(worker, "async")
        && validModule && typeof worker.async === "boolean"
        && (!hasIdentity(worker) || identity(worker));
    });
  }
  // Retain the older manifest's exact identity on every worker. Bare module IDs are unclassified here.
  return entries.every(identity);
}
function controls() {
  const head = "a".repeat(40), local = { head, buildId: "one-build", deploymentId: head, sourceDirty: false };
  const meta = { mode: "production", localOnly: true, databaseConfigured: false, memoryFixtureBuildException: true, buildSha: head, sourceHead: head, sourceDirty: false, buildId: "one-build" };
  const good = { ms: 50, visible: true, heading: "Selected question", path: "/live" };
  const expected = { title: good.heading, route: good.path };
  const actions = { node: { reader: { workers: { "app/page": { exportedName: "fetchMyNotifications", filename: "src/app/_actions/notifications.ts" } } },
    bet: { workers: { "app/page": { exportedName: "buyPositionAction", filename: "src/app/markets/actions.ts" } } } } };
  const readerIdentity = { exportedName: "fetchMyNotifications", filename: "src/app/_actions/notifications.ts" };
  const validWorker = { moduleId: "123", async: false };
  const modern = (changes = {}, workers = { "app/page": validWorker }) => ({ node: { reader: { ...readerIdentity, workers, ...changes } } });
  const misleadingTop = modern({ exportedName: "buyPositionAction" });
  const conflictingWorker = modern({}, { "app/page": { ...validWorker, exportedName: "buyPositionAction", filename: readerIdentity.filename } });
  const invalidModule = modern({}, { "app/page": { moduleId: null, async: false } });
  const source = readOnlyAction.toString();
  const mutate = (before, after) => {
    if (source.split(before).length !== 2) throw new Error("Read-only action classifier mutation anchor changed");
    return new Function(`return (${source.replace(before, after)});`)();
  };
  return [
    ["production premise accepts only its declared matching build", premiseErrors(BASE, meta, local).length === 0],
    ["dev metadata cannot claim production PASS", premiseErrors(BASE, { ...meta, mode: "development" }, local).length > 0],
    ["configured database is refused", premiseErrors(BASE, { ...meta, databaseConfigured: true }, local).length > 0],
    ["remote or another local port is refused", ["https://www.50pick.tz", "http://127.0.0.1:3043"].every(base => premiseErrors(base, meta, local).length > 0)],
    ["dirty or stale build SHA is refused", [{ ...meta, sourceDirty: true }, { ...meta, buildSha: "b".repeat(40) }, { ...meta, buildId: "stale" }].every(plant => premiseErrors(BASE, plant, local).length > 0)],
    ["within-budget selected visible frame passes", tapErrors(good, expected).length === 0],
    ["a late frame fails the same verdict", tapErrors({ ...good, ms: 151 }, expected).includes("heading frame exceeded 150ms")],
    ["a hidden or wrong heading fails the same verdict", [{ ...good, visible: false }, { ...good, heading: "Another question" }, null].every(plant => tapErrors(plant, expected).length > 0)],
    ["navigation cannot pass as an in-place frame", tapErrors({ ...good, path: "/markets/other" }, expected).includes("pick navigated instead of opening in place")],
    ["classic served-trace controls hold", betSheetTracesControl().length === 0],
    ["only the built notification reader is allowed as a background POST", readOnlyAction(actions, "reader") && !readOnlyAction(actions, "bet")],
    ["an unknown, empty or misleading action cannot pass the reader verdict", !readOnlyAction(actions, "unknown")
      && !readOnlyAction({ node: { reader: { workers: {} } } }, "reader")
      && !readOnlyAction({ node: { reader: { workers: { "app/page": { exportedName: "fetchMyNotifications", filename: "src/app/markets/actions.ts" } } } } }, "reader")
      && !readOnlyAction({ node: { reader: { workers: { ...actions.node.reader.workers, "app/live": actions.node.bet.workers["app/page"] } } } }, "reader")],
    ["new manifest accepts the exact top-level notification identity with valid string/numeric module workers",
      readOnlyAction(modern({}, { "app/page": validWorker, "app/help/page": { moduleId: 0, async: true } }), "reader")],
    ["new manifest rejects missing, empty, array or invalid worker collections",
      [undefined, null, {}, [], "workers"].every(workers => !readOnlyAction(modern({ workers }), "reader"))],
    ["new manifest rejects malformed worker module IDs or async flags",
      [null, undefined, [], "worker", {}, { moduleId: " ", async: false }, { moduleId: null, async: false },
        { moduleId: -1, async: false }, { moduleId: Infinity, async: false }, { moduleId: 1.2, async: false },
        { moduleId: "123" }, { moduleId: "123", async: "false" }]
        .every(worker => !readOnlyAction(modern({}, { "app/page": worker }), "reader"))],
    ["new manifest rejects conflicting or incomplete worker identities",
      !readOnlyAction(conflictingWorker, "reader")
      && !readOnlyAction(modern({}, { "app/page": { ...validWorker, filename: "src/app/markets/actions.ts" } }), "reader")
      && !readOnlyAction(modern({}, { "app/page": { ...validWorker, exportedName: "fetchMyNotifications" } }), "reader")],
    ["new manifest permits matching redundant worker identity",
      readOnlyAction(modern({}, { "app/page": { ...validWorker, ...readerIdentity } }), "reader")],
    ["misleading or incomplete top-level identity cannot use the legacy fallback",
      [{ exportedName: "buyPositionAction" }, { filename: "src/app/markets/actions.ts" },
        { filename: undefined }, { exportedName: undefined }]
        .every(changes => !readOnlyAction(modern(changes, actions.node.reader.workers), "reader"))],
    ["bare module worker metadata never classifies an unknown action as a reader",
      !readOnlyAction({ node: { reader: { workers: { "app/page": validWorker } } } }, "reader")
      && !readOnlyAction(modern(), "unknown")],
    ["PLANTED CONTROL top-level source identity removal is caught by the same reader verdict",
      mutate("if (!identity(action)) return false;", "")(misleadingTop, "reader") === true
      && !readOnlyAction(misleadingTop, "reader")],
    ["PLANTED CONTROL conflicting worker identity removal is caught by the same reader verdict",
      mutate("&& (!hasIdentity(worker) || identity(worker))", "")(conflictingWorker, "reader") === true
      && !readOnlyAction(conflictingWorker, "reader")],
    ["PLANTED CONTROL nonempty-worker requirement removal is caught by the same reader verdict",
      mutate("if (entries.length === 0) return false;", "")(modern({}, {}), "reader") === true
      && !readOnlyAction(modern({}, {}), "reader")],
    ["PLANTED CONTROL module-validity removal is caught by the same reader verdict",
      mutate('validModule && typeof worker.async === "boolean"', 'true && typeof worker.async === "boolean"')(invalidModule, "reader") === true
      && !readOnlyAction(invalidModule, "reader")],
  ];
}

/** Installed before React runs. This observes the actual host registration and heading animation frame; no source
 * plant or instrumented build. RAF timestamps represent the frame about to paint, which is A21's specified probe.
 * A second RAF confirms the selected heading remained present after that frame; its time is recorded separately.
 */
function installProbe({ pick, root }) {
  const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
  const host = (target, type, listener) => (target === window || target === document) && type === "click" && typeof listener === "function" && listener.toString().includes("a[data-bet-side]");
  EventTarget.prototype.addEventListener = function(type, listener, options) { const answer = add.call(this, type, listener, options); if (host(this, type, listener)) window.__productionSheetHostReady = true; return answer; };
  EventTarget.prototype.removeEventListener = function(type, listener, options) { const answer = remove.call(this, type, listener, options); if (host(this, type, listener)) window.__productionSheetHostReady = false; return answer; };
  const visible = element => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return false;
    for (let e = element; e; e = e.parentElement) { const css = getComputedStyle(e); if (css.display === "none" || css.visibility !== "visible" || Number(css.opacity) === 0) return false; }
    return true;
  };
  window.__productionSheetTap = null;
  window.addEventListener("pointerup", event => {
    if (!event.target.closest?.(pick)) return;
    const start = performance.now();
    window.__productionSheetTap = { started: start, ms: null, frames: 0 };
    const frame = () => {
      const probe = window.__productionSheetTap;
      probe.frames++;
      const h = document.querySelector(root)?.querySelector("h2");
      if (visible(h)) {
        const observed = performance.now();
        Object.assign(probe, { ms: observed - start, headingAtEpoch: performance.timeOrigin + observed, visible: true, heading: h.textContent.trim(), path: location.pathname, frame: document.querySelector(root)?.dataset.frame });
        requestAnimationFrame(() => { probe.confirmedAt = performance.now() - start; probe.remainedVisible = visible(h); });
      } else if (performance.now() - start < 5000) requestAnimationFrame(frame);
      else Object.assign(probe, { visible: false, path: location.pathname });
    };
    requestAnimationFrame(frame);
  }, true);
}

const controlRows = controls();
for (const [label, pass] of controlRows) console.log(`${pass ? "PASS" : "FAIL"} control: ${label}`);
if (controlRows.some(([, pass]) => !pass)) process.exit(1);
if (process.argv.includes("--self-test")) process.exit(0);

let fixture;
try { fixture = JSON.parse(readFileSync(join(ROOT, ".qa-artifacts", "s8-production", "fixture.json"), "utf8")); }
catch { refuse("local production fixture is absent; the root operator must start its guarded helper"); }
if (!fixture?.marketId || !Array.isArray(fixture.cookies) || !fixture.cookies.some(c => c.name === "kp_session") || !fixture.cookies.some(c => c.name === "kp_preview")) refuse("fixture lacks the required local signed session/pass");
const redact = value => {
  let text = String(value);
  for (const cookie of fixture.cookies) if (cookie.value) text = text.replaceAll(cookie.value, "[REDACTED]");
  return text;
};
const scrub = value => redact(value).split("Call log:")[0].slice(0, 1800);
let meta, local;
try {
  const response = await fetch(`${BASE}/_next/static/kp-s8-local-build.json`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) refuse(`HTTP production metadata unavailable (${response.status})`);
  meta = await response.json();
  const required = JSON.parse(readFileSync(join(NEXT, "required-server-files.json"), "utf8"));
  local = { head: gitHead(), buildId: readFileSync(join(NEXT, "BUILD_ID"), "utf8").trim(), deploymentId: required.config.deploymentId,
    sourceDirty: execFileSync("git", ["status", "--porcelain", "--", "src", "next.config.ts", "prisma", "package-lock.json"], { cwd: ROOT, encoding: "utf8" }).trim().length > 0 };
} catch (error) { refuse(`production premise unavailable: ${scrub(error.message)}`); }
const premise = premiseErrors(BASE, meta, local);
if (premise.length) refuse(premise.join("; "));
const healthResponse = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(20_000) });
const health = await healthResponse.json();
if (!healthResponse.ok || !health.ok || health.database?.configured !== false || health.simpleJourney?.state === "ACTIVE") refuse("health does not confirm a ready local-memory staff preview");

const OUT = resolve(process.argv[2] ?? join(ROOT, ".qa-artifacts", "s8-production", `drive-${Date.now()}`));
mkdirSync(OUT, { recursive: true });
const rows = [], errors = [], contexts = new Set();
const row = (label, state, detail = {}) => { rows.push({ label, state, ...detail }); console.log(`${state} ${label}${detail.ms !== undefined ? ` — ${detail.ms.toFixed(2)}ms` : ""}`); };
const ok = (label, pass, detail = {}) => row(label, pass ? "PASS" : "FAIL", detail);
const chrome = process.env.QA_CHROMIUM_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
if (!existsSync(chrome)) refuse("real Chrome executable unavailable; QA_CHROMIUM_PATH may identify the installed Chrome");
let browser;
try { browser = await chromium.launch({ executablePath: chrome, headless: true }); }
catch (error) { refuse(`Chrome launch unavailable: ${scrub(error.message)}`); }
const browserVersion = browser.version();
const actionManifest = JSON.parse(readFileSync(join(NEXT, "server", "server-reference-manifest.json"), "utf8"));
const context = async (preview = true, js = true) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, javaScriptEnabled: js }); contexts.add(ctx);
  await ctx.addCookies(fixture.cookies.filter(c => preview || c.name !== "kp_preview").map(c => ({ name: c.name, value: c.value, url: BASE })));
  return ctx;
};
const close = async ctx => { await ctx.close(); contexts.delete(ctx); };
try {
  // Read every route's actual production entry set, not just the routes the browser happens to visit below.
  const table = checkMarkerTable(ROOT), build = loadBuild(NEXT), hostRows = MARKERS.filter(r => r.stage === "S8");
  ok("first-load marker table identifies the real S8 modules", table.ok, { problems: table.lines.filter(l => l.startsWith("✗")) });
  const routes = ["/", "/markets", "/positions", "/help", "/live", "/results", "/watchlist", "/markets/[id]", "/account", "/updown/history"];
  const reading = readAll(build, routes, { table: hostRows, judgedRows: table.rows });
  ok("first-load real classic control and in-memory S8 entry plant", reading.controlOk && reading.plant.ok, { plant: reading.plant.text });
  for (const r of reading.routes) ok(`first-load ${r.route}: available lazy host and absent sheet markers`, !r.missing
    && r.reading.unreadable.length === 0 && r.reading.unreadableParts.length === 0 && r.rows.every(x => x.j && !x.j.bad),
    { missing: r.missing ?? null, unreadableParts: r.reading?.unreadableParts ?? [], parts: r.rows?.map(x => ({ id: x.row.id, ...x.j })) });
  const hostRow = hostRows.find(r => r.id === "BetSheetHost"), entry = readRoute(build, "/", hostRow.marker);
  const plant = judgeRow(hostRow, entry, true, true);
  ok("RED host marker joined to an entry set fails the same first-load verdict", plant?.bad === true && plant?.verdict === "UNEXPECTED");

  const served = await context(false, false);
  for (const route of ["/", "/live", `/markets/${fixture.marketId}`]) {
    const response = await served.request.get(BASE + route, { timeout: 90_000 });
    const html = await response.text(), traces = betSheetTracesIn(html);
    writeFileSync(join(OUT, `classic-${route === "/" ? "home" : route === "/live" ? "live" : "question"}.html`), redact(html));
    ok(`served classic ${route}: document asset deployment SHA matches metadata`, html.includes(`?dpl=${meta.buildSha}`));
    ok(`served classic ${route}: no S8 document trace`, response.ok() && traces.length === 0, { status: response.status(), traces, bytes: Buffer.byteLength(html), sha256: sha256(html) });
  }
  await close(served);
  const journey = await context(true, false);
  for (const route of ["/", "/live", `/markets/${fixture.marketId}`]) {
    const response = await journey.request.get(BASE + route, { timeout: 90_000 }), html = await response.text();
    const sheetSeeds = (html.match(/\bdata-sheet="/g) ?? []).length;
    const questionGhost = /data-testid="journey-question-ghost"/.test(html);
    writeFileSync(join(OUT, `journey-${route === "/" ? "home" : route === "/live" ? "live" : "question"}.html`), redact(html));
    ok(`served journey ${route}: document asset deployment SHA matches metadata`, html.includes(`?dpl=${meta.buildSha}`));
    ok(`served journey ${route}: real seed and correct page arm`, response.ok() && sheetSeeds > 0 && (route.startsWith("/markets/") ? /data-testid="journey-bet-buttons"/.test(html) : /data-testid="journey-card"/.test(html)), { status: response.status(), sheetSeeds, questionGhost, bytes: Buffer.byteLength(html), sha256: sha256(html) });
    if (route.startsWith("/markets/")) row("served journey question ghost observation", questionGhost ? "PASS" : "NOT MEASURED", { observed: questionGhost, scope: "document bytes only; no artificial server delay, no origin/main parity claim" });
  }
  await close(journey);

  for (const route of ["/", "/live"]) for (let sample = 1; sample <= 3; sample++) {
    const ctx = await context(), page = await ctx.newPage(), reads = [], actions = [];
    page.on("pageerror", error => { errors.push({ route, sample, kind: "pageerror", message: scrub(error.message) }); });
    page.on("console", message => { if (message.type() === "error") errors.push({ route, sample, kind: "console", message: scrub(message.text()) }); });
    page.on("request", request => {
      if (request.method() !== "POST") return;
      const id = request.headers()["next-action"];
      actions.push({ method: "POST", path: new URL(request.url()).pathname, allowedRead: !!id && readOnlyAction(actionManifest, id) });
    });
    await page.addInitScript(installProbe, { pick: S.pick, root: S.root });
    // Delay only the private GET, proving the selected heading does not wait for its wallet/facts response.
    await page.route("**/api/markets/*/sheet?**", async request => {
      if (request.request().method() === "GET") { const read = { requestedAt: Date.now(), responseReleasedAt: null }; reads.push(read); await new Promise(resolve => setTimeout(resolve, 500)); read.responseReleasedAt = Date.now(); }
      await request.continue();
    });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE });
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForFunction(() => window.__productionSheetHostReady === true, null, { timeout: 30_000 });
    const anchor = page.locator(`${S.pick}[data-bet-side="YES"]`).first();
    await anchor.waitFor({ state: "visible", timeout: 30_000 });
    const title = await anchor.evaluate(a => a.closest("[data-sheet]").getAttribute("data-sheet-title"));
    if (!title) throw new Error("selected card did not carry its localized sheet heading");
    await anchor.click();
    await page.waitForFunction(() => Number.isFinite(window.__productionSheetTap?.ms) && Number.isFinite(window.__productionSheetTap?.confirmedAt), null, { timeout: 10_000 });
    const probe = await page.evaluate(() => window.__productionSheetTap), verdict = tapErrors(probe, { title, route });
    ok(`${route}: production heading frame sample ${sample} at 4× CPU`, verdict.length === 0 && probe.remainedVisible === true, { ...probe, verdict, cpuRate: CPU_RATE, viewport: "360x640", delayedPrivateRead: true });
    const headingBeforeRead = reads.some(read => read.requestedAt <= probe.headingAtEpoch)
      && reads.every(read => read.responseReleasedAt === null || read.responseReleasedAt > probe.headingAtEpoch);
    ok(`${route}: sample ${sample} heading drawn before private response`, headingBeforeRead, { privateReads: reads.length });
    await page.screenshot({ path: join(OUT, `${route === "/" ? "home" : "live"}-tap-${sample}.png`) });
    await page.locator(S.close).click();
    await page.locator(S.root).waitFor({ state: "detached", timeout: 10_000 });
    // The same pointerup and frame observer must reject a page-only 250ms hidden-heading plant.
    await page.evaluate(selector => {
      const style = document.createElement("style"); style.textContent = `${selector} h2 { visibility:hidden !important }`; document.head.append(style);
      window.addEventListener("pointerup", function release(event) { if (!event.target.closest("[data-sheet] a[data-bet-side]")) return; window.removeEventListener("pointerup", release, true); setTimeout(() => style.remove(), 250); }, true);
    }, S.root);
    await anchor.click();
    await page.waitForFunction(() => Number.isFinite(window.__productionSheetTap?.ms), null, { timeout: 10_000 });
    const red = await page.evaluate(() => window.__productionSheetTap), redVerdict = tapErrors(red, { title, route });
    ok(`${route}: RED delayed heading fails the same tap-frame verdict`, redVerdict.includes("heading frame exceeded 150ms") && red.ms >= 200, { ...red, verdict: redVerdict, pageOnlyPlant: "heading hidden 250ms" });
    ok(`${route}: render-only drive submitted no money or unclassified action`, actions.every(action => action.allowedRead),
      { backgroundReadRequests: actions.filter(action => action.allowedRead).length, blockedRequests: actions.filter(action => !action.allowedRead) });
    await page.unrouteAll({ behavior: "wait" }); // let delayed read handlers finish before intentionally closing their page
    await cdp.detach(); await close(ctx);
  }
  ok("production drive had no uncaught browser or console errors", errors.length === 0, { errors });
  const lastMeta = await (await fetch(`${BASE}/_next/static/kp-s8-local-build.json`, { cache: "no-store", signal: AbortSignal.timeout(15_000) })).json();
  const sourceDirty = execFileSync("git", ["status", "--porcelain", "--", "src", "next.config.ts", "prisma", "package-lock.json"], { cwd: ROOT, encoding: "utf8" }).trim().length > 0;
  ok("production build and source remained identical through the drive", JSON.stringify(lastMeta) === JSON.stringify(meta) && gitHead() === local.head && !sourceDirty);
} catch (error) {
  row("production drive stopped", "FAIL", { message: scrub(error.stack ?? error) });
} finally {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  await browser.close();
  writeFileSync(join(OUT, "evidence.json"), JSON.stringify({ scope: "local production rendering/latency only; synthetic pools, no money or database proof; served absence is not a full --main parity comparison", startedAt: STARTED_AT, finishedAt: new Date().toISOString(), base: BASE, browser: browserVersion, cpuRate: CPU_RATE, budgetMs: BUDGET_MS, metadata: meta, controls: controlRows.map(([label, pass]) => ({ label, pass })), rows, errors }, null, 2));
}
const failed = rows.filter(row => row.state === "FAIL"), outstanding = rows.filter(row => row.state === "NOT MEASURED");
console.log(`qa:bet-sheet-production: ${rows.filter(row => row.state === "PASS").length} passed, ${failed.length} failed, ${outstanding.length} unmeasured; evidence ${OUT}`);
process.exitCode = failed.length ? 1 : outstanding.length ? 3 : 0;
