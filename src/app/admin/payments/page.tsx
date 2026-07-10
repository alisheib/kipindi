import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminMeter } from "@/components/admin/admin-charts";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { PaymentLogo } from "@/components/wallet/payment-logo";
import { allMnoHealth, getKillSwitches, reconcile, retryQueue } from "@/lib/server/payment-ops";
import { formatTzs, formatTzsCompact, formatDateTime } from "@/lib/utils";
import { KillSwitch } from "./kill-switch-toggle";
import { RetryControls } from "./retry-controls";

export const metadata = { title: "Admin · Payments ops" };
export const dynamic = "force-dynamic";

const MNO_HUE: Record<string, number> = { MPESA: 150, AIRTEL_MONEY: 25, HALO_PESA: 240, MIXX: 290 };
const ms = (n: number | null) => (n === null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`);
const ageLabel = (msv: number) => {
  const h = Math.floor(msv / 3_600_000);
  if (h >= 1) return `${h}h`;
  return `${Math.max(0, Math.floor(msv / 60_000))}m`;
};

export default async function PaymentsOpsPage() {
  const [health, kill, recon, queue] = await Promise.all([allMnoHealth(), getKillSwitches(), reconcile(), retryQueue()]);

  return (
    <>
      <AdminPageHead
        title="Payments operations"
        sw="Operesheni za malipo"
        period={false}
        actions={
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">MNO health · 24h window</span>
        }
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Reconciliation strip — ledger vs PSP settlement. */}
        <AdminCard>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              <I.reconcile s={14} className="text-text-tertiary" /> Reconciliation · Ulinganishaji · 24h
            </span>
            <Stat label="Matched" value={recon.matched.toLocaleString()} />
            <Stat label="Unmatched" value={recon.unmatched.toLocaleString()} tone={recon.unmatched > 0 ? "danger" : "ok"} />
            <div>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle">Drift</span>
              <p className={`font-mono text-[15px] font-bold tabular-nums ${recon.driftTzs !== 0 ? "text-danger" : "text-text"}`}>
                {recon.driftTzs === 0 ? "TZS 0" : formatTzs(recon.driftTzs)}
              </p>
            </div>
            {recon.driftTzs !== 0 && (
              <Link href={"/admin/audit?category=WALLET" as Route} className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-claret-300 hover:underline">
                <I.search s={12} /> Investigate
              </Link>
            )}
          </div>
          <p className="mt-2 font-mono text-[10px] text-text-tertiary">A confirmed movement reconciles when it carries the PSP correlation ref. Drift must be TZS 0.</p>
        </AdminCard>

        {/* Per-MNO health cards. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {health.map((h) => {
            const k = kill[h.id] ?? { deposits: false, withdrawals: false };
            const anyPaused = k.deposits || k.withdrawals;
            const pip = h.successRate === null ? "neutral" : h.successRate >= 98 ? "yes" : h.successRate >= 95 ? "warning" : "no";
            return (
              <AdminCard key={h.id} className={anyPaused ? "border-claret-edge" : ""}>
                {/* Header — claret-tinted when a flow is paused. */}
                <div className="flex items-center gap-2.5">
                  <PaymentLogo id={h.id} name={h.label} hue={MNO_HUE[h.id] ?? 220} size={34} />
                  <div className="min-w-0">
                    <p className="font-display text-[14px] font-bold text-text leading-tight">{h.label}</p>
                    {anyPaused && k.at ? (
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-claret-300">
                        PAUSED{k.by ? ` BY ${k.by.slice(0, 10)}` : ""} · {formatDateTime(k.at)}
                      </p>
                    ) : (
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">Live · malipo</p>
                    )}
                  </div>
                  <div className="ml-auto text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: pip === "yes" ? "var(--yes-400)" : pip === "warning" ? "var(--warning-fg)" : pip === "no" ? "var(--no-400)" : "var(--text-subtle)" }} />
                      <span className="font-mono text-[20px] font-bold tabular-nums leading-none" style={{ color: pip === "no" ? "var(--no-300)" : "var(--text)" }}>
                        {h.successRate === null ? "—" : `${h.successRate.toFixed(1)}%`}
                      </span>
                    </div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle">success · 24h</p>
                  </div>
                </div>

                {/* Latency + last failure. */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-border-subtle pt-2.5 text-[11px]">
                  <Metric label="p50" value={ms(h.p50Ms)} />
                  <Metric label="p95" value={ms(h.p95Ms)} />
                  <Metric label="txns" value={`${h.confirmed}✓ ${h.failed}✕`} />
                </div>
                {h.lastFailure && (
                  <p className="mt-1.5 font-mono text-[10px] text-no-300 truncate" title={h.lastFailure.reason}>
                    last fail: {h.lastFailure.reason} · {formatDateTime(h.lastFailure.at)}
                  </p>
                )}

                {/* Deposit / withdraw split meters. */}
                <div className="mt-3 space-y-2">
                  <AdminMeter label="Deposits (24h)" value={h.deposits.volume} cap={Math.max(h.deposits.volume, h.withdrawals.volume, 1)} thresholdPct={0} format={(n) => formatTzsCompact(n)} />
                  <AdminMeter label="Withdrawals (24h)" value={h.withdrawals.volume} cap={Math.max(h.deposits.volume, h.withdrawals.volume, 1)} thresholdPct={0} format={(n) => formatTzsCompact(n)} />
                </div>

                {/* Kill-switches. */}
                <div className="mt-3 border-t border-dashed border-border-subtle pt-2.5">
                  <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle">Kill-switch · Zima</p>
                  <KillSwitch provider={h.id} label={h.label} deposits={k.deposits} withdrawals={k.withdrawals} />
                </div>
              </AdminCard>
            );
          })}
        </div>

        {/* Retry queue. */}
        <AdminCard title="Retry queue · Foleni ya majaribio" sw="Failed deposits & withdrawals" padding={queue.length ? "p-0" : "p-4"}>
          {queue.length === 0 ? (
            <div className="flex items-center gap-2.5 text-caption text-text-secondary">
              <I.checkCircle s={16} className="text-yes-300" /> No failed transactions — the rails are clear.
            </div>
          ) : (
            <ScrollX label="Retry queue">
              <table className="admin-tbl min-w-[640px]">
                <thead>
                  <tr>
                    <th className="text-left">Ref</th>
                    <th className="text-left">MNO</th>
                    <th className="text-left">Type</th>
                    <th className="text-right">Amount</th>
                    <th className="text-left">Reason</th>
                    <th className="text-right">Age</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((r) => (
                    <tr key={r.id} className={r.ageMs > 3_600_000 ? "border-l-2 border-no-500" : ""}>
                      <td className="font-mono text-text-subtle">{r.id.slice(0, 14)}…</td>
                      <td className="font-mono">{r.provider}</td>
                      <td><Chip size="sm" variant={r.type === "DEPOSIT" ? "info" : "neutral"}>{r.type}</Chip></td>
                      <td className="font-mono tabular text-right">{formatTzs(r.amount)}</td>
                      <td className="text-no-300 text-[12px] truncate max-w-[220px]" title={r.reason}>{r.reason}</td>
                      <td className={`font-mono tabular text-right ${r.ageMs > 3_600_000 ? "text-no-300" : "text-text-tertiary"}`}>{ageLabel(r.ageMs)}</td>
                      <td className="text-right"><RetryControls txnId={r.id} type={r.type} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg/15">
          <p className="text-caption text-text-secondary">
            <span className="text-text font-bold">Live telemetry.</span> Success rate, latency, failures and reconciliation are computed from the real
            transaction record over the last 24h — no data is fabricated. Latency percentiles come only from movements that recorded a settlement time.
            A per-MNO settlement-file feed will replace the ref-based reconciliation when the aggregator contract is signed.
          </p>
        </AdminCard>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  return (
    <div>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle">{label}</span>
      <p className={`font-mono text-[15px] font-bold tabular-nums ${tone === "danger" ? "text-danger" : "text-text"}`}>{value}</p>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle">{label}</span>
      <p className="font-mono tabular-nums text-text">{value}</p>
    </div>
  );
}
