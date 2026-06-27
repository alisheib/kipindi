/**
 * CashbackPromo — marketing card for the "10% back on every deposit" offer.
 *
 * Deliberately a member of the BONUS-wallet visual family (warm gold gradient,
 * jackpot glow, coins motif) since cashback lands in the bonus wallet. Pure
 * presentational kit component — no data fetching — so it renders in both server
 * and client trees. Bilingual EN · SW copy matches the platform convention.
 *
 *   <CashbackPromo />                       full card + "Deposit now" CTA
 *   <CashbackPromo cta={false} compact />   slim, no CTA (e.g. on the deposit page)
 *   <CashbackPromo percent={15} />          rate from admin config
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

export function CashbackPromo({
  percent = 10,
  cta = true,
  compact = false,
  className,
}: {
  percent?: number;
  cta?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{
        background: "linear-gradient(135deg, oklch(30% 0.085 80), oklch(18% 0.055 72))",
        border: "1px solid var(--border-gold)",
        boxShadow: "inset 0 1px 0 oklch(92% 0.10 84 / 0.18), var(--glow-jackpot)",
      }}
    >
      {/* warm coins motif + jackpot glow — same treatment as the bonus card */}
      <div className="absolute -right-5 -top-7 opacity-[0.12] text-gold-300 animate-pulse" aria-hidden style={{ animationDuration: "3.5s" }}>
        <I.coins s={compact ? 110 : 140} />
      </div>
      <div className="absolute -left-10 -bottom-12 h-40 w-40 rounded-full opacity-30" aria-hidden
        style={{ background: "radial-gradient(circle, oklch(82% 0.16 82 / 0.5), transparent 70%)" }} />

      <div className={cn("relative z-10", compact ? "p-4" : "p-5 lg:p-6")}>
        <div className="flex items-center gap-1.5 text-gold-300">
          <I.coins s={13} />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] font-bold">Cashback · Marejesho</p>
          <span className="ml-auto inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] font-bold bg-gold-500/15 text-gold-200">
            Every deposit
          </span>
        </div>

        <p className={cn("font-display font-bold text-text leading-tight tracking-[-0.01em]", compact ? "mt-2 text-[18px]" : "mt-2 text-[22px]")}>
          Get {percent}% back on every deposit
          <span className="block font-normal italic text-gold-200/70 text-[12px] mt-0.5">
            Pata {percent}% ya kila amana unayoweka.
          </span>
        </p>

        <p className={cn("text-text/85 leading-snug", compact ? "mt-1.5 text-[12px]" : "mt-2 text-[13px]")}>
          Lands in your bonus wallet — play it through and it&apos;s yours to withdraw.
          <span className="block italic text-[11px] mt-0.5 text-gold-200/60">
            Hupokea kwenye pochi ya bonasi — icheze kisha unaweza kuitoa.
          </span>
        </p>

        {cta && (
          <Link href="/wallet/deposit" className="btn btn-gold btn-sm rounded-pill mt-4 inline-flex">
            <I.coins s={13} />
            Deposit now · Weka sasa
          </Link>
        )}
      </div>
    </section>
  );
}
