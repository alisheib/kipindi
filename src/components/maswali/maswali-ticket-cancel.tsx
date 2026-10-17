"use client";

import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { useCountdown } from "@/components/updown/round-countdown";
import { eatClock } from "@/components/maswali/maswali-format";
import { useT } from "@/lib/i18n";
import { fill } from "@/lib/utils";

/**
 * THE FREE CANCEL'S DOOR (MASWALI-BUILD S5; MASWALI-PLAN MR-12, R-CANCEL; §3.8 item 5; the T1 frame) — "Kughairi bila
 * malipo hadi 14:07" under the ticket while its window is open, and gone the moment it is not: the countdown is scoped
 * to the window and removes the control when the window expires, on the server's clock (`useCountdown`'s offset), so a
 * fast phone never offers a cancel the money path would refuse.
 * The deadline is the server's instant (`freeExit…`, measured against the sales close, MR-12): this only says it, in East
 * Africa Time. The press is the composer's (the platform's ConfirmDialog, then the cancel action, the neutral result and
 * `haptics.confirm()`); `pending` holds the control while it runs.
 * `rotateCcw` is the platform's "take it back" (§10c: cancel a ticket in the free window).
 */
export function MaswaliCancelButton({ until, serverNow, onPress, pending }: {
  /** When the free cancel ends (ms, the server's instant). */
  until: number;
  serverNow: number;
  onPress: () => void;
  pending?: boolean;
}) {
  const { t } = useT();
  const left = useCountdown(until, serverNow);
  if (left !== null && left <= 0) return null;
  return (
    <Button type="button" variant="ghost" size="lg" fullWidth loading={pending} onClick={onPress} leading={<I.rotateCcw s={16} />} className="border-border-control">
      {fill(t.millionea.cancelFreeUntil, { time: eatClock(until) })}
    </Button>
  );
}
