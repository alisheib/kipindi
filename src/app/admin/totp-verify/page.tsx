import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { hasTotp } from "@/lib/server/totp";
import { TotpVerifyForm } from "./verify-form";

export const metadata = { title: "Admin · 2FA verification" };
export const dynamic = "force-dynamic";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

export default async function AdminTotpVerifyPage({ searchParams }: { searchParams?: Promise<{ next?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  const isAdmin = u && ADMIN_ROLES.has(u.role);
  if (!isAdmin) redirect("/");

  // When TOTP is globally disabled via env var, skip straight to admin.
  if (process.env.DISABLE_ADMIN_TOTP === "true") {
    const nextRaw2 = (await searchParams)?.next ?? "";
    const dest = nextRaw2.startsWith("/admin") && !nextRaw2.startsWith("//") ? nextRaw2 : "/admin";
    redirect(dest as never);
  }

  if (!(await hasTotp(session.userId))) {
    redirect("/admin/2fa/setup");
  }

  const nextRaw = (await searchParams)?.next ?? "";
  // Open-redirect safety: only an in-app /admin path may be carried through.
  const next = nextRaw.startsWith("/admin") && !nextRaw.startsWith("//") && !nextRaw.startsWith("/admin/totp-verify") ? nextRaw : "";

  return (
    <main className="mx-auto grid min-h-[calc(100vh-44px)] place-items-center px-3 py-6">
      <div className="w-full max-w-md space-y-4">
        <header className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 h-7 rounded-pill border border-gold-700 bg-gold-500/10">
            <span className="h-1.5 w-1.5 rounded-pill bg-gold-300" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-gold-300">
              Step 2 of 2 · Authenticator
            </span>
          </div>
          <h1 className="font-display text-[26px] font-bold text-text leading-tight tracking-[-0.02em]">
            Enter your 6-digit code
          </h1>
          <p className="text-[13px] italic text-text-subtle">Andika msimbo wa nambari sita</p>
        </header>

        <section
          className="relative overflow-hidden rounded-xl border border-gold-700 bg-bg-elevated p-5 lg:p-6 space-y-4"
          style={{ boxShadow: "0 0 0 1px color-mix(in oklab, var(--gilt) 30%, transparent) inset" }}
        >
          <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
            <FiftyMark size={140} />
          </div>
          <div className="relative flex items-start gap-2.5">
            <I.keyRound size={16} className="text-gold-300 shrink-0 mt-0.5" />
            <div className="text-[12.5px] text-text-muted">
              <p className="font-display font-semibold text-text">Open your authenticator app</p>
              <p>Codes refresh every 30 seconds. Enter the current 6-digit code to complete admin sign-in.</p>
            </div>
          </div>
          <div className="relative">
            <TotpVerifyForm next={next} />
          </div>
        </section>

        <section className="flex items-start gap-2.5 rounded-xl border border-info-border bg-info-bg/[0.10] p-3.5">
          <I.shieldcheck s={14} />
          <p className="text-[12px] text-text-muted">
            The admin session lasts 8 hours after this verification. Every admin sign-in (success + fail)
            is recorded in the <span className="font-mono text-text-muted">SECURITY</span> audit category.
          </p>
        </section>
      </div>
    </main>
  );
}
