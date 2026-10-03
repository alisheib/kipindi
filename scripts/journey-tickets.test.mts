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
 *   §9 THE SELL BUTTON (A8) — the card hands the button the server's instant, `freeUntil={freeExitEndsAt(…)}`, in its
 *      classic look (the journey look is WP10's), and `test:sell-grace-truth` §2 names the card among its hosts.
 *   §10 LOADING AND ERRORS (§0h point 21) — each loading file asks the per-request resolver beside the words and
 *      returns ONE ghost by its answer: the journey's for a journey request, today's (kept whole) for everybody else,
 *      both picked and drawn on the server. The error pages are client components, never drawn on the server (React's
 *      server renderer cannot run an error boundary): each mounts in the browser as a fresh render and picks its words
 *      from `useJourneyOn()`, which reads the shell's mark, already in the page.
 *   §11 THE WIRING (A14) — this suite is in predeploy and its red twin is declared.
 *
 * ⚠️ WHAT IT DOES NOT HOLD. Until WP10, the Sell button's own dialogs keep their classic words, and three of those say
 * "nafasi" in Swahili (`dialog.sellPositionNow`, `dialog.keepPosition`, `common.positionUnchanged`); WP10 hands them the
 * journey's (`journey.sellConfirmTitle`, `sellKeep`, `sellUnchanged`). And off Tiketi zangu itself, until the S15
 * rename (VODACOM-PLAN §3): `/positions/performance`, the question page's holder heading and the desktop avatar menu's
 * row. §4 reads the view, not those.
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
/** The journey's own Tiketi files, each held whole. */
const JOURNEY_FILES = [VIEW, CARD, SWITCH, RAIL, GHOST, RULE];
const SOURCES = [PAGE, BAR, LOADING, ERROR, HISTORY, HISTORY_LOADING, HISTORY_ERROR, ...JOURNEY_FILES,
  CLASSIC_CARD, TONE, SIDE_LABEL, TABS, GUEST_SHEET, PROXY, SELL_GATE, TW_CONFIG];

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
const FORMATTERS = ["toLocale", "new Date(", "formatDateTime(", "formatDayTime(", "formatClock(", "Intl."];

function g3Dates(W: World, ok: Ok) {
  const card = text(W, CARD);
  const calls = card.split("formatDeadline(").slice(1);
  const own = FORMATTERS.filter((f) => card.includes(f));
  ok("3.server · the card is drawn on the server and dates every instant through formatDeadline, asked with the render's own clock — never a formatter of its own",
    card.length > 0 && !isClient(card) && !isClient(text(W, VIEW)) && own.length === 0 && calls.length >= 2
      && calls.every((c) => c.slice(0, c.indexOf(")")).endsWith(", serverNow")),
    show({ own, calls: calls.map((c) => c.slice(0, c.indexOf(")"))) }));
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

/* ══ §9 · THE SELL BUTTON (A8) ═══════════════════════════════════════════════════════════════════════════════ */
const HOST_CALL = "freeUntil={freeExitEndsAt({ placedAt: p.placedAt }, m)}";
const HELPER_IMPORT = /import [{][^}]*freeExitEndsAt[^}]*[}] from "@[/]lib[/]server[/]market-service"/;
const SELL_ELEMENT = ["<SellButton", "positionId={p.id}", "stake={p.stake}", "value={liveValue ?? 0}", HOST_CALL,
  "closesAt={cutoffIso}", "alreadyClosed={sellShut}", "serverNow={serverNow}", "/>"].join("");

function g9Sell(W: World, ok: Ok) {
  const card = text(W, CARD);
  ok("9.host · the card hands the button the server's instant — the helper's own call, about this bet's placement and the market as read — from a server component (A8)",
    !isClient(card) && HELPER_IMPORT.test(card) && count(card, HOST_CALL) === 1 && count(card, "<SellButton") === 1);
  const at = card.indexOf("<SellButton");
  const element = at < 0 ? "" : card.slice(at, card.indexOf("/>", at) + 2);
  ok("9.classic · …in its classic look: the classic hosts' props and nothing more (the journey look is WP10's)",
    squash(element) === SELL_ELEMENT, squash(element).slice(0, 240));
  const gate = text(W, SELL_GATE);
  ok("9.gate · test:sell-grace-truth §2 names the card among the hosts it must find, so the card cannot stop being one unseen",
    gate.includes(`const JOURNEY_CARD = "src/components/journey/tickets/ticket-card.tsx";`) && gate.includes("[POSITIONS, MARKET, JOURNEY_CARD].every("));
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
  log(""); log("§9 · the sell button — the server's instant, the classic look, the gate that names the card");
  g9Sell(W, ok);
  log(""); log("§10 · loading and errors — one ghost picked on the server, the error words from the flag");
  g10Loading(W, ok);
  log(""); log("§11 · the wiring");
  g11Wiring(W, ok);
  return { failed, total };
}

if (!PROVE_RED) {
  console.log("journey-tickets — Tiketi zangu (Vodacom plan S6, WP9)");
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
// §9 — the sell button
const instantBuilt = swap(CARD, HOST_CALL, "freeUntil={new Date(Date.parse(p.placedAt) + 300000).toISOString()}");
const journeyLook = swap(CARD, "alreadyClosed={sellShut}", `alreadyClosed={sellShut} look="journey"`);
const gateForgets = swap(SELL_GATE, "[POSITIONS, MARKET, JOURNEY_CARD].every(", "[POSITIONS, MARKET].every(");
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
  { name: "the card builds the free-sell instant itself", expect: ["9.host", "9.classic"], world: instantBuilt, landed: changed(instantBuilt, CARD) },
  { name: "the card takes WP10's journey look early", expect: ["9.classic"], world: journeyLook, landed: changed(journeyLook, CARD) },
  { name: "the sell gate forgets the journey card", expect: ["9.gate"], world: gateForgets, landed: changed(gateForgets, SELL_GATE) },
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
