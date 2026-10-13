/** S8 WP7: defensive seeds, durable unfinished keys and controller safety. In-process mutations; no files written. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { parseSheetSeed } from "../src/lib/journey/sheet-seed.ts";
import { pendingIntents, pendingStorage, PENDING_STORAGE_MAX_BYTES, type StoredIntent } from "../src/lib/journey/sheet-storage.ts";
import { attributionFrom, pendingBetFrom, readMarker, stakeFromUrl, writeMarker, PENDING_BET_KEY } from "../src/lib/journey/pending-bet.ts";
import { clockOffset, estimateMoved, sheetEstimate, withBet, withoutBet } from "../src/lib/journey/sheet-state.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n"));
const HOST = read("src/components/journey/bet-sheet/bet-sheet-host.tsx");
const SHELL = read("src/components/layout/app-shell.tsx");
const LAZY = read("src/components/layout/shell-lazy.tsx");
const BOOTSTRAP = read("scripts/live/bet-sheet-prod-bootstrap.mts");
const MODAL = read("src/components/ui/modal.tsx");
const NOW = Date.UTC(2026, 9, 13, 12);
const SEED = { v: 1, id: "mkt_sheet01", yesPool: 24_825, noPool: 50_462, rates: { feeModel: "loser-share", platformFeeRate: .03, operatorFeeRate: .1 }, feePct: 13, min: 500, max: 1_000_000, closesAt: new Date(NOW + 60_000).toISOString(), serverNow: NOW, bettable: true };
const key = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const stored = (i: number): StoredIntent => ({ quote: { marketId: `mkt_sheet${i}`, side: i % 2 ? "YES" : "NO", stake: 500 + i }, key: key(i), at: NOW - 1_000 });
type Impl = { parse: typeof parseSheetSeed; restore: typeof pendingIntents; pack: typeof pendingStorage; host: string; shell: string; lazy: string; bootstrap: string; modal: string };
const REAL: Impl = { parse: parseSheetSeed, restore: pendingIntents, pack: pendingStorage, host: HOST, shell: SHELL, lazy: LAZY, bootstrap: BOOTSTRAP, modal: MODAL };
type Check = { name: string; pass: boolean };
/** Execute only the REAL pure CLI predicate and first refusal expression; never import/seed the fixture. */
function bootstrapAllows(source: string, entry: string, args: string[], env: Record<string, string | undefined>): boolean {
  try {
    const file = ts.createSourceFile("bootstrap.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const predicate = file.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === "localProductionStart");
    const refusal = file.statements.find(ts.isIfStatement);
    if (!predicate || !refusal) return false;
    const js = ts.transpileModule(predicate.getText(file), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    return new Function("process", `${js}\nreturn !(${refusal.expression.getText(file)});`)({ argv: ["node", entry, ...args], env }) === true;
  } catch { return false; }
}
const GOOD_ENTRY = "C:/local/node_modules/next/dist/bin/next";
const GOOD_ARGS = ["start", "--hostname", "127.0.0.1", "--port", "3044"];
const GOOD_ENV = { KP_QA_MEMORY_BOOTSTRAP: "bet-sheet-local-production", NODE_ENV: "production", DATABASE_URL: undefined };
function hostArrow(source: string, name: string): string {
  const file = ts.createSourceFile("host.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.ArrowFunction | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name && node.initializer
      && ts.isCallExpression(node.initializer) && ts.isArrowFunction(node.initializer.arguments[0])) callback = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!callback) throw new Error(`Missing callback ${name}`);
  return callback.getText(file);
}
function bindHost(source: string, name: string, dependencies: Record<string, unknown>): any {
  const js = ts.transpileModule(`const callback = ${hostArrow(source, name)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(dependencies), `${js}\nreturn callback;`)(...Object.values(dependencies));
}
/** A scoped plant must change the actual callback; stale or ambiguous anchors refuse the plant. */
function plantCallback(source: string, name: string, from: string, to: string): string {
  const arrow = hostArrow(source, name);
  if (arrow.split(from).length !== 2) throw new Error(`Non-unique ${name} plant`);
  return source.replace(arrow, arrow.replace(from, to));
}
function layoutLifecycle(source: string): boolean {
  try {
    const file = ts.createSourceFile("host.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let callback: ts.ArrowFunction | undefined, dependencies: ts.Node | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText(file) === "useLayoutEffect"
        && ts.isArrowFunction(node.arguments[0]) && node.arguments[0].getText(file).includes("mounted.current")) {
        callback = node.arguments[0]; dependencies = node.arguments[1];
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    if (!callback || dependencies?.getText(file) !== "[]") return false;
    const mounted = { current: false };
    const js = ts.transpileModule(`const effect = ${callback.getText(file)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const cleanup = new Function("mounted", `${js}\nreturn effect();`)(mounted);
    if (mounted.current !== true || typeof cleanup !== "function") return false;
    cleanup(); return !mounted.current;
  } catch { return false; }
}
/** Actual callbacks, controlled refs/answers and a fake browser surface: no React, HTTP, SQL or money action. */
async function lifecycleChecks(source: string) {
  try {
    const quote = { marketId: "mkt_old", side: "YES", stake: 500 };
    const identity = (q: any) => `${q.marketId}.${q.side}`;
    const activeIdentity = (a: any) => identity({ marketId: a.seed.id, side: a.side });
    const make = (live = true) => {
      const record: any = { intent: { quote, key: key(101), phase: "inDoubt", sentAt: NOW - 60_000, settledAt: NOW - 60_000 }, at: NOW, lastRead: 0 };
      const other = { quote: { marketId: "mkt_new", side: "NO" as const, stake: 1000 }, key: key(102), at: NOW };
      const selected: { current: any } = { current: { bet: "mkt_old.YES.500", at: NOW, k: key(101) } };
      const pending = { current: new Map<string, any>([[identity(quote), record], [identity(other.quote), { intent: { ...other, phase: "inDoubt" }, at: NOW }]]) };
      const current: { current: any } = { current: { seed: { ...SEED, id: quote.marketId }, side: "YES", serial: 1, stakeText: "500", viewer: { state: "failed" }, dropSide: false, pushed: false } };
      const mounted = { current: live }, storage = new Map<string, string>();
      const writes: string[] = [], history: string[] = [], shown: any[] = [], events: string[] = [], preferences: string[] = [];
      const window = { sessionStorage: { getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => { storage.set(k, v); writes.push(k); }, removeItem: (k: string) => { storage.delete(k); writes.push(k); } },
        location: { pathname: "/live", search: "?bet=mkt_old.YES.500", hash: "", reload: () => events.push("reload") },
        history: { state: {}, replaceState: (_s: any, _t: string, url: string) => history.push(url), pushState: (_s: any, _t: string, url: string) => history.push(url), back: () => history.push("back") },
        localStorage: { getItem: () => "[]", setItem: (k: string) => preferences.push(k) }, dispatchEvent: (e: Event) => events.push(e.type) };
      const show = (value: any) => { shown.push(value); current.current = value; };
      const closedReceipts = { current: new Map<string, any>() };
      const save = bindHost(source, "save", { mounted, pending, selected, pendingStorage, PENDING_STORAGE_MAX_BYTES, PENDING_BET_KEY, window });
      const stripAddress = bindHost(source, "stripAddress", { mounted, window, withoutBet });
      const receipt = bindHost(source, "receipt", { mounted, pending, selected, current, identity, activeIdentity, closedReceipts, save, stripAddress, show, window, pendingBetFrom, refreshed: async () => {}, revise: () => {} });
      return { record, other, selected, pending, current, mounted, storage, writes, history, shown, events, preferences, window, save, stripAddress, receipt, closedReceipts, show };
    };
    const old = make(false);
    // The new host has already saved another question. The old host's refs are intentionally still intact.
    const newer = pendingStorage({ bet: "mkt_new.NO.1000", at: NOW, k: key(102) }, [old.other])!;
    old.storage.set(PENDING_BET_KEY, newer); old.window.location.search = "?bet=mkt_new.NO.1000";
    const unsaved = old.save() === false; old.stripAddress(false); old.receipt(old.record, "pos_old", false);
    const lateReceipt = unsaved && old.storage.get(PENDING_BET_KEY) === newer && old.writes.length === 0 && old.history.length === 0
      && old.shown.length === 0 && old.events.length === 0 && old.preferences.length === 0 && old.pending.current.size === 2;
    const closed = make(); closed.current.current = null;
    closed.receipt(closed.record, "pos_confirmed", true);
    const restored = pendingIntents(closed.storage.get(PENDING_BET_KEY) ?? null, NOW);
    const closedReceipt = closed.pending.current.size === 1 && closed.closedReceipts.current.get("mkt_old.YES")?.view.positionId === "pos_confirmed"
      && restored.length === 1 && restored[0].key === key(102) && closed.events.includes("50pick:refresh");

    const keyRead = async (late: boolean, landed: boolean) => {
      const h = make(!late), readingKeys = { current: new Set<string>() };
      let reads = 0, retired = 0, receipts = 0, revisions = 0, resolve!: (v: any) => void;
      const read = bindHost(source, "readKey", { mounted: h.mounted, pending: h.pending, current: h.current, selected: h.selected, readingKeys, identity, activeIdentity,
        readTruth: () => { reads++; return new Promise(r => { resolve = r; }); }, receipt: () => receipts++,
        afterKeyRead: () => { retired++; return "ended"; }, save: h.save, show: h.show, revise: () => revisions++, refreshed: async () => {} });
      if (late) {
        const work = read(h.record);
        if (reads) resolve({ reread: { state: "failed" }, keyPosition: null });
        await work;
        return reads === 0 && h.record.lastRead === 0 && readingKeys.current.size === 0;
      }
      const work = read(h.record); h.mounted.current = false;
      resolve({ reread: { state: "read", market: { found: false } }, keyPosition: landed ? { positionId: "pos_late" } : null }); await work;
      return reads === 1 && retired === 0 && receipts === 0 && revisions === 0 && h.pending.current.size === 2
        && h.selected.current.k === key(101) && h.writes.length === 0 && h.shown.length === 0 && readingKeys.current.size === 0;
    };
    const keyReadEntry = await keyRead(true, false), keyReadLate = await keyRead(false, false) && await keyRead(false, true);

    const action = async (stage: "entry" | "answer" | "truth" | "live") => {
      const h = make(stage !== "entry"), requests = { current: new Set<string>() };
      // A fresh explicit tap. Frame selection is controlled; the controller/serialization is the actual source.
      h.pending.current.clear(); h.selected.current = null;
      let work: Promise<void> | undefined, dispatches = 0, outcomes = 0, reads = 0, settles = 0, revisions = 0, frames = 0;
      let answerResolve!: (v: any) => void, truthResolve!: (v: any) => void;
      const commit = bindHost(source, "commit", { mounted: h.mounted, current: h.current, pending: h.pending, requests, selected: h.selected,
        activeIdentity, identity, sheetFrame: () => { frames++; return {}; }, quoteAt: () => quote, nextKey: () => ({ quote, key: key(101) }), requestFor: () => new FormData(),
        readMarker, writeMarker, attributionFrom, save: h.save, show: h.show, window: h.window, withBet, revise: () => revisions++,
        startTransition: (fn: () => Promise<void>) => { work = fn(); }, answerOf: (fn: () => Promise<unknown>) => fn(),
        buyPositionAction: () => { dispatches++; return new Promise(r => { answerResolve = r; }); },
        refusalOutcome: () => { outcomes++; return { reread: "viewer", frame: "decide" }; },
        readTruth: () => { reads++; return new Promise(r => { truthResolve = r; }); },
        settleRefusal: () => { settles++; return { view: { kind: "inline" }, marker: "dropKey" }; }, afterSettle: () => null,
        receipt: h.receipt, readKey: async () => {}, isActionRedirect: () => false, globalThis: {} });
      commit("cta");
      if (stage === "entry") {
        if (dispatches) { answerResolve({ kind: "resolved", value: {} }); await Promise.resolve(); await Promise.resolve(); if (reads) truthResolve({ reread: { state: "failed" } }); await work; }
        return frames === 0 && dispatches === 0 && h.pending.current.size === 0 && requests.current.size === 0
          && h.writes.length === 0 && h.history.length === 0 && h.shown.length === 0 && revisions === 0;
      }
      const writes = h.writes.length, histories = h.history.length, drawings = h.shown.length, revisionsBefore = revisions;
      if (stage === "answer") h.mounted.current = false;
      answerResolve({ kind: "resolved", value: {} });
      // The actual transition passes its first await before the controlled private-read promise.
      await Promise.resolve(); await Promise.resolve();
      if (stage === "truth") h.mounted.current = false;
      if (reads) truthResolve({ reread: { state: "read" }, seed: null, viewer: null });
      await work;
      if (stage === "live") return dispatches === 1 && outcomes === 1 && reads === 1 && settles === 1 && requests.current.size === 0 && h.pending.current.size === 0 && !h.selected.current?.k;
      return dispatches === 1 && settles === 0 && h.pending.current.size === 1 && h.selected.current?.k === key(101)
        && h.writes.length === writes && h.history.length === histories && h.shown.length === drawings && revisions === revisionsBefore
        && (stage === "answer" ? outcomes === 0 && reads === 0 && requests.current.size === 1 : outcomes === 1 && reads === 1 && requests.current.size === 0);
    };
    const actionEntry = await action("entry"), actionAnswer = await action("answer"), actionTruth = await action("truth"), actionLive = await action("live");
    const direct = make(false), pushes: string[] = [];
    const close = bindHost(source, "close", { mounted: direct.mounted, current: direct.current, pending: direct.pending, activeIdentity, show: direct.show, generation: { current: 0 }, window: direct.window, stripAddress: direct.stripAddress });
    const deposit = bindHost(source, "deposit", { mounted: direct.mounted, current: direct.current, pending: direct.pending, activeIdentity, sheetFrame: () => ({ low: { deposit: { amount: 500 } }, stake: 500, stakeLocked: false }), selected: direct.selected,
      readMarker, writeMarker, attributionFrom, window: direct.window, withBet, save: direct.save, show: direct.show, router: { push: (url: string) => pushes.push(url) } });
    close(); deposit();
    const directClosed = direct.shown.length === 0 && direct.history.length === 0 && direct.writes.length === 0 && pushes.length === 0;
    const auth = async (live: boolean) => {
      const h = make(live), pushed: string[] = [];
      const read = bindHost(source, "readTruth", { mounted: h.mounted, current: h.current, window: h.window, router: { push: (url: string) => pushed.push(url) }, fetch: async () => ({ status: 401 }), parseSheetSeed });
      await read(quote, { open: true }); return pushed.length;
    };
    const authClosed = await auth(false) === 0 && await auth(true) === 1;
    return { lateReceipt, closedReceipt, keyReadEntry, keyReadLate, actionEntry, actionAnswer, actionTruth, actionLive, directClosed, authClosed };
  } catch { return null; }
}
/** Evaluate the shipped frozen-view choice and JSX handlers against closed, replaced and matching serials. */
function exitChecks(source: string) {
  try {
    const file = ts.createSourceFile("host.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let viewExpression: string | undefined, betSheet: ts.JsxSelfClosingElement | undefined, boundary: ts.JsxOpeningElement | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText(file) === "view") viewExpression = node.initializer?.getText(file);
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === "BetSheet") betSheet = node;
      if (ts.isJsxOpeningElement(node) && node.tagName.getText(file) === "SheetBoundary") boundary = node;
      ts.forEachChild(node, visit);
    };
    visit(file);
    if (!viewExpression || !betSheet || !boundary) return null;
    const expression = (node: ts.JsxSelfClosingElement | ts.JsxOpeningElement, name: string) => {
      const attr = node.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText(file) === name);
      return attr && ts.isJsxAttribute(attr) && attr.initializer && ts.isJsxExpression(attr.initializer) ? attr.initializer.expression?.getText(file) : undefined;
    };
    const draw = { active: { serial: 1, dropSide: false }, frame: { frame: "receipt", cta: null } };
    const choose = new Function("active", "frame", "present", "lastView", `return ${viewExpression};`);
    const live = choose(draw.active, draw.frame, true, { current: draw });
    const frozen = choose(null, null, true, { current: draw }), removed = choose(null, null, false, { current: draw });
    const open = new Function("active", `return ${expression(betSheet, "open")};`);
    const frozenDrawing = frozen === draw && removed === null && live.active === draw.active && live.frame === draw.frame && open(null) === false && open(draw.active) === true
      && /useExitPhase\(active !== null\)/.test(source) && expression(boundary, "key") === "view.active.serial";
    const names = ["onPlace", "onBetInstead", "onDeposit", "onClose", "onStakeChange", "onFailed"];
    const handlers = (serial: number | null, phase?: string) => {
      const current = { current: serial === null ? null : { ...draw.active, serial, seed: SEED, side: "YES" } }, calls: string[] = [];
      for (const name of names) {
        const text = expression(name === "onFailed" ? boundary! : betSheet!, name);
        if (!text) throw new Error(`Missing ${name}`);
        const js = ts.transpileModule(`const handler = ${text};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
        const fn = new Function("current", "view", "pending", "activeIdentity", "commit", "deposit", "close", "show", "stripAddress", `${js}\nreturn handler;`)(
          current, draw, { current: new Map([["mkt_sheet01.YES", { intent: { phase } }]]) }, (a: any) => `${a.seed.id}.${a.side}`,
          (which: string) => calls.push(which), (amount: number) => calls.push(`deposit:${amount}`), () => calls.push("close"), () => calls.push("show"), () => calls.push("strip"));
        fn(name === "onStakeChange" ? "1000" : 500);
      }
      return calls;
    };
    const closed = handlers(null), replaced = handlers(2), matching = handlers(1), placing = handlers(1, "placing"), doubt = handlers(1, "inDoubt");
    const inert = closed.length === 0 && replaced.length === 0;
    const usable = JSON.stringify(matching) === '["cta","betInstead","deposit:500","close","show","strip","show"]'
      && placing.filter(x => x === "show").length === 1 && doubt.filter(x => x === "show").length === 1;
    return { frozenDrawing, inert, usable };
  } catch { return null; }
}
function receiptAddressBarrier(source: string, shown: object | null, id = "mkt_one.YES") {
  const begin = source.indexOf("const shown = current.current;", source.indexOf("const openAddress ="));
  const end = source.indexOf("const token =", begin);
  const cleaned: boolean[] = [];
  try {
    if (begin < 0 || end < 0) return null;
    const next = new Function("current", "activeIdentity", "id", "stripAddress", `${source.slice(begin, end)}\nreturn "next";`)(
      { current: shown }, (a: { identity: string }) => a.identity, id, (dropSide: boolean) => cleaned.push(dropSide),
    );
    return { next, cleaned };
  } catch { return null; }
}
function modalOpening(source: string, open: boolean, mounted: boolean) {
  try {
    const file = ts.createSourceFile("modal.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let opening: ts.CallExpression | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText(file) === "React.useLayoutEffect"
        && node.arguments[0]?.getText(file).includes("openLayer(layer);")) opening = node;
      ts.forEachChild(node, visit);
    };
    visit(file);
    const callback = opening?.arguments[0], dependencies = opening?.arguments[1];
    if (!callback || !ts.isArrowFunction(callback) || !ts.isBlock(callback.body) || !dependencies || !ts.isArrayLiteralExpression(dependencies)) return null;
    const guards: string[] = [];
    for (const statement of callback.body.statements) {
      if (!ts.isIfStatement(statement)) break;
      guards.push(statement.getText(file));
    }
    return { ready: new Function("open", "mounted", `${guards.join("\n")}\nreturn true;`)(open, mounted) === true,
      dependencies: dependencies.elements.map(node => node.getText(file)).sort().join(",") };
  } catch { return null; }
}
/** Execute the actual refresh callback with controlled private answers and refs, without importing React or issuing I/O. */
async function privateRefreshChecks(source: string) {
  try {
    const file = ts.createSourceFile("host.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let callback: ts.ArrowFunction | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText(file) === "refreshed" && node.initializer
        && ts.isCallExpression(node.initializer) && ts.isArrowFunction(node.initializer.arguments[0])) callback = node.initializer.arguments[0];
      ts.forEachChild(node, visit);
    };
    visit(file);
    if (!callback) return null;
    const js = ts.transpileModule(`const refreshed = ${callback.getText(file)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const before = () => ({ seed: { ...SEED }, side: "YES", serial: 1, stakeText: "500", settled: { view: { kind: "inDoubt" } },
      title: "Original question", offset: 0, estimateUpdated: false,
      viewer: { state: "read", viewer: { spendable: 5_000, heldSides: [], bonusWager: null, facts: { wallet: { status: "ACTIVE", balance: 5_000 } } } } });
    const failed = { seed: null, viewer: null, reread: { state: "failed" } };
    const fresh = { seed: { ...SEED, yesPool: 25_825 }, title: "Fresh question", viewer: { spendable: 6_000, heldSides: [], bonusWager: null, facts: { wallet: { status: "ACTIVE", balance: 6_000 } } }, reread: { state: "read" } };
    const create = (readTruth: () => Promise<unknown>) => {
      const current: { current: any } = { current: before() }, shown: any[] = [], mounted = { current: true };
      const refresh = new Function("current", "readSequences", "readTruth", "show", "activeIdentity", "clockOffset", "estimateMoved", "sheetEstimate", "mounted", `${js}\nreturn refreshed;`)(
        current, { current: new Map() }, readTruth, (value: any) => { shown.push(value); current.current = value; },
        (a: any) => `${a.seed.id}.${a.side}`, clockOffset, estimateMoved, sheetEstimate, mounted,
      ) as () => Promise<void>;
      return { current, shown, refresh, mounted };
    };
    const fault = create(async () => failed), prior = fault.current.current;
    await fault.refresh();
    const faultClosed = fault.shown.length === 1 && fault.current.current.viewer.state === "failed"
      && fault.current.current.seed === prior.seed && fault.current.current.settled === prior.settled
      && fault.current.current.serial === prior.serial && fault.current.current.stakeText === prior.stakeText;

    let resolveSerial!: (value: unknown) => void;
    const serial = create(() => new Promise(resolve => { resolveSerial = resolve; }));
    const oldSerial = serial.refresh();
    const replacement = { ...before(), serial: 2, seed: { ...SEED, id: "mkt_other" }, stakeText: "1000" };
    serial.current.current = replacement; resolveSerial(fresh); await oldSerial;
    const serialProtected = serial.shown.length === 0 && serial.current.current === replacement;

    let resolveFirst!: (value: unknown) => void, reads = 0;
    const sequence = create(() => ++reads === 1 ? new Promise(resolve => { resolveFirst = resolve; }) : Promise.resolve(failed));
    const slow = sequence.refresh(); await sequence.refresh();
    const last = sequence.current.current; resolveFirst(fresh); await slow;
    const sequenceProtected = sequence.shown.length === 1 && sequence.current.current === last && last.viewer.state === "failed";

    const restore = create(async () => fresh);
    restore.current.current = { ...before(), viewer: { state: "failed" } };
    await restore.refresh();
    const restored = restore.shown.length === 1 && restore.current.current.viewer.state === "read"
      && restore.current.current.viewer.viewer === fresh.viewer && restore.current.current.seed === fresh.seed
      && restore.current.current.title === fresh.title;
    let resolveUnmount!: (value: unknown) => void;
    const unmount = create(() => new Promise(resolve => { resolveUnmount = resolve; }));
    const late = unmount.refresh(), retained = unmount.current.current;
    unmount.mounted.current = false; resolveUnmount(fresh); await late;
    const unmounted = unmount.shown.length === 0 && unmount.current.current === retained;
    return { faultClosed, serialProtected, sequenceProtected, restored, unmounted };
  } catch { return null; }
}
async function checks(x: Impl): Promise<Check[]> {
  const result: Check[] = [];
  const ok = (name: string, pass: boolean) => result.push({ name, pass });
  ok("seed.valid", x.parse(JSON.stringify(SEED))?.id === SEED.id && x.parse({ ...SEED, rates: null, closesAt: null }) !== null);
  const bad = [null, "{", " ".repeat(4_001), { ...SEED, v: 2 }, { ...SEED, id: "round_123" }, { ...SEED, min: 0 }, { ...SEED, min: 500.1 }, { ...SEED, max: 499 }, { ...SEED, max: Number.MAX_SAFE_INTEGER + 1 }, { ...SEED, yesPool: NaN }, { ...SEED, noPool: -1 }, { ...SEED, serverNow: Infinity }, { ...SEED, bettable: "true" }, { ...SEED, closesAt: "never" }, { ...SEED, feePct: -1 }, { ...SEED, rates: { feeModel: "invented" } }, { ...SEED, rates: { feeModel: "loser-share", platformFeeRate: 1.1 } }, { ...SEED, rates: { feeModel: "loser-share", showEstimatedWinnings: "yes" } }];
  ok("seed.bad", bad.every((s) => x.parse(s) === null));

  const all = Array.from({ length: 20 }, (_, i) => stored(i + 1));
  const selected = { bet: "mkt_selected.YES.5000", at: NOW, ref: "friend", invite: "code", utm: { utm_source: "qa" } };
  const raw = x.pack(selected, all);
  const got = x.restore(raw, NOW);
  ok("storage.all-keys", got.length === 20 && all.every((s) => got.some((g) => g.key === s.key && JSON.stringify(g.quote) === JSON.stringify(s.quote))));
  ok("storage.selected", raw !== null && readMarker(raw, NOW)?.ref === "friend" && stakeFromUrl({ kind: "market", id: "mkt_selected", side: "YES", stake: 5000 }, raw, NOW) === 5000 && stakeFromUrl({ kind: "market", id: "mkt_selected", side: "YES", stake: 6000 }, raw, NOW) === null);
  const retired = x.restore(x.pack(selected, all.filter((s) => s.key !== key(4))), NOW);
  ok("storage.retire-one", retired.length === 19 && !retired.some((s) => s.key === key(4)) && retired.some((s) => s.key === key(20)));
  ok("storage.empty", x.pack(null, []) === null && x.restore(null, NOW).length === 0);
  const candidate = (overrides = {}) => ({ bet: "mkt_sheet1.YES.501", at: NOW - 1000, k: key(1), ...overrides });
  const corrupt = JSON.stringify({ ...candidate(), pending: [candidate(), candidate({ k: key(2), at: NOW - 24 * 3600_000 }), candidate({ k: key(3), at: NOW + 61_000 }), candidate({ k: "invalid" }), candidate({ k: key(5), bet: "round_123.YES.500" }), candidate({ k: key(6), bet: "mkt_sheet1.NO" }), null, {}] });
  const valid = x.restore(corrupt, NOW);
  ok("storage.validate", valid.length === 1 && valid[0].key === key(1) && x.restore("{", NOW).length === 0 && x.restore("x".repeat(PENDING_STORAGE_MAX_BYTES + 1), NOW).length === 0);
  const huge = Array.from({ length: 700 }, (_, i) => stored(i + 1));
  const full = x.pack(null, huge);
  ok("storage.no-truncation", full !== null && full.length > PENDING_STORAGE_MAX_BYTES && (JSON.parse(full).pending as unknown[]).length === huge.length);

  const h = x.host;
  const commit = h.slice(h.indexOf("const commit ="), h.indexOf("const deposit ="));
  const readKey = h.slice(h.indexOf("const readKey ="), h.indexOf("const open ="));
  const save = h.slice(h.indexOf("const save ="), h.indexOf("const stripAddress ="));
  ok("host.durable-before-send", /if \(!save\(\)\)/.test(commit) && commit.indexOf("if (!save())") < commit.indexOf("buyPositionAction(fd)") && /if \(!save\(\)\)\s*\{[\s\S]*?selected\.current = oldSelected;[\s\S]*?return;/.test(commit) && /value\.length > PENDING_STORAGE_MAX_BYTES\) return false/.test(save));
  ok("host.double-tap", /requests\.current\.has\(old\.intent\.key\)/.test(commit) && commit.indexOf("requests.current.add(chosen.key)") < commit.indexOf("startTransition") && /if \(!quote\) return/.test(commit));
  ok("host.key-read-send-time", readKey.indexOf("const readAtMs = Date.now()") >= 0 && readKey.indexOf("const readAtMs = Date.now()") < readKey.indexOf("await readTruth") && /afterKeyRead\(record\.intent, null, readAtMs\)/.test(readKey));
  ok("host.key-shape", /Object\.prototype\.hasOwnProperty\.call\(body\.me, "keyPosition"\)/.test(h) && /options\.key && body\.me\.keyPosition !== null/.test(h) && /truth\.reread\.state !== "read"\) return/.test(readKey));
  ok("host.close-and-stake-lock", /record\?\.intent\.phase === "placing"\) return/.test(h) && /intent\?\.phase !== "placing" && intent\?\.phase !== "inDoubt"/.test(h));
  ok("host.closed-receipt", /closedReceipts\.current\.set\(id, settled\)/.test(h) && /const received = closedReceipts\.current\.get\(id\)/.test(h) && /closedReceipts\.current\.delete\(id\)/.test(h) && /if \(received\) stripAddress\(dropSide\)/.test(h) && /settled: received/.test(h));
  const shown = (kind: string | null, dropSide = false, identity = "mkt_one.YES") => ({ identity, dropSide, settled: kind ? { view: { kind } } : null });
  const restoredReceipt = receiptAddressBarrier(h, shown("receipt"));
  const restoredLegacy = receiptAddressBarrier(h, shown("receipt", true));
  const unrelated = receiptAddressBarrier(h, shown("receipt", false, "mkt_other.YES"));
  const edit = receiptAddressBarrier(h, shown(null)), doubt = receiptAddressBarrier(h, shown("inDoubt"));
  ok("host.receipt-address-after-router", restoredReceipt !== null && restoredLegacy !== null && unrelated !== null && edit !== null && doubt !== null
    && restoredReceipt.next === undefined && JSON.stringify(restoredReceipt.cleaned) === "[false]"
    && restoredLegacy.next === undefined && JSON.stringify(restoredLegacy.cleaned) === "[true]"
    && unrelated.next === "next" && unrelated.cleaned.length === 0
    && edit.next === undefined && edit.cleaned.length === 0 && doubt.next === undefined && doubt.cleaned.length === 0
    && receiptAddressBarrier(h, null)?.next === "next");
  ok("host.boundary", /class SheetBoundary extends Component/.test(h) && /<SheetBoundary[\s\S]*?<BetSheet[\s\S]*?<\/SheetBoundary>/.test(h) && /componentDidCatch/.test(h) && /\/api\/client-error/.test(h) && !/\bthrow\s+/.test(h));
  ok("host.capture-safe", /event\.defaultPrevented \|\| event\.button !== 0 \|\| event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey/.test(h) && /!seed\.bettable/.test(h) && /href\.origin !== window\.location\.origin/.test(h) && /addEventListener\("click", click, true\)/.test(h));
  ok("host.conditional-mount", /journeyShown && session && <Suspense fallback=\{null\}><LazyBetSheetHost\s*\/><\/Suspense>/.test(x.shell) && /export const LazyBetSheetHost = dynamic\(\(\) => import\("@\/components\/journey\/bet-sheet\/bet-sheet-host"\)\.then\(\(m\) => m\.BetSheetHost\)\.catch\(nothingIfLost\)\)/.test(x.lazy));
  const refresh = await privateRefreshChecks(h);
  ok("host.private-read-fault", refresh?.faultClosed === true);
  ok("host.private-read-race", refresh?.serialProtected === true && refresh?.sequenceProtected === true);
  ok("host.private-read-restore", refresh?.restored === true);
  ok("host.private-read-unmounted", refresh?.unmounted === true);
  ok("host.layout-lifecycle", layoutLifecycle(h));
  const life = await lifecycleChecks(h);
  ok("host.unmounted-receipt-storage-address", life?.lateReceipt === true);
  ok("host.closed-mounted-receipt", life?.closedReceipt === true);
  ok("host.unmounted-key-read", life?.keyReadEntry === true && life?.keyReadLate === true);
  ok("host.unmounted-commit-entry", life?.actionEntry === true);
  ok("host.unmounted-action-answer", life?.actionAnswer === true);
  ok("host.unmounted-private-answer", life?.actionTruth === true);
  ok("host.mounted-commit-control", life?.actionLive === true);
  ok("host.unmounted-close-deposit", life?.directClosed === true);
  ok("host.unmounted-auth-redirect", life?.authClosed === true);
  const exit = exitChecks(h);
  ok("host.exit-frozen-drawing", exit?.frozenDrawing === true);
  ok("host.exit-inert-serial", exit?.inert === true && exit?.usable === true);
  ok("modal.portal-ready-opening", modalOpening(x.modal, true, true)?.ready === true
    && modalOpening(x.modal, true, false)?.ready === false && modalOpening(x.modal, false, true)?.ready === false
    && modalOpening(x.modal, false, false)?.ready === false && modalOpening(x.modal, true, true)?.dependencies === "mounted,open");
  const allows = (args = GOOD_ARGS, env: Record<string, string | undefined> = GOOD_ENV, entry = GOOD_ENTRY) => bootstrapAllows(x.bootstrap, entry, args, env);
  const forbidden = [
    ["dev", "--hostname", "127.0.0.1", "--port", "3044"],
    ["start", "--hostname", "0.0.0.0", "--port", "3044"],
    ["start", "--hostname", "0.0.0.0", "--port", "3044", "127.0.0.1"],
    ["start", "--hostname", "localhost", "--port", "3044"],
    ["start", "--hostname", "127.0.0.1", "--port", "3043"],
    ["start", "--hostname", "127.0.0.1", "--port", "3044", "--hostname", "0.0.0.0"],
    ["start", "--hostname", "0.0.0.0", "--port", "3044", "--hostname", "127.0.0.1"],
    ["start", "--hostname", "127.0.0.1", "--port", "3044", "--port", "3044"],
    ["start", "--hostname", "127.0.0.1", "--port"],
    ["--hostname", "127.0.0.1", "--port", "3044", "start"],
  ];
  ok("bootstrap.local-only", x.bootstrap.indexOf("throw new Error") < x.bootstrap.indexOf("await import")
    && allows() && allows(["start", "--port", "3044", "--hostname", "127.0.0.1"], GOOD_ENV, "F:\\local\\node_modules\\next\\dist\\bin\\next")
    && forbidden.every(args => !allows(args)) && !allows(GOOD_ARGS, GOOD_ENV, "C:/local/server.js")
    && !allows(GOOD_ARGS, { ...GOOD_ENV, KP_QA_MEMORY_BOOTSTRAP: undefined })
    && !allows(GOOD_ARGS, { ...GOOD_ENV, NODE_ENV: "development" })
    && !allows(GOOD_ARGS, { ...GOOD_ENV, DATABASE_URL: "postgresql://local-test-only" }));
  return result;
}

const results = await checks(REAL);
for (const c of results) console.log(`${c.pass ? "PASS" : "FAIL"} ${c.name}`);
let failures = results.filter((c) => !c.pass).length;
if (process.argv.includes("--prove-red")) {
  const mutants: { name: string; check: string; impl: Impl }[] = [
    { name: "invalid seed accepted", check: "seed.bad", impl: { ...REAL, parse: (v) => parseSheetSeed(v) ?? parseSheetSeed(SEED) } },
    { name: "seventeenth doubt lost", check: "storage.all-keys", impl: { ...REAL, pack: (s, items) => pendingStorage(s, items.slice(0, 16)) } },
    { name: "expired or malformed key retained", check: "storage.validate", impl: { ...REAL, restore: (raw, now) => raw === corruptFixture() ? [stored(1), stored(2)] : pendingIntents(raw, now) } },
    { name: "selection authorizes changed URL stake", check: "storage.selected", impl: { ...REAL, pack: (s, items) => pendingStorage(s && { ...s, bet: "mkt_selected.YES.6000" }, items) } },
    { name: "resolved key retained", check: "storage.retire-one", impl: { ...REAL, pack: (s, items) => pendingStorage(s, [...items, stored(4)]) } },
    ...[
      ["host.durable-before-send", "if (!save())", "if (false)"],
      ["host.durable-before-send", "value.length > PENDING_STORAGE_MAX_BYTES) return false", "false) return false"],
      ["host.double-tap", "requests.current.has(old.intent.key)", "false"],
      ["host.key-read-send-time", "afterKeyRead(record.intent, null, readAtMs)", "afterKeyRead(record.intent, null, Date.now())"],
      ["host.key-shape", 'Object.prototype.hasOwnProperty.call(body.me, "keyPosition")', "true"],
      ["host.close-and-stake-lock", 'record?.intent.phase === "placing") return', 'false) return'],
      ["host.closed-receipt", "closedReceipts.current.set(id, settled)", "void settled"],
      ["host.receipt-address-after-router", 'if (shown.settled?.view.kind === "receipt") stripAddress(shown.dropSide);', "void shown;"],
      ["host.receipt-address-after-router", 'if (shown.settled?.view.kind === "receipt")', "if (true)"],
      ["host.receipt-address-after-router", "shown && activeIdentity(shown) === id", "shown"],
      ["host.boundary", "<SheetBoundary key={view.active.serial}", "<div key={view.active.serial}"],
      ["host.capture-safe", 'addEventListener("click", click, true)', 'addEventListener("click", click, false)'],
      ["host.private-read-fault", 'else show({ ...after, viewer: { state: "failed" } });', 'else if (after.viewer.state !== "read") show({ ...after, viewer: { state: "failed" } });'],
      ["host.private-read-race", "after.serial !== before.serial ||", ""],
      ["host.private-read-race", "readSequences.current.get(id) !== seq", "false"],
      ["host.private-read-restore", 'viewer: { state: "read", viewer: truth.viewer }', 'viewer: { state: "failed" }'],
      ["host.private-read-unmounted", "!mounted.current || !after", "!after"],
      ["host.layout-lifecycle", "useLayoutEffect(() => {", "useEffect(() => {"],
      ["host.exit-frozen-drawing", "active && frame ? { active, frame } : present ? lastView.current : null", "active && frame ? { active, frame } : null"],
      ["host.exit-frozen-drawing", "<BetSheet open={active !== null}", "<BetSheet open={view !== null}"],
      ["host.exit-frozen-drawing", "key={view.active.serial}", "key={active?.serial}"],
      ["host.exit-inert-serial", 'if (current.current?.serial === view.active.serial) commit("cta");', 'commit("cta");'],
      ["host.exit-inert-serial", 'if (current.current?.serial === view.active.serial) commit("betInstead");', 'commit("betInstead");'],
      ["host.exit-inert-serial", 'if (current.current?.serial === view.active.serial) deposit(amount);', 'deposit(amount);'],
      ["host.exit-inert-serial", 'if (current.current?.serial === view.active.serial) close();', 'close();'],
      ["host.exit-inert-serial", "a && a.serial === view.active.serial && intent", "a && intent"],
      ["host.exit-inert-serial", "if (current.current?.serial === view.active.serial) { stripAddress", "if (true) { stripAddress"],
    ].map(([check, from, to]) => ({ name: `${check}: ${from}`, check, impl: { ...REAL, host: REAL.host.replace(from, to) } })),
    ...[
      ["host.unmounted-receipt-storage-address", "receipt", "if (!mounted.current) return;", ""],
      ["host.unmounted-receipt-storage-address", "save", "if (!mounted.current) return false;", ""],
      ["host.unmounted-receipt-storage-address", "stripAddress", "if (!mounted.current) return;", ""],
      ["host.unmounted-key-read", "readKey", "if (!mounted.current) return;", ""],
      ["host.unmounted-key-read", "readKey", "!mounted.current || pending.current", "pending.current"],
      ["host.unmounted-commit-entry", "commit", "if (!mounted.current) return;\n    const a", "const a"],
      ["host.unmounted-action-answer", "commit", "if (!mounted.current) return;\n      requests.current.delete", "requests.current.delete"],
      ["host.unmounted-private-answer", "commit", "if (!mounted.current) return;\n      const build", "const build"],
      ["host.unmounted-close-deposit", "close", "if (!mounted.current) return;", ""],
      ["host.unmounted-close-deposit", "deposit", "if (!mounted.current) return;", ""],
      ["host.unmounted-auth-redirect", "readTruth", "mounted.current && options.open", "options.open"],
    ].map(([check, callback, from, to]) => ({ name: `${check}: ${callback}`, check, impl: { ...REAL, host: plantCallback(REAL.host, callback, from, to) } })),
    { name: "guest receives money host", check: "host.conditional-mount", impl: { ...REAL, shell: REAL.shell.replace("journeyShown && session && <Suspense fallback={null}><LazyBetSheetHost", "journeyShown && <Suspense fallback={null}><LazyBetSheetHost") } },
    { name: "opening focus fires before its portal commit", check: "modal.portal-ready-opening", impl: { ...REAL, modal: REAL.modal.replace("if (!mounted) return;", "") } },
    { name: "portal commit never re-arms initial focus", check: "modal.portal-ready-opening", impl: { ...REAL, modal: REAL.modal.replace("}, [open, mounted]);", "}, [open]);") } },
    { name: "callback changes steal focus on every render", check: "modal.portal-ready-opening", impl: { ...REAL, modal: REAL.modal.replace("}, [open, mounted]);", "}, [open, mounted, onClose]);") } },
    { name: "render fixture may connect to a configured database", check: "bootstrap.local-only", impl: { ...REAL, bootstrap: REAL.bootstrap.replace("process.env.DATABASE_URL", "false") } },
    { name: "render fixture may listen externally", check: "bootstrap.local-only", impl: { ...REAL, bootstrap: REAL.bootstrap.replace('options.get("--hostname") === "127.0.0.1"', "true") } },
    { name: "a stray loopback string substitutes for the actual hostname", check: "bootstrap.local-only", impl: { ...REAL, bootstrap: REAL.bootstrap.replace(/function localProductionStart[\s\S]*?\n\}/, 'function localProductionStart(entry: string, argv: readonly string[]): boolean { return argv.includes("start") && argv.includes("127.0.0.1"); }') } },
    { name: "dev may claim the production fixture", check: "bootstrap.local-only", impl: { ...REAL, bootstrap: REAL.bootstrap.replace('argv[0] !== "start"', "false") } },
    { name: "wrong port receives the production fixture", check: "bootstrap.local-only", impl: { ...REAL, bootstrap: REAL.bootstrap.replace('options.get("--port") === "3044"', "true") } },
    { name: "another entry may claim to be Next start", check: "bootstrap.local-only", impl: { ...REAL, bootstrap: REAL.bootstrap.replace('!/\\/node_modules\\/next\\/dist\\/bin\\/next(?:\\.js)?$/.test(cli)', "false") } },
  ];
  for (const m of mutants) {
    const caught = (await checks(m.impl)).some((c) => c.name === m.check && !c.pass);
    console.log(`${caught ? "PASS" : "FAIL"} PLANT ${m.name}`);
    if (!caught) failures++;
  }
  console.log(`${mutants.length} in-process controls executed`);
}
console.log(`${results.length} controls; ${failures} failures`);
process.exitCode = failures ? 1 : 0;

function corruptFixture(): string {
  const c = (overrides = {}) => ({ bet: "mkt_sheet1.YES.501", at: NOW - 1000, k: key(1), ...overrides });
  return JSON.stringify({ ...c(), pending: [c(), c({ k: key(2), at: NOW - 24 * 3600_000 }), c({ k: key(3), at: NOW + 61_000 }), c({ k: "invalid" }), c({ k: key(5), bet: "round_123.YES.500" }), c({ k: key(6), bet: "mkt_sheet1.NO" }), null, {}] });
}
