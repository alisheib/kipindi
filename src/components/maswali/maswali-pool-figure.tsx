import type { ReactNode } from "react";
import { MaswaliCarry } from "@/components/maswali/maswali-carry";
import { counted } from "@/components/maswali/maswali-format";
import { fillNodes, moneyRuns } from "@/lib/fill-nodes";
import { cn, fill, formatTzs } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";

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
 */
export type PoolCarriedIn = { week: number; /** null while that week has not settled: the figure is then "at least" */ amount: number | null };
type Sales = { tickets: number; amount: number };

export type PoolView =
  | { kind: "presale"; carriedIn: PoolCarriedIn | null; floor: number; opensOn: string }
  | { kind: "selling"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number; jackpot: number }
  | { kind: "won"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number; jackpot: number; fee: number; toWinners: number; winningTickets: number; perTicket: number }
  | { kind: "rollover"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number; jackpot: number; carriedOut: { week: number; amount: number } }
  | { kind: "voiding"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number; price: number }
  | { kind: "voided"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number; price: number; refunded: number; carriedForward: { week: number; amount: number } }
  | { kind: "sunset"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; fee: number; toWinners: number; winningTickets: number; perTicket: number; top: { score: number; tickets: number } };

type Row = { key: string; label: ReactNode; value: ReactNode; ink?: "text" | "muted" | "subtle"; weight?: "medium" | "semibold" | "bold" };

const INK = { text: "text-text", muted: "text-text-muted", subtle: "text-text-subtle" } as const;
const WEIGHT = { medium: "font-medium", semibold: "font-semibold", bold: "font-bold" } as const;
const DASH = "—";

export function MaswaliPoolFigure({ t, view, pct, carry, tick, className }: {
  t: Dict;
  view: PoolView;
  /** The week's fee rate as a number of percent (`pctNum` of the snapshot's rate). */
  pct: number;
  /** M7 — the carried-in figure travels from `from` (last week's figure) once, when `play` (the composer's seen state). */
  carry?: { from: string; play: boolean };
  /** A real sale or a settlement moved the larger-of-two figure: it dips and lands once (`.m-tick`). */
  tick?: boolean;
  className?: string;
}) {
  const v = view;
  const pending = v.carriedIn?.amount === null;
  const money = (n: number) => formatTzs(n);
  const ticketsLabel = (s: Sales) => `${t.millionea.salesThisWeek} · ${counted(s.tickets, t.millionea.ticketsOne, t.millionea.ticketsN)}`;
  const rows: Row[] = [];

  if (v.carriedIn) {
    const c = v.carriedIn;
    const value = c.amount === null ? DASH : money(c.amount);
    rows.push({
      key: "in",
      label: c.amount === null
        ? `${fill(t.millionea.carriedIn, { week: c.week })} · ${fill(t.millionea.carriedInPending, { week: c.week })}`
        : fill(t.millionea.carriedIn, { week: c.week }),
      value: carry && c.amount !== null
        ? <MaswaliCarry from={carry.from} play={carry.play}>{value}</MaswaliCarry>
        : value,
      ink: c.amount === null ? "muted" : "text",
    });
  }
  if (v.kind === "presale") {
    rows.push({ key: "sales", label: `${t.millionea.salesThisWeek} · ${fill(t.millionea.opensOn, { day: v.opensOn })}`, value: DASH, ink: "muted" });
    rows.push({ key: "pool", label: t.millionea.poolTotal, value: DASH, ink: "muted" });
    rows.push({ key: "floor", label: t.millionea.floor, value: money(v.floor) });
    rows.push({ key: "jackpot", label: t.millionea.jackpot, value: DASH, ink: "muted" });
    rows.push({ key: "fee", label: t.millionea.fee, value: DASH, ink: "muted" });
  } else {
    rows.push({ key: "sales", label: ticketsLabel(v.sales), value: money(v.sales.amount) });
    rows.push({ key: "pool", label: t.millionea.poolTotal, value: money(v.pool), weight: "semibold" });
    if (v.kind !== "sunset") {
      // Above the floor, the floor line drops to the quiet ink and stays visible (§10 §1: "the jackpot line repeats the larger").
      rows.push({ key: "floor", label: t.millionea.floor, value: money(v.floor), ink: v.pool > v.floor ? "subtle" : "text" });
    }
    switch (v.kind) {
      case "selling":
        rows.push({ key: "jackpot", label: t.millionea.jackpot, value: pending ? fill(t.millionea.atLeast, { amount: money(v.jackpot) }) : money(v.jackpot), weight: "bold" });
        rows.push({ key: "fee", label: t.millionea.fee, value: DASH, ink: "muted" });
        break;
      case "won":
        rows.push({ key: "jackpot", label: t.millionea.jackpot, value: money(v.jackpot), weight: "bold" });
        rows.push({ key: "fee", label: fill(t.millionea.feeLine, { pct }), value: money(-v.fee), ink: "muted" });
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
        rows.push({ key: "refund", label: fill(t.millionea.refundEach, { price: money(v.price) }), value: "" });
        break;
      case "voided":
        rows.push({ key: "refund", label: fill(t.millionea.refundEach, { price: money(v.price) }), value: money(v.refunded) });
        rows.push({ key: "again", label: `${t.millionea.carriedForwardAgain} · ${fill(t.millionea.week, { week: v.carriedForward.week })}`, value: money(v.carriedForward.amount), weight: "bold" });
        break;
      case "sunset":
        rows.push({ key: "fee", label: fill(t.millionea.feeLine, { pct }), value: money(-v.fee), ink: "muted" });
        rows.push({ key: "winners", label: t.millionea.toWinners, value: money(v.toWinners) });
        rows.push({ key: "share", label: counted(v.winningTickets, t.millionea.perTicketOne, t.millionea.perTicket), value: money(v.perTicket), weight: "bold" });
        break;
    }
  }

  // The headline: the larger of the floor and the carry plus sales, from the composer; a dash before sales and on a void.
  // The figure is one unbreakable run; "at least" around it may wrap (a 320px column cannot hold both on one line).
  const whole = (n: number) => <span className="amount">{money(n)}</span>;
  const figure =
    v.kind === "presale" || v.kind === "voiding" || v.kind === "voided" ? DASH
      : v.kind === "sunset" ? whole(v.pool)
        : pending ? fillNodes(t.millionea.atLeast, { amount: whole(v.jackpot) })
          : whole(v.jackpot);
  const rule =
    v.kind === "sunset"
      ? counted(v.top.tickets, t.millionea.sunsetScoreOne, t.millionea.sunsetScore, { score: v.top.score })
      : fill(t.millionea.ruleShared, { pct });

  return (
    <section className={cn("mat-flat flex flex-col gap-2 rounded-card p-3", className)}>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{t.millionea.jackpot}</span>
        <span className={cn("font-mono text-title-md font-semibold text-text tabular-nums", tick && "m-tick")}>{figure}</span>
        {pending && v.carriedIn && (
          <span className="text-body-sm text-text-muted text-pretty">{fill(t.millionea.pendingCarry, { week: v.carriedIn.week })}</span>
        )}
        <span className="text-body-sm text-text-muted text-pretty">{rule}</span>
      </div>
      <dl className="flex flex-col border-t border-border">
        {rows.map((r) => (
          <div key={r.key} className={cn("flex items-baseline justify-between gap-2 border-b border-border py-1.5", INK[r.ink ?? "text"])}>
            {/* A figure inside a label ("Kila tiketi imerejeshwa TZS 1,000") is set whole in the money face (§M4). */}
            <dt className="min-w-0 flex-1 text-body-sm">{typeof r.label === "string" ? moneyRuns(r.label) : r.label}</dt>
            <dd className={cn("amount text-right text-body-sm", WEIGHT[r.weight ?? "medium"], r.key === "jackpot" && tick && "m-tick")}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** "Wiki 41 · hakuna 10/10 · TZS 389,000 imeletwa mbele · ada 0" — last week as one closed ledger row (the hub, §3.3). */
export function MaswaliLastWeek({ t, week, carried, id, className }: {
  t: Dict;
  week: number;
  /** What last week carried forward (it had no 10/10). */
  carried: number;
  /** The carried figure's id: the origin of this week's M7 carry. */
  id?: string;
  className?: string;
}) {
  const [before, after] = t.millionea.lastWeekRolled.split("{amount}");
  return (
    <p className={cn("mat-inset rounded-control px-3 py-2 text-body-sm text-text-muted", className)}>
      {fill(before ?? "", { week })}
      <span id={id} className="amount text-text">{formatTzs(carried)}</span>
      {fill(after ?? "", { week })}
    </p>
  );
}

