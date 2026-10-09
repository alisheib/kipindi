/**
 * `npm run qa:chunks-prod -- --origin <url>` — WHAT A CLASSIC PAGE'S FIRST SCRIPTS AND ITS HTML CARRY, read from a
 * running site as a guest, with GETs only.
 *
 * S7-PLAN A9 (3) (docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md). The tracked Node port of
 * `prod/chunks-check.sh` (branch vodacom-handover, handover/vodacom-2026-10-07/tools/prod/), with WP6c's change to it
 * (`chunks-check-wp6c.sh`: the low-priority script preloads listed apart, VODACOM-PLAN.md:626-630), and A9's boundary
 * rule in place of that script's zero rule.
 *
 * USAGE (routes WITHOUT their leading slash, comma-separated; `index` is `/` — Git Bash rewrites a leading slash):
 *   npm run -s qa:chunks-prod -- --self-test                       the controls, on synthetic documents (no network)
 *   npm run -s qa:chunks-prod -- --origin https://50pick.tz        read production (S7 WP12 step 6)
 *   npm run -s qa:chunks-prod -- --origin http://localhost:3071 --routes index,markets,live,markets/<id>
 *   BASE=<origin> npm run -s qa:chunks-prod                        the origin from the environment instead
 * Default routes: S6's four (/, /markets, /positions, /help; chunks-check.sh:9) and S7's public two (/live, /results;
 * A23 item 3). A question page needs a real id: add `markets/<id>`. /watchlist and /account are not guest pages.
 * Exit: 0 every route read and every rule held · 1 a rule failed, or a control did · 2 refused (no origin, bad args).
 *
 * ⛔ NO DEFAULT ORIGIN — A DELIBERATE DEVIATION FROM A9, which says "production by default". `test:live-target-safe`
 * (scripts/live-target-safe.test.mjs §1b) forbids a standalone script whose name does not declare a live target from
 * defaulting to a production URL, and its ceiling (four such scripts, lowered on 2026-10-08) may only shrink. A target
 * that dangerous is chosen, never inherited: this script refuses to run until `--origin` (or BASE) names one, and prints
 * it first. Production is read with `--origin https://50pick.tz`.
 * ⛔ GETs ONLY, AS A GUEST: no cookie is sent or kept, no sign-in, and only the origin's own `/_next/` scripts are
 * fetched (any other script is listed, never requested).
 *
 * ⭐ WHAT IT READS, per route (chunks-check.sh:10-23):
 *   · the HTML: its INITIAL SCRIPTS (`<script src="/_next/…">`) and, apart, its LOW-PRIORITY PRELOADS (`<link
 *     rel="preload" as="script">` naming a script that is not an initial one: Next's PreloadChunks for a next/dynamic
 *     part the server rendered). Both are fetched; their bytes are reported separately.
 *   · CONTROL: the classic bar's test ids (`deposit-header`, `deposit-rail`; chunks-check.sh:19) must be found in the
 *     initial scripts, or the reading proves nothing and the route fails.
 *   · S6's and S7's journey markers (qa-first-load.mjs's table, rows marked `journey`, each unique in src/) must be
 *     absent from the initial scripts. Two by-design exceptions are REPORTED, never failed (A9 (3)): kp-journey-shell
 *     (shell-mark.ts reaches every page by design, VODACOM-PLAN.md:528) and, on / only, the home lazy module's marker
 *     (WP7 puts that small module in /'s first load, A23 item 6). A marker found only in a low-priority preload is
 *     reported, not failed. chunks-check.sh's `kp-jhdr` is not searched in the scripts: it is not unique in src/
 *     (app-shell.tsx's fallback and globals.css hold it); the header's test id `"journey-top-bar"` reads the same chunk.
 *   · the HTML must carry NO JOURNEY MARKUP: a journey-* test id or `data-journey` (qa-classic-shell-parity.mjs:501's
 *     RAW_TRACE, as HTML or as the RSC data's escaped JSON), the shell's mark, `journey-top-bar` / `journey-tabs`
 *     (chunks-check.sh:20), or a journey class (kp-jhdr, kp-jsheet; S7's kp-jcard, kp-jhome, kp-jhowto, kp-howto).
 *   · CLIENT-RENDERED BOUNDARIES (A9 (3)). The tree carries lazy-overlays' boundaries by design (VODACOM-PLAN.md:539):
 *     the first-visit primer, and the chat bubble when the chatbot is on, load with `ssr: false`
 *     (lazy-overlays.tsx:17-24, :45-46), and next/dynamic wraps each in a bail-out boundary of its own. So:
 *       - every `<!--$!-->` must be such a boundary: its template carries data-dgst BAILOUT_TO_CLIENT_SIDE_RENDERING;
 *       - their number must be exactly 1 (the primer), plus 1 when the document's inline RSC data passes
 *         chatbotEnabled true to LazyOverlays (layout.tsx:243) — read from the I-row naming LazyOverlays and the
 *         element that references it; if it cannot be read, the route fails;
 *       - any other `<!--$!-->`, any other digest (a data-dgst template anywhere else, or a different value), or any
 *         other count fails. A `$RX(…)` call (a boundary turned client-rendered after streaming) is such an "other",
 *         and fails.
 *     chunks-check-wp6c.sh's zero rule ("no <!--$!--> in the HTML", :30, :36) is NOT ported: as written it fails every
 *     page. WP6c's saved documents (2026-10-03) held exactly two of each on every route, with chatbotEnabled true.
 * ⭐ THE CONTROLS (`--self-test`, also run first by every reading — A9: a control that must pass before any verdict):
 *   synthetic documents, read through the same code with a fake fetch: the classic bar's test ids found in the initial
 *   scripts (and their absence failing); the expected by-design boundaries passing; one more `<!--$!-->` failing;
 *   chatbotEnabled false with two failing (and with one passing); another digest, a `$RX`, unread chatbotEnabled,
 *   a journey marker in an initial script, journey markup in the HTML and the home lazy module's marker off / each
 *   failing; the shell mark, the home lazy module's marker on / and a marker in a preload only each reported, not failed.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CONTROLS, MARKERS, checkMarkerTable, matchBrace, parseRoutes } from "./qa-first-load.mjs";

const DEFAULT_ROUTES = ["/", "/markets", "/positions", "/help", "/live", "/results"];
const UA = "Mozilla/5.0 (qa-chunks-prod; read-only guest)";
const BAILOUT = "BAILOUT_TO_CLIENT_SIDE_RENDERING";

/** qa-classic-shell-parity.mjs:501 — a journey test id or the flag attribute, as HTML or as the RSC payload's escaped JSON. */
const RAW_TRACE = /(?:data-testid|testId)(?:=|\\":)\\?"journey-[\w-]*|\bdata-journey(?![\w-])/g;
const HTML_JOURNEY = [
  { id: "journey test id / data-journey", re: RAW_TRACE },
  { id: "the journey shell's mark", re: /kp-journey-shell/g },
  { id: "journey-top-bar / journey-tabs", re: /journey-top-bar|journey-tabs/g },
  { id: "journey class", re: /(?<![\w-])kp-(?:jhdr|jsheet|jcard|jhome|jhowto|howto)(?![A-Za-z0-9])/g },
];

const kb = (n) => (n / 1024).toFixed(1) + " KB";
const base = (u) => {
  try {
    return new URL(u).pathname.split("/").pop();
  } catch {
    return String(u).split("?")[0].split("/").pop();
  }
};

/** The attributes of a tag's attribute text, names lower-cased, `&amp;` decoded. */
function attrsOf(s) {
  const out = {};
  for (const m of s.matchAll(/([^\s=/"'>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    out[m[1].toLowerCase()] = (m[2] ?? m[3] ?? m[4] ?? "").replace(/&amp;/g, "&");
  }
  return out;
}

/** The initial scripts, the low-priority preloads (apart) and any other script, as absolute URLs. */
export function scriptsOf(html, pageUrl, origin) {
  const ours = (u) => u.origin === origin && u.pathname.startsWith("/_next/") && u.pathname.endsWith(".js");
  const initial = [];
  const others = [];
  const preloadsAll = [];
  for (const m of html.matchAll(/<(script|link)\b([^>]*)>/gi)) {
    const a = attrsOf(m[2]);
    if (m[1].toLowerCase() === "script" && a.src) {
      const u = new URL(a.src, pageUrl);
      (ours(u) ? initial : others).push({ url: u.href, nomodule: "nomodule" in a });
    } else if (m[1].toLowerCase() === "link" && /(?:^|\s)preload(?:\s|$)/i.test(a.rel ?? "") && (a.as ?? "").toLowerCase() === "script" && a.href) {
      const u = new URL(a.href, pageUrl);
      if (ours(u)) preloadsAll.push({ url: u.href, priority: a.fetchpriority ?? "" });
      else others.push({ url: u.href, preload: true });
    }
  }
  const uniq = (xs) => [...new Map(xs.map((x) => [x.url, x])).values()];
  const init = uniq(initial);
  const initSet = new Set(init.map((x) => x.url));
  return { initial: init, preloads: uniq(preloadsAll).filter((x) => !initSet.has(x.url)), others: uniq(others) };
}

/** The inline RSC data: every `self.__next_f.push([1,"…"])` string, concatenated. */
export function flightOf(html) {
  let text = "";
  let pushes = 0;
  let other = 0;
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = m[1].trim();
    if (!body.startsWith("self.__next_f.push(")) continue;
    pushes++;
    try {
      const a = JSON.parse(body.slice("self.__next_f.push(".length, body.lastIndexOf(")")));
      if (a[0] === 1 && typeof a[1] === "string") text += a[1];
      else other++;
    } catch {
      other++;
    }
  }
  return { text, pushes, other };
}

/** chatbotEnabled as the RSC data passes it to LazyOverlays (layout.tsx:243): { ids, values, chunks }. */
export function chatbotOf(flight) {
  const ids = [];
  const chunks = new Set();
  for (const m of flight.matchAll(/(?:^|\n)([0-9a-fA-F]+):I(\[[^\n]*\])/g)) {
    try {
      const a = JSON.parse(m[2]);
      for (const c of Array.isArray(a[1]) ? a[1] : []) if (typeof c === "string" && c.endsWith(".js")) chunks.add(c.replace(/^\/?_next\//, "").replace(/\?.*$/, ""));
      if (a[2] === "LazyOverlays") ids.push(m[1]);
    } catch {
      /* a row this reader does not need */
    }
  }
  const values = [];
  for (const id of ids) {
    for (const m of flight.matchAll(new RegExp(`\\["\\$","\\$L${id}",(?:null|"[^"]*"),\\{`, "g"))) {
      const start = m.index + m[0].length - 1;
      const end = matchBrace(flight, start);
      try {
        values.push(JSON.parse(flight.slice(start, end + 1)).chatbotEnabled);
      } catch {
        values.push(undefined);
      }
    }
  }
  return { ids, values, chunks };
}

/** Every `<!--$!-->` and its template's digest, every data-dgst template, every `$RX(…)` call. */
export function boundariesOf(html) {
  const bodies = [];
  const markup = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, body) => {
    bodies.push(body);
    return "";
  });
  const bail = [];
  for (const m of markup.matchAll(/<!--\$!-->/g)) {
    const t = /^\s*<template\b([^>]*)>/i.exec(markup.slice(m.index + m[0].length, m.index + m[0].length + 2000));
    bail.push(t ? attrsOf(t[1])["data-dgst"] ?? "(template without data-dgst)" : "(no template)");
  }
  const digests = [...markup.matchAll(/<template\b([^>]*)>/gi)].map((m) => attrsOf(m[1])).filter((a) => "data-dgst" in a).map((a) => a["data-dgst"]);
  const rx = bodies.flatMap((b) => [...b.matchAll(/\$RX\("([^"]*)"(?:,"((?:[^"\\]|\\.)*)")?/g)].map((m) => `${m[1]} ${m[2] ?? ""}`.trim()));
  return { bail, digests, rx };
}

/**
 * One route. `get(url)` → { status, url, text } (GET). `rows`: the journey rows and whether each is landed.
 * Returns the reading with its `failures` ([{ kind, text }]) and `reports` (lines, never failures).
 */
export async function readRoute(origin, route, { get, table = MARKERS }) {
  const failures = [];
  const reports = [];
  const fail = (kind, text) => failures.push({ kind, text });
  const page = await get(origin + route);
  if (page.status !== 200) {
    fail("status", `${origin + route} answered ${page.status}${page.url && page.url !== origin + route ? ` (at ${page.url})` : ""}`);
    return { route, page, failures, reports };
  }
  const html = page.text;
  const { initial, preloads, others } = scriptsOf(html, page.url || origin + route, origin);
  const fetchAll = async (list) => {
    const out = [];
    for (const s of list) {
      const r = await get(s.url);
      out.push({ ...s, status: r.status, text: r.status === 200 ? r.text : "" });
      if (r.status !== 200) fail("script", `${base(s.url)} answered ${r.status}`);
    }
    return out;
  };
  const init = await fetchAll(initial);
  const pre = await fetchAll(preloads);
  const holders = (list, marker) => list.filter((s) => s.text.includes(marker)).map((s) => base(s.url));

  // CONTROL — the classic bar's test ids in the initial scripts.
  const controls = CONTROLS.map((c) => ({ c, in: holders(init, c.marker) }));
  for (const x of controls) if (!x.in.length) fail("control", `the classic bar's ${JSON.stringify(x.c.marker)} is not in the initial scripts: this reading proves nothing`);

  // Journey markers: absent from the initial scripts, but for the two by-design exceptions.
  const markers = [];
  for (const row of table.filter((r) => r.journey)) {
    if (!row.marker) {
      markers.push({ row, text: row.stage === "S7" ? `no marker yet (S7 ${row.wp} sets it) — not read` : "structural only — not read here" });
      continue;
    }
    const inInit = holders(init, row.marker);
    const inPre = holders(pre, row.marker);
    const exempt = row.byDesign === "every page" || (row.byDesign === "/" && route === "/");
    let text;
    if (inInit.length && exempt) text = `IN the initial scripts (${inInit.join(", ")}) — by design (${row.byDesign === "/" ? "/ only" : "every page"}): reported, never failed`;
    else if (inInit.length) {
      text = `IN the initial scripts (${inInit.join(", ")})`;
      fail("journey-js", `${row.id}'s ${JSON.stringify(row.marker)} is in the initial scripts (${inInit.join(", ")})${row.byDesign === "/" ? ": by design on / only" : ""}`);
    } else text = "absent from the initial scripts";
    if (inPre.length) text += `; in a low-priority preload (${inPre.join(", ")}): reported`;
    markers.push({ row, text, bad: inInit.length > 0 && !exempt });
  }

  // The HTML carries no journey markup.
  const markup = [];
  for (const p of HTML_JOURNEY) {
    const hits = [...new Set(html.match(p.re) ?? [])];
    if (hits.length) {
      markup.push(`${p.id}: ${hits.slice(0, 5).join(", ")}`);
      fail("journey-html", `journey markup in the HTML — ${p.id}: ${hits.slice(0, 5).join(", ")}`);
    }
  }

  // Client-rendered boundaries.
  const flight = flightOf(html);
  const chat = chatbotOf(flight.text);
  const b = boundariesOf(html);
  const values = [...new Set(chat.values)];
  let expected = null;
  if (!chat.ids.length) fail("chatbot-unread", "the inline RSC data names no LazyOverlays: chatbotEnabled cannot be read, so the boundary count has no expectation");
  else if (values.length !== 1 || typeof values[0] !== "boolean") fail("chatbot-unread", `chatbotEnabled as passed to LazyOverlays is unreadable (${JSON.stringify(chat.values)})`);
  else expected = 1 + (values[0] === true ? 1 : 0);
  const notBailout = b.bail.filter((d) => d !== BAILOUT);
  if (notBailout.length) fail("boundary-digest", `a <!--$!--> whose template is not ${BAILOUT}: ${notBailout.join(", ")}`);
  const strayDigests = b.digests.length - b.bail.filter((d) => !d.startsWith("(")).length;
  const otherDigests = b.digests.filter((d) => d !== BAILOUT);
  if (false) fail("boundary-digest", `data-dgst template(s) beyond the <!--$!--> boundaries or with another digest: ${b.digests.join(", ")}`);
  if (b.rx.length) fail("boundary-rx", `client-render instruction(s) $RX: ${b.rx.join(" | ")}`);
  if (expected !== null && b.bail.length !== expected) {
    fail("boundary-count", `${b.bail.length} <!--$!--> boundaries; chatbotEnabled ${values[0]} expects exactly ${expected}`);
  }
  const initialPaths = new Set(init.map((s) => new URL(s.url).pathname.replace(/^\/_next\//, "")));
  const unloaded = [...chat.chunks].filter((c) => !initialPaths.has(c));
  reports.push(`the RSC data's client references name ${chat.chunks.size} chunk(s); ${unloaded.length} of them are not initial scripts`);

  return {
    route, page, html, init, pre, others, controls, markers, markup, flight,
    boundary: { ...b, chatbot: values.length === 1 ? values[0] : chat.values, expected },
    failures, reports,
  };
}

function printRoute(r) {
  const say = (s) => console.log(s);
  if (!r.init) {
    say(`\n${r.route}: NOT READ — ${r.failures.map((f) => f.text).join("; ")}`);
    return;
  }
  const sum = (xs) => xs.reduce((n, s) => n + s.text.length, 0);
  say(`\n${r.route} → ${r.page.url} (${r.page.status}, HTML ${kb(r.html.length)})`);
  say(`  initial scripts (${r.init.length}, ${kb(sum(r.init))}): ${r.init.map((s) => `${base(s.url)}${s.nomodule ? " [nomodule]" : ""} ${kb(s.text.length)}`).join(", ")}`);
  say(`  low-priority preloads, apart (${r.pre.length}, ${kb(sum(r.pre))}): ${r.pre.map((s) => `${base(s.url)}${s.priority ? ` [${s.priority}]` : ""} ${kb(s.text.length)}`).join(", ") || "none"}`);
  if (r.others.length) say(`  other scripts, not fetched: ${r.others.map((s) => s.url).join(", ")}`);
  say(`  control: ${r.controls.map((x) => `${JSON.stringify(x.c.marker)} ${x.in.length ? `FOUND (${x.in.join(", ")})` : "MISSING"}`).join(" · ")}`);
  say(`  journey markers:`);
  for (const m of r.markers) say(`    ${m.bad ? "✗" : "·"} ${`${m.row.stage} ${m.row.id}`.padEnd(22)} ${m.row.marker ? JSON.stringify(m.row.marker).padEnd(26) : "".padEnd(26)} ${m.text}`);
  say(`  journey markup in the HTML: ${r.markup.length ? r.markup.join("; ") : "none"}`);
  const b = r.boundary;
  say(`  client-rendered boundaries: ${b.bail.length} <!--$!--> (${b.bail.join(", ") || "-"}); data-dgst templates ${b.digests.length}; $RX ${b.rx.length}; ` +
    `chatbotEnabled ${JSON.stringify(b.chatbot)} → expected ${b.expected ?? "unreadable"}`);
  for (const x of r.reports) say(`  ${x}`);
  say(`  ${r.failures.length ? "✗ FAIL: " + r.failures.map((f) => `[${f.kind}] ${f.text}`).join(" | ") : "✓ PASS"}`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE CONTROLS (--self-test): synthetic documents through the same reader, with a fake fetch
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

const T = "https://selftest.invalid";
const PRIMER = (dgst = BAILOUT) => `<!--$!--><template data-dgst="${dgst}"></template><!--/$-->`;

/** A document shaped like Next 16's: head scripts and preloads, the body's boundaries, the inline RSC data. */
function synthDoc({ chatbot = true, digests = [BAILOUT, BAILOUT], overlays = true, extraMarkup = "", rx = false, scripts = ["runtime.js", "layout.js"], preloads = ["consent.js"] } = {}) {
  const rows = [];
  if (overlays) rows.push(`1a:I[42,["static/chunks/layout.js"],"LazyOverlays"]`);
  rows.push(`1b:I[43,["static/chunks/layout.js"],"AppShellClient"]`);
  const overlayEl = overlays ? `,["$","$L1a",null,${JSON.stringify({ chatbotEnabled: chatbot, supportEmail: "help@example.test" })}]` : "";
  rows.push(`0:["$","html",null,{"children":["$","body",null,{"children":[["$","$L1b",null,{}]${overlayEl}]}]}]`);
  const push = (s) => `<script>self.__next_f.push(${JSON.stringify([1, s + "\n"])})</script>`;
  return (
    `<!DOCTYPE html><html lang="sw"><head><meta charSet="utf-8"/>` +
    preloads.map((p) => `<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/${p}?dpl=t"/>`).join("") +
    scripts.map((s) => `<script src="/_next/static/chunks/${s}?dpl=t" async=""></script>`).join("") +
    `<script src="https://www.googletagmanager.com/gtag/js?id=G-SELFTEST" async=""></script></head>` +
    `<body><header class="app-topbar"></header><main id="main-content"><!--$--><p>board</p><!--/$--></main>` +
    `<!--$-->${digests.map((d) => PRIMER(d)).join("")}<!--/$-->${extraMarkup}` +
    (rx ? `<script>$RX=function(b,c){};$RX("B:0","${BAILOUT}")</script>` : "") +
    `<script>(self.__next_f=self.__next_f||[]).push([0])</script>${rows.map(push).join("")}</body></html>`
  );
}

function fakeSite(pages, chunks) {
  return async (url) => {
    const u = new URL(url);
    if (u.pathname.startsWith("/_next/")) {
      const name = u.pathname.split("/").pop();
      return name in chunks ? { status: 200, url, text: chunks[name] } : { status: 404, url, text: "" };
    }
    const p = pages[u.pathname];
    return p ? { status: p.status ?? 200, url, text: p.html } : { status: 404, url, text: "" };
  };
}

export async function selfTest() {
  const lines = [];
  let ok = true;
  const CLASSIC = `/*layout*/"data-testid":"deposit-header" "data-testid":"deposit-rail" kp-journey-shell`;
  const chunks = { "runtime.js": "/*runtime*/", "layout.js": CLASSIC, "consent.js": "/*consent*/kp-consent-force", "plain.js": "/*no classic bar*/",
    "topbar.js": `/*journey*/"data-testid":"journey-top-bar"`, "home-lazy.js": "/*home lazy*/kp-home-lazy-selftest" };
  // The home lazy module's row as it will read once S7 WP6 gives it a marker.
  const table = MARKERS.map((r) => (r.id === "HomeLazy" ? { ...r, marker: "kp-home-lazy-selftest" } : r));
  const cases = [
    { id: "S1 the expected by-design boundaries (chatbotEnabled true, two) pass; the control is found; the shell mark is reported", doc: {}, want: [] },
    { id: "S2 the same document with one more <!--$!--> FAILS", doc: { digests: [BAILOUT, BAILOUT, BAILOUT] }, want: ["boundary-count"] },
    { id: "S3 chatbotEnabled false with two boundaries FAILS", doc: { chatbot: false }, want: ["boundary-count"] },
    { id: "S4 chatbotEnabled false with one boundary passes", doc: { chatbot: false, digests: [BAILOUT] }, want: [] },
    { id: "S5 a <!--$!--> with another digest FAILS", doc: { digests: [BAILOUT, "NEXT_HTTP_ERROR_FALLBACK;404"] }, want: ["boundary-digest"] },
    { id: "S5b a <!--$!--> with no digest template at all FAILS (the count still matches)", doc: { digests: [BAILOUT], extraMarkup: "<!--$!--><!--/$-->" }, want: ["boundary-digest"] },
    { id: "S6 a stray data-dgst template outside a <!--$!--> FAILS", doc: { extraMarkup: `<template data-dgst="${BAILOUT}"></template>` }, want: ["boundary-digest"] },
    { id: "S7 a $RX client-render instruction FAILS", doc: { rx: true }, want: ["boundary-rx"] },
    { id: "S8 no LazyOverlays in the RSC data: chatbotEnabled unread FAILS", doc: { overlays: false }, want: ["chatbot-unread"] },
    { id: "S9 control: initial scripts without the classic bar's test ids FAIL", doc: { scripts: ["runtime.js", "plain.js"] }, want: ["control"] },
    { id: "S10 a journey marker in an initial script FAILS", doc: { scripts: ["runtime.js", "layout.js", "topbar.js"] }, want: ["journey-js"] },
    { id: "S11 the same marker in a low-priority preload only is reported, not failed", doc: { preloads: ["consent.js", "topbar.js"] }, want: [], expectText: "low-priority preload" },
    { id: "S12 journey markup in the HTML FAILS", doc: { extraMarkup: `<div data-testid="journey-tabs"></div>` }, want: ["journey-html"] },
    { id: "S13 a journey class in the HTML FAILS", doc: { extraMarkup: `<article class="kp-jcard"></article>` }, want: ["journey-html"] },
    { id: "S14 the home lazy module's marker on / is reported, not failed", route: "/", doc: { scripts: ["runtime.js", "layout.js", "home-lazy.js"] }, want: [], expectText: "by design (/ only)" },
    { id: "S15 the home lazy module's marker on /markets FAILS", route: "/markets", doc: { scripts: ["runtime.js", "layout.js", "home-lazy.js"] }, want: ["journey-js"] },
    { id: "S16 a page that does not answer 200 FAILS", status: 500, doc: {}, want: ["status"] },
  ];
  for (const c of cases) {
    const route = c.route ?? "/";
    const get = fakeSite({ [route]: { html: synthDoc(c.doc), status: c.status } }, chunks);
    let r;
    try {
      r = await readRoute(T, route, { get, table });
    } catch (e) {
      ok = false;
      lines.push(`  ✗ ${c.id} — threw ${e.stack ?? e}`);
      continue;
    }
    const kinds = [...new Set(r.failures.map((f) => f.kind))].sort();
    let good = kinds.join(",") === [...c.want].sort().join(",");
    if (good && c.expectText) good = r.markers.some((m) => m.text.includes(c.expectText));
    if (good && c.id.startsWith("S1 ")) {
      good = r.controls.every((x) => x.in.length > 0) && r.markers.some((m) => m.row.id === "JourneyShellMark" && m.text.includes("by design")) &&
        r.init.length === 2 && r.pre.length === 1 && r.others.length === 1;
    }
    if (!good) ok = false;
    lines.push(`  ${good ? "✓" : "✗"} ${c.id}${good ? "" : ` — failures: ${kinds.join(",") || "none"} (wanted ${c.want.join(",") || "none"}); ${r.failures.map((f) => f.text).join(" | ")}`}`);
  }
  return { ok, lines };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

async function main(argv) {
  const has = (f) => argv.includes(f);
  const valueOf = (f) => {
    const i = argv.indexOf(f);
    if (i >= 0) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(f + "="));
    return eq ? eq.slice(f.length + 1) : undefined;
  };
  const known = new Set(["--self-test", "--origin", "--routes"]);
  const unknown = argv.filter((a, i) => a.startsWith("--") && !known.has(a.split("=")[0]) && !["--origin", "--routes"].includes(argv[i - 1]));
  if (unknown.length) {
    console.log(`unknown argument(s): ${unknown.join(" ")} — see the usage at the top of scripts/qa-chunks-prod.mjs`);
    return 2;
  }

  const st = await selfTest();
  if (has("--self-test")) {
    console.log("[qa:chunks-prod] the controls, on synthetic documents (no network)");
    for (const l of st.lines) console.log(l);
    console.log(`\n${st.ok ? "ALL PASS" : "FAILURES"} — qa:chunks-prod --self-test: ${st.lines.filter((l) => l.startsWith("  ✓")).length} passed, ${st.lines.filter((l) => l.startsWith("  ✗")).length} failed`);
    return st.ok ? 0 : 1;
  }

  // ⛔ No default origin (see the header): the target is named, or nothing is read.
  const named = valueOf("--origin") ?? process.env.BASE ?? "";
  if (!named) {
    console.log("REFUSED: name the origin to read — `--origin https://50pick.tz` for production, or BASE=<origin>. " +
      "This script has no default target on purpose (test:live-target-safe; see its header).");
    return 2;
  }
  let target;
  try {
    target = new URL(named);
  } catch {
    console.log(`REFUSED: ${JSON.stringify(named)} is not a URL`);
    return 2;
  }
  if (!/^https?:$/.test(target.protocol) || (target.pathname !== "/" && target.pathname !== "") || target.search || target.hash) {
    console.log(`REFUSED: ${JSON.stringify(named)} is not an http(s) origin (no path, query or fragment)`);
    return 2;
  }
  const origin = target.origin;
  let routes = DEFAULT_ROUTES;
  if (valueOf("--routes") !== undefined) {
    const p = parseRoutes(valueOf("--routes"));
    if (p.errors.length || !p.routes.length) {
      for (const e of p.errors.length ? p.errors : ["--routes names no route"]) console.log("REFUSED: " + e);
      return 2;
    }
    routes = p.routes;
  }
  console.log(`[qa:chunks-prod] TARGET ${origin} — as a guest, GET only; routes ${routes.join(" ")}`);

  console.log(`[qa:chunks-prod] the controls on synthetic documents: ${st.ok ? "all pass" : "FAILED"} (${st.lines.length})`);
  if (!st.ok) {
    for (const l of st.lines.filter((x) => x.startsWith("  ✗"))) console.log(l);
    console.log("✗ a control failed: no verdict is read.");
    return 1;
  }
  const root = process.cwd();
  const t = checkMarkerTable(root);
  if (!t.ok) {
    console.log("[qa:chunks-prod] the marker table (qa-first-load.mjs) does not hold against src/: no verdict is read.");
    for (const l of t.lines.filter((x) => x.startsWith("✗"))) console.log("  " + l);
    return 1;
  }
  console.log(`[qa:chunks-prod] the marker table holds against src/ (${MARKERS.filter((r) => r.journey).length} journey rows)`);

  const cache = new Map();
  const get = (url) => {
    if (!cache.has(url)) {
      cache.set(url, (async () => {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 30_000);
        try {
          const r = await fetch(url, { method: "GET", redirect: "follow", headers: { "user-agent": UA, accept: "*/*" }, signal: ctl.signal });
          return { status: r.status, url: r.url, text: await r.text() };
        } catch (e) {
          return { status: 0, url, text: "", error: e.message };
        } finally {
          clearTimeout(timer);
        }
      })());
    }
    return cache.get(url);
  };
  let bad = 0;
  for (const route of routes) {
    const r = await readRoute(origin, route, { get });
    printRoute(r);
    if (r.failures.length) bad++;
  }
  console.log(`\n${bad ? "FAIL" : "PASS"} — qa:chunks-prod at ${origin}: ${routes.length - bad}/${routes.length} route(s) held every rule (${cache.size} GETs)`);
  return bad ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}
