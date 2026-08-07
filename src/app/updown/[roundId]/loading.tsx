import { getServerT } from "@/lib/i18n-server";

/**
 * /updown/[roundId] loading skeleton.
 *
 * ⛔ UD-14 · MIRRORS THE REAL GEOMETRY, or it is the B7 defect class again. The old
 * skeleton was a single stacked column (`h-40` + `h-36`, `py-6`) while the page it
 * precedes is `pt-[22px] pb-14` with a 2-column
 * `xl:[grid-template-columns:minmax(0,1.55fr)_minmax(300px,1fr)]` layout — so on
 * desktop the entire page reflowed the moment content arrived, which is exactly the
 * "152px layout jump" B7 removed from the widths and this file reintroduced in the
 * columns. Same paddings, same grid, same slot order as `page.tsx`: back-link,
 * header row (title block left, countdown pod right), then hero ghost left with the
 * pool + action ghosts stacked right. The proof ghost is deliberately absent — it
 * only exists once a round is decided, and a ghost for a panel that may never come
 * would promise a result (A-5).
 */
export default async function UpDownRoundLoading() {
  const { t } = await getServerT();
  return (
    <div className="mx-auto w-full max-w-board px-3 lg:px-6 pt-[22px] pb-14" aria-busy="true">
      <div className="flex flex-col gap-[18px]">
        {/* back-link */}
        <div className="h-4 w-24 rounded bg-bg-elevated kp-shimmer-track" aria-hidden />
        {/* header: title block · countdown pod */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-bg-elevated kp-shimmer-track" aria-hidden />
            <div>
              <div className="h-6 w-56 rounded-md bg-bg-elevated kp-shimmer-track" aria-hidden />
              <div className="mt-2 h-3 w-32 rounded bg-bg-elevated kp-shimmer-track" aria-hidden />
            </div>
          </div>
          <div className="h-[52px] w-44 rounded-md border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
        </div>
        {/* grid: price hero (left) · pool + action rail (right) */}
        <div className="grid grid-cols-1 items-start gap-4 xl:[grid-template-columns:minmax(0,1.55fr)_minmax(300px,1fr)]">
          <div className="h-[300px] rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
          <div className="flex min-w-0 flex-col gap-4">
            <div className="h-40 rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
            <div className="h-56 rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
          </div>
        </div>
      </div>
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
