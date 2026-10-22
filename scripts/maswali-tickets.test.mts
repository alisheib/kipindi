/**
 * test:maswali-tickets — TIKETI ZANGU FOR MILLIONEA AT 10/10 (MASWALI-BUILD S5-DESIGN-TICKETS; the R1 tickets critic's report
 * and the motion critic's ticket rows, with the lead's rulings; Ali 2026-10-21: "move it to 10/10 perfectly").
 *
 *   npx tsx scripts/maswali-tickets.test.mts               (npm run test:maswali-tickets)
 *   npx tsx scripts/maswali-tickets.test.mts --prove-red   (npm run red:maswali-tickets)
 *
 *   §1  H1   a settled ticket leads with its outcome; the loss card is compact (no positions), its week line body text
 *   §2  H2   no opacity on words: an at-rest ticket's words keep their ink, and the inks clear the AA floor on its surfaces
 *   §3  M4 H3 the free cancel in the platform's free-exit look: clock line + m:ss timer, "Cancel ticket" over the full refund,
 *            the rule under it, gone at expiry — and its words fit the button at 320
 *   §4  M4   the confirm asks "Cancel this ticket?", the serial a mono line, the price a money run, the take-back mark;
 *            a refusal "Not cancelled", sticky when it is a money path's (§F2/§F8, the lead's line)
 *   §5  H4   the cancel's result lives in the page's host, so a refresh never tears it down
 *   §6  M8 H3 each moment plays on first view and the seen mark waits for them; one hold rule in globals.css
 *   §7  L2   the live count dips and lands on a change, never on the first paint
 *   §8  M1   the card: the journey card's shell, the whole card the link (named "View ticket MLN-…"), the chip's glyph
 *   §9  M7   one fact, one wording: "Price", "Bought {date}", zh 派奖
 *   §10 M2   the lenses on the kit's strip, one row
 *   §11 M3   the empty and lens-empty states: fill, the verb call, the platform's lens words, the way out; §T5 their numerals
 *            mono through the kit EmptyState's OPT-IN part — every other caller byte for byte as before (a census of all)
 *   §12 M5 L7 the stub: the serial whole on its own row, the purchase time breaking only after its weekday, the week number
 *   §13 M6 L3 the legal line follows the resolution mode and opens the week's register; the stub's hash too
 *   §14 L1   the kind switch wears Millionea's ink; the kit Tabs byte-identical for every caller without it
 *   §15      the decided words (L2 L3 L4 L5 L6 L12 M4 M7, the seal's eyebrow), in three languages
 *   §16 L8   the cannot-win line and the sunset line are the kit's Callout
 *   §17 L10  the seal speaks Millionea's words; the amount stays whole (the platform's seal, every caller)
 *   §18 L11  an open week's ticket says its close and its first event
 *   §19 L13  a reserve whose result is in shows a verdict-free mark
 *   §20 L14  no dead lock moment
 *   §21 M9   the ghosts: three kinds where three are drawn; one strip row; the ticket's 108px Seal Line box
 *   §22      the hub's held row (the hub critic's L4 + L20, the lead's lines)
 *   §25      the hop: the list's loading state draws the DESTINATION's drawing (a ticket's own on a ticket); each drawing
 *            names its page (`data-ghost-page`) on one box-less wrapper around it, which moves nothing; the kit untouched
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect in an IN-MEMORY copy — a source string, a dictionary value,
 *    or a component COMPILED from a planted copy of its own source — and requires the check it targets to fail; a plant whose
 *    text is not in its file exactly once is INCONCLUSIVE, never a pass. No file is written.
 * ⚠️ What a render cannot see — boxes, wraps, contrast against the real gradients, the moments' timing in a browser — the
 *    drive shows (`scripts/maswali-ticket-shots.mjs`: every state at 320–1920 in three languages, read tile by tile).
 * Pure: it reads source files and renders components. No server, no database, no network.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import NodeModule from "node:module";
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

/* ── the renderer: React's server renderer inside the root layout's providers (r5j's harness) ─────────────────────── */
type Locale = "sw" | "en" | "zh";
const LOCALES: Locale[] = ["sw", "en", "zh"];
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
{
  // A dialog's chrome is a portal, which the server renderer cannot draw: a stand-in draws the panel in place.
  const at = req.resolve("../src/components/ui/modal.tsx");
  const real = req(at) as Record<string, unknown>;
  const stub = new NodeModule(at);
  stub.filename = at; stub.loaded = true;
  const Inline = (p: { open: boolean; children?: unknown }) => (p.open ? h("div", { "data-panel": "" }, p.children as never) : null);
  stub.exports = { ...real, Modal: Inline };
  (req.cache as Record<string, unknown>)[at] = stub;
}
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Locale, Record<string, Record<string, unknown>>> };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Locale; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (l: Locale, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: "/" }, h(I18nProvider as never, { initial: l } as never, el as never))));
const textOf = (m: string) => m.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** A module compiled from `source` as if it stood at `rel` — its imports resolve from there (r5j 3.7's `fromSource`). */
function compiled<T>(rel: string, source: string): T {
  const at = req.resolve(`../${rel}`);
  req(at); // the live module first, so its own requires are resolved and cached
  const live = (req.cache as Record<string, NodeModule>)[at];
  const out = ts.transpileModule(source, {
    fileName: at,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const m = new NodeModule(at);
  m.filename = at;
  m.paths = live.paths;
  (m as NodeModule & { _compile(s: string, f: string): void })._compile(out, at);
  return m.exports as T;
}

/* ── the files and the world ───────────────────────────────────────────────────────────────────────────────────────── */
const FILES = {
  ticket: "src/components/maswali/maswali-ticket.tsx",
  ledger: "src/components/maswali/maswali-win-ledger.tsx",
  cancel: "src/components/maswali/maswali-ticket-cancel.tsx",
  moment: "src/components/maswali/maswali-moment.tsx",
  seal: "src/components/maswali/maswali-seal-line.tsx",
  page: "src/app/millionea/tickets/[serial]/page.tsx",
  acts: "src/app/millionea/tickets/[serial]/ticket-acts.tsx",
  list: "src/app/millionea/tickets/page.tsx",
  bar: "src/app/millionea/tickets/tickets-bar.tsx",
  listGhost: "src/app/millionea/tickets/tickets-ghost.tsx",
  ticketGhost: "src/app/millionea/tickets/[serial]/ticket-ghost.tsx",
  hint: "src/components/maswali/maswali-ghost-hint.tsx",
  emptyText: "src/components/ui/empty-state-text.ts",
  empty: "src/components/ui/empty-state.tsx",
  mlnEmpty: "src/components/maswali/maswali-empty-state.tsx",
  listLoading: "src/app/millionea/tickets/loading.tsx",
  pageContainer: "src/components/layout/page-container.tsx",
  headGhost: "src/components/journey/tickets/tickets-ghost.tsx",
  switch: "src/components/journey/tickets/ticket-switch.tsx",
  tabs: "src/components/ui/tabs.tsx",
  celebrate: "src/components/markets/win-celebration.tsx",
  player: "src/lib/server/maswali-player.ts",
  css: "src/app/globals.css",
} as const;
type FileKey = keyof typeof FILES;
type Dict = Record<string, Record<string, unknown>>;
type World = { src: Record<FileKey, string>; dict: Record<Locale, Dict> };
const REAL: World = { src: Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, raw(f)])) as Record<FileKey, string>, dict };
const code = (w: World, k: FileKey) => squash(decomment(w.src[k]));
const mln = (w: World, l: Locale) => w.dict[l].millionea as Record<string, string>;

/** The components, compiled from the world's sources (the real ones are the live modules). */
type TicketMod = { MaswaliTicket: unknown; MaswaliTicketCard: unknown; MaswaliHeldTicketRow: unknown; millioneaTicketGlyph: (s: string) => { key: string } };
type LedgerMod = { MaswaliWinLedger: unknown; MaswaliLossReceipt: unknown };
type CancelMod = { MaswaliCancelButton: unknown; MaswaliCancelLine: unknown };
type SealMod = typeof import("../src/components/maswali/maswali-seal-line.tsx");
const live = {
  ticket: req("../src/components/maswali/maswali-ticket.tsx") as TicketMod,
  ledger: req("../src/components/maswali/maswali-win-ledger.tsx") as LedgerMod,
  cancel: req("../src/components/maswali/maswali-ticket-cancel.tsx") as CancelMod,
  seal: req("../src/components/maswali/maswali-seal-line.tsx") as SealMod,
};
const modsOf = (w: World) => ({
  ticket: w.src.ticket === REAL.src.ticket ? live.ticket : compiled<TicketMod>(FILES.ticket, w.src.ticket),
  ledger: w.src.ledger === REAL.src.ledger ? live.ledger : compiled<LedgerMod>(FILES.ledger, w.src.ledger),
  cancel: w.src.cancel === REAL.src.cancel ? live.cancel : compiled<CancelMod>(FILES.cancel, w.src.cancel),
  seal: w.src.seal === REAL.src.seal ? live.seal : compiled<SealMod>(FILES.seal, w.src.seal),
});

/* ── fixtures: one week of fifteen, the clauses, a pending line ─────────────────────────────────────────────────── */
type Out = "YES" | "NO" | "VOID" | null;
const NOW = Date.parse("2026-12-02T07:00:00.000Z"); // a Wednesday, 10:00 EAT
const BOUGHT = "2026-12-02T07:18:00.000Z"; // Wednesday 10:18 EAT
const gradable = (mains: Out[], reserves: Out[]) => [
  ...mains.map((o, i) => ({ role: "MAIN" as const, ordinal: i + 1, outcome: o })),
  ...reserves.map((o, i) => ({ role: "RESERVE" as const, ordinal: i + 1, outcome: o })),
];
const YES15 = Array.from({ length: 15 }, () => "YES" as const);
const lineOf = (seal: SealMod, mains: Out[], reserves: Out[], opts: { final?: boolean; weekVoid?: boolean } = {}) =>
  seal.sealLineOf(gradable(mains, reserves) as never, YES15, opts);
const clausesFor = (t: Dict, outs: Out[]) => outs.map((o, i) => ({
  role: i < 10 ? "MAIN" : "RESERVE", ordinal: i < 10 ? i + 1 : i - 9, category: "Sports", text: `Question ${i + 1}?`,
  eventAt: Date.parse("2026-12-05T06:00:00.000Z") + i * 3_600_000, pick: "YES", outcome: o,
}));
void clausesFor;
const SERIAL = "MLN-2026-W49-000041";
const ticketProps = (w: World, l: Locale, seal: SealMod, more: Record<string, unknown> = {}) => {
  const t = w.dict[l];
  const outs: Out[] = (more.outs as Out[] | undefined) ?? Array(15).fill(null);
  return {
    t, locale: l, serverNow: NOW, serial: SERIAL, week: 49, weekState: "OPEN", shown: "running",
    clauses: outs.map((o, i) => ({
      role: i < 10 ? "MAIN" : "RESERVE", ordinal: i < 10 ? i + 1 : i - 9, category: "Sports", text: `Question ${i + 1}?`,
      eventAt: Date.parse("2026-12-05T06:00:00.000Z") + i * 3_600_000, pick: "YES", outcome: o,
    })),
    line: lineOf(seal, outs.slice(0, 10), outs.slice(10)),
    stub: { price: 1_000, boughtAt: BOUGHT, questionSetHash: "19813468…" },
    ...more,
  };
};
const ticketMarkup = (w: World, l: Locale, more: Record<string, unknown> = {}) => {
  const m = modsOf(w);
  return inApp(l, h(m.ticket.MaswaliTicket as never, ticketProps(w, l, m.seal, more) as never));
};

/* ── the checks ───────────────────────────────────────────────────────────────────────────────────────────────────── */
type Check = { id: string; label: string; run: (w: World) => string[] };
const CHECKS: Check[] = [];
const check = (id: string, label: string, run: (w: World) => string[]) => CHECKS.push({ id, label, run });
const need = (d: string[], cond: boolean, why: string) => { if (!cond) d.push(why); };

// ── §1 · H1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
check("1.1", "a settled ticket leads with its outcome: the win ledger (with the seal's door) and the loss card stand after the way back, above the ticket", (w) => {
  const p = code(w, "page"), d: string[] = [];
  const ticketAt = p.indexOf('<div data-testid="millionea-ticket">');
  need(d, ticketAt > 0, "no ticket");
  need(d, p.indexOf("<MaswaliWinLedger") > p.indexOf("<BackLink") && p.indexOf("<MaswaliWinLedger") < ticketAt, "the win ledger is not between the way back and the ticket");
  need(d, p.indexOf("<SealDoor") > p.indexOf("<MaswaliWinLedger") && p.indexOf("<SealDoor") < ticketAt, "the seal's door is not under the ledger, above the ticket");
  need(d, p.indexOf("<MaswaliLossReceipt") > p.indexOf("<BackLink") && p.indexOf("<MaswaliLossReceipt") < ticketAt, "the loss card is not above the ticket");
  return d;
});
check("1.2", "the loss card says the week in body text — \"No 10/10 ticket · Carried forward to Week 50\" or \"3 tickets won\" — with no positions, no pick, no score, in three languages", (w) => {
  const { ledger } = modsOf(w), d: string[] = [];
  for (const l of LOCALES) {
    const t = w.dict[l], M = mln(w, l);
    const card = (winners: number, carriedTo?: number | null) => inApp(l, h(ledger.MaswaliLossReceipt as never, { t, week: 49, serial: SERIAL, winners, carriedTo, legal: { twoOfficer: false } } as never));
    const rolled = card(0, 50), won = card(3), unknown = card(0, null);
    const line = (m: string) => /data-testid="millionea-loss-week"[^>]*class="([^"]*)"|class="([^"]*)"[^>]*data-testid="millionea-loss-week"/.exec(m);
    const cls = line(rolled)?.[1] ?? line(rolled)?.[2] ?? "";
    need(d, cls.includes("text-body-sm") && cls.includes("text-text"), `${l}: the week line is not body text (${cls})`);
    need(d, textOf(rolled).includes(M.lossNoWinner) && textOf(rolled).includes(String(M.carriedOut).replace("{week}", "50")), `${l}: no "no 10/10 · carried forward to Week 50"`);
    need(d, textOf(unknown).includes(M.carriedOutNoWeek), `${l}: the unnamed next week is not said`);
    need(d, textOf(won).includes(String(M.regWon).replace("{n}", "3")), `${l}: "3 tickets won" missing`);
    need(d, !/<ol\b/.test(rolled) && !textOf(rolled).includes(M.pick) && !/\/10\b(?! ticket| tiketi| 彩票)/.test(textOf(won)), `${l}: positions or a score on the loss card`);
    need(d, textOf(rolled).includes(M.lossHeading) && textOf(rolled).includes(M.finality), `${l}: heading or finality missing`);
  }
  return d;
});

// ── §2 · H2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
check("2.1", "an at-rest ticket (cancelled, refunded) puts no opacity on any word — its question text in the muted ink, its VOID stamps whole", (w) => {
  const d: string[] = [];
  for (const shown of ["cancelled", "refunded"]) {
    const outs: Out[] = ["VOID", "VOID", "VOID", "VOID", "VOID", "VOID", "YES", "YES", "YES", "YES", "YES", "YES", "YES", "YES", "YES"];
    const m = ticketMarkup(w, "en", { shown, weekState: shown === "refunded" ? "VOIDED" : "OPEN", outs });
    need(d, !/style="[^"]*opacity/.test(m), `${shown}: a style sets an opacity`);
    need(d, /<p class="text-body-sm text-pretty text-text-muted">Question 7\?<\/p>/.test(m), `${shown}: the question text is not in the muted ink`);
    need(d, count(m, ">Result · Void<") >= 6 || count(textOf(m), "Result · Void") >= 6, `${shown}: the void stamps are not all drawn`);
  }
  return d;
});
/** WCAG relative luminance of an `oklch(L% C H)` literal (OKLab → linear sRGB, clipped). */
const lumOfOklch = (L: number, C: number, H: number) => {
  const hr = (H * Math.PI) / 180, a = C * Math.cos(hr), b = C * Math.sin(hr);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const lin = [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_]
    .map((v) => Math.min(1, Math.max(0, v)));
  return { lum: 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2], lin };
};
const tokenOklch = (css: string, token: string) => {
  const m = new RegExp(`${token.replace(/-/g, "\\-")}:\\s*oklch\\(([0-9.]+)% ([0-9.]+) ([0-9.]+)\\)`).exec(css);
  return m ? [Number(m[1]) / 100, Number(m[2]), Number(m[3])] as const : null;
};
const ratio = (x: number, y: number) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
check("2.2", "the inks an at-rest ticket's words wear clear the AA floor (4.5:1) on both of its surfaces — the raised card's lighter stop and the inset rows' — where the old .45 opacity fell under it", (w) => {
  const css = w.src.css, d: string[] = [];
  // The two surfaces' lighter stops (the wash gradients in globals.css): raised 24% / 0.145 / 268, inset 12.5% / 0.115 / 268.
  const surfaces = { raised: lumOfOklch(0.24, 0.145, 268), inset: lumOfOklch(0.125, 0.115, 268) };
  for (const ink of ["--text-muted", "--text-subtle"]) {
    const o = tokenOklch(css, ink);
    if (!o) { d.push(`${ink} unreadable`); continue; }
    const fg = lumOfOklch(o[0], o[1], o[2]);
    for (const [name, bg] of Object.entries(surfaces)) {
      const r = ratio(fg.lum, bg.lum);
      need(d, r >= 4.5, `${ink} on ${name}: ${r.toFixed(2)}:1`);
    }
  }
  // CONTROL: the subtle eyebrow at the disabled opacity, blended in linear light over the raised card, falls under the floor.
  const o = tokenOklch(css, "--text-subtle"), bg = surfaces.raised;
  if (o) {
    const fg = lumOfOklch(o[0], o[1], o[2]);
    const mix = fg.lin.map((v, i) => 0.45 * v + 0.55 * bg.lin[i]);
    const faded = 0.2126 * mix[0] + 0.7152 * mix[1] + 0.0722 * mix[2];
    need(d, ratio(faded, bg.lum) < 4.5, "control: the faded eyebrow would have passed (the measure is blind)");
  }
  return d;
});

// ── §3 · M4 · H3 ────────────────────────────────────────────────────────────────────────────────────────────────────
const doorOf = (w: World, l: Locale, untilMs: number) => {
  const { cancel } = modsOf(w);
  const M = mln(w, l);
  return inApp(l, h(cancel.MaswaliCancelButton as never, { until: untilMs, serverNow: NOW, price: 1_000, note: String(M.cancelNote).replace("{mins}", "10"), onPress() {} } as never));
};
check("3.1", "the free cancel is the platform's free exit: a clock line (the time a <time>, the m:ss a role=timer), then ONE button — \"Cancel ticket\" over \"Get TZS 1,000 back in full\" (its figure one .amount) — then the rule; the long clause never on the button", (w) => {
  const d: string[] = [];
  for (const l of LOCALES) {
    const M = mln(w, l), J = w.dict[l].journey as Record<string, string>;
    const m = doorOf(w, l, NOW + 582_000);
    const [before] = String(M.cancelFreeUntil).split("{time}");
    const clock = /<p class="text-body-sm text-text-muted">([\s\S]*?)<\/p>/.exec(m)?.[1] ?? "";
    need(d, textOf(clock).startsWith(before.trim()) && /<time date[Tt]ime="[^"]+"[^>]*>10:09<\/time>/.test(clock) && /role="timer"[^>]*>9:42</.test(clock), `${l}: the clock line is not "${before.trim()} 10:09 · 9:42" (${textOf(clock)})`);
    // §T5 (round 2): the clock is a `.mono` numeral, as every digit run of a Millionea fact line; the timer is mono too.
    need(d, /<time date[Tt]ime="[^"]+" class="mono whitespace-nowrap">10:09<\/time>/.test(clock) && /role="timer" class="[^"]*font-mono[^"]*">9:42</.test(clock), `${l}: the clock or the timer is not a mono numeral (§T5)`);
    const btn = /<button[^>]*>([\s\S]*?)<\/button>/.exec(m)?.[1] ?? "";
    const [rb, ra] = J.sellFullRefund.split("{amount}");
    need(d, textOf(btn).includes(M.confirmCancel) && /<span class="amount[^"]*">TZS 1,000<\/span>/.test(btn) && textOf(btn).includes(`${rb}TZS 1,000${ra}`.trim()), `${l}: the button is not "${M.confirmCancel}" over the full refund (${textOf(btn)})`);
    need(d, !textOf(btn).includes(before.trim()), `${l}: the clause stands on the button again`);
    need(d, textOf(m).includes(String(M.cancelNote).replace("{mins}", "10")), `${l}: the rule is not under the door`);
    need(d, m.includes('data-testid="millionea-ticket-cancel"'), `${l}: no door hook`);
  }
  return d;
});
const fontkit = req("fontkit") as { openSync: (p: string) => { unitsPerEm: number; layout: (s: string) => { advanceWidth: number } } };
const INTER_BOLD = fontkit.openSync(join(ROOT, "src/lib/server/reports/fonts/Inter-Bold.ttf"));
const widthAt = (s: string, px: number) => (INTER_BOLD.layout(s).advanceWidth / INTER_BOLD.unitsPerEm) * px;
check("3.2", "H3 · the button's words fit the critic's ~188px at 320 in Swahili and English (measured in Inter Bold at the lg button's 15px, wider than its 600): \"Ghairi tiketi\" — where \"Kughairi bila malipo hadi 10:21\" needed ~215; the kit's lg button, grown to its two lines", (w) => {
  const d: string[] = [];
  for (const l of ["sw", "en"] as const) {
    const label = mln(w, l).confirmCancel;
    const wpx = widthAt(label, 15);
    need(d, wpx <= 188, `${l}: "${label}" needs ${wpx.toFixed(0)}px`);
  }
  need(d, code(w, "cancel").includes('<Button type="button" variant="ghost" size="lg" fullWidth loading={pending} onClick={onPress} className="kp-mln-free-exit border-border-control">'), "the door is not the kit's button");
  need(d, squash(decommentCss(w.src.css)).includes(".btn.kp-mln-free-exit { height: auto; min-height: var(--h-control-lg); padding-block: var(--sp-1); white-space: normal; }"), "the kit button does not grow to its two lines");
  const old = widthAt(String(mln(w, "sw").cancelFreeUntil).replace("{time}", "10:21"), 15);
  need(d, old > 188, `control: the old clause measures ${old.toFixed(0)}px (the measure is blind)`);
  return d;
});
check("3.3", "the door is gone the moment its window is: at its end it draws nothing", (w) => {
  const m = doorOf(w, "en", NOW - 1_000);
  return m.includes("millionea-ticket-cancel") || /<button/.test(m) ? ["the door still draws after its window"] : [];
});

// ── §4 · M4 confirm and refusal ─────────────────────────────────────────────────────────────────────────────────────
check("4.1", "the confirm: \"Cancel this ticket?\" / \"Ughairi tiketi hii?\" / \"取消此彩票？\", the serial its own mono line, the price one money run, the take-back mark on its plate", (w) => {
  const a = code(w, "acts"), d: string[] = [];
  const want: Record<Locale, string> = { en: "Cancel this ticket?", sw: "Ughairi tiketi hii?", zh: "取消此彩票？" };
  for (const l of LOCALES) need(d, mln(w, l).cancelConfirmTitle === want[l], `${l}: the title reads "${mln(w, l).cancelConfirmTitle}"`);
  need(d, a.includes("title={t.millionea.cancelConfirmTitle}") && !a.includes("fill(t.millionea.cancelConfirmTitle"), "the title is filled with the serial again");
  need(d, a.includes('<span className="block whitespace-nowrap font-mono font-semibold text-text">{serial}</span>'), "the serial is not a mono line of its own");
  need(d, a.includes("{moneyRuns(fill(t.millionea.cancelConfirmBody, { price: formatTzs(price), cap }))}"), "the body's price is not a money run");
  need(d, a.includes("icon={<I.rotateCcw s={plateGlyph(36)} />}"), "the plate is not the take-back mark");
  return d;
});
check("4.2", "a refusal is titled \"Not cancelled\" (never the button's verb), and a danger refusal — a money path's — stays until it is read (`durationMs: 0`)", (w) => {
  const a = code(w, "acts"), d: string[] = [];
  const want: Record<Locale, string> = { en: "Not cancelled", sw: "Haijaghairiwa", zh: "未取消" };
  for (const l of LOCALES) need(d, mln(w, l).cancelRefusedTitle === want[l], `${l}: "${mln(w, l).cancelRefusedTitle}"`);
  need(d, a.includes('toast({ title: t.millionea.cancelRefusedTitle, description: body, variant, ...(variant === "danger" ? { durationMs: 0 } : null) });'), "the refusal toast is not the sticky-on-danger one");
  return d;
});

// ── §5 · H4 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
check("5.1", "the cancel's result lives in the page's host, mounted for the page's life — never inside the door a refresh removes", (w) => {
  const a = code(w, "acts"), p = code(w, "page"), d: string[] = [];
  const host = a.slice(a.indexOf("export function TicketHost"), a.indexOf("export function TicketCancel"));
  const door = a.slice(a.indexOf("export function TicketCancel"), a.indexOf("export function SealDoor"));
  need(d, host.includes("<OperationResultModal") && !door.includes("<OperationResultModal"), "the result is not the host's");
  need(d, door.includes("showResult?.(r.data.refunded);") && door.includes("router.refresh();"), "the door does not hand the result to the host");
  need(d, p.includes("<TicketHost serial={view.serial} through={view.seen.through}>"), "the page is not inside the host");
  return d;
});

// ── §6 · M8 · H3 ────────────────────────────────────────────────────────────────────────────────────────────────────
check("6.1", "each moment's part is wrapped to play on first view — the stub and its perforation (cut, undo, reveal), a pressed stamp, the Seal Line (carry, draw), the closing rule — and a part with no moment is not wrapped", (w) => {
  const d: string[] = [];
  const cut = ticketMarkup(w, "en", { play: { cut: "cut" } });
  const at = cut.indexOf("data-mln-moment");
  need(d, at > 0 && at < cut.indexOf("m-axis-reveal") && at < cut.indexOf("maswali-cut"), "the cut is not inside a moment");
  const rest = ticketMarkup(w, "en", {});
  need(d, !rest.includes("data-mln-moment"), "a ticket with no moment is wrapped");
  const press = ticketMarkup(w, "en", { outs: ["YES", ...Array(14).fill(null)], weekState: "RESOLVING", play: { press: [1] } });
  need(d, /<span data-mln-moment="" class="inline-flex"><span class="[^"]*maswali-attest/.test(press), "a pressed stamp is not inside a moment");
  const { ledger } = modsOf(w);
  const t = w.dict.en;
  const loss = inApp("en", h(ledger.MaswaliLossReceipt as never, { t, week: 49, serial: SERIAL, winners: 0, carriedTo: 50, legal: null, play: { draw: true } } as never));
  need(d, loss.indexOf("data-mln-moment") > 0 && loss.indexOf("data-mln-moment") < loss.indexOf("m-draw"), "the closing rule's draw is not inside a moment");
  return d;
});
check("6.2", "ONE rule holds a moment at its first frame until it is in view — scoped to an engine running scripts and off both clamps — in globals.css", (w) => {
  const css = squash(decommentCss(w.src.css));
  const rule = '@media (scripting: enabled) and (prefers-reduced-motion: no-preference) { html:not(.kp-reduce-motion):not([data-motion="minimal"]) [data-mln-moment]:not([data-mln-played]) :is(.maswali-cut, .maswali-cut-undo, .maswali-attest, .maswali-carry, .m-axis-reveal, .m-draw, .m-seal) { animation-play-state: paused; } }';
  return count(css, rule) === 1 ? [] : ["the hold rule is missing or doubled"];
});
check("6.3", "the seen mark waits for the moments: only the host marks, once every registered moment has played (no mark on mount)", (w) => {
  const a = code(w, "acts"), mo = code(w, "moment"), d: string[] = [];
  need(d, count(a, "markMillioneaTicketSeenAction(") === 1 && a.includes("<MaswaliMomentsHost through={through} onAllPlayed={markSeen}>"), "the mark is not the host's");
  need(d, !/export function TicketSeen/.test(a), "the mount-time mark is back");
  need(d, mo.includes("for (const id of registered.current) if (!done.current.has(id)) return;"), "the host does not wait for every moment");
  need(d, mo.includes('{...(played ? { "data-mln-played": "" } : {})}'), "the played state is not rendered by React");
  return d;
});

// ── §7 · L2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
check("7.1", "the live count ticks only on a committed change: no .m-tick on the first paint; the count wrapped in the tick", (w) => {
  const m = ticketMarkup(w, "en", { weekState: "RESOLVING", live: { resultsIn: 4 } }), d: string[] = [];
  need(d, !m.includes("m-tick"), "the count ticks on its first paint");
  need(d, code(w, "ticket").includes('<MaswaliTick key="in" value={live.resultsIn}>'), "the count is not keyed on its value");
  need(d, textOf(m).includes(String(mln(w, "en").resultsOut).replace("{n}", "4")), "the count is not drawn");
  return d;
});

// ── §8 · M1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const cardOf = (w: World, l: Locale, more: Record<string, unknown> = {}) => {
  const m = modsOf(w);
  return inApp(l, h(m.ticket.MaswaliTicketCard as never, {
    t: w.dict[l], locale: l, serverNow: NOW, href: `/millionea/tickets/${SERIAL}`, serial: SERIAL, week: 49, shown: "running",
    line: lineOf(m.seal, Array(10).fill(null), Array(5).fill(null)), price: 1_000, payout: null, placedAt: BOUGHT, ...more,
  } as never));
};
check("8.1", "the card is the journey card's shell and the WHOLE card the link, lifting as the kit's raised card does; named \"View ticket MLN-…\"; the 2 : 3 grid; never the 24px --r-xl", (w) => {
  const m = cardOf(w, "en"), d: string[] = [];
  const root = /^<a ([^>]*)>/.exec(m)?.[1] ?? "";
  need(d, /class="mat-raised-i flex min-w-0 flex-col rounded-xl border border-border bg-bg-elevated p-4 text-text"/.test(root), `the card's root is not the linked shell (${root.slice(0, 160)})`);
  const ids = /aria-labelledby="([^"]+)"/.exec(root)?.[1].split(" ") ?? [];
  const name = ids.map((id) => textOf(new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</span>`).exec(m)?.[1] ?? "")).join(" ").trim();
  need(d, name === `View ticket ${SERIAL}`, `the card's name is "${name}"`);
  need(d, m.includes("grid-cols-[minmax(max-content,2fr)_minmax(0,3fr)]") && !m.includes("--r-xl"), "not the 2 : 3 grid, or the 24px radius is back");
  need(d, count(m, "<a ") === 1, "more than one link on the card");
  return d;
});
check("8.2", "the state chip is glyph + ink + word, the platform's position glyphs and Millionea's own two (cancelled takes it back, forfeited is void)", (w) => {
  const { ticket } = modsOf(w), d: string[] = [];
  const want: Record<string, string> = { running: "clockPending", won: "resolved", lost: "xCircle", refunded: "void", cancelled: "rotateCcw", forfeited: "void" };
  for (const [s, key] of Object.entries(want)) need(d, ticket.millioneaTicketGlyph(s).key === key, `${s}: ${ticket.millioneaTicketGlyph(s).key}`);
  for (const shown of ["running", "cancelled", "lost"]) {
    const m = cardOf(w, "en", { shown, payout: shown === "lost" ? 0 : shown === "cancelled" ? 1_000 : null });
    const chips = [...m.matchAll(/<span data-kit-chip[^>]*>([\s\S]*?)<\/span>/g)].map((x) => x[1]);
    need(d, chips.length >= 2 && /^<svg/.test(chips[1]), `${shown}: the state chip has no glyph before its word`);
  }
  return d;
});

// ── §9 · M7 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
check("9.1", "one fact, one wording: the card says \"Price\" and \"Bought <date>\" as the stub does; zh says 派奖 (§D), the platform's betting words left to the platform", (w) => {
  const d: string[] = [];
  const want: Record<Locale, [string, string, string, string]> = {
    en: ["Bought {date}", "Payout", "Final payout", "Price"], sw: ["Imenunuliwa {date}", "Malipo", "Malipo ya mwisho", "Bei"], zh: ["购买于 {date}", "派奖", "最终派奖", "价格"],
  };
  for (const l of LOCALES) {
    const M = mln(w, l);
    need(d, j([M.boughtAt, M.cardPayout, M.cardFinalPayout, M.stubPrice]) === j(want[l]), `${l}: ${j([M.boughtAt, M.cardPayout, M.cardFinalPayout, M.stubPrice])}`);
    const running = textOf(cardOf(w, l)), lost = textOf(cardOf(w, l, { shown: "lost", payout: 0 }));
    need(d, running.includes(M.stubPrice) && running.includes(want[l][0].split("{date}")[0].trim()) && running.includes(M.cardPayout), `${l}: the card does not use the stub's words`);
    need(d, lost.includes(M.cardFinalPayout), `${l}: a lost card's payout label`);
    const J = w.dict[l].journey as Record<string, string>, DI = w.dict[l].dialog as Record<string, string>;
    need(d, !running.includes(DI.stakeLabel) && !running.includes(J.ticketPlacedAt.split("{date}")[0].trim()), `${l}: the betting words are back on the card`);
  }
  return d;
});

// ── §10 · M2 ────────────────────────────────────────────────────────────────────────────────────────────────────────
check("10.1", "the four lenses ride the kit's strip — exactly the journey Tiketi zangu bar — one row at every width; the ghost draws the same strip", (w) => {
  const b = code(w, "bar"), g = code(w, "listGhost"), d: string[] = [];
  need(d, b.includes("<QueryStrip ariaLabel={t.journey.ticketsFilterAria}>") && !b.includes("flex-wrap"), "the lenses are not on the strip");
  need(d, g.includes("<div className={QUERY_STRIP_CLASS}>") && !g.includes("flex-wrap"), "the ghost does not draw the strip's one row");
  return d;
});

// ── §11 · M3 ────────────────────────────────────────────────────────────────────────────────────────────────────────
check("11.1", "the empty states are their siblings': they fill for a journey reader; the first ticket's call is the primary verb \"Fill a ticket\" to the slip, only for a week on sale (never on a break); a lens that empties says which in the platform's words, with the way out to every ticket counted", (w) => {
  const p = code(w, "list"), d: string[] = [];
  need(d, count(p, "fill={journey}") === 2, "an empty state does not fill");
  need(d, p.includes('action={selling ? ( <Link href={MILLIONEA_HREF.slip as never} className="btn btn-primary btn-md">{t.millionea.titleSlip}</Link> ) : undefined}'), "the call is not the primary verb to the slip");
  need(d, p.includes("const invite = total === 0 && gate.visible && (await millioneaBreakOf(gate.userId)) === null;") && p.includes("const hubWeek = invite ?"), "the call is not behind the break gate");
  need(d, p.includes("title={total > PLAYER_PER_PAGE ? t.millionea.lensNoneOnPage : lensEmptyTitle(t, lens)}") && p.includes("body={t.positions.emptyLensBody}"), "the lens-empty state is not the platform's");
  need(d, p.includes("{`${t.journey.ticketsExitLens} (${formatNumber(drawable.length)})`}"), "no way out of an empty lens");
  for (const [lens, key] of [["open", "ticketsEmptyOpenTitle"], ["settled", "ticketsEmptySettled"], ["won", "ticketsEmptyWon"]]) {
    need(d, p.includes(`case "${lens}": return t.journey.${key};`), `the ${lens} lens's title is not the platform's`);
  }
  return d;
});

// ── §11.2–11.4 · §T5 · the kit EmptyState's OPT-IN numeral part (the lead's ruling, 2026-10-22) ─────────────────────
// The kit EmptyState is SHARED by the whole app, so the change is proven from both sides. WITHOUT a part — every caller but
// Millionea's one wrapper — the body and the component draw byte for byte what 7e9a314f0 drew: every string the dictionary
// writes in each language, each template filled as a page fills it (and again with its fill kept whole), a generated set
// of hard cases (Chinese marks mid-text and before a closer, a dash, a YES/NO pair, a possessive, a figure, a clock, a
// serial); the notice rules that share the module too; and the component bound to 7e9a314f0's own text rules, across every
// kind, width rule, body shape and action. WITH Millionea's part, only the numerals' face changes: for every one of those
// bodies, the markup less its `.mono` / `.amount` runs is the markup without the part. A parse of every TSX file under
// src/ finds each `<EmptyState>` the app draws and who asks for a part.
type EmptyTextMod = { emptyStateBody: (b: unknown, part?: unknown) => unknown; noticeBody: (b: unknown, o?: unknown) => unknown };
type EmptyMod = { EmptyState: unknown; EmptyStateSection: unknown; ErrorState: unknown };
const atRelease = (rel: string) => execFileSync("git", ["show", `7e9a314f0:${rel}`], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n");
/** `rel` compiled from `source` while `dep`'s module is `depExports` — so 7e9a314f0's component draws with 7e9a314f0's text
 *  rules, and a planted text module reaches the component compiled beside it. */
function compiledWith<T>(rel: string, source: string, dep: string, depExports: unknown): T {
  req(`../${rel}`); // the live module first, bound to the live dependency, before the swap
  const at = req.resolve(`../${dep}`), cache = req.cache as Record<string, NodeModule>, live = cache[at];
  const stub = new NodeModule(at);
  stub.filename = at; stub.loaded = true; stub.exports = depExports;
  cache[at] = stub;
  try { return compiled<T>(rel, source); } finally { cache[at] = live; }
}
const emptyTextOld = compiled<EmptyTextMod>(FILES.emptyText, atRelease(FILES.emptyText));
const emptyOld = compiledWith<EmptyMod>(FILES.empty, atRelease(FILES.empty), FILES.emptyText, emptyTextOld);
const emptyTextOf = (w: World) => (w.src.emptyText === REAL.src.emptyText ? req("../src/components/ui/empty-state-text.ts") : compiled(FILES.emptyText, w.src.emptyText)) as EmptyTextMod;
const emptyOf = (w: World) => (w.src.empty === REAL.src.empty && w.src.emptyText === REAL.src.emptyText
  ? req("../src/components/ui/empty-state.tsx")
  : compiledWith(FILES.empty, w.src.empty, FILES.emptyText, emptyTextOf(w))) as EmptyMod;
const mlnEmptyOf = (w: World) => (w.src.mlnEmpty === REAL.src.mlnEmpty ? req("../src/components/maswali/maswali-empty-state.tsx") : compiled(FILES.mlnEmpty, w.src.mlnEmpty)) as { MaswaliEmptyState: unknown };
const { numeralRuns } = req("../src/components/maswali/maswali-facts.tsx") as { numeralRuns: (s: string) => unknown };
const P = (node: unknown) => renderToStaticMarkup(h("p", null, node as never));
/** The markup less the numerals' face: each `.mono` / `.amount` run its bare text again. */
const faceless = (m: string) => m.replace(/<span class="(?:mono|amount)">([^<]*)<\/span>/g, "$1");

/** The bodies: every string the dictionary writes in a language; each template filled as a page fills one (a count, a
 *  clock, a figure, a serial, a date — the runs a part and a keep act on), and again with its fill kept whole (`keep`, as
 *  a caller's `breakSentence` hands it); and the generated hard cases, each alone and joined to each other. */
type Body = string | { text: string; keep: string[] };
const FILLS = ["3", "18:00", "TZS 1,000", "MLN-2026-W49-000041", "21 Oct"];
const stringsIn = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === "string") out.push(v);
  else if (v && typeof v === "object") for (const x of Object.values(v)) stringsIn(x, out);
  return out;
};
const HARD = [
  "选择一个问题，点击“是”或“否”——您的注单会显示在这里。", "第3周开放至周五 18:00。开放时公布 15 道问题。", "还剩 2 张？好！", "“你好，”他说：“第 49 周。”",
  "（第 49 周）已结束；共 10/10。", "Pick YES or NO — your ticket shows up here.", "Chagua NDIO au HAPANA — tiketi yako itaonekana hapa.",
  "Week 49 — 3 of 15 results in", "TZS 1,000 returned to your main balance.", "Wiki ya 49: tiketi 2 zimeshinda 10/10.", "A or B or C",
];
const HARD_CASES = HARD.flatMap((a, i) => HARD.map((b, k) => (i === k ? a : `${a}${["", " ", "，", " — "][(i + k) % 4]}${b}`)));
const CORPUS = Object.fromEntries(LOCALES.map((l) => {
  const strings = stringsIn(dict[l]);
  const filled = strings.filter((s) => /\{\w+\}/.test(s)).flatMap((s, i): Body[] => {
    const v = FILLS[i % FILLS.length], text = s.replace(/\{\w+\}/g, v);
    return [text, { text, keep: [v] }];
  });
  return [l, [...strings, ...filled, ...HARD_CASES]];
})) as Record<Locale, Body[]>;
const CORPUS_SIZE = LOCALES.reduce((n, l) => n + CORPUS[l].length, 0);
const bodyText = (b: Body) => (typeof b === "string" ? b : b.text).slice(0, 40);

/** The text rules over the corpus, once per text module (a plant that leaves the module alone reads the same pass). */
const textPasses = new Map<string, { identity: string[]; faces: string[]; mono: number }>();
const textPassOf = (w: World) => {
  const hit = textPasses.get(w.src.emptyText);
  if (hit) return hit;
  const now = emptyTextOf(w), identity: string[] = [], faces: string[] = [];
  let mono = 0;
  for (const l of LOCALES) for (const body of CORPUS[l]) {
    const without = P(now.emptyStateBody(body));
    if (identity.length < 3 && P(emptyTextOld.emptyStateBody(body)) !== without) identity.push(`${l} body ${j(bodyText(body))}`);
    if (identity.length < 3 && typeof body === "string") {
      for (const o of [undefined, { centred: true }]) {
        if (P(emptyTextOld.noticeBody(body, o)) !== P(now.noticeBody(body, o))) identity.push(`${l} notice${o ? " (centred)" : ""} ${j(bodyText(body))}`);
      }
    }
    const withPart = P(now.emptyStateBody(body, numeralRuns));
    if (withPart.includes('<span class="mono">')) mono++;
    if (faces.length < 3 && faceless(withPart) !== without) faces.push(`${l} ${j(bodyText(body))}`);
  }
  const pass = { identity, faces, mono };
  textPasses.set(w.src.emptyText, pass);
  return pass;
};
/** The component, 7e9a314f0's against the world's, once per pair of sources: every kind × the width rules (unset, fill,
 *  boxed with a class) × no body, a sentence (zh with its marks and numerals), a kept body × with and without an action ×
 *  alone and inside a titled section, in three languages; and the error state beside it. */
const EMPTY_KINDS = ["markets", "positions", "leaderboard", "notifications", "audit", "sources", "proposals", "kyc", "fairness", "rg", "admin", "default"];
const componentPasses = new Map<string, { defects: string[]; n: number }>();
const componentPassOf = (w: World) => {
  const key = `${w.src.empty}\u0000${w.src.emptyText}`;
  const hit = componentPasses.get(key);
  if (hit) return hit;
  const now = emptyOf(w), defects: string[] = [];
  let n = 0;
  const differ = (what: string, a: string, b: string) => { n++; if (a !== b && defects.length < 3) defects.push(`${what}: differs at byte ${[...a].findIndex((ch, i) => ch !== b[i])}`); };
  const action = h("a", { href: "/x", className: "btn btn-primary btn-md" }, "Go");
  for (const l of LOCALES) {
    const sentence = l === "zh" ? "第3周开放至周五 18:00。开放时公布 15 道问题。" : l === "sw" ? "Wiki 3 iko wazi hadi Ijumaa 18:00." : "Pick YES or NO — your ticket shows up here.";
    const bodies: Array<Body | undefined> = [undefined, sentence, { text: "Pick YES or NO — then 10/10 on 21 Oct", keep: ["21 Oct"] }];
    for (const kind of EMPTY_KINDS) for (const fill of [undefined, true, false]) for (const body of bodies) for (const act of [undefined, action]) {
      const props = { kind, title: l === "zh" ? "暂无。" : "Nothing here yet — 3 of 15.", body, fill, action: act, className: fill === false ? "mt-3" : undefined };
      for (const section of [false, true]) {
        const draw = (m: EmptyMod) => inApp(l, section ? h(m.EmptyStateSection as never, null, h(m.EmptyState as never, props as never)) : h(m.EmptyState as never, props as never));
        differ(`${l}/${kind}/fill=${String(fill)}/${body === undefined ? "no body" : typeof body === "string" ? "sentence" : "kept"}${act ? "/action" : ""}${section ? "/section" : ""}`, draw(emptyOld), draw(now));
      }
    }
    for (const props of [{}, { title: "x", detail: "MLN-2026-W49-000041", action }]) {
      differ(`${l}/ErrorState`, inApp(l, h(emptyOld.ErrorState as never, props as never)), inApp(l, h(now.ErrorState as never, props as never)));
    }
  }
  const pass = { defects, n };
  componentPasses.set(key, pass);
  return pass;
};
const REAL_TEXT_PASS = textPassOf(REAL), REAL_COMPONENT_PASS = componentPassOf(REAL);
check("11.2", `§T5 · the kit EmptyState WITHOUT a part (every caller but Millionea's one wrapper) draws byte for byte what 7e9a314f0 drew: ${CORPUS_SIZE} bodies in sw/en/zh (every string the dictionary writes, each template filled and kept, the generated hard cases) through the body and the notice rules, and the component bound to 7e9a314f0's own text rules in ${REAL_COMPONENT_PASS.n} drawings (every kind, width rule, body shape and action, alone and in a section; the error state)`, (w) => {
  const d: string[] = [];
  const text = textPassOf(w), comp = componentPassOf(w);
  for (const x of text.identity) d.push(`draws differently without a part — ${x}`);
  d.push(...comp.defects);
  need(d, CORPUS_SIZE > 10_000 && comp.n > 1_000, `only ${CORPUS_SIZE} bodies and ${comp.n} component drawings read`);
  return d;
});

/** Every `<tag …>` element in a TSX source: its line, and whether it passes `attr` or spreads its props (a spread could
 *  carry it). A parse, not a pattern: an attribute is an attribute wherever it sits. */
type JsxCall = { file: string; line: number; attr: boolean; spread: boolean };
const jsxCallsIn = (file: string, source: string, tag: string, attr: string): JsxCall[] => {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const out: JsxCall[] = [];
  const visit = (n: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === tag) {
      const props = n.attributes.properties;
      out.push({
        file, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
        attr: props.some((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === attr),
        spread: props.some((a) => ts.isJsxSpreadAttribute(a)),
      });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
};
const emptyCallsIn = (file: string, source: string) => jsxCallsIn(file, source, "EmptyState", "bodyPart");
const SRC_TSX = (() => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const x of readdirSync(join(ROOT, dir))) { const q = posix.join(dir, x); if (statSync(join(ROOT, q)).isDirectory()) walk(q); else if (q.endsWith(".tsx")) out.push(q); }
  };
  walk("src");
  return out;
})();
const IN_WORLD = new Set<string>(Object.values(FILES));
const WORLD_TSX = (Object.keys(FILES) as FileKey[]).filter((k) => FILES[k].endsWith(".tsx"));
const DISK_EMPTY_CALLS = SRC_TSX.filter((f) => !IN_WORLD.has(f)).flatMap((f) => emptyCallsIn(f, raw(f)));
const DRAWS_MLN_EMPTY = /from\s+"@\/components\/maswali\/maswali-empty-state"/;
const DISK_MLN_EMPTY_USERS = SRC_TSX.filter((f) => !IN_WORLD.has(f) && DRAWS_MLN_EMPTY.test(decomment(raw(f))));
const emptyCallsOf = (w: World) => [...DISK_EMPTY_CALLS, ...WORLD_TSX.flatMap((k) => emptyCallsIn(FILES[k], w.src[k]))];
const REAL_EMPTY_CALLS = emptyCallsOf(REAL);
check("11.3", `the census: of every <EmptyState> the app draws (${REAL_EMPTY_CALLS.length} in ${new Set(REAL_EMPTY_CALLS.map((c) => c.file)).size} files, a TSX parse of src/), only Millionea's one wrapper asks for a part or spreads its props; the wrapper is drawn only by Millionea's pages — Tiketi zangu's two empty states`, (w) => {
  const d: string[] = [];
  const calls = emptyCallsOf(w);
  need(d, calls.length >= 60, `only ${calls.length} calls read`);
  const asking = calls.filter((c) => c.attr || c.spread);
  need(d, asking.length === 1 && asking[0].file === FILES.mlnEmpty && asking[0].attr, `a part or a spread at ${j(asking.map((c) => `${c.file}:${c.line}`))}`);
  const users = [...DISK_MLN_EMPTY_USERS, ...WORLD_TSX.filter((k) => DRAWS_MLN_EMPTY.test(decomment(w.src[k]))).map((k) => FILES[k])];
  need(d, users.length > 0 && users.every((f) => f.startsWith("src/app/millionea/")), `Millionea's empty state is drawn outside Millionea: ${j(users)}`);
  const list = code(w, "list");
  need(d, count(list, "<MaswaliEmptyState ") === 2 && list.includes('<MaswaliEmptyState fill={journey} kind="positions" title={t.millionea.emptyTickets}'), "the list's two empty states are not Millionea's");
  return d;
});

const FRIDAY_1800 = Date.parse("2026-12-04T15:00:00.000Z"); // Friday 18:00 EAT
check("11.4", `§T5 · WITH Millionea's part the numerals take their face and nothing else changes: Tiketi zangu's empty body, filled as the page fills it, sets the week and the clock \`.mono\` in sw, en and zh — the Chinese body too, whose hung mark comes back in a fragment — and a numeral after a hung mark mid-text; for every body of 11.2 (${REAL_TEXT_PASS.mono} of them with a numeral set) the markup less its numeral runs is the markup without the part`, (w) => {
  const d: string[] = [];
  const { MaswaliEmptyState } = mlnEmptyOf(w), { EmptyState } = emptyOf(w);
  const { eatWeekdayClock } = req("../src/components/maswali/maswali-format.ts") as { eatWeekdayClock: (t: unknown, ms: number) => string };
  const { fill } = req("../src/lib/utils.ts") as { fill: (s: string, v: Record<string, string | number>) => string };
  for (const l of LOCALES) {
    const M = mln(w, l);
    const props = { fill: true, kind: "positions", title: M.emptyTickets, body: fill(M.emptyTicketsNext, { week: 3, when: eatWeekdayClock(w.dict[l], FRIDAY_1800) }) };
    const m = inApp(l, h(MaswaliEmptyState as never, props as never)), plain = inApp(l, h(EmptyState as never, props as never));
    need(d, m.includes('<span class="mono">3</span>') && m.includes('<span class="mono">18:00</span>'), `${l}: the week and the clock are not mono ("${textOf(m).slice(textOf(m).indexOf(M.emptyTickets) + M.emptyTickets.length)}")`);
    need(d, faceless(m) === plain, `${l}: more than the numerals' face changed`);
  }
  const zh = P(emptyTextOf(w).emptyStateBody("第3周开放至周五 18:00。开放时公布 15 道问题。", numeralRuns));
  need(d, zh.includes('<span class="mono">18:00</span>') && zh.includes('<span class="mono">15</span>') && count(zh, 'class="kp-cjk-mark"') === 2, `zh: a numeral after a hung mark is not mono, or a mark no longer hangs (${zh})`);
  const text = textPassOf(w);
  for (const x of text.faces) d.push(`more than the face changed — ${x}`);
  need(d, text.mono > 1_000, `the part set the numerals of only ${text.mono} bodies`);
  return d;
});

// ── §12 · M5 · L7 ───────────────────────────────────────────────────────────────────────────────────────────────────
check("12.1", "the stub: the serial whole on its own row; the purchase time one run after its weekday (\"Jumatano\" / \"2 Des, 10:18\"), on a row of its own; the week its number alone", (w) => {
  const m = ticketMarkup(w, "sw"), d: string[] = [];
  const M = mln(w, "sw");
  const field = (label: string) => new RegExp(`<div class="([^"]*)"><span class="font-mono text-micro uppercase eyebrow text-text-subtle">${label}</span><span class="[^"]*">([\\s\\S]*?)</span></div>`).exec(m);
  const serial = field(M.stubSerial), week = field(M.stubWeek), bought = field(M.stubBought);
  need(d, !!serial && serial[1].includes("col-span-2") && serial[2] === `<span class="whitespace-nowrap">${SERIAL}</span>`, "the serial is not whole on its own row");
  need(d, !!week && textOf(week[2]) === "49", `the week reads "${week ? textOf(week[2]) : "?"}"`);
  need(d, !!bought && bought[1].includes("col-span-2") && /<time date[Tt]ime="[^"]+">Jumatano <span class="whitespace-nowrap">2 Des, 10:18<\/span><\/time>/.test(bought[2]), `the purchase time is not "Jumatano" + one run (${bought ? bought[2] : "?"})`);
  return d;
});

// ── §13 · M6 · L3 ───────────────────────────────────────────────────────────────────────────────────────────────────
check("13.1", "the legal line follows the real resolution mode and opens the week's register (a 44px reach); the stub's hash opens it too; the page passes the read model's mode, and the register only for a final public week a reader may open", (w) => {
  const { ledger } = modsOf(w), d: string[] = [];
  const t = w.dict.en, mk = (two: boolean, href?: string) => inApp("en", h(ledger.MaswaliLossReceipt as never, { t, week: 49, serial: SERIAL, winners: 0, carriedTo: 50, legal: { twoOfficer: two, href } } as never));
  const single = mk(false, "/millionea/register/MLN-2026-W49"), two = mk(true);
  const market = t.market as Record<string, string>;
  need(d, textOf(single).includes(market.resSingleOfficer) && textOf(two).includes(market.resTwoOfficer), "the mode is not said");
  need(d, /<a [^>]*href="\/millionea\/register\/MLN-2026-W49"[^>]*>[\s\S]*?Week register/.test(single) && !/href="\/millionea\/register/.test(two), "the register door is wrong");
  const stub = ticketMarkup(w, "en", { stub: { price: 1_000, boughtAt: BOUGHT, questionSetHash: "19813468…", registerHref: "/millionea/register/MLN-2026-W49" } });
  need(d, /<a [^>]*href="\/millionea\/register\/MLN-2026-W49"[^>]*>19813468…/.test(stub), "the stub's hash does not open the register");
  const p = code(w, "page");
  need(d, p.includes('const legal: MaswaliLegal = { twoOfficer: view.resolution === "two", href: registerHref };') && count(p, "legal={legal}") === 2, "the page does not pass the mode");
  need(d, p.includes('const registerHref = gate.visible && view.week.visibility === "PUBLIC" && (view.week.state === "SETTLED" || view.week.state === "VOIDED")'), "the register is offered where it is not a page");
  need(d, mln(w, "en").wonHeading === "You won" && mln(w, "sw").wonHeading === "Umeshinda" && mln(w, "zh").wonHeading === "您中奖了" && code(w, "ledger").includes("heading={t.millionea.wonHeading}"), "the receipt's heading is not Millionea's");
  return d;
});

// ── §14 · L1 + the kit Tabs' parity ─────────────────────────────────────────────────────────────────────────────────
const tabsNew = (w: World) => (w.src.tabs === REAL.src.tabs ? req("../src/components/ui/tabs.tsx") : compiled(FILES.tabs, w.src.tabs)) as { Tabs: unknown };
const BEFORE_TABS = execFileSync("git", ["show", `cdb4bf46e:${FILES.tabs}`], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n");
const tabsOld = compiled<{ Tabs: unknown }>(FILES.tabs, BEFORE_TABS);
const TAB_CASES: Array<Record<string, unknown>> = (() => {
  const items = (links: boolean, extra: Record<string, unknown> = {}) => [
    { value: "a", labelEn: "Questions", ...(links ? { href: "/positions" } : {}), ...extra },
    { value: "b", labelEn: "Up & Down", count: 3, ...(links ? { href: "/updown/history" } : {}) },
    { value: "c", labelEn: "Juu na Chini", ...(links ? { href: "/x" } : {}) },
  ];
  const out: Array<Record<string, unknown>> = [];
  for (const variant of ["line", "segmented", "pill"]) {
    for (const links of [true, false]) {
      for (const value of ["a", "b"]) {
        out.push({ variant, value, tabs: items(links), ariaLabel: "Kinds" });
        out.push({ variant, value, tabs: items(links, { glyph: h("svg", { "aria-hidden": true }) }), ariaLabel: "Kinds" });
      }
    }
  }
  return out;
})();
check("14.1", "the kind switch's Millionea wears the ink (the kit Tabs' `ink`), and only it", (w) => {
  const d: string[] = [];
  const { Tabs } = tabsNew(w);
  const m = inApp("en", h(Tabs as never, { variant: "line", value: "millionea", ariaLabel: "Kinds", tabs: [{ value: "questions", labelEn: "Questions", href: "/positions" }, { value: "millionea", labelEn: "Millionea", href: "/millionea/tickets", ink: "millionea" }] } as never));
  need(d, m.includes('<span class="kp-millionea-ink">Millionea</span>') && count(m, "kp-millionea-ink") === 1, "the switch's Millionea is not in the ink");
  need(d, code(w, "switch").includes('...(millionea ? [{ value: "millionea", labelEn: t.millionea.productLabel, href: "/millionea/tickets", ink: "millionea" as const }] : []),'), "the switch does not ask for the ink");
  return d;
});
check("14.2", "the kit Tabs draws every caller that does not ask for the ink byte for byte as before (cdb4bf46e), in every variant and mode, in three languages — and no caller but the kind switch asks for it", (w) => {
  const d: string[] = [];
  const { Tabs } = tabsNew(w);
  for (const l of LOCALES) for (const c of TAB_CASES) {
    const a = inApp(l, h(tabsOld.Tabs as never, c as never)), b = inApp(l, h(Tabs as never, c as never));
    if (a !== b) { d.push(`${l}/${c.variant}/${c.value}: first differing byte ${[...a].findIndex((ch, i) => ch !== b[i])}`); break; }
  }
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const n of readdirSync(join(ROOT, dir))) { const p = posix.join(dir, n); if (statSync(join(ROOT, p)).isDirectory()) walk(p, out); else if (p.endsWith(".tsx")) out.push(p); }
    return out;
  };
  const askers = walk("src").filter((f) => /\bink:\s*"millionea"/.test(decomment(raw(f))));
  need(d, j(askers) === j([FILES.switch]), `ink asked by ${j(askers)}`);
  return d;
});

// ── §15 · the decided words ─────────────────────────────────────────────────────────────────────────────────────────
const WORDS: Record<string, Partial<Record<Locale, string>>> = {
  // L5 capitalises en and sw; zh's spacing is the lead's zh ruling, DOORS' key (d47b37e90), checked by §15.2's rule instead.
  nextEvent: { en: "Next event {when}", sw: "Tukio linalofuata {when}" },
  standby: { en: "Standing by", sw: "Iko akiba", zh: "候补中" },
  cancelledLine: { en: "Cancelled · {price}", sw: "Imeghairiwa · {price}", zh: "已取消 · {price}" },
  finality: { en: "Every figure here is final — nothing further is owed.", sw: "Kila takwimu hapa ni ya mwisho — hakuna kinachodaiwa zaidi.", zh: "此处每个数字均为最终结果——不再有任何欠付。" },
  lossNoWinner: { en: "No 10/10 ticket", sw: "Hakuna tiketi ya 10/10", zh: "无 10/10 彩票" },
  paidTo: { en: "Paid to main balance · {when}", sw: "Imelipwa kwenye salio kuu · {when}", zh: "已派发至主余额 · {when}" },
  ticketVoidedLanded: {
    en: "Week voided: {voided} main questions void, only {valid} valid reserves. {price} returned to main balance.",
    sw: "Wiki imebatilishwa: maswali makuu {voided} batili, akiba halali {valid} tu. {price} imerudi kwenye salio kuu.",
    zh: "本周已作废：{voided} 道正选题作废，有效备选题仅 {valid} 道。{price} 已退回主余额。",
  },
  cancelling: { en: "Cancelling…", sw: "Inaghairi…", zh: "正在取消…" },
};
check("15.1", "the decided words, key for key, in three languages (L2 finality, L4 the stamp, L5 the next event, L6 the reserve standing by, L12 where the money went, M4 the wait)", (w) => {
  const d: string[] = [];
  for (const [k, want] of Object.entries(WORDS)) for (const l of LOCALES) if (want[l] !== undefined) need(d, mln(w, l)[k] === want[l], `${l}.${k}: "${mln(w, l)[k]}"`);
  return d;
});
// The lead's zh ruling (2026-10-21; DOORS' d47b37e90): Millionea's Chinese takes a space only where a Latin letter or a digit
// meets a Han character, never between two Han characters — a weekday-and-clock opens on a Han weekday ("周五 18:00").
const HAN = "[\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff]";
const HAN_SPACE_HAN = new RegExp(`${HAN} ${HAN}`);
check("15.2", "zh: every template of this surface that a weekday-and-clock fills reads with no space between two Han characters — \"第49周开放至周五 18:00。\" — filled as the page fills it", (w) => {
  const d: string[] = [];
  const zh = mln(w, "zh"), when = "周五 18:00";
  for (const k of ["emptyTicketsNext", "lockedAt", "salesCloseAt", "firstEventAt", "paidTo"]) {
    const filled = String(zh[k]).replace("{week}", "49").replace("{when}", when);
    need(d, !HAN_SPACE_HAN.test(filled), `zh.${k} → "${filled}"`);
  }
  need(d, String(zh.emptyTicketsNext).replace("{week}", "49").replace("{when}", when) === "第49周开放至周五 18:00。", "the empty list's week line is not the ruled one");
  need(d, code(w, "list").includes("fill(t.millionea.emptyTicketsNext, { week: weekNumberOf(selling.code), when: eatWeekdayClock(t, msOf(selling.closesAt) ?? 0) })"), "the page does not fill it with the weekday-and-clock");
  return d;
});

// ── §16 · L8 ────────────────────────────────────────────────────────────────────────────────────────────────────────
check("16.1", "the cannot-win line is the kit's neutral Callout; the sunset's score is the ONE ledger's own note under the share (round 2) — never a hand-rolled inset box", (w) => {
  const d: string[] = [];
  const m = ticketMarkup(w, "en", { weekState: "RESOLVING", cannotWin: true });
  const cw = mln(w, "en").cannotWin;
  need(d, new RegExp(`<div role="note" class="flex items-start border[^"]*">[\\s\\S]*?${cw.slice(0, 30)}`).test(m) && !m.includes("mat-inset rounded-control"), "the cannot-win line is not the Callout");
  need(d, !code(w, "ledger").includes("mat-inset rounded-control") && !/sunsetScore/.test(code(w, "ledger")), "the sunset line is drawn by the receipt again, beside the ledger's own");
  return d;
});
// ── §23 · round 2: the ONE ledger and the ONE week chip ──────────────────────────────────────────────────────────────
const LEDGER_ROWS = [
  { key: "sales", label: "Ticket sales", value: "TZS 10,000" }, { key: "moneyIn", label: "Money in", value: "TZS 10,000" },
  { key: "jackpot", label: "Jackpot", value: "TZS 10,000" }, { key: "fee", label: "Fee", value: "−TZS 1,300" },
  { key: "winners", label: "To winners", value: "TZS 8,700" }, { key: "share", label: "÷ 2", value: "TZS 4,350" },
  { key: "moneyOut", label: "Money out", value: "TZS 10,000" },
];
/** A final, won week's money as the one core states it (`MillioneaWeekMoney`): carried in from Week 44; its rounding
 *  remainder (TZS 1, MR-25) carried on to Week 46 — MR-26: 412,001 + 7,000 in = 54,470 + 364,530 + 1 out. */
const WEEK_MONEY = {
  id: "mlw_test", code: "MLN-2026-W45", state: "SETTLED", isFinal: false, closedAt: "2026-11-06T15:01:00.000Z", settledAt: "2026-11-11T09:01:00.000Z",
  tickets: 7, sales: 7_000, carryIn: 412_001, jackpot: 419_001, winners: 2, share: 182_265, fee: 54_470, topUp: 0, paid: 364_530, carriedForward: 1,
  refundsPending: false, carryFromCode: "MLN-2026-W44", carryToCode: "MLN-2026-W46", ticketPrice: 1_000, floor: 0, feeRate: 0.13, traLevy: 5_447,
  gbtLevy: 2_723, toWinners: 364_531, remainder: 1, basis: "TEN_OF_TEN", winningScore: 10,
} as const;
check("23.1", "round 2 · the win receipt is the week's ONE ledger, from the ONE core on either line (`millioneaWeekMoneyRecord` → `registerLedgerRows`): this player's gold rows spliced straight after `share`; a PUBLIC week's rows are the register's, link for link; a DRIVE week's the same rows with no link (its carries named); no final money, no ledger (never a partial MR-26)", (w) => {
  const d: string[] = [];
  const mod = (w.src.ledger === REAL.src.ledger ? live.ledger : compiled(FILES.ledger, w.src.ledger)) as LedgerMod & { winLedgerRows: (t: unknown, rows: unknown[], e: unknown) => Array<{ key: string }> };
  const one = mod.winLedgerRows(REAL.dict.en, LEDGER_ROWS, { perTicket: 4_350, yours: 1, yourTotal: 4_350 }).map((r) => r.key);
  const two = mod.winLedgerRows(REAL.dict.en, LEDGER_ROWS, { perTicket: 4_350, yours: 2, yourTotal: 8_700 }).map((r) => r.key);
  need(d, j(one) === j(["sales", "moneyIn", "jackpot", "fee", "winners", "share", "yours", "moneyOut"]), `one ticket: ${j(one)}`);
  need(d, j(two) === j(["sales", "moneyIn", "jackpot", "fee", "winners", "share", "yours", "yourTickets", "yourTotal", "moneyOut"]), `two tickets: ${j(two)}`);
  need(d, code(w, "ledger").includes('<MaswaliLedger rows={winLedgerRows(t, rows, earned)} className="border-t border-border pt-3" />'), "the receipt does not draw the one ledger");
  const p = code(w, "page");
  need(d, p.includes("const money = paid ? await millioneaWeekMoneyRecord(view.week.id) : null;")
    && p.includes('const ledgerRows = money ? registerLedgerRows(t, locale, money, { links: view.week.visibility === "PUBLIC" && gate.visible }) : null;')
    && p.includes("{ledgerRows && ( <MaswaliWinLedger"), "the page does not draw the one core's rows on both lines, links only on the public line for a reader shown the product, and only for final money");
  // The rows themselves, drawn (REGISTER's builder and the kit ledger): the ticket's public rows are the register page's
  // own call, byte for byte; its drive rows are the same rows, every carry named, no row a link.
  const { registerLedgerRows } = req("../src/app/millionea/register/register-parts.tsx") as { registerLedgerRows: (t: unknown, l: Locale, m: unknown, o?: { links?: boolean }) => Array<{ href?: string | null }> };
  const { MaswaliLedger } = req("../src/components/maswali/maswali-ledger.tsx") as { MaswaliLedger: unknown };
  for (const l of LOCALES) {
    const drawn = (rows: unknown) => inApp(l, h(MaswaliLedger as never, { rows } as never));
    const register = drawn(registerLedgerRows(REAL.dict[l], l, WEEK_MONEY)), pub = drawn(registerLedgerRows(REAL.dict[l], l, WEEK_MONEY, { links: true }));
    const driveRows = registerLedgerRows(REAL.dict[l], l, WEEK_MONEY, { links: false }), drive = drawn(driveRows);
    need(d, pub === register && register.includes('href="/millionea/register/MLN-2026-W44"') && register.includes('href="/millionea/register/MLN-2026-W46"'), `${l}: the public rows are not the register's, link for link`);
    need(d, !drive.includes("/millionea/register") && driveRows.every((r) => !r.href) && textOf(drive).includes("44") && textOf(drive).includes("46") && textOf(drive) === textOf(register), `${l}: the drive rows link, or lose a carry's week, or differ in words`);
  }
  return d;
});
check("23.2", "round 2 · a ticket's week wears the ONE week chip (`WeekStateChip`, P6's phase words): \"Week 52\" then \"Objection window\" in the head", (w) => {
  const d: string[] = [];
  const m = ticketMarkup(w, "en", { weekState: "RESOLVING", phase: { kind: "objections", objectionsUntil: NOW + 86_400_000 } });
  need(d, /data-testid="millionea-week-state"[^>]*>Objection window</.test(m) || /data-testid="millionea-week-state"[\s\S]{0,400}?>Objection window</.test(m), "the head does not wear the week chip with its phase");
  need(d, code(w, "ticket").includes("<WeekStateChip t={t} state={weekState} phase={phase ?? null} />") && code(w, "page").includes("phase={phase}"), "the chip is not handed the week's phase");
  return d;
});

// ── §17 · L10 + the seal (the platform's) ───────────────────────────────────────────────────────────────────────────
check("17.1", "the seal speaks Millionea's words — eyebrow \"Millionea · Week 49\", heading \"You won\", facts the tickets at 10/10 then each serial — and lands final", (w) => {
  const a = code(w, "acts"), p = code(w, "page"), d: string[] = [];
  need(d, a.includes('dispatchWinCelebration({ kind: "WIN", amount, eyebrow, heading: t.millionea.wonHeading, facts: sealFacts(line, serials), roll: false })'), "the door does not hand the seal its words");
  need(d, p.includes("eyebrow={`${t.millionea.productLabel} · ${weekWord(t, weekNumber)}`}") && p.includes("line={counted(paidSerials.length, t.millionea.wonTicketsOne, t.millionea.wonTickets)} serials={paidSerials}"), "the page does not name the week and the serials");
  return d;
});
check("17.2", "the platform's seal: its words are the payload's when given and its own otherwise; the amount ONE line at every width (nowrap, sized by its final figure to the column, never over 38px); facts one whole line each", (w) => {
  const c = code(w, "celebrate"), d: string[] = [];
  need(d, c.includes("{payload.eyebrow ?? t.common.positionWon}") && c.includes("const heading = payload.heading ?? t.market.wonHeading;"), "the seal's words are not optional");
  need(d, c.includes('const amountFit = { "--seal-chars": formatTzs(payload.amount).length, fontSize: "min(38px, calc(100cqi / (var(--seal-chars) * 0.6)))" } as CSSProperties;'), "the amount's size is not fitted to its figure");
  need(d, c.includes('<div className="g-settle mt-3 w-full [container-type:inline-size]" style={{ "--i": 2 } as CSSProperties}> <p data-seal-amount="" className={`whitespace-nowrap font-mono text-[38px]'), "the amount is not one line in its column's container");
  need(d, c.includes("style={amountFit}"), "the fitted size is not applied");
  // RE-PINNED IN THE OPEN 2026-10-22 (S5-R2-TICKETS): back to round 1's drawing — each fact whole on its line, drawn as its
  // caller hands it (Millionea sets its own numerals' face, 17.3); a classic seal passes no facts.
  need(d, c.includes('{payload.facts.map((f, i) => ( <span key={i} className="whitespace-nowrap"> {i > 0 && <span className="sr-only">{" · "}</span>} {f} </span> ))}'), "a fact may break, or is not drawn as handed");
  return d;
});
/** The ticket's acts as the world writes them — their two server actions stood in (a static render reaches no server). */
{
  const at = req.resolve("../src/app/millionea/actions.ts");
  const stub = new NodeModule(at);
  stub.filename = at; stub.loaded = true;
  stub.exports = { cancelMillioneaTicketAction: async () => ({}), markMillioneaTicketSeenAction: async () => ({ ok: true }) };
  (req.cache as Record<string, unknown>)[at] = stub;
}
type ActsMod = { sealFacts: (line: string, serials: readonly string[]) => unknown[] };
const actsOf = (w: World) => (w.src.acts === REAL.src.acts ? req("../src/app/millionea/tickets/[serial]/ticket-acts.tsx") : compiled(FILES.acts, w.src.acts)) as ActsMod;
check("17.3", "§T5 (round 2) · Millionea hands the seal its facts in the numerals' face, in sw/en/zh: the count line's numerals each a `.mono` run and its words in the body face, every serial whole in one `.mono` run, the words the dictionary's (the seal draws each fact as handed, 17.2); the held and forfeited notes' counts mono too", (w) => {
  const { sealFacts } = actsOf(w), d: string[] = [];
  const { counted } = req("../src/components/maswali/maswali-format.ts") as { counted: (n: number, one: string, many: string) => string };
  for (const l of LOCALES) {
    const M = mln(w, l);
    for (const n of [1, 3]) {
      const line = counted(n, M.wonTicketsOne, M.wonTickets), serials = Array.from({ length: n }, (_, i) => `MLN-2026-W49-00004${i + 1}`);
      const m = P(sealFacts(line, serials).map((f, i) => h("span", { key: i }, f as never)));
      const numerals = line.match(/\d+(?:\/\d+)?/g) ?? [];
      need(d, numerals.length === 2 && numerals.every((x) => m.includes(`<span class="mono">${x}</span>`)), `${l}/${n}: the line's numerals are not each a mono run (${m})`);
      need(d, !/<span class="mono">[^<]*[^\d/<][^<]*<\/span>/.test(m.replace(/<span class="mono">MLN-[^<]*<\/span>/g, "")), `${l}/${n}: a word is set in the numerals' face (${m})`);
      need(d, serials.every((s) => m.includes(`<span class="mono">${s}</span>`)), `${l}/${n}: a serial is not whole in one mono run (${m})`);
      need(d, textOf(m) === line + serials.join(""), `${l}/${n}: the words changed (${textOf(m)})`);
    }
    for (const [one, many] of [[M.shareHeldNoteOne, M.shareHeldNote], [M.shareForfeitedNoteOne, M.shareForfeitedNote]]) {
      const note = P(emptyTextOf(w).noticeBody(counted(2, one, many), { part: numeralRuns }));
      need(d, note.includes('<span class="mono">2</span>'), `${l}: a held or forfeited note's count is not mono (${textOf(note)})`);
    }
  }
  need(d, count(code(w, "page"), "{ part: numeralRuns }") === 2, "the held and forfeited notes do not set their counts mono");
  return d;
});

// ── §18 · L11 ───────────────────────────────────────────────────────────────────────────────────────────────────────
check("18.1", "an open week's ticket says where its week stands before any result: its sales close and its first event", (w) => {
  const m = ticketMarkup(w, "en", { live: { salesCloseAt: Date.parse("2026-12-04T15:00:00.000Z"), firstEventAt: Date.parse("2026-12-05T06:00:00.000Z") } });
  const live = textOf(/data-testid="millionea-ticket-live"[^>]*>([\s\S]*?)<\/p>/.exec(m)?.[1] ?? "");
  const d: string[] = [];
  need(d, live.includes("Sales close Friday 18:00") && live.includes("First event: Saturday 09:00"), `the live line reads "${live}"`);
  need(d, code(w, "page").includes('} : running && view.week.state === "OPEN" ? { salesCloseAt: msOf(view.week.closesAt) ?? undefined, firstEventAt: firstEvent, } : undefined}'), "the page does not hand an open week's facts");
  return d;
});

// ── §19 · L13 ───────────────────────────────────────────────────────────────────────────────────────────────────────
check("19.1", "a reserve whose result is in, before the week is final, shows the verdict-free `sealed` mark (a stamp) and still says \"Standing by\"; unsealed stands by; a final week grades as before", (w) => {
  const { seal } = modsOf(w), d: string[] = [];
  const pending = lineOf(seal, ["YES", ...Array(9).fill(null)], ["YES", "VOID", null, "NO", null]);
  need(d, j(pending.annex.map((a) => a.mark)) === j(["sealed", "void", "standby", "sealed", "standby"]), `the annex reads ${j(pending.annex.map((a) => a.mark))}`);
  const final = lineOf(seal, Array(10).fill("YES"), Array(5).fill("YES"), { final: true });
  need(d, final.annex.every((a) => a.mark === "unused"), "a final week's unused reserves changed");
  need(d, seal.socketWord(REAL.dict.en as never, "sealed") === mln(w, "en").standby, "the mark's word is not \"Standing by\"");
  const g = renderToStaticMarkup(h(seal.SocketGlyph as never, { mark: "sealed", s: 18 } as never));
  need(d, g.includes("p-stamp") && g.includes("text-text-muted"), "the mark is not the muted stamp");
  return d;
});

// ── §20 · L14 ───────────────────────────────────────────────────────────────────────────────────────────────────────
check("6.4", "H4 · a moment wrapper is keyed by the moments it holds — the stub's (cut, undo, reveal, lock) and the Seal Line's (carry, draw) — so a new moment after a refresh mounts fresh and waits to be seen (qa:maswali-ticket-moments 3.2: the reverse cut once played at once, off screen, in the seen cut's wrapper)", (w) => {
  const c = code(w, "ticket"), d: string[] = [];
  need(d, c.includes("<MaswaliMoment key={`stub-${cut ?? \"rest\"}${reveal ? \"-reveal\" : \"\"}${lock ? \"-lock\" : \"\"}`}>{perforation}{stubBlock}</MaswaliMoment>"), "the stub's moment is not keyed by its moments");
  need(d, c.includes("<MaswaliMoment key={`seal${carry ? \"-carry\" : \"\"}${draw ? \"-draw\" : \"\"}`}>{sealLine}</MaswaliMoment>"), "the Seal Line's moment is not keyed by its moments");
  return d;
});
check("20.1", "L14 · the lock line performs once after the week's RECORDED close: the read model's \"close\" fact (a ticket bought before it and not cancelled by it; none without a recorded close), the page's `lock` from it, `.m-seal` on the stub's lock line inside the stub's moment", (w) => {
  const pl = code(w, "player"), d: string[] = [];
  need(d, pl.includes('if (week.closedAt && Date.parse(t.createdAt) < Date.parse(week.closedAt) && !(t.cancelledAt && Date.parse(t.cancelledAt) <= Date.parse(week.closedAt))) facts.push({ kind: "close", at: week.closedAt });'), "the read model has no close fact on the recorded close");
  need(d, pl.includes('kind: "cut" | "press" | "carry" | "cancel" | "refund" | "close" | "result"'), "the fact's kind is not declared");
  need(d, code(w, "page").includes('lock: has("close"),'), "the page does not play the lock from the close fact");
  const m = ticketMarkup(w, "en", { weekState: "CLOSED", closedAt: Date.parse("2026-12-04T15:00:00.000Z"), play: { lock: true } });
  const at = m.indexOf("data-mln-moment");
  need(d, at > 0 && /<p class="col-span-2 flex items-center gap-1\.5 text-body-sm text-text-muted m-seal">/.test(m) && at < m.indexOf(" m-seal"), "the lock line does not seal inside the stub's moment");
  return d;
});

// ── §21 · M9 ────────────────────────────────────────────────────────────────────────────────────────────────────────
check("21.1", "the ghosts stand where the page lands: Tiketi zangu's head draws three kinds when handed three (two by default, as before); the list ghost one strip row; the ticket ghost's Seal Line box its 24 + 14 + 18 + 14 bars between two rules", (w) => {
  const d: string[] = [];
  const mod = w.src.headGhost === REAL.src.headGhost ? req("../src/components/journey/tickets/tickets-ghost.tsx") : compiled(FILES.headGhost, w.src.headGhost);
  const { TicketsHeadGhost } = mod as { TicketsHeadGhost: unknown };
  const boxes = (kinds?: number) => count(renderToStaticMarkup(h(TicketsHeadGhost as never, { t: REAL.dict.en, ...(kinds ? { kinds } : {}) } as never)), "h-[44px] w-[96px]");
  need(d, boxes() === 2 && boxes(2) === 2 && boxes(3) === 3, `boxes: default ${boxes()}, 2 → ${boxes(2)}, 3 → ${boxes(3)}`);
  const g = code(w, "ticketGhost");
  need(d, g.includes('<div className="flex flex-col border-y border-border py-2"> <GhostBar className="h-[24px] w-full" /> <GhostBar className="mt-0.5 h-[14px] w-full" /> <GhostBar className={cn("mt-1.5 w-full", cancelOpen ? "h-[16px] xs:h-[18px]" : "h-[30px] xs:h-[32px]")} /> <GhostBar className="mt-0.5 h-[14px] w-full" /> </div>'), "the ticket ghost's Seal Line box is not the real one's bands (108px in an open week, 122px with results in, 2px less at 320 — measured)");
  return d;
});

check("21.2", "M9 · the ticket's head is two rows on a phone (its own chip; then its week and the week's chip) and one row from `sm` — the same rows in every language and state, never a ragged wrap — and its loading drawing draws the same rows", (w) => {
  const d: string[] = [];
  const HEAD = '<div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">';
  need(d, code(w, "ticket").includes(`${HEAD} <TicketStateChip t={t} shown={shown} />`), "the page's head is not two rows on a phone and one from sm");
  need(d, code(w, "ticketGhost").includes(`${HEAD} <GhostBar className="h-[23px] w-[112px] rounded-pill" /> <span className="inline-flex items-center gap-2">`), "the drawing's head is not the page's rows");
  return d;
});

// ── §22 · the hub's held row ────────────────────────────────────────────────────────────────────────────────────────
check("22.1", "the hub's held row lifts and presses as the kit's raised card (`mat-raised-i`); handed the words it is named \"View ticket · MLN-…\"; handed its window it draws the free cancel's line in the ticket page's words, gone at its end; omitted, no line", (w) => {
  const m = modsOf(w), d: string[] = [];
  const row = (more: Record<string, unknown>) => inApp("en", h(m.ticket.MaswaliHeldTicketRow as never, { href: `/millionea/tickets/${SERIAL}`, serial: SERIAL, line: lineOf(m.seal, Array(10).fill(null), Array(5).fill(null)), ...more } as never));
  const named = row({ t: REAL.dict.en }), open = row({ t: REAL.dict.en, cancelUntil: NOW + 582_000, serverNow: NOW }), shut = row({ t: REAL.dict.en, cancelUntil: NOW - 1, serverNow: NOW });
  need(d, named.includes(`aria-label="View ticket · ${SERIAL}"`) && /class="mat-raised mat-raised-i /.test(named), "the row is not named, or does not lift");
  // RE-PINNED IN THE OPEN at the S5 integration (2026-10-21): the shared `cancelFreeUntil` ends "EAT" since S5-DESIGN-SLIP.
  need(d, textOf(open).includes("Free cancel until 10:09 EAT · 9:42") && !textOf(named).includes("Free cancel") && !textOf(shut).includes("Free cancel"), `the cancel line is wrong (${textOf(open)})`);
  return d;
});

// ── §24 · M9 · the free cancel's band in the ticket's loading drawing ───────────────────────────────────────────────────
type HintMod = typeof import("../src/components/maswali/maswali-ghost-hint.tsx");
/** Runs `fn` as the client does: with a `window` (a note is kept, and read, only there). */
const asClient = <T,>(fn: () => T): T => {
  const g = globalThis as { window?: unknown };
  const had = "window" in g;
  g.window = g;
  try { return fn(); } finally { if (!had) delete g.window; }
};
check("24.1", "M9 · a door's note of the free cancel's end is kept on the client only, for that ticket only, and read as open only before its end; a ticket's address names its serial", (w) => {
  const d: string[] = [];
  const hint = (w.src.hint === REAL.src.hint ? req("../src/components/maswali/maswali-ghost-hint.tsx") : compiled(FILES.hint, w.src.hint)) as HintMod;
  const at = Date.parse("2026-12-02T07:00:00.000Z");
  hint.noteFreeCancel("MLN-2026-W49-000077", at + 60_000); // on the server: no window, nothing kept
  need(d, !asClient(() => hint.freeCancelKnownOpen("MLN-2026-W49-000077", at)), "a note written on the server was kept");
  const [open, edge, past, other, none] = asClient(() => {
    hint.noteFreeCancel("MLN-2026-W49-000078", at + 60_000);
    return [hint.freeCancelKnownOpen("MLN-2026-W49-000078", at), hint.freeCancelKnownOpen("MLN-2026-W49-000078", at + 60_000),
      hint.freeCancelKnownOpen("MLN-2026-W49-000078", at + 61_000), hint.freeCancelKnownOpen("MLN-2026-W49-000079", at), hint.freeCancelKnownOpen(null, at)];
  });
  need(d, open && !edge && !past && !other && !none, `open ${open}, at its end ${edge}, past it ${past}, another ticket ${other}, no serial ${none}`);
  need(d, !hint.freeCancelKnownOpen("MLN-2026-W49-000078", at), "a note was read on the server");
  const serials = ["/millionea/tickets/MLN-2026-W49-000041", "/millionea/tickets/MLN-2026-W49-000041/", "/millionea/tickets", "/millionea/tickets/a/b", null].map((p) => hint.ticketSerialOf(p));
  need(d, j(serials) === j(["MLN-2026-W49-000041", "MLN-2026-W49-000041", null, null, null]), `the address's serial: ${j(serials)}`);
  return d;
});
check("24.2", "M9 · the ticket's loading drawing draws the free cancel's band (its clock line, its two-line button, its rule) exactly when its door noted the window open — and the list's card and the hub's held row note it, the list for each ticket still inside its window", (w) => {
  const d: string[] = [];
  const { MillioneaTicketGhost } = (w.src.ticketGhost === REAL.src.ticketGhost ? req("../src/app/millionea/tickets/[serial]/ticket-ghost.tsx") : compiled(FILES.ticketGhost, w.src.ticketGhost)) as { MillioneaTicketGhost: unknown };
  const hint = req("../src/components/maswali/maswali-ghost-hint.tsx") as HintMod;
  const draw = (path: string) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: "en" } as never, h(MillioneaTicketGhost as never)))));
  const BAND = 'data-ghost-band="free-cancel"';
  const [open, other, list, past] = asClient(() => {
    hint.noteFreeCancel("MLN-2026-W49-000088", Date.now() + 600_000);
    hint.noteFreeCancel("MLN-2026-W49-000089", Date.now() - 1);
    return [draw("/millionea/tickets/MLN-2026-W49-000088"), draw("/millionea/tickets/MLN-2026-W49-000090"), draw("/millionea/tickets"), draw("/millionea/tickets/MLN-2026-W49-000089")];
  });
  const served = draw("/millionea/tickets/MLN-2026-W49-000088");
  need(d, count(open, BAND) === 1 && /data-ghost-band="free-cancel"><span[^>]*h-\[18px\][^>]*><\/span><span[^>]*h-\[53px\] w-full[^>]*><\/span><span[^>]*h-\[36px\] sm:h-\[18px\]/.test(open), "the band is not drawn, or not its three parts, when the door noted the window open");
  need(d, ![other, list, past, served].some((m) => m.includes(BAND)), "the band is drawn for a ticket no door noted, past its window, or on the server's paint");
  const card = code(w, "ticket"), list2 = code(w, "list");
  need(d, count(card, "{cancelUntil !== undefined && <MaswaliGhostHint serial={serial} cancelUntil={cancelUntil} />}") === 2, "the card and the held row do not both note the window they are handed");
  need(d, list2.includes("const until = msOf(await millioneaCancelUntil(g.week.id, row.boughtAt, new Date(nowMs)));") && list2.includes("cancelUntil={cancelUntil.get(row.serial)}"), "the list does not hand each card its window");
  return d;
});

// ── §25 · the hop: the destination's own drawing (the lead's round-2 item, 2026-10-22; REGISTER measured the shape) ──────
/** A drawing at an address, as the router draws it there — during a move `usePathname()` already names the destination. */
const atPath = (l: Locale, path: string, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l } as never, el as never))));
type ListGhostMod = { MillioneaTicketsGhost: unknown };
type TicketGhostMod = { MillioneaTicketGhost: unknown };
/** The two drawings as the world writes them, and as 7e9a314f0 drew them. */
const listGhostOf = (w: World) => (w.src.listGhost === REAL.src.listGhost ? req("../src/app/millionea/tickets/tickets-ghost.tsx") : compiled(FILES.listGhost, w.src.listGhost)) as ListGhostMod;
const ticketGhostOf = (w: World) => (w.src.ticketGhost === REAL.src.ticketGhost ? req("../src/app/millionea/tickets/[serial]/ticket-ghost.tsx") : compiled(FILES.ticketGhost, w.src.ticketGhost)) as TicketGhostMod;
const listGhostOld = compiled<ListGhostMod>(FILES.listGhost, atRelease(FILES.listGhost));
const ticketGhostOld = compiled<TicketGhostMod>(FILES.ticketGhost, atRelease(FILES.ticketGhost));
const HOPS: ReadonlyArray<readonly [string, "tickets" | "ticket"]> = [
  ["/millionea/tickets", "tickets"], [`/millionea/tickets/${SERIAL}`, "ticket"], [`/millionea/tickets/${SERIAL}/more`, "tickets"],
];
check("25.1", "the hop: Tiketi zangu's loading state draws the DESTINATION's own drawing, picked by the address being moved to (the platform's `RoutePick`) — the list's bands on /millionea/tickets, the ticket's own on /millionea/tickets/<serial> (never the list's bands over a ticket), the list's on anything deeper — in sw/en/zh; synchronous, it asks the server nothing", (w) => {
  const d: string[] = [];
  const loading = (w.src.listLoading === REAL.src.listLoading ? req("../src/app/millionea/tickets/loading.tsx") : compiled(FILES.listLoading, w.src.listLoading)) as { default: unknown };
  const { MillioneaTicketsGhost } = listGhostOf(REAL), { MillioneaTicketGhost } = ticketGhostOf(REAL);
  for (const l of LOCALES) for (const [path, want] of HOPS) {
    const got = atPath(l, path, h(loading.default as never));
    const own = atPath(l, path, h((want === "ticket" ? MillioneaTicketGhost : MillioneaTicketsGhost) as never));
    if (got !== own && d.length < 3) d.push(`${l} ${path}: the loading state draws the "${/data-ghost-page="([^"]*)"/.exec(got)?.[1] ?? "?"}" drawing, not the ${want}'s`);
  }
  need(d, !/\basync\b|\bawait\b|@\/lib\/server|getServerT|\bcookies\(|\bheaders\(/.test(code(w, "listLoading")) && !/^\s*["']use client["']/.test(w.src.listLoading), "the loading file asks the server, or became a client module");
  return d;
});
check("25.2", "each drawing names the page it stands for (`data-ghost-page` = \"tickets\" / \"ticket\": a value, not a word) on ONE box-less wrapper (`contents`), the container's first child, for the hop drive (it names a bar by its nearest marked ancestor); and stays wordless — in sw/en/zh its one text is the screen reader's \"loading\"", (w) => {
  const d: string[] = [];
  const { MillioneaTicketsGhost } = listGhostOf(w), { MillioneaTicketGhost } = ticketGhostOf(w);
  for (const l of LOCALES) {
    const loadingWord = String((w.dict[l].common as Record<string, unknown>).loading);
    for (const [name, Ghost, path] of [["tickets", MillioneaTicketsGhost, "/millionea/tickets"], ["ticket", MillioneaTicketGhost, `/millionea/tickets/${SERIAL}`]] as const) {
      const m = atPath(l, path, h(Ghost as never));
      need(d, new RegExp(`^<div data-measure="[a-z]+" class="[^"]*"><div class="contents space-y-\\d+" data-ghost-page="${name}">`).test(m) && count(m, "data-ghost-page=") === 1, `${l}: the ${name} drawing does not name its page on one wrapper around it (${m.slice(0, 120)})`);
      need(d, textOf(m) === loadingWord, `${l}: the ${name} drawing says "${textOf(m)}"`);
    }
  }
  return d;
});
/** 7e9a314f0's drawing with the mark put in: the container's rhythm moved onto a box-less wrapper that holds the whole
 *  drawing, the container keeping its tier and padding — nothing else. */
const markedAsRelease = (old: string, name: string) => old
  .replace(/^<div data-measure="([a-z]+)" class="([^"]*) (space-y-\d+)">/, (_m, tier: string, base: string, rhythm: string) => `<div data-measure="${tier}" class="${base}"><div class="contents ${rhythm}" data-ghost-page="${name}">`)
  .replace(/<\/div>$/, "</div></div>");
check("25.3", "the mark moves nothing: inside its box-less wrapper each drawing is byte for byte 7e9a314f0's — the wrapper carries the drawing's rhythm (the container spaces only its own children), the container keeps its tier and padding — in sw/en/zh, with the journey's head and with the free cancel's band; the kit PageContainer is untouched", (w) => {
  const d: string[] = [];
  need(d, w.src.pageContainer === atRelease(FILES.pageContainer), "the kit PageContainer changed");
  const { MillioneaTicketsGhost } = listGhostOf(w), { MillioneaTicketGhost } = ticketGhostOf(w);
  const hint = req("../src/components/maswali/maswali-ghost-hint.tsx") as HintMod;
  const head = h("div", { "data-head": "" });
  for (const l of LOCALES) {
    const cases: Array<[string, unknown, unknown, string, Record<string, unknown>]> = [
      ["tickets", listGhostOld.MillioneaTicketsGhost, MillioneaTicketsGhost, "/millionea/tickets", {}],
      ["tickets", listGhostOld.MillioneaTicketsGhost, MillioneaTicketsGhost, "/millionea/tickets", { journeyHead: head }],
      ["ticket", ticketGhostOld.MillioneaTicketGhost, MillioneaTicketGhost, `/millionea/tickets/${SERIAL}`, {}],
      ["ticket", ticketGhostOld.MillioneaTicketGhost, MillioneaTicketGhost, "/millionea/tickets/MLN-2026-W49-000091", {}],
    ];
    const drawn = asClient(() => {
      hint.noteFreeCancel("MLN-2026-W49-000091", Date.now() + 600_000); // the last case draws the free cancel's band
      return cases.map(([, Old, Now, path, props]) => [atPath(l, path, h(Old as never, props as never)), atPath(l, path, h(Now as never, props as never))]);
    });
    need(d, drawn[3][1].includes('data-ghost-band="free-cancel"'), `${l}: the band case drew no band`);
    cases.forEach(([name], i) => {
      const [old, now] = drawn[i];
      need(d, now !== old && now === markedAsRelease(old, name), `${l} ${name} #${i}: not 7e9a314f0's drawing with the mark put in (${now.slice(0, 140)})`);
    });
  }
  return d;
});

/* ── run ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const runAll = (w: World, quiet: boolean) => {
  const failed: string[] = [];
  for (const c of CHECKS) {
    let d: string[];
    try { d = c.run(w); } catch (e) { d = [`threw: ${(e as Error).message.split("\n")[0]}`]; }
    if (d.length) failed.push(c.id);
    if (!quiet) console.log(`${d.length ? "FAIL" : "PASS"} ${c.id} · ${c.label}${d.length ? ` — ${d.join(" | ")}` : ""}`);
  }
  return { failed };
};
const problems: string[] = [];
if (!PROVE_RED) {
  const r = runAll(REAL, false);
  console.log(`\nMASWALI TICKETS: ${CHECKS.length - r.failed.length} passed, ${r.failed.length} failed`);
  process.exit(r.failed.length === 0 ? 0 : 1);
}
{
  const r = runAll(REAL, true);
  if (r.failed.length) problems.push(`the real tree fails ${r.failed.join(", ")} — fix it before proving red`);
}
const plantSrc = (k: FileKey, from: string, to: string, w: World = REAL): World | null =>
  count(w.src[k], from) === 1 ? { ...w, src: { ...w.src, [k]: w.src[k].replace(from, to) } } : null;
const plantWord = (l: Locale, key: string, value: string): World =>
  ({ ...REAL, dict: { ...REAL.dict, [l]: { ...REAL.dict[l], millionea: { ...REAL.dict[l].millionea, [key]: value } } } });
const PLANTS: Array<[string, string, World | null]> = [
  ["H1 undone — the ticket back above its outcome", "1.1", plantSrc("page", "          {paid && view.win && (\n", "          <div data-testid=\"millionea-ticket\">{null}</div>\n          {paid && view.win && (\n")],
  ["H1 undone — the week line a receipt row's label again", "1.2", plantSrc("ledger", '<p className="border-t border-border pt-3 text-body-sm text-text" data-testid="millionea-loss-week">', '<p className="border-t border-border pt-3 font-mono text-micro uppercase" data-testid="millionea-loss-week">')],
  ["H1 undone — the positions back on the loss card", "1.2", plantSrc("ledger", "      </p>\n    </ReceiptCard>", "      </p>\n      <ol><li>{t.millionea.pick}</li></ol>\n    </ReceiptCard>")],
  ["H2 undone — an at-rest clause at the disabled opacity", "2.1", plantSrc("ticket", 'style={reserve ? { background: "var(--wash-inset)" } : undefined}', 'style={{ ...(reserve ? { background: "var(--wash-inset)" } : null), ...(inert ? { opacity: "var(--state-disabled-opacity)" } : null) }}')],
  ["H2 — the muted ink dimmed under the floor", "2.2", (() => { const w = plantSrc("css", "  --text-muted:    oklch(86% 0.040 268);", "  --text-muted:    oklch(40% 0.040 268);"); return w; })()],
  ["§T5 — the numeral face forced on every caller (not opt-in)", "11.2", plantSrc("emptyText", "part ? (p, following) => throughPart(hangCjkMarks(p, following), part) : hangCjkMarks", "(p, following) => throughPart(hangCjkMarks(p, following), part ?? ((x: string) => x.split(/(\d+)/).map((s, i) => (i % 2 ? createElement(\"span\", { key: i, className: \"mono\" }, s) : s))))")],
  ["the kit hands every caller a part (a default numeral face)", "11.2", plantSrc("empty", "  bodyPart,\n  action,", "  bodyPart = (s: string) => s.split(/(\\d+)/).map((x, i) => (i % 2 ? <span key={i} className=\"mono\">{x}</span> : x)),\n  action,")],
  ["the notice rules moved with the module (a centred notice's marks no longer hang)", "11.2", plantSrc("emptyText", "  if (opts.centred) return keepRanges(text, ranges, hangCjkMarks);", "  if (opts.centred) return keepRanges(text, ranges);")],
  ["a second caller asks for the part", "11.3", plantSrc("list", "      <MillioneaTicketsBar lens={lens} t={t} />\n", "      {false && <EmptyState title=\"\" bodyPart={numeralRuns} />}\n      <MillioneaTicketsBar lens={lens} t={t} />\n")],
  ["a caller spreads its props into the kit", "11.3", plantSrc("list", "      <MillioneaTicketsBar lens={lens} t={t} />\n", "      {false && <EmptyState title=\"\" {...{}} />}\n      <MillioneaTicketsBar lens={lens} t={t} />\n")],
  ["Millionea's empty state drawn by a classic file", "11.3", plantSrc("switch", 'import { PageHeader } from "@/components/ui/page-header";\n', 'import { PageHeader } from "@/components/ui/page-header";\nimport { MaswaliEmptyState } from "@/components/maswali/maswali-empty-state";\n')],
  ["§T5 undone — Millionea's empty state without the numeral part", "11.4", plantSrc("mlnEmpty", "<EmptyState {...props} bodyPart={numeralRuns} />", "<EmptyState {...props} />")],
  ["§T5 — a Chinese body's numerals skipped (the fragment its hung mark comes in passed over)", "11.4", plantSrc("emptyText", "  if (!isValidElement<{ children?: ReactNode }>(node) || node.type !== Fragment) return node;\n", "  return node;\n")],
  ["the part inserts a character (a no-break space for each space)", "11.4", plantSrc("emptyText", "  if (typeof node === \"string\") return part(node);", "  if (typeof node === \"string\") return part(node.replace(/ /g, \"\\u00a0\"));")],
  ["M4 undone — the clause back on the button", "3.1", plantSrc("cancel", "{pending ? t.millionea.cancelling : t.millionea.confirmCancel}", "{pending ? t.millionea.cancelling : t.millionea.cancelFreeUntil.replace(\"{time}\", \"10:09\")}")],
  ["§T5 undone — the free cancel's clock in the body face", "3.1", plantSrc("cancel", 'className="mono whitespace-nowrap">{eatClock(until)}</time>', 'className="whitespace-nowrap tabular-nums">{eatClock(until)}</time>')],
  ["M4 undone — no timer on the clock line", "3.1", plantSrc("cancel", '<span role="timer" className="whitespace-nowrap font-mono font-bold tabular-nums text-text">{freeLeftLabel(left)}</span>', "")],
  ["H3 — a button label too long for 320", "3.2", plantWord("sw", "confirmCancel", "Kughairi bila malipo hadi 10:21")],
  ["a door outliving its window", "3.3", plantSrc("cancel", "  const left = useTickSeconds(until, serverNow, true, serverNow);\n  if (left !== null && left <= 0) return null;\n  // The dictionary marks where the amount sits", "  const left = useTickSeconds(until, serverNow, true, serverNow);\n  // The dictionary marks where the amount sits")],
  ["M4 undone — the serial back in the confirm's title", "4.1", plantSrc("acts", "title={t.millionea.cancelConfirmTitle}", "title={fill(t.millionea.cancelConfirmTitle, { serial })}")],
  ["M4 undone — the warning plate", "4.1", plantSrc("acts", "        icon={<I.rotateCcw s={plateGlyph(36)} />}\n", "")],
  ["M10 undone — a danger refusal that fades", "4.2", plantSrc("acts", ', ...(variant === "danger" ? { durationMs: 0 } : null)', "")],
  ["the refusal titled with the button's verb", "4.2", plantSrc("acts", "toast({ title: t.millionea.cancelRefusedTitle,", "toast({ title: t.millionea.confirmCancel,")],
  ["H4 undone — the result back inside the door", "5.1", plantSrc("acts", "      <ConfirmModal\n", "      <OperationResultModal open={false} variant=\"neutral\" title=\"\" onClose={() => {}} />\n      <ConfirmModal\n")],
  ["H3 undone — the stub unwrapped", "6.1", plantSrc("ticket", "? <MaswaliMoment key={`stub-${cut ?? \"rest\"}${reveal ? \"-reveal\" : \"\"}${lock ? \"-lock\" : \"\"}`}>{perforation}{stubBlock}</MaswaliMoment>", "? <>{perforation}{stubBlock}</>")],
  ["H4 — the stub's wrapper kept across a new moment (no key)", "6.4", plantSrc("ticket", "<MaswaliMoment key={`stub-${cut ?? \"rest\"}${reveal ? \"-reveal\" : \"\"}${lock ? \"-lock\" : \"\"}`}>", "<MaswaliMoment>")],
  ["the hold rule gone", "6.2", plantSrc("css", "    animation-play-state: paused;\n", "")],
  ["the mount-time mark back", "6.3", plantSrc("acts", "export function TicketCancel(", "export function TicketSeen() { return null; }\nexport function TicketCancel(")],
  ["L2 undone — the count ticking on its first paint", "7.1", plantSrc("ticket", '<MaswaliTick key="in" value={live.resultsIn}>{keepFact(locale, fill(t.millionea.resultsOut, { n: formatNumber(live.resultsIn) }))}</MaswaliTick>', '<span key="in" className="m-tick">{keepFact(locale, fill(t.millionea.resultsOut, { n: formatNumber(live.resultsIn) }))}</span>')],
  ["M1 undone — the 24px radius and a link on the line alone", "8.1", plantSrc("ticket", 'className={cn("mat-raised-i flex min-w-0 flex-col rounded-xl border border-border bg-bg-elevated p-4 text-text", className)}', 'className={cn("mat-raised flex min-w-0 flex-col p-3", className)} style={{ borderRadius: "var(--r-xl)" }}')],
  ["M1 undone — the chip without its glyph", "8.2", plantSrc("ticket", "      <Glyph s={12} tier={g.tier} aria-hidden />\n", "")],
  ["M7 undone — \"Placed\"", "9.1", plantWord("en", "boughtAt", "Placed {date}")],
  ["M7 undone — zh 赔付", "9.1", plantWord("zh", "cardPayout", "赔付")],
  ["M2 undone — the lenses wrap again", "10.1", plantSrc("bar", "<QueryStrip ariaLabel={t.journey.ticketsFilterAria}>", '<QueryStrip ariaLabel={t.journey.ticketsFilterAria} className="flex-wrap">')],
  ["M3 undone — the noun ghost call", "11.1", plantSrc("list", '<Link href={MILLIONEA_HREF.slip as never} className="btn btn-primary btn-md">{t.millionea.titleSlip}</Link>', '<Link href={MILLIONEA_HREF.hub as never} className="btn btn-ghost btn-md">{t.millionea.productTitle}</Link>')],
  ["M3 undone — the lens-empty dead end", "11.1", plantSrc("list", "body={t.positions.emptyLensBody}", "body={undefined}")],
  ["M5 undone — the serial free to break", "12.1", plantSrc("ticket", '<StubField label={t.millionea.stubSerial} wide><span className="whitespace-nowrap">{serial}</span></StubField>', "<StubField label={t.millionea.stubSerial}>{serial}</StubField>")],
  ["L7 undone — \"Week · Week 49\"", "12.1", plantSrc("ticket", "<StubField label={t.millionea.stubWeek}>{formatNumber(week)}</StubField>", "<StubField label={t.millionea.stubWeek}>{weekWord(t, week)}</StubField>")],
  ["M6 undone — the legal line dropped", "13.1", plantSrc("page", 'const legal: MaswaliLegal = { twoOfficer: view.resolution === "two", href: registerHref };', 'const legal: MaswaliLegal = { twoOfficer: false, href: registerHref };')],
  ["L3 undone — the platform's 赢了", "13.1", plantWord("zh", "wonHeading", "赢了！")],
  ["L1 undone — the switch without the ink", "14.1", plantSrc("switch", ', ink: "millionea" as const }', " }")],
  ["the ink drawn for every caller (an unconditional span)", "14.2", plantSrc("tabs", '{item.ink === "millionea" ? <span className="kp-millionea-ink">{item.labelEn}</span> : item.labelEn}', "<span>{item.labelEn}</span>")],
  ["L6 undone — \"Reserve\"", "15.1", plantWord("en", "standby", "Reserve")],
  ["L5 undone — lowercase \"next event\"", "15.1", plantWord("sw", "nextEvent", "tukio linalofuata {when}")],
  ["L2 undone — the zh spaced dash", "15.1", plantWord("zh", "finality", "此处每个数字均为最终结果 — 不再有任何欠付。")],
  ["zh — the space back between two Han words", "15.2", plantWord("zh", "emptyTicketsNext", "第{week}周开放至 {when}。")],
  ["L8 undone — the cannot-win box hand-rolled", "16.1", plantSrc("ticket", '{cannotWin && <Callout tone="neutral">{t.millionea.cannotWin}</Callout>}', '{cannotWin && <p className="mat-inset rounded-control px-3 py-2 text-body-sm text-text text-pretty">{t.millionea.cannotWin}</p>}')],
  ["L10 undone — the seal's label the serials alone", "17.1", plantSrc("acts", "eyebrow, heading: t.millionea.wonHeading, facts: sealFacts(line, serials), roll: false", "label: serials.join(\" · \"), roll: false")],
  ["a fact drawn in the seal's own face again (the classic seal parsing Millionea's facts)", "17.2", plantSrc("celebrate", "                {f}\n              </span>\n            ))}", "                {typeof f === \"string\" ? <span className=\"font-mono\">{f}</span> : f}\n              </span>\n            ))}")],
  ["the 7-digit wrap back", "17.2", plantSrc("celebrate", 'className={`whitespace-nowrap font-mono text-[38px]', 'className={`font-mono text-[38px]')],
  ["an amount that always fitted shrunk (the 0.62 margin)", "17.2", plantSrc("celebrate", "(var(--seal-chars) * 0.6)))", "(var(--seal-chars) * 0.62)))")],
  ["the seal's eyebrow forced to the platform's", "17.2", plantSrc("celebrate", "{payload.eyebrow ?? t.common.positionWon}", "{t.common.positionWon}")],
  ["L11 undone — an open week's ticket silent", "18.1", plantSrc("ticket", "        live.salesCloseAt !== undefined ? keepFact(locale, fill(t.millionea.salesCloseAt, { when: eatWeekdayClock(t, live.salesCloseAt) })) : null,\n", "")],
  ["L13 undone — a sealed reserve still the open ring", "19.1", plantSrc("seal", 'out === "YES" || out === "NO" ? "sealed" : "standby"', '"standby"')],
  ["§T5 undone — the seal's facts handed in the body face", "17.3", plantSrc("acts", "return [<Fragment key=\"line\">{numeralRuns(line)}</Fragment>, ...serials.map((s) => <span key={s} className=\"mono\">{s}</span>)];", "return [line, ...serials];")],
  ["§T5 — a serial set in pieces (the fact-line rule run over it)", "17.3", plantSrc("acts", "...serials.map((s) => <span key={s} className=\"mono\">{s}</span>)", "...serials.map((s) => <Fragment key={s}>{numeralRuns(s)}</Fragment>)")],
  ["§T5 undone — the held note's count in the body face", "17.3", plantSrc("page", "shareHeldNote), { part: numeralRuns })}", "shareHeldNote))}")],
  ["L14 undone — no close fact (the lock moment dead again)", "20.1", plantSrc("player", ' facts.push({ kind: "close", at: week.closedAt });', " void 0;")],
  ["L14 — the scheduled close instead of the recorded one", "20.1", plantSrc("player", 'facts.push({ kind: "close", at: week.closedAt });', 'facts.push({ kind: "close", at: week.closesAt });')],
  ["L14 — the lock line outside the stub's moment", "20.1", plantSrc("ticket", "{cut || reveal || lock\n", "{cut || reveal\n")],
  ["M9 undone — the head ghost ignores its kinds", "21.1", plantSrc("headGhost", "        {kinds === 3 && <div className=\"h-[44px] w-[96px] rounded-md bg-bg-overlay kp-shimmer-track\" />}\n", "")],
  ["M9 undone — the 70px Seal Line ghost", "21.1", plantSrc("ticketGhost", '          <GhostBar className={cn("mt-1.5 w-full", cancelOpen ? "h-[16px] xs:h-[18px]" : "h-[30px] xs:h-[32px]")} />\n', "")],
  ["round 2 undone — the gold rows after the totals", "23.1", plantSrc("ledger", "  const at = rows.findIndex((r) => r.key === \"share\");", "  const at = rows.length - 1;")],
  ["round 2 undone — a ledger drawn without final money", "23.1", plantSrc("page", "              {ledgerRows && (\n", "              {(\n")],
  ["round 2 — a drive week's carries linked to the public register", "23.1", plantSrc("page", '{ links: view.week.visibility === "PUBLIC" && gate.visible }', "{ links: true }")],
  ["round 2 — the drive week's ledger dropped again", "23.1", plantSrc("page", "const money = paid ? await millioneaWeekMoneyRecord(view.week.id) : null;", 'const money = paid && view.week.visibility === "PUBLIC" ? await millioneaWeekMoneyRecord(view.week.id) : null;')],
  ["round 2 undone — the head's week as a line again", "23.2", plantSrc("ticket", "<WeekStateChip t={t} state={weekState} phase={phase ?? null} />", "<span>{weekWord(t, week)}</span>")],
  ["held row — no lift", "22.1", plantSrc("ticket", 'className={cn("mat-raised mat-raised-i flex flex-col gap-1.5 rounded-control p-2 text-text", className)}', 'className={cn("mat-raised flex flex-col gap-1.5 rounded-control p-2 text-text", className)}')],
  ["M9 — the head's one wrapping row again", "21.2", plantSrc("ticket", '<div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">', '<div className="flex flex-wrap items-center justify-between gap-1.5">')],
  ["M9 — the drawing's head one row on a phone", "21.2", plantSrc("ticketGhost", '<div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">', '<div className="flex items-center justify-between gap-2">')],
  ["M9 — a note read as open past its end", "24.1", plantSrc("hint", "return until !== undefined && until > nowMs;", "return until !== undefined;")],
  ["M9 — a note kept on the server too", "24.1", plantSrc("hint", '  if (typeof window === "undefined" || !Number.isFinite(until)) return;\n', "  if (!Number.isFinite(until)) return;\n")],
  ["M9 — the ticket's drawing blind to its door", "24.2", plantSrc("ticketGhost", "const cancelOpen = freeCancelKnownOpen(ticketSerialOf(usePathname()), Date.now());", "const cancelOpen = false && freeCancelKnownOpen(ticketSerialOf(usePathname()), Date.now());")],
  ["M9 — the list hands its cards no window", "24.2", plantSrc("list", "                cancelUntil={cancelUntil.get(row.serial)}\n", "")],
  ["the hop undone — the list's bands over a ticket (one drawing for every address)", "25.1", plantSrc("listLoading", "      patterns={[[`^${LIST}/[^/]+$`, <MillioneaTicketGhost />]]}\n", "")],
  ["the ticket's pattern a prefix (a deeper address takes the ticket's drawing)", "25.1", plantSrc("listLoading", "`^${LIST}/[^/]+$`", "`^${LIST}/`")],
  ["the loading file asks the server (an async read before the gate)", "25.1", plantSrc("listLoading", "export default function MillioneaTicketsLoading() {", "export default async function MillioneaTicketsLoading() {")],
  ["the list's drawing names no page", "25.2", plantSrc("listGhost", ' data-ghost-page="tickets"', "")],
  ["the ticket's mark on an inner element, not around the drawing", "25.2", plantSrc("ticketGhost", '<div className="contents space-y-5" data-ghost-page="ticket">\n        <BackLinkGhost />', '<div className="contents space-y-5">\n        <BackLinkGhost />\n        <div data-ghost-page="ticket" />')],
  ["a word drawn in a loading drawing", "25.2", plantSrc("ticketGhost", "        <BackLinkGhost />\n        <GhostCard", "        <BackLinkGhost />\n        <p>Tiketi</p>\n        <GhostCard")],
  ["the mark's wrapper given a box (no `contents`)", "25.3", plantSrc("listGhost", '<div className="contents space-y-6" data-ghost-page="tickets">', '<div className="space-y-6" data-ghost-page="tickets">')],
  ["the rhythm left behind (the wrapper's bands lose their spacing)", "25.3", plantSrc("ticketGhost", '<div className="contents space-y-5" data-ghost-page="ticket">', '<div className="contents" data-ghost-page="ticket">')],
  ["the kit changed for the mark", "25.3", plantSrc("pageContainer", "      data-empty-state-owner={emptyStateOwner}\n", "      data-empty-state-owner={emptyStateOwner}\n      data-ghost-page={id}\n")],
];
let caught = 0;
for (const [name, target, world] of PLANTS) {
  if (!world) { console.log(`INCONCLUSIVE (plant did not apply)  ${target} · ${name}`); problems.push(`inconclusive: ${name}`); continue; }
  const r = runAll(world, true);
  const hit = r.failed.includes(target);
  if (hit) caught++; else problems.push(`BLIND: ${target} stayed green with "${name}" planted`);
  console.log(`${(hit ? "PROVED" : "BLIND").padEnd(12)} ${target} · ${name}`);
}
for (const p of problems) console.log(`!! ${p}`);
const untested = CHECKS.map((c) => c.id).filter((id) => !PLANTS.some(([, t]) => t === id));
if (untested.length) console.log(`!! checks with no plant: ${untested.join(", ")}`);
console.log(`\n${caught}/${PLANTS.length} caught`);
process.exit(caught === PLANTS.length && problems.length === 0 && untested.length === 0 ? 0 : 1);
