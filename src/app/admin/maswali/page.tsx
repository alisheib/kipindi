import Link from "next/link";
import type { Route } from "next";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/search-box";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ScrollX } from "@/components/ui/scroll-x";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { AdminPagination, buildBaseHref } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { CONSOLE_PER_PAGE, consoleAlerts, consoleStanding, pageConsoleWeeks, type ConsoleWeekRow } from "@/lib/server/maswali-console";
import { parseWeekListQuery, weekListParams } from "@/lib/maswali-week-list";
import { WEEK_STATES } from "@/lib/maswali-week-label";
import { maswaliAccountBalance } from "@/lib/server/maswali-money-service";
import { GUARANTEE_RESERVE_POLICIES, readMaswaliConfigForForm } from "@/lib/server/maswali-config";
import { readMaswaliHolidaysFresh } from "@/lib/server/maswali-holidays";
import { acct } from "@/lib/server/ledger";
import { formatTzs } from "@/lib/utils";
import { fmtEat, weekStateChip } from "@/lib/maswali-admin-format";
import { GUARANTEE_POLICY_LABEL, RULES_FIELDS, RULES_GROUPS, rulesFormValues, rulesValueText, type RulesFormValues } from "./rules-form";
import { HolidayList, HolidaysForm, RulesForm } from "./rules-controls";

export const metadata = { title: "Admin · Millionea" };
export const dynamic = "force-dynamic";

/**
 * /admin/maswali — the TRADING officer's week list (MASWALI-BUILD S4; MASWALI-PLAN §7b S4 item 1).
 *
 * The product's standing (the rollout, the licence basis, the sales pause, the guarantee against what the open weeks
 * need), the alerts that ask someone to act, and every week with where its results stand. ⛔ No ticket data beyond the
 * count: picks, holders and the exposure are accounting's and compliance's pages.
 * ⭐ S7-F2 · and the rules the next week will freeze (`maswali.config`) and the public-holiday list: the Owner's forms
 * (`saveMaswaliConfig`, `saveMaswaliHolidays`, `ops`), read-only with the control locked for every other role.
 */
type MaswaliPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminMaswaliPage(props: MaswaliPageProps) {
  return <AdminPageGate title="Millionea"><AdminMaswaliContent {...props} /></AdminPageGate>;
}

async function AdminMaswaliContent({ searchParams }: MaswaliPageProps) {
  const sp = await searchParams;
  const query = parseWeekListQuery(sp);
  const listParams = weekListParams(query);
  const hasFilter = !!(query.q || query.state || query.line);
  const session = await currentSession();
  const [canDraft, canRules, canHolidays] = await Promise.all([
    canUseControl(session?.role, "createMaswaliWeek"), canUseControl(session?.role, "saveMaswaliConfig"), canUseControl(session?.role, "saveMaswaliHolidays"),
  ]);
  // The rules and the list are read FRESH: each form replaces its record whole, so it starts from the stored one.
  const [weeks, alerts, standing, guarantee, rules, holidays] = await Promise.all([
    pageConsoleWeeks(typeof sp.page === "string" ? Number(sp.page) : 1, CONSOLE_PER_PAGE, query).catch(() => null),
    consoleAlerts().catch(() => null),
    consoleStanding().catch(() => null),
    maswaliAccountBalance(acct.maswaliGuarantee).catch(() => null),
    readMaswaliConfigForForm().then((r) => (r.ok ? { values: rulesFormValues(r.config), problem: r.problem } : null)).catch(() => null),
    readMaswaliHolidaysFresh().then((r) => (r.ok ? r.holidays.dates : null)).catch(() => null),
  ]);
  const policies = GUARANTEE_RESERVE_POLICIES.map((p) => ({ value: p, label: GUARANTEE_POLICY_LABEL[p] ?? p }));

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
        <KpiGrid cols="1-sm2-xl4">
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
                      {a.weekId ? <Link href={`/admin/maswali/${a.weekId}` as Route} className="link inline-flex min-h-[44px] items-center">{a.text}</Link> : a.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </AdminCard>

        <AdminCard title="Weeks" sw="Wiki" padding="p-0">
          <div className="border-b border-border-subtle p-4">
            <span className="mb-1 block text-body-sm text-text-secondary">Week code</span>
            <SearchBox mode="form" formId="maswali-week-filters" placeholder="Search week code" ariaLabel="Search week codes" helpFields={["code"]} />
          </div>
          <form id="maswali-week-filters" method="get" action="/admin/maswali" className="flex flex-wrap items-end gap-3 border-b border-border-subtle p-4">
            <div className="min-w-[145px] flex-1 text-body-sm text-text-secondary">
              <span id="maswali-week-state-label">State</span>
              <Select key={query.state} name="state" ariaLabel="Week state" defaultValue={query.state} className="mt-1" options={[{ value: "", label: "All states" }, ...WEEK_STATES.map((state) => ({ value: state, label: state }))]} />
            </div>
            <div className="min-w-[145px] flex-1 text-body-sm text-text-secondary">
              <span id="maswali-week-line-label">Line</span>
              <Select key={query.line} name="line" ariaLabel="Week line" defaultValue={query.line} className="mt-1" options={[{ value: "", label: "Both lines" }, { value: "PUBLIC", label: "Public" }, { value: "DRIVE", label: "Drive" }]} />
            </div>
            <input type="hidden" name="sort" value={query.sort} />
            <input type="hidden" name="dir" value={query.dir} />
            <Button type="submit" variant="primary" size="sm">Apply</Button>
            {hasFilter && <Link href="/admin/maswali" className="btn btn-ghost btn-sm">Clear</Link>}
          </form>
          {weeks === null ? <p className="p-4 text-body-sm text-danger-fg">The weeks could not be read.</p>
            : weeks.allTotal === 0 ? <EmptyState title="No week yet" body="Draft the first week: fifteen questions, ten mains and five reserves." />
            : weeks.total === 0 ? <EmptyState title="No weeks match these filters" body="Try another week code, state or line." action={<Link href="/admin/maswali" className="btn btn-ghost btn-sm">Clear filters</Link>} />
            : (<>
              <p className="px-4 pt-3 font-mono text-micro uppercase tracking-widest text-text-subtle">{weeks.total} of {weeks.allTotal} {weeks.allTotal === 1 ? "week" : "weeks"}</p>
              <ScrollX label="Millionea weeks">
                <table className="admin-tbl min-w-[860px]">
                  <thead>
                    <tr>
                      <SortTh field="week" label="Week" current={query.sort} dir={query.dir} sp={listParams} baseHref="/admin/maswali" />
                      <SortTh field="line" label="Line" current={query.sort} dir={query.dir} sp={listParams} baseHref="/admin/maswali" />
                      <SortTh field="state" label="State" current={query.sort} dir={query.dir} sp={listParams} baseHref="/admin/maswali" />
                      <SortTh field="closes" label="Sales close (EAT)" current={query.sort} dir={query.dir} sp={listParams} baseHref="/admin/maswali" />
                      <SortTh field="tickets" label="Tickets" current={query.sort} dir={query.dir} sp={listParams} baseHref="/admin/maswali" align="right" />
                      <th scope="col" className="text-left">Results</th>
                      <SortTh field="settled" label="Settled" current={query.sort} dir={query.dir} sp={listParams} baseHref="/admin/maswali" />
                    </tr>
                  </thead>
                  <tbody>{weeks.rows.map((w) => <WeekRow key={w.id} w={w} />)}</tbody>
                </table>
              </ScrollX>
              {weeks.total > CONSOLE_PER_PAGE && (
                <div className="border-t border-border-subtle px-4 py-2">
                  <AdminPagination page={weeks.page} total={weeks.total} perPage={CONSOLE_PER_PAGE} baseHref={buildBaseHref("/admin/maswali", listParams)} />
                </div>
              )}
            </>)}
        </AdminCard>

        <AdminCard title="Rules for the next week" sw="Kanuni za wiki ijayo">
          <p className="mb-3 text-body-sm text-text-secondary">A change applies from the next week to open, never to a running one: each week runs on the rules it froze when it opened (MB-75). The one exception is the support desk&rsquo;s complaint answer target: a promise, not a week&rsquo;s rule, it applies at once (MB-91). The licence basis is the Owner&rsquo;s own record, on Pools.</p>
          {rules?.problem && <p className="mb-3 text-body-sm text-danger-fg">The stored rules do not validate, so no week can open until they are corrected: {rules.problem}</p>}
          {rules === null ? <p className="text-body-sm text-danger-fg">The Millionea rules could not be read, so they cannot be shown or changed now.</p>
            : canRules ? <RulesForm initial={rules.values} policies={policies} />
            : (<>
              <RulesReadOnly values={rules.values} policies={policies} />
              <div className="mt-3"><ControlLocked what="Change the rules" need={CONTROL_DOMAIN.saveMaswaliConfig} block /></div>
            </>)}
        </AdminCard>

        <AdminCard title="Public holidays" sw="Sikukuu">
          <p className="mb-3 text-body-sm text-text-secondary">The holiday review names a listed holiday a week&rsquo;s sales close falls on, while the close can still move: a warning, never a refusal (MB-85, OD-27).</p>
          {holidays === null ? <p className="text-body-sm text-danger-fg">The holiday list could not be read, so it cannot be shown or changed now.</p>
            : canHolidays ? <HolidaysForm dates={holidays} />
            : (<>
              <HolidayList dates={holidays} />
              <div className="mt-3"><ControlLocked what="Change the holiday list" need={CONTROL_DOMAIN.saveMaswaliHolidays} block /></div>
            </>)}
        </AdminCard>
      </AdminBody>
    </>
  );
}

/** The rules as a role that may not change them reads them: every field, in the form's own groups and words. */
function RulesReadOnly({ values, policies }: { values: RulesFormValues; policies: Array<{ value: string; label: string }> }) {
  return (
    <div className="space-y-3">
      {RULES_GROUPS.map((g) => (
        <section key={g.id} className="space-y-2">
          <h3 className="font-semibold text-body">{g.title}</h3>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RULES_FIELDS.filter((f) => f.group === g.id).map((f) => (
              <div key={f.key}>
                <dt className="text-body-sm text-text-secondary">{f.label}</dt>
                <dd className="text-body tabular">{rulesValueText(f.key, values[f.key], policies)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function WeekRow({ w }: { w: ConsoleWeekRow }) {
  const chip = weekStateChip(w.state);
  return (
    <tr>
      <td className="text-left"><Link href={`/admin/maswali/${w.id}` as Route} className="link tabular inline-flex min-h-[44px] items-center">{w.code}</Link>{w.isFinal && <Chip variant="claret" size="sm" className="ml-2">Final</Chip>}</td>
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
