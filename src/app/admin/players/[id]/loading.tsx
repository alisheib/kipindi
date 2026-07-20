import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkCard, SkKpiRow } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Player profile"
        sw="Wasifu wa mchezaji"
        period={false}
        actions={
          <>
            <SkChip className="h-8 w-20" />
            <SkChip className="h-8 w-24" />
          </>
        }
      />
      <SkBody>
        <SkCard lines={3} titleW="w-48" />
        <SkKpiRow count={4} />
        <SkCard lines={6} titleW="w-56" />
        <SkCard lines={3} titleW="w-40" />
      </SkBody>
    </>
  );
}
