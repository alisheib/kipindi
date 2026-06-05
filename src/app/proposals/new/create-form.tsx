"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, Calendar } from "lucide-react";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { useToast } from "@/components/ui/toast";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/proposals/category-icon";
import { createProposalAction } from "../actions";
import type { ProposalCategory } from "@/lib/server/store";

const CATEGORIES: ProposalCategory[] = ["sports", "macro", "weather", "crypto", "culture", "infrastructure"];

export function CreateProposalForm({ enabled, prizeTzs, rateLimit, openCount }: { enabled: boolean; prizeTzs: number; rateLimit: number; openCount: number }) {
  const router = useRouter();
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
      else toast({ title: "Couldn't submit", description: r.error, variant: "danger" });
    });
  };

  const ta = "w-full min-h-[76px] rounded-md border border-border bg-bg-elevated px-3.5 py-2.5 text-[14px] leading-relaxed text-text outline-none focus:border-aqua-300 focus:shadow-[0_0_0_3px_var(--aqua-glow)] transition-colors resize-none placeholder:text-text-subtle";
  const Req = () => <span className="text-claret-300">*</span>;

  return (
    <div className="space-y-4">
      {/* Guidelines */}
      <div className="rounded-xl border p-3.5" style={{ borderColor: "color-mix(in oklab, var(--royal-500) 30%, var(--border))", background: "color-mix(in oklab, var(--royal-500) 8%, var(--bg-elevated))" }}>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-royal-200"><Info size={16} /></span>
          <p className="text-[13px] font-bold text-royal-200">What makes a good proposal · Mwongozo</p>
        </div>
        <p className="text-[12px] leading-relaxed text-text-muted">
          Good proposals are specific, have a clear yes/no answer, and a trustworthy source. Politics and ambiguous outcomes are declined.{" "}
          <span className="font-display italic text-text-subtle">Maswali ya wazi yenye chanzo cha kuaminika.</span>
        </p>
        <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-text-muted">
          <Info size={13} className="text-gold-400" />
          <span className="font-mono">{openCount} of {rateLimit}</span> open proposals used · <span className="font-display italic text-text-subtle">mapendekezo {openCount} kati ya {rateLimit}</span>
        </p>
      </div>

      <Field label={<>Title (EN) · Kichwa <Req /></>} hint={
        <span className={titleEn.length > 120 ? "text-no-300" : undefined}>{titleEn.length}/120</span>
      }>
        <Input placeholder="Will [event] happen by [date]?" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} maxLength={140} />
      </Field>

      <Field label="Title (SW, optional) · Kichwa kwa Kiswahili">
        <Input placeholder="Je, [tukio] litatokea kabla ya [tarehe]?" value={titleSw} onChange={(e) => setTitleSw(e.target.value)} maxLength={140} />
      </Field>

      <div>
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">Why it matters · Maelezo</span>
        <textarea className={ta} placeholder="One or two lines on why people would want to predict this." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} />
      </div>

      <div>
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">Resolution criterion · Vigezo vya utatuzi <Req /></span>
        <textarea className={ta} placeholder="How will we know the answer? Name the official source." value={criterion} onChange={(e) => setCriterion(e.target.value)} maxLength={500} />
        <p className="mt-1.5 text-[11px] leading-snug text-text-subtle">Be precise — e.g. &ldquo;Resolves YES if TMA records ≥35°C at the Dar station before 15 June.&rdquo;</p>
      </div>

      <div>
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-2">Category · Aina</span>
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
                <CategoryIcon category={c} size={14} />{CATEGORY_LABEL[c]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">Resolution date · Tarehe ya utatuzi <Req /></span>
        <span className="input-group">
          <span className="prefix"><Calendar size={14} /></span>
          <input className="input input-mono" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Resolution date" />
        </span>
      </div>

      <Button variant="gold" size="lg" fullWidth disabled={!valid} loading={pending} onClick={submit}>
        Submit proposal · Wasilisha
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-text-subtle">
        Submitting doesn&rsquo;t guarantee listing — an officer makes the final call.
      </p>

      <OperationResultModal
        open={done}
        variant="success"
        eyebrow="Submitted · Imewasilishwa"
        title="Proposal received"
        subtitle={`An officer will review it shortly. If it's listed and resolved, you earn TZS ${prizeTzs.toLocaleString()}.`}
        footnote="Tutakujulisha kupitia arifa."
        primaryLabel="Done · Sawa"
        onPrimary={() => router.push("/proposals?f=mine" as never)}
        onClose={() => { setDone(false); router.push("/proposals?f=mine" as never); }}
      />
    </div>
  );
}
