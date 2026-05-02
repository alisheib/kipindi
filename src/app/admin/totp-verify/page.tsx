import { redirect } from "next/navigation";
import { Pattern } from "@/components/ui/pattern";
import { Card, CardBody } from "@/components/ui/card";
import { ShieldCheck, KeyRound } from "lucide-react";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { hasTotp } from "@/lib/server/totp";
import { TotpVerifyForm } from "./verify-form";

export const metadata = { title: "Admin · 2FA verification" };
export const dynamic = "force-dynamic";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

export default async function AdminTotpVerifyPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = db.user.findById(session.userId);
  const isAdmin = !!session.demoMode || (u && ADMIN_ROLES.has(u.role));
  if (!isAdmin) redirect("/");

  // If user doesn't have TOTP set up yet, send them to setup first
  if (!session.demoMode && !hasTotp(session.userId)) {
    redirect("/admin/2fa/setup");
  }

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-center px-3 py-6 bg-bg-base">
      <Pattern kind="sokoni" opacity={0.04} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-md space-y-4">
        <header className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 h-7 rounded-md bg-bg-sunken text-onBrand font-mono text-micro tracking-[0.18em] uppercase">
            <span className="h-1.5 w-1.5 rounded-pill bg-gold" />
            <span className="text-white">Step 2 of 2 · Authenticator</span>
          </div>
          <h1 className="font-display font-bold text-title-lg text-text">Enter your 6-digit code</h1>
          <p className="text-body text-text-secondary italic">Andika msimbo wa nambari sita</p>
        </header>

        <Card className="border-2 border-gold/40">
          <CardBody className="p-5 lg:p-6 space-y-4">
            <div className="flex items-start gap-2.5">
              <KeyRound size={18} className="text-gold shrink-0 mt-0.5" />
              <div className="text-caption text-text-secondary">
                <p className="font-bold text-text">Open your authenticator app</p>
                <p>Codes refresh every 30 seconds. Enter the current 6-digit code to complete admin sign-in.</p>
              </div>
            </div>
            <TotpVerifyForm />
          </CardBody>
        </Card>

        <Card className="border border-info-border bg-info-bg/15">
          <CardBody className="p-3 flex items-start gap-2.5">
            <ShieldCheck size={14} className="text-info shrink-0 mt-0.5" />
            <p className="text-caption text-text-secondary">
              The admin session lasts 8 hours after this verification. Every admin sign-in (success + fail) is recorded
              in the <code>SECURITY</code> audit category.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
