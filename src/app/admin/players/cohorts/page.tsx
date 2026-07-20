import { AdminPageHead, AdminCard, AdminKpi, AdminFunnel } from "@/components/admin/admin-shell";
import { AdminBarList, AdminMeter, AdminAreaChart } from "@/components/admin/admin-charts";
import { db } from "@/lib/server/store";
import { kycFunnel, userStatusCounts } from "@/lib/server/analytics";
import { Chip } from "@/components/ui/chip";

export const metadata = { title: "Admin · Player cohorts" };
export const dynamic = "force-dynamic";

function bucketByMonth(all: Awaited<ReturnType<typeof db.user.list>>) {
  const map = new Map<string, number>();
  for (const u of all) {
    const m = u.createdAt.slice(0, 7); // YYYY-MM
    map.set(m, (map.get(m) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

/** Cumulative running total of monthly registrations — the growth curve fed
 *  into the "Total players" KPI spark (A8). */
function cumulativeSeries(months: Array<{ month: string; count: number }>): number[] {
  let run = 0;
  return months.map(({ count }) => (run += count));
}

function bucketByRegion(all: Awaited<ReturnType<typeof db.user.list>>) {
  const map = new Map<string, number>();
  for (const u of all) {
    const r = u.region ?? "Unknown";
    map.set(r, (map.get(r) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([region, count]) => ({ region, count }));
}

function bucketByAge(all: Awaited<ReturnType<typeof db.user.list>>) {
  const now = new Date();
  const buckets: Record<string, number> = { "18-24": 0, "25-34": 0, "35-44": 0, "45+": 0, unknown: 0 };
  for (const u of all) {
    if (!u.dob) { buckets.unknown++; continue; }
    const age = now.getFullYear() - new Date(u.dob).getFullYear();
    if (age < 25) buckets["18-24"]++;
    else if (age < 35) buckets["25-34"]++;
    else if (age < 45) buckets["35-44"]++;
    else buckets["45+"]++;
  }
  return Object.entries(buckets).map(([band, count]) => ({ band, count }));
}

export default async function AdminCohortsPage() {
  // Guard like every sibling admin page (players/retention/privacy) — a transient
  // store error should degrade to empty cards, not 500 the whole cohorts screen.
  // `db.user.list()` is a Promise in prod (Prisma) but a sync array in the
  // in-memory dev store — Promise.resolve() normalises both so `.catch` is safe.
  const allUsers = await Promise.resolve(db.user.list()).catch(() => [] as Awaited<ReturnType<typeof db.user.list>>);
  const months = bucketByMonth(allUsers);
  const regions = bucketByRegion(allUsers);
  const ageBuckets = bucketByAge(allUsers);
  const status = await userStatusCounts().catch(() => ({} as Record<string, number>));
  const total = Object.values(status).reduce((s, c) => s + c, 0);
  const kyc = await kycFunnel().catch(() => ({ registered: 0, started: 0, pending: 0, approved: 0 }));

  return (
    <>
      <AdminPageHead title="Cohorts" sw="Vikundi" period={false} />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Headline KPIs — cumulative registrations feed the A8 spark. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Total players" sw="Wachezaji"      value={total.toLocaleString()} series={cumulativeSeries(months)} />
          <AdminKpi label="Active"        sw="Hai"             value={(status.ACTIVE ?? 0).toLocaleString()} deltaDir="up" delta={`${total === 0 ? 0 : Math.round(((status.ACTIVE ?? 0) / total) * 100)}%`} />
          <AdminKpi label="Pending KYC"   sw="Inasubiri"       value={(status.PENDING_KYC ?? 0).toLocaleString()} delta="needs follow-up" />
          <AdminKpi label="Self-excluded" sw="Wamejizuia"      value={(status.SELF_EXCLUDED ?? 0).toLocaleString()} delta="active roster" />
        </div>

        {/* Cohort health meters (A8) — value-vs-cap gauges, brand fill. */}
        <AdminCard title="Cohort health" sw="Afya ya kundi">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <AdminMeter label="Active rate" value={status.ACTIVE ?? 0} cap={total} thresholdPct={0} format={(n) => n.toLocaleString()} />
            <AdminMeter label="KYC approved" value={kyc.approved} cap={Math.max(kyc.registered, 1)} thresholdPct={0} format={(n) => n.toLocaleString()} />
          </div>
        </AdminCard>

        {/* KYC funnel — repeat from compliance for cohort context */}
        <AdminCard title="KYC funnel" sw="Hatua za uthibitisho">
          <AdminFunnel
            steps={[
              { label: "REGISTERED", value: kyc.registered.toLocaleString() },
              { label: "STARTED",    value: kyc.started.toLocaleString() },
              { label: "PENDING",    value: kyc.pending.toLocaleString() },
              { label: "APPROVED",   value: kyc.approved.toLocaleString() },
            ]}
          />
        </AdminCard>

        {/* Status mix + region + age side-by-side — AdminBarList (A8) replaces
            the hand-rolled distribution divs; brand fill only (no gold). */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <AdminCard title="By status" sw="Hali">
            {total === 0 ? (
              <p className="text-caption text-text-tertiary py-3 text-center">No status data.</p>
            ) : (
              <AdminBarList
                rows={Object.entries(status).map(([s, c]) => ({ label: <Chip size="sm" variant={statusVariant(s)}>{s}</Chip>, value: c }))}
              />
            )}
          </AdminCard>

          <AdminCard title="By region" sw="Mkoa">
            {regions.length === 0 ? (
              <p className="text-caption text-text-tertiary py-3 text-center">No region data.</p>
            ) : (
              <AdminBarList rows={regions.slice(0, 8).map(({ region, count }) => ({ label: region, value: count }))} />
            )}
          </AdminCard>

          <AdminCard title="By age band" sw="Umri">
            <AdminBarList
              rows={ageBuckets.map(({ band, count }) => ({ label: <span className="font-mono">{band}</span>, value: count }))}
            />
          </AdminCard>
        </div>

        {/* Registrations over time — AdminAreaChart (A8) replaces the hand-rolled
            vertical bars, matching the time-series idiom used on overview / finance
            / live so the whole console reads as one system. */}
        <AdminCard title="Registrations over time" sw="Kujisajili">
          {months.length === 0 ? (
            <p className="text-caption text-text-tertiary py-3 text-center">No registrations yet.</p>
          ) : (
            <AdminAreaChart
              series={months.map((m, i) => ({ x: i, y: m.count }))}
              xLabels={months.map((m) => m.month.slice(2))}
              height={160}
              yLabel="Registrations"
            />
          )}
        </AdminCard>
      </div>
    </>
  );
}

function statusVariant(s: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (s === "ACTIVE") return "success";
  if (s === "PENDING_KYC") return "warning";
  if (s === "SUSPENDED" || s === "SELF_EXCLUDED") return "danger";
  if (s === "COOLED_OFF") return "warning";
  return "neutral";
}
