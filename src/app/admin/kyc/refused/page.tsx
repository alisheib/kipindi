import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { KpiGrid } from "@/components/admin/admin-body";
import { AdminBody } from "@/components/admin/admin-body";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { ScrollX } from "@/components/ui/scroll-x";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { refusedFundsReport, awaitsOfficer, type RefusedAccountRow } from "@/lib/server/refused-funds";
import { REFUSED_FUNDS_OUTCOME_COPY, REFUSED_FUNDS_OUTCOMES } from "@/lib/refused-funds-outcomes";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { houseConsoleAudience } from "@/lib/server/house-console-read";
import { txnStatusLabel } from "@/components/admin/status-badge";
import type { StoredTxn } from "@/lib/server/store";
import { isFinalRefusal, type FinalRefusalCode } from "@/lib/kyc-refusal";
import { formatTzs, formatTzsCompact, formatDateTime } from "@/lib/utils";

/** Officer-facing names for the three final codes (audit session 95, 2026-09-14) — the chip printed the raw enum.
 *  ⚠️ Twin of the map on /admin/kyc/[id]: a page file cannot export one. Typed on the code list, so a fourth final
 *  code fails the build here rather than printing a token. */
const FINAL_CODE_LABEL: Record<FinalRefusalCode, string> = {
  UNDERAGE: "Under 18",
  SANCTIONED: "Sanctions concern",
  DUPLICATE_IDENTITY: "Identity used on another account",
};
function codeLabel(code: string): string {
  return isFinalRefusal(code) ? FINAL_CODE_LABEL[code] : code || "—";
}

type CaseState = NonNullable<RefusedAccountRow["state"]>;
/** Where each case's money stands NOW — the report's state word (C-8), never "open" or "closed". */
const STATE_LABEL: Record<CaseState, string> = {
  undecided: "Undecided",
  on_hold: "On hold (appeal)",
  return_in_flight: "Return in flight",
  return_failed: "Return failed",
  settled: "Settled",
};
const STATE_VARIANT: Record<CaseState, "warning" | "neutral" | "info" | "danger" | "success"> = {
  undecided: "warning",
  on_hold: "neutral",
  return_in_flight: "info",
  return_failed: "danger",
  settled: "success",
};

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
export default async function RefusedFundsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ apage?: string; dpage?: string }>;
}) {
  const sp = await searchParams;
  // 🔴 ASKED BEFORE ANY WALLET IS READ (audit session 95, 2026-09-14) — the same money gate as /admin/kyc and the case
  // page. This report rendered every refused player's balance to any role the compliance route admits; without money
  // rights the service reads no wallet, and every figure below reads "not in your role".
  const session = await currentSession();
  /**
   * ⛔ THE AUDIENCE IS DECIDED HERE, ON THE STORED ROLE, BEFORE ANY ROW IS READ (C5-SPEC rulings 259/260; C7-SPEC
   * ruling 434, taken on a MEASURED leak).
   *
   * MEASURED 2026-09-18 by `qa:house-bot-console-probe`: this page rendered an officer's refused-funds
   * JUSTIFICATION verbatim, in a `<td>`, with status 200, to a signed-in PLAYER, the holder and a trigger player, in
   * all three modes. A layout's verdict changes what is PAINTED, not what is SENT, and `AdminSectionGate` above this
   * file does not stop the page's own async function from running and streaming its payload.
   * ⛔ WHY THAT IS A HOUSE MATTER AND NOT ONLY A PLATFORM ONE. Ruling 260 gates "every audit row a console file
   * reads", and this page reads audit rows — through `refusedFundsReport` → `getAuditByActionsDurable` over the four
   * `REFUSED_FUNDS_ACTION`s. That reader sits in `AUDIT_READERS_OUTSIDE_CONSOLE` on the ground that its ACTIONS are
   * never house actions, which is true of the action and false of the PAYLOAD: 260's own text says a platform row can
   * carry a house VALUE, and a justification written about a desk account's holder names the account. So the
   * classification excused the reader and left the PAGE ungated.
   * ⛔ THE VERDICT IS THE VIEWER'S STORED ROLE, not the cookie's photograph of it — the shape `AdminSectionGate` and
   * `houseConsoleAudience` already share, and the reason the money check below is NOT the belt: `session.role` is the
   * role baked into the signed cookie, so a demoted account's old cookie still answers yes.
   * ⚠️ `null` is the same answer `/admin/desk` gives: this section HAS a `layout.tsx` with `AdminSectionGate`, so a
   * staff viewer whose role may not view compliance still sees the restricted panel, and a non-staff account never
   * painted this page at all — it only ever reached it through the hole this closes.
   */
  if (!(await houseConsoleAudience(session?.userId ?? null, "/admin/kyc/refused"))) return null;
  const canSeeMoney = session ? await canView(session.role, "accounting") : false;
  let report: Awaited<ReturnType<typeof refusedFundsReport>> | null = null;
  try { report = await refusedFundsReport({ money: canSeeMoney }); } catch { report = null; }

  // Each grid pages on its own param, so turning one never moves the other. The KPIs above are
  // computed from the WHOLE set, never the visible page.
  const aPage = parsePage(sp.apage, report?.accounts.length ?? 0);
  const accountsPage = report?.accounts.slice((aPage - 1) * PER_PAGE, aPage * PER_PAGE) ?? [];
  const aBase = buildBaseHref("/admin/kyc/refused", sp, "apage");
  const dPage = parsePage(sp.dpage, report?.decisions.length ?? 0);
  const decisionsPage = report?.decisions.slice((dPage - 1) * PER_PAGE, dPage * PER_PAGE) ?? [];
  const dBase = buildBaseHref("/admin/kyc/refused", sp, "dpage");

  // ⭐ WHAT WAITS ON AN OFFICER IS A STATE, NOT "OPEN" (audit session 95, C-8): undecided, or a return whose payout
  // failed with the money back in the frozen wallet. On hold, in flight and settled wait on nobody here.
  const awaiting = report?.accounts.filter(awaitsOfficer) ?? [];
  const heldAwaiting = awaiting.reduce((s, a) => s + (a.balance ?? 0) + (a.hold ?? 0), 0);
  // ⛔ "RETURNED" IS MONEY THAT ARRIVED — a CONFIRMED payout. A return still processing rides beside it, and a failed
  // one is not counted; the recorded intent (`returnedTzs`) used to be summed as though it had landed.
  const returnedSettled = report?.decisions.reduce((s, d) => s + d.returnSettledTzs, 0) ?? 0;
  const returnInFlight = report?.decisions.reduce((s, d) => s + d.returnInFlightTzs, 0) ?? 0;
  const forfeited = report?.decisions.reduce((s, d) => s + d.forfeitedTzs, 0) ?? 0;
  const notInRole = <span className="text-text-tertiary">not in your role</span>;
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
              <AdminKpi
                label="Awaiting a decision"
                sw="Zinasubiri uamuzi"
                value={!canSeeMoney ? "—" : report.accountsFailed ? "" : String(awaiting.length)}
                unavailable={canSeeMoney && report.accountsFailed}
                tone={canSeeMoney && !report.accountsFailed && awaiting.length > 0 ? "danger" : undefined}
                delta={!canSeeMoney ? "not in your role" : report.accountsFailed ? "account read failed" : `${formatTzsCompact(heldAwaiting)} held`}
              />
              <AdminKpi label="Decisions recorded" sw="Maamuzi" value={String(report.decisionsTotal)} delta={`${byOutcome.HOLD_PENDING_APPEAL} on hold`} />
              <AdminKpi
                label="Returned to players"
                sw="Zilizorudishwa"
                value={canSeeMoney ? formatTzs(returnedSettled) : "—"}
                delta={!canSeeMoney ? "not in your role" : `${formatTzsCompact(returnInFlight)} in flight${report.decisionsTruncated ? " · listed only" : ""}`}
              />
              <AdminKpi label="Forfeited" sw="Hazikurudishwa" value={canSeeMoney ? formatTzs(forfeited) : "—"} delta={!canSeeMoney ? "not in your role" : report.decisionsTruncated ? "listed decisions only" : "all decisions"} />
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
                        <th className="py-2 pr-3 text-left">State</th>
                        <th className="py-2 pr-3 text-left">Last decision</th>
                        <th className="py-2 pl-3 text-left">Case</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsPage.map((a) => (
                        <tr key={a.userId} className="border-b border-border-subtle/50 last:border-b-0" data-refused-account={a.state ?? "money-not-shown"}>
                          <td className="py-2 pr-3 font-mono">{a.userId.slice(0, 14)}…</td>
                          <td className="py-2 pr-3"><Chip size="sm" variant="danger" style={{ whiteSpace: "nowrap" }}>{codeLabel(a.rejectCode)}</Chip></td>
                          <td className="py-2 pr-3 font-mono text-micro uppercase tracking-wider">{a.walletStatus ?? "—"}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums text-text">{canSeeMoney && a.balance !== null ? formatTzs(a.balance) : notInRole}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums">{canSeeMoney && a.hold !== null ? formatTzs(a.hold) : notInRole}</td>
                          <td className="py-2 pr-3">
                            {a.state ? <Chip size="sm" variant={STATE_VARIANT[a.state]} style={{ whiteSpace: "nowrap" }}>{STATE_LABEL[a.state]}</Chip> : canSeeMoney ? "—" : notInRole}
                          </td>
                          <td className="py-2 pr-3">
                            {a.lastDecision?.outcome ? `${REFUSED_FUNDS_OUTCOME_COPY[a.lastDecision.outcome].label} · ${formatDateTime(a.lastDecision.at)}` : <span className="text-warning-fg">none yet</span>}
                          </td>
                          <td className="py-2 pl-3">
                            <Link href={`/admin/kyc/${a.userId}` as Route} className="inline-flex items-center gap-1 text-brand-300 hover:underline">
                              Case <I.chevronRight s={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {report.accounts.length === 0 && (
                        <AdminTableEmpty colSpan={8} kind="admin" title="No finally refused accounts" body="No player's identity has been refused on a final code." />
                      )}
                    </tbody>
                  </table>
                </ScrollX>
              )}
              {!report.accountsFailed && <AdminPagination total={report.accounts.length} page={aPage} baseHref={aBase} param="apage" />}
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
                      <th className="py-2 pr-3 text-right">Return recorded</th>
                      <th className="py-2 pr-3 text-right">Forfeited</th>
                      <th className="py-2 pr-3 text-left">Payout</th>
                      <th className="py-2 pl-3 text-left">Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decisionsPage.map((d, i) => (
                      <tr key={d.decisionId ?? `${d.at}-${i}`} className="border-b border-border-subtle/50 last:border-b-0 align-top">
                        <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateTime(d.at)}</td>
                        <td className="py-2 pr-3 font-mono">{d.userId ? <Link href={`/admin/kyc/${d.userId}` as Route} className="hover:underline">{d.userId.slice(0, 12)}…</Link> : "—"}</td>
                        <td className="py-2 pr-3 font-mono">{d.officerId ? `${d.officerId.slice(0, 12)}…` : "—"}</td>
                        <td className="py-2 pr-3">{d.outcome ? REFUSED_FUNDS_OUTCOME_COPY[d.outcome].label : "—"}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{!canSeeMoney ? notInRole : d.balanceBefore === null ? "—" : formatTzs(d.balanceBefore)}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{canSeeMoney ? formatTzs(d.returnedTzs) : notInRole}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{canSeeMoney ? formatTzs(d.forfeitedTzs) : notInRole}</td>
                        <td className="py-2 pr-3 font-mono text-body-sm">
                          {/* ⭐ THE PAYOUT'S STATUS NOW, not the word it carried at decision time (C-8): a return recorded as
                              processing that later failed kept reading as sent. ⛔ An error's detail can quote shillings, so
                              it is shown only to a money viewer. */}
                          {d.payoutError ? (
                            <span className="text-danger-fg">did not start{canSeeMoney ? `: ${d.payoutError}` : ""}</span>
                          ) : d.payoutTxnId ? (
                            <>
                              {d.payoutTxnStatusNow ? (
                                <span className={d.payoutTxnStatusNow === "FAILED" ? "text-danger-fg" : "text-text"}>{txnStatusLabel(d.payoutTxnStatusNow as StoredTxn["status"])}</span>
                              ) : (
                                <span className="text-warning-fg">status not read</span>
                              )}
                              {` · ${d.payoutTxnId}`}
                            </>
                          ) : (
                            "—"
                          )}
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
              <AdminPagination total={report.decisions.length} page={dPage} baseHref={dBase} param="dpage" />
            </AdminCard>
          </>
        )}
      </AdminBody>
    </>
  );
}
