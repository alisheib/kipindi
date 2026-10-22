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
 *   §1 M4/H1 the pool ledger is the one Millionea ledger  §2 L10 the figure holds one line at 320
 *   §3 H3 the final week's rule under the figure          §4 L15 a conditional refund row: no figure, no dash
 *   §5 motion L1 a live frame ticks each value it moved   §6 M9/M10/M7 calm bars; the carry's origin and landing
 *   §7 L2/L18 the strip: mono ranges, a shape for "now"   §8 M2 the kit's header pill and its wrapping row
 *   §9 M11 a result that arrives presses once            §10 the words, as decided, in three languages; zh's one
 *                                                          spacing rule on every timed line the hub fills
 *   §11 L14 last week's row in the register's words      §12 L7/§T5 a time's face, every numeral .mono
 *   §13 L7 (round 2) the loading drawing composes the page's frame: the reader's block last, a guest by the shell's mark,
 *       every block sweeping                              §14 L6/L21 the no-week body keeps its day with its clock
 *   §15 the segment's loading state draws the page being opened (a census of every Millionea page)
 *   §16 L13 a voided main's words are a fact line          §17 7b the head's absent figure is the platform's empty slot
 */
import { readFileSync, readdirSync } from "node:fs";
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
const { MaswaliPoolHead } = POOL;
const MLR = req("../src/components/maswali/maswali-ledger.tsx") as typeof import("../src/components/maswali/maswali-ledger.tsx");
const HP = req("../src/app/millionea/hub-pool.tsx") as typeof import("../src/app/millionea/hub-pool.tsx");
const GH = req("../src/app/millionea/hub-ghost.tsx") as typeof import("../src/app/millionea/hub-ghost.tsx");
const FRAME = req("../src/app/millionea/hub-frame.ts") as typeof import("../src/app/millionea/hub-frame.ts");
/** An attribute's value as react-dom/server writes it (its five escaped characters). */
const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type View = import("../src/components/maswali/maswali-pool-figure.tsx").PoolView;
const SELLING: View = { kind: "selling", carriedIn: { week: 47, amount: null }, sales: { tickets: 41, amount: 41_000 }, pool: 41_000, floor: 1_000_000, jackpot: 1_000_000 };
const VOIDING: View = { kind: "voiding", carriedIn: null, sales: { tickets: 10, amount: 10_000 }, pool: 10_000, floor: 1_000_000, price: 1_000 };
const headOf = (l: L3, view: View, final = false) => inApp(l, h(MaswaliPoolHead as never, { t: dict[l], locale: l, view, pct: 13, final } as never));
/** The hub's live figure (a `maswali:pool` frame, `maswali-pool-feed.ts`): Week 49 selling 41 tickets under the floor while
 *  Week 47's carry is still pending — the figure the head calls "at least". */
const figure = (over: Record<string, unknown> = {}) => ({ weekId: "w", code: "MLN-2026-W49", visibility: "PUBLIC", state: "OPEN", carryIn: null,
  carryPendingCode: "MLN-2026-W47", carryFromCode: null, sales: 41_000, floor: 1_000_000, jackpot: 1_000_000, atLeast: true, feeRate: 0.13, ...over });
/** A week whose void is certain: ten tickets sold, no carry, nothing struck. */
const VOIDING_FIG = { state: "RESOLVING", carryPendingCode: null, sales: 10_000, jackpot: 0, atLeast: false };
const NOT_MOVED = { n: 0, keys: new Set<string>() };
/** The hub's pool ledger exactly as the page draws it: the live island holding the figure, its ledger reading it. */
const hubLedgerOf = (l: L3, fig: unknown, voiding = false) =>
  inApp(l, h(HP.HubPoolLive as never, { weekId: "w", initial: fig, price: 1_000, voiding } as never, h(HP.HubPoolLedger as never, {} as never)));
/** The hub's dress over the one ledger's rows, given a frame's moved rows (the island's state, which no server render holds). */
const dressedOf = (l: L3, fig: unknown, moved: { n: number; keys: ReadonlySet<string> }, carry: { from: string; play: boolean } | null = null) => {
  const input = HP.ledgerInputOf(fig as never, 1_000, false);
  return HP.dressLedgerRows(MLR.millioneaLedgerRows(dict[l], l, input), input, moved, carry);
};
const ledgerOf = (l: L3, fig: unknown, moved: { n: number; keys: ReadonlySet<string> }) => inApp(l, h(MLR.MaswaliLedger as never, { rows: dressedOf(l, fig, moved) } as never));

// ── §1 · M4/H1 · the pool ledger is the one Millionea ledger ─────────────────────────────────────────────────────────────
console.log("\n§1 · M4/H1 · the hub's pool ledger IS the one Millionea ledger (the register's): the kit ReceiptRow in its sentence label, never a home-made <dl>");
// ⭐ The lead's ruling (2026-10-21): every surface that prints a week's money draws REGISTER's `millioneaLedgerRows` +
// `MaswaliLedger`; the hub's own row building is retired. Its labels are nouns in the body face (H3 of the register critic).
const SENTENCE_LABEL = /<span class="min-w-0 text-body-sm(?: text-text(?:-muted)?)?(?: font-semibold)?">/g;
const ledgerDefects = (l: L3, m: string) => {
  const d: string[] = [];
  const keys = MLR.millioneaLedgerRows(dict[l] as never, l, HP.ledgerInputOf(figure() as never, 1_000, false)).map((r) => r.key);
  const drawn = [...m.matchAll(/data-ledger-row="([^"]+)"/g)].map((x) => x[1]);
  if (!m.includes('data-testid="millionea-hub-ledger"') || !m.includes('data-testid="millionea-ledger"')) d.push(`${l}: not the one ledger in the hub's box`);
  if (j(drawn) !== j(keys)) d.push(`${l}: rows ${j(drawn)} for ${j(keys)}`);
  if (/<dl\b|<dt\b|<dd\b/.test(m)) d.push(`${l}: a <dl> ledger`);
  const labels = (m.match(SENTENCE_LABEL) ?? []).length;
  if (labels !== keys.length) d.push(`${l}: ${labels} sentence labels for ${keys.length} rows`);
  if (/\buppercase eyebrow\b/.test(m)) d.push(`${l}: a label in capitals`);
  // The pool so far is the ledger's total — the receipt's total figure under its hairline; the fee's words the muted row's.
  const pool = m.slice(m.indexOf('data-ledger-row="pool"'), m.indexOf('data-row="pool"'));
  if (!/border-t border-border pt-1\.5/.test(pool) || !/font-mono text-\[16px\] font-bold tabular-nums text-text/.test(pool)) d.push(`${l}: the pool is not the receipt's total`);
  if (!/class="font-mono text-\[13px\] font-semibold text-text-muted"><span data-row="fee">/.test(m)) d.push(`${l}: the fee's words are not the muted row's`);
  return d;
};
{
  const d = LOCALES.flatMap((l) => ledgerDefects(l, hubLedgerOf(l, figure())));
  ok("1.1 · in three languages the hub's pool ledger is the one Millionea ledger — the builder's rows in its order, each the kit ReceiptRow in its sentence label (no capitals), the pool the receipt's total under its hairline, the fee's words the muted row's — and no <dl>", d.length === 0, d.join(" | "));
  // ⭐ the Swahili floor label keeps its connective with the word after it ("Kiwango cha" / "chini …" ended a line on "cha"):
  // the kit receipt row's own rule (`keepConnectives`, connectives.ts) — the connective and its space one nowrap run, which
  // no engine breaks after — or a run that holds the pair whole.
  const sw = hubLedgerOf("sw", figure());
  const keptCha = (m: string) => /<span class="whitespace-nowrap">(?:[^<]*\s)?cha <\/span>chini\b|<span class="whitespace-nowrap">[^<]*\bcha chini\b/.test(m);
  ok("1.2 · sw \"Kiwango cha chini kilichohakikishwa\" keeps \"cha\" with \"chini\": no line ends on the connective", keptCha(sw), (sw.match(/.{0,60}cha .{0,30}/) ?? [""])[0]);
  // The label as WIP 1 drew it: a fact line of `keepFact`s, which keeps runs and figures but not a connective.
  const FACTS = req("../src/components/maswali/maswali-facts.tsx") as typeof import("../src/components/maswali/maswali-facts.tsx");
  const factsOnly = inApp("sw", h(FACTS.MaswaliFacts as never, { facts: FACTS.factsOf(dict.sw.millionea.floor).map((f) => FACTS.keepFact("sw", f)) } as never));
  ok("1.2′ PLANT · the label drawn as a bare fact line (its connective free to end a line) is reported", !keptCha(factsOnly), factsOnly.slice(0, 160));
  const oldDl = "<dl><div><dt>Jackpot</dt><dd>TZS 1,000,000</dd></div></dl>";
  ok("1.1′ PLANT · the old home-made <dl> ledger is reported", ledgerDefects("en", oldDl).length > 0);
  const eyebrows = hubLedgerOf("en", figure()).replaceAll('class="min-w-0 text-body-sm text-text"', 'class="min-w-0 font-mono text-micro uppercase eyebrow text-text-subtle"');
  ok("1.1″ PLANT · WIP 1's rows (the confirm's micro capitals for a ledger's nouns) are reported", ledgerDefects("en", eyebrows).some((x) => x.includes("capitals")));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-22 (round 2, L5 · REGISTER's H2: the register draws a public week from the moment it
  // opens): every carry on the PUBLIC line opens its week's register page — the one still waiting on its week too — and on
  // a DRIVE line none does (a drive week's chain is private; the public register has no page for it: never a 404 door).
  const { registerWeekHref } = req("../src/app/millionea/millionea-parts.tsx") as typeof import("../src/app/millionea/millionea-parts.tsx");
  const inRow = (input: ReturnType<typeof HP.ledgerInputOf>) => MLR.millioneaLedgerRows(dict.en as never, "en", input).find((r) => r.key === "in");
  const came = { carryPendingCode: null, carryIn: 389_000, carryFromCode: "MLN-2026-W47", atLeast: false };
  const at = (over: Record<string, unknown>) => inRow(HP.ledgerInputOf(figure(over) as never, 1_000, false))?.href ?? null;
  const linkDefects = (href: (over: Record<string, unknown>) => string | null) => [
    ...(href({}) !== registerWeekHref("MLN-2026-W47") ? ["the waiting carry does not open its week's page"] : []),
    ...(href(came) !== registerWeekHref("MLN-2026-W47") ? ["the carry that came links nowhere"] : []),
    ...(href({ visibility: "DRIVE" }) !== null || href({ ...came, visibility: "DRIVE" }) !== null ? ["a drive week's carry links the public register"] : []),
  ];
  ok("1.3 · on the public line both carries open Week 47's register page — the one that came and the one still waiting; on a drive line neither links", linkDefects(at).length === 0, j(linkDefects(at)));
  ok("1.3′ PLANT · the old waiting carry that linked nothing, and a drive carry that links the public register, are each reported",
    linkDefects((over) => (over.carryPendingCode === null ? at(over) : null)).length > 0 && linkDefects((over) => registerWeekHref(String(over.carryFromCode ?? "MLN-2026-W47"))).length > 0);
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
console.log("\n§3 · H3 + H1 · in a final week the head's ONE rule says what a pool with no 10/10 does (MR-30), led by the week's mark");
// ⭐ The critic's one key, said once: "Final week: if no ticket gets 10/10, the pool is shared equally by this week's
// highest-scoring tickets · 13% fee at payout" — the head's rule line in the final week (the fee its rule's own fact), led
// by the final week's mark (`finalWeek`); the 10/10 rule alone is not said beside it, and no page-wide box says the week a
// third time (it put the door under a 360 phone's fold).
const finalDefects = (l: L3, m: string, want: boolean) => {
  const t = textOf(m);
  const line = dict[l].millionea.finalWeekRule;
  const [tenOnly, fee] = fill(dict[l].millionea.ruleShared, { pct: 13 }).split(" · ");
  const at = t.indexOf(line), ten = t.indexOf(tenOnly ?? "\u0000"), feeAt = t.indexOf(fee ?? "\u0000"), carry = t.indexOf(fill(dict[l].millionea.pendingCarry, { week: 47 }));
  const mark = /data-testid="millionea-hub-final-rule"><(?:svg|span aria-hidden)/.test(m);
  if (!want) return at >= 0 ? [`${l}: the final week's line where no final week runs`] : [];
  return at >= 0 && ten < 0 && feeAt > at && (carry < 0 || feeAt < carry) && mark ? [] : [`${l}: final@${at} 10/10-only@${ten} fee@${feeAt} carry@${carry} mark ${mark}`];
};
{
  const d = LOCALES.flatMap((l) => [...finalDefects(l, headOf(l, SELLING, true), true), ...finalDefects(l, headOf(l, SELLING, false), false), ...finalDefects(l, headOf(l, VOIDING, true), false)]);
  ok("3.1 · a final week's head: the figure, then ONE rule — the final week's mark, \"Final week: if no ticket gets 10/10, the pool is shared equally by this week's highest-scoring tickets · 13% fee at payout\" — then the carry's line, in three languages; the 10/10 rule alone not beside it; none in a week that is not final, none on a void", d.length === 0, d.join(" | "));
  // The heads as they were: the 10/10 rule alone (round 1), and the 10/10 rule with the final week's line under it (WIP 1).
  const alone = headOf("en", SELLING, false), twice = alone.replace("</div>", `<span>${dict.en.millionea.finalWeekRule}</span></div>`);
  ok("3.1′ PLANT · the old final weeks (the 10/10 rule alone; the 10/10 rule and the final line both) are each reported", finalDefects("en", alone, true).length > 0 && finalDefects("en", twice, true).length > 0);
  const unmarked = headOf("en", SELLING, true).replace(/(data-testid="millionea-hub-final-rule">)<(?:svg[\s\S]*?<\/svg>|span aria-hidden[^>]*><\/span>)/, "$1");
  ok("3.1″ PLANT · a final week's rule without the week's mark is reported", unmarked !== headOf("en", SELLING, true) && finalDefects("en", unmarked, true).length > 0);
  // ⭐ S5-R2-HUB · each fact list of the head's rule balances a fact that wraps inside itself (`HUB_POOL_HEAD.facts`): at 320
  // Swahili's first fact broke greedily and stranded its kept run on a line of its own ("Inagawanywa sawa kwa kila tiketi" /
  // "ya 10/10", open-classic-sw-320 of round 2's run a). The lines themselves are measured in a browser
  // (`qa:maswali-hub-states`' open state); here, the class on the rule's list, in every head a week can draw.
  const balanced = (m: string) => count(m, `class="kp-mln-facts ${escAttr(FRAME.HUB_POOL_HEAD.facts)}"`);
  const heads = LOCALES.flatMap((l) => [["selling", headOf(l, SELLING, false)], ["final", headOf(l, SELLING, true)]].map(([k, m]) => [`${l} ${k}`, balanced(m)] as const));
  ok("3.2 · in three languages, the selling week's and the final week's rule each draw ONE fact list that balances a fact wrapping inside itself", heads.every(([, n]) => n === 1), j(heads));
  const greedy = headOf("sw", SELLING, false).replace(` ${escAttr(FRAME.HUB_POOL_HEAD.facts)}"`, '"');
  ok("3.2′ PLANT · the round-1 rule (its facts wrapping greedily) is reported", balanced(greedy) === 0);
}

// ── §4 · L15 · a conditional refund row ──────────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · L15 · \"If the void stands, every ticket is refunded TZS 1,000\" stands alone — no figure (H1), no dash; a void strikes no jackpot");
{
  const refundDefects = (l: L3, m: string) => {
    const refund = innerOf(m, 'data-row="refund"');
    return refund === "" && !m.includes('data-ledger-row="jackpot"') && !m.includes('data-ledger-row="floor"')
      && textOf(m).includes(fill(dict[l].millionea.refundEachIfVoid, { price: formatTzs(1_000) })) ? [] : [`${l}: refund "${refund}"`];
  };
  const d = LOCALES.flatMap((l) => refundDefects(l, hubLedgerOf(l, figure(VOIDING_FIG), true)));
  ok("4.1 · being voided, in three languages: the refund sentence names its amount and its value cell is empty — never \"—\", never a figure; no jackpot and no floor row (a void strikes none, MR-18)", d.length === 0, d.join(" | "));
  // PLANT · the row as the one ledger drew it before REGISTER's c851bc760 (the builder's "—" beside the sentence).
  const rows = MLR.millioneaLedgerRows(dict.en as never, "en", HP.ledgerInputOf(figure(VOIDING_FIG) as never, 1_000, true))
    .map((r) => ({ ...r, value: h("span", { "data-row": r.key }, (r.key === "refund" ? "—" : r.value) as never) }));
  const old = inApp("en", h(MLR.MaswaliLedger as never, { rows } as never));
  ok("4.1′ PLANT · the old row (a dash beside the sentence) is reported", refundDefects("en", old).length > 0, j(refundDefects("en", old)));
}

// ── §5 · motion L1 · a live frame ticks each value it moved ──────────────────────────────────────────────────────────────
console.log("\n§5 · motion L1 · a real sale's frame ticks the values it changed (`.m-tick`, keyed on the frame), nothing on the first paint");
{
  const vals = (over: Record<string, unknown>) => HP.rowFigures(HP.ledgerInputOf(figure(over) as never, 1_000, false));
  const moved = HP.movedRows(vals({ sales: 41_000 }), vals({ sales: 42_000 }));
  ok("5.1 · one more ticket (41,000 → 42,000 under the floor): the sales and the pool rows moved — not the floor, the jackpot (the floor's larger) or the fee", j([...moved].sort()) === j(["pool", "sales"]), j([...moved]));
  const tickOn = (m: string, k: string) => /\bm-tick\b/.test(tagWith(m, `data-row="${k}"`));
  const ticked = ledgerOf("en", figure({ sales: 42_000 }), { n: 1, keys: moved });
  ok("5.2 · the frame's rows take `.m-tick` and no other row does", tickOn(ticked, "sales") && tickOn(ticked, "pool") && !tickOn(ticked, "jackpot") && !tickOn(ticked, "floor") && !tickOn(ticked, "in") && !tickOn(ticked, "fee"),
    j({ sales: tickOn(ticked, "sales"), pool: tickOn(ticked, "pool"), jackpot: tickOn(ticked, "jackpot") }));
  const first = hubLedgerOf("en", figure());
  ok("5.3 · CONTROL · the first paint ticks nothing — the hub's ledger as the page draws it (no count-up, no tick on mount, §M8a item 7)", !/\bm-tick\b/.test(first) && first.includes('data-row="sales"'));
  const settled = HP.movedRows(vals({}), vals({ carryPendingCode: null, carryIn: 389_000, carryFromCode: "MLN-2026-W47", atLeast: false }));
  ok("5.4 · Week 47 settles and its TZS 389,000 lands: the carried-in row, the pool and the jackpot (its \"at least\" gone) tick — the sales, the floor and the fee do not", j([...settled].sort()) === j(["in", "jackpot", "pool"]), j([...settled]));
  const planted = ledgerOf("en", figure(), { n: 1, keys: new Set(["sales", "pool", "floor", "jackpot", "fee", "in"]) });
  ok("5.1′ PLANT · a frame that ticked every row would be told apart (the jackpot ticks with it)", tickOn(planted, "jackpot"));
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
  // M7 · R1-motion H6 · the carried figure lands on the ledger's carried-in row — the shared carry (`MaswaliCarry`: one
  // measurement, both ends in view, the origin vacated in flight), from the notice's own figure.
  const { MaswaliCarry } = req("../src/components/maswali/maswali-carry.tsx") as typeof import("../src/components/maswali/maswali-carry.tsx");
  type El = { type?: unknown; props?: { from?: string; play?: boolean; children?: El } } | null | undefined;
  const carryIn = (rows: ReturnType<typeof dressedOf>, key: string) => ((rows.find((r) => r.key === key)?.value as El)?.props?.children ?? null) as El;
  const landed = figure({ code: "MLN-2026-W48", carryPendingCode: null, carryIn: 389_000, carryFromCode: "MLN-2026-W47", atLeast: false });
  const rows = dressedOf("en", landed, NOT_MOVED, { from: "mln-carried-figure", play: true });
  const c = carryIn(rows, "in");
  ok("6.4 · the ledger's carried-in figure is the carry's landing: the shared MaswaliCarry, from the rollover notice's figure, told to play",
    c?.type === MaswaliCarry && c.props?.from === "mln-carried-figure" && c.props.play === true, j({ from: c?.props?.from, play: c?.props?.play }));
  const elsewhere = rows.filter((r) => r.key !== "in").some((r) => carryIn([r], r.key)?.type === MaswaliCarry);
  const pending = dressedOf("en", figure(), NOT_MOVED, { from: "mln-carried-figure", play: true }).some((r) => carryIn([r], r.key)?.type === MaswaliCarry);
  const none2 = dressedOf("en", landed, NOT_MOVED, null).some((r) => carryIn([r], r.key)?.type === MaswaliCarry);
  ok("6.4′ CONTROL · no other row carries; a carry still pending (no figure yet) lands nowhere; and with no notice to carry from, nothing carries", !elsewhere && !pending && !none2, j({ elsewhere, pending, none2 }));
  // M10 · ONE origin: of two unseen rollovers (a reader away for two weeks), only the week this week's figure carries in
  // from — its own `carryFromCode` — marks the id; none while that carry waits on its week, none from a week it does not name.
  const { carryingRollover } = req("../src/app/millionea/hub-words.tsx") as typeof import("../src/app/millionea/hub-words.tsx");
  const two = [{ notice: "ROLLOVER", code: "MLN-2026-W46" }, { notice: "RESULT", code: "MLN-2026-W47" }, { notice: "ROLLOVER", code: "MLN-2026-W47" }];
  const from = (carryFromCode: string | null, carryIn: number | null) => carryingRollover(two, { carryFromCode, carryIn })?.code ?? null;
  ok("6.5 · the origin is the rollover the figure names: Week 47's of two unseen rollovers; none from Week 45; none while the carry is pending (no figure)",
    from("MLN-2026-W47", 389_000) === "MLN-2026-W47" && from("MLN-2026-W45", 389_000) === null && from("MLN-2026-W47", null) === null && carryingRollover(two, null) === null,
    j([from("MLN-2026-W47", 389_000), from("MLN-2026-W45", 389_000), from("MLN-2026-W47", null)]));
  const firstFound = two.find((n) => n.notice === "ROLLOVER")?.code; // the old rule: the first rollover, whichever week it was
  ok("6.5′ PLANT · the old rule (the first rollover notice) names Week 46, a week this week's figure does not carry from", firstFound === "MLN-2026-W46" && firstFound !== from("MLN-2026-W47", 389_000));
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
    // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (the lead's L7 ruling): a range's clocks are `.mono` numerals and its weekdays the
    // body's ("Jumatatu 00:01 – Ijumaa 18:00 EAT": two clocks; the events' one; the results' none) — never a range set
    // whole in the mono face.
    const monos = [...m.matchAll(/<span class="mono">([^<]*)<\/span>/g)].map((x) => x[1]);
    if (count(m, "data-range") !== 3 || /font-mono/.test(m)) d.push(`${count(m, "data-range")} ranges, a whole range in mono: ${/font-mono/.test(m)}`);
    if (monos.length !== 3 || monos.some((x) => !/^[\d:.,/]+$/.test(x))) d.push(`mono runs ${JSON.stringify(monos)}`);
    return d;
  };
  const d = LOCALES.flatMap((l) => [0, 1, 2, null].flatMap((c) => stripDefects(inApp(l, h(MaswaliWeekStrip as never, { t: dict[l], phases, current: c } as never)), c).map((x) => `${l}/${c}: ${x}`)));
  ok("7.1 · in three languages, at every phase and with none (How to play): one filled dot for the phase the week is in (a shape, not only an ink — §A4), hollow rings for the others, and each range's clocks `.mono` numerals, its weekdays the body's (§T5, the lead's L7 ruling)", d.length === 0, d.slice(0, 6).join(" | "));
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
      weekVoidingBody: "{voided} 道正选题作废，有效备选题仅 {valid} 道。若至{when} 无异议改变此结果，整周将作废，每张彩票均将退款。",
      resultsOut: "已公布 {n}/15 个结果",
      closeMoved: "销售截止时间已更改：现为{when}（原为{from}）。所有事件仍在截止之后开始。",
      nextOpensAt: "下一周于{when} 开放。",
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

  // ⭐ zh · Millionea's one spacing rule (the lead's ruling, 2026-10-21): a space only where a Latin letter or a digit meets a
  // Han character, never between two Han characters — rendered through the hub's own fills (`hub-words.tsx`), each line at
  // the instants it is filled with: a weekday clock opens with a Han weekday, the same day's clock alone and a date with a digit.
  const W = req("../src/app/millionea/hub-words.tsx") as typeof import("../src/app/millionea/hub-words.tsx");
  type D = Parameters<typeof W.nextOpenWords>[0];
  const say = (node: unknown) => textOf(renderToStaticMarkup(h("p", null, node as never)));
  const EAT = (iso: string) => Date.parse(`${iso}+03:00`);
  const FRI_16 = EAT("2026-12-04T16:00:00"), FRI_18 = EAT("2026-12-04T18:00:00"), THU_18 = EAT("2026-12-03T18:00:00");
  const lines = (t: D, l: L3) => ({
    nextOpen: W.nextOpenWords(t, EAT("2026-12-07T00:01:00")),
    sameDay: say(W.closeMovedWords(t, FRI_16, FRI_18)),
    acrossDays: say(W.closeMovedWords(t, FRI_16, THU_18)),
    voiding: say(W.voidingWords(t, 3, 2, EAT("2026-12-08T12:00:00"))),
    finalAhead: say(W.finalAheadWords(t, l, 52, EAT("2026-11-30T00:01:00"), EAT("2026-11-20T10:00:00"))),
  });
  const HAN_GAP = /[㐀-䶿一-鿿豈-﫿]\s+[㐀-䶿一-鿿豈-﫿]/;
  const gapsIn = (x: Record<string, string>) => Object.entries(x).filter(([, v]) => HAN_GAP.test(v)).map(([k]) => k);
  const zh = lines(dict.zh as D, "zh");
  ok("10.4 · zh: no line the hub fills parts two Han characters with a space — the next open, the moved close (the same day and across days), the voiding sentence, the final week ahead",
    gapsIn(zh).length === 0, j(zh));
  const WANT_ZH = {
    nextOpen: "下一周于周一 00:01 开放。",
    sameDay: "销售截止时间已更改：现为周五 16:00（原为 18:00）。所有事件仍在截止之后开始。",
    acrossDays: "销售截止时间已更改：现为周五 16:00（原为周四 18:00）。所有事件仍在截止之后开始。",
    voiding: "3 道正选题作废，有效备选题仅 2 道。若至周二 12:00 无异议改变此结果，整周将作废，每张彩票均将退款。",
    finalAhead: "第52周将是 Millionea 的最后一周，于 2026年11月30日开放。",
  };
  const off2 = Object.keys(WANT_ZH).filter((k) => zh[k as keyof typeof zh] !== WANT_ZH[k as keyof typeof WANT_ZH]);
  ok("10.5 · zh: each reads as the rule sets it — a space where a digit meets a Han character (\"原为 18:00\", \"12:00 无异议\", \"于 2026年…\"), none before a Han weekday (\"于周一\", \"现为周五\", \"原为周四\"); the moved close's {from} spaced by the characters that meet, not by its caller",
    off2.length === 0, j(off2.map((k) => zh[k as keyof typeof zh])));
  const en = lines(dict.en as D, "en"), sw = lines(dict.sw as D, "sw");
  ok("10.6 · CONTROL · en and sw keep their own spaces (\"it is now Friday 16:00 (was 18:00)\", \"(was Thursday 18:00)\", \"by Tuesday 12:00,\")",
    en.sameDay.includes("now Friday 16:00 (was 18:00).") && en.acrossDays.includes("(was Thursday 18:00).") && en.voiding.includes("by Tuesday 12:00, the week")
      && sw.sameDay.includes("sasa ni Ijumaa 16:00 (awali 18:00).") && sw.acrossDays.includes("(awali Alhamisi 18:00).") && en.nextOpen === "The next week opens Monday 00:01.", j({ en, sw }));
  // PLANTS · the space put back before each Han-first fill, in each template; and the moved close's line filled by hand,
  // its {from} run set beside the line with no rule (the same day's "原为18:00": a digit against a Han character).
  const back = { ...dict.zh, millionea: { ...dict.zh.millionea,
    nextOpensAt: "下一周于 {when} 开放。",
    closeMoved: "销售截止时间已更改：现为 {when}（原为 {from}）。所有事件仍在截止之后开始。",
    weekVoidingBody: "{voided} 道正选题作废，有效备选题仅 {valid} 道。若至 {when} 无异议改变此结果，整周将作废，每张彩票均将退款。" } } as D;
  const caught = gapsIn(lines(back, "zh"));
  ok("10.4′ PLANT · the old templates (a space before each Han-first fill) are reported, line by line", j(caught) === j(["nextOpen", "sameDay", "acrossDays", "voiding"]), j(caught));
  const { fillNodes } = req("../src/lib/fill-nodes.tsx") as typeof import("../src/lib/fill-nodes.tsx");
  const byHand = say(fillNodes(dict.zh.millionea.closeMoved, { when: "周五 16:00", from: "18:00" }));
  ok("10.5′ PLANT · the moved close filled with no rule where its fill meets the line (\"原为18:00\") is reported", byHand !== WANT_ZH.sameDay && byHand.includes("原为18:00"), byHand);
}

// ── §11 · L14 · last week's row, in the register's words ─────────────────────────────────────────────────────────────────
console.log("\n§11 · L14 · last week voided reads as the register reads it: \"Week 48 · Voided · Every ticket refunded\" (or its refunds on their way)");
{
  const W = req("../src/app/millionea/hub-words.tsx") as typeof import("../src/app/millionea/hub-words.tsx");
  type Last = Parameters<typeof W.lastWeekWords>[2];
  const voided = (refundsPending: boolean) => ({ id: "w48", code: "MLN-2026-W48", state: "VOIDED", isFinal: false, closedAt: null, settledAt: null, tickets: 9, sales: 9_000, carryIn: 0,
    jackpot: null, winners: null, share: null, fee: null, topUp: null, paid: null, carriedForward: null, refundsPending }) as unknown as Last;
  const say = (l: L3, last: Last) => textOf(renderToStaticMarkup(h("p", null, W.lastWeekWords(dict[l] as never, l, last) as never)));
  const off = LOCALES.flatMap((l) => {
    const m = dict[l].millionea, week = fill(m.week, { week: 48 });
    const want = [`${week} · ${m.weekStatusVoided} · ${m.regRefunded}`, `${week} · ${m.weekStatusVoided} · ${m.regRefundsPending}`];
    // The fact line draws each fact in its own span (the " · " is the separator's, read by a screen reader): the text runs
    // the facts together, so the comparison is of the facts in order.
    const got = [say(l, voided(false)), say(l, voided(true))];
    const facts = (x: string) => x.split(" · ").join("");
    return got.every((g, i) => g.replace(/\s·\s/g, "") === facts(want[i])) && got.every((g) => !g.includes(m.weekVoidedShort)) ? [] : [`${l}: ${j(got)}`];
  });
  ok("11.1 · in three languages a voided last week reads \"Week 48 · Voided · Every ticket refunded\" — \"…Refunds on their way\" until every refund has landed (MR-18) — the register's words, never the card's \"this week is voided\"", off.length === 0, off.join(" | "));
  const card = dict.en.millionea.weekVoidedShort;
  ok("11.1′ PLANT · the card's own words over a past week (zh says 本周, THIS week) would be told apart", dict.zh.millionea.weekVoidedShort.includes("本周") && !say("en", voided(false)).includes(card));
}

// ── §12 · L7 · a time's face ─────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§12 · L7 · a time on the hub: its weekday in the body face, its clock a .mono numeral (the lead's ruling, §T5)");
{
  const N = req("../src/components/maswali/maswali-numerals.tsx") as typeof import("../src/components/maswali/maswali-numerals.tsx");
  const W = req("../src/app/millionea/hub-words.tsx") as typeof import("../src/app/millionea/hub-words.tsx");
  const FRI_16 = Date.parse("2026-12-04T16:00:00+03:00"), FRI_18 = Date.parse("2026-12-04T18:00:00+03:00");
  const faceDefects = (m: string) => {
    const monos = [...m.matchAll(/<span class="mono">([^<]*)<\/span>/g)].map((x) => x[1]);
    return monos.length > 0 && monos.every((x) => /^[\d:.,/]+$/.test(x)) && !/font-mono/.test(m) ? [] : [m.slice(0, 200)];
  };
  const markup = (node: unknown) => renderToStaticMarkup(h("p", null, node as never));
  const off = LOCALES.flatMap((l) => [
    markup(N.weekdayClock(dict[l] as never, FRI_18)),
    markup(W.closeMovedWords(dict[l] as never, FRI_16, FRI_18)),
    markup(W.voidingWords(dict[l] as never, 3, 2, FRI_18)),
    markup(W.finalAheadWords(dict[l] as never, l, 52, FRI_18, FRI_16)),
  ].flatMap(faceDefects).map((x) => `${l}: ${x}`));
  ok("12.1 · in three languages the close's time, the moved close, the voiding sentence and the final week's date set each numeral `.mono` and nothing else — no time set whole in the mono face", off.length === 0, off.slice(0, 3).join(" | "));
  const sw = markup(N.weekdayClock(dict.sw as never, FRI_18));
  ok("12.2 · the weekday stands outside the numeral: \"Ijumaa \" in the body face, \"18:00\" a .mono run, one unbreakable span", /<span class="whitespace-nowrap"><span>Ijumaa <\/span><span class="mono">18:00<\/span><\/span>/.test(sw), sw);
  ok("12.1′ PLANT · the old all-mono time (\"Ijumaa 18:00\" set whole in font-mono) is reported", faceDefects('<span class="whitespace-nowrap font-mono">Ijumaa 18:00</span>').length > 0);
  // §T5 (the lead's round-2 ruling): EVERY numeral of these sentences is a `.mono` run — the voiding sentence's counts and
  // the final week's number as well as their times and dates: with every `.mono` run taken out, no digit is left.
  // (an entity is markup too: "Millionea&#x27;s" holds no numeral)
  const bare = (m: string) => m.replace(/<span class="mono">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "").replace(/&#?\w+;/g, "").match(/\d+/g) ?? [];
  const lines = (l: L3) => ({
    voiding: markup(W.voidingWords(dict[l] as never, 3, 2, FRI_18)),
    finalAhead: markup(W.finalAheadWords(dict[l] as never, l, 52, FRI_18, FRI_16)),
    moved: markup(W.closeMovedWords(dict[l] as never, FRI_16, FRI_18)),
  });
  const left = LOCALES.flatMap((l) => Object.entries(lines(l)).filter(([, m]) => bare(m).length > 0).map(([k, m]) => `${l} ${k}: ${bare(m).join(",")}`));
  ok("12.3 · §T5 in three languages no digit of the voiding sentence (\"3 … 2 …\"), the final week ahead (\"Week 52 …\") or the moved close stands outside a .mono run", left.length === 0, left.join(" | "));
  // PLANT · the round-1 fills, their counts and the week's number handed in as bare text, are caught.
  const { fillNodes } = req("../src/lib/fill-nodes.tsx") as typeof import("../src/lib/fill-nodes.tsx");
  const old = [
    markup(fillNodes(dict.en.millionea.weekVoidingBody, { voided: "3", valid: "2", when: N.weekdayClock(dict.en as never, FRI_18) })),
    markup(fillNodes(dict.en.millionea.finalWeekAhead, { week: 52, date: "30 Nov" })),
  ];
  ok("12.3′ PLANT · the round-1 fills (the counts and the week's number bare) are reported", old.every((m) => bare(m).length > 0), j(old.map(bare)));
}

// ── §13 · L7 (round 2) · the loading drawing is the hub's frame ──────────────────────────────────────────────────────────
console.log("\n§13 · L7 (round 2) · the hub's loading drawing composes the page's own frame (hub-frame.ts): the reader's block last in the buy column, a guest's door by the shell's mark, every block sweeping");
// ⭐ The lead's round-2 ruling on R1-hub's loading row: the drawing is the hub's invariant frame, so the swap to the page
// moves nothing in the common states. Here, what it is made of, in three languages; the swap itself is measured in a
// browser (`qa:maswali-hub-states`' "ghost" state: every band's box, drawn and landed, for a reader holding none, one, many).
const ghostOf = (l: L3) => inApp(l, h(GH.MillioneaHubGhost as never, {} as never));
{
  const ORDER = ["strip", "jackpot", "door", "ledger", "mine", "questions"];
  const MEMBER = escAttr("[[data-viewer=guest]_&]:hidden"), GUEST = escAttr("hidden [[data-viewer=guest]_&]:block");
  const frameDefects = (l: L3, m: string) => {
    const d: string[] = [];
    const bands = [...m.matchAll(/data-ghost="([a-z]+)"/g)].map((x) => x[1]);
    if (j(bands) !== j(ORDER)) d.push(`${l}: bands ${j(bands)}`);
    for (const [name, cls] of [["grid", FRAME.HUB_GRID], ["buy column", FRAME.hubAside(true, true)], ["pinned pair", FRAME.HUB_PINNED]] as const) {
      if (count(m, `class="${escAttr(cls)}"`) !== 1) d.push(`${l}: the ${name} is not the frame's`);
    }
    const mine = tagWith(m, 'data-ghost="mine"'), ledger = tagWith(m, 'data-ghost="ledger"');
    if (!mine.includes(escAttr(FRAME.hubCell(true, "mine") ?? "\u0000")) || !ledger.includes(escAttr(FRAME.hubCell(true, "ledger") ?? "\u0000"))) d.push(`${l}: the ledger and the reader's block are not in the frame's cells`);
    if (count(m, `class="${escAttr(FRAME.HUB_QUESTIONS.row)} kp-shimmer-track"`) !== 10) d.push(`${l}: the question rows are not the page's rows`);
    if (!/aria-busy="true" data-ghost-page="hub"/.test(m)) d.push(`${l}: no data-ghost-page="hub" on the drawing's root`);
    return d;
  };
  const guestDefects = (l: L3, m: string) => {
    const d: string[] = [];
    if (!tagWith(m, 'data-ghost="mine"').includes(MEMBER)) d.push(`${l}: the reader's block is drawn for a guest`);
    if (count(m, `class="${MEMBER}"`) !== 1 || count(m, `class="${GUEST}"`) !== 1) d.push(`${l}: no player's door beside one guest's door (${count(m, `class="${MEMBER}"`)}/${count(m, `class="${GUEST}"`)})`);
    return d;
  };
  const sweepDefects = (l: L3, m: string) => {
    const d: string[] = [];
    for (const b of ["jackpot", "ledger"]) if (!/\bkp-shimmer-track\b/.test(tagWith(m, `data-ghost="${b}"`))) d.push(`${l}: the ${b} does not sweep`);
    if (!/class="mat-raised flex flex-col gap-1\.5 rounded-control p-2 kp-shimmer-track"/.test(m)) d.push(`${l}: the held ticket's block does not sweep`);
    return d;
  };
  const all = LOCALES.flatMap((l) => { const m = ghostOf(l); return [...frameDefects(l, m), ...guestDefects(l, m), ...sweepDefects(l, m)]; });
  ok("13.1 · in three languages the drawing's bands stand in the page's order — strip, jackpot, door, ledger, the reader's block LAST in the buy column, then the questions — in the frame's own grid, column, pinned pair and cells, with the page's ten question rows, marked data-ghost-page=\"hub\"", all.filter((x) => !/guest|sweep/.test(x)).length === 0, all.join(" | "));
  ok("13.2 · a guest's door is drawn beside the player's, each shown by the shell's mark (main[data-viewer=\"guest\"]), and no block of tickets for a guest", all.filter((x) => /guest/.test(x)).length === 0, all.join(" | "));
  ok("13.3 · every block sweeps with the platform's skeleton shimmer (the jackpot, the ledger, the held ticket's block)", all.filter((x) => /sweep/.test(x)).length === 0, all.join(" | "));
  const en = ghostOf("en");
  // PLANTS: the round-1 drawing (no reader's block: the ledger straight after the door), its column (no `lg:items-stretch`:
  // the blocks drawn ~250px wide in the 360px column), and a block that stands still.
  const noMine = en.replace(/<div class="[^"]*" data-ghost="mine">[\s\S]*?<\/div><\/div><\/div>/, "");
  ok("13.1′ PLANT · the round-1 drawing (the ledger straight after the door, no reader's block) is reported", noMine !== en && frameDefects("en", noMine).some((x) => x.includes("bands")), frameDefects("en", noMine).join(" | "));
  const narrow = en.replace(escAttr(FRAME.hubAside(true, true)), escAttr(FRAME.hubAside(true, true).replace(" lg:items-stretch", "")));
  ok("13.2′ PLANT · round 1's column (its blocks not stretched from 1024) is reported", narrow !== en && frameDefects("en", narrow).some((x) => x.includes("buy column")));
  const still = en.replace(/(class="[^"]*?) kp-shimmer-track([^"]*" data-ghost="ledger")/, "$1$2");
  ok("13.3′ PLANT · a ledger block that stands still is reported", still !== en && sweepDefects("en", still).some((x) => x.includes("ledger")));
}

// ── §14 · L6/L21 · the no-week body ─────────────────────────────────────────────────────────────────────────────────────
console.log("\n§14 · L6/L21 · the no-week empty state's body: the next open's day kept with its clock (A1), none while paused, zh's two sentences joined with no space");
{
  const W = req("../src/app/millionea/hub-words.tsx") as typeof import("../src/app/millionea/hub-words.tsx");
  const N = req("../src/components/maswali/maswali-format.ts") as typeof import("../src/components/maswali/maswali-format.ts");
  const ES = req("../src/components/ui/empty-state-text.ts") as typeof import("../src/components/ui/empty-state-text.ts");
  const MON = Date.parse("2026-12-07T00:01:00+03:00");
  const drawn = (body: import("../src/components/ui/empty-state-text.ts").EmptyStateBody) => renderToStaticMarkup(h("p", null, ES.emptyStateBody(body) as never));
  const keptRuns = (m: string) => [...m.matchAll(/<span class="whitespace-nowrap">([\s\S]*?)<\/span>/g)].map((x) => textOf(x[1]));
  const kept = (l: L3, m: string) => { const when = N.eatWeekdayClock(dict[l] as never, MON); return keptRuns(m).some((x) => x.includes(when)); };
  // ⭐ S5-R2-HUB · and every phrase Millionea keeps whole (`factRuns`): "Maswali 15" broke "Maswali" / "15" at sw 360.
  const FACTS = req("../src/components/maswali/maswali-facts.tsx") as typeof import("../src/components/maswali/maswali-facts.tsx");
  const looseOf = (l: L3, text: string, m: string) => FACTS.factRuns(l, text).filter((r) => !keptRuns(m).some((x) => x.includes(r)));
  const off = LOCALES.flatMap((l) => {
    const d: string[] = [];
    const body = W.noWeekBody(dict[l] as never, l, MON);
    const want = [fill(dict[l].millionea.nextOpensAt, { when: N.eatWeekdayClock(dict[l] as never, MON) }), dict[l].millionea.questionsAtOpen].join(l === "zh" ? "" : " ");
    if (body.text !== want) d.push(`${l}: "${body.text}"`);
    if (!kept(l, drawn(body))) d.push(`${l}: the day parts from its clock`);
    const loose = looseOf(l, body.text, drawn(body));
    if (FACTS.factRuns(l, body.text).length < 2 || loose.length > 0) d.push(`${l}: phrases not kept ${j(loose)}`);
    const paused = W.noWeekBody(dict[l] as never, l, null);
    if (paused.text !== dict[l].millionea.questionsAtOpen || paused.keep.some((x) => /\d{1,2}:\d{2}/.test(x))) d.push(`${l}: paused says "${paused.text}"`);
    return d;
  });
  ok("14.1 · in three languages the body is the next open's sentence then the questions' (zh joined with no space), the next open's day and clock one kept run, every phrase Millionea keeps whole (\"Maswali 15\") kept, and while paused only the questions' sentence", off.length === 0, off.join(" | "));
  const plain = drawn(W.noWeekBody(dict.sw as never, "sw", MON).text);
  ok("14.1′ PLANT · round 1's body (one plain string: nothing kept) is reported", !kept("sw", plain), plain.slice(0, 200));
  const swBody = W.noWeekBody(dict.sw as never, "sw", MON);
  const clockOnly = drawn({ text: swBody.text, keep: [N.eatWeekdayClock(dict.sw as never, MON)] });
  ok("14.1″ PLANT · the body keeping its clock alone (\"Maswali\" / \"15\" free to part) is reported", looseOf("sw", swBody.text, clockOnly).length > 0, clockOnly.slice(0, 200));
}

// ── §16 · L13 · a voided main's words are a fact line ──────────────────────────────────────────────────────────────────
console.log("\n§16 · L13 · a voided main's words that hold a \"·\" are a fact line (A1): each fact kept whole with its last two words, so no word stands alone on a line");
{
  const W = req("../src/app/millionea/hub-words.tsx") as typeof import("../src/app/millionea/hub-words.tsx");
  const FACTS = req("../src/components/maswali/maswali-facts.tsx") as typeof import("../src/components/maswali/maswali-facts.tsx");
  const keptRuns = (m: string) => [...m.matchAll(/<span class="whitespace-nowrap">([\s\S]*?)<\/span>/g)].map((x) => textOf(x[1]).trim());
  // The line's last two words (zh: its last two characters) inside one kept run — "…due to be voided" never leaves "voided".
  const tail = (l: L3, line: string) => { const last = FACTS.factsOf(line).at(-1) ?? ""; return l === "zh" ? last.slice(-2) : last.split(/\s+/).slice(-2).join(" "); };
  const voidDefects = (l: L3, key: "voidAwaiting" | "voidWeekCertain", m: string) => {
    const line = dict[l].millionea[key];
    const d: string[] = [];
    if (count(m, 'class="kp-mln-fact"') !== FACTS.factsOf(line).length) d.push(`${l} ${key}: not a fact line`);
    if (!keptRuns(m).some((x) => x.endsWith(tail(l, line)))) d.push(`${l} ${key}: its last pair is free to part`);
    return d;
  };
  const off = LOCALES.flatMap((l) => (["voidAwaiting", "voidWeekCertain"] as const).flatMap((k) => voidDefects(l, k, inApp(l, W.voidFactWords(l, dict[l].millionea[k])))));
  ok("16.1 · in three languages \"Void · a reserve will take its place\" and \"Void · too few reserves: the week is due to be voided\" are fact lines, their last two words one kept run", off.length === 0, off.join(" | "));
  const old = inApp("en", dict.en.millionea.voidWeekCertain);
  ok("16.1′ PLANT · round 1's plain sentence (\"voided\" free to stand alone) is reported", voidDefects("en", "voidWeekCertain", old).length > 0);
}

// ── §17 · 7b · the head's absent figure is the platform's empty slot ─────────────────────────────────────────────────────
console.log("\n§17 · the lead's 7b · a jackpot head with no figure to state (before sales, being voided, voided) shows the platform's empty slot: the em-dash in the faint ink, hidden from the screen reader as the market card hides it");
{
  // The market card's empty slot (`.mcardp-pct--empty`, DESIGN_AUTHORITY B6's noPrice): the em-dash in --text-faint.
  const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
  const EMPTY = `<span class="${FRAME.HUB_POOL_HEAD.figure}" data-testid="millionea-hub-figure"><span class="text-text-faint" aria-hidden="true">—</span></span>`;
  const slotOf = (m: string) => { const at = m.indexOf('data-testid="millionea-hub-figure"'); return at < 0 ? "" : m.slice(m.lastIndexOf("<span", at), m.indexOf("</span></span>", at) + 14); };
  const heads = LOCALES.map((l) => slotOf(headOf(l, VOIDING)));
  ok("17.1 · in three languages a head being voided draws its figure's slot as the platform's empty slot (the market card's: the em-dash in the faint ink, aria-hidden) — the head's line kept",
    /\.mcardp-pct--empty\s*\{\s*color:\s*var\(--text-faint\)/.test(css) && heads.every((x) => x === EMPTY), j(heads));
  const bright = headOf("en", VOIDING).replace('<span class="text-text-faint" aria-hidden="true">—</span>', "—");
  ok("17.1′ PLANT · round 1's bright \"—\" (the figure's own ink, read aloud) is reported", slotOf(bright) !== EMPTY);
}

// ── §15 · the segment's loading state draws the page being opened ────────────────────────────────────────────────────
console.log("\n§15 · Millionea's segment loading state (millionea/loading.tsx wraps every Millionea page) draws the page being opened: each page's own drawing by its address, the hub's for the hub; a census of every page");
// ⭐ The lead's item (REGISTER's measure, 2026-10-22: on a throttled hop between Millionea pages the HUB's drawing stood
// 14–22 s before How to play or the register landed). The pick (`MillioneaGhostPick`, the platform's `RoutePick`) is
// rendered at each page's address and must draw exactly what that page's own loading file draws.
{
  const atPath = (path: string, el: unknown, l: L3 = "sw") =>
    renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l } as never, el as never))));
  const pages = (readdirSync(join(ROOT, "src/app/millionea"), { recursive: true }) as string[])
    .map((p) => p.replace(/\\/g, "/")).filter((p) => p === "page.tsx" || p.endsWith("/page.tsx"));
  const addressOf = (p: string) => `/millionea${p === "page.tsx" ? "" : `/${p.replace(/\/page\.tsx$/, "")}`}`.replace(/\[[^\]]+\]/g, "MLN-2026-W49-000041");
  const picked = (address: string) => (GH.MILLIONEA_GHOST_ROUTES as readonly string[]).includes(address) || GH.MILLIONEA_GHOST_PATTERNS.some((s) => new RegExp(s).test(address));
  const unpicked = (list: string[]) => list.map(addressOf).filter((a) => !picked(a));
  ok(`15.1 · the census: every Millionea page (${pages.length}: ${pages.map(addressOf).join(", ")}) is named by the pick — an address or a pattern`, pages.length >= 7 && unpicked(pages).length === 0, j(unpicked(pages)));
  ok("15.1′ PLANT · a new Millionea page with no pick is reported", unpicked([...pages, "archive/page.tsx"]).includes("/millionea/archive"));
  // Each page's drawing, at its address: the pick draws what the page's own loading file draws, in three languages; the hub
  // its own drawing; an address with no page of its own, the hub's.
  const own = (p: string) => (req(join(ROOT, "src/app/millionea", p.replace(/page\.tsx$/, "loading.tsx"))) as { default: () => unknown }).default;
  const differs = LOCALES.flatMap((l) => pages.flatMap((p) => {
    const a = addressOf(p);
    const want = p === "page.tsx" ? atPath(a, h(GH.MillioneaHubGhost as never), l) : atPath(a, h(own(p) as never), l);
    return atPath(a, h(GH.MillioneaGhostPick as never), l) === want ? [] : [`${l} ${a}`];
  }));
  const elsewhere = atPath("/millionea/elsewhere", h(GH.MillioneaGhostPick as never)) === atPath("/millionea/elsewhere", h(GH.MillioneaHubGhost as never));
  ok("15.2 · in three languages, at each page's address the pick draws exactly what that page's own loading file draws (the hub its own drawing); an address with no page, the hub's", differs.length === 0 && elsewhere, j(differs));
  // A journey reader's Tiketi zangu (its Millionea kind under the journey's own head) is the journey's route ghost, handed in;
  // every other page stays one drawing for both shells.
  const J = h("i", { "data-journey-route": "" });
  const journeyAt = (a: string) => atPath(a, h(GH.MillioneaGhostPick as never, { journey: J } as never));
  ok("15.3 · for a journey reader the tickets page is the journey's own route ghost; How to play and the hub are the same drawings as for a classic reader",
    journeyAt("/millionea/tickets").includes("data-journey-route") && journeyAt("/millionea/how") === atPath("/millionea/how", h(GH.MillioneaGhostPick as never)) && !journeyAt("/millionea").includes("data-journey-route"));
  // PLANT · the loading file as it was: the hub's drawing whatever the page being opened.
  const howOwn = atPath("/millionea/how", h(own("how/page.tsx") as never));
  ok("15.2′ PLANT · the old loading state (the hub's drawing on the way to How to play) is reported", atPath("/millionea/how", h(GH.MillioneaHubGhost as never)) !== howOwn);
}

console.log(`\n${"═".repeat(70)}\n  MASWALI HUB: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run prints (S5-DESIGN-HUB 3: 34; 4, the one ledger and zh's spacing rule: 43; 6, one
 *  carry origin: 45; 7, no door to a week the register does not draw yet: 47; 9, one final-week rule and last week's
 *  words: 50; 10, a time's face: 53; round 2, every numeral of the timed sentences: 55; S5-R2-HUB, the rule's balance, the
 *  drawing's frame, the no-week body and the segment's pick: 70; the void words' fact lines, the head's empty slot and
 *  the no-week body's kept phrases: 75). It only rises. */
const MIN_ASSERTIONS = 75;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
