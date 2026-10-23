/**
 * MASWALI MILLIONEA — THE NIGHTLY INVARIANTS (MASWALI-BUILD S3; MASWALI-PLAN §7b S3 item 9, MR-26).
 *
 * Read-only. Each line of weeks (PUBLIC, and the S8 drive's own, OD-21) must prove, from the ledger and the weeks' own
 * mirrored columns, that:
 *   1. every settled and every voided week's POOL is exactly 0 — on both stores since R1, whose void books its refunds
 *      through Millionea's own group; a voided week still holding money is one whose refunds have not landed;
 *   2. every settled week's mirrored columns close: S + R + U = F + paid + carryOut, or a rollover's carryOut = S;
 *   3. the JACKPOT equals what the weeks say it holds — Σ over settled weeks (carryOut − the R it claimed, or S rolled) plus
 *      every forfeited share — and at most ONE unsettled week has claimed a carry, which the jackpot still covers;
 *   4. the GUARANTEE holds at least OD-02's requirement over every unsettled week, each week's frozen rules readable;
 *   5. every week's live-ticket count equals its non-cancelled tickets, and a voided week holds no LIVE ticket.
 * A broken invariant is a WATCHED compliance record (`lifecycle.ts` writes it), never a silent console line.
 */
import { acct, maswaliJackpotOf } from "./ledger";
import { ticketStore, weekStore, type StoredWeek } from "./maswali-dal";
import { maswaliAccountBalance } from "./maswali-money-service";
import { unsettledFloors } from "./maswali-config";
import { guaranteeRequirement } from "@/lib/maswali-money";
import { formatTzs } from "@/lib/utils";

export type MaswaliInvariantReport = { ok: boolean; weeks: number; problems: string[] };

const FORFEITED = "forfeited · ";

export async function checkMaswaliInvariants(): Promise<MaswaliInvariantReport> {
  const problems: string[] = [];
  const weeks = await weekStore.list();

  for (const line of ["PUBLIC", "DRIVE"] as const) {
    const mine = weeks.filter((w) => w.visibility === line);
    let expected = 0;
    for (const w of mine) {
      if (!w.marketId) continue;
      if (w.state === "SETTLED" || w.state === "VOIDED") {
        const pool = await maswaliAccountBalance(acct.pool(w.marketId));
        if (pool === null) problems.push(`${w.code}: its pool could not be read.`);
        else if (pool !== 0) problems.push(`${w.code}: ${w.state} with ${formatTzs(pool)} still in its pool (must be exactly 0).`);
      }
      if (w.state !== "SETTLED") continue;
      const problem = columnsProblem(w);
      if (problem) problems.push(`${w.code}: ${problem}`);
      const k = w.winningTickets ?? 0;
      expected += k > 0 ? (w.carryOut ?? 0) - (w.rolloverIn ?? 0) : (w.carryOut ?? 0);
      if (k > 0) {
        for (const t of await ticketStore.listForWeek(w.id, { status: "SETTLED" })) {
          if (t.won && t.frozenReason?.startsWith(FORFEITED)) expected += Math.round(t.payout ?? 0);
        }
      }
    }
    const jackpot = await maswaliAccountBalance(maswaliJackpotOf(line));
    if (jackpot === null) problems.push(`${line}: the jackpot could not be read.`);
    else if (jackpot !== expected) problems.push(`${line}: the jackpot holds ${formatTzs(jackpot)}; the settled weeks and forfeits say ${formatTzs(expected)}.`);
    const claimed = mine.filter((w) => w.rolloverIn != null && w.state !== "SETTLED" && w.state !== "VOIDED");
    if (claimed.length > 1) problems.push(`${line}: ${claimed.length} unsettled weeks have claimed a carry (${claimed.map((w) => w.code).join(", ")}); at most one may.`);
    for (const w of claimed) {
      if (jackpot !== null && jackpot < (w.rolloverIn ?? 0)) problems.push(`${w.code}: it claimed ${formatTzs(w.rolloverIn ?? 0)} but the jackpot holds ${formatTzs(jackpot)}.`);
    }
  }

  const unsettled = weeks.filter((w) => w.state === "OPEN" || w.state === "CLOSED" || w.state === "RESOLVING");
  // ⛔ S7-F2 · FAIL CLOSED: a week whose frozen rules cannot be read has an unknown floor, so the guarantee cannot be shown
  //    to cover the unsettled weeks — a broken invariant, never a floor of 0 that hides a shortfall.
  const floors = unsettledFloors(unsettled);
  // OD-02 · the guarantee covers every unsettled week. ⛔ Words, never the code (S6-ADMIN, DESIGN_AUTHORITY §M8a item 29).
  for (const w of floors.ok ? [] : floors.unreadable) problems.push(`${w.code}: its frozen rules cannot be read, so its floor is unknown and the guarantee cannot be shown to cover the unsettled weeks.`);
  const held = await maswaliAccountBalance(acct.maswaliGuarantee);
  if (held === null) problems.push("The guarantee could not be read.");
  else if (floors.ok) {
    const need = guaranteeRequirement(floors.weeks);
    if (held < need) problems.push(`The guarantee holds ${formatTzs(held)}; the unsettled weeks need ${formatTzs(need)}.`);
  }

  for (const w of weeks) {
    if (w.state === "DRAFT") continue;
    const tickets = await ticketStore.listForWeek(w.id);
    const live = tickets.filter((t) => t.status !== "CANCELLED").length;
    if (live !== w.ticketCount) problems.push(`${w.code}: its count says ${w.ticketCount} tickets; ${live} are not cancelled.`);
    const unrefunded = tickets.filter((t) => t.status === "LIVE").length;
    if (w.state === "VOIDED" && unrefunded > 0) problems.push(`${w.code}: VOIDED with ${unrefunded} ticket(s) still LIVE — its refunds have not landed.`);
  }
  return { ok: problems.length === 0, weeks: weeks.length, problems };
}

/** MR-26 on the mirrored columns of one settled week, or null when they close. */
function columnsProblem(w: StoredWeek): string | null {
  const S = w.salesAtClose ?? 0, R = w.rolloverIn ?? 0, U = w.topUp ?? 0, F = w.fee ?? 0, paid = w.paidTotal ?? 0, carry = w.carryOut ?? 0;
  const k = w.winningTickets ?? 0;
  if (k === 0) {
    return carry === S && F === 0 && U === 0 && paid === 0 ? null : `a rollover must carry S (${S}) with no fee, top-up or payout; it says carry ${carry}, fee ${F}, top-up ${U}, paid ${paid}.`;
  }
  if (S + R + U !== F + paid + carry) return `S ${S} + R ${R} + U ${U} ≠ F ${F} + paid ${paid} + carry ${carry}.`;
  if ((w.sharePerTicket ?? 0) * k !== paid) return `${k} shares of ${w.sharePerTicket} do not make the ${paid} paid.`;
  if ((w.traLevy ?? 0) + (w.gbtLevy ?? 0) > F) return `the levies exceed the fee ${F}.`;
  return null;
}
