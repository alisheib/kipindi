/**
 * test:maswali-design-register — THE SHARED PIECES THE REGISTER LANE OWNS FOR EVERY MILLIONEA SURFACE (MASWALI-BUILD
 * S5-DESIGN-REGISTER, 2026-10-21 — Ali's 10/10 pass; the register critic's H3, H5, L2 and the motion critic's M5, H6).
 *
 *   npx tsx scripts/maswali-design-register.test.mts               (npm run test:maswali-design-register)
 *   npx tsx scripts/maswali-design-register.test.mts --prove-red   (npm run red:maswali-design-register)
 *
 *   §1 THE KIT ReceiptRow's sentence-case label (`labelStyle="sentence"`) and its `note` line: extended, never forked —
 *      every existing caller's props render the SAME BYTES as the component at cdb4bf46e (blob-pinned), in en, sw and zh;
 *      the sentence label is the body face (no capitals, no tracking, no mono), its ink the row's, a total's semibold, a
 *      muted row's muted at the ledger's figure size; the note stands on its own line under the label.
 *   §2 THE ONE MILLIONEA LEDGER (`millioneaLedgerRows` + `MaswaliLedger`): MR-26's identity as two matching totals, each
 *      computed from its own components, in every week a settlement can close (won with and without a remainder, topped up
 *      to the floor, nobody won, voided with refunds landed or on their way, the sunset's top score) and in How to play's
 *      two examples priced by `settleArithmetic`; the rows in the order the money moved; the floor muted unless it bound;
 *      the fee the platform's signed amber figure with its levies as one muted line; every amount an unbroken `.amount`
 *      run and no label in capitals; a carry linked to its week, and hidden at 0; the live and voiding kinds the hub adopts;
 *      a sentence with no figure (a voiding week's refund-if-it-stands, the sunset's no top-up) standing alone, no dash.
 *   §3 THE ONE WEEK CHIP (`WeekStateChip`): every state a public week can be in — selling, paused, sales closed, results
 *      coming in, the objection window, settling, being voided, settled, voided — its word `weekPhaseWord`'s, its tone
 *      status-tone's Millionea week row (rendered), a settled week slate and never the resolved seal (the exception row
 *      with its reason); and the `/results` caller's chip byte-identical to the one before.
 *   §4 THE CARRY (`MaswaliCarry`, `maswali-seal-line.tsx`): one pure measurement — the token's scale the two boxes'
 *      heights (the annex glyph's 18px into a main's 24px: 0.75), its offset centre to centre — that plays only with both
 *      ends wholly in the viewport; a run counter instead of a remount; the origin vacated while the token flies and its
 *      mark settled in on landing; `onEnd` on landing or at once when nothing plays; the seal line names the annex GLYPH
 *      box as the origin, strikes a void main's number in the muted ink, and keeps its second line in both frames; How
 *      to play's example opens on its before frame and says "ended" only once the token has landed.
 *   §5 HOW TO PLAY (the register critic's How rows): step 3 the hub's headline, the slip's reserve sentence, the rules a
 *      first visit needs (a week voided whole, where a win is paid, the objection window, the cap, responsible play with
 *      its door); the page's order and measures, ending on the hub and the register; the worked weeks the one ledger's
 *      rows from the settlement's arithmetic; Millionea's spaced Chinese in the window's duration; its loading drawing's
 *      button at the height the page's own Button resolves to.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect in an IN-MEMORY copy (a compiled source, a helper, a
 *    word) and requires the check it targets to fail; a plant whose text is not in its file exactly once is INCONCLUSIVE.
 *    No file is written. Pure: React's server renderer inside the app's providers; no server, no database, no network.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { decomment, decommentCss } from "./lib/decomment.mts";

process.exitCode = 1;
const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
const raw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const squash = (s: string) => s.replace(/\s+/g, " ");
const j = (v: unknown) => JSON.stringify(v);
const count = (s: string, needle: string) => s.split(needle).length - 1;

/* ── the renderer: React's server renderer inside the root layout's providers (r5j's harness) ────────────────────────── */
type Locale = "en" | "sw" | "zh";
const LOCALES: Locale[] = ["en", "sw", "zh"];
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Locale, Record<string, Record<string, unknown>>> };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Locale; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (l: Locale, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: "/" }, h(I18nProvider as never, { initial: l } as never, el as never))));
const textOf = (m: string) => m.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** A module compiled from SOURCE TEXT at a real file's path (its imports resolve as that file's would). */
function compileAt(rel: string, source: string): Record<string, unknown> {
  const at = req.resolve(`../${rel}`);
  const live = (req.cache as Record<string, NodeModule>)[at] ?? (req(at), (req.cache as Record<string, NodeModule>)[at]);
  const compiled = ts.transpileModule(source, {
    fileName: at,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const m = new NodeModule(at);
  m.filename = at;
  m.paths = live.paths;
  (m as NodeModule & { _compile(source: string, filename: string): void })._compile(compiled, at);
  return m.exports as Record<string, unknown>;
}

/* ── the files and the units under test ──────────────────────────────────────────────────────────────────────────────── */
const FILES = {
  row: "src/components/ui/receipt-row.tsx",
  ledger: "src/components/maswali/maswali-ledger.tsx",
  parts: "src/app/millionea/register/register-parts.tsx",
  carry: "src/components/maswali/maswali-carry.tsx",
  seal: "src/components/maswali/maswali-seal-line.tsx",
  tone: "src/lib/status-tone.ts",
  css: "src/app/globals.css",
  example: "src/app/millionea/how/how-example.tsx",
  how: "src/app/millionea/how/page.tsx",
  line: "src/components/maswali/maswali-unbroken-line.tsx",
  ghost: "src/app/millionea/how/how-ghost.tsx",
} as const;
type FileKey = keyof typeof FILES;

/** The kit row as it was before the sentence variant: cdb4bf46e, the design lanes' base, at its exact blob. */
const BEFORE_REF = "cdb4bf46e:src/components/ui/receipt-row.tsx";
const BEFORE_BLOB = "cd6b37e40fafc6a88ca8316af8fdb5f9e64052cd";
const beforeBlob = execFileSync("git", ["rev-parse", BEFORE_REF], { cwd: ROOT, encoding: "utf8" }).trim();
const beforeSource = execFileSync("git", ["show", BEFORE_REF], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n");
const BeforeRow = compileAt(FILES.row, beforeSource).ReceiptRow as (p: Record<string, unknown>) => unknown;
/** The /results caller's chip as it was before every week state got one (register-parts at cdb4bf46e). */
const BEFORE_PARTS_REF = "cdb4bf46e:src/app/millionea/register/register-parts.tsx";
const BEFORE_PARTS_BLOB = "f0db0031e780f0ba49722fd89eab185bfad20a7b";
const beforePartsBlob = execFileSync("git", ["rev-parse", BEFORE_PARTS_REF], { cwd: ROOT, encoding: "utf8" }).trim();
const BeforeChip = compileAt(FILES.parts, execFileSync("git", ["show", BEFORE_PARTS_REF], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n")).WeekStateChip as (p: Record<string, unknown>) => unknown;

type Row = (p: Record<string, unknown>) => unknown;
type LedgerRow = { key: string; label: unknown; note?: unknown; value: unknown; emphasis?: string; tone?: string; divider?: boolean; gap?: boolean; href?: string | null };
type LedgerFn = (t: unknown, locale: Locale, f: Record<string, unknown>) => LedgerRow[];
type Geometry = (o: Box, d: Box, v: { width: number; height: number }) => { dx: number; dy: number; s: number } | null;
type Box = { left: number; top: number; width: number; height: number };

const L = {
  row: req(`../${FILES.row}`) as { ReceiptRow: Row },
  ledger: req(`../${FILES.ledger}`) as { millioneaLedgerRows: LedgerFn; MaswaliLedger: Row },
  parts: req(`../${FILES.parts}`) as { WeekStateChip: Row; WeekRow: Row; weekChipKey: (s: string, p: unknown, paused?: boolean) => string; weekChipWord: (t: unknown, s: string, p: unknown, paused?: boolean) => string },
  carry: req(`../${FILES.carry}`) as { carryGeometry: Geometry },
  seal: req(`../${FILES.seal}`) as { MaswaliSealLine: Row; sealLineOf: (q: unknown[], picks: unknown, o?: unknown) => unknown },
  example: req(`../${FILES.example}`) as { HowExample: Row },
  ghost: req(`../${FILES.ghost}`) as { MillioneaHowGhost: Row },
  tone: req(`../${FILES.tone}`) as { STATUS_TONE: Record<string, Record<string, string>>; STATUS_TONE_EXCEPTIONS: Record<string, string>; TONE_CHIP: Record<string, string>; playerStatusChip: (w: string) => string | null },
  view: req("../src/app/millionea/millionea-view.ts") as { weekPhaseWord: (t: unknown, s: string, p: unknown) => string },
  money: req("../src/lib/maswali-money.ts") as { settleArithmetic: (i: Record<string, unknown>) => Record<string, number> & { kind: string } },
  utils: req("../src/lib/utils.ts") as { formatTzs: (n: number) => string; formatTzsSigned: (n: number) => string; fill: (s: string, v: Record<string, unknown>) => string },
};
const { formatTzs, formatTzsSigned, fill } = L.utils;

/** Everything a check may look at — the real one, or a copy with one defect planted. */
type World = {
  src: Record<FileKey, string>;
  dict: typeof dict;
  /** The blob the parity baseline was read at. */
  beforeBlob: string;
  Row: Row;
  ledger: LedgerFn;
  Ledger: Row;
  Chip: Row;
  WeekRow: Row;
  chipKey: (s: string, p: unknown, paused?: boolean) => string;
  geometry: Geometry;
  Seal: Row;
  Example: Row;
  Ghost: Row;
};
const REAL: World = {
  src: Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, raw(f)])) as Record<FileKey, string>,
  dict,
  beforeBlob,
  Row: L.row.ReceiptRow,
  ledger: L.ledger.millioneaLedgerRows,
  Ledger: L.ledger.MaswaliLedger,
  Chip: L.parts.WeekStateChip,
  WeekRow: L.parts.WeekRow,
  chipKey: L.parts.weekChipKey,
  geometry: L.carry.carryGeometry,
  Seal: L.seal.MaswaliSealLine,
  Example: L.example.HowExample,
  Ghost: L.ghost.MillioneaHowGhost,
};
const code = (w: World, k: FileKey) => squash(decomment(w.src[k]));

type Check = { id: string; label: string; run: (w: World) => [boolean, string] };
const CHECKS: Check[] = [];
const check = (id: string, label: string, run: (w: World) => [boolean, string]) => CHECKS.push({ id, label, run });

// ── §1 · the kit ReceiptRow ─────────────────────────────────────────────────────────────────────────────────────────────
const amount = (n: number) => h("span", { className: "amount" }, formatTzs(n));
/** Every caller's props as written at cdb4bf46e (deposit, withdraw, the win ledger, How to play's worked ledger), and a
 *  matrix of every emphasis × tone × divider × alignEnd × money × label kind, so a change to ANY path the old props reach
 *  shows. Labels in the caller's own words. */
const callerCases = (l: Locale): Array<[string, Record<string, unknown>]> => {
  const t = dict[l] as unknown as Record<string, Record<string, string>>;
  const ROW = "border-b border-border py-1.5";
  return [
    ["deposit · amount", { emphasis: "amount", label: t.common.amountLabel, value: formatTzs(25_000) }],
    ["deposit · via", { label: t.common.via, value: "M-Pesa" }],
    ["deposit · phone", { label: t.auth.phone, value: "+255 712 345 678" }],
    ["withdraw · fee", { emphasis: "fee", tone: "warning", label: t.wallet.taxNotice, value: `−${formatTzs(375)}` }],
    ["withdraw · you receive", { emphasis: "total", divider: true, label: t.dialog.youReceive, value: formatTzs(24_625) }],
    ["withdraw · recipient checking", { emphasis: "muted", label: t.common.recipient, value: t.common.recipientChecking }],
    ["withdraw · recipient", { divider: true, alignEnd: true, label: t.common.recipient, value: "Asha Juma Mwinyi" }],
    ["win ledger · pool", { className: ROW, label: t.millionea.poolTotal, value: amount(1_050_000) }],
    ["win ledger · fee", { tone: "warning", emphasis: "fee", label: "Fee 13%", value: h("span", { className: "amount" }, formatTzsSigned(-136_500)) }],
    ["win ledger · top-up node label", { className: `${ROW} text-text-muted`, label: h("span", null, t.millionea.topUp, " · ", t.millionea.topUpNote), value: amount(699_995) }],
    ["win ledger · empty value", { className: ROW, label: "Week 48: no 10/10 ticket", value: "" }],
    ["win ledger · net", { className: ROW, emphasis: "total", label: t.millionea.yourNet, value: h("span", { className: "amount" }, formatTzsSigned(-1_000)) }],
    ["How · sold", { className: ROW, label: "1,050 tickets at TZS 1,000", value: amount(1_050_000) }],
    ...(["row", "amount", "fee", "total", "muted"] as const).flatMap((emphasis) =>
      ([undefined, "warning", "no", "yes"] as const).flatMap((tone) =>
        [false, true].flatMap((divider) => [false, true].flatMap((money) => [false, true].map((alignEnd): [string, Record<string, unknown>] => [
          `matrix · ${emphasis}/${tone ?? "-"}/${divider ? "divider" : "-"}/${money ? "money" : "-"}/${alignEnd ? "end" : "-"}`,
          { emphasis, tone, divider, money, alignEnd, label: tone ? "Ada ya kutoa pesa" : h("b", null, "Node label"), value: formatTzs(1_234), className: "x" },
        ]))))),
  ];
};
check("1.0", "the before-source is the design lanes' base cdb4bf46e, at its exact blob — a moving or missing baseline proves nothing", (w) =>
  [w.beforeBlob === BEFORE_BLOB && beforeSource.includes("export function ReceiptRow(") && !beforeSource.includes("labelStyle"), w.beforeBlob]);
check("1.1", "EXTEND, NEVER FORK: every existing caller's props (deposit, withdraw, the win ledger, How's worked ledger) and a 160-case matrix of every emphasis × tone × divider × money × alignEnd render the SAME BYTES as before, in en, sw and zh", (w) => {
  const off: string[] = [];
  let n = 0;
  for (const l of LOCALES) for (const [name, props] of callerCases(l)) {
    n++;
    const before = inApp(l, h(BeforeRow as never, props as never));
    const now = inApp(l, h(w.Row as never, props as never));
    if (before !== now) off.push(`${l}/${name}`);
  }
  return [off.length === 0 && n >= 3 * 170, `${n} cases; differ: ${off.slice(0, 6).join(" | ")}`];
});
/** The label span's class attribute in a rendered row (its first span, or the first inside the note's column). */
const labelClass = (markup: string) => /<div class="[^"]*"><span class="([^"]*)"/.exec(markup)?.[1] ?? /<span class="flex min-w-0 flex-col gap-0.5"><span class="([^"]*)"/.exec(markup)?.[1] ?? "";
check("1.2", "the sentence label is the body face — `text-body-sm`, never the eyebrow's capitals, tracking or mono — in the row's ink (`text-text`), a muted row's muted, a total's semibold; a toned row's label takes the row's tone (no ink of its own)", (w) => {
  const r = (p: Record<string, unknown>) => labelClass(inApp("en", h(w.Row as never, { labelStyle: "sentence", label: "Ticket sales", value: "x", ...p } as never)));
  const plain = r({}), muted = r({ emphasis: "muted" }), total = r({ emphasis: "total" }), fee = r({ tone: "warning", emphasis: "fee" });
  const caps = [plain, muted, total, fee].some((c) => /\b(uppercase|eyebrow|font-mono|text-micro)\b/.test(c));
  const ok = /\btext-body-sm\b/.test(plain) && /\btext-text\b/.test(plain) && /\btext-text-muted\b/.test(muted) && /\bfont-semibold\b/.test(total)
    && !/\btext-text(-muted)?\b/.test(fee) && !caps;
  return [ok, j({ plain, muted, total, fee })];
});
check("1.3", "a muted sentence row keeps the ledger's figure size in the muted ink (13px, semibold) — a quieter line of the list, not the confirm's 12px \"still resolving\" figure", (w) => {
  const m = inApp("en", h(w.Row as never, { labelStyle: "sentence", emphasis: "muted", label: "Guaranteed floor", value: amount(1_000_000) } as never));
  const value = /<\/span><span class="([^"]*)"><span class="amount">/.exec(m)?.[1] ?? "";
  return [/\btext-\[13px\]/.test(value) && /\bfont-semibold\b/.test(value) && /\btext-text-muted\b/.test(value) && !/text-\[12px\]|text-text-subtle/.test(value), value];
});
check("1.4", "`note` stands on its own line under the label, in the muted ink, inside one column whose first line the figure shares — never after a \"·\" on the label's line", (w) => {
  const m = inApp("en", h(w.Row as never, { labelStyle: "sentence", label: "Ticket sales", note: "1,050 tickets at TZS 1,000", value: amount(1_050_000) } as never));
  const col = m.includes('<span class="flex min-w-0 flex-col gap-0.5"><span class="min-w-0 text-body-sm text-text">Ticket sales</span><span class="text-body-sm text-text-muted">');
  return [col && !textOf(m).includes("·"), m.slice(0, 260)];
});

// ── §2 · the one Millionea ledger ─────────────────────────────────────────────────────────────────────────────────────
const RATES = { traTaxOnCommissionRate: 0.1, gbtLevyOnCommissionRate: 0.05 };
/** A won week's figures from `settleArithmetic` — the one formula settlement pays by — as the register reads them. */
function wonWeek(o: { R?: number; S: number; k: number; floor?: number; price?: number; carriedTo?: number | null; sunset?: { score: number } }) {
  const R = o.R ?? 0, floor = o.floor ?? 1_000_000, price = o.price ?? 1_000;
  const a = L.money.settleArithmetic({ rolloverIn: R, sales: o.S, winners: o.k, floor: o.sunset ? 0 : floor, feeRate: 0.13, rates: RATES });
  return {
    kind: "won", price, tickets: o.S / price, sales: o.S,
    carryIn: R > 0 ? { amount: R, week: 46, href: "/millionea/register/MLN-2026-W46" } : null,
    floor: o.sunset ? null : floor, topUp: a.U, jackpot: a.J, feePct: 13, fee: a.F,
    levies: { tra: a.tra, gbt: a.gbt, traPct: 10, gbtPct: 5 }, winners: o.k, toWinners: a.J - a.F, share: a.share, paid: a.paid,
    remainder: a.dust, carriedForward: a.carryOut > 0 ? { amount: a.carryOut, week: o.carriedTo === undefined ? 49 : o.carriedTo, href: "/millionea/register/MLN-2026-W49" } : null,
    refunds: null, sunset: o.sunset ? { score: o.sunset.score, tickets: o.k } : null,
    // what the identity's sides are, from the arithmetic — never read back from the rows
    _in: R + o.S + a.U, _out: a.F + a.paid + a.carryOut,
  };
}
const CASES: Record<string, Record<string, unknown> & { _in: number; _out: number }> = {
  dust: wonWeek({ S: 1_051_000, k: 7 }),
  topped: wonWeek({ S: 300_000, k: 7 }),
  plain: wonWeek({ R: 389_000, S: 661_000, k: 3 }),
  sunset: wonWeek({ R: 389_000, S: 212_000, k: 2, sunset: { score: 9 } }),
  howShared: wonWeek({ S: 1_050_000, k: 3 }),
  howFloor: wonWeek({ S: 300_000, k: 1 }),
  rolled: {
    kind: "rolled", price: 1_000, tickets: 212, sales: 212_000, carryIn: { amount: 389_000, week: 46, href: "/millionea/register/MLN-2026-W46" },
    floor: 1_000_000, topUp: 0, jackpot: null, feePct: 13, fee: 0, levies: null, winners: 0, toWinners: null, share: null, paid: null,
    remainder: null, carriedForward: { amount: 601_000, week: 48, href: "/millionea/register/MLN-2026-W48" }, refunds: null, sunset: null,
    _in: 601_000, _out: 601_000,
  },
  voided: {
    kind: "voided", price: 1_000, tickets: 30, sales: 30_000, carryIn: { amount: 412_000, week: 45, href: "/millionea/register/MLN-2026-W45" },
    floor: null, topUp: 0, jackpot: null, feePct: 13, fee: null, levies: null, winners: 0, toWinners: null, share: null, paid: null,
    remainder: null, carriedForward: { amount: 412_000, week: 49, href: "/millionea/register/MLN-2026-W49" }, refunds: { amount: 30_000, landed: true }, sunset: null,
    _in: 442_000, _out: 442_000,
  },
  voidedPending: {
    kind: "voided", price: 1_000, tickets: 30, sales: 30_000, carryIn: null,
    floor: null, topUp: 0, jackpot: null, feePct: 13, fee: null, levies: null, winners: 0, toWinners: null, share: null, paid: null,
    remainder: null, carriedForward: null, refunds: { amount: 30_000, landed: false }, sunset: null,
    _in: 30_000, _out: 30_000,
  },
};
const CLOSED_CASES = Object.keys(CASES);
const tzs = (s: string) => Number(s.replace(/[^\d−-]/g, "").replace("−", "-"));
/** The text of every `white-space: nowrap` run in a markup, each read to its OWN closing tag (a run may hold spans). */
const keptTexts = (markup: string): string[] => {
  const out: string[] = [];
  const open = '<span class="whitespace-nowrap">';
  for (let at = markup.indexOf(open); at >= 0; at = markup.indexOf(open, at + 1)) {
    let depth = 0, i = at;
    for (; i < markup.length; i++) {
      if (markup.startsWith("<span", i)) depth++;
      else if (markup.startsWith("</span>", i) && --depth === 0) break;
    }
    out.push(textOf(markup.slice(at, i)));
  }
  return out;
};
type Rendered = { key: string; label: string; note: string; value: string; markup: string; row: LedgerRow };
const rowsOf = (w: World, l: Locale, f: Record<string, unknown>): Rendered[] =>
  w.ledger(dict[l] as never, l, f).map((r) => {
    const markup = inApp(l, h(React.Fragment, null, r.label as never, " | ", (r.note ?? "") as never, " | ", r.value as never));
    const [label, note, value] = textOf(markup).split(" | ");
    return { key: r.key, label, note, value, markup, row: r };
  });
check("2.1", "MR-26 ON ITS FACE: \"Money in\" is the sum of the rows above it (carried in + ticket sales + top-up) and \"Money out\" is fee + paid to winners + carried forward (a voided week: refunds + the carry handed on) — each from its own components, and the two match, in every closed week and both How examples, in en, sw and zh", (w) => {
  const off: string[] = [];
  for (const l of LOCALES) for (const name of CLOSED_CASES) {
    const f = CASES[name];
    const rows = rowsOf(w, l, f);
    const moneyIn = rows.find((r) => r.key === "moneyIn"), moneyOut = rows.find((r) => r.key === "moneyOut");
    const ins = rows.slice(0, rows.findIndex((r) => r.key === "moneyIn")).reduce((s, r) => s + tzs(r.value), 0);
    const inV = moneyIn ? tzs(moneyIn.value) : NaN, outV = moneyOut ? tzs(moneyOut.value) : NaN;
    const words = moneyIn?.label === dict[l].millionea.ledgerMoneyIn && moneyOut?.label === dict[l].millionea.ledgerMoneyOut;
    if (!(inV === f._in && outV === f._out && inV === outV && ins === inV && words)) off.push(`${l}/${name}: in ${inV} (rows ${ins}, want ${f._in}) out ${outV} (want ${f._out}) words ${words}`);
  }
  // ⛔ NEVER PAPERED OVER: a record whose two sides disagree (a damaged settlement: one shilling paid short) prints each
  // total from its own components, so the mismatch shows — a total copied from the other side would hide it.
  const damaged = { ...CASES.plain, paid: (CASES.plain.paid as number) - 1 };
  const rows = rowsOf(w, "en", damaged);
  const inV = tzs(rows.find((r) => r.key === "moneyIn")?.value ?? ""), outV = tzs(rows.find((r) => r.key === "moneyOut")?.value ?? "");
  if (!(inV === CASES.plain._in && outV === CASES.plain._out - 1)) off.push(`damaged: in ${inV} out ${outV}`);
  return [off.length === 0, off.join(" | ")];
});
check("2.2", "the rows stand in the order the money moved: carried in → sales → top-up → Money in → floor → Jackpot → fee → To winners → ÷ k → remainder → carried forward → Money out (a voided week: refunds → carried on again → Money out; nobody won: floor → fee 0 → carried forward → Money out)", (w) => {
  const want: Record<string, string[]> = {
    dust: ["sales", "moneyIn", "floor", "jackpot", "fee", "winners", "share", "dust", "out", "moneyOut"],
    topped: ["sales", "topup", "moneyIn", "floor", "jackpot", "fee", "winners", "share", "moneyOut"],
    plain: ["in", "sales", "moneyIn", "floor", "jackpot", "fee", "winners", "share", "moneyOut"],
    sunset: ["in", "sales", "moneyIn", "noTopUp", "jackpot", "fee", "winners", "share", "moneyOut"],
    rolled: ["in", "sales", "moneyIn", "floor", "fee", "out", "moneyOut"],
    voided: ["in", "sales", "moneyIn", "refund", "again", "moneyOut"],
  };
  const off = Object.entries(want).filter(([name, keys]) => j(rowsOf(w, "en", CASES[name]).map((r) => r.key)) !== j(keys))
    .map(([name]) => `${name}: ${j(rowsOf(w, "en", CASES[name]).map((r) => r.key))}`);
  return [off.length === 0, off.join(" | ")];
});
check("2.3", "the floor is a quiet (muted) line unless it bound — full ink only in the week the house topped the jackpot up to it; the two totals sit under a hairline; no row carries a rule of its own", (w) => {
  const floorOf = (name: string) => rowsOf(w, "en", CASES[name]).find((r) => r.key === "floor")?.row.emphasis;
  const totals = CLOSED_CASES.every((n) => rowsOf(w, "en", CASES[n]).filter((r) => r.row.divider).map((r) => r.key).join() === "moneyIn,moneyOut");
  return [floorOf("dust") === "muted" && floorOf("plain") === "muted" && floorOf("rolled") === "muted" && floorOf("topped") === undefined && totals,
    j({ dust: floorOf("dust"), topped: floorOf("topped"), rolled: floorOf("rolled"), totals })];
});
check("2.4", "the fee taken is the platform's signed figure in the receipt's amber (\"−TZS 136,630\"), its levies ONE muted line out of the fee with both amounts — never a row each, never from a player — and a week nobody won takes \"TZS 0\"", (w) => {
  const off = LOCALES.flatMap((l) => {
    const fee = rowsOf(w, l, CASES.dust).find((r) => r.key === "fee");
    const rolled = rowsOf(w, l, CASES.rolled).find((r) => r.key === "fee");
    const levy = fee?.note ?? "";
    const ok = fee?.value === formatTzsSigned(-136_630) && fee.row.tone === "warning" && fee.row.emphasis === "fee"
      && levy.includes(formatTzs(13_663)) && levy.includes(formatTzs(6_832)) && levy.includes("TRA") && levy.includes("GBT")
      && !rowsOf(w, l, CASES.dust).some((r) => r.key === "tra" || r.key === "gbt") && rolled?.value === "TZS 0";
    // Each levy is one run — its name, its share and its amount — so "TRA" is never torn from "10%" at 320 (the tile read).
    const runs = fee ? keptTexts(inApp(l, h(React.Fragment, null, fee.row.note as never))) : [];
    const whole = [`TRA 10% ${formatTzs(13_663)}`, `GBT 5% ${formatTzs(6_832)}`].every((x) => runs.some((r) => r.includes(x)));
    return ok && whole ? [] : [`${l}: ${j({ fee: fee?.value, levy, rolled: rolled?.value, runs })}`];
  });
  return [off.length === 0, off.join(" | ")];
});
check("2.5", "every amount the ledger prints — in a value, a label or a note — is one unbroken `.amount` run (never letter-spaced, never split from its digits), and no label is set in capitals", (w) => {
  const off: string[] = [];
  for (const l of LOCALES) for (const name of CLOSED_CASES) for (const r of rowsOf(w, l, CASES[name])) {
    const loose = r.markup.replace(/<span class="amount">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "");
    if (/TZS\s?[\d−-]/.test(loose)) off.push(`${l}/${name}/${r.key}: ${loose.slice(0, 80)}`);
  }
  const drawn = inApp("en", h(w.Ledger as never, { rows: w.ledger(dict.en as never, "en", CASES.dust) } as never));
  const caps = /class="[^"]*\b(uppercase|eyebrow)\b[^"]*"/.test(drawn.replace(/<span class="[^"]*kp-mln-facts[^"]*"/g, ""));
  return [off.length === 0 && !caps, j({ off: off.slice(0, 4), caps })];
});
check("2.6", "\"Money out\" says what it is made of on its own line — fee, paid to winners, carried forward, each amount the arithmetic's — because \"To winners\" holds the remainder too; a carry of nothing is no part (L11: never \"carried forward TZS 0\")", (w) => {
  const off = LOCALES.flatMap((l) => {
    const out = rowsOf(w, l, CASES.dust).find((r) => r.key === "moneyOut");
    const note = out?.note ?? "";
    // howShared: 3 winners share J − F exactly — nothing carried on, so the note names two parts.
    const none = rowsOf(w, l, CASES.howShared).find((r) => r.key === "moneyOut")?.note ?? "";
    const carry = (dict[l].millionea as Record<string, string>).ledgerOutParts.split(" · ")[2].replace("{carried}", "").trim();
    return note.includes(formatTzs(136_630)) && note.includes(formatTzs(914_368)) && note.includes(formatTzs(2))
      && none.length > 0 && !none.includes(carry) && !none.includes(formatTzs(0)) ? [] : [`${l}: ${note} | ${none}`];
  });
  return [off.length === 0, off.join(" | ")];
});
check("2.7", "a carry names the chain's week and opens its register page (M10) — the whole row the link, at least 40px tall — and a week that carried nothing in prints no carry row (hidden at 0)", (w) => {
  const rows = rowsOf(w, "en", CASES.plain);
  const into = rows.find((r) => r.key === "in");
  const drawn = inApp("en", h(w.Ledger as never, { rows: w.ledger(dict.en as never, "en", CASES.plain) } as never));
  const link = [...drawn.matchAll(/<a [^>]*>/g)].some((m) => m[0].includes('href="/millionea/register/MLN-2026-W46"') && m[0].includes("min-height:var(--h-control-md)"));
  const none = !rowsOf(w, "en", CASES.dust).some((r) => r.key === "in");
  return [into?.label === "Carried in from Week 46" && into.row.href === "/millionea/register/MLN-2026-W46" && link && none, j({ label: into?.label, link, none })];
});
check("2.8", "a voided week says \"every ticket refunded\" only once every refund landed — until then that the money is on its way back (muted) — and hands its carry on in full to the chain's next week", (w) => {
  const off = LOCALES.flatMap((l) => {
    const m = dict[l].millionea as Record<string, string>;
    const landed = rowsOf(w, l, CASES.voided), pending = rowsOf(w, l, CASES.voidedPending);
    const ok = landed.find((r) => r.key === "refund")?.label === m.refundEach.replace("{price}", "TZS 1,000")
      && pending.find((r) => r.key === "refund")?.label === m.refundEachPending.replace("{price}", "TZS 1,000")
      && pending.find((r) => r.key === "refund")?.row.emphasis === "muted"
      && landed.find((r) => r.key === "again")?.label === m.carriedOutAgain.replace("{week}", "49");
    return ok ? [] : [`${l}: ${j(landed.map((r) => [r.key, r.label]))}`];
  });
  return [off.length === 0, off.join(" | ")];
});
check("2.9", "the hub's kinds (round 2): a live week prints its pool so far (\"at least\" while its carry waits), the floor, the jackpot and the fee's rate in words — and no Money out, nothing having gone out; a voiding week its refund-if-it-stands, no jackpot", (w) => {
  const live = { kind: "live", price: 1_000, tickets: 42, sales: 42_000, carryIn: { amount: null, week: 47 }, floor: 1_000_000, topUp: 0, jackpot: 1_000_000, jackpotAtLeast: true, feePct: 13, fee: null, levies: null, winners: 0, toWinners: null, share: null, paid: null, remainder: null, carriedForward: null, refunds: null, sunset: null };
  const rows = rowsOf(w, "en", live);
  const voiding = rowsOf(w, "en", { ...live, kind: "voiding", carryIn: null, jackpot: null });
  const ok = j(rows.map((r) => r.key)) === j(["in", "sales", "pool", "floor", "jackpot", "fee"]) && rows.find((r) => r.key === "pool")?.value === "at least TZS 42,000"
    && rows.find((r) => r.key === "in")?.value === "Not yet settled" && rows.find((r) => r.key === "fee")?.value === "13% at payout"
    && rows.find((r) => r.key === "floor")?.row.emphasis === undefined
    && j(voiding.map((r) => r.key)) === j(["sales", "pool", "refund"]);
  return [ok, j({ live: rows.map((r) => [r.key, r.value]), voiding: voiding.map((r) => r.key) })];
});
check("2.10", "the drawing is the kit's own: every row a sentence-case ReceiptRow, a step of space before the first row after \"Money in\", and no hairline under every row (`border-b`)", (w) => {
  const drawn = inApp("sw", h(w.Ledger as never, { rows: w.ledger(dict.sw as never, "sw", CASES.dust) } as never));
  const rows = count(drawn, "data-ledger-row=");
  const sentence = count(drawn, 'class="min-w-0 text-body-sm');
  return [rows === 10 && sentence >= 10 && !/border-b\b/.test(drawn) && drawn.includes("mt-3"), j({ rows, sentence })];
});
// The tile read of 2026-10-21 (How, sw 320): Money out's parts wrapped to six lines in the label's column beside the total's
// figure ("Ada TZS 136,500 / imelipwa kwa / washindi / TZS 913,500 / imehamishwa / TZS 0"); a line of figures runs the row's
// whole width instead — the fee's levies and Money out's parts — while a label's own detail stays under its label.
// ⚠️ RE-PINNED 2026-10-21 (the lead's ruling, from TICKETS' tile ticket-wonBig-sw-320-s2): EVERY row's note stands on its own
// line under the label and the figure, across the row's whole width — never in the label's column beside a figure — and a
// note's parts are each ONE unbroken run, so at 320 they stack whole and wider they flow (never "imelipwa kwa" / "washindi").
check("2.12", "every row's note stands on its own line under its label and its figure, across the row's whole width (the kit row's note face, never in the label's column), and each part of a note's line — the fee's levies, Money out's parts, the sunset's top score — is ONE unbroken run, in sw, en and zh", (w) => {
  const off: string[] = [];
  const WIDE = 'class="mt-0.5 block text-body-sm text-text-muted"';
  for (const l of LOCALES) {
    for (const name of ["dust", "topped", "sunset"]) {
      const f = CASES[name];
      const rows = w.ledger(dict[l] as never, l, f);
      const drawn = inApp(l, h(w.Ledger as never, { rows } as never));
      const seg = (key: string) => drawn.split('data-ledger-row="').find((s) => s.startsWith(`${key}"`)) ?? "";
      for (const r of rows.filter((x) => x.note !== undefined && x.note !== null)) if (!seg(r.key).includes(WIDE)) off.push(`${l}/${name}/${r.key}: not across the row`);
      if (drawn.includes('class="text-body-sm text-text-muted"')) off.push(`${l}/${name}: a note in the label's column`);
      for (const key of ["fee", "moneyOut", "share"]) {
        const r = rows.find((x) => x.key === key);
        if (!r?.note) continue;
        const parts = textOf(inApp(l, h(React.Fragment, null, r.note as never))).split(" · ").map((p) => p.trim()).filter(Boolean);
        const runs = keptTexts(inApp(l, h(React.Fragment, null, r.note as never)));
        const torn = parts.filter((p) => !runs.some((x) => x.trim() === p));
        if (torn.length) off.push(`${l}/${name}/${key}: ${j(torn)}`);
      }
    }
  }
  return [off.length === 0, off.slice(0, 6).join(" | ")];
});
// ⚠️ ADDED 2026-10-21 (the lead, for the HUB lane: R1-hub L15 asks for no dash, H1 forbids a figure there): a sentence with no
// figure stands alone — the dash beside it read as a missing figure.
const VOIDING = { kind: "voiding", price: 1_000, tickets: 42, sales: 42_000, carryIn: null, floor: null, topUp: 0, jackpot: null, feePct: 13, fee: null, levies: null, winners: 0, toWinners: null, share: null, paid: null, remainder: null, carriedForward: null, refunds: null, sunset: null };
check("2.11", "a sentence with no figure stands alone: a voiding week's \"If the void stands, every ticket is refunded TZS 1,000\" and the sunset's \"No top-up to the floor · no 10/10\" print no \"—\" and no figure beside them, rendered in en, sw and zh", (w) => {
  const off: string[] = [];
  for (const l of LOCALES) {
    const m = dict[l].millionea as Record<string, string>;
    for (const [name, f, key] of [["voiding", VOIDING, "refund"], ["sunset", CASES.sunset, "noTopUp"]] as const) {
      const r = rowsOf(w, l, f as Record<string, unknown>).find((x) => x.key === key);
      const drawn = inApp(l, h(w.Ledger as never, { rows: w.ledger(dict[l] as never, l, f as Record<string, unknown>) } as never));
      const row = drawn.split('data-ledger-row="').find((s) => s.startsWith(`${key}"`)) ?? "";
      const words = key === "refund" ? r?.label === m.refundEachIfVoid.replace("{price}", "TZS 1,000") : r?.label.replace(/\s+/g, " ").includes(m.noTopUp.split(" · ")[0]);
      // The sentence's own price is its words (an `.amount` run inside the label); the row holds no figure beyond them.
      const figures = r ? count(row, 'class="amount"') - count(inApp(l, r.row.label as never), 'class="amount"') : -1;
      if (!r || !words || r.value !== "" || r.row.value != null || row.includes("—") || figures !== 0) off.push(`${l}/${name}: ${j({ label: r?.label, value: r?.value, dash: row.includes("—"), figures })}`);
    }
  }
  return [off.length === 0, off.join(" | ")];
});

// ── §3 · the one week chip ────────────────────────────────────────────────────────────────────────────────────────────
const PHASES: Array<[string, string, { kind: string; objectionsUntil: number | null } | null, boolean, string, string]> = [
  // name, state, phase, paused, the status-tone key, the chip variant it must render
  ["selling", "OPEN", null, false, "MILLIONEA_WEEK_OPEN", "pending"],
  ["paused", "OPEN", null, true, "MILLIONEA_WEEK_PAUSED", "neutral"],
  ["sales closed", "CLOSED", { kind: "state", objectionsUntil: null }, false, "MILLIONEA_WEEK_CLOSED", "pending"],
  ["results coming in", "RESOLVING", { kind: "state", objectionsUntil: null }, false, "MILLIONEA_WEEK_RESOLVING", "pending"],
  ["objection window", "RESOLVING", { kind: "objections", objectionsUntil: 1 }, false, "MILLIONEA_WEEK_OBJECTIONS", "pending"],
  ["settling", "RESOLVING", { kind: "settling", objectionsUntil: null }, false, "MILLIONEA_WEEK_SETTLING", "pending"],
  ["being voided", "CLOSED", { kind: "voiding", objectionsUntil: null }, false, "MILLIONEA_WEEK_VOIDING", "pending"],
  ["settled", "SETTLED", null, false, "MILLIONEA_WEEK_SETTLED", "neutral"],
  ["voided", "VOIDED", null, false, "MILLIONEA_WEEK_VOIDED", "neutral"],
];
check("3.1", "every state a public week can be in wears its status-tone row, rendered: in flight royal (selling, sales closed, results coming in, the objection window, settling, being voided), an officer's pause slate, settled and voided slate — never a variant typed beside the word", (w) => {
  const off = PHASES.flatMap(([name, state, phase, paused, key, variant]) => {
    const m = inApp("en", h(w.Chip as never, { t: dict.en, state, phase, paused } as never));
    const got = /data-kit-chip-variant="([^"]+)"/.exec(m)?.[1];
    return w.chipKey(state, phase, paused) === key && got === variant ? [] : [`${name}: ${w.chipKey(state, phase, paused)} → ${got}`];
  });
  return [off.length === 0, off.join(" | ")];
});
check("3.2", "the chip's word is the week's phase word in every language — `weekPhaseWord`'s (\"Objection window\", \"Settling\", \"Week is being voided\", the state's own) — and \"Paused for now\" on a paused selling week", (w) => {
  const off = LOCALES.flatMap((l) => PHASES.flatMap(([name, state, phase, paused]) => {
    const m = textOf(inApp(l, h(w.Chip as never, { t: dict[l], state, phase, paused } as never)));
    const want = paused ? (dict[l].millionea as Record<string, string>).pausedShort : L.view.weekPhaseWord(dict[l], state, phase ?? { kind: "state", objectionsUntil: null });
    return m === want ? [] : [`${l}/${name}: ${m} ≠ ${want}`];
  }));
  return [off.length === 0, off.join(" | ")];
});
check("3.3", "a settled week is slate, never the resolved seal (§M8a item 7) — its divergence from RESOLVED written in STATUS_TONE_EXCEPTIONS with its reason; VOIDED reads VOID's own slate and is no exception", (w) => {
  const tone = L.tone;
  const settled = tone.STATUS_TONE.MILLIONEA_WEEK_SETTLED?.player, voided = tone.STATUS_TONE.MILLIONEA_WEEK_VOIDED?.player;
  const src = code(w, "tone");
  const exceptions = src.slice(src.indexOf("export const STATUS_TONE_EXCEPTIONS"));
  const row = /MILLIONEA_WEEK_SETTLED: \{ player: "slate" \}/.test(src) && typeof tone.STATUS_TONE_EXCEPTIONS.MILLIONEA_WEEK_SETTLED === "string"
    && /MILLIONEA_WEEK_SETTLED: "Slate on a settled Millionea week's word \(§M8a item 7/.test(exceptions) && !/MILLIONEA_WEEK_VOIDED:/.test(exceptions);
  return [settled === "slate" && voided === tone.STATUS_TONE.VOID.player && tone.TONE_CHIP[settled] !== tone.TONE_CHIP[tone.STATUS_TONE.RESOLVED.player] && row,
    j({ settled, voided, row })];
});
check("3.4", "the `/results` section's call (a final week's state alone) renders the SAME BYTES as the chip before every week state got one (register-parts at cdb4bf46e, blob-pinned), in en, sw and zh", (w) => {
  const off = LOCALES.flatMap((l) => (["SETTLED", "VOIDED"] as const).flatMap((state) => {
    const before = inApp(l, h(BeforeChip as never, { t: dict[l], state } as never));
    const now = inApp(l, h(w.Chip as never, { t: dict[l], state } as never));
    return before === now ? [] : [`${l}/${state}`];
  }));
  return [beforePartsBlob === BEFORE_PARTS_BLOB && off.length === 0, j({ blob: beforePartsBlob, off })];
});

check("3.5", "ONE WEEK ROW (L3, /results adopts it): rendered, its facts are a fact list (`kp-mln-facts--phone`: one per line below 768, the platform's separators from 768) that ends at the row's end from 1024 (`lg:ml-auto`, the content `flex-1`, the week's column `shrink-0`), under the testid /results reads; the row draws no rule and no \"·\" of its own — the list divides its rows", (w) => {
  const m = inApp("sw", h(w.WeekRow as never, { t: dict.sw, code: "MLN-2026-W48", chip: h(w.Chip as never, { t: dict.sw, state: "VOIDED" } as never), facts: ["Kila tiketi imerejeshwa", "ada 0"] } as never));
  const li = /^<li>/.test(m);
  const facts = m.includes('<span class="min-w-0 text-body-sm text-text-muted lg:ml-auto" data-testid="millionea-week-facts"><span class="kp-mln-facts kp-mln-facts--phone">');
  const content = m.includes('<span class="flex min-w-0 flex-1 flex-col gap-1">') && m.includes('<span class="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 md:w-[280px]">');
  const handDots = (m.replace(/<span class="sr-only"> · <\/span>/g, "").match(/·/g) ?? []).length;
  const link = /<a [^>]*href="\/millionea\/register\/MLN-2026-W48"/.test(m) && m.includes("min-height:var(--h-control-lg)");
  return [li && facts && content && handDots === 0 && link, j({ li, facts, content, handDots, link })];
});

// ── §4 · the carry ────────────────────────────────────────────────────────────────────────────────────────────────────
const VIEW = { width: 360, height: 780 };
check("4.1", "THE TOKEN AT ITS TRUE SCALE: the carry's scale is the ratio of the two boxes' HEIGHTS — the annex glyph's 18px into a main's 24px is 0.75, whatever stands beside the glyph (\"↪4\" is 26px wide) — and its offset is centre to centre", (w) => {
  const g = w.geometry({ left: 100, top: 400, width: 26, height: 18 }, { left: 40, top: 360, width: 24, height: 24 }, VIEW);
  return [!!g && g.s === 0.75 && g.dx === 100 + 13 - (40 + 12) && g.dy === 400 + 9 - (360 + 12), j(g)];
});
check("4.2", "BOTH ENDS IN VIEW (H6): nothing plays when the origin or the destination is not wholly inside the viewport — above, below, left or right — or when a box is empty; a carry with both ends on screen plays", (w) => {
  const d = { left: 40, top: 360, width: 24, height: 24 };
  const outs: Box[] = [{ left: 100, top: -10, width: 18, height: 18 }, { left: 100, top: 775, width: 18, height: 18 }, { left: -4, top: 400, width: 18, height: 18 }, { left: 350, top: 400, width: 18, height: 18 }, { left: 100, top: 2_400, width: 18, height: 18 }, { left: 100, top: 400, width: 0, height: 0 }];
  const offOrigin = outs.filter((o) => w.geometry(o, d, VIEW) !== null).length;
  const offDest = outs.filter((o) => w.geometry(d, o, VIEW) !== null).length;
  const plays = w.geometry({ left: 100, top: 400, width: 18, height: 18 }, d, VIEW) !== null;
  return [offOrigin === 0 && offDest === 0 && plays, j({ offOrigin, offDest, plays })];
});
check("4.3", "A RUN COUNTER, NEVER A REMOUNT: the carry re-measures and re-runs on the caller's `run`; How to play's example passes it and no longer keys the line on it (the line blanked for a frame)", (w) => {
  const c = code(w, "carry"), ex = code(w, "example");
  const deps = c.includes("}, [from, play, index, run]);");
  const noKey = !/MaswaliSealLine key=/.test(ex) && /play=\{\{ carry: run > 0, run/.test(ex);
  return [deps && noKey, j({ deps, noKey })];
});
check("4.4", "THE ORIGIN IS VACATED WHILE THE TOKEN FLIES and its mark settles in on landing: the run hides the origin (`.kp-mln-carry-vacated`, visibility only — its box keeps its place) and on its own animationend restores it with `.g-settle`; `onEnd` runs on landing, or at once when nothing plays", (w) => {
  const c = code(w, "carry"), css = decommentCss(w.src.css);
  const hide = c.includes("origin.classList.add(VACATED);") && c.includes('const VACATED = "kp-mln-carry-vacated";');
  const land = c.includes("origin.classList.remove(VACATED);") && c.includes('origin.classList.add("g-settle");');
  const end = c.includes("if (!origin || !g) { endRef.current?.(); return; }") && c.includes("if (landed) {");
  const rule = /\.kp-mln-carry-vacated\s*\{\s*visibility:\s*hidden;\s*\}/.test(css);
  return [hide && land && end && rule, j({ hide, land, end, rule })];
});
/** The example's illustrative record: main 4 voided, reserve A1 standing in, every pick YES. */
const exampleQs = [
  ...Array.from({ length: 10 }, (_, i) => ({ role: "MAIN", ordinal: i + 1, outcome: i + 1 === 4 ? "VOID" : "YES" })),
  ...Array.from({ length: 5 }, (_, i) => ({ role: "RESERVE", ordinal: i + 1, outcome: "YES" })),
];
const picks = Array.from({ length: 15 }, () => "YES");
check("4.5", "the seal line names the annex GLYPH box as the carry's origin (`#…-a1` wraps the glyph, not its column with the label under it), so the token's measured height is the glyph's", (w) => {
  const after = L.seal.sealLineOf(exampleQs, picks, { final: true });
  const m = inApp("en", h(w.Seal as never, { line: after, size: 24, numbers: true, idBase: "x" } as never));
  const onGlyph = /<span class="flex flex-col items-center gap-0.5"><span id="x-a1" class="inline-flex">/.test(m);
  const onColumn = /<span[^>]*id="x-a1"[^>]*class="flex flex-col/.test(m);
  return [onGlyph && !onColumn, m.slice(m.indexOf('id="x-a1"') - 80, m.indexOf('id="x-a1"') + 60)];
});
check("4.6", "a voided main's number is struck, the strike in the number's own ink (the border ink drew ~2.2:1; the eyebrow keeps its one ink), and its cell keeps a second line in BOTH frames (empty before a reserve stands in, the reserve's label after), so the row never changes height at the swap — and a week voided whole keeps none", (w) => {
  const before = inApp("en", h(w.Seal as never, { line: L.seal.sealLineOf(exampleQs, picks), size: 24, numbers: true, idBase: "x" } as never));
  const after = inApp("en", h(w.Seal as never, { line: L.seal.sealLineOf(exampleQs, picks, { final: true }), size: 24, numbers: true, idBase: "x" } as never));
  const voidWeek = inApp("en", h(w.Seal as never, { line: L.seal.sealLineOf(exampleQs, picks, { weekVoid: true }), size: 24, numbers: true } as never));
  const strike = '<s class="decoration-current">4</s>';
  const ok = before.includes(`${strike}<span class="invisible">A1</span>`) && after.includes(`${strike}<span>A1</span>`)
    && voidWeek.includes(strike) && !voidWeek.includes('class="invisible"') && !before.includes("decoration-border-strong");
  return [ok, j({ before: before.includes(strike), after: after.includes(`${strike}<span>A1</span>`) })];
});
// M7 (the register critic) · M5 (the motion critic): the example teaches with the motion or without it.
check("4.7", "M7 · M5 · How's example opens on the BEFORE frame — main 4 void with its number struck, A1–A5 standing by, no reserve carried, no Unbroken Line — and the tap draws the after frame in place; \"↪4\", the Unbroken Line, \"Replay\" and \"Example ended\" come only once the token has landed (at once under a clamp); the button keeps one width for both labels", (w) => {
  const ex = code(w, "example"), how = code(w, "how");
  const frames = how.includes("return { before: sealLineOf(qs, picks), after: sealLineOf(qs, picks, { final: true }) };") && how.includes("<HowExample before={before} after={after} caption={caption} />");
  const machine = ex.includes("const ended = run > 0 && landed === run;") && ex.includes("const line = run === 0 ? before : ended ? after : { ...after, unbroken: false };")
    && ex.includes("play={{ carry: run > 0, run, draw: ended, onCarried: () => setLanded(run) }}") && ex.includes("const label = landed > 0 ? t.millionea.replay : t.millionea.seeExample;")
    && ex.includes('<span role="status" className="text-body-sm text-text-subtle">{ended ? t.millionea.exampleEnded : ""}</span>')
    && count(ex, 'className={cn("col-start-1 row-start-1", label !== t.millionea.') === 2;
  const before = L.seal.sealLineOf(exampleQs, picks), after = L.seal.sealLineOf(exampleQs, picks, { final: true });
  const m = inApp("en", h(w.Example as never, { before, after, caption: "c" } as never));
  const opens = m.includes('<s class="decoration-current">4</s><span class="invisible">A1</span>') && !m.includes("leading-none text-text-muted tabular-nums")
    && m.includes('<span role="status" class="text-body-sm text-text-subtle"></span>');
  return [frames && machine && opens, j({ frames, machine, opens })];
});
// The tile read of 2026-10-21 (How's example, sw 360, its end frame): the drawn Unbroken Line rested broken — sockets 1–4 and
// 8–10 joined, 4–8 bare. Chromium lays a non-scaling stroke's dash in screen pixels, not in the path's own length, so the
// draw-on's 100-long dash became a 100px dash and a 100px gap. The line is horizontal in a 1-unit-tall box: its stroke is 1px
// with or without the vector effect, so the effect goes and the dash is the path's own length again.
check("4.8", "the Unbroken Line (and the closing rule) draws on in the path's own length and rests whole: no non-scaling stroke beside `pathLength` and the draw-on's dash, which Chromium lays in screen pixels (a 100px dash, a 100px gap)", (w) => {
  const s = code(w, "line");
  const own = s.includes("pathLength={100}") && s.includes("strokeDasharray: 100, strokeDashoffset: 100");
  const screen = /vectorEffect|vector-effect/.test(s);
  return [own && !screen, j({ own, screen })];
});

// ── §5 · How to play (the register critic's How rows) ────────────────────────────────────────────────────────────────
check("5.1", "M6 · H1 · L7 · L5 · L13 · How says what a first visit needs: step 3 the hub's own headline (\"Jackpot at least {floor} · shared equally by every 10/10 ticket · {pct}% fee at payout\"; the rule alone at a floor of 0); the reserve step the slip's own sentence; the rules add a week voided whole, where a win is paid, the objection window by its one name, the cap in the slip's phrase, and that limits, Take a break and Self-exclude cover Millionea — with the footer's own \"Set limits\" door", (w) => {
  const s = code(w, "how");
  const headline = s.includes("? fill(t.millionea.ruleWithFigure, { amount: fill(t.millionea.atLeast, { amount: formatTzs(h.floor) }), pct }) : fill(t.millionea.ruleShared, { pct });")
    && s.includes('<MaswaliFacts key="headline" facts={factsOf(headline).map((f) => keepFact(locale, f))} />') && !s.includes("howThree");
  const rules = ["keepFact(locale, fill(t.millionea.ruleVoidWeek, { price: formatTzs(h.ticketPrice) }))", "keepFact(locale, t.millionea.ruleWinPaid)",
    "keepFact(locale, fill(t.millionea.ruleCheck, { hours: spacedDuration(locale, h.objectionWindowHours) }))", "keepFact(locale, fill(t.millionea.ruleCap, { cap: h.ticketCap }))",
    "<span>{keepFact(locale, t.millionea.ruleRg)}</span>", "{t.footer.setLimits}", 'const LIMITS_HREF = "/profile/responsible-gambling";'].filter((x) => !s.includes(x));
  const m = (l: Locale) => w.dict[l].millionea as Record<string, string>;
  const slip = LOCALES.filter((l) => !m(l).howTwo.startsWith(m(l).reserveRule) || !m(l).capRule.startsWith(m(l).ruleCap));
  const words = [m("en").ruleVoidWeek, m("sw").ruleWinPaid, m("zh").ruleCheck, m("en").ruleRg];
  const want = ["More main questions void than valid reserves? The whole week is void and every ticket is refunded {price}, with no fee",
    "Ushindi unalipwa kwenye salio kuu wiki ikikamilika", "派奖前设有 {hours}的异议窗口", "Your limits, Take a break and Self-exclude cover Millionea too"];
  return [headline && rules.length === 0 && slip.length === 0 && j(words) === j(want), j({ headline, rules, slip, words })];
});
check("5.2", "L12 · L15 · M4 · M8 · the page reads in order — the four steps, the week's timeline right after them, the titled examples, the categories, the rules — prose at /fairness's reading measure, the example cards at the receipt's, and it ends on the hub and the register", (w) => {
  const s = code(w, "how");
  const at = ['<ol className="flex max-w-[68ch] flex-col gap-3">', '<section aria-labelledby="mln-how-timeline"', '<section aria-labelledby="mln-how-examples"',
    '<section aria-labelledby="mln-how-categories"', '<section aria-labelledby="mln-how-rules"', "<MillioneaReadingLinks t={t} how={false} hub />"].map((x) => s.indexOf(x));
  const order = at.every((x, i) => x >= 0 && (i === 0 || x > at[i - 1]));
  const heads = ["mln-how-timeline", "mln-how-examples", "mln-how-categories", "mln-how-rules"].every((id) => s.includes(`<h2 id="${id}" className={H2}>`));
  const measure = s.includes('<article aria-labelledby="mln-how-ex-swap" className="mat-raised flex max-w-receipt flex-col gap-3 rounded-card p-3">')
    && s.includes('<article aria-labelledby={id} className="mat-flat flex max-w-receipt flex-col gap-3 rounded-card p-3">')
    && s.includes('<ul className="flex max-w-[68ch] flex-col divide-y divide-border border-t border-border">');
  return [order && heads && measure, j({ at, heads, measure })];
});
check("5.3", "H3 · H5 · How's two worked weeks are the ONE Millionea ledger's rows, every figure the settlement's own arithmetic from the frozen rules (`millioneaExamplesFor`) — no figure made on the page", (w) => {
  const s = code(w, "how");
  const rows = s.includes('const rows = millioneaLedgerRows(t, locale, { kind: "won", price: h.ticketPrice, tickets: ex.tickets, sales: ex.sales, carryIn: null, floor: h.floor, topUp: f.U, jackpot: f.J, feePct: pctNum(h.feeRate), fee: f.F, levies: { tra: f.tra, gbt: f.gbt, traPct: pctNum(h.traRate), gbtPct: pctNum(h.gbtRate) }, winners: ex.winners, toWinners: f.J - f.F, share: f.share, paid: f.paid, remainder: f.dust, carriedForward: f.carryOut > 0 ? { amount: f.carryOut, week: null } : null, refunds: null, sunset: null, });')
    && s.includes("<MaswaliLedger rows={rows} />");
  const fn = s.slice(s.indexOf("function WorkedWeek("), s.indexOf("export default async function"));
  const made = /formatTzs|formatTzsSigned|ReceiptRow|\* h\.|Math\./.test(fn);
  return [rows && !made, j({ rows, made })];
});
check("5.4", "L9 · Millionea's Chinese sets a digit apart from an ideograph in the window's duration (\"派奖前设有 24 小时的异议窗口\"; the platform's duration word glues them) — other languages untouched", (w) => {
  const s = code(w, "how");
  const fn = s.includes('return locale === "zh" ? s.replace(/(\\d)(?=[㐀-䶿一-鿿豈-﫿])/g, "$1 ") : s;') && s.includes("hours: spacedDuration(locale, h.objectionWindowHours)");
  const zh = fill(w.dict.zh.millionea.ruleCheck as string, { hours: "24 小时" });
  return [fn && zh === "派奖前设有 24 小时的异议窗口", j({ fn, zh })];
});

// Round 2 (2026-10-22): one heading wrap on the register's pages — How's section headings and its cards' titles balance their
// lines (`text-balance`, the platform's heading wrap), as the week page's and the index's do (test:maswali-register 16.5).
check("5.5", "How's headings balance their lines — its section headings (H2) and its three cards' titles (H3) — as every heading of the register's pages does", (w) => {
  const s = code(w, "how");
  const h2 = s.includes('const H2 = "font-display text-title-sm font-bold text-text text-balance";');
  const h3 = count(s, 'className="font-display text-body-lg font-semibold text-text text-balance"') === 2 && !s.includes('className="font-display text-body-lg font-semibold text-text"');
  return [h2 && h3, j({ h2, h3 })];
});

// Round 2 (2026-10-22, the release's test:ui-consistency red): How's loading drawing drew the example's button with `h-10`,
// which the product's overridden spacing scale makes 80px — the page's Button is the kit's md rung, 44px.
/** The product's spacing scale as `tailwind.config.ts` overrides it (the parse `spacing-scale.test.mts` uses). */
const SPACING = new Map([...(/spacing:\s*\{([\s\S]*?)\n\s{6}\},/.exec(raw("tailwind.config.ts"))?.[1] ?? "").matchAll(/"([\d.]+)":\s*"(\d+)px"/g)].map((m) => [m[1], Number(m[2])]));
/** The px height a rendered class list asks for — a kit button's rung (`.btn-md` → its `--h-control-*` token), a token, a
 *  px literal, or a key of the overridden scale — resolved through `globals.css` and `tailwind.config.ts`; null when none. */
const heightPx = (css: string, cls: string): number | null => {
  const token = (name: string) => { const m = new RegExp(`--${name}:\\s*(\\d+(?:\\.\\d+)?)px;`).exec(css); return m ? Number(m[1]) : null; };
  let px: number | null = null;
  for (const c of cls.split(/\s+/)) {
    let m: RegExpExecArray | null;
    if ((m = /^btn-(xs|sm|md|lg|xl)$/.exec(c))) { const r = new RegExp(`\\.btn-${m[1]}\\s*\\{\\s*height:\\s*var\\(--([\\w-]+)\\)`).exec(css); px = r ? token(r[1]) : null; }
    else if ((m = /^h-\[var\(--([\w-]+)\)\]$/.exec(c))) px = token(m[1]);
    else if ((m = /^h-\[(\d+(?:\.\d+)?)px\]$/.exec(c))) px = Number(m[1]);
    else if ((m = /^h-([\d.]+)$/.exec(c))) px = SPACING.get(m[1]) ?? null;
  }
  return px;
};
check("5.6", "How's loading drawing draws the example's button at the height the page's own Button resolves to — both read off their RENDERED class lists and resolved to px through the kit's tokens and the overridden spacing scale (a numeric utility like `h-10` is 80px here; the kit's md rung is 44px), in en, sw and zh", (w) => {
  const css = decommentCss(w.src.css);
  const before = L.seal.sealLineOf(exampleQs, picks), after = L.seal.sealLineOf(exampleQs, picks, { final: true });
  const out = LOCALES.map((l) => {
    const g = inApp(l, h(w.Ghost as never, {} as never));
    const at = g.lastIndexOf("max-w-receipt");
    const card = at < 0 ? "" : g.slice(at, g.indexOf("</div>", at));
    const bars = [...card.matchAll(/<span aria-hidden="true" class="([^"]+)"><\/span>/g)].map((m) => m[1]);
    const page = inApp(l, h(w.Example as never, { before, after, caption: "c" } as never));
    const tag = /<button[^>]*data-testid="millionea-how-example-play"[^>]*>/.exec(page)?.[0] ?? "";
    const button = /class="([^"]+)"/.exec(tag)?.[1] ?? "";
    return { l, bars: bars.length, ghost: bars.length ? heightPx(css, bars[bars.length - 1]) : null, page: heightPx(css, button) };
  });
  const scale = SPACING.get("10") === 80 && SPACING.get("3") === 16;
  return [scale && out.every((o) => o.bars === 6 && o.ghost !== null && o.ghost === o.page), j({ scale, out })];
});

// ── the run ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function runAll(w: World, quiet: boolean): { pass: number; fail: number; failed: string[] } {
  let pass = 0, fail = 0;
  const failed: string[] = [];
  for (const c of CHECKS) {
    let ok = false, detail = "";
    try { [ok, detail] = c.run(w); } catch (e) { detail = `threw: ${String((e as Error).message ?? e)}`; }
    if (ok) pass++; else { fail++; failed.push(c.id); }
    if (!quiet) console.log(`${ok ? "PASS" : "FAIL"} ${c.id} · ${c.label}${ok ? "" : ` — ${detail}`}`);
  }
  return { pass, fail, failed };
}

if (!PROVE_RED) {
  const { pass, fail } = runAll(REAL, false);
  console.log(`\n${"═".repeat(70)}\n  MASWALI DESIGN REGISTER: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
  /** The floor is the count a green run PRINTS; it only rises, to a printed number. */
  const MIN_ASSERTIONS = CHECKS.length;
  if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
  process.exit(fail === 0 ? 0 : 1);
}

// ── --prove-red: every check must be able to fail. Each plant lives on an in-memory copy. ─────────────────────────────
const base = runAll(REAL, true);
if (base.fail !== 0) { console.log(`INCONCLUSIVE: the real tree already fails ${base.failed.join(", ")}`); process.exit(1); }
const problems: string[] = [];
/** The source of one file with `from` replaced by `to` — null (inconclusive) unless `from` is there exactly once. */
const planted = (k: FileKey, from: string, to: string): string | null => {
  const n = REAL.src[k].split(from).length - 1;
  if (n !== 1) { problems.push(`PLANT MISSED in ${FILES[k]}: ${j(from.slice(0, 80))} is there ${n} times, not once`); return null; }
  return REAL.src[k].replace(from, to);
};
const plantSrc = (k: FileKey, from: string, to: string): World | null => {
  const s = planted(k, from, to);
  return s === null ? null : { ...REAL, src: { ...REAL.src, [k]: s } };
};
/** A world whose kit row is compiled from a planted copy of its source. */
const plantRow = (from: string, to: string): World | null => {
  const s = planted("row", from, to);
  return s === null ? null : { ...REAL, Row: compileAt(FILES.row, s).ReceiptRow as Row };
};
/** A world whose ledger (builder and drawing) is compiled from a planted copy of its source. */
const plantLedger = (from: string, to: string): World | null => {
  const s = planted("ledger", from, to);
  if (s === null) return null;
  const mod = compileAt(FILES.ledger, s) as { millioneaLedgerRows: LedgerFn; MaswaliLedger: Row };
  return { ...REAL, ledger: mod.millioneaLedgerRows, Ledger: mod.MaswaliLedger };
};
/** A world whose seal line is compiled from a planted copy of its source. */
const plantSeal = (from: string, to: string): World | null => {
  const s = planted("seal", from, to);
  return s === null ? null : { ...REAL, Seal: compileAt(FILES.seal, s).MaswaliSealLine as Row };
};
/** A world whose How example is compiled from a planted copy of its source (its source pinned, its first frame rendered). */
const plantExample = (from: string, to: string): World | null => {
  const s = planted("example", from, to);
  return s === null ? null : { ...REAL, src: { ...REAL.src, example: s }, Example: compileAt(FILES.example, s).HowExample as Row };
};
/** A world whose How loading drawing is compiled from a planted copy of its source. */
const plantGhost = (from: string, to: string): World | null => {
  const s = planted("ghost", from, to);
  return s === null ? null : { ...REAL, src: { ...REAL.src, ghost: s }, Ghost: compileAt(FILES.ghost, s).MillioneaHowGhost as Row };
};
/** A world with one Millionea word changed in one language. */
const plantWord = (l: Locale, key: string, value: string): World =>
  ({ ...REAL, dict: { ...dict, [l]: { ...dict[l], millionea: { ...dict[l].millionea, [key]: value } } } as typeof dict });
/** A world whose register parts (the chip) are compiled from a planted copy of their source. */
const plantParts = (from: string, to: string): World | null => {
  const s = planted("parts", from, to);
  if (s === null) return null;
  const mod = compileAt(FILES.parts, s) as { WeekStateChip: Row; WeekRow: Row; weekChipKey: World["chipKey"] };
  return { ...REAL, Chip: mod.WeekStateChip, WeekRow: mod.WeekRow, chipKey: mod.weekChipKey };
};
const PLANTS: Array<[string, string, World | null]> = [
  // §1
  ["the eyebrow label repainted (a fork of the old look)", "1.1", plantRow('const LABEL = "min-w-0 font-mono text-micro uppercase eyebrow text-text-subtle";', 'const LABEL = "min-w-0 font-mono text-micro uppercase eyebrow text-text-muted";')],
  ["a toned row's eyebrow label given its own ink", "1.1", plantRow('<span className={toneCls ? "min-w-0 font-mono text-micro uppercase eyebrow" : LABEL}>', '<span className={toneCls ? "min-w-0 font-mono text-micro uppercase eyebrow text-text" : LABEL}>')],
  ["the sentence label falls back to the eyebrow's capitals", "1.2", plantRow('const sentence = labelStyle === "sentence";', "const sentence = false;")],
  ["a total's sentence label not semibold", "1.2", plantRow('emphasis === "total" && "font-semibold")', 'emphasis === "total" && "font-medium")')],
  ["a muted sentence row drawn at the confirm's 12px subtle figure", "1.3", plantRow('const valueCls = sentence && emphasis === "muted" ? SENTENCE_MUTED_VALUE : VALUE[emphasis];', "const valueCls = VALUE[emphasis];")],
  ["the note joined onto the label's line", "1.4", plantRow('<span className="flex min-w-0 flex-col gap-0.5">', '<span className="flex min-w-0 flex-row gap-0.5">')],
  // §2
  ["Money out copied from Money in (never its own components)", "2.1", plantLedger("value: money(fee + paid + carried),", "value: money(inTotal),")],
  ["the top-up left out of Money in", "2.1", plantLedger("const inTotal = (carryIn?.amount ?? 0) + f.sales + f.topUp;", "const inTotal = (carryIn?.amount ?? 0) + f.sales;")],
  ["the top-up printed after the fee again (H5)", "2.2", (() => {
    const s0 = planted("ledger", '  if (f.topUp > 0) rows.push({ key: "topup", label: m.topUp, note: m.topUpNote, value: money(f.topUp) });\n', "");
    if (s0 === null) return null;
    const from = '      if (f.toWinners !== null) afterIn.push({ key: "winners", label: m.toWinners, value: money(f.toWinners) });';
    if (s0.split(from).length !== 2) { problems.push("PLANT MISSED: the winners row"); return null; }
    const mod = compileAt(FILES.ledger, s0.replace(from, `      if (f.topUp > 0) afterIn.push({ key: "topup", label: m.topUp, value: money(f.topUp) });\n${from}`)) as { millioneaLedgerRows: LedgerFn; MaswaliLedger: Row };
    return { ...REAL, ledger: mod.millioneaLedgerRows, Ledger: mod.MaswaliLedger };
  })()],
  ["the floor at full ink when it did not bind (H5)", "2.3", plantLedger('emphasis: binds ? undefined : "muted"', "emphasis: undefined")],
  ["a hairline under every row again", "2.10", plantLedger('className={cn(r.gap && "mt-3")}', 'className={cn("border-b border-border", r.gap && "mt-3")}')],
  ["the fee unsigned (\"TZS −136,630\")", "2.4", plantLedger("{fee > 0 ? formatTzsSigned(-fee) : formatTzs(0)}", "{formatTzs(-fee)}")],
  ["the levies dropped from under the fee", "2.4", plantLedger("note: f.levies && fee > 0 ? noteLine(", "note: false && f.levies && fee > 0 ? noteLine(")],
  ["a carry's amount printed outside its money run", "2.5", plantLedger("const money = (n: number) => <span className=\"amount\">{formatTzs(n)}</span>;", "const money = (n: number) => <span>{formatTzs(n)}</span>;")],
  ["Money out's parts line dropped", "2.6", plantLedger("note: noteLine(locale, carried > 0 ? parts : parts.slice(0, 2)),", "note: undefined,")],
  ["L11 undone — \"carried forward TZS 0\" printed as a part", "2.6", plantLedger("noteLine(locale, carried > 0 ? parts : parts.slice(0, 2))", "noteLine(locale, parts)")],
  ["a note's parts free to break inside themselves (\"imelipwa kwa\" / \"washindi\")", "2.12", plantLedger("return <MaswaliFacts facts={parts.map((p) => keepFact(locale, p, [p]))} />;", "return <MaswaliFacts facts={parts.map((p) => keepFact(locale, p))} />;")],
  ["the note back in the label's column", "2.12", (() => {
    const s0 = planted("ledger", "            value={r.value}\n            emphasis={r.emphasis}", "            note={r.note}\n            value={r.value}\n            emphasis={r.emphasis}");
    if (s0 === null) return null;
    const from = "const wide = r.note !== undefined && r.note !== null";
    if (s0.split(from).length !== 2) { problems.push("PLANT MISSED: the wide note"); return null; }
    const mod = compileAt(FILES.ledger, s0.replace(from, "const wide = false && r.note !== undefined && r.note !== null")) as { millioneaLedgerRows: LedgerFn; MaswaliLedger: Row };
    return { ...REAL, ledger: mod.millioneaLedgerRows, Ledger: mod.MaswaliLedger };
  })()],
  ["the levies' names torn from their shares again (no runs kept)", "2.4", plantLedger("return <MaswaliFacts facts={parts.map((p) => keepFact(locale, p, [p]))} />;", "return <MaswaliFacts facts={parts.map((p) => keepFact(locale, p))} />;")],
  ["a carry row no longer a link", "2.7", plantLedger("return r.href ? (\n          <Link", "return false ? (\n          <Link")],
  ["\"every ticket refunded\" before the refunds landed", "2.8", plantLedger("afterIn.push(refunds.landed", "afterIn.push(true")],
  ["the voiding week's refund line beside a dash again", "2.11", plantLedger('[price]), value: null, emphasis: "muted" });', '[price]), value: "—", emphasis: "muted" });')],
  ["the sunset's no-top-up line beside a dash again", "2.11", plantLedger('label: factLine(locale, m.noTopUp), value: null,', 'label: factLine(locale, m.noTopUp), value: "—",')],
  ["the live pool said as a figure while its carry waits", "2.9", plantLedger("value: carryIn?.amount === null ? keepFact(locale, fill(m.atLeast, { amount: formatTzs(inTotal) })) : money(inTotal),", "value: money(inTotal),")],
  // §3
  ["a settled week in the resolved seal again", "3.1", plantParts('case "SETTLED": return "MILLIONEA_WEEK_SETTLED";', 'case "SETTLED": return "RESOLVED";')],
  ["a paused week royal, as if it sold", "3.1", plantParts('case "OPEN": return paused ? "MILLIONEA_WEEK_PAUSED" : "MILLIONEA_WEEK_OPEN";', 'case "OPEN": return "MILLIONEA_WEEK_OPEN";')],
  ["the objection window said as \"Results coming in\"", "3.2", plantParts('return state === "OPEN" && paused ? t.millionea.pausedShort : weekPhaseWord(t, state, phase ?? { kind: "state", objectionsUntil: null });', 'return state === "OPEN" && paused ? t.millionea.pausedShort : weekPhaseWord(t, state, { kind: "state", objectionsUntil: null });')],
  ["the exception row dropped (a divergence unwritten)", "3.3", plantSrc("tone", 'MILLIONEA_WEEK_SETTLED: "Slate on', 'MILLIONEA_WEEK_SETTLED_OLD: "Slate on')],
  ["a moved baseline (the parity proves nothing)", "1.0", { ...REAL, beforeBlob: "0000000000000000000000000000000000000000" }],
  ["the /results chip's markup changed (a fork)", "3.4", plantParts('className="shrink-0 self-start" data-testid="millionea-week-state"', 'className="shrink-0" data-testid="millionea-week-state"')],
  ["the row's facts hand-joined with \"·\" again", "3.5", plantParts('<MaswaliFacts layout="phone" facts={facts} />', '{facts.map((f, i) => <span key={i}>{i > 0 ? " · " : ""}{f}</span>)}')],
  ["the row's facts left after the week's column (far from the chevron)", "3.5", plantParts("text-body-sm text-text-muted lg:ml-auto", "text-body-sm text-text-muted")],
  ["the row drawing its own rule", "3.5", plantParts("<li>\n      <Link href={registerWeekHref(code) as never}", '<li className="border-t border-border">\n      <Link href={registerWeekHref(code) as never}')],
  // §4
  ["the scale measured by width again (the token twice its size)", "4.1", { ...REAL, geometry: (o, d, v) => { const g = L.carry.carryGeometry(o, d, v); return g && { ...g, s: o.width / d.width }; } }],
  ["a carry that plays with an end off screen (H6)", "4.2", { ...REAL, geometry: (o, d) => ({ dx: o.left - d.left, dy: o.top - d.top, s: o.height / d.height }) }],
  ["the run counter dropped from the effect", "4.3", plantSrc("carry", "}, [from, play, index, run]);", "}, [from, play, index]);")],
  ["How's line keyed on the run again (it blanks)", "4.3", plantSrc("example", "<MaswaliSealLine\n        line={line}", "<MaswaliSealLine\n        key={run}\n        line={line}")],
  ["the origin left showing while the token flies", "4.4", plantSrc("carry", "    origin.classList.add(VACATED);\n", "")],
  ["the vacated rule removed from the stylesheet", "4.4", plantSrc("css", ".kp-mln-carry-vacated { visibility: hidden; }", "")],
  ["the origin id back on the annex column", "4.5", (() => {
    const s0 = planted("seal", '<span id={idBase ? `${idBase}-a${r.ordinal}` : undefined} className="inline-flex">', '<span className="inline-flex">');
    if (s0 === null) return null;
    const from = '<span key={r.ordinal} className="flex flex-col items-center gap-0.5">';
    if (s0.split(from).length !== 2) { problems.push("PLANT MISSED: the annex column"); return null; }
    return { ...REAL, Seal: compileAt(FILES.seal, s0.replace(from, '<span key={r.ordinal} id={idBase ? `${idBase}-a${r.ordinal}` : undefined} className="flex flex-col items-center gap-0.5">')).MaswaliSealLine as Row };
  })()],
  ["the strike back in the border ink", "4.6", plantSeal('<s className="decoration-current">', '<s className="decoration-border-strong">')],
  ["the void cell's second line dropped before the swap", "4.6", plantSeal("{(m.standIn || keepLine) && <span", "{m.standIn && <span")],
  ["M7 undone — the example opens on its end frame (the void invisible)", "4.7", plantExample("const line = run === 0 ? before : ended ? after : { ...after, unbroken: false };", "const line = after;")],
  ["M5 undone — \"Example ended\" at the tap, before the token landed", "4.7", plantExample("const ended = run > 0 && landed === run;", "const ended = run > 0;")],
  ["M5 undone — the Unbroken Line drawn under a token still in flight", "4.7", plantExample("const line = run === 0 ? before : ended ? after : { ...after, unbroken: false };", "const line = run === 0 ? before : after;")],
  ["the non-scaling stroke back on the drawn line (it rests as dashes)", "4.8", plantSrc("line", "        pathLength={100}\n", '        vectorEffect="non-scaling-stroke"\n        pathLength={100}\n')],
  ["M7 undone — How hands the example its end frame only", "4.7", plantSrc("how", "return { before: sealLineOf(qs, picks), after: sealLineOf(qs, picks, { final: true }) };", "return { before: sealLineOf(qs, picks, { final: true }), after: sealLineOf(qs, picks, { final: true }) };")],
  // §5
  ["M6 undone — step 3 without the floor (the old sentence's place)", "5.1", plantSrc("how", "? fill(t.millionea.ruleWithFigure, { amount: fill(t.millionea.atLeast, { amount: formatTzs(h.floor) }), pct })", "? fill(t.millionea.ruleShared, { pct })")],
  ["M6 undone — where a win is paid left unsaid", "5.1", plantSrc("how", "    keepFact(locale, t.millionea.ruleWinPaid),\n", "")],
  ["H1 undone — a week voided whole left unsaid", "5.1", plantSrc("how", "    keepFact(locale, fill(t.millionea.ruleVoidWeek, { price: formatTzs(h.ticketPrice) })),\n", "")],
  ["L13 undone — no responsible-play line", "5.1", plantSrc("how", "<span>{keepFact(locale, t.millionea.ruleRg)}</span>", "<span />")],
  ["L7 undone — How's reserve step worded apart from the slip's", "5.1", plantWord("sw", "howTwo", "Akiba inahesabiwa tu swali kuu likibatilishwa, kwa mpangilio kuanzia A1 hadi A5; akiba batili inarukwa.")],
  ["L12 undone — the timeline after the examples again", "5.2", plantSrc("how", '<section aria-labelledby="mln-how-timeline"', '<section aria-label="timeline"')],
  ["M8 undone — How ends on one link again", "5.2", plantSrc("how", "<MillioneaReadingLinks t={t} how={false} hub />", "<MillioneaReadingLinks t={t} how={false} />")],
  ["M4 undone — the swap's card across the whole reading measure", "5.2", plantSrc("how", 'className="mat-raised flex max-w-receipt flex-col gap-3 rounded-card p-3"', 'className="mat-raised flex flex-col gap-3 rounded-card p-3"')],
  ["H3 undone — a worked week's fee made on the page", "5.3", plantSrc("how", "jackpot: f.J, feePct: pctNum(h.feeRate), fee: f.F,", "jackpot: f.J, feePct: pctNum(h.feeRate), fee: Math.round(f.J * h.feeRate),")],
  ["How's card title unbalanced (a heading wrap of its own)", "5.5", plantSrc("how", '            <h3 id="mln-how-ex-swap" className="font-display text-body-lg font-semibold text-text text-balance">', '            <h3 id="mln-how-ex-swap" className="font-display text-body-lg font-semibold text-text">')],
  ["How's section headings unbalanced", "5.5", plantSrc("how", 'const H2 = "font-display text-title-sm font-bold text-text text-balance";', 'const H2 = "font-display text-title-sm font-bold text-text";')],
  ["L9 undone — the window's Chinese duration glued again (\"24小时\")", "5.4", plantSrc("how", "hours: spacedDuration(locale, h.objectionWindowHours)", "hours: durationHours(locale, h.objectionWindowHours)")],
  ["the drawing's button back on the numeric utility (`h-10`: 80px on the overridden scale)", "5.6", plantGhost("h-[var(--h-control-md)] w-[160px] rounded-control", "h-10 w-[160px] rounded-control")],
  ["the page's button a rung up (lg) while its drawing stays at md", "5.6", plantExample('size="md"', 'size="lg"')],
];
let caught = 0;
for (const [name, target, world] of PLANTS) {
  if (!world) { console.log(`INCONCLUSIVE (plant did not apply)  ${name}`); continue; }
  const r = runAll(world, true);
  const hit = r.failed.includes(target);
  if (hit) caught++; else problems.push(`BLIND: ${target} stayed green with "${name}" planted`);
  console.log(`${(hit ? "PROVED" : "BLIND").padEnd(36)} ${target} · ${name}`);
}
for (const p of problems) console.log(`!! ${p}`);
const untested = CHECKS.map((c) => c.id).filter((id) => !PLANTS.some(([, t]) => t === id));
if (untested.length) console.log(`!! checks with no plant: ${untested.join(", ")}`);
console.log(`\n${caught}/${PLANTS.length} caught`);
process.exit(caught === PLANTS.length && problems.length === 0 && untested.length === 0 ? 0 : 1);
