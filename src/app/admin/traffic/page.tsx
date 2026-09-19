/**
 * /admin/traffic — website visits, counted first-party (Ali, 2026-09-15: every visitor counted; Google Analytics
 * detail only for visitors who consent).
 *
 * ⭐ WHAT THE NUMBERS ARE, SO NOBODY READS MORE INTO THEM:
 *   · a PAGE VIEW is one page opened; a VISIT is an arrival — the first page of a page load, which also carries the
 *     visit's source (referrer host, campaign tags). A reload is a new arrival.
 *   · there are NO unique visitors here, deliberately: counting people needs a per-person key, and this counter keeps
 *     none (`src/lib/server/site-visits.ts`). Unique users live in Google Analytics, for visitors who allowed it.
 *   · crawlers, previews and automation are not counted; staff pages and tokened pages are never counted.
 *   · days are EAT days. A failed read shows "couldn't load", never a zero.
 * Growth domain (`roles.ts`), the same people who run affiliate, bonuses and invites.
 */
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminKpi, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminAreaChart, AdminBarList } from "@/components/admin/admin-charts";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { ScrollX } from "@/components/ui/scroll-x";
import { resolveRange } from "@/lib/server/date-range";
import { eatDayKey } from "@/lib/eat-day";
import { formatNumber } from "@/lib/utils";
import { OTHER_PATH, siteVisitsReport, type SiteVisitsReport, type SourceTotal } from "@/lib/server/site-visits";

export const metadata = { title: "Admin · Traffic" };
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

function sourceLabel(s: SourceTotal): string {
  return s.referrer || (s.source ? s.source : "Direct");
}
function campaignLabel(s: SourceTotal): string {
  const parts = [s.source, s.medium, s.campaign].filter(Boolean);
  return parts.length ? parts.join(" / ") : "—";
}

/** Every EAT day in the window, zero-filled, so a quiet day is a visible dip and not a missing point. */
function everyDay(r: SiteVisitsReport): Array<{ day: string; views: number; visits: number }> {
  const byDay = new Map(r.days.map((d) => [d.day, d]));
  const out: Array<{ day: string; views: number; visits: number }> = [];
  let t = Date.parse(`${r.fromDay}T12:00:00Z`);
  for (let i = 0; i < 400; i++, t += DAY_MS) {
    const day = new Date(t).toISOString().slice(0, 10);
    if (day > r.toDay) break;
    const d = byDay.get(day);
    out.push({ day, views: d?.views ?? 0, visits: d?.entries ?? 0 });
  }
  return out;
}

type TrafficProps = { searchParams: Promise<{ range?: string; from?: string; to?: string }> };

/** W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. The section layout is skipped by a flight
 *  request whose router state names it, so the gate the page cannot lose is the one it carries itself. */
export default async function AdminTrafficPage(props: TrafficProps) {
  return <AdminPageGate title="Traffic"><AdminTrafficContent {...props} /></AdminPageGate>;
}

async function AdminTrafficContent({ searchParams }: TrafficProps) {
  const sp = await searchParams;
  const range = resolveRange(sp, Date.now(), "28d");
  const fromDay = eatDayKey(new Date(range.start).getTime());
  const toDay = eatDayKey(new Date(range.end).getTime());
  const report = await siteVisitsReport(fromDay, toDay, 20).catch(() => null);

  const days = report ? everyDay(report) : [];
  const perVisit = report && report.visits > 0 ? (report.views / report.visits).toFixed(1) : null;
  const topSource = report?.sources[0] ? sourceLabel(report.sources[0]) : null;

  return (
    <>
      <AdminPageHead
        title="Traffic"
        sw="Watembeleaji"
        actions={<DateTimeRangeFilter rank="dense" defaultPreset="28d" presetIds={["today", "yesterday", "7d", "28d", "30d", "mtd", "qtd"]} />}
      />

      <AdminBody>
        <KpiGrid cols="4">
          <AdminKpi label="Visits" sw="Matembeleo" value={report ? formatNumber(report.visits) : ""} unavailable={report === null} delta={range.label} spark={false} />
          <AdminKpi label="Page views" sw="Kurasa zilizofunguliwa" value={report ? formatNumber(report.views) : ""} unavailable={report === null} delta={range.label} spark={false} />
          <AdminKpi label="Pages per visit" sw="Kurasa kwa tembeleo" value={perVisit ?? "—"} unavailable={report === null} spark={false} />
          <AdminKpi label="Top source" sw="Chanzo kikuu" value={topSource ?? "—"} unavailable={report === null} spark={false} />
        </KpiGrid>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AdminCard title="Visits per day" sw="Matembeleo kwa siku">
            {report === null ? <AdminLoadError what="visits" /> : (
              <AdminAreaChart series={days.map((d, i) => ({ x: i, y: d.visits }))} xLabels={days.map((d) => d.day.slice(5))} height={200} yLabel="Visits" />
            )}
          </AdminCard>
          <AdminCard title="Page views per day" sw="Kurasa kwa siku">
            {report === null ? <AdminLoadError what="page views" /> : (
              <AdminAreaChart series={days.map((d, i) => ({ x: i, y: d.views }))} xLabels={days.map((d) => d.day.slice(5))} height={200} yLabel="Page views" />
            )}
          </AdminCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AdminCard title="Top pages" sw="Kurasa zinazoongoza">
            {report === null ? <AdminLoadError what="top pages" /> : report.pages.length === 0 ? (
              <p className="text-body-sm text-text-muted">No visits in this window.</p>
            ) : (
              <AdminBarList
                rows={report.pages.map((p) => ({
                  label: p.path === OTHER_PATH ? "Other pages" : p.path,
                  value: p.views,
                  title: `${p.path} · ${formatNumber(p.views)} views · ${formatNumber(p.entries)} arrivals`,
                }))}
              />
            )}
          </AdminCard>

          <AdminCard title="Where visits came from" sw="Vyanzo vya matembeleo">
            <ScrollX label="Where visits came from" className="-mx-4 px-4">
              <table className="admin-tbl min-w-[480px]">
                <thead>
                  <tr>
                    <th className="text-left">Source</th>
                    <th className="text-left">Campaign</th>
                    <th className="text-right">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {report === null && <tr><td colSpan={3} className="py-3"><AdminLoadError what="sources" /></td></tr>}
                  {(report?.sources ?? []).map((s) => (
                    <tr key={`${s.referrer}|${s.source}|${s.medium}|${s.campaign}`}>
                      <td className="font-medium text-text whitespace-nowrap">{sourceLabel(s)}</td>
                      <td className="text-text-secondary">{campaignLabel(s)}</td>
                      <td className="font-mono tabular text-right text-text-secondary">{formatNumber(s.visits)}</td>
                    </tr>
                  ))}
                  {report !== null && report.sources.length === 0 && (
                    <AdminTableEmpty colSpan={3} kind="admin" title="No visits yet" body="No visits arrived in this window." />
                  )}
                </tbody>
              </table>
            </ScrollX>
          </AdminCard>
        </div>

        <AdminCard title="What is counted" sw="Kinachohesabiwa">
          <p className="text-body-sm text-text-muted">
            Counted by our own servers for every visitor, with no cookie and no identifier, so no consent is needed. A visit is
            an arrival on the site (a reload is a new one); a page view is one page opened. Unique visitors are not counted
            here, because that would need a per-person key: they are in Google Analytics, for visitors who allowed it.
            Crawlers, link previews and automation are excluded, staff and tokened pages are never counted, and days are EAT.
            Counts are kept 400 days.
          </p>
        </AdminCard>
      </AdminBody>
    </>
  );
}
