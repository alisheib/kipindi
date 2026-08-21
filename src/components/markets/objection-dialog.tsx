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
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { errorCopy } from "@/lib/error-copy";
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
      // B-12 — a flaky network mid-filing must not nuke the page.
      let r: Awaited<ReturnType<typeof fileObjectionAction>>;
      try {
        r = await fileObjectionAction(fd);
      } catch {
        r = { ok: false as const, error: t.error.somethingDidntWork };
      }
      if (!r.ok) {
        // DS-26 — filing a dispute is consequential; the failure stays until read.
        // ⛔ AND IT IS READ IN THEIR OWN LANGUAGE. This rendered `r.error` — the server's
        // English audit prose — as the TITLE of a dispute failure, which is `docs/
        // FAILURE-INVENTORY.md` §1.6's documented defect on the one surface where a player is
        // formally contesting money. `errorCopy` maps the machine code to their locale, and
        // the caught-network case above already supplies a localized string to fall back to.
        toast({ title: errorCopy(t, r), variant: "danger", durationMs: 0 });
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
          destructive one, and never gold — gold is earned money only.
          The rest/hover fills are two TOKENS, not one token at two opacities
          (2026-08-21): `--warning-bg` is already an 18% mix against transparent
          and `--warning-border` a 36% one, so `/20` and `/40` were multiplying
          against those — 3.6% and 7.2%, both invisible. The button now sits at
          the designed 18% amber and lifts to 36% on hover. ⛔ Do not restore a
          `/NN` on a pre-mixed token to get a second weight; take the next token. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-[12px] font-semibold text-warning-fg transition-colors hover:bg-warning-border brand-focus"
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

          {/* The promise we can now actually keep. DS-8 — the kit Callout, not a
              hand-rolled warning box. */}
          <Callout tone="warning">{t.market.objIntro}</Callout>

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
