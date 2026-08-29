"use client";

/**
 * "Void & refund this round" — the operator's lever for an Up & Down round the engine
 * could not finish (finding E-23).
 *
 * `voidRoundByOperator` has always existed in the service, audited properly and
 * refunded through the normal settlement path. What it did not have was any way to
 * reach it: no action, no button, no route. So when a round stranded a player's stake
 * (E-24), nobody on the platform could release it through the product.
 *
 * Modelled on `admin/markets/emergency-void-control.tsx` on purpose — it is the same
 * act on the same kind of row (close a live pool, hand every stake back), so it wears
 * the same clothes. That deliberate mirroring is also why this file carries a documented
 * entry in `scripts/ui-consistency-baseline.json` rather than being converted to the kit
 * button on its own: the two destructive-confirm dialogs must not diverge.
 *
 * ⛔ The authority is `trading`, NOT `compliance` — read from
 * `CONTROL_DOMAIN.voidUpDownRound` so this component, the page and the server action all
 * ask one question. It shipped as `compliance` for one deploy and production proved that
 * unusable: /admin/updown/rounds is a `trading` route, so the compliance officer could not
 * open the page at all and the remedy became Owner-only — E-23 restated.
 *
 * A reason of ≥5 characters is REQUIRED and is recorded verbatim; whatever is typed here
 * is what the compliance record says about why a player's money was returned.
 */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useDeferredToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { voidRoundAction } from "../actions";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function VoidRoundControl({
  roundId,
  label,
  volume,
  players,
}: {
  roundId: string;
  /** e.g. "GOLD 15m #155" — the operator must be able to tell rounds apart. */
  label: string;
  volume: string;
  players: number;
}) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  // B-28 — success toasts ride the transition's falling edge (data visible when announced)
  const { toast, deferToast } = useDeferredToast(pending);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

  const canConfirm = reason.trim().length >= 5 && !pending;

  const fire = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", roundId);
      fd.set("reason", reason.trim());
      const r = await voidRoundAction(fd);
      if (!r.ok) {
        toast({ title: "Could not void this round", description: r.error, variant: "danger" });
        return;
      }
      setOpen(false);
      setReason("");
      // The settled case is the success (deferred); the held case is a warning (immediate).
      (r.settled ? deferToast : toast)({
        title: "Round voided",
        // `settled: false` is not a failure — the standing-objection freeze can hold
        // the money legitimately. Say which happened rather than implying payment.
        description: r.settled
          ? "Every stake was refunded in full."
          : "Voided. Settlement is held — check for a standing objection on this market.",
        variant: r.settled ? "success" : "warning",
      });
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-claret-700 bg-claret-500/10 px-2 py-1 font-mono text-micro font-bold uppercase tracking-[0.1em] text-claret-300 hover:bg-claret-500/20 transition-colors whitespace-nowrap"
        title="Void this round and refund every stake in full"
      >
        <I.warning s={12} />
        Void &amp; refund
      </button>

      <Modal
        open={open}
        onClose={() => { if (!pending) { setOpen(false); setReason(""); } }}
        role="alertdialog"
        ariaLabel="Confirm round void"
        maxWidth={480}
        closeOnScrim={!pending}
        showClose={!pending}
        initialFocus={textareaRef}
      >
        <div className="mb-3 flex items-start gap-2.5">
          <I.warning s={20} />
          <div>
            <p className="font-mono text-micro uppercase tracking-[0.16em] font-bold text-claret-300">
              Irreversible · Hatua ya dharura
            </p>
            <h2 className="mt-0.5 font-display text-[18px] font-bold text-text leading-tight">
              Void this round &amp; refund everyone?
            </h2>
          </div>
        </div>
        <p className="text-[13px] text-text-muted leading-relaxed mb-1.5">
          <span className="text-text-subtle">Round:</span> {label}
          <span className="text-text-subtle"> · </span>
          {volume} from {players} {players === 1 ? "player" : "players"}
        </p>
        <div className="text-[13px] text-text-muted leading-relaxed mb-3">
          <p>
            <strong>This is final.</strong> Every stake on this round is refunded in full, no winner is
            paid and no fee is taken, and an immutable compliance entry is recorded against your name.
          </p>
          <p className="mt-2 text-text-subtle">
            The platform normally does this by itself within minutes of a round&rsquo;s boundary. Use this
            when it has not — and say so in the reason.
          </p>
        </div>
        <label className="block mb-4">
          <span className="block font-mono text-micro uppercase tracking-[0.16em] font-bold text-text-subtle mb-1.5">
            Reason (required) · Sababu
          </span>
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            // ⚠️ THREE ROWS, NOT TWO (E-88). At 375px the two-row box cut the placeholder
            // mid-word — "…releasing the stak" — on the field that becomes the permanent
            // compliance record for an irreversible refund. The example exists to show an
            // operator what a usable reason looks like; half of one teaches the opposite.
            rows={3}
            maxLength={500}
            placeholder="e.g. Price source unreadable at the boundary; releasing the stakes"
            className="w-full rounded-md border border-border bg-bg-inset px-3 py-2 text-[16px] text-text outline-none admin-focus"
          />
          <span className="mt-1 block font-mono text-[10px] text-text-subtle">
            {reason.trim().length}/500 — minimum 5 characters
          </span>
        </label>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={fire} disabled={!canConfirm} className="btn btn-claret btn-lg w-full disabled:opacity-50 disabled:cursor-not-allowed">
            {pending ? "Voiding…" : "Yes, void & refund"}
          </button>
          <button
            type="button"
            onClick={() => { if (!pending) { setOpen(false); setReason(""); } }}
            disabled={pending}
            className="btn btn-ghost btn-md w-full"
          >
            Not now · Bado
          </button>
        </div>
      </Modal>
    </>
  );
}
