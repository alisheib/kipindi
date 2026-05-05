import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { UserCircle2, Download, AlertOctagon, Activity } from "lucide-react";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getOwnActivity } from "@/lib/server/user-service";
import { CloseAccountForm } from "./close-account-form";
import { ExportDataButton } from "./export-data-button";

export const metadata = { title: "My account · Akaunti yangu" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const user = db.user.findById(session.userId);
  const activity = getOwnActivity(session.userId, 50);

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-start justify-center px-3 py-8">
      <Pattern kind="sokoni" opacity={0.03} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-3xl space-y-5 min-w-0">
        <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "Account", labelSw: "Akaunti" }]} />

        <header>
          <div className="flex items-center gap-2">
            <UserCircle2 size={20} className="text-royal" />
            <p className="font-mono text-caption uppercase tracking-[0.32em] text-royal font-bold">My account</p>
          </div>
          <h1 className="font-display font-bold text-title-lg text-text mt-1.5">Akaunti yangu · My account</h1>
        </header>

        {/* PROFILE SUMMARY */}
        <Card>
          <CardBody className="p-5 space-y-2">
            <h2 className="font-display font-bold text-title-sm text-text">Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-body-sm">
              <Item label="Display name" value={user?.displayName ?? "—"} />
              <Item label="Phone" value={user?.phoneE164 ? `${user.phoneE164.slice(0, 4)}*****${user.phoneE164.slice(-2)}` : "—"} />
              <Item label="Region" value={user?.region ?? "—"} />
              <Item label="Status" value={<Chip size="sm" variant={user?.status === "ACTIVE" ? "success" : "warning"}>{user?.status ?? "—"}</Chip>} />
              <Item label="Account opened" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB") : "—"} />
              <Item label="Last login" value={user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-GB") : "—"} />
            </div>
          </CardBody>
        </Card>

        {/* OWN ACTIVITY FEED */}
        <Card>
          <CardBody className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-royal" />
              <h2 className="font-display font-bold text-title-sm text-text">My activity</h2>
              <span className="text-caption text-text-tertiary">{activity.length} events</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-caption">
                <thead className="text-text-tertiary uppercase tracking-wide">
                  <tr className="border-b border-border-subtle">
                    <th className="text-left p-2">When</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Action</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  {activity.slice(0, 30).map((e) => (
                    <tr key={e.id} className="border-b border-border-subtle/50">
                      <td className="p-2 font-mono whitespace-nowrap">{e.createdAt.replace("T", " ").slice(0, 19)}</td>
                      <td className="p-2 font-mono">{e.category}</td>
                      <td className="p-2 text-text font-medium">{e.action}</td>
                    </tr>
                  ))}
                  {activity.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-text-tertiary">No activity yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* DATA EXPORT — GDPR Art 15 / PDPA */}
        <Card>
          <CardBody className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-royal" />
              <h2 className="font-display font-bold text-title-sm text-text">Export my data · Pakua data yangu</h2>
            </div>
            <p className="text-body-sm text-text-secondary leading-relaxed">
              Get a structured copy of every record we hold on you — profile, KYC, wallet, bets, transactions, settings, and audit trail.
              GDPR Article 15 / Tanzania PDPA right of access.
            </p>
            <div className="pt-2">
              <ExportDataButton />
            </div>
          </CardBody>
        </Card>

        {/* CLOSE ACCOUNT — GDPR Art 17 */}
        <Card className="border-2 border-danger/40 bg-danger-bg/10">
          <CardBody className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertOctagon size={16} className="text-danger" />
              <h2 className="font-display font-bold text-title-sm text-text">Close my account · Funga akaunti</h2>
              <Chip size="sm" variant="danger">One-way</Chip>
            </div>
            <p className="text-body-sm text-text-secondary leading-relaxed">
              Closing your account freezes the wallet, ends marketing communication, and signs you out.
              Active bets continue to settle so payouts arrive correctly. Financial and KYC records are retained for 7 years
              per Tanzanian AML law (POCA Cap 423) before erasure.
              <br /><span className="italic">Funga akaunti: pochi imefungwa. Madau yaliyowekwa yataendelea kupokelewa.</span>
            </p>
            <CloseAccountForm />
            <p className="text-micro text-text-tertiary">
              Need help instead? Email <span className="font-mono">support@50pick.com</span> or call <span className="font-mono">+255 22 211 5811</span>.
            </p>
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
      <p className="text-body-sm font-medium text-text mt-0.5">{value}</p>
    </div>
  );
}
