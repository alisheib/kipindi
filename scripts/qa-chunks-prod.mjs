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
 *   · S6's, S7's and S8's journey markers (qa-first-load.mjs's table, rows marked `journey`, each unique in src/) must be
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
 *     (lazy-overlays.tsx's two loaders — each ending in the lost-chunk guard since S7's live fix L1, which leaves the
 *     server's render as it was — and their two mounts), and next/dynamic wraps each in a bail-out boundary of its own:
 *     `<!--$!-->`, React's digest template, the boundary's fallback, `<!--/$-->`, each read whole. So:
 *       - their number must be exactly 1 (the primer), plus 1 when the document's inline RSC data passes
 *         chatbotEnabled true to LazyOverlays (layout.tsx:243) — read from the I-row naming LazyOverlays and the
 *         element that references it; if it cannot be read, the route fails;
 *       - every `<!--$!-->` opens with a digest template and closes, and its digest is one that a PROFILE below names; one
 *         document follows ONE profile (one build writes one); a data-dgst template anywhere but at a boundary's opening
 *         fails, and a `$RX(…)` call (a boundary turned client-rendered after streaming) fails.
 *     ⭐ THE TWO PROFILES (S8, 2026-10-14 — docs/qa/s8-next164-boundary-diagnostic-20261014.md). Which one a document
 *     follows is printed with every route; neither is inferred from a blank digest alone.
 *       - LEGACY: data-dgst BAILOUT_TO_CLIENT_SIDE_RENDERING, next/dynamic's thrown BailoutToCSRError (Next before 16.4,
 *         or reactBrowserBailout off). A document without owner marks is read as it always was (count and digest); its
 *         fallbacks must be empty, as the overlays' loaders drew none before their marks. ⚠️ Read that way it cannot
 *         tell a foreign BailoutToCSRError with an empty fallback from an overlay at the same count — the pre-S8 reading's
 *         limit, which the route's report names whenever it applies. With marks, the owner rules below hold in full.
 *       - BROWSER BAILOUT: data-dgst "" — Next 16.4's React browser bailout (`reactBrowserBailout`, on by default; Next
 *         16.4 since 5cad06f9), which is what production served at da19e5a2. ⛔ Every other browser bailout writes the
 *         same EMPTY digest, so a blank digest is accepted ONLY inside a boundary whose whole fallback is exactly one
 *         OWNER MARK: the empty `<template data-csr-owner="…">` each overlay loader draws as its `loading`
 *         (lazy-overlays.tsx; it renders nothing and is replaced when the part's code arrives).
 *     THE OWNER RULES: every mark is some boundary's whole fallback (a mark anywhere else fails); every name is one of
 *     OVERLAY_OWNERS'; no name twice; and the names are exactly the census — chatbotEnabled true: chat-root and
 *     first-visit-primer; false: first-visit-primer alone — so a foreign boundary standing in for an overlay at the same
 *     count fails too. Each name is BOUND TO ITS LOADER IN THE SOURCE before any verdict (`overlayOwners`, read from src):
 *     lazy-overlays.tsx declares exactly OVERLAY_OWNERS' loaders — module, part, `ssr: false` and its own mark — and
 *     mounts each as the table says (the chat bubble inside `{chatbotEnabled && …}`, the primer always), and no other
 *     file in src draws a mark, so a mark moved to another loader, renamed, or put on an unrelated bail-out fails there
 *     even where the bytes would read clean.
 *     THE PROFILE IS ATTESTED for a deployment this checkout built: when the local `.next/required-server-files.json`
 *     names the deployment the page's scripts carry (`?dpl=`), that build's resolved `reactBrowserBailout` decides the
 *     profile the page must follow (true: browser bailout; otherwise legacy). Any other deployment is reported "not
 *     attested" and read by its bytes and the owner rules.
 *     chunks-check-wp6c.sh's zero rule ("no <!--$!--> in the HTML", :30, :36) is NOT ported: as written it fails every
 *     page. WP6c's saved documents (2026-10-03) held exactly two of each on every route, with chatbotEnabled true.
 * ⭐ THE CONTROLS (`--self-test`, also run first by every reading — A9: a control that must pass before any verdict):
 *   synthetic documents, read through the same code with a fake fetch: the classic bar's test ids found in the initial
 *   scripts (and their absence failing); the expected by-design boundaries passing; one more `<!--$!-->` failing;
 *   chatbotEnabled false with two failing (and with one passing); another digest, a `$RX`, unread chatbotEnabled,
 *   a journey marker in an initial script, journey markup in the HTML and the home lazy module's marker off / each
 *   failing; the shell mark, the home lazy module's marker on / and a marker in a preload only each reported, not failed.
 *   Since S8 (M*, N*, the profiles): owned browser-bailout documents passing (chatbot on and off, and legacy with
 *   marks), attested and not; and failing on a blank stray template, an extra browser bailout, a boundary with no
 *   data-dgst, a wrong or 404 digest, a `$RX`, a missing or unreadable chatbotEnabled, an owner twice (across boundaries
 *   or inside one), an unknown owner, an owner outside its boundary, a same-count foreign owner, an unowned blank digest
 *   (production's bytes before the marks), two profiles in one document, a mark beside other content or carrying
 *   another attribute, a boundary that never closes, and the attested profile contradicted — each held to its exact
 *   failure kinds and boundary rules; and (O*, the source) the real lazy-overlays.tsx binding passing, and in-memory
 *   plants of it failing — an unrelated bail-out relabelled as an allowed owner (with and without the real mark
 *   removed), the marks swapped, a loader renamed, a mark dropped or added, a third loader, either mount's condition
 *   changed, `ssr: false` dropped, the file gone, and no src at all.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CONTROLS, MARKERS, checkMarkerTable, matchBrace, parseRoutes } from "./qa-first-load.mjs";

const DEFAULT_ROUTES = ["/", "/markets", "/positions", "/help", "/live", "/results"];
const UA = "Mozilla/5.0 (qa-chunks-prod; read-only guest)";
const BAILOUT = "BAILOUT_TO_CLIENT_SIDE_RENDERING";

/**
 * ⭐ THE TWO PROFILES (see the header), by the digest each writes. React writes data-dgst whenever a digest is not null,
 * the empty string included (react-dom-server.edge.production.js, flushSegment), and Next 16.4's browser bailout leaves
 * it empty (logRecoverableError → onBrowserBailout → ""; diagnostic, :10-11 and :22-23).
 */
export const PROFILES = {
  legacy: { digest: BAILOUT, name: "legacy (BailoutToCSRError: Next before 16.4, or reactBrowserBailout off)" },
  browser: { digest: "", name: "browser bailout (Next 16.4's React browser bailout, reactBrowserBailout on)" },
};
const profileOf = (digest) => Object.keys(PROFILES).find((p) => PROFILES[p].digest === digest) ?? null;

/** The owner mark's attribute: each overlay loader's `loading` draws `<template data-csr-owner="…" />` (lazy-overlays.tsx). */
const OWNER_ATTR = "data-csr-owner";
export const OVERLAY_SOURCE = "src/components/layout/lazy-overlays.tsx";
/**
 * ⭐ THE OVERLAYS' OWNERS — each one of lazy-overlays.tsx's loaders: the mark its `loading` draws, the part it picks
 * (`.then((m) => m.<part>)`, and the binding it is assigned to), its module, and when LazyOverlays mounts it (`chatbot`:
 * inside `{chatbotEnabled && …}`, the value the RSC data passes and chatbotOf reads; `always`: unconditionally). Never
 * trusted alone: `overlayOwners` holds lazy-overlays.tsx to it, and every reading to that source's answer.
 */
export const OVERLAY_OWNERS = [
  { owner: "chat-root", part: "ChatRoot", module: "@/components/chat/ChatRoot", mount: "chatbot" },
  { owner: "first-visit-primer", part: "FirstVisitPrimer", module: "@/components/onboarding/first-visit-primer", mount: "always" },
];
/** A mark DRAWN in source: the attribute assigned in JSX (`data-csr-owner=`), or keyed in an object or a call (`"data-csr-owner":`, `…",`). */
const OWNER_DRAWN = /data-csr-owner\s*(?:=|["']\s*[:,])/g;

/** `s` with its comments blanked — // and /* … *\/, outside '…', "…" and `…` strings (JSX text holding `//` aside) — and
 *  every line break kept, so a line number read in it is the source's. */
export function decomment(s) {
  let out = "";
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < s.length && s[j] !== c) j += s[j] === "\\" ? 2 : 1;
      out += s.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && s[i + 1] === "/") {
      while (i < s.length && s[i] !== "\n") i++;
    } else if (c === "/" && s[i + 1] === "*") {
      const end = s.indexOf("*/", i + 2);
      const stop = end < 0 ? s.length : end + 2;
      out += " " + s.slice(i, stop).replace(/[^\n]/g, "");
      i = stop;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** The text of a call's arguments from `open` (the index of its "("), split at its top-level commas; null if it never closes. */
function argsOf(s, open) {
  const args = [];
  let depth = 0, from = open + 1;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < s.length && s[j] !== c) j += s[j] === "\\" ? 2 : 1;
      i = j;
    } else if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") {
      depth--;
      if (depth === 0) {
        args.push(s.slice(from, i));
        return args.map((a) => a.replace(/\s+/g, " ").trim()).filter((a, k, all) => a !== "" || k < all.length - 1);
      }
    } else if (c === "," && depth === 1) {
      args.push(s.slice(from, i));
      from = i + 1;
    }
  }
  return null;
}

/** The files under `root`/src as a Map of "src/…" → text (latin1, as checkMarkerTable reads them). */
export function srcWorld(root) {
  const files = new Map();
  const walk = (rel) => {
    let names = [];
    try {
      names = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const d of names) {
      const r = `${rel}/${d.name}`;
      if (d.isDirectory()) walk(r);
      else if (d.isFile()) files.set(r, fs.readFileSync(path.join(root, r), "latin1"));
    }
  };
  walk("src");
  return files;
}

/**
 * ⭐ THE OWNER MARKS, BOUND TO THEIR LOADERS IN THE SOURCE. `files`: srcWorld's Map (or an in-memory copy the controls
 * plant in). Holds OVERLAY_SOURCE to OVERLAY_OWNERS — every `dynamic(` call in it is one row's loader, assigned to the
 * row's part: `() => import("<module>").then((m) => m.<part>).catch(nothingIfLost)`, with the options `ssr: false` and
 * `loading: () => <template data-csr-owner="<owner>" />` and nothing else; each row's loader declared once; each part
 * mounted once, as its row says; no mark drawn anywhere else in the file — and no file in src but this one draws a mark at
 * all. Returns { ok, owners (the rows, when ok), problems }.
 */
export function overlayOwners(files, table = OVERLAY_OWNERS) {
  const problems = [];
  const src = files.get(OVERLAY_SOURCE);
  if (files.size === 0) problems.push("no file under src/: the owner marks cannot be bound to anything");
  if (typeof src !== "string") {
    problems.push(`${OVERLAY_SOURCE} is gone: the owner marks have no loaders`);
    return { ok: false, owners: null, problems };
  }
  const code = decomment(src);
  const squashed = code.replace(/\s+/g, " ");
  const declared = [];
  const calls = [...code.matchAll(/(?<![\w$.])dynamic\s*\(/g)];
  for (const m of calls) {
    const open = m.index + m[0].length - 1;
    const head = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/.exec(code.slice(Math.max(0, m.index - 120), m.index));
    const args = argsOf(code, open);
    const at = `${OVERLAY_SOURCE}:${code.slice(0, m.index).split("\n").length}`;
    const loader = args && /^\(\) => import\("([^"]+)"\)\.then\(\(m\) => m\.([A-Za-z_$][\w$]*)\)\.catch\(nothingIfLost\)$/.exec(args[0] ?? "");
    const props = args && args.length === 2 && /^\{.*\}$/.test(args[1]) ? argsOf(`(${args[1].slice(1, -1)})`, 0) : null;
    const opts = props && Object.fromEntries(props.map((p) => /^([A-Za-z_$][\w$]*): (.*)$/.exec(p)).filter(Boolean).map((x) => [x[1], x[2]]));
    const mark = opts && /^\(\) => <template data-csr-owner="([^"]*)" ?\/>$/.exec(opts.loading ?? "");
    const form = head && loader && props && Object.keys(opts).length === props.length && Object.keys(opts).sort().join() === "loading,ssr"
      && opts.ssr === "false" && mark;
    if (!form) {
      problems.push(`${at}: a dynamic( call that is not \`const <part> = dynamic(() => import("<module>").then((m) => m.<part>).catch(nothingIfLost), ` +
        `{ ssr: false, loading: () => <template ${OWNER_ATTR}="<owner>" /> })\` — read ${JSON.stringify((args ?? ["(unclosed)"]).join(", ").slice(0, 220))}`);
      continue;
    }
    declared.push({ binding: head[1], module: loader[1], part: loader[2], owner: mark[1], at });
  }
  for (const row of table) {
    const mine = declared.filter((d) => d.part === row.part);
    if (mine.length !== 1) {
      problems.push(`${row.owner}: ${mine.length} loader(s) of ${OVERLAY_SOURCE} pick ${row.part} (exactly one must, drawing that mark)`);
      continue;
    }
    const [d] = mine;
    if (d.binding !== row.part || d.module !== row.module || d.owner !== row.owner) {
      problems.push(`${row.owner}: ${d.at} is \`const ${d.binding} = dynamic(… import("${d.module}") … m.${d.part} …)\` drawing ${JSON.stringify(d.owner)}; ` +
        `the table binds ${JSON.stringify(row.owner)} to \`const ${row.part}\`, import("${row.module}"), m.${row.part}`);
    }
    const tags = [...squashed.matchAll(new RegExp(`<${row.part}(?![\\w$])`, "g"))];
    const gated = [...squashed.matchAll(new RegExp(`\\{ ?chatbotEnabled ?&& ?<${row.part}(?![\\w$])[^<>]*/> ?\\}`, "g"))];
    const before = tags.length === 1 ? squashed.slice(0, tags[0].index).trimEnd().slice(-1) : "";
    const mounted = row.mount === "chatbot" ? tags.length === 1 && gated.length === 1 : tags.length === 1 && gated.length === 0 && (before === "}" || before === ">");
    if (!mounted) {
      problems.push(`${row.owner}: <${row.part}> is mounted ${tags.length} time(s)${gated.length ? ", inside {chatbotEnabled && …}" : ""}${before ? ` after ${JSON.stringify(before)}` : ""}; ` +
        `the census needs it once, ${row.mount === "chatbot" ? "inside {chatbotEnabled && <…/>}" : "unconditionally (a direct child, after } or >)"}`);
    }
  }
  const strays = declared.filter((d) => !table.some((row) => row.part === d.part));
  for (const d of strays) problems.push(`${d.at}: a loader no row of OVERLAY_OWNERS names (m.${d.part}, mark ${JSON.stringify(d.owner)})`);
  const drawnHere = [...code.matchAll(OWNER_DRAWN)].length;
  if (drawnHere !== declared.length) problems.push(`${OVERLAY_SOURCE} draws ${drawnHere} owner mark(s) for ${declared.length} loader(s): a mark outside a loader's \`loading\` belongs to no overlay`);
  // Every other file is read as written, comments included: the attribute assigned anywhere else is refused, never parsed.
  for (const [file, text] of files) {
    if (file === OVERLAY_SOURCE || !text.includes(OWNER_ATTR)) continue;
    const drawn = [...text.matchAll(OWNER_DRAWN)].length;
    if (drawn) problems.push(`${file} draws ${drawn} owner mark(s): only ${OVERLAY_SOURCE}'s loaders may — a mark elsewhere relabels another boundary as an overlay`);
  }
  return { ok: problems.length === 0, owners: problems.length === 0 ? table : null, problems };
}

/** qa-classic-shell-parity.mjs:501 — a journey test id or the flag attribute, as HTML or as the RSC payload's escaped JSON. */
const RAW_TRACE = /(?:data-testid|testId)(?:=|\\":)\\?"journey-[\w-]*|\bdata-journey(?![\w-])/g;
const HTML_JOURNEY = [
  { id: "journey test id / data-journey", re: RAW_TRACE },
  { id: "the journey shell's mark", re: /kp-journey-shell/g },
  { id: "journey-top-bar / journey-tabs", re: /journey-top-bar|journey-tabs/g },
  { id: "journey class", re: /(?<![\w-])kp-(?:jhdr|jsheet|jcard|jhome|jhowto|howto|bsheet)(?![A-Za-z0-9])/g },
  { id: "S8 sheet seed", re: /\bdata-sheet(?![\w-])(?:=|\\?"\s*:)/g },
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

/** React's Suspense boundary comments (react-dom-server: `<!--$-->` `<!--$?-->` `<!--$!-->` open, `<!--/$-->` closes). */
const SUSPENSE_MARK = /<!--(\$|\$\?|\$!|\/\$)-->/g;
/** A fallback that is exactly one owner mark: an empty `<template>` whose one attribute is the owner's. */
const WHOLE_MARK = /^\s*<template\b([^>]*)>\s*<\/template>\s*$/i;

/**
 * Every `<!--$!-->` boundary read whole — its digest template (`digest`: the data-dgst value; null for a template
 * without one, undefined for no template), its fallback up to its own `<!--/$-->` (nested boundaries counted; `closed`
 * false if it never closes), and `owner`: the mark's name when that fallback is exactly one owner mark, else null — and
 * every owner mark in the markup (`marks`), every data-dgst template (`digests`) and those that open no boundary (`stray`),
 * every `$RX(…)` call. `bail` lists the boundaries' digests as printed.
 */
export function boundariesOf(html) {
  const bodies = [];
  const markup = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, body) => {
    bodies.push(body);
    return "";
  });
  const boundaries = [];
  const opening = new Set();
  for (const m of markup.matchAll(/<!--\$!-->/g)) {
    const after = m.index + m[0].length;
    const t = /^\s*<template\b([^>]*)>\s*<\/template>/i.exec(markup.slice(after, after + 2000));
    const attrs = t ? attrsOf(t[1]) : null;
    const digest = attrs ? (attrs["data-dgst"] ?? null) : undefined;
    if (t) opening.add(after + t[0].indexOf("<"));
    const from = after + (t ? t[0].length : 0);
    let depth = 0, end = -1;
    SUSPENSE_MARK.lastIndex = from;
    for (let s; (s = SUSPENSE_MARK.exec(markup)); ) {
      if (s[1] !== "/$") depth++;
      else if (depth === 0) {
        end = s.index;
        break;
      } else depth--;
    }
    const fallback = end < 0 ? "" : markup.slice(from, end);
    const whole = WHOLE_MARK.exec(fallback);
    const markAttrs = whole ? attrsOf(whole[1]) : null;
    const owned = markAttrs && Object.keys(markAttrs).join() === OWNER_ATTR;
    boundaries.push({
      at: m.index, digest, closed: end >= 0, empty: end >= 0 && fallback.trim() === "",
      owner: owned ? markAttrs[OWNER_ATTR] : null, markAt: owned ? from + fallback.indexOf("<") : -1,
    });
  }
  const templates = [...markup.matchAll(/<template\b([^>]*)>/gi)].map((m) => ({ at: m.index, a: attrsOf(m[1]) }));
  const marks = templates.filter((t) => OWNER_ATTR in t.a).map((t) => ({ at: t.at, owner: t.a[OWNER_ATTR] }));
  const digests = templates.filter((t) => "data-dgst" in t.a).map((t) => t.a["data-dgst"]);
  const stray = templates.filter((t) => "data-dgst" in t.a && !opening.has(t.at)).map((t) => t.a["data-dgst"]);
  const rx = bodies.flatMap((b) => [...b.matchAll(/\$RX\("([^"]*)"(?:,"((?:[^"\\]|\\.)*)")?/g)].map((m) => `${m[1]} ${m[2] ?? ""}`.trim()));
  const bail = boundaries.map((x) => (x.digest === undefined ? "(no template)" : x.digest === null ? "(template without data-dgst)" : JSON.stringify(x.digest)));
  return { bail, boundaries, marks, digests, stray, rx };
}

/** The deployment a page's initial scripts name (`?dpl=`): the one value they all carry, or null (none, or more than one). */
export function deploymentOf(scripts) {
  const ids = new Set(scripts.map((s) => {
    try {
      return new URL(s.url).searchParams.get("dpl");
    } catch {
      return null;
    }
  }));
  return ids.size === 1 && [...ids][0] ? [...ids][0] : null;
}

/**
 * The build this checkout made, as its `.next/required-server-files.json` records it: { deploymentId, reactBrowserBailout }
 * (Next's RESOLVED config, defaults included: Next 16.4 defaults reactBrowserBailout to true, config-shared.js), or null.
 */
export function localBuildOf(root) {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(root, ".next", "required-server-files.json"), "utf8"));
    return { deploymentId: r?.config?.deploymentId ?? null, reactBrowserBailout: r?.config?.experimental?.reactBrowserBailout };
  } catch {
    return null;
  }
}

/** Whether the page's deployment is the build this checkout made, and if so the profile that build writes. */
export function attestationOf(deployment, build) {
  if (!build || !build.deploymentId) return { attested: false, expect: null, text: `not attested: no local build records a deployment id (the page's ${deployment ?? "none read"}) — read by its bytes and the owner rules` };
  if (deployment !== build.deploymentId) {
    return { attested: false, expect: null, text: `not attested: the page's deployment ${String(deployment ?? "(none read)").slice(0, 12)} is not the local build's ${String(build.deploymentId).slice(0, 12)} — read by its bytes and the owner rules` };
  }
  const expect = build.reactBrowserBailout === true ? "browser" : "legacy";
  return { attested: true, expect, text: `attested: the page is the local build ${String(build.deploymentId).slice(0, 12)}, whose resolved reactBrowserBailout is ${JSON.stringify(build.reactBrowserBailout)} → profile ${expect}` };
}

/**
 * One route. `get(url)` → { status, url, text } (GET). `table`: the journey rows. `owners`: the overlays' owner rows, as
 * `overlayOwners` bound them to the source (the controls pass OVERLAY_OWNERS). `build`: localBuildOf's answer, or null.
 * Returns the reading with its `failures` ([{ kind, text }]) and `reports` (lines, never failures).
 */
export async function readRoute(origin, route, { get, table = MARKERS, owners = OVERLAY_OWNERS, build = null }) {
  const failures = [];
  const reports = [];
  // `rule`: which boundary rule failed (the boundary checks name theirs, so a control can hold each to its own).
  const fail = (kind, text, rule) => failures.push({ kind, text, rule });
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

  // Client-rendered boundaries: one profile per document, the owner rules, the census (see the header).
  const flight = flightOf(html);
  const chat = chatbotOf(flight.text);
  const b = boundariesOf(html);
  const values = [...new Set(chat.values)];
  let expected = null;
  if (!chat.ids.length) fail("chatbot-unread", "the inline RSC data names no LazyOverlays: chatbotEnabled cannot be read, so the boundary count has no expectation", "chatbot-none");
  else if (values.length !== 1 || typeof values[0] !== "boolean") fail("chatbot-unread", `chatbotEnabled as passed to LazyOverlays is unreadable (${JSON.stringify(chat.values)})`, "chatbot-value");
  else expected = owners.filter((o) => o.mount === "always" || values[0] === true).map((o) => o.owner);
  const formless = b.boundaries.filter((x) => typeof x.digest !== "string" || !x.closed);
  if (formless.length) fail("boundary-digest", `a <!--$!--> that does not open with a digest template or never closes: ${formless.map((x) => (x.closed ? b.bail[b.boundaries.indexOf(x)] : "(never closed)")).join(", ")}`, "formless");
  const unknownDigest = b.boundaries.filter((x) => typeof x.digest === "string" && profileOf(x.digest) === null);
  if (unknownDigest.length) fail("boundary-digest", `a <!--$!--> whose digest neither profile writes (${BAILOUT} or ""): ${unknownDigest.map((x) => JSON.stringify(x.digest)).join(", ")}`, "digest-unknown");
  const profiles = [...new Set(b.boundaries.map((x) => profileOf(x.digest)).filter(Boolean))];
  if (profiles.length > 1) fail("boundary-digest", `two profiles in one document (${profiles.join(" and ")}): one build writes one`, "profiles-mixed");
  const profile = profiles.length === 1 ? profiles[0] : null;
  if (b.stray.length) fail("boundary-digest", `data-dgst template(s) that open no <!--$!--> boundary: ${b.stray.map((d) => JSON.stringify(d)).join(", ")}`, "digest-stray");
  if (b.rx.length) fail("boundary-rx", `client-render instruction(s) $RX: ${b.rx.join(" | ")}`, "rx");
  if (expected !== null && b.boundaries.length !== expected.length) fail("boundary-count", `${b.boundaries.length} <!--$!--> boundaries; chatbotEnabled ${values[0]} expects exactly ${expected.length}`, "count");
  // The owner rules. A mark counts only as a boundary's WHOLE fallback; a blank digest only inside such a boundary.
  const owned = b.boundaries.filter((x) => x.owner !== null);
  const names = owned.map((x) => x.owner);
  const consumed = new Set(owned.map((x) => x.markAt));
  const outside = b.marks.filter((m) => !consumed.has(m.at));
  if (outside.length) fail("boundary-owner", `owner mark(s) that are not a <!--$!--> boundary's whole fallback: ${outside.map((m) => JSON.stringify(m.owner)).join(", ")}`, "owner-outside");
  const unknownOwner = names.filter((n) => !owners.some((o) => o.owner === n));
  if (unknownOwner.length) fail("boundary-owner", `owner(s) no overlay loader draws: ${unknownOwner.map((n) => JSON.stringify(n)).join(", ")} (OVERLAY_OWNERS: ${owners.map((o) => o.owner).join(", ")})`, "owner-unknown");
  const twice = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
  if (twice.length) fail("boundary-owner", `the same owner on two boundaries: ${twice.join(", ")}`, "owner-twice");
  const unowned = b.boundaries.filter((x) => x.owner === null);
  if (profile === "browser" && unowned.length) fail("boundary-owner", `${unowned.length} <!--$!--> with an EMPTY digest and no owner mark as its whole fallback — every browser bailout writes that digest, so it is accepted only where an overlay names its own boundary`, "blank-unowned");
  if (profile === "legacy" && owned.length && unowned.length) fail("boundary-owner", `${owned.length} of ${b.boundaries.length} legacy boundaries owned: one build draws every overlay's mark or none`, "legacy-partly-owned");
  if (profile === "legacy" && !owned.length && unowned.some((x) => x.closed && !x.empty)) fail("boundary-owner", "a legacy boundary whose fallback is not empty: the overlays' loaders drew no fallback before their marks", "legacy-fallback");
  const missing = expected === null ? [] : expected.filter((n) => !names.includes(n));
  const extra = expected === null ? [] : [...new Set(names.filter((n) => !expected.includes(n) && owners.some((o) => o.owner === n)))];
  if ((profile === "browser" || owned.length) && (missing.length || extra.length)) {
    fail("boundary-owner", `the owners are not the census: chatbotEnabled ${values[0]} expects ${expected.join(" + ")}; ` +
      `${missing.length ? `missing ${missing.join(", ")}` : ""}${missing.length && extra.length ? "; " : ""}${extra.length ? `not expected ${extra.join(", ")}` : ""}`, "census");
  }
  // The profile, attested where the page is the build this checkout made.
  const attest = attestationOf(deploymentOf(init), build);
  if (attest.attested && profile !== null && profile !== attest.expect) fail("boundary-profile", `the page follows the ${profile} profile; the local build it is (${attest.text.replace(/^attested: /, "")}) writes ${attest.expect}`, "profile-attested");
  reports.push(`boundary profile: ${profile ? PROFILES[profile].name : "none (no client-rendered boundary)"}; ${attest.text}`);
  if (profile === "legacy" && !owned.length) reports.push("⚠️ legacy without owner marks: a foreign BailoutToCSRError with an empty fallback cannot be told from an overlay at the same count (the pre-S8 reading's limit)");
  const initialPaths = new Set(init.map((s) => new URL(s.url).pathname.replace(/^\/_next\//, "")));
  const unloaded = [...chat.chunks].filter((c) => !initialPaths.has(c));
  reports.push(`the RSC data's client references name ${chat.chunks.size} chunk(s); ${unloaded.length} of them are not initial scripts`);

  return {
    route, page, html, init, pre, others, controls, markers, markup, flight,
    boundary: { ...b, chatbot: values.length === 1 ? values[0] : chat.values, expected, profile, attest },
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
  const each = b.boundaries.map((x, i) => `${b.bail[i]} → ${x.owner === null ? (x.empty ? "empty fallback" : "no owner mark") : `owner ${x.owner}`}`);
  say(`  client-rendered boundaries: ${b.boundaries.length} <!--$!--> (${each.join(", ") || "-"}); data-dgst templates ${b.digests.length}; ` +
    `owner marks ${b.marks.length}; $RX ${b.rx.length}; chatbotEnabled ${JSON.stringify(b.chatbot)} → expected ${b.expected ? `${b.expected.length} (${b.expected.join(" + ")})` : "unreadable"}`);
  for (const x of r.reports) say(`  ${x}`);
  say(`  ${r.failures.length ? "✗ FAIL: " + r.failures.map((f) => `[${f.kind}] ${f.text}`).join(" | ") : "✓ PASS"}`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE CONTROLS (--self-test): synthetic documents through the same reader, with a fake fetch
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

const T = "https://selftest.invalid";
const PRIMER = (dgst = BAILOUT) => `<!--$!--><template data-dgst="${dgst}"></template><!--/$-->`;
/** A boundary as Next 16.4 serves an overlay's since S8: the browser bailout's empty digest, then its owner mark as the whole fallback. */
const OWNED = (owner, dgst = "") => `<!--$!--><template data-dgst="${dgst}"></template><template ${OWNER_ATTR}="${owner}"></template><!--/$-->`;
/** The two overlays' boundaries, owned (chatbotEnabled true). */
const MODERN = [OWNED("chat-root"), OWNED("first-visit-primer")];

/**
 * A document shaped like Next 16's: head scripts and preloads, the body's boundaries, the inline RSC data. `digests`
 * draws legacy-shaped boundaries (an empty fallback each); `bounds`, when given, is the boundaries' markup itself.
 */
function synthDoc({ chatbot = true, digests = [BAILOUT, BAILOUT], bounds = null, overlays = true, extraMarkup = "", rx = false, scripts = ["runtime.js", "layout.js"], preloads = ["consent.js"] } = {}) {
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
    `<!--$-->${(bounds ?? digests.map((d) => PRIMER(d))).join("")}<!--/$-->${extraMarkup}` +
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

export async function selfTest({ root = process.cwd() } = {}) {
  const lines = [];
  let ok = true;
  const CLASSIC = `/*layout*/"data-testid":"deposit-header" "data-testid":"deposit-rail" "kp-journey-shell"`;
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
  // The newly canonical S8 rendering markers must exercise this served-script reader too, not only the build reader.
  for (const row of table.filter(row => ["QuestionGhost", "JourneyBetButtons", "JourneyHomeBreak"].includes(row.id))) {
    const file = `s8-${row.id}.js`;
    chunks[file] = `/*S8 rendering marker*/${row.marker}`;
    cases.push(
      { id: `S17 ${row.id} joined to a classic initial script FAILS`, doc: { scripts: ["runtime.js", "layout.js", file] }, want: ["journey-js"] },
      { id: `S18 ${row.id} in a low-priority preload is reported separately`, doc: { preloads: ["consent.js", file] }, want: [], expectText: "low-priority preload" },
      { id: `S19 ${row.id} rendered as markup in the classic document FAILS`, doc: { extraMarkup: `<div data-testid=${row.marker}></div>` }, want: ["journey-html"] },
    );
  }
  // ⭐ S8 — THE PROFILES (see the header). M: the owned browser-bailout documents, and the attestation; N: every
  // defect the profile must still fail on, each held to its exact failure kinds AND to the exact boundary rules that
  // fire (`rules`), so a rule removed from the reader turns its own control red even where another rule shares its kind.
  const ATTESTED = (flag) => ({ deploymentId: "t", reactBrowserBailout: flag });
  const blankForeign = (fallback) => `<!--$!--><template data-dgst=""></template>${fallback}<!--/$-->`;
  cases.push(
    { id: "M1 the browser-bailout profile: two EMPTY digests, each boundary's whole fallback its owner mark (chatbotEnabled true) passes",
      doc: { bounds: MODERN }, want: [], rules: [], expectReport: `boundary profile: ${PROFILES.browser.name}; not attested` },
    { id: "M2 the browser-bailout profile, chatbotEnabled false: the primer's boundary alone, owned, passes",
      doc: { chatbot: false, bounds: [OWNED("first-visit-primer")] }, want: [], rules: [], expectReport: `boundary profile: ${PROFILES.browser.name}` },
    { id: "M3 the legacy profile WITH owner marks (reactBrowserBailout off, after S8) passes",
      doc: { bounds: [OWNED("chat-root", BAILOUT), OWNED("first-visit-primer", BAILOUT)] }, want: [], rules: [], expectReport: `boundary profile: ${PROFILES.legacy.name}` },
    { id: "M4 the page is the local build, whose reactBrowserBailout is true, and follows the browser-bailout profile: attested, passes",
      doc: { bounds: MODERN }, build: ATTESTED(true), want: [], rules: [], expectReport: "attested: the page is the local build t, whose resolved reactBrowserBailout is true → profile browser" },
    { id: "M5 the page is NOT the local build: reported not attested, read by its bytes (legacy, unowned) and passing", doc: {}, build: { deploymentId: "another", reactBrowserBailout: true },
      want: [], rules: [], expectReport: "not attested: the page's deployment t is not the local build's another" },
    { id: "N1 a blank stray data-dgst template outside every <!--$!--> FAILS", doc: { bounds: MODERN, extraMarkup: `<template data-dgst=""></template>` },
      want: ["boundary-digest"], rules: ["digest-stray"] },
    { id: "N2 one more browser bailout (empty digest, no owner) FAILS", doc: { bounds: [...MODERN, PRIMER("")] }, want: ["boundary-count", "boundary-owner"], rules: ["count", "blank-unowned"] },
    { id: "N3 an owned <!--$!--> whose template carries no data-dgst FAILS (the count and the owners still match)",
      doc: { bounds: [`<!--$!--><template></template><template ${OWNER_ATTR}="chat-root"></template><!--/$-->`, OWNED("first-visit-primer")] }, want: ["boundary-digest"], rules: ["formless"] },
    { id: "N4 an owned <!--$!--> with an ordinary error's digest FAILS", doc: { bounds: [OWNED("chat-root", "2389451097"), OWNED("first-visit-primer")] },
      want: ["boundary-digest"], rules: ["digest-unknown"] },
    { id: "N5 an owned <!--$!--> with the 404 digest FAILS", doc: { bounds: [OWNED("chat-root", "NEXT_HTTP_ERROR_FALLBACK;404"), OWNED("first-visit-primer")] },
      want: ["boundary-digest"], rules: ["digest-unknown"] },
    { id: "N6 a $RX beside owned boundaries FAILS", doc: { bounds: MODERN, rx: true }, want: ["boundary-rx"], rules: ["rx"] },
    { id: "N7 owned boundaries, no LazyOverlays in the RSC data: chatbotEnabled unread FAILS", doc: { bounds: MODERN, overlays: false }, want: ["chatbot-unread"], rules: ["chatbot-none"] },
    { id: "N8 owned boundaries, chatbotEnabled not a boolean: unreadable FAILS", doc: { bounds: MODERN, chatbot: "yes" }, want: ["chatbot-unread"], rules: ["chatbot-value"] },
    { id: "N9 the same owner on both boundaries FAILS (two marks, two boundaries)", doc: { bounds: [OWNED("first-visit-primer"), OWNED("first-visit-primer")] },
      want: ["boundary-owner"], rules: ["owner-twice", "census"] },
    { id: "N10 an owner twice inside one boundary's fallback FAILS",
      doc: { bounds: [blankForeign(`<template ${OWNER_ATTR}="chat-root"></template><template ${OWNER_ATTR}="chat-root"></template>`), OWNED("first-visit-primer")] },
      want: ["boundary-owner"], rules: ["blank-unowned", "owner-outside", "census"] },
    { id: "N11 an owner no overlay loader draws FAILS", doc: { bounds: [OWNED("chat-root"), OWNED("promo-banner")] }, want: ["boundary-owner"], rules: ["owner-unknown", "census"] },
    { id: "N12 an owner mark outside its boundary (the boundary's fallback empty, the mark after it) FAILS",
      doc: { bounds: [PRIMER(""), OWNED("first-visit-primer")], extraMarkup: `<template ${OWNER_ATTR}="chat-root"></template>` },
      want: ["boundary-owner"], rules: ["blank-unowned", "owner-outside", "census"] },
    { id: "N13 a third owner mark inside an ordinary (server-rendered) boundary FAILS", doc: { bounds: MODERN, extraMarkup: `<!--$--><template ${OWNER_ATTR}="chat-root"></template><!--/$-->` },
      want: ["boundary-owner"], rules: ["owner-outside"] },
    { id: "N14 same-count foreign-owner substitution: chatbotEnabled false, the one boundary owned by chat-root FAILS", doc: { chatbot: false, bounds: [OWNED("chat-root")] },
      want: ["boundary-owner"], rules: ["census"] },
    { id: "N15 same-count substitution: a foreign browser bailout with a fallback of its own in the primer's place FAILS",
      doc: { bounds: [OWNED("chat-root"), blankForeign(`<div class="kp-spinner" role="status"></div>`)] }, want: ["boundary-owner"], rules: ["blank-unowned", "census"] },
    { id: "N16 production's bytes before the marks: two EMPTY digests, no owner FAILS", doc: { bounds: [PRIMER(""), PRIMER("")] }, want: ["boundary-owner"], rules: ["blank-unowned", "census"] },
    { id: "N17 two profiles in one document (a legacy digest beside an empty one) FAILS", doc: { bounds: [OWNED("chat-root", BAILOUT), OWNED("first-visit-primer")] },
      want: ["boundary-digest"], rules: ["profiles-mixed"] },
    { id: "N18 legacy boundaries partly owned FAILS", doc: { bounds: [OWNED("chat-root", BAILOUT), PRIMER(BAILOUT)] }, want: ["boundary-owner"], rules: ["legacy-partly-owned", "census"] },
    { id: "N19 an owner mark with visible content beside it in the fallback FAILS",
      doc: { bounds: [blankForeign(`<template ${OWNER_ATTR}="chat-root"></template><p>Chat</p>`), OWNED("first-visit-primer")] },
      want: ["boundary-owner"], rules: ["blank-unowned", "owner-outside", "census"] },
    { id: "N20 a legacy boundary, unowned, whose fallback draws something (a foreign bail-out at the same count) FAILS",
      doc: { bounds: [`<!--$!--><template data-dgst="${BAILOUT}"></template><div class="kp-spinner"></div><!--/$-->`, PRIMER()] }, want: ["boundary-owner"], rules: ["legacy-fallback"] },
    { id: "N21 a <!--$!--> that never closes FAILS", doc: { bounds: MODERN, extraMarkup: `<!--$!--><template data-dgst=""></template>` },
      want: ["boundary-count", "boundary-digest", "boundary-owner"], rules: ["count", "formless", "blank-unowned"] },
    { id: "N22 the page is the local build (reactBrowserBailout true) but follows the legacy profile FAILS", doc: {}, build: ATTESTED(true),
      want: ["boundary-profile"], rules: ["profile-attested"] },
    { id: "N23 the page is the local build (reactBrowserBailout off) but follows the browser-bailout profile FAILS", doc: { bounds: MODERN }, build: ATTESTED(false),
      want: ["boundary-profile"], rules: ["profile-attested"] },
    { id: "N24 a mark carrying another attribute is no owner mark FAILS",
      doc: { bounds: [blankForeign(`<template ${OWNER_ATTR}="chat-root" data-x="1"></template>`), OWNED("first-visit-primer")] },
      want: ["boundary-owner"], rules: ["blank-unowned", "owner-outside", "census"] },
    { id: "N25 a <!--$!--> that never closes, a nested boundary inside its fallback, FAILS as unclosed (the nested closer is not its own)",
      doc: { bounds: MODERN, extraMarkup: `<!--$!--><template data-dgst=""></template><!--$--><p>x</p><!--/$-->` },
      want: ["boundary-count", "boundary-digest", "boundary-owner"], rules: ["count", "formless", "blank-unowned"] },
  );
  for (const c of cases) {
    const route = c.route ?? "/";
    const get = fakeSite({ [route]: { html: synthDoc(c.doc), status: c.status } }, chunks);
    let r;
    try {
      r = await readRoute(T, route, { get, table, build: c.build ?? null });
    } catch (e) {
      ok = false;
      lines.push(`  ✗ ${c.id} — threw ${e.stack ?? e}`);
      continue;
    }
    const kinds = [...new Set(r.failures.map((f) => f.kind))].sort();
    const rules = [...new Set(r.failures.map((f) => f.rule).filter(Boolean))].sort();
    let good = kinds.join(",") === [...c.want].sort().join(",");
    if (good && c.rules) good = rules.join(",") === [...c.rules].sort().join(",");
    if (good && c.expectText) good = r.markers.some((m) => m.text.includes(c.expectText));
    if (good && c.expectReport) good = r.reports.some((x) => x.includes(c.expectReport));
    if (good && c.id.startsWith("S1 ")) {
      good = r.controls.every((x) => x.in.length > 0) && r.markers.some((m) => m.row.id === "JourneyShellMark" && m.text.includes("by design")) &&
        r.init.length === 2 && r.pre.length === 1 && r.others.length === 1;
    }
    if (!good) ok = false;
    lines.push(`  ${good ? "✓" : "✗"} ${c.id}${good ? "" : ` — failures: ${kinds.join(",") || "none"} (wanted ${c.want.join(",") || "none"})` +
      `${c.rules ? `; rules ${rules.join(",") || "none"} (wanted ${c.rules.join(",") || "none"})` : ""}; ${r.failures.map((f) => f.text).join(" | ")}` +
      `${c.expectReport ? ` · reports: ${r.reports.join(" | ")}` : ""}`}`);
  }

  // ⭐ S8 — THE OWNER MARKS BOUND TO THEIR LOADERS (O): `overlayOwners` on this checkout's src, read into memory, and on
  // plants in that copy (the real files are never edited). Each plant must LAND (its anchor found and changed) and fail
  // for its own reason, named by the problem it must produce.
  const world = srcWorld(root);
  const ownerWorld = (edits) => {
    const w = new Map(world);
    for (const [file, from, to] of edits) {
      const s = w.get(file);
      if (typeof s !== "string" || !s.includes(from)) return null;
      if (to === null) w.delete(file);
      else w.set(file, s.replace(from, to));
    }
    return w;
  };
  const RAIL = "src/components/journey/tickets/ticket-switch-rail.tsx";
  const RAIL_LOADER = ".then((m) => m.Tabs).catch(nothingIfLost));";
  const relabelled = (owner) => [RAIL, RAIL_LOADER, `.then((m) => m.Tabs).catch(nothingIfLost), { ssr: false, loading: () => <template ${OWNER_ATTR}="${owner}" /> });`];
  const CHAT_OPTS = `{ ssr: false, loading: () => <template ${OWNER_ATTR}="chat-root" /> }`;
  const PRIMER_OPTS = `{ ssr: false, loading: () => <template ${OWNER_ATTR}="first-visit-primer" /> }`;
  const CHAT_MOUNT = "{chatbotEnabled && <ChatRoot supportEmail={supportEmail} />}";
  const swapped = (() => {
    const s = world.get(OVERLAY_SOURCE);
    if (typeof s !== "string" || !s.includes(CHAT_OPTS) || !s.includes(PRIMER_OPTS)) return null;
    const w = new Map(world);
    w.set(OVERLAY_SOURCE, s.replace(CHAT_OPTS, "\u0000").replace(PRIMER_OPTS, CHAT_OPTS).replace("\u0000", PRIMER_OPTS));
    return w;
  })();
  const plants = [
    { id: "O2 an unrelated bail-out relabelled as an allowed owner (the Tiketi rail's loader, ssr: false, drawing chat-root) FAILS",
      world: ownerWorld([relabelled("chat-root")]), expect: `${RAIL} draws 1 owner mark` },
    { id: "O3 the same, standing in for the chat bubble, whose mount is removed — the served bytes would read clean (two owned boundaries, chat-root and first-visit-primer) — FAILS",
      world: ownerWorld([relabelled("chat-root"), [OVERLAY_SOURCE, CHAT_MOUNT, ""]]), expect: `${RAIL} draws 1 owner mark` },
    { id: "O4 the two marks swapped between the loaders FAILS", world: swapped, expect: `drawing "first-visit-primer"` },
    { id: "O5 the chat bubble's loader renamed (m.ChatRoot → m.ChatWidget) FAILS", world: ownerWorld([[OVERLAY_SOURCE, "m.ChatRoot)", "m.ChatWidget)"]]), expect: "0 loader(s)" },
    { id: "O6 the primer's mark dropped from its loader FAILS", world: ownerWorld([[OVERLAY_SOURCE, PRIMER_OPTS, "{ ssr: false }"]]), expect: "a dynamic( call that is not" },
    { id: "O7 a third mark drawn in lazy-overlays.tsx, outside any loader FAILS",
      world: ownerWorld([[OVERLAY_SOURCE, "<FirstVisitPrimer />", `<FirstVisitPrimer />\n      <template ${OWNER_ATTR}="chat-root" />`]]), expect: "draws 3 owner mark(s) for 2 loader(s)" },
    { id: "O8 the chat bubble mounted without its chatbotEnabled gate FAILS", world: ownerWorld([[OVERLAY_SOURCE, CHAT_MOUNT, "<ChatRoot supportEmail={supportEmail} />"]]), expect: "chat-root: <ChatRoot> is mounted" },
    { id: "O9 the primer mounted behind a condition FAILS",
      world: ownerWorld([[OVERLAY_SOURCE, "<FirstVisitPrimer />", "{chatbotEnabled && <FirstVisitPrimer />}"]]), expect: "first-visit-primer: <FirstVisitPrimer> is mounted" },
    { id: "O10 `ssr: false` dropped from the chat bubble's loader FAILS", world: ownerWorld([[OVERLAY_SOURCE, CHAT_OPTS, `{ loading: () => <template ${OWNER_ATTR}="chat-root" /> }`]]), expect: "a dynamic( call that is not" },
    { id: "O11 lazy-overlays.tsx gone FAILS", world: ownerWorld([[OVERLAY_SOURCE, "dynamic(", null]]), expect: "is gone" },
    { id: "O12 a third loader in lazy-overlays.tsx, drawing a mark of its own, that no row names FAILS",
      world: ownerWorld([[OVERLAY_SOURCE, "\nexport function LazyOverlays(", "\nconst PromoBanner = dynamic(() => import(\"@/components/promo/banner\").then((m) => m.PromoBanner)" +
        `.catch(nothingIfLost), { ssr: false, loading: () => <template ${OWNER_ATTR}="promo-banner" /> });\nexport function LazyOverlays(`]]),
      expect: "a loader no row of OVERLAY_OWNERS names" },
    { id: "O13 no file under src/ at all FAILS (a binding over nothing proves nothing)", world: new Map(), expect: "no file under src/" },
  ];
  const real = overlayOwners(world);
  const realGood = real.ok && real.owners === OVERLAY_OWNERS && world.size > 0;
  if (!realGood) ok = false;
  lines.push(`  ${realGood ? "✓" : "✗"} O1 this checkout's lazy-overlays.tsx binds both owner marks to their loaders and mounts, and no other file in src draws one (${world.size} files read)` +
    `${realGood ? "" : ` — ${real.problems.join(" | ")}`}`);
  for (const p of plants) {
    const r = p.world ? overlayOwners(p.world) : null;
    const good = r !== null && !r.ok && r.problems.some((x) => x.includes(p.expect));
    if (!good) ok = false;
    lines.push(`  ${good ? "✓" : "✗"} ${p.id}${good ? "" : r === null ? " — the plant did not land (its anchor is gone): re-anchor it" : ` — wanted a problem naming ${JSON.stringify(p.expect)}; got ${r.ok ? "none" : r.problems.join(" | ")}`}`);
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
  // ⭐ S8: the owner marks bound to their loaders in this checkout's source, or no verdict (see `overlayOwners`).
  const bound = overlayOwners(srcWorld(root));
  if (!bound.ok) {
    console.log(`[qa:chunks-prod] the overlays' owner marks are not bound to their loaders in src/: no verdict is read.`);
    for (const p of bound.problems) console.log(`  ✗ ${p}`);
    return 1;
  }
  console.log(`[qa:chunks-prod] the owner marks are bound to ${OVERLAY_SOURCE}'s loaders: ${bound.owners.map((o) => `${o.owner} (${o.part}, ${o.mount})`).join(" · ")}`);
  const build = localBuildOf(root);
  console.log(`[qa:chunks-prod] the local build: ${build ? `deployment ${build.deploymentId ?? "(none)"}, reactBrowserBailout ${JSON.stringify(build.reactBrowserBailout)}` : "none (.next/required-server-files.json unread)"}`);

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
    const r = await readRoute(origin, route, { get, owners: bound.owners, build });
    printRoute(r);
    if (r.failures.length) bad++;
  }
  console.log(`\n${bad ? "FAIL" : "PASS"} — qa:chunks-prod at ${origin}: ${routes.length - bad}/${routes.length} route(s) held every rule (${cache.size} GETs)`);
  return bad ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}
