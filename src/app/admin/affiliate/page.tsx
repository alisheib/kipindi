import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { Avatar } from "@/components/ui/avatar";
import { getAffiliateConfig } from "@/lib/server/affiliate-config";
import { getAdminAffiliateStats } from "@/lib/server/affiliate-service";
import { AffiliateAdminClient } from "./affiliate-admin-client";
import { formatDateShort, formatTzs } from "@/lib/utils";

export const metadata = { title: "Affiliate · Admin" };
export const dynamic = "force-dynamic";

const LEDGER_CHIP: Record<string, "resolved" | "pending" | "objection"> = { PAID: "resolved", PENDING: "pending", HELD: "objection" };

/**
 * /admin/affiliate — referral program control room, on the shared admin shell.
 * The route is gated by the admin layout (role + TOTP); the save action
 * re-checks the role for defence-in-depth.
 */
export default async function AdminAffiliatePage({
  searchParams,
}: {
  searchParams: Promise<{ lsort?: string; ldir?: string; lpage?: string }>;
}) {
  const sp = await searchParams;
  const config = getAffiliateConfig();
  const stats = await getAdminAffiliateStats();

  // Payout ledger (prefix "l") — newest first by default; amount + referrer + status sortable.
  const l = parseSort(sp, ["date", "amount", "referrer", "status"] as const, "date", "desc", "l");
  const ledgerSorted = applySort(stats.ledger, l.sort, l.dir, {
    date: (r) => r.date,
    amount: (r) => r.amountTzs,
    referrer: (r) => r.referrerHandle.toLowerCase(),
    status: (r) => r.status,
  });
  const lPage = parsePage(sp.lpage, ledgerSorted.length);
  const ledgerPage = ledgerSorted.slice((lPage - 1) * PER_PAGE, lPage * PER_PAGE);
  const lBase = buildBaseHref("/admin/affiliate", sp, "lpage");

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
          <AdminKpi label="Total referrals"   sw="Marafiki wote"   value={stats.totalReferrals.toLocaleString()} delta="all-time" deltaDir="flat" />
          <AdminKpi label="Active affiliates"  sw="Wanaolipwa"      value={stats.activeAffiliates.toLocaleString()} delta="earned a reward" deltaDir="flat" />
          <AdminKpi label="Commission paid"    sw="Tume zilizolipwa" value={formatTzs(stats.commissionPaidTzs)} delta="all-time" />
          <AdminKpi label="Top referrer"       sw="Bingwa"          value={stats.topReferrer?.handle ?? "—"} delta={stats.topReferrer ? `${stats.topReferrer.recruits} recruits` : "none yet"} deltaDir="flat" />
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
            <EmptyState
              kind="leaderboard"
              title="No affiliates have earned yet"
              titleSw="Hakuna marafiki walioshinda bado"
              body="Top referrers appear here as their friends sign up and play."
            />
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
                      <td className="text-right font-mono font-semibold text-gold-300">{formatTzs(b.earnedTzs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        {/* Payout ledger */}
        <AdminCard title="Payout ledger" sw="Daftari la malipo" padding={ledgerSorted.length > 0 ? "p-0" : "p-4"}>
          {ledgerSorted.length === 0 ? (
            <EmptyState
              kind="admin"
              title="No payouts yet"
              titleSw="Hakuna malipo bado"
              body="Rewards appear here as friends sign up and play."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="admin-tbl min-w-[640px]">
                  <thead>
                    <tr>
                      <SortTh field="referrer" label="Referrer" current={l.sort} dir={l.dir} sp={sp} baseHref="/admin/affiliate" prefix="l" />
                      <th className="text-left">Recruit</th>
                      <th className="text-left">Type</th>
                      <SortTh field="amount" label="Amount" current={l.sort} dir={l.dir} sp={sp} baseHref="/admin/affiliate" prefix="l" align="right" />
                      <SortTh field="date" label="Date" current={l.sort} dir={l.dir} sp={sp} baseHref="/admin/affiliate" prefix="l" />
                      <SortTh field="status" label="Status" current={l.sort} dir={l.dir} sp={sp} baseHref="/admin/affiliate" prefix="l" />
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerPage.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono font-semibold">{r.referrerHandle}</td>
                        <td className="font-mono text-text-muted">{r.recruitMasked}</td>
                        <td className="text-text-muted">{r.type}</td>
                        <td className="text-right font-mono font-semibold text-gold-300">{formatTzs(r.amountTzs)}</td>
                        <td className="font-mono text-text-subtle whitespace-nowrap">{formatDateShort(r.date)}</td>
                        <td><Chip size="sm" variant={LEDGER_CHIP[r.status]}>{r.status.toLowerCase()}</Chip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminPagination total={ledgerSorted.length} page={lPage} baseHref={lBase} param="lpage" />
            </>
          )}
        </AdminCard>
      </div>
    </>
  );
}
