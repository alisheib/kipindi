/**
 * ROUND 5 OF THE VISUAL PASS, FOLLOW-UP HELPER L (2026-10-09) — every loading ghost on its routes lands where its page
 * lands, box for box; each guarantee held beside a control or a plant that proves it can fail.
 *
 *   npx tsx scripts/visual-pass-r5l.test.mts        (npm run test:visual-pass-r5l)
 *
 * The owner's rule (Ali, 2026-10-08/09): only perfect visual and logical results, and one convention per pattern.
 *   §1 THE ONE RULE · every generic loader opens on its page's own opening bands — the back link's box, the page's own
 *          PageHeader (in its PageHero), the hero's sentence — in the page's rhythm and tier, its spinner panel where the
 *          first band of data begins; the one exception (/proposals/[id], whose first band IS its data) named
 *   §2 THE SAME RULE IN THE PAGE · every in-page Suspense skeleton is its route's own ghost (one drawing per page): /results'
 *          and /markets' fallbacks are their loading files' drawings, client references, handed what the page knows
 *   §3 /agent · the page's Stat tiles with the page's props; every section in the page's own boxes with the page's words
 *   §4 /agent/apply, /agent/status, /agent/invite · the form's title row, step rail, one panel and navigation; the status
 *          header and two panels; the invitation's header, panel, note and actions
 *   §5 /leaderboard · the ribbon, the lens, the sort, the podium and the table with its head, in order; no spinner box;
 *          the podium the measured board's (the leader without a streak, the two beside it on one)
 *   §6 /results · row 2 from lg in the page's words; the carousel the notable card's own box, its title the tallest of
 *          three on the one rule for a title stack (the N/(N+1) quantile); the grid's count
 *   §7 /markets · row 2 from lg in the page's words; the bar and the grid as the page's fallback
 *   §8 /live · the hero IS PageHero; the CTA row the page's button and six dots; its question stack the tallest of six on
 *          the same rule; each card the PulseCard's box per language
 *   §9 THE KITS · the one ghost helper — R5-K's `ghost-text.tsx` (`GhostText`, `ghostShape`, `ChipGhost`) with R5-L's
 *          `ButtonGhost` — and `query-bar-ghost.tsx` (the pill, count, group, sort, menu and Filters ghosts), each
 *          against the page's own component it stands for
 *   §10 THE MEASURE · the wraps the old ghosts missed, re-derived from the repo's fonts (fontkit): row 2 from lg, the /live
 *          CTA row's threshold, the PulseCard's height by language — controls on the old boxes
 * Every band compared is the page's class string held in BOTH files (`held`): if the page moves, the ghost must follow.
 * Classes are compared as GEOMETRY — ink and sheen removed, every spacing key read as its pixels on this repo's
 * overridden scale (so `w-14` and `w-[56px]` are one box).
 * ⛔ It READS, builds and renders in memory; it writes nothing. The on-disk mutation proof is S/r5l/mutation-r5l.mjs.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { posix } from "node:path";
import { createRequire } from "node:module";
import { decomment } from "./lib/decomment.mts";

const req = createRequire(import.meta.url);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
const hasDirective = (s: string, d: string) => new RegExp(`^\\s*["']${d}["'];?`).test(s);
const walk = (d: string, out: string[] = []): string[] => {
  for (const n of readdirSync(d)) { const p = posix.join(d, n); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); }
  return out;
};
/** A text source: a file read with its comments out, or the same with a plant in it. */
type Src = (p: string) => string;
const REAL: Src = (p) => squash(code(p));
const planted = (file: string, from: string, to: string): Src => (p) => squash(decomment(p === file ? (() => {
  const s = raw(p); if (!s.includes(from)) throw new Error(`plant anchor missing in ${file}: ${from.slice(0, 80)}`); return s.replace(from, to);
})() : raw(p)));

/* ── geometry: a class list with its ink and sheen out, every spacing key in pixels on this repo's scale ─────────── */
const OVERRIDE: Record<string, number> = { "0.5": 2, "1": 4, "1.5": 8, "2": 12, "3": 16, "4": 20, "5": 24, "6": 32, "7": 40, "8": 48, "9": 64, "10": 80, "11": 96, "12": 128 };
const SPACING = /^(-?)(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|w|h|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|inset-x|inset-y)-(\d+(?:\.\d+)?)$/;
const INK = /^(?:text-(?:text|transparent|brand|info|aqua|success|danger|warning|gold|yes|no|royal|white)(?:-[\w/]+)?|bg-.+|border-(?:border|transparent|brand|info|success|danger|warning|gold|royal|aqua|white)(?:-[\w/]+)?|ring.*|kp-shimmer-track|kp-rise|group|transition.*|cursor-.+|opacity-\d+|content-fade-in|rounded(?:-[\w\[\]%/.-]+)?|select-none)$/;
function token(t: string): string | null {
  const at = t.lastIndexOf(":", t.indexOf("[") >= 0 ? t.indexOf("[") : t.length);
  const variant = at >= 0 ? t.slice(0, at + 1) : "", base = at >= 0 ? t.slice(at + 1) : t;
  if (/^(?:hover|group-hover|focus|focus-visible|active):$/.test(variant)) return null;
  if (INK.test(base)) return null;
  const m = SPACING.exec(base);
  if (m) return `${variant}${m[1]}${m[2]}-[${OVERRIDE[m[3]] ?? Number(m[3]) * 4}px]`;
  return variant + base;
}
const geom = (cls: string) => cls.split(/\s+/).filter(Boolean).map(token).filter((x): x is string => x !== null).sort().join(" ");

/** The page's class string and the ghost's, each found in its own file `n` times, and the same box. */
/** `page` may be several strings (a component that joins its box from parts — PageRibbon's `cn(…, …)`). */
type Pair = { band: string; page: string | string[]; pageFile: string; ghost: string; ghostFile: string; n?: number; ghostN?: number };
function held(pairs: Pair[], src: Src = REAL): string[] {
  const bad: string[] = [];
  for (const p of pairs) {
    const ps = src(p.pageFile), gs = src(p.ghostFile);
    const parts = Array.isArray(p.page) ? p.page : [p.page];
    const pc = Math.min(...parts.map((x) => count(ps, `"${x}"`) + count(ps, `\`${x}`) + count(ps, `"${x} `))), gc = count(gs, `"${p.ghost}"`) + count(gs, `\`${p.ghost}`);
    if (pc < (p.n ?? 1)) bad.push(`${p.band}: the page no longer carries "${parts.join(" + ")}" (${pc})`);
    if (gc < (p.ghostN ?? p.n ?? 1)) bad.push(`${p.band}: the ghost does not carry "${p.ghost}" (${gc})`);
    if (geom(parts.join(" ")) !== geom(p.ghost)) bad.push(`${p.band}: ${geom(parts.join(" "))} ≠ ${geom(p.ghost)}`);
  }
  return bad;
}
/** One element's text from `<Tag` to its own `>`/`/>`, braces balanced (so `icon={<I.x s={22} />}` stays inside). */
function element(s: string, from: number): string {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return s.slice(from, i + 1);
  }
  return "";
}
/** An element's attributes, name → raw value (`"…"` or `{…}`), in any order. */
function attrs(el: string): Record<string, string> {
  const out: Record<string, string> = {};
  const body = el.replace(/^<[\w.]+/, "").replace(/\/?>$/, "");
  let i = 0;
  while (i < body.length) {
    const m = /^\s*([\w-]+)=/.exec(body.slice(i));
    if (!m) { i++; continue; }
    i += m[0].length;
    if (body[i] === '"') { const e = body.indexOf('"', i + 1); out[m[1]] = body.slice(i, e + 1); i = e + 1; }
    else if (body[i] === "{") { let d = 0, k = i; for (; k < body.length; k++) { if (body[k] === "{") d++; else if (body[k] === "}" && --d === 0) break; } out[m[1]] = body.slice(i, k + 1); i = k + 1; }
  }
  return out;
}
/** An element's attributes as one comparable string, whatever their order. */
const attrKey = (el: string) => j(Object.entries(attrs(el)).sort(([a], [b]) => a.localeCompare(b)));

/* ── the world a client drawing renders in: the providers the root layout gives it ─────────────────────────────────── */
type Locale = "sw" | "en" | "zh";
const LOCALES: Locale[] = ["sw", "en", "zh"];
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Locale, Record<string, Record<string, string>>> };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (path: string, l: Locale, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l } as never, el as never))));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const load = (f: string) => (req(`../${f}`) as { default: unknown }).default;
const render = (f: string, l: Locale, path = "/") => inApp(path, l, h(load(f) as never));
/** The ghost helper — ONE file, R5-K's (`GhostText`, `ghostShape`, `ChipGhost`), with R5-L's `ButtonGhost`. */
const KIT = "src/components/ui/ghost-text.tsx";
const { GHOST_TEXT_CLASS } = req(`../${KIT}`) as { GHOST_TEXT_CLASS: string };
/** Every one of the page's sentences is in the ghost, set and not shown (inside a transparent word bar, `GhostText`). */
const BAR = `class="${GHOST_TEXT_CLASS}`;
const wordsIn = (html: string, words: string[]) => words.filter((w) => {
  const at = html.indexOf(esc(w));
  if (at < 0) return true;
  return html.lastIndexOf(BAR, at) < 0 || html.lastIndexOf(BAR, at) < html.lastIndexOf("</span>", at);
});

/* ══ §1 · THE ONE RULE: A GENERIC LOADER OPENS ON ITS PAGE'S OPENING BANDS ══════════════════════════════════════════ */
section("1 · every generic loader opens on its page's own opening bands, in the page's rhythm; its spinner where data begins");
const LOADER = "src/components/ui/page-loader.tsx";
/** The generic loaders — the loading files that render PageLoader — and, per route, the case drawn where the page's
 *  opening band depends on its data (a title by state, a flag by programme state). */
const GENERIC = walk("src/app").filter((f) => f.endsWith("/loading.tsx") && !f.startsWith("src/app/admin/") && /<PageLoader\b/.test(code(f))).sort();
const CASES: Record<string, Array<[string, string]>> = {
  "src/app/profile/kyc/loading.tsx": [['title={kyc?.status === "APPROVED" ? t.profile.verifyTitleApproved : finalRefusal ? t.kycGate.titleRejected : t.profile.verifyIdentity}', "title={<GhostText>{t.profile.verifyIdentity}</GhostText>}"]], // set and not shown since 2026-10-09 (1.4)
};
/** The one route whose first band IS its data: the proposal's own head card, its h1 the proposal's title. */
const DATA_FIRST: Record<string, string> = { "src/app/proposals/[id]/loading.tsx": '<section className="rounded-xl glass-panel p-4"> <div className="mb-2.5 flex flex-wrap items-center gap-2"> <StatusBadge' };

/** What a page opens on: its back link, its hero's opening tag, its header's attributes, its rhythm and its tier. */
function opening(pageSrc: string) {
  const back = (() => { const b = pageSrc.search(/<BackLink\b/), hd = pageSrc.search(/<PageHeader\b|<PageHero\b/); return b >= 0 && (hd < 0 || b < hd); })();
  const heroAt = pageSrc.search(/<PageHero\b/), headAt = pageSrc.search(/<PageHeader\b/);
  const hero = heroAt >= 0 && heroAt < headAt ? element(pageSrc, heroAt) : "";
  const header = headAt >= 0 ? element(pageSrc, headAt) : "";
  const container = /<PageContainer tier="\w+" className="([^"]*)"/.exec(pageSrc)?.[1] ?? /<div className="(mx-auto max-w-\[1080px\][^"]*space-y-[56][^"]*)"/.exec(pageSrc)?.[1] ?? "";
  const rhythm = /\b(space-y-[56])\b/.exec(container)?.[1] ?? "";
  const tier = /<PageContainer tier="(\w+)"/.exec(pageSrc)?.[1] ?? (pageSrc.includes('className="mx-auto max-w-[1080px]') ? "reading" : "");
  return { back, hero, header, rhythm, tier };
}
function ruleCheck(src: Src): string[] {
  const bad: string[] = [];
  for (const f of GENERIC) {
    const page = src(posix.join(posix.dirname(f), "page.tsx")), ghost = src(f);
    if (f in DATA_FIRST) {
      if (!page.includes(DATA_FIRST[f])) bad.push(`${f}: the page's first band is no longer its head card`);
      if (/\blead=/.test(ghost)) bad.push(`${f}: draws an opening band over a page that opens on its data`);
      continue;
    }
    const want = opening(page);
    let wantHeader = want.header;
    for (const [from, to] of CASES[f] ?? []) wantHeader = wantHeader.replace(from, to);
    const gHeadAt = ghost.search(/<PageHeader\b/), gHeroAt = ghost.search(/<PageHero\b/);
    const gHeader = gHeadAt >= 0 ? element(ghost, gHeadAt) : "", gHero = gHeroAt >= 0 && gHeroAt < gHeadAt ? element(ghost, gHeroAt) : "";
    const gBack = /<BackLinkGhost \/>/.test(ghost);
    const gRhythm = /rhythm="(space-y-[56])"/.exec(ghost)?.[1] ?? "", gTier = /tier="(\w+)"/.exec(ghost)?.[1] ?? "";
    if (gBack !== want.back) bad.push(`${f}: back link ${want.back ? "missing" : "the page has none"}`);
    if (want.header && attrKey(gHeader) !== attrKey(wantHeader)) bad.push(`${f}: header ${attrKey(gHeader)} ≠ ${attrKey(wantHeader)}`);
    if (attrKey(gHero) !== attrKey(want.hero)) bad.push(`${f}: hero ${gHero || "none"} ≠ ${want.hero || "none"}`);
    if (gRhythm !== want.rhythm) bad.push(`${f}: rhythm ${gRhythm} ≠ ${want.rhythm}`);
    if (gTier !== want.tier) bad.push(`${f}: tier ${gTier} ≠ ${want.tier}`);
    if (!hasDirective(raw(f), "use client") && !(f in DATA_FIRST)) bad.push(`${f}: not the drawing itself (it reads its words: "use client")`);
  }
  return bad;
}
{
  ok(`1.0 · the census: ${GENERIC.length} generic loaders (every player loading file that renders PageLoader) — ${GENERIC.length - Object.keys(DATA_FIRST).length} open on their page's bands, ${Object.keys(DATA_FIRST).length} opens on its data`,
    GENERIC.length >= 16 && Object.keys(DATA_FIRST).every((f) => GENERIC.includes(f)), j(GENERIC));
  const now = ruleCheck(REAL);
  ok("1.1 · each draws its page's opening bands with the page's own parts: the back link's box where the page opens on one, the page's PageHero tag and PageHeader with the same eyebrow, title, subtitle, icon and tone (the unverified KYC title, the case drawn), in the page's rhythm and tier — and is the drawing itself (\"use client\", its words its own)",
    now.length === 0, now.slice(0, 4).join(" | "));
  const plants: Array<[string, string, string, string]> = [
    ["no back link", "src/app/profile/security/loading.tsx", "          <BackLinkGhost />\n", ""],
    ["a header's icon a size smaller", "src/app/notifications/loading.tsx", "icon={<I.bellRing s={22} />}", "icon={<I.bellRing s={14} />}"],
    ["the rung of another page", "src/app/proposals/loading.tsx", 'rhythm="space-y-6"', 'rhythm="space-y-5"'],
    ["the hero dropped", "src/app/help/loading.tsx", '<PageHero glow="info">', "<>"],
    ["a lead over the data-first page", "src/app/proposals/[id]/loading.tsx", "<PageLoader ", "<PageLoader lead={null} "],
  ];
  const missed = plants.filter(([, f, from, to]) => ruleCheck(planted(f, from, to)).length === 0).map(([n]) => n);
  ok(`1.1′ PLANT · each of ${plants.length} plants (${plants.map(([n]) => n).join(" · ")}) is reported`, missed.length === 0, missed.join(", "));
}
{
  // RUN: each loader's markup, in each language, prints the page's header BEFORE the spinner panel (and the back link's
  // box first where the page opens on one).
  const wrong: string[] = [];
  for (const f of GENERIC.filter((x) => !(x in DATA_FIRST))) for (const l of LOCALES) {
    const html = render(f, l);
    const h1 = html.indexOf("<h1"), spinner = html.indexOf('role="status"'), back = html.indexOf('class="flex min-h-[44px] items-center" aria-hidden="true"');
    const pageHasBack = /<BackLink\b/.test(code(posix.join(posix.dirname(f), "page.tsx")));
    const title = /<p className="font-display text-\[19px\] font-bold leading-none">/.test(code(f));
    if (!(title ? html.indexOf("text-[19px]") >= 0 && html.indexOf("text-[19px]") < spinner : h1 >= 0 && h1 < spinner)) wrong.push(`${f} ${l}: the header does not stand before the spinner`);
    if (pageHasBack && !(back >= 0 && back < (title ? html.indexOf("text-[19px]") : h1))) wrong.push(`${f} ${l}: the back link's box is not first`);
  }
  ok("1.2 · RUN in sw, en and zh: every one of them draws the page's own header (its h1, or /profile/invite's title row) before the spinner panel, after the back link's box where the page opens on one", wrong.length === 0, wrong.slice(0, 4).join(" | "));
  const pl = code(LOADER);
  const marker = inApp("/", "sw", h((req(`../${LOADER}`) as { PageLoader: unknown }).PageLoader as never, { lead: h("i", { id: "lead-marker" }), rhythm: "space-y-5" } as never));
  ok("1.3 · the rule is written once, in PageLoader: its note says it, `lead` renders first in the container and `rhythm` is the container's own class",
    pl.includes("lead?: ReactNode;") && pl.includes('rhythm?: "space-y-5" | "space-y-6";') && raw(LOADER).includes("EVERY GHOST OPENS ON THE BAND ITS PAGE OPENS ON")
      && marker.indexOf('id="lead-marker"') > 0 && marker.indexOf('id="lead-marker"') < marker.indexOf('role="status"') && /data-measure="reading" class="[^"]*space-y-5/.test(marker));
}

{
  // A TITLE THAT STATES THE READER'S STATE IS SET AND NOT SHOWN (2026-10-09, after round 6's C1 and C13): /profile/kyc's h1
  // is its reader's verification, /profile/invite's title its reader's programme (`invite-name.ts`); the drawing knows
  // neither, so it keeps the case drawn's width inside a word bar and shows no word a reader in another state would not read.
  const STATE_TITLES: Array<[string, string, (l: Locale) => string]> = [
    ["src/app/profile/kyc/loading.tsx", "title={<GhostText>{t.profile.verifyIdentity}</GhostText>}", (l) => dict[l].profile.verifyIdentity],
    ["src/app/profile/invite/loading.tsx", "<GhostText>{t.profile.inviteFriends}</GhostText>", (l) => dict[l].profile.inviteFriends],
  ];
  const shown: string[] = [];
  for (const [f, , word] of STATE_TITLES) for (const l of LOCALES) if (wordsIn(render(f, l), [word(l)]).length) shown.push(`${f} ${l}: "${word(l)}" shown`);
  const kycPage = REAL("src/app/profile/kyc/page.tsx"), invitePage = REAL("src/app/profile/invite/page.tsx");
  ok("1.4 · RUN in sw, en and zh: a title that states the reader's state is set and not shown — /profile/kyc's (unverified, verified, refused) and /profile/invite's (an agent's dashboard, a paid or an unpaid player's name): each drawing keeps the case drawn's width inside a word bar",
    shown.length === 0 && STATE_TITLES.every(([f, s]) => REAL(f).includes(s)) && kycPage.includes("t.profile.verifyTitleApproved") && invitePage.includes("inviteName(t, { agent: false, paid })"), shown.join(" | "));
  ok("1.4′ PLANT · the KYC title shown again (the old drawing) is reported", !planted(STATE_TITLES[0][0], STATE_TITLES[0][1], "title={t.profile.verifyIdentity}")(STATE_TITLES[0][0]).includes(STATE_TITLES[0][1]));
}

/* ══ §2 · THE SAME RULE IN THE PAGE: EVERY IN-PAGE SUSPENSE SKELETON IS ITS ROUTE'S OWN GHOST ═══════════════════════ */
section("2 · every in-page Suspense skeleton is its route's own ghost — one drawing per page, a client reference");
function suspenseCensus(src: Src): string[] {
  const bad: string[] = [];
  for (const f of walk("src").filter((p) => /\.tsx$/.test(p) && !p.startsWith("src/app/admin/") && !p.startsWith("src/components/admin/"))) {
    const s = src(f);
    for (const m of s.matchAll(/<Suspense fallback=\{/g)) {
      // The fallback's own element, its braces balanced (a ghost handed `notable={…}` has braces inside).
      const open = (m.index ?? 0) + m[0].length - 1;
      let d = 0, k = open; for (; k < s.length; k++) { if (s[k] === "{") d++; else if (s[k] === "}" && --d === 0) break; }
      const fb = s.slice(open + 1, k).trim();
      if (fb === "null") continue;
      if (/^<(ResultsGhostBands|MarketsBoardGhost)\b/.test(fb) && /from "\.\/loading";/.test(s)) continue;
      if (f === "src/components/layout/top-app-bar.tsx" && fb.startsWith("<GuestAuthPills")) continue; // chrome, not a skeleton
      bad.push(`${f}: ${fb.slice(0, 60)}`);
    }
    if (/^src\/app\//.test(f) && /\bfunction \w*Skeleton\(/.test(s)) bad.push(`${f}: an inline skeleton function`);
  }
  return bad;
}
{
  const now = suspenseCensus(REAL);
  ok("2.1 · the census: outside the console every Suspense fallback is null, the classic bar's guest pills (chrome), or its route's own ghost imported from ./loading — no page draws a skeleton of its own",
    now.length === 0, now.join(" | "));
  const back = suspenseCensus(planted("src/app/markets/page.tsx", "<Suspense fallback={<MarketsBoardGhost />}>", "<Suspense fallback={<GridSkeleton />}>"));
  ok("2.1′ PLANT · /markets' own GridSkeleton back as the fallback is reported", back.length > 0, back.join(" | "));
  const rp = REAL("src/app/results/page.tsx"), mp = REAL("src/app/markets/page.tsx");
  const rl = raw("src/app/results/loading.tsx"), ml = raw("src/app/markets/loading.tsx");
  ok("2.2 · the fallbacks are the loading files' own drawings — /results' `ResultsGhostBands` (handed the page's carousel and search answers) and /markets' `MarketsBoardGhost`, both from client files (a reference in the payload, which every refresh re-sends), and each loading file renders the same component",
    rp.includes('import { ResultsGhostBands } from "./loading";') && rp.includes("<Suspense fallback={<ResultsGhostBands notable={!searching && pageNum === 1} searching={searching} />}>")
      && mp.includes('import { MarketsBoardGhost } from "./loading";') && hasDirective(rl, "use client") && hasDirective(ml, "use client")
      && REAL("src/app/results/loading.tsx").includes("<ResultsGhostBands />") && REAL("src/app/markets/loading.tsx").includes("<MarketsBoardGhost />"));
  const { ResultsGhostBands } = req("../src/app/results/loading.tsx") as { ResultsGhostBands: unknown };
  const { MarketsBoardGhost } = req("../src/app/markets/loading.tsx") as { MarketsBoardGhost: unknown };
  const grid = (html: string) => count(html.slice(html.indexOf('class="market-grid')), 'style="height:var(--mcard-h-closed)"');
  const one = inApp("/results", "sw", h(ResultsGhostBands as never, { notable: true } as never)), two = inApp("/results", "sw", h(ResultsGhostBands as never, { notable: false, searching: true } as never));
  ok(`2.3 · RUN: page one's ghost draws the carousel and ${grid(one)} cards (a page less the three it lifts); a search's page none and ${grid(two)}, with the search's 16.5px line over the grid`,
    one.includes('class="mb-5" aria-hidden="true"') && grid(one) === 9 && !two.includes('class="mb-5" aria-hidden="true"') && grid(two) === 12 && two.includes('class="mb-3 h-[16.5px]"'), j({ one: grid(one), two: grid(two) }));
  const mk = inApp("/markets", "sw", h(MarketsBoardGhost as never));
  ok("2.4 · RUN: /markets' fallback draws the bar BEFORE the grid, the grid on the page's own `mt-5` — GridSkeleton drew the grid alone on `mt-3`, 92px high on a phone and 180 at 1280 in Swahili",
    mk.indexOf("kp-discovery-bar") >= 0 && mk.indexOf("kp-discovery-bar") < mk.indexOf('class="market-grid mt-5"') && !mk.includes("market-grid mt-3"));
}

/* ══ §3 · /agent ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · /agent: the page's Stat tiles with the page's props, every section in the page's own boxes and words");
const AG = "src/app/agent/page.tsx", AGG = "src/app/agent/loading.tsx", WF = "src/components/agent/commission-waterfall.tsx";
const agentPairs: Pair[] = [
  { band: "container", page: "space-y-6", pageFile: AG, ghost: "space-y-6", ghostFile: AGG },
  { band: "the tiles' grid", page: "grid grid-cols-1 gap-3 sm:grid-cols-3", pageFile: AG, ghost: "grid grid-cols-1 gap-3 sm:grid-cols-3", ghostFile: AGG },
  { band: "the CTA row", page: "flex flex-col gap-2 sm:flex-row sm:items-center", pageFile: AG, ghost: "flex flex-col gap-2 sm:flex-row sm:items-center", ghostFile: AGG },
  { band: "a panel", page: "rounded-xl glass-panel p-4", pageFile: AG, ghost: "rounded-xl glass-panel p-4 text-transparent", ghostFile: AGG, n: 3, ghostN: 4 },
  { band: "a panel title", page: "font-display text-title-sm font-bold leading-tight", pageFile: AG, ghost: "font-display text-title-sm font-bold leading-tight", ghostFile: AGG, n: 3, ghostN: 4 },
  { band: "the steps", page: "mt-3 space-y-3", pageFile: AG, ghost: "mt-3 space-y-3", ghostFile: AGG },
  { band: "a step", page: "flex items-start gap-3", pageFile: AG, ghost: "flex items-start gap-3", ghostFile: AGG },
  { band: "a step's sentence", page: "pt-1 text-body-sm leading-snug text-text", pageFile: AG, ghost: "pt-1 text-body-sm leading-snug", ghostFile: AGG },
  { band: "the documents' grid", page: "mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2", pageFile: AG, ghost: "mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2", ghostFile: AGG },
  { band: "a document", page: "flex items-center gap-2 rounded-md border border-border bg-bg-overlay/40 px-3 py-2 text-body-sm", pageFile: AG, ghost: "flex items-center gap-2 rounded-md border border-border bg-bg-overlay/40 px-3 py-2 text-body-sm", ghostFile: AGG },
  { band: "the identity note", page: "mt-3 text-body-sm leading-relaxed text-text-muted", pageFile: AG, ghost: "mt-3 text-body-sm leading-relaxed", ghostFile: AGG },
  { band: "the size hint", page: "mt-1 font-mono text-body-sm text-text-subtle", pageFile: AG, ghost: "mt-1 font-mono text-body-sm", ghostFile: AGG },
  { band: "the fee's eyebrow", page: "font-mono text-micro uppercase eyebrow font-bold text-text-subtle", pageFile: AG, ghost: "font-mono text-micro uppercase eyebrow font-bold", ghostFile: AGG },
  { band: "the fee", page: "mt-2 amount text-title-lg font-bold text-text", pageFile: AG, ghost: "mt-2 amount text-title-lg font-bold", ghostFile: AGG },
  { band: "the wallet sentence", page: "mt-3 text-body-sm leading-relaxed text-text", pageFile: AG, ghost: "mt-3 text-body-sm leading-relaxed", ghostFile: AGG },
  { band: "the refund sentence", page: "mt-2 text-body-sm leading-relaxed text-text-muted", pageFile: AG, ghost: "mt-2 text-body-sm leading-relaxed", ghostFile: AGG },
  { band: "how you are paid", page: "rounded-xl glass-panel p-4 space-y-2", pageFile: AG, ghost: "rounded-xl glass-panel p-4 space-y-2 text-transparent", ghostFile: AGG },
  { band: "the terms", page: "space-y-1.5 text-body-sm text-text-muted leading-snug list-disc pl-4", pageFile: AG, ghost: "space-y-1.5 text-body-sm leading-snug list-disc pl-4", ghostFile: AGG },
  { band: "the waterfall's title row", page: "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1", pageFile: WF, ghost: "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1", ghostFile: AGG },
  { band: "the waterfall's basis", page: "mt-1 text-body-sm leading-relaxed text-text-muted", pageFile: WF, ghost: "mt-1 text-body-sm leading-relaxed", ghostFile: AGG },
  { band: "the waterfall's head row", page: "flex items-baseline justify-between gap-4 border-b border-border pb-1.5", pageFile: WF, ghost: "flex items-baseline justify-between gap-4 border-b border-border pb-1.5", ghostFile: AGG },
  { band: "a deduction's label", page: "block text-body-sm leading-snug text-text-muted before:mr-1.5 before:text-text-faint before:content-['·']", pageFile: WF, ghost: "block text-body-sm leading-snug before:mr-1.5 before:content-['·']", ghostFile: AGG },
  { band: "a row's note", page: "mt-0.5 block text-body-sm leading-snug text-text-faint", pageFile: WF, ghost: "mt-0.5 block text-body-sm leading-snug", ghostFile: AGG },
  { band: "the effective rate", page: "mt-3 text-body-sm leading-relaxed text-text", pageFile: WF, ghost: "mt-3 text-body-sm leading-relaxed", ghostFile: AGG },
  { band: "the disclaimer", page: "mt-1.5 text-body-sm leading-relaxed text-text-faint", pageFile: WF, ghost: "mt-1.5 text-body-sm leading-relaxed", ghostFile: AGG },
  { band: "the terms link", page: "text-center text-body-sm text-text-subtle", pageFile: AG, ghost: "text-center text-body-sm text-transparent", ghostFile: AGG },
];
{
  const now = held(agentPairs);
  ok(`3.1 · every band is the page's own box (${agentPairs.length} class strings held in both files, the waterfall's from its component): the tiles' grid, the CTA row, the four panels and their titles, steps, documents, notes, fee, terms, the waterfall's rows and sentences, the terms link`,
    now.length === 0, now.slice(0, 4).join(" | "));
  const pg = REAL(AG), gh = REAL(AGG);
  const stat = (s: string) => [...s.matchAll(/<Stat size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4[^"]*"/g)].length;
  const iconEnd = (s: string) => count(s, 'iconAlign="end"');
  ok("3.2 · the three tiles are the page's own `Stat`, the same props (size xl, the glass box, the strong label, mono, p-4, the icon at the end) — the 121px tile measured on tile 196 is the page's by construction",
    stat(pg) === 3 && stat(gh) === 3 && iconEnd(pg) === 3 && iconEnd(gh) === 3);
  const rowsPage = REAL(WF), rowsGhost = gh;
  ok("3.3 · the waterfall's eight rows are the component's: a row `flex items-start justify-between gap-4` on `py-1.5`, the payout's `pt-2 pb-1` under a strong rule, a deduction's `pl-3` and its dot, the amount's column — drawn from `commissionWaterfall` at the default rates",
    rowsPage.includes('return id === "netPayout" ? "pt-2 pb-1" : "py-1.5";') && rowsGhost.includes('s.id === "netPayout" ? "pt-2 pb-1 border-t border-border-strong" : "py-1.5"')
      && rowsPage.includes('s.id === "netPayout" ? " border-t border-border-strong" : ""') && rowsGhost.includes('s.deduction ? "min-w-0 pl-3" : "min-w-0"')
      && rowsGhost.includes("WATERFALL.steps.map(") && rowsGhost.includes("commissionWaterfall(1_000_000,"));
  const plants: Array<[string, string, string]> = [
    ["the documents a step closer", '<ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">', '<ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">'],
    ["a step's sentence on another line height", '<p className="pt-1 text-body-sm leading-snug">', '<p className="pt-1 text-body-sm leading-tight">'],
    ["the fee panel's figure a rung smaller", '<p className="mt-2 amount text-title-lg font-bold">', '<p className="mt-2 amount text-title-md font-bold">'],
  ];
  const missed = plants.filter(([, from, to]) => held(agentPairs, planted(AGG, from, to)).length === 0).map(([n]) => n);
  ok(`3.1′ PLANT · ${plants.map(([n]) => n).join(" · ")} — each reported`, missed.length === 0, missed.join(", "));
}
{
  const wrong: string[] = [];
  for (const l of LOCALES) {
    const t = dict[l].agent, html = render(AGG, l, "/agent");
    const words = [t.howTitle, t.how1, t.how2, t.how3, t.how4, t.how5, t.docsTitle, t.docCv, t.docRequest, t.docSerikali, t.docRefLetter1, t.docRefId1, t.docRefLetter2, t.docRefId2, t.docIdNote,
      t.feeTitle, t.earnTitle, t.earnLifetime, t.earnUncapped, t.earnNoPrize, t.earnSingleLevel, t.recruiterOnly, t.wfTitle, t.wfEyebrow, t.wfColParam, t.wfColAmount, t.wfDisclaimer, t.termsLink,
      t.statEarn, t.statCost, t.statTime, t.statEarnHint, t.statTimeHint];
    const missing = wordsIn(html, words);
    if (missing.length) wrong.push(`${l}: ${missing.slice(0, 3).join(" / ")}`);
    if (!html.includes(esc(t.heroSub)) || html.includes("TZS 100,000") || html.includes(">10%") || !html.includes(`>${esc(t.ctaApply)}<`)) wrong.push(`${l}: header, a figure or the button's words`);
  }
  ok("3.4 · RUN in sw, en and zh: every sentence the page sets in those bands is in the ghost, set and not shown inside a word bar (so it wraps where the page's does); the header prints its subtitle; no figure is printed (placeholders of the digit count)",
    wrong.length === 0, wrong.join(" | "));
  const gh = code(AGG);
  ok("3.5 · the case drawn is named and is today's programme: no VAT line and no fee hint (VAT-free), the lifetime and uncapped terms, the one Apply button of an eligible player",
    !gh.includes("feeVatPlus") && !gh.includes("statCostHint") && gh.includes("t.agent.earnLifetime") && gh.includes("t.agent.earnUncapped") && count(gh, "<ButtonGhost") === 1
      && raw(AGG).includes("THE PROGRAMME DRAWN IS TODAY'S") && raw(AGG).includes("THE PLAYER DRAWN IS THE ONE THIS PAGE IS FOR"));
}

/* ══ §4 · /agent/apply · /agent/status · /agent/invite ═════════════════════════════════════════════════════════════ */
section("4 · /agent/apply, /agent/status, /agent/invite: the pages' own bands, in order");
const AP = "src/app/agent/apply/apply-client.tsx", APP = "src/app/agent/apply/page.tsx", APG = "src/app/agent/apply/loading.tsx";
const ST = "src/app/agent/status/page.tsx", STG = "src/app/agent/status/loading.tsx";
const IV = "src/app/agent/invite/[token]/page.tsx", IVC = "src/app/agent/invite/[token]/invite-client.tsx", IVG = "src/app/agent/invite/[token]/loading.tsx";
const SP = "src/components/markets/stepped-progress.tsx";
const subPairs: Pair[] = [
  { band: "apply · the column", page: "space-y-5", pageFile: APP, ghost: "space-y-5", ghostFile: APG },
  { band: "apply · the form's column", page: "space-y-5", pageFile: AP, ghost: "space-y-5", ghostFile: APG },
  { band: "apply · the title row", page: "flex items-center justify-between gap-3", pageFile: AP, ghost: "flex items-center justify-between gap-3", ghostFile: APG },
  { band: "apply · the title", page: "font-display text-title-md font-bold leading-none", pageFile: AP, ghost: "font-display text-title-md font-bold leading-none", ghostFile: APG },
  { band: "apply · the progress bar", page: "flex gap-1.5", pageFile: SP, ghost: "flex gap-1.5", ghostFile: APG },
  { band: "apply · the step line's row", page: "mt-2 flex items-center justify-between", pageFile: AP, ghost: "mt-2 flex items-center justify-between", ghostFile: APG },
  { band: "apply · the step line", page: "font-mono text-micro uppercase eyebrow font-bold text-text-subtle", pageFile: AP, ghost: "font-mono text-micro uppercase eyebrow font-bold", ghostFile: APG },
  { band: "apply · the step buttons' grid", page: "mt-2 grid grid-cols-4 gap-1", pageFile: AP, ghost: "mt-2 grid grid-cols-4 gap-1", ghostFile: APG },
  { band: "apply · the step panel", page: "rounded-xl glass-panel p-4 space-y-3", pageFile: AP, ghost: "rounded-xl glass-panel p-4 space-y-3 text-transparent", ghostFile: APG },
  { band: "apply · the slots' grid", page: "grid grid-cols-1 gap-3 sm:grid-cols-2", pageFile: AP, ghost: "grid grid-cols-1 gap-3 sm:grid-cols-2", ghostFile: APG },
  { band: "apply · a slot's name", page: "block font-display text-body-sm font-semibold text-text", pageFile: AP, ghost: "block font-display text-body-sm font-semibold", ghostFile: APG },
  { band: "apply · the notes", page: "text-body-sm leading-relaxed text-text-muted", pageFile: AP, ghost: "text-body-sm leading-relaxed", ghostFile: APG },
  { band: "apply · the navigation", page: "flex items-center justify-between", pageFile: AP, ghost: "flex items-center justify-between", ghostFile: APG },
  { band: "status · the column", page: "space-y-5", pageFile: ST, ghost: "space-y-5", ghostFile: STG },
  { band: "status · where you are", page: "rounded-xl glass-panel p-4 space-y-3", pageFile: ST, ghost: "rounded-xl glass-panel p-4 space-y-3 text-transparent", ghostFile: STG },
  { band: "status · the reference beside its chip", page: "flex items-start justify-between gap-3", pageFile: ST, ghost: "flex items-start justify-between gap-3", ghostFile: STG },
  { band: "status · the reference", page: "font-mono text-body-sm text-text break-all", pageFile: ST, ghost: "font-mono text-body-sm break-all", ghostFile: STG },
  { band: "status · what happens next", page: "rounded-xl glass-panel p-4 space-y-2", pageFile: ST, ghost: "rounded-xl glass-panel p-4 space-y-2 text-transparent", ghostFile: STG },
  { band: "status · the terms", page: "space-y-1.5 text-body-sm leading-snug text-text-muted list-disc pl-4", pageFile: ST, ghost: "space-y-1.5 text-body-sm leading-snug list-disc pl-4", ghostFile: STG },
  { band: "invite · the column", page: "space-y-5", pageFile: IV, ghost: "space-y-5", ghostFile: IVG, n: 2, ghostN: 1 },
  { band: "invite · sent to", page: "rounded-xl glass-panel p-4 space-y-1", pageFile: IV, ghost: "rounded-xl glass-panel p-4 space-y-1 text-transparent", ghostFile: IVG },
  { band: "invite · the note", page: "text-body-sm leading-relaxed text-text-muted", pageFile: IV, ghost: "text-body-sm leading-relaxed text-transparent", ghostFile: IVG },
  { band: "invite · the actions", page: "space-y-3", pageFile: IVC, ghost: "space-y-3", ghostFile: IVG, n: 2, ghostN: 1 },
];
{
  const now = held(subPairs);
  ok(`4.1 · each band is the page's own box (${subPairs.length} class strings held): the form's title row, rail (the bar, its line, the four buttons), step panel, slots and notes, navigation; the status panels; the invitation's panel, note and action column`,
    now.length === 0, now.slice(0, 4).join(" | "));
  const ap = code(APG), st = code(STG), iv = code(IVG);
  const order = (s: string, needles: string[]) => needles.every((n, i) => s.indexOf(n) >= 0 && (i === 0 || s.indexOf(n) > s.indexOf(needles[i - 1])));
  ok("4.2 · the bands stand in the page's order — apply: back link, title row, rail, ONE step panel, navigation (no second panel); status: back link, PageHeader, the two panels; invite: PageHeader with its subtitle (no back link), panel, note, actions",
    order(ap, ["<BackLinkGhost />", "font-display text-title-md", 'className="mt-2 grid grid-cols-4 gap-1"', "glass-panel p-4 space-y-3", '<div className="flex items-center justify-between" aria-hidden>'])
      && count(ap, "glass-panel") === 1
      && order(st, ["<BackLinkGhost />", "<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.statusTitle} />", "glass-panel p-4 space-y-3", "glass-panel p-4 space-y-2"])
      && !iv.includes("BackLinkGhost") && order(iv, ["<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.inviteTitle} subtitle={t.agent.inviteBody} />", "glass-panel p-4 space-y-1", "t.agent.inviteKycNote", '<ButtonGhost size="lg" leading={16}>{t.agent.inviteOtpSend}</ButtonGhost>']));
  const both = (page: string, ghost: string, el: string) => REAL(page).includes(el) && REAL(ghost).includes(el);
  const headers = { status: both(ST, STG, "<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.statusTitle} />"), invite: both(IV, IVG, "<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.inviteTitle} subtitle={t.agent.inviteBody} />") };
  ok("4.3 · the status and invitation headers are the pages' own `PageHeader`, same props (the old ghost's 32px bar stood 22px short of the 54px header)", headers.status && headers.invite, j(headers));
  const plants: Array<[string, string, string, string]> = [
    ["the step buttons' grid gap", APG, '<div className="mt-2 grid grid-cols-4 gap-1">', '<div className="mt-2 grid grid-cols-4 gap-2">'],
    ["the status panel's rhythm", STG, '<section className="rounded-xl glass-panel p-4 space-y-3 text-transparent" aria-hidden>', '<section className="rounded-xl glass-panel p-4 space-y-2 text-transparent" aria-hidden>'],
    ["the invitation's actions apart", IVG, '<div className="space-y-3" aria-hidden>', '<div className="space-y-5" aria-hidden>'],
  ];
  const missed = plants.filter(([, f, from, to]) => held(subPairs, planted(f, from, to)).length === 0).map(([n]) => n);
  ok(`4.1′ PLANT · ${plants.map(([n]) => n).join(" · ")} — each reported`, missed.length === 0, missed.join(", "));
  const wrong: string[] = [];
  for (const l of LOCALES) {
    const t = dict[l].agent;
    const a = render(APG, l, "/agent/apply"), s = render(STG, l, "/agent/status"), v = render(IVG, l, "/agent/invite/tok");
    const miss = [...wordsIn(a, [t.stepWhere, t.stepReferees, t.stepPayment, t.docPhotoHint, t.docIdNote, t.slotEmpty]), ...wordsIn(s, [t.statusReference, t.nextTitle, t.nextDecision]), ...wordsIn(v, [t.inviteSentTo, t.inviteKycNote])];
    if (miss.length) wrong.push(`${l}: ${miss.slice(0, 3).join(" / ")}`);
    if (!a.includes(esc(t.applyTitle)) || !s.includes(esc(t.statusTitle)) || !v.includes(esc(t.inviteBody))) wrong.push(`${l}: a header`);
  }
  ok("4.4 · RUN in sw, en and zh: the step labels, notes and terms are the page's words set and not shown; the titles printed", wrong.length === 0, wrong.join(" | "));
}

/* ══ §5 · /leaderboard ═════════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · /leaderboard: ribbon, lens, sort, podium and the table with its head — no spinner box");
const LB = "src/app/leaderboard/page.tsx", LBG = "src/app/leaderboard/loading.tsx", RIB = "src/components/layout/page-ribbon.tsx";
const lbPairs: Pair[] = [
  { band: "the ribbon", page: ["rounded-xl border border-border bg-bg-elevated/60 px-4 py-3", "flex flex-wrap items-baseline gap-x-6 gap-y-2"], pageFile: RIB, ghost: "rounded-xl border border-border bg-bg-elevated/60 px-4 py-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-transparent", ghostFile: LBG },
  { band: "a ribbon stat", page: "flex items-baseline gap-2 min-w-0", pageFile: RIB, ghost: "flex items-baseline gap-2 min-w-0", ghostFile: LBG },
  { band: "a ribbon label", page: "font-mono text-micro uppercase eyebrow font-bold text-text-subtle whitespace-nowrap", pageFile: RIB, ghost: "font-mono text-micro uppercase eyebrow font-bold whitespace-nowrap", ghostFile: LBG },
  { band: "a ribbon figure", page: "font-mono text-body-lg font-bold tabular-nums whitespace-nowrap leading-none text-text", pageFile: RIB, ghost: "font-mono text-body-lg font-bold tabular-nums whitespace-nowrap leading-none", ghostFile: LBG },
  { band: "the lens", page: "flex flex-wrap items-center gap-1.5 -mx-1 px-1", pageFile: LB, ghost: "flex flex-wrap items-center gap-1.5 -mx-1 px-1", ghostFile: LBG },
  { band: "the podium", page: "rounded-xl glass-panel px-4 pt-6 pb-4", pageFile: LB, ghost: "rounded-xl glass-panel px-4 pt-6 pb-4 text-transparent", ghostFile: LBG },
  { band: "the podium's grid", page: "grid grid-cols-3 items-end gap-2 sm:gap-4", pageFile: LB, ghost: "grid grid-cols-3 items-end gap-2 sm:gap-4", ghostFile: LBG },
  { band: "a podium column's spacer", page: "mb-1 block h-[22px]", pageFile: LB, ghost: "mb-1 block h-[22px]", ghostFile: LBG },
  { band: "a podium handle row", page: "mt-2 flex max-w-full flex-col items-center gap-1 sm:flex-row sm:gap-1.5", pageFile: LB, ghost: "mt-2 flex max-w-full flex-col items-center gap-1 sm:flex-row sm:gap-1.5", ghostFile: LBG },
  { band: "a podium rate", page: "mt-0.5 font-mono text-[13px] font-bold tabular-nums text-text", pageFile: LB, ghost: "mt-0.5 font-mono text-[13px] font-bold tabular-nums", ghostFile: LBG },
  { band: "the table", page: "admin-tbl min-w-[640px]", pageFile: LB, ghost: "admin-tbl min-w-[640px]", ghostFile: LBG },
  { band: "the head", page: "border-b border-border bg-bg-overlay", pageFile: LB, ghost: "border-b border-border bg-bg-overlay", ghostFile: LBG },
  { band: "the head's row", page: "font-mono text-micro uppercase eyebrow text-text-subtle", pageFile: LB, ghost: "font-mono text-micro uppercase eyebrow", ghostFile: LBG },
  { band: "the rank head", page: "text-left p-3 w-14", pageFile: LB, ghost: "text-left p-3 w-[56px]", ghostFile: LBG },
  { band: "the stakes head (md)", page: "text-left p-3 hidden md:table-cell", pageFile: LB, ghost: "text-left p-3 hidden md:table-cell", ghostFile: LBG },
  { band: "a row", page: "border-b border-border last:border-b-0 transition-colors", pageFile: LB, ghost: "border-b border-border last:border-b-0", ghostFile: LBG },
  { band: "the predictor cell's row", page: "flex items-center gap-2", pageFile: LB, ghost: "flex items-center gap-2", ghostFile: LBG },
];
{
  const now = held(lbPairs);
  ok(`5.1 · every band is the page's own box (${lbPairs.length} class strings held — the ribbon's from PageRibbon): ribbon, lens, podium and its columns, the admin-tbl table with its head and rows (the table's own CSS pads them, 10px over the head, 12 over each row)`,
    now.length === 0, now.slice(0, 4).join(" | "));
  const g = code(LBG), pg = code(LB);
  const order = ["<PageHeader eyebrow={t.leaderboard.title} title={t.leaderboard.topPredictors} />", "gap-x-6 gap-y-2", '-mx-1 px-1', "cn(QUERY_BAR_ROW2_CLASS, \"py-0\")", "<PodiumGhost />", "admin-tbl min-w-[640px]"].map((n) => g.indexOf(n));
  const scroller = pg.includes('<ScrollX label="Leaderboard" className="rounded-xl glass-panel">') && code("src/components/ui/scroll-x.tsx").includes('"scrollx overflow-x-auto rounded-md"') && g.includes('className="scrollx overflow-x-auto rounded-xl glass-panel text-transparent"');
  ok("5.2 · the bands stand in the page's order — header, ribbon, lens, the sort on its own `py-0` row, podium, the table in ScrollX's own scroller (`scrollx overflow-x-auto`, the page's glass) — and the spinner box the page does not have is gone",
    order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])) && !/BrandSpinner|t\.common\.loading/.test(g) && pg.includes("<div className={cn(QUERY_BAR_ROW2_CLASS, \"py-0\")}>") && scroller, j({ order, scroller }));
  const { PLAYER_PER_PAGE } = req("../src/components/ui/pagination.tsx") as { PLAYER_PER_PAGE: number };
  const html = render(LBG, "sw", "/leaderboard");
  const rows = count(html.slice(html.indexOf("<tbody>")), "<tr ");
  ok(`5.3 · RUN: the table draws its head and ${rows} rows (a page, PLAYER_PER_PAGE), each row's tallest boxes the page's — the 28px crest (Avatar sm) and, from 768, the 32px sparkline; the podium's crests 56 and 48 (Avatar xl, lg)`,
    rows === PLAYER_PER_PAGE && html.includes("<thead") && count(html, "crest-holder h-[28px] w-[28px]") === PLAYER_PER_PAGE && html.includes("h-[32px] w-[140px]")
      && html.includes("crest-holder h-[56px] w-[56px]") && count(html, "crest-holder h-[48px] w-[48px]") === 2
      && pg.includes('<Avatar initials={r.handle.slice(0, 2)} size="sm"') && pg.includes("width={140} height={32}") && pg.includes('size={first ? "xl" : "lg"}'));
  const lens = (req("../src/lib/leaderboard/board.ts") as { LEADER_PRODUCTS: readonly string[] }).LEADER_PRODUCTS;
  const pills = count(html.slice(html.indexOf("-mx-1 px-1"), html.indexOf("kp-qbar-row")), "inline-flex min-h-[44px]");
  ok(`5.4 · RUN: the lens draws ${pills} pills — the page's ${lens.length} (\`LEADER_PRODUCTS\`), their words set and not shown`, pills === lens.length && html.includes(esc(dict.sw.common.markets)));
  // The podium's case (the ghost's note): the measured board's — the two beside the leader on a hot streak, the leader not;
  // the columns stand #2, #1, #3. The page draws the streak's line only for a player on one.
  const podium = html.slice(html.indexOf("grid grid-cols-3 items-end"), html.indexOf("admin-tbl"));
  const streakIn = podium.split("flex min-w-0 flex-col items-center text-center").slice(1).map((c) => c.includes("h-[21px] w-[72px]"));
  ok(`5.5 · RUN: the podium drawn is the measured board's (tiles 177, 178, 203) — a hot streak's line beside the leader and none in its column (#2, #1, #3: ${streakIn.join(", ")}), so the band is a neighbour's column, as the page's was (235.5px at 1280); the page draws the line only for a player on a streak`,
    streakIn.length === 3 && streakIn[0] && !streakIn[1] && streakIn[2] && pg.includes('{r.streak > 0 && <span className="mt-1"><HotChip streak={r.streak} t={t} /></span>}'), j({ streakIn }));
  const plants: Array<[string, string, string]> = [
    ["the podium's padding", '<section className="rounded-xl glass-panel px-4 pt-6 pb-4 text-transparent" aria-hidden>', '<section className="rounded-xl glass-panel p-4 text-transparent" aria-hidden>'],
    ["the ribbon's rung", "px-4 py-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-transparent", "px-4 py-2 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-transparent"],
  ];
  const missed = plants.filter(([, from, to]) => held(lbPairs, planted(LBG, from, to)).length === 0).map(([n]) => n);
  ok(`5.1′ PLANT · ${plants.map(([n]) => n).join(" · ")} — each reported`, missed.length === 0, missed.join(", "));
}

/* ══ §6 · /results ═════════════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · /results: row 2 from lg in the page's words; the carousel the notable card's own box; the grid's count");
const RS = "src/app/results/page.tsx", RSG = "src/app/results/loading.tsx", RB = "src/app/results/results-bar.tsx", NC = "src/app/results/notable-carousel.tsx";
const rsPairs: Pair[] = [
  { band: "the header row", page: "flex items-center justify-between gap-3", pageFile: RS, ghost: "flex items-center justify-between gap-3", ghostFile: RSG },
  { band: "the eyebrow's group", page: "flex items-center gap-2.5", pageFile: RS, ghost: "flex items-center gap-[10px]", ghostFile: RSG },
  { band: "the carousel", page: "mb-5", pageFile: NC, ghost: "mb-5", ghostFile: RSG },
  { band: "the arrows' row", page: "mb-2 flex items-center justify-end gap-2", pageFile: NC, ghost: "mb-2 flex items-center justify-end gap-2", ghostFile: RSG },
  { band: "the dots' row", page: "mt-2.5 flex items-center justify-center", pageFile: NC, ghost: "mt-[10px] flex items-center justify-center", ghostFile: RSG },
  { band: "a dot's target", page: "grid h-[40px] w-[24px] place-items-center rounded-md", pageFile: NC, ghost: "grid h-[40px] w-[24px] place-items-center", ghostFile: RSG },
  { band: "the notable card", page: "group relative block overflow-hidden rounded-xl border bg-bg-elevated p-5 lg:p-6", pageFile: RS, ghost: "relative block overflow-hidden rounded-xl border border-border bg-bg-elevated p-5 lg:p-6 kp-shimmer-track text-transparent", ghostFile: RSG },
  { band: "its chip row", page: "mb-3 flex flex-wrap items-center gap-2", pageFile: RS, ghost: "mb-3 flex flex-wrap items-center gap-2", ghostFile: RSG },
  { band: "its flag", page: "ml-auto inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.16em] font-bold text-brand-300", pageFile: RS, ghost: "ml-auto inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.16em] font-bold", ghostFile: RSG },
];
{
  const now = held(rsPairs);
  // The card's own boxes beyond the pairs: the title's type and margin, the 28px bar with its 24.5px label row.
  const card = code(RSG);
  const title = card.includes("mb-4 max-w-[70ch] font-display text-[18px] lg:text-[22px] font-semibold leading-tight") && REAL(RS).includes('className="mb-4 max-w-[70ch] font-display text-[18px] lg:text-[22px] font-semibold leading-tight');
  const bar = card.includes('<div className="h-[28px] w-full rounded-full bg-bg-overlay" />') && card.includes('<div className="mt-1.5 h-[16.5px]" />') && REAL(RS).includes("<TippingBar yesPct={price.yesPct} height={28} showLabels");
  ok(`6.1 · the carousel is the page's own stack — NotableCarousel's arrows, slide and dots, FeaturedResult's card, chip row and flag (${rsPairs.length} class strings held), its title's type and margin, the 28px bar and its label row (8 + 16.5) — and the 458px reservation is gone`,
    now.length === 0 && title && bar && !card.includes("458"), now.slice(0, 3).join(" | ") || j({ title, bar }));
  const judge = card.includes("min-h-[calc(3*1.25*18px)] sm:min-h-[calc(2*1.25*18px)] md:min-h-[calc(1.25*18px)] lg:min-h-[calc(1.25*22px)]") && raw(RSG).includes("N/(N+1) quantile, here the 75th percentile");
  ok("6.2 · the one judgement left is the title's line count, written as the arithmetic and named: three lines on a phone, two from 640, one from 768 (22px from 1024) — the tallest of three notable titles, on the one rule (the N/(N+1) quantile) /live's hero takes for six", judge);
  const g = REAL(RSG), b = REAL(RB);
  const groups = ['<GroupGhost label={t.market.gameKey}>', '<GroupGhost label={t.common.when}>', '<GroupGhost label={t.common.topic}>'].map((x) => g.indexOf(x));
  const pageGroups = ["<FilterGroupKey>{t.market.gameKey}</FilterGroupKey>", "<FilterGroupKey>{t.common.when}</FilterGroupKey>", "<FilterGroupKey>{t.common.topic}</FilterGroupKey>"].map((x) => b.indexOf(x));
  ok("6.3 · row 2 is the page's: the sort (filling a phone's row, its own width from lg), the phone's Filters button, then the game, window and topic groups in ResultsBar's order, each behind the page's divider (the row's 29px gap is keyed on it)",
    groups.every((x, i) => x > 0 && (i === 0 || x > groups[i - 1])) && pageGroups.every((x, i) => x > 0 && (i === 0 || x > pageGroups[i - 1]))
      && count(g.slice(g.indexOf("<SortGhost label={t.common.sort} value={t.results.sortNewest} />")), "<QueryGroupDivider />") === 3 && count(b, "<QueryGroupDivider />") === 3
      && g.includes("<FiltersGhost label={t.market.filtersOpen} />"), j({ groups, pageGroups }));
  const { MARKET_CATEGORIES } = req("../src/lib/markets/categories.ts") as { MARKET_CATEGORIES: readonly string[] };
  const { categoryLabel } = req("../src/lib/markets/category-label.ts") as { categoryLabel: (t: unknown, c: string) => string };
  const { sideWord } = req("../src/lib/side-label.ts") as { sideWord: (t: unknown, s: string, l: string) => string };
  const wrong: string[] = [];
  for (const l of LOCALES) {
    const t = dict[l];
    const html = render(RSG, l, "/results");
    const row2 = html.slice(html.indexOf("kp-qbar-row"));
    const want = [t.market.catAll, `${sideWord(t, "YES", "MARKET")} / ${sideWord(t, "NO", "MARKET")}`, `${sideWord(t, "YES", "UPDOWN")} / ${sideWord(t, "NO", "UPDOWN")}`,
      t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll, ...MARKET_CATEGORIES.map((c) => categoryLabel(t, c))];
    let at = 0;
    for (const w of want) { const i = row2.indexOf(`${esc(w)}<span class="font-mono text-[11px] font-bold tabular-nums">00</span>`, at); if (i < 0) { wrong.push(`${l}: ${w}`); break; } at = i; }
  }
  ok("6.4 · RUN in sw, en and zh: row 2's pills carry the page's words in the page's order — the three games, the five windows, the eight topics — each with its count's two-digit room", wrong.length === 0, wrong.slice(0, 3).join(" | "));
  const plants: Array<[string, string, string]> = [
    ["the card's padding from lg", "relative block overflow-hidden rounded-xl border border-border bg-bg-elevated p-5 lg:p-6 kp-shimmer-track text-transparent", "relative block overflow-hidden rounded-xl border border-border bg-bg-elevated p-5 kp-shimmer-track text-transparent"],
    ["the dots a rung closer", "mt-[10px] flex items-center justify-center", "mt-2 flex items-center justify-center"],
  ];
  const missed = plants.filter(([, from, to]) => held(rsPairs, planted(RSG, from, to)).length === 0).map(([n]) => n);
  ok(`6.1′ PLANT · ${plants.map(([n]) => n).join(" · ")} — each reported`, missed.length === 0, missed.join(", "));
}

/* ══ §7 · /markets ═════════════════════════════════════════════════════════════════════════════════════════════════ */
section("7 · /markets: row 2 from lg in the page's words; the bar and the grid are the page's fallback");
{
  const g = REAL("src/app/markets/loading.tsx"), d = REAL("src/components/markets/discovery-bar.tsx");
  const ghostOrder = ["<SortGhost label={t.common.sort} value={t.market.sortPool} />", "<FiltersGhost label={t.market.filtersOpen} />", "<GroupGhost label={t.market.oddsKey}>", "<GroupGhost label={t.market.poolKey}>", "<MenuGhost label={t.common.topic} value={t.market.catAll} />"].map((x) => g.indexOf(x));
  const pageOrder = ["<QuerySort label={t.common.sort}", "<FilterSheet label={t.market.filtersOpen}", "<FilterGroupKey>{t.market.oddsKey}</FilterGroupKey>", "<FilterGroupKey>{t.market.poolKey}</FilterGroupKey>", "<MenuShell rootClassName=\"hidden max-w-full lg:block\" label={t.common.topic}"].map((x) => d.indexOf(x));
  ok("7.1 · row 2 is the page's: the sort (its cell `data-bar-cell`), the phone's Filters, then the odds and pool groups and the topic menu in DiscoveryBar's order, each behind the page's divider; the pool's floors set as money (`amount`)",
    ghostOrder.every((x, i) => x > 0 && (i === 0 || x > ghostOrder[i - 1])) && pageOrder.every((x, i) => x > 0 && (i === 0 || x > pageOrder[i - 1]))
      && count(g, "<QueryGroupDivider />") === 3 && count(d, "<QueryGroupDivider />") === 3 && count(g, "amount />") === 2 && d.includes('<span className="amount">{formatTzsCompact(POOL_FLOORS[p])}+</span>')
      && !/\[56, 92, 88, 84\]/.test(g), j({ ghostOrder, pageOrder }));
  const html = inApp("/markets", "sw", h((req("../src/app/markets/loading.tsx") as { MarketsBoardGhost: unknown }).MarketsBoardGhost as never));
  const t = dict.sw;
  const words = [t.market.oddsAny, t.market.oddsCall, t.market.oddsCont, t.market.oddsLong, t.market.poolAny, "TZS 10K+", "TZS 50K+"];
  const miss = words.filter((w) => !html.includes(esc(w)));
  ok("7.2 · RUN: the groups' pills carry the page's words (four odds, the pool's \"Any\" and its two floors through the money formatter), the menu its key and value", miss.length === 0 && html.includes(esc(t.common.topic)) && html.includes(esc(t.market.catAll)), miss.join(", "));
  const { STATUS_PILL_W } = req("../src/app/markets/loading.tsx") as { STATUS_PILL_W: number[] };
  ok("7.3 · row 1 keeps its six per-status widths (`test:board-discovery` §7 counts them) — row 1 never wraps: a scrolling strip below lg, and one line from it", STATUS_PILL_W.length === 6 && g.includes("{STATUS_PILL_W.map("));
}

/* ══ §7b · /updown/history (added 2026-10-10, R5-L's note for the integrator) ══════════════════════════════════════ */
section("7b · /updown/history: the bar on the kit — the lenses and the windows in the page's own words and order, row 2's sort, Filters and groups behind the page's dividers");
{
  const G = "src/app/updown/history/history-ghost.tsx", B = "src/app/updown/history/history-bar.tsx";
  const b = code(B);
  const { UD_LENSES, UD_WHEN_IDS } = req("../src/lib/updown/history-query.ts") as { UD_LENSES: readonly string[]; UD_WHEN_IDS: readonly string[] };
  // The page's own label functions, read as data: each `case "<id>": return t.<path>;`, taken in the order of the ids' lists.
  const cases = (fn: string) => {
    const body = new RegExp(`function ${fn}\\(t: Dict, \\w+: \\w+\\): string \\{([\\s\\S]*?)\\n\\}`).exec(b)?.[1] ?? "";
    return new Map([...body.matchAll(/case "(\w+)": return (t\.[\w.]+);/g)].map((m) => [m[1], m[2]] as const));
  };
  const lensPaths = UD_LENSES.map((id) => cases("lensLabel").get(id) ?? "?"), whenPaths = UD_WHEN_IDS.map((id) => cases("whenLabel").get(id) ?? "?");
  const list = (src: string, name: string) => new RegExp(`const ${name} = \\[([^\\]]+)\\];`).exec(src)?.[1].split(",").map((s) => s.trim()) ?? [];
  ok(`7b.1 · the drawing's lenses are the page's six, in \`UD_LENSES\`' order (${lensPaths.join(", ")}), and its windows the page's five (\`UD_WHEN_IDS\`) — read from \`lensLabel\` and \`whenLabel\` themselves`,
    UD_LENSES.length === 6 && UD_WHEN_IDS.length === 5 && j(list(code(G), "lenses")) === j(lensPaths) && j(list(code(G), "windows")) === j(whenPaths), j({ lensPaths, ghost: list(code(G), "lenses") }));
  const order = (src: string, parts: string[]) => { const at = parts.map((p) => src.indexOf(p)); return at.every((x, i) => x > 0 && (i === 0 || x > at[i - 1])) ? "" : j(at); };
  const GHOST2 = ["<div className={QUERY_STRIP_CLASS}>", '<CountGhost count={t.market.udNRounds.replace("{n}", "00")} />', "<SortGhost label={t.common.sort} value={t.positions.sortRecent} />",
    "<FiltersGhost label={t.market.filtersOpen} />", "<GroupGhost label={t.market.udAssets}>", "<GroupGhost label={t.market.udDurations}>", "<GroupGhost label={t.common.when}>"];
  const PAGE2 = ["<QueryStrip ariaLabel={t.market.udHistoryTitle}>", "<QueryResultCount count={resultCount} phrase={resultPhrase} />", "<QuerySort label={t.common.sort}", "<FilterSheet label={t.market.filtersOpen}",
    "<FilterGroupKey>{t.market.udAssets}</FilterGroupKey>", "<FilterGroupKey>{t.market.udDurations}</FilterGroupKey>", "<FilterGroupKey>{t.common.when}</FilterGroupKey>"];
  const g2 = order(REAL(G), GHOST2), p2 = order(squash(b), PAGE2);
  ok("7b.2 · the bar is the page's: the lens strip in the strip's own class beside the count's phrase, then the sort (its default \"most recent\", `sortLabel`'s), the phone's Filters, and the asset, duration and day groups each behind the page's divider — in `HistoryBar`'s order, with no typed box left",
    g2 === "" && p2 === "" && count(REAL(G), "<QueryGroupDivider />") === 3 && count(squash(b), "<QueryGroupDivider />") === 3 && cases("sortLabel").get("recent") === "t.positions.sortRecent"
      && !/\[56, 76, 76, 76\]|w-\[180px\]|w-\[104px\]/.test(REAL(G)), j({ g2, p2 }));
  const wrong: string[] = [];
  for (const l of LOCALES) {
    const t = dict[l], html = inApp("/updown/history", l, h((req(`../${G}`) as { UpDownHistoryGhost: unknown }).UpDownHistoryGhost as never));
    const words = [t.common.all, t.market.udInPlay, t.market.udUpWins, t.market.udDownWins, t.market.udVoided, t.market.udConfirmingPrice,
      t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll, t.market.udAssets, t.market.udDurations, t.common.when];
    const missing = words.filter((w) => !html.includes(esc(w)));
    if (missing.length || !html.includes(esc(t.market.udNRounds.replace("{n}", "00")))) wrong.push(`${l}: ${missing.slice(0, 3).join(" / ") || "the count's phrase"}`);
  }
  ok("7b.3 · RUN in sw, en and zh: every lens, window and group key is drawn in the page's words (set and not shown, so each pill is the page's width), and the count's phrase holds two digits' room",
    wrong.length === 0, wrong.join(" | "));
  const planted = order(squash(decomment(raw(G).replace("<SortGhost label={t.common.sort} value={t.positions.sortRecent} />", '<div className="h-[44px] w-[180px] rounded-pill bg-bg-elevated kp-shimmer-track" />'))), GHOST2);
  ok("7b.2′ PLANT · the old typed 180px sort box back in place of the page's sort is reported", planted !== "");
}

/* ══ §8 · /live ════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("8 · /live: the hero IS PageHero; the CTA row the page's button and six dots; each card the PulseCard's box per language");
const LV = "src/app/live/page.tsx", LVG = "src/app/live/loading.tsx", FC = "src/app/live/featured-contest.tsx", PG = "src/app/live/pulse-grid.tsx";
const lvPairs: Pair[] = [
  { band: "the CTA row", page: "mt-4 flex flex-wrap items-center gap-3", pageFile: FC, ghost: "mt-4 flex flex-wrap items-center gap-3", ghostFile: LVG },
  { band: "a dot's target", page: "grid h-[40px] w-[24px] place-items-center rounded-md", pageFile: FC, ghost: "grid h-[40px] w-[24px] place-items-center", ghostFile: LVG },
  { band: "a card", page: "kp-rise group flex flex-col rounded-xl border border-border bg-bg-elevated p-4 transition-colors hover:border-border-strong", pageFile: PG, ghost: "kp-shimmer-track flex flex-col rounded-xl border border-border bg-bg-elevated p-4 text-transparent", ghostFile: LVG },
  { band: "a card's tag row", page: "mb-2 flex items-center justify-between gap-2", pageFile: PG, ghost: "mb-2 flex items-center justify-between gap-2", ghostFile: LVG },
  { band: "a card's tag", page: "inline-flex items-center gap-1.5 font-mono text-micro uppercase eyebrow text-text-subtle", pageFile: PG, ghost: "inline-flex items-center gap-1.5 font-mono text-micro uppercase eyebrow", ghostFile: LVG },
];
{
  const now = held(lvPairs);
  const g = REAL(LVG), p = REAL(LV), pg = REAL(PG);
  ok(`8.1 · the hero is the page's own \`PageHero\`, the page's props (glow, watermark; its padding PageHero's own), and the CTA row, dots and cards are the page's boxes (${lvPairs.length} class strings held)`,
    now.length === 0 && g.includes('<PageHero glow="aqua" watermark={200}>') && p.includes('<PageHero glow="aqua" watermark={200}>'), now.join(" | "));
  const take = /export function liveContest<[^>]+>\(rows: readonly T\[\], take = (\d+)\)/.exec(code("src/lib/markets/live-contest.ts"))?.[1];
  ok(`8.2 · the CTA is the page's button (\`.btn .btn-md\`, "Open market" in it) and the rail is ${take} dots — \`liveContest\`'s take — so the row breaks where the page's does`,
    g.includes('<ButtonGhost size="md">{t.market.openMarket}</ButtonGhost>') && code(FC).includes('className="btn btn-primary btn-md inline-flex"') && g.includes(`Array.from({ length: ${take} })`) && !g.includes("w-[150px]"), take);
  const wrong: string[] = [];
  for (const l of LOCALES) {
    const html = render(LVG, l, "/live");
    const want = l === "sw" ? "min-h-[4.125em]" : "min-h-[2.75em]", not = l === "sw" ? "min-h-[2.75em]" : "min-h-[4.125em]";
    if (count(html, want) !== 8 || html.includes(not) || html.includes("height:180px")) wrong.push(l);
  }
  const pageMin = pg.includes('locale === "sw" ? "min-h-[4.125em] line-clamp-3" : "min-h-[2.75em] line-clamp-2"') && pg.includes("font-display text-[13.5px] font-semibold leading-snug");
  ok("8.3 · RUN: each of the wall's eight cards takes the page's own title minimum for the language — three snug lines in Swahili, two in English and Chinese, at 13.5px — where the ghost drew 180px in all three",
    wrong.length === 0 && pageMin && g.includes("font-display text-[13.5px] font-semibold leading-snug"), wrong.join(", "));
  // The hero's question stack: the tallest of six titles on the one rule (`results/loading.tsx` takes it for three) —
  // four lines below 360 in Swahili and three elsewhere on a phone, two from 640, at 24px from 1024; never six again.
  const stack = (l: Locale) => /<div class="mb-4 (min-h-\[calc[^"]*lg:min-h-\[calc\(2\*1\.25\*24px\)\])">/.exec(render(LVG, l, "/live"))?.[1] ?? "";
  const sw = stack("sw"), en = stack("en"), zh = stack("zh");
  ok("8.4 · RUN: the hero's question stack is the tallest of six titles on the one rule — four lines below 360 in Swahili, three in English and Chinese, three to 639, two from 640 (24px from 1024) — where it held six on a phone and three from lg (95px over today's board at 390, 30 at 1280)",
    sw === "min-h-[calc(4*1.25*19px)] xs:min-h-[calc(3*1.25*19px)] sm:min-h-[calc(2*1.25*19px)] lg:min-h-[calc(2*1.25*24px)]"
      && en === "min-h-[calc(3*1.25*19px)] sm:min-h-[calc(2*1.25*19px)] lg:min-h-[calc(2*1.25*24px)]" && zh === en
      && raw(LVG).includes("N/(N+1) quantile") && !g.includes("calc(6*1.25*19px)") && code(FC).includes('<div className="kp-slide-stack mb-4">'), j({ sw, en, zh }));
  const plants: Array<[string, string, string]> = [
    ["the CTA row's gap", '<div className="mt-4 flex flex-wrap items-center gap-3">', '<div className="mt-4 flex flex-wrap items-center gap-2">'],
    ["a card's padding", "kp-shimmer-track flex flex-col rounded-xl border border-border bg-bg-elevated p-4 text-transparent", "kp-shimmer-track flex flex-col rounded-xl border border-border bg-bg-elevated p-3 text-transparent"],
  ];
  const missed = plants.filter(([, from, to]) => held(lvPairs, planted(LVG, from, to)).length === 0).map(([n]) => n);
  ok(`8.1′ PLANT · ${plants.map(([n]) => n).join(" · ")} — each reported`, missed.length === 0, missed.join(", "));
}

/* ══ §9 · THE KITS ═════════════════════════════════════════════════════════════════════════════════════════════════ */
section("9 · the kits: each ghost part against the page's own component it stands for");
const QBG = "src/components/ui/query-bar-ghost.tsx";
function kitChecks(src: Src): Record<string, boolean> {
  const k = src(KIT), q = src(QBG), qs = src("src/components/ui/query-bar.tsx"), ms = src("src/components/markets/menu-shell.tsx"), fs = src("src/components/markets/filter-sheet.tsx");
  const css = raw("src/app/globals.css");
  const sortWrap = qs.includes('<div className="flex min-w-0 flex-1 items-center lg:flex-none" data-bar-cell="sort">');
  const sortRoot = qs.includes('rootClassName="min-w-0 shrink [&>summary]:gap-1.5 [&>summary]:px-1.5 lg:[&>summary]:gap-2 lg:[&>summary]:px-3"');
  const sortKey = qs.includes('labelClassName="hidden lg:inline"') && qs.includes('className="w-full min-w-[var(--tap-min)] rounded-l-pill rounded-r-none border-r-0"');
  return {
    // R5-K's GhostText, to the character (`test:visual-pass-r5k` §0.1 holds the same code in `ghost-text.tsx`).
    words: k.includes('export const GHOST_TEXT_CLASS = "select-none rounded-sm bg-bg-overlay text-transparent box-decoration-clone";')
      && k.includes("export function GhostText({ children, className }: { children: ReactNode; className?: string }) { return <span aria-hidden className={cn(GHOST_TEXT_CLASS, className)}>{children}</span>; }"),
    button: k.includes('"btn", size === "lg" ? "btn-lg" : "btn-md"') && /\.btn-md \{ height: var\(--h-control-md\);/.test(css) && /\.btn-lg \{ height: var\(--h-control-lg\);/.test(css),
    // R5-K's ChipGhost: the kit Chip with the page's size and metrics row, its ink and edge cleared.
    chip: k.includes('const GHOST_CHIP: CSSProperties = { background: "var(--bg-overlay)", borderColor: "transparent", color: "transparent" };')
      && k.includes('<Chip aria-hidden size={size} metrics={metrics ?? "base"} className="select-none" style={nowrap ? { ...GHOST_CHIP, whiteSpace: "nowrap" } : GHOST_CHIP}>'),
    count: q.includes('<p className="shrink-0 font-mono text-[11.5px] tabular-nums text-transparent"><span className="rounded bg-bg-overlay">{count}</span></p>')
      && qs.includes('className="shrink-0 font-mono text-[11.5px] tabular-nums text-text-subtle"'),
    sort: sortWrap && sortRoot && sortKey && q.includes('<div className="flex min-w-0 flex-1 items-center lg:flex-none" data-bar-cell="sort">')
      && q.includes("inline-flex min-h-[44px] w-full min-w-[var(--tap-min)] items-center justify-center gap-1.5 rounded-l-pill border border-r-0 border-transparent bg-bg-elevated px-1.5 text-transparent lg:gap-2 lg:px-3")
      && q.includes('<span className="hidden shrink-0 font-mono text-micro font-bold uppercase eyebrow lg:inline">') && q.includes("h-[44px] w-[44px] shrink-0 rounded-r-pill"),
    menu: ms.includes('"inline-flex min-h-[44px] shrink-0 cursor-pointer list-none items-center justify-center gap-2 border border-border-control bg-bg-inset px-3 text-text-muted hover:text-text"')
      && q.includes('<div className="hidden max-w-full shrink-0 lg:block">') && q.includes("inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-pill border border-transparent bg-bg-elevated px-3 text-transparent"),
    filters: fs.includes('className="kp-fsheet lg:hidden"') && fs.includes('className="kp-fsheet-trigger cursor-pointer list-none items-center border border-border-control bg-bg-inset font-semibold text-text-muted hover:text-text"')
      && q.includes('<div className="kp-fsheet lg:hidden">') && q.includes('<span className="kp-fsheet-trigger kp-shimmer-track items-center border border-transparent bg-bg-elevated font-semibold text-transparent" data-shape="pill">')
      && q.includes('<span className="kp-fsheet-trigger-label">{label}</span>') && q.includes('<span className="kp-fsheet-caret h-[14px] w-[14px] shrink-0" />'),
    group: q.includes("<div className={QUERY_GROUP_CLASS}>") && q.includes('<FilterGroupKey className="text-transparent">{label}</FilterGroupKey>'),
  };
}
{
  const now = kitChecks(REAL);
  ok("9.1 · the kits stand for the page's own parts: GhostText (R5-K's words bar), ButtonGhost (`.btn` and its rung — 44/48px), ChipGhost (R5-K's kit chip, its words not shown), and the bar ghost's count (QueryResultCount's type), sort (QuerySort's wrapper, its per-breakpoint padding and gap, the key from lg), menu (MenuShell's summary), Filters (FilterSheet's root and trigger, label and caret by their own classes, so the phone bar folds them) and group (QUERY_GROUP_CLASS and the key)",
    Object.values(now).every(Boolean), j(now));
  const plants: Array<[string, string, string, string]> = [
    ["sort", QBG, "px-1.5 text-transparent lg:gap-2 lg:px-3", "px-3 text-transparent lg:gap-2 lg:px-3"],
    ["menu", QBG, '<div className="hidden max-w-full shrink-0 lg:block">', '<div className="max-w-full shrink-0">'],
    ["filters", QBG, '<span className="kp-fsheet-trigger-label">{label}</span>', "<span>{label}</span>"],
    ["button", KIT, '"btn", size === "lg" ? "btn-lg" : "btn-md"', '"btn", "btn-md"'],
    ["words", KIT, 'text-transparent box-decoration-clone";', 'text-transparent";'],
    ["chip", KIT, 'metrics={metrics ?? "base"}', 'metrics="base"'],
    ["count", QBG, 'text-[11.5px] tabular-nums text-transparent', 'text-[11px] tabular-nums text-transparent'],
  ];
  const missed = plants.filter(([k, f, from, to]) => kitChecks(planted(f, from, to))[k] !== false).map(([k]) => k);
  ok(`9.1′ PLANT · each kit part broken in memory (${plants.map(([k]) => k).join(", ")}) is reported by its own check`, missed.length === 0, missed.join(", "));
  const moneyBar = code("src/app/wallet/money-bar-ghost.tsx");
  ok("9.2 · ONE pill and ONE count: the money books' bar ghost draws the kit's `PillGhost` and `CountGhost` (moved from it), and no other file defines either",
    // (2026-10-10: and the kit's `FiltersGhost`, the phone's Filters button.)
    moneyBar.includes('import { CountGhost, FiltersGhost, PillGhost } from "@/components/ui/query-bar-ghost";')
      && walk("src").filter((p) => /\.tsx$/.test(p) && /function (?:PillGhost|CountGhost)\b/.test(code(p))).join() === QBG);
  // ⭐ (2026-10-10) THE SORT AND THE PHONE'S FILTERS ARE THE KIT'S IN EVERY PLAYER DRAWING: a hand-drawn sort
  // (`rounded-l-pill`) sat at its content's width where the page's fills a phone's cell, and a typed 104px box stood for
  // the Filters trigger in /positions', /updown/history's and the money books' drawings.
  const drawings = walk("src").filter((p) => /\.tsx$/.test(p) && !/\/admin\//.test(p) && (/\/loading\.tsx$/.test(p) || /-ghost\.tsx$/.test(p)) && p !== QBG);
  const hand = (src: (p: string) => string) => drawings.filter((p) => /rounded-l-pill|h-\[44px\] w-\[104px\] rounded-pill/.test(src(p)));
  ok(`9.3 · every player drawing's sort and phone Filters are the kit's (\`SortGhost\`, \`FiltersGhost\`) — ${drawings.length} drawings, none hand-drawing either`,
    hand(code).length === 0 && drawings.length > 30, j(hand(code)));
  ok("9.3′ PLANT · the money books' typed 104px Filters box back is reported",
    j(hand((p) => (p.endsWith("money-bar-ghost.tsx") ? code(p).replace("<FiltersGhost label={t.market.filtersOpen} />", '<div className="h-[44px] w-[104px] rounded-pill bg-bg-overlay kp-shimmer-track lg:hidden" />') : code(p)))) === j(["src/app/wallet/money-bar-ghost.tsx"]));
}

/* ══ §10 · THE MEASURE ═════════════════════════════════════════════════════════════════════════════════════════════ */
section("10 · the measure: the wraps the old ghosts missed, re-derived from the repo's fonts — controls on the old boxes");
{
  // The repo's own faces (fontkit): Inter 600 as the mean of Medium and Bold (R5-H's rule), JetBrains Mono 0.6em. They read
  // up to ~3% wide of the served faces (S/r5l/fonts.cts calibrates on tile 170), so every verdict here keeps that margin.
  const fontkit = req("fontkit") as { openSync: (p: string) => { layout: (s: string) => { glyphs: Array<{ advanceWidth: number }> }; unitsPerEm: number } };
  const F = (n: string) => fontkit.openSync(`src/lib/server/reports/fonts/${n}`);
  const interM = F("Inter-Medium.ttf"), interB = F("Inter-Bold.ttf");
  const w = (font: ReturnType<typeof F>, s: string, px: number) => font.layout(s).glyphs.reduce((a, g) => a + g.advanceWidth, 0) / font.unitsPerEm * px;
  const HAN = /[　-鿿＀-￯]/;
  const sans = (s: string, px: number) => [...s].reduce((a, ch) => a + (HAN.test(ch) ? px : (w(interM, ch, px) + w(interB, ch, px)) / 2), 0);
  const mono = (s: string, px: number, ls = 0) => [...s].reduce((a, ch) => a + (HAN.test(ch) ? px : 0.6 * px) + ls, 0);
  const pill = (s: string, glyph = false) => 2 + 32 + sans(s, 13) + (glyph ? 22 : 0) + 8 + 13.2;
  const key = (s: string) => mono(s.toUpperCase(), 10, 1.4) + 2;
  const sort = (k: string, v: string) => 1 + 16 + mono(k.toUpperCase(), 10, 1.4) + 12 + sans(v, 13) + 12 + 14 + 16 + 44;
  const group = (k: string, ps: number[]) => key(k) + 4 + ps.reduce((a, b) => a + b + 4, -4);
  const lines = (items: number[], room: number, gap: number) => { let n = 1, x = 0; for (const it of items) { if (x > 0 && x + gap + it > room) { n++; x = it; } else x = x === 0 ? it : x + gap + it; } return n; };
  const { MARKET_CATEGORIES } = req("../src/lib/markets/categories.ts") as { MARKET_CATEGORIES: readonly string[] };
  const { categoryLabel } = req("../src/lib/markets/category-label.ts") as { categoryLabel: (t: unknown, c: string) => string };
  const { sideWord } = req("../src/lib/side-label.ts") as { sideWord: (t: unknown, s: string, l: string) => string };
  const out: string[] = []; const verdicts: boolean[] = [];
  for (const l of ["sw", "en"] as const) {
    const t = dict[l];
    const product = [t.market.catAll, `${sideWord(t, "YES", "MARKET")} / ${sideWord(t, "NO", "MARKET")}`, `${sideWord(t, "YES", "UPDOWN")} / ${sideWord(t, "NO", "UPDOWN")}`].map((s) => pill(s));
    const when = [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll].map((s) => pill(s));
    const topics = [t.market.catAll, ...MARKET_CATEGORIES.map((c) => categoryLabel(t, c))].map((s) => pill(s, true));
    const results = [sort(t.common.sort, t.results.sortNewest), group(t.market.gameKey, product), group(t.common.when, when), group(t.common.topic, topics)];
    const odds = [t.market.oddsAny, t.market.oddsCall, t.market.oddsCont, t.market.oddsLong].map((s) => pill(s));
    const pool = [pill(t.market.poolAny), 2 + 32 + mono("TZS 10K+", 13) + 8 + 13.2, 2 + 32 + mono("TZS 50K+", 13) + 8 + 13.2];
    // The topic menu: MenuShell's summary — 1px borders, 16px padding, the key, the value, the count's two digits and the
    // 14px caret, 12px apart.
    const menu = 2 + 32 + mono(t.common.topic.toUpperCase(), 10, 1.4) + 12 + sans(t.market.catAll, 13) + 12 + 13.2 + 12 + 14;
    const markets = [sort(t.common.sort, t.market.sortPool), group(t.market.oddsKey, odds), group(t.market.poolKey, pool), menu];
    for (const room of [960, 1216]) {
      const r = lines(results, room, 29), m = lines(markets, room, 29);
      out.push(`${l}@${room}: /results ${r}, /markets ${m}`);
      verdicts.push(r >= 2 && m >= 2);
    }
  }
  // CONTROL: the old ghosts' typed boxes, on the row's plain 12px gap (they drew no divider), took one line everywhere.
  const oldResults = lines([182, 88, 84], 960, 12), oldMarkets = lines([210, 56, 92, 88, 84], 960, 12);
  ok(`10.1 · measured from the repo's fonts, row 2 from lg takes two lines or more on /results and /markets in Swahili and English at 1024 and 1280 (${out.join(" · ")}) — the ghosts' rows are built of the same words, so they wrap there too`,
    verdicts.length === 4 && verdicts.every(Boolean), out.join(" · "));
  ok(`10.1′ CONTROL · the old ghosts' typed boxes took ${oldResults} and ${oldMarkets} line at 1024 — the 56px (and more) the grid landed below their promise`, oldResults === 1 && oldMarkets === 1);
  // /live — the CTA row: the page's button (16px each side, the 14px semibold label, its 1px border) + 16 + six 24px dots.
  const thresholds = LOCALES.map((l) => Math.ceil(2 + 32 + sans(dict[l].market.openMarket, 14) + 16 + 144 + 82));
  ok(`10.2 · /live: the page's CTA row takes one line from ${thresholds.join(" / ")}px (sw / en / zh, the hero's 82px of frame and padding counted) where the old 150px box took one only from 392 — so at 390 the old ghost's hero stood 56px taller than the page's`,
    thresholds.every((x) => x <= 392 && x >= 330) && thresholds[0] < 390 && thresholds[1] < 390 && 150 + 16 + 144 + 82 === 392, j(thresholds));
  // The PulseCard's height from its classes: border, p-4, the 20px tag row, 12, the title's minimum, 16, 9, 10, 18.
  const card = (l: Locale) => 2 + 40 + 20 + 12 + 13.5 * (l === "sw" ? 4.125 : 2.75) + 16 + 9 + 10 + 18;
  ok(`10.3 · /live: the PulseCard is ${card("sw").toFixed(1)}px in Swahili and ${card("en").toFixed(1)}px in English and Chinese — the old 180px box was ${(card("sw") - 180).toFixed(1)}px short and ${(180 - card("en")).toFixed(1)}px too tall a card`,
    Math.abs(card("sw") - 182.69) < 0.01 && Math.abs(card("en") - 164.13) < 0.01);
}

console.log(`\nvisual-pass-r5l: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
