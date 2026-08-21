import { PageContainer } from "@/components/layout/page-container";

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
 */
export default function DepositReturnLoading() {
  return (
    <PageContainer tier="receipt" className="space-y-5 pb-28 lg:pb-6">
      <div className="rounded-card border border-border bg-bg-elevated p-6 space-y-4 kp-shimmer-track">
        {/* ⚠️ LITERALS, not `h-12 w-12` — spacing is overridden (tailwind.config.ts:200-215) so
            `h-12` drew a 128px disc: the first thing a player sees on returning from a real
            Selcom payment. PLAYER MONEY SURFACE. */}
        <div className="mx-auto h-[48px] w-[48px] rounded-full bg-bg-overlay" />
        <div className="mx-auto h-5 w-48 rounded bg-bg-overlay" />
        <div className="mx-auto h-3 w-64 rounded bg-bg-overlay" />
      </div>
      <div className="rounded-card border border-border bg-bg-elevated p-5 space-y-3 kp-shimmer-track">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="h-3 w-24 rounded bg-bg-overlay" />
            <div className="h-3 w-28 rounded bg-bg-overlay" />
          </div>
        ))}
      </div>
      {/* ⚠️ TOKEN, not `h-10` (80px on the overridden scale) — this ghosts a full-width
          control, so it takes --h-control-md (44px). */}
      <div className="h-[var(--h-control-md)] w-full rounded-control bg-bg-overlay kp-shimmer-track" />
    </PageContainer>
  );
}
