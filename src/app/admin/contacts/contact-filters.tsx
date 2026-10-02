/**
 * U21 · THE CONTACT BOOK'S FILTER RAIL — one rail, the shared language, at the admin density.
 *
 * ── WHY IT IS A DUMB RENDERER ──────────────────────────────────────────────────────────────────────────────────────
 *
 * ⛔ IT TYPES NO ROUTE, NO ENUM AND NO LABEL. Every pill's label, its href and whether it is the one in force are
 * built in `contacts-rail.ts` — the desk's idiom (`house-console-read.ts` builds, `desk/activity-filters.tsx` draws),
 * one section over. What is applied is read there by U24's own parser and every href is the ONE href builder's
 * (`contactsHref`, decision C9), so the pill an officer presses cannot disagree with the rows the resolver returns.
 * A rail that built its own links would be a second spelling of the filter.
 *
 * ⛔ IT IS A SERVER COMPONENT, DELIBERATELY. `FilterPill` is a `<Link>` and owns its own client boundary, so nothing
 * here needs one — and a `"use client"` file would put this page's prop names into a public chunk.
 *
 * ⛔ THIS IS THE CONTACTS SECTION'S ONE filter-rail FILE: it carries `data-filter-rail` once, and it is declared in
 * `test:filter-language`'s ADMIN_SURFACES in the SAME commit (§0.4 refuses an undeclared rail, §6.1 a declared file
 * that renders no control). ONE `FilterPill`, at the dense rank — the admin measure, 32px (`--h-control-xs`), the
 * rank every console rail takes except the desk's, whose own visual gate holds 40px (§6.6 counts it: 1 dense of 1).
 * `replace` and `scroll={false}`: a filter is not a navigation, and a rail that stacked history would bury the page
 * an officer arrived from under its own states.
 *
 * ⭐ THE GROUP KEY IS LOAD-BEARING. Every axis opens with "Any"; without its key a row of pills cannot say what it
 * clears. Each axis is a `role="group"` named by that key, so a screen reader announces "Consent" before "Any".
 *
 * 🔴 D19 / A1.1 · ROLE-SHAPED UPSTREAM. A viewer who may not read a number is handed no Consent, Source or Player
 * group at all (`contacts-rail.ts`); this file draws what it is given and cannot add one back.
 *
 * @see src/app/admin/contacts/contacts-rail.ts · scripts/filter-language.test.mts
 */
import { FilterGroupKey, FilterPill } from "@/components/ui/filter-pill";
import type { ContactRail } from "./contacts-rail";

export function ContactFilters({ rail }: { rail: ContactRail }) {
  return (
    <div data-filter-rail="contacts" role="group" aria-label={rail.label} className="flex flex-col gap-2 border-b border-border-subtle p-3 last:border-b-0">
      {rail.groups.map((g) => (
        <div key={g.param} role="group" aria-label={g.label} data-rail-group={g.param} className="flex items-center gap-1 flex-wrap gap-y-1.5">
          <FilterGroupKey>{g.label}</FilterGroupKey>
          {g.options.map((o) => (
            <FilterPill
              key={`${g.param}:${o.key}`}
              href={o.href}
              label={o.label}
              count={o.count}
              title={o.title}
              on={o.on}
              semantics={g.semantics}
              rank="dense"
              replace
              scroll={false}
              testId={`${g.param}:${o.key}`}
            />
          ))}
        </div>
      ))}
      {/* The count, the notes and (on a failed read only) Clear filters, spaced by the flex gap — never by a JSX space a
          compiler may drop. ⚠️ `text-body-sm`, not the 11px caption: the notes are SENTENCES, which sit under the reading
          floor at caption size (`test:type-scale` §3). */}
      {(rail.countLine !== null || rail.notes.length > 0 || rail.clear !== null) && (
        <div data-rail-foot className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-text-tertiary">
          {rail.countLine !== null && <span data-rail-count className="tabular-nums text-text-secondary">{rail.countLine}</span>}
          {rail.notes.map((n) => <span key={n}>{n}</span>)}
          {rail.clear !== null && (
            <a href={rail.clear.href} data-rail-clear className="inline-flex items-center min-h-[var(--tap-min)] text-royal-300 hover:underline">{rail.clear.label}</a>
          )}
        </div>
      )}
    </div>
  );
}
