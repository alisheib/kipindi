import { AdminPageHead, AdminCard, AdminKpi, AdminStackedBar } from "@/components/admin/admin-shell";
import { db } from "@/lib/server/store";
import { formatTzs } from "@/lib/utils";
import type { StoredBet } from "@/lib/server/store";

export const metadata = { title: "Admin · Window pools" };
export const dynamic = "force-dynamic";

const WINDOW_LABEL: Record<StoredBet["windowKind"], { en: string; sw: string }> = {
  W_0_15:  { en: "0–15",  sw: "Dakika 0–15" },
  W_15_30: { en: "15–30", sw: "Dakika 15–30" },
  W_30_45: { en: "30–45", sw: "Dakika 30–45" },
  W_45_60: { en: "45–60", sw: "Dakika 45–60" },
  W_FT:    { en: "Full time", sw: "Mwisho wa mechi" },
};

export default function AdminWindowPoolsPage() {
  type Acc = {
    bets: number;
    stakes: number;
    won: number;
    lost: number;
    voided: number;
    cashedOut: number;
    payouts: number;
  };
  const empty = (): Acc => ({ bets: 0, stakes: 0, won: 0, lost: 0, voided: 0, cashedOut: 0, payouts: 0 });
  const map: Record<StoredBet["windowKind"], Acc> = {
    W_0_15: empty(),
    W_15_30: empty(),
    W_30_45: empty(),
    W_45_60: empty(),
    W_FT: empty(),
  };
  for (const u of db.user.list()) {
    for (const b of db.bet.findByUser(u.id, 5_000)) {
      const e = map[b.windowKind];
      if (!e) continue;
      e.bets++;
      e.stakes += b.stake;
      if (b.status === "WON") { e.won++; e.payouts += b.returnAmount ?? 0; }
      if (b.status === "LOST") e.lost++;
      if (b.status === "VOIDED") e.voided++;
      if (b.status === "CASHED_OUT") { e.cashedOut++; e.payouts += b.returnAmount ?? 0; }
    }
  }

  const order: StoredBet["windowKind"][] = ["W_0_15", "W_15_30", "W_30_45", "W_45_60", "W_FT"];
  const totalBets = order.reduce((s, k) => s + map[k].bets, 0);
  const totalStakes = order.reduce((s, k) => s + map[k].stakes, 0);
  const totalPayouts = order.reduce((s, k) => s + map[k].payouts, 0);
  const ngr = totalStakes - totalPayouts;
  const margin = totalStakes === 0 ? 0 : ((totalStakes - totalPayouts) / totalStakes) * 100;

  return (
    <>
      <AdminPageHead title="Window pools" sw="Mabwawa ya kipindi" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Total bets" sw="Madau"           value={totalBets.toLocaleString()} />
          <AdminKpi label="Total stakes" sw="Madau · jumla" value={formatTzs(totalStakes)} gold />
          <AdminKpi label="Margin" sw="Faida"               value={`${margin.toFixed(1)}%`} gold />
          <AdminKpi label="NGR" sw="Mapato halisi"          value={formatTzs(ngr)} gold />
        </div>

        <AdminCard title="Per-window performance" sw="Utendaji wa kila kipindi">
          <div className="space-y-3">
            {order.map((k) => {
              const e = map[k];
              const pct = totalStakes === 0 ? 0 : (e.stakes / totalStakes) * 100;
              return (
                <div key={k} className="rounded-md border border-border-subtle bg-bg-sunken/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-semibold text-text">
                      {WINDOW_LABEL[k].en} <span className="text-text-tertiary text-caption italic ml-1">· {WINDOW_LABEL[k].sw}</span>
                    </p>
                    <span className="font-mono text-micro tracking-wider text-text-tertiary">{e.bets.toLocaleString()} bets</span>
                  </div>
                  <AdminStackedBar
                    height={20}
                    segments={[
                      { flex: Math.max(2, e.won), color: "var(--gold)", label: e.won > 0 ? `${e.won} won` : undefined },
                      { flex: Math.max(2, e.lost), color: "var(--bet-lose)", label: e.lost > 0 ? `${e.lost} pool grew` : undefined },
                      { flex: Math.max(1, e.cashedOut), color: "var(--royal)", label: e.cashedOut > 0 ? `${e.cashedOut} cashed` : undefined },
                      { flex: Math.max(1, e.voided), color: "var(--text-tertiary)", label: e.voided > 0 ? `${e.voided} voided` : undefined },
                    ]}
                  />
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-text-tertiary">Pool share <span className="font-mono text-text">{pct.toFixed(1)}%</span></span>
                    <span className="font-mono tabular text-text">stakes {formatTzs(e.stakes)} · payouts {formatTzs(e.payouts)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
