/**
 * THE FIND STEP'S ACCOUNT LIST — every account on the platform, twenty to a page, sorted and filtered on the server
 * (RESUME-HERE §0c decision 4: Ali asked for the searchable picker AND a full list; the picker is the card above).
 *
 * ── WHY IT IS A DUMB RENDERER ─────────────────────────────────────────────────────────────────────────────────────
 *
 * ⛔ **IT TYPES NO WORD, NO ROUTE AND NO RULE** (rulings 319, 340, 388, 453). Every heading, chip, link, the count,
 * the refusal and both empty states arrive FINISHED from `houseAccountListForConsole`, where the one parse that
 * decides what is read also builds every link — so the header an officer clicks, the chip, the pager and the rows
 * cannot be four spellings of one address. Nothing here filters, sorts, slices or counts.
 * ⛔ **IT IS A SERVER COMPONENT, DELIBERATELY.** A client file under this section publishes its own prop names and
 * every string it types into a public chunk (D19's measured half), and nothing here needs a hook: the rail, the
 * sortable headers and the pager are the kit's own links.
 * ⛔ **THE THREE WALLS** (RESUME-HERE §0c decision 4): no money element and no currency anywhere; a row names its
 * account by its handle alone; and no sentence in the wizard's client file, which this file is not.
 * ⛔ **THE SECTION'S ONE RAIL** (1.410): the chips are `ActivityFilters`, the very file both activity panels render,
 * handed no window — a sign-in date is not a stake's instant, and no date window means one thing here.
 * ⛔ **REAL COLUMNS AT EVERY WIDTH**, never the activity table's one-cell phone stack: three narrow columns fit the
 * 360 strip, and the section's visual gate reads a stacked row as a row of money.
 *
 * @see src/lib/server/house-console-read.ts · src/app/admin/desk/new/page.tsx
 */
import type { Route } from "next";
import Link from "next/link";
import { AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminPagination, buildBaseHref } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { Callout } from "@/components/ui/callout";
import { ScrollX } from "@/components/ui/scroll-x";
import type { ConsoleAccountListView } from "@/lib/server/house-console-read";
import { ActivityFilters } from "../activity-filters";

export function DeskAccountList({ view }: { view: ConsoleAccountListView }) {
  const rows = view.rows;
  return (
    <AdminCard title={view.title} padding="p-0">
      <div className="px-4 pb-3 space-y-3">
        {/* ⛔ THE SHARED RAIL WITH NO WINDOW — the groups and every link are the reader's, built from its own parse. */}
        <ActivityFilters groups={view.filters} />
        {/* 387/432(j) · an address that was not taken at its word SAYS SO, naming each part it dropped. */}
        {view.queryRefusal !== null && (
          <Callout tone="warning" title={view.refusalTitle}>{view.queryRefusal}</Callout>
        )}
        {view.count !== null && <p className="text-body-sm text-text-tertiary">{view.count}</p>}
      </div>
      {/* ⛔ 355 · A FAILED READ IS NEVER AN EMPTY TABLE. `null` means nobody could tell which accounts exist or which
          of them are on the desk; an empty array means the filter matched nothing, and the two say different things. */}
      {rows === null ? (
        <div className="px-4 pb-4"><AdminLoadError what={view.loadError} /></div>
      ) : (
        <ScrollX label={view.regionLabel}>
          {/* ⛔ THE SECTION'S ONE GUTTER (RESUME-HERE §0c decision 2), never widened by a breakpoint — and TIGHTENED
              below `sm` on this list alone: measured on a served 360, a handle and two dates came to 321px in the
              318px strip at the 8px gutter, so a phone gets the 4px one and the three columns fit with room. */}
          <table className="admin-tbl [&_td]:!px-1.5 [&_th]:!px-1.5 max-sm:[&_td]:!px-1 max-sm:[&_th]:!px-1">
            <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
              <tr>
                {/* ⛔ EVERY HEADER IS THE KIT'S `SortTh`, handed the view's VALIDATED parameters — never the raw
                    address, so a value the door refused can never ride into a header's link. */}
                {view.columns.map((c) => (
                  <SortTh key={c.field} field={c.field} label={c.label} current={view.sort} dir={view.dir} sp={view.params} baseHref={view.route} />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && view.empty !== null ? (
                <AdminTableEmpty colSpan={view.columns.length} title={view.empty.title} body={view.empty.body} />
              ) : (
                rows.map((r) => (
                  <tr key={r.userId}>
                    <td>
                      {/* ⛔ THE HANDLE ALONE (346, 420): never a name, a phone or an email. A row that can be chosen
                          IS the way in, at the tap floor; one that cannot opens nothing and says why beneath it —
                          the picker's own look for the same state, one step down in ink. */}
                      {r.href !== null ? (
                        <Link href={r.href as Route} className="inline-flex items-center min-h-[var(--tap-min)] whitespace-nowrap font-mono text-body-sm text-royal-300 hover:underline">
                          {r.handle}
                        </Link>
                      ) : (
                        <>
                          <span className="block whitespace-nowrap font-mono text-body-sm text-text-subtle">{r.handle}</span>
                          <span className="block text-body-sm text-text-faint">{r.reason}</span>
                        </>
                      )}
                    </td>
                    <td className="tabular text-text-secondary" title={r.joinedTitle ?? undefined}>{r.joined}</td>
                    <td className="tabular text-text-secondary" title={r.signedInTitle ?? undefined}>{r.signedIn}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollX>
      )}
      {/* ⛔ THE TOTAL IS THE VIEW'S COUNTING FIELD, NEVER `rows.length` (344), and the base link carries the view's own
          validated parameters — so page 2 of a filtered list is page 2 of the same filter. */}
      {rows !== null && view.total !== null && (
        <div className="p-4 pt-0">
          <AdminPagination
            total={view.total}
            page={view.page}
            perPage={view.perPage}
            param="page"
            baseHref={buildBaseHref(view.route, view.params, "page")}
          />
        </div>
      )}
    </AdminCard>
  );
}
