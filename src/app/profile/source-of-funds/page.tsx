import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ShieldCheck, FileSignature } from "lucide-react";
import { FiftyMark } from "@/components/brand";
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
  { id: "under-12m", label: "Under TZS 12M" },
  { id: "12m-50m",   label: "TZS 12M – 50M" },
  { id: "50m-200m",  label: "TZS 50M – 200M" },
  { id: "over-200m", label: "Over TZS 200M" },
];

export default async function SourceOfFundsPage({ searchParams }: { searchParams?: Promise<{ error?: string; saved?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const existing = db.sourceOfFunds.get(session.userId);
  const sp = (await searchParams) ?? {};
  const statusTone =
    existing?.reviewStatus === "ACCEPTED" ? "yes"
    : existing?.reviewStatus === "REJECTED" ? "no"
    : "warning";

  return (
    <main className="mx-auto max-w-[680px] px-3 lg:px-6 py-6 space-y-5">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <ChevronLeft size={14} aria-hidden />
        Profile
      </Link>

      {sp.error && (
        <div role="alert" className="rounded-xl border border-no-700 bg-no-500/10 px-4 py-3 text-[13px] text-no-300">
          {sp.error}
        </div>
      )}
      {sp.saved && !sp.error && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          Declaration saved. · Taarifa imehifadhiwa.
        </div>
      )}

      <header className="relative overflow-hidden rounded-2xl border border-border bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 100% 0%, oklch(45% 0.10 240 / 0.18), transparent 60%), " +
              "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={180} />
        </div>
        <div className="relative z-10 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={14} className="text-info-fg" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-info-fg">
              AML · Enhanced due diligence
            </p>
          </div>
          <h1 className="font-display text-[24px] lg:text-[26px] font-bold text-text leading-tight tracking-[-0.02em]">
            Source of funds <span className="text-text-subtle italic font-normal text-[18px]">· Asili ya pesa</span>
          </h1>
          <p className="mt-2 text-[13px] text-text-muted leading-snug max-w-prose">
            Required by the Tanzania Anti-Money-Laundering Act (Cap 423) when cumulative deposits exceed
            TZS 5,000,000 in 30 days, or any single transaction exceeds TZS 1,000,000.
            <span className="block italic text-text-subtle text-[12px] mt-1">
              Tunahitaji kujua chanzo cha pesa zako kwa mujibu wa sheria ya kuzuia uoshaji wa fedha.
            </span>
          </p>
        </div>
      </header>

      {existing && existing.reviewStatus !== "REJECTED" && (
        <section className="rounded-xl border border-yes-700/60 bg-yes-500/[0.06] p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <Pill tone={statusTone as "yes" | "no" | "warning"}>{existing.reviewStatus}</Pill>
            <p className="font-mono text-[11px] text-text-subtle tabular-nums">
              Submitted {new Date(existing.submittedAt).toLocaleDateString("en-GB")}
            </p>
          </div>
          <p className="text-[12.5px] text-text-muted leading-snug">
            Source: <span className="font-semibold text-text">{existing.declaredSource}</span> · {existing.declaredOccupation}
            {existing.declaredEmployer ? ` · ${existing.declaredEmployer}` : ""}
            <br />Income band: <span className="font-semibold text-text">{existing.declaredAnnualIncomeBand}</span>
          </p>
          {existing.reviewStatus === "PENDING" && (
            <p className="font-mono text-[11px] text-text-subtle">A compliance officer will review within 1 business day.</p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-bg-elevated p-5 lg:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <FileSignature size={16} className="text-info-fg" />
          <h2 className="font-display text-[15px] font-semibold text-text">Declaration · Tamko</h2>
        </div>

        <form action={submitSourceOfFundsAction} className="space-y-5">
          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
              Primary source of funds · Chanzo kikuu
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SOURCES.map((s, i) => (
                <label
                  key={s.id}
                  className="relative flex flex-col items-center gap-1 px-2 py-3 rounded-md border border-border bg-bg-overlay hover:border-gold-700 cursor-pointer transition-colors has-[:checked]:border-gold-500 has-[:checked]:bg-gold-500/10"
                >
                  <input
                    type="radio"
                    name="declaredSource"
                    value={s.id}
                    required
                    defaultChecked={existing?.declaredSource === s.id || (!existing && i === 0)}
                    className="sr-only peer"
                  />
                  <span className="font-display text-[12.5px] font-bold text-text">{s.label}</span>
                  <span className="font-mono text-[10.5px] italic text-text-subtle">{s.sw}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              name="declaredOccupation"
              label="Occupation · Kazi"
              required
              minLength={2}
              maxLength={200}
              defaultValue={existing?.declaredOccupation ?? ""}
              placeholder="e.g. Software engineer"
            />
            <Field
              name="declaredEmployer"
              label="Employer (optional) · Mwajiri"
              maxLength={200}
              defaultValue={existing?.declaredEmployer ?? ""}
              placeholder="Company name"
            />
          </div>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
              Approximate annual income · Mapato ya mwaka
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BANDS.map((b, i) => (
                <label
                  key={b.id}
                  className="relative flex items-center justify-center gap-1 px-2 py-3 rounded-md border border-border bg-bg-overlay hover:border-gold-700 cursor-pointer transition-colors has-[:checked]:border-gold-500 has-[:checked]:bg-gold-500/10"
                >
                  <input
                    type="radio"
                    name="declaredAnnualIncomeBand"
                    value={b.id}
                    required
                    defaultChecked={existing?.declaredAnnualIncomeBand === b.id || (!existing && i === 0)}
                    className="sr-only peer"
                  />
                  <span className="font-mono text-[11px] font-bold text-text text-center">{b.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="declaredOther"
              className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2"
            >
              Other details (required if &quot;Other&quot; selected) · Maelezo zaidi
            </label>
            <textarea
              id="declaredOther"
              name="declaredOther"
              rows={3}
              maxLength={500}
              defaultValue={existing?.declaredOther ?? ""}
              placeholder="Describe the source of funds in your own words"
              className="w-full p-3 rounded-md border border-border bg-bg-overlay text-text text-[13px] focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 transition-colors"
            />
          </div>

          <div className="rounded-md border border-warning-border bg-warning-bg/30 p-3.5 space-y-1">
            <p className="font-display text-[12.5px] font-semibold text-text">By submitting</p>
            <p className="text-[12px] text-text-muted leading-snug">
              You confirm the declared information is true and complete. Knowingly providing false
              information is an offence under the Tanzania Anti-Money-Laundering Act, with penalties
              up to 10 years imprisonment and/or fines up to TZS 100,000,000.
            </p>
          </div>

          <button type="submit" className="btn btn-gold btn-lg w-full" style={{ borderRadius: 999 }}>
            <FileSignature size={16} />
            Submit declaration · Wasilisha
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({
  name, label, required, minLength, maxLength, defaultValue, placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
        {label}
      </span>
      <input
        name={name}
        type="text"
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-md border border-border bg-bg-overlay text-text text-[13px] focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 transition-colors"
      />
    </label>
  );
}

function Pill({ tone, children }: { tone: "yes" | "no" | "warning"; children: React.ReactNode }) {
  const cls =
    tone === "yes"     ? "border-yes-700 bg-yes-500/10 text-yes-300"
    : tone === "no"      ? "border-no-700 bg-no-500/10 text-no-300"
    :                      "border-warning-border bg-warning-bg/40 text-warning-fg";
  return (
    <span className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] ${cls}`}>
      {children}
    </span>
  );
}
