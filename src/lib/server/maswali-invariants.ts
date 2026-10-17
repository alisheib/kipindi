/**
 * MASWALI MILLIONEA — THE NIGHTLY INVARIANTS (MASWALI-BUILD S3; MASWALI-PLAN §7b S3 item 9, MR-26).
 *
 * Read-only. Each line of weeks (PUBLIC, and the S8 drive's own, OD-21) must prove, from the ledger and the weeks' own
 * mirrored columns, that:
 *   1. every settled week's POOL is exactly 0 (and every voided week's, on Postgres, where the void's refunds are booked);
 *   2. every settled week's mirrored columns close: S + R + U = F + paid + carryOut, or a rollover's carryOut = S;
 *   3. the JACKPOT equals what the weeks say it holds — Σ over settled weeks (carryOut − the R it claimed, or S rolled) plus
 *      every forfeited share — and at most ONE unsettled week has claimed a carry, which the jackpot still covers;
 *   4. the GUARANTEE holds at least OD-02's requirement over every unsettled week;
 *   5. every week's live-ticket count equals its non-cancelled tickets.
 * A broken invariant is a WATCHED compliance record (`lifecycle.ts` writes it), never a silent console line.
 */
import { acct, maswaliJackpotOf } from "./ledger";
import { ticketStore, weekStore, type StoredWeek } from "./maswali-dal";
import { maswaliAccountBalance } from "./maswali-money-service";
import { readMaswaliRulesSnapshot } from "./maswali-config";
import { hasDatabase } from "./prisma";
import { guaranteeRequirement } from "@/lib/maswali-money";

export type MaswaliInvariantReport = { ok: boolean; weeks: number; problems: string[] };

const FORFEITED = "forfeited · ";

export async function checkMaswaliInvariants(): Promise<MaswaliInvariantReport> {
  const problems: string[] = [];
  const weeks = await weekStore.list();
  const onPostgres = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";

  for (const line of ["PUBLIC", "DRIVE"] as const) {
    const mine = weeks.filter((w) => w.visibility === line);
    let expected = 0;
    for (const w of mine) {
      if (!w.marketId) continue;
      if (w.state === "SETTLED" || (w.state === "VOIDED" && onPostgres)) {
        const pool = await maswaliAccountBalance(acct.pool(w.marketId));
        if (pool === null) problems.push(`${w.code}: its pool could not be read.`);
        else if (pool !== 0) problems.push(`${w.code}: ${w.state} with ${pool} still in its pool (must be exactly 0).`);
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
    else if (jackpot !== expected) problems.push(`${line}: the jackpot holds ${jackpot}; the settled weeks and forfeits say ${expected}.`);
    const claimed = mine.filter((w) => w.rolloverIn != null && w.state !== "SETTLED" && w.state !== "VOIDED");
    if (claimed.length > 1) problems.push(`${line}: ${claimed.length} unsettled weeks have claimed a carry (${claimed.map((w) => w.code).join(", ")}); at most one may.`);
    for (const w of claimed) {
      if (jackpot !== null && jackpot < (w.rolloverIn ?? 0)) problems.push(`${w.code}: it claimed ${w.rolloverIn} but the jackpot holds ${jackpot}.`);
    }
  }

  const unsettled = weeks.filter((w) => w.state === "OPEN" || w.state === "CLOSED" || w.state === "RESOLVING");
  const need = guaranteeRequirement(unsettled.map((w) => {
    const r = readMaswaliRulesSnapshot(w.rulesSnapshot);
    return { floor: r.ok ? r.rules.floorTzs : 0, confirmedCarryIn: w.rolloverIn };
  }));
  const held = await maswaliAccountBalance(acct.maswaliGuarantee);
  if (held === null) problems.push("The guarantee could not be read.");
  else if (held < need) problems.push(`The guarantee holds ${held}; the unsettled weeks need ${need} (OD-02).`);

  for (const w of weeks) {
    if (w.state === "DRAFT") continue;
    const live = (await ticketStore.listForWeek(w.id)).filter((t) => t.status !== "CANCELLED").length;
    if (live !== w.ticketCount) problems.push(`${w.code}: its count says ${w.ticketCount} tickets; ${live} are not cancelled.`);
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
