import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkCard, SkFormCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Two-factor authentication"
        sw="Uthibitisho wa hatua mbili"
        period={false}
        actions={<SkChip className="h-[30px] w-32" />}
      />
      <SkBody>
        {/* Intro */}
        <SkCard lines={2} title={false} />
        {/* Authenticator app */}
        <SkFormCard fields={1} titleW="w-40" />
        {/* How this works in production */}
        <SkCard lines={3} titleW="w-48" />
      </SkBody>
    </>
  );
}
