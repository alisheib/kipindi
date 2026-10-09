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
import { Select } from "@/components/ui/select";
import { Input, Field as KitField } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { FeedbackSettings } from "@/components/settings/feedback-settings";
import { formatTzs, fill } from "@/lib/utils";
import { formatEatDateTime } from "@/lib/eat-day";
import { formatBreakEnd } from "@/lib/break-end";
import { keepText } from "@/components/ui/keep-run";
import { rgPeriodFieldPx } from "@/components/rg/rg-period-width";
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
  const { t, locale } = await getServerT();

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
  // ⭐ ONE WIDTH FOR BOTH PERIOD FIELDS (R4-I, 2026-10-09, tile 001): the break's button stood at x186 and the
  // exclusion's at x201, because each field took its own legend's width. `rg-period-width.ts` says how it is measured.
  // And one width for both BUTTONS (each reserves the other's label, `widthOf`), so the two forms — field, gap, button —
  // are one width and wrap at one screen width: with two button widths, one fell under its field while the other stood
  // beside it (Swahili 337–354px).
  const periodFieldPx = rgPeriodFieldPx(
    [t.rg.breakLength, t.rg.exclusionPeriod],
    [...COOLING_OFF_OPTIONS, ...SELF_EXCLUSION_OPTIONS].map((o) => o.label),
  );
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/responsible-gambling");
  // B-1 — no swallow: the fallback object fabricated "no limits, no exclusion,
  // no cool-off" to a player who may have set all three. Throw to
  // profile/error.tsx instead.
  const rg = await getRgSettings(session.userId);
  // 🔴 E-408 · ONE LINE PER PENDING DEPOSIT LIMIT, keyed on its effective time. This printed the DAILY pending value
  // whatever was pending, so a weekly-only increase rendered `formatTzs(null)`; and a pending REMOVAL (`to` null,
  // time set — `depositLimitChange`) must say "removal", not an amount.
  const pendingChanges = ([
    [t.rg.dailyDeposit, rg.pendingIncreaseTo, rg.pendingIncreaseEffectiveAt, "tzs"],
    [t.rg.weeklyDeposit, rg.pendingWeeklyIncreaseTo, rg.pendingWeeklyIncreaseEffectiveAt, "tzs"],
    [t.rg.monthlyDeposit, rg.pendingMonthlyIncreaseTo, rg.pendingMonthlyIncreaseEffectiveAt, "tzs"],
    // E-408 remainder — the loss and session limits wait too.
    [t.rg.dailyLoss, rg.pendingLossLimitTo ?? null, rg.pendingLossLimitEffectiveAt ?? null, "tzs"],
    [t.rg.sessionTime, rg.pendingSessionLimitTo ?? null, rg.pendingSessionLimitEffectiveAt ?? null, "min"],
  ] as const).filter(([, , at]) => !!at).map(([label, to, at, unit]) => ({ label, to, at: at!, unit }));
  const hasPendingIncrease = pendingChanges.length > 0;

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
  /** R4-I · an approved break/exclusion sentence with its end, said by the one formatter and kept one run. */
  const endSentence = (template: string, iso: string) => {
    const date = formatBreakEnd(Date.parse(iso), Date.now(), t.common.monthsShort, locale);
    return keepText(fill(template, { date }), [date]);
  };

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

      {/* 🔴 A PLAYER MID-BREAK SAW THIS PAGE IN ITS DEFAULT STATE. Nothing here read
          `coolingOffUntil` or `selfExclusionUntil`, so the one page that knows a break is running
          did not say so — it just offered the form again, with every duration selectable. ⭐ That
          is the same screen a person on day two of a week-long break opens, and until 2026-09-10
          picking the shortest option there would silently REPLACE their week with an hour. The
          write now takes the furthest date; this is the half that tells them, and says plainly
          that it cannot be shortened so nobody has to discover it by trying.
          ⭐ The date carries its time (2026-10-06), as /wallet/deposit and the server's own refusal do: a
          one-hour break that ends today read "until 6 Oct 2026", which says nothing about when. And it is in the
          reader's month words on the East Africa clock (`formatEatDateTime`, §L4) — `formatDateTime` printed English
          months in every locale.
          ⭐ AT READING SIZE, AND WHOLE (R4-I, 2026-10-09, tiles 030–032 · 063–065 · 096–098). The kit's `sm` Callout set
          this sentence — the page's key statement about a running break — in `text-caption`, 11px (capitals 8px), under
          the 12.5px reading floor (`test:type-scale` §3). It takes the kit's `md` rung, the standing page-level notice:
          `text-body-sm`, 13px, in the same box family. The end is said by the one formatter (`formatBreakEnd`) and kept one
          run, and the Chinese sentence no longer leaves "现。" alone on its last line (`keepText`).
          ⭐ NEUTRAL, NOT WARNING (R4-K's gold audit, the same day): the warning tone is struck in gilt (`--warning-fg` IS
          `--gilt`, DESIGN_AUTHORITY F3) and a running break has earned nothing — the neutral box, each with its own
          section's glyph (the break's pause, the exclusion's lock). */}
      {rg.selfExclusionUntil && Date.parse(rg.selfExclusionUntil) > Date.now() ? (
        <Callout tone="neutral" size="md" glyph="lock">{endSentence(t.rg.exclusionActive, rg.selfExclusionUntil)}</Callout>
      ) : rg.coolingOffUntil && Date.parse(rg.coolingOffUntil) > Date.now() ? (
        <Callout tone="neutral" size="md" glyph="pause">{endSentence(t.rg.breakActive, rg.coolingOffUntil)}</Callout>
      ) : null}

      <PageHero glow="yes">
        <PageHeader
          tone="yes"
          icon={<I.shieldcheck s={14} />}
          eyebrow={t.rg.playerProtection}
          title={t.profile.responsibleGambling}
        />
        {/* text-balance (round 3, 2026-10-09, tile 179): "Weka mipaka ya amana na muda, pumzika au" / "jizuie." left the
            last word alone at 390. Balanced, the two lines read "Weka mipaka ya amana na" / "muda, pumzika au jizuie."
            (164 and 152px of 308 — measured with the repo's Inter); en "Set deposit and time limits," / "take a break,
            or self-exclude.". */}
        <p className="mt-2 text-[13px] text-text-muted leading-snug max-w-prose text-balance">
          {t.rg.pageDescription}
        </p>
      </PageHero>

      {/* C2h — self-care sunrise line-art + yes-toned support callout, surfaced
          early so anyone seeking help sees it immediately (no gambling imagery). */}
      {/* ONE CONTENT EDGE PER COLUMN (round 4, 2026-10-09, tile 182): the card pads sideways like the hero, px-5 lg:px-6
          (its height is unchanged), and the art is drawn 4.75px inside its own box — the leftmost stroke, the line at x7
          of 56 less its round cap, at 44px — so it steps back the whole 4px of that (-ml-1; a fractional step would be
          snapped with the svg's box) and its ink's first pixel is the column's: x41 at 390 (as before) and x165 at 1280,
          where it stood at x162 under the hero's x165. */}
      <section className="flex items-start gap-3.5 rounded-xl border border-success-border bg-success/[0.08] px-5 py-4 lg:px-6 lg:py-5">
        <RgSunriseArt size={44} className="-ml-1 shrink-0 text-success-fg" />
        <div className="min-w-0">
          <p className="font-display text-[14px] font-semibold text-success-fg">{t.rg.supportAvailable}</p>
          {/* text-balance (round 3, 2026-10-09, tile 179): the link stood alone on line 2, "Msaada wa kimataifa kupitia" /
              "begambleaware.org.". Balanced it reads "Msaada wa kimataifa" / "kupitia begambleaware.org." (en
              "International support" / "at begambleaware.org."). Only the wrap changes; the words and the link do not. */}
          <p className="mt-1 text-body-sm text-text-muted leading-snug text-balance">
            {/* ⛔ No helpline line since the owner's ruling of 2026-10-06 (docs/COMPLIANCE-DECISIONS.md). */}
            {t.rg.intlSupport}{" "}<a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-success-fg underline underline-offset-2">begambleaware.org</a>.
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
            <div className="space-y-1.5">
              {await Promise.all(pendingChanges.map(async (c) => (
                <div key={c.label}>
                  <p className="font-display font-semibold text-text">
                    {c.label} · {c.to === null ? t.rg.pendingRemoval : <>{t.rg.pendingIncrease}{" "}{c.unit === "min" ? c.to : await formatTzs(c.to)}</>}
                  </p>
                  {/* ⚠️ THIS DATE MUST BE ZONED — the end of the statutory cooling-off window. `formatEatDateTime`
                      reads the East Africa clock (in the reader's month words); a bare toLocaleString on the server
                      prints UTC, three hours early. */}
                  <p className="text-text-muted">
                    {t.rg.effective}{" "}{formatEatDateTime(Date.parse(c.at), Date.now(), t.common.monthsShort, locale)}{" "}{t.rg.coolingPeriodNote}
                  </p>
                </div>
              )))}
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
            {/* ⛔ ONE KEY, NEVER TWO GLUED TOGETHER. `common.save` + `rg.setLimits` read
                "Save set limits" / "Hifadhi weka mipaka" / "保存 设置限额" (a doubled verb, and an
                ASCII space between two Chinese phrases). */}
            <SubmitButton label={t.rg.saveLimits} pendingLabel={t.common.loading} size="md" />
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
          {/* R4-I · the one width both period fields take (`periodFieldPx`), and one button width (`widthOf`), so this
              button and Jizuie's stand in line at every screen width. */}
          <div style={{ width: periodFieldPx }}>
            <FieldLegend className="block mb-1.5">{t.rg.breakLength}</FieldLegend>
            <Select
              name="period"
              defaultValue={COOLING_OFF_OPTIONS[0].id}
              options={COOLING_OFF_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
          </div>
          <RgConfirmSubmit label={t.common.startABreak} body={t.rg.breakDescription} icon={<I.pause s={13} />} buttonClass="btn btn-ghost btn-md"
            choice={{ field: "period", label: t.rg.breakLength, options: COOLING_OFF_OPTIONS.map((o) => ({ value: o.id, label: o.label })) }}
            widthOf={t.common.selfExclude}
          />
        </form>
      </section>

      {/* SELF-EXCLUSION */}
      <section id="exclude" className="scroll-mt-20 rounded-xl border border-danger-border bg-danger-500/[0.06] p-5 lg:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <I.lock s={16} />
          <h2 className="font-display text-[15px] font-semibold text-text">{t.rg.selfExclude}</h2>
          {/* 🔴 E-238 — THIS CHIP SAID "One-way" BESIDE A FORM OFFERING 24h/1w/1m/6m.
              Either the periods meant something or the chip did. Ali ruled the periods do:
              each is the MINIMUM the exclusion lasts, and the account still never reopens by
              itself. ⛔ Do not put `oneWay` back — it is true only of account CLOSURE
              (profile/account), which is where that key belongs. */}
          <Chip variant="danger" size="sm" className="ml-auto">{t.rg.minimumPeriod}</Chip>
        </div>
        <p className="text-body-sm text-text-muted leading-snug max-w-prose">
          {t.rg.selfExcludeDescription}
        </p>
        <form action={selfExcludeAction} className="flex flex-wrap items-end gap-2">
          <div style={{ width: periodFieldPx }}>
            <FieldLegend className="block mb-1.5">{t.rg.exclusionPeriod}</FieldLegend>
            <Select
              name="period"
              defaultValue={SELF_EXCLUSION_OPTIONS[0].id}
              options={SELF_EXCLUSION_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
          </div>
          <RgConfirmSubmit label={t.common.selfExclude} body={t.rg.selfExcludeDescription} icon={<I.lock s={13} />} buttonClass="btn btn-claret btn-md"
            choice={{ field: "period", label: t.rg.exclusionPeriod, options: SELF_EXCLUSION_OPTIONS.map((o) => ({ value: o.id, label: o.label })) }}
            widthOf={t.common.startABreak}
          />
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
