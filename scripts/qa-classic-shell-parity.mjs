/**
 * LOCAL-ONLY proof that a viewer WITHOUT the new journey is served the same shell after S6 as before it
 * (the Vodacom plan S6, WP0 — `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md`, amendments A3 and A18).
 *
 * S6 swaps the header and the rail for journey viewers only, and promises everybody else the same elements with the
 * same props. A promise like that is proved against the tree it was made from, not asserted, so this drive records
 * what a classic viewer is shown on the pre-S6 tree and compares every later tree with that record:
 *   · viewers  a guest · the demo player (/auth/demo) · held (?hold=officer) · an unconfirmed email (?email=unverified)
 *   · cells    360 · 768 · 1024 · 1280 × en · sw × / · /markets · /positions · /wallet · /profile · /account, plus an
 *              unmatched path — the not-found CONTROL that /account is measured against.
 * Per cell: the header, the rail, the shell footer and the email bar (normalised outerHTML, and every element's box and
 * computed style — a style change reaches no outerHTML, so markup alone would miss it), the fixed overlays present 3 s
 * after hydration, the footer's padding-bottom and the page's scroll-padding-bottom, the status, where the page landed,
 * its uncaught errors, and every journey trace — in the live page (a test id, the flag attribute, a class) and in the
 * bytes the server sent, where a streamed fallback stays after hydration has replaced it (G3). For /account and the
 * control also the title, the robots meta and the main text; for the signed-in viewers' /positions (an empty demo
 * portfolio, the page WP9 rebuilds for journey viewers) the page body too. No other page body is captured.
 * ⭐ WP10 (S6-PLAN WP10 step 3, A8) — AND THE SELL BUTTON A CLASSIC HOLDER IS SERVED. After the matrix (whose demo
 * portfolio must stay empty, so the /positions body above is the same from one server to the next), the demo player is
 * given an open ticket through the real money paths (`/api/dev-test/seed-real-markets`, then `seed-player-portfolio`),
 * and the two things SellButton draws for it in its free window, the strip and the button, are captured where a classic
 * holder meets them: the ticket's card on /positions and its question's holder block, at 360 and 1280 in en and sw. In
 * the holder block at 360 the button is also pressed, once, and the classic confirm it opens is captured — inside its
 * 10-second quote hold, and never confirmed: only Enter or its gold button sells, and neither is touched. The strip's
 * ticking clock is read as "m:ss" and a ticket's id as "pos_~"; the rest is compared as the matrix is, against
 * SELL_EXPECTED_DIFFS (A8: a default poll with an hour to run compares equal; S6 A8b names the one change it makes, the
 * classic button's free note gaining its narrow-phone classes; S6 A8d names the holder block's stacked phone row: the
 * class on its button at every width, and that button's measured layout at 360, which §4.6 holds to the class that
 * causes it). The capture runs inside a default poll's
 * five-minute free window, and §S fails a run whose cells missed it. The matrix gained the capture, so this is v2: a v1
 * baseline is refused, and the v2 baseline is captured at the commit just before A8's live half (VODACOM-PLAN §0i names
 * it), so the Sell cells measure A8's own claim as well as S6's.
 * ⭐ S6 A8e — AND THE SELL BUTTON'S FIRST PAINT. Each Sell cell also captures the strip and the button as the server paints
 * them, in a page of its own whose scripts are all held so that nothing hydrates (`served`, S.4): what a slow phone shows
 * until the page has started. A compare holds that first paint to the baseline's own first paint when the baseline has
 * one, and otherwise to the baseline's Sell button as the browser drew it once the page had started — the transition A8e
 * makes, named SELL_FIRST_PAINT (4.4f). --prove-red holds the capture to itself — two first paints agree, and a change
 * planted in one is seen — and never to a claim about the tree, so it calibrates any tree, the baseline's included; P.5f
 * proves the matcher on the markup a capture records. A first paint that cannot be captured fails within 50 s, and the
 * cells after it skip theirs (S.4 says so), so the hydrated cells stay inside the free window.
 * ⭐ S6 A8f — AND THE CLASSIC CONFIRM'S RECEIVE ROW. The confirm captured in the holder block at 360 changes on
 * purpose: its receive figure is an amount and its row wraps (test:sell-grace-truth §6). SELL_EXPECTED_DIFFS names
 * that change twice, pushed after the list's literal — its markup (sell-confirm-whole-figure) and the boxes it draws
 * (sell-confirm-receive-boxes), 2 cells each — P.5c holds the matcher to both, and a compare prints how many cells
 * each named Sell difference was seen in: A8f's seen in 0 of 2 means the server is not serving A8f. The result a sale
 * opens is never captured here (no Sell cell confirms a sale), so its title's figures, now amounts, are a classic
 * change only the tiles show (VODACOM-PLAN §0i).
 * ⭐ S6 A8g — AND THE FREE STRIP AND /positions' WRAP. The strip above the Sell button keeps each of its parts whole and
 * wraps only between them: its one class string moves in every Sell cell (sell-strip-whole) and with it its signature,
 * and in the holder block at 360 its Swahili parts now take two lines whole where they broke inside — the boxes and
 * styles predicted from the baseline's own capture and named beside the class (sell-strip-whole-layout), so a compare
 * that draws any other is a failure, read from its capture. Every host that does not stack is drawn the wrap class:
 * /positions' button carries it at every width beside A8b's free-note classes (sell-positions-wrap, which A8b's
 * sell-narrow-phone pairs now ride in), and at 360 its figure is a wrapping row whose styles move while every glyph
 * stays (sell-positions-wrap-layout-en and -sw, measured first, as A8d's are). P.5g holds the strip's two entries in a
 * capture and in a first paint; P.5s, P.5L and P.6s hold the rest.
 * ⭐ S6 A8h — AND THE SHELL'S HOST FOR A SALE'S RESULT, WHICH NAMES NO ENTRY. AppShell mounts it for a signed-in viewer
 * through the shell's lazy module: a signed-in cell's HTML gains one more Suspense boundary's markers beside the win
 * celebration's, its head the preload of the host's chunk and its inline RSC data the part's client reference, all
 * outside every region and field captured here; and the host draws nothing until a sale, so no overlay, region or Sell
 * cell changes (no Sell cell confirms a sale, and none is refused). A guest's page changes only by the name of the
 * shell's lazy chunk, which this harness normalises. The result it keeps on screen, and a refused sale's toast routed
 * by the registry, are classic changes only the drives and the tiles show (VODACOM-PLAN §0i).
 * ⭐ THE VISUAL PASS (VODACOM-PLAN, 2026-10-08 and 09) — AND WHAT IT CHANGES FOR A CLASSIC VIEWER. The pass fixes shared
 * components for every player, so the one page body captured here, the signed-in viewers' empty /positions, changes on
 * purpose: its EmptyState's markup and the boxes it draws, named and measured (positions-empty-state and its two layout
 * entries, in EXPECTED_DIFFS), with 4.2b holding each layout to the markup that draws it as 4.6 holds the Sell cells'
 * (P.5p and P.6p prove both). The footer's proposals link, which the pass balanced, is the journey's alone (AppShell's
 * footer arms), so the classic footer still compares equal and names nothing.
 * ⭐ S7 WP1 (S7-PLAN WP1, amendments A8 and A2 item 3) — VERSION 3: A CLASSIC READER'S PAGE BODIES ON EVERY S7 ROUTE. S7's
 * binding promise is that a classic visitor is served the same pages, and v2 captured only the shell's regions and the
 * signed-in /positions body: it never visited /live, /results or /watchlist. After the matrix and the Sell capture (which
 * keeps its { markets: 5 }), the BOOK phase seeds the demo player's book through dev-test doors that already exist, in
 * A8's order, and judges each reply (bookVerdict): seed-markets must name at least 12 LIVE non-demo questions (the pool
 * is recorded); seed-player-portfolio { markets: 12 } must place 12 with one VOID intended, the player must hold VOID, WIN
 * and LOSS positions, and no refusal is allowed but an Up & Down one, which is recorded and never fails (A8 names the
 * cashOut, stage1, settle and void ones; a refusal of any other kind is refused too, never read past); seed-watchlist must
 * answer ok with void, done and progress rows. Then, before anything is recorded, A8 item
 * 2's probe (probeVerdict): /results shows the voided question's card (marketIds[11]) drawn void and settled YES and NO
 * cards, and /watchlist void, done and selection-closed cards. A refused book or probe makes the baseline INVALID: no
 * book cell is captured and no baseline is written. Per book cell (guest and player × en and sw × 360 and 1280): the
 * normalised <main> — markup, boxes and computed styles — of /, /markets, /live and /results, /watchlist for the player
 * only (edge-protected), the similar rail of the book's first question (marketIds[0]), the LIVE strip on the four lobby
 * routes — read in the product's own still state, the readable list at scroll 0 (the marquee's first frame), through a
 * style in the document head outside every captured region, because a running marquee put two captures of one cell on
 * one server 60 of its 73 element lines apart — and /'s head from the BYTES (the canonical link and every og:* meta, in
 * order). Every classic card state S7 touches must be drawn somewhere in the book (B.7): live priced, one-sided, empty
 * pool, selection closed, resolved YES and NO, void. The book's normalisers (BOOK_NORMALISERS: market ids, time-left
 * labels, EAT dates, relative times, chart paths, the identity avatar's ids, chunk hashes, tied cards) exist one by one
 * and are OFF unless calibration proves two fresh servers of one tree disagree on them (WP1 step 4: never guessed); this
 * file's switches turn them on, `--norm <ids>` (or KP_PARITY_NORMALISE) for one run. ON, each with the null pair that
 * proved it (BOOK_NORMALISE_ON): market ids (9b18ea59's pair: each server mints its own), EAT dates (090bbf76's pair: a
 * seeded /watchlist row's moments are its own seeding moment's) and tied cards (090bbf76's pair: four /markets cards that
 * state the same figures stand in their ids' order, the board's last tie-break, so each server drew its own; only cards
 * that state the same figures are read in their titles' order, and a card that states any figure differently never
 * moves). And since 090bbf76's pair, where four lazy payment logos on the guest's / at 360 read 0x0 on one server and
 * were drawn on the other, every book cell is read SETTLED (BOOK_SETTLE): each lazy image in its regions is loaded before
 * any box is read, and its attribute put back, so the markup is the server's. And since 9a7bbb24's --prove-red, whose two
 * clean captures of the player's /markets at 1280 in Swahili read the Needle's overlay (div[role=presentation] z=45) in
 * the first and not in the second — its engine mounts after hydration, behind two dynamic imports that a busy dev server
 * can land after the 3 s read — every page is read with the Needle AT REST (SETTLE): open() ends by waiting, 15 s at
 * most, until the page has no #needle-root or its engine has mounted and answers window.needle.resting() true, and a
 * Needle that does not come to rest is a note in its cell. A baseline records its set (matrix.book.normalise) and its
 * procedures (matrix.book.settle, matrix.settle), and a compare under another set or another procedure is refused, as is
 * any file that is not v3. The live trace
 * sees S7's class names too (A8 item 3, JOURNEY_CLASS_PARTS). --prove-red is taught the bodies: each §B check goes red on
 * its own plant (P.check B.*); the head reader, the normalisers, A8's two verdicts, the card classifier and the trace are
 * tried on synthetic input (P.8*); and in the browser a card class changed in one route's body is reported in that body
 * only, a dropped og:url in the head, and a journey-* id or a kp-jcard element in a classic page as a trace.
 * ⭐ S8 WP1 (S8-PLAN WP1, amendments A15, A17 item 5, A22 item 6 and A24) — VERSION 4: THE QUESTION PAGE'S CLASSIC BODY.
 * S8 re-lays the question page for a journey reader (its bet panel's signed-in arm and its holder section become
 * ternaries whose else arm is today's element), and v3 never read that page's body: only its similar rail. After the
 * matrix, the Sell capture and the book, the QUESTION phase builds its questions through dev-test doors that already
 * exist, after the book's own (seedQuestions, judged by questionVerdict): the open question is the Sell capture's held
 * one (both pools; the demo player holds YES on it, so it is also the holder's question, read bare and at ?side=YES and
 * ?side=NO, the hedge warning); a one-sided and an empty question are read off the guest's /markets by their card
 * state, each the first by title among its state's cards (the empty pool's next two are the settled and closed-by-time
 * questions' sources); selection closed is seed-watchlist's forced progress row; closed by time is fast-forward-market
 * pulling a question's result an hour into the past; settled is fast-forward-market pulling one a day into the past
 * (so resolve-seed-markets { markets: 1 } takes it, live[0] by resolutionAt) and then that door, complete and settled;
 * and a reader on a break is the demo player after a cooling-off taken through /profile/responsible-gambling's real
 * form (its confirm pressed), signed in again — captured last, since it ends the session and the account stays on a
 * break. Before the first cell the holder's free windows are waited out (the held question read as the player until no
 * free strip stands in its holder section), so no cell reads a window that closes during the run. Per question cell
 * (guest and player × en and sw × 360 and 1280; the guest takes the open, one-sided, selection-closed and settled
 * questions; the reader on a break the open and the empty ones): the question page's <main> — markup, boxes and computed
 * styles — with the bet panel (QUESTION_PANEL) and the holder section (QUESTION_HOLDER) each stubbed in it and captured
 * as a field of its own, so a difference names its region. Its masks are named before any null pair (A17 item 5:
 * QUESTION_MASKS — the [role=timer] texts, the countdown's clock, the Sell countdown, the chart's time axis, and the
 * server-rendered times through the book's eat-dates and `norm`); each mask counts what it masked in every cell, and
 * Q.6 fails a mask that masked nothing anywhere unless it is marked as absent from the classic page. The book's
 * normalisers apply to the question's cells too (their similar rails are book cards). §Q holds the population; --prove-red
 * plants a class in the bet panel (the panel field only), a kp-jbet element in a classic question page (a trace),
 * data-sheet on a classic card in the raw bytes (a trace) and a changed Sell label in the holder (the holder field only).
 * The trace sees S8's names: kp-bsheet, kp-jbet and kp-qghost in the page (JOURNEY_CLASS_PARTS, P.8t re-pinned) and
 * `data-sheet` in the bytes (RAW_TRACE, matched as `\bdata-sheet(?![\w-])` so the classic filter sheet's
 * data-sheet-open is not it: A22 item 6). A v3 file holds no question cell, so --compare refuses it.
 *
 *   KP_BASE=http://localhost:3041 npm run qa:classic-shell-parity                  (the control: --prove-red is the default)
 *   KP_BASE=http://localhost:3041 npm run qa:classic-shell-parity -- --baseline <scratchpad>/parity-v4-<sha8>.json
 *   KP_BASE=http://localhost:3041 npm run qa:classic-shell-parity -- --compare <scratchpad>/parity-v4-<sha8>.json
 *   … any of the three with --norm <id>,<id> (or KP_PARITY_NORMALISE=<id>,<id>): the book's normalisers for this run only
 *
 * ⭐ THE INSTRUMENT IS CALIBRATED BEFORE IT IS TRUSTED: --prove-red green, then the baseline, then — on a FRESH server
 * at the same commit — a null --compare that must exit 0. Every server mints a new demo user, store and ids; what
 * differs between two servers of one tree is this harness's noise, and it is found there, not at WP1.
 * ⛔ NEVER A RE-BASELINE (A3). A difference S6 makes on purpose is a NAMED entry in EXPECTED_DIFFS below, with its
 * reason and its population, and is listed in VODACOM-PLAN §0i. A baseline is captured once: this script refuses to
 * overwrite one, and --compare refuses a capture that failed a floor (`.rejected.json`) or a later tree's (`.current.json`).
 * ⛔ THE BASELINE NAMES ITS BASE (A18). It records the commit of the tree the server ran (KP_TREE, default this
 * checkout). --compare refuses it when that commit is not an ancestor of HEAD (a rebase: re-capture from the rebased
 * pre-S6 parent, into a NEW file), or when a merge since it brought served files in from elsewhere. It then lists every
 * commit since the baseline that changes a served file, so a commit of another lane's that arrived by fast-forward is
 * seen by name. This lane pushing to main is normal and refuses nothing. --allow-base compares anyway, and the verdict
 * line says so.
 * ⭐ --prove-red is the control. On synthetic captures: the EXPECTED_DIFFS matcher passes what it names and nothing
 * beside it, and every §2 floor and §3 /account check goes red on its own plant, and only that check. In the browser:
 * two clean captures of a cell agree, and a 64px header, a paint-only colour, a new fixed overlay and a dropped footer
 * clearance are each reported in their own field and nowhere else. If a plant is not seen, a clean compare means nothing.
 *
 * ⛔ Refuses anything but `http://localhost:PORT` on an IN-MEMORY dev server (the database must not be configured), and a
 * rollout that is ACTIVE (then nobody without a pass sees the classic shell). Start a FRESH server for each run — the
 * demo player's notifications and wallet are part of what the header shows. Writes only the file it is given, and
 * beside it (`.rejected.json` for a baseline that failed a check, `.current.json` for a compare that found differences).
 */
import { chromium } from "playwright";
import { maskPositionCountdown, steadyTimeLeftLayout, timeLeftPaths } from "./qa/classic-parity-noise.mjs";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { maskQuestionEventTimes, normaliseQuestionBreakClocks, QUESTION_BREAK_CLOCK, normaliseBookHomeCloseDates, BOOK_HOME_CLOSE_DATE } from "./lib/question-time-mask.mjs";
import { retryNavigationCapture } from "./lib/classic-shell-navigation.mjs";

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
const argv = process.argv.slice(2);
const FLAGS = new Set(["--baseline", "--compare", "--prove-red", "--calibrate-question", "--allow-base", "--allow-dirty", "--norm"]);
const valueOf = (flag) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null; };
const BASELINE = valueOf("--baseline");
const COMPARE = valueOf("--compare");
// The control is the default: a bare run writes nothing and proves the instrument.
const QUESTION_CALIBRATE = argv.includes("--calibrate-question");
const PROVE_RED = argv.includes("--prove-red") || (!QUESTION_CALIBRATE && !argv.includes("--baseline") && !argv.includes("--compare"));
const ALLOW_BASE = argv.includes("--allow-base");
const ALLOW_DIRTY = argv.includes("--allow-dirty");
const MODE = BASELINE ? "baseline" : COMPARE ? "compare" : QUESTION_CALIBRATE ? "calibrate-question" : "prove-red";
{
  const unknown = argv.filter((a) => a.startsWith("--") && !FLAGS.has(a));
  const modes = [BASELINE, COMPARE, PROVE_RED || null, QUESTION_CALIBRATE || null].filter(Boolean).length;
  const bad = unknown.length || modes !== 1
    || (argv.includes("--baseline") && !BASELINE) || (argv.includes("--compare") && !COMPARE)
    || (ALLOW_BASE && !COMPARE) || (ALLOW_DIRTY && !BASELINE) || (argv.includes("--norm") && !valueOf("--norm"));
  if (bad) {
    console.error("USAGE — exactly one of: --baseline <new file> [--allow-dirty] · --compare <baseline file> [--allow-base] · --prove-red (the default) · --calibrate-question (only the new rendered clock/geometry controls); with any of them --norm <id>,<id> (or none)"
      + (unknown.length ? `  (unknown: ${unknown.join(" ")})` : ""));
    process.exit(2);
  }
}

// ── S7 WP1 · the book's normalisers, and the switch that turns them on (WP1 step 4) ──────────────────────────
/**
 * ⭐ NORMALISE ONLY WHAT CALIBRATION SHOWS TWO FRESH SERVERS OF ONE TREE DISAGREE ON; NEVER GUESS (S7-PLAN WP1 step 4).
 * Each candidate the plan names exists here one by one, and each is OFF until a calibration null pair (two fresh servers
 * at one commit) proves it necessary: then its id goes into BOOK_NORMALISE_ON — this file's switches — in the commit that
 * records why (VODACOM-PLAN §0j). `--norm <id>,<id>` or KP_PARITY_NORMALISE switches a set on for one run (a calibration
 * run), and the header says so. A baseline records its set (matrix.book.normalise), and --compare refuses a baseline
 * captured under another set. They act on the BOOK's cells only (bookNorm), after `norm`, which every cell already passes
 * through: the matrix and the Sell cells never see them.
 *   · text  a rewrite of a book cell's recorded markup, signatures and head (`apply`); P.8n holds each to its own
 *           sample, its control, idempotence, the work `norm` does not already do, and to acting exactly when it is on;
 *   · page  what is handed to the page (`hands`, as a book cell's `book[arg]`) only when it is on: chart-paths' selector
 *           (SNAPSHOT's `book.chart`), and tied-cards' terms (`book.tied`, which captureBookCell runs as UNTIE_CARDS
 *           before every snapshot). P.8n holds each to being handed exactly when it is on; P.8o holds UNTIE_CARDS.
 */
/** The page normaliser's charts: a card's 24h spark (micro-spark.tsx) and the Up & Down band's track (updown-match-track.tsx). */
const CHART_SVGS = "svg.mcardp-spark, svg.kp-udtrack__svg";
/** The geometry attributes of a chart's shapes, which read "~" in a book cell's markup while chart-paths is on. */
const CHART_ATTRS = ["d", "points", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "width", "height"];
const BOOK_NORMALISERS = [
  {
    id: "market-ids", kind: "text",
    what: "a question's or a round's id (mkt_ and udr_ with 20 hex digits, market-service.ts and updown-service.ts): each server mints its own",
    apply: (s) => s.replace(/\b(mkt|udr)_[A-Za-z0-9]{6,}/g, "$1_~"),
    sample: '<a href="/markets/mkt_4f9c2a7b1e0d3c5a8b6e" data-row-id="mkt_4f9c2a7b1e0d3c5a8b6e"></a><b data-round="udr_17e07a91ecf526c2ae17"></b>',
    expect: '<a href="/markets/mkt_~" data-row-id="mkt_~"></a><b data-round="udr_~"></b>',
    control: '<i class="mkt_new udr_up kp-mkt_row"></i>',
  },
  {
    id: "encoded-market-ids", kind: "text",
    what: "only a seeded 20-hex market id immediately after percent-encoded /markets/ in a return target: the existing word-boundary market-id reader cannot match mkt_ after %2F; the route, query, auth door and words remain compared",
    apply: (s) => s.replace(/(%2[Ff]markets%2[Ff])mkt_[a-f0-9]{20}(?=%|[\x22\x27&\s<]|$)/g, "$1mkt_~"),
    sample: '<a href="/auth/login?next=%2Fmarkets%2Fmkt_4f9c2a7b1e0d3c5a8b6e%3Fside%3DYES">Login</a>',
    expect: '<a href="/auth/login?next=%2Fmarkets%2Fmkt_~%3Fside%3DYES">Login</a>',
    control: '<a href="/auth/login?next=%2Fmarkets%2Fmkt_4f9c2a7b1e0d3c5a8b6ebad">Login</a><a href="/auth/login?next=%2Fpositions%2Fmkt_4f9c2a7b1e0d3c5a8b6e">Login</a>',
  },
  {
    id: "time-left", kind: "text",
    what: "a card's betting countdown, which moves by the minute (time-left.ts with the dictionary's {n}d/{n}h/{n}m left and siku/masaa/dakika {n} zimebaki/yamebaki)",
    apply: (s) => s
      .replace(/\b\d+[dhm] left\b/g, "~ left")
      .replace(/\b(?:siku|masaa|dakika) \d+ (?:zimebaki|yamebaki)\b/g, "~ zimebaki"),
    sample: "3d left · 5h left · 12m left · siku 3 zimebaki · masaa 5 yamebaki · dakika 12 zimebaki",
    expect: "~ left · ~ left · ~ left · ~ zimebaki · ~ zimebaki · ~ zimebaki",
    control: "4 left · dakika 28:00 · siku zote · 5 days left",
  },
  {
    id: "eat-dates", kind: "text",
    what: "a day or a moment on the East Africa clock (eat-day.ts formatEatDate and formatEatDateTime: 27 Sep, 3 Ago 2027, 2 Aug, 14:05)",
    apply: (s) => s.replace(/\b\d{1,2} (?:Jan|Feb|Mar|Mac|Apr|May|Mei|Jun|Jul|Aug|Ago|Sep|Oct|Okt|Nov|Dec|Des)(?: \d{4})?(?:, \d{2}:\d{2})?\b/g, "~date"),
    sample: "Closes 27 Sep · Settled 3 Ago 2027 · 2 Aug, 14:05",
    expect: "Closes ~date · Settled ~date · ~date",
    control: "27 September · Sep 27 · 14:05 · 3 h ago",
  },
  {
    id: "relative-times", kind: "text",
    what: "how long ago, the number first (the dictionary's dAgo/hAgo/mAgo in Swahili; `norm` already reads 3 h ago and dakika 3 zilizopita)",
    apply: (s) => s.replace(/\b\d+ (?:siku|masaa|saa|dakika|sekunde) (?:zilizopita|yaliyopita|iliyopita)\b/g, "~ zilizopita"),
    sample: "3 masaa yaliyopita · 2 siku zilizopita · 5 dakika zilizopita",
    expect: "~ zilizopita · ~ zilizopita · ~ zilizopita",
    control: "Raundi iliyopita · siku 2 zimebaki · dakika 5 zilizopita",
  },
  {
    id: "chart-paths", kind: "page",
    what: "a chart's own geometry: inside CHART_SVGS every shape's box reads ~ and its d, points and coordinates ~",
    arg: "chart", hands: CHART_SVGS,
  },
  {
    id: "avatar-ids", kind: "text",
    what: "the identity avatar's svg ids, c[tmgc]<base36 of the user id> on a gradient or a clip path and in each url(#…) that names one (identity-avatar.tsx), as qa:served-skeleton reads them",
    apply: (s) => s
      .replace(/(<(?:radialGradient|linearGradient|clipPath)\b[^>]*?\bid=")c([tmgc])[0-9a-z]+/g, "$1c$2~")
      .replace(/url\(#c([tmgc])[0-9a-z]+/g, "url(#c$1~"),
    sample: '<radialGradient id="cm1x9k2_R_5_"></radialGradient><clipPath id="cm1x9k2_R_5_c"></clipPath><g clip-path="url(#cm1x9k2_R_5_c)" fill="url(#ct9z3q_R_7_)"></g>',
    expect: '<radialGradient id="cm~_R_5_"></radialGradient><clipPath id="cm~_R_5_c"></clipPath><g clip-path="url(#cm~_R_5_c)" fill="url(#ct~_R_7_)"></g>',
    control: '<div id="ctrl-1" class="cta"><clipPath id="kp-clip"></clipPath><g fill="url(#kp-glow)"></g></div>',
  },
  {
    id: "chunk-hashes", kind: "text",
    what: "a build's chunk names outside a /_next/static/ path, which `norm` already reads (qa:served-skeleton's chunk hashes): a next_static/ key's 8+ hex digits, Turbopack's 7-character dev hash before ._.js or ._.css, and next/font's hashed class names",
    apply: (s) => s
      .replace(/next_static\/[^"'\s)?#&]*/g, (m) => m.replace(/(^|[^0-9A-Za-z])[0-9a-f]{8,}(?![0-9A-Za-z])/g, "$1~"))
      .replace(/_[0-9a-z._~-]{7}(\._\.(?:js|css))(?![0-9A-Za-z])/g, "_~$1")
      .replace(/\b__(className|variable)_[0-9a-f]{6,}\b/g, "__$1_~"),
    sample: '<link rel="stylesheet" data-precedence="next_static/chunks/0a1b2c3d4e5f.css"/><i data-chunk="src_app_page_tsx_1133eyd._.js" class="__className_9f8e7d"></i>',
    expect: '<link rel="stylesheet" data-precedence="next_static/chunks/~.css"/><i data-chunk="src_app_page_tsx_~._.js" class="__className_~"></i>',
    control: '<span class="kp-tag-0a1b2c3d">deadbeef12 · page_tsx._.css · __className</span>',
  },
  {
    id: "tied-cards", kind: "page",
    what: "the order of market cards that stand side by side AND state the same figures: in each parent, a run of V18 surfaces (data-market-surface — a grid card, the featured card, a board row), each the very next node after the one before it, is cut into stretches whose surfaces state exactly the same figures (the same kind of surface, and every data-market-part but the source — pool, time, state, price, predictors, pick — word for word), and each stretch is read in its titles' order (the stretched link's aria-label, else the question's text), in its own place, before any region is read. A card that states any figure differently from its neighbour never moves, so an order change between unlike cards is still compared; an order change between cards that state the same figures is not seen",
    arg: "tied",
    hands: { surface: "data-market-surface", part: "data-market-part", except: ["source"], link: "mcardp-open", title: ["mcardp-q", "kp-qrow__q"] },
  },
];
/** ⭐ THIS FILE'S SWITCHES: the normalisers a calibration null pair has proved necessary, by id (VODACOM-PLAN §0j).
 *  · market-ids — WP1 step 6's null pair, 2026-10-12 (ALI-BLADE15): the baseline captured at 9b18ea59 and a null compare
 *    on a second fresh server of the same commit, every book normaliser off. 48 of the book's 196 fields differed (the
 *    bodies of /, /markets, /live, /results and /watchlist, and the similar rail), and market-ids alone left 8: each
 *    server mints its own question ids, so every card's link and row id differed. The 8 were /watchlist's order — the
 *    same nine cards drawn in another order — which no normaliser here absorbs and none should: seed-watchlist starred
 *    inside one millisecond, so the page's newest-first order hung on the loop's speed. The seed now stars one
 *    millisecond apart at least (its route, the same commit), and the order is the stars' own. Every other candidate
 *    stays off: the pair needed none of them.
 *  · eat-dates — calibration 2's null pair, 2026-10-12 (OMEGA-COMPILE01): the baseline captured at 090bbf76 (WP1 on main
 *    b7c55deb; this file byte-identical) with market-ids on, and a null compare on a second fresh in-memory server of the
 *    same commit. The matrix's 224 cells and the 8 Sell cells were identical; 13 of the book's 44 cells differed, one
 *    field each (13 of its 196 fields), for three causes. Four were the player's /watchlist (en and sw, 360 and 1280,
 *    regions.main.html): its seeded rows state five moments — 14 Oct, 10:27 (the time part of the card "Bitcoin closes
 *    above $100,000 on 1 August"), 13 Oct, 10:28, and 12 Oct, 22:27, 16:27 and 12:27 on the baseline's server — and each
 *    read 27 minutes later on the null's (14 Okt in Swahili): a seeded row's moment is its own seeding moment's, and the
 *    two servers seeded 27 minutes apart. eat-dates reads each as ~date; with it on, ALI-BLADE15's offline reader of the
 *    pair (book-noise.cjs) leaves 9 of the 13 fields, none of them a date.
 *  · tied-cards — the same pair: eight were /markets (guest and player, en and sw, 360 and 1280, regions.main.html), where
 *    four fresh cards of seedDemoMarkets' catalogue stand side by side, each closing six days after the seed — "Will
 *    Mwanza max temperature exceed 32°C this Sunday?" and the Bitcoin, Ethereum and Solana "close above … next Sunday?"
 *    (market-service.ts:5044, :5049-5051) — drawn Mwanza, Ethereum, Bitcoin, Solana on the baseline's server and Mwanza,
 *    Bitcoin, Solana, Ethereum on the null's. The board's default sort is the pool (discovery.ts:178), its tie-break the
 *    betting close (:491) and then byId (:536, query/sort.ts:132): the four have no pool and one close instant, so their
 *    order is their ids', which each server mints (market-ids' own reason). They state the same figures (no bets yet, be
 *    the first to predict, YES and NO, no pool yet, 5d left), so their boxes were equal and only the markup moved; tied
 *    cards whose titles wrap differently would move the boxes too, which only an order made in the page absorbs
 *    (UNTIE_CARDS, before every snapshot). The same function, run on a parsed copy of the pair's stored markup with
 *    eat-dates, leaves 1 of the 13 fields: it reads one tied stretch of four in each of the eight /markets cells, and
 *    nothing else in the book's 44 cells. That field is no normaliser's: BOOK_SETTLE records it. Every other candidate
 *    stays off: neither pair needed one. */
const BOOK_NORMALISE_ON = ["market-ids", "encoded-market-ids", "eat-dates", "tied-cards"];
/** The ids a switch names, in BOOK_NORMALISERS' order; a name that is not a candidate is refused. */
function normaliseIds(text, from) {
  const ids = BOOK_NORMALISERS.map((n) => n.id);
  const asked = [...new Set(String(text).split(/[\s,]+/).filter(Boolean))];
  if (asked.length === 1 && asked[0] === "none") return [];
  const unknown = asked.filter((x) => !ids.includes(x));
  if (unknown.length || !asked.length) refuse(`${from} names no candidate normaliser: ${unknown.join(", ") || "(nothing)"}. The candidates are ${ids.join(", ")} (or none).`);
  return ids.filter((id) => asked.includes(id));
}
const NORM_SWITCHES = [["--norm", valueOf("--norm")], ["KP_PARITY_NORMALISE", process.env.KP_PARITY_NORMALISE || null]]
  .filter(([, v]) => v !== null).map(([from, v]) => [from, normaliseIds(v, from)]);
if (NORM_SWITCHES.length === 2 && NORM_SWITCHES[0][1].join() !== NORM_SWITCHES[1][1].join()) {
  refuse(`--norm names [${NORM_SWITCHES[0][1].join(", ") || "none"}] and KP_PARITY_NORMALISE [${NORM_SWITCHES[1][1].join(", ") || "none"}]: one run has one set of normalisers.`);
}
/** Where this run's set came from: null for this file's switches, else the switch that overrode them for this run. */
const NORM_SOURCE = NORM_SWITCHES.length ? NORM_SWITCHES.map(([from]) => from).join(" and ") : null;
const BOOK_NORMALISE = NORM_SWITCHES.length ? NORM_SWITCHES[0][1] : normaliseIds(BOOK_NORMALISE_ON.join(",") || "none", "BOOK_NORMALISE_ON");
/** tied-cards' terms, handed to the page as a book cell's `book.tied` while it is on (UNTIE_CARDS reads them). */
const TIED_CARDS = BOOK_NORMALISERS.find((n) => n.id === "tied-cards").hands;
/**
 * ⭐ S7 WP1 calibration 2 · THE BOOK IS READ SETTLED — this harness's capture procedure for a book cell, recorded in a
 * baseline (matrix.book.settle); --compare refuses a baseline read under another, as it refuses another normaliser set.
 *   · lazy-images  every img[loading="lazy"] inside the regions a book cell captures is told to load and awaited before
 *                  any box is read, then given its own loading attribute back (SETTLE_LAZY), so the markup is the
 *                  server's and an image's box no longer hangs on whether the browser happened to fetch it.
 *   · home-close-date-leaves  only the home featured card's and board rows' validated complete locale dates are
 *                  canonicalized before geometry, retaining their prefixes, source words, elements and every paint
 *                  attribute. B.9 requires the source's one featured plus QUESTION_BOARD_SIZE leaves, zero elsewhere.
 * The pair that showed it is 090bbf76's (BOOK_NORMALISE_ON's eat-dates records it): its ninth differing field, the
 * guest's / at 360 in English (regions.main.layout, 4 of 556 element lines), was the payment rail's four logos
 * (/pay/mpesa.svg, airtel.png, halopesa.png and mixx.png, loading="lazy" at y≈5380 in a 40×40 slot each), 0x0 on the
 * baseline's server and drawn on the null's (M-Pesa's 26x22); nothing else in the cell moved. A lazy image that has not
 * loaded LAZY_SETTLE_MS after the settle began is a note in the cell (and a line in the log), never a hang, and its box is
 * read as the browser left it. --prove-red's book phase holds the settle to a lazy image it plants out of the browser's
 * reach: 0x0 in a capture without the settle, drawn in one with it, and the markup of the two the same.
 */
const BOOK_SETTLE = ["lazy-images", "home-close-date-leaves"];
/** How long a book cell's settle waits, in all, for its lazy images to load. */
const LAZY_SETTLE_MS = 10_000;
/**
 * ⭐ S7 WP1 calibration 3 · EVERY PAGE IS READ WITH THE NEEDLE AT REST — the procedure every page this harness opens is
 * read under (the matrix's cells, the Sell cells and the book's), recorded in a baseline (matrix.settle); --compare
 * refuses a baseline read under another, as it refuses another book procedure or normaliser set.
 *   · needle-rest  open() ends — after hydration, the plant and the 3 s, and after a client redirect's second document —
 *                  by waiting until the Needle is at rest (NEEDLE_AT_REST: no #needle-root, or its engine mounted and
 *                  `window.needle.resting()` true), NEEDLE_REST_MS at most; a Needle that has not come to rest by then is
 *                  a note in the cell (and a line in the log), never a hang and never a failure by itself, and the page is
 *                  read as it stands.
 * The run that showed it: 9a7bbb24's --prove-red (OMEGA-COMPILE01, 2026-10-12, a fresh in-memory server; calibration 2
 * rebased onto main 05d42f7f), 128/129, its one failure the player's /markets at 1280 in Swahili, whose two clean
 * captures disagreed in one field: overlays, "div[role=presentation] z=45" in the first and nothing in the second. That
 * is the Needle (`#needle-root #needle`, needle.css:152's z 45), which a signed-in shell renders (app-shell.tsx:600) and
 * whose engine mounts only after hydration, behind two dynamic imports (needle.tsx's mount, ~:1035-1050): on a busy dev
 * server it can land after the 3 s read, so one capture has it and the next does not. A Sell cell's first paint is the
 * one read it does not precede (servedSellOf opens its page without open()): every script is held there, so no Needle can
 * mount, and that capture reads no overlays.
 */
const SETTLE = ["needle-rest"];

const BASE = process.env.KP_BASE ?? "http://localhost:3041";
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local dev only, addressed as http://localhost:PORT. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const health = await (async () => {
  const res = await fetch(`${BASE}/api/health`).catch(() => null);
  return res ? await res.json().catch(() => null) : null;
})();
if (!health || health.database?.configured !== false) {
  console.error(`REFUSED — the server at ${BASE} reports a configured database (database.configured=${JSON.stringify(health?.database?.configured)}). This drive runs only against an in-memory dev server.`);
  process.exit(2);
}
const rollout = health.simpleJourney ?? null;
if (!rollout || typeof rollout.state !== "string" || rollout.state === "ACTIVE") {
  refuse(`/api/health says simpleJourney = ${JSON.stringify(rollout)}. This drive measures the CLASSIC shell, which a viewer without a pass is shown only while the rollout is not ACTIVE.`);
}

// ── the tree the server runs, and its base (A18) ──────────────────────────────────────────────────────────
const TREE = process.env.KP_TREE ?? fileURLToPath(new URL("..", import.meta.url));
const MAIN = process.env.KP_PARITY_MAIN ?? "origin/main";
/**
 * ⭐ THE EMAIL BAR, AND THE OWNER'S RULING OF 2026-10-07 (NEXT-PLAN ▶ 0e, money doors): a deposit asks no email question,
 * and the app-wide email bar is DELETED (`src/components/layout/email-verify-banner.tsx` goes). The tree the server runs
 * says which world a capture is in. With the bar's component there (every tree before that change, the pre-S6 v2
 * baseline's included), 2.9 holds the old rule: the unconfirmed email sees the bar on /, the player does not. With it
 * gone, 2.9 holds that NO viewer sees one, in any cell. A compare across the change reports the unconfirmed email's cells
 * losing their bar as a difference, named by its commit in §0's served-commit list (another lane's, like the helpline
 * link's): it is not one of S6's EXPECTED_DIFFS.
 */
const EMAIL_BAR_GONE = !existsSync(join(TREE, "src/components/layout/email-verify-banner.tsx"));
/** What the server SERVES: a change under any of these is in the capture whether or not it is committed. */
const SERVED = ["src", "public", "next.config.ts", "tailwind.config.ts", "postcss.config.mjs", "package.json", "package-lock.json"];
// --no-optional-locks: a status or a diff never takes index.lock, so these reads cannot collide with a battery on the tree.
const git = (...args) => {
  const r = spawnSync("git", ["--no-optional-locks", "-C", TREE, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return { code: r.status ?? -1, out: (r.stdout ?? "").trimEnd(), err: (r.stderr ?? "").trim() || (r.error ? msg(r.error) : "") };
};
const HEAD = git("rev-parse", "HEAD");
if (HEAD.code !== 0) refuse(`${TREE} is not a git checkout (${HEAD.err}). A baseline must name the commit it was captured from (S6-PLAN A18); point KP_TREE at the checkout the server runs.`);
const FORK = git("merge-base", "HEAD", MAIN);
const DIRTY = git("status", "--porcelain", "--", ...SERVED).out.split(NL).filter(Boolean);

/**
 * The served files as one hash: HEAD, every uncommitted change under SERVED, and every untracked served file. Taken at
 * the start and after every viewer and language, because red harnesses plant defects in src and restore them — one
 * that runs during a capture would otherwise be recorded as the product, under a clean commit.
 */
function treePrint() {
  const h = createHash("sha1");
  h.update(git("rev-parse", "HEAD").out);
  h.update(git("diff", "HEAD", "--no-ext-diff", "--binary", "--", ...SERVED).out);
  for (const f of git("ls-files", "--others", "--exclude-standard", "--", ...SERVED).out.split(NL).filter(Boolean)) {
    h.update(f);
    try { h.update(readFileSync(join(TREE, f))); } catch { h.update("(unreadable)"); }
  }
  return h.digest("hex");
}
const PRINT0 = treePrint();

/**
 * Why this tree cannot be compared with a baseline captured at `sha`, or null when it can. A rebase leaves the baseline
 * off HEAD's history; a merge carries other lanes' served files in. This lane's own pushes to main move the fork point
 * past the baseline and change nothing that is served, so the fork point is reported in §0, never refused on.
 */
function baseRefusal(sha) {
  if (!/^[0-9a-f]{40}$/.test(String(sha))) return `the baseline names no commit (${JSON.stringify(sha)})`;
  if (git("cat-file", "-e", `${sha}^{commit}`).code !== 0) return `commit ${short(sha)} is not in this repository`;
  if (git("merge-base", "--is-ancestor", sha, "HEAD").code !== 0) return `${short(sha)} is not an ancestor of HEAD ${short(HEAD.out)} — the branch was rebased, or this is another branch`;
  const merges = git("rev-list", "--first-parent", "--merges", `${sha}..HEAD`);
  if (merges.code !== 0) return `cannot list the merges since ${short(sha)} (${merges.err})`;
  const brought = [];
  for (const m of merges.out.split(NL).filter(Boolean)) {
    const files = git("diff", "--name-only", `${m}^1`, m, "--", ...SERVED);
    if (files.code !== 0) return `cannot read merge ${short(m)} (${files.err})`;
    const list = files.out.split(NL).filter(Boolean);
    if (list.length) brought.push(`${short(m)} brought ${list.length} served file(s): ${list.slice(0, 3).join(", ")}${list.length > 3 ? " …" : ""}`);
  }
  if (brought.length) return `${brought.length} merge(s) since the baseline carried served files in from elsewhere — ${brought.join("; ")}`;
  return null;
}

const KIND = "kp-classic-shell-parity";
const VERSION = 4;   // 4 · S8 WP1: the matrix gained the question page (S8-PLAN WP1), so a v3 baseline cannot be compared — capture a new one (3 · S7 WP1: the book, A8; 2 · S6 WP10: the Sell capture)
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
/**
 * ⭐ S7 WP1 · THE BOOK (S7-PLAN WP1 steps 2-3, A8): a classic reader's page bodies, over a book that reaches every classic
 * card state S7 touches. Taken AFTER the matrix and the Sell capture, so the demo portfolio the matrix reads is still
 * empty and the Sell capture still seeds { markets: 5 } on seed-real-markets' six questions. A cell is keyed
 * `book-<viewer>|locale|width|route`, the question page as ":similar" — each server mints its own ids.
 */
const BOOK_ROUTES = ["/", "/markets", "/live", "/results", "/watchlist", "/markets/:similar"];
// The full seeded book fills the actual board: landing-hero renders one featured card and hero.ts's row budget.
// The preserved ff8c/947c captures independently show this one-plus-seven population, not a guessed date count.
const HOME_BOARD_SIZE = Number(/^export const QUESTION_BOARD_SIZE = ([1-9][0-9]*);$/m.exec(readFileSync(join(TREE, "src/lib/markets/hero.ts"), "utf8"))?.[1]);
if (!Number.isInteger(HOME_BOARD_SIZE)) refuse("hero.ts names no literal positive QUESTION_BOARD_SIZE for the home close-date population");
const HOME_CLOSE_POPULATION = { featured: 1, rows: HOME_BOARD_SIZE };
const BOOK = {
  viewers: ["guest", "player"],
  locales: LOCALES,
  widths: [360, 1280],
  routes: BOOK_ROUTES,
  /** The LIVE strip's routes (TICKER_ROUTES, lib/markets/ticker.ts): each lobby cell captures the strip beside <main>. */
  lobby: ["/", "/markets", "/live", "/results"],
  /** Edge-protected (proxy.ts PROTECTED_PREFIXES): the player's only. */
  playerOnly: ["/watchlist"],
  /** The question page of the book's first question (marketIds[0]): its cell captures the similar rail. */
  similar: BOOK_ROUTES[5],
  /** The route whose head is read from the bytes (WP2's metadata must survive). */
  head: "/",
  /** seed-player-portfolio's { markets }: twelve, so its plan reaches WIN, LOSS and VOID (A8). */
  markets: 12,
  /** The book's normalisers this run (BOOK_NORMALISERS): a baseline records them, and a compare must use the same. */
  normalise: BOOK_NORMALISE,
  /** How a book cell is read (BOOK_SETTLE): a baseline records it, and a compare must read the same way. */
  settle: BOOK_SETTLE,
  homeCloseDates: { ...BOOK_HOME_CLOSE_DATE, population: HOME_CLOSE_POPULATION },
};
/** The book's text normalisers switched on for this run, in BOOK_NORMALISERS' order. */
const BOOK_TEXT = BOOK_NORMALISERS.filter((n) => n.kind === "text" && BOOK.normalise.includes(n.id));
/** Every book cell in capture order, as [key, viewer, locale, width, route]: /watchlist for the player only. */
function bookCellKeys() {
  const out = [];
  for (const v of BOOK.viewers) for (const l of BOOK.locales) for (const w of BOOK.widths) for (const r of BOOK.routes) {
    if (BOOK.playerOnly.includes(r) && v !== "player") continue;
    out.push([keyOf(`book-${v}`, l, w, r), v, l, w, r]);
  }
  return out;
}
/**
 * ⭐ S8 WP1 · THE QUESTION PHASE (S8-PLAN WP1 steps 2-3; A15, A17 item 5, A24): the question page's classic body, in every
 * classic state S8's ternaries stand beside. Taken AFTER the book (it reads the book's world: the Sell capture's held
 * question, seed-watchlist's forced progress row, the guest's /markets by card state), so the matrix, the Sell cells and
 * the book are captured exactly as v3 captured them. A cell is keyed `question-<viewer>|locale|width|route`, its route
 * written with the state's placeholder (each server mints its own ids). The reader on a break is a viewer of its own
 * (`break`): the demo player after a cooling-off taken through the real form, captured last.
 */
const QUESTION_PANEL = 'aside[aria-labelledby="bet-panel-heading"]';
/** The holder section ("Your positions", app/markets/[id]/page.tsx): the content column's one elevated section, a session's only. */
const QUESTION_HOLDER = "section.order-2 > section.bg-bg-elevated";
/** Each state's route (its placeholder names the question), and who reads it. The guest takes the open, one-sided,
 *  selection-closed and settled questions (WP1 step 3); the holder's question is the open one (the demo player holds YES
 *  on it: seed-player-portfolio's plan gives marketIds[0] YES), read bare, at ?side=YES and at ?side=NO (the hedge). */
const QUESTION_STATES = [
  { id: "open", route: "/markets/:open", viewers: ["guest", "player"] },
  { id: "open-yes", route: "/markets/:open?side=YES", viewers: ["player"] },
  { id: "open-no", route: "/markets/:open?side=NO", viewers: ["player"] },
  { id: "one-sided", route: "/markets/:one-sided", viewers: ["guest", "player"] },
  { id: "empty", route: "/markets/:empty", viewers: ["player"] },
  { id: "selection-closed", route: "/markets/:selection-closed", viewers: ["guest", "player"] },
  { id: "time-closed", route: "/markets/:time-closed", viewers: ["player"] },
  { id: "settled", route: "/markets/:settled", viewers: ["guest", "player"] },
  { id: "break-open", route: "/markets/:open", viewers: ["break"] },
  { id: "break-empty", route: "/markets/:empty", viewers: ["break"] },
];
/**
 * ⭐ S8 WP1 · THE QUESTION PAGE'S MASKS, NAMED BEFORE THE FIRST NULL PAIR (S8-PLAN A17 item 5). Each acts on every region
 * of a question cell, inside the page before any snapshot is compared with the next (so a ticking clock cannot keep a
 * cell from settling), and counts what it masked in every cell (Q.6). A text mask writes its `text` for the element's
 * whole text; an `inside` mask keeps the element's own box and style and reads nothing inside it. `seen` says whether the
 * classic question page draws it in this phase: a mask that is seen must mask something somewhere (Q.6), and one that is
 * not reports its count and is never failed on it. The server-rendered times are the fifth: text, not an element, read
 * through the book's eat-dates (on for these cells whatever the book's switch says) and `norm`'s datetime and ago rules.
 */
const QUESTION_MASKS = [
  { id: "timer-text", selector: '[role="timer"]', text: "~", seen: false,
    what: "every [role=timer] text (A17 item 5): at this base only the journey Sell look's grace clock (sell-button.tsx) carries the role, and the classic page draws none; named so a classic one added later is masked, not failed" },
  { id: "countdown-clock", selector: 'div[class~="text-[28px]"][class~="tabular-nums"]', text: "~", seen: true,
    what: "the question's countdown (countdown.tsx Cell: the selection close and the result clocks, [id]/page.tsx's '3b. Countdown'), four digit cells each that tick every second; ⚠️ the plan names them [role=timer] (S8-PLAN A17 item 5), but at this base Countdown's cells carry no role" },
  { id: "sell-countdown", selector: 'div[class~="mb-1.5"] > span[class~="tabular-nums"]', text: "m:ss", seen: false,
    what: "the Sell button's free-window clock in a holder row (sell-button.tsx's strip), read as m:ss as the Sell capture reads it; the phase waits the held tickets' free windows out first, so no cell should draw one" },
  { id: "chart-time-axis", selector: "div.tv-lightweight-charts tr:last-child", inside: true, seen: true,
    what: "the probability chart's time axis (market-curve.tsx, lightweight-charts: the table's last row, its canvases): its box and style are read, nothing inside it" },
  { id: "break-end-clock", selector: QUESTION_BREAK_CLOCK.selector, text: QUESTION_BREAK_CLOCK.text, only: QUESTION_BREAK_CLOCK.pattern, canonical: true, seen: true,
    what: "A17 server-rendered times, calibrated from the ff8c null pair: only full EAT date leaves in market-bet-break / market-break use one same-format time before geometry; their words, element, attributes and paint stay compared" },
];
/** The server-rendered times (the fifth mask): eat-dates, always on for a question cell (idempotent beside the book's). */
const EAT_DATES = BOOK_NORMALISERS.find((n) => n.id === "eat-dates");
const QUESTION = {
  viewers: ["guest", "player", "break"],
  locales: LOCALES,
  widths: [360, 1280],
  states: QUESTION_STATES,
  panel: QUESTION_PANEL,
  holder: QUESTION_HOLDER,
  masks: [...QUESTION_MASKS.map((m) => m.id), "server-times", "jsonld-event-times"],
  /** The book's normalisers, which the question's cells use too (their similar rails are book cards). */
  normalise: BOOK_NORMALISE,
  settle: [...BOOK_SETTLE, "question-chart-resize", "break-end-clock-geometry"],
};
/** Every question cell in capture order, as [key, viewer, locale, width, state]: the guest's, the player's, then the break's. */
function questionCellKeys() {
  const out = [];
  for (const v of QUESTION.viewers) for (const l of QUESTION.locales) for (const w of QUESTION.widths) for (const s of QUESTION.states) {
    if (!s.viewers.includes(v)) continue;
    out.push([keyOf(`question-${v}`, l, w, s.route), v, l, w, s]);
  }
  return out;
}
/** A state's route with its question's id in place of the placeholder (`ids` maps placeholder → id). */
const routeOfQuestion = (route, ids) => route.replace(/:([a-z-]+)/, (m, name) => ids?.[name] ?? m);
const MATRIX = { viewers: VIEWERS.map((v) => v.id), locales: LOCALES, widths: WIDTHS, routes: ROUTES, body: BODY_ROUTE, height: HEIGHT, sell: SELL, book: BOOK, question: QUESTION, settle: SETTLE };
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
  {
    id: "positions-h1-stem-sw",
    field: "regions.main.html",
    routes: [BODY_ROUTE],
    replace: [['<h1 class="font-display text-title-lg', '<h1 data-stem="" class="font-display text-title-lg']],
    cells: VIEWERS.filter((v) => v.door).length * WIDTHS.length,
    reason: "The visual pass's round 7 (R7-C, 2026-10-10; VODACOM-PLAN §0): a display heading that opens on a straight-stem capital (B D E F H I K L M N P R U) is set back by the stem's bearing so its ink starts on the column's edge in every language (lib/display-stem.ts; the rule is a text-indent in globals.css keyed on data-stem). The classic /positions title is a PageHeader title; in Swahili it opens on \"U\" (\"Utabiri wako\"), so its <h1> gains data-stem=\"\" in the 12 Swahili cells (the 3 signed-in viewers at 4 widths). Measured by the first compare at the live main before round 7 (b79f0d72 → c706c7c6, 2026-10-10): this attribute is the ONLY difference in all 224 cells, and every layout line is equal (the set-back moves the ink, not the box). English opens on a letter outside the list and is unchanged.",
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

/**
 * ⭐ S7 WP1 · THE NAMED DIFFERENCES FOR THE BOOK'S CELLS — none. S7 changes nothing a classic reader is served (its
 * binding promise), so a compare of the book with WP1's v3 baseline must find no difference at all. A change made on
 * purpose for every player is named here as the matrix's are — its field, routes, `cells` and reason, matched by
 * diffCells and held by §4.9 to all of its cells or none — and listed in VODACOM-PLAN §0j. ⛔ Never a wildcard and never
 * a re-baseline (A3).
 */
const BOOK_EXPECTED_DIFFS = [];
/**
 * ⭐ S8 WP1 · THE DIFFERENCES S8 MAKES ON PURPOSE IN A CLASSIC READER'S QUESTION PAGE — none is planned (S8-PLAN, the
 * Summary's "Why a classic visitor's served markup does not change"), so this list starts empty. Any entry S8 adds is named
 * as the book's are — its field, routes, `cells` and reason, matched by diffCells and held by §4.12 to all of its cells or
 * none — and listed in VODACOM-PLAN §0k. ⛔ Never a wildcard and never a re-baseline.
 */
const QUESTION_EXPECTED_DIFFS = [];
/**
 * ⭐ PHOSPHOR-MIGRATION W2 · THE GLYPH SWAP, NAMED (Ali: "Switch to Phosphor", "Now, players see it" — every change named
 * here, docs/PHOSPHOR-MIGRATION.md §5 W2). Every family glyph a classic viewer is served is drawn by Phosphor now, so
 * every region that holds one changes on purpose: its glyphs' markup and the lines they draw. The entries are GENERATED
 * from the first compare against the baseline the swap lands on — measured, never predicted — by
 * scripts/glyphs/parity-entries.mjs, one per field of each list, each an exact element-by-element map (`glyphs`,
 * applyGlyphSwap) with its `cells`; a layout entry is `alongside` its region's markup entry. A region whose difference is
 * not wholly its glyphs' gets no entry, and stays a failure.
 */
import { GLYPH_SWAP } from "./qa-parity-glyph-swap.generated.mjs";
EXPECTED_DIFFS.push(...GLYPH_SWAP.matrix);
SELL_EXPECTED_DIFFS.push(...GLYPH_SWAP.sell);
BOOK_EXPECTED_DIFFS.push(...GLYPH_SWAP.book);
QUESTION_EXPECTED_DIFFS.push(...GLYPH_SWAP.question);

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
/** ⭐ S8 WP1 · …and since v4 S8's sheet attribute, `data-sheet` (WP7a puts it on a journey card): matched whole, so the classic
 *  filter sheet's `data-sheet-open` (filter-sheet.tsx; globals.css) is not it (S8-PLAN A22 item 6). P.8w holds the three. */
const RAW_TRACE = /(?:data-testid|testId)(?:=|\\":)\\?"journey-[\w-]*|\bdata-journey(?![\w-])|\bdata-sheet(?![\w-])/g;
const rawOf = (body) => (typeof body !== "string" ? null : {
  shell: body.includes("app-topbar"),
  trace: [...new Set((body.match(RAW_TRACE) ?? []).map((m) => (m.includes("journey-") ? `testid:${m.slice(m.indexOf("journey-"))}` : m.startsWith("data-sheet") ? "data-sheet" : "data-journey")))].sort(),
});
/**
 * ⭐ S7 WP1 · A8 item 3 — THE LIVE TRACE SEES S7'S CLASS NAMES. The trace in the page (SNAPSHOT's `journey`, in every cell
 * of every capture) asks for S6's journey test ids, its flag and any class holding "journey" — and since S7 WP1 for S7's
 * journey parts too: the card (kp-jcard), the home (kp-jhome), and the How-to card and sheet (kp-jhowto, kp-howto). Its
 * class report names each class holding one of these parts, so such an element reads `class:kp-jcard`, never a bare
 * `class:`. None of the four occurs in src/ before S7 builds it, so the trace stays empty on a classic page (2.4, 3.4, S.3,
 * B.6). RAW_TRACE above already reads any journey-* test id in the bytes. P.8t holds the selector and the report to S7's
 * names and to no classic class.
 * ⭐ S8 WP1 (S8-PLAN WP1 step 4) — and S8's: the bet sheet (kp-bsheet), the question page's two big buttons (kp-jbet) and
 * its loading picture (kp-qghost). None occurs in src/ before S8 builds it, so a classic page still draws none (2.4, 3.4,
 * S.3, B.6, Q.4); P.8t is re-pinned to all eight parts in the open.
 */
const JOURNEY_CLASS_PARTS = ["journey", "kp-jcard", "kp-jhome", "kp-jhowto", "kp-howto", "kp-bsheet", "kp-jbet", "kp-qghost"];
const TRACE = {
  selector: ['[data-testid^="journey-"]', "[data-journey]", ...JOURNEY_CLASS_PARTS.map((p) => `[class*="${p}"]`)].join(","),
  parts: JOURNEY_CLASS_PARTS,
};
/**
 * ⭐ S7 WP1 · /'s HEAD, READ FROM THE BYTES THE SERVER SENT (WP1 step 3: WP2's metadata must survive): the canonical link
 * and every og:* meta, one line each in document order — "canonical <href>", "<property> <content>". Attributes may come
 * in any order, and a tag Next streams into the body is read where it stands; twitter:* is not an og: tag, and neither a
 * script (the RSC payload carries its own copy of the metadata) nor a comment is ever read. Null when the bytes were not.
 */
function headOf(body) {
  if (typeof body !== "string") return null;
  const markup = body.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const lines = [];
  for (const m of markup.matchAll(/<(meta|link)\b([^>]*)>/gi)) {
    const attrs = Object.fromEntries([...m[2].matchAll(/([^\s=/"'>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)]
      .map((a) => [a[1].toLowerCase(), a[2] ?? a[3] ?? a[4] ?? ""]));
    if (m[1].toLowerCase() === "link") {
      if (/(?:^|\s)canonical(?:\s|$)/i.test(attrs.rel ?? "")) lines.push(`canonical ${attrs.href ?? ""}`);
      continue;
    }
    const key = attrs.property ?? attrs.name ?? "";
    if (key.startsWith("og:")) lines.push(`${key} ${attrs.content ?? ""}`);
  }
  return lines.join(NL);
}
/**
 * ⭐ S7 WP1 · THE CLASSIC CARD'S STATE, READ FROM ITS CLASSES (market-card.tsx). The page hands over each card's facts —
 * its row id (`data-row-id`), the class of its price slot (`.mcardp-prob .mcardp-pct`) and which of CARD_MARKS it holds —
 * and cardStateOf names the state: a result in the slot (`.mcardp-pctcap--result`) is void (`mcardp-pct--void`), resolved
 * NO (`mcardp-pct--no`) or resolved YES (the slot's own ink); a card that is not live and states no result is selection
 * closed (the single pill where the pair stood, `.mcardp-actions--single`); a live card with money on one side only says
 * so (`.mcardp-oneside`); a live card with no pool shows the em-dash (`mcardp-pct--empty`); any other live card is priced.
 * ⚠️ The classes cannot tell a selection-closed card from a CLOSED or DRAFT one (the same royal pill and single action);
 * the book seeds selection-closed ones only (seed-watchlist's progress row). B.7 counts the states over the book's cells.
 */
const CARD_MARKS = ["mcardp-pctcap--result", "mcardp-actions--single", "mcardp-oneside"];
const CARD_STATES = ["priced", "one-sided", "empty", "closed", "resolved-yes", "resolved-no", "void"];
const CARD_LABELS = { priced: "live priced", "one-sided": "one-sided", empty: "empty pool", closed: "selection closed", "resolved-yes": "resolved YES", "resolved-no": "resolved NO", void: "void", other: "other" };
function cardStateOf(card) {
  const pct = String(card?.pct ?? "");
  const marks = Array.isArray(card?.marks) ? card.marks : [];
  if (!/(?:^|\s)mcardp-pct(?:\s|$)/.test(pct)) return "other";
  if (marks.includes("mcardp-pctcap--result")) {
    return pct.includes("mcardp-pct--void") ? "void"
      : pct.includes("mcardp-pct--no") ? "resolved-no" : "resolved-yes";
  }
  if (marks.includes("mcardp-actions--single")) return "closed";
  if (marks.includes("mcardp-oneside")) return "one-sided";
  return pct.includes("mcardp-pct--empty") ? "empty" : "priced";
}
/**
 * ⭐ S7 WP1 · THE LIVE STRIP, READ STILL (the first calibration's finding). Its run is a CSS marquee (`.ticker-track`, a
 * 70 s loop): two captures of one book cell on one server disagreed in 60 of the strip's 73 element lines, its items a
 * few px apart, and that noise sat outside every plant's own field. So every book cell reads the strip in the product's
 * OWN still state — the readable list at scroll 0, which is the marquee's first frame and what the server paints before
 * the client decides (live-ticker.tsx; globals.css `.ticker-strip[data-still]`) — by the same three rules, written for
 * any strip: a style in the document head, outside every captured region, added once the page has hydrated.
 */
const STRIP_STILL = [
  ".ticker-strip .ticker-track { animation: none !important; transform: none !important; }",
  ".ticker-strip .ticker-viewport { overflow-x: auto !important; overscroll-behavior-x: contain !important; scrollbar-width: thin !important; }",
  ".ticker-strip .ticker-copy-dup { display: none !important; }",
].join(NL);
/** The question page's similar rail (app/markets/[id]/page.tsx). */
const SIMILAR_RAIL = 'section[aria-labelledby="similar-markets-heading"]';
/** S7 WP1 · what SNAPSHOT is asked for a book cell: the route's regions and cards, and chart-paths' selector only when on;
 *  and, only while tied-cards is on, its terms (`tied`), which captureBookCell runs as UNTIE_CARDS before every snapshot. */
const bookArgsOf = (route) => ({
  crest: CREST, props: PROPS, animated: ANIMATED, notFound: false, pageBody: false, trace: TRACE,
  book: {
    regions: route === BOOK.similar ? { similar: SIMILAR_RAIL } : { main: "#main-content", ...(BOOK.lobby.includes(route) ? { ticker: "div.ticker-strip" } : {}) },
    cards: route === BOOK.similar ? `${SIMILAR_RAIL} article.mcardp` : "#main-content article.mcardp",
    marks: CARD_MARKS,
    chart: BOOK.normalise.includes("chart-paths") ? CHART_SVGS : null,
    chartAttrs: CHART_ATTRS,
    tied: BOOK.normalise.includes("tied-cards") ? TIED_CARDS : null,
  },
});

/**
 * ⭐ S7 WP1 calibration 2 · tied-cards, RUN IN THE PAGE: while it is on, captureBookCell hands it a book cell's regions and
 * tied-cards' terms (`book.tied`) before every snapshot, so every region — markup, boxes and styles — is read in its
 * order. In each parent, a run of market surfaces (`surface`) that stand side by side, each the very next node after the
 * one before it, is cut into stretches that state the same figures: the same kind of surface, and every `part` in it but
 * `except`, by name and by text, in order. Each stretch of two or more is put in its titles' order (code points; equal
 * titles keep their places) — the stretched link's aria-label (`link`), else the text of the question (`title`) — back
 * into the stretch's own place. A surface that states any figure differently from its neighbour starts a stretch of its
 * own, so it never moves, and nothing inside a surface is ever touched. Self-contained: Playwright serialises it, so it
 * may close over nothing. Given `roots` (--prove-red P.8o's synthetic trees) it reads only those, and it uses no DOM but
 * childNodes, nodeType, getAttribute, textContent, nextSibling and insertBefore. Returns how many surfaces it moved.
 */
const UNTIE_CARDS = ({ regions, surface, part, except, link, title }, roots = null) => {
  const tops = roots ?? regions.flatMap((s) => [...document.querySelectorAll(s)]);
  const kids = (n) => [...n.childNodes].filter((c) => c.nodeType === 1);
  const classed = (el, names) => String(el.getAttribute("class") ?? "").split(/\s+/).some((c) => names.includes(c));
  const within = (el, pick) => kids(el).flatMap((c) => [...(pick(c) ? [c] : []), ...within(c, pick)]);
  const figures = (el) => [el.getAttribute(surface), ...within(el, (e) => e.getAttribute(part) !== null && !except.includes(e.getAttribute(part)))
    .map((e) => `${e.getAttribute(part)}=${e.textContent}`)].join("\n");
  const titleOf = (el) => {
    const named = within(el, (e) => classed(e, [link]) && e.getAttribute("aria-label") !== null)[0];
    if (named) return named.getAttribute("aria-label");
    const q = within(el, (e) => classed(e, title))[0];
    return q ? q.textContent : "";
  };
  let moved = 0;
  const visit = (parent) => {
    const els = kids(parent);
    for (let i = 0; i < els.length;) {
      if (els[i].getAttribute(surface) === null) { i++; continue; }
      let j = i + 1;
      while (j < els.length && els[j].getAttribute(surface) !== null && els[j - 1].nextSibling === els[j]) j++;
      const run = els.slice(i, j).map((el) => ({ el, figures: figures(el), title: titleOf(el) }));
      for (let a = 0; a < run.length;) {
        let z = a + 1;
        while (z < run.length && run[z].figures === run[a].figures) z++;
        const stretch = run.slice(a, z);
        const ordered = [...stretch].sort((x, y) => (x.title < y.title ? -1 : x.title > y.title ? 1 : 0));
        if (ordered.some((s, k) => s !== stretch[k])) {
          const after = stretch[stretch.length - 1].el.nextSibling;
          for (const s of ordered) parent.insertBefore(s.el, after);
          moved += ordered.filter((s, k) => s !== stretch[k]).length;
        }
        a = z;
      }
      i = j;
    }
    for (const c of kids(parent)) if (c.getAttribute(surface) === null) visit(c);
  };
  for (const t of tops) visit(t);
  return moved;
};

/**
 * ⭐ S7 WP1 calibration 2 · BOOK_SETTLE's "lazy-images", RUN IN THE PAGE by captureBookCell once the page has opened and
 * before its first snapshot: every img[loading="lazy"] inside the cell's regions is told to load (loading="eager"), all
 * are awaited until `complete` for at most `ms` in all — never a hang: one that has not loaded by then is named, and its
 * box is read as the browser left it — and each is given its own loading attribute back before anything is serialised.
 * Self-contained (Playwright serialises it). Returns how many lazy images it found, and the src of each that did not load.
 */
const SETTLE_LAZY = async ({ regions, ms }) => {
  const imgs = [...new Set(regions.flatMap((s) => [...document.querySelectorAll(s)]).flatMap((r) => [...r.querySelectorAll('img[loading="lazy"]')]))];
  const was = imgs.map((img) => img.getAttribute("loading"));
  for (const img of imgs) img.setAttribute("loading", "eager");
  const until = Date.now() + ms;
  while (imgs.some((img) => !img.complete) && Date.now() < until) await new Promise((go) => setTimeout(go, 50));
  const unloaded = imgs.filter((img) => !img.complete).map((img) => img.getAttribute("src") ?? "");
  imgs.forEach((img, i) => img.setAttribute("loading", was[i]));
  return { lazy: imgs.length, unloaded };
};

/**
 * Runs IN THE PAGE. Self-contained: Playwright serialises it, so it may close over nothing. `trace` is TRACE (S7 WP1, A8
 * item 3: every caller hands it in). `book` (S7 WP1) is set for a book cell only: the regions it names replace the
 * shell's, the overlay census is skipped, its classic cards' facts are read (cardStateOf names their states), and
 * `book.chart` — chart-paths' selector, null unless that normaliser is on — reads a chart's shapes as "~" (`book.tied`
 * is not read here: captureBookCell runs UNTIE_CARDS with it before each snapshot). Without `book`, every capture is as
 * it was.
 */
const SNAPSHOT = ({ crest, props, animated, notFound, pageBody, sell, confirm, trace, book }) => {
  const r2 = (n) => Math.round(n * 2) / 2;
  const chart = book ? book.chart : null;
  // S8 WP1 · a question cell's masks (QUESTION_MASKS), and the regions stubbed inside its <main> (`book.stubs`, for the
  // region named `book.stubbed`): each stub is read as one element line, its box and style, and nothing inside it.
  const masks = book?.masks ?? [];
  const inside = (el) => masks.some((m) => m.inside && el.matches(m.selector));
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
  const region = (els, stubs = null) => {
    const root = els[0];
    if (!root) return { count: 0, html: null, lines: null };
    const stubOf = (el) => (stubs && el !== root ? Object.entries(stubs).find(([, s]) => el.matches(s))?.[0] ?? null : null);
    const box = root.getBoundingClientRect();
    const lines = [];
    const walk = (el, path) => {
      const moving = typeof el.getAnimations === "function" && el.getAnimations().some((a) => a.playState === "running");
      const r = el.getBoundingClientRect();
      // An unrendered element (an svg <defs> child, display:none) reports a 0x0 box at PAGE coordinates, so its offset from
      // the region moves whenever anything above the region grows — a position that means nothing. Record its size only.
      // S7 WP1 · inside a chart's svg (chart-paths, when on) a shape's box is its data's.
      const geo = moving || (chart && !el.matches(chart) && el.closest(chart)) ? "~" : r.width === 0 && r.height === 0 ? "0x0" : `${r2(r.left - box.left)},${r2(r.top - box.top)},${r2(r.width)}x${r2(r.height)}`;
      lines.push([path, geo, sigOf(el, moving)]);
      if (el.matches(crest) || stubOf(el) || inside(el)) return;
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
    if (chart) for (const s of clone.querySelectorAll(chart)) for (const d of s.querySelectorAll("*")) for (const a of book.chartAttrs) if (d.hasAttribute(a)) d.setAttribute(a, "~");
    // S8 WP1 · a stubbed region stands in its place as <parity-region data-parity="<name>">; a mask writes its text, or
    // (an `inside` mask) keeps the element and drops what is in it.
    if (stubs) for (const [name, sel] of Object.entries(stubs)) for (const x of [...clone.querySelectorAll(sel)]) {
      const stub = document.createElement("parity-region");
      stub.setAttribute("data-parity", name);
      x.replaceWith(stub);
    }
    for (const m of masks) for (const x of clone.querySelectorAll(m.selector)) {
      if (m.only && (x.childElementCount !== 0 || (m.canonical ? x.textContent !== m.text : !new RegExp(m.only).test(x.textContent)))) continue;
      if (m.inside) x.replaceChildren(); else x.textContent = m.text;
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
    regions: book
      ? Object.fromEntries(Object.entries(book.regions).map(([name, selector]) => [name, region([...document.querySelectorAll(selector)], name === book.stubbed ? book.stubs : null)]))
      : {
          header: region([...document.querySelectorAll("header.app-topbar")]),
          rail: region([...document.querySelectorAll("nav.kp-rail")]),
          footer: region(footers),
          emailBar: region([...document.querySelectorAll('[data-testid="email-verify-banner"]')]),
          ...(pageBody ? { main: region([...document.querySelectorAll("#main-content")]) } : {}),
        },
    overlays: book ? [] : overlays(),
    ...(sell ? { sell: sellOf(sell) } : {}),
    ...(confirm ? { confirm: confirmOf() } : {}),
    footerPaddingBottom: footers[0] ? getComputedStyle(footers[0]).paddingBottom : null,
    scrollPaddingBottom: getComputedStyle(document.documentElement).scrollPaddingBottom,
    // The whole document, html included: a journey test id, the flag JourneyFlag sets, or a journey class — S6's, and
    // since S7 WP1 S7's (TRACE, A8 item 3), each class that holds one of their parts named in the report.
    journey: [...document.querySelectorAll(trace.selector)].map((e) => {
      const id = e.getAttribute("data-testid") ?? "";
      if (id.startsWith("journey-")) return `testid:${id}`;
      if (e.hasAttribute("data-journey")) return `${e.tagName.toLowerCase()}[data-journey]`;
      return `class:${[...e.classList].filter((c) => trace.parts.some((p) => c.includes(p))).join(".")}`;
    }).sort(),
    // S7 WP1 · a book cell's classic cards, each by its facts (cardStateOf reads them in Node).
    // S8 WP1 · how many elements each question mask masked in the page's <main> (Q.6).
    ...(masks.length ? { masked: Object.fromEntries(masks.map((m) => [m.id, [...document.querySelectorAll(m.selector)].filter((e) => !!e.closest("#main-content") && (!m.only || e.childElementCount === 0 && (m.canonical ? e.textContent === m.text : new RegExp(m.only).test(e.textContent)))).length])) } : {}),
    ...(book ? { cards: [...document.querySelectorAll(book.cards)].map((a) => ({
      id: a.getAttribute("data-row-id") ?? "",
      // S8 WP1 · the card's title (its stretched link's name): seedQuestions picks a state's question by it.
      title: a.querySelector(".mcardp-open")?.getAttribute("aria-label") ?? "",
      pct: a.querySelector(".mcardp-prob .mcardp-pct")?.getAttribute("class") ?? "",
      marks: book.marks.filter((m) => !!a.querySelector(`.${m}`)),
    })) } : {}),
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
const norm = (s) => maskPositionCountdown(s)
  .replace(/_[Rr]_[0-9A-Za-z]+_/g, "_id_")
  .replace(/«[Rr][0-9A-Za-z]*»/g, "_id_")
  .replace(/https?:\/\/localhost(?::\d+)?/g, "http://localhost")
  .replace(/\/_next\/static\/[^"'\s)&]+/g, "/_next/static/~")
  .replace(/%2F_next%2Fstatic%2F[^"'\s)&]+/g, "%2F_next%2Fstatic%2F~")
  // PHOSPHOR-MIGRATION W2 · a glyph's sprite is content-hashed — an asset hash, as a chunk's is — so its name reads
  // /icons/g/<group>.~.svg; the symbol after # is the fact and stays compared (which drawing ships under that symbol is
  // test:glyph-sync's, byte for byte against the pinned package). P.1b proves it.
  .replace(/\/icons\/g\/(app|admin)\.[0-9a-f]{8}\.svg#/g, "/icons/g/$1.~.svg#")
  .replace(/([?&](?:amp;)?)dpl=[^"'&\s]*/g, "$1dpl=~")
  .replace(/\b(usr|wal|kyc|txn|pos)_[A-Za-z0-9_-]{6,}/g, "$1_~")
  .replace(/datetime="[^"]*"/g, 'datetime="~"')
  .replace(/\b\d+\s*(?:s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?)\s+ago\b/gi, "~ ago")
  .replace(/\b(?:sekunde|dakika|saa|siku)\s+\d+\s+(?:zilizopita|iliyopita)\b/gi, "~ zilizopita");
/** S7 WP1 · a book cell's text: `norm`, then each book normaliser switched on (BOOK_TEXT), in BOOK_NORMALISERS' order. */
const bookNorm = (s) => BOOK_TEXT.reduce((t, n) => n.apply(t), norm(s));

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
/** S7 WP1 · a book cell from its snapshot: each region as toCell records one, under bookNorm, and each card by its state. */
function toBookCell(snap, extra) {
  const regions = {};
  for (const [name, r] of Object.entries(snap.regions)) {
    regions[name] = r.count === 0 ? { count: 0, html: null, layout: null } : {
      count: r.count,
      html: put(bookNorm(r.html)),
      layout: put(r.lines.map(([path, geo, sig]) => `${path} ${geo} ${put(bookNorm(sig))}`).join(NL)),
    };
  }
  return { ...extra, landed: snap.url, regions, journey: snap.journey, cards: (snap.cards ?? []).map((c) => ({ id: c.id, state: cardStateOf(c) })) };
}
/** S8 WP1 · a question cell's text: the book's (bookNorm), then the server-rendered times (eat-dates, always on here). */
// Fresh seeds name fresh instants in the question's inert Event JSON-LD. Only its top-level startDate/endDate are
// masked; the visible page, event words/shape/URLs and any nested dates remain compared byte for byte.
const questionNorm = (s) => maskQuestionEventTimes(EAT_DATES.apply(bookNorm(s))).html;
/** S8 WP1 · a question cell from its snapshot: each region as a book cell records one, under questionNorm, and the masks' counts. */
function toQuestionCell(snap, extra) {
  const regions = {};
  for (const [name, r] of Object.entries(snap.regions)) {
    regions[name] = r.count === 0 ? { count: 0, html: null, layout: null } : {
      count: r.count,
      html: put(questionNorm(r.html)),
      layout: put(r.lines.map(([path, geo, sig]) => `${path} ${geo} ${put(questionNorm(sig))}`).join(NL)),
    };
  }
  return { ...extra, landed: snap.url, regions, journey: snap.journey, masked: { ...snap.masked, "jsonld-event-times": maskQuestionEventTimes(snap.regions.main.html ?? "").fields } };
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
  // S7 WP1 · a book cell of / carries its head, read from the bytes (headOf); null when the bytes were not read.
  if ("head" in cell) f.head = cell.head ? store[cell.head] ?? `(missing blob ${cell.head})` : "(unread)";
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
/**
 * ⭐ PHOSPHOR-MIGRATION W2 · A GLYPH SWAP, NAMED ELEMENT BY ELEMENT. An entry with `glyphs` names exact transitions, as
 * `replace` does, but per element rather than per substring, so a few thousand of them stay linear: in a `.html` field
 * every top-level <svg>…</svg> whose whole markup is a key of `glyphs.svg` becomes its value; in a `.layout` field every
 * svg element's block of lines (its own line and its descendants') that is a key of `glyphs.block` becomes its value, and
 * every other line that is a key of `glyphs.line` becomes its value. Anything not named stays as it was, so the
 * baseline must then equal the capture exactly — a change the maps do not name is still caught (P.5y).
 */
/** Each top-level <svg>…</svg> of a markup, as [start, end] — a nested svg stays inside its parent's span. */
function svgSpans(text) {
  const spans = [];
  let at = 0;
  for (;;) {
    const open = text.indexOf("<svg", at);
    if (open < 0) break;
    let depth = 1, i = open + 4;
    while (depth > 0) {
      const o = text.indexOf("<svg", i), c = text.indexOf("</svg>", i);
      if (c < 0) break;
      if (o >= 0 && o < c) { depth++; i = o + 4; } else { depth--; i = c + 6; }
    }
    if (depth !== 0) break;
    spans.push([open, i]);
    at = i;
  }
  return spans;
}
function applyGlyphSwap(field, text, glyphs) {
  if (field.endsWith(".html")) {
    let out = "", at = 0;
    for (const [a, b] of svgSpans(text)) {
      const svg = text.slice(a, b);
      out += text.slice(at, a) + (Object.hasOwn(glyphs.svg ?? {}, svg) ? glyphs.svg[svg] : svg);
      at = b;
    }
    return out + text.slice(at);
  }
  if (field.endsWith(".layout")) {
    const lines = text.split(NL), out = [];
    for (let i = 0; i < lines.length; i++) {
      const path = lines[i].slice(0, lines[i].indexOf(" "));
      const last = path.slice(path.lastIndexOf(">") + 1);
      if (/^svg[0-9]+$/.test(last)) {
        let j = i + 1;
        while (j < lines.length && lines[j].startsWith(`${path}>`)) j++;
        const block = lines.slice(i, j).join(NL);
        if (Object.hasOwn(glyphs.block ?? {}, block)) { out.push(glyphs.block[block]); i = j - 1; continue; }
      }
      out.push(Object.hasOwn(glyphs.line ?? {}, lines[i]) ? glyphs.line[lines[i]] : lines[i]);
    }
    return out.join(NL);
  }
  return text;
}
/** Every field that differs, split into the named EXPECTED differences and everything else. */
function diffCells(route, base, cur, baseStore, curStore, list = EXPECTED_DIFFS) {
  const a = fieldsOf(base, baseStore), b = fieldsOf(cur, curStore);
  if (list === BOOK_EXPECTED_DIFFS && a["regions.main.layout"] && b["regions.main.layout"]) {
    a["regions.main.layout"] = steadyTimeLeftLayout(a["regions.main.layout"], a["regions.main.html"], baseStore);
    b["regions.main.layout"] = steadyTimeLeftLayout(b["regions.main.layout"], b["regions.main.html"], curStore);
  }
  const unexpected = [], expected = [];
  for (const field of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const was = a[field] ?? "(absent)", now = b[field] ?? "(absent)";
    if (was === now) continue;
    let left = was, hit = null;
    for (const e of list) {
      if (e.field !== field || (e.routes && !e.routes.includes(route))) continue;
      if ("from" in e && was === String(e.from) && now === String(e.to)) { hit = e; break; }
      if (e.replace) { left = e.replace.reduce((s, [x, y]) => s.split(x).join(y), was); if (left === now) { hit = e; break; } }
      if (e.glyphs) { left = applyGlyphSwap(field, was, e.glyphs); if (left === now) { hit = e; break; } }
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

// ── S7 WP1 · the book: A8's verdicts and §B, as pure functions so --prove-red can break each one ─────────────
/** A "Demo · " question is a fixture the player boards never list (isDemoMarket, market-service.ts). */
const DEMO_PREFIX = "Demo · ";
/** The LIVE non-demo questions a seed-markets reply names. */
const poolOf = (reply) => (Array.isArray(reply?.ids) ? reply.ids.filter((q) => typeof q?.titleEn === "string" && !q.titleEn.startsWith(DEMO_PREFIX)).length : 0);
/**
 * ⭐ A8 item 1 · THE BOOK'S THREE REPLIES, JUDGED. `problems` refuse the book (the baseline is INVALID); `recorded` are
 * the Up & Down refusals a round whose window closed between listing and buying leaves (seed-player-portfolio's
 * `updown …` lines), kept in the baseline and never failed; `pool` is what §0j records; the voided question is
 * marketIds[11] and the similar rail's question marketIds[0]. A door that did not answer 200 with ok: true, or was not
 * run, is one problem, and nothing in its reply is read.
 */
function bookVerdict(seed) {
  const problems = [], recorded = [];
  const out = (pool, ids) => ({ problems, recorded, pool, voidId: ids?.[11] ?? null, similarId: ids?.[0] ?? null });
  if (!seed || seed.error) {
    problems.push(seed?.error ?? "the book was not seeded");
    return out(null, null);
  }
  const door = (name, d) => {
    if (!d) { problems.push(`${name} was not run`); return null; }
    if (d.status !== 200 || d.reply?.ok !== true) { problems.push(`${name} answered ${d.status}${d.reply ? `: ${JSON.stringify(d.reply).slice(0, 160)}` : ""}`); return null; }
    return d.reply;
  };
  const m = door("seed-markets", seed.markets);
  const pool = m ? poolOf(m) : null;
  if (m && pool < BOOK.markets) problems.push(`seed-markets named ${pool} LIVE non-demo question(s); the book needs ${BOOK.markets} (A8 item 1(a))`);
  const p = door(`seed-player-portfolio { markets: ${BOOK.markets} }`, seed.portfolio);
  if (p) {
    if (p.placed !== BOOK.markets) problems.push(`placed ${p.placed}, not ${BOOK.markets}`);
    if (p.intended?.VOID !== 1) problems.push(`intended.VOID is ${p.intended?.VOID ?? 0}, not 1`);
    for (const s of ["VOID", "WIN", "LOSS"]) if (!((p.byStatus?.[s] ?? 0) >= 1)) problems.push(`the player holds no ${s} position (byStatus.${s} ${p.byStatus?.[s] ?? 0})`);
    for (const s of Array.isArray(p.refusals) ? p.refusals.map(String) : []) {
      if (/^updown\b/.test(s)) recorded.push(s);
      else problems.push(`refused: ${s}`);
    }
    const ids = Array.isArray(p.marketIds) ? p.marketIds : [];
    if (ids.length !== BOOK.markets || !ids.every((x) => typeof x === "string" && x.length > 0)) {
      problems.push(`marketIds holds ${ids.length} question(s), not ${BOOK.markets}: the void is marketIds[11] and the similar rail's question marketIds[0]`);
    }
  }
  const w = door("seed-watchlist", seed.watchlist);
  if (w) for (const lens of ["void", "done", "progress"]) if (!((w.byLens?.[lens] ?? 0) >= 1)) problems.push(`seed-watchlist starred no ${lens} row (byLens.${lens} ${w.byLens?.[lens] ?? 0})`);
  return out(pool, Array.isArray(p?.marketIds) ? p.marketIds : null);
}
/** One line for the book's seed: what came back, and the verdict. */
function bookSummary(seed) {
  const v = bookVerdict(seed);
  const p = seed?.portfolio?.reply ?? null, w = seed?.watchlist?.reply ?? null;
  return `seed-markets named ${v.pool ?? 0} LIVE non-demo question(s) (of ${seed?.markets?.reply?.live ?? "?"} LIVE) · placed ${p?.placed ?? "?"} · byStatus ${JSON.stringify(p?.byStatus ?? null)} · byLens ${JSON.stringify(w?.byLens ?? null)}`
    + `${v.recorded.length ? ` · ${v.recorded.length} Up & Down refusal(s) recorded, never failed: ${v.recorded.slice(0, 3).join(" · ")}${v.recorded.length > 3 ? " …" : ""}` : ""}`
    + ` · ${v.problems.length ? `REFUSED: ${v.problems.join(" · ")}` : "accepted"}`;
}
/** Whether a page's cards hold one in this state. */
const has = (cards, state) => (cards ?? []).some((c) => c.state === state);
/**
 * ⭐ A8 item 2 · THE PROBE, JUDGED, before any book cell is recorded: /results must show the voided question's card
 * (marketIds[11]) drawn void, and settled YES and NO cards; /watchlist a void card, a done card (resolved, either way) and
 * a selection-closed card. Each page's absences are its own.
 */
function probeVerdict(probe, voidId) {
  const results = [], watchlist = [];
  if (!Array.isArray(probe?.results)) results.push(`/results was not read${probe?.resultsError ? ` (${probe.resultsError})` : ""}`);
  else {
    const voided = probe.results.find((c) => c.id === voidId);
    if (!voidId || !voided) results.push(`the voided question's card (marketIds[11], ${voidId ?? "unknown"}) is not on /results`);
    else if (voided.state !== "void") results.push(`the voided question's card is drawn ${CARD_LABELS[voided.state] ?? voided.state}, not void`);
    if (!has(probe.results, "resolved-yes")) results.push("no settled YES card on /results");
    if (!has(probe.results, "resolved-no")) results.push("no settled NO card on /results");
  }
  if (!Array.isArray(probe?.watchlist)) watchlist.push(`/watchlist was not read${probe?.watchlistError ? ` (${probe.watchlistError})` : ""}`);
  else {
    if (!has(probe.watchlist, "void")) watchlist.push("no void card on /watchlist");
    if (!has(probe.watchlist, "resolved-yes") && !has(probe.watchlist, "resolved-no")) watchlist.push("no done card on /watchlist");
    if (!has(probe.watchlist, "closed")) watchlist.push("no selection-closed card on /watchlist");
  }
  return { results, watchlist };
}
/** How many cards of each state the book's captured cells drew (a card on two pages counts twice). */
function cardTally(book) {
  const tally = new Map();
  for (const c of Object.values(book ?? {})) {
    if (c.error) continue;
    for (const card of c.cards ?? []) tally.set(card.state, (tally.get(card.state) ?? 0) + 1);
  }
  return tally;
}

/** §B — the book is what it claims (S7 WP1, A8). Each check returns the cells (or facts) that fail it. */
function bookChecks(book, seed, store) {
  const all = Object.entries(book ?? {});
  const live = all.filter(([, c]) => !c.error);
  const keys = bookCellKeys();
  const size = keys.length;
  const bad = (pred) => live.filter(([k, c]) => pred(partsOf(k).r, c, k)).map(([k]) => k);
  const verdict = bookVerdict(seed);
  const probe = probeVerdict(seed?.probe, verdict.voidId);
  const tally = cardTally(book);
  const head = (c) => (c.head ? store[c.head] ?? "" : null);
  const headless = (c) => head(c) === null || !/^canonical \S/m.test(head(c)) || !/^og:url \S/m.test(head(c));
  return [
    { id: "B.0", name: `the book was seeded through dev-test doors that already exist — seed-markets, seed-player-portfolio { markets: ${BOOK.markets} }, seed-watchlist — and every reply holds what A8 item 1 asks; every book cell was captured (${size})`,
      fails: [...verdict.problems, ...(all.length === size && keys.every(([k]) => k in (book ?? {})) ? [] : [`the book holds ${all.length} cells`]),
        ...all.filter(([, c]) => c.error).map(([k, c]) => `${k} (${c.error})`)] },
    { id: "B.1", name: "every book cell settled, answered 200 and stayed where it was sent: the player is signed in, and the question page is the book's first question",
      fails: bad((r, c) => !c.stable || c.status !== 200 || c.landed !== r) },
    { id: "B.2", name: "before any book cell, /results showed the voided question's card (marketIds[11]), drawn void, and settled YES and NO cards (A8 item 2)",
      fails: probe.results },
    { id: "B.3", name: "before any book cell, /watchlist showed a void card, a done card and a selection-closed card (A8 item 2)",
      fails: probe.watchlist },
    { id: "B.4", name: "every book cell captured its body — <main> on /, /markets, /live, /results, /watchlist and the similar rail on /markets/:similar — and every / cell its head from the bytes: the canonical link and og:url",
      fails: bad((r, c) => (r === BOOK.similar ? c.regions?.similar?.count !== 1 : c.regions?.main?.count !== 1) || (r === BOOK.head && headless(c))) },
    { id: "B.5", name: "every lobby cell (/, /markets, /live, /results) captured one LIVE strip — the book's settlements, waited for before the first cell",
      fails: bad((r, c) => BOOK.lobby.includes(r) && c.regions?.ticker?.count !== 1) },
    { id: "B.6", name: "no journey test id, flag or class (S7's kp-jcard, kp-jhome, kp-jhowto and kp-howto included) in a book cell, in the page or in the bytes the server sent",
      fails: bad((r, c) => (c.journey ?? []).length > 0 || !c.raw || !c.raw.shell || c.raw.trace.length > 0) },
    { id: "B.7", name: "the book drew every classic card state S7 touches — live priced, one-sided, empty pool, selection closed, resolved YES, resolved NO, void",
      fails: CARD_STATES.filter((s) => !((tally.get(s) ?? 0) > 0)).map((s) => `no ${CARD_LABELS[s]} card in any book cell`) },
    { id: "B.8", name: "only React's DEV performance-track sentence is ever filed as DEV-only in a book cell — every other page error is compared",
      fails: live.filter(([, c]) => (c.devOnly ?? []).some((x) => !isDevMeasure(x))).map(([k, c]) => `${k} (filed DEV-only: ${c.devOnly.find((x) => !isDevMeasure(x))})`) },
    { id: "B.9", name: `only home's complete locale close-date leaves were canonicalized before geometry: one featured and ${HOME_BOARD_SIZE} board rows in every seeded home cell, zero elsewhere`,
      fails: bad((r, c) => ['featured', 'rows'].some((kind) => c.homeCloseDates?.[kind] !== (r === '/' ? HOME_CLOSE_POPULATION[kind] : 0)
        || c.homeCloseDates?.leaves?.[kind] !== (r === '/' ? HOME_CLOSE_POPULATION[kind] : 0))) },
  ];
}

/** A book with every §B check met, built in memory: what --prove-red breaks one check at a time. */
function syntheticBook() {
  const ids = Array.from({ length: BOOK.markets }, (_, i) => `mkt_planted${String(i).padStart(2, "0")}000000000`);
  const fresh = "mkt_plantedfresh00000000";
  const store = {
    main: '<main id="main-content"><article data-row-id="mkt_~" class="mcardp group"></article></main>',
    ticker: '<div role="region" class="ticker-strip"></div>',
    similar: '<section aria-labelledby="similar-markets-heading"></section>',
    head: ["canonical http://localhost", "og:title 50pick — Predict events. Not chance.", "og:url http://localhost"].join(NL),
  };
  const region = (html) => ({ count: 1, html, layout: null });
  const card = (i, state) => ({ id: typeof i === "number" ? ids[i] : i, state });
  // Every state is drawn on more than one route, so a plant on one cell never empties a state (only B.7's own do).
  const CARDS = {
    "/": [card(0, "priced"), card(5, "one-sided"), card(fresh, "empty"), card(3, "closed")],
    "/markets": [card(0, "priced"), card(1, "priced"), card(3, "closed"), card(5, "one-sided"), card(fresh, "empty")],
    "/live": [card(1, "priced"), card(3, "closed")],
    "/results": [card(6, "resolved-yes"), card(7, "resolved-no"), card(9, "resolved-yes"), card(10, "resolved-no"), card(11, "void")],
    "/watchlist": [card(0, "priced"), card(3, "closed"), card(6, "resolved-yes"), card(7, "resolved-no"), card(11, "void")],
    [BOOK.similar]: [card(1, "priced"), card(5, "one-sided")],
  };
  const book = {};
  for (const [k, , , , r] of bookCellKeys()) {
    book[k] = {
      status: 200, stable: true, landed: r, pageErrors: [], devOnly: [], journey: [], raw: { shell: true, trace: [] },
      regions: r === BOOK.similar ? { similar: region("similar") } : { main: region("main"), ...(BOOK.lobby.includes(r) ? { ticker: region("ticker") } : {}) },
      cards: CARDS[r].map((c) => ({ ...c })),
      ...(r === BOOK.head ? { head: "head" } : {}),
      homeCloseDates: { ...(r === '/' ? HOME_CLOSE_POPULATION : { featured: 0, rows: 0 }), leaves: { ...(r === '/' ? HOME_CLOSE_POPULATION : { featured: 0, rows: 0 }) } },
    };
  }
  const seed = {
    markets: { status: 200, reply: { ok: true, live: 30, ids: Array.from({ length: 30 }, (_, i) => ({ id: `mkt_pool${String(i).padStart(2, "0")}00000000000000`, category: "sports", titleEn: `Planted question ${i + 1}` })) } },
    portfolio: { status: 200, reply: {
      ok: true, placed: BOOK.markets, updownPlaced: 0,
      intended: { OPEN: 4, CASHED_OUT: 2, WIN: 3, LOSS: 2, VOID: 1 },
      byStatus: { OPEN: 8, CASHED_OUT: 3, WIN: 3, LOSS: 2, VOID: 1 },
      refusals: ["updown udr_planted0000000000000: CLOSED the round's window closed between listing and buying"],
      marketIds: ids,
    } },
    watchlist: { status: 200, reply: { ok: true, starred: 9, watching: 9, byLens: { all: 9, open: 3, progress: 2, done: 3, void: 1 }, forcedProgress: [ids[3], ids[4]], refusals: [] } },
    probe: {
      results: [card(6, "resolved-yes"), card(7, "resolved-no"), card(9, "resolved-yes"), card(10, "resolved-no"), card(11, "void")],
      watchlist: [card(0, "priced"), card(3, "closed"), card(6, "resolved-yes"), card(11, "void")],
    },
  };
  return { book, seed, store };
}

// ── S8 WP1 · the question phase: its verdict and §Q, as pure functions so --prove-red can break each one ─────────
/**
 * ⭐ THE QUESTIONS, JUDGED (seedQuestions' record), before any question cell is captured. `problems` refuse the phase (the
 * baseline is INVALID). The open question is the Sell capture's held one and must be drawn priced (both pools) on the
 * guest's /markets; the one-sided question is the first by title among the one-sided cards there, and the empty, settled
 * and closed-by-time questions the first three by title among the empty ones (none of them the held one); selection
 * closed is seed-watchlist's first forced progress row; the settled question's fast-forward and resolve-seed-markets
 * (which must name it, complete) and the closed-by-time question's fast-forward must each answer 200 ok; and the held
 * tickets' free windows must have closed before the first cell. A door that answered no ok is one problem, and nothing
 * in its reply is read.
 */
function questionVerdict(seed) {
  const problems = [];
  if (!seed || seed.error) return { problems: [seed?.error ?? "the questions were not seeded"], ids: null };
  const answered = (name, d) => {
    if (!d) { problems.push(`${name} was not run`); return null; }
    if (d.status !== 200 || d.reply?.ok !== true) { problems.push(`${name} answered ${d.status}${d.reply ? `: ${JSON.stringify(d.reply).slice(0, 160)}` : ""}`); return null; }
    return d.reply;
  };
  const board = Array.isArray(seed.board) ? seed.board : null;
  if (!board) problems.push(`the guest's /markets was not read${seed.boardError ? ` (${seed.boardError})` : ""}`);
  const ids = seed.ids ?? {};
  for (const name of ["open", "one-sided", "empty", "selection-closed", "time-closed", "settled"]) {
    if (typeof ids[name] !== "string" || !ids[name]) problems.push(`no ${name} question was found`);
  }
  if (board && ids.open) {
    const card = board.find((c) => c.id === ids.open);
    if (!card) problems.push("the held question's card is not on the guest's /markets");
    else if (card.state !== "priced") problems.push(`the held question's card is drawn ${CARD_LABELS[card.state] ?? card.state}, not live priced (both pools)`);
  }
  if (Object.values(ids).filter(Boolean).length !== new Set(Object.values(ids).filter(Boolean)).size) problems.push(`two states name one question: ${JSON.stringify(ids)}`);
  const settledFf = answered("fast-forward-market (the settled question, a day back)", seed.settledForward);
  // resolve-seed-markets runs only after the settled question's fast-forward answered (seedQuestions), so it is judged only then.
  const resolved = settledFf ? answered("resolve-seed-markets { markets: 1, stage: complete, settle: true }", seed.resolved) : null;
  if (settledFf && resolved) {
    const first = resolved.markets?.[0];
    if (resolved.resolved !== 1 || first?.id !== ids.settled || first?.state !== "complete") problems.push(`resolve-seed-markets took ${first?.id ?? "nothing"} (${first?.state ?? "no state"}), not the settled question ${ids.settled}, complete`);
  }
  answered("fast-forward-market (the closed-by-time question, an hour back)", seed.timeForward);
  if (!seed.freeWait?.closed) problems.push(`the held tickets' free windows were still open ${secs(seed.freeWait?.ms ?? 0)} after the phase began${seed.freeWait?.error ? ` (${seed.freeWait.error})` : ""}`);
  return { problems, ids };
}

/** §Q — the question phase is what it claims (S8 WP1). Each check returns the cells (or facts) that fail it. */
function questionChecks(question, seed, store) {
  const all = Object.entries(question ?? {});
  const live = all.filter(([, c]) => !c.error);
  const keys = questionCellKeys();
  const size = keys.length;
  const stateOf = new Map(keys.map(([k, , , , s]) => [k, s]));
  const viewerOf = new Map(keys.map(([k, v]) => [k, v]));
  const bad = (pred) => live.filter(([k, c]) => pred(stateOf.get(k) ?? null, c, viewerOf.get(k) ?? null)).map(([k]) => k);
  const html = (c, region) => (c.regions?.[region]?.html ? store[c.regions[region].html] ?? "" : "");
  const verdict = questionVerdict(seed);
  const masked = new Map(QUESTION_MASKS.map((m) => [m.id, 0]));
  for (const [, c] of live) for (const [id, n] of Object.entries(c.masked ?? {})) masked.set(id, (masked.get(id) ?? 0) + n);
  return [
    { id: "Q.0", name: `the questions were found and made through dev-test doors that already exist — the guest's /markets by card state, fast-forward-market, resolve-seed-markets, the cooling-off through its real form — and every question cell was captured (${size})`,
      fails: [...verdict.problems, ...(seed?.breakTaken === false ? [`the cooling-off: ${seed.breakError ?? "not taken"}`] : []),
        ...(all.length === size && keys.every(([k]) => k in (question ?? {})) ? [] : [`the question phase holds ${all.length} cells`]),
        ...all.filter(([, c]) => c.error).map(([k, c]) => `${k} (${c.error})`)] },
    { id: "Q.1", name: "every question cell settled, answered 200 and stayed where it was sent: the player and the reader on a break are signed in",
      fails: bad((s, c) => !c.stable || c.status !== 200 || c.landed !== s?.route) },
    { id: "Q.2", name: "every question cell captured its <main>, its bet panel and — for a signed-in reader, never for a guest — its holder section, each once",
      fails: bad((s, c, v) => c.regions?.main?.count !== 1 || c.regions?.panel?.count !== 1 || c.regions?.holder?.count !== (v === "guest" ? 0 : 1)) },
    { id: "Q.3", name: "no holder section draws a free-window strip: the held tickets' free windows were waited out first",
      fails: bad((s, c) => html(c, "holder").includes('<div class="mb-1.5 ')) },
    { id: "Q.4", name: "no journey test id, flag or class (S8's kp-bsheet, kp-jbet and kp-qghost included) in a question cell, in the page or in the bytes the server sent (data-sheet included)",
      fails: bad((s, c) => (c.journey ?? []).length > 0 || !c.raw || !c.raw.shell || c.raw.trace.length > 0) },
    { id: "Q.5", name: "each state is the one it names: the break's panel holds the break notice and no other cell's does; the holder's ?side cells hold ticket rows and the hedge warning; the guest's open and one-sided panels offer sign-up",
      fails: bad((s, c, v) => {
        const panel = html(c, "panel");
        const isBreak = v === "break";
        if (panel.includes('data-testid="market-bet-break"') !== isBreak) return true;
        if ((s?.id === "open-yes" || s?.id === "open-no") && (!html(c, "holder").includes("ticket-target") || !panel.includes("border-warning-border"))) return true;
        if (v === "guest" && (s?.id === "open" || s?.id === "one-sided") && !panel.includes("/auth/register?next=")) return true;
        return false;
      }) },
    { id: "Q.6", name: `every mask the classic question page draws masked something (${QUESTION_MASKS.filter((m) => m.seen).map((m) => m.id).join(", ")}); the others are counted, never failed (${QUESTION_MASKS.filter((m) => !m.seen).map((m) => m.id).join(", ")})`,
      fails: live.length ? [...QUESTION_MASKS.filter((m) => m.seen && !(masked.get(m.id) > 0)).map((m) => `${m.id} masked nothing in ${live.length} cell(s)`),
        ...live.filter(([, c]) => c.masked?.["jsonld-event-times"] !== 2).map(([k]) => `${k} did not mask exactly the Event's two seed timestamps`),
        ...live.filter(([k, c]) => c.masked?.["break-end-clock"] !== (viewerOf.get(k) === "break" ? stateOf.get(k)?.id === "break-empty" ? 2 : 1 : 0)).map(([k]) => `${k} did not mask exactly its named break-end date leaf population`)] : [] },
    { id: "Q.7", name: "only React's DEV performance-track sentence is ever filed as DEV-only in a question cell — every other page error is compared",
      fails: live.filter(([, c]) => (c.devOnly ?? []).some((x) => !isDevMeasure(x))).map(([k, c]) => `${k} (filed DEV-only: ${c.devOnly.find((x) => !isDevMeasure(x))})`) },
  ];
}

/** A question phase with every §Q check met, built in memory: what --prove-red breaks one check at a time. */
function syntheticQuestion() {
  const ids = { open: "mkt_qopen0000000000000", "one-sided": "mkt_qone00000000000000", empty: "mkt_qempty000000000000", "selection-closed": "mkt_qclosed00000000000", "time-closed": "mkt_qtime0000000000000", settled: "mkt_qsettled0000000000" };
  const store = {
    main: '<main id="main-content"><parity-region data-parity="panel"></parity-region><parity-region data-parity="holder"></parity-region></main>',
    guestPanel: '<aside aria-labelledby="bet-panel-heading"><a href="/auth/register?next=%2Fmarkets%2Fmkt_~">Sign up</a></aside>',
    panel: '<aside aria-labelledby="bet-panel-heading"><h2 id="bet-panel-heading">Place your stake</h2></aside>',
    hedgePanel: '<aside aria-labelledby="bet-panel-heading"><div class="rounded-lg border border-warning-border bg-warning-bg"></div></aside>',
    breakPanel: '<aside aria-labelledby="bet-panel-heading"><div data-testid="market-bet-break"></div></aside>',
    holder: '<section class="rounded-xl border border-border bg-bg-elevated"><div class="ticket-target"><button>Sell now</button></div></section>',
  };
  const region = (html) => ({ count: 1, html, layout: null });
  const none = () => ({ count: 0, html: null, layout: null });
  const question = {};
  for (const [k, v, , , s] of questionCellKeys()) {
    const panel = v === "break" ? "breakPanel" : v === "guest" ? (s.id === "open" || s.id === "one-sided" ? "guestPanel" : "panel") : (s.id === "open-yes" || s.id === "open-no" ? "hedgePanel" : "panel");
    question[k] = {
      status: 200, stable: true, landed: s.route, pageErrors: [], devOnly: [], journey: [], raw: { shell: true, trace: [] },
      regions: { main: region("main"), panel: region(panel), holder: v === "guest" ? none() : region("holder") },
      masked: { "timer-text": 0, "countdown-clock": 8, "sell-countdown": 0, "chart-time-axis": 1, "jsonld-event-times": 2, "break-end-clock": v === "break" ? s.id === "break-empty" ? 2 : 1 : 0 },
    };
  }
  const ok200 = (reply) => ({ status: 200, reply: { ok: true, ...reply } });
  const seed = {
    ids,
    board: [{ id: ids.open, state: "priced" }, { id: ids["one-sided"], state: "one-sided" }, { id: ids.empty, state: "empty" }, { id: ids.settled, state: "empty" }, { id: ids["time-closed"], state: "empty" }],
    settledForward: ok200({ marketId: ids.settled }),
    resolved: ok200({ resolved: 1, markets: [{ id: ids.settled, state: "complete" }] }),
    timeForward: ok200({ marketId: ids["time-closed"] }),
    freeWait: { closed: true, ms: 1000 },
    breakTaken: true,
  };
  return { question, seed, store };
}

// ── the run ───────────────────────────────────────────────────────────────────────────────────────────────
const results = [];
const ok = (name, pass, detail = "") => { results.push(!!pass); console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const listOf = (keys) => (keys.length ? `${keys.length}: ${keys.slice(0, 6).join(" · ")}${keys.length > 6 ? " …" : ""}` : "");
const secs = (ms) => `${Math.round(ms / 1000)}s`;
const pathOf = (u) => { const x = new URL(u); return x.pathname + x.search; };
/** Calibration 3 · a cell's notes — what a settle could not do (SETTLE's Needle, a book cell's lazy images): never a
 *  failure by itself and never compared (fieldsOf reads no notes), recorded as the cell's own field when there is any. */
const notesOf = (list) => { const notes = list.filter(Boolean); return notes.length ? { notes } : {}; };
/** …and each said in the log under its cell's key, as the capture goes; in a --prove-red row, after the row's detail. */
const sayNotes = (k, cell) => { for (const n of cell?.notes ?? []) console.log(`  ⚠ ${k} — ${n}`); };
const notedIn = (...cells) => { const n = [...new Set(cells.flatMap((c) => c?.notes ?? []))]; return n.length ? ` · notes: ${n.join(" | ")}` : ""; };

console.log(`qa:classic-shell-parity — ${MODE} — ${BASE}`);
console.log(`  tree ${TREE} @ ${short(HEAD.out)}${DIRTY.length ? ` (${DIRTY.length} uncommitted change(s) the server serves)` : " (clean)"} · forks from ${MAIN} at ${FORK.code === 0 ? short(FORK.out) : "?"} · rollout ${rollout.state}`);
console.log(`  the book's normalisers ON: ${BOOK.normalise.join(", ") || "none"}${NORM_SOURCE ? ` — ⚠ set by ${NORM_SOURCE} for this run, not by this file's switches` : " (this file's switches)"} · candidates: ${BOOK_NORMALISERS.map((n) => n.id).join(", ")}`);

// Everything that can refuse is asked BEFORE the browser starts, so a bad path never costs a 20-minute capture.
let baseline = null;
let baseOverridden = "";
if (BASELINE) {
  if (existsSync(BASELINE)) refuse(`${BASELINE} exists. A baseline is captured once and never overwritten (A3); after a rebase, capture a NEW file from the rebased pre-S6 parent (A18).`);
  if (!existsSync(dirname(resolve(BASELINE)))) refuse(`the folder for ${BASELINE} does not exist.`);
  if (DIRTY.length && !ALLOW_DIRTY) {
    refuse(`the server's tree has uncommitted changes it serves, so the commit this baseline would name is not what it measured:${NL}    ${DIRTY.join(`${NL}    `)}${NL}  Commit them, or pass --allow-dirty to record the list in the baseline.`);
  }
}
if (COMPARE) {
  try { baseline = JSON.parse(readFileSync(COMPARE, "utf8")); } catch (e) { refuse(`cannot read the baseline ${COMPARE}: ${msg(e)}`); }
  // ⭐ S7 WP1 · in this order: the kind and the version (a v2 file was captured before the book existed, so it holds none
  // of the book's cells or fields, and can be no v3 baseline: WP1 step 1, A2 item 3); then the book's normalisers (WP1
  // step 4: a baseline is only comparable under the set it was captured with); then the way the book was read
  // (calibration 2, BOOK_SETTLE); then the way every page was read (calibration 3, SETTLE); then the rest of the matrix.
  const notThis = () => `${COMPARE} is not a v${VERSION} ${KIND} capture of this matrix (kind=${baseline?.kind}, version=${baseline?.version}, captured at ${short(baseline?.base?.sha) || "an unnamed commit"}).`;
  const where = `Capture a v${VERSION} baseline into a NEW file at the base VODACOM-PLAN names for it (v4: §0k, S8-PLAN WP1 step 6; v3: §0j, S7-PLAN WP1 step 6; v2: §0i, S6 A8 and A18).`;
  if (baseline?.kind !== KIND || baseline.version !== VERSION) {
    const why = baseline?.kind === KIND && typeof baseline.version === "number"
      ? ` A v${baseline.version} capture holds none of the ${baseline.version < 3 ? "book's or the question page's" : "question page's"} cells or fields (VERSION 3 added the book: S7 WP1, A8; VERSION 4 the question page: S8 WP1), so it cannot be compared with a v${VERSION} run.` : "";
    refuse(`${notThis()}${why} ${where}`);
  }
  const theirs = Array.isArray(baseline.matrix?.book?.normalise) ? baseline.matrix.book.normalise : null;
  if (!theirs || [...theirs].sort().join() !== [...BOOK.normalise].sort().join()) {
    refuse(`${COMPARE} was captured with the book normalisers [${theirs ? theirs.join(", ") || "none" : "unrecorded"}], and this run uses [${BOOK.normalise.join(", ") || "none"}]. A different set needs a NEW baseline captured under it (S7-PLAN WP1 step 4); --norm (or KP_PARITY_NORMALISE) can match the baseline's set for a calibration run.`);
  }
  // ⭐ S7 WP1 calibration 2 · and the way its book cells were read (BOOK_SETTLE): a book read unsettled holds whatever
  // boxes the browser happened to leave its lazy images, so a baseline is only comparable when it was read the same way.
  const readAs = Array.isArray(baseline.matrix?.book?.settle) ? baseline.matrix.book.settle : null;
  if (!readAs || readAs.join() !== BOOK.settle.join()) {
    refuse(`${COMPARE} was captured under the book's capture procedure [${readAs ? readAs.join(", ") || "none" : "unrecorded"}], and this run reads the book under [${BOOK.settle.join(", ")}] (BOOK_SETTLE: lazy images loaded and exact home close-date leaves canonicalized before geometry). A different procedure needs a NEW baseline captured under it.`);
  }
  // ⭐ S7 WP1 calibration 3 · and the way every page was read (SETTLE): a page read before its Needle had mounted holds an
  // overlay census the next read of it may not, so a baseline is only comparable when its pages were read the same way.
  const pagesReadAs = Array.isArray(baseline.matrix?.settle) ? baseline.matrix.settle : null;
  if (!pagesReadAs || pagesReadAs.join() !== MATRIX.settle.join()) {
    refuse(`${COMPARE} was captured under the page capture procedure [${pagesReadAs ? pagesReadAs.join(", ") || "none" : "unrecorded"}], and this run reads every page under [${MATRIX.settle.join(", ")}] (SETTLE: the Needle at rest before any page is read — its matrix, Sell and book cells alike). A different procedure needs a NEW baseline captured under it.`);
  }
  if (JSON.stringify(baseline.matrix) !== JSON.stringify(MATRIX)) refuse(`${notThis()} ${where}`);
  if (baseline.role !== "baseline" || baseline.rejected !== false) {
    refuse(`${COMPARE} is not an accepted baseline (role=${baseline.role}, rejected=${baseline.rejected}): a .rejected.json failed a check when it was captured, and a .current.json is a later tree's capture.`);
  }
  console.log(`\n§0 · the base (S6-PLAN A18)`);
  const sha = baseline.base?.sha;
  const why = baseRefusal(sha);
  if (why && !ALLOW_BASE) {
    refuse(`the baseline was captured at ${short(sha)}, and this tree cannot be compared with it: ${why}.${NL}  Re-capture from the pre-S6 parent into a NEW file (A18), or pass --allow-base to compare anyway.`);
  }
  if (why) {
    baseOverridden = why;
    console.log(`  ⚠ OVERRIDDEN 0.1 the baseline's base — ${why}. --allow-base: differences below may belong to other lanes.`);
  } else {
    ok(`0.1 the baseline's ${short(sha)} is an ancestor of HEAD ${short(HEAD.out)}, and no merge since it carried served files in`, true);
  }
  const since = git("log", "--oneline", "--no-decorate", `${sha}..HEAD`, "--", ...SERVED);
  const commits = since.out.split(NL).filter(Boolean);
  if (since.code !== 0) console.log(`  ⚠ cannot list the commits since the baseline: ${since.err}`);
  else console.log(`  ${commits.length} commit(s) since the baseline change a served file — each should be an S6 package; any other is another lane's change inside this compare:`);
  for (const s of commits.slice(0, 30)) console.log(`    ${s}`);
  if (commits.length > 30) console.log(`    … and ${commits.length - 30} more`);
  if (!why && FORK.code === 0 && git("merge-base", "--is-ancestor", FORK.out, sha).code !== 0) {
    console.log(`  · ${MAIN} has moved past the baseline (they fork at ${short(FORK.out)}): normal once this lane has pushed, and the list above is still every served commit in between.`);
  }
  if (baseline.base?.dirty?.length) console.log(`  ⚠ the baseline was captured over ${baseline.base.dirty.length} uncommitted change(s): ${baseline.base.dirty.slice(0, 4).join(" · ")}`);
}

const b = await chromium.launch({ headless: true });
const BROWSER = b.version();
const t0 = Date.now();
console.log(`  Chromium ${BROWSER}`);
if (baseline && baseline.server?.browser !== BROWSER) console.log(`  ⚠ the baseline was captured with Chromium ${baseline.server?.browser}; this run uses ${BROWSER} — geometry may move for reasons outside S6.`);

/** React has hydrated the shell: its host nodes carry a fiber. The 3 s overlay clock starts here, not at first paint. */
const hydrated = (page) => page.waitForFunction(() => {
  const el = document.querySelector("header") ?? document.querySelector("main");
  return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
}, null, { timeout: 120_000 });
async function applyPlant(page, plant) {
  if (plant?.css) await page.addStyleTag({ content: plant.css });
  if (plant?.js) await page.evaluate(plant.js);
}
/**
 * ⭐ S7 WP1 calibration 3 · THE NEEDLE AT REST (SETTLE "needle-rest"), read IN THE PAGE from needle.tsx's own probe for
 * drives, `window.needle.resting()` (~:953-956: true when it is tucked, no rest check is pending, no glide runs and its
 * loop is asleep — or when it is hidden). A page without `#needle-root` (a guest's: the shell renders it for a session
 * only) is at rest. A page WITH one is at rest only once the engine has mounted (`window.needle` exists) and `resting()`
 * answers true. ⚠️ qa:journey-shell's NEEDLE_RESTING (~:876) reads an absent probe as resting — a journey page may hide
 * the Needle for good — but here an absent engine is a Needle still on its way: every signed-in classic page mounts one,
 * after hydration, behind two dynamic imports. Self-contained (Playwright serialises it and calls it with its one
 * argument); --prove-red P.8r hands it synthetic pages as `doc` and `win`.
 */
const NEEDLE_AT_REST = (_, doc = document, win = window) => {
  if (!doc.getElementById("needle-root")) return true;
  const n = win.needle;
  return !!n && typeof n.resting === "function" && n.resting() === true;
};
/** How long open() waits, at most, for the Needle to come to rest: its engine's two dynamic imports (which a dev server
 *  may compile on first request), the rest check (180–900 ms), a glide (under 1.5 s) and one more check. */
const NEEDLE_REST_MS = 15_000;
/** The Needle brought to rest (NEEDLE_AT_REST, read every 100 ms for NEEDLE_REST_MS at most): null once it is, else the
 *  note its cell carries — never a throw, never a failure by itself; the page is then read as it stands. */
async function settleNeedle(page) {
  const rested = await page.waitForFunction(NEEDLE_AT_REST, null, { timeout: NEEDLE_REST_MS, polling: 100 }).then(() => true, () => false);
  if (rested) return null;
  const seen = await page.evaluate(() => ({ mounted: !!window.needle, resting: typeof window.needle?.resting === "function" ? window.needle.resting() : null })).catch(() => null);
  return `the Needle had not come to rest ${secs(NEEDLE_REST_MS)} into the settle (${seen ? `${seen.mounted ? "its engine mounted" : "its engine not mounted"}, resting() ${seen.resting}` : "unread"}), so the page is read as it stands`;
}
/** Opens a cell's page: its bytes, hydration, the plant and 3 s (again for a client redirect's second document), and —
 *  calibration 3 — the Needle at rest (SETTLE), so every read of an opened page comes after it. `needle` is the settle's
 *  note, or null. */
async function open(page, route, plant) {
  const res = await page.goto(BASE + route, { waitUntil: "load", timeout: 180_000 });
  // The bytes the server sent, read before anything replaces the document: hydration removes what streamed first.
  const body = res ? await res.text().catch(() => null) : null;
  await page.locator("main").first().waitFor({ timeout: 120_000 });
  await hydrated(page);
  await applyPlant(page, plant);
  await page.waitForTimeout(3000);
  // A redirect the CLIENT carried out after load lands on another document: it gets the same 3 s.
  if (res && pathOf(page.url()) !== pathOf(res.url())) {
    await page.waitForLoadState("load").catch(() => {});
    await page.locator("main").first().waitFor({ timeout: 120_000 });
    await hydrated(page);
    await applyPlant(page, plant).catch(() => {});
    await page.waitForTimeout(3000);
  }
  const needle = await settleNeedle(page);
  return { status: res ? res.status() : 0, body, needle };
}
const localeCookie = (locale) => ({ name: "kp-locale", value: locale, domain: HOST, path: "/" });

/** A dev-server document replacement is one browser interruption, not a page difference. */
async function evaluateStableSnapshot(page, args, plant) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await page.evaluate(SNAPSHOT, args); }
    catch (e) {
      if (!/Execution context was destroyed/.test(String(e)) || attempt === 3) throw e;
      await page.waitForLoadState("load", { timeout: 120_000 });
      await page.locator("main").first().waitFor({ timeout: 120_000 });
      await hydrated(page);
      await applyPlant(page, plant);
      await settleNeedle(page);
    }
  }
}

/** One attempt in a FRESH context — a context carried across cells accumulates visits, and the overlays count visits. */
async function captureOnce(jar, locale, width, route, plant = null) {
  const ctx = await b.newContext({ viewport: { width, height: HEIGHT } });
  const pageErrors = [], devOnly = [];
  try {
    await ctx.addCookies([...jar, localeCookie(locale)]);
    const page = await ctx.newPage();
    page.on("pageerror", fileError(pageErrors, devOnly));
    const { status, body, needle } = await open(page, route, plant);
    const args = { crest: CREST, props: PROPS, animated: ANIMATED, notFound: route === "/account" || route === NOT_FOUND, pageBody: jar.length > 0 && route === BODY_ROUTE, trace: TRACE };
    // Turbopack may replace this warmed document. The retry still judges its landed URL and regions.
    let snap = await evaluateStableSnapshot(page, args, plant);
    let stable = false;
    for (let i = 0; i < 6 && !stable; i++) {
      await page.waitForTimeout(700);
      const next = await evaluateStableSnapshot(page, args, plant);
      stable = JSON.stringify(next) === JSON.stringify(snap);
      snap = next;
    }
    // ⭐ ROBOTS FROM THE BYTES THE SERVER SENT, NOT THE LIVE DOCUMENT. Calibration (two servers, one tree) found the held
    // viewer's not-found page ending with two "index, follow" metas on one run and "noindex" on the other: the client
    // replaces head metadata after load. A crawler reads the response, so that is what §3.3 holds to.
    if (snap.notFound && body) {
      snap = { ...snap, notFound: { ...snap.notFound, robots: [...body.matchAll(/<meta name="robots" content="([^"]*)"/g)].map((m) => m[1]).sort() } };
    }
    const pass = (await ctx.cookies(BASE)).some((c) => c.name === "kp_preview");
    return toCell(snap, { status, stable, pass, raw: rawOf(body), pageErrors: [...new Set(pageErrors)].sort(), devOnly: [...new Set(devOnly)].sort(), ...notesOf([needle]) });
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** A late navigation invalidates an evaluation. Retry only that interruption, once, from a new context. */
async function capture(jar, locale, width, route, plant = null) {
  try {
    return await retryNavigationCapture(
      () => captureOnce(jar, locale, width, route, plant),
      () => console.log(`  ↻ ${locale}|${width}|${route} navigation interrupted; retrying the whole cell`),
    );
  } catch (e) {
    return { error: msg(e) };
  }
}

/** Signs a viewer in through its real door (qa-journey-preview §3) and returns ONLY the session cookie. */
async function signIn(v) {
  if (!v.door) return [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${v.door}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await p.waitForLoadState("domcontentloaded");
    await p.locator("main").first().waitFor({ timeout: 120_000 });
    await p.waitForTimeout(900);
    const jar = (await ctx.cookies(BASE)).filter((c) => c.name === "kp_session");
    ok(`1.${v.id} ${v.who} is signed in (a kp_session cookie in the jar)`, jar.length === 1);
    return jar;
  } catch (e) {
    ok(`1.${v.id} ${v.who} is signed in`, false, msg(e));
    return [];
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** Every route once, uncaptured: the dev server compiles on first request, and a compile is not what is measured. */
async function warm(jar, routes) {
  const ctx = await b.newContext({ viewport: { width: 360, height: HEIGHT } });
  try {
    await ctx.addCookies([...jar, localeCookie("en")]);
    const page = await ctx.newPage();
    for (const r of routes) await open(page, r, null).catch(() => {});
  } catch {
    // A warm-up that fails is not a finding; the capture of the same route reports it.
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** WP10 · gives the signed-in demo player a portfolio through the real money paths, and names an open ticket's question. */
async function seedHolder(jar, beforeSeed = null) {
  const ctx = await b.newContext();
  try {
    await ctx.addCookies(jar);
    const real = await ctx.request.post(`${BASE}/api/dev-test/seed-real-markets`, { data: {} });
    const realBody = await real.json().catch(() => null);
    if (!real.ok() || !realBody?.ok) return { error: `seed-real-markets answered ${real.status()}` };
    // The pages compile BEFORE the free window starts: a dev server's first request to a route can take a minute.
    if (beforeSeed) await beforeSeed(realBody.live?.[0]?.id ?? null);
    const at = Date.now();
    const res = await ctx.request.post(`${BASE}/api/dev-test/seed-player-portfolio`, { data: { markets: 5 } });
    const body = await res.json().catch(() => null);
    // The seed's first question is left OPEN (its plan for five: four open, one sold), and it is the one the cells read.
    const held = body?.marketIds?.[0];
    if (!res.ok() || !body?.ok || typeof held !== "string") return { error: `seed-player-portfolio answered ${res.status()}: ${JSON.stringify(body).slice(0, 200)}` };
    return { held, at, open: body.byStatus?.OPEN ?? 0, refusals: body.refusals ?? [] };
  } catch (e) {
    return { error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** S6 A8e · what SNAPSHOT is asked for a Sell cell, and a Sell snapshot's regions as a cell records them (each a blob). */
const sellArgsOf = (held, place) => ({ crest: CREST, props: PROPS, animated: ANIMATED, notFound: false, pageBody: false, sell: { held, place }, trace: TRACE });
const sellRegionsOf = (sell) => Object.fromEntries(Object.entries(sell).map(([name, r]) => [name, r.count === 0 ? { count: 0, html: null, layout: null } : {
  count: r.count,
  html: put(norm(r.html)),
  layout: put(r.lines.map(([path, geo, sig]) => `${path} ${geo} ${put(norm(sig))}`).join(NL)),
}]));
/** S6 A8e · the first failure of a first-paint capture: every first paint after it is skipped (S.4 names it), so a page that
 *  cannot paint with its scripts held costs one wait, not one per cell, and the cells stay inside the free window. */
let servedBroken = null;
/**
 * ⭐ S6 A8e · one Sell cell's FIRST PAINT, in a page of the cell's own context: every script the page asks for is held,
 * never answered, so nothing hydrates, while the server's own inline instructions put the streamed markup in place and the
 * stylesheets and fonts load — what a slow phone shows until the page has started. Returns the strip and the button as the
 * cell records them, and whether anything had hydrated (S.4 requires that nothing had). Fails within 50 s. ⛔ A read only:
 * nothing is pressed.
 */
async function servedSellOf(ctx, route, args, plant = null) {
  if (servedBroken) return { error: `not captured: an earlier first paint failed (${servedBroken})` };
  const page = await ctx.newPage();
  try {
    await page.route("**/*", (r) => {
      if (r.request().resourceType() === "script") return;
      r.continue().catch(() => {});
    });
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForFunction(({ held, place }) => (place === "/positions"
      ? !!document.querySelector(`#main-content a[data-row-id][href="/markets/${held}"]`)
      : !!document.querySelector("#main-content .ticket-target > button")), args.sell, { timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await applyPlant(page, plant);
    const hydrated = await page.evaluate(() => [...document.querySelectorAll("header, main, button")]
      .some((el) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"))));
    const snap = await page.evaluate(SNAPSHOT, args);
    return { hydrated, regions: sellRegionsOf(snap.sell) };
  } catch (e) {
    servedBroken = msg(e);
    return { error: servedBroken };
  } finally {
    await page.close().catch(() => {});
  }
}
/** S6 A8e · a Sell cell's first paint alone, in a FRESH context: --prove-red's first-paint plant. */
async function captureServedCell(jar, locale, width, place, held, plant) {
  const ctx = await b.newContext({ viewport: { width, height: HEIGHT } });
  try {
    await ctx.addCookies([...jar, localeCookie(locale)]);
    return await servedSellOf(ctx, routeOfPlace(place, held), sellArgsOf(held, place), plant);
  } catch (e) {
    return { error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * WP10 · one Sell cell, in a FRESH context: the open ticket's strip and button where a classic holder meets them — and,
 * in a confirm cell, the classic confirm the button opens. ⛔ It is never confirmed: only Enter or the gold button sells,
 * and neither is touched; the context closes with the dialog open. S6 A8e: first, in a page of its own, the cell's first
 * paint (`served`) — unless the caller needs none (--prove-red's plants on the hydrated page).
 */
async function captureSellCell(jar, locale, width, place, held, plant = null, withServed = true) {
  const ctx = await b.newContext({ viewport: { width, height: HEIGHT } });
  const pageErrors = [], devOnly = [];
  try {
    await ctx.addCookies([...jar, localeCookie(locale)]);
    const args = sellArgsOf(held, place);
    const served = withServed ? await servedSellOf(ctx, routeOfPlace(place, held), args).catch((e) => ({ error: msg(e) })) : undefined;
    const page = await ctx.newPage();
    page.on("pageerror", fileError(pageErrors, devOnly));
    const { status, body, needle } = await open(page, routeOfPlace(place, held), plant);
    let snap = await page.evaluate(SNAPSHOT, args);
    let stable = false;
    for (let i = 0; i < 6 && !stable; i++) {
      await page.waitForTimeout(700);
      const next = await page.evaluate(SNAPSHOT, args);
      stable = JSON.stringify(next.sell) === JSON.stringify(snap.sell) && JSON.stringify(next.journey) === JSON.stringify(snap.journey);
      snap = next;
    }
    const sell = { ...snap.sell };
    let confirmLive;
    if (confirmCell(width, place)) {
      // The one classic surface whose words WP10 now hands through `??`: pressed open, read inside its quote hold.
      await page.locator("#main-content .ticket-target > button").first().click();
      await page.locator(CONFIRM_GOLD).first().waitFor({ timeout: 5_000 });
      const cargs = { ...args, sell: null, confirm: true };
      let c = await page.evaluate(SNAPSHOT, cargs);
      let still = false;
      for (let i = 0; i < 6 && !still; i++) {
        await page.waitForTimeout(700);
        const next = await page.evaluate(SNAPSHOT, cargs);
        still = JSON.stringify(next.confirm) === JSON.stringify(c.confirm);
        c = next;
      }
      sell.confirm = c.confirm.region;
      confirmLive = c.confirm.live;
      stable = stable && still;
    }
    const regions = {};
    for (const [name, r] of Object.entries(sell)) {
      regions[name] = r.count === 0 ? { count: 0, html: null, layout: null } : {
        count: r.count,
        html: put(norm(r.html)),
        layout: put(r.lines.map(([path, geo, sig]) => `${path} ${geo} ${put(norm(sig))}`).join(NL)),
      };
    }
    return {
      status, stable, landed: snap.url.split(held).join(":held"), regions, journey: snap.journey, raw: rawOf(body),
      ...(confirmLive === undefined ? {} : { confirmLive }),
      ...(served === undefined ? {} : { served }),
      pageErrors: [...new Set(pageErrors)].sort(),
      devOnly: [...new Set(devOnly)].sort(),
      ...notesOf([needle]),
    };
  } catch (e) {
    return { error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** WP10 · the Sell capture: the demo player is given an open ticket through the real money paths, then every Sell cell. */
async function captureSell() {
  console.log(`${NL}§1s · the Sell button a classic holder is served (WP10): the demo player's open ticket, at ${SELL.widths.join("/")} × ${SELL.locales.join("/")}, and the classic confirm at ${SELL_CONFIRM.width} in the holder block`);
  const keys = [];
  for (const l of SELL.locales) for (const w of SELL.widths) for (const place of SELL.places) keys.push([keyOf("sell", l, w, place), l, w, place]);
  const jar = await signIn(VIEWERS.find((v) => v.id === "player"));
  if (!jar.length) { for (const [k] of keys) sellCells[k] = { error: "the viewer could not be signed in" }; return; }
  sellSeed = await seedHolder(jar, (anyMarket) => warm(jar, ["/positions", ...(anyMarket ? [`/markets/${anyMarket}`] : [])]));
  if (sellSeed.error || !sellSeed.held) { for (const [k] of keys) sellCells[k] = { error: `the seed: ${sellSeed.error ?? "no open ticket"}` }; return; }
  for (const [k, l, w, place] of keys) {
    sellCells[k] = await captureSellCell(jar, l, w, place, sellSeed.held);
    if (sellCells[k].error) console.log(`  ✗ ${k} — ${sellCells[k].error}`);
    sayNotes(k, sellCells[k]);
  }
  sellSeed.lastCellMs = Date.now() - sellSeed.at;
  console.log(`  ${keys.length} Sell cells · the last captured ${secs(sellSeed.lastCellMs)} after the seed (a default poll's free window is 5:00; §S.2 fails a cell that missed it)`);
}

/**
 * ⭐ S7 WP1 · A8 item 1 — THE BOOK, SEEDED AS THE DEMO PLAYER THROUGH DEV-TEST DOORS THAT ALREADY EXIST, IN A8'S ORDER:
 * (a) seed-markets tops the canonical catalogue up while fewer than 25 questions are LIVE and names the LIVE ones (the
 * matrix's store starts empty and the Sell capture brought seed-real-markets' six); (b) seed-player-portfolio
 * { markets: 12 } plans the first twelve LIVE non-demo questions OPEN, CASHED_OUT, WIN, LOSS and VOID through the real
 * money paths; (c) seed-watchlist stars every lens through toggleWatch, closing selection on two open questions for its
 * progress row. A door that answers no ok, or a pool under twelve, stops the seed where it is, and bookVerdict judges
 * what came back. ⛔ No new dev-test route and no admin-console drive (test:cert-devroutes).
 */
async function seedBook(jar) {
  const ctx = await b.newContext();
  const seed = {};
  try {
    await ctx.addCookies(jar);
    // A dev server compiles a door on its first request, and the portfolio moves real money through twelve questions.
    const post = async (door, data) => {
      const res = await ctx.request.post(`${BASE}/api/dev-test/${door}`, { data, timeout: 300_000 });
      return { status: res.status(), reply: await res.json().catch(() => null) };
    };
    const answered = (d) => d.status === 200 && d.reply?.ok === true;
    seed.markets = await post("seed-markets", {});
    if (!answered(seed.markets) || poolOf(seed.markets.reply) < BOOK.markets) return seed;
    seed.portfolio = await post("seed-player-portfolio", { markets: BOOK.markets });
    if (!answered(seed.portfolio)) return seed;
    seed.watchlist = await post("seed-watchlist", {});
    return seed;
  } catch (e) {
    return { ...seed, error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** ⭐ S7 WP1 · A8 item 2 — THE PROBE: the cards /results and /watchlist draw for the demo player (en, 1280), each by its
 *  state, read before any book cell. A page that could not be read, or that sent the player elsewhere, is null. */
async function probeBook(jar) {
  const probe = {};
  for (const [name, route] of [["results", "/results"], ["watchlist", "/watchlist"]]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: HEIGHT } });
    try {
      await ctx.addCookies([...jar, localeCookie("en")]);
      const page = await ctx.newPage();
      await open(page, route, null);
      const snap = await evaluateStableSnapshot(page, bookArgsOf(route), null);
      if (snap.url.split("?")[0] !== route) {
        probe[name] = null;
        probe[`${name}Error`] = `it landed on ${snap.url}`;
      } else {
        probe[name] = (snap.cards ?? []).map((c) => ({ id: c.id, state: cardStateOf(c) }));
      }
    } catch (e) {
      probe[name] = null;
      probe[`${name}Error`] = msg(e);
    } finally {
      await ctx.close().catch(() => {});
    }
  }
  return probe;
}

/** ⭐ S7 WP1 · B.5 — the LIVE strip names the book's settlements once the platform's stats have them (platform-stats.ts:
 *  a memo that a poll written in this process refreshes, else 60 s old at most): waited for on / before the first book
 *  cell, at most 16 reads 5 s apart. */
async function waitForStrip(jar) {
  const t = Date.now();
  const ctx = await b.newContext({ viewport: { width: 1280, height: HEIGHT } });
  try {
    await ctx.addCookies([...jar, localeCookie("en")]);
    const page = await ctx.newPage();
    for (let i = 0; i < 16; i++) {
      await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 180_000 });
      await page.locator("main").first().waitFor({ timeout: 120_000 });
      if (await page.locator("div.ticker-strip").count()) return { seen: true, ms: Date.now() - t };
      await page.waitForTimeout(5000);
    }
    return { seen: false, ms: Date.now() - t };
  } catch (e) {
    return { seen: false, ms: Date.now() - t, error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * ⭐ S7 WP1 · one book cell, in a FRESH context: the route's regions (<main> and, on a lobby route, the LIVE strip read
 * still; or the question page's similar rail), its classic cards by state, the journey trace in the page and in the
 * bytes, and on / the head from the bytes. --prove-red plants through `plant`: `css` and `js` in the page as the matrix's
 * are, and `bytes` on the bytes the harness reads (the head and the raw trace) — never on what the browser renders.
 * Calibration 2: the cell is read SETTLED (BOOK_SETTLE, SETTLE_LAZY) before its first snapshot — except in --prove-red's
 * one control capture (`plant.unsettled`) — and, while tied-cards is on, UNTIE_CARDS runs before every snapshot.
 * Calibration 3: open() has brought the Needle to rest first (SETTLE); what either settle could not do is the cell's notes.
 */
async function captureBookCell(jar, locale, width, route, similarId, plant = null) {
  const ctx = await b.newContext({ viewport: { width, height: HEIGHT } });
  const pageErrors = [], devOnly = [];
  try {
    await ctx.addCookies([...jar, localeCookie(locale)]);
    const page = await ctx.newPage();
    page.on("pageerror", fileError(pageErrors, devOnly));
    const target = route === BOOK.similar ? `/markets/${similarId}` : route;
    const { status, body: sent, needle } = await open(page, target, { css: `${STRIP_STILL}${plant?.css ? `${NL}${plant.css}` : ""}`, js: plant?.js ?? null });
    const body = plant?.bytes && typeof sent === "string" ? plant.bytes(sent) : sent;
    // PHOSPHOR-MIGRATION owed parity: the null compare of this exact tree moved four
    // /watchlist number boxes by 5.5px with identical HTML and CSS. Wait for the
    // actual font before recording book geometry, as the Sell capture already does.
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const args = bookArgsOf(route);
    const regions = Object.values(args.book.regions);
    let lazy = null;
    if (!plant?.unsettled) {
      const settled = await page.evaluate(SETTLE_LAZY, { regions, ms: LAZY_SETTLE_MS });
      if (settled.unloaded.length) {
        lazy = `${settled.unloaded.length} of its ${settled.lazy} lazy image(s) had not loaded ${secs(LAZY_SETTLE_MS)} into the settle, so their boxes are read as the browser left them: ${settled.unloaded.join(", ")}`;
      }
    }
    // A home DOM negative is planted after its own subtree hydrated. The shell fiber in open() is earlier:
    // changing a streamed home text then makes React replace the plant, which proves no book verdict.
    // This seam is for --prove-red plants only; ordinary baseline/compare capture timing is unchanged.
    if (plant?.lateHomeJs) {
      if (route !== '/') throw new Error('late home plant requested outside home');
      await page.waitForFunction(({selectors, population}) => Object.entries(selectors).every(([kind, selector]) => {
        const leaves = [...document.querySelectorAll(selector)].filter((el) => !el.childElementCount);
        return leaves.length === population[kind] && leaves.every((el) => Object.keys(el).some((key) => key.startsWith('__reactFiber$')));
      }), {selectors: BOOK_HOME_CLOSE_DATE.selectors, population: HOME_CLOSE_POPULATION}, {timeout: 30_000});
      await page.evaluate(plant.lateHomeJs);
    }
    const untie = args.book.tied ? { ...args.book.tied, regions } : null;
    const homeDateMask = route === '/' ? { ...BOOK_HOME_CLOSE_DATE, locale } : null;
    let homeCloseDates = { featured: 0, rows: 0, leaves: { featured: 0, rows: 0 } };
    const read = async () => {
      if (untie) await page.evaluate(UNTIE_CARDS, untie);
      if (homeDateMask) homeCloseDates = await page.evaluate(normaliseBookHomeCloseDates, homeDateMask);
      return page.evaluate(SNAPSHOT, args);
    };
    const seen = (s) => JSON.stringify([s.url, s.regions, s.journey, s.cards]);
    let snap = await read();
    let stable = false;
    for (let i = 0; i < 6 && !stable; i++) {
      await page.waitForTimeout(700);
      const next = await read();
      stable = seen(next) === seen(snap);
      snap = next;
    }
    const cell = toBookCell(snap, { status, stable, homeCloseDates, raw: rawOf(body), pageErrors: [...new Set(pageErrors)].sort(), devOnly: [...new Set(devOnly)].sort(), ...notesOf([needle, lazy]) });
    if (route === BOOK.similar && similarId) cell.landed = cell.landed.split(similarId).join(":similar");
    if (route === BOOK.head) cell.head = typeof body === "string" ? put(bookNorm(headOf(body))) : null;
    return cell;
  } catch (e) {
    return { error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * ⭐ S7 WP1 · THE BOOK PHASE (A8): after the matrix and the Sell capture, the demo player's book is seeded and judged (item
 * 1), then probed and judged (item 2), and only then is any book cell captured — after the LIVE strip has named the
 * book's settlements. A refused book or probe captures nothing: every book cell says why, and B.0, B.2 or B.3 fail, so
 * the baseline is INVALID and is not written.
 */
async function captureBook(still) {
  console.log(`${NL}§1b · a classic reader's page bodies (S7 WP1, A8): the book, seeded through existing dev-test doors, then ${BOOK.routes.join(" · ")} at ${BOOK.widths.join("/")} × ${BOOK.locales.join("/")} for ${BOOK.viewers.join(" and ")} (${BOOK.playerOnly.join(", ")}: the player only)`);
  const keys = bookCellKeys();
  const skip = (why) => {
    for (const [k] of keys) bookCells[k] = { error: `not captured: ${why}` };
    console.log(`  ✗ not captured: ${why}`);
  };
  const jar = await signIn(VIEWERS.find((v) => v.id === "player"));
  if (!jar.length) {
    bookSeed = { error: "the demo player could not be signed in" };
    return skip(bookSeed.error);
  }
  bookSeed = await seedBook(jar);
  const verdict = bookVerdict(bookSeed);
  // Recorded in the baseline as A8 asks: the pool (§0j names it) and the Up & Down refusals that never fail it.
  bookSeed.pool = verdict.pool;
  bookSeed.recorded = verdict.recorded;
  console.log(`  the book: ${bookSummary(bookSeed)}`);
  if (verdict.problems.length) return skip(`A8 item 1 refused the book (${verdict.problems.join(" · ")})`);
  bookSeed.probe = await probeBook(jar);
  const probe = probeVerdict(bookSeed.probe, verdict.voidId);
  if (probe.results.length || probe.watchlist.length) return skip(`A8 item 2's probe found the book short (${[...probe.results, ...probe.watchlist].join(" · ")})`);
  console.log(`  the probe: /results ${bookSeed.probe.results.length} card(s), /watchlist ${bookSeed.probe.watchlist.length} — A8 item 2's cards are there`);
  bookSeed.strip = await waitForStrip(jar);
  console.log(`  the LIVE strip ${bookSeed.strip.seen ? `named the book's settlements after ${secs(bookSeed.strip.ms)}` : `did not appear in ${secs(bookSeed.strip.ms)}${bookSeed.strip.error ? ` (${bookSeed.strip.error})` : ""}: B.5 names the cells`}`);
  for (const v of BOOK.viewers) {
    const vjar = v === "player" ? jar : [];
    await warm(vjar, BOOK.routes.filter((r) => v === "player" || !BOOK.playerOnly.includes(r)).map((r) => (r === BOOK.similar ? `/markets/${verdict.similarId}` : r)));
    for (const l of BOOK.locales) {
      const t = Date.now();
      let n = 0;
      for (const [k, kv, kl, w, r] of keys) {
        if (kv !== v || kl !== l) continue;
        bookCells[k] = await captureBookCell(vjar, l, w, r, verdict.similarId);
        n++;
        if (bookCells[k].error) console.log(`  ✗ ${k} — ${bookCells[k].error}`);
        sayNotes(k, bookCells[k]);
      }
      console.log(`  book-${v} · ${l} · ${n} cells · ${secs(Date.now() - t)}`);
      still(`by the end of book-${v} · ${l}`);
    }
  }
}

/** S8 WP1 · what SNAPSHOT is asked for a question cell: <main> with the bet panel and the holder section stubbed in it, each
 *  of the two its own region; the masks; the similar rail's cards; chart-paths and tied-cards exactly as for a book cell. */
const questionArgsOf = (locale) => {
  const { book } = bookArgsOf(BOOK.similar);
  return {
    crest: CREST, props: PROPS, animated: ANIMATED, notFound: false, pageBody: false, trace: TRACE,
    book: {
      ...book,
      regions: { main: "#main-content", panel: `#main-content ${QUESTION_PANEL}`, holder: `#main-content ${QUESTION_HOLDER}` },
      stubbed: "main",
      stubs: { panel: QUESTION_PANEL, holder: QUESTION_HOLDER },
      masks: QUESTION_MASKS.map(({ id, selector, text, inside, only, canonical }) => ({ id, selector, text: text ?? null, inside: !!inside, only: only ?? null, canonical: !!canonical })),
      clock: { ...QUESTION_BREAK_CLOCK, locale },
    },
  };
};

/** Calibrated first-paint settle, not a geometry mask. The chart retains a default 56px axis until a full resize
 * occurs after its data arrive (lightweight-charts deliberately avoids shrinking on marksChanged). Resize its actual
 * observed container by one pixel then restore its exact style attribute; the final boxes are the real original size. */
const SETTLE_QUESTION_CHART = async () => {
  const result = [];
  for (const chart of document.querySelectorAll("#main-content div.tv-lightweight-charts")) {
    const target = chart.parentElement;
    if (!target || target.clientWidth === 0) continue;
    const original = target.getAttribute("style"), width = target.clientWidth;
    target.style.width = `${width + 1}px`;
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    // Flush Chromium's pending CSSOM serialization before restoring an absent style attribute; otherwise its lazy
    // empty declaration can resurrect style="" after removeAttribute, which would change the captured markup.
    target.getAttribute("style");
    if (original === null) {
      target.removeAttribute("style");
    } else {
      target.setAttribute("style", original);
    }
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    result.push({ originalWidth: width, restoredWidth: target.clientWidth, styleRestored: target.getAttribute("style") === original });
  }
  return result;
};

/**
 * ⭐ S8 WP1 · one question cell, in a FRESH context, read as a book cell is (open() and the Needle at rest; the lazy images
 * settled; tied-cards before every snapshot while it is on), its regions <main>, the bet panel and the holder section.
 * --prove-red plants through `plant` exactly as captureBookCell's: `css` and `js` in the page, `bytes` on the bytes the
 * harness reads. The cell's landing is written back with the state's placeholder.
 */
async function captureQuestionCell(jar, locale, width, state, ids, plant = null) {
  const ctx = await b.newContext({ viewport: { width, height: HEIGHT } });
  const pageErrors = [], devOnly = [];
  try {
    await ctx.addCookies([...jar, localeCookie(locale)]);
    const page = await ctx.newPage();
    page.on("pageerror", fileError(pageErrors, devOnly));
    const { status, body: sent, needle } = await open(page, routeOfQuestion(state.route, ids), plant);
    const body = plant?.bytes && typeof sent === "string" ? plant.bytes(sent) : sent;
    const args = questionArgsOf(locale);
    const regions = Object.values(args.book.regions);
    let lazy = null;
    const settled = await page.evaluate(SETTLE_LAZY, { regions, ms: LAZY_SETTLE_MS });
    if (settled.unloaded.length) lazy = `${settled.unloaded.length} of its ${settled.lazy} lazy image(s) had not loaded ${secs(LAZY_SETTLE_MS)} into the settle, so their boxes are read as the browser left them: ${settled.unloaded.join(", ")}`;
    const untie = args.book.tied ? { ...args.book.tied, regions } : null;
    const read = async () => {
      if (untie) await page.evaluate(UNTIE_CARDS, untie);
      await page.evaluate(normaliseQuestionBreakClocks, args.book.clock);
      const chart = await page.evaluate(SETTLE_QUESTION_CHART);
      if (chart.some((x) => !x.styleRestored || x.originalWidth !== x.restoredWidth)) throw new Error("question chart settle did not restore its exact container");
      return page.evaluate(SNAPSHOT, args);
    };
    const seen = (s) => JSON.stringify([s.url, s.regions, s.journey, s.masked]);
    let snap = await read();
    let stable = false;
    for (let i = 0; i < 6 && !stable; i++) {
      await page.waitForTimeout(700);
      const next = await read();
      stable = seen(next) === seen(snap);
      snap = next;
    }
    const cell = toQuestionCell(snap, { status, stable, raw: rawOf(body), pageErrors: [...new Set(pageErrors)].sort(), devOnly: [...new Set(devOnly)].sort(), ...notesOf([needle, lazy]) });
    for (const [name, id] of Object.entries(ids ?? {})) if (id) cell.landed = cell.landed.split(id).join(`:${name}`);
    return cell;
  } catch (e) {
    return { error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** S8 WP1 · the cards the guest's /markets draws (en, 1280), each by its id, title and state; null when it was not read. */
async function boardCardsOf() {
  const ctx = await b.newContext({ viewport: { width: 1280, height: HEIGHT } });
  try {
    await ctx.addCookies([localeCookie("en")]);
    const page = await ctx.newPage();
    await open(page, "/markets", null);
    const snap = await page.evaluate(SNAPSHOT, bookArgsOf("/markets"));
    return { board: (snap.cards ?? []).map((c) => ({ id: c.id, title: c.title, state: cardStateOf(c) })) };
  } catch (e) {
    return { board: null, boardError: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** S8 WP1 · how long the phase waits, at most, for the held tickets' free windows to close (a default poll's is 5:00). */
const FREE_WAIT_MS = 8 * 60_000;
/**
 * S8 WP1 · the held question read as the player (en, 1280) every 10 s until its holder section draws no free-window strip,
 * FREE_WAIT_MS at most: every Sell capture and book ticket on it was placed minutes before, and a window that closed during
 * the phase would make two runs disagree. Never a hang: what it saw is returned, and Q.0 fails a wait that ran out.
 */
async function waitFreeWindows(jar, held) {
  const t = Date.now();
  const ctx = await b.newContext({ viewport: { width: 1280, height: HEIGHT } });
  try {
    await ctx.addCookies([...jar, localeCookie("en")]);
    const page = await ctx.newPage();
    for (;;) {
      await page.goto(`${BASE}/markets/${held}`, { waitUntil: "load", timeout: 180_000 });
      await page.locator("main").first().waitFor({ timeout: 120_000 });
      const rows = await page.locator(`#main-content ${QUESTION_HOLDER} .ticket-target`).count();
      const strips = await page.locator(`#main-content ${QUESTION_HOLDER} .ticket-target > div[class~="mb-1.5"]`).count();
      if (rows > 0 && strips === 0) return { closed: true, ms: Date.now() - t, rows };
      if (Date.now() - t > FREE_WAIT_MS) return { closed: false, ms: Date.now() - t, rows, strips };
      await page.waitForTimeout(10_000);
    }
  } catch (e) {
    return { closed: false, ms: Date.now() - t, error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * ⭐ S8 WP1 · THE QUESTIONS, FOUND AND MADE THROUGH DEV-TEST DOORS THAT ALREADY EXIST (WP1 step 2; test:cert-devroutes),
 * after the book: the open question is the Sell capture's held one (`held`); the guest's /markets names the one-sided
 * question and three empty ones by card state, each state's cards in their titles' order (the board's own order ties on
 * minted ids); selection closed is seed-watchlist's first forced progress row (`progress`); the second empty question is
 * pulled a day into the past (fast-forward-market) so resolve-seed-markets { markets: 1 } takes it first (live[0] by
 * resolutionAt) and settles it; the third is pulled an hour into the past, closed by time — after the settle, so the door
 * cannot take it. Then the held tickets' free windows are waited out. ⛔ No new dev-test route and no admin console.
 */
async function seedQuestions(jar, held, progress) {
  const seed = { held, progress };
  const ctx = await b.newContext();
  try {
    await ctx.addCookies(jar);
    const post = async (door, data) => {
      const res = await ctx.request.post(`${BASE}/api/dev-test/${door}`, { data, timeout: 300_000 });
      return { status: res.status(), reply: await res.json().catch(() => null) };
    };
    Object.assign(seed, await boardCardsOf());
    const byTitle = (state) => (seed.board ?? []).filter((c) => c.state === state && c.id !== held)
      .sort((x, y) => (x.title < y.title ? -1 : x.title > y.title ? 1 : 0)).map((c) => c.id);
    const empties = byTitle("empty");
    seed.ids = { open: held ?? null, "one-sided": byTitle("one-sided")[0] ?? null, empty: empties[0] ?? null, "selection-closed": progress ?? null, "time-closed": empties[2] ?? null, settled: empties[1] ?? null };
    if (seed.ids.settled) {
      seed.settledForward = await post("fast-forward-market", { marketId: seed.ids.settled, seconds: -86_400 });
      if (seed.settledForward.status === 200 && seed.settledForward.reply?.ok) seed.resolved = await post("resolve-seed-markets", { markets: 1, stage: "complete", settle: true });
    }
    if (seed.ids["time-closed"]) seed.timeForward = await post("fast-forward-market", { marketId: seed.ids["time-closed"], seconds: -3_600 });
  } catch (e) {
    seed.error = msg(e);
  } finally {
    await ctx.close().catch(() => {});
  }
  seed.freeWait = held ? await waitFreeWindows(jar, held) : { closed: false, ms: 0, error: "no held question" };
  return seed;
}

/**
 * ⭐ S8 WP1 · A READER ON A BREAK (WP1 step 2): the demo player, signed in afresh, takes a cooling-off through
 * /profile/responsible-gambling's real form — its "take a break" button, then the confirm it opens (the period the form
 * holds by default) — which ends the session (coolOffAction) and lands on /auth/login?cooled=1; then signs in again
 * through its door, and that session is the break's. Taken LAST: the account stays on a break. Returns the jar, or why not.
 */
async function takeBreak() {
  const player = VIEWERS.find((v) => v.id === "player");
  const first = await signIn(player);
  if (!first.length) return { jar: [], error: "the demo player could not be signed in to take the break" };
  const ctx = await b.newContext({ viewport: { width: 1280, height: HEIGHT } });
  try {
    await ctx.addCookies([...first, localeCookie("en")]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "load", timeout: 180_000 });
    await page.locator("main").first().waitFor({ timeout: 120_000 });
    await hydrated(page);
    const form = page.locator('#main-content form:has([name="period"])').first();
    // The form's own trigger, not its period picker (the kit Select is a button too, role=combobox), pressed once its
    // own fiber exists (it hydrates after the shell, which is all hydrated() waits for).
    const trigger = form.locator('button[type="button"]:not([role="combobox"])').first();
    await trigger.waitFor({ timeout: 30_000 });
    await page.waitForFunction((el) => Object.keys(el).some((k) => k.startsWith("__reactFiber$")), await trigger.elementHandle(), { timeout: 60_000 });
    const label = (await trigger.innerText()).trim();
    await trigger.click();
    const dialog = page.locator(':is([role="dialog"],[role="alertdialog"])[aria-modal="true"]').last();
    await dialog.waitFor({ timeout: 10_000 });
    await page.waitForTimeout(600);   // the dialog's 400 ms arming beat (key-guard.tsx) and its focus
    await dialog.getByRole("button", { name: label, exact: true }).click();
    await page.waitForURL(/\/auth\/login\?cooled=1/, { timeout: 60_000 });
  } catch (e) {
    return { jar: [], error: `the cooling-off form: ${msg(e)}` };
  } finally {
    await ctx.close().catch(() => {});
  }
  const jar = await signIn(player);
  return jar.length ? { jar } : { jar: [], error: "the demo player could not be signed in again after the break" };
}

/**
 * ⭐ S8 WP1 · THE QUESTION PHASE: after the book, the questions are found and made (seedQuestions) and judged
 * (questionVerdict); a refused phase captures nothing, every cell says why, and Q.0 fails, so the baseline is INVALID.
 * Then the guest's cells, the player's, and last the break's (takeBreak).
 */
async function captureQuestions(still) {
  console.log(`${NL}§1q · the question page's classic body (S8 WP1): ${QUESTION.states.map((s) => s.id).join(" · ")} at ${QUESTION.widths.join("/")} × ${QUESTION.locales.join("/")} for ${QUESTION.viewers.join(", ")} — <main>, the bet panel and the holder section`);
  const keys = questionCellKeys();
  const skip = (why) => {
    for (const [k] of keys) if (!questionCells[k]) questionCells[k] = { error: `not captured: ${why}` };
    console.log(`  ✗ not captured: ${why}`);
  };
  const player = VIEWERS.find((v) => v.id === "player");
  const jar = await signIn(player);
  if (!jar.length) { questionSeed = { error: "the demo player could not be signed in" }; return skip(questionSeed.error); }
  questionSeed = await seedQuestions(jar, sellSeed?.held ?? null, bookSeed?.watchlist?.reply?.forcedProgress?.[0] ?? null);
  const verdict = questionVerdict(questionSeed);
  console.log(`  the questions: ${JSON.stringify(questionSeed.ids ?? null)} · the free windows ${questionSeed.freeWait?.closed ? `closed after ${secs(questionSeed.freeWait.ms)}` : "NOT closed"} · ${verdict.problems.length ? `REFUSED: ${verdict.problems.join(" · ")}` : "accepted"}`);
  if (verdict.problems.length) return skip(`the questions were refused (${verdict.problems.join(" · ")})`);
  const ids = questionSeed.ids;
  const run = async (v, vjar) => {
    await warm(vjar, [...new Set(QUESTION.states.filter((s) => s.viewers.includes(v)).map((s) => routeOfQuestion(s.route, ids)))]);
    for (const l of QUESTION.locales) {
      const t = Date.now();
      let n = 0;
      for (const [k, kv, kl, w, s] of keys) {
        if (kv !== v || kl !== l) continue;
        questionCells[k] = await captureQuestionCell(vjar, l, w, s, ids);
        n++;
        if (questionCells[k].error) console.log(`  ✗ ${k} — ${questionCells[k].error}`);
        sayNotes(k, questionCells[k]);
      }
      console.log(`  question-${v} · ${l} · ${n} cells · ${secs(Date.now() - t)}`);
      still(`by the end of question-${v} · ${l}`);
    }
  };
  await run("guest", []);
  await run("player", jar);
  const brk = await takeBreak();
  questionSeed.breakTaken = !brk.error;
  if (brk.error) { questionSeed.breakError = brk.error; return skip(brk.error); }
  await run("break", brk.jar);
}

/** Report only (WP0 step 4): how far the classic signed-in header runs past a 320 viewport. Not S6's to fix. */
async function header320(jar) {
  const out = {};
  for (const l of LOCALES) {
    const ctx = await b.newContext({ viewport: { width: 320, height: HEIGHT } });
    try {
      await ctx.addCookies([...jar, localeCookie(l)]);
      const page = await ctx.newPage();
      await open(page, "/", null);
      out[l] = await page.evaluate(() => {
        const h = document.querySelector("header.app-topbar");
        if (!h) return null;
        const vw = document.documentElement.clientWidth;
        let right = 0, rightmost = "";
        for (const el of h.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && r.right > right) { right = r.right; rightmost = el.getAttribute("aria-label") || el.getAttribute("data-testid") || el.tagName.toLowerCase(); }
        }
        const row = h.firstElementChild;
        return { viewport: vw, pastRight: Math.round((right - vw) * 10) / 10, rightmost, rowOverflow: row ? row.scrollWidth - row.clientWidth : null };
      });
    } catch (e) {
      out[l] = { error: msg(e) };
    } finally {
      await ctx.close().catch(() => {});
    }
  }
  return out;
}

const cells = {};
/** WP10 · the Sell capture's cells (keyed `sell|locale|width|place`) and the seed that made the open ticket. */
const sellCells = {};
let sellSeed = null;
/** S7 WP1 · the book's cells (keyed `book-<viewer>|locale|width|route`), and its seed: the three replies, the probe, the strip's wait. */
const bookCells = {};
let bookSeed = null;
/** S8 WP1 · the question phase's cells (keyed `question-<viewer>|locale|width|route`), and its seed: the questions and the doors' replies. */
const questionCells = {};
let questionSeed = null;
let report320 = null;
let treeMoved = null;
try {
  if (QUESTION_CALIBRATE) { await proveQuestionCalibration(); await proveHomeDateCalibration(); }
  else if (PROVE_RED) await proveRed();
  else await captureMatrix();
} finally {
  await b.close();
}
if (QUESTION_CALIBRATE) {
  const failed = results.filter((result) => !result).length;
  console.log(`\n${results.length - failed}/${results.length} passed — rendered question and home-date calibration (no server fixture touched)`);
  process.exit(failed ? 1 : 0);
}

async function captureMatrix() {
  const still = (when) => { if (!treeMoved && treePrint() !== PRINT0) treeMoved = `the served files changed ${when}`; };
  for (const v of VIEWERS) {
    console.log(`\n§1 · ${v.who}`);
    const jar = await signIn(v);
    if (v.door && !jar.length) {
      for (const l of LOCALES) for (const w of WIDTHS) for (const r of ROUTES) cells[keyOf(v.id, l, w, r)] = { error: "the viewer could not be signed in" };
      continue;
    }
    if (v.id === "guest" || v.id === "player") await warm(jar, ROUTES);
    for (const l of LOCALES) {
      const t = Date.now();
      for (const w of WIDTHS) {
        for (const r of ROUTES) {
          const k = keyOf(v.id, l, w, r);
          cells[k] = await capture(jar, l, w, r);
          if (cells[k].error) console.log(`  ✗ ${k} — ${cells[k].error}`);
          sayNotes(k, cells[k]);
        }
      }
      console.log(`  ${v.id} · ${l} · ${WIDTHS.length * ROUTES.length} cells · ${secs(Date.now() - t)}`);
      still(`by the end of ${v.id} · ${l}`);
    }
    if (BASELINE && v.id === "player") report320 = await header320(jar);
  }
  // WP10 · the Sell capture comes after the matrix: it gives the demo player a portfolio, and every cell above read it empty.
  await captureSell();
  // S7 WP1 · then the book (A8): it seeds through the same player, after the Sell capture's { markets: 5 }.
  await captureBook(still);
  // S8 WP1 · and the question page last: it reads the book's world, and its reader on a break ends the session for good.
  await captureQuestions(still);
  still("by the end of the capture");
}

/** The same reader and Q.6 verdict used by a real capture, exercised on rendered clocks and visible controls. */
async function proveQuestionCalibration() {
  const page = await b.newPage({ viewport: { width: 1280, height: HEIGHT } });
  const key = keyOf("question-break", "en", 1280, "/markets/:empty");
  const first = "2026-10-13T12:00:00.123Z", next = "2026-10-13T12:37:00.123Z";
  const take = async (o = {}) => {
    const event = { "@context": "https://schema.org", "@type": "Event", name: o.eventWord ?? "Rain", startDate: o.eventClock ?? first, endDate: o.eventClock ?? first, organizer: { name: "50pick", startDate: o.nestedClock ?? first }, location: { url: o.eventUrl ?? "/markets/fixed" } };
    await page.setContent(`<!doctype html><html lang="en"><head><style>.whitespace-nowrap{white-space:nowrap}.date{font:13px Arial;padding:${o.padding ?? 0}px;font-family:${o.font ?? "Arial"}}.axis{width:${o.axis ?? 114}px;height:20px}</style></head><body>
      <main id="main-content"><script type="application/ld+json">${JSON.stringify(event)}</script><aside aria-labelledby="bet-panel-heading"><h2 id="bet-panel-heading">Place your stake</h2><div data-testid="market-bet-break"><p>${o.words ?? "A break is active until"} <span class="whitespace-nowrap date">${o.date ?? "14 Oct, 13:43"}</span>. Betting is paused.${o.extra ? '<span class="whitespace-nowrap date">14 Oct, 13:43</span>' : ""}</p></div><a href="/auth/${o.authDoor ?? "login"}?next=%2F${o.returnRoute ?? "markets"}%2Fmkt_${o.marketId ?? "4f9c2a7b1e0d3c5a8b6e"}${o.returnQuery ?? "%3Fside%3DYES%26stake%3D500%26keep%3D1"}">${o.authWords ?? "Continue"}</a></aside>
      <section class="order-2"><section class="bg-bg-elevated"><p data-testid="market-break">A break is active until <span class="whitespace-nowrap date">${o.date ?? "14 Oct, 13:43"}</span>.</p></section></section>
      <div class="tv-lightweight-charts"><table><tr><td class="axis">plot</td><td>price</td></tr><tr><td>time axis</td></tr></table></div><p>${o.money ?? "TZS 1,234"}</p><time datetime="${o.visibleDate ?? first}">${o.visibleDate ?? first}</time></main></body></html>`);
    if (o.chartStyle !== undefined) await page.locator("#main-content").evaluate((el, style) => el.setAttribute("style", style), o.chartStyle);
    const args = questionArgsOf("en");
    await page.evaluate(normaliseQuestionBreakClocks, args.book.clock);
    const settled = await page.evaluate(SETTLE_QUESTION_CHART);
    const snap = await page.evaluate(SNAPSHOT, args);
    const cell = toQuestionCell(snap, { status: 200, stable: true, raw: { shell: true, trace: [] }, pageErrors: [], devOnly: [] });
    cell.landed = "/markets/:empty";
    return { cell, settled };
  };
  const q6 = (cell) => { const sample = syntheticQuestion(); sample.question[key] = cell; return questionChecks(sample.question, sample.seed, { ...sample.store, ...blobs }).find((c) => c.id === "Q.6").fails; };
  const fields = (a, c) => diffCells("/markets/:empty", a, c, blobs, blobs, QUESTION_EXPECTED_DIFFS).unexpected;
  try {
    const clean = await take();
    ok("P.8t clean rendered clocks pass the real Q.6 exact population verdict; chart settle restores its original width and style", q6(clean.cell).length === 0 && clean.settled.length === 1 && clean.settled.every((s) => s.styleRestored && s.originalWidth === s.restoredWidth), JSON.stringify({ clocks: q6(clean.cell), settled: clean.settled }));
    for (const style of ["", "position: relative; width: 1120px; padding: 3px 7px;"]) {
      const styled = await take({ chartStyle: style });
      ok(`P.8t chart settle restores an ${style ? "existing nonempty" : "existing empty"} style attribute byte for byte`, styled.settled.length === 1 && styled.settled.every((s) => s.styleRestored && s.originalWidth === s.restoredWidth) && await page.locator("#main-content").getAttribute("style") === style);
    }
    const shifted = await take({ date: "14 Oct, 14:21", eventClock: next });
    ok("P.8t only the two inert seed clocks and exact two A17 date leaves move: the same real diff verdict compares every region equal", fields(clean.cell, shifted.cell).length === 0 && q6(shifted.cell).length === 0);
    const freshId = await take({ marketId: "17e07a91ecf526c2ae17" });
    ok("P.8t a freshly seeded market id inside the encoded return target alone moves no region under the same real diff verdict", fields(clean.cell, freshId.cell).length === 0);
    for (const [name, o, need] of [
      ["date font", { font: "monospace" }, "regions.panel.layout"], ["date padding", { padding: 3 }, "regions.panel.layout"],
      ["surrounding words", { words: "A wrong notice until" }, "regions.panel.html"], ["visible money", { money: "TZS 9,876" }, "regions.main.html"],
      ["visible timestamp", { visibleDate: next }, "regions.main.html"], ["event words", { eventWord: "Snow" }, "regions.main.html"],
      ["event URL", { eventUrl: "/markets/changed" }, "regions.main.html"], ["nested clock", { nestedClock: next }, "regions.main.html"],
      ["chart table width", { axis: 130 }, "regions.main.layout"],
      ["auth door", { authDoor: "register" }, "regions.panel.html"], ["return route", { returnRoute: "positions" }, "regions.panel.html"],
      ["return side", { returnQuery: "%3Fside%3DNO%26stake%3D500%26keep%3D1" }, "regions.panel.html"],
      ["return stake", { returnQuery: "%3Fside%3DYES%26stake%3D501%26keep%3D1" }, "regions.panel.html"],
      ["other return query", { returnQuery: "%3Fside%3DYES%26stake%3D500%26keep%3D2" }, "regions.panel.html"], ["auth words", { authWords: "Wrong" }, "regions.panel.html"],
      ["malformed market id", { marketId: "4f9c2a7b1e0d3c5a8b6ebad" }, "regions.panel.html"],
    ]) { const changed = await take(o); const diff = fields(clean.cell, changed.cell); ok(`P.8t ${name} stays detected by the real diff verdict (${need})`, diff.some((d) => d.field === need), diff.map((d) => d.field).join(", ")); }
    for (const [name, date] of [["missing comma", "14 Oct 13:43"], ["impossible day", "31 Feb, 13:43"], ["wrong locale", "14 Okt, 13:43"], ["year zero", "14 Oct 0000, 13:43"]]) {
      const changed = await take({ date }); ok(`P.8t ${name} fails the same real Q.6 clock population verdict`, q6(changed.cell).length > 0);
    }
    const extra = await take({ extra: true }); ok("P.8t an extra clock leaf fails the same real Q.6 exact population verdict", q6(extra.cell).length > 0);
  } catch (e) { ok("P.8t the rendered question calibration completes", false, msg(e)); }
  finally { await page.close().catch(() => {}); }
}

/** Rendered home leaves pass through the exact pre-geometry reader, book diff and B.9 population verdict. */
async function proveHomeDateCalibration() {
  const page = await b.newPage({ viewport: { width: 360, height: HEIGHT } });
  const key = keyOf('book-guest', 'en', 360, '/');
  const take = async (locale, o = {}) => {
    const prefix = BOOK_HOME_CLOSE_DATE.prefixes[locale];
    const date = o.date ?? (locale === 'sw' ? '14 Okt' : '14 Oct');
    const leaf = `<span class="kp-qrow__close${o.extraClass ? ' kp-parity-class' : ''}"${o.rowStyle ? ` style="${o.rowStyle}"` : ''}>${o.words ?? prefix}${date}</span>`;
    await page.setContent(`<!doctype html><html lang="${locale}"><head><style>
      .mcardp-src__part,.kp-qrow__close{font:13px Arial;color:rgb(80,80,80);padding:0;display:inline-block}
      .source{display:inline-block} .kp-qrow{display:flex;gap:8px}
      ${o.css ?? ''}</style></head><body><main id="main-content">
      <section class="kp-hero"><article class="mcardp"><span class="mcardp-src__part">${o.featuredWords ?? prefix}${date}</span><span class="mcardp-src__part"><span> · </span>${o.source ?? 'Settles on bot.go.tz'}</span></article></section>
      <ul class="kp-qboard">${Array.from({length: HOME_BOARD_SIZE}, () => `<li class="kp-qrow">${leaf}<span class="source">TZS 1,234</span></li>`).join('')}${o.extra ? `<li class="kp-qrow">${leaf}</li>` : ''}</ul>
      <p class="ordinary">${o.ordinary ?? 'Other words'}</p></main></body></html>`);
    const homeCloseDates = await page.evaluate(normaliseBookHomeCloseDates, { ...BOOK_HOME_CLOSE_DATE, locale });
    const snap = await page.evaluate(SNAPSHOT, bookArgsOf('/'));
    const cell = toBookCell(snap, { status: 200, stable: true, homeCloseDates, raw: { shell: true, trace: [] }, pageErrors: [], devOnly: [] });
    cell.landed = '/';
    return cell;
  };
  const b9 = (cell) => { const sample = syntheticBook(); sample.book[key] = cell; return bookChecks(sample.book, sample.seed, {...sample.store, ...blobs}).find((c) => c.id === 'B.9').fails; };
  const fields = (a, c) => diffCells('/', a, c, blobs, blobs, BOOK_EXPECTED_DIFFS).unexpected;
  try {
    for (const locale of ['en', 'sw']) {
      const clean = await take(locale);
      ok(`P.8u ${locale} home has exactly the source's one featured plus ${HOME_BOARD_SIZE} row leaves under the real B.9 verdict`, b9(clean).length === 0, JSON.stringify(clean.homeCloseDates));
      const shifted = await take(locale, { date: locale === 'sw' ? '13 Okt' : '13 Oct' });
      ok(`P.8u ${locale} a valid close day alone changes no field under the real book diff after pre-geometry canonicalization`, fields(clean, shifted).length === 0 && b9(shifted).length === 0);
      for (const [name, o, need] of [
        ['paint', {css: '.kp-qrow__close{color:rgb(255,0,0)}'}, 'regions.main.layout'],
        ['font', {css: '.kp-qrow__close{font-family:monospace}'}, 'regions.main.layout'],
        ['padding', {css: '.kp-qrow__close{padding:3px}'}, 'regions.main.layout'],
        ['inline style', {rowStyle: 'letter-spacing:2px'}, 'regions.main.html'],
        ['class', {extraClass: true}, 'regions.main.html'],
        ['close words', {words: 'Wrong close words '}, 'regions.main.html'],
        ['featured words', {featuredWords: 'Wrong close words '}, 'regions.main.html'],
        ['source words', {source: 'Wrong source'}, 'regions.main.html'],
        ['surrounding words', {ordinary: 'Changed outside date'}, 'regions.main.html'],
      ]) {
        const changed = await take(locale, o), diff = fields(clean, changed);
        ok(`P.8u ${locale} home date ${name} remains detected by the real book diff (${need})`, diff.some((d) => d.field === need), diff.map((d) => d.field).join(', '));
      }
      for (const [name, date] of [
        ['malformed format', locale === 'sw' ? '14, Okt' : '14, Oct'],
        ['impossible calendar day', '31 Feb'],
        ['wrong locale month', locale === 'sw' ? '14 Oct' : '14 Okt'],
        ['year zero', locale === 'sw' ? '14 Okt 0000' : '14 Oct 0000'],
      ]) {
        const changed = await take(locale, {date});
        ok(`P.8u ${locale} ${name} fails the real B.9 exact population verdict`, b9(changed).length > 0);
      }
      const extra = await take(locale, {extra: true});
      ok(`P.8u ${locale} an extra valid close-date leaf fails the real B.9 exact population verdict and book diff`, b9(extra).length > 0 && fields(clean, extra).length > 0);
    }
  } catch(e) { ok('P.8u rendered home-date calibration completes', false, msg(e)); }
  finally { await page.close().catch(() => {}); }
}

async function proveRed() {
  await proveQuestionCalibration();
  await proveHomeDateCalibration();
  console.log(`\n§P · the control — first on synthetic captures, then planted in the browser`);
  // ① The EXPECTED_DIFFS matcher: it must pass what it names and nothing beside it.
  const store = { f1: '<footer class="pad-old">x</footer>', f2: '<footer class="pad-new">x</footer>', f3: '<footer class="pad-new">y</footer>' };
  const cell = (status, footer) => ({ status, landed: "/", overlays: [], journey: [], raw: { shell: true, trace: [] }, pageErrors: [], footerPaddingBottom: "88px", scrollPaddingBottom: "auto", regions: { footer: { count: 1, html: footer, layout: null } } });
  const run = (route, a, c, list = EXPECTED_DIFFS) => diffCells(route, a, c, store, store, list);
  const same = run("/", cell(200, "f1"), cell(200, "f1"));
  ok("P.1 identical cells differ in nothing", same.unexpected.length === 0 && same.expected.length === 0);
  // The new owed-check calibration is narrow: only a masked date's x/width and its resulting auto margin disappear.
  {
    const html = '<main><article><span class="mcardp-meta-right"><span class="mcardp-timeleft">~date</span></span></article></main>';
    const parent = "main>article0>span0", child = `${parent}>span0`;
    const sample = (x, width, margin, y = 30, colour = "rgb(1, 2, 3)", path = parent) => {
      const own = {};
      const sig = `display:flex${NL}margin-left:${margin}px${NL}color:${colour}`;
      const inner = `display:inline${NL}margin-left:0px${NL}color:rgb(1, 2, 3)`;
      const id = (s) => { const key = createHash("sha1").update(s).digest("hex").slice(0, 12); own[key] = s; return key; };
      const layout = `${path} ${x},${y},${width}x17 ${id(sig)}${NL}${child} ${x},${y},${width}x17 ${id(inner)}`;
      return steadyTimeLeftLayout(layout, html, own);
    };
    const was = sample(20, 70, 12), moved = sample(18, 72, 14);
    ok("P.1c the same masked live date keeps its right edge across fresh servers; a lost alignment, vertical move, colour or path change remains visible",
      timeLeftPaths(html).size === 2 && was === moved && was !== sample(18, 72, 14, 31)
      && was !== sample(2, 72, 0)
      && was !== sample(18, 72, 14, 30, "rgb(9, 2, 3)") && was !== sample(18, 72, 14, 30, "rgb(1, 2, 3)", "main>article0>span9"));
  }
  // PHOSPHOR-MIGRATION W2 · the sprite name's hash is read as ~, and nothing else in a glyph is: another symbol, another
  // group or another file still differs.
  const glyphAt = (href) => norm(`<svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true" data-g="clock.bold"><use href="${href}"></use></svg>`);
  ok("P.1b a glyph's sprite hash is read as ~ (/icons/g/app.~.svg#…), and another symbol, group or file still differs",
    glyphAt("/icons/g/app.304710bb.svg#p-clock-bold") === glyphAt("/icons/g/app.0a1b2c3d.svg#p-clock-bold")
      && glyphAt("/icons/g/app.304710bb.svg#p-clock-bold").includes('href="/icons/g/app.~.svg#p-clock-bold"')
      && glyphAt("/icons/g/app.304710bb.svg#p-clock-bold") !== glyphAt("/icons/g/app.304710bb.svg#p-clock-regular")
      && glyphAt("/icons/g/app.304710bb.svg#p-clock-bold") !== glyphAt("/icons/g/admin.304710bb.svg#p-clock-bold")
      && glyphAt("/icons/g/app.304710bb.svg#p-clock-bold") !== glyphAt("/icons/g/app.svg#p-clock-bold"));
  const ring = (dash, word, klass = "shrink-0", label = "Selection closes") => `<svg width="44" height="44" role="img" aria-label="${label}" class="${klass}"><circle cx="22" cy="22" r="19" stroke="var(--bg-overlay)"></circle><circle cx="22" cy="22" r="19" stroke="var(--aqua-400)" stroke-dasharray="119" stroke-dashoffset="${dash}"></circle><text x="50%">${word}</text></svg>`;
  ok("P.1d the open-ticket countdown's numeric value is masked, while its accessible status, arc ink, shape and another SVG remain compared",
    norm(ring(12.2, "3d")) === norm(ring(12.6, "2d"))
      && norm(ring(12.2, "3d")).includes('stroke-dashoffset="~"')
      && norm(ring(12.2, "3d")).includes('aria-label="Selection closes"')
      && norm(ring(12.2, "3d")) !== norm(ring(12.6, "2d", "shrink-0", "Selection closed"))
      && norm(ring(12.2, "3d")) !== norm(ring(12.2, "3d").replace("aqua-400", "no-400"))
      && norm(ring(12.2, "3d")) !== norm(ring(12.2, "3d").replace('r="19"', 'r="18"'))
      && norm(ring(12.2, "3d", "other")) !== norm(ring(12.6, "2d", "other")));
  {
    let reads = 0, loads = 0, replants = 0;
    const interrupted = {
      evaluate: async () => { if (++reads === 1) throw new Error("Execution context was destroyed"); return { landed: true }; },
      waitForLoadState: async () => { loads++; },
      locator: () => ({ first: () => ({ waitFor: async () => {} }) }),
      waitForFunction: async () => true,
      addStyleTag: async () => { replants++; },
    };
    const resumed = await evaluateStableSnapshot(interrupted, {}, { css: "header { color: red; }" });
    let refused = false;
    try { await evaluateStableSnapshot({ evaluate: async () => { throw new Error("real snapshot failure"); } }, {}, null); }
    catch (e) { refused = String(e).includes("real snapshot failure"); }
    ok("P.1e one document replacement is retried after load, hydration and plant; another snapshot failure is reported",
      resumed.landed === true && reads === 2 && loads === 1 && replants === 1 && refused);
  }
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
  // PHOSPHOR-MIGRATION W2 · the glyph swap's element-by-element maps (applyGlyphSwap): a field whose every changed glyph
  // and moved line they name is expected; one more change beside them — another svg, a word, a line they do not name —
  // is still caught.
  {
    const OLD = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M1 1"></path></svg>';
    const NEW = '<svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true" data-g="clock.bold"><use href="/icons/g/app.~.svg#p-clock-bold"></use></svg>';
    const gs = { f: `<div>a${OLD}b</div>`, g: `<div>a${NEW}b</div>`, h: `<div>a${NEW}c</div>`, i: `<div>a${NEW}b${NEW}</div>`,
      la: ["div 0,0,10x10 s1", "div>svg0 0,0,14x14 s2", "div>svg0>path0 1,1,2x2 s3", "div>span1 20,0,4x4 s4"].join(NL),
      lb: ["div 0,0,10x10 s1", "div>svg0 0,0,14x14 s5", "div>svg0>use0 1,1,12x12 s3", "div>span1 21,0,4x4 s4"].join(NL),
      lc: ["div 0,0,10x10 s1", "div>svg0 0,0,14x14 s5", "div>svg0>use0 1,1,12x12 s3", "div>span1 22,0,4x4 s4"].join(NL) };
    const SWAP = [
      { id: "control-glyph-html", field: "regions.footer.html", glyphs: { svg: { [OLD]: NEW }, block: {}, line: {} }, reason: "the control" },
      { id: "control-glyph-layout", field: "regions.footer.layout", glyphs: { svg: {}, line: { "div>span1 20,0,4x4 s4": "div>span1 21,0,4x4 s4" },
        block: { [["div>svg0 0,0,14x14 s2", "div>svg0>path0 1,1,2x2 s3"].join(NL)]: ["div>svg0 0,0,14x14 s5", "div>svg0>use0 1,1,12x12 s3"].join(NL) } }, reason: "the control" },
    ];
    const gcell = (html, layout) => ({ ...cell(200, html), regions: { footer: { count: 1, html, layout } } });
    const grun = (a, c) => diffCells("/", a, c, gs, gs, SWAP);
    const named = grun(gcell("f", "la"), gcell("g", "lb")), word = grun(gcell("f", "la"), gcell("h", "lb")), extra = grun(gcell("f", "la"), gcell("i", "lb")), moved = grun(gcell("f", "la"), gcell("g", "lc"));
    ok("P.5y a glyph swap named element by element is expected — its markup and its lines; a word beside it, a second glyph and a line moved further are each still caught",
      named.unexpected.length === 0 && named.expected.length === 2 && word.unexpected.length === 1 && extra.unexpected.length === 1 && moved.unexpected.length === 1,
      JSON.stringify({ named, word, extra, moved }).slice(0, 300));
  }
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
    // The /positions pair alone: the generated glyph-swap entries (PHOSPHOR-MIGRATION W3's rail layout, beside its markup)
    // carry `alongside` too, and are held by the same §4.2b rule in the run itself.
    const along = EXPECTED_DIFFS.filter((e) => e.alongside === "positions-empty-state");
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

  // ②c S7 WP1 · the book's normalisers (WP1 step 4): each text normaliser maps its own sample to what it names, leaves its
  // control as it is, is idempotent, does work `norm` does not (it runs after it), rewrites no other normaliser's sample,
  // and acts exactly when it is switched on; each page normaliser is handed to the page (its `book[arg]`) only when on.
  {
    const on = (n) => BOOK.normalise.includes(n.id);
    const texts = BOOK_NORMALISERS.filter((n) => n.kind === "text");
    const pages = BOOK_NORMALISERS.filter((n) => n.kind === "page");
    const fails = [];
    for (const n of texts) {
      const mapped = n.apply(n.sample);
      if (mapped !== n.expect) fails.push(`${n.id} maps its sample to ${JSON.stringify(mapped)}, not ${JSON.stringify(n.expect)}`);
      if (n.apply(n.control) !== n.control) fails.push(`${n.id} moves its control to ${JSON.stringify(n.apply(n.control))}`);
      if (n.apply(mapped) !== mapped) fails.push(`${n.id} is not idempotent`);
      if (n.apply(norm(n.sample)) === norm(n.sample)) fails.push(`${n.id} does nothing \`norm\` has not done`);
      for (const o of texts) if (o !== n && o.apply(norm(n.sample)) !== norm(n.sample)) fails.push(`${o.id} also rewrites ${n.id}'s sample`);
      if ((bookNorm(n.sample) !== norm(n.sample)) !== on(n)) fails.push(`${n.id} ${on(n) ? "is on and does not act" : "acts while it is off"}`);
    }
    for (const n of pages) for (const r of BOOK.routes) {
      const book = bookArgsOf(r).book;
      if (!n.arg || !(n.arg in book) || n.hands == null) { fails.push(`${n.id} names no book argument it hands the page`); continue; }
      if (book[n.arg] !== (on(n) ? n.hands : null)) fails.push(`${n.id} hands the page ${JSON.stringify(book[n.arg])} on ${r} while it is ${on(n) ? "on" : "off"}`);
    }
    const ids = BOOK_NORMALISERS.map((n) => n.id);
    if (new Set(ids).size !== ids.length || texts.length + pages.length !== ids.length) fails.push("each candidate is one id, of kind text or page");
    ok(`P.8n each candidate text normaliser (${texts.map((n) => n.id).join(", ")}) maps its own sample, leaves its control as it is, is idempotent, does work \`norm\` does not, and acts exactly when it is switched on (this run: ${BOOK.normalise.join(", ") || "none"}); each page normaliser (${pages.map((n) => n.id).join(", ")}) is handed to the page only when on`,
      fails.length === 0, JSON.stringify(fails).slice(0, 400));
  }
  // ②c2 S7 WP1 calibration 2 · tied-cards on synthetic trees: UNTIE_CARDS, the function the page runs, on trees of grid
  // cards built as market-card.tsx draws one (its V18 surface, its stretched link, its source and every figure in its
  // part) out of exactly the DOM the function uses, each tree's markup then read through the book's own compare. (a) Two
  // cards that state the same figures come out of either order identical, in their titles' order — so do three in every
  // order, a tied pair between two unlike cards (which keep their places), and two that differ only in their source;
  // (b) two that differ in any one figure — pool, time, state, price, predictors or pick — or in their kind of surface
  // keep their order, so a swap of them is still reported in the body's field; (c) a run of one card, a list of
  // non-cards, cards without a V18 surface, and two tied cards that do not stand side by side (another element, or a text,
  // between them) are untouched; and a second pass moves nothing.
  {
    const sibling = (n) => { const s = n.parentNode ? n.parentNode.childNodes : null; return s ? s[s.indexOf(n) + 1] ?? null : null; };
    const text = (data) => ({ nodeType: 3, data, childNodes: [], parentNode: null, get textContent() { return this.data; }, get nextSibling() { return sibling(this); } });
    const el = (tag, attrs = {}, children = []) => {
      const n = {
        nodeType: 1, tag, attrs, childNodes: [], parentNode: null,
        get textContent() { return this.childNodes.map((c) => c.textContent).join(""); },
        get nextSibling() { return sibling(this); },
        getAttribute: (a) => (a in attrs ? String(attrs[a]) : null),
        // As the DOM does: a node that is already in a tree is taken out of it first.
        insertBefore(c, ref) {
          if (c.parentNode) c.parentNode.childNodes.splice(c.parentNode.childNodes.indexOf(c), 1);
          const at = ref ? this.childNodes.indexOf(ref) : this.childNodes.length;
          if (at < 0) throw new Error("insertBefore: the reference node is not a child");
          this.childNodes.splice(at, 0, c);
          c.parentNode = this;
          return c;
        },
      };
      for (const c of children) n.insertBefore(c, null);
      return n;
    };
    const markup = (n) => (n.nodeType === 3 ? n.data : `<${n.tag}${Object.entries(n.attrs).map(([k, v]) => ` ${k}="${v}"`).join("")}>${n.childNodes.map(markup).join("")}</${n.tag}>`);
    // The defaults are a fresh card's figures: the four tied cards 090bbf76's null pair reordered stated these.
    const FRESH = { state: "No bets yet", predictors: "Be the first to predict", pick: "YESNO", pool: "No pool yet", time: "5d left" };
    const card = (q, figures = {}, { source = "CoinGecko", surface = "card" } = {}) => {
      const f = { ...FRESH, ...figures };
      const part = (name, tag, cls) => el(tag, { class: cls, "data-market-part": name }, [text(f[name])]);
      return el("article", { "data-row-id": "mkt_~", ...(surface ? { "data-market-surface": surface } : {}), class: "mcardp group" }, [
        el("a", { class: "mcardp-open", "aria-label": q, href: "/markets/mkt_~" }),
        el("div", { class: "mcardp-head" }, [
          el("div", { class: "mcardp-qwrap" }, [el("h3", { class: "mcardp-q" }, [text(q)]), el("p", { class: "mcardp-src" }, [el("span", { class: "mcardp-srcname", "data-market-part": "source" }, [text(source)])])]),
          f.price ? part("price", "div", "mcardp-prob") : el("div", { class: "mcardp-prob" }, [el("div", { class: "mcardp-pct mcardp-pct--empty" }, [text("—")])]),
        ]),
        part("state", "div", "mcardp-nobets"),
        el("div", { class: "mcardp-traders" }, [part("predictors", "span", "t-txt")]),
        part("pick", "div", "mcardp-actions"),
        el("div", { class: "mcardp-meta" }, [part("pool", "span", "mcardp-nopool"), el("span", { class: "mcardp-meta-right" }, [part("time", "span", "mcardp-timeleft live")])]),
      ]);
    };
    const grid = (...children) => el("main", { id: "main-content" }, [el("div", { class: "market-grid" }, children)]);
    const untie = (t) => UNTIE_CARDS({ ...TIED_CARDS, regions: [] }, [t]);
    const titles = (t) => t.childNodes[0].childNodes.filter((c) => c.nodeType === 1).map((c) => c.childNodes[0]?.attrs?.["aria-label"] ?? c.tag);
    const store = {};
    const keep = (s) => { const id = `o${Object.keys(store).length}`; store[id] = s; return id; };
    const cellOf = (t) => ({ status: 200, stable: true, landed: "/markets", pageErrors: [], journey: [], raw: { shell: true, trace: [] }, regions: { main: { count: 1, html: keep(bookNorm(markup(t))), layout: null } } });
    const reported = (t1, t2) => diffCells("/markets", cellOf(t1), cellOf(t2), store, store, BOOK_EXPECTED_DIFFS).unexpected.map((d) => d.field);
    const BTC = "Will Bitcoin close above $90,000 next Sunday?", ETH = "Will Ethereum close above $3,500 next Sunday?", SOL = "Will Solana close above $200 next Sunday?";
    const FIRST = "Will Arusha get measurable rainfall on Saturday?", LAST = "Will Zanzibar see a full sunny day this Friday?";
    // (a) the same figures, in either order (or every order) → one markup, in the titles' order
    const tiedFails = [];
    {
      const was = grid(card(ETH), card(BTC)), now = grid(card(BTC), card(ETH));
      const moves = [untie(was), untie(now)];
      if (moves.join() !== "2,0" || titles(was).join("|") !== [BTC, ETH].join("|") || reported(was, now).length) tiedFails.push(`a tied pair: moved ${moves}, read ${titles(was).join(" | ")}, reported ${reported(was, now)}`);
      const orders = [[BTC, ETH, SOL], [BTC, SOL, ETH], [ETH, BTC, SOL], [ETH, SOL, BTC], [SOL, BTC, ETH], [SOL, ETH, BTC]].map((qs) => grid(...qs.map((q) => card(q))));
      orders.forEach(untie);
      if (orders.some((t) => markup(t) !== markup(orders[0])) || titles(orders[0]).join("|") !== [BTC, ETH, SOL].join("|")) tiedFails.push(`three tied cards: ${orders.map((t) => titles(t).map((q) => q.split(" ")[1]).join(",")).join(" / ")}`);
      const unlike = (pair) => grid(card(LAST, { pool: "TZS 9,000", predictors: "4 predictors" }), ...pair.map((q) => card(q)), card(FIRST, { pool: "TZS 1,000", predictors: "1 predictor" }));
      const around = [unlike([ETH, BTC]), unlike([BTC, ETH])];
      around.forEach(untie);
      if (reported(around[0], around[1]).length || titles(around[0]).join("|") !== [LAST, BTC, ETH, FIRST].join("|")) tiedFails.push(`a tied pair between two unlike cards: read ${titles(around[0]).join(" | ")}`);
      const sourced = [grid(card(ETH, {}, { source: "Binance" }), card(BTC)), grid(card(BTC), card(ETH, {}, { source: "Binance" }))];
      sourced.forEach(untie);
      if (reported(sourced[0], sourced[1]).length) tiedFails.push("two cards that differ only in their source were not read as tied");
    }
    ok("P.8o (a) tied-cards (UNTIE_CARDS, the function the page runs, on synthetic trees read through the book's compare): two cards that state the same figures come out of either order identical, in their titles' order — as do three in every order, a tied pair between two unlike cards (which keep their places), and two that differ only in their source",
      tiedFails.length === 0, JSON.stringify(tiedFails).slice(0, 400));
    // (b) one figure apart, or another kind of surface → each keeps its order, and a swap is reported
    const OTHER = { pool: "TZS 5,000", time: "4d left", state: "One side only", price: "YES61%", predictors: "2 predictors", pick: "YES @ 61%NO @ 39%" };
    const apartFails = [];
    for (const [what, a, z] of [
      ...Object.keys(OTHER).map((fig) => {
        const base = fig === "price" ? { price: "YES60%" } : {};
        return [fig, () => card(FIRST, { ...base, [fig]: OTHER[fig] }), () => card(LAST, base)];
      }),
      ["surface", () => card(FIRST, {}, { surface: "board" }), () => card(LAST)],
    ]) {
      const was = grid(z(), a()), now = grid(a(), z());
      const moves = [untie(was), untie(now)];
      const seen = reported(was, now);
      if (moves.join() !== "0,0" || seen.join() !== "regions.main.html") apartFails.push(`${what}: moved ${moves}, reported ${seen.join(" ") || "nothing"}`);
    }
    ok("P.8o (b) two cards that differ in any one figure — pool, time, state, price, predictors, pick — or in their kind of surface keep their order, so a swap of them is still reported in the body's field (regions.main.html)",
      apartFails.length === 0, JSON.stringify(apartFails).slice(0, 400));
    // (c) nothing to untie → untouched; and a second pass moves nothing
    const leftFails = [];
    for (const [what, make] of [
      ["a run of one card", () => grid(card(ETH))],
      ["a list of non-cards", () => grid(el("ul", { class: "kp-list" }, [el("li", {}, [text(LAST)]), el("li", {}, [text(FIRST)])]))],
      ["cards without a V18 surface", () => grid(card(ETH, {}, { surface: null }), card(BTC, {}, { surface: null }))],
      ["two tied cards with another element between them", () => grid(card(ETH), el("div", { class: "kp-slot" }), card(BTC))],
      ["two tied cards with a text between them", () => grid(card(ETH), text(" "), card(BTC))],
    ]) {
      const t = make(), before = markup(t), moved = untie(t);
      if (moved !== 0 || markup(t) !== before) leftFails.push(`${what}: moved ${moved}`);
    }
    const twice = grid(card(SOL), card(ETH), card(BTC));
    const passes = [untie(twice), untie(twice)];
    if (passes[0] === 0 || passes[1] !== 0) leftFails.push(`a second pass: moved ${passes}`);
    ok("P.8o (c) a run of one card, a list of non-cards, cards without a V18 surface, and two tied cards that do not stand side by side (another element, or a text, between them) are untouched, and a second pass moves nothing",
      leftFails.length === 0, JSON.stringify(leftFails).slice(0, 400));
  }
  // ②c3 S7 WP1 calibration 3 · the Needle at rest (SETTLE). (a) NEEDLE_AT_REST, the function the page runs, on synthetic
  // pages reads needle.tsx's probe as the page states it: no #needle-root (a guest's page) is at rest; a #needle-root whose
  // engine has not mounted is NOT — qa:journey-shell reads an absent probe as resting, but every signed-in classic page
  // mounts one — nor is an engine without the probe, or one whose resting() answers anything but true. (b) open(), the one
  // door every read of a hydrated page goes through (the matrix's cells, the Sell cells' and the book's), on a synthetic
  // page that records what it is asked: it ends with the settle, once — after hydration, the plant and the 3 s, and after a
  // client redirect's second document too — bounded by NEEDLE_REST_MS and read every 100 ms; and a Needle that never comes
  // to rest is a note in what open() returns, never a throw.
  {
    const docOf = (root) => ({ getElementById: (id) => (root && id === "needle-root" ? { id } : null) });
    const PAGES = [
      ["a page without #needle-root (a guest's)", false, {}, true],
      ["a #needle-root whose engine has not mounted (no window.needle)", true, {}, false],
      ["an engine without the probe (window.needle without resting())", true, { needle: {} }, false],
      ["an engine whose resting() is false (a rest check pending, a glide)", true, { needle: { resting: () => false } }, false],
      ["an engine whose resting() answers something else than true", true, { needle: { resting: () => "yes" } }, false],
      ["an engine at rest", true, { needle: { resting: () => true } }, true],
    ];
    const misread = PAGES.filter(([, root, win, want]) => NEEDLE_AT_REST(null, docOf(root), win) !== want).map(([what, , , want]) => `${what} read ${want ? "unsettled" : "at rest"}`);
    ok("P.8r (a) the Needle's rest is read from needle.tsx's probe as the page states it: a page without #needle-root (a guest's) is at rest; a #needle-root whose engine has not mounted is NOT (qa:journey-shell reads that as resting; every signed-in classic page mounts one), nor is an engine without the probe or one whose resting() answers anything but true; resting() true is",
      misread.length === 0, JSON.stringify(misread).slice(0, 400));
    const pageOf = ({ redirect = false, rests = true } = {}) => {
      const asked = [];
      let at = null;
      return {
        asked,
        goto: async (url) => { asked.push("goto"); at = url; return { text: async () => "<main></main>", url: () => url, status: () => 200 }; },
        locator: () => ({ first: () => ({ waitFor: async () => { asked.push("main"); } }) }),
        waitForFunction: async (fn, arg, options) => {
          if (fn !== NEEDLE_AT_REST) { asked.push("hydrated"); return true; }
          asked.push(`needle ${options?.timeout} ${options?.polling}`);
          if (!rests) throw new Error("page.waitForFunction: Timeout exceeded");
          return true;
        },
        addStyleTag: async () => { asked.push("plant"); },
        evaluate: async () => { asked.push("read"); return { mounted: true, resting: false }; },
        waitForTimeout: async (ms) => { asked.push(`wait ${ms}`); },
        url: () => (redirect && asked.includes("wait 3000") ? `${BASE}/auth/login` : at),
        waitForLoadState: async () => { asked.push("load"); },
      };
    };
    const SETTLE_ASK = `needle ${NEEDLE_REST_MS} 100`;
    const openFails = [];
    for (const [what, opts, waits] of [["a page", {}, 1], ["a page the client redirects", { redirect: true }, 2]]) {
      const page = pageOf(opts);
      const got = await open(page, "/markets", { css: "main { color: red }" }).catch((e) => ({ error: msg(e) }));
      const at = page.asked.indexOf(SETTLE_ASK);
      const after = ["hydrated", "plant", "wait 3000"].every((x) => page.asked.lastIndexOf(x) < at);
      if (got.error || got.needle !== null || page.asked.filter((x) => x.startsWith("needle")).length !== 1 || at !== page.asked.length - 1 || !after
        || page.asked.filter((x) => x === "wait 3000").length !== waits) openFails.push(`${what}: asked ${page.asked.join(", ")} → ${JSON.stringify(got).slice(0, 120)}`);
    }
    {
      const page = pageOf({ rests: false });
      const got = await open(page, "/markets", null).catch((e) => ({ error: msg(e) }));
      if (got.error || got.status !== 200 || typeof got.needle !== "string" || !got.needle.includes("had not come to rest")) openFails.push(`a Needle that never rests: asked ${page.asked.join(", ")} → ${JSON.stringify(got).slice(0, 160)}`);
    }
    ok(`P.8r (b) open(), the one door every read of a hydrated page goes through (matrix, Sell and book cells), ends with the Needle's settle, once — after hydration, the plant and the 3 s, and after a client redirect's second document too — bounded (${secs(NEEDLE_REST_MS)}, read every 100 ms); a Needle that never comes to rest is a note in what open() returns, never a throw`,
      openFails.length === 0, JSON.stringify(openFails).slice(0, 400));
  }
  // ②d S7 WP1 · /'s head from the bytes (WP1 steps 3 and 5): the reader takes the canonical link and every og:* meta in
  // order — attributes in any order, a tag streamed into the body — and never twitter:*, a comment or the RSC payload's
  // copy; a dropped og:url is reported in a book cell's head field and nowhere else; unread bytes read as null.
  {
    const doc = [
      '<!DOCTYPE html><html lang="sw"><head><meta charSet="utf-8"/><link rel="canonical" href="http://localhost:3041"/>',
      '<meta property="og:title" content="50pick — Predict events. Not chance."/>',
      '<meta content="http://localhost:3041" property="og:url"/>',
      '<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="50pick"/>',
      '<!-- <meta property="og:url" content="http://comment.example"/> -->',
      '<meta property="og:image" content="http://localhost:3041/og/og-1200x630.png"/></head><body><main id="main-content"></main>',
      '<meta property="og:image:width" content="1200"/>',
      `<script>self.__next_f.push([1,"<meta property='og:url' content='http://payload.example'/>"])</script>`,
      '<meta property="og:locale" content="sw_TZ"/></body></html>',
    ].join("");
    const want = ["canonical http://localhost:3041", "og:title 50pick — Predict events. Not chance.", "og:url http://localhost:3041",
      "og:image http://localhost:3041/og/og-1200x630.png", "og:image:width 1200", "og:locale sw_TZ"].join(NL);
    const got = headOf(doc);
    const headStore = {};
    const keep = (text) => { const id = `h${Object.keys(headStore).length}`; headStore[id] = text; return id; };
    const headCell = (body) => ({ status: 200, stable: true, landed: BOOK.head, pageErrors: [], journey: [], raw: rawOf(body),
      regions: { main: { count: 1, html: keep('<main id="main-content"></main>'), layout: null } }, head: keep(bookNorm(headOf(body))) });
    const dropped = doc.replace('<meta content="http://localhost:3041" property="og:url"/>', "");
    const headRun = diffCells(BOOK.head, headCell(doc), headCell(dropped), headStore, headStore, BOOK_EXPECTED_DIFFS).unexpected.map((d) => d.field);
    ok("P.8h the head reader reads /'s canonical link and every og:* meta from the bytes, in order — attributes in any order, a tag streamed into the body, never twitter:* or the RSC payload — and a dropped og:url is reported in the head field and nowhere else (unread bytes read as null)",
      got === want && headRun.join() === "head" && headOf(null) === null && headOf(undefined) === null, JSON.stringify({ got, headRun }).slice(0, 400));
  }
  // ②e S7 WP1 · A8 item 1's verdict: a book whose replies hold what A8 asks passes — its Up & Down refusal recorded, never
  // refused; the void marketIds[11] and the similar rail's question marketIds[0] — and each defect alone is refused, once.
  {
    const good = syntheticBook().seed;
    const verdictOf = (mutate) => { const s = structuredClone(good); mutate?.(s); return bookVerdict(s); };
    const g = verdictOf(null);
    const DEFECTS = [
      ["a pool of 11", (s) => { s.markets.reply.ids = s.markets.reply.ids.slice(0, 11); }],
      ["a pool of 12 that holds a Demo · question", (s) => { s.markets.reply.ids = s.markets.reply.ids.slice(0, 12); s.markets.reply.ids[5].titleEn = `${DEMO_PREFIX}Planted`; }],
      ["a door's 404", (s) => { s.watchlist.status = 404; }],
      ["seed-player-portfolio not run", (s) => { delete s.portfolio; }],
      ["11 placed", (s) => { s.portfolio.reply.placed = 11; }],
      ["no VOID intended", (s) => { delete s.portfolio.reply.intended.VOID; }],
      ["no VOID held", (s) => { delete s.portfolio.reply.byStatus.VOID; }],
      ["no WIN held", (s) => { s.portfolio.reply.byStatus.WIN = 0; }],
      ["no LOSS held", (s) => { delete s.portfolio.reply.byStatus.LOSS; }],
      ["a settlement refused", (s) => { s.portfolio.reply.refusals.push("settle mkt_planted06000000000: INVALID the objection window is still open"); }],
      ["a cash-out refused", (s) => { s.portfolio.reply.refusals.push("cashOut mkt_planted04000000000: CLOSED the exit window has closed"); }],
      ["a stage-1 resolution refused", (s) => { s.portfolio.reply.refusals.push("stage1 mkt_planted07000000000: CONFLICT the officer holds a position"); }],
      ["a void refused", (s) => { s.portfolio.reply.refusals.push("void mkt_planted11000000000: INVALID Market already resolved"); }],
      ["11 ids", (s) => { s.portfolio.reply.marketIds = s.portfolio.reply.marketIds.slice(0, 11); }],
      ["the watchlist not ok", (s) => { s.watchlist.reply.ok = false; }],
      ["no progress row", (s) => { s.watchlist.reply.byLens.progress = 0; }],
      ["no done row", (s) => { delete s.watchlist.reply.byLens.done; }],
      ["no void row", (s) => { s.watchlist.reply.byLens.void = 0; }],
      ["the player not signed in", (s) => { s.error = "the demo player is not signed in"; }],
    ];
    const bad = DEFECTS.filter(([, mutate]) => verdictOf(mutate).problems.length !== 1).map(([what, mutate]) => `${what}: ${JSON.stringify(verdictOf(mutate).problems)}`);
    const ids = good.portfolio.reply.marketIds;
    const goodOk = g.problems.length === 0 && g.recorded.length === 1 && g.pool === 30 && g.voidId === ids[11] && g.similarId === ids[0];
    ok("P.8s A8 item 1's verdict passes a book whose replies hold what A8 asks (its Up & Down refusal recorded, never refused; the void is marketIds[11], the similar rail's question marketIds[0]), and refuses each defect alone — a pool of 11, a door's 404, 11 placed, no VOID intended, no WIN or LOSS held, a settlement or a cash-out refused, 11 ids, the watchlist not ok, no progress row",
      goodOk && bad.length === 0, JSON.stringify({ good: goodOk ? [] : [...g.problems, `recorded ${g.recorded.length}`, `pool ${g.pool}`, `void ${g.voidId}`, `similar ${g.similarId}`], bad }).slice(0, 400));
  }
  // ②f S7 WP1 · A8 item 2's probe and the card classifier: a probe that found what A8 asks passes; each absence is reported
  // on its own page and nowhere else; and every classic card state is read from the classes the card is drawn with.
  {
    const S0 = syntheticBook();
    const voidId = bookVerdict(S0.seed).voidId;
    const probeOf = (mutate) => { const p = structuredClone(S0.seed.probe); mutate?.(p); return probeVerdict(p, voidId); };
    const clean = probeOf(null);
    const PROBE_DEFECTS = [
      ["results", "the voided question's card missing from /results", (p) => { p.results = p.results.filter((c) => c.id !== voidId); }],
      ["results", "the voided question's card drawn resolved YES", (p) => { p.results.find((c) => c.id === voidId).state = "resolved-yes"; }],
      ["results", "no settled YES card on /results", (p) => { p.results = p.results.filter((c) => c.state !== "resolved-yes"); }],
      ["results", "no settled NO card on /results", (p) => { p.results = p.results.filter((c) => c.state !== "resolved-no"); }],
      ["results", "/results not read", (p) => { p.results = null; }],
      ["watchlist", "no void card on /watchlist", (p) => { p.watchlist = p.watchlist.filter((c) => c.state !== "void"); }],
      ["watchlist", "no done card on /watchlist", (p) => { p.watchlist = p.watchlist.filter((c) => c.state !== "resolved-yes" && c.state !== "resolved-no"); }],
      ["watchlist", "no selection-closed card on /watchlist", (p) => { p.watchlist = p.watchlist.filter((c) => c.state !== "closed"); }],
      ["watchlist", "/watchlist not read", (p) => { p.watchlist = null; }],
    ];
    const probeRuns = [
      ...(clean.results.length || clean.watchlist.length ? [`a probe holding A8's cards is refused: ${[...clean.results, ...clean.watchlist].join(" · ")}`] : []),
      ...PROBE_DEFECTS.filter(([page, , mutate]) => {
        const v = probeOf(mutate);
        return v[page].length === 0 || v[page === "results" ? "watchlist" : "results"].length !== 0;
      }).map(([, what]) => `${what}: not reported on its own page alone`),
    ];
    const result = "mcardp-pctcap--result", single = "mcardp-actions--single", oneside = "mcardp-oneside";
    const CLASSIFIED = [
      [{ pct: "mcardp-pct mcardp-pct--void", marks: [result, single] }, "void"],
      [{ pct: "mcardp-pct mcardp-pct--no", marks: [result, single] }, "resolved-no"],
      [{ pct: "mcardp-pct", marks: [result, single] }, "resolved-yes"],
      [{ pct: "mcardp-pct", marks: [result, single, oneside] }, "resolved-yes"],
      [{ pct: "mcardp-pct", marks: [single] }, "closed"],
      [{ pct: "mcardp-pct mcardp-pct--empty", marks: [single, oneside] }, "closed"],
      [{ pct: "mcardp-pct mcardp-pct--empty", marks: [oneside] }, "one-sided"],
      [{ pct: "mcardp-pct mcardp-pct--empty", marks: [] }, "empty"],
      [{ pct: "mcardp-pct", marks: [] }, "priced"],
      [{ pct: "", marks: [] }, "other"],
      [{ pct: "mcardp-pctcap", marks: [result] }, "other"],
    ];
    const misread = CLASSIFIED.filter(([facts, want]) => cardStateOf(facts) !== want).map(([facts, want]) => `${JSON.stringify(facts)} read ${cardStateOf(facts)}, not ${want}`);
    ok("P.8p A8 item 2's probe passes /results with the void card drawn void and settled YES and NO cards, and /watchlist with void, done and selection-closed cards; each absence is reported on its own page alone; and the card classifier reads void, resolved NO and YES, selection closed, one-sided, empty pool and live priced from the classic card's classes",
      probeRuns.length === 0 && misread.length === 0, JSON.stringify({ probeRuns, misread }).slice(0, 400));
  }
  // ②g S7 WP1 · A8 item 3: the live trace's selector asks for S7's class names beside S6's journey, and its class report
  // names them; neither the selector nor the report takes a class a classic page draws. S8 WP1 (step 4) re-pins it in the
  // open: S8's bet sheet (kp-bsheet), big buttons (kp-jbet) and question ghost (kp-qghost) too, and the parts are exactly
  // the eight.
  {
    const S7_CLASSES = ["kp-jcard", "kp-jcard__price", "kp-jhome", "kp-jhome__lead", "kp-jhowto", "kp-jhowto__step", "kp-howto", "kp-howto__sheet", "journey-tabs",
      "kp-bsheet", "kp-bsheet__cta", "kp-bsheet--placing", "kp-jbet", "kp-jbet__yes", "kp-qghost", "kp-qghost__panel"];
    const CLASSIC = ["mcardp", "mcardp-pct", "mcardp-pct--no", "mcardp-oneside", "mcardp-src__seq", "market-grid", "ticker-strip", "ticker-item", "kp-rail",
      "app-topbar", "kp-sell-stack", "kp-sell-wrap", "kp-seq", "kp-modal-title", "kp-proof__cap", "kp-udtrack__svg", "crest-holder", "btn-gold"];
    const selectorParts = [...TRACE.selector.matchAll(/\[class\*="([^"]+)"\]/g)].map((m) => m[1]);
    const selected = (c) => selectorParts.some((p) => c.includes(p));
    const reported = (c) => TRACE.parts.some((p) => c.includes(p));
    const missed = S7_CLASSES.filter((c) => !selected(c) || !reported(c));
    const caught = CLASSIC.filter((c) => selected(c) || reported(c));
    const EIGHT = ["journey", "kp-jcard", "kp-jhome", "kp-jhowto", "kp-howto", "kp-bsheet", "kp-jbet", "kp-qghost"];
    ok("P.8t the live trace asks for S7's class names (kp-jcard, kp-jhome, kp-jhowto, kp-howto) and S8's (kp-bsheet, kp-jbet, kp-qghost) beside S6's journey — exactly those eight parts — and its class report names them, and no classic class",
      TRACE.selector.split(",").includes('[data-testid^="journey-"]') && TRACE.selector.split(",").includes("[data-journey]") && missed.length === 0 && caught.length === 0
        && JSON.stringify(TRACE.parts) === JSON.stringify(EIGHT) && selectorParts.join() === EIGHT.join(),
      JSON.stringify({ selector: TRACE.selector, missed, caught }).slice(0, 400));
  }
  // ②g2 S8 WP1 · the raw trace (RAW_TRACE, rawOf) on synthetic bytes: data-sheet on an element, in HTML and in the RSC
  // payload's escaped JSON, is reported as "data-sheet"; the classic filter sheet's data-sheet-open, a data-sheets or a
  // class named data-sheet-x are not (A22 item 6); S6's journey test id and flag are still read as before.
  {
    const shell = '<header class="app-topbar"></header>';
    const RAW = [
      ["an article with data-sheet", `${shell}<article data-sheet="" class="mcardp"></article>`, ["data-sheet"]],
      ["data-sheet with a value", `${shell}<a data-sheet="mkt_x:YES" href="/markets/mkt_x?side=YES"></a>`, ["data-sheet"]],
      ["data-sheet in the RSC payload's JSON", `${shell}<script>self.__next_f.push([1,"[\\"$\\",\\"a\\",null,{\\"data-sheet\\":\\"mkt_x\\"}]"])</script>`, ["data-sheet"]],
      ["the classic filter sheet's data-sheet-open", `${shell}<html data-sheet-open=""><style>[data-sheet-open] body{overflow:hidden}</style>`, []],
      ["data-sheets and data-sheet-x", `${shell}<div data-sheets="" class="data-sheet-x"></div>`, []],
      ["S6's test id and flag beside it", `${shell}<html data-journey=""><div data-testid="journey-tabs" data-sheet=""></div>`, ["data-journey", "data-sheet", "testid:journey-tabs"]],
    ];
    const misread = RAW.filter(([, body, want]) => JSON.stringify(rawOf(body)?.trace) !== JSON.stringify(want)).map(([what, body]) => `${what}: ${JSON.stringify(rawOf(body)?.trace)}`);
    ok("P.8w the raw trace reads S8's data-sheet — on an element, with a value, in the RSC payload's JSON — and not the classic filter sheet's data-sheet-open, data-sheets or a class named data-sheet-x; S6's test id and flag are read as before",
      misread.length === 0, JSON.stringify(misread).slice(0, 400));
  }
  // ②h S7 WP1 · the book's checks (§B): a clean synthetic book passes them all, and each plant turns exactly its own one red.
  const SB = syntheticBook();
  const bookRed = (m) => bookChecks(m.book, m.seed, m.store).filter((x) => x.fails.length).map((x) => x.id);
  ok("P.7b a clean synthetic book passes every check in §B", bookRed(SB).length === 0, JSON.stringify(bookRed(SB)));
  const atBook = (m, v, l, w, r) => m.book[keyOf(`book-${v}`, l, w, r)];
  const bookVoid = (m) => m.seed.portfolio.reply.marketIds[11];
  const BOOK_FLOOR_PLANTS = [
    ["B.0", "a seed A8 item 1 refuses", (m) => { m.seed.portfolio.reply.placed = 11; }],
    ["B.0", "a book cell missing from the capture", (m) => { delete m.book[keyOf("book-guest", "sw", 1280, "/live")]; }],
    ["B.0", "a book cell that did not capture", (m) => { m.book[keyOf("book-player", "en", 1280, "/watchlist")] = { error: "planted" }; }],
    ["B.1", "a book cell that never settled", (m) => { atBook(m, "guest", "en", 360, "/markets").stable = false; }],
    ["B.1", "the player's /watchlist sent to sign-in", (m) => { atBook(m, "player", "sw", 360, "/watchlist").landed = "/auth/login?next=%2Fwatchlist"; }],
    ["B.1", "a book cell answering 500", (m) => { atBook(m, "player", "en", 1280, BOOK.similar).status = 500; }],
    ["B.2", "the voided question's card missing from /results", (m) => { m.seed.probe.results = m.seed.probe.results.filter((c) => c.id !== bookVoid(m)); }],
    ["B.2", "no settled NO card on /results", (m) => { m.seed.probe.results = m.seed.probe.results.filter((c) => c.state !== "resolved-no"); }],
    ["B.3", "no selection-closed card on /watchlist", (m) => { m.seed.probe.watchlist = m.seed.probe.watchlist.filter((c) => c.state !== "closed"); }],
    ["B.3", "no done card on /watchlist", (m) => { m.seed.probe.watchlist = m.seed.probe.watchlist.filter((c) => c.state !== "resolved-yes" && c.state !== "resolved-no"); }],
    ["B.4", "a /results cell without its <main>", (m) => { atBook(m, "guest", "en", 1280, "/results").regions.main = { count: 0, html: null, layout: null }; }],
    ["B.4", "the question page without its similar rail", (m) => { atBook(m, "player", "sw", 360, BOOK.similar).regions.similar = { count: 0, html: null, layout: null }; }],
    ["B.4", "/'s head without og:url", (m) => { m.store.headNoUrl = ["canonical http://localhost", "og:title 50pick — Predict events. Not chance."].join(NL); atBook(m, "guest", "sw", 1280, "/").head = "headNoUrl"; }],
    ["B.4", "/'s head unread", (m) => { atBook(m, "player", "en", 360, "/").head = null; }],
    ["B.5", "a lobby cell without the LIVE strip", (m) => { delete atBook(m, "guest", "sw", 360, "/live").regions.ticker; }],
    ["B.6", "a kp-jcard element in a classic page", (m) => { atBook(m, "player", "en", 1280, "/").journey = ["class:kp-jcard"]; }],
    ["B.6", "journey-home-ghost in a classic /markets raw body", (m) => { atBook(m, "guest", "en", 360, "/markets").raw.trace = ["testid:journey-home-ghost"]; }],
    ["B.7", "no one-sided card anywhere in the book", (m) => { for (const c of Object.values(m.book)) c.cards = c.cards.filter((x) => x.state !== "one-sided"); }],
    ["B.7", "no void card anywhere in the book", (m) => { for (const c of Object.values(m.book)) c.cards = c.cards.filter((x) => x.state !== "void"); }],
    ["B.8", "a real page error filed as DEV-only (it would never be compared)", (m) => { atBook(m, "player", "sw", 1280, "/results").devOnly = ["TypeError: Cannot read properties of undefined (reading 'resolvedOutcome')"]; }],
    ["B.9", "a home featured close date not canonicalized", (m) => { atBook(m, "guest", "en", 360, "/").homeCloseDates.featured = 0; }],
    ["B.9", "an extra home board close-date leaf", (m) => { atBook(m, "player", "sw", 1280, "/").homeCloseDates.leaves.rows++; }],
    ["B.9", "a close-date leaf canonicalized outside home", (m) => { atBook(m, "guest", "en", 360, "/markets").homeCloseDates.rows = 1; }],
  ];
  for (const [id, what, plant] of BOOK_FLOOR_PLANTS) {
    const m = structuredClone(SB);
    plant(m);
    const got = bookRed(m);
    ok(`P.check ${id} — ${what} turns ${id} red, and nothing else in §B`, got.join() === id, got.join(" ") || "nothing went red");
  }

  // ②i S8 WP1 · the question phase's checks (§Q): a clean synthetic phase passes them all, and each plant turns exactly its
  // own one red; and its verdict refuses each defect alone.
  const SQ = syntheticQuestion();
  const questionRed = (m) => questionChecks(m.question, m.seed, m.store).filter((x) => x.fails.length).map((x) => x.id);
  ok("P.7q a clean synthetic question phase passes every check in §Q", questionRed(SQ).length === 0, JSON.stringify(questionRed(SQ)));
  const atQ = (m, v, l, w, route) => m.question[keyOf(`question-${v}`, l, w, route)];
  const QUESTION_FLOOR_PLANTS = [
    ["Q.0", "a resolve-seed-markets that took another question", (m) => { m.seed.resolved.reply.markets[0].id = "mkt_qother000000000000"; }],
    ["Q.0", "a held question drawn one-sided", (m) => { m.seed.board[0].state = "one-sided"; }],
    ["Q.0", "free windows still open when the phase began", (m) => { m.seed.freeWait = { closed: false, ms: FREE_WAIT_MS }; }],
    ["Q.0", "a cooling-off that was not taken", (m) => { m.seed.breakTaken = false; m.seed.breakError = "planted"; }],
    ["Q.0", "a question cell missing from the capture", (m) => { delete m.question[keyOf("question-player", "sw", 360, "/markets/:open?side=NO")]; }],
    ["Q.1", "a question cell that never settled", (m) => { atQ(m, "guest", "en", 360, "/markets/:settled").stable = false; }],
    ["Q.1", "the holder's ?side=NO page that landed without its side", (m) => { atQ(m, "player", "en", 1280, "/markets/:open?side=NO").landed = "/markets/:open"; }],
    ["Q.2", "a cell without its bet panel", (m) => { atQ(m, "player", "sw", 1280, "/markets/:empty").regions.panel = { count: 0, html: null, layout: null }; }],
    ["Q.2", "a guest cell with a holder section", (m) => { atQ(m, "guest", "sw", 360, "/markets/:open").regions.holder = { count: 1, html: "holder", layout: null }; }],
    ["Q.3", "a holder section with a free-window strip", (m) => { m.store.stripHolder = '<section class="bg-bg-elevated"><div class="ticket-target"><div class="mb-1.5 flex"></div><button>Sell</button></div></section>'; atQ(m, "player", "en", 360, "/markets/:open?side=YES").regions.holder.html = "stripHolder"; }],
    ["Q.4", "a kp-jbet element in a classic question page", (m) => { atQ(m, "player", "en", 1280, "/markets/:open").journey = ["class:kp-jbet"]; }],
    ["Q.4", "data-sheet in a classic question page's raw bytes", (m) => { atQ(m, "guest", "en", 1280, "/markets/:open").raw.trace = ["data-sheet"]; }],
    ["Q.5", "a break cell without the break notice", (m) => { atQ(m, "break", "sw", 360, "/markets/:empty").regions.panel.html = "panel"; }],
    ["Q.5", "the break notice on a cell that is not on a break", (m) => { atQ(m, "player", "en", 360, "/markets/:empty").regions.panel.html = "breakPanel"; }],
    ["Q.5", "the holder's ?side=NO without the hedge warning", (m) => { atQ(m, "player", "sw", 1280, "/markets/:open?side=NO").regions.panel.html = "panel"; }],
    ["Q.5", "the guest's open question without sign-up", (m) => { atQ(m, "guest", "en", 1280, "/markets/:open").regions.panel.html = "panel"; }],
    ["Q.6", "the countdown mask masking nothing anywhere", (m) => { for (const c of Object.values(m.question)) c.masked["countdown-clock"] = 0; }],
    ["Q.6", "a question Event missing one of its exact two clock masks", (m) => { atQ(m, "guest", "en", 360, "/markets/:settled").masked["jsonld-event-times"] = 1; }],
    ["Q.6", "a break question missing its named date leaf mask", (m) => { atQ(m, "break", "en", 360, "/markets/:open").masked["break-end-clock"] = 0; }],
    ["Q.6", "a break question with an extra date leaf mask", (m) => { atQ(m, "break", "sw", 1280, "/markets/:empty").masked["break-end-clock"] = 3; }],
    ["Q.6", "a date leaf masked outside a break question", (m) => { atQ(m, "player", "en", 360, "/markets/:open").masked["break-end-clock"] = 1; }],
    ["Q.7", "a real page error filed as DEV-only", (m) => { atQ(m, "player", "sw", 360, "/markets/:settled").devOnly = ["TypeError: Cannot read properties of undefined (reading 'yesPool')"]; }],
  ];
  for (const [id, what, plant] of QUESTION_FLOOR_PLANTS) {
    const m = structuredClone(SQ);
    plant(m);
    const got = questionRed(m);
    ok(`P.check ${id} — ${what} turns ${id} red, and nothing else in §Q`, got.join() === id, got.join(" ") || "nothing went red");
  }
  // ②j S8 WP1 · the question verdict: the synthetic seed passes, and each defect alone is one problem.
  {
    const good = SQ.seed;
    const verdictOf = (mutate) => { const x = structuredClone(good); mutate?.(x); return questionVerdict(x); };
    const DEFECTS = [
      ["no one-sided question", (x) => { x.ids["one-sided"] = null; }],
      ["two states naming one question", (x) => { x.ids.empty = x.ids.settled; x.resolved.reply.markets[0].id = x.ids.settled; }],
      ["the guest's /markets unread", (x) => { x.board = null; }],
      ["the held question missing from /markets", (x) => { x.board = x.board.slice(1); }],
      ["the settled question's fast-forward answering 404", (x) => { x.settledForward.status = 404; delete x.resolved; }],
      ["resolve-seed-markets not complete", (x) => { x.resolved.reply.markets[0].state = "stage1"; }],
      ["the closed-by-time fast-forward not ok", (x) => { x.timeForward.reply.ok = false; }],
      ["the free windows still open", (x) => { x.freeWait.closed = false; }],
    ];
    const g = verdictOf(null);
    const bad = DEFECTS.filter(([, mutate]) => verdictOf(mutate).problems.length !== 1).map(([what, mutate]) => `${what}: ${JSON.stringify(verdictOf(mutate).problems)}`);
    ok("P.8v the question verdict passes a seed whose questions and doors hold what WP1 step 2 asks, and refuses each defect alone — no one-sided question, two states on one question, /markets unread, the held question missing, a door's 404, a settle not complete, a fast-forward not ok, the free windows open",
      g.problems.length === 0 && bad.length === 0, JSON.stringify({ good: g.problems, bad }).slice(0, 400));
  }
  // ②k S8 WP1 · the question page's stubs and masks, in a real page built from markup (no server): SNAPSHOT, given
  // questionArgsOf(), reads <main> with the bet panel and the holder section stubbed in it and each its own region, and
  // the masks. A change inside the panel is in the panel's region alone, and one inside the holder in the holder's alone;
  // a ticking countdown, a [role=timer] text, the Sell strip's clock and the chart's time axis change no region at all;
  // and the same change to a figure no mask names is seen in <main>.
  {
    const page = await b.newPage({ viewport: { width: 1280, height: HEIGHT } });
    try {
      const doc = (o = {}) => `<!doctype html><html><body><main id="main-content"><div class="grid">
        <div class="order-1"><aside aria-labelledby="bet-panel-heading"><h2 id="bet-panel-heading">Place your stake</h2><p class="kp-ok">${o.panel ?? "Pick a side"}</p></aside></div>
        <section class="order-2 space-y-5">
          <div class="glass-panel"><div class="flex gap-2"><div class="flex flex-col"><div class="font-mono font-bold text-[28px] tabular-nums">${o.secs ?? "05"}</div></div></div></div>
          <div class="tv-lightweight-charts"><table><tr><td><canvas width="542" height="212"></canvas></td></tr><tr><td><canvas width="${o.axis ?? 542}" height="28"></canvas></td></tr></table></div>
          <p class="kp-figure">${o.figure ?? "TZS 3,600"}</p><span role="timer">${o.timer ?? "0:42"}</span>
          <section class="bg-bg-elevated"><div class="ticket-target"><div class="mb-1.5 flex"><span class="tabular-nums">${o.clock ?? "4:07"}</span></div><button><span>${o.sell ?? "Sell now"}</span></button></div></section>
        </section></div></main></body></html>`;
      const args = questionArgsOf();
      const take = async (o) => { await page.setContent(doc(o)); const sn = await page.evaluate(SNAPSHOT, args); return Object.fromEntries(Object.entries(sn.regions).map(([n, r]) => [n, r.html])); };
      const clean = await take({});
      const moved = async (o) => { const x = await take(o); return Object.keys(clean).filter((n) => clean[n] !== x[n]); };
      const runs = {
        panel: await moved({ panel: "Pick a side!" }), holder: await moved({ sell: "Sell n0w" }),
        secs: await moved({ secs: "06" }), timer: await moved({ timer: "0:41" }), clock: await moved({ clock: "4:06" }), axis: await moved({ axis: 540 }),
        figure: await moved({ figure: "TZS 3,601" }),
      };
      const stubbed = clean.main?.includes('<parity-region data-parity="panel"></parity-region>') && clean.main?.includes('<parity-region data-parity="holder"></parity-region>') && !clean.main?.includes("Pick a side");
      ok("P.8m the question page's stubs and masks, in a page built from markup: <main> holds the bet panel and the holder section as stubs; a change in the panel is in the panel's region alone and one in the holder in the holder's alone; a ticking countdown, a [role=timer] text, the Sell strip's clock and the chart's time axis move no region's markup; a figure no mask names moves <main>'s",
        stubbed && runs.panel.join() === "panel" && runs.holder.join() === "holder" && [runs.secs, runs.timer, runs.clock, runs.axis].every((r) => r.length === 0) && runs.figure.join() === "main",
        JSON.stringify({ stubbed, ...runs }).slice(0, 400));
    } catch (e) {
      ok("P.8m the question page's stubs and masks, in a page built from markup", false, msg(e));
    } finally {
      await page.close().catch(() => {});
    }
  }

  // ③ The browser: the instrument agrees with itself, and sees each plant in its own field and nowhere else.
  const PLANTS = [
    { id: "height", css: "header.app-topbar { height: 64px !important; }", what: "the canvas's 64px bar in place of the kit's 56", need: "regions.header.layout", within: ["regions.header."] },
    { id: "paint", css: "header.app-topbar a { color: rgb(255, 0, 0) !important; }", what: "a paint-only change (the header's links turn red)", need: "regions.header.layout", within: ["regions.header."] },
    {
      id: "overlay",
      js: () => {
        const d = document.createElement("div");
        d.setAttribute("data-parity-plant", "");
        d.setAttribute("style", "position:fixed;right:0;bottom:120px;width:40px;height:40px;z-index:5;background:red");
        document.body.append(d);
      },
      what: "a new fixed overlay (a 40px square over the page's corner)", need: "overlays", within: ["overlays"],
    },
    { id: "footer", css: "#main-content + footer { padding-bottom: 0 !important; }", widths: [360], what: "the footer's rail clearance dropped", need: "footerPaddingBottom", within: ["footerPaddingBottom", "regions.footer."] },
  ];
  const inside = (field, prefixes) => prefixes.some((p) => field === p || field.startsWith(p));
  const PROVE_CELLS = [["guest", "en", 360, "/"], ["player", "sw", 1280, "/markets"], ["player", "en", 360, BODY_ROUTE]];
  const jars = {};
  for (const v of VIEWERS.filter((x) => PROVE_CELLS.some(([id]) => id === x.id))) {
    jars[v.id] = await signIn(v);
    await warm(jars[v.id], [...new Set(PROVE_CELLS.filter(([id]) => id === v.id).map(([, , , r]) => r))]);
  }
  for (const [vid, l, w, r] of PROVE_CELLS) {
    const k = keyOf(vid, l, w, r);
    if (VIEWERS.find((v) => v.id === vid)?.door && !jars[vid].length) { ok(`P.${k} the viewer is signed in`, false); continue; }
    const clean = await capture(jars[vid], l, w, r);
    const again = await capture(jars[vid], l, w, r);
    if (clean.error || again.error) { ok(`P.${k} the cell was captured`, false, clean.error ?? again.error); continue; }
    const noise = diffCells(r, clean, again, blobs, blobs).unexpected;
    // Calibration 3 · a pass shows the overlay census both captures read (a signed-in page's Needle, at rest, among it).
    ok(`P.${k} two clean captures agree — the instrument is deterministic on one server`, noise.length === 0,
      `${noise.length ? noise.slice(0, 3).map((d) => `${d.field}: ${d.detail}`).join(" | ") : `the overlays both read: ${clean.overlays.join(" · ") || "none"}`}${notedIn(clean, again)}`);
    for (const plant of PLANTS) {
      if (plant.widths && !plant.widths.includes(w)) continue;
      const planted = await capture(jars[vid], l, w, r, plant);
      if (planted.error) { ok(`P.${k} ${plant.id} was captured`, false, planted.error); continue; }
      const seen = diffCells(r, clean, planted, blobs, blobs).unexpected;
      ok(`P.${k} ⭐ ${plant.what} is reported in ${plant.need}, and nowhere outside ${plant.within.join(" / ")}`,
        seen.some((d) => inside(d.field, [plant.need])) && seen.every((d) => inside(d.field, plant.within)),
        seen.length ? seen.slice(0, 2).map((d) => `${d.field}: ${d.detail}`).join(" | ").slice(0, 400) : "NOT SEEN — a compare with this harness proves nothing");
    }
  }

  // ④ WP10 · the Sell capture in the browser, after every cell above (they read the demo portfolio empty): the player is
  // given an open ticket; at BOTH places a classic holder is sold to, two clean captures of a Sell cell agree inside its
  // free window (in the holder block, with the classic confirm captured inside its quote hold); and a planted change to
  // the button, to the strip and to the confirm is each reported in its own region and nowhere else.
  const holder = jars.player ?? [];
  const seeded = holder.length
    ? await seedHolder(holder, (anyMarket) => warm(holder, ["/positions", ...(anyMarket ? [`/markets/${anyMarket}`] : [])]))
    : { error: "the demo player is not signed in" };
  ok("P.sell the demo player is given an open ticket through the real money paths", !seeded.error && !!seeded.held, seeded.error ?? "");
  if (!seeded.error && seeded.held) {
    const SELL_PROVE = [
      { l: "sw", w: 360, place: SELL_PLACES[1], plants: [
        { id: "sell-button", css: "#main-content .ticket-target > button { letter-spacing: 2px !important; }", what: "the holder block's Sell button letters spaced out", need: "regions.button.layout", within: ["regions.button."] },
        { id: "sell-strip", css: '#main-content .ticket-target > div[class~="mb-1.5"] { color: rgb(255, 0, 0) !important; }', what: "the holder block's free strip re-inked", need: "regions.strip.layout", within: ["regions.strip."] },
        { id: "sell-confirm", css: '[role="dialog"] p { letter-spacing: 2px !important; }', what: "the classic confirm's words spaced out", need: "regions.confirm.layout", within: ["regions.confirm."] },
      ], servedPlant: { id: "first-paint", css: "#main-content .ticket-target > button { letter-spacing: 2px !important; }", what: "the holder block's first paint, its letters spaced out (S6 A8e)", need: "regions.button.layout", within: ["regions.button."] } },
      { l: "en", w: 1280, place: SELL_PLACES[0], plants: [
        { id: "positions-button", css: "#main-content div:has(> a[data-row-id]) > button { letter-spacing: 2px !important; }", what: "the /positions card's Sell button letters spaced out", need: "regions.button.layout", within: ["regions.button."] },
        { id: "positions-strip", css: '#main-content div:has(> a[data-row-id]) > div[class~="mb-1.5"] { color: rgb(255, 0, 0) !important; }', what: "the /positions card's free strip re-inked", need: "regions.strip.layout", within: ["regions.strip."] },
      ] },
    ];
    for (const { l, w, place, plants, servedPlant } of SELL_PROVE) {
      const k = keyOf("sell", l, w, place);
      const clean = await captureSellCell(holder, l, w, place, seeded.held);
      const again = await captureSellCell(holder, l, w, place, seeded.held);
      if (clean.error || again.error) { ok(`P.${k} the Sell cell was captured`, false, clean.error ?? again.error); continue; }
      const noise = diffCells(place, clean, again, blobs, blobs, SELL_EXPECTED_DIFFS).unexpected;
      const confirmOk = !confirmCell(w, place) || (clean.regions.confirm?.count === 1 && clean.confirmLive === true);
      ok(`P.${k} two clean captures of a Sell cell agree, inside the free window (the strip's clock read as m:ss)${confirmCell(w, place) ? ", the classic confirm captured inside its quote hold" : ""}`,
        noise.length === 0 && clean.regions.strip.count === 1 && clean.regions.button.count === 1 && confirmOk,
        `${noise.length ? noise.slice(0, 3).map((d) => `${d.field}: ${d.detail}`).join(" | ") : `strip ${clean.regions.strip.count} · button ${clean.regions.button.count} · confirm ${clean.regions.confirm?.count ?? "-"}`}${notedIn(clean, again)}`);
      // S6 A8e · the first paint: two of them agree — every script held, nothing hydrated, the page's Sell button in both —
      // and a change planted in it alone is seen. Held to the first paint itself, never to the button the browser then
      // drew: that is A8e's claim about the tree (4.4f, in a compare), and the calibration must hold on any tree, the one
      // the baseline is captured from included.
      const paintOf = (served) => ({ ...clean, regions: { strip: served.regions.strip, button: served.regions.button } });
      const painted = (s) => !!s && !s.error && s.hydrated === false && s.regions?.button?.count === 1;
      const paintNoise = painted(clean.served) && painted(again.served)
        ? diffCells(place, paintOf(clean.served), paintOf(again.served), blobs, blobs, SELL_EXPECTED_DIFFS).unexpected : null;
      ok(`P.${k} two first paints of a Sell cell agree — every script held, nothing hydrated, the page's Sell button in both (S6 A8e)`,
        paintNoise !== null && paintNoise.length === 0,
        paintNoise === null
          ? (clean.served?.error ?? again.served?.error ?? `hydrated ${clean.served?.hydrated} / ${again.served?.hydrated} · button ${clean.served?.regions?.button?.count} / ${again.served?.regions?.button?.count}`)
          : paintNoise.slice(0, 3).map((d) => `${d.field}: ${d.detail}`).join(" | ").slice(0, 400));
      if (servedPlant) {
        const planted = await captureServedCell(holder, l, w, place, seeded.held, servedPlant);
        const seen = painted(clean.served) && painted(planted)
          ? diffCells(place, paintOf(clean.served), paintOf(planted), blobs, blobs, SELL_EXPECTED_DIFFS).unexpected : null;
        ok(`P.${k} ⭐ ${servedPlant.what} is reported in ${servedPlant.need}, and nowhere outside ${servedPlant.within.join(" / ")}`,
          seen !== null && seen.some((d) => inside(d.field, [servedPlant.need])) && seen.every((d) => inside(d.field, servedPlant.within)),
          seen === null ? (planted?.error ?? clean.served?.error ?? "no first paint captured")
            : seen.length ? seen.slice(0, 2).map((d) => `${d.field}: ${d.detail}`).join(" | ").slice(0, 400) : "NOT SEEN — a first-paint compare with this harness proves nothing");
      }
      for (const plant of plants) {
        const planted = await captureSellCell(holder, l, w, place, seeded.held, plant, false);
        if (planted.error) { ok(`P.${k} ${plant.id} was captured`, false, planted.error); continue; }
        const seen = diffCells(place, clean, planted, blobs, blobs, SELL_EXPECTED_DIFFS).unexpected;
        ok(`P.${k} ⭐ ${plant.what} is reported in ${plant.need}, and nowhere outside ${plant.within.join(" / ")}`,
          seen.some((d) => inside(d.field, [plant.need])) && seen.every((d) => inside(d.field, plant.within)),
          seen.length ? seen.slice(0, 2).map((d) => `${d.field}: ${d.detail}`).join(" | ").slice(0, 400) : "NOT SEEN — a Sell compare with this harness proves nothing");
      }
    }
  }

  // ⑤ S7 WP1 · the book in the browser, after the Sell capture (its { markets: 5 } came first, as in a capture): the demo
  // player's book is seeded through the existing doors and probed (A8 items 1 and 2); the LIVE strip is waited for; then
  // two clean captures of each BOOK_PROVE cell agree — the strip read still — and each plant is reported in its own field
  // and nowhere else: a class added to one card in one route's body (that body's field only), og:url dropped from /'s
  // bytes (the head field), the strip re-inked, and S7's trace — a kp-jcard element in the classic page (the trace in the
  // page) and data-testid="journey-home-ghost" in /markets' raw body (the raw trace), each in its own cell (A8 item 3).
  const bookPR = holder.length ? await seedBook(holder) : { error: "the demo player is not signed in" };
  const bookV = bookVerdict(bookPR);
  if (!bookV.problems.length) bookPR.probe = await probeBook(holder);
  const bookP = probeVerdict(bookPR.probe, bookV.voidId);
  const bookRefused = [...bookV.problems, ...bookP.results, ...bookP.watchlist];
  ok(`P.book the book is seeded through the existing dev-test doors (A8 item 1: ${bookSummary(bookPR)}), and the probe finds A8 item 2's cards on /results and /watchlist`,
    bookRefused.length === 0, bookRefused.join(" · "));
  if (!bookRefused.length) {
    const strip = await waitForStrip(holder);
    console.log(`  · the LIVE strip ${strip.seen ? `named the book's settlements after ${secs(strip.ms)}` : `did not appear in ${secs(strip.ms)}${strip.error ? ` (${strip.error})` : ""}`}`);
    const cardIn = {
      main: () => { const a = document.querySelector("#main-content article.mcardp"); if (a) a.classList.add("kp-parity-plant"); },
      similar: () => { const a = document.querySelector('section[aria-labelledby="similar-markets-heading"] article.mcardp'); if (a) a.classList.add("kp-parity-plant"); },
    };
    const ghost = '<div data-testid="journey-home-ghost" hidden></div>';
    const BOOK_PROVE = [
      { v: "guest", l: "en", w: 360, r: "/", plants: [
        { id: "book-card", js: cardIn.main, what: "a class added to one card in /'s body", need: "regions.main.html", within: ["regions.main."] },
        { id: "book-og-url", bytes: (s) => s.replace(/<meta\b[^>]*\bproperty="og:url"[^>]*>/g, ""), what: "og:url dropped from /'s bytes", need: "head", within: ["head"] },
        { id: "book-strip", css: ".ticker-strip .ticker-item { color: rgb(255, 0, 0) !important; }", what: "the LIVE strip's items re-inked", need: "regions.ticker.layout", within: ["regions.ticker."] },
        { id: "home-close-day", lateHomeJs: () => { for (const el of document.querySelectorAll('#main-content .kp-hero article.mcardp .mcardp-src__part, #main-content .kp-qboard .kp-qrow__close')) if (!el.childElementCount && /^Closes [1-9][0-9]? [A-Z][a-z]{2}(?: [0-9]{4})?$/.test(el.textContent)) el.textContent = 'Closes 13 Oct'; },
          what: "only valid home close days changed, canonicalized before geometry", noDiff: true },
        { id: "home-close-paint", css: '.kp-qrow__close { color: rgb(255, 0, 0) !important; }', what: 'home date paint changed', need: 'regions.main.layout', within: ['regions.main.'] },
        { id: "home-close-font", css: '.kp-qrow__close { font-family: monospace !important; }', what: 'home date font changed', need: 'regions.main.layout', within: ['regions.main.'] },
        { id: "home-close-padding", css: '.kp-qrow__close { padding: 3px !important; }', what: 'home date padding changed', need: 'regions.main.layout', within: ['regions.main.'] },
        { id: "home-close-inline-style", lateHomeJs: () => document.querySelector('#main-content .kp-qrow__close')?.setAttribute('style', 'letter-spacing: 2px'), what: 'home date inline style changed', need: 'regions.main.html', within: ['regions.main.'] },
        { id: "home-close-class", lateHomeJs: () => document.querySelector('#main-content .kp-qrow__close')?.classList.add('kp-parity-class'), what: 'home date class changed', need: 'regions.main.html', within: ['regions.main.'] },
        { id: "home-close-words", lateHomeJs: () => { const el = document.querySelector('#main-content .kp-qrow__close'); if (el) el.textContent = 'Wrong close words 14 Oct'; }, what: 'home close words changed', need: 'regions.main.html', within: ['regions.main.'], population: true },
        { id: "home-close-date-format", lateHomeJs: () => { const el = document.querySelector('#main-content .kp-qrow__close'); if (el) el.textContent = 'Closes 14, Oct'; }, what: 'home close date format corrupted', need: 'regions.main.html', within: ['regions.main.'], population: true },
        { id: "home-close-extra-leaf", lateHomeJs: () => { const el = document.querySelector('#main-content .kp-qrow__close'); if (el) el.parentElement.append(el.cloneNode(true)); }, what: 'home has an extra valid close-date leaf', need: 'regions.main.html', within: ['regions.main.'], population: true },
      ] },
      { v: "player", l: "sw", w: 1280, r: "/markets", plants: [
        { id: "book-card", js: cardIn.main, what: "a class added to one card in /markets' body", need: "regions.main.html", within: ["regions.main."] },
        { id: "book-jcard", js: () => { const d = document.createElement("div"); d.className = "kp-jcard"; d.setAttribute("data-parity-plant", ""); document.body.append(d); },
          what: "a kp-jcard element in the classic page (A8 item 3)", need: "journey", within: ["journey"] },
        { id: "book-ghost", bytes: (s) => (s.includes("</body>") ? s.replace("</body>", `${ghost}</body>`) : `${s}${ghost}`),
          what: 'data-testid="journey-home-ghost" in the classic /markets raw body (A8 item 3)', need: "raw", within: ["raw"] },
      ] },
      { v: "player", l: "en", w: 1280, r: "/results", plants: [
        { id: "book-card", js: cardIn.main, what: "a class added to one card in /results' body", need: "regions.main.html", within: ["regions.main."] },
      ] },
      { v: "player", l: "sw", w: 360, r: "/watchlist", plants: [
        { id: "book-card", js: cardIn.main, what: "a class added to one card in /watchlist's body", need: "regions.main.html", within: ["regions.main."] },
      ] },
      { v: "guest", l: "sw", w: 1280, r: "/live", plants: [] },
      { v: "player", l: "en", w: 360, r: BOOK.similar, plants: [
        { id: "book-card", js: cardIn.similar, what: "a class added to one card in the similar rail", need: "regions.similar.html", within: ["regions.similar."] },
      ] },
    ];
    const routeOf = (r) => (r === BOOK.similar ? `/markets/${bookV.similarId}` : r);
    await warm(holder, [...new Set(BOOK_PROVE.filter((c) => c.v === "player").map((c) => routeOf(c.r)))]);
    await warm([], [...new Set(BOOK_PROVE.filter((c) => c.v === "guest").map((c) => routeOf(c.r)))]);
    for (const { v, l, w, r, plants } of BOOK_PROVE) {
      const k = keyOf(`book-${v}`, l, w, r);
      const jar = v === "player" ? holder : [];
      const clean = await captureBookCell(jar, l, w, r, bookV.similarId);
      const again = await captureBookCell(jar, l, w, r, bookV.similarId);
      if (clean.error || again.error) { ok(`P.${k} the book cell was captured`, false, clean.error ?? again.error); continue; }
      const noise = diffCells(r, clean, again, blobs, blobs, BOOK_EXPECTED_DIFFS).unexpected;
      const bodyCount = r === BOOK.similar ? clean.regions.similar?.count : clean.regions.main?.count;
      const stripOk = !BOOK.lobby.includes(r) || clean.regions.ticker?.count === 1;
      ok(`P.${k} two clean captures of a book cell agree — the instrument is deterministic on one server, the LIVE strip read still`,
        noise.length === 0 && bodyCount === 1 && stripOk,
        `${noise.length ? noise.slice(0, 3).map((d) => `${d.field}: ${d.detail}`).join(" | ").slice(0, 400)
          : `body ${bodyCount ?? 0} · strip ${BOOK.lobby.includes(r) ? clean.regions.ticker?.count ?? 0 : "-"} · cards ${clean.cards.length}`}${notedIn(clean, again)}`);
      for (const plant of plants) {
        const planted = await captureBookCell(jar, l, w, r, bookV.similarId, plant);
        if (planted.error) { ok(`P.${k} ${plant.id} was captured`, false, planted.error); continue; }
        const seen = diffCells(r, clean, planted, blobs, blobs, BOOK_EXPECTED_DIFFS).unexpected;
        if (plant.noDiff) {
          ok(`P.${k} ${plant.what} changes no field under the real book diff`, seen.length === 0 && JSON.stringify(clean.homeCloseDates) === JSON.stringify(planted.homeCloseDates), seen.map((d) => d.field).join(', '));
          continue;
        }
        ok(`P.${k} ⭐ ${plant.what} is reported in ${plant.need}, and nowhere outside ${plant.within.join(" / ")}`,
          seen.some((d) => inside(d.field, [plant.need])) && seen.every((d) => inside(d.field, plant.within)),
          seen.length ? seen.slice(0, 2).map((d) => `${d.field}: ${d.detail}`).join(" | ").slice(0, 400) : "NOT SEEN — a book compare with this harness proves nothing");
        if (plant.population) {
          const sample = syntheticBook(); sample.book[k] = planted;
          const failed = bookChecks(sample.book, sample.seed, {...sample.store, ...blobs}).find((c) => c.id === 'B.9').fails;
          ok(`P.${k} ${plant.what} also fails the same B.9 exact population verdict`, failed.includes(k), JSON.stringify(planted.homeCloseDates));
        }
      }
    }
    // ⑤b S7 WP1 calibration 2 · the settle (BOOK_SETTLE), in the cell where 090bbf76's null pair saw its cause: a lazy image
    // the browser has not fetched — planted as the payment rail draws its logos, first in <main> and 20000px below the
    // fold, its src set last (so the browser meets it lazy, in the page, out of reach) and one no other image on the page
    // has (so no cache can draw it) — reads 0x0 in a capture without the settle (the control: the browser left it
    // unfetched) and is drawn in a capture with it, and the two captures differ in boxes alone: the markup is the same,
    // its loading="lazy" put back.
    {
      const [v, l, w, r] = ["guest", "en", 360, "/"];
      const k = keyOf(`book-${v}`, l, w, r);
      const IMG = '<img alt="M-Pesa" loading="lazy" decoding="async" class="max-h-full max-w-full object-contain" src="/pay/mpesa.svg?kp-parity-plant">';
      const lazy = { js: () => {
        const slot = document.createElement("div");
        slot.setAttribute("data-parity-plant", "");
        slot.setAttribute("style", "position:absolute;left:0;top:20000px;width:40px;height:40px;display:flex;align-items:center;justify-content:center");
        document.querySelector("#main-content").prepend(slot);
        const img = document.createElement("img");
        for (const [a, x] of [["alt", "M-Pesa"], ["loading", "lazy"], ["decoding", "async"], ["class", "max-h-full max-w-full object-contain"]]) img.setAttribute(a, x);
        slot.append(img);
        img.setAttribute("src", "/pay/mpesa.svg?kp-parity-plant");
      } };
      const unsettled = await captureBookCell([], l, w, r, bookV.similarId, { ...lazy, unsettled: true });
      const settled = await captureBookCell([], l, w, r, bookV.similarId, lazy);
      if (unsettled.error || settled.error) ok(`P.${k} the settle's two captures were taken`, false, unsettled.error ?? settled.error);
      else {
        const box = (c) => ((blobs[c.regions.main?.layout] ?? "").split(NL).find((x) => x.startsWith("main>div0>img0 ")) ?? "").split(" ")[1] ?? "(no line)";
        const planted = (c) => (blobs[c.regions.main?.html] ?? "").includes(IMG);
        const seen = diffCells(r, unsettled, settled, blobs, blobs, BOOK_EXPECTED_DIFFS).unexpected;
        ok(`P.${k} ⭐ a lazy image the browser has not fetched (planted 20000px below the fold) reads 0x0 in a capture without the settle and is drawn in one with it, and the two differ in boxes alone (regions.*.layout): the markup is the same, its loading="lazy" put back (BOOK_SETTLE)`,
          planted(unsettled) && planted(settled) && box(unsettled) === "0x0" && !["0x0", "~", "(no line)"].includes(box(settled))
            && seen.some((d) => d.field === "regions.main.layout") && seen.every((d) => d.field.endsWith(".layout")),
          `the planted image ${box(unsettled)} unsettled, ${box(settled)} settled · ${seen.length ? seen.slice(0, 3).map((d) => `${d.field}: ${d.detail}`).join(" | ") : "no difference"}`.slice(0, 400));
      }
    }
  }

  // ⑥ S8 WP1 · the question phase in the browser, after the book (it reads the book's world, as a capture does): the
  // questions are found and made through the existing doors and judged; then two clean captures of each QUESTION_PROVE
  // cell agree — the clocks masked, the chart's time axis read whole — and each plant is reported in its own field and
  // nowhere else: a class added in the bet panel (the panel's field only), a holder row's Sell label changed (the holder's
  // field only), a kp-jbet element in a classic question page (the trace in the page) and data-sheet on a classic card in
  // the question page's raw bytes (the raw trace). Last, the reader on a break: the cooling-off taken through its real
  // form, and two clean captures of a break cell agree.
  {
    const progress = bookPR?.watchlist?.reply?.forcedProgress?.[0] ?? null;
    const qSeed = holder.length && seeded.held && !bookRefused.length
      ? await seedQuestions(holder, seeded.held, progress)
      : { error: !holder.length ? "the demo player is not signed in" : !seeded.held ? "no held question (the Sell seed)" : "the book was refused" };
    const qV = questionVerdict(qSeed);
    ok(`P.question the questions are found and made through the existing doors (${JSON.stringify(qSeed.ids ?? null)}), and the held tickets' free windows closed first (${qSeed.freeWait?.closed ? `after ${secs(qSeed.freeWait.ms)}` : "not"})`,
      qV.problems.length === 0, qV.problems.join(" · "));
    if (!qV.problems.length) {
      const ids = qSeed.ids;
      const stateOf = (id) => QUESTION.states.find((x) => x.id === id);
      const QUESTION_PROVE = [
        { v: "player", l: "en", w: 1280, s: "open-yes", plants: [
          { id: "q-panel", js: () => { const x = document.querySelector('#main-content aside[aria-labelledby="bet-panel-heading"] > div'); if (x) x.classList.add("kp-parity-plant"); },
            what: "a class added in the bet panel", need: "regions.panel.html", within: ["regions.panel."] },
          // The holder's Sell button hydrates after the shell (open() waits for the header's fiber): a label changed before
          // its own fiber exists is a hydration mismatch, which React redraws and files as a page error — so the plant waits.
          { id: "q-sell-label", js: async () => {
            const find = () => document.querySelector("#main-content section.order-2 > section.bg-bg-elevated .ticket-target > button > span");
            const fiber = (el) => !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
            for (let i = 0; i < 200 && !fiber(find()); i++) await new Promise((go) => setTimeout(go, 50));
            const x = find();
            if (x) x.textContent = `${x.textContent}·`;
          },
            what: "a holder row's Sell label changed", need: "regions.holder.html", within: ["regions.holder."] },
        ] },
        { v: "guest", l: "sw", w: 360, s: "open", plants: [
          { id: "q-jbet", js: () => { const d = document.createElement("div"); d.className = "kp-jbet"; d.setAttribute("data-parity-plant", ""); document.body.append(d); },
            what: "a kp-jbet element in a classic question page", need: "journey", within: ["journey"] },
          { id: "q-sheet", bytes: (t) => t.replace(/<article\b(?=[^>]*\bmcardp\b)/, '<article data-sheet=""'),
            what: "data-sheet on a classic card in the question page's raw bytes", need: "raw", within: ["raw"] },
        ] },
        { v: "player", l: "sw", w: 360, s: "settled", plants: [] },
        { v: "player", l: "en", w: 360, s: "time-closed", plants: [] },
        { v: "guest", l: "en", w: 1280, s: "selection-closed", plants: [
          { id: "q-event-clock", noDiff: true, js: () => {
            const el = document.querySelector('#main-content script[type="application/ld+json"]');
            const event = JSON.parse(el.textContent);
            for (const key of ["startDate", "endDate"]) event[key] = new Date(Date.parse(event[key]) + 3_600_000).toISOString();
            el.textContent = JSON.stringify(event);
          }, what: "only the inert Event's top-level seed clocks move" },
          { id: "q-event-words", js: () => {
            const el = document.querySelector('#main-content script[type="application/ld+json"]');
            const event = JSON.parse(el.textContent); event.name += "·"; el.textContent = JSON.stringify(event);
          }, what: "the Event's words change beside its masked clocks", need: "regions.main.html", within: ["regions.main.html"] },
          { id: "q-event-url", js: () => {
            const el = document.querySelector('#main-content script[type="application/ld+json"]');
            const event = JSON.parse(el.textContent); event.location.url += "?changed=1"; el.textContent = JSON.stringify(event);
          }, what: "the Event's location URL changes beside its masked clocks", need: "regions.main.html", within: ["regions.main.html"] },
        ] },
      ];
      const proveCell = async (v, l, w, s, jar, plants) => {
        const st = stateOf(s);
        const k = keyOf(`question-${v}`, l, w, st.route);
        const clean = await captureQuestionCell(jar, l, w, st, ids);
        const again = await captureQuestionCell(jar, l, w, st, ids);
        if (clean.error || again.error) { ok(`P.${k} the question cell was captured`, false, clean.error ?? again.error); return; }
        const noise = diffCells(st.route, clean, again, blobs, blobs, QUESTION_EXPECTED_DIFFS).unexpected;
        const regionsOk = clean.regions.main?.count === 1 && clean.regions.panel?.count === 1 && clean.regions.holder?.count === (v === "guest" ? 0 : 1);
        ok(`P.${k} two clean captures of a question cell agree — the instrument is deterministic on one server, its clocks masked`,
          noise.length === 0 && regionsOk && clean.stable && again.stable,
          `${noise.length ? noise.slice(0, 3).map((d) => `${d.field}: ${d.detail}`).join(" | ").slice(0, 400)
            : `main ${clean.regions.main?.count ?? 0} · panel ${clean.regions.panel?.count ?? 0} · holder ${clean.regions.holder?.count ?? 0} · stable ${clean.stable}/${again.stable} · masked ${JSON.stringify(clean.masked)}`}${notedIn(clean, again)}`);
        for (const plant of plants) {
          const planted = await captureQuestionCell(jar, l, w, st, ids, plant);
          if (planted.error) { ok(`P.${k} ${plant.id} was captured`, false, planted.error); continue; }
          const seen = diffCells(st.route, clean, planted, blobs, blobs, QUESTION_EXPECTED_DIFFS).unexpected;
          ok(`P.${k} ⭐ ${plant.what}${plant.noDiff ? " compares equal" : ` is reported in ${plant.need}, and nowhere outside ${plant.within.join(" / ")}`}`,
            plant.noDiff ? seen.length === 0 : seen.some((d) => inside(d.field, [plant.need])) && seen.every((d) => inside(d.field, plant.within)),
            seen.length ? seen.slice(0, 2).map((d) => `${d.field}: ${d.detail}`).join(" | ").slice(0, 400) : plant.noDiff ? "only the named inert clock tokens moved" : "NOT SEEN — a question compare with this harness proves nothing");
        }
      };
      await warm(holder, [...new Set(QUESTION_PROVE.filter((c) => c.v === "player").map((c) => routeOfQuestion(stateOf(c.s).route, ids)))]);
      await warm([], [...new Set(QUESTION_PROVE.filter((c) => c.v === "guest").map((c) => routeOfQuestion(stateOf(c.s).route, ids)))]);
      for (const { v, l, w, s, plants } of QUESTION_PROVE) await proveCell(v, l, w, s, v === "player" ? holder : [], plants);
      const brk = await takeBreak();
      ok("P.break the reader on a break: the cooling-off is taken through /profile/responsible-gambling's real form, and the demo player signs in again", !brk.error, brk.error ?? "");
      if (!brk.error) await proveCell("break", "sw", 1280, "break-empty", brk.jar, []);
    }
  }
}

// ── what every capture must show, in every mode that captures the matrix ──────────────────────────────────
if (!PROVE_RED) {
  console.log(`\n§2 · the population is what it claims`);
  for (const c of populationChecks(cells, blobs)) ok(`${c.id} ${c.name}`, c.fails.length === 0, listOf(c.fails));
  ok("2.12 the served files held still for the whole capture (checked after every viewer and language)", !treeMoved, treeMoved ?? "");

  console.log(`\n§3 · /account, for a viewer the journey is not shown to, is the not-found page (A3 — every run)`);
  for (const c of accountChecks(cells, accountLoaders())) ok(`${c.id} ${c.name}`, c.fails.length === 0, listOf(c.fails));

  console.log(`${NL}§S · the Sell button a classic holder is served (WP10 — every run that captures)`);
  for (const c of sellChecks(sellCells, sellSeed, blobs)) ok(`${c.id} ${c.name}`, c.fails.length === 0, listOf(c.fails));

  console.log(`${NL}§B · a classic reader's page bodies, the LIVE strip, the similar rail and /'s head, over the seeded book (S7 WP1, A8 — every run that captures)`);
  console.log(`  the book: ${bookSummary(bookSeed)}`);
  const drawn = cardTally(bookCells);
  console.log(`  card states drawn across the book's cells: ${[...CARD_STATES, "other"].map((s) => `${CARD_LABELS[s]} ${drawn.get(s) ?? 0}`).join(" · ")}`);
  for (const c of bookChecks(bookCells, bookSeed, blobs)) ok(`${c.id} ${c.name}`, c.fails.length === 0, listOf(c.fails));

  console.log(`${NL}§Q · the question page's classic body — <main>, the bet panel and the holder section — in every classic state S8's ternaries stand beside (S8 WP1 — every run that captures)`);
  console.log(`  the questions: ${JSON.stringify(questionSeed?.ids ?? null)}`);
  {
    const masked = new Map();
    for (const c of Object.values(questionCells)) for (const [id, n] of Object.entries(c.masked ?? {})) masked.set(id, (masked.get(id) ?? 0) + n);
    console.log(`  masked across the question cells: ${QUESTION_MASKS.map((m) => `${m.id} ${masked.get(m.id) ?? 0}`).join(" · ")} · server-times by eat-dates and norm`);
  }
  for (const c of questionChecks(questionCells, questionSeed, blobs)) ok(`${c.id} ${c.name}`, c.fails.length === 0, listOf(c.fails));

  if (COMPARE) {
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
    // ⭐ S7 WP1 · the book's cells against the baseline's (A8): a classic reader's page bodies, the LIVE strip, the similar
    // rail and /'s head. S7 promises them unchanged, so any difference is a failure unless BOOK_EXPECTED_DIFFS names it.
    const bookBase = baseline.book ?? {};
    const bookBaseKeys = Object.keys(bookBase).sort(), bookCurKeys = Object.keys(bookCells).sort();
    ok("4.7 the same book cells as the baseline", bookCurKeys.length > 0 && JSON.stringify(bookBaseKeys) === JSON.stringify(bookCurKeys), `${bookBaseKeys.length} vs ${bookCurKeys.length}`);
    const bookHits = new Map();
    let bookDiffering = 0, bookCompared = 0, bookShown = 0;
    for (const k of bookCurKeys) {
      const was = bookBase[k], now = bookCells[k];
      if (!was || was.error || now.error) continue;
      bookCompared++;
      const { unexpected, expected } = diffCells(partsOf(k).r, was, now, baseline.blobs, blobs, BOOK_EXPECTED_DIFFS);
      for (const e of expected) bookHits.set(e.id, (bookHits.get(e.id) ?? 0) + 1);
      if (!unexpected.length) continue;
      bookDiffering++;
      if (bookShown++ < 40) for (const d of unexpected.slice(0, 3)) console.log(`  ✗ ${k} — ${d.field}: ${d.detail}`.slice(0, 600));
    }
    if (bookShown > 40) console.log(`  … and ${bookShown - 40} more book cell(s)`);
    ok(`4.8 ⭐ no unexpected difference in the ${bookCompared} book cells: a classic reader is served today's page bodies, LIVE strip, similar rail and head`,
      bookCompared > 0 && bookCompared === bookCurKeys.length && bookDiffering === 0, bookDiffering ? `${bookDiffering} book cell(s) differ` : "");
    const bookDevCells = bookCurKeys.filter((k) => (bookCells[k]?.devOnly ?? []).length);
    if (bookDevCells.length) console.log(`  DEV-ONLY, filed and not compared, in ${bookDevCells.length} book cell(s): ${bookDevCells.slice(0, 8).join(", ")}${bookDevCells.length > 8 ? " …" : ""}`);
    for (const e of BOOK_EXPECTED_DIFFS) console.log(`  EXPECTED ${e.id} — seen in ${bookHits.get(e.id) ?? 0} of ${e.cells} book cell(s). ${e.reason}`);
    ok("4.9 each named book difference is seen in all of its cells or in none", partialExpected(bookHits, BOOK_EXPECTED_DIFFS).length === 0,
      partialExpected(bookHits, BOOK_EXPECTED_DIFFS).join(" · "));
    // ⭐ S8 WP1 · the question cells against the baseline's: the question page's classic <main>, bet panel and holder
    // section. S8 promises them unchanged, so any difference is a failure unless QUESTION_EXPECTED_DIFFS names it.
    const questionBase = baseline.question ?? {};
    const questionBaseKeys = Object.keys(questionBase).sort(), questionCurKeys = Object.keys(questionCells).sort();
    ok("4.10 the same question cells as the baseline", questionCurKeys.length > 0 && JSON.stringify(questionBaseKeys) === JSON.stringify(questionCurKeys), `${questionBaseKeys.length} vs ${questionCurKeys.length}`);
    const questionHits = new Map();
    let questionDiffering = 0, questionCompared = 0, questionShown = 0;
    for (const k of questionCurKeys) {
      const was = questionBase[k], now = questionCells[k];
      if (!was || was.error || now.error) continue;
      questionCompared++;
      const { unexpected, expected } = diffCells(partsOf(k).r, was, now, baseline.blobs, blobs, QUESTION_EXPECTED_DIFFS);
      for (const e of expected) questionHits.set(e.id, (questionHits.get(e.id) ?? 0) + 1);
      if (!unexpected.length) continue;
      questionDiffering++;
      if (questionShown++ < 40) for (const d of unexpected.slice(0, 3)) console.log(`  ✗ ${k} — ${d.field}: ${d.detail}`.slice(0, 600));
    }
    if (questionShown > 40) console.log(`  … and ${questionShown - 40} more question cell(s)`);
    ok(`4.11 ⭐ no unexpected difference in the ${questionCompared} question cells: a classic reader is served today's question page — its <main>, its bet panel and its holder section`,
      questionCompared > 0 && questionCompared === questionCurKeys.length && questionDiffering === 0, questionDiffering ? `${questionDiffering} question cell(s) differ` : "");
    for (const e of QUESTION_EXPECTED_DIFFS) console.log(`  EXPECTED ${e.id} — seen in ${questionHits.get(e.id) ?? 0} of ${e.cells} question cell(s). ${e.reason}`);
    ok("4.12 each named question difference is seen in all of its cells or in none", partialExpected(questionHits, QUESTION_EXPECTED_DIFFS).length === 0,
      partialExpected(questionHits, QUESTION_EXPECTED_DIFFS).join(" · "));
    if (differing || sellDiffering || bookDiffering || questionDiffering) {
      const side = `${COMPARE}.current.json`;
      writeFileSync(side, `${JSON.stringify({ kind: KIND, version: VERSION, role: "compare-capture", base: { sha: HEAD.out, tree: TREE, dirty: DIRTY }, matrix: MATRIX, cells, sell: sellCells, book: bookCells, bookSeed, question: questionCells, questionSeed, blobs })}${NL}`, "utf8");
      console.log(`  this run's capture, for reading beside the baseline: ${side}`);
    }
  }

  if (BASELINE) {
    console.log(`\n§R · report only — the classic signed-in header at 320 (DESIGN_AUTHORITY files it as 21px over)`);
    for (const [l, r] of Object.entries(report320 ?? {})) {
      console.log(r && !r.error ? `  ${l} · the header's content ends ${r.pastRight}px past the ${r.viewport}px viewport (rightmost: ${r.rightmost}); its row overflows by ${r.rowOverflow}px` : `  ${l} · not measured — ${r?.error ?? "no header"}`);
    }
    const failedSoFar = results.some((r) => !r);
    const target = failedSoFar ? `${BASELINE}.rejected.json` : BASELINE;
    const doc = {
      kind: KIND, version: VERSION, role: "baseline", rejected: failedSoFar,
      base: { sha: HEAD.out, main: MAIN, fork: FORK.code === 0 ? FORK.out : null, tree: TREE, dirty: DIRTY, capturedAt: new Date().toISOString() },
      server: { base: BASE, rollout, store: health.store ?? null, browser: BROWSER },
      matrix: MATRIX, expectedDiffs: EXPECTED_DIFFS.map((e) => e.id), bookExpectedDiffs: BOOK_EXPECTED_DIFFS.map((e) => e.id), questionExpectedDiffs: QUESTION_EXPECTED_DIFFS.map((e) => e.id), report: { header320: report320 },
      cells, sell: sellCells, seed: sellSeed, book: bookCells, bookSeed, question: questionCells, questionSeed, blobs,
    };
    writeFileSync(target, `${JSON.stringify(doc)}${NL}`, "utf8");
    console.log(`  the book: ${Object.keys(bookCells).length} cells over a pool of ${bookVerdict(bookSeed).pool ?? "?"} LIVE non-demo question(s) (§0j records it) · its normalisers ${BOOK.normalise.join(", ") || "none"}${NORM_SOURCE ? ` (set by ${NORM_SOURCE})` : ""}`);
    console.log(`  the question page: ${Object.keys(questionCells).length} cells over ${JSON.stringify(questionSeed?.ids ?? null)} (§0k records the file) · its masks ${QUESTION.masks.join(", ")}`);
    console.log(failedSoFar
      ? `\n⛔ baseline NOT written — a check above failed, and a baseline is only as good as its population. The capture is in ${target} for reading; --compare refuses it.`
      : `\nbaseline written: ${BASELINE} — base ${short(HEAD.out)}, ${Object.keys(cells).length} cells, ${Object.keys(blobs).length} blobs. Next: a null --compare on a FRESH server at this commit must exit 0.`);
  }
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed — ${MODE} · tree ${short(HEAD.out)}${baseOverridden ? " · ⚠ BASE OVERRIDDEN (--allow-base)" : ""} · ${secs(Date.now() - t0)}`);
process.exit(failed ? 1 : 0);
