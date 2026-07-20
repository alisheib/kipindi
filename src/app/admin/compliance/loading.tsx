import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Compliance"
        sw="Kanuni"
        period={false}
        actions={<SkChip className="h-7 w-40" />}
      />
      <SkBody>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SkCard lines={4} />
          <SkCard lines={4} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
          <SkCard lines={5} />
          <SkCard lines={5} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SkCard lines={2} />
          <SkCard lines={2} />
          <SkCard lines={2} />
          <SkCard lines={2} />
        </div>
        <SkTableCard cols={5} rows={6} />
      </SkBody>
    </>
  );
}
