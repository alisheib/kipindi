/**
 * /millionea — WHERE A WEEK STANDS, AND THE INSTANTS AND PLACES IT READS (S5-FIX-PLAYER P6's helpers, moved verbatim from
 * `millionea-view.ts` by S5-DESIGN-DOORS on 2026-10-21 with the lead's OK; that file re-exports every name here).
 *
 * ⛔ PURE AND CLIENT-FREE ON PURPOSE: the home card's model (`maswali-card-model.ts`) asks a week's phase here, and the journey
 *    home is `/` — a client module this file reached would join `/`'s first load for every visitor (`test:journey-home`
 *    7.client). `millionea-view.ts` reaches the Seal Line's client marks (`sealLineOf`, a value from the component file), so
 *    nothing the card reaches imports that joint; nothing here imports a component that draws.
 */
import type { MillioneaHubWeek, MillioneaQuestion } from "@/lib/server/maswali-player";
import { millioneaWord } from "@/components/maswali/maswali-format";
import { MAIN_COUNT, weekVoidCertain, type GradableQuestion } from "@/lib/maswali-score";
import { WEEK_STATE_KEY, type WeekState } from "@/lib/maswali-week-label";
import type { Dict } from "@/lib/i18n-dict";

/** An instant the read model wrote, in ms, or null when it is not one. */
export function msOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** A question's place within its role: M1…M10 and A1…A5 (the slot is 1…15, `slotOf`'s inverse). */
export function ordinalOf(q: { slot: number; role: MillioneaQuestion["role"] }): number {
  return q.role === "MAIN" ? q.slot : q.slot - MAIN_COUNT;
}

/** The grader's view of the fifteen: role, place, sealed outcome (L9). */
export function gradableOf(questions: readonly MillioneaQuestion[]): GradableQuestion[] {
  return questions.map((q) => ({ role: q.role, ordinal: ordinalOf(q), outcome: q.outcome }));
}

/**
 * ⭐ S5-FIX-PLAYER P6 · WHERE A WEEK STANDS — ONE ANSWER FOR EVERY SURFACE THAT SAYS IT (the hub's eyebrow and grading
 * block, the buy block's live line, the ticket's week line and live line; the doors lane's card): the lead's ruling of
 * 2026-10-21. A week being graded ran "Results coming in" until it settled, after every result it needed was in:
 *   · `state`      — the week's own word (OPEN, CLOSED, RESOLVING before its graded set is final, SETTLED, VOIDED);
 *   · `voiding`    — its graded set is final and its void is certain (MR-18): "Week is being voided" — the hub's pool and
 *                    the card already say so; an objection could still reinstate a question while the window is open;
 *   · `objections` — its graded set is final, the objection window is open (MR-16), `until` its end: "Objection window",
 *                    "Objection window until Tuesday 12:00";
 *   · `settling`   — the window has closed and the week waits for its settlement (a payout's release, or a rollover's):
 *                    "Settling".
 * `objectionsUntil` is the window's end while it is still AHEAD — on every kind, the void-certain one included — and never
 * an instant already past. Pure: every instant is the read model's (`gradedSetFinalAt`, `objectionsCloseAt`, ISO).
 */
export type MillioneaWeekPhase = { kind: "state" | "voiding" | "objections" | "settling"; objectionsUntil: number | null };
export type PhaseWeek = Pick<MillioneaHubWeek, "state" | "gradedSetFinalAt" | "objectionsCloseAt"> & { questions: readonly MillioneaQuestion[] };
export function millioneaWeekPhase(w: PhaseWeek, nowMs: number): MillioneaWeekPhase {
  if (w.state !== "CLOSED" && w.state !== "RESOLVING") return { kind: "state", objectionsUntil: null };
  // The window exists once the graded set is final (both instants are stamped together, MR-16).
  const end = msOf(w.gradedSetFinalAt) !== null ? msOf(w.objectionsCloseAt) : null;
  const objectionsUntil = end !== null && end > nowMs ? end : null;
  // A certain void is said as soon as it is certain, as the hub's pool and the card say it (`weekVoidCertain`, MR-18).
  let certain = false;
  try { certain = weekVoidCertain(gradableOf(w.questions)); } catch { certain = false; }
  if (certain) return { kind: "voiding", objectionsUntil };
  if (end === null) return { kind: "state", objectionsUntil: null };
  return { kind: objectionsUntil !== null ? "objections" : "settling", objectionsUntil };
}

/** The word a week's phase is said with (`millioneaWeekPhase`): the state's own, or the three the ruling names. */
export function weekPhaseWord(t: Dict, state: WeekState, phase: MillioneaWeekPhase): string {
  switch (phase.kind) {
    case "objections": return t.millionea.weekStatusCheck;
    case "settling": return t.millionea.weekStatusSettling;
    case "voiding": return t.millionea.weekVoiding;
    case "state": return millioneaWord(t, WEEK_STATE_KEY[state]);
  }
}
