/**
 * THE ACTIVITY PANEL'S FILTER RAIL — one rail, the shared language, at the admin density.
 *
 * ── WHY IT IS A DUMB RENDERER ────────────────────────────────────────────────────────────────────────────────────
 *
 * ⛔ **IT TYPES NO ROUTE, NO ENUM AND NO CLOSED LIST** (rulings 319, 340, 453). Every option's LABEL, its HREF and
 * whether it is the one in force are built in `house-console-read.ts`, where every other painted string of this
 * section is built — so the copy is inside 4.453's and 3.453's scans, which a label typed here would still be, and
 * inside the ONE parse that also decides what the server reads. A rail that built its own links would be a second
 * spelling of the filter, and the control an officer clicks could then disagree with the rows they get back.
 *
 * ⛔ **IT IS A SERVER COMPONENT, DELIBERATELY.** The kit's two controls own their own client boundary
 * (`FilterPill` is a `<Link>`; `DateTimeRangeFilter` is `"use client"` and reads the URL itself), so nothing here
 * needs one — and a `"use client"` file in this section would put ITS OWN PROP NAMES into a public chunk, which is
 * the measured half of owner ruling D19 that survives minification. `/admin/house` already ships a server-rendered
 * rail with server-built hrefs; this is that idiom, one directory over.
 *
 * ⛔ **ONE `data-filter-rail`, AND IT IS NOT ON THE `<Tabs>`** (`test:filter-language` §0.4, §6.1-§6.8, and the
 * console's own rail case). Every rank-taking control here takes `rank="dense"` — the documented 32px admin
 * exception — and `replace`, because a filter is not a navigation and a rail that stacks history buries the page
 * an officer arrived from under twenty of its own states.
 *
 * @see src/lib/server/house-console-read.ts · scripts/filter-language.test.mts
 */
import { FilterGroupKey, FilterPill } from "@/components/ui/filter-pill";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";

/** One option: a finished label, a finished link, and whether it is the one in force. */
export type RailOption = { key: string; label: string; href: string; on: boolean };
/** One axis. `param` is the REAL query-parameter name, which is what `FilterPill`'s `testId` contract asks for. */
export type RailGroup = { param: string; label: string; options: RailOption[] };

export function ActivityFilters({
  groups,
  presets,
  presetDefault,
}: {
  groups: RailGroup[];
  presets: readonly string[];
  presetDefault: string;
}) {
  return (
    <div data-filter-rail="desk-activity" className="flex flex-col gap-2">
      {/* The window, at the admin density. ⛔ It resets the page itself (`p.delete("page")` inside the kit), which
          is half of ruling 411's "a filter change drops the page"; the chips below carry the other half in their
          own server-built hrefs. */}
      <DateTimeRangeFilter rank="dense" replace presetIds={presets} defaultPreset={presetDefault} />
      {groups.map((g) => (
        <div key={g.param} className="flex items-center gap-1 flex-wrap gap-y-1.5">
          {/* ⛔ THE GROUP KEY IS LOAD-BEARING, NOT DECORATION. Three axes each open with an "Any …" option; without
              a visible key the rail reads as three near-identical chips and none of them says what it clears. */}
          <FilterGroupKey>{g.label}</FilterGroupKey>
          {g.options.map((o) => (
            <FilterPill
              key={`${g.param}:${o.key}`}
              href={o.href}
              label={o.label}
              on={o.on}
              rank="dense"
              semantics="tab"
              replace
              scroll={false}
              testId={`${g.param}:${o.key}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
