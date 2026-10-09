/**
 * ROUND 4 OF THE VISUAL PASS, HELPER J (2026-10-09) — HOW THE JOURNEY LOADS AND NAVIGATES, every fix a later edit could
 * silently undo, held, each check beside a control or a plant that proves it can fail.
 *
 *   npx tsx scripts/visual-pass-r4j.test.mts        (npm run test:visual-pass-r4j)
 *
 * The owner's rule (Ali, 2026-10-08): only perfect visual and logical results. Vodacom reviews on real Tanzanian mobile
 * networks, so how the journey LOADS matters as much as how it looks loaded. The tiles are the Slow 3G edge tiles
 * (S/edges/tiles 275–344, the readers' E36–E41) and the s4/s6 tiles (269, 345–398); the measurements are in the fixes'
 * own notes.
 *   §1  E36 · the journey's header and tabs are in the page's FIRST HTML: no Suspense boundary for React 19.2 to outline
 *            (proved on React's own server renderer, with the boxed shape as the control), and the bell's slot holds the
 *            bell's still twin until the live bell may mount
 *   §2  E37 · E41 · a route change moves only the page: no document cross-fade for a journey reader, and one current
 *            destination and one lit tab in every frame (the journey's own rules; the classic rail keeps its fades)
 *   §3  E38 · each journey tab's loading state is its own page's ghost in its own column, picked by the exact path; the
 *            hero's intro is ONE module both draw; /live's search ghost wears the page's band
 *   §4  E40 · the Needle's rest rule clears a Chinese caption of tile 269's geometry, and the caption's box holds its ink
 *   §5  the not-found mark: the overlays stop standing down, and the chrome stops lighting a tab and polling, on any
 *            not-found page — and (round 5, R5-D, review F4/F5) for the path being drawn only, in every frame, and before
 *            the scripts run wherever the server's HTML carries the verdict (the mark, or the loading boundary's 404
 *            template, measured on React's own server renderer)
 * ⛔ It READS and renders in memory. Nothing here writes a file; the mutation proof (S/r4j/mutation-r4j.mjs) is the one
 * thing that plants defects in the real sources, and it restores them byte for byte.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { Writable } from "node:stream";
import { createElement as h, Fragment, Suspense, useContext, type ReactElement } from "react";
import { renderToPipeableStream, renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { decideRest, glowReach, REST_TIERS, RIM_CLEARANCE, type Box } from "../src/lib/needle-rest.ts";
import { JOURNEY_TABS } from "../src/lib/nav/active-tab.ts";
import { isJourneySurface } from "../src/lib/surfaces.ts";
import { RoutePick } from "../src/components/ui/route-pick.tsx";
import { NotFoundMark } from "../src/components/ui/not-found-mark.tsx";
import * as NF from "../src/lib/not-found-mark.ts";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
/** A check that cannot run in this tree (a file another helper adds), printed and counted as neither. */
const pending = (name: string, why: string) => console.log(`  ---- ${name} — not applicable here: ${why}`);
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const read = (p: string) => decomment(raw(p));
/** Whitespace runs as one space: JSX compared across its line breaks. */
const squash = (s: string) => s.replace(/\s+/g, " ");
const count = (s: string, needle: string) => s.split(needle).length - 1;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CSS = decommentCss(raw("src/app/globals.css"));
/** One rule's declarations, by its exact selector (or one member of a selector list) at the start of a line. */
function rule(src: string, selector: string): string {
  const m = new RegExp(`(?:^|\\n)\\s*(?:[^{}\\n]*,\\s*)?${esc(selector)}(?![\\w-])\\s*(?:,[^{}\\n]*)?\\{([^}]*)\\}`).exec(src);
  return m ? m[1] : "";
}
const hasDirective = (s: string, d: string) => new RegExp(`^\\s*["']${d}["'];?`).test(s);
/** Next's digest for `notFound()` — `HTTP_ERROR_FALLBACK_ERROR_CODE` and the 404 status — read from the framework itself. */
const HAF = createRequire(import.meta.url)("next/dist/client/components/http-access-fallback/http-access-fallback") as {
  HTTP_ERROR_FALLBACK_ERROR_CODE: string; HTTPAccessErrorStatus: { NOT_FOUND: number };
};
const NEXT_404 = `${HAF.HTTP_ERROR_FALLBACK_ERROR_CODE};${HAF.HTTPAccessErrorStatus.NOT_FOUND}`;
/** The server's verdict "this record is missing", as React leaves it in the HTML of a loading boundary (round 5, F5). */
const VERDICT = `template[data-dgst="${NEXT_404}"]`;

const SHELL = "src/components/layout/app-shell.tsx";
const JHDR = "src/components/journey/journey-top-bar.tsx";
const JTABS = "src/components/journey/journey-tabs.tsx";
const BELL = "src/components/layout/notifications-panel.tsx";
const RT = "src/components/ui/route-transition.tsx";
const LOADING = "src/app/loading.tsx";
const GHOST = "src/components/journey/route-ghost.tsx";
const PICK = "src/components/ui/route-pick.tsx";
const HERO = "src/components/home/landing-hero.tsx";
const INTRO = "src/components/home/hero-intro.tsx";
const ACCOUNT = "src/app/account/page.tsx";
const LIVE_LOADING = "src/app/live/loading.tsx";
const MARK_LIB = "src/lib/not-found-mark.ts";
const MARK = "src/components/ui/not-found-mark.tsx";
const VIEW = "src/components/ui/not-found-view.tsx";
const NEEDLE = "src/components/layout/needle.tsx";
const CHAT = "src/components/chat/ChatRoot.tsx";
const CHANNELS = "src/components/social/channels-panel.tsx";

/* ══ §1 · E36 · THE JOURNEY CHROME IS IN THE FIRST HTML ═════════════════════════════════════════════════════════ */
section("1 · E36 · the header and tabs paint without JavaScript (tiles 277–342: header band one colour, no rail)");

/** The shell keeps the journey's two parts out of any Suspense boundary: each is the journeyShown arm itself. */
function bareChrome(shell: string): { ok: boolean; why: string } {
  const flat = squash(shell);
  const boxed = /<Suspense\b[^>]*>\s*<LazyJourney(TopBar|Tabs)\b/.exec(flat);
  const header = count(flat, "{journeyShown ? <LazyJourneyTopBar ");
  const tabs = count(flat, "{journeyShown ? <LazyJourneyTabs ");
  const emptyBox = count(flat, 'className="kp-jhdr"');
  return { ok: !boxed && header === 1 && tabs === 1 && emptyBox === 0, why: JSON.stringify({ boxed: boxed?.[0] ?? null, header, tabs, emptyBox }) };
}
{
  const shell = read(SHELL);
  const now = bareChrome(shell);
  ok("1.1 · AppShell renders the journey's header and tabs as the journeyShown arms themselves, in no Suspense boundary, with no empty header box", now.ok, now.why);
  const headerBoxed = shell.replace(/\{journeyShown \? <LazyJourneyTopBar ([^\n]*?) \/> : <TopAppBar/,
    '{journeyShown ? <Suspense fallback={<div aria-hidden="true" className="kp-jhdr" />}><LazyJourneyTopBar $1 /></Suspense> : <TopAppBar');
  ok("1.1′ PLANT · the header back in its boundary over the bar's empty box is reported", headerBoxed !== shell && !bareChrome(headerBoxed).ok);
  const tabsBoxed = shell.replace("{journeyShown ? <LazyJourneyTabs userId={session?.userId ?? null} /> :",
    "{journeyShown ? <Suspense fallback={null}><LazyJourneyTabs userId={session?.userId ?? null} /></Suspense> :");
  ok("1.1″ PLANT · the tabs back in theirs is reported", tabsBoxed !== shell && !bareChrome(tabsBoxed).ok);
}

/** React's own server renderer, the shell flushed once everything is ready (as a fast server renders a journey page). */
function streamHtml(el: ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    const sink = new Writable({
      write(chunk, _enc, cb) { html += chunk.toString(); cb(); },
      final(cb) { resolve(html); cb(); },
    });
    const { pipe } = renderToPipeableStream(el, { onAllReady() { pipe(sink); }, onError(e) { reject(e); } });
  });
}
/** A header of the journey header's weight (its markup is ~3 kB; past the 500 bytes that make a boundary outlinable). */
const Header = () => h("header", { id: "jhdr", className: "kp-jhdr" }, "h".repeat(800));
const page = (header: ReactElement, filler: number) =>
  h("html", null, h("body", null, header, h("main", { id: "main-content" }, "p".repeat(filler))));
const boxed = () => h(Suspense, { fallback: h("div", { "aria-hidden": "true", className: "kp-jhdr", id: "jhdr-fallback" }) }, h(Header));
{
  const bare = await streamHtml(page(h(Header), 20_000));
  const boxedBig = await streamHtml(page(boxed(), 20_000));
  const boxedSmall = await streamHtml(page(boxed(), 2_000));
  const at = (html: string, s: string) => html.indexOf(s);
  ok("1.2 · React 19.2: a header in NO boundary is written where it stands, before the page, in the shell's own bytes",
    at(bare, '<header id="jhdr"') > -1 && at(bare, '<header id="jhdr"') < at(bare, '<main id="main-content"') && !bare.includes("$RC"),
    `header@${at(bare, '<header id="jhdr"')} main@${at(bare, '<main id="main-content"')}`);
  ok("1.2′ CONTROL · the same header IN a boundary, in a shell past 12,800 bytes, is OUTLINED: the fallback box where the header stands, the header itself after the page in a hidden div that only the inline $RC script moves in (the E36 mechanism)",
    at(boxedBig, 'id="jhdr-fallback"') > -1 && at(boxedBig, 'id="jhdr-fallback"') < at(boxedBig, '<main id="main-content"')
      && at(boxedBig, '<header id="jhdr"') > at(boxedBig, '<main id="main-content"') && /<div hidden id="S:\d+">/.test(boxedBig) && boxedBig.includes("$RC"),
    `fallback@${at(boxedBig, 'id="jhdr-fallback"')} main@${at(boxedBig, '<main id="main-content"')} header@${at(boxedBig, '<header id="jhdr"')}`);
  ok("1.2″ CONTROL · and in a shell under 12,800 bytes the same boundary is written inline — the count that outlines it is the WHOLE shell's, wherever the boundary stands",
    at(boxedSmall, '<header id="jhdr"') > -1 && at(boxedSmall, '<header id="jhdr"') < at(boxedSmall, '<main id="main-content"') && !boxedSmall.includes('id="jhdr-fallback"'));
  // The framework's own copy (the one Next renders with) carries the predicate the proof above ran on.
  const fw = readFileSync("node_modules/next/dist/compiled/react-dom/cjs/react-dom-server.node.production.js", "utf8");
  ok("1.3 · Next's compiled react-dom outlines by the same rule: a boundary past 500 bytes, counted against the whole shell's 12,800 (if this fails after an upgrade, re-measure E36 before trusting §1.2)",
    fw.includes("500 < boundary.byteSize") && fw.includes("void 0 === progressiveChunkSize ? 12800 : progressiveChunkSize")
      && fw.includes("flushedByteSize = request.byteSize") && fw.includes("flushedByteSize + boundary.byteSize > request.progressiveChunkSize"));
}

/** The live bell's trigger, as notifications-panel.tsx draws it closed, and its still twin in the journey header. */
function bellTwin(bar: string, panel: string, tw: string): { ok: boolean; why: string } {
  // The panel is read decommented, so the cn( call's notes are blank lines between its two class strings.
  const live = /className=\{cn\(\s*"([^"]+)",\s*open \? "[^"]+" : "([^"]+)"/.exec(panel);
  const still = /function BellStill[\s\S]*?<div className="([^"]+)">\s*<Link\s+href="\/notifications"\s+aria-label=\{label\}\s+className="([^"]+)"\s*>\s*<span aria-hidden className="inline-flex">\s*<I\.bell s=\{20\} \/>\s*<\/span>\s*<\/Link>\s*<\/div>/.exec(bar);
  if (!live || !still) return { ok: false, why: JSON.stringify({ live: !!live, still: !!still }) };
  const step = (k: string) => new RegExp(`"${k}":\\s*"([0-9]+)px"`).exec(tw)?.[1];
  // The live control's classes with its spacing steps written as what they render.
  const want = `${live[1]} ${live[2]}`.split(" ").map((c) => (/^[hw]-\d+$/.test(c) ? `${c[0]}-[${step(c.slice(2))}px]` : c)).sort();
  const got = still[2].split(" ").sort();
  const wrapper = /<div ref=\{ref\} className="([^"]+)">/.exec(panel)?.[1];
  // ⚠️ `<NotificationsPanel journey />` since R5-C's gold audit (2026-10-09): the journey bell's unread signs are the brand ink.
  const slot = bar.includes('<span className="hidden lg:inline-flex kp-jhdr__bell">{pollers.bell && !notFoundShown ? <NotificationsPanel journey /> : <BellStill label={t.common.notifications} />}</span>');
  return {
    ok: JSON.stringify(want) === JSON.stringify(got) && still[1] === wrapper && slot && panel.includes("<I.bell s={20} />"),
    why: JSON.stringify({ want, got, wrapper, stillWrapper: still[1], slot }),
  };
}
{
  const bar = read(JHDR), panel = read(BELL), tw = raw("tailwind.config.ts");
  const now = bellTwin(bar, panel, tw);
  ok("1.4 · the bell's slot holds the bell's still twin — the live trigger's wrapper, 40px round box, ink and 20px glyph, a plain link to /notifications — until the live bell may mount (it is mounted from 1024 alone, and never on a not-found page)", now.ok, now.why);
  ok("1.4′ PLANT · the empty slot of before (the live bell or nothing) is reported",
    !bellTwin(bar.replace("{pollers.bell && !notFoundShown ? <NotificationsPanel journey /> : <BellStill label={t.common.notifications} />}", "{pollers.bell && <NotificationsPanel journey />}"), panel, tw).ok);
  ok("1.4″ PLANT · a twin 4px off the live bell's box is reported", !bellTwin(bar.replace("h-[40px] w-[40px]", "h-[44px] w-[44px]"), panel, tw).ok);
}

{
  // What the old boundary also kept back: the capsule's figure, for a reader who hid balances (a choice the server
  // cannot read). Now in the first HTML, the capsule is drawn masked until the browser has read the choice.
  const cap = read("src/components/layout/wallet-balance-pill.tsx");
  const body = cap.slice(cap.indexOf("export function WalletBalanceCaptioned"));
  const masksFirst = (s: string) => squash(s).includes("const chosen = useCashHidden(); const [choiceRead, setChoiceRead] = useState(false); useEffect(() => { setChoiceRead(true); }, []); const hidden = chosen || !choiceRead;")
    && s.includes("<span>{hidden ? BALANCE_MASK : formatBalancePill(display)}</span>") && s.includes('data-masked={hidden ? "" : undefined}');
  ok("1.5 · the journey capsule is drawn MASKED by the server and the hydration that matches it — the figure arrives with the stored hide-balances choice, in one render (a reader who hid it never sees it flash)", masksFirst(body));
  ok("1.5′ PLANT · the figure drawn before the choice is read is reported", !masksFirst(body.replace("const hidden = chosen || !choiceRead;", "const hidden = chosen;")));
  // Rendered on React's server renderer, as the first HTML draws it: no effect has run, so the mask is what paints.
  const { WalletBalanceCaptioned } = await import("../src/components/layout/wallet-balance-pill.tsx");
  const html = renderToStaticMarkup(h(WalletBalanceCaptioned, { balance: 100_000 }));
  const visible = /<span class="kp-jbal__fig amount">(?:<span aria-hidden="true" class="kp-jbal__sizer">[^<]*<\/span>){2}<span>([^<]*)<\/span>/.exec(html)?.[1];
  ok("1.6 · …and so the server's HTML paints \"TZS •••••\", never \"TZS 100,000\", with the masked ink (data-masked)", visible === "TZS •••••" && html.includes('data-masked=""'), JSON.stringify({ visible }));
  ok("1.6′ CONTROL · the box still holds the figure's width (its sizer), so nothing moves when the figure arrives", html.includes('<span aria-hidden="true" class="kp-jbal__sizer">TZS 100,000</span>'));
}

/* ══ §2 · E37 · E41 · A ROUTE CHANGE MOVES ONLY THE PAGE ═══════════════════════════════════════════════════════ */
section("2 · E37 E41 · no cross-fade of the chrome, one current destination and one lit tab (tiles 292 301 306 315 328 333 338)");
{
  const rt = read(RT);
  const vt = (s: string) => s.includes("if (doc.startViewTransition && !motionOff() && !journeyFlagSnapshot()) {")
    && /import \{ journeyFlagSnapshot \} from "@\/lib\/journey\/journey-on";/.test(s) && hasDirective(s, "use client");
  ok("2.1 · a journey reader's route change never starts a document View Transition (the root cross-fade took the header, the strip and the rail, 4px apart and dimmed); everybody else keeps it", vt(rt));
  ok("2.1′ PLANT · the journey term dropped is reported", !vt(rt.replace(" && !journeyFlagSnapshot()", "")));
  // The native cross-fade itself is untouched: a classic reader is served it.
  ok("2.2 · the native cross-fade's rules are unchanged for everybody else (vt-fade-out −4px / vt-fade-in +4px, --t-quick)",
    /@keyframes vt-fade-out \{\s*from \{ opacity: 1; transform: none; \}\s*to\s+\{ opacity: 0; transform: translateY\(-4px\); \}\s*\}/.test(CSS)
      && /::view-transition-old\(root\),\s*::view-transition-new\(root\) \{[^}]*animation-duration: var\(--t-quick\);/.test(CSS));
}
{
  const jnavCut = (css: string) => /\n\.kp-jnav__link:not\(:hover\), \.kp-jnav__link:not\(:hover\)::after \{ transition: none; \}/.test(css)
    && /transition: transform var\(--t-base\)/.test(rule(css, ".kp-jnav__link::after"));
  ok("2.3 · the desktop destinations: the current mark changes at once — leaving and arriving — and only a hover draws its preview in (0,2,0 over the base's 0,1,0)", jnavCut(CSS));
  ok("2.3′ PLANT · the cut removed (two underlines for 220ms, tile 315) is reported",
    !jnavCut(CSS.replace(".kp-jnav__link:not(:hover), .kp-jnav__link:not(:hover)::after { transition: none; }", "")));
  const railCut = (css: string) => /\n\.kp-rail--journey \.kp-rail__item, \.kp-rail--journey \.kp-rail__pip \{ transition: none; \}/.test(css);
  ok("2.4 · the journey rail: ink, pip and weight change together, at once (the pip half-lit on the tab being left for 140ms, tiles 301 306 333)", railCut(CSS));
  ok("2.4′ PLANT · the journey rail's cut removed is reported", !railCut(CSS.replace(".kp-rail--journey .kp-rail__item, .kp-rail--journey .kp-rail__pip { transition: none; }", "")));
  ok("2.5 · the CLASSIC rail keeps its fades — `.kp-rail__item` and `.kp-rail__pip` are not edited (frozen chrome; the admin bar wears them too)",
    /transition: color var\(--t-quick\) ease-out;/.test(rule(CSS, ".kp-rail__item"))
      && /transition: background var\(--t-quick\) ease-out, box-shadow var\(--t-quick\) ease-out;/.test(rule(CSS, ".kp-rail__pip"))
      && !/\n\.kp-rail__item[^{\n]*\{[^}]*transition: none/.test(CSS));
}

/* ══ §3 · E38 · EACH TAB'S LOADING STATE IS ITS OWN PAGE'S GHOST ══════════════════════════════════════════════════ */
section("3 · E38 · the journey's loading ghosts (tiles 277 280 290 293 296: one 360px box at x32–1247 for every page)");
{
  const loading = read(LOADING), shell = read(SHELL);
  // ⚠️ MOVED IN ROUND 5 (review G1, R5-D): the arm renders the ghosts' lazy client binding with the one server answer
  // the browser cannot read (the rails); the words are the client dictionary's (`test:visual-pass-r5d` §2).
  const journeyArm = (s: string) => squash(s).includes(
    'const pathname = (await headers()).get("x-pathname") ?? ""; if (!pathname.startsWith("/admin") && !isOptOutPath(pathname) && (await resolveSimpleJourney()).journey) { return <LazyJourneyRouteGhost rails={heroRailNames(null)} />; }');
  const classicArm = (s: string) => squash(s).includes('return ( <div className="mx-auto max-w-[1280px] px-3 lg:px-6 py-10"> <SectionLoader height={360} /> </div> );');
  ok("3.1 · the root loading file asks AppShell's own questions — not the console, not the opt-out page, the per-request resolver — and draws the journey's ghost for a journey reader alone",
    journeyArm(loading) && shell.includes('if (pathname.startsWith("/admin")) {') && shell.includes("if (isOptOutPath(pathname)) {") && shell.includes("const journeyRead = resolveSimpleJourney();"));
  ok("3.2 · everybody else is drawn the classic box, unchanged (the classic arm is today's markup)", classicArm(loading));
  ok("3.2′ PLANT · a classic box moved is reported", !classicArm(loading.replace("py-10", "py-6")));
  ok("3.2″ PLANT · the journey arm without the resolver (the ghost for every reader) is reported", !journeyArm(loading.replace(" && (await resolveSimpleJourney()).journey", "")));
}
{
  const ghost = read(GHOST);
  const keys = [...squash(ghost).matchAll(/"(\/[a-z/]*)": </g)].map((m) => m[1]);
  const patterns = [...squash(ghost).matchAll(/\["(\^[^"]+\$)", </g)].map((m) => m[1]);
  const tabs = JOURNEY_TABS.map((d) => d.href);
  // The journey's own pages (surfaces.ts), as paths: each exact one, a question, and the deposit screen's return.
  const SURFACES = ["/updown/history", "/wallet/deposit", "/wallet/deposit/return"];
  const want = [...tabs, ...SURFACES].sort();
  const covers = (k: string[], p: string[]) => JSON.stringify([...k].sort()) === JSON.stringify(want)
    && JSON.stringify(p) === JSON.stringify(["^/markets/[^/]+$"])
    && [...SURFACES, "/markets/mkt_x"].every((s) => isJourneySurface(s)) && SURFACES.every((s) => k.includes(s));
  ok(`3.3 · the ghost picks a page for each of the four tabs (${tabs.join(" ")}) and each of the journey's own pages (surfaces.ts: ${SURFACES.join(" ")} and a question), exactly, and draws a frameless spinner for every other page`,
    covers(keys, patterns) && squash(ghost).includes("other={<AnyPageGhost />}") && !/rounded-lg border/.test(ghost.slice(ghost.indexOf("function AnyPageGhost"))),
    JSON.stringify({ keys, patterns }));
  ok("3.3′ PLANT · a tab without its ghost (Juu/Chini back to the box) is reported", !covers(keys.filter((k) => k !== "/updown"), patterns));
  ok("3.3″ PLANT · a question without its ghost is reported", !covers(keys, []));
  // ⚠️ MOVED IN ROUND 5 (review G1, R5-D): the root ghost is drawn in the browser now, so it imports each page's DRAWING —
  // the loading file itself where it reads nothing (a question's, the provider's return), else the drawing the loading
  // file hands its words to (Juu/Chini's, the round history's, the deposit's) — and each loading file renders that same
  // drawing: one drawing, never redrawn. [the ghost's use, its import, the page's loading file, what that file renders]
  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): the shared drawings read their own words (`useT`), so neither the root
  // ghost nor the loading file hands them any; the round history takes the journey's head as `journeyHead` (its module
  // loads nothing of the journey's), and a journey reader's /positions is the root ghost pinned to the page.
  // ⚠️ …AND THE DEPOSIT DRAWING TAKES THE JOURNEY ANSWER (R5-G, G-1): its head is the page's own for either reader
  // (`money-names.ts`) — the root ghost (a journey reader's alone) hands it `journey`, its loading file the per-request one.
  const own: Array<[string, string, string, string]> = [
    ['"/updown": <UpDownGhost />', 'import { UpDownGhost } from "@/app/updown/updown-ghost";', "src/app/updown/loading.tsx", "return <UpDownGhost />;"],
    ['"/updown/history": <UpDownHistoryGhost journeyHead={<TicketsHeadGhost t={t} />} />', 'import { UpDownHistoryGhost } from "@/app/updown/history/history-ghost";', "src/app/updown/history/loading.tsx", "return <UpDownHistoryGhost />;"],
    ['"/wallet/deposit": <DepositGhost journey />', 'import { DepositGhost } from "@/app/wallet/deposit/deposit-ghost";', "src/app/wallet/deposit/loading.tsx", "return <DepositGhost journey={journey} />;"],
    ['"/wallet/deposit/return": <DepositReturnLoading />', 'import DepositReturnLoading from "@/app/wallet/deposit/return/loading";', "src/app/wallet/deposit/return/loading.tsx", "export default function DepositReturnLoading() {"],
    ['["^/markets/[^/]+$", <MarketDetailLoading />]', 'import MarketDetailLoading from "@/app/markets/[id]/loading";', "src/app/markets/[id]/loading.tsx", "export default function MarketDetailLoading() {"],
  ];
  const oneDrawing = (g: string) => own.filter(([use, imp, file, renders]) => !(g.includes(use) && g.includes(imp) && read(file).includes(renders)));
  ok("3.4 · each ghost is its page's own: Tiketi zangu's journey ghost, the hero's intro components, and every other page's own drawing — the one its loading file renders — imported, never redrawn",
    ghost.includes('"/positions": <TicketsGhost t={t} />') && ghost.includes('import { TicketsGhost, TicketsHeadGhost } from "@/components/journey/tickets/tickets-ghost";')
      && read("src/app/positions/loading.tsx").includes('if (journey) return <LazyJourneyRouteGhost rails={heroRailNames(null)} at="/positions" />;') && oneDrawing(ghost).length === 0,
    JSON.stringify(oneDrawing(ghost).map((o) => o[2])));
  ok("3.4′ PLANT · a second copy of Juu/Chini's ghost drawn in the root ghost (the loading file's drawing no longer the one shown) is reported",
    oneDrawing(ghost.replace('"/updown": <UpDownGhost />', '"/updown": <div className="mx-auto w-full max-w-board px-3 lg:px-6 py-6" aria-busy="true" />')).length === 1);
}
{
  // RoutePick, rendered: exact paths only, and never a key the object inherits.
  const { PathnameContext } = createRequire(import.meta.url)("next/dist/shared/lib/hooks-client-context.shared-runtime") as {
    PathnameContext: import("react").Context<string | null>;
  };
  const routes = { "/": h("b", null, "home"), "/positions": h("b", null, "tickets") };
  const patterns = [["^/markets/[^/]+$", h("b", null, "question")]] as const;
  const at = (path: string, Pick: typeof RoutePick = RoutePick) =>
    renderToStaticMarkup(h(PathnameContext.Provider, { value: path }, h(Pick, { routes, patterns, other: h("i", null, "other") })));
  const exact = at("/") === "<b>home</b>" && at("/positions") === "<b>tickets</b>" && at("/positions/performance") === "<i>other</i>"
    && at("/markets") === "<i>other</i>" && at("/constructor") === "<i>other</i>" && at("/toString") === "<i>other</i>"
    && at("/markets/mkt_1") === "<b>question</b>" && at("/markets/mkt_1/share") === "<i>other</i>";
  ok("3.5 · RoutePick draws a page's ghost on that exact path, or the whole path a pattern names, only — a page below it, any other page and an inherited key all get the other", exact,
    JSON.stringify(["/", "/positions", "/positions/performance", "/markets", "/constructor", "/markets/mkt_1", "/markets/mkt_1/share"].map((p) => at(p))));
  // The control: the prefix matcher a later edit might reach for hands /positions' ghost to every page below it.
  const Prefix: typeof RoutePick = ({ routes: r, other }) => {
    const p = useContext(PathnameContext) ?? "";
    const k = Object.keys(r).filter((x) => x !== "/").find((x) => p === x || p.startsWith(`${x}/`));
    return h(Fragment, null, k ? r[k] : Object.prototype.hasOwnProperty.call(r, p) ? r[p] : other);
  };
  ok("3.5′ CONTROL · a prefix matcher is told apart (it draws Tiketi zangu's ghost on /positions/performance)", at("/positions/performance", Prefix) === "<b>tickets</b>");
  const pick = read(PICK);
  ok("3.6 · route-pick.tsx is a few lines of browser code that draws nothing of its own: client, usePathname, own-property lookup, whole-path patterns",
    hasDirective(pick, "use client") && pick.includes("if (Object.prototype.hasOwnProperty.call(routes, pathname)) return <>{routes[pathname]}</>;")
      && pick.includes("const hit = patterns.find(([source]) => new RegExp(source).test(pathname));")
      && pick.includes('import { usePathname } from "next/navigation";'));
}
{
  // The hero's intro is ONE module: the page and its ghost render the same three components.
  const hero = read(HERO), intro = read(INTRO), ghost = read(GHOST);
  const defs = (s: string) => ["Claim", "Ask", "TrustLines"].map((n) => count(s, `function ${n}(`));
  const introOk = (i: string, hr: string) =>
    JSON.stringify(defs(i)) === "[1,1,1]" && JSON.stringify(defs(hr)) === "[0,0,0]"
      && hr.includes('import { Ask, Claim, TrustLines } from "./hero-intro";')
      && ["<Claim t={t} />", "<Ask t={t} />", "<TrustLines t={t} locale={locale} rails={rails} />"].every((j) => hr.includes(j));
  ok("3.7 · Claim, Ask and TrustLines are defined once, in hero-intro.tsx, and the hero renders them where it did", introOk(intro, hero));
  ok("3.7′ PLANT · a second copy of the h1 left in the hero is reported", !introOk(intro, `${hero}\nfunction Ask({ t }: { t: Dict }) { return null; }`));
  // ⛔ The ghost is drawn by the ROOT loading file: whatever module it reaches rides with it — into every page's first
  // load while it was drawn on the server, into its own chunk since round 5 (G1) — so the intro stays lean either way.
  const importsOf = (s: string) => [...s.matchAll(/^import [^;]*? from "([^"]+)";/gm)].map((m) => m[1]);
  // Round 5 (R5-A, F18) added keep-words: the trust row keeps the Board's name whole (`keepRegulator`). It is a module with
  // no directive that imports only React's types, so it puts no client code into the root's first load.
  const ALLOWED = ["@/components/ui/glyphs", "@/components/brand", "@/lib/utils", "@/lib/support-config", "@/lib/rail-list", "@/lib/i18n-dict", "@/lib/side-label", "@/components/ui/keep-words"];
  const lean = (s: string) => importsOf(s).every((m) => ALLOWED.includes(m)) && !hasDirective(s, "use client");
  ok("3.8 · hero-intro.tsx imports only what the three parts draw with (no market card, filter pill or tipping bar into the root's first load)", lean(intro), JSON.stringify(importsOf(intro)));
  ok("3.8′ PLANT · the market card imported there is reported", !lean(`import { MarketCard } from "@/components/markets/market-card";\n${intro}`));
  // The home ghost is the hero's skeleton: the same classes in the same order, the same three components.
  const SKELETON = ['className="kp-hero"', 'kp-hero__inner', 'className="kp-hero__intro"', 'className="kp-hero__lockup"', "<Claim t={t} />", "<Ask t={t} />",
    'className="kp-hero__lede"', '<span className="kp-hero__lede-l">{t.home.heroLedeAct}</span>', '<span className="kp-hero__lede-l kp-hero__lede-l--pay">{t.home.heroLedePay}</span>',
    "<TrustLines t={t} locale={locale} rails=", 'className="kp-hero__card"', 'className="kp-hero__act"'];
  const inOrder = (s: string) => { let at = -1; return SKELETON.every((k) => { const i = s.indexOf(k, at + 1); if (i < 0) return false; at = i; return true; }); };
  const homeGhost = ghost.slice(ghost.indexOf("function HomeGhost"), ghost.indexOf("const A_PLAYER"));
  const heroBody = hero.slice(hero.indexOf("export function LandingHero"));
  ok("3.9 · the home ghost is the hero's own skeleton — band, grid, intro, lockup, claim, h1, the lede's two spans, the trust rows, the card's and the act's places — in the page's order",
    inOrder(homeGhost) && inOrder(heroBody));
  ok("3.9′ PLANT · a ghost without the lede (every block under it 40px high) is reported", !inOrder(homeGhost.replace(/<p className="kp-hero__lede">[\s\S]*?<\/p>/, "")));
  ok("3.10 · the ghost's words are the page's, set and not shown (a bar under each), and it never plays the hero's entrance — the page's blocks rise in once, over still bars",
    /\.kp-hero__inner\.kp-hghost > \*:nth-child\(n\) \{ animation: none; \}/.test(CSS)
      && /\.kp-hero__inner > \*:nth-child\(1\) \{ animation: kp-rise/.test(CSS)
      && /\.kp-hghost \.kp-hero__intro, \.kp-hghost \.kp-hero__intro \* \{ color: transparent; \}/.test(CSS)
      && homeGhost.includes('<section className="kp-hero" aria-hidden="true">'));
}
{
  // /account: the page's own column, h1, identity card, prompt and column cut.
  const page = read(ACCOUNT), ghost = read(GHOST);
  const acct = ghost.slice(ghost.indexOf("function AccountGhost"), ghost.indexOf("function AnyPageGhost"));
  const h1 = /<h1 className="([^"]+)">\{t\.journey\.tabAccount\}<\/h1>/.exec(page)?.[1];
  const sameShape = (g: string) => !!h1 && g.includes(`<h1 className="${h1}">{t.journey.tabAccount}</h1>`)
    && page.includes('<PageContainer tier="reading">') && g.includes('<PageContainer tier="reading">')
    && g.includes('<div className="kp-hub">') && page.includes('<div className="kp-hub" data-testid="journey-account-hub">')
    && g.includes("const cut = hubColumnCut(groups.map((g) => wideRowCount(g.rows)));") && page.includes("const weights = groups.map((g) => wideRowCount(g.rows));")
    && g.includes('row.kind === "language" ? "lg:hidden" : row.kind === "cardSize" ? "sm:hidden" : undefined')
    && read("src/components/journey/account/language-row.tsx").includes('<li className="lg:hidden">')
    && read("src/components/journey/account/card-size-row.tsx").includes('<li className="sm:hidden">');
  ok("3.11 · the /account ghost stands in the page's own column (tier reading), with the page's h1 and the page's column cut; its hiding rows hide where the page's do", sameShape(acct));
  ok("3.11′ PLANT · a ghost in the board's column (the 100px jump of E38) is reported", !sameShape(acct.replace('<PageContainer tier="reading">', '<PageContainer tier="board">')));
  const bar = read(JHDR);
  const guestBy = (css: string, b: string) => /\n\.kp-hubghost--guest \{ display: none; \}/.test(css)
    && /\n:root:has\(\.kp-jhdr__auth\) \.kp-hubghost--member \{ display: none; \}/.test(css)
    && /\n:root:has\(\.kp-jhdr__auth\) p\.kp-hubghost--guest \{ display: block; \}/.test(css)
    && /\n:root:has\(\.kp-jhdr__auth\) \.kp-hub__grid\.kp-hubghost--guest \{ display: grid; \}/.test(css)
    && count(b, "kp-jhdr__auth") === 2 && b.includes("{state.authPills && (");
  ok("3.12 · a guest is drawn a guest's hub, chosen by the header's own sign-in pills (a guest's alone, and in the first HTML since §1)", guestBy(CSS, bar));
  ok("3.12′ PLANT · the pills renamed in the header (every guest drawn a member's hub) is reported", !guestBy(CSS, bar.split("kp-jhdr__auth").join("kp-jhdr__signin")));
}
{
  const live = read(LIVE_LOADING);
  const banded = (s: string) => squash(s).includes('<div className={QUERY_SEARCH_BAND_CLASS} aria-hidden> <div className="search-box-wrap">')
    && s.includes('import { QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";');
  ok("3.13 · /live's search ghost wears the page's search band (R4-H's request: pulse-grid.tsx wraps the box in QUERY_SEARCH_BAND_CLASS), imported, never retyped", banded(live));
  ok("3.13′ PLANT · the bare box of before is reported",
    !banded(live.replace('<div className={QUERY_SEARCH_BAND_CLASS} aria-hidden>\n        <div className="search-box-wrap">', '<div aria-hidden className="search-box-wrap">')));
}

/* ══ §4 · E40 · THE NEEDLE CLEARS A CHINESE CAPTION ═════════════════════════════════════════════════════════════ */
section("4 · E40 · the rest rule on tile 269's geometry (zh 360 /markets: the disc 0–1px from \"46 个市场 · 奖池最大\")");
{
  // Tile 269, measured: the caption's ink x224–343 × y111–121; the disc (56px at 360: `diameter()`), tucked half off the
  // right edge (centre x360), its rim's outer edge at y≈115.6 in column x352 — 1.17px under the circle's top there — so
  // its box from y≈114. `--halo` 14% at a 360 short side → the glow's reach.
  const size = 56, halo = 0.14, glow = glowReach(size, halo);
  // The caption's line box: JetBrains Mono at 11.5px, baseline y≈120.5. Its range box is the PRIMARY face's content area
  // (ascent 1.02em, descent 0.30em — read below), whatever face draws the ideographs.
  const fontkit = createRequire(import.meta.url)("fontkit") as { openSync: (p: string) => { ascent: number; descent: number; unitsPerEm: number } };
  const jbm = fontkit.openSync("src/lib/server/reports/fonts/JetBrainsMono-Regular.ttf");
  const asc = jbm.ascent / jbm.unitsPerEm, desc = -jbm.descent / jbm.unitsPerEm;
  // An ideograph is drawn inside its em box: 0.88em over the alphabetic baseline and 0.12em under it (the ideographic
  // baseline) — so a box of ascent ≥ 0.88em and descent ≥ 0.12em holds its ink, in any CJK face.
  ok("4.1 · the caption's box holds its Chinese ink: the mono face's content area (ascent 1.02em, descent 0.30em) contains the ideographic em box (0.88 / 0.12) — box vs ink is not the hole",
    asc >= 0.88 && desc >= 0.12, `ascent ${asc} descent ${desc}`);
  const base = 120.5, px = 11.5;
  const caption: Box = { left: 224, right: 343, top: base - asc * px, bottom: base + desc * px };
  const fp: Box = { left: 332, right: 360, top: 114, bottom: 114 + size };
  const q = { fp, controls: [], frames: [], text: [caption], above: [], glow, reach: 780 / 3, minY: 70, maxY: 690, y: fp.top, accepted: null };
  const r = decideRest(q);
  const clearance = r.y === null ? -1 : r.y - caption.bottom;
  ok(`4.2 · on tile 269's geometry the rule does NOT accept the disc where it was drawn (tier ${REST_TIERS.length - 1}, text under the rim) and moves it below the caption, ≥ ${RIM_CLEARANCE}px clear`,
    r.y !== null && r.tier <= 2 && clearance >= RIM_CLEARANCE, JSON.stringify({ r, clearance: clearance.toFixed(1), glow: glow.toFixed(2) }));
  const blind = decideRest({ ...q, text: [] });
  ok("4.2′ CONTROL · the same disc with the caption unread stays where it was drawn — so 4.2 is the caption's doing", blind.y === null && blind.tier === 0);
  // ⚠️ What this cannot prove without a browser is WHEN the rule ran on tile 269: the edges drive shoots two frames and
  // ~560ms after its own scrollIntoView and never waits for `window.needle.resting()` (R3-B's read for drives, which
  // qa-journey-shell waits on). The lock turn re-runs scenario 4 with that wait (S/r4j/qa-journey-edges.r4j.patch) and
  // `S/r4j/r4j-verdict.mjs` holds the disc ≥ 8px off the caption's ink on the re-taken tile.
}

/* ══ §5 · THE NOT-FOUND MARK ═══════════════════════════════════════════════════════════════════════════════════════ */
section("5 · the not-found mark (tiles 345–398: the market not-found stood the bubble and the Needle down, lit Maswali, and polled into 404s)");
{
  const lib = read(MARK_LIB), mark = read(MARK);
  // ⚠️ 5.1, 5.2 and 5.11 MOVED IN ROUND 5 (review F4, R5-D): the mark carries the path it was drawn for and the answer is
  // "the mark's path is the path being drawn" — presence alone answered "not found" for the NEXT page while the router
  // drew it (the old span still in the document), and a transition's commit paints before a passive cleanup runs.
  const hookOk = (s: string) => squash(s).includes("export function useNotFoundShown(): boolean { const path = usePathname() ?? \"\"; const markPath = useSyncExternalStore(subscribeNotFound, notFoundSnapshot, notFoundServerSnapshot); return isNotFoundFor(markPath, path); }")
    && squash(s).includes("export function isNotFoundFor(markPath: string | null, path: string): boolean { return markPath !== null && markPath === path; }")
    && s.includes('import { usePathname } from "next/navigation";');
  ok("5.1 · not-found-mark.ts is a hook module with no directive: its server snapshot is \"no mark\" (null), its id, attribute and event named once, and the hook answers for the path being drawn",
    !hasDirective(lib, "use client") && !hasDirective(lib, "use server") && NF.notFoundServerSnapshot() === null
      && lib.includes('export const NOT_FOUND_MARK = "kp-not-found";') && lib.includes('export const NOT_FOUND_PATH_ATTR = "data-path";') && hookOk(lib));
  ok("5.1′ PLANT · the hook back to the span's presence (R4-J's: \"not found\" for the next page while the old span is up) is reported",
    !hookOk(lib.replace("return isNotFoundFor(markPath, path);", "return markPath !== null;")));
  const markOk = (s: string) => hasDirective(s, "use client") && s.includes('const path = usePathname() ?? "";')
    && squash(s).includes("useLayoutEffect(() => { announceNotFound(); }, [path]);") && squash(s).includes("useLayoutEffect(() => announceNotFoundAfterCommit, []);")
    && s.includes("return <span hidden id={NOT_FOUND_MARK} data-path={path} />;");
  const { PathnameContext: PathCtx } = createRequire(import.meta.url)("next/dist/shared/lib/hooks-client-context.shared-runtime") as {
    PathnameContext: import("react").Context<string | null>;
  };
  const drawnAt = renderToStaticMarkup(h(PathCtx.Provider, { value: "/markets/mkt_gone" }, h(NotFoundMark)));
  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-3): its going is announced once the commit that takes the span out is done —
  // a microtask queued from its layout cleanup — so before that commit's paint, as the journey flag's lowering is.
  ok("5.2 · NotFoundMark writes the hidden span with the path it was drawn for, announces its coming in a LAYOUT effect (before that commit's paint) and its going once that commit is done, still before its paint (the span is out by then)",
    markOk(mark) && drawnAt === '<span hidden="" id="kp-not-found" data-path="/markets/mkt_gone"></span>', drawnAt);
  ok("5.2′ PLANT · a mark that does not announce its going (the overlays stay up after leaving) is reported", !markOk(mark.replace("useLayoutEffect(() => announceNotFoundAfterCommit, []);", "")));
  ok("5.2″ PLANT · its coming announced by a passive effect again (a transition paints the not-found page with a tab lit first) is reported",
    !markOk(mark.replace("useLayoutEffect(() => { announceNotFound(); }, [path]);", "useEffect(() => { announceNotFound(); }, [path]);")));
  ok("5.2‴ PLANT · a mark that names no path (presence again) is reported", !markOk(mark.replace(" data-path={path} />", " />")));
  // Only client code may load the hook module (journey-on.ts's rule, for its reason).
  const files: string[] = [];
  const walk = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n).replace(/\\/g, "/"); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|mts)$/.test(n)) files.push(p); } };
  walk("src");
  const loaders = files.filter((f) => /from "@\/lib\/not-found-mark"/.test(read(f)));
  const servers = loaders.filter((f) => !hasDirective(read(f), "use client"));
  ok(`5.3 · only client code loads it (${loaders.length}: ${loaders.map((f) => f.split("/").pop()).join(", ")})`, loaders.length === 6 && servers.length === 0, JSON.stringify(servers));
}
{
  // The three overlays: the stand-down term joined by `&& !notFoundShown`, the mark read once each.
  const TERM = "journeyOn && isJourneySurface(pathname) && !notFoundShown";
  const sites: Array<[string, string, string]> = [
    ["the Needle", NEEDLE, `const suppressed = hiddenPref || isMoneySurface(pathname) || (${TERM});`],
    ["the chat bubble", CHAT, `if (${TERM}) return null;`],
    ["the channels panel", CHANNELS, `const journeyHidden = ${TERM};`],
  ];
  const overlay = (s: string, line: string) => count(s, line) === 1 && count(s, "const notFoundShown = useNotFoundShown();") === 1
    && s.includes('import { useNotFoundShown } from "@/lib/not-found-mark";');
  for (const [name, file, line] of sites) ok(`5.4 · ${name} stands down for a journey page that is not a not-found page: ${line}`, overlay(read(file), line));
  ok("5.4′ PLANT · the chat's term without the mark (the market not-found loses its bubble again) is reported",
    !overlay(read(CHAT).replace(`if (${TERM}) return null;`, "if (journeyOn && isJourneySurface(pathname)) return null;"), sites[1][2]));
  ok("5.5 · the Needle's gate runs again when the mark comes or goes", read(NEEDLE).includes("}, [hiddenPref, pathname, journeyOn, notFoundShown]);"));
}
{
  // The journey's chrome: no path on a not-found page (no tab lit), no unread poll there.
  const chrome = (s: string) => s.includes("const route = usePathname();") && s.includes("const notFoundShown = useNotFoundShown();")
    && s.includes("const pathname = notFoundShown ? null : route;") && s.includes("useEffect(() => { setSheetOpen(false); }, [route]);")
    && s.includes("const active = activeTabFor(pathname);") && s.includes("aria-current={tabAriaCurrent(pathname, d.key)}");
  const bar = read(JHDR), tabs = read(JTABS);
  ok("5.6 · the header and the rail read no path on a not-found page — no destination and no tab lit (the market not-found lit Maswali) — and close a sheet on every move", chrome(bar) && chrome(tabs));
  ok("5.6′ PLANT · the rail lighting its tab from the address again is reported", !chrome(tabs.replace("const pathname = notFoundShown ? null : route;", "const pathname = route;")));
  const dot = (s: string) => s.includes('const content = d.key === "account" && userId !== null && pollers.dot && !notFoundShown');
  ok("5.7 · the Akaunti dot's counter is not mounted on a not-found page (its Server Action posted to the not-found address and logged a 404 each beat), nor the live bell (§1.4)",
    dot(tabs) && bar.includes("{pollers.bell && !notFoundShown ? <NotificationsPanel journey /> : <BellStill"));
  ok("5.7′ PLANT · the dot polling on a not-found page again is reported", !dot(tabs.replace(" && pollers.dot && !notFoundShown", " && pollers.dot")));
}
{
  // Before the scripts run: the server lit the tab the address names; the server's verdict in the same HTML unlights it,
  // by CSS, each lit value put back to the slot's own base value. ⚠️ MOVED IN ROUND 5 (review F5): the verdict is the
  // mark (an unmatched address) OR the boundary's 404 template (a record found missing inside a loading boundary).
  const id = `#${NF.NOT_FOUND_MARK}, ${VERDICT}`;
  const unlit = (css: string) => {
    const at = (sel: string) => rule(css, `:root:has(${id}) ${sel}`);
    const decl = (body: string, prop: string) => new RegExp(`(?:^|;)\\s*${esc(prop)}:\\s*([^;]+);`).exec(body)?.[1].trim();
    const base = { item: decl(rule(css, ".kp-rail__item"), "color"), label: decl(rule(css, ".kp-rail__label"), "font-weight"),
      link: decl(rule(css, ".kp-jnav__link"), "color"), after: decl(rule(css, ".kp-jnav__link::after"), "transform"),
      pipBg: decl(rule(css, ".kp-rail__pip"), "background") ?? "none", pipShadow: decl(rule(css, ".kp-rail__pip"), "box-shadow") ?? "none" };
    const got = { item: decl(at(".kp-rail--journey .kp-rail__item[data-on]"), "color"),
      pipBg: decl(at(".kp-rail--journey .kp-rail__item[data-on] .kp-rail__pip"), "background"),
      pipShadow: decl(at(".kp-rail--journey .kp-rail__item[data-on] .kp-rail__pip"), "box-shadow"),
      label: decl(at(".kp-rail--journey .kp-rail__item[data-on] .kp-rail__label"), "font-weight"),
      link: decl(at(".kp-jnav__link:is([aria-current], [data-on])"), "color"),
      after: decl(at(".kp-jnav__link:is([aria-current], [data-on])::after"), "transform") };
    const keys = ["item", "pipBg", "pipShadow", "label", "link", "after"] as const;
    return { ok: keys.every((k) => got[k] !== undefined && got[k] === base[k]) && base.after === "scaleX(0)", base, got };
  };
  const now = unlit(CSS);
  ok(`5.12 · until the scripts run, the server's not-found verdict (${id}) unlights the tab the server lit, every lit value put back to the slot's own`, now.ok, JSON.stringify({ base: now.base, got: now.got }));
  ok("5.12′ PLANT · the rail's lit pip left on a not-found page's first paint is reported",
    !unlit(CSS.replace(`:root:has(${id}) .kp-rail--journey .kp-rail__item[data-on] .kp-rail__pip { background: none; box-shadow: none; }`, "")).ok);
  ok("5.12″ PLANT · the rule reading the mark alone again (R4-J's: a missing question's, round's or proposal's first paint keeps its tab lit) is reported",
    !unlit(CSS.split(`:root:has(${id})`).join(`:root:has(#${NF.NOT_FOUND_MARK})`)).ok);
}
{
  // ⭐ ROUND 5 (review F5) · WHAT THE SERVER'S HTML OF A MISSING RECORD CARRIES, on React's own server renderer — Next's
  // compiled copy, the one the app renders with. A record found missing inside a loading boundary: no class error
  // boundary runs on the server, so no not-found page and no mark — the ghost, and the boundary's template with Next's
  // digest; written in the HTML when the verdict is in before the shell is sent, and by React's inline `$RX` script when
  // it streams in after. If an upgrade changes any of it, 5.12's selector reads nothing: re-measure before trusting it.
  const req = createRequire(import.meta.url);
  const R = req("next/dist/compiled/react") as typeof import("react");
  const { renderToPipeableStream: fizz } = req("next/dist/compiled/react-dom/server.node.js") as typeof import("react-dom/server");
  const notFoundError = () => Object.assign(new Error(NEXT_404), { digest: NEXT_404 });
  class Boundary extends R.Component<{ children?: import("react").ReactNode }, { nf: boolean }> {
    state = { nf: false };
    static getDerivedStateFromError() { return { nf: true }; }
    render() { return this.state.nf ? R.createElement("span", { hidden: true, id: NF.NOT_FOUND_MARK }) : this.props.children; }
  }
  const render = (Page: () => never, late: () => void) => new Promise<string>((resolve) => {
    let out = "";
    const sink = new Writable({ write(c, _e, cb) { out += c.toString(); cb(); } });
    const doc = R.createElement("html", null, R.createElement("body", null, R.createElement("header", null, "chrome"),
      R.createElement(R.Suspense, { fallback: R.createElement("div", { id: "ghost" }, "ghost") }, R.createElement(Boundary, null, R.createElement(Page)))));
    const s = fizz(doc, { onError: (e) => (e as { digest?: string }).digest, onShellReady() { s.pipe(sink); late(); } });
    setTimeout(() => resolve(out), 150);
  });
  const early = await render(() => { throw notFoundError(); }, () => undefined);
  ok(`5.13 · a verdict in before the shell: the HTML is the ghost and <template data-dgst="${NEXT_404}">, and no mark (no class boundary runs on the server)`,
    // (a development build adds data-msg and data-stck after the digest; production writes the digest alone)
    new RegExp(`<template data-dgst="${esc(NEXT_404)}"[^>]*></template>`).test(early) && early.includes('<div id="ghost">ghost</div>') && !early.includes(NF.NOT_FOUND_MARK), early.slice(0, 300));
  let ready = false, go = () => undefined as void;
  const wait = new Promise<void>((r) => { go = () => { ready = true; r(); }; });
  const streamed = await render(() => { if (!ready) throw wait; throw notFoundError(); }, () => { setTimeout(go, 20); });
  const call = /\$RX\("([^"]+)","([^"]+)"/.exec(streamed);
  const rx = /\$RX=(function\([^)]*\)\{[\s\S]*?\});/.exec(streamed)?.[1];
  const tpl = { dataset: {} as Record<string, string>, previousSibling: { data: "$?" } };
  if (call && rx) new Function("document", `var $RX=${rx};$RX(${JSON.stringify(call[1])},${JSON.stringify(call[2])});`)({ getElementById: (i: string) => (i === call[1] ? tpl : null) });
  ok(`5.14 · a verdict streamed in after the shell: React's inline $RX writes data-dgst="${NEXT_404}" onto the ghost's template before any app script runs`,
    !!call && streamed.includes(`<template id="${call[1]}"></template>`) && tpl.dataset.dgst === NEXT_404 && !streamed.includes(NF.NOT_FOUND_MARK), JSON.stringify({ call: call?.slice(1), dgst: tpl.dataset.dgst }));
  ok("5.14′ CONTROL · a record that IS there streams its page: no 404 template anywhere",
    !(await render(() => R.createElement("main", null, "the question") as never, () => undefined)).includes("data-dgst"));
}
{
  // ⭐ ROUND 5 (review F4) · THE ONE DECISION, for the path being drawn. Leaving a not-found page the router draws the next
  // page while the old span is still in the document; moving between two missing records the new span is not in yet.
  const CASES: Array<[string | null, string, boolean, string]> = [
    [null, "/markets", false, "no mark up"],
    ["/markets/mkt_gone", "/markets/mkt_gone", true, "the not-found page itself"],
    ["/markets/mkt_gone", "/markets", false, "leaving it: the next page drawn while the old span is up"],
    ["/markets/mkt_gone", "/markets/mkt_other", false, "a move to another address, before its own mark lands"],
    ["/updown/rnd_gone", "/updown/rnd_gone", true, "a missing round"],
  ];
  const wrong = CASES.filter(([m, p, want]) => NF.isNotFoundFor(m, p) !== want).map(([, , , why]) => why);
  ok("5.15 · `isNotFoundFor`: \"not found\" only when the mark that is up was drawn for the path being drawn", wrong.length === 0, wrong.join(" | "));
  const presence = (m: string | null) => m !== null;
  ok("5.15′ CONTROL · R4-J's presence rule answers \"not found\" for the next page while the old span is up (the F4 frame) — the case 5.15 tells apart",
    presence("/markets/mkt_gone") === true && NF.isNotFoundFor("/markets/mkt_gone", "/markets") === false);
}
{
  // The shared view (R4-K) renders the mark, so every not-found answer carries it and nothing else can.
  if (!existsSync(VIEW)) {
    pending("5.8 · the shared not-found view renders <NotFoundMark />", "this tree predates R4-K's not-found-view.tsx; its one-line wiring is S/r4j/not-found-view.r4j.patch, applied with this change");
  } else {
    const view = read(VIEW);
    const wired = (s: string) => s.includes('import { NotFoundMark } from "@/components/ui/not-found-mark";') && count(s, "<NotFoundMark />") === 1;
    ok("5.8 · the shared not-found view renders <NotFoundMark /> once — every not-found answer carries the mark", wired(view));
    ok("5.8′ PLANT · the view without it is reported", !wired(view.replace("<NotFoundMark />", "")));
    const pages = readdirSync("src/app", { recursive: true }).map(String).filter((p) => p.replace(/\\/g, "/").endsWith("not-found.tsx") && !p.replace(/\\/g, "/").startsWith("admin/"));
    const viaView = pages.filter((p) => read(join("src/app", p)).includes("<NotFoundView"));
    ok(`5.9 · every player-facing not-found page renders the shared view (${viaView.length}/${pages.length})`, pages.length > 0 && viaView.length === pages.length, JSON.stringify(pages));
  }
  const elsewhere = [...readdirSync("src", { recursive: true })].map(String).filter((p) => /\.tsx$/.test(p))
    .filter((p) => !p.replace(/\\/g, "/").endsWith("ui/not-found-view.tsx") && read(join("src", p)).includes("<NotFoundMark"));
  ok("5.10 · no other page renders the mark", elsewhere.length === 0, JSON.stringify(elsewhere));
}
{
  // The hook's answer, in a stand-in browser: the path the span was drawn for, heard through the event.
  const target = new EventTarget();
  const present = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown; document?: unknown };
  const before = { window: g.window, document: g.document };
  g.window = { addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target), dispatchEvent: target.dispatchEvent.bind(target) };
  g.document = { getElementById: (id: string) => (present.has(id) ? { getAttribute: (a: string) => (a === NF.NOT_FOUND_PATH_ATTR ? present.get(id)! : null) } : null) };
  try {
    let told = 0;
    const leave = NF.subscribeNotFound(() => { told++; });
    const a = NF.notFoundSnapshot();
    present.set(NF.NOT_FOUND_MARK, "/markets/mkt_gone"); NF.announceNotFound();
    const b = NF.notFoundSnapshot();
    present.delete(NF.NOT_FOUND_MARK); NF.announceNotFound();
    const c = NF.notFoundSnapshot();
    leave(); NF.announceNotFound();
    ok("5.11 · the snapshot is the path the span was drawn for (null with no span), every coming and going is heard once, and letting go stops listening",
      a === null && b === "/markets/mkt_gone" && c === null && told === 2, JSON.stringify({ a, b, c, told }));
  } finally {
    g.window = before.window;
    g.document = before.document;
  }
}

console.log(`\nvisual-pass-r4j: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
