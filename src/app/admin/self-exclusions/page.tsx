import { Card, CardBody } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { Lock } from "lucide-react";

export const metadata = { title: "Admin · Self-exclusions" };

/**
 * Self-exclusion roster — shows everyone currently excluded or in cooling-off.
 * The dev/in-memory store doesn't expose iteration of `responsible`; production
 * will paginate this view from Postgres.
 */
export default function AdminSelfExclusionsPage() {
  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Self-exclusions" }]} />
      <header>
        <div className="flex items-center gap-2">
          <Lock size={18} className="text-danger" />
          <h1 className="font-display font-bold text-title-lg text-text">Self-exclusions roster</h1>
        </div>
        <p className="text-body text-text-secondary">All players currently in self-exclusion or cooling-off, with expiry timestamps.</p>
      </header>

      <Card>
        <CardBody className="p-5 space-y-3">
          <p className="text-caption text-text-secondary">In production this view paginates from Postgres:</p>
          <pre className="rounded-md bg-bg-sunken p-3 text-micro font-mono overflow-x-auto">
{`SELECT u.id, u.phoneE164, u.status, rg.selfExclusionUntil, rg.coolingOffUntil
FROM "ResponsibleGambling" rg
JOIN "User" u ON u.id = rg.userId
WHERE rg.selfExclusionUntil > NOW() OR rg.coolingOffUntil > NOW()
ORDER BY GREATEST(rg.selfExclusionUntil, rg.coolingOffUntil) ASC;`}
          </pre>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Chip size="sm" variant="danger">SELF_EXCLUDED</Chip>
            <Chip size="sm" variant="warning">COOLED_OFF</Chip>
            <span className="text-caption text-text-tertiary">— exported nightly to GBT compliance file (CSV, signed).</span>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-info-border bg-info-bg/15">
        <CardBody className="p-4 text-caption text-text-secondary space-y-1">
          <p className="text-text font-bold">Cross-operator register (planned, Q3 2026)</p>
          <p>The Tanzania Gaming Board's planned cross-operator self-exclusion register will accept a daily SFTP upload of these rows so a player who self-excludes on Kipindi is also blocked at all licensed competitors.</p>
        </CardBody>
      </Card>
    </div>
  );
}
