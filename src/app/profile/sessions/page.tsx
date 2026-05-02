import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { MonitorSmartphone, LogOut, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/server/session";
import { headers } from "next/headers";
import Link from "next/link";

export const metadata = { title: "Active sessions · Vifaa" };
export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
  const issued = new Date(session.iat).toLocaleString("en-GB");
  const expires = new Date(session.exp).toLocaleString("en-GB");

  // Coarse device parsing — just enough to identify mobile vs desktop in the UI
  const ua = userAgent.toLowerCase();
  const device = /iphone|android|ipad|mobile/.test(ua) ? "Mobile" : "Desktop / Laptop";
  const browser = /chrome\//.test(ua) ? "Chrome"
    : /safari\//.test(ua) && !/chrome/.test(ua) ? "Safari"
    : /firefox\//.test(ua) ? "Firefox"
    : /edg\//.test(ua) ? "Edge"
    : "Unknown";

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-start justify-center px-3 py-8">
      <Pattern kind="sokoni" opacity={0.03} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-2xl space-y-4">
        <Breadcrumbs items={[
          { label: "Profile", href: "/profile" },
          { label: "Sessions", labelSw: "Vifaa" },
        ]} />

        <header>
          <div className="flex items-center gap-2">
            <MonitorSmartphone size={20} className="text-royal" />
            <p className="font-mono text-caption uppercase tracking-[0.32em] text-royal font-bold">Active sessions</p>
          </div>
          <h1 className="font-display font-bold text-title-lg text-text mt-1.5">Devices &amp; sessions · Vifaa</h1>
          <p className="text-body text-text-secondary mt-2">Sign out from this device or revoke a session anywhere it&apos;s open.</p>
        </header>

        <Card className="border-2 border-royal/40 bg-royal-subtle/30">
          <CardBody className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <MonitorSmartphone size={18} className="text-royal" />
                <p className="font-display font-bold text-title-sm text-text">{device} · {browser}</p>
                <Chip size="sm" variant="success">This device</Chip>
              </div>
              <Link href="/auth/logout">
                <Button variant="danger" size="md" leading={<LogOut size={14} />}>Sign out</Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 text-caption">
              <Item label="Session id" value={<span className="font-mono">{session.sessionId.slice(0, 22)}…</span>} />
              <Item label="IP address" value={<span className="font-mono">{ip}</span>} />
              <Item label="Issued" value={issued} />
              <Item label="Expires" value={expires} />
              <Item label="Role" value={session.role} />
              <Item label="KYC" value={session.kycStatus} />
            </div>
          </CardBody>
        </Card>

        <Card className="border border-info-border bg-info-bg/15">
          <CardBody className="p-4 flex items-start gap-3">
            <ShieldCheck size={18} className="text-info shrink-0 mt-0.5" />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">Multi-device tracking (production)</p>
              <p>This build keeps one session cookie per browser. Production stores every session in the
              <code> Session</code> Postgres table, so you can see all devices currently signed in (current phone,
              the other phone, the browser at the office) and revoke any of them remotely. Revocation invalidates
              the cookie + forces a fresh OTP on the next request from that device.</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-bg-sunken/40 px-3 py-2">
      <p className="text-caption uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className="text-body-sm font-medium text-text mt-0.5 break-all">{value}</p>
    </div>
  );
}
