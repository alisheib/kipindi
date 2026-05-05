import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { NewMarketWizard } from "./wizard";

export const metadata = { title: "Admin · New market" };
export const dynamic = "force-dynamic";

export default function NewMarketPage() {
  return (
    <>
      <AdminPageHead title="New market" sw="Soko jipya" period={false} />
      <div className="px-4 lg:px-6 py-5">
        <AdminCard>
          <NewMarketWizard />
        </AdminCard>
      </div>
    </>
  );
}
