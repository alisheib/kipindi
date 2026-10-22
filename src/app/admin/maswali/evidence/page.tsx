import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import { AdminPagination, parsePage } from "@/components/admin/admin-pagination";
import { currentSession } from "@/lib/server/auth-service";
import { houseConsoleAudience } from "@/lib/server/house-console-read";
import { weekStore } from "@/lib/server/maswali-dal";
import { CONSOLE_PER_PAGE } from "@/lib/server/maswali-console";
import { evidenceReady } from "@/lib/server/maswali-evidence";
import { formatTzs } from "@/lib/utils";
import { fmtEat, weekStateChip } from "@/lib/maswali-admin-format";

export const metadata = { title: "Admin · Millionea · Evidence" };
export const dynamic = "force-dynamic";

/**
 * /admin/maswali/evidence — the per-week EVIDENCE PACK, for an audit (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 8, MB-92).
 *
 * ⭐ THE AUDITOR'S READ-ONLY WAY INTO MILLIONEA. The compliance domain (`roles.ts`, ABOVE the trading prefix): Compliance,
 *    the Auditor and the Owner open it; the trading officer who seals does not. With the pools (accounting) and the
 *    integrity page (compliance), an Auditor reads every Millionea record and acts on none — this page has no control.
 * ⛔ A WEEK'S PACK IS OFFERED ONCE ITS RECORD IS FINAL — settled or voided (`evidenceReady`); before that its tickets are a
 *    pick aggregate (MB-34, MB-95). Every download is recorded with the SHA-256 of the bytes handed over.
 */
type EvidencePageProps = { searchParams: Promise<{ page?: string }> };

export default async function AdminMaswaliEvidencePage(props: EvidencePageProps) {
  return <AdminPageGate title="Millionea · Evidence"><Content {...props} /></AdminPageGate>;
}

async function Content({ searchParams }: EvidencePageProps) {
  const sp = await searchParams;
  const session = await currentSession();
  // ⛔ D19/259, guard 0.434: this page names a module whose reads hand on audit rows, so it decides its audience on the
  // STORED role before anything else; the section gate above decides what is painted, not what is sent.
  if (!(await houseConsoleAudience(session?.userId ?? null, "/admin/maswali/evidence"))) return null;
  // Every week that ran, newest first — a draft has no record yet. ⛔ Counted whole and paged, never the newest N.
  const weeks = (await weekStore.list({}).catch(() => null))?.filter((w) => w.state !== "DRAFT") ?? null;
  if (!weeks) {
    return (<><AdminPageHead title="Millionea · Evidence" sw="Ushahidi" /><AdminBody><p className="text-body-sm text-danger-fg">The weeks could not be read.</p></AdminBody></>);
  }
  const page = parsePage(sp.page, weeks.length, CONSOLE_PER_PAGE);
  const rows = weeks.slice((page - 1) * CONSOLE_PER_PAGE, page * CONSOLE_PER_PAGE);

  return (
    <>
      <AdminPageHead title="Millionea · Evidence" sw="Ushahidi" />
      <AdminBody>
        <AdminCard title="What a week's pack holds" sw="Kilichomo">
          <p className="text-body-sm text-text-secondary">
            The frozen rules and the fifteen questions; every seal and void with its evidence and its officer; the audit
            record of the week; the objections; the commitment, recomputed and compared; the settlement&apos;s ledger lines and
            the guarantee&apos;s movements; the winners and the cluster report — and every ticket, as a CSV the pack names by its
            SHA-256. Accounts appear by id only, and no ticket&apos;s salt leaves the platform. Every download is recorded.
          </p>
        </AdminCard>

        <AdminCard title="Weeks" sw="Wiki" padding="p-0">
          {rows.length === 0 ? <EmptyState title="No week has run yet" body="A week appears here from its open; its evidence is ready once it settles or voids." />
            : (
              <ScrollX label="Millionea weeks and their evidence">
                <table className="admin-tbl min-w-[1080px]">
                  <thead><tr><th className="text-left">Week</th><th className="text-left">State</th><th className="text-left">Sales closed (EAT)</th><th className="text-right">Tickets</th><th className="text-left">Result</th><th className="text-left">Evidence</th></tr></thead>
                  <tbody>
                    {rows.map((w) => {
                      const chip = weekStateChip(w.state);
                      return (
                        <tr key={w.id}>
                          <td className="text-left tabular">{w.code}{w.visibility === "DRIVE" ? " · drive" : ""}</td>
                          <td className="text-left"><Chip variant={chip.variant} size="sm">{chip.label}</Chip></td>
                          <td className="text-left tabular">{fmtEat(w.closedAt ?? w.closesAt)}</td>
                          <td className="text-right tabular">{w.ticketCount.toLocaleString("en")}</td>
                          <td className="text-left text-body-sm">
                            {w.state === "SETTLED"
                              ? <>{(w.winningTickets ?? 0).toLocaleString("en")} winning · jackpot <span className="font-mono tabular-nums">{formatTzs(w.jackpot ?? 0)}</span> · fee <span className="font-mono tabular-nums">{formatTzs(w.fee ?? 0)}</span> · top-up <span className="font-mono tabular-nums">{formatTzs(w.topUp ?? 0)}</span> · carried <span className="font-mono tabular-nums">{formatTzs(w.carryOut ?? 0)}</span></>
                              : w.state === "VOIDED" ? "Voided whole; every ticket refunded in full."
                              : <span className="text-text-tertiary">Not final yet.</span>}
                          </td>
                          <td className="text-left">
                            {evidenceReady(w) ? (
                              <span className="inline-flex flex-wrap items-center gap-3">
                                <a href={`/api/admin/maswali/evidence/${encodeURIComponent(w.id)}`} className="row-link inline-flex items-center gap-1 font-mono text-body-sm text-royal-300 hover:underline">
                                  <I.download s={12} /> Pack (JSON)
                                </a>
                                <a href={`/api/admin/maswali/evidence/${encodeURIComponent(w.id)}?part=tickets`} className="row-link inline-flex items-center gap-1 font-mono text-body-sm text-royal-300 hover:underline">
                                  <I.download s={12} /> Tickets (CSV)
                                </a>
                              </span>
                            ) : <span className="text-body-sm text-text-tertiary">Ready once it settles or voids.</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollX>
            )}
          {weeks.length > CONSOLE_PER_PAGE && (
            <div className="border-t border-border-subtle px-4 py-2">
              <AdminPagination page={page} total={weeks.length} perPage={CONSOLE_PER_PAGE} baseHref="/admin/maswali/evidence" />
            </div>
          )}
        </AdminCard>
      </AdminBody>
    </>
  );
}
