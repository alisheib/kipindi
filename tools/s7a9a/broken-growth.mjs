/**
 * qa:served-skeleton — WHAT THE SERVER SENT: THE SKELETON OF ITS HTML, CAPTURED FROM ONE LOCAL SERVER AND COMPARED WITH
 * ANOTHER'S (the Vodacom plan S7, A9 (1) — `docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md`).
 *
 * The tracked Node port of WP6c's served-HTML compare, shell-skeleton.py. That instrument lived only in session
 * 0cb4430f's scratchpad on another PC and was never read here: this file is built from A9 (1)'s specification, so its
 * line references to the Python (:31-48, :86-92, :164-170) are the plan's, not this file's. It answers what parity v3
 * cannot (S7-PLAN critique 15): parity reads the hydrated DOM, where Suspense markers, streamed segments and
 * client-rendered boundaries are already gone. This reads the bytes.
 *
 *   npm run -s qa:served-skeleton                                         the control (--self-test is the default)
 *   KP_BASE=http://localhost:3041 npm run -s qa:served-skeleton -- --capture <new file>
 *        [--viewers guest,player,journey] [--routes home,markets,live,results,watchlist,market,account] [--locale en|sw]
 *   npm run -s qa:served-skeleton -- --compare <a> <b> [--main] [--norm <extra>,…] [--viewers …] [--routes …]
 *
 * ⭐ A CAPTURE (--capture) asks ONE running local server for each cell twice in a row and keeps the SECOND (warm) answer
 * whole: its status, its Location and its bytes. Normalising happens at compare time, never in the file, so an extra
 * below can be switched on after a null pair without asking a server again. Each cell is asked for as a browser loads a
 * document (Sec-Fetch-Mode: navigate, through node:http — see NAVIGATION), with one cookie jar per viewer.
 *   · routes   home / · markets /markets · live /live · results /results · watchlist /watchlist · market /markets/[id]
 *              · account /account. Routes are named, never typed as paths: Git Bash rewrites an argument that starts
 *              with "/". The question page reads the question titled MARKET_TITLE below, found by its title, because
 *              every server mints its own ids. To have one, the capture first POSTs /api/dev-test/seed-real-markets
 *              (dev only; it skips a title that exists, so a second capture on one server seeds nothing new).
 *   · viewers  guest · player (the demo player, /auth/demo — the door scripts/live/journey-pass.mjs `demoSession`
 *              uses, over plain HTTP with its cookie) · journey (only when asked: the demo player holding a staff
 *              preview pass, minted as an officer mints one — /api/dev-test/seed-admin as SUPPORT, then
 *              POST /preview intent=on; the server must run with DISABLE_ADMIN_TOTP=true and the rollout must be
 *              STAFF_PREVIEW). Viewers are captured in that order, so the officer is seeded after every classic cell.
 *   · locale   en by default (the kp-locale cookie); --locale sw for the other.
 * ⛔ REFUSES before it sends anything: a BASE that is not http://localhost:PORT, http://127.0.0.1:PORT or
 * http://[::1]:PORT (KP_BASE or --base; the default is http://localhost:3041); then a server that reports a configured
 * database (the capture seeds questions: an in-memory dev server only); a rollout that is ACTIVE (a viewer without a
 * pass would not be classic); and an output file that exists. A capture is written once.
 *
 * ⭐ A COMPARE (--compare <a> <b>) reads two captures, so two servers never run at once. Per cell, per field:
 *   status    the warm answer's status, and where it redirects.
 *   head      every <link> and <meta> wherever it sits (React hoists them), every <script src>, and any inline script in
 *             <head>: every attribute, sorted, each line tagged with where it sits ([head] [body] [main] [segment]).
 *   preloads  the script preloads (link rel=preload as=script, rel=modulepreload), listed apart from head.
 *   body      every other tag with its id, class, role, data-testid and hidden; every comment, React's boundary markers
 *             <!--$--> <!--$?--> <!--/$--> included; "#text" for each text node; an inline script as
 *             `script [flight]` (self.__next_f), `script [react]` (React's $R… instructions) or `script [inline]`.
 *             Without --main, <main id="main-content"> and each streamed segment <div hidden id="S:…"> are collapsed
 *             to one line (what shell-skeleton.py did, :86-92).
 *   main      (--main only) the inside of <main id="main-content">.
 *   segments  (--main only) the inside of each streamed segment, in byte order.
 *   bailouts  COUNTED, NEVER STRIPPED OR NORMALISED: the <!--$!--> markers; the <template data-dgst=
 *             "BAILOUT_TO_CLIENT_SIDE_RENDERING"> templates; any other digest template (a server error); and React's
 *             late client render ($RX(…) or <template data-rxi>), each listed with where it sits. They are counted on
 *             the bytes as parsed, before any normalisation or extra. A compare FAILS when any count grows, whatever
 *             else matches (shell-skeleton.py:164-170). Both captures of a pair carry lazy-overlays' by-design
 *             boundaries (the primer, and the chat bubble when the chatbot is on), so those cancel out.
 *             ⭐ Whether the client renders a boundary is this field's alone: the body writes a client-rendered
 *             boundary's opener as the boundary it is (<!--$-->) and leaves its digest template out, so one change is
 *             reported once, here.
 *
 * ⭐ NORMALISATIONS, ALWAYS ON (those shell-skeleton.py carried, :31-48, plus the server's own address):
 *   · chunk hashes            a run of 8+ hex digits in a /_next/static/ path, its %2F-encoded form, or a
 *                             next_static/ precedence key → "~"
 *   · ?dpl=                   Next's asset query (next/dist/server/app-render/get-asset-query-string.js): ?dpl=… →
 *                             ?dpl=~, and its dev twin ?v=<the request's timestamp>, which `next dev --webpack` puts on
 *                             every stylesheet and which differs between two requests to ONE server → ?v=~
 *   · React's generated ids   _R_…_ · «R…» · :R…: → _R_~_ · «R~» · :R~:
 *   · the identity avatar's ids   c[tmgc]<base36> on an svg gradient or clip path (identity-avatar.tsx:76-173) → cm~
 *   · streamed segment ids    S:n · B:n · P:n on an id → S:~ · B:~ · P:~
 *   · the local origin        http://localhost:PORT (and 127.0.0.1, [::1]) → http://local: the two servers of a pair
 *                             may listen on different ports, and a redirect names the port it was asked on.
 *
 * ⭐ EXTRAS, OFF BY DEFAULT. Each is switched on by name (--norm a,b) only when a calibration null pair (two fresh servers
 * of ONE tree) proves it necessary under --main, as parity v3's calibration settles market and round ids and time
 * labels. A verdict names every extra that was on. None of them can reach the bailouts field.
 *   · store-ids          mkt_ udr_ usr_ wal_ kyc_ txn_ pos_ ids in a recorded value → mkt_~ (each server mints its own)
 *   · text-runs          a run of text nodes joined by React's <!-- --> separators is one "#text" (a time label's parts
 *                        vary with its value: "5 min" against "1 h 3 min")
 *   · resolve-streaming  each streamed segment is spliced into its boundary as the browser does ($RC/$RR/$RS and their
 *                        template forms; $RX marks the boundary client-rendered), so a boundary's content is compared
 *                        where it lands, whether it came inline or streamed — which one it is follows server timing
 *   · stream-scripts     the body's flight chunks (self.__next_f) and React's instruction scripts are left out: their
 *                        number follows where the stream was cut
 *
 * ⭐ CONTROLS. `--self-test` (the default) plants defects on synthetic documents and holds each to its own field and
 * nowhere else — a dropped <!--$-->, a boundary turned into <!--$!-->, a new <template data-dgst>, an extra body
 * element, a class changed inside main (reported only under --main) or inside a streamed segment, a dropped og:url meta,
 * an added head preload, a changed status, a late client render and a server-error digest — under each mode, with and
 * without every extra. It also proves that a twin carrying every kind of server noise compares clean, that each
 * normalisation is what absorbs its noise, that each extra absorbs its own and nothing is absorbed with it off, that the
 * bail-out counts never move with the extras, which BASEs are refused, and that this header lists every extra.
 * --capture and --compare run it first and refuse to work when it fails. Then, before any verdict is read: a
 * HEAD-against-HEAD null pair — two fresh servers at one commit, compared with and without --main — reports no change.
 *
 * Exit codes: 0 the control passed / the captures match / the capture was written · 1 a difference or a failed control ·
 * 2 refused (usage, BASE, server, file).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { request as httpRequest } from "node:http";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const NL = "\n";
const KIND = "kp-served-skeleton";
const VERSION = 1;

// ── the cells ─────────────────────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  { name: "home", path: "/" },
  { name: "markets", path: "/markets" },
  { name: "live", path: "/live" },
  { name: "results", path: "/results" },
  { name: "watchlist", path: "/watchlist" },
  { name: "market", path: "/markets/[id]" },
  { name: "account", path: "/account" },
];
const VIEWERS = ["guest", "player", "journey"];
const DEFAULT_VIEWERS = ["guest", "player"];
const LOCALES = ["en", "sw"];
/** The question page's question: the first of seed-real-markets' titles (route.ts:22). */
const MARKET_TITLE = "Simba SC wins the NBC Premier League 2026-27";
/** The officer who mints the journey viewer's pass. Not journey-pass.mjs's phone, so the two never share an account. */
const OFFICER = { role: "SUPPORT", phone: "+255700000086", name: "Skeleton Support" };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
/** A dev server compiles a route on its first request; a minute is common. */
const TIMEOUT_MS = 240_000;
/** What the server SERVES: recorded per capture, so a verdict names the tree it read. */
const SERVED = ["src", "public", "next.config.ts", "tailwind.config.ts", "postcss.config.mjs", "package.json", "package-lock.json"];
const BAILOUT = "BAILOUT_TO_CLIENT_SIDE_RENDERING";

// ── refusals and arguments ────────────────────────────────────────────────────────────────────────────────
const refuse = (text) => { console.error(`REFUSED — ${text}`); process.exit(2); };
const USAGE = [
  "USAGE — one of:",
  "  --self-test                                     (the default)",
  "  --capture <new file> [--viewers guest,player,journey] [--routes <names>] [--locale en|sw] [--base http://localhost:PORT]",
  "  --compare <a> <b> [--main] [--norm <extra>,…] [--viewers <names>] [--routes <names>]",
  `  routes: ${ROUTES.map((r) => `${r.name} (${r.path})`).join(" · ")}`,
  `  viewers: ${VIEWERS.join(" · ")} (default ${DEFAULT_VIEWERS.join(",")})`,
  "  extras (--norm): store-ids · text-runs · resolve-streaming · stream-scripts — see the file's header",
].join(NL);

function parseArgs(args) {
  const VALUE = new Set(["--capture", "--norm", "--viewers", "--routes", "--locale", "--base"]);
  const BOOL = new Set(["--self-test", "--main", "--help"]);
  const out = { unknown: [], missing: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--compare") {
      const x = args[i + 1], y = args[i + 2];
      if (!x || !y || x.startsWith("--") || y.startsWith("--")) out.missing.push(a);
      else { out.compare = [x, y]; i += 2; }
    } else if (VALUE.has(a)) {
      const v = args[i + 1];
      if (!v || v.startsWith("--")) out.missing.push(a);
      else { out[a.slice(2)] = v; i++; }
    } else if (BOOL.has(a)) out[a.slice(2)] = true;
    else out.unknown.push(a);
  }
  return out;
}

/** A comma list of known names, or null when the flag was not given. */
function listOf(raw, allowed, what) {
  if (raw == null) return null;
  const items = [...new Set(String(raw).split(",").map((s) => s.trim()).filter(Boolean))];
  const bad = items.filter((x) => !allowed.includes(x));
  if (bad.length || !items.length) {
    console.error(`USAGE — ${what}: ${bad.length ? bad.join(", ") : "(empty)"} is not one of ${allowed.join(", ")}`);
    process.exit(2);
  }
  return items;
}

/** The BASE when it is a local origin exactly — http, localhost / 127.0.0.1 / [::1], a port or none, no path — else null. */
function localBase(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "http:" || u.username || u.password || u.search || u.hash) return null;
  if (u.pathname !== "/" && u.pathname !== "") return null;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)) return null;
  const origin = `http://${u.host}`;
  return s === origin ? origin : null;
}

// ── the parser: React's server output is closed and quoted, so a small tokenizer reads it whole ───────────
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea", "title"]);

function readTag(html, at) {
  const n = html.length;
  let i = at + 1;
  while (i < n && !/[\s/>]/.test(html[i])) i++;
  const tag = html.slice(at + 1, i).toLowerCase();
  const attrs = new Map();
  let selfClose = false;
  while (i < n) {
    while (i < n && /\s/.test(html[i])) i++;
    if (html[i] === ">") { i++; break; }
    if (html[i] === "/" && html[i + 1] === ">") { selfClose = true; i += 2; break; }
    if (html[i] === "/") { i++; continue; }
    let j = i;
    while (j < n && !/[\s=/>]/.test(html[j])) j++;
    const name = html.slice(i, j).toLowerCase();
    i = j;
    while (i < n && /\s/.test(html[i])) i++;
    let value = "";
    if (html[i] === "=") {
      i++;
      while (i < n && /\s/.test(html[i])) i++;
      const q = html[i];
      if (q === '"' || q === "'") {
        const close = html.indexOf(q, i + 1);
        value = close < 0 ? html.slice(i + 1) : html.slice(i + 1, close);
        i = close < 0 ? n : close + 1;
      } else {
        let k = i;
        while (k < n && !/[\s>]/.test(html[k])) k++;
        value = html.slice(i, k);
        i = k;
      }
    }
    if (name && !attrs.has(name)) attrs.set(name, value);
  }
  return { tag, attrs, selfClose, end: i };
}

/** The document as a tree of { t: "el" | "text" | "comment" | "doctype" } nodes under a root. */
function parse(html) {
  const root = { t: "root", tag: "#root", attrs: new Map(), kids: [], parent: null };
  let cur = root;
  const add = (node) => { node.parent = cur; cur.kids.push(node); return node; };
  const n = html.length;
  let i = 0;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt < 0) { add({ t: "text", data: html.slice(i) }); break; }
    if (lt > i) add({ t: "text", data: html.slice(i, lt) });
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      add({ t: "comment", data: end < 0 ? html.slice(lt + 4) : html.slice(lt + 4, end) });
      i = end < 0 ? n : end + 3;
      continue;
    }
    const next = html[lt + 1] ?? "";
    if (next === "!" || next === "?") {
      const end = html.indexOf(">", lt);
      add({ t: "doctype", data: html.slice(lt, end < 0 ? n : end + 1) });
      i = end < 0 ? n : end + 1;
      continue;
    }
    if (next === "/") {
      const end = html.indexOf(">", lt);
      const tag = html.slice(lt + 2, end < 0 ? n : end).trim().toLowerCase();
      for (let up = cur; up && up !== root; up = up.parent) if (up.tag === tag) { cur = up.parent; break; }
      i = end < 0 ? n : end + 1;
      continue;
    }
    if (!/[A-Za-z]/.test(next)) { add({ t: "text", data: "<" }); i = lt + 1; continue; }
    const { tag, attrs, selfClose, end } = readTag(html, lt);
    const el = add({ t: "el", tag, attrs, kids: [] });
    i = end;
    if (RAW.has(tag) && !selfClose) {
      const re = new RegExp(`</${tag}\\s*>`, "gi");
      re.lastIndex = i;
      const m = re.exec(html);
      const text = m ? html.slice(i, m.index) : html.slice(i);
      if (text) el.kids.push({ t: "text", data: text, parent: el });
      i = m ? m.index + m[0].length : n;
      continue;
    }
    if (!VOID.has(tag) && !selfClose) cur = el;
  }
  return root;
}

const textOf = (el) => el.kids.filter((k) => k.t === "text").map((k) => k.data).join("");
const isMain = (el) => el.tag === "main" && el.attrs.get("id") === "main-content";
const SEGMENT_ID = /^S:[0-9a-f]+$/;
const isSegment = (el) => SEGMENT_ID.test(el.attrs.get("id") ?? "");
const isDigestTemplate = (el) => el.tag === "template" && (el.attrs.has("data-dgst") || el.attrs.has("data-rxi"));
const isInstructionTemplate = (el) => el.tag === "template" && ["data-rci", "data-rri", "data-rsi", "data-rxi"].some((a) => el.attrs.has(a));
const headOwned = (el) => el.tag === "link" || el.tag === "meta" || (el.tag === "script" && el.attrs.has("src"));
const relOf = (el) => (el.attrs.get("rel") ?? "").toLowerCase().split(/\s+/);
const isScriptPreload = (el) => el.tag === "link"
  && ((relOf(el).includes("preload") && (el.attrs.get("as") ?? "").toLowerCase() === "script") || relOf(el).includes("modulepreload"));
/** React's instruction scripts start with an $R… name, but for one: the shell-time script it writes only when a boundary
 *  is still pending as the shell flushes (react-dom-server.node.production.js:2388, :7071) — a fact of server timing. */
function scriptKind(el) {
  const s = textOf(el).trimStart();
  if (/^\(?\s*self\.__next_f\b/.test(s)) return "flight";
  if (/^(?:\$R[A-Z]|requestAnimationFrame\(function\(\)\{\$RT=)/.test(s)) return "react";
  return "inline";
}

// ── normalisations ────────────────────────────────────────────────────────────────────────────────────────
/** The value normalisations always on. `without` (self-test only) switches one off to prove it is what absorbs its noise. */
const BASE_NORMS = [
  ["chunk hashes", (s) => s.replace(/(\/_next\/static\/|%2F_next%2Fstatic%2F|next_static\/)([^"'\s)?#&]*)/gi,
    (m, p, rest) => p + rest.replace(/(^|[^0-9A-Za-z])[0-9a-f]{8,}(?![0-9A-Za-z])/g, "$1~"))],
  ["?dpl=", (s) => {
    const t = s.replace(/([?&](?:amp;)?)dpl=[^"'&\s#]*/g, "$1dpl=~");
    return /\/_next\/static\//.test(t) ? t.replace(/([?&](?:amp;)?)v=\d+/g, "$1v=~") : t;
  }],
  ["React's generated ids", (s) => s.replace(/_R_[0-9A-Za-z]+_/g, "_R_~_").replace(/«([Rr])[0-9A-Za-z]*»/g, "«$1~»").replace(/:R[0-9A-Za-z]+:/g, ":R~:")],
  ["the local origin", (s) => s.replace(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/g, "http://local")],
];
/** The two normalisations that read an id in its place: a streamed segment's, and the identity avatar's. */
const ID_NORMS = ["the identity avatar's ids", "streamed segment ids"];
const SVG_DEFS = new Set(["radialgradient", "lineargradient", "clippath", "mask", "pattern", "filter"]);

const EXTRAS = {
  "store-ids": "mkt_ udr_ usr_ wal_ kyc_ txn_ pos_ ids → mkt_~",
  "text-runs": "a run of text nodes joined by React's <!-- --> separators is one #text",
  "resolve-streaming": "each streamed segment spliced into its boundary, as the browser does",
  "stream-scripts": "the body's flight chunks and React's instruction scripts left out",
};

function normaliser(extras, without) {
  const fns = BASE_NORMS.filter(([name]) => !without.has(name)).map(([, fn]) => fn);
  if (extras.has("store-ids")) fns.push((s) => s.replace(/(?<![A-Za-z0-9])(mkt|udr|usr|wal|kyc|txn|pos)_[A-Za-z0-9]{6,}/g, "$1_~"));
  return (v) => fns.reduce((s, fn) => fn(s), String(v));
}

function idValue(el, v, without) {
  if (!without.has("streamed segment ids") && /^[SBP]:[0-9a-f]+$/.test(v)) return `${v[0]}:~`;
  if (!without.has("the identity avatar's ids") && SVG_DEFS.has(el.tag) && /^c[tmgc][0-9a-z]+$/.test(v)) return `${v.slice(0, 2)}~`;
  return v;
}

const RECORDED = ["id", "class", "role", "data-testid"];
function elementLine(el, N, without) {
  let s = el.tag;
  for (const a of RECORDED) {
    if (!el.attrs.has(a)) continue;
    const raw = el.attrs.get(a);
    s += ` ${a}="${N(a === "id" ? idValue(el, raw, without) : raw)}"`;
  }
  if (el.attrs.has("hidden")) s += " hidden";
  return s;
}

function attrsLine(el, N) {
  return [...el.attrs.keys()].sort().map((k) => {
    const v = el.attrs.get(k);
    return v === "" ? ` ${k}` : ` ${k}="${N(v)}"`;
  }).join("");
}

// ── the fields ────────────────────────────────────────────────────────────────────────────────────────────
/** The client-rendered boundaries, counted on the tree as parsed — before any normalisation or extra touches it. */
function bailoutsOf(root) {
  const counts = { markers: 0, templates: 0, digests: 0, late: 0 };
  const lines = [];
  const visit = (node, path) => {
    for (const k of node.kids ?? []) {
      if (k.t === "comment" && k.data === "$!") { counts.markers++; lines.push(`<!--$!--> in ${path || "(document)"}`); continue; }
      if (k.t !== "el") continue;
      if (k.tag === "template" && k.attrs.has("data-rxi")) {
        counts.late++;
        lines.push(`late client render <template data-rxi> data-dgst="${k.attrs.get("data-dgst") ?? ""}" in ${path}`);
      } else if (k.tag === "template" && k.attrs.has("data-dgst")) {
        const d = k.attrs.get("data-dgst");
        if (d === BAILOUT) counts.templates++; else counts.digests++;
        lines.push(`<template data-dgst="${d}"> in ${path}`);
      } else if (k.tag === "script" && !k.attrs.has("src")) {
        for (const m of textOf(k).matchAll(/\$RX\("([^"]*)"(?:,"([^"]*)")?/g)) {
          counts.late++;
          lines.push(`late client render $RX("${m[1]}"${m[2] === undefined ? "" : `, "${m[2]}"`}) in ${path}`);
        }
      }
      visit(k, path ? `${path}>${k.tag}` : k.tag);
    }
  };
  visit(root, "");
  return { counts, lines };
}

/** Splices each streamed segment into its place, in the order the instructions arrive (extra: resolve-streaming). */
function resolveStreaming(root) {
  const byId = new Map();
  const ops = [];
  const visit = (node) => {
    for (const k of node.kids ?? []) {
      if (k.t !== "el") continue;
      const id = k.attrs.get("id");
      if (id && /^[SBP]:[0-9a-f]+$/.test(id) && !byId.has(id)) byId.set(id, k);
      if (k.tag === "script" && !k.attrs.has("src")) {
        for (const m of textOf(k).matchAll(/\$(RC|RR|RS|RX)\("([^"]*)"(?:,"([^"]*)")?/g)) ops.push({ op: m[1], a: m[2], b: m[3] ?? "" });
      } else if (k.tag === "template") {
        const g = (n) => k.attrs.get(n) ?? "";
        if (k.attrs.has("data-rci") || k.attrs.has("data-rri")) ops.push({ op: "RC", a: g("data-bid"), b: g("data-sid") });
        else if (k.attrs.has("data-rsi")) ops.push({ op: "RS", a: g("data-sid"), b: g("data-pid") });
        else if (k.attrs.has("data-rxi")) ops.push({ op: "RX", a: g("data-bid"), b: "" });
      }
      visit(k);
    }
  };
  visit(root);
  const detach = (n) => { const p = n.parent; const i = p ? p.kids.indexOf(n) : -1; if (i >= 0) p.kids.splice(i, 1); n.parent = null; };
  const adopt = (kids, parent) => { for (const c of kids) c.parent = parent; return kids; };
  /** The boundary a pending template opens: [opener index, closer index] in its parent, or null. */
  const span = (tpl) => {
    const p = tpl.parent;
    const i = p.kids.indexOf(tpl);
    const open = p.kids[i - 1];
    if (!open || open.t !== "comment" || open.data !== "$?") return null;
    let depth = 0;
    for (let j = i + 1; j < p.kids.length; j++) {
      const c = p.kids[j];
      if (c.t !== "comment") continue;
      if (c.data === "/$") { if (depth === 0) return [i - 1, j]; depth--; } else if (c.data.startsWith("$")) depth++;
    }
    return null;
  };
  for (const { op, a, b } of ops) {
    if (op === "RS") {
      const seg = byId.get(a), ph = byId.get(b);
      if (!seg || !ph || !ph.parent || !seg.parent) continue;
      detach(seg);
      const p = ph.parent;
      p.kids.splice(p.kids.indexOf(ph), 1, ...adopt(seg.kids, p));
      ph.parent = null;
    } else if (op === "RC" || op === "RR") {
      const tpl = byId.get(a), seg = byId.get(b);
      if (!tpl || !seg || !tpl.parent || !seg.parent || !span(tpl)) continue;
      detach(seg);
      const p = tpl.parent;
      const [open, close] = span(tpl);
      p.kids[open].data = "$";
      p.kids.splice(open + 1, close - open - 1, ...adopt(seg.kids, p));
      tpl.parent = null;
    } else if (op === "RX") {
      const tpl = byId.get(a);
      const s = tpl && tpl.parent ? span(tpl) : null;
      if (s) tpl.parent.kids[s[0]].data = "$!";
    }
  }
  return root;
}

function headOf(root, N) {
  const head = [], preloads = [];
  const visit = (node, region) => {
    for (const k of node.kids ?? []) {
      if (k.t !== "el") continue;
      if (headOwned(k) || (k.tag === "script" && region === "head")) {
        const line = `[${region}] ${k.tag}${attrsLine(k, N)}${k.tag === "script" && !k.attrs.has("src") ? " (inline)" : ""}`;
        (isScriptPreload(k) ? preloads : head).push(line);
        continue;
      }
      const inner = k.tag === "head" ? "head" : isSegment(k) ? "segment" : isMain(k) && region !== "segment" ? "main" : region;
      visit(k, inner);
    }
  };
  visit(root, "body");
  return { head, preloads };
}

/** A run of text nodes and React's <!-- --> separators, as one text node (extra: text-runs). */
function textRuns(kids) {
  const out = [];
  for (let i = 0; i < kids.length; i++) {
    out.push(kids[i]);
    if (kids[i].t !== "text") continue;
    while (i + 1 < kids.length && (kids[i + 1].t === "text" || (kids[i + 1].t === "comment" && kids[i + 1].data === " "))) i++;
  }
  return out;
}

function skeletonOf(root, { main, extras, N, without }) {
  const out = { body: [], main: main ? [] : null, segments: main ? [] : null };
  const walk = (kids, depth, sink) => {
    const pad = "  ".repeat(depth);
    for (const k of extras.has("text-runs") ? textRuns(kids) : kids) {
      if (k.t === "doctype") continue;
      if (k.t === "text") { sink.push(`${pad}#text`); continue; }
      // ⭐ A client-rendered boundary's opener is written as the boundary it is: its render mode is the bailouts field's.
      if (k.t === "comment") { sink.push(`${pad}<!--${k.data === "$!" ? "$" : N(k.data)}-->`); continue; }
      if (k.tag === "head" || headOwned(k) || isDigestTemplate(k)) continue;
      if (extras.has("stream-scripts") && isInstructionTemplate(k)) continue;
      if (k.tag === "script") {
        const kind = scriptKind(k);
        if (!(extras.has("stream-scripts") && kind !== "inline")) sink.push(`${pad}script [${kind}]`);
        continue;
      }
      sink.push(pad + elementLine(k, N, without));
      if (isMain(k)) {
        sink.push(`${pad}  … ${main ? "(the main field)" : "(collapsed: --main walks it)"}`);
        if (main) walk(k.kids, 0, out.main);
        continue;
      }
      if (isSegment(k)) {
        sink.push(`${pad}  … ${main ? "(the segments field)" : "(collapsed: --main walks it)"}`);
        if (main) { out.segments.push(elementLine(k, N, without)); walk(k.kids, 1, out.segments); }
        continue;
      }
      walk(k.kids, depth + 1, sink);
    }
  };
  walk(root.kids, 0, out.body);
  return out;
}

/** One cell, read into its fields. */
function analyse(cell,{ main = false, extras = new Set(), without = new Set() } = {}) {
  const N = normaliser(extras, without);
  const html = typeof cell.html === "string" ? cell.html : "";
  const status = [cell.error ? `error: ${cell.error}` : `${cell.status}${cell.location ? ` → ${N(cell.location)}` : ""}`];
  const bailouts = bailoutsOf(parse(html));
  const tree = extras.has("resolve-streaming") ? resolveStreaming(parse(html)) : parse(html);
  const { head, preloads } = headOf(tree, N);
  const sk = skeletonOf(tree, { main, extras, N, without });
  return { status, head, preloads, body: sk.body, main: sk.main, segments: sk.segments, bailouts, bytes: html.length };
}

// ── the compare ───────────────────────────────────────────────────────────────────────────────────────────
function diffLines(a = [], b = []) {
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const A = a.slice(p, a.length - s), B = b.slice(p, b.length - s);
  const ops = [];
  if (A.length && B.length && A.length * B.length <= 6_000_000) {
    const m = A.length, n = B.length, W = n + 1;
    const L = new Uint32Array((m + 1) * W);
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) {
      L[i * W + j] = A[i] === B[j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
    }
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (A[i] === B[j]) { i++; j++; } else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) { ops.push(["-", p + i, A[i]]); i++; } else { ops.push(["+", p + j, B[j]]); j++; }
    }
    for (; i < m; i++) ops.push(["-", p + i, A[i]]);
    for (; j < n; j++) ops.push(["+", p + j, B[j]]);
  } else {
    A.forEach((l, i) => ops.push(["-", p + i, l]));
    B.forEach((l, j) => ops.push(["+", p + j, l]));
  }
  return { count: ops.length, ops };
}

const FIELDS = ["status", "head", "preloads", "body", "main", "segments", "bailouts"];
const COUNTS = ["markers", "templates", "digests", "late"];

/** Two cells, field by field. `differs` names every field that moved; `grew` every bail-out count that rose. */
function compareCells(a, b, opts = {}) {
  const fa = analyse(a, opts), fb = analyse(b, opts);
  const fields = {};
  for (const f of ["status", "head", "preloads", "body", ...(opts.main ? ["main", "segments"] : [])]) fields[f] = diffLines(fa[f], fb[f]);
  const bl = diffLines(fa.bailouts.lines, fb.bailouts.lines);
  const grew = [];
  const fell = COUNTS.filter((k) => fb.bailouts.counts[k] < fa.bailouts.counts[k]);
  fields.bailouts = { ...bl, grew, fell, a: fa.bailouts.counts, b: fb.bailouts.counts };
  const differs = Object.keys(fields).filter((f) => fields[f].count > 0 || (fields[f].grew?.length ?? 0) > 0 || (fields[f].fell?.length ?? 0) > 0);
  return { fa, fb, fields, differs, grew };
}

const countsText = (c) => `$! ${c.markers} · bail-out templates ${c.templates} · other digests ${c.digests} · late client renders ${c.late}`;
const clip = (s, n = 200) => (s.length > n ? `${s.slice(0, n)}…` : s);

function loadCapture(file) {
  if (!existsSync(file)) refuse(`${file} does not exist`);
  let cap;
  try { cap = JSON.parse(readFileSync(file, "utf8")); } catch (e) { refuse(`${file} is not a capture (${String(e?.message ?? e).slice(0, 120)})`); }
  if (cap?.kind !== KIND) refuse(`${file} is not a ${KIND} capture (kind ${JSON.stringify(cap?.kind)})`);
  if (cap.version !== VERSION) refuse(`${file} is version ${cap.version}; this tool reads version ${VERSION} — capture again`);
  if (!Array.isArray(cap.cells)) refuse(`${file} carries no cells`);
  return cap;
}

function describe(label, file, cap) {
  const t = cap.tree ?? {};
  console.log(`  ${label}  ${file}`);
  console.log(`      ${cap.takenAt} · ${cap.base} · tree ${t.path ?? "?"} @ ${String(t.head ?? "?").slice(0, 8)}${t.dirty?.length ? ` + ${t.dirty.length} uncommitted served file(s)` : " (clean)"}`);
  console.log(`      rollout ${cap.rollout ?? "?"} · locale ${cap.locale} · viewers ${cap.viewers.join(",")} · routes ${cap.routes.join(",")} · question "${cap.market?.title ?? "(none)"}"`);
}

function runCompare(fa, fb, { main, extras, viewers, routes }) {
  const A = loadCapture(fa), B = loadCapture(fb);
  console.log(`\n[qa:served-skeleton] compare${main ? " --main" : ""} · extras on: ${extras.size ? [...extras].join(", ") : "none"}`);
  describe("a", fa, A);
  describe("b", fb, B);
  if ((A.market?.title ?? null) !== (B.market?.title ?? null)) console.log(`  ⚠ the two captures read different questions on /markets/[id]: "${A.market?.title}" · "${B.market?.title}"`);
  if (A.rollout !== B.rollout) console.log(`  ⚠ the two servers ran different rollouts: ${A.rollout} · ${B.rollout}`);
  const keep = (c) => (!viewers || viewers.includes(c.viewer)) && (!routes || routes.includes(c.name));
  const ka = new Map(A.cells.filter(keep).map((c) => [c.key, c]));
  const kb = new Map(B.cells.filter(keep).map((c) => [c.key, c]));
  const keys = [...new Set([...ka.keys(), ...kb.keys()])];
  if (!keys.length) refuse("no cell matches --viewers / --routes in either capture");
  const tally = Object.fromEntries([...FIELDS, "cell"].map((f) => [f, []]));
  const grewIn = [];
  for (const key of keys) {
    const a = ka.get(key), b = kb.get(key);
    if (!a || !b) { tally.cell.push(key); console.log(`\n✗ ${key} — only in ${a ? "a" : "b"}`); continue; }
    // ⛔ A cell that was not captured is never identical, even to another that failed the same way.
    if (a.error || b.error) { tally.cell.push(key); console.log(`\n✗ ${key} — not captured: a ${a.error ?? "ok"} · b ${b.error ?? "ok"}`); continue; }
    const r = compareCells(a, b, { main, extras });
    const sizes = FIELDS.filter((f) => f !== "bailouts" && r.fa[f]).map((f) => `${f} ${r.fa[f].length}`).join(" · ");
    if (!r.differs.length) {
      console.log(`\n✓ ${key} — identical (${sizes}; ${countsText(r.fa.bailouts.counts)})`);
      continue;
    }
    console.log(`\n✗ ${key} — differs in ${r.differs.join(", ")} (a ${sizes})`);
    for (const f of r.differs) {
      tally[f].push(key);
      const d = r.fields[f];
      if (f === "bailouts") {
        console.log(`    ✗ bailouts  a: ${countsText(d.a)}`);
        console.log(`                b: ${countsText(d.b)}${d.grew.length ? `   ⛔ GREW: ${d.grew.join(", ")}` : ""}${d.fell.length ? `   fell: ${d.fell.join(", ")}` : ""}`);
        if (d.grew.length) grewIn.push(`${key} (${d.grew.join(", ")})`);
      } else console.log(`    ✗ ${f} — ${d.count} line(s)`);
      for (const [sign, at, line] of d.ops.slice(0, 16)) console.log(`        ${sign} ${sign === "-" ? "a" : "b"}:${at + 1}  ${clip(line)}`);
      if (d.ops.length > 16) console.log(`        … ${d.ops.length - 16} more`);
    }
  }
  console.log(`\n── ${keys.length} cell(s) · ${main ? "--main" : "main and segments collapsed"} · extras ${extras.size ? [...extras].join(", ") : "none"}`);
  const moved = [...FIELDS, "cell"].filter((f) => tally[f].length);
  for (const f of moved) console.log(`  ${f.padEnd(9)} differs in ${tally[f].length}: ${tally[f].join(" · ")}`);
  if (grewIn.length) {
    console.log(`\nFAIL — a client-rendered boundary was ADDED (a bail-out count grew), whatever else matches: ${grewIn.join(" · ")}`);
    process.exit(1);
  }
  if (moved.length) { console.log(`\nDIFFERENT — ${moved.join(", ")}. A difference is named or fixed, never re-baselined.`); process.exit(1); }
  console.log(`\nIDENTICAL — ${keys.length} cell(s): status, head, preloads, body${main ? ", main, segments" : ""} and every bail-out count.`);
  process.exit(0);
}

// ── the capture ───────────────────────────────────────────────────────────────────────────────────────────
/**
 * ⭐ A CELL IS ASKED FOR AS A BROWSER LOADS A DOCUMENT. src/proxy.ts:287-290 tells AppShell whether a request is a
 * document load from Sec-Fetch-Mode, and AppShell answers an ended session differently for one (app-shell.tsx:137).
 * Node's fetch always sends `sec-fetch-mode: cors`, whatever its caller sets (measured 2026-10-08), so every request
 * here goes through node:http, which sends exactly these headers and never follows a redirect.
 */
const NAVIGATION = { "sec-fetch-mode": "navigate", "sec-fetch-dest": "document", "sec-fetch-site": "none", "sec-fetch-user": "?1", "upgrade-insecure-requests": "1" };

function absorbCookies(jar, setCookies) {
  for (const sc of setCookies) {
    const [pair, ...attrs] = sc.split(";");
    const eq = pair.indexOf("=");
    if (eq < 1) continue;
    const name = pair.slice(0, eq).trim(), value = pair.slice(eq + 1).trim();
    const gone = attrs.some((a) => /^\s*max-age\s*=\s*(0|-\d+)\s*$/i.test(a))
      || attrs.some((a) => { const m = /^\s*expires\s*=(.*)$/i.exec(a); return m && Date.parse(m[1]) < Date.now(); });
    if (gone) jar.delete(name); else jar.set(name, value);
  }
}

/** One request: the jar's cookies out, its Set-Cookies back in; a redirect is answered, never followed. */
function hit(base, path, jar, { method = "GET", headers = {}, body = null, doc = false } = {}) {
  return new Promise((done, fail) => {
    const t0 = performance.now();
    const h = {
      "user-agent": UA,
      accept: doc ? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" : "*/*",
      "accept-language": jar.get("kp-locale") === "sw" ? "sw" : "en",
      ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
      ...(doc ? NAVIGATION : {}),
      ...headers,
      ...(body != null ? { "content-length": String(Buffer.byteLength(body)) } : {}),
    };
    const req = httpRequest(new URL(path, base), { method, headers: h, timeout: TIMEOUT_MS }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("error", fail);
      res.on("end", () => {
        absorbCookies(jar, res.headers["set-cookie"] ?? []);
        done({ status: res.statusCode, location: res.headers.location ?? null, text: Buffer.concat(chunks).toString("utf8"), ms: Math.round(performance.now() - t0) });
      });
    });
    req.on("timeout", () => req.destroy(new Error(`${method} ${path}: no answer within ${TIMEOUT_MS / 1000} s`)));
    req.on("error", fail);
    if (body != null) req.write(body);
    req.end();
  });
}

function gitTree() {
  const path = process.env.KP_TREE ?? resolve(dirname(SELF), "..");
  const git = (...args) => spawnSync("git", ["--no-optional-locks", "-C", path, ...args], { encoding: "utf8" });
  const head = git("rev-parse", "HEAD");
  const dirty = git("status", "--porcelain", "--", ...SERVED);
  return {
    path,
    head: head.status === 0 ? head.stdout.trim() : null,
    dirty: dirty.status === 0 ? dirty.stdout.split(/\r?\n/).filter(Boolean) : null,
  };
}

async function runCapture(file, { base, viewers, routes, locale }) {
  const out = resolve(file);
  if (existsSync(out)) refuse(`${out} exists — a capture is written once; name a new file`);
  if (!existsSync(dirname(out))) refuse(`${dirname(out)} does not exist`);
  const health = await hit(base, "/api/health", new Map()).then((r) => JSON.parse(r.text)).catch(() => null);
  if (!health) refuse(`no server answered at ${base}/api/health — start a fresh in-memory dev server (no DATABASE_URL)`);
  if (health.database?.configured !== false) refuse(`the server at ${base} reports a configured database (database.configured=${JSON.stringify(health.database?.configured)}) — this capture seeds questions, so it runs only against an in-memory dev server`);
  const rollout = health.simpleJourney?.state ?? null;
  if (rollout === "ACTIVE") refuse(`/api/health says simpleJourney.state = "ACTIVE": nobody would be served the classic pages`);
  if (viewers.includes("journey") && rollout !== "STAFF_PREVIEW") refuse(`the journey viewer needs the rollout at STAFF_PREVIEW (a pass shows nothing at ${JSON.stringify(rollout)})`);

  console.log(`\n[qa:served-skeleton] capture · ${base} · rollout ${rollout} · locale ${locale} · viewers ${viewers.join(",")} · routes ${routes.join(",")}`);
  const seedJar = new Map([["kp-locale", locale]]);
  const seeded = await hit(base, "/api/dev-test/seed-real-markets", seedJar, { method: "POST", body: "" });
  let seed = null;
  try { seed = JSON.parse(seeded.text); } catch { /* reported below */ }
  if (seeded.status !== 200 || !seed?.ok) refuse(`/api/dev-test/seed-real-markets answered ${seeded.status} — a stale .next 404s every dev-test route: rm -rf .next and restart`);
  const live = Array.isArray(seed.live) ? seed.live : [];
  const market = live.find((m) => m.title === MARKET_TITLE) ?? null;
  console.log(`  seed-real-markets: ${seed.created} created · ${live.length} live · the question page reads ${market ? `"${market.title}"` : "(none: its cells record the error)"}`);

  const jars = {};
  const signIn = async () => {
    const jar = new Map([["kp-locale", locale]]);
    const r = await hit(base, "/auth/demo", jar, { doc: true });
    if (r.status >= 400 || !jar.has("kp_session")) refuse(`/auth/demo answered ${r.status} and set ${jar.has("kp_session") ? "" : "no "}kp_session`);
    return jar;
  };
  const cells = [];
  for (const viewer of viewers) {
    if (viewer === "guest") jars.guest = new Map([["kp-locale", locale]]);
    if (viewer === "player") jars.player = await signIn();
    if (viewer === "journey") {
      const jar = jars.player ? new Map(jars.player) : await signIn();
      const officer = new Map([["kp-locale", locale]]);
      const s = await hit(base, "/api/dev-test/seed-admin", officer, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(OFFICER) });
      if (s.status !== 200 || !officer.has("kp_session")) refuse(`/api/dev-test/seed-admin answered ${s.status} and set ${officer.has("kp_session") ? "" : "no "}kp_session`);
      // The form on /admin/journey, submitted: a same-origin navigation (previewOnDoor refuses any other Sec-Fetch-Site).
      const p = await hit(base, "/preview", officer, {
        method: "POST", doc: true, body: "intent=on",
        headers: { "content-type": "application/x-www-form-urlencoded", "sec-fetch-site": "same-origin", origin: base, referer: `${base}/admin/journey` },
      });
      if (!officer.get("kp_preview")) refuse(`POST /preview intent=on answered ${p.status} → ${p.location} with no kp_preview — is the server running with DISABLE_ADMIN_TOTP=true?`);
      jar.set("kp_preview", officer.get("kp_preview"));
      jars.journey = jar;
      console.log(`  journey viewer: the demo player holding a staff preview pass (minted by ${OFFICER.phone}, ${OFFICER.role})`);
    }
    for (const name of routes) {
      const route = ROUTES.find((r) => r.name === name);
      const key = `${viewer}|${locale}|${route.path}`;
      const cell = { key, viewer, locale, name, route: route.path };
      if (name === "market" && !market) { cells.push({ ...cell, error: `no live question titled "${MARKET_TITLE}"` }); console.log(`  ✗ ${key} — no question`); continue; }
      const path = name === "market" ? `/markets/${market.id}` : route.path;
      try {
        const cold = await hit(base, path, jars[viewer], { doc: true });
        const warm = await hit(base, path, jars[viewer], { doc: true });
        const counts = bailoutsOf(parse(warm.text)).counts;
        cells.push({ ...cell, path, first: { status: cold.status, ms: cold.ms, bytes: cold.text.length }, status: warm.status, location: warm.location, ms: warm.ms, counts, html: warm.text });
        console.log(`  ✓ ${key.padEnd(30)} ${cold.status} → ${warm.status}${warm.location ? ` → ${normaliser(new Set(), new Set())(warm.location)}` : ""} · cold ${(cold.ms / 1000).toFixed(1)} s, warm ${(warm.ms / 1000).toFixed(1)} s · ${Math.round(warm.text.length / 1024)} KB · ${countsText(counts)}`);
      } catch (e) {
        cells.push({ ...cell, path, error: String(e?.message ?? e).slice(0, 200) });
        console.log(`  ✗ ${key} — ${String(e?.message ?? e).slice(0, 200)}`);
      }
    }
  }
  const capture = {
    kind: KIND, version: VERSION, takenAt: new Date().toISOString(), base, tree: gitTree(), rollout, locale, viewers, routes, ua: UA, navigation: NAVIGATION,
    market: market ? { title: market.title, id: market.id } : null, cells,
  };
  writeFileSync(out, JSON.stringify(capture));
  const failed = cells.filter((c) => c.error).length;
  console.log(`\nWROTE ${out} — ${cells.length} cell(s)${failed ? `, ${failed} with an error (a compare reports them in status)` : ""} · tree ${String(capture.tree.head).slice(0, 8)}${capture.tree.dirty?.length ? ` + ${capture.tree.dirty.length} uncommitted served file(s)` : ""}`);
  process.exit(0);
}

// ── the control ───────────────────────────────────────────────────────────────────────────────────────────
/** A synthetic document in the shape `next dev` serves: a shell, a streamed page boundary inside main, a lazy boundary, a bail-out. */
function synth(v, { inline = false } = {}) {
  const board = `<section class="kp-board" data-testid="board"><h2 class="kp-board-title">Live</h2><a class="kp-card" data-testid="card-mkt_${v.mkt}" href="/markets/mkt_${v.mkt}"><span class="kp-time">${v.time}</span></a></section>`;
  const boundary = inline ? `<!--$-->${board}<!--/$-->` : `<!--$?--><template id="B:${v.bnd}"></template><div class="kp-loading" role="status">Loading<!-- -->…</div><!--/$-->`;
  const segment = inline ? "" : `<div hidden id="S:${v.seg}">${board}</div><script>$RB=[];$RC=function(a,b){};$RC("B:${v.bnd}","S:${v.seg}")</script>`;
  // React writes its shell-time script only while a boundary is pending at the shell's flush.
  const shellTime = inline ? "" : `<script id="_R_">requestAnimationFrame(function(){$RT=performance.now()});</script>`;
  const html = [
    `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>`,
    `<link rel="stylesheet" href="/_next/static/chunks/%5Broot-of-the-server%5D__${v.hash}._.css?v=${v.ts}" data-precedence="next_static/chunks/[root-of-the-server]__${v.hash}._.css"/>`,
    `<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/src_components_layout_shell-lazy_tsx_${v.hash}._.js?dpl=${v.dpl}"/>`,
    `<script src="/_next/static/chunks/main-app-${v.hash16}.js?dpl=${v.dpl}" async=""></script>`,
    `<link rel="expect" href="#${v.rid}" blocking="render"/><title>50pick</title><meta name="description" content="Pick what happens next"/>`,
    `<meta property="og:url" content="https://www.50pick.tz/"/><meta property="og:image" content="http://localhost:${v.port}/og/og-1200x630.png"/>`,
    `<link rel="canonical" href="https://www.50pick.tz/"/></head><body class="font-sans antialiased"><div hidden=""><!--$--><!--/$--></div>`,
    `<header class="app-topbar" id="${v.rid}"><a href="/" class="brand">50pick</a><span class="crest-holder"><svg viewBox="0 0 100 100" aria-hidden="true"><defs>`,
    `<radialGradient id="${v.avatar}"><stop offset="0%"></stop></radialGradient><clipPath id="${v.avatar}c"><circle cx="50" cy="50" r="49"></circle></clipPath>`,
    `</defs><text x="50" y="60">DP</text></svg></span></header>`,
    `<main id="main-content" class="flex-1"><div class="kp-page-intro" data-testid="page-intro"><h1 class="kp-title">Markets</h1></div>${boundary}</main>${shellTime}`,
    `<footer class="kp-footer">© 50pick</footer><!--$--><div data-testid="lazy-overlays-host" class="kp-lazy"></div><!--/$-->`,
    `<!--$!--><template data-dgst="${BAILOUT}" data-msg="Switched to client rendering because the server rendering errored:"></template><!--/$-->`,
    `<script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"0:[]"])</script>`,
    segment,
    `</body></html>`,
  ].join("");
  return { key: "guest|en|/", viewer: "guest", locale: "en", name: "home", route: "/", path: "/", status: 200, location: null, html };
}

function selfTest() {
  const rows = [];
  const ok = (field, name, cond, detail = "") => rows.push({ field, name, ok: !!cond, detail });
  const NA = { hash: "0a1b2c3d", hash16: "0a1b2c3d4e5f6071", dpl: "dpl_A1", ts: "1700000000001", rid: "_R_1a_", avatar: "cm1x9k2", seg: "0", bnd: "0", port: "3041", mkt: "ab12cd34ef", time: "5<!-- --> min" };
  const NB = { ...NA, hash: "9f8e7d6c", hash16: "9f8e7d6c5b4a3921", dpl: "dpl_B2", ts: "1700000099999", rid: "_R_9z_", avatar: "cmq4w2e", seg: "3", bnd: "2", port: "3042" };
  const A = synth(NA), B = synth(NB);
  const ALL = new Set(Object.keys(EXTRAS));
  const MODES = [
    { id: "default", main: false, extras: new Set() },
    { id: "--main", main: true, extras: new Set() },
    { id: "default + every extra", main: false, extras: ALL },
    { id: "--main + every extra", main: true, extras: ALL },
  ];
  const fieldsOf = (a, b, o) => compareCells(a, b, o).differs.slice().sort().join(",") || "(none)";
  const plant = (doc, from, to) => {
    if (!doc.html.includes(from)) return null;
    return { ...doc, html: doc.html.replace(from, to) };
  };

  // P0 · the parser reads what React writes, and the base document reads as built.
  {
    const t = analyse({ status: 200, html: `<DIV CLASS="a>b"><script>if(a<b)x="</div>"</script><br/><img src="x"><p>t</p></DIV>` });
    const want = [`div class="a>b"`, "  script [inline]", "  br", "  img", "  p", "    #text"].join(NL);
    ok("parser", "P0.1 a quoted '>', a script holding '</div>', void and self-closed tags, upper case", t.body.join(NL) === want, t.body.join(" | "));
    const a = analyse(A, { main: true });
    ok("parser", "P0.2 the base document's bail-outs are counted: one <!--$!-->, one bail-out template, nothing else",
      COUNTS.every((k) => a.bailouts.counts[k] === { markers: 1, templates: 1, digests: 0, late: 0 }[k]), countsText(a.bailouts.counts));
    ok("parser", "P0.3 head holds og:url, preloads hold exactly the one script preload, body holds main, main and segments are walked",
      a.head.some((l) => l.includes('property="og:url"')) && a.preloads.length === 1 && a.body.some((l) => l.trim() === 'main id="main-content" class="flex-1"')
      && a.main.length > 0 && a.segments.length > 0, `head ${a.head.length} · preloads ${a.preloads.length} · main ${a.main.length} · segments ${a.segments.length}`);
    const d = analyse(A);
    ok("parser", "P0.4 without --main, main and the segment are collapsed and their fields absent",
      d.main === null && d.segments === null && d.body.filter((l) => l.includes("(collapsed: --main walks it)")).length === 2);
  }

  // N · a twin carrying every kind of server noise compares clean, and each normalisation is what absorbs its own.
  for (const m of MODES) ok("null", `N.1 the noisy twin compares clean · ${m.id}`, fieldsOf(A, B, m) === "(none)", fieldsOf(A, B, m));
  ok("null", "N.2 two inline twins compare clean · --main", fieldsOf(synth(NA, { inline: true }), synth(NB, { inline: true }), { main: true }) === "(none)");
  {
    // ?v= is Next's dev cache-buster only on a /_next/static/ asset; anywhere else it is the product's own query.
    const feed = (n) => ({ ...A, html: A.html.replace("</head>", `<link rel="alternate" href="/feed.xml?v=${n}"/></head>`) });
    ok("null", "N.4 a ?v= outside /_next/static/ is never normalised", fieldsOf(feed(1), feed(2), { main: true }) === "head", fieldsOf(feed(1), feed(2), { main: true }));
  }
  for (const name of [...BASE_NORMS.map(([n]) => n), ...ID_NORMS]) {
    const f = fieldsOf(A, B, { main: true, without: new Set([name]) });
    ok("null", `N.3 with "${name}" off, the twin differs (so it is what absorbs that noise)`, f !== "(none)", f);
  }

  // P · each plant is reported in its own field and nowhere else.
  const P = [
    ["P1 a dropped <!--$-->", (d) => plant(d, `<!--$--><div data-testid="lazy-overlays-host"`, `<div data-testid="lazy-overlays-host"`), ["body", "body", "body", "body"]],
    ["P2 a boundary turned into <!--$!--> (a new bail-out)", (d) => plant(d, `<!--$--><div data-testid="lazy-overlays-host"`, `<!--$!--><div data-testid="lazy-overlays-host"`), ["bailouts", "bailouts", "bailouts", "bailouts"], "markers"],
    ["P3 a new <template data-dgst=BAILOUT…>", (d) => plant(d, `class="kp-lazy"></div>`, `class="kp-lazy"></div><template data-dgst="${BAILOUT}"></template>`), ["bailouts", "bailouts", "bailouts", "bailouts"], "templates"],
    ["P4 an extra body element", (d) => plant(d, `<footer class="kp-footer">`, `<div class="kp-extra"></div><footer class="kp-footer">`), ["body", "body", "body", "body"]],
    ["P5 a class changed inside main", (d) => plant(d, `class="kp-page-intro"`, `class="kp-page-intro kp-moved"`), ["(none)", "main", "(none)", "main"]],
    ["P6 a class changed inside a streamed segment", (d) => plant(d, `class="kp-board"`, `class="kp-board kp-moved"`), ["(none)", "segments", "(none)", "main"]],
    ["P7 a dropped og:url meta", (d) => plant(d, `<meta property="og:url" content="https://www.50pick.tz/"/>`, ""), ["head", "head", "head", "head"]],
    ["P8 an added head preload", (d) => plant(d, "</head>", `<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/src_components_journey_card_tsx_${NB.hash}._.js?dpl=${NB.dpl}"/></head>`), ["preloads", "preloads", "preloads", "preloads"]],
    ["P9 a changed status", (d) => ({ ...d, status: 500 }), ["status", "status", "status", "status"]],
    // Under resolve-streaming a late client render also leaves its segment where it was streamed: that is the splice's report, not a leak.
    ["P10 a late client render ($RC → $RX)", (d) => plant(d, `$RC("B:${NB.bnd}","S:${NB.seg}")`, `$RX("B:${NB.bnd}","${BAILOUT}")`), ["bailouts", "bailouts", "bailouts,body", "bailouts,body,main,segments"], "late"],
    ["P11 a server-error digest template", (d) => plant(d, `class="kp-lazy"></div>`, `class="kp-lazy"></div><template data-dgst="2389451097"></template>`), ["bailouts", "bailouts", "bailouts", "bailouts"], "digests"],
  ];
  for (const [name, fn, want, grows] of P) {
    const planted = fn(B);
    if (!planted) { ok("plants", `${name} — the plant's anchor is missing from the synthetic document`, false); continue; }
    MODES.forEach((m, i) => {
      const r = compareCells(A, planted, m);
      const got = r.differs.slice().sort().join(",") || "(none)";
      ok("plants", `${name} · ${m.id} → ${want[i]}`, got === want[i] && (!grows || r.grew.includes(grows)) && (grows || !r.grew.length),
        `got ${got}${r.grew.length ? ` · grew ${r.grew.join(",")}` : ""}`);
    });
    if (grows) {
      const c0 = analyse(planted).bailouts.counts, c1 = analyse(planted, { main: true, extras: ALL }).bailouts.counts;
      ok("plants", `${name} · its counts are the same with every extra on`, COUNTS.every((k) => c0[k] === c1[k]), `${countsText(c0)} | ${countsText(c1)}`);
    }
  }

  // E · each extra absorbs its own noise when on, and nothing absorbs it when off.
  const E = [
    ["store-ids", synth({ ...NB, mkt: "ff99ee88dd" }), "segments", ["store-ids"]],
    ["text-runs", synth({ ...NB, time: "1<!-- -->h <!-- -->3<!-- --> min" }), "segments", ["text-runs"]],
    ["resolve-streaming", synth(NB, { inline: true }), "body,main,segments", ["resolve-streaming", "stream-scripts"]],
    ["stream-scripts", { ...B, html: B.html.replace("</body>", `<script>self.__next_f.push([1,"1:[]"])</script></body>`) }, "body", ["stream-scripts"]],
  ];
  for (const [name, twin, off, on] of E) {
    ok("extras", `E ${name} · off → ${off}`, fieldsOf(A, twin, { main: true }) === off, fieldsOf(A, twin, { main: true }));
    ok("extras", `E ${name} · on (${on.join(" + ")}) → (none)`, fieldsOf(A, twin, { main: true, extras: new Set(on) }) === "(none)", fieldsOf(A, twin, { main: true, extras: new Set(on) }));
  }

  // B · the BASEs a capture accepts and refuses.
  const accepts = ["http://localhost:3041", "http://127.0.0.1:3041", "http://[::1]:3041", "http://localhost:3041/", "http://localhost"];
  const refuses = ["https://www.50pick.tz", "https://50pick.tz", "http://50pick.tz", "http://localhost.evil.test:3041", "http://localhost@evil.test",
    "http://10.0.0.5:3041", "https://localhost:3041", "http://localhost:3041/markets", "http://localhost:3041?x=1", "localhost:3041", "", "http://LOCALHOST:3041"];
  ok("base", "B.1 every local origin is accepted", accepts.every((u) => localBase(u)), accepts.filter((u) => !localBase(u)).join(" "));
  ok("base", "B.2 everything else is refused, production first", refuses.every((u) => !localBase(u)), refuses.filter((u) => localBase(u)).join(" "));

  // H · the header lists every extra.
  {
    const src = readFileSync(SELF, "utf8");
    const header = src.slice(0, src.indexOf("*/"));
    const missing = Object.keys(EXTRAS).filter((x) => !new RegExp(`\\*\\s+· ${x.replace(/[-]/g, "\\-")}\\s`).test(header));
    ok("header", "H.1 the file's header lists every extra", missing.length === 0, missing.join(", "));
  }
  return rows;
}

function runSelfTest({ quiet }) {
  const rows = selfTest();
  const bad = rows.filter((r) => !r.ok);
  if (!quiet) {
    console.log("\n[qa:served-skeleton] --self-test — plants on synthetic documents, each held to its own field\n");
    let field = "";
    for (const r of rows) {
      if (r.field !== field) { field = r.field; console.log(`  ── ${field}`); }
      console.log(`  ${r.ok ? "✓" : "✗"} ${r.name}${r.detail && !r.ok ? `  — ${r.detail}` : ""}`);
    }
    console.log(`\n${bad.length ? "FAIL" : "PASS"} — self-test: ${rows.length - bad.length} of ${rows.length}`);
  }
  return bad;
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────────────────
{
  const A = parseArgs(process.argv.slice(2));
  if (A.help) { console.log(USAGE); process.exit(0); }
  const modes = [A["self-test"], A.capture, A.compare].filter(Boolean).length;
  const bad = A.unknown.length || A.missing.length || modes > 1
    || ((A.main || A.norm) && !A.compare) || ((A.locale || A.base) && !A.capture) || ((A.viewers || A.routes) && !A.capture && !A.compare);
  if (bad) {
    console.error(`${USAGE}${A.unknown.length ? `${NL}  (unknown: ${A.unknown.join(" ")})` : ""}${A.missing.length ? `${NL}  (needs a value: ${A.missing.join(" ")})` : ""}`);
    process.exit(2);
  }
  const viewers = listOf(A.viewers, VIEWERS, "--viewers");
  const routes = listOf(A.routes, ROUTES.map((r) => r.name), "--routes");
  const extras = new Set(listOf(A.norm, Object.keys(EXTRAS), "--norm") ?? []);
  if (A.capture) {
    const base = localBase(A.base ?? process.env.KP_BASE ?? "http://localhost:3041");
    if (!base) refuse(`local servers only, addressed as http://localhost:PORT, http://127.0.0.1:PORT or http://[::1]:PORT — got ${JSON.stringify(A.base ?? process.env.KP_BASE)}`);
    const locale = A.locale ?? "en";
    if (!LOCALES.includes(locale)) refuse(`--locale ${JSON.stringify(locale)} is not one of ${LOCALES.join(", ")}`);
    const failed = runSelfTest({ quiet: true });
    if (failed.length) refuse(`the self-test fails (${failed.map((r) => r.name).join("; ")}) — run --self-test`);
    await runCapture(A.capture, {
      base, locale,
      viewers: VIEWERS.filter((v) => (viewers ?? DEFAULT_VIEWERS).includes(v)),
      routes: ROUTES.map((r) => r.name).filter((r) => (routes ?? ROUTES.map((x) => x.name)).includes(r)),
    });
  } else if (A.compare) {
    const failed = runSelfTest({ quiet: true });
    if (failed.length) refuse(`the self-test fails (${failed.map((r) => r.name).join("; ")}), so no verdict can be read — run --self-test`);
    runCompare(A.compare[0], A.compare[1], { main: !!A.main, extras, viewers, routes });
  } else {
    process.exit(runSelfTest({ quiet: false }).length ? 1 : 0);
  }
}
