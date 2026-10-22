"use client";

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { I, plateGlyph } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { dispatchWinCelebration } from "@/components/markets/win-celebration";
import { MaswaliCancelButton } from "@/components/maswali/maswali-ticket-cancel";
import { MaswaliMomentsHost } from "@/components/maswali/maswali-moment";
import { useT } from "@/lib/i18n";
import { haptics } from "@/lib/haptics";
import { moneyRuns } from "@/lib/fill-nodes";
import { refusalReason, refusalVariant, renderFailure, type ReasonedFailure } from "@/lib/failure-reasons";
import { fill, formatTzs } from "@/lib/utils";
import { cancelMillioneaTicketAction, markMillioneaTicketSeenAction } from "../../actions";

/**
 * THE TICKET PAGE'S ONE HOST (MASWALI-BUILD S5-DESIGN-TICKETS; the R1 tickets critic's M8 and the motion critic's H3/H4) —
 * the island the page's server-rendered body sits in, mounted for the page's whole life, holding the two things a
 * `router.refresh()` must never tear down:
 *
 *   · THE SEEN MARK, ONCE THE MOMENTS PLAYED (`MaswaliMomentsHost`; MASWALI-PLAN §7b S5 item 7, §10 §2.1): every fact this
 *     render holds rests from the next view on — but only once each of its moments has played ON SCREEN (the cut on the
 *     stub, the presses, the carry, the closing rule). `through` is the newest fact this render holds (L7), so a fact that
 *     lands after the render still performs next time. A mark is never load-bearing: one that fails records nothing, and
 *     the facts perform again.
 *   · THE FREE CANCEL'S RESULT (H4): the cancel lands, the page reads again — and the cancel's door is gone from the new
 *     render, because the ticket is no longer cancellable. The result used to live inside that door, so the refresh unmounted
 *     it ~0.3s after it opened, with no exit. It lives here now, so it stays until the player closes it, over the ticket
 *     that has rested and the stub that rejoins on view (N3 reversed).
 */
type CancelResult = (refunded: number) => void;
const CancelResultContext = createContext<CancelResult | null>(null);

export function TicketHost({ serial, through, children }: { serial: string; through: string; children: ReactNode }) {
  const { t } = useT();
  // `shown` keeps the last figure for the dialog's exit beat ("only a drawing survives the kit's exit beat").
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(0);
  const showResult = useCallback<CancelResult>((refunded) => { setShown(refunded); setOpen(true); }, []);
  const markSeen = useCallback((at: string) => { void markMillioneaTicketSeenAction(serial, at).catch(() => {}); }, [serial]);
  return (
    <CancelResultContext.Provider value={showResult}>
      <MaswaliMomentsHost through={through} onAllPlayed={markSeen}>
        {children}
      </MaswaliMomentsHost>
      <OperationResultModal
        open={open}
        handoff={open}
        panelDelay
        variant="neutral"
        title={t.millionea.cancelModalTitle}
        subtitle={fill(t.millionea.cancelModalBody, { price: formatTzs(shown) })}
        onClose={() => setOpen(false)}
      />
    </CancelResultContext.Provider>
  );
}

/**
 * THE FREE CANCEL (MASWALI-PLAN MR-12, §10 §3.8 item 5, §3.16; the T1, T2 and W20 frames; the R1 tickets critic's M4): the
 * door in the platform's free-exit look (`MaswaliCancelButton`, gone the moment its window is), the platform's confirm, then
 * the cancel; a landed cancel says so in the neutral result (the page's host, above) with `haptics.confirm()` — the player's
 * own act, so the confirm haptic (§10 §2.6) — and the page reads again, where the stub rejoins (N3 reversed).
 * ⛔ Never claret, red or an error crest (M8).
 * ⭐ THE CONFIRM ASKS ONE QUESTION AND NAMES THE TICKET ONCE (M4, Ali 2026-10-21 10/10 pass): "Cancel this ticket?" — the
 *    serial on its own mono line under it, never inside a title it broke at every width ("Cancel ticket MLN-" /
 *    "2026-W49-000041?"); the price one money run; the platform's "take it back" (`rotateCcw`) on its plate, never the
 *    warning triangle a free exit does not earn (the journey's free-exit confirm draws none).
 * A refusal is said in Millionea's own words where the platform's would speak of selling (`exit_window_closed`,
 * `position_not_open`), else in the registry's, under "Not cancelled" — never the button's own verb as its title — as the
 * factual toast, or the danger one; a danger refusal is a money path's, so it stays until it is read (§F2, §F8:
 * `durationMs: 0`, as the market bet's own refusal).
 * ⭐ THE CANCEL SAYS WHOSE PAGE IT WAS (round 3): `expectedOwnerId`, as the slip sends it with the buy — an account that
 *    changed since the render is refused with `session_changed` (reload), never "we couldn't find that ticket".
 */
export function TicketCancel({ serial, ownerId, until, serverNow, price, cap, windowMins }: {
  serial: string;
  /** The account this page was drawn for (the gate's session). */
  ownerId: string;
  /** When the free cancel ends (ms, the server's instant). */
  until: number;
  serverNow: number;
  price: number;
  cap: number;
  /** The week's own window, for the rule under the door (`cancelNote`). */
  windowMins: number;
}) {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const showResult = useContext(CancelResultContext);
  const [open, setOpen] = useState(false);
  // A landed cancel closes INTO its result under one dim (the kit's `handoff`, as the slip's confirm closes into its stamp).
  const [handoffOut, setHandoffOut] = useState(false);
  const [pending, start] = useTransition();
  const confirm = () => {
    const fd = new FormData();
    fd.set("expectedOwnerId", ownerId);
    fd.set("serial", serial);
    start(async () => {
      const r = await cancelMillioneaTicketAction(fd);
      setHandoffOut(r.ok && !!r.data);
      setOpen(false);
      if (r.ok && r.data) {
        haptics.confirm();
        showResult?.(r.data.refunded);
        router.refresh();
        return;
      }
      const failure = r as ReasonedFailure;
      const reason = refusalReason(failure);
      const body = reason === "exit_window_closed" ? t.millionea.cancelWindowClosed
        : reason === "position_not_open" ? t.millionea.cancelNotOpen
          : renderFailure(failure, t.error as unknown as Record<string, string>, t.common.couldNotPlace, (n) => formatTzs(n)).body;
      const variant = refusalVariant(reason);
      toast({ title: t.millionea.cancelRefusedTitle, description: body, variant, ...(variant === "danger" ? { durationMs: 0 } : null) });
      router.refresh();
    });
  };
  return (
    <>
      <MaswaliCancelButton
        until={until}
        serverNow={serverNow}
        price={price}
        note={fill(t.millionea.cancelNote, { mins: windowMins })}
        onPress={() => { setHandoffOut(false); setOpen(true); }}
        pending={pending}
      />
      <ConfirmModal
        open={open}
        onClose={() => { if (!pending) setOpen(false); }}
        onConfirm={confirm}
        tone="brand"
        size="lg"
        panelClassName="kp-mln-zh"
        handoff={handoffOut}
        loading={pending}
        icon={<I.rotateCcw s={plateGlyph(36)} />}
        title={t.millionea.cancelConfirmTitle}
        body={(
          <>
            <span className="block whitespace-nowrap font-mono font-semibold text-text">{serial}</span>
            <span className="mt-1 block">{moneyRuns(fill(t.millionea.cancelConfirmBody, { price: formatTzs(price), cap }))}</span>
          </>
        )}
        confirmLabel={t.millionea.confirmCancel}
        cancelLabel={t.millionea.keepTicket}
      />
    </>
  );
}

/**
 * THE DOOR TO THE SEAL (Q7: "Ona matokeo", `notif.awayView`; M5): a won ticket's seal opens on its owner's own tap,
 * never from a poll (§F9). One seal per player-week: the amount is the week's total for this player, landing FINAL —
 * `roll: false`, nothing counts (§M8a item 6); the seal's own `haptics.success()` is the only haptic.
 * ⭐ THE SEAL SPEAKS MILLIONEA'S WORDS (the motion critic's note; the R1 tickets critic's L10; the v6 W-seal frames): its
 *    eyebrow is the product and the week ("MILLIONEA · WIKI 49", never the platform's "MADAU YAMEFANIKIWA" for a bet), its
 *    heading Millionea's own ("Umeshinda"), and its facts how many tickets reached 10/10 and each serial, whole, one a line.
 */
export function SealDoor({ amount, eyebrow, facts }: { amount: number; eyebrow: string; facts: readonly string[] }) {
  const { t } = useT();
  return (
    <Button type="button" variant="primary" size="lg" fullWidth data-testid="millionea-ticket-seal"
      onClick={() => { dispatchWinCelebration({ kind: "WIN", amount, eyebrow, heading: t.millionea.wonHeading, facts, roll: false }); }}>
      {t.notif.awayView}
    </Button>
  );
}
