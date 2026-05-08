"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SteppedProgress } from "@/components/markets/stepped-progress";
import { useToast } from "@/components/ui/toast";
import { createMarketAction } from "@/app/markets/actions";

const CATEGORIES = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"] as const;

export function NewMarketWizard() {
  const [step, setStep] = useState(0);
  const [titleEn, setTitleEn] = useState("");
  const [titleSw, setTitleSw] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("sports");
  const [sourceUrl, setSourceUrl] = useState("");
  const [resolutionAt, setResolutionAt] = useState("");
  const [criterion, setCriterion] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const canNext = (() => {
    if (step === 0) return titleEn.length >= 10;
    if (step === 1) return /^https?:\/\//.test(sourceUrl) && resolutionAt;
    if (step === 2) return criterion.length >= 30;
    return true;
  })();

  const submit = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("titleEn", titleEn);
      fd.set("titleSw", titleSw);
      fd.set("category", category);
      fd.set("sourceUrl", sourceUrl);
      fd.set("resolutionAt", new Date(resolutionAt).toISOString());
      fd.set("resolutionCriterion", criterion);
      const r = await createMarketAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't create", description: r.error, variant: "danger" });
      } else {
        toast({ title: "Market published", description: titleEn.slice(0, 50), variant: "success" });
        router.push("/admin/markets");
      }
    });
  };

  return (
    <div className="space-y-6">
      <SteppedProgress steps={4} current={step} />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
        Step {step + 1} / 4
      </p>

      {step === 0 && (
        <Section title="Question" sw="Swali">
          <Field label="Title (EN)" hint="≥10 chars. Phrase it so YES/NO answers are unambiguous.">
            <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={inputCls} placeholder="Will the TZS strengthen against the USD by month-end?" />
          </Field>
          <Field label="Title (SW)" hint="Optional Swahili translation.">
            <input value={titleSw} onChange={(e) => setTitleSw(e.target.value)} className={inputCls} placeholder="Je, TZS itaimarika dhidi ya USD?" />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </Section>
      )}

      {step === 1 && (
        <Section title="Resolution source" sw="Chanzo cha utatuzi">
          <Field label="Public source URL" hint="Officers + players resolve against this URL. Must be reachable and authoritative.">
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={inputCls} placeholder="https://www.bot.go.tz/exchangerates" />
          </Field>
          <Field label="Resolution timestamp" hint="When stage-1 officer can begin reviewing.">
            <input type="datetime-local" value={resolutionAt} onChange={(e) => setResolutionAt(e.target.value)} className={inputCls} />
          </Field>
        </Section>
      )}

      {step === 2 && (
        <Section title="Resolution criterion" sw="Kigezo cha utatuzi">
          <Field label="Written criterion" hint="≥30 chars. Be precise — this is the legal text resolvers and players will rely on.">
            <textarea value={criterion} onChange={(e) => setCriterion(e.target.value)} rows={6} className={`${inputCls} resize-none`} placeholder="Resolves YES if the BoT mid-rate on the last business day…" />
          </Field>
        </Section>
      )}

      {step === 3 && (
        <Section title="Review + publish" sw="Chunguza · chapisha">
          <div className="rounded-md border border-border bg-bg-overlay p-4 space-y-2 text-[13px]">
            <Row label="Title (EN)" value={titleEn} />
            <Row label="Title (SW)" value={titleSw || "—"} mono />
            <Row label="Category"   value={category} />
            <Row label="Source URL" value={sourceUrl} mono />
            <Row label="Resolves at" value={resolutionAt} mono />
            <Row label="Criterion"  value={criterion} />
          </div>
        </Section>
      )}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
          className="h-10 px-4 rounded-md border border-border bg-bg-elevated font-semibold text-text-muted hover:border-border-strong disabled:opacity-50"
        >
          Back
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            disabled={!canNext}
            className="h-10 px-5 rounded-md bg-teal-500 font-semibold text-white hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="h-10 px-5 rounded-md bg-gradient-to-b from-gold-400 to-gold-600 font-bold text-gold-fg border border-gold-700 disabled:opacity-50"
          >
            {pending ? "Publishing…" : "Publish market"}
          </button>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full h-11 px-3 rounded-md border border-border bg-bg-overlay font-sans text-text outline-none focus:border-teal-300 transition-colors";

function Section({ title, sw, children }: { title: string; sw: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-[18px] font-semibold text-text">{title}</h3>
      <p className="text-[12px] italic text-text-subtle mb-4">{sw}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-text-muted mb-1.5">{label}</span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-text-subtle">{hint}</p>}
    </label>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle w-32 shrink-0">{label}</span>
      <span className={`flex-1 ${mono ? "font-mono text-[12px] break-all" : "text-[13px]"} text-text`}>{value}</span>
    </div>
  );
}
