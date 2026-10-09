"use client";

import { PageContainer } from "@/components/layout/page-container";
import type { MeasureTier } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";

/**
 * The ONE ghost shape the agent programme's async routes share: a back link (where the page has one), a heading,
 * then N panels. Each route's `loading.tsx` passes the panel count and tier it actually
 * renders, so a skeleton can never describe a page that is not coming (§5f's lesson on
 * `wallet/loading.tsx`).
 * ⭐ CLIENT CODE (round 5's follow-up, R5-H · G-2): it reads nothing, so each route's loading file hands it numbers and a
 * refresh carries its reference, not the drawn tree — `components/ui/page-loader.tsx` has the convention.
 */
export function AgentGhost({ tier, panels, back = true, heading = true, steps = false }: { tier: MeasureTier; panels: number; back?: boolean; heading?: boolean; steps?: boolean }) {
  return (
    <PageContainer tier={tier} className="space-y-5" aria-busy="true">
      {/* The back link — the BackLink's own 44px box (R5-H · G-2b: a 20px bar stood here); `back={false}` for a page
          that opens on none (the invitation). */}
      {back && <BackLinkGhost />}
      {heading && <div className="h-6 w-56 rounded bg-bg-overlay/60 kp-shimmer-track" aria-hidden />}
      {steps && <div className="flex gap-1.5" aria-hidden>{[0, 1, 2, 3].map((i) => <div key={i} className="h-1 flex-1 rounded-pill bg-bg-overlay" />)}</div>}
      {Array.from({ length: panels }).map((_, i) => (
        <div key={i} className="rounded-xl glass-panel p-4 space-y-3" aria-hidden>
          <div className="h-4 w-40 rounded bg-bg-overlay/60" />
          <div className="h-3 w-full rounded bg-bg-overlay/40" />
          <div className="h-3 w-4/6 rounded bg-bg-overlay/40" />
        </div>
      ))}
    </PageContainer>
  );
}
