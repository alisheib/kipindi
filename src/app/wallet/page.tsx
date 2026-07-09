import { redirect } from "next/navigation";
import { WalletPageClient } from "./wallet-client";
import { WalletResultModal } from "./wallet-result-modal";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import type { Transaction } from "@/lib/ui-stubs";
import type { StoredTxn } from "@/lib/server/store";
import { getBonusSummary } from "@/lib/server/bonus-service";
import { getBonusConfig } from "@/lib/server/bonus-config";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.wallet.title };
}
export const dynamic = "force-dynamic";

function adaptTxn(t: StoredTxn): Transaction {
  const typeMap: Record<StoredTxn["type"], Transaction["type"]> = {
    DEPOSIT: "deposit", WITHDRAWAL: "withdraw", BET_PLACED: "bet", BET_PAYOUT: "payout", BET_REFUND: "refund",
    BONUS_CREDIT: "deposit", ADJUSTMENT_CREDIT: "deposit", ADJUSTMENT_DEBIT: "withdraw", CASHOUT: "payout", HOUSE_FEE: "withdraw",
  };
  const statusMap: Record<StoredTxn["status"], Transaction["status"]> = {
    PENDING: "pending", PROCESSING: "pending", AML_REVIEW: "review", CONFIRMED: "confirmed", FAILED: "failed", REVERSED: "failed", CANCELLED: "failed",
  };
  return {
    id: t.id,
    type: typeMap[t.type],
    amount: t.amount,
    status: statusMap[t.status],
    description: t.description ?? "",
    createdAt: t.createdAt,
    positionId: t.positionId ?? null,
  };
}

/** 30-day end-of-day balance trajectory for the wallet spark (A9). Reconstructs
 *  each day's closing balance by subtracting the signed txns that landed after
 *  it from the current balance. Empty when there's no activity → spark hidden. */
function balance30d(txns: Transaction[], currentBalance: number): number[] {
  if (txns.length === 0) return [];
  const DAY = 86_400_000;
  const now = Date.now();
  const amounts = txns.map((t) => ({ at: Date.parse(t.createdAt), amt: t.amount })).filter((x) => Number.isFinite(x.at));
  if (amounts.length === 0) return [];
  const points: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayEnd = now - i * DAY;
    const after = amounts.reduce((sum, x) => (x.at > dayEnd ? sum + x.amt : sum), 0);
    points.push(Math.round(currentBalance - after));
  }
  return points;
}

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ deposited?: string; withdrawal?: string; status?: string; amount?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/wallet");

  const sp = await searchParams;
  let w: Awaited<ReturnType<typeof db.wallet.findByUserId>> | null = null;
  try { w = await db.wallet.findByUserId(session.userId); } catch { /* graceful */ }
  const balance = w?.balance ?? 0;
  const pending = w?.pending ?? 0;
  const hold = w?.hold ?? 0;
  const currency = w?.currency ?? "TZS";
  let txns: Transaction[] = [];
  try { txns = ((await db.txn.findByUser(session.userId, 1000)) as StoredTxn[]).map(adaptTxn); } catch { /* graceful */ }

  let bonus: Awaited<ReturnType<typeof getBonusSummary>> = { bonusBalance: 0, activeCount: 0, activeWagerRemainingTzs: 0, grants: [] };
  try { bonus = await getBonusSummary(session.userId); } catch { /* graceful */ }
  const bonusCfg = getBonusConfig();
  const cashbackPercent = bonusCfg.enabled && bonusCfg.cashbackEnabled ? bonusCfg.cashbackPercentage : 0;
  const cashbackMode = bonusCfg.cashbackMode ?? "REQUEST";
  const bonusGrants = bonus.grants
    .filter((g) => g.status === "ACTIVE" || g.status === "QUEUED")
    .map((g) => ({
      id: g.id,
      amountTzs: g.amountTzs,
      remainingTzs: g.remainingTzs,
      source: g.source,
      progressPct: g.progressPct,
      wageredTzs: g.wageredTzs,
      wagerRequiredTzs: g.wagerRequiredTzs,
      remainingWagerTzs: g.remainingWagerTzs,
      expiresAt: g.expiresAt,
      status: g.status as "ACTIVE" | "QUEUED",
    }));

  return (
    <>
      <RefreshPoller intervalMs={20_000} />
      <WalletResultModal deposited={sp.deposited} withdrawal={sp.withdrawal} status={sp.status} amount={sp.amount} />
      <WalletPageClient
        balance={balance}
        pending={pending}
        hold={hold}
        currency={currency}
        transactions={txns}
        balanceSeries={balance30d(txns, balance)}
        bonusBalance={bonus.bonusBalance}
        bonusActiveCount={bonus.activeCount}
        bonusWagerRemaining={bonus.activeWagerRemainingTzs}
        bonusGrants={bonusGrants}
        cashbackPercent={cashbackPercent}
        cashbackMode={cashbackMode}
        isAuthed={true}
      />
    </>
  );
}
