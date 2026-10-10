"use client";

import { useT } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { I } from "@/components/ui/glyphs";
import { MoneyBarGhost } from "@/app/wallet/money-bar-ghost";

/**
 * The Receipts page while it loads (2026-10-07). ⭐ THE SAME TIER AND THE SAME SHAPE as the page (B7 rule 3 — the page and
 * its skeleton state one width), so nothing jumps when the list lands: the real header with its real words, the bar's
 * two rows in the bar's OWN classes (imported, never retyped — `positions/positions-ghost.tsx`'s rule; a single 44px
 * block stood in for a two-row bar until the design review of 2026-10-07 measured the 70–90px jump) — since round 5's follow-up
 * the money books' one bar ghost, its pills as wide as the page's in every language (`money-bar-ghost.tsx`, R5-H
 * G-2b: twelve fixed boxes drew row 2 in one line where the page wraps it to two from 1024) — and rows with the row's
 * own anatomy — two lines (type · method and amount; date and chip), the plate from `sm` up.
 * ⚠️ Sizes are LITERALS (`h-[40px]`), never the overridden spacing keys (`h-10` paints 80px here).
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 */
export default function ReceiptsLoading() {
  const { t } = useT();
  return (
    <PageContainer tier="reading" className="space-y-5">
      {/* The back link: `BackLinkGhost`, the one every ghost draws for the BackLink (R5-H · G-2b) — this was the only
          ghost with its 44px, as a filled block; now the same box and bar as the others. */}
      <BackLinkGhost />
      <PageHeader icon={<I.receipt s={22} />} eyebrow={t.wallet.title} title={t.receipts.title} subtitle={t.receipts.subtitle} />
      <MoneyBarGhost t={t} lenses={[t.common.all, t.receipts.lensDeposits, t.receipts.lensWithdrawals]} count={t.receipts.nResults.replace("{n}", "00")} />
      <div className="rounded-xl glass-panel overflow-hidden" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 lg:px-4">
            <div className="hidden h-[40px] w-[40px] shrink-0 rounded-control bg-bg-overlay kp-shimmer-track sm:block" />
            {/* The row's own two lines (receipt-list-row.tsx): the type and amount on the amount's 20px `text-body` line,
                8px (`mt-1.5`), then the date and the `sm` chip on an 18px line — 79px a row, as the page's settled rows.
                R5-H · G-2b: 16 + 12 + 22 made each row 4px taller, the sixth 24px low. */}
            <div className="min-w-0 flex-1">
              <div className="flex h-[20px] items-center justify-between gap-3">
                <div className="h-[14px] w-[150px] max-w-full rounded bg-bg-overlay kp-shimmer-track" />
                <div className="h-[16px] w-[88px] shrink-0 rounded bg-bg-overlay kp-shimmer-track" />
              </div>
              <div className="mt-1.5 flex h-[18px] items-center justify-between gap-3">
                <div className="h-[12px] w-[104px] rounded bg-bg-overlay/70 kp-shimmer-track" />
                <div className="h-[18px] w-[88px] rounded-pill bg-bg-overlay/60 kp-shimmer-track" />
              </div>
            </div>
            <div className="h-[16px] w-[16px] shrink-0 rounded bg-bg-overlay/60" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
