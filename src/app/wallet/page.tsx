import { WalletPageClient } from "./wallet-client";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { transactions as mockTxns, wallet as mockWallet } from "@/lib/mock-data";
import type { Transaction } from "@/lib/mock-data";
import type { StoredTxn } from "@/lib/server/store";

export const metadata = { title: "Wallet · Pochi" };

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
  let balance = mockWallet.balance;
  let pending = mockWallet.pending;
  let hold = mockWallet.hold;
  let currency = mockWallet.currency;
  let txns: Transaction[] = mockTxns;
  let isAuthed = false;
  let isDemo = false;

  if (session) {
    isAuthed = true;
    isDemo = !!session.demoMode;
    const w = db.wallet.findByUserId(session.userId);
    if (w) {
      balance = w.balance; pending = w.pending; hold = w.hold; currency = w.currency;
    }
    // Authenticated: always show real transactions (even if empty — empty state will render).
    txns = db.txn.findByUser(session.userId, 50).map(adaptTxn);
  }

  return (
    <WalletPageClient
      balance={balance} pending={pending} hold={hold} currency={currency}
      transactions={txns}
      isAuthed={isAuthed}
      isDemo={isDemo}
    />
  );
}
