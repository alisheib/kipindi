"use client";

/**
 * Shows the unified OperationResultModal after a deposit/withdrawal redirects
 * back to /wallet with result params, then clears the params on close so it
 * doesn't reappear on refresh. Kit rule: every consequential money mutation
 * confirms through this modal.
 *
 * 🔴 EVERY STORED STATUS BY NAME, AND ONLY CONFIRMED IS SUCCESS (route audit D3a, 2026-10-06). This used to
 * treat PROCESSING as the one not-yet state and call every other status a success, so a deposit the webhook
 * FAILED, a payout that failed, and a replayed FAILED idempotency key all read "Funds added" / "payout sent".
 * `lib/wallet/result-phase.ts` now names all seven `TxnStatus` values: CONFIRMED is done (the success variant,
 * the only one that auto-closes); PENDING and PROCESSING are moving; AML_REVIEW is a review; FAILED, REVERSED
 * and CANCELLED are not done, and that modal stays open until the player dismisses it. A status this file has
 * never heard of reads as moving — never as done, never as failed.
 * ⭐ THE WORDS ARE `walletResultCopy`'s (lib/wallet/result-copy.ts, S9 release candidate, Ali 2026-10-14): a deposit
 * under review (L6) reads "Payment under review", a deposit held for return reads "Held for return" — `depositKind`,
 * decided on the server from the stored row (`depositResultKind`), never from the URL.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { I } from "@/components/ui/glyphs";
import { formatTzs } from "@/lib/utils";
import { walletResultCopy } from "@/lib/wallet/result-copy";
import type { DepositResultKind } from "@/lib/wallet/receipts";

export function WalletResultModal({
  deposited,
  withdrawal,
  status,
  amount,
  depositKind,
}: {
  deposited?: string;
  withdrawal?: string;
  status?: string;
  amount?: string;
  depositKind?: DepositResultKind | null;
}) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(true);
  // B-16 — no refresh on mount. This modal renders from the search params of a
  // page the server JUST rendered with the post-mutation state (the action
  // redirected here), so dispatching "50pick:refresh" re-fetched a page that
  // could not be fresher — a third RSC fetch per deposit on top of the pair the
  // dial/sell double used to fire. The balance pill is in the same fresh render.

  if (!deposited && !withdrawal) return null;

  const txnId = deposited || withdrawal || "";
  const amt = amount ? formatTzs(Number(amount)) : undefined;
  const { eyebrow, title, subtitle, variant } = walletResultCopy(t, { isWithdraw: !!withdrawal, status, depositKind });
  const flowGlyph = !!deposited && status === "CONFIRMED" && variant === "success"
    ? <I.arrowDownToLine s={14} text="mono-700" className="g-nudge-down" />
    : !!withdrawal && (status === "PENDING" || status === "PROCESSING" || status === "CONFIRMED") && (variant === "info" || variant === "success")
      ? <I.arrowUpFromLine s={14} text="mono-700" className="g-nudge-up" />
      : null;

  const close = () => { setOpen(false); router.replace("/wallet"); };

  return (
    <OperationResultModal
      drawCheck={!!deposited && status === "CONFIRMED" && variant === "success"}
      open={open}
      variant={variant}
      eyebrow={flowGlyph ? <span className="inline-flex flex-wrap items-center justify-center gap-1">{flowGlyph}{eyebrow}</span> : eyebrow}
      title={title}
      subtitle={subtitle}
      details={[
        ...(amt ? [{ label: t.common.amountLabel, value: amt }] : []),
        { label: t.common.referenceLabel, value: txnId },
      ]}
      footnote={t.common.receiptInHistory}
      primaryLabel={t.common.doneSawa}
      onClose={close}
    />
  );
}
