import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Events" sw="Matukio" period={false} />
      <SkBody>
        {/* Why this exists */}
        <SkCard lines={3} titleW="w-40" />
        {/* Category / add-event form */}
        <SkCard lines={2} />
        {/* Upcoming list */}
        <SkCard lines={5} />
      </SkBody>
    </>
  );
}
