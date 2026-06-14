import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { Avatar } from "@/components/ui/avatar";
import { getAffiliateConfig } from "@/lib/server/affiliate-config";
import { getAdminAffiliateStats } from "@/lib/server/affiliate-service";
import { AffiliateAdminClient } from "./affiliate-admin-client";

export const metadata = { title: "Affiliate · Admin" };
export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US");
const LEDGER_CHIP: Record<string, "resolved" | "pending" | "objection"> = { PAID: "resolved", PENDING: "pending", HELD: "objection" };

/**
 * /admin/affiliate — referral program control room, on the shared admin shell.
 * The route is gated by the admin layout (role + TOTP); the save action
 * re-checks the role for defence-in-depth.
 */
export default async function AdminAffiliatePage() {
  const config = getAffiliateConfig();
  const stats = await getAdminAffiliateStats();

  return (
    <>
      <AdminPageHead
        title="Affiliate program"
        sw="Mpango wa marafiki"
        period={false}
        actions={<Chip size="sm" variant={config.enabled ? "active" : "paused"}>{config.enabled ? "Active" : "Paused"}</Chip>}
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Total referrals"   sw="Marafiki wote"   value={fmt(stats.totalReferrals)} delta="all-time" deltaDir="flat" />
          <AdminKpi label="Active affiliates"  sw="Wanaolipwa"      value={fmt(stats.activeAffiliates)} delta="earned a reward" deltaDir="flat" />
          <AdminKpi label="Commission paid"    sw="Tume zilizolipwa" value={`TZS ${fmt(stats.commissionPaidTzs)}`} gold delta="all-time" />
          <AdminKpi label="Top referrer"       sw="Bingwa"          value={stats.topReferrer?.handle ?? "—"} gold delta={stats.topReferrer ? `${stats.topReferrer.recruits} recruits` : "none yet"} deltaDir="flat" />
        </div>

        {/* Interactive config editor */}
        <AffiliateAdminClient config={config} />

        {/* Compliance note */}
        <AdminCard className="border-no-700/40 bg-no-500/[0.06]">
          <div className="flex items-start gap-2.5">
            <span className="text-no-300 shrink-0 mt-0.5"><I.shieldcheck s={16} /></span>
            <div className="text-caption text-text-secondary leading-relaxed">
              <p className="font-bold text-no-300 mb-1">Compliance note · Kumbuka</p>
              This is a regulated inducement. Pause or limit the program until the reward structure is cleared with the
              Gaming Board of Tanzania. Keep referrer commission ≤ 50% of margin; review caps quarterly per GBT guidance.
            </div>
          </div>
        </AdminCard>

        {/* Leaderboard */}
        <AdminCard title="Referral leaderboard" sw="Mabingwa wa marafiki" padding={stats.leaderboard.length > 0 ? "p-0" : "p-4"}>
          {stats.leaderboard.length === 0 ? (
            <p className="text-caption text-text-tertiary py-4 text-center">No affiliates have earned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-tbl min-w-[480px]">
                <thead>
                  <tr><th className="text-left">#</th><th className="text-left">Affiliate</th><th className="text-right">Recruits</th><th className="text-right">Earned (TZS)</th></tr>
                </thead>
                <tbody>
                  {stats.leaderboard.map((b, i) => (
                    <tr key={b.userId}>
                      <td className={`font-mono font-bold ${i === 0 ? "text-gold-400" : "text-text-subtle"}`}>{String(i + 1).padStart(2, "0")}</td>
                      <td>
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <Avatar initials={b.handle.replace(/[^a-z0-9]/gi, "").slice(0, 2)} size="sm" seed={b.userId} />
                          <span className="truncate font-mono font-semibold">{b.handle}</span>
                        </span>
                      </td>
                      <td className="text-right font-mono text-text-muted">{b.recruits}</td>
                      <td className="text-right font-mono font-semibold text-gold-300">{fmt(b.earnedTzs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        {/* Payout ledger */}
        <AdminCard title="Payout ledger" sw="Daftari la malipo" padding={stats.ledger.length > 0 ? "p-0" : "p-4"}>
          {stats.ledger.length === 0 ? (
            <p className="text-caption text-text-tertiary py-4 text-center">No payouts yet. Rewards appear here as friends sign up and play.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-tbl min-w-[640px]">
                <thead>
                  <tr><th className="text-left">Referrer</th><th className="text-left">Recruit</th><th className="text-left">Type</th><th className="text-right">Amount</th><th className="text-left">Date</th><th className="text-left">Status</th></tr>
                </thead>
                <tbody>
                  {stats.ledger.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono font-semibold">{r.referrerHandle}</td>
                      <td className="font-mono text-text-muted">{r.recruitMasked}</td>
                      <td className="text-text-muted">{r.type}</td>
                      <td className="text-right font-mono font-semibold text-gold-300">{fmt(r.amountTzs)}</td>
                      <td className="font-mono text-text-subtle whitespace-nowrap">{new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                      <td><Chip size="sm" variant={LEDGER_CHIP[r.status]}>{r.status.toLowerCase()}</Chip></td>
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
