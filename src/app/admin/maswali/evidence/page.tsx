import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import Link from "next/link";
import { AdminPagination, buildBaseHref } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/ui/search-box";
import { Select } from "@/components/ui/select";
import { currentSession } from "@/lib/server/auth-service";
import { houseConsoleAudience } from "@/lib/server/house-console-read";
import { weekStore } from "@/lib/server/maswali-dal";
import { CONSOLE_PER_PAGE } from "@/lib/server/maswali-console";
import { evidenceReady } from "@/lib/server/maswali-evidence";
import { formatTzs } from "@/lib/utils";
import { fmtEat, weekStateChip } from "@/lib/maswali-admin-format";
import { parseWeekListQuery, selectWeekPage, weekListParams } from "@/lib/maswali-week-list";
import { WEEK_STATES } from "@/lib/maswali-week-label";

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
type EvidencePageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const EVIDENCE_HREF = "/admin/maswali/evidence";
/** A week has a record from its open: every state but DRAFT, in the console's order. */
const RECORD_STATES = WEEK_STATES.filter((s) => s !== "DRAFT");

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
  // ⭐ S6-ADMIN · G7 · THE ARCHIVE IS A LIST LIKE THE OTHER THREE: the week list's own kit and URL parameters (q, state, line, sort,
  // dir, page) — a week-code search, a state filter and a line filter, sorted, counted whole and paged, never the newest N.
  const asked = parseWeekListQuery(sp);
  const query = { ...asked, state: asked.state === "DRAFT" ? "" as const : asked.state };
  const listParams = weekListParams(query);
  const hasFilter = !!(query.q || query.state || query.line);
  const selected = selectWeekPage(weeks, typeof sp.page === "string" ? Number(sp.page) : 1, CONSOLE_PER_PAGE, query);
  const rows = selected.weeks;

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
          <div className="border-b border-border-subtle p-4">
            <span className="mb-1 block text-body-sm text-text-secondary">Week code</span>
            <SearchBox mode="form" formId="maswali-evidence-filters" placeholder="Search week code" ariaLabel="Search week codes" helpFields={["code"]} />
          </div>
          <form id="maswali-evidence-filters" method="get" action={EVIDENCE_HREF} className="flex flex-wrap items-end gap-3 border-b border-border-subtle p-4">
            <div className="min-w-[145px] flex-1 text-body-sm text-text-secondary">
              <span>State</span>
              <Select key={query.state} name="state" ariaLabel="Week state" defaultValue={query.state} className="mt-1" options={[{ value: "", label: "All states" }, ...RECORD_STATES.map((state) => ({ value: state, label: weekStateChip(state).label }))]} />
            </div>
            <div className="min-w-[145px] flex-1 text-body-sm text-text-secondary">
              <span>Line</span>
              <Select key={query.line} name="line" ariaLabel="Week line" defaultValue={query.line} className="mt-1" options={[{ value: "", label: "Both lines" }, { value: "PUBLIC", label: "Public" }, { value: "DRIVE", label: "Drive" }]} />
            </div>
            <input type="hidden" name="sort" value={query.sort} />
            <input type="hidden" name="dir" value={query.dir} />
            <Button type="submit" variant="primary" size="sm">Apply</Button>
            {hasFilter && <Link href={EVIDENCE_HREF} className="btn btn-ghost btn-sm">Clear</Link>}
          </form>
          {selected.allTotal === 0 ? <EmptyState title="No week has run yet" body="A week appears here from its open; its evidence is ready once it settles or voids." />
            : selected.total === 0 ? <EmptyState title="No weeks match these filters" body="Try another week code, state or line." action={<Link href={EVIDENCE_HREF} className="btn btn-ghost btn-sm">Clear filters</Link>} />
            : (
              <>
              <p className="px-4 pt-3 font-mono text-micro uppercase tracking-widest text-text-subtle" data-result-count={selected.total}>{selected.total} of {selected.allTotal} {selected.allTotal === 1 ? "week" : "weeks"}</p>
              <ScrollX label="Millionea weeks and their evidence">
                <table className="admin-tbl min-w-[1080px]">
                  <thead><tr><SortTh field="week" label="Week" current={query.sort} dir={query.dir} sp={listParams} baseHref={EVIDENCE_HREF} /><SortTh field="state" label="State" current={query.sort} dir={query.dir} sp={listParams} baseHref={EVIDENCE_HREF} /><SortTh field="closes" label="Sales closed (EAT)" current={query.sort} dir={query.dir} sp={listParams} baseHref={EVIDENCE_HREF} /><SortTh field="tickets" label="Tickets" current={query.sort} dir={query.dir} sp={listParams} baseHref={EVIDENCE_HREF} align="right" /><th className="text-left">Result</th><th className="text-left">Evidence</th></tr></thead>
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
              {selected.total > CONSOLE_PER_PAGE && (
                <div className="border-t border-border-subtle px-4 py-2">
                  <AdminPagination page={selected.page} total={selected.total} perPage={CONSOLE_PER_PAGE} baseHref={buildBaseHref(EVIDENCE_HREF, listParams)} />
                </div>
              )}
              </>
            )}
        </AdminCard>
      </AdminBody>
    </>
  );
}
