"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Input, Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldLegend } from "@/components/ui/field-legend";
import { DateSelect } from "@/components/ui/date-select";
import { Button } from "@/components/ui/button";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { useToast } from "@/components/ui/toast";
import { CategoryIcon, categoryLabel } from "@/components/proposals/category-icon";
import { createProposalAction } from "../actions";
import { useT } from "@/lib/i18n";
import { wallClockToUtcIso } from "@/lib/zoned-time";
import type { ProposalCategory } from "@/lib/server/store";

const CATEGORIES: ProposalCategory[] = ["sports", "macro", "weather", "crypto", "culture", "infrastructure", "tech", "mixed"];

/** Client-side mirror of the server's source-URL gate (http/https only). */
function isValidHttpUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 500) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function CreateProposalForm({ rateLimit, openCount, platformTz }: { rateLimit: number; openCount: number; platformTz: string }) {
  const router = useRouter();
  const { t } = useT();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [titleEn, setTitleEn] = useState("");
  const [titleSw, setTitleSw] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [description, setDescription] = useState("");
  const [criterion, setCriterion] = useState("");
  const [category, setCategory] = useState<ProposalCategory>("sports");
  const [date, setDate] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [done, setDone] = useState(false);

  const atLimit = openCount >= rateLimit;
  // The proposed day ends on the PLATFORM clock, not in UTC — the same policy the
  // server applies in `endOfProposalDayIso`. It used to pin `T23:59:59Z` here, three
  // hours LATER than the server's cutoff, so for a three-hour window each night this
  // form enabled Submit on a date the server then refused as "must be in the future".
  const endOfDay = (d: string) => {
    const iso = wallClockToUtcIso(`${d}T23:59:59`, platformTz);
    return iso ? Date.parse(iso) : NaN;
  };
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && endOfDay(date) > Date.now();
  // Selection-close is optional; when set it must be a future date strictly before resolution.
  const closeValid = !closeDate || (/^\d{4}-\d{2}-\d{2}$/.test(closeDate) && endOfDay(closeDate) > Date.now() && (!dateValid || closeDate < date));
  const sourceValid = isValidHttpUrl(sourceUrl);
  const valid = !atLimit && titleEn.trim().length >= 8 && titleEn.trim().length <= 120 && criterion.trim().length >= 12 && dateValid && closeValid && sourceValid;

  const submit = () => {
    start(async () => {
      // B-12 — a flaky network mid-submit used to throw inside the transition
      // and replace this page (with the whole typed proposal) with error.tsx.
      // Caught, the draft stays on screen and the toast states the truth.
      let r: Awaited<ReturnType<typeof createProposalAction>>;
      try {
        r = await createProposalAction({ titleEn, titleSw: titleSw || undefined, titleZh: titleZh || undefined, description: description || undefined, resolutionCriterion: criterion, category, resolutionDate: date, selectionCloseDate: closeDate || undefined, sourceUrl: sourceUrl.trim() });
      } catch {
        toast({ title: t.toast.couldntSubmit, description: t.error.somethingDidntWork, variant: "danger" });
        return;
      }
      if (r.ok) setDone(true);
      else toast({ title: t.toast.couldntSubmit, description: r.error, variant: "danger" });
    });
  };

  const Req = () => <span className="text-claret-300">*</span>;

  return (
    <div className="space-y-4">
      {/* Guidelines */}
      <div className="rounded-xl border p-3.5" style={{ borderColor: "color-mix(in oklab, var(--royal-500) 30%, var(--border))", background: "color-mix(in oklab, var(--royal-500) 8%, var(--bg-elevated))" }}>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-royal-200"><I.info s={16} /></span>
          <p className="text-[13px] font-bold text-royal-200">{t.common.whatMakesGood}</p>
        </div>
        <p className="text-[12px] leading-relaxed text-text-muted">
          {t.common.goodProposalHint}
        </p>
        <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-text-muted">
          <I.info s={13} />
          <span className="font-mono">{openCount} / {rateLimit}</span> {t.common.openProposalsUsed}
        </p>
      </div>

      <Field label={<>{t.common.titleEn} <Req /></>} hint={
        <span className={titleEn.length > 120 ? "text-no-300" : undefined}>{titleEn.length}/120</span>
      }>
        <Input placeholder={t.common.titleEnPlaceholder} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} maxLength={120} />
      </Field>

      <Field label={t.common.titleSw}>
        <Input placeholder={t.proposals.titleSwPlaceholder} value={titleSw} onChange={(e) => setTitleSw(e.target.value)} maxLength={120} />
      </Field>

      <Field label={t.common.titleZh}>
        <Input placeholder={t.proposals.titleZhPlaceholder} value={titleZh} onChange={(e) => setTitleZh(e.target.value)} maxLength={120} />
      </Field>

      <div>
        <FieldLegend className="block mb-1.5">{t.common.whyItMatters}</FieldLegend>
        <Textarea placeholder={t.common.whyItMattersPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} />
      </div>

      <div>
        <FieldLegend className="block mb-1.5">{t.common.resolutionCriterion} <Req /></FieldLegend>
        <Textarea placeholder={t.common.resolutionPlaceholder} value={criterion} onChange={(e) => setCriterion(e.target.value)} maxLength={500} />
        <p className="mt-1.5 text-[11px] leading-snug text-text-subtle">{t.common.resolutionHint}</p>
      </div>

      <div>
        <FieldLegend className="block mb-1.5">{t.common.sourceLink} <Req /></FieldLegend>
        <Input type="url" inputMode="url" placeholder={t.proposals.sourceLinkPlaceholder} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} maxLength={500} />
        <p className="mt-1.5 text-[11px] leading-snug text-text-subtle">{t.proposals.sourceLinkHint}</p>
        {sourceUrl.trim().length > 0 && !sourceValid && (
          <p className="mt-1 text-[11px] leading-snug text-no-300">{t.proposals.sourceLinkInvalid}</p>
        )}
      </div>

      <div>
        <FieldLegend className="block mb-2">{t.common.category}</FieldLegend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-pill border px-3.5 text-[12.5px] font-semibold transition-colors"
                style={active
                  ? { borderColor: "color-mix(in oklab, var(--gold-500) 40%, transparent)", background: "color-mix(in oklab, var(--gold-500) 14%, transparent)", color: "var(--gold-200)" }
                  : { borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                <CategoryIcon category={c} size={14} />{categoryLabel(t, c)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <FieldLegend className="block mb-1.5">{t.common.resolutionDate} <Req /></FieldLegend>
        <DateSelect
          value={date}
          onChange={setDate}
          min={new Date().toISOString().slice(0, 10)}
          max={`${new Date().getFullYear() + 2}-12-31`}
        />
      </div>

      <div>
        <FieldLegend className="block mb-1.5">{t.common.selectionCloseDate}</FieldLegend>
        <DateSelect
          value={closeDate}
          onChange={setCloseDate}
          min={new Date().toISOString().slice(0, 10)}
          max={date || `${new Date().getFullYear() + 2}-12-31`}
        />
        <p className="mt-1.5 text-[11px] leading-snug text-text-subtle">{t.common.selectionCloseHint}</p>
        {closeDate && !closeValid && (
          <p className="mt-1 text-[11px] leading-snug text-no-300">{t.common.selectionCloseError}</p>
        )}
      </div>

      {/* NOT gold (2026-07-29). RULES law 3 allows gold on wins, payouts, settled
          profit and the final MONEY-COMMIT button. Submitting a proposal commits
          no money — it asks an officer to review an idea, and it may be declined.
          Gold here spends the one colour that must mean "this is real money you
          have earned" on an action that has earned nothing yet, which is exactly
          the dilution the law is written to prevent. Brand blue is the correct
          tone for a primary submit. The "Propose Markets & Get Paid" framing is
          about the eventual reward, not about this tap. */}
      <Button variant="primary" size="lg" fullWidth disabled={!valid} loading={pending} onClick={submit}>
        {t.common.submitProposal}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-text-subtle">
        {t.common.submittingNoGuarantee}
      </p>

      <OperationResultModal
        open={done}
        variant="success"
        eyebrow={t.common.submitted}
        title={t.common.proposalReceived}
        subtitle={t.common.officerWillReview}
        footnote={t.common.weWillNotify}
        primaryLabel={t.common.gotIt}
        onPrimary={() => router.push("/proposals?f=mine" as never)}
        onClose={() => { setDone(false); router.push("/proposals?f=mine" as never); }}
      />
    </div>
  );
}
