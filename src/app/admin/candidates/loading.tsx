import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkKpiRow, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Market candidates"
        sw="Mapendekezo ya soko · AI-validated"
      />
      <SkBody>
        {/* KPI strip */}
        <SkKpiRow count={4} />
        {/* Pipeline info banner — an UNTITLED `<AdminCard>`: its heading is a `<p>` in the
            BODY, so the ghost must not draw a card header. */}
        <SkCard lines={2} title={false} />
        {/* ⚠️ "Awaiting your review" and "Approved · ready to publish" are CONDITIONAL on
            `pendingSorted.length > 0` / `approvedSorted.length > 0`. Not ghosted, on the
            same rule the payments and updown loaders follow: a loader models bands that
            render on every load, because reserving space for a queue that is empty
            over-draws exactly as badly as omitting one that is full. */}
        {/* All candidates — an UNTITLED `p-0` card whose header, filter toolbar, table and
            pager are all inside it. The header block is `px-4 lg:px-5 pt-4 pb-2 space-y-3`
            around a hand-rolled `text-body-sm` + `text-caption italic` pair (18 + 15, no
            `leading-tight` here) and then the Suspense toolbar, which is 136px:
            40 (32px search + a 40px RefreshButton) + 16 + 32 + 16 + 32. That is the
            `FilterToolbarSkeleton` the page itself renders (candidates/page.tsx:355) and
            it is CORRECT — this reserves the same band so the card does not grow by 217px
            between the loader and the page's own fallback.
            Seven columns, cells at `p-3` (52.5px rows), `PER_PAGE` = 20, and a pager
            because AI candidates accumulate. */}
        <SkTableCard
          cols={7}
          rows={20}
          minWidth={760}
          title={false}
          cellPy={16}
          pager
          beforeBody={
            <div className="px-4 lg:px-5 pt-4 pb-2 space-y-3">
              <div>
                <SkBar className="h-[18px] w-36" />
                <SkBar className="h-[15px] w-full max-w-[420px] mt-[2px]" />
              </div>
              <div className="flex items-center gap-3">
                <SkBar className="h-[32px] flex-1 max-w-[420px] rounded-md" />
                <SkBar className="h-[40px] w-[40px] rounded-md ml-auto" />
              </div>
              <div className="flex items-center gap-2">
                <SkBar className="h-6 w-[96px] rounded-pill" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkBar key={i} className="h-6 w-[64px] rounded-pill" />
                ))}
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <SkBar key={i} className="h-6 w-[80px] rounded-pill" />
                ))}
              </div>
            </div>
          }
        />
      </SkBody>
    </>
  );
}
