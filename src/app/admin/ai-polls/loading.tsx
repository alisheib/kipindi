import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkKpiRow, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="AI poll generation"
        sw="Uzalishaji wa kura · Claude AI"
      />
      <SkBody>
        {/* KPI strip */}
        <SkKpiRow count={4} />
        {/* Provider banner + generate form + batch form — an UNTITLED `<AdminCard>`
            (its heading is a `<p>` in the body), holding two forms. */}
        <SkFormCard fields={3} title={false} afterFields={<SkBar className="h-[76px] w-full rounded-md" />} />
        {/* Generation settings — also UNTITLED: the "Generation settings" heading is a
            `<p>` beside an icon, inside the body, not the card's own `title`. */}
        <SkFormCard fields={3} title={false} />
        {/* ⚠️ The pending-review and approved queues are CONDITIONAL on
            `pendingSorted.length > 0` / `approvedSorted.length > 0` — not ghosted, on the
            same rule the payments, candidates and updown loaders follow. */}
        {/* All generations — an UNTITLED `p-0` card carrying its own header block, the
            Suspense filter toolbar (136px: 40 + 16 + 32 + 16 + 32, mirroring the page's
            own `FilterToolbarSkeleton`), a NINE-column `min-w-[760px]` table whose cells
            are `p-3`, and an `AdminPagination`.
            ⛔ `cols={6}` was three columns short — the header is State · Category · Title ·
            Quality · Confidence · Sources · Created · Cost · Actions — and `rows={6}` was
            fourteen rows short of `PER_PAGE`. */}
        <SkTableCard
          cols={9}
          rows={20}
          minWidth={760}
          title={false}
          cellPy={16}
          pager
          beforeBody={
            <div className="px-4 lg:px-5 pt-4 pb-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <SkBar className="h-[18px] w-40" />
                  <SkBar className="h-[15px] w-full max-w-[420px] mt-[2px]" />
                </div>
                <SkBar className="h-[40px] w-[112px] rounded-md" />
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
                {Array.from({ length: 8 }).map((_, i) => (
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
