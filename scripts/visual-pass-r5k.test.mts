/**
 * ROUND 5 OF THE VISUAL PASS, FOLLOW-UP HELPER K (2026-10-09) — every loading ghost of the K routes lands where its page
 * lands, band for band; each fix held beside a control or a plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r5k.test.mts        (npm run test:visual-pass-r5k)
 *
 * The owner's rule (Ali, 2026-10-08/09): only perfect visual and logical results, and one convention per pattern. The
 * defect class (R5-H's audit): a ghost whose bands, heights, paddings, gaps or order differ from its page's makes the page
 * JUMP when the data lands. Each ghost below was rebuilt from its page's real structure — the same kit components with
 * the same props where the drawing allows, the page's own classes and words set and not shown elsewhere — and is held
 * here against the page's own source, or the page's own components rendered on React's server renderer.
 *   §0 the convention: `GhostText` (words set and not shown), `ghostShape`, `ChipGhost`; the drawings stay client code
 *      that loads no server module, and render in sw, en and zh
 *   §1 /wallet/receipt/[id]: the hero, the chip band, the 51px rows (8 for a completed deposit), the buttons, the footnote
 *   §2 /wallet/deposit: the form card, the provider-first order, the 106.25px tiles, the amount pills and hint, the phone
 *      hint and button, the trust strip (`money-form-ghost.tsx`, also drawn by the journey's root ghost)
 *   §3 /wallet/deposit/return: a hero, not a card; six rows; two buttons 10px apart; the footnote — and no outcome shown
 *   §4 /wallet/withdraw: the hero's own content class and the balance block's box; the form, not a spinner panel; its
 *      figures (the fee's rate, the limits) as the shapes of the page's own
 *   §5 /profile: the hero column (80px avatar, the name's face, the number line, the pills), the strip's Stats, the
 *      achievements shelf, the twelve rows, the sign-out
 *   §6 /positions (classic): the head's button, the strip's auto-fit grid (`PNL_STRIP`), the 14px exposure keys, the bar's
 *      row 2 — three lines at 1024 and 1280 as the page's, measured from the repo's fonts
 *   §7 /positions/performance: the page's bands in the page's order
 * Where an older suite owns a pin this work moved, the pin moved there, with its reason (r4h 2.1, r5d 2.8).
 * ⛔ It READS, renders in memory and writes nothing. The on-disk mutation proof is S/r5k/mutation-r5k.mjs.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
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
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
const unesc = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
/** The bands in order, each found once after the one before it — "" when all are, else the first that is not. */
function inOrder(s: string, bands: string[]): string {
  let at = -1;
  for (const b of bands) { const i = s.indexOf(b, at + 1); if (i < 0 || count(s, b) !== 1) return b; at = i; }
  return "";
}
/** A class list with the stock keys this scale inverts written as their pixel (`py-3.5` ≡ `py-[14px]`), sorted — so the
 *  page's class and the ghost's same-pixel literal (test:spacing-scale's rule) compare equal. */
const INVERTED: Record<string, string> = { "2.5": "10px", "3.5": "14px" };
const norm = (cls: string) => cls.split(/\s+/).filter(Boolean)
  .map((c) => c.replace(/^((?:[a-z]+:)?-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y))-(2\.5|3\.5)$/, (_, p, k) => `${p}-[${INVERTED[k]}]`))
  .sort().join(" ");
/** Geometry only: a class list without its inks (text/bg/border colours, hover/focus/transition, cursor). */
const geometry = (cls: string) => norm(cls.split(/\s+/).filter((c) => !/^(?:(?:hover|focus|focus-visible|group-hover|group-has-\[[^\]]+\]\/[a-z]+|has-\[[^\]]+\]):|text-text|text-brand|text-danger|text-success|text-warning|text-info|bg-bg-|bg-brand|border-border-strong$|transition|duration|ease|cursor-|group\/|group$|select-none$|kp-shimmer-track$)/.test(c)).join(" "));

/* ── the world the drawings run in: the root layout's providers ───────────────────────────────────────────────────── */
type Locale = "sw" | "en" | "zh";
const LOCALES: Locale[] = ["sw", "en", "zh"];
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Locale, any> };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Locale; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (path: string, l: Locale, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l } as never, el as never))));

const FILES = {
  ghostText: "src/components/ui/ghost-text.tsx",
  moneyForm: "src/app/wallet/money-form-ghost.tsx",
  receiptParts: "src/app/wallet/receipt-ghost.tsx",
  receipt: "src/app/wallet/receipt/[id]/loading.tsx", receiptPage: "src/app/wallet/receipt/[id]/page.tsx",
  deposit: "src/app/wallet/deposit/deposit-ghost.tsx", depositLoading: "src/app/wallet/deposit/loading.tsx", depositPage: "src/app/wallet/deposit/page.tsx",
  ret: "src/app/wallet/deposit/return/loading.tsx", retPage: "src/app/wallet/deposit/return/page.tsx",
  // ⚠️ The withdraw drawing is the loading file itself on this tip; R5-G (G-1, merging beside this work) moves it, byte for
  // byte, into `withdraw-ghost.tsx` beside a server loading file that asks the journey answer — read whichever holds it.
  withdraw: existsSync("src/app/wallet/withdraw/withdraw-ghost.tsx") ? "src/app/wallet/withdraw/withdraw-ghost.tsx" : "src/app/wallet/withdraw/loading.tsx", withdrawPage: "src/app/wallet/withdraw/page.tsx",
  profile: "src/app/profile/loading.tsx", profilePage: "src/app/profile/page.tsx", faces: "src/components/profile/profile-faces.ts", editor: "src/components/profile/name-editor.tsx",
  positions: "src/app/positions/positions-ghost.tsx", positionsPage: "src/app/positions/page.tsx", strip: "src/components/positions/pnl-summary-strip.tsx",
  performance: "src/app/positions/performance/performance-ghost.tsx", /* R6-C moved the drawing (merged 2026-10-09) */ performancePage: "src/app/positions/performance/page.tsx",
  barGhost: "src/app/wallet/money-bar-ghost.tsx",
} as const;
const G = {
  receipt: (req(`../${FILES.receipt}`) as { default: unknown }).default,
  deposit: (req(`../${FILES.deposit}`) as { DepositGhost: unknown }).DepositGhost,
  ret: (req(`../${FILES.ret}`) as { default: unknown }).default,
  withdraw: ((m: { default?: unknown; WithdrawGhost?: unknown }) => m.WithdrawGhost ?? m.default)(req(`../${FILES.withdraw}`)),
  profile: (req(`../${FILES.profile}`) as { default: unknown }).default,
  positions: (req(`../${FILES.positions}`) as { PositionsGhost: unknown }).PositionsGhost,
  // R6-C (merged 2026-10-09) moved the drawing into `performance-ghost.tsx` as `PerformanceGhost`, beside a server loading
  // file that hands it the journey answer; rendered without it, it draws the classic words, as before.
  performance: ((m: { default?: unknown; PerformanceGhost?: unknown }) => m.PerformanceGhost ?? m.default)(req(`../${FILES.performance}`)),
};
const ROUTES: Record<keyof typeof G, string> = { receipt: "/wallet/receipt/rec_any", deposit: "/wallet/deposit", ret: "/wallet/deposit/return", withdraw: "/wallet/withdraw", profile: "/profile", positions: "/positions", performance: "/positions/performance" };
const ghostHtml = (k: keyof typeof G, l: Locale) => inApp(ROUTES[k], l, h(G[k] as never));
const GT = req(`../${FILES.ghostText}`) as { GHOST_TEXT_CLASS: string; ghostShape: (s: string) => string; AMOUNT_SHAPE: string; GhostText: unknown; ChipGhost: unknown };
const MF = req(`../${FILES.moneyForm}`) as { depositRails: (t: unknown) => string[]; WITHDRAW_RAILS: readonly string[]; LIMIT_SHAPES: { min: string; max: string }; FEE_PCT_SHAPE: string; QUICK_PILLS: number; ProviderGridGhost: unknown; AmountFieldGhost: unknown };
const RG = req(`../${FILES.receiptParts}`) as { TXN_ID_SHAPE: string; DEPOSIT_REF_SHAPE: string };
const { GHOST_TEXT_CLASS, ghostShape, AMOUNT_SHAPE } = GT;
/** Each `<Tag … />` in a source, its top-level props as a map — a nested `{…}` (an icon, a node) is skipped whole, so a
 *  `/>` inside a prop never ends the tag. */
function jsxTags(src: string, tag: string): Array<Record<string, string>> {
  const out: Array<Record<string, string>> = [];
  for (let at = src.indexOf(`<${tag}`); at >= 0; at = src.indexOf(`<${tag}`, at + 1)) {
    if (/\w/.test(src[at + tag.length + 1] ?? "")) continue;
    let depth = 0, i = at + tag.length + 1, flat = "";
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "{") { depth++; if (depth === 1) flat += "{…}"; continue; }
      if (c === "}") { depth--; continue; }
      if (depth > 0) continue;
      if (c === "/" && src[i + 1] === ">") break;
      if (c === ">") break;
      flat += c;
    }
    const props: Record<string, string> = {};
    for (const m of flat.matchAll(/(\w+)(?:=(?:"([^"]*)"|\{…\}))?/g)) props[m[1]] = m[2] ?? (m[0].includes("{…}") ? "{…}" : "true");
    out.push(props);
  }
  return out;
}

/* ══ §0 · THE CONVENTION ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("0 · words set and not shown; data as shapes; the drawings client code that renders in every language");
{
  const src = squash(code(FILES.ghostText));
  const cls = GHOST_TEXT_CLASS.split(" ");
  const textOk = (s: string) => ["text-transparent", "box-decoration-clone", "select-none", "bg-bg-overlay"].every((c) => s.includes(c))
    && /export function GhostText\(\{ children, className \}: \{ children: ReactNode; className\?: string \}\) \{ return <span aria-hidden className=\{cn\(GHOST_TEXT_CLASS, className\)\}>\{children\}<\/span>; \}/.test(src);
  ok(`0.1 · GhostText lays the page's words out in the page's classes and draws a bar on each line they take: transparent, \`box-decoration-clone\`, never selectable, hidden from a screen reader (${GHOST_TEXT_CLASS})`,
    textOk(GHOST_TEXT_CLASS) && textOk(src) && cls.length === 5, GHOST_TEXT_CLASS);
  ok("0.1′ PLANT · the bar on the first line only (no `box-decoration-clone`) is reported", !textOk(GHOST_TEXT_CLASS.replace(" box-decoration-clone", "")));
  ok(`0.2 · a datum is a SHAPE — its digits as zeros (${j(ghostShape("TZS 12,345 · 9 Okt, 14:05"))}), and the stand-in figure "${AMOUNT_SHAPE}" is formatTzs(10,000)'s shape`,
    ghostShape("TZS 12,345 · 9 Okt, 14:05") === "TZS 00,000 · 0 Okt, 00:00" && AMOUNT_SHAPE === ghostShape((req("../src/lib/utils.ts") as { formatTzs: (n: number) => string }).formatTzs(10_000)));
  // ChipGhost is the kit Chip: rendered beside the page's chip of the same size, the box's inline geometry is the same.
  const { Chip } = req("../src/components/ui/chip.tsx") as { Chip: unknown };
  const geo = (s: string) => /style="([^"]*)"/.exec(s)?.[1].split(";").filter((d) => /^(padding|font-size|min-height|height|padding-block|white-space|gap|font-family|font-weight|letter-spacing|line-height)/.test(d)).join(";") ?? "";
  const page = renderToStaticMarkup(h(Chip as never, { variant: "success", size: "md", style: { whiteSpace: "nowrap" } } as never, "Imekamilika"));
  const ghost = renderToStaticMarkup(h(GT.ChipGhost as never, { glyph: 12, nowrap: true } as never, "Imekamilika"));
  ok("0.3 · ChipGhost is the kit Chip — its size row, base metrics, padding, gap, type and wrap rule — with its ink and edge cleared and the glyph's box where the page puts one",
    geo(page) !== "" && geo(page) === geo(ghost) && /color:transparent/.test(ghost) && ghost.includes('style="width:12px;height:12px"'), `${geo(page)} | ${geo(ghost)}`);
  const status = renderToStaticMarkup(h(Chip as never, { variant: "pending", size: "md" } as never, "x"));
  ok("0.3′ CONTROL · a status-variant chip is 23px, not the base 21 — why ChipGhost takes the page's metrics row", /min-height:23px/.test(status) && /min-height:21px/.test(ghost));
}
{
  // Every R5-K drawing is client code reading its words with useT (R5-H's convention) and reaches no server module.
  const SRC_EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx"];
  const loads = (file: string) => {
    const s = decomment(raw(file));
    return [...s.matchAll(/^\s*import\s+(?!type\s)[\s\S]*?\s+from\s+["']([^"']+)["']/gm)].map((m) => m[1]).map((spec) => {
      const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? posix.join(posix.dirname(file), spec) : null;
      return { spec, to: base === null ? null : SRC_EXTS.map((e) => base + e).find((p) => existsSync(p) && statSync(p).isFile()) ?? null };
    });
  };
  const bad: string[] = [];
  const seen = new Set<string>();
  const visit = (f: string) => {
    if (seen.has(f)) return; seen.add(f);
    for (const { spec, to } of loads(f)) {
      if (/^(?:next\/headers|next\/server|server-only|node:|@prisma\/)/.test(spec) || spec.startsWith("@/lib/server/") || spec === "@/lib/i18n-server") bad.push(`${f} → ${spec}`);
      if (to) visit(to);
    }
  };
  const drawings = [FILES.receipt, FILES.deposit, FILES.ret, FILES.withdraw, FILES.profile, FILES.positions, FILES.performance];
  drawings.forEach(visit);
  const client = drawings.filter((f) => !/^\s*["']use client["'];?/.test(code(f)));
  ok(`0.4 · the seven drawings are client code (R5-H · G-2: a refresh carries a reference) and the ${seen.size} modules they reach load nothing of the server's`,
    bad.length === 0 && client.length === 0, [...bad, ...client].join(" | "));
  const wrong: string[] = [];
  for (const k of Object.keys(G) as Array<keyof typeof G>) {
    const out = LOCALES.map((l) => { try { return ghostHtml(k, l); } catch (e) { wrong.push(`${k} ${l}: ${String(e).slice(0, 100)}`); return ""; } });
    if (new Set(out).size !== 3) wrong.push(`${k}: ${new Set(out).size} distinct renders`);
  }
  ok("0.5 · RUN on React's server renderer inside the root layout's providers, every rebuilt ghost renders in sw, en and zh, each in its own words", wrong.length === 0, wrong.join(" | "));
}

/* ══ §1 · /wallet/receipt/[id] ═════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · /wallet/receipt/[id] — the hero, the chip band, the 51px rows, the buttons, the footnote");
// Re-pinned by R7-B (round 7, 2026-10-10; round 6's read R5-6): the page and its ghost no longer pass `tone="subtle"` (the
// one tone PageHeader has) and the receipt glyph rides in the eyebrow's ink instead of a muted ink of its own — both bands
// moved together, so the order this check holds is unchanged.
const RECEIPT_GHOST_BANDS = ["<BackLinkGhost />", "<PageHero>", "<PageHeader", "icon={<I.receipt s={14} />}", "eyebrow={t.wallet.receiptEyebrow}",
  '<div className="flex justify-center" aria-hidden>', "<ChipGhost glyph={12} nowrap>", "<DetailsGhost>", '<div className="flex flex-col sm:flex-row gap-2" aria-hidden>', '<p className="text-body-sm leading-relaxed" aria-hidden><GhostText>{t.wallet.receiptFootnote}</GhostText></p>'];
const RECEIPT_PAGE_BANDS = ["<BackLink ", "<PageHero>", "<PageHeader", "icon={<I.receipt s={14} />}", "eyebrow={t.wallet.receiptEyebrow}",
  '<div className="flex justify-center">', '<Chip variant={playerStatusChip(status) ?? "neutral"} size="md" style={{ whiteSpace: "nowrap" }}>', '<dl className="rounded-xl glass-panel divide-y divide-border"', '<div className="flex flex-col sm:flex-row gap-2">', '<p className="text-body-sm leading-relaxed text-text-subtle">{t.wallet.receiptFootnote}</p>'];
const receiptBands = (g: string) => inOrder(squash(g), RECEIPT_GHOST_BANDS);
{
  const page = squash(code(FILES.receiptPage)), ghost = code(FILES.receipt);
  const pageMiss = inOrder(page, RECEIPT_PAGE_BANDS), ghostMiss = receiptBands(ghost);
  ok("1.1 · the ghost stands in the page's band order — the back link's box, the hero (PageHero, PageHeader with the page's tone, glyph and eyebrow), the chip band (the kit Chip, md, its 12px glyph, nowrap), the details panel, the two buttons, the footnote's own classes and words — each band once",
    pageMiss === "" && ghostMiss === "", j({ pageMiss, ghostMiss }));
  const card = receiptBands(ghost.replace("<DetailsGhost>", '<div className="rounded-card border border-border bg-bg-elevated p-5 space-y-4 kp-shimmer-track">'));
  const noFoot = receiptBands(ghost.replace('<p className="text-body-sm leading-relaxed" aria-hidden><GhostText>{t.wallet.receiptFootnote}</GhostText></p>', ""));
  ok("1.1′ PLANT · the old card back in place of the panel, or the footnote left out, is reported", card !== "" && noFoot !== "", j({ card, noFoot }));
}
{
  // The rows: the page's Row anatomy, and its labels for a completed deposit (no fee row) in the page's order.
  const pageSrc = code(FILES.receiptPage), parts = squash(code(FILES.receiptParts));
  const pageRow = /function Row\([^)]*\)[^{]*\{\s*return \(\s*<div className="([^"]+)">\s*<dt className="([^"]+)">\{label\}<\/dt>\s*<dd className="([^"]+)">/.exec(pageSrc);
  const ghostRow = /<div className="([^"]+)"> <dt className="([^"]+)"><GhostText>\{label\}<\/GhostText><\/dt> <dd className="([^"]+)">/.exec(parts);
  const rowOk = !!pageRow && !!ghostRow && geometry(pageRow[1]) === geometry(ghostRow[1]) && geometry(pageRow[2]) === geometry(ghostRow[2]) && geometry(pageRow[3]) === geometry(ghostRow[3]);
  const dl = /<dl className="(rounded-xl glass-panel divide-y divide-border)" aria-hidden>/.exec(parts)?.[1];
  ok("1.2 · a row is the page's row: `flex items-start justify-between gap-4 px-4 py-3`, a 13px label on its 18px line and the value right-aligned (16 + 18 + 16 = 50px, 51 with the panel's rule — the pitch R5-H's audit measured), in the page's panel",
    rowOk && dl === "rounded-xl glass-panel divide-y divide-border", j({ page: pageRow?.slice(1), ghost: ghostRow?.slice(1) }));
  const labels = (s: string, re: RegExp) => [...s.matchAll(re)].map((m) => m[1]);
  const pageLabels = labels(pageSrc, /<Row label=\{t\.wallet\.(\w+)\}>/g).filter((k) => k !== "receiptFee");
  const ghostLabels = labels(code(FILES.receipt), /<RowGhost label=\{t\.wallet\.(\w+)\}>/g);
  ok(`1.3 · the case drawn — a completed deposit, the receipt a player opens most — has the page's rows in the page's order: ${ghostLabels.join(", ")} (the fee row is a withdrawal's)`,
    j(pageLabels) === j(ghostLabels) && ghostLabels.length === 8, j({ pageLabels, ghostLabels }));
  // Ids wrap where a real one does: the shapes are as long as the ids the platform mints.
  const ws = raw("src/lib/server/wallet-service.ts"), pay = raw("src/lib/server/payments.ts");
  const txnBytes = Number(/const txnId = `txn_\$\{randomId\((\d+)\)\}`/.exec(ws)?.[1]), depBytes = Number(/const correlationId = opts\.correlationId \?\? `dep_\$\{randomId\((\d+)\)\}`/.exec(pay)?.[1]);
  ok(`1.4 · the id rows wrap where a real id does: the shapes are \`txn_\` + ${txnBytes} bytes in hex and \`dep_\` + ${depBytes} (the deposit's order id the gateway echoes), all zeros, in runs of four (\`keepIdRuns\`), balanced`,
    RG.TXN_ID_SHAPE === `txn_${"0".repeat(txnBytes * 2)}` && RG.DEPOSIT_REF_SHAPE === `dep_${"0".repeat(depBytes * 2)}` && parts.includes('<span className="block font-mono text-balance"><GhostText>{keepIdRuns(shape)}</GhostText></span>')
      && pageSrc.includes('<span className="block font-mono text-balance">{keepIdRuns(txn.id)}</span>'), j({ txnBytes, depBytes }));
  const html = ghostHtml("receipt", "sw");
  ok("1.4′ CONTROL · rendered, the eight rows are there, the two ids drawn in seven and six nowrap runs (11 of them all zeros, 11 break points)", count(html, '<div class="flex items-start justify-between gap-4 px-4 py-3">') === 8 && count(html, '<span class="whitespace-nowrap">0000</span>') === 11 && count(html, "<wbr/>") === 11);
}

/* ══ §2 · /wallet/deposit ══════════════════════════════════════════════════════════════════════════════════════════════ */
section("2 · /wallet/deposit — the card, the provider-first order, the 106.25px tiles, the pills and hint, the phone's hint and button, the trust strip");
const { ProviderRadioGrid } = req("../src/components/wallet/provider-radio-grid.tsx") as { ProviderRadioGrid: unknown };
const { AmountField } = req("../src/components/wallet/amount-field.tsx") as { AmountField: unknown };
const V = req("../src/lib/server/validators.ts") as { DEPOSIT_MIN_TZS: number; DEPOSIT_MAX_TZS: number; WITHDRAW_MAX_TZS: number; withdrawMinFor: (rate: number) => number };
const { DEPOSIT_QUICK_AMOUNTS } = req("../src/lib/journey/shortfall.ts") as { DEPOSIT_QUICK_AMOUNTS: readonly number[] };
const U = req("../src/lib/utils.ts") as { formatNumber: (n: number) => string; fill: (s: string, v: Record<string, string>) => string; pctNum: (rate: number) => number };
const formOrder = (s: string) => inOrder(squash(s.slice(s.indexOf("export function DepositFormGhost"), s.indexOf("function NoticeGhost"))), ['export function DepositFormGhost', '<div className="rounded-xl glass-panel p-5 lg:p-6 kp-shimmer-track" aria-hidden>', '<div className="space-y-5">',
  "<LegendGhost>{t.wallet.choosePaymentMethod}</LegendGhost>", "<ProviderGridGhost names={depositRails(t)} />", "<AmountFieldGhost label={t.common.depositAmountLabel}",
  "<LegendGhost>{t.wallet.mobileMoneyNumber}</LegendGhost>", "{t.wallet.mobileMoneyNumberHint}", "{t.wallet.useAnotherNumber}", "<CommitGhost />",
  '<div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated/60 px-4 py-3" aria-hidden>', "{t.wallet.securedDepositBody}", "export function WithdrawBalanceGhost"]);
{
  const page = squash(code(FILES.depositPage));
  const pageOrder = inOrder(page, ['<form action={depositAction} className="group/deposit rounded-xl glass-panel p-5 lg:p-6">', '<div className="space-y-5">', "{t.wallet.choosePaymentMethod}", "<ProviderRadioGrid",
    "<DepositAmount", "{t.wallet.mobileMoneyNumber}", "{t.wallet.mobileMoneyNumberHint}", "<DepositNumberChoice", "<CardBillingFields", "<DepositConfirm journey={journey} />", /* R5-G: the confirm takes the journey answer (merged 2026-10-09) */
    '<div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated/60 px-4 py-3">', "{t.wallet.securedDepositBody}"]);
  const ghostOrder = formOrder(code(FILES.moneyForm));
  const drawn = squash(code(FILES.deposit)).includes("<DepositFormGhost t={t} />") && squash(code(FILES.deposit)).includes('import { DepositFormGhost } from "@/app/wallet/money-form-ghost";');
  ok("2.1 · the deposit ghost draws the page's form card (`rounded-xl glass-panel p-5 lg:p-6`, its rhythm on an inner `space-y-5`) in the page's order — the providers first, then the amount, the handset with its hint and button, the confirm — and the trust strip after it",
    pageOrder === "" && ghostOrder === "" && drawn, j({ pageOrder, ghostOrder, drawn }));
  const amountFirst = formOrder(code(FILES.moneyForm).replace(/(<div>\s*<LegendGhost>\{t\.wallet\.choosePaymentMethod\}<\/LegendGhost>\s*<ProviderGridGhost names=\{depositRails\(t\)\} \/>\s*<\/div>)\s*(<AmountFieldGhost[^\n]*\n)/, "$2$1\n"));
  const noStrip = formOrder(code(FILES.moneyForm).replace('<div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated/60 px-4 py-3" aria-hidden>', '<div className="flex" aria-hidden>'));
  ok("2.1′ PLANT · the amount drawn before the providers again (the old ghost's order), or the trust strip off its own classes, is reported", amountFirst !== "" && noStrip !== "", j({ amountFirst, noStrip }));
}
{
  // The tiles: ProviderRadioGrid rendered, against its ghost rendered — the grid, each tile's geometry, the logo slot, the name.
  const pageProviders = [...raw(FILES.depositPage).matchAll(/\{ id: "([A-Z_]+)",\s*name: "([^"]+)",\s*hue: (\d+) \}/g)].map((m) => ({ id: m[1], name: m[2], hue: Number(m[3]) }));
  const wrong: string[] = [];
  for (const l of LOCALES) {
    const t = dict[l];
    const providers = pageProviders.map((p) => (p.id === "CARD" ? { ...p, name: t.wallet.methodCard } : p));
    const page = inApp("/wallet/deposit", l, h(ProviderRadioGrid as never, { providers, unavailableLabel: "x" } as never));
    const ghost = inApp("/wallet/deposit", l, h(MF.ProviderGridGhost as never, { names: MF.depositRails(t) } as never));
    const grid = (s: string) => /^<div class="([^"]+)">/.exec(s)?.[1];
    const tiles = (s: string, tag: string) => [...s.matchAll(new RegExp(`<${tag} class="([^"]+)" style="background:var\\(--bg-inset\\)">`, "g"))].map((m) => geometry(m[1]));
    const names = (s: string) => [...s.matchAll(/<span class="(font-medium text-body-sm[^"]*leading-tight)">(?:<span[^>]*>)?([^<]+)/g)].map((m) => `${geometry(m[1])}: ${unesc(m[2])}`);
    if (grid(page) !== grid(ghost)) wrong.push(`${l} grid ${grid(page)} ≠ ${grid(ghost)}`);
    const pt = tiles(page, "label"), gt = tiles(ghost, "div");
    if (pt.length !== 5 || gt.length !== 5 || pt.some((c, i) => c !== gt[i])) wrong.push(`${l} tiles ${pt[0]} ≠ ${gt[0]}`);
    if (j(names(page)) !== j(names(ghost))) wrong.push(`${l} names ${j(names(page))} ≠ ${j(names(ghost))}`);
    if (!/width:48px;height:48px;border-radius:var\(--r-md\)/.test(page) || count(ghost, 'class="inline-flex h-[48px] w-[48px] shrink-0 border border-border bg-bg-overlay" style="border-radius:var(--r-md)"') !== 5) wrong.push(`${l} logo slot`);
  }
  // The tile's height from its classes on this scale: 1 + 14 + 48 + 12 + 13 × 1.25 + 14 + 1.
  const tile = 1 + 14 + 48 + 12 + 13 * 1.25 + 14 + 1;
  ok(`2.2 · the tiles are the page's: ProviderRadioGrid and its ghost RENDERED in sw, en and zh — the same grid class (a short last row shares the row), the same tile geometry (\`py-3.5\` ≡ \`py-[14px]\`), the 48px logo slot, the provider names in the page's order — ${tile}px a tile, where the ghost drew 86`,
    wrong.length === 0 && pageProviders.length === 5 && tile === 106.25, wrong.slice(0, 3).join(" | "));
  const old = '<div key={i} className="h-[86px] rounded-md border border-border kp-shimmer-track" style={{ background: "var(--bg-inset)" }} />';
  ok("2.2′ CONTROL · the old ghost's fixed 86px box is gone from the deposit drawing and from the money forms' ghost", !raw(FILES.deposit).includes("h-[86px]") && !raw(FILES.moneyForm).includes("h-[86px]") && old.includes("h-[86px]"));
}
{
  // The amount field: AmountField rendered with the page's own props, against its ghost — label, box, pills, hint.
  const wrong: string[] = [];
  for (const l of LOCALES) {
    const t = dict[l];
    const hint = U.fill(t.common.depositAmountHint, { min: U.formatNumber(V.DEPOSIT_MIN_TZS), max: U.formatNumber(V.DEPOSIT_MAX_TZS) });
    const page = inApp("/wallet/deposit", l, h(AmountField as never, { label: t.common.depositAmountLabel, hint, quickAmounts: [...DEPOSIT_QUICK_AMOUNTS], max: V.DEPOSIT_MAX_TZS, min: V.DEPOSIT_MIN_TZS } as never));
    const ghost = inApp("/wallet/deposit", l, h(MF.AmountFieldGhost as never, { label: t.common.depositAmountLabel, hint: U.fill(t.common.depositAmountHint, MF.LIMIT_SHAPES), pills: MF.QUICK_PILLS } as never));
    const label = (s: string) => /<(?:label|p) class="([^"]+)"/.exec(s)?.[1];
    const box = (s: string) => /h-\[48px\]/.test(s);
    const pills = (s: string) => /<div class="(mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1\.5)">/.exec(s)?.[1] ?? "";
    const pillCount = (s: string) => (s.match(/min-h-\[44px\] inline-flex|<div class="h-\[44px\] rounded-pill bg-bg-overlay"><\/div>/g) ?? []).length;
    const hintCls = (s: string) => geometry(/<p class="(mt-2 text-body-sm[^"]*)">/.exec(s)?.[1] ?? "");
    const hintText = (s: string) => unesc((/<p class="mt-2 text-body-sm[^"]*">([\s\S]*?)<\/p>/.exec(s)?.[1] ?? "").replace(/<[^>]+>/g, ""));
    if (geometry(label(page) ?? "") !== geometry(label(ghost) ?? "")) wrong.push(`${l} label`);
    if (!box(page) || !box(ghost)) wrong.push(`${l} box`);
    if (pills(page) === "" || pills(page) !== pills(ghost) || pillCount(page) !== pillCount(ghost) || pillCount(ghost) !== 6) wrong.push(`${l} pills ${pillCount(page)}/${pillCount(ghost)}`);
    if (hintCls(page) !== hintCls(ghost) || ghostShape(hintText(page)) !== ghostShape(hintText(ghost)) || hintText(page) === hintText(ghost)) wrong.push(`${l} hint ${j(hintText(ghost)).slice(0, 60)}`);
  }
  ok(`2.3 · the amount field is the page's: AmountField and its ghost RENDERED with the page's props in every language — the label's classes, the 48px box, ${DEPOSIT_QUICK_AMOUNTS.length} quick-amount pills in the page's grid (two rows on a phone), and the hint in its classes, word for word with its limits as shapes (so it wraps in the same 3–8 lines)`,
    wrong.length === 0 && MF.QUICK_PILLS === DEPOSIT_QUICK_AMOUNTS.length && MF.LIMIT_SHAPES.min === ghostShape(U.formatNumber(V.DEPOSIT_MIN_TZS)) && MF.LIMIT_SHAPES.max === ghostShape(U.formatNumber(V.DEPOSIT_MAX_TZS))
      && MF.LIMIT_SHAPES.max === ghostShape(U.formatNumber(V.WITHDRAW_MAX_TZS)), wrong.join(" | "));
  ok("2.3′ CONTROL · the ghost's limits are shapes: its hint differs from the page's in its digits alone (\"0,000\" where the page prints \"1,000\")", ghostShape("TZS 1,000") === "TZS 0,000" && U.fill("{min}", MF.LIMIT_SHAPES) === "0,000");
}
{
  // The handset block and the strip, from the page's source: label, the 44px box, the hint's classes, the 12 + 40 button.
  const page = squash(code(FILES.depositPage)), ghost = squash(code(FILES.moneyForm));
  const hint = page.includes('<p className="mt-1.5 text-body-sm text-text-subtle text-balance">{t.wallet.mobileMoneyNumberHint}</p>') && ghost.includes('<p className="mt-1.5 text-body-sm text-balance"><GhostText>{t.wallet.mobileMoneyNumberHint}</GhostText></p>');
  const button = raw("src/components/wallet/deposit-number-choice.tsx").includes('size="sm"') && raw("src/components/wallet/deposit-number-choice.tsx").includes('className="mt-2"')
    && ghost.includes('<div className="mt-2 flex h-[var(--h-control-sm)] w-fit items-center rounded-control border border-transparent bg-bg-overlay px-2">');
  const box = page.includes('<PhoneInput id="msisdn"') && ghost.includes('<div className="h-[var(--h-input)] w-full rounded-lg border border-border bg-bg-inset" />');
  const strip = /<span className="h-\[40px\] w-\[40px\] shrink-0 border border-dashed border-border" style=\{\{ borderRadius: "var\(--r-md\)" \}\} \/> <p className="text-body-sm leading-relaxed"><GhostText>\{t\.wallet\.securedDepositBody\}<\/GhostText><\/p>/.test(ghost)
    && page.includes('<p className="text-body-sm text-text-subtle leading-relaxed"> {t.wallet.securedDepositBody} </p>');
  ok("2.4 · the handset block is the page's — its label, `PhoneInput`'s 44px box, its hint in the hint's classes and words, and \"use another number\" (`btn-sm`, 12px over it: 12 + 40); the trust strip its 40px placeholder and its sentence",
    hint && button && box && strip, j({ hint, button, box, strip }));
  const noHint = squash(code(FILES.moneyForm).replace('<p className="mt-1.5 text-body-sm text-balance"><GhostText>{t.wallet.mobileMoneyNumberHint}</GhostText></p>', ""));
  ok("2.4′ PLANT · the phone hint left out (the old ghost had none) is reported", !noHint.includes("{t.wallet.mobileMoneyNumberHint}"));
}
{
  // One drawing, two readers: the journey's root ghost draws this same DepositGhost.
  const route = squash(code("src/components/journey/route-ghost.tsx"));
  ok("2.5 · the journey's root loading state draws the same drawing on a move to /wallet/deposit (and the provider's return's), so both readers' ghosts are this one",
    // (R5-G, merging beside this work, hands the drawing the journey answer — `<DepositGhost journey />` — so props are open.)
    /"\/wallet\/deposit": <DepositGhost[ a-z={}]*\/>/.test(route) && route.includes('"/wallet/deposit/return": <DepositReturnLoading />') && /return <DepositGhost[ a-z={}]*\/>;/.test(squash(code(FILES.depositLoading))));
}

/* ══ §3 · /wallet/deposit/return ═══════════════════════════════════════════════════════════════════════════════════════ */
section("3 · /wallet/deposit/return — a hero, not a card; six rows; two buttons; the footnote; and nothing of the outcome shown");
{
  const page = squash(code(FILES.retPage)), ghost = squash(code(FILES.ret));
  const pageOrder = inOrder(page, ['<PageContainer tier="receipt" className="pb-28 lg:pb-6 space-y-5">', "<PageHero>", "<PageHeader", '<dl className="rounded-xl glass-panel divide-y divide-border"', '<div className="flex flex-col sm:flex-row gap-2">', '<p className="text-body-sm leading-relaxed text-text-subtle">{t.wallet.returnFootnote}</p>']);
  const ghostOrder = inOrder(ghost, ['<PageContainer tier="receipt" className="space-y-5 pb-28 lg:pb-6">', "<PageHero>", "<PageHeader", "<DetailsGhost>", '<div className="flex flex-col sm:flex-row gap-2" aria-hidden>', '<p className="text-body-sm leading-relaxed" aria-hidden><GhostText>{t.wallet.returnFootnote}</GhostText></p>']);
  const noCard = !ghost.includes("rounded-card") && !ghost.includes("h-[var(--h-control-md)]");
  ok("3.1 · the return ghost is the page's bands: the hero (PageHero and PageHeader), the details panel, the two `btn-lg` buttons on the page's own gap (`gap-2`, 12px — round 6 moved the pair off the stock 10px `gap-2.5`; merged 2026-10-09), the footnote — not the old centred card, its card of rows and its one 44px control",
    pageOrder === "" && ghostOrder === "" && noCard && !ghost.includes("gap-[10px]"), j({ pageOrder, ghostOrder, noCard }));
  const cardBack = inOrder(squash(code(FILES.ret).replace("<PageHero>", '<div className="rounded-card border border-border bg-bg-elevated p-6 space-y-4 kp-shimmer-track">')), ['<PageContainer tier="receipt" className="space-y-5 pb-28 lg:pb-6">', "<PageHero>"]);
  ok("3.1′ PLANT · the centred card back in place of the hero is reported", cardBack !== "");
  const pageLabels = [...code(FILES.retPage).matchAll(/<Row label=\{t\.wallet\.(\w+)\}>/g)].map((m) => m[1]);
  const ghostLabels = [...code(FILES.ret).matchAll(/<RowGhost label=\{t\.wallet\.(\w+)\}>/g)].map((m) => m[1]);
  ok(`3.2 · the six rows of a card deposit that landed, in the page's order (${ghostLabels.join(", ")}), each the receipt's own row`, j(pageLabels) === j(ghostLabels) && ghostLabels.length === 6, j({ pageLabels, ghostLabels }));
  // Nothing of the outcome is SHOWN: every line of the head is set and not shown (the eyebrow too — R5-G names the deposit
  // for a journey reader, which this drawing is not told), and the glyph is an empty box.
  const retSrc = code(FILES.ret), head = retSrc.slice(retSrc.indexOf("<PageHeader"), retSrc.indexOf("</PageHero>"));
  const hidden = ["eyebrow={<GhostText>{t.common.deposit}</GhostText>}", "title={<GhostText>{t.wallet.returnPaidTitle}</GhostText>}", "subtitle={<GhostText>{t.wallet.returnPaidBody}</GhostText>}"].every((x) => squash(head).includes(x))
    && /icon=\{<span className="inline-block h-\[14px\] w-\[14px\] shrink-0" \/>\}/.test(head);
  const html = ghostHtml("ret", "sw");
  const shown = html.replace(new RegExp(`<span aria-hidden="true" class="${GHOST_TEXT_CLASS}[^"]*">[\\s\\S]*?</span>`, "g"), "");
  const leak = [dict.sw.wallet.returnPaidTitle, dict.sw.wallet.returnPaidBody, dict.sw.common.deposit].filter((w) => shown.includes(w));
  ok("3.3 · RULES law 5 — the head says nothing: its eyebrow, heading and line are set and not shown (in the words of the outcome a player comes back to most, so it wraps as that head does), the glyph an empty box; rendered, no word of it is visible",
    hidden && leak.length === 0 && html.includes(dict.sw.wallet.returnPaidTitle), leak.join(" | "));
  const shownPlant = squash(code(FILES.ret).replace("title={<GhostText>{t.wallet.returnPaidTitle}</GhostText>}", "title={t.wallet.returnPaidTitle}"));
  ok("3.3′ PLANT · the heading set as plain text (an outcome shown) is reported", !shownPlant.includes("title={<GhostText>{t.wallet.returnPaidTitle}</GhostText>}"));
}

/* ══ §4 · /wallet/withdraw ═════════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · /wallet/withdraw — the hero's own content class and the balance block's box; the form, not a spinner panel");
{
  const page = code(FILES.withdrawPage), ghost = code(FILES.withdraw);
  const heroCls = (s: string) => /<PageHero contentClassName="([^"]+)">/.exec(s)?.[1] ?? "";
  // A JSX comment decomments to `{ }`: R6-C's note on the page's label (C11) and the ghost's beside its class sit between
  // the block and its label (merged 2026-10-09).
  const bare = (s: string) => squash(s).replace(/\{ \} /g, "");
  const balance = bare(code(FILES.moneyForm)).includes('<div className="sm:text-right shrink-0" aria-hidden> <p className="font-mono text-micro uppercase eyebrow kp-track-end"><GhostText>{t.wallet.available}</GhostText></p> <div className="h-[22px] w-[132px] rounded-sm bg-bg-overlay sm:ml-auto" /> </div>')
    && bare(page).includes('<div className="sm:text-right shrink-0"> <p className="font-mono text-micro uppercase eyebrow text-text-subtle kp-track-end">')
    && squash(page).includes('<Cash className="amount font-bold text-[22px] text-text leading-none block">');
  const drawn = /\/>\s*<WithdrawBalanceGhost t=\{t\} \/>\s*<\/PageHero>/.test(ghost) && ghost.includes("<WithdrawFormGhost t={t} />") && !ghost.includes("BrandSpinner");
  ok(`4.1 · the hero takes the page's own content class (\`${heroCls(page).slice(0, 60)}…\`: the balance stacks under the head on a phone, 12 + 14 + 22 = 48px) and draws the balance block's box — its label set and not shown, a bar on its figure's 22px line, never a number — and the form stands where the spinner panel stood`,
    heroCls(page) !== "" && heroCls(page) === heroCls(ghost) && balance && drawn, j({ page: heroCls(page), ghost: heroCls(ghost), balance, drawn }));
  ok("4.1′ PLANT · the ghost's old hero class (a row at every width, which dropped the stacked block) is reported", heroCls(ghost.replace(heroCls(ghost), "relative z-10 p-5 lg:p-6 flex items-end justify-between gap-4")) !== heroCls(page));
}
{
  const page = squash(code(FILES.withdrawPage)), ghost = squash(code(FILES.moneyForm));
  const pageOrder = inOrder(page, ['className={`rounded-xl glass-panel p-5 lg:p-6 ${canSubmit ? "" : "opacity-60"}`}', '<div className="space-y-5">', "{t.wallet.destination}", "<ProviderRadioGrid providers={PROVIDERS}", "<AmountField",
    '<div className="rounded-xl border border-border bg-bg-inset/60 px-3.5 py-3">', '<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">', '<p className="mt-1.5 font-mono text-body-lg tabular-nums text-text">',
    '<p className="mt-1.5 text-body-sm leading-snug text-text-muted">{t.wallet.destinationLockedBody}</p>', '<div className="rounded-xl border border-border bg-bg-elevated/50 divide-y divide-border/60">', "<WithdrawConfirm"]);
  const ghostOrder = inOrder(ghost.slice(ghost.indexOf("export function WithdrawFormGhost")), ['<div className="rounded-xl glass-panel p-5 lg:p-6 kp-shimmer-track" aria-hidden>', '<div className="space-y-5">', "<LegendGhost>{t.wallet.destination}</LegendGhost>", "<ProviderGridGhost names={WITHDRAW_RAILS} />", "<AmountFieldGhost label={t.wallet.amount}",
    '<div className="rounded-xl border border-border bg-bg-inset/60 px-[14px] py-3">', '<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">', '<p className="mt-1.5 font-mono text-body-lg tabular-nums">',
    '<p className="mt-1.5 text-body-sm leading-snug"><GhostText>{t.wallet.destinationLockedBody}</GhostText></p>', '<div className="rounded-xl border border-border bg-bg-elevated/50 divide-y divide-border/60">', "<CommitGhost />"]);
  const rails = [...raw(FILES.withdrawPage).matchAll(/\{ id: "([A-Z_]+)",\s*name: "([^"]+)",\s*hue: \d+ \}/g)].map((m) => m[2]);
  const notice = /function NoticeRow[\s\S]*?<div className="([^"]+)">\s*<span className="([^"]+)">\{icon\}<\/span>\s*<div>\s*<p className="([^"]+)">\{title\}<\/p>\s*<p className="([^"]+)">\{body\}<\/p>/.exec(code(FILES.withdrawPage));
  const noticeGhost = /function NoticeGhost[\s\S]*?<div className="([^"]+)">\s*<span className="([^"]+)" \/>\s*<div>\s*<p className="([^"]+)"><GhostText>\{title\}<\/GhostText><\/p>\s*<p className="([^"]+)"><GhostText>\{body\}<\/GhostText><\/p>/.exec(code(FILES.moneyForm));
  const noticeOk = !!notice && !!noticeGhost && geometry(notice[1]) === geometry(noticeGhost[1]) && geometry(notice[3]) === geometry(noticeGhost[3]) && geometry(notice[4]) === geometry(noticeGhost[4]) && noticeGhost[2].includes("h-[15px]");
  ok(`4.2 · the form is the page's, part for part: the card, the destination's four rails (${rails.join(", ")} — four across from md), the amount field, the stated destination (its key and \`sm\` chip, the number's 24px line, the rule), the two notices (each the page's NoticeRow), the confirm`,
    pageOrder === "" && ghostOrder === "" && j(rails) === j([...MF.WITHDRAW_RAILS]) && noticeOk, j({ pageOrder, ghostOrder, rails, noticeOk }));
  ok("4.2′ CONTROL · the spinner panel the ghost drew (138px: 40 + 56 + 40 + 2) is not in it", !code(FILES.withdraw).includes("py-10") && 40 + 56 + 40 + 2 === 138);
}
{
  // The form's figures are the page's as shapes: the tax notice's rate (the page prints `pctNum(rate)`, "1.5" at the default
  // and live 1.5%) and the hint's limits (from the fee's floor to the cap). Measured from the fonts (S/r5k/m-figures.mts),
  // each shape wraps as the page's figure does at every width and in every language.
  const P = req("../src/lib/payout.ts") as { DEFAULT_WITHDRAWAL_FEE_RATE: number };
  const rate = P.DEFAULT_WITHDRAWAL_FEE_RATE, pct = String(U.pctNum(rate)), min = V.withdrawMinFor(rate);
  const pageTax = squash(code(FILES.withdrawPage)).includes("title={t.wallet.taxNotice} body={fill(t.wallet.taxBody, { pct: pctNum(wcfg.withdrawalFeeRate) })} />");
  const ghostTax = squash(code(FILES.moneyForm)).includes("<NoticeGhost title={t.wallet.taxNotice} body={fill(t.wallet.taxBody, { pct: FEE_PCT_SHAPE })} />");
  const pageHint = squash(code(FILES.withdrawPage)).includes("hint={fill(t.wallet.amountHint, { min: formatNumber(withdrawMin), max: formatNumber(WITHDRAW_MAX_TZS) })}");
  const ghostHint = squash(code(FILES.moneyForm)).includes("<AmountFieldGhost label={t.wallet.amount} hint={fill(t.wallet.amountHint, LIMIT_SHAPES)} pills={QUICK_PILLS} />");
  ok(`4.3 · the form's figures are the page's as shapes: the fee's rate ${pct}% as "${MF.FEE_PCT_SHAPE}", the limits ${U.formatNumber(min)} – ${U.formatNumber(V.WITHDRAW_MAX_TZS)} as "${MF.LIMIT_SHAPES.min}" – "${MF.LIMIT_SHAPES.max}" — each in the sentence the page fills`,
    pageTax && ghostTax && pageHint && ghostHint && MF.FEE_PCT_SHAPE === ghostShape(pct) && MF.LIMIT_SHAPES.min === ghostShape(U.formatNumber(min)) && MF.LIMIT_SHAPES.max === ghostShape(U.formatNumber(V.WITHDRAW_MAX_TZS)),
    j({ pageTax, ghostTax, pageHint, ghostHint, pct, shape: MF.FEE_PCT_SHAPE, min }));
  ok("4.3′ CONTROL · a one-digit stand-in (\"0\", the ghost's first draft) is not the rate's shape: two glyphs narrower than the page's \"1.5\"", ghostShape(pct) !== "0" && pct === "1.5");
}

/* ══ §5 · /profile ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · /profile — the hero column and strip, the achievements, the twelve rows, the sign-out");
{
  const page = squash(code(FILES.profilePage)), ghost = squash(code(FILES.profile)), faces = req(`../${FILES.faces}`) as Record<string, string>;
  const avatar = Number(/"2xl": (\d+)/.exec(raw("src/components/ui/avatar.tsx"))?.[1]);
  const pageCol = inOrder(page, ['<section className="relative overflow-hidden overflow-clip rounded-xl border border-border bg-bg-elevated">', '<div className="relative z-10 p-5 lg:p-6 flex items-start gap-4 lg:gap-5">', 'size="2xl"', '<div className="flex-1 min-w-0 pt-1">',
    '<p className="font-mono text-caption uppercase eyebrow font-bold text-text-subtle"> {t.profile.predictor}', "<ProfileNameEditor", "<p className={PROFILE_PHONE_LINE}>", '<div className="mt-3 flex flex-wrap items-center gap-1.5">', '<div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 border-t border-border">']);
  const ghostCol = inOrder(ghost, ['<section className="relative overflow-hidden overflow-clip rounded-xl border border-border bg-bg-elevated kp-shimmer-track">', '<div className="relative z-10 p-5 lg:p-6 flex items-start gap-4 lg:gap-5" aria-hidden>', `<div className="h-[${avatar}px] w-[${avatar}px] shrink-0 rounded-full bg-bg-overlay/20" />`, '<div className="flex-1 min-w-0 pt-1">',
    '<p className="font-mono text-caption uppercase eyebrow font-bold"><GhostText>{t.profile.predictor}</GhostText></p>', "${PROFILE_NAME_FACE}", "<p className={PROFILE_PHONE_LINE}>", '<div className="mt-3 flex flex-wrap items-center gap-1.5">', '<div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 border-t border-border" aria-hidden>']);
  const editor = squash(code(FILES.editor));
  // Round 7 (R7-C, 2026-10-10) moved this pin: the name, a display heading, asks the one stem question first
  // (`data-stem={stemOf(…)}`; test:visual-pass-r7c §3) — its face is the one string, as before.
  const faceOne = /<span data-stem=\{stemOf\([^}]*\)\} className=\{`min-w-0 \$\{PROFILE_NAME_FACE\} text-text text-balance \[overflow-wrap:anywhere\]`\}>/.test(editor) && editor.includes("className={`${PROFILE_NAME_FACE} text-text bg-transparent")
    && faces.PROFILE_NAME_FACE === "font-display text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em]" && ghost.includes('<span className="mt-1.5 inline-flex min-h-[40px] max-w-full items-center gap-2">')
    && editor.includes('className="mt-1.5 inline-flex min-h-[40px] max-w-full items-center gap-2 group text-left"');
  ok(`5.1 · the hero column is the page's: the ${avatar}px avatar (the ghost drew 64), the eyebrow, the name's 40px button in the name's own face (\`profile-faces.ts\`, read by the editor and the ghost — 24px on a 30px line, 28 from md), the number line (\`PROFILE_PHONE_LINE\`), the pills' row`,
    avatar === 80 && pageCol === "" && ghostCol === "" && faceOne, j({ pageCol, ghostCol, faceOne }));
  // The pills: a player's role, the identity pill and the email pill as links (a 44px tap target held OUT of layout —
  // 11px of padding cancelled by an equal negative margin, 2026-10-10: `min-h` made their rows taller than the others'),
  // the language.
  const pills = ghost.slice(ghost.indexOf('<div className="mt-3 flex flex-wrap items-center gap-1.5">'), ghost.indexOf('<div className="relative z-10 grid'));
  const links = count(pills, '<span className="inline-flex items-center py-[11px] -my-[11px]"><ChipGhost glyph={10}>'), chips = count(pills, "<ChipGhost");
  const pageLinks = count(page, 'className="no-underline inline-flex items-center py-[11px] -my-[11px]"');
  const lang = ghost.includes('const LANGUAGE_NAME = { en: "English", sw: "Kiswahili", zh: "中文" } as const;') && page.includes('const LANGUAGE_NAME = { en: "English", sw: "Kiswahili", zh: "中文" } as const;');
  ok(`5.2 · the pills are the page's for the case drawn — ${chips} kit Chips (md), the identity and email pills in the page's own tap-target links (${links} of the page's ${pageLinks}: 44px to the finger, the pill's height to the line), the language in its own name`,
    chips === 4 && links === 2 && pageLinks === 2 && lang, j({ chips, links, pageLinks, lang }));
  // The strip: three kit Stats in the page's props, label and value set and not shown.
  const stats = (s: string) => jsxTags(s, "Stat").map((p) => [p.size, p.labelStyle, p.boxed, p.font, p.className, p.labelClassName].join("|"));
  const pageStats = stats(code(FILES.profilePage)), ghostStats = stats(code(FILES.profile));
  ok("5.3 · the strip is the kit Stat three times in the page's props — xl, widest, pad, mono, the page's own cell classes (the balance a row of its own on a phone: two rows, 140px, where the ghost drew one of 72)",
    pageStats.length === 3 && j(pageStats) === j(ghostStats), j({ pageStats, ghostStats }));
  ok("5.3′ PLANT · a cell off the page's classes (the balance spanning one column on a phone) is reported", j(stats(code(FILES.profile).replace("col-span-2 min-w-0 whitespace-nowrap", "min-w-0 whitespace-nowrap"))) !== j(pageStats));
}
{
  const page = squash(code(FILES.profilePage)), ghost = squash(code(FILES.profile));
  // The achievements: the section, the shelf's own grid, the six names in the shelf's order, the hint.
  const shelfStyle = /gridTemplateColumns: "(repeat\(auto-fit, minmax\(96px, 1fr\)\))"/.exec(raw("src/components/badges/Badge.tsx"))?.[1];
  const titles = [...raw("src/lib/server/achievements.ts").matchAll(/title: "([^"]+ · [^"]+)"/g)].map((m) => m[1]);
  const html = ghostHtml("profile", "sw");
  const figures = [...html.matchAll(/<figure class="flex flex-col items-center gap-2 text-center"><span class="inline-grid h-\[64px\] w-\[64px\] rounded-full bg-bg-overlay"><\/span><figcaption class="w-full text-body-sm leading-tight">([\s\S]*?)<\/figcaption><\/figure>/g)]
    .map((m) => unesc(m[1].replace(/<span class="kp-seq__dot"[^>]*>·<\/span>/g, "·").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()));
  const want = titles;
  const badgeMd = /\.badge-md \{ width: 64px; height: 64px; \}/.test(raw("src/app/globals.css"));
  const section5 = page.includes('<section> <h2 className="mb-3 flex items-center gap-1.5 font-mono text-micro uppercase eyebrow font-bold text-text-subtle"> <I.trophy s={13} /> {t.profile.achievements} </h2> <div className="rounded-xl glass-panel p-5"> <BadgeShelf items={badges} /> <p className="mt-4 text-center text-body-sm text-text-subtle"> {t.profile.badgesHint} </p>')
    && ghost.includes('<div className="rounded-xl glass-panel p-5 kp-shimmer-track"> <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" }}>') && ghost.includes('<p className="mt-4 text-center text-body-sm"><GhostText>{t.profile.badgesHint}</GhostText></p>');
  ok(`5.4 · the achievements the ghost never drew: the section's key, the panel, the shelf's own grid (${shelfStyle}, 24px apart), a 64px coin (\`.badge-md\`) over each of the shelf's six names in its order — set and not shown, stacked in two parts with their last words kept (\`DotSeq stack\`, \`keepLastWords\`) — and the hint`,
    shelfStyle === "repeat(auto-fit, minmax(96px, 1fr))" && titles.length === 6 && j(figures) === j(want) && badgeMd && section5, j({ figures, want, section5 }));
  // The rows: the page's SettingRow keys for the case drawn, in its order.
  // R6-C (C1, merged 2026-10-09): a player's invite row asks `invite-name.ts` for its name and line; the drawing is a
  // player's while invites pay nothing (today), so the call reads as those two keys.
  const INVITE_ROW = "title={inviteName(t, { agent: false, paid: invitePayable })} subtitle={inviteLine(t, { agent: false, paid: invitePayable })}";
  const pageRows = [...code(FILES.profilePage).replace(INVITE_ROW, "title={t.profile.inviteFriends} subtitle={t.profile.inviteFriendsSub}").matchAll(/<SettingRow icon=\{I\.\w+\}\s+title=\{t\.(\w+\.\w+)\}\s+subtitle=\{t\.(\w+\.\w+)\}/g)].map((m) => `${m[1]}|${m[2]}`).filter((r) => !r.startsWith("agent."));
  const ghostRows = [...code(FILES.profile).matchAll(/\[t\.(\w+\.\w+), t\.(\w+\.\w+)\]/g)].map((m) => `${m[1]}|${m[2]}`);
  const rowOk = code(FILES.profilePage).includes("className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-bg-elevated p-3.5 transition-colors")
    && norm("relative flex items-center gap-3 overflow-hidden rounded-xl border p-3.5") === norm("relative flex items-center gap-3 overflow-hidden rounded-xl border p-[14px]")
    && ghost.includes('<div key={title} className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-bg-elevated p-[14px] kp-shimmer-track">')
    && ghost.includes("<p className={PROFILE_ROW_TITLE}><GhostText>{title}</GhostText></p>") && page.includes("<p className={PROFILE_ROW_TITLE}>")
    && ghost.includes('<p className="mt-0.5 text-body-sm leading-snug"><GhostText>{sub}</GhostText></p>') && page.includes('<p className="mt-0.5 text-body-sm text-text-subtle leading-snug [&:lang(zh)]:break-keep [&:lang(zh)]:[overflow-wrap:anywhere]"><DotSeq text={subtitle} renderPart={keepLastWords} /></p>');
  ok(`5.5 · twelve rows, as the page shows a player (the invite row, the identity row, the rest — the ghost drew six), each the page's row: \`p-3.5\` ≡ \`p-[14px]\`, the 40px plate, the title in the row's own face (\`PROFILE_ROW_TITLE\`), the line in the line's classes`,
    pageRows.length === 12 && j(pageRows) === j(ghostRows) && rowOk && code(FILES.profilePage).includes(INVITE_ROW)
      && raw("src/lib/journey/invite-name.ts").includes("return r.agent ? t.agent.dashTitle : r.paid ? t.profile.inviteEarn : t.profile.inviteFriends;")
      && raw("src/lib/journey/invite-name.ts").includes("return r.agent ? t.agent.dashSubtitle : r.paid ? t.profile.inviteEarnSub : t.profile.inviteFriendsSub;"),
    j({ pageRows: pageRows.length, ghostRows: ghostRows.length, rowOk }));
  ok("5.5′ CONTROL · R5-H's 5.6 holds the grid's 16px gap; the twelve rows at one or two columns are 12 × 70 + 11 × 16 = 1,016px on a phone, 6 × 70 + 5 × 16 = 500 from md (the ghost drew 500 and 242)",
    ghost.includes('<div className="grid grid-cols-1 gap-3 md:grid-cols-2">') && 12 * 70 + 11 * 16 === 1016 && 6 * 70 + 5 * 16 === 500);
  const signOut = page.includes('<button type="submit" className="group inline-flex w-full items-center justify-between gap-3 rounded-xl glass-panel px-4 py-3.5 hover:border-danger-border transition-colors" >')
    && ghost.includes('<div className="inline-flex w-full items-center justify-between gap-3 rounded-xl glass-panel px-4 py-[14px] kp-shimmer-track">') && ghost.includes("<p className={PROFILE_SIGN_OUT_TITLE}><GhostText>{t.common.signOut}</GhostText></p>") && page.includes("<p className={PROFILE_SIGN_OUT_TITLE}>{t.common.signOut}</p>");
  ok("5.6 · the sign-out row the ghost never drew: the form's one inline-flex button, its 36px plate, its title in its own face and its line", signOut);
  const order = inOrder(ghost, ['<section className="relative overflow-hidden', "{t.profile.achievements}", "{t.profile.account}", "{t.common.signOut}"]);
  ok("5.6′ PLANT · the achievements drawn after the settings (out of the page's order) is reported",
    order === "" && inOrder(squash(decomment(raw(FILES.profile).replace(/(\{\/\* The achievements:[\s\S]*?<\/section>)\s*(\{\/\* Settings grid skeleton \*\/\}[\s\S]*?<\/section>)/, "$2\n$1"))), ['<section className="relative overflow-hidden', "{t.profile.achievements}", "{t.profile.account}"]) !== "");
}

/* ══ §6 · /positions (classic) ═════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · /positions (classic) — the head's button, the strip's auto-fit grid, the 14px exposure keys, the bar's row 2");
const { PnlSummaryStrip, PNL_STRIP } = req(`../${FILES.strip}`) as { PnlSummaryStrip: unknown; PNL_STRIP: Record<string, string> };
const { PositionsBar } = req("../src/app/positions/positions-bar.tsx") as { PositionsBar: unknown };
const { parsePortfolioParams } = req("../src/lib/positions/portfolio.ts") as { parsePortfolioParams: (sp: Record<string, string>) => unknown };
{
  const page = squash(code(FILES.positionsPage)), ghost = squash(code(FILES.positions));
  const pageBtn = page.includes('<Link href={"/positions/performance" as never} className="btn btn-ghost btn-sm inline-flex items-center gap-1.5 shrink-0 mt-1"> <I.chart s={13} /> {t.performance.viewPerformance} </Link>');
  const ghostBtn = ghost.includes('<header className="flex items-start justify-between gap-3"> <PageHeader eyebrow={t.common.positions} title={t.positions.headline} subtitle={t.positions.headlineBody} /> <div className="mt-1 inline-flex h-[var(--h-control-sm)] shrink-0 items-center gap-1.5 rounded-control border border-transparent bg-bg-overlay px-2 kp-shimmer-track" aria-hidden> <span className="h-[13px] w-[13px] shrink-0" /> <span className="text-body-sm tracking-normal font-semibold text-transparent">{t.performance.viewPerformance}</span> </div> </header>');
  const btnCss = /\.btn-sm \{ height: var\(--h-control-sm\); padding: 0 12px; font-size: 13px; \}/.test(raw("src/app/globals.css"));
  ok("6.1 · the head holds the page's \"View performance\" button beside it — `btn-sm`'s box (40px, 12px in from a 1px edge, the 13px glyph, 8px, the 13px semibold words untracked), 4px down — so the title and line wrap in what it leaves (at 360 the page's head is 54px taller than the full-width head the ghost drew)",
    pageBtn && ghostBtn && btnCss, j({ pageBtn, ghostBtn, btnCss }));
  ok("6.1′ PLANT · the head without its button (the old ghost) is reported", !squash(code(FILES.positions).replace(/<div className="mt-1 inline-flex[\s\S]*?<\/div>\n/, "")).includes("{t.performance.viewPerformance}"));
}
{
  // The strip: rendered, the page's own component and the ghost wear the same classes and inline styles.
  const t = dict.sw;
  const page = inApp("/positions", "sw", h(PnlSummaryStrip as never, { openCount: 2, openStake: 10000, openLiveValue: 9000, settledNet: -500, wins: 1, losses: 2, cashOuts: 0, settledCount: 3,
    t: { yourStanding: t.positions.yourStanding, live: t.common.live, atRisk: t.positions.atRisk, open: t.common.open, liveValueIfSettled: t.positions.liveValueIfSettled, unrealised: t.positions.unrealised, settledPnl: t.positions.settledPnl, winRate: t.positions.winRate, ofSettled: "3 imekamilika" } } as never));
  const ghost = ghostHtml("positions", "sw");
  const shape = (s: string) => {
    const strip = s.slice(s.indexOf('class="glass-panel px-5 pt-4 pb-[18px]'), s.indexOf('class="rounded-lg border border-border bg-bg-elevated/60 p-3'));
    return {
      grid: /<div class="grid gap-x-0 gap-y-4" style="grid-template-columns:repeat\(auto-fit, minmax\(158px, 1fr\)\)">/.test(strip),
      rule: strip.includes('<div class="gilt-rule" style="margin:10px 0 14px"></div>'),
      cells: count(strip, `<div class="${PNL_STRIP.cell}" style="border-left:1px solid color-mix(in oklab, var(--border) 60%, transparent)">`),
      labels: count(strip, `<p class="${PNL_STRIP.label}">`), subs: count(strip, `<p class="${PNL_STRIP.sub}">`),
      values: count(strip, `<p class="${PNL_STRIP.value}`), win: count(strip, `<div class="${PNL_STRIP.winRow}">`), live: count(strip, `<span class="${PNL_STRIP.live}">`), head: count(strip, `<div class="${PNL_STRIP.head}">`),
    };
  };
  const p = shape(page), g = shape(ghost);
  const constants = squash(code(FILES.strip)).includes("<p className={`${PNL_STRIP.value} ${valueClass}`}>{value}</p>") && squash(code(FILES.strip)).includes("<div className={PNL_STRIP.winRow}>");
  ok(`6.2 · the standing strip is the strip's own: rendered, the page's PnlSummaryStrip and the ghost carry the same auto-fit grid (158px minimum: ONE column of four cells on a phone, where the ghost drew a fixed two), the rule's margin, four cells in \`PNL_STRIP\`'s classes (the strip reads them too), the live key and the win row — ${j(p)}`,
    j(p) === j(g) && p.grid && p.rule && p.cells === 4 && p.labels === 4 && p.subs === 4 && p.values === 3 && p.win === 1 && constants, j({ p, g }));
  ok("6.2′ CONTROL · the ghost's old grid (`grid-cols-2 gap-3 sm:grid-cols-4`) is gone", !code(FILES.positions).includes("mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"));
  // The exposure keys: the page's 14px line of words (it wraps at 320 in Swahili, as the page's does), not 10px bars.
  const keys = /<div className="(mb-1\.5 flex items-center justify-between gap-2 font-mono text-micro uppercase tracking-\[0\.12em\] tabular-nums)">/;
  const pk = keys.exec(code(FILES.positionsPage))?.[1], gk = keys.exec(code(FILES.positions))?.[1];
  // Round 7 (R7-C, 2026-10-10) moved this pin: the NO key ends on the bar's end on the page (its trailing 0.12em taken
  // back, `text-right` for a wrapped line), and its drawing follows with the same classes.
  const words = squash(code(FILES.positions)).includes('<span className="font-bold"><GhostText>{`${t.common.yes} · TZS 00K`}</GhostText></span> <span><GhostText>{t.positions.atRisk}</GhostText></span> <span className="text-right font-bold kp-track-end kp-track-end--12"><GhostText>{`${t.common.no} · TZS 00K`}</GhostText></span>')
    && squash(code(FILES.positionsPage)).includes('<span className="text-right font-bold text-no-300 kp-track-end kp-track-end--12">{t.common.no} · {formatTzsCompact(openNoStake)}</span>');
  ok("6.3 · the exposure keys are the page's line — its classes (`text-micro`: a 14px line, where the ghost's 10px bars made 10) and its three keys' words, the stakes as compact shapes",
    !!pk && pk === gk && words, j({ pk, gk, words }));
}
{
  // The bar: the page's PositionsBar RENDERED (the default view) against the ghost — every pill's words, in order, the
  // group keys, and row 2's arrangement (sort, the phone's Filters, then the dividers and groups).
  const counts = { tab: new Proxy({}, { get: () => 12 }), side: new Proxy({}, { get: () => 12 }), topic: new Proxy({}, { get: () => 12 }), when: new Proxy({}, { get: () => 12 }) };
  const wrong: string[] = [];
  const W: Record<Locale, { page: string; ghost: string }> = {} as never;
  for (const l of LOCALES) {
    const t = dict[l];
    const page = inApp("/positions", l, h(PositionsBar as never, { state: parsePortfolioParams({}), counts, resultCount: 12, t } as never));
    const ghostAll = ghostHtml("positions", l);
    const ghost = ghostAll.slice(ghostAll.indexOf('class="kp-discovery-bar'), ghostAll.indexOf('class="grid grid-cols-1 items-start gap-3 md:grid-cols-2"'));
    W[l] = { page, ghost };
    const lenses = (s: string) => [...s.matchAll(/<a data-chip="tab:[^"]*"[^>]*>([^<]*)<span/g)].map((m) => unesc(m[1]));
    const ghostLenses = (s: string) => { const r1 = s.slice(0, s.indexOf("kp-qbar-row")); return [...r1.matchAll(/<span class="inline-flex min-h-\[44px\][^"]*">([^<]*)<span class="font-mono text-\[11px\] font-bold tabular-nums">00<\/span><\/span>/g)].map((m) => unesc(m[1])); };
    const groups = (s: string, tag: string) => [...s.matchAll(new RegExp(`<${tag}[^>]*class="hidden min-w-0 flex-wrap items-center gap-1 lg:flex">([\\s\\S]*?)</${tag}>`, "g"))].map((m) => {
      const key = /<span class="shrink-0 pr-0\.5 font-mono text-micro font-bold uppercase eyebrow[^"]*">([^<]*)<\/span>/.exec(m[1])?.[1] ?? "";
      const pills = [...m[1].matchAll(tag === "nav" ? /<a data-chip="[^"]*"[^>]*>([^<]*)<span/g : /<span class="inline-flex min-h-\[44px\][^"]*">([^<]*)<span/g)].map((x) => unesc(x[1]));
      return `${unesc(key)}: ${pills.join(", ")}`;
    });
    if (j(lenses(page)) !== j(ghostLenses(ghost)) || lenses(page).length !== 7) wrong.push(`${l} lenses ${j(lenses(page))} ≠ ${j(ghostLenses(ghost))}`);
    if (j(groups(page, "nav")) !== j(groups(ghost, "div")) || groups(page, "nav").length !== 3) wrong.push(`${l} groups ${j(groups(page, "nav"))} ≠ ${j(groups(ghost, "div"))}`);
    // Row 2's children in the page's order: the sort cell, the phone's Filters (lg:hidden), then divider + group three times.
    const seq = (s: string) => { const r2 = s.slice(s.indexOf('class="kp-qbar-row')); return [...r2.matchAll(/class="(kp-qdiv|hidden min-w-0 flex-wrap items-center gap-1 lg:flex|flex min-w-0 flex-1 items-center lg:flex-none|kp-fsheet lg:hidden|h-\[44px\] w-\[104px\] rounded-pill bg-bg-overlay kp-shimmer-track lg:hidden)"/g)].map((m) => (m[1].startsWith("kp-fsheet") || m[1].startsWith("h-[44px]") ? "filters" : m[1].startsWith("flex min-w-0") ? "sort" : m[1] === "kp-qdiv" ? "|" : "group")); };
    if (j(seq(page)) !== j(seq(ghost)) || j(seq(ghost)) !== j(["sort", "filters", "|", "group", "|", "group", "|", "group"])) wrong.push(`${l} row 2 ${j(seq(page))} ≠ ${j(seq(ghost))}`);
  }
  ok("6.4 · the bar is the page's, word for word: PositionsBar RENDERED in sw, en and zh against the ghost — the seven lenses (each the kit pill's box, `PillGhost`), the side, window and topic groups with their keys, and row 2 in the page's arrangement (the sort, the phone's Filters, then each group after its divider — the row's 29px gap is keyed on it)",
    wrong.length === 0, wrong.slice(0, 2).join(" | "));
  // Row 2's lines at lg, from the repo's fonts (R5-H §4.6's model): the sort's key and value, then three groups of pills.
  const fontkit = req("fontkit") as { openSync: (p: string) => { layout: (s: string) => { glyphs: Array<{ advanceWidth: number }> }; unitsPerEm: number } };
  const F = (n: string) => fontkit.openSync(`src/lib/server/reports/fonts/${n}`);
  const interM = F("Inter-Medium.ttf"), interB = F("Inter-Bold.ttf"), monoB = F("JetBrainsMono-Bold.ttf");
  const w = (font: ReturnType<typeof F>, s: string, px: number) => font.layout(s).glyphs.reduce((a, g) => a + g.advanceWidth, 0) / font.unitsPerEm * px;
  const text = (s: string, px: number) => [...s].reduce((a, ch) => a + (/[　-鿿]/.test(ch) ? px : (w(interM, ch, px) + w(interB, ch, px)) / 2), 0);
  const pillW = (s: string) => 2 + 32 + text(s, 13) + 8 + w(monoB, "00", 11);
  const keyW = (s: string) => [...s.toUpperCase()].reduce((a, ch) => a + (/[　-鿿]/.test(ch) ? 10 : w(monoB, ch, 10)), 0) + 1.4 * [...s].length + 2;
  const lines = (items: number[], room: number, gap: number) => { let n = 1, x = 0; for (const it of items) { if (x > 0 && x + gap + it > room) { n++; x = Math.min(it, room); } else x = x === 0 ? Math.min(it, room) : x + gap + it; if (it > room) n += Math.ceil(it / room) - 1; } return n; };
  const out: string[] = [], got: Record<string, number> = {};
  for (const l of LOCALES) {
    const t = dict[l];
    const sort = keyW(t.common.sort) + text(t.positions.sortRecent, 13) + 71 + 44;
    const group = (k: string, labels: string[]) => keyW(k) + 4 + labels.map(pillW).reduce((a, b) => a + b + 4, -4);
    const ghost = W[l].ghost;
    const g = [...ghost.matchAll(/<div class="hidden min-w-0 flex-wrap items-center gap-1 lg:flex">([\s\S]*?)<\/div>/g)].map((m) => {
      const key = unesc(/eyebrow text-transparent">([^<]*)</.exec(m[1])?.[1] ?? "");
      const labels = [...m[1].matchAll(/<span class="inline-flex min-h-\[44px\][^"]*">([^<]*)<span/g)].map((x) => unesc(x[1]));
      return group(key, labels);
    });
    for (const col of [960, 1016]) { const n = lines([sort, ...g], col, 29); got[`${l}@${col}`] = n; out.push(`${l}@${col}: ${n}`); }
  }
  ok(`6.5 · measured from the repo's fonts, the page's row 2 at lg — the sort, then the side, window and topic groups, 29px apart — takes three lines at 1024 and 1280 in Swahili and English (two in Chinese at 1280): the ghost's word-sized pills take the same lines (${out.join(" · ")}); the ghost's fixed 180 + 104px boxes drew one`,
    got["sw@960"] === 3 && got["sw@1016"] === 3 && got["en@960"] === 3 && got["en@1016"] === 3 && got["zh@960"] === 3 && got["zh@1016"] === 2, out.join(" · "));
  ok("6.5′ CONTROL · the old boxes: 180 + 12 + 104 = 296px did not fit a 320 phone's 288px bar (two lines there), and at lg the same two boxes made one line", 180 + 12 + 104 > 288 && lines([180, 104], 960, 12) === 1);
}

/* ══ §7 · /positions/performance ═══════════════════════════════════════════════════════════════════════════════════════ */
section("7 · /positions/performance — the page's bands in the page's order");
{
  const page = squash(code(FILES.performancePage)), ghost = squash(code(FILES.performance));
  const PAGE = ["<BackLink ", "<PageHeader eyebrow={section} title={t.performance.title} />", '<section aria-label={t.performance.netPnl} className="glass-panel p-5">', '<section aria-label={t.performance.pnlOverTime} className="glass-panel p-5">',
    '<section className="grid grid-cols-1 gap-3 md:grid-cols-2">', '<section className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))" }}>', '<h2 className="mb-3 flex items-baseline gap-2">', '<div className="rounded-xl border border-border bg-bg-elevated overflow-hidden divide-y divide-border/50">'];
  const GHOST = ["<BackLinkGhost />", "<PageHeader eyebrow={journey ? t.journey.tabTickets : t.common.positions} title={t.performance.title} />", "{`${t.performance.netPnl} · ${t.common.settled}`}", "{t.performance.pnlOverTime}",
    '<section className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>', '<section className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))" }} aria-hidden>', '<h2 className="mb-3 flex items-baseline gap-2">', '<div className="rounded-xl border border-border bg-bg-elevated overflow-hidden divide-y divide-border/50">'];
  const p = inOrder(page, PAGE), g = inOrder(ghost, GHOST);
  ok("7.1 · the ghost's bands are the page's, in the page's order — the back link, the head, the net P&L panel, the chart, the best-win and streak cards, the two stake tiles, the recent rows (it drew a stat card, four boxes, a streak bar, a chart and three rows: an older page)",
    p === "" && g === "" && count(ghost, '<section className="glass-panel p-5 kp-shimmer-track" aria-hidden>') === 2
      && page.includes("const section = journey ? t.journey.tabTickets : t.common.positions;"), j({ p, g }));
  ok("7.1′ PLANT · the chart drawn before the P&L panel (the old order) is reported",
    inOrder(squash(decomment(raw(FILES.performance).replace(/(\{\/\* The net P&L panel[\s\S]*?<\/section>)\s*(\{\/\* P&L over time[\s\S]*?<\/section>)/, "$2\n$1"))), GHOST) !== "");
  // The chart: the svg's own ratio (720 × 240), not a 200px box; the twin line under sm.
  const svg = /viewBox="0 0 (\d+) (\d+)" width="100%"/.exec(raw("src/components/charts/pnl-chart.tsx"));
  const ratio = svg ? `${Number(svg[1]) / Number(svg[2])}/1` : "";
  ok(`7.2 · the chart is the svg's own shape — a ${svg?.[1]} × ${svg?.[2]} box at the panel's width (\`aspect-[${ratio}]\`, ${Math.round((1016 - 50) / 3)}px at 1280, not 200) — with the page's HTML twin line under \`sm\``,
    ratio === "3/1" && ghost.includes('<div className="aspect-[3/1] w-full rounded bg-bg-overlay" />') && ghost.includes('<p className="sm:hidden mt-1.5 mb-0 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-body-sm tabular-nums">')
      && raw("src/components/charts/pnl-chart.tsx").includes('<p className="sm:hidden mt-1.5 mb-0 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-body-sm tabular-nums">'));
  ok("7.2′ CONTROL · the old 200px chart box is gone", !code(FILES.performance).includes("h-[200px]"));
  // The kit Stats in the page's props.
  const stats = (s: string) => jsxTags(s, "Stat").map((p) => [p.size, p.labelStyle, p.boxed ?? "-"].join("|"));
  ok("7.3 · the panel's three `2xl` stats and the two `xl` stake tiles are the kit Stat in the page's props (the tiles in the money face, as the page's `money` sets it)",
    j(stats(code(FILES.performancePage))) === j(stats(code(FILES.performance))) && stats(code(FILES.performance)).length === 5 && count(code(FILES.performance), 'boxed="panel" font="mono"') === 2, j({ page: stats(code(FILES.performancePage)), ghost: stats(code(FILES.performance)) }));
}

console.log(`\nvisual-pass-r5k: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
