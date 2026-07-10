import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { getCampaignDetail } from "@/lib/server/invite-service";
import { smsConfigured } from "@/lib/server/sms";
import { formatTzs, formatDateShort } from "@/lib/utils";
import { CampaignControls } from "../invite-admin-client";

export const metadata = { title: "Campaign · Admin" };
export const dynamic = "force-dynamic";

const ENTRY_CHIP: Record<string, "active" | "resolved" | "paused" | "pending" | "objection"> = {
  QUEUED: "pending", SENT: "active", DELIVERED: "active", REGISTERED: "resolved", FAILED: "objection", BOUNCED: "objection",
};
const STATUS_CHIP: Record<string, "active" | "resolved" | "paused" | "pending"> = {
  DRAFT: "pending", SENDING: "active", SENT: "resolved", CANCELLED: "paused",
};

export default async function AdminCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let detail: Awaited<ReturnType<typeof getCampaignDetail>> = null;
  try { detail = await getCampaignDetail(id); } catch { /* graceful */ }
  if (!detail) notFound();
  const { campaign, entries, counts } = detail;
  const queued = counts.QUEUED ?? 0;
  const smsLive = smsConfigured();
  const queuedPhone = entries.filter((e) => e.contactType === "PHONE" && e.status === "QUEUED").length;

  return (
    <>
      <AdminPageHead
        title={campaign.name}
        sw={`Code ${campaign.code}`}
        period={false}
        actions={<Chip size="sm" variant={STATUS_CHIP[campaign.status] ?? "paused"}>{campaign.status.toLowerCase()}</Chip>}
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <Link href={"/admin/invites" as Route} className="inline-flex items-center gap-1 text-caption text-text-tertiary hover:text-text transition-colors">
          <I.chevronLeft s={13} /> All campaigns
        </Link>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Bonus per invitee" sw="Bonasi" value={formatTzs(campaign.bonusAmountTzs)} delta={`${campaign.wagerMultiplier}× wagering`} deltaDir="flat" />
          <AdminKpi label="Invited" sw="Walioalikwa" value={campaign.totalInvites.toLocaleString()} delta={`${queued} queued`} deltaDir="flat" />
          <AdminKpi label="Registered" sw="Waliojiunga" value={campaign.totalRegistered.toLocaleString()} delta={`${counts.SENT ?? 0} sent`} deltaDir="flat" />
          <AdminKpi label="Expiry" sw="Muda" value={`${campaign.expiresInDays}d`} delta="bonus validity" deltaDir="flat" />
        </div>

        {!smsLive && queuedPhone > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning-fg/40 bg-warning/10 px-3.5 py-3 text-[12.5px] text-text-muted">
            <span className="text-warning-fg shrink-0 mt-0.5"><I.warning s={15} /></span>
            <span>
              <span className="font-semibold text-text">{queuedPhone} phone {queuedPhone === 1 ? "invite is" : "invites are"} waiting.</span>{" "}
              SMS isn&apos;t live yet, so phone invites stay queued (email invites send normally). They&apos;ll go out automatically once an SMS provider is configured — set <span className="font-mono">SMS_PROVIDER</span>, <span className="font-mono">SMS_API_KEY</span> and <span className="font-mono">SMS_SENDER_ID</span>, then press Send again.
            </span>
          </div>
        )}

        <AdminCard title="Manage" sw="Simamia">
          <CampaignControls campaignId={campaign.id} status={campaign.status} queued={queued} smsLive={smsLive} />
        </AdminCard>

        <AdminCard title="Contacts" sw="Anwani" padding={entries.length > 0 ? "p-0" : "p-4"}>
          {entries.length === 0 ? (
            <EmptyState
              kind="admin"
              title="No contacts yet"
              titleSw="Hakuna anwani bado"
              body="Add email or phone contacts above, then press Send to deliver the invites."
              bodySw="Ongeza barua pepe au simu juu, kisha bonyeza Tuma."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-tbl min-w-[560px]">
                <thead>
                  <tr>
                    <th className="text-left">Contact</th>
                    <th className="text-left">Type</th>
                    <th className="text-right">Bonus</th>
                    <th className="text-left">Sent</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="font-mono text-text-muted">{e.contactValue}</td>
                      <td className="text-text-subtle">{e.contactType === "EMAIL" ? "Email" : "Phone"}</td>
                      <td className="text-right font-mono text-text">{formatTzs(e.bonusAmountTzs)}</td>
                      <td className="font-mono text-text-subtle whitespace-nowrap">{e.sentAt ? formatDateShort(e.sentAt) : "—"}</td>
                      <td><Chip size="sm" variant={ENTRY_CHIP[e.status] ?? "paused"}>{e.status.toLowerCase()}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </>
  );
}
