import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { KpiGrid } from "@/components/admin/admin-body";
import { AdminBody } from "@/components/admin/admin-body";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { ScrollX } from "@/components/ui/scroll-x";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { refusedFundsReport } from "@/lib/server/refused-funds";
import { REFUSED_FUNDS_OUTCOME_COPY, REFUSED_FUNDS_OUTCOMES } from "@/lib/refused-funds-outcomes";
import { formatTzs, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Admin · Refused players' balances" };
export const dynamic = "force-dynamic";

/**
 * S1 — THE REPORT AN INSPECTOR CAN BE HANDED (owner ruling, Ali, 2026-09-13).
 *
 * ⭐ WHAT TURNS "CASE BY CASE" FROM A GAP INTO A POLICY. Ali ruled that an officer decides what happens
 * to a finally-refused player's balance, with a recorded reason and no fixed rule. This page is where
 * every such decision can be read in one place — who decided, when, which of the four outcomes, how
 * much was returned and how much forfeited, and the written justification — beside every finally-
 * refused account and whether its money still waits on a decision.
 *
 * ⛔ DURABLE, NEVER THE RING (`getAuditByActionsDurable`), and it SAYS when it is incomplete: a list that
 * quietly stops at N, or a failed account read drawn as "no refused accounts", is a false compliance
 * all-clear on the one page built to prove there is none.
 * ⚠️ English-only by design, like the rest of the staff console.
 */
export default async function RefusedFundsReportPage() {
  let report: Awaited<ReturnType<typeof refusedFundsReport>> | null = null;
  try { report = await refusedFundsReport(); } catch { report = null; }

  const open = report?.accounts.filter((a) => a.open) ?? [];
  const heldOpen = open.reduce((s, a) => s + a.balance + a.hold, 0);
  const returned = report?.decisions.reduce((s, d) => s + d.returnedTzs, 0) ?? 0;
  const forfeited = report?.decisions.reduce((s, d) => s + d.forfeitedTzs, 0) ?? 0;
  const byOutcome = Object.fromEntries(REFUSED_FUNDS_OUTCOMES.map((o) => [o, report?.decisions.filter((d) => d.outcome === o).length ?? 0]));

  return (
    <>
      <AdminPageHead
        title="Refused players' balances"
        sw="Salio la wachezaji waliokataliwa"
        actions={
          <Link href={"/admin/kyc" as Route} className="btn btn-ghost btn-sm inline-flex items-center gap-1.5">
            <I.chevronLeft s={13} /> KYC
          </Link>
        }
      />
      <AdminBody>
        <AdminCard>
          <p className="text-body-sm text-text-muted max-w-[72ch]">
            When a player&apos;s identity is refused on a <strong>final</strong> code — under 18, a sanctions concern, or an identity
            already used on another account — the wallet is frozen and an officer decides what happens to the balance, choosing one of
            four recorded outcomes with a written justification (owner ruling, 2026-09-13). Every decision is listed here, from the
            tamper-evident compliance log.
          </p>
        </AdminCard>

        {!report ? (
          <AdminCard><AdminLoadError what="the refused-funds report" /></AdminCard>
        ) : (
          <>
            <KpiGrid>
              <AdminKpi label="Open cases" sw="Kesi zilizo wazi" value={report.accountsFailed ? "" : String(open.length)} unavailable={report.accountsFailed} delta={report.accountsFailed ? "account read failed" : `${formatTzs(heldOpen)} held`} />
              <AdminKpi label="Decisions recorded" sw="Maamuzi" value={String(report.decisionsTotal)} delta={REFUSED_FUNDS_OUTCOMES.map((o) => `${REFUSED_FUNDS_OUTCOME_COPY[o].label.split(" ")[0]} ${byOutcome[o]}`).join(" · ")} />
              <AdminKpi label="Returned to players" sw="Zilizorudishwa" value={formatTzs(returned)} delta={report.decisionsTruncated ? "listed decisions only" : "all decisions"} />
              <AdminKpi label="Forfeited" sw="Hazikurudishwa" value={formatTzs(forfeited)} delta={report.decisionsTruncated ? "listed decisions only" : "all decisions"} />
            </KpiGrid>

            <AdminCard title="Finally refused accounts" sw="Akaunti zilizokataliwa kabisa">
              {report.accountsFailed ? (
                <AdminLoadError what="the refused accounts" />
              ) : (
                <ScrollX label="Finally refused accounts">
                  <table className="admin-tbl min-w-[720px]">
                    <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                      <tr>
                        <th className="py-2 pr-3 text-left">Player</th>
                        <th className="py-2 pr-3 text-left">Refusal</th>
                        <th className="py-2 pr-3 text-left">Wallet</th>
                        <th className="py-2 pr-3 text-right">Balance</th>
                        <th className="py-2 pr-3 text-right">In flight</th>
                        <th className="py-2 pr-3 text-left">Last decision</th>
                        <th className="py-2 pl-3 text-left">Case</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.accounts.map((a) => (
                        <tr key={a.userId} className="border-b border-border-subtle/50 last:border-b-0" data-refused-account={a.open ? "open" : "closed"}>
                          <td className="py-2 pr-3 font-mono">{a.userId.slice(0, 14)}…</td>
                          <td className="py-2 pr-3"><Chip size="sm" variant="danger">{a.rejectCode}</Chip></td>
                          <td className="py-2 pr-3 font-mono text-micro uppercase tracking-wider">{a.walletStatus ?? "—"}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums text-text">{formatTzs(a.balance)}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatTzs(a.hold)}</td>
                          <td className="py-2 pr-3">
                            {a.lastDecision?.outcome ? `${REFUSED_FUNDS_OUTCOME_COPY[a.lastDecision.outcome].label} · ${formatDateTime(a.lastDecision.at)}` : <span className="text-warning-fg">none yet</span>}
                          </td>
                          <td className="py-2 pl-3">
                            <Link href={`/admin/kyc/${a.userId}` as Route} className="inline-flex items-center gap-1 text-brand-300 hover:underline">
                              {a.open ? "Decide" : "Open"} <I.chevronRight s={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {report.accounts.length === 0 && (
                        <AdminTableEmpty colSpan={7} kind="admin" title="No finally refused accounts" body="No player's identity has been refused on a final code." />
                      )}
                    </tbody>
                  </table>
                </ScrollX>
              )}
            </AdminCard>

            <AdminCard title="Every balance decision" sw="Kila uamuzi">
              {report.decisionsTruncated && (
                <p className="mb-2 text-body-sm text-warning-fg">Showing the newest {report.decisions.length} of {report.decisionsTotal} decisions.</p>
              )}
              <ScrollX label="Balance decisions">
                <table className="admin-tbl min-w-[980px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                    <tr>
                      <th className="py-2 pr-3 text-left">When</th>
                      <th className="py-2 pr-3 text-left">Player</th>
                      <th className="py-2 pr-3 text-left">Officer</th>
                      <th className="py-2 pr-3 text-left">Outcome</th>
                      <th className="py-2 pr-3 text-right">Balance before</th>
                      <th className="py-2 pr-3 text-right">Returned</th>
                      <th className="py-2 pr-3 text-right">Forfeited</th>
                      <th className="py-2 pr-3 text-left">Payout</th>
                      <th className="py-2 pl-3 text-left">Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.decisions.map((d, i) => (
                      <tr key={d.decisionId ?? `${d.at}-${i}`} className="border-b border-border-subtle/50 last:border-b-0 align-top">
                        <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateTime(d.at)}</td>
                        <td className="py-2 pr-3 font-mono">{d.userId ? <Link href={`/admin/kyc/${d.userId}` as Route} className="hover:underline">{d.userId.slice(0, 12)}…</Link> : "—"}</td>
                        <td className="py-2 pr-3 font-mono">{d.officerId ? `${d.officerId.slice(0, 12)}…` : "—"}</td>
                        <td className="py-2 pr-3">{d.outcome ? REFUSED_FUNDS_OUTCOME_COPY[d.outcome].label : "—"}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{d.balanceBefore === null ? "—" : formatTzs(d.balanceBefore)}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatTzs(d.returnedTzs)}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatTzs(d.forfeitedTzs)}</td>
                        <td className="py-2 pr-3 font-mono text-micro">
                          {d.payoutError ? <span className="text-no-300">did not start: {d.payoutError}</span> : d.payoutTxnId ? `${d.payoutStatus ?? ""} · ${d.payoutTxnId}` : "—"}
                        </td>
                        <td className="py-2 pl-3 text-body-sm text-text-muted max-w-[42ch]">{d.justification || "—"}</td>
                      </tr>
                    ))}
                    {report.decisions.length === 0 && (
                      <AdminTableEmpty colSpan={9} kind="admin" title="No decisions recorded" body="No officer has yet decided a refused player's balance." />
                    )}
                  </tbody>
                </table>
              </ScrollX>
            </AdminCard>
          </>
        )}
      </AdminBody>
    </>
  );
}
