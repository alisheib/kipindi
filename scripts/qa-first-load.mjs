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
 * the route's react-loadable manifest maps that id to all required chunk files. Every named file must exist. The
 * reader parses real Turbopack registrations to locate exactly one module exporting the chosen name in each
 * loader's declared files or the route's actual entries. STRUCTURAL is about that PRIMARY factory's file:
 * "own chunk" (the primary is outside entries), "FIRST LOAD" (the primary is an entry), "no files of its own" (an
 * already-loaded module has no declared lazy files) or "no next/dynamic entry". A common dependency in entries
 * cannot establish FIRST LOAD. Unknown/ambiguous/unreadable primary mapping refuses the reading, even --no-expect.
 * This is the measured S7 A9 clarification recorded in docs/qa/s8-first-load-factory-reader.md. MARKERS: a string
 * only one module in src/ holds, searched in the entry files; and
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
import { createRequire } from "node:module";

const { parse: parseJavaScript } = createRequire(import.meta.url)("next/dist/compiled/acorn");

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
  // Its marker is its test id: since R4-G (a57bda6a) it is the kit's NoticeBar and holds no style string of its own.
  { id: "OfflineBanner", stage: "S6", part: "OfflineBanner", file: "src/components/ui/offline-banner.tsx", marker: '"offline-notice"',
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
  // Quoted: globals.css's `:root:has(#kp-journey-shell)` rules and a comment in toast.tsx name the bare id too.
  { id: "JourneyShellMark", stage: "S6", journey: true, byDesign: "every page", file: "src/lib/journey/shell-mark.ts", marker: '"kp-journey-shell"',
    expect: () => null },

  // ─── S7 — A9 (2): the home lazy module's chunk, the How-to card, the How-to sheet and the journey card ──────────────
  // ⛔ Each row is PENDING until its WP adds `file` (see the header). Where each marker gets added:
  //   · HomeLazy — S7 WP6 adds home-lazy.tsx ("use client"; S7-PLAN WP6 Files and step 2) and WP7 mounts it from
  //     journey-home.tsx. Its marker is a string LITERAL only home-lazy.tsx holds in src/ (a comment or an identifier
  //     does not survive the minifier, and none of its loader lines is unique: HowToCard is howto-card.tsx's export and
  //     LazyHowToCard is imported by journey-home.tsx). WP6 left it null for want of one; WP7 names each part
  //     (`displayName`, "JourneyHome.<part>" — test:journey-home 5.lazy pins each name to its part), and the first name
  //     is the marker. qa:chunks-prod reports that marker on / and fails it on any other route (A9 (3), A23 (d)).
  //   · HowToCard — WP6, howto-card.tsx: `data-testid="journey-howto-card"` (WP6 step 3), a next/dynamic part of
  //     home-lazy.tsx, so an own chunk on / once WP7 mounts it.
  //   · HowToSheet — WP6, onboarding/how-to-play-sheet.tsx: `data-testid="journey-howto-sheet"` (WP6 step 4), imported by
  //     the card, so in the card's chunk and never in a first load.
  //   · JourneyCard — WP5, cards/journey-card.tsx: `data-testid="journey-card"` (WP5 step 2), a server component (no
  //     directive), so in no client chunk at all.
  { id: "HomeLazy", stage: "S7", wp: "WP6", journey: true, byDesign: "/", module: true,
    file: "src/components/journey/home/home-lazy.tsx", mountedBy: "src/components/journey/home/journey-home.tsx", marker: '"JourneyHome.HowToCard"',
    expect: (route) => (route === "/" ? { module: "in", marker: "in" } : { module: "out", marker: "out" }) },
  { id: "HowToCard", stage: "S7", wp: "WP6", journey: true, part: "HowToCard",
    file: "src/components/journey/home/howto-card.tsx", mountedBy: "src/components/journey/home/journey-home.tsx", marker: '"journey-howto-card"',
    expect: (route) => ({ struct: route === "/" ? "own chunk" : "no next/dynamic entry", marker: "out" }) },
  { id: "HowToSheet", stage: "S7", wp: "WP6", journey: true,
    file: "src/components/onboarding/how-to-play-sheet.tsx", marker: '"journey-howto-sheet"', expect: () => ({ marker: "out" }) },
  { id: "JourneyCard", stage: "S7", wp: "WP5", journey: true,
    file: "src/components/journey/cards/journey-card.tsx", marker: '"journey-card"', expect: () => ({ marker: "out" }) },
  // S8: the click selector identifies the host's executable code without adding a hidden product element.
  { id: "BetSheetHost", stage: "S8", wp: "WP7a", journey: true, part: "BetSheetHost",
    file: "src/components/journey/bet-sheet/bet-sheet-host.tsx", marker: '"a[data-bet-side]"', expect: OWN_CHUNK },
  // S10: the guest host matches a pick inside a seed box in one selector, a literal only its file holds (S10-PLAN A12).
  { id: "GuestSheetHost", stage: "S10", wp: "WP4", journey: true, part: "GuestSheetHost",
    file: "src/components/journey/bet-sheet/guest-sheet-host.tsx", marker: '"[data-sheet] a[data-bet-side]"', expect: OWN_CHUNK },
  // S11 WP4: How to Play's host — journey-only, a next/dynamic part of the shell's lazy module (mounted beside the flag);
  // its marker is the one string of its module a minifier keeps, its React name, which no other file under src/ spells.
  { id: "HowToHost", stage: "S11", wp: "WP4", journey: true, part: "HowToHost",
    file: "src/components/onboarding/how-to-host.tsx", marker: '"JourneyShell.HowToHost"', expect: OWN_CHUNK },
  { id: "BetSheet", stage: "S8", wp: "WP6", journey: true,
    file: "src/components/journey/bet-sheet/bet-sheet.tsx", marker: '"journey-bet-sheet"', expect: () => ({ marker: "out" }) },
  // S8 WP8/WP9: the client question ghost is inside the journey-only lazy drawing; picks and the home break are
  // server drawings. None of their markers belongs in a classic route's entry scripts (WP11 step10).
  { id: "QuestionGhost", stage: "S8", wp: "WP8", journey: true,
    file: "src/components/journey/question/question-ghost.tsx", marker: '"journey-question-ghost"', expect: () => ({ marker: "out" }) },
  { id: "JourneyBetButtons", stage: "S8", wp: "WP8", journey: true,
    file: "src/components/journey/question/journey-bet-buttons.tsx", marker: '"journey-bet-buttons"', expect: () => ({ marker: "out" }) },
  { id: "JourneyHomeBreak", stage: "S8", wp: "WP9", journey: true,
    file: "src/components/journey/home/journey-home.tsx", marker: '"journey-home-break"', expect: () => ({ marker: "out" }) },
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
/** Stages whose rows wait for their WP to add their file (PENDING until then). */
const waitsForItsWp = (stage) => stage === "S7" || stage === "S8" || stage === "S10" || stage === "S11";
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
    if (!bad && !landed && waitsForItsWp(row.stage)) {
      if (holders.length) bad = `PENDING (${row.file} does not exist yet) but already held by ${holders.join(", ")}: the row names the wrong file, or the marker is not unique`;
      else note = `PENDING: ${row.wp} has not added ${row.file}`;
    } else if (!bad && !landed) {
      bad = `its file ${row.file} is gone`;
    } else if (!bad && row.marker === null) {
      if (waitsForItsWp(row.stage)) bad = `${row.wp} has added ${row.file}: give the row its marker (see its stage's block)`;
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

/** Read real Turbopack registration factories and their literal ESM export tables. Never execute client code.
 * A module's common dependencies can be entry files while the selected component factory remains lazy.
 * Unsupported or ambiguous exports are not guessed from markers, filenames, or the union of client references.
 */
export function readTurbopackFactories(text, file) {
  let ast;
  try { ast = parseJavaScript(text, { ecmaVersion: "latest", sourceType: "module" }); }
  catch (error) { return { factories: [], loaders: [], error: `bad JavaScript in ${file}: ${error.message}` }; }
  const factories = [], loaders = [], errors = [];
  const member = (node, object, property) => node?.type === "MemberExpression"
    && node.object.type === "Identifier" && node.object.name === object
    && (node.computed ? node.property.value : node.property.name) === property;
  const registry = node => ["globalThis", "self"].some(object => member(node, object, "TURBOPACK"));
  const registryReceiver = node => registry(node) || (node?.type === "LogicalExpression" && node.operator === "||"
    && registry(node.left) && node.right.type === "AssignmentExpression" && node.right.operator === "="
    && registry(node.right.left) && node.right.right.type === "ArrayExpression" && !node.right.right.elements.length);
  const mayTerminate = statement => {
    const flow = [statement];
    while (flow.length) {
      const node = flow.pop();
      if (["FunctionExpression", "FunctionDeclaration", "ArrowFunctionExpression"].includes(node.type)) continue;
      if (["ReturnStatement", "ThrowStatement"].includes(node.type)) return true;
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) flow.push(...value.filter(child => child?.type));
        else if (value?.type) flow.push(value);
      }
    }
    return false;
  };
  // The shell uses a synchronous zero-argument IIFE. Traverse its directly executed statements, never an uncalled
  // function or conditional branch, and stop at a terminating return/throw.
  const executed = [...ast.body];
  for (let position = 0; position < executed.length; position++) {
    const statement = executed[position];
    const node = statement.type === "ExpressionStatement" ? statement.expression : null;
    if (node?.type === "CallExpression" && node.arguments.length === 0
      && ["ArrowFunctionExpression", "FunctionExpression"].includes(node.callee.type)
      && !node.callee.async && !node.callee.generator && node.callee.params.length === 0 && node.callee.body.type === "BlockStatement") {
      const nested = node.callee.body.body;
      const terminal = nested.findIndex(mayTerminate);
      executed.splice(position + 1, 0, ...(terminal < 0 ? nested : nested.slice(0, terminal)));
      continue;
    }
    if (node?.type === "CallExpression" && node.callee.type === "MemberExpression"
      && (node.callee.computed ? node.callee.property.value : node.callee.property.name) === "push"
      && registryReceiver(node.callee.object)
      && node.arguments[0]?.type === "ArrayExpression") {
      const input = node.arguments[0].elements;
      // A reused module table is emitted as a nested [id,factory,...] slot, unlike an array of alias ids.
      const expand = nodes => nodes.flatMap(slot => slot?.type === "ArrayExpression"
        && slot.elements.some(element => ["ArrowFunctionExpression", "FunctionExpression"].includes(element?.type))
        ? expand(slot.elements) : [slot]);
      const slots = [input[0], ...expand(input.slice(1))];
      if (node.arguments.length !== 1 || slots.length < 3) {
        errors.push(`unsupported Turbopack registration in ${file}`);
        continue;
      }
      const validId = id => (typeof id === "string" && id.length > 0)
        || (typeof id === "number" && Number.isSafeInteger(id) && id >= 0);
      for (let i = 1; i < slots.length;) {
        const ids = [];
        while (i < slots.length && !["ArrowFunctionExpression", "FunctionExpression"].includes(slots[i]?.type)) {
          const id = slots[i++];
          ids.push(...(id?.type === "ArrayExpression" ? id.elements.map(n => n?.value) : [id?.value]));
        }
        const factory = slots[i++];
        if (!factory || !ids.length || !ids.every(validId)) {
          errors.push(`unsupported factory registration in ${file}`);
          continue;
        }
        const context = factory.params[0]?.type === "Identifier" ? factory.params[0].name : null;
        const ownStatements = factory.body.type === "BlockStatement" ? factory.body.body : [];
        const terminates = ownStatements.findIndex(mayTerminate);
        const statementScope = terminates < 0 ? ownStatements : ownStatements.slice(0, terminates);
        const writes = [...statementScope];
        let contextChanged = false;
        const contextWrite = node => {
          if (!node) return false;
          if (node.type === "Identifier") return node.name === context;
          if (node.type === "MemberExpression") return node.object.type === "Identifier" && node.object.name === context;
          if (node.type === "ObjectPattern") return node.properties.some(property => contextWrite(property.type === "RestElement" ? property.argument : property.value));
          if (node.type === "ArrayPattern") return node.elements.some(contextWrite);
          if (node.type === "AssignmentPattern") return contextWrite(node.left);
          if (node.type === "RestElement") return contextWrite(node.argument);
          return false;
        };
        const shadows = declaration => declaration?.type === "VariableDeclaration" && declaration.kind !== "var"
          && declaration.declarations.some(binding => contextWrite(binding.id));
        while (writes.length) {
          const write = writes.pop();
          if (["FunctionExpression", "FunctionDeclaration", "ArrowFunctionExpression"].includes(write.type)) continue;
          if ((write.type === "BlockStatement" && write.body.some(shadows))
            || (["ForStatement", "ForOfStatement", "ForInStatement"].includes(write.type) && (shadows(write.init) || shadows(write.left)))
            || (write.type === "CatchClause" && write.param?.type === "Identifier" && write.param.name === context)) continue;
          if ((write.type === "AssignmentExpression" && contextWrite(write.left))
            || (write.type === "UpdateExpression" && contextWrite(write.argument))
            || (write.type === "UnaryExpression" && write.operator === "delete" && contextWrite(write.argument))
            || (write.type === "VariableDeclarator" && write.id.type === "Identifier" && write.id.name === context)) contextChanged = true;
          for (const value of Object.values(write)) {
            if (Array.isArray(value)) writes.push(...value.filter(node => node?.type));
            else if (value?.type) writes.push(value);
          }
        }
        if (contextChanged) errors.push(`factory context is reassigned in ${file}`);
        const method = (node, name) => node?.type === "CallExpression" && node.callee.type === "MemberExpression"
          && node.callee.object.type === "Identifier" && node.callee.object.name === context
          && (node.callee.computed ? node.callee.property.value : node.callee.property.name) === name;
        const property = (node, key) => node?.type === "ObjectExpression" ? node.properties.find(prop => prop.type === "Property"
          && !prop.computed && (prop.key.name ?? prop.key.value) === key)?.value : null;
        // Read the actual client loader's import, rather than assuming that the LMF id is what its .A shim imports.
        const loadables = [...statementScope];
        while (loadables.length) {
          const candidate = loadables.pop();
          if (["FunctionExpression", "FunctionDeclaration", "ArrowFunctionExpression"].includes(candidate.type)) continue;
          if (candidate.type === "CallExpression") {
            const moduleList = property(property(candidate.arguments[1], "loadableGenerated"), "modules");
            const loader = candidate.arguments[0];
            let then = loader?.type === "ArrowFunctionExpression" && !loader.params.length && !loader.async ? loader.body : null;
            if (then?.type === "CallExpression" && then.callee.type === "MemberExpression"
              && !then.callee.computed && then.callee.property.name === "catch" && then.arguments.length === 1) then = then.callee.object;
            const callback = then?.arguments?.[0], imported = then?.callee?.object;
            const selected = callback?.body;
            if (moduleList?.type === "ArrayExpression" && moduleList.elements.length
              && moduleList.elements.every(id => id?.type === "Literal" && validId(id.value))
              && then?.type === "CallExpression" && then.callee.type === "MemberExpression" && !then.callee.computed
              && then.callee.property.name === "then" && then.arguments.length === 1
              && callback?.type === "ArrowFunctionExpression" && callback.params.length === 1 && callback.params[0].type === "Identifier"
              && !callback.async && selected?.type === "MemberExpression" && !selected.computed
              && selected.object.type === "Identifier" && selected.object.name === callback.params[0].name
              && selected.property.type === "Identifier" && method(imported, "A") && imported.arguments.length === 1
              && imported.arguments[0]?.type === "Literal" && validId(imported.arguments[0].value)) {
              for (const id of moduleList.elements) loaders.push({ file, start: candidate.start, loadableId: String(id.value),
                symbol: selected.property.name, asyncModuleId: String(imported.arguments[0].value) });
            }
          }
          for (const value of Object.values(candidate)) {
            if (Array.isArray(value)) loadables.push(...value.filter(node => node?.type));
            else if (value?.type) loadables.push(value);
          }
        }
        // Scope-hoisted groups can export several virtual modules from one physical factory. Their literal second
        // .s argument identifies each module; identical names in DIFFERENT modules must not be merged or deduplicated.
        let namespaceTarget = null, namespaceError = null, asyncNamespaceTarget = null, asyncNamespaceError = null, asyncFiles = [];
        const exportsByModule = new Map(), body = factory.body.type === "BlockStatement"
          ? statementScope.filter(statement => statement.type === "ExpressionStatement").map(statement => statement.expression)
          : [factory.body];
        while (body.length) {
          const child = body.pop();
          // Only direct unconditional registrations (including comma sequences) establish a literal export table.
          // Callback, conditional, short-circuited and async-wrapper definitions remain unmeasured.
          if (child.type === "SequenceExpression") { body.push(...child.expressions); continue; }
          if (method(child, "v")) {
            const initializer = child.arguments[0];
            const importName = initializer?.params?.[0]?.name;
            let returned = initializer?.body;
            let prefixValid = true;
            if (returned?.type === "CallExpression" && returned.callee.type === "MemberExpression" && !returned.callee.computed
              && returned.callee.property.name === "then" && returned.arguments.length === 1) {
              const preload = returned.callee.object, map = preload?.arguments?.[0], paths = map?.callee?.object;
              const load = map?.arguments?.[0], loaded = load?.body;
              prefixValid = preload?.type === "CallExpression" && preload.callee.type === "MemberExpression"
                && !preload.callee.computed && preload.callee.object.type === "Identifier" && preload.callee.object.name === "Promise"
                && preload.callee.property.name === "all" && preload.arguments.length === 1
                && map?.type === "CallExpression" && map.callee.type === "MemberExpression" && !map.callee.computed
                && map.callee.property.name === "map" && map.arguments.length === 1 && paths?.type === "ArrayExpression"
                && paths.elements.every(path => path?.type === "Literal" && typeof path.value === "string"
                  && /^static\/chunks\/.+\.(?:js|css)$/.test(path.value))
                && load?.type === "ArrowFunctionExpression" && !load.async && load.params.length === 1 && load.params[0].type === "Identifier"
                && method(loaded, "l") && loaded.arguments.length === 1 && loaded.arguments[0]?.type === "Identifier"
                && loaded.arguments[0].name === load.params[0].name;
              if (prefixValid) asyncFiles = paths.elements.map(path => path.value);
              const callback = returned.arguments[0];
              returned = callback?.type === "ArrowFunctionExpression" && !callback.async && !callback.params.length ? callback.body : null;
            }
            const direct = prefixValid && child.arguments.length === 1 && initializer?.type === "ArrowFunctionExpression" && !initializer.async
              && initializer.params.length === 1 && initializer.params[0].type === "Identifier"
              && returned?.type === "CallExpression" && returned.callee.type === "Identifier" && returned.callee.name === importName
              && returned.arguments.length === 1 && returned.arguments[0]?.type === "Literal" && validId(returned.arguments[0].value);
            if (!direct || asyncNamespaceTarget !== null) asyncNamespaceError = `unsupported async namespace shim in ${file}`;
            else asyncNamespaceTarget = String(returned.arguments[0].value);
          }
          if (child.type === "CallExpression" && child.callee.type === "MemberExpression"
            && child.callee.object.type === "Identifier" && child.callee.object.name === context
            && (child.callee.computed ? child.callee.property.value : child.callee.property.name) === "n") {
            const imported = child.arguments[0];
            const literal = imported?.arguments?.[0];
            const direct = child.arguments.length === 1 && imported?.type === "CallExpression"
              && imported.callee.type === "MemberExpression" && imported.callee.object.name === context
              && (imported.callee.computed ? imported.callee.property.value : imported.callee.property.name) === "i"
              && imported.arguments.length === 1 && literal?.type === "Literal" && validId(literal.value);
            if (!direct || namespaceTarget !== null) namespaceError = `unsupported namespace reexport in ${file}`;
            else namespaceTarget = String(literal.value);
          }
          if (child.type === "CallExpression" && child.callee.type === "MemberExpression"
            && child.callee.object.type === "Identifier" && child.callee.object.name === context
            && (child.callee.computed ? child.callee.property.value : child.callee.property.name) === "s") {
            const explicitId = child.arguments[1];
            if (child.arguments.length > 2 || (explicitId && (explicitId.type !== "Literal" || !validId(explicitId.value)))) {
              errors.push(`unsupported export module identity in ${file}`);
              continue;
            }
            const moduleIds = explicitId ? [String(explicitId.value)] : ids.map(String);
            const key = JSON.stringify(moduleIds);
            if (!exportsByModule.has(key)) exportsByModule.set(key, { moduleIds, names: new Set(), unmeasured: new Set() });
            const owner = exportsByModule.get(key), names = owner.names;
            const forwardProperty = value => value?.type === "MemberExpression"
              || (value?.type === "ArrowFunctionExpression" && value.body.type === "MemberExpression");
            const table = child.arguments[0];
            if (table?.type === "ArrayExpression") {
              const values = table.elements;
              if (values.some(value => !value || value.type === "SpreadElement")) {
                errors.push(`dynamic or sparse export table in ${file}`);
                continue;
              }
              for (let at = 0; at < values.length;) {
                const name = values[at++];
                if (name?.type !== "Literal" || typeof name.value !== "string") { errors.push(`nonliteral export table in ${file}`); break; }
                const value = values[at++];
                if (value?.type === "Literal" && typeof value.value === "number") {
                  const definition = values[at++];
                  if (value.value !== 0 || !definition) { errors.push(`unsupported export flag in ${file}`); break; }
                  if (forwardProperty(definition)) owner.unmeasured.add(name.value);
                } else if (!value) { errors.push(`missing export definition in ${file}`); break; }
                else if (forwardProperty(value)) owner.unmeasured.add(name.value);
                if (names.has(name.value)) errors.push(`duplicate export ${name.value} in ${file}`);
                names.add(name.value);
              }
            } else if (table?.type === "ObjectExpression") {
              for (const property of table.properties) {
                const name = !property.computed && property.type === "Property"
                  ? property.key.name ?? property.key.value : null;
                if (typeof name !== "string") errors.push(`nonliteral export table in ${file}`);
                else {
                  if (names.has(name)) errors.push(`duplicate export ${name} in ${file}`);
                  names.add(name);
                  if (forwardProperty(property.value)) owner.unmeasured.add(name);
                }
              }
            } else errors.push(`unsupported export registration in ${file}`);
          }
        }
        if (!exportsByModule.size) exportsByModule.set(JSON.stringify(ids), { moduleIds: ids.map(String), names: new Set(), unmeasured: new Set() });
        for (const { moduleIds, names, unmeasured } of exportsByModule.values()) factories.push({ file, moduleIds,
          registrationIds: ids.map(String), exports: names, namespaceTarget, namespaceError,
          asyncNamespaceTarget, asyncNamespaceError, asyncFiles,
          unmeasuredExports: unmeasured,
          start: factory.start, end: factory.end });
      }
    }
  }
  return { factories, loaders, error: errors.length ? [...new Set(errors)].join("; ") : null };
}

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
function readManifest(file, route) {
  const text = fs.readFileSync(file, "utf8");
  const entries = new Set();
  const clientModules = new Map();
  const routeKey = (route === "/" ? "" : route) + "/page";
  let matched = 0;
  for (const m of text.matchAll(MANIFEST_KEY)) {
    if (m[1] !== routeKey) continue;
    if (++matched !== 1) throw new Error(`duplicate ${routeKey} namespace in ${file}`);
    const start = m.index + m[0].length;
    const end = matchBrace(text, start);
    if (end < 0) throw new Error(`unreadable manifest ${file}`);
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj.entryJSFiles || typeof obj.entryJSFiles !== "object" || Array.isArray(obj.entryJSFiles)) {
      throw new Error(`no explicit entryJSFiles for ${routeKey}: a clientModules union cannot identify route entries`);
    }
    for (const files of Object.values(obj.entryJSFiles)) {
      if (!Array.isArray(files) || !files.every(f => typeof f === "string" && normFile(f).endsWith(".js"))) {
        throw new Error(`unreadable entryJSFiles for ${routeKey}`);
      }
      for (const f of files) entries.add(normFile(f));
    }
    if (!entries.size) throw new Error(`empty entryJSFiles for ${routeKey}`);
    for (const [key, mod] of Object.entries(obj.clientModules ?? {})) {
      const p = key.replace(/\\/g, "/").replace(/ <module evaluation>$/, "").replace(/ \[[^\]]*\].*$/, "");
      const at = p.startsWith("[project]/") ? "[project]/".length : p.indexOf("/src/") + 1;
      if (at <= 0 && !p.startsWith("src/")) continue;
      const src = p.slice(Math.max(at, 0));
      if (!clientModules.has(src)) clientModules.set(src, new Set());
      // Normalize deployment queries before recognizing a script; the manifest carries real ?dpl URLs.
      for (const c of mod.chunks ?? []) { const f = normFile(c); if (f.endsWith(".js")) clientModules.get(src).add(f); }
    }
  }
  if (matched !== 1) throw new Error(`no ${routeKey} namespace in ${file}`);
  return { entries, clientModules };
}

/** Everything a reading needs from one build: the symbol map and every client chunk's text. */
export function loadBuild(nextDir) {
  const chunks = new Map();
  const factories = new Map();
  for (const rel of listFiles(nextDir, "static/chunks")) {
    if (rel.endsWith(".js")) {
      const text = fs.readFileSync(path.join(nextDir, rel), "utf8");
      chunks.set(rel, text);
      factories.set(rel, readTurbopackFactories(text, rel));
    }
  }
  return { nextDir, symbolOf: readSymbols(nextDir), chunks, factories,
    loaderBindings: [...factories.values()].flatMap(index => index.loaders) };
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
  let manifest, lm;
  try {
    manifest = readManifest(mf, route);
    lm = JSON.parse(fs.readFileSync(lmf, "utf8"));
  } catch (error) { return { route, missing: error.message }; }
  const { entries, clientModules } = manifest;
  const texts = [...entries].sort().map((f) => ({ f, t: exists(build.nextDir, f) ? build.chunks.get(f) ?? null : null }));
  if (plant !== null) texts.push({ f: "(planted in memory)", t: plant });
  const parts = new Map(); // export → [{ id, files }]
  for (const [key, row] of Object.entries(lm)) {
    const id = normId(row?.id ?? key);
    for (const sym of build.symbolOf.get(id) ?? build.symbolOf.get(normId(key)) ?? new Set(["?"])) {
      if (!parts.has(sym)) parts.set(sym, []);
      parts.get(sym).push({ id, files: (row?.files ?? []).map(normFile) });
    }
  }
  // A lazy manifest can name a missing preload even when the client loader names an extant chunk. That build still
  // sends a 404 on first navigation; "own chunk (0 KB)" must not pass as valid lazy delivery.
  const unreadableParts = [...new Set([...parts.values()].flatMap(rows => rows.flatMap(row => row.files)))].filter(f => !exists(build.nextDir, f));
  const reading = { route, build, entries, clientModules, texts, parts, unreadable: texts.filter((x) => x.t === null).map((x) => x.f), unreadableParts };
  reading.primaryFailures = [...parts.keys()].map(sym => ({ sym, primary: primaryOf(reading, sym) })).filter(row => !row.primary.ok);
  reading.factoryParseFailures = [...entries].filter(file => build.factories.get(file)?.error).map(file => ({ file, error: build.factories.get(file).error }));
  return reading;
}

/** Identify exactly one registered factory exporting the loader's chosen name in declared files or actual entries.
 * A loadable may list only a shared dependency because its component already has an entry factory (WinCelebration).
 */
function primaryOf(reading, sym) {
  const rows = reading.parts.get(sym) ?? [];
  if (!rows.length) return { ok: true, absent: true };
  if (sym === "?") return { ok: false, why: "loader's chosen export is unknown" };
  const definitions = new Map();
  const loaderTraces = [];
  for (const row of rows) {
    const scope = [...new Set([...row.files, ...reading.entries])];
    const candidates = [];
    for (const file of scope) {
      if (!exists(reading.build.nextDir, file)) return { ok: false, why: `declared file is missing: ${file}` };
      const index = reading.build.factories.get(file);
      if (!index || index.error) return { ok: false, why: index?.error ?? `unreadable factory index: ${file}` };
      for (const factory of index.factories) if (factory.exports.has(sym)) candidates.push(factory);
    }
    if (candidates.length !== 1) return { ok: false, why: `${sym} has ${candidates.length} primary factory definitions for loader ${row.id}` };
    const moduleAt = id => scope.flatMap(file => reading.build.factories.get(file).factories.filter(factory => factory.moduleIds.includes(id)));
    const bindings = reading.build.loaderBindings.filter(binding => binding.loadableId === row.id && binding.symbol === sym
      && scope.includes(binding.file));
    if (!bindings.length) return { ok: false, why: `no measured client import binding for loader ${row.id} selecting ${sym}` };
    for (const binding of bindings) {
      const shims = moduleAt(binding.asyncModuleId);
      if (!shims.length) return { ok: false, why: `async shim ${binding.asyncModuleId} has 0 definitions for loader ${row.id}` };
      // The compiler emits route-specific preload variants of one async-shim ID. Every variant must agree on the
      // literal namespace and have all dependencies present; this never deduplicates primary component definitions.
      for (const shim of shims) {
        if (shim.asyncNamespaceError) return { ok: false, why: shim.asyncNamespaceError };
        if (shim.asyncNamespaceTarget !== row.id) return { ok: false,
          why: `async shim ${binding.asyncModuleId} imports namespace ${shim.asyncNamespaceTarget ?? "unknown"}, not loader ${row.id}` };
        const missing = shim.asyncFiles.filter(file => !exists(reading.build.nextDir, file));
        if (missing.length) return { ok: false, why: `async shim ${binding.asyncModuleId} dependency missing: ${missing.join(", ")}` };
      }
    }
    const visited = new Set(), trace = [];
    let id = row.id, factory = null;
    while (!factory) {
      if (visited.has(id) || visited.size >= 32) return { ok: false, why: `cyclic or excessive namespace trace for loader ${row.id}` };
      visited.add(id);
      const matches = moduleAt(id);
      if (matches.length !== 1) return { ok: false, why: `namespace module ${id} has ${matches.length} definitions for loader ${row.id}` };
      const selected = matches[0];
      trace.push({ moduleId: id, file: selected.file });
      if (selected.namespaceError) return { ok: false, why: selected.namespaceError };
      if (selected.namespaceTarget !== null) { id = selected.namespaceTarget; continue; }
      if (selected.unmeasuredExports.has(sym)) return { ok: false, why: `unsupported property-forwarding export implementation for ${sym} in module ${id}` };
      if (!selected.exports.has(sym)) return { ok: false, why: `selected namespace module ${id} does not export ${sym} for loader ${row.id}` };
      factory = selected;
    }
    if (factory !== candidates[0]) return { ok: false, why: `selected namespace does not identify the unique ${sym} primary` };
    loaderTraces.push({ loadableId: row.id, symbol: sym,
      imports: bindings.map(binding => ({ file: binding.file, asyncModuleId: binding.asyncModuleId,
        shims: moduleAt(binding.asyncModuleId).map(shim => ({ file: shim.file, namespaceId: shim.asyncNamespaceTarget, files: shim.asyncFiles })) })),
      namespaceTrace: trace, primaryModuleIds: factory.moduleIds, primaryFile: factory.file });
    definitions.set(JSON.stringify([factory.file, factory.start, factory.moduleIds]), factory);
  }
  if (definitions.size !== 1) return { ok: false, why: `${sym} resolves to ${definitions.size} different primary definitions across loaders` };
  const factory = [...definitions.values()][0];
  return { ok: true, factory, loaderTraces, ownFiles: rows.some(row => row.files.length > 0), inEntry: reading.entries.has(factory.file) };
}

/** first-load-parts.py:135-145. */
function structOf(reading, sym) {
  const rows = reading.parts.get(sym) ?? [];
  if (!rows.length) return "no next/dynamic entry";
  const primary = primaryOf(reading, sym);
  if (!primary.ok) return `NOT MEASURED (${primary.why})`;
  if (!primary.ownFiles) return "no files of its own";
  const label = `${base(primary.factory.file)}; ${sym} factory ${primary.factory.moduleIds.join("/")}`;
  if (primary.inEntry) return `FIRST LOAD (${label})`;
  return `own chunk (${label}, ${kb(reading.build.chunks.get(primary.factory.file)?.length ?? 0)})`;
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
  const primary = row.part ? primaryOf(reading, row.part) : null;
  if (primary && !primary.ok) return { struct, module: null, mark: "NOT MEASURED", verdict: "NOT MEASURED", bad: true };
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
  return { struct, module: mod?.text ?? null, mark, verdict, bad,
    ...(primary?.factory ? { primary: { file: primary.factory.file, moduleIds: primary.factory.moduleIds, loaderTraces: primary.loaderTraces } } : {}) };
}

/**
 * The whole reading: every route, the control (deposit found everywhere; an in-memory plant reported), the verdicts.
 * `table` and `judgedRows` come from checkMarkerTable. Returns { routes, controlOk, plant, bad }.
 */
export function readAll(build, routes, { table = MARKERS, judgedRows, expectOn = true, control = CONTROLS[0] } = {}) {
  const judged = (row) => judgedRows?.get(row.id)?.judged ?? (row.stage !== "S7" && row.stage !== "S8");
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
    if (!found || reading.unreadable.length || reading.unreadableParts.length || reading.primaryFailures.length || reading.factoryParseFailures.length) controlOk = false;
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
      say(`  ${r.found && !r.reading.unreadable.length && !r.reading.unreadableParts.length && !r.reading.primaryFailures.length && !r.reading.factoryParseFailures.length ? "✓" : "✗"} ${r.route}: classic deposit test id ${JSON.stringify(result.control.marker)} ${r.found ? "FOUND" : "MISSING"} in its ${r.reading.entries.size} entry files` +
        (r.reading.unreadable.length ? `; ${r.reading.unreadable.length} entry file(s) not on disk: ${r.reading.unreadable.map(base).join(", ")}` : "") +
        (r.reading.unreadableParts.length ? `; ${r.reading.unreadableParts.length} lazy file(s) not on disk: ${r.reading.unreadableParts.map(base).join(", ")}` : "") +
        (r.reading.primaryFailures.length ? `; primary NOT MEASURED: ${r.reading.primaryFailures.map(p => `${p.sym}: ${p.primary.why}`).join(" | ")}` : "") +
        (r.reading.factoryParseFailures.length ? `; entry factory parse failed: ${r.reading.factoryParseFailures.map(p => p.error).join(" | ")}` : ""));
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
      const declared = row.part ? r.reading.parts.get(row.part) : null;
      if (declared?.length) say(`      declared loader files: ${declared.map(part => `${part.id} → ${part.files.join(", ") || "(none)"}`).join("; ")}`);
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

const fixtureModule = (id, body) => `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push([undefined,${id},ctx=>{${body}}]);`;
const fixtureShim = (id, namespaceId, files = []) => fixtureModule(id, `ctx.v(imported=>${files.length
  ? `Promise.all(${JSON.stringify(files)}.map(file=>ctx.l(file))).then(()=>imported(${namespaceId}))` : `imported(${namespaceId})`});`);
const fixtureLoader = (id, namespaceId, symbol, shimId) => fixtureModule(id,
  `const lazy=(0,t.default)(()=>ctx.A(${shimId}).then(m=>m.${symbol}).catch(a),{loadableGenerated:{modules:[${namespaceId}]}});ctx.s(["FixtureLoader${symbol}",0,lazy]);`);
const fixtureFactory = (id, name, marker = "") => {
  const literal = marker.startsWith('"') && marker.endsWith('"') ? marker : JSON.stringify(marker);
  return fixtureModule(id, `const marker=${literal};ctx.s([${JSON.stringify(name)},0,()=>null]);`);
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
  writeAt(root, ".next/server/chunks/ssr/shell-lazy.js", `const loadables=[${parts.map((r) => loader(r.part)).join(",")}];`);
  // Client chunk: an ssr:false part, whose loader only the client chunks keep.
  writeAt(root, ".next/static/chunks/overlays.js", `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push([undefined,99,ctx=>{const lazy=(0,r.default)(()=>ctx.A(958512).then(e=>e.ChatRoot).catch(a),{loadableGenerated:{modules:[958511]},ssr:!1});ctx.s(["LazyOverlays",0,lazy]);}]);`);
  writeAt(root, ".next/static/chunks/layout.js",
    `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push([undefined,51000,ctx=>{const markers=["deposit-header","deposit-rail","offline-notice","50pick:celebrate","kp-journey-shell"];ctx.s(["WinCelebrationHost",0,()=>null]);}]);\n`
    + parts.map((row, index) => fixtureLoader(800001 + index, ids.get(row.part), row.part, 900001 + index)
      + fixtureShim(900001 + index, ids.get(row.part))).join("\n") + fixtureShim(958512, 958511)
    + fs.readFileSync(path.join(root, ".next/static/chunks/overlays.js"), "utf8"));
  writeAt(root, ".next/static/chunks/help-layout.js", `/*the help route's layout, without the classic bar*/`);
  writeAt(root, ".next/static/chunks/page.js", `/*page*/`);
  for (const r of parts) if (r.part !== "WinCelebrationHost") writeAt(root, `.next/static/chunks/part-${r.part}.js`, fixtureFactory(ids.get(r.part), r.part, r.marker ?? ""));
  writeAt(root, ".next/static/chunks/part-ChatRoot.js", fixtureFactory(958511, "ChatRoot"));
  if (homeLazy) {
    writeAt(root, ".next/static/chunks/home-lazy.js", fixtureFactory(2, "LazyHowToCard", "kp-home-lazy-fixture"));
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
    for (const part of ["JourneyTopBar", "ChatRoot"]) {
      const file = path.join(a, `.next/static/chunks/part-${part}.js`), bytes = fs.readFileSync(file);
      fs.rmSync(file);
      const lost = readAll(b1, ["/"], { table, judgedRows: t1.rows });
      check(`C3 a missing ${part} lazy preload fails the same whole-build verdict`, !lost.controlOk && lost.bad
        && lost.routes[0].reading.unreadableParts.includes(`static/chunks/part-${part}.js`));
      fs.writeFileSync(file, bytes);
    }
    check("C3 restored lazy files recover the same whole-build verdict", !readAll(b1, ["/"], { table, judgedRows: t1.rows }).bad);
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
    // The rule for a row still waiting for its marker, on a copy of the table whose HomeLazy row has none (as WP6 left it).
    writeAt(a, "src/components/journey/home/home-lazy.tsx", `"use client";\n`);
    const unmarked = table.map((r) => (r.id === "HomeLazy" ? { ...r, marker: null } : r));
    const t6c = checkMarkerTable(a, [...CONTROLS, ...unmarked]);
    check("C6 an S7 file landed while its row has no marker FAILS the table", !t6c.ok && Boolean(t6c.lines.find((l) => l.includes("HomeLazy") && l.includes("give the row its marker"))));
    const t6d = checkMarkerTable(a, [...CONTROLS, ...table]);
    const hl6 = t6d.lines.find((l) => l.includes("HomeLazy"));
    check("C6 an S7 file landed without the marker its row names FAILS the table", !t6d.ok && Boolean(hl6?.startsWith("✗") && hl6.includes("held by no file")), hl6);

    // C10: the S7 home lazy module judged by the route's client modules, once landed, mounted and given a marker.
    const c = path.join(tmp, "c");
    writeFixture(c, { homeLazy: true });
    // C10 already creates the mounted journey-home owner. Since S8 it also owns this rendering marker.
    const homeBreakMarker = table.find(row => row.id === "JourneyHomeBreak");
    if (homeBreakMarker) fs.appendFileSync(path.join(c, homeBreakMarker.file), `\nexport const breakMarker = ${homeBreakMarker.marker};\n`);
    const withMarker = table.map((r) => (r.id === "HomeLazy" ? { ...r, marker: "kp-home-lazy-fixture" } : r));
    const t10 = checkMarkerTable(c, [...CONTROLS, ...withMarker]);
    check("C10 the landed home lazy module with a marker satisfies the table", t10.ok, t10.lines.filter((l) => l.startsWith("✗")).join(" | "));
    const b10 = loadBuild(path.join(c, ".next"));
    const r10 = readAll(b10, ["/", "/markets"], { table: withMarker, judgedRows: t10.rows });
    const hl = r10.routes.map((r) => r.rows.find((x) => x.row.id === "HomeLazy")?.j);
    check("C10 on / the home lazy module is a client reference in the first load, as expected", hl[0]?.verdict === "as expected" && hl[0].module.includes("in the first load"), hl[0] ? `${hl[0].module}; ${hl[0].mark}` : "PENDING");
    check("C10 on /markets it is not a client reference, as expected", hl[1]?.verdict === "as expected" && hl[1].module.startsWith("not"), hl[1]?.module);
    // The same client-reference reader must keep query-bearing script URLs, without admitting numeric chunk ids.
    const queryManifest = path.join(c, ".next/server/app/page_client-reference-manifest.js");
    const queryOriginal = fs.readFileSync(queryManifest, "utf8");
    const querySource = queryOriginal.replaceAll('/_next/static/chunks/home-lazy.js', '/_next/static/chunks/home-lazy.js?dpl=fixture');
    fs.writeFileSync(queryManifest, querySource);
    const queryRead = readAll(b10, ["/"], { table: withMarker, judgedRows: t10.rows });
    check("C10 deployment-query module scripts keep the exact home client-reference verdict", querySource !== queryOriginal
      && !queryRead.bad && queryRead.routes[0].reading.clientModules.get("src/components/journey/home/home-lazy.tsx").has("static/chunks/home-lazy.js"));
    fs.writeFileSync(queryManifest, querySource.replaceAll('/_next/static/chunks/home-lazy.js?dpl=fixture', '/_next/static/chunks/part-JourneyTopBar.js?dpl=fixture'));
    const queryWrong = readAll(b10, ["/"], { table: withMarker, judgedRows: t10.rows });
    check("C10 a query-bearing lazy file keeps the module out of first load and fails the same home verdict", queryWrong.bad && queryWrong.routes[0].rows.find(x => x.row.id === "HomeLazy")?.j?.verdict === "UNEXPECTED"
      && queryWrong.routes[0].reading.clientModules.get("src/components/journey/home/home-lazy.tsx").has("static/chunks/part-JourneyTopBar.js")
      && !queryWrong.routes[0].reading.clientModules.get("src/components/journey/home/home-lazy.tsx").has("static/chunks/home-lazy.js"));
    fs.writeFileSync(queryManifest, queryOriginal);
    const p10 = readRoute(b10, "/markets", "kp-home-lazy-fixture");
    const hp = judgeRow(withMarker.find((r) => r.id === "HomeLazy"), p10, true, true);
    check("C10 the home lazy marker planted into /markets' entry set is UNEXPECTED", hp.bad, `${hp.mark}; ${hp.verdict}`);

    // C12: the three actual S8 rendering markers use the same entry reader as every earlier row. Their source owner
    // must be unique, and each marker joined to a classic entry set must fail — server drawings included.
    const s8Rendering = table.filter(row => ["QuestionGhost", "JourneyBetButtons", "JourneyHomeBreak"].includes(row.id));
    check("C12 all three S8 rendering markers are in the canonical table", s8Rendering.length === 3);
    for (const row of s8Rendering) writeAt(c, row.file, `export const marker = ${row.marker};\n`);
    const t12 = checkMarkerTable(c, [...CONTROLS, ...withMarker]);
    check("C12 the landed S8 marker owners satisfy the source table", t12.ok);
    for (const row of s8Rendering) {
      const clean = judgeRow(row, readRoute(b10, "/"), t12.rows.get(row.id)?.judged, true);
      const joined = judgeRow(row, readRoute(b10, "/", row.marker), t12.rows.get(row.id)?.judged, true);
      check(`C12 ${row.id}: absent from a classic entry set passes`, clean?.bad === false && clean.verdict === "as expected");
      check(`C12 ${row.id}: planted into that same entry set is UNEXPECTED`, joined?.bad === true && joined.verdict === "UNEXPECTED");
      const duplicate = `src/control-${row.id}.tsx`;
      writeAt(c, duplicate, `export const duplicate = ${row.marker};\n`);
      const duplicated = checkMarkerTable(c, [...CONTROLS, ...withMarker]);
      check(`C12 ${row.id}: a second source owner is refused`, !duplicated.ok && duplicated.lines.some(line => line.startsWith("✗") && line.includes(row.id)));
      fs.unlinkSync(path.join(c, duplicate));
      writeAt(c, row.file, "export const missing = true;\n");
      const missing = checkMarkerTable(c, [...CONTROLS, ...withMarker]);
      check(`C12 ${row.id}: its source marker removed is refused`, !missing.ok && missing.lines.some(line => line.startsWith("✗") && line.includes(row.id)));
      writeAt(c, row.file, `export const marker = ${row.marker};\n`);
    }

    // C13: use real Turbopack registration syntax, not marker-shaped fake chunks. Common payload is allowed in
    // entries; the chosen component's uniquely identified executable factory must still remain outside them.
    const d = path.join(tmp, "d");
    writeFixture(d);
    const dNext = path.join(d, ".next");
    const dRows = checkMarkerTable(d, [...CONTROLS, ...table]).rows;
    const dRead = (build = loadBuild(dNext), extra = {}) => readAll(build, ["/"], { table, judgedRows: dRows, ...extra });
    const topFile = "static/chunks/part-JourneyTopBar.js";
    const topPath = path.join(dNext, topFile);
    const topOriginal = fs.readFileSync(topPath, "utf8");
    const layoutPath = path.join(dNext, "static/chunks/layout.js");
    const layoutOriginal = fs.readFileSync(layoutPath, "utf8");
    const dLoadable = path.join(dNext, "server/app/page/react-loadable-manifest.json");
    const loadableOriginal = fs.readFileSync(dLoadable, "utf8");
    const sharedLoadable = JSON.parse(loadableOriginal);
    const topId = Object.keys(sharedLoadable).find(id => sharedLoadable[id].files.includes(topFile));
    sharedLoadable[topId].files.unshift("static/chunks/layout.js");
    fs.writeFileSync(dLoadable, JSON.stringify(sharedLoadable));
    const shared = dRead();
    check("C13 a named entry dependency plus lazy primary factory passes the same whole-build verdict", !shared.bad
      && shared.routes[0].rows.find(x => x.row.id === "JourneyTopBar")?.j?.struct.startsWith("own chunk"));
    fs.writeFileSync(topPath, 'const marker="journey-top-bar";');
    fs.writeFileSync(layoutPath, layoutOriginal + "\n" + fixtureFactory(Number(topId), "JourneyTopBar"));
    const joined = dRead();
    const joinedTop = joined.routes[0].rows.find(x => x.row.id === "JourneyTopBar")?.j;
    check("C13 moving the actual primary definition into that entry fails even with its marker kept lazy", joined.bad
      && joinedTop?.struct.startsWith("FIRST LOAD") && joinedTop.mark === "not in the first load");
    fs.writeFileSync(layoutPath, layoutOriginal);
    fs.writeFileSync(topPath, topOriginal);
    const dependencyPath = path.join(dNext, "static/chunks/only-dependency.js");
    fs.writeFileSync(dependencyPath, fixtureFactory(888, "SharedDependency"));
    sharedLoadable[topId].files.push("static/chunks/only-dependency.js");
    fs.writeFileSync(dLoadable, JSON.stringify(sharedLoadable));
    check("C13 an existing nonprimary declared dependency passes", !dRead().bad);
    fs.unlinkSync(dependencyPath);
    const lostDependency = dRead();
    check("C13 a missing nonprimary declared dependency fails without a marker or primary leak", lostDependency.bad
      && !lostDependency.controlOk && lostDependency.routes[0].reading.unreadableParts.includes("static/chunks/only-dependency.js"));
    fs.writeFileSync(dLoadable, loadableOriginal);
    const alterPrimary = (label, bytes, reason) => {
      fs.writeFileSync(topPath, bytes);
      const result = dRead();
      check(label, result.bad && !result.controlOk
        && result.routes[0].reading.primaryFailures.some(x => x.sym === "JourneyTopBar" && x.primary.why.includes(reason)));
      fs.writeFileSync(topPath, topOriginal);
    };
    alterPrimary("C13 deleting the primary export fails despite its original marker", topOriginal.replace('"JourneyTopBar",0,()=>null', ""), "0 primary");
    alterPrimary("C13 renaming the primary export fails despite its original marker", topOriginal.replace('"JourneyTopBar",0', '"OtherComponent",0'), "0 primary");
    alterPrimary("C13 two physical factories exporting the selected name are refused", topOriginal + fixtureFactory(999, "JourneyTopBar"), "2 primary");
    alterPrimary("C13 unreadable primary JavaScript is refused", topOriginal + "(", "bad JavaScript");
    alterPrimary("C13 an uncalled nested registration is not a primary definition", `function notCalled(){${topOriginal}}`, "0 primary");
    alterPrimary("C13 a matching registry string is not an actual Turbopack registration", topOriginal.replace("globalThis.TURBOPACK||(globalThis.TURBOPACK=[])", '".TURBOPACK"'), "0 primary");
    alterPrimary("C13 a callback's shadowed export table is not a primary definition",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', 'const callback=ctx=>{ctx.s(["JourneyTopBar",0,()=>null]);};'), "0 primary");
    alterPrimary("C13 an unreachable conditional export table is not a primary definition",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', 'if(false){ctx.s(["JourneyTopBar",0,()=>null]);}'), "0 primary");
    alterPrimary("C13 a short-circuited export table is not a primary definition",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', 'false&&ctx.s(["JourneyTopBar",0,()=>null]);'), "0 primary");
    alterPrimary("C13 a return before export registration cannot supply a primary definition",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', 'return;ctx.s(["JourneyTopBar",0,()=>null]);'), "0 primary");
    alterPrimary("C13 a conditional return before export registration refuses measurement",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', 'if(true)return;ctx.s(["JourneyTopBar",0,()=>null]);'), "0 primary");
    alterPrimary("C13 a reassigned factory context cannot establish module exports",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', 'ctx=other;ctx.s(["JourneyTopBar",0,()=>null]);'), "factory context is reassigned");
    alterPrimary("C13 an overwritten context export method cannot establish module exports",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', 'ctx.s=()=>{};ctx.s(["JourneyTopBar",0,()=>null]);'), "factory context is reassigned");
    alterPrimary("C13 a destructuring write to the context cannot establish module exports",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', '({x:ctx}=other);ctx.s(["JourneyTopBar",0,()=>null]);'), "factory context is reassigned");
    alterPrimary("C13 a destructuring write to the context method cannot establish module exports",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', '({x:ctx.s}=other);ctx.s(["JourneyTopBar",0,()=>null]);'), "factory context is reassigned");
    alterPrimary("C13 deleting the context export method cannot establish module exports",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', 'delete ctx.s;ctx.s(["JourneyTopBar",0,()=>null]);'), "factory context is reassigned");
    alterPrimary("C13 a dynamic spread export tuple refuses measurement",
      topOriginal.replace('["JourneyTopBar",0,()=>null]', '["JourneyTopBar",...unknown]'), "dynamic or sparse export table");
    alterPrimary("C13 an unsupported literal export flag is refused", topOriginal.replace('"JourneyTopBar",0', '"JourneyTopBar",1'), "unsupported export flag");
    alterPrimary("C13 duplicate export names in one table are refused", topOriginal.replace('"JourneyTopBar",0,()=>null', '"JourneyTopBar",0,()=>null,"JourneyTopBar",0,()=>null'), "duplicate export");
    alterPrimary("C13 two virtual modules exporting the selected name are ambiguous",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', `ctx.s(["JourneyTopBar",0,()=>null],${topId});ctx.s(["JourneyTopBar",0,()=>null],999);`), "2 primary");
    alterPrimary("C13 a nonliteral virtual module identity refuses measurement",
      topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', 'ctx.s(["JourneyTopBar",0,()=>null],chosenId);'), "unsupported export module identity");
    alterPrimary("C13 a computed unknown export-registration method is not guessed",
      topOriginal.replace("ctx.s(", "ctx[s]("), "0 primary");
    // Both emitted export-table generations are understood, and grouped module aliases still count as one factory.
    for (const [label, bytes] of [
      ["getter pairs", topOriginal.replace('"JourneyTopBar",0,()=>null', '"JourneyTopBar",()=>null')],
      ["legacy literal object", topOriginal.replace('["JourneyTopBar",0,()=>null]', '{JourneyTopBar:()=>null}')],
      ["grouped module ids", topOriginal.replace(`undefined,${topId},`, `undefined,[${topId},999],`)],
      ["flat scope-hoisted module ids", topOriginal.replace(`undefined,${topId},`, `undefined,${topId},999,`)
        .replace('ctx.s(["JourneyTopBar",0,()=>null]);', `ctx.s(["JourneyTopBar",0,()=>null],${topId});ctx.s(["Dependency",0,()=>null],999);`)],
      ["nested reused module table", topOriginal.replace(`undefined,${topId},ctx=>`, `undefined,[${topId},ctx=>`)
        .replace(";}]);", ";}],999,ctx=>{ctx.s([\"Other\",0,()=>null]);}]);")],
      ["same common export names in distinct virtual modules", topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);',
        `ctx.s(["JourneyTopBar",0,()=>null],${topId});ctx.s(["Common",0,()=>null],998);ctx.s(["Common",0,()=>null],999);`)],
    ]) {
      fs.writeFileSync(topPath, bytes);
      check(`C13 ${label} retain one measured lazy primary and the same good verdict`, !dRead().bad);
    }
    fs.writeFileSync(topPath, topOriginal);
    const loaderPath = path.join(dNext, "server/chunks/ssr/shell-lazy.js");
    const loaderOriginal = fs.readFileSync(loaderPath, "utf8");
    const secondLoader = ';const second=(0,t.default)(()=>e.A(2).then(e=>e.JourneyTopBar).catch(a),{loadableGenerated:{modules:[787878]}});';
    fs.writeFileSync(loaderPath, loaderOriginal + secondLoader);
    const sameExportRows = JSON.parse(loadableOriginal);
    sameExportRows["787878"] = { id: 787878, files: [topFile] };
    fs.writeFileSync(topPath, topOriginal + '(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push([undefined,787878,ctx=>{ctx.n(ctx.i(' + topId + '));}]);');
    fs.writeFileSync(layoutPath, layoutOriginal + fixtureLoader(800787, 787878, "JourneyTopBar", 900787) + fixtureShim(900787, 787878));
    fs.writeFileSync(dLoadable, JSON.stringify(sameExportRows));
    check("C13 two loaders that independently resolve to the same unique primary pass", !dRead().bad);
    sameExportRows["787878"].files = ["static/chunks/page.js"];
    fs.writeFileSync(dLoadable, JSON.stringify(sameExportRows));
    const borrowed = dRead();
    check("C13 an unresolved loader cannot borrow the primary from another loader's unrelated files", borrowed.bad
      && !borrowed.controlOk && borrowed.routes[0].reading.primaryFailures.some(x => x.primary.why.includes("loader 787878")));
    fs.writeFileSync(dLoadable, loadableOriginal);
    fs.writeFileSync(topPath, topOriginal);
    fs.writeFileSync(layoutPath, layoutOriginal);
    fs.writeFileSync(loaderPath, loaderOriginal);
    fs.writeFileSync(loaderPath, loaderOriginal.replace(".then(e=>e.JourneyTopBar)", '.then(e=>e["JourneyTopBar"])'));
    fs.writeFileSync(layoutPath, layoutOriginal.replace(".then(m=>m.JourneyTopBar)", '.then(m=>m["JourneyTopBar"])'));
    const unknown = dRead(undefined, { expectOn: false });
    check("C13 an unreadable chosen export refuses measurement even with --no-expect", unknown.bad && !unknown.controlOk
      && unknown.routes[0].reading.primaryFailures.some(x => x.sym === "?"));
    fs.writeFileSync(loaderPath, loaderOriginal);
    fs.writeFileSync(layoutPath, layoutOriginal);
    const dManifestPath = path.join(dNext, "server/app/page_client-reference-manifest.js");
    const manifestOriginal = fs.readFileSync(dManifestPath, "utf8");
    fs.writeFileSync(dManifestPath, manifestOriginal.replace('"entryJSFiles":', '"notEntryJSFiles":'));
    const noExplicitEntries = dRead();
    check("C13 missing explicit route entries never fall back to a global client-reference union", noExplicitEntries.bad
      && noExplicitEntries.routes[0].missing?.includes("no explicit entryJSFiles"));
    fs.writeFileSync(dManifestPath, manifestOriginal.replace('__RSC_MANIFEST["/page"]', '__RSC_MANIFEST["/other/page"]'));
    const wrongNamespace = dRead();
    check("C13 another route's manifest namespace cannot become this route's entries", wrongNamespace.bad
      && wrongNamespace.routes[0].missing?.includes("no /page namespace"));
    fs.writeFileSync(dManifestPath, manifestOriginal);
    check("C13 restoring every source fault recovers the original whole-build verdict", !dRead().bad);

    // C14: a coincidental export name cannot replace the selected module identity or the actual import path.
    alterPrimary("C14 a counterfeit same-export factory with the wrong module id is refused",
      topOriginal.replace(`undefined,${topId},`, "undefined,444444,"), `namespace module ${topId} has 0 definitions`);
    alterPrimary("C14 a same-name property-forwarding facade is not mistaken for the component's code",
      topOriginal.replace('["JourneyTopBar",0,()=>null]', '["JourneyTopBar",()=>someNamespace.JourneyTopBar]'), "unsupported property-forwarding export implementation");
    const namespace = (id, target) => fixtureModule(id, `ctx.n(ctx.i(${target}));`);
    fs.writeFileSync(topPath, namespace(topId, 444444) + fixtureFactory(444444, "JourneyTopBar", '"journey-top-bar"'));
    check("C14 literal namespace reexports bind the loader to its real primary id", !dRead().bad);
    fs.writeFileSync(topPath, namespace(topId, 444444) + namespace(444444, 555555) + fixtureFactory(555555, "JourneyTopBar", '"journey-top-bar"'));
    check("C14 a measured chain of literal namespace reexports retains the same good verdict", !dRead().bad);
    alterPrimary("C14 a missing selected namespace target is refused despite a same-name definition",
      namespace(topId, 777777) + fixtureFactory(444444, "JourneyTopBar", '"journey-top-bar"'), "namespace module 777777 has 0 definitions");
    alterPrimary("C14 a dynamic namespace reexport is refused despite a same-name definition",
      fixtureModule(topId, "ctx.n(unknown);") + fixtureFactory(444444, "JourneyTopBar", '"journey-top-bar"'), "unsupported namespace reexport");
    alterPrimary("C14 a cyclic namespace path is refused despite a same-name definition",
      namespace(topId, 444444) + namespace(444444, topId) + fixtureFactory(555555, "JourneyTopBar", '"journey-top-bar"'), "cyclic or excessive namespace");
    const topBinding = loadBuild(dNext).loaderBindings.find(binding => binding.loadableId === topId && binding.symbol === "JourneyTopBar");
    check("C14 the fixture exposes its real client loader and async shim identity", Boolean(topBinding));
    const changeLayout = (label, bytes, reason) => {
      fs.writeFileSync(layoutPath, bytes);
      const result = dRead();
      check(label, result.bad && !result.controlOk
        && result.routes[0].reading.primaryFailures.some(x => x.sym === "JourneyTopBar" && x.primary.why.includes(reason)));
      fs.writeFileSync(layoutPath, layoutOriginal);
    };
    changeLayout("C14 a changed shim namespace cannot retain the LMF row's old identity",
      layoutOriginal.replace(`imported(${topId})`, "imported(777777)"), `not loader ${topId}`);
    changeLayout("C14 an unknown client import path is refused despite server loader labels",
      layoutOriginal.replace(".then(m=>m.JourneyTopBar)", ".then(m=>m.Counterfeit)"), "no measured client import binding");
    fs.writeFileSync(layoutPath, layoutOriginal + fixtureShim(topBinding.asyncModuleId, topId, ["static/chunks/page.js"]));
    check("C14 route preload variants of one shim id agree on the same literal namespace", !dRead().bad);
    changeLayout("C14 conflicting same-id shim variants refuse the same whole-build verdict",
      layoutOriginal + fixtureShim(topBinding.asyncModuleId, 777777), `not loader ${topId}`);
    changeLayout("C14 an unmeasured async initializer cannot be treated as a namespace import",
      layoutOriginal.replace(`imported=>imported(${topId})`, `imported=>(imported=other,Promise.resolve()).then(()=>imported(${topId}))`), "unsupported async namespace shim");
    changeLayout("C14 a missing shim preload fails even when the LMF primary exists",
      layoutOriginal + fixtureShim(topBinding.asyncModuleId, topId, ["static/chunks/missing-shim-dependency.js"]), "dependency missing");
    fs.writeFileSync(topPath, `(()=>{"use strict";${topOriginal}})();`);
    check("C14 a synchronous directly invoked shell wrapper is measured", !dRead().bad);
    alterPrimary("C14 a shell wrapper's early return cannot create a registry definition", `(()=>{return;${topOriginal}})();`, "0 primary");
    alterPrimary("C14 a shell wrapper's conditional return cannot create a registry definition", `(()=>{if(true)return;${topOriginal}})();`, "0 primary");
    fs.writeFileSync(topPath, topOriginal.replace('ctx.s(["JourneyTopBar",0,()=>null]);', 'if(true){let ctx=other;ctx.s(["Decoy",0,()=>null]);}ctx.s(["JourneyTopBar",0,()=>null]);'));
    check("C14 block-local context shadowing leaves the real factory context intact", !dRead().bad);
    fs.writeFileSync(topPath, topOriginal);
    check("C14 restoring identity faults recovers the original whole-build verdict", !dRead().bad);

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
