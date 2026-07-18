import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { ScrollX } from "@/components/ui/scroll-x";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { listSettlementQueue, getSettlementHealth } from "@/lib/server/market-service";
import { formatTzs, formatDateTime } from "@/lib/utils";
import { SettleButton } from "./settle-button";
import Link from "next/link";
import { ControlledElsewhere } from "@/components/admin/controlled-elsewhere";

export const metadata = { title: "Admin · Settlement" };
export const dynamic = "force-dynamic";

export default async function AdminSettlementPage() {
  const [queue, health] = await Promise.all([listSettlementQueue(), getSettlementHealth()]);
  const ready = queue.filter((r) => r.state === "READY");
  const readyTzs = ready.reduce((s, r) => s + r.pool, 0);

  return (
    <>
      <AdminPageHead title="Settlement" sw="Malipo" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4">

        {/* The single most important fact on this page: nothing pays itself. */}
        <div
          className={
            health.autoSettle
              ? "flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg/25 px-3 py-2.5 text-[12.5px] text-warning-fg"
              : "flex items-start gap-2 rounded-md border border-brand-500 bg-brand-500/10 px-3 py-2.5 text-[12.5px] text-text-muted"
          }
        >
          <I.alertCircle size={15} className="mt-[1px] shrink-0" />
          {health.autoSettle ? (
            <p>
              <strong>Automatic payout is ON.</strong> The lifecycle sweep pays markets on its own,
              once every 60s. Markets should not sit in &ldquo;Ready&rdquo; for long — if they do,
              the sweep has stopped and players are going unpaid.
            </p>
          ) : (
            <p>
              <strong>Automatic payout is PAUSED — every payout here is manual.</strong> Nothing pays
              a market by itself until the payment aggregator (Selcom / Azampay) is integrated. A
              resolved market holds its pool until an officer presses <em>Settle now</em>. The
              objection window and the objection freeze still apply: this button cannot pay a market
              early, cannot pay one under dispute, and cannot pay one twice.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi
            label="Ready to settle" sw="Tayari kulipwa"
            value={String(ready.length)} delta={formatTzs(readyTzs)}
            deltaDir={ready.length > 0 ? "up" : undefined}
            pulse={ready.length > 0}
          />
          <AdminKpi
            label="Awaiting window" sw="Inasubiri dirisha"
            value={String(health.awaiting.count)} delta={formatTzs(health.awaiting.tzs)}
          />
          <AdminKpi
            label="Frozen by objection" sw="Imesimamishwa"
            value={String(health.frozenByObjection.count)} delta={formatTzs(health.frozenByObjection.tzs)}
          />
          <AdminKpi
            label="Auto payout" sw="Malipo ya kiotomatiki"
            value={health.autoSettle ? "ON" : "PAUSED"}
            delta={health.autoSettle ? "sweep is driving payouts" : "manual until gateway"}
            deltaDir={health.autoSettle ? "up" : "down"}
          />
        </div>
        <ControlledElsewhere
          what="Automatic settlement" sw="Malipo ya kiotomatiki"
          where="Payments ops" href="/admin/payments"
        />

        <AdminCard title="Payout queue" sw="Foleni ya malipo" padding="p-0">
          {queue.length === 0 ? (
            <div className="p-6">
              <EmptyState
                kind="admin"
                title="Nothing awaiting settlement"
                body="Every resolved market has been paid. A market appears here once two officers have sealed its verdict — its money waits in the pool until you settle it."
              />
            </div>
          ) : (
            <ScrollX label="Payout queue">
              <table className="admin-tbl">
                <thead>
                  <tr>
                    <th className="text-left">State</th>
                    <th className="text-left min-w-[200px]">Market</th>
                    <th className="text-left">Verdict</th>
                    <th className="text-right">Pool held</th>
                    <th className="text-right">Positions</th>
                    <th className="text-left">Window closes</th>
                    <th className="text-left min-w-[130px]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.state === "READY" ? (
                          <Chip size="sm" variant="success">Ready</Chip>
                        ) : r.state === "FROZEN" ? (
                          <Chip size="sm" variant="claret">Objection</Chip>
                        ) : (
                          <Chip size="sm" variant="pending">Window open</Chip>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/admin/resolver/${r.id}` as never}
                          className="text-text hover:text-brand-300 underline underline-offset-2"
                        >
                          {r.titleEn}
                        </Link>
                      </td>
                      <td className="font-mono text-[11px] text-text-muted">{r.outcome ?? "—"}</td>
                      <td className="text-right font-mono tabular-nums text-text">{formatTzs(r.pool)}</td>
                      <td className="text-right font-mono tabular-nums text-text-muted">{r.positions}</td>
                      <td className="font-mono text-[10.5px] text-text-subtle whitespace-nowrap">
                        {r.objectionsClosedAt ? formatDateTime(r.objectionsClosedAt) : "—"}
                      </td>
                      <td>
                        {r.state === "READY" ? (
                          <SettleButton
                            marketId={r.id}
                            title={r.titleEn}
                            pool={r.pool}
                            positions={r.positions}
                            outcome={r.outcome}
                          />
                        ) : r.state === "FROZEN" ? (
                          <Link
                            href={"/admin/objections" as never}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-warning-border bg-warning-bg/20 px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-warning-fg hover:bg-warning-bg/40 transition-colors brand-focus"
                          >
                            Rule on it
                          </Link>
                        ) : (
                          <span className="font-mono text-[10.5px] text-text-subtle">
                            Too early — window open
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
        </AdminCard>

        <p className="text-caption text-text-secondary">
          A resolved market is <strong>adjudicated, not paid</strong>. Its pool stays whole and every
          position stays open until it is settled here — which is what lets an upheld objection
          actually change the outcome. <strong>Settling is irreversible:</strong> once the money is in
          players&rsquo; wallets it cannot be clawed back, so rule on any objection first.
        </p>
      </div>
    </>
  );
}
