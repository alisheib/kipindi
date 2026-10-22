import type { Dict, Locale } from "@/lib/i18n-dict";
import { millioneaObjectionDoor, type MillioneaObjectionRow } from "@/lib/server/maswali-objections";
import type { MillioneaQuestion } from "@/lib/server/maswali-player";
import { outcomeWord } from "@/lib/side-label";
import { formatEatDateTime } from "@/lib/eat-day";
import { fill } from "@/lib/utils";
import { noticeBody } from "@/components/ui/empty-state-text";
import { I } from "@/components/ui/glyphs";
import { MaswaliObjectionDialog, type ObjectableQuestion } from "./maswali-objection-dialog";

/**
 * THE TICKET PAGE'S OBJECTION DOOR (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23) — mounted under the ticket by one
 * line in `/millionea/tickets/[serial]`.
 *
 *   · while the week's objection window is OPEN and the reader holds a live ticket in the week: the window's end, what an
 *     objection does (an officer who did not record the result checks it; the week pays out once every objection is
 *     decided), and the dialog — one question at a time, the questions already objected to left out;
 *   · once the window has CLOSED and the week is still being decided: that it closed, and that the week pays out once every
 *     objection is decided;
 *   · the reader's own objections in the week, in every state: with an officer, upheld (the result reversed, the question
 *     voided, the question reinstated), not upheld — with the officer's note, which the console tells the officer the
 *     player reads.
 * Nothing at all for a week whose results are not in, and nothing for a final week where the reader objected to nothing.
 * ⛔ RG-CALM: no hurry, no count of what an objection could win — the window's end as a plain instant, the money's rule as a
 *    fact. ⛔ WITHDRAWN draws nothing: this door sits inside the ticket page, which is the tickets' own gate's (L5).
 */
export async function MaswaliObjectionDoor({ t, locale, userId, week, questions, nowMs }: {
  t: Dict; locale: Locale; userId: string;
  week: { id: string; state: string };
  questions: readonly MillioneaQuestion[];
  nowMs: number;
}) {
  if (week.state !== "RESOLVING" && week.state !== "SETTLED" && week.state !== "VOIDED") return null;
  // A failed read draws no door: the ticket and its results stand on their own, and the next render asks again.
  const door = await millioneaObjectionDoor(userId, week.id, nowMs).catch(() => null);
  if (!door) return null;
  const when = (iso: string) => formatEatDateTime(Date.parse(iso), nowMs, t.common.monthsShort, locale);
  const label = (slot: number) => questions.find((q) => q.slot === slot)?.label ?? String(slot);
  const textOf = (q: MillioneaQuestion) => q.text[locale] ?? q.text.en;
  const taken = new Set(door.mine.map((o) => o.slot));
  const canFile = door.window.state === "OPEN" && door.holds;
  const objectable: ObjectableQuestion[] = canFile
    ? questions.filter((q) => q.outcome !== null && !taken.has(q.slot))
      .map((q) => ({ slot: q.slot, label: q.label, text: textOf(q), result: outcomeWord(t, q.outcome!, "MASWALI") }))
    : [];
  const closedLine = door.window.state === "CLOSED" ? fill(t.millionea.objDoorClosed, { when: when(door.window.closesAt) }) : null;
  if (!canFile && !closedLine && door.mine.length === 0) return null;

  const stateLine = (o: MillioneaObjectionRow): string => {
    const now = questions.find((q) => q.slot === o.slot)?.outcome ?? null;
    if (o.status === "OPEN") return fill(t.millionea.objMineOpen, { when: when(o.createdAt) });
    if (o.status === "REJECTED") return t.millionea.objMineRejected;
    switch (o.remedy) {
      case "VOID": return t.millionea.objMineVoided;
      case "REINSTATE": return fill(t.millionea.objMineReinstated, { result: now ? outcomeWord(t, now, "MASWALI") : "—" });
      default: return fill(t.millionea.objMineReversed, { result: now ? outcomeWord(t, now, "MASWALI") : "—" });
    }
  };

  return (
    <section aria-labelledby="maswali-objections-heading" data-testid="maswali-objection-door" className="mat-raised flex flex-col gap-3 rounded-card px-3 py-4 sm:px-4">
      <h2 id="maswali-objections-heading" className="font-display text-title-sm font-semibold text-text">
        {canFile ? t.millionea.objDoorTitle : t.millionea.objMineTitle}
      </h2>
      {canFile && door.window.state === "OPEN" && (
        <p className="text-body-sm leading-relaxed text-text-muted">{noticeBody(fill(t.millionea.objDoorBody, { when: when(door.window.closesAt) }))}</p>
      )}
      {closedLine && <p className="text-body-sm leading-relaxed text-text-muted">{noticeBody(closedLine)}</p>}
      {canFile && objectable.length > 0 && <div><MaswaliObjectionDialog weekId={week.id} questions={objectable} /></div>}
      {door.mine.length > 0 && (
        <ul className="space-y-2" aria-label={t.millionea.objMineTitle}>
          {door.mine.map((o) => (
            <li key={o.id} className="flex items-start gap-2 text-body-sm leading-relaxed">
              {o.status === "OPEN"
                ? <I.hourglassHalf s={13} className="mt-[3px] shrink-0 text-text-subtle" />
                : <I.tippingScales s={13} className="mt-[3px] shrink-0 text-text-subtle" />}
              <span className="min-w-0 space-y-0.5">
                <span className="block"><span className="font-mono font-bold text-text">{label(o.slot)}</span> · <span className="text-text">{stateLine(o)}</span></span>
                {o.status !== "OPEN" && o.reviewNote && (
                  <span className="block text-text-muted break-words">{fill(t.millionea.objMineNote, { note: o.reviewNote })}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
