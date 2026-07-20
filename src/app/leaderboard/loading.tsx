import { BrandSpinner } from "@/components/brand";
import { getServerT } from "@/lib/i18n-server";

export default async function LeaderboardLoading() {
  const { t } = await getServerT();
  // Width MUST match leaderboard/page.tsx (1080). It was 1280, so the skeleton was
  // 200px wider than the board that replaced it — a visible snap on every visit.
  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">
          {t.leaderboard.title}
        </p>
        <h1 className="font-display text-[28px] font-bold text-text">{t.leaderboard.topPredictors}</h1>
      </header>

      <section className="rounded-xl border border-border bg-bg-elevated p-8 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <BrandSpinner size={48} />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            {t.common.loading}
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
