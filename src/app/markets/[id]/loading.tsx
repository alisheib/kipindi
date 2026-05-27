import { BrandSpinner } from "@/components/markets/brand-spinner";

export default function MarketDetailLoading() {
  return (
    <main className="mx-auto max-w-[1100px] px-3 lg:px-6 py-6 space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
            Loading market · Inapakia soko
          </p>
          <div
            className="kp-shimmer-track rounded-md"
            style={{ height: 28, width: "min(620px, 90%)" }}
            aria-hidden
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 lg:gap-7">
        {/* Left column — dial + history chart skeleton */}
        <div className="space-y-4">
          <div
            className="rounded-xl border border-border bg-bg-elevated/40 grid place-items-center"
            style={{ height: 260 }}
          >
            <BrandSpinner size={48} />
          </div>
          <div
            className="kp-shimmer-track rounded-lg border border-border"
            style={{ height: 180 }}
            aria-hidden
          />
        </div>

        {/* Right column — resolution criterion + source skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="kp-shimmer-track rounded-lg border border-border"
              style={{ height: 96 }}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </main>
  );
}
