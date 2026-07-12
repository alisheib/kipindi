/**
 * /admin/insights (F7) — the owner dashboard.
 *
 * HONESTY: the funnel starts at REGISTER. There is no "visit" stage because the
 * platform has no analytics instrumentation — inventing one would be fabrication.
 * The page says so out loud rather than quietly omitting it.
 *
 * ACCESS: owner-grade money data (GGR, LTV, cohort value) → MONEY_ROLES only.
 * NEVER MODERATOR (see roles.ts). This is enforced in the page body, because the
 * admin layout only gates ADMIN_CONSOLE_ROLES.
 */
import Link from "next/link";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { AdminFunnelChart, AdminBarList } from "@/components/admin/admin-charts";
import { Chip } from "@/components/ui/chip";
import { currentSession } from "@/lib/server/auth-service";
import { hasRole, MONEY_ROLES } from "@/lib/server/roles";
import { getInsights } from "@/lib/server/insights";
import { categoryBreakdown } from "@/lib/server/report-money";
import { formatTzs, formatNumber } from "@/lib/utils";

export const metadata = { title: "Admin · Insights" };
export const dynamic = "force-dynamic";

const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 100)}%` : "—");

export default async function InsightsPage() {
  const session = await currentSession();
  // Owner-grade economics — moderators must not read this. Return BEFORE any of
  // the restricted data is computed.
  if (!hasRole(session?.role, MONEY_ROLES)) {
    return <AdminRestricted title="Insights" sw="Maarifa" need="Admin or Compliance" />;
  }

  const data = await getInsights().catch(() => null);
  const cats = await categoryBreakdown("30d").catch(() => []);

  if (!data) {
    return (
      <>
        <AdminPageHead title="Insights" sw="Maarifa" period={false} />
        <div className="px-4 lg:px-6 py-5">
          <AdminCard title="Unavailable" sw="Haipatikani">
            <p className="text-[13px] text-text-muted">Insight aggregates could not be computed right now.</p>
          </AdminCard>
        </div>
      </>
    );
  }

  const { funnel, cohorts, maxMonthOffset, topMarkets, totals } = data;
  const registered = funnel[0]?.value ?? 0;

  // Conversion vs the PREVIOUS step (that is what a funnel means).
  const funnelSteps = funnel.map((s, i) => ({
    label: s.label,
    value: s.value,
    conversionFromPrev: i === 0 ? undefined : pct(s.value, funnel[i - 1].value),
  }));

  const cols = Math.min(maxMonthOffset, 6); // M0..M6 keeps the grid readable

  return (
    <>
      <AdminPageHead title="Insights" sw="Maarifa" period={false} />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Headline KPIs — all real, all derived from the ledger. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Players" sw="Wachezaji" value={formatNumber(totals.players)} spark={false} />
          <AdminKpi label="Have bet" sw="Wamecheza" value={formatNumber(totals.bettors)} spark={false} />
          <AdminKpi label="Lifetime GGR" sw="GGR ya jumla" value={formatTzs(totals.ltvTotal)} gold spark={false} />
          <AdminKpi label="GGR per player" sw="GGR kwa mchezaji" value={formatTzs(totals.ltvPerPlayer)} spark={false} />
        </div>

        {/* Funnel — 4 REAL stages. The missing 5th is called out, not hidden. */}
        <AdminCard title="Acquisition funnel" sw="Njia ya usajili">
          <AdminFunnelChart steps={funnelSteps} />
          <p className="mt-3 border-t border-border/60 pt-3 text-[11.5px] leading-relaxed text-text-subtle">
            Starts at <strong className="text-text-muted">Registered</strong>. A “visits” stage is deliberately
            absent: the platform has no web-analytics instrumentation, so any visit number here would be invented.
            Add analytics first, then this funnel gains a real top stage.
          </p>
        </AdminCard>

        {/* Cohort retention + LTV — activity-based, honestly labelled. */}
        <AdminCard title="Cohort retention & value" sw="Vikundi: kubaki na thamani">
          {cohorts.length === 0 ? (
            <p className="text-[13px] text-text-muted">No players yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[12px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint">
                    <th className="py-2 pr-3 font-semibold">Cohort</th>
                    <th className="py-2 pr-3 font-semibold text-right">Players</th>
                    {Array.from({ length: cols + 1 }, (_, k) => (
                      <th key={k} className="py-2 px-2 font-semibold text-right">M{k}</th>
                    ))}
                    <th className="py-2 pl-3 font-semibold text-right">GGR / player</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr key={c.cohort} className="border-t border-border/50">
                      <td className="py-2 pr-3 font-mono text-text">{c.cohort}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{c.players}</td>
                      {Array.from({ length: cols + 1 }, (_, k) => {
                        const n = c.retained[k] ?? 0;
                        const p = c.players > 0 ? n / c.players : 0;
                        return (
                          <td key={k} className="px-2 py-1.5 text-right">
                            {n > 0 ? (
                              <span
                                className="inline-block min-w-[42px] rounded-md px-1.5 py-1 font-mono tabular-nums text-text"
                                // Intensity encodes retention — kit brand token, no ad-hoc colour.
                                style={{ background: `color-mix(in oklab, var(--brand-500) ${Math.round(p * 70)}%, transparent)` }}
                                title={`${n} of ${c.players} bet in month ${k}`}
                              >
                                {Math.round(p * 100)}%
                              </span>
                            ) : (
                              <span className="text-text-faint">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 pl-3 text-right font-mono tabular-nums text-gold-300">{formatTzs(c.ltvPerPlayer)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 border-t border-border/60 pt-3 text-[11.5px] leading-relaxed text-text-subtle">
            <strong className="text-text-muted">M<em>k</em></strong> = share of the cohort that placed a bet <em>k</em> months
            after signing up (activity retention, from confirmed stakes). Login-frequency retention is not shown —
            only the latest login is stored, so a login curve would be fabricated. GGR / player is lifetime
            stakes − payouts, divided by cohort size.
          </p>
        </AdminCard>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* GGR by category — reuses the normative money module. */}
          <AdminCard title="GGR by category · 30d" sw="GGR kwa aina · siku 30">
            {cats.length === 0 ? (
              <p className="text-[13px] text-text-muted">No settled volume in this window.</p>
            ) : (
              <AdminBarList
                rows={cats.map((c) => ({
                  label: <Chip size="sm" variant="cat">{c.category}</Chip>,
                  value: Math.max(0, c.ggr),
                  title: `${c.category}: GGR ${formatTzs(c.ggr)} · hold ${c.holdPct.toFixed(1)}%`,
                }))}
                format={(n) => formatTzs(n)}
              />
            )}
          </AdminCard>

          {/* Top markets by volume */}
          <AdminCard title="Top markets by volume" sw="Masoko yenye mzunguko mkubwa">
            {topMarkets.length === 0 ? (
              <p className="text-[13px] text-text-muted">No market has taken a stake yet.</p>
            ) : (
              <AdminBarList
                rows={topMarkets.map((m) => ({
                  label: (
                    <Link href={`/markets/${m.id}` as never} className="hover:text-text underline-offset-2 hover:underline">
                      {m.title.length > 46 ? m.title.slice(0, 46) + "…" : m.title}
                    </Link>
                  ),
                  value: m.volume,
                  title: `${m.title} · ${m.predictors} predictors · ${m.status}`,
                }))}
                format={(n) => formatTzs(n)}
              />
            )}
          </AdminCard>
        </div>

        <p className="text-[11px] text-text-faint">
          Registered players: {formatNumber(registered)} · computed {data.cached ? "from a ≤60s cache" : "live"} at{" "}
          {new Date(data.generatedAt).toISOString().replace("T", " ").slice(0, 19)} UTC.
        </p>
      </div>
    </>
  );
}
