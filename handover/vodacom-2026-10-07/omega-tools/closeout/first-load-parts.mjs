// Node port of handover tools/wp6c/first-load-parts.py (WP6c, READ-ONLY): which of AppShell's lazily loaded parts a
// page loads UP FRONT, read from a real `next build` (.next), two ways, plus the control.
//   usage: node first-load-parts.mjs <repo> [route ...] [--no-expect]   (default routes: /, /markets, /positions, /help)
// STRUCTURAL: every `next/dynamic` call carries `loadableGenerated: { modules: [id] }` in the server chunks; the route's
// react-loadable manifest maps that id to its chunk files, compared with the route's client-reference entryJSFiles:
// "own chunk" (none of its files is an entry file), "FIRST LOAD" (one is), or "no files of its own".
// MARKERS: a string only that part's module holds, searched in the entry files.
// CONTROL: the classic bar's deposit test id must be in the entry files, or the reading proves nothing.
// Exit 0 when every route was read, its control found and (unless --no-expect) every verdict as expected; 1 otherwise.
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const EXPECT_ON = !argv.includes("--no-expect");
const args = argv.filter((a) => a !== "--no-expect");
const ROOT = args.length && !args[0].startsWith("/") ? args.shift() : "F:/kipindi-a8i2";
const ROUTES = args.length ? args : ["/", "/markets", "/positions", "/help"];
const NEXT = path.join(ROOT, ".next");
const PARTS = {
  OfflineBanner: "warning-bg) 88%",
  PullToRefresh: "opacity var(--t-flick)",
  WinCelebrationHost: "50pick:celebrate",
  NotifyPoller: "50pick-notify-seen-positions",
  EventStreamProvider: "/api/events",
  InstallInvite: "50pick-install-visits",
  ConsentPrompt: "kp-consent-force",
  ChannelsPanel: "50pick-channels-shown",
  JourneyFlag: null,
  JourneyTopBar: "kp-jhdr__row",
  JourneyTabs: '"journey-tabs"',
  SellResultHost: "input, select, textarea, [contenteditable]",
};
const CONTROL = "deposit-header";
const LOADABLE = /\.then\((\w+)=>\1\.(\w+)\)(?:\.catch\([^()]*\))?,\{[^{}]*?loadableGenerated:\{modules:\[([^\]]*)\]\}/g;
const EXPECT = {
  OfflineBanner: ["no next/dynamic entry", "IN the first load"],
  WinCelebrationHost: [null, "IN the first load"],
  JourneyFlag: ["own chunk", "-"],
};
const MANIFEST_KEY = /__RSC_MANIFEST\["([^"]+)"\] *= */g;

if (!fs.existsSync(NEXT) || !fs.statSync(NEXT).isDirectory()) {
  console.log("NOT MEASURED: no .next build at", NEXT);
  process.exit(2);
}
const read = (p) => fs.readFileSync(p, "utf8");
function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith(".js")) out.push(p);
  }
  return out;
}

// module id -> the component its next/dynamic picks, from the server chunks
const symbolOf = new Map();
for (const p of walk(path.join(NEXT, "server"))) {
  for (const m of read(p).matchAll(LOADABLE)) {
    for (const raw of m[3].split(",")) {
      const mid = raw.trim().replace(/^"|"$/g, "");
      if (!symbolOf.has(mid)) symbolOf.set(mid, new Set());
      symbolOf.get(mid).add(m[2]);
    }
  }
}

function routeDir(route) {
  const seg = route.replace(/^\/+|\/+$/g, "");
  return path.join(NEXT, "server", "app", ...(seg ? seg.split("/") : []));
}
function entryFiles(route) {
  const p = routeDir(route) + "_client-reference-manifest.js";
  const alt = path.join(routeDir(route), "page_client-reference-manifest.js");
  const file = fs.existsSync(alt) ? alt : fs.existsSync(p) ? p : null;
  if (!file) return null;
  const text = read(file);
  const out = new Set();
  for (const m of text.matchAll(MANIFEST_KEY)) {
    const start = m.index + m[0].length;
    let depth = 0, i = start;
    while (i < text.length) {
      const ch = text[i];
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) break; }
      else if (ch === '"') {
        i++;
        while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
      }
      i++;
    }
    const obj = JSON.parse(text.slice(start, i + 1));
    for (const files of Object.values(obj.entryJSFiles || {})) for (const f of files) out.add(f);
  }
  return out;
}
function loadable(route) {
  const p = path.join(routeDir(route), "page", "react-loadable-manifest.json");
  return fs.existsSync(p) ? JSON.parse(read(p)) : null;
}
const staticText = (rel) => {
  const p = path.join(NEXT, ...rel.split("/"));
  return fs.existsSync(p) ? read(p) : "";
};

let bad = 0;
for (const route of ROUTES) {
  const entries = entryFiles(route);
  const lm = loadable(route);
  if (entries === null || lm === null) {
    console.log(`${route}: NOT MEASURED (no client-reference or react-loadable manifest)`);
    bad = 1;
    continue;
  }
  const first = [...entries].sort().map(staticText).join("");
  const control = first.includes(CONTROL);
  console.log(`${route}: ${entries.size} entry JS files, ${first.length} chars; control (classic deposit test id) ${control ? "FOUND" : "MISSING"}`);
  if (!control) bad = 1;
  const bySymbol = new Map();
  for (const [mid, row] of Object.entries(lm)) {
    for (const sym of symbolOf.get(String(mid)) ?? new Set(["?"])) {
      if (!bySymbol.has(sym)) bySymbol.set(sym, []);
      bySymbol.get(sym).push([mid, row.files || []]);
    }
  }
  for (const [sym, marker] of Object.entries(PARTS)) {
    const rows = bySymbol.get(sym) ?? [];
    let struct;
    if (rows.length) {
      const all = [...new Set(rows.flatMap(([, files]) => files))].sort();
      const inFirst = all.filter((f) => entries.has(f));
      if (!all.length) struct = "no files of its own";
      else if (inFirst.length) struct = "FIRST LOAD (" + inFirst.map((x) => x.split("/").pop()).join(", ") + ")";
      else struct = `own chunk (${all.length} file${all.length !== 1 ? "s" : ""})`;
    } else struct = "no next/dynamic entry";
    const mark = marker === null ? "-" : first.includes(marker) ? "IN the first load" : "not in the first load";
    let verdict = "";
    if (EXPECT_ON) {
      const [wantS, wantM] = EXPECT[sym] ?? ["own chunk", "not in the first load"];
      const good = (wantS === null || struct.startsWith(wantS)) && mark === wantM;
      verdict = good ? "as expected" : "UNEXPECTED";
      if (!good) bad = 1;
    }
    console.log(`    ${sym.padEnd(22)} structural: ${struct.padEnd(40)} marker: ${mark.padEnd(24)} ${verdict}`);
  }
  const others = [...bySymbol.keys()].filter((s) => !(s in PARTS)).sort();
  if (others.length) console.log("    other next/dynamic parts on this route:", others.join(", "));
}
process.exit(bad);
