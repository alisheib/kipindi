"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
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
 */
export default function ReceiptLoading() {
  const { t } = useT();
  return (
    <PageContainer tier="receipt" className="space-y-5">
      {/* The back link the page opens on (R5-H · G-2b: this ghost drew none, so the receipt landed 68px lower than it
          promised — the link's 44px and the rhythm's 24). */}
      <BackLinkGhost />
      <p className="font-mono text-caption uppercase eyebrow font-bold text-text-subtle">
        {t.wallet.receiptEyebrow}
      </p>
      <div className="rounded-card border border-border bg-bg-elevated p-5 space-y-4 kp-shimmer-track">
        <div className="h-3 w-[96px] rounded bg-bg-overlay" />
        {/* ⚠️ LITERAL, not `h-9` — spacing is overridden (tailwind.config.ts:200-215) so this
            "title" bar drew 64px on a receipt whose rows are text lines. */}
        <div className="h-[28px] w-40 rounded bg-bg-overlay" />
        <div className="h-px w-full bg-border" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="h-3 w-[96px] rounded bg-bg-overlay" />
            <div className="h-3 w-28 rounded bg-bg-overlay" />
          </div>
        ))}
      </div>
      {/* ⚠️ TOKEN, not `h-10` (80px on the overridden scale). The page's TWO pill buttons since 2026-10-07 ("All
          receipts" · "Back to wallet", `btn-lg` = --h-control-lg) — stacked on a phone, side by side from `sm`. */}
      <div className="flex flex-col sm:flex-row gap-2" aria-hidden>
        <div className="h-[var(--h-control-lg)] w-full rounded-pill bg-bg-overlay kp-shimmer-track" />
        <div className="h-[var(--h-control-lg)] w-full rounded-pill bg-bg-overlay kp-shimmer-track" />
      </div>
    </PageContainer>
  );
}
