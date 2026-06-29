import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input, Field as KitField } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { submitSourceOfFundsAction } from "./actions";
import { formatDate } from "@/lib/utils";
import { getServerT } from "@/lib/i18n-server";

export const metadata = { title: "Source of funds" };
export const dynamic = "force-dynamic";

const SOURCES = [
  { id: "salary",       label: "Salary" },
  { id: "business",     label: "Business" },
  { id: "savings",      label: "Savings" },
  { id: "investments",  label: "Investments" },
  { id: "inheritance",  label: "Inheritance" },
  { id: "other",        label: "Other" },
];

const BANDS = [
  { id: "under-12m", label: "Under TZS 12M" },
  { id: "12m-50m",   label: "TZS 12M – 50M" },
  { id: "50m-200m",  label: "TZS 50M – 200M" },
  { id: "over-200m", label: "Over TZS 200M" },
];

export default async function SourceOfFundsPage({ searchParams }: { searchParams?: Promise<{ error?: string; saved?: string; src?: string; occ?: string; band?: string; emp?: string; other?: string }> }) {
  const { t } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/source-of-funds");
  const existing = await db.sourceOfFunds.get(session.userId);
  const sp = (await searchParams) ?? {};
  // Restore form values from error redirect (takes precedence over existing record for the current attempt)
  const prevSource = sp.src ?? existing?.declaredSource ?? "";
  const prevOcc = sp.occ ?? existing?.declaredOccupation ?? "";
  const prevBand = sp.band ?? existing?.declaredAnnualIncomeBand ?? "";
  const prevEmp = sp.emp ?? existing?.declaredEmployer ?? "";
  const prevOther = sp.other ?? existing?.declaredOther ?? "";
  const statusTone =
    existing?.reviewStatus === "ACCEPTED" ? "yes"
    : existing?.reviewStatus === "REJECTED" ? "no"
    : "warning";
  // Humanize the raw enums before showing them to the player.
  const STATUS_LABEL: Record<string, string> = { PENDING: "Under review", ACCEPTED: "Accepted", REJECTED: "Rejected" };
  const statusLabel = existing ? (STATUS_LABEL[existing.reviewStatus] ?? existing.reviewStatus) : "";
  const sourceLabel = existing ? (SOURCES.find((s) => s.id === existing.declaredSource)?.label ?? existing.declaredSource) : "";
  const bandLabel = existing ? (BANDS.find((b) => b.id === existing.declaredAnnualIncomeBand)?.label ?? existing.declaredAnnualIncomeBand) : "";

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <I.chevronLeft s={14} />
        {t.common.profile}
      </Link>

      {sp.error && (
        <div role="alert" className="rounded-xl border border-no-700 bg-no-500/10 px-4 py-3 text-[13px] text-no-300">
          {sp.error}
        </div>
      )}
      {sp.saved && !sp.error && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          {t.profile.declarationSaved}
        </div>
      )}

      <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
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
            <I.shieldcheck s={14} />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-info-fg">
              {"AML"}
            </p>
          </div>
          <h1 className="font-display text-[26px] lg:text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">
            {t.profile.sourceOfFunds}
          </h1>
          <p className="mt-2 text-[13px] text-text-muted leading-snug max-w-prose">
            {t.profile.sofDescription}
          </p>
        </div>
      </header>

      {existing?.reviewStatus === "REJECTED" && (
        <section role="alert" className="rounded-xl border border-no-700 bg-no-500/[0.08] p-4">
          <div className="flex items-start gap-2.5">
            <I.alertCircle s={18} />
            <div className="min-w-0">
              <p className="font-display text-[14px] font-bold text-no-300">{t.profile.sofResubmit}</p>
              <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
                {t.profile.sofResubmitBody}
              </p>
            </div>
          </div>
        </section>
      )}

      {existing && existing.reviewStatus !== "REJECTED" && (
        <section className="rounded-xl border border-yes-700/60 bg-yes-500/[0.06] p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <Pill tone={statusTone as "yes" | "no" | "warning"}>{statusLabel}</Pill>
            <p className="font-mono text-[11px] text-text-subtle tabular-nums">
              {t.common.submitted} {formatDate(existing.submittedAt)}
            </p>
          </div>
          <p className="text-[12.5px] text-text-muted leading-snug">
            {t.profile.sourceOfFunds}: <span className="font-semibold text-text">{sourceLabel}</span> · {existing.declaredOccupation}
            {existing.declaredEmployer ? ` · ${existing.declaredEmployer}` : ""}
            <br />{t.profile.sofIncomeBand}: <span className="font-semibold text-text">{bandLabel}</span>
          </p>
          {existing.reviewStatus === "PENDING" && (
            <p className="font-mono text-[11px] text-text-subtle">{t.profile.sofPendingNote}</p>
          )}
        </section>
      )}

      <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <I.fileSignature s={16} className="text-info-fg" />
          <h2 className="font-display text-[15px] font-semibold text-text">{t.profile.declaration}</h2>
        </div>

        <form action={submitSourceOfFundsAction} className="space-y-5">
          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
              {t.profile.sourceOfFunds}
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
                    defaultChecked={prevSource ? prevSource === s.id : i === 0}
                    className="sr-only peer"
                  />
                  <span className="font-display text-[12.5px] font-bold text-text">{s.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              name="declaredOccupation"
              label={t.profile.occupation}
              required
              minLength={2}
              maxLength={200}
              defaultValue={prevOcc}
              placeholder="e.g. Software engineer"
            />
            <Field
              name="declaredEmployer"
              label={t.profile.employer}
              maxLength={200}
              defaultValue={prevEmp}
              placeholder="Company name"
            />
          </div>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
              {t.profile.annualIncome}
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
                    defaultChecked={prevBand ? prevBand === b.id : i === 0}
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
              {t.profile.otherDetails}
            </label>
            <textarea
              id="declaredOther"
              name="declaredOther"
              rows={3}
              maxLength={500}
              defaultValue={prevOther}
              placeholder="Describe the source of funds in your own words"
              className="w-full p-3 rounded-md border border-border bg-bg-overlay text-text text-[16px] focus:outline-none brand-focus transition-colors"
            />
          </div>

          <div className="rounded-md border border-warning-border bg-warning-bg/30 p-3.5 space-y-1">
            <p className="font-display text-[12.5px] font-semibold text-text">{t.profile.bySubmitting}</p>
            <p className="text-[12px] text-text-muted leading-snug">
              {t.profile.sofDisclaimer}
            </p>
          </div>

          <SubmitButton label={t.common.confirm} pendingLabel={t.common.loading} />
        </form>
      </section>
    </main>
  );
}

// Delegates to the kit <Input>/<Field> so this form matches the platform
// (shared height, --bg-inset, brand focus). Same signature → call sites unchanged.
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
    <KitField label={label}>
      <Input
        name={name}
        type="text"
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </KitField>
  );
}

// Thin adapter to the canonical <Chip> so status pills match the rest of the app.
function Pill({ tone, children }: { tone: "yes" | "no" | "warning"; children: React.ReactNode }) {
  const variant = tone === "yes" ? "success" : tone === "no" ? "danger" : "warning";
  return <Chip variant={variant} size="md">{children}</Chip>;
}
