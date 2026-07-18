/**
 * Card deposit — the RETURN LEG.
 *
 * Selcom sends the buyer back here after the hosted card page, appending
 * `payment_status` and `transid`. We pre-seeded `order_id` into the redirect URL
 * ourselves (Selcom does not echo it), which is how we know WHICH deposit this is.
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
import { I } from "@/components/ui/glyphs";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { Callout } from "@/components/ui/callout";
import { currentSession } from "@/lib/server/auth-service";
import { getServerT } from "@/lib/i18n-server";
import { formatTzs, formatDateTime } from "@/lib/utils";
import { settleDepositFromReturn } from "@/lib/server/wallet-service";

export const metadata = { title: "Deposit result" };
export const dynamic = "force-dynamic";

export default async function DepositReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; payment_status?: string; transid?: string; cancelled?: string }>;
}) {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/wallet");
  const { t } = await getServerT();
  const sp = await searchParams;

  // The ONLY thing we take from the URL: which order to ask Selcom about.
  const orderId = (sp.order_id ?? "").trim().slice(0, 64);
  const outcome = await settleDepositFromReturn(session.userId, orderId);

  const tone =
    outcome.state === "PAID" ? "gold" :
    outcome.state === "FAILED" ? "rose" : "royal";

  const heading =
    outcome.state === "PAID" ? t.wallet.returnPaidTitle :
    outcome.state === "FAILED" ? t.wallet.returnFailedTitle :
    outcome.state === "UNKNOWN" ? t.wallet.returnUnknownTitle :
    t.wallet.returnPendingTitle;

  const body =
    outcome.state === "PAID" ? t.wallet.returnPaidBody :
    outcome.state === "FAILED" ? t.wallet.returnFailedBody :
    outcome.state === "UNKNOWN" ? t.wallet.returnUnknownBody :
    t.wallet.returnPendingBody;

  return (
    <main className="mx-auto max-w-[560px] px-3 lg:px-6 py-6 space-y-5">
      <PageHero glow={outcome.state === "PAID" ? "gold" : undefined}>
        <PageHeader
          tone={tone === "gold" ? "gold" : undefined}
          icon={
            outcome.state === "PAID" ? <I.checkCircle s={14} className="text-gold-300" /> :
            outcome.state === "FAILED" ? <I.alertCircle s={14} className="text-no-300" /> :
            <I.clock s={14} className="text-brand-300" />
          }
          eyebrow={t.common.deposit}
          title={heading}
          subtitle={body}
        />
      </PageHero>

      {/* PENDING is the state players misread as failure and re-pay on. Say the
          quiet part loudly: do NOT deposit again. */}
      {outcome.state === "PENDING" && (
        <Callout tone="info" title={t.wallet.returnPendingWarnTitle}>
          {t.wallet.returnPendingWarnBody}
        </Callout>
      )}

      {outcome.txn && (
        <dl className="rounded-xl glass-panel divide-y divide-border" data-testid="deposit-return-details">
          <Row label={t.wallet.amount}>
            <span className="font-mono tabular-nums text-text">{formatTzs(outcome.txn.amount)}</span>
          </Row>
          <Row label={t.wallet.method}>
            <span className="text-text">{outcome.txn.providerLabel}</span>
          </Row>
          <Row label={t.wallet.transactionId}>
            <span className="font-mono text-[12px] text-text break-all">{outcome.txn.id}</span>
          </Row>
          {outcome.txn.providerRef && (
            <Row label={t.wallet.gatewayReference}>
              <span className="font-mono text-[12px] text-text break-all">{outcome.txn.providerRef}</span>
            </Row>
          )}
          <Row label={t.wallet.date}>
            <span className="text-text">{formatDateTime(outcome.txn.createdAt)}</span>
          </Row>
          {/* Balance is shown ONLY when the deposit actually landed — printing a
              balance next to a pending payment invites the reading that it
              already counted. */}
          {outcome.state === "PAID" && (
            <Row label={t.wallet.newBalance}>
              <span className="font-mono tabular-nums font-semibold text-gold-300">{formatTzs(outcome.balance)}</span>
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
        {outcome.state === "PAID" && outcome.txn && (
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

      <p className="text-[11.5px] leading-relaxed text-text-subtle">{t.wallet.returnFootnote}</p>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-[12.5px] text-text-muted shrink-0">{label}</dt>
      <dd className="text-[12.5px] text-right min-w-0">{children}</dd>
    </div>
  );
}
