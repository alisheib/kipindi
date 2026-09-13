import { AdminPageHead, AdminCard, AdminKpi, AdminFunnel, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBarList, AdminMeter, AdminAreaChart } from "@/components/admin/admin-charts";
import { db } from "@/lib/server/store";
import { kycFunnel, userStatusCounts } from "@/lib/server/analytics";
import { AccountStatusBadge, presentedAccountStatus } from "@/components/admin/status-badge";
import { approvedEver } from "@/lib/kyc-approval";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

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
  // A-5: track each read's failure so a failed query shows an explicit
  // "couldn't load" card rather than a fabricated all-zero cohort breakdown.
  let usersFailed = false;
  const allUsers = await Promise.resolve(db.user.list()).catch(() => { usersFailed = true; return [] as Awaited<ReturnType<typeof db.user.list>>; });
  const months = bucketByMonth(allUsers);
  const regions = bucketByRegion(allUsers);
  const ageBuckets = bucketByAge(allUsers);
  let statusFailed = false;
  const rawStatus = await userStatusCounts().catch(() => { statusFailed = true; return {} as Record<string, number>; });
  /**
   * ⛔ `PENDING_KYC` IS FOLDED INTO ACTIVE, HERE AND ONLY FOR PRESENTATION — 2026-09-13.
   * It was written at registration, gated nothing, and from 2026-09-13 new accounts are created
   * ACTIVE and the migration normalises the rest. A straggler still counted apart would put a
   * "pending" population on a cohort screen that no longer exists as a state. The fold is
   * `presentedAccountStatus` — the SAME function the chip and the roster filter use — so this
   * card, the roster and the player detail cannot disagree about what an account is.
   * `userStatusCounts()` keeps returning the stored column untouched: the data layer does not
   * relabel data, the screen does.
   */
  const status: Record<string, number> = {};
  for (const [s, c] of Object.entries(rawStatus)) {
    const k = presentedAccountStatus(s);
    status[k] = (status[k] ?? 0) + c;
  }
  const total = Object.values(status).reduce((s, c) => s + c, 0);
  let kycFailed = false;
  const kyc = await kycFunnel().catch(() => { kycFailed = true; return { registered: 0, started: 0, pending: 0, approved: 0 }; });

  /**
   * ⭐ "KYC APPROVED" — THE TILE THAT REPLACED "Pending KYC · needs follow-up" (2026-09-13).
   *
   * The old tile counted `User.status === "PENDING_KYC"` and captioned it "needs follow-up". Both
   * halves became false together: the status gated nothing, and under the 2026-09-13 ladder an
   * unverified player is not behind on anything — depositing and playing are open, and identity is
   * asked at withdrawal. So the tile now states something TRUE and useful to a growth reader: how
   * many accounts have been approved at least once.
   * ⛔ `approvedEver` — the withdrawal gate's own predicate (src/lib/kyc-approval.ts), over the newest
   * submission per user (`listStageFacts`, ordered exactly as `db.kyc.findByUserId`). The health
   * meter below reads the SAME count, so one label never carries two numbers on this page.
   * ⚠️ It is NOT the funnel's "APPROVED" step, which is `kycFunnel()`'s CURRENT status: a once-
   * approved player under re-verification is in this count and not in that step. Different words,
   * different questions.
   * ⛔ NO MONEY ON THIS PAGE. /admin/players/cohorts is the `growth` domain and GROWTH reads
   * `money.figures` as none (roles.ts), so "Held for unverified" belongs on /admin/finance, not here.
   * ⛔ `listStageFacts`, never `db.kyc.list()` — that joins every base64 document image.
   */
  let factsFailed = false;
  let stageFacts: Awaited<ReturnType<typeof db.kyc.listStageFacts>> = [];
  try { stageFacts = await db.kyc.listStageFacts(); } catch { factsFailed = true; }
  const approvedUserIds = new Set<string>();
  for (const f of stageFacts) if (approvedEver(f)) approvedUserIds.add(f.userId);
  const approvedCount = allUsers.reduce((n, u) => n + (approvedUserIds.has(u.id) ? 1 : 0), 0);
  const approvedUnavailable = usersFailed || factsFailed;
  const approvedPct = allUsers.length === 0 ? 0 : Math.round((approvedCount / allUsers.length) * 100);

  return (
    <>
      <AdminPageHead title="Cohorts" sw="Vikundi" />

      <AdminBody>
        {/* Headline KPIs — cumulative registrations feed the A8 spark. */}
        <KpiGrid>
          <AdminKpi label="Total players" sw="Wachezaji"      value={statusFailed ? "" : total.toLocaleString()} unavailable={statusFailed} series={usersFailed ? undefined : cumulativeSeries(months)} />
          <AdminKpi label="Active"        sw="Hai"             value={statusFailed ? "" : (status.ACTIVE ?? 0).toLocaleString()} unavailable={statusFailed} deltaDir="up" delta={`${total === 0 ? 0 : Math.round(((status.ACTIVE ?? 0) / total) * 100)}%`} />
          {/* ⛔ No `sw`: there is no shipped Swahili for this label and the lexicon forbids
              inventing one. ⛔ `deltaDir="flat"`: a share is context, not a movement. */}
          <AdminKpi
            label="KYC approved"
            value={approvedUnavailable ? "" : approvedCount.toLocaleString()}
            unavailable={approvedUnavailable}
            delta={approvedUnavailable ? undefined : `${approvedPct}% · ever approved`}
            deltaDir="flat"
          />
          <AdminKpi label="Self-excluded" sw="Wamejizuia"      value={statusFailed ? "" : (status.SELF_EXCLUDED ?? 0).toLocaleString()} unavailable={statusFailed} delta="active roster" />
        </KpiGrid>

        {/* Cohort health meters (A8) — value-vs-cap gauges, brand fill. */}
        <AdminCard title="Cohort health" sw="Afya ya kundi">
          {statusFailed || approvedUnavailable ? (
            <AdminLoadError what="cohort-health figures" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <AdminMeter label="Active rate" value={status.ACTIVE ?? 0} cap={total} thresholdPct={0} format={(n) => n.toLocaleString()} />
              {/* ⭐ The SAME approved-ever count as the KPI above (2026-09-13) — it used to read the
                  funnel's current-status count under the identical label. */}
              <AdminMeter label="KYC approved" value={approvedCount} cap={Math.max(allUsers.length, 1)} thresholdPct={0} format={(n) => n.toLocaleString()} />
            </div>
          )}
        </AdminCard>

        {/* KYC funnel — repeat from compliance for cohort context */}
        <AdminCard title="KYC funnel" sw="Hatua za uthibitisho">
          {kycFailed ? (
            <AdminLoadError what="the KYC funnel" />
          ) : (
            <AdminFunnel
              steps={[
                { label: "REGISTERED", value: kyc.registered.toLocaleString() },
                { label: "STARTED",    value: kyc.started.toLocaleString() },
                { label: "PENDING",    value: kyc.pending.toLocaleString() },
                { label: "APPROVED",   value: kyc.approved.toLocaleString() },
              ]}
            />
          )}
        </AdminCard>

        {/* Status mix + region + age side-by-side — AdminBarList (A8) replaces
            the hand-rolled distribution divs; brand fill only (no gold). */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <AdminCard title="By status" sw="Hali">
            {statusFailed ? (
              <AdminLoadError what="status data" />
            ) : total === 0 ? (
              <p className="text-caption text-text-tertiary py-3 text-center">No status data.</p>
            ) : (
              /* ⛔ THE LEXICON'S CHIP, NOT A LOCAL ONE (2026-09-13). This card printed the RAW
                 column (`PENDING_KYC`, `SELF_EXCLUDED`) inside a chip whose variant came from a
                 file-local ternary that painted PENDING_KYC amber — a hand-typed variant beside a
                 status label, and a database token read by a person. `AccountStatusBadge` is the
                 roster's own chip: the lexicon's words and the dictionary's tones. */
              <AdminBarList
                rows={Object.entries(status).map(([s, c]) => ({ label: <AccountStatusBadge status={s} />, value: c }))}
              />
            )}
          </AdminCard>

          <AdminCard title="By region" sw="Mkoa">
            {usersFailed ? (
              <AdminLoadError what="region data" />
            ) : regions.length === 0 ? (
              <p className="text-caption text-text-tertiary py-3 text-center">No region data.</p>
            ) : (
              <AdminBarList rows={regions.slice(0, 8).map(({ region, count }) => ({ label: region, value: count }))} />
            )}
          </AdminCard>

          <AdminCard title="By age band" sw="Umri">
            {usersFailed ? (
              <AdminLoadError what="age data" />
            ) : (
              <AdminBarList
                rows={ageBuckets.map(({ band, count }) => ({ label: <span className="font-mono">{band}</span>, value: count }))}
              />
            )}
          </AdminCard>
        </div>

        {/* Registrations over time — AdminAreaChart (A8) replaces the hand-rolled
            vertical bars, matching the time-series idiom used on overview / finance
            / live so the whole console reads as one system. */}
        <AdminCard title="Registrations over time" sw="Kujisajili">
          {usersFailed ? (
            <AdminLoadError what="registration history" />
          ) : months.length === 0 ? (
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
      </AdminBody>
    </>
  );
}
