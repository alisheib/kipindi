import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkChip, SkCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="KYC workstation"
        sw="Kituo cha uthibitisho"
        period={false}
        actions={<SkChip className="h-7 w-28" />}
      />
      {/* Two-column detail — matches the page's own wrapper (no space-y). */}
      <div className="px-4 lg:px-6 py-5 animate-pulse">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-start">
          {/* Document viewer + applicant (left) */}
          <div className="space-y-4">
            <SkCard lines={6} />
            <SkCard lines={5} />
          </div>
          {/* Risk score + decision (right) */}
          <div className="space-y-4">
            <SkCard lines={4} />
            <SkCard lines={5} />
          </div>
        </div>
      </div>
    </>
  );
}
