"use client";

/**
 * CashbackPromo — marketing card for the cashback offer.
 *
 * Deliberately a member of the BONUS-wallet visual family (warm gold gradient,
 * jackpot glow, coins motif) since cashback lands in the bonus wallet.
 *
 *   <CashbackPromo />                       full card + "Deposit now" CTA
 *   <CashbackPromo cta={false} compact />   slim, no CTA (e.g. on the deposit page)
 *   <CashbackPromo percent={15} />          rate from admin config
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export function CashbackPromo({
  percent = 10,
  // F5 · the wagering multiple was a literal 5 in the copy. It is `defaultWagerMultiplier`
  // in bonus-config, admin-editable from 1 to 100 — a number written twice.
  wagerMultiplier = 5,
  mode = "REQUEST",
  cta = true,
  compact = false,
  className,
}: {
  percent?: number;
  /** Turnover multiple required before the bonus can be withdrawn. Reads bonus-config. */
  wagerMultiplier?: number;
  /** "REQUEST" = loss-based cashback (Management Rules §2), "AUTO" = legacy every-deposit */
  mode?: "REQUEST" | "AUTO";
  cta?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useT();
  const isRequest = mode === "REQUEST";
  return (
    /* ⭐ D5 (Ali's default, 2026-08-21) — THE GOLD COSTUME IS OFF THIS PANEL.
       It wore a gold gradient, a gold border and a jackpot glow: §M3 reserves struck gold
       for money that was EARNED, and an inducement to deposit is the opposite of earned.
       On a wallet page the effect was measured and inverted — five gold surfaces shouting
       at once (a TZS 0 bonus, this promo, three Deposit CTAs) while the player's REAL
       balance sat in the quietest box on the screen. On an RG-licensed product that is not
       a style question.
       ⭐ It keeps its gold TEXT — the eyebrow, the ON REQUEST tag, the coins motif — so it
       still reads as the money-in column; it simply stops outshouting the balance.
       ⛔ The byte-identical twin this panel used to share with `wallet-client.tsx`'s bonus
       card is gone: BOTH were converted in the same change, which is the only way a
       two-file recipe stops drifting. */
    <section
      className={cn("mat-raised relative overflow-hidden rounded-xl", className)}
      data-rung="raised"
    >
      {/* The coins motif stays — it is the panel's subject, and a watermark at 12% opacity
          is a motif rather than a costume. It drops to `--text-faint` for the same reason
          the bonus card's gift watermark did: gold ink at 150px IS the gold wash by another
          route. M5 — a decorative glyph does not perform; the coins rest still. */}
      <div className="absolute -right-5 -top-7 opacity-[0.12] text-text-faint" aria-hidden>
        <I.coins s={compact ? 110 : 140} />
      </div>
      {/* ⛔ THE GILT BLOOM IS DELETED, not dimmed. §M3: "No bloom — radial glow dilutes the
          financial texture." It was the jackpot-glow half of the costume D5 removes. */}

      <div className={cn("relative z-10", compact ? "p-4" : "p-5 lg:p-6")}>
        <div className="flex items-center gap-1.5 text-gold-300">
          <I.coins s={13} />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] font-bold">{t.common.cashback}</p>
          <span className="ml-auto inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] font-bold bg-gold-500/15 text-gold-200">
            {isRequest ? t.common.onRequest : t.common.everyDeposit}
          </span>
        </div>

        <p className={cn("font-display font-bold text-text leading-tight tracking-[-0.01em]", compact ? "mt-2 text-[18px]" : "mt-2 text-[22px]")}>
          {t.common.getCashbackPercent.replace("{pct}", String(percent))}
        </p>

        <p className={cn("text-text/85 leading-snug", compact ? "mt-1.5 text-[12px]" : "mt-2 text-[13px]")}>
          {(isRequest ? t.common.cashbackRequestSubtitle : t.common.cashbackSubtitle)
            .replace("{pct}", String(percent))
            .replace("{wager}", String(wagerMultiplier))}
        </p>

        {cta && !isRequest && (
          <Link href="/wallet/deposit" className="btn btn-gold btn-sm rounded-pill mt-4 inline-flex">
            <I.coins s={13} />
            {t.common.depositNow}
          </Link>
        )}
      </div>
    </section>
  );
}
