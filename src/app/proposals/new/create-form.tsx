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
import type { ProposalCategory } from "@/lib/server/store";

const CATEGORIES: ProposalCategory[] = ["sports", "macro", "weather", "crypto", "culture", "infrastructure"];

export function CreateProposalForm({ enabled, prizeTzs, rateLimit, openCount }: { enabled: boolean; prizeTzs: number; rateLimit: number; openCount: number }) {
  const router = useRouter();
  const { t } = useT();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [titleEn, setTitleEn] = useState("");
  const [titleSw, setTitleSw] = useState("");
  const [description, setDescription] = useState("");
  const [criterion, setCriterion] = useState("");
  const [category, setCategory] = useState<ProposalCategory>("sports");
  const [date, setDate] = useState("");
  const [done, setDone] = useState(false);

  const atLimit = openCount >= rateLimit;
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && Date.parse(`${date}T23:59:59Z`) > Date.now();
  const valid = enabled && !atLimit && titleEn.trim().length >= 8 && titleEn.trim().length <= 120 && criterion.trim().length >= 12 && dateValid;

  const submit = () => {
    start(async () => {
      const r = await createProposalAction({ titleEn, titleSw: titleSw || undefined, description: description || undefined, resolutionCriterion: criterion, category, resolutionDate: date });
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
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-2">{t.common.category}</span>
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
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">{t.common.resolutionDate} <Req /></span>
        <DateSelect
          value={date}
          onChange={setDate}
          min={new Date().toISOString().slice(0, 10)}
          max={`${new Date().getFullYear() + 2}-12-31`}
        />
      </div>

      <Button variant="gold" size="lg" fullWidth disabled={!valid} loading={pending} onClick={submit}>
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
