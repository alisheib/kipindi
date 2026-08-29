import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { Callout } from "@/components/ui/callout";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { RgSunriseArt } from "@/components/rg/self-care-art";
import { FieldLegend } from "@/components/ui/field-legend";
import { currentSession } from "@/lib/server/auth-service";
import { getRgSettings, getLimitUsage } from "@/lib/server/responsible-gambling";
import { LimitUsageMeter } from "@/components/rg/limit-usage";
import { setLimitsAction, selfExcludeAction, coolOffAction } from "./actions";
import { RgConfirmSubmit } from "@/components/rg/rg-confirm-submit";
import { SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/support-config";
import { Select } from "@/components/ui/select";
import { Input, Field as KitField } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { FeedbackSettings } from "@/components/settings/feedback-settings";
import { formatTzs, formatDateTime } from "@/lib/utils";
import { getServerT } from "@/lib/i18n-server";
import { bannerFor } from "@/lib/failure-banner";
import { PageContainer } from "@/components/layout/page-container";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Responsible gambling", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.rg.playerProtection };
}
export const dynamic = "force-dynamic";

export default async function ResponsibleGamblingPage({ searchParams }: { searchParams: Promise<{ reason?: string; saved?: string }> }) {
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
  // B-1 — no swallow: the fallback object fabricated "no limits, no exclusion,
  // no cool-off" to a player who may have set all three. Throw to
  // profile/error.tsx instead.
  const rg = await getRgSettings(session.userId);
  const hasPendingIncrease = (rg.pendingIncreaseTo !== null && rg.pendingIncreaseEffectiveAt !== null) || (rg.pendingWeeklyIncreaseTo !== null && rg.pendingWeeklyIncreaseEffectiveAt !== null) || (rg.pendingMonthlyIncreaseTo !== null && rg.pendingMonthlyIncreaseEffectiveAt !== null);

  // Read-only usage snapshot for the limit meters below. Every figure is the
  // SAME quantity the deposit/loss gates enforce (getLimitUsage). null on a
  // failed read → the usage section is simply hidden (never a fabricated 0).
  // B-1 — deliberate degrade: a hidden section is distinguishable from real 0s.
  const usage = await getLimitUsage(session.userId).catch(() => null);
  const usageMeters = usage
    ? ([
        { key: "d", label: t.rg.dailyDeposit,   used: usage.depositDay,   cap: rg.dailyDepositLimit },
        { key: "w", label: t.rg.weeklyDeposit,  used: usage.depositWeek,  cap: rg.weeklyDepositLimit },
        { key: "m", label: t.rg.monthlyDeposit, used: usage.depositMonth, cap: rg.monthlyDepositLimit },
        { key: "l", label: t.rg.dailyLoss,      used: usage.lossToday,    cap: rg.dailyLossLimit },
      ] as const).filter((row): row is typeof row & { cap: number } => typeof row.cap === "number" && row.cap > 0)
    : [];

  const sp = await searchParams;
  const banner = bannerFor(sp.reason, t.error as unknown as Record<string, string>);

  return (
    <PageContainer tier="reading" className="space-y-5">
      <BackLink fallbackHref="/profile" label={t.common.profile} />

      {/* DS-26 — the kit Callout, not a bespoke box, for the outcome of a
          protection-limit change (consequential; `live` announces promptly). */}
      {banner && (
        <Callout tone={banner.tone} live>{banner.body}</Callout>
      )}
      {sp.saved && !banner && (
        <Callout tone="success" live>{t.rg.limitsSaved}</Callout>
      )}

      <PageHero glow="yes">
        <PageHeader
          tone="yes"
          icon={<I.shieldcheck s={14} />}
          eyebrow={t.rg.playerProtection}
          title={t.profile.responsibleGambling}
        />
        <p className="mt-2 text-[13px] text-text-muted leading-snug max-w-prose">
          {t.rg.pageDescription}
        </p>
      </PageHero>

      {/* C2h — self-care sunrise line-art + yes-toned support callout, surfaced
          early so anyone seeking help sees it immediately (no gambling imagery). */}
      <section className="flex items-start gap-3.5 rounded-xl border border-yes-700/60 bg-yes-500/[0.08] p-4 lg:p-5">
        <RgSunriseArt size={44} className="shrink-0 text-yes-300" />
        <div className="min-w-0">
          <p className="font-display text-[14px] font-semibold text-yes-200">{t.rg.supportAvailable}</p>
          <p className="mt-1 text-body-sm text-text-muted leading-snug">
            {t.rg.helpline} · <a href={`tel:${SUPPORT_PHONE_TEL()}`} className="font-semibold text-yes-300 underline underline-offset-2">{SUPPORT_PHONE()}</a>.
            {" "}{t.rg.intlSupport}{" "}<a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-yes-300 underline underline-offset-2">begambleaware.org</a>.
          </p>
        </div>
      </section>

      <FeedbackSettings />

      {/* DEPOSIT + TIME LIMITS */}
      <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <I.clock s={16} />
          <h2 className="font-display text-[15px] font-semibold text-text">{t.rg.setLimits}</h2>
        </div>
        <p className="text-body-sm text-text-muted leading-snug">
          {t.rg.limitsDescription}
        </p>
        {hasPendingIncrease && (
          <div className="flex items-start gap-2.5 rounded-md border border-warning-border bg-warning-bg p-3 text-[12px]">
            <I.warning s={14} />
            <div>
              <p className="font-display font-semibold text-text">
                {t.rg.pendingIncrease}{" "}{await formatTzs(rg.pendingIncreaseTo!)}
              </p>
              {/* ⚠️ THIS DATE MUST BE ZONED. It is the end of the statutory cooling-off
                  window on a deposit-limit increase — the moment the player is allowed to
                  stake more. This page renders on the server, so a bare
                  `toLocaleString("en-GB")` prints Railway's UTC clock, three hours behind
                  EAT: the player is told the new limit lands at 22:00 when it lands at
                  01:00 the next day. On an RG control that is a compliance defect, not a
                  cosmetic one. `formatDateTime` stamps the platform timezone. */}
              <p className="text-text-muted">
                {t.rg.effective}{" "}{formatDateTime(rg.pendingIncreaseEffectiveAt!)}{" "}{t.rg.coolingPeriodNote}
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

        {/* Read-only usage meters — shown only for limits actually set. Every
            figure is exactly what the deposit/loss gate checks (getLimitUsage),
            so the player sees their real headroom, never a proxy. */}
        {usageMeters.length > 0 && (
          <div className="rounded-lg border border-border/70 bg-bg-elevated/30 p-4 space-y-3.5">
            <div>
              <p className="font-display text-[13.5px] font-semibold text-text">{t.rg.usageTitle}</p>
              <p className="mt-0.5 text-body-sm text-text-tertiary leading-snug">{t.rg.usageIntro}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3.5">
              {usageMeters.map((row) => (
                <LimitUsageMeter key={row.key} label={row.label} used={row.used} cap={row.cap} overLabel={t.rg.limitReached} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* COOLING-OFF */}
      <section id="break" className="scroll-mt-20 rounded-xl glass-panel p-5 lg:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <I.pause s={16} className="text-info-fg" />
          <h2 className="font-display text-[15px] font-semibold text-text">{t.rg.takeABreak}</h2>
        </div>
        <p className="text-body-sm text-text-muted leading-snug">
          {t.rg.breakDescription}
        </p>
        <form action={coolOffAction} className="flex flex-wrap items-end gap-2">
          <div>
            <FieldLegend className="block mb-1.5">{t.rg.breakLength}</FieldLegend>
            <Select
              name="period"
              defaultValue={COOLING_OFF_OPTIONS[0].id}
              options={COOLING_OFF_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
          </div>
          <RgConfirmSubmit label={t.common.startABreak} body={t.rg.breakDescription} icon={<I.pause s={13} />} buttonClass="btn btn-ghost btn-md" />
        </form>
      </section>

      {/* SELF-EXCLUSION */}
      <section id="exclude" className="scroll-mt-20 rounded-xl border border-no-700/60 bg-no-500/[0.06] p-5 lg:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <I.lock s={16} />
          <h2 className="font-display text-[15px] font-semibold text-text">{t.rg.selfExclude}</h2>
          {/* 🔴 E-238 — THIS CHIP SAID "One-way" BESIDE A FORM OFFERING 24h/1w/1m/6m.
              Either the periods meant something or the chip did. Ali ruled the periods do:
              each is the MINIMUM the exclusion lasts, and the account still never reopens by
              itself. ⛔ Do not put `oneWay` back — it is true only of account CLOSURE
              (profile/account), which is where that key belongs. */}
          <Chip variant="no" size="sm" className="ml-auto">{t.rg.minimumPeriod}</Chip>
        </div>
        <p className="text-body-sm text-text-muted leading-snug max-w-prose">
          {t.rg.selfExcludeDescription}
        </p>
        <form action={selfExcludeAction} className="flex flex-wrap items-end gap-2">
          <div>
            <FieldLegend className="block mb-1.5">{t.rg.exclusionPeriod}</FieldLegend>
            <Select
              name="period"
              defaultValue={SELF_EXCLUSION_OPTIONS[0].id}
              options={SELF_EXCLUSION_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
          </div>
          <RgConfirmSubmit label={t.common.selfExclude} body={t.rg.selfExcludeDescription} icon={<I.lock s={13} />} buttonClass="btn btn-claret btn-md" />
        </form>
      </section>
    </PageContainer>
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
