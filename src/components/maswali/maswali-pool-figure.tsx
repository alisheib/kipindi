import type { ReactNode } from "react";
import { MaswaliCarry } from "@/components/maswali/maswali-carry";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { counted } from "@/components/maswali/maswali-format";
import { ReceiptRow, type ReceiptEmphasis } from "@/components/ui/receipt-row";
import { fillNodes } from "@/lib/fill-nodes";
import { cn, fill, formatTzs, formatTzsSigned } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";

/**
 * THE POOL FIGURE — the week's jackpot headline, its rule and its public ledger (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.3,
 * §10 §6 "an UNEARNED surface"; the v6 delivery's U-hub pool block).
 *
 * ⛔ NO GOLD, ANYWHERE IN THIS FILE (DESIGN_AUTHORITY §M8a item 7, §M3). The jackpot, the floor, the rollover and the
 * stub are money nobody has earned: neutral mono ink, never gilt, never struck, never counted up. The figure changes
 * only by `.m-tick` on a real sale or a settlement (`tick`), and a carried figure arrives by N1 (`carry`, M7).
 * ⭐ THE HEADLINE IS LABELLED (§M8a item 9, §C3): "Jackpot" names the figure, the rule under it says it is shared equally
 * by every 10/10 ticket with the fee taken at payout, and while an earlier week is still unsettled the figure is "at
 * least" — a true lower bound from the settlement function — with the line that says why ("plus Week 41's carry-over
 * once it is final"). ⛔ A held ticket never shows a potential payout: this block never names a player's share.
 * Every figure is a prop, read by the composer from the ledger (`maswali-money`), and every rate from the week's frozen
 * snapshot (`pct`); nothing here is computed but the words around them.
 * ⭐ S5-DESIGN-HUB (Ali 2026-10-21 10/10 pass; R1-hub H1, H2, M4): TWO PARTS, the HEAD (`MaswaliPoolHead`: the label, the
 * figure, its rule, the final week's line and the carry's line) and the LEDGER (`MaswaliPoolLedger`: the public rows, the
 * kit's receipt rows). The hub draws the buy block BETWEEN them on a phone, so its door stands on the first screen, and
 * pins the head with the door from 1024 while the ledger reads on under it.
 */
export type PoolCarriedIn = {
  /** The week it came from (or, pending, waits on) — the calendar chain's; null when no such week is known: the row then
   *  names none (S5-FIX-PLAYER P9), never "Week 0" or a week counted from this one's open. */
  week: number | null;
  /** null while that week has not settled: the figure is then "at least" */
  amount: number | null;
};
type Sales = { tickets: number; amount: number };

/**
 * The views. ⛔ `floor` is null whenever the floor may not be printed — while the guarantee does not cover every unsettled
 * week at its own frozen floor (MB-56, OD-02: never show the floor unless it is funded), or for a closed week whose
 * read model carries none — and then the ledger has no floor line at all, never a zero.
 */
export type PoolView =
  | { kind: "presale"; carriedIn: PoolCarriedIn | null; floor: number | null; opensOn: string }
  | { kind: "selling"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; jackpot: number }
  | { kind: "won"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; jackpot: number; fee: number; toWinners: number; winningTickets: number; perTicket: number }
  | { kind: "rollover"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; jackpot: number; carriedOut: { week: number; amount: number } }
  | { kind: "voiding"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; price: number }
  | { kind: "voided"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; price: number; refunded: number; carriedForward: { week: number; amount: number };
      /** Every ticket's refund has landed (MR-18; the read model's `refundsPending` negated): until then the refund row
       *  says the money is on its way back, never that it was refunded (the S5 UI review, HIGH 1). */
      refundLanded: boolean }
  | { kind: "sunset"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; fee: number; toWinners: number; winningTickets: number; perTicket: number; top: { score: number; tickets: number } };

/** One ledger row as the block draws it — exported with the builder below, so a suite reads what the block will say.
 *  `words`: the value is words, not a figure ("Not yet settled", "13% at payout") — the kit row's muted words. */
export type PoolLedgerRow = { key: string; label: ReactNode; value: ReactNode; ink?: "text" | "muted" | "subtle"; weight?: "medium" | "semibold" | "bold"; words?: boolean };
type Row = PoolLedgerRow;

const DASH = "—";

/**
 * ⭐ THE LEDGER'S ROWS, as the block prints them (pure; `test:maswali-design` reads it). ⛔ A void says what is TRUE at its
 * moment (the S5 UI review, HIGH 1): while the week is being voided nothing is refunded and an objection can still undo it —
 * "if the void stands, every ticket is refunded"; once voided, "every ticket refunded" only after every refund landed.
 * ⭐ S5 VIS P5: the carry-in row names its week ONCE ("Carried in from Week 47") and, while that week is unsettled, its
 * value says so in words ("Not yet settled") — it once read "Carried in (Week 47) · Week 47 not yet settled — –"; and
 * before a payout the fee row's value is the rate and when it is taken ("13% at payout") — its dash read as "no fee"
 * under the rule's "13% fee at payout". A fee taken is the platform's signed figure ("−TZS 136,500", A4).
 * ⭐ S5-DESIGN-HUB L15: a refund that has not landed is a sentence that names its amount and stands alone — no figure
 * beside it (H1) and no dash ("If the void stands, every ticket is refunded TZS 1,000 … —" read as a missing figure).
 */
export function poolLedgerRows(t: Dict, view: PoolView, pct: number, carry?: { from: string; play: boolean }): PoolLedgerRow[] {
  const v = view;
  const pending = v.carriedIn?.amount === null;
  const money = (n: number) => formatTzs(n);
  const ticketsLabel = (s: Sales) => `${t.millionea.salesThisWeek} · ${counted(s.tickets, t.millionea.ticketsOne, t.millionea.ticketsN)}`;
  const feeBefore: Row = { key: "fee", label: t.millionea.fee, value: fill(t.millionea.feeAtPayout, { pct }), ink: "muted", words: true };
  const rows: Row[] = [];

  if (v.carriedIn) {
    const c = v.carriedIn;
    const label = c.week === null ? t.millionea.carriedInNoWeek : fill(t.millionea.carriedIn, { week: c.week });
    rows.push(c.amount === null
      ? { key: "in", label, value: t.millionea.carriedInPending, ink: "muted", words: true }
      : {
          key: "in",
          label,
          value: carry ? <MaswaliCarry from={carry.from} play={carry.play}>{money(c.amount)}</MaswaliCarry> : money(c.amount),
          ink: "text",
        });
  }
  if (v.kind === "presale") {
    rows.push({ key: "sales", label: `${t.millionea.salesThisWeek} · ${fill(t.millionea.opensOn, { day: v.opensOn })}`, value: DASH, ink: "muted" });
    rows.push({ key: "pool", label: t.millionea.poolTotal, value: DASH, ink: "muted" });
    if (v.floor !== null) rows.push({ key: "floor", label: t.millionea.floor, value: money(v.floor) });
    rows.push({ key: "jackpot", label: t.millionea.jackpot, value: DASH, ink: "muted" });
    rows.push(feeBefore);
  } else {
    rows.push({ key: "sales", label: ticketsLabel(v.sales), value: money(v.sales.amount) });
    rows.push({ key: "pool", label: t.millionea.poolTotal, value: money(v.pool), weight: "semibold" });
    const floor = v.kind === "sunset" ? null : v.floor;
    if (floor !== null) {
      // Above the floor, the floor line drops to the quiet ink and stays visible (§10 §1: "the jackpot line repeats the larger").
      rows.push({ key: "floor", label: t.millionea.floor, value: money(floor), ink: v.pool > floor ? "subtle" : "text" });
    }
    switch (v.kind) {
      case "selling":
        rows.push({ key: "jackpot", label: t.millionea.jackpot, value: pending ? fill(t.millionea.atLeast, { amount: money(v.jackpot) }) : money(v.jackpot), weight: "bold" });
        rows.push(feeBefore);
        break;
      case "won":
        rows.push({ key: "jackpot", label: t.millionea.jackpot, value: money(v.jackpot), weight: "bold" });
        rows.push({ key: "fee", label: fill(t.millionea.feeLine, { pct }), value: formatTzsSigned(-v.fee), ink: "muted" });
        rows.push({ key: "winners", label: t.millionea.toWinners, value: money(v.toWinners) });
        rows.push({ key: "share", label: counted(v.winningTickets, t.millionea.perTicketOne, t.millionea.perTicket), value: money(v.perTicket), weight: "bold" });
        break;
      case "rollover":
        rows.push({ key: "jackpot", label: t.millionea.jackpot, value: money(v.jackpot), weight: "bold" });
        rows.push({ key: "fee", label: t.millionea.fee, value: t.millionea.feeZero, ink: "muted" });
        rows.push({ key: "out", label: fill(t.millionea.carriedOut, { week: v.carriedOut.week }), value: money(v.carriedOut.amount), weight: "bold" });
        break;
      case "voiding":
        rows.push({ key: "jackpot", label: t.millionea.jackpot, value: DASH, ink: "muted" });
        // L15 · a sentence that names its amount stands alone — no figure beside it (H1: nothing is refunded yet), and no
        // dash either, which read as a missing figure beside "TZS 1,000".
        rows.push({ key: "refund", label: fill(t.millionea.refundEachIfVoid, { price: money(v.price) }), value: null, ink: "muted", words: true });
        break;
      case "voided":
        rows.push(v.refundLanded
          ? { key: "refund", label: fill(t.millionea.refundEach, { price: money(v.price) }), value: money(v.refunded) }
          : { key: "refund", label: fill(t.millionea.refundEachPending, { price: money(v.price) }), value: null, ink: "muted", words: true });
        rows.push({ key: "again", label: `${t.millionea.carriedForwardAgain} · ${fill(t.millionea.week, { week: v.carriedForward.week })}`, value: money(v.carriedForward.amount), weight: "bold" });
        break;
      case "sunset":
        rows.push({ key: "fee", label: fill(t.millionea.feeLine, { pct }), value: formatTzsSigned(-v.fee), ink: "muted" });
        rows.push({ key: "winners", label: t.millionea.toWinners, value: money(v.toWinners) });
        rows.push({ key: "share", label: counted(v.winningTickets, t.millionea.perTicketOne, t.millionea.perTicket), value: money(v.perTicket), weight: "bold" });
        break;
    }
  }
  return rows;
}

/** The rule under the headline — and none on a void: a week being voided or voided shares no jackpot (the S5 UI review,
 *  HIGH 1), so "shared equally by every 10/10 ticket" would be false there. */
export function poolRule(t: Dict, view: PoolView, pct: number): string | null {
  if (view.kind === "voiding" || view.kind === "voided") return null;
  return view.kind === "sunset"
    ? counted(view.top.tickets, t.millionea.sunsetScoreOne, t.millionea.sunsetScore, { score: view.top.score })
    : fill(t.millionea.ruleShared, { pct });
}

/**
 * ⭐ S5-DESIGN-HUB H3 · THE FINAL WEEK'S LINE (MR-30, OD-03; RULES §2.12 "the sunset"): in the final week a pool with no
 * 10/10 goes to the week's highest-scoring tickets, shared equally — so under a figure the 10/10 rule alone would
 * overstate, the head says it, in the words How to play's rule says it. None on a void (no pool is shared) and none once
 * the sunset has settled (its own rule line names the top score).
 */
export function poolFinalLine(t: Dict, view: PoolView, final: boolean): string | null {
  return final && (view.kind === "selling" || view.kind === "presale") ? t.millionea.finalWeekRule : null;
}

/** The headline's figure: the larger of the floor and the carry plus sales, from the composer; "at least" around it while
 *  the carry waits; a dash before sales and on a void. The figure itself is one unbreakable run. */
function headlineOf(t: Dict, v: PoolView): ReactNode {
  const whole = (n: number) => <span className="amount">{formatTzs(n)}</span>;
  if (v.kind === "presale" || v.kind === "voiding" || v.kind === "voided") return DASH;
  if (v.kind === "sunset") return whole(v.pool);
  return v.carriedIn?.amount === null ? fillNodes(t.millionea.atLeast, { amount: whole(v.jackpot) }) : whole(v.jackpot);
}

/**
 * ⭐ THE HEAD — ONE ORDER, THE CARD'S (S5 VIS P3): the label, the figure, the R-HEADLINE's rule, the final week's line,
 * then — while an earlier week is unsettled — the carry's line; the rule's facts are a fact line (`maswali-facts.tsx`,
 * A1), so no line starts or ends with a separator and no phrase ("Week 47's", "13% fee") is torn.
 * ⭐ L10 · the figure at the title-sm rung below 360 and title-md from 360: "at least TZS 1,000,000" holds one line in
 * the 256px a 320 phone gives it (22px left "at least" alone on a line above the figure).
 * `labelId` names the block's label, so the column that holds it can be named by it (L17).
 */
export function MaswaliPoolHead({ t, locale, view, pct, final = false, tick, labelId, className }: {
  t: Dict;
  /** The reader's language: the fact lines keep its phrases whole (`keepFact`). */
  locale: Locale;
  view: PoolView;
  /** The week's fee rate as a number of percent (`pctNum` of the snapshot's rate). */
  pct: number;
  /** The week is Millionea's final week (MR-30): the head says what a pool with no 10/10 does. */
  final?: boolean;
  /** A real sale or a settlement moved the larger-of-two figure: it dips and lands once (`.m-tick`). */
  tick?: boolean;
  /** The id the label carries. */
  labelId?: string;
  className?: string;
}) {
  const v = view;
  const pending = v.carriedIn?.amount === null;
  const rule = poolRule(t, view, pct);
  const finalLine = poolFinalLine(t, view, final);
  const facts = (line: string) => <MaswaliFacts facts={factsOf(line).map((f) => keepFact(locale, f))} />;
  return (
    <div className={cn("mat-flat flex flex-col gap-1 rounded-card p-3", className)} data-testid="millionea-hub-jackpot">
      <span id={labelId} className="font-mono text-micro uppercase eyebrow text-text-subtle">{t.millionea.jackpot}</span>
      <span className={cn("font-mono text-title-sm font-semibold text-text tabular-nums xs:text-title-md", tick && "m-tick")} data-testid="millionea-hub-figure">{headlineOf(t, v)}</span>
      {rule && <span className="text-body-sm text-text-muted">{facts(rule)}</span>}
      {finalLine && <span className="text-body-sm text-text-muted text-pretty" data-testid="millionea-hub-final-rule">{keepFact(locale, finalLine)}</span>}
      {pending && v.carriedIn && v.carriedIn.week !== null && (
        <span className="text-body-sm text-text-muted text-pretty">{keepFact(locale, fill(t.millionea.pendingCarry, { week: v.carriedIn.week }))}</span>
      )}
    </div>
  );
}

/** How a ledger row is drawn by the kit's receipt row (M4, as the register's ledger draws its rows): a figure in the
 *  money face, the jackpot the receipt's amount, a fee taken the receipt's fee line, words the receipt's muted words. */
function receiptOf(r: PoolLedgerRow): { emphasis: ReceiptEmphasis; tone?: "warning"; quiet: boolean } {
  if (r.words) return { emphasis: "muted", quiet: false };
  if (r.key === "fee" && typeof r.value === "string" && r.value.startsWith("−")) return { emphasis: "fee", tone: "warning", quiet: false };
  if (r.weight === "bold" && r.value !== DASH) return { emphasis: "amount", quiet: false };
  return { emphasis: "row", quiet: r.ink === "muted" || r.ink === "subtle" };
}

/**
 * ⭐ THE LEDGER — THE KIT'S RECEIPT ROWS (R1-hub M4): the register's ledger, How to play's and the win ledger draw their
 * rows with `ReceiptRow`; the hub drew a home-made `<dl>` beside them, two typographies for one row, and its Swahili
 * label ended a line on the connective ("Kiwango cha" / "chini …"), which the kit row's label never does.
 * ⭐ R1-motion L1 · A LIVE FRAME TICKS EACH VALUE IT CHANGED (`ticked`: the rows the frame moved and the frame's count):
 * the value is re-keyed on that count, so `.m-tick` dips and lands it once — never on the first paint, never counting.
 */
export function MaswaliPoolLedger({ t, locale, view, pct, carry, ticked, className }: {
  t: Dict;
  locale: Locale;
  view: PoolView;
  pct: number;
  /** M7 — the carried-in figure travels from `from` (the rollover notice's figure) once, when `play`. */
  carry?: { from: string; play: boolean };
  /** The rows the last live frame changed, and how many frames have changed them. */
  ticked?: { n: number; keys: ReadonlySet<string> };
  className?: string;
}) {
  const v = view;
  const pending = v.carriedIn?.amount === null;
  const rows = poolLedgerRows(t, view, pct, carry);
  // A figure inside a label ("Kila tiketi imerejeshwa TZS 1,000") is set whole in the money face (§M4, through `keepFact`'s
  // money reader); a "·"-joined label is a fact line.
  const label = (l: ReactNode) => (typeof l === "string" ? <MaswaliFacts facts={factsOf(l).map((f) => keepFact(locale, f))} /> : l);
  return (
    <div className={cn("mat-flat flex flex-col rounded-card px-3 py-1.5", className)} data-testid="millionea-hub-ledger">
      {rows.map((r, i) => {
        const look = receiptOf(r);
        const moved = !!ticked && ticked.n > 0 && ticked.keys.has(r.key);
        // "at least TZS 1,000,000" at the receipt's amount rung would leave "at least" alone on a line beside its label at
        // 320; below 360 it takes the body rung, as the head's figure steps down a rung there (L10).
        const fit = r.key === "jackpot" && pending && look.emphasis === "amount" ? "text-body-sm xs:text-body-lg" : null;
        return (
          <ReceiptRow
            key={r.key}
            className={cn("gap-3 py-1.5", i > 0 && "border-t border-border")}
            emphasis={look.emphasis}
            tone={look.tone}
            label={label(r.label)}
            value={(
              <span
                key={moved ? `${r.key}:${ticked?.n}` : r.key}
                className={cn(!r.words && "amount", look.quiet && "text-text-muted", fit, moved && "m-tick")}
                data-row={r.key}
              >
                {r.value}
              </span>
            )}
          />
        );
      })}
    </div>
  );
}

/** "Wiki 41 · hakuna 10/10 · TZS 389,000 imehamishwa · ada 0" — last week's words as one closed ledger row (the hub, §3.3),
 *  its facts a fact line (A1), the carried figure in the money face; `id` marks that figure when a page carries from it.
 *  The words alone: the hub's row is the door's own box (S5-DESIGN-HUB, P16's tap floor and end mark). */
export function MaswaliLastWeek({ t, locale, week, carried, id, className }: {
  t: Dict;
  locale: Locale;
  week: number;
  /** What last week carried forward (it had no 10/10). */
  carried: number;
  /** The carried figure's id, when a page carries from it. */
  id?: string;
  className?: string;
}) {
  const fact = (f: string) => {
    if (!f.includes("{amount}")) return keepFact(locale, fill(f, { week }));
    const [before, after] = f.split("{amount}");
    return (
      <span>
        {fill(before ?? "", { week })}
        <span id={id} className="amount text-text">{formatTzs(carried)}</span>
        {fill(after ?? "", { week })}
      </span>
    );
  };
  return <MaswaliFacts className={className} facts={factsOf(t.millionea.lastWeekRolled).map(fact)} />;
}
