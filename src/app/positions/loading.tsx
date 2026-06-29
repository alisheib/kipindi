import { getServerT } from "@/lib/i18n-server";

export default async function PositionsLoading() {
  const { t } = await getServerT();
  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.positions.title}</p>
        <h1 className="font-display text-[28px] font-bold text-text">{t.positions.pollsPlayed}</h1>
      </header>

      {/* Tab skeleton */}
      <nav className="flex items-center gap-1 border-b border-border" aria-hidden>
        {["All", "Open", "Settled"].map((tab, i) => (
          <div
            key={tab}
            className={`h-9 px-3.5 rounded-t-md ${i === 0 ? "bg-bg-overlay" : ""}`}
            style={{ width: 70 }}
          >
            <span className="font-display text-[13px] text-text-subtle">{tab}</span>
          </div>
        ))}
      </nav>

      {/* Position card skeletons */}
      <div className="space-y-3" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-5 w-12 rounded-pill bg-bg-overlay" />
                <div className="h-4 w-24 rounded bg-bg-overlay" />
              </div>
              <div className="h-4 w-3/4 rounded bg-bg-overlay" />
              <div className="flex gap-4">
                <div className="h-3 w-20 rounded bg-bg-overlay" />
                <div className="h-3 w-16 rounded bg-bg-overlay" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
