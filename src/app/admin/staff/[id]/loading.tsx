import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * /admin/staff/[id] loader. Identity card, the role form (role + reason, 2-up,
 * then a consequence line and the submit), and the role-history table at FOUR
 * columns — When · Change · By · Reason.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="Staff member" sw="Mfanyakazi" />
      <SkBody>
        {/* Identity + current role */}
        <SkCard lines={2} titleW="w-44" />
        {/* Assign role */}
        <SkFormCard fields={2} titleW="w-16" />
        {/* Role history */}
        <SkTableCard cols={4} rows={4} minWidth={560} headW="w-28" />
      </SkBody>
    </>
  );
}
