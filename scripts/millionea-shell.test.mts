/**
 * test:millionea-shell — THE SHELL'S MILLIONEA ANSWERS A PAGE CANNOT GIVE ITSELF (MASWALI-BUILD S5-FIX-PLATFORM D12;
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
 * Every check has a plant that must turn it red. The bar's look at 320 and 1280, a staff session on a running server,
 * is the lane's `s5fplt` drive (reported with the commit).
 */
import "next/dist/server/node-environment.js";
import { readFileSync } from "node:fs";
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
  ok(`1.1b · the pages keep their ${calls} calls, unchanged (round 2 removes them)`, calls === 9, String(calls));
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

console.log(`\nmillionea-shell: ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exitCode = 1; }
