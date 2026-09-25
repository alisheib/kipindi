import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { Avatar } from "@/components/ui/avatar";
import { ScrollX } from "@/components/ui/scroll-x";
import { getAffiliateConfig } from "@/lib/server/affiliate-config";
import { getAdminAffiliateStats } from "@/lib/server/affiliate-service";
import { AffiliateAdminClient } from "./affiliate-admin-client";
import { formatDateShort, formatTzs, formatBalancePill } from "@/lib/utils";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

export const metadata = { title: "Affiliate · Admin" };
export const dynamic = "force-dynamic";

const LEDGER_CHIP: Record<string, "resolved" | "pending" | "objection"> = { PAID: "resolved", PENDING: "pending", HELD: "objection" };

/**
 * /admin/affiliate — referral program control room, on the shared admin shell.
 * The route is gated by the admin layout (role + TOTP); the save action
 * re-checks the role for defence-in-depth.
 */
type AffiliateProps = { searchParams: Promise<{ lsort?: string; ldir?: string; lpage?: string; bpage?: string }> };

/** W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. The section layout is skipped by a flight
 *  request whose router state names it, so the gate the page cannot lose is the one it carries itself. */
export default async function AdminAffiliatePage(props: AffiliateProps) {
  return <AdminPageGate title="Affiliate"><AdminAffiliateContent {...props} /></AdminPageGate>;
}

async function AdminAffiliateContent({ searchParams }: AffiliateProps) {
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

  /**
   * ⭐ THE ROSTER IS PAGINATED NOW BECAUSE IT IS THE WHOLE ROSTER (see `getAdminAffiliateStats`).
   * The platform pays invite partners nothing; the operator pays them in cash outside it, and
   * this is the list that payment is made from — so the officer must be able to reach the last
   * row, not the best ten. ⛔ Its own page param (`bpage`), never the ledger's: paging one table
   * must not silently move the other.
   */
  const bPage = parsePage(sp.bpage, stats.leaderboard.length);
  const boardPage = stats.leaderboard.slice((bPage - 1) * PER_PAGE, bPage * PER_PAGE);
  const bBase = buildBaseHref("/admin/affiliate", sp, "bpage");
  /** ⛔ ONE DISCRIMINATOR, from the server. `config.enabled` is the operator's master switch over
   *  the three reward modes; `rewardsLive` is whether any of them may run at all. */
  const paid = stats.rewardsLive;

  return (
    <>
      <AdminPageHead
        title="Affiliate program"
        sw="Mpango wa marafiki"
        actions={
          // ⛔ THE HEADER CHIP REPORTS THE PRODUCT STATE FIRST. `config.enabled` alone printed
          // "Active" over a programme that cannot pay a shilling, because it is the master switch
          // INSIDE the paid programme — true, and the wrong question.
          paid
            ? <Chip size="sm" variant={config.enabled ? "active" : "paused"}>{config.enabled ? "Active" : "Paused"}</Chip>
            : <Chip size="sm" variant="paused">Unpaid — tracking only</Chip>
        }
      />

      <AdminBody>
        {/* KPIs. ⭐ The second and third tiles swap with the product state: "Active affiliates"
            counts referrers who were PAID and "Commission paid" sums what was paid — under the
            unpaid invite neither can grow, and a figure that never moves teaches an officer to stop
            reading the row. What replaces them: "Players inviting" (how many players have brought anyone) and
            "Paid by 50pick" (what the platform has actually paid on this programme — summed, see that
            tile's note; TZS 0 on a clean unpaid history). */}
        <KpiGrid>
          <AdminKpi label="Total referrals"   sw="Marafiki wote"   value={stats.totalReferrals.toLocaleString()} delta="all-time" deltaDir="flat" />
          {paid ? (
            <AdminKpi label="Active affiliates" sw="Wanaolipwa"    value={stats.activeAffiliates.toLocaleString()} delta="earned a reward" deltaDir="flat" />
          ) : (
            <AdminKpi label="Players inviting"  sw="Wanaoalika"    value={stats.referrerCount.toLocaleString()} delta="brought ≥ 1 friend" deltaDir="flat" />
          )}
          {paid ? (
            <AdminKpi label="Commission paid"   sw="Tume zilizolipwa" value={formatBalancePill(stats.commissionPaidTzs)} delta="all-time" />
          ) : (
            /* 🔴 THE FIGURE IS SUMMED, NEVER WRITTEN AS A CONSTANT. This tile read the literal "0"
               with the caption "rewards withdrawn", and that is a money statement the page can
               CONTRADICT ON ITSELF: `getAdminAffiliateStats` still totals every PAID
               PLAYER-programme row truthfully, and the Payout ledger card further down renders
               those very rows. Any legacy reward paid before 2026-09-25, and anything paid during a
               future flip of `inviteRewards` to ACTIVE and back, would have the tile saying the
               platform paid nothing four inches above the table of what it paid.
               ⭐ `totalPaidTzs` was already computed and returned and read by nothing. On a clean
               unpaid history it renders TZS 0 exactly as intended — now for a reason the data can
               keep. The caption stays: it states the PRODUCT STATE (no new accrual can be created),
               which is true regardless of history. ⛔ Never re-hardcode this. */
            <AdminKpi label="Paid by 50pick"    sw="Zilizolipwa na 50pick" value={formatBalancePill(stats.totalPaidTzs)} delta="rewards withdrawn" deltaDir="flat" />
          )}
          <AdminKpi label="Top referrer"       sw="Bingwa"          value={stats.topReferrer?.handle ?? "—"} delta={stats.topReferrer ? `${stats.topReferrer.recruits} recruits` : "none yet"} deltaDir="flat" />
        </KpiGrid>

        {/* Interactive config editor */}
        <AffiliateAdminClient config={config} rewardsLive={paid} />

        {/* Compliance note */}
        <AdminCard className="border-no-700/40 bg-no-500/[0.06]">
          <div className="flex items-start gap-2.5">
            <span className="text-no-300 shrink-0 mt-0.5"><I.shieldcheck s={16} /></span>
            <div className="text-caption text-text-secondary leading-relaxed">
              <p className="font-bold text-no-300 mb-1">Compliance note · Kumbuka</p>
              {paid ? (
                <>
                  This is a regulated inducement. Pause or limit the program until the reward structure is cleared with the
                  Gaming Board of Tanzania. Keep referrer commission ≤ 50% of margin; review caps quarterly per GBT guidance.
                </>
              ) : (
                <>
                  {/* ⭐ THE NOTE CHANGES BECAUSE THE FACT CHANGED. A reward for bringing gamblers is a regulated
                      inducement; a share link that pays nothing is not one, and leaving the inducement warning up
                      would misdescribe what is live — while deleting it would lose the warning the day the switch
                      flips. So it states both: what is running, and what turning it on would make it. */}
                  The player invite is <strong className="text-text">unpaid</strong> — the platform credits nothing for a
                  referral (product state <code className="font-mono">inviteRewards = WITHDRAWN</code>), so the settings
                  below are stored but not consulted. Rewarding referrals is a regulated inducement: clear the structure
                  with the Gaming Board of Tanzania before switching it on, then keep referrer commission ≤ 50% of margin.
                  Cash paid to an inviter outside the platform is not recorded here.
                </>
              )}
              {/* ⭐ 2026-09-26 — THE OWNER HAD TO ASK WHERE PLAYERS FIND IT, from inside this console on a
                  phone, where the player chrome does not exist. The answer belongs on the page that runs the
                  programme. ⛔ Keep it in step with docs/PLAYER-INVITE-UNPAID.md §2, the one list of doors. */}
              <p className="mt-2">
                <span className="font-bold text-text">Where players find it · Wanapoipata:</span> on a phone,{" "}
                <strong className="text-text">☰ Zaidi</strong> (bottom-right) → <strong className="text-text">Alika marafiki</strong>;
                also the avatar menu, the site footer and the Profile page, every one named “Alika marafiki · Invite friends”
                for a player. None of them shows inside this console — tap the ‹ at the top left (“Back to app” on a
                wider screen) to see the player’s view.
              </p>
            </div>
          </div>
        </AdminCard>

        {/* The roster. ⭐ UNPAID, THIS TABLE IS A PAYABLES LIST, NOT A LEADERBOARD — it is what the
            operator reads to decide who gets cash outside the platform, so it carries every row
            and drops the "Earned (TZS)" column, which would be a column of zeros claiming the
            platform settled with these people. The rank numeral goes with it: a ranking implies a
            prize. The row count is stated so the reader knows the list is complete. */}
        <AdminCard
          title={paid ? "Referral leaderboard" : "Invites by player"}
          sw={paid ? "Mabingwa wa marafiki" : "Mialiko kwa mchezaji"}
          padding={stats.leaderboard.length > 0 ? "p-0" : "p-4"}
        >
          {stats.leaderboard.length === 0 ? (
            <EmptyState
              kind="leaderboard"
              title={paid ? "No affiliates have earned yet" : "Nobody has invited anyone yet"}
              titleSw={paid ? "Hakuna marafiki walioshinda bado" : "Bado hakuna aliyealika mtu"}
              body={paid
                ? "Top referrers appear here as their friends sign up and play."
                : "A player appears here as soon as somebody signs up on their link."}
            />
          ) : (
            <>
              <ScrollX label={paid ? "Affiliate leaderboard" : "Invites by player"}>
                <table className="admin-tbl min-w-[480px]">
                  <thead>
                    <tr>
                      {paid && <th className="text-left">#</th>}
                      <th className="text-left">{paid ? "Affiliate" : "Player"}</th>
                      <th className="text-right">{paid ? "Recruits" : "Friends joined"}</th>
                      {paid && <th className="text-right">Earned (TZS)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {boardPage.map((b, i) => (
                      <tr key={b.userId}>
                        {paid && (
                          <td className={`font-mono font-bold ${bPage === 1 && i === 0 ? "text-text" : "text-text-subtle"}`}>
                            {String((bPage - 1) * PER_PAGE + i + 1).padStart(2, "0")}
                          </td>
                        )}
                        <td>
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <Avatar initials={b.handle.replace(/[^a-z0-9]/gi, "").slice(0, 2)} size="sm" seed={b.userId} />
                            <span className="truncate font-mono font-semibold">{b.handle}</span>
                          </span>
                        </td>
                        <td className="text-right font-mono tabular font-semibold text-text">{b.recruits}</td>
                        {paid && <td className="text-right font-mono tabular font-semibold text-text">{formatTzs(b.earnedTzs)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
              <AdminPagination total={stats.leaderboard.length} page={bPage} baseHref={bBase} param="bpage" />
            </>
          )}
        </AdminCard>

        {/* Payout ledger */}
        <AdminCard title="Payout ledger" sw="Daftari la malipo" padding={ledgerSorted.length > 0 ? "p-0" : "p-4"}>
          {ledgerSorted.length === 0 ? (
            /* ⛔ "yet" AND "appear here as friends sign up and play" BOTH PROMISE A FUTURE THE
               PRODUCT HAS REFUSED. Under the unpaid invite no friend signing up or playing will
               ever put a row here, so the empty state was telling an officer to wait for something
               that cannot arrive. It states the reason instead — and the paid wording returns
               untouched the day `inviteRewards` does. */
            <EmptyState
              kind="admin"
              title={paid ? "No payouts yet" : "Nothing to pay — the invite is unpaid"}
              titleSw={paid ? "Hakuna malipo bado" : "Hakuna malipo — mialiko hailipwi"}
              body={paid
                ? "Rewards appear here as friends sign up and play."
                : "The platform credits nothing for a player referral (inviteRewards = WITHDRAWN), so no row can be created. Rows already here, if any, predate that or were paid while it was switched on."}
            />
          ) : (
            <>
              <ScrollX label="Payout ledger">
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
                        <td className="text-right font-mono tabular font-semibold text-text">{formatTzs(r.amountTzs)}</td>
                        <td className="font-mono text-text-subtle whitespace-nowrap">{formatDateShort(r.date)}</td>
                        <td><Chip size="sm" variant={LEDGER_CHIP[r.status]}>{r.status.toLowerCase()}</Chip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
              <AdminPagination total={ledgerSorted.length} page={lPage} baseHref={lBase} param="lpage" />
            </>
          )}
        </AdminCard>
      </AdminBody>
    </>
  );
}
