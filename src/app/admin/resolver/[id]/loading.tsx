import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkChip, SkCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Resolution ceremony"
        sw="Sherehe ya utatuzi"
        period={false}
        actions={<SkChip className="h-7 w-20" />}
      />
      {/* Two-column detail — matches the page's own wrapper (no space-y). */}
      <div className="px-4 lg:px-6 py-5 animate-pulse">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-start">
          {/* Evidence (left) */}
          <div className="space-y-4">
            <SkCard lines={4} />
            <SkCard lines={4} />
            <SkCard lines={4} />
          </div>
          {/* Verdict rail (right) */}
          <div className="space-y-4">
            <SkCard lines={5} />
            <SkCard lines={5} />
            <SkCard lines={5} />
          </div>
        </div>
      </div>
    </>
  );
}
