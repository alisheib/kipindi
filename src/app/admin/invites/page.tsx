import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { listCampaigns, getInviteStats } from "@/lib/server/invite-service";
import { formatTzs, formatDateShort } from "@/lib/utils";
import { CreateCampaignForm } from "./invite-admin-client";

export const metadata = { title: "Invites · Admin" };
export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, "active" | "resolved" | "paused" | "pending"> = {
  DRAFT: "pending", SENDING: "active", SENT: "resolved", CANCELLED: "paused",
};

export default async function AdminInvitesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const [campaigns, stats] = await Promise.all([listCampaigns().catch(() => []), getInviteStats().catch(() => ({ campaigns: 0, totalInvites: 0, totalRegistered: 0, conversionPct: 0 }))]);
  const page = parsePage(sp.page, campaigns.length);
  const pageRows = campaigns.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const base = buildBaseHref("/admin/invites", sp);

  return (
    <>
      <AdminPageHead title="Invite campaigns" sw="Kampeni za mialiko" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Campaigns" sw="Kampeni" value={stats.campaigns.toLocaleString()} delta="all-time" deltaDir="flat" />
          <AdminKpi label="Invites sent" sw="Mialiko" value={stats.totalInvites.toLocaleString()} delta="contacts" deltaDir="flat" />
          <AdminKpi label="Registered" sw="Waliojiunga" value={stats.totalRegistered.toLocaleString()} delta="from invites" deltaDir="flat" />
          <AdminKpi label="Conversion" sw="Ubadilishaji" value={`${stats.conversionPct}%`} delta="registered/invited" deltaDir="flat" />
        </div>

        <AdminCard title="New campaign" sw="Kampeni mpya">
          <CreateCampaignForm />
        </AdminCard>

        <AdminCard title="Campaigns" sw="Kampeni zote" padding={campaigns.length > 0 ? "p-0" : "p-4"}>
          {campaigns.length === 0 ? (
            <EmptyState
              kind="admin"
              title="No campaigns yet"
              titleSw="Hakuna kampeni bado"
              body="Create one above to start inviting players and granting sign-up bonuses."
              bodySw="Tengeneza moja juu kuanza kualika wachezaji."
            />
          ) : (
            <>
            <ScrollX label="Invite campaigns">
              <table className="admin-tbl min-w-[720px]">
                <thead>
                  <tr>
                    <th className="text-left">Campaign</th>
                    <th className="text-left">Code</th>
                    <th className="text-right">Bonus</th>
                    <th className="text-right">Invited</th>
                    <th className="text-right">Registered</th>
                    <th className="text-left">Created</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => (
                    <tr key={c.id}>
                      <td><Link href={`/admin/invites/${c.id}` as Route} className="font-semibold text-text hover:text-brand-300 transition-colors">{c.name}</Link></td>
                      <td className="font-mono text-text-muted">{c.code}</td>
                      <td className="text-right font-mono font-semibold text-text">{formatTzs(c.bonusAmountTzs)}</td>
                      <td className="text-right font-mono text-text-muted">{c.totalInvites.toLocaleString()}</td>
                      <td className="text-right font-mono text-text-muted">{c.totalRegistered.toLocaleString()}</td>
                      <td className="font-mono text-text-subtle whitespace-nowrap">{formatDateShort(c.createdAt)}</td>
                      <td><Chip size="sm" variant={STATUS_CHIP[c.status] ?? "paused"}>{c.status.toLowerCase()}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
            <AdminPagination total={campaigns.length} page={page} baseHref={base} />
            </>
          )}
        </AdminCard>
      </div>
    </>
  );
}
