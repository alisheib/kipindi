"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SteppedProgress } from "@/components/markets/stepped-progress";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
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
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} disabled={pending} placeholder="Will the TZS strengthen against the USD by month-end?" />
          </Field>
          <Field label="Title (SW)" hint="Optional Swahili translation.">
            <Input value={titleSw} onChange={(e) => setTitleSw(e.target.value)} disabled={pending} placeholder="Je, TZS itaimarika dhidi ya USD?" />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(v) => setCategory(v as typeof CATEGORIES[number])}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </Field>
        </Section>
      )}

      {step === 1 && (
        <Section title="Resolution source" sw="Chanzo cha utatuzi">
          <Field label="Public source URL" hint="Officers + players resolve against this URL. Must be reachable and authoritative.">
            <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} disabled={pending} placeholder="https://www.bot.go.tz/exchangerates" />
          </Field>
          <Field label="Resolution timestamp" hint="When stage-1 officer can begin reviewing.">
            <Input type="datetime-local" value={resolutionAt} onChange={(e) => setResolutionAt(e.target.value)} disabled={pending} mono />
          </Field>
        </Section>
      )}

      {step === 2 && (
        <Section title="Resolution criterion" sw="Kigezo cha utatuzi">
          <Field label="Written criterion" hint="≥30 chars. Be precise — this is the legal text resolvers and players will rely on.">
            <textarea value={criterion} onChange={(e) => setCriterion(e.target.value)} disabled={pending} rows={6} className="w-full rounded-lg border border-border bg-[var(--bg-inset)] px-3 py-2.5 text-[14px] text-text placeholder:text-text-subtle outline-none admin-focus transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Resolves YES if the BoT mid-rate on the last business day…" />
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
        <Button
          variant="ghost"
          size="md"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
        >
          Back
        </Button>
        {step < 3 ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            disabled={!canNext}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="gold"
            size="md"
            onClick={submit}
            disabled={pending}
            loading={pending}
          >
            {pending ? "Publishing…" : "Publish market"}
          </Button>
        )}
      </div>
    </div>
  );
}

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
