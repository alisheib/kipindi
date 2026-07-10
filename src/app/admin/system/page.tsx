import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { I } from "@/components/ui/glyphs";
import { SystemActions, SupportConfigForm, TimezoneForm, MaintenanceModeForm } from "./system-client";
import { getSupportConfig } from "@/lib/support-config";
import { db } from "@/lib/server/store";
import { verifyChain, getAuditPage } from "@/lib/server/audit";
import { smsHealthSnapshot, sms as smsClient } from "@/lib/server/sms";
import { rateLimitSnapshot } from "@/lib/server/rate-limit";
import { listMarkets } from "@/lib/server/market-service";
import { hasDatabase, pingDatabase } from "@/lib/server/prisma";
import { formatTime } from "@/lib/utils";
import { getPlatformConfig } from "@/lib/server/platform-config";

export const metadata = { title: "Admin · System" };
export const dynamic = "force-dynamic";

function bootstrapPhones(): string[] {
  return (process.env.ADMIN_BOOTSTRAP_PHONES ?? "")
    .split(",").map(s => s.trim()).filter(Boolean);
}

export default async function AdminSystemPage() {
  const platform = await getPlatformConfig().catch(() => ({ timezone: "Africa/Dar_es_Salaam" } as Awaited<ReturnType<typeof getPlatformConfig>>));
  const chain = verifyChain();
  const auditCount = getAuditPage({ limit: 100_000 }).length;
  const smsHealth = smsHealthSnapshot();
  let totalUsers = 0;
  try { totalUsers = (await db.user.list()).length; } catch { /* graceful */ }
  const buckets = rateLimitSnapshot();
  const liveMarkets = await listMarkets({ status: "LIVE" }).then(l => l.length).catch(() => 0);
  const resolvedMarkets = await listMarkets({ status: "RESOLVED" }).then(l => l.length).catch(() => 0);
  const dbBackend: "postgres" | "disk-only" = hasDatabase() ? "postgres" : "disk-only";
  const health = { lastOk: null as string | null, lastFail: null as string | null, lastError: null as string | null, consecutiveFails: 0 };
  const ping = await pingDatabase().catch(() => ({ envSet: false, reachable: false, tableExists: false, latencyMs: null, error: "ping failed", hostHint: null }));
  // Combined verdict for the green/grey/red badge
  const dbConnected = ping.reachable && ping.tableExists;
  const dbWaiting = dbBackend === "postgres" && ping.reachable && !ping.tableExists;
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

        {/* Maintenance mode — global pause of new bets + deposits (§9.3 #1) */}
        <AdminCard
          title="Maintenance mode"
          sw="Hali ya matengenezo"
          className={platform.maintenanceMode ? "border-claret-edge bg-claret-soft/30" : undefined}
        >
          <p className="text-caption text-text-secondary mb-3">
            A global switch to pause <strong>new bets and new deposits</strong> during a deploy or incident.
            Withdrawals and cash-outs stay open so players can always reach their money.
            Takes effect <strong>immediately</strong> — no redeploy — and every flip is written to the audit chain.
          </p>
          <MaintenanceModeForm enabled={platform.maintenanceMode ?? false} note={platform.maintenanceNote ?? ""} />
        </AdminCard>

        {/* Platform timezone */}
        <AdminCard title="Platform timezone" sw="Saa za jukwaa">
          <p className="text-caption text-text-secondary mb-3">
            All player-visible times, AI sentinel prompts, and poll generation use this timezone.
            Change it here and it changes <strong>everywhere instantly</strong> — no redeploy needed.
            Uses IANA format (e.g. Africa/Dar_es_Salaam, Asia/Dubai, Europe/London).
          </p>
          <TimezoneForm current={platform.timezone} />
        </AdminCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AdminCard title="Audit chain integrity" sw="Mlolongo · uadilifu">
            <div className="flex items-start gap-2 mb-3">
              <I.shieldcheck s={16} />
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
              <I.server
                size={16}
                className={
                  dbConnected ? "text-success mt-0.5 shrink-0"
                  : dbWaiting ? "text-text-muted mt-0.5 shrink-0"
                  : "text-no-300 mt-0.5 shrink-0"
                }
              />
              <div className="text-caption text-text-secondary leading-relaxed">
                {!ping.envSet ? (
                  <>
                    <strong className="text-no-300">DATABASE_URL not set.</strong>{" "}
                    Add a variable on the App service → Variables tab →{" "}
                    <code>DATABASE_URL</code> = <code>{"${{ Postgres.DATABASE_URL }}"}</code>{" "}
                    (the Postgres-service reference syntax). Then redeploy.
                  </>
                ) : !ping.reachable ? (
                  <>
                    <strong className="text-no-300">Cannot reach Postgres.</strong>{" "}
                    Connection failed at <span className="font-mono text-text">{ping.hostHint ?? "—"}</span>.
                    Check the URL is correct (host, port, password) and that
                    the Postgres service is healthy.
                  </>
                ) : !ping.tableExists ? (
                  <>
                    <strong className="text-warning-fg">Connected, but schema tables are missing.</strong>{" "}
                    The connection works ({ping.latencyMs}ms to{" "}
                    <span className="font-mono text-text">{ping.hostHint}</span>),
                    but migrations haven't run yet. Force a redeploy so
                    the start script's <code>prisma migrate deploy</code>{" "}
                    executes, or apply manually from your laptop:{" "}
                    <code>DATABASE_URL=&lt;url&gt; npx prisma migrate deploy</code>.
                  </>
                ) : (
                  <>
                    <strong className="text-success">Postgres connected and ready.</strong>{" "}
                    Reachable in <span className="font-mono text-text">{ping.latencyMs}ms</span>{" "}
                    at <span className="font-mono text-text">{ping.hostHint}</span>.
                    Schema tables migrated.
                    {health.lastOk && (
                      <>
                        {" "}Last write{" "}
                        <span className="font-mono text-text">{formatTime(health.lastOk)}</span>.
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="rounded-md border border-border bg-bg-overlay px-3 py-2 font-mono text-[11px] tabular-nums text-text-muted">
              <div className="flex justify-between"><span>DATABASE_URL set</span><span className={ping.envSet ? "text-success" : "text-no-300"}>{ping.envSet ? "yes" : "no"}</span></div>
              <div className="flex justify-between"><span>Reachable</span><span className={ping.reachable ? "text-success" : "text-no-300"}>{ping.reachable ? `yes (${ping.latencyMs}ms)` : "no"}</span></div>
              <div className="flex justify-between"><span>Table exists</span><span className={ping.tableExists ? "text-success" : "text-no-300"}>{ping.tableExists ? "yes" : "no"}</span></div>
              <div className="flex justify-between"><span>Host</span><span className="text-text">{ping.hostHint ?? "—"}</span></div>
              <div className="flex justify-between"><span>Last OK write</span><span className="text-text">{health.lastOk ? formatTime(health.lastOk) : "never"}</span></div>
              <div className="flex justify-between"><span>Last failed write</span><span className={health.lastFail ? "text-no-300" : "text-text"}>{health.lastFail ? formatTime(health.lastFail) : "never"}</span></div>
              <div className="flex justify-between"><span>Consecutive fails</span><span className={health.consecutiveFails > 0 ? "text-no-300" : "text-text"}>{health.consecutiveFails}</span></div>
              <div className="flex justify-between"><span>Users in store</span><span className="text-text">{totalUsers.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Audit entries</span><span className="text-text">{auditCount.toLocaleString()}</span></div>
            </div>
            {(ping.error || health.lastError) && (
              <div className="mt-2 rounded-md border border-no-700/60 bg-no-500/10 px-3 py-2 font-mono text-[10.5px] text-no-200 leading-relaxed">
                <div className="font-bold uppercase tracking-[0.14em] text-no-300 text-[9.5px] mb-1">Last error</div>
                {(ping.error ?? health.lastError ?? "").slice(0, 280)}
              </div>
            )}
          </AdminCard>

          <AdminCard title="Bootstrap admins" sw="Wasimamizi wa kuanzishia">
            <div className="flex items-start gap-2 mb-3">
              <I.keyRound size={16} className={bootstrap.length > 0 ? "text-success mt-0.5 shrink-0" : "text-warning-fg mt-0.5 shrink-0"} />
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
              <table className="admin-tbl min-w-[480px]">
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

        <AdminCard
          title="Support contacts"
          sw="Mawasiliano ya msaada"
          action={<span className="font-mono text-[10px] text-text-subtle">{getSupportConfig().email}</span>}
        >
          <p className="text-[12px] text-text-subtle mb-3">
            Changes here propagate to every page that shows support info: help, chatbot, login, register, legal, KYC, account, forgot-password, footer, reality-check.
          </p>
          <SupportConfigForm config={getSupportConfig()} />
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
