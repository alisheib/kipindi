import { getServerT } from "@/lib/i18n-server";

export default async function MarketDetailLoading() {
  const { t } = await getServerT();
  return (
    <main className="mx-auto max-w-[1100px] px-3 lg:px-6 py-6 space-y-5">
      {/* Back link skeleton */}
      <div className="h-3 w-16 rounded bg-bg-overlay kp-shimmer-track" aria-hidden />

      {/* Header skeleton */}
      <header className="space-y-2" aria-hidden>
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 rounded-pill bg-bg-overlay kp-shimmer-track" />
          <div className="h-5 w-12 rounded-pill bg-bg-overlay kp-shimmer-track" />
        </div>
        <div className="h-7 rounded bg-bg-overlay kp-shimmer-track" style={{ width: "min(620px, 90%)" }} />
        <div className="h-5 w-48 rounded bg-bg-overlay kp-shimmer-track" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 lg:gap-7">
        {/* Left — dial + chart skeleton */}
        <div className="space-y-4" aria-hidden>
          {/* Tipping bar skeleton */}
          <div className="h-2 w-full rounded-full bg-bg-overlay kp-shimmer-track" />

          {/* Dial skeleton */}
          <div className="rounded-xl border border-border bg-bg-elevated p-6 kp-shimmer-track" style={{ height: 260 }}>
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="h-32 w-32 rounded-full bg-bg-overlay/20" />
              <div className="h-4 w-20 rounded bg-bg-overlay/20" />
            </div>
          </div>

          {/* Chart skeleton */}
          <div className="rounded-lg border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: 180 }}>
            <div className="h-3 w-24 rounded bg-bg-overlay mb-3" />
            <div className="h-full w-full rounded bg-bg-overlay/10" />
          </div>
        </div>

        {/* Right — info cards skeleton */}
        <div className="space-y-3" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: 96 }}>
              <div className="space-y-2">
                <div className="h-2.5 w-16 rounded bg-bg-overlay" />
                <div className="h-4 w-full rounded bg-bg-overlay" />
                <div className="h-3 w-3/4 rounded bg-bg-overlay" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
