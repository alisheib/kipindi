import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Millionea · Ticket lookup" sw="Tafuta tiketi" />
      <SkBody>
        {/* The lookup — one titled card: a line of prose and the two fields. */}
        <SkCard lines={3} titleW="w-[120px]" />
        {/* The desk's scripts — one titled card of prose. */}
        <SkCard lines={8} titleW="w-[180px]" />
      </SkBody>
    </>
  );
}
