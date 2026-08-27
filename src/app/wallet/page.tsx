import { redirect } from "next/navigation";
import { WalletPageClient } from "./wallet-client";
import { WalletResultModal } from "./wallet-result-modal";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import type { Transaction } from "@/lib/ui-stubs";
import type { StoredTxn } from "@/lib/server/store";
import { getBonusSummary } from "@/lib/server/bonus-service";
import { getBonusConfig } from "@/lib/server/bonus-config";
import { DEPOSIT_MIN_TZS, DEPOSIT_MAX_TZS, WITHDRAW_MIN_TZS, WITHDRAW_MAX_TZS } from "@/lib/server/validators";
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
  // 1:1 with the stored status — no collapsing. This used to fold PROCESSING
  // into "pending" (so an in-flight gateway payment was indistinguishable from
  // one we hadn't sent yet) and REVERSED + CANCELLED into "failed" (so a deposit
  // reversed by the self-exclusion guard read as a declined card). Different
  // events, different remedies, different words.
  const statusMap: Record<StoredTxn["status"], Transaction["status"]> = {
    PENDING: "pending", PROCESSING: "processing", AML_REVIEW: "review", CONFIRMED: "confirmed", FAILED: "failed", REVERSED: "reversed", CANCELLED: "cancelled",
  };
  return {
    id: t.id,
    type: typeMap[t.type],
    amount: t.amount,
    status: statusMap[t.status],
    description: t.description ?? "",
    createdAt: t.createdAt,
    positionId: t.positionId ?? null,
    providerRef: t.providerRef ?? null,
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
  // B-1: money reads must NEVER swallow a failure into a zero/empty render — a
  // funded player shown "TZS 0 · make your first deposit" on a DB blip is
  // indistinguishable from being robbed. A failed read throws to the route's
  // error.tsx (RouteError with retry); the empty state is reachable only from a
  // SUCCESSFUL empty query.
  const w = await db.wallet.findByUserId(session.userId);
  const balance = w?.balance ?? 0;
  const pending = w?.pending ?? 0;
  const hold = w?.hold ?? 0;
  const currency = w?.currency ?? "TZS";
  const rawTxns = (await db.txn.findByUser(session.userId, 1000)) as StoredTxn[];
  const txns: Transaction[] = rawTxns.map(adaptTxn);

  // B-5: the result modal renders ONLY for a txn this user actually owns, with
  // the STORED status/amount — never the raw query params. A fabricated
  // `?deposited=x&amount=5000000` finds no owned txn → no modal, no fake gilt.
  const resultId = sp.deposited || sp.withdrawal || "";
  const resultTxn = resultId ? rawTxns.find((x) => x.id === resultId) : undefined;

  // Bonus balance is money too — same B-1 rule, no zero-on-failure.
  const bonus = await getBonusSummary(session.userId);
  const bonusCfg = getBonusConfig();
  const cashbackPercent = bonusCfg.enabled && bonusCfg.cashbackEnabled ? bonusCfg.cashbackPercentage : 0;
  const cashbackMode = bonusCfg.cashbackMode ?? "REQUEST";
  const bonusGrants = bonus.grants
    .filter((g) => g.status === "ACTIVE" || g.status === "QUEUED")
    .map((g) => ({
      id: g.id,
      amountTzs: g.amountTzs,
      // ⛔ E-224 · `BonusGrantView.remainingTzs` is NULLABLE now — toGrantView suppresses it for
      // any status where the figure is not locked bonus money. This list is already filtered to
      // ACTIVE||QUEUED just above, so it is never null in practice; the coalesce makes that
      // reasoning explicit to tsc rather than assumed.
      remainingTzs: g.remainingTzs ?? 0,
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
      {resultTxn && (
        <WalletResultModal
          deposited={sp.deposited ? sp.deposited : undefined}
          withdrawal={sp.withdrawal ? sp.withdrawal : undefined}
          status={resultTxn.status}
          amount={String(Math.abs(resultTxn.amount))}
        />
      )}
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
        limits={{
          depositMin: DEPOSIT_MIN_TZS, depositMax: DEPOSIT_MAX_TZS,
          withdrawMin: WITHDRAW_MIN_TZS, withdrawMax: WITHDRAW_MAX_TZS,
        }}
        isAuthed={true}
      />
    </>
  );
}
