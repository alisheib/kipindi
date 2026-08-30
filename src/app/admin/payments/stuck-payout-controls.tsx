"use client";

/**
 * Release a payout frozen in PROCESSING — give the player their money back.
 *
 * 🔴 WHY THIS EXISTS. On 2026-07-29 Selcom refused every wallet-cashin call with
 * `HTTP 403 · "API endpoint not enabled for the vendor (4035)"`. Our dispatch path
 * treats an HTTP error as AMBIGUOUS ("it might be in flight — never blind-reverse"),
 * which is right for a timeout but wrong for a permanent refusal: a 403 never
 * becomes terminal, so the 30-minute reconcile could not resolve it either. Two real
 * payouts sat frozen with the player's balance held, and there was NO operator
 * action anywhere that could release them — Match and Write-off both require a
 * CONFIRMED movement. A licensed operator must always be able to hand a player back
 * their own money.
 *
 * The server action re-queries the provider first and REFUSES if it reports the
 * payout COMPLETED, so this cannot double-pay. The confirm copy says so plainly:
 * an officer clicking this is making a money decision, not clearing a warning.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { reverseStuckPayoutAction } from "./payment-actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function StuckPayoutControls({ txnId, amountLabel }: { txnId: string; amountLabel: string }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();
  // B-28 — success toasts ride the transition's falling edge (data visible when announced)
  const { toast, deferToast } = useDeferredToast(pending);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

  const valid = reason.trim().length >= 10;
  const close = () => { if (!pending) { setOpen(false); setReason(""); } };

  const submit = () => {
    if (!valid) return;
    start(async () => {
      const fd = new FormData();
      fd.set("txnId", txnId);
      fd.set("reason", reason.trim());
      const r = await runAdminAction(() => reverseStuckPayoutAction(fd));
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      deferToast({ title: "Returned to the player", description: `${amountLabel} is back in their balance.`, variant: "success" });
      setOpen(false); setReason("");
      router.refresh();
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        leading={<I.x s={13} />}
        onClick={() => { setOpen(true); setReason(""); }}
      >
        Return to player
      </Button>

      <Modal open={open} onClose={close} ariaLabel="Return a frozen payout to the player" maxWidth={520}>
        <div className="p-5 space-y-4">
          <div>
            <p className="font-display text-[17px] font-bold text-text">Return this payout to the player?</p>
            <p className="mt-1 text-[13px] text-text-muted leading-snug">
              This releases the hold and puts <strong>{amountLabel}</strong> back in the player&rsquo;s spendable
              balance, and marks the payout failed.
            </p>
          </div>

          <div className="rounded-md border border-border bg-bg-overlay/60 px-3 py-2.5">
            <p className="font-mono text-micro uppercase eyebrow text-text-subtle">Before it runs</p>
            <p className="mt-1 text-body-sm text-text-secondary leading-snug">
              The provider is asked one more time. If it reports the payout <strong>completed</strong>, this is
              refused — reversing a payout that actually settled would pay the player twice.
            </p>
          </div>

          <div>
            {/* DG-A-14: this was one element doing two jobs — the field's name with its hint
                welded on inside brackets, the whole of it uppercase and tracked below §T4's
                12.5px reading floor. The LABEL keeps the eyebrow recipe (and keeps naming the
                textarea through `htmlFor`); the HINT is now its own line at `text-body-sm` with
                no uppercase and no tracking, which is the same shape the shared `Field` atom
                renders. The words are unchanged — only the welding brackets are gone. */}
            <label htmlFor={`reason-${txnId}`} className="font-mono text-micro uppercase eyebrow text-text-subtle">
              Reason
            </label>
            <p className="mt-1 text-body-sm text-text-subtle leading-snug">
              recorded against your name, min 10 characters
            </p>
            <textarea
              id={`reason-${txnId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. Selcom 403 — wallet-cashin not enabled for the vendor; payout never dispatched"
              className="mt-1 w-full rounded-md border border-border bg-bg-base px-2.5 py-2 text-[13px] text-text placeholder:text-text-subtle"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={close} disabled={pending}>Cancel</Button>
            <Button variant="danger" size="md" onClick={submit} disabled={!valid || pending}>
              {pending ? "Returning…" : "Return the money"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
