"use client";

import { Button } from "@/components/ui/button";
import { useTickSeconds } from "@/components/updown/round-countdown";
import { eatClock } from "@/components/maswali/maswali-format";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";

/**
 * THE FREE CANCEL'S DOOR, IN THE PLATFORM'S FREE-EXIT LOOK (MASWALI-BUILD S5; MASWALI-PLAN MR-12, R-CANCEL, §3.8 item 5 "a
 * scoped countdown that is removed when the window expires"; the R1 tickets critic's M4 and H3, Ali 2026-10-21 10/10 pass).
 *
 * ⭐ THE JOURNEY'S SELL LOOK, NOT A CONTROL OF ITS OWN (`sell-button.tsx`, `look="journey"`): a clock line — "Kughairi bila
 *    malipo hadi 10:21 · 9:42", the time a `<time>` and the m:ss a `role="timer"`, the platform's own countdown format — then
 *    one outlined button, "Ghairi tiketi" over "Rudishiwa TZS 1,000 kamili" (the platform's `journey.sellFullRefund`, its
 *    figure one `.amount`), then the rule under it ("Within 10 minutes of purchase, while sales are still open"). The long
 *    clause sits on a wrapping line, never on the button: "Kughairi bila malipo hadi 10:21" was ~215px of 15px semibold in a
 *    ~188px button at 320 (H3), and a `.btn` never wraps.
 * ⛔ GONE THE MOMENT THE WINDOW IS: the count is scoped to the window and anchored to the server's clock (`useTickSeconds`,
 *    seeded with the render's own instant so the server's paint and the first client render agree), and at zero the whole
 *    door — line, button and rule — is removed, so a fast phone never offers a cancel the money path would refuse.
 * The deadline is the server's instant (`freeExit…`, measured against the sales close, MR-12): this only says it, in East
 * Africa Time. The press is the composer's (the confirm, then the cancel action, the neutral result and
 * `haptics.confirm()`); `pending` holds the control while it runs. `rotateCcw` is the platform's "take it back" (§10c).
 */

/** "9:42" — the m:ss the platform's free exit counts down in (`sell-button.tsx`'s `graceLabel`, minutes unpadded). */
export function freeLeftLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The clock line: "Kughairi bila malipo hadi <time>10:21</time> · <timer>9:42</timer>". */
function CancelClock({ t, until, left }: { t: ReturnType<typeof useT>["t"]; until: number; left: number | null }) {
  const [freeBefore, freeAfter] = t.millionea.cancelFreeUntil.split("{time}");
  return (
    <p className="text-body-sm text-text-muted">
      {/* §T5 (round 2): the clock is a `.mono` numeral, as every digit run in a Millionea fact line — the words around it
          stay in the body face. */}
      {freeBefore}<time dateTime={new Date(until).toISOString()} className="mono whitespace-nowrap">{eatClock(until)}</time>{freeAfter}
      {left !== null && (
        <>
          {" · "}
          <span role="timer" className="whitespace-nowrap font-mono font-bold tabular-nums text-text">{freeLeftLabel(left)}</span>
        </>
      )}
    </p>
  );
}

/** The free cancel's line alone — the hub's held row (the hub critic's L20): the same words and the same count as the
 *  ticket's door, gone the moment the window is. */
export function MaswaliCancelLine({ until, serverNow }: { until: number; serverNow: number }) {
  const { t } = useT();
  const left = useTickSeconds(until, serverNow, true, serverNow);
  if (left !== null && left <= 0) return null;
  return <CancelClock t={t} until={until} left={left} />;
}

export function MaswaliCancelButton({ until, serverNow, price, note, onPress, pending }: {
  /** When the free cancel ends (ms, the server's instant). */
  until: number;
  serverNow: number;
  /** What comes back, in full: the ticket's price (the server's figure, never worked out here). */
  price: number;
  /** The rule under the button (the week's own window, `cancelNote`), or nothing. */
  note?: string;
  onPress: () => void;
  pending?: boolean;
}) {
  const { t } = useT();
  const left = useTickSeconds(until, serverNow, true, serverNow);
  if (left !== null && left <= 0) return null;
  // The dictionary marks where the amount sits, so the figure is drawn in its own element.
  const [refundBefore, refundAfter] = t.journey.sellFullRefund.split("{amount}");
  return (
    <div data-testid="millionea-ticket-cancel" className="flex flex-col gap-1.5">
      <CancelClock t={t} until={until} left={left} />
      {/* The kit's button, grown to hold its two lines (`.kp-mln-free-exit`): the outlined edge is the control's only
          boundary, so it wears the control edge's token, as the journey's free exit does. */}
      <Button type="button" variant="ghost" size="lg" fullWidth loading={pending} onClick={onPress} className="kp-mln-free-exit border-border-control">
        <span className="flex min-w-0 flex-col items-center text-center">
          <span className="whitespace-normal">{pending ? t.millionea.cancelling : t.millionea.confirmCancel}</span>
          <span className="whitespace-normal text-body-sm font-medium text-text-muted">
            {refundBefore}<span className="amount font-semibold text-text">{formatTzs(price)}</span>{refundAfter}
          </span>
        </span>
      </Button>
      {note && <p className="text-center text-body-sm text-text-subtle text-pretty">{note}</p>}
    </div>
  );
}
