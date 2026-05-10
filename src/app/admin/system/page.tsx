import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { Database, ShieldCheck, KeyRound, Server } from "lucide-react";
import { SystemActions } from "./system-client";
import { db } from "@/lib/server/store";
import { verifyChain, getAuditPage } from "@/lib/server/audit";
import { smsHealthSnapshot, sms as smsClient } from "@/lib/server/sms";
import { rateLimitSnapshot } from "@/lib/server/rate-limit";
import { listMarkets } from "@/lib/server/market-service";
import { hasDatabase } from "@/lib/server/prisma";
import { dbHealth } from "@/lib/server/backup";

export const metadata = { title: "Admin · System" };
export const dynamic = "force-dynamic";

function bootstrapPhones(): string[] {
  return (process.env.ADMIN_BOOTSTRAP_PHONES ?? "")
    .split(",").map(s => s.trim()).filter(Boolean);
}

export default function AdminSystemPage() {
  const chain = verifyChain();
  const auditCount = getAuditPage({ limit: 100_000 }).length;
  const smsHealth = smsHealthSnapshot();
  const totalUsers = db.user.list().length;
  const buckets = rateLimitSnapshot();
  const liveMarkets = listMarkets({ status: "LIVE" }).length;
  const resolvedMarkets = listMarkets({ status: "RESOLVED" }).length;
  const dbBackend: "postgres" | "disk-only" = hasDatabase() ? "postgres" : "disk-only";
  const health = dbHealth();
  // Postgres health verdict — green only when we've successfully written
  // recently AND the consecutive-fail counter is zero. Failure path is
  // explicit so the operator can never confuse "no writes attempted yet"
  // with "writes are succeeding".
  const dbHealthy = dbBackend === "postgres" && !!health.lastOk && health.consecutiveFails === 0;
  const dbWaiting = dbBackend === "postgres" && !health.lastOk && !health.lastFail;
  const bootstrap = bootstrapPhones();

  return (
    <>
      <AdminPageHead title="System" sw="Mfumo" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Health KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Audit chain"   sw="Mlolongo wa ukaguzi" value={chain.valid ? "Valid" : "BROKEN"} delta={`${auditCount.toLocaleString()} entries`} deltaDir={chain.valid ? "up" : "down"} pulse={!chain.valid} />
          <AdminKpi label="Total users"   sw="Watumiaji"            value={totalUsers.toLocaleString()} />
          <AdminKpi label="Markets live"  sw="Soko hai"              value={liveMarkets.toLocaleString()} delta={`${resolvedMarkets} resolved`} />
          <AdminKpi label="SMS provider"  sw="Watoa SMS"            value={smsHealth.sent + smsHealth.failed === 0 ? "Idle" : `${(smsHealth.successRate * 100).toFixed(1)}% ok`} delta={`${smsClient.name} · ${smsHealth.sent} sent`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AdminCard title="Backup" sw="Nakala">
            <div className="flex items-start gap-2 mb-3">
              <Database size={16} className="text-royal mt-0.5 shrink-0" />
              <p className="text-caption text-text-secondary">
                The in-memory store auto-snapshots to disk on every mutation (debounced 1.5s, last 12 snapshots kept).
                Click below to force an immediate snapshot — useful before a planned restart.
              </p>
            </div>
            <SystemActions kind="backup" />
          </AdminCard>

          <AdminCard title="Audit chain integrity" sw="Mlolongo · uadilifu">
            <div className="flex items-start gap-2 mb-3">
              <ShieldCheck size={16} className="text-success mt-0.5 shrink-0" />
              <p className="text-caption text-text-secondary">
                Each audit entry is HMAC-chained to the previous one. Walking the chain from genesis to head should return
                valid; any break would indicate tampering or restoration from a non-matching backup.
              </p>
            </div>
            <SystemActions kind="verify-chain" />
          </AdminCard>
        </div>

        {/* Environment + persistence diagnostic — at-a-glance answer to
            "is Postgres wired? are bootstrap admins recognised?". This
            is what Ali needs on Railway to verify env config without
            hitting /api/diagnostic. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AdminCard title="Persistence" sw="Hifadhi · Postgres">
            <div className="flex items-start gap-2 mb-3">
              <Server
                size={16}
                className={
                  dbHealthy ? "text-success mt-0.5 shrink-0"
                  : dbWaiting ? "text-text-muted mt-0.5 shrink-0"
                  : "text-no-300 mt-0.5 shrink-0"
                }
              />
              <div className="text-caption text-text-secondary leading-relaxed">
                {dbBackend !== "postgres" ? (
                  <>
                    <strong className="text-no-300">Postgres NOT configured.</strong>{" "}
                    DATABASE_URL is missing. Set it on Railway from your
                    Postgres service → Connect → DATABASE_URL, then
                    redeploy. State is currently written to local disk
                    only — wiped on every redeploy.
                  </>
                ) : dbHealthy ? (
                  <>
                    <strong className="text-success">Postgres healthy — writes confirmed.</strong>{" "}
                    Last successful write at{" "}
                    <span className="font-mono text-text">{health.lastOk!.replace("T", " ").slice(0, 19)}</span>.
                    StoreSnapshot row is the single source of truth.
                  </>
                ) : dbWaiting ? (
                  <>
                    <strong>Postgres connected — no writes yet.</strong>{" "}
                    DATABASE_URL is set and the engine loaded, but no
                    snapshot has been written since boot. Place a bet
                    or trigger any mutation and re-load this page.
                  </>
                ) : (
                  <>
                    <strong className="text-no-300">
                      Postgres write failed ({health.consecutiveFails} consecutive).
                    </strong>{" "}
                    Last error at{" "}
                    <span className="font-mono text-text">{health.lastFail?.replace("T", " ").slice(0, 19)}</span>.
                    Most likely the StoreSnapshot table is missing —
                    confirm <code>prisma migrate deploy</code> ran during
                    deploy (start script), or apply manually with{" "}
                    <code>npx prisma migrate deploy</code>.
                  </>
                )}
              </div>
            </div>
            <div className="rounded-md border border-border bg-bg-overlay px-3 py-2 font-mono text-[11px] tabular-nums text-text-muted">
              <div className="flex justify-between"><span>Backend</span><span className="text-text">{dbBackend}</span></div>
              <div className="flex justify-between"><span>DATABASE_URL set</span><span className="text-text">{!!process.env.DATABASE_URL ? "yes" : "no"}</span></div>
              <div className="flex justify-between"><span>Last OK write</span><span className="text-text">{health.lastOk?.replace("T", " ").slice(11, 19) ?? "never"}</span></div>
              <div className="flex justify-between"><span>Last failed write</span><span className={health.lastFail ? "text-no-300" : "text-text"}>{health.lastFail?.replace("T", " ").slice(11, 19) ?? "never"}</span></div>
              <div className="flex justify-between"><span>Consecutive fails</span><span className={health.consecutiveFails > 0 ? "text-no-300" : "text-text"}>{health.consecutiveFails}</span></div>
              <div className="flex justify-between"><span>Users in store</span><span className="text-text">{totalUsers.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Audit entries</span><span className="text-text">{auditCount.toLocaleString()}</span></div>
            </div>
            {health.lastError && (
              <div className="mt-2 rounded-md border border-no-700/60 bg-no-500/10 px-3 py-2 font-mono text-[10.5px] text-no-200 leading-relaxed">
                <div className="font-bold uppercase tracking-[0.14em] text-no-300 text-[9.5px] mb-1">Last error</div>
                {health.lastError.slice(0, 280)}
              </div>
            )}
          </AdminCard>

          <AdminCard title="Bootstrap admins" sw="Wasimamizi wa kuanzishia">
            <div className="flex items-start gap-2 mb-3">
              <KeyRound size={16} className={bootstrap.length > 0 ? "text-success mt-0.5 shrink-0" : "text-warning-fg mt-0.5 shrink-0"} />
              <div className="text-caption text-text-secondary leading-relaxed">
                {bootstrap.length > 0 ? (
                  <>
                    <strong className="text-success">{bootstrap.length} phone{bootstrap.length === 1 ? "" : "s"}</strong>{" "}
                    in ADMIN_BOOTSTRAP_PHONES. Anyone signing in or
                    registering with a listed phone is auto-promoted to
                    ADMIN. Existing accounts only need to sign out and
                    sign back in for the role to take effect.
                  </>
                ) : (
                  <>
                    <strong className="text-warning-fg">ADMIN_BOOTSTRAP_PHONES is empty.</strong>{" "}
                    Set it on Railway (e.g. <code>+255777777777</code>)
                    and redeploy. Then sign out + sign back in on the
                    listed account.
                  </>
                )}
              </div>
            </div>
            {bootstrap.length > 0 && (
              <ul className="rounded-md border border-border bg-bg-overlay px-3 py-2 space-y-0.5">
                {bootstrap.map((p) => (
                  <li key={p} className="font-mono text-[11px] tabular-nums text-text">
                    {p}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-caption text-text-tertiary leading-snug">
              Non-sensitive list — these are operator phones, not credentials. Safe to display to admins.
            </p>
          </AdminCard>
        </div>

        {/* Rate-limit observability */}
        <AdminCard title="Rate limiter · live buckets" sw="Vikomo vya mara · token-bucket per (action, key)">
          {buckets.length === 0 ? (
            <p className="text-caption text-text-tertiary py-4 text-center">No active rate-limit buckets — system is idle.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-caption min-w-[480px]">
                <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                  <tr>
                    <th className="text-left py-2 pr-3">Action</th>
                    <th className="text-left py-2 pr-3">Key</th>
                    <th className="text-right py-2 pr-3">Tokens</th>
                    <th className="text-right py-2 pl-3">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.slice(0, 25).map((b, i) => (
                    <tr key={i} className="border-b border-border-subtle/40 last:border-b-0">
                      <td className="py-2 pr-3 font-mono text-text">{b.action}</td>
                      <td className="py-2 pr-3 font-mono text-text-tertiary truncate max-w-[260px]">{b.key.slice(0, 30)}</td>
                      <td className={["py-2 pr-3 font-mono tabular text-right", b.tokens === 0 ? "text-danger font-semibold" : b.tokens < 3 ? "text-warning" : "text-text"].join(" ")}>{b.tokens}</td>
                      <td className="py-2 pl-3 font-mono tabular text-right text-text-tertiary">{b.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">Production posture</p>
            <p>
              Backup → Postgres point-in-time recovery + audit log replicated synchronously across two regions.
              Audit chain → same HMAC scheme persisted as <code>prevHash</code> + <code>entryHash</code> columns;
              nightly cron re-verifies the entire chain and pages on-call if a break is detected.
              Match-feed + SMS adapters are env-switched (<code>SPORTS_API_PROVIDER</code>, <code>SMS_PROVIDER</code>);
              rate-limit buckets are in-process today and become Redis cluster in production.
            </p>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
