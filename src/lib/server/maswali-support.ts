/**
 * MASWALI MILLIONEA — THE SUPPORT DESK'S PER-TICKET LOOKUP (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 9, MB-64).
 *
 * A player calls about ONE ticket. The desk types its serial and the phone number on the player's account, and reads that
 * one ticket beside the script that fits it (`maswali-support-scripts.ts`) — never a list, never a week, never anyone
 * else's count.
 *
 * ⛔ OPENED PER REQUEST, AND EVERY OPENING IS RECORDED — awaited, before the answer leaves, found or not: who looked and
 *    which serial. Never the number typed. A lookup whose record could not be written shows nothing (the export doors'
 *    rule, `contacts/export.ts`): the desk never reads a ticket the log does not know it read.
 * ⛔ ONE ANSWER FOR "NO SUCH TICKET" AND "NOT THIS NUMBER'S TICKET" — the ticket page's own rule (MB-95): walking serials
 *    learns nothing, and without its holder's number a serial opens nothing. R2-12 · and one COST: every lookup reads the
 *    ticket by its serial and the account by the number typed, whichever exists, so an unknown serial answers in the
 *    time a known one does.
 * ⛔ A BUDGET PER OFFICER, SPENT FIRST (R2-4, `maswali.lookup` in `rate-limit.ts`): a refused lookup reads nothing and
 *    records nothing.
 * ⛔ NO AGGREGATE, AND NO ANSWERS BEFORE THE WEEK IS FINAL. The fifteen answers, and how each fared, appear only once the
 *    week has settled or voided; before that the desk reads the ticket's state, its purchase and its cancel window, and
 *    how many results are out — nothing a pick decides. So a lookup can never hand pick data to the officer who seals,
 *    whatever roles a grant later gives them (MR-14, MB-34). The salt never (MB-32).
 * ⛔ READ ONLY. The ticket is S5's own read model (`millioneaTicket`, what its owner's page shows), projected for the desk.
 */
import { audit } from "./audit";
import { rateCheckAsync } from "./rate-limit";
import { db } from "./store";
import { ticketStore, weekStore, type StoredWeek } from "./maswali-dal";
import { millioneaTicket, normalizeMillioneaSerial, type MillioneaRefund, type MillioneaShare } from "./maswali-player";
import { frozenRules } from "./maswali-service";
import { getMaswaliConfig } from "./maswali-config";
import { getGlobalConfig } from "./market-config";
import { SUPPORT_EMAIL } from "./support-config";
import { WITHDRAW_MAX_TZS } from "./validators";
import { toMsisdn255 } from "@/lib/phone-normalize";
import { fmtRate, formatTzs } from "@/lib/utils";
import { scriptForTicket, type SupportFigures, type SupportScriptKey } from "@/lib/maswali-support-scripts";

/** The audit action every lookup writes, found or not. */
export const SUPPORT_LOOKUP_ACTION = "maswali.support.ticket_lookup";

/** The one sentence for a serial nobody holds and a serial this number does not hold alike. */
export const DESK_NOT_FOUND = "No ticket matches that serial and phone number.";

/** A lookup whose record could not be written. */
export const DESK_UNRECORDED = "This lookup could not be recorded, so nothing is shown. Try again in a moment.";

/** A lookup past the officer's budget (R2-4). */
export const DESK_RATE_LIMITED = (seconds: number): string => `Too many lookups in a short time. Try again in ${seconds} seconds.`;

/**
 * What a lookup reaches outside itself — the production members, frozen. A suite stands one in to prove a refusal by
 * behaviour (the contacts export's door pattern): a record that could not be written, a budget that is spent.
 */
export type DeskLookupDeps = {
  /** Records the lookup, and says whether the record exists (`audit`'s own `recorded`). */
  record: (entry: Parameters<typeof audit>[0]) => Promise<{ recorded: boolean }>;
  /** The officer's lookup budget (`maswali.lookup`). */
  budget: (officerId: string) => Promise<{ allowed: boolean; retryAfterSec: number }>;
};
export const DESK_LOOKUP_DEPS: Readonly<DeskLookupDeps> = Object.freeze({
  record: (entry: Parameters<typeof audit>[0]) => audit(entry),
  budget: (officerId: string) => rateCheckAsync(officerId, "maswali.lookup"),
});

/** One ticket as the desk reads it. */
export type DeskTicketView = {
  serial: string;
  /** The account, by id — for the player's own page, which the desk opens through its own gate. */
  accountId: string;
  week: { code: string; state: StoredWeek["state"]; visibility: StoredWeek["visibility"]; closesAt: string; settledAt: string | null };
  /** running · won · lost · refunded · cancelled — the word the player's own ticket shows. */
  shown: string;
  boughtAt: string;
  cancelledAt: string | null;
  /** The free cancel's end while it is open; null otherwise. */
  cancelUntil: string | null;
  price: number;
  rulesVersion: string;
  /** How many of the fifteen results are out — a count of questions, never of tickets. */
  resultsOut: number;
  share: MillioneaShare | null;
  /** The paid share only; null for a held or forfeited share, as on the player's own ticket. */
  paid: number | null;
  refund: MillioneaRefund | null;
  /** ⛔ The fifteen answers and how each fared — ONLY once the week is final (settled or voided); null before. */
  answers: Array<{ label: string; pick: string; outcome: string | null; mark: string }> | null;
  /** The script that fits this ticket, or null while it is still running. */
  script: SupportScriptKey | null;
};

export type DeskLookup = { ok: true; ticket: DeskTicketView; figures: SupportFigures } | { ok: false; error: string };

/**
 * The figures every script is filled with: the week's own frozen rules when there is a week (a running week reads only
 * its snapshot, MB-75), the coming weeks' configuration otherwise; the live withdrawal limit, fee and address; and the
 * complaint answer target as `maswali.config` holds it now — a support promise no week freezes (R2-7).
 */
export async function deskScriptFigures(week?: StoredWeek | null): Promise<SupportFigures> {
  const frozen = week ? frozenRules(week) : null;
  const live = getMaswaliConfig();
  const rules: { objectionWindowHours: number; objectionNotBeforeAt: string } = frozen ?? live;
  const rates = await getGlobalConfig();
  return {
    objectionHours: rules.objectionWindowHours,
    objectionNotBefore: rules.objectionNotBeforeAt,
    withdrawalCap: formatTzs(WITHDRAW_MAX_TZS),
    withdrawalFee: fmtRate(rates.withdrawalFeeRate),
    supportEmail: SUPPORT_EMAIL(),
    answerDays: live.complaintAnswerDays,
  };
}

/**
 * ⭐ ONE TICKET, FOR THE DESK, BY ITS SERIAL AND ITS HOLDER'S NUMBER. The caller is the desk's action, which has already
 * decided the officer may open the desk's page; this decides only what that one request may see.
 */
export async function lookupMaswaliTicketForDesk(
  input: { serial: unknown; phone: unknown; officerId: string; now?: Date },
  deps: Readonly<DeskLookupDeps> = DESK_LOOKUP_DEPS,
): Promise<DeskLookup> {
  // R2-4 · the officer's budget before anything is read.
  const budget = await deps.budget(input.officerId);
  if (!budget.allowed) return { ok: false, error: DESK_RATE_LIMITED(budget.retryAfterSec) };
  const serial = normalizeMillioneaSerial(input.serial);
  const typed = typeof input.phone === "string" ? input.phone.trim() : "";
  if (!serial || typed.replace(/\D/g, "").length < 9) {
    return { ok: false, error: "Type the ticket's serial as it is printed (MLN-…) and the phone number on the player's account." };
  }
  // R2-12 · the same two reads whatever exists: the ticket by its serial, the account by the number typed.
  const stored = await ticketStore.getBySerial(serial);
  const caller = await db.user.findByPhone(`+${toMsisdn255(typed)}`);
  const holds = !!stored && !!caller && caller.id === stored.userId;
  const view = holds && stored ? await millioneaTicket(stored.userId, serial, input.now ?? new Date()) : null;
  // ⭐ Recorded before the answer leaves, found or not — the serial asked for, never the number typed.
  const record = await deps.record({
    category: "COMPLIANCE",
    action: SUPPORT_LOOKUP_ACTION,
    actorId: input.officerId,
    targetType: "MaswaliTicket",
    targetId: view && stored ? stored.id : null,
    payload: { serial, found: !!view },
  });
  if (!record.recorded) return { ok: false, error: DESK_UNRECORDED };
  if (!view || !stored) return { ok: false, error: DESK_NOT_FOUND };

  const week = await weekStore.get(stored.cycleId);
  const final = view.week.state === "SETTLED" || view.week.state === "VOIDED";
  return {
    ok: true,
    ticket: {
      serial: view.serial,
      accountId: stored.userId,
      week: { code: view.week.code, state: view.week.state, visibility: view.week.visibility, closesAt: view.week.closesAt, settledAt: view.week.settledAt },
      shown: view.shown,
      boughtAt: view.boughtAt,
      cancelledAt: view.cancelledAt,
      cancelUntil: view.cancelUntil,
      price: view.stub.price,
      rulesVersion: view.stub.rulesVersion,
      resultsOut: view.resultsOut,
      share: view.share,
      paid: view.paid,
      refund: view.refund,
      answers: final ? view.slots.map((s) => ({ label: s.label, pick: s.pick, outcome: s.outcome, mark: s.mark })) : null,
      script: scriptForTicket({ shown: view.shown, share: view.share, weekState: view.week.state }),
    },
    figures: await deskScriptFigures(week),
  };
}
