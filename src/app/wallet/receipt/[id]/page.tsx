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
 *
 * ⭐ 2026-10-07 — ONE OF A LIST NOW, AND IT SAYS WHAT THE LIST SAYS (owner ruling: every deposit and withdrawal is kept
 * in the app, on /wallet/receipts). So the page reads the same definitions the list does (`lib/wallet/receipts.ts`):
 *   · ONLY A DEPOSIT OR A WITHDRAWAL HAS A RECEIPT, decided on the STORED type. Any other id answers 404, the same answer
 *     as a foreign one. It used to render anything the viewer owned and name the type by the SIGN of the amount, so a
 *     bonus credit read "Deposit" and a house fee "Withdrawal" (finding S10-02).
 *   · THE STATUS chip takes its tone from `status-tone.ts` (§B11), as the list's does — it carried a file-local map in
 *     the BETTING inks (§B2a). A deposit held for return reads "Reversed" (`presentedStatus`), as its notice and email do.
 *   · THE METHOD reads "Kadi" / "银行卡" for a card (`methodLabel`) — brand names stay brand names, words are translated —
 *     and the subtitle is "Deposit · M-Pesa" in the reader's language, not the stored English description.
 *   · DATES are East Africa Time in the reader's month words (`formatEatDateTime`), the list's own.
 *   · NO GOLD: moving your own money into or out of your own wallet earns nothing (§M3a D1). The amount is the page's
 *     headline in the money face (§M4, `.amount`), and EVERY figure — headline, amount, fee, balance after — goes through
 *     `<Cash>`, so the privacy eye that masks the list also masks the receipt it opens (design review, 2026-10-07).
 *   · THE WAY BACK SAYS "Back": it returns to wherever the player came from (the list, /wallet, a deposit return), and
 *     a deep link with no history falls back to the list of receipts.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { Chip } from "@/components/ui/chip";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getServerT } from "@/lib/i18n-server";
import { formatTzs } from "@/lib/utils";
import { formatEatDateTime } from "@/lib/eat-day";
import { playerStatusChip } from "@/lib/status-tone";
import { STATE_STATUSES } from "@/lib/wallet/ledger";
import { hasReceipt, methodLabel, presentedStatus, receiptStatusWord, receiptTypeWord } from "@/lib/wallet/receipts";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { Cash } from "@/components/ui/cash";
import { PageContainer } from "@/components/layout/page-container";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Receipt", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.wallet.receiptEyebrow };
}
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  // Back to THIS receipt after signing in, not the wallet (2026-10-06).
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(`/wallet/receipt/${encodeURIComponent((await params).id)}`)}`);
  const { t, locale } = await getServerT();
  const { id } = await params;

  const txn = await db.txn.findById(id);
  // Not found, not-yours and not-a-receipt are the SAME response on purpose — distinguishing them would confirm the
  // existence of another player's transaction id, and only a deposit or a withdrawal has a receipt.
  if (!txn || txn.userId !== session.userId || !hasReceipt(txn.type)) notFound();

  const status = presentedStatus(txn);
  const statusWord = receiptStatusWord(t, status);
  const typeWord = receiptTypeWord(t, txn.type);
  const method = methodLabel(t, txn.provider);
  const settled = status === "CONFIRMED";
  // A pending receipt must not read as a completed one: the note shows while the money is still moving or in review.
  const moving = STATE_STATUSES.flight.includes(status);
  // B-19 — a receipt opened while the money is still in flight watches for the terminal state (the server's fast poll
  // confirms within ~15s); a settled receipt registers nothing (E-102).
  const inFlight = txn.status === "PENDING" || txn.status === "PROCESSING";
  const nowMs = Date.now();
  const StatusGlyph = settled ? I.checkCircle : moving ? I.clock : status === "FAILED" ? I.alertCircle : status === "REVERSED" ? I.rotateCcw : I.xCircle;

  return (
    <PageContainer tier="receipt" className="space-y-5">
      <RefreshPoller intervalMs={10_000} enabled={inFlight} />
      {/* History first (back to the list or wherever the player came from); a deep link from a notification or an email
          falls back to the list of receipts. "Back", because the page it returns to is not always the list. */}
      <BackLink fallbackHref="/wallet/receipts" label={t.common.back} />

      <PageHero>
        <PageHeader
          tone="subtle"
          icon={<I.receipt s={14} className="text-text-muted" />}
          eyebrow={t.wallet.receiptEyebrow}
          title={<span className="amount"><Cash>{formatTzs(Math.abs(txn.amount))}</Cash></span>}
          subtitle={`${typeWord} · ${method}`}
        />
      </PageHero>

      <div className="flex justify-center">
        <Chip variant={playerStatusChip(status) ?? "neutral"} size="md" style={{ whiteSpace: "nowrap" }}>
          <StatusGlyph s={12} aria-hidden /> {statusWord}
        </Chip>
      </div>

      {moving && (
        <p className="rounded-xl border border-brand-600/50 bg-brand-500/[0.08] px-4 py-3 text-body-sm leading-relaxed text-text-muted">
          {t.wallet.receiptPendingNote}
        </p>
      )}

      <dl className="rounded-xl glass-panel divide-y divide-border" data-testid="receipt-details" data-type={txn.type} data-status={status}>
        <Row label={t.wallet.receiptType}>{typeWord}</Row>
        <Row label={t.wallet.amount}>
          <span className="amount text-text"><Cash>{formatTzs(Math.abs(txn.amount))}</Cash></span>
        </Row>
        {!!txn.fee && (
          <Row label={t.wallet.receiptFee}>
            <span className="amount text-text"><Cash>{formatTzs(txn.fee)}</Cash></span>
          </Row>
        )}
        <Row label={t.wallet.method}>{method}</Row>
        <Row label={t.wallet.transactionId}>
          <span className="font-mono break-all">{txn.id}</span>
        </Row>
        {txn.providerRef && (
          <Row label={t.wallet.gatewayReference}>
            <span className="font-mono break-all">{txn.providerRef}</span>
          </Row>
        )}
        {/* Dates in the numeral face (§T5), as the list prints the same instant. */}
        <Row label={t.wallet.date}><span className="font-mono tabular-nums">{formatEatDateTime(Date.parse(txn.createdAt), nowMs, t.common.monthsShort, locale)}</span></Row>
        {txn.completedAt && <Row label={t.wallet.receiptCompletedAt}><span className="font-mono tabular-nums">{formatEatDateTime(Date.parse(txn.completedAt), nowMs, t.common.monthsShort, locale)}</span></Row>}
        {/* balanceAfter is only meaningful once the movement actually settled. */}
        {txn.balanceAfter != null && settled && (
          <Row label={t.wallet.balanceAfter}>
            <span className="amount font-semibold text-text"><Cash>{formatTzs(txn.balanceAfter)}</Cash></span>
          </Row>
        )}
      </dl>

      <div className="flex flex-col sm:flex-row gap-2">
        <Link href="/wallet/receipts" className="btn btn-ghost btn-lg btn-pill w-full inline-flex items-center justify-center gap-1.5">
          <I.receipt s={14} />
          {t.receipts.allReceipts}
        </Link>
        <Link href="/wallet" className="btn btn-ghost btn-lg btn-pill w-full inline-flex items-center justify-center gap-1.5">
          <I.wallet s={14} />
          {t.error.backToWallet}
        </Link>
      </div>

      <p className="text-body-sm leading-relaxed text-text-subtle">{t.wallet.receiptFootnote}</p>
    </PageContainer>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-body-sm text-text-muted shrink-0">{label}</dt>
      <dd className="text-body-sm text-right text-text min-w-0">{children}</dd>
    </div>
  );
}
