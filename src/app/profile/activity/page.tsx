/**
 * "Your activity" — money-honesty dashboard (F2b).
 *
 * Every figure is a REAL DB aggregate over the player's own CONFIRMED
 * transactions (see `activity-summary.ts`). Personal money is wrapped in <Cash>
 * (respects the global balance-privacy mask). Zeros are shown honestly on an
 * empty period — never fabricated filler. RG limits-used is computed from the
 * exact sums the deposit/loss gates enforce, so it cannot drift from them.
 */
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Cash } from "@/components/ui/cash";
import { Stat } from "@/components/ui/stat";
import { FilterPill } from "@/components/ui/filter-pill";
import { getSession } from "@/lib/server/session";
import { getActivitySummary, getRgUsage, type ActivityPeriod } from "@/lib/server/activity-summary";
import { formatTzs, cn } from "@/lib/utils";
import { getServerT, type Dict } from "@/lib/i18n-server";
import Link from "next/link";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Your activity", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.activity.title };
}
export const dynamic = "force-dynamic";

const PERIODS: ActivityPeriod[] = ["week", "month", "all"];
function isPeriod(v: string | undefined): v is ActivityPeriod {
  return v === "week" || v === "month" || v === "all";
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { t } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/profile/activity");
  const { period: rawPeriod } = await searchParams;
  const period: ActivityPeriod = isPeriod(rawPeriod) ? rawPeriod : "month";

  const [summary, rg] = await Promise.all([
    getActivitySummary(session.userId, period),
    getRgUsage(session.userId),
  ]);

  const periodLabel: Record<ActivityPeriod, string> = {
    week: t.activity.periodWeek, month: t.activity.periodMonth, all: t.activity.periodAll,
  };

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/profile" label={t.profile.title} />
      <PageHeader tone="info" icon={<I.chart s={22} />} eyebrow={t.activity.eyebrow} title={t.activity.title} />

      {/* Period tabs. ⚠️ The comment here used to read "positions idiom" and it was exactly
          right — this rail carried the same class string as /positions, /proposals, /results
          and /profile/account, byte for byte. That is why batch 5's scan, which listed six
          surfaces, missed it: it is not a *variant* of the divergence, it IS the divergence.
          One primitive now, like every other rail. */}
      <nav className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto" aria-label={t.activity.periodAria} data-filter-rail>
        {PERIODS.map((p) => (
          <FilterPill
            key={p}
            href={`/profile/activity${p === "month" ? "" : `?period=${p}`}`}
            label={periodLabel[p]}
            on={p === period}
            semantics="tab"
          />
        ))}
      </nav>

      {summary.empty ? (
        <EmptyState
          kind="positions"
          title={t.activity.emptyTitle}
          body={t.activity.emptyBody}
          action={<Link href={"/markets" as never} className="btn btn-primary btn-sm">{t.activity.browseMarkets}</Link>}
        />
      ) : (
        <>
          {/* Money-honesty tiles — all wrapped in <Cash> (privacy mask). */}
          <section className="rounded-xl glass-panel p-5">
            <p className="gilt-eyebrow mb-1">{t.activity.moneyEyebrow}</p>
            <p className="mb-3 text-[11.5px] text-text-subtle">{t.activity.forPeriod} {periodLabel[period].toLowerCase()}.</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {/* ⭐ STAGE 9b — was a local `MoneyTile`; now the kit <Stat> at the `lg`
                  rung (17px, mt-1, leading-tight) in the `tile` box (rounded-lg,
                  border/60, bg-overlay/40, px-3.5 py-3) with the `wide` label (10px
                  semibold 0.12em). Box, label, icon row and the yes/no label tint are
                  carried across unchanged. `money` keeps the <Cash> mask this tile was
                  the ONE fork that never dropped — and pins the face to mono, which
                  fixes the one thing it got wrong: it painted TZS in Sora (§M4/§T5). */}
              <Stat size="lg" labelStyle="wide" boxed="tile" money label={t.activity.deposits}    value={formatTzs(summary.deposits)}    icon={<I.arrowDown s={14} />} />
              <Stat size="lg" labelStyle="wide" boxed="tile" money label={t.activity.withdrawals} value={formatTzs(summary.withdrawals)} icon={<I.arrowUp s={14} />} />
              <Stat size="lg" labelStyle="wide" boxed="tile" money label={t.activity.staked}      value={formatTzs(summary.staked)}      icon={<I.coins s={14} />} />
              <Stat size="lg" labelStyle="wide" boxed="tile" money label={t.activity.won}         value={formatTzs(summary.won)}         icon={<I.trophy s={14} />} labelTone="yes" />
              {/* The signed net keeps its explicit "+" — <Cash> masks from the first
                  DIGIT, so the sign and the TZS prefix survive the blur exactly as they
                  did in the fork. */}
              <Stat size="lg" labelStyle="wide" boxed="tile" money label={t.activity.net}         value={summary.net >= 0 ? `+${formatTzs(summary.net)}` : formatTzs(summary.net)} icon={<I.activity s={14} />} labelTone={summary.net >= 0 ? "yes" : "no"} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-text-subtle">{t.activity.netNote}</p>
          </section>

          {/* Responsible-gambling limits — used vs your cap (real, matches the gate). */}
          <section className="rounded-xl glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="gilt-eyebrow">{t.activity.limitsEyebrow}</p>
              <Link href="/profile/responsible-gambling" className="inline-flex items-center gap-1 font-mono text-[11px] text-accent-400 hover:text-text underline">
                {t.activity.manageLimits}<I.chevronRight s={12} />
              </Link>
            </div>
            <LimitMeter label={t.activity.depositDaily}   used={rg.dailyDeposit.used}   limit={rg.dailyDeposit.limit}   t={t} />
            <LimitMeter label={t.activity.depositWeekly}  used={rg.weeklyDeposit.used}  limit={rg.weeklyDeposit.limit}  t={t} />
            <LimitMeter label={t.activity.depositMonthly} used={rg.monthlyDeposit.used} limit={rg.monthlyDeposit.limit} t={t} />
            <LimitMeter label={t.activity.lossDaily}      used={rg.dailyLoss.used}      limit={rg.dailyLoss.limit}      t={t} tone="no" />
          </section>
        </>
      )}
    </main>
  );
}

/* ⭐ STAGE 9b — `MoneyTile` is deleted; the tiles above are `ui/stat`. It was the only
 * one of the ten Stat forks that kept the <Cash> privacy path, which is precisely why
 * the primitive makes that path a PROP rather than a thing each copy remembers. */

/**
 * "Used X of Y" meter. No cap set → shows the used figure with a "no limit set"
 * hint (encourages setting one, RG-positive) and no bar. Over-cap → clamped bar
 * in the danger tone. Personal money wrapped in <Cash>.
 */
function LimitMeter({ label, used, limit, t, tone = "brand" }: { label: string; used: number; limit: number | null; t: Dict; tone?: "brand" | "no" }) {
  const hasLimit = limit !== null && limit > 0;
  const pct = hasLimit ? Math.min(100, Math.round((used / limit!) * 100)) : 0;
  const over = hasLimit && used >= limit!;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px]">
        <span className="text-text-muted">{label}</span>
        <span className="font-mono tabular-nums text-text-subtle">
          <Cash>{formatTzs(used)}</Cash>
          {hasLimit ? <> / <Cash>{formatTzs(limit!)}</Cash></> : <span className="ml-1 text-text-faint">· {t.activity.noLimitSet}</span>}
        </span>
      </div>
      {hasLimit && (
        <div className="h-2.5 w-full overflow-hidden rounded-pill bg-bg-inset" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <div
            className={cn("h-full rounded-pill transition-[width]", over ? "bg-no-500" : tone === "no" ? "bg-warning-fg" : "bg-brand-500")}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
      )}
    </div>
  );
}
