"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useT } from "@/lib/i18n";

/** The one /updown loading drawing used by this route and the journey shell.
 * U43: mirror the two visible chip rows and the slim card, at phone and desk widths. */
export function UpDownGhost() {
  const { t } = useT();
  return (
    <div className="ud-board-page mx-auto w-full max-w-board px-3 lg:px-6 py-6" aria-busy="true">
      <PageHeader
        className="ud-board-header"
        title={t.market.udTitle}
        subtitle={t.market.udTagline}
        actions={<div className="flex gap-1" aria-hidden>
          <div className="h-[40px] w-[70px] rounded-pill bg-bg-elevated kp-shimmer-track" />
          <div className="h-[40px] w-[86px] rounded-pill bg-bg-elevated kp-shimmer-track" />
        </div>}
      />
      <div className="ud-filter-rail mt-4 flex gap-2" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[44px] w-[96px] shrink-0 rounded-control bg-bg-elevated kp-shimmer-track" />)}
      </div>
      <div className="ud-filter-rail mt-2 flex gap-0.5" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[44px] w-[64px] shrink-0 rounded-control bg-bg-inset kp-shimmer-track" />)}
      </div>
      <div className="ud-board-stage" aria-hidden>
        <div className="ud-board-lab">
          <div className="ud-board-viz">
            <div className="ud-board-cubes">
              <div className="h-[13px] w-[96px] rounded bg-bg-elevated kp-shimmer-track" />
              <div className="mt-2 h-[18px] w-[240px] max-w-full rounded-sm bg-bg-inset kp-shimmer-track" />
            </div>
            <div className="ud-board-chart">
              <div className="ud-chart-trigger h-[44px] w-[154px] kp-shimmer-track" />
              <div className="ud-chart-slot h-[240px] rounded-lg bg-bg-elevated kp-shimmer-track max-lg:hidden" />
            </div>
          </div>
        </div>
        <div className="ud-board-rounds">
          <div className="grid items-stretch gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="ud-card min-h-[329px] rounded-lg border border-border bg-bg-elevated kp-shimmer-track" />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
