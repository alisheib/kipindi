/**
 * Card deposit — the RETURN LEG.
 *
 * Selcom sends the buyer back here after the hosted card page, appending
 * `payment_status` and `transid`. We pre-seeded `order_id` into the redirect URL
 * ourselves (Selcom does not echo it), which is how we know WHICH deposit this is.
 * 🔴 Only since 2026-10-09 (`withOrderId` in selcom.ts): before that the URL carried no
 * `order_id`, and every card payer landed on "We couldn't find that payment" (MONEY-GATE §3.2).
 *
 * ⛔ MONEY-SAFETY — the single most important property of this page:
 * the query parameters are UNSIGNED and browser-supplied. Anyone can open
 * `/wallet/deposit/return?order_id=…&payment_status=COMPLETED`. They are therefore
 * used for NOTHING except deciding what to look up. The outcome shown, and any
 * credit, comes only from `settleDepositFromReturn` → the SIGNED
 * `checkout/order-status` re-query against Selcom, through the same exactly-once
 * settlement path the webhook uses. A forged return leg credits nothing.
 *
 * The three outcomes are deliberately distinct, and "pending" is NOT a failure:
 *   PAID     — confirmed by Selcom. Show the proof: amount, reference, new balance.
 *   PENDING  — Selcom hasn't finished. The money may still arrive. Never say
 *              "failed" here; that is the lie that makes a player deposit twice.
 *   FAILED   — Selcom says cancelled/rejected. Nothing was taken.
 *
 * Also covers the awkward real-world paths: the player closed the tab and came
 * back hours later (the txn is looked up fresh, so the truth is whatever it is
 * now), hit back and re-submitted (settlement is idempotent), or cancelled
 * (`?cancelled=1`, our own cancel_url marker — still re-queried, because a
 * player can cancel on the gateway page *after* the charge went through).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { pathWithQuery } from "@/lib/safe-next";
import { I } from "@/components/ui/glyphs";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { Callout } from "@/components/ui/callout";
import { currentSession } from "@/lib/server/auth-service";
import { getServerT } from "@/lib/i18n-server";
import { formatTzs } from "@/lib/utils";
import { formatEatDateTime } from "@/lib/eat-day";
import { methodLabel } from "@/lib/wallet/receipts";
import { cardReturnOrderId } from "@/lib/wallet/card-return";
import { settleDepositFromReturn } from "@/lib/server/wallet-service";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { Cash } from "@/components/ui/cash";
import { PageContainer } from "@/components/layout/page-container";
import { KycFirstDepositNotice } from "@/components/wallet/kyc-first-deposit-notice";
import { cookies } from "next/headers";
import { firstDepositNotice, kycNoticeDismissValue } from "@/lib/server/kyc-notice";
import { KYC_NOTICE_COOKIE } from "@/lib/kyc-notice";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Deposit result", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.deposit };
}
export const dynamic = "force-dynamic";

export default async function DepositReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; payment_status?: string; transid?: string; cancelled?: string }>;
}) {
  const session = await currentSession();
  // Back to THIS return, `order_id` and all, after signing in — the wallet alone could not say what happened (2026-10-06).
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(pathWithQuery("/wallet/deposit/return", await searchParams))}`);
  const { t, locale } = await getServerT();
  const sp = await searchParams;

  // The ONLY thing we take from the URL: which order to ask Selcom about (trimmed, capped, and cut at a stray `?`).
  const orderId = cardReturnOrderId(sp.order_id);
  const outcome = await settleDepositFromReturn(session.userId, orderId);

  // ⭐ THE FIRST-DEPOSIT IDENTITY NOTICE, IN THE CONFIRMED STATE ONLY (2026-09-13). The ONE rule
  // (`firstDepositNoticeDue`, shared with /wallet): not dismissed by THIS player in this browser · nothing
  // submitted yet · at least one CONFIRMED deposit. The deposit half is asked of the store rather than
  // inferred from PAID, so the two surfaces cannot disagree about who is due. Never throws; a failed read →
  // not shown. 🔴 The RAW cookie goes to the predicate and the per-player value to the notice (2026-09-14):
  // a bare "dismissed" once let one player's X hide it from the next player on a shared phone.
  const kycFirstDepositNotice = outcome.state === "PAID" ? await firstDepositNotice(session.userId, {
    dismissCookie: (await cookies()).get(KYC_NOTICE_COOKIE)?.value,
  }) : null;

  // ⭐ REVERSED (2026-10-07, money-and-compliance review): the card PAID, but the account could not take money (a break or
  // an exclusion), so the deposit is held for return. It used to fall into FAILED — "Payment didn't complete. Nothing was
  // taken from your card." with a Try again button, during a break — while the bell, the email and the receipt all said
  // "Reversed". Now it says what happened, and offers the receipt rather than another deposit.
  const heading =
    outcome.state === "PAID" ? t.wallet.returnPaidTitle :
    outcome.state === "FAILED" ? t.wallet.returnFailedTitle :
    outcome.state === "REVERSED" ? t.wallet.returnReversedTitle :
    outcome.state === "UNKNOWN" ? t.wallet.returnUnknownTitle :
    t.wallet.returnPendingTitle;

  const body =
    outcome.state === "PAID" ? t.wallet.returnPaidBody :
    outcome.state === "FAILED" ? t.wallet.returnFailedBody :
    outcome.state === "REVERSED" ? t.wallet.returnReversedBody :
    outcome.state === "UNKNOWN" ? t.wallet.returnUnknownBody :
    t.wallet.returnPendingBody;

  return (
    // pb-28 on mobile: the bottom nav is `fixed` below lg (bottom-nav.tsx:41) and
    // the chat FAB floats above it, so a page ending at py-6 has its last element
    // sitting UNDERNEATH both. Here that is the footnote explaining we confirm
    // every payment with the gateway before the balance moves — reassurance on a
    // money screen, and it was unreadable on a phone. Reverts at lg, where the
    // nav is not fixed.
    <PageContainer tier="receipt" className="pb-28 lg:pb-6 space-y-5">
      {/* ⛔ NO GOLD ON A DEPOSIT (§M3, §M3a D1 — 2026-10-07): moving your own money into your own wallet earns nothing,
          and the receipt of this same deposit dropped its gold the same day. Landed is app-state green, failed the failure
          colour — never the betting NO rose (§B2a). */}
      <PageHero>
        <PageHeader
          icon={
            outcome.state === "PAID" ? <I.checkCircle s={14} className="text-success-fg" /> :
            outcome.state === "FAILED" ? <I.alertCircle s={14} className="text-danger-fg" /> :
            outcome.state === "REVERSED" ? <I.rotateCcw s={14} className="text-text-muted" /> :
            <I.clock s={14} className="text-brand-300" />
          }
          eyebrow={t.common.deposit}
          title={heading}
          subtitle={body}
        />
      </PageHero>

      {/* B-19 — while the money is still moving, the page watches for it. The
          credit lands server-side on the ~15s fast poll, and this page promised
          "the receipt updates itself" while being force-dynamic with no poller —
          a PENDING player sat on "do not deposit again" forever. Poll only in
          the non-terminal states; a settled page registers nothing (E-102). */}
      <RefreshPoller
        intervalMs={10_000}
        enabled={outcome.state === "PENDING" || outcome.state === "UNKNOWN"}
      />

      {/* PENDING is the state players misread as failure and re-pay on. Say the
          quiet part loudly: do NOT deposit again. */}
      {outcome.state === "PENDING" && (
        <Callout tone="info" title={t.wallet.returnPendingWarnTitle}>
          {t.wallet.returnPendingWarnBody}
        </Callout>
      )}

      {/* Under the success message, on a confirmed deposit only — decided above, from the store. */}
      {kycFirstDepositNotice && <KycFirstDepositNotice variant={kycFirstDepositNotice} dismissValue={kycNoticeDismissValue(session.userId)} />}

      {outcome.txn && (
        <dl className="rounded-xl glass-panel divide-y divide-border" data-testid="deposit-return-details">
          {/* Money in `<Cash>` (§M4): the privacy eye masks these figures as it masks them on the list. */}
          <Row label={t.wallet.amount}>
            <span className="amount text-text"><Cash>{formatTzs(outcome.txn.amount)}</Cash></span>
          </Row>
          <Row label={t.wallet.method}>
            <span className="text-text">{methodLabel(t, outcome.txn.provider)}</span>
          </Row>
          <Row label={t.wallet.transactionId}>
            <span className="font-mono text-text break-all">{outcome.txn.id}</span>
          </Row>
          {outcome.txn.providerRef && (
            <Row label={t.wallet.gatewayReference}>
              <span className="font-mono text-text break-all">{outcome.txn.providerRef}</span>
            </Row>
          )}
          <Row label={t.wallet.date}>
            <span className="font-mono tabular-nums text-text">{formatEatDateTime(Date.parse(outcome.txn.createdAt), Date.now(), t.common.monthsShort, locale)}</span>
          </Row>
          {/* Balance is shown ONLY when the deposit actually landed — printing a
              balance next to a pending payment invites the reading that it
              already counted. */}
          {outcome.state === "PAID" && (
            <Row label={t.wallet.newBalance}>
              <span className="amount font-semibold text-text"><Cash>{formatTzs(outcome.balance)}</Cash></span>
            </Row>
          )}
        </dl>
      )}

      {/* Link-as-button uses the kit's `btn` classes (the canonical pattern for
          navigation actions); <Button> is reserved for real form/submit buttons. */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <Link
          href="/wallet"
          className={`btn ${outcome.state === "PAID" ? "btn-primary" : "btn-ghost"} btn-lg btn-pill w-full inline-flex items-center justify-center gap-1.5`}
        >
          <I.wallet s={14} />
          {t.error.backToWallet}
        </Link>
        {/* The receipt is offered on PENDING too, not just PAID. A player left
            waiting is precisely the one who needs a stable, bookmarkable page
            carrying both references — the receipt updates itself as the deposit
            settles, so sending them there beats sending them to a wallet list
            they have to search. And on REVERSED: its receipt is the record of the
            money going back. Withheld only on FAILED/UNKNOWN, where there is
            either nothing to track or no transaction we can vouch for. */}
        {(outcome.state === "PAID" || outcome.state === "PENDING" || outcome.state === "REVERSED") && outcome.txn && (
          <Link
            href={`/wallet/receipt/${outcome.txn.id}` as never}
            className="btn btn-ghost btn-lg btn-pill w-full inline-flex items-center justify-center gap-1.5"
          >
            <I.receipt s={14} />
            {t.wallet.viewReceipt}
          </Link>
        )}
        {outcome.state === "FAILED" && (
          <Link
            href="/wallet/deposit"
            className="btn btn-primary btn-lg btn-pill w-full inline-flex items-center justify-center gap-1.5"
          >
            <I.arrowDownToLine s={14} />
            {t.error.tryAgain}
          </Link>
        )}
      </div>

      <p className="text-body-sm leading-relaxed text-text-subtle">{t.wallet.returnFootnote}</p>
    </PageContainer>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-body-sm text-text-muted shrink-0">{label}</dt>
      <dd className="text-body-sm text-right min-w-0">{children}</dd>
    </div>
  );
}
