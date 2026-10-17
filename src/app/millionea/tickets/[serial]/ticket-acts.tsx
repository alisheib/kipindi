"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { dispatchWinCelebration } from "@/components/markets/win-celebration";
import { MaswaliCancelButton } from "@/components/maswali/maswali-ticket-cancel";
import { useT } from "@/lib/i18n";
import { haptics } from "@/lib/haptics";
import { refusalReason, refusalVariant, renderFailure, type ReasonedFailure } from "@/lib/failure-reasons";
import { fill, formatTzs } from "@/lib/utils";
import { cancelMillioneaTicketAction, markMillioneaTicketSeenAction } from "../../actions";

/**
 * The owner SAW this ticket (MASWALI-PLAN §7b S5 item 7; §10 §2.1): every fact the page rendered rests from the next view
 * on — each performs once, for its owner, then rests. `through` is the view's `seen.through`, the newest fact this render
 * holds (L7): a fact that lands after the render still performs next time. Marked once per instant, after the page is on
 * screen; draws nothing. A mark is never load-bearing: one that fails records nothing, and the facts perform again.
 */
export function TicketSeen({ serial, through }: { serial: string; through: string }) {
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (done.current === through) return;
    done.current = through;
    void markMillioneaTicketSeenAction(serial, through).catch(() => {});
  }, [serial, through]);
  return null;
}

/**
 * THE FREE CANCEL (MASWALI-PLAN MR-12, §10 §3.8 item 5, §3.16; the T1, T2 and W20 frames): the door while the window is
 * open (`MaswaliCancelButton`, gone the moment it is not), the platform's confirm, then the cancel; a landed cancel says so
 * in the neutral modal with `haptics.confirm()` — the player's own act, so the confirm haptic (§10 §2.6) — and the page
 * reads again, where the stub rejoins (N3 reversed). ⛔ Never claret, red or an error crest (M8).
 * A refusal is said in Millionea's own words where the platform's would speak of selling (`exit_window_closed`,
 * `position_not_open`), else in the registry's, as the factual or danger toast.
 */
export function TicketCancel({ serial, until, serverNow, price, cap }: {
  serial: string;
  /** When the free cancel ends (ms, the server's instant). */
  until: number;
  serverNow: number;
  price: number;
  cap: number;
}) {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const confirm = () => {
    const fd = new FormData();
    fd.set("serial", serial);
    start(async () => {
      const r = await cancelMillioneaTicketAction(fd);
      setOpen(false);
      if (r.ok && r.data) {
        haptics.confirm();
        setDone(r.data.refunded);
        router.refresh();
        return;
      }
      const failure = r as ReasonedFailure;
      const reason = refusalReason(failure);
      const body = reason === "exit_window_closed" ? t.millionea.cancelWindowClosed
        : reason === "position_not_open" ? t.millionea.cancelNotOpen
          : renderFailure(failure, t.error as unknown as Record<string, string>, t.common.couldNotPlace, (n) => formatTzs(n)).body;
      toast({ title: t.millionea.confirmCancel, description: body, variant: refusalVariant(reason) });
      router.refresh();
    });
  };
  return (
    <>
      <MaswaliCancelButton until={until} serverNow={serverNow} onPress={() => setOpen(true)} pending={pending} />
      <ConfirmModal
        open={open}
        onClose={() => { if (!pending) setOpen(false); }}
        onConfirm={confirm}
        tone="brand"
        size="lg"
        loading={pending}
        title={fill(t.millionea.cancelConfirmTitle, { serial })}
        body={fill(t.millionea.cancelConfirmBody, { price: formatTzs(price), cap })}
        confirmLabel={t.millionea.confirmCancel}
        cancelLabel={t.millionea.keepTicket}
      />
      <OperationResultModal
        open={done !== null}
        variant="neutral"
        title={t.millionea.cancelModalTitle}
        subtitle={fill(t.millionea.cancelModalBody, { price: formatTzs(done ?? price) })}
        onClose={() => setDone(null)}
      />
    </>
  );
}

/**
 * THE DOOR TO THE SEAL (Q7: "Ona matokeo", `notif.awayView`; M5): a won ticket's seal opens on its owner's own tap,
 * never from a poll (§F9). One seal per player-week: the amount is the week's total for this player, landing FINAL —
 * `roll: false`, nothing counts (§M8a item 6); the seal's own `haptics.success()` is the only haptic.
 */
export function SealDoor({ amount, label }: { amount: number; label: string }) {
  const { t } = useT();
  return (
    <Button type="button" variant="primary" size="lg" fullWidth data-testid="millionea-ticket-seal"
      onClick={() => { dispatchWinCelebration({ kind: "WIN", amount, label, roll: false }); }}>
      {t.notif.awayView}
    </Button>
  );
}
