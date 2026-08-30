import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkCard, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Data retention schedule"
        sw="Ratiba ya kuhifadhi data"
        /* ⛔ NOT 40px. The page's action is `<Chip size="md" variant="neutral">`, and
           `neutral` is not in chip.tsx's `isStatus` set, so it takes `sizeStyles.md.base`
           — height 21. The `h-7` ghost drew 40. */
        actions={<SkChip className="h-[21px] w-[112px]" />}
      />
      <SkBody>
        <SkKpiRow count={4} />
        {/* Schedule — a titled `p-0` card whose table is `min-w-[720px]` and whose cells
            are `p-3` (16px), not `.admin-tbl`'s 12: rows are 52.5px, not 44.5. Ten rows,
            because `SCHEDULE` (retention/page.tsx:33) has ten entries and they are all
            rendered unconditionally. */}
        <SkTableCard cols={5} rows={10} minWidth={720} cellPy={16} />
        {/* ⛔ `lg:grid-cols-2`, NOT `md:` — retention/page.tsx's own band steps at `lg`,
            so between 768 and 1023 this ghost was 2-up while the page was 1-up. Both
            cards are UNTITLED (the info and the AML-conflict warning). */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkCard lines={3} title={false} />
          <SkCard lines={3} title={false} />
        </div>
        {/* "Purge a chain and its history" — a titled card holding `PurgeChainCard`.
            It had no ghost: a claret purge ceremony appeared from nothing on every load. */}
        <SkCard lines={5} titleW="w-52" />
      </SkBody>
    </>
  );
}
