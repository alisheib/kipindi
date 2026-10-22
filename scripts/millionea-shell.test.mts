/**
 * test:millionea-shell — THE SHELL'S TWO MILLIONEA ANSWERS A PAGE CANNOT GIVE ITSELF (MASWALI-BUILD S5-FIX-PLATFORM D12, D13;
 * 2026-10-21).
 *
 *   npx tsx scripts/millionea-shell.test.mts     (npm run test:millionea-shell)
 *
 * §1 D12 · MILLIONEA'S STAFF PREVIEW IS ONE BAR ABOVE THE PAGE. S5 drew a callout inside each Millionea page's column; the
 *    platform's preview marker is the journey's: the kit's info NoticeBar with the eye, first under the header. Held here:
 *    `MillioneaPreviewMark` draws nothing (its nine page calls stay until round 2); `MillioneaPreviewBar` draws that marker
 *    on every Millionea page and on /results (whose section wore the callout) and on no other page, in sw, en and zh, with
 *    no exit (a role, not a pass); AppShell mounts it once, first under the journey's marker, only on the rollout's
 *    `preview` — which is true at STAFF_PREVIEW for stored staff alone (never WITHDRAWN, never ACTIVE, never a player).
 * §2 D13 · ON A BREAK, A MILLIONEA PAGE LIGHTS ONE CLASSIC DESTINATION, NEVER NONE. A reader on a break is offered no
 *    Millionea door, yet its pages still answer that reader; the classic bar and rail lit nothing there, where the journey
 *    falls back to Maswali. The classic navs, handed the break's answer, light what the journey's table names: Markets on
 *    every Millionea page, Positions on its tickets — exactly one item in the bar and one in the rail; without the answer
 *    (a dark address) nothing, as on an unknown address; and AppShell hands the answer to the classic navs alone, only
 *    while Millionea is visible and the reader is on a break.
 * §3 (S5 round 2) F10 · every programmatic move on a Millionea surface starts the platform's progress bar first.
 * §4 (S5 round 2) the main landmark's guest switch marks every signed-out reader, classic too; every rule keyed on it
 *    reaches only the journey's ghosts or Millionea's pages, so no classic page's rule changes.
 * §5 (S5 round 2) on a break the classic shell offers no deposit door: the rail's coin is the Wallet door (as for a held
 *    wallet), the bar's deposit pill and the balance capsule's Deposit are withheld; the break handed only while true.
 * Every check has a plant that must turn it red. The bar's look at 320 and 1280, a staff session on a running server,
 * is the lane's `s5fplt` drive (reported with the commit).
 */
import "next/dist/server/node-environment.js";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire, Module as NodeModule } from "node:module";
import { join } from "node:path";
import ts from "typescript";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(import.meta.dirname, "..");
const req = createRequire(import.meta.url);
const raw = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const squash = (s: string) => s.replace(/\s+/g, " ");
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s}`);

/** A module built from PLANTED source at its real path (so its own imports resolve as the real file's do). */
function fromSource<T>(rel: string, source: string): T {
  const file = join(ROOT, rel);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText;
  const m = new NodeModule(file) as NodeModule & { _compile: (code: string, filename: string) => void; paths: string[] };
  m.filename = file;
  m.paths = (NodeModule as unknown as { _nodeModulePaths: (d: string) => string[] })._nodeModulePaths(join(file, ".."));
  m._compile(js, file);
  return m.exports as T;
}
const plant = (src: string, from: string, to: string) => {
  if (!src.includes(from)) throw new Error(`plant did not apply: ${from.slice(0, 80)}`);
  return src.replace(from, to);
};

type Locale = "sw" | "en" | "zh";
const LOCALES: Locale[] = ["sw", "en", "zh"];
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Locale; children: unknown }) => unknown };
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Locale, { millionea: { previewMark: string } }> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const at = (el: unknown, path: string, l: Locale = "en") => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER },
  h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l }, el as never))));

/** Every Millionea page, and the pages that are not one (an unknown address, a look-alike, the hub's neighbours). */
const MLN_PAGES = ["/millionea", "/millionea/slip", "/millionea/how", "/millionea/register", "/millionea/register/MLN-2026-W42",
  "/millionea/tickets", "/millionea/tickets/MLN-2026-W42-000017", "/legal/rules/millionea"];
const OTHER_PAGES = ["/", "/markets", "/positions", "/results/notable", "/legal/rules", "/millioneas", "/kpzzzzzzz"];

/* ══ §1 · D12 · ONE PREVIEW BAR ABOVE THE PAGE ═══════════════════════════════════════════════════════════════════════════ */
section("1 · D12 · Millionea's staff preview is one bar above the page, the platform's marker, on its pages alone");
{
  const PARTS = "src/app/millionea/millionea-parts.tsx", BAR = "src/components/layout/millionea-preview-bar.tsx";
  type Mark = (p: { t: unknown }) => unknown;
  const markOut = (M: Mark) => LOCALES.map((l) => renderToStaticMarkup(h(M as never, { t: dict[l] } as never)));
  const realMark = (req(`../${PARTS}`) as { MillioneaPreviewMark: Mark }).MillioneaPreviewMark;
  ok("1.1 · `MillioneaPreviewMark` draws nothing, in sw, en and zh (the mark is the shell's bar now)", markOut(realMark).every((m) => m === ""), j(markOut(realMark)));
  const callSites = ["src/app/millionea/how/page.tsx", "src/app/millionea/page.tsx", "src/app/millionea/register/page.tsx", "src/app/millionea/register/[week]/page.tsx",
    "src/app/millionea/slip/page.tsx", "src/app/millionea/tickets/page.tsx", "src/app/millionea/tickets/[serial]/page.tsx", "src/app/results/millionea-results-view.tsx"];
  const calls = callSites.reduce((n, f) => n + count(decomment(raw(f)), "<MillioneaPreviewMark t={t} />"), 0);
  // Round 2 removes the calls lane by lane, each lane its own pages (S5-R2-SLIP the slip's two, S5-R2-TICKETS the tickets
  // pages' two, S5-R2-REGISTER How's and the register's three — "since D12's bar marks the page"), so the census holds a
  // CEILING — never more than the 9 D12 left — and none on a page whose lane has merged. Once every lane has merged it reads
  // 0 and the dead export goes (the lead's merge).
  const callsOn = (files: string[]) => files.reduce((n, f) => n + count(decomment(raw(f)), "MillioneaPreviewMark"), 0);
  const slipCalls = callsOn(["src/app/millionea/slip/page.tsx"]);
  const ticketsCalls = callsOn(["src/app/millionea/tickets/page.tsx", "src/app/millionea/tickets/[serial]/page.tsx"]);
  const REGISTER_HOW = ["src/app/millionea/how/page.tsx", "src/app/millionea/register/page.tsx", "src/app/millionea/register/[week]/page.tsx"];
  const markLeft = (src: (f: string) => string) => REGISTER_HOW.filter((f) => decomment(src(f)).includes("MillioneaPreviewMark"));
  ok(`1.1b · the pages keep at most their nine calls (${calls} now), round 2 removing them — the slip, the tickets pages, How and the register none`,
    calls <= 9 && slipCalls === 0 && ticketsCalls === 0 && markLeft(raw).length === 0, j({ calls, slip: slipCalls, tickets: ticketsCalls, left: markLeft(raw) }));
  ok("1.1b′ PLANT · a preview mark called again on the register's week page is reported",
    markLeft((f) => (f.endsWith("[week]/page.tsx") ? raw(f).replace("        <WeekCommitments ", "        {gate.preview && <MillioneaPreviewMark t={t} />}\n        <WeekCommitments ") : raw(f))).length === 1);
  const callout = fromSource<{ MillioneaPreviewMark: Mark }>(PARTS, plant(plant(raw(PARTS), "export function MillioneaPreviewMark(_props: { t: Dict }): null {\n  return null;\n}",
    'export function MillioneaPreviewMark({ t }: { t: Dict }) {\n  return <div data-testid="millionea-preview-mark"><Callout tone="info" glyph="eye" role="status">{t.millionea.previewMark}</Callout></div>;\n}'),
    'import { I } from "@/components/ui/glyphs";', 'import { I } from "@/components/ui/glyphs";\nimport { Callout } from "@/components/ui/callout";')).MillioneaPreviewMark;
  ok("1.1′ PLANT · S5's callout back in each page's column is reported", markOut(callout).every((m) => m.includes("millionea-preview-mark")));

  type Bar = (p: { label: string }) => unknown;
  const realBar = (req(`../${BAR}`) as { MillioneaPreviewBar: Bar }).MillioneaPreviewBar;
  const { NoticeBar } = req("../src/components/ui/notice-bar.tsx") as { NoticeBar: (p: Record<string, unknown>) => unknown };
  /** The journey's marker recipe with these words and no action: the kit's info bar, the eye in Fill. */
  const recipe = (l: Locale) => at(h(NoticeBar as never, { tone: "info", glyph: "eye", testId: "millionea-preview-mark", children: dict[l].millionea.previewMark } as never), "/", l);
  const barDefects = (B: Bar) => LOCALES.flatMap((l) => [
    ...[...MLN_PAGES, "/results"].filter((p) => at(h(B as never, { label: dict[l].millionea.previewMark } as never), p, l) !== recipe(l)).map((p) => `${l} ${p}: not the marker`),
    ...OTHER_PAGES.filter((p) => at(h(B as never, { label: dict[l].millionea.previewMark } as never), p, l) !== "").map((p) => `${l} ${p}: drawn`),
  ]);
  ok(`1.2 · the bar is the platform's marker (the journey's NoticeBar recipe, \`millionea-preview-mark\`, its words, no exit) on each of ${MLN_PAGES.length} Millionea pages and /results, and nothing on ${OTHER_PAGES.length} other pages, in sw, en and zh`,
    barDefects(realBar).length === 0 && !recipe("en").includes("/preview") && recipe("en").includes('role="status"'), j(barDefects(realBar)));
  const everywhere = fromSource<{ MillioneaPreviewBar: Bar }>(BAR, plant(raw(BAR), "  if (!millioneaPreviewPage(pathname)) return null;\n", "")).MillioneaPreviewBar;
  ok("1.2′ PLANT · the bar on every page (its page test dropped) is reported", barDefects(everywhere).some((d) => d.endsWith("drawn")));
  const onServer = fromSource<{ MillioneaPreviewBar: Bar }>(BAR, plant(raw(BAR), 'return typeof pathname === "string" && (isMillioneaPath(pathname) || pathname === "/results");',
    'return typeof pathname === "string" && isMillioneaPath(pathname);')).MillioneaPreviewBar;
  ok("1.2″ PLANT · /results left without its section's mark is reported", barDefects(onServer).some((d) => d.includes("/results: not the marker")));

  const SHELL = "src/components/layout/app-shell.tsx";
  const shellDefects = (src: string) => {
    const s = squash(decomment(src));
    const d: string[] = [];
    if (count(s, "const millioneaPreview = (await resolveMillionea()).preview;") !== 1) d.push("the bar is not mounted on the rollout's own preview answer");
    if (count(s, "<MillioneaPreviewBar ") !== 1 || !s.includes("{millioneaPreview && <MillioneaPreviewBar label={t.millionea.previewMark} />}")) d.push("the bar is not mounted once, on that answer, with the existing preview words");
    // First under the journey's marker: nothing but the (blanked) note between the two.
    const MARKER = "{journeyPreview && <PreviewMarker label={t.journey.previewMarker} exit={t.journey.previewExit} />}";
    const journeyMarker = s.indexOf(MARKER), bar = s.indexOf("{millioneaPreview && <MillioneaPreviewBar");
    if (journeyMarker < 0 || bar < journeyMarker || !/^(?:\s*\{\s*\})*\s*$/.test(s.slice(journeyMarker + MARKER.length, bar)))
      d.push("the bar does not stand first under the journey's marker");
    if (!s.includes('import { MillioneaPreviewBar } from "./millionea-preview-bar";')) d.push("the bar is not the shell's own part");
    return d;
  };
  ok("1.3 · AppShell mounts the bar once, first under the journey's marker (outside both shells' arms), on the rollout's `preview` alone, with the existing preview key", shellDefects(raw(SHELL)).length === 0, j(shellDefects(raw(SHELL))));
  ok("1.3′ PLANT · the bar mounted on `visible` (every ACTIVE reader would wear it) is reported",
    shellDefects(plant(raw(SHELL), "const millioneaPreview = (await resolveMillionea()).preview;", "const millioneaPreview = (await resolveMillionea()).visible;")).length > 0);
  const moved = plant(plant(raw(SHELL), "      {millioneaPreview && <MillioneaPreviewBar label={t.millionea.previewMark} />}\n", ""),
    "      <span hidden data-kp-funnel={funnelScopeValue} />\n", "      <span hidden data-kp-funnel={funnelScopeValue} />\n      {millioneaPreview && <MillioneaPreviewBar label={t.millionea.previewMark} />}\n");
  ok("1.3″ PLANT · the bar mounted anywhere but first under the journey's marker is reported", shellDefects(moved).some((x) => x.includes("first under")));

  // The answer the shell reads: true at STAFF_PREVIEW for stored staff on an open account, and for nobody else.
  const { resolveMillioneaFor } = req("../src/lib/server/millionea-preview.ts") as {
    resolveMillioneaFor: (i: { sessionUserId: string | null }, d: { findUser: (id: string) => Promise<{ role: string; status: string } | null>; stateNow: () => Promise<string> }) => Promise<{ visible: boolean; preview: boolean }>;
  };
  const viewers = { staff: { role: "ADMIN", status: "ACTIVE" }, player: { role: "PLAYER", status: "ACTIVE" }, closed: { role: "ADMIN", status: "SUSPENDED" } } as const;
  const grid: string[] = [];
  for (const state of ["WITHDRAWN", "STAFF_PREVIEW", "ACTIVE"]) for (const [who, row] of Object.entries(viewers)) for (const signedIn of [true, false]) {
    if (!signedIn && who !== "player") continue;
    const r = await resolveMillioneaFor({ sessionUserId: signedIn ? "u1" : null }, { findUser: async () => row, stateNow: async () => state });
    const want = state === "STAFF_PREVIEW" && signedIn && who === "staff";
    if (r.preview !== want) grid.push(`${state} ${signedIn ? who : "guest"}: preview ${r.preview}`);
  }
  ok("1.4 · the rollout's `preview` is true at STAFF_PREVIEW for stored staff alone — never WITHDRAWN, never ACTIVE, never a player, a guest or a closed staff account", grid.length === 0, j(grid));
}

/* ══ §2 · D13 · ONE LIT CLASSIC DESTINATION ON A BREAK ══════════════════════════════════════════════════════════════════ */
section("2 · D13 · on a break, a Millionea page lights one classic destination (the journey's fallback), never none");
{
  const TAB = req("../src/lib/nav/active-tab.ts") as { classicMillioneaStandIn: (p: string) => string | null };
  const want: Record<string, string | null> = {
    "/millionea": "/markets", "/millionea/slip": "/markets", "/millionea/how": "/markets", "/millionea/register": "/markets",
    "/millionea/register/MLN-2026-W42": "/markets", "/millionea/tickets": "/positions", "/millionea/tickets/MLN-2026-W42-000017": "/positions",
    "/legal/rules/millionea": null, "/millioneas": null, "/markets": null, "/": null, "/kpzzzzzzz": null,
  };
  const got = Object.fromEntries(Object.keys(want).map((p) => [p, TAB.classicMillioneaStandIn(p)]));
  ok("2.1 · the stand-in is the journey table's answer: Markets on every Millionea page (Maswali's fallback), Positions on its tickets (Tiketi zangu's), nothing off Millionea's pages",
    j(got) === j(want), j(got));

  type Nav = (p: Record<string, unknown>) => unknown;
  const BAR = "src/components/layout/top-app-bar.tsx", RAIL = "src/components/layout/bottom-nav.tsx";
  const realBar = (req(`../${BAR}`) as { TopAppBar: Nav }).TopAppBar, realRail = (req(`../${RAIL}`) as { BottomNav: Nav }).BottomNav;
  const user = { initials: "DP", name: "Demo Player", phone: "+255•••84", isAuthed: true, balance: 25_000 };
  /** What each classic nav lights on `path`: the bar's current links, the rail's lit slots (the coin and More included). */
  const lit = (Bar: Nav, Rail: Nav, path: string, props: Record<string, unknown>, l: Locale = "en") => {
    const bar = at(h(Bar as never, { user, proposalsState: "DISABLED", ...props } as never), path, l);
    const rail = at(h(Rail as never, { isAuthed: true, proposalsState: "DISABLED", ...props } as never), path, l);
    const barLit = [...bar.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]).filter((a) => a.includes('aria-current="page"')).map((a) => /href="([^"]+)"/.exec(a)?.[1] ?? "?");
    const railLit = [...rail.matchAll(/<(?:a|button)\b[^>]*data-on="1"[^>]*>/g)].map((m) => /href="([^"]+)"/.exec(m[0])?.[1] ?? "More");
    return { barLit, railLit };
  };
  const MLN = Object.keys(want).filter((p) => want[p] !== null);
  const breakDefects = (Bar: Nav, Rail: Nav) => LOCALES.flatMap((l) => MLN.flatMap((p) => {
    const { barLit, railLit } = lit(Bar, Rail, p, { millioneaOnBreak: true }, l);
    const railWant = want[p] === "/markets" ? "/markets" : "More";
    return [...(j(barLit) === j([want[p]]) ? [] : [`${l} ${p} bar ${j(barLit)}`]), ...(j(railLit) === j([railWant]) ? [] : [`${l} ${p} rail ${j(railLit)}`])];
  }));
  ok(`2.2 · on a break, each of ${MLN.length} Millionea pages lights exactly one item in the classic bar (Markets, or Positions on its tickets) and one in the classic rail (Markets, or More, whose Positions row it is), in sw, en and zh`,
    breakDefects(realBar, realRail).length === 0, j(breakDefects(realBar, realRail)));
  const darkDefects = (Bar: Nav, Rail: Nav) => [...MLN, "/kpzzzzzzz"].flatMap((p) => {
    const { barLit, railLit } = lit(Bar, Rail, p, {});
    return barLit.length + railLit.length === 0 ? [] : [`${p} ${j({ barLit, railLit })}`];
  });
  ok("2.3 · without the break's answer (Millionea hidden: a dark address) the classic navs light nothing on a Millionea address, as on an unknown one", darkDefects(realBar, realRail).length === 0, j(darkDefects(realBar, realRail)));
  const shownDefects = MLN.flatMap((p) => { const { barLit } = lit(realBar, realRail, p, { millionea: true }); return j(barLit) === j(["/millionea"]) ? [] : [`${p} ${j(barLit)}`]; });
  ok("2.3b · CONTROL · Millionea shown (no break): its own link is the one lit in the bar, as S5 drew it", shownDefects.length === 0, j(shownDefects));
  const noStandInBar = fromSource<{ TopAppBar: Nav }>(BAR, plant(raw(BAR), "  const lit = active || it.href === standIn;", "  const lit = active;")).TopAppBar;
  const noStandInRail = fromSource<{ BottomNav: Nav }>(RAIL, plant(raw(RAIL), "    if (href === standIn) return true;\n", "")).BottomNav;
  ok("2.2′ PLANT · the bar's stand-in dropped (nothing lit on a break, as before) is reported", breakDefects(noStandInBar, realRail).some((d) => d.includes(" bar []")));
  ok("2.2″ PLANT · the rail's stand-in dropped is reported", breakDefects(realBar, noStandInRail).some((d) => d.includes(" rail []")));

  const SHELL = "src/components/layout/app-shell.tsx";
  const wiring = (src: string) => {
    const s = squash(decomment(src));
    const d: string[] = [];
    if (count(s, "const millioneaBreakProp: { millioneaOnBreak?: true } = promoSuppressed && (await resolveMillionea()).visible ? { millioneaOnBreak: true } : {};") !== 1)
      d.push("the break's answer is not Millionea visible AND the reader on a break, handed only while true");
    if (count(s, "{...millioneaBreakProp}") !== 2 || !/<TopAppBar [^>]*\{\.\.\.millioneaBreakProp\} \/>/.test(s) || !/<BottomNav [^>]*\{\.\.\.millioneaBreakProp\} \/>/.test(s)) d.push("the classic bar and rail are not both handed the answer");
    if (/<LazyJourney\w+ [^>]*millioneaBreakProp/.test(s)) d.push("a journey nav is handed the classic answer");
    return d;
  };
  ok("2.4 · AppShell hands the answer to the classic bar and rail alone, only while Millionea is visible and the reader is on a break (no other reader's payload changes)", wiring(raw(SHELL)).length === 0, j(wiring(raw(SHELL))));
  ok("2.4′ PLANT · the answer handed to every reader (a dark address would light Markets) is reported",
    wiring(plant(raw(SHELL), "promoSuppressed && (await resolveMillionea()).visible ? { millioneaOnBreak: true } : {}", "{ millioneaOnBreak: true }")).length > 0);
}

/* ══ §3 · F10 · EVERY MILLIONEA MOVE ANSWERS AT ONCE ═════════════════════════════════════════════════════════════════════
   MASWALI-BUILD S5 round 2 · PLATFORM (2026-10-22; the motion critic's "Perceived performance" row, unowned until the lead's
   round 2, and its M4: "View ticket" gave no feedback — the stamp's router.push never told NavProgress, so the bare slip
   stood ~1.2s with nothing moving). DESIGN_AUTHORITY §F10: a link's click starts the platform's progress bar by itself, and
   a programmatic `router.push` must dispatch `50pick:navigating` first to get it. The slip lane fixed its two moves with a
   `navigate` helper (test:maswali-slip-design 9.2 holds the stamp's); this census holds EVERY programmatic move in every
   Millionea file — the hub, the slip, the tickets, How, the register, /results' section, the shared parts — so the next
   one cannot ship silent: each `router.push(` / `router.replace(` is the body of a `navigate(() => …)` whose helper
   dispatches the event before it pushes, or stands right after that dispatch. (`router.refresh()` stays where it is: it
   moves no page.) */
section("3 · F10 · every programmatic move on a Millionea surface starts the platform's progress bar first");
{
  const walkTs = (dir: string): string[] => readdirSync(join(ROOT, dir), { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? walkTs(`${dir}/${d.name}`) : /\.tsx?$/.test(d.name) ? [`${dir}/${d.name}`] : []));
  const MLN = walkTs("src/app/millionea").concat(walkTs("src/components/maswali"), walkTs("src/app/results").filter((f) => /\/millionea/.test(f))).sort();
  const DISPATCH = 'window.dispatchEvent(new Event("50pick:navigating"));';
  /** Every programmatic move in a file's code (comments out), and whether each starts the bar first. */
  const movesOf = (text: string) => {
    const s = decomment(text);
    const helper = /function navigate\(push: \(\) => void\): void \{\s*([^}]*)\}/.exec(s)?.[1] ?? "";
    const helperStarts = squash(helper).trim().startsWith(DISPATCH) && /push\(\);/.test(helper);
    return [...s.matchAll(/\brouter\.(?:push|replace)\(/g)].map((m) => {
      const before = s.slice(Math.max(0, m.index! - 240), m.index!);
      const viaHelper = /\bnavigate\(\(\) => $/.test(before) && helperStarts;
      const afterDispatch = squash(before).trimEnd().endsWith(DISPATCH);
      return { at: s.slice(0, m.index!).split("\n").length, ok: viaHelper || afterDispatch };
    });
  };
  const census = MLN.map((f) => ({ f, moves: movesOf(raw(f)) })).filter((x) => x.moves.length > 0);
  const silent = census.flatMap((x) => x.moves.filter((m) => !m.ok).map((m) => `${x.f}:${m.at}`));
  const total = census.reduce((n, x) => n + x.moves.length, 0);
  // RE-PINNED AT THE S5 ROUND-2 INTEGRATION (SLIP × PLATFORM, 2026-10-22): S5-R2-SLIP 13 made the stamp's "View ticket" the
  // kit's Link (OperationResultModal's `primaryHref`), so it is no programmatic move: NavProgress starts on it as on every
  // internal link. The slip's one move left is its deposit door (`onDeposit`), and the census and its plants hold that one.
  const SLIP = "src/app/millionea/slip/slip-client.tsx";
  ok(`3.0 PREMISE · the census reads ${MLN.length} Millionea files and finds their programmatic moves (${total}: ${census.map((x) => `${x.f.split("/").slice(-2).join("/")} ×${x.moves.length}`).join(", ")}), the slip's deposit door among them`,
    MLN.length >= 40 && census.some((x) => x.f === SLIP && x.moves.length >= 1), j(census.map((x) => x.f)));
  ok("3.0b · the stamp's \"View ticket\" is the kit's Link (the slip hands the stamp its address, never a push)",
    squash(decomment(raw(SLIP))).includes("primaryHref={stamp ?") && !/onPrimary=\{[^}]*router\.push/.test(squash(decomment(raw(SLIP)))));
  ok("3.1 · every one dispatches `50pick:navigating` before it pushes (§F10) — no Millionea move waits on a silent screen", silent.length === 0, j(silent));
  const bare = movesOf(plant(raw(SLIP), "onDeposit={(amount) => navigate(() => router.push(", "onDeposit={(amount) => (() => router.push("));
  ok("3.1′ PLANT · the slip's deposit door pushed bare (no bar first) is reported", bare.some((m) => !m.ok));
  const mute = movesOf(plant(raw(SLIP), `  ${DISPATCH}\n  push();`, "  push();"));
  ok("3.1″ PLANT · the helper that no longer dispatches first (every move through it silent) is reported", mute.length >= 1 && mute.every((m) => !m.ok));
}

/* ══ §4 · THE MAIN LANDMARK'S GUEST SWITCH, FOR EVERY SIGNED-OUT READER ═══════════════════════════════════════════════════
   MASWALI-BUILD S5 round 2 · PLATFORM (2026-10-22; the lead's item from the hub lane's finding). `data-viewer="guest"` on
   #main-content marked a signed-out JOURNEY reader alone (A21's switch for the journey's ghosts); the Millionea hub draws a
   guest's door from it in either shell, and in classic a guest's swap landed 24px off. It now marks every signed-out reader.
   A classic DOM attribute may widen only while no rule a classic page draws keys on it: this census reads every stylesheet
   rule and every script that reads `data-viewer`, and holds each rule's subject to a class drawn only by the journey's own
   ghosts (`route-ghost.tsx`, `question-ghost.tsx` — a classic reader's loading state is the classic box) or by Millionea's
   own pages and parts — so a classic reader's new attribute changes no rule any classic page draws (the parity compare's
   expected answer: no pixel difference). */
section("4 · the main landmark's guest switch marks every signed-out reader; every rule keyed on it reaches only the journey's ghosts or Millionea's pages");
{
  const SHELL = "src/components/layout/app-shell.tsx";
  const marksAll = (s: string) => squash(decomment(s)).includes('<MainLandmark viewer={!session ? "guest" : undefined}>');
  ok("4.1 · AppShell writes data-viewer=\"guest\" on #main-content for every signed-out reader, in either shell (a journey reader exactly as before)", marksAll(raw(SHELL)));
  ok("4.1′ PLANT · the journey-only condition back (a classic guest unmarked: the hub's guest door drawn off its place) is reported",
    !marksAll(plant(raw(SHELL), '<MainLandmark viewer={!session ? "guest"', '<MainLandmark viewer={journeyShown && !session ? "guest"')));
  const walkAll = (dir: string, re: RegExp): string[] => readdirSync(join(ROOT, dir), { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? walkAll(`${dir}/${d.name}`, re) : re.test(d.name) ? [`${dir}/${d.name}`] : []));
  const CSS_FILES = walkAll("src", /\.css$/);
  const CODE_FILES = walkAll("src", /\.tsx?$/);
  const ALLOWED = (f: string) => /^src\/(?:app\/millionea\/|components\/maswali\/)/.test(f)
    || f === "src/components/journey/route-ghost.tsx" || f === "src/components/journey/question/question-ghost.tsx";
  const codeText = new Map(CODE_FILES.map((f) => [f, decomment(raw(f))]));
  const usersOf = (cls: string) => {
    const word = new RegExp(`(?<![\\w-])${cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`);
    return CODE_FILES.filter((f) => word.test(codeText.get(f)!));
  };
  /** Every selector (comma part) keyed on data-viewer in a stylesheet text, with its subject's tokens (the last compound's
   *  classes and attribute names — a subject keyed on an attribute is held as a class is; `data-viewer` itself is not one). */
  const keyed = (css: string) => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{[^{}]*\}/g)]
    .flatMap((m) => m[1].split(",").map((p) => p.trim()).filter((p) => p.includes("[data-viewer")))
    .map((sel) => {
      const last = sel.split(/\s+|>|\+|~/).filter(Boolean).at(-1) ?? "";
      const classes = [...last.matchAll(/\.([\w-]+)/g)].map((x) => x[1]);
      const attrs = [...last.matchAll(/\[([\w-]+)/g)].map((x) => x[1]).filter((a) => a !== "data-viewer");
      return { sel, subject: [...classes, ...attrs] };
    });
  /** A rule reaches a classic page unless one of its subject's tokens is drawn only in allowed files. */
  const reachesClassic = (r: { sel: string; subject: string[] }) => r.subject.length === 0 || !r.subject.some((c) => {
    const users = usersOf(c);
    return users.length > 0 && users.every(ALLOWED);
  });
  const rules = CSS_FILES.flatMap((f) => keyed(raw(f)).map((r) => ({ ...r, f })));
  const leaks = rules.filter(reachesClassic);
  ok(`4.0 PREMISE · the census reads ${CSS_FILES.length} stylesheets and ${CODE_FILES.length} code files and finds the rules keyed on data-viewer (${rules.length}: ${[...new Set(rules.flatMap((r) => r.subject))].join(" ")})`,
    rules.length >= 6 && rules.some((r) => r.subject.includes("kp-hubghost--member")) && rules.some((r) => r.subject.includes("kp-qghost__member")), j(rules.map((r) => r.sel)));
  ok("4.2 · every rule keyed on data-viewer reaches only the journey's ghosts or Millionea's pages — no rule a classic page draws changes for a classic guest", leaks.length === 0, j(leaks));
  // A class written in a component keys on it too: a Tailwind arbitrary variant (`[[data-viewer=guest]_&]:hidden`, the hub
  // lane's guest door) compiles to a rule whose subject is the element wearing the class — so its FILE must be one of the
  // allowed drawings.
  const VARIANT = /\[\[data-viewer[^\]]*\][^\s"'`]*/g;
  const variantsIn = (text: string) => [...text.matchAll(VARIANT)].map((m) => m[0]);
  const variantLeaks = (text: (f: string) => string) => CODE_FILES.filter((f) => !ALLOWED(f) && variantsIn(text(f)).length > 0);
  ok(`4.2b · every class keyed on data-viewer in a component (a Tailwind variant) is drawn only by the journey's ghosts or Millionea's pages (${CODE_FILES.filter((f) => variantsIn(codeText.get(f)!).length > 0).length} file(s) wear one today)`,
    variantLeaks((f) => codeText.get(f)!).length === 0, j(variantLeaks((f) => codeText.get(f)!)));
  /** A SCRIPT read of the attribute — never the class-string variants above. */
  const READ = /getAttribute\(\s*["']data-viewer["']\)|dataset\.viewer|(?:querySelector(?:All)?|closest|matches)\(\s*["'`][^"'`]*data-viewer/;
  const readers = CODE_FILES.filter((f) => f !== SHELL && READ.test(codeText.get(f)!));
  ok("4.3 · no script reads data-viewer (the shell writes it; stylesheets and class variants alone read it)", readers.length === 0, j(readers));
  const HUB_LIKE = 'const MEMBER = "[[data-viewer=guest]_&]:hidden";';
  const inMillionea = variantLeaks((f) => (f === "src/app/millionea/hub-ghost.tsx" ? `${codeText.get(f)}\n${HUB_LIKE}` : codeText.get(f)!));
  const inClassic = variantLeaks((f) => (f === "src/components/layout/top-app-bar.tsx" ? `${codeText.get(f)}\n${HUB_LIKE}` : codeText.get(f)!));
  ok("4.2b′ CONTROL + PLANT · the hub lane's variant in the hub's own drawing is allowed; the same variant in the classic bar is reported",
    inMillionea.length === 0 && j(inClassic) === j(["src/components/layout/top-app-bar.tsx"]), j({ inMillionea, inClassic }));
  const scriptRead = CODE_FILES.filter((f) => f !== SHELL && READ.test(f === "src/components/layout/nav-more.tsx" ? `${codeText.get(f)}\nconst g = document.querySelector('main[data-viewer="guest"]');` : codeText.get(f)!));
  ok("4.3′ PLANT · a script that reads the switch (a querySelector on it in classic chrome) is reported", j(scriptRead) === j(["src/components/layout/nav-more.tsx"]), j(scriptRead));
  const btnLeak = keyed(':root [data-viewer="guest"] .btn-ghost { opacity: 0.5; }').filter(reachesClassic);
  const bareLeak = keyed('main[data-viewer="guest"] { padding-top: 24px; }').filter(reachesClassic);
  ok("4.2′ PLANT · a rule keyed on the switch that reaches a classic class (the kit's ghost button) or the landmark itself is reported", btnLeak.length === 1 && bareLeak.length === 1, j({ btnLeak, bareLeak }));
}

/* ══ §5 · ON A BREAK THE CLASSIC SHELL OFFERS NO DEPOSIT DOOR ═════════════════════════════════════════════════════════════
   MASWALI-BUILD S5 round 2 · PLATFORM (2026-10-22; the hub lane's reader finding, the lead's approval). `/wallet/deposit`
   refuses a player on a break (`wallet-service.deposit()`), and DESIGN_AUTHORITY's break rule offers no deposit door (R4-I,
   R6-A); the journey's bar and Wallet already keep it, yet the classic shell still offered three: the rail's centre coin,
   the bar's deposit pill and the balance capsule's Wallet. Now the coin is the Wallet door, drawn exactly as for a held
   wallet; the pill is withheld; the capsule's Wallet drops its Deposit (WalletSheet's own rule). AppShell hands the break
   (`promoSuppressed`, an offer's gate that fails open) to the classic bar and rail only while it is true. */
section("5 · on a break the classic shell offers no deposit door: the coin is the Wallet door, the bar's pill and the capsule's Deposit are withheld");
{
  type Nav = (p: Record<string, unknown>) => unknown;
  const BAR = "src/components/layout/top-app-bar.tsx", RAIL = "src/components/layout/bottom-nav.tsx", PILL = "src/components/layout/wallet-balance-pill.tsx";
  const realBar = (req(`../${BAR}`) as { TopAppBar: Nav }).TopAppBar, realRail = (req(`../${RAIL}`) as { BottomNav: Nav }).BottomNav;
  const user = { initials: "DP", name: "Demo Player", phone: "+255•••84", isAuthed: true, balance: 25_000 };
  const rail = (R: Nav, props: Record<string, unknown>, l: Locale) => at(h(R as never, { isAuthed: true, proposalsState: "DISABLED", ...props } as never), "/markets", l);
  const bar = (B: Nav, props: Record<string, unknown>, l: Locale) => at(h(B as never, { user, proposalsState: "DISABLED", ...props } as never), "/markets", l);
  const railDefects = (R: Nav) => LOCALES.flatMap((l) => [
    ...(rail(R, { onBreak: true }, l) === rail(R, { walletHeld: true }, l) ? [] : [`${l}: on a break the rail is not the held wallet's`]),
    ...(rail(R, {}, l) !== rail(R, { walletHeld: true }, l) && rail(R, {}, l).includes('href="/wallet/deposit"') ? [] : [`${l}: CONTROL — not on a break, the coin is not the deposit door`]),
  ]);
  ok("5.1 · on a break the rail's centre is the Wallet door, drawn exactly as for a held wallet (coin, label, no Wallet row in More), in sw, en and zh; not on a break the coin is the deposit door (control)",
    railDefects(realRail).length === 0, j(railDefects(realRail)));
  const deposits = (s: string) => (s.match(/href="\/wallet\/deposit"/g) ?? []).length;
  const barDefects = (B: Nav) => LOCALES.flatMap((l) => [
    ...(deposits(bar(B, { onBreak: true }, l)) === 0 ? [] : [`${l}: the bar offers a deposit door on a break`]),
    ...(deposits(bar(B, {}, l)) > 0 ? [] : [`${l}: CONTROL — not on a break, the bar offers no deposit door`]),
  ]);
  ok("5.2 · on a break the classic bar draws no deposit door (its pill withheld), in sw, en and zh; not on a break it draws the pill (control)",
    barDefects(realBar).length === 0, j(barDefects(realBar)));
  const capsuleWired = (barSrc: string, pillSrc: string) => squash(decomment(barSrc)).includes("<WalletBalancePill balance={liveBalance} held={!!user.walletHeld} onBreak={onBreak} />")
    && squash(decomment(pillSrc)).includes("<WalletSheet open={open} onClose={() => setOpen(false)} balance={effectiveBalance} held={held} anchorRef={capsuleRef} onBreak={onBreak} />");
  ok("5.3 · the bar hands the break to its balance capsule and the capsule to its Wallet, whose own rule drops the Deposit and stands Withdraw alone (the journey's Wallet's)",
    capsuleWired(raw(BAR), raw(PILL)));
  const SHELL = "src/components/layout/app-shell.tsx";
  const wiring = (src: string) => {
    const s = squash(decomment(src));
    const d: string[] = [];
    if (count(s, "const breakProp: { onBreak?: true } = promoSuppressed ? { onBreak: true } : {};") !== 1) d.push("the break is not handed only while true");
    if (count(s, "{...breakProp}") !== 2 || !/<TopAppBar [^>]*\{\.\.\.breakProp\}/.test(s) || !/<BottomNav [^>]*\{\.\.\.breakProp\}/.test(s)) d.push("the classic bar and rail are not both handed the break");
    if (/<LazyJourney\w+ [^>]*breakProp/.test(s)) d.push("a journey nav is handed the classic break prop");
    return d;
  };
  ok("5.4 · AppShell hands the break to the classic bar and rail alone, only while it runs (no other reader's payload changes)", wiring(raw(SHELL)).length === 0, j(wiring(raw(SHELL))));
  const heldOnly = fromSource<{ BottomNav: Nav }>(RAIL, plant(raw(RAIL), "const moneyInClosed = walletHeld || onBreak;", "const moneyInClosed = walletHeld;")).BottomNav;
  ok("5.1′ PLANT · the coin that ignores the break (a deposit door a break refuses) is reported", railDefects(heldOnly).length === LOCALES.length, j(railDefects(heldOnly)));
  const pillOnBreak = fromSource<{ TopAppBar: Nav }>(BAR, plant(raw(BAR), "!user.walletHeld && !onBreak && !pathname", "!user.walletHeld && !pathname")).TopAppBar;
  ok("5.2′ PLANT · the bar's pill drawn on a break again is reported", barDefects(pillOnBreak).length === LOCALES.length, j(barDefects(pillOnBreak)));
  ok("5.3′ PLANT · the capsule's Wallet not handed the break (its Deposit back on a break) is reported",
    !capsuleWired(raw(BAR), plant(raw(PILL), "anchorRef={capsuleRef} onBreak={onBreak} />", "anchorRef={capsuleRef} />")));
  ok("5.4′ PLANT · the break handed to every reader (\"onBreak\":false in each classic payload) is reported",
    wiring(plant(raw(SHELL), "promoSuppressed ? { onBreak: true } : {}", "{ onBreak: true }")).length > 0);
}

/* ══ §6 · THE CLASSIC PHONE RAIL: MILLIONEA'S TRACK IN LIVE'S PLACE ═════════════════════════════════════════════════════
   Ali, 2026-10-22 ("ok replace live please … keep live in more"; DESIGN_AUTHORITY §M8a item 11): while Millionea's door is
   drawn for the reader (the shell's `millionea`, handed only while true), the rail is Markets · Up & Down · Deposit ·
   Millionea · More, and Live is More's first row; the track is its siblings' own slot, its label in Millionea's ink and its
   resting glyph gold. Every other reader — Millionea hidden, or on a break — is served the rail as it was, Live in its
   track. Millionea's pages light its track; its tickets light Positions (Tiketi zangu's classic destination), a More row.
   The rail is rendered with a stand-in for More that prints what the rail hands it (the real panel draws its rows only
   once opened); `qa:classic-rail` opens it in a browser. */
section("6 · the classic phone rail: Millionea's track takes Live's place while its door is drawn, and Live leads More");
{
  type Nav = (p: Record<string, unknown>) => unknown;
  type Words = { nav: { live: string }; millionea: { productLabel: string } };
  const W = dict as unknown as Record<Locale, Words>;
  const RAIL = "src/components/layout/bottom-nav.tsx", TAB = "src/lib/nav/active-tab.ts";
  const MORE_IMPORT = 'import { NavMore } from "@/components/layout/nav-more";';
  const MORE_PROBE = 'const NavMore = (p: any) => <li-more data-rows={p.items.map((i: any) => i.href).join(" ")} data-labels={p.items.map((i: any) => i.label).join("|")} data-current={p.current ?? ""} data-on={p.active ? "1" : undefined} />;';
  const probed = (src: string) => fromSource<{ BottomNav: Nav }>(RAIL, plant(src, MORE_IMPORT, MORE_PROBE)).BottomNav;
  const Rail = probed(raw(RAIL));
  type Read = { tracks: string[]; lit: string[]; rows: string[]; labels: string[]; current: string; html: string };
  const slotOf = (m: RegExpMatchArray) => m[1] === "li-more" ? "More" : /data-testid="deposit-rail"/.test(m[0]) ? "coin" : /href="([^"]+)"/.exec(m[0])?.[1] ?? "?";
  const read = (R: Nav, path: string, props: Record<string, unknown>, l: Locale = "en"): Read => {
    const html = at(h(R as never, { proposalsState: "DISABLED", ...props } as never), path, l);
    const tracks = [...html.matchAll(/<(a|li-more)\b[^>]*>/g)].map(slotOf);
    const lit = [...html.matchAll(/<(a|li-more)\b[^>]*data-on="1"[^>]*>/g)].map(slotOf);
    const more = /<li-more\b[^>]*>/.exec(html)?.[0] ?? "";
    const attr = (n: string) => new RegExp(`${n}="([^"]*)"`).exec(more)?.[1] ?? "";
    return { tracks, lit, rows: attr("data-rows").split(" ").filter(Boolean), labels: attr("data-labels").split("|").filter(Boolean), current: attr("data-current"), html };
  };
  const PLAYER = { isAuthed: true, inviteVisible: true };
  const COMPOSITIONS: Array<[string, Record<string, unknown>, boolean]> = [
    ["a guest, Millionea drawn", { millionea: true }, true], ["a guest, Millionea hidden", {}, false],
    ["a player, Millionea drawn", { ...PLAYER, millionea: true }, true], ["a player, Millionea hidden", { ...PLAYER }, false],
    ["a held wallet, Millionea drawn", { ...PLAYER, walletHeld: true, millionea: true }, true], ["a held wallet, Millionea hidden", { ...PLAYER, walletHeld: true }, false],
    ["a player on a break (Millionea visible, its door not drawn)", { ...PLAYER, onBreak: true, millioneaOnBreak: true }, false],
  ];
  const compositionDefects = (R: Nav) => LOCALES.flatMap((l) => COMPOSITIONS.flatMap(([name, props, drawn]) => {
    const r = read(R, "/markets", props, l);
    const d: string[] = [];
    if (j(r.tracks) !== j(["/markets", "/updown", "coin", drawn ? "/millionea" : "/live", "More"])) d.push(`tracks ${j(r.tracks)}`);
    if (drawn) {
      if (r.rows[0] !== "/live" || r.labels[0] !== W[l].nav.live || r.rows.filter((x) => x === "/live").length !== 1) d.push(`More's first row is not Live: ${j(r.rows)}`);
      const track = /<a\b[^>]*href="\/millionea"[^>]*>([\s\S]*?)<\/a>/.exec(r.html)?.[1] ?? "";
      if (!track.includes('class="kp-rail__pip kp-millionea-glyph"') || !track.includes(`<span class="kp-rail__label"><span class="kp-millionea-ink">${W[l].millionea.productLabel}</span></span>`)) d.push("the track's pip or label is not its siblings' with the ink and the gold glyph");
    } else if (r.rows.includes("/live") || /millionea/i.test(r.html)) d.push(`hidden: Millionea drawn, or Live in More too: ${j(r.rows)}`);
    if (r.rows.includes("/millionea")) d.push("More still carries a Millionea row");
    return d.map((x) => `${l} · ${name}: ${x}`);
  }));
  ok("6.1 · every composition (a guest, a player, a held wallet, Millionea drawn or hidden, a break) in sw, en and zh: drawn — Markets · Up & Down · coin · Millionea · More, Live More's first row, the track its siblings' slot with the ink and the gold glyph; hidden or on a break — Live in its track, no Millionea anywhere and no Live row",
    compositionDefects(Rail).length === 0, j(compositionDefects(Rail).slice(0, 6)));
  // Which slot is lit on each destination (the rail's `data-on`; More's lit row is its `current`, or the page's own row).
  const LIT_DRAWN: Record<string, [string, string]> = {
    "/": ["/markets", ""], "/markets": ["/markets", ""], "/markets/abc": ["/markets", ""], "/updown": ["/updown", ""], "/updown/history": ["/updown", ""],
    "/wallet/deposit": ["coin", ""], "/wallet/deposit/return": ["coin", ""],
    "/millionea": ["/millionea", ""], "/millionea/how": ["/millionea", ""], "/millionea/register": ["/millionea", ""], "/millionea/register/MLN-2026-W42": ["/millionea", ""],
    "/millionea/slip": ["/millionea", ""], "/millionea/tickets": ["More", "/positions"], "/millionea/tickets/MLN-2026-W42-000017": ["More", "/positions"],
    "/live": ["More", ""], "/results": ["More", ""], "/positions": ["More", ""], "/wallet": ["More", ""], "/leaderboard": ["More", ""], "/profile/invite": ["More", ""],
    "/legal/rules/millionea": ["", ""], "/millioneas": ["", ""], "/kpzzzzzzz": ["", ""],
  };
  const LIT_DARK: Record<string, string> = { "/markets": "/markets", "/updown": "/updown", "/wallet/deposit": "coin", "/live": "/live", "/results": "More", "/positions": "More",
    "/millionea": "", "/millionea/how": "", "/millionea/tickets": "", "/millioneas": "" };
  const litDefects = (R: Nav) => LOCALES.flatMap((l) => [
    ...Object.entries(LIT_DRAWN).flatMap(([p, [slot, current]]) => {
      const r = read(R, p, { ...PLAYER, millionea: true }, l);
      return j(r.lit) === j(slot ? [slot] : []) && r.current === current ? [] : [`${l} drawn ${p}: lit ${j(r.lit)} current ${j(r.current)}`];
    }),
    ...Object.entries(LIT_DARK).flatMap(([p, slot]) => {
      const r = read(R, p, { ...PLAYER }, l);
      return j(r.lit) === j(slot ? [slot] : []) ? [] : [`${l} hidden ${p}: lit ${j(r.lit)}`];
    }),
  ]);
  ok(`6.2 · one slot lit, never two: drawn, on ${Object.keys(LIT_DRAWN).length} destinations — Millionea's pages its track, its tickets More with Positions current, /live More (Live's row), the rest as before; hidden, on ${Object.keys(LIT_DARK).length} — Live its track, a Millionea address nothing (a dark address); in sw, en and zh`,
    litDefects(Rail).length === 0, j(litDefects(Rail).slice(0, 6)));
  const TABS = req(`../${TAB}`) as { classicMillioneaLit: (p: string) => string | null };
  const litTable: Record<string, string | null> = { "/millionea": "/millionea", "/millionea/how": "/millionea", "/millionea/tickets": "/positions", "/millionea/tickets/x": "/positions", "/legal/rules/millionea": null, "/millioneas": null, "/markets": null };
  ok("6.3 · `classicMillioneaLit` is the journey table's answer over the five tabs: Millionea's pages its own, its tickets Positions (Tiketi zangu's), nothing off Millionea",
    Object.entries(litTable).every(([p, w]) => TABS.classicMillioneaLit(p) === w), j(Object.fromEntries(Object.keys(litTable).map((p) => [p, TABS.classicMillioneaLit(p)]))));
  // PLANTS — each turns its check red.
  const darkTrack = probed(plant(raw(RAIL), '    millionea\n      ? { href: "/millionea"', '    true\n      ? { href: "/millionea"'));
  ok("6.1′ PLANT · the track drawn for a reader Millionea is hidden from (the answer ignored) is reported", compositionDefects(darkTrack).some((d) => d.includes("hidden")));
  const liveStays = probed(plant(raw(RAIL), '    millionea\n      ? { href: "/millionea"', '    false\n      ? { href: "/millionea"'));
  ok("6.1″ PLANT · Live kept in its track while the door is drawn (Live twice, no track) is reported", compositionDefects(liveStays).some((d) => d.includes("drawn: tracks")));
  const noLiveRow = probed(plant(raw(RAIL), 'millionea ? [{ href: "/live", label: t.nav.live }] : []', "[]"));
  ok("6.1‴ PLANT · Live dropped from More (the destination the track gave up, gone) is reported", compositionDefects(noLiveRow).some((d) => d.includes("More's first row is not Live")));
  const bareTrack = probed(plant(raw(RAIL), '<span className="kp-rail__label">{ink ? <span className="kp-millionea-ink">{label}</span> : label}</span>', '<span className="kp-rail__label">{label}</span>'));
  ok("6.1⁗ PLANT · the track's label without Millionea's ink is reported", compositionDefects(bareTrack).some((d) => d.includes("the track's pip or label")));
  const ticketsOnTrack = probed(plant(plant(raw(RAIL), 'const moreCurrent = millioneaLit === "/positions" ? millioneaLit : standIn;', "const moreCurrent = standIn;"),
    'if (href === "/millionea") return millioneaLit === "/millionea";', 'if (href === "/millionea") return millioneaLit !== null;'));
  ok("6.2′ PLANT · Millionea's tickets lighting its track instead of Positions is reported", litDefects(ticketsOnTrack).some((d) => d.includes("/millionea/tickets")));
  const doubleLit = probed(plant(raw(RAIL), 'if (href === "/millionea") return millioneaLit === "/millionea";', 'if (href === "/millionea") return pathname.startsWith("/millionea");'));
  ok("6.2″ PLANT · a track that also lights on its tickets (two lit: the track and More) is reported", litDefects(doubleLit).some((d) => d.includes("/millionea/tickets")));
}

console.log(`\nmillionea-shell: ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exitCode = 1; }
