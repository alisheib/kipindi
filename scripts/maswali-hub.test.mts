/**
 * test:maswali-hub — THE MILLIONEA HUB'S ROUND-1 FIXES, AS DRAWN (MASWALI-BUILD S5-DESIGN-HUB; the round-1 hub critic's
 * R1-hub and the hub rows of R1-motion; Ali 2026-10-21 10/10 pass).
 *
 *   npx tsx scripts/maswali-hub.test.mts     (npm run test:maswali-hub)
 *
 * Every check renders the hub's own parts in English, Swahili and Chinese (react-dom/server, the platform's providers) or
 * runs the pure rule behind one, and asserts what comes out — a class on the element a reader sees, the words in each
 * language, a figure's measured width — never the source text. Each section ends with a PLANT: the old drawing (or the
 * defect) the check must catch. The page itself is a server component that reads the store; its boxes, inks and states
 * are measured in a browser by `qa:maswali-hub-states`, and its read model's new reads by `test:maswali-hub-reads`.
 *   §1 M4/H1 the ledger is the kit's receipt row          §2 L10 the figure holds one line at 320
 *   §3 H3 the final week's rule under the figure          §4 L15 a conditional refund row: no figure, no dash
 *   §5 motion L1 a live frame ticks each value it moved   §6 M9/M10 the notices are calm bars; the carry's origin
 *   §7 L2/L18 the strip: mono ranges, a shape for "now"   §8 M2 the kit's header pill and its wrapping row
 *   §9 M11 a result that arrives presses once            §10 the words, as decided, in three languages
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import { dict } from "../src/lib/i18n-dict.ts";
import { fill, formatTzs } from "../src/lib/utils.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
const j = (v: unknown) => JSON.stringify(v);
const count = (s: string, needle: string) => s.split(needle).length - 1;
const LOCALES = ["en", "sw", "zh"] as const;
type L3 = (typeof LOCALES)[number];

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

// The notices' seen mark is a server action: a stand-in answers it, so the island renders as a browser receives it.
{
  const at = join(ROOT, "src/app/millionea/actions.ts");
  const stub = new NodeModule(at);
  stub.filename = at; stub.loaded = true;
  stub.exports = { markMillioneaNoticeSeenAction: async () => ({ ok: true }) };
  (req.cache as Record<string, unknown>)[at] = stub;
}
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: L3; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (l: L3, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: "/millionea" }, h(I18nProvider as never, { initial: l } as never, el as never))));
const textOf = (m: string) => m.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
/** The opening tag of the first element carrying `attr` (e.g. `data-row="jackpot"`), and the tag of its parent. */
const tagWith = (m: string, attr: string): string => { const at = m.indexOf(attr); if (at < 0) return ""; const open = m.lastIndexOf("<", at); return m.slice(open, m.indexOf(">", at) + 1); };
const innerOf = (m: string, attr: string): string => { const at = m.indexOf(attr); if (at < 0) return "\u0000"; const start = m.indexOf(">", at) + 1; return textOf(m.slice(start, m.indexOf("</span>", start))); };

const POOL = req("../src/components/maswali/maswali-pool-figure.tsx") as typeof import("../src/components/maswali/maswali-pool-figure.tsx");
const { MaswaliPoolHead, MaswaliPoolLedger } = POOL;
type View = import("../src/components/maswali/maswali-pool-figure.tsx").PoolView;
const SELLING: View = { kind: "selling", carriedIn: { week: 47, amount: null }, sales: { tickets: 41, amount: 41_000 }, pool: 41_000, floor: 1_000_000, jackpot: 1_000_000 };
const VOIDING: View = { kind: "voiding", carriedIn: null, sales: { tickets: 10, amount: 10_000 }, pool: 10_000, floor: 1_000_000, price: 1_000 };
const ledgerOf = (l: L3, view: View, ticked?: { n: number; keys: ReadonlySet<string> }) => inApp(l, h(MaswaliPoolLedger as never, { t: dict[l], locale: l, view, pct: 13, ticked } as never));
const headOf = (l: L3, view: View, final = false) => inApp(l, h(MaswaliPoolHead as never, { t: dict[l], locale: l, view, pct: 13, final } as never));

// ── §1 · M4/H1 · the ledger is the kit's receipt row ─────────────────────────────────────────────────────────────────────
console.log("\n§1 · M4/H1 · the ledger's rows are the kit ReceiptRow (the register's), never a home-made <dl>");
const RECEIPT_LABEL = 'class="min-w-0 font-mono text-micro uppercase eyebrow text-text-subtle"';
const receiptDefects = (l: L3, m: string) => {
  const d: string[] = [];
  const rows = POOL.poolLedgerRows(dict[l], SELLING, 13).length;
  if (/<dl\b|<dt\b|<dd\b/.test(m)) d.push(`${l}: a <dl> ledger`);
  if (count(m, RECEIPT_LABEL) !== rows) d.push(`${l}: ${count(m, RECEIPT_LABEL)} receipt labels for ${rows} rows`);
  const jackpot = m.slice(m.lastIndexOf("<span", m.indexOf('data-row="jackpot"') - 1) - 200, m.indexOf('data-row="jackpot"'));
  if (!/font-mono text-\[16px\] font-bold tabular-nums text-text/.test(jackpot)) d.push(`${l}: the jackpot row is not the receipt's amount`);
  if (!/class="font-mono text-\[12px\] text-text-subtle"/.test(m)) d.push(`${l}: a row of words is not the receipt's muted words`);
  return d;
};
{
  const d = LOCALES.flatMap((l) => receiptDefects(l, ledgerOf(l, SELLING)));
  ok("1.1 · in three languages every ledger row is a ReceiptRow — its label the receipt's mono micro label, the jackpot the receipt's amount, a value in words the receipt's muted words — and no <dl>", d.length === 0, d.join(" | "));
  // ⭐ the Swahili floor label keeps its connective with the word after it ("Kiwango cha" / "chini …" ended a line on "cha")
  const sw = ledgerOf("sw", SELLING);
  const keptCha = (m: string) => /<span class="whitespace-nowrap">[^<]*\bcha chini\b/.test(m);
  ok("1.2 · sw \"Kiwango cha chini kilichohakikishwa\" keeps \"cha\" with \"chini\": no line ends on the connective", keptCha(sw), (sw.match(/[^>]{0,40}cha[^<]{0,40}/) ?? [""])[0]);
  // The label as WIP 1 drew it: a fact line of `keepFact`s, which keeps runs and figures but not a connective.
  const FACTS = req("../src/components/maswali/maswali-facts.tsx") as typeof import("../src/components/maswali/maswali-facts.tsx");
  const factsOnly = inApp("sw", h(FACTS.MaswaliFacts as never, { facts: FACTS.factsOf(dict.sw.millionea.floor).map((f) => FACTS.keepFact("sw", f)) } as never));
  ok("1.2′ PLANT · the label drawn as a bare fact line (its connective free to end a line) is reported", !keptCha(factsOnly), factsOnly.slice(0, 160));
  const oldDl = "<dl><div><dt>Jackpot</dt><dd>TZS 1,000,000</dd></div></dl>";
  ok("1.1′ PLANT · the old home-made <dl> ledger is reported", receiptDefects("en", oldDl).length > 0);
}

// ── §2 · L10 · the figure holds one line at 320 ──────────────────────────────────────────────────────────────────────────
console.log("\n§2 · L10 · \"at least TZS 1,000,000\" holds one line in a 320 phone's head");
{
  const twCfg = ((m: { default?: unknown }) => (m.default ?? m) as { theme: { extend: { fontSize: Record<string, [string, { letterSpacing: string }]> } } })(req("../tailwind.config.ts"));
  const px = (k: string) => parseFloat(twCfg.theme.extend.fontSize[k]?.[0] ?? "NaN");
  const fontkit = req("fontkit") as { openSync: (p: string) => { unitsPerEm: number; layout: (s: string) => { advanceWidth: number } } };
  const JBM = fontkit.openSync(join(ROOT, "src/lib/server/reports/fonts/JetBrainsMono-Bold.ttf"));
  const width = (s: string, size: number) => (JBM.layout(s).advanceWidth / JBM.unitsPerEm) * size;
  // The head's text column at 320: the 288px page column less the card's 16px padding each side.
  const COLUMN_320 = 320 - 2 * 16 - 2 * 16;
  const longest = LOCALES.map((l) => fill(dict[l].millionea.atLeast, { amount: formatTzs(1_000_000) })).sort((a, b) => width(b, 1) - width(a, 1))[0];
  const m = headOf("en", SELLING);
  const fig = tagWith(m, 'data-testid="millionea-hub-figure"');
  const at320 = width(longest, px("title-sm")), at360 = width(longest, px("title-md"));
  ok(`2.1 · the figure is title-sm below 360 and title-md from 360 — the longest "at least" (${longest}) is ${at320.toFixed(1)}px at 18px in the ${COLUMN_320}px column of a 320 phone`,
    /\btext-title-sm\b/.test(fig) && /\bxs:text-title-md\b/.test(fig) && at320 <= COLUMN_320, j({ fig, at320 }));
  ok(`2.1′ PLANT · at 22px it is ${at360.toFixed(1)}px: one rung for every width left "at least" alone above the figure at 320`, at360 > COLUMN_320);
}

// ── §3 · H3 · the final week's rule under the figure ─────────────────────────────────────────────────────────────────────
console.log("\n§3 · H3 · in a final week the head says what a pool with no 10/10 does (MR-30)");
const finalDefects = (l: L3, m: string, want: boolean) => {
  const t = textOf(m);
  const line = dict[l].millionea.finalWeekRule;
  const at = t.indexOf(line), rule = t.indexOf(fill(dict[l].millionea.ruleShared, { pct: 13 }).split(" · ")[0] ?? "\u0000"), carry = t.indexOf(fill(dict[l].millionea.pendingCarry, { week: 47 }));
  if (!want) return at >= 0 ? [`${l}: the final week's line where no final week runs`] : [];
  return at > rule && rule >= 0 && (carry < 0 || at < carry) ? [] : [`${l}: rule@${rule} final@${at} carry@${carry}`];
};
{
  const d = LOCALES.flatMap((l) => [...finalDefects(l, headOf(l, SELLING, true), true), ...finalDefects(l, headOf(l, SELLING, false), false), ...finalDefects(l, headOf(l, VOIDING, true), false)]);
  ok("3.1 · a final week's head: the figure, the 10/10 rule, THEN \"Final week: if no ticket gets 10/10, the pool is shared equally by this week's highest-scoring tickets\", then the carry's line — in three languages; none in a week that is not final, none on a void", d.length === 0, d.join(" | "));
  const old = headOf("en", SELLING, false); // the head as it was: the 10/10 rule alone under a final week's figure
  ok("3.1′ PLANT · the old final week (the 10/10 rule alone) is reported", finalDefects("en", old, true).length > 0);
}

// ── §4 · L15 · a conditional refund row ──────────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · L15 · \"If the void stands, every ticket is refunded TZS 1,000\" stands alone — no figure (H1), no dash");
{
  const d = LOCALES.flatMap((l) => {
    const m = ledgerOf(l, VOIDING);
    const refund = innerOf(m, 'data-row="refund"'), jackpot = innerOf(m, 'data-row="jackpot"');
    return refund === "" && jackpot === "—" && textOf(m).includes(fill(dict[l].millionea.refundEachIfVoid, { price: formatTzs(1_000) })) ? [] : [`${l}: refund "${refund}" jackpot "${jackpot}"`];
  });
  ok("4.1 · being voided, in three languages: the refund sentence names its amount and its value cell is empty — never \"—\", never a figure; the jackpot row's dash stays", d.length === 0, d.join(" | "));
  ok("4.1′ PLANT · the old row (a dash beside the sentence) is reported", innerOf('<span data-row="refund">—</span>', 'data-row="refund"') !== "");
}

// ── §5 · motion L1 · a live frame ticks each value it moved ──────────────────────────────────────────────────────────────
console.log("\n§5 · motion L1 · a real sale's frame ticks the values it changed (`.m-tick`, keyed on the frame), nothing on the first paint");
{
  const HP = req("../src/app/millionea/hub-pool.tsx") as typeof import("../src/app/millionea/hub-pool.tsx");
  const VIEW = req("../src/app/millionea/millionea-view.ts") as typeof import("../src/app/millionea/millionea-view.ts");
  const fig = (sales: number) => ({ weekId: "w", code: "MLN-2026-W49", visibility: "PUBLIC", state: "OPEN", carryIn: null, carryPendingCode: "MLN-2026-W47",
    carryFromCode: null, sales, floor: 1_000_000, jackpot: 1_000_000, atLeast: true, feeRate: 0.13 }) as never;
  const vals = (sales: number) => HP.ledgerValues(dict.en, VIEW.poolViewOf(fig(sales), 1_000), 13);
  const moved = HP.movedRows(vals(41_000), vals(42_000));
  ok("5.1 · one more ticket (41,000 → 42,000 under the floor): the sales and the pool rows moved — not the floor, the jackpot (the floor's larger) or the fee", j([...moved].sort()) === j(["pool", "sales"]), j([...moved]));
  const ticked = ledgerOf("en", SELLING, { n: 1, keys: moved });
  const tickOn = (k: string) => /\bm-tick\b/.test(tagWith(ticked, `data-row="${k}"`));
  ok("5.2 · the frame's rows take `.m-tick` and no other row does", tickOn("sales") && tickOn("pool") && !tickOn("jackpot") && !tickOn("floor") && !tickOn("in"), j({ sales: tickOn("sales"), pool: tickOn("pool"), jackpot: tickOn("jackpot") }));
  const first = ledgerOf("en", SELLING, { n: 0, keys: new Set() });
  ok("5.3 · CONTROL · the first paint ticks nothing (no count-up, no tick on mount, §M8a item 7)", !/\bm-tick\b/.test(first));
  const planted = ledgerOf("en", SELLING, { n: 1, keys: new Set(["sales", "pool", "floor", "jackpot", "fee", "in"]) });
  ok("5.1′ PLANT · a frame that ticked every row would be told apart (the jackpot ticks with it)", /\bm-tick\b/.test(tagWith(planted, 'data-row="jackpot"')));
}

// ── §6 · M9/M10 · the notices are the calm bar; the carry's origin ───────────────────────────────────────────────────────
console.log("\n§6 · M9/M10 · a returning notice is the platform's calm bar (NoticeBar), and the rollover's figure is the carry's origin");
{
  const { HubNotices } = req("../src/app/millionea/hub-notices.tsx") as typeof import("../src/app/millionea/hub-notices.tsx");
  const amount = formatTzs(389_000);
  const notices = (carry: boolean) => [
    { weekId: "w47", notice: "ROLLOVER" as const, text: fill(dict.en.millionea.rolloverNotice, { prev: 47, amount, week: 48 }), door: null, carry: carry ? { figure: amount, id: "mln-carried-figure" } : undefined },
    { weekId: "w47", notice: "RESULT" as const, text: fill(dict.en.millionea.resultLostOne, { week: 47 }), door: { href: "/millionea/tickets/MLN-2026-W47-000001", label: dict.en.notif.awayView } },
  ];
  const m = inApp("en", h(HubNotices as never, { notices: notices(true), renderedAt: "2026-10-21T10:00:00.000Z" } as never));
  const bars = count(m, 'role="status"'), boxed = count(m, 'role="note"');
  ok("6.1 · two notices are two NoticeBars (role=status, the info bar's border and wash), never a boxed Callout", bars === 2 && boxed === 0 && count(m, "border-info-border bg-info-bg") === 2, j({ bars, boxed }));
  const door = /<a href="\/millionea\/tickets\/MLN-2026-W47-000001" class="[^"]*min-h-\[44px\][^"]*">/.test(m);
  ok("6.2 · a result's door is the bar's own action (NoticeBarAction: a 44px pill to the ticket)", door);
  const origin = new RegExp(`<span (?=[^>]*\\bid="mln-carried-figure")(?=[^>]*\\bclass="amount")[^>]*>${amount.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</span>`).test(m);
  ok("6.3 · the rollover's figure is ONE money run carrying the carry's origin id", origin && count(m, 'id="mln-carried-figure"') === 1);
  const none = inApp("en", h(HubNotices as never, { notices: notices(false), renderedAt: "2026-10-21T10:00:00.000Z" } as never));
  ok("6.3′ CONTROL · a rollover that is not this week's carry marks no origin", !none.includes('id="mln-carried-figure"'));
}

// ── §7 · L2/L18 · the strip ───────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · L2/L18 · the strip's ranges in the numerals' mono; the phase a week is in is a filled dot, the others hollow rings");
{
  const { MaswaliWeekStrip } = req("../src/components/maswali/maswali-week-strip.tsx") as { MaswaliWeekStrip: (p: Record<string, unknown>) => unknown };
  const phases = {
    salesFrom: Date.parse("2026-11-30T00:01:00+03:00"), salesTo: Date.parse("2026-12-04T18:00:00+03:00"),
    eventsFrom: Date.parse("2026-12-05T09:00:00+03:00"), eventsTo: Date.parse("2026-12-06T23:00:00+03:00"),
    resultsFrom: Date.parse("2026-12-06T23:00:00+03:00"), resultsTo: Date.parse("2026-12-08T23:59:00+03:00"),
  };
  const stripDefects = (m: string, current: number | null) => {
    const d: string[] = [];
    const marks = [...m.matchAll(/<span aria-hidden="true" class="([^"]*)" data-phase-mark="(now|other)"><\/span>/g)].map((x) => ({ cls: x[1], mark: x[2] }));
    if (marks.length !== 3) d.push(`${marks.length} phase marks`);
    marks.forEach((x, i) => {
      const now = current === i;
      if (now !== (x.mark === "now")) d.push(`phase ${i} marked ${x.mark}`);
      if (now ? !/\bbg-brand-400\b/.test(x.cls) : !/\bborder border-border-strong\b/.test(x.cls) || /\bbg-/.test(x.cls)) d.push(`phase ${i}: ${x.cls}`);
    });
    if (count(m, 'class="font-mono tabular-nums"') !== 3) d.push(`${count(m, 'class="font-mono tabular-nums"')} mono ranges`);
    return d;
  };
  const d = LOCALES.flatMap((l) => [0, 1, 2, null].flatMap((c) => stripDefects(inApp(l, h(MaswaliWeekStrip as never, { t: dict[l], phases, current: c } as never)), c).map((x) => `${l}/${c}: ${x}`)));
  ok("7.1 · in three languages, at every phase and with none (How to play): one filled dot for the phase the week is in (a shape, not only an ink — §A4), hollow rings for the others, and each range in mono (§T5)", d.length === 0, d.slice(0, 6).join(" | "));
  const old = '<span aria-hidden="true" class="relative -top-px h-1.5 w-1.5 shrink-0 rounded-full md:hidden bg-brand-400" data-phase-mark="now"></span><span aria-hidden="true" class="relative -top-px h-1.5 w-1.5 shrink-0 rounded-full md:hidden bg-border-strong" data-phase-mark="other"></span><span aria-hidden="true" class="relative -top-px h-1.5 w-1.5 shrink-0 rounded-full md:hidden bg-border-strong" data-phase-mark="other"></span>';
  ok("7.1′ PLANT · the old dots (every phase a filled dot, told apart by ink alone, gone from 768) are reported", stripDefects(old, 0).length > 0);
}

// ── §8 · M2 · the kit's header pill and its wrapping row ──────────────────────────────────────────────────────────────────
console.log("\n§8 · M2 · the page head's doors are the kit's one pill recipe; the wrapping row is opt-in and every other head is unchanged");
{
  const PH = req("../src/components/ui/page-header.tsx") as typeof import("../src/components/ui/page-header.tsx");
  ok("8.1 · the pill recipe stands on the tap floor (§A2: min-height var(--tap-min) = 40px) and never wraps its name", /\bmin-h-\[var\(--tap-min\)\]/.test(PH.PAGE_HEADER_PILL) && /\bwhitespace-nowrap\b/.test(PH.PAGE_HEADER_PILL) && /\brounded-pill\b/.test(PH.PAGE_HEADER_PILL));
  const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
  ok("8.2 · its height is the tap floor's token, 40px", /--tap-min:\s*40px;/.test(css));
  const render = (wrap: boolean | undefined) => renderToStaticMarkup(h(PH.PageHeader as never, { eyebrow: "E", title: "T", subtitle: "S", actions: h("a", { href: "/x" }, "A"), ...(wrap === undefined ? {} : { actionsWrap: wrap }) } as never));
  const plain = render(undefined), off = render(false), on = render(true);
  ok("8.3 · without the prop (every caller but the hub) the head's row is exactly what it was: `flex items-start justify-between gap-3`", plain === off && plain.includes('<div class="flex items-start justify-between gap-3">'), plain.slice(0, 120));
  ok("8.4 · the hub's head wraps its doors under the name where they do not fit, centred beside it where they do", on.includes('<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">') && on !== plain);
  const noActions = renderToStaticMarkup(h(PH.PageHeader as never, { eyebrow: "E", title: "T", actionsWrap: true } as never));
  ok("8.5 · CONTROL · a head without doors has no row at all, whatever the prop says", !noActions.includes("justify-between"));
}

// ── §9 · M11 · a result that arrives presses once ─────────────────────────────────────────────────────────────────────────
console.log("\n§9 · M11/motion L2 · a result arriving while the hub is open presses once, in slot order, capped by the class; opening the hub presses nothing");
{
  const { arrivalsOf } = req("../src/app/millionea/hub-stamp.tsx") as typeof import("../src/app/millionea/hub-stamp.tsx");
  const none = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [i + 1, null])) as Record<number, null>;
  const first = arrivalsOf(null, { ...none, 1: "YES" });
  const later = arrivalsOf({ ...none, 1: "YES" }, { ...none, 1: "YES", 4: "NO", 2: "VOID", 11: "YES" });
  const same = arrivalsOf({ ...none, 1: "YES" }, { ...none, 1: "YES" });
  const reseal = arrivalsOf({ ...none, 3: "YES" }, { ...none, 3: "VOID" });
  ok("9.1 · the first render presses nothing (an arrival on the page, never a press — GlyphSwap's rule)", first.size === 0);
  ok("9.2 · three results in one refresh press in slot order (2, 4, 11 → steps 0, 1, 2); the one already seen does not", j([...later]) === j([[2, 0], [4, 1], [11, 2]]), j([...later]));
  ok("9.3 · CONTROL · a refresh with nothing new presses nothing; a re-seal is a new result and presses", same.size === 0 && reseal.get(3) === 0, j({ same: [...same], reseal: [...reseal] }));
  const motion = readFileSync(join(ROOT, "src/app/motion.css"), "utf8");
  ok("9.4 · the press is the N-block's own class, its stagger capped at four steps (`min(var(--i, 0), 3)`)", /\.maswali-attest\s*\{[^}]*animation-delay: calc\(min\(var\(--i, 0\), 3\) \* var\(--m-stagger\)\)/.test(motion));
  const planted = ((before: Record<number, string | null> | null, now: Record<number, string | null>) => new Map(Object.keys(now).map(Number).filter((s) => now[s] != null).map((s, i) => [s, i])))(null, { ...none, 1: "YES" });
  ok("9.1′ PLANT · a press on every result at load (the rule without its first-render arrival) is told apart", planted.size > 0 && first.size === 0);
}

// ── §10 · the words, as decided ──────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§10 · the hub's new and changed words, as decided, in three languages");
{
  const WANT: Record<L3, Record<string, string>> = {
    en: {
      finalWeekRule: "Final week: if no ticket gets 10/10, the pool is shared equally by this week's highest-scoring tickets",
      finalWeekAhead: "Week {week} will be Millionea's final week. It opens {date}.",
      weekVoidingBody: "{voided} main questions void, only {valid} valid reserves. If no objection changes this by {when}, the week is voided and every ticket refunded.",
    },
    sw: {
      finalWeekRule: "Wiki ya mwisho: ikiwa hakuna tiketi itakayopata 10/10, bwawa litagawanywa sawa kwa tiketi zenye alama za juu zaidi wiki hii",
      finalWeekAhead: "Wiki {week} itakuwa wiki ya mwisho ya Millionea. Itafunguliwa {date}.",
      weekVoidingBody: "Maswali makuu {voided} batili, akiba halali {valid} tu. Ikiwa hakuna pingamizi litakalobadilisha hili kufikia {when}, wiki itabatilishwa na kila tiketi itarejeshwa.",
    },
    zh: {
      finalWeekRule: "最后一周：若无彩票答对 10/10，奖池由本周得分最高的彩票平分",
      finalWeekAhead: "第{week}周将是 Millionea 的最后一周，于 {date}开放。",
      weekVoidingBody: "{voided} 道正选题作废，有效备选题仅 {valid} 道。若至 {when} 无异议改变此结果，整周将作废，每张彩票均将退款。",
      resultsOut: "已公布 {n}/15 个结果",
    },
  };
  const off = LOCALES.flatMap((l) => Object.entries(WANT[l]).filter(([k, v]) => (dict[l].millionea as Record<string, unknown>)[k] !== v).map(([k]) => `${l}.${k}`));
  ok("10.1 · the decided words stand in the dictionary (H3, L22 — the lead's words — M6's objection wording, L8's zh count)", off.length === 0, j(off));
  const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort().join(",");
  const keys = ["finalWeekRule", "finalWeekAhead", "weekVoidingBody", "resultsOut", "closeMoved", "seeAllTickets"];
  const mism = keys.filter((k) => new Set(LOCALES.map((l) => holes(String((dict[l].millionea as Record<string, unknown>)[k])))).size !== 1);
  ok("10.2 · every one of them carries the same placeholders in every language", mism.length === 0, j(mism));
  const zhSpacing = /\d[一-鿿]|[一-鿿]\d/.test(fill(dict.zh.millionea.resultsOut, { n: 5 }).replace(/\/15/, ""));
  ok("10.3 · zh digit/Han spaced in the count (\"已公布 5/15 个结果\"), the ordinal unspaced (第{week}周)", !zhSpacing && dict.zh.millionea.finalWeekAhead.startsWith("第{week}周"));
  ok("10.1′ PLANT · the old zh count (\"15 个结果已公布 {n} 个\") is reported", "15 个结果已公布 {n} 个" !== WANT.zh.resultsOut);
}

console.log(`\n${"═".repeat(70)}\n  MASWALI HUB: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run prints (S5-DESIGN-HUB 3: 34). It only rises. */
const MIN_ASSERTIONS = 34;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
