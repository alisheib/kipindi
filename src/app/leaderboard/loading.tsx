import { BrandSpinner } from "@/components/brand";
import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default async function LeaderboardLoading() {
  const { t } = await getServerT();
  // Width MUST match leaderboard/page.tsx (1080). It was 1280, so the skeleton was
  // 200px wider than the board that replaced it — a visible snap on every visit.
  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* 🔴 DG-P-03 · §K — THIS COPY OF `PageHeader` WAS NOT EVEN AN ACCURATE ONE, which is the
          argument for adopting the kit rather than retyping it. The h1 read
          `font-display text-[28px] font-bold text-text` — **missing `leading-tight` and
          `tracking-[-0.02em]`** — so the heading changed its line-height AND its letter-spacing
          the instant the board replaced the skeleton, and the eyebrow had no `mb-1` either.
          `leaderboard/page.tsx:210` renders `<PageHeader>` as a direct child of the container,
          so this does too, with the same two strings. ⛔ No `<header>` wrapper: the page has
          none, and adding one here would put the skeleton a level deeper than the thing it
          stands in for. (The width mismatch this file's own header records was the same class
          of defect, found the same way.) */}
      <PageHeader eyebrow={t.leaderboard.title} title={t.leaderboard.topPredictors} />

      <section className="rounded-xl border border-border bg-bg-elevated p-8 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <BrandSpinner size={48} />
          <p className="font-mono text-caption uppercase tracking-[0.18em] text-text-muted">
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
    </PageContainer>
  );
}
