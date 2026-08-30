import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkChip, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

/** The audit rail is `"All"` plus one link per `CATEGORIES` entry, and `CATEGORIES`
 *  (audit/page.tsx:18) is the eight-member AuditCategory list — so NINE, not six. */
const RAIL_LINKS = 9;

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Audit log"
        sw="Kumbukumbu · append-only HMAC-chained"
        /* `<GenerateButton id="iso-audit" />` is an `inline-flex gap-1.5` holding TWO
           `btn btn-ghost btn-sm rounded-pill` buttons (Excel, PDF) — 40px each, ~178px
           together. The single 96px chip was the right HEIGHT and half the width. */
        actions={
          <div className="inline-flex items-center gap-1.5">
            <SkChip className="h-[40px] w-[88px]" />
            <SkChip className="h-[40px] w-[84px]" />
          </div>
        }
      />
      <SkBody>
        <SkKpiRow count={3} cols="grid-cols-1 sm:grid-cols-3" />
        {/* Category rail. ⛔ NINE items at 44px, not six at 40: every pill is a
            `Chip size="lg"` (25px) inside a `min-h-[44px]` Link — the tap target is the
            link, and audit/page.tsx:143-147 says so. Six 40px ghosts for nine 44px links
            wrapped one row short at 390. `items-center` and the `ml-auto` entry count
            are the page's own. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: RAIL_LINKS }).map((_, i) => (
            <SkChip key={i} className="h-[44px] w-[88px]" />
          ))}
          <SkBar className="h-[14px] w-[96px] ml-auto" />
        </div>
        {/* The log — an UNTITLED `p-0` card. `rows={20}` because the page slices
            `PER_PAGE` (pagination.tsx:13) and the audit chain is append-only, so in
            production the page is always full; `sortable` because four of the six
            headers are `SortTh`; `pager` for the same reason `rows` is 20. */}
        <SkTableCard cols={6} rows={20} title={false} sortable pager />
      </SkBody>
    </>
  );
}
