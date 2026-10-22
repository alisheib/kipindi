/**
 * MASWALI MILLIONEA — THE FIGURES ITS BINDING RULES QUOTE (MASWALI-BUILD S6 item 10; MASWALI-PLAN §8 MB-69 and MB-70).
 *
 * `/legal/rules/millionea` states every rule with its figure, and every figure comes from here (L2: admins can change
 * everything). They are the rules a ticket bought now is bought under: the reader's current week's frozen rules — or,
 * with no week current, today's settings, which the next week to open freezes — read by `millioneaHowTo`, the How to
 * play page's own read, so the price, the floor, the fee, the cap, the check window and the free cancel can never differ
 * between the two. ⚠️ THE TIMES CAN (round 3, L1): How to play prints the week's frozen defaults, while this prints the
 * week's own record (below) — a moved close, an officer's early open — so where they differ, this text and the week's page
 * are the binding ones. Since S7 the open re-freezes the final deadline and every void deadline from the rules it froze
 * (`deadlinesUnderRules`), so the void hours read from the questions are the snapshot's; only the drafted close and the
 * open instant are the row's own. With no week current the text gives today's settings and says that a week's own
 * figures are fixed when it opens (round 4). The withdrawal fee is the platform's current setting, named as such.
 * ⭐ A WEEK'S TIMES ARE ITS OWN RECORD (S6 review #8): with a week current, the open, the close and the final deadline the
 *    text prints are the week row's — the instant an officer opened it, the close as it stands (it may have moved), the
 *    final deadline the open re-froze — and the void-deadline hours are the ones its fifteen questions carry, which the
 *    open re-froze from its rules too (S7). Questions that do not share one figure print none (the text then gives the
 *    cap alone).
 * ⛔ ONE WEEK'S FIGURES, NEVER A MIX: what the week's own record does not carry comes from the SAME week's frozen rules
 *    (or the config when no week is current), never from the config beside a week's frozen figures.
 * ⛔ READS ONLY.
 */
import { getGlobalConfig } from "./market-config";
import { getMaswaliConfig } from "./maswali-config";
import { questionStore, weekStore, type StoredQuestion } from "./maswali-dal";
import { millioneaHowTo, type MillioneaExamples, type MillioneaViewer } from "./maswali-player";
import { LICENCE_NUMBER } from "./support-config";
import { EAT_OFFSET_MS } from "@/lib/eat-day";
import { pctNum } from "@/lib/utils";

/** Every figure the Millionea rules quote. ⛔ Nothing in the text may be typed by hand. */
export type MillioneaRulesFigures = {
  /** WEEK: the reader's current week — its frozen rules and its own times. CONFIG: no week is current, the next week's. */
  source: "WEEK" | "CONFIG";
  weekCode: string | null;
  /** The Gaming Board licence number, as the other rulebooks print it. */
  licence: string;
  ticketPrice: number;
  /** The guaranteed floor of a winning week's jackpot, counted before the fee. 0 means none. */
  floor: number;
  /** The fee's share of the jackpot, as a bare percentage ("13", not 0.13). */
  feePct: number;
  /** TRA's and GBT's shares OF THE FEE, as bare percentages. */
  traPct: number;
  gbtPct: number;
  ticketCap: number;
  /** The open and the close, each an ISO weekday (1 = Monday … 7 = Sunday) and an EAT time: the week's own (WEEK), or
   *  the defaults the next week is drafted with (CONFIG). */
  openWeekday: number;
  openAt: string;
  closeWeekday: number;
  closeAt: string;
  /** The close stays at least this many minutes before the earliest event (OD-15). */
  minLockBufferMinutes: number;
  /** A question's void deadline: this many hours after its scheduled start (OD-09b)… — null when the week's questions do
   *  not carry one figure. */
  voidDeadlineHours: number | null;
  /** …capped at this weekday and EAT time of the week after the close. */
  finalDeadlineWeekday: number;
  finalDeadlineAt: string;
  /** Millionea's own check window (OD-05), never closing before `objectionNotBeforeAt` EAT. */
  objectionWindowHours: number;
  objectionNotBeforeAt: string;
  /** RULES §2.6's free cancel as the week froze it: the window, which is also the runway it needs before the close. */
  freeCancelMinutes: number;
  /** The platform's withdrawal fee, as a bare percentage (RULES §2.7). */
  withdrawalFeePct: number;
  /** The two worked examples, priced by the settlement's own arithmetic; each null where it cannot be shown truthfully. */
  examples: MillioneaExamples;
};

/** An instant as the rules print it: its ISO weekday (1 = Monday … 7 = Sunday) and its EAT clock time; null if unreadable. */
export function eatWeekdayClock(iso: string): { weekday: number; at: string } | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const eat = new Date(ms + EAT_OFFSET_MS);
  const hh = String(eat.getUTCHours()).padStart(2, "0"), mm = String(eat.getUTCMinutes()).padStart(2, "0");
  return { weekday: eat.getUTCDay() || 7, at: `${hh}:${mm}` };
}

/**
 * The void-deadline hours a week's questions carry (OD-09b: start + hours, capped at the final deadline), read from the
 * questions themselves over those the cap did not reach; null when they do not agree on one figure, or none is uncapped.
 */
export function questionsVoidHours(questions: readonly Pick<StoredQuestion, "eventStartsAt" | "voidDeadlineAt">[], finalDeadlineAt: string): number | null {
  const cap = Date.parse(finalDeadlineAt);
  const hours = new Set<number>();
  for (const q of questions) {
    const start = Date.parse(q.eventStartsAt), deadline = Date.parse(q.voidDeadlineAt);
    if (!Number.isFinite(start) || !Number.isFinite(deadline)) return null;
    if (deadline < cap) hours.add((deadline - start) / 3_600_000);
  }
  const [only] = hours;
  return hours.size === 1 && only > 0 ? only : null;
}

/** ⭐ THE BINDING RULES' FIGURES for this viewer's line of weeks (the gate resolved the viewer, MR-2). */
export async function millioneaBindingFigures(viewer: MillioneaViewer): Promise<MillioneaRulesFigures> {
  const [h, g] = await Promise.all([millioneaHowTo(viewer), getGlobalConfig()]);
  const c = getMaswaliConfig();
  let times: Pick<MillioneaRulesFigures, "openWeekday" | "openAt" | "closeWeekday" | "closeAt" | "finalDeadlineWeekday" | "finalDeadlineAt" | "voidDeadlineHours"> = {
    openWeekday: h.openWeekday, openAt: h.openAt, closeWeekday: h.closeWeekday, closeAt: h.closeAt,
    finalDeadlineWeekday: c.finalDeadlineWeekday, finalDeadlineAt: c.finalDeadlineAt, voidDeadlineHours: h.voidDeadlineHours,
  };
  if (h.source === "WEEK" && h.weekCode) {
    // The week the How to play read found, read again by its code: its own row and its own questions. A week whose
    // times cannot be read throws to the page's error boundary — never a page that mixes in the config's.
    const week = await weekStore.getByCode(h.weekCode);
    const open = week ? eatWeekdayClock(week.opensAt) : null;
    const close = week ? eatWeekdayClock(week.closesAt) : null;
    const final = week ? eatWeekdayClock(week.finalDeadlineAt) : null;
    if (!week || !open || !close || !final) throw new Error(`[millionea-legal] week ${h.weekCode}'s own times cannot be read`);
    times = {
      openWeekday: open.weekday, openAt: open.at, closeWeekday: close.weekday, closeAt: close.at,
      finalDeadlineWeekday: final.weekday, finalDeadlineAt: final.at,
      voidDeadlineHours: questionsVoidHours(await questionStore.listForWeek(week.id), week.finalDeadlineAt),
    };
  }
  return {
    source: h.source, weekCode: h.weekCode, licence: LICENCE_NUMBER(),
    ticketPrice: h.ticketPrice, floor: h.floor, feePct: pctNum(h.feeRate), traPct: pctNum(h.traRate), gbtPct: pctNum(h.gbtRate),
    ticketCap: h.ticketCap, ...times, minLockBufferMinutes: h.minLockBufferMinutes,
    objectionWindowHours: h.objectionWindowHours, objectionNotBeforeAt: h.objectionNotBeforeAt,
    freeCancelMinutes: h.freeCancelMinutes, withdrawalFeePct: pctNum(g.withdrawalFeeRate), examples: h.examples,
  };
}
