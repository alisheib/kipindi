import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { BackLink } from "@/components/ui/back-link";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { getRgSettings } from "@/lib/server/responsible-gambling";
import { setLimitsAction, selfExcludeAction, coolOffAction } from "./actions";
import { SelfExcludeConfirm } from "@/components/rg/self-exclude-confirm";
import { CoolOffConfirm } from "@/components/rg/cool-off-confirm";
import { SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/support-config";
import { Select } from "@/components/ui/select";
import { Input, Field as KitField } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { FeedbackSettings } from "@/components/settings/feedback-settings";
import { formatTzs } from "@/lib/utils";
import { getServerT } from "@/lib/i18n-server";

export const metadata = { title: "Responsible gambling" };
export const dynamic = "force-dynamic";

export default async function ResponsibleGamblingPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { t } = await getServerT();

  const SELF_EXCLUSION_OPTIONS = [
    { id: "24h",  label: t.rg.dur24h },
    { id: "1w",   label: t.rg.dur1week },
    { id: "1m",   label: t.rg.dur1month },
    { id: "6m",   label: t.rg.dur6months },
    { id: "perm", label: t.common.permanent },
  ];

  const COOLING_OFF_OPTIONS = [
    { id: "1h",  label: t.rg.dur1hour },
    { id: "24h", label: t.rg.dur24h },
    { id: "1w",  label: t.rg.dur1week },
  ];
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/responsible-gambling");
  let rg: Awaited<ReturnType<typeof getRgSettings>>;
  try { rg = await getRgSettings(session.userId); } catch { rg = { userId: session.userId, dailyDepositLimit: null, weeklyDepositLimit: null, monthlyDepositLimit: null, dailyLossLimit: null, sessionTimeLimitMin: null, realityCheckIntervalMin: 30, selfExclusionUntil: null, coolingOffUntil: null, pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null, pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null, pendingMonthlyIncreaseTo: null, pendingMonthlyIncreaseEffectiveAt: null }; }
  const hasPendingIncrease = (rg.pendingIncreaseTo !== null && rg.pendingIncreaseEffectiveAt !== null) || (rg.pendingWeeklyIncreaseTo !== null && rg.pendingWeeklyIncreaseEffectiveAt !== null) || (rg.pendingMonthlyIncreaseTo !== null && rg.pendingMonthlyIncreaseEffectiveAt !== null);
  const sp = await searchParams;

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/profile" label={t.common.profile} />

      {sp.error && (
        <div role="alert" className="rounded-xl border border-no-700 bg-no-500/10 px-4 py-3 text-[13px] text-no-300">
          {sp.error}
        </div>
      )}
      {sp.saved && !sp.error && (
        <div role="status" className="rounded-xl border border-yes-700 bg-yes-500/10 px-4 py-3 text-[13px] text-yes-300">
          {t.rg.limitsSaved}
        </div>
      )}

      <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 100% 0%, oklch(45% 0.10 152 / 0.18), transparent 60%), " +
              "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={180} />
        </div>
        <div className="relative z-10 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-1">
            <I.shieldcheck s={14} />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-yes-300">
              {t.rg.playerProtection}
            </p>
          </div>
          <h1 className="font-display text-[26px] lg:text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">
            {t.profile.responsibleGambling}
          </h1>
          <p className="mt-2 text-[13px] text-text-muted leading-snug max-w-prose">
            {t.rg.pageDescription}
          </p>
        </div>
      </header>

      <FeedbackSettings />

      {/* DEPOSIT + TIME LIMITS */}
      <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <I.clock s={16} />
          <h2 className="font-display text-[15px] font-semibold text-text">{t.rg.setLimits}</h2>
        </div>
        <p className="text-[12px] text-text-muted leading-snug">
          {t.rg.limitsDescription}
        </p>
        {hasPendingIncrease && (
          <div className="flex items-start gap-2.5 rounded-md border border-warning-border bg-warning-bg/30 p-3 text-[12px]">
            <I.warning s={14} />
            <div>
              <p className="font-display font-semibold text-text">
                {t.rg.pendingIncrease}{" "}{await formatTzs(rg.pendingIncreaseTo!)}
              </p>
              <p className="text-text-muted">
                {t.rg.effective}{" "}{new Date(rg.pendingIncreaseEffectiveAt!).toLocaleString("en-GB")}{" "}{t.rg.coolingPeriodNote}
              </p>
            </div>
          </div>
        )}
        <form action={setLimitsAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field name="dailyDepositLimit"        label={t.rg.dailyDeposit}      defaultValue={rg.dailyDepositLimit}        placeholder={t.rg.egDay} />
          <Field name="weeklyDepositLimit"       label={t.rg.weeklyDeposit}     defaultValue={rg.weeklyDepositLimit}       placeholder={t.rg.egWeek} />
          <Field name="monthlyDepositLimit"      label={t.rg.monthlyDeposit}    defaultValue={rg.monthlyDepositLimit}      placeholder={t.rg.egMonth} />
          <Field name="dailyLossLimit"           label={t.rg.dailyLoss}         defaultValue={rg.dailyLossLimit}           placeholder={t.rg.egLoss} />
          <Field name="sessionTimeLimitMin"      label={t.rg.sessionTime}   defaultValue={rg.sessionTimeLimitMin}      placeholder={t.rg.egMinutes} />
          <Field name="realityCheckIntervalMin"  label={t.rg.realityCheck}  defaultValue={rg.realityCheckIntervalMin}  placeholder="30" min={5} max={120} step={5} />
          <div className="sm:col-span-2 pt-2">
            <SubmitButton label={`${t.common.save} ${t.rg.setLimits.toLowerCase()}`} pendingLabel={`${t.common.loading}`} size="md" />
          </div>
        </form>
      </section>

      {/* COOLING-OFF */}
      <section id="break" className="scroll-mt-20 rounded-xl glass-panel p-5 lg:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <I.pause s={16} className="text-info-fg" />
          <h2 className="font-display text-[15px] font-semibold text-text">{t.rg.takeABreak}</h2>
        </div>
        <p className="text-[12px] text-text-muted leading-snug">
          {t.rg.breakDescription}
        </p>
        <form action={coolOffAction} className="flex flex-wrap items-end gap-2">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-1.5">
              {t.rg.breakLength}
            </span>
            <Select
              name="period"
              defaultValue={COOLING_OFF_OPTIONS[0].id}
              options={COOLING_OFF_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
          </div>
          <CoolOffConfirm />
        </form>
      </section>

      {/* SELF-EXCLUSION */}
      <section id="exclude" className="scroll-mt-20 rounded-xl border border-no-700/60 bg-no-500/[0.06] p-5 lg:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <I.lock s={16} />
          <h2 className="font-display text-[15px] font-semibold text-text">{t.rg.selfExclude}</h2>
          <Chip variant="no" size="sm" className="ml-auto">{t.common.oneWay}</Chip>
        </div>
        <p className="text-[12px] text-text-muted leading-snug max-w-prose">
          {t.rg.selfExcludeDescription}
        </p>
        <form action={selfExcludeAction} className="flex flex-wrap items-end gap-2">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-1.5">
              {t.rg.exclusionPeriod}
            </span>
            <Select
              name="period"
              defaultValue={SELF_EXCLUSION_OPTIONS[0].id}
              options={SELF_EXCLUSION_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
          </div>
          <SelfExcludeConfirm />
        </form>
        <p className="font-mono text-[11px] text-text-subtle pt-1">
          {t.rg.helpline} · <a href={`tel:${SUPPORT_PHONE_TEL()}`} className="text-brand-300 underline-offset-2 hover:underline">{SUPPORT_PHONE()}</a>.
          {t.rg.intlSupport}{" "}<a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-brand-300 underline-offset-2 hover:underline">begambleaware.org</a>.
        </p>
      </section>
    </main>
  );
}

// Delegates to the kit <Input>/<Field> so the limit inputs match the platform.
function Field({
  name, label, defaultValue, placeholder, min = 0, max, step = 1000,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <KitField label={label}>
      <Input
        name={name}
        type="number"
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        mono
      />
    </KitField>
  );
}
