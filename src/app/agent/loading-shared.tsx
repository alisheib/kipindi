import { PageContainer } from "@/components/layout/page-container";
import type { MeasureTier } from "@/components/layout/page-container";

/**
 * The ONE ghost shape the agent programme's async routes share: a back-link line, a heading,
 * then N panels. Each route's `loading.tsx` passes the panel count and tier it actually
 * renders, so a skeleton can never describe a page that is not coming (§5f's lesson on
 * `wallet/loading.tsx`).
 */
export function AgentGhost({ tier, panels, heading = true, steps = false }: { tier: MeasureTier; panels: number; heading?: boolean; steps?: boolean }) {
  return (
    <PageContainer tier={tier} className="space-y-5" aria-busy="true">
      <div className="h-4 w-[128px] rounded bg-bg-overlay/50 kp-shimmer-track" aria-hidden />
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
