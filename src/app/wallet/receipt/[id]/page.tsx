/**
 * Player-facing transaction RECEIPT — an addressable, shareable record of one
 * money movement.
 *
 * Why it exists: the wallet's result modal and the transaction list both promise
 * "a receipt is in your history", but until now history was an inline expander
 * with a truncated id — nothing a player could bookmark, screenshot for support,
 * or point a bank at during a dispute. For a licensed real-money operator the
 * receipt IS the player's evidence, so it needs a URL.
 *
 * Ownership is enforced server-side: a receipt renders only for the signed-in
 * owner of the transaction. A wrong/foreign id 404s rather than reporting
 * "exists but not yours", which would leak other players' transaction ids.
 *
 * Deliberately shows the gateway reference: that is the string Selcom, the bank,
 * and /admin/transactions all key off, so a player and an operator looking at the
 * same payment are always looking at the same identifier.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getServerT } from "@/lib/i18n-server";
import { formatTzs, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Receipt" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, { chip: string; key: "paid" | "pending" | "failed" }> = {
  CONFIRMED:  { chip: "border-yes-700/60 bg-yes-500/10 text-yes-300",     key: "paid" },
  PROCESSING: { chip: "border-brand-700/60 bg-brand-500/10 text-brand-300", key: "pending" },
  FAILED:     { chip: "border-no-700/60 bg-no-500/10 text-no-300",         key: "failed" },
  REVERSED:   { chip: "border-no-700/60 bg-no-500/10 text-no-300",         key: "failed" },
};

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/wallet");
  const { t } = await getServerT();
  const { id } = await params;

  const txn = await db.txn.findById(id);
  // Not found and not-yours are the SAME response on purpose — distinguishing
  // them would confirm the existence of another player's transaction id.
  if (!txn || txn.userId !== session.userId) notFound();

  const tone = STATUS_TONE[txn.status] ?? STATUS_TONE.PROCESSING;
  const statusLabel =
    tone.key === "paid" ? t.wallet.receiptStatusPaid :
    tone.key === "pending" ? t.wallet.receiptStatusPending :
    t.wallet.receiptStatusFailed;

  const isCredit = txn.amount > 0;

  return (
    <main className="mx-auto max-w-[560px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/wallet" label={t.wallet.title} />

      <PageHero glow={tone.key === "paid" && isCredit ? "gold" : undefined}>
        <PageHeader
          tone={tone.key === "paid" && isCredit ? "gold" : undefined}
          icon={<I.receipt s={14} className={tone.key === "paid" && isCredit ? "text-gold-300" : "text-text-muted"} />}
          eyebrow={t.wallet.receiptEyebrow}
          title={formatTzs(Math.abs(txn.amount))}
          subtitle={txn.description ?? undefined}
        />
      </PageHero>

      <div className="flex justify-center">
        <span className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-[12px] font-medium ${tone.chip}`}>
          {tone.key === "paid" ? <I.checkCircle s={12} /> : tone.key === "pending" ? <I.clock s={12} /> : <I.alertCircle s={12} />}
          {statusLabel}
        </span>
      </div>

      {/* A pending receipt must not read as a completed one. */}
      {tone.key === "pending" && (
        <p className="rounded-xl border border-brand-700/50 bg-brand-500/[0.08] px-4 py-3 text-[12.5px] leading-relaxed text-text-muted">
          {t.wallet.receiptPendingNote}
        </p>
      )}

      <dl className="rounded-xl glass-panel divide-y divide-border" data-testid="receipt-details">
        <Row label={t.wallet.receiptType}>{t.wallet[isCredit ? "receiptTypeDeposit" : "receiptTypeWithdrawal"]}</Row>
        <Row label={t.wallet.amount}>
          <span className="font-mono tabular-nums text-text">{formatTzs(Math.abs(txn.amount))}</span>
        </Row>
        {!!txn.fee && (
          <Row label={t.wallet.receiptFee}>
            <span className="font-mono tabular-nums text-text">{formatTzs(txn.fee)}</span>
          </Row>
        )}
        <Row label={t.wallet.method}>{friendlyProviderLabel(txn.provider)}</Row>
        <Row label={t.wallet.transactionId}>
          <span className="font-mono text-[12px] break-all">{txn.id}</span>
        </Row>
        {txn.providerRef && (
          <Row label={t.wallet.gatewayReference}>
            <span className="font-mono text-[12px] break-all">{txn.providerRef}</span>
          </Row>
        )}
        <Row label={t.wallet.date}>{formatDateTime(txn.createdAt)}</Row>
        {txn.completedAt && <Row label={t.wallet.receiptCompletedAt}>{formatDateTime(txn.completedAt)}</Row>}
        {/* balanceAfter is only meaningful once the movement actually settled. */}
        {txn.balanceAfter != null && tone.key === "paid" && (
          <Row label={t.wallet.balanceAfter}>
            <span className="font-mono tabular-nums font-semibold text-gold-300">{formatTzs(txn.balanceAfter)}</span>
          </Row>
        )}
      </dl>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <Link
          href="/wallet"
          className="btn btn-ghost btn-lg btn-pill w-full inline-flex items-center justify-center gap-1.5"
        >
          <I.wallet s={14} />
          {t.error.backToWallet}
        </Link>
      </div>

      <p className="text-[11.5px] leading-relaxed text-text-subtle">{t.wallet.receiptFootnote}</p>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-[12.5px] text-text-muted shrink-0">{label}</dt>
      <dd className="text-[12.5px] text-right text-text min-w-0">{children}</dd>
    </div>
  );
}

/** Local mirror of wallet-service's label map — kept here so the receipt page
 *  doesn't pull the whole money service into a render path. */
function friendlyProviderLabel(p: string | null | undefined): string {
  switch (p) {
    case "MPESA": return "M-Pesa";
    case "AIRTEL_MONEY": return "Airtel Money";
    case "HALO_PESA": return "HaloPesa";
    case "MIXX": return "Mixx by Yas";
    case "CARD": return "Card";
    case "BANK_TRANSFER": return "Bank transfer";
    default: return p ?? "—";
  }
}
