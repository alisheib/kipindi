import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS } from "@/components/ui/query-bar";

/**
 * ⭐ THE SKELETON'S JOB IS THAT NOTHING MOVES WHEN THE DATA LANDS — §B7 rule 3, and the reason it
 * is a rule rather than a nicety: `roles/loading.tsx`'s own note records a rail whose ghost was
 * the wrong height and *"the whole matrix below it jumped up by 41 + the body's 20px rhythm on
 * every load."*
 *
 * ⚠️ IT DREW THE WRONG PAGE UNTIL 2026-09-07. The real page's rail was three pills; the ghost was
 * a `border-b` UNDERLINE rail of three fixed 70px boxes with no counts — a different control
 * language (§K 7c: the underline is the SECTION language, the capsule is the FILTER language),
 * a different width, and no counts, so it mismatched even before the campaign touched it. The
 * page now renders a search box and a two-row query bar above the list, so the ghost draws
 * those, in that order, at those heights.
 *
 * ⛔ THE BAR'S CLASSES ARE IMPORTED, NEVER RETYPED. `QUERY_BAR_CLASS` and its two row classes are
 * the same constants the real bar wears, so a change to the bar's padding or sticky offset moves
 * the ghost in the same commit by construction. A hand-copied class string is how a ghost drifts
 * from the thing it stands in for, silently, for as long as nobody screenshots the first paint.
 */
export default async function PositionsLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* Same three strings, in the same order, as the real header — a skeleton that names the
          page differently is a second name for one destination (§L1), and the subtitle is drawn
          here too so what follows does not jump when data lands.
          ⭐ DG-P-03 · §K — AND IT IS THE KIT NOW, NOT A HAND-TYPED COPY OF IT. This block was
          `PageHeader`'s eyebrow / h1 / subtitle recipe retyped by hand, which is why the census
          found **17 distinct literal `<h1>` recipes** against `PageHeader`'s 25 call sites. The
          page renders `<PageHeader>` with these exact three strings, so the skeleton renders the
          same component with the same props and the two cannot drift.
          ⚠️ The `<header>` wrapper takes the real page's own class — the skeleton had a bare
          `<header>` against the page's `flex items-start justify-between`, which is only invisible
          while the skeleton has nothing to put beside the title. */}
      <header className="flex items-start justify-between gap-3">
        <PageHeader eyebrow={t.common.positions} title={t.positions.headline} subtitle={t.positions.headlineBody} />
      </header>

      {/* B-29 / V-2 — "Your standing" PnL strip. It sits ABOVE the rail on the real page, so it
          is drawn above the rail here too; getting the ORDER wrong moves everything below it. */}
      <div className="glass-panel px-5 pt-4 pb-[18px] kp-shimmer-track" aria-hidden>
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-28 rounded bg-bg-overlay" />
          <div className="h-2.5 w-16 rounded bg-bg-overlay" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-16 rounded bg-bg-overlay" />
              <div className="h-5 w-20 rounded bg-bg-overlay" />
            </div>
          ))}
        </div>
      </div>

      {/* The YES/NO exposure bar — one line of keys over a 2.5-unit track. */}
      <div className="rounded-lg border border-border bg-bg-elevated/60 p-3 kp-shimmer-track" aria-hidden>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="h-2.5 w-20 rounded bg-bg-overlay" />
          <div className="h-2.5 w-14 rounded bg-bg-overlay" />
          <div className="h-2.5 w-20 rounded bg-bg-overlay" />
        </div>
        <div className="h-2.5 w-full rounded-pill bg-bg-overlay" />
      </div>

      {/* The search box — ⚠️ 44px, the control floor, written as a literal: this repo overrides
          Tailwind's spacing scale, so `h-11` is not 44 here. */}
      <div className="h-[44px] w-full rounded-lg border border-border-control bg-bg-inset kp-shimmer-track" aria-hidden />

      {/* The query bar — two rows, the same classes the real bar wears.
          ⛔ CAPSULES, NOT AN UNDERLINE RAIL. The lens strip is `FilterPill`s at 44px; a ghost
          drawn as tabs would promise a control language the page does not use. */}
      <div className={QUERY_BAR_CLASS} aria-hidden>
        <div className={QUERY_BAR_ROW1_CLASS}>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {/* Seven lenses. The widths differ because the real labels do — a row of identical
                boxes reads as a loading bar, not as the rail it stands in for. */}
            {[54, 62, 74, 58, 58, 82, 92].map((w, i) => (
              <div key={i} className="h-[44px] shrink-0 rounded-pill bg-bg-overlay" style={{ width: w }} />
            ))}
          </div>
          <div className="h-3 w-20 shrink-0 rounded bg-bg-overlay" />
        </div>
        <div className={QUERY_BAR_ROW2_CLASS}>
          {/* Sort + direction, fused — one control, 44px, then the Filters trigger. */}
          <div className="h-[44px] w-[180px] rounded-pill bg-bg-overlay" />
          <div className="h-[44px] w-[104px] rounded-pill bg-bg-overlay" />
        </div>
      </div>

      {/* Position card skeletons — the real list is a 2-col grid at md
          (grid-cols-1 md:grid-cols-2), not a single column. */}
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                {/* ⚠️ WIDTH IS A LITERAL, not `w-12` — 128px on the overridden scale, twice
                    any real chip. */}
                <div className="h-5 w-[64px] rounded-pill bg-bg-overlay" />
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
    </PageContainer>
  );
}
