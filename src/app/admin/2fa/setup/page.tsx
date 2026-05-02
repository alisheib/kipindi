import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { ShieldCheck, Smartphone } from "lucide-react";
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
  if (!session.demoMode && !(u && ADMIN_ROLES.has(u.role))) redirect("/auth/login");

  const enabled = hasTotp(session.userId);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "2FA setup" }]} />

      <header>
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-success" />
          <p className="font-mono text-caption uppercase tracking-[0.32em] text-success font-bold">Two-factor authentication</p>
        </div>
        <h1 className="font-display font-bold text-title-lg text-text mt-1.5">Authenticator app · 2FA</h1>
        <p className="text-body text-text-secondary mt-2 max-w-prose">
          Required for all ADMIN, COMPLIANCE, and MODERATOR roles. We use the open TOTP standard (RFC 6238)
          which works with Google Authenticator, Authy, 1Password, Bitwarden, and any other compatible app.
        </p>
      </header>

      <Card>
        <CardBody className="p-5 lg:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-royal" />
              <h2 className="font-display font-bold text-title-sm text-text">Status</h2>
            </div>
            <Chip size="md" variant={enabled ? "success" : "warning"}>
              {enabled ? "Enabled · Active" : "Not configured"}
            </Chip>
          </div>
          <TotpSetupClient initiallyEnabled={enabled} />
        </CardBody>
      </Card>

      <Card className="border border-info-border bg-info-bg/15">
        <CardBody className="p-4 text-caption text-text-secondary space-y-1">
          <p className="text-text font-bold">How this works in production</p>
          <p>
            On admin login, after the OTP step succeeds, you&apos;ll be required to enter a 6-digit code from your
            authenticator app. Lost device? Recovery is via documented identity verification with the AML lead — there
            is no self-service reset.
          </p>
          <p>
            All 2FA events (provisioning, successful verification, removed) are recorded under <code>SECURITY</code>
            in the audit log.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
