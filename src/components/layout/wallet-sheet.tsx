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
 * ⭐ S6 (SJ-15) · `journey` gives the two doors the journey's words, "Weka pesa" and "Toa pesa", for the
 * journey header's captioned balance. That capsule has no eye of its own: this sheet's eye and its Withdraw
 * are what keep both one tap from the capsule (V19, redefined). Without the flag the words are today's, so
 * the classic capsule's Wallet renders exactly as before.
 * ⛔ 2026-10-08 · `onBreak` (the journey's Wallet only): a reader on a self-imposed break is offered no Deposit, the
 * rule the journey header (no "+ Weka pesa", S4) and `/wallet` (`depositOpen`, 2026-10-06) already keep, because
 * `/wallet/deposit` refuses one during a break. Withdraw stays, alone and full width: a break does not stop
 * withdrawals. The flag is AppShell's `promoSuppressed`, which gates an OFFER and fails OPEN (`feature-state.ts` LAW 1)
 * — after a failed read the Deposit shows and the deposit screen still refuses. No sentence is added: the shell hands
 * the browser one boolean and never the break's date (app-shell.tsx), and the header drops its pill without one too.
 */

import * as React from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Cash, CashEye, useCashHidden } from "@/components/ui/cash";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";

export function WalletSheet({
  open,
  onClose,
  balance,
  held,
  anchorRef,
  journey = false,
  onBreak = false,
}: {
  open: boolean;
  onClose: () => void;
  balance: number;
  held: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  /** S6 · the journey capsule's Wallet: its two doors read "Weka pesa" and "Toa pesa", and its figure takes the capsule's
   *  ink (gold on a live balance only). Omitted, today's words and today's ink. */
  journey?: boolean;
  /** S6 · the reader is on a self-imposed break (AppShell's `promoSuppressed`): no Deposit, Withdraw alone. The journey
   *  capsule passes it; omitted, both doors as today. */
  onBreak?: boolean;
}) {
  const { t } = useT();
  const depVia = React.useId();
  const wdVia = React.useId();
  const hidden = useCashHidden();
  /* ⭐ 2026-10-08 · THE JOURNEY'S WALLET READS ITS FIGURE IN THE CAPSULE'S INK (WP12 tiles 088–092). DESIGN_AUTHORITY
     rule 8a: the captioned balance is gold on a live balance only, plain ink when held or masked (its rule in
     globals.css: gold marks money you can use). A frozen wallet's capsule read "TZS 100,000" in plain ink and the Wallet it opened read the same figure in
     gold (measured: #F5F8FF against #F3CB7A), so one balance spoke two inks a tap apart. The figure now answers the
     same two states the capsule's rule names (`.kp-wsheet__amt` in globals.css).
     ⛔ The journey's Wallet only: the classic capsule's figure is gold in every state and its Wallet matches it, and
     classic readers' pages do not change during S6/S7. */
  const plainHeld = journey && held;
  const plainMasked = journey && hidden;

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
          <p className="kp-wsheet__amt" data-held={plainHeld ? "" : undefined} data-masked={plainMasked ? "" : undefined}><Cash>{formatTzs(balance)}</Cash></p>
          <CashEye size={16} />
        </div>
      </div>

      {held ? (
        <div className="kp-wsheet__held" role="status">
          <p className="kp-wsheet__held-t">{t.kycGate.frozenTitle}</p>
          <p className="kp-wsheet__held-b">{t.kycGate.frozenBody}</p>
        </div>
      ) : (
        <div className={onBreak ? "kp-wsheet__pair kp-wsheet__pair--one" : "kp-wsheet__pair"}>
          {!onBreak && (
            <div className="kp-wsheet__col">
              <Link
                href="/wallet/deposit"
                onClick={onClose}
                aria-describedby={depVia}
                className="btn gilt-metal btn-lg kp-wsheet__act"
                data-testid="wallet-sheet-deposit"
              >
                <I.plus s={16} />
                {journey ? t.journey.depositAction : t.common.deposit}
              </Link>
              <span id={depVia} className="kp-wsheet__via">{t.wallet.mobileMoney}</span>
            </div>
          )}
          <div className="kp-wsheet__col">
            <Link
              href="/wallet/withdraw"
              onClick={onClose}
              aria-describedby={wdVia}
              className="btn btn-ghost btn-lg kp-wsheet__act"
              data-testid="wallet-sheet-withdraw"
            >
              <I.arrowUpFromLine s={16} />
              {journey ? t.journey.withdrawAction : t.common.withdraw}
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
