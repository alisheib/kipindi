import { BrandSpinner } from "@/components/brand";

export default function LeaderboardLoading() {
  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">
          Leaderboard · Bingwa
        </p>
        <h1 className="font-display text-[28px] font-bold text-text">Top predictors</h1>
        <p className="text-[14px] italic text-text-subtle">Watabiri bora wa mwezi</p>
      </header>

      <section className="rounded-xl border border-border bg-bg-elevated p-8 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <BrandSpinner size={48} />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            Loading leaderboard · Inapakia
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-bg-elevated overflow-hidden" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-border last:border-b-0 px-4 py-3 kp-shimmer-track"
            style={{ height: 56 }}
          />
        ))}
      </section>
    </main>
  );
}
