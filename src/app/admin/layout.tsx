import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { Pattern } from "@/components/ui/pattern";
import { Chip } from "@/components/ui/chip";
import { ShieldCheck, Activity, Users, FileSearch, AlertTriangle, Lock } from "lucide-react";

const ADMIN_NAV: Array<{ href: string; label: string; sub: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { href: "/admin",                  label: "Overview",          sub: "Status + KPIs",         icon: Activity },
  { href: "/admin/audit",            label: "Audit log",         sub: "Every state change",    icon: FileSearch },
  { href: "/admin/players",          label: "Players",           sub: "Search + freeze",       icon: Users },
  { href: "/admin/aml",              label: "AML / EDD queue",   sub: "Suspicious activity",   icon: AlertTriangle },
  { href: "/admin/self-exclusions",  label: "Self-exclusions",   sub: "RG roster",             icon: Lock },
];

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/auth/login?return=/admin");
  const u = db.user.findById(session.userId);
  // Demo manager session is granted admin view for the walkthrough.
  const allowed = !!session.demoMode || (u && ADMIN_ROLES.has(u.role));
  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl px-3 py-12 text-center space-y-3">
        <ShieldCheck size={36} className="mx-auto text-warning" />
        <h1 className="font-display font-bold text-title-md text-text">Restricted area</h1>
        <p className="text-body text-text-secondary">This dashboard is only accessible to ADMIN, COMPLIANCE, and MODERATOR roles.</p>
      </div>
    );
  }
  return (
    <div className="relative">
      <Pattern kind="sokoni" opacity={0.025} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative mx-auto max-w-[1400px] px-3 lg:px-6 py-5 lg:py-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 lg:gap-8">
        <aside className="space-y-1 lg:sticky lg:top-20 self-start">
          <div className="flex items-center gap-2 mb-3">
            <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Admin · Msimamizi</p>
            {session.demoMode && <Chip size="sm" variant="brand">DEMO</Chip>}
          </div>
          {ADMIN_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href as never}
              className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-surface-2 transition-colors text-text-secondary hover:text-text group"
            >
              <n.icon size={16} className="text-text-tertiary group-hover:text-royal mt-0.5" />
              <div>
                <p className="font-medium text-text leading-tight">{n.label}</p>
                <p className="text-caption text-text-tertiary leading-tight">{n.sub}</p>
              </div>
            </Link>
          ))}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
