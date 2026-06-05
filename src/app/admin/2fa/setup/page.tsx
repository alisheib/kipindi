import { redirect } from "next/navigation";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { Smartphone } from "lucide-react";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { hasTotp } from "@/lib/server/totp";
import { TotpSetupClient } from "./setup-client";

export const metadata = { title: "Admin · 2FA setup" };
export const dynamic = "force-dynamic";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

export default async function TotpSetupPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const u = db.user.findById(session.userId);
  if (!(u && ADMIN_ROLES.has(u.role))) redirect("/auth/login");

  const enabled = hasTotp(session.userId);

  return (
    <>
      <AdminPageHead
        title="Two-factor authentication"
        sw="Uthibitisho wa hatua mbili"
        period={false}
        actions={
          <Chip size="md" variant={enabled ? "success" : "warning"}>
            {enabled ? "Enabled · Active" : "Not configured"}
          </Chip>
        }
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <AdminCard>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            Required for all ADMIN, COMPLIANCE, and MODERATOR roles. We use the open TOTP standard (RFC 6238)
            which works with Google Authenticator, Authy, 1Password, Bitwarden, and any other compatible app.
          </p>
        </AdminCard>

        <AdminCard>
          <div className="flex items-center gap-2 mb-3">
            <Smartphone size={16} className="text-royal" />
            <h2 className="font-display font-bold text-body-sm text-text">Authenticator app</h2>
          </div>
          <TotpSetupClient initiallyEnabled={enabled} />
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">How this works in production</p>
            <p>
              On admin login, after the OTP step succeeds, you&apos;ll be required to enter a 6-digit code from your
              authenticator app. Lost device? Recovery is via documented identity verification with the AML lead —
              there is no self-service reset.
            </p>
            <p>
              All 2FA events (provisioning, successful verification, removed) are recorded under <code>SECURITY</code>
              in the audit log.
            </p>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
