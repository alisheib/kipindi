"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { ChipGhost, GhostText, AMOUNT_SHAPE } from "@/components/ui/ghost-text";
import { I } from "@/components/ui/glyphs";
import { AmountGhost, DateGhost, DetailsGhost, IdGhost, RowGhost, WordGhost, TXN_ID_SHAPE, DEPOSIT_REF_SHAPE, dateShape } from "@/app/wallet/receipt-ghost";
import { useT } from "@/lib/i18n";

/**
 * Receipt skeleton (POLISH-BACKLOG §1.9).
 *
 * This route does a DB read before it can paint, and it is the single screen
 * where a player is most anxious about their money — "did my withdrawal
 * actually go through?". With no `loading.tsx`, that wait was a blank page.
 *
 * States `receipt`, the SAME tier the page states (B7 rule 3). The Up & Down
 * round shipped a 1080 skeleton in front of a 1232 page — a 152px jump on every
 * load that nothing could see; `test:measure` now asserts the pair agrees.
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 * ⭐ THE PAGE'S BANDS, BAND FOR BAND (round 5's follow-up, R5-K, 2026-10-09). It drew a card the page no longer has —
 * a title bar, a rule and five 16px rows, 20px apart — under a bare eyebrow, and no footnote: the page's buttons landed
 * 251–341px below the ghost's (S/r5k/m-receipt.mts). It now draws the page's own parts: the back link's box; the hero
 * (`PageHero` and `PageHeader`, the same props — the eyebrow is the page's name and is shown, the amount and the
 * "type · method" line are shapes); the status chip's band (the kit `Chip`, `md`); the details panel, one row per row
 * (`receipt-ghost.tsx`: the 51px pitch, an id wrapping where a real one does); the two buttons; the footnote's lines.
 * ⭐ THE CASE DRAWN: a completed M-Pesa deposit — the receipt a player opens most (every deposit lands on one): its chip
 * says "completed" (21px, the base row), and its eight rows are type, amount, method, the transaction id, the gateway's
 * reference (the deposit's own order id), the date, completed, balance after. A withdrawal adds a fee row (+51px), and
 * a payment still moving drops the last two rows and draws its notice (an 18px-line sentence in a 1px-bordered box).
 */
export default function ReceiptLoading() {
  const { t, locale } = useT();
  const date = dateShape(t, locale);
  return (
    <PageContainer tier="receipt" className="space-y-5">
      {/* The back link the page opens on (R5-H · G-2b): the link's own 44px box. */}
      <BackLinkGhost />
      <div aria-hidden>
        <PageHero>
          <PageHeader
            icon={<I.receipt s={14} />}
            eyebrow={t.wallet.receiptEyebrow}
            title={<GhostText className="amount">{AMOUNT_SHAPE}</GhostText>}
            subtitle={<GhostText>{`${t.wallet.receiptTypeDeposit} · M-Pesa`}</GhostText>}
          />
        </PageHero>
      </div>
      <div className="flex justify-center" aria-hidden>
        <ChipGhost glyph={12} nowrap>{t.wallet.txnStatusConfirmed}</ChipGhost>
      </div>
      <DetailsGhost>
        <RowGhost label={t.wallet.receiptType}><WordGhost text={t.wallet.receiptTypeDeposit} /></RowGhost>
        <RowGhost label={t.wallet.amount}><AmountGhost /></RowGhost>
        <RowGhost label={t.wallet.method}><WordGhost text="M-Pesa" /></RowGhost>
        <RowGhost label={t.wallet.transactionId}><IdGhost shape={TXN_ID_SHAPE} /></RowGhost>
        <RowGhost label={t.wallet.gatewayReference}><IdGhost shape={DEPOSIT_REF_SHAPE} /></RowGhost>
        <RowGhost label={t.wallet.date}><DateGhost text={date} /></RowGhost>
        <RowGhost label={t.wallet.receiptCompletedAt}><DateGhost text={date} /></RowGhost>
        <RowGhost label={t.wallet.balanceAfter}><AmountGhost /></RowGhost>
      </DetailsGhost>
      {/* ⚠️ TOKEN, not `h-10` (80px on the overridden scale). The page's TWO pill buttons since 2026-10-07 ("All
          receipts" · "Back to wallet", `btn-lg` = --h-control-lg) — stacked on a phone, side by side from `sm`. */}
      <div className="flex flex-col sm:flex-row gap-2" aria-hidden>
        <div className="h-[var(--h-control-lg)] w-full rounded-pill bg-bg-overlay kp-shimmer-track" />
        <div className="h-[var(--h-control-lg)] w-full rounded-pill bg-bg-overlay kp-shimmer-track" />
      </div>
      <p className="text-body-sm leading-relaxed" aria-hidden><GhostText>{t.wallet.receiptFootnote}</GhostText></p>
    </PageContainer>
  );
}
