import { AdminPageHead, AdminCard, AdminKpi, AdminFunnel } from "@/components/admin/admin-shell";
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
  const allUsers = await db.user.list().catch(() => []);
  const months = bucketByMonth(allUsers);
  const regions = bucketByRegion(allUsers);
  const ageBuckets = bucketByAge(allUsers);
  const status = await userStatusCounts().catch(() => ({} as Record<string, number>));
  const total = Object.values(status).reduce((s, c) => s + c, 0);
  const kyc = await kycFunnel().catch(() => ({ registered: 0, started: 0, pending: 0, approved: 0 }));

  return (
    <>
      <AdminPageHead title="Cohorts" sw="Vikundi" />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Headline KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Total players" sw="Wachezaji"      value={total.toLocaleString()} />
          <AdminKpi label="Active"        sw="Hai"             value={(status.ACTIVE ?? 0).toLocaleString()} gold delta={`${total === 0 ? 0 : Math.round(((status.ACTIVE ?? 0) / total) * 100)}%`} />
          <AdminKpi label="Pending KYC"   sw="Inasubiri"       value={(status.PENDING_KYC ?? 0).toLocaleString()} delta="needs follow-up" />
          <AdminKpi label="Self-excluded" sw="Wamejizuia"      value={(status.SELF_EXCLUDED ?? 0).toLocaleString()} delta="active roster" />
        </div>

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

        {/* Status mix + region + age side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <AdminCard title="By status" sw="Hali">
            {total === 0 ? (
              <p className="text-caption text-text-tertiary py-3 text-center">No status data.</p>
            ) : (
            <div className="space-y-1.5">
              {Object.entries(status).map(([s, c]) => {
                const pct = total === 0 ? 0 : Math.round((c / total) * 100);
                return (
                  <div key={s} className="flex items-center gap-2">
                    <Chip size="sm" variant={statusVariant(s)}>{s}</Chip>
                    <div className="flex-1 h-3 bg-bg-sunken rounded-sm relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-royal/70" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                    <span className="font-mono text-caption tabular w-12 text-right">{c}</span>
                  </div>
                );
              })}
            </div>
            )}
          </AdminCard>

          <AdminCard title="By region" sw="Mkoa">
            {regions.length === 0 ? (
              <p className="text-caption text-text-tertiary py-3 text-center">No region data.</p>
            ) : (
              <div className="space-y-1.5">
                {regions.slice(0, 8).map(({ region, count }) => {
                  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                  return (
                    <div key={region} className="flex items-center gap-2 text-caption">
                      <span className="w-20 sm:w-28 truncate text-text">{region}</span>
                      <div className="flex-1 h-3 bg-bg-sunken rounded-sm relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-gold/70" style={{ width: `${Math.max(2, pct)}%` }} />
                      </div>
                      <span className="font-mono tabular w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminCard>

          <AdminCard title="By age band" sw="Umri">
            <div className="space-y-1.5">
              {ageBuckets.map(({ band, count }) => {
                const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                return (
                  <div key={band} className="flex items-center gap-2 text-caption">
                    <span className="w-12 font-mono text-text">{band}</span>
                    <div className="flex-1 h-3 bg-bg-sunken rounded-sm relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-info/70" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                    <span className="font-mono tabular w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </AdminCard>
        </div>

        {/* Registration over time */}
        <AdminCard title="Registrations over time" sw="Kujisajili">
          {months.length === 0 ? (
            <p className="text-caption text-text-tertiary py-3 text-center">No registrations yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {months.map(({ month, count }) => {
                const max = Math.max(...months.map((m) => m.count));
                const h = Math.round((count / max) * 100);
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <div className="w-full bg-bg-sunken rounded-sm relative flex-1">
                      <div className="absolute inset-x-0 bottom-0 bg-royal/80 rounded-sm" style={{ height: `${h}%` }} />
                    </div>
                    <span className="font-mono text-micro tabular text-text-tertiary">{month.slice(2)}</span>
                    <span className="font-mono text-micro tabular text-text">{count}</span>
                  </div>
                );
              })}
            </div>
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
