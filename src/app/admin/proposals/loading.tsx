import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkChip, SkBlock } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Market proposals" sw="Mapendekezo ya masoko" period={false} actions={<SkChip />} />
      <SkBody>
        <SkKpiRow count={4} />
        {/* Client-owned queue + review + config editor */}
        <SkBlock height={320} />
      </SkBody>
    </>
  );
}
