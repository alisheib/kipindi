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
import { getSession } from "@/lib/server/session";
import { getActivitySummary, getRgUsage, type ActivityPeriod } from "@/lib/server/activity-summary";
import { formatTzs, cn } from "@/lib/utils";
import { getServerT, type Dict } from "@/lib/i18n-server";
import Link from "next/link";

export const metadata = { title: "Your activity" };
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

      {/* Period tabs — server-rendered searchParam pills (positions idiom) */}
      <nav className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto" aria-label={t.activity.periodAria}>
        {PERIODS.map((p) => {
          const on = p === period;
          return (
            <Link
              key={p}
              href={`/profile/activity${p === "month" ? "" : `?period=${p}`}` as never}
              className={cn(
                "inline-flex h-8 items-center rounded-md border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-all",
                on ? "border-brand-500 text-text" : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text",
              )}
              style={on ? { background: "var(--pill-active)" } : undefined}
              aria-current={on ? "page" : undefined}
            >
              {periodLabel[p]}
            </Link>
          );
        })}
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
              <MoneyTile label={t.activity.deposits}    value={summary.deposits}    icon={<I.arrowDown s={14} />} />
              <MoneyTile label={t.activity.withdrawals} value={summary.withdrawals} icon={<I.arrowUp s={14} />} />
              <MoneyTile label={t.activity.staked}       value={summary.staked}       icon={<I.coins s={14} />} />
              <MoneyTile label={t.activity.won}          value={summary.won}          icon={<I.trophy s={14} />} tone="yes" />
              <MoneyTile label={t.activity.net}          value={summary.net}          icon={<I.activity s={14} />} tone={summary.net >= 0 ? "yes" : "no"} signed />
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

function MoneyTile({ label, value, icon, tone, signed }: { label: string; value: number; icon: React.ReactNode; tone?: "yes" | "no"; signed?: boolean }) {
  const display = signed ? (value >= 0 ? `+${formatTzs(value)}` : formatTzs(value)) : formatTzs(value);
  return (
    <div className="rounded-lg border border-border/60 bg-bg-overlay/40 px-3.5 py-3">
      <div className={cn("flex items-center gap-1.5", tone === "yes" ? "text-yes-300" : tone === "no" ? "text-no-300" : "text-text-subtle")}>
        {icon}
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold">{label}</p>
      </div>
      <p className="mt-1 font-display text-[17px] font-bold leading-tight tabular-nums text-text">
        <Cash>{display}</Cash>
      </p>
    </div>
  );
}

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
