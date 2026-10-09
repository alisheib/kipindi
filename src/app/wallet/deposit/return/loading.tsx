"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { GhostText } from "@/components/ui/ghost-text";
import { AmountGhost, DateGhost, DetailsGhost, IdGhost, RowGhost, WordGhost, TXN_ID_SHAPE, DEPOSIT_REF_SHAPE, dateShape } from "@/app/wallet/receipt-ghost";
import { useT } from "@/lib/i18n";

/**
 * Card-deposit return-leg skeleton (POLISH-BACKLOG §1.9).
 *
 * The player lands here straight back from the payment gateway, and the route
 * does a DB read before it can say whether the money arrived. With no
 * `loading.tsx` that was a blank screen at the single most anxious moment in
 * the product — the one where the honest answer to "did it work?" is still
 * being fetched.
 *
 * Deliberately says NOTHING about the outcome. A skeleton that hinted
 * "success" would be a fabricated result on a money surface (RULES law 5);
 * this is shape only, and the page states the truth when it resolves.
 *
 * States `receipt`, the SAME tier the page states (B7 rule 3).
 * ⭐ CLIENT CODE (round 5's follow-up, R5-H · G-2): it reads nothing, so a refresh while the deposit is pending (every
 * 10 s) carries its reference, not its tree — `components/ui/page-loader.tsx` has the convention.
 * ⭐ THE PAGE'S BANDS (round 5's follow-up, R5-K, 2026-10-09). It drew a centred card (a 48px disc, two bars), a card of
 * four 16px rows and one 44px control; the page is a hero, a panel of six rows, two 48px buttons (stacked on a phone,
 * 10px apart then, 12px since round 6's `gap-2`) and a footnote — 128–351px more (S/r5k/m-rest.mts). It now draws the page's parts: the hero (`PageHero`,
 * `PageHeader` — its eyebrow, heading and line), the details panel (`receipt-ghost.tsx`, the receipt's own rows), the
 * buttons and the footnote's lines.
 * ⛔ STILL NOTHING ABOUT THE OUTCOME: every line of the head is set and not shown — the heading and its line ARE the
 * outcome, and the eyebrow is the deposit's name, which is not this drawing's to state (it reads no server answer, and
 * the journey names the deposit "Weka pesa" — R5-G). The glyph is an empty box. The head is set in the words of the
 * outcome a player comes back to most — the card PAID (the gateway sends them back once the card is charged) — so it
 * wraps as that head does; it is never shown, read aloud or selectable (`ghost-text.tsx`). A payment still processing
 * draws its notice under the head, and a failed one no receipt button: there the page lands differently, by design.
 */
export default function DepositReturnLoading() {
  return <DepositReturnGhost />;
}

/** The drawing — its words the client dictionary's (`useT`). The loading file above renders it, and so does the journey's
 *  root ghost on a move here (`components/journey/route-ghost.tsx` draws `DepositReturnLoading`): one drawing. Exported, so
 *  a payload names it as the client reference it is (the loading element stays hook-free, as it was). */
export function DepositReturnGhost() {
  const { t, locale } = useT();
  const date = dateShape(t, locale);
  return (
    <PageContainer tier="receipt" className="space-y-5 pb-28 lg:pb-6">
      <div aria-hidden>
        <PageHero>
          <PageHeader
            icon={<span className="inline-block h-[14px] w-[14px] shrink-0" />}
            eyebrow={<GhostText>{t.common.deposit}</GhostText>}
            title={<GhostText>{t.wallet.returnPaidTitle}</GhostText>}
            subtitle={<GhostText>{t.wallet.returnPaidBody}</GhostText>}
          />
        </PageHero>
      </div>
      <DetailsGhost>
        <RowGhost label={t.wallet.amount}><AmountGhost /></RowGhost>
        <RowGhost label={t.wallet.method}><WordGhost text={t.wallet.methodCard} /></RowGhost>
        <RowGhost label={t.wallet.transactionId}><IdGhost shape={TXN_ID_SHAPE} /></RowGhost>
        <RowGhost label={t.wallet.gatewayReference}><IdGhost shape={DEPOSIT_REF_SHAPE} /></RowGhost>
        <RowGhost label={t.wallet.date}><DateGhost text={date} /></RowGhost>
        <RowGhost label={t.wallet.newBalance}><AmountGhost /></RowGhost>
      </DetailsGhost>
      {/* ⚠️ TOKEN, not `h-10` (80px on the overridden scale): the page's two `btn-lg` pills (--h-control-lg), 12px apart on
          the page's `gap-2` (round 6 moved the pair off the stock 10px `gap-2.5`; merged 2026-10-09). */}
      <div className="flex flex-col sm:flex-row gap-2" aria-hidden>
        <div className="h-[var(--h-control-lg)] w-full rounded-pill bg-bg-overlay kp-shimmer-track" />
        <div className="h-[var(--h-control-lg)] w-full rounded-pill bg-bg-overlay kp-shimmer-track" />
      </div>
      <p className="text-body-sm leading-relaxed" aria-hidden><GhostText>{t.wallet.returnFootnote}</GhostText></p>
    </PageContainer>
  );
}
