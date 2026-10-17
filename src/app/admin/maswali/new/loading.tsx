import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Draft a week" sw="Andaa wiki" />
      <SkBody>
        <SkCard lines={2} titleW="w-0" />
        <SkCard lines={8} titleW="w-16" />
        <SkCard lines={8} titleW="w-16" />
      </SkBody>
    </>
  );
}
