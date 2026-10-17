import Link from "next/link";
import type { Route } from "next";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { CONSOLE_PER_PAGE, consoleAlerts, consoleStanding, pageConsoleWeeks, type ConsoleWeekRow } from "@/lib/server/maswali-console";
import { maswaliAccountBalance } from "@/lib/server/maswali-money-service";
import { acct } from "@/lib/server/ledger";
import { formatTzs } from "@/lib/utils";
import { fmtEat, weekStateChip } from "@/lib/maswali-admin-format";

export const metadata = { title: "Admin · Millionea" };
export const dynamic = "force-dynamic";

/**
 * /admin/maswali — the TRADING officer's week list (MASWALI-BUILD S4; MASWALI-PLAN §7b S4 item 1).
 *
 * The product's standing (the rollout, the licence basis, the sales pause, the guarantee against what the open weeks
 * need), the alerts that ask someone to act, and every week with where its results stand. ⛔ No ticket data beyond the
 * count: picks, holders and the exposure are accounting's and compliance's pages.
 */
type MaswaliPageProps = { searchParams: Promise<{ page?: string }> };

export default async function AdminMaswaliPage(props: MaswaliPageProps) {
  return <AdminPageGate title="Millionea"><AdminMaswaliContent {...props} /></AdminPageGate>;
}

async function AdminMaswaliContent({ searchParams }: MaswaliPageProps) {
  const sp = await searchParams;
  const session = await currentSession();
  const canDraft = await canUseControl(session?.role, "createMaswaliWeek");
  const [weeks, alerts, standing, guarantee] = await Promise.all([
    pageConsoleWeeks(Number(sp.page ?? "1"), CONSOLE_PER_PAGE).catch(() => null),
    consoleAlerts().catch(() => null),
    consoleStanding().catch(() => null),
    maswaliAccountBalance(acct.maswaliGuarantee).catch(() => null),
  ]);

  return (
    <>
      <AdminPageHead
        title="Millionea"
        sw="Maswali Millionea · wiki"
        actions={canDraft
          ? <Link href={"/admin/maswali/new" as Route} className="btn btn-primary btn-sm inline-flex items-center gap-1.5">Draft a week</Link>
          : <ControlLocked what="Draft a week" need={CONTROL_DOMAIN.createMaswaliWeek} />}
      />
      <AdminBody>
        <KpiGrid cols="4">
          <AdminKpi label="Rollout" sw="Uonekano" value={standing?.rollout ?? "Unreadable"} note={standing?.rollout === "WITHDRAWN" ? "Nobody sees Millionea" : standing?.rollout === "STAFF_PREVIEW" ? "Staff only" : standing?.rollout === "ACTIVE" ? "Everyone" : "The switch could not be read"} {...(standing?.rollout ? {} : { tone: "danger" as const })} />
          <AdminKpi label="Licence basis" sw="Msingi wa leseni" value={standing ? (standing.licence.kind === "NONE" ? "None" : standing.licence.kind === "GBT_WRITTEN" ? "Board letter" : "Owner ruling") : "Unreadable"} note={standing?.licence.kind === "NONE" ? "No week can open" : standing?.licence.ref ?? undefined} {...(standing?.licence.kind === "NONE" ? { tone: "warning" as const } : {})} />
          <AdminKpi label="Sales" sw="Mauzo" value={standing ? (standing.pause.paused ? "Paused" : "Running") : "Unreadable"} note={standing?.pause.paused ? standing.pause.reason ?? undefined : standing?.sunset.kind === "ENDING" ? `Final week: ${standing.sunset.week.code}` : standing?.sunset.kind === "RETIRED" ? "Millionea has ended" : undefined} {...(standing?.pause.paused ? { tone: "warning" as const } : {})} />
          <AdminKpi label="Guarantee" sw="Dhamana" value={guarantee === null ? "Unreadable" : formatTzs(guarantee)} note="Owner capital backing the floor" {...(guarantee === null ? { tone: "danger" as const } : {})} />
        </KpiGrid>

        <AdminCard title="Needs attention" sw="Inahitaji hatua">
          {alerts === null ? <p className="text-body-sm text-danger-fg">The alerts could not be read.</p>
            : alerts.length === 0 ? <p className="text-body-sm text-text-secondary">Nothing needs attention.</p>
            : (
              <ul className="space-y-2">
                {alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-body-sm">
                    <Chip variant={a.level === "critical" ? "danger" : "warning"} size="sm">{a.level === "critical" ? "Act now" : "Soon"}</Chip>
                    <span className="min-w-0">
                      {a.weekId ? <Link href={`/admin/maswali/${a.weekId}` as Route} className="link">{a.text}</Link> : a.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </AdminCard>

        <AdminCard title="Weeks" sw="Wiki" padding="p-0">
          {weeks === null ? <p className="p-4 text-body-sm text-danger-fg">The weeks could not be read.</p>
            : weeks.total === 0 ? <EmptyState title="No week yet" body="Draft the first week: fifteen questions, ten mains and five reserves." />
            : (<>
              <ScrollX label="Millionea weeks">
                <table className="admin-tbl min-w-[860px]">
                  <thead>
                    <tr>
                      <th className="text-left">Week</th><th className="text-left">Line</th><th className="text-left">State</th>
                      <th className="text-left">Sales close (EAT)</th><th className="text-right">Tickets</th>
                      <th className="text-left">Results</th><th className="text-left">Settled</th>
                    </tr>
                  </thead>
                  <tbody>{weeks.rows.map((w) => <WeekRow key={w.id} w={w} />)}</tbody>
                </table>
              </ScrollX>
              {weeks.total > CONSOLE_PER_PAGE && (
                <div className="border-t border-border-subtle px-4 py-2">
                  <AdminPagination page={weeks.page} total={weeks.total} perPage={CONSOLE_PER_PAGE} baseHref="/admin/maswali" />
                </div>
              )}
            </>)}
        </AdminCard>
      </AdminBody>
    </>
  );
}

function WeekRow({ w }: { w: ConsoleWeekRow }) {
  const chip = weekStateChip(w.state);
  return (
    <tr>
      <td className="text-left"><Link href={`/admin/maswali/${w.id}` as Route} className="link tabular">{w.code}</Link>{w.isFinal && <Chip variant="claret" size="sm" className="ml-2">Final</Chip>}</td>
      <td className="text-left">{w.visibility === "DRIVE" ? "Drive" : "Public"}</td>
      <td className="text-left"><Chip variant={chip.variant} size="sm">{chip.label}</Chip></td>
      <td className="text-left tabular">{fmtEat(w.closesAt)}</td>
      <td className="text-right tabular">{w.ticketCount.toLocaleString("en")}</td>
      <td className="text-left">
        {w.state === "DRAFT" || w.state === "OPEN" ? "—"
          : w.voidCertain ? <span className="text-danger-fg">Voids whole</span>
          : w.needs.length === 0 ? <span>Final{w.objectionsCloseAt ? ` · window to ${fmtEat(w.objectionsCloseAt)}` : ""}</span>
          : <span>{w.sealed} of 15 sealed · needs {w.needs.length}</span>}
      </td>
      <td className="text-left tabular">{w.settledAt ? fmtEat(w.settledAt) : "—"}</td>
    </tr>
  );
}
