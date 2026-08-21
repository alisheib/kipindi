import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * /admin/staff loader. The page has no header action, four KPI tiles, an
 * "Add staff" form card whose fields are 3-up at sm+ (hence `cols`), the staff
 * table at SIX columns, and the "How roles work" note.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="Staff" sw="Wafanyakazi" />
      <SkBody>
        {/* Headcount */}
        <SkKpiRow count={4} />
        {/* Add staff — phone · role · reason, then the submit button */}
        <SkFormCard fields={3} cols="sm:grid-cols-3" titleW="w-24" />
        {/* Staff table — Person · Phone · Role · Status · Last login · Manage */}
        <SkTableCard cols={6} rows={8} title={false} />
        {/* How roles work */}
        <SkCard lines={3} titleW="w-32" />
      </SkBody>
    </>
  );
}
