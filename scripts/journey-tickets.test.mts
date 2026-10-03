/**
 * test:journey-tickets — TIKETI ZANGU, HELD BEFORE A PREVIEW PHONE IS SENT TO IT (the Vodacom plan S6, SJ-4, SJ-16 and
 * SJ-19; `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` WP9 and amendments A7, A8, A9, A14, A15, A19;
 * `docs/VODACOM-PLAN.md` §0h points 21 and 22, which overrule A16 and step 4's exact figure, and 26, 27 and 33).
 *
 *   npm run test:journey-tickets     (in predeploy)
 *   npm run red:journey-tickets      (--prove-red: every check below has a defect planted IN MEMORY, and each is caught)
 *
 *   §1 THE PAGES — `/positions` asks the one resolver after its session check and, for a journey request, returns the
 *      journey's view BEFORE its classic JSX, which stays the page's one classic return; the tab title follows the same
 *      answer; the view is handed only what the page read and priced. `/updown/history` asks the same resolver and
 *      swaps only its header, through two sibling ternaries that stand where its back link and header stood: its
 *      gutter wrapper, its fragment scroll and its poller are everybody's.
 *   §2 THE CARD — no unresolved ticket shows a payout figure: open, selling closed, or closed and stamped by the
 *      closing sweep, it reads "Malipo · Matokeo yakitoka" (SJ-4, §C3, §0h point 22); a settled ticket shows what was
 *      paid. The question is the card's only link and reaches 44px without moving the card, the state's colour is the
 *      one rule both cards call, the ticket number stays, and the share button, the profit strip, the yes/no bar,
 *      search, sort, the countdown ring, the classic header and row 2 of the bar are shelved on this view (A19, WP9
 *      step 5).
 *   §3 THE DATES — the card is drawn on the server and dates every instant through `formatDeadline`, asked with the
 *      render's own clock (`test:timer-date` §3 holds each date to the instant it names).
 *   §4 THE WORDS (A7) — no Swahili word the view reads says "nafasi" and no Chinese one says 持仓: the view's files, the
 *      bar's journey variant and every helper it calls, the journey arms of both error pages and the tab title; every
 *      word resolves in en, sw and zh; the bar draws no result count, all seven lenses stay, and both bars render ONE
 *      rail element, so the `data-filter-rail` hook is written once in the file (`red:filter-language`'s vacuity case
 *      removes it whole).
 *   §5 THE SWITCH — the kit's underline rail in link mode: links, `aria-current="page"` on the current kind, no tab
 *      widget; loaded lazily through a small client wrapper, so the kit's code is not in a classic reader's first load
 *      (VODACOM-PLAN §0h point 20); each page passes its own kind, so the current link is always the page being read
 *      (A12).
 *   §6 THE GUEST SHEET — a guest's Tiketi zangu signs in or up and comes back to `/positions`.
 *   §7 THE VIEW — it polls and scrolls to a ticket's fragment as the classic page does, every card carries the id a
 *      fragment names, and the Utendaji link, after the list and the pager, keeps `/positions/performance` a door on a
 *      journey phone (A15, §0h point 33).
 *   §8 NO HOUSE — no house name in a journey Tiketi file, and nothing there reads a store or prices an exit.
 *   §9 THE SELL BUTTON (A8, WP10) — the card binds the server's instant once, `freeExitEndsAt(…)`, and hands the
 *      button that instant, the journey's look, the instant's clock time read on the server, and whether the page
 *      priced the exit free; `test:sell-grace-truth` §2 names the card among its hosts and holds the label to the instant.
 *   §10 LOADING AND ERRORS (§0h point 21) — each loading file asks the per-request resolver beside the words and
 *      returns ONE ghost by its answer: the journey's for a journey request, today's (kept whole) for everybody else,
 *      both picked and drawn on the server. The error pages are client components, never drawn on the server (React's
 *      server renderer cannot run an error boundary): each mounts in the browser as a fresh render and picks its words
 *      from `useJourneyOn()`, which reads the shell's mark, already in the page.
 *   §11 THE WIRING (A14) — this suite is in predeploy and its red twin is declared.
 *   §12 THE SELL LOOK (WP10) — the journey's look is the card's alone (every host is found on disk), and without it the
 *      button is today's (its classic return and the dialogs it shares pinned line for line, the dialogs' own words
 *      today's); the sale is one code path for both looks; the free offer names the server's clock time beside the
 *      countdown and promises the server's own figure, and every piece of it is drawn only on the free offer; a free
 *      price whose countdown has run out is withdrawn at once and the page is asked for the server's answer; a price with
 *      a fee keeps "Uza sasa" and its fee; a shut exit is words, not a button, from the first paint; the button's edge
 *      is the kit's token for a control's edge; the look computes nothing and formats no time; and the journey's sell
 *      path says no "nafasi" — its one Chinese 持仓 is the sold receipt's small heading and its three Swahili "toa" words
 *      today's cash-out headings, each named (VODACOM-PLAN §0h point 36).
 *
 * ⚠️ WHAT IT DOES NOT HOLD. Off Tiketi zangu itself, until the S15 rename (VODACOM-PLAN §3): `/positions/performance`,
 * the question page's holder heading and the desktop avatar menu's row. §4 and §12 read Tiketi zangu, not those. §12
 * reads the sell path's words from its source; the refusal sentences a sale can meet are picked at run time from the
 * shared registry, and are not in that scan (§0h point 36 names the one that says 持仓).
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` hands every section edited source TEXT held in memory (and §2 defective
 * payout rules) and requires the check named for each defect to fail — and every check has at least one such plant.
 * Nothing here writes a file, so `test:red-anchors` §4 counts it in the in-process class.
 * ⚠️ This file carries no backslash at all — line breaks are built from their code points and every pattern is spelt
 * with character classes — so a tool that decodes escapes on the way to disk cannot change what it tests.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { srcFiles } from "./lib/tracked-files.mts";
import { dict } from "../src/lib/i18n-dict.ts";
import { POSITION_LENSES } from "../src/lib/positions/portfolio.ts";
import * as PAYOUT from "../src/components/journey/tickets/ticket-payout.ts";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const PROVE_RED = process.argv.includes("--prove-red");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const BS = String.fromCharCode(92);
const BT = String.fromCharCode(96);
const read = (rel: string) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8").split(CR + LF).join(LF) : "");
const show = (v: unknown) => JSON.stringify(v) ?? String(v);
const count = (s: string, needle: string) => s.split(needle).length - 1;
/** Each line trimmed and the lines joined, so a check reads the code and not its layout. */
const squash = (s: string) => s.split(LF).map((l) => l.trim()).join("");
type Ok = (label: string, cond: boolean, detail?: string) => void;

/* ══ THE SOURCE WORLD — read once, comments stripped; the red twin plants edits in memory ══════════════════════ */
const PAGE = "src/app/positions/page.tsx";
const BAR = "src/app/positions/positions-bar.tsx";
const LOADING = "src/app/positions/loading.tsx";
const ERROR = "src/app/positions/error.tsx";
const HISTORY = "src/app/updown/history/page.tsx";
const HISTORY_LOADING = "src/app/updown/history/loading.tsx";
const HISTORY_ERROR = "src/app/updown/history/error.tsx";
const TICKETS_DIR = "src/components/journey/tickets/";
const VIEW = `${TICKETS_DIR}tickets-view.tsx`;
const CARD = `${TICKETS_DIR}ticket-card.tsx`;
const SWITCH = `${TICKETS_DIR}ticket-switch.tsx`;
const RAIL = `${TICKETS_DIR}ticket-switch-rail.tsx`;
const GHOST = `${TICKETS_DIR}tickets-ghost.tsx`;
const RULE = `${TICKETS_DIR}ticket-payout.ts`;
const CLASSIC_CARD = "src/components/markets/position-card.tsx";
const TONE = "src/lib/status-tone.ts";
const SIDE_LABEL = "src/lib/side-label.ts";
const TABS = "src/components/ui/tabs.tsx";
const GUEST_SHEET = "src/components/journey/tickets-guest-sheet.tsx";
const PROXY = "src/proxy.ts";
const SELL_GATE = "scripts/sell-grace-truth.test.mts";
const TW_CONFIG = "tailwind.config.ts";
/** S6 WP10 — the Sell button and its confirm dialog, which draw the journey's look, and the question page, a classic host. */
const SELL_BUTTON = "src/components/markets/sell-button.tsx";
const SELL_MODAL = "src/components/markets/sell-confirm-modal.tsx";
const MARKET_PAGE = "src/app/markets/[id]/page.tsx";
/** The journey's own Tiketi files, each held whole. */
const JOURNEY_FILES = [VIEW, CARD, SWITCH, RAIL, GHOST, RULE];
const SOURCES = [PAGE, BAR, LOADING, ERROR, HISTORY, HISTORY_LOADING, HISTORY_ERROR, ...JOURNEY_FILES,
  CLASSIC_CARD, TONE, SIDE_LABEL, TABS, GUEST_SHEET, PROXY, SELL_GATE, TW_CONFIG, SELL_BUTTON, SELL_MODAL, MARKET_PAGE];

type World = {
  files: Readonly<Record<string, string>>;
  scripts: Readonly<Record<string, string>>;
  dicts: Readonly<Record<string, unknown>>;
};
const WORLD: World = {
  files: Object.fromEntries(SOURCES.map((rel) => [rel, decomment(read(rel))])),
  scripts: (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts,
  dicts: { en: dict.en, sw: dict.sw, zh: dict.zh },
};
const text = (W: World, rel: string) => W.files[rel] ?? "";
/** A source this world holds, or any other file as it stands on disk, comments stripped the same way. */
const textOf = (W: World, rel: string) => W.files[rel] ?? decomment(read(rel));
/** A file's first statement is the client directive (`trimStart` also drops a byte-order mark). */
const isClient = (s: string) => s.trimStart().startsWith(`"use client"`);
const after = (s: string, head: string) => { const at = s.indexOf(head); return at < 0 ? "" : s.slice(at); };
const between = (s: string, head: string, end: string) => {
  const a = s.indexOf(head);
  if (a < 0) return "";
  const b = s.indexOf(end, a + head.length);
  return b < 0 ? s.slice(a) : s.slice(a, b);
};

/** Index just past the string or template literal whose quote is s[i]; -1 when it never closes. */
function skipLiteral(s: string, i: number): number {
  const q = s[i];
  let j = i + 1;
  while (j < s.length) {
    const c = s[j];
    if (c === BS) { j += 2; continue; }
    if (q === BT && c === "$" && s[j + 1] === "{") {
      const k = closeOf(s, j + 1);
      if (k < 0) return -1;
      j = k + 1;
      continue;
    }
    if (c === q) return j + 1;
    if (c === LF && q !== BT) return -1;
    j++;
  }
  return -1;
}
/** Index of the bracket closing the one at `i` ("(" or "{"), string and template literals skipped; -1 when none. */
function closeOf(s: string, i: number): number {
  const open = s[i];
  const shut = open === "(" ? ")" : "}";
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === `"` || c === "'" || c === BT) {
      const k = skipLiteral(s, j);
      if (k < 0) return -1;
      j = k - 1;
      continue;
    }
    if (c === open) depth++;
    else if (c === shut) {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}
/** A function's whole text — its header, its parameters and its body — or "" when the header is not in `src`. */
function fnBody(src: string, header: string): string {
  const at = src.indexOf(header);
  if (at < 0) return "";
  const paren = src.indexOf("(", at);
  const shut = paren < 0 ? -1 : closeOf(src, paren);
  const brace = shut < 0 ? -1 : src.indexOf("{", shut);
  const end = brace < 0 ? -1 : closeOf(src, brace);
  return end < 0 ? "" : src.slice(at, end + 1);
}
/** Edit only the text of one function, leaving the rest of the file as it is. */
const inFn = (header: string, edit: (body: string) => string) => (s: string) => {
  const body = fnBody(s, header);
  return body ? s.split(body).join(edit(body)) : s;
};
/** The JSX from the `{` at `head` to the `}` closing the sibling ternary that starts at `next` after it, squashed. */
function siblingTernaries(s: string, head: string, next: string): string {
  const a = s.indexOf(head);
  const b = a < 0 ? -1 : s.indexOf(next, a + head.length);
  const end = b < 0 ? -1 : closeOf(s, b);
  return end < 0 ? "" : squash(s.slice(a, end + 1));
}

/* ══ THE IMPLEMENTATION UNDER TEST — the payout rule, passed in so the red twin can hand in defective ones ═════ */
type Impl = { payout: typeof PAYOUT.ticketPayout };
const REAL: Impl = { payout: PAYOUT.ticketPayout };

/* ══ §1 · THE PAGES ══════════════════════════════════════════════════════════════════════════════════════════ */
const ASK = "const { journey } = await resolveSimpleJourney();";
const CLASSIC_RETURN = `<PageContainer tier="reading" className="space-y-6">`;
/** The view as the page hands it over: what the page read and priced, by name, and nothing read for it alone. */
const VIEW_ELEMENT = ["<TicketsView", "rows={rows}", "positions={byId}", "markets={marketMap}", "prices={pricedById}",
  "lens={state.tab}", "page={pageNum}", "serverNow={serverNow}", "locale={locale}", "t={t}", "/>"].join("");
/** The history page's header: two sibling ternaries, each where its element stood — the tickets' head for a journey request, today's back link and header for everybody else. */
const HISTORY_HEAD_OPEN = "{journey ? <TicketsHead";
const HISTORY_HEAD = [`{journey ? <TicketsHead current="updown" t={t} /> : <BackLink fallbackHref="/updown" label={t.market.udBackToBoard} />}`,
  `{journey ? null : (`, `<div className="mt-3">`,
  `<PageHeader eyebrow={t.market.udTitle} title={t.market.udHistoryTitle} subtitle={t.market.udHistoryBody} />`,
  `</div>`, `)}`].join("");
const HISTORY_WRAPPER = `<div className="mx-auto w-full max-w-reading px-3 lg:px-6 py-6">`;
const HISTORY_POLLER = "<RefreshPoller intervalMs={20_000} enabled={anyLive} />";

function g1Pages(W: World, ok: Ok) {
  const page = text(W, PAGE);
  const body = after(page, "export default async function PositionsPage(");
  const session = body.indexOf(`if (!session) redirect("/auth/login?next=/positions");`);
  const asked = body.indexOf(ASK);
  ok("1.ask · /positions asks the one resolver once, after its session check — the shell's own answer for this request, never a page deciding for itself",
    session > 0 && asked > session && count(body, ASK) === 1 && count(page, "resolveSimpleJourney(") === 2, show({ session, asked }));
  const branch = body.indexOf("if (journey) {");
  const view = body.indexOf("<TicketsView");
  const classic = body.indexOf(CLASSIC_RETURN);
  ok("1.first · a journey request returns the journey's view BEFORE the classic JSX, which stays the page's one classic return",
    asked > 0 && branch > asked && view > branch && classic > view && squash(body.slice(branch, view)) === "if (journey) {return ("
      && count(page, "<TicketsView") === 1 && count(page, CLASSIC_RETURN) === 1,
    show({ asked, branch, view, classic }));
  const element = view < 0 ? "" : body.slice(view, body.indexOf("/>", view) + 2);
  ok("1.handed · the view is handed what the page read and priced — the rows, the positions, their markets, the priced exits — and nothing read for it alone",
    squash(element) === VIEW_ELEMENT, squash(element).slice(0, 240));
  const meta = between(page, "export async function generateMetadata", "export const dynamic");
  ok("1.meta · the tab title follows the same answer: Tiketi zangu for a journey request, today's word for everybody else",
    meta.includes(ASK) && meta.includes("title: journey ? t.journey.tabTickets : t.common.positions") && count(meta, "t.journey.") === 1,
    meta.slice(0, 260));
  const history = text(W, HISTORY);
  const hbody = after(history, "export default async function UpDownHistoryPage(");
  const hsession = hbody.indexOf("if (!session) redirect(");
  const hasked = hbody.indexOf(ASK);
  const head = hbody.indexOf(HISTORY_HEAD_OPEN);
  const swapped = siblingTernaries(hbody, HISTORY_HEAD_OPEN, "{journey ? null : (");
  ok("1.history · /updown/history asks the same resolver after its session check and swaps ONLY its header, through two sibling ternaries standing where its back link and header stood — the tickets' head for a journey request, today's two elements for everybody else",
    hsession > 0 && hasked > hsession && count(hbody, ASK) === 1 && head > hasked && swapped === HISTORY_HEAD && count(history, "<TicketsHead") === 1,
    head < 0 ? "no journey ternary" : swapped.slice(0, 240));
  const scroll = hbody.indexOf("<HashFocus />");
  ok("1.history.kept · …its gutter wrapper, its fragment scroll and its poller are everybody's, above the swap",
    count(history, HISTORY_WRAPPER) === 1 && count(history, "<HashFocus />") === 1 && scroll > 0 && scroll < head
      && count(history, HISTORY_POLLER) === 1,
    show({ wrapper: count(history, HISTORY_WRAPPER), scroll, head, poller: count(history, HISTORY_POLLER) }));
}

/* ══ §2 · THE CARD ═══════════════════════════════════════════════════════════════════════════════════════════ */
const AT_RESULT_ARM = [`payout.kind === "atResult" ? (`, `) : (`];
const RULE_CALL = "const payout = ticketPayout(p);";
/** What would let an unresolved ticket show a figure: a projection, the closing sweep's stamp, the classic exact words. */
const FIGURE_LEAKS = ["potentialPayout", "selectionClosedNotifiedAt", "payoutIfWin", "payoutExactNote", `"exact"`];
const CHIP_RULE = `status === "LOSS" ? "no" : (playerStatusChip(status) ?? "warning")`;
const TITLE_LINK = "<Link href={" + BT + "/markets/${p.marketId}" + BT + " as never}";
/** The question's words: the short title, or the full one held to two lines by a clamp on the words themselves. */
const TITLE_WORDS = `<span className={title.short ? undefined : "line-clamp-2"}>{title.text}</span>`;
/** The heading the question sits in: one 20px line per line of words (16px type, leading 1.25). */
const TITLE_HEADING = `<h2 className="mt-3 font-display text-body-lg font-semibold leading-tight text-text">`;
/** The link's reach: the scale's step 2 of padding above and below, taken back by the same step as negative margin. */
const TITLE_REACH = `className="-my-2 block py-2 hover:underline"`;
/** Step 2 of the spacing scale as tailwind.config.ts overrides it: 12px, so a 20px line reaches 44px. */
const STEP_2 = `"2": "12px",`;
const TICKET_NUMBER = `<p className="flex items-center gap-1.5 break-all font-mono"><I.ticket s={14} className="shrink-0" />{p.id}</p>`;
/** What A19 shelves for preview viewers, and the classic pieces the journey's view replaces (its card, its header's words). */
const SHELVED = ["PositionShare", "PnlSummaryStrip", "SearchBox", "CountdownRing", "QuerySort", "FilterSheet", "<PositionsBar ",
  "<PositionCard", "openYesStake", "eyebrow={t.common.positions}", "t.positions.headline"];
/** Row 2 of the classic bar — sort, the phone sheet, the side, topic and window groups, clear — which the journey variant never draws. */
const ROW2 = ["QUERY_BAR_ROW2_CLASS", "QuerySort", "FilterSheet", "FilterGroupKey", "QueryClear", "SIDE_IDS", "TOPIC_IDS", "WHEN_IDS"];

function g2Card(I: Impl, W: World, ok: Ok) {
  const open = I.payout({ status: "OPEN", finalPayout: null });
  ok("2.open · an unresolved ticket shows no payout figure — Malipo · Matokeo yakitoka — whatever its market is doing (SJ-4, §C3, §0h point 22)",
    open.kind === "atResult", show(open));
  const won = I.payout({ status: "WIN", finalPayout: 2_218 });
  const lost = I.payout({ status: "LOSS", finalPayout: 0 });
  const unrecorded = I.payout({ status: "LOSS", finalPayout: null });
  const refunded = I.payout({ status: "VOID", finalPayout: 1_000 });
  const sold = I.payout({ status: "CASHED_OUT", finalPayout: 950 });
  ok("2.final · a settled ticket shows what was paid: a win its payout (and says it was won), a loss 0, a refund the stake, a sale what it sold for, and 0 where nothing was recorded",
    won.kind === "final" && won.amount === 2_218 && won.won
      && lost.kind === "final" && lost.amount === 0 && !lost.won && unrecorded.kind === "final" && unrecorded.amount === 0
      && refunded.kind === "final" && refunded.amount === 1_000 && !refunded.won && sold.kind === "final" && sold.amount === 950 && !sold.won,
    show({ won, lost, unrecorded, refunded, sold }));
  const card = text(W, CARD);
  const arm = between(card, AT_RESULT_ARM[0], AT_RESULT_ARM[1]);
  const leaks = FIGURE_LEAKS.filter((x) => card.includes(x));
  ok("2.render · the card draws the rule's two answers and nothing else: the unresolved arm prints the words and no money, and the card reads no projection, no stamp and no exact-figure word — so a ticket whose selling has closed, stamped or not, shows no figure either",
    arm.includes("value={t.journey.ticketPayoutAtResult}") && !arm.includes("formatTzs(") && !arm.includes("money")
      && count(card, RULE_CALL) === 1 && count(card, "<Stat") === 3 && leaks.length === 0,
    show({ leaks, stats: count(card, "<Stat"), arm: arm.slice(0, 160) }));
  ok("2.title · the question is the card's only link — to its market — the short title where one is approved, the full one held to two lines",
    count(card, "<Link") === 1 && card.includes(TITLE_LINK) && card.indexOf("<h2") < card.indexOf(TITLE_LINK)
      && card.indexOf(TITLE_LINK) < card.indexOf("</h2>") && card.includes("const title = cardTitle(locale, m);")
      && card.includes(TITLE_WORDS) && card.includes("<article"),
    show({ links: count(card, "<Link"), words: card.includes(TITLE_WORDS) }));
  ok("2.reach · the question's link reaches 44px and moves nothing: 12px of padding each way (step 2 of this repo's scale) around its 20px line, taken back by the same negative margin — side-picker's absorber — with the two-line clamp on the words inside, never on the padded link",
    card.includes(`${TITLE_LINK} ${TITLE_REACH}>`) && card.includes(TITLE_HEADING) && card.includes(TITLE_WORDS)
      && !card.includes("line-clamp-2 hover:underline") && text(W, TW_CONFIG).includes(STEP_2),
    show({ reach: card.includes(TITLE_REACH), heading: card.includes(TITLE_HEADING), step2: text(W, TW_CONFIG).includes(STEP_2) }));
  const classic = text(W, CLASSIC_CARD);
  const tone = fnBody(text(W, TONE), "export function positionStatusChip(");
  ok("2.chip · the state's colour is ONE rule both cards call — positionStatusChip, LOSS in the betting rose — and neither card spells it again",
    tone.includes(CHIP_RULE) && count(card, "variant={positionStatusChip(p.status)}") === 1 && count(classic, "variant={positionStatusChip(status)}") === 1
      && [card, classic].every((s) => !s.includes(`"LOSS" ? "no"`) && !s.includes(`?? "warning"`)),
    show({ tone: tone.length, card: count(card, "positionStatusChip("), classic: count(classic, "positionStatusChip(") }));
  ok("2.ticket · the ticket number stays (A19), on a line that may break so a narrow card never clips it", card.includes(TICKET_NUMBER));
  const journeyBar = fnBody(text(W, BAR), BAR_JOURNEY);
  const scanned: Array<[string, string]> = [...[VIEW, CARD, SWITCH, RAIL, GHOST].map((f): [string, string] => [f, text(W, f)]),
    [`${BAR} (journey variant)`, journeyBar]];
  const shelved = scanned.flatMap(([f, s]) => SHELVED.filter((x) => s.includes(x)).map((x) => `${f}: ${x}`));
  const row2 = ROW2.filter((s) => journeyBar.includes(s)).map((s) => `${BAR} (journey variant): ${s}`);
  ok("2.shelved · no share button, profit strip, yes/no bar, search, sort, sheet, countdown ring, classic card or classic header (its eyebrow says “Nafasi”) on the journey's view or its bar's journey variant, and no row 2 on that variant (A19, WP9 step 5)",
    journeyBar.length > 0 && shelved.length === 0 && row2.length === 0, [...shelved, ...row2].join(", "));
}

/* ══ §3 · THE DATES ══════════════════════════════════════════════════════════════════════════════════════════ */
/** What the card may not call: a locale's own formatter, a Date of its own, the raw deadline pieces, Intl. (Its one clock time is 3.clock's.) */
const FORMATTERS = ["toLocale", "new Date(", "formatDateTime(", "formatDayTime(", "Intl."];

function g3Dates(W: World, ok: Ok) {
  const card = text(W, CARD);
  const calls = card.split("formatDeadline(").slice(1);
  const own = FORMATTERS.filter((f) => card.includes(f));
  ok("3.server · the card is drawn on the server and dates every instant through formatDeadline, asked with the render's own clock — never a formatter of its own",
    card.length > 0 && !isClient(card) && !isClient(text(W, VIEW)) && own.length === 0 && calls.length >= 2
      && calls.every((c) => c.slice(0, c.indexOf(")")).endsWith(", serverNow")),
    show({ own, calls: calls.map((c) => c.slice(0, c.indexOf(")"))) }));
  ok("3.clock · its one clock time (WP10) is formatClock of the free-sell instant it hands the Sell button, read on the server — never the placement plus a grace",
    count(card, "formatClock(") === 1 && card.includes(CLOCK_LABEL) && count(card, HOST_BINDING) === 1, show({ clocks: count(card, "formatClock(") }));
}

/* ══ §4 · THE WORDS (A7) ═════════════════════════════════════════════════════════════════════════════════════ */
const WORD = /(?<![A-Za-z0-9_$.])t[.]([A-Za-z]+)[.]([A-Za-z0-9]+)/g;
const CALL = /(?<![A-Za-z0-9_$.])([A-Za-z_][A-Za-z0-9_]*)[(]/g;
const JOURNEY_ARM = /journey(?:On)? [?] (t[.][A-Za-z]+[.][A-Za-z0-9]+) :/g;
const NAFASI = /nafasi/i;
/** The classic Chinese word for a position, "holdings" — the journey's word for a ticket is 注单. */
const HOLDINGS = "持仓";
const BAR_JOURNEY = "export function PositionsBarJourney(";
const RAIL_FN = "function PositionsRail(";
const RAIL_ELEMENT = "<div data-filter-rail className={QUERY_BAR_CLASS}>{children}</div>";
/** A dictionary word by its path, read by this suite's own walk. */
function wordAt(d: unknown, path: string): string {
  let v: unknown = d;
  for (const part of path.split(".")) v = v !== null && typeof v === "object" ? (v as Record<string, unknown>)[part] : undefined;
  return typeof v === "string" ? v : "";
}
/** The text, plus every helper it calls that the bar or the lexicon defines — followed until none is left. */
function followed(W: World, start: string): string {
  const homes = [text(W, BAR), text(W, SIDE_LABEL)];
  const seen = new Set<string>();
  const parts = [start];
  for (let i = 0; i < parts.length; i++) {
    for (const m of parts[i].matchAll(CALL)) {
      const name = m[1];
      if (seen.has(name)) continue;
      seen.add(name);
      for (const home of homes) {
        const body = fnBody(home, `function ${name}(`);
        if (body) { parts.push(body); break; }
      }
    }
  }
  return parts.join(LF);
}
/** Every word the journey's Tiketi view reads, by path. */
function viewWords(W: World): string[] {
  const arms = [ERROR, HISTORY_ERROR, PAGE].flatMap((f) => [...text(W, f).matchAll(JOURNEY_ARM)].map((m) => m[1]));
  const own = [VIEW, CARD, SWITCH, RAIL, GHOST].map((f) => text(W, f)).join(LF);
  const all = followed(W, [own, fnBody(text(W, BAR), BAR_JOURNEY), ...arms].join(LF));
  return [...new Set([...all.matchAll(WORD)].map((m) => `${m[1]}.${m[2]}`))].sort();
}
/** One word from each place the scan must reach, so a scan that stopped reading one is seen. */
const SEEN = ["journey.ticketsFilterAria", "common.settled", "market.posWon", "common.pending", "journey.ticketPayoutAtResult",
  "journey.ticketsKindAria", "journey.ticketsErrorBody", "journey.tabTickets", "performance.viewPerformance"];

function g4Words(W: World, ok: Ok) {
  const words = viewWords(W);
  const unseen = SEEN.filter((w) => !words.includes(w));
  const nafasi = words.filter((w) => NAFASI.test(wordAt(W.dicts.sw, w)));
  ok("4.nafasi · no Swahili word the journey's Tiketi view reads says “nafasi” — its files, the bar's journey variant and every helper it calls, the journey arms of both error pages and the tab title (A7, SJ-19)",
    words.length > 30 && unseen.length === 0 && nafasi.length === 0,
    unseen.length > 0 ? `the scan did not reach ${unseen.join(", ")}` : `${nafasi.join(", ")} (${words.length} words read)`);
  const holdings = words.filter((w) => wordAt(W.dicts.zh, w).includes(HOLDINGS));
  ok("4.zh · no Chinese word the view reads says 持仓 (“holdings”): an empty outcome lens reads the journey's own copies, which say 注单, the ticket (§0h point 27)",
    words.length > 30 && holdings.length === 0, holdings.join(", "));
  const missing = words.flatMap((w) => Object.entries(W.dicts).filter(([, d]) => !wordAt(d, w).trim()).map(([l]) => `${w} in ${l}`));
  ok("4.words · every word the view reads resolves in en, sw and zh", Object.keys(W.dicts).length === 3 && missing.length === 0,
    missing.slice(0, 4).join(" · "));
  const bar = fnBody(text(W, BAR), BAR_JOURNEY);
  ok("4.count · the bar's journey variant draws no result count and no count on any lens (the canvas draws none), and names its strip journey.ticketsFilterAria",
    bar.length > 0 && !bar.includes("QueryResultCount") && !bar.includes("count=") && bar.includes("<QueryStrip ariaLabel={t.journey.ticketsFilterAria}>"),
    bar.slice(0, 160));
  ok("4.lenses · …and keeps all seven lenses (§0h point 11) on the shared bar's rail",
    POSITION_LENSES.length === 7 && bar.includes("{POSITION_LENSES.map((l) => (") && bar.includes("<PositionsRail>"), show(POSITION_LENSES));
  const file = text(W, BAR);
  const rail = fnBody(file, RAIL_FN);
  ok("4.rail · both bars render ONE rail element, PositionsRail, which carries the hook and the bar's class: the hook is written once in the file, so red:filter-language's vacuity case still removes the only one",
    rail.includes(RAIL_ELEMENT) && count(file, "data-filter-rail") === 1 && count(bar, "<PositionsRail>") === 1
      && count(fnBody(file, "export function PositionsBar("), "<PositionsRail>") === 1,
    show({ hooks: count(file, "data-filter-rail"), rail: rail.length }));
}

/* ══ §5 · THE SWITCH ═════════════════════════════════════════════════════════════════════════════════════════ */
const KINDS = [`{ value: "questions", labelEn: t.journey.tabQuestions, href: "/positions" }`,
  `{ value: "updown", labelEn: t.nav.updown, href: "/updown/history" }`];
/** The wrapper's one element: the kit's underline rail, handed the switch's three props and nothing else. */
const RAIL_TABS = `<Tabs variant="line" ariaLabel={ariaLabel} value={value} tabs={tabs} />`;
/** The wrapper's one binding: the kit's Tabs through next/dynamic, with no option object — the server render stays on. */
const LAZY_TABS = `const Tabs = dynamic(() => import("@/components/ui/tabs").then((m) => m.Tabs));`;
/** A VALUE import of the kit's tabs module (an `import type` is erased at build and loads nothing). */
const TABS_VALUE_IMPORT = /^[ ]*import[ ]+(?!type[ ])[^;]*from[ ]+"@[/]components[/]ui[/]tabs"/m;

function g5Switch(W: World, ok: Ok) {
  const sw = text(W, SWITCH);
  const rail = text(W, RAIL);
  const tabs = text(W, TABS);
  ok("5.rail · the switch hands its wrapper the kit's underline rail in link mode — each kind a link to its page, current by aria-current — and no tab widget (A5)",
    sw.includes("<TicketSwitchRail") && sw.includes("ariaLabel={t.journey.ticketsKindAria}") && sw.includes("value={current}")
      && KINDS.every((k) => sw.includes(k)) && !sw.includes("role=") && count(rail, RAIL_TABS) === 1 && !rail.includes("role=")
      && tabs.includes(`aria-current={active ? "page" : undefined}`) && tabs.includes("<nav")
      && !tabs.includes(`role="tablist"`) && !tabs.includes(`role="tab"`) && !tabs.includes("aria-selected"),
    show({ kinds: KINDS.map((k) => sw.includes(k)), rail: count(rail, RAIL_TABS), role: sw.includes("role=") || tabs.includes(`role="tablist"`) }));
  ok("5.lazy · ticket-switch.tsx imports nothing from @/components/ui/tabs at runtime: its wrapper, a client file, asks for the kit's Tabs through next/dynamic with the server render on and takes only its item type, so a classic reader's first load carries none of the kit's code (VODACOM-PLAN §0h point 20)",
    sw.length > 0 && !TABS_VALUE_IMPORT.test(sw) && !sw.includes(`import("@/components/ui/tabs")`)
      && sw.includes(`from "@/components/journey/tickets/ticket-switch-rail"`)
      && isClient(rail) && rail.includes(`import dynamic from "next/dynamic";`) && count(rail, LAZY_TABS) === 1 && !rail.includes("ssr")
      && rail.includes(`import type { TabItem } from "@/components/ui/tabs";`) && !TABS_VALUE_IMPORT.test(rail),
    show({ switchImportsTabs: TABS_VALUE_IMPORT.test(sw), client: isClient(rail), lazy: count(rail, LAZY_TABS), ssr: rail.includes("ssr") }));
  ok("5.current · each page passes its own kind: /positions is Maswali and /updown/history is Juu/Chini, so the current link is the page being read (A12)",
    count(text(W, VIEW), `current="questions"`) === 1 && !text(W, VIEW).includes(`current="updown"`)
      && count(text(W, HISTORY), `<TicketsHead current="updown" t={t} />`) === 1 && !text(W, HISTORY).includes(`current="questions"`));
}

/* ══ §6 · THE GUEST SHEET ════════════════════════════════════════════════════════════════════════════════════ */
const QUOTED = /"([^"]*)"/g;

function g6Guest(W: World, ok: Ok) {
  const sheet = text(W, GUEST_SHEET);
  const proxy = text(W, PROXY);
  const head = "const PROTECTED_PREFIXES = [";
  const at = proxy.indexOf(head);
  const prefixes = at < 0 ? [] : [...proxy.slice(at + head.length, proxy.indexOf("]", at + head.length)).matchAll(QUOTED)].map((m) => m[1]);
  ok("6.next · a guest's Tiketi zangu signs up or in and comes back to /positions — both doors carry next=%2Fpositions, and the edge sends a signed-out visit to /positions to sign in too",
    sheet.includes(`"/auth/register?next=%2Fpositions"`) && sheet.includes(`"/auth/login?next=%2Fpositions"`) && prefixes.includes("/positions"),
    show(prefixes));
}

/* ══ §7 · THE VIEW ═══════════════════════════════════════════════════════════════════════════════════════════ */
const OWN_ID = /[ ]id=[{]p[.]id[}]/;
/** The Utendaji link: the classic page's quiet small link, as the journey's view draws it below the list. */
const UTENDAJI = `<Link href={"/positions/performance" as never} className="btn btn-ghost btn-sm inline-flex items-center gap-1.5">`;
/** The head takes its kind and its words, and nothing to set beside the name. */
const HEAD_FN = "export function TicketsHead({ current, t }: { current: TicketKind; t: Dict })";

function g7View(W: World, ok: Ok) {
  const view = text(W, VIEW);
  const card = text(W, CARD);
  ok("7.poll · the view refreshes every 20 s and scrolls to a ticket's fragment, as the classic page does",
    count(view, "<RefreshPoller intervalMs={20_000} />") === 1 && count(view, "<HashFocus />") === 1);
  ok("7.anchor · every card carries the id a fragment names, ringed when targeted and offset under the header",
    OWN_ID.test(card) && card.includes("data-row-id={p.id}") && card.includes("ticket-target") && card.includes("scroll-mt-"));
  const link = view.indexOf(UTENDAJI);
  const gate = link < 0 ? -1 : view.lastIndexOf("{hasTickets && (", link);
  ok("7.performance · the Utendaji link keeps /positions/performance a door on a journey phone (A15): a quiet small link after the list and the pager, for a reader with a ticket, and nothing beside the name (§0h point 33)",
    count(view, UTENDAJI) === 1 && view.includes("{t.performance.viewPerformance}") && link > view.indexOf("<Pagination")
      && link > view.indexOf("<EmptyState") && gate > view.indexOf("<Pagination") && text(W, SWITCH).includes(HEAD_FN),
    show({ link, gate, head: text(W, SWITCH).includes(HEAD_FN) }));
}

/* ══ §8 · NO HOUSE ═══════════════════════════════════════════════════════════════════════════════════════════ */
const HOUSE = /house[A-Z]|house-bot/;
const READS = ["cashOutValue(", "listPositionsForUser(", "positionCardMarkets(", "db.", "getServerT(", "currentSession(", "await "];

function g8House(W: World, ok: Ok) {
  const named = JOURNEY_FILES.filter((f) => HOUSE.test(text(W, f)));
  ok("8.house · no house name in any journey Tiketi file — the page reads the exit's pricing inputs and prices with them, and none of them reaches this view",
    named.length === 0, named.join(", "));
  const reading = JOURNEY_FILES.flatMap((f) => READS.filter((r) => text(W, f).includes(r)).map((r) => `${f}: ${r}`));
  ok("8.reads · nothing in the journey's Tiketi files reads a store, a session or the words, or prices an exit: the page did", reading.length === 0,
    reading.join(", "));
}

/* ══ §9 · THE SELL BUTTON (A8, WP10) ═════════════════════════════════════════════════════════════════════════ */
/** The card binds the server's free-sell instant ONCE: the helper's own call, about this bet's placement and the market as read. */
const HOST_BINDING = "const freeUntil = freeExitEndsAt({ placedAt: p.placedAt }, m);";
/** That instant's clock time, read on the server from the same binding: the journey's "Uza bila ada hadi {time}". */
const CLOCK_LABEL = "freeUntilLabel={freeUntil ? formatClock(freeUntil) : null}";
const HELPER_IMPORT = /import [{][^}]*freeExitEndsAt[^}]*[}] from "@[/]lib[/]server[/]market-service"/;
const CLOCK_IMPORT = /import [{][^}]*formatClock[^}]*[}] from "@[/]lib[/]utils"/;
const SELL_ELEMENT = ["<SellButton", "positionId={p.id}", "stake={p.stake}", "value={liveValue ?? 0}", "pricedFree={price?.free === true}",
  "freeUntil={freeUntil}", "closesAt={cutoffIso}", "alreadyClosed={sellShut}", "serverNow={serverNow}", `look="journey"`, CLOCK_LABEL, "/>"].join("");

function g9Sell(W: World, ok: Ok) {
  const card = text(W, CARD);
  ok("9.host · the card binds the server's instant once — the helper's own call, about this bet's placement and the market as read — in a server component (A8)",
    !isClient(card) && HELPER_IMPORT.test(card) && count(card, HOST_BINDING) === 1 && count(card, "freeExitEndsAt(") === 1 && count(card, "<SellButton") === 1);
  const at = card.indexOf("<SellButton");
  const element = at < 0 ? "" : card.slice(at, card.indexOf("/>", at) + 2);
  ok("9.look · …and hands the button that instant, the journey's look, the instant's clock time read on the server from the same binding, and whether the page priced the exit inside its free window (WP10)",
    squash(element) === SELL_ELEMENT && CLOCK_IMPORT.test(card), squash(element).slice(0, 300));
  const gate = text(W, SELL_GATE);
  ok("9.gate · test:sell-grace-truth §2 names the card among the hosts it must find and holds its clock label to the instant (2.label), so neither can change unseen",
    gate.includes(`const JOURNEY_CARD = "src/components/journey/tickets/ticket-card.tsx";`) && gate.includes("[POSITIONS, MARKET, JOURNEY_CARD].every(")
      && gate.includes(`ok("2.label · `));
}

/* ══ §10 · LOADING AND ERRORS (§0h point 21) ═════════════════════════════════════════════════════════════════ */
/** The one line each loading file opens with: the words and the shell's own answer, asked together. */
const ASK_BOTH = "const [{ t }, { journey }] = await Promise.all([getServerT(), resolveSimpleJourney()]);";
const SESSION_READS = ["currentSession(", "cookies(", "headers("];
const JOURNEY_GHOST_RETURN = "if (journey) return <TicketsGhost t={t} />;";
/** Today's ghost, block by block: the header and its words, the standing strip, the exposure bar, the search box, the bar's second row, the cards. */
const CLASSIC_GHOST = [
  `<header className="flex items-start justify-between gap-3">`,
  `<PageHeader eyebrow={t.common.positions} title={t.positions.headline} subtitle={t.positions.headlineBody} />`,
  `<div className="glass-panel px-5 pt-4 pb-[18px] kp-shimmer-track" aria-hidden>`,
  `<div className="rounded-lg border border-border bg-bg-elevated/60 p-3 kp-shimmer-track" aria-hidden>`,
  `<div className="h-[44px] w-full rounded-lg border border-border-control bg-bg-inset kp-shimmer-track" aria-hidden />`,
  "<div className={QUERY_BAR_ROW2_CLASS}>",
  "{Array.from({ length: 6 }).map((_, i) => (",
];
const HISTORY_GHOST_LINES = [`<div className="h-4 w-[128px] rounded bg-bg-elevated kp-shimmer-track" aria-hidden />`,
  `<div className="mt-3 h-7 w-52 rounded-md bg-bg-elevated kp-shimmer-track" aria-hidden />`];
const HISTORY_GHOST_OPEN = "{journey ? <TicketsHeadGhost";
const HISTORY_GHOST_HEAD = [`{journey ? <TicketsHeadGhost t={t} /> : ${HISTORY_GHOST_LINES[0]}}`, `{journey ? null : ${HISTORY_GHOST_LINES[1]}}`].join("");
/** A VALUE import's module specifier (an `import type` is erased at build and loads nothing). */
const VALUE_IMPORT = /^[ ]*import[ ]+(?!type[ ])[^;]*?from[ ]+"([^"]+)";/gm;
/** The src modules a file loads at runtime, by its own value imports ("@/…" and relative), resolved to repo paths. */
function loadsOf(W: World, rel: string): string[] {
  const out: string[] = [];
  for (const m of textOf(W, rel).matchAll(VALUE_IMPORT)) {
    const spec = m[1];
    const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? posix.join(posix.dirname(rel), spec) : null;
    if (base === null) continue;
    const hit = [".ts", ".tsx", "/index.ts", "/index.tsx"].map((tail) => base + tail).find((p) => p in W.files || existsSync(join(ROOT, p)));
    if (hit) out.push(hit);
  }
  return out;
}
/** Every .ts and .tsx file in the journey's Tiketi directory, as it stands on disk. */
const ticketFiles = () => (existsSync(join(ROOT, TICKETS_DIR))
  ? readdirSync(join(ROOT, TICKETS_DIR)).filter((n) => /[.]tsx?$/.test(n)).map((n) => TICKETS_DIR + n)
  : []);
const ERROR_ARMS: ReadonlyArray<[string, string]> = [
  [ERROR, "body={journeyOn ? t.journey.ticketsErrorBody : t.error.positionsSafe}"],
  [ERROR, "label: journeyOn ? t.journey.ticketsBack : t.error.backToPositions"],
  [HISTORY_ERROR, "body={journeyOn ? t.journey.ticketsErrorBody : t.error.pageHitSnagBody}"],
];

function g10Loading(W: World, ok: Ok) {
  const loading = text(W, LOADING);
  const hloading = text(W, HISTORY_LOADING);
  const reading = [LOADING, HISTORY_LOADING].flatMap((f) => SESSION_READS.filter((r) => text(W, f).includes(r)).map((r) => `${f}: ${r}`));
  ok("10.loading · each loading file asks the per-request resolver beside the words, in one Promise.all, and reads no session of its own (§0h point 21)",
    count(loading, ASK_BOTH) === 1 && count(hloading, ASK_BOTH) === 1 && count(loading, "resolveSimpleJourney(") === 1
      && count(hloading, "resolveSimpleJourney(") === 1 && reading.length === 0,
    show({ positions: count(loading, ASK_BOTH), history: count(hloading, ASK_BOTH), reading }));
  const body = after(loading, "export default async function PositionsLoading(");
  const asked = body.indexOf(ASK_BOTH);
  const early = body.indexOf(JOURNEY_GHOST_RETURN);
  const classic = body.indexOf(CLASSIC_RETURN);
  const lost = CLASSIC_GHOST.filter((b) => !(count(loading, b) === 1 && body.indexOf(b) > classic));
  const historyHead = siblingTernaries(hloading, HISTORY_GHOST_OPEN, "{journey ? null : ");
  ok("10.ghost · each loading file returns ONE ghost by the answer: /positions Tiketi zangu's for a journey request, BEFORE its one classic return, which keeps every block of today's; /updown/history swaps only its two head lines, each a sibling ternary where it stood",
    asked > 0 && early > asked && classic > early && count(loading, JOURNEY_GHOST_RETURN) === 1 && count(loading, CLASSIC_RETURN) === 1
      && count(loading, "<TicketsGhost") === 1 && lost.length === 0
      && historyHead === HISTORY_GHOST_HEAD && count(hloading, "<TicketsHeadGhost") === 1,
    lost.length > 0 ? `today's ghost lost: ${lost.join(" · ")}` : historyHead.slice(0, 200));
  const pickers = [LOADING, HISTORY_LOADING, GHOST];
  const inBrowser = pickers.filter((f) => isClient(text(W, f)) || text(W, f).includes("useJourneyOn"));
  const clientLoads = pickers.flatMap((f) => loadsOf(W, f).filter((l) => isClient(textOf(W, l))).map((l) => `${f} loads ${l}`));
  const tiketi = ticketFiles();
  const clientTiketi = tiketi.filter((f) => f !== RAIL && isClient(textOf(W, f)));
  ok("10.pick · the ghosts are picked and drawn on the server: neither loading file nor the ghosts' file is client code, reads the flag hook or imports a “use client” module, and no file in components/journey/tickets/ is client code but the switch's rail wrapper (5.lazy)",
    text(W, GHOST).length > 0 && inBrowser.length === 0 && clientLoads.length === 0 && tiketi.length >= 6 && tiketi.includes(RAIL)
      && isClient(textOf(W, RAIL)) && clientTiketi.length === 0,
    [...inBrowser, ...clientLoads, ...clientTiketi].join(", ") || show({ files: tiketi.length }));
  const errors = ERROR_ARMS.filter(([f, arm]) => !(isClient(text(W, f)) && count(text(W, f), "const journeyOn = useJourneyOn();") === 1 && text(W, f).includes(arm)));
  ok("10.error · both error pages — client components, never drawn on the server, each mounting in the browser as a fresh render — choose their words from useJourneyOn(), which reads the shell's mark already in the page: the tickets' for a journey reader from its first paint, today's for everybody else",
    errors.length === 0, errors.map(([f, arm]) => `${f}: ${arm}`).join(" · "));
}

/* ══ §11 · THE WIRING (A14) ══════════════════════════════════════════════════════════════════════════════════ */
function g11Wiring(W: World, ok: Ok) {
  ok("11.wired · test:journey-tickets runs this file and is in predeploy; red:journey-tickets runs it with --prove-red (A14)",
    W.scripts["test:journey-tickets"] === "tsx scripts/journey-tickets.test.mts"
      && W.scripts["red:journey-tickets"] === "tsx scripts/journey-tickets.test.mts --prove-red"
      && (W.scripts.predeploy ?? "").includes("npm run test:journey-tickets && "),
    show({ test: W.scripts["test:journey-tickets"], red: W.scripts["red:journey-tickets"] }));
}

/* ══ §12 · THE SELL LOOK (WP10) ═════════════════════════════════════════════════════════════════════════════ */
/** Where the button's classic markup begins: from here to the end of the file is what a reader without the look is drawn. */
const SELL_CLASSIC_HEAD = `const btnVariant = "btn-primary";`;
/** The button's classic markup as it stands today, line by line with comments stripped: the free strip, the button, and the shared dialogs. */
const SELL_CLASSIC = [
  'const btnVariant = "btn-primary";',
  'return (',
  '<>',
  '{inGrace && !closedNow && (',
  '<div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-500/[0.12] border border-brand-500/30">',
  '<span className="font-mono text-micro font-bold text-brand-300 uppercase tracking-[0.12em]">{t.common.freeExitLabel}</span>',
  '<span className="font-mono text-[10px] text-brand-300 tabular-nums">{graceLabel}</span>',
  '<span className="font-mono text-[10px] text-text-subtle">· {t.dialog.noFee}</span>',
  '</div>',
  ')}',
  '<button',
  'type="button"',
  'onClick={closedNow ? undefined : openConfirm}',
  'disabled={pending || closedNow}',
  'aria-label={',
  'closedNow',
  '? t.common.sellLockedHint',
  ': inGrace',
  '? `${t.common.freeExitLabel} — ${formatTzs(value)}`',
  ': `${t.common.cashOut} ${formatTzs(value)}`',
  '}',
  'className={`btn ${closedNow ? "btn-ghost" : btnVariant} btn-md w-full whitespace-normal`}',
  'style={{ justifyContent: "space-between" }}',
  '>',
  '<span>',
  '{closedNow ? t.common.sellLocked',
  ': pending ? t.common.selling',
  ': inGrace ? t.common.freeExitLabel',
  ': t.common.sellNow}',
  '</span>',
  '{!closedNow && (',
  '<span className="font-mono tabular-nums">',
  'TZS {formatNumber(value)}',
  '{inGrace',
  '? <span className="ml-1.5 opacity-80 text-[11px]">{t.common.fullRefund}</span>',
  ': <span className="ml-1.5 opacity-80 text-[11px]">−{formatNumber(fee)} {t.common.fee}</span>',
  '}',
  '</span>',
  ')}',
  '</button>',
  '{dialogs}',
  '</>',
  ');',
  '}',
].join("");
/** The dialogs both looks share, line by line: today's two, with the journey's three words only under the look. */
const SELL_DIALOGS = [
  'const dialogs = (',
  '<>',
  '<SellConfirmModal',
  'open={confirmOpen}',
  'pending={pending}',
  'stake={stake}',
  'value={value}',
  'positionId={positionId}',
  'onConfirm={submit}',
  'onCancel={() => { if (!pending) setConfirmOpen(false); }}',
  'titleLabel={journey ? t.journey.sellConfirmTitle : undefined}',
  'keepLabel={journey ? t.journey.sellKeep : undefined}',
  '/>',
  '{resultData && (',
  '<OperationResultModal',
  'open={resultOpen}',
  'variant={resultData.variant}',
  'eyebrow={resultData.variant === "success" ? t.common.positionSold : t.common.cashOutFailed}',
  'title={',
  'resultData.variant === "success"',
  '? `${formatTzs(resultData.value)} ${t.common.returned}`',
  ': (resultData.error ?? t.error.tryAgain)',
  '}',
  'subtitle={',
  'resultData.variant === "success"',
  '? (resultData.net >= 0',
  '? t.common.fullStakeReturned',
  ': t.common.stakeReturnedMinusFee)',
  ': journey ? t.journey.sellUnchanged : t.common.positionUnchanged',
  '}',
  'details={resultData.variant === "success" ? [',
  '{ label: t.common.ticket, value: positionId },',
  '{ label: t.common.returned, value: formatTzs(resultData.value) },',
  '{',
  'label: t.common.earlyExitFee,',
  'value: resultData.net >= 0 ? t.common.none : formatTzs(Math.abs(resultData.net)),',
  'tone: "default",',
  '},',
  '] : undefined}',
  'primaryLabel={resultData.variant === "success" ? t.common.doneSawa : t.common.close}',
  'onClose={() => setResultOpen(false)}',
  'stripTone="brand"',
  '/>',
  ')}',
  '</>',
  ');',
].join("");
/** The dialogs' three words: the journey's under the look, today's (the dialog's own defaults) without it. */
const DIALOG_ARMS = ["titleLabel={journey ? t.journey.sellConfirmTitle : undefined}", "keepLabel={journey ? t.journey.sellKeep : undefined}",
  ": journey ? t.journey.sellUnchanged : t.common.positionUnchanged"];
const DIALOG_DEFAULTS = ["{titleLabel ?? t.dialog.sellPositionNow}", "{keepLabel ?? t.dialog.keepPosition}"];
/** The sale, one code path for both looks — in `submit`: the one action, the latch, the deferred toast and the sale's two refresh events. */
const SALE = ["cashOutPositionAction(", "inFlight.current = true;", "deferToast({", `window.dispatchEvent(new Event("50pick:refresh"));`,
  `window.dispatchEvent(new Event("50pick:refresh-notifications"));`];
/** Shut: the server's verdict (a prop, so the server's paint already says it), then this phone's clock. */
const SHUT = "const shut = closedNow || alreadyClosed === true;";
/** The free line: drawn only on the free offer; the server's clock time in a <time> naming the instant; the countdown only while it runs. */
const FREE_LINE_OPEN = "{offerFree && freeUntilLabel ? (";
const FREE_LINE = `{freeBefore}<time dateTime={freeUntil ?? undefined} className="whitespace-nowrap tabular-nums">{freeUntilLabel}</time>{freeAfter}`;
const TIMER_OPEN = "{inGrace ? (";
const TIMER = `<span role="timer" className="whitespace-nowrap font-mono font-bold tabular-nums text-text">{graceLabel}</span>`;
/** The button's word: the free word only on the free offer; while a lapsed free price waits for the server, "Inapakia…". */
const WORD_FREE = ": offerFree ? t.journey.sellFreeCta : t.common.sellNow}";
const WORD_LAPSE = "{pending ? t.common.selling : lapsed ? t.common.loading : ";
/** The refund the free button promises: the server's own figure for this exit (`value`), never the stake — only on the free offer. */
const FREE_FIGURE_OPEN = "{offerFree ? (";
const FREE_FIGURE = `{refundBefore}<span className="amount font-semibold text-text">{formatTzs(value)}</span>{refundAfter}`;
/** No figure at all while a lapsed free price waits for the server. */
const FIGURE_OPEN = "{lapsed ? null : (";
/** A price with a fee: today's figure and today's fee — a fee of 0 is not printed. */
const PAID_FIGURE = [`<span className="amount text-text">TZS {formatNumber(value)}</span>`,
  `{fee > 0 ? <>{" "}<span className="amount">−{formatNumber(fee)}</span>{" "}{t.common.fee}</> : null}`];
const FEE_RULE = "const fee = Math.max(0, stake - value);";
/** The one button: the same confirm as today's, nothing to press while a sale is in flight or a free price has lapsed. */
const BUTTON_OPEN = `<button type="button" onClick={openConfirm} disabled={pending || lapsed}`;
/** Its edge: the kit's outlined class, its only boundary drawn in the kit's token for a control's edge (the canvas's own colour). */
const EDGE = `className="btn btn-ghost w-full px-2 py-1.5" style={{ borderColor: "var(--border-control)" }}>`;
/** A lapsed free price closes a confirm still showing it and asks the page for the server's answer at once — once per run of the countdown, re-armed only when the countdown runs again, so no answer can set off another ask by itself. */
const LAPSE_ASK = [
  "if (!journey || pricedFree !== true || closedNow || alreadyClosed) return;",
  "if (inGrace) { lapseArmed.current = true; return; }",
  "if (!mounted) return;",
  "if (!pending) setConfirmOpen(false);",
  "if (!lapseArmed.current) return;",
  "lapseArmed.current = false;",
  `window.dispatchEvent(new Event("50pick:refresh"));`,
];
const LAPSE_DEPS = "}, [journey, mounted, pricedFree, inGrace, closedNow, alreadyClosed, pending]);";
const LAPSE_REFRESH = LAPSE_ASK.length - 1;
/** What the look never does itself: build or format a time, or read the stake (its figures are the server's). */
const LOOK_NEVER = ["Date", "toLocale", "Intl.", "formatClock(", "formatDeadline(", "formatDayTime(", "formatDateTime(", "formatTime(", "stake"];
/** An ASCII arithmetic operator between two operands, once strings and tags are taken out of the look. */
const ARITH = /[A-Za-z0-9_)][ ]*[-+*/%][ ]*[A-Za-z0-9_(]/;
const STRING_LITERALS = /"[^"]*"|'[^']*'|`[^`]*`/g;
const JSX_TAGS = /<[/]?[A-Za-z][^<>]*>|<[/]?>/g;
/** Every SellButton element a host draws, as source. */
const sellElements = (s: string) => s.split("<SellButton").slice(1).map((x) => x.slice(0, x.indexOf("/>")));
/** Every src file that renders SellButton, found on disk as this suite starts (a plant can add its own to a world). */
const SELL_HOSTS_ON_DISK = srcFiles().filter((f) => f !== SELL_BUTTON && /[.]tsx?$/.test(f) && read(f).includes("<SellButton"));
/** The three props that ask for the journey's look. */
const JOURNEY_PROPS = ["look=", "freeUntilLabel=", "pricedFree="];
const sellHosts = (W: World) => [...new Set([...SELL_HOSTS_ON_DISK, ...Object.keys(W.files)])]
  .filter((f) => f !== SELL_BUTTON && f.startsWith("src/") && /[.]tsx?$/.test(f))
  .map((f) => [f, sellElements(textOf(W, f))] as const)
  .filter(([, els]) => els.length > 0);
/** One word from each place the sell path's scan must reach: the look, the shared dialogs, the confirm and the toasts. */
const SELL_SEEN = ["journey.sellFreeUntil", "journey.sellFreeCta", "journey.sellFullRefund", "journey.sellClosedBody", "journey.sellConfirmTitle",
  "journey.sellKeep", "journey.sellUnchanged", "dialog.youReceive", "toast.couldntCashOut", "common.positionSold"];
const CLASSIC_DIALOG_WORDS = ["dialog.sellPositionNow", "dialog.keepPosition", "common.positionUnchanged"];
/** ⛔ The sold receipt's small heading keeps today's word, whose Chinese says 持仓 (VODACOM-PLAN §0h point 36): named, so a second cannot arrive. */
const SOLD_HEADING = "common.positionSold";
/** ⚠️ The sell path's Swahili words that say "toa" — today's cash-out headings, while "toa" is also the journey's word for withdrawing money (§0h point 36): named, so a fourth cannot arrive unseen. */
const KUTOA = ["common.cashOutFailed", "dialog.cashOutTitle", "toast.couldntCashOut"];
const TOA = /(?:^|[^a-z])(?:ku)?toa(?:[^a-z]|$)/i;
/** `journey ? a : b`, read as a journey reader is drawn it: `a`. */
const JOURNEY_PAIR = /journey [?] (t[.][A-Za-z]+[.][A-Za-z0-9]+|undefined) : (t[.][A-Za-z]+[.][A-Za-z0-9]+|undefined)/g;

/** The words a journey reader's sell path reads: the button before its classic markup, each `journey ? a : b` as `a`, and the confirm without the defaults the look replaces. */
function sellPathWords(W: World): string[] {
  const button = text(W, SELL_BUTTON);
  const at = button.indexOf(SELL_CLASSIC_HEAD);
  const path = (at < 0 ? button : button.slice(0, at)).replace(JOURNEY_PAIR, (_m, a: string) => a);
  let modal = text(W, SELL_MODAL);
  if (button.includes(DIALOG_ARMS[0])) modal = modal.split(" ?? t.dialog.sellPositionNow").join("");
  if (button.includes(DIALOG_ARMS[1])) modal = modal.split(" ?? t.dialog.keepPosition").join("");
  return [...new Set([...`${path}${LF}${modal}`.matchAll(WORD)].map((m) => `${m[1]}.${m[2]}`))].sort();
}

function g12SellLook(W: World, ok: Ok) {
  const button = text(W, SELL_BUTTON);
  const modal = text(W, SELL_MODAL);
  const look = between(button, "if (journey) {", SELL_CLASSIC_HEAD);
  const hosts = sellHosts(W);
  const askers = hosts.filter(([f]) => f !== CARD).flatMap(([f, els]) => els.filter((e) => JOURNEY_PROPS.some((x) => e.includes(x))).map(() => f));
  const classicHosts = hosts.filter(([f]) => f === PAGE || f === MARKET_PAGE);
  ok("12.opt-in · the journey look is the journey card's alone: every other file that renders SellButton (found on disk — /positions' classic list and the question page's holder block among them) passes no look, no clock label and no free-price flag, so it draws today's button",
    SELL_HOSTS_ON_DISK.length >= 3 && [PAGE, MARKET_PAGE, CARD].every((f) => hosts.some(([h]) => h === f)) && classicHosts.every(([, els]) => els.length === 1)
      && askers.length === 0 && count(text(W, CARD), `look="journey"`) === 1,
    show({ hosts: hosts.map(([f, els]) => `${f} ×${els.length}`), askers }));
  const dialogs = squash(between(button, "const dialogs = (", "if (journey) {"));
  ok("12.default · without the look the button draws today's markup: its classic return, from the variant to the end of the file, is today's line for line, and the dialogs it shares are today's two but for the journey's three words under the look",
    squash(after(button, SELL_CLASSIC_HEAD)) === SELL_CLASSIC && count(button, SELL_CLASSIC_HEAD) === 1 && dialogs === SELL_DIALOGS,
    squash(after(button, SELL_CLASSIC_HEAD)) === SELL_CLASSIC ? dialogs.slice(0, 200) : squash(after(button, SELL_CLASSIC_HEAD)).slice(0, 200));
  ok("12.dialogs · one pair of dialogs for both looks, drawn by both returns: the journey's three words only under the look, and the confirm's own defaults are today's question and keep button",
    DIALOG_ARMS.every((a) => count(button, a) === 1) && DIALOG_DEFAULTS.every((d) => count(modal, d) === 1)
      && count(button, "{dialogs}") === 2 && count(button, "<SellConfirmModal") === 1 && count(button, "<OperationResultModal") === 1
      && count(modal, "t.dialog.sellPositionNow") === 1 && count(modal, "t.dialog.keepPosition") === 1,
    show({ arms: DIALOG_ARMS.map((a) => count(button, a)), defaults: DIALOG_DEFAULTS.map((d) => count(modal, d)), dialogs: count(button, "{dialogs}") }));
  const sale = fnBody(button, "const submit = ");
  ok("12.sale · the sale is one code path for both looks: in submit, one action call, one latch, one deferred toast and each of the sale's two refresh events once — the action, the latch, the toast and the notifications refresh nowhere else — and the journey's one button opens the same confirm",
    SALE.every((s) => count(sale, s) === 1) && count(button, SALE[0]) === 1 && count(button, SALE[1]) === 1 && count(button, SALE[2]) === 1
      && count(button, SALE[4]) === 1 && count(look, "<button") === 1 && count(look, BUTTON_OPEN) === 1,
    show({ inSubmit: SALE.map((s) => count(sale, s)), inFile: SALE.map((s) => count(button, s)), buttons: count(look, "<button") }));
  ok("12.free · the free offer: its line names the server's clock time, a <time> naming the instant, and — only while it runs — the countdown to that instant; the button reads 'Uza bila ada' over 'Rudishiwa {amount} kamili', the amount the server's own figure (value), never the stake; and every piece of it is drawn only on the free offer",
    count(look, FREE_LINE_OPEN) === 1 && count(look, FREE_LINE) === 1 && count(look, TIMER_OPEN) === 1 && count(look, TIMER) === 1
      && look.indexOf(FREE_LINE_OPEN) < look.indexOf(FREE_LINE) && look.indexOf(FREE_LINE) < look.indexOf(TIMER_OPEN) && look.indexOf(TIMER_OPEN) < look.indexOf(TIMER)
      && look.includes(`t.journey.sellFreeUntil.split("{time}")`) && look.includes(`t.journey.sellFullRefund.split("{amount}")`)
      && count(look, WORD_FREE) === 1 && count(look, "t.journey.sellFreeCta") === 1
      && count(look, FREE_FIGURE_OPEN) === 1 && count(look, FREE_FIGURE) === 1 && look.indexOf(FREE_FIGURE_OPEN) < look.indexOf(FREE_FIGURE),
    show({ line: count(look, FREE_LINE), timer: [count(look, TIMER_OPEN), count(look, TIMER)], word: count(look, WORD_FREE), figure: [count(look, FREE_FIGURE_OPEN), count(look, FREE_FIGURE)] }));
  const ask = between(button, LAPSE_ASK[0], LAPSE_DEPS);
  ok("12.lapse · once the countdown has run out with a free price still drawn, the price is withdrawn — nothing to press, 'Inapakia…' and no figure — a confirm still showing it closes, and the page is asked for the server's answer at once, once per run of the countdown; the sale's own refresh stays the sale's",
    look.includes("disabled={pending || lapsed}") && count(look, WORD_LAPSE) === 1 && count(look, FIGURE_OPEN) === 1
      && LAPSE_ASK.every((s) => count(ask, s) === 1) && LAPSE_ASK.every((s, i) => i === 0 || ask.indexOf(LAPSE_ASK[i - 1]) < ask.indexOf(s))
      && count(button, LAPSE_DEPS) === 1 && count(button, LAPSE_ASK[LAPSE_REFRESH]) === 2,
    show({ ask: LAPSE_ASK.map((s) => count(ask, s)), refreshes: count(button, LAPSE_ASK[LAPSE_REFRESH]), word: count(look, WORD_LAPSE), figure: count(look, FIGURE_OPEN) }));
  ok("12.paid · a price with a fee keeps today's honest 'Uza sasa' with today's figure and fee — a fee of 0 is not printed — and the button's one fee rule is today's",
    look.includes("t.common.sellNow") && PAID_FIGURE.every((p) => count(look, p) === 1) && count(button, FEE_RULE) === 1,
    show(PAID_FIGURE.map((p) => count(look, p))));
  const shutArm = between(look, "{shut ? (", ") : (");
  ok("12.closed · once selling has shut the look says so in words, 'Kuuza kumefungwa' and the journey's sentence, with no button to press — from the first paint, because the server's own verdict decides it before this phone's clock does",
    count(look, SHUT) === 1 && count(look, "{shut ? (") === 1 && shutArm.includes("{t.common.sellLocked}") && shutArm.includes("{t.journey.sellClosedBody}")
      && !shutArm.includes("<button"),
    shutArm.slice(0, 200));
  ok("12.edge · the journey's button wears the kit's outlined class, its only boundary drawn in the kit's token for a control's edge — the canvas's own colour, the one the platform holds to the 3:1 floor for a money control's edge (DESIGN_AUTHORITY's accessibility floor), where the kit's default edge is a card's decorative one",
    count(look, EDGE) === 1 && look.indexOf(BUTTON_OPEN) < look.indexOf(EDGE), show({ edge: count(look, EDGE) }));
  const bare = look.replace(STRING_LITERALS, "").replace(JSX_TAGS, " ");
  const never = LOOK_NEVER.filter((x) => look.includes(x));
  ok("12.arith · the look computes nothing and formats no time: no arithmetic among its expressions, no Date, no formatter of time, no Intl, no stake; its figures are formatTzs(value), formatNumber(value) and today's fee",
    look.length > 0 && !ARITH.test(bare) && never.length === 0,
    show({ arith: (bare.match(ARITH) ?? [""])[0], never }));
  const words = sellPathWords(W);
  const unseen = SELL_SEEN.filter((w) => !words.includes(w));
  const nafasi = words.filter((w) => NAFASI.test(wordAt(W.dicts.sw, w)));
  const holdings = words.filter((w) => wordAt(W.dicts.zh, w).includes(HOLDINGS));
  const toa = words.filter((w) => TOA.test(wordAt(W.dicts.sw, w)));
  const missing = words.flatMap((w) => Object.entries(W.dicts).filter(([, d]) => !wordAt(d, w).trim()).map(([l]) => `${w} in ${l}`));
  ok("12.words · the journey's sell path (the look, the shared dialogs under it, the confirm with the journey's words, the toasts) says no 'nafasi' and reads none of the three classic lines that do; every word resolves in en, sw and zh; its one Chinese 持仓 is the sold receipt's small heading and its three Swahili 'toa' words today's cash-out headings, each named (§0h point 36)",
    words.length > 20 && unseen.length === 0 && nafasi.length === 0 && CLASSIC_DIALOG_WORDS.every((w) => !words.includes(w))
      && holdings.join() === SOLD_HEADING && toa.join() === KUTOA.join() && missing.length === 0,
    show({ unseen, nafasi, holdings, toa, missing: missing.slice(0, 3), words: words.length }));
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════ */
function run(I: Impl, W: World, log: (l: string) => void): { failed: string[]; total: number } {
  const failed: string[] = [];
  let total = 0;
  const ok: Ok = (label, cond, detail = "") => {
    total++;
    if (cond) log(`PASS ${label}`);
    else { failed.push(label); log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  };
  log(""); log("§1 · the pages — the resolver asked once, the journey's view before the classic JSX, the history page's header alone");
  g1Pages(W, ok);
  log(""); log("§2 · the card — no figure before the result, one link that reaches 44px, one colour rule, the number kept, the classic pieces shelved");
  g2Card(I, W, ok);
  log(""); log("§3 · the dates — on the server, through formatDeadline, with the render's clock");
  g3Dates(W, ok);
  log(""); log("§4 · the words — no nafasi in Swahili, no 持仓 in Chinese, every word in three languages, no result count, seven lenses");
  g4Words(W, ok);
  log(""); log("§5 · the switch — the kit's link rail, loaded lazily, each page its own kind");
  g5Switch(W, ok);
  log(""); log("§6 · the guest sheet — back to /positions");
  g6Guest(W, ok);
  log(""); log("§7 · the view — the poller, the fragment, the anchor, the Utendaji door below the list");
  g7View(W, ok);
  log(""); log("§8 · no house — no house name, no read, no pricing in the journey's files");
  g8House(W, ok);
  log(""); log("§9 · the sell button — the server's instant bound once, the journey look, its clock time and its free-price flag, the gate that names the card");
  g9Sell(W, ok);
  log(""); log("§10 · loading and errors — one ghost picked on the server, the error words from the flag");
  g10Loading(W, ok);
  log(""); log("§11 · the wiring");
  g11Wiring(W, ok);
  log(""); log("§12 · the sell look — the card's alone, today's button without it, one sale, the free offer and its lapse, the server's time and figure, no nafasi");
  g12SellLook(W, ok);
  return { failed, total };
}

if (!PROVE_RED) {
  console.log("journey-tickets — Tiketi zangu (Vodacom plan S6, WP9 and WP10)");
  const { failed, total } = run(REAL, WORLD, (l) => console.log(l));
  console.log("");
  console.log(`JOURNEY TICKETS — ${total === 0 ? "0 checks ran: a zero-assertion run is a SKIPPED run" : failed.length === 0 ? `all ${total} checks passed` : `${failed.length} of ${total} failed`}`);
  for (const f of failed) console.log(`  · ${f}`);
  process.exit(total > 0 && failed.length === 0 ? 0 : 1);
}

/* ══ THE RED TWIN — every plant must be caught by the check named for it ═════════════════════════════════════ */
const quiet = () => {};
let pass = 0, fail = 0;
const proof = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
console.log("RED CONTROL — journey-tickets' defects, planted in memory");
console.log("");
const baseline = run(REAL, WORLD, quiet);
if (baseline.total === 0 || baseline.failed.length > 0) {
  console.log(`INCONCLUSIVE: the clean run already fails (${baseline.failed[0] ?? "0 checks ran"}) — a plant could not be told from it`);
  process.exit(1);
}
proof(`baseline · the shipped view passes all ${baseline.total} in-process checks before anything is planted`, true);

const withFile = (rel: string, edit: (s: string) => string): World => ({ ...WORLD, files: { ...WORLD.files, [rel]: edit(WORLD.files[rel] ?? "") } });
const swap = (rel: string, from: string, to: string) => withFile(rel, (s) => s.split(from).join(to));
const changed = (w: World, rel: string) => w.files[rel] !== WORLD.files[rel];
const patchWord = (d: unknown, ns: string, key: string, value: string): unknown => {
  const x = d as Record<string, Record<string, unknown>>;
  return { ...x, [ns]: { ...x[ns], [key]: value } };
};
const withWord = (locale: string, ns: string, key: string, value: string): World =>
  ({ ...WORLD, dicts: { ...WORLD.dicts, [locale]: patchWord(WORLD.dicts[locale], ns, key, value) } });
const wordChanged = (w: World, locale: string, path: string) => wordAt(w.dicts[locale], path) !== wordAt(WORLD.dicts[locale], path);

// §1 — the pages
const forEveryone = swap(PAGE, "if (journey) {", "if (true) {");
const decidesItself = swap(PAGE, ASK, "const journey = Boolean(sp.journey);");
const freshRead = swap(PAGE, "positions={byId}", "positions={new Map((await listPositionsForUser(session.userId)).map((x) => [x.id, x]))}");
const titleForAll = swap(PAGE, "title: journey ? t.journey.tabTickets : t.common.positions", "title: t.journey.tabTickets");
const historyHeadForAll = swap(HISTORY, HISTORY_HEAD_OPEN, "{true ? <TicketsHead");
const historyNoScroll = swap(HISTORY, "<HashFocus />", "");
const historyNoGutter = swap(HISTORY, HISTORY_WRAPPER, `<div className="mx-auto w-full max-w-reading px-4 py-6">`);
const historyNoPoller = swap(HISTORY, HISTORY_POLLER, "");
// §2 — the card
const openQuoted: Impl["payout"] = (p) => (p.status === "OPEN" ? { kind: "final", amount: 6_911, won: false } : REAL.payout(p));
const lossPaid: Impl["payout"] = (p) => (p.status === "LOSS" ? { kind: "final", amount: 9_999, won: false } : REAL.payout(p));
const figureOnOpen = swap(CARD, "value={t.journey.ticketPayoutAtResult}", "value={formatTzs(p.stake)}");
const UNRESOLVED_STAT = `<Stat label={t.journey.ticketPayout} value={t.journey.ticketPayoutAtResult} tone="muted" />`;
const stampedShowsExact = swap(CARD, UNRESOLVED_STAT,
  `m.selectionClosedNotifiedAt ? <Stat label={t.market.payoutIfWin} value={formatTzs(p.stake)} tone="gold" money hint={t.market.payoutExactNote} /> : ${UNRESOLVED_STAT}`);
const cardIsALink = swap(CARD, "<h2 className=", `<Link href={"/markets" as never}>open</Link><h2 className=`);
const reachDropped = swap(CARD, TITLE_REACH, `className="block py-2 hover:underline"`);
const chipCopied = swap(CARD, "variant={positionStatusChip(p.status)}", `variant={p.status === "LOSS" ? "no" : "warning"}`);
const classicChipBack = swap(CLASSIC_CARD, "variant={positionStatusChip(status)}", `variant={status === "LOSS" ? "no" : "warning"}`);
const numberGone = swap(CARD, "{p.id}</p>", "</p>");
const shareBack = withFile(CARD, (s) => `${s}${LF}const share = <PositionShare />;${LF}`);
const row2Back = withFile(BAR, inFn(BAR_JOURNEY, (b) => b.replace("</QueryStrip>", "</QueryStrip><QuerySort />")));
const headerBack = swap(SWITCH, "<PageHeader title={t.journey.tabTickets} />",
  "<PageHeader eyebrow={t.common.positions} title={t.positions.headline} subtitle={t.positions.headlineBody} />");
// §3 — the dates
const localeFormat = swap(CARD, "formatDeadline(p.placedAt, serverNow)", "new Date(p.placedAt).toLocaleString()");
const noClock = swap(CARD, "formatDeadline(cutoffIso, serverNow)", "formatDeadline(cutoffIso)");
// §4 — the words
const barSaysNafasi = swap(BAR, "ariaLabel={t.journey.ticketsFilterAria}", "ariaLabel={t.positions.filterAria}");
const barCounts = withFile(BAR, inFn(BAR_JOURNEY, (b) => b.replace("</QueryStrip>", "</QueryStrip><QueryResultCount count={0} phrase={t.positions.oneResult} />")));
const lensDropped = withFile(BAR, inFn(BAR_JOURNEY, (b) => b.replace("{POSITION_LENSES.map((l) => (", `{POSITION_LENSES.filter((l) => l !== "void").map((l) => (`)));
const ownHook = withFile(BAR, inFn(BAR_JOURNEY, (b) => b.replace("<PositionsRail>", "<div data-filter-rail className={QUERY_BAR_CLASS}>").replace("</PositionsRail>", "</div>")));
const cardSaysNafasi = swap(CARD, "label={t.journey.ticketPayout}", "label={t.common.positions}");
const errorSaysNafasi = swap(ERROR, "journeyOn ? t.journey.ticketsErrorBody : t.error.positionsSafe", "journeyOn ? t.error.positionsSafe : t.error.positionsSafe");
const swNafasi = withWord("sw", "journey", "ticketsBack", "Rudi kwenye nafasi");
const zhHoldings = swap(VIEW, "settled: t.journey.ticketsEmptySettled", "settled: t.positions.emptySettledLens");
const zhMissing = withWord("zh", "journey", "ticketPayoutAtResult", "");
// §5 — the switch
const switchButtons = swap(SWITCH, `, href: "/updown/history" }`, " }");
const tabWidget = withFile(TABS, (s) => `${s}${LF}const widget = <div role="tablist" />;${LF}`);
const staticTabs = withFile(SWITCH, (s) => `import { Tabs } from "@/components/ui/tabs";${LF}${s}`);
const railNoServerRender = swap(RAIL, LAZY_TABS, `const Tabs = dynamic(() => import("@/components/ui/tabs").then((m) => m.Tabs), { ssr: false });`);
const wrongKind = swap(VIEW, `current="questions"`, `current="updown"`);
const historyWrongKind = swap(HISTORY, `<TicketsHead current="updown" t={t} />`, `<TicketsHead current="questions" t={t} />`);
// §6 — the guest sheet
const guestLost = swap(GUEST_SHEET, `"/auth/login?next=%2Fpositions"`, `"/auth/login"`);
// §7 — the view
const viewNoScroll = swap(VIEW, "<HashFocus />", "");
const noAnchor = swap(CARD, "      id={p.id}" + LF, "");
const noPerformance = swap(VIEW, `"/positions/performance"`, `"/positions"`);
// §8 — no house
const houseNamed = withFile(CARD, (s) => `${s}${LF}const leak = (p as { houseBotId?: string }).houseBotId;${LF}`);
const viewReads = withFile(VIEW, (s) => `${s}${LF}const again = await listPositionsForUser("u");${LF}`);
// §9 — the sell button (and §3's clock time)
const instantBuilt = swap(CARD, HOST_BINDING, "const freeUntil = new Date(Date.parse(p.placedAt) + 300000).toISOString();");
const classicLook = swap(CARD, `look="journey"`, "");
const freePriceUnsaid = swap(CARD, "pricedFree={price?.free === true}", "");
const labelFromPlacement = swap(CARD, CLOCK_LABEL, "freeUntilLabel={formatClock(new Date(Date.parse(p.placedAt) + 300000).toISOString())}");
const gateForgets = swap(SELL_GATE, "[POSITIONS, MARKET, JOURNEY_CARD].every(", "[POSITIONS, MARKET].every(");
const gateDropsLabel = swap(SELL_GATE, `ok("2.label · `, `ok("2.labelled · `);
// §10 — loading and errors
const notAsked = swap(LOADING, ASK_BOTH, "const { t } = await getServerT(); const journey = false;");
const sessionRead = swap(HISTORY_LOADING, ASK_BOTH, `${ASK_BOTH}${LF}  await currentSession();`);
const journeyForAll = swap(LOADING, JOURNEY_GHOST_RETURN, "return <TicketsGhost t={t} />;");
const classicForJourney = swap(LOADING, JOURNEY_GHOST_RETURN, "");
const classicBlockLost = swap(LOADING, CLASSIC_GHOST[3], "<div aria-hidden>");
const historyGhostForAll = swap(HISTORY_LOADING, HISTORY_GHOST_OPEN, "{true ? <TicketsHeadGhost");
const ghostsInBrowser = withFile(GHOST, (s) => `"use client";${LF}${s}`);
const clientImport = withFile(LOADING, (s) => `import { TicketSwitchRail } from "@/components/journey/tickets/ticket-switch-rail";${LF}${s}`);
const errorForAll = swap(ERROR, "body={journeyOn ? t.journey.ticketsErrorBody : t.error.positionsSafe}", "body={t.journey.ticketsErrorBody}");
// §11 — the wiring
const unwired: World = { ...WORLD, scripts: { ...WORLD.scripts, predeploy: (WORLD.scripts.predeploy ?? "").split("npm run test:journey-tickets && ").join("") } };
// §12 — the sell look
const PLANTED_HOST = "src/components/markets/zz-planted-sell-host.tsx";
const classicAsks = swap(PAGE, "alreadyClosed={sellShut}", `alreadyClosed={sellShut} look="journey"`);
const holderLabel = swap(MARKET_PAGE, "alreadyClosed={sellShut}", "alreadyClosed={sellShut} freeUntilLabel={null}");
const thirdHostAsks = withFile(PLANTED_HOST, () => [`import { SellButton } from "@/components/markets/sell-button";`,
  `export function PlantedHost() {`, `  return <SellButton positionId="x" stake={1} value={1} pricedFree look="journey" />;`, `}`].join(LF));
const classicMoved = swap(SELL_BUTTON, "px-2 py-1 rounded-md", "px-3 py-1 rounded-md");
const sharedMoved = swap(SELL_BUTTON, "eyebrow={resultData.variant === ", "eyebrow={resultData.variant !== ");
const defaultWordMoved = swap(SELL_MODAL, "{titleLabel ?? t.dialog.sellPositionNow}", "{titleLabel ?? t.journey.sellConfirmTitle}");
const keepUnlabelled = swap(SELL_BUTTON, "keepLabel={journey ? t.journey.sellKeep : undefined}", "keepLabel={undefined}");
const secondConfirm = swap(SELL_BUTTON, "{t.journey.sellClosedBody}",
  "{t.journey.sellClosedBody}<SellConfirmModal open={false} pending={false} stake={stake} value={value} onConfirm={submit} onCancel={submit} />");
const saleForked = swap(SELL_BUTTON, "onClick={openConfirm} disabled={pending || lapsed}", "onClick={() => void cashOutPositionAction(new FormData())} disabled={pending || lapsed}");
const freeFromStake = swap(SELL_BUTTON, FREE_FIGURE, FREE_FIGURE.replace("formatTzs(value)", "formatTzs(stake)"));
const noTimer = swap(SELL_BUTTON, `<span role="timer"`, "<span");
const noFreeLine = swap(SELL_BUTTON, FREE_LINE_OPEN, "{false ? (");
const freeWordByInstant = withFile(SELL_BUTTON, (s) => s.split(WORD_FREE).join(": freeUntil ? t.journey.sellFreeCta : t.common.sellNow}")
  .split(FREE_FIGURE_OPEN).join("{freeUntil ? ("));
const refundAlways = swap(SELL_BUTTON, FREE_FIGURE_OPEN, "{true ? (");
const freeLineByLabel = swap(SELL_BUTTON, FREE_LINE_OPEN, "{freeUntilLabel ? (");
const timerBeforeCountdown = swap(SELL_BUTTON, TIMER_OPEN, FREE_FIGURE_OPEN);
const lapseOffered = swap(SELL_BUTTON, "disabled={pending || lapsed}", "disabled={pending}");
const lapseFigure = swap(SELL_BUTTON, FIGURE_OPEN, "{false ? null : (");
const lapseWordless = swap(SELL_BUTTON, "lapsed ? t.common.loading : ", "");
const lapseUnasked = swap(SELL_BUTTON, `${LAPSE_ASK[5]}${LF}    ${LAPSE_ASK[6]}`, LAPSE_ASK[5]);
const lapseUnarmed = swap(SELL_BUTTON, LAPSE_ASK[4], "");
const lapseConfirmOpen = swap(SELL_BUTTON, `${LAPSE_ASK[2]}${LF}    ${LAPSE_ASK[3]}`, LAPSE_ASK[2]);
const paidNoFee = swap(SELL_BUTTON, PAID_FIGURE[1], "");
const paidZeroFee = swap(SELL_BUTTON, "{fee > 0 ? <>", "{true ? <>");
const closedButton = swap(SELL_BUTTON, "{t.journey.sellClosedBody}", `{t.journey.sellClosedBody}<button type="button">x</button>`);
const shutByClock = swap(SELL_BUTTON, SHUT, "const shut = closedNow;");
const quietEdge = swap(SELL_BUTTON, ` style={{ borderColor: "var(--border-control)" }}>`, ">");
const clockInBrowser = swap(SELL_BUTTON, "{freeUntilLabel}</time>", "{new Date(freeUntil ?? 0).toLocaleTimeString()}</time>");
const moneyComputed = swap(SELL_BUTTON, "{formatTzs(value)}</span>{refundAfter}", "{formatTzs(value - fee)}</span>{refundAfter}");
const swNafasiSell = withWord("sw", "journey", "sellKeep", "Hifadhi nafasi");
const zhHoldingsSell = withWord("zh", "journey", "sellUnchanged", "您的持仓未变。");
const swToaSell = withWord("sw", "journey", "sellUnchanged", "Haikufanikiwa kutoa tiketi.");
const zhMissingSell = withWord("zh", "journey", "sellFreeCta", "");

type Plant = { name: string; expect: string[]; impl?: Partial<Impl>; world?: World; landed: boolean };
const plants: Plant[] = [
  { name: "the journey view is returned for every request", expect: ["1.first"], world: forEveryone, landed: changed(forEveryone, PAGE) },
  { name: "the page decides the journey for itself instead of asking the resolver", expect: ["1.ask", "1.first"], world: decidesItself, landed: changed(decidesItself, PAGE) },
  { name: "the view is handed a read made for it alone", expect: ["1.handed"], world: freshRead, landed: changed(freshRead, PAGE) },
  { name: "the tab title says Tiketi zangu to every reader", expect: ["1.meta"], world: titleForAll, landed: changed(titleForAll, PAGE) },
  { name: "the history page shows the tickets' head to every reader", expect: ["1.history ·"], world: historyHeadForAll, landed: changed(historyHeadForAll, HISTORY) },
  { name: "the history page stops scrolling to a fragment", expect: ["1.history.kept"], world: historyNoScroll, landed: changed(historyNoScroll, HISTORY) },
  { name: "the history page loses its gutter wrapper", expect: ["1.history.kept"], world: historyNoGutter, landed: changed(historyNoGutter, HISTORY) },
  { name: "the history page stops polling while a round is live", expect: ["1.history.kept"], world: historyNoPoller, landed: changed(historyNoPoller, HISTORY) },
  { name: "an unresolved ticket is quoted a figure", expect: ["2.open"], impl: { payout: openQuoted }, landed: openQuoted({ status: "OPEN", finalPayout: null }).kind === "final" },
  { name: "a lost ticket shows a payout", expect: ["2.final"], impl: { payout: lossPaid }, landed: lossPaid({ status: "LOSS", finalPayout: 0 }).kind === "final" && lossPaid({ status: "LOSS", finalPayout: 0 }).amount > 0 },
  { name: "the card prints a figure on an open ticket", expect: ["2.render"], world: figureOnOpen, landed: changed(figureOnOpen, CARD) },
  { name: "the card shows the exact figure once the closing sweep has stamped the market (the classic card's rule)", expect: ["2.render"], world: stampedShowsExact, landed: changed(stampedShowsExact, CARD) },
  { name: "the card gains a second link", expect: ["2.title"], world: cardIsALink, landed: changed(cardIsALink, CARD) },
  { name: "the question's link loses its pull-back (the card grows 24px)", expect: ["2.reach"], world: reachDropped, landed: changed(reachDropped, CARD) },
  { name: "the journey card spells the colour rule itself", expect: ["2.chip"], world: chipCopied, landed: changed(chipCopied, CARD) },
  { name: "the classic card goes back to its own ternary", expect: ["2.chip"], world: classicChipBack, landed: changed(classicChipBack, CLASSIC_CARD) },
  { name: "the ticket number is dropped", expect: ["2.ticket"], world: numberGone, landed: changed(numberGone, CARD) },
  { name: "the share button comes back to the journey card", expect: ["2.shelved"], world: shareBack, landed: changed(shareBack, CARD) },
  { name: "the bar's journey variant grows row 2's sort again", expect: ["2.shelved"], world: row2Back, landed: changed(row2Back, BAR) },
  { name: "the classic header's words (its eyebrow says “Nafasi”) come back to the journey head", expect: ["2.shelved"], world: headerBack, landed: changed(headerBack, SWITCH) },
  { name: "a date is formatted in the browser's way", expect: ["3.server"], world: localeFormat, landed: changed(localeFormat, CARD) },
  { name: "a date is formatted without the render's clock", expect: ["3.server"], world: noClock, landed: changed(noClock, CARD) },
  { name: "the journey bar names its strip with the classic word (“Kichujio cha nafasi”)", expect: ["4.nafasi", "4.count"], world: barSaysNafasi, landed: changed(barSaysNafasi, BAR) },
  { name: "the journey bar draws the result count (“Nafasi {n}”)", expect: ["4.count", "4.nafasi"], world: barCounts, landed: changed(barCounts, BAR) },
  { name: "a lens is dropped from the journey bar", expect: ["4.lenses"], world: lensDropped, landed: changed(lensDropped, BAR) },
  { name: "the journey bar writes a rail hook of its own (the vacuity case's anchor turns ambiguous)", expect: ["4.rail"], world: ownHook, landed: changed(ownHook, BAR) },
  { name: "the card reads a classic word that says nafasi", expect: ["4.nafasi"], world: cardSaysNafasi, landed: changed(cardSaysNafasi, CARD) },
  { name: "the error page's journey arm reads the classic body", expect: ["4.nafasi", "10.error"], world: errorSaysNafasi, landed: changed(errorSaysNafasi, ERROR) },
  { name: "a journey word is re-worded with nafasi in Swahili", expect: ["4.nafasi"], world: swNafasi, landed: wordChanged(swNafasi, "sw", "journey.ticketsBack") },
  { name: "an empty outcome lens reads the classic line again (持仓 in Chinese)", expect: ["4.zh"], world: zhHoldings, landed: changed(zhHoldings, VIEW) },
  { name: "a word the view reads is missing in Chinese", expect: ["4.words"], world: zhMissing, landed: wordChanged(zhMissing, "zh", "journey.ticketPayoutAtResult") },
  { name: "the switch's Juu/Chini becomes a button", expect: ["5.rail"], world: switchButtons, landed: changed(switchButtons, SWITCH) },
  { name: "the kit's tabs grow a tab widget", expect: ["5.rail"], world: tabWidget, landed: changed(tabWidget, TABS) },
  { name: "the switch imports the kit's Tabs statically again (its code back in every visitor's first load)", expect: ["5.lazy"], world: staticTabs, landed: changed(staticTabs, SWITCH) },
  { name: "the wrapper turns the server render off (an empty band, then the rail)", expect: ["5.lazy"], world: railNoServerRender, landed: changed(railNoServerRender, RAIL) },
  { name: "the view marks Juu/Chini as the page being read", expect: ["5.current"], world: wrongKind, landed: changed(wrongKind, VIEW) },
  { name: "the history page marks Maswali as the page being read", expect: ["5.current"], world: historyWrongKind, landed: changed(historyWrongKind, HISTORY) },
  { name: "the guest's sign-in forgets /positions", expect: ["6.next"], world: guestLost, landed: changed(guestLost, GUEST_SHEET) },
  { name: "the view stops scrolling to a fragment", expect: ["7.poll"], world: viewNoScroll, landed: changed(viewNoScroll, VIEW) },
  { name: "the card loses the id a fragment names", expect: ["7.anchor"], world: noAnchor, landed: changed(noAnchor, CARD) },
  { name: "the Utendaji link is dropped", expect: ["7.performance"], world: noPerformance, landed: changed(noPerformance, VIEW) },
  { name: "the card names a house field", expect: ["8.house"], world: houseNamed, landed: changed(houseNamed, CARD) },
  { name: "the view reads a store itself", expect: ["8.reads"], world: viewReads, landed: changed(viewReads, VIEW) },
  { name: "the card builds the free-sell instant itself", expect: ["9.host"], world: instantBuilt, landed: changed(instantBuilt, CARD) },
  { name: "the card asks for the classic look again (its dialogs say nafasi)", expect: ["9.look"], world: classicLook, landed: changed(classicLook, CARD) },
  { name: "the card stops telling the button whether the price is the free window's (a lapsed free price would be offered)", expect: ["9.look"], world: freePriceUnsaid, landed: changed(freePriceUnsaid, CARD) },
  { name: "the card's clock time is built from the placement and a grace", expect: ["3.clock"], world: labelFromPlacement, landed: changed(labelFromPlacement, CARD) },
  { name: "the sell gate forgets the journey card", expect: ["9.gate"], world: gateForgets, landed: changed(gateForgets, SELL_GATE) },
  { name: "the sell gate stops holding the clock label to the instant", expect: ["9.gate"], world: gateDropsLabel, landed: changed(gateDropsLabel, SELL_GATE) },
  { name: "the positions loading file decides for itself instead of asking the resolver", expect: ["10.loading"], world: notAsked, landed: changed(notAsked, LOADING) },
  { name: "the history loading file reads the session itself", expect: ["10.loading"], world: sessionRead, landed: changed(sessionRead, HISTORY_LOADING) },
  { name: "every reader is drawn the journey's ghost", expect: ["10.ghost"], world: journeyForAll, landed: changed(journeyForAll, LOADING) },
  { name: "a journey reader is drawn the classic ghost (“Nafasi”)", expect: ["10.ghost"], world: classicForJourney, landed: changed(classicForJourney, LOADING) },
  { name: "today's ghost loses a block (the exposure bar)", expect: ["10.ghost"], world: classicBlockLost, landed: changed(classicBlockLost, LOADING) },
  { name: "the history ghost wears the tickets' head for every reader", expect: ["10.ghost"], world: historyGhostForAll, landed: changed(historyGhostForAll, HISTORY_LOADING) },
  { name: "the ghosts become client code (picked in the browser again)", expect: ["10.pick"], world: ghostsInBrowser, landed: changed(ghostsInBrowser, GHOST) },
  { name: "a loading file imports a client module", expect: ["10.pick"], world: clientImport, landed: changed(clientImport, LOADING) },
  { name: "the error page gives every reader the tickets' words", expect: ["10.error"], world: errorForAll, landed: changed(errorForAll, ERROR) },
  { name: "the suite drops out of predeploy", expect: ["11.wired"], world: unwired, landed: unwired.scripts.predeploy !== WORLD.scripts.predeploy },
  { name: "/positions' classic SellButton asks for the journey look", expect: ["12.opt-in"], world: classicAsks, landed: changed(classicAsks, PAGE) },
  { name: "the question page's holder block hands a clock label", expect: ["12.opt-in"], world: holderLabel, landed: changed(holderLabel, MARKET_PAGE) },
  { name: "a third host, found nowhere in a list, asks for the journey look", expect: ["12.opt-in"], world: thirdHostAsks, landed: changed(thirdHostAsks, PLANTED_HOST) },
  { name: "the classic free strip changes its padding", expect: ["12.default"], world: classicMoved, landed: changed(classicMoved, SELL_BUTTON) },
  { name: "the shared result dialog changes for every reader", expect: ["12.default"], world: sharedMoved, landed: changed(sharedMoved, SELL_BUTTON) },
  { name: "the confirm's own default becomes the journey's question (every reader would see it)", expect: ["12.dialogs"], world: defaultWordMoved, landed: changed(defaultWordMoved, SELL_MODAL) },
  { name: "the look stops handing the keep button its word (Hifadhi nafasi again)", expect: ["12.words", "12.dialogs"], world: keepUnlabelled, landed: changed(keepUnlabelled, SELL_BUTTON) },
  { name: "the look draws a confirm dialog of its own", expect: ["12.dialogs"], world: secondConfirm, landed: changed(secondConfirm, SELL_BUTTON) },
  { name: "the journey's button calls the action itself, past the confirm", expect: ["12.sale"], world: saleForked, landed: changed(saleForked, SELL_BUTTON) },
  { name: "the free button promises the stake, not the server's figure", expect: ["12.free"], world: freeFromStake, landed: changed(freeFromStake, SELL_BUTTON) },
  { name: "the countdown loses its timer role", expect: ["12.free"], world: noTimer, landed: changed(noTimer, SELL_BUTTON) },
  { name: "the free line is never drawn", expect: ["12.free"], world: noFreeLine, landed: changed(noFreeLine, SELL_BUTTON) },
  { name: "the free word and the refund are keyed on the free instant, not the offer (they outlive the free window)", expect: ["12.free"], world: freeWordByInstant, landed: changed(freeWordByInstant, SELL_BUTTON) },
  { name: "the refund line is drawn whatever the offer ('kamili' over a figure with a fee)", expect: ["12.free"], world: refundAlways, landed: changed(refundAlways, SELL_BUTTON) },
  { name: "the free line is drawn on the label alone (it outlives the countdown)", expect: ["12.free"], world: freeLineByLabel, landed: changed(freeLineByLabel, SELL_BUTTON) },
  { name: "the countdown is drawn before it has run (0:00 on the server's paint)", expect: ["12.free"], world: timerBeforeCountdown, landed: changed(timerBeforeCountdown, SELL_BUTTON) },
  { name: "a lapsed free price can still be pressed", expect: ["12.lapse"], world: lapseOffered, landed: changed(lapseOffered, SELL_BUTTON) },
  { name: "a lapsed free price keeps its figure", expect: ["12.lapse"], world: lapseFigure, landed: changed(lapseFigure, SELL_BUTTON) },
  { name: "a lapsed free price keeps the free word (nothing says the button is waiting)", expect: ["12.lapse"], world: lapseWordless, landed: changed(lapseWordless, SELL_BUTTON) },
  { name: "a lapse never asks the server (the stale offer waits for the poller, up to 20 s)", expect: ["12.lapse"], world: lapseUnasked, landed: changed(lapseUnasked, SELL_BUTTON) },
  { name: "a lapse asks on every render of the page (an answer that is still free would set off another ask)", expect: ["12.lapse"], world: lapseUnarmed, landed: changed(lapseUnarmed, SELL_BUTTON) },
  { name: "a lapse leaves the confirm open on the free price", expect: ["12.lapse"], world: lapseConfirmOpen, landed: changed(lapseConfirmOpen, SELL_BUTTON) },
  { name: "a paid window's fee disappears from the journey's button", expect: ["12.paid"], world: paidNoFee, landed: changed(paidNoFee, SELL_BUTTON) },
  { name: "a price with no fee prints −0 ada", expect: ["12.paid"], world: paidZeroFee, landed: changed(paidZeroFee, SELL_BUTTON) },
  { name: "a shut exit draws a button", expect: ["12.closed"], world: closedButton, landed: changed(closedButton, SELL_BUTTON) },
  { name: "the shut words wait for the phone's clock (a shut ticket's first paint offers a sale)", expect: ["12.closed"], world: shutByClock, landed: changed(shutByClock, SELL_BUTTON) },
  { name: "the journey's button takes the kit's quieter edge (under the floor on the card)", expect: ["12.edge"], world: quietEdge, landed: changed(quietEdge, SELL_BUTTON) },
  { name: "the look formats the free window's end in the browser", expect: ["12.arith"], world: clockInBrowser, landed: changed(clockInBrowser, SELL_BUTTON) },
  { name: "the look works the refund out on the phone", expect: ["12.arith"], world: moneyComputed, landed: changed(moneyComputed, SELL_BUTTON) },
  { name: "a journey sell word is re-worded with nafasi in Swahili", expect: ["12.words"], world: swNafasiSell, landed: wordChanged(swNafasiSell, "sw", "journey.sellKeep") },
  { name: "a second word on the sell path says 持仓 in Chinese", expect: ["12.words"], world: zhHoldingsSell, landed: wordChanged(zhHoldingsSell, "zh", "journey.sellUnchanged") },
  { name: "a journey sell word takes the withdraw verb, kutoa, in Swahili", expect: ["12.words"], world: swToaSell, landed: wordChanged(swToaSell, "sw", "journey.sellUnchanged") },
  { name: "a word on the sell path is missing in Chinese", expect: ["12.words"], world: zhMissingSell, landed: wordChanged(zhMissingSell, "zh", "journey.sellFreeCta") },
];

let caught = 0;
for (const p of plants) {
  proof(`PLANT LANDED · ${p.name}`, p.landed);
  const r = run({ ...REAL, ...(p.impl ?? {}) }, p.world ?? WORLD, quiet);
  const hit = r.failed.some((f) => p.expect.some((e) => f.startsWith(e)));
  if (hit && p.landed) caught++;
  proof(`  └─ fires: ${p.expect.join(" | ")}`, hit, r.failed.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${r.failed.slice(0, 2).join(" | ")}`);
}
console.log("");
console.log(`RED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? ` · all ${pass} proofs held` : ` · ${fail} of ${pass + fail} proofs FAILED`}`);
process.exit(fail === 0 && caught === plants.length ? 0 : 1);
