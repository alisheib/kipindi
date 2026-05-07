import { redirect } from "next/navigation";
import { WalletPageClient } from "./wallet-client";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import type { Transaction } from "@/lib/mock-data";
import type { StoredTxn } from "@/lib/server/store";

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

export default async function WalletPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const w = db.wallet.findByUserId(session.userId);
  const balance = w?.balance ?? 0;
  const pending = w?.pending ?? 0;
  const hold = w?.hold ?? 0;
  const currency = w?.currency ?? "TZS";
  const txns: Transaction[] = db.txn.findByUser(session.userId, 50).map(adaptTxn);

  return (
    <WalletPageClient
      balance={balance}
      pending={pending}
      hold={hold}
      currency={currency}
      transactions={txns}
      isAuthed={true}
    />
  );
}
