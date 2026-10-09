/**
 * test:offline-neutral — THE OFFLINE PAGE HOLDS NO PERSON, SPEAKS THE LANGUAGE OF NOW, RECOVERS, AND THE OFFLINE
 * NOTICE COVERS NOTHING (R4-G, the Vodacom visual pass, 2026-10-09 — edge scenario 9, tiles 453–485).
 *
 *   npm run test:offline-neutral
 *   npm run red:offline-neutral    (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * What the edge drive found, and what each section holds:
 *   §1 THE PRECACHE SENDS NO COOKIE. `cache.add("/offline")` sent the session cookie, so the copy the worker kept was
 *      the shell rendered for whoever was signed in. The install handler is RUN here, against a recording cache.
 *   §2 EVERY CACHE THAT MAY HOLD A PERSON'S PAGE GOES. The name moved past every name that cached a page (v1–v4), the
 *      activate handler (run here) leaves only the current cache, and the offline answer is read from that one alone.
 *   §3 THE OFFLINE ROUTE READS NOTHING FROM THE REQUEST. A route handler (no root layout, so no shell), reading no
 *      cookie, no header and no session; its only import besides the document is the public licence number.
 *   §4 THE LANGUAGE OF NOW. The document's own head script is RUN for every cookie a phone can hold: `<html lang>` and
 *      the title follow `kp-locale` at show time, and every phrase is the dictionary's own, one span per language.
 *   §5 THE LOOK'S SOURCES. Every token, the primary button's paint, the backdrop and the two glyphs equal the files
 *      they were copied from (the document cannot load the app's stylesheet offline, so it carries its own copy).
 *   §6 NO PERSON, NOTHING TO HYDRATE. The built document carries no piece of the shell and no script but its own two.
 *   §7 IT RECOVERS. The retry and the browser's `online` event reload the address asked for (home, on `/offline`).
 *   §8 THE OFFLINE NOTICE COVERS NOTHING. The banner that lay on the header of both shells is a NoticeBar in AppShell's
 *      flow, between the header and the page, positioned nowhere and announced as an alert.
 *   §9 THE LAST RESORT SPEAKS ALL THREE LANGUAGES. The worker's own fallback (when even the document was never
 *      cached) was English and Swahili only; its words are held to the dictionary and its scripts are RUN as in §4/§7.
 *   §10 PUSH AND THE STATIC-ASSET STRATEGY ARE UNTOUCHED, by running their handlers.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: it reads files, builds the document in memory and runs scripts in a `vm` sandbox; it
 * opens nothing for writing (so `test:red-anchors` §4 counts its red twin as in-process).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { dict, DEFAULT_LOCALE, type Dict } from "../src/lib/i18n-dict.ts";
import { MARK } from "../src/lib/brand-mark.ts";
import * as OD from "../src/lib/offline-document.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PROVE_RED = process.argv.includes("--prove-red");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

const F = {
  sw: "public/sw.js",
  route: "src/app/offline/route.ts",
  page: "src/app/offline/page.tsx",
  doc: "src/lib/offline-document.ts",
  banner: "src/components/ui/offline-banner.tsx",
  noticeBar: "src/components/ui/notice-bar.tsx",
  shell: "src/components/layout/app-shell.tsx",
  globals: "src/app/globals.css",
  topo: "src/components/brand-topo.tsx",
  glyphs: "src/components/ui/glyphs.tsx",
  layout: "src/app/layout.tsx",
  i18n: "src/lib/i18n.tsx",
} as const;

type World = {
  sw: string; route: string; docModule: string; pageExists: boolean; doc: string;
  banner: string; noticeBar: string; shell: string; globals: string; topo: string; glyphs: string; layout: string; i18n: string;
  tokens: Record<string, string>; primary: Record<string, string>;
  topoData: { opacity: number; width: number; height: number; stroke: string; strokeWidth: string; paths: readonly string[] };
  glyphData: Record<string, string>;
};

const LICENCE = "GBT-TEST-0001";
const REAL: World = {
  sw: read(F.sw), route: read(F.route), docModule: read(F.doc), pageExists: existsSync(join(ROOT, F.page)),
  doc: OD.offlineDocument({ licenceNumber: LICENCE }),
  banner: read(F.banner), noticeBar: read(F.noticeBar), shell: read(F.shell), globals: read(F.globals), topo: read(F.topo),
  glyphs: read(F.glyphs), layout: read(F.layout), i18n: read(F.i18n),
  tokens: { ...OD.OFFLINE_TOKENS }, primary: { ...OD.OFFLINE_PRIMARY },
  topoData: { ...OD.OFFLINE_TOPO, paths: [...OD.OFFLINE_TOPO.paths] }, glyphData: { ...OD.OFFLINE_GLYPHS },
};

const LOCALES = Object.keys(dict) as Array<keyof typeof dict>;
const T = (l: keyof typeof dict) => dict[l] as Dict;
const j = (v: unknown) => JSON.stringify(v);
const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const htmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** Every name a cache that held the old "/offline" page could have had: the worker's names up to v4. */
const TAINTED = new Set(["50pick-v1", "50pick-v2", "50pick-v3", "50pick-v4"]);
const ORIGIN = "https://50pick.tz";

/* ── the service worker, run in a sandbox ──────────────────────────────────────────────────────────────────────── */

class FakeRequest {
  url: string; credentials: string; cache: string; mode: string; method = "GET";
  constructor(url: string, init: { credentials?: string; cache?: string; mode?: string } = {}) {
    this.url = String(url); this.credentials = init.credentials ?? "same-origin"; this.cache = init.cache ?? "default"; this.mode = init.mode ?? "cors";
  }
}
class FakeResponse {
  body: string; status: number; ok: boolean; headers: Record<string, string>;
  constructor(body: string, init: { status?: number; headers?: Record<string, string> } = {}) {
    this.body = body; this.status = init.status ?? 200; this.ok = this.status >= 200 && this.status < 300; this.headers = init.headers ?? {};
  }
  clone() { return this; }
}
const keyOf = (r: unknown) => (typeof r === "string" ? r : (r as { url: string }).url).replace(ORIGIN, "");

function loadSw(src: string, seed: Record<string, Record<string, string>> = {}) {
  const handlers: Record<string, (e: unknown) => unknown> = {};
  const store = new Map<string, Map<string, FakeResponse>>();
  for (const [name, entries] of Object.entries(seed)) store.set(name, new Map(Object.entries(entries).map(([u, b]) => [u, new FakeResponse(b)])));
  const added: Array<{ cache: string; req: unknown }> = [];
  const shown: Array<{ title: string; options: Record<string, unknown> }> = [];
  const fetched: string[] = [];
  const caches = {
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      const m = store.get(name)!;
      return {
        add: async (r: unknown) => { added.push({ cache: name, req: r }); m.set(keyOf(r), new FakeResponse(`<precached ${keyOf(r)}>`)); },
        match: async (r: unknown) => m.get(keyOf(r)),
        put: async (r: unknown, res: FakeResponse) => { m.set(keyOf(r), res); },
      };
    },
    keys: async () => [...store.keys()],
    delete: async (n: string) => store.delete(n),
    match: async (r: unknown) => { for (const m of store.values()) { const hit = m.get(keyOf(r)); if (hit) return hit; } return undefined; },
  };
  const self = {
    addEventListener: (t: string, fn: (e: unknown) => unknown) => { handlers[t] = fn; },
    skipWaiting: () => undefined,
    clients: { claim: () => undefined, matchAll: async () => [], openWindow: async () => undefined },
    location: { origin: ORIGIN },
    registration: { showNotification: async (title: string, options: Record<string, unknown>) => { shown.push({ title, options }); } },
  };
  const ctx = vm.createContext({
    self, caches, Request: FakeRequest, Response: FakeResponse, URL, Promise, Object, JSON, console,
    fetch: async (r: unknown) => { fetched.push(keyOf(r)); throw new TypeError("Failed to fetch (offline)"); },
  });
  vm.runInContext(src, ctx, { filename: "sw.js" });
  const event = (extra: Record<string, unknown>) => {
    const waits: Promise<unknown>[] = [];
    let answer: Promise<unknown> | undefined;
    // A rejected answer (an uncached asset with the network down) is "no answer", never a throw out of the check.
    const e = { ...extra, waitUntil: (p: Promise<unknown>) => { waits.push(Promise.resolve(p).catch(() => undefined)); }, respondWith: (p: Promise<unknown>) => { answer = Promise.resolve(p).catch(() => undefined); } };
    return { e, settle: async () => { await Promise.all(waits); return answer ? await answer : undefined; } };
  };
  const fire = async (type: string, extra: Record<string, unknown> = {}) => {
    const h = handlers[type];
    if (!h) return { missing: true, answer: undefined as unknown };
    const ev = event(extra);
    h(ev.e);
    return { missing: false, answer: await ev.settle() };
  };
  const get = (expr: string) => { try { return vm.runInContext(expr, ctx); } catch { return undefined; } };
  return { handlers, store, added, shown, fetched, fire, get };
}

/* ── a document's own scripts, run in a sandbox ────────────────────────────────────────────────────────────────── */

type DocEnv = { cookie?: string; stored?: string | null; storageThrows?: boolean; pathname?: string };
function runDoc(html: string, env: DocEnv) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const win: Record<string, Array<() => void>> = {};
  const button = { on: {} as Record<string, Array<() => void>>, addEventListener(t: string, f: () => void) { (this.on[t] ??= []).push(f); } };
  const calls: string[] = [];
  const document = {
    cookie: env.cookie ?? "", documentElement: { lang: "<server>" }, title: "<server>",
    getElementById: (id: string) => (id === OD.OFFLINE_RETRY_ID ? button : null),
  };
  const localStorage = { getItem: (k: string) => { if (env.storageThrows) throw new Error("storage blocked"); return k === OD.OFFLINE_LOCALE_COOKIE ? env.stored ?? null : null; } };
  const location = { pathname: env.pathname ?? "/positions", reload: () => calls.push("reload"), replace: (u: string) => calls.push(`replace:${u}`) };
  const addEventListener = (t: string, f: () => void) => { (win[t] ??= []).push(f); };
  const ctx = vm.createContext({ document, localStorage, location, window: { addEventListener }, addEventListener, RegExp, decodeURIComponent, JSON });
  let error: string | null = null;
  for (const s of scripts) { try { vm.runInContext(s, ctx); } catch (e) { error = String(e); } }
  return { scripts: scripts.length, lang: document.documentElement.lang, title: document.title, button, win, calls, error };
}

/* ── the checks ────────────────────────────────────────────────────────────────────────────────────────────────── */

async function run(W: World, log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  log("§1 · the precache sends no cookie");
  {
    const sw = loadSw(W.sw);
    const inst = await sw.fire("install");
    const reqs = sw.added.map((a) => a.req as { url?: string; credentials?: string; cache?: string } | string);
    const offline = reqs.find((r) => (typeof r === "string" ? r : r.url) === "/offline");
    const omitted = reqs.length > 0 && reqs.every((r) => typeof r !== "string" && r.credentials === "omit");
    ok("1.install · the install handler precaches the offline document", !inst.missing && offline !== undefined, j(reqs));
    ok("1.omit · every precache request is sent with `credentials: \"omit\"` — no session, no language, no preview pass rides along",
      omitted, j(reqs.map((r) => (typeof r === "string" ? `${r} (a bare URL: same-origin credentials)` : `${r.url} ${r.credentials}`))));
    ok("1.reload · …and with `cache: \"reload\"`, so no HTTP-cache copy answers in the network's place",
      reqs.length > 0 && reqs.every((r) => typeof r !== "string" && r.cache === "reload"), j(reqs));
  }

  log("§2 · every cache that may hold a person's page is deleted, and none is read");
  {
    const name = loadSw(W.sw).get("CACHE_NAME") as string | undefined;
    ok("2.name · the cache name is past every name that cached a page (50pick-v1…v4)", typeof name === "string" && !TAINTED.has(name) && /^50pick-v\d+$/.test(name), String(name));
    const sw = loadSw(W.sw, { "50pick-v4": { "/offline": "<PERSON: Salio TZS 100,000>" }, "50pick-v3": { "/offline": "<PERSON>" }, "someone-else": {} });
    await sw.fire("install");
    await sw.fire("activate");
    const left = [...sw.store.keys()];
    ok("2.activate · after install and activate, the worker's own cache is the only one left", left.length === 1 && left[0] === name, j(left));
    const fresh = loadSw(W.sw, { "50pick-v4": { "/offline": "<PERSON: Salio TZS 100,000>" } });
    const nav = await fresh.fire("fetch", { request: new FakeRequest(`${ORIGIN}/positions`, { mode: "navigate" }) });
    const body = (nav.answer as FakeResponse | undefined)?.body ?? "";
    ok("2.lookup · a failed navigation is never answered from an older cache, even before `activate` has run",
      !nav.missing && !body.includes("PERSON") && body.length > 0, body.slice(0, 80));
    const installed = loadSw(W.sw);
    await installed.fire("install");
    const nav2 = await installed.fire("fetch", { request: new FakeRequest(`${ORIGIN}/positions`, { mode: "navigate" }) });
    ok("2.served · once installed, a failed navigation is answered with the precached offline document",
      (nav2.answer as FakeResponse | undefined)?.body === "<precached /offline>", (nav2.answer as FakeResponse | undefined)?.body ?? "nothing");
  }

  log("§3 · the offline route reads nothing from the request");
  {
    const route = decomment(W.route);
    const mod = decomment(W.docModule);
    const importsOf = (s: string) => [...s.matchAll(/^\s*import\s[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
    const READS = /\bcookies\s*\(|\bheaders\s*\(|\bgetSession\b|\bcurrentSession\b|\breadVerifiedSession\b|\bSESSION_COOKIE\b|\bresolveSimpleJourney\b|\breq(?:uest)?\.(?:cookies|headers)\b/;
    ok("3.page · /offline is not a page: no `page.tsx`, so the root layout (and AppShell) never wraps it", !W.pageExists, F.page);
    ok("3.handler · the route answers GET with a Response built by `offlineDocument`, taking no request at all",
      /export\s+(?:async\s+)?function\s+GET\s*\(\s*\)/.test(route) && /offlineDocument\(/.test(route), squash(route.slice(0, 400)));
    ok("3.imports · the route imports only the document and the public licence number; the document only the dictionary and the mark",
      j(importsOf(route).sort()) === j(["@/lib/offline-document", "@/lib/server/support-config"]) && j(importsOf(mod).sort()) === j(["@/lib/brand-mark", "@/lib/i18n-dict"]),
      j({ route: importsOf(route), doc: importsOf(mod) }));
    ok("3.reads · neither file reads a cookie, a header or a session", !READS.test(route) && !READS.test(mod),
      (route.match(READS) ?? mod.match(READS) ?? [""])[0]);
    ok("3.reads.c · CONTROL — the same matcher sees `await cookies()` and `getSession()`",
      READS.test("const jar = await cookies();") && READS.test("const s = await getSession();") && !READS.test("getSupportConfig().licenceNumber"));
    ok("3.licence · the licence number is the document's one input, and it reaches the page", W.doc.includes(`: ${LICENCE}</p>`));
  }

  log("§4 · the language the player has now");
  {
    const server = new RegExp(`^<!doctype html><html lang="${DEFAULT_LOCALE}"`).test(W.doc);
    ok(`4.server · the bytes say the platform default (${DEFAULT_LOCALE}) until the page is shown`, server, W.doc.slice(0, 80));
    const cases: Array<[string, DocEnv, string]> = [
      ["en cookie", { cookie: "kp-locale=en" }, "en"],
      ["zh cookie", { cookie: "kp-locale=zh" }, "zh"],
      ["sw cookie", { cookie: "kp-locale=sw" }, "sw"],
      ["cookie among others", { cookie: "a=1; kp-locale=zh; b=2" }, "zh"],
      ["no cookie, nothing saved", {}, DEFAULT_LOCALE],
      ["an unknown language", { cookie: "kp-locale=fr" }, DEFAULT_LOCALE],
      ["a longer name that ends in kp-locale", { cookie: "xkp-locale=en" }, DEFAULT_LOCALE],
      ["no cookie, the saved choice", { stored: "en" }, "en"],
      ["the cookie wins over the saved choice", { cookie: "kp-locale=zh", stored: "en" }, "zh"],
      ["storage blocked", { storageThrows: true }, DEFAULT_LOCALE],
      ["a malformed cookie value", { cookie: "kp-locale=%E0%A4%A" }, DEFAULT_LOCALE],
    ];
    for (const [name, env, want] of cases) {
      const r = runDoc(W.doc, env);
      const title = `${T(want as keyof typeof dict).common.offline} · 50pick`;
      ok(`4.lang.${name.replace(/\s+/g, "-")} · <html lang="${want}"> and the title "${title}"`, r.lang === want && r.title === title && r.error === null,
        j({ lang: r.lang, title: r.title, error: r.error }));
    }
    const css = (W.doc.match(/<style>([\s\S]*?)<\/style>/) ?? ["", ""])[1];
    const hideRule = css.match(/([^{}]*)\{display:none\}/)?.[1] ?? "";
    const hidesAll = LOCALES.every((l) => hideRule.split(",").map((s) => s.trim()).includes(`html:not([lang="${l}"]) .l[lang="${l}"]`));
    ok("4.css · the stylesheet hides every language's spans except the one `<html lang>` names", hidesAll, hideRule);
    const PHRASES: Array<[string, string, (t: Dict) => string]> = [
      ["title", `<h1 class="kp-off__title">`, (t) => t.common.offline],
      ["hint", `<p class="kp-off__hint">`, (t) => t.common.offlineHint],
      ["retry", `<button type="button" id="${OD.OFFLINE_RETRY_ID}" class="kp-off__retry">`, (t) => t.error.tryAgain],
    ];
    for (const [name, open, pick] of PHRASES) {
      const at = W.doc.indexOf(open);
      const spans = LOCALES.map((l) => `<span class="l" lang="${l}">${htmlEsc(pick(T(l)))}</span>`).join("");
      const tail = at >= 0 ? W.doc.slice(at + open.length) : "";
      const body = name === "retry" ? tail.replace(/^<svg[\s\S]*?<\/svg><span>/, "") : tail;
      ok(`4.words.${name} · the ${name} is the dictionary's own words, one span per language, and nothing else`, at >= 0 && body.startsWith(spans + (name === "retry" ? "</span></button>" : name === "title" ? "</h1>" : "</p>")),
        at < 0 ? `no ${open}` : body.slice(0, 160));
    }
    const footer = [(t: Dict) => t.footer.licensedByGbt, (t: Dict) => t.footer.stopGambling, (t: Dict) => t.footer.license];
    const regulator = footer.every((pick) => LOCALES.every((l) => W.doc.includes(`<span class="l" lang="${l}">${htmlEsc(pick(T(l)))}</span>`)));
    ok("4.footer · the regulator lines (licensed by the Gaming Board, the licence, the stop line) are the footer's own words in every language", regulator);
  }

  log("§5 · the look's sources");
  {
    const css = decommentCss(W.globals);
    const first = (name: string) => css.match(new RegExp(`(?:^|[;{\\s])${name.replace(/[-]/g, "\\-")}\\s*:\\s*([^;]+);`))?.[1];
    const drift = Object.entries(W.tokens).filter(([k, v]) => squash(first(k) ?? "<absent>") !== squash(v)).map(([k, v]) => `${k}: doc ${v} · globals.css ${first(k) ?? "absent"}`);
    ok(`5.tokens · each of the document's ${Object.keys(W.tokens).length} tokens is globals.css's own value`, drift.length === 0 && Object.keys(W.tokens).length >= 15, drift.join(" | "));
    const block = css.match(/(?:^|\n)\.btn-primary\s*\{([^}]*)\}/)?.[1] ?? "";
    const decl = (p: string) => block.match(new RegExp(`(?:^|;)\\s*${p}\\s*:\\s*([^;]+);`))?.[1];
    const pDrift = Object.entries(W.primary).filter(([k, v]) => squash(decl(k) ?? "<absent>") !== squash(v)).map(([k, v]) => `${k}: doc ${v} · .btn-primary ${decl(k) ?? "absent"}`);
    ok("5.primary · the retry's paint is `.btn-primary`'s, property for property", block.length > 0 && pDrift.length === 0, pDrift.join(" | ") || "no .btn-primary block");
    const topo = decomment(W.topo);
    const topoPaths = [...topo.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    const topoOk = j(topoPaths) === j(W.topoData.paths) && topo.includes(`width="${W.topoData.width}" height="${W.topoData.height}"`)
      && topo.includes(`stroke="${W.topoData.stroke}"`) && topo.includes(`strokeWidth="${W.topoData.strokeWidth}"`)
      && new RegExp(`opacity\\s*=\\s*${String(W.topoData.opacity).replace(".", "\\.")}\\b`).test(topo);
    ok("5.topo · the backdrop is BrandTopo's tile, ink, contours and default opacity", topoOk, j({ topoPaths }));
    const glyphs = decomment(W.glyphs);
    const inner = (name: string) => (glyphs.match(new RegExp(`\\b${name}: \\(p: GlyphProps\\) => <G \\{\\.\\.\\.p\\}>([\\s\\S]*?)</G>,`))?.[1] ?? "<absent>").replace(/\s*\/>/g, "/>").trim();
    const gDrift = Object.entries(W.glyphData).filter(([k, v]) => inner(k) !== v).map(([k]) => `${k}: glyphs.tsx ${inner(k)}`);
    ok("5.glyphs · the wifi-off disc and the retry's arrow are glyphs.tsx's own drawings", gDrift.length === 0, gDrift.join(" | "));
    ok("5.mark · the mark is brand-mark.ts's one geometry", W.doc.includes(`<path d="${MARK.greenPath}" fill="${MARK.green}"/>`) && W.doc.includes(`<path d="${MARK.redPath}" fill="${MARK.red}"/>`));
  }

  log("§6 · no person, nothing to hydrate");
  {
    const SHELL_SIGNS = ["journey-top-bar", "kp-jhdr", "journey-balance", "journey-tabs", "journey-preview-marker", "data-kp-funnel", "app-topbar", "kp-rail", "avatar", "Salio", "Balance", "TZS", "__next_f", "/_next/", "<link"];
    const found = SHELL_SIGNS.filter((s) => W.doc.includes(s));
    ok("6.no-shell · the document carries no piece of the shell: no header, capsule, balance, rail, preview strip or avatar", found.length === 0, found.join(", "));
    const tags = [...W.doc.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);
    ok("6.scripts · exactly two scripts, both its own and inline — no Next.js runtime, no chunk, nothing to hydrate", tags.length === 2 && tags.every((a) => a === ""), j(tags));
    ok("6.no-react · the document module imports no React and no component", !/from\s+"react"|from\s+"@\/components\//.test(decomment(W.docModule)));
    ok("6.landmark · one main landmark and one h1", (W.doc.match(/<main\b/g) ?? []).length === 1 && (W.doc.match(/<h1\b/g) ?? []).length === 1);
  }

  log("§7 · it recovers");
  {
    const away = runDoc(W.doc, { pathname: "/positions" });
    (away.button.on.click ?? []).forEach((f) => f());
    ok("7.retry · \"Jaribu tena\" reloads the address the player asked for", j(away.calls) === j(["reload"]), j(away.calls));
    const back = runDoc(W.doc, { pathname: "/positions" });
    (back.win.online ?? []).forEach((f) => f());
    ok("7.online · the connection coming back reloads it by itself", j(back.calls) === j(["reload"]), j(back.calls));
    const own = runDoc(W.doc, { pathname: "/offline" });
    (own.button.on.click ?? []).forEach((f) => f());
    ok("7.own · on /offline itself there is nothing to retry: home", j(own.calls) === j(["replace:/"]), j(own.calls));
    const idle = runDoc(W.doc, { pathname: "/positions" });
    ok("7.idle · nothing reloads by itself while the browser stays offline (no reload loop on a server that is down)", idle.calls.length === 0, j(idle.calls));
  }

  log("§8 · the offline notice covers nothing");
  {
    const banner = decomment(W.banner);
    const shell = decomment(W.shell);
    const nb = decomment(W.noticeBar);
    const POSITIONED = /\b(?:fixed|absolute|sticky)\b|\bz-\[|\bz-\d|zIndex|\binset-|\btop-0\b|style=\{/;
    ok("8.notice · the banner is the kit's warning NoticeBar, announced as an alert", /<NoticeBar\b[^>]*\btone="warning"[^>]*\bassertive\b/.test(banner), squash(banner.slice(banner.indexOf("return ("), banner.indexOf("return (") + 200)));
    ok("8.unpositioned · …positioned nowhere: no fixed, absolute or sticky, no z-index, no inline style", !POSITIONED.test(banner), (banner.match(POSITIONED) ?? [""])[0]);
    ok("8.unpositioned.c · CONTROL — the matcher sees the strip it replaced", POSITIONED.test(`className="fixed top-0 inset-x-0 z-[200] flex"`));
    const root = nb.match(/return \(\s*<div([\s\S]*?)>/)?.[1] ?? "";
    ok("8.noticebar · NoticeBar itself is in the flow, and `assertive` makes it an alert",
      root.length > 0 && !/\b(?:fixed|absolute|sticky)\b/.test(root) && /role=\{assertive \? "alert" : "status"\}/.test(root), squash(root));
    const MOUNT = "<Suspense fallback={null}><OfflineBanner /></Suspense>";
    const body = shell.slice(shell.indexOf("export async function AppShell"), shell.indexOf("function SkipToContent"));
    const at = body.indexOf(MOUNT);
    const header = body.search(/<LazyJourneyTopBar\b[\s\S]*?<TopAppBar\b/);
    const main = body.indexOf("<MainLandmark>");
    ok("8.flow · AppShell mounts it once, after the header and before the page — in the flow between them",
      body.split(MOUNT).length === 2 && header > 0 && at > header && main > at && shell.split("<OfflineBanner").length === 2, j({ header, at, main }));
  }

  log("§9 · the last resort speaks all three languages");
  {
    const sw = loadSw(W.sw);
    const words = sw.get("FALLBACK_WORDS") as Record<string, { offline: string; hint: string; retry: string }> | undefined;
    const def = sw.get("FALLBACK_DEFAULT");
    const want = Object.fromEntries(LOCALES.map((l) => [l, { offline: T(l).common.offline, hint: T(l).common.offlineHint, retry: T(l).error.tryAgain }]));
    ok("9.words · its words are the dictionary's `common.offline`, `common.offlineHint` and `error.tryAgain`, in every language", j(words) === j(want), j(words));
    ok("9.default · its default is the platform's", def === DEFAULT_LOCALE, String(def));
    ok("9.url · the worker's OFFLINE_URL is the route's path", sw.get("OFFLINE_URL") === OD.OFFLINE_PATH, String(sw.get("OFFLINE_URL")));
    const html = String(sw.get("fallbackDocument()") ?? "");
    const zh = runDoc(html, { cookie: "kp-locale=zh" });
    const en = runDoc(html, { stored: "en" });
    const none = runDoc(html, {});
    ok("9.lang · shown, it follows the cookie, then the saved choice, then the default — as the document does",
      zh.lang === "zh" && en.lang === "en" && none.lang === DEFAULT_LOCALE && zh.error === null, j({ zh: zh.lang, en: en.lang, none: none.lang, error: zh.error }));
    (zh.button.on.click ?? []).forEach((f) => f());
    (none.win.online ?? []).forEach((f) => f());
    ok("9.recovers · its retry reloads, and so does the connection coming back", j(zh.calls) === j(["reload"]) && j(none.calls) === j(["reload"]), j({ zh: zh.calls, none: none.calls }));
    const cookieName = W.layout.match(/jar\.get\("([^"]+)"\)\?\.value\);/)?.[1];
    const providerName = W.i18n.match(/const COOKIE_NAME = "([^"]+)";/)?.[1];
    ok("9.cookie · the document and the fallback read the cookie the layout and the provider read", cookieName === OD.OFFLINE_LOCALE_COOKIE && providerName === OD.OFFLINE_LOCALE_COOKIE && /N="kp-locale"/.test(html),
      j({ cookieName, providerName }));
  }

  log("§10 · push and the static-asset strategy are untouched");
  {
    const sw = loadSw(W.sw);
    await sw.fire("install");
    const name = sw.get("CACHE_NAME") as string;
    sw.store.get(name)?.set("/brand/x.svg", new FakeResponse("<cached svg>"));
    const asset = await sw.fire("fetch", { request: new FakeRequest(`${ORIGIN}/brand/x.svg`) });
    ok("10.static · a static asset is answered from the cache at once, and the network is asked to refresh it",
      (asset.answer as FakeResponse | undefined)?.body === "<cached svg>" && sw.fetched.includes("/brand/x.svg"), j({ body: (asset.answer as FakeResponse | undefined)?.body, fetched: sw.fetched }));
    const missing = await sw.fire("fetch", { request: new FakeRequest(`${ORIGIN}/icons/new.png`) });
    ok("10.static.miss · an uncached asset goes to the network", sw.fetched.includes("/icons/new.png") && missing.answer === undefined);
    const api = loadSw(W.sw);
    let answered = false;
    api.handlers.fetch?.({ request: new FakeRequest(`${ORIGIN}/api/wallet`), respondWith: () => { answered = true; }, waitUntil: () => undefined });
    ok("10.api · an API request is never answered by the worker", !answered);
    const src = decomment(W.sw);
    ok("10.static.rule · the static rule and its stale-while-revalidate are as they were",
      src.includes('url.pathname.startsWith("/icons/")') && src.includes('url.pathname.startsWith("/brand/")') && src.includes('url.pathname.startsWith("/hero/")')
        && src.includes("url.pathname.match(/\\.(woff2?|ttf|otf|svg|png|jpg|webp|ico)$/)") && src.includes("if (response.ok) cache.put(request, response.clone());")
        && src.includes("if (cached) { event.waitUntil(network.catch(() => undefined)); return cached; }"));
    await sw.fire("push", { data: { json: () => ({ title: "Dau limepotea", body: "b", tag: "updown-1", url: "/updown" }), text: () => "" } });
    const n = sw.shown[0];
    ok("10.push · a push still shows its notification with its tag, renotify and the address it opens",
      !!n && n.title === "Dau limepotea" && n.options.tag === "updown-1" && n.options.renotify === true && j(n.options.data) === j({ url: "/updown" }), j(n));
    ok("10.click · a notification click still opens or focuses the app", typeof sw.handlers.notificationclick === "function");
  }
  return failed;
}

/* ── the plants ────────────────────────────────────────────────────────────────────────────────────────────────── */

type Plant = { name: string; expect: RegExp; world: (w: World) => World; needs: (w: World) => boolean };
const swap = (field: keyof World, from: string | RegExp, to: string) => (w: World): World => ({ ...w, [field]: (w[field] as string).replace(from, to) });
const has = (field: keyof World, s: string | RegExp) => (w: World) => (typeof s === "string" ? (w[field] as string).includes(s) : s.test(w[field] as string));

const PLANTS: Plant[] = [
  { name: "the precache sends the session cookie again (`cache.add(url)`)", expect: /^1\.omit /,
    world: swap("sw", "cache.add(precacheRequest(url))", "cache.add(url)"), needs: has("sw", "cache.add(precacheRequest(url))") },
  { name: "the old cache name kept (50pick-v4)", expect: /^2\.name /,
    world: swap("sw", /const CACHE_NAME = "[^"]+";/, 'const CACHE_NAME = "50pick-v4";'), needs: has("sw", /const CACHE_NAME = "[^"]+";/) },
  { name: "activate keeps the older caches", expect: /^2\.activate /,
    world: swap("sw", "keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))", "[]"), needs: has("sw", "keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))") },
  { name: "the offline answer looked up in every cache (`caches.match`)", expect: /^2\.lookup /,
    world: swap("sw", "caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL))", "caches.match(OFFLINE_URL)"), needs: has("sw", "caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL))") },
  { name: "a session read in the offline route", expect: /^3\.(reads|imports) /,
    world: (w) => ({ ...w, route: `import { cookies } from "next/headers";\n${w.route.replace("export function GET(): Response {", "export async function GET(): Promise<Response> {\n  const jar = await cookies();")}` }),
    needs: has("route", "export function GET(): Response {") },
  { name: "the route takes the request (and so could read it)", expect: /^3\.handler /,
    world: swap("route", "export function GET(): Response {", "export function GET(req: Request): Response {"), needs: has("route", "export function GET(): Response {") },
  { name: "/offline is a page again (rendered inside the root layout and AppShell)", expect: /^3\.page /,
    world: (w) => ({ ...w, pageExists: true }), needs: () => true },
  { name: "a hard-coded language (the head script gone: the bytes' Swahili for everybody)", expect: /^4\.lang\.en-cookie /,
    world: (w) => ({ ...w, doc: w.doc.replace(/<head>([\s\S]*?)<script>[\s\S]*?<\/script>/, "<head>$1") }), needs: has("doc", "<head>") },
  { name: "the language read but never applied to the spans (Swahili always shown)", expect: /^4\.css /,
    world: swap("doc", 'html:not([lang="sw"]) .l[lang="sw"],', ""), needs: has("doc", 'html:not([lang="sw"]) .l[lang="sw"],') },
  { name: "a hand-typed sentence instead of the dictionary's", expect: /^4\.words\.hint /,
    world: (w) => ({ ...w, doc: w.doc.replace(`>${htmlEsc(T("en").common.offlineHint)}<`, ">Check your connection and try again<") }),
    needs: has("doc", `>${htmlEsc(T("en").common.offlineHint)}<`) },
  { name: "a token drifted from globals.css", expect: /^5\.tokens /,
    world: (w) => ({ ...w, tokens: { ...w.tokens, "--bg": "oklch(15% 0.130 268)" } }), needs: () => true },
  { name: "the retry painted off the primary button", expect: /^5\.primary /,
    world: (w) => ({ ...w, primary: { ...w.primary, "border-color": "oklch(44% 0.20 268)" } }), needs: () => true },
  { name: "a glyph redrawn by hand", expect: /^5\.glyphs /,
    world: (w) => ({ ...w, glyphData: { ...w.glyphData, wifiOff: '<path d="M4 4l16 16"/>' } }), needs: () => true },
  { name: "the shell's header (and its balance) back in the document", expect: /^6\.no-shell /,
    world: swap("doc", "<body>", '<body><header class="kp-jhdr" data-testid="journey-top-bar"><span data-testid="journey-balance">Salio TZS 100,000</span></header>'), needs: has("doc", "<body>") },
  { name: "the app's runtime back in the document (something to hydrate)", expect: /^6\.scripts /,
    world: swap("doc", "</body>", '<script src="/_next/static/chunks/main-app.js" async></script></body>'), needs: has("doc", "</body>") },
  { name: "a retry button that does nothing", expect: /^7\.retry /,
    world: swap("doc", 'if(b)b.addEventListener("click",again);', ""), needs: has("doc", 'if(b)b.addEventListener("click",again);') },
  { name: "no recovery when the connection comes back", expect: /^7\.online /,
    world: swap("doc", 'window.addEventListener("online",again)', "void 0"), needs: has("doc", 'window.addEventListener("online",again)') },
  { name: "the banner back as a fixed strip over the header", expect: /^8\.unpositioned /,
    world: swap("banner", '<NoticeBar tone="warning"', '<div className="fixed top-0 inset-x-0 z-[200]" /><NoticeBar tone="warning"'), needs: has("banner", '<NoticeBar tone="warning"') },
  { name: "the banner mounted back after the page (its old place)", expect: /^8\.flow /,
    world: (w) => ({ ...w, shell: w.shell.replace("<Suspense fallback={null}><OfflineBanner /></Suspense>", "").replace("<RouteTransition>{children}</RouteTransition>\n      </MainLandmark>", "<RouteTransition>{children}</RouteTransition>\n      </MainLandmark>\n      <Suspense fallback={null}><OfflineBanner /></Suspense>") }),
    needs: has("shell", "<RouteTransition>{children}</RouteTransition>\n      </MainLandmark>") },
  { name: "NoticeBar ignores `assertive` (the alert becomes a polite status)", expect: /^8\.noticebar /,
    world: swap("noticeBar", 'role={assertive ? "alert" : "status"}', 'role="status"'), needs: has("noticeBar", 'role={assertive ? "alert" : "status"}') },
  { name: "the last resort in English and Swahili only (no Chinese)", expect: /^9\.words /,
    world: swap("sw", /\n\s*zh: \{ offline: "[^"]*", hint: "[^"]*", retry: "[^"]*" \},/, ""), needs: has("sw", /\n\s*zh: \{ offline:/) },
  { name: "the static rule stops refreshing its copy", expect: /^10\.static\.rule /,
    world: swap("sw", "if (response.ok) cache.put(request, response.clone());", ""), needs: has("sw", "if (response.ok) cache.put(request, response.clone());") },
  { name: "a push loses its tag", expect: /^10\.push /,
    world: swap("sw", 'tag: payload.tag || "50pick-notification",', 'tag: "50pick-notification",'), needs: has("sw", 'tag: payload.tag || "50pick-notification",') },
];

if (!PROVE_RED) {
  console.log("offline-neutral — the offline page holds no person, speaks the language of now, and covers nothing (R4-G)");
  const failed = await run(REAL, (l) => console.log(l));
  console.log(`\nOFFLINE NEUTRAL — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => undefined;
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(REAL, quiet);
  ok("the REAL tree passes every check", clean.length === 0, clean.join(" | "));
  for (const p of PLANTS) {
    if (!p.needs(REAL)) { ok(p.name, false, "the plant's anchor is not in the real source — the plant would plant nothing"); continue; }
    const failures = await run(p.world(REAL), quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? `caught by ${failures.filter((f) => p.expect.test(f)).map((f) => f.split(" ")[0]).join(", ")}` : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${PLANTS.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
