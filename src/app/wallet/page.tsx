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

export const metadata = { title: "Wallet · Pochi" };
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
  };
}

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ deposited?: string; withdrawal?: string; status?: string; amount?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/wallet");

  const sp = await searchParams;
  const w = await db.wallet.findByUserId(session.userId);
  const balance = w?.balance ?? 0;
  const pending = w?.pending ?? 0;
  const hold = w?.hold ?? 0;
  const currency = w?.currency ?? "TZS";
  const txns: Transaction[] = ((await db.txn.findByUser(session.userId, 50)) as StoredTxn[]).map(adaptTxn);

  // Bonus wallet — second balance shown alongside the main wallet. Only the
  // active grants drive the play-through card; map to a lean serializable shape.
  const bonus = await getBonusSummary(session.userId);
  const bonusCfg = getBonusConfig();
  const cashbackPercent = bonusCfg.enabled && bonusCfg.cashbackEnabled ? bonusCfg.cashbackPercentage : 0;
  const bonusGrants = bonus.grants
    .filter((g) => g.status === "ACTIVE")
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
        bonusBalance={bonus.bonusBalance}
        bonusActiveCount={bonus.activeCount}
        bonusWagerRemaining={bonus.activeWagerRemainingTzs}
        bonusGrants={bonusGrants}
        cashbackPercent={cashbackPercent}
        isAuthed={true}
      />
    </>
  );
}
