"use client";

/**
 * THE WALLET — what the balance chip opens (landing v3 · Ali's ruling R1, 2026-09-26).
 *
 * A bottom sheet below 1024 and a panel under the chip from 1024 (`<Modal sheet sheetUntil="lg"
 * anchorRef>`). It holds the balance, Deposit and Withdraw side by side at the same size, the way
 * each direction moves money, Set limits, and the full wallet page.
 *
 * ⛔ THE CONCEPT'S TWO MONEY SENTENCES ARE NOT PORTED, because on this platform they are false
 * (INHERIT-MANIFEST L19):
 *   · "TZS X can be withdrawn now" — withdrawal asks for identity (the 2026-09-13 ruling) and can
 *     be paused by the payout rail, so "now" is not always true. The whole balance IS the
 *     withdrawable amount (the bonus wallet was withdrawn from the product, BONUS-WITHDRAWAL.md),
 *     so the figure is labelled "Available" — the withdraw page's own word for the same number.
 *   · "Deposits and withdrawals go through mobile money" — deposits take mobile money OR CARD. Each
 *     button carries its own truth instead, from the keys the two pages already use as subtitles.
 * ⛔ A frozen wallet gets no money buttons: `/wallet/withdraw` renders no form for it and the bar
 * already hides Deposit, so the sheet says what the wallet page says and offers nothing it refuses.
 */

import * as React from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Cash, CashEye } from "@/components/ui/cash";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";

export function WalletSheet({
  open,
  onClose,
  balance,
  held,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  balance: number;
  held: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const { t } = useT();
  const depVia = React.useId();
  const wdVia = React.useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={t.common.wallet}
      sheet
      sheetUntil="lg"
      anchorRef={anchorRef}
      maxWidth={640}
      showClose={false}
      panelClassName="kp-wsheet"
    >
      <div aria-hidden className="kp-wsheet__grab" />
      <div data-testid="wallet-sheet">
        <p className="kp-wsheet__label">{held ? t.common.balanceFrozen : t.wallet.available}</p>
        <div className="kp-wsheet__bal">
          <p className="kp-wsheet__amt"><Cash>{formatTzs(balance)}</Cash></p>
          <CashEye size={16} />
        </div>
      </div>

      {held ? (
        <div className="kp-wsheet__held" role="status">
          <p className="kp-wsheet__held-t">{t.kycGate.frozenTitle}</p>
          <p className="kp-wsheet__held-b">{t.kycGate.frozenBody}</p>
        </div>
      ) : (
        <div className="kp-wsheet__pair">
          <div className="kp-wsheet__col">
            <Link
              href="/wallet/deposit"
              onClick={onClose}
              aria-describedby={depVia}
              className="btn gilt-metal btn-lg kp-wsheet__act"
              data-testid="wallet-sheet-deposit"
            >
              <I.plus s={16} />
              {t.common.deposit}
            </Link>
            <span id={depVia} className="kp-wsheet__via">{t.wallet.mobileMoney}</span>
          </div>
          <div className="kp-wsheet__col">
            <Link
              href="/wallet/withdraw"
              onClick={onClose}
              aria-describedby={wdVia}
              className="btn btn-ghost btn-lg kp-wsheet__act"
              data-testid="wallet-sheet-withdraw"
            >
              <I.arrowUpFromLine s={16} />
              {t.common.withdraw}
            </Link>
            <span id={wdVia} className="kp-wsheet__via">{t.wallet.mobileMoneyOnly}</span>
          </div>
        </div>
      )}

      <div className="kp-wsheet__foot">
        <div className="kp-wsheet__links">
          <Link href="/profile/responsible-gambling" onClick={onClose} className="kp-wsheet__link">{t.footer.setLimits}</Link>
          <Link href="/wallet" onClick={onClose} className="kp-wsheet__link">{t.wallet.openWallet}</Link>
        </div>
        <Button type="button" variant="ghost" size="md" onClick={onClose}>{t.common.close}</Button>
      </div>
    </Modal>
  );
}
