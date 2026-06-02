import { BrandSpinner } from "@/components/brand";

export default function MarketsLoading() {
  return (
    <main className="mx-auto max-w-[1480px] px-3 lg:px-6 py-6">
      {/* Lean header — must match the live page (no marketing hero) so there's
          no layout jump when the real page swaps in. */}
      <div className="mb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Markets · Soko</p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* left filter column skeleton (desktop) */}
        <aside className="lg:w-[208px] lg:shrink-0 space-y-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 rounded-md border border-border bg-bg-elevated kp-shimmer-track lg:w-full w-24 inline-block lg:block mr-1.5" />
          ))}
        </aside>
        <div className="min-w-0 flex-1">
          <div className="rounded-lg border border-border bg-bg-elevated/40 p-16 grid place-items-center mb-3">
            <div className="flex flex-col items-center gap-4">
              <BrandSpinner size={56} />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Loading markets · Inapakia</p>
            </div>
          </div>
          <div className="market-grid" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-md border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: 220 }} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
