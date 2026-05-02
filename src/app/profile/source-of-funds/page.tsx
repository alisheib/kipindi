import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileSignature } from "lucide-react";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { submitSourceOfFundsAction } from "./actions";

export const metadata = { title: "Source of funds · Asili ya pesa" };
export const dynamic = "force-dynamic";

const SOURCES = [
  { id: "salary",       label: "Salary",         sw: "Mshahara" },
  { id: "business",     label: "Business",       sw: "Biashara" },
  { id: "savings",      label: "Savings",        sw: "Akiba" },
  { id: "investments",  label: "Investments",    sw: "Uwekezaji" },
  { id: "inheritance",  label: "Inheritance",    sw: "Urithi" },
  { id: "other",        label: "Other",          sw: "Nyingine" },
];

const BANDS = [
  { id: "under-12m",  label: "Under TZS 12M" },
  { id: "12m-50m",    label: "TZS 12M – 50M" },
  { id: "50m-200m",   label: "TZS 50M – 200M" },
  { id: "over-200m",  label: "Over TZS 200M" },
];

export default async function SourceOfFundsPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const existing = db.sourceOfFunds.get(session.userId);

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-start justify-center px-3 py-8">
      <Pattern kind="sokoni" opacity={0.03} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-2xl space-y-4">
        <Breadcrumbs items={[
          { label: "Profile", href: "/profile" },
          { label: "Source of funds", labelSw: "Asili ya pesa" },
        ]} />

        <header>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-info" />
            <p className="font-mono text-caption uppercase tracking-[0.32em] text-info font-bold">AML · Enhanced due diligence</p>
          </div>
          <h1 className="font-display font-bold text-title-lg text-text mt-1.5">Source of funds · Asili ya pesa</h1>
          <p className="text-body text-text-secondary mt-2 max-w-prose">
            Required by the Tanzania Anti-Money-Laundering Act (Cap 423) when cumulative deposits exceed TZS 5,000,000
            in 30 days, or any single transaction exceeds TZS 1,000,000.
            <br /><span className="italic">Tunahitaji kujua chanzo cha pesa zako kwa mujibu wa sheria ya kuzuia uoshaji wa fedha.</span>
          </p>
        </header>

        {existing && existing.reviewStatus !== "REJECTED" && (
          <Card className="border-2 border-success-border bg-success-bg/15">
            <CardBody className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Chip size="sm" variant={existing.reviewStatus === "ACCEPTED" ? "success" : "warning"}>
                  {existing.reviewStatus}
                </Chip>
                <p className="text-caption text-text-secondary">Submitted {new Date(existing.submittedAt).toLocaleDateString("en-GB")}</p>
              </div>
              <p className="text-body-sm text-text">
                Source: <strong>{existing.declaredSource}</strong> · {existing.declaredOccupation}
                {existing.declaredEmployer ? ` · ${existing.declaredEmployer}` : ""}
                <br />Income band: <strong>{existing.declaredAnnualIncomeBand}</strong>
              </p>
              {existing.reviewStatus === "PENDING" && (
                <p className="text-caption text-text-secondary">A compliance officer will review within 1 business day.</p>
              )}
            </CardBody>
          </Card>
        )}

        <Card className="border-2 border-border-strong">
          <CardBody className="p-5 lg:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileSignature size={18} className="text-royal" />
              <h2 className="font-display font-bold text-title-sm text-text">Declaration · Tamko</h2>
            </div>

            <form action={submitSourceOfFundsAction} className="space-y-4">
              <fieldset>
                <legend className="text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-2">
                  Primary source of funds · Chanzo kikuu
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SOURCES.map((s, i) => (
                    <label key={s.id} className="relative flex flex-col items-center gap-1 px-2 py-3 rounded-md border border-border bg-surface hover:border-border-strong cursor-pointer transition-colors has-[:checked]:border-royal has-[:checked]:bg-royal-subtle/40">
                      <input type="radio" name="declaredSource" value={s.id} required defaultChecked={existing?.declaredSource === s.id || (!existing && i === 0)} className="sr-only peer" />
                      <span className="text-body-sm font-bold text-text">{s.label}</span>
                      <span className="text-caption text-text-tertiary">{s.sw}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">
                    Occupation · Kazi
                  </span>
                  <input
                    name="declaredOccupation"
                    type="text"
                    required
                    minLength={2}
                    maxLength={200}
                    defaultValue={existing?.declaredOccupation ?? ""}
                    placeholder="e.g. Software engineer"
                    className="w-full h-10 px-3 rounded-md bg-surface border border-border text-text text-body-sm focus:outline-none focus:border-border-focus"
                  />
                </label>
                <label className="block">
                  <span className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">
                    Employer (optional) · Mwajiri
                  </span>
                  <input
                    name="declaredEmployer"
                    type="text"
                    maxLength={200}
                    defaultValue={existing?.declaredEmployer ?? ""}
                    placeholder="Company name"
                    className="w-full h-10 px-3 rounded-md bg-surface border border-border text-text text-body-sm focus:outline-none focus:border-border-focus"
                  />
                </label>
              </div>

              <fieldset>
                <legend className="text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-2">
                  Approximate annual income · Mapato ya mwaka
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BANDS.map((b, i) => (
                    <label key={b.id} className="relative flex items-center justify-center gap-1 px-2 py-3 rounded-md border border-border bg-surface hover:border-border-strong cursor-pointer transition-colors has-[:checked]:border-royal has-[:checked]:bg-royal-subtle/40">
                      <input type="radio" name="declaredAnnualIncomeBand" value={b.id} required defaultChecked={existing?.declaredAnnualIncomeBand === b.id || (!existing && i === 0)} className="sr-only peer" />
                      <span className="text-caption font-bold text-text text-center">{b.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">
                  Other details (required if &quot;Other&quot; selected) · Maelezo zaidi
                </span>
                <textarea
                  name="declaredOther"
                  rows={3}
                  maxLength={500}
                  defaultValue={existing?.declaredOther ?? ""}
                  placeholder="Describe the source of funds in your own words"
                  className="w-full p-3 rounded-md bg-surface border border-border text-text text-body-sm focus:outline-none focus:border-border-focus"
                />
              </label>

              <div className="rounded-md bg-bg-sunken/50 border border-border-subtle p-3 text-caption text-text-secondary">
                <p className="font-bold text-text mb-1">By submitting</p>
                <p>You confirm the declared information is true and complete. Knowingly providing false information is an
                offence under the Tanzania Anti-Money-Laundering Act, with penalties up to 10 years imprisonment and/or
                fines up to TZS 100,000,000.</p>
              </div>

              <Button type="submit" variant="primary" size="xl" fullWidth leading={<FileSignature size={18} />}>
                Submit declaration · Wasilisha
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
