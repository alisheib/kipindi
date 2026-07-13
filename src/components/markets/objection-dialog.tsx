"use client";

/**
 * ObjectionDialog (F11) — the player's route to formally dispute a verdict.
 *
 * The design kit specced this control ("Flag this resolution for review") and it
 * was never built, because until settlement was gated there was nothing an
 * objection could actually DO: the money was paid out in the same breath as the
 * verdict. Now a resolved market sits with its pool intact until the objection
 * window closes, so filing here genuinely freezes the money until an officer
 * rules — and the copy says exactly that, because it is now true.
 *
 * Every rule (stakeholder-only, one-open-per-market, window still open, not yet
 * settled) is enforced server-side under the market lock. This dialog is the
 * front door, not the guard.
 */
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { fileObjectionAction } from "@/app/markets/actions";

const DETAIL_MAX = 1000;

export function ObjectionDialog({ marketId, onFiled }: { marketId: string; onFiled?: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("WRONG_OUTCOME");
  const [detail, setDetail] = useState("");
  const [pending, start] = useTransition();

  const reasons = [
    { value: "WRONG_OUTCOME", label: t.market.objReasonWrongOutcome },
    { value: "SOURCE_CONTRADICTS", label: t.market.objReasonSourceContradicts },
    { value: "AMBIGUOUS_CRITERION", label: t.market.objReasonAmbiguous },
    { value: "RESOLVED_EARLY", label: t.market.objReasonResolvedEarly },
    { value: "OTHER", label: t.market.objReasonOther },
  ];

  const submit = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("reason", reason);
      fd.set("detail", detail);
      const r = await fileObjectionAction(fd);
      if (!r.ok) {
        toast({ title: r.error, variant: "danger" });
        return;
      }
      setOpen(false);
      setDetail("");
      toast({ title: t.market.objFiled, variant: "success" });
      onFiled?.();
    });
  };

  return (
    <>
      {/* Warning-amber outline, per the kit: this is a caution action, not a
          destructive one, and never gold — gold is earned money only. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-warning-border bg-warning-bg/20 px-3 py-2 text-[12px] font-semibold text-warning-fg transition-colors hover:bg-warning-bg/40 brand-focus"
      >
        <I.alertCircle s={13} className="shrink-0" />
        {t.market.objFlag}
      </button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        labelledBy="objection-title"
        maxWidth={460}
      >
        <div className="space-y-4">
          <h2 id="objection-title" className="font-display text-[16px] font-semibold text-text">
            {t.market.objTitle}
          </h2>

          {/* The promise we can now actually keep. */}
          <p className="rounded-md border border-warning-border bg-warning-bg/20 px-3 py-2 text-[12px] leading-relaxed text-warning-fg">
            {t.market.objIntro}
          </p>

          <div className="space-y-1.5">
            <label
              htmlFor="objection-reason"
              className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-text-subtle"
            >
              {t.market.objReasonLabel}
            </label>
            <Select
              name="reason"
              value={reason}
              onChange={setReason}
              options={reasons}
              ariaLabel={t.market.objReasonLabel}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="objection-detail"
              className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-text-subtle"
            >
              {t.market.objDetailLabel}
            </label>
            {/* The hint lives BELOW the field, not in the placeholder: it is the
                accessible description and it must stay readable while typing.
                Repeating it as a placeholder just said the same sentence twice. */}
            <Textarea
              id="objection-detail"
              rows={4}
              value={detail}
              maxLength={DETAIL_MAX}
              onChange={(e) => setDetail(e.target.value)}
              aria-describedby="objection-detail-hint"
            />
            <p id="objection-detail-hint" className="flex items-start justify-between gap-3 text-[11px] leading-relaxed text-text-subtle">
              <span>{t.market.objDetailHint}</span>
              <span className="font-mono tabular-nums shrink-0">{detail.length}/{DETAIL_MAX}</span>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={pending || detail.trim().length < 10}
            >
              {pending ? t.market.objSubmitting : t.market.objSubmit}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
