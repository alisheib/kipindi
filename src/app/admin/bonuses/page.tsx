import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { getBonusConfig } from "@/lib/server/bonus-config";
import { getAdminBonusStats } from "@/lib/server/bonus-service";
import { formatTzs, formatDateShort } from "@/lib/utils";
import { BonusAdminClient, GrantBonusForm, CancelGrantButton } from "./bonus-admin-client";

export const metadata = { title: "Bonuses · Admin" };
export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, "active" | "resolved" | "paused" | "objection"> = {
  ACTIVE: "active",
  FULFILLED: "resolved",
  EXPIRED: "paused",
  CANCELLED: "paused",
  FORFEITED: "objection",
};

const SOURCE_LABEL: Record<string, string> = {
  ADMIN: "Admin grant",
  REFERRAL: "Affiliate",
  PROPOSAL: "Proposal",
  INVITE: "Invite",
  PROMOTION: "Promotion",
  CASHBACK: "Cashback",
};

/**
 * /admin/bonuses — bonus-wallet control room on the shared admin shell.
 * Route is gated by the admin layout (role + TOTP); each action re-checks the
 * role for defence-in-depth.
 */
export default async function AdminBonusesPage({
  searchParams,
}: {
  searchParams: Promise<{ gpage?: string }>;
}) {
  const sp = await searchParams;
  const config = getBonusConfig();
  const stats = await getAdminBonusStats();

  const gPage = parsePage(sp.gpage, stats.ledger.length);
  const ledgerPage = stats.ledger.slice((gPage - 1) * PER_PAGE, gPage * PER_PAGE);
  const gBase = buildBaseHref("/admin/bonuses", sp, "gpage");

  return (
    <>
      <AdminPageHead
        title="Bonus wallet"
        sw="Pochi ya bonasi"
        period={false}
        actions={<Chip size="sm" variant={config.enabled ? "active" : "paused"}>{config.enabled ? "Active" : "Paused"}</Chip>}
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Outstanding bonus" sw="Bonasi inayodaiwa" value={formatTzs(stats.outstandingTzs)} gold pulse delta="liability now" deltaDir="flat" />
          <AdminKpi label="Active grants" sw="Bonasi hai" value={stats.activeGrants.toLocaleString()} delta="in play" deltaDir="flat" />
          <AdminKpi label="Total granted" sw="Jumla iliyotolewa" value={formatTzs(stats.totalGrantedTzs)} delta="all-time" deltaDir="flat" />
          <AdminKpi label="Unlocked to cash" sw="Imefunguliwa" value={formatTzs(stats.totalFulfilledTzs)} delta="played through" deltaDir="flat" />
        </div>

        {/* Manual grant */}
        <AdminCard title="Grant a bonus" sw="Toa bonasi kwa mchezaji">
          <GrantBonusForm />
        </AdminCard>

        {/* Config editor */}
        <BonusAdminClient config={config} />

        {/* How it works note */}
        <AdminCard className="border-royal-700/40 bg-royal-500/[0.06]">
          <div className="flex items-start gap-2.5">
            <span className="text-royal-300 shrink-0 mt-0.5"><I.gift s={16} /></span>
            <div className="text-caption text-text-secondary leading-relaxed">
              <p className="font-bold text-royal-300 mb-1">How bonuses work · Jinsi inavyofanya kazi</p>
              Bonus funds sit in a separate, non-withdrawable wallet. A player must play (turn over) the bonus ×
              its multiplier before it converts to real, withdrawable cash. Winnings from any bet go to the real wallet;
              bonuses accumulate (no one-at-a-time limit) and a withdrawal of real balance leaves active bonuses running.
            </div>
          </div>
        </AdminCard>

        {/* Grant ledger */}
        <AdminCard title="Grant ledger" sw="Daftari la bonasi" padding={stats.ledger.length > 0 ? "p-0" : "p-4"}>
          {stats.ledger.length === 0 ? (
            <p className="text-caption text-text-tertiary py-4 text-center">No bonuses granted yet. Grants from admin, affiliate, proposals and invites appear here.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="admin-tbl min-w-[760px]">
                  <thead>
                    <tr>
                      <th className="text-left">Player</th>
                      <th className="text-left">Source</th>
                      <th className="text-right">Amount</th>
                      <th className="text-left">Wagering</th>
                      <th className="text-left">Date</th>
                      <th className="text-left">Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerPage.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono font-semibold">{r.playerHandle}</td>
                        <td className="text-text-muted">{SOURCE_LABEL[r.source] ?? r.source}</td>
                        <td className="text-right font-mono font-semibold text-gold-300">{formatTzs(r.amountTzs)}</td>
                        <td className="min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-pill bg-bg-sunken overflow-hidden">
                              <div className={`h-full rounded-pill bg-royal-400 ${r.status === "ACTIVE" && r.progressPct > 0 && r.progressPct < 100 ? "prog-sweep" : ""}`} style={{ width: `${r.progressPct}%` }} />
                            </div>
                            <span className="font-mono text-micro text-text-subtle whitespace-nowrap">{r.progressPct}%</span>
                          </div>
                          <div className="font-mono text-micro text-text-subtle mt-0.5">
                            {formatTzs(r.wageredTzs)} / {formatTzs(r.wagerRequiredTzs)}
                          </div>
                        </td>
                        <td className="font-mono text-text-subtle whitespace-nowrap">{formatDateShort(r.createdAt)}</td>
                        <td><Chip size="sm" variant={STATUS_CHIP[r.status] ?? "paused"}>{r.status.toLowerCase()}</Chip></td>
                        <td className="text-right">{r.status === "ACTIVE" ? <CancelGrantButton grantId={r.id} /> : <span className="text-text-subtle">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminPagination total={stats.ledger.length} page={gPage} baseHref={gBase} param="gpage" />
            </>
          )}
        </AdminCard>
      </div>
    </>
  );
}
