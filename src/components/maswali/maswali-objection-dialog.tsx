"use client";

/**
 * The player's objection to one question of a Millionea week (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23) — the
 * dialog the ticket page's door opens (`maswali-objection-door.tsx`).
 *
 * ⭐ The platform's dispute dialog, for one question (`components/markets/objection-dialog.tsx`): the same kit parts in the
 *    same order — the title, the promise the platform can keep (the week's payout waits while an objection is open), what
 *    is wrong, the player's own words with the count — with the one thing a week adds: which question.
 * ⭐ ENTER NEVER FILES: there is no form behind the dialog. Enter in the words is a new line; the objection is filed only by
 *    the button, which waits for a question and ten characters (the service's own floor, `DETAIL_MIN`).
 * ⛔ Every rule (a live ticket in the week, the window, one objection per question) is the server's, under the chain lock
 *    (`fileMillioneaObjection`). A refusal answers with its code only, and is said here in the player's language — never
 *    the server's sentence.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { useToast } from "@/components/ui/toast";
import { noticeBody } from "@/components/ui/empty-state-text";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils";
import { fileMillioneaObjectionAction } from "@/app/millionea/objection-actions";

const DETAIL_MIN = 10;
const DETAIL_MAX = 1000;

/** One question the reader may still object to: its label (M1…M10, A1…A5), its words in the reader's language, its result. */
export type ObjectableQuestion = { slot: number; label: string; text: string; result: string };

export function MaswaliObjectionDialog({ weekId, questions }: { weekId: string; questions: ObjectableQuestion[] }) {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState("WRONG_OUTCOME");
  const [detail, setDetail] = useState("");
  const [pending, start] = useTransition();
  const picked = questions.find((q) => String(q.slot) === slot) ?? null;

  const reasons = [
    { value: "WRONG_OUTCOME", label: t.market.objReasonWrongOutcome },
    { value: "SOURCE_CONTRADICTS", label: t.market.objReasonSourceContradicts },
    { value: "AMBIGUOUS_CRITERION", label: t.market.objReasonAmbiguous },
    { value: "RESOLVED_EARLY", label: t.market.objReasonResolvedEarly },
    { value: "OTHER", label: t.market.objReasonOther },
  ];
  /** The refusal, in the reader's words — every code the door can answer. */
  const why = (code: string): string => {
    switch (code) {
      case "WINDOW_NOT_OPEN": return t.millionea.objWhyNotYet;
      case "WINDOW_CLOSED": return t.millionea.objWhyClosed;
      case "WEEK_FINAL": return t.millionea.objWhyFinal;
      case "NO_TICKET": return t.millionea.objWhyNoTicket;
      case "NO_QUESTION": return t.millionea.objWhyNoResult;
      case "ALREADY_OBJECTED": case "ALREADY_DECIDED": return t.millionea.objWhyAlready;
      case "INVALID": return t.millionea.objWhyInvalid;
      default: return t.error.somethingDidntWork;
    }
  };

  const submit = () => {
    if (!picked || detail.trim().length < DETAIL_MIN) return;
    start(async () => {
      const fd = new FormData();
      fd.set("weekId", weekId);
      fd.set("slot", String(picked.slot));
      fd.set("reason", reason);
      fd.set("detail", detail);
      let r: { ok: true } | { ok: false; why: string };
      try {
        r = await fileMillioneaObjectionAction(fd);
      } catch {
        r = { ok: false, why: "ERROR" };
      }
      if (!r.ok) {
        // A refusal the player can read stays until read; a fault is the platform's danger (R5-I).
        toast({ title: t.millionea.objRefusedTitle, description: why(r.why), variant: r.why === "ERROR" ? "danger" : "factual", durationMs: 0 });
        router.refresh();
        return;
      }
      setOpen(false);
      setDetail("");
      setSlot("");
      toast({ title: t.millionea.objFiledWeek, variant: "success" });
      router.refresh();
    });
  };

  return (
    <>
      {/* The kit's ghost button at the player's 44px, the scales of a ruling on its start padding: asking for a check is no
          alarm (RG-calm), so it wears no caution amber. */}
      <Button variant="ghost" size="md" leading={<I.tippingScales s={16} />} onClick={() => setOpen(true)}>{t.millionea.objDoorButton}</Button>

      <Modal open={open} onClose={() => !pending && setOpen(false)} labelledBy="maswali-objection-title" maxWidth={460} showClose={!pending}>
        <div className="space-y-4">
          <h2 id="maswali-objection-title" className="kp-modal-title font-display text-[16px] font-semibold text-text">{t.millionea.objDialogTitle}</h2>
          <Callout tone="info">{noticeBody(t.millionea.objDialogIntro)}</Callout>

          <div className="space-y-1.5">
            <label htmlFor="maswali-objection-question" className="font-mono text-body-sm font-bold text-text-subtle">{t.millionea.objQuestionLabel}</label>
            <Select
              name="slot"
              value={slot}
              onChange={setSlot}
              placeholder={t.millionea.objQuestionPlaceholder}
              options={questions.map((q) => ({ value: String(q.slot), label: `${q.label} · ${q.result}` }))}
              ariaLabel={t.millionea.objQuestionLabel}
            />
            {picked && <p className="text-body-sm leading-relaxed text-text-muted">{picked.text}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="maswali-objection-reason" className="font-mono text-body-sm font-bold text-text-subtle">{t.market.objReasonLabel}</label>
            <Select name="reason" value={reason} onChange={setReason} options={reasons} ariaLabel={t.market.objReasonLabel} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="maswali-objection-detail" className="font-mono text-body-sm font-bold text-text-subtle">{t.market.objDetailLabel}</label>
            <Textarea id="maswali-objection-detail" rows={4} value={detail} maxLength={DETAIL_MAX} onChange={(e) => setDetail(e.target.value)}
              aria-describedby="maswali-objection-hint" />
            <p id="maswali-objection-hint" className="flex items-start justify-between gap-3 text-body-sm leading-relaxed text-text-subtle">
              <span>{t.market.objDetailHint}</span>
              <span className="font-mono tabular-nums shrink-0">{formatNumber(detail.length)}/{formatNumber(DETAIL_MAX)}</span>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>{t.common.cancel}</Button>
            <Button variant="primary" onClick={submit} disabled={pending || !picked || detail.trim().length < DETAIL_MIN}>
              {pending ? t.market.objSubmitting : t.market.objSubmit}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
