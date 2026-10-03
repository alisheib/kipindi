/**
 * test:journey-shell — THE NEW SHELL'S DECISIONS, HELD BEFORE ANY MARKUP USES THEM (the Vodacom plan S6,
 * `docs/VODACOM-PLAN.md` §0i; `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` WP2, WP3, A1, A12, A18).
 *
 *   npm run test:journey-shell     (in predeploy)
 *   npm run red:journey-shell      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 *   §1 THE TABS — `activeTabFor` over every route on disk, globbed as `test:route-census` globs them: each has an
 *      expected tab or a stated reason for none, a route with neither fails, and a route decided ahead of its page (as
 *      `/account` was, until WP5 put it on disk) loses its exemption the day the page exists. The four tabs in the
 *      deck's order; each tab's own href lights it with
 *      `aria-current="page"`, and section membership is `"true"` (A12 — the rule is pinned here, where it is decided;
 *      WP6a's §8 holds the markup to calling it); look-alike paths are claimed by no row (A18: `/settings` is not `/s`);
 *      the table has no shadowed row, no tab nothing reaches and no label missing in en/sw/zh, and the exported guard,
 *      `assertTabKeysResolve`, agrees and is shown to read the dictionaries; every glyph is real; and ONE file defines
 *      the tabs and the resolver.
 *   §2 THE JOURNEY SURFACES — `isJourneySurface` is an exact allowlist (the boards, the hub and the profile pages are
 *      denied); `isMoneySurface` and `isCommitSurface` answer a golden table exactly as before S6, and the
 *      `red:install-invite` anchor is verbatim. Every WP2 decision module imports only what it is listed with (the
 *      surfaces, the tabs and the header: nothing) and carries no directive.
 *   §3 THE HEADER — `journeyHeaderState`'s truth table: guest, a known / zero / unread balance, a held wallet, a break,
 *      the deposit screen and its return.
 *   §4 THE DOORS — `viewerDoorsFor` for every viewer kind (guest, player, an agent in and out of standing, all seven
 *      staff roles, the agent programme closed, proposals DISABLED, invite withdrawn); `app-shell.tsx` still spelling the
 *      same three formulas and the classic chrome the same proposals rule, so the shell and the hub cannot drift apart
 *      silently; and `viewer-doors.ts` in no browser bundle, because it reads FEATURE_INVITE.
 *   §5 THE FLAG — `useJourneyOn`'s parts on a stand-in document (the server snapshot is false; the attribute and the
 *      event go up and come down), `JourneyFlag` renders nothing and is mounted once, only behind `journeyShown` (WP7),
 *      and every file loading `journey-on.ts` is client code — a "use client" file, or a hook module with no directive
 *      that only client code loads ("a build is not a render").
 *   §6 THE UNREAD COUNT (WP3, as A1 amends it) — the journey's own counter for the Akaunti tab's dot and the hub's
 *      Arifa row, driven in process on a stand-in clock. The dot asks the bell's question on the bell's closed cadence
 *      and failure ladder, jitter included, and refreshes on the bell's two broadcasts (all read out of the bell); the
 *      row reads when it starts and on an inbox change — never on a pushed arrival — and arms no beat; a hidden tab arms
 *      nothing and a guest starts nothing; a new viewer inherits nothing — not the count, not an answer in flight, not a
 *      second poller — and a count is shown only to the viewer it was read for (critic G1). Only the journey's client
 *      components load the hook, and the classic bell loads neither file.
 *   §7 THE HEADER (WP6a) — the S4 fit rules read from `globals.css` as written, at the exact values WP6b's rule probe
 *      reads as computed (A5): a 12px gutter below 360 and 16px from it, 6px gaps, the 44px home link borrowing 9px on
 *      each side, the "+" hidden below 360, the pill's 12 and 12/10, the capsule's 10 and its 12px/14px figure, the
 *      guest pills' 14px at 13px type; from 640 the classic bar's own steps, held against the classic bar's spellings;
 *      the right-hand controls one cluster; no width-capping query anywhere in the shell's rules; the bar renders
 *      `journeyHeaderState`'s answers with no inline style; the destinations from 1024 take aria-current from
 *      `tabAriaCurrent` and speak the kit's underline language; and test:stacking's journey rows hold, judged by the
 *      contract's own predicates (A13).
 *   §8 THE TABS (WP6a) — exactly the four tabs on the classic rail's own classes, the grid on the list (A18), aria-current
 *      from the table (A12), no aria-label on a link, a guest's Tiketi zangu a dialog button; the rail label measured in
 *      sw/en/zh at 320 and 360 (A17), and below 360 the slots stacked from the top so a two-line label cannot lift its
 *      pip; ONE unread poller per width — the bell mounted only from 1024, the dot's counter only below it, neither
 *      while the width is unknown, and only client code loading the width hook; the guest sheet on the kit Modal,
 *      portalled and on test:popup-fit's record (A13); and the chrome mounted by AppShell alone, lazily (WP6b), through
 *      the shell's one lazy module (WP6c).
 *   §9 THE ROUTE CENSUS (WP6b, A9) — S6's done-when, "every route keeps an entrance", as a reachability graph. Roots
 *      are what a journey PHONE shows (the four tabs, the header's own links, the sheets, the footer and, on `/account`,
 *      `hubRowsFor(viewer)`); edges are the path literals of the code each page renders, comments stripped; the walk
 *      runs for seven kinds of reader, and a guest meeting a protected page walks on from sign-in. Every route the
 *      classic chrome reaches for a reader, the journey reaches too; every route on disk is reached by some reader or
 *      is a named EXTERNAL entrance whose generator still names it and that no door reaches yet; the hub holds the
 *      controls that are not routes; the chrome's door tables are held to their files (both ways; the bell one way,
 *      A1); and A15's two routes (`/updown/history`, `/positions/performance`) are pinned at four doors — each classic
 *      page's own and, since WP9, the journey Tiketi view's — each with its plant. Its limits are written where it is
 *      defined.
 *   §10 THE HEADER-FIT GATE'S TERMS (WP6b, A5, A6) — the drives ask the pill's rules exactly where `journeyHeaderState`
 *      draws the pill; `red:journey-header-fit` refuses, before its first write, without `--alone` (which its package
 *      script never passes) and inside `red:all` (which marks its harnesses with KP_RED_ALL); and the stylesheet holds
 *      no red-run witness, so a mutation a hard kill left behind fails here, by name.
 *   §11 THE OVERLAYS (WP7) — what the flag is for. On the pages the journey re-draws a journey viewer meets no Needle,
 *      no channels panel and no chat bubble: each stand-down is ONE term, `journeyOn && isJourneySurface(pathname)`,
 *      joined to the rule the overlay already had (today's half verbatim, so with the flag down the rule IS today's) or
 *      a guard straight after the pinned line it follows; each overlay reads the flag once and asks the one list (§2)
 *      once; the chat keeps its conversation; the HIDE_ON patterns other gates pin are unchanged; the analytics consent
 *      prompt is still asked of everybody; the email-verify bar is gated on the same per-request answer (VODACOM-PLAN
 *      §3.2 item 2); and the shell's lazy module alone loads the flag, through `next/dynamic` (WP6c). In the file it
 *      sits beside §5, whose flag it reads.
 *   §12 THE SHELL'S DEFERRED PARTS (WP6c, VODACOM-PLAN §0h point 20) — AppShell is a server component, and its own
 *      `React.lazy` split nothing: every module it named rode in every page's first load. So every lazily loaded part
 *      AppShell renders comes from ONE client module, `shell-lazy.tsx`, under the name it always had, each the one child
 *      of the Suspense boundary it always had; AppShell imports none of the parts' own modules and no React `lazy`, and
 *      imports the offline banner statically (its job is a connection that fails); that module is "use client", imports
 *      nothing statically but `next/dynamic`, declares exactly the parts table (each part one line, server render on, no
 *      option object, its loader ending in the lost-chunk guard, which takes a ChunkLoadError alone) and only AppShell
 *      imports it; every module it loads is "use client" and loaded from there alone (the win celebration's three
 *      static importers named); and no server module anywhere in src defers a "use client" module through
 *      `import(…)`.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` hands the same checks defective implementations and edited source TEXT
 * held in memory, and requires the check named for each defect to fail. This file makes no file-system change anywhere,
 * so `test:red-anchors` §4 counts it in the in-process class and declares no anchors for it.
 *
 * ⚠️ §1's labels are WP1's words (`journey.tabQuestions`, `journey.tabTickets`, `journey.tabAccount`). Without them
 * `1.table` and `1.guard` are red, by design: a tab with no label in a language is a defect, not a pending item.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment, decommentCss } from "./lib/decomment.mts";
import * as TAB from "../src/lib/nav/active-tab.ts";
import * as SURF from "../src/lib/surfaces.ts";
import * as HDR from "../src/lib/journey/header-state.ts";
import * as DOORS from "../src/lib/journey/viewer-doors.ts";
import * as FLAG from "../src/lib/journey/journey-on.ts";
import * as MARK from "../src/lib/journey/shell-mark.ts";
import * as UNREAD from "../src/lib/journey/unread-count.ts";
import * as POLL from "../src/lib/journey/one-poller.ts";
import * as HUB from "../src/components/journey/account/hub-rows.ts";
import * as JHF from "./live/journey-header-fit.mjs";
import { WITNESS_PROPERTY } from "./anchors/journey-header-fit.anchors.mjs";
import { JOURNEY_SURFACES, JOURNEY_TRAPPED, JOURNEY_LAWS, soleZ, portalsOut, rendersSymbol, formsStackingContext } from "./lib/stacking-rows.mts";
import { IS_POPUP, reviewGaps, reviewedIn } from "./lib/popup-review.mts";
import { NO_VIEWER, type InviteViewer } from "../src/lib/feature-state.ts";
import { hasRole, ADMIN_CONSOLE_ROLES } from "../src/lib/server/roles.ts";
import { dict } from "../src/lib/i18n-dict.ts";

process.exitCode = 1; // failure is the default
const PROVE_RED = process.argv.includes("--prove-red");
// The invite's product state is read from the environment at call time: §4 runs on the shipped constant and states
// FEATURE_INVITE itself on the rows that need it.
delete process.env.FEATURE_INVITE;

type JourneyTab = TAB.JourneyTab;
type TabRoute = TAB.TabRoute;
type JourneyTabDef = TAB.JourneyTabDef;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const toPosix = (p: string) => p.split(sep).join("/");
const show = (v: unknown) => JSON.stringify(v) ?? String(v);
const count = (s: string, needle: string) => s.split(needle).length - 1;
const canon = (o: object) => show(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A plant's check, named by the start of its label (escaped: a route's dots and slashes are literal). */
const at = (prefix: string) => new RegExp("^" + escapeRe(prefix));

/* ══ THE SOURCE WORLD — read once; the red twin plants edits in memory ═══════════════════════════════════════ */

/** `test:route-census`'s population, globbed the same way: every non-admin, non-api `page.tsx`, groups stripped. */
function pages(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (e === "page.tsx") out.push(p);
  }
  return out;
}
function routeOf(file: string): string {
  const rel = relative(join(ROOT, "src/app"), file).replace(/\\/g, "/").replace(/\/?page\.tsx$/, "");
  const segs = rel.split("/").filter((s) => s.length > 0 && !/^\(.*\)$/.test(s) && !s.startsWith("@"));
  return "/" + segs.join("/");
}
function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

type World = {
  /** §1's population: the routes on disk. */
  routes: readonly string[];
  /** `surfaces.ts` as written — the install-invite anchor is checked verbatim, comments and all. */
  surfacesRaw: string;
  glyphs: string;
  /** `globals.css`, comments blanked: §7 and §8 read the shell's rules as written. */
  css: string;
  /** `tailwind.config.ts`: the one place the lg breakpoint is defined. */
  tailwind: string;
  /** `scripts/popup-fit.test.mts`, decommented: its review record, read where it is kept (A13). */
  popupFit: string;
  /** Every src file, decommented, by repo path — so a guard never matches the paragraph explaining a fix. */
  files: ReadonlyMap<string, string>;
  /** Routes decided ahead of their page — `AHEAD_OF_DISK` when absent; the red twin plants a stale entry here. */
  ahead?: ReadonlySet<string>;
  /** §9: each route's page file (repo path), from the same glob as `routes`. */
  pageOf: ReadonlyMap<string, string>;
  /**
   * §9 and §10: files outside src, read as text — the service worker (an external entrance cites it), the header-fit
   * red twin and red:all (decommented), and package.json as written.
   */
  extra: ReadonlyMap<string, string>;
};
/** §10: the header-fit gate's own files (A6), read into the world so the red twin can plant edits in them. */
const RED_TWIN = "scripts/journey-header-fit-red.mjs";
const RED_ALL = "scripts/red-all.mjs";
const PACKAGE = "package.json";
const WORLD: World = {
  routes: [...new Set(pages(join(ROOT, "src/app"))
    .map((f) => f.replace(/\\/g, "/"))
    .filter((f) => !f.includes("/app/admin/") && !f.includes("/app/api/"))
    .map(routeOf))].sort(),
  surfacesRaw: read("src/lib/surfaces.ts"),
  glyphs: read("src/components/ui/glyphs.tsx"),
  css: decommentCss(read("src/app/globals.css")),
  tailwind: read("tailwind.config.ts"),
  popupFit: decomment(read("scripts/popup-fit.test.mts")),
  files: new Map(sources(join(ROOT, "src")).map((p): [string, string] => {
    const rel = toPosix(relative(ROOT, p));
    return [rel, decomment(read(rel))];
  })),
  pageOf: new Map(pages(join(ROOT, "src/app"))
    .map((f) => toPosix(relative(ROOT, f)))
    .filter((rel) => !rel.startsWith("src/app/admin/") && !rel.startsWith("src/app/api/"))
    .map((rel): [string, string] => [routeOf(join(ROOT, rel)), rel])),
  extra: new Map([
    ["public/sw.js", decomment(read("public/sw.js"))],
    [RED_TWIN, decomment(read(RED_TWIN))],
    [RED_ALL, decomment(read(RED_ALL))],
    [PACKAGE, read(PACKAGE)],
  ]),
};
const HOME = "src/lib/nav/active-tab.ts";
const SURFACES = "src/lib/surfaces.ts";
const HEADER_HOME = "src/lib/journey/header-state.ts";
const DOORS_HOME = "src/lib/journey/viewer-doors.ts";
const FLAG_HOME = "src/lib/journey/journey-on.ts";
const FLAG_COMPONENT = "src/components/journey/journey-flag.tsx";
const MARK_HOME = "src/lib/journey/shell-mark.ts";
const UNREAD_HOME = "src/lib/journey/unread-count.ts";
const UNREAD_HOOK = "src/lib/journey/use-unread-count.ts";
const POLLER_HOME = "src/lib/journey/one-poller.ts";
const JHDR = "src/components/journey/journey-top-bar.tsx";
const JTABS = "src/components/journey/journey-tabs.tsx";
const GUEST_SHEET = "src/components/journey/tickets-guest-sheet.tsx";
const MODAL = "src/components/ui/modal.tsx";
const BELL = "src/components/layout/notifications-panel.tsx";
const SHELL = "src/components/layout/app-shell.tsx";
/**
 * The shell's ONE lazy module (S6 WP6c; VODACOM-PLAN §0h point 20): every part AppShell loads only when it renders it,
 * each a `next/dynamic` of a "use client" component with its server render on and no option object, its loader ending
 * in the lost-chunk guard, under the name AppShell renders it by. AppShell's own `React.lazy` bindings split nothing:
 * every module they named rode in every page's first load. §12 holds the module, AppShell and the parts' modules to the
 * table below; §8 and §11 read the journey's three parts from it. The offline banner is not a part, on purpose: AppShell
 * imports it statically (12.shell.offline).
 */
const SHELL_LAZY = "src/components/layout/shell-lazy.tsx";
/** Each part: the binding AppShell renders, the module `next/dynamic` loads, and the component it picks from it. */
const SHELL_PARTS: ReadonlyArray<readonly [string, string, string]> = [
  ["LazyPullToRefresh", "@/components/ui/pull-to-refresh", "PullToRefresh"],
  ["LazyWinCelebration", "@/components/markets/win-celebration", "WinCelebrationHost"],
  ["LazyNotifyPoller", "@/components/markets/notify-poller", "NotifyPoller"],
  ["LazyEventStream", "@/components/layout/event-stream-provider", "EventStreamProvider"],
  ["LazyInstallInvite", "@/components/pwa/install-invite", "InstallInvite"],
  ["LazyConsentPrompt", "@/components/analytics/consent-prompt", "ConsentPrompt"],
  ["LazyChannelsPanel", "@/components/social/channels-panel", "ChannelsPanel"],
  ["LazyJourneyFlag", "@/components/journey/journey-flag", "JourneyFlag"],
  ["LazyJourneyTopBar", "@/components/journey/journey-top-bar", "JourneyTopBar"],
  ["LazyJourneyTabs", "@/components/journey/journey-tabs", "JourneyTabs"],
];
/** A part's one line in the shell's lazy module, exactly as it is written there. */
const partLine = ([binding, spec, symbol]: readonly [string, string, string]) =>
  `export const ${binding} = dynamic(() => import("${spec}").then((m) => m.${symbol}).catch(nothingIfLost));`;
/** The line of the part AppShell renders by this name, or "" when the table has no such part (no check accepts ""). */
const partLineOf = (binding: string): string => {
  const row = SHELL_PARTS.find(([b]) => b === binding);
  return row ? partLine(row) : "";
};
/** The names `file` imports from the src module `target` through `import { … } from "…"`, by any specifier resolving to it. */
function importedNames(w: World, file: string, target: string): string[] {
  return [...text(w, file).matchAll(STATIC_FROM)]
    .filter((m) => resolveIn(w, file, m[2]) === target)
    .flatMap((m) => {
      const clause = m[1].trim();
      return clause.startsWith("{") && clause.endsWith("}")
        ? clause.slice(1, -1).split(",").map((n) => n.trim()).filter((n) => n.length > 0)
        : [clause];
    });
}
const BOTTOM_NAV = "src/components/layout/bottom-nav.tsx";
const text = (w: World, rel: string) => w.files.get(rel) ?? "";
/** A file's first statement is this directive (`trimStart` also drops a byte-order mark). */
const hasDirective = (s: string, d: "use client" | "use server") => {
  const head = s.trimStart();
  return head.startsWith(`"${d}"`) || head.startsWith(`'${d}'`);
};
const isClient = (s: string) => hasDirective(s, "use client");
/** A world holding only these files — for the controls that prove a walk sees what it claims to see. */
const worldOf = (files: Record<string, string>): World => ({ ...WORLD, files: new Map(Object.entries(files)) });

/* ══ THE IMPORT GRAPH — who loads whom, so §4 and §5 follow a module past its first importer ═════════════════ */
type Imported = { spec: string; typeOnly: boolean };
/** `import type { A }` and `import { type A, type B }` are erased by the compiler: they load nothing. */
const typeOnlyClause = (clause: string) => {
  if (/^\s*type\b/.test(clause)) return true;
  const braces = /^\s*\{([^}]*)\}\s*$/.exec(clause);
  if (!braces) return false;
  const names = braces[1].split(",").map((n) => n.trim()).filter((n) => n.length > 0);
  return names.length > 0 && names.every((n) => /^type\s/.test(n));
};
const STATIC_FROM = /^[ \t]*(?:import|export)\s+([^;]*?)\bfrom\s*["']([^"']+)["']/gm;
const BARE_IMPORT = /^[ \t]*import\s*["']([^"']+)["']/gm;
const CALLED = /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;
const PARSED = new Map<string, { s: string; imports: Imported[] }>();
/** Every module a file names — imports, re-exports, bare and dynamic imports, require — parsed once per text. */
function importsIn(w: World, rel: string): Imported[] {
  const s = text(w, rel);
  const hit = PARSED.get(rel);
  if (hit && hit.s === s) return hit.imports;
  const imports: Imported[] = [
    ...[...s.matchAll(STATIC_FROM)].map((m) => ({ spec: m[2], typeOnly: typeOnlyClause(m[1]) })),
    ...[...s.matchAll(BARE_IMPORT)].map((m) => ({ spec: m[1], typeOnly: false })),
    ...[...s.matchAll(CALLED)].map((m) => ({ spec: m[1], typeOnly: false })),
  ];
  PARSED.set(rel, { s, imports });
  return imports;
}
/** A specifier, resolved to a src file this world holds ("@/…" and relative); a package or an asset is null. */
function resolveIn(w: World, from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? posix.join(posix.dirname(from), spec) : null;
  if (base === null) return null;
  for (const tail of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) if (w.files.has(base + tail)) return base + tail;
  return null;
}
type Graph = { out: ReadonlyMap<string, readonly string[]>; into: ReadonlyMap<string, readonly string[]> };
/** Who loads whom, within src. ⛔ An erased `import type` is not an edge: it puts nothing in any bundle. */
function importGraph(w: World): Graph {
  const out = new Map<string, string[]>();
  const into = new Map<string, string[]>();
  for (const rel of w.files.keys()) {
    const to = [...new Set(importsIn(w, rel).filter((i) => !i.typeOnly).map((i) => resolveIn(w, rel, i.spec)))]
      .filter((r): r is string => r !== null && r !== rel);
    out.set(rel, to);
    for (const t of to) {
      const list = into.get(t);
      if (list) list.push(rel);
      else into.set(t, [rel]);
    }
  }
  return { out, into };
}
/** Every src file a "use client" boundary pulls into the browser. A "use server" file is a reference there, not code. */
function clientReach(w: World, g: Graph): Set<string> {
  const seen = new Set<string>();
  const stack = [...w.files.keys()].filter((p) => isClient(text(w, p)));
  while (stack.length > 0) {
    const f = stack.pop() as string;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const t of g.out.get(f) ?? []) if (!hasDirective(text(w, t), "use server")) stack.push(t);
  }
  return seen;
}
/**
 * The files that load `target`, and those of them no client code vouches for. A file is vouched for when it is a
 * "use client" file, or when it has no directive, is not a route file, and every file loading it is vouched for in
 * turn — a hook module with no directive that only client components load is exactly as safe as `journey-on.ts`.
 * ⛔ A cycle is answered NO, and so is a file nothing loads: wrongly refused is loud; wrongly vouched for is the silent
 * failure "a build is not a render" names.
 */
function unvouchedLoaders(w: World, g: Graph, target: string): { loaders: string[]; bad: string[] } {
  const memo = new Map<string, boolean>();
  const vouched = (rel: string): boolean => {
    const known = memo.get(rel);
    if (known !== undefined) return known;
    memo.set(rel, false);
    const s = text(w, rel);
    const by = g.into.get(rel) ?? [];
    const v = isClient(s) || (!rel.startsWith("src/app/") && !hasDirective(s, "use server") && by.length > 0 && by.every(vouched));
    memo.set(rel, v);
    return v;
  };
  const loaders = [...(g.into.get(target) ?? [])].sort();
  return { loaders, bad: loaders.filter((p) => !vouched(p)) };
}

/* ══ THE IMPLEMENTATIONS UNDER TEST — passed in, so the red twin can hand in defective ones ══════════════════ */
type Flag = {
  subscribe: typeof FLAG.subscribeJourneyFlag;
  snapshot: typeof FLAG.journeyFlagSnapshot;
  serverSnapshot: typeof FLAG.journeyFlagServerSnapshot;
  raise: typeof FLAG.raiseJourneyFlag;
};
type Impl = {
  tabs: readonly JourneyTabDef[];
  routes: readonly TabRoute[];
  routeFor: (p: string | null) => TabRoute | null;
  activeTab: (p: string | null) => JourneyTab | null;
  ariaCurrent: (p: string | null, tab: JourneyTab) => "page" | "true" | undefined;
  tabKeys: typeof TAB.assertTabKeysResolve;
  journeySurface: (p: string | null) => boolean;
  moneySurface: (p: string | null) => boolean;
  commitSurface: (p: string | null) => boolean;
  header: typeof HDR.journeyHeaderState;
  doors: typeof DOORS.viewerDoorsFor;
  hubRows: typeof HUB.hubRowsFor;
  unread: { feed: (deps: UNREAD.UnreadDeps) => UNREAD.UnreadFeed; shownFor: typeof UNREAD.unreadFor };
  pollers: typeof POLL.pollersAt;
  lgUp: { subscribe: typeof POLL.subscribeLgUp; snapshot: typeof POLL.lgUpSnapshot; serverSnapshot: typeof POLL.lgUpServerSnapshot };
  flag: Flag;
};
const REAL: Impl = {
  tabs: TAB.JOURNEY_TABS,
  routes: TAB.TAB_ROUTES,
  routeFor: TAB.tabRouteFor,
  activeTab: TAB.activeTabFor,
  ariaCurrent: TAB.tabAriaCurrent,
  tabKeys: TAB.assertTabKeysResolve,
  journeySurface: SURF.isJourneySurface,
  moneySurface: SURF.isMoneySurface,
  commitSurface: SURF.isCommitSurface,
  header: HDR.journeyHeaderState,
  doors: DOORS.viewerDoorsFor,
  hubRows: HUB.hubRowsFor,
  unread: { feed: UNREAD.createUnreadFeed, shownFor: UNREAD.unreadFor },
  pollers: POLL.pollersAt,
  lgUp: { subscribe: POLL.subscribeLgUp, snapshot: POLL.lgUpSnapshot, serverSnapshot: POLL.lgUpServerSnapshot },
  flag: {
    subscribe: FLAG.subscribeJourneyFlag,
    snapshot: FLAG.journeyFlagSnapshot,
    serverSnapshot: FLAG.journeyFlagServerSnapshot,
    raise: FLAG.raiseJourneyFlag,
  },
};

type Ok = (label: string, cond: boolean, detail?: string) => void;

/* ══ §1 · THE TABS ═══════════════════════════════════════════════════════════════════════════════════════════ */
type Expect = { tab: JourneyTab } | { tab: null; why: string };
const Q: Expect = { tab: "questions" };
const U: Expect = { tab: "updown" };
const T: Expect = { tab: "tickets" };
const A: Expect = { tab: "account" };
const AUTH: Expect = { tab: null, why: "a sign-in in progress; the header carries Ingia and Jisajili" };
const OPT_OUT: Expect = { tab: null, why: "the marketing opt-out, which has its own minimal shell and no tabs (D6)" };
/**
 * ⛔ EVERY ROUTE ON DISK IS DECIDED HERE, by hand, and a new one fails `1.census` until somebody decides it — the
 * population is globbed, never typed (the `test:route-census` lesson: `/updown` went unaudited because a list was typed).
 */
const EXPECTED: Record<string, Expect> = {
  "/": Q, "/markets": Q, "/markets/[id]": Q,
  "/updown": U, "/updown/[roundId]": U,
  "/updown/history": T, "/positions": T, "/positions/[positionId]": T, "/positions/performance": T,
  "/account": A,
  "/wallet": A, "/wallet/deposit": A, "/wallet/deposit/return": A, "/wallet/receipt/[id]": A, "/wallet/withdraw": A,
  "/profile": A, "/profile/account": A, "/profile/activity": A, "/profile/invite": A, "/profile/kyc": A,
  "/profile/notifications": A, "/profile/responsible-gambling": A, "/profile/security": A, "/profile/sessions": A,
  "/profile/source-of-funds": A,
  "/notifications": A, "/results": A, "/live": A, "/leaderboard": A, "/fairness": A, "/help": A, "/watchlist": A,
  "/legal/agent-terms": A, "/legal/aml": A, "/legal/privacy": A, "/legal/responsible-gambling": A, "/legal/rules": A,
  "/legal/rules/up-down": A, "/legal/rules/yes-no": A, "/legal/terms": A,
  "/proposals": A, "/proposals/[id]": A, "/proposals/new": A,
  "/agent": A, "/agent/apply": A, "/agent/invite/[token]": A, "/agent/status": A,
  "/auth/2fa": AUTH, "/auth/admin": AUTH, "/auth/forgot-password": AUTH, "/auth/login": AUTH, "/auth/otp": AUTH,
  "/auth/register": AUTH, "/auth/reset-password": AUTH, "/auth/verify-email": AUTH,
  "/s": OPT_OUT, "/s/[token]": OPT_OUT,
  "/offline": { tab: null, why: "the service worker's offline fallback, a page a reader is sent to and never browses to" },
};
/**
 * Decided before its page exists. ⛔ An entry here EXPIRES: `1.census.ahead` fails once the page is on disk, so the
 * commit that adds the page deletes the entry — as S6 WP5 did for `/account`, the Akaunti hub. The mechanism stays for
 * the next route a tab points at before its page lands; the red twin plants a stale entry through the world's `ahead`.
 */
const AHEAD_OF_DISK: ReadonlySet<string> = new Set<string>();
/** A dynamic segment, filled the way a real URL fills it. */
const probe = (route: string) => route.replace(/\[[^\]]+\]/g, "x1");
/** Paths that share a row's letters but not its segment — each must be claimed by NO row (A18). */
const LOOKALIKES = ["/settings", "/sx/abc", "/s-promo", "/wallets", "/marketsx", "/updownx", "/positionsx", "/accounts", "/helpdesk", "/profiles", "/authority", "/offline/x"];
/** A12: "page" only on the tab's own href, "true" for section membership, nothing for another tab's page. */
const ARIA: Array<[string, JourneyTab, "page" | "true" | undefined]> = [
  ["/", "questions", "page"],
  ["/markets", "questions", "true"],
  ["/markets/x1", "questions", "true"],
  ["/updown", "updown", "page"],
  ["/updown/x1", "updown", "true"],
  ["/updown/history", "tickets", "true"],
  ["/updown/history", "updown", undefined],
  ["/positions", "tickets", "page"],
  ["/positions/performance", "tickets", "true"],
  ["/account", "account", "page"],
  ["/results", "account", "true"],
  ["/wallet/deposit", "account", "true"],
  ["/results", "questions", undefined],
  ["/auth/login", "account", undefined],
  ["/s/x1", "questions", undefined],
];
const DECK = [
  "questions / questionCircle journey.tabQuestions",
  "updown /updown trade nav.updown",
  "tickets /positions ticket journey.tabTickets",
  "account /account user journey.tabAccount",
];
const DEFINES = /\b(?:function\s+activeTabFor\b|(?:const|let|var)\s+(?:activeTabFor|TAB_ROUTES|JOURNEY_TABS)\b)/;

function g1Tabs(I: Impl, W: World, ok: Ok) {
  const missing = W.routes.filter((r) => !(r in EXPECTED));
  ok("1.census · every route on disk has an expected tab or a stated reason for none", missing.length === 0,
    `no decision for: ${missing.join(", ")} — decide it in EXPECTED before it ships`);
  const ahead = W.ahead ?? AHEAD_OF_DISK;
  const ghosts = Object.keys(EXPECTED).filter((r) => !W.routes.includes(r) && !ahead.has(r));
  ok("1.census.ghost · every decision names a route on disk (or one in AHEAD_OF_DISK)", ghosts.length === 0, ghosts.join(", "));
  const arrived = [...ahead].filter((r) => W.routes.includes(r));
  ok("1.census.ahead · every route decided ahead of its page is still absent from disk — the commit that adds the page deletes its AHEAD_OF_DISK entry",
    arrived.length === 0, `on disk now: ${arrived.join(", ")}`);
  ok("1.census.c · CONTROL · the glob found the real population (≥ 50 routes, / and /markets/[id] among them, nothing under /admin or /api)",
    W.routes.length >= 50 && W.routes.includes("/") && W.routes.includes("/markets/[id]")
      && !W.routes.some((r) => r.startsWith("/admin") || r.startsWith("/api")),
    `${W.routes.length} routes`);

  const population = [...new Set([...W.routes, ...ahead])].sort();
  for (const route of population) {
    const exp = EXPECTED[route];
    if (!exp) continue;
    const got = I.activeTab(probe(route));
    ok(`1.route.${route} · ${exp.tab === null ? `no tab — ${exp.why}` : exp.tab}`, got === exp.tab, `got ${show(got)}`);
  }
  const disagree = [...population.map(probe), ...LOOKALIKES].filter((p) => I.activeTab(p) !== (TAB.tabRouteIn(I.routes, p)?.tab ?? null));
  ok("1.one.table · the resolver answers from the table's first claiming row and nothing else", disagree.length === 0, disagree.join(", "));
  for (const p of LOOKALIKES) {
    const row = I.routeFor(p);
    ok(`1.segment.${p} · claimed by no row — a row owns its path and the paths below it, never its letters`,
      row === null && I.activeTab(p) === null, `claimed by ${show(row)}`);
  }
  for (const d of I.tabs) {
    ok(`1.roundtrip.${d.key} · its own href ${d.href} lights it, with aria-current="page"`,
      I.activeTab(d.href) === d.key && I.ariaCurrent(d.href, d.key) === "page",
      `tab ${show(I.activeTab(d.href))} · aria-current ${show(I.ariaCurrent(d.href, d.key))}`);
  }
  for (const [p, tab, want] of ARIA) {
    const got = I.ariaCurrent(p, tab);
    ok(`1.aria.${p}.${tab} · ${want === undefined ? "no aria-current" : `aria-current="${want}"`}`, got === want, `got ${show(got)}`);
  }
  const shape = I.tabs.map((d) => `${d.key} ${d.href} ${d.glyph} ${d.label}`);
  ok("1.tabs · four tabs in the deck's order — Maswali /, Juu/Chini /updown, Tiketi zangu /positions, Akaunti /account",
    show(shape) === show(DECK), show(shape));
  const noGlyph = I.tabs.filter((d) => !W.glyphs.includes(`\n  ${d.glyph}: (p: GlyphProps)`)).map((d) => d.glyph);
  ok("1.glyphs · every tab's glyph is one the glyph set defines", I.tabs.length > 0 && noGlyph.length === 0, noGlyph.join(", "));
  const problems = TAB.tabTableProblems(I.routes, I.tabs, dict);
  ok("1.table · the table is sound — every row's tab is a tab, every tab is reached, no row is shadowed, each href lights its own tab, every label exists in en/sw/zh",
    problems.length === 0, problems.slice(0, 4).join(" | "));
  const ctl = TAB.tabTableProblems(
    [{ prefix: "/updown", tab: "updown" }, { prefix: "/updown/history", tab: "tickets" }],
    [
      { key: "updown", href: "/updown", glyph: "trade", label: "nav.updown" },
      { key: "tickets", href: "/updown/history", glyph: "ticket", label: "journey.tabTickets" },
      { key: "account", href: "/account", glyph: "user", label: "journey.tabAccount" },
    ],
    {
      en: { nav: { updown: "Up & Down" }, journey: { tabTickets: "My tickets", tabAccount: "Account" } },
      sw: { nav: { updown: "Juu/Chini" }, journey: { tabAccount: "Akaunti" } },
    },
  );
  const flagged = (s: string) => ctl.some((p) => p.includes(s));
  ok("1.table.c · CONTROL · the detector flags a shadowed row, a tab no row reaches and a label missing in one language",
    flagged('row "/updown/history" is unreachable') && flagged('tab "account" is reached by no row') && flagged('label "journey.tabTickets" is missing in sw'),
    ctl.join(" | "));
  const guard = I.tabKeys(dict);
  ok("1.guard · assertTabKeysResolve(dict), the exported guard, finds the shipped table sound in en, sw and zh",
    guard.length === 0, guard.slice(0, 4).join(" | "));
  const blank = I.tabKeys({ xx: {} }).filter((p) => p.includes("is missing in xx"));
  ok("1.guard.c · CONTROL · the guard reads the dictionaries it is handed: one with no tab words is flagged once per tab",
    blank.length === TAB.JOURNEY_TABS.length, `${blank.length} flagged`);
  const definers = [...W.files].filter(([, s]) => DEFINES.test(s)).map(([p]) => p);
  ok("1.one.definer · the tabs, their table and the resolver are defined in ONE file (active-tab.ts)",
    definers.length === 1 && definers[0] === HOME, show(definers));
}

/* ══ §2 · THE JOURNEY SURFACES ═══════════════════════════════════════════════════════════════════════════════ */
const ALLOW = ["/", "/positions", "/updown/history", "/markets/mkt_abc", "/wallet/deposit", "/wallet/deposit/return"];
const DENY: Array<string | null> = [
  null, "", "/markets", "/markets/mkt_abc/x", "/updown", "/updown/udr_1", "/updown/history/x", "/live", "/results",
  "/wallet", "/wallet/withdraw", "/wallet/depositx", "/help", "/account", "/profile", "/profile/kyc",
  "/profile/responsible-gambling", "/positions/performance", "/positions/pos_1", "/auth/login", "/s",
];
/** What the two older predicates answered before S6 — a frozen record, so an edit to either is a decision. */
const GOLDEN: Array<[string | null, boolean, boolean]> = [
  [null, false, false], ["", false, false], ["/", false, false],
  ["/wallet", true, true], ["/wallet/", true, true], ["/wallet/deposit", true, true], ["/wallet/deposit/return", true, true],
  ["/wallet/withdraw", true, true], ["/walletx", false, false],
  ["/markets", false, false], ["/markets/mkt_abc", false, true], ["/markets/mkt_abc/x", false, true],
  ["/updown", false, false], ["/updown/udr_1", false, true], ["/updown/history", false, true],
  ["/proposals", false, false], ["/proposals/new", false, true], ["/proposals/new/x", false, true], ["/proposals/newer", false, false],
  ["/positions", false, false], ["/profile", false, false], ["/help", false, false],
];
const pathName = (p: string | null) => (p === null ? "null" : p === "" ? "(empty)" : p);
/** Lines of `surfaces.ts` that other gates and anchors read — each must still be there, once, as written. */
const VERBATIM = [
  "export function isMoneySurface(path: string | null): boolean {",
  String.raw`const MONEY_ROUTE = /^\/wallet(\/|$)/;`,
  String.raw`  /^\/markets\/[^/]+/,`,
  String.raw`  /^\/updown\/[^/]+/,`,
  String.raw`  /^\/proposals\/new(\/|$)/,`,
];
/**
 * What each WP2 decision module may load; an erased `import type` is listed as such. ⛔ Anything more is a decision
 * reaching for the world itself, which is its caller's job: the server and the client both read these, and the doors
 * are answered from what the shell already read.
 */
const MAY_IMPORT: Array<[string, readonly string[]]> = [
  [SURFACES, []],
  [HOME, []],
  [HEADER_HOME, []],
  [DOORS_HOME, ["@/lib/feature-state", "@/lib/server/roles", "type @/lib/server/proposals-config"]],
  [FLAG_HOME, ["react", "./shell-mark"]],
  [MARK_HOME, []],
  [UNREAD_HOME, []],
  [POLLER_HOME, ["react"]],
];

function g2Surfaces(I: Impl, W: World, ok: Ok) {
  for (const p of ALLOW) ok(`2.allow.${p} · a journey surface`, I.journeySurface(p) === true);
  for (const p of DENY) ok(`2.deny.${pathName(p)} · not a journey surface (named or nothing)`, I.journeySurface(p) === false);
  for (const [p, money, commit] of GOLDEN) {
    ok(`2.golden.${pathName(p)} · money ${money}, commit ${commit} — as before S6`,
      I.moneySurface(p) === money && I.commitSurface(p) === commit, `money ${I.moneySurface(p)}, commit ${I.commitSurface(p)}`);
  }
  for (const [rel, allowed] of MAY_IMPORT) {
    const s = text(W, rel);
    const extra = importsIn(W, rel).map((i) => (i.typeOnly ? `type ${i.spec}` : i.spec)).filter((n) => !allowed.includes(n));
    const directive = /["']use (?:client|server)["']/.test(s);
    ok(`2.pure.${rel} · imports ${allowed.length === 0 ? "nothing" : allowed.join(", ")}, and carries no directive`,
      s.length > 0 && extra.length === 0 && !directive,
      s.length === 0 ? "file missing" : [extra.length > 0 ? `also imports ${extra.join(", ")}` : "", directive ? "carries a directive" : ""].filter((x) => x.length > 0).join("; "));
  }
  const drifted = VERBATIM.filter((line) => count(W.surfacesRaw, line) !== 1);
  ok("2.anchor · the red:install-invite anchor and the two older predicates' patterns are verbatim, once each",
    drifted.length === 0, drifted.join(" | "));
}

/* ══ §3 · THE HEADER ═════════════════════════════════════════════════════════════════════════════════════════ */
type H = HDR.JourneyHeaderInput;
type HS = HDR.JourneyHeaderState;
const SIGNED_IN: H = { isAuthed: true, balance: 2_000, walletHeld: false, onBreak: false, pathname: "/" };
const hs = (capsule: HS["capsule"], pill: boolean, authPills: boolean): HS => ({ capsule, pill, authPills });
const HEADER: Array<[string, string, H, HS]> = [
  ["guest", "a signed-out reader: no capsule, no pill, Ingia and Jisajili", { isAuthed: false, balance: null, walletHeld: false, onBreak: false, pathname: "/" }, hs("none", false, true)],
  ["guest.stray", "signed out with a stray balance: still nothing of an account", { ...SIGNED_IN, isAuthed: false, balance: 5_000 }, hs("none", false, true)],
  ["known", "a known balance: the capsule and the pill", SIGNED_IN, hs("balance", true, false)],
  ["zero", "a balance of ZERO is still shown (Ali, 2026-09-28)", { ...SIGNED_IN, balance: 0 }, hs("balance", true, false)],
  ["unread", "a wallet that was not read: no capsule — never a zero nobody measured", { ...SIGNED_IN, balance: null }, hs("none", true, false)],
  ["unread.undefined", "…and the same for an absent balance", { ...SIGNED_IN, balance: undefined }, hs("none", true, false)],
  ["held", "a held wallet: the held capsule and NO pill (the deposit screen refuses it)", { ...SIGNED_IN, walletHeld: true }, hs("held", false, false)],
  ["held.unread", "a held wallet that was not read: no capsule, no pill", { ...SIGNED_IN, walletHeld: true, balance: null }, hs("none", false, false)],
  ["break", "on a break: the balance, and NO pill (S4)", { ...SIGNED_IN, onBreak: true }, hs("balance", false, false)],
  ["deposit", "on the deposit screen: no pill to the page they are on", { ...SIGNED_IN, pathname: "/wallet/deposit" }, hs("balance", false, false)],
  ["deposit.return", "…nor on the provider's return", { ...SIGNED_IN, pathname: "/wallet/deposit/return" }, hs("balance", false, false)],
  ["wallet", "on /wallet: the pill shows", { ...SIGNED_IN, pathname: "/wallet" }, hs("balance", true, false)],
  ["withdraw", "on /wallet/withdraw: the pill shows", { ...SIGNED_IN, pathname: "/wallet/withdraw" }, hs("balance", true, false)],
  ["nopath", "no path yet: the signed-in answer", { ...SIGNED_IN, pathname: null }, hs("balance", true, false)],
];

function g3Header(I: Impl, ok: Ok) {
  for (const [name, says, input, want] of HEADER) {
    const got = I.header(input);
    ok(`3.${name} · ${says}`, canon(got) === canon(want), `got ${show(got)}`);
  }
}

/* ══ §4 · THE DOORS ══════════════════════════════════════════════════════════════════════════════════════════ */
type DI = DOORS.ViewerDoorsInput;
type DO = DOORS.ViewerDoors;
const viewer = (role: string | null, inStanding: boolean, eligible: boolean): InviteViewer =>
  ({ role: role as InviteViewer["role"], agentInGoodStanding: inStanding, playerInviteEligible: eligible });
const doors = (inviteVisible: boolean, invitePaid: boolean, agentDoorVisible: boolean, proposalsVisible: boolean, staffConsole: boolean): DO =>
  ({ inviteVisible, invitePaid, agentDoorVisible, proposalsVisible, staffConsole });
const PLAYER = viewer("PLAYER", false, true);
const OPEN: Omit<DI, "inviteViewer" | "role"> = { invitePayable: false, agentEnabled: true, proposalsState: "COMING_SOON" };
/** Typed out, never imported: dropping a role from the module's list must not shrink this table with it. */
const STAFF = ["ADMIN", "COMPLIANCE", "MODERATOR", "FINANCE", "GROWTH", "AUDITOR", "SUPPORT"];
/** [name, input, expected, FEATURE_INVITE for the row (unset = the shipped constant)]. */
const DOOR_ROWS: Array<[string, DI, DO, string?]> = [
  ["guest", { ...OPEN, inviteViewer: NO_VIEWER, role: null }, doors(false, false, true, true, false)],
  ["guest.failed", { ...OPEN, inviteViewer: null, role: null }, doors(false, false, true, true, false)],
  ["player", { ...OPEN, inviteViewer: PLAYER, role: "PLAYER" }, doors(true, false, true, true, false)],
  ["player.paid", { ...OPEN, invitePayable: true, inviteViewer: PLAYER, role: "PLAYER" }, doors(true, true, true, true, false)],
  ["player.closed", { ...OPEN, inviteViewer: viewer("PLAYER", false, false), role: "PLAYER" }, doors(false, false, true, true, false)],
  ["agent.standing", { ...OPEN, agentEnabled: false, inviteViewer: viewer("AGENT", true, false), role: "AGENT" }, doors(true, true, true, true, false)],
  ["agent.lapsed", { ...OPEN, agentEnabled: false, inviteViewer: viewer("AGENT", false, false), role: "AGENT" }, doors(false, false, false, true, false)],
  ["programme.closed", { ...OPEN, agentEnabled: false, inviteViewer: PLAYER, role: "PLAYER" }, doors(true, false, false, true, false)],
  ["proposals.DISABLED", { ...OPEN, proposalsState: "DISABLED", inviteViewer: PLAYER, role: "PLAYER" }, doors(true, false, true, false, false)],
  ["proposals.MAINTENANCE", { ...OPEN, proposalsState: "MAINTENANCE", inviteViewer: PLAYER, role: "PLAYER" }, doors(true, false, true, true, false)],
  ["proposals.ACTIVE", { ...OPEN, proposalsState: "ACTIVE", inviteViewer: PLAYER, role: "PLAYER" }, doors(true, false, true, true, false)],
  ...STAFF.map((role): [string, DI, DO] => [`staff.${role}`, { ...OPEN, inviteViewer: viewer(role, false, false), role }, doors(false, false, true, true, true)]),
  ["invite.withdrawn.player", { ...OPEN, inviteViewer: PLAYER, role: "PLAYER" }, doors(false, false, true, true, false), "WITHDRAWN"],
  ["invite.withdrawn.agent", { ...OPEN, inviteViewer: viewer("AGENT", true, false), role: "AGENT" }, doors(true, true, true, true, false), "WITHDRAWN"],
];
/** The three formulas AppShell writes today, exactly as written — the doors above must say the same thing. */
const SHELL_FORMULAS: Array<[string, string]> = [
  ["invite", "const inviteVisible = inviteIsLiveFor(inviteViewer);"],
  ["paid", "const invitePaid = (await invitePayableRead) || inviteViewer.agentInGoodStanding;"],
  ["agent", "const agentDoorVisible = getAgentConfig().enabled || inviteViewer.agentInGoodStanding;"],
];
/** The fourth: the classic chrome hides every proposals door only when DISABLED, and so must the hub. */
const PROPOSALS_RULE = `proposalsState !== "DISABLED"`;
const CHROME = [
  BOTTOM_NAV,
  "src/components/layout/top-app-bar.tsx",
  "src/components/layout/avatar-menu.tsx",
  "src/components/layout/public-footer.tsx",
];
function withInvite<R>(state: string | undefined, fn: () => R): R {
  const saved = process.env.FEATURE_INVITE;
  if (state === undefined) delete process.env.FEATURE_INVITE;
  else process.env.FEATURE_INVITE = state;
  try {
    return fn();
  } finally {
    if (saved === undefined) delete process.env.FEATURE_INVITE;
    else process.env.FEATURE_INVITE = saved;
  }
}

function g4Doors(I: Impl, W: World, G: Graph, ok: Ok) {
  for (const [name, input, want, invite] of DOOR_ROWS) {
    const got = withInvite(invite, () => I.doors(input));
    ok(`4.${name} · ${show(want)}`, canon(got) === canon(want), `got ${show(got)}`);
  }
  const shell = text(W, SHELL);
  for (const [name, line] of SHELL_FORMULAS) {
    ok(`4.shell.${name} · app-shell.tsx still spells it the way the doors do: ${line}`, count(shell, line) === 1, `${count(shell, line)} occurrence(s)`);
  }
  const drift = CHROME.filter((p) => !text(W, p).includes(PROPOSALS_RULE));
  ok(`4.shell.proposals · the classic chrome still hides the proposals doors the way the doors do: ${PROPOSALS_RULE}`,
    drift.length === 0, `no longer spelt in: ${drift.join(", ")}`);
  const vd = text(W, DOORS_HOME);
  ok("4.source · viewer-doors.ts asks inviteIsLiveFor and isStaffRole, spells the proposals rule, and never names the console's narrower tier",
    /\binviteIsLiveFor\(/.test(vd) && /\bisStaffRole\(/.test(vd) && vd.includes(PROPOSALS_RULE) && !/ADMIN_CONSOLE_ROLES/.test(vd));
  const reach = clientReach(W, G);
  const pulledBy = [...reach].filter((p) => (G.out.get(p) ?? []).includes(DOORS_HOME));
  ok("4.server.only · viewer-doors.ts is in no browser bundle — it reads FEATURE_INVITE through inviteIsLiveFor, which a browser does not have",
    !reach.has(DOORS_HOME), `pulled into the browser by: ${pulledBy.join(", ")}`);
  const PROBE = "src/components/probe-doors.tsx";
  const asType = worldOf({ [DOORS_HOME]: vd, [PROBE]: `"use client";\nimport type { ViewerDoors } from "@/lib/journey/viewer-doors";\n` });
  const asValue = worldOf({ [DOORS_HOME]: vd, [PROBE]: `"use client";\nimport { viewerDoorsFor } from "@/lib/journey/viewer-doors";\n` });
  const bundled = (w: World) => clientReach(w, importGraph(w)).has(DOORS_HOME);
  ok("4.server.only.c · CONTROL · the walk follows a client file's value import, lets an erased import type through, and finds the Needle's surfaces.ts (not AppShell) in today's bundle",
    !bundled(asType) && bundled(asValue) && reach.has(SURFACES) && !reach.has(SHELL),
    show({ typeOnly: bundled(asType), value: bundled(asValue), surfaces: reach.has(SURFACES), shell: reach.has(SHELL) }));
}

/* ══ §5 · THE FLAG ═══════════════════════════════════════════════════════════════════════════════════════════ */
/**
 * A stand-in document and window for the flag's parts: the attribute set of the html element, an event target, and the
 * ids the server wrote into the page (`marks` — the shell's mark).
 * Installed only for the call and taken away after, so nothing else in this process ever sees a browser global.
 */
function withStandInDom<R>(fn: (seen: { events: number; marks: Set<string> }) => R): R {
  const g = globalThis as unknown as Record<string, unknown>;
  const before = { window: g.window, document: g.document };
  const attrs = new Set<string>();
  const win = new EventTarget();
  const seen = { events: 0, marks: new Set<string>() };
  win.addEventListener(FLAG.JOURNEY_FLAG_EVENT, () => { seen.events++; });
  g.window = win;
  g.document = {
    documentElement: {
      hasAttribute: (n: string) => attrs.has(n),
      setAttribute: (n: string) => { attrs.add(n); },
      removeAttribute: (n: string) => { attrs.delete(n); },
    },
    getElementById: (id: string) => (seen.marks.has(id) ? {} : null),
  };
  try {
    return fn(seen);
  } finally {
    if (before.window === undefined) delete g.window;
    else g.window = before.window;
    if (before.document === undefined) delete g.document;
    else g.document = before.document;
  }
}

function g5Flag(I: Impl, W: World, G: Graph, ok: Ok) {
  ok("5.names · the flag is data-journey on the html element, announced as 50pick:journey-flag",
    FLAG.JOURNEY_FLAG_ATTR === "data-journey" && FLAG.JOURNEY_FLAG_EVENT === "50pick:journey-flag");
  ok("5.server · the server snapshot is false — every server render, and the hydration that matches it, is today's page",
    I.flag.serverSnapshot() === false);
  withStandInDom((seen) => {
    ok("5.absent · no attribute reads as off", I.flag.snapshot() === false);
    let told = 0;
    const leave = I.flag.subscribe(() => { told++; });
    const lower = I.flag.raise();
    const up = { on: I.flag.snapshot(), events: seen.events, told };
    ok("5.raise · raising stamps the attribute, reads as on, and tells a subscriber once", up.on && up.events === 1 && up.told === 1, show(up));
    lower();
    const down = { on: I.flag.snapshot(), events: seen.events, told };
    ok("5.cleanup · the cleanup removes the attribute, reads as off again, and tells the subscriber", !down.on && down.events === 2 && down.told === 2, show(down));
    leave();
    const again = I.flag.raise();
    ok("5.unsubscribe · after unsubscribing, a change reaches that subscriber no more", told === 2 && seen.events === 3, show({ told, events: seen.events }));
    again();
    seen.marks.add(MARK.JOURNEY_SHELL_MARK);
    const marked = I.flag.snapshot();
    seen.marks.delete(MARK.JOURNEY_SHELL_MARK);
    const unmarked = I.flag.snapshot();
    ok("5.mark · the shell's mark alone reads as on, and its absence as off — it is in the server's HTML, so an overlay that hydrates before the lazy flag lands already stands down (the WP7 drive: without it the Needle drew for 1–3 frames)",
      marked && !unmarked, show({ marked, unmarked }));
  });
  const flagSrc = text(W, FLAG_HOME);
  ok("5.hook · useJourneyOn is useSyncExternalStore over the event, the attribute and the false server snapshot",
    flagSrc.includes("useSyncExternalStore(subscribeJourneyFlag, journeyFlagSnapshot, journeyFlagServerSnapshot)"));
  ok("5.nodirective · journey-on.ts carries no directive — it is a hook module, and its importers carry it",
    flagSrc.length > 0 && !isClient(flagSrc) && !/["']use server["']/.test(flagSrc));
  const comp = text(W, FLAG_COMPONENT);
  ok("5.component · JourneyFlag is a client file that renders nothing and raises the flag in an effect whose cleanup lowers it",
    isClient(comp) && comp.includes("useEffect(() => raiseJourneyFlag(), [])") && comp.includes("return null;"));
  const { loaders, bad } = unvouchedLoaders(W, G, FLAG_HOME);
  ok(`5.importers · every file loading journey-on.ts is client code — a "use client" file, or a hook module only client code loads (${loaders.length}: ${loaders.join(", ")})`,
    loaders.includes(FLAG_COMPONENT) && bad.length === 0, `NOT client code: ${bad.join(", ")}`);
  const HOOK = "src/lib/journey/probe-hook.ts";
  const hookSrc = `import { useJourneyOn } from "./journey-on";\nexport const useProbe = () => useJourneyOn();\n`;
  const clientOnly = worldOf({ [FLAG_HOME]: flagSrc, [HOOK]: hookSrc, "src/components/probe-a.tsx": `"use client";\nimport { useProbe } from "@/lib/journey/probe-hook";\n` });
  const serverToo = worldOf({ ...Object.fromEntries(clientOnly.files), "src/components/probe-b.tsx": `import { useProbe } from "@/lib/journey/probe-hook";\n` });
  const vouchedCase = unvouchedLoaders(clientOnly, importGraph(clientOnly), FLAG_HOME);
  const refusedCase = unvouchedLoaders(serverToo, importGraph(serverToo), FLAG_HOME);
  ok("5.importers.c · CONTROL · a hook module only a client file loads is vouched for; the same module loaded by a server file too is not",
    vouchedCase.loaders.includes(HOOK) && vouchedCase.bad.length === 0 && refusedCase.bad.includes(HOOK),
    show({ vouchedCase, refusedCase }));
  // ⭐ MOUNTED SINCE WP7: once, in AppShell, behind the resolver's own answer, through the shell's lazy binding (§11 holds
  // the binding). Nothing else renders it, so a page the server did not put in the journey never carries the flag.
  const flagMount = "{journeyShown && <Suspense fallback={null}><LazyJourneyFlag /></Suspense>}";
  const shellText = text(W, SHELL);
  const direct = [...W.files].filter(([p, s]) => p !== FLAG_COMPONENT && s.includes("<JourneyFlag")).map(([p]) => p);
  const lazyElsewhere = [...W.files].filter(([p, s]) => p !== SHELL && s.includes("<LazyJourneyFlag")).map(([p]) => p);
  const mounted = { once: count(shellText, flagMount), lazy: count(shellText, "<LazyJourneyFlag"), direct, lazyElsewhere };
  ok("5.mount · JourneyFlag is mounted once, in AppShell, only behind journeyShown (WP7) — nothing renders it otherwise, so a classic page never carries data-journey",
    mounted.once === 1 && mounted.lazy === 1 && direct.length === 0 && lazyElsewhere.length === 0, show(mounted));
  // ⭐ THE SHELL'S MARK (WP7's drive, 2026-10-03): the same answer, written into the server's HTML, so the first frame
  // after hydration is already right. Once, in AppShell, behind the resolver's answer; read by the hook; nowhere else.
  const markMount = "{journeyShown && <span hidden id={JOURNEY_SHELL_MARK} />}";
  const markUsers = [...W.files].filter(([p, s]) => p !== SHELL && p !== MARK_HOME && p !== FLAG_HOME && s.includes("JOURNEY_SHELL_MARK")).map(([p]) => p);
  const marks = {
    once: count(shellText, markMount),
    rendered: count(shellText, "id={JOURNEY_SHELL_MARK}"),
    shellImports: shellText.includes(`import { JOURNEY_SHELL_MARK } from "@/lib/journey/shell-mark";`),
    hookReads: flagSrc.includes(`import { JOURNEY_SHELL_MARK } from "./shell-mark";`) && flagSrc.includes("document.getElementById(JOURNEY_SHELL_MARK) !== null"),
    markUsers,
    id: MARK.JOURNEY_SHELL_MARK,
  };
  ok("5.mark.mount · AppShell writes the shell's mark once, only behind journeyShown, as a plain element in the server's HTML, and the hook reads it — nothing else touches it, so a classic page never carries it",
    marks.once === 1 && marks.rendered === 1 && marks.shellImports && marks.hookReads && markUsers.length === 0 && marks.id === "kp-journey-shell", show(marks));
  const markSrc = text(W, MARK_HOME);
  ok("5.mark.pure · shell-mark.ts is pure — no import, no directive — because the server shell and the client hook both load it",
    markSrc.includes("export const JOURNEY_SHELL_MARK") && !markSrc.includes("import") && !isClient(markSrc) && !hasDirective(markSrc, "use server"));
}

/* ══ §11 · THE OVERLAYS (S6 WP7) ═════════════════════════════════════════════════════════════════════════════ */
/*
 * What the flag of §5 is for. On the pages the journey re-draws (`isJourneySurface`, §2), a reader the shell put in the
 * journey meets no Needle, no channels panel and no chat bubble; everywhere else, and for every other reader, each
 * overlay is what it was. So each stand-down is ONE term, `journeyOn && isJourneySurface(pathname)`, joined to the rule
 * the overlay already had — `useJourneyOn` answers false without the flag and on the server (§5), which leaves today's
 * rule exactly — or a guard straight after the pinned line it follows. Read here with comments stripped: each join as
 * written beside today's half; each overlay reading the flag once and the one journey list once; the chat keeping its
 * conversation; the HIDE_ON patterns other gates pin; the analytics consent prompt still asked of every reader; the
 * email-verify bar gated on the same per-request answer (VODACOM-PLAN §3.2 item 2); and the shell's lazy module alone
 * loading the flag, through `next/dynamic` (WP6c; 5.mount holds where it is mounted).
 * ⚠️ Kept here, beside §5 whose flag it reads, and numbered after WP6b's §9 and §10.
 */
const OVERLAY_NEEDLE = "src/components/layout/needle.tsx";
const OVERLAY_CHANNELS = "src/components/social/channels-panel.tsx";
const OVERLAY_CHAT = "src/components/chat/ChatRoot.tsx";
/** How each overlay reads the flag: the shell's answer, through `useJourneyOn`, once. */
const OVERLAY_READS_FLAG = "const journeyOn = useJourneyOn();";
/** The one stand-down term. */
const OVERLAY_TERM = "journeyOn && isJourneySurface(pathname)";
/**
 * A term JOINED to what an overlay already had: the file holds `today + join + end`, and `today + end` no longer — so
 * with the term false, the expression is today's.
 */
const OVERLAY_JOINS: ReadonlyArray<{ id: string; file: string; says: string; today: string; join: string; end: string }> = [
  { id: "needle", file: OVERLAY_NEEDLE, says: "the Needle hides where it hid, and for a journey viewer on a journey page",
    today: "const suppressed = hiddenPref || isMoneySurface(pathname)", join: ` || (${OVERLAY_TERM})`, end: ";" },
  { id: "needle.deps", file: OVERLAY_NEEDLE, says: "its gate runs again when the flag goes up or down",
    today: "}, [hiddenPref, pathname", join: ", journeyOn", end: "]);" },
  { id: "channels.eligible", file: OVERLAY_CHANNELS, says: "the channels panel is eligible where it was, and never on a journey page for a journey viewer",
    today: "const eligible = open && !promoSuppressed && !suppressedRoute(pathname)", join: " && !journeyHidden", end: ";" },
];
/** A guard straight after the line it follows, which stays exactly as the overlay's own gates pin it. */
const OVERLAY_GUARDS: ReadonlyArray<{ id: string; file: string; says: string; pinned: string; guard: string }> = [
  { id: "channels.render", file: OVERLAY_CHANNELS, says: "its render refuses too, straight after the pinned route-and-break guard",
    pinned: "if (promoSuppressed || suppressedRoute(pathname)) return null;", guard: "if (journeyHidden) return null;" },
  { id: "chat", file: OVERLAY_CHAT, says: "the chat bubble stands down straight after its HIDE_ON guard",
    pinned: "if (pathname && HIDE_ON.test(pathname)) return null;", guard: `if (${OVERLAY_TERM}) return null;` },
];
/**
 * The HIDE_ON patterns as `test:marketing-optout` and `test:social-panel` read them, each backslash spelled "~": they
 * are compared as written, and a backslash typed into a test is one the editing tools can decode into a control
 * character (`test:source-bytes`).
 */
const OVERLAY_HIDE_ON: ReadonlyArray<[string, string, string]> = [
  ["chat", OVERLAY_CHAT, "const HIDE_ON = /^~/(auth|admin|s)(~/|$)/;"],
  ["channels", OVERLAY_CHANNELS, "const HIDE_ON = /^~/s(~/|$)|^~/(auth|admin)(~/|$)|^~/(legal|profile)~/responsible-gambling(~/|$)|^~/markets~/?$/;"],
];
const asWritten = (s: string) => s.split("~").join(String.fromCharCode(92));
/** The flag's one line in the shell's lazy module (WP6c): `next/dynamic`, server render on, no option object. */
const FLAG_BINDING = partLineOf("LazyJourneyFlag");
/** The email-verify bar's mount: today's condition, and never for a journey request. */
const EMAIL_BAR_MOUNT = "{emailVerifyState && !journeyShown && <EmailVerifyBanner email={emailVerifyState.email} />}";

function g11Overlays(W: World, G: Graph, ok: Ok) {
  for (const j of OVERLAY_JOINS) {
    const s = text(W, j.file);
    const joined = count(s, j.today + j.join + j.end);
    const bare = count(s, j.today + j.end);
    ok(`11.${j.id} · ${j.says} — today's half verbatim with the term joined: ${j.today}${j.join}${j.end}`,
      joined === 1 && bare === 0, show({ joined, bare }));
  }
  const named = count(text(W, OVERLAY_CHANNELS), `const journeyHidden = ${OVERLAY_TERM};`);
  ok("11.channels.term · the channels panel names the term once, as journeyHidden, for its eligibility and its render",
    named === 1, `${named} definition(s)`);
  for (const g of OVERLAY_GUARDS) {
    const s = text(W, g.file);
    const adjacent = count(squash(s), g.pinned + g.guard);
    ok(`11.${g.id} · ${g.says}: ${g.pinned} then ${g.guard}`,
      adjacent === 1 && count(s, g.pinned) === 1 && count(s, g.guard) === 1,
      show({ adjacent, pinned: count(s, g.pinned), guard: count(s, g.guard) }));
  }
  const chat = text(W, OVERLAY_CHAT);
  const clears = "if (pathname && HIDE_ON.test(pathname)) {clearChatHistory();setMessages([]);setOpen(false);}";
  ok("11.chat.history · on a journey page the bubble stands down and nothing more — the panel's state and the conversation are kept; only the HIDE_ON effect clears them",
    count(squash(chat), clears) === 1 && count(chat, "clearChatHistory();") === 1,
    show({ effect: count(squash(chat), clears), clearCalls: count(chat, "clearChatHistory();") }));
  for (const [id, file] of [["needle", OVERLAY_NEEDLE], ["channels", OVERLAY_CHANNELS], ["chat", OVERLAY_CHAT]] as const) {
    const s = text(W, file);
    const specs = importsIn(W, file).filter((i) => !i.typeOnly).map((i) => i.spec);
    const own = ["JOURNEY_ROUTE", "function isJourneySurface", "const isJourneySurface"].filter((n) => s.includes(n));
    const seen = { reads: count(s, OVERLAY_READS_FLAG), asks: count(s, "isJourneySurface("), surfaces: specs.includes("@/lib/surfaces"), hook: specs.includes("@/lib/journey/journey-on"), own };
    ok(`11.reads.${id} · ${file} is client code that reads the flag once, through useJourneyOn, and asks the one journey list (surfaces.ts, §2) once — no list of its own`,
      isClient(s) && seen.reads === 1 && seen.asks === 1 && seen.surfaces && seen.hook && own.length === 0, show(seen));
  }
  for (const [id, file, line] of OVERLAY_HIDE_ON) {
    const n = count(text(W, file), asWritten(line));
    ok(`11.hideon.${id} · ${file}'s HIDE_ON is the pattern other gates pin, unchanged`, n === 1, `${n} occurrence(s)`);
  }
  const shell = text(W, SHELL);
  const mountLines = (tag: string) => shell.split(LF).filter((l) => l.includes(tag)).map((l) => l.trim());
  const consent = mountLines("<LazyConsentPrompt");
  const install = mountLines("<LazyInstallInvite");
  ok("11.consent · the analytics consent prompt is still asked of every reader, journey or not (privacy-notice §4f), and the install invitation keeps its own switch and nothing more",
    show(consent) === show(["<Suspense fallback={null}><LazyConsentPrompt /></Suspense>"])
      && show(install) === show(["{installInviteLive && <Suspense fallback={null}><LazyInstallInvite /></Suspense>}"]),
    show({ consent, install }));
  ok("11.emailbar · the email-verify bar keeps today's condition and adds the resolver's answer: a classic request's as before, never a journey request's (VODACOM-PLAN §3.2 item 2)",
    count(shell, EMAIL_BAR_MOUNT) === 1 && count(shell, "<EmailVerifyBanner") === 1 && shell.includes("const journeyShown = (await journeyRead).journey;"),
    show({ gated: count(shell, EMAIL_BAR_MOUNT), mounts: count(shell, "<EmailVerifyBanner") }));
  const loaders = [...(G.into.get(FLAG_COMPONENT) ?? [])].sort();
  const binding = count(text(W, SHELL_LAZY), FLAG_BINDING);
  ok("11.flag.lazy · the shell's lazy module alone loads JourneyFlag, through next/dynamic (WP6c), and AppShell never imports it — a classic page's first load carries none of it",
    FLAG_BINDING.length > 0 && binding === 1 && !shell.includes(`from "@/components/journey/journey-flag"`) && show(loaders) === show([SHELL_LAZY]),
    show({ binding, loaders }));
}

/* ══ §6 · THE UNREAD COUNT ═══════════════════════════════════════════════════════════════════════════════════ */
/*
 * ⛔ NO HASH OF THE BELL. A1 keeps S6's hands off `notifications-panel.tsx`, and that is proved once, in WP12, on the
 * branch's own commits (`git diff --exit-code` from the merge base, on that one file). Here the bell is held only where
 * the journey's counter depends on it — its question, its cadence, its ladder, its two broadcasts — and to loading
 * neither new file: another lane's fix to the bell must not turn this predeploy gate red.
 */
/** Where every file loading the hook must live, as a "use client" file: the journey's own components. */
const JOURNEY_COMPONENTS = "src/components/journey/";
/** What the hook may load: React, the module holding the bell's own action, and the counter. */
const HOOK_MAY_IMPORT = ["react", "@/app/_actions/notifications", "@/lib/journey/unread-count"];

/** How a stand-in read answers: with a count, by failing, or held until the test lets it land. */
type Answer = number | "fail" | "hold";
/**
 * The counter's world, stood in: a clock that moves only when told, a read that answers as told, a jitter source set by
 * the test, and the window and the document as plain event targets. Nothing real is armed, so a run costs no wall time.
 */
function standIn(answer: Answer) {
  const s = { now: 0, reads: 0, answer, hidden: false, listening: 0, rand: 0.5 };
  const timers = new Map<number, { at: number; fn: () => void }>();
  const held: Array<(n: number) => void> = [];
  const win = new EventTarget();
  const doc = new EventTarget();
  let nextId = 1;
  const deps: UNREAD.UnreadDeps = {
    read: () => {
      s.reads++;
      const a = s.answer;
      if (a === "fail") return Promise.reject(new Error("offline"));
      if (a === "hold") return new Promise<number>((land) => { held.push(land); });
      return Promise.resolve(a);
    },
    setTimer: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { at: s.now + ms, fn });
      return id;
    },
    clearTimer: (handle) => { timers.delete(handle as number); },
    hidden: () => s.hidden,
    listen: (on, type, fn) => {
      const target = on === "window" ? win : doc;
      target.addEventListener(type, fn);
      s.listening++;
      return () => { target.removeEventListener(type, fn); s.listening--; };
    },
    random: () => s.rand,
  };
  /** Every answer that can land has landed, and everything it set off has run. */
  const settle = () => new Promise<void>((done) => { setImmediate(done); });
  return {
    s, deps, held, settle,
    /** How far off each armed timer is, soonest first. */
    armed: () => [...timers.values()].map((t) => t.at - s.now).sort((a, b) => a - b),
    /** Let `ms` pass: each timer falling due fires in time order, and what it starts lands before the next one fires. */
    pass: async (ms: number) => {
      const until = s.now + ms;
      for (;;) {
        let due: [number, { at: number; fn: () => void }] | null = null;
        for (const t of timers) if (t[1].at <= until && (due === null || t[1].at < due[1].at)) due = t;
        if (due === null) break;
        timers.delete(due[0]);
        s.now = due[1].at;
        due[1].fn();
        await settle();
      }
      s.now = until;
      await settle();
    },
    broadcast: async (type: string) => { win.dispatchEvent(new Event(type)); await settle(); },
    setHidden: async (hidden: boolean) => { s.hidden = hidden; doc.dispatchEvent(new Event("visibilitychange")); await settle(); },
  };
}
/** Loaders of the hook that are not "use client" files among the journey's own components. */
const strayHookLoaders = (w: World, g: Graph) =>
  [...(g.into.get(UNREAD_HOOK) ?? [])].filter((p) => !(p.startsWith(JOURNEY_COMPONENTS) && isClient(text(w, p)))).sort();

async function g6Unread(I: Impl, W: World, G: Graph, ok: Ok) {
  const POLL = UNREAD.UNREAD_POLL_MS;
  const CHANGED = UNREAD.INBOX_CHANGED;
  const ARRIVED = UNREAD.INBOX_ARRIVED;
  const countFor = (who: string | null, shown: UNREAD.UnreadShown) => I.unread.shownFor(who, shown);

  // The bell's question, cadence and broadcasts — read out of the bell itself, so the two cannot drift apart silently.
  const bell = text(W, BELL);
  const bellNumber = (name: string): number | null => {
    const head = `const ${name} = `;
    const at = bell.indexOf(head);
    return at < 0 ? null : Number(bell.slice(at + head.length, bell.indexOf(";", at)).split("_").join(""));
  };
  const cadence = { poll: bellNumber("POLL_CLOSED_MS"), base: bellNumber("POLL_BACKOFF_BASE_MS"), max: bellNumber("POLL_BACKOFF_MAX_MS") };
  ok("6.cadence · the counter beats on the bell's closed cadence and backs off on the bell's ladder (30 s; 1 s doubling to 30 s)",
    cadence.poll === UNREAD.UNREAD_POLL_MS && cadence.base === UNREAD.UNREAD_BACKOFF_BASE_MS && cadence.max === UNREAD.UNREAD_BACKOFF_MAX_MS,
    `bell ${show(cadence)} · counter ${show([UNREAD.UNREAD_POLL_MS, UNREAD.UNREAD_BACKOFF_BASE_MS, UNREAD.UNREAD_BACKOFF_MAX_MS])}`);
  const unheard = UNREAD.UNREAD_EVENTS.filter((e) => count(bell, `window.addEventListener("${e}", onRefresh);`) !== 1);
  ok("6.events · the dot refreshes on exactly the bell's two broadcasts — an inbox change and a pushed arrival",
    show(UNREAD.UNREAD_EVENTS) === show([CHANGED, ARRIVED]) && unheard.length === 0, `the bell does not refresh on: ${unheard.join(", ")}`);

  // The hook: a client file, the bell's own action, the viewer in every step, and no interval.
  const hook = text(W, UNREAD_HOOK);
  ok(`6.hook.client · use-unread-count.ts is a "use client" hook module`, isClient(hook));
  const extra = importsIn(W, UNREAD_HOOK).map((i) => i.spec).filter((spec) => !HOOK_MAY_IMPORT.includes(spec));
  ok(`6.hook.imports · it loads only ${HOOK_MAY_IMPORT.join(", ")}`, hook.length > 0 && extra.length === 0, `also loads ${extra.join(", ")}`);
  ok("6.hook.read · it asks the bell's own question (fetchMyNotifications, from the module the bell imports) and keeps only the server's unread total, never the list",
    hook.includes("(await fetchMyNotifications()).unread") && !hook.includes(".items")
      && bell.includes(`from "@/app/_actions/notifications";`) && bell.includes("fetchMyNotifications"));
  ok("6.hook.viewer · it follows the viewer in an effect keyed by the id, lets go on every change and on unmount, and shows only that viewer's count",
    count(hook, "feed.follow(userId, mode);") === 1 && count(hook, "return () => feed.follow(null, mode);") === 1
      && count(hook, "}, [feed, userId, mode]);") === 1 && count(hook, "return unreadFor(userId, shown);") === 1);
  const intervals = [UNREAD_HOME, UNREAD_HOOK].filter((p) => text(W, p).includes("setInterval"));
  ok("6.nointerval · no interval anywhere in the counter or its hook — every beat is armed by the one before it answering",
    intervals.length === 0, intervals.join(", "));

  // Who may load it.
  const loaders = [...(G.into.get(UNREAD_HOOK) ?? [])].sort();
  const strays = strayHookLoaders(W, G);
  ok(`6.mount · only the journey's client components load the hook (${loaders.length === 0 ? "none yet: the tab's dot lands in WP6a, the hub's row in WP5" : loaders.join(", ")})`,
    strays.length === 0, `outside the journey, or not client code: ${strays.join(", ")}`);
  const coreLoaders = [...(G.into.get(UNREAD_HOME) ?? [])].sort();
  ok("6.mount.core · only the hook loads the counter", show(coreLoaders) === show([UNREAD_HOOK]), show(coreLoaders));
  const loadsHook = (directive: string) => `${directive}
import { useUnreadCount } from "@/lib/journey/use-unread-count";
`;
  const probeWorld = worldOf({
    [UNREAD_HOOK]: hook,
    "src/components/journey/probe-dot.tsx": loadsHook(`"use client";`),
    "src/components/layout/probe-bar.tsx": loadsHook(`"use client";`),
    "src/components/journey/probe-server.tsx": loadsHook(""),
  });
  const refused = strayHookLoaders(probeWorld, importGraph(probeWorld));
  ok("6.mount.c · CONTROL · the rule takes a journey client component and refuses a client file outside the journey and a journey file with no directive",
    show(refused) === show(["src/components/journey/probe-server.tsx", "src/components/layout/probe-bar.tsx"]), show(refused));

  // The classic bell keeps its own poll until S15 (A1): it loads neither new file.
  const bellLoads = (G.out.get(BELL) ?? []).filter((p) => p === UNREAD_HOOK || p === UNREAD_HOME);
  ok("6.bell.apart · the classic bell loads neither the counter nor its hook — it keeps its own poll until S15 (A1)",
    bell.length > 0 && bellLoads.length === 0, `the bell loads ${bellLoads.join(", ")}`);

  // "poll" — the tab's dot.
  {
    const env = standIn(3);
    const feed = I.unread.feed(env.deps);
    feed.follow("A", "poll");
    const atStart = { armed: env.armed(), reads: env.s.reads };
    await env.pass(0);
    const first = { reads: env.s.reads, count: countFor("A", feed.snapshot()), armed: env.armed() };
    ok("6.poll.start · the dot reads once on its first beat, shows the viewer's count, and arms the next beat 30 s out",
      show(atStart) === show({ armed: [0], reads: 0 }) && show(first) === show({ reads: 1, count: 3, armed: [POLL] }), show({ atStart, first }));
    await env.pass(POLL);
    ok("6.poll.beat · …and reads again when that beat falls due", env.s.reads === 2 && show(env.armed()) === show([POLL]),
      show({ reads: env.s.reads, armed: env.armed() }));
    await env.setHidden(true);
    const whileHidden = env.armed();
    await env.pass(20 * POLL);
    const hiddenReads = env.s.reads;
    await env.setHidden(false);
    await env.pass(0);
    ok("6.poll.hidden · a hidden tab arms nothing and reads nothing; coming back reads at once",
      whileHidden.length === 0 && hiddenReads === 2 && env.s.reads === 3, show({ whileHidden, hiddenReads, reads: env.s.reads }));
    for (const type of UNREAD.UNREAD_EVENTS) {
      const before = env.s.reads;
      env.s.answer = 10 + before;
      await env.broadcast(type);
      ok(`6.poll.event.${type} · the broadcast reads at once, and the count follows the answer`,
        env.s.reads === before + 1 && countFor("A", feed.snapshot()) === 10 + before,
        show({ reads: env.s.reads - before, count: countFor("A", feed.snapshot()) }));
    }
    env.s.answer = "hold";
    await env.broadcast(CHANGED);
    const inFlight = env.s.reads;
    await env.pass(POLL);
    const yielded = { reads: env.s.reads - inFlight, armed: env.armed().length };
    for (const land of env.held.splice(0)) land(1);
    await env.settle();
    ok("6.poll.yield · a beat never stacks a read on one still in flight: it yields and re-arms, and the held answer still lands",
      show(yielded) === show({ reads: 0, armed: 1 }) && countFor("A", feed.snapshot()) === 1, show({ yielded, count: countFor("A", feed.snapshot()) }));
    env.s.answer = "fail";
    await env.pass(POLL);
    const afterFail = env.armed();
    ok("6.poll.fail · a failed read keeps the last count and the chain: the next beat is armed, never sooner than the ladder allows",
      countFor("A", feed.snapshot()) === 1 && afterFail.length === 1 && afterFail[0] >= Math.round(POLL * 0.7),
      show({ count: countFor("A", feed.snapshot()), afterFail }));
    feed.follow(null, "poll");
    ok("6.poll.stop · letting go stops the beat and every listener", env.armed().length === 0 && env.s.listening === 0,
      show({ armed: env.armed(), listening: env.s.listening }));
  }
  // The jitter, at both ends of its band — the part of the ladder the bell calls load-bearing: every tab in the country
  // loses the server on the same deploy, and without it they all come back on the same beat.
  {
    const env = standIn("fail");
    const feed = I.unread.feed(env.deps);
    env.s.rand = 0;
    feed.follow("A", "poll");
    await env.pass(0);
    const low = env.armed();
    env.s.rand = 0.9999;
    await env.pass(low[0] ?? 0);
    const high = env.armed();
    feed.follow(null, "poll");
    ok("6.poll.jitter · a failed read re-arms 30 s ±30%: 21 s at the jitter's low end, just under 39 s at its high end",
      low.length === 1 && low[0] === Math.round(POLL * 0.7) && high.length === 1 && high[0] > POLL * 1.29 && high[0] <= POLL * 1.3,
      show({ low, high }));
  }

  // "once" — the hub's row (A1): a read when it starts and on an inbox change; never a beat, never a pushed arrival.
  {
    const env = standIn(4);
    const feed = I.unread.feed(env.deps);
    feed.follow("A", "once");
    await env.pass(0);
    const started = { reads: env.s.reads, count: countFor("A", feed.snapshot()), armed: env.armed() };
    await env.pass(20 * POLL);
    ok("6.once.nointerval · the hub's row reads once when it starts and then arms nothing — not one read in ten minutes",
      show(started) === show({ reads: 1, count: 4, armed: [] }) && env.s.reads === 1, show({ started, reads: env.s.reads }));
    const beforeChange = env.s.reads;
    env.s.answer = 6;
    await env.broadcast(CHANGED);
    ok("6.once.changed · an action that changed the inbox reads once more, the count follows, and nothing is armed",
      env.s.reads === beforeChange + 1 && countFor("A", feed.snapshot()) === 6 && env.armed().length === 0,
      show({ reads: env.s.reads - beforeChange, count: countFor("A", feed.snapshot()), armed: env.armed() }));
    const beforeArrival = env.s.reads;
    await env.broadcast(ARRIVED);
    ok("6.once.arrived · a pushed arrival is not a read for the row — one request per visit, not one per notification (A1)",
      env.s.reads === beforeArrival, `${env.s.reads - beforeArrival} reads`);
    const before = env.s.reads;
    await env.setHidden(true);
    await env.setHidden(false);
    await env.pass(20 * POLL);
    ok("6.once.visibility · coming back to the tab is not a read, and the row listens for one thing only: an inbox change",
      env.s.reads === before && env.armed().length === 0 && env.s.listening === 1,
      show({ reads: env.s.reads - before, armed: env.armed(), listening: env.s.listening }));
    feed.follow(null, "once");
  }
  {
    const env = standIn(5);
    env.s.hidden = true;
    const feed = I.unread.feed(env.deps);
    feed.follow("A", "once");
    await env.pass(0);
    ok("6.once.hidden · a row opened in a background tab still reads once — one request, not a beat",
      env.s.reads === 1 && countFor("A", feed.snapshot()) === 5 && env.armed().length === 0, show({ reads: env.s.reads, armed: env.armed() }));
    feed.follow(null, "once");
  }

  // A guest starts nothing.
  for (const mode of ["poll", "once"] as const) {
    const env = standIn(9);
    const feed = I.unread.feed(env.deps);
    feed.follow(null, mode);
    await env.pass(20 * POLL);
    for (const type of UNREAD.UNREAD_EVENTS) await env.broadcast(type);
    const seen = { reads: env.s.reads, armed: env.armed(), listening: env.s.listening, shown: feed.snapshot() };
    ok(`6.guest.${mode} · a guest starts nothing — no read, no beat, no listener — and is shown nothing`,
      show(seen) === show({ reads: 0, armed: [], listening: 0, shown: UNREAD.NOTHING_SHOWN }) && countFor(null, feed.snapshot()) === null, show(seen));
  }

  // A new viewer inherits nothing (critic G1): through a signed-out moment, as AppShell's E-381 path goes, and directly.
  for (const via of ["guest", "direct"] as const) {
    const env = standIn(7);
    const feed = I.unread.feed(env.deps);
    feed.follow("A", "poll");
    await env.pass(0);
    const before = countFor("A", feed.snapshot());
    env.s.answer = "hold";
    await env.broadcast(CHANGED);
    if (via === "guest") feed.follow(null, "poll");
    feed.follow("B", "poll");
    const atSwitch = { shown: feed.snapshot(), forB: countFor("B", feed.snapshot()), armed: env.armed() };
    for (const land of env.held.splice(0)) land(9);
    await env.settle();
    const afterLate = feed.snapshot();
    env.s.answer = 2;
    await env.pass(0);
    const bFirst = { reads: env.s.reads, forB: countFor("B", feed.snapshot()), forA: countFor("A", feed.snapshot()) };
    await env.pass(POLL);
    const oneBeat = env.s.reads - bFirst.reads;
    const path = via === "guest" ? "through a signed-out moment" : "directly";
    ok(`6.viewer.${via}.empty · when B follows A (${path}), nothing is shown at once — not A's count, not for one frame`,
      before === 7 && atSwitch.shown.unread === null && atSwitch.forB === null, show({ before, atSwitch }));
    ok(`6.viewer.${via}.late · A's read still in flight at the switch is dropped when it lands`,
      afterLate.unread === null && afterLate.viewer !== "A", show(afterLate));
    ok(`6.viewer.${via}.fresh · B starts from nothing: a read at once, then B's own count, never A's`,
      show(atSwitch.armed) === show([0]) && bFirst.forB === 2 && bFirst.forA === null, show({ armed: atSwitch.armed, bFirst }));
    ok(`6.viewer.${via}.one · after the switch one poller beats, not two`, oneBeat === 1, `${oneBeat} reads in one beat`);
    feed.follow(null, "poll");
  }
  const A7: UNREAD.UnreadShown = { viewer: "A", unread: 7 };
  ok("6.gate · a count is shown only to the viewer it was read for — never to the next viewer, never to a guest",
    countFor("A", A7) === 7 && countFor("B", A7) === null && countFor(null, A7) === null && countFor(null, UNREAD.NOTHING_SHOWN) === null,
    show({ A: countFor("A", A7), B: countFor("B", A7), guest: countFor(null, A7) }));
}

/* ══ §7 · THE HEADER (S6 WP6a) ═══════════════════════════════════════════════════════════════════════════════ */
/*
 * The S4 fit rules are read from `globals.css` AS WRITTEN — the exact numbers WP6b's header-fit rule probe compares
 * against as computed (A5) — and the bar is held to rendering what `journeyHeaderState` decides, with no inline
 * style. ⛔ Every rule is a single-line declaration block by construction (the shell's own block in the stylesheet),
 * which is what lets a rule be read without a CSS parser; §7.first holds the block to `min-width` alone, reading every
 * media block whole, however it is written.
 */
const LF = String.fromCharCode(10);
/** The declarations of the stylesheet's BASE rule for `sel`: written at a line start, outside every media block. */
function baseRule(css: string, sel: string): string {
  const at = css.indexOf(`${LF}${sel} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
}
/** The declarations of `sel` inside a one-line `@media (min-width: Npx)` block, or "". */
function minWidthRule(css: string, px: number, sel: string): string {
  const head = `@media (min-width: ${px}px) { ${sel} {`;
  const at = css.indexOf(head);
  return at < 0 ? "" : css.slice(at + head.length, css.indexOf("}", at + head.length));
}
/** A design token's value as `:root` writes it (`--sp-3: 12px;` gives "12px"), or "". */
function tokenValue(css: string, name: string): string {
  const head = `--${name}:`;
  const at = css.indexOf(head);
  return at < 0 ? "" : css.slice(at + head.length, css.indexOf(";", at)).trim();
}
/** Every `@media` block in a stylesheet: its condition and its body, braces matched (a quoted string is skipped). */
function mediaBlocks(css: string): { cond: string; body: string }[] {
  const out: { cond: string; body: string }[] = [];
  for (let at = css.indexOf("@media"); at >= 0; at = css.indexOf("@media", at + 6)) {
    const open = css.indexOf("{", at);
    if (open < 0) break;
    let depth = 0;
    let i = open;
    for (; i < css.length; i++) {
      const ch = css[i];
      if (ch === '"' || ch === "'") { const end = css.indexOf(ch, i + 1); i = end < 0 ? css.length : end; continue; }
      if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) break;
    }
    out.push({ cond: css.slice(at + 6, open).trim(), body: css.slice(open + 1, i) });
  }
  return out;
}
/** A width query that caps the viewport: `max-width`, or the range syntax's `width <` and `> width`. */
const CAPS_WIDTH = /max-width|width *<|> *width/;
/** Markup with each line trimmed, the lines joined and every blanked JSX comment gone: structure, not indentation. */
const squash = (s: string) => s.split(LF).map((l) => l.trim()).join("").split("{}").join("");
/** Where the journey's popups live: its components, and the Akaunti hub's own route (WP5). */
const JOURNEY_POPUP_HOMES = ["src/components/journey/", "src/app/account/"];
/** The journey shell's own classes in the stylesheet: header, desktop links, rail, labels, badge, guest sheet. */
const SHELL_CLASS = /[.]kp-(?:jhdr|jnav|jtab|jsheet|rail--journey|rail__badge)/;

/**
 * test:stacking's journey rows, judged by the contract's own predicates (`scripts/lib/stacking-rows.mts`) on this
 * world's source — so a plant here is a plant in the very rows the contract holds (A13).
 */
function journeyRung(W: World, id: string) {
  const row = JOURNEY_SURFACES.find((r) => r.id === id);
  if (!row) return { row, hits: 0, z: null as number | null, decl: "" };
  const body = text(W, row.file);
  const { hits, z } = soleZ(body, row.find);
  return { row, hits, z, decl: body.match(new RegExp(row.find.source))?.[0] ?? "" };
}

function g7Header(W: World, ok: Ok) {
  const bar = text(W, JHDR);
  const css = W.css;
  ok(`7.client · journey-top-bar.tsx is a "use client" component rendering ONE journey header, sticky on the classic bar's rung`,
    isClient(bar) && count(bar, `<header className="sticky top-0 z-30 app-topbar kp-jhdr" data-testid="journey-top-bar">`) === 1,
    bar.length === 0 ? "file missing" : "");
  const frame = baseRule(css, ".kp-jhdr");
  ok("7.frame · the bar is the kit's 56px opaque panel with its 1px edge, in the stylesheet — and no inline style anywhere in the bar (§0h point 6)",
    frame.includes("height: 56px") && frame.includes("background: var(--panel)") && frame.includes("border-bottom: 1px solid var(--border)")
      && !bar.includes("style={"),
    frame === "" ? "no .kp-jhdr rule" : frame);
  const row = baseRule(css, ".kp-jhdr__row");
  const row360 = minWidthRule(css, 360, ".kp-jhdr__row");
  ok("7.gutter · the row's gutter is 12px below 360 and 16px from 360 to 640 (A5) — the spacing tokens, at those values",
    row.includes("padding-inline: var(--sp-3)") && row360.includes("padding-inline: var(--sp-4)")
      && tokenValue(css, "sp-3") === "12px" && tokenValue(css, "sp-4") === "16px",
    show({ row, row360, sp3: tokenValue(css, "sp-3"), sp4: tokenValue(css, "sp-4") }));
  const cluster = baseRule(css, ".kp-jhdr__cluster");
  ok("7.gap · 6px between the row's controls below 640 (A5), in the row and inside its cluster alike — the 360 step moves only the gutter",
    row.includes("gap: 6px;") && row.includes("display: flex") && !row360.includes("gap")
      && cluster.includes("gap: 6px;") && cluster.includes("display: flex") && cluster.includes("flex-shrink: 0"),
    show({ row, row360, cluster }));
  // From 640, the classic bar's own steps (WP6a step 1) — held against the classic bar's spellings, so the two move together.
  const classic = text(W, "src/components/layout/top-app-bar.tsx");
  const steps = {
    row640: minWidthRule(css, 640, ".kp-jhdr__row"),
    row1024: minWidthRule(css, 1024, ".kp-jhdr__row"),
    row1280: minWidthRule(css, 1280, ".kp-jhdr__row"),
    cluster640: minWidthRule(css, 640, ".kp-jhdr__cluster"),
  };
  const classicSpells = {
    row: classic.includes(`"mx-auto max-w-board flex items-center h-full gap-2 px-2 sm:gap-4 sm:px-5 lg:gap-2 xl:gap-4"`),
    cluster: classic.includes(`"shrink-0 flex items-center gap-1 sm:gap-2"`),
    scale: W.tailwind.includes(`"2": "12px"`) && W.tailwind.includes(`"4": "20px"`) && W.tailwind.includes(`"5": "24px"`),
  };
  ok("7.steps · from 640 the classic bar's own steps: a 24px gutter, the row's gaps 20 / 12 / 20 at 640 / 1024 / 1280 and the cluster's 12 — the classic row and cluster still spelling those values",
    steps.row640.includes("padding-inline: var(--sp-6)") && steps.row640.includes("gap: var(--sp-5)")
      && steps.row1024.includes("gap: var(--sp-3)") && !steps.row1024.includes("padding")
      && steps.row1280.includes("gap: var(--sp-5)") && !steps.row1280.includes("padding")
      && steps.cluster640.includes("gap: var(--sp-3)")
      && count(css, ".kp-jhdr__row {") === 5 && count(css, ".kp-jhdr__cluster {") === 2
      && tokenValue(css, "sp-5") === "20px" && tokenValue(css, "sp-6") === "24px"
      && classicSpells.row && classicSpells.cluster && classicSpells.scale,
    show({ ...steps, classicSpells }));
  const home = baseRule(css, ".kp-jhdr__home");
  ok("7.home · the home link stays 44px tall and borrows 9px of gutter on each side (A5) — the bar's home link wears the rule",
    home.includes("min-height: var(--h-control-md)") && home.includes("margin-inline: -9px") && home.includes("padding-inline: 9px")
      && bar.includes('<Link href="/" aria-label={`50pick ${t.common.home}`} className="kp-jhdr__home">'),
    home);
  ok("7.brand · the 26px mark below 1280 and the 22px lockup from 1280 — the classic bar's own rule, so the lockup never takes the room at 1024",
    bar.includes(`<span className="mark-flip-i inline-flex xl:hidden"><FiftyMark size={26} /></span>`)
      && bar.includes(`<span className="hidden xl:inline-flex"><FiftyLockup size={22} markClassName="mark-flip-i" /></span>`));
  ok("7.eighteen · the 18+ roundel is the kit's, with its text as its name (no aria-label on a plain span)",
    bar.includes(`<span className="kp-rg__18">{t.footer.eighteenPlus}</span>`));
  const plus = baseRule(css, ".kp-jhdr__plus");
  ok(`7.plus · the "+" is hidden below 360 and shown from 360 (A5), in a span of its own — never a width utility on the kit button`,
    plus.includes("display: none") && minWidthRule(css, 360, ".kp-jhdr__plus").includes("display: inline-flex")
      && bar.includes(`<span aria-hidden className="kp-jhdr__plus"><I.plus s={14} /></span>`),
    show({ plus, from360: minWidthRule(css, 360, ".kp-jhdr__plus") }));
  const pillRule = baseRule(css, ".kp-jhdr__pill");
  ok("7.pill · + Weka pesa is the kit's gilt pill at the 44px rung, padded 12px below 360 and 12/10 from 360, named by its words",
    pillRule.includes("padding: 0 12px;") && minWidthRule(css, 360, ".kp-jhdr__pill").includes("padding: 0 12px 0 10px")
      && bar.includes(`className="btn gilt-metal btn-md btn-pill kp-jhdr__pill"`) && bar.includes(`href="/wallet/deposit"`)
      && bar.includes("aria-label={t.journey.depositAction}") && bar.includes(`data-testid="journey-deposit"`),
    show({ pillRule, from360: minWidthRule(css, 360, ".kp-jhdr__pill") }));
  ok("7.figure · the capsule's figure is 12px below 360 and 14px from 360, and its padding 10px (the capsule's own rules, WP4)",
    baseRule(css, ".kp-jbal__fig").includes("font-size: 12px") && minWidthRule(css, 360, ".kp-jbal__fig").includes("font-size: 14px")
      && baseRule(css, ".kp-jbal").includes("padding: 0 10px"),
    show({ fig: minWidthRule(css, 360, ".kp-jbal__fig") }));
  const auth = baseRule(css, ".kp-jhdr__auth");
  ok("7.auth · a guest's Ingia and Jisajili are the 44px pills, 13px type and 14px padding at every width (E-276)",
    auth.includes("padding-inline: 14px") && auth.includes("font-size: var(--type-small)") && tokenValue(css, "type-small") === "13px"
      && !css.includes("{ .kp-jhdr__auth {")
      && bar.includes(`className="btn btn-ghost btn-md btn-pill kp-jhdr__auth"`) && bar.includes(`className="btn btn-primary btn-md btn-pill kp-jhdr__auth"`)
      && bar.includes(`href={"/auth/login" as never}`) && bar.includes(`href={"/auth/register" as never}`),
    auth);
  ok("7.state · the bar asks journeyHeaderState once and renders its three answers: the capsule, the pill and the guest pills",
    count(bar, "journeyHeaderState({") === 1 && bar.includes(`{state.capsule !== "none" && (`) && bar.includes("{state.pill && (")
      && bar.includes("{state.authPills && (") && bar.includes("const liveBalance = useLiveBalance(user.balance ?? 0);"));
  ok(`7.desktop · from 1024 the four destinations, each lit by the one table (A12: aria-current from tabAriaCurrent, never a "page" literal), a guest's Tiketi zangu a dialog button — and no NavMore`,
    bar.includes(`<nav className="hidden lg:flex kp-jnav" aria-label={t.nav.primary}>`) && count(bar, "JOURNEY_TABS.map(") === 1
      && count(bar, "aria-current={tabAriaCurrent(pathname, d.key)}") === 1 && !bar.includes(`? "page"`)
      && bar.includes("const active = activeTabFor(pathname);") && bar.includes(`type="button"`) && bar.includes(`aria-haspopup="dialog"`)
      && count(bar, "className={JNAV}") === 2 && bar.includes(`const JNAV = "kp-jnav__link";`) && !bar.includes("<NavMore") && !bar.includes("kp-navlink"));
  const jnav = css.split(LF).filter((l) => l.includes(".kp-jnav"));
  ok("7.underline · the destinations speak the kit's SECTION language: an underline that scales in, brand when current — never the filter pill's fill (§0h point 7)",
    baseRule(css, ".kp-jnav__link::after").includes("transform: scaleX(0)")
      && baseRule(css, ".kp-jnav__link:is([aria-current], [data-on])::after").includes("background: var(--brand-500)")
      && baseRule(css, ".kp-jnav__link:is([aria-current], [data-on])::after").includes("transform: scaleX(1)")
      && jnav.length >= 4 && !jnav.some((l) => l.includes("--pill-active")),
    show(jnav.filter((l) => l.includes("--pill-active"))));
  const flat = squash(bar);
  ok("7.cluster · the right-hand controls are ONE cluster straight after the spacer, the money first; language and the account show from 1024 only (on a phone the hub holds them), each in a wrapper span, never on a kit control",
    count(bar, `<div className="kp-jhdr__cluster">`) === 1
      && flat.includes(`<div className="flex-1" /><div className="kp-jhdr__cluster">{state.capsule !== "none" && (`)
      && flat.includes(`</span></>)}</div></div>{!user.isAuthed && <TicketsGuestSheet`)
      && count(bar, "<LanguageMenu") === 1 && bar.includes(`<span className="hidden lg:inline-flex"><LanguageMenu /></span>`)
      && count(bar, "<AvatarMenu") === 1 && flat.includes(`<span className="hidden lg:inline-flex"><AvatarMenu`));
  const blocks = mediaBlocks(css);
  const phoneOnly = blocks.filter((b) => CAPS_WIDTH.test(b.cond) && SHELL_CLASS.test(b.body)).map((b) => `@media ${b.cond}`);
  ok("7.first · every rule of the journey shell is mobile-first: no width-capping query holds one, however its block is written (nothing for the density contract to fence)",
    phoneOnly.length === 0 && blocks.some((b) => b.cond === "(min-width: 360px)" && SHELL_CLASS.test(b.body)) && blocks.length > 20,
    show({ phoneOnly, blocks: blocks.length }));
  const hdr = journeyRung(W, "journey-top-bar");
  const lang = JOURNEY_TRAPPED.find((r) => r.id === "journey-language-menu");
  const menu = lang ? soleZ(text(W, lang.file), lang.find) : { hits: 0, z: null };
  ok(`7.stack · test:stacking's journey-top-bar row holds: one sticky header at z=${hdr.row?.z} forming a stacking context, and the language menu sealed in it (A13)`,
    !!hdr.row && hdr.hits === 1 && hdr.z === hdr.row.z && formsStackingContext(hdr.decl)
      && !!lang && !portalsOut(text(W, lang.file)) && rendersSymbol(bar, lang.renderedAs) && menu.hits === 1 && menu.z === lang.declared
      && hdr.z === lang.effective,
    show({ hits: hdr.hits, z: hdr.z, decl: hdr.decl, menu }));
}

/* ══ §8 · THE TABS (S6 WP6a) ═════════════════════════════════════════════════════════════════════════════════ */
/**
 * The rail's label, one line, in px: JetBrains Mono advances every Latin glyph 0.6em, and a CJK glyph (U+2E80 and up)
 * falls back to a full em. These are the fonts the S4 header was measured with (VODACOM-PLAN §0g design call 10).
 */
const monoWidth = (s: string, px: number) => [...s].reduce((w, ch) => w + ((ch.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : 0.6) * px, 0);
/**
 * A stand-in window whose `matchMedia` answers the lg query with a value the test sets, and counts its listeners.
 * Installed only for the call and taken away after, as §5's stand-in document is.
 */
function withStandInMedia<R>(matches: boolean, fn: (media: { set: (m: boolean) => void; listening: () => number }) => R): R {
  const g = globalThis as unknown as Record<string, unknown>;
  const before = g.window;
  const target = new EventTarget();
  let now = matches;
  let listening = 0;
  const lgList = {
    get matches() { return now; },
    addEventListener: (type: string, fn: () => void) => { target.addEventListener(type, fn); listening++; },
    removeEventListener: (type: string, fn: () => void) => { target.removeEventListener(type, fn); listening--; },
  };
  g.window = { matchMedia: (q: string) => (q === POLL.LG_UP_QUERY ? lgList : { matches: false, addEventListener: () => {}, removeEventListener: () => {} }) };
  try {
    return fn({ set: (m) => { now = m; target.dispatchEvent(new Event("change")); }, listening: () => listening });
  } finally {
    if (before === undefined) delete g.window;
    else g.window = before;
  }
}

function g8Tabs(I: Impl, W: World, G: Graph, ok: Ok) {
  const rail = text(W, JTABS);
  const bar = text(W, JHDR);
  const sheet = text(W, GUEST_SHEET);
  const css = W.css;
  ok(`8.root · journey-tabs.tsx is a "use client" rail: fixed to the bottom below 1024, on the rail's surface, kept clear of the Needle, named as the primary nav`,
    isClient(rail) && rail.includes(`className="lg:hidden fixed inset-x-0 bottom-0 z-40 kp-rail kp-rail--journey"`)
      && rail.includes(`data-needle-keepout=""`) && rail.includes(`data-testid="journey-tabs"`) && rail.includes("aria-label={t.nav.primary}"),
    rail.length === 0 ? "file missing" : "");
  ok("8.tabs · exactly the four JOURNEY_TABS — every href comes from the table; no centre coin, no More, no accent dot (SJ-16)",
    count(rail, "JOURNEY_TABS.map(") === 1 && count(rail, "href=") === 1 && rail.includes("href={d.href as never}")
      && !rail.includes("<NavMore") && !rail.includes("kp-coin") && !rail.includes("deposit-rail") && !rail.includes("kp-rail__dot")
      && TAB.JOURNEY_TABS.length === 4);
  const grid = baseRule(css, ".kp-rail--journey > ul");
  ok("8.grid · four equal tracks on the LIST (A18) — on the nav the whole list would be one cell",
    grid.includes("display: grid") && grid.includes("grid-template-columns: repeat(4, minmax(0, 1fr))")
      && baseRule(css, ".kp-rail--journey") === "",
    grid);
  ok(`8.aria · aria-current comes from tabAriaCurrent (A12: "page" on a tab's own href, "true" on its section) and the lit pip from activeTabFor — never a "page" literal`,
    count(rail, "aria-current={tabAriaCurrent(pathname, d.key)}") === 1 && !rail.includes(`"page"`)
      && rail.includes("const active = activeTabFor(pathname);") && rail.includes("const on = active === d.key;")
      && count(rail, `data-on={on ? "1" : undefined}`) === 2);
  ok("8.name · a tab link carries no aria-label, so its visible label is its name and the Akaunti tab's unread words join it",
    count(rail, "aria-label=") === 1 && rail.includes("aria-label={t.nav.primary}"));
  ok("8.guest · a guest's Tiketi zangu is a dialog button that opens the guest sheet — never a link whose navigation is cancelled",
    count(rail, "<button") === 1 && rail.includes(`type="button"`) && rail.includes(`aria-haspopup="dialog"`)
      && rail.includes("onClick={() => setSheetOpen(true)}") && !rail.includes("preventDefault")
      && rail.includes(`d.key === "tickets" && userId === null ? (`) && count(rail, "<TicketsGuestSheet") === 1
      && rail.includes("{userId === null && <TicketsGuestSheet"));
  ok("8.glyphs · each tab draws its glyph from the table at the rail's 20px",
    rail.includes("const Ico = I[d.glyph];") && rail.includes("<Ico s={20} />"));
  ok("8.dot · the Akaunti dot: the bell's count from the journey's counter (mode poll), the 8px brand dot, and the count in words after the label",
    count(rail, "useUnreadCount(") === 1 && rail.includes(`useUnreadCount({ userId, mode: "poll" })`)
      && rail.includes(`<Dot tone="brand" size={8} className="kp-rail__badge" />`)
      && count(rail, "unread !== null && unread > 0") === 2 && rail.includes("t.notif.unreadOne") && rail.includes("t.notif.unreadN"));
  const badge = baseRule(css, ".kp-rail__badge");
  ok("8.badge · the dot sits on the pip's corner, cut out of the glyph by a ring of the rail's own fill",
    badge.includes("position: absolute") && badge.includes("top: -2px") && badge.includes("right: 6px")
      && badge.includes("box-shadow: 0 0 0 2px var(--panel)"),
    badge);

  // A17 · the rail label, measured: wrap to two lines below 360 only where a label would otherwise ellipsise.
  const micro = parseFloat(tokenValue(css, "type-micro"));
  const padRule = baseRule(css, ".kp-rail__label");
  const padAt = padRule.indexOf("padding-inline:");
  const pad = 2 * parseFloat(padAt < 0 ? "NaN" : padRule.slice(padAt + "padding-inline:".length));
  const oneLine = (s: string) => monoWidth(s, micro) + pad;
  const labels = (["en", "sw", "zh"] as const).flatMap((loc) => TAB.JOURNEY_TABS.map((d) => ({ loc, key: d.key, s: TAB.tabLabel(dict[loc], d.label) })));
  const linesIn = (s: string, track: number) => {
    let lines = 1;
    let cur = "";
    for (const word of s.split(" ")) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && oneLine(next) > track) { lines++; cur = word; } else cur = next;
    }
    return lines;
  };
  const over320 = labels.filter((l) => oneLine(l.s) > 320 / 4);
  const over360 = labels.filter((l) => oneLine(l.s) > 360 / 4);
  const notTwo = over320.filter((l) => linesIn(l.s, 320 / 4) > 2 || l.s.split(" ").some((w) => oneLine(w) > 320 / 4));
  ok("8.label.measure · A17, measured: at 320 a label needs more than its quarter of the phone (so the wrap is earned), it fits two lines there, and from 360 every label fits one",
    Number.isFinite(micro) && Number.isFinite(pad) && over320.length > 0 && over360.length === 0 && notTwo.length === 0,
    Number.isFinite(micro) && Number.isFinite(pad) && over320.length === 0
      ? "every label now fits its quarter of a 320 phone, so A17's wrap is no longer earned: delete the label's wrap and the journey slot's top alignment in globals.css, in the same commit as the copy change, and these two checks with them"
      : show({ micro, pad, over320: over320.map((l) => `${l.loc} ${l.s} ${oneLine(l.s).toFixed(1)}`), over360: over360.map((l) => `${l.loc} ${l.s}`), notTwo: notTwo.map((l) => l.s) }));
  ok("8.label · below 360 a label may take a second, centred line; from 360 the classic one-line rule stands",
    baseRule(css, ".kp-jtab__label").includes("white-space: normal") && baseRule(css, ".kp-jtab__label").includes("text-align: center")
      && minWidthRule(css, 360, ".kp-jtab__label").includes("white-space: nowrap")
      && rail.includes(`<span className="kp-rail__label kp-jtab__label">`),
    baseRule(css, ".kp-jtab__label"));
  // The grid stretches every slot to the tallest, and the classic slot centres: a two-line label would lift its pip.
  const wraps = baseRule(css, ".kp-jtab__label").includes("white-space: normal");
  const align = { below360: baseRule(css, ".kp-rail--journey .kp-rail__item"), from360: minWidthRule(css, 360, ".kp-rail--journey .kp-rail__item") };
  ok("8.align · while a label may wrap below 360, the journey's slots stack from the top there, so every pip shares one line; from 360 the classic centring returns",
    !wraps || (align.below360.includes("justify-content: flex-start") && align.from360.includes("justify-content: center")),
    show(align));

  // ⛔ ONE UNREAD POLLER PER WIDTH (the WP3 review's cost, VODACOM-PLAN §0h point 16).
  const both = ([null, true, false] as const).filter((w) => I.pollers(w).bell && I.pollers(w).dot);
  const table = show([null, true, false].map((w) => I.pollers(w as boolean | null)));
  ok("8.poll · one unread poller per width: the bell from 1024, the dot below it, NEITHER while the width is unknown — never both",
    both.length === 0 && table === show([{ bell: false, dot: false }, { bell: true, dot: false }, { bell: false, dot: true }]), table);
  const poller = text(W, POLLER_HOME);
  const screens = W.tailwind.slice(W.tailwind.indexOf("screens: {"));
  const lgAt = screens.indexOf(`lg: "`);
  const lg = lgAt < 0 ? "" : screens.slice(lgAt + 5, screens.indexOf(`"`, lgAt + 5));
  ok("8.poll.hook · the width is the browser's answer to tailwind's own lg, read through one store whose server answer is null (no poller mounts during hydration)",
    poller.includes("useSyncExternalStore<boolean | null>(subscribeLgUp, lgUpSnapshot, lgUpServerSnapshot)")
      && lg === "1024px" && POLL.LG_UP_QUERY === `(min-width: ${lg})` && I.lgUp.serverSnapshot() === null,
    show({ lg, query: POLL.LG_UP_QUERY, server: I.lgUp.serverSnapshot() }));
  withStandInMedia(false, (media) => {
    let told = 0;
    const leave = I.lgUp.subscribe(() => { told++; });
    const phone = I.lgUp.snapshot();
    media.set(true);
    const desk = I.lgUp.snapshot();
    leave();
    media.set(false);
    ok("8.poll.media · a phone reads false and a desktop true, a change is heard once, and letting go stops listening",
      phone === false && desk === true && told === 1 && media.listening() === 0, show({ phone, desk, told, listening: media.listening() }));
  });
  ok("8.poll.bar · the header MOUNTS the bell only from 1024 — never merely hidden — in a slot that keeps its width",
    bar.includes("const pollers = pollersAt(useLgUp());") && count(bar, "<NotificationsPanel") === 1
      && bar.includes(`<span className="hidden lg:inline-flex kp-jhdr__bell">{pollers.bell && <NotificationsPanel />}</span>`)
      && baseRule(css, ".kp-jhdr__bell").includes("min-width: var(--h-control-sm)"));
  ok("8.poll.rail · the rail mounts the dot's counter only below 1024, for a signed-in viewer — the counter lives in the one component that guard renders",
    rail.includes("const pollers = pollersAt(useLgUp());") && count(rail, "<TabUnread") === 1
      && rail.includes(`d.key === "account" && userId !== null && pollers.dot`) && rail.includes("<TabUnread userId={userId}>{body}</TabUnread>")
      && !bar.includes("useUnreadCount") && !rail.includes("<NotificationsPanel"));
  const { loaders, bad } = unvouchedLoaders(W, G, POLLER_HOME);
  ok(`8.poll.loaders · only client code loads one-poller.ts — the header and the rail (${loaders.join(", ")})`,
    loaders.includes(JHDR) && loaders.includes(JTABS) && bad.length === 0, `NOT client code: ${bad.join(", ")}`);

  const tabsRung = journeyRung(W, "journey-tabs");
  const hdrRung = journeyRung(W, "journey-top-bar");
  ok(`8.stack · test:stacking's journey-tabs row holds: one fixed rail at z=${tabsRung.row?.z} forming a stacking context, ABOVE the journey header (A13)`,
    !!tabsRung.row && tabsRung.hits === 1 && tabsRung.z === tabsRung.row.z && formsStackingContext(tabsRung.decl)
      && JOURNEY_LAWS.some(([a, b]) => a === "journey-tabs" && b === "journey-top-bar")
      && tabsRung.z !== null && hdrRung.z !== null && tabsRung.z > hdrRung.z,
    show({ tabs: { hits: tabsRung.hits, z: tabsRung.z }, header: hdrRung.z }));

  ok("8.sheet · the guest sheet: the kit's bottom sheet below 1024 (440 wide from there), titled by its H2, Jisajili first and Ingia, each returning to Tiketi zangu and closing the sheet",
    isClient(sheet) && count(sheet, "<Modal") === 1 && sheet.includes("labelledBy={titleId}") && sheet.includes(`sheetUntil="lg"`)
      && sheet.includes("maxWidth={440}") && sheet.includes(`panelClassName="kp-wsheet"`) && !sheet.includes("showClose={false}")
      && sheet.includes(`<h2 id={titleId} className="kp-jsheet__title">{t.journey.ticketsGuestTitle}</h2>`)
      && sheet.indexOf(`"/auth/register?next=%2Fpositions"`) > 0 && sheet.indexOf(`"/auth/register?next=%2Fpositions"`) < sheet.indexOf(`"/auth/login?next=%2Fpositions"`)
      && sheet.includes(`className="btn btn-primary btn-lg kp-wsheet__act"`) && sheet.includes(`className="btn btn-outline btn-lg kp-wsheet__act"`)
      && count(sheet, "onClick={onClose}") === 2);
  ok("8.sheet.portal · the sheet opens through the kit Modal, which portals to the document body — so it sits on the dialog rung, not sealed in the bar or the rail (A13)",
    rendersSymbol(sheet, "Modal") && portalsOut(text(W, MODAL)) && !portalsOut(sheet) && !sheet.includes("fixed"));
  const journeyPopups = [...W.files.keys()].filter((p) => JOURNEY_POPUP_HOMES.some((home) => p.startsWith(home)) && p.endsWith(".tsx") && IS_POPUP.test(text(W, p))).sort();
  const record = reviewedIn(W.popupFit);
  const gaps = reviewGaps(journeyPopups, record);
  ok("8.popup · every popup the journey's components and its hub render is on test:popup-fit's review record — the guest sheet among them (A13)",
    journeyPopups.includes(GUEST_SHEET) && record.length > 50 && gaps.unreviewed.length === 0,
    show({ journeyPopups, unreviewed: gaps.unreviewed, record: record.length }));
  // ⭐ WP6b: the journey chrome is mounted by AppShell ALONE, and LAZILY: since WP6c through the shell's one lazy module,
  // which loads the header and the tabs with `next/dynamic` (§12 holds that module whole). Nothing else renders or loads
  // them: the root layout's first-load bundle, which every classic visitor downloads, must not carry them. (The
  // ternaries themselves are pinned by test:simple-journey-flag 10.shell.chrome.) The graph reads a dynamic import(…) as
  // the load it is.
  const mounts = [...W.files].filter(([p, s]) => p !== SHELL && (s.includes("<JourneyTopBar") || s.includes("<JourneyTabs"))).map(([p]) => p);
  const loadedBy = [JHDR, JTABS].flatMap((f) => (G.into.get(f) ?? []).filter((p) => p !== SHELL_LAZY).map((p) => `${p} loads ${f}`));
  const classicLoads = [...G.out]
    .filter(([p]) => p.startsWith("src/components/layout/") && p !== SHELL && p !== SHELL_LAZY)
    .flatMap(([p, to]) => to.filter((x) => x.startsWith(JOURNEY_COMPONENTS)).map((x) => `${p} loads ${x}`));
  ok("8.mount · mounted by AppShell alone (WP6b), through the shell's lazy module (WP6c): nothing else renders or loads the journey header or tabs, and no other classic layout file loads a journey component",
    mounts.length === 0 && loadedBy.length === 0 && classicLoads.length === 0, show({ mounts, loadedBy, classicLoads }));
  const shellSrc = text(W, SHELL);
  const lazySrc = text(W, SHELL_LAZY);
  const armsImported = importedNames(W, SHELL, SHELL_LAZY);
  const notLazy = ["LazyJourneyTopBar", "LazyJourneyTabs"].filter((b) => count(lazySrc, partLineOf(b)) !== 1 || !armsImported.includes(b));
  const staticImports = count(shellSrc, `from "@/components/journey/`) + count(lazySrc, `from "@/components/journey/`);
  const chromeLoaders = [JHDR, JTABS].map((f) => [...(G.into.get(f) ?? [])].sort());
  ok("8.mount.lazy · AppShell renders the journey header and tabs through the shell's lazy module, which loads each with next/dynamic (WP6c), and nothing imports the journey's components statically — a classic visitor's first-load bundle carries none of their code",
    chromeLoaders.every((l) => show(l) === show([SHELL_LAZY])) && notLazy.length === 0 && staticImports === 0,
    show({ chromeLoaders, notLazy, staticImports }));
}

/* ══ §9 · THE ROUTE CENSUS (S6 WP6b) ═══════════════════════════════════════════════════════════════════════════ */
/*
 * S6's done-when, "every route keeps an entrance", as a REACHABILITY GRAPH (A9): never a list of hrefs that merely sit
 * in some file.
 *   ROOTS: what a journey PHONE shows. The four tabs (a guest's Tiketi zangu opens the guest sheet), the header's own
 *   links as `journeyHeaderState` decides them, the Wallet the capsule opens and the footer; and on `/account`, which
 *   only the Akaunti tab reaches, `hubRowsFor(viewer)`. The language menu, the bell and the avatar menu show from 1024
 *   only, so they open nothing here.
 *   EDGES: the path literals of the code each page renders, its comments stripped: the page, the files beside it, the
 *   layouts above it (never the root's, which renders the chrome) and every component they load. The chrome is never
 *   an edge; its doors are roots, counted only where a phone shows them.
 *   READERS: seven kinds, each with the doors `viewerDoorsFor` gives it. A guest who meets a protected page is sent to
 *   sign in, as `proxy.ts` sends them, and walks on from there.
 * Per kind: every route the CLASSIC chrome reaches (header, More, avatar menu, rail, coin, bell, the Wallet, the
 * footer), the journey reaches too. Across kinds: every route on disk is reached, or is a named EXTERNAL entrance whose
 * generating file still names it (an email, an SMS, the payment provider, the edge, the service worker) and that no
 * door reaches yet. The door tables are held to their files both ways, so a door added to the classic chrome, or taken
 * from it, cannot slip past the census.
 * ⚠️ A15: `/updown/history` and `/positions/performance` each have TWO doors — the classic page's own (every classic
 * reader's) and, since WP9, the journey Tiketi view's (a journey phone's: the switch's Juu/Chini, the view's Utendaji
 * link). The census reads every branch of a page's code for every reader, so one door would hide the loss of the other:
 * PINNED holds all four, each to its file, each with its own plant.
 * ⚠️ WHAT IT CANNOT SEE — its limits, stated rather than hidden (the WP6b review):
 *   · A LINK BUILT IN A `.ts` HELPER IS NO EDGE. The walk follows `.tsx` components only, so a position's permalink
 *     (`position-permalink.ts`), the performance page's query links and a notification's href are invisible to it —
 *     which is why `/positions/[positionId]` is filed EXTERNAL although in-app surfaces link it.
 *   · AN EDGE IS EVERY PATH LITERAL A PAGE'S CODE HOLDS, whoever is reading: every branch of a shared component, a door
 *     gated to another reader, a `redirect()` or `revalidatePath()` argument. The walk OVER-counts what one reader can
 *     tap; only the chrome's roots are gated per reader.
 *   So it proves that no route lost its last entrance and that the journey loses no door the classic chrome had — not
 *   that a given reader sees a given door, which is the tiles' question (WP6b step 5).
 * ⚠️ IN PREDEPLOY IT IS BOOKKEEPING ANOTHER LANE CAN TRIP: a new page nothing links fails 9.entrance; a door added to or
 *   taken from the classic bar, rail, avatar menu, footer or Wallet fails 9.chrome; a page that links an EXTERNAL route
 *   fails 9.external. Clear it in that lane's commit by editing the table here. The bell alone is held one way: A1
 *   leaves it to other lanes until S15, so only the door the census counts on is held, never a door it gains.
 */
const TOP_BAR_FILE = "src/components/layout/top-app-bar.tsx";
const AVATAR_FILE = "src/components/layout/avatar-menu.tsx";
const NAV_MORE_FILE = "src/components/layout/nav-more.tsx";
const FOOTER_FILE = "src/components/layout/public-footer.tsx";
const WALLET_SHEET_FILE = "src/components/layout/wallet-sheet.tsx";
const HUB_ROWS_FILE = "src/components/journey/account/hub-rows.ts";
const ACCOUNT_PAGE_FILE = "src/app/account/page.tsx";
const PROXY_FILE = "src/proxy.ts";
const ACCOUNT_ROUTE = "/account";
const LOGIN_ROUTE = "/auth/login";
/**
 * The chrome: its doors are the census's roots, so a page that loads one of these files inherits none of its doors.
 * ⛔ Named file by file, never as the journey's whole directory: a journey PAGE component (WP9's Tiketi view, which
 * A15's pins move to) is an ordinary edge, and the census must see its doors.
 */
const CENSUS_CHROME = new Set([
  SHELL, TOP_BAR_FILE, BOTTOM_NAV, NAV_MORE_FILE, AVATAR_FILE, FOOTER_FILE, WALLET_SHEET_FILE, BELL,
  "src/components/layout/wallet-balance-pill.tsx", "src/components/layout/away-summary-bar.tsx",
  "src/components/layout/email-verify-banner.tsx",
  JHDR, JTABS, GUEST_SHEET, FLAG_COMPONENT,
]);
/** The hub's own components and page: `/account`'s doors are `hubRowsFor`'s rows, never what its files happen to name. */
const HUB_COMPONENTS = "src/components/journey/account/";
const inChrome = (rel: string) => CENSUS_CHROME.has(rel) || rel.startsWith(HUB_COMPONENTS) || rel.startsWith("src/app/account/");
/** Next's route files: the router renders them around a page, and nothing imports one as a component. */
const ROUTE_FILES = new Set(["page.tsx", "layout.tsx", "template.tsx", "loading.tsx", "error.tsx", "global-error.tsx", "not-found.tsx", "default.tsx", "route.ts"]);
const fileName = (rel: string) => rel.slice(rel.lastIndexOf("/") + 1);

/** A kind of reader the census walks for, with the inputs `viewerDoorsFor` answers it from. */
type CensusKind = { id: string; who: string; signedIn: boolean; held: boolean; input: DI };
const CENSUS_KINDS: readonly CensusKind[] = [
  { id: "guest", who: "a guest", signedIn: false, held: false, input: { ...OPEN, inviteViewer: NO_VIEWER, role: null } },
  { id: "player", who: "a player", signedIn: true, held: false, input: { ...OPEN, inviteViewer: PLAYER, role: "PLAYER" } },
  { id: "held", who: "a player whose wallet is held", signedIn: true, held: true, input: { ...OPEN, inviteViewer: PLAYER, role: "PLAYER" } },
  { id: "agent", who: "an agent in standing, the programme closed", signedIn: true, held: false, input: { ...OPEN, agentEnabled: false, inviteViewer: viewer("AGENT", true, false), role: "AGENT" } },
  { id: "staff", who: "a SUPPORT officer", signedIn: true, held: false, input: { ...OPEN, inviteViewer: viewer("SUPPORT", false, false), role: "SUPPORT" } },
  { id: "proposals.DISABLED", who: "a player with proposals DISABLED", signedIn: true, held: false, input: { ...OPEN, proposalsState: "DISABLED", inviteViewer: PLAYER, role: "PLAYER" } },
  { id: "invite.closed", who: "a player the invite is closed to", signedIn: true, held: false, input: { ...OPEN, inviteViewer: viewer("PLAYER", false, false), role: "PLAYER" } },
];

/** Who a chrome door shows for, from the reader and the doors `viewerDoorsFor` gave it. */
type Gate = (k: CensusKind, d: DO) => boolean;
const ANYONE: Gate = () => true;
const MEMBER: Gate = (k) => k.signedIn;
const GUEST_ONLY: Gate = (k) => !k.signedIn;
const MONEY_IN: Gate = (k) => k.signedIn && !k.held;
const NOT_HELD: Gate = (k) => !k.held;
const MEMBER_INVITE: Gate = (k, d) => k.signedIn && d.inviteVisible;
const INVITE_DOOR: Gate = (_k, d) => d.inviteVisible;
const PROPOSALS_DOOR: Gate = (_k, d) => d.proposalsVisible;
const MEMBER_PROPOSALS: Gate = (k, d) => k.signedIn && d.proposalsVisible;
const AGENT_DOOR: Gate = (_k, d) => d.agentDoorVisible;
type ChromeDoor = { href: string; file: string; gate: Gate };

/** The classic chrome's own doors, each gated as its file gates it: the bar (with More), the rail (coin and More), the avatar menu, the bell. */
const CLASSIC_DOORS: readonly ChromeDoor[] = [
  { href: "/", file: TOP_BAR_FILE, gate: ANYONE },
  { href: "/markets", file: TOP_BAR_FILE, gate: ANYONE },
  { href: "/updown", file: TOP_BAR_FILE, gate: ANYONE },
  { href: "/live", file: TOP_BAR_FILE, gate: ANYONE },
  { href: "/results", file: TOP_BAR_FILE, gate: ANYONE },
  { href: "/positions", file: TOP_BAR_FILE, gate: MEMBER },
  { href: "/leaderboard", file: TOP_BAR_FILE, gate: ANYONE },
  { href: "/proposals", file: TOP_BAR_FILE, gate: MEMBER_PROPOSALS },
  { href: "/wallet", file: TOP_BAR_FILE, gate: MEMBER },
  { href: "/profile/invite", file: TOP_BAR_FILE, gate: MEMBER_INVITE },
  { href: "/wallet/deposit", file: TOP_BAR_FILE, gate: MONEY_IN },
  { href: "/auth/login", file: TOP_BAR_FILE, gate: GUEST_ONLY },
  { href: "/auth/register", file: TOP_BAR_FILE, gate: GUEST_ONLY },
  { href: "/markets", file: BOTTOM_NAV, gate: ANYONE },
  { href: "/updown", file: BOTTOM_NAV, gate: ANYONE },
  { href: "/live", file: BOTTOM_NAV, gate: ANYONE },
  { href: "/wallet/deposit", file: BOTTOM_NAV, gate: NOT_HELD },
  { href: "/wallet", file: BOTTOM_NAV, gate: MEMBER },
  { href: "/results", file: BOTTOM_NAV, gate: ANYONE },
  { href: "/positions", file: BOTTOM_NAV, gate: MEMBER },
  { href: "/leaderboard", file: BOTTOM_NAV, gate: ANYONE },
  { href: "/fairness", file: BOTTOM_NAV, gate: GUEST_ONLY },
  { href: "/profile/invite", file: BOTTOM_NAV, gate: MEMBER_INVITE },
  { href: "/proposals", file: BOTTOM_NAV, gate: PROPOSALS_DOOR },
  { href: "/profile", file: AVATAR_FILE, gate: MEMBER },
  { href: "/wallet", file: AVATAR_FILE, gate: MEMBER },
  { href: "/profile/invite", file: AVATAR_FILE, gate: MEMBER_INVITE },
  { href: "/proposals", file: AVATAR_FILE, gate: MEMBER_PROPOSALS },
  { href: "/positions", file: AVATAR_FILE, gate: MEMBER },
  { href: "/results", file: AVATAR_FILE, gate: MEMBER },
  { href: "/leaderboard", file: AVATAR_FILE, gate: MEMBER },
  { href: "/profile/kyc", file: AVATAR_FILE, gate: MEMBER },
  { href: "/notifications", file: BELL, gate: MEMBER },
];
/** The footer: both shells render it, at every width. */
const FOOTER_DOORS: readonly ChromeDoor[] = [
  { href: "/profile/responsible-gambling", file: FOOTER_FILE, gate: ANYONE },
  { href: "/legal/responsible-gambling", file: FOOTER_FILE, gate: ANYONE },
  { href: "/fairness", file: FOOTER_FILE, gate: ANYONE },
  { href: "/proposals", file: FOOTER_FILE, gate: PROPOSALS_DOOR },
  { href: "/legal/rules", file: FOOTER_FILE, gate: ANYONE },
  { href: "/profile/invite", file: FOOTER_FILE, gate: INVITE_DOOR },
  { href: "/agent", file: FOOTER_FILE, gate: AGENT_DOOR },
  { href: "/help", file: FOOTER_FILE, gate: ANYONE },
  { href: "/legal/privacy", file: FOOTER_FILE, gate: ANYONE },
  { href: "/legal/aml", file: FOOTER_FILE, gate: ANYONE },
  { href: "/legal/terms", file: FOOTER_FILE, gate: ANYONE },
  { href: "/profile/account", file: FOOTER_FILE, gate: ANYONE },
];
/** The Wallet, which either capsule opens: no money door for a held wallet. */
const WALLET_SHEET_DOORS: readonly ChromeDoor[] = [
  { href: "/wallet/deposit", file: WALLET_SHEET_FILE, gate: MONEY_IN },
  { href: "/wallet/withdraw", file: WALLET_SHEET_FILE, gate: MONEY_IN },
  { href: "/profile/responsible-gambling", file: WALLET_SHEET_FILE, gate: MEMBER },
  { href: "/wallet", file: WALLET_SHEET_FILE, gate: MEMBER },
];
/** The journey header's own links on a phone, and which of `journeyHeaderState`'s answers shows each. */
const JOURNEY_HEADER_DOORS: ReadonlyArray<{ href: string; when: "always" | "pill" | "authPills" }> = [
  { href: "/", when: "always" },
  { href: "/wallet/deposit", when: "pill" },
  { href: "/auth/login", when: "authPills" },
  { href: "/auth/register", when: "authPills" },
];
/** What a guest's Tiketi zangu opens: the guest sheet's two doors, each returning to the tickets. */
const GUEST_SHEET_DOORS: readonly string[] = ["/auth/register?next=%2Fpositions", "/auth/login?next=%2Fpositions"];
/**
 * The entrances no door on a page can be: a link a player is SENT, or an address the platform answers on its own. Each
 * names the file that generates it and the text there that does; ⛔ an entry EXPIRES the day a journey door reaches its
 * route (`9.external`), and that commit deletes it.
 */
const EXTERNAL: ReadonlyArray<{ route: string; file: string; cite: string; why: string }> = [
  { route: "/positions/[positionId]", file: "src/lib/position-permalink.ts", cite: "/positions/${positionId}", why: "a position's permalink, in the notifications and links a player is sent" },
  { route: "/wallet/deposit/return", file: "src/app/wallet/deposit/actions.ts", cite: "/wallet/deposit/return", why: "the payment provider's return address" },
  { route: "/agent/invite/[token]", file: "src/lib/server/agent-application-service.ts", cite: "/agent/invite/${token}", why: "an officer's invitation, sent by email" },
  { route: "/auth/reset-password", file: "src/lib/server/password-reset.ts", cite: "/auth/reset-password?token=", why: "the reset link, sent by email" },
  { route: "/auth/verify-email", file: "src/lib/server/email-verification.ts", cite: "/auth/verify-email?token=", why: "the confirmation link, sent by email" },
  { route: "/auth/admin", file: PROXY_FILE, cite: '"/auth/admin"', why: "the staff sign-in the edge sends the console's visitors to" },
  { route: "/s", file: "src/lib/marketing/footer.ts", cite: 'OPTOUT_PATH = "/s/"', why: "a marketing SMS's opt-out link that lost its token" },
  { route: "/s/[token]", file: "src/lib/marketing/footer.ts", cite: 'OPTOUT_PATH = "/s/"', why: "the opt-out link in every marketing SMS" },
  { route: "/offline", file: "public/sw.js", cite: 'OFFLINE_URL = "/offline"', why: "the service worker's offline fallback" },
];
/**
 * A15: the four doors two tickets routes enter through — each classic page's own, which every classic reader uses, and
 * (WP9) the journey Tiketi view's, which a journey phone uses. Each is held to its file with its own plant: the census
 * counts every branch of a page for every reader, so a single pin per route would let either door go unseen.
 */
const PINNED: ReadonlyArray<{ route: string; from: string; file: string; why: string }> = [
  { route: "/updown/history", from: "/updown", file: "src/app/updown/page.tsx", why: "the board's own history link, every classic reader's door" },
  { route: "/positions/performance", from: "/positions", file: "src/app/positions/page.tsx", why: "the classic Tiketi page's performance link, every classic reader's door" },
  { route: "/updown/history", from: "/positions", file: "src/components/journey/tickets/ticket-switch.tsx", why: "the Tiketi switch's Juu/Chini door, a journey phone's (WP9)" },
  { route: "/positions/performance", from: "/positions", file: "src/components/journey/tickets/tickets-view.tsx", why: "the journey Tiketi view's Utendaji link, a journey phone's (WP9)" },
];

/** A path literal: a quoted or templated string that starts with "/", which is what an href, a redirect and a row's data look like. */
const PATH_LITERALS = [
  new RegExp(`"(/[^"${LF}]*)"`, "g"),
  new RegExp(`'(/[^'${LF}]*)'`, "g"),
  new RegExp("`(/[^`]*)`", "g"),
];
const PATHS_SEEN = new Map<string, readonly string[]>();
/** Every path literal in a source, its comments stripped first: a door written only in a comment is no door. */
function pathLiterals(src: string): readonly string[] {
  const hit = PATHS_SEEN.get(src);
  if (hit) return hit;
  const code = decomment(src);
  const found = PATH_LITERALS.flatMap((re) => [...code.matchAll(re)].map((m) => m[1]));
  PATHS_SEEN.set(src, found);
  return found;
}
/** An interpolated segment: it matches any dynamic segment of a route, and no static one. */
const ANY_SEGMENT = "[*]";
/**
 * The route of `routes` a path opens, or null: its query and fragment cut off, an interpolated segment matched to a
 * dynamic one, a static head with an interpolated tail ("/auth/2fa${…}") read as its head. A static segment beats a
 * dynamic one, so "/proposals/new" is that page and not a proposal's.
 */
function routeOfPath(path: string, routes: readonly string[]): string | null {
  const stop = path.search(/[?#]/);
  const head = stop < 0 ? path : path.slice(0, stop);
  const segs: string[] = [];
  for (const part of head.split("/")) {
    if (part.length === 0) continue;
    const at = part.indexOf("${");
    if (at === 0) { segs.push(ANY_SEGMENT); continue; }
    if (at > 0) { segs.push(part.slice(0, at)); break; }
    segs.push(part);
  }
  let best: string | null = null;
  let bestStatic = -1;
  for (const route of routes) {
    const rs = route.split("/").filter((s) => s.length > 0);
    if (rs.length !== segs.length) continue;
    let statics = 0;
    let fits = true;
    rs.forEach((s, i) => {
      if (s.startsWith("[")) return;
      if (s === segs[i]) statics++;
      else fits = false;
    });
    if (fits && statics > bestStatic) {
      best = route;
      bestStatic = statics;
    }
  }
  return best;
}
/**
 * The code a route's page renders, as repo paths: the page, the files beside it (Next's route files aside), the layouts
 * above it (never the root's, which renders the chrome) and every component those load, transitively, short of the
 * chrome and of another route's own files.
 */
function doorFilesOf(W: World, G: Graph, byDir: ReadonlyMap<string, readonly string[]>, route: string): string[] {
  const page = W.pageOf.get(route);
  if (!page) return [];
  const dir = posix.dirname(page);
  const start = new Set<string>([page, ...(byDir.get(dir) ?? []).filter((f) => !ROUTE_FILES.has(fileName(f)))]);
  for (let d = dir; d.startsWith("src/app/"); d = posix.dirname(d)) {
    if (W.files.has(`${d}/layout.tsx`)) start.add(`${d}/layout.tsx`);
  }
  const seen = new Set<string>(start);
  const stack = [...start];
  while (stack.length > 0) {
    const f = stack.pop() as string;
    for (const t of G.out.get(f) ?? []) {
      if (seen.has(t) || !t.endsWith(".tsx") || inChrome(t) || (t.startsWith("src/app/") && ROUTE_FILES.has(fileName(t)))) continue;
      seen.add(t);
      stack.push(t);
    }
  }
  return [...seen];
}
/** Every route reached from `roots` along `edges`. A route `toLogin` names sends the reader to sign in instead. */
function reachFrom(roots: readonly string[], edges: (route: string) => readonly string[], toLogin: (route: string) => boolean): Set<string> {
  const seen = new Set<string>();
  const queue = [...roots];
  for (let i = 0; i < queue.length; i++) {
    const route = toLogin(queue[i]) ? LOGIN_ROUTE : queue[i];
    if (seen.has(route)) continue;
    seen.add(route);
    for (const next of edges(route)) if (!seen.has(next)) queue.push(next);
  }
  return seen;
}
const QUOTED = new RegExp('"([^"]*)"', "g");
/** The prefixes `proxy.ts` sends a signed-out visitor to sign in from: read from the file, never typed again here. */
function protectedPrefixes(W: World): string[] {
  const src = text(W, PROXY_FILE);
  const head = "const PROTECTED_PREFIXES = [";
  const at = src.indexOf(head);
  if (at < 0) return [];
  const body = src.slice(at + head.length, src.indexOf("]", at + head.length));
  return [...body.matchAll(QUOTED)].map((m) => m[1]);
}
/** The reader `hubRowsFor` is asked about: a member as `loadHubViewer` composes one, identity still open. */
function hubViewerFor(k: CensusKind, d: DO): HUB.HubViewer {
  if (!k.signedIn) return { signedIn: false };
  return {
    signedIn: true,
    userId: `census-${k.id}`,
    name: "Census Reader",
    initials: "CR",
    phone: "+2557******00",
    balance: 2_000,
    walletHeld: k.held,
    kycOffered: true,
    agentInStanding: k.input.inviteViewer?.agentInGoodStanding === true,
    proposalsState: k.input.proposalsState,
    doors: d,
  };
}
/** The doors on `/account` for a reader: `hubRowsFor`'s rows, the only doors the hub page holds. */
function hubDoorsFor(I: Impl, k: CensusKind, d: DO): string[] {
  return I.hubRows(hubViewerFor(k, d)).flatMap((g) => g.rows.flatMap((r) => (r.kind === "link" || r.kind === "unread" ? [r.href] : [])));
}
/** The journey's phone chrome for a reader: the tabs, the header's own links, the sheets they open, the footer. */
function journeyRootsFor(I: Impl, k: CensusKind, d: DO): string[] {
  const out: string[] = [];
  for (const tab of I.tabs) {
    if (tab.key === "tickets" && !k.signedIn) out.push(...GUEST_SHEET_DOORS);
    else out.push(tab.href);
  }
  const state = I.header({ isAuthed: k.signedIn, balance: k.signedIn ? 2_000 : null, walletHeld: k.held, onBreak: false, pathname: "/" });
  for (const h of JOURNEY_HEADER_DOORS) {
    if (h.when === "always" || (h.when === "pill" && state.pill) || (h.when === "authPills" && state.authPills)) out.push(h.href);
  }
  if (state.capsule !== "none") for (const s of WALLET_SHEET_DOORS) if (s.gate(k, d)) out.push(s.href);
  for (const f of FOOTER_DOORS) if (f.gate(k, d)) out.push(f.href);
  return out;
}
/** The classic chrome for a reader: the bar, More, the avatar menu, the rail, the coin, the bell, the Wallet, the footer. */
function classicRootsFor(k: CensusKind, d: DO): string[] {
  return [...CLASSIC_DOORS, ...(k.signedIn ? WALLET_SHEET_DOORS : []), ...FOOTER_DOORS].filter((c) => c.gate(k, d)).map((c) => c.href);
}

function g9Census(I: Impl, W: World, G: Graph, ok: Ok) {
  const routes = W.routes;
  const toRoute = (href: string) => routeOfPath(href, routes);
  const routesOf = (hrefs: readonly string[]) => hrefs.map(toRoute).filter((r): r is string => r !== null);
  const namedMemo = new Map<string, Set<string>>();
  /** The population routes a file's path literals open. */
  const namedIn = (rel: string): Set<string> => {
    let s = namedMemo.get(rel);
    if (!s) {
      s = new Set(routesOf(pathLiterals(text(W, rel))));
      namedMemo.set(rel, s);
    }
    return s;
  };

  // The instruments, on fixtures first: the edge reader and the walk.
  const FX = ["/", "/markets", "/markets/[id]", "/proposals/new", "/proposals/[id]", "/auth/2fa"];
  const fixture = [
    "const a = <Link href={`/markets/${m.id}`} />;",
    'const b = <a href="/proposals/new">new</a>;',
    "const c = `/auth/2fa${next ? `?next=${next}` : ''}`;",
    'fetch("/api/markets");',
    '// <a href="/markets">a door only in a comment</a>',
  ].join(LF);
  const fxRoutes = [...new Set(pathLiterals(fixture).map((p) => routeOfPath(p, FX)).filter((r): r is string => r !== null))].sort();
  ok("9.edges.c · CONTROL · a templated door reads as its dynamic route, a static route beats a dynamic one, an interpolated tail is cut, an API path opens nothing, and a door only in a comment is no door",
    show(fxRoutes) === show(["/auth/2fa", "/markets/[id]", "/proposals/new"]), show(fxRoutes));
  const tiny: Record<string, readonly string[]> = { "/": ["/a"], "/a": ["/a", "/wallet"], "/b": ["/c"], "/c": ["/b"] };
  const walked = [...reachFrom(["/"], (r) => tiny[r] ?? [], (r) => r === "/wallet")].sort();
  ok("9.reach.c · CONTROL · the walk follows doors, survives a loop, sends a guest's protected page to sign-in, and never enters a cycle nothing links to",
    show(walked) === show(["/", "/a", LOGIN_ROUTE]), show(walked));

  const PROTECTED = protectedPrefixes(W);
  ok("9.protected · a guest's walk reads proxy.ts's own protected prefixes — the wallet, the tickets and the profile among them",
    ["/wallet", "/positions", "/profile"].every((p) => PROTECTED.includes(p)), show(PROTECTED));
  const isProtected = (route: string) => {
    const p = probe(route);
    return PROTECTED.some((x) => p === x || p.startsWith(`${x}/`));
  };
  const pageless = routes.filter((r) => !W.pageOf.has(r));
  ok(`9.population · the census walks the route census's own population (${routes.length} routes), each with its page file`,
    routes.length >= 50 && pageless.length === 0, `no page file for ${pageless.join(", ")}`);

  const tableHrefs = [
    ...[...CLASSIC_DOORS, ...FOOTER_DOORS, ...WALLET_SHEET_DOORS].map((c) => c.href),
    ...JOURNEY_HEADER_DOORS.map((h) => h.href),
    ...GUEST_SHEET_DOORS,
    ...EXTERNAL.map((e) => e.route),
    ...PINNED.flatMap((p) => [p.route, p.from]),
  ];
  const unmapped = [...new Set(tableHrefs.filter((h) => toRoute(h) === null))];
  ok("9.tables · every door, external entrance and pin the census holds names a route on disk", unmapped.length === 0, unmapped.join(", "));

  // Each chrome file names exactly the doors the census holds for it: none it lost, none the census does not know.
  // ⛔ The bell ONE way only (A1: it is other lanes' to change until S15): the door the census counts on must still be
  // there, and a door it gains is the bell's business — it never turns this predeploy gate red.
  const doorsIn = (file: string) => CLASSIC_DOORS.filter((c) => c.file === file).map((c) => c.href);
  const CHROME_FILES: ReadonlyArray<[string, readonly string[], "both" | "kept"]> = [
    [TOP_BAR_FILE, doorsIn(TOP_BAR_FILE), "both"],
    [BOTTOM_NAV, doorsIn(BOTTOM_NAV), "both"],
    [AVATAR_FILE, doorsIn(AVATAR_FILE), "both"],
    [BELL, doorsIn(BELL), "kept"],
    [NAV_MORE_FILE, [], "both"],
    [FOOTER_FILE, FOOTER_DOORS.map((c) => c.href), "both"],
    [WALLET_SHEET_FILE, WALLET_SHEET_DOORS.map((c) => c.href), "both"],
    [JHDR, JOURNEY_HEADER_DOORS.map((h) => h.href), "both"],
    [GUEST_SHEET, GUEST_SHEET_DOORS, "both"],
    [JTABS, [], "both"],
  ];
  for (const [file, hrefs, ways] of CHROME_FILES) {
    const held = new Set(routesOf(hrefs).filter((r) => r !== "/"));
    const has = new Set([...namedIn(file)].filter((r) => r !== "/"));
    const gone = [...held].filter((r) => !has.has(r));
    const unknown = ways === "both" ? [...has].filter((r) => !held.has(r)) : [];
    ok(`9.chrome.${file} · ${ways === "both"
      ? "names exactly the doors the census holds for it — none it lost, none the census does not know"
      : "still names the doors the census holds for it (held one way: A1 leaves the bell to other lanes until S15)"}`,
      text(W, file).length > 0 && gone.length === 0 && unknown.length === 0,
      text(W, file).length === 0 ? "file missing" : show({ gone, unknown }));
  }

  // The hub: every row's door opens a real route and reaches some reader; and it holds the controls that are not routes.
  const kinds = CENSUS_KINDS.map((k) => ({ k, d: I.doors(k.input) }));
  const hubHrefs = kinds.flatMap(({ k, d }) => hubDoorsFor(I, k, d));
  const hubBad = [...new Set(hubHrefs.filter((h) => toRoute(h) === null))];
  const offered = new Set(routesOf(hubHrefs));
  const unoffered = [...namedIn(HUB_ROWS_FILE)].filter((r) => !offered.has(r));
  ok("9.hub.complete · every door the hub's rows name opens a route on disk and is offered to some reader the census draws",
    hubBad.length === 0 && unoffered.length === 0 && offered.size > 10, show({ hubBad, unoffered, offered: offered.size }));
  for (const { k, d } of kinds) {
    const has = new Set<string>(I.hubRows(hubViewerFor(k, d)).flatMap((g) => g.rows.map((r) => r.kind)));
    const need = k.signedIn ? ["language", "unread", "cardSize", "needle"] : ["language"];
    const missing = need.filter((n) => !has.has(n));
    ok(`9.controls.${k.id} · the hub holds ${k.signedIn ? "the language, the notifications, the card size and the Needle" : "the language"} for ${k.who}`,
      missing.length === 0, `missing: ${missing.join(", ")}`);
  }
  const page = text(W, ACCOUNT_PAGE_FILE);
  const staffDoors = kinds.find(({ k }) => k.id === "staff")?.d;
  const playerDoors = kinds.find(({ k }) => k.id === "player")?.d;
  ok("9.controls.page · the hub page signs a member out, and opens the console for staff alone, as one plain link, on the doors' own answer",
    page.includes("{viewer.signedIn && <SignOutRow />}") && page.includes("{viewer.signedIn && viewer.doors.staffConsole && (")
      && count(page, `<a href="/admin"`) === 1 && staffDoors?.staffConsole === true && playerDoors?.staffConsole === false,
    show({ staff: staffDoors?.staffConsole, player: playerDoors?.staffConsole }));

  // The walks: classic ⊆ journey for each reader, and every route reached by some reader.
  const byDir = new Map<string, string[]>();
  for (const rel of W.files.keys()) {
    const dir = posix.dirname(rel);
    const list = byDir.get(dir);
    if (list) list.push(rel);
    else byDir.set(dir, [rel]);
  }
  const edgeMemo = new Map<string, readonly string[]>();
  const pageEdges = (route: string): readonly string[] => {
    const hit = edgeMemo.get(route);
    if (hit) return hit;
    const out = new Set<string>();
    for (const f of doorFilesOf(W, G, byDir, route)) for (const r of namedIn(f)) out.add(r);
    const list = [...out];
    edgeMemo.set(route, list);
    return list;
  };
  const journeyReach = new Set<string>();
  for (const { k, d } of kinds) {
    const toLogin = (r: string) => !k.signedIn && isProtected(r);
    const hub = routesOf(hubDoorsFor(I, k, d));
    const J = reachFrom(routesOf(journeyRootsFor(I, k, d)), (r) => (r === ACCOUNT_ROUTE ? hub : pageEdges(r)), toLogin);
    const C = reachFrom(routesOf(classicRootsFor(k, d)), (r) => (r === ACCOUNT_ROUTE ? [] : pageEdges(r)), toLogin);
    for (const r of J) journeyReach.add(r);
    const lost = [...C].filter((r) => !J.has(r)).sort();
    ok(`9.subset.${k.id} · every route the classic chrome reaches for ${k.who}, the journey's phone chrome reaches too (classic ${C.size}, journey ${J.size})`,
      C.size > 10 && lost.length === 0, `the journey loses ${lost.join(", ")}`);
  }
  const external = new Map(EXTERNAL.map((e) => [e.route, e]));
  for (const route of routes) {
    const ext = external.get(route);
    ok(`9.entrance.${route} · ${ext ? `external: ${ext.why}` : "a journey reader reaches it from the tabs, the header, the sheets, the hub or the footer"}`,
      journeyReach.has(route) || ext !== undefined, "no door a journey phone shows leads here, and no external entrance is declared");
  }
  for (const e of EXTERNAL) {
    const src = W.files.get(e.file) ?? W.extra.get(e.file) ?? "";
    ok(`9.external.${e.route} · ${e.file} still generates it, and no journey door reaches it yet`,
      routes.includes(e.route) && src.includes(e.cite) && !journeyReach.has(e.route),
      !routes.includes(e.route) ? "the route is not on disk"
        : !src.includes(e.cite) ? `${e.file} no longer says ${e.cite}`
          : "a journey door reaches it now: delete its EXTERNAL entry in this commit");
  }
  for (const p of PINNED) {
    const files = doorFilesOf(W, G, byDir, p.from);
    ok(`9.pinned.${p.route} · ${p.file} still links it from ${p.from} — ${p.why}`,
      files.includes(p.file) && namedIn(p.file).has(p.route),
      files.includes(p.file) ? `${p.file} names no door to ${p.route}` : `${p.from} no longer renders ${p.file}`);
  }
}

/* ══ §10 · THE HEADER-FIT GATE'S TERMS (S6 WP6b, A5, A6) ═══════════════════════════════════════════════════════ */
/*
 * The header-fit drives read the page through rules defined once (`scripts/live/journey-header-fit.mjs`), and the red
 * one rewrites `globals.css` for minutes at a time. Three terms keep them honest, each read from its own file:
 *   RULES — a drive skips the pill's rules exactly where `journeyHeaderState` draws no pill (the deposit screen and its
 *   return, a guest, a held wallet), so a KP_ROUTE that hides the pill skips what it cannot measure instead of failing
 *   it, and asks it everywhere else. The drives carry a copy of that rule, because they run on plain node; this holds
 *   the copy to the original.
 *   LEASH — `red:journey-header-fit` refuses, before its first write, unless `--alone` is on its own command line, which
 *   its package script never passes, so `red:all` (which runs the script as written) cannot supply it; and it refuses
 *   inside a `red:all` run, which marks every harness it starts with KP_RED_ALL. Both exit 2: premise absent.
 *   WITNESS — the stylesheet holds no red-run witness. Every mutation names itself in one, and a run killed hard between
 *   a write and its restore (on Windows a forced kill, a crash or a bluescreen runs no handler) leaves it behind: it
 *   fails here, in predeploy, by name. Restore with `git checkout -- src/app/globals.css`.
 */
const ALONE_REFUSAL = 'if (!process.argv.includes("--alone")) die(';
const RED_ALL_REFUSAL = "if (process.env.KP_RED_ALL) die(";
const RED_ALL_MARK = 'KP_RED_ALL: "1"';
/** The red twin's first file write, spelled in two halves so that this in-process file never holds such a call. */
const FIRST_WRITE = ["write", "FileSync("].join("");
/** The routes the pill's rule is asked about: two of them draw no pill, the rest do. */
const PILL_ROUTES = ["/", "/markets", "/updown", "/positions", "/wallet", "/wallet/deposit", "/wallet/deposit/return"];

function g10Terms(I: Impl, W: World, ok: Ok) {
  const pillRule = JHF.RULES.find((r) => r.when === "pill");
  const disagree = pillRule ? JHF.STATES.flatMap((s) => PILL_ROUTES
    .filter((route) => JHF.applies(pillRule, s, route) !== I.header({ isAuthed: s.signedIn, balance: s.signedIn ? 0 : null, walletHeld: s.held === true, onBreak: false, pathname: route }).pill)
    .map((route) => `${s.id} on ${route}`)) : [];
  ok("10.rules.pill · the header-fit drives ask the pill's rules exactly where journeyHeaderState draws the pill — never on the deposit screen or its return, for a guest or for a held wallet",
    !!pillRule && disagree.length === 0, pillRule ? `the drives and the header disagree: ${disagree.join(", ")}` : "no rule reads the pill");

  const twin = W.extra.get(RED_TWIN) ?? "";
  const firstWrite = twin.indexOf(FIRST_WRITE);
  const refusesFirst = (refusal: string) => {
    const at = twin.indexOf(refusal);
    return at > 0 && firstWrite > at;
  };
  let script = "";
  try {
    script = String(JSON.parse(W.extra.get(PACKAGE) ?? "{}").scripts?.["red:journey-header-fit"] ?? "");
  } catch {
    script = "";
  }
  ok("10.leash.alone · red:journey-header-fit refuses, before its first write, unless --alone is on its own command line — and its package script does not pass --alone itself",
    refusesFirst(ALONE_REFUSAL) && twin.includes("process.exit(2)") && script.includes(RED_TWIN) && !script.includes("--alone"),
    show({ refusesFirst: refusesFirst(ALONE_REFUSAL), script }));
  const redAll = W.extra.get(RED_ALL) ?? "";
  ok("10.leash.red-all · red:all marks every harness it starts with KP_RED_ALL, and the twin refuses, before its first write, when the mark is set",
    refusesFirst(RED_ALL_REFUSAL) && redAll.includes(RED_ALL_MARK),
    show({ refusesFirst: refusesFirst(RED_ALL_REFUSAL), marks: redAll.includes(RED_ALL_MARK) }));
  ok("10.leash.witness · the stylesheet holds no red-run witness — a mutation a hard kill left behind fails here, by name",
    !W.css.includes(`${WITNESS_PROPERTY}:`), `${WITNESS_PROPERTY} is in globals.css: restore it with git checkout -- src/app/globals.css`);
}

/* ══ §12 · THE SHELL'S DEFERRED PARTS (S6 WP6c) ════════════════════════════════════════════════════════════════ */
/*
 * VODACOM-PLAN §0h point 20. AppShell is a SERVER component, and `React.lazy(() => import(…))` there split nothing in
 * this build: production showed the journey's header and tabs in the first-load scripts of every page, for every
 * visitor, in the chunk that held the channels panel and the consent prompt, and a local production build read the
 * older parts there too. What does split, as that build showed, is `next/dynamic` in a client module, so every part
 * AppShell loads lazily comes from ONE such module, `shell-lazy.tsx` (SHELL_PARTS, at the top). Read here, decommented:
 *   (a) AppShell calls no React `lazy` and imports none, under any name;
 *   (b) every lazily loaded part it renders is a binding it imports from that module under the table's name, rendered
 *       once, as the one child of its own Suspense boundary: next/dynamic adds none of its own, so that boundary is the
 *       part's only one (without it the part's boundary markers leave the HTML, and its chunk holds up the hydration of
 *       the whole page); AppShell imports none of the parts' own modules, by any import; nothing else imports the
 *       module; and the offline banner is NOT a part: AppShell imports it statically, as its code always came, because
 *       its one job is a connection that fails;
 *   (c) the module is "use client", its one static import is `next/dynamic`, and it declares exactly the table, each
 *       part one line with no option object — no `ssr: false` (the part would leave the server's HTML) and no `loading`
 *       (a Suspense boundary of next/dynamic's own inside AppShell's: new boundary markers) — each loader ending in
 *       `.catch(nothingIfLost)`, the guard that leaves out a part whose code never arrives (a ChunkLoadError: without it
 *       the whole page falls to the critical-error screen), reports it once, and throws every other error on;
 *   (d) every module it loads is a "use client" module, and the module is that part's only loader (a static import
 *       anywhere else puts the part's code back in that file's first load), save the three named files that import the
 *       win celebration's module for `dispatchWinCelebration`;
 *   and, platform-wide, no server module in src calls or imports React's `lazy`, and none defers a "use client" module
 *   through `import(…)` at all — React.lazy, next/dynamic or any wrapper: the defect AppShell had, wherever it recurs.
 * ⚠️ It cannot see chunking itself: that a part leaves the first load is shown only by a production build (VODACOM-PLAN
 * §0i, WP6c). This holds the source to the shape that build proved.
 */
/** A call of React's lazy (`lazy(`, `React.lazy(`, with or without type arguments), and not a longer name that ends in it (`makelazy(`). */
const LAZY_CALL = new RegExp("(?<![A-Za-z0-9_$])(?:React[.])?lazy[ ]*(?:<[^()]*>)?[ ]*[(]");
/** React's `lazy` imported by name, or renamed (`lazy as deferred`). */
const LAZY_IMPORT = new RegExp(`import[^;]*[{,][ ]*lazy(?:[ ]+as[ ]+[A-Za-z0-9_$]+)?[ ]*[,}][^;]*from[ ]*["']react["']`);
/** Every element whose tag is a lazily loaded part's name. */
const LAZY_TAG = new RegExp("<(Lazy[A-Za-z0-9_]*)(?![A-Za-z0-9_])", "g");
/** A part as the one child of its own Suspense boundary, in squashed source: a fallback of null or of one empty element. */
const wrappedPart = (binding: string) =>
  new RegExp(`<Suspense fallback=[{](?:null|<[^{}<>]*/>)[}]><${binding}(?:[ ][^<>]*)?[ ]/></Suspense>`, "g");
/**
 * The lost-chunk guard every part's loader ends in, as written in the module (the stand-in squashed): it renders
 * nothing; it takes a ChunkLoadError alone and throws every other error on; it reports the loss to the client-error
 * endpoint the error boundaries use; and it gives the stand-in.
 */
const LOST_GUARD = {
  stand: "function Nothing(): null {return null;}",
  head: "function nothingIfLost(error: unknown): typeof Nothing {",
  rethrow: `if (!(error instanceof Error) || error.name !== "ChunkLoadError") throw error;`,
  report: `navigator.sendBeacon("/api/client-error",`,
  gives: "return Nothing;",
};
/** The offline banner: imported statically by AppShell and mounted in its own boundary — never a deferred part. */
const OFFLINE_BANNER = "src/components/ui/offline-banner.tsx";
const OFFLINE_MOUNT = "<Suspense fallback={null}><OfflineBanner /></Suspense>";
/** The win celebration's module, and the three files that import it statically for `dispatchWinCelebration`. */
const WIN_HOME = "src/components/markets/win-celebration.tsx";
const WIN_IMPORTERS = ["src/components/layout/away-summary-bar.tsx", "src/components/markets/notify-poller.tsx", "src/components/updown/updown-result-announcer.tsx"];
/** Every `import(…)` or `require(…)` in a server module of src that names a "use client" module, as "file -> module". */
function deferredClientImports(w: World): string[] {
  return [...w.files].filter(([, s]) => !isClient(s)).flatMap(([p, s]) => [...s.matchAll(CALLED)]
    .map((m) => resolveIn(w, p, m[1]))
    .filter((t): t is string => t !== null && isClient(text(w, t)))
    .map((t) => `${p} -> ${t}`));
}

function g12ShellParts(W: World, G: Graph, ok: Ok) {
  const shell = text(W, SHELL);
  const lazySrc = text(W, SHELL_LAZY);
  const table = SHELL_PARTS.map(([b]) => b);
  const lazyHit = LAZY_CALL.exec(shell)?.[0] ?? null;
  ok("12.shell.nolazy · AppShell calls no React lazy and imports none, under any name: in a server component it split nothing (VODACOM-PLAN §0h point 20)",
    shell.length > 0 && lazyHit === null && !LAZY_IMPORT.test(shell), show({ lazyHit, imported: LAZY_IMPORT.test(shell) }));
  const imported = importedNames(W, SHELL, SHELL_LAZY);
  const rendered = [...shell.matchAll(LAZY_TAG)].map((m) => m[1]);
  const notOnce = table.filter((b) => rendered.filter((r) => r === b).length !== 1);
  const stray = [...new Set(rendered.filter((r) => !table.includes(r)))];
  const ownBinding = new RegExp("(?:const|let|var|function|class)[ ]+Lazy[A-Za-z0-9_]*").test(shell);
  ok(`12.shell.parts · every lazily loaded part AppShell renders is imported from the shell's lazy module under its table name, and rendered once (${table.length})`,
    show([...imported].sort()) === show([...table].sort()) && notOnce.length === 0 && stray.length === 0 && !ownBinding,
    show({ imported, notOnce, stray, ownBinding }));
  const flat = squash(shell);
  const unwrapped = table.filter((b) => [...flat.matchAll(wrappedPart(b))].length !== 1);
  ok(`12.shell.wrapped · every part is the one child of its own Suspense boundary in AppShell, as before WP6c: next/dynamic adds none, so without it the part's boundary markers leave the HTML and its chunk holds up the whole page's hydration (${table.length})`,
    unwrapped.length === 0, show({ unwrapped }));
  const offline = {
    imported: importedNames(W, SHELL, OFFLINE_BANNER), mounted: count(flat, OFFLINE_MOUNT), tags: count(shell, "<OfflineBanner"),
    deferred: (G.out.get(SHELL_LAZY) ?? []).includes(OFFLINE_BANNER), loaders: [...(G.into.get(OFFLINE_BANNER) ?? [])].sort(),
  };
  ok("12.shell.offline · the offline banner is NOT deferred: AppShell imports it statically, as its code always came, so it is ready before the connection it reports on can fail; mounted once, in its own Suspense boundary, and loaded by nothing else",
    show(offline.imported) === show(["OfflineBanner"]) && offline.mounted === 1 && offline.tags === 1 && !offline.deferred && show(offline.loaders) === show([SHELL]),
    show(offline));
  const partFiles = SHELL_PARTS.map(([, spec]) => resolveIn(W, SHELL_LAZY, spec));
  const shellLoads = G.out.get(SHELL) ?? [];
  const direct = partFiles.filter((f): f is string => f !== null && shellLoads.includes(f));
  const unresolved = SHELL_PARTS.filter((_, i) => partFiles[i] === null).map(([b]) => b);
  ok("12.shell.only · AppShell imports none of the parts' own modules, by any import: its one way to them is the shell's lazy module",
    shellLoads.includes(SHELL_LAZY) && unresolved.length === 0 && direct.length === 0, show({ direct, unresolved }));
  const home = [...(G.into.get(SHELL_LAZY) ?? [])].sort();
  ok("12.module.home · AppShell alone imports the shell's lazy module", show(home) === show([SHELL]), show(home));
  ok(`12.module.client · ${SHELL_LAZY} is a "use client" module, the one client boundary AppShell renders its parts through`,
    lazySrc.length > 0 && isClient(lazySrc), lazySrc.length === 0 ? "file missing" : "no directive");
  const statics = [...lazySrc.matchAll(STATIC_FROM)].map((m) => `${m[1].trim()} from ${m[2]}`);
  const bare = [...lazySrc.matchAll(BARE_IMPORT)].map((m) => m[1]);
  const options = ["ssr", "loading", "suspense"].filter((word) => lazySrc.includes(word));
  const calls = count(lazySrc, "dynamic(");
  ok("12.module.dynamic · it loads every part with next/dynamic and nothing statically: its one static import is next/dynamic, no part passes an option object (no ssr: false, no loading), and it calls no React lazy",
    show(statics) === show(["dynamic from next/dynamic"]) && bare.length === 0 && options.length === 0 && calls === SHELL_PARTS.length
      && !LAZY_CALL.test(lazySrc),
    show({ statics, bare, options, calls }));
  const missing = SHELL_PARTS.filter((row) => count(lazySrc, partLine(row)) !== 1).map(([b]) => b);
  const exported = count(lazySrc, "export ");
  ok(`12.parts.table · the module declares exactly the ${SHELL_PARTS.length} parts of the table, each its one line: export const <name> = dynamic(() => import("<module>").then((m) => m.<component>).catch(nothingIfLost));`,
    missing.length === 0 && exported === SHELL_PARTS.length, show({ missing, exported }));
  const guard = {
    stand: count(squash(lazySrc), LOST_GUARD.stand), head: count(lazySrc, LOST_GUARD.head), rethrow: count(lazySrc, LOST_GUARD.rethrow),
    report: count(lazySrc, LOST_GUARD.report), gives: count(lazySrc, LOST_GUARD.gives),
  };
  const order = [LOST_GUARD.head, LOST_GUARD.rethrow, LOST_GUARD.report, LOST_GUARD.gives].map((s) => lazySrc.indexOf(s));
  ok("12.module.lost · a part whose code never arrives is left out, not fatal: the guard every loader ends in takes a ChunkLoadError alone (any other error is thrown on, as before WP6c), reports it to /api/client-error, and gives a stand-in that renders nothing",
    Object.values(guard).every((n) => n === 1) && order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])),
    show({ guard, order }));
  const loads = importsIn(W, SHELL_LAZY).filter((i) => i.spec !== "next/dynamic");
  const notClient = loads.map((i) => resolveIn(W, SHELL_LAZY, i.spec) ?? `${i.spec} (unresolved)`).filter((f) => !isClient(text(W, f)));
  ok(`12.parts.client · every module the shell's lazy module loads is a "use client" module (${loads.length})`,
    loads.length === SHELL_PARTS.length && notClient.length === 0, show({ notClient }));
  const strayLoaders = SHELL_PARTS.map(([b], i) => {
    const file = partFiles[i];
    const want = file === WIN_HOME ? [...WIN_IMPORTERS, SHELL_LAZY].sort() : [SHELL_LAZY];
    const got = file === null ? [] : [...(G.into.get(file) ?? [])].sort();
    return { b, got, same: show(got) === show(want) };
  }).filter((r) => !r.same).map((r) => `${r.b}: ${r.got.join(", ") || "nothing"}`);
  ok("12.parts.home · the shell's lazy module is each part's one loader (a static import anywhere else puts that part's code back in that file's first load), save the three named files that import the win celebration's module for dispatchWinCelebration (a fourth is a finding)",
    unresolved.length === 0 && strayLoaders.length === 0, strayLoaders.join(" | "));
  const serverLazy = [...W.files].filter(([, s]) => !isClient(s) && (LAZY_CALL.test(s) || LAZY_IMPORT.test(s))).map(([p]) => p);
  ok("12.nolazy.platform · no server module in src calls or imports React's lazy, the defect AppShell had (a client module may)",
    serverLazy.length === 0, serverLazy.join(", "));
  const deferred = deferredClientImports(W);
  ok(`12.nodefer.platform · no server module in src defers a "use client" module through import(…) — React.lazy, next/dynamic or any wrapper: from a server file that module joins the first load all the same`,
    deferred.length === 0, deferred.join(", "));
  const cases = ['const A = lazy(() => import("x"));', "const B = React.lazy(load);", "const C = makelazy(1);", "const D = LazyThing(2);", "const E = lazy<Props>(load);"];
  const caught = cases.map((c) => LAZY_CALL.test(c));
  const importCases = ['import { Suspense, lazy } from "react";', 'import { lazy as deferred } from "react";', 'import { lazyLoad } from "react";', 'import { lazy } from "./mine";'];
  const importsCaught = importCases.map((c) => LAZY_IMPORT.test(c));
  const probe = worldOf({ [SHELL]: `import {${LF}  LazyA, LazyB,${LF}} from "./shell-lazy";${LF}import { C } from "./other";${LF}`, [SHELL_LAZY]: "" });
  const probeNames = importedNames(probe, SHELL, SHELL_LAZY);
  const probeTags = [...`<Suspense><LazyA />${LF}<LazyBee x={1} />`.matchAll(LAZY_TAG)].map((m) => m[1]);
  const wrapProbe = ["<Suspense fallback={null}><LazyA /></Suspense>", '<Suspense fallback={<div className="x" />}><LazyA b={c} /></Suspense>', "<LazyA />",
    "<Suspense fallback={null}><LazyA /><X /></Suspense>"].map((s) => [...s.matchAll(wrappedPart("LazyA"))].length);
  const deferProbe = deferredClientImports(worldOf({
    "src/p/server.tsx": `const X = dynamic(() => import("@/p/client").then((m) => m.C));${LF}const Y = import("./plain");${LF}`,
    "src/p/client.tsx": `"use client";${LF}export function C() { return null; }${LF}`,
    "src/p/plain.ts": `export const p = 1;${LF}`,
    "src/p/other.tsx": `"use client";${LF}const Z = dynamic(() => import("@/p/client").then((m) => m.C));${LF}`,
  }));
  ok("12.c · CONTROL · the readers can fail: the lazy reader takes lazy(, React.lazy( and lazy<T>( and leaves makelazy( and a Lazy name alone; the import reader takes lazy by name or renamed, from react only; the list reader reads across lines, from the module named; the tag reader finds each part's element; the boundary reader takes a part alone in its boundary and nothing else; the deferral reader takes a server file's import of a client module and nothing else",
    show(caught) === show([true, true, false, false, true]) && show(importsCaught) === show([true, true, false, false])
      && show(probeNames) === show(["LazyA", "LazyB"]) && show(probeTags) === show(["LazyA", "LazyBee"])
      && show(wrapProbe) === show([1, 1, 0, 0]) && show(deferProbe) === show(["src/p/server.tsx -> src/p/client.tsx"]),
    show({ caught, importsCaught, probeNames, probeTags, wrapProbe, deferProbe }));
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════ */
async function run(I: Impl, W: World, log: (l: string) => void): Promise<{ failed: string[]; total: number }> {
  const failed: string[] = [];
  let total = 0;
  const ok: Ok = (label, cond, detail = "") => {
    total++;
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  };
  const G = importGraph(W);
  log("\n§1 · the tabs — activeTabFor over every route on disk, aria-current, the table and its guard, one definer");
  g1Tabs(I, W, ok);
  log("\n§2 · the journey surfaces — an exact allowlist; the two older predicates unchanged; what each decision module loads");
  g2Surfaces(I, W, ok);
  log("\n§3 · the header — journeyHeaderState's truth table");
  g3Header(I, ok);
  log("\n§4 · the doors — viewerDoorsFor, the classic spellings of the same rules, and no browser bundle");
  g4Doors(I, W, G, ok);
  log("\n§5 · the flag — useJourneyOn's parts, JourneyFlag, and who may load the hook");
  g5Flag(I, W, G, ok);
  log("");
  log("§11 · the overlays — what the flag stands down, for whom, and what it leaves for everybody (WP7; read beside §5, whose flag it is)");
  g11Overlays(W, G, ok);
  log("");
  log("§6 · the unread count — the bell's question on the bell's cadence, one viewer at a time, and the classic bell apart");
  await g6Unread(I, W, G, ok);
  log("");
  log("§7 · the header — the S4 fit rules as written, the bar's markup, its rung and the menu sealed in it (WP6a)");
  g7Header(W, ok);
  log("");
  log("§8 · the tabs — four destinations, one unread poller per width, the guest sheet, mounted by AppShell alone, lazily (WP6a, WP6b)");
  g8Tabs(I, W, G, ok);
  log("");
  log("§9 · the route census — every route keeps an entrance, and the journey loses no door the classic chrome had (WP6b)");
  g9Census(I, W, G, ok);
  log("");
  log("§10 · the header-fit gate's terms — the drives' pill rule, the red twin's leash, no witness left behind (WP6b, A6)");
  g10Terms(I, W, ok);
  log("");
  log("§12 · the shell's deferred parts — no React lazy in AppShell, one client module of next/dynamic parts each in its own boundary, a lost chunk left out, no server module deferring a client one (WP6c)");
  g12ShellParts(W, G, ok);
  return { failed, total };
}

if (!PROVE_RED) {
  console.log("journey-shell — the new shell's decisions, pure (Vodacom plan S6, WP2)");
  const { failed, total } = await run(REAL, WORLD, (l) => console.log(l));
  console.log(`\nJOURNEY SHELL — ${total === 0 ? "0 checks ran: a zero-assertion run is a SKIPPED run" : failed.length === 0 ? `all ${total} checks passed` : `${failed.length} of ${total} failed`}\n`);
  for (const f of failed) console.log(`  · ${f}`);
  process.exitCode = total > 0 && failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  let pass = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) { pass++; console.log(`  ok   ${label}`); }
    else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  console.log("RED CONTROL — journey-shell's defects, planted in memory\n");

  const baseline = await run(REAL, WORLD, quiet);
  if (baseline.total === 0 || baseline.failed.length > 0) {
    console.log(`INCONCLUSIVE: the clean run already fails (${baseline.failed[0] ?? "0 checks ran"}) — a plant could not be told from it`);
    process.exitCode = 1;
  } else {
    ok(`baseline · the shipped modules and source pass all ${baseline.total} checks before anything is planted`, true);

    const withFile = (w: World, rel: string, edit: (s: string) => string): World => {
      const files = new Map(w.files);
      files.set(rel, edit(files.get(rel) ?? ""));
      return { ...w, files };
    };
    const changed = (w: World, rel: string) => w.files.get(rel) !== WORLD.files.get(rel);
    const fromRows = (rows: readonly TabRoute[]): Partial<Impl> => ({
      routes: rows,
      routeFor: (p) => TAB.tabRouteIn(rows, p),
      activeTab: (p) => TAB.tabRouteIn(rows, p)?.tab ?? null,
    });

    /** `/updown/history` moved BELOW `/updown`, where the game's row claims it first. */
    const historyBelow: TabRoute[] = (() => {
      const rows = TAB.TAB_ROUTES.filter((r) => r.prefix !== "/updown/history");
      const i = rows.findIndex((r) => r.prefix === "/updown");
      return [...rows.slice(0, i + 1), { prefix: "/updown/history", tab: "tickets" }, ...rows.slice(i + 1)];
    })();
    const noAccount = TAB.TAB_ROUTES.filter((r) => r.prefix !== "/account");
    const hubNull = (p: string | null) => (p === "/results" || (p ?? "").startsWith("/results/") ? null : TAB.activeTabFor(p));
    /** A18's defect: the opt-out row matched as a bare prefix, so it claims every path that starts with an s. */
    const sRow: TabRoute = TAB.TAB_ROUTES.find((r) => r.prefix === "/s") ?? { prefix: "/s", tab: null };
    const bareS = (p: string | null) => (p && p.startsWith("/s") ? sRow : TAB.tabRouteFor(p));
    /** A12's defect: "page" for every page of the section. */
    const pageForSection = (p: string | null, tab: JourneyTab) => (TAB.activeTabFor(p) === tab ? ("page" as const) : undefined);
    const outOfOrder = [TAB.JOURNEY_TABS[0], TAB.JOURNEY_TABS[2], TAB.JOURNEY_TABS[1], TAB.JOURNEY_TABS[3]];
    const ghostGlyph = TAB.JOURNEY_TABS.map((d): JourneyTabDef => (d.key === "tickets" ? { ...d, glyph: "tickets" as string as TAB.TabGlyph } : d));
    const guardIgnoresDicts: Impl["tabKeys"] = () => TAB.tabTableProblems(TAB.TAB_ROUTES, TAB.JOURNEY_TABS);
    const prefixMarkets = (p: string | null) => !!p && (p.startsWith("/markets") || SURF.isJourneySurface(p));
    const dropsHome = (p: string | null) => p !== "/" && SURF.isJourneySurface(p);
    const forgetsRounds = (p: string | null) => SURF.isCommitSurface(p) && !(p ?? "").startsWith("/updown/");
    const pillOnBreak: Impl["header"] = (i) => ({ ...HDR.journeyHeaderState(i), pill: HDR.journeyHeaderState({ ...i, onBreak: false }).pill });
    const pillWhenHeld: Impl["header"] = (i) => ({ ...HDR.journeyHeaderState(i), pill: HDR.journeyHeaderState({ ...i, walletHeld: false }).pill });
    const hidesAtZero: Impl["header"] = (i) => (i.balance === 0 ? { ...HDR.journeyHeaderState(i), capsule: "none" } : HDR.journeyHeaderState(i));
    const pillOnDeposit: Impl["header"] = (i) => ({ ...HDR.journeyHeaderState(i), pill: HDR.journeyHeaderState({ ...i, pathname: "/" }).pill });
    const doorNoStanding: Impl["doors"] = (i) => ({ ...DOORS.viewerDoorsFor(i), agentDoorVisible: i.agentEnabled });
    const consoleTier: Impl["doors"] = (i) => ({ ...DOORS.viewerDoorsFor(i), staffConsole: hasRole(i.role, ADMIN_CONSOLE_ROLES) });
    const stuckUp: Impl["flag"]["raise"] = () => { FLAG.raiseJourneyFlag(); return () => {}; };
    const agentStanding: DI = { ...OPEN, agentEnabled: false, inviteViewer: viewer("AGENT", true, false), role: "AGENT" };

    const secondResolver = withFile(WORLD, BOTTOM_NAV,
      (s) => `${s}\nfunction activeTabFor(p: string) { return p === "/" ? "questions" : null; }\n`);
    const newRoute: World = { ...WORLD, routes: [...WORLD.routes, "/brand-new"] };
    const accountLands: World = { ...WORLD, ahead: new Set([...AHEAD_OF_DISK, "/account"]) };
    const surfacesImport = withFile(WORLD, SURFACES, (s) => `import { MARK } from "@/lib/brand-mark";\n${s}`);
    const tabsClient = withFile(WORLD, HOME, (s) => `"use client";\n${s}`);
    const doorsRead = withFile(WORLD, DOORS_HOME, (s) => s.replace(
      `import type { ProposalsState } from "@/lib/server/proposals-config";`,
      `import { getProposalsConfig, type ProposalsState } from "@/lib/server/proposals-config";`));
    const anchorLost: World = { ...WORLD, surfacesRaw: WORLD.surfacesRaw.replace("export function isMoneySurface(", "function isMoneySurface(") };
    const shellDrift = (i: number, to: string) => withFile(WORLD, SHELL, (s) => s.replace(SHELL_FORMULAS[i][1], to));
    const inviteDrift = shellDrift(0, "const inviteVisible = inviteViewer.playerInviteEligible;");
    const paidDrift = shellDrift(1, "const invitePaid = await invitePayableRead;");
    const agentDrift = shellDrift(2, "const agentDoorVisible = getAgentConfig().enabled;");
    const chromeDrift = withFile(WORLD, "src/components/layout/top-app-bar.tsx", (s) => s.replace(PROPOSALS_RULE, `proposalsState === "ACTIVE"`));
    const DOORS_HELPER = "src/lib/journey/doors-label.ts";
    const doorsInClient = withFile(WORLD, BOTTOM_NAV, (s) => `${s}\nimport { viewerDoorsFor } from "@/lib/journey/viewer-doors";\n`);
    const doorsTwoHops = withFile(
      withFile(WORLD, DOORS_HELPER, () => `import { viewerDoorsFor } from "./viewer-doors";\nexport const doorsLabel = viewerDoorsFor;\n`),
      BOTTOM_NAV, (s) => `${s}\nimport { doorsLabel } from "@/lib/journey/doors-label";\n`);
    const FLAG_HELPER = "src/lib/journey/flag-helper.ts";
    const serverImporter = withFile(WORLD, SHELL, (s) => `${s}\nimport { useJourneyOn } from "@/lib/journey/journey-on";\n`);
    const serverTwoHops = withFile(
      withFile(WORLD, FLAG_HELPER, () => `import { useJourneyOn } from "./journey-on";\nexport const useFlagHelper = () => useJourneyOn();\n`),
      SHELL, (s) => `${s}\nimport { useFlagHelper } from "@/lib/journey/flag-helper";\n`);
    const flagClient = withFile(WORLD, FLAG_HOME, (s) => `"use client";\n${s}`);
    const flagNoCleanup = withFile(WORLD, FLAG_COMPONENT, (s) => s.replace("useEffect(() => raiseJourneyFlag(), [])", "useEffect(() => { raiseJourneyFlag(); }, [])"));
    const markForEveryone = withFile(WORLD, SHELL, (s) => s.replace("{journeyShown && <span hidden id={JOURNEY_SHELL_MARK} />}", "<span hidden id={JOURNEY_SHELL_MARK} />"));
    const markClient = withFile(WORLD, MARK_HOME, (s) => `"use client";${LF}${s}`);
    const markIgnored: Impl["flag"]["snapshot"] = () => document.documentElement.hasAttribute(FLAG.JOURNEY_FLAG_ATTR);
    const mountedForAll = withFile(WORLD, SHELL, (s) => `${s}\nconst everyone = <JourneyFlag />;\n`);

    // §11 — the overlays (WP7): a stand-down widened to every reader, dropped or misplaced; the flag read another way;
    // a HIDE_ON pattern moved; the consent prompt gated; the email bar back for a journey viewer; the flag loaded eagerly.
    const flagForEveryone = withFile(WORLD, SHELL, (s) => s.replace("{journeyShown && <Suspense fallback={null}><LazyJourneyFlag /></Suspense>}", "<Suspense fallback={null}><LazyJourneyFlag /></Suspense>"));
    const needleForAll = withFile(WORLD, OVERLAY_NEEDLE, (s) => s.replace(`(${OVERLAY_TERM})`, "isJourneySurface(pathname)"));
    const needleDepsStale = withFile(WORLD, OVERLAY_NEEDLE, (s) => s.replace("}, [hiddenPref, pathname, journeyOn]);", "}, [hiddenPref, pathname]);"));
    const panelEligibleAnyway = withFile(WORLD, OVERLAY_CHANNELS, (s) => s.replace(" && !journeyHidden;", ";"));
    const panelRendersAnyway = withFile(WORLD, OVERLAY_CHANNELS, (s) => s.replace(`${LF}  if (journeyHidden) return null;`, ""));
    const panelHiddenEverywhere = withFile(WORLD, OVERLAY_CHANNELS, (s) => s.replace(`const journeyHidden = ${OVERLAY_TERM};`, `const journeyHidden = journeyOn && (pathname ?? "").startsWith("/");`));
    const panelReadsAttribute = withFile(WORLD, OVERLAY_CHANNELS, (s) => s.replace(OVERLAY_READS_FLAG, `const journeyOn = typeof document !== "undefined" && document.documentElement.hasAttribute("data-journey");`));
    const chatForAll = withFile(WORLD, OVERLAY_CHAT, (s) => s.replace(`if (${OVERLAY_TERM}) return null;`, "if (isJourneySurface(pathname)) return null;"));
    const chatClearsHistory = withFile(WORLD, OVERLAY_CHAT, (s) => s.replace("if (pathname && HIDE_ON.test(pathname)) {", `if (pathname && (HIDE_ON.test(pathname) || (${OVERLAY_TERM}))) {`));
    const chatHideWidened = withFile(WORLD, OVERLAY_CHAT, (s) => s.replace("(auth|admin|s)(", "(auth|admin|s|markets)("));
    const panelHideWidened = withFile(WORLD, OVERLAY_CHANNELS, (s) => s.replace("(legal|profile)", "(legal|profile|help)"));
    const consentForClassicOnly = withFile(WORLD, SHELL, (s) => s.replace("<Suspense fallback={null}><LazyConsentPrompt /></Suspense>", "{!journeyShown && <Suspense fallback={null}><LazyConsentPrompt /></Suspense>}"));
    const emailBarForAll = withFile(WORLD, SHELL, (s) => s.replace(EMAIL_BAR_MOUNT, "{emailVerifyState && <EmailVerifyBanner email={emailVerifyState.email} />}"));
    const flagEager = withFile(WORLD, SHELL, (s) => `${s}${LF}import { JourneyFlag } from "@/components/journey/journey-flag";${LF}`);
    const flagInClassic = withFile(WORLD, BOTTOM_NAV, (s) => `${s}${LF}import { JourneyFlag } from "@/components/journey/journey-flag";${LF}`);

    // §6 — defective counters, each wrapped around the real one, and the files around them edited in memory.
    /** G1's defect: the last viewer's count stays up until the next viewer's first answer lands. */
    const stickyFeed = (deps: UNREAD.UnreadDeps): UNREAD.UnreadFeed => {
      const real = UNREAD.createUnreadFeed(deps);
      let last = UNREAD.NOTHING_SHOWN;
      real.subscribe(() => { const now = real.snapshot(); if (now.unread !== null) last = now; });
      return { ...real, snapshot: () => last };
    };
    /** The switch starts the next viewer and never stops the last one. */
    const leakyFeed = (deps: UNREAD.UnreadDeps): UNREAD.UnreadFeed => {
      let latest = UNREAD.NOTHING_SHOWN;
      const told = new Set<() => void>();
      return {
        follow: (userId, mode) => {
          latest = UNREAD.NOTHING_SHOWN;
          if (userId === null) return;
          const run = UNREAD.createUnreadFeed(deps);
          run.subscribe(() => { latest = run.snapshot(); for (const onChange of told) onChange(); });
          run.follow(userId, mode);
        },
        subscribe: (onChange) => { told.add(onChange); return () => { told.delete(onChange); }; },
        snapshot: () => latest,
      };
    };
    /** A gate that shows whatever was read last, to whoever asks. */
    const anyViewer: typeof UNREAD.unreadFor = (_userId, shown) => shown.unread;
    /** The hub's row beats like the dot: an interval in "once" mode. */
    const hubPolls = (deps: UNREAD.UnreadDeps): UNREAD.UnreadFeed => {
      const real = UNREAD.createUnreadFeed(deps);
      return { ...real, follow: (userId, mode) => real.follow(userId, mode === "once" ? "poll" : mode) };
    };
    /** The hub's row hears every pushed arrival too: a request per notification while the row is open. */
    const rowHearsArrivals = (deps: UNREAD.UnreadDeps): UNREAD.UnreadFeed => UNREAD.createUnreadFeed({
      ...deps,
      listen: (on, type, fn) => {
        const off = deps.listen(on, type, fn);
        if (type !== UNREAD.INBOX_CHANGED) return off;
        const alsoOff = deps.listen(on, UNREAD.INBOX_ARRIVED, fn);
        return () => { off(); alsoOff(); };
      },
    });
    /** A guest read as somebody. */
    const guestPolls = (deps: UNREAD.UnreadDeps): UNREAD.UnreadFeed => {
      const real = UNREAD.createUnreadFeed(deps);
      return { ...real, follow: (userId, mode) => real.follow(userId ?? "guest", mode) };
    };
    /** A counter blind to a hidden tab. */
    const blindToHidden = (deps: UNREAD.UnreadDeps): UNREAD.UnreadFeed => UNREAD.createUnreadFeed({ ...deps, hidden: () => false });
    /** The jitter dropped: every failed read re-arms at exactly 30 s. */
    const noJitter = (deps: UNREAD.UnreadDeps): UNREAD.UnreadFeed => UNREAD.createUnreadFeed({ ...deps, random: () => 0.5 });
    /** A re-arm below the jitter's band: a failed read is tried again in 3 s. */
    const undercuts = (deps: UNREAD.UnreadDeps): UNREAD.UnreadFeed => UNREAD.createUnreadFeed({ ...deps, random: () => -1 });
    /* Each defective counter, shown misbehaving on its own before it is handed to the gate. */
    const stickyKeeps = await (async () => {
      const env = standIn(7);
      const feed = stickyFeed(env.deps);
      feed.follow("A", "poll");
      await env.pass(0);
      feed.follow(null, "poll");
      feed.follow("B", "poll");
      return feed.snapshot().unread === 7;
    })();
    const leakKeepsPolling = await (async () => {
      const env = standIn(7);
      const feed = leakyFeed(env.deps);
      feed.follow("A", "poll");
      await env.pass(0);
      feed.follow(null, "poll");
      await env.pass(UNREAD.UNREAD_POLL_MS);
      return env.s.reads === 2;
    })();
    const hubBeats = await (async () => {
      const env = standIn(4);
      hubPolls(env.deps).follow("A", "once");
      await env.pass(0);
      return env.armed().length === 1;
    })();
    const rowHears = await (async () => {
      const env = standIn(4);
      rowHearsArrivals(env.deps).follow("A", "once");
      await env.pass(0);
      await env.broadcast(UNREAD.INBOX_ARRIVED);
      return env.s.reads === 2;
    })();
    const guestReads = await (async () => {
      const env = standIn(4);
      guestPolls(env.deps).follow(null, "poll");
      await env.pass(0);
      return env.s.reads === 1;
    })();
    const hiddenPolled = await (async () => {
      const env = standIn(3);
      env.s.hidden = true;
      blindToHidden(env.deps).follow("A", "poll");
      await env.pass(0);
      return env.s.reads === 1;
    })();
    const jitterGone = await (async () => {
      const env = standIn("fail");
      env.s.rand = 0;
      noJitter(env.deps).follow("A", "poll");
      await env.pass(0);
      return show(env.armed()) === show([UNREAD.UNREAD_POLL_MS]);
    })();
    const retriesSoon = await (async () => {
      const env = standIn("fail");
      undercuts(env.deps).follow("A", "poll");
      await env.pass(0);
      return (env.armed()[0] ?? UNREAD.UNREAD_POLL_MS) < Math.round(UNREAD.UNREAD_POLL_MS * 0.7);
    })();
    const withHookImport = (s: string) => `${s}
import { useUnreadCount } from "@/lib/journey/use-unread-count";
`;
    const bellLoadsHook = withFile(WORLD, BELL, withHookImport);
    const shellLoadsHook = withFile(WORLD, SHELL, withHookImport);
    const hookForgetsViewer = withFile(WORLD, UNREAD_HOOK, (s) => s.replace("}, [feed, userId, mode]);", "}, [feed, mode]);"));
    const hookCountsList = withFile(WORLD, UNREAD_HOOK,
      (s) => s.replace("(await fetchMyNotifications()).unread", "(await fetchMyNotifications()).items.length"));
    const hookLosesDirective = withFile(WORLD, UNREAD_HOOK, (s) => s.replace(`"use client";`, ""));
    const hookInterval = withFile(WORLD, UNREAD_HOOK, (s) => `${s}
export const keepAsking = () => window.setInterval(() => {}, 30_000);
`);
    const counterImports = withFile(WORLD, UNREAD_HOME, (s) => `import { formatTzs } from "@/lib/utils";
${s}`);
    const bellRetimed = withFile(WORLD, BELL, (s) => s.replace("const POLL_CLOSED_MS = 30_000;", "const POLL_CLOSED_MS = 20_000;"));
    const bellRenamed = withFile(WORLD, BELL, (s) => s.replace(
      `window.addEventListener("50pick:sse:notification", onRefresh);`, `window.addEventListener("50pick:sse:push", onRefresh);`));

    // §7 and §8 — the journey chrome (WP6a): the stylesheet, the bar, the rail, the sheet and popup-fit's record,
    // each edited in memory, plus defective poller decisions and a width store that never lets go.
    const withCss = (edit: (s: string) => string): World => ({ ...WORLD, css: edit(WORLD.css) });
    const cssChanged = (w: World) => w.css !== WORLD.css;
    /** Replace `from` with `to` inside the base rule of `sel` only, the way §7 reads a rule. */
    const inRule = (sel: string, from: string, to: string) => (css: string) => {
      const at = css.indexOf(`${LF}${sel} {`);
      const end = at < 0 ? -1 : css.indexOf("}", at);
      return at < 0 || end < 0 ? css : css.slice(0, at) + css.slice(at, end).replace(from, to) + css.slice(end);
    };
    /** The same, inside the one-line `@media (min-width: Npx)` rule for `sel`. */
    const inMedia = (px: number, sel: string, from: string, to: string) => (css: string) => {
      const head = `@media (min-width: ${px}px) { ${sel} {`;
      const at = css.indexOf(head);
      const end = at < 0 ? -1 : css.indexOf("}", at + head.length);
      return at < 0 || end < 0 ? css : css.slice(0, at) + css.slice(at, end).replace(from, to) + css.slice(end);
    };
    const plusAt320 = withCss(inRule(".kp-jhdr__plus", "display: none", "display: inline-flex"));
    const gutter16 = withCss(inRule(".kp-jhdr__row", "padding-inline: var(--sp-3)", "padding-inline: var(--sp-4)"));
    const figure14 = withCss(inRule(".kp-jbal__fig", "font-size: 12px", "font-size: 14px"));
    const gap8 = withCss(inRule(".kp-jhdr__row", "gap: 6px;", "gap: 8px;"));
    const homeFlush = withCss(inRule(".kp-jhdr__home", "margin-inline: -9px", "margin-inline: 0"));
    const authPad20 = withCss(inRule(".kp-jhdr__auth", "padding-inline: 14px", "padding-inline: 20px"));
    const pillPad16 = withCss(inRule(".kp-jhdr__pill", "padding: 0 12px;", "padding: 0 16px;"));
    const phoneOnlyRule = withCss((s) => `${s}${LF}@media (max-width: 359.98px) { .kp-jhdr__row { gap: 4px; } }${LF}`);
    const phoneOnlyBlock = withCss((s) => `${s}${LF}@media (max-width: 359.98px) {${LF}  .kp-jhdr__row {${LF}    gap: 4px;${LF}  }${LF}}${LF}`);
    const clusterGap4 = withCss(inRule(".kp-jhdr__cluster", "gap: 6px;", "gap: 4px;"));
    const flatFrom640 = withCss(inMedia(640, ".kp-jhdr__row", "gap: var(--sp-5); ", ""));
    const CLASSIC_BAR = "src/components/layout/top-app-bar.tsx";
    const classicGutterMoves = withFile(WORLD, CLASSIC_BAR, (s) => s.replace("sm:gap-4 sm:px-5 lg:gap-2", "sm:gap-4 sm:px-6 lg:gap-2"));
    const pillForAnyPlayer = withFile(WORLD, JHDR, (s) => s.replace("{state.pill && (", "{user.isAuthed && ("));
    const pipsLifted = withCss(inRule(".kp-rail--journey .kp-rail__item", "justify-content: flex-start", "justify-content: center"));
    const dotAlways = withFile(WORLD, JTABS, (s) => s.replace(
      `{unread !== null && unread > 0 && <Dot tone="brand" size={8} className="kp-rail__badge" />}`, `<Dot tone="brand" size={8} className="kp-rail__badge" />`));
    const serverLoadsPoller = withFile(WORLD, SHELL, (s) => `${s}${LF}import { useLgUp } from "@/lib/journey/one-poller";${LF}`);
    const POLLER_HELPER = "src/lib/journey/width-helper.ts";
    const pollerTwoHops = withFile(
      withFile(WORLD, POLLER_HELPER, () => `import { useLgUp } from "./one-poller";${LF}export const useWide = () => useLgUp();${LF}`),
      SHELL, (s) => `${s}${LF}import { useWide } from "@/lib/journey/width-helper";${LF}`);
    const pillFill = withCss(inRule(".kp-jnav__link:is([aria-current], [data-on])", "color: var(--text);", "color: var(--text); background: var(--pill-active);"));
    const gridOnNav = withCss((s) => s.replace(".kp-rail--journey > ul {", ".kp-rail--journey {"));
    const labelEllipsis = withCss(inRule(".kp-jtab__label", "white-space: normal", "white-space: nowrap"));
    const badgeBare = withCss(inRule(".kp-rail__badge", "box-shadow: 0 0 0 2px var(--panel)", "box-shadow: none"));
    const lockupAtLg = withFile(WORLD, JHDR, (s) => s.replace("mark-flip-i inline-flex xl:hidden", "mark-flip-i inline-flex lg:hidden"));
    const headerNotSticky = withFile(WORLD, JHDR, (s) => s.replace("sticky top-0 z-30 app-topbar kp-jhdr", "top-0 z-30 app-topbar kp-jhdr"));
    const sectionSaysPage = withFile(WORLD, JHDR, (s) => s.replace("aria-current={tabAriaCurrent(pathname, d.key)}", `aria-current={active === d.key ? "page" : undefined}`));
    const languageOnPhones = withFile(WORLD, JHDR, (s) => s.replace(`<span className="hidden lg:inline-flex"><LanguageMenu /></span>`, "<LanguageMenu />"));
    const inlineHeight = withFile(WORLD, JHDR, (s) => s.replace(`data-testid="journey-top-bar"`, `data-testid="journey-top-bar" style={{ height: 64 }}`));
    const bellEverywhere = withFile(WORLD, JHDR, (s) => s.replace("{pollers.bell && <NotificationsPanel />}", "<NotificationsPanel />"));
    const tabsAt30 = withFile(WORLD, JTABS, (s) => s.replace("bottom-0 z-40 kp-rail kp-rail--journey", "bottom-0 z-30 kp-rail kp-rail--journey"));
    const moreReturns = withFile(WORLD, JTABS, (s) => s.replace("</ul>", `</ul><NavMore items={[]} label="" variant="rail" />`));
    const railSaysPage = withFile(WORLD, JTABS, (s) => s.replace("aria-current={tabAriaCurrent(pathname, d.key)}", `aria-current={on ? "page" : undefined}`));
    const accountNamed = withFile(WORLD, JTABS, (s) => s.replace("<Link", "<Link aria-label={tabLabel(t, d.label)}"));
    const guestCancelled = withFile(WORLD, JTABS, (s) => s.replace("<button", `<Link href="/positions" onClick={(e) => e.preventDefault()}`).replace("</button>", "</Link>"));
    const dotOnDesktop = withFile(WORLD, JTABS, (s) => s.replace(" && pollers.dot", ""));
    const sheetHandRolled = withFile(WORLD, GUEST_SHEET, (s) => s.replace("<Modal", `<div role="dialog" className="fixed inset-0"`).replace("</Modal>", "</div>"));
    const sheetForgetsTickets = withFile(WORLD, GUEST_SHEET, (s) => s.replace("/auth/register?next=%2Fpositions", "/auth/register"));
    const classicMountsRail = withFile(WORLD, BOTTOM_NAV, (s) => `${s}${LF}export const leak = <JourneyTabs userId={null} />;${LF}`);
    // §9 — the census (WP6b): pages nothing reaches, a door only in a comment, a door removed, a tab and a hub row
    // gone, an external entrance lost or stale, a classic door unknown to the census or gone from its file, a pin lost.
    const withPage = (w: World, route: string, rel: string, src: string): World => ({
      ...w,
      routes: [...w.routes, route].sort(),
      pageOf: new Map<string, string>([...w.pageOf, [route, rel] as [string, string]]),
      files: new Map<string, string>([...w.files, [rel, src] as [string, string]]),
    });
    const orphanCycle = withPage(
      withPage(WORLD, "/zz-orphan-a", "src/app/zz-orphan-a/page.tsx", `export default function OrphanA() { return <a href="/zz-orphan-b">b</a>; }${LF}`),
      "/zz-orphan-b", "src/app/zz-orphan-b/page.tsx", `export default function OrphanB() { return <a href="/zz-orphan-a">a</a>; }${LF}`);
    const lonely = withPage(WORLD, "/zz-lonely", "src/app/zz-lonely/page.tsx", `export default function Lonely() { return null; }${LF}`);
    const AGENT_PAGE = "src/app/agent/page.tsx";
    const APPLY_CLIENT = "src/app/agent/apply/apply-client.tsx";
    const TERMS = `"/legal/agent-terms"`;
    const termsTo = (to: string) => (s: string) => s.split(TERMS).join(to);
    const termsInComment = withFile(withFile(WORLD, AGENT_PAGE, termsTo(`"/legal" /* ${TERMS} */`)), APPLY_CLIENT, termsTo(`"/legal" /* ${TERMS} */`));
    const termsGone = withFile(withFile(WORLD, AGENT_PAGE, termsTo(`"/legal"`)), APPLY_CLIENT, termsTo(`"/legal"`));
    const RESET_LINK = "src/lib/server/password-reset.ts";
    const resetUnnamed = withFile(WORLD, RESET_LINK, (s) => s.split("/auth/reset-password?token=").join("/auth/reset?token="));
    const PROFILE_PAGE = "src/app/profile/page.tsx";
    const verifyLinked = withFile(WORLD, PROFILE_PAGE, (s) => `${s}${LF}const stale = <a href="/auth/verify-email">confirm</a>;${LF}`);
    const barUnknownDoor = withFile(WORLD, TOP_BAR_FILE, (s) => `${s}${LF}const extraDoor = { href: "/watchlist" };${LF}`);
    const avatarLostKyc = withFile(WORLD, AVATAR_FILE, (s) => s.split(`"/profile/kyc"`).join(`"/kyc"`));
    const UPDOWN_PAGE = "src/app/updown/page.tsx";
    const historyUnpinned = withFile(WORLD, UPDOWN_PAGE, (s) => s.split(`"/updown/history"`).join(`"/updown"`));
    const POSITIONS_PAGE = "src/app/positions/page.tsx";
    const performanceUnpinned = withFile(WORLD, POSITIONS_PAGE, (s) => s.split(`"/positions/performance"`).join(`"/positions"`));
    const TICKET_SWITCH = "src/components/journey/tickets/ticket-switch.tsx";
    const TICKETS_VIEW = "src/components/journey/tickets/tickets-view.tsx";
    const switchUnpinned = withFile(WORLD, TICKET_SWITCH, (s) => s.split(`"/updown/history"`).join(`"/updown"`));
    const utendajiUnpinned = withFile(WORLD, TICKETS_VIEW, (s) => s.split(`"/positions/performance"`).join(`"/positions"`));
    const noAkaunti = TAB.JOURNEY_TABS.filter((t) => t.key !== "account");
    const withoutRow = (id: string): Impl["hubRows"] => (v) => HUB.hubRowsFor(v).map((g) => ({ ...g, rows: g.rows.filter((r) => r.id !== id) }));
    const noArifa = withoutRow("notifications");
    const noLanguage = withoutRow("language");
    const censusPlayer = CENSUS_KINDS[1];
    const playerHub = hubViewerFor(censusPlayer, DOORS.viewerDoorsFor(censusPlayer.input));
    const hasRow = (groups: HUB.HubGroup[], id: string) => groups.some((g) => g.rows.some((r) => r.id === id));
    // §8 · WP6b — the journey chrome mounted by AppShell alone, and lazily.
    const MARKETS_PAGE = "src/app/markets/page.tsx";
    const pageLoadsHeader = withFile(WORLD, MARKETS_PAGE,
      (s) => `${s}${LF}const Bar = lazy(() => import("@/components/journey/journey-top-bar").then((m) => ({ default: m.JourneyTopBar })));${LF}`);
    const shellStatic = withFile(WORLD, SHELL, (s) => `${s}${LF}import { JourneyTabs } from "@/components/journey/journey-tabs";${LF}`);
    // §12 · WP6c — the shell's deferred parts: React lazy back in a server file (by name, renamed, or next/dynamic in a
    // server module), an option object, a part reached around the module, a directive lost, a part pointed elsewhere,
    // a second home, a static import, a stray name, a part rendered twice or outside its boundary, the offline banner
    // deferred, a second loader of a part, and the lost-chunk guard weakened or dropped.
    const HELP_PAGE = "src/app/help/page.tsx";
    const ROOT_LAYOUT = "src/app/layout.tsx";
    const FOOTER = "src/components/layout/public-footer.tsx";
    const PULL_TO_REFRESH = "src/components/ui/pull-to-refresh.tsx";
    const lazyAgain = withFile(WORLD, SHELL, (s) => s.replace(`import { Suspense } from "react";`, `import { Suspense, lazy } from "react";`)
      + `${LF}const LazyOld = lazy(() => import("@/components/ui/offline-banner").then((m) => ({ default: m.OfflineBanner })));${LF}`);
    const ssrOff = withFile(WORLD, SHELL_LAZY, (s) => s.replace(".then((m) => m.ChannelsPanel).catch(nothingIfLost));",
      ".then((m) => m.ChannelsPanel).catch(nothingIfLost), { ssr: false });"));
    const loadingBox = withFile(WORLD, SHELL_LAZY, (s) => s.replace(".then((m) => m.JourneyTopBar).catch(nothingIfLost));",
      ".then((m) => m.JourneyTopBar).catch(nothingIfLost), { loading: () => null });"));
    const shellDirect = withFile(WORLD, SHELL, (s) => `${s}${LF}import { ChannelsPanel } from "@/components/social/channels-panel";${LF}`);
    const moduleServer = withFile(WORLD, SHELL_LAZY, (s) => s.replace(`"use client";`, ""));
    const partServer = withFile(WORLD, PULL_TO_REFRESH, (s) => s.replace(`"use client";`, ""));
    const serverPageLazy = withFile(WORLD, HELP_PAGE,
      (s) => `${s}${LF}const Banner = lazy(() => import("@/components/ui/offline-banner").then((m) => ({ default: m.OfflineBanner })));${LF}`);
    const partSwapped = withFile(WORLD, SHELL_LAZY, (s) => s.replace(`import("@/components/analytics/consent-prompt").then((m) => m.ConsentPrompt)`,
      `import("@/components/pwa/install-invite").then((m) => m.InstallInvite)`));
    const secondHome = withFile(WORLD, HELP_PAGE, (s) => `${s}${LF}import { LazyChannelsPanel } from "@/components/layout/shell-lazy";${LF}`);
    const moduleStatic = withFile(WORLD, SHELL_LAZY, (s) => `${s}${LF}import { JourneyTabs } from "@/components/journey/journey-tabs";${LF}`);
    const strayPart = withFile(WORLD, SHELL, (s) => s.replace("<LazyPullToRefresh />", "<LazyPullToRefresh /><LazyStray />"));
    const lazyRenamed = withFile(WORLD, SHELL, (s) => s.replace(`import { Suspense } from "react";`, `import { Suspense, lazy as deferred } from "react";`)
      + `${LF}const Old = deferred(() => import("@/components/ui/offline-banner").then((m) => ({ default: m.OfflineBanner })));${LF}`);
    const shellDynamic = withFile(WORLD, SHELL, (s) => `${s}${LF}import dynamic from "next/dynamic";${LF}`
      + `const DeferredNeedle = dynamic(() => import("@/components/layout/needle").then((m) => m.Needle));${LF}`);
    const layoutDynamic = withFile(WORLD, ROOT_LAYOUT, (s) => `${s}${LF}import dynamic from "next/dynamic";${LF}`
      + `const Banner = dynamic(() => import("@/components/ui/offline-banner").then((m) => m.OfflineBanner));${LF}`);
    const pageImportsLazy = withFile(WORLD, HELP_PAGE, (s) => `${s}${LF}import { lazy } from "react";${LF}`);
    const panelUnwrapped = withFile(WORLD, SHELL, (s) => s.replace("<Suspense fallback={null}><LazyChannelsPanel promoSuppressed={promoSuppressed} /></Suspense>",
      "<LazyChannelsPanel promoSuppressed={promoSuppressed} />"));
    const winUnwrapped = withFile(WORLD, SHELL, (s) => s.replace("<Suspense fallback={null}><LazyWinCelebration /></Suspense>", "<LazyWinCelebration />"));
    const pullUnwrapped = withFile(WORLD, SHELL, (s) => s.replace(
      new RegExp(`<Suspense fallback=[{]null[}]>[ ${LF}]*<LazyPullToRefresh />[ ${LF}]*</Suspense>`), "<LazyPullToRefresh />"));
    const winTwice = withFile(WORLD, SHELL, (s) => s.replace("<Suspense fallback={null}><LazyWinCelebration /></Suspense>",
      "<Suspense fallback={null}><LazyWinCelebration /></Suspense><Suspense fallback={null}><LazyWinCelebration /></Suspense>"));
    const offlineDeferred = withFile(
      withFile(WORLD, SHELL_LAZY, (s) => `${s}${LF}export const LazyOfflineBanner = dynamic(() => `
        + `import("@/components/ui/offline-banner").then((m) => m.OfflineBanner).catch(nothingIfLost));${LF}`),
      SHELL, (s) => s.replace(`import { OfflineBanner } from "@/components/ui/offline-banner";`, "").replace("<OfflineBanner />", "<LazyOfflineBanner />"));
    const extraDynamic = withFile(WORLD, SHELL_LAZY,
      (s) => `${s}${LF}const Extra = dynamic(() => import("@/components/ui/offline-banner").then((m) => m.OfflineBanner));${LF}`);
    const footerLoadsPart = withFile(WORLD, FOOTER, (s) => `${s}${LF}import { ConsentPrompt } from "@/components/analytics/consent-prompt";${LF}`);
    const guardSwallows = withFile(WORLD, SHELL_LAZY, (s) => s.replace(`if (!(error instanceof Error) || error.name !== "ChunkLoadError") throw error;`, ""));
    const guardDropped = withFile(WORLD, SHELL_LAZY, (s) => s.replace(".then((m) => m.ConsentPrompt).catch(nothingIfLost));", ".then((m) => m.ConsentPrompt));"));
    // §10 — the header-fit gate's terms: the drives' copy of the pill rule, the red twin's leash, a witness left behind.
    const withExtra = (rel: string, edit: (s: string) => string): World =>
      ({ ...WORLD, extra: new Map<string, string>([...WORLD.extra, [rel, edit(WORLD.extra.get(rel) ?? "")] as [string, string]]) });
    const extraChanged = (w: World, rel: string) => w.extra.get(rel) !== WORLD.extra.get(rel);
    const twinUnleashed = withExtra(RED_TWIN, (s) => s.replace(ALONE_REFUSAL, "if (false) die("));
    const scriptSaysAlone = withExtra(PACKAGE, (s) => s.replace(`"node ${RED_TWIN}"`, `"node ${RED_TWIN} --alone"`));
    const redAllUnmarked = withExtra(RED_ALL, (s) => s.replace(RED_ALL_MARK, 'KP_RED_ALL_OFF: "1"'));
    const twinIgnoresMark = withExtra(RED_TWIN, (s) => s.replace(RED_ALL_REFUSAL, "if (false) die("));
    const witnessLeft = withCss((s) => `${s}${LF}.kp-jhdr__plus { ${WITNESS_PROPERTY}: plus-shows-below-360; }${LF}`);
    const onDeposit = { isAuthed: true, balance: 0, walletHeld: false, onBreak: false, pathname: "/wallet/deposit" };
    const withRecord = (edit: (s: string) => string): World => ({ ...WORLD, popupFit: edit(WORLD.popupFit) });
    const sheetUnreviewed = withRecord((s) => s.replace(`"${GUEST_SHEET}",`, ""));
    /**
     * WP5's sign-out row, the hub's ConfirmDialog: the second journey popup on popup-fit's record (A13). Named rather
     * than searched for, so a rename fails here, at its path. ⛔ S6 applies WP5 before WP6a; without it, this cannot land.
     */
    const SIGN_OUT_ROW = "src/components/journey/account/sign-out-row.tsx";
    const signOutUnreviewed = withRecord((s) => s.replace(`"${SIGN_OUT_ROW}",`, ""));
    /** Two pollers on a desktop: the dot keeps polling where the bell already does. */
    const bothOnDesktop: Impl["pollers"] = (lgUp) => ({ bell: lgUp === true, dot: lgUp !== false });
    /** A server that claims a desktop: the hydration mounts the bell everywhere, and a phone's dot after it. */
    const serverSaysDesktop: Impl["lgUp"] = { ...REAL.lgUp, serverSnapshot: () => true };
    /** A width store that never lets go: every bar and rail that ever mounted keeps listening, and keeps re-rendering. */
    const clingsOn: Impl["lgUp"] = { ...REAL.lgUp, subscribe: (onChange) => { POLL.subscribeLgUp(onChange); return () => {}; } };
    const clingsLanded = withStandInMedia(false, (media) => { clingsOn.subscribe(() => {})(); return media.listening() === 1; });

    type Plant = { name: string; expect: RegExp; impl?: Partial<Impl>; world?: World; landed: boolean; landedAs: string };
    const plants: Plant[] = [
      // §1 — the tabs
      { name: "/updown/history maps to Juu/Chini — its row moved below /updown", expect: at("1.route./updown/history ·"),
        impl: fromRows(historyBelow), landed: TAB.tabRouteIn(historyBelow, "/updown/history")?.tab === "updown",
        landedAs: "the game's row claims the tickets page" },
      { name: "/account is left unmapped", expect: at("1.roundtrip.account ·"),
        impl: fromRows(noAccount), landed: TAB.tabRouteIn(noAccount, "/account") === null, landedAs: "the hub's own href lights nothing" },
      { name: "a hub route returns null", expect: at("1.route./results ·"),
        impl: { activeTab: hubNull }, landed: hubNull("/results") === null, landedAs: "Matokeo lights no tab" },
      { name: "the opt-out row matched as a bare prefix (A18: /settings is claimed)", expect: at("1.segment./settings ·"),
        impl: { routeFor: bareS, activeTab: (p) => bareS(p)?.tab ?? null }, landed: bareS("/settings") === sRow,
        landedAs: "a future /settings would belong to the opt-out row" },
      { name: "aria-current page for section membership (A12)", expect: at("1.aria."),
        impl: { ariaCurrent: pageForSection }, landed: pageForSection("/markets", "questions") === "page",
        landedAs: "the board announces Maswali as the current page" },
      { name: "a second resolver, written beside the classic rail", expect: at("1.one.definer ·"),
        world: secondResolver, landed: changed(secondResolver, BOTTOM_NAV), landedAs: "bottom-nav.tsx defines activeTabFor" },
      { name: "a new route ships with no tab decision", expect: at("1.census ·"),
        world: newRoute, landed: !("/brand-new" in EXPECTED), landedAs: "/brand-new is on disk with nothing decided" },
      { name: "the /account page is on disk and an AHEAD_OF_DISK exemption for it stays", expect: at("1.census.ahead ·"),
        world: accountLands, landed: WORLD.routes.includes("/account") && !AHEAD_OF_DISK.has("/account"),
        landedAs: "an exemption outlives the reason for it" },
      { name: "the tabs leave the deck's order", expect: at("1.tabs ·"),
        impl: { tabs: outOfOrder }, landed: outOfOrder[1].key === "tickets", landedAs: "Tiketi zangu sits second on the rail" },
      { name: "a tab names a glyph the set does not define", expect: at("1.glyphs ·"),
        impl: { tabs: ghostGlyph }, landed: !WORLD.glyphs.includes("\n  tickets: (p: GlyphProps)"), landedAs: "the rail draws an empty icon" },
      { name: "the exported guard ignores the dictionaries", expect: at("1.guard.c ·"),
        impl: { tabKeys: guardIgnoresDicts }, landed: guardIgnoresDicts({ xx: {} }).length === 0,
        landedAs: "a label missing in a language passes the guard" },
      // §2 — the surfaces and what each module loads
      { name: "isJourneySurface prefix-matches /markets", expect: at("2.deny./markets ·"),
        impl: { journeySurface: prefixMarkets }, landed: prefixMarkets("/markets"), landedAs: "the board loses its overlays" },
      { name: "isJourneySurface drops /", expect: at("2.allow./ ·"),
        impl: { journeySurface: dropsHome }, landed: !dropsHome("/"), landedAs: "the home board keeps every overlay for a journey viewer" },
      { name: "the commit gate forgets Up & Down rounds", expect: at("2.golden./updown/udr_1 ·"),
        impl: { commitSurface: forgetsRounds }, landed: !forgetsRounds("/updown/udr_1"), landedAs: "an invitation may sit on a round's commit" },
      { name: "surfaces.ts gains an import", expect: at(`2.pure.${SURFACES} ·`),
        world: surfacesImport, landed: changed(surfacesImport, SURFACES), landedAs: "the pure predicates now pull in a module" },
      { name: "active-tab.ts gains a client directive", expect: at(`2.pure.${HOME} ·`),
        world: tabsClient, landed: changed(tabsClient, HOME), landedAs: "the hub, a server page, can no longer share the table" },
      { name: "viewer-doors.ts reads the proposals config itself", expect: at(`2.pure.${DOORS_HOME} ·`),
        world: doorsRead, landed: changed(doorsRead, DOORS_HOME), landedAs: "a door decided by a read the caller did not make" },
      { name: "isMoneySurface loses its export (the red:install-invite anchor)", expect: at("2.anchor ·"),
        world: anchorLost, landed: !anchorLost.surfacesRaw.includes("export function isMoneySurface("), landedAs: "red:install-invite can no longer find its line" },
      // §3 — the header
      { name: "the pill shows during a break", expect: at("3.break ·"),
        impl: { header: pillOnBreak }, landed: pillOnBreak({ ...SIGNED_IN, onBreak: true }).pill, landedAs: "+ Weka pesa offered to a player on a break" },
      { name: "the pill shows for a held wallet", expect: at("3.held ·"),
        impl: { header: pillWhenHeld }, landed: pillWhenHeld({ ...SIGNED_IN, walletHeld: true }).pill, landedAs: "a door the deposit screen refuses" },
      { name: "the capsule hides at zero", expect: at("3.zero ·"),
        impl: { header: hidesAtZero }, landed: hidesAtZero({ ...SIGNED_IN, balance: 0 }).capsule === "none", landedAs: "a player at TZS 0 sees no balance" },
      { name: "the pill shows on the deposit screen", expect: at("3.deposit ·"),
        impl: { header: pillOnDeposit }, landed: pillOnDeposit({ ...SIGNED_IN, pathname: "/wallet/deposit" }).pill,
        landedAs: "a button to the page the player is already on" },
      // §4 — the doors
      { name: "the agent door loses its standing clause", expect: at("4.agent.standing ·"),
        impl: { doors: doorNoStanding }, landed: !doorNoStanding(agentStanding).agentDoorVisible, landedAs: "an approved agent loses the door when the programme closes" },
      { name: "staffConsole uses ADMIN_CONSOLE_ROLES", expect: at("4.staff.SUPPORT ·"),
        impl: { doors: consoleTier }, landed: !consoleTier({ ...OPEN, inviteViewer: viewer("SUPPORT", false, false), role: "SUPPORT" }).staffConsole,
        landedAs: "SUPPORT has no console link (SJ-23 says every staff role)" },
      { name: "app-shell's invite door drifts from the shared formula", expect: at("4.shell.invite ·"),
        world: inviteDrift, landed: changed(inviteDrift, SHELL), landedAs: "the classic shell stops asking inviteIsLiveFor" },
      { name: "app-shell's paid half drifts from the shared formula", expect: at("4.shell.paid ·"),
        world: paidDrift, landed: changed(paidDrift, SHELL), landedAs: "the classic shell drops the agent's standing" },
      { name: "app-shell's agent door drifts from the shared formula", expect: at("4.shell.agent ·"),
        world: agentDrift, landed: changed(agentDrift, SHELL), landedAs: "the classic shell drops the standing clause" },
      { name: "the classic chrome's proposals rule drifts", expect: at("4.shell.proposals ·"),
        world: chromeDrift, landed: changed(chromeDrift, "src/components/layout/top-app-bar.tsx"), landedAs: "the top bar hides proposals in COMING_SOON" },
      { name: "a client file imports viewer-doors.ts", expect: at("4.server.only ·"),
        world: doorsInClient, landed: changed(doorsInClient, BOTTOM_NAV), landedAs: "the browser answers Invite without FEATURE_INVITE" },
      { name: "a client file reaches viewer-doors.ts two hops away", expect: at("4.server.only ·"),
        world: doorsTwoHops, landed: changed(doorsTwoHops, DOORS_HELPER) && changed(doorsTwoHops, BOTTOM_NAV),
        landedAs: "a directive-less helper carries the doors into the bundle" },
      // §5 — the flag
      { name: "a server file imports journey-on.ts", expect: at("5.importers ·"),
        world: serverImporter, landed: changed(serverImporter, SHELL), landedAs: "AppShell (a server component) imports the hook" },
      { name: "a server file loads journey-on.ts two hops away", expect: at("5.importers ·"),
        world: serverTwoHops, landed: changed(serverTwoHops, FLAG_HELPER) && changed(serverTwoHops, SHELL),
        landedAs: "a directive-less hook module, loaded by AppShell" },
      { name: "the server snapshot answers true", expect: at("5.server ·"),
        impl: { flag: { ...REAL.flag, serverSnapshot: () => true } }, landed: true, landedAs: "every server render would stand the overlays down" },
      { name: "the flag stays up after its cleanup", expect: at("5.cleanup ·"),
        impl: { flag: { ...REAL.flag, raise: stuckUp } },
        landed: withStandInDom(() => { stuckUp()(); return FLAG.journeyFlagSnapshot(); }),
        landedAs: "an Owner Stop leaves the overlays down until a reload" },
      { name: "journey-on.ts gains a client directive", expect: at("5.nodirective ·"),
        world: flagClient, landed: changed(flagClient, FLAG_HOME), landedAs: "the hook module turns into a client boundary" },
      { name: "JourneyFlag's effect loses its cleanup", expect: at("5.component ·"),
        world: flagNoCleanup, landed: changed(flagNoCleanup, FLAG_COMPONENT), landedAs: "unmounting leaves data-journey on the page" },
      { name: "JourneyFlag mounted for everyone", expect: at("5.mount ·"),
        world: mountedForAll, landed: changed(mountedForAll, SHELL), landedAs: "a classic page carries data-journey" },
      { name: "the snapshot ignores the shell's mark", expect: at("5.mark ·"),
        impl: { flag: { ...REAL.flag, snapshot: markIgnored } }, landed: true,
        landedAs: "the Needle draws for a few frames on every journey page's first load, until the lazy flag lands (the WP7 drive's finding)" },
      { name: "the shell's mark written for every request", expect: at("5.mark.mount ·"),
        world: markForEveryone, landed: changed(markForEveryone, SHELL), landedAs: "every classic page carries the mark, and loses its overlays on the journey's pages" },
      { name: "shell-mark.ts gains a client directive", expect: at("5.mark.pure ·"),
        world: markClient, landed: changed(markClient, MARK_HOME), landedAs: "the server shell loads a client boundary for one string" },
      // §11 — the overlays (WP7), listed beside §5 whose flag they read; the first is 5.mount's own WP7 shape.
      { name: "the journey flag mounted for every request (WP7)", expect: at("5.mount ·"),
        world: flagForEveryone, landed: changed(flagForEveryone, SHELL), landedAs: "every classic page carries data-journey, and loses its overlays on the journey's pages" },
      { name: "the Needle stands down on a journey page for every reader", expect: at("11.needle ·"),
        world: needleForAll, landed: changed(needleForAll, OVERLAY_NEEDLE), landedAs: "a classic player's Needle gone from the home board" },
      { name: "the Needle's gate forgets the flag in its dependencies", expect: at("11.needle.deps ·"),
        world: needleDepsStale, landed: changed(needleDepsStale, OVERLAY_NEEDLE), landedAs: "the Needle stays up after the flag rises, until the next navigation" },
      { name: "the channels panel's eligibility drops the journey term", expect: at("11.channels.eligible ·"),
        world: panelEligibleAnyway, landed: changed(panelEligibleAnyway, OVERLAY_CHANNELS), landedAs: "the panel takes its corner on the home board for a journey viewer" },
      { name: "the channels panel's render guard drops the journey term", expect: at("11.channels.render ·"),
        world: panelRendersAnyway, landed: changed(panelRendersAnyway, OVERLAY_CHANNELS), landedAs: "a panel already on screen follows a journey viewer onto the home board" },
      { name: "the channels panel's term covers every page", expect: at("11.channels.term ·"),
        world: panelHiddenEverywhere, landed: changed(panelHiddenEverywhere, OVERLAY_CHANNELS), landedAs: "a journey viewer never meets the channels anywhere" },
      { name: "the channels panel reads the flag's attribute during render", expect: at("11.reads.channels ·"),
        world: panelReadsAttribute, landed: changed(panelReadsAttribute, OVERLAY_CHANNELS), landedAs: "a hydration mismatch, and a panel deaf to the flag going up or down" },
      { name: "the chat bubble stands down on a journey page for every reader", expect: at("11.chat ·"),
        world: chatForAll, landed: changed(chatForAll, OVERLAY_CHAT), landedAs: "a classic player's chat gone from the home board" },
      { name: "the chat clears the conversation on a journey page", expect: at("11.chat.history ·"),
        world: chatClearsHistory, landed: changed(chatClearsHistory, OVERLAY_CHAT), landedAs: "a journey viewer's conversation wiped by one tap on Maswali" },
      { name: "the chat's HIDE_ON widened", expect: at("11.hideon.chat ·"),
        world: chatHideWidened, landed: changed(chatHideWidened, OVERLAY_CHAT), landedAs: "the bubble gone from the board for every reader, and the opt-out gate's pattern moved" },
      { name: "the channels panel's HIDE_ON widened", expect: at("11.hideon.channels ·"),
        world: panelHideWidened, landed: changed(panelHideWidened, OVERLAY_CHANNELS), landedAs: "the panel gone from the help page for every reader" },
      { name: "the analytics consent prompt withheld from journey viewers", expect: at("11.consent ·"),
        world: consentForClassicOnly, landed: changed(consentForClassicOnly, SHELL), landedAs: "a preview viewer can never answer the analytics question" },
      { name: "the email-verify bar shown to journey viewers", expect: at("11.emailbar ·"),
        world: emailBarForAll, landed: changed(emailBarForAll, SHELL), landedAs: "the bar on every journey page (VODACOM-PLAN §3.2 item 2)" },
      { name: "AppShell imports the flag eagerly", expect: at("11.flag.lazy ·"),
        world: flagEager, landed: changed(flagEager, SHELL), landedAs: "every classic visitor's first load carries the journey flag" },
      { name: "a classic layout component loads the flag", expect: at("11.flag.lazy ·"),
        world: flagInClassic, landed: changed(flagInClassic, BOTTOM_NAV), landedAs: "the flag's code rides in the classic rail" },
      // §6 — the unread count
      { name: "a store that keeps the last viewer's count across a sign-in (critic G1)", expect: at("6.viewer."),
        impl: { unread: { ...REAL.unread, feed: stickyFeed } }, landed: stickyKeeps, landedAs: "B's dot shows A's count until B's first answer lands" },
      { name: "the switch never stops the last viewer's poll", expect: at("6.viewer."),
        impl: { unread: { ...REAL.unread, feed: leakyFeed } }, landed: leakKeepsPolling, landedAs: "A's poll beats on, and its answers land, after A has gone" },
      { name: "the gate shows whatever was read last, to whoever asks", expect: at("6.gate ·"),
        impl: { unread: { ...REAL.unread, shownFor: anyViewer } }, landed: anyViewer("B", { viewer: "A", unread: 7 }) === 7,
        landedAs: "B is shown A's count" },
      { name: "an interval in the hub's mode", expect: at("6.once.nointerval ·"),
        impl: { unread: { ...REAL.unread, feed: hubPolls } }, landed: hubBeats, landedAs: "the Arifa row polls beside the dot and the bell" },
      { name: "the hub's row reads on every pushed arrival (A1: an inbox change only)", expect: at("6.once.arrived ·"),
        impl: { unread: { ...REAL.unread, feed: rowHearsArrivals } }, landed: rowHears, landedAs: "a request per notification while Akaunti is open" },
      { name: "a guest polls", expect: at("6.guest."),
        impl: { unread: { ...REAL.unread, feed: guestPolls } }, landed: guestReads, landedAs: "a signed-out visitor sends the bell's request every 30 s" },
      { name: "the counter polls a hidden tab", expect: at("6.poll.hidden ·"),
        impl: { unread: { ...REAL.unread, feed: blindToHidden } }, landed: hiddenPolled, landedAs: "a phone in a pocket wakes its radio every 30 s" },
      { name: "the jitter is dropped", expect: at("6.poll.jitter ·"),
        impl: { unread: { ...REAL.unread, feed: noJitter } }, landed: jitterGone,
        landedAs: "every tab that lost the server on a deploy comes back on the same beat" },
      { name: "a failed read is retried sooner than the cadence allows", expect: at("6.poll.fail ·"),
        impl: { unread: { ...REAL.unread, feed: undercuts } }, landed: retriesSoon, landedAs: "a retry storm against a server that is starting up" },
      { name: "the hook keeps its first viewer for life", expect: at("6.hook.viewer ·"),
        world: hookForgetsViewer, landed: changed(hookForgetsViewer, UNREAD_HOOK), landedAs: "a sign-in on a shared phone keeps reading for the last player" },
      { name: "the hook counts the capped list, not the server's total", expect: at("6.hook.read ·"),
        world: hookCountsList, landed: changed(hookCountsList, UNREAD_HOOK), landedAs: "40 unread shown as 30 — the bell's own 2026-08-22 defect" },
      { name: "the hook loses its client directive", expect: at("6.hook.client ·"),
        world: hookLosesDirective, landed: changed(hookLosesDirective, UNREAD_HOOK), landedAs: "the hook's file stops declaring the browser it runs in" },
      { name: "an interval in the hook", expect: at("6.nointerval ·"),
        world: hookInterval, landed: changed(hookInterval, UNREAD_HOOK), landedAs: "a beat that stacks requests on a slow radio" },
      { name: "the counter loads a module", expect: at(`2.pure.${UNREAD_HOME} ·`),
        world: counterImports, landed: changed(counterImports, UNREAD_HOME), landedAs: "the pure rule reaches for the world" },
      { name: "a server file loads the hook", expect: at("6.mount ·"),
        world: shellLoadsHook, landed: changed(shellLoadsHook, SHELL), landedAs: "AppShell calls a hook: a build that never renders" },
      { name: "the classic bell loads the journey's hook", expect: at("6.bell.apart ·"),
        world: bellLoadsHook, landed: changed(bellLoadsHook, BELL), landedAs: "every live player's bell moves onto the journey's counter" },
      { name: "the bell's cadence moves and the counter keeps the old one", expect: at("6.cadence ·"),
        world: bellRetimed, landed: changed(bellRetimed, BELL), landedAs: "the dot and the bell beat at two rates" },
      { name: "the bell renames its arrival broadcast and the counter keeps the old name", expect: at("6.events ·"),
        world: bellRenamed, landed: changed(bellRenamed, BELL), landedAs: "the dot listens for a broadcast the bell no longer hears" },
      // §7 — the header (WP6a): one plant per S4 rule, then the bar's markup
      { name: "the + shows below 360", expect: at("7.plus ·"),
        world: plusAt320, landed: cssChanged(plusAt320), landedAs: "the 320 row carries the glyph S4 measured it could not afford" },
      { name: "a 16px gutter below 360", expect: at("7.gutter ·"),
        world: gutter16, landed: cssChanged(gutter16), landedAs: "8px of the 320 row's slack gone to its edges" },
      { name: "a 14px figure below 360", expect: at("7.figure ·"),
        world: figure14, landed: cssChanged(figure14), landedAs: "TZS 999,999 two characters wider at 320" },
      { name: "the gap becomes 8px", expect: at("7.gap ·"),
        world: gap8, landed: cssChanged(gap8), landedAs: "every gap 2px wider than the row was measured with" },
      { name: "the cluster's gap becomes 4px", expect: at("7.gap ·"),
        world: clusterGap4, landed: cssChanged(clusterGap4), landedAs: "the capsule and the pill closer than the row was measured with" },
      { name: "the row keeps its phone gap from 640", expect: at("7.steps ·"),
        world: flatFrom640, landed: cssChanged(flatFrom640), landedAs: "a desktop header 6px between groups the classic bar spaces 20px apart" },
      { name: "the classic bar moves its gutter and the journey keeps the old one", expect: at("7.steps ·"),
        world: classicGutterMoves, landed: changed(classicGutterMoves, CLASSIC_BAR), landedAs: "two bars, one product, two gutters" },
      { name: "the home link loses its negative margin", expect: at("7.home ·"),
        world: homeFlush, landed: cssChanged(homeFlush), landedAs: "the 44px link takes 18px of the row it was lent" },
      { name: "the guest pills pad 20px", expect: at("7.auth ·"),
        world: authPad20, landed: cssChanged(authPad20), landedAs: "Ingia and Jisajili 12px wider at 320 (E-276 measured them at the edge)" },
      { name: "the pill keeps the kit button's 16px padding below 360", expect: at("7.pill ·"),
        world: pillPad16, landed: cssChanged(pillPad16), landedAs: "+ Weka pesa 8px wider on the narrowest phone" },
      { name: "the lockup returns at 1024", expect: at("7.brand ·"),
        world: lockupAtLg, landed: changed(lockupAtLg, JHDR), landedAs: "136px of wordmark in the band where the classic bar lost its account menu (E-190)" },
      { name: "the journey header is not sticky (A13)", expect: at("7.stack ·"),
        world: headerNotSticky, landed: changed(headerNotSticky, JHDR), landedAs: "the header scrolls away, and the language menu is sealed in nothing" },
      { name: "a desktop destination says page for its whole section (A12)", expect: at("7.desktop ·"),
        world: sectionSaysPage, landed: changed(sectionSaysPage, JHDR), landedAs: "Matokeo announced as the Akaunti page" },
      { name: "the language menu shows on a phone", expect: at("7.cluster ·"),
        world: languageOnPhones, landed: changed(languageOnPhones, JHDR), landedAs: "a 44px control the 320 row has no room for" },
      { name: "a phone-only max-width rule in the shell", expect: at("7.first ·"),
        world: phoneOnlyRule, landed: cssChanged(phoneOnlyRule), landedAs: "a rule below 360 the density contract would have to fence" },
      { name: "a phone-only max-width rule in the shell, written across lines", expect: at("7.first ·"),
        world: phoneOnlyBlock, landed: cssChanged(phoneOnlyBlock), landedAs: "the same rule, in the shape a one-line reader cannot see" },
      { name: "the pill follows the session, not the header state", expect: at("7.state ·"),
        world: pillForAnyPlayer, landed: changed(pillForAnyPlayer, JHDR), landedAs: "+ Weka pesa offered on a break, to a held wallet and on the deposit screen itself" },
      { name: "the desktop destinations wear the filter pill's fill", expect: at("7.underline ·"),
        world: pillFill, landed: cssChanged(pillFill), landedAs: "the capsule language on a section link (§0h point 7)" },
      { name: "an inline height on the header", expect: at("7.frame ·"),
        world: inlineHeight, landed: changed(inlineHeight, JHDR), landedAs: "the canvas's 64px, typed where no probe can tell it from a decision" },
      // §8 — the tabs, the pollers, the guest sheet (WP6a; A13's four named plants among them)
      { name: "the journey tabs at z-30 (A13)", expect: at("8.stack ·"),
        world: tabsAt30, landed: changed(tabsAt30, JTABS), landedAs: "the rail level with its own header" },
      { name: "More comes back to the rail", expect: at("8.tabs ·"),
        world: moreReturns, landed: changed(moreReturns, JTABS), landedAs: "a fifth slot SJ-16 removed" },
      { name: "the grid goes on the nav, not the list (A18)", expect: at("8.grid ·"),
        world: gridOnNav, landed: cssChanged(gridOnNav), landedAs: "four tabs in one grid cell" },
      { name: "a tab says page for its whole section (A12)", expect: at("8.aria ·"),
        world: railSaysPage, landed: changed(railSaysPage, JTABS), landedAs: "the board announces Maswali as the current page" },
      { name: "a tab link gets an aria-label", expect: at("8.name ·"),
        world: accountNamed, landed: changed(accountNamed, JTABS), landedAs: "the Akaunti tab's unread words drop out of its name" },
      { name: "a guest's Tiketi zangu is a link whose navigation is cancelled", expect: at("8.guest ·"),
        world: guestCancelled, landed: changed(guestCancelled, JTABS), landedAs: "an 8 s phantom progress bar on every guest tap" },
      { name: "Tiketi zangu ellipsises at 320 (A17)", expect: at("8.label ·"),
        world: labelEllipsis, landed: cssChanged(labelEllipsis), landedAs: "the rail reads Tiketi zan… on a 320 phone" },
      { name: "the unread dot loses its cut-out", expect: at("8.badge ·"),
        world: badgeBare, landed: cssChanged(badgeBare), landedAs: "an 8px dot lost against the glyph under it" },
      { name: "the journey's slots centre below 360", expect: at("8.align ·"),
        world: pipsLifted, landed: cssChanged(pipsLifted), landedAs: "on a 320 phone in Swahili the Tiketi pip sits 6px above the other three" },
      { name: "the unread dot shows at a count of zero", expect: at("8.dot ·"),
        world: dotAlways, landed: changed(dotAlways, JTABS), landedAs: "every signed-in player's Akaunti tab marked unread, always" },
      { name: "two unread pollers on a desktop", expect: at("8.poll ·"),
        impl: { pollers: bothOnDesktop }, landed: bothOnDesktop(true).bell && bothOnDesktop(true).dot,
        landedAs: "the bell and the dot both ask every 30 s for one number" },
      { name: "the server claims a desktop", expect: at("8.poll.hook ·"),
        impl: { lgUp: serverSaysDesktop }, landed: serverSaysDesktop.serverSnapshot() === true,
        landedAs: "every hydration mounts the bell, and a phone's dot after it" },
      { name: "the width store never lets go", expect: at("8.poll.media ·"),
        impl: { lgUp: clingsOn }, landed: clingsLanded, landedAs: "every bar and rail that ever mounted keeps listening to the media query" },
      { name: "a server file loads the width hook", expect: at("8.poll.loaders ·"),
        world: serverLoadsPoller, landed: changed(serverLoadsPoller, SHELL), landedAs: "AppShell calls a hook: a build that never renders" },
      { name: "a server file loads the width hook through a helper", expect: at("8.poll.loaders ·"),
        world: pollerTwoHops, landed: changed(pollerTwoHops, SHELL) && pollerTwoHops.files.has(POLLER_HELPER),
        landedAs: "the same, one hop away, where a first-importer check stops looking" },
      { name: "the bell is mounted at every width, merely hidden on a phone", expect: at("8.poll.bar ·"),
        world: bellEverywhere, landed: changed(bellEverywhere, JHDR), landedAs: "a hidden bell polling beside the rail's dot" },
      { name: "the dot's counter is mounted at every width", expect: at("8.poll.rail ·"),
        world: dotOnDesktop, landed: changed(dotOnDesktop, JTABS), landedAs: "a hidden rail polling beside the desktop bell" },
      { name: "the guest sheet hand-rolled, unportaled (A13)", expect: at("8.sheet.portal ·"),
        world: sheetHandRolled, landed: changed(sheetHandRolled, GUEST_SHEET), landedAs: "a dialog sealed at the rail's rung, under the Needle" },
      { name: "the guest sheet's Jisajili forgets Tiketi zangu", expect: at("8.sheet ·"),
        world: sheetForgetsTickets, landed: changed(sheetForgetsTickets, GUEST_SHEET), landedAs: "a new player lands on the board, not on the tickets they asked for" },
      { name: "the guest sheet leaves popup-fit's review record", expect: at("8.popup ·"),
        world: sheetUnreviewed, landed: sheetUnreviewed.popupFit !== WORLD.popupFit, landedAs: "a popup no one has judged against Ali's rule" },
      { name: "the hub's sign-out row leaves popup-fit's review record (A13)", expect: at("8.popup ·"),
        world: signOutUnreviewed, landed: WORLD.files.has(SIGN_OUT_ROW) && signOutUnreviewed.popupFit !== WORLD.popupFit,
        landedAs: WORLD.files.has(SIGN_OUT_ROW)
          ? "a ConfirmDialog no one has judged against Ali's rule"
          : `${SIGN_OUT_ROW} is not in the tree: S6 applies WP5 (the hub) before WP6a` },
      { name: "a classic component mounts the journey rail", expect: at("8.mount ·"),
        world: classicMountsRail, landed: changed(classicMountsRail, BOTTOM_NAV), landedAs: "every classic page carries the journey's tabs" },
      // §9 — the route census (WP6b; A9's three named plants first)
      { name: "two pages that link only each other — an orphan cycle (A9)", expect: at("9.entrance./zz-orphan-a ·"),
        world: orphanCycle, landed: orphanCycle.routes.includes("/zz-orphan-a") && orphanCycle.routes.includes("/zz-orphan-b"),
        landedAs: "two pages that are each other's only door, and no reader reaches either" },
      { name: "the agent terms' doors survive only inside comments (A9)", expect: at("9.entrance./legal/agent-terms ·"),
        world: termsInComment, landed: changed(termsInComment, AGENT_PAGE) && changed(termsInComment, APPLY_CLIENT) && text(termsInComment, AGENT_PAGE).includes(TERMS),
        landedAs: "an href no reader can tap, counted as a door" },
      { name: "the agent terms lose their door (A9)", expect: at("9.entrance./legal/agent-terms ·"),
        world: termsGone, landed: !text(termsGone, AGENT_PAGE).includes(TERMS) && !text(termsGone, APPLY_CLIENT).includes(TERMS),
        landedAs: "an applicant can no longer read what they accept" },
      { name: "a page joins the population that nothing links", expect: at("9.entrance./zz-lonely ·"),
        world: lonely, landed: lonely.routes.includes("/zz-lonely"), landedAs: "a route with no entrance" },
      { name: "the Akaunti tab is removed", expect: at("9.entrance./account ·"),
        impl: { tabs: noAkaunti }, landed: noAkaunti.length === TAB.JOURNEY_TABS.length - 1,
        landedAs: "the hub, and every door only it holds, out of reach on a phone" },
      { name: "the hub loses its Arifa row", expect: at("9.subset.player ·"),
        impl: { hubRows: noArifa }, landed: hasRow(HUB.hubRowsFor(playerHub), "notifications") && !hasRow(noArifa(playerHub), "notifications"),
        landedAs: "a journey phone has no way to its notifications; the classic bell had one" },
      { name: "the hub loses its language control", expect: at("9.controls."),
        impl: { hubRows: noLanguage }, landed: !hasRow(noLanguage({ signedIn: false }), "language"),
        landedAs: "a journey phone cannot change its language" },
      { name: "the reset link's generator no longer names its page", expect: at("9.external./auth/reset-password ·"),
        world: resetUnnamed, landed: changed(resetUnnamed, RESET_LINK), landedAs: "an external entrance claimed for a page nothing sends anyone to" },
      { name: "a page links an external entrance, and its exemption stays", expect: at("9.external./auth/verify-email ·"),
        world: verifyLinked, landed: changed(verifyLinked, PROFILE_PAGE), landedAs: "an exemption that outlived its reason" },
      { name: "the classic bar gains a door the census does not hold", expect: at(`9.chrome.${TOP_BAR_FILE} ·`),
        world: barUnknownDoor, landed: changed(barUnknownDoor, TOP_BAR_FILE), landedAs: "a classic door the journey is never asked to keep" },
      { name: "the avatar menu loses a door the census still holds", expect: at(`9.chrome.${AVATAR_FILE} ·`),
        world: avatarLostKyc, landed: changed(avatarLostKyc, AVATAR_FILE) && !text(avatarLostKyc, AVATAR_FILE).includes(`"/profile/kyc"`),
        landedAs: "the journey measured against a classic menu that no longer exists" },
      { name: "the board's history link is removed — A15's classic door", expect: at(`9.pinned./updown/history · ${UPDOWN_PAGE}`),
        world: historyUnpinned, landed: changed(historyUnpinned, UPDOWN_PAGE), landedAs: "the board's door to the Up & Down tickets gone" },
      { name: "the classic Tiketi page's performance link is removed — A15's classic door", expect: at(`9.pinned./positions/performance · ${POSITIONS_PAGE}`),
        world: performanceUnpinned, landed: changed(performanceUnpinned, POSITIONS_PAGE), landedAs: "the classic page's door to the performance page gone" },
      { name: "the Tiketi switch loses its Juu/Chini door — A15's journey door (WP9)", expect: at(`9.pinned./updown/history · ${TICKET_SWITCH}`),
        world: switchUnpinned, landed: changed(switchUnpinned, TICKET_SWITCH), landedAs: "the switch's door to the Up & Down tickets gone" },
      { name: "the journey Tiketi view loses its Utendaji link — A15's journey door (WP9)", expect: at(`9.pinned./positions/performance · ${TICKETS_VIEW}`),
        world: utendajiUnpinned, landed: changed(utendajiUnpinned, TICKETS_VIEW), landedAs: "the view's door to the performance page gone" },
      // §8 · WP6b — the chrome mounted by AppShell alone, and lazily
      { name: "a page loads the journey header itself", expect: at("8.mount ·"),
        world: pageLoadsHeader, landed: changed(pageLoadsHeader, MARKETS_PAGE), landedAs: "a second mount of the journey chrome, outside the resolver's one decision" },
      { name: "AppShell imports the journey tabs statically", expect: at("8.mount.lazy ·"),
        world: shellStatic, landed: changed(shellStatic, SHELL), landedAs: "every classic visitor downloads the journey chrome's code" },
      // §12 · WP6c — the shell's deferred parts (the plan's four first)
      { name: "a React lazy binding put back in AppShell", expect: at("12.shell.nolazy ·"),
        world: lazyAgain, landed: changed(lazyAgain, SHELL), landedAs: "a part's code back in every page's first load (production, 2026-10-03)" },
      { name: "a part loads with ssr: false", expect: at("12.module.dynamic ·"),
        world: ssrOff, landed: changed(ssrOff, SHELL_LAZY), landedAs: "the part leaves the server's HTML, inside a Suspense boundary of next/dynamic's own" },
      { name: "AppShell imports a part straight from its own file", expect: at("12.shell.only ·"),
        world: shellDirect, landed: changed(shellDirect, SHELL), landedAs: "the channels panel back in every page's first load" },
      { name: "the shell's lazy module loses its client directive", expect: at("12.module.client ·"),
        world: moduleServer, landed: changed(moduleServer, SHELL_LAZY), landedAs: "next/dynamic in a server file: not the shape the production build proved" },
      { name: "a part passes a loading option", expect: at("12.module.dynamic ·"),
        world: loadingBox, landed: changed(loadingBox, SHELL_LAZY), landedAs: "a second Suspense boundary inside AppShell's: new markers in a journey page's HTML" },
      { name: "a part's own module loses its client directive", expect: at("12.parts.client ·"),
        world: partServer, landed: changed(partServer, PULL_TO_REFRESH), landedAs: "a module that does not declare itself client code, loaded as client code" },
      { name: "a server page loads a client part with React lazy", expect: at("12.nolazy.platform ·"),
        world: serverPageLazy, landed: changed(serverPageLazy, HELP_PAGE), landedAs: "the same first-load leak, from /help" },
      { name: "a part's binding loads another module", expect: at("12.parts.table ·"),
        world: partSwapped, landed: changed(partSwapped, SHELL_LAZY), landedAs: "the consent prompt's mount renders the install card" },
      { name: "a second file imports the shell's lazy module", expect: at("12.module.home ·"),
        world: secondHome, landed: changed(secondHome, HELP_PAGE), landedAs: "a shell part mounted outside the shell" },
      { name: "the shell's lazy module imports a part statically", expect: at("12.module.dynamic ·"),
        world: moduleStatic, landed: changed(moduleStatic, SHELL_LAZY), landedAs: "the journey rail back in every page's first load, through the module that keeps it out" },
      { name: "AppShell renders a lazy part the module does not declare", expect: at("12.shell.parts ·"),
        world: strayPart, landed: changed(strayPart, SHELL), landedAs: "a part declared somewhere other than the one module" },
      { name: "AppShell imports React lazy under another name", expect: at("12.shell.nolazy ·"),
        world: lazyRenamed, landed: changed(lazyRenamed, SHELL), landedAs: "the same React.lazy, out of the readers' sight by its name" },
      { name: "AppShell defers a client module with next/dynamic itself", expect: at("12.nodefer.platform ·"),
        world: shellDynamic, landed: changed(shellDynamic, SHELL), landedAs: "next/dynamic in a server file: the module back in every page's first load" },
      { name: "the root layout defers a client module with next/dynamic", expect: at("12.nodefer.platform ·"),
        world: layoutDynamic, landed: changed(layoutDynamic, ROOT_LAYOUT), landedAs: "the same leak, from the root layout" },
      { name: "a server page imports React lazy without calling it", expect: at("12.nolazy.platform ·"),
        world: pageImportsLazy, landed: changed(pageImportsLazy, HELP_PAGE), landedAs: "a server page set up to make the same mistake" },
      { name: "AppShell renders the channels panel outside its Suspense boundary", expect: at("12.shell.wrapped ·"),
        world: panelUnwrapped, landed: changed(panelUnwrapped, SHELL), landedAs: "the panel's boundary markers leave the HTML, and its chunk holds up the page's hydration" },
      { name: "AppShell renders the win celebration outside its Suspense boundary", expect: at("12.shell.wrapped ·"),
        world: winUnwrapped, landed: changed(winUnwrapped, SHELL), landedAs: "the same, for a one-line mount" },
      { name: "AppShell drops pull-to-refresh's three-line Suspense boundary", expect: at("12.shell.wrapped ·"),
        world: pullUnwrapped, landed: changed(pullUnwrapped, SHELL), landedAs: "the same, for a mount written over three lines" },
      { name: "AppShell renders a part twice", expect: at("12.shell.parts ·"),
        world: winTwice, landed: changed(winTwice, SHELL), landedAs: "two celebration hosts: one win, two seals" },
      { name: "the offline banner deferred like the parts", expect: at("12.shell.offline ·"),
        world: offlineDeferred, landed: changed(offlineDeferred, SHELL) && changed(offlineDeferred, SHELL_LAZY), landedAs: "the banner's code behind a fetch the dropped connection it reports on can stop" },
      { name: "the shell's lazy module declares a part outside the table", expect: at("12.module.dynamic ·"),
        world: extraDynamic, landed: changed(extraDynamic, SHELL_LAZY), landedAs: "a part no gate names" },
      { name: "a classic file imports a part's module statically", expect: at("12.parts.home ·"),
        world: footerLoadsPart, landed: changed(footerLoadsPart, FOOTER), landedAs: "the consent prompt back in every page's first load, through the footer" },
      { name: "the lost-chunk guard takes every error", expect: at("12.module.lost ·"),
        world: guardSwallows, landed: changed(guardSwallows, SHELL_LAZY), landedAs: "a part's render bug hidden as if its chunk were lost" },
      { name: "a part's loader drops the lost-chunk guard", expect: at("12.parts.table ·"),
        world: guardDropped, landed: changed(guardDropped, SHELL_LAZY), landedAs: "a dropped connection takes the whole page to the critical-error screen" },
      // §10 — the header-fit gate's terms (A5, A6)
      { name: "the header draws the pill on the deposit screen while the drives skip it there", expect: at("10.rules.pill ·"),
        impl: { header: pillOnDeposit }, landed: pillOnDeposit(onDeposit).pill && !HDR.journeyHeaderState(onDeposit).pill,
        landedAs: "a rule the drives no longer ask where the header draws its element" },
      { name: "the header-fit red twin starts without --alone", expect: at("10.leash.alone ·"),
        world: twinUnleashed, landed: extraChanged(twinUnleashed, RED_TWIN), landedAs: "anything that runs the script rewrites the stylesheet unbidden" },
      { name: "the header-fit package script passes --alone itself", expect: at("10.leash.alone ·"),
        world: scriptSaysAlone, landed: extraChanged(scriptSaysAlone, PACKAGE), landedAs: "red:all runs the script as written, so it supplies the opt-in" },
      { name: "red:all stops marking the harnesses it starts", expect: at("10.leash.red-all ·"),
        world: redAllUnmarked, landed: extraChanged(redAllUnmarked, RED_ALL), landedAs: "the twin cannot tell red:all from a person" },
      { name: "the header-fit red twin ignores red:all's mark", expect: at("10.leash.red-all ·"),
        world: twinIgnoresMark, landed: extraChanged(twinIgnoresMark, RED_TWIN), landedAs: "a mutator under red:all's timeout, which on Windows outlives it" },
      { name: "a red run's witness is left in the stylesheet (a hard kill)", expect: at("10.leash.witness ·"),
        world: witnessLeft, landed: cssChanged(witnessLeft), landedAs: "a planted defect on its way into a commit" },
    ];

    let caught = 0;
    for (const p of plants) {
      ok(`PLANT LANDED · ${p.name}`, p.landed, p.landedAs);
      const r = await run({ ...REAL, ...(p.impl ?? {}) }, p.world ?? WORLD, quiet);
      const hit = r.failed.some((f) => p.expect.test(f));
      if (hit && p.landed) caught++;
      ok(`  └─ fires: ${p.expect.source}`, hit,
        r.failed.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${r.failed.slice(0, 2).join(" | ")}`);
    }

    console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? ` · all ${pass} proofs held` : ` · ${fail} of ${pass + fail} proofs FAILED`}\n`);
    process.exitCode = fail === 0 && caught === plants.length ? 0 : 1;
  }
}
