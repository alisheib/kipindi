/**
 * `npm run qa:first-load` — WHAT A PAGE LOADS UP FRONT, read from ONE local production build (`next build`, `.next`)
 * that this script ties to the commit it was built from.
 *
 * S7-PLAN A9 (2) (docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md). The tracked Node port of WP6c's
 * instruments, which lived only in a session scratchpad (and the repo tracks no Python): `first-load-parts.py` with
 * `first-load.py`, and `build-detached.sh` — branch `vodacom-handover`, handover/vodacom-2026-10-07/tools/wp6c/ — after
 * the first Node port of first-load-parts.py (omega-tools/closeout/first-load-parts.mjs, same branch).
 *
 * USAGE. Routes are written WITHOUT their leading slash, comma-separated, and `index` is `/` (see ROUTES below):
 *   npm run -s qa:first-load -- --self-test             the controls, on a fixture build this script writes (no build)
 *   npm run -s qa:first-load -- --build [--log <file>]  refuse a dirty tree, build at HEAD, write .next/kp-head
 *   npm run -s qa:first-load -- --read [--routes index,live,markets/[id]] [--no-expect]
 *   npm run -s qa:first-load -- --build --read --log <file>    build, then read the build
 *   npm run -s qa:first-load -- --build --detach --log <file>  the build in a process of its own (DETACHED below)
 *   --dry-run (with --build): every refusal is checked and the command printed; nothing is deleted or built.
 * Exit: 0 every route read, its control found and every verdict as expected · 1 a failure · 2 refused or not measured.
 *
 * ⭐ WHAT IT READS (first-load-parts.py's two ways, kept). For each route, the client-reference manifest's entryJSFiles
 * are the chunks the browser is told to load before anything renders; a module reached only through a client-side
 * dynamic import is not among them. STRUCTURAL: every `next/dynamic` call carries `loadableGenerated: { modules: [id] }`,
 * the route's react-loadable manifest maps that id to its chunk files, and those are compared with the entry files:
 * "own chunk" (none is an entry file), "FIRST LOAD" (one is), "no files of its own" (its module already loads with the
 * page) or "no next/dynamic entry". MARKERS: a string only one module in src/ holds, searched in the entry files; and
 * where each marker sits across the whole build. A row marked `module` is also read by the route's clientModules: is
 * that file a client reference of the route, and is its chunk an entry file.
 *
 * ⭐ TIED TO HEAD (A9). A local build records no commit: deploymentId is set only on Railway (next.config.ts:42-45).
 * So `--build` refuses a dirty tree (`git status --porcelain -- src scripts package.json` not empty), and once the build
 * exits 0 — with HEAD unmoved and the tree still clean — writes `.next/kp-head` with `git rev-parse HEAD`. `--read`
 * refuses any .next whose kp-head is missing or is not HEAD, so a stale .next from another tree (S6's last build) is
 * never read as S7's.
 *
 * ⭐ THE CONTROLS, which must pass before any verdict is read (A9):
 *   · on the real build: the classic deposit test id (`deposit-header`) is found in every route's entry files, and a
 *     journey marker planted IN MEMORY into one route's entry set is reported. Either failing: no verdict is printed.
 *   · on a fixture build this script writes to a temp folder (`--self-test`, also run first by every `--read`): the
 *     same reader must find the control, report the in-memory plant, fail a route with no control, fail a part whose
 *     own chunk joined an entry set, fail a marker held by two files in src/, refuse a .next tied to another commit,
 *     refuse a Git-Bash-rewritten route, and judge an S7 row only once its WP has landed its files.
 *
 * ⭐ ROUTES (first-load-parts.py:4: "From Git Bash ... a route "/" becomes "C:/Program Files/Git/""). Git Bash rewrites
 * any argument that starts with "/" (and the part after `=`). So a route is written without the slash (`markets`,
 * `markets/[id]`, `index` for `/`), and an argument that starts with "/" or looks like a rewritten Windows path is
 * refused with the reason, never read. Quote a route holding brackets in a POSIX shell: `--routes 'index,markets/[id]'`.
 * Default: S6's four (/, /markets, /positions, /help), S7's (/live, /results, /watchlist, /markets/[id], /account per
 * A20) and /updown/history (A23 (d): the rail wrapper's chunk, proved by this tool).
 *
 * ⭐ DETACHED (build-detached.sh: "one production build under the heavy lock, detached ... writes <log>.done with the
 * exit code"). A build is a heavy job, so it runs under the machine's shared lock. Two ways:
 *   · the caller detaches: run `--build --log <file>` in the background inside the lock wrapper. `--build` blocks until
 *     the build ends, so the wrapper holds the lock for the whole build. On OMEGA-COMPILE01:
 *       LOCK_ME=<session> bash F:/kipindi-locks/withlock.sh s7-first-load node scripts/qa-first-load.mjs --build --log <f>
 *   · this script detaches: `--build --detach --log <file>` starts `--build` in a process of its own and returns at
 *     once. ⛔ A lock wrapper put AROUND `--detach` would be released while the build runs, so the wrapper goes INSIDE:
 *     QA_FIRST_LOAD_LOCK names its command prefix (split on spaces), e.g.
 *       QA_FIRST_LOAD_LOCK="bash F:/kipindi-locks/withlock.sh s7-first-load" LOCK_ME=<session> npm run -s qa:first-load -- --build --detach --log <f>
 *     Without QA_FIRST_LOAD_LOCK, `--detach` refuses unless `--no-lock` says the caller chose to build without one.
 *   Either way `<file>` gets the build's output and `<file>.done` gets `exit=<code>` (every refusal included).
 * ⛔ TURBOPACK AND A LINKED node_modules. Production builds with Turbopack (Next 16's default, package.json "build"), and
 * Turbopack refuses a node_modules that links outside the tree ("Symlink [project]/node_modules is invalid, it points
 * out of the filesystem root"), as the side worktrees on OMEGA-COMPILE01 have it. `--build` refuses such a tree rather
 * than build with webpack, whose chunk graph is not production's. Replace the link with a real install first: remove
 * the link only (`cmd //c rmdir node_modules`, never rm -rf, which would empty the target), then `npm ci` and
 * `npx prisma generate`.
 *
 * ⭐ THE MARKER TABLE lives here (A9), and the script fails if any marker is not unique in src/: every file under src/
 * is read, and a row's marker must be held by exactly one file, the file the row names. qa:chunks-prod imports the same
 * table. Changes from WP6c's table (first-load-parts.py:34-48), each because the old marker was not unique in src/
 * on 2026-10-08:
 *   · EventStreamProvider: '/api/events' (held by five files: the SSE hook and four server modules) became
 *     'EventSource(' — the provider mounts `useEventStream`, whose `new EventSource("/api/events")` is that string's
 *     only home;
 *   · JourneyTopBar: 'kp-jhdr__row' (also in globals.css) became '"journey-top-bar"', the header's test id.
 * Two reader fixes over the ports: a module id the minifier wrote as `51e3` is the manifest's 51000 (the ports read
 * that part as "no next/dynamic entry"), and the client chunks are scanned too, since an `ssr: false` part's loader is
 * dropped from the server chunks (lazy-overlays' ChatRoot and FirstVisitPrimer were "?" in the ports).
 * ⭐ S7's ROWS ARE LIVE AND WAIT FOR THEIR WP. Each S7 row names the file its WP adds (S7-PLAN WP5 and WP6 Files). While
 * that file does not exist the row is PENDING: no verdict, and its marker must be held by NO file in src/ (a holder
 * elsewhere means the table names the wrong file). Once the file exists the row is checked like S6's: a null marker
 * then FAILS ("give the row its marker"), and so does a marker held anywhere but that file. A row with `mountedBy` is
 * judged on the routes only once that file exists too (WP7 mounts the home's lazy module through journey-home.tsx).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT = fileURLToPath(import.meta.url);

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE MARKER TABLE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/** The classic bar's test ids, which every page loads up front. The first is A9 (2)'s control; qa:chunks-prod needs both. */
export const CONTROLS = [
  { id: "classic deposit (top bar)", stage: "control", file: "src/components/layout/top-app-bar.tsx", marker: "deposit-header" },
  { id: "classic deposit (rail)", stage: "control", file: "src/components/layout/bottom-nav.tsx", marker: "deposit-rail" },
];

const OWN_CHUNK = () => ({ struct: "own chunk", marker: "out" });

/**
 * One row per part or marker. `part`: the export a `next/dynamic` loader picks (`.then((m) => m.X)`), read structurally.
 * `module`: also read by the route's clientModules. `marker`: a string only `file` holds in src/ (null: structural
 * only). `expect(route)`: the verdict this route must show ({ struct: prefix | null, module: "in" | "out",
 * marker: "in" | "out" }); null reports without a verdict. `journey`: qa:chunks-prod requires it absent from a classic
 * page's initial scripts, except where `byDesign` says ("every page", or "/" alone).
 */
export const MARKERS = [
  // ─── S6 — WP6c's table (first-load-parts.py:34-48, first-load.py:15-22), the shell's deferred parts ───────────────
  // The offline banner is imported statically by AppShell on purpose (shell-lazy.tsx: "THE OFFLINE BANNER IS NOT HERE").
  { id: "OfflineBanner", stage: "S6", part: "OfflineBanner", file: "src/components/ui/offline-banner.tsx", marker: "warning-bg) 88%",
    expect: () => ({ struct: "no next/dynamic entry", marker: "in" }) },
  { id: "PullToRefresh", stage: "S6", part: "PullToRefresh", file: "src/components/ui/pull-to-refresh.tsx", marker: "opacity var(--t-flick)", expect: OWN_CHUNK },
  // Its module already loads with every page: away-summary-bar.tsx imports dispatchWinCelebration from it.
  { id: "WinCelebrationHost", stage: "S6", part: "WinCelebrationHost", file: "src/components/markets/win-celebration.tsx", marker: "50pick:celebrate",
    expect: () => ({ struct: null, marker: "in" }) },
  { id: "NotifyPoller", stage: "S6", part: "NotifyPoller", file: "src/components/markets/notify-poller.tsx", marker: "50pick-notify-seen-positions", expect: OWN_CHUNK },
  // The provider holds no string of its own; the hook it mounts does (see the header: '/api/events' was not unique).
  { id: "EventStreamProvider", stage: "S6", part: "EventStreamProvider", file: "src/lib/use-event-stream.ts", marker: "EventSource(", expect: OWN_CHUNK },
  { id: "InstallInvite", stage: "S6", part: "InstallInvite", file: "src/components/pwa/install-invite.tsx", marker: "50pick-install-visits", expect: OWN_CHUNK },
  { id: "ConsentPrompt", stage: "S6", part: "ConsentPrompt", file: "src/components/analytics/consent-prompt.tsx", marker: "kp-consent-force", expect: OWN_CHUNK },
  { id: "ChannelsPanel", stage: "S6", part: "ChannelsPanel", file: "src/components/social/channels-panel.tsx", marker: "50pick-channels-shown", expect: OWN_CHUNK },
  // S6 A8h's sale-result host, signed in only: the field selector its NOWHERE test uses is its module's own string.
  { id: "SellResultHost", stage: "S6", part: "SellResultHost", file: "src/components/markets/sell-result-host.tsx", marker: "input, select, textarea, [contenteditable]", expect: OWN_CHUNK },
  // The flag's one call, raiseJourneyFlag, is defined in journey-on.ts, which every page loads by design: no marker.
  { id: "JourneyFlag", stage: "S6", journey: true, part: "JourneyFlag", file: "src/components/journey/journey-flag.tsx", marker: null,
    expect: () => ({ struct: "own chunk" }) },
  { id: "JourneyTopBar", stage: "S6", journey: true, part: "JourneyTopBar", file: "src/components/journey/journey-top-bar.tsx", marker: '"journey-top-bar"', expect: OWN_CHUNK },
  { id: "JourneyTabs", stage: "S6", journey: true, part: "JourneyTabs", file: "src/components/journey/journey-tabs.tsx", marker: '"journey-tabs"', expect: OWN_CHUNK },
  // The shell's mark: journey-on.ts brings shell-mark.ts into every page by design (VODACOM-PLAN.md:528). Reported only.
  { id: "JourneyShellMark", stage: "S6", journey: true, byDesign: "every page", file: "src/lib/journey/shell-mark.ts", marker: "kp-journey-shell",
    expect: () => null },

  // ─── S7 — A9 (2): the home lazy module's chunk, the How-to card, the How-to sheet and the journey card ──────────────
  // ⛔ Each row is PENDING until its WP adds `file` (see the header). Where each marker gets added:
  //   · HomeLazy — S7 WP6 adds home-lazy.tsx ("use client"; S7-PLAN WP6 Files and step 2) and WP7 mounts it from
  //     journey-home.tsx. WP6 sets `marker` here to a string LITERAL only home-lazy.tsx holds in src/ (a comment or an
  //     identifier does not survive the minifier: none of its loader lines is unique, since HowToCard is
  //     howto-card.tsx's export and LazyHowToCard is imported by journey-home.tsx). qa:chunks-prod reports that marker
  //     on / and fails it on any other route (A9 (3), A23 (d)).
  //   · HowToCard — WP6, howto-card.tsx: `data-testid="journey-howto-card"` (WP6 step 3), a next/dynamic part of
  //     home-lazy.tsx, so an own chunk on / once WP7 mounts it.
  //   · HowToSheet — WP6, onboarding/how-to-play-sheet.tsx: `data-testid="journey-howto-sheet"` (WP6 step 4), imported by
  //     the card, so in the card's chunk and never in a first load.
  //   · JourneyCard — WP5, cards/journey-card.tsx: `data-testid="journey-card"` (WP5 step 2), a server component (no
  //     directive), so in no client chunk at all.
  { id: "HomeLazy", stage: "S7", wp: "WP6", journey: true, byDesign: "/", module: true,
    file: "src/components/journey/home/home-lazy.tsx", mountedBy: "src/components/journey/home/journey-home.tsx", marker: null,
    expect: (route) => (route === "/" ? { module: "in", marker: "in" } : { module: "out", marker: "out" }) },
  { id: "HowToCard", stage: "S7", wp: "WP6", journey: true, part: "HowToCard",
    file: "src/components/journey/home/howto-card.tsx", mountedBy: "src/components/journey/home/journey-home.tsx", marker: '"journey-howto-card"',
    expect: (route) => ({ struct: route === "/" ? "own chunk" : "no next/dynamic entry", marker: "out" }) },
  { id: "HowToSheet", stage: "S7", wp: "WP6", journey: true,
    file: "src/components/onboarding/how-to-play-sheet.tsx", marker: '"journey-howto-sheet"', expect: () => ({ marker: "out" }) },
  { id: "JourneyCard", stage: "S7", wp: "WP5", journey: true,
    file: "src/components/journey/cards/journey-card.tsx", marker: '"journey-card"', expect: () => ({ marker: "out" }) },
];

/** S6's four (first-load-parts.py:32), S7's (A9 (2), A20 item 6) and /updown/history (A23 (d)). */
export const DEFAULT_ROUTES = ["/", "/markets", "/positions", "/help", "/live", "/results", "/watchlist", "/markets/[id]", "/account", "/updown/history"];

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS (qa:chunks-prod imports these)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Routes as written on the command line → app routes. No leading slash (Git Bash rewrites it); `index` is `/`.
 * Returns { routes, errors }: an argument Git Bash rewrote, or one with a leading slash, is an error with its reason.
 */
export function parseRoutes(list) {
  const routes = [];
  const errors = [];
  for (const raw of String(list).split(",").map((s) => s.trim()).filter(Boolean)) {
    if (/^[A-Za-z]:[\\/]/.test(raw) || /Program Files[\\/]Git/i.test(raw)) {
      errors.push(`"${raw}": Git Bash rewrote a leading-slash route into a Windows path. Write it without the slash ("markets"; "index" for /).`);
    } else if (raw.startsWith("/")) {
      errors.push(`"${raw}": write the route without its leading slash ("${raw.replace(/^\/+/, "") || "index"}"): Git Bash rewrites any argument that starts with "/".`);
    } else if (raw === "index") {
      routes.push("/");
    } else if (!/^[\w.@()[\]-]+(?:\/[\w.@()[\]-]+)*\/?$/.test(raw)) {
      errors.push(`"${raw}": not a route (letters, digits, - _ . @ ( ) [ ] and inner slashes).`);
    } else {
      routes.push("/" + raw.replace(/\/+$/, ""));
    }
  }
  return { routes, errors };
}

/** Every file under `dir`, as paths relative to `root` with forward slashes. */
function listFiles(root, dir, out = []) {
  let names;
  try {
    names = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const d of names) {
    const rel = dir + "/" + d.name;
    if (d.isDirectory()) listFiles(root, rel, out);
    else if (d.isFile()) out.push(rel);
  }
  return out;
}

const exists = (root, rel) => Boolean(rel) && fs.existsSync(path.join(root, rel));

/**
 * The table's own check (A9: "the script fails if any marker is not unique in src/"). Reads every file under
 * `root`/src. Returns { ok, lines, rows: Map(id → { landed, judged, holders }) }.
 */
export function checkMarkerTable(root, table = [...CONTROLS, ...MARKERS]) {
  const files = listFiles(root, "src");
  const texts = files.map((f) => [f, fs.readFileSync(path.join(root, f), "latin1")]);
  const lines = [];
  const rows = new Map();
  let ok = files.length > 0;
  if (!ok) lines.push(`✗ no file under ${root.replace(/\\/g, "/")}/src: the table cannot be checked`);
  const seen = new Map();
  for (const row of table) {
    const landed = exists(root, row.file);
    const mounted = !row.mountedBy || exists(root, row.mountedBy);
    const holders = row.marker ? texts.filter(([, t]) => t.includes(row.marker)).map(([f]) => f) : [];
    const tag = `${row.stage}${row.wp ? " " + row.wp : ""} ${row.id}`;
    const shown = row.marker === null ? "(no marker)" : JSON.stringify(row.marker);
    let bad = null;
    let note = "";
    if (row.marker !== null && seen.has(row.marker)) bad = `the same marker as ${seen.get(row.marker)}`;
    if (row.marker !== null) seen.set(row.marker, row.id);
    if (!bad && !landed && row.stage === "S7") {
      if (holders.length) bad = `PENDING (${row.file} does not exist yet) but already held by ${holders.join(", ")}: the row names the wrong file, or the marker is not unique`;
      else note = `PENDING: ${row.wp} has not added ${row.file}`;
    } else if (!bad && !landed) {
      bad = `its file ${row.file} is gone`;
    } else if (!bad && row.marker === null) {
      if (row.stage === "S7") bad = `${row.wp} has added ${row.file}: give the row its marker (see the S7 block)`;
      else note = "structural only, no marker";
    } else if (!bad && (holders.length !== 1 || holders[0] !== row.file)) {
      bad = `not unique in src/: held by ${holders.length ? holders.join(", ") : "no file"} (want ${row.file} alone)`;
    } else if (!bad) {
      note = `unique in src/ (${row.file})${landed && !mounted ? `; PENDING on the routes until ${row.mountedBy} exists` : ""}`;
    }
    if (bad) ok = false;
    rows.set(row.id, { landed, judged: landed && mounted && !bad, holders });
    lines.push(`${bad ? "✗" : "✓"} ${tag.padEnd(28)} ${shown.padEnd(46)} ${bad ?? note}`);
  }
  return { ok, lines, rows };
}

/** Index of the brace closing the object that opens at `start` (JSON strings skipped). -1 if none. */
export function matchBrace(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      i++;
      while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
    } else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const base = (f) => f.split("/").pop();
const kb = (n) => (n / 1024).toFixed(1) + " KB";

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE READER
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/** first-load-parts.py:51. `$1` is the loader's parameter, `$2` the export it picks, `$3` the module ids. */
const LOADABLE = /\.then\((\w+)=>\1\.(\w+)\)(?:\.catch\([^()]*\))?,\{[^{}]*?loadableGenerated:\{modules:\[([^\]]*)\]\}/g;
/** first-load-parts.py:57. */
const MANIFEST_KEY = /__RSC_MANIFEST\["([^"]+)"\] *= */g;
/** A module id as the manifest keys it: the minifier writes 51000 as `51e3`. */
const normId = (raw) => {
  const s = String(raw).trim().replace(/^"|"$/g, "");
  return /^\d+(?:\.\d+)?(?:e\d+)?$/i.test(s) ? String(Number(s)) : s;
};
/** A chunk path as entryJSFiles writes it: `static/chunks/x.js`. */
const normFile = (f) => String(f).replace(/^\/?_next\//, "").replace(/\?.*$/, "");

/** module id → the exports its next/dynamic loaders pick, from the server AND the client chunks. */
function readSymbols(nextDir) {
  const symbolOf = new Map();
  for (const sub of ["server", "static"]) {
    for (const rel of listFiles(nextDir, sub)) {
      if (!rel.endsWith(".js")) continue;
      const t = fs.readFileSync(path.join(nextDir, rel), "utf8");
      if (!t.includes("loadableGenerated")) continue;
      for (const m of t.matchAll(LOADABLE)) {
        for (const raw of m[3].split(",")) {
          const id = normId(raw);
          if (!id) continue;
          if (!symbolOf.has(id)) symbolOf.set(id, new Set());
          symbolOf.get(id).add(m[2]);
        }
      }
    }
  }
  return symbolOf;
}

/** A route's client-reference manifest: its entry files and its client modules (src path → chunk files). */
function readManifest(file) {
  const text = fs.readFileSync(file, "utf8");
  const entries = new Set();
  const clientModules = new Map();
  for (const m of text.matchAll(MANIFEST_KEY)) {
    const start = m.index + m[0].length;
    const end = matchBrace(text, start);
    if (end < 0) throw new Error(`unreadable manifest ${file}`);
    const obj = JSON.parse(text.slice(start, end + 1));
    for (const files of Object.values(obj.entryJSFiles ?? {})) for (const f of files) entries.add(normFile(f));
    for (const [key, mod] of Object.entries(obj.clientModules ?? {})) {
      const p = key.replace(/\\/g, "/").replace(/ <module evaluation>$/, "").replace(/ \[[^\]]*\].*$/, "");
      const at = p.startsWith("[project]/") ? "[project]/".length : p.indexOf("/src/") + 1;
      if (at <= 0 && !p.startsWith("src/")) continue;
      const src = p.slice(Math.max(at, 0));
      if (!clientModules.has(src)) clientModules.set(src, new Set());
      for (const c of mod.chunks ?? []) if (String(c).endsWith(".js")) clientModules.get(src).add(normFile(c));
    }
  }
  return { entries, clientModules };
}

/** Everything a reading needs from one build: the symbol map and every client chunk's text. */
export function loadBuild(nextDir) {
  const chunks = new Map();
  for (const rel of listFiles(nextDir, "static/chunks")) {
    if (rel.endsWith(".js")) chunks.set(rel, fs.readFileSync(path.join(nextDir, rel), "utf8"));
  }
  return { nextDir, symbolOf: readSymbols(nextDir), chunks };
}

const routeDir = (nextDir, route) => path.join(nextDir, "server", "app", ...route.split("/").filter(Boolean));

/** One route's entry set and loadable parts. `plant`: a text added IN MEMORY to its entry set (the control). */
export function readRoute(build, route, plant = null) {
  const dir = routeDir(build.nextDir, route);
  const mf = path.join(dir, "page_client-reference-manifest.js");
  const lmf = path.join(dir, "page", "react-loadable-manifest.json");
  if (!fs.existsSync(mf) || !fs.existsSync(lmf)) {
    return { route, missing: `no ${fs.existsSync(mf) ? "react-loadable" : "client-reference"} manifest at ${path.relative(build.nextDir, fs.existsSync(mf) ? lmf : mf).replace(/\\/g, "/")}` };
  }
  const { entries, clientModules } = readManifest(mf);
  const texts = [...entries].sort().map((f) => ({ f, t: build.chunks.get(f) ?? null }));
  if (plant !== null) texts.push({ f: "(planted in memory)", t: plant });
  const lm = JSON.parse(fs.readFileSync(lmf, "utf8"));
  const parts = new Map(); // export → [{ id, files }]
  for (const [key, row] of Object.entries(lm)) {
    const id = normId(row?.id ?? key);
    for (const sym of build.symbolOf.get(id) ?? build.symbolOf.get(normId(key)) ?? new Set(["?"])) {
      if (!parts.has(sym)) parts.set(sym, []);
      parts.get(sym).push({ id, files: (row?.files ?? []).map(normFile) });
    }
  }
  return { route, build, entries, clientModules, texts, parts, unreadable: texts.filter((x) => x.t === null).map((x) => x.f) };
}

/** first-load-parts.py:135-145. */
function structOf(reading, sym) {
  const rows = reading.parts.get(sym) ?? [];
  if (!rows.length) return "no next/dynamic entry";
  const all = [...new Set(rows.flatMap((r) => r.files))].sort();
  const inFirst = all.filter((f) => reading.entries.has(f));
  if (!all.length) return "no files of its own";
  if (inFirst.length) return "FIRST LOAD (" + inFirst.map(base).join(", ") + ")";
  return `own chunk (${all.map((f) => `${base(f)} ${kb(reading.build.chunks.get(f)?.length ?? 0)}`).join(", ")})`;
}

function moduleOf(reading, file) {
  const chunks = [...(reading.clientModules.get(file) ?? [])].sort();
  if (!reading.clientModules.has(file)) return { in: false, text: "not a client reference here" };
  const inFirst = chunks.filter((c) => reading.entries.has(c));
  return { in: inFirst.length > 0, text: `client reference (${chunks.map(base).join(", ") || "no chunk"}${inFirst.length ? "; in the first load" : "; not an entry file"})` };
}

/** One row on one route. Returns null for a row not judged here (PENDING), else { struct, module, mark, verdict, bad }. */
export function judgeRow(row, reading, judged, expectOn) {
  if (!judged) return null;
  const struct = row.part ? structOf(reading, row.part) : null;
  const mod = row.module ? moduleOf(reading, row.file) : null;
  let mark = "-";
  if (row.marker) {
    const holders = reading.texts.filter((x) => x.t && x.t.includes(row.marker)).map((x) => base(x.f));
    mark = holders.length ? `IN the first load (${holders.join(", ")})` : "not in the first load";
  }
  const want = expectOn ? row.expect?.(reading.route) ?? null : null;
  let verdict = "";
  let bad = false;
  if (want) {
    const good =
      (want.struct == null || (struct ?? "").startsWith(want.struct)) &&
      (want.module == null || (want.module === "in") === Boolean(mod?.in)) &&
      (want.marker == null || !row.marker || (want.marker === "in") === mark.startsWith("IN"));
    verdict = good ? "as expected" : "UNEXPECTED";
    bad = !good;
  } else if (expectOn) verdict = "(reported)";
  return { struct, module: mod?.text ?? null, mark, verdict, bad };
}

/**
 * The whole reading: every route, the control (deposit found everywhere; an in-memory plant reported), the verdicts.
 * `table` and `judgedRows` come from checkMarkerTable. Returns { routes, controlOk, plant, bad }.
 */
export function readAll(build, routes, { table = MARKERS, judgedRows, expectOn = true, control = CONTROLS[0] } = {}) {
  const judged = (row) => judgedRows?.get(row.id)?.judged ?? row.stage !== "S7";
  const out = [];
  let controlOk = true;
  for (const route of routes) {
    const reading = readRoute(build, route);
    if (reading.missing) {
      out.push({ route, missing: reading.missing });
      controlOk = false;
      continue;
    }
    const found = reading.texts.some((x) => x.t && x.t.includes(control.marker));
    if (!found || reading.unreadable.length) controlOk = false;
    const rows = table.map((row) => ({ row, j: judgeRow(row, reading, judged(row), expectOn) }));
    const known = new Set(table.map((r) => r.part).filter(Boolean));
    const others = [...reading.parts.keys()].filter((s) => !known.has(s)).sort().map((s) => ({ sym: s, struct: structOf(reading, s) }));
    out.push({ route, reading, found, rows, others });
  }
  // The plant: a journey marker added in memory to the first measured route's entry set must be reported.
  const plantRow = table.find((r) => r.journey && r.marker && judged(r) && r.expect?.("/")?.marker === "out");
  const first = out.find((r) => !r.missing);
  let plant = { ok: false, text: "no measured route to plant into" };
  if (plantRow && first) {
    const planted = readRoute(build, first.route, `/* planted in memory by qa:first-load's control */${plantRow.marker}`);
    const j = judgeRow(plantRow, planted, true, true);
    const ok = j.mark.includes("(planted in memory)") && j.verdict === "UNEXPECTED";
    plant = { ok, text: `${plantRow.id}'s marker ${JSON.stringify(plantRow.marker)} planted into ${first.route}'s entry set: ${ok ? "REPORTED" : "NOT REPORTED"} (${j.mark}; ${j.verdict})` };
  } else if (!plantRow) plant = { ok: false, text: "no journey row with a marker to plant" };
  if (!plant.ok) controlOk = false;
  const bad = !controlOk || out.some((r) => r.missing || r.rows?.some((x) => x.j?.bad));
  return { routes: out, controlOk, plant, bad, control };
}

/** Where each marker sits across the whole build (first-load.py:69-72), entry files of `routes` starred. */
function whereMarkers(build, table) {
  const lines = [];
  for (const row of table) {
    if (!row.marker) continue;
    const holders = [...build.chunks.entries()].filter(([, t]) => t.includes(row.marker)).map(([f]) => base(f));
    lines.push(`  ${row.id.padEnd(22)} ${JSON.stringify(row.marker).padEnd(46)} in ${holders.length} client chunk(s)${holders.length ? ": " + holders.slice(0, 6).join(", ") + (holders.length > 6 ? ", …" : "") : ""}`);
  }
  return lines;
}

function printReading(result, build, table, { verdicts, tableRows }) {
  const pendingWhy = (row) =>
    !tableRows?.get(row.id)?.landed ? `${row.wp} has not added ${row.file}` : `until ${row.mountedBy} exists`;
  const say = (s) => console.log(s);
  say(`\n[qa:first-load] the control (must pass before any verdict is read)`);
  for (const r of result.routes) {
    if (r.missing) say(`  ✗ ${r.route}: NOT MEASURED (${r.missing})`);
    else {
      say(`  ${r.found && !r.reading.unreadable.length ? "✓" : "✗"} ${r.route}: classic deposit test id ${JSON.stringify(result.control.marker)} ${r.found ? "FOUND" : "MISSING"} in its ${r.reading.entries.size} entry files` +
        (r.reading.unreadable.length ? `; ${r.reading.unreadable.length} entry file(s) not on disk: ${r.reading.unreadable.map(base).join(", ")}` : ""));
    }
  }
  say(`  ${result.plant.ok ? "✓" : "✗"} ${result.plant.text}`);
  if (!result.controlOk) {
    say(`\n✗ CONTROL FAILED — this reading proves nothing, so no verdict is printed.`);
    return;
  }
  if (!verdicts) return;
  say(`\n[qa:first-load] where each marker sits in the build's ${build.chunks.size} client chunks`);
  for (const l of whereMarkers(build, table)) say(l);
  for (const r of result.routes) {
    const sizes = [...r.reading.entries].sort().map((f) => `${base(f)} ${kb(build.chunks.get(f)?.length ?? 0)}`);
    const total = [...r.reading.entries].reduce((n, f) => n + (build.chunks.get(f)?.length ?? 0), 0);
    say(`\n${r.route}: ${r.reading.entries.size} entry JS files, ${kb(total)}`);
    say(`  entry files: ${sizes.join(", ")}`);
    for (const { row, j } of r.rows) {
      const tag = `${row.id}${row.stage === "S7" ? " (S7)" : ""}`;
      if (!j) {
        say(`    ${tag.padEnd(26)} PENDING (${pendingWhy(row)})`);
        continue;
      }
      const how = j.struct !== null ? `structural: ${j.struct}` : j.module !== null ? `module: ${j.module}` : "marker only";
      say(`    ${tag.padEnd(26)} ${how.padEnd(58)} marker: ${j.mark.padEnd(30)} ${j.verdict}`);
    }
    if (r.others.length) say(`  other next/dynamic parts here: ${r.others.map((o) => `${o.sym} — ${o.struct}`).join("; ")}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// TIED TO HEAD
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

const git = (root, args) => {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (r.error || r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || r.error?.message || "").trim()}`);
  return r.stdout;
};
const gitHead = (root) => git(root, ["rev-parse", "HEAD"]).trim();
/** A9's dirty rule, verbatim: `git status --porcelain -- src scripts package.json` not empty. */
const gitDirty = (root) => git(root, ["status", "--porcelain", "--", "src", "scripts", "package.json"]).trimEnd();

/** Refuses any .next whose kp-head is missing or is not `head`. Returns { ok, why }. */
export function checkKpHead(nextDir, head) {
  const f = path.join(nextDir, "kp-head");
  if (!fs.existsSync(path.join(nextDir, "BUILD_ID")) && !fs.existsSync(f)) return { ok: false, why: `no build at ${nextDir} (no BUILD_ID): run --build first` };
  if (!fs.existsSync(f)) return { ok: false, why: `${f} is missing: this .next was not built by qa:first-load --build, so nothing ties it to a commit` };
  const got = fs.readFileSync(f, "utf8").trim();
  if (got !== head) return { ok: false, why: `.next/kp-head is ${got.slice(0, 12)}, HEAD is ${head.slice(0, 12)}: this build is another commit's` };
  return { ok: true, why: `.next/kp-head is HEAD (${head.slice(0, 12)})` };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE FIXTURE CONTROL (--self-test)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

const writeAt = (root, rel, text) => {
  const p = path.join(root, ...rel.split("/"));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
};

/**
 * A fixture tree: src/ holding each S6 marker and the controls once, and a .next shaped like a real Turbopack build's
 * (server/app/<route>/page_client-reference-manifest.js, page/react-loadable-manifest.json, server and client chunks).
 * Routes: / /markets /markets/[id] as a good build reads; /help with no control in its entry set; /positions with the
 * journey header's own chunk among its entry files (a structural defect ON DISK).
 */
function writeFixture(root, { homeLazy = false } = {}) {
  const S6 = [...CONTROLS, ...MARKERS.filter((r) => r.stage === "S6")];
  for (const r of S6) writeAt(root, r.file, `// fixture\n${r.marker ?? ""}\n`);
  const parts = MARKERS.filter((r) => r.stage === "S6" && r.part && r.part !== "OfflineBanner");
  const ids = new Map(parts.map((r, i) => [r.part, 700001 + i]));
  ids.set("WinCelebrationHost", 51000);
  // Server chunk: the loaders as Turbopack's server output writes them; WinCelebrationHost's id minified to 51e3.
  const loader = (sym) => `(0,t.default)(()=>e.A(1).then(e=>e.${sym}).catch(a),{loadableGenerated:{modules:[${sym === "WinCelebrationHost" ? "51e3" : ids.get(sym)}]}})`;
  writeAt(root, ".next/server/chunks/ssr/shell-lazy.js", `let x=${parts.map((r) => loader(r.part)).join(",y=")};`);
  // Client chunk: an ssr:false part, whose loader only the client chunks keep.
  writeAt(root, ".next/static/chunks/overlays.js", `a=(0,r.default)(()=>e.A(9).then(e=>e.ChatRoot),{loadableGenerated:{modules:[958511]},ssr:!1})`);
  writeAt(root, ".next/static/chunks/layout.js",
    `/*layout*/"data-testid":"deposit-header" "deposit-rail" warning-bg) 88% 50pick:celebrate kp-journey-shell`);
  writeAt(root, ".next/static/chunks/help-layout.js", `/*the help route's layout, without the classic bar*/`);
  writeAt(root, ".next/static/chunks/page.js", `/*page*/`);
  for (const r of parts) if (r.part !== "WinCelebrationHost") writeAt(root, `.next/static/chunks/part-${r.part}.js`, `/*${r.part}*/${r.marker ?? ""}`);
  writeAt(root, ".next/static/chunks/part-ChatRoot.js", `/*ChatRoot*/`);
  if (homeLazy) {
    writeAt(root, ".next/static/chunks/home-lazy.js", `/*home-lazy*/kp-home-lazy-fixture`);
    writeAt(root, "src/components/journey/home/home-lazy.tsx", `"use client";\nconst m = "kp-home-lazy-fixture";\n`);
    writeAt(root, "src/components/journey/home/journey-home.tsx", `// fixture: mounts home-lazy\n`);
  }
  const loadable = {};
  for (const r of parts) {
    const id = ids.get(r.part);
    loadable[String(id)] = { id, files: r.part === "WinCelebrationHost" ? [] : [`static/chunks/part-${r.part}.js`] };
  }
  loadable["958511"] = { id: 958511, files: ["static/chunks/part-ChatRoot.js"] };
  const routes = {
    "/": ["static/chunks/layout.js", "static/chunks/page.js", ...(homeLazy ? ["static/chunks/home-lazy.js"] : [])],
    "/markets": ["static/chunks/layout.js", "static/chunks/page.js"],
    "/markets/[id]": ["static/chunks/layout.js", "static/chunks/page.js"],
    "/help": ["static/chunks/help-layout.js", "static/chunks/page.js"],
    "/positions": ["static/chunks/layout.js", "static/chunks/page.js", "static/chunks/part-JourneyTopBar.js"],
  };
  for (const [route, files] of Object.entries(routes)) {
    const key = (route === "/" ? "" : route) + "/page";
    const clientModules = {
      "[project]/src/components/layout/shell-lazy.tsx <module evaluation>": { id: 1, name: "*", chunks: ["/_next/static/chunks/layout.js"], async: false },
      ...(homeLazy && route === "/" ? { "[project]/src/components/journey/home/home-lazy.tsx": { id: 2, name: "*", chunks: ["/_next/static/chunks/home-lazy.js"], async: false } } : {}),
    };
    const manifest = { moduleLoading: { prefix: "", crossOrigin: null }, clientModules, entryJSFiles: { "[project]/src/app/layout": files.slice(0, 1), [`[project]/src/app${route === "/" ? "" : route}/page`]: files.slice(1) } };
    const dir = ".next/server/app" + (route === "/" ? "" : route);
    writeAt(root, `${dir}/page_client-reference-manifest.js`,
      `globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\nglobalThis.__RSC_MANIFEST[${JSON.stringify(key)}] = ${JSON.stringify(manifest)};\n`);
    writeAt(root, `${dir}/page/react-loadable-manifest.json`, JSON.stringify(loadable, null, 2));
  }
  writeAt(root, ".next/BUILD_ID", "fixture");
  writeAt(root, ".next/kp-head", "f1x7ure000000000000000000000000000000000\n");
}

/** Runs every control on fixtures in a temp folder. Returns { ok, lines }. */
export function selfTest({ table = MARKERS } = {}) {
  const lines = [];
  let ok = true;
  const check = (label, cond, detail = "") => {
    if (!cond) ok = false;
    lines.push(`  ${cond ? "✓" : "✗"} ${label}${detail ? " — " + detail : ""}`);
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qa-first-load-"));
  try {
    // C1-C4, C9: the fixture build as a good build reads, plus its two on-disk defects.
    const a = path.join(tmp, "a");
    writeFixture(a);
    const t1 = checkMarkerTable(a, [...CONTROLS, ...table]);
    check("C0 the fixture's src/ satisfies the table (S7 rows PENDING)", t1.ok, t1.lines.filter((l) => l.startsWith("✗")).join(" | "));
    const b1 = loadBuild(path.join(a, ".next"));
    const good = readAll(b1, ["/", "/markets", "/markets/[id]"], { table, judgedRows: t1.rows });
    check("C1 control: the classic deposit test id FOUND in every route's entry files", good.routes.every((r) => r.found));
    check("C1 every S6 verdict as expected on a good build", !good.routes.some((r) => r.rows.some((x) => x.j?.bad)),
      good.routes.flatMap((r) => r.rows.filter((x) => x.j?.bad).map((x) => `${r.route} ${x.row.id}: ${x.j.struct ?? ""} ${x.j.mark}`)).join(" | "));
    check("C2 control: a journey marker planted in memory into one route's entry set is REPORTED", good.plant.ok, good.plant.text);
    check("C2 and the good reading passes as a whole", !good.bad);
    const noCtl = readAll(b1, ["/help"], { table, judgedRows: t1.rows });
    check("C3 a route whose entry files lack the deposit test id FAILS the control", !noCtl.controlOk && noCtl.routes[0].found === false);
    const onDisk = readAll(b1, ["/positions"], { table, judgedRows: t1.rows });
    const topBar = onDisk.routes[0].rows.find((x) => x.row.id === "JourneyTopBar")?.j;
    check("C4 a part whose own chunk joined an entry set reads FIRST LOAD and UNEXPECTED", Boolean(topBar?.bad && topBar.struct.startsWith("FIRST LOAD") && onDisk.bad),
      topBar ? `${topBar.struct}; marker ${topBar.mark}` : "row missing");
    const win = good.routes[0].rows.find((x) => x.row.id === "WinCelebrationHost")?.j;
    check("C9 a module id minified to 51e3 is the manifest's 51000", Boolean(win && win.struct !== "no next/dynamic entry"), win?.struct);
    check("C9 an ssr:false part's loader is read from the client chunks", good.routes[0].others.some((o) => o.sym === "ChatRoot"),
      good.routes[0].others.map((o) => o.sym).join(", "));
    const missing = readAll(b1, ["/nowhere"], { table, judgedRows: t1.rows });
    check("C3 a route with no manifest is NOT MEASURED and fails", Boolean(missing.routes[0].missing) && missing.bad);

    // C5: uniqueness.
    writeAt(a, "src/components/elsewhere.tsx", `// a second holder\n50pick-channels-shown\n`);
    const t5 = checkMarkerTable(a, [...CONTROLS, ...table]);
    const dup = t5.lines.find((l) => l.includes("ChannelsPanel"));
    check("C5 a marker held by a second file in src/ FAILS the table", !t5.ok && dup?.startsWith("✗"), dup);
    fs.rmSync(path.join(a, "src/components/elsewhere.tsx"));
    const t5b = checkMarkerTable(a, [...CONTROLS, ...table]);
    check("C5 removed again, the table holds", t5b.ok);
    fs.rmSync(path.join(a, "src/components/social/channels-panel.tsx"));
    const t5c = checkMarkerTable(a, [...CONTROLS, ...table]);
    check("C5 a marker whose file is gone FAILS the table", !t5c.ok && Boolean(t5c.lines.find((l) => l.includes("ChannelsPanel") && l.includes("gone"))));
    writeFixture(a);

    // C6: S7 rows wait for their WP, then hold.
    writeAt(a, "src/components/journey/somewhere-else.tsx", `<article data-testid="journey-card">\n`);
    const t6 = checkMarkerTable(a, [...CONTROLS, ...table]);
    check("C6 an S7 marker held before its WP lands, by another file, FAILS", !t6.ok && Boolean(t6.lines.find((l) => l.includes("JourneyCard") && l.startsWith("✗"))));
    fs.rmSync(path.join(a, "src/components/journey/somewhere-else.tsx"));
    writeAt(a, "src/components/journey/cards/journey-card.tsx", `<article data-testid="journey-card">\n`);
    const t6b = checkMarkerTable(a, [...CONTROLS, ...table]);
    check("C6 once its WP lands the file, the S7 row is judged and holds", t6b.ok && t6b.rows.get("JourneyCard")?.judged === true);
    const r6 = readAll(b1, ["/"], { table, judgedRows: t6b.rows });
    const card = r6.routes[0].rows.find((x) => x.row.id === "JourneyCard")?.j;
    check("C6 a landed S7 row gets a verdict on the routes", card?.verdict === "as expected", card ? `${card.mark}; ${card.verdict}` : "PENDING");
    writeAt(a, "src/components/journey/home/home-lazy.tsx", `"use client";\n`);
    const t6c = checkMarkerTable(a, [...CONTROLS, ...table]);
    check("C6 an S7 file landed while its row has no marker FAILS the table", !t6c.ok && Boolean(t6c.lines.find((l) => l.includes("HomeLazy") && l.includes("give the row its marker"))));

    // C10: the S7 home lazy module judged by the route's client modules, once landed, mounted and given a marker.
    const c = path.join(tmp, "c");
    writeFixture(c, { homeLazy: true });
    const withMarker = table.map((r) => (r.id === "HomeLazy" ? { ...r, marker: "kp-home-lazy-fixture" } : r));
    const t10 = checkMarkerTable(c, [...CONTROLS, ...withMarker]);
    check("C10 the landed home lazy module with a marker satisfies the table", t10.ok, t10.lines.filter((l) => l.startsWith("✗")).join(" | "));
    const b10 = loadBuild(path.join(c, ".next"));
    const r10 = readAll(b10, ["/", "/markets"], { table: withMarker, judgedRows: t10.rows });
    const hl = r10.routes.map((r) => r.rows.find((x) => x.row.id === "HomeLazy")?.j);
    check("C10 on / the home lazy module is a client reference in the first load, as expected", hl[0]?.verdict === "as expected" && hl[0].module.includes("in the first load"), hl[0] ? `${hl[0].module}; ${hl[0].mark}` : "PENDING");
    check("C10 on /markets it is not a client reference, as expected", hl[1]?.verdict === "as expected" && hl[1].module.startsWith("not"), hl[1]?.module);
    const p10 = readRoute(b10, "/markets", "kp-home-lazy-fixture");
    const hp = judgeRow(withMarker.find((r) => r.id === "HomeLazy"), p10, true, true);
    check("C10 the home lazy marker planted into /markets' entry set is UNEXPECTED", hp.bad, `${hp.mark}; ${hp.verdict}`);

    // C7: tied to HEAD.
    const nd = path.join(a, ".next");
    check("C7 a .next whose kp-head is another commit is REFUSED", !checkKpHead(nd, "0123456789abcdef0123456789abcdef01234567").ok);
    check("C7 a .next whose kp-head is HEAD is accepted", checkKpHead(nd, "f1x7ure000000000000000000000000000000000").ok);
    fs.rmSync(path.join(nd, "kp-head"));
    check("C7 a .next with no kp-head is REFUSED", !checkKpHead(nd, "f1x7ure000000000000000000000000000000000").ok);

    // C8: routes Git Bash cannot rewrite.
    const r8 = parseRoutes("index,markets/[id],updown/history");
    check("C8 index,markets/[id],updown/history → /, /markets/[id], /updown/history", r8.errors.length === 0 && r8.routes.join(" ") === "/ /markets/[id] /updown/history", r8.routes.join(" "));
    const slash = parseRoutes("/markets").errors;
    check("C8 a leading-slash route is REFUSED, with that reason", slash.length === 1 && slash[0].includes("without its leading slash"), slash[0]);
    const rewritten = parseRoutes("C:/Program Files/Git/markets").errors;
    check("C8 a route Git Bash rewrote is REFUSED, with that reason", rewritten.length === 1 && rewritten[0].includes("Git Bash rewrote"), rewritten[0]);

    // C11: a build refuses a node_modules that is a link (Turbopack); a real folder is accepted. The link's target is
    // an empty folder inside this temp tree, and the link itself is removed first.
    const j = path.join(tmp, "j");
    fs.mkdirSync(path.join(j, "real", "node_modules"), { recursive: true });
    fs.mkdirSync(path.join(j, "linked"), { recursive: true });
    fs.mkdirSync(path.join(j, "target"), { recursive: true });
    fs.symlinkSync(path.join(j, "target"), path.join(j, "linked", "node_modules"), "junction");
    try {
      check("C11 a node_modules that is a link is seen as one (the build refuses it)", Boolean(nodeModulesOf(path.join(j, "linked"))?.link));
      check("C11 a real node_modules folder is not", nodeModulesOf(path.join(j, "real"))?.link === undefined && nodeModulesOf(path.join(j, "real")) !== null);
    } finally {
      try {
        fs.unlinkSync(path.join(j, "linked", "node_modules"));
      } catch {
        fs.rmdirSync(path.join(j, "linked", "node_modules"));
      }
    }
  } catch (e) {
    check("the self-test ran to its end", false, e.stack ?? String(e));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return { ok, lines };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// BUILD
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/** node_modules as a build sees it: { link: its target } for a link (a side worktree's junction), {} for a real folder, null if absent. */
export function nodeModulesOf(root) {
  const nm = path.join(root, "node_modules");
  try {
    return fs.lstatSync(nm).isSymbolicLink() ? { link: fs.readlinkSync(nm) } : {};
  } catch {
    return null;
  }
}

function buildPreflight(root) {
  const head = gitHead(root);
  const dirty = gitDirty(root);
  if (dirty) return { refused: `REFUSED: the tree is dirty, so the build would not be HEAD's (git status --porcelain -- src scripts package.json):\n${dirty}`, head };
  const nm = nodeModulesOf(root);
  if (!nm) return { refused: `REFUSED: no node_modules in ${root}`, head };
  if (nm.link) {
    return {
      refused:
        `REFUSED: node_modules is a link (${nm.link}). Turbopack, which production builds with, refuses a node_modules that ` +
        `points out of the tree, and a webpack build's chunks are not production's. Remove the link only (cmd //c rmdir node_modules), ` +
        `then npm ci and npx prisma generate, and build again.`,
      head,
    };
  }
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  if (!fs.existsSync(nextBin)) return { refused: `REFUSED: ${nextBin} is missing`, head };
  return { refused: null, head, cmd: [process.execPath, nextBin, "build"] };
}

function runBuild(root, { log, dryRun, say }) {
  const pre = buildPreflight(root);
  if (pre.refused) {
    say(pre.refused);
    return 2;
  }
  say(`[qa:first-load] build at HEAD ${pre.head} — rm -rf .next && ${pre.cmd.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`);
  if (dryRun) {
    say("(dry run: nothing deleted, nothing built)");
    return 0;
  }
  fs.rmSync(path.join(root, ".next"), { recursive: true, force: true });
  const fd = log ? fs.openSync(log, "a") : null;
  const started = Date.now();
  const r = spawnSync(pre.cmd[0], pre.cmd.slice(1), { cwd: root, stdio: fd === null ? "inherit" : ["ignore", fd, fd], windowsHide: true });
  if (fd !== null) fs.closeSync(fd);
  let code = r.status ?? 1;
  say(`[qa:first-load] next build exited ${code}${r.error ? ` (${r.error.message})` : ""} after ${Math.round((Date.now() - started) / 1000)} s`);
  if (code === 0) {
    const head2 = gitHead(root);
    const dirty2 = gitDirty(root);
    if (head2 !== pre.head || dirty2) {
      say(`REFUSED to tie the build: ${head2 !== pre.head ? `HEAD moved during the build (${pre.head.slice(0, 12)} → ${head2.slice(0, 12)})` : `the tree changed during the build:\n${dirty2}`}. No kp-head written.`);
      code = 1;
    } else {
      fs.writeFileSync(path.join(root, ".next", "kp-head"), pre.head + "\n");
      say(`[qa:first-load] .next/kp-head = ${pre.head}`);
    }
  }
  return code;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

function main(argv) {
  const has = (f) => argv.includes(f);
  const valueOf = (f) => {
    const i = argv.indexOf(f);
    if (i >= 0) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(f + "="));
    return eq ? eq.slice(f.length + 1) : undefined;
  };
  const known = new Set(["--self-test", "--build", "--read", "--detach", "--no-lock", "--dry-run", "--no-expect", "--log", "--routes"]);
  const unknown = argv.filter((a, i) => a.startsWith("--") && !known.has(a.split("=")[0]) && !["--log", "--routes"].includes(argv[i - 1]));
  const root = process.cwd();
  const log = valueOf("--log") ? path.resolve(valueOf("--log")) : null;
  const toLog = log && !process.env.QA_FIRST_LOAD_STDOUT_IS_LOG;
  const say = (s) => {
    console.log(s);
    if (toLog) fs.appendFileSync(log, s + "\n");
  };
  const done = (code) => {
    if (log && has("--build") && !has("--detach")) fs.writeFileSync(log + ".done", `exit=${code}\n`);
    return code;
  };
  if (unknown.length) {
    say(`unknown argument(s): ${unknown.join(" ")} — see the usage at the top of scripts/qa-first-load.mjs`);
    return done(2);
  }
  if (!["--self-test", "--build", "--read"].some(has)) {
    say("usage: npm run -s qa:first-load -- --self-test | --build [--log <file>] [--detach] [--dry-run] | --read [--routes index,markets,...]  (see the header of scripts/qa-first-load.mjs)");
    return 2;
  }
  if (!fs.existsSync(path.join(root, "package.json")) || !fs.existsSync(path.join(root, "src"))) {
    say(`REFUSED: run from the repo's root (no package.json and src/ in ${root})`);
    return done(2);
  }

  if (has("--self-test")) {
    const st = selfTest();
    console.log("[qa:first-load] the controls on a fixture build (no build, no server)");
    for (const l of st.lines) console.log(l);
    const t = checkMarkerTable(root);
    console.log("\n[qa:first-load] the marker table against this tree's src/");
    for (const l of t.lines) console.log("  " + l);
    const ok = st.ok && t.ok;
    console.log(`\n${ok ? "ALL PASS" : "FAILURES"} — qa:first-load --self-test: ${st.lines.filter((l) => l.startsWith("  ✓")).length} controls passed, ` +
      `${st.lines.filter((l) => l.startsWith("  ✗")).length} failed; marker table ${t.ok ? "holds" : "FAILS"}`);
    if (!has("--build") && !has("--read")) return ok ? 0 : 1;
    if (!ok) return done(1);
  }

  let routes = DEFAULT_ROUTES;
  const routeArg = valueOf("--routes");
  if (routeArg !== undefined) {
    const p = parseRoutes(routeArg);
    if (p.errors.length || !p.routes.length) {
      for (const e of p.errors.length ? p.errors : ["--routes names no route"]) say("REFUSED: " + e);
      return done(2);
    }
    routes = p.routes;
  }

  if (has("--detach")) {
    if (!has("--build")) {
      say("REFUSED: --detach detaches a --build");
      return 2;
    }
    if (!log) {
      say("REFUSED: --detach needs --log <file>: the build's output goes there, and <file>.done gets exit=<code>");
      return 2;
    }
    const wrap = (process.env.QA_FIRST_LOAD_LOCK ?? "").trim();
    if (!wrap && !has("--no-lock")) {
      say("REFUSED: a build is a heavy job. Name the lock wrapper's command prefix in QA_FIRST_LOAD_LOCK (it runs INSIDE the detached process), or pass --no-lock to build without one.");
      return 2;
    }
    const pre = buildPreflight(root);
    if (pre.refused) {
      say(pre.refused);
      return 2;
    }
    const child = [...(wrap ? wrap.split(/\s+/) : []), process.execPath, SCRIPT, ...argv.filter((a) => a !== "--detach")];
    say(`[qa:first-load] detached: ${child.join(" ")}`);
    if (has("--dry-run")) {
      say("(dry run: nothing started)");
      return 0;
    }
    const fd = fs.openSync(log, "a");
    const p = spawn(child[0], child.slice(1), { cwd: root, detached: true, stdio: ["ignore", fd, fd], windowsHide: true, env: { ...process.env, QA_FIRST_LOAD_STDOUT_IS_LOG: "1" } });
    p.unref();
    fs.closeSync(fd);
    say(`[qa:first-load] started pid ${p.pid}; output → ${log}; ${log}.done gets exit=<code>`);
    return 0;
  }

  if (has("--build")) {
    const code = runBuild(root, { log, dryRun: has("--dry-run"), say });
    if (code !== 0 || has("--dry-run") || !has("--read")) return done(code);
  }

  // --read
  const head = gitHead(root);
  const nextDir = path.join(root, ".next");
  const tie = checkKpHead(nextDir, head);
  if (!tie.ok) {
    say(`NOT MEASURED — REFUSED: ${tie.why}`);
    return done(2);
  }
  say(`[qa:first-load] reading ${nextDir.replace(/\\/g, "/")}: ${tie.why}`);
  const dirty = gitDirty(root);
  if (dirty) say(`⚠ the tree differs from HEAD (src, scripts or package.json): the build is HEAD's, the marker table is checked against the working tree.`);
  const st = selfTest();
  say(`[qa:first-load] the controls on a fixture build: ${st.ok ? "all pass" : "FAILED"} (${st.lines.length})`);
  if (!st.ok) {
    for (const l of st.lines.filter((x) => x.startsWith("  ✗"))) say(l);
    say("✗ the fixture control failed: no verdict is read.");
    return done(1);
  }
  const t = checkMarkerTable(root);
  say(`\n[qa:first-load] the marker table against src/ (A9: every marker unique in src/)`);
  for (const l of t.lines) say("  " + l);
  if (!t.ok) {
    say("✗ the marker table does not hold: no verdict is read.");
    return done(1);
  }
  const build = loadBuild(nextDir);
  const expectOn = !has("--no-expect");
  const result = readAll(build, routes, { judgedRows: t.rows, expectOn });
  printReading(result, build, MARKERS, { verdicts: true, tableRows: t.rows });
  say(`\n${result.bad ? "FAIL" : "PASS"} — qa:first-load at ${head.slice(0, 12)}: ${result.routes.length} route(s)${result.controlOk ? "" : ", control FAILED"}`);
  return done(result.bad ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
