// R5-H · G-2 part B — every other player loading file: the drawings that need no server answer become client code where
// they stand; /positions and /wallet keep a server question and hand it to a drawing beside them; the money books share
// one bar ghost (G-2b). CRLF throughout (lib.cjs).
const { rd, once, edit, create } = require("./lib.cjs");

const NOTE_WORDS =
  " * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so\n"
  + " * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —\n"
  + " * `components/ui/page-loader.tsx` has the convention.\n";

/** A loading file that reads only the words: "use client" at its top, `useT` for `getServerT`, a sync function, the note. */
function toClient(p, name) {
  edit(p, (s) => {
    s = `"use client";\n\n${s}`;
    s = once(s, 'import { getServerT } from "@/lib/i18n-server";\n', 'import { useT } from "@/lib/i18n";\n', `${p} import`);
    const head = `export default async function ${name}() {\n  const { t } = await getServerT();\n`;
    const at = s.indexOf(head);
    if (at < 0) throw new Error(`${p}: no head`);
    const docEnd = s.lastIndexOf(" */\n", at);
    const hasDoc = docEnd >= 0 && docEnd + " */\n".length === at;
    s = once(s, head, `export default function ${name}() {\n  const { t } = useT();\n`, `${p} head`);
    if (hasDoc) s = s.slice(0, docEnd) + NOTE_WORDS + s.slice(docEnd);
    else s = s.replace(`export default function ${name}() {\n`, () => `/**\n${NOTE_WORDS} */\nexport default function ${name}() {\n`);
    return s;
  });
}
toClient("src/app/results/loading.tsx", "ResultsLoading");
toClient("src/app/markets/loading.tsx", "MarketsLoading");
toClient("src/app/live/loading.tsx", "LiveLoading");
toClient("src/app/profile/loading.tsx", "ProfileLoading");
toClient("src/app/positions/performance/loading.tsx", "PerformanceLoading");
toClient("src/app/leaderboard/loading.tsx", "LeaderboardLoading");
toClient("src/app/agent/loading.tsx", "AgentLoading");
toClient("src/app/wallet/receipt/[id]/loading.tsx", "ReceiptLoading");
toClient("src/app/wallet/withdraw/loading.tsx", "WithdrawLoading");
toClient("src/app/updown/[roundId]/loading.tsx", "UpDownRoundLoading");
toClient("src/app/wallet/receipts/loading.tsx", "ReceiptsLoading");

/* ── the money books' one bar ghost (G-2b): /wallet's and /wallet/receipts' ──────────────────────────────────────── */
create("src/app/wallet/money-bar-ghost.tsx",
  'import { FilterGroupKey } from "@/components/ui/filter-pill";\n'
  + 'import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_WRAP_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_GROUP_CLASS, QueryGroupDivider } from "@/components/ui/query-bar";\n'
  + 'import type { Dict } from "@/lib/i18n-dict";\n\n'
  + "/**\n"
  + " * THE MONEY BOOKS' BAR WHILE IT LOADS — /wallet's and /wallet/receipts' (round 5's follow-up, R5-H · G-2b). The two bars\n"
  + " * are one arrangement (`wallet-bar.tsx`, `receipts-bar.tsx`: the lens strip with its count, on a line of its own below\n"
  + " * `lg`; then one Filters button on a phone, the state and window groups along the bar from `lg`), so their ghosts are\n"
  + " * one drawing, in the bar's own classes (imported, never retyped); the lenses and the count's noun are each page's.\n"
  + " * ⭐ EVERY PILL IS AS WIDE AS THE PAGE'S, IN EVERY LANGUAGE: the kit pill's box (`filter-pill.tsx`: 44px with a 1px\n"
  + " * border, `px-3`, its 13px semibold label, `gap-1.5`, the 11px mono bold count) with the words set and not shown — the\n"
  + " * home ghost's way (R4-J) — so a row wraps where the page's does. Measured from the repo's fonts (S/r5h/measure-bars.cts):\n"
  + " * at 1024 and 1280 the page's state and window groups are two lines in Swahili and English (1269 and 1173px in 960 and\n"
  + " * 1016), and /wallet's eight lenses two lines in Swahili; the receipts ghost drew twelve fixed boxes in ONE line (790px),\n"
  + " * so its list landed 56px lower than it promised on a desktop, and /wallet's ghost drew no bar at all — the bar, 141px\n"
  + " * on a phone, appeared from nothing over the list (R5-B named it). The counts hold two digits' room (the page prints the\n"
  + " * real numbers); the result count is the phrase's own width, in `QueryResultCount`'s type, so its line is 17.25px.\n"
  + " * ⛔ No `data-result-count`, no link and no live region: a ghost promises a shape, never a number or a control.\n"
  + " * ⛔ Drawn for an account that has rows — the page withholds the bar for one that has none.\n"
  + " */\n"
  + "export function MoneyBarGhost({ t, lenses, count }: { t: Dict; lenses: readonly string[]; count: string }) {\n"
  + "  // The two axes the money books share, in the bars' order, with the bars' words (`stateLabel`, `whenLabel`).\n"
  + "  const groups: ReadonlyArray<readonly [string, readonly string[]]> = [\n"
  + "    [t.wallet.stateKey, [t.market.oddsAny, t.wallet.stateFlight, t.wallet.txnStatusConfirmed, t.wallet.txnStatusFailed, t.wallet.txnStatusReversed]],\n"
  + "    [t.common.when, [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll]],\n"
  + "  ];\n"
  + "  return (\n"
  + "    <div className={QUERY_BAR_CLASS} aria-hidden>\n"
  + "      {/* Row 1 — the lenses (scrolling below lg, wrapping from it, as `QUERY_STRIP_CLASS` does), then the result count:\n"
  + "          the bar's own wrapped row (`QUERY_BAR_ROW1_WRAP_CLASS`, R5-B 2026-10-09). */}\n"
  + "      <div className={QUERY_BAR_ROW1_WRAP_CLASS}>\n"
  + "        <div className=\"flex min-w-0 flex-1 basis-full items-center gap-1 overflow-hidden lg:flex-wrap lg:overflow-visible\">\n"
  + "          {lenses.map((label, i) => <PillGhost key={i} label={label} />)}\n"
  + "        </div>\n"
  + "        <p className=\"shrink-0 font-mono text-[11.5px] tabular-nums text-transparent\"><span className=\"rounded bg-bg-overlay\">{count}</span></p>\n"
  + "      </div>\n"
  + "      {/* Row 2 — one Filters button on a phone; from lg the two groups, each in the page's own wrapper with its divider\n"
  + "          (`QueryGroupDivider`: the row's 29px column gap is keyed on it) and its key, so the row wraps as the page's. */}\n"
  + "      <div className={QUERY_BAR_ROW2_CLASS}>\n"
  + "        <div className=\"h-[44px] w-[104px] rounded-pill bg-bg-overlay kp-shimmer-track lg:hidden\" />\n"
  + "        {groups.map(([key, chips]) => (\n"
  + "          <div key={key} className=\"hidden min-w-0 items-center gap-2 lg:flex\">\n"
  + "            <QueryGroupDivider />\n"
  + "            <div className={QUERY_GROUP_CLASS}>\n"
  + "              <FilterGroupKey className=\"text-transparent\">{key}</FilterGroupKey>\n"
  + "              {chips.map((label, i) => <PillGhost key={i} label={label} />)}\n"
  + "            </div>\n"
  + "          </div>\n"
  + "        ))}\n"
  + "      </div>\n"
  + "    </div>\n"
  + "  );\n"
  + "}\n\n"
  + "/** A pill while it loads: `filterPillClass`'s box (its geometry, not its ink) with the label set and not shown. */\n"
  + "function PillGhost({ label }: { label: string }) {\n"
  + "  return (\n"
  + "    <span className=\"inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border border-transparent bg-bg-overlay px-3 text-[13px] font-semibold text-transparent kp-shimmer-track\">\n"
  + "      {label}\n"
  + "      <span className=\"font-mono text-[11px] font-bold tabular-nums\">00</span>\n"
  + "    </span>\n"
  + "  );\n"
  + "}\n");

edit("src/app/wallet/receipts/loading.tsx", (s) => {
  s = once(s, 'import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_WRAP_CLASS, QUERY_BAR_ROW2_CLASS } from "@/components/ui/query-bar";\n',
    'import { MoneyBarGhost } from "@/app/wallet/money-bar-ghost";\n', "rc.import");
  s = once(s, " * its skeleton state one width), so nothing jumps when the list lands: the real header with its real words, the bar's\n"
    + " * two rows in the bar's OWN classes (imported, never retyped — `positions/loading.tsx`'s rule; a single 44px block\n"
    + " * stood in for a two-row bar until the design review of 2026-10-07 measured the 70–90px jump), and rows with the row's\n",
    " * its skeleton state one width), so nothing jumps when the list lands: the real header with its real words, the bar's\n"
    + " * two rows in the bar's OWN classes (imported, never retyped — `positions/positions-ghost.tsx`'s rule; a single 44px\n"
    + " * block stood in for a two-row bar until the design review of 2026-10-07 measured the 70–90px jump) — since round 5's follow-up\n"
    + " * the money books' one bar ghost, its pills as wide as the page's in every language (`money-bar-ghost.tsx`, R5-H\n"
    + " * G-2b: twelve fixed boxes drew row 2 in one line where the page wraps it to two from 1024) — and rows with the row's\n", "rc.doc");
  const from = s.indexOf("      <div className={QUERY_BAR_CLASS} aria-hidden>\n");
  const to = s.indexOf('      <div className="rounded-xl glass-panel overflow-hidden" aria-hidden>\n');
  if (from < 0 || to < 0 || to < from) throw new Error("receipts bar block");
  return s.slice(0, from)
    + '      <MoneyBarGhost t={t} lenses={[t.common.all, t.receipts.lensDeposits, t.receipts.lensWithdrawals]} count={t.receipts.nResults.replace("{n}", "00")} />\n'
    + s.slice(to);
});

/* ── /positions: the server asks which reader; today's picture moves beside it, byte for byte ─────────────────────── */
{
  const p = "src/app/positions/loading.tsx";
  const s = rd(p);
  const docAt = s.indexOf("/**\n * ⭐ THE SKELETON'S JOB"), fnAt = s.indexOf("export default async function PositionsLoading() {\n");
  const doc = s.slice(docAt, fnAt);
  const wp9 = s.slice(s.indexOf("  /* ⭐ S6 WP9"), s.indexOf("  const [{ t }, { journey }]"));
  const bodyAt = s.indexOf("  return (\n", s.indexOf("if (journey) return <TicketsGhost t={t} />;"));
  const body = s.slice(bodyAt);
  if (docAt < 0 || fnAt < 0 || !wp9.startsWith("  /* ⭐ S6 WP9") || bodyAt < 0 || !body.endsWith("  );\n}\n")) throw new Error("positions shape");
  create("src/app/positions/positions-ghost.tsx",
    '"use client";\n\n'
    + 'import { PageContainer } from "@/components/layout/page-container";\n'
    + 'import { PageHeader } from "@/components/ui/page-header";\n'
    + 'import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";\n'
    + 'import { useT } from "@/lib/i18n";\n\n'
    + doc.replace(/ \*\/\n$/, " * ⭐ TODAY'S PICTURE, AS CLIENT CODE (round 5's follow-up, R5-H · G-2): `loading.tsx` (this folder) asks the server\n"
      + " * which reader this is and renders this for everybody the journey is not shown to; its words are the client\n"
      + " * dictionary's, so a refresh of /positions (every 20 s) carries its reference, not this tree —\n"
      + " * `components/ui/page-loader.tsx` has the convention. ⛔ It loads nothing of the journey's (VODACOM-PLAN §0h point 21).\n */\n")
    + "export function PositionsGhost() {\n  const { t } = useT();\n" + body);
  edit(p, () =>
    'import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";\n'
    + 'import { resolveSimpleJourney } from "@/lib/server/journey-preview";\n'
    + 'import { heroRailNames } from "@/lib/server/payout-rails";\n'
    + 'import { PositionsGhost } from "./positions-ghost";\n\n'
    + "/**\n * /positions loading skeleton — the question is asked here, on the server; both pictures are drawn in the browser.\n"
    + " * Today's is `positions-ghost.tsx` (this folder), which says why it is shaped as it is.\n */\n"
    + "export default async function PositionsLoading() {\n"
    + once(wp9, " snapshot. */\n", " snapshot.\n"
      + "     ⭐ DRAWN IN THE BROWSER (round 5's follow-up, R5-H · G-2): the server asks only what the browser cannot, so a refresh\n"
      + "     (every 20 s here) carries a reference, not a tree. A journey reader is handed the journey's route ghost pinned to\n"
      + "     this page — R5-D's binding, whose code their browser already holds and a classic reader's never fetches — and\n"
      + "     everybody else `PositionsGhost`, which loads nothing of the journey's. `components/ui/page-loader.tsx` has the\n"
      + "     convention. */\n", "pos.wp9")
    + "  const { journey } = await resolveSimpleJourney();\n"
    + '  if (journey) return <LazyJourneyRouteGhost rails={heroRailNames(null)} at="/positions" />;\n'
    + "  return <PositionsGhost />;\n}\n");
}

/* ── /wallet: the server answers the bonus question; the picture moves beside it, with its bar, door and section ──── */
{
  const p = "src/app/wallet/loading.tsx";
  let s = rd(p);
  const fnAt = s.indexOf("export default async function WalletLoading() {\n  const { t } = await getServerT();\n");
  if (fnAt < 0) throw new Error("wallet head");
  let body = s.slice(s.indexOf("  return (\n", fnAt));
  if (!body.endsWith("  );\n}\n")) throw new Error("wallet body");
  body = body.split("bonusIsLiveFor()").join("bonusLive");
  if ((body.match(/bonusLive/g) || []).length !== 2) throw new Error("wallet bonus sites");
  // The page's own two keys: the eyebrow was `wallet.title` beside the page's `common.walletLabel`.
  body = once(body, "<PageHeader eyebrow={t.wallet.title} title={t.common.yourFunds} />", "<PageHeader eyebrow={t.common.walletLabel} title={t.common.yourFunds} />", "w.eyebrow");
  body = once(body, "          (1) The eyebrow + h1 were `PageHeader`'s recipe retyped by hand; `wallet-client.tsx:501`\n"
    + "          renders the component with these exact two strings, so this renders it too — the\n",
    "          (1) The eyebrow + h1 were `PageHeader`'s recipe retyped by hand; `wallet-client.tsx`\n"
    + "          renders the component with these two keys, so this renders it too — the\n", "w.c1");
  body = once(body, "          ⚠️ The eyebrow/title strings differ from the page's h1 word (\"Your funds\") only in the\n"
    + "          eyebrow, which matches; do not \"tidy\" them apart (§L1 — one name per destination). */}\n",
    "          ⭐ THE PAGE'S OWN TWO KEYS since round 5's follow-up (R5-H): the eyebrow read `wallet.title` beside the page's\n"
    + "          `common.walletLabel` — one word in all three languages today, two keys that could part tomorrow (§L1 — one\n"
    + "          name per destination; same component, same props). */}\n", "w.c2");
  // G-2b — the bar, in the bar's place (between the rail and the door), drawn as /wallet/receipts' is.
  body = once(body, "      {/* The \"All receipts\" door (2026-10-07): a 44px row, right-aligned, over the list — as the page draws it for an\n"
    + "          account that has rows, which is the account that opens /wallet. */}\n"
    + "      <div className=\"flex justify-end\" aria-hidden>\n",
    "      {/* ⭐ THE PAGE'S BAR (`wallet-bar.tsx`), drawn since round 5's follow-up (R5-H · G-2b): this ghost had none, so the\n"
    + "          bar — 141px on a phone (row 1 10 + 44 + 8 + 17.25 − 4, row 2 12 + 44 + 10), 120 to 168px from 1024 — appeared\n"
    + "          from nothing between the rail and the list when the data landed (R5-B named it). It is the money books' one bar\n"
    + "          ghost (`money-bar-ghost.tsx`, /wallet/receipts' too), with a player's eight lenses in `lensLabel`'s words. */}\n"
    + "      <MoneyBarGhost t={t} lenses={[t.common.all, t.wallet.typeIn, t.wallet.typeOut, t.wallet.typeBet, t.wallet.typePayout, t.wallet.typeRefund, t.wallet.typeBonus, t.wallet.typeAdjust]} count={t.wallet.nResults.replace(\"{n}\", \"00\")} />\n\n"
    + "      {/* The \"All receipts\" door (2026-10-07): a 44px row, right-aligned, over the list — as the page draws it for an\n"
    + "          account that has rows, which is the account that opens /wallet. ⭐ In the bar's rhythm by the page's own class\n"
    + "          (`.kp-wallet-door`, R5-B F13: 15px over it after a bar, −7 under it) — R5-H, G-2b. */}\n"
    + "      <div className=\"kp-wallet-door flex justify-end\" aria-hidden>\n", "w.bar");
  // G-2b — the spark and the list are ONE section on the page (`space-y-3`, 16px), not two blocks on the 32px rung.
  const sparkAt = body.indexOf("      {/* 30-day balance spark strip (46px svg + label padding on the page). */}\n");
  const endAt = body.indexOf("    </PageContainer>\n");
  if (sparkAt < 0 || endAt < 0) throw new Error("wallet spark/list");
  const block = body.slice(sparkAt, endAt).replace(/\n+$/, "\n").split("\n").map((l) => (l.length ? `  ${l}` : l)).join("\n");
  body = body.slice(0, sparkAt)
    + "      {/* The spark and the list, as the page holds them: ONE section on its 16px rhythm (`space-y-3`, wallet-client.tsx),\n"
    + "          not two blocks on the container's 32px rung — the list stood 16px lower than it lands (R5-H, G-2b). */}\n"
    + "      <section className=\"space-y-3\">\n" + block + "      </section>\n" + body.slice(endAt);
  create("src/app/wallet/wallet-ghost.tsx",
    '"use client";\n\n'
    + 'import { cn } from "@/lib/utils";\n'
    + 'import { PageContainer } from "@/components/layout/page-container";\n'
    + 'import { PageHeader } from "@/components/ui/page-header";\n'
    + 'import { MoneyBarGhost } from "@/app/wallet/money-bar-ghost";\n'
    + 'import { useT } from "@/lib/i18n";\n\n'
    + "/**\n * /wallet's loading picture (and the picture of every page below it while its own loads), drawn in the browser\n"
    + " * (round 5's follow-up, R5-H · G-2): `loading.tsx` (this folder) answers on the server the one thing the browser cannot\n"
    + " * read — whether the bonus programme is live (`bonusLive`) — and this reads its words from the client dictionary, so a\n"
    + " * refresh of /wallet carries a reference, not this tree. `components/ui/page-loader.tsx` has the convention.\n */\n"
    + "export function WalletGhost({ bonusLive }: { bonusLive: boolean }) {\n  const { t } = useT();\n" + body);
  edit(p, () =>
    'import { bonusIsLiveFor } from "@/lib/feature-state";\n'
    + 'import { WalletGhost } from "./wallet-ghost";\n\n'
    + "/**\n * /wallet loading skeleton — the question is asked here, on the server; the picture, `wallet-ghost.tsx` (this folder),\n"
    + " * is drawn in the browser (round 5's follow-up, R5-H · G-2: a refresh of /wallet and of every page below it carries a\n"
    + " * reference, not the tree — `components/ui/page-loader.tsx` has the convention). The one answer the browser cannot\n"
    + " * read is whether the bonus programme is live: `feature-state.ts` is server code, never imported into a client file.\n */\n"
    + "export default function WalletLoading() {\n  return <WalletGhost bonusLive={bonusIsLiveFor()} />;\n}\n");
}

/* ── Tiketi zangu's drawings: drawn in the browser now, by the journey's route ghost alone ─────────────────────────── */
edit("src/components/journey/tickets/tickets-ghost.tsx", (s) => once(s,
  " * ⛔ A server component that reads nothing: the loading file that chose it hands it the words.\n */\n",
  " * ⛔ It reads nothing: it is handed the words. ⭐ Since round 5's follow-up (R5-H · G-2) it is drawn in the browser, by the\n"
  + " * journey's route ghost alone (`route-ghost.tsx`) — the root's, and the one `/positions`' and `/updown/history`'s loading\n"
  + " * files hand a journey reader pinned to their page — so no server file imports it and a classic reader is sent none of\n"
  + " * it (§0h point 21). It stays a module with no directive: only client code loads it.\n */\n", "tg.note"));
console.log("part B done");
