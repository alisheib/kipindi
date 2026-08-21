import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkChip, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Transactions"
        sw="Miamala"
        actions={<SkChip className="h-[38px] w-28" />}
      />
      {/* ⚠️ Corrected 2026-08-21. This loader used to say, in a comment, that the
          page "has NO px body wrapper of its own" and mirrored that with a bare
          `animate-pulse` div — true when it was written, false since the page
          gained `px-4 lg:px-6 py-5 space-y-4` (its own B7 note is right above the
          wrapper in page.tsx). The skeleton was therefore drawing flush to the
          sidebar and the real page then stepped in by 16/24px on every load of
          the money-movements screen. <SkBody> IS that wrapper — mirror the page
          by composing it, never by re-typing the classes. */}
      <SkBody>
        {/* Compliance totals */}
        <SkKpiRow count={4} />
        {/* Attention chips — the page renders these only when something is
            flagged, and they are min-h-[40px] pills, not 26px chips. */}
        <div className="flex flex-wrap gap-2">
          <SkChip className="h-[40px] w-52" />
          <SkChip className="h-[40px] w-44" />
          <SkChip className="h-[40px] w-36" />
        </div>
        {/* Filter card */}
        <SkFormCard fields={4} />
        {/* Movements table — 10 columns, min-w-[1100px] (page.tsx `admin-tbl`). */}
        <SkTableCard cols={10} rows={12} minWidth={1100} headW="w-40" />
      </SkBody>
    </>
  );
}
