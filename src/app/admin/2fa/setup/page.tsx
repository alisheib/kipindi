import { redirect } from "next/navigation";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { hasTotp } from "@/lib/server/totp";
import { TotpSetupClient } from "./setup-client";
import { isStaffRole } from "@/lib/server/roles";
import { AdminBody } from "@/components/admin/admin-body";

export const metadata = { title: "Admin · 2FA setup" };
export const dynamic = "force-dynamic";

// RBAC: any staff role may open the console + enrol 2FA (see isStaffRole).

export default async function TotpSetupPage({ searchParams }: { searchParams?: Promise<{ next?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!(u && isStaffRole(u.role))) redirect("/auth/admin");

  const enabled = await hasTotp(session.userId);
  // B-28 — the enrolment gate now carries where the officer was heading
  // (requireAdminTotp threads it); after enabling, the client offers the way
  // back instead of dead-ending on this page. /admin paths only.
  const nextRaw = (await searchParams)?.next ?? "";
  const next = nextRaw.startsWith("/admin") && !nextRaw.startsWith("//") && !nextRaw.startsWith("/admin/2fa/setup") ? nextRaw : "";

  return (
    <>
      <AdminPageHead
        title="Two-factor authentication"
        sw="Uthibitisho wa hatua mbili"
        actions={
          <Chip size="md" variant={enabled ? "success" : "warning"}>
            {enabled ? "Enabled · Active" : "Not configured"}
          </Chip>
        }
      />
      {/* DESIGN_AUTHORITY B7 — this route is in the layout's TOTP_EXEMPT set, so
          admin/layout.tsx returns a bare fragment for it: no sidebar, and none of
          the console measure. It was the single widest surface in the product —
          a QR-enrolment form spanning the ENTIRE viewport. It caps itself. */}
      <AdminBody className="mx-auto w-full max-w-form" data-measure="form">
        <AdminCard>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            Required for all ADMIN, COMPLIANCE, and MODERATOR roles. We use the open TOTP standard (RFC 6238)
            which works with Google Authenticator, Authy, 1Password, Bitwarden, and any other compatible app.
          </p>
        </AdminCard>

        <AdminCard>
          <div className="flex items-center gap-2 mb-3">
            <I.smartphone s={16} className="text-royal-300" />
            <h2 className="font-display font-bold text-body-sm text-text">Authenticator app</h2>
          </div>
          <TotpSetupClient initiallyEnabled={enabled} next={next} />
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">How this works in production</p>
            <p>
              On admin login, after the OTP step succeeds, you&apos;ll be required to enter a 6-digit code from your
              authenticator app. Lost device? Recovery is via documented identity verification with the AML lead —
              there is no self-service reset.
            </p>
            <p>
              All 2FA events (provisioning, successful verification, removed) are recorded under <code>SECURITY</code>{" "}
              in the audit log.
            </p>
          </div>
        </AdminCard>
      </AdminBody>
    </>
  );
}
