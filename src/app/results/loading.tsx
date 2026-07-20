import { getServerT } from "@/lib/i18n-server";

export default async function ResultsLoading() {
  const { t } = await getServerT();
  // Width MUST match results/page.tsx (1280) — a mismatch reflows on every route transition.
  return (
    <main className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6 space-y-5">
      <header aria-hidden>
        <div className="h-3 w-16 rounded bg-bg-overlay kp-shimmer-track" />
        <div className="mt-1 h-7 w-48 rounded bg-bg-overlay kp-shimmer-track" />
      </header>

      {/* Filter/search skeleton */}
      <div className="flex items-center gap-2" aria-hidden>
        <div className="h-9 flex-1 rounded-md border border-border bg-bg-elevated kp-shimmer-track" />
        <div className="h-9 w-24 rounded-md bg-bg-overlay kp-shimmer-track" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: 220 }}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-14 rounded-pill bg-bg-overlay" />
                <div className="h-4 w-10 rounded-pill bg-bg-overlay" />
              </div>
              <div className="h-4 w-full rounded bg-bg-overlay" />
              <div className="h-4 w-3/4 rounded bg-bg-overlay" />
              <div className="h-2 w-full rounded-full bg-bg-overlay mt-2" />
              <div className="flex gap-2 mt-auto">
                <div className="h-3 w-16 rounded bg-bg-overlay" />
                <div className="h-3 w-12 rounded bg-bg-overlay" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
