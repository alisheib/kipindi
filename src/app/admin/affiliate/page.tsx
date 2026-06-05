import { getAffiliateConfig } from "@/lib/server/affiliate-config";
import { getAdminAffiliateStats } from "@/lib/server/affiliate-service";
import { AffiliateAdminClient } from "./affiliate-admin-client";

export const metadata = { title: "Affiliate · Admin" };
export const dynamic = "force-dynamic";

/**
 * /admin/affiliate — the referral program control room. The admin layout
 * already gates the route (ADMIN / COMPLIANCE / MODERATOR + TOTP); the save
 * action re-checks the role for defence-in-depth.
 */
export default function AdminAffiliatePage() {
  const config = getAffiliateConfig();
  const stats = getAdminAffiliateStats();
  return (
    <div className="px-4 lg:px-6 py-6">
      <AffiliateAdminClient config={config} stats={stats} />
    </div>
  );
}
