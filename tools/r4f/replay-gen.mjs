
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { createHash } from "node:crypto";
const TREE = "F:/kipindi-r4f/";
const BASE = "http://localhost:3041";
const EMAIL_BAR_GONE = !existsSync(join(TREE, "src/components/layout/email-verify-banner.tsx"));
export const results = [];
const ok = (name, pass, detail = "") => { results.push(!!pass); console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${String(detail).slice(0, 300)}` : ""}`); };
const NL = "\n";
const msg = (e) => String(e?.message ?? e).split(NL)[0].slice(0, 200);
/**
 * ⭐ REACT'S DEV-ONLY PERFORMANCE-TRACK ERROR IS FILED, NEVER COMPARED (2026-10-04: it hit 6 /account cells on one run
 * of 2d0f56e7 and 16 on one of 55cb61e3, trees that do not touch /account). In a development build React 19 measures
 * each component's render on the browser's Performance timeline, and a render it dates before the page's own time
 * origin throws "Failed to execute 'measure' on 'Performance': '<zero-width space>Name' cannot have a negative time
 * stamp." A production build has no such measure, so no player can meet it; this harness runs against a local dev
 * server only. That exact sentence, and nothing else, goes to the cell's `devOnly` list (printed beside §4.1, never a
 * difference); §2.13 holds that nothing else is ever set aside, its plant proves it, and P.7d tries the filter itself.
 */
const DEV_MEASURE = new RegExp("^Failed to execute 'measure' on 'Performance': '" + String.fromCharCode(0x200b) + "?[A-Za-z0-9_$]+' cannot have a negative time stamp[.]$");
const isDevMeasure = (m) => DEV_MEASURE.test(m);
/** A page error, filed: React's DEV measure sentence to `devOnly`, everything else to `pageErrors`, which is compared. */
const fileError = (pageErrors, devOnly) => (e) => { const m = norm(msg(e)).slice(0, 160); (isDevMeasure(m) ? devOnly : pageErrors).push(m); };
const short = (sha) => String(sha ?? "").slice(0, 8);
const refuse = (text) => { console.error(`REFUSED — ${text}`); process.exit(2); };
const KIND = "kp-classic-shell-parity";
const VERSION = 2;   // 2 · S6 WP10: the matrix gained the Sell capture, so a v1 baseline cannot be compared — capture a new one
const VIEWERS = [
  { id: "guest", door: null, who: "a guest" },
  { id: "player", door: "/auth/demo", who: "the demo player" },
  { id: "held", door: "/auth/demo?hold=officer", who: "the demo player under an officer's hold" },
  { id: "unverified", door: "/auth/demo?email=unverified", who: "the demo player with an unconfirmed email" },
];
const LOCALES = ["en", "sw"];
const WIDTHS = [360, 768, 1024, 1280];
/** An unmatched path: the not-found page every viewer gets today, which /account is measured against. */
const NOT_FOUND = "/kp-parity-no-such-page";
const ROUTES = ["/", "/markets", "/positions", "/wallet", "/profile", "/account", NOT_FOUND];
/** The edge-protected routes: a guest is sent to sign-in, a signed-in viewer stays. */
const AUTH = ["/positions", "/wallet", "/profile"];
/** The one page BODY captured, for signed-in viewers: WP9 rebuilds /positions for journey viewers, and the demo
 *  player's portfolio is empty, so its classic body is the same from one server to the next. */
const BODY_ROUTE = "/positions";
const HEIGHT = 800;
/**
 * ⭐ WP10 · THE SELL CAPTURE (S6-PLAN WP10 step 3, A8): an open ticket in its free window, at the two places a classic
 * holder is sold to — its card on /positions and its question's holder block — at two widths in both languages. Taken
 * AFTER the matrix, so the demo portfolio the matrix reads is still empty. A cell is keyed by its place, never by the
 * question's id: each server mints its own. In one cell per language the button is pressed and the classic confirm it
 * opens is captured too (`confirm`).
 */
const SELL_PLACES = ["/positions", "/markets/:held"];
const SELL_CONFIRM = { width: 360, place: SELL_PLACES[1] };
const SELL = { locales: LOCALES, widths: [360, 1280], places: SELL_PLACES, confirm: SELL_CONFIRM };
/** A Sell place's route: the open ticket's question stands in for ":held". */
const routeOfPlace = (place, held) => (place === SELL_PLACES[1] ? `/markets/${held}` : place);
/** The Sell cells that press the button and capture the classic confirm it opens. */
const confirmCell = (width, place) => width === SELL_CONFIRM.width && place === SELL_CONFIRM.place;
/** The classic confirm, found by what it is: an open modal dialog holding the gold confirm button. */
const CONFIRM_GOLD = '[role="dialog"][aria-modal="true"] button.btn-gold';
const MATRIX = { viewers: VIEWERS.map((v) => v.id), locales: LOCALES, widths: WIDTHS, routes: ROUTES, body: BODY_ROUTE, height: HEIGHT, sell: SELL };
const HOST = new URL(BASE).hostname;
const keyOf = (v, l, w, r) => `${v}|${l}|${w}|${r}`;
const partsOf = (k) => { const [v, l, w, r] = k.split("|"); return { v, l, w: Number(w), r }; };

/**
 * ⭐ THE DIFFERENCES S6 MAKES ON PURPOSE FOR A CLASSIC VIEWER — each by name, with its reason and the number of cells it
 * covers, and each listed in VODACOM-PLAN §0i (A3). An entry names ONE field and either one exact transition
 * (`from` → `to`) or literal substitutions (`replace`) after which the baseline must equal the capture, so a second
 * change beside it is still caught. It must be seen in all of its cells or in none (§4.2): a change that landed for
 * part of its population is a defect, not the change. ⛔ Never a wildcard and never a re-baseline.
 */
const EXPECTED_DIFFS = [
  {
    id: "account-streams-200",
    field: "status",
    routes: ["/account"],
    from: 404,
    to: 200,
    cells: VIEWERS.length * LOCALES.length * WIDTHS.length,
    reason: "S6 WP5 adds the /account hub, which calls notFound() for every request the journey is not shown to. The root loading.tsx has streamed by then, so Next answers the not-found BODY at HTTP 200 where an unmatched path is a true 404 (pre-deploy-live-check.mjs: a 200 is not a render). The body, the title, noindex and the absence of any journey trace are asserted on every run (§3); beside the status only the robots meta moves, and that is its own entry (account-robots-noindex).",
  },
  {
    id: "account-robots-noindex",
    field: "notFound.robots",
    routes: ["/account"],
    from: ["index, follow", "noindex"].join(NL),
    to: ["noindex", "noindex, nofollow"].join(NL),
    cells: VIEWERS.length * LOCALES.length * WIDTHS.length,
    reason: "S6 WP5 (A2): /account's own generateMetadata answers every request the journey is not shown to with the not-found page's title and robots noindex, nofollow. On a matched route that page metadata REPLACES the root layout's 'index, follow', and Next adds a noindex of its own only to a 404, so at HTTP 200 the bytes carry Next's not-found noindex plus the page's own noindex, nofollow (measured on the first compare after WP5: every /account cell) where an unmatched path sends the pair above. Still noindex for a crawler (§3.3 holds it on every run); the title is the same string (§3.2).",
  },
  {
    id: "footer-rail-h",
    field: "regions.footer.html",
    replace: [["pb-[calc(88px+env(safe-area-inset-bottom))]", "pb-[calc(var(--rail-h)+env(safe-area-inset-bottom))]"]],
    cells: VIEWERS.length * LOCALES.length * WIDTHS.length * ROUTES.length,
    reason: "S6 WP11: the footer's rail reserve names the token --rail-h (88px, globals.css) instead of the literal, so its class string moves in every cell while what it computes does not — footerPaddingBottom and scrollPaddingBottom are their own fields, compared in every cell, and must still be equal (88px below 1024; the footer 0px from 1024).",
  },
];
/**
 * ⭐ THE VISUAL PASS (VODACOM-PLAN, 2026-10-08 and 09) — AND THE CLASSIC /positions EMPTY STATE, NAMED. Pushed after the
 * list's literal, as A8f's Sell entries are. The pass fixes the shared EmptyState for every player, so the one page body
 * this harness captures (the signed-in viewers' /positions, an empty demo portfolio) changes on purpose: its markup in
 * all 24 of those cells (positions-empty-state) and the boxes it draws, which differ by language in one line only, so each
 * language has its entry (positions-empty-state-layout-en and -sw). The lines below are MEASURED: the first compare after
 * the change (the visual-pass branch 90cb52ea against main d9b7a5b6's baseline) recorded each one, its .current.json was
 * read, and every pair is a line of the baseline and the line that compare drew in its place (A3: named, never
 * re-baselined). Each layout entry is `alongside` the markup entry, and 4.2b holds that pairing as 4.6 holds the Sell
 * cells'. The footer's proposals link, which the pass balanced too, is the journey's alone (AppShell's footer arms,
 * `test:simple-journey-flag` 10.shell.chrome.footer), so the footer fields need no entry: they compare equal.
 */
/** The element lines of the /positions body the new frame moves that are the same in both languages, at each width; the
 *  one that is not, the call to action's link, is in each language's entry. */
const POSITIONS_EMPTY_LINES = [
  // 360
  ["main>div0 0,0,360x504.5 887be6898e5a", "main>div0 0,0,360x490.5 887be6898e5a"],
  ["main>div0>div0 0,0,360x504.5 c40d393d6ac9", "main>div0>div0 0,0,360x490.5 c40d393d6ac9"],
  ["main>div0>div0>div1 16,161,328x311.5 53a421008486", "main>div0>div0>div1 16,161,328x297.5 53a421008486"],
  ["main>div0>div0>div1>div0 152,210,56x56 aab549578a34", "main>div0>div0>div1>div0 152,210,56x42 aab549578a34"],
  ["main>div0>div0>div1>div0>svg0 152,210,56x56 1fbd13e14b46", "main>div0>div0>div1>div0>svg0 152,210,56x42 1fbd13e14b46"],
  ["main>div0>div0>div1>div0>svg0>rect0 162,231,36x25 71750688cbd7", "main>div0>div0>div1>div0>svg0>rect0 162,217,36x25 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>path1 174,225,12x6 71750688cbd7", "main>div0>div0>div1>div0>svg0>path1 174,211,12x6 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>line2 162,241,13x0 71750688cbd7", "main>div0>div0>div1>div0>svg0>line2 162,227,13x0 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>line3 185,241,13x0 71750688cbd7", "main>div0>div0>div1>div0>svg0>line3 185,227,13x0 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>rect4 178,239,4x4 f80e4d97fa87", "main>div0>div0>div1>div0>svg0>rect4 178,225,4x4 f80e4d97fa87"],
  ["main>div0>div0>div1>p1 65,286,230x23.5 970ebca579a8", "main>div0>div0>div1>p1 65,272,230x23.5 970ebca579a8"],
  ["main>div0>div0>div1>p2 65,321.5,230x42.5 f5620447af06", "main>div0>div0>div1>p2 65,307.5,230x42.5 f5620447af06"],
  ["main>div0>div0>div1>div3 65,383.5,230x40 d887440a6643", "main>div0>div0>div1>div3 65,369.5,230x40 d887440a6643"],
  // 768
  ["main>div0 0,0,768x464 887be6898e5a", "main>div0 0,0,768x450 887be6898e5a"],
  ["main>div0>div0 0,0,768x464 c40d393d6ac9", "main>div0>div0 0,0,768x450 c40d393d6ac9"],
  ["main>div0>div0>div1 16,141.5,736x290.5 53a421008486", "main>div0>div0>div1 16,141.5,736x276.5 53a421008486"],
  ["main>div0>div0>div1>div0 356,190.5,56x56 aab549578a34", "main>div0>div0>div1>div0 356,190.5,56x42 aab549578a34"],
  ["main>div0>div0>div1>div0>svg0 356,190.5,56x56 1fbd13e14b46", "main>div0>div0>div1>div0>svg0 356,190.5,56x42 1fbd13e14b46"],
  ["main>div0>div0>div1>div0>svg0>rect0 366,211.5,36x25 71750688cbd7", "main>div0>div0>div1>div0>svg0>rect0 366,197.5,36x25 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>path1 378,205.5,12x6 71750688cbd7", "main>div0>div0>div1>div0>svg0>path1 378,191.5,12x6 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>line2 366,221.5,13x0 71750688cbd7", "main>div0>div0>div1>div0>svg0>line2 366,207.5,13x0 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>line3 389,221.5,13x0 71750688cbd7", "main>div0>div0>div1>div0>svg0>line3 389,207.5,13x0 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>rect4 382,219.5,4x4 f80e4d97fa87", "main>div0>div0>div1>div0>svg0>rect4 382,205.5,4x4 f80e4d97fa87"],
  ["main>div0>div0>div1>p1 65,266.5,638x23.5 970ebca579a8", "main>div0>div0>div1>p1 65,252.5,638x23.5 970ebca579a8"],
  ["main>div0>div0>div1>p2 65,302,638x21 f5620447af06", "main>div0>div0>div1>p2 65,288,638x21 f5620447af06"],
  ["main>div0>div0>div1>div3 65,343,638x40 d887440a6643", "main>div0>div0>div1>div3 65,329,638x40 d887440a6643"],
  // 1024
  ["main>div0 0,0,1024x464 887be6898e5a", "main>div0 0,0,1024x450 887be6898e5a"],
  ["main>div0>div0 0,0,1024x464 a217b37c4aa0", "main>div0>div0 0,0,1024x450 a217b37c4aa0"],
  ["main>div0>div0>div1 32,141.5,960x290.5 53a421008486", "main>div0>div0>div1 32,141.5,960x276.5 53a421008486"],
  ["main>div0>div0>div1>div0 484,190.5,56x56 aab549578a34", "main>div0>div0>div1>div0 484,190.5,56x42 aab549578a34"],
  ["main>div0>div0>div1>div0>svg0 484,190.5,56x56 1fbd13e14b46", "main>div0>div0>div1>div0>svg0 484,190.5,56x42 1fbd13e14b46"],
  ["main>div0>div0>div1>div0>svg0>rect0 494,211.5,36x25 71750688cbd7", "main>div0>div0>div1>div0>svg0>rect0 494,197.5,36x25 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>path1 506,205.5,12x6 71750688cbd7", "main>div0>div0>div1>div0>svg0>path1 506,191.5,12x6 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>line2 494,221.5,13x0 71750688cbd7", "main>div0>div0>div1>div0>svg0>line2 494,207.5,13x0 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>line3 517,221.5,13x0 71750688cbd7", "main>div0>div0>div1>div0>svg0>line3 517,207.5,13x0 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>rect4 510,219.5,4x4 f80e4d97fa87", "main>div0>div0>div1>div0>svg0>rect4 510,205.5,4x4 f80e4d97fa87"],
  ["main>div0>div0>div1>p1 81,266.5,862x23.5 970ebca579a8", "main>div0>div0>div1>p1 81,252.5,862x23.5 970ebca579a8"],
  ["main>div0>div0>div1>p2 81,302,862x21 f5620447af06", "main>div0>div0>div1>p2 81,288,862x21 f5620447af06"],
  ["main>div0>div0>div1>div3 81,343,862x40 d887440a6643", "main>div0>div0>div1>div3 81,329,862x40 d887440a6643"],
  // 1280
  ["main>div0 0,0,1280x464 887be6898e5a", "main>div0 0,0,1280x450 887be6898e5a"],
  ["main>div0>div0 100,0,1080x464 d6ec7648883b", "main>div0>div0 100,0,1080x450 d6ec7648883b"],
  ["main>div0>div0>div1 132,141.5,1016x290.5 53a421008486", "main>div0>div0>div1 132,141.5,1016x276.5 53a421008486"],
  ["main>div0>div0>div1>div0 612,190.5,56x56 aab549578a34", "main>div0>div0>div1>div0 612,190.5,56x42 aab549578a34"],
  ["main>div0>div0>div1>div0>svg0 612,190.5,56x56 1fbd13e14b46", "main>div0>div0>div1>div0>svg0 612,190.5,56x42 1fbd13e14b46"],
  ["main>div0>div0>div1>div0>svg0>rect0 622,211.5,36x25 71750688cbd7", "main>div0>div0>div1>div0>svg0>rect0 622,197.5,36x25 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>path1 634,205.5,12x6 71750688cbd7", "main>div0>div0>div1>div0>svg0>path1 634,191.5,12x6 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>line2 622,221.5,13x0 71750688cbd7", "main>div0>div0>div1>div0>svg0>line2 622,207.5,13x0 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>line3 645,221.5,13x0 71750688cbd7", "main>div0>div0>div1>div0>svg0>line3 645,207.5,13x0 71750688cbd7"],
  ["main>div0>div0>div1>div0>svg0>rect4 638,219.5,4x4 f80e4d97fa87", "main>div0>div0>div1>div0>svg0>rect4 638,205.5,4x4 f80e4d97fa87"],
  ["main>div0>div0>div1>p1 181,266.5,918x23.5 970ebca579a8", "main>div0>div0>div1>p1 181,252.5,918x23.5 970ebca579a8"],
  ["main>div0>div0>div1>p2 181,302,918x21 f5620447af06", "main>div0>div0>div1>p2 181,288,918x21 f5620447af06"],
  ["main>div0>div0>div1>div3 181,343,918x40 d887440a6643", "main>div0>div0>div1>div3 181,329,918x40 d887440a6643"],
];
EXPECTED_DIFFS.push(
  {
    id: "positions-empty-state",
    field: "regions.main.html",
    routes: [BODY_ROUTE],
    replace: [
      ["<svg viewBox=\"0 0 56 56\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" width=\"56\" height=\"56\">", "<svg viewBox=\"0 14 56 42\" width=\"56\" height=\"42\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">"],
      ["<p class=\"font-display text-[15.5px] font-semibold text-balance text-text\">", "<p class=\"font-display text-[15.5px] font-semibold text-balance [word-break:keep-all] [overflow-wrap:break-word] text-text\">"],
      ["<p class=\"mt-2 text-body-sm leading-relaxed text-text-subtle\">", "<p class=\"mt-2 text-body-sm leading-relaxed text-balance [word-break:keep-all] [overflow-wrap:break-word] text-text-subtle\">"],
    ],
    cells: VIEWERS.filter((v) => v.door).length * LOCALES.length * WIDTHS.length,
    reason: "The visual pass, in the shared EmptyState, for every player — and so in the signed-in viewers' classic /positions body, the one page body this harness captures. Three strings move and no word does: the briefcase drawing's frame starts at its ink (R3-C b8277778, INK_TOP in empty-state.tsx: viewBox 0 14 56 42 at 56x42 where it was 0 0 56 56 at 56x56, one unit to one pixel as before; React now writes the frame's three attributes first), so the ink opens 48px inside the dashed box, as the call to action closes 48px inside it (at 360 the handle's top stroke stood 62.25px under the box's inner top, and stands 48.25px under it now); the title takes G3's whole-word classes ([word-break:keep-all] [overflow-wrap:break-word]: Chinese breaks between words, never inside one); and the body takes them too, balanced (G3 95a8e2a5: text-balance, so a centred body never leaves one word under a full line). In all 24 signed-in /positions cells, en and sw alike. Served but captured by no field: where the body's two lines at 360 break, which balancing may move while its box stays 230x42.5 (measured), and the same frame and classes on every other EmptyState a classic player meets.",
  },
  {
    id: "positions-empty-state-layout-en",
    field: "regions.main.layout",
    routes: [BODY_ROUTE],
    replace: [
      ...POSITIONS_EMPTY_LINES,
      ["main>div0>div0>div1>div3>a0 108.5,383.5,142.5x40 f3dead1406b7", "main>div0>div0>div1>div3>a0 108.5,369.5,142.5x40 f3dead1406b7"],
      ["main>div0>div0>div1>div3>a0 312.5,343,142.5x40 f3dead1406b7", "main>div0>div0>div1>div3>a0 312.5,329,142.5x40 f3dead1406b7"],
      ["main>div0>div0>div1>div3>a0 440.5,343,142.5x40 f3dead1406b7", "main>div0>div0>div1>div3>a0 440.5,329,142.5x40 f3dead1406b7"],
      ["main>div0>div0>div1>div3>a0 568.5,343,142.5x40 f3dead1406b7", "main>div0>div0>div1>div3>a0 568.5,329,142.5x40 f3dead1406b7"],
    ],
    cells: VIEWERS.filter((v) => v.door).length * WIDTHS.length,
    alongside: "positions-empty-state",
    reason: "The boxes the drawing's new frame draws in the 12 English /positions cells (the 3 signed-in viewers at 4 widths), measured (above): the drawing's wrapper and its svg 14px shorter (56x56 to 56x42); the five shapes inside 14px higher, since the frame now starts 14 units down; the title, the body, the call to action's row and its link 14px higher; and the empty state's dashed box, the page container and the wrapper above it 14px shorter (that wrapper, main>div0, 504.5 to 490.5 at 360 and 464 to 450 from 768; <main> itself, which fills the window, keeps its box). No x, no width and no computed style moves — the harness records no text-wrap, word-break or overflow-wrap, so G3's classes draw no signature, and the title and body keep their boxes (one line each from 768; at 360 the body's two). The call to action's link is the one line that differs by language — 142.5px wide here, 143 in Swahili — so Swahili has its own entry.",
  },
  {
    id: "positions-empty-state-layout-sw",
    field: "regions.main.layout",
    routes: [BODY_ROUTE],
    replace: [
      ...POSITIONS_EMPTY_LINES,
      ["main>div0>div0>div1>div3>a0 108.5,383.5,143x40 f3dead1406b7", "main>div0>div0>div1>div3>a0 108.5,369.5,143x40 f3dead1406b7"],
      ["main>div0>div0>div1>div3>a0 312.5,343,143x40 f3dead1406b7", "main>div0>div0>div1>div3>a0 312.5,329,143x40 f3dead1406b7"],
      ["main>div0>div0>div1>div3>a0 440.5,343,143x40 f3dead1406b7", "main>div0>div0>div1>div3>a0 440.5,329,143x40 f3dead1406b7"],
      ["main>div0>div0>div1>div3>a0 568.5,343,143x40 f3dead1406b7", "main>div0>div0>div1>div3>a0 568.5,329,143x40 f3dead1406b7"],
    ],
    cells: VIEWERS.filter((v) => v.door).length * WIDTHS.length,
    alongside: "positions-empty-state",
    reason: "The boxes the drawing's new frame draws in the 12 Swahili /positions cells (the 3 signed-in viewers at 4 widths), measured (above): the same 13 lines at each width as in English — the drawing 14px shorter, its shapes and everything under it 14px higher, the dashed box, the page container and the wrapper above it 14px shorter — and the call to action's link, 143px wide in Swahili (142.5 in English), 14px higher. No x, no width and no computed style moves.",
  },
);
/**
 * ⭐ S6 A8e · THE SELL BUTTON'S FIRST PAINT, NAMED. Not a field of the Sell cells: each cell captures its first paint beside
 * them (`served`: every script held, nothing hydrated, S.4). A compare holds it to the baseline's own first paint when the
 * baseline has one (under SELL_EXPECTED_DIFFS: a null compare passes on any tree), and otherwise to this transition: the
 * first paint is the baseline's Sell button as the browser drew it once the page had started, strip and button, markup
 * and every box and style, under SELL_EXPECTED_DIFFS (firstPaintOf, 4.4f) — in all of its cells or in none.
 */
const SELL_FIRST_PAINT = {
  id: "sell-first-paint",
  cells: SELL.locales.length * SELL.widths.length * SELL.places.length,
  reason: "S6 A8e: the Sell button's countdown starts at the time its instant had left at the server's own render, so the server paints the arm the browser then draws. Inside the free window that is the strip (its countdown the server's m:ss) and the free button, 'Toka bila gharama · TZS {stake} · pesa yote', where the server painted 'Uza sasa · TZS {stake} −0 ada' with no strip until the page had started on the phone (the A8b drive saw that picture on a Back restore; on a slow phone it lasts seconds, and the strip then pushed the button down). Every Sell cell captures its first paint with the page's scripts held (S.4). Against a baseline captured before first paints were (the v2 file), each first paint must be the baseline's Sell button as the browser drew it; against a baseline with first paints of its own, the same first paint is the same, and A8e's change is this transition. The first paint before A8e, and a strip whose note the server writes as two texts, differ (P.5f).",
};

/** The named differences seen in some of their cells but not all. */
const partialExpected = (hits, list = EXPECTED_DIFFS) => list
  .filter((e) => { const n = hits.get(e.id) ?? 0; return n !== 0 && n !== e.cells; })
  .map((e) => `${e.id} in ${hits.get(e.id)} of its ${e.cells} cells`);
/** S6 A8b's two substitutions — the free note's span gains its narrow-phone classes — which every Sell place's entry
 *  carries, because each entry is matched alone against the baseline. */
const SELL_NOTE_PAIRS = [
  ['<span class="ml-1.5 opacity-80 text-[11px]">full refund</span>', '<span class="ml-1.5 hidden opacity-80 text-[11px] xs:inline">full refund</span>'],
  ['<span class="ml-1.5 opacity-80 text-[11px]">pesa yote</span>', '<span class="ml-1.5 hidden opacity-80 text-[11px] xs:inline">pesa yote</span>'],
];
/**
 * ⭐ WP10 · THE NAMED DIFFERENCES FOR THE SELL CELLS — S6 A8b's, A8d's and A8g's here (S6 A8f's two are pushed after this literal). A8: a classic holder's Sell button on a
 * default poll with an hour to run compares equal with the baseline captured before A8's live half; any other difference
 * is a named entry here (with its field, its routes and its `cells`), never a re-baseline. An entry `alongside` another
 * is a layout that other entry's served change causes: whenever that entry is seen, this one must be seen in all of
 * its cells (§4.6).
 */
const SELL_EXPECTED_DIFFS = [
  {
    id: "sell-positions-wrap",
    field: "regions.button.html",
    routes: [SELL_PLACES[0]],
    replace: [...SELL_NOTE_PAIRS, ['class="btn btn-primary btn-md w-full whitespace-normal"', 'class="btn btn-primary btn-md w-full whitespace-normal kp-sell-wrap"']],
    cells: SELL.locales.length * SELL.widths.length,
    reason: "S6 A8g, carrying S6 A8b's two pairs (named sell-narrow-phone until A8d and A8g split them by place): every host that does not ask for the stack is drawn the wrap class, so /positions' Sell button carries kp-sell-wrap at every width beside A8b's free-note classes (below 360 the free note is left out — the strip above already says there is no fee — so the free row fits a 320 phone; each entry is matched alone against the baseline, so this one carries those pairs too). The rule is phone-only (globals.css, below 640): at 1280 every box and computed style is as before (regions.button.layout, compared there); at 360 the figure becomes a wrapping row whose note sits the same 8px from the figure while the row fits — its styles move, which sell-positions-wrap-layout-en and -sw name, measured — and goes under the figure where one line cannot hold both (the Swahili free row for TZS 1,000,000 from 360px — to 376px with the label as this baseline measured it, to 383px by the static model, whose label is an upper bound and which also runs a six-figure stake over to 366px — and a Chinese legacy paid row with a six-figure fee at 320 to 324px; the seeded TZS 1,500 row fits, so no captured cell wraps). Served but captured by no field: the stylesheet's second phone block (two rules, matching only .kp-sell-wrap), and on a phone, for those big rows, the note under the figure (VODACOM-PLAN §0i A8g).",
  },
  {
    id: "sell-holder-stack",
    field: "regions.button.html",
    routes: [SELL_PLACES[1]],
    replace: [...SELL_NOTE_PAIRS, ['class="btn btn-primary btn-md w-full whitespace-normal"', 'class="btn btn-primary btn-md w-full whitespace-normal kp-sell-stack"']],
    cells: SELL.locales.length * SELL.widths.length,
    reason: "S6 A8d: the question page's holder block asks for the stacked phone row (stackOnPhone), so its Sell button carries the class kp-sell-stack at every width, beside A8b's two free-note pairs (each entry is matched alone against the baseline, so this one carries them too). The rule is phone-only (globals.css, below 640): at 1280 every box and computed style is as before (regions.button.layout, compared there), and at 360 the layout change is named and measured in sell-holder-stack-layout-en and -sw. Served but captured by no field: stackOnPhone in the holder block's RSC props, the stylesheet's phone block (four rules, matching only .kp-sell-stack) and, below 640, each open ticket's row 12px taller, so what sits below it moves down by that (VODACOM-PLAN §0i A8d).",
  },
  {
    id: "sell-holder-stack-layout-en",
    field: "regions.button.layout",
    routes: [SELL_PLACES[1]],
    from: ["button 0,0,244x44 37d8523472ca", "button>span0 17,11.5,58.5x21 45460ad82491", "button>span1 83.5,11.5,157.5x21 26d4736268fd", "button>span1>span0 167.5,15.5,73.5x14 eaada7832e2a"].join(NL),
    to: ["button 0,0,244x56 4d14f648b0ca", "button>span0 17,9.5,210x17.5 4c6c729da7e2", "button>span1 43,29,157.5x17.5 b31d22835d05", "button>span1>span0 127.5,32,73.5x14 ddccd0e4e23f"].join(NL),
    cells: 1,
    alongside: "sell-holder-stack",
    reason: "S6 A8d: below 640 the holder block's Sell button stacks — the --h-control-xl rung (244x44 becomes 244x56), the label on one centred line, the figure and its note centred on the next. The v2 baseline measured this one-line row 14px past the button's content in English (the Swahili cell has its own entry). The `to` is this cell's layout as the first compare after A8d measured it, copied from that compare's .current.json and named exactly (A3), never re-baselined.",
  },
  {
    id: "sell-holder-stack-layout-sw",
    field: "regions.button.layout",
    routes: [SELL_PLACES[1]],
    from: ["button 0,0,244x44 37d8523472ca", "button>span0 17,11.5,124.5x21 45460ad82491", "button>span1 149.5,11.5,144.5x21 26d4736268fd", "button>span1>span0 234,15.5,60x14 eaada7832e2a"].join(NL),
    to: ["button 0,0,244x56 4d14f648b0ca", "button>span0 17,9.5,210x17.5 4c6c729da7e2", "button>span1 50,29,144.5x17.5 10ccfd5d433e", "button>span1>span0 134,32,60x14 ddccd0e4e23f"].join(NL),
    cells: 1,
    alongside: "sell-holder-stack",
    reason: "S6 A8d: below 640 the holder block's Sell button stacks — the --h-control-xl rung (244x44 becomes 244x56), the label on one centred line, the figure and its note centred on the next. The v2 baseline measured this one-line row 67px past the button's content and 50px past its edge in Swahili (the English cell has its own entry). The `to` is this cell's layout as the first compare after A8d measured it, copied from that compare's .current.json and named exactly (A3), never re-baselined.",
  },
  {
    id: "sell-positions-wrap-layout-en",
    field: "regions.button.layout",
    routes: [SELL_PLACES[0]],
    from: ["button 0,0,328x44 37d8523472ca", "button>span0 17,11.5,58.5x21 45460ad82491", "button>span1 153.5,11.5,157.5x21 26d4736268fd", "button>span1>span0 237.5,15.5,73.5x14 eaada7832e2a"].join(NL),
    to: ["button 0,0,328x44 37d8523472ca", "button>span0 17,11.5,58.5x21 45460ad82491", "button>span1 153.5,11.5,157.5x21 859d7521d520", "button>span1>span0 237.5,14.5,73.5x16.5 d3ac43da1926"].join(NL),
    cells: 1,
    alongside: "sell-positions-wrap",
    reason: "S6 A8g: below 640 the /positions Sell button's figure is a wrapping flex row — display flex, wrap, its lines at the right end on one baseline, an 8px column gap where the note's own 8px margin was — so the figure's and the note's computed styles move, and the note's box becomes a flex item's (its line's 16.5px height, where it was an inline box), while every glyph stays where it was: the seeded TZS 1,500 row fits on one line, so nothing wraps in this cell (the Swahili cell has its own entry). The `to` is this cell's layout as the first compare after A8g measured it, copied from that compare's .current.json and named exactly (A3), never re-baselined.",
  },
  {
    id: "sell-positions-wrap-layout-sw",
    field: "regions.button.layout",
    routes: [SELL_PLACES[0]],
    from: ["button 0,0,328x44 37d8523472ca", "button>span0 17,11.5,124.5x21 45460ad82491", "button>span1 166.5,11.5,144.5x21 26d4736268fd", "button>span1>span0 251,15.5,60x14 eaada7832e2a"].join(NL),
    to: ["button 0,0,328x44 37d8523472ca", "button>span0 17,11.5,124.5x21 45460ad82491", "button>span1 166.5,11.5,144.5x21 859d7521d520", "button>span1>span0 251,14.5,60x16.5 d3ac43da1926"].join(NL),
    cells: 1,
    alongside: "sell-positions-wrap",
    reason: "S6 A8g: below 640 the /positions Sell button's figure is a wrapping flex row — display flex, wrap, its lines at the right end on one baseline, an 8px column gap where the note's own 8px margin was — so the figure's and the note's computed styles move, and the note's box becomes a flex item's (its line's 16.5px height, where it was an inline box), while every glyph stays where it was: the seeded TZS 1,500 row fits on one line in Swahili too, so nothing wraps in this cell (the English cell has its own entry). The `to` is this cell's layout as the first compare after A8g measured it, copied from that compare's .current.json and named exactly (A3), never re-baselined.",
  },
  {
    id: "sell-strip-whole",
    field: "regions.strip.html",
    routes: SELL_PLACES,
    replace: [['<div class="mb-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-500/[0.12] border border-brand-500/30">', '<div class="mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-2 py-1 rounded-md bg-brand-500/[0.12] border border-brand-500/30">']],
    cells: SELL.locales.length * SELL.widths.length * SELL.places.length,
    reason: "S6 A8g: the free strip above the Sell button keeps each of its three parts whole and wraps only between them — it becomes a wrapping row (flex-wrap: a part that cannot share a line moves to the next one whole), its one gap split into 8px between parts and 2px between lines — on both hosts, in every Sell cell. Its words, figures and look are as before; in the holder block at 360 in Swahili, where its parts broke inside (TOKA BILA over GHARAMA, · Hakuna over ada), they now read TOKA BILA GHARAMA m:ss over · Hakuna ada, each whole (sell-strip-whole-layout). Served but captured by no field: in the holder block in Swahili the strip takes those two whole lines from 320 to 376px, and to 382px while its countdown reads ten minutes or more — 42px tall, where the squeezed strip it replaces measured 40 at 360 — so its ticket row there is 2px taller (VODACOM-PLAN §0i A8g).",
  },
  {
    id: "sell-strip-whole-layout",
    field: "regions.strip.layout",
    routes: SELL_PLACES,
    replace: [
      // The one signature the strip's classes move, in every Sell cell: the strip's own (flex-wrap, gap); its parts' are untouched.
      ["e13135b54c89", "611525a567fa"],
      // The one cell whose Swahili parts no longer share a line, the holder block at 360: the free word and the countdown whole on the first line, the note whole on the second, 2px below.
      ["div 0,0,244x40 ", "div 0,0,244x42 "], ["div>span0 13,6,112x28 ", "div>span0 13,5.5,122.5x14 "], ["div>span1 133,12.5,24x15 ", "div>span1 143.5,5,24x15 "], ["div>span2 165,5,66x30 ", "div>span2 13,22,72x15 "],
    ],
    cells: SELL.locales.length * SELL.widths.length * SELL.places.length,
    alongside: "sell-strip-whole",
    reason: "S6 A8g: the boxes and computed styles the strip's classes draw, predicted from the v2 baseline's own capture: in every Sell cell the strip's signature moves by flex-wrap (wrap) and gap (2px 8px), its parts' not at all — the new id re-derived as the harness writes one, the first 12 hex digits of the sha1 of the signature text, the method checked against every id the baseline holds; and in the one cell whose Swahili parts no longer share a line (the holder block at 360) the strip grows 2px (40 to 42), the free word and the countdown sit whole on its first line and the note whole on its second, 2px below. Any other box or style is still a failure, read from its capture and never re-baselined (A3).",
  },
];
/** S6 A8d · the measured Sell differences missing beside the served change that causes them: an entry `alongside` another
 *  must be seen in all of its cells whenever that other is seen at all (§4.6). A compare where neither is seen — a null
 *  compare at the baseline's own commit — passes; the stack's class served while its rule no longer applies (the holder
 *  block's layout back to the baseline's one line, so its layout entries are never hit) does not. */
const missingAlongside = (hits, list) => list
  .filter((e) => e.alongside && (hits.get(e.alongside) ?? 0) > 0 && (hits.get(e.id) ?? 0) !== e.cells)
  .map((e) => `${e.id} in ${hits.get(e.id) ?? 0} of its ${e.cells} cell(s), beside ${e.alongside} in ${hits.get(e.alongside)}`);

/**
 * ⭐ S6 A8f · THE CLASSIC CONFIRM'S RECEIVE ROW — two more named Sell differences, pushed after the list's literal (whose
 * comment names the entries written in it): the confirm's markup and the boxes it draws, in the 2 cells that capture the
 * confirm (the holder block at 360, in en and in sw). Before A8f the row squeezed the figure's column whenever the fee
 * column could not share its line, and the Swahili figure broke between "TZS" and "1,500" — in the v2 baseline itself.
 * Now the figure is an amount and the row wraps (test:sell-grace-truth §6). The boxes are predicted from the baseline's
 * own lines and §6's model: a compare that draws any other box or style is still a failure, read from its capture, and
 * never re-baselined (A3).
 */
SELL_EXPECTED_DIFFS.push(
  {
    id: "sell-confirm-whole-figure",
    field: "regions.confirm.html",
    routes: [SELL_CONFIRM.place],
    replace: [
      ['<div class="flex items-baseline justify-between">', '<div class="flex flex-wrap items-baseline justify-between gap-y-2">'],
      ['<p class="font-mono font-bold text-[24px] tabular-nums leading-none text-text">', '<p class="amount font-bold text-[24px] leading-none text-text">'],
      ['<div class="text-right">', '<div class="grow text-right">'],
      ['<p class="font-bold text-title-sm amount leading-none"', '<p class="pl-3 font-bold text-title-sm amount leading-none"'],
    ],
    // The classic confirm is captured at one Sell place and one width, once per language.
    cells: SELL.locales.length,
    reason: "S6 A8f: the classic confirm's money figure is one object and its receive row reflows (test:sell-grace-truth §6). The figure under 'Utapokea' is an amount, so it can no longer break between 'TZS' and '1,500' (a browser drew that in Swahili at 360 and 390); the row wraps when the fee column cannot share its line; alone on its line the fee column grows to the box's width, its words at the right edge; and the fee keeps a 16px clear space before it, so two figures never run together. Four class strings in each of the 2 confirm cells; no word moves.",
  },
  {
    id: "sell-confirm-receive-boxes",
    field: "regions.confirm.layout",
    routes: [SELL_CONFIRM.place],
    replace: [
      ["div>div1>div3>div0 62,294.5,236x54 56cb43a53f4a", "div>div1>div3>div0 62,294.5,236x54 e76095205a99"],
      ["div>div1>div3>div0>div0>p1 62,312.5,129.5x24 031b91c7e9d1", "div>div1>div3>div0>div0>p1 62,312.5,129.5x24 f7571d413510"],
      ["div>div1>div3>div0>div1 194.5,294.5,103.5x54 549c3b7beb3a", "div>div1>div3>div0>div1 191.5,294.5,106.5x54 06a7583be258"],
      ["div>div1>div3>div0>div1>p0 194.5,294.5,103.5x14 433cbceff890", "div>div1>div3>div0>div1>p0 191.5,294.5,106.5x14 433cbceff890"],
      ["div>div1>div3>div0>div1>p1 194.5,312.5,103.5x18 1c05953eb795", "div>div1>div3>div0>div1>p1 191.5,312.5,106.5x18 ffa1e5f38c19"],
      ["div>div1>div3>div0>div1>p2 194.5,334.5,103.5x14 2a5356411008", "div>div1>div3>div0>div1>p2 191.5,334.5,106.5x14 2a5356411008"],
      ["div>div1 16,150.5,328x498.5 58a6165dc5fe", "div>div1 16,130.5,328x538.5 c75803fd504c"],
      ["div>div1>button0 279,167.5,48x48 86535f510400", "div>div1>button0 279,147.5,48x48 86535f510400"],
      ["div>div1>button0>svg0 295,183.5,16x16 8515467971a9", "div>div1>button0>svg0 295,163.5,16x16 8515467971a9"],
      ["div>div1>button0>svg0>path0 299,187.5,8x8 67f5b2ca0762", "div>div1>button0>svg0>path0 299,167.5,8x8 67f5b2ca0762"],
      ["div>div1>div1 41,175.5,278x40 3a75c63aac99", "div>div1>div1 41,155.5,278x40 3a75c63aac99"],
      ["div>div1>div1>p0 41,175.5,278x14 3821150f6de4", "div>div1>div1>p0 41,155.5,278x14 3821150f6de4"],
      ["div>div1>div1>p1 41,193.5,278x22 fb2ead8a8a0d", "div>div1>div1>p1 41,173.5,278x22 fb2ead8a8a0d"],
      ["div>div1>p2 41,235.5,278x15 466fbbcb9ad3", "div>div1>p2 41,215.5,278x15 466fbbcb9ad3"],
      ["div>div1>p2>svg0 41,238.5,10x10 5e3c4d17ca1d", "div>div1>p2>svg0 41,218.5,10x10 5e3c4d17ca1d"],
      ["div>div1>p2>svg0>path0 42,240.5,8.5x6 5307bfb28f72", "div>div1>p2>svg0>path0 42,220.5,8.5x6 5307bfb28f72"],
      ["div>div1>p2>svg0>path1 46.5,240.5,0x6 5307bfb28f72", "div>div1>p2>svg0>path1 46.5,220.5,0x6 5307bfb28f72"],
      ["div>div1>div3 41,266.5,278x110 5780ffb705f7", "div>div1>div3 41,246.5,278x150 5780ffb705f7"],
      ["div>div1>div3>div0 62,287.5,236x68 56cb43a53f4a", "div>div1>div3>div0 62,267.5,236x108 e76095205a99"],
      ["div>div1>div3>div0>div0 62,287.5,104x66 997dd9fde1a4", "div>div1>div3>div0>div0 62,267.5,129.5x42 997dd9fde1a4"],
      ["div>div1>div3>div0>div0>p0 62,287.5,104x14 22541dd4e6a3", "div>div1>div3>div0>div0>p0 62,267.5,129.5x14 22541dd4e6a3"],
      ["div>div1>div3>div0>div0>p1 62,305.5,104x48 031b91c7e9d1", "div>div1>div3>div0>div0>p1 62,285.5,129.5x24 f7571d413510"],
      ["div>div1>div3>div0>div1 166,287.5,132x68 549c3b7beb3a", "div>div1>div3>div0>div1 62,321.5,236x54 06a7583be258"],
      ["div>div1>div3>div0>div1>p0 166,287.5,132x28 433cbceff890", "div>div1>div3>div0>div1>p0 62,321.5,236x14 433cbceff890"],
      ["div>div1>div3>div0>div1>p1 166,319.5,132x18 1c05953eb795", "div>div1>div3>div0>div1>p1 62,339.5,236x18 ffa1e5f38c19"],
      ["div>div1>div3>div0>div1>p2 166,341.5,132x14 2a5356411008", "div>div1>div3>div0>div1>p2 62,361.5,236x14 2a5356411008"],
      ["div>div1>div4 41,392.5,278x99.5 02dbb982194c", "div>div1>div4 41,412.5,278x99.5 02dbb982194c"],
      ["div>div1>div4>span0 58,404.5,14x14 db3c2458f06d", "div>div1>div4>span0 58,424.5,14x14 db3c2458f06d"],
      ["div>div1>div4>span0>svg0 58,404.5,14x14 0bfd503cd7ff", "div>div1>div4>span0>svg0 58,424.5,14x14 0bfd503cd7ff"],
      ["div>div1>div4>span0>svg0>path0 60,407,10.5x9 dbceaf987874", "div>div1>div4>span0>svg0>path0 60,427,10.5x9 dbceaf987874"],
      ["div>div1>div4>span0>svg0>path1 65,410.5,0x4.5 dbceaf987874", "div>div1>div4>span0>svg0>path1 65,430.5,0x4.5 dbceaf987874"],
      ["div>div1>div4>div1 82,403.5,220x77.5 c27d8e06eacd", "div>div1>div4>div1 82,423.5,220x77.5 c27d8e06eacd"],
      ["div>div1>div4>div1>span0 82,451,220x30.5 38ca0e23b961", "div>div1>div4>div1>span0 82,471,220x30.5 38ca0e23b961"],
      ["div>div1>div5 41,516.5,278x108 d453fd8a5acd", "div>div1>div5 41,536.5,278x108 d453fd8a5acd"],
      ["div>div1>div5>button0 41,516.5,278x48 25cb9a35ba23", "div>div1>div5>button0 41,536.5,278x48 25cb9a35ba23"],
      ["div>div1>div5>button1 41,576.5,278x48 653479181322", "div>div1>div5>button1 41,596.5,278x48 653479181322"],
    ],
    cells: SELL.locales.length,
    reason: "S6 A8f: the boxes and computed styles the classes above draw in the 2 confirm cells, predicted from the v2 baseline's capture and §6's model. English, a free TZS 1,500 at 360, keeps its one line (2.8px to spare): every box stays where it was but the fee column, which now grows over the free space (191.5 wide 106.5, was 194.5 wide 103.5; its words right-aligned exactly as before), and the styles move by the row's flex-wrap and row gap, the figure's amount face and nowrap, the column's flex-grow and the fee's 16px padding. Swahili, whose figure split, now wraps: the figure whole on its line (129.5 wide, 24 high), the fee column below it at the row's width, the box 40px taller, so the centred dialog grows 40px — its top 20px higher, its auto margins 20px smaller — and everything after the box moves 20px down.",
  },
);

/** The computed properties recorded per element. Geometry is recorded separately, relative to the region's root. */
const PROPS = [
  "display", "position", "z-index", "visibility", "opacity", "overflow-x", "overflow-y", "box-sizing",
  "flex-direction", "flex-wrap", "justify-content", "align-items", "gap", "order", "flex-grow", "flex-shrink",
  "padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "border-top", "border-right", "border-bottom", "border-left", "border-radius",
  "background-color", "background-image", "box-shadow", "outline-style",
  "color", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing",
  "text-transform", "text-align", "text-decoration-line", "white-space", "text-overflow",
  "transform", "filter", "backdrop-filter", "cursor", "pointer-events", "fill", "stroke",
];
/** While an element runs an animation these are mid-flight, so its signature names the animation instead. */
const ANIMATED = ["opacity", "transform", "box-shadow", "background-color", "background-image", "color", "filter", "fill", "stroke"];
/** The avatar crest is drawn from the user id, which is random per in-memory store: its inside is not chrome. */
const CREST = ".crest-holder svg";
/** The rail's entry in the overlay census. Each entry leads with its kp- classes, so the rail is named however many others it carries. */
const RAIL_OVERLAY = /^nav.*\.kp-rail(?=[.\s])/;
/** A journey trace in the bytes the server sent: a test id or the flag attribute, as HTML or as the RSC payload's escaped JSON. */
const RAW_TRACE = /(?:data-testid|testId)(?:=|\\":)\\?"journey-[\w-]*|\bdata-journey(?![\w-])/g;
const rawOf = (body) => (typeof body !== "string" ? null : {
  shell: body.includes("app-topbar"),
  trace: [...new Set((body.match(RAW_TRACE) ?? []).map((m) => (m.includes("journey-") ? `testid:${m.slice(m.indexOf("journey-"))}` : "data-journey")))].sort(),
});

/** Runs IN THE PAGE. Self-contained: Playwright serialises it, so it may close over nothing. */
const SNAPSHOT = ({ crest, props, animated, notFound, pageBody, sell, confirm }) => {
  const r2 = (n) => Math.round(n * 2) / 2;
  const sigOf = (el, moving) => {
    const cs = getComputedStyle(el);
    const parts = [];
    for (const p of props) {
      if (moving && animated.includes(p)) continue;
      let v = cs.getPropertyValue(p);
      // next/font names a family with a build hash; the family is the fact, the hash is not.
      if (p === "font-family") v = v.replace(/_[0-9a-f]{6,}\b/g, "_~");
      parts.push(`${p}:${v}`);
    }
    if (moving) parts.push(`animation:${cs.animationName}`);
    return parts.join("\n");
  };
  const region = (els) => {
    const root = els[0];
    if (!root) return { count: 0, html: null, lines: null };
    const box = root.getBoundingClientRect();
    const lines = [];
    const walk = (el, path) => {
      const moving = typeof el.getAnimations === "function" && el.getAnimations().some((a) => a.playState === "running");
      const r = el.getBoundingClientRect();
      // An unrendered element (an svg <defs> child, display:none) reports a 0x0 box at PAGE coordinates, so its offset from
      // the region moves whenever anything above the region grows — a position that means nothing. Record its size only.
      const geo = moving ? "~" : r.width === 0 && r.height === 0 ? "0x0" : `${r2(r.left - box.left)},${r2(r.top - box.top)},${r2(r.width)}x${r2(r.height)}`;
      lines.push([path, geo, sigOf(el, moving)]);
      if (el.matches(crest)) return;
      let i = 0;
      for (const c of el.children) walk(c, `${path}>${c.tagName.toLowerCase()}${i++}`);
    };
    walk(root, root.tagName.toLowerCase());
    const clone = root.cloneNode(true);
    for (const s of clone.querySelectorAll(crest)) {
      const stub = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      for (const a of ["width", "height"]) if (s.hasAttribute(a)) stub.setAttribute(a, s.getAttribute(a));
      stub.setAttribute("data-parity", "crest");
      s.replaceWith(stub);
    }
    return { count: els.length, html: clone.outerHTML, lines };
  };
  const overlays = () => {
    const out = new Set();
    for (const el of document.body.querySelectorAll("*")) {
      const tag = el.tagName.toLowerCase();
      if (tag.startsWith("nextjs-") || tag === "next-route-announcer") continue;
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") continue;
      let nested = false;
      for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) if (getComputedStyle(up).position === "fixed") { nested = true; break; }
      if (nested) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
      let op = 1;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) op *= Number.parseFloat(getComputedStyle(n).opacity) || 0;
      if (op < 0.01) continue;
      const testid = el.getAttribute("data-testid"), role = el.getAttribute("role"), label = el.getAttribute("aria-label");
      const classes = [...el.classList];
      const cls = [...classes.filter((c) => c.startsWith("kp-")), ...classes.filter((c) => !c.startsWith("kp-")).slice(0, 3)].join(".");
      out.add(`${tag}${testid ? `[data-testid=${testid}]` : ""}${role ? `[role=${role}]` : ""}${label ? `[aria-label=${label}]` : ""}${cls ? `.${cls}` : ""} z=${cs.zIndex}`);
    }
    return [...out].sort();
  };
  // WP10 · the two things SellButton draws for an open ticket, its free strip and its button, under the held question's
  // card on /positions or in the question's holder block, found by structure: the classic markup carries no test id,
  // and must not gain one. The strip's clock ticks, so it is read as "m:ss".
  const sellOf = ({ held, place }) => {
    const card = place === "/positions" ? document.querySelector(`#main-content a[data-row-id][href="/markets/${held}"]`) : null;
    const row = place === "/positions" ? (card ? card.parentElement : null) : document.querySelector("#main-content .ticket-target");
    const button = row ? [...row.children].find((c) => c.tagName === "BUTTON") ?? null : null;
    const prev = button ? button.previousElementSibling : null;
    const strip = prev && prev.tagName === "DIV" && prev.classList.contains("mb-1.5") ? prev : null;
    const ticks = (r) => (r.html ? { ...r, html: r.html.replace(/>[0-9]{1,2}:[0-9]{2}</g, ">m:ss<") } : r);
    return { strip: ticks(region(strip ? [strip] : [])), button: ticks(region(button ? [button] : [])) };
  };
  // WP10 · the classic confirm the button opened: the open modal dialog that holds the gold confirm, and whether that
  // confirm can still be pressed (its 10-second quote hold has not run out).
  const confirmOf = () => {
    const els = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter((d) => d.querySelector("button.btn-gold"));
    return { region: region(els), live: els.length === 1 && !!els[0].querySelector("button.btn-gold:not(:disabled)") };
  };
  const footers = [...document.querySelectorAll("#main-content + footer")];
  return {
    url: location.pathname + location.search,
    regions: {
      header: region([...document.querySelectorAll("header.app-topbar")]),
      rail: region([...document.querySelectorAll("nav.kp-rail")]),
      footer: region(footers),
      emailBar: region([...document.querySelectorAll('[data-testid="email-verify-banner"]')]),
      ...(pageBody ? { main: region([...document.querySelectorAll("#main-content")]) } : {}),
    },
    overlays: overlays(),
    ...(sell ? { sell: sellOf(sell) } : {}),
    ...(confirm ? { confirm: confirmOf() } : {}),
    footerPaddingBottom: footers[0] ? getComputedStyle(footers[0]).paddingBottom : null,
    scrollPaddingBottom: getComputedStyle(document.documentElement).scrollPaddingBottom,
    // The whole document, html included: a journey test id, the flag JourneyFlag sets, or a journey class.
    journey: [...document.querySelectorAll('[data-testid^="journey-"],[data-journey],[class*="journey"]')].map((e) => {
      const id = e.getAttribute("data-testid") ?? "";
      if (id.startsWith("journey-")) return `testid:${id}`;
      if (e.hasAttribute("data-journey")) return `${e.tagName.toLowerCase()}[data-journey]`;
      return `class:${[...e.classList].filter((c) => c.includes("journey")).join(".")}`;
    }).sort(),
    notFound: notFound
      ? {
          title: document.title,
          robots: [...document.querySelectorAll('meta[name="robots"]')].map((m) => m.getAttribute("content") ?? "").sort(),
          main: (document.querySelector("main")?.innerText ?? "").replace(/\s+/g, " ").trim(),
        }
      : null,
  };
};

/** What changes between two servers of the SAME tree and is not the product: React ids, asset hashes, the port, store ids, times. */
const norm = (s) => String(s)
  .replace(/_[Rr]_[0-9A-Za-z]+_/g, "_id_")
  .replace(/«[Rr][0-9A-Za-z]*»/g, "_id_")
  .replace(/https?:\/\/localhost(?::\d+)?/g, "http://localhost")
  .replace(/\/_next\/static\/[^"'\s)&]+/g, "/_next/static/~")
  .replace(/%2F_next%2Fstatic%2F[^"'\s)&]+/g, "%2F_next%2Fstatic%2F~")
  .replace(/([?&](?:amp;)?)dpl=[^"'&\s]*/g, "$1dpl=~")
  .replace(/\b(usr|wal|kyc|txn|pos)_[A-Za-z0-9_-]{6,}/g, "$1_~")
  .replace(/datetime="[^"]*"/g, 'datetime="~"')
  .replace(/\b\d+\s*(?:s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?)\s+ago\b/gi, "~ ago")
  .replace(/\b(?:sekunde|dakika|saa|siku)\s+\d+\s+(?:zilizopita|iliyopita)\b/gi, "~ zilizopita");

const blobs = {};
const put = (text) => { const id = createHash("sha1").update(text).digest("hex").slice(0, 12); blobs[id] = text; return id; };
function toCell(snap, extra) {
  const regions = {};
  for (const [name, r] of Object.entries(snap.regions)) {
    regions[name] = r.count === 0 ? { count: 0, html: null, layout: null } : {
      count: r.count,
      html: put(norm(r.html)),
      layout: put(r.lines.map(([path, geo, sig]) => `${path} ${geo} ${put(norm(sig))}`).join(NL)),
    };
  }
  return {
    ...extra,
    landed: snap.url,
    regions,
    overlays: snap.overlays.map(norm),
    footerPaddingBottom: snap.footerPaddingBottom,
    scrollPaddingBottom: snap.scrollPaddingBottom,
    journey: snap.journey,
    ...(snap.notFound ? { notFound: { title: snap.notFound.title, robots: snap.notFound.robots, main: norm(snap.notFound.main) } } : {}),
  };
}

// ── the diff ──────────────────────────────────────────────────────────────────────────────────────────────
function fieldsOf(cell, store) {
  const f = {
    status: String(cell.status),
    landed: String(cell.landed),
    overlays: (cell.overlays ?? []).join(NL),
    journey: (cell.journey ?? []).join(","),
    raw: cell.raw ? `${cell.raw.shell ? "shell" : "no shell"} · ${cell.raw.trace.join(",")}` : "(unread)",
    pageErrors: (cell.pageErrors ?? []).join(NL),
    footerPaddingBottom: String(cell.footerPaddingBottom),
    scrollPaddingBottom: String(cell.scrollPaddingBottom),
  };
  for (const [name, r] of Object.entries(cell.regions ?? {})) {
    f[`regions.${name}.count`] = String(r.count);
    f[`regions.${name}.html`] = r.html ? store[r.html] ?? `(missing blob ${r.html})` : "";
    f[`regions.${name}.layout`] = r.layout ? store[r.layout] ?? `(missing blob ${r.layout})` : "";
  }
  if (cell.notFound) {
    f["notFound.title"] = cell.notFound.title;
    f["notFound.robots"] = cell.notFound.robots.join(NL);
    f["notFound.main"] = cell.notFound.main;
  }
  return f;
}
const propsOf = (sig) => new Map(String(sig ?? "").split(NL).filter(Boolean).map((kv) => [kv.slice(0, kv.indexOf(":")), kv.slice(kv.indexOf(":") + 1)]));
function explain(field, was, now, baseStore, curStore) {
  if (field.endsWith(".layout")) {
    const a = was.split(NL), b = now.split(NL);
    let differing = 0, first = -1;
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { differing++; if (first < 0) first = i; }
    const [pathA, geoA, sigA] = (a[first] ?? "").split(" ");
    const [pathB, geoB, sigB] = (b[first] ?? "").split(" ");
    const what = [];
    if (pathA !== pathB) what.push(`element ${pathA || "(none)"} → ${pathB || "(none)"}`);
    else if (geoA !== geoB) what.push(`${pathA} box ${geoA} → ${geoB}`);
    if (pathA === pathB && sigA !== sigB) {
      const pa = propsOf(baseStore[sigA]), pb = propsOf(curStore[sigB]);
      const moved = [...new Set([...pa.keys(), ...pb.keys()])].filter((p) => pa.get(p) !== pb.get(p));
      what.push(`${pathA} style ${moved.slice(0, 4).map((p) => `${p}: ${pa.get(p) ?? "-"} → ${pb.get(p) ?? "-"}`).join(", ")}`);
    }
    return `${differing} of ${Math.max(a.length, b.length)} element line(s) differ; first: ${what.join("; ")}`;
  }
  if (was.length > 120 || now.length > 120) {
    let i = 0;
    while (i < was.length && i < now.length && was[i] === now[i]) i++;
    const around = (s) => JSON.stringify(s.slice(Math.max(0, i - 40), i + 80));
    return `first difference at character ${i}: ${around(was)} → ${around(now)}`;
  }
  return `${JSON.stringify(was)} → ${JSON.stringify(now)}`;
}
/** Every field that differs, split into the named EXPECTED differences and everything else. */
function diffCells(route, base, cur, baseStore, curStore, list = EXPECTED_DIFFS) {
  const a = fieldsOf(base, baseStore), b = fieldsOf(cur, curStore);
  const unexpected = [], expected = [];
  for (const field of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const was = a[field] ?? "(absent)", now = b[field] ?? "(absent)";
    if (was === now) continue;
    let left = was, hit = null;
    for (const e of list) {
      if (e.field !== field || (e.routes && !e.routes.includes(route))) continue;
      if ("from" in e && was === String(e.from) && now === String(e.to)) { hit = e; break; }
      if (e.replace) { left = e.replace.reduce((s, [x, y]) => s.split(x).join(y), was); if (left === now) { hit = e; break; } }
    }
    if (hit) expected.push({ field, id: hit.id });
    else unexpected.push({ field, detail: explain(field, left, now, baseStore, curStore) });
  }
  return { unexpected, expected };
}
/**
 * ⭐ S6 A8e · one Sell cell's first paint (`served`) against the baseline's cell: "same" when the baseline has a first paint
 * of its own and this is it (under SELL_EXPECTED_DIFFS); else SELL_FIRST_PAINT's id when this is the baseline's Sell
 * button as the browser drew it once the page had started (strip and button; every other field the current cell's, so
 * only those two regions are compared); else "differs", with what differs from each; "uncaptured" with no first paint.
 */
function firstPaintOf(route, was, now, baseStore, curStore) {
  if (!now.served || now.served.error || !now.served.regions) {
    return { verdict: "uncaptured", own: null, drawn: [{ field: "served", detail: now.served?.error ?? "no first paint captured" }] };
  }
  const asPaint = (regions) => ({ ...now, regions: { strip: regions.strip, button: regions.button } });
  const cur = asPaint(now.served.regions);
  const own = was.served && !was.served.error && was.served.regions
    ? diffCells(route, asPaint(was.served.regions), cur, baseStore, curStore, SELL_EXPECTED_DIFFS).unexpected : null;
  if (own && own.length === 0) return { verdict: "same", own, drawn: [] };
  const drawn = diffCells(route, asPaint(was.regions), cur, baseStore, curStore, SELL_EXPECTED_DIFFS).unexpected;
  return { verdict: drawn.length === 0 ? SELL_FIRST_PAINT.id : "differs", own, drawn };
}

// ── the checks every capture must pass, as pure functions so --prove-red can break each one ────────────────
/** §2 — the population is what it claims. Each check returns the cells (or facts) that fail it. */
function populationChecks(cells, store) {
  const all = Object.entries(cells);
  const live = all.filter(([, c]) => !c.error);
  const at = (v, l, w, r) => cells[keyOf(v, l, w, r)] ?? { error: "not captured" };
  const html = (c, region) => (c.regions?.[region]?.html ? store[c.regions[region].html] ?? "" : "");
  const bad = (pred) => live.filter(([k, c]) => pred(k, c)).map(([k]) => k);
  const size = VIEWERS.length * LOCALES.length * WIDTHS.length * ROUTES.length;
  const shell = (c) => c.regions.header.count === 1 && c.regions.rail.count === 1 && c.regions.footer.count === 1;
  const auth = live.filter(([k]) => AUTH.includes(partsOf(k).r));
  const DEPOSIT = 'data-testid="deposit-header"';
  const held = html(at("held", "en", 1280, "/"), "header"), player = html(at("player", "en", 1280, "/"), "header");
  const bar = (v) => at(v, "en", 360, "/").regions?.emailBar?.count;
  return [
    { id: "2.0", name: `every cell was captured (${size})`,
      fails: [...(all.length === size ? [] : [`the matrix holds ${all.length} cells`]), ...all.filter(([, c]) => c.error).map(([k, c]) => `${k} (${c.error})`)] },
    { id: "2.1", name: "every cell rendered the shell — one header, one rail, one footer", fails: bad((k, c) => !shell(c)) },
    { id: "2.2", name: "every cell settled — two snapshots 700 ms apart agreed", fails: bad((k, c) => !c.stable) },
    { id: "2.3", name: "no viewer carries a preview pass", fails: bad((k, c) => c.pass) },
    { id: "2.4", name: "no journey test id, flag or class anywhere in the page",
      fails: live.filter(([, c]) => c.journey.length).map(([k, c]) => `${k} (${c.journey.join(",")})`) },
    { id: "2.5", name: "the raw HTML was read, is the shell's, and carries no journey trace",
      fails: live.filter(([, c]) => !c.raw || !c.raw.shell || c.raw.trace.length).map(([k, c]) => `${k} (${!c.raw ? "unread" : !c.raw.shell ? "no shell" : c.raw.trace.join(",")})`) },
    { id: "2.6", name: "the guest is a guest — /positions, /wallet and /profile land on the sign-in page",
      fails: auth.filter(([k, c]) => partsOf(k).v === "guest" && !c.landed.startsWith("/auth/login")).map(([k, c]) => `${k} → ${c.landed}`) },
    { id: "2.7", name: "the signed-in viewers are signed in — none of those three lands anywhere else",
      fails: auth.filter(([k, c]) => partsOf(k).v !== "guest" && c.landed.split("?")[0] !== partsOf(k).r).map(([k, c]) => `${k} → ${c.landed}`) },
    { id: "2.8", name: "the held viewer is held — no header deposit control at 1280, where the player has one",
      fails: [...(!held ? ["held|en|1280|/ has no header"] : held.includes(DEPOSIT) ? ["held|en|1280|/ has it"] : []), ...(player.includes(DEPOSIT) ? [] : ["player|en|1280|/ has none"])] },
    EMAIL_BAR_GONE
      ? { id: "2.9", name: "no viewer sees an email bar, in any cell — the bar is deleted (the owner's ruling of 2026-10-07), the unconfirmed email included",
          fails: bad((k, c) => (c.regions?.emailBar?.count ?? 0) !== 0) }
      : { id: "2.9", name: "the unverified viewer sees the email bar on /, and the player does not",
          fails: [...(bar("unverified") === 1 ? [] : [`unverified|en|360|/ shows ${bar("unverified") ?? "?"}`]), ...(bar("player") === 0 ? [] : [`player|en|360|/ shows ${bar("player") ?? "?"}`])] },
    { id: "2.10", name: "below 1024 the rail is among the fixed overlays — the census sees what is there",
      fails: bad((k, c) => partsOf(k).w < 1024 && !c.overlays.some((o) => RAIL_OVERLAY.test(o))) },
    { id: "2.11", name: `the signed-in viewers' ${BODY_ROUTE} captured its page body`,
      fails: bad((k, c) => partsOf(k).r === BODY_ROUTE && partsOf(k).v !== "guest" && c.regions.main?.count !== 1) },
    { id: "2.13", name: "only React's DEV performance-track sentence is ever filed as DEV-only — every other page error is compared",
      fails: live.filter(([, c]) => (c.devOnly ?? []).some((x) => !isDevMeasure(x))).map(([k, c]) => `${k} (${c.devOnly.find((x) => !isDevMeasure(x))})`) },
  ];
}

/** §3 — /account, for a viewer the journey is not shown to, is the not-found page (A3), against the control in the same cell. */
function accountChecks(cells, loaders) {
  const pairs = [];
  for (const v of VIEWERS) for (const l of LOCALES) for (const w of WIDTHS) {
    const a = cells[keyOf(v.id, l, w, "/account")], c = cells[keyOf(v.id, l, w, NOT_FOUND)];
    if (a && c && !a.error && !c.error && a.notFound && c.notFound) pairs.push([keyOf(v.id, l, w, "/account"), a, c]);
  }
  const fails = (pred) => pairs.filter(([, a, c]) => !pred(a, c)).map(([k]) => k);
  const size = VIEWERS.length * LOCALES.length * WIDTHS.length;
  const clean = (x) => !!x.raw && x.raw.trace.length === 0;
  return [
    { id: "3.0", name: `the control path is a true 404 with a not-found body (${pairs.length} of ${size} pairs)`,
      fails: [...(pairs.length === size ? [] : [`${size - pairs.length} pair(s) not captured`]), ...fails((a, c) => c.status === 404 && c.notFound.main.length > 20)] },
    { id: "3.1", name: "/account shows the not-found body (its main text is the control's)", fails: fails((a, c) => a.notFound.main === c.notFound.main) },
    { id: "3.2", name: "…under the not-found title", fails: fails((a, c) => !!c.notFound.title && a.notFound.title === c.notFound.title) },
    { id: "3.3", name: "…marked noindex", fails: fails((a) => a.notFound.robots.some((r) => /noindex/i.test(r))) },
    { id: "3.4", name: "…with no journey test id, flag or class in the page", fails: fails((a) => a.journey.length === 0) },
    { id: "3.5", name: "…and none in the bytes the server sent, where a streamed fallback would still be (G3)", fails: fails((a, c) => clean(a) && clean(c)) },
    { id: "3.6", name: "no loading file of /account's own in the tree the server runs — the root loader is generic (A3)", fails: loaders },
  ];
}

/** Every loading file that would stream before /account's notFound(): the segment's own, under any route group. */
function accountLoaders() {
  const out = [];
  const walk = (dir, segs) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const next = /^\(.+\)$/.test(e.name) ? segs : [...segs, e.name];
      if (next.length > 1 || (next.length === 1 && next[0] !== "account")) continue;
      const sub = join(dir, e.name);
      if (next.length === 1) for (const f of readdirSync(sub)) if (/^loading\.[jt]sx?$/.test(f)) out.push(relative(TREE, join(sub, f)).split(sep).join("/"));
      walk(sub, next);
    }
  };
  try { walk(join(TREE, "src", "app"), []); } catch (e) { out.push(`(cannot read src/app: ${msg(e)})`); }
  return out;
}

/** §S — the Sell capture is what it claims (WP10). Each check returns the cells (or facts) that fail it. */
function sellChecks(sell, seed, store) {
  const all = Object.entries(sell ?? {});
  const live = all.filter(([, c]) => !c.error);
  const size = SELL.locales.length * SELL.widths.length * SELL.places.length;
  const bad = (pred) => live.filter(([k, c]) => pred(k, c)).map(([k]) => k);
  const html = (c, region) => (c.regions?.[region]?.html ? store[c.regions[region].html] ?? "" : "");
  const confirmed = (k, c) => (confirmCell(partsOf(k).w, partsOf(k).r)
    ? c.regions?.confirm?.count === 1 && c.confirmLive === true
    : c.regions?.confirm === undefined);
  return [
    { id: "S.0", name: `the demo player was given an open ticket through the real money paths, and every Sell cell was captured (${size})`,
      fails: [...(seed && !seed.error && seed.held ? [] : [`the seed: ${seed?.error ?? "not run"}`]), ...(all.length === size ? [] : [`the Sell capture holds ${all.length} cells`]),
        ...all.filter(([, c]) => c.error).map(([k, c]) => `${k} (${c.error})`)] },
    { id: "S.1", name: "every Sell cell settled, answered 200 and stayed where it was sent: the holder is signed in",
      fails: bad((k, c) => !c.stable || c.status !== 200 || c.landed !== partsOf(k).r) },
    { id: "S.2", name: "every Sell cell was captured INSIDE the free window — one strip, its countdown read as m:ss, and one button — and each confirm cell holds one classic confirm, captured inside its quote hold (and no other cell holds one)",
      fails: bad((k, c) => c.regions?.strip?.count !== 1 || c.regions?.button?.count !== 1 || !html(c, "strip").includes(">m:ss<") || !confirmed(k, c)) },
    { id: "S.3", name: "no journey test id, flag or class in a Sell cell, in the page or in the bytes the server sent",
      fails: bad((k, c) => (c.journey ?? []).length > 0 || !c.raw || !c.raw.shell || c.raw.trace.length > 0) },
    { id: "S.4", name: "every Sell cell's first paint was captured in a page whose scripts were all held — nothing hydrated — and it holds the page's Sell button (S6 A8e)",
      fails: bad((k, c) => !c.served || !!c.served.error || c.served.hydrated !== false || c.served.regions?.button?.count !== 1) },
  ];
}

/** A Sell capture with every §S check met, built in memory: what --prove-red breaks one check at a time. */
function syntheticSell() {
  const store = {
    strip: '<div class="mb-1.5"><span>Free exit</span><span>m:ss</span></div>', button: '<button class="btn">Free exit</button>',
    confirm: '<div role="dialog" aria-modal="true"><button class="btn btn-gold">Sell</button></div>',
  };
  const sell = {};
  for (const l of SELL.locales) for (const w of SELL.widths) for (const place of SELL.places) {
    sell[keyOf("sell", l, w, place)] = {
      status: 200, stable: true, landed: place, pageErrors: [], journey: [], raw: { shell: true, trace: [] },
      regions: {
        strip: { count: 1, html: "strip", layout: null }, button: { count: 1, html: "button", layout: null },
        ...(confirmCell(w, place) ? { confirm: { count: 1, html: "confirm", layout: null } } : {}),
      },
      ...(confirmCell(w, place) ? { confirmLive: true } : {}),
      served: { hydrated: false, regions: { strip: { count: 1, html: "strip", layout: null }, button: { count: 1, html: "button", layout: null } } },
    };
  }
  return { sell, seed: { held: "mkt_planted", open: 4, refusals: [] }, store };
}

/** A capture with every check met, built in memory: what --prove-red breaks one check at a time. */
function syntheticCapture() {
  const store = { hdr: '<header class="app-topbar"></header>', hdrDeposit: '<header class="app-topbar"><a data-testid="deposit-header"></a></header>' };
  const region = (html = null) => ({ count: 1, html, layout: null });
  const none = () => ({ count: 0, html: null, layout: null });
  const cells = {};
  for (const v of VIEWERS) for (const l of LOCALES) for (const w of WIDTHS) for (const r of ROUTES) {
    const guest = v.id === "guest", nf = r === "/account" || r === NOT_FOUND;
    cells[keyOf(v.id, l, w, r)] = {
      status: nf ? 404 : 200, stable: true, pass: false, pageErrors: [],
      landed: guest && AUTH.includes(r) ? `/auth/login?next=${encodeURIComponent(r)}` : r,
      regions: {
        header: region(v.id === "player" ? "hdrDeposit" : "hdr"), rail: region(), footer: region(),
        emailBar: v.id === "unverified" && !EMAIL_BAR_GONE ? region() : none(),
        ...(!guest && r === BODY_ROUTE ? { main: region() } : {}),
      },
      overlays: w < 1024 ? ["nav[aria-label=Primary].kp-rail z=40"] : [],
      footerPaddingBottom: w < 1024 ? "88px" : "0px", scrollPaddingBottom: "88px",
      journey: [], raw: { shell: true, trace: [] },
      ...(nf ? { notFound: { title: "Page not found · 404", robots: ["noindex"], main: "404 Page not found We couldn't find that page" } } : {}),
    };
  }
  return { cells, store };
}

async function proveRed() {
  console.log(`\n§P · the control — first on synthetic captures, then planted in the browser`);
  // ① The EXPECTED_DIFFS matcher: it must pass what it names and nothing beside it.
  const store = { f1: '<footer class="pad-old">x</footer>', f2: '<footer class="pad-new">x</footer>', f3: '<footer class="pad-new">y</footer>' };
  const cell = (status, footer) => ({ status, landed: "/", overlays: [], journey: [], raw: { shell: true, trace: [] }, pageErrors: [], footerPaddingBottom: "88px", scrollPaddingBottom: "auto", regions: { footer: { count: 1, html: footer, layout: null } } });
  const run = (route, a, c, list = EXPECTED_DIFFS) => diffCells(route, a, c, store, store, list);
  const same = run("/", cell(200, "f1"), cell(200, "f1"));
  ok("P.1 identical cells differ in nothing", same.unexpected.length === 0 && same.expected.length === 0);
  const named = run("/account", cell(404, "f1"), cell(200, "f1"));
  ok("P.2 /account 404 → 200 is the named expected difference, not a failure", named.unexpected.length === 0 && named.expected.map((e) => e.id).join() === "account-streams-200", JSON.stringify(named));
  const wrongTo = run("/account", cell(404, "f1"), cell(500, "f1"));
  ok("P.3 …and /account 404 → 500 stays a failure (an entry is one transition, not a wildcard)", wrongTo.unexpected.length === 1 && wrongTo.unexpected[0].field === "status");
  const wrongRoute = run("/markets", cell(404, "f1"), cell(200, "f1"));
  ok("P.4 …and 404 → 200 on any other route stays a failure (the entry is scoped to /account)", wrongRoute.unexpected.length === 1);
  // The robots entry, held the same way: its one transition on /account passes; another value, or the same change on
  // the control path, stays a failure.
  const nf = (robots) => ({ ...cell(200, "f1"), notFound: { title: "Page not found · 404", robots, main: "404 Page not found" } });
  const pair = ["index, follow", "noindex"];
  const robotsNamed = run("/account", nf(pair), nf(["noindex", "noindex, nofollow"]));
  const robotsOther = run("/account", nf(pair), nf(["index, follow"]));
  const robotsElsewhere = run(NOT_FOUND, nf(pair), nf(["noindex", "noindex, nofollow"]));
  ok("P.4b /account's robots pair → 'noindex' + 'noindex, nofollow' is the named difference; another value, or the same change on the control path, stays a failure",
    robotsNamed.unexpected.length === 0 && robotsNamed.expected.map((e) => e.id).join() === "account-robots-noindex"
      && robotsOther.unexpected.length === 1 && robotsElsewhere.unexpected.length === 1,
    JSON.stringify({ robotsNamed, robotsOther, robotsElsewhere }).slice(0, 300));
  const SUB = [{ id: "control-footer-class", field: "regions.footer.html", replace: [['class="pad-old"', 'class="pad-new"']], reason: "the control" }];
  const subOnly = run("/", cell(200, "f1"), cell(200, "f2"), SUB);
  const subPlus = run("/", cell(200, "f1"), cell(200, "f3"), SUB);
  ok("P.5 a recorded substitution is expected, and a second change beside it is still caught",
    subOnly.unexpected.length === 0 && subOnly.expected.length === 1 && subPlus.unexpected.length === 1, JSON.stringify({ subOnly, subPlus }).slice(0, 300));
  const e0 = EXPECTED_DIFFS[0];
  const hits = (n) => new Map([[e0.id, n]]);
  ok(`P.6 a named difference seen in part of its population is reported (§4.2), and in all or none of it is not`,
    partialExpected(hits(e0.cells - 1)).length === 1 && partialExpected(hits(e0.cells)).length === 0 && partialExpected(new Map()).length === 0);
  // ①p The visual pass · the /positions empty state's three named differences, held as A8f's are (P.5c): the body's
  // markup (positions-empty-state, its three strings) and the boxes it draws in each language (every width's lines in one
  // text, so a pair whose result another pair would take again is seen here too). Each passes on /positions as exactly its
  // own entry; a second change beside any of them, English boxes drawn with the Swahili link, or the same change on
  // another route stays a failure; and §4.2b reports a layout entry missing beside the markup that draws it. A block of
  // its own, so its names are its own.
  {
    const bodyStore = {};
    const keep = (text) => { const id = `m${Object.keys(bodyStore).length}`; bodyStore[id] = text; return id; };
    const bodyCell = (field, text) => ({ ...cell(200, "f1"), landed: BODY_ROUTE,
      regions: { main: { count: 1, html: field === "html" ? keep(text) : null, layout: field === "layout" ? keep(text) : null } } });
    const markupEntry = EXPECTED_DIFFS.find((e) => e.id === "positions-empty-state");
    const boxEntries = ["en", "sw"].map((l) => EXPECTED_DIFFS.find((e) => e.id === `positions-empty-state-layout-${l}`));
    const markup = (side) => {
      const p = markupEntry ? markupEntry.replace.map((pair) => pair[side]) : ["", "", ""];
      return `<main id="main-content"><div><div><div data-empty-state="fill"><div aria-hidden="true">${p[0]}<rect x="10" y="21" width="36" height="25" rx="3"></rect></svg></div>${p[1]}No open positions yet</p>${p[2]}Pick a market and drag the conviction dial to commit your first prediction.</p></div></div></div></main>`;
    };
    const boxes = (e, side) => (e ? e.replace.map((pair) => pair[side]).join(NL) : "");
    const diff = (route, a, b) => diffCells(route, a, b, bodyStore, bodyStore);
    const namedAs = (d, id) => d.unexpected.length === 0 && d.expected.map((x) => x.id).join() === id;
    const runs = {
      markup: diff(BODY_ROUTE, bodyCell("html", markup(0)), bodyCell("html", markup(1))),
      markupPlus: diff(BODY_ROUTE, bodyCell("html", markup(0)), bodyCell("html", markup(1).replace("No open positions yet", "No open positions"))),
      markupElsewhere: diff("/wallet", bodyCell("html", markup(0)), bodyCell("html", markup(1))),
      boxes: boxEntries.map((e) => diff(BODY_ROUTE, bodyCell("layout", boxes(e, 0)), bodyCell("layout", boxes(e, 1)))),
      boxesPlus: boxEntries.map((e) => diff(BODY_ROUTE, bodyCell("layout", boxes(e, 0)), bodyCell("layout", `${boxes(e, 1)}${NL}main>div9 0,0,1x1 000000000000`))),
      crossed: diff(BODY_ROUTE, bodyCell("layout", boxes(boxEntries[0], 0)), bodyCell("layout", boxes(boxEntries[1], 1))),
      boxesElsewhere: boxEntries.map((e) => diff("/wallet", bodyCell("layout", boxes(e, 0)), bodyCell("layout", boxes(e, 1)))),
    };
    ok("P.5p the visual pass's three named /positions differences — the empty state's three strings, and the boxes they draw in English and in Swahili at every width — each pass on /positions as exactly their own entry, while a second change beside any, English boxes drawn with the Swahili link, or the same change on another route stays a failure",
      !!markupEntry && boxEntries.every(Boolean) && namedAs(runs.markup, "positions-empty-state") && runs.boxes.every((d, i) => namedAs(d, boxEntries[i].id))
        && runs.markupPlus.unexpected.length === 1 && runs.boxesPlus.every((d) => d.unexpected.length === 1) && runs.crossed.unexpected.length === 1
        && runs.markupElsewhere.unexpected.length === 1 && runs.boxesElsewhere.every((d) => d.unexpected.length === 1),
      JSON.stringify(runs).slice(0, 400));
    const along = EXPECTED_DIFFS.filter((e) => e.alongside);
    const seen = (k) => new Map([...along.map((e) => [e.alongside, 1]), ...along.slice(0, k).map((e) => [e.id, e.cells])]);
    ok("P.6p a measured /positions layout missing beside the markup that draws it is reported (§4.2b), each one, and neither, or both in all of their cells, is not",
      along.length === 2 && missingAlongside(seen(0), EXPECTED_DIFFS).length === 2 && missingAlongside(seen(1), EXPECTED_DIFFS).length === 1
        && missingAlongside(seen(2), EXPECTED_DIFFS).length === 0 && missingAlongside(new Map(), EXPECTED_DIFFS).length === 0,
      JSON.stringify(along.map((e) => [e.id, e.alongside])));
  }
  // ①f S6 A8f · the classic confirm's two named differences, held as the Sell button's is (P.5s): its markup (four
  // class strings) and its boxes (the lines the capture records), before A8f and after. Each passes in the classic
  // confirm's place; a second change beside either, or the same change at the other Sell place, stays a failure. A
  // block of its own, so its names are its own.
  {
    const dialogStore = {};
    const dialogCellOf = (field, text) => {
      const id = `d${Object.keys(dialogStore).length}`;
      dialogStore[id] = text;
      return { ...cell(200, "f1"), landed: SELL_CONFIRM.place, regions: { confirm: { count: 1, html: field === "html" ? id : null, layout: field === "layout" ? id : null } } };
    };
    const htmlEntry = SELL_EXPECTED_DIFFS.find((e) => e.id === "sell-confirm-whole-figure");
    const boxesEntry = SELL_EXPECTED_DIFFS.find((e) => e.id === "sell-confirm-receive-boxes");
    const confirmMarkup = (side) => {
      const p = htmlEntry ? htmlEntry.replace.map((pair) => pair[side]) : ["", "", "", ""];
      return `<div class="rounded-lg border p-4">${p[0]}<div><p class="font-mono text-micro uppercase eyebrow text-text-subtle mb-1">You receive</p>${p[1]}TZS 1,500</p></div>${p[2]}<p class="font-mono text-micro uppercase eyebrow text-text-subtle mb-1">Early-exit fee</p>${p[3]} style="color: var(--yes-300);">No fee</p><p class="mt-1 amount text-micro text-text-subtle">free exit window</p></div></div></div>`;
    };
    const confirmBoxes = (side) => (boxesEntry ? boxesEntry.replace.map((pair) => pair[side]).join(NL) : "");
    const dialogDiff = (place, a, b) => diffCells(place, a, b, dialogStore, dialogStore, SELL_EXPECTED_DIFFS);
    const wasMarkup = dialogCellOf("html", confirmMarkup(0));
    const nowMarkup = dialogCellOf("html", confirmMarkup(1));
    const plusMarkup = dialogCellOf("html", confirmMarkup(1).replace("TZS 1,500", "TZS 1,501"));
    const wasBoxes = dialogCellOf("layout", confirmBoxes(0));
    const nowBoxes = dialogCellOf("layout", confirmBoxes(1));
    const plusBoxes = dialogCellOf("layout", `${confirmBoxes(1)}${NL}div>div1>div9 0,0,1x1 000000000000`);
    const namedAs = (d, id) => d.unexpected.length === 0 && d.expected.map((e) => e.id).join() === id;
    const dialogRuns = {
      markup: dialogDiff(SELL_CONFIRM.place, wasMarkup, nowMarkup), boxes: dialogDiff(SELL_CONFIRM.place, wasBoxes, nowBoxes),
      markupPlus: dialogDiff(SELL_CONFIRM.place, wasMarkup, plusMarkup), boxesPlus: dialogDiff(SELL_CONFIRM.place, wasBoxes, plusBoxes),
      markupElsewhere: dialogDiff(SELL_PLACES[0], wasMarkup, nowMarkup), boxesElsewhere: dialogDiff(SELL_PLACES[0], wasBoxes, nowBoxes),
    };
    ok("P.5c S6 A8f's two named confirm differences — the receive row's four class strings, and the boxes they draw — pass in the classic confirm's place, while a second change beside either, or the same change at the other Sell place, stays a failure",
      !!htmlEntry && !!boxesEntry && namedAs(dialogRuns.markup, "sell-confirm-whole-figure") && namedAs(dialogRuns.boxes, "sell-confirm-receive-boxes")
        && dialogRuns.markupPlus.unexpected.length === 1 && dialogRuns.boxesPlus.unexpected.length === 1
        && dialogRuns.markupElsewhere.unexpected.length === 1 && dialogRuns.boxesElsewhere.unexpected.length === 1,
      JSON.stringify(dialogRuns).slice(0, 400));
  }
  // ①b S6 A8b, A8d and A8g · the named Sell differences, held the same way: the classic button's free row as a capture
  // serialises it — at the v2 baseline (`was`), with A8b's free-note classes and A8g's wrap class (`list`, the markup
  // /positions is served) and with A8b's classes and A8d's stack class (`holder`, the holder block's). Each passes at its
  // own Sell place, in en and in sw, as exactly its own entry; a second change beside it, either markup at the other
  // place, A8b's markup alone, or either off the Sell places, stays a failure.
  const sellStore = {};
  const sellCell = (html) => {
    const id = `b${Object.keys(sellStore).length}`;
    sellStore[id] = html;
    return { ...cell(200, "f1"), landed: SELL_PLACES[0], regions: { button: { count: 1, html: id, layout: null } } };
  };
  const sellButtonHtml = (label, note, narrow, figure = "TZS 3,600", extra = "") => `<button type="button" class="btn btn-primary btn-md w-full whitespace-normal${extra}"><span>${label}</span><span class="font-mono tabular-nums">${figure}<span class="${narrow ? "ml-1.5 hidden opacity-80 text-[11px] xs:inline" : "ml-1.5 opacity-80 text-[11px]"}">${note}</span></span></button>`;
  const sellRuns = [["en", "Free exit", "full refund"], ["sw", "Toka bila gharama", "pesa yote"]].map(([l, label, note]) => {
    const was = sellCell(sellButtonHtml(label, note, false));
    const list = sellCell(sellButtonHtml(label, note, true, "TZS 3,600", " kp-sell-wrap"));
    const holder = sellCell(sellButtonHtml(label, note, true, "TZS 3,600", " kp-sell-stack"));
    const a8bOnly = sellCell(sellButtonHtml(label, note, true));
    const listPlus = sellCell(sellButtonHtml(label, note, true, "TZS 3,601", " kp-sell-wrap"));
    const holderPlus = sellCell(sellButtonHtml(label, note, true, "TZS 3,601", " kp-sell-stack"));
    const diff = (place, a, b) => diffCells(place, a, b, sellStore, sellStore, SELL_EXPECTED_DIFFS);
    return {
      l, positions: diff(SELL_PLACES[0], was, list), holder: diff(SELL_PLACES[1], was, holder),
      strays: [diff(SELL_PLACES[0], was, listPlus), diff(SELL_PLACES[1], was, holderPlus), diff(SELL_PLACES[0], was, holder), diff(SELL_PLACES[1], was, list),
        diff(SELL_PLACES[0], was, a8bOnly), diff(SELL_PLACES[1], was, a8bOnly), diff("/", was, list), diff("/", was, holder)],
    };
  });
  const onlyEntry = (d, id) => d.unexpected.length === 0 && d.expected.map((e) => e.id).join() === id;
  ok("P.5s S6 A8b's, A8d's and A8g's named Sell differences each pass at their own Sell place in en and in sw — A8b's free-note classes with the wrap class on /positions (sell-positions-wrap), and with the stack class on the holder block's button (sell-holder-stack) — while a second change beside either, either markup at the other place, A8b's markup alone, or either off the Sell places, stays a failure",
    sellRuns.every((r) => onlyEntry(r.positions, "sell-positions-wrap") && onlyEntry(r.holder, "sell-holder-stack") && r.strays.every((d) => d.unexpected.length === 1)),
    JSON.stringify(sellRuns).slice(0, 400));
  // ①c S6 A8d and A8g · the measured layout entries, held to their own transition: a cell at the entry's Sell place whose
  // button layout goes from the entry's baseline text to its `to` passes as exactly that entry; anything beside the `to`,
  // or the same change at the other Sell place, stays a failure. Synthetic, so it holds before a `to` is measured (its
  // placeholder) as after.
  const layoutRuns = SELL_EXPECTED_DIFFS.filter((e) => e.field === "regions.button.layout" && "from" in e).map((e) => {
    const place = e.routes[0];
    const other = SELL_PLACES.find((p) => p !== place);
    const layoutStore = { h: "<button></button>" };
    const cellWith = (text) => {
      const id = `l${Object.keys(layoutStore).length}`;
      layoutStore[id] = text;
      return { ...cell(200, "f1"), landed: place, regions: { button: { count: 1, html: "h", layout: id } } };
    };
    const fromCell = cellWith(String(e.from));
    const toCell = cellWith(String(e.to));
    const besideCell = cellWith(`${String(e.to)}${NL}button>span9 0,0,1x1 000000000000`);
    const diff = (p, a, b) => diffCells(p, a, b, layoutStore, layoutStore, SELL_EXPECTED_DIFFS);
    return { id: e.id, named: diff(place, fromCell, toCell), beside: diff(place, fromCell, besideCell), elsewhere: diff(other, fromCell, toCell) };
  });
  ok("P.5L S6 A8d's and A8g's measured Sell layouts — the holder block's stack and /positions' wrap at 360, in en and in sw — each pass as exactly their own entry at their own Sell place, while anything beside the measured text, or the same change at the other Sell place, stays a failure",
    layoutRuns.length === 4 && layoutRuns.every((r) => onlyEntry(r.named, r.id) && r.beside.unexpected.length === 1 && r.elsewhere.unexpected.length === 1),
    JSON.stringify(layoutRuns).slice(0, 400));
  // ①d S6 A8d · §4.6 held the same way: a layout `alongside` the served change that causes it must be seen in all of its
  // cells whenever that change is seen — each one missing is reported, one by one; neither seen (a null compare at the
  // baseline's own commit), or both in all of their cells, is not. Since S6 A8g five: the four measured button layouts and
  // the strip's predicted one.
  const along = SELL_EXPECTED_DIFFS.filter((e) => e.alongside);
  const alongHits = (k) => new Map([...along.map((e) => [e.alongside, 1]), ...along.slice(0, k).map((e) => [e.id, e.cells])]);
  ok("P.6s a Sell layout missing beside the served change that causes it is reported (§4.6), each one, and neither, or both in all of their cells, is not",
    along.length === 5 && missingAlongside(alongHits(0), SELL_EXPECTED_DIFFS).length === along.length && missingAlongside(alongHits(1), SELL_EXPECTED_DIFFS).length === along.length - 1
      && missingAlongside(alongHits(along.length), SELL_EXPECTED_DIFFS).length === 0 && missingAlongside(new Map(), SELL_EXPECTED_DIFFS).length === 0,
    JSON.stringify(along.map((e) => [e.id, e.alongside])));
  // ①g S6 A8g · the free strip's two named differences, held as the Sell button's are: its markup (the strip's one class
  // string) and its boxes and styles (the one signature its classes move, the strip's own, and the one cell whose Swahili
  // parts now wrap between them), at both Sell places in en and in sw — in a capture, and in a first paint against the v2
  // file's drawn strip (firstPaintOf) — while a second change beside them, a note the server writes as two texts, or the
  // same change off the Sell places stays a failure. A block of its own, so its names are its own.
  {
    const stripStore = {};
    const keep = (text) => { const id = `s${Object.keys(stripStore).length}`; stripStore[id] = text; return id; };
    const htmlEntry = SELL_EXPECTED_DIFFS.find((e) => e.id === "sell-strip-whole");
    const boxesEntry = SELL_EXPECTED_DIFFS.find((e) => e.id === "sell-strip-whole-layout");
    const opens = htmlEntry ? htmlEntry.replace[0] : ["", ""];
    const markup = (side, label, noFee, split = false) => `${opens[side]}<span class="font-mono text-micro font-bold text-brand-300 uppercase tracking-[0.12em]">${label}</span><span class="font-mono text-[10px] text-brand-300 tabular-nums">m:ss</span><span class="font-mono text-[10px] text-text-subtle">· ${split ? "<!-- -->" : ""}${noFee}</span></div>`;
    const was = ["div 0,0,244x40 e13135b54c89", "div>span0 13,6,112x28 4b17f0b3e45c", "div>span1 133,12.5,24x15 cb686f62b174", "div>span2 165,5,66x30 58177f2eea8a"].join(NL);
    const boxes = boxesEntry ? boxesEntry.replace.reduce((s, [x, y]) => s.split(x).join(y), was) : was;
    const button = keep('<button type="button" class="btn btn-primary btn-md w-full whitespace-normal"></button>');
    const stripCell = (html, layout, served) => ({ ...cell(200, "f1"), landed: SELL_PLACES[1],
      regions: { strip: { count: 1, html: keep(html), layout: keep(layout) }, button: { count: 1, html: button, layout: null } },
      ...(served ? { served: { hydrated: false, regions: { strip: { count: 1, html: keep(served[0]), layout: keep(served[1]) }, button: { count: 1, html: button, layout: null } } } } : {}) });
    const diff = (place, a, b) => diffCells(place, a, b, stripStore, stripStore, SELL_EXPECTED_DIFFS);
    const stripRuns = [["en", "Free exit", "No fee"], ["sw", "Toka bila gharama", "Hakuna ada"]].flatMap(([l, label, noFee]) => SELL_PLACES.map((place) => {
      const before = stripCell(markup(0, label, noFee), was, null);
      const after = stripCell(markup(1, label, noFee), boxes, null);
      return {
        l, place, named: diff(place, before, after),
        plus: diff(place, before, stripCell(markup(1, label, noFee), `${boxes}${NL}div>span9 0,0,1x1 000000000000`, null)),
        split: diff(place, before, stripCell(markup(1, label, noFee, true), boxes, null)),
        elsewhere: diff("/", before, after),
        paint: firstPaintOf(place, before, stripCell(markup(1, label, noFee), boxes, [markup(1, label, noFee), boxes]), stripStore, stripStore).verdict,
      };
    }));
    const named = (d) => d.unexpected.length === 0 && d.expected.map((e) => e.id).sort().join() === "sell-strip-whole,sell-strip-whole-layout";
    ok("P.5g S6 A8g's two named strip differences — the strip's class string, and the signatures and boxes it draws — pass together at both Sell places in en and in sw, in a capture and in a first paint, while a second change beside them, a note the server writes as two texts, or the same change off the Sell places stays a failure",
      !!htmlEntry && !!boxesEntry && stripRuns.length === 4 && stripRuns.every((r) => named(r.named) && r.plus.unexpected.length === 1 && r.split.unexpected.length === 1
        && r.elsewhere.unexpected.length === 2 && r.paint === SELL_FIRST_PAINT.id),
      JSON.stringify(stripRuns.map((r) => [r.l, r.place, r.named.expected.map((e) => e.id), r.plus.unexpected.length, r.split.unexpected.length, r.elsewhere.unexpected.length, r.paint])).slice(0, 400));
  }

  // ①e S6 A8e · the first paint, held the same way (SELL_FIRST_PAINT, 4.4f), on the markup a capture records — the marker
  // React's server writes between two texts side by side (`TZS <!-- -->3,600`), the button's spoken name and its style — at
  // both Sell places, in en and in sw. Against a baseline with no first paint of its own (the v2 file): A8e's first paint,
  // the strip and the free button, is the baseline's Sell button as today's tree draws it (SELL_EXPECTED_DIFFS' own markup
  // transition for that place applied), so it is the named transition; a strip whose note the server writes as two texts
  // (`· <!-- -->Hakuna ada`), the first paint before A8e (no strip, 'Uza sasa · TZS 3,600 −0 ada') and a second change
  // beside A8e's stay failures. Against a baseline that has a first paint of its own, the same first paint is the same (a
  // null compare passes on any tree), and A8e's is the named transition.
  {
    const paintStore = {};
    const blob = (html) => { const id = `p${Object.keys(paintStore).length}`; paintStore[id] = html; return id; };
    const region = (html) => (html ? { count: 1, html: blob(html), layout: null } : { count: 0, html: null, layout: null });
    const strip = (label, note, split) => `<div class="mb-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-500/[0.12] border border-brand-500/30"><span class="font-mono text-micro font-bold text-brand-300 uppercase tracking-[0.12em]">${label}</span><span class="font-mono text-[10px] text-brand-300 tabular-nums">m:ss</span><span class="font-mono text-[10px] text-text-subtle">· ${split ? "<!-- -->" : ""}${note}</span></div>`;
    const button = (aria, label, noteClass, note) => `<button type="button" aria-label="${aria}" class="btn btn-primary btn-md w-full whitespace-normal" style="justify-content:space-between"><span>${label}</span><span class="font-mono tabular-nums">TZS <!-- -->3,600<span class="${noteClass}">${note}</span></span></button>`;
    const drawnBy = (place, html) => {
      const e = SELL_EXPECTED_DIFFS.find((x) => x.field === "regions.button.html" && x.replace && (!x.routes || x.routes.includes(place)));
      return e ? e.replace.reduce((s, [from, to]) => s.split(from).join(to), html) : html;
    };
    const cellOf = (stripHtml, buttonHtml, served) => ({ ...cell(200, "f1"), landed: SELL_PLACES[1], regions: { strip: region(stripHtml), button: region(buttonHtml) },
      ...(served ? { served: { hydrated: false, regions: { strip: region(served[0]), button: region(served[1]) } } } : {}) });
    const WORDS = [
      ["en", "Free exit", "No fee", "full refund", "Sell now", "Cash out", "fee"],
      ["sw", "Toka bila gharama", "Hakuna ada", "pesa yote", "Uza sasa", "Toa sasa", "ada"],
    ];
    const paintRuns = WORDS.flatMap(([l, free, noFee, refund, sellNow, cashOut, fee]) => SELL_PLACES.map((place) => {
      const was = button(`${free} — TZS 3,600`, free, "ml-1.5 opacity-80 text-[11px]", refund);
      const a8e = [strip(free, noFee, false), drawnBy(place, was)];
      const before = [null, button(`${cashOut} TZS 3,600`, sellNow, "ml-1.5 opacity-80 text-[11px]", `−<!-- -->0<!-- --> <!-- -->${fee}`)];
      const v2 = cellOf(strip(free, noFee, false), was, null);
      const own = cellOf(strip(free, noFee, false), was, before);
      const verdict = (base, served) => firstPaintOf(place, base, cellOf(null, null, served), paintStore, paintStore);
      return {
        l, place, kept: verdict(v2, a8e), split: verdict(v2, [strip(free, noFee, true), a8e[1]]), before: verdict(v2, before),
        plus: verdict(v2, [a8e[0], a8e[1].split("3,600<").join("3,601<")]), same: verdict(own, before), moved: verdict(own, a8e),
      };
    }));
    const fields = (v) => v.drawn.map((d) => d.field);
    ok("P.5f S6 A8e's first paint — the strip and the free button, on the markup a capture records — is the baseline's Sell button as today's tree draws it (sell-first-paint) at both Sell places in en and in sw, while a strip whose note the server writes as two texts, the first paint before A8e (no strip, 'Uza sasa · TZS 3,600 −0 ada') and a second change beside it stay failures; and against a baseline with a first paint of its own, the same first paint is the same and A8e's is the named transition",
      paintRuns.length === 4 && paintRuns.every((r) => r.kept.verdict === SELL_FIRST_PAINT.id
        && r.split.verdict === "differs" && fields(r.split).join() === "regions.strip.html"
        && r.before.verdict === "differs" && fields(r.before).includes("regions.strip.count") && fields(r.before).includes("regions.button.html")
        && r.plus.verdict === "differs" && fields(r.plus).join() === "regions.button.html"
        && r.same.verdict === "same" && r.moved.verdict === SELL_FIRST_PAINT.id),
      JSON.stringify(paintRuns.map((r) => [r.l, r.place, r.kept.verdict, fields(r.split), fields(r.before), fields(r.plus), r.same.verdict, r.moved.verdict])).slice(0, 400));
  }

  // ② The checks of §2 and §3: a clean synthetic capture passes them all, and each plant turns exactly its own one red.
  const S = syntheticCapture();
  const red = (m, loaders = []) => ({
    2: populationChecks(m.cells, m.store).filter((x) => x.fails.length).map((x) => x.id),
    3: accountChecks(m.cells, loaders).filter((x) => x.fails.length).map((x) => x.id),
  });
  const base = red(S);
  ok("P.7 a clean synthetic capture passes every check in §2 and §3", !base[2].length && !base[3].length, JSON.stringify(base));
  {
    const zw = String.fromCharCode(0x200b);
    const takes = [`Failed to execute 'measure' on 'Performance': '${zw}AccountHubPage' cannot have a negative time stamp.`, `Failed to execute 'measure' on 'Performance': 'Page' cannot have a negative time stamp.`];
    const leaves = ["TypeError: x is not a function", "Hydration failed because the server rendered HTML didn't match the client.", `Failed to execute 'measure' on 'Performance': 'Page' cannot have a negative time stamp. And then a crash`, "Failed to execute 'mark' on 'Performance': bad", ""];
    ok("P.7d the DEV-only filter takes React's DEV measure sentence, and nothing else (another error, a longer sentence, a mark, nothing)",
      takes.every(isDevMeasure) && !leaves.some(isDevMeasure), JSON.stringify({ takes: takes.map(isDevMeasure), leaves: leaves.map(isDevMeasure) }));
  }
  const at = (m, v, l, w, r) => m.cells[keyOf(v, l, w, r)];
  const nothing = () => ({ count: 0, html: null, layout: null });
  const FLOOR_PLANTS = [
    ["2.0", "a cell that did not capture", (m) => { m.cells[keyOf("guest", "en", 768, "/markets")] = { error: "planted" }; }],
    ["2.0", "a cell missing from the matrix", (m) => { delete m.cells[keyOf("guest", "sw", 768, "/wallet")]; }],
    ["2.1", "a cell without its header", (m) => { at(m, "player", "sw", 1024, "/markets").regions.header = nothing(); }],
    ["2.1", "a cell with two rails", (m) => { at(m, "guest", "en", 360, "/").regions.rail.count = 2; }],
    ["2.2", "a cell that never settled", (m) => { at(m, "guest", "sw", 1280, "/").stable = false; }],
    ["2.3", "a viewer carrying a preview pass", (m) => { at(m, "player", "en", 768, "/").pass = true; }],
    ["2.4", "a journey test id in the page", (m) => { at(m, "player", "en", 360, "/wallet").journey = ["testid:journey-tabs"]; }],
    ["2.4", "the journey flag on the page", (m) => { at(m, "held", "sw", 1280, "/markets").journey = ["html[data-journey]"]; }],
    ["2.5", "a journey test id in the raw HTML", (m) => { at(m, "guest", "en", 1024, "/").raw.trace = ["testid:journey-tabs"]; }],
    ["2.5", "raw HTML that could not be read", (m) => { at(m, "held", "sw", 360, "/markets").raw = null; }],
    ["2.5", "raw HTML that is not the shell", (m) => { at(m, "unverified", "sw", 768, "/").raw.shell = false; }],
    ["2.6", "a guest who stays on /wallet", (m) => { at(m, "guest", "en", 360, "/wallet").landed = "/wallet"; }],
    ["2.7", "a signed-in viewer sent to sign-in", (m) => { at(m, "held", "sw", 768, "/profile").landed = "/auth/login?next=%2Fprofile"; }],
    ["2.8", "a held viewer with the header deposit control", (m) => { at(m, "held", "en", 1280, "/").regions.header.html = "hdrDeposit"; }],
    ["2.8", "a player without it", (m) => { at(m, "player", "en", 1280, "/").regions.header.html = "hdr"; }],
    ...(EMAIL_BAR_GONE
      ? [["2.9", "an email bar drawn after its deletion, for the unconfirmed email", (m) => { at(m, "unverified", "en", 360, "/").regions.emailBar.count = 1; }],
         ["2.9", "an email bar drawn after its deletion, for the player on another page", (m) => { at(m, "player", "sw", 1280, "/markets").regions.emailBar.count = 1; }]]
      : [["2.9", "the unconfirmed email without its bar", (m) => { at(m, "unverified", "en", 360, "/").regions.emailBar = nothing(); }],
         ["2.9", "the player shown the email bar", (m) => { at(m, "player", "en", 360, "/").regions.emailBar.count = 1; }]]),
    ["2.10", "no rail among the overlays at 360", (m) => { at(m, "guest", "sw", 360, "/markets").overlays = []; }],
    ["2.11", "a signed-in /positions without its body", (m) => { delete at(m, "player", "en", 768, "/positions").regions.main; }],
    ["2.13", "a real page error filed as DEV-only (it would never be compared)", (m) => { at(m, "player", "en", 360, "/").devOnly = ["TypeError: Cannot read properties of undefined (reading 'balance')"]; }],
    ["3.0", "a control path answering 200", (m) => { at(m, "guest", "en", 360, NOT_FOUND).status = 200; }],
    ["3.0", "a not-found body too short to be one, on both paths", (m) => { at(m, "held", "sw", 1024, NOT_FOUND).notFound.main = "x"; at(m, "held", "sw", 1024, "/account").notFound.main = "x"; }],
    ["3.1", "/account with a body of its own", (m) => { at(m, "player", "sw", 1280, "/account").notFound.main = "Akaunti · Salio · Arifa · Msaada · Pumzika · Jizuie"; }],
    ["3.2", "/account under a title of its own", (m) => { at(m, "held", "en", 768, "/account").notFound.title = "Akaunti · 50pick"; }],
    ["3.3", "/account without noindex", (m) => { at(m, "unverified", "sw", 1024, "/account").notFound.robots = ["index, follow"]; }],
    ["3.4", "/account with a journey test id in the page", (m) => { at(m, "guest", "en", 1280, "/account").journey = ["testid:journey-account-hub"]; }],
    ["3.5", "/account with a journey test id in its raw HTML", (m) => { at(m, "player", "en", 360, "/account").raw.trace = ["testid:journey-account-hub"]; }],
    ["3.6", "an account/loading file in the tree", null, ["src/app/account/loading.tsx"]],
  ];
  for (const [id, what, plant, loaders] of FLOOR_PLANTS) {
    const m = structuredClone(S);
    plant?.(m);
    const section = id.split(".")[0];
    const got = red(m, loaders)[section];
    ok(`P.check ${id} — ${what} turns ${id} red, and nothing else in §${section}`, got.join() === id, got.join(" ") || "nothing went red");
  }

  // ②b WP10 · the Sell capture's checks (§S): a clean synthetic capture passes them all, and each plant turns exactly its
  // own one red.
  const SS = syntheticSell();
  const sellRed = (m) => sellChecks(m.sell, m.seed, m.store).filter((x) => x.fails.length).map((x) => x.id);
  ok("P.7s a clean synthetic Sell capture passes every check in §S", sellRed(SS).length === 0, JSON.stringify(sellRed(SS)));
  const atSell = (m, l, w, place) => m.sell[keyOf("sell", l, w, place)];
  const SELL_FLOOR_PLANTS = [
    ["S.0", "a seed that placed no open ticket", (m) => { m.seed = { error: "planted" }; }],
    ["S.0", "a Sell cell missing from the capture", (m) => { delete m.sell[keyOf("sell", "sw", 360, SELL_PLACES[1])]; }],
    ["S.1", "a Sell cell that never settled", (m) => { atSell(m, "en", 1280, SELL_PLACES[0]).stable = false; }],
    ["S.1", "a Sell cell sent to sign-in", (m) => { atSell(m, "sw", 1280, SELL_PLACES[0]).landed = "/auth/login?next=%2Fpositions"; }],
    ["S.2", "a Sell cell captured after the free window closed (no strip)", (m) => { atSell(m, "en", 360, SELL_PLACES[1]).regions.strip = { count: 0, html: null, layout: null }; }],
    ["S.2", "a strip whose ticking clock was not read as m:ss", (m) => { m.store.stripRaw = "<div><span>Free exit</span><span>4:59</span></div>"; atSell(m, "sw", 360, SELL_PLACES[0]).regions.strip.html = "stripRaw"; }],
    ["S.2", "a confirm cell whose dialog never opened", (m) => { atSell(m, "en", 360, SELL_PLACES[1]).regions.confirm = { count: 0, html: null, layout: null }; }],
    ["S.2", "a confirm captured after its quote hold ran out (its gold button disabled)", (m) => { atSell(m, "sw", 360, SELL_PLACES[1]).confirmLive = false; }],
    ["S.3", "a journey trace in a Sell cell", (m) => { atSell(m, "en", 1280, SELL_PLACES[1]).journey = ["testid:journey-tabs"]; }],
    ["S.4", "a Sell cell whose first paint was never captured", (m) => { delete atSell(m, "en", 360, SELL_PLACES[0]).served; }],
    ["S.4", "a first paint read after the page had hydrated (its scripts not held)", (m) => { atSell(m, "sw", 1280, SELL_PLACES[1]).served.hydrated = true; }],
  ];
  for (const [id, what, plant] of SELL_FLOOR_PLANTS) {
    const m = structuredClone(SS);
    plant(m);
    const got = sellRed(m);
    ok(`P.check ${id} — ${what} turns ${id} red, and nothing else in §S`, got.join() === id, got.join(" ") || "nothing went red");
  }

}

export { EXPECTED_DIFFS, SELL_EXPECTED_DIFFS, diffCells, fieldsOf, partialExpected, missingAlongside, proveRed };
export async function compare(baseline, current) {
  const cells = current.cells, sellCells = current.sell, blobs = current.blobs;
    console.log(`\n§4 · parity with the baseline (${short(baseline.base.sha)}, captured ${baseline.base.capturedAt})`);
    const baseKeys = Object.keys(baseline.cells).sort(), curKeys = Object.keys(cells).sort();
    ok("4.0 the same cells as the baseline", JSON.stringify(baseKeys) === JSON.stringify(curKeys), `${baseKeys.length} vs ${curKeys.length}`);
    const hits = new Map();
    let differing = 0, compared = 0, shown = 0;
    for (const k of curKeys) {
      const was = baseline.cells[k], now = cells[k];
      if (!was || was.error || now.error) continue;
      compared++;
      const { unexpected, expected } = diffCells(partsOf(k).r, was, now, baseline.blobs, blobs);
      for (const e of expected) hits.set(e.id, (hits.get(e.id) ?? 0) + 1);
      if (!unexpected.length) continue;
      differing++;
      if (shown++ < 40) for (const d of unexpected.slice(0, 3)) console.log(`  ✗ ${k} — ${d.field}: ${d.detail}`.slice(0, 600));
    }
    if (shown > 40) console.log(`  … and ${shown - 40} more cell(s)`);
    ok(`4.1 ⭐ no unexpected difference in ${compared} cells`, compared === curKeys.length && differing === 0, differing ? `${differing} cell(s) differ` : "");
    const devCells = curKeys.filter((k) => (cells[k]?.devOnly ?? []).length);
    if (devCells.length) console.log(`  DEV-ONLY, filed and not compared (React's DEV performance track; a production build has none) in ${devCells.length} cell(s): ${devCells.slice(0, 8).join(", ")}${devCells.length > 8 ? " …" : ""}`);
    ok("4.2 each named difference is seen in all of its cells or in none", partialExpected(hits).length === 0, partialExpected(hits).join(" · "));
    // The visual pass · a measured layout is seen wherever the markup that draws it is (as 4.6 holds the Sell cells'):
    // the drawing's new frame served with the /positions body's boxes back to the baseline's fails, never passes.
    const matrixMissing = missingAlongside(hits, EXPECTED_DIFFS);
    ok("4.2b each measured difference is seen in all of its cells whenever the served change that causes it is seen", matrixMissing.length === 0,
      matrixMissing.join(" · "));
    for (const e of EXPECTED_DIFFS) console.log(`  EXPECTED ${e.id} — seen in ${hits.get(e.id) ?? 0} of ${e.cells} cell(s). ${e.reason}`);
    // ⭐ WP10 · the Sell cells against the baseline's (A8: a default poll with an hour to run compares equal; any other
    // difference is a named entry in SELL_EXPECTED_DIFFS, never a re-baseline).
    const sellBase = baseline.sell ?? {};
    const sellBaseKeys = Object.keys(sellBase).sort(), sellCurKeys = Object.keys(sellCells).sort();
    ok("4.3 the same Sell cells as the baseline", sellCurKeys.length > 0 && JSON.stringify(sellBaseKeys) === JSON.stringify(sellCurKeys), `${sellBaseKeys.length} vs ${sellCurKeys.length}`);
    const sellHits = new Map();
    let sellDiffering = 0, sellCompared = 0;
    for (const k of sellCurKeys) {
      const was = sellBase[k], now = sellCells[k];
      if (!was || was.error || now.error) continue;
      sellCompared++;
      const { unexpected, expected } = diffCells(partsOf(k).r, was, now, baseline.blobs, blobs, SELL_EXPECTED_DIFFS);
      for (const e of expected) sellHits.set(e.id, (sellHits.get(e.id) ?? 0) + 1);
      if (!unexpected.length) continue;
      sellDiffering++;
      for (const d of unexpected.slice(0, 3)) console.log(`  ✗ ${k} — ${d.field}: ${d.detail}`.slice(0, 600));
    }
    ok(`4.4 ⭐ no unexpected difference in the ${sellCompared} Sell cells: a classic holder is sold to by today's Sell button and confirm`,
      sellCompared > 0 && sellCompared === sellCurKeys.length && sellDiffering === 0, sellDiffering ? `${sellDiffering} Sell cell(s) differ` : "");
    // ⭐ S6 A8e · every Sell cell's first paint against the baseline (firstPaintOf): the baseline's own first paint when it
    // has one, and otherwise — SELL_FIRST_PAINT, the named transition — its Sell button as the browser drew it.
    const paints = new Map();
    let paintCompared = 0;
    for (const k of sellCurKeys) {
      const was = sellBase[k], now = sellCells[k];
      if (!was || was.error || now.error) continue;
      paintCompared++;
      const v = firstPaintOf(partsOf(k).r, was, now, baseline.blobs, blobs);
      paints.set(v.verdict, (paints.get(v.verdict) ?? 0) + 1);
      if (v.verdict === "same" || v.verdict === SELL_FIRST_PAINT.id) continue;
      for (const d of [...(v.own ?? []), ...v.drawn].slice(0, 3)) console.log(`  ✗ ${k} first paint — ${d.field}: ${d.detail}`.slice(0, 600));
    }
    const paintNamed = paints.get(SELL_FIRST_PAINT.id) ?? 0;
    const paintDiffering = paintCompared - paintNamed - (paints.get("same") ?? 0);
    ok(`4.4f ⭐ every Sell cell's first paint (every script held, nothing hydrated) is the baseline's own first paint or — in all of its cells or none — ${SELL_FIRST_PAINT.id}, the baseline's Sell button as the browser drew it`,
      paintCompared === SELL_FIRST_PAINT.cells && paintDiffering === 0 && (paintNamed === 0 || paintNamed === SELL_FIRST_PAINT.cells),
      `${paintCompared} of ${SELL_FIRST_PAINT.cells} compared · ${[...paints].map(([v, n]) => `${v} ${n}`).join(" · ")}`);
    console.log(`  NAMED ${SELL_FIRST_PAINT.id} — seen in ${paintNamed} of ${SELL_FIRST_PAINT.cells} Sell cell(s). ${SELL_FIRST_PAINT.reason}`);
    // A Sell cell whose first paint differs is written beside the baseline too, as one that differs otherwise is (below).
    sellDiffering += paintDiffering;
    // S6 A8f · each named Sell difference's count, printed as the matrix prints its own (4.2): 4.5 below passes a named
    // change seen in none of its cells, so a compare against a server not serving that change would pass in silence.
    for (const e of SELL_EXPECTED_DIFFS) console.log(`  EXPECTED ${e.id} — seen in ${sellHits.get(e.id) ?? 0} of ${e.cells} Sell cell(s). ${e.reason}`);
    ok("4.5 each named Sell difference is seen in all of its cells or in none", partialExpected(sellHits, SELL_EXPECTED_DIFFS).length === 0,
      partialExpected(sellHits, SELL_EXPECTED_DIFFS).join(" · "));
    // S6 A8d · and a measured layout is seen wherever the served change that causes it is: the stack's class served with
    // the holder block's layout back to the baseline's one line (its rule no longer applying) fails, never passes.
    const sellMissing = missingAlongside(sellHits, SELL_EXPECTED_DIFFS);
    ok("4.6 each measured Sell difference is seen in all of its cells whenever the served change that causes it is seen", sellMissing.length === 0,
      sellMissing.join(" · "));

  return { differing, sellDiffering, hits: [...hits], sellHits: [...sellHits] };
}
